-- Team hub (migration 010) — LOCAL FILE ONLY, NOT YET APPLIED LIVE.
-- Do NOT treat the team hub as live until Kartikey runs this file in the
-- Supabase SQL editor himself and confirms it. Until then the team page
-- degrades gracefully: projects and capacity sections show an
-- "awaiting migration" note and tasks render without the new columns.
--
-- What it adds, following the same membership-scoped RLS pattern as
-- tasks in supabase/policies.sql (helpers is_workspace_member /
-- is_workspace_leader already exist there):
--   * projects table (workspace-scoped, leader/member model like tasks)
--   * tasks.assigned_member_id — the HUMAN accountable for a task.
--     This is deliberately separate from tasks.assigned_agent_id (the AI
--     agent doing the work). Explicit NULL means unassigned and must
--     never fall back to the agent's owner in UI code.
--   * tasks.project_id — optional grouping; a task belongs to at most
--     one project in this workspace.
--   * workspace_member_capacity — planning capacity per member per
--     workspace (open-task count guide, not hours), leader-only writes.
-- It does NOT re-add priority or due_at: real tasks already have both
-- (priority text, due_at timestamptz, see supabase/schema.sql).
-- It adds no sample data, no demo users, and no profiles table. Member
-- labels in the UI stay role + truncated user id until a profiles
-- table exists; never invent names.

-- ── Projects ──────────────────────────────────────────────────────────────
create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name text not null,
  description text,
  owner_member_id uuid references workspace_members(id) on delete set null,
  target_date date,
  created_at timestamptz not null default now()
);
create index if not exists idx_projects_workspace on projects(workspace_id);
create index if not exists idx_projects_owner on projects(owner_member_id);
alter table projects enable row level security;

drop policy if exists "members manage projects" on projects;
create policy "members manage projects" on projects for all
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

-- ── Tasks: human assignee + project ───────────────────────────────────────
alter table tasks
  add column if not exists assigned_member_id uuid
    references workspace_members(id) on delete set null;
alter table tasks
  add column if not exists project_id uuid
    references projects(id) on delete set null;
create index if not exists idx_tasks_assigned_member on tasks(assigned_member_id);
create index if not exists idx_tasks_project on tasks(project_id);

-- ── Member capacity (planning guide, open-task count) ─────────────────────
create table if not exists workspace_member_capacity (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  member_id uuid not null references workspace_members(id) on delete cascade,
  capacity int not null default 5 check (capacity between 1 and 30),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, member_id)
);
create index if not exists idx_member_capacity_workspace
  on workspace_member_capacity(workspace_id);
alter table workspace_member_capacity enable row level security;

drop policy if exists "members read capacity" on workspace_member_capacity;
create policy "members read capacity" on workspace_member_capacity for select
  using (public.is_workspace_member(workspace_id));

-- Leader-only writes: members can read capacity, only a leader may set it.
-- (The server action setCapacity also enforces leader-only, so RLS is
-- the second layer, not the only one.)
drop policy if exists "leaders manage capacity" on workspace_member_capacity;
create policy "leaders manage capacity" on workspace_member_capacity
  for insert, update, delete
  using (public.is_workspace_leader(workspace_id))
  with check (public.is_workspace_leader(workspace_id));
