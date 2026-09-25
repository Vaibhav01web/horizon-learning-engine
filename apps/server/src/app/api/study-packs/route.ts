import { ok, route } from "@/lib/http";
import { db, unwrap } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/** Recent packs, newest first. Powers the "my packs" strip on the landing page. */
export const GET = route(async (request) => {
  const limit = Math.min(Number(new URL(request.url).searchParams.get("limit") ?? 20), 50);

  const packs = unwrap(
    await db()
      .from("study_packs")
      .select("id, title, subject, status, is_public, created_at")
      .order("created_at", { ascending: false })
      .limit(limit),
  );

  return ok({ packs });
});
