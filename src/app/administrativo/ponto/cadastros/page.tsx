import type {Metadata} from "next";
import Link from "next/link";
import {RegistrationsDashboard} from "@/components/admin/RegistrationsDashboard";
import styles from "../page.module.css";
export const metadata:Metadata={title:"Cadastros do ponto",robots:{index:false,follow:false}};
export default function RegistrationsPage(){return <main id="conteudo" className={styles.page}><header><div><span>DS Serviços</span><h1>Cadastros</h1></div><nav><Link href="/administrativo">Início</Link><Link href="/administrativo/ponto">Folhas e lançamentos</Link><Link href="/administrativo/ponto/relatorios">Relatórios</Link></nav></header><section className={styles.content}><RegistrationsDashboard/></section></main>;}
