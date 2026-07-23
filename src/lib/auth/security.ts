import "server-only";
import { NextRequest } from "next/server";

const SAFE_PATHS = new Set(["/administrativo", "/administrativo/ponto", "/administrativo/plantoes", "/administrativo/alterar-senha"]);

export function assertSameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin) return;
  const expected = new URL(request.url).origin;
  if (origin !== expected) throw new Error("INVALID_ORIGIN");
}

export function safeRedirectPath(value: unknown, fallback = "/administrativo") {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) return fallback;
  const url = new URL(value, "https://local.invalid");
  if (url.origin !== "https://local.invalid") return fallback;
  const allowed = [...SAFE_PATHS].some((prefix) => url.pathname === prefix || url.pathname.startsWith(`${prefix}/`));
  return allowed ? `${url.pathname}${url.search}` : fallback;
}

export function normalizeEmail(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase().slice(0, 254) : "";
}

export function strongPassword(value: unknown) {
  if (typeof value !== "string" || value.length < 12 || value.length > 128) return false;
  return /[a-z]/.test(value) && /[A-Z]/.test(value) && /\d/.test(value) && /[^A-Za-z0-9]/.test(value);
}

export function jsonNoStore(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store, max-age=0",
      Pragma: "no-cache",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
