import "server-only";
import { createHash } from "node:crypto";
import { NextRequest } from "next/server";
import { getServerSupabaseConfig, supabaseFetch } from "@/lib/supabase/server";

function clientAddress(request: NextRequest) {
  return (request.headers.get("x-forwarded-for")?.split(",")[0] || request.headers.get("x-real-ip") || "unknown").trim().slice(0, 80);
}

export async function consumeRateLimit(request: NextRequest, scope: string, subject: string, limit: number, windowSeconds: number, blockSeconds: number) {
  const { serviceRoleKey } = getServerSupabaseConfig();
  if (!serviceRoleKey) return false;
  const secret = process.env.RATE_LIMIT_SECRET || serviceRoleKey;
  const bucketHash = createHash("sha256").update(`${secret}:${scope}:${clientAddress(request)}:${subject}`).digest("hex");
  const result = await supabaseFetch<boolean>("/rest/v1/rpc/consume_security_rate_limit", {
    method: "POST",
    serviceRole: true,
    body: JSON.stringify({
      p_bucket_hash: bucketHash,
      p_limit: limit,
      p_window_seconds: windowSeconds,
      p_block_seconds: blockSeconds,
    }),
  });
  return result.response.ok && result.data === true;
}
