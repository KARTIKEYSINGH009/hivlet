import { requireWorkspace } from "@/lib/workspace";
import {
  PageHeader,
  MetricCard,
  EmptyState,
} from "@/components/workspace-ui";

// Token usage dashboard. Tokens only, never money: no price, no cost in
// rupees or dollars, and no billing charge is computed here, because
// pricing is not decided yet. Demo executions carry null token counts
// on purpose, so they are counted separately and never mixed into real
// token totals as if they were real model runs. If the task_executions
// table does not exist yet on an older database, this page shows an
// empty state instead of breaking.

type ExecutionRow = {
  agent_id: string;
  status: string;
  is_demo: boolean;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  total_tokens: number | null;
};

export default async function UsagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, workspace } = await requireWorkspace(id);

  const { data: agents } = await supabase
    .from("agents")
    .select("id, name, role, status")
    .eq("workspace_id", id)
    .order("name");
  const agentList = (agents ?? []) as {
    id: string;
    name: string;
    role: string | null;
    status: string;
  }[];
  const agentName = new Map(agentList.map((a) => [a.id, a.name]));

  let executions: ExecutionRow[] = [];
  let tableMissing = false;
  try {
    const x = await supabase
      .from("task_executions")
      .select(
        "agent_id, status, is_demo, prompt_tokens, completion_tokens, total_tokens"
      )
      .eq("workspace_id", id);
    if (x.error) {
      tableMissing = true;
    } else {
      executions = (x.data ?? []) as ExecutionRow[];
    }
  } catch {
    tableMissing = true;
  }

  const real = executions.filter((x) => !x.is_demo);
  const demo = executions.filter((x) => x.is_demo);
  const sum = (rows: ExecutionRow[], key: keyof ExecutionRow) =>
    rows.reduce((acc, r) => acc + ((r[key] as number | null) ?? 0), 0);
  const realPrompt = sum(real, "prompt_tokens");
  const realCompletion = sum(real, "completion_tokens");
  const realTotal = sum(real, "total_tokens");

  const perAgent = agentList.map((a) => {
    const rows = real.filter((x) => x.agent_id === a.id);
    return {
      id: a.id,
      name: a.name,
      role: a.role,
      status: a.status,
      executions: rows.length,
      prompt: sum(rows, "prompt_tokens"),
      completion: sum(rows, "completion_tokens"),
      total: sum(rows, "total_tokens"),
    };
  });

  return (
    <div>
      <PageHeader
        title="Usage"
        description={`Token usage for ${workspace.name}. Tokens only. No costs are shown, because pricing is not decided yet, and no charge is made here.`}
      />

      {tableMissing ? (
        <div className="mt-8">
          <EmptyState
            title="Usage is not available yet"
            hint="The task_executions table is missing on this database. Run the execution migration (003) in the live migration order, then return here."
          />
        </div>
      ) : (
        <>
          <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard label="Real executions" value={real.length} />
            <MetricCard label="Prompt tokens" value={realPrompt} />
            <MetricCard label="Completion tokens" value={realCompletion} />
            <MetricCard label="Total tokens" value={realTotal} />
          </section>
          <p className="mt-3 text-xs text-muted">
            Demo executions: {demo.length}. Demo runs carry no token counts
            on purpose, so they are never counted as real usage. Succeeded,
            failed, queued, and running real executions are all counted
            above; only rows with token counts contribute to token totals.
          </p>

          <section className="mt-10">
            <h2 className="font-semibold text-ivory">Per agent</h2>
            <div className="mt-3 space-y-3">
              {perAgent.length === 0 && (
                <EmptyState
                  title="No agents yet"
                  hint="Add an agent from the Agents page, then its usage will appear here once it has real executions."
                />
              )}
              {perAgent.map((a) => (
                <div
                  key={a.id}
                  className="rounded-xl border border-white/10 bg-coal p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-ivory">{a.name}</p>
                      <p className="text-sm text-muted">
                        {a.role ?? "No role"} · {a.status.replace("_", " ")}
                      </p>
                    </div>
                    <p className="text-sm text-muted">
                      {a.executions} real execution
                      {a.executions === 1 ? "" : "s"}
                    </p>
                  </div>
                  <p className="mt-3 text-sm text-muted">
                    Prompt {a.prompt} tokens · Completion {a.completion}{" "}
                    tokens · Total {a.total} tokens
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-10 rounded-xl border border-white/10 bg-coal p-5">
            <h2 className="font-semibold text-ivory">
              Workspace total, tokens only
            </h2>
            <p className="mt-2 text-sm text-muted">
              {realPrompt} prompt tokens, {realCompletion} completion tokens,{" "}
              {realTotal} total tokens across {real.length} real executions
              in this workspace. No price is applied to these numbers.
            </p>
          </section>
        </>
      )}
    </div>
  );
}
