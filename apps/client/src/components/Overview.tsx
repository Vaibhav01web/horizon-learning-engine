import { useState } from "react";
import type { StudyPackBundle } from "@zpl/shared-types";
import { EmptyState } from "@/components/ui";

export function Overview({ bundle }: { bundle: StudyPackBundle }) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  if (!bundle.summary) {
    return (
      <EmptyState
        title="No summary yet"
        description="This pack finished without a summary. Regenerating it will retry every step."
      />
    );
  }

  const definitions = bundle.contentBlocks.filter((block) => block.kind === "definition");
  const formulas = bundle.contentBlocks.filter((block) => block.kind === "formula");
  const chronology = bundle.contentBlocks.filter((block) => block.kind === "chronology");

  function toggle(index: number) {
    setExpanded((previous) => {
      const next = new Set(previous);
      next.has(index) ? next.delete(index) : next.add(index);
      return next;
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <div className="space-y-6">
        <section className="card border-brand-500/30 bg-brand-500/[0.06] p-6">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-brand-300">
            Executive overview
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-ink-100">
            {bundle.summary.executive_overview}
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-ink-100">Bullet breakdown</h2>
          <p className="text-xs text-ink-400">Click any point to expand it.</p>

          <ul className="mt-3 space-y-2">
            {bundle.summary.bullet_breakdown.map((item, index) => (
              <li key={index}>
                <button
                  type="button"
                  onClick={() => toggle(index)}
                  aria-expanded={expanded.has(index)}
                  className="card w-full p-4 text-left transition-colors hover:border-brand-400/50"
                >
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 text-xs text-ink-600">{expanded.has(index) ? "−" : "+"}</span>
                    <span className="text-sm font-medium leading-snug text-ink-100">{item.point}</span>
                  </div>
                  {expanded.has(index) && (
                    <p className="mt-2.5 pl-6 text-sm leading-relaxed text-ink-300">{item.detail}</p>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <aside className="space-y-4">
        <BlockList title="Definitions" blocks={definitions} />
        <BlockList title="Formulas" blocks={formulas} mono />
        <BlockList title="Timeline" blocks={chronology} />
      </aside>
    </div>
  );
}

function BlockList({
  title,
  blocks,
  mono = false,
}: {
  title: string;
  blocks: StudyPackBundle["contentBlocks"];
  mono?: boolean;
}) {
  if (blocks.length === 0) return null;

  return (
    <section className="card p-4">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-400">
        {title} <span className="text-ink-600">({blocks.length})</span>
      </h3>
      <dl className="mt-3 space-y-3">
        {blocks.slice(0, 12).map((block) => (
          <div key={block.id}>
            <dt className="text-[13px] font-semibold text-ink-100">{block.heading}</dt>
            <dd
              className={`mt-0.5 text-xs leading-relaxed text-ink-400 ${mono ? "font-mono" : ""}`}
            >
              {block.body}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
