import type { ParseResult } from "@zpl/shared-types";
import { env } from "../env";

export interface FoundResource {
  topic: string;
  title: string;
  url: string;
  source: string;
  kind: "video" | "course" | "paper" | "article";
  thumbnail: string | null;
  relevance: number;
}

/** Domains we actively prefer, with the score bonus each earns. */
const PREFERRED: { match: (host: string) => boolean; bonus: number; kind: FoundResource["kind"] }[] =
  [
    { match: (h) => h.endsWith("youtube.com") || h === "youtu.be", bonus: 0.3, kind: "video" },
    { match: (h) => h.endsWith(".edu"), bonus: 0.35, kind: "course" },
    { match: (h) => h.endsWith(".ac.uk") || h.endsWith(".ac.in"), bonus: 0.3, kind: "course" },
    { match: (h) => h.includes("arxiv.org"), bonus: 0.3, kind: "paper" },
    { match: (h) => h.includes("ncbi.nlm.nih.gov") || h.includes("doaj.org"), bonus: 0.25, kind: "paper" },
    { match: (h) => h.includes("khanacademy.org"), bonus: 0.25, kind: "course" },
    { match: (h) => h.includes("ocw.mit.edu"), bonus: 0.35, kind: "course" },
    { match: (h) => h.includes("coursera.org") || h.includes("edx.org"), bonus: 0.2, kind: "course" },
    { match: (h) => h.includes("wikipedia.org"), bonus: 0.1, kind: "article" },
  ];

const BLOCKED = ["pinterest.", "quora.com", "chegg.com", "coursehero.com", "scribd.com"];

/**
 * Searches for learning resources per topic. Returns an empty list rather than
 * failing the job when no search provider is configured — resources are a
 * nice-to-have, not a reason to lose a study pack.
 */
export async function findResources(parsed: ParseResult): Promise<FoundResource[]> {
  const provider = env.tavilyApiKey ? "tavily" : env.serperApiKey ? "serper" : null;
  if (!provider) {
    console.warn("[resources] no TAVILY_API_KEY or SERPER_API_KEY configured — skipping");
    return [];
  }

  // Only the topics worth a student's time; each topic costs two searches.
  const topics = parsed.topics
    .filter((topic) => topic.importance !== "low")
    .slice(0, 5)
    .map((topic) => topic.topic);

  const subject = parsed.subject;
  const settled = await Promise.allSettled(
    topics.flatMap((topic) => [
      search(provider, `${topic} ${subject} explained video`, topic),
      search(provider, `${topic} ${subject} free course OR open access paper`, topic),
    ]),
  );

  const found = settled.flatMap((result) => (result.status === "fulfilled" ? result.value : []));
  for (const result of settled) {
    if (result.status === "rejected") console.warn("[resources] search failed", result.reason);
  }

  return rank(found);
}

async function search(
  provider: "tavily" | "serper",
  query: string,
  topic: string,
): Promise<FoundResource[]> {
  const raw = provider === "tavily" ? await searchTavily(query) : await searchSerper(query);

  return raw.flatMap((item) => {
    const host = hostOf(item.url);
    if (!host || BLOCKED.some((blocked) => host.includes(blocked))) return [];

    const preferred = PREFERRED.find((entry) => entry.match(host));
    return [
      {
        topic,
        title: item.title.trim(),
        url: item.url,
        source: host.replace(/^www\./, ""),
        kind: preferred?.kind ?? inferKind(item.url, item.title),
        thumbnail: item.thumbnail ?? null,
        relevance: clamp(item.score * 0.7 + (preferred?.bonus ?? 0)),
      },
    ];
  });
}

interface RawResult {
  title: string;
  url: string;
  score: number;
  thumbnail?: string | null;
}

async function searchTavily(query: string): Promise<RawResult[]> {
  const response = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.tavilyApiKey}`,
    },
    body: JSON.stringify({ query, max_results: 6, search_depth: "basic" }),
  });
  if (!response.ok) throw new Error(`Tavily search failed (${response.status})`);

  const payload = (await response.json()) as {
    results?: { title: string; url: string; score?: number }[];
  };
  return (payload.results ?? []).map((item) => ({
    title: item.title,
    url: item.url,
    score: item.score ?? 0.5,
  }));
}

async function searchSerper(query: string): Promise<RawResult[]> {
  const response = await fetch("https://google.serper.dev/search", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-API-KEY": env.serperApiKey! },
    body: JSON.stringify({ q: query, num: 6 }),
  });
  if (!response.ok) throw new Error(`Serper search failed (${response.status})`);

  const payload = (await response.json()) as {
    organic?: { title: string; link: string; position?: number }[];
  };
  return (payload.organic ?? []).map((item) => ({
    title: item.title,
    url: item.link,
    // Serper has no score, so derive one from rank.
    score: clamp(1 - (item.position ?? 5) / 12),
  }));
}

/** Dedupes by URL, then keeps the strongest few results per topic. */
function rank(results: FoundResource[]): FoundResource[] {
  const byUrl = new Map<string, FoundResource>();
  for (const result of results) {
    const existing = byUrl.get(result.url);
    if (!existing || result.relevance > existing.relevance) byUrl.set(result.url, result);
  }

  const perTopic = new Map<string, FoundResource[]>();
  for (const result of [...byUrl.values()].sort((a, b) => b.relevance - a.relevance)) {
    const bucket = perTopic.get(result.topic) ?? [];
    if (bucket.length < 4) {
      bucket.push(result);
      perTopic.set(result.topic, bucket);
    }
  }

  return [...perTopic.values()].flat().sort((a, b) => b.relevance - a.relevance);
}

function inferKind(url: string, title: string): FoundResource["kind"] {
  const haystack = `${url} ${title}`.toLowerCase();
  if (/\b(video|lecture|watch)\b/.test(haystack)) return "video";
  if (/\b(course|tutorial|syllabus|mooc)\b/.test(haystack)) return "course";
  if (/\b(paper|journal|preprint|doi)\b/.test(haystack) || haystack.includes(".pdf")) return "paper";
  return "article";
}

function hostOf(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function clamp(value: number): number {
  return Math.max(0, Math.min(1, Number(value.toFixed(3))));
}
