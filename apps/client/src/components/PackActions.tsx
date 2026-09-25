import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { BattleParticipant, BattleSession } from "@zpl/shared-types";
import { api, ApiError } from "@/lib/api";
import { ErrorBanner, Spinner } from "@/components/ui";

/** Doubt-Buster PDF: build on demand, then cache the URL on the pack. */
export function PdfPanel({ packId, initialUrl }: { packId: string; initialUrl: string | null }) {
  const [url, setUrl] = useState(initialUrl);
  const [building, setBuilding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function build(refresh: boolean) {
    setBuilding(true);
    setError(null);
    try {
      const result = await api.post<{ url: string }>(
        `/api/study-packs/${packId}/pdf${refresh ? "?refresh=1" : ""}`,
      );
      setUrl(result.url);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not build the PDF.");
    } finally {
      setBuilding(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div className="card space-y-4 p-6">
        <h2 className="text-base font-semibold text-ink-100">Doubt-Buster PDF</h2>
        <p className="text-sm leading-relaxed text-ink-400">
          One styled document with the summary, topic breakdown, definitions, formulas, mind map,
          flashcards, and every question with its answer and explanation. Each section carries an
          <em> Ask about this section</em> link that opens the chatbot scoped to that part of the pack.
        </p>

        {error && <ErrorBanner message={error} />}

        <div className="flex flex-wrap gap-2">
          {url ? (
            <>
              <a href={url} target="_blank" rel="noreferrer noopener" className="btn-primary">
                Download PDF
              </a>
              <button type="button" onClick={() => build(true)} disabled={building} className="btn-ghost">
                {building ? <Spinner /> : "Rebuild"}
              </button>
            </>
          ) : (
            <button type="button" onClick={() => build(false)} disabled={building} className="btn-primary">
              {building ? (
                <>
                  <Spinner /> Rendering…
                </>
              ) : (
                "Generate PDF"
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/** Creates a battle and hands the host a shareable link. */
export function BattlePanel({ packId, questionCount }: { packId: string; questionCount: number }) {
  const navigate = useNavigate();
  const [hostName, setHostName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create() {
    setCreating(true);
    setError(null);
    try {
      const { session, participant } = await api.post<{
        session: BattleSession;
        participant: BattleParticipant;
      }>("/api/battle/create", {
        packId,
        hostName: hostName.trim() || "Host",
        questionCount: Math.min(10, questionCount),
      });

      try {
        sessionStorage.setItem(`zpl:battle:${session.code}`, participant.id);
      } catch {
        // Storage disabled — the host re-joins their own battle by name.
      }
      navigate(`/battle/${session.code}`);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Could not create the battle.");
      setCreating(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div className="card space-y-4 p-6">
        <h2 className="text-base font-semibold text-ink-100">Challenge a friend</h2>
        <p className="text-sm leading-relaxed text-ink-400">
          Creates a live quiz from this pack and gives you a six-character code. Anyone with the link
          can join as a guest — no account needed — and scores update on everyone's screen at once.
        </p>

        <input
          value={hostName}
          onChange={(event) => setHostName(event.target.value)}
          placeholder="Your display name"
          maxLength={40}
          className="input"
        />

        {error && <ErrorBanner message={error} />}

        <button type="button" onClick={create} disabled={creating} className="btn-primary w-full py-3">
          {creating ? (
            <>
              <Spinner /> Creating battle…
            </>
          ) : (
            "Create battle"
          )}
        </button>
      </div>
    </div>
  );
}

/** Publish to the community pool, and opt in to WhatsApp revision alerts. */
export function SharePanel({ packId }: { packId: string }) {
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [description, setDescription] = useState("");

  async function run(work: () => Promise<string>) {
    setError(null);
    setMessage(null);
    try {
      setMessage(await work());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "That did not work.");
    }
  }

  return (
    <div className="mx-auto grid max-w-3xl gap-4 sm:grid-cols-2">
      <section className="card space-y-3 p-5">
        <h2 className="text-sm font-semibold text-ink-100">Publish to community</h2>
        <p className="text-xs leading-relaxed text-ink-400">
          Other students can browse, upvote, comment on, and clone this pack.
        </p>
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={3}
          maxLength={500}
          placeholder="What does this pack cover?"
          className="input resize-none text-[13px]"
        />
        <button
          type="button"
          className="btn-ghost w-full"
          onClick={() =>
            run(async () => {
              await api.post("/api/community", { packId, description: description.trim() || undefined });
              return "Published to the community pool.";
            })
          }
        >
          Publish
        </button>
      </section>

      <section className="card space-y-3 p-5">
        <h2 className="text-sm font-semibold text-ink-100">WhatsApp revision alerts</h2>
        <p className="text-xs leading-relaxed text-ink-400">
          Get nudged about your weakest topics. Uses the Twilio WhatsApp sandbox, so join the sandbox
          from this number first.
        </p>
        <input
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          placeholder="+919876543210"
          className="input"
        />
        <div className="flex gap-2">
          <button
            type="button"
            className="btn-ghost flex-1"
            onClick={() =>
              run(async () => {
                await api.post("/api/alerts", { phoneNumber: phone.trim(), optIn: true });
                return "You're opted in to revision alerts.";
              })
            }
          >
            Opt in
          </button>
          <button
            type="button"
            className="btn-ghost flex-1"
            onClick={() =>
              run(async () => {
                await api.post("/api/alerts", { phoneNumber: phone.trim(), optIn: false });
                return "Alerts switched off.";
              })
            }
          >
            Opt out
          </button>
        </div>
      </section>

      {message && (
        <p className="rounded-xl border border-mint-400/40 bg-mint-400/10 px-4 py-3 text-sm text-mint-400 sm:col-span-2">
          {message}
        </p>
      )}
      {error && (
        <div className="sm:col-span-2">
          <ErrorBanner message={error} />
        </div>
      )}
    </div>
  );
}
