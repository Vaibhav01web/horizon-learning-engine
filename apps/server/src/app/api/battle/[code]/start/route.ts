import { HttpError, ok, route } from "@/lib/http";
import { db } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ code: string }> };

/** Host flips the lobby to active; every client sees it over Realtime. */
export const POST = route(async (_request: Request, { params }: Params) => {
  const { code } = await params;

  const { data, error } = await db()
    .from("quiz_sessions")
    .update({ status: "active", started_at: new Date().toISOString() })
    .eq("code", code.toUpperCase())
    .eq("status", "lobby")
    .select("*")
    .maybeSingle();

  if (error) throw new HttpError(error.message, 500);
  if (!data) throw new HttpError("Battle not found, or it has already started", 409);

  return ok({ session: data });
});
