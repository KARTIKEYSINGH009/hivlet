-- Migration 004: atomic workspace creation (BUG FIX 2026-11-01).
--
-- Root cause, confirmed from app/workspaces/page.tsx + policies.sql:
-- the old flow inserted a workspace, then .select("id") on the same
-- query, then inserted the leader member row. In Postgres, INSERT ...
-- RETURNING is filtered by the SELECT policy too. The SELECT policy
-- was members-only (is_workspace_member(id)), and at insert time the
-- user was not yet a member, so the select returned no row, the app
-- redirected to ?error=create, and the member insert never ran. The
-- workspace row itself had already been inserted, but it was invisible
-- in the list, because the list is driven by workspace_members rows.
-- Symptoms matched exactly: "Could not create the workspace. Please
-- try again." plus "No workspaces yet" on the signed-in list, even
-- though the name (for example "Kartikey Singh") is valid and has no
-- uniqueness constraint to fail on.
--
-- This function fixes it atomically, the same way
-- join_workspace_by_code already works for invites: it runs SECURITY
-- DEFINER, so it bypasses RLS, inserts the workspace AND the leader
-- member row in one transaction, and returns the workspace id directly.
-- If either insert fails, the whole transaction rolls back, so no
-- orphan workspace row can be left behind.
--
-- LIVE STEPS, in order (local code only until Kartikey deploys):
--   1. Run the updated supabase/policies.sql (adds the creator-read
--      policy; safe to re-run, it drops and recreates policies).
--   2. Run this file, 004, in the Supabase SQL editor. It must run
--      AFTER schema.sql, because it references workspaces and
--      workspace_members. It does not depend on policies.sql or 002.
--   3. Only then deploy app code that calls this function. Deploying
--      the new app code before this function exists makes creation fail
--      cleanly (no orphan, server log shows the missing function) but
--      it will still fail, so do not deploy first.
--
-- Existing orphan rows from failed attempts are NOT deleted by this
-- migration, on purpose: deleting rows automatically is destructive.
-- A one-time, manual cleanup for a known creator, to run only after
-- checking the rows first, is:
--   select id, name, created_at from workspaces w
--   where w.created_by = '<user uuid>'
--     and not exists (
--       select 1 from workspace_members m
--       where m.workspace_id = w.id
--     );
-- Delete only rows you have confirmed are orphans from failed creates.
-- Do not run a blanket delete.

create or replace function public.create_workspace_with_leader(
  p_name text,
  p_description text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  ws_id uuid;
  v_name text;
begin
  v_name := trim(coalesce(p_name, ''));
  if v_name = '' then
    raise exception 'workspace name is required';
  end if;

  insert into workspaces (name, description, created_by)
  values (
    v_name,
    nullif(trim(coalesce(p_description, '')), ''),
    auth.uid()
  )
  returning id into ws_id;

  insert into workspace_members (workspace_id, user_id, role, joined_via)
  values (ws_id, auth.uid(), 'leader', 'link')
  on conflict (workspace_id, user_id)
  do update set role = 'leader';

  return ws_id;
end;
$$;

revoke all on function public.create_workspace_with_leader(text, text) from public;
grant execute on function public.create_workspace_with_leader(text, text) to authenticated;
