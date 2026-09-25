import { db, unwrap } from "./supabase";
import { embed, embeddingsEnabled } from "./embeddings";

export interface RetrievedBlock {
  id: string;
  kind: string;
  heading: string | null;
  body: string;
  topic: string | null;
}

/**
 * Finds the content blocks most relevant to a question.
 *
 * Uses pgvector when embeddings exist, and degrades to keyword overlap when
 * no embedding provider is configured — the chatbot stays usable either way.
 */
export async function retrieve(
  packId: string,
  question: string,
  sectionId?: string | null,
  limit = 8,
): Promise<RetrievedBlock[]> {
  // An explicit section anchors the answer to that part of the PDF.
  const pinned = sectionId ? await loadBlock(packId, sectionId) : null;

  const found = embeddingsEnabled()
    ? await semanticSearch(packId, question, limit)
    : await keywordSearch(packId, question, limit);

  if (!pinned) return found;
  return [pinned, ...found.filter((block) => block.id !== pinned.id)].slice(0, limit);
}

async function loadBlock(packId: string, blockId: string): Promise<RetrievedBlock | null> {
  const { data } = await db()
    .from("content_blocks")
    .select("id, kind, heading, body, topic")
    .eq("pack_id", packId)
    .eq("id", blockId)
    .maybeSingle();
  return (data as RetrievedBlock | null) ?? null;
}

async function semanticSearch(
  packId: string,
  question: string,
  limit: number,
): Promise<RetrievedBlock[]> {
  const [vector] = await embed([question], "query");
  const { data, error } = await db().rpc("match_content_blocks", {
    p_pack_id: packId,
    p_embedding: vector,
    p_limit: limit,
  });
  if (error) throw new Error(`Retrieval failed: ${error.message}`);
  return (data ?? []) as RetrievedBlock[];
}

async function keywordSearch(
  packId: string,
  question: string,
  limit: number,
): Promise<RetrievedBlock[]> {
  const blocks = unwrap(
    await db()
      .from("content_blocks")
      .select("id, kind, heading, body, topic")
      .eq("pack_id", packId)
      .order("position"),
  ) as RetrievedBlock[];

  const terms = tokenize(question);
  if (terms.length === 0) return blocks.slice(0, limit);

  return blocks
    .map((block) => {
      const haystack = tokenize(`${block.heading ?? ""} ${block.body}`);
      const bag = new Set(haystack);
      // Headings are short and high-signal, so matches there count double.
      const headingHits = tokenize(block.heading ?? "").filter((t) => terms.includes(t)).length;
      const score = terms.filter((term) => bag.has(term)).length + headingHits;
      return { block, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => entry.block);
}

const STOPWORDS = new Set([
  "the", "a", "an", "is", "are", "was", "were", "of", "to", "in", "on", "for", "and", "or",
  "what", "why", "how", "does", "do", "did", "this", "that", "it", "with", "about", "can",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOPWORDS.has(word));
}

/** Formats retrieved blocks as the grounding context for a Claude answer. */
export function toContext(blocks: RetrievedBlock[]): string {
  return blocks
    .map(
      (block, index) =>
        `[${index + 1}] (${block.kind}${block.heading ? `: ${block.heading}` : ""})\n${block.body}`,
    )
    .join("\n\n");
}
