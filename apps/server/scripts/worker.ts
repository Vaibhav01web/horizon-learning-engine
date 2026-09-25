/**
 * Local background worker.
 *
 * Drains the PostgreSQL jobs queue by polling the API's /api/jobs/run
 * endpoint. In production the same endpoint is driven by a Vercel cron or any
 * external scheduler, so there is only ever one code path for job execution.
 *
 *   npm run worker -w @zpl/server
 */

const API_URL = process.env.WORKER_API_URL ?? "http://localhost:4000";
const SECRET = process.env.WORKER_SECRET;
const IDLE_MS = Number(process.env.WORKER_POLL_MS ?? 3000);

let stopping = false;

async function tick(): Promise<number> {
  const response = await fetch(`${API_URL}/api/jobs/run`, {
    method: "POST",
    headers: SECRET ? { Authorization: `Bearer ${SECRET}` } : {},
  });

  if (!response.ok) {
    throw new Error(`Worker tick failed (${response.status}): ${await response.text()}`);
  }

  const { processed } = (await response.json()) as { processed: number };
  return processed;
}

async function main(): Promise<void> {
  console.log(`[worker] polling ${API_URL}/api/jobs/run every ${IDLE_MS}ms`);

  while (!stopping) {
    try {
      const processed = await tick();
      if (processed > 0) {
        console.log(`[worker] completed ${processed} job(s)`);
        // Jobs often arrive in bursts — go straight back for the next one.
        continue;
      }
    } catch (error) {
      console.error("[worker]", error instanceof Error ? error.message : error);
    }
    await new Promise((resolve) => setTimeout(resolve, IDLE_MS));
  }
}

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    console.log("\n[worker] shutting down");
    stopping = true;
    process.exit(0);
  });
}

void main();
