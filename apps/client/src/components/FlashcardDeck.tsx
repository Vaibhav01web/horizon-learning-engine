import { useEffect, useMemo, useState } from "react";
import type { Flashcard, ReviewGrade } from "@zpl/shared-types";
import { api } from "@/lib/api";
import { DifficultyTag, EmptyState } from "@/components/ui";

const GRADES: { grade: ReviewGrade; label: string; tone: string }[] = [
  { grade: "again", label: "Again", tone: "hover:border-rose-400/60 hover:text-rose-400" },
  { grade: "hard", label: "Hard", tone: "hover:border-amber-400/60 hover:text-amber-400" },
  { grade: "good", label: "Good", tone: "hover:border-brand-400/60 hover:text-brand-300" },
  { grade: "easy", label: "Easy", tone: "hover:border-mint-400/60 hover:text-mint-400" },
];

export function FlashcardDeck({ cards, packId }: { cards: Flashcard[]; packId: string }) {
  const [dueIds, setDueIds] = useState<string[] | null>(null);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [graded, setGraded] = useState<Record<string, ReviewGrade>>({});

  // The server decides what is due, factoring in past reviews and weak topics.
  useEffect(() => {
    api
      .get<{ due: { id: string }[] }>(`/api/flashcards/due?packId=${packId}`)
      .then((data) => setDueIds(data.due.map((card) => card.id)))
      .catch(() => setDueIds(cards.map((card) => card.id)));
  }, [packId, cards]);

  const queue = useMemo(() => {
    if (!dueIds) return cards;
    const order = new Map(dueIds.map((id, position) => [id, position]));
    const due = cards.filter((card) => order.has(card.id));
    return due.length > 0
      ? due.sort((a, b) => order.get(a.id)! - order.get(b.id)!)
      : cards;
  }, [cards, dueIds]);

  const card = queue[index];

  async function grade(value: ReviewGrade) {
    if (!card) return;
    setGraded((previous) => ({ ...previous, [card.id]: value }));
    setFlipped(false);
    setIndex((previous) => previous + 1);

    // Fire-and-forget: a failed review record must not block the deck.
    api.post("/api/flashcards/review", { cardId: card.id, grade: value }).catch(() => undefined);
  }

  if (cards.length === 0) {
    return (
      <EmptyState
        title="No flashcards yet"
        description="This pack finished without flashcards. Regenerate it from the Overview tab to try again."
      />
    );
  }

  if (!card) {
    const reviewed = Object.keys(graded).length;
    return (
      <EmptyState
        title="Deck complete"
        description={`You reviewed ${reviewed} card${reviewed === 1 ? "" : "s"}. Cards you found hard come back sooner.`}
        action={
          <button
            type="button"
            className="btn-ghost"
            onClick={() => {
              setIndex(0);
              setGraded({});
            }}
          >
            Run through again
          </button>
        }
      />
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex items-center justify-between text-xs text-ink-400">
        <span>
          Card {index + 1} of {queue.length}
        </span>
        {card.topic && <span className="chip">{card.topic}</span>}
      </div>

      <button
        type="button"
        onClick={() => setFlipped((previous) => !previous)}
        aria-label={flipped ? "Show question" : "Reveal answer"}
        className="card flex min-h-64 w-full flex-col justify-center gap-4 px-8 py-10 text-left transition-colors hover:border-brand-400/50"
      >
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-400">
            {flipped ? "Answer" : "Question"}
          </span>
          <DifficultyTag difficulty={card.difficulty} />
        </div>

        <p className={`leading-relaxed ${flipped ? "text-base text-ink-300" : "text-xl font-semibold text-ink-100"}`}>
          {flipped ? card.back : card.front}
        </p>

        {!flipped && <p className="text-xs text-ink-600">Click to reveal</p>}
      </button>

      {flipped ? (
        <div className="grid grid-cols-4 gap-2">
          {GRADES.map((option) => (
            <button
              key={option.grade}
              type="button"
              onClick={() => grade(option.grade)}
              className={`btn-ghost flex-col py-3 text-xs ${option.tone}`}
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : (
        <p className="text-center text-xs text-ink-400">
          Reveal the answer, then rate how well you knew it — that sets when the card returns.
        </p>
      )}
    </div>
  );
}
