-- Phase 4 case studies, local only, NOT live-verified.
-- A case study is a customer note, never published by this app.
-- published stays false: publishing needs the customer's explicit yes
-- outside this system, and no publish action exists in this phase.
create table if not exists case_studies (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  submitted_by_member_id uuid references workspace_members(id) on delete set null,
  before_text text not null,
  after_text text not null,
  caught_in_review text,
  published boolean not null default false,
  created_at timestamptz not null default now()
);
alter table case_studies enable row level security;
create policy "members read case studies" on case_studies for select using (public.is_workspace_member(workspace_id));
create policy "members submit case studies" on case_studies for insert with check (public.is_workspace_member(workspace_id));
