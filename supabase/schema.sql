-- Hivlet MVP schema (Supabase / Postgres)
-- Run this in the Supabase SQL editor.
--
-- RLS is enabled on every table. Membership-scoped policies live in
-- supabase/policies.sql — run that file right after this one, or every
-- query will return zero rows. Rule: members can only touch rows belonging
-- to workspaces they belong to; leaders get extra write powers.

-- ── Workspaces ──────────────────────────────────────────────────────────────
create table if not exists workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  created_by uuid,                       -- auth.users id of the team leader
  invite_code text unique not null default substr(md5(random()::text), 1, 8),
  created_at timestamptz not null default now()
);

-- ── Workspace members (humans) ──────────────────────────────────────────────
create table if not exists workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_id uuid not null,                  -- auth.users id
  role text not null default 'member' check (role in ('leader', 'member')),
  joined_via text check (joined_via in ('email', 'phone', 'link')),
  created_at timestamptz not null default now(),
  unique (workspace_id, user_id)
);
create index if not exists idx_workspace_members_workspace on workspace_members(workspace_id);

-- ── Agents (connected AI agents, one row per member's agent) ────────────────
create table if not exists agents (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  member_id uuid not null references workspace_members(id) on delete cascade,
  name text not null,                     -- e.g. "Kartikey's coder"
  role text,                              -- e.g. "Researcher"
  provider text not null default 'custom' check (provider in ('openai', 'anthropic', 'gemini', 'custom')),
  model text,                             -- e.g. "gpt-4o", "claude-sonnet"
  system_prompt text,
  allowed_tools text[] not null default '{}',
  status text not null default 'idle' check (status in ('idle', 'working', 'awaiting_approval', 'failed', 'disabled', 'paused', 'error')),
  created_at timestamptz not null default now()
);
create index if not exists idx_agents_workspace on agents(workspace_id);
create index if not exists idx_agents_member on agents(member_id);

-- ── Tasks (work assigned to agents) ─────────────────────────────────────────
create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'todo'
    check (status in ('todo', 'in_progress', 'in_review', 'done', 'failed', 'blocked')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),
  assigned_agent_id uuid references agents(id) on delete set null,
  created_by_member_id uuid references workspace_members(id) on delete set null,
  due_at timestamptz,
  result text,                            -- acceptance note / final output
  failure_reason text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_tasks_workspace on tasks(workspace_id);
create index if not exists idx_tasks_agent on tasks(assigned_agent_id);
create index if not exists idx_tasks_status on tasks(status);
create index if not exists idx_tasks_priority on tasks(priority);

-- ── Task handoffs (structured agent-to-agent collaboration) ─────────────────
create table if not exists task_handoffs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade,
  task_id uuid not null references tasks(id) on delete cascade,
  from_agent_id uuid not null references agents(id) on delete cascade,
  to_agent_id uuid not null references agents(id) on delete cascade,
  payload jsonb not null default '{}',   -- structured inputs for the next agent
  note text,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  created_at timestamptz not null default now()
);
create index if not exists idx_handoffs_task on task_handoffs(task_id);
create index if not exists idx_handoffs_workspace on task_handoffs(workspace_id);

-- ── Reports (daily agent work reports, verified by the human) ───────────────
create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  agent_id uuid not null references agents(id) on delete cascade,
  member_id uuid not null references workspace_members(id) on delete cascade, -- the human recipient
  period_date date not null,
  summary text not null,
  completed_tasks jsonb not null default '[]',
  blockers text,
  next_steps text,
  verified boolean not null default false,
  verified_at timestamptz,
  verified_by uuid references workspace_members(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (agent_id, period_date)
);
create index if not exists idx_reports_workspace on reports(workspace_id);
create index if not exists idx_reports_member on reports(member_id);

-- ── Approvals (human approval gates for sensitive agent actions) ─────────────
create table if not exists approvals (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  agent_id uuid not null references agents(id) on delete cascade,
  task_id uuid references tasks(id) on delete set null,
  action_type text not null check (action_type in ('spend', 'publish', 'send_message', 'external_call', 'other')),
  action_detail jsonb not null default '{}',
  reason text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'expired')),
  decided_by_member_id uuid references workspace_members(id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_approvals_workspace on approvals(workspace_id);
create index if not exists idx_approvals_status on approvals(status);

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

-- ── Row Level Security ──────────────────────────────────────────────────────
alter table workspaces enable row level security;
alter table workspace_members enable row level security;
alter table agents enable row level security;
alter table tasks enable row level security;
alter table task_handoffs enable row level security;
alter table reports enable row level security;
alter table approvals enable row level security;
alter table task_events enable row level security;

-- Policies live in supabase/policies.sql (run after this file).
