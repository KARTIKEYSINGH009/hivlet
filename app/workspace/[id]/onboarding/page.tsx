import Link from "next/link";
import { requireWorkspace } from "@/lib/workspace";
import {
  PageHeader,
  EmptyState,
} from "@/components/workspace-ui";

// Guided first run. Every step is checked against real rows in this
// workspace, and every link goes to an existing route. No dead links,
// no invented progress. Steps: workspace created (you are here), add
// an agent, create a task, review a first report. Reports can only be
// filed from the Reports page, which is linked, not claimed as done
// here.
export default async function OnboardingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, workspace } = await requireWorkspace(id);

  const { count: agentCount } = await supabase
    .from("agents")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", id);
  const { count: taskCount } = await supabase
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", id);
  const { count: reportCount } = await supabase
    .from("reports")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", id);

  const steps = [
    {
      title: "1. Workspace created",
      done: true,
      detail: `You are in ${workspace.name}. Invite members from Settings with the share link.`,
      href: `/workspace/${id}/settings`,
      action: "Open settings",
    },
    {
      title: "2. Add an agent",
      done: (agentCount ?? 0) > 0,
      detail:
        "Give an agent a role, a provider, and instructions. No credentials are stored on this page.",
      href: `/workspace/${id}/agents`,
      action: "Add an agent",
    },
    {
      title: "3. Create a task",
      done: (taskCount ?? 0) > 0,
      detail:
        "Assign the task to an agent and move it across the board. Paused and disabled agents are not offered for new tasks.",
      href: `/workspace/${id}/tasks`,
      action: "Create a task",
    },
    {
      title: "4. Review the first report",
      done: (reportCount ?? 0) > 0,
      detail:
        "Agents file daily reports on the Reports page. Verify a report with one tap, and use Approvals for sensitive actions.",
      href: `/workspace/${id}/reports`,
      action: "Open reports",
    },
  ];

  const doneCount = steps.filter((s) => s.done).length;

  return (
    <div>
      <PageHeader
        title="Get started"
        description={`First run for ${workspace.name}. Follow the steps in order, and check each one off with real work, not a demo.`}
      />
      <p className="mt-4 text-sm text-muted">
        {doneCount} of {steps.length} steps done in this workspace.
      </p>
      <section className="mt-8 space-y-4">
        {steps.map((s) => (
          <article
            key={s.title}
            className="rounded-xl border border-white/10 bg-coal p-5"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-medium text-ivory">{s.title}</p>
                <p className="mt-1 text-sm text-muted">{s.detail}</p>
              </div>
              <span className="rounded-full border border-white/15 px-2.5 py-0.5 text-xs font-medium text-muted">
                {s.done ? "Done" : "To do"}
              </span>
            </div>
            <Link
              href={s.href}
              className="mt-4 inline-block rounded-lg bg-gold px-4 py-2 text-sm font-medium text-ink hover:bg-gold-soft"
            >
              {s.action}
            </Link>
          </article>
        ))}
      </section>
      <div className="mt-8">
        <EmptyState
          title="Need the full guide?"
          hint="The Docs page explains workspaces, agents, tasks, handoffs, approvals, limits, security, and data deletion in plain words."
        />
        <p className="mt-3">
          <Link href="/docs" className="text-sm font-medium text-gold-soft hover:underline">
            Open Docs
          </Link>
        </p>
      </div>
    </div>
  );
}
