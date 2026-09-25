import { HttpError, ok, route } from "@/lib/http";
import { db } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/**
 * Polling fallback for the processing screen. The client prefers Supabase
 * Realtime on the jobs table and only falls back to this when the socket drops.
 */
export const GET = route(async (_request: Request, { params }: Params) => {
  const { id } = await params;

  const { data, error } = await db()
    .from("jobs")
    .select("id, pack_id, type, status, stage, progress, error, created_at, updated_at")
    .eq("pack_id", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new HttpError(error.message, 500);
  if (!data) throw new HttpError("No job found for this study pack", 404);

  return ok({ job: data });
});
