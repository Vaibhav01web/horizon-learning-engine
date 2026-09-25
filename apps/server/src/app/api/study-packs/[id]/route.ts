import { ok, route } from "@/lib/http";
import { loadBundle } from "@/lib/bundle";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export const GET = route(async (_request: Request, { params }: Params) => {
  const { id } = await params;
  return ok(await loadBundle(id));
});
