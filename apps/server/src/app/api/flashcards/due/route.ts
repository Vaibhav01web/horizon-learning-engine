import { clientKey, HttpError, ok, route } from "@/lib/http";
import { db, unwrap } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/**
 * Cards due for review in a pack: anything never seen, plus anything whose
 * next_review has passed. Weak topics are surfaced first.
 */
export const GET = route(async (request) => {
  const url = new URL(request.url);
  const packId = url.searchParams.get("packId");
  if (!packId) throw new HttpError("packId query parameter is required", 400);

  const reviewerKey = url.searchParams.get("userId") ?? clientKey(request);
  const client = db();

  const cards = unwrap(
    await client.from("flashcards").select("*").eq("pack_id", packId).order("position"),
  ) as { id: string; topic: string | null }[];

  // An empty .in() list is invalid PostgREST syntax, so short-circuit.
  const reviews = (
    cards.length === 0
      ? []
      : (unwrap(
          await client
            .from("flashcard_reviews")
            .select("card_id, next_review, box")
            .eq("reviewer_key", reviewerKey)
            .in(
              "card_id",
              cards.map((card) => card.id),
            ),
        ) as { card_id: string; next_review: string; box: number }[])
  ) as { card_id: string; next_review: string; box: number }[];

  const byCard = new Map(reviews.map((review) => [review.card_id, review]));
  const now = Date.now();

  const weakTopics = new Set(
    (
      unwrap(
        await client
          .from("user_weak_points")
          .select("topic")
          .eq("owner_key", reviewerKey)
          .eq("pack_id", packId)
          .lt("accuracy", 0.7),
      ) as { topic: string }[]
    ).map((row) => row.topic),
  );

  const due = cards
    .filter((card) => {
      const review = byCard.get(card.id);
      return !review || new Date(review.next_review).getTime() <= now;
    })
    .sort((a, b) => scoreCard(b) - scoreCard(a));

  function scoreCard(card: { id: string; topic: string | null }): number {
    const isWeak = card.topic && weakTopics.has(card.topic) ? 2 : 0;
    const isNew = byCard.has(card.id) ? 0 : 1;
    return isWeak + isNew;
  }

  return ok({
    due,
    total: cards.length,
    reviewed: reviews.length,
    weakTopics: [...weakTopics],
  });
});
