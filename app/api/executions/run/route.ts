// Worker endpoint: POST /api/executions/run
//
// This is the execution engine's worker entry point for hosted deploys.
// Trigger it from a scheduler (Vercel Cron, Supabase pg_cron, or any
// cron hitting this URL) — each invocation claims and runs up to `limit`
// queued executions, one at a time, via the claim-based queue in
// task_executions. A second concurrent invocation gets different rows
// (FOR UPDATE SKIP LOCKED) or an empty queue, never the same row.
//
// Auth: header `x-worker-secret` must equal the server-only WORKER_SECRET
// env var. If WORKER_SECRET is unset, the endpoint refuses everything
// (fail closed) — an unguarded worker endpoint would let anyone burn
// provider keys. The service-role key is server-only and never exposed.
//
// Body: { "limit": number } (optional, default 5, max 10).
// Response: { processed, succeeded, failed, results: [...] }.

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { processNextExecution } from "@/lib/execution";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: Request) {
  const workerSecret = process.env.WORKER_SECRET;
  if (!workerSecret) {
    return NextResponse.json(
      { error: "Worker not configured: WORKER_SECRET is unset." },
      { status: 503 }
    );
  }
  if (req.headers.get("x-worker-secret") !== workerSecret) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const url =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json(
      {
        error:
          "Worker not configured: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are unset.",
      },
      { status: 503 }
    );
  }

  let limit = 5;
  try {
    const body = (await req.json()) as { limit?: number };
    if (typeof body.limit === "number") {
      limit = Math.max(1, Math.min(10, Math.floor(body.limit)));
    }
  } catch {
    // Empty body: default limit applies.
  }

  const serviceClient = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const workerId = `api-worker-${Date.now()}`;

  const results: { executionId: string; status: string }[] = [];
  let succeeded = 0;
  let failed = 0;
  for (let i = 0; i < limit; i++) {
    const outcome = await processNextExecution(serviceClient, workerId);
    if (!outcome.claimed) break;
    results.push({
      executionId: outcome.executionId,
      status: outcome.status,
    });
    if (outcome.status === "succeeded") succeeded++;
    else failed++;
  }

  return NextResponse.json({
    processed: results.length,
    succeeded,
    failed,
    results,
  });
}
