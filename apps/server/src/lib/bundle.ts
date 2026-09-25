import type { StudyPackBundle } from "@zpl/shared-types";
import { db, unwrap } from "./supabase";
import { HttpError } from "./http";

/** Loads every generated asset for a pack in one round of parallel queries. */
export async function loadBundle(packId: string): Promise<StudyPackBundle> {
  const client = db();

  const [pack, summary, mindmap, flashcards, mcqs, memes, resources, blocks] = await Promise.all([
    client.from("study_packs").select("*").eq("id", packId).maybeSingle(),
    client.from("summaries").select("*").eq("pack_id", packId).maybeSingle(),
    client.from("mindmaps").select("*").eq("pack_id", packId).maybeSingle(),
    client.from("flashcards").select("*").eq("pack_id", packId).order("position"),
    client.from("mcqs").select("*").eq("pack_id", packId).order("position"),
    client.from("memes").select("*").eq("pack_id", packId).order("created_at"),
    client.from("resources").select("*").eq("pack_id", packId).order("relevance", { ascending: false }),
    client.from("content_blocks").select("id, pack_id, kind, heading, body, topic").eq("pack_id", packId).order("position"),
  ]);

  if (!pack.data) throw new HttpError("Study pack not found", 404);

  return {
    pack: pack.data,
    summary: summary.data
      ? {
          executive_overview: summary.data.executive_overview,
          bullet_breakdown: summary.data.bullet_breakdown,
        }
      : null,
    mindmap: mindmap.data ? { nodes: mindmap.data.nodes, edges: mindmap.data.edges } : null,
    flashcards: unwrap(flashcards),
    mcqs: unwrap(mcqs),
    memes: unwrap(memes),
    resources: unwrap(resources),
    contentBlocks: unwrap(blocks),
    pdfUrl: pack.data.pdf_url ?? null,
  };
}
