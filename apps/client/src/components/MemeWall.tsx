import type { Meme } from "@zpl/shared-types";
import { EmptyState } from "@/components/ui";

export function MemeWall({ memes }: { memes: Meme[] }) {
  if (memes.length === 0) {
    return (
      <EmptyState
        title="No memes for this pack"
        description="Meme generation is a best-effort step — a pack still finishes without it."
      />
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {memes.map((meme) => (
        <figure key={meme.id} className="card overflow-hidden">
          {meme.image_url ? (
            <img
              src={meme.image_url}
              alt={`${meme.template} meme: ${meme.captions.join(" / ")}`}
              loading="lazy"
              className="w-full"
            />
          ) : (
            // The compositing step can fail independently of caption generation.
            <div className="space-y-2 p-5">
              {meme.captions.map((caption, index) => (
                <p key={index} className="text-sm font-semibold text-ink-100">
                  {caption}
                </p>
              ))}
            </div>
          )}
          <figcaption className="flex items-center justify-between gap-2 border-t border-ink-800 px-4 py-2.5 text-xs text-ink-400">
            <span>{meme.topic ?? "General"}</span>
            <span className="text-ink-600">{meme.template.replace(/-/g, " ")}</span>
          </figcaption>
        </figure>
      ))}
    </div>
  );
}
