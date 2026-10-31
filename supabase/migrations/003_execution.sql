-- Execution-engine foundation (Milestone 3).
--
-- Run AFTER supabase/schema.sql. This file creates tables + the queue
-- claim function ONLY; all RLS policies (including for these new tables)
-- live in supabase/policies.sql, which must run AFTER this file, and
-- supabase/migrations/002_workspace_app.sql runs last. The policy block
-- that used to sit at the end of this file was removed 2026-11-01
-- because it duplicated policies.sql exactly and made this file depend
-- on policies.sql's helper functions, creating a circular dependency.
--
-- What it adds:
--   task_executions: one row per agent run. This table IS the durable
--     queue: status queued -> running -> succeeded/failed, plus
--     claimed_at / claimed_by so two workers can never run one row.
--     No pgmq/Supabase Queues extension is required; if a project later
--     enables pgmq, the worker can publish to it and this table stays
--     the record of what ran. A stale claim (running > 10 minutes) is
--     recovered by claim_next_execution(): retried while attempts < 3,
--     then marked failed.
--   agent_credentials: provider + key REFERENCE only. This table must
--     NEVER hold a plaintext API key. A row says where the secret lives
--     (e.g. "env:OPENAI_API_KEY" or a vault path); the worker resolves
--     the actual secret from server-only environment / a vault at run
--     time. Real per-agent vault storage (Supabase Vault / KMS) is a
--     later milestone; until then one env key per provider is used.
--   audit_logs: append-only trail (actor, workspace, action, target,
--     summary). There are deliberately NO update/delete policies: RLS
--     denies what no policy allows, so rows can be inserted and read
--     but never rewritten or erased through the app.
--
-- Security notes:
--   * Keys never appear in this repo, in task_executions rows, in
--     audit_logs summaries, or in worker logs. Adapter errors are
--     sanitized before they are stored (see lib/agents/errors.ts).
--   * The worker authenticates to Postgres with the service-role key
--     (server only, never NEXT_PUBLIC_*) and is the only writer of
--     running/succeeded/failed transitions. App users enqueue rows
--     (status queued) through RLS; they cannot mark their own runs
--     succeeded, because the RLS policy below allows members to insert
--     and select executions but NOT to update them.

-- ── Task executions (the queue + the record) ───────────────────────────────
create table if not exists task_executions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  task_id uuid references tasks(id) on delete cascade,
  agent_id uuid not null references agents(id) on delete cascade,
  approval_id uuid references approvals(id) on delete set null,
  status text not null default 'queued'
    check (status in ('queued', 'running', 'succeeded', 'failed')),
  is_demo boolean not null default false,
  input jsonb not null default '{}',
  output text,
  error text,
  prompt_tokens integer,
  completion_tokens integer,
  total_tokens integer,
  claimed_at timestamptz,
  claimed_by text,
  attempts integer not null default 0,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_executions_workspace on task_executions(workspace_id);
create index if not exists idx_executions_task on task_executions(task_id);
create index if not exists idx_executions_agent on task_executions(agent_id);
create index if not exists idx_executions_status_created on task_executions(status, created_at);
-- One execution per approval: approving twice can never run twice.
create unique index if not exists idx_executions_approval_unique
  on task_executions(approval_id) where approval_id is not null;
alter table task_executions enable row level security;

-- ── Agent credentials (references only, never plaintext keys) ──────────────
create table if not exists agent_credentials (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  agent_id uuid not null references agents(id) on delete cascade,
  provider text not null check (provider in ('openai', 'anthropic', 'gemini', 'custom')),
  -- Where the secret lives, NOT the secret itself, e.g. "env:OPENAI_API_KEY"
  -- or "vault:projects/hivlet/agents/<id>". Never store a key here.
  key_reference text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (agent_id)
);
create index if not exists idx_credentials_workspace on agent_credentials(workspace_id);
create index if not exists idx_credentials_agent on agent_credentials(agent_id);
alter table agent_credentials enable row level security;

-- ── Audit logs (append-only) ────────────────────────────────────────────────
create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  actor_type text not null check (actor_type in ('member', 'worker', 'system')),
  actor_id text,
  action text not null,
  target_type text,
  target_id uuid,
  summary jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists idx_audit_workspace_created on audit_logs(workspace_id, created_at desc);
alter table audit_logs enable row level security;

-- ── Queue claim: atomic, skip-locked, with stale-claim recovery ─────────────
-- Called by the worker (service role). Returns one claimed execution, or
-- NULL when the queue is empty. A second worker calling at the same time
-- gets a different row (FOR UPDATE SKIP LOCKED) or NULL.
create or replace function public.claim_next_execution(p_worker_id text)
returns task_executions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row task_executions;
begin
  -- Stuck runs: a worker that died mid-run leaves status 'running'.
  -- After 10 minutes the claim is stale: retry while attempts remain,
  -- otherwise fail the execution so it never hangs forever.
  update task_executions
  set status = 'failed',
      error = 'Execution abandoned after repeated attempts (stale worker claim).',
      finished_at = now()
  where status = 'running'
    and claimed_at < now() - interval '10 minutes'
    and attempts >= 3;

  update task_executions
  set status = 'queued', claimed_at = null, claimed_by = null
  where status = 'running'
    and claimed_at < now() - interval '10 minutes'
    and attempts < 3;

  select * into v_row
  from task_executions
  where status = 'queued'
  order by created_at asc
  limit 1
  for update skip locked;

  if v_row.id is null then
    return null;
  end if;

  update task_executions
  set status = 'running',
      claimed_at = now(),
      claimed_by = p_worker_id,
      attempts = attempts + 1,
      started_at = coalesce(started_at, now())
  where id = v_row.id
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.claim_next_execution(text) from public;
grant execute on function public.claim_next_execution(text) to authenticated, service_role;

-- NOTE: RLS policies for these new tables live ONLY in
-- supabase/policies.sql (run after this file). The duplicate policy
-- block that used to sit here was removed 2026-11-01: it needed
-- policies.sql's helper functions, which would have made this file
-- fail when run before policies.sql.
