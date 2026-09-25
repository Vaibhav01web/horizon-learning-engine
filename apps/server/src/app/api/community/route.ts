import { communityPublishSchema } from "@zpl/shared-types";
import { HttpError, ok, parseBody, route } from "@/lib/http";
import { db, unwrap } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/** Browse the public pool, optionally filtered by a search term. */
export const GET = route(async (request) => {
  const url = new URL(request.url);
  const search = url.searchParams.get("q")?.trim();
  const sort = url.searchParams.get("sort") === "new" ? "published_at" : "upvote_count";

  let query = db()
    .from("community_packs")
    .select("*, study_packs!inner(id, title, subject, created_at)")
    .order(sort, { ascending: false })
    .limit(50);

  if (search) {
    // Filters on an embedded table must be scoped with referencedTable; a
    // top-level .or() cannot reach into study_packs. The !inner join above is
    // what makes this restrict the community rows themselves.
    query = query.or(`title.ilike.%${escapeLike(search)}%,subject.ilike.%${escapeLike(search)}%`, {
      referencedTable: "study_packs",
    });
  }

  return ok({ packs: unwrap(await query) });
});

/** PostgREST treats , . : () as syntax inside a filter value. */
function escapeLike(value: string): string {
  return value.replace(/[,.:()]/g, " ");
}

/** Publish a generated pack to the public pool. */
export const POST = route(async (request) => {
  const body = await parseBody(request, communityPublishSchema);
  const client = db();

  const { data: pack } = await client
    .from("study_packs")
    .select("id, status")
    .eq("id", body.packId)
    .maybeSingle();
  if (!pack) throw new HttpError("Study pack not found", 404);
  if (pack.status !== "ready") {
    throw new HttpError("Only a finished study pack can be published", 409);
  }

  const published = unwrap(
    await client
      .from("community_packs")
      .upsert(
        { pack_id: body.packId, description: body.description ?? null, tags: body.tags },
        { onConflict: "pack_id" },
      )
      .select("*")
      .single(),
  );

  await client.from("study_packs").update({ is_public: true }).eq("id", body.packId);

  return ok({ published }, 201);
});
