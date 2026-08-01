"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import styles from "./month-year-picker.module.css";

type Props = {
  value: string;
  onChange: (value: string) => void;
  max?: string;
  ariaLabel?: string;
};

const monthNames = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function parseValue(value: string) {
  const [year, month] = value.split("-").map(Number);
  const now = new Date();
  return {
    year: Number.isInteger(year) ? year : now.getFullYear(),
    month: month >= 1 && month <= 12 ? month : now.getMonth() + 1,
  };
}

export function MonthYearPicker({ value, onChange, max, ariaLabel = "Selecionar mês e ano" }: Props) {
  const selected = useMemo(() => parseValue(value), [value]);
  const maximum = max ? parseValue(max) : null;
  const [open, setOpen] = useState(false);
  const [visibleYear, setVisibleYear] = useState(selected.year);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => setVisibleYear(selected.year), [selected.year]);
  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  const selectMonth = (month: number) => {
    onChange(`${visibleYear}-${String(month).padStart(2, "0")}`);
    setOpen(false);
  };

  return <div className={styles.picker} ref={rootRef}>
    <button
      type="button"
      className={styles.trigger}
      aria-label={ariaLabel}
      aria-haspopup="dialog"
      aria-expanded={open}
      onClick={() => { setVisibleYear(selected.year); setOpen(current => !current); }}
    >
      <CalendarDays aria-hidden="true"/>
      <span>{monthNames[selected.month - 1]} de {selected.year}</span>
    </button>
    {open && <div className={styles.calendar} role="dialog" aria-label={ariaLabel}>
      <div className={styles.header}>
        <button type="button" aria-label="Ano anterior" onClick={() => setVisibleYear(year => year - 1)}><ChevronLeft/></button>
        <strong>{visibleYear}</strong>
        <button type="button" aria-label="Próximo ano" disabled={Boolean(maximum && visibleYear >= maximum.year)} onClick={() => setVisibleYear(year => year + 1)}><ChevronRight/></button>
      </div>
      <div className={styles.months}>
        {monthNames.map((name, index) => {
          const month = index + 1;
          const active = selected.year === visibleYear && selected.month === month;
          const disabled = Boolean(maximum && (visibleYear > maximum.year || (visibleYear === maximum.year && month > maximum.month)));
          return <button
            type="button"
            key={name}
            className={active ? styles.active : undefined}
            aria-pressed={active}
            disabled={disabled}
            onClick={() => selectMonth(month)}
          >{name.slice(0, 3)}</button>;
        })}
      </div>
    </div>}
  </div>;
}
