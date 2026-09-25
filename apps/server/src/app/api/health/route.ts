import { ok, route } from "@/lib/http";
import { db } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export const GET = route(async () => {
  const checks: Record<string, boolean> = {
    anthropic: Boolean(process.env.ANTHROPIC_API_KEY),
    supabase: Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY),
    embeddings: Boolean(process.env.VOYAGE_API_KEY),
    resourceSearch: Boolean(process.env.TAVILY_API_KEY || process.env.SERPER_API_KEY),
    whatsapp: Boolean(process.env.TWILIO_SID && process.env.TWILIO_AUTH_TOKEN),
  };

  let database = false;
  if (checks.supabase) {
    const { error } = await db().from("study_packs").select("id").limit(1);
    database = !error;
  }

  return ok({ status: database ? "ok" : "degraded", checks: { ...checks, database } });
});
