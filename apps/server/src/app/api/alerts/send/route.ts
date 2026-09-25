import { env } from "@/lib/env";
import { HttpError, ok, route } from "@/lib/http";
import { findDueAlerts, sendRevisionAlert } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * Sends every due revision alert. Intended for a scheduled trigger; shares
 * WORKER_SECRET with the job runner.
 */
async function sendDueAlerts(request: Request) {
  const secret = env.workerSecret;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    throw new HttpError("Unauthorized", 401);
  }
  if (!env.twilio) throw new HttpError("Twilio is not configured", 503);

  const targets = await findDueAlerts();
  const results = await Promise.allSettled(targets.map(sendRevisionAlert));

  const sent = results.filter((result) => result.status === "fulfilled").length;
  const failures = results
    .filter((result): result is PromiseRejectedResult => result.status === "rejected")
    .map((result) => String(result.reason));

  return ok({ due: targets.length, sent, failures });
}

export const POST = route(sendDueAlerts);

// Vercel cron and most external schedulers issue GET.
export const GET = route(sendDueAlerts);
