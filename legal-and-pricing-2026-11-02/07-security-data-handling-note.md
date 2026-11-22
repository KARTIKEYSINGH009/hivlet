# Security and Data Handling Note

Status: factual note about the current build, plus open checks. This is not a security certification, not a SOC 2 or ISO claim, and not a promise that Orbely is breach-free. A lawyer and a security review must confirm any promise before it is published.

## 1. What Orbely stores today (factual, from the current build)

- Hosting: Vercel, project hivlet, live at hivlet.vercel.app.
- Database and auth: Supabase, project hivlet.
- Account data: email and auth data via Supabase Auth.
- Workspace data: workspaces, memberships and roles, invite codes.
- Work data: agents, tasks, approvals, executions, reports, activity, budgets, proof and case-study notes, usage and cost data.
- Audit logs: append-only by design, no update or delete policies on audit logs in the schema.
- No profiles table: boss view shows Leader/Member plus first 8 chars of user id, not names or photos.
- No email/phone invite provider: invite link / invite code only, so no phone numbers or invitee emails are collected for invites today.

## 2. Keys and secrets (factual, from the current build)

- GROQ_API_KEY: server-side only, in Vercel Production, set by Kartikey. Never in code, never in chat, never in a client bundle.
- WORKER_SECRET: server-side only, required by the worker endpoint, fails closed with 503 if unset. Still not set in Vercel Production as of the last names-only check, 2026-11-02.
- SUPABASE_SERVICE_ROLE_KEY: server-side only, required by the worker and by the Run button's service client, fails closed if unset. Still not set in Vercel Production as of the last names-only check, 2026-11-02.
- NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY: public-safe by design, in Vercel Production. They are not secrets, but they must not be confused with the service-role key, which bypasses row-level security and must stay server-side only.
- Agent credentials: key reference only, never plaintext provider keys, in agent_credentials.
- Payment keys, when billing is built: server-side only, webhook secrets server-side only, never in code or a client bundle. This is a design rule, not yet tested, because billing is not built.

## 3. Access control (factual, from the current build)

- Workspace-scoped access: a member sees only workspaces they belong to, subject to the membership policies in Supabase.
- Leaders can approve payloads, set budgets, and, on the Approvals page, press Run queued executions now, which processes only queued executions for that leader's own workspace, in code. The older global worker endpoint still uses a shared claim by design, because it is a trusted server-side worker, not a per-workspace leader action. That difference must be described accurately in any security page, and a lawyer must review it.
- Approvals: only an approved payload can be enqueued, carried verbatim, idempotent by approval id. Approving twice cannot run twice, by the unique index on approval id.
- Tasks move to in review after a run, never straight to done. Failed runs move a task to failed with a sanitised reason, not a raw provider error with a key in it. Error sanitising redacts gsk_ keys in code, as a factual note from the Groq adapter build.

## 4. AI provider handling (factual, plus open checks)

- When an agent runs, the approved prompt and relevant workspace context are sent to the provider chosen for that agent, for example Groq at api.groq.com, to produce output.
- Output is recorded in Orbely, with token counts, provider, model, and cost estimate, where the provider reports them.
- Open checks, unverified, do not promise them:
  - Groq's data retention, training use, and zero-retention terms.
  - Whether Groq, or any other provider, stores prompts after a run, and for how long.
  - Log retention for Vercel and Supabase logs, and for Orbely's own logs.
  - Backup frequency, retention, and restore testing for Supabase.
  - Whether a Data Protection Impact Assessment is needed, and for which data sets.
  - Incident response roles, contact, and timeline, beyond the breach notice proposal in the Privacy Policy draft.

## 5. What Orbely does not do today (factual)

- Worker records output only. It does not spend, publish, or send.
- No email/phone invites sent.
- No billing, no paid tiers, no payment data stored.
- No security certification, no penetration test result, and no uptime SLA is claimed in this note. Do not add one without evidence and a lawyer review.
- No data residency promise. Hosting and AI processing may be outside India, as the Privacy Policy draft says, subject to lawyer confirmation.

## 6. Incident handling, as a proposal

- On a suspected breach, preserve logs, stop the affected access if safe to do so, assess scope, and notify affected users and the Data Protection Board of India as the Privacy Policy draft proposes, subject to lawyer confirmation of recipients and timelines.
- Incident contact: [CONTACT EMAIL - NEEDS KARTIKEY DECISION]. Do not publish an incident contact until it is monitored.
- Post-incident: record what happened, what was fixed, and what will prevent recurrence, and share a summary with affected customers as a lawyer confirms. Do not promise a public post-mortem format until that is decided.

## Status

- Factual: sections 1, 2, 3, and 5, as of the current build, subject to re-check after any code change.
- Needs lawyer confirmation: any security promise, incident timeline, and breach notice wording.
- Needs Kartikey decision: incident contact, log and backup retention, and whether to commission a security review or penetration test before a paid launch.
- Unverified: provider retention and training terms, log and backup retention, and impact assessment need.
