"use client";
// Team hub editors, adapted from the prototype's team-hub/forms.tsx.
// These are plain forms that build FormData and call the server actions
// passed in as props (defined in the team page). They never touch a
// demo store, and they never mark a task verified: status changes go
// through the page's changeStatus action with the same allowed
// transitions as the real task board, and verification stays on the
// reports page, separate from done.
import type { FormEvent } from "react";
import {
  memberLabel,
  type HubMember,
  type HubProject,
  type HubTask,
} from "@/lib/team-hub";
import { Field, HubButton, inputCls } from "./primitives";

export type AgentRow = { id: string; name: string };

type ActionFn = (formData: FormData) => Promise<void> | void;

function submit(action: ActionFn, e: FormEvent<HTMLFormElement>, onDone: () => void) {
  e.preventDefault();
  const fd = new FormData(e.currentTarget);
  void Promise.resolve(action(fd)).then(onDone);
}

export function TaskEditor({
  task,
  members,
  agents,
  projects,
  onCreate,
  onUpdate,
  onStatus,
  onClose,
}: {
  task: HubTask | null; // null = create
  members: HubMember[];
  agents: AgentRow[];
  projects: HubProject[];
  onCreate: ActionFn;
  onUpdate: ActionFn;
  onStatus: (next: string, eventType: string) => (fd: FormData) => Promise<void> | void;
  onClose: () => void;
}) {
  const allowed: Record<string, { next: string; label: string; event: string }[]> = {
    todo: [{ next: "in_progress", label: "Start", event: "task_started" }],
    in_progress: [
      { next: "in_review", label: "Submit for review", event: "task_submitted_for_review" },
      { next: "failed", label: "Mark failed", event: "task_failed" },
    ],
    in_review: [
      { next: "done", label: "Accept (done)", event: "task_accepted" },
      { next: "in_progress", label: "Request revision", event: "revision_requested" },
      { next: "failed", label: "Mark failed", event: "task_failed" },
    ],
    done: [{ next: "in_progress", label: "Reopen", event: "task_started" }],
    failed: [
      { next: "todo", label: "Retry (back to todo)", event: "task_retried" },
      { next: "in_progress", label: "Retry", event: "task_retried" },
    ],
  };
  const nextOptions = task ? (allowed[task.status] ?? []) : [];
  return (
    <form
      onSubmit={(e) => submit(task ? onUpdate : onCreate, e, onClose)}
      className="grid gap-3 sm:grid-cols-2"
    >
      <h2 id="th-dialog-title" className="text-lg font-semibold text-ivory sm:col-span-2">
        {task ? `Edit task: ${task.title}` : "Create a task"}
      </h2>
      {task && <input type="hidden" name="task_id" value={task.id} />}
      <Field label="Task title" id="th-task-title">
        <input id="th-task-title" name="title" required defaultValue={task?.title ?? ""} className={inputCls} />
      </Field>
      <Field label="Assigned agent" id="th-task-agent">
        <select id="th-task-agent" name="assigned_agent_id" defaultValue={task?.assigned_agent_id ?? ""} className={inputCls}>
          <option value="">Unassigned</option>
          {agents.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
      </Field>
      <Field label="Accountable member" id="th-task-member" hint="The human accountable, separate from the agent doing the work. Empty means unassigned, never the agent's owner by default.">
        <select id="th-task-member" name="assigned_member_id" defaultValue={task?.assigned_member_id ?? ""} className={inputCls}>
          <option value="">Unassigned</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>{memberLabel(m)}</option>
          ))}
        </select>
      </Field>
      <Field label="Project" id="th-task-project">
        <select id="th-task-project" name="project_id" defaultValue={task?.project_id ?? ""} className={inputCls}>
          <option value="">No project</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </Field>
      <Field label="Description" id="th-task-description" wide>
        <input id="th-task-description" name="description" defaultValue={task?.description ?? ""} placeholder="Description (optional)" className={inputCls} />
      </Field>
      <Field label="Priority" id="th-task-priority">
        <select id="th-task-priority" name="priority" defaultValue={task?.priority ?? "medium"} className={inputCls}>
          <option value="low">Low priority</option>
          <option value="medium">Medium priority</option>
          <option value="high">High priority</option>
          <option value="urgent">Urgent</option>
        </select>
      </Field>
      <Field label="Due date" id="th-task-due">
        <input id="th-task-due" name="due_at" type="date" defaultValue={task?.due_at ? task.due_at.slice(0, 10) : ""} className={inputCls} />
      </Field>
      <div className="flex flex-wrap gap-2 sm:col-span-2">
        <HubButton type="submit">{task ? "Save changes" : "Create task"}</HubButton>
        <HubButton secondary type="button" onClick={onClose}>Cancel</HubButton>
      </div>
      {task && nextOptions.length > 0 && (
        <div className="sm:col-span-2">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
            Move this task (same rules as the task board)
          </p>
          <div className="flex flex-wrap gap-2">
            {nextOptions.map((opt) => (
              <HubButton
                key={opt.next}
                secondary
                type="button"
                onClick={() => {
                  const fd = new FormData();
                  fd.set("task_id", task.id);
                  void Promise.resolve(onStatus(opt.next, opt.event)(fd)).then(onClose);
                }}
              >
                {opt.label}
              </HubButton>
            ))}
          </div>
        </div>
      )}
    </form>
  );
}

export function ProjectEditor({
  project,
  members,
  onCreate,
  onUpdate,
  onClose,
}: {
  project: HubProject | null;
  members: HubMember[];
  onCreate: ActionFn;
  onUpdate: ActionFn;
  onClose: () => void;
}) {
  return (
    <form
      onSubmit={(e) => submit(project ? onUpdate : onCreate, e, onClose)}
      className="grid gap-3 sm:grid-cols-2"
    >
      <h2 id="th-dialog-title" className="text-lg font-semibold text-ivory sm:col-span-2">
        {project ? `Edit project: ${project.name}` : "Create a project"}
      </h2>
      {project && <input type="hidden" name="project_id" value={project.id} />}
      <Field label="Project name" id="th-project-name" wide>
        <input id="th-project-name" name="name" required defaultValue={project?.name ?? ""} className={inputCls} />
      </Field>
      <Field label="Description" id="th-project-description" wide>
        <input id="th-project-description" name="description" defaultValue={project?.description ?? ""} placeholder="Description (optional)" className={inputCls} />
      </Field>
      <Field label="Owner member" id="th-project-owner">
        <select id="th-project-owner" name="owner_member_id" defaultValue={project?.owner_member_id ?? ""} className={inputCls}>
          <option value="">No owner</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>{memberLabel(m)}</option>
          ))}
        </select>
      </Field>
      <Field label="Target date" id="th-project-target">
        <input id="th-project-target" name="target_date" type="date" defaultValue={project?.target_date ?? ""} className={inputCls} />
      </Field>
      <div className="flex flex-wrap gap-2 sm:col-span-2">
        <HubButton type="submit">{project ? "Save changes" : "Create project"}</HubButton>
        <HubButton secondary type="button" onClick={onClose}>Cancel</HubButton>
      </div>
    </form>
  );
}

export function MemberDetails({
  member,
  openTasks,
  capacity,
  isLeader,
  onSetCapacity,
  onClose,
}: {
  member: HubMember;
  openTasks: HubTask[];
  capacity: number;
  isLeader: boolean;
  onSetCapacity: ActionFn;
  onClose: () => void;
}) {
  return (
    <div>
      <h2 id="th-dialog-title" className="text-lg font-semibold text-ivory">
        {memberLabel(member)}
      </h2>
      <p id="th-dialog-description" className="mt-1 text-sm text-muted">
        {member.role === "leader" ? "Leader" : "Member"} · {openTasks.length} open{" "}
        {openTasks.length === 1 ? "task" : "tasks"} · planning capacity {capacity} open tasks.
        Capacity is a task-count guide, not hours.
      </p>
      <div className="mt-4 space-y-2">
        {openTasks.length === 0 && (
          <p className="text-sm text-muted">No open tasks assigned to this member.</p>
        )}
        {openTasks.map((t) => (
          <p key={t.id} className="rounded-lg border border-white/10 bg-raised px-3 py-2 text-sm text-ivory">
            {t.title} <span className="text-muted">· {t.status.replace(/_/g, " ")}</span>
          </p>
        ))}
      </div>
      {isLeader ? (
        <form
          onSubmit={(e) => submit(onSetCapacity, e, onClose)}
          className="mt-4 flex flex-wrap items-end gap-2"
        >
          <input type="hidden" name="member_id" value={member.id} />
          <Field label="Planning capacity (1-30)" id="th-capacity">
            <input id="th-capacity" name="capacity" type="number" min={1} max={30} defaultValue={capacity} className={inputCls} />
          </Field>
          <HubButton type="submit">Save capacity</HubButton>
        </form>
      ) : (
        <p className="mt-4 text-sm text-muted">Only leaders can change capacity.</p>
      )}
      <div className="mt-4">
        <HubButton secondary type="button" onClick={onClose}>Close</HubButton>
      </div>
    </div>
  );
}
