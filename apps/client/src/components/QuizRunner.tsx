import { useState } from "react";
import type { Mcq, WeakPoint } from "@zpl/shared-types";
import { api } from "@/lib/api";
import { DifficultyTag, EmptyState, ErrorBanner, ProgressBar } from "@/components/ui";

interface AttemptResult {
  results: { mcqId: string; isCorrect: boolean; correctIndex: number; explanation: string }[];
  score: { correct: number; total: number };
  weakPoints: WeakPoint[];
}

export function QuizRunner({ mcqs, packId }: { mcqs: Mcq[]; packId: string }) {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answers, setAnswers] = useState<{ mcqId: string; selectedIndex: number }[]>([]);
  const [summary, setSummary] = useState<AttemptResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const question = mcqs[index];

  if (mcqs.length === 0) {
    return (
      <EmptyState
        title="No questions yet"
        description="This pack finished without MCQs. Regenerate it from the Overview tab to try again."
      />
    );
  }

  if (summary) return <ScoreCard summary={summary} mcqs={mcqs} onRestart={reset} />;

  function reset() {
    setIndex(0);
    setSelected(null);
    setAnswers([]);
    setSummary(null);
    setError(null);
  }

  async function next() {
    if (selected === null) return;
    const updated = [...answers, { mcqId: question.id, selectedIndex: selected }];
    setAnswers(updated);
    setSelected(null);

    if (index + 1 < mcqs.length) {
      setIndex(index + 1);
      return;
    }

    // Grading is server-side, so the correct answers never reach the browser
    // until the attempt is submitted.
    try {
      setSummary(await api.post<AttemptResult>("/api/mcqs/attempt", { packId, answers: updated }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not submit your answers.");
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex items-center justify-between text-xs text-ink-400">
        <span>
          Question {index + 1} of {mcqs.length}
        </span>
        <div className="flex items-center gap-2">
          {question.topic && <span className="chip">{question.topic}</span>}
          <DifficultyTag difficulty={question.difficulty} />
        </div>
      </div>

      <ProgressBar value={(index / mcqs.length) * 100} />

      <div className="card space-y-5 p-6">
        <h3 className="text-lg font-semibold leading-snug text-ink-100">{question.question}</h3>

        <div className="space-y-2">
          {question.options.map((option, optionIndex) => (
            <button
              key={optionIndex}
              type="button"
              onClick={() => setSelected(optionIndex)}
              aria-pressed={selected === optionIndex}
              className={`flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-colors ${
                selected === optionIndex
                  ? "border-brand-400 bg-brand-500/10 text-ink-100"
                  : "border-ink-700 bg-ink-850 text-ink-300 hover:border-ink-600"
              }`}
            >
              <span className="mt-px font-mono text-xs text-ink-400">
                {String.fromCharCode(65 + optionIndex)}
              </span>
              <span>{option}</span>
            </button>
          ))}
        </div>
      </div>

      {error && <ErrorBanner message={error} onRetry={next} />}

      <button type="button" onClick={next} disabled={selected === null} className="btn-primary w-full py-3">
        {index + 1 === mcqs.length ? "Finish and see results" : "Next question"}
      </button>
    </div>
  );
}

function ScoreCard({
  summary,
  mcqs,
  onRestart,
}: {
  summary: AttemptResult;
  mcqs: Mcq[];
  onRestart: () => void;
}) {
  const byId = new Map(mcqs.map((mcq) => [mcq.id, mcq]));
  const percentage = Math.round((summary.score.correct / summary.score.total) * 100);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="card space-y-4 p-6 text-center">
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">Your score</p>
        <p className="text-5xl font-bold tracking-tight text-ink-100">
          {summary.score.correct}
          <span className="text-2xl text-ink-400">/{summary.score.total}</span>
        </p>
        <ProgressBar value={percentage} />
        <button type="button" onClick={onRestart} className="btn-ghost mx-auto">
          Retake quiz
        </button>
      </div>

      {summary.weakPoints.length > 0 && (
        <div className="card space-y-3 p-5">
          <h3 className="text-sm font-semibold text-ink-100">Weak topics detected</h3>
          <p className="text-xs text-ink-400">
            These feed your flashcard schedule and your WhatsApp revision reminders.
          </p>
          <ul className="space-y-2.5">
            {summary.weakPoints.map((point) => (
              <li key={point.topic} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-ink-300">{point.topic}</span>
                  <span
                    className={
                      point.accuracy < 0.5
                        ? "text-rose-400"
                        : point.accuracy < 0.75
                          ? "text-amber-400"
                          : "text-mint-400"
                    }
                  >
                    {Math.round(point.accuracy * 100)}%
                  </span>
                </div>
                <ProgressBar value={point.accuracy * 100} />
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-ink-100">Explanations</h3>
        {summary.results.map((result, position) => {
          const mcq = byId.get(result.mcqId);
          if (!mcq) return null;

          return (
            <div key={result.mcqId} className="card space-y-2 p-4">
              <div className="flex items-start gap-2.5">
                <span className={result.isCorrect ? "text-mint-400" : "text-rose-400"}>
                  {result.isCorrect ? "✓" : "✕"}
                </span>
                <p className="text-sm font-medium leading-snug text-ink-100">
                  {position + 1}. {mcq.question}
                </p>
              </div>
              <p className="pl-6 text-xs text-ink-400">
                Correct answer:{" "}
                <span className="text-mint-400">
                  {String.fromCharCode(65 + result.correctIndex)} — {mcq.options[result.correctIndex]}
                </span>
              </p>
              <p className="pl-6 text-sm leading-relaxed text-ink-300">{result.explanation}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
