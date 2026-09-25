import { flashcardReviewSchema } from "@zpl/shared-types";
import { clientKey, ok, parseBody, route } from "@/lib/http";
import { db } from "@/lib/supabase";
import { schedule, type ReviewState } from "@/lib/srs";

export const dynamic = "force-dynamic";

/** Records a flashcard review and returns when the card comes back. */
export const POST = route(async (request) => {
  const body = await parseBody(request, flashcardReviewSchema);
  const reviewerKey = body.userId ?? clientKey(request);

  const { data: existing } = await db()
    .from("flashcard_reviews")
    .select("box, ease_factor, interval_days, repetitions")
    .eq("card_id", body.cardId)
    .eq("reviewer_key", reviewerKey)
    .maybeSingle();

  const next = schedule((existing as ReviewState | null) ?? null, body.grade);

  const { error } = await db().from("flashcard_reviews").upsert(
    {
      card_id: body.cardId,
      user_id: body.userId ?? null,
      reviewer_key: reviewerKey,
      ...next,
    },
    { onConflict: "card_id,reviewer_key" },
  );
  if (error) throw new Error(error.message);

  return ok({ review: next });
});
