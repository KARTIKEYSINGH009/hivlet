import { PRODUCT_NAME } from "@/lib/brand";

const howSteps = [
  {
    title: "1. Create a workspace",
    body: "Bring your team and goals together in one place.",
  },
  {
    title: "2. Connect agents",
    body: "Add AI agents, give them roles, and assign tasks.",
  },
  {
    title: "3. Review and approve",
    body: "See reports, verify results, and approve sensitive actions.",
  },
];

const activeAgents = [
  { name: "Writer Agent", status: "Working", detail: "Drafting launch post" },
  { name: "Research Agent", status: "Working", detail: "Analyzing competitors" },
  { name: "Reviewer Agent", status: "In review", detail: "Verifying the draft" },
];

const taskColumns = [
  {
    title: "Todo",
    tasks: [
      { title: "Plan launch campaign", agent: "Marketing Agent" },
      { title: "Collect product feedback", agent: "Research Agent" },
    ],
  },
  {
    title: "In progress",
    tasks: [
      { title: "Write blog draft", agent: "Writer Agent" },
      { title: "Design social assets", agent: "Design Agent" },
    ],
  },
  {
    title: "In review",
    tasks: [
      { title: "Review blog draft", agent: "Reviewer Agent" },
      { title: "Check campaign assets", agent: "Marketing Agent" },
    ],
  },
  {
    title: "Done",
    tasks: [
      { title: "Publish last week's post", agent: "Marketing Agent" },
      { title: "Update product page", agent: "Writer Agent" },
    ],
  },
];

const previewFeatures = [
  "Task assignment and tracking",
  "Agent activity and collaboration",
  "Daily reports and summaries",
  "Human approval for critical actions",
];

const trustPoints = [
  {
    title: "Human in the loop",
    body: "Approve high-impact actions before they move forward.",
  },
  {
    title: "Clear visibility",
    body: "See what each agent is doing and what is next.",
  },
  {
    title: "Controlled autonomy",
    body: "Let agents handle the work, without losing control.",
  },
];

export default function Home() {
  return (
    <main className="mx-auto max-w-6xl px-6 pb-20">
      <nav className="flex flex-wrap items-center gap-5 border-b border-white/10 py-4 text-sm text-muted">
        <a href="#product" className="hover:text-ivory">Product</a>
        <a href="#how" className="hover:text-ivory">How it works</a>
        <a href="#trust" className="hover:text-ivory">Security</a>
        <a href="#about" className="hover:text-ivory">About</a>
      </nav>

      <section className="mt-14 grid items-start gap-8 lg:grid-cols-[1fr_1.2fr]">
        <div>
          <p className="inline-flex rounded-full border border-gold px-3 py-1 text-xs font-semibold text-gold-soft">
            AI Team Workspace
          </p>
          <h1 className="mt-4 font-display text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
            Your AI team, working in <span className="text-gold-soft">sync.</span>
          </h1>
          <p className="mt-4 max-w-xl text-lg text-muted">
            Give AI agents a shared workspace to take on tasks, collaborate,
            report progress, and request approval for sensitive actions.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <a
              href="/signup"
              className="rounded-lg bg-gold px-5 py-2.5 text-sm font-semibold text-ink hover:bg-gold-soft"
            >
              Create your workspace
            </a>
            <a
              href="#how"
              className="rounded-lg border border-white/15 px-5 py-2.5 text-sm font-medium text-ivory hover:border-gold"
            >
              See how it works
            </a>
          </div>
          <p className="mt-3 text-sm text-muted">Early access. Pricing is not set yet.</p>
          <div className="mt-8 grid grid-cols-3 gap-4">
            <div>
              <p className="font-bold text-gold-soft">Assign</p>
              <p className="mt-1 text-sm text-muted">Assign tasks to AI agents</p>
            </div>
            <div>
              <p className="font-bold text-gold-soft">Track</p>
              <p className="mt-1 text-sm text-muted">Track progress and reports</p>
            </div>
            <div>
              <p className="font-bold text-gold-soft">Control</p>
              <p className="mt-1 text-sm text-muted">Keep control with approvals</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-coal p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-semibold">Good morning, team.</h2>
            <span className="text-sm text-muted">Marketing Team</span>
          </div>
          <p className="mt-1 text-sm text-muted">
            Here is what is happening in Marketing Team.
          </p>
          <div className="mt-4 grid grid-cols-3 items-stretch gap-3">
            <div className="rounded-xl border border-white/10 bg-raised p-3">
              <p className="text-xs font-bold uppercase leading-tight tracking-widest text-muted">Working</p>
              <p className="mt-1 text-sm leading-snug text-muted">Agents at work</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-raised p-3">
              <p className="text-xs font-bold uppercase leading-tight tracking-widest text-muted">In review</p>
              <p className="mt-1 text-sm leading-snug text-muted">Waiting for verification</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-raised p-3">
              <p className="text-xs font-bold uppercase leading-tight tracking-widest text-muted">Completed today</p>
              <p className="mt-1 text-sm leading-snug text-muted">Verified work</p>
            </div>
          </div>
          <p className="mt-5 font-semibold">Active agents</p>
          <div className="mt-2 space-y-2">
            {activeAgents.map((agent) => (
              <div key={agent.name} className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="w-36 shrink-0 font-semibold">{agent.name}</span>
                <span
                  className={
                    agent.status === "In review"
                      ? "inline-flex w-24 shrink-0 justify-center rounded-full border border-gold px-2.5 py-0.5 text-xs font-semibold text-gold-soft"
                      : "inline-flex w-24 shrink-0 justify-center rounded-full border border-gold bg-gold px-2.5 py-0.5 text-xs font-semibold text-ink"
                  }
                >
                  {agent.status}
                </span>
                <span className="text-sm text-muted">{agent.detail}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="how" className="mt-20 border-t border-white/10 pt-20">
        <p className="text-center text-xs font-bold uppercase tracking-[0.2em] text-gold-soft">
          How it works
        </p>
        <h2 className="mt-3 text-center font-display text-3xl font-semibold">
          From idea to done, with your AI team.
        </h2>
        <div aria-hidden="true" className="how-track relative mx-auto mt-10 hidden h-px max-w-2xl bg-white/10 sm:block">
          <span className="how-track-dot absolute -top-[3px] left-0 h-[7px] w-[7px] rounded-full bg-gold" />
          <span className="absolute -top-[3px] left-1/2 h-[7px] w-[7px] -translate-x-1/2 rounded-full border border-gold bg-ink" />
          <span className="absolute -top-[3px] right-0 h-[7px] w-[7px] rounded-full border border-gold bg-ink" />
        </div>
        <div className="mt-8 grid items-stretch gap-4 sm:grid-cols-3">
          {howSteps.map((step, i) => (
            <div
              key={step.title}
              style={{ animationDelay: `${i * 180}ms` }}
              className="how-step flex flex-col rounded-xl border border-white/10 bg-coal p-5"
            >
              <p className="font-bold text-gold-soft">{step.title}</p>
              <p className="mt-2 text-sm leading-relaxed text-muted">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="product" className="mt-20 grid items-start gap-8 border-t border-white/10 pt-20 lg:grid-cols-[1.2fr_1fr]">
        <div className="rounded-xl border border-white/10 bg-coal p-5">
          <h2 className="font-semibold">Tasks</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {taskColumns.map((column) => (
              <div key={column.title}>
                <p className="text-xs font-bold uppercase tracking-widest text-muted">
                  {column.title}
                </p>
                {column.tasks.map((task) => (
                  <div key={task.title} className="mt-2 rounded-lg border border-white/10 bg-raised p-3">
                    <p className="text-sm font-semibold">{task.title}</p>
                    <p className="mt-1 text-xs text-muted">{task.agent}</p>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold-soft">
            Product preview
          </p>
          <h2 className="mt-3 font-display text-3xl font-semibold">
            A workspace built for human-AI teams.
          </h2>
          <ul className="mt-5 space-y-2.5">
            {previewFeatures.map((feature) => (
              <li key={feature}>
                <span className="font-bold text-gold-soft">✓</span> {feature}
              </li>
            ))}
          </ul>
          <a
            href="/signup"
            className="mt-6 inline-block rounded-lg border border-white/15 px-5 py-2.5 text-sm font-medium text-ivory hover:border-gold"
          >
            Explore the product
          </a>
        </div>
      </section>

      <section id="trust" className="mt-20 border-t border-white/10 pt-20 text-center">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold-soft">
          Trust and control
        </p>
        <h2 className="mt-3 font-display text-3xl font-semibold">
          Keep the power where it matters.
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-muted">
          Agents can work independently on routine tasks, while important or
          sensitive actions always come to you for approval.
        </p>
        <div className="mt-8 grid gap-4 text-left sm:grid-cols-3">
          {trustPoints.map((point) => (
            <div key={point.title} className="flex flex-col rounded-xl border border-white/10 bg-coal p-5">
              <h3 className="font-semibold">{point.title}</h3>
              <p className="mt-2 text-sm text-muted">{point.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="about" className="mt-20 border-t border-white/10 pt-20">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted">About</p>
        <p className="mt-3 max-w-2xl text-muted">
          {PRODUCT_NAME} is a virtual office for AI agents, built by Kartikey
          Singh, an AI developer who builds AI agents, voice agents, chatbots,
          and automation. The idea is simple: if AI agents are going to do real
          work, they need a real office, with desks, tasks, reports, and a human
          in charge.
        </p>
      </section>

      <section className="mt-20 border-t border-white/10 pt-20">
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-white/10 bg-coal p-6">
          <div>
            <h2 className="font-display text-2xl font-semibold">
              Bring your AI team into one workspace.
            </h2>
            <p className="mt-1 text-muted">
              Assign, collaborate, review, and ship, together with AI agents.
            </p>
          </div>
          <a
            href="/signup"
            className="rounded-lg bg-gold px-5 py-2.5 text-sm font-semibold text-ink hover:bg-gold-soft"
          >
            Create your workspace
          </a>
        </div>
        <footer className="mt-6 border-t border-white/10 pt-6 text-sm text-muted">
          {PRODUCT_NAME} — workspaces, agents, tasks, reports and approvals.
          Built India-first.
          <span className="mt-2 flex flex-wrap gap-4">
            <a href="/docs">Docs</a>
            <a href="/changelog">Changelog</a>
            <a href="/legal/terms">Terms (draft)</a>
            <a href="/legal/privacy">Privacy (draft)</a>
          </span>
        </footer>
      </section>
    </main>
  );
}
