"use client";
import {useState} from "react";
import {LogOut} from "lucide-react";
import {signOut} from "@/lib/supabase/browser";
import styles from "@/app/administrativo/page.module.css";
export function AdminLogoutButton(){const [busy,setBusy]=useState(false);async function leave(){setBusy(true);try{await signOut();window.location.assign("/administrativo/login");}finally{setBusy(false);}}return <button className={styles.logout} type="button" disabled={busy} onClick={leave}><LogOut size={17}/>{busy?"Saindo...":"Sair"}</button>;}
