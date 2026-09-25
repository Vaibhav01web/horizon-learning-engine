import { HttpError, ok, route } from "@/lib/http";
import { db, unwrap } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/**
 * Clones a published pack into a new pack owned by the cloner.
 *
 * Generated assets are copied outright — regenerating them would cost another
 * full run of Claude calls for material that has already been processed.
 */
export const POST = route(async (_request: Request, { params }: Params) => {
  const { id } = await params;
  const client = db();

  const { data: community } = await client
    .from("community_packs")
    .select("id, pack_id, clone_count")
    .eq("id", id)
    .maybeSingle();
  if (!community) throw new HttpError("Community pack not found", 404);

  const source = unwrap(
    await client
      .from("study_packs")
      .select("title, subject, pdf_url")
      .eq("id", community.pack_id)
      .single(),
  ) as { title: string; subject: string | null; pdf_url: string | null };

  const clone = unwrap(
    await client
      .from("study_packs")
      .insert({
        title: source.title,
        subject: source.subject,
        status: "ready",
        is_public: false,
        cloned_from: community.pack_id,
        // The PDF embeds the original pack's chat links, so the clone rebuilds its own.
        pdf_url: null,
      })
      .select("id")
      .single(),
  ) as { id: string };

  await copyRows(client, "summaries", community.pack_id, clone.id);
  await copyRows(client, "mindmaps", community.pack_id, clone.id);
  await copyRows(client, "content_blocks", community.pack_id, clone.id);
  await copyRows(client, "flashcards", community.pack_id, clone.id);
  await copyRows(client, "mcqs", community.pack_id, clone.id);
  await copyRows(client, "memes", community.pack_id, clone.id);
  await copyRows(client, "resources", community.pack_id, clone.id);

  await client
    .from("community_packs")
    .update({ clone_count: community.clone_count + 1 })
    .eq("id", id);

  return ok({ packId: clone.id }, 201);
});

/**
 * Copies every row of a child table onto the new pack, dropping identity and
 * timestamp columns so the database regenerates them.
 */
async function copyRows(
  client: ReturnType<typeof db>,
  table: string,
  fromPackId: string,
  toPackId: string,
): Promise<void> {
  const rows = unwrap(await client.from(table).select("*").eq("pack_id", fromPackId)) as Record<
    string,
    unknown
  >[];
  if (rows.length === 0) return;

  const copies = rows.map((row) => {
    const { id, created_at, pack_id, block_id, embedding, ...rest } = row;
    // block_id and embedding reference the source pack's rows; leave them unset.
    return { ...rest, pack_id: toPackId };
  });

  const { error } = await client.from(table).insert(copies);
  if (error) throw new HttpError(`Failed to clone ${table}: ${error.message}`, 500);
}
