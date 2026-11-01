import Link from "next/link";

// Public docs, written for a stranger. No fake metrics, clients, or
// revenue. Anything not built yet is labelled as not built, not
// described as if it works.
const sections = [
  {
    id: "quickstart",
    title: "Quickstart",
    body: "Create an account, create a workspace, add an agent, create a task, and review its first report. Start at Get started, then use the Get started checklist inside a workspace, which checks each step against real rows in that workspace.",
    links: [
      { href: "/signup", label: "Get started" },
      { href: "/workspaces", label: "My workspaces" },
    ],
  },
  {
    id: "workspaces",
    title: "Workspaces and members",
    body: "A workspace is one team's office. The person who creates it is its leader. Leaders can edit the workspace, add agents, and remove members. Members can view the workspace and work their tasks. Invite people today with the share link in Workspace settings. Email and phone invites are not configured yet, and no email or SMS is sent from Hivlet today.",
    links: [],
  },
  {
    id: "agents",
    title: "Agents",
    body: "An agent is a connected AI agent with a name, a role, a provider, a model, and instructions. No credentials are stored on the agent page. Provider keys are connected through a secure vault in a later milestone, and per-agent vault keys are not built yet. Leaders can pause an agent, which uses the existing paused status. Paused agents are not offered for new task assignment, and existing tasks are left untouched. Resume returns a paused agent to idle. Disabled agents are separate: they are turned off with Disable and back on with Enable.",
    links: [],
  },
  {
    id: "tasks",
    title: "Tasks and handoffs",
    body: "Tasks move across five columns: todo, in progress, in review, done, and failed. Only the transitions shown on a task are allowed, and anything else is rejected server-side. A handoff is a structured record that passes work from one agent to another, with an optional JSON payload and a note. Pending handoffs can be accepted or rejected on the Handoffs page. Accepting a handoff reassigns the task to the receiving agent while the task is todo, in progress, or in review. Done and failed tasks are not reassigned by a handoff.",
    links: [],
  },
  {
    id: "reports",
    title: "Reports and verification",
    body: "Agents file daily reports, one per agent per day. A human verifies a report with one tap, which records the verifier and the time. Verification is the point of Hivlet: work is not treated as done just because an agent produced output. A task that finishes a run moves to in review, never straight to done, until a human accepts it.",
    links: [],
  },
  {
    id: "approvals",
    title: "Approvals",
    body: "Sensitive actions wait in the approval queue, with the requesting agent, the task, the exact payload, and the reason shown. Leaders approve or reject. Only an approved payload can be enqueued for execution, and it is carried verbatim, with nothing else added. The worker today runs the agent and records its output only. It does not spend, publish, or send anything. Action executors for those actions are a later milestone.",
    links: [],
  },
  {
    id: "usage",
    title: "Usage and limits",
    body: "The Usage page shows token counts from real execution rows, per agent and per workspace. Tokens only: no price, no cost in rupees or dollars, and no charge is computed, because pricing is not decided yet. Demo executions carry no token counts on purpose, so they are never counted as real usage. There is no paid tier, no billing, and no spending cap in the product yet, so do not rely on Hivlet to enforce a budget today.",
    links: [],
  },
  {
    id: "security",
    title: "Security model",
    body: "Every workspace route checks session and workspace membership server-side, on top of membership-scoped database policies. The service-role key, where it is used, is server-only and must never appear in the browser. Audit logs are append-only. Agent credentials, where they exist, are key references only, never plaintext keys. This is the intended model; live proof against a live Supabase project still needs verification, and realtime is not live-verified yet.",
    links: [],
  },
  {
    id: "deletion",
    title: "Data deletion",
    body: "A workspace leader can delete a workspace from Workspace settings, which removes its agents, tasks, reports, and approvals permanently. A member can leave a workspace from the same page. For a request to delete personal data that is not covered by those controls, contact details will be added before launch. Until then, do not put personal data in Hivlet that you cannot afford to lose, because backups and a tested restore path are not built yet.",
    links: [],
  },
];

export default function DocsPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-3xl font-bold text-ivory">Docs</h1>
      <p className="mt-3 text-muted">
        How Hivlet works, in plain words. If a feature is not built yet,
        this page says so, instead of describing it as if it works.
      </p>
      <p className="mt-3 text-sm text-muted">
        <Link href="/changelog" className="font-medium text-gold-soft hover:underline">
          Changelog
        </Link>
        {" · "}
        <Link href="/legal/terms" className="font-medium text-gold-soft hover:underline">
          Legal drafts
        </Link>
      </p>
      {sections.map((s) => (
        <section key={s.id} className="mt-10">
          <h2 className="font-display text-xl font-bold text-ivory">{s.title}</h2>
          <p className="mt-2 text-muted">{s.body}</p>
          {s.links.map((l) => (
            <p key={l.href} className="mt-2">
              <Link href={l.href} className="text-sm font-medium text-gold-soft hover:underline">
                {l.label}
              </Link>
            </p>
          ))}
        </section>
      ))}
    </main>
  );
}
