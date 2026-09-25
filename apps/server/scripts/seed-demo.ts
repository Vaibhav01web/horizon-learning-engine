/**
 * Seeds hand-written demo study packs straight into the database.
 *
 * This is the "pre-generated demo pack" step from the implementation plan: it
 * produces exactly what the pipeline would produce, but without a single Claude
 * call, so the app can be demonstrated end to end with no API key and no wait.
 *
 *   npm run seed -w @zpl/server
 *
 * Re-running replaces the demo packs and leaves user-created packs alone.
 */
import { readFileSync } from "node:fs";
import { DEMO_PACKS, type DemoPack } from "./demo-packs";

loadEnv(".env.local");

// Imported dynamically so loadEnv runs first — these modules read the
// environment as soon as they are evaluated.
type SupabaseLib = typeof import("../src/lib/supabase");
let db: SupabaseLib["db"];
let uploadToBucket: SupabaseLib["uploadToBucket"];
let renderMeme: typeof import("../src/lib/meme-render")["renderMeme"];
let chunkText: typeof import("../src/lib/embeddings")["chunkText"];

/** Minimal .env reader — the script runs outside Next, which would load it. */
function loadEnv(path: string): void {
  let contents: string;
  try {
    contents = readFileSync(new URL(path, new URL("../", import.meta.url)), "utf8");
  } catch {
    console.error(`Could not read apps/server/${path}. Copy .env.example to it first.`);
    process.exit(1);
  }

  for (const line of contents.split("\n")) {
    const match = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;
    const value = match[2].trim().replace(/^["']|["']$/g, "");
    if (value && !process.env[match[1]]) process.env[match[1]] = value;
  }
}

async function seed(pack: DemoPack): Promise<string> {
  const client = db();

  // Demo packs are identified by their source's external_url so a re-run can
  // replace them without touching anything a user created.
  const marker = `demo://${pack.slug}`;
  const existing = await client.from("sources").select("pack_id").eq("external_url", marker);
  for (const row of existing.data ?? []) {
    if (row.pack_id) await client.from("study_packs").delete().eq("id", row.pack_id);
  }

  const { data: created, error } = await client
    .from("study_packs")
    .insert({ title: pack.title, subject: pack.subject, status: "ready", is_public: true })
    .select("id")
    .single();
  if (error || !created) throw new Error(`study_packs insert failed: ${error?.message}`);
  const packId = created.id as string;

  await client.from("sources").insert({
    pack_id: packId,
    kind: "text",
    external_url: marker,
    raw_text: pack.sourceText,
    char_count: pack.sourceText.length,
  });

  /* Content blocks — identical shape to what the job runner writes. */
  let position = 0;
  const block = (fields: {
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

  const blocks = [
    ...pack.definitions.map((d) => block({ kind: "definition", heading: d.term, body: d.definition })),
    ...pack.formulas.map((f) =>
      block({ kind: "formula", heading: f.name, body: `${f.expression}\n\n${f.explanation}` }),
    ),
    ...pack.topics.map((t) =>
      block({
        kind: "topic",
        heading: t.topic,
        body:
          t.subtopics.length > 0
            ? `${t.explanation}\n\nSubtopics: ${t.subtopics.join(", ")}`
            : t.explanation,
        topic: t.topic,
        importance: t.importance,
      }),
    ),
    ...chunkText(pack.sourceText).map((chunk) =>
      block({ kind: "chunk", heading: null, body: chunk }),
    ),
  ];
  await insert("content_blocks", blocks);

  await insert("summaries", [
    {
      pack_id: packId,
      executive_overview: pack.summary.executive_overview,
      bullet_breakdown: pack.summary.bullet_breakdown,
    },
  ]);

  await insert("mindmaps", [
    { pack_id: packId, nodes: pack.mindmap.nodes, edges: pack.mindmap.edges },
  ]);

  await insert(
    "flashcards",
    pack.flashcards.map((card, index) => ({ pack_id: packId, ...card, position: index })),
  );

  await insert(
    "mcqs",
    pack.mcqs.map((mcq, index) => ({ pack_id: packId, ...mcq, position: index })),
  );

  await insert(
    "resources",
    pack.resources.map((resource) => ({ pack_id: packId, ...resource, thumbnail: null })),
  );

  /* Memes are composited for real, exercising the same path as generation. */
  const memeRows = [];
  for (const [index, meme] of pack.memes.entries()) {
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
      console.warn(`  meme "${meme.template}" could not be composited:`, error);
    }
    memeRows.push({
      pack_id: packId,
      template: meme.template,
      captions: meme.captions,
      image_url: imageUrl,
      topic: meme.topic,
    });
  }
  await insert("memes", memeRows);

  await insert("community_packs", [
    {
      pack_id: packId,
      author_name: pack.community.author,
      description: pack.community.description,
      tags: pack.community.tags,
      upvote_count: 0,
      clone_count: 0,
    },
  ]);

  return packId;
}

async function insert(table: string, rows: Record<string, unknown>[]): Promise<void> {
  if (rows.length === 0) return;
  const { error } = await db().from(table).insert(rows);
  if (error) throw new Error(`${table} insert failed: ${error.message}`);
}

async function main(): Promise<void> {
  ({ db, uploadToBucket } = await import("../src/lib/supabase"));
  ({ renderMeme } = await import("../src/lib/meme-render"));
  ({ chunkText } = await import("../src/lib/embeddings"));

  console.log(`Seeding ${DEMO_PACKS.length} demo study packs…\n`);

  for (const pack of DEMO_PACKS) {
    const packId = await seed(pack);
    console.log(
      `  ${pack.title}\n` +
        `    ${packId}\n` +
        `    ${pack.flashcards.length} flashcards · ${pack.mcqs.length} MCQs · ` +
        `${pack.memes.length} memes · ${pack.resources.length} resources\n`,
    );
  }

  console.log("Done. The packs are on the landing page and in Community.");
}

main().catch((error) => {
  console.error("\nSeeding failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
