import twilio from "twilio";
import { env } from "./env";
import { db, unwrap } from "./supabase";

export interface AlertTarget {
  owner_key: string;
  phone_number: string;
  weakest_topic: string;
  accuracy: number;
  pack_id: string;
}

/**
 * Sends a WhatsApp revision nudge. Uses the Twilio sandbox for the demo, so
 * the recipient must have joined the sandbox from their own device first.
 */
export async function sendRevisionAlert(target: AlertTarget): Promise<void> {
  const config = env.twilio;
  if (!config) throw new Error("Twilio is not configured (TWILIO_SID / TWILIO_AUTH_TOKEN / TWILIO_WHATSAPP_NUMBER)");

  const practiceUrl = new URL(`/study/${target.pack_id}`, env.appUrl);
  practiceUrl.searchParams.set("tab", "flashcards");
  practiceUrl.searchParams.set("topic", target.weakest_topic);

  const body = [
    "📚 Revision time!",
    "",
    "You're currently weak on:",
    `${target.weakest_topic} (${Math.round(target.accuracy * 100)}% accuracy)`,
    "",
    "Practice now:",
    practiceUrl.toString(),
  ].join("\n");

  const client = twilio(config.sid, config.authToken);
  await client.messages.create({
    from: `whatsapp:${config.from.replace(/^whatsapp:/, "")}`,
    to: `whatsapp:${target.phone_number}`,
    body,
  });

  await db()
    .from("revision_alerts")
    .update({ last_alert_sent: new Date().toISOString(), next_alert_at: inDays(2) })
    .eq("owner_key", target.owner_key);
}

/**
 * Finds everyone opted in whose next alert is due and who has a weak topic
 * worth nudging about. Drives the scheduled alert job.
 */
export async function findDueAlerts(): Promise<AlertTarget[]> {
  const nowIso = new Date().toISOString();

  const subscribers = unwrap(
    await db()
      .from("revision_alerts")
      .select("owner_key, phone_number, next_alert_at")
      .eq("whatsapp_opt_in", true)
      .or(`next_alert_at.is.null,next_alert_at.lte.${nowIso}`),
  ) as { owner_key: string; phone_number: string }[];

  const targets: AlertTarget[] = [];
  for (const subscriber of subscribers) {
    const { data } = await db()
      .from("user_weak_points")
      .select("topic, accuracy, pack_id")
      .eq("owner_key", subscriber.owner_key)
      .lt("accuracy", 0.7)
      .order("accuracy", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!data) continue;
    targets.push({
      owner_key: subscriber.owner_key,
      phone_number: subscriber.phone_number,
      weakest_topic: data.topic,
      accuracy: data.accuracy,
      pack_id: data.pack_id,
    });
  }

  return targets;
}

function inDays(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}
