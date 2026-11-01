-- Phase 1 cost tracking, local only, NOT live-verified.
--
-- Run AFTER supabase/schema.sql, supabase/policies.sql,
-- supabase/migrations/002_workspace_app.sql, 003_execution.sql and
-- 004_create_workspace.sql, in that order. This file only ADDS nullable
-- columns, so it is safe to run on a database that already has runs:
-- old rows simply have null cost fields, and the worker best-effort
-- writes these columns and ignores a missing-column error, so the app
-- keeps working on a database where this file has not run yet.
--
-- What it adds to task_executions:
--   cached_tokens: provider-reported cached prompt tokens, or null
--     when the provider did not report cache use. Null is NOT 0%.
--   provider, model: the provider and model that actually ran, so the
--     usage page does not have to guess from the agent's current model
--     (an agent's model can change after a run).
--   estimated_cost_usd: cost computed in code from token counts and
--     the PLACEHOLDER rates in lib/cost.ts. This is an estimate, not
--     a charge, not a provider invoice, and not a billing record.
--     Hivlet charges nothing from this column. Replace the rates in
--     lib/cost.ts with real provider rates before showing a cost to
--     a customer as a real price. Demo runs must keep null here.
--
-- No RLS change is needed: task_executions already has RLS enabled
-- and its policies live in supabase/policies.sql. Do not add a policy
-- here, and do not store any API key, secret, or provider key in this
-- file or in these columns.

alter table task_executions
  add column if not exists cached_tokens integer,
  add column if not exists provider text,
  add column if not exists model text,
  add column if not exists estimated_cost_usd numeric(12, 6);

create index if not exists idx_executions_cost_provider
  on task_executions(workspace_id, provider);
create index if not exists idx_executions_cost_model
  on task_executions(workspace_id, model);
