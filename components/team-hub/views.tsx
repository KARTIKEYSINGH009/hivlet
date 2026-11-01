"use client";
// Team hub views, adapted from the prototype's team-hub/views.tsx to real
// rows. Every view reads only the props it is given; there is no store,
// no demo data, and no sample day. "Today" is always the caller's real
// today string. Member labels come from memberLabel() (role + truncated
// user id), because there is no profiles table.
import { useEffect, useMemo, useState, type KeyboardEvent } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Circle,
  Clock3,
  FolderKanban,
  LayoutList,
  Plus,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  UserRound,
  Users,
} from "lucide-react";
import {
  capacityFor,
  dayNumber,
  daysAway,
  dueLabel,
  formatDay,
  memberInitials,
  memberLabel,
  projectProgress,
  projectTasks,
  shiftDay,
  sortTasks,
  taskDueDate,
  taskPriority,
  todayLocal,
  type HubMember,
  type HubProject,
  type HubTask,
} from "@/lib/team-hub";
import {
  HubButton,
  HubEmpty,
  HubLink,
  HubStatus,
  Meter,
  PanelHeading,
  PersonAvatar,
  PriorityPill,
} from "./primitives";

export type AgentRow = { id: string; name: string };
export type ApprovalRow = {
  id: string;
  action_type: string;
  reason: string | null;
  agent_id: string;
  created_at: string;
};
export type EventRow = {
  id: string;
  event_type: string;
  task_id: string;
  created_at: string;
};
export type CapacityRow = { member_id: string; capacity: number };

function fmtDateTime(value: string): string {
  try {
    return new Date(value).toLocaleString("en-GB", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return value;
  }
}
function memberById(members: HubMember[], id: string | null): HubMember | undefined {
  return id ? members.find((m) => m.id === id) : undefined;
}
function agentName(agents: AgentRow[], id: string | null): string {
  return agents.find((a) => a.id === id)?.name ?? "Agent";
}
function projectById(projects: HubProject[], id: string | null): HubProject | undefined {
  return id ? projects.find((p) => p.id === id) : undefined;
}

type TaskRowsProps = {
  tasks: HubTask[];
  members: HubMember[];
  projects: HubProject[];
  today: string;
  onEdit: (task: HubTask) => void;
  onToggle: (task: HubTask) => void;
  onMember: (memberId: string) => void;
  onAdd?: () => void;
  emptyTitle?: string;
  emptyText?: string;
};
export function TaskRows({
  tasks,
  members,
  projects,
  today,
  onEdit,
  onToggle,
  onMember,
  onAdd,
  emptyTitle = "A little room for what is next.",
  emptyText = "No tasks match this view. Clear a filter or create the next useful piece of work.",
}: TaskRowsProps) {
  if (!tasks.length)
    return (
      <HubEmpty icon={LayoutList} title={emptyTitle} text={emptyText}>
        {onAdd && (
          <HubButton icon={Plus} onClick={onAdd}>
            Create a task
          </HubButton>
        )}
      </HubEmpty>
    );
  return (
    <div role="table" aria-label="Team tasks" className="overflow-x-auto">
      <div className="grid min-w-[640px] grid-cols-[2fr_1fr_1fr_1fr] gap-3 border-b border-white/10 px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-muted">
        <span>Task</span>
        <span>Owner</span>
        <span>Due</span>
        <span>Status</span>
      </div>
      <div role="rowgroup">
        {tasks.map((task) => {
          const member = memberById(members, task.assigned_member_id);
          const project = projectById(projects, task.project_id);
          const due = taskDueDate(task);
          const late =
            task.status !== "done" && due && (daysAway(due, today) ?? 0) < 0;
          const priority = taskPriority(task);
          return (
            <div
              key={task.id}
              role="row"
              className="grid min-w-[640px] grid-cols-[2fr_1fr_1fr_1fr] items-center gap-3 border-b border-white/10 px-3 py-3"
            >
              <div role="cell" className="flex items-start gap-2">
                <button
                  type="button"
                  aria-label={`Toggle ${task.title}`}
                  aria-pressed={task.status === "done"}
                  onClick={() => onToggle(task)}
                  className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/20 text-muted hover:border-gold"
                >
                  {task.status === "done" ? (
                    <Check size={14} />
                  ) : (
                    <Circle size={16} strokeWidth={1.2} />
                  )}
                </button>
                <div className="min-w-0">
                  <button
                    type="button"
                    onClick={() => onEdit(task)}
                    aria-label={`Edit task: ${task.title}`}
                    className="text-left text-sm font-medium text-ivory hover:text-gold-soft"
                  >
                    {task.title}
                  </button>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
                    <PriorityPill priority={priority} />
                    {project && (
                      <span className="inline-flex items-center gap-1">
                        <FolderKanban size={12} />
                        {project.name}
                      </span>
                    )}
                    {task.status === "failed" && (
                      <span className="text-[#d98c8c]">Blocked</span>
                    )}
                  </div>
                </div>
              </div>
              <div role="cell">
                {member ? (
                  <button
                    type="button"
                    onClick={() => onMember(member.id)}
                    aria-label={`View ${memberLabel(member)} workload`}
                    className="inline-flex items-center gap-2 text-sm text-ivory"
                  >
                    <PersonAvatar
                      initials={memberInitials(member)}
                      label={memberLabel(member)}
                      small
                    />
                    <span>{memberLabel(member)}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => onEdit(task)}
                    aria-label={`Assign ${task.title}`}
                    className="inline-flex items-center gap-1 text-sm text-muted hover:text-gold-soft"
                  >
                    <UserRound size={15} />
                    <span>Assign</span>
                  </button>
                )}
              </div>
              <div
                role="cell"
                title={due ? formatDay(due, { day: "numeric", month: "long", year: "numeric" }) : "No due date"}
                className={`flex items-center gap-1 text-sm ${late ? "text-[#d98c8c]" : "text-muted"}`}
              >
                {late && <Clock3 size={12} />}
                <span>{dueLabel(due, today)}</span>
              </div>
              <div role="cell">
                <button
                  type="button"
                  onClick={() => onEdit(task)}
                  aria-label={`Change status for ${task.title}`}
                  className="inline-flex items-center gap-1"
                >
                  <HubStatus status={task.status} />
                  <ChevronDown size={12} className="text-muted" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ProjectCard({
  project,
  tasks,
  members,
  onOpen,
}: {
  project: HubProject;
  tasks: HubTask[];
  members: HubMember[];
  onOpen: () => void;
}) {
  const progress = projectProgress(project, tasks);
  const list = projectTasks(project, tasks);
  const owner = memberById(members, project.owner_member_id);
  const working = list.some((t) => t.status === "in_progress");
  const reviewing = list.some((t) => t.status === "in_review");
  const label = progress.blocked
    ? "Needs attention"
    : progress.total && progress.done === progress.total
      ? "Complete"
      : working
        ? "In motion"
        : reviewing
          ? "In review"
          : progress.done > 0
            ? "Under way"
            : "Planned";
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Open project: ${project.name}`}
      className="rounded-xl border border-white/10 bg-coal p-5 text-left hover:border-gold"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-raised text-gold-soft">
          <FolderKanban size={19} strokeWidth={1.5} />
        </span>
        <HubStatus
          status={
            progress.blocked
              ? "failed"
              : progress.total && progress.done === progress.total
                ? "done"
                : working
                  ? "in_progress"
                  : reviewing
                    ? "in_review"
                    : "todo"
          }
        />
        <ArrowUpRight size={16} className="text-muted" />
      </div>
      <h3 className="mt-3 font-semibold text-ivory">{project.name}</h3>
      <p className="mt-1 text-sm text-muted">
        {project.description ||
          "A shared goal. Add the first task to make the next step clear."}
      </p>
      <div className="mt-3 flex items-center justify-between text-xs text-muted">
        <span>
          {progress.done} of {progress.total}{" "}
          {progress.total === 1 ? "task" : "tasks"} done
        </span>
        <strong className="text-ivory">{progress.percent}%</strong>
      </div>
      <div className="mt-2">
        <Meter
          value={progress.percent}
          success={progress.total > 0 && progress.done === progress.total}
        />
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
        <span className="inline-flex items-center gap-2">
          {owner ? (
            <>
              <PersonAvatar
                initials={memberInitials(owner)}
                label={memberLabel(owner)}
                small
              />
              {memberLabel(owner)}
            </>
          ) : (
            <>
              <UserRound size={15} />
              No owner
            </>
          )}
        </span>
        <span className="inline-flex items-center gap-1">
          <CalendarDays size={13} />
          {project.target_date ? formatDay(project.target_date) : "No target date"}
        </span>
      </div>
      <p className="mt-2 text-xs text-muted">{label}</p>
    </button>
  );
}

export function WorkloadPanel({
  members,
  tasks,
  capacities,
  currentMemberId,
  onMember,
  onTeam,
}: {
  members: HubMember[];
  tasks: HubTask[];
  capacities: CapacityRow[];
  currentMemberId: string;
  onMember: (memberId: string) => void;
  onTeam: () => void;
}) {
  return (
    <section className="rounded-xl border border-white/10 bg-coal p-5">
      <PanelHeading title="Team workload" subtitle="Room for focused work.">
        <button
          type="button"
          aria-label="Open team and capacity"
          onClick={onTeam}
          className="rounded-lg border border-white/15 px-2 py-1.5 text-muted hover:border-gold"
        >
          <SlidersHorizontal size={16} />
        </button>
      </PanelHeading>
      <div className="mt-4 flex justify-between text-xs font-semibold uppercase tracking-wider text-muted">
        <span>Teammate</span>
        <span>Open / capacity</span>
      </div>
      <div className="mt-2 space-y-1">
        {members.map((member) => {
          const used = tasks.filter(
            (t) => t.assigned_member_id === member.id && t.status !== "done",
          ).length;
          const max = capacityFor(capacities, member.id);
          return (
            <button
              key={member.id}
              type="button"
              onClick={() => onMember(member.id)}
              aria-label={`${memberLabel(member)}: ${used} open tasks, capacity ${max}.`}
              className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-white/5"
            >
              <PersonAvatar
                initials={memberInitials(member)}
                label={memberLabel(member)}
                small
              />
              <span className="min-w-0 flex-1">
                <strong className="block truncate text-sm text-ivory">
                  {memberLabel(member)}
                  {member.id === currentMemberId && <small> (you)</small>}
                </strong>
                <span className="mt-1 block">
                  <Meter value={used} max={max} />
                </span>
              </span>
              <span className={`text-sm ${used > max ? "text-[#d98c8c]" : "text-muted"}`}>
                {used}
                <small> / {max}</small>
              </span>
            </button>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-muted">
        Task count, not hours. Select a person to rebalance.
      </p>
    </section>
  );
}

export function WorkAhead({
  tasks,
  today,
  onDay,
  onOverdue,
}: {
  tasks: HubTask[];
  today: string;
  onDay: (day: string) => void;
  onOverdue: () => void;
}) {
  const [range, setRange] = useState(7);
  const active = tasks.filter((t) => t.status !== "done");
  const groups = useMemo(() => {
    const size = Math.ceil(range / 7);
    return Array.from({ length: Math.ceil(range / size) }, (_, i) => {
      const start = shiftDay(today, i * size);
      const end = shiftDay(today, Math.min(range - 1, (i + 1) * size - 1));
      const count = active.filter((t) => {
        const date = taskDueDate(t);
        return (
          date &&
          dayNumber(date) >= dayNumber(start) &&
          dayNumber(date) <= dayNumber(end)
        );
      }).length;
      return { start, end, count };
    });
  }, [tasks, range, today]);
  const total = groups.reduce((n, g) => n + g.count, 0);
  const max = Math.max(3, ...groups.map((g) => g.count));
  const overdue = active.filter(
    (t) => taskDueDate(t) && (daysAway(taskDueDate(t), today) ?? 0) < 0,
  ).length;
  const undated = active.filter((t) => !taskDueDate(t)).length;
  return (
    <section className="rounded-xl border border-white/10 bg-coal p-5">
      <PanelHeading title="Work ahead">
        <div className="flex gap-1" aria-label="Upcoming due-date range">
          {[7, 14, 30].map((days) => (
            <button
              key={days}
              type="button"
              aria-label={`Show next ${days} days`}
              aria-pressed={range === days}
              onClick={() => setRange(days)}
              className={`rounded-lg border px-3 py-1.5 text-sm ${
                range === days
                  ? "border-gold bg-gold text-ink"
                  : "border-white/15 text-muted"
              }`}
            >
              {days}d
            </button>
          ))}
        </div>
      </PanelHeading>
      <p className="mt-4 text-sm text-muted">
        <strong className="text-2xl text-ivory">{total}</strong>{" "}
        {total === 1 ? "task" : "tasks"} due · Next {range} days
      </p>
      <div className="mt-4 flex items-end gap-2" aria-label={`${total} open tasks due in the next ${range} days`}>
        {groups.map((group, index) => (
          <button
            key={group.start}
            type="button"
            aria-label={`Open calendar from ${formatDay(group.start)}. ${group.count} tasks due ${group.start === group.end ? "that day" : `through ${formatDay(group.end)}`}.`}
            onClick={() => onDay(group.start)}
            className="flex flex-1 flex-col items-center gap-1"
          >
            <span className="text-sm text-ivory">{group.count || "–"}</span>
            <span className="flex h-16 w-full items-end rounded bg-white/5">
              <i
                className={`block w-full rounded ${group.count ? "bg-gold" : "bg-white/10"}`}
                style={{ height: `${group.count ? Math.max(8, (group.count / max) * 100) : 3}%` }}
              />
            </span>
            <span className="text-xs text-muted">
              {index === 0
                ? "Today"
                : range === 7
                  ? formatDay(group.start, { weekday: "short" }).slice(0, 1)
                  : `${Number(group.start.slice(-2))}–${Number(group.end.slice(-2))}`}
            </span>
          </button>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm">
        {overdue ? (
          <button type="button" onClick={onOverdue} className="inline-flex items-center gap-1 text-gold-soft">
            <Clock3 size={13} />
            {overdue} overdue {overdue === 1 ? "task" : "tasks"}
            <ArrowRight size={14} />
          </button>
        ) : (
          <span className="text-muted">No overdue tasks</span>
        )}
        <span className="text-muted">
          {undated ? `${undated} without a date` : "Open tasks only"}
        </span>
      </div>
    </section>
  );
}

export function DecisionsPanel({
  approvals,
  agents,
  members,
  workspaceId,
}: {
  approvals: ApprovalRow[];
  agents: AgentRow[];
  members: HubMember[];
  workspaceId: string;
}) {
  return (
    <section className="rounded-xl border border-white/10 bg-coal p-5">
      <PanelHeading title="Your team needs a decision" subtitle="A human check before the next step.">
        <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-ivory">
          {approvals.length}
        </span>
      </PanelHeading>
      {approvals.length ? (
        <div className="mt-4 space-y-2">
          {approvals.slice(0, 2).map((approval) => (
            <Link
              prefetch={false}
              href={`/workspace/${workspaceId}/approvals`}
              key={approval.id}
              className="flex items-center gap-3 rounded-lg border border-white/10 px-3 py-3 hover:border-gold"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-raised text-gold-soft">
                <ShieldCheck size={18} strokeWidth={1.5} />
              </span>
              <span className="min-w-0 flex-1">
                <strong className="block truncate text-sm text-ivory">
                  {approval.action_type.replace(/_/g, " ")}
                  {approval.reason ? ` — ${approval.reason}` : ""}
                </strong>
                <small className="text-xs text-muted">
                  {agentName(agents, approval.agent_id)} · needs approval
                </small>
              </span>
              <ArrowUpRight size={16} className="text-muted" />
            </Link>
          ))}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <HubLink href={`/workspace/${workspaceId}/approvals`}>
              Review exact payloads
            </HubLink>
            <span className="text-xs text-muted">No action runs automatically.</span>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex items-start gap-3 text-sm text-muted">
          <ShieldCheck size={20} />
          <div>
            <strong className="text-ivory">No decisions waiting.</strong>
            <p>We will keep the next human check here.</p>
          </div>
        </div>
      )}
    </section>
  );
}

export function ActivityList({
  events,
  tasks,
  compact = false,
}: {
  events: EventRow[];
  tasks: HubTask[];
  compact?: boolean;
}) {
  if (!events.length)
    return (
      <div className="flex items-start gap-3 text-sm text-muted">
        <Clock3 size={20} />
        <p>A fresh start. Your team’s next update will appear here.</p>
      </div>
    );
  return (
    <div className={compact ? "space-y-1" : "space-y-2"}>
      {events.map((event) => {
        const task = tasks.find((t) => t.id === event.task_id);
        return (
          <p
            key={event.id}
            className="flex flex-wrap items-center gap-2 rounded-lg border border-white/10 bg-coal px-3 py-2 text-sm text-muted"
          >
            <span className="font-medium text-ivory">
              {event.event_type.replace(/_/g, " ")}
            </span>
            {task && <span>· {task.title}</span>}
            <span className="ml-auto text-xs">{fmtDateTime(event.created_at)}</span>
          </p>
        );
      })}
    </div>
  );
}

export function TeamDirectory({
  members,
  tasks,
  agents,
  capacities,
  currentMemberId,
  onMember,
  workspaceId,
}: {
  members: HubMember[];
  tasks: HubTask[];
  agents: AgentRow[];
  capacities: CapacityRow[];
  currentMemberId: string;
  onMember: (memberId: string) => void;
  workspaceId: string;
}) {
  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-semibold text-ivory">Good work is a team effort.</h2>
          <p className="mt-1 text-sm text-muted">
            Clear ownership. Realistic capacity. A person behind every next step.
          </p>
        </div>
        <HubLink href={`/workspace/${workspaceId}/settings`}>
          Manage members in settings
        </HubLink>
      </div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {members.map((member) => {
          const open = tasks.filter(
            (t) => t.assigned_member_id === member.id && t.status !== "done",
          );
          const capacity = capacityFor(capacities, member.id);
          const complete = tasks.filter(
            (t) => t.assigned_member_id === member.id && t.status === "done",
          ).length;
          return (
            <button
              key={member.id}
              type="button"
              onClick={() => onMember(member.id)}
              aria-label={`Open ${memberLabel(member)} tasks and capacity`}
              className="rounded-xl border border-white/10 bg-coal p-5 text-left hover:border-gold"
            >
              <div className="flex items-start justify-between gap-2">
                <PersonAvatar
                  initials={memberInitials(member)}
                  label={memberLabel(member)}
                />
                <span className="text-xs text-muted">{memberLabel(member).split(" · ")[0]}</span>
                <ArrowUpRight size={17} className="text-muted" />
              </div>
              <h3 className="mt-3 font-semibold text-ivory">
                {memberLabel(member)}
                {member.id === currentMemberId && <small> (you)</small>}
              </h3>
              <p className="mt-1 text-xs text-muted">
                No profile name on file yet. Member labels use role plus a
                truncated id until a profiles table exists.
              </p>
              <div className="mt-3 flex items-center justify-between text-xs text-muted">
                <span>
                  {open.length} open {open.length === 1 ? "task" : "tasks"}
                </span>
                <strong className="text-ivory">
                  {capacity ? Math.round((open.length / capacity) * 100) : 0}%
                  capacity
                </strong>
              </div>
              <div className="mt-2">
                <Meter value={open.length} max={capacity || 1} />
              </div>
              <div className="mt-3 flex justify-between text-xs text-muted">
                <span>{complete} done</span>
                <span>Capacity {capacity} open tasks</span>
              </div>
            </button>
          );
        })}
      </div>
      <div className="mt-4 flex items-start gap-2 rounded-xl border border-white/10 bg-coal px-4 py-3 text-sm text-muted">
        <Users size={17} className="mt-0.5 shrink-0" />
        <p>
          Capacity is a planning guide based on open task count, not hours,
          availability, or online presence. Invites are still managed from
          workspace settings, not from this hub.
        </p>
      </div>
    </>
  );
}

function firstOfMonth(day: string) {
  return `${day.slice(0, 7)}-01`;
}
function adjacentMonth(day: string, amount: number) {
  const [year, month] = day.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1 + amount, 1, 12))
    .toISOString()
    .slice(0, 10);
}

export function CalendarView({
  tasks,
  members,
  projects,
  today,
  initialDay,
  onEdit,
  onToggle,
  onMember,
  onAdd,
}: {
  tasks: HubTask[];
  members: HubMember[];
  projects: HubProject[];
  today: string;
  initialDay?: string;
  onEdit: (task: HubTask) => void;
  onToggle: (task: HubTask) => void;
  onMember: (memberId: string) => void;
  onAdd: (date: string) => void;
}) {
  const valid = Number.isFinite(dayNumber(initialDay)) ? (initialDay as string) : today;
  const [selected, setSelected] = useState(valid);
  const [month, setMonth] = useState(firstOfMonth(valid));
  const [includeDone, setIncludeDone] = useState(false);
  useEffect(() => {
    setSelected(valid);
    setMonth(firstOfMonth(valid));
  }, [valid]);
  const monthIndex = new Date(`${month}T12:00:00Z`).getUTCDay();
  const start = shiftDay(month, -((monthIndex + 6) % 7));
  const dates = Array.from({ length: 42 }, (_, index) => shiftDay(start, index));
  const visibleTasks = tasks.filter((t) => includeDone || t.status !== "done");
  const selectedTasks = visibleTasks
    .filter((t) => taskDueDate(t) === selected)
    .sort(sortTasks);
  const undated = visibleTasks.filter((t) => !taskDueDate(t)).length;
  const choose = (date: string, focus = false) => {
    setSelected(date);
    if (date.slice(0, 7) !== month.slice(0, 7)) setMonth(firstOfMonth(date));
    if (focus)
      requestAnimationFrame(() =>
        document
          .querySelector<HTMLButtonElement>(`[data-calendar-date="${date}"]`)
          ?.focus(),
      );
  };
  const keys = (event: KeyboardEvent<HTMLButtonElement>, date: string) => {
    const directions: Record<string, number> = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -7,
      ArrowDown: 7,
    };
    if (event.key in directions) {
      event.preventDefault();
      choose(shiftDay(date, directions[event.key]), true);
    } else if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      const offset = (new Date(`${date}T12:00:00Z`).getUTCDay() + 6) % 7;
      choose(shiftDay(date, event.key === "Home" ? -offset : 6 - offset), true);
    }
  };
  return (
    <>
      <section className="rounded-xl border border-white/10 bg-coal p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold text-ivory">
              {formatDay(month, { month: "long", year: "numeric" })}
            </h2>
            <p className="mt-1 text-sm text-muted">Deadlines, with the people behind them.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-sm text-muted">
              <input
                type="checkbox"
                checked={includeDone}
                onChange={(e) => setIncludeDone(e.target.checked)}
              />
              Include done
            </label>
            <button
              type="button"
              onClick={() => choose(today)}
              className="rounded-lg border border-white/15 px-3 py-1.5 text-sm text-muted hover:border-gold"
            >
              Today
            </button>
            <button
              type="button"
              aria-label="Previous month"
              onClick={() => {
                const next = adjacentMonth(month, -1);
                setMonth(next);
                setSelected(next);
              }}
              className="rounded-lg border border-white/15 px-2 py-1.5 text-muted hover:border-gold"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              aria-label="Next month"
              onClick={() => {
                const next = adjacentMonth(month, 1);
                setMonth(next);
                setSelected(next);
              }}
              className="rounded-lg border border-white/15 px-2 py-1.5 text-muted hover:border-gold"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
        <div className="mt-4 overflow-x-auto">
          <div className="min-w-[640px]">
            <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold uppercase tracking-wider text-muted">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                <span key={day}>{day}</span>
              ))}
            </div>
            <div className="mt-1 grid grid-cols-7 gap-1">
              {dates.map((date) => {
                const dayTasks = visibleTasks.filter((t) => taskDueDate(t) === date);
                return (
                  <button
                    key={date}
                    type="button"
                    data-calendar-date={date}
                    aria-label={`${formatDay(date, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}: ${dayTasks.length} tasks`}
                    aria-pressed={date === selected}
                    tabIndex={date === selected ? 0 : -1}
                    onClick={() => choose(date)}
                    onKeyDown={(e) => keys(e, date)}
                    className={`min-h-[72px] rounded-lg border p-2 text-left ${
                      date.slice(0, 7) !== month.slice(0, 7)
                        ? "border-transparent text-muted/60"
                        : date === selected
                          ? "border-gold bg-raised"
                          : "border-white/10 hover:border-gold"
                    } ${date === today ? "ring-1 ring-gold/40" : ""}`}
                  >
                    <span className="text-sm font-medium text-ivory">
                      {Number(date.slice(-2))}
                    </span>
                    <span className="mt-1 block space-y-0.5 truncate text-xs text-muted">
                      {dayTasks.slice(0, 2).map((task) => (
                        <span key={task.id} className="block truncate">
                          {task.title}
                        </span>
                      ))}
                      {dayTasks.length > 2 && <small>+{dayTasks.length - 2} more</small>}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        <p className="mt-3 text-xs text-muted">
          Choose a day to see full tasks below. Arrow keys move between days.
          {undated > 0 &&
            ` ${undated} ${undated === 1 ? "task has" : "tasks have"} no due date and ${undated === 1 ? "is" : "are"} not shown.`}
        </p>
      </section>
      <section className="mt-6 rounded-xl border border-white/10 bg-coal p-5">
        <PanelHeading
          title={
            selected === today
              ? "Due today"
              : formatDay(selected, { weekday: "long", day: "numeric", month: "long" })
          }
          subtitle={`${selectedTasks.length} ${selectedTasks.length === 1 ? "task" : "tasks"} · ${includeDone ? "all statuses" : "open work"}`}
        >
          <HubButton secondary icon={Plus} onClick={() => onAdd(selected)}>
            Add a task
          </HubButton>
        </PanelHeading>
        <div className="mt-4">
          <TaskRows
            tasks={selectedTasks}
            members={members}
            projects={projects}
            today={today}
            onEdit={onEdit}
            onToggle={onToggle}
            onMember={onMember}
            onAdd={() => onAdd(selected)}
            emptyTitle="A little breathing room."
            emptyText="No tasks due on this day. Plan one when there is something useful to do."
          />
        </div>
      </section>
    </>
  );
}

export function SearchView({
  tasks,
  projects,
  members,
  today,
  onEdit,
  onProject,
  onMember,
  onAdd,
}: {
  tasks: HubTask[];
  projects: HubProject[];
  members: HubMember[];
  today: string;
  onEdit: (task: HubTask) => void;
  onProject: (project: HubProject) => void;
  onMember: (memberId: string) => void;
  onAdd: () => void;
}) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const taskResults = tasks
    .filter((t) =>
      `${t.title} ${t.description ?? ""} ${projectById(projects, t.project_id)?.name ?? ""}`
        .toLowerCase()
        .includes(q),
    )
    .sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at))
    .slice(0, 6);
  const projectResults = projects
    .filter((p) => `${p.name} ${p.description ?? ""}`.toLowerCase().includes(q))
    .slice(0, 3);
  const memberResults = members
    .filter((m) => memberLabel(m).toLowerCase().includes(q))
    .slice(0, 3);
  const total = taskResults.length + projectResults.length + memberResults.length;
  return (
    <>
      <h2 id="th-dialog-title" className="text-lg font-semibold text-ivory">
        Find your next step.
      </h2>
      <p id="th-dialog-description" className="mt-1 text-sm text-muted">
        Search tasks, projects, and teammates in this workspace.
      </p>
      <label className="mt-4 flex items-center gap-2 rounded-lg border border-white/15 bg-raised px-3 py-2.5">
        <Search size={19} className="text-muted" />
        <span className="sr-only">Search workspace</span>
        <input
          data-autofocus
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="A task, a project, a person…"
          className="w-full bg-transparent text-sm text-ivory outline-none"
        />
      </label>
      <div className="mt-4 space-y-4" aria-live="polite">
        {total ? (
          <>
            {taskResults.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
                  {q ? "Tasks" : "Recent work"}
                </h3>
                <div className="mt-2 space-y-1">
                  {taskResults.map((task) => (
                    <button
                      key={task.id}
                      type="button"
                      onClick={() => onEdit(task)}
                      className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-white/5"
                    >
                      <span className="text-muted">
                        <LayoutList size={17} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <strong className="block truncate text-sm text-ivory">{task.title}</strong>
                        <small className="text-xs text-muted">
                          {projectById(projects, task.project_id)?.name ?? "No project"} · due{" "}
                          {dueLabel(taskDueDate(task), today).toLowerCase()}
                        </small>
                      </span>
                      <HubStatus status={task.status} />
                    </button>
                  ))}
                </div>
              </div>
            )}
            {projectResults.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">Projects</h3>
                <div className="mt-2 space-y-1">
                  {projectResults.map((project) => (
                    <button
                      key={project.id}
                      type="button"
                      onClick={() => onProject(project)}
                      className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-white/5"
                    >
                      <span className="text-muted">
                        <FolderKanban size={17} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <strong className="block truncate text-sm text-ivory">{project.name}</strong>
                        <small className="text-xs text-muted">Project</small>
                      </span>
                      <ArrowUpRight size={15} className="text-muted" />
                    </button>
                  ))}
                </div>
              </div>
            )}
            {memberResults.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">People</h3>
                <div className="mt-2 space-y-1">
                  {memberResults.map((member) => (
                    <button
                      key={member.id}
                      type="button"
                      onClick={() => onMember(member.id)}
                      className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-white/5"
                    >
                      <PersonAvatar
                        initials={memberInitials(member)}
                        label={memberLabel(member)}
                        small
                      />
                      <span className="min-w-0 flex-1">
                        <strong className="block truncate text-sm text-ivory">{memberLabel(member)}</strong>
                        <small className="text-xs text-muted">{member.role}</small>
                      </span>
                      <ArrowRight size={15} className="text-muted" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <HubEmpty icon={Search} title="Nothing by that name. Yet." text="Try fewer words, or create a task for what is missing.">
            <HubButton icon={Plus} onClick={onAdd}>
              Create a task
            </HubButton>
          </HubEmpty>
        )}
      </div>
    </>
  );
}

export function InboxView({
  events,
  approvals,
  agents,
  tasks,
  workspaceId,
}: {
  events: EventRow[];
  approvals: ApprovalRow[];
  agents: AgentRow[];
  tasks: HubTask[];
  workspaceId: string;
}) {
  return (
    <>
      <h2 id="th-dialog-title" className="text-lg font-semibold text-ivory">
        A little less catching up.
      </h2>
      <p id="th-dialog-description" className="mt-1 text-sm text-muted">
        Recent activity and pending decisions in this workspace. Opening this
        inbox marks nothing as decided, approvals are decided only on the
        approvals page.
      </p>
      <div className="mt-4 space-y-4">
        {approvals.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
              {approvals.length} pending {approvals.length === 1 ? "decision" : "decisions"}
            </h3>
            <div className="mt-2 space-y-1">
              {approvals.map((approval) => (
                <Link
                  prefetch={false}
                  key={approval.id}
                  href={`/workspace/${workspaceId}/approvals`}
                  className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-white/5"
                >
                  <ShieldCheck size={17} className="text-gold-soft" />
                  <span className="min-w-0 flex-1">
                    <strong className="block truncate text-sm text-ivory">
                      {approval.action_type.replace(/_/g, " ")}
                    </strong>
                    <small className="text-xs text-muted">
                      {agentName(agents, approval.agent_id)} requested a human check.
                    </small>
                  </span>
                  <ArrowUpRight size={15} className="text-muted" />
                </Link>
              ))}
            </div>
          </div>
        )}
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
            Recent activity
          </h3>
          <div className="mt-2">
            <ActivityList events={events.slice(0, 10)} tasks={tasks} compact />
          </div>
        </div>
      </div>
    </>
  );
}
