-- Cost tracking v2 (migration 011) — LOCAL FILE ONLY, NOT YET APPLIED LIVE.
-- Do NOT run this live until Kartikey says so in the Supabase SQL editor
-- himself. Run AFTER 010, in order. Additive only: no table or column is
-- dropped, no data is deleted, no existing constraint is changed.
-- Every statement is guarded (IF NOT EXISTS / DO blocks) so the file is
-- safe to re-run; a second run is a no-op.
--
-- ── What already existed and is REUSED, not re-added ─────────────────────
--   * task_executions.prompt_tokens / completion_tokens / total_tokens
--     and started_at: 003_execution.sql.
--   * task_executions.cached_tokens (count), provider, model and
--     estimated_cost_usd: 005_cost_tracking.sql. estimated_cost_usd is
--     the per-run estimated USD; the worker computes it in code from
--     token counts and the rates in lib/cost.ts.
--   * workspace_budgets (monthly_token_budget, monthly_cost_budget_usd,
--     hard_stop): 006_phase2_budgets.sql. That budget is MONTHLY and
--     lives in its own table. The daily_budget_usd added below is a
--     separate DAILY cap on the workspace row itself; it is not a
--     duplicate of the monthly budget, and lib/budgets.ts checkBudget
--     keeps working off workspace_budgets unchanged.
--   * Workspace creation: atomic RPC create_workspace_with_leader
--     already exists in 004_create_workspace.sql. This file does NOT
--     recreate it and does NOT add a create_workspace_atomic function.
--     Hivlet has NO public.profiles table; nothing here assumes one.
--
-- ── What this file adds ──────────────────────────────────────────────────
--   task_executions:
--     is_cached      boolean flag: true when any of the run's prompt
--                    tokens were served from provider cache. This is
--                    the flag; the token COUNT stays in cached_tokens
--                    (005). A null cached_tokens still means "unknown".
--     input_hash     sha256 hex of the canonicalised run input, set by
--                    the worker. Used for dedup lookups, never for
--                    billing.
--     idempotency_key client/worker-supplied key; a UNIQUE partial
--                    index (only where not null) means re-enqueueing
--                    the same key can never create a second run.
--   tasks:
--     handoff_packet jsonb, the 400-token handoff envelope passed
--                    between agents. Size is capped in worker code,
--                    NOT by a SQL length limit, so the envelope can
--                    evolve without another migration.
--     max_hops       default 3, the hop limit for agent-to-agent
--                    handoffs on this task.
--     retry_count    default 0, retries used by the current run.
--     started_at     when the task's current run started; used for
--                    stale-task recovery (distinct from
--                    task_executions.started_at in 003, which is
--                    per-run; this one is per-task).
--   workspaces:
--     daily_budget_usd default 2.00, the daily USD cap for the
--                    workspace. The worker sums estimated_cost_usd
--                    for today and blocks new runs at the cap; it is
--                    an estimate-based guard, not a charge or a
--                    billing record. Hivlet charges nothing here.
--
-- ── Verified Groq rates (for reference only; rates live in lib/cost.ts) ─
-- Verified official 2026-11-02 from https://console.groq.com/docs/models:
--   openai/gpt-oss-20b:  $0.075 input / $0.30 output per 1M tokens
--   openai/gpt-oss-120b: $0.15 input / $0.60 output per 1M tokens
--   qwen/qwen3.8-27b:    $0.80 input / $4.00 output per 1M tokens
--                        (PREVIEW model, evaluation only)
-- These are the ONLY models verified on Kartikey's Groq account.
-- llama-3.3-70b-versatile returned model_not_found on this account and
-- must not be used. Any other model or rate is PLACEHOLDER/UNKNOWN,
-- never quoted as real. No rate is stored in this migration: costs are
-- computed in lib/cost.ts and stored in estimated_cost_usd (005).
--
-- ── RLS ──────────────────────────────────────────────────────────────────
-- No new table is created, so no new policy is needed: task_executions
-- and tasks already have RLS enabled with membership-scoped policies in
-- supabase/policies.sql, and the new columns inherit those policies.
-- workspaces likewise already has RLS + policies. If a future step adds
-- a cost table of its own, it needs its own membership-scoped policies.

-- ── task_executions: dedup + idempotency ─────────────────────────────────
alter table task_executions
  add column if not exists is_cached boolean not null default false,
  add column if not exists input_hash text,
  add column if not exists idempotency_key text;

-- One live run per idempotency key. Partial index: rows with a null key
-- (older rows, or callers that do not supply one) are unaffected.
create unique index if not exists idx_executions_idempotency_key_unique
  on task_executions(idempotency_key) where idempotency_key is not null;

-- Dedup lookup: same workspace + same input hash = same run already seen.
create index if not exists idx_executions_input_hash
  on task_executions(workspace_id, input_hash) where input_hash is not null;

-- ── tasks: handoff packet, hop/retry limits, run start ───────────────────
alter table tasks
  add column if not exists handoff_packet jsonb not null default '{}',
  add column if not exists max_hops integer not null default 3
    check (max_hops between 1 and 10),
  add column if not exists retry_count integer not null default 0
    check (retry_count >= 0),
  add column if not exists started_at timestamptz;

-- Stale-task recovery scan: in_progress tasks whose started_at is old.
create index if not exists idx_tasks_stale_recovery
  on tasks(started_at) where status = 'in_progress';

-- ── workspaces: daily USD cap ────────────────────────────────────────────
alter table workspaces
  add column if not exists daily_budget_usd numeric(12, 6) not null default 2.00
    check (daily_budget_usd >= 0);

-- ── Piece 3: signed approval webhook + human-edit provenance ─────────────
-- Added by the coordinator during integration: Piece 3's code reads and
-- writes these columns best-effort, and degrades gracefully until they
-- exist. All additive, all guarded, no existing column is changed.
-- workspaces.approval_webhook_url: leader-configured https URL; the
-- signed webhook fires only after a leader approves, never automatically.
alter table workspaces
  add column if not exists approval_webhook_url text;

alter table approvals
  add column if not exists webhook_delivery_status text
    check (webhook_delivery_status is null
      or webhook_delivery_status in ('pending', 'delivered', 'delivery_failed')),
  add column if not exists webhook_http_status integer,
  add column if not exists was_human_edited boolean not null default false,
  add column if not exists human_edited_payload jsonb;

alter table reports
  add column if not exists was_human_edited boolean not null default false;

-- NOTE: live application of this file needs Kartikey's separate yes, in
-- the Supabase SQL editor, after 010 has been applied. The worker code
-- that writes is_cached / input_hash / idempotency_key and reads
-- daily_budget_usd is a separate step; until it lands, these columns
-- simply stay at their defaults and nothing breaks.
