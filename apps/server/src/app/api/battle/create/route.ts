import { battleCreateSchema } from "@zpl/shared-types";
import { HttpError, ok, parseBody, route } from "@/lib/http";
import { db, unwrap } from "@/lib/supabase";

export const dynamic = "force-dynamic";

// Unambiguous alphabet — no O/0 or I/1 to mistype off a shared screen.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export const POST = route(async (request) => {
  const body = await parseBody(request, battleCreateSchema);
  const client = db();

  const questions = unwrap(
    await client.from("mcqs").select("id").eq("pack_id", body.packId).order("position"),
  ) as { id: string }[];

  if (questions.length < 3) {
    throw new HttpError("This pack needs at least 3 questions before a battle can start", 409);
  }

  const questionIds = shuffle(questions.map((question) => question.id)).slice(
    0,
    Math.min(body.questionCount ?? 10, questions.length),
  );

  const session = await createWithUniqueCode(client, body.packId, questionIds);

  const participant = unwrap(
    await client
      .from("quiz_participants")
      .insert({ session_id: session.id, display_name: body.hostName, is_host: true })
      .select("*")
      .single(),
  );

  return ok({ session, participant }, 201);
});

async function createWithUniqueCode(
  client: ReturnType<typeof db>,
  packId: string,
  questionIds: string[],
) {
  // `code` is unique in the schema; retry on the rare collision.
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const { data, error } = await client
      .from("quiz_sessions")
      .insert({ pack_id: packId, code: generateCode(), question_ids: questionIds })
      .select("*")
      .single();

    if (!error) return data;
    if (!error.message.includes("duplicate key")) throw new HttpError(error.message, 500);
  }
  throw new HttpError("Could not allocate a battle code, please try again", 503);
}

function generateCode(): string {
  return Array.from(
    { length: 6 },
    () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)],
  ).join("");
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
