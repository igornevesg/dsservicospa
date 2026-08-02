import { timingSafeEqual } from "node:crypto";
import { supabaseFetch } from "@/lib/supabase/server";
import { syncGoogleSheets } from "@/lib/sync/google-sheets";

export const dynamic = "force-dynamic";

function hasValidCronSecret(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");

  if (!secret || !authorization?.startsWith("Bearer ")) return false;

  const received = authorization.slice("Bearer ".length);
  const expectedBuffer = Buffer.from(secret);
  const receivedBuffer = Buffer.from(received);

  return (
    expectedBuffer.length === receivedBuffer.length &&
    timingSafeEqual(expectedBuffer, receivedBuffer)
  );
}

export async function GET(request: Request) {
  if (!hasValidCronSecret(request)) {
    return Response.json(
      { ok: false, error: "Não autorizado." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const [result, sync] = await Promise.all([supabaseFetch<Array<{ id: string }>>(
      "/rest/v1/companies?select=id&limit=1",
      { serviceRole: true },
    ), syncGoogleSheets()]);

    if (!result.response.ok) {
      return Response.json(
        { ok: false, error: "Supabase indisponível." },
        { status: 503, headers: { "Cache-Control": "no-store" } },
      );
    }

    return Response.json(
      { ok: true, checkedAt: new Date().toISOString(), sync },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      { ok: false, error: "Falha na verificação diária." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
