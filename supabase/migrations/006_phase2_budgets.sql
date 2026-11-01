-- Phase 2 budgets, local only, NOT live-verified. Run after 005.
-- Nullable, additive only. If this table is missing, the worker
-- treats the workspace as having no budget (run allowed) and the
-- Budgets page shows a not-migrated note instead of breaking.
-- No charge, no billing tier, no secret is stored here.
create table if not exists workspace_budgets (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  monthly_token_budget integer,
  monthly_cost_budget_usd numeric(12, 6),
  hard_stop boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id)
);
alter table workspace_budgets enable row level security;
-- RLS policies for this table live in policies.sql in a later step;
-- until then, app access is via the existing membership guard plus
-- RLS deny-by-default on new tables (no policy = no rows via PostgREST).
-- Do NOT run this live until policies are added and reviewed.

-- Policies, same helpers as policies.sql. Members read, leaders manage.
create policy "members read budgets" on workspace_budgets for select
  using (public.is_workspace_member(workspace_id));
create policy "leaders manage budgets" on workspace_budgets for all
  using (public.is_workspace_leader(workspace_id))
  with check (public.is_workspace_leader(workspace_id));
