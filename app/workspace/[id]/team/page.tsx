import { revalidatePath } from "next/cache";
import { requireWorkspace, isLeader } from "@/lib/workspace";
import { logTaskEvent } from "@/lib/events";
import { logAudit } from "@/lib/execution";
import type { HubView } from "@/lib/team-hub";
import TeamHubClient from "@/components/team-hub/team-client";

// Team hub — LOCAL BUILD, connected to the real Supabase design.
// Server component: auth + workspace membership via requireWorkspace
// (the workspace layout also guards this route), then real queries
// mirroring app/dashboard/page.tsx and app/workspace/[id]/overview/page.tsx.
// Migration 010 (projects, tasks.assigned_member_id/project_id,
// workspace_member_capacity) is NOT applied live yet, so every query
// touching a new table/column is wrapped: on error the page still
// renders, with migrationReady=false and an honest banner, instead of
// a 500. Once 010 is run, those fallbacks stop triggering.
//
// Rules carried over from the real task board, not the prototype:
//  * status transitions use the same ALLOWED map as tasks/page.tsx
//  * verification is NOT here: reports are verified on the reports
//    page, and marking a task done here is not verification
//  * approvals are linked, never decided here; the exact payload lives
//    on the approvals page

const ALLOWED: Record<string, string[]> = {
  todo: ["in_progress"],
  in_progress: ["in_review", "failed"],
  in_review: ["done", "in_progress", "failed"],
  done: ["in_progress"],
  failed: ["todo", "in_progress"],
};

const TEAM_PATH = (id: string) => `/workspace/${id}/team`;

async function createTask(workspaceId: string, formData: FormData) {
  "use server";
  const { supabase, membership } = await requireWorkspace(workspaceId);
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;
  const base = {
    workspace_id: workspaceId,
    title,
    description: String(formData.get("description") ?? "").trim() || null,
    priority: String(formData.get("priority") ?? "medium"),
    due_at: String(formData.get("due_at") ?? "") || null,
    assigned_agent_id: String(formData.get("assigned_agent_id") ?? "") || null,
    created_by_member_id: membership.id,
    status: "todo",
  };
  const withHub = {
    ...base,
    assigned_member_id: String(formData.get("assigned_member_id") ?? "") || null,
    project_id: String(formData.get("project_id") ?? "") || null,
  };
  let res = await supabase.from("tasks").insert(withHub).select("id").single();
  if (res.error) {
    // Pre-migration fallback: new columns do not exist yet.
    res = await supabase.from("tasks").insert(base).select("id").single();
  }
  if (!res.error && res.data) {
    await logTaskEvent(supabase, {
      workspaceId,
      taskId: res.data.id,
      eventType: "task_created",
      memberId: membership.id,
      detail: { title },
    });
  }
  revalidatePath(TEAM_PATH(workspaceId));
}

async function updateTask(workspaceId: string, formData: FormData) {
  "use server";
  const { supabase, membership } = await requireWorkspace(workspaceId);
  const taskId = String(formData.get("task_id") ?? "");
  if (!taskId) return;
  const base = {
    title: String(formData.get("title") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim() || null,
    priority: String(formData.get("priority") ?? "medium"),
    due_at: String(formData.get("due_at") ?? "") || null,
    assigned_agent_id: String(formData.get("assigned_agent_id") ?? "") || null,
  };
  const withHub = {
    ...base,
    assigned_member_id: String(formData.get("assigned_member_id") ?? "") || null,
    project_id: String(formData.get("project_id") ?? "") || null,
  };
  const res = await supabase
    .from("tasks")
    .update(withHub)
    .eq("id", taskId)
    .eq("workspace_id", workspaceId);
  if (res.error) {
    await supabase
      .from("tasks")
      .update(base)
      .eq("id", taskId)
      .eq("workspace_id", workspaceId);
  }
  await logTaskEvent(supabase, {
    workspaceId,
    taskId,
    eventType: "task_updated",
    memberId: membership.id,
  });
  revalidatePath(TEAM_PATH(workspaceId));
}

async function changeStatus(
  workspaceId: string,
  next: string,
  eventType: string,
  formData: FormData,
) {
  "use server";
  const { supabase, membership } = await requireWorkspace(workspaceId);
  const taskId = String(formData.get("task_id") ?? "");
  const { data: task } = await supabase
    .from("tasks")
    .select("id, status")
    .eq("id", taskId)
    .eq("workspace_id", workspaceId)
    .single();
  if (!task) return;
  if (!(ALLOWED[task.status] ?? []).includes(next)) return;
  const patch: Record<string, unknown> = { status: next };
  if (next === "done") patch.completed_at = new Date().toISOString();
  if (next === "failed") {
    patch.failure_reason =
      String(formData.get("failure_reason") ?? "").trim() || "Marked failed";
  }
  if (next === "done") {
    patch.result = String(formData.get("result") ?? "").trim() || null;
  }
  await supabase.from("tasks").update(patch).eq("id", taskId);
  await logTaskEvent(supabase, {
    workspaceId,
    taskId,
    eventType,
    memberId: membership.id,
    detail: { from: task.status, to: next },
  });
  revalidatePath(TEAM_PATH(workspaceId));
}

async function createProject(workspaceId: string, formData: FormData) {
  "use server";
  const { supabase, membership } = await requireWorkspace(workspaceId);
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  const { error } = await supabase.from("projects").insert({
    workspace_id: workspaceId,
    name,
    description: String(formData.get("description") ?? "").trim() || null,
    owner_member_id: String(formData.get("owner_member_id") ?? "") || null,
    target_date: String(formData.get("target_date") ?? "") || null,
  });
  if (!error) {
    await logAudit(supabase, {
      workspaceId,
      actorType: "member",
      actorId: membership.id,
      action: "project_created",
      targetType: "project",
      summary: { name },
    });
  }
  revalidatePath(TEAM_PATH(workspaceId));
}

async function updateProject(workspaceId: string, formData: FormData) {
  "use server";
  const { supabase, membership } = await requireWorkspace(workspaceId);
  const projectId = String(formData.get("project_id") ?? "");
  if (!projectId) return;
  await supabase
    .from("projects")
    .update({
      name: String(formData.get("name") ?? "").trim(),
      description: String(formData.get("description") ?? "").trim() || null,
      owner_member_id: String(formData.get("owner_member_id") ?? "") || null,
      target_date: String(formData.get("target_date") ?? "") || null,
    })
    .eq("id", projectId)
    .eq("workspace_id", workspaceId);
  revalidatePath(TEAM_PATH(workspaceId));
}

async function setCapacity(workspaceId: string, formData: FormData) {
  "use server";
  const { supabase, membership } = await requireWorkspace(workspaceId);
  if (!isLeader(membership)) return; // leader-only, RLS is the second layer
  const memberId = String(formData.get("member_id") ?? "");
  const raw = Number(formData.get("capacity"));
  const capacity = Number.isFinite(raw)
    ? Math.min(30, Math.max(1, Math.round(raw)))
    : 5;
  if (!memberId) return;
  await supabase.from("workspace_member_capacity").upsert(
    { workspace_id: workspaceId, member_id: memberId, capacity },
    { onConflict: "workspace_id,member_id" },
  );
  revalidatePath(TEAM_PATH(workspaceId));
}

export default async function TeamHubPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ view?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const view: HubView = (
    ["overview", "work", "projects", "team", "calendar"] as HubView[]
  ).includes(sp.view as HubView)
    ? (sp.view as HubView)
    : "overview";
  const { supabase, user, membership, workspace } = await requireWorkspace(id);
  const leader = isLeader(membership);

  // Tasks: try with migration-010 columns first, fall back without them.
  type TaskRow = {
    id: string;
    title: string;
    description: string | null;
    status: string;
    priority: string | null;
    due_at: string | null;
    assigned_agent_id: string | null;
    assigned_member_id: string | null;
    project_id: string | null;
    created_at: string;
    updated_at: string;
  };
  let taskList: TaskRow[] = [];
  const full = await supabase
    .from("tasks")
    .select(
      "id, title, description, status, priority, due_at, assigned_agent_id, assigned_member_id, project_id, created_at, updated_at",
    )
    .eq("workspace_id", id)
    .order("updated_at", { ascending: false });
  if (!full.error) {
    taskList = (full.data ?? []) as TaskRow[];
  } else {
    const basic = await supabase
      .from("tasks")
      .select(
        "id, title, description, status, priority, due_at, assigned_agent_id, created_at, updated_at",
      )
      .eq("workspace_id", id)
      .order("updated_at", { ascending: false });
    taskList = ((basic.data ?? []) as Omit<TaskRow, "assigned_member_id" | "project_id">[]).map(
      (t) => ({ ...t, assigned_member_id: null, project_id: null }),
    );
  }

  const { data: membersData } = await supabase
    .from("workspace_members")
    .select("id, user_id, role")
    .eq("workspace_id", id)
    .order("created_at");
  const members = (membersData ?? []) as {
    id: string;
    user_id: string;
    role: string;
  }[];

  const { data: agentsData } = await supabase
    .from("agents")
    .select("id, name")
    .eq("workspace_id", id)
    .order("name");
  const agents = (agentsData ?? []) as { id: string; name: string }[];

  const { data: approvalsData } = await supabase
    .from("approvals")
    .select("id, action_type, reason, agent_id, created_at")
    .eq("workspace_id", id)
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  const approvals = (approvalsData ?? []) as {
    id: string;
    action_type: string;
    reason: string | null;
    agent_id: string;
    created_at: string;
  }[];

  const { data: reportsData } = await supabase
    .from("reports")
    .select("id, agent_id, summary, period_date, verified")
    .eq("workspace_id", id)
    .order("created_at", { ascending: false })
    .limit(5);
  const reports = (reportsData ?? []) as {
    id: string;
    agent_id: string;
    summary: string;
    period_date: string;
    verified: boolean;
  }[];

  let events: { id: string; event_type: string; task_id: string; created_at: string }[] = [];
  try {
    const e = await supabase
      .from("task_events")
      .select("id, event_type, task_id, created_at")
      .eq("workspace_id", id)
      .order("created_at", { ascending: false })
      .limit(10);
    if (!e.error) events = (e.data ?? []) as typeof events;
  } catch {
    events = [];
  }

  // Migration-010 tables: absent until 010 is run live.
  let projects: {
    id: string;
    name: string;
    description: string | null;
    owner_member_id: string | null;
    target_date: string | null;
    created_at: string;
  }[] = [];
  let capacities: { member_id: string; capacity: number }[] = [];
  let migrationReady = true;
  try {
    const p = await supabase
      .from("projects")
      .select("id, name, description, owner_member_id, target_date, created_at")
      .eq("workspace_id", id)
      .order("created_at", { ascending: false });
    if (p.error) throw p.error;
    projects = (p.data ?? []) as typeof projects;
  } catch {
    projects = [];
    migrationReady = false;
  }
  try {
    const c = await supabase
      .from("workspace_member_capacity")
      .select("member_id, capacity")
      .eq("workspace_id", id);
    if (c.error) throw c.error;
    capacities = (c.data ?? []) as typeof capacities;
  } catch {
    capacities = [];
    migrationReady = false;
  }

  return (
    <TeamHubClient
      workspaceId={id}
      workspaceName={workspace.name}
      currentMemberId={membership.id}
      isLeader={leader}
      initialView={view}
      tasks={taskList}
      members={members}
      agents={agents}
      projects={projects}
      approvals={approvals}
      events={events}
      capacities={capacities}
      reports={reports}
      migrationReady={migrationReady}
      onCreateTask={createTask.bind(null, id)}
      onUpdateTask={updateTask.bind(null, id)}
      onChangeStatus={changeStatus.bind(null, id)}
      onCreateProject={createProject.bind(null, id)}
      onUpdateProject={updateProject.bind(null, id)}
      onSetCapacity={setCapacity.bind(null, id)}
    />
  );
}
