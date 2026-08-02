export type AuditEntry = {
  occurrence: string;
  clockIn: string | null;
  breakStart: string | null;
  breakEnd: string | null;
  clockOut: string | null;
  shiftPattern?: string | null;
};

export type SheetReference = {
  occurrence?: string;
  clockIn?: string | null;
  breakStart?: string | null;
  breakEnd?: string | null;
  clockOut?: string | null;
};

const minutes = (value: string | null | undefined) => {
  if (!value || !/^([01]\d|2[0-3]):[0-5]\d/.test(value)) return null;
  const [hour, minute] = value.slice(0, 5).split(":").map(Number);
  return hour * 60 + minute;
};

const distance = (left: string | null | undefined, right: string | null | undefined) => {
  const a = minutes(left); const b = minutes(right);
  if (a === null || b === null) return null;
  const raw = Math.abs(a - b);
  return Math.min(raw, 1440 - raw);
};

export function auditTimeEntry(entry: AuditEntry, sheet?: SheetReference | null) {
  const issues: string[] = [];
  if (entry.occurrence === "worked") {
    if (!entry.clockIn || !entry.clockOut) issues.push("Entrada ou saída ausente.");
    if (Boolean(entry.breakStart) !== Boolean(entry.breakEnd)) issues.push("Intervalo incompleto.");

    const sequence = [entry.clockIn, entry.breakStart, entry.breakEnd, entry.clockOut].filter(Boolean) as string[];
    const timeline: number[] = [];
    sequence.forEach(value => {
      let point = minutes(value) ?? 0;
      while (timeline.length && point < timeline[timeline.length - 1]) point += 1440;
      timeline.push(point);
    });
    if (timeline.length >= 2 && timeline[timeline.length - 1] - timeline[0] > 18 * 60) issues.push("Sequência de horários ultrapassa 18 horas.");

    const shift = (entry.shiftPattern || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const expected = shift.includes("noturno") ? ["18:00", "06:00"] : shift.includes("diurno") ? ["06:00", "18:00"] : null;
    if (expected && distance(entry.clockIn, expected[0])! > 30) issues.push(`Entrada fora do turno ${entry.shiftPattern} (prevista ${expected[0]}).`);
    if (expected && distance(entry.clockOut, expected[1])! > 30) issues.push(`Saída fora do turno ${entry.shiftPattern} (prevista ${expected[1]}).`);
  }

  if (sheet) {
    if (sheet.occurrence && sheet.occurrence !== entry.occurrence) issues.push("Ocorrência diverge da folha assinada.");
    const pairs: Array<[string, string | null | undefined, string | null | undefined]> = [
      ["Entrada", entry.clockIn, sheet.clockIn], ["Início do intervalo", entry.breakStart, sheet.breakStart],
      ["Retorno do intervalo", entry.breakEnd, sheet.breakEnd], ["Saída", entry.clockOut, sheet.clockOut],
    ];
    pairs.forEach(([label, system, paper]) => {
      if (Boolean(system) !== Boolean(paper)) issues.push(`${label} ausente no sistema ou na folha assinada.`);
      else if (system && paper && (distance(system, paper) ?? 0) > 5) issues.push(`${label} diverge da folha assinada (${system.slice(0, 5)} × ${paper.slice(0, 5)}).`);
    });
  }
  return [...new Set(issues)];
}
