import type { Resource } from "@zpl/shared-types";
import { EmptyState } from "@/components/ui";

const KIND_TONE: Record<Resource["kind"], string> = {
  video: "border-rose-400/40 text-rose-400",
  course: "border-brand-400/40 text-brand-300",
  paper: "border-mint-400/40 text-mint-400",
  article: "border-amber-400/40 text-amber-400",
};

export function ResourceList({ resources }: { resources: Resource[] }) {
  if (resources.length === 0) {
    return (
      <EmptyState
        title="No resources found"
        description="The resource aggregator needs a TAVILY_API_KEY or SERPER_API_KEY on the server. Everything else in the pack works without it."
      />
    );
  }

  const byTopic = resources.reduce<Record<string, Resource[]>>((groups, resource) => {
    (groups[resource.topic] ??= []).push(resource);
    return groups;
  }, {});

  return (
    <div className="space-y-8">
      {Object.entries(byTopic).map(([topic, items]) => (
        <section key={topic} className="space-y-3">
          <h3 className="text-sm font-semibold text-ink-100">{topic}</h3>
          <ul className="grid gap-2.5 sm:grid-cols-2">
            {items.map((resource) => (
              <li key={resource.id}>
                <a
                  href={resource.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="card flex h-full flex-col gap-2 p-4 transition-colors hover:border-brand-400/50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-sm font-medium leading-snug text-ink-100">
                      {resource.title}
                    </span>
                    <span
                      className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${KIND_TONE[resource.kind]}`}
                    >
                      {resource.kind}
                    </span>
                  </div>
                  <span className="text-xs text-ink-400">{resource.source}</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
