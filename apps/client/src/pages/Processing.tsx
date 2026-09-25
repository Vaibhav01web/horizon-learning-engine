import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { JOB_STAGE_LABELS, JOB_STAGE_ORDER, type Job, type JobStage } from "@zpl/shared-types";
import { api } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { ErrorBanner, ProgressBar } from "@/components/ui";

/** Stages worth showing; "done" is represented by the page navigating away. */
type VisibleStage = Exclude<JobStage, "done">;
const VISIBLE_STAGES = JOB_STAGE_ORDER.filter(
  (stage): stage is VisibleStage => stage !== "done",
);

export function Processing() {
  const { packId = "" } = useParams();
  const navigate = useNavigate();

  const [job, setJob] = useState<Job | null>(null);
  const [error, setError] = useState<string | null>(null);
  const navigated = useRef(false);

  useEffect(() => {
    if (!packId) return;
    let cancelled = false;

    function apply(next: Job) {
      if (cancelled) return;
      setJob(next);

      if (next.status === "completed" && !navigated.current) {
        navigated.current = true;
        // Let the final tick render before leaving, so the list visibly finishes.
        setTimeout(() => navigate(`/study/${packId}`, { replace: true }), 700);
      }
      if (next.status === "failed") setError(next.error ?? "Generation failed.");
    }

    async function poll() {
      try {
        const { job: latest } = await api.get<{ job: Job }>(`/api/study-packs/${packId}/status`);
        apply(latest);
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "Lost contact with the server.");
      }
    }

    void poll();

    // Realtime is the primary channel; polling is the safety net when the
    // socket is unavailable or drops mid-run.
    const channel = supabase
      ?.channel(`job:${packId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "jobs", filter: `pack_id=eq.${packId}` },
        (payload) => apply(payload.new as Job),
      )
      .subscribe();

    const interval = window.setInterval(poll, supabase ? 6000 : 2500);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      if (channel) void supabase?.removeChannel(channel);
    };
  }, [packId, navigate]);

  const currentIndex =
    job?.stage && job.stage !== "done" ? VISIBLE_STAGES.indexOf(job.stage) : -1;

  return (
    <div className="mx-auto max-w-lg space-y-6 py-10">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold tracking-tight">Building your study suite</h1>
        <p className="text-sm text-ink-400">
          This usually takes a minute or two. You can leave this page — it keeps running.
        </p>
      </div>

      <ProgressBar value={job?.progress ?? 4} />

      <ol className="card space-y-1 p-5">
        {VISIBLE_STAGES.map((stage, index) => (
          <StageRow
            key={stage}
            stage={stage}
            state={
              job?.status === "failed" && index === currentIndex
                ? "failed"
                : index < currentIndex || job?.status === "completed"
                  ? "done"
                  : index === currentIndex
                    ? "active"
                    : "pending"
            }
          />
        ))}
      </ol>

      {error && (
        <div className="space-y-3">
          <ErrorBanner message={error} />
          <div className="flex justify-center gap-3">
            <button
              type="button"
              className="btn-ghost"
              onClick={() =>
                api
                  .post(`/api/study-packs/${packId}/generate`)
                  .then(() => window.location.reload())
                  .catch((cause) => setError(cause.message))
              }
            >
              Retry generation
            </button>
            <Link to="/" className="btn-ghost">
              Start over
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

type StageState = "pending" | "active" | "done" | "failed";

function StageRow({ stage, state }: { stage: JobStage; state: StageState }) {
  const marker =
    state === "done" ? "✓" : state === "failed" ? "✕" : state === "active" ? "◐" : "○";

  const tone =
    state === "done"
      ? "text-mint-400"
      : state === "failed"
        ? "text-rose-400"
        : state === "active"
          ? "text-brand-300"
          : "text-ink-600";

  return (
    <li className="flex items-center gap-3 py-1.5">
      <span
        aria-hidden
        className={`w-4 text-center text-sm ${tone} ${state === "active" ? "animate-pulse" : ""}`}
      >
        {marker}
      </span>
      <span className={`text-sm ${state === "pending" ? "text-ink-600" : "text-ink-100"}`}>
        {JOB_STAGE_LABELS[stage]}
      </span>
    </li>
  );
}
