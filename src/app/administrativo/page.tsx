import type {Metadata} from "next";
import Link from "next/link";
import {redirect} from "next/navigation";
import {BarChart3,Building2,CalendarClock,ClipboardList,ShieldCheck} from "lucide-react";
import {AdminLogoutButton} from "@/components/admin/AdminLogoutButton";
import {requireUser} from "@/lib/auth/session";
import styles from "./page.module.css";
export const metadata:Metadata={title:"Painel Administrativo",robots:{index:false,follow:false}};
const roleNames={admin:"Administrador",supervisor:"Supervisor",operator:"Operador",employee:"Funcionário"};
export default async function AdministrativeDashboard(){const session=await requireUser();if(!session)redirect("/administrativo/login");const role=session.profile.role;if(!["admin","supervisor","operator"].includes(role))redirect("/administrativo/login");const modules=[
  {href:"/administrativo/ponto",title:"Folhas e lançamentos",description:"Selecione empresa, posto e competência, lance horários e anexe as folhas assinadas.",icon:ClipboardList,roles:["admin","supervisor","operator"]},
  {href:"/administrativo/ponto/cadastros",title:"Cadastros",description:role==="admin"?"Cadastre empresas, postos e funcionários.":"Cadastre postos e funcionários vinculados à sua empresa.",icon:Building2,roles:["admin","supervisor"]},
  {href:"/administrativo/ponto/relatorios",title:"Relatórios e fechamento",description:"Consulte horas, pendências e fechamento mensal por empresa e funcionário.",icon:BarChart3,roles:["admin","supervisor","operator"]},
  {href:"/administrativo/plantoes",title:"Plantões especiais",description:"Calcule plantões de empresas atendidas exclusivamente em finais de semana e feriados.",icon:CalendarClock,roles:["admin"]},
].filter(item=>item.roles.includes(role));return <main className={styles.page}><header className={styles.header}><div><span>DS Serviços</span><h1>Painel administrativo</h1><p>Escolha uma função para continuar.</p></div><div className={styles.account}><div><small>Usuário</small><strong>{session.profile.full_name}</strong><span>{roleNames[role]}</span></div><AdminLogoutButton/></div></header><section className={styles.content}><div className={styles.welcome}><ShieldCheck/><div><small>Acesso autorizado</small><h2>Olá, {session.profile.full_name||"usuário"}</h2><p>Estão disponíveis somente os módulos permitidos para o seu perfil.</p></div></div><div className={styles.grid}>{modules.map(({href,title,description,icon:Icon})=><Link className={styles.card} href={href} key={href}><span className={styles.icon}><Icon/></span><div><h2>{title}</h2><p>{description}</p></div><strong>Acessar →</strong></Link>)}</div></section></main>;}
