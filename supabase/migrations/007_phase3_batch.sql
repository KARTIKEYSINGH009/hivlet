-- Phase 3 batch, local only, NOT live-verified. Additive, nullable only.
-- If these columns are missing, batch pages fall back to listing
-- batch-eligible tasks from titles, and never break existing pages.
alter table task_executions add column if not exists is_batch boolean not null default false;
alter table task_executions add column if not exists scheduled_for timestamptz;
