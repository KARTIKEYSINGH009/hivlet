// Team hub helpers — pure functions over REAL Supabase rows only.
// Ported (adapted, not copied) from the prototype's lib/team-hub.ts.
// Deliberately absent: DEMO_TODAY, the hv-101..hv-114 fixtures map,
// seedTeamProjects, and any fallback that invents a project, due date,
// priority or assignee. A missing value stays missing (null / "No date" /
// "Unassigned"). Real today is always passed in by the caller, never
// frozen to a sample day.
//
// Row shapes here mirror the real tables: tasks (schema.sql, plus
// migration 010's assigned_member_id / project_id), projects (010),
// workspace_members, and workspace_member_capacity (010).

export type HubView = "overview" | "work" | "projects" | "team" | "calendar";
export const HUB_VIEWS: HubView[] = [
  "overview",
  "work",
  "projects",
  "team",
  "calendar",
];
export const VIEW_TITLES: Record<HubView, string> = {
  overview: "Team overview",
  work: "Work",
  projects: "Projects",
  team: "The team",
  calendar: "Task calendar",
};

export type HubTask = {
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

export type HubProject = {
  id: string;
  name: string;
  description: string | null;
  owner_member_id: string | null;
  target_date: string | null;
  created_at: string;
};

export type HubMember = {
  id: string; // workspace_members.id
  user_id: string;
  role: string;
};

// Honest member label: there is NO profiles table, so there is no name
// or email to show. Role + first 8 chars of the user id, never a name
// invented from anywhere else.
export function memberLabel(m: HubMember): string {
  const role = m.role === "leader" ? "Leader" : "Member";
  return `${role} · ${m.user_id.slice(0, 8)}`;
}
export function memberInitials(m: HubMember): string {
  return m.role === "leader" ? "L" : "M";
}

export const DAY_MS = 86400000;

export function dayNumber(day: string | null | undefined): number {
  return day ? Date.parse(`${day.slice(0, 10)}T12:00:00Z`) / DAY_MS : NaN;
}
export function shiftDay(day: string, amount: number): string {
  return new Date((dayNumber(day) + amount) * DAY_MS)
    .toISOString()
    .slice(0, 10);
}
export function formatDay(
  day: string | null | undefined,
  options: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" },
): string {
  const value = dayNumber(day);
  return Number.isFinite(value)
    ? new Intl.DateTimeFormat("en-GB", { ...options, timeZone: "UTC" }).format(
        new Date(value * DAY_MS),
      )
    : "No date";
}
// Local calendar date (YYYY-MM-DD) for "today" in the browser's timezone.
export function todayLocal(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
export function dueLabel(day: string | null | undefined, today: string): string {
  if (!day) return "No date";
  const delta = dayNumber(day) - dayNumber(today);
  return delta === 0 ? "Today" : delta === 1 ? "Tomorrow" : formatDay(day);
}
export function daysAway(day: string | null | undefined, today: string): number | null {
  return day ? dayNumber(day) - dayNumber(today) : null;
}
// Task due date as a plain YYYY-MM-DD, or null. due_at is timestamptz in
// the real table; display keeps it date-only, as the prototype notes warn.
export function taskDueDate(task: HubTask): string | null {
  return task.due_at ? task.due_at.slice(0, 10) : null;
}
export function taskPriority(task: HubTask): string {
  return task.priority ?? "medium";
}
export function sortTasks(a: HubTask, b: HubTask): number {
  const status = (t: HubTask) => (t.status === "done" ? 1 : 0);
  const weight: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
  const dueA = dayNumber(taskDueDate(a));
  const dueB = dayNumber(taskDueDate(b));
  return (
    status(a) - status(b) ||
    (Number.isFinite(dueA) ? dueA : Infinity) -
      (Number.isFinite(dueB) ? dueB : Infinity) ||
    (weight[taskPriority(a)] ?? 2) - (weight[taskPriority(b)] ?? 2) ||
    a.title.localeCompare(b.title)
  );
}
export function projectTasks(project: HubProject, tasks: HubTask[]): HubTask[] {
  return tasks.filter((t) => t.project_id === project.id);
}
export function projectProgress(project: HubProject, tasks: HubTask[]) {
  const list = projectTasks(project, tasks);
  const done = list.filter((t) => t.status === "done").length;
  return {
    total: list.length,
    done,
    percent: list.length ? Math.round((done / list.length) * 100) : 0,
    blocked: list.filter((t) => t.status === "failed").length,
  };
}
// Capacity lookup over the real capacity rows; default 5, clamped 1-30.
// Keyed by workspace_members.id, not by user id.
export function capacityFor(
  rows: { member_id: string; capacity: number }[],
  memberId: string,
): number {
  const row = rows.find((r) => r.member_id === memberId);
  return row && Number.isFinite(row.capacity)
    ? Math.min(30, Math.max(1, Math.round(row.capacity)))
    : 5;
}
export function dueBand(
  task: HubTask,
  today: string,
): "overdue" | "today" | "next7" | "later" | "nodate" {
  const due = taskDueDate(task);
  if (!due) return "nodate";
  const delta = dayNumber(due) - dayNumber(today);
  if (delta < 0) return "overdue";
  if (delta === 0) return "today";
  if (delta <= 7) return "next7";
  return "later";
}
// CSV escaping from the prototype (formula-prefix neutralisation kept):
// a cell starting with =, +, -, @ or whitespace is prefixed with a quote
// so a spreadsheet does not run it as a formula.
export function safeCSV(value: unknown): string {
  let text = String(value ?? "");
  if (/^\s*[=+@\-]/.test(text) || /^[\t\r\n]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}
