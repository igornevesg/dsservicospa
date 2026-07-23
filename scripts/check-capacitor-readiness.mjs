const required = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "CAPACITOR_SERVER_URL"];
const missing = required.filter((name) => !process.env[name]?.trim());
if (missing.length) {
  console.error(`Variáveis ausentes: ${missing.join(", ")}`);
  process.exit(1);
}
const url = new URL(process.env.CAPACITOR_SERVER_URL);
if (url.protocol !== "https:") {
  console.error("CAPACITOR_SERVER_URL deve usar HTTPS.");
  process.exit(1);
}
console.log("Configuração pronta para sincronização com Capacitor Android.");
