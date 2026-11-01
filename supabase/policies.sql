-- Hivlet Row Level Security policies (Supabase / Postgres)
-- Run this in the Supabase SQL editor AFTER supabase/schema.sql AND
-- supabase/migrations/003_execution.sql (its last sections create
-- policies on 003's tables). supabase/migrations/002 runs after this file.
-- Schema.sql already enables RLS on every table; without these policies
-- every query would return zero rows.
--
-- Design: the app talks to Postgres as the `authenticated` role with the
-- user's JWT, so auth.uid() is the signed-in user. Membership is the only
-- access rule: you can only touch rows belonging to workspaces you are a
-- member of. Leaders get the extra write powers (edit/delete workspace,
-- manage members).
--
-- Recursion trap: a policy on workspace_members that queries
-- workspace_members would recurse forever. All membership checks therefore
-- go through SECURITY DEFINER helper functions, which bypass RLS.

-- ── Helpers ─────────────────────────────────────────────────────────────────
create or replace function public.is_workspace_member(ws_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from workspace_members
    where workspace_id = ws_id and user_id = auth.uid()
  );
$$;

create or replace function public.is_workspace_leader(ws_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from workspace_members
    where workspace_id = ws_id
      and user_id = auth.uid()
      and role = 'leader'
  );
$$;

create or replace function public.is_workspace_creator(ws_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from workspaces
    where id = ws_id and created_by = auth.uid()
  );
$$;

-- Workspace id of a task (handoffs are scoped through their parent task).
create or replace function public.task_workspace_id(t_id uuid)
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select workspace_id from tasks where id = t_id;
$$;

revoke all on function public.is_workspace_member(uuid) from public;
revoke all on function public.is_workspace_leader(uuid) from public;
revoke all on function public.is_workspace_creator(uuid) from public;
revoke all on function public.task_workspace_id(uuid) from public;
grant execute on function public.is_workspace_member(uuid) to authenticated;
grant execute on function public.is_workspace_leader(uuid) to authenticated;
grant execute on function public.is_workspace_creator(uuid) to authenticated;
grant execute on function public.task_workspace_id(uuid) to authenticated;

-- Join a workspace from an invite code. A visitor is not a member yet, so a
-- plain SELECT on workspaces would be blocked by RLS — this function runs
-- as the table owner and does the lookup + insert in one step.
create or replace function public.join_workspace_by_code(p_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  ws_id uuid;
begin
  select id into ws_id from workspaces where invite_code = p_code;
  if ws_id is null then
    raise exception 'invalid invite code';
  end if;
  insert into workspace_members (workspace_id, user_id, role, joined_via)
  values (ws_id, auth.uid(), 'member', 'link')
  on conflict (workspace_id, user_id) do nothing;
  return ws_id;
end;
$$;

revoke all on function public.join_workspace_by_code(text) from public;
grant execute on function public.join_workspace_by_code(text) to authenticated;

-- ── Workspaces ──────────────────────────────────────────────────────────────
drop policy if exists "members read workspaces" on workspaces;
create policy "members read workspaces" on workspaces for select
  using (public.is_workspace_member(id));

-- BUG FIX 2026-11-01, Workspaces "No workspaces yet" + create failure:
-- an INSERT ... SELECT (RETURNING) in Postgres is filtered by the SELECT
-- policy as well as the INSERT policy. Before the leader member row
-- exists, is_workspace_member(id) is false, so the .select() after an
-- insert returned no row, the app took its error path, and the member
-- insert never ran, leaving an invisible orphan workspace row. This
-- policy lets the creator read the row they just created, so the old
-- two-step flow would also work. The app now uses the atomic RPC in
-- migrations/004_create_workspace.sql as its primary path; this policy
-- is belt and braces, not the only fix. Tradeoff, noted honestly: a
-- creator can still read the workspace row itself after being removed
-- as a member. All other tables in the workspace stay membership-gated,
-- so no tasks, agents, reports, or approvals leak through this policy.
drop policy if exists "creators read workspaces" on workspaces;
create policy "creators read workspaces" on workspaces for select
  using (created_by = auth.uid());

drop policy if exists "users create workspaces" on workspaces;
create policy "users create workspaces" on workspaces for insert
  with check (created_by = auth.uid());

drop policy if exists "leaders update workspaces" on workspaces;
create policy "leaders update workspaces" on workspaces for update
  using (public.is_workspace_leader(id));

drop policy if exists "leaders delete workspaces" on workspaces;
create policy "leaders delete workspaces" on workspaces for delete
  using (public.is_workspace_leader(id));

-- ── Workspace members ───────────────────────────────────────────────────────
drop policy if exists "members read members" on workspace_members;
create policy "members read members" on workspace_members for select
  using (public.is_workspace_member(workspace_id));

-- A leader can add members; a workspace creator can add themselves as the
-- first (leader) row right after creating the workspace.
drop policy if exists "leaders and creators add members" on workspace_members;
create policy "leaders and creators add members" on workspace_members for insert
  with check (
    user_id = auth.uid()
    and (
      public.is_workspace_leader(workspace_id)
      or public.is_workspace_creator(workspace_id)
    )
  );

drop policy if exists "leaders update members" on workspace_members;
create policy "leaders update members" on workspace_members for update
  using (public.is_workspace_leader(workspace_id));

-- Leaders can remove members; any member can leave a workspace themselves.
drop policy if exists "leaders remove members, members leave" on workspace_members;
create policy "leaders remove members, members leave" on workspace_members for delete
  using (
    public.is_workspace_leader(workspace_id) or user_id = auth.uid()
  );

-- ── Agents ──────────────────────────────────────────────────────────────────
drop policy if exists "members manage agents" on agents;
create policy "members manage agents" on agents for all
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

-- ── Tasks ───────────────────────────────────────────────────────────────────
drop policy if exists "members manage tasks" on tasks;
create policy "members manage tasks" on tasks for all
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

-- ── Task handoffs (scoped through the parent task's workspace) ──────────────
drop policy if exists "members manage handoffs" on task_handoffs;
create policy "members manage handoffs" on task_handoffs for all
  using (public.is_workspace_member(public.task_workspace_id(task_id)))
  with check (public.is_workspace_member(public.task_workspace_id(task_id)));

-- ── Reports ─────────────────────────────────────────────────────────────────
drop policy if exists "members manage reports" on reports;
create policy "members manage reports" on reports for all
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

-- ── Approvals ───────────────────────────────────────────────────────────────
drop policy if exists "members manage approvals" on approvals;
create policy "members manage approvals" on approvals for all
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

-- ── Task events (append-only activity log) ──────────────────────────────────
drop policy if exists "members manage task_events" on task_events;
create policy "members manage task_events" on task_events for all
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

-- ── Task executions (Milestone 3: the execution queue + record) ─────────────
-- Members read executions and enqueue them (insert as 'queued'). Only the
-- worker (service role, bypasses RLS) may move a row to running /
-- succeeded / failed, so a user can never fake a completed run. The one
-- exception is DEMO rows: members may insert a completed row with
-- is_demo = true, because a demo fixture is not a real run and is always
-- labeled DEMO in the UI.
drop policy if exists "members read executions" on task_executions;
create policy "members read executions" on task_executions for select
  using (public.is_workspace_member(workspace_id));

drop policy if exists "members enqueue executions" on task_executions;
create policy "members enqueue executions" on task_executions for insert
  with check (
    public.is_workspace_member(workspace_id)
    and (
      status = 'queued'
      or (status = 'succeeded' and is_demo = true)
    )
  );

-- ── Agent credentials (references only, never plaintext keys) ──────────────
drop policy if exists "members read credentials" on agent_credentials;
create policy "members read credentials" on agent_credentials for select
  using (public.is_workspace_member(workspace_id));

drop policy if exists "leaders manage credentials" on agent_credentials;
create policy "leaders manage credentials" on agent_credentials for all
  using (public.is_workspace_leader(workspace_id))
  with check (public.is_workspace_leader(workspace_id));

-- ── Audit logs (append-only: no update/delete policy on purpose) ───────────
drop policy if exists "members read audit logs" on audit_logs;
create policy "members read audit logs" on audit_logs for select
  using (public.is_workspace_member(workspace_id));

drop policy if exists "members append audit logs" on audit_logs;
create policy "members append audit logs" on audit_logs for insert
  with check (public.is_workspace_member(workspace_id));
