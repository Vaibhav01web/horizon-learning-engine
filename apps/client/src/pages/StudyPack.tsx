import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import type { StudyPackBundle } from "@zpl/shared-types";
import { api } from "@/lib/api";
import { ErrorBanner, Spinner } from "@/components/ui";
import { Overview } from "@/components/Overview";
import { MindMap } from "@/components/MindMap";
import { FlashcardDeck } from "@/components/FlashcardDeck";
import { QuizRunner } from "@/components/QuizRunner";
import { MemeWall } from "@/components/MemeWall";
import { ResourceList } from "@/components/ResourceList";
import { BattlePanel, PdfPanel, SharePanel } from "@/components/PackActions";

const TABS = [
  "overview",
  "mindmap",
  "flashcards",
  "mcqs",
  "memes",
  "resources",
  "battle",
  "pdf",
  "share",
] as const;
type Tab = (typeof TABS)[number];

const TAB_LABELS: Record<Tab, string> = {
  overview: "Overview",
  mindmap: "Mind Map",
  flashcards: "Flashcards",
  mcqs: "MCQs",
  memes: "Memes",
  resources: "Resources",
  battle: "Battle",
  pdf: "PDF",
  share: "Share",
};

export function StudyPack() {
  const { packId = "" } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();

  const [bundle, setBundle] = useState<StudyPackBundle | null>(null);
  const [error, setError] = useState<string | null>(null);

  const requested = searchParams.get("tab") as Tab | null;
  const tab: Tab = requested && TABS.includes(requested) ? requested : "overview";

  useEffect(() => {
    let cancelled = false;

    api
      .get<StudyPackBundle>(`/api/study-packs/${packId}`)
      .then((data) => !cancelled && setBundle(data))
      .catch((cause) => !cancelled && setError(cause.message));

    return () => {
      cancelled = true;
    };
  }, [packId]);

  if (error) return <ErrorBanner message={error} onRetry={() => window.location.reload()} />;

  if (!bundle) {
    return (
      <div className="flex items-center justify-center gap-3 py-24 text-sm text-ink-400">
        <Spinner /> Loading your study pack…
      </div>
    );
  }

  const counts: Partial<Record<Tab, number>> = {
    flashcards: bundle.flashcards.length,
    mcqs: bundle.mcqs.length,
    memes: bundle.memes.length,
    resources: bundle.resources.length,
  };

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2 text-xs text-ink-400">
          {bundle.pack.subject && <span className="chip">{bundle.pack.subject}</span>}
          <span>{new Date(bundle.pack.created_at).toLocaleDateString()}</span>
          {bundle.pack.status !== "ready" && (
            <Link to={`/processing/${packId}`} className="text-amber-400 underline underline-offset-2">
              still generating
            </Link>
          )}
        </div>
        <h1 className="text-3xl font-bold tracking-tight">{bundle.pack.title}</h1>
      </header>

      <nav className="-mx-4 overflow-x-auto px-4">
        <div role="tablist" className="flex min-w-max gap-1 border-b border-ink-800 pb-px">
          {TABS.map((item) => (
            <button
              key={item}
              type="button"
              role="tab"
              aria-selected={tab === item}
              onClick={() => setSearchParams({ tab: item }, { replace: true })}
              className={`flex items-center gap-1.5 rounded-t-lg px-3.5 py-2.5 text-sm font-medium transition-colors ${
                tab === item
                  ? "bg-ink-850 text-ink-100 shadow-[inset_0_-2px_0_0_var(--color-brand-500)]"
                  : "text-ink-400 hover:text-ink-100"
              }`}
            >
              {TAB_LABELS[item]}
              {counts[item] !== undefined && (
                <span className="text-[10px] text-ink-600">{counts[item]}</span>
              )}
            </button>
          ))}
        </div>
      </nav>

      <div role="tabpanel">
        {tab === "overview" && <Overview bundle={bundle} />}
        {tab === "mindmap" &&
          (bundle.mindmap ? (
            <MindMap payload={bundle.mindmap} />
          ) : (
            <ErrorBanner message="This pack has no mind map." />
          ))}
        {tab === "flashcards" && <FlashcardDeck cards={bundle.flashcards} packId={packId} />}
        {tab === "mcqs" && <QuizRunner mcqs={bundle.mcqs} packId={packId} />}
        {tab === "memes" && <MemeWall memes={bundle.memes} />}
        {tab === "resources" && <ResourceList resources={bundle.resources} />}
        {tab === "battle" && <BattlePanel packId={packId} questionCount={bundle.mcqs.length} />}
        {tab === "pdf" && <PdfPanel packId={packId} initialUrl={bundle.pdfUrl} />}
        {tab === "share" && <SharePanel packId={packId} />}
      </div>
    </div>
  );
}
