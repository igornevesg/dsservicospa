export const CLOCK_SEQUENCE = ["clock_in", "break_start", "break_end", "clock_out"] as const;
export type ClockEventType = (typeof CLOCK_SEQUENCE)[number];

export const CLOCK_LABELS: Record<ClockEventType, string> = {
  clock_in: "Registrar entrada",
  break_start: "Iniciar intervalo",
  break_end: "Retornar do intervalo",
  clock_out: "Registrar saída",
};

export function nextClockEvent(events: ClockEventType[]): ClockEventType | null {
  const accepted = CLOCK_SEQUENCE.filter((event) => events.includes(event));
  return CLOCK_SEQUENCE[accepted.length] ?? null;
}
