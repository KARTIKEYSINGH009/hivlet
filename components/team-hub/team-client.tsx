"use client";
// Team hub client island: view switching, Work filters, search/inbox
// dialogs, editors and CSV export, all over the real rows handed down
// by the server page. No data is fetched here and nothing is invented:
// empty workspaces render empty states, and the migration banner (from
// the server) explains when projects/capacity are unavailable.
import { useMemo, useState } from "react";
import Link from "next/link";
import { Inbox, Plus, Search } from "lucide-react";
import {
  dueBand,
  memberLabel,
  safeCSV,
  sortTasks,
  taskDueDate,
  taskPriority,
  todayLocal,
  type HubMember,
  type HubProject,
  type HubTask,
  type HubView,
} from "@/lib/team-hub";
import { PageHeader, EmptyState } from "@/components/workspace-ui";
import {
  ActivityList,
  CalendarView,
  DecisionsPanel,
  InboxView,
  ProjectCard,
  SearchView,
  TaskRows,
  TeamDirectory,
  WorkAhead,
  WorkloadPanel,
  type AgentRow,
  type ApprovalRow,
  type CapacityRow,
  type EventRow,
} from "./views";
import { HubButton, HubDialog } from "./primitives";
import { MemberDetails, ProjectEditor, TaskEditor } from "./forms";

type ActionFn = (formData: FormData) => Promise<void> | void;
type StatusFn = (
  next: string,
  eventType: string,
) => (fd: FormData) => Promise<void> | void;

export type ReportRow = {
  id: string;
  agent_id: string;
  summary: string;
  period_date: string;
  verified: boolean;
};

const VIEW_LINKS: { key: HubView; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "work", label: "Work" },
  { key: "projects", label: "Projects" },
  { key: "team", label: "Team" },
  { key: "calendar", label: "Calendar" },
];

export default function TeamHubClient({
  workspaceId,
  workspaceName,
  currentMemberId,
  isLeader,
  initialView,
  tasks,
  members,
  agents,
  projects,
  approvals,
  events,
  capacities,
  reports,
  migrationReady,
  onCreateTask,
  onUpdateTask,
  onChangeStatus,
  onCreateProject,
  onUpdateProject,
  onSetCapacity,
}: {
  workspaceId: string;
  workspaceName: string;
  currentMemberId: string;
  isLeader: boolean;
  initialView: HubView;
  tasks: HubTask[];
  members: HubMember[];
  agents: AgentRow[];
  projects: HubProject[];
  approvals: ApprovalRow[];
  events: EventRow[];
  capacities: CapacityRow[];
  reports: ReportRow[];
  migrationReady: boolean;
  onCreateTask: ActionFn;
  onUpdateTask: ActionFn;
  onChangeStatus: (next: string, eventType: string, fd: FormData) => Promise<void> | void;
  onCreateProject: ActionFn;
  onUpdateProject: ActionFn;
  onSetCapacity: ActionFn;
}) {
  const today = todayLocal();
  const [view, setView] = useState<HubView>(initialView);
  const [calendarDay, setCalendarDay] = useState<string>(today);
  const [dialog, setDialog] = useState<
    | { kind: "task"; task: HubTask | null; due?: string }
    | { kind: "project"; project: HubProject | null }
    | { kind: "member"; memberId: string }
    | { kind: "search" }
    | { kind: "inbox" }
    | null
  >(null);
  const [selectedProject, setSelectedProject] = useState<HubProject | null>(null);
  // Work filters
  const [ownerFilter, setOwnerFilter] = useState<"me" | "anyone" | "unassigned" | "all">("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dueFilter, setDueFilter] = useState<string>("all");
  const [searchText, setSearchText] = useState("");
  const [sortMode, setSortMode] = useState<"due" | "priority" | "recent">("due");

  const closeDialog = () => setDialog(null);
  const openTask = (task: HubTask | null, due?: string) => setDialog({ kind: "task", task, due });
  const openMember = (memberId: string) => setDialog({ kind: "member", memberId });
  const goWork = (status?: string, due?: string) => {
    if (status) setStatusFilter(status);
    if (due) setDueFilter(due);
    setView("work");
  };
  const toggleTask = (task: HubTask) => {
    // Toggle only for safe, unambiguous moves. Accepting a task (in_review
    // -> done) and retrying a failed task are decisions, so those open
    // the editor with the full status controls instead of auto-moving.
    if (task.status === "in_review" || task.status === "failed") {
      openTask(task);
      return;
    }
    const next =
      task.status === "done"
        ? "in_progress"
        : task.status === "todo"
          ? "in_progress"
          : task.status === "in_progress"
            ? "in_review"
            : null;
    if (!next) return;
    const fd = new FormData();
    fd.set("task_id", task.id);
    void onChangeStatus(
      next,
      next === "in_progress" ? "task_started" : "task_submitted_for_review",
      fd,
    );
  };
  const statusAction = (next: string, eventType: string) => (fd: FormData) =>
    onChangeStatus(next, eventType, fd);

  const filteredWork = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    let list = tasks.filter((t) => {
      if (ownerFilter === "me" && t.assigned_member_id !== currentMemberId) return false;
      if (ownerFilter === "anyone" && !t.assigned_member_id) return false;
      if (ownerFilter === "unassigned" && t.assigned_member_id) return false;
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      if (dueFilter !== "all" && dueBand(t, today) !== dueFilter) return false;
      if (
        q &&
        !`${t.title} ${t.description ?? ""}`.toLowerCase().includes(q)
      )
        return false;
      return true;
    });
    if (sortMode === "due") list = [...list].sort(sortTasks);
    else if (sortMode === "priority") {
      const w: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
      list = [...list].sort(
        (a, b) => (w[taskPriority(a)] ?? 2) - (w[taskPriority(b)] ?? 2) || a.title.localeCompare(b.title),
      );
    } else {
      list = [...list].sort(
        (a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at),
      );
    }
    return list;
  }, [tasks, ownerFilter, statusFilter, dueFilter, searchText, sortMode, currentMemberId, today]);

  const exportCSV = () => {
    const header = ["title", "status", "priority", "due", "member", "project"]
      .map(safeCSV)
      .join(",");
    const rows = filteredWork.map((t) =>
      [
        t.title,
        t.status,
        taskPriority(t),
        taskDueDate(t) ?? "",
        members.find((m) => m.id === t.assigned_member_id)?.user_id.slice(0, 8) ?? "",
        projects.find((p) => p.id === t.project_id)?.name ?? "",
      ]
        .map(safeCSV)
        .join(","),
    );
    const blob = new Blob([[header, ...rows].join("\r\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "team-work.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const attention = {
    approvals: approvals.length,
    inReview: tasks.filter((t) => t.status === "in_review").length,
    failed: tasks.filter((t) => t.status === "failed").length,
  };
  const priorityList = [...tasks]
    .filter((t) => t.status !== "done")
    .sort(sortTasks);

  const dialogMember = dialog?.kind === "member"
    ? members.find((m) => m.id === dialog.memberId)
    : undefined;

  return (
    <div>
      <PageHeader
        title={`Team hub · ${workspaceName}`}
        description="One action-first surface for this workspace: what needs a decision, who owns what, and what is due next. Every number comes from real rows."
        actions={
          <>
            <HubButton secondary icon={Search} onClick={() => setDialog({ kind: "search" })}>
              Search
            </HubButton>
            <HubButton secondary icon={Inbox} onClick={() => setDialog({ kind: "inbox" })}>
              Inbox ({approvals.length + events.length})
            </HubButton>
          </>
        }
      />

      {!migrationReady && (
        <div className="mt-6 rounded-xl border border-gold/40 bg-coal px-4 py-3 text-sm text-muted">
          <strong className="text-gold-soft">Team hub migrations not yet applied.</strong>{" "}
          Projects and capacity need migration 010 (
          <code>supabase/migrations/010_team_hub.sql</code>) run in Supabase
          before they store anything. Tasks, approvals, activity and search
          still work from the existing tables.
        </div>
      )}

      <nav aria-label="Team hub views" className="mt-6 flex flex-wrap gap-2">
        {VIEW_LINKS.map((v) => (
          <Link
            key={v.key}
            prefetch={false}
            href={`/workspace/${workspaceId}/team?view=${v.key}`}
            onClick={(e) => {
              e.preventDefault();
              setView(v.key);
              window.history.replaceState(null, "", `/workspace/${workspaceId}/team?view=${v.key}`);
            }}
            aria-current={view === v.key ? "page" : undefined}
            className={`rounded-full border px-4 py-2 text-sm ${
              view === v.key
                ? "border-gold bg-gold text-ink"
                : "border-white/15 text-muted hover:border-gold"
            }`}
          >
            {v.label}
          </Link>
        ))}
      </nav>

      {view === "overview" && (
        <div className="mt-8 space-y-8">
          <section>
            <h2 className="font-semibold text-ivory">Needs your attention</h2>
            <div className="mt-3 grid gap-4 sm:grid-cols-3">
              <Link
                href={`/workspace/${workspaceId}/approvals`}
                className="rounded-xl border border-white/10 bg-coal p-5 hover:border-gold"
              >
                <p className="text-3xl font-bold text-ivory">{attention.approvals}</p>
                <p className="mt-1 text-sm text-muted">Pending approvals</p>
              </Link>
              <button
                type="button"
                onClick={() => goWork("in_review")}
                className="rounded-xl border border-white/10 bg-coal p-5 text-left hover:border-gold"
              >
                <p className="text-3xl font-bold text-ivory">{attention.inReview}</p>
                <p className="mt-1 text-sm text-muted">Tasks in review</p>
              </button>
              <button
                type="button"
                onClick={() => goWork("failed")}
                className="rounded-xl border border-white/10 bg-coal p-5 text-left hover:border-gold"
              >
                <p className="text-3xl font-bold text-ivory">{attention.failed}</p>
                <p className="mt-1 text-sm text-muted">Failed tasks</p>
              </button>
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <DecisionsPanel approvals={approvals} agents={agents} members={members} workspaceId={workspaceId} />
            <WorkAhead
              tasks={tasks}
              today={today}
              onDay={(day) => {
                setCalendarDay(day);
                setView("calendar");
              }}
              onOverdue={() => goWork(undefined, "overdue")}
            />
          </section>

          <section className="rounded-xl border border-white/10 bg-coal p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold text-ivory">Priority tasks</h2>
                <p className="mt-1 text-sm text-muted">Open work, soonest due and highest priority first.</p>
              </div>
              <HubButton secondary icon={Plus} onClick={() => openTask(null)}>
                Create a task
              </HubButton>
            </div>
            <div className="mt-4">
              <TaskRows
                tasks={priorityList}
                members={members}
                projects={projects}
                today={today}
                onEdit={openTask}
                onToggle={toggleTask}
                onMember={openMember}
                onAdd={() => openTask(null)}
                emptyTitle="No open tasks"
                emptyText="Create the first task, or check the Work view for completed work."
              />
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <WorkloadPanel
              members={members}
              tasks={tasks}
              capacities={capacities}
              currentMemberId={currentMemberId}
              onMember={openMember}
              onTeam={() => setView("team")}
            />
            <section className="rounded-xl border border-white/10 bg-coal p-5">
              <h2 className="font-semibold text-ivory">Latest reports</h2>
              <p className="mt-1 text-sm text-muted">Verified separately on the reports page, never by marking a task done here.</p>
              <div className="mt-4 space-y-2">
                {reports.length === 0 && (
                  <EmptyState title="No reports yet" hint="Agent work reports will appear here once agents submit them." />
                )}
                {reports.map((r) => (
                  <Link
                    key={r.id}
                    href={`/workspace/${workspaceId}/reports`}
                    className="block rounded-lg border border-white/10 px-3 py-2 text-sm text-muted hover:border-gold"
                  >
                    <span className="font-medium text-ivory">{r.summary.slice(0, 120)}</span>
                    <span className="block text-xs">
                      {r.period_date} · {r.verified ? "Verified" : "Awaiting verification"}
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          </section>

          <section className="rounded-xl border border-white/10 bg-coal p-5">
            <h2 className="font-semibold text-ivory">Recent activity</h2>
            <div className="mt-3">
              <ActivityList events={events} tasks={tasks} />
            </div>
          </section>
        </div>
      )}

      {view === "work" && (
        <div className="mt-8">
          <section className="rounded-xl border border-white/10 bg-coal p-5">
            <div className="flex flex-wrap gap-2">
              <label className="flex items-center gap-2 text-sm text-muted">
                Owner
                <select value={ownerFilter} onChange={(e) => setOwnerFilter(e.target.value as typeof ownerFilter)} className="rounded-lg border border-white/15 bg-coal px-2 py-1.5 text-sm text-ivory">
                  <option value="all">Everyone</option>
                  <option value="me">Me</option>
                  <option value="anyone">Anyone assigned</option>
                  <option value="unassigned">Unassigned</option>
                </select>
              </label>
              <label className="flex items-center gap-2 text-sm text-muted">
                Status
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-lg border border-white/15 bg-coal px-2 py-1.5 text-sm text-ivory">
                  <option value="all">All statuses</option>
                  <option value="todo">To do</option>
                  <option value="in_progress">In progress</option>
                  <option value="in_review">In review</option>
                  <option value="done">Done</option>
                  <option value="failed">Failed</option>
                </select>
              </label>
              <label className="flex items-center gap-2 text-sm text-muted">
                Due
                <select value={dueFilter} onChange={(e) => setDueFilter(e.target.value)} className="rounded-lg border border-white/15 bg-coal px-2 py-1.5 text-sm text-ivory">
                  <option value="all">Any date</option>
                  <option value="overdue">Overdue</option>
                  <option value="today">Today</option>
                  <option value="next7">Next 7 days</option>
                  <option value="later">Later</option>
                  <option value="nodate">No date</option>
                </select>
              </label>
              <label className="flex items-center gap-2 text-sm text-muted">
                Sort
                <select value={sortMode} onChange={(e) => setSortMode(e.target.value as typeof sortMode)} className="rounded-lg border border-white/15 bg-coal px-2 py-1.5 text-sm text-ivory">
                  <option value="due">Due date</option>
                  <option value="priority">Priority</option>
                  <option value="recent">Most recent</option>
                </select>
              </label>
              <input
                type="search"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Search tasks…"
                className="min-w-[180px] flex-1 rounded-lg border border-white/15 bg-coal px-3 py-1.5 text-sm text-ivory"
              />
              <HubButton secondary onClick={exportCSV}>Export CSV</HubButton>
              <HubButton icon={Plus} onClick={() => openTask(null)}>Create a task</HubButton>
            </div>
            <div className="mt-4">
              <TaskRows
                tasks={filteredWork}
                members={members}
                projects={projects}
                today={today}
                onEdit={openTask}
                onToggle={toggleTask}
                onMember={openMember}
                onAdd={() => openTask(null)}
              />
            </div>
          </section>
        </div>
      )}

      {view === "projects" && (
        <div className="mt-8">
          {!migrationReady ? (
            <EmptyState
              title="Projects need migration 010"
              hint="Run supabase/migrations/010_team_hub.sql in Supabase first. Until then projects cannot be created or stored."
            />
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-muted">Progress is done tasks over total tasks in each project.</p>
                <HubButton icon={Plus} onClick={() => setDialog({ kind: "project", project: null })}>
                  Create a project
                </HubButton>
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {projects.map((p) => (
                  <ProjectCard
                    key={p.id}
                    project={p}
                    tasks={tasks}
                    members={members}
                    onOpen={() => setSelectedProject(p)}
                  />
                ))}
              </div>
              {projects.length === 0 && (
                <div className="mt-4">
                  <EmptyState title="No projects yet" hint="Create a project, then assign tasks to it from the task editor." />
                </div>
              )}
              {selectedProject && (
                <section className="mt-8 rounded-xl border border-white/10 bg-coal p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="font-semibold text-ivory">{selectedProject.name}</h2>
                      <p className="mt-1 text-sm text-muted">{selectedProject.description ?? "No description."}</p>
                    </div>
                    <HubButton secondary onClick={() => setDialog({ kind: "project", project: selectedProject })}>
                      Edit project
                    </HubButton>
                  </div>
                  <div className="mt-4">
                    <TaskRows
                      tasks={tasks.filter((t) => t.project_id === selectedProject.id).sort(sortTasks)}
                      members={members}
                      projects={projects}
                      today={today}
                      onEdit={openTask}
                      onToggle={toggleTask}
                      onMember={openMember}
                      onAdd={() => openTask(null)}
                      emptyTitle="No tasks in this project yet"
                      emptyText="Create a task and assign it to this project."
                    />
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      )}

      {view === "team" && (
        <div className="mt-8">
          <TeamDirectory
            members={members}
            tasks={tasks}
            agents={agents}
            capacities={capacities}
            currentMemberId={currentMemberId}
            onMember={openMember}
            workspaceId={workspaceId}
          />
        </div>
      )}

      {view === "calendar" && (
        <div className="mt-8">
          <CalendarView
            tasks={tasks}
            members={members}
            projects={projects}
            today={today}
            initialDay={calendarDay}
            onEdit={openTask}
            onToggle={toggleTask}
            onMember={openMember}
            onAdd={(date) => openTask(null, date)}
          />
        </div>
      )}

      <HubDialog openKey={dialog ? `${dialog.kind}` : null} onClose={closeDialog}>
        {dialog?.kind === "task" && (
          <TaskEditor
            task={dialog.task}
            members={members}
            agents={agents}
            projects={projects}
            onCreate={(fd) => {
              if (dialog.due && !fd.get("due_at")) fd.set("due_at", dialog.due);
              return onCreateTask(fd);
            }}
            onUpdate={onUpdateTask}
            onStatus={statusAction}
            onClose={closeDialog}
          />
        )}
        {dialog?.kind === "project" && (
          <ProjectEditor
            project={dialog.project}
            members={members}
            onCreate={onCreateProject}
            onUpdate={onUpdateProject}
            onClose={closeDialog}
          />
        )}
        {dialog?.kind === "member" && dialogMember && (
          <MemberDetails
            member={dialogMember}
            openTasks={tasks.filter((t) => t.assigned_member_id === dialogMember.id && t.status !== "done")}
            capacity={capacities.find((c) => c.member_id === dialogMember.id)?.capacity ?? 5}
            isLeader={isLeader}
            onSetCapacity={onSetCapacity}
            onClose={closeDialog}
          />
        )}
        {dialog?.kind === "search" && (
          <SearchView
            tasks={tasks}
            projects={projects}
            members={members}
            today={today}
            onEdit={(t) => {
              closeDialog();
              openTask(t);
            }}
            onProject={(p) => {
              closeDialog();
              setSelectedProject(p);
              setView("projects");
            }}
            onMember={(id) => {
              closeDialog();
              openMember(id);
            }}
            onAdd={() => {
              closeDialog();
              openTask(null);
            }}
          />
        )}
        {dialog?.kind === "inbox" && (
          <InboxView
            events={events}
            approvals={approvals}
            agents={agents}
            tasks={tasks}
            workspaceId={workspaceId}
          />
        )}
      </HubDialog>
    </div>
  );
}
