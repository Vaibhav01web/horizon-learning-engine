import { HttpError, ok, route } from "@/lib/http";
import { db, unwrap } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ code: string }> };

/**
 * The battle's public state. Correct answers are deliberately stripped —
 * every client can read this, so grading stays on the server.
 */
export const GET = route(async (_request: Request, { params }: Params) => {
  const { code } = await params;
  const client = db();

  const { data: session } = await client
    .from("quiz_sessions")
    .select("*")
    .eq("code", code.toUpperCase())
    .maybeSingle();
  if (!session) throw new HttpError("No battle found with that code", 404);

  const [questions, participants, pack] = await Promise.all([
    client.from("mcqs").select("id, question, options, topic, difficulty").in("id", session.question_ids),
    client
      .from("quiz_participants")
      .select("*")
      .eq("session_id", session.id)
      .order("score", { ascending: false }),
    client.from("study_packs").select("id, title, subject").eq("id", session.pack_id).single(),
  ]);

  // Preserve the order the host's session fixed, not the database's.
  const byId = new Map((unwrap(questions) as { id: string }[]).map((q) => [q.id, q]));
  const ordered = (session.question_ids as string[]).map((id) => byId.get(id)).filter(Boolean);

  return ok({
    session,
    pack: unwrap(pack),
    questions: ordered,
    participants: unwrap(participants),
  });
});
