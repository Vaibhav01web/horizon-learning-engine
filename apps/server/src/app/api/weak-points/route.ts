import { clientKey, ok, route } from "@/lib/http";
import { db, unwrap } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export const GET = route(async (request) => {
  const url = new URL(request.url);
  const ownerKey = url.searchParams.get("userId") ?? clientKey(request);
  const packId = url.searchParams.get("packId");

  let query = db()
    .from("user_weak_points")
    .select("topic, accuracy, total, pack_id")
    .eq("owner_key", ownerKey)
    .order("accuracy", { ascending: true });

  if (packId) query = query.eq("pack_id", packId);

  return ok({ weakPoints: unwrap(await query) });
});
