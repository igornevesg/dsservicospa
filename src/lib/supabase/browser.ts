"use client";

export async function signIn(email: string, password: string, redirect?: string) {
  const response = await fetch("/api/auth/session", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, redirect }),
  });
  const data = (await response.json()) as { error?: string; redirect?: string };
  if (!response.ok) throw new Error(data.error || "Não foi possível entrar.");
  return data;
}

export async function signOut() {
  await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
}
