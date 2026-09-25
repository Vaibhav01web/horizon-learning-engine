import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "@/lib/api";
import { ErrorBanner, Spinner } from "@/components/ui";

interface Turn {
  role: "user" | "assistant";
  content: string;
}

interface Source {
  index: number;
  id: string;
  kind: string;
  heading: string | null;
}

/**
 * The contextual Doubt-Buster chatbot.
 *
 * Reached from the PDF's "Ask about this section" links, which carry
 * ?pack_id=…&section_id=… — section_id pins retrieval to that section.
 */
export function Chat() {
  const [searchParams] = useSearchParams();
  const packId = searchParams.get("pack_id") ?? "";
  const sectionId = searchParams.get("section_id");

  const [turns, setTurns] = useState<Turn[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [question, setQuestion] = useState("");
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns, thinking]);

  async function ask() {
    const asked = question.trim();
    if (!asked || thinking) return;

    const history = turns.slice(-10);
    setTurns([...turns, { role: "user", content: asked }]);
    setQuestion("");
    setThinking(true);
    setError(null);

    try {
      const response = await api.post<{ answer: string; sources: Source[] }>("/api/chat", {
        packId,
        sectionId,
        question: asked,
        history,
      });
      setTurns((previous) => [...previous, { role: "assistant", content: response.answer }]);
      setSources(response.sources);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The chatbot could not answer.");
    } finally {
      setThinking(false);
    }
  }

  if (!packId) {
    return <ErrorBanner message="This chat link is missing its pack_id." />;
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Doubt-Buster</h1>
        <p className="text-sm text-ink-400">
          {sectionId
            ? "Scoped to the section you came from — ask anything about it."
            : "Ask anything about this study pack. Answers are grounded in your own material."}
        </p>
      </header>

      <div className="card min-h-72 space-y-4 p-5">
        {turns.length === 0 && !thinking && (
          <p className="py-10 text-center text-sm text-ink-400">
            Ask your first question — for example, “explain this with a worked example”.
          </p>
        )}

        {turns.map((turn, index) => (
          <div
            key={index}
            className={`flex ${turn.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <p
              className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                turn.role === "user"
                  ? "bg-brand-500 text-white"
                  : "border border-ink-700 bg-ink-850 text-ink-200"
              }`}
            >
              {turn.content}
            </p>
          </div>
        ))}

        {thinking && (
          <div className="flex items-center gap-2 text-sm text-ink-400">
            <Spinner /> Searching your material…
          </div>
        )}

        <div ref={bottom} />
      </div>

      {error && <ErrorBanner message={error} />}

      <div className="flex gap-2">
        <input
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          onKeyDown={(event) => event.key === "Enter" && ask()}
          placeholder="What don't you understand?"
          maxLength={2000}
          className="input flex-1"
        />
        <button type="button" onClick={ask} disabled={!question.trim() || thinking} className="btn-primary">
          Ask
        </button>
      </div>

      {sources.length > 0 && (
        <details className="card p-4 text-xs text-ink-400">
          <summary className="cursor-pointer font-semibold text-ink-300">
            Sources used ({sources.length})
          </summary>
          <ul className="mt-2 space-y-1">
            {sources.map((source) => (
              <li key={source.id}>
                [{source.index}] {source.heading ?? source.kind}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
