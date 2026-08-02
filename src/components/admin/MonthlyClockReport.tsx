"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Clock3, Download, FileCheck2, RefreshCw, TimerReset } from "lucide-react";
import { MonthYearPicker } from "./MonthYearPicker";
import styles from "./monthly-clock.module.css";
import issueStyles from "./monthly-inconsistencies.module.css";

type EventType = "clock_in" | "break_start" | "break_end" | "clock_out";
type Day = {
  key: string;
  date: string;
  employee: { public_id: string; full_name: string; registration_number: string | null; companies: { public_id: string; display_name: string } | null };
  site: { public_id: string; name: string } | null;
  times: Record<EventType, string | null>;
  workedMinutes: number;
  breakMinutes: number;
  complete: boolean;
  rejectedAttempts: number;
  adjustedEvents: EventType[];
  inconsistencies: string[];
};
type Inconsistency={key:string;date:string;employee:string;messages:string[];source:"system"|"paper"};

function currentMonth() {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit" }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}`;
}

function hours(minutes: number) {
  return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, "0")}`;
}

function time(value: string | null) {
  return value ? new Date(value).toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" }) : "—";
}

function displayDate(value: string) {
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

function csvCell(value: unknown) {
  return `"${String(value ?? "").replaceAll("\"", "\"\"")}"`;
}

export function MonthlyClockReport() {
  const [month, setMonth] = useState(currentMonth);
  const [days, setDays] = useState<Day[]>([]);
  const [companyId, setCompanyId] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [onlyPending, setOnlyPending] = useState(false);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [truncated, setTruncated] = useState(false);
  const [inconsistencies, setInconsistencies] = useState<Inconsistency[]>([]);

  const load = useCallback(async () => {
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/admin/monthly-report?month=${encodeURIComponent(month)}`, { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Não foi possível gerar o fechamento.");
      setDays(body.days || []); setInconsistencies(body.inconsistencies || []); setTruncated(Boolean(body.truncated));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível gerar o fechamento.");
    } finally { setBusy(false); }
  }, [month]);

  useEffect(() => { void load(); }, [load]);

  const companies = useMemo(() => [...new Map(days.flatMap((day) => day.employee.companies ? [[day.employee.companies.public_id, day.employee.companies]] : [])).values()], [days]);
  const employees = useMemo(() => [...new Map(days.filter((day) => !companyId || day.employee.companies?.public_id === companyId).map((day) => [day.employee.public_id, day.employee])).values()], [days, companyId]);
  const filtered = useMemo(() => days.filter((day) => (!companyId || day.employee.companies?.public_id === companyId) && (!employeeId || day.employee.public_id === employeeId) && (!onlyPending || !day.complete || day.rejectedAttempts > 0)), [days, companyId, employeeId, onlyPending]);
  const totalMinutes = filtered.reduce((sum, day) => sum + day.workedMinutes, 0);
  const pending = filtered.filter((day) => !day.complete).length;

  function exportCsv() {
    const header = ["Data", "Funcionário", "Matrícula", "Empresa", "Posto", "Entrada", "Início intervalo", "Retorno intervalo", "Saída", "Horas trabalhadas", "Intervalo", "Situação", "Inconsistências"];
    const rows = filtered.map((day) => [
      displayDate(day.date), day.employee.full_name, day.employee.registration_number, day.employee.companies?.display_name || "", day.site?.name || "",
      time(day.times.clock_in), time(day.times.break_start), time(day.times.break_end), time(day.times.clock_out), hours(day.workedMinutes), hours(day.breakMinutes),
      day.complete ? "Completa" : "Pendente", day.inconsistencies.join(" | "),
    ]);
    const content = `\uFEFF${[header, ...rows].map((row) => row.map(csvCell).join(";")).join("\r\n")}`;
    const url = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = `ponto-${month}.csv`; link.click();
    URL.revokeObjectURL(url);
  }

  return <section className={styles.report}>
    <div className={styles.heading}><div><span>Folhas manuscritas</span><h2>Conferência da competência</h2><p>As horas são calculadas a partir dos horários digitados e vinculados à folha assinada.</p></div><div className={styles.actions}><button type="button" onClick={() => void load()} disabled={busy}><RefreshCw className={busy ? styles.spin : undefined}/>Atualizar</button><button type="button" onClick={exportCsv} disabled={!filtered.length}><Download/>Exportar CSV</button></div></div>
    <div className={styles.filters}>
      <label>Competência<MonthYearPicker value={month} onChange={setMonth} max={currentMonth()}/></label>
      <label>Empresa<select value={companyId} onChange={(event) => { setCompanyId(event.target.value); setEmployeeId(""); }}><option value="">Todas</option>{companies.map((company) => <option key={company.public_id} value={company.public_id}>{company.display_name}</option>)}</select></label>
      <label>Funcionário<select value={employeeId} onChange={(event) => setEmployeeId(event.target.value)}><option value="">Todos</option>{employees.map((employee) => <option key={employee.public_id} value={employee.public_id}>{employee.full_name}</option>)}</select></label>
      <label className={styles.checkbox}><input type="checkbox" checked={onlyPending} onChange={(event) => setOnlyPending(event.target.checked)}/>Somente pendências</label>
    </div>
    <div className={styles.metrics}><article><Clock3/><span>Horas apuradas</span><strong>{hours(totalMinutes)}</strong></article><article><FileCheck2/><span>Jornadas completas</span><strong>{filtered.length - pending}</strong></article><article><TimerReset/><span>Jornadas pendentes</span><strong>{pending}</strong></article><article><AlertTriangle/><span>Inconsistências</span><strong>{inconsistencies.length}</strong></article></div>
    {error && <p className={styles.error}>{error}</p>}{truncated && <p className={styles.warning}><AlertTriangle/>O limite mensal de 5.000 registros foi atingido. Exporte e confira a competência antes do fechamento.</p>}
    <div className={styles.tableWrap}><table><thead><tr><th>Data</th><th>Funcionário</th><th>Posto</th><th>Entrada</th><th>Intervalo</th><th>Retorno</th><th>Saída</th><th>Horas</th><th>Situação</th><th>Inconsistências</th></tr></thead><tbody>{filtered.map((day) => <tr key={day.key}><td>{displayDate(day.date)}</td><td><strong>{day.employee.full_name}</strong><small>{day.employee.registration_number?`${day.employee.registration_number} · `:""}{day.employee.companies?.display_name}</small></td><td>{day.site?.name || "—"}</td><td>{time(day.times.clock_in)}</td><td>{time(day.times.break_start)}</td><td>{time(day.times.break_end)}</td><td>{time(day.times.clock_out)}</td><td><strong>{hours(day.workedMinutes)}</strong></td><td><span className={day.complete ? styles.complete : styles.pending}>{day.complete ? "Completa" : "Pendente"}</span></td><td>{day.inconsistencies.length?<ul className={issueStyles.issueList}>{day.inconsistencies.map(issue=><li key={issue}>{issue}</li>)}</ul>:"—"}</td></tr>)}</tbody></table>{busy && <p className={styles.empty}><RefreshCw className={styles.spin}/>Calculando competência...</p>}{!busy && !filtered.length && !error && <p className={styles.empty}>Nenhuma jornada encontrada para os filtros selecionados.</p>}</div>
    <section className={issueStyles.inconsistencyPanel}><h3><AlertTriangle/>Todas as inconsistências da competência</h3>{inconsistencies.length?<div className={issueStyles.issueCards}>{inconsistencies.map(item=><article key={item.key}><strong>{item.date?displayDate(item.date):"Data não identificada"} · {item.employee}</strong><small>{item.source==="paper"?"Folha assinada":"Lançamento do sistema"}</small><ul>{item.messages.map(message=><li key={message}>{message}</li>)}</ul></article>)}</div>:<p>Nenhuma inconsistência identificada nesta competência.</p>}</section>
    <p className={styles.note}><AlertTriangle/>A folha manuscrita assinada permanece como documento original. Divergências na digitação exigem correção justificada e auditável.</p>
  </section>;
}
