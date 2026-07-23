import { jsonNoStore } from "@/lib/auth/security";
import { requireUser } from "@/lib/auth/session";

export async function GET() {
  const session = await requireUser();
  if (!session) return jsonNoStore({ error: "Não autenticado." }, 401);
  return jsonNoStore({ profile: session.profile, user: { id: session.user.id } });
}
