import "server-only";
import { createHash } from "node:crypto";
import { isValidCpf, normalizeCpf } from "@/lib/cpf";
import { normalizeCnpj } from "@/lib/cnpj";
import { supabaseFetch } from "@/lib/supabase/server";

const EMPLOYEES_SHEET = "1KYOqNpVl_CbLJajuH3djgIHvrtvNKp_8BV9zCfnThBY";
const COMPANIES_SHEET = "1ircfeGwxgfpOHy9OWPA_Yjdv8rLC-QgSQo5kxichyXo";

type CompanyRow = {externalKey:string;displayName:string;legalName:string;taxId:string|null;address:string|null};
type SiteRow = {externalKey:string;companyKey:string;name:string;address:string|null};
type EmployeeRow = {externalKey:string;fullName:string;cpf:string|null;companyKey:string;siteKey:string;siteName:string;shift:string|null;jobTitle:string|null};

const STANDARD_SITES = ["Guarda Noturno", "Guarda Diurno", "Serviços Gerais", "Controle de Acesso"] as const;

function csv(text: string) {
  const rows: string[][] = []; let row: string[] = []; let field = ""; let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted && char === '"' && text[index + 1] === '"') { field += '"'; index += 1; }
    else if (char === '"') quoted = !quoted;
    else if (!quoted && char === ",") { row.push(field); field = ""; }
    else if (!quoted && (char === "\n" || char === "\r")) {
      if (char === "\r" && text[index + 1] === "\n") index += 1;
      row.push(field); if (row.some(value => value.trim())) rows.push(row); row = []; field = "";
    } else field += char;
  }
  row.push(field); if (row.some(value => value.trim())) rows.push(row);
  return rows;
}

const clean = (value: string) => value.trim().replace(/\s+/g, " ");
const key = (value: string) => clean(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\b(residencial|condominio|premium|dos|das|do|da|de)\b/g, " ").replace(/[^a-z0-9]+/g, " ").trim();
const sourceKey = (value: string) => createHash("sha256").update(value).digest("hex").slice(0, 32);
const isInstruction = (value: string) => /^(nao |não |somente |deve |emitir |emite |enviar |email |whatsapp|colaboradores|pg\b|valor |vencimento|observa|r\$)/i.test(clean(value));

async function download(sheet: string) {
  const response = await fetch(`https://docs.google.com/spreadsheets/d/${sheet}/export?format=csv`, { cache: "no-store", signal: AbortSignal.timeout(15_000) });
  if (!response.ok) throw new Error(`Planilha ${sheet} indisponível (${response.status}).`);
  return csv(await response.text());
}

function companyRows(rows: string[][]) {
  const result: CompanyRow[] = [];
  for (let index = 0; index < rows.length; index += 1) {
    const first = clean(rows[index][0] || ""); const second = clean(rows[index][1] || "");
    if (!first || isInstruction(first) || (!/R\$/i.test(second) && !/\d{2}[.\d/-]{12,}/.test(first))) continue;
    const cnpj = normalizeCnpj(first.match(/\d{2}[.\d/-]{12,}/)?.[0] || "") || null;
    const displayName = clean(first.replace(/\s+-\s+\d{2}[.\d/-]{12,}.*$/, "").replace(/\s+-\s+vencimento.*$/i, "")).slice(0, 120);
    const detail = clean(rows[index + 1]?.[0] || "");
    const detailCnpj = normalizeCnpj(detail.match(/\d{2}[.\d/-]{12,}/)?.[0] || "") || cnpj;
    const segments = detail.split(/\s+-\s+/).map(clean).filter(Boolean);
    const legalName = detail && !isInstruction(detail) ? (segments[1] || segments[0]).replace(/\s+-\s+\d{2}[.\d/-]{12,}.*$/, "").slice(0, 160) : displayName;
    const address = segments.find(part => /\b(av|avn|avenida|rua|rodovia|praca|praça|alameda)\b/i.test(part))?.slice(0, 240) || null;
    result.push({externalKey:sourceKey(key(displayName)),displayName,legalName,taxId:detailCnpj,address});
  }
  return [...new Map(result.map(item => [item.externalKey, item])).values()];
}

function bestCompany(post: string, companies: ReturnType<typeof companyRows>) {
  const postKey = key(post); let winner: {score:number;company:ReturnType<typeof companyRows>[number]} | null = null;
  for (const company of companies) {
    const companyKey = key(company.displayName); const a = new Set(postKey.split(" ")); const b = new Set(companyKey.split(" "));
    const overlap = [...a].filter(token => token && b.has(token)).length;
    const aliases = (
      (postKey === "leenia" && companyKey === "elenia") ||
      (postKey === "ypes" && companyKey.includes("ipes")) ||
      (postKey === "madri" && companyKey === "madrid") ||
      (postKey.replaceAll(" ", "") === companyKey.replaceAll(" ", "")) ||
      (postKey.includes("still") && companyKey.includes("sthil"))
    );
    const score = postKey === companyKey ? 100 : aliases ? 90 : overlap * 10 - Math.abs(a.size - b.size);
    if (!winner || score > winner.score) winner = {score, company};
  }
  return winner && winner.score >= 9 ? winner.company : null;
}

function employeeSite(jobTitle: string, shift: string) {
  const job = key(jobTitle); const workShift = key(shift);
  if (job.includes("controlador") || job.includes("controle") || job.includes("acesso")) return "Controle de Acesso";
  if (job.includes("servico") || job.includes("zelador") || job.includes("limpeza")) return "Serviços Gerais";
  if (workShift.includes("diurno")) return "Guarda Diurno";
  return "Guarda Noturno";
}

function employeeRows(rows: string[][], companies: ReturnType<typeof companyRows>) {
  const result: EmployeeRow[] = [];
  const headers = (rows[0] || []).map(value => key(value));
  const column = (...names: string[]) => headers.findIndex(header => names.some(name => header === key(name)));
  const nameColumn = column("nome");
  const cpfColumn = column("cpf");
  const postColumn = column("posto");
  const shiftColumn = column("turno");
  const jobColumn = column("funcao", "função", "cargo");
  if ([nameColumn, cpfColumn, postColumn, shiftColumn, jobColumn].some(index => index < 0)) {
    throw new Error("A planilha de funcionários não contém as colunas NOME, CPF, POSTO, TURNO e FUNÇÃO.");
  }
  for (const row of rows.slice(1)) {
    const fullName = clean(row[nameColumn] || ""); const post = clean(row[postColumn] || "");
    if (!fullName || !post) continue;
    const cpf = normalizeCpf(row[cpfColumn]); const matched = bestCompany(post, companies);
    const companyKey = matched?.externalKey || sourceKey(key(post));
    if (!matched) companies.push({externalKey:companyKey,displayName:post,legalName:post,taxId:null,address:null});
    const shift = clean(row[shiftColumn]||""); const jobTitle = clean(row[jobColumn]||""); const siteName = employeeSite(jobTitle, shift);
    const siteKey = sourceKey(`${companyKey}|${key(siteName)}`);
    result.push({externalKey:sourceKey(key(fullName)),fullName,cpf:isValidCpf(cpf)?cpf:null,companyKey,siteKey,siteName,shift:shift||null,jobTitle:jobTitle||null});
  }
  return result;
}

function siteRows(companies: CompanyRow[]) {
  const sites = new Map<string, SiteRow>();
  for (const company of companies) {
    for (const name of STANDARD_SITES) {
      const externalKey = sourceKey(`${company.externalKey}|${key(name)}`);
      sites.set(externalKey, {externalKey,companyKey:company.externalKey,name,address:company.address});
    }
  }
  return [...sites.values()];
}

export async function syncGoogleSheets() {
  const [companySheet, employeeSheet] = await Promise.all([download(COMPANIES_SHEET), download(EMPLOYEES_SHEET)]);
  const companies = companyRows(companySheet); const employees = employeeRows(employeeSheet, companies); const sites = siteRows(companies);
  const result = await supabaseFetch<{companies:number;employees:number;sites:number}>("/rest/v1/rpc/sync_google_sheet_roster", {
    method: "POST", serviceRole: true, body: JSON.stringify({p_companies:companies,p_sites:sites,p_employees:employees}),
  });
  if (!result.response.ok) throw new Error(`O banco recusou a sincronização das planilhas (${result.response.status}).`);
  return {...result.data,companyRows:companySheet.length,employeeRows:employeeSheet.length};
}
