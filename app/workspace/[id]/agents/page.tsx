import Link from "next/link";
import { revalidatePath } from "next/cache";
import { requireWorkspace, isLeader } from "@/lib/workspace";
import {
  PageHeader,
  EmptyState,
  AgentStatusPill,
} from "@/components/workspace-ui";

// Agent management. Leaders create, edit, and disable agents; members can
// view. No API keys are ever stored here — agents reference a provider +
// model, and credentials live in a later milestone's secure vault.
async function createAgent(workspaceId: string, formData: FormData) {
  "use server";
  const { supabase, membership } = await requireWorkspace(workspaceId);
  if (!isLeader(membership)) return;
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  const tools = String(formData.get("allowed_tools") ?? "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  await supabase.from("agents").insert({
    workspace_id: workspaceId,
    member_id: membership.id,
    name,
    role: String(formData.get("role") ?? "").trim() || null,
    provider: String(formData.get("provider") ?? "custom"),
    model: String(formData.get("model") ?? "").trim() || null,
    system_prompt: String(formData.get("system_prompt") ?? "").trim() || null,
    allowed_tools: tools,
    status: "idle",
  });
  revalidatePath(`/workspace/${workspaceId}/agents`);
}

async function updateAgent(workspaceId: string, formData: FormData) {
  "use server";
  const { supabase, membership } = await requireWorkspace(workspaceId);
  if (!isLeader(membership)) return;
  const agentId = String(formData.get("agent_id") ?? "");
  const tools = String(formData.get("allowed_tools") ?? "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  await supabase
    .from("agents")
    .update({
      name: String(formData.get("name") ?? "").trim(),
      role: String(formData.get("role") ?? "").trim() || null,
      provider: String(formData.get("provider") ?? "custom"),
      model: String(formData.get("model") ?? "").trim() || null,
      system_prompt: String(formData.get("system_prompt") ?? "").trim() || null,
      allowed_tools: tools,
    })
    .eq("id", agentId)
    .eq("workspace_id", workspaceId);
  revalidatePath(`/workspace/${workspaceId}/agents`);
}

async function setAgentStatus(
  workspaceId: string,
  agentId: string,
  status: string
) {
  "use server";
  const { supabase, membership } = await requireWorkspace(workspaceId);
  if (!isLeader(membership)) return;
  await supabase
    .from("agents")
    .update({ status })
    .eq("id", agentId)
    .eq("workspace_id", workspaceId);
  revalidatePath(`/workspace/${workspaceId}/agents`);
}

export default async function AgentsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, workspace, membership } = await requireWorkspace(id);
  const leader = isLeader(membership);

  const { data: agents } = await supabase
    .from("agents")
    .select("id, name, role, provider, model, system_prompt, allowed_tools, status, created_at")
    .eq("workspace_id", id)
    .order("created_at", { ascending: false });
  const agentList = (agents ?? []) as {
    id: string;
    name: string;
    role: string | null;
    provider: string;
    model: string | null;
    system_prompt: string | null;
    allowed_tools: string[] | null;
    status: string;
    created_at: string;
  }[];

  // Current task + usage per agent, computed from real rows.
  const agentIds = agentList.map((a) => a.id);
  let currentTasks = new Map<string, string>();
  let doneCounts = new Map<string, number>();
  let totalCounts = new Map<string, number>();
  if (agentIds.length > 0) {
    const { data: tasks } = await supabase
      .from("tasks")
      .select("id, title, status, assigned_agent_id")
      .in("assigned_agent_id", agentIds);
    for (const t of (tasks ?? []) as {
      title: string;
      status: string;
      assigned_agent_id: string | null;
    }[]) {
      if (!t.assigned_agent_id) continue;
      totalCounts.set(
        t.assigned_agent_id,
        (totalCounts.get(t.assigned_agent_id) ?? 0) + 1
      );
      if (t.status === "done") {
        doneCounts.set(
          t.assigned_agent_id,
          (doneCounts.get(t.assigned_agent_id) ?? 0) + 1
        );
      }
      if (
        (t.status === "in_progress" || t.status === "in_review") &&
        !currentTasks.has(t.assigned_agent_id)
      ) {
        currentTasks.set(t.assigned_agent_id, t.title);
      }
    }
  }

  const inputCls =
    "mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:border-stone-900 focus:outline-none";

  return (
    <div>
      <PageHeader
        title="Agents"
        description={`AI agents working in ${workspace.name}. Leaders configure them; members see what each agent is doing.`}
      />

      {leader && (
        <section className="mt-8 rounded-xl border border-stone-200 bg-white p-5">
          <h2 className="font-semibold text-stone-900">Add an agent</h2>
          <form
            action={createAgent.bind(null, id)}
            className="mt-4 grid gap-3 sm:grid-cols-2"
          >
            <input name="name" required placeholder="Agent name" className={inputCls} />
            <input name="role" placeholder="Role (e.g. Researcher)" className={inputCls} />
            <select name="provider" className={inputCls} defaultValue="custom">
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
              <option value="gemini">Google Gemini</option>
              <option value="custom">Custom / other</option>
            </select>
            <input name="model" placeholder="Model (e.g. gpt-4o)" className={inputCls} />
            <textarea
              name="system_prompt"
              placeholder="Instructions for this agent"
              className={`${inputCls} sm:col-span-2`}
            />
            <input
              name="allowed_tools"
              placeholder="Allowed tools, comma-separated (e.g. web_search, file_read)"
              className={`${inputCls} sm:col-span-2`}
            />
            <button
              type="submit"
              className="w-fit rounded-lg bg-stone-900 px-5 py-2 text-sm font-medium text-white hover:bg-stone-700 sm:col-span-2"
            >
              Add agent
            </button>
          </form>
          <p className="mt-3 text-xs text-stone-500">
            No credentials are stored here. Provider keys are connected through
            the secure vault in a later milestone.
          </p>
        </section>
      )}

      <section className="mt-8 space-y-4">
        {agentList.length === 0 && (
          <EmptyState
            title="No agents yet"
            hint="Add your first agent above — researchers, writers, reviewers, or any role your team needs."
          />
        )}
        {agentList.map((a) => (
          <article
            key={a.id}
            className="rounded-xl border border-stone-200 bg-white p-5"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <Link
                  href={`/workspace/${id}/agents/${a.id}`}
                  className="font-semibold text-stone-900 hover:underline"
                >
                  {a.name}
                </Link>
                <p className="mt-0.5 text-sm text-stone-500">
                  {a.role ?? "No role"} · {a.provider}
                  {a.model ? ` · ${a.model}` : ""}
                </p>
              </div>
              <AgentStatusPill status={a.status} />
            </div>
            <p className="mt-3 text-sm text-stone-600">
              Current task:{" "}
              {currentTasks.get(a.id) ?? "Nothing assigned right now"}
            </p>
            <p className="mt-1 text-xs text-stone-500">
              Usage: {doneCounts.get(a.id) ?? 0} done /{" "}
              {totalCounts.get(a.id) ?? 0} tasks total
              {a.allowed_tools && a.allowed_tools.length > 0
                ? ` · Tools: ${a.allowed_tools.join(", ")}`
                : " · No tools allowed"}
            </p>
            {leader && (
              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-stone-100 pt-4">
                {a.status === "disabled" ? (
                  <form
                    action={setAgentStatus.bind(null, id, a.id, "idle")}
                  >
                    <button
                      type="submit"
                      className="rounded-lg bg-stone-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-stone-700"
                    >
                      Enable
                    </button>
                  </form>
                ) : (
                  <form
                    action={setAgentStatus.bind(null, id, a.id, "disabled")}
                  >
                    <button
                      type="submit"
                      className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 hover:border-stone-500"
                    >
                      Disable
                    </button>
                  </form>
                )}
                <details className="w-full">
                  <summary className="cursor-pointer text-xs font-medium text-stone-600">
                    Edit agent
                  </summary>
                  <form
                    action={updateAgent.bind(null, id)}
                    className="mt-3 grid gap-3 sm:grid-cols-2"
                  >
                    <input type="hidden" name="agent_id" value={a.id} />
                    <input name="name" defaultValue={a.name} className={inputCls} />
                    <input
                      name="role"
                      defaultValue={a.role ?? ""}
                      className={inputCls}
                    />
                    <select
                      name="provider"
                      defaultValue={a.provider}
                      className={inputCls}
                    >
                      <option value="openai">OpenAI</option>
                      <option value="anthropic">Anthropic</option>
                      <option value="gemini">Google Gemini</option>
                      <option value="custom">Custom / other</option>
                    </select>
                    <input
                      name="model"
                      defaultValue={a.model ?? ""}
                      className={inputCls}
                    />
                    <textarea
                      name="system_prompt"
                      defaultValue={a.system_prompt ?? ""}
                      className={`${inputCls} sm:col-span-2`}
                    />
                    <input
                      name="allowed_tools"
                      defaultValue={(a.allowed_tools ?? []).join(", ")}
                      className={`${inputCls} sm:col-span-2`}
                    />
                    <button
                      type="submit"
                      className="w-fit rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 hover:border-stone-500 sm:col-span-2"
                    >
                      Save changes
                    </button>
                  </form>
                </details>
              </div>
            )}
          </article>
        ))}
      </section>
    </div>
  );
}
