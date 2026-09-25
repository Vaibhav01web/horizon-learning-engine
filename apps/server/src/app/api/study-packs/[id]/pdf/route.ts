import { ok, route } from "@/lib/http";
import { loadBundle } from "@/lib/bundle";
import { buildDoubtBusterPdf } from "@/lib/pdf-export";
import { db } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

type Params = { params: Promise<{ id: string }> };

/** Returns the cached PDF unless ?refresh=1 forces a rebuild. */
export const POST = route(async (request: Request, { params }: Params) => {
  const { id } = await params;
  const refresh = new URL(request.url).searchParams.get("refresh") === "1";

  const bundle = await loadBundle(id);
  if (bundle.pdfUrl && !refresh) return ok({ url: bundle.pdfUrl, cached: true });

  const url = await buildDoubtBusterPdf(bundle);
  await db().from("study_packs").update({ pdf_url: url }).eq("id", id);

  return ok({ url, cached: false });
});
