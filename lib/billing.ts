// Workspace billing (migration 012): per-workspace tiers, quota checks,
// and the atomic run consumer. Billing is DRAFT: no payment is taken,
// prices are Gemini's proposal, not set by Kartikey (see the conflict
// note on INR below). Every read here is best-effort: a workspace with
// no workspace_billing row, or a database without migration 012, is
// treated as Free tier with quota available, so existing workspaces
// (including Verity Office and all test workspaces) keep working
// exactly as today.
//
// A "verified run" is counted ONLY when a real (non-demo) execution
// completes. Failed runs never consume quota, and dedup cache hits
// (0 new tokens, 0 new cost) do not consume quota either: the worker
// calls consumeVerifiedRun only on the real-success path.

import type { SupabaseClient } from "@supabase/supabase-js";

export type PlanTier = "free" | "pro" | "team";

export type BillingRow = {
  workspace_id: string;
  owner_user_id: string;
  mor_customer_id: string | null;
  mor_subscription_id: string | null;
  mor_variant_id: string | null;
  tier: PlanTier;
  status: string;
  monthly_run_limit: number;
  max_members: number;
  runs_used_this_cycle: number;
  extra_runs_balance: number;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
};

// ── Tier definitions (Gemini billing design, 2026-11-22) ──────────────────
// DRAFT PROPOSAL, not set prices. INR conflict, recorded honestly:
// lib/pricing.ts deliberately records INR pricing as UNDECIDED with no
// rupee figure, and says do not quote rupees until Kartikey decides
// with a real, dated rate. The rupee figures below are Gemini's
// proposal only; the public pricing page labels every price DRAFT and
// states billing is not live. Do not present these as set prices to a
// customer, and do not change lib/pricing.ts until Kartikey decides.
export const PLAN_LIMITS: Record<
  PlanTier,
  { monthlyRuns: number; maxMembers: number; workspaces: number }
> = {
  free: { monthlyRuns: 100, maxMembers: 1, workspaces: 1 },
  pro: { monthlyRuns: 2500, maxMembers: 3, workspaces: 1 },
  team: { monthlyRuns: 10000, maxMembers: 10, workspaces: 3 },
};

export const PLAN_PRICES: Record<
  PlanTier,
  { usdPerMonth: number | null; inrPerMonth: number | null; yearlyUsdPerMonth: number | null; yearlyInrPerMonth: number | null }
> = {
  free: { usdPerMonth: 0, inrPerMonth: 0, yearlyUsdPerMonth: 0, yearlyInrPerMonth: 0 },
  pro: { usdPerMonth: 19, inrPerMonth: 999, yearlyUsdPerMonth: 15, yearlyInrPerMonth: 799 },
  team: { usdPerMonth: 49, inrPerMonth: 2999, yearlyUsdPerMonth: 39, yearlyInrPerMonth: 2399 },
};

export const TOPUP_PRICE = {
  usdPer1000Runs: 5,
  inrPer1000Runs: 299,
};

export const FREE_TIER: BillingRow = {
  workspace_id: "",
  owner_user_id: "",
  mor_customer_id: null,
  mor_subscription_id: null,
  mor_variant_id: null,
  tier: "free",
  status: "free",
  monthly_run_limit: PLAN_LIMITS.free.monthlyRuns,
  max_members: PLAN_LIMITS.free.maxMembers,
  runs_used_this_cycle: 0,
  extra_runs_balance: 0,
  current_period_start: "",
  current_period_end: "",
  cancel_at_period_end: false,
};

// Best-effort billing read. Returns null when there is no billing row
// or the table does not exist yet (migration 012 not run live).
// Callers treat null as FREE_TIER: quota available, no cap enforced.
export async function getWorkspaceBilling(
  supabase: SupabaseClient,
  workspaceId: string
): Promise<BillingRow | null> {
  try {
    const { data, error } = await supabase
      .from("workspace_billing")
      .select(
        "workspace_id, owner_user_id, mor_customer_id, mor_subscription_id, mor_variant_id, tier, status, monthly_run_limit, max_members, runs_used_this_cycle, extra_runs_balance, current_period_start, current_period_end, cancel_at_period_end"
      )
      .eq("workspace_id", workspaceId)
      .single();
    if (error || !data) return null;
    return data as BillingRow;
  } catch {
    return null;
  }
}

// Runs remaining in this cycle, counting top-up balance. Null billing
// row means no cap (unlimited until a row exists).
export function runsRemaining(billing: BillingRow | null): number | null {
  if (!billing) return null;
  const withinLimit = Math.max(
    0,
    billing.monthly_run_limit - billing.runs_used_this_cycle
  );
  return withinLimit + Math.max(0, billing.extra_runs_balance);
}

// Pre-run quota check, called by the worker BEFORE any provider call.
// Returns allowed=false only when a billing row exists and the
// workspace is out of runs (limit reached, no top-up balance). A
// missing row, a missing table, or a cancelled/expired subscription
// that has already been downgraded to free limits is handled by the
// same rule: the stored limits are what is checked. Demo runs never
// reach this check (the worker skips quota for demos).
export async function checkRunQuota(
  serviceClient: SupabaseClient,
  workspaceId: string
): Promise<{ allowed: boolean; reason: string | null; billing: BillingRow | null }> {
  const billing = await getWorkspaceBilling(serviceClient, workspaceId);
  if (!billing) return { allowed: true, reason: null, billing: null };
  const remaining = runsRemaining(billing);
  if (remaining !== null && remaining <= 0) {
    return {
      allowed: false,
      reason:
        `Run quota exceeded (402): this workspace has used ${billing.runs_used_this_cycle} of ${billing.monthly_run_limit} verified runs on the ${billing.tier} plan, with no top-up balance. ` +
        `Upgrade or buy a top-up to run again. No provider call was made.`,
      billing,
    };
  }
  return { allowed: true, reason: null, billing };
}

// Consume one verified run AFTER a real run completes. Returns true
// when a run was consumed, false when the workspace ran out of quota
// in the meantime (a race between the pre-check and this call: the
// run already completed, so the caller keeps the success and records
// the overage, it never fails the finished run). Returns true when no
// billing row exists (nothing to consume). Never throws: on any error
// it returns true so a billing-table problem can never break runs.
export async function consumeVerifiedRun(
  serviceClient: SupabaseClient,
  workspaceId: string
): Promise<boolean> {
  try {
    const { data, error } = await serviceClient.rpc("consume_verified_run", {
      p_workspace_id: workspaceId,
    });
    if (error) {
      // Missing function/table until migration 012 runs: quota is
      // not enforced yet, the run still counts as consumed.
      return true;
    }
    return data === true;
  } catch {
    return true;
  }
}

// Member-cap check for the invite path. Returns allowed=false only
// when a billing row exists and the workspace is already at
// max_members. A missing row means no cap (current behaviour).
export async function checkMemberCap(
  serviceClient: SupabaseClient,
  workspaceId: string,
  currentMemberCount: number
): Promise<{ allowed: boolean; reason: string | null }> {
  const billing = await getWorkspaceBilling(serviceClient, workspaceId);
  if (!billing) return { allowed: true, reason: null };
  if (currentMemberCount >= billing.max_members) {
    return {
      allowed: false,
      reason: `This workspace is at its member limit (${billing.max_members} on the ${billing.tier} plan). Upgrade to add more members.`,
    };
  }
  return { allowed: true, reason: null };
}
