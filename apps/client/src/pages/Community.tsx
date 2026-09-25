import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { EmptyState, ErrorBanner, Spinner } from "@/components/ui";

interface CommunityPack {
  id: string;
  pack_id: string;
  author_name: string;
  description: string | null;
  tags: string[];
  upvote_count: number;
  clone_count: number;
  published_at: string;
  study_packs: { id: string; title: string; subject: string | null };
}

interface Comment {
  id: string;
  author: string;
  body: string;
  created_at: string;
}

export function Community() {
  const navigate = useNavigate();
  const [packs, setPacks] = useState<CommunityPack[] | null>(null);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"top" | "new">("top");
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(async (query: string, order: "top" | "new") => {
    try {
      const params = new URLSearchParams({ sort: order });
      if (query.trim()) params.set("q", query.trim());
      const data = await api.get<{ packs: CommunityPack[] }>(`/api/community?${params}`);
      setPacks(data.packs);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load the community pool.");
    }
  }, []);

  useEffect(() => {
    // Debounce so typing a subject does not fire a request per keystroke.
    const timer = window.setTimeout(() => void load(search, sort), 250);
    return () => window.clearTimeout(timer);
  }, [search, sort, load]);

  async function upvote(id: string) {
    const { upvoteCount } = await api.post<{ upvoteCount: number }>(`/api/community/${id}/upvote`);
    setPacks(
      (previous) =>
        previous?.map((pack) => (pack.id === id ? { ...pack, upvote_count: upvoteCount } : pack)) ??
        null,
    );
  }

  async function clone(id: string) {
    const { packId } = await api.post<{ packId: string }>(`/api/community/${id}/clone`);
    navigate(`/study/${packId}`);
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Community pool</h1>
        <p className="text-sm text-ink-400">
          Study packs other students published. Clone one and it becomes yours, assets and all.
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by subject or topic…"
          className="input flex-1 min-w-56"
        />
        <div className="flex gap-1 rounded-xl border border-ink-700 bg-ink-850 p-1">
          {(["top", "new"] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setSort(option)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                sort === option ? "bg-ink-800 text-ink-100" : "text-ink-400"
              }`}
            >
              {option === "top" ? "Top" : "Newest"}
            </button>
          ))}
        </div>
      </div>

      {error && <ErrorBanner message={error} />}

      {!packs ? (
        <div className="flex items-center justify-center gap-3 py-20 text-sm text-ink-400">
          <Spinner /> Loading…
        </div>
      ) : packs.length === 0 ? (
        <EmptyState
          title="Nothing published yet"
          description="Generate a study pack, then publish it from its Share tab to seed the pool."
        />
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {packs.map((pack) => (
            <li key={pack.id} className="card flex flex-col gap-3 p-5">
              <div className="space-y-1">
                <h2 className="text-base font-semibold leading-snug text-ink-100">
                  {pack.study_packs.title}
                </h2>
                <p className="text-xs text-ink-400">
                  {pack.study_packs.subject ?? "Uncategorised"} · by {pack.author_name}
                </p>
              </div>

              {pack.description && (
                <p className="text-sm leading-relaxed text-ink-300">{pack.description}</p>
              )}

              <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
                <button type="button" onClick={() => upvote(pack.id)} className="btn-ghost px-3 py-1.5 text-xs">
                  ▲ {pack.upvote_count}
                </button>
                <button type="button" onClick={() => clone(pack.id)} className="btn-ghost px-3 py-1.5 text-xs">
                  Clone{pack.clone_count > 0 && ` · ${pack.clone_count}`}
                </button>
                <button
                  type="button"
                  onClick={() => setOpenId(openId === pack.id ? null : pack.id)}
                  className="btn-ghost px-3 py-1.5 text-xs"
                >
                  Comments
                </button>
                <button
                  type="button"
                  onClick={() => navigate(`/study/${pack.pack_id}`)}
                  className="ml-auto text-xs font-semibold text-brand-300 underline underline-offset-2"
                >
                  Open
                </button>
              </div>

              {openId === pack.id && <CommentThread communityId={pack.id} />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CommentThread({ communityId }: { communityId: string }) {
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [author, setAuthor] = useState("");
  const [body, setBody] = useState("");

  const load = useCallback(() => {
    api
      .get<{ comments: Comment[] }>(`/api/community/${communityId}/comments`)
      .then((data) => setComments(data.comments))
      .catch(() => setComments([]));
  }, [communityId]);

  useEffect(load, [load]);

  async function submit() {
    await api.post(`/api/community/${communityId}/comments`, {
      author: author.trim() || "Anonymous",
      body: body.trim(),
    });
    setBody("");
    load();
  }

  return (
    <div className="space-y-3 border-t border-ink-800 pt-3">
      <div className="flex gap-2">
        <input
          value={author}
          onChange={(event) => setAuthor(event.target.value)}
          placeholder="Name"
          maxLength={40}
          className="input w-28 text-xs"
        />
        <input
          value={body}
          onChange={(event) => setBody(event.target.value)}
          onKeyDown={(event) => event.key === "Enter" && body.trim() && submit()}
          placeholder="Add a comment…"
          maxLength={1000}
          className="input flex-1 text-xs"
        />
      </div>

      <ul className="space-y-2">
        {comments?.map((comment) => (
          <li key={comment.id} className="text-xs">
            <span className="font-semibold text-ink-100">{comment.author}</span>{" "}
            <span className="text-ink-300">{comment.body}</span>
          </li>
        ))}
        {comments?.length === 0 && <li className="text-xs text-ink-400">No comments yet.</li>}
      </ul>
    </div>
  );
}
