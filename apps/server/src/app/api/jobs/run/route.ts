import { env } from "@/lib/env";
import { HttpError, ok, route } from "@/lib/http";
import { runNextJob } from "@/lib/jobs/runner";

export const dynamic = "force-dynamic";
// Generating a full suite is many sequential Claude calls.
export const maxDuration = 800;

/**
 * Drains the job queue. Called by the local worker loop, by a Vercel cron,
 * or manually. Protect it with WORKER_SECRET in any deployed environment.
 */
export const POST = route(async (request) => {
  assertAuthorized(request);

  let processed = 0;
  // Bounded so one invocation cannot run past the platform's time limit.
  while (processed < 3 && (await runNextJob())) processed += 1;

  return ok({ processed });
});

export const GET = route(async (request) => {
  assertAuthorized(request);
  return ok({ processed: (await runNextJob()) ? 1 : 0 });
});

function assertAuthorized(request: Request): void {
  const secret = env.workerSecret;
  if (!secret) return;

  const header = request.headers.get("authorization");
  if (header !== `Bearer ${secret}`) {
    throw new HttpError("Unauthorized", 401);
  }
}
