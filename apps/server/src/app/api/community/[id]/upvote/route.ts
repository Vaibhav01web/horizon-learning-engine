import { clientKey, HttpError, ok, route } from "@/lib/http";
import { db, unwrap } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/** Toggling: a second call from the same voter removes the upvote. */
export const POST = route(async (request: Request, { params }: Params) => {
  const { id } = await params;
  const voterKey = clientKey(request);
  const client = db();

  const { data: existing } = await client
    .from("upvotes")
    .select("id")
    .eq("community_id", id)
    .eq("voter_key", voterKey)
    .maybeSingle();

  if (existing) {
    await client.from("upvotes").delete().eq("id", existing.id);
  } else {
    const { error } = await client
      .from("upvotes")
      .insert({ community_id: id, voter_key: voterKey });
    if (error) throw new HttpError(error.message, 500);
  }

  const { count } = await client
    .from("upvotes")
    .select("id", { count: "exact", head: true })
    .eq("community_id", id);

  const upvoteCount = count ?? 0;
  await client.from("community_packs").update({ upvote_count: upvoteCount }).eq("id", id);

  return ok({ upvoted: !existing, upvoteCount });
});
