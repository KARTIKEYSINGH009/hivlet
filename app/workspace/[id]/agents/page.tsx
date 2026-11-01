import Link from "next/link";
import { revalidatePath } from "next/cache";
import { requireWorkspace, isLeader } from "@/lib/workspace";
import {
  PageHeader,
  EmptyState,
  AgentStatusPill,
} from "@/components/workspace-ui";
import { SQUAD_TEMPLATES, getSquadTemplate } from "@/lib/squad-templates";
import { logTaskEvent } from "@/lib/events";

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

// Agent pause and resume. This reuses the existing 'paused' status, which
// is already in the agents status check and in AgentStatusPill, so no
// new status and no migration is needed. Pause is only allowed from
// idle, and resume returns the agent to idle. Disabled agents are not
// paused or resumed here; they use Enable and Disable. Paused agents are
// excluded from new task assignment on the Tasks page, but existing
// tasks are left untouched, so pausing never deletes or rewrites work.
async function pauseAgent(workspaceId: string, formData: FormData) {
  "use server";
  const { supabase, membership } = await requireWorkspace(workspaceId);
  if (!isLeader(membership)) return;
  const agentId = String(formData.get("agent_id") ?? "");
  const { data: agent } = await supabase
    .from("agents")
    .select("id, status")
    .eq("id", agentId)
    .eq("workspace_id", workspaceId)
    .single();
  if (!agent || agent.status !== "idle") return;
  await supabase
    .from("agents")
    .update({ status: "paused" })
    .eq("id", agentId)
    .eq("workspace_id", workspaceId);
  revalidatePath(`/workspace/${workspaceId}/agents`);
}

async function resumeAgent(workspaceId: string, formData: FormData) {
  "use server";
  const { supabase, membership } = await requireWorkspace(workspaceId);
  if (!isLeader(membership)) return;
  const agentId = String(formData.get("agent_id") ?? "");
  const { data: agent } = await supabase
    .from("agents")
    .select("id, status")
    .eq("id", agentId)
    .eq("workspace_id", workspaceId)
    .single();
  if (!agent || agent.status !== "paused") return;
  await supabase
    .from("agents")
    .update({ status: "idle" })
    .eq("id", agentId)
    .eq("workspace_id", workspaceId);
  revalidatePath(`/workspace/${workspaceId}/agents`);
}

// One-click squad template. Leaders only. Creates the template's agents
// (provider custom, no credentials, no model) and then its tasks, each
// assigned to the agent created from the matching definition. Every
// task creation is logged as a task_created event. No provider call, no
// spend, no publish, no send.
async function createSquad(workspaceId: string, formData: FormData) {
  "use server";
  const { supabase, membership } = await requireWorkspace(workspaceId);
  if (!isLeader(membership)) return;
  const template = getSquadTemplate(String(formData.get("template_key") ?? ""));
  if (!template) return;
  const createdAgentIds: string[] = [];
  for (const def of template.agents) {
    const { data } = await supabase
      .from("agents")
      .insert({
        workspace_id: workspaceId,
        member_id: membership.id,
        name: def.name,
        role: def.role,
        provider: "custom",
        model: null,
        system_prompt: def.systemPrompt,
        allowed_tools: [],
        status: "idle",
      })
      .select("id")
      .single();
    if (data) createdAgentIds.push(data.id);
  }
  for (const def of template.tasks) {
    const agentId = createdAgentIds[def.agentIndex] ?? null;
    const { data } = await supabase
      .from("tasks")
      .insert({
        workspace_id: workspaceId,
        title: def.title,
        description: def.description,
        priority: def.priority,
        assigned_agent_id: agentId,
        created_by_member_id: membership.id,
        status: "todo",
      })
      .select("id")
      .single();
    if (data) {
      await logTaskEvent(supabase, {
        workspaceId,
        taskId: data.id,
        eventType: "task_created",
        memberId: membership.id,
        detail: { title: def.title, assigned_agent_id: agentId, template: template.key },
      });
    }
  }
  revalidatePath(`/workspace/${workspaceId}/agents`);
  revalidatePath(`/workspace/${workspaceId}/tasks`);
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
    "mt-1 w-full rounded-lg border border-white/15 bg-coal px-3 py-3 text-base text-ivory focus:border-gold";

  return (
    <div>
      <PageHeader
        title="Agents"
        description={`AI agents working in ${workspace.name}. Leaders configure them; members see what each agent is doing.`}
      />

      {leader && (
        <section className="mt-8 rounded-xl border border-white/10 bg-coal p-5">
          <h2 className="font-semibold text-ivory">Add an agent</h2>
          <form
            action={createAgent.bind(null, id)}
            className="mt-4 grid gap-3 sm:grid-cols-2"
          >
            <div>
              <label htmlFor="agent-name" className="text-sm font-medium text-ivory">Agent name</label>
              <input id="agent-name" name="name" required placeholder="Agent name" className={inputCls} />
            </div>
            <div>
              <label htmlFor="agent-role" className="text-sm font-medium text-ivory">Role</label>
              <input id="agent-role" name="role" placeholder="Role (e.g. Researcher)" className={inputCls} />
            </div>
            <div>
              <label htmlFor="agent-provider" className="text-sm font-medium text-ivory">Provider</label>
              <select id="agent-provider" name="provider" className={inputCls} defaultValue="custom">
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic</option>
                <option value="gemini">Google Gemini</option>
                <option value="groq">Groq</option>
                <option value="custom">Custom / other</option>
              </select>
            </div>
            <div>
              <label htmlFor="agent-model" className="text-sm font-medium text-ivory">Model</label>
              <input id="agent-model" name="model" placeholder="Model (e.g. gpt-4o)" className={inputCls} />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="agent-instructions" className="text-sm font-medium text-ivory">Instructions</label>
              <textarea
                id="agent-instructions"
                name="system_prompt"
                placeholder="Instructions for this agent"
                className={inputCls}
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="agent-tools" className="text-sm font-medium text-ivory">Allowed tools</label>
              <input
                id="agent-tools"
                name="allowed_tools"
                placeholder="Allowed tools, comma-separated (e.g. web_search, file_read)"
                className={inputCls}
              />
            </div>
            <button
              type="submit"
              className="w-fit rounded-lg bg-gold px-5 py-3 text-sm font-medium text-ink hover:bg-gold-soft sm:col-span-2"
            >
              Add agent
            </button>
          </form>
          <p className="mt-3 text-xs text-muted">
            No credentials are stored here. Provider keys are connected through
            the secure vault in a later milestone.
          </p>
        </section>
      )}

      {leader && (
        <section className="mt-8 rounded-xl border border-white/10 bg-coal p-5">
          <h2 className="font-semibold text-ivory">Squad templates</h2>
          <p className="mt-1 text-sm text-muted">
            One click creates the template agents and their starter tasks.
            No provider call, no spend, no publish, no send. Running a
            template again creates a second set, so check the list below
            before clicking twice.
          </p>
          <div className="mt-4 space-y-4">
            {SQUAD_TEMPLATES.map((t) => (
              <div
                key={t.key}
                className="rounded-xl border border-white/10 bg-raised p-4"
              >
                <p className="font-medium text-ivory">{t.name}</p>
                <p className="mt-1 text-sm text-muted">{t.description}</p>
                <p className="mt-2 text-xs text-muted">
                  Agents: {t.agents.map((a) => a.name).join(", ")} · Tasks:{" "}
                  {t.tasks.map((task) => task.title).join(", ")}
                </p>
                <form action={createSquad.bind(null, id)} className="mt-3">
                  <input type="hidden" name="template_key" value={t.key} />
                  <button
                    type="submit"
                    className="rounded-lg bg-gold px-4 py-2 text-sm font-medium text-ink hover:bg-gold-soft"
                  >
                    Create {t.name}
                  </button>
                </form>
              </div>
            ))}
          </div>
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
            className="rounded-xl border border-white/10 bg-coal p-5"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <Link
                  href={`/workspace/${id}/agents/${a.id}`}
                  className="font-semibold text-ivory hover:underline"
                >
                  {a.name}
                </Link>
                <p className="mt-0.5 text-sm text-muted">
                  {a.role ?? "No role"} · {a.provider}
                  {a.model ? ` · ${a.model}` : ""}
                </p>
              </div>
              <AgentStatusPill status={a.status} />
            </div>
            <p className="mt-3 text-sm text-muted">
              Current task:{" "}
              {currentTasks.get(a.id) ?? "Nothing assigned right now"}
            </p>
            <p className="mt-1 text-xs text-muted">
              Usage: {doneCounts.get(a.id) ?? 0} done /{" "}
              {totalCounts.get(a.id) ?? 0} tasks total
              {a.allowed_tools && a.allowed_tools.length > 0
                ? ` · Tools: ${a.allowed_tools.join(", ")}`
                : " · No tools allowed"}
            </p>
            {leader && (
              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-white/10 pt-4">
                {a.status === "disabled" ? (
                  <form
                    action={setAgentStatus.bind(null, id, a.id, "idle")}
                  >
                    <button
                      type="submit"
                      className="rounded-lg bg-gold px-3 py-1.5 text-xs font-medium text-ink hover:bg-gold-soft"
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
                      className="rounded-lg border border-white/15 bg-coal px-3 py-1.5 text-xs font-medium text-muted hover:border-gold"
                    >
                      Disable
                    </button>
                  </form>
                )}
                {a.status === "paused" && (
                  <form action={resumeAgent.bind(null, id)}>
                    <input type="hidden" name="agent_id" value={a.id} />
                    <button
                      type="submit"
                      className="rounded-lg bg-gold px-3 py-1.5 text-xs font-medium text-ink hover:bg-gold-soft"
                    >
                      Resume
                    </button>
                  </form>
                )}
                {a.status === "idle" && (
                  <form action={pauseAgent.bind(null, id)}>
                    <input type="hidden" name="agent_id" value={a.id} />
                    <button
                      type="submit"
                      className="rounded-lg border border-white/15 bg-coal px-3 py-1.5 text-xs font-medium text-muted hover:border-gold"
                    >
                      Pause
                    </button>
                  </form>
                )}
                {a.status === "paused" && (
                  <span className="text-xs text-muted">
                    Paused agents are not offered for new task assignment.
                    Existing tasks are left untouched.
                  </span>
                )}
                <details className="w-full">
                  <summary className="cursor-pointer text-xs font-medium text-muted">
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
                      <option value="groq">Groq</option>
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
                      className="w-fit rounded-lg border border-white/15 bg-coal px-4 py-2 text-sm font-medium text-muted hover:border-gold sm:col-span-2"
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
