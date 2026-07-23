import type { Metadata } from "next";
import Image from "next/image";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/LoginForm";
import styles from "./page.module.css";
export const metadata:Metadata={title:"Acesso Administrativo",robots:{index:false,follow:false}};
export default function AdministrativeLogin(){return <main id="conteudo" className={styles.page}><section className={styles.card}><div className={styles.brand}><Image src="/logo-ds-servicos.png" alt="DS Serviços" width={190} height={70} priority/><p>Controle de folhas</p></div><div><p className={styles.eyebrow}>Acesso restrito</p><h1>Administração do ponto</h1><p>Área exclusiva para administradores, supervisores e operadores autorizados.</p></div><Suspense fallback={<p>Carregando acesso...</p>}><LoginForm/></Suspense><small className={styles.note}>Funcionários não utilizam acesso individual neste sistema.</small></section></main>;}
