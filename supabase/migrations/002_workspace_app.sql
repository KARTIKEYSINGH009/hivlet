-- Workspace-app migration (milestone 3: dashboard, task board, agents,
-- reports, approvals, activity).
--
-- Run AFTER supabase/schema.sql + supabase/policies.sql on an existing
-- database. Fresh installs: schema.sql already contains these columns,
-- but running this file anyway is harmless (every statement is guarded).
--
-- What it adds:
--   agents: role, allowed_tools[], status values incl. awaiting_approval /
--     failed / disabled, provider 'gemini'
--   tasks: priority, result, failure_reason, completed_at, status 'failed'
--   reports: completed_tasks[], next_steps, verified_by
--   approvals: task_id, reason, status 'expired'
--   task_handoffs: workspace_id (denormalized for simpler queries)
--   task_events: append-only activity log (new table + RLS policies)

-- ── Agents ──────────────────────────────────────────────────────────────────
alter table agents add column if not exists role text;
alter table agents add column if not exists allowed_tools text[] not null default '{}';
alter table agents drop constraint if exists agents_status_check;
alter table agents drop constraint if exists agents_provider_check;
alter table agents add constraint agents_status_check
  check (status in ('idle', 'working', 'awaiting_approval', 'failed', 'disabled', 'paused', 'error'));
alter table agents add constraint agents_provider_check
  check (provider in ('openai', 'anthropic', 'gemini', 'custom'));

-- ── Tasks ───────────────────────────────────────────────────────────────────
alter table tasks add column if not exists priority text not null default 'medium';
alter table tasks add column if not exists result text;
alter table tasks add column if not exists failure_reason text;
alter table tasks add column if not exists completed_at timestamptz;
alter table tasks drop constraint if exists tasks_status_check;
alter table tasks add constraint tasks_status_check
  check (status in ('todo', 'in_progress', 'in_review', 'done', 'failed', 'blocked'));
alter table tasks drop constraint if exists tasks_priority_check;
alter table tasks add constraint tasks_priority_check
  check (priority in ('low', 'medium', 'high', 'urgent'));
create index if not exists idx_tasks_priority on tasks(priority);

-- ── Reports ─────────────────────────────────────────────────────────────────
alter table reports add column if not exists completed_tasks jsonb not null default '[]';
alter table reports add column if not exists next_steps text;
alter table reports add column if not exists verified_by uuid references workspace_members(id) on delete set null;

-- ── Approvals ───────────────────────────────────────────────────────────────
alter table approvals add column if not exists task_id uuid references tasks(id) on delete set null;
alter table approvals add column if not exists reason text;
alter table approvals drop constraint if exists approvals_status_check;
alter table approvals add constraint approvals_status_check
  check (status in ('pending', 'approved', 'rejected', 'expired'));

-- ── Task handoffs: denormalized workspace_id ────────────────────────────────
alter table task_handoffs add column if not exists workspace_id uuid references workspaces(id) on delete cascade;
update task_handoffs h
set workspace_id = t.workspace_id
from tasks t
where h.task_id = t.id and h.workspace_id is null;
create index if not exists idx_handoffs_workspace on task_handoffs(workspace_id);

-- ── Task events (append-only activity log) ──────────────────────────────────
create table if not exists task_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  task_id uuid not null references tasks(id) on delete cascade,
  event_type text not null,
  detail jsonb not null default '{}',
  actor_member_id uuid references workspace_members(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists idx_task_events_workspace on task_events(workspace_id);
create index if not exists idx_task_events_task on task_events(task_id);
alter table task_events enable row level security;

drop policy if exists "members manage task_events" on task_events;
create policy "members manage task_events" on task_events for all
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));
