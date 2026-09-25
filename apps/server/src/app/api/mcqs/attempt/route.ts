import { quizAttemptSchema, type WeakPoint } from "@zpl/shared-types";
import { clientKey, HttpError, ok, parseBody, route } from "@/lib/http";
import { db, unwrap } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/**
 * Grades a quiz attempt and folds the result into the student's per-topic
 * accuracy, which is what drives weak-topic detection and revision alerts.
 */
export const POST = route(async (request) => {
  const body = await parseBody(request, quizAttemptSchema);
  const ownerKey = body.userId ?? clientKey(request);
  const client = db();

  if (body.answers.length === 0) {
    throw new HttpError("Submit at least one answer", 422);
  }

  const questions = unwrap(
    await client
      .from("mcqs")
      .select("id, correct_index, explanation, topic")
      .eq("pack_id", body.packId)
      .in(
        "id",
        body.answers.map((answer) => answer.mcqId),
      ),
  ) as { id: string; correct_index: number; explanation: string; topic: string | null }[];

  const byId = new Map(questions.map((question) => [question.id, question]));
  const tally = new Map<string, { correct: number; total: number }>();

  const results = body.answers.flatMap((answer) => {
    const question = byId.get(answer.mcqId);
    if (!question) return [];

    const isCorrect = question.correct_index === answer.selectedIndex;
    const topic = question.topic ?? "General";
    const bucket = tally.get(topic) ?? { correct: 0, total: 0 };
    bucket.total += 1;
    if (isCorrect) bucket.correct += 1;
    tally.set(topic, bucket);

    return [
      {
        mcqId: question.id,
        isCorrect,
        correctIndex: question.correct_index,
        explanation: question.explanation,
      },
    ];
  });

  // Merge this attempt into any existing history for the same topic.
  const weakPoints: WeakPoint[] = [];
  for (const [topic, bucket] of tally) {
    const { data: previous } = await client
      .from("user_weak_points")
      .select("correct, total")
      .eq("owner_key", ownerKey)
      .eq("pack_id", body.packId)
      .eq("topic", topic)
      .maybeSingle();

    const correct = (previous?.correct ?? 0) + bucket.correct;
    const total = (previous?.total ?? 0) + bucket.total;
    const accuracy = total === 0 ? 0 : Number((correct / total).toFixed(3));

    await client.from("user_weak_points").upsert(
      {
        owner_key: ownerKey,
        user_id: body.userId ?? null,
        pack_id: body.packId,
        topic,
        correct,
        total,
        accuracy,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "owner_key,pack_id,topic" },
    );

    weakPoints.push({ topic, accuracy, total });
  }

  const correctCount = results.filter((result) => result.isCorrect).length;

  return ok({
    results,
    score: { correct: correctCount, total: results.length },
    weakPoints: weakPoints.sort((a, b) => a.accuracy - b.accuracy),
  });
});
