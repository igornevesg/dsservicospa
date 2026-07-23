import type { Metadata } from "next";
import Link from "next/link";
import { MonthlyClockReport } from "@/components/admin/MonthlyClockReport";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "Relatórios de Ponto", robots: { index: false, follow: false } };

export default function ReportsPage() {
  return <main id="conteudo" className={styles.page}>
    <header><div><span>DS Serviços</span><h1>Fechamento mensal</h1></div><nav><Link href="/administrativo">Início</Link><Link href="/administrativo/ponto">Folhas e lançamentos</Link></nav></header>
    <section className={styles.content}><MonthlyClockReport/></section>
  </main>;
}
