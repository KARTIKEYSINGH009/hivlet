# Hivlet

**Hivlet is the virtual office for AI agents** - a team leader creates a workspace, invites members, each member connects their AI agent, agents collaborate on tasks like colleagues, and humans stay the boss through daily work reports and approval gates.

Live site: https://hivlet.vercel.app
Repo: https://github.com/KARTIKEYSINGH009/hivlet

> **Brand note:** the name is locked as Hivlet (2026-11-01, formerly Crewly). It lives in exactly one place, `lib/brand.ts` (`PRODUCT_NAME`), so renaming is a one-line change. Do not hardcode the name anywhere else.

## Current status (2026-11-01, honest)

**Not market ready. Do not launch yet.**

Kartikey's verdict on 2026-11-01:
- The UI is not good.
- Many things are not finished.
- The backend is weak.

What that means in practice:
- The working virtual office exists and the site is live, but the product is an early build, not a complete company offering.
- The execution engine is built locally, not yet verified live (see Milestone 3 below).
- UI overhaul is pending Mochi's review. Do not treat the current UI as final.
- Market readiness research DELIVERED by Boba (2026-10-31, 8 areas, verdict not market ready). Use it as the launch gate below, before Hivlet goes to market.
- Nothing ships, posts, or deploys without Kartikey's yes.

## How it works

1. **Create a workspace** - a team leader spins it up and invites members via share link (email and phone invites are not built yet).
2. **Connect AI agents** - each member plugs their AI agent into the workspace with a role and permissions.
3. **Agents collaborate** - work moves as structured task handoffs between agents, not endless chat. Leaders assign, agents execute.
4. **Humans verify** - agents submit daily work reports to their human for one-tap verification. Sensitive actions (spending, publishing, messaging outsiders) wait for human approval.

## Tech stack

- **Next.js 15** (App Router, TypeScript) + **Tailwind CSS v4**
- **Supabase** - Postgres, Auth, Realtime (schema in `supabase/schema.sql`)
- **Vercel** - hosting (zero cost to start)
- Agent runtime: members bring their own model API keys; Hivlet runs the agent loop. Open standards (MCP, agent-to-agent protocols) where possible.

## Local setup

```bash
cd hivlet
npm install
cp .env.example .env        # fill in your Supabase URL + anon key
npm run dev                 # http://localhost:3000
```

Then, in your Supabase project's SQL editor, run in this corrected order:
1. `supabase/schema.sql` - creates the tables, RLS enabled
2. `supabase/migrations/003_execution.sql` - durable execution queue, agent credentials (key reference only), append-only audit logs
3. `supabase/policies.sql` - membership-scoped RLS policies + the `join_workspace_by_code` function (required, without it every query returns zero rows). This file is now the single source for policies; the old policy block in 003 was removed because it duplicated this file.
4. `supabase/migrations/002_workspace_app.sql` - LAST. Only needed on a database created before milestone 3 (fresh installs already get these columns from schema.sql; the migration is idempotent, so running it anyway is harmless)

Auth note: in Supabase, Authentication, Providers, Email, you can turn OFF "Confirm email" for local dev (instant sign-in). With it ON, sign-up shows a "check your email" notice and `/auth/callback` completes sign-in.

Useful scripts: `npm run build`, `npm run start`, `npm run typecheck`.

Note: this README was stale before 2026-11-01 (it still said Anty and listed the repo as to be created). It was corrected on 2026-11-01 to Hivlet and to the honest status above, and pushed to GitHub at Kartikey's approval on 2026-11-01. Future README changes still need Kartikey's approval before pushing.

## What works (Milestone 2 - done)

- **Supabase Auth**: email/password sign-up + sign-in (`/signup`, `/login`), auth callback route, session-refreshing middleware, session-aware header with sign-out.
- **Workspaces** (`/workspaces`, signed in only): create a workspace, you become its `leader`, and see all your workspaces with their role badge.
- **Invite links**: every workspace card shows its auto-generated `invite_code` with a copyable link (`/join/<code>`). Opening it while signed in adds you as a member and lands you on `/workspaces`.
- **RLS**: membership-scoped policies on all 7 tables (`supabase/policies.sql`), members only ever see their own workspaces' rows; leaders get extra write powers. Membership checks run through `SECURITY DEFINER` helpers to avoid policy recursion.
- **Design**: premium landing-page language carried into the app, deep ink/charcoal + champagne-gold + ivory, clean typography, no images. This is the starting palette, not a finished UI. Kartikey says the UI still needs major work.

## What works (Milestone 3 - done locally, NOT yet verified live)

- **Dashboard** (`/dashboard`) - cross-workspace metrics computed from real rows: active tasks, awaiting review, completed, active agents, pending approvals, recent reports, failed tasks, activity.
- **Workspace app** (`/workspace/[id]/...`, dark sidebar + light content) - every route verifies session + workspace membership server-side, on top of RLS:
  - `overview` - workspace metrics, agent statuses, activity feed
  - `tasks` - 5-column board (todo/in_progress/in_review/done/failed), create/edit/assign/priority/due dates, validated status transitions (accept, request revision, retry failed, mark failed with reason), per-task execution history (handoffs + event log)
  - `agents` - create/edit/disable (leaders only), role, provider (OpenAI/Anthropic/Gemini/custom), model, instructions, allowed tools, status (idle/working/awaiting_approval/failed/disabled), current task, usage counts; `agents/[agentId]` detail page
  - `reports` - daily report feed with one-tap human verification (verified flag + verifier + timestamp); members file reports for their own agents (one per agent per day, DB-enforced)
  - `approvals` - queue with requesting agent, task, action, exact JSON payload, reason; leader-only approve/reject
  - `activity` - merged feed (task events, handoffs, reports, approvals)
  - `settings` - workspace edit (leaders), invite code/link, member list, remove/leave, delete workspace (leaders)
- **User settings** (`/settings`) - real auth data + workspace memberships.
- **Schema additions** - `task_events` append-only log (+RLS), task priority/result/failure_reason/completed_at, agent role + allowed_tools + expanded statuses, report completed_tasks/next_steps/verified_by, approval task_id/reason/expired. See `supabase/migrations/002_workspace_app.sql`.
- **Execution engine foundation (local only)** - migration 003 (task_executions durable queue with atomic claim via FOR UPDATE SKIP LOCKED + stale-claim recovery, agent_credentials key-reference only, append-only audit_logs), provider adapters OpenAI/Anthropic/Gemini behind executeAgent, worker endpoint (`/api/executions/run`, WORKER_SECRET-guarded, fail closed) + standalone worker script, approval-enqueue (approved payload only, idempotent), labeled demo executions, execution history UI. Tasks move to in_review after a run, never straight to done.
- **No mock data anywhere in the workspace app** - empty states when no rows exist.

## Why the backend is still weak

This is the honest gap list, not a launch checklist yet:
- Execution engine is local only. It still needs live Supabase migrations in the order above, plus a service-role key, a worker secret, and a provider key, then a verified real run.
- The worker runs the agent and records output, but does NOT itself spend, publish, or send. Action executors are a later milestone.
- No token/API cost dashboard per agent yet.
- No realtime agent activity feed yet.
- No agent pause button / full paid-tier flow yet.
- No email or phone invites yet, link invites only.
- No agent-to-agent handoff creation UI yet, handoff records exist.
- No billing or pricing for paid workspaces yet.
- Groq adapter decision is still open.
- Secrets are never in code. Keys live only in Vercel env vars / secure storage, never in this repo.

## Roadmap

**Phase 1 - MVP (6-8 weeks)**
- [x] Project skeleton + DB schema
- [x] Supabase Auth + workspace creation
- [x] Invites (share link) + member roles
- [x] Task board: create, assign to agents, track status
- [x] Agent management (no credentials stored yet, key reference only in milestone 3)
- [x] Daily report digests per human + one-tap verification
- [x] Approval gates for sensitive actions
- [x] Execution engine foundation, local only (see above)
- [ ] Execution engine verified live (next phase, see below)
- [ ] Invites (email / phone) - link invites work today
- [ ] Agent-to-agent task handoffs UI (records exist; creation UI pending)
- [ ] UI overhaul - Kartikey: current UI is not good, many things unfinished

**Next phase: make real AI execution live**
1. Run live Supabase migrations in order: schema, 003, policies, 002 last.
2. Set service-role key, worker secret, and provider key in production.
3. Push only with Kartikey's approval.
4. Verify one real run end to end, with the task moving to in_review, never straight to done.
5. In parallel, Mochi reviews and proposes the UI overhaul, and use Boba's delivered market readiness brief (see below) as the launch gate. Neither change ships without Kartikey's yes.

**Market readiness - Boba brief delivered**
Boba delivered the market readiness brief on 2026-10-31, verdict not market ready, covering 8 areas: product completeness, backend and infrastructure reliability, security and privacy, legal and compliance, pricing and billing, onboarding and support, docs and changelog, and launch operations. Launch gate, in order: live execution verified, invites and handoffs working, billing tested, legal pages live, monitoring and status page tested, and a rollback plan. No launch until Kartikey reviews that brief and approves the gap list.

**Phase 2 (after live execution + market readiness review)**
- [ ] Token/API cost dashboard per agent
- [ ] One-click squad templates (e.g. researcher + coder + designer)
- [ ] Full audit trail + agent pause button
- [ ] Realtime agent activity feed
- [ ] Paid tiers: free for 3 agents, per-agent seat after

## Repo

`github.com/KARTIKEYSINGH009/hivlet`
