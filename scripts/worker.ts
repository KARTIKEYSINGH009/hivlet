// Standalone worker loop (self-hosted alternative to the cron-triggered
// /api/executions/run endpoint).
//
// Usage:
//   WORKER_SECRET=... APP_URL=http://localhost:3000 node scripts/worker.ts
//
// Polls the worker endpoint every WORKER_INTERVAL_MS (default 30s) and
// lets the endpoint do the claiming + running. This script holds no keys
// itself — it only carries the worker secret to an endpoint that already
// guards it. Stop with Ctrl+C.
//
// Written with erasable-only TypeScript (interfaces + annotations, no
// enums/namespaces) so Node 22.6+/24 can run it directly with type
// stripping — no tsx or build step required.

interface WorkerConfig {
  appUrl: string;
  workerSecret: string;
  intervalMs: number;
  limit: number;
}

function loadConfig(): WorkerConfig {
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const workerSecret = process.env.WORKER_SECRET;
  if (!workerSecret) {
    throw new Error("WORKER_SECRET is unset. See .env.example.");
  }
  return {
    appUrl: appUrl.replace(/\/$/, ""),
    workerSecret,
    intervalMs: Number(process.env.WORKER_INTERVAL_MS ?? 30_000),
    limit: Number(process.env.WORKER_BATCH_LIMIT ?? 5),
  };
}

async function tick(config: WorkerConfig): Promise<void> {
  try {
    const res = await fetch(`${config.appUrl}/api/executions/run`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-worker-secret": config.workerSecret,
      },
      body: JSON.stringify({ limit: config.limit }),
    });
    const body = (await res.json()) as {
      processed?: number;
      succeeded?: number;
      failed?: number;
      error?: string;
    };
    if (!res.ok) {
      console.error(`[worker] endpoint error ${res.status}: ${body.error ?? "unknown"}`);
      return;
    }
    if ((body.processed ?? 0) > 0) {
      console.log(
        `[worker] processed=${body.processed} succeeded=${body.succeeded ?? 0} failed=${body.failed ?? 0}`
      );
    }
  } catch (err) {
    console.error("[worker] tick failed:", err instanceof Error ? err.message : String(err));
  }
}

async function main(): Promise<void> {
  const config = loadConfig();
  console.log(
    `[worker] polling ${config.appUrl}/api/executions/run every ${config.intervalMs}ms (batch ${config.limit})`
  );
  await tick(config);
  setInterval(() => {
    void tick(config);
  }, config.intervalMs);
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
