import type { Feriado, Plantao } from "./types";

export const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export function adicionarDias(data: Date, dias: number) {
  const novaData = new Date(data);
  novaData.setDate(novaData.getDate() + dias);
  return novaData;
}

export function formatarDataCurta(data: Date) {
  return `${String(data.getDate()).padStart(2, "0")}/${String(data.getMonth() + 1).padStart(2, "0")}`;
}

export function formatarDataISO(data: Date) {
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}-${String(data.getDate()).padStart(2, "0")}`;
}

export function criarDataLocal(dataISO: string) {
  const [ano, mes, dia] = dataISO.split("-").map(Number);
  return new Date(ano, mes - 1, dia);
}

export function formatarMoeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor);
}

export function converterValorHora(valor: string) {
  const normalizado = valor.trim().replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  const numero = Number(normalizado);
  return Number.isFinite(numero) ? numero : 0;
}

export function calcularPascoa(ano: number) {
  const a = ano % 19;
  const b = Math.floor(ano / 100);
  const c = ano % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31) - 1;
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(ano, mes, dia);
}

export function obterFeriadosAutomaticos(ano: number): Feriado[] {
  const pascoa = calcularPascoa(ano);
  const feriados: Array<[Date, string]> = [
    [new Date(ano, 0, 1), "Confraternização Universal"],
    [adicionarDias(pascoa, -47), "Carnaval"],
    [adicionarDias(pascoa, -2), "Paixão de Cristo"],
    [new Date(ano, 3, 21), "Tiradentes"],
    [new Date(ano, 4, 1), "Dia do Trabalho"],
    [adicionarDias(pascoa, 60), "Corpus Christi"],
    [new Date(ano, 8, 7), "Independência do Brasil"],
    [new Date(ano, 9, 12), "Nossa Senhora Aparecida"],
    [new Date(ano, 10, 2), "Finados"],
    [new Date(ano, 10, 15), "Proclamação da República"],
    [new Date(ano, 10, 20), "Consciência Negra"],
    [new Date(ano, 11, 25), "Natal"],
  ];

  return feriados.map(([data, nome]) => ({
    id: `automatico-${formatarDataISO(data)}`,
    data: formatarDataISO(data),
    nome,
    origem: "automatico",
    selecionado: true,
  }));
}

function adicionarPlantao(mapa: Map<string, Plantao>, plantao: Omit<Plantao, "chave">) {
  const chave = `${plantao.inicio.getTime()}-${plantao.fim.getTime()}`;
  if (!mapa.has(chave)) mapa.set(chave, { ...plantao, chave });
}

export function gerarPlantoes({ ano, mes, feriados }: { ano: number; mes: number; feriados: Feriado[] }) {
  const mapa = new Map<string, Plantao>();
  const ultimoDia = new Date(ano, mes + 1, 0).getDate();

  for (let dia = 1; dia <= ultimoDia; dia += 1) {
    const data = new Date(ano, mes, dia);
    const diaSemana = data.getDay();

    if (diaSemana === 6) {
      adicionarPlantao(mapa, {
        inicio: new Date(ano, mes, dia, 18), fim: new Date(ano, mes, dia + 1, 6),
        dataExibicao: data, dataGrupo: data, horas: 12, origem: "fim-de-semana",
      });
    }

    if (diaSemana === 0) {
      adicionarPlantao(mapa, {
        inicio: new Date(ano, mes, dia, 6), fim: new Date(ano, mes, dia, 18),
        dataExibicao: data, dataGrupo: data, horas: 12, origem: "fim-de-semana",
      });
      adicionarPlantao(mapa, {
        inicio: new Date(ano, mes, dia, 18), fim: new Date(ano, mes, dia + 1, 6),
        dataExibicao: data, dataGrupo: data, horas: 12, origem: "fim-de-semana",
      });
    }
  }

  feriados.filter((feriado) => feriado.selecionado).forEach((feriado) => {
    const data = criarDataLocal(feriado.data);
    const a = data.getFullYear();
    const m = data.getMonth();
    const d = data.getDate();

    adicionarPlantao(mapa, {
      inicio: new Date(a, m, d - 1, 18), fim: new Date(a, m, d, 6),
      dataExibicao: adicionarDias(data, -1), dataGrupo: data, horas: 12, origem: "feriado",
    });
    adicionarPlantao(mapa, {
      inicio: new Date(a, m, d, 6), fim: new Date(a, m, d, 18),
      dataExibicao: data, dataGrupo: data, horas: 12, origem: "feriado",
    });
    adicionarPlantao(mapa, {
      inicio: new Date(a, m, d, 18), fim: new Date(a, m, d + 1, 6),
      dataExibicao: data, dataGrupo: data, horas: 12, origem: "feriado",
    });
  });

  return Array.from(mapa.values()).sort((a, b) => a.inicio.getTime() - b.inicio.getTime());
}

export function gerarListaDetalhada(plantoes: Plantao[]) {
  const grupos = new Map<string, Plantao[]>();
  plantoes.forEach((plantao) => {
    const chave = formatarDataISO(plantao.dataGrupo);
    grupos.set(chave, [...(grupos.get(chave) ?? []), plantao]);
  });

  return Array.from(grupos.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, itens]) => itens.map((plantao) =>
      `${formatarDataCurta(plantao.dataExibicao)} ${String(plantao.inicio.getHours()).padStart(2, "0")}:00 as ${String(plantao.fim.getHours()).padStart(2, "0")}:00 hs ${plantao.horas} hs`
    ).join("\n"))
    .join("\n\n");
}

export function gerarResumo(plantoes: Plantao[]) {
  const totais = new Map<string, number>();
  plantoes.forEach((plantao) => {
    const data = formatarDataCurta(plantao.dataExibicao);
    totais.set(data, (totais.get(data) ?? 0) + plantao.horas);
  });
  return Array.from(totais.entries()).map(([data, horas]) => `${data} ${horas}h`).join("\n");
}
