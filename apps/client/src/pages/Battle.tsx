import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import type { BattleParticipant, BattleSession } from "@zpl/shared-types";
import { api, ApiError } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { ErrorBanner, ProgressBar, Spinner } from "@/components/ui";

/** Options are public; correct_index deliberately is not. */
interface BattleQuestion {
  id: string;
  question: string;
  options: string[];
  topic: string | null;
  difficulty: string;
}

interface BattleState {
  session: BattleSession;
  pack: { id: string; title: string; subject: string | null };
  questions: BattleQuestion[];
  participants: BattleParticipant[];
}

export function Battle() {
  const { code = "" } = useParams();
  const [state, setState] = useState<BattleState | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Which participant this browser is. Guarded because storage is unavailable
  // in private-mode iframes and during any non-browser render.
  const [participantId, setParticipantId] = useState<string | null>(() => {
    try {
      return sessionStorage.getItem(`zpl:battle:${code}`);
    } catch {
      return null;
    }
  });

  const refresh = useCallback(async () => {
    try {
      setState(await api.get<BattleState>(`/api/battle/${code}`));
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Could not load this battle.");
    }
  }, [code]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Leaderboard and lobby membership both live on quiz_participants; the
  // session row carries the lobby -> active transition.
  useEffect(() => {
    if (!supabase || !state?.session.id) return;

    const channel = supabase
      .channel(`battle:${code}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "quiz_participants", filter: `session_id=eq.${state.session.id}` },
        () => void refresh(),
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "quiz_sessions", filter: `id=eq.${state.session.id}` },
        (payload) =>
          setState((previous) =>
            previous ? { ...previous, session: payload.new as BattleSession } : previous,
          ),
      )
      .subscribe();

    return () => {
      void supabase?.removeChannel(channel);
    };
  }, [code, state?.session.id, refresh]);

  // Without Realtime the leaderboard still has to move, so poll instead.
  useEffect(() => {
    if (supabase) return;
    const interval = window.setInterval(() => void refresh(), 2500);
    return () => window.clearInterval(interval);
  }, [refresh]);

  if (error) return <ErrorBanner message={error} onRetry={() => window.location.reload()} />;
  if (!state) {
    return (
      <div className="flex items-center justify-center gap-3 py-24 text-sm text-ink-400">
        <Spinner /> Loading battle…
      </div>
    );
  }

  const me = state.participants.find((participant) => participant.id === participantId) ?? null;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <div className="space-y-5">
        <header className="space-y-1">
          <p className="text-xs uppercase tracking-wider text-ink-400">{state.pack.title}</p>
          <h1 className="text-3xl font-bold tracking-tight">
            Battle <span className="font-mono text-brand-400">{state.session.code}</span>
          </h1>
        </header>

        {!me ? (
          <JoinForm
            code={code}
            onJoined={(participant) => {
              rememberParticipant(code, participant.id);
              setParticipantId(participant.id);
              void refresh();
            }}
          />
        ) : state.session.status === "lobby" ? (
          <Lobby state={state} me={me} onStarted={refresh} />
        ) : (
          <Arena state={state} me={me} onAnswered={refresh} />
        )}
      </div>

      <Leaderboard participants={state.participants} meId={participantId} />
    </div>
  );
}

/** Best-effort persistence so a refresh keeps you in the same battle. */
function rememberParticipant(code: string, participantId: string): void {
  try {
    sessionStorage.setItem(`zpl:battle:${code}`, participantId);
  } catch {
    // Storage disabled — the player simply re-joins on refresh.
  }
}

function JoinForm({
  code,
  onJoined,
}: {
  code: string;
  onJoined: (participant: BattleParticipant) => void;
}) {
  const [name, setName] = useState("");
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function join() {
    setJoining(true);
    setError(null);
    try {
      const { participant } = await api.post<{ participant: BattleParticipant }>("/api/battle/join", {
        code,
        displayName: name.trim(),
      });
      onJoined(participant);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not join.");
      setJoining(false);
    }
  }

  return (
    <div className="card space-y-4 p-6">
      <h2 className="text-base font-semibold text-ink-100">Join this battle</h2>
      <p className="text-sm text-ink-400">No account needed — just pick a name.</p>
      <input
        value={name}
        onChange={(event) => setName(event.target.value)}
        onKeyDown={(event) => event.key === "Enter" && name.trim() && join()}
        placeholder="Your name"
        maxLength={40}
        className="input"
      />
      {error && <ErrorBanner message={error} />}
      <button
        type="button"
        onClick={join}
        disabled={!name.trim() || joining}
        className="btn-primary w-full py-3"
      >
        {joining ? <Spinner /> : "Join battle"}
      </button>
    </div>
  );
}

function Lobby({
  state,
  me,
  onStarted,
}: {
  state: BattleState;
  me: BattleParticipant;
  onStarted: () => void;
}) {
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const shareUrl = `${window.location.origin}/battle/${state.session.code}`;

  return (
    <div className="card space-y-5 p-6">
      <div>
        <h2 className="text-base font-semibold text-ink-100">Waiting for players</h2>
        <p className="mt-1 text-sm text-ink-400">
          {state.participants.length} in the lobby · {state.questions.length} questions
        </p>
      </div>

      <div className="space-y-2">
        <label htmlFor="battle-link" className="text-xs font-semibold uppercase tracking-wider text-ink-400">
          Share this link
        </label>
        <div className="flex gap-2">
          <input id="battle-link" readOnly value={shareUrl} className="input font-mono text-xs" />
          <button
            type="button"
            className="btn-ghost shrink-0"
            onClick={() => void navigator.clipboard.writeText(shareUrl)}
          >
            Copy
          </button>
        </div>
      </div>

      {error && <ErrorBanner message={error} />}

      {me.is_host ? (
        <button
          type="button"
          disabled={starting}
          className="btn-primary w-full py-3"
          onClick={async () => {
            setStarting(true);
            setError(null);
            try {
              await api.post(`/api/battle/${state.session.code}/start`);
              onStarted();
            } catch (cause) {
              setError(cause instanceof Error ? cause.message : "Could not start.");
              setStarting(false);
            }
          }}
        >
          {starting ? <Spinner /> : "Start the battle"}
        </button>
      ) : (
        <p className="text-center text-sm text-ink-400">Waiting for the host to start…</p>
      )}
    </div>
  );
}

function Arena({
  state,
  me,
  onAnswered,
}: {
  state: BattleState;
  me: BattleParticipant;
  onAnswered: () => void;
}) {
  const [index, setIndex] = useState(me.answered_count);
  const [feedback, setFeedback] = useState<{ isCorrect: boolean; correctIndex: number; explanation: string; points: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const askedAt = useRef(Date.now());

  const question = state.questions[index];

  useEffect(() => {
    askedAt.current = Date.now();
  }, [index]);

  if (!question) {
    return (
      <div className="card space-y-3 p-8 text-center">
        <h2 className="text-lg font-semibold text-ink-100">You're done</h2>
        <p className="text-sm text-ink-400">
          {me.correct_count}/{me.answered_count} correct · {me.score.toLocaleString()} points.
          The leaderboard keeps updating while others finish.
        </p>
      </div>
    );
  }

  async function answer(selectedIndex: number) {
    setSubmitting(true);
    setError(null);
    try {
      // The server grades and scores; the client never sees the key in advance.
      const result = await api.post<{
        isCorrect: boolean;
        correctIndex: number;
        explanation: string;
        points: number;
      }>("/api/battle/answer", {
        sessionId: state.session.id,
        participantId: me.id,
        mcqId: question.id,
        selectedIndex,
        timeMs: Math.min(120_000, Date.now() - askedAt.current),
      });
      setFeedback(result);
      onAnswered();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not submit that answer.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <ProgressBar value={(index / state.questions.length) * 100} />

      <div className="card space-y-5 p-6">
        <p className="text-xs text-ink-400">
          Question {index + 1} of {state.questions.length}
        </p>
        <h2 className="text-lg font-semibold leading-snug text-ink-100">{question.question}</h2>

        <div className="space-y-2">
          {question.options.map((option, optionIndex) => {
            const revealed = feedback !== null;
            const isCorrect = revealed && optionIndex === feedback.correctIndex;

            return (
              <button
                key={optionIndex}
                type="button"
                disabled={revealed || submitting}
                onClick={() => answer(optionIndex)}
                className={`flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-colors ${
                  isCorrect
                    ? "border-mint-400 bg-mint-400/10 text-ink-100"
                    : "border-ink-700 bg-ink-850 text-ink-300 enabled:hover:border-brand-400"
                }`}
              >
                <span className="mt-px font-mono text-xs text-ink-400">
                  {String.fromCharCode(65 + optionIndex)}
                </span>
                <span>{option}</span>
              </button>
            );
          })}
        </div>

        {error && <ErrorBanner message={error} />}

        {feedback && (
          <div className="space-y-3 border-t border-ink-800 pt-4">
            <p className={`text-sm font-semibold ${feedback.isCorrect ? "text-mint-400" : "text-rose-400"}`}>
              {feedback.isCorrect ? `Correct · +${feedback.points} points` : "Not quite"}
            </p>
            <p className="text-sm leading-relaxed text-ink-300">{feedback.explanation}</p>
            <button
              type="button"
              className="btn-primary w-full"
              onClick={() => {
                setFeedback(null);
                setIndex((previous) => previous + 1);
              }}
            >
              {index + 1 === state.questions.length ? "Finish" : "Next question"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Leaderboard({
  participants,
  meId,
}: {
  participants: BattleParticipant[];
  meId: string | null;
}) {
  return (
    <aside className="card h-fit p-5 lg:sticky lg:top-20">
      <h2 className="text-sm font-semibold text-ink-100">Live leaderboard</h2>

      <ol className="mt-4 space-y-1">
        {participants.map((participant, rank) => (
          <li
            key={participant.id}
            className={`flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm transition-colors ${
              participant.id === meId ? "bg-brand-500/10 text-ink-100" : "text-ink-300"
            }`}
          >
            <span className="w-4 text-xs text-ink-400">{rank + 1}</span>
            <span className="flex-1 truncate">
              {participant.display_name}
              {participant.is_host && <span className="ml-1.5 text-[10px] text-ink-600">host</span>}
            </span>
            <span className="text-xs text-ink-400">{participant.correct_count}✓</span>
            <span className="font-mono text-xs font-semibold text-brand-300">
              {participant.score.toLocaleString()}
            </span>
          </li>
        ))}
      </ol>

      {participants.length === 0 && <p className="mt-3 text-sm text-ink-400">Nobody has joined yet.</p>}
    </aside>
  );
}
