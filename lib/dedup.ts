// Dedup before any provider call (Piece 2). Pure hash + best-effort
// DB reads/writes, no provider call, no secret.
//
// Two keys, checked in this order:
//   1. idempotency key — execution.input.idempotency_key when the
//      caller supplied one (e.g. an approval re-enqueue). Same key
//      means the same logical work, even if the prompt text differs.
//   2. input_hash — sha256 of the canonical provider-call inputs
//      (provider, model, static prefix, dynamic payload). Same hash
//      means the same call would be made.
// A hit is a SUCCEEDED, non-demo execution from the last 24 hours.
// A hit returns the cached output with is_cached = true and ZERO new
// cost: no provider call is made at all.
//
// Migration 011 columns (task_executions idempotency / input_hash /
// is_cached) are added by Piece 1 and have NOT run live yet. Every
// query and write here degrades gracefully: a missing-column error
// means "no cache available", the lookup returns a miss and the run
// proceeds normally. Dedup never fails a run.
import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isMissingColumnError } from "./handoff";

export const DEDUP_WINDOW_MS = 24 * 60 * 60 * 1000;

export type CachedRun = {
  output: string;
  provider: string | null;
  model: string | null;
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
};

export type DedupLookup =
  | { hit: CachedRun; degraded: false }
  | { hit: null; degraded: boolean };

export function computeInputHash(args: {
  provider: string;
  model: string;
  systemPrompt: string;
  userPrompt: string;
}): string {
  const canonical = JSON.stringify({
    provider: args.provider,
    model: args.model,
    systemPrompt: args.systemPrompt,
    userPrompt: args.userPrompt,
  });
  return createHash("sha256").update(canonical, "utf8").digest("hex");
}

function toCachedRun(row: Record<string, unknown>): CachedRun | null {
  if (typeof row.output !== "string" || !row.output) return null;
  return {
    output: row.output,
    provider: typeof row.provider === "string" ? row.provider : null,
    model: typeof row.model === "string" ? row.model : null,
    promptTokens: typeof row.prompt_tokens === "number" ? row.prompt_tokens : null,
    completionTokens:
      typeof row.completion_tokens === "number" ? row.completion_tokens : null,
    totalTokens: typeof row.total_tokens === "number" ? row.total_tokens : null,
  };
}

export async function lookupCachedExecution(
  supabase: SupabaseClient,
  args: { inputHash: string; idempotencyKey?: string | null; workspaceId: string }
): Promise<DedupLookup> {
  const since = new Date(Date.now() - DEDUP_WINDOW_MS).toISOString();
  // Idempotency key first: it is the caller's explicit "same work".
  if (args.idempotencyKey) {
    const { data, error } = await supabase
      .from("task_executions")
      .select("output, provider, model, prompt_tokens, completion_tokens, total_tokens")
      .eq("workspace_id", args.workspaceId)
      .eq("idempotency", args.idempotencyKey)
      .eq("status", "succeeded")
      .eq("is_demo", false)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) {
      if (isMissingColumnError(error)) return { hit: null, degraded: true };
      console.error("dedup idempotency lookup failed:", error.message);
      return { hit: null, degraded: false };
    }
    const hit = data ? toCachedRun(data as Record<string, unknown>) : null;
    if (hit) return { hit, degraded: false };
  }
  const { data, error } = await supabase
    .from("task_executions")
    .select("output, provider, model, prompt_tokens, completion_tokens, total_tokens")
    .eq("workspace_id", args.workspaceId)
    .eq("input_hash", args.inputHash)
    .eq("status", "succeeded")
    .eq("is_demo", false)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    if (isMissingColumnError(error)) return { hit: null, degraded: true };
    console.error("dedup input_hash lookup failed:", error.message);
    return { hit: null, degraded: false };
  }
  return { hit: data ? toCachedRun(data as Record<string, unknown>) : null, degraded: false };
}

// Best-effort: record the hash / idempotency key on the execution row
// so a later identical run can hit the cache. Returns false when the
// 011 columns are not live yet; the run itself is unaffected.
export async function storeExecutionDedup(
  supabase: SupabaseClient,
  executionId: string,
  args: { inputHash: string; idempotencyKey?: string | null; isCached: boolean }
): Promise<boolean> {
  const { error } = await supabase
    .from("task_executions")
    .update({
      input_hash: args.inputHash,
      idempotency: args.idempotencyKey ?? null,
      is_cached: args.isCached,
    })
    .eq("id", executionId);
  if (error) {
    if (isMissingColumnError(error)) return false;
    console.error("storeExecutionDedup failed:", error.message);
    return false;
  }
  return true;
}
