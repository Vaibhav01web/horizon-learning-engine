import { communityCommentSchema } from "@zpl/shared-types";
import { ok, parseBody, route } from "@/lib/http";
import { db, unwrap } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export const GET = route(async (_request: Request, { params }: Params) => {
  const { id } = await params;
  const comments = unwrap(
    await db()
      .from("comments")
      .select("id, author, body, created_at")
      .eq("community_id", id)
      .order("created_at", { ascending: false })
      .limit(100),
  );
  return ok({ comments });
});

export const POST = route(async (request: Request, { params }: Params) => {
  const { id } = await params;
  const body = await parseBody(request, communityCommentSchema.omit({ packId: true }));

  const comment = unwrap(
    await db()
      .from("comments")
      .insert({ community_id: id, author: body.author, body: body.body })
      .select("id, author, body, created_at")
      .single(),
  );

  return ok({ comment }, 201);
});
