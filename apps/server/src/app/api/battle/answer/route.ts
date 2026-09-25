import { battleAnswerSchema } from "@zpl/shared-types";
import { HttpError, ok, parseBody, route } from "@/lib/http";
import { db, unwrap } from "@/lib/supabase";
import { battlePoints } from "@/lib/srs";

export const dynamic = "force-dynamic";

/**
 * Grades one battle answer server-side and updates the live leaderboard.
 * The unique (participant_id, mcq_id) constraint makes replays harmless.
 */
export const POST = route(async (request) => {
  const body = await parseBody(request, battleAnswerSchema);
  const client = db();

  const { data: question } = await client
    .from("mcqs")
    .select("id, correct_index, explanation")
    .eq("id", body.mcqId)
    .maybeSingle();
  if (!question) throw new HttpError("Question not found", 404);

  const isCorrect = question.correct_index === body.selectedIndex;
  const points = battlePoints(isCorrect, body.timeMs);

  const { error: scoreError } = await client.from("quiz_scores").insert({
    session_id: body.sessionId,
    participant_id: body.participantId,
    mcq_id: body.mcqId,
    selected_index: body.selectedIndex,
    is_correct: isCorrect,
    time_ms: body.timeMs,
    points,
  });

  if (scoreError) {
    if (scoreError.message.includes("duplicate key")) {
      throw new HttpError("You have already answered this question", 409);
    }
    throw new HttpError(scoreError.message, 500);
  }

  // Recompute from quiz_scores rather than incrementing, so a retried request
  // can never inflate a score.
  const scores = unwrap(
    await client
      .from("quiz_scores")
      .select("points, is_correct")
      .eq("participant_id", body.participantId),
  ) as { points: number; is_correct: boolean }[];

  const participant = unwrap(
    await client
      .from("quiz_participants")
      .update({
        score: scores.reduce((total, score) => total + score.points, 0),
        correct_count: scores.filter((score) => score.is_correct).length,
        answered_count: scores.length,
      })
      .eq("id", body.participantId)
      .select("*")
      .single(),
  );

  return ok({
    isCorrect,
    correctIndex: question.correct_index,
    explanation: question.explanation,
    points,
    participant,
  });
});
