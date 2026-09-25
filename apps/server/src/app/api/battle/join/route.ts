import { battleJoinSchema } from "@zpl/shared-types";
import { HttpError, ok, parseBody, route } from "@/lib/http";
import { db, unwrap } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/** Guests join by code alone — no account needed, which is the point. */
export const POST = route(async (request) => {
  const body = await parseBody(request, battleJoinSchema);
  const client = db();

  const { data: session } = await client
    .from("quiz_sessions")
    .select("*")
    .eq("code", body.code.toUpperCase())
    .maybeSingle();

  if (!session) throw new HttpError("No battle found with that code", 404);
  if (session.status === "finished") throw new HttpError("This battle has already finished", 409);

  const participant = unwrap(
    await client
      .from("quiz_participants")
      .insert({ session_id: session.id, display_name: body.displayName, is_host: false })
      .select("*")
      .single(),
  );

  return ok({ session, participant }, 201);
});
