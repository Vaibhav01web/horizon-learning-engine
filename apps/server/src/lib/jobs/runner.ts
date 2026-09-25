import type { IngestRequest, JobStage, ParseResult } from "@zpl/shared-types";
import { db, unwrap, uploadToBucket } from "../supabase";
import { extract, UnsupportedVideoError } from "../ingest/index";
import { chunkText, embed, embeddingsEnabled } from "../embeddings";
import { parseMaterial } from "../generation/parse";
import { generateSummary } from "../generation/summary";
import { generateMindmap } from "../generation/mindmap";
import { generateFlashcards } from "../generation/flashcards";
import { generateMcqs } from "../generation/mcqs";
import { generateMemes } from "../generation/memes";
import { findResources } from "../generation/resources";
import { renderMeme, templateExists } from "../meme-render";

interface JobRow {
  id: string;
  pack_id: string | null;
  type: string;
  payload: { sourceId?: string };
}

interface SourceRow {
  id: string;
  pack_id: string;
  kind: IngestRequest["kind"];
  file_name: string | null;
  storage_path: string | null;
  external_url: string | null;
  raw_text: string | null;
}

/** Fractions of the run each stage represents, used for the progress bar. */
const STAGE_PROGRESS: Record<JobStage, number> = {
  extracting: 8,
  parsing: 22,
  structuring: 34,
  embedding: 44,
  summarizing: 56,
  mindmap: 66,
  flashcards: 75,
  mcqs: 84,
  memes: 90,
  resources: 96,
  done: 100,
};

/**
 * Claims one pending job and runs it to completion.
 * Returns false when the queue is empty, so callers can back off.
 */
export async function runNextJob(): Promise<boolean> {
  const { data, error } = await db().rpc("claim_next_job");
  if (error) throw new Error(`Failed to claim job: ${error.message}`);

  const job = (data as JobRow[] | null)?.[0];
  if (!job) return false;

  await runJob(job);
  return true;
}

export async function runJobById(jobId: string): Promise<void> {
  const job = unwrap(
    await db().from("jobs").select("id, pack_id, type, payload").eq("id", jobId).single(),
  ) as JobRow;

  await db().from("jobs").update({ status: "processing", updated_at: now() }).eq("id", jobId);
  await runJob(job);
}

async function runJob(job: JobRow): Promise<void> {
  try {
    await generateSuite(job);
    await db()
      .from("jobs")
      .update({ status: "completed", stage: "done", progress: 100, error: null, updated_at: now() })
      .eq("id", job.id);
    if (job.pack_id) {
      await db()
        .from("study_packs")
        .update({ status: "ready", updated_at: now() })
        .eq("id", job.pack_id);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Generation failed";
    console.error(`[jobs] ${job.id} failed:`, error);

    await db()
      .from("jobs")
      .update({ status: "failed", error: message, updated_at: now() })
      .eq("id", job.id);
    if (job.pack_id) {
      await db()
        .from("study_packs")
        .update({ status: "failed", updated_at: now() })
        .eq("id", job.pack_id);
    }
  }
}

async function generateSuite(job: JobRow): Promise<void> {
  const packId = job.pack_id;
  if (!packId) throw new Error("Job has no associated study pack");
  if (!job.payload.sourceId) throw new Error("Job payload is missing sourceId");

  const advance = (stage: JobStage) =>
    db()
      .from("jobs")
      .update({ stage, progress: STAGE_PROGRESS[stage], updated_at: now() })
      .eq("id", job.id);

  /* --- 1. Normalize the input into text -------------------------------- */
  await advance("extracting");
  const source = unwrap(
    await db().from("sources").select("*").eq("id", job.payload.sourceId).single(),
  ) as SourceRow;

  const material = await extractSource(source);
  await db()
    .from("sources")
    .update({ raw_text: material, char_count: material.length })
    .eq("id", source.id);

  /* --- 2. Hierarchical parse ------------------------------------------- */
  await advance("parsing");
  const parsed = await parseMaterial(material);

  await db()
    .from("study_packs")
    .update({ title: parsed.title, subject: parsed.subject, updated_at: now() })
    .eq("id", packId);

  /* --- 3. Content blocks ------------------------------------------------ */
  await advance("structuring");
  const blocks = buildContentBlocks(packId, parsed, material);
  const insertedBlocks = unwrap(
    await db().from("content_blocks").insert(blocks).select("id, body, position"),
  ) as { id: string; body: string; position: number }[];

  /* --- 4. Embeddings (optional) ----------------------------------------- */
  await advance("embedding");
  if (embeddingsEnabled()) {
    await storeEmbeddings(insertedBlocks);
  } else {
    console.warn("[jobs] VOYAGE_API_KEY not set — chatbot will use keyword retrieval");
  }

  /* --- 5. Study assets --------------------------------------------------
   * Summary and mind map run first because the UI shows them on the
   * Overview tab the moment the pack opens.
   * -------------------------------------------------------------------- */
  await advance("summarizing");
  const summary = await generateSummary(material);
  await db().from("summaries").upsert(
    {
      pack_id: packId,
      executive_overview: summary.executive_overview,
      bullet_breakdown: summary.bullet_breakdown,
    },
    { onConflict: "pack_id" },
  );

  await advance("mindmap");
  const mindmap = await generateMindmap(material, parsed);
  await db()
    .from("mindmaps")
    .upsert({ pack_id: packId, nodes: mindmap.nodes, edges: mindmap.edges }, { onConflict: "pack_id" });

  await advance("flashcards");
  const cards = await generateFlashcards(material, parsed);
  if (cards.length) {
    await db()
      .from("flashcards")
      .insert(cards.map((card, index) => ({ pack_id: packId, ...card, position: index })));
  }

  await advance("mcqs");
  const questions = await generateMcqs(material, parsed);
  if (questions.length) {
    await db()
      .from("mcqs")
      .insert(questions.map((question, index) => ({ pack_id: packId, ...question, position: index })));
  }

  /* --- 6. Nice-to-haves: never fail the pack over these ------------------ */
  await advance("memes");
  await safely("memes", () => generateAndStoreMemes(packId, material, parsed));

  await advance("resources");
  await safely("resources", async () => {
    const resources = await findResources(parsed);
    if (resources.length) {
      await db()
        .from("resources")
        .upsert(
          resources.map((resource) => ({ pack_id: packId, ...resource })),
          { onConflict: "pack_id,url" },
        );
    }
  });

  await advance("done");
}

async function extractSource(source: SourceRow): Promise<string> {
  if (source.raw_text) return source.raw_text;

  if (source.kind === "youtube") {
    if (!source.external_url) throw new Error("YouTube source is missing its URL");
    try {
      const result = await extract({ kind: "youtube", url: source.external_url });
      return result.text;
    } catch (error) {
      if (error instanceof UnsupportedVideoError) {
        // Distinct from a crash: the video is simply not usable.
        throw new Error(`Unsupported video — ${error.message}`);
      }
      throw error;
    }
  }

  if (!source.storage_path) throw new Error("Uploaded file is missing its storage path");
  const download = await db().storage.from("raw-uploads").download(source.storage_path);
  if (download.error) throw new Error(`Could not read upload: ${download.error.message}`);

  const buffer = Buffer.from(await download.data.arrayBuffer());
  const result = await extract({
    kind: source.kind,
    fileBase64: buffer.toString("base64"),
    fileName: source.file_name ?? undefined,
    mimeType: mimeFor(source),
  } as IngestRequest);

  return result.text;
}

function mimeFor(source: SourceRow): string {
  if (source.kind === "pdf") return "application/pdf";
  if (source.kind === "docx") {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }
  const name = source.file_name?.toLowerCase() ?? "";
  if (name.endsWith(".png")) return "image/png";
  if (name.endsWith(".webp")) return "image/webp";
  if (name.endsWith(".gif")) return "image/gif";
  return "image/jpeg";
}

function buildContentBlocks(packId: string, parsed: ParseResult, material: string) {
  let position = 0;
  const rows: Record<string, unknown>[] = [];

  // Every row must carry an identical key set: PostgREST rejects a bulk insert
  // whose objects differ in shape ("All object keys must match").
  const row = (fields: {
    kind: string;
    heading: string | null;
    body: string;
    topic?: string | null;
    importance?: string | null;
  }) => ({
    pack_id: packId,
    kind: fields.kind,
    heading: fields.heading,
    body: fields.body,
    topic: fields.topic ?? null,
    importance: fields.importance ?? null,
    position: position++,
  });

  for (const definition of parsed.definitions) {
    rows.push(
      row({ kind: "definition", heading: definition.term, body: definition.definition }),
    );
  }

  for (const formula of parsed.formulas) {
    rows.push(
      row({
        kind: "formula",
        heading: formula.name,
        body: `${formula.expression}\n\n${formula.explanation}`,
      }),
    );
  }

  for (const entry of parsed.chronology) {
    rows.push(row({ kind: "chronology", heading: entry.date_or_order, body: entry.event }));
  }

  for (const topic of parsed.topics) {
    rows.push(
      row({
        kind: "topic",
        heading: topic.topic,
        body:
          topic.subtopics.length > 0
            ? `${topic.explanation}\n\nSubtopics: ${topic.subtopics.join(", ")}`
            : topic.explanation,
        topic: topic.topic,
        importance: topic.importance,
      }),
    );
  }

  // Raw chunks keep the chatbot grounded in the student's actual wording.
  for (const chunk of chunkText(material)) {
    rows.push(row({ kind: "chunk", heading: null, body: chunk }));
  }

  return rows;
}

async function storeEmbeddings(blocks: { id: string; body: string }[]): Promise<void> {
  const vectors = await embed(
    blocks.map((block) => block.body.slice(0, 8000)),
    "document",
  );
  // Supabase has no bulk column update, so patch in parallel batches.
  for (let i = 0; i < blocks.length; i += 25) {
    await Promise.all(
      blocks.slice(i, i + 25).map((block, offset) =>
        db().from("content_blocks").update({ embedding: vectors[i + offset] }).eq("id", block.id),
      ),
    );
  }
}

async function generateAndStoreMemes(
  packId: string,
  material: string,
  parsed: ParseResult,
): Promise<void> {
  const memes = await generateMemes(material, parsed);

  for (const [index, meme] of memes.entries()) {
    if (!templateExists(meme.template)) continue;

    let imageUrl: string | null = null;
    try {
      const png = await renderMeme(meme.template, meme.captions);
      imageUrl = await uploadToBucket(
        "memes",
        `${packId}/${index}-${meme.template}.png`,
        png,
        "image/png",
      );
    } catch (error) {
      // Keep the captions even if compositing fails — the UI can show text.
      console.warn("[memes] compositing failed", error);
    }

    await db().from("memes").insert({
      pack_id: packId,
      template: meme.template,
      captions: meme.captions,
      image_url: imageUrl,
      topic: meme.topic,
    });
  }
}

/** Runs an optional stage, logging failures instead of aborting the pack. */
async function safely(label: string, work: () => Promise<void>): Promise<void> {
  try {
    await work();
  } catch (error) {
    console.warn(`[jobs] optional stage "${label}" failed:`, error);
  }
}

function now(): string {
  return new Date().toISOString();
}
