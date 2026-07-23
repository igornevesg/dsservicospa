import type { Metadata } from "next";
import Link from "next/link";
import { ManualSheetsDashboard } from "@/components/admin/ManualSheetsDashboard";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "Administração do Ponto", robots: { index: false, follow: false } };

export default function AdminPontoPage() {
  return <main id="conteudo" className={styles.page}>
    <header><div><span>DS Serviços</span><h1>Folhas de ponto</h1></div><nav><Link href="/administrativo">Início</Link><Link href="/administrativo/ponto/cadastros">Cadastros</Link><Link href="/administrativo/ponto/relatorios">Fechamento mensal</Link></nav></header>
    <section className={styles.content}><ManualSheetsDashboard /></section>
  </main>;
}
