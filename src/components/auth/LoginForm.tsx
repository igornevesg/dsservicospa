"use client";

import { FormEvent, useState } from "react";
import { Eye, EyeOff, LoaderCircle, LockKeyhole, Mail } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "@/lib/supabase/browser";
import styles from "./auth.module.css";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent) {
    event.preventDefault(); setError(""); setLoading(true);
    try {
      const result = await signIn(email.trim(), password, searchParams.get("redirect") || undefined);
      router.replace(result.redirect || "/administrativo");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "E-mail ou senha inválidos.");
    } finally { setLoading(false); }
  }

  return <form className={styles.form} onSubmit={handleSubmit}>
    <label><span>E-mail corporativo</span><div className={styles.control}><Mail size={19}/><input type="email" autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)} required placeholder="nome@empresa.com" /></div></label>
    <label><span>Senha</span><div className={styles.control}><LockKeyhole size={19}/><input type={show?"text":"password"} autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} required placeholder="Digite sua senha"/><button type="button" onClick={()=>setShow(v=>!v)} aria-label={show?"Ocultar senha":"Mostrar senha"}>{show?<EyeOff size={19}/>:<Eye size={19}/>}</button></div></label>
    {error && <p className={styles.error} role="alert">{error}</p>}
    <button className={styles.submit} disabled={loading}>{loading?<><LoaderCircle className={styles.spin} size={20}/>Entrando...</>:"Entrar"}</button>
  </form>;
}
