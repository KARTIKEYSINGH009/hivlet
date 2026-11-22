-- Workspace billing (migration 012) — LOCAL FILE ONLY, NOT YET APPLIED LIVE.
-- Do NOT run this live until Kartikey says so in the Supabase SQL editor.
-- Additive only: no table or column is dropped, no data is deleted, no
-- existing constraint is changed. Every statement is guarded (IF NOT
-- EXISTS / DO blocks) so the file is safe to re-run; a second run is a
-- no-op.
--
-- Source: Gemini billing design delivered 2026-11-22 ("Hivlet AI Agent
-- SaaS Billing Design"). Billing is PER WORKSPACE, not per seat. Tiers:
--   Free: 100 verified runs/month, 1 workspace, leader only.
--   Pro:  $19/mo or Rs 999/mo, 2,500 runs, up to 3 members.
--   Team: $49/mo or Rs 2,999/mo, 10,000 runs, up to 10 members,
--         3 workspaces.
-- Top-ups: $5 / Rs 299 per 1,000 extra runs. Merchant of record:
-- Lemon Squeezy first. These prices are a DRAFT PROPOSAL from Gemini,
-- not set by Kartikey: the public pricing page labels them DRAFT and
-- no payment is taken until he confirms them. NOTE the conflict with
-- lib/pricing.ts, which deliberately records INR pricing as UNDECIDED
-- with no rupee figure; that file is left untouched until Kartikey
-- decides INR pricing with a real, dated rate.
--
-- A "verified run" is counted ONLY when a real (non-demo) execution
-- completes; failed Groq calls never consume quota, and dedup cache
-- hits (0 new tokens, 0 new cost) do not consume quota either. The
-- counting lives in code (lib/billing.ts + lib/execution.ts), not in
-- this migration: the RPC below is the atomic increment, and the
-- worker calls it only after a successful run.
--
-- Workspaces with NO workspace_billing row keep working exactly as
-- today: the code treats a missing row as Free tier with quota
-- available, and the RPC returns true when no row exists. Creating a
-- row is therefore never a prerequisite for running Hivlet.
--
-- ── What this file adds ──────────────────────────────────────────────────
--   workspace_billing:
--     One row per workspace, owned by the workspace leader. Holds the
--     merchant-of-record identifiers, the tier + status, the run/member
--     limits, the atomic run counter for the current cycle, and the
--     billing period anchors.
--   billing_webhook_events:
--     Idempotency log for Lemon Squeezy webhooks: one row per event id,
--     so a retried webhook can never credit a workspace twice.
--   consume_verified_run(p_workspace_id):
--     SECURITY DEFINER RPC. Atomically consumes one verified run: if
--     runs_used_this_cycle is below monthly_run_limit it increments;
--     otherwise it spends one from extra_runs_balance (top-ups).
--     Returns true when a run was consumed, false when the workspace
--     is out of quota. Returns true when no billing row exists (see
--     above). Never throws on a missing row.
--
-- ── RLS ──────────────────────────────────────────────────────────────────
-- workspace_billing: SELECT for workspace members (leaders and members
-- see the remaining runs); INSERT/UPDATE/DELETE have NO policy for the
-- authenticated role, so only the service-role key (webhook handler,
-- worker) can write. billing_webhook_events: no policy for the
-- authenticated role at all; service role only.

-- ── Enums (guarded: CREATE TYPE has no IF NOT EXISTS) ────────────────────
do $$
begin
  if not exists (select 1 from pg_type where typname = 'plan_tier') then
    create type plan_tier as enum ('free', 'pro', 'team');
  end if;
  if not exists (select 1 from pg_type where typname = 'subscription_status') then
    create type subscription_status as enum ('free', 'active', 'past_due', 'cancelled', 'paused');
  end if;
end $$;

-- ── workspace_billing ─────────────────────────────────────────────────────
create table if not exists workspace_billing (
  workspace_id uuid primary key references workspaces(id) on delete cascade,
  owner_user_id uuid not null references auth.users(id),

  -- Merchant-of-record (Lemon Squeezy) identifiers.
  mor_customer_id text,
  mor_subscription_id text unique,
  mor_variant_id text,

  -- Plan and limits.
  tier plan_tier not null default 'free',
  status subscription_status not null default 'free',
  monthly_run_limit integer not null default 100 check (monthly_run_limit >= 0),
  max_members integer not null default 1 check (max_members >= 1),

  -- Usage tracking (atomic counter, see consume_verified_run).
  runs_used_this_cycle integer not null default 0 check (runs_used_this_cycle >= 0),
  extra_runs_balance integer not null default 0 check (extra_runs_balance >= 0),

  -- Billing cycle anchors.
  current_period_start timestamptz not null default now(),
  current_period_end timestamptz not null default (now() + interval '30 days'),
  cancel_at_period_end boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table workspace_billing enable row level security;

drop policy if exists "members read billing" on workspace_billing;
create policy "members read billing" on workspace_billing for select
  using (public.is_workspace_member(workspace_id));
-- No insert/update/delete policy for the authenticated role: only the
-- service-role key writes this table (webhook handler, worker).

-- ── billing_webhook_events ────────────────────────────────────────────────
create table if not exists billing_webhook_events (
  event_id text primary key,
  event_name text not null,
  workspace_id uuid,
  processed_at timestamptz not null default now()
);

alter table billing_webhook_events enable row level security;
-- No policy for the authenticated role: service role only.

-- ── consume_verified_run ──────────────────────────────────────────────────
-- Atomically consume one verified run for a workspace. Returns true
-- when a run was consumed, false when the workspace is out of quota
-- (limit reached and no top-up balance). A workspace with no billing
-- row returns true: it keeps working as today, quota available.
-- Callers must only call this AFTER a real run completes; failed runs
-- and demo runs never call it (see lib/billing.ts).
create or replace function public.consume_verified_run(p_workspace_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_allowed boolean := false;
begin
  -- No billing row yet: treat as quota available, do not create a row.
  if not exists (select 1 from workspace_billing where workspace_id = p_workspace_id) then
    return true;
  end if;

  update workspace_billing
  set
    runs_used_this_cycle = case
      when runs_used_this_cycle < monthly_run_limit then runs_used_this_cycle + 1
      else runs_used_this_cycle
    end,
    extra_runs_balance = case
      when runs_used_this_cycle >= monthly_run_limit and extra_runs_balance > 0 then extra_runs_balance - 1
      else extra_runs_balance
    end,
    updated_at = now()
  where workspace_id = p_workspace_id
    and status in ('free', 'active', 'past_due')
    and (runs_used_this_cycle < monthly_run_limit or extra_runs_balance > 0)
  returning true into v_allowed;

  return coalesce(v_allowed, false);
end;
$$;

revoke all on function public.consume_verified_run(uuid) from public;
grant execute on function public.consume_verified_run(uuid) to authenticated, service_role;

-- NOTE: live application needs Kartikey's separate yes, in the Supabase
-- SQL editor. The app code that reads workspace_billing degrades
-- gracefully until this runs: a missing table is treated as "no billing
-- row", i.e. Free tier with quota available, and nothing breaks.
-- The member-cap check added to join_workspace_by_code in
-- supabase/policies.sql likewise needs policies.sql re-run live, and
-- only enforces a cap when a billing row exists.
