import "server-only";

export function getServerSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !anonKey) {
    throw new Error("Supabase público não configurado no servidor.");
  }

  return { url, anonKey, serviceRoleKey };
}

export async function supabaseFetch<T>(
  path: string,
  init: RequestInit & { token?: string; serviceRole?: boolean } = {},
): Promise<{ data: T; response: Response }> {
  const { url, anonKey, serviceRoleKey } = getServerSupabaseConfig();
  const { token, serviceRole, ...requestInit } = init;
  const key = serviceRole ? serviceRoleKey : anonKey;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY não configurada.");

  const headers = new Headers(init.headers);
  headers.set("apikey", key);
  headers.set("Authorization", `Bearer ${token || key}`);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");

  const response = await fetch(`${url}${path}`, {
    ...requestInit,
    headers,
    cache: "no-store",
  });
  const text = await response.text();
  let data: T;
  try {
    data = text ? (JSON.parse(text) as T) : (undefined as T);
  } catch {
    data = text as T;
  }
  return { data, response };
}
