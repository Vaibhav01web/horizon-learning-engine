import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { StudyPack } from "@zpl/shared-types";
import { api } from "@/lib/api";
import { UploadPanel } from "@/components/UploadPanel";

const OUTPUTS = [
  { title: "Layered summaries", body: "An executive overview you read in ten seconds, with every bullet expandable." },
  { title: "Interactive mind map", body: "Topics and subtopics as a draggable graph. Click a node for its explanation." },
  { title: "Flashcards", body: "Graded by difficulty and scheduled by a spaced-repetition system." },
  { title: "MCQs with explanations", body: "Plausible distractors, and the reasoning the moment you answer." },
  { title: "Educational memes", body: "The misconception you were about to have, as a joke you remember." },
  { title: "Recommended resources", body: "Videos, courses and open-access papers found per topic." },
  { title: "Multiplayer battles", body: "Share a code, race friends through the quiz, watch the leaderboard move." },
  { title: "Doubt-Buster PDF", body: "Everything as one styled document, each section linked to a scoped chatbot." },
];

export function Landing() {
  const [packs, setPacks] = useState<StudyPack[]>([]);

  useEffect(() => {
    api
      .get<{ packs: StudyPack[] }>("/api/study-packs?limit=6")
      .then((data) => setPacks(data.packs))
      .catch(() => setPacks([]));
  }, []);

  return (
    <div className="space-y-14">
      <section className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
        <div className="space-y-6 pt-4">
          <span className="chip">
            <span className="size-1.5 rounded-full bg-mint-400" />
            104A
          </span>

          <h1 className="text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl">
            One click.
            <br />
            Complete study suite.
            <br />
            <span className="text-brand-400">Zero prompts.</span>
          </h1>

          <p className="max-w-lg text-[15px] leading-relaxed text-ink-300">
            Upload your notes, textbook, PDF, image, or lecture link. The engine reads it, works out
            what matters, and builds every study asset for you — no prompting, no configuration, no
            asking the same AI nine different questions.
          </p>

          <dl className="grid gap-x-8 gap-y-4 pt-2 sm:grid-cols-2">
            {OUTPUTS.map((output) => (
              <div key={output.title}>
                <dt className="text-sm font-semibold text-ink-100">{output.title}</dt>
                <dd className="mt-0.5 text-[13px] leading-relaxed text-ink-400">{output.body}</dd>
              </div>
            ))}
          </dl>
        </div>

        <UploadPanel />
      </section>

      {packs.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-400">
            Recent study packs
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {packs.map((pack) => (
              <li key={pack.id}>
                <Link
                  to={pack.status === "ready" ? `/study/${pack.id}` : `/processing/${pack.id}`}
                  className="card block h-full p-4 transition-colors hover:border-brand-400/60"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-sm font-semibold leading-snug text-ink-100">{pack.title}</h3>
                    <StatusDot status={pack.status} />
                  </div>
                  <p className="mt-2 text-xs text-ink-400">
                    {pack.subject ?? "Uncategorised"} ·{" "}
                    {new Date(pack.created_at).toLocaleDateString()}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function StatusDot({ status }: { status: StudyPack["status"] }) {
  const tone =
    status === "ready"
      ? "bg-mint-400"
      : status === "failed"
        ? "bg-rose-400"
        : "animate-pulse bg-amber-400";

  return <span className={`mt-1.5 size-2 shrink-0 rounded-full ${tone}`} title={status} />;
}
