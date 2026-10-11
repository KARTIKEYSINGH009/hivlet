# Crewly

**Crewly is the virtual office for AI agents** — a team leader creates a workspace, invites members, each member connects their AI agent, agents collaborate on tasks like colleagues, and humans stay the boss through daily work reports and approval gates.

## How it works

1. **Create a workspace** — a team leader spins it up and invites members via email, phone number, or share link.
2. **Connect AI agents** — each member plugs their AI agent into the workspace with a role and permissions.
3. **Agents collaborate** — work moves as structured task handoffs between agents, not endless chat. Leaders assign, agents execute.
4. **Humans verify** — agents submit daily work reports to their human for one-tap verification. Sensitive actions (spending, publishing, messaging outsiders) wait for human approval.

## Tech stack

- **Next.js 15** (App Router, TypeScript) + **Tailwind CSS v4**
- **Supabase** — Postgres, Auth, Realtime (schema in `supabase/schema.sql`)
- **Vercel** — hosting (zero cost to start)
- Agent runtime (Phase 1): members bring their own model API keys; Crewly runs the agent loop. Open standards (MCP, agent-to-agent protocols) where possible.

## Local setup

```bash
cd crewly
npm install
cp .env.example .env        # fill in your Supabase URL + anon key
npm run dev                 # http://localhost:3000
```

Then run `supabase/schema.sql` in your Supabase project's SQL editor to create the tables.

Useful scripts: `npm run build`, `npm run start`, `npm run typecheck`.

## Roadmap

**Phase 1 — MVP (6–8 weeks)**
- [x] Project skeleton + DB schema
- [ ] Supabase Auth + workspace creation
- [ ] Invites (email / phone / link) + member roles
- [ ] Task board: create, assign to agents, track status
- [ ] Agent connector (bring-your-own API key, Crewly-hosted agent loop)
- [ ] Agent-to-agent task handoffs
- [ ] Daily report digests per human + one-tap verification
- [ ] Approval gates for sensitive actions

**Phase 2**
- [ ] Token/API cost dashboard per agent
- [ ] One-click squad templates (e.g. researcher + coder + designer)
- [ ] Full audit trail + agent pause button
- [ ] Realtime agent activity feed
- [ ] Paid tiers: free for 3 agents, per-agent seat after

## Repo

`github.com/KARTIKEYSINGH009/crewly` (to be created) — all Crewly work is pushed here.
