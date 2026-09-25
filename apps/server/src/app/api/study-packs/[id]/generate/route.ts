import { HttpError, ok, route } from "@/lib/http";
import { db, unwrap } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/**
 * Re-queues generation for a pack, clearing previously generated assets so a
 * retry cannot leave a half-old, half-new suite behind.
 */
export const POST = route(async (_request: Request, { params }: Params) => {
  const { id } = await params;
  const client = db();

  const source = unwrap(
    await client.from("sources").select("id").eq("pack_id", id).order("created_at").limit(1).single(),
  ) as { id: string };

  const active = await client
    .from("jobs")
    .select("id")
    .eq("pack_id", id)
    .in("status", ["pending", "processing"])
    .maybeSingle();
  if (active.data) throw new HttpError("This pack is already being generated", 409);

  for (const table of ["summaries", "mindmaps", "flashcards", "mcqs", "memes", "resources", "content_blocks"]) {
    await client.from(table).delete().eq("pack_id", id);
  }
  await client.from("study_packs").update({ status: "processing" }).eq("id", id);

  const job = unwrap(
    await client
      .from("jobs")
      .insert({
        pack_id: id,
        type: "generate_suite",
        status: "pending",
        stage: "extracting",
        payload: { sourceId: source.id },
      })
      .select("id")
      .single(),
  ) as { id: string };

  return ok({ jobId: job.id }, 202);
});
