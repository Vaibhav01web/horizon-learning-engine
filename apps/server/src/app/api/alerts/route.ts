import { alertOptInSchema } from "@zpl/shared-types";
import { clientKey, ok, parseBody, route } from "@/lib/http";
import { db, unwrap } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/** Opt in or out of WhatsApp revision reminders. */
export const POST = route(async (request) => {
  const body = await parseBody(request, alertOptInSchema);
  const ownerKey = body.userId ?? clientKey(request);

  const record = unwrap(
    await db()
      .from("revision_alerts")
      .upsert(
        {
          owner_key: ownerKey,
          user_id: body.userId ?? null,
          phone_number: body.phoneNumber,
          whatsapp_opt_in: body.optIn,
          next_alert_at: body.optIn ? new Date().toISOString() : null,
        },
        { onConflict: "owner_key" },
      )
      .select("owner_key, whatsapp_opt_in, next_alert_at")
      .single(),
  );

  return ok({ alert: record });
});

export const GET = route(async (request) => {
  const ownerKey =
    new URL(request.url).searchParams.get("userId") ?? clientKey(request);

  const { data } = await db()
    .from("revision_alerts")
    .select("phone_number, whatsapp_opt_in, last_alert_sent, next_alert_at")
    .eq("owner_key", ownerKey)
    .maybeSingle();

  return ok({ alert: data });
});
