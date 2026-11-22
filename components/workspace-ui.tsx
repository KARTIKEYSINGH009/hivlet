import type { ReactNode } from "react";

// Shared presentational pieces for the workspace area (light paper,
// white panels, ink text, brass accent, hairlines). Green and red are
// status only.

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-[28px] font-bold leading-[36px] tracking-tight text-ink sm:text-[32px] sm:leading-[40px]">
          {title}
        </h1>
        {description && (
          <p className="mt-1 max-w-2xl text-sm text-muted">{description}</p>
        )}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  );
}

export function MetricCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-line bg-surface p-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted">
        {label}
      </p>
      <p className="mt-2 text-3xl font-bold tabular-nums tracking-tight text-ink">
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

function pill(
  text: string,
  classes: string
) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${classes}`}
    >
      {text}
    </span>
  );
}

export function TaskStatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    todo: "border-line bg-transparent text-muted",
    in_progress: "border-[#CFE5DA] bg-ok-tint text-ok",
    in_review: "border-[#EEDFB9] bg-warn-tint text-warn",
    done: "border-[#CFE5DA] bg-transparent text-ok",
    failed: "border-[#EFD3CD] bg-danger-tint text-danger",
    blocked: "border-line bg-transparent text-muted",
  };
  const labels: Record<string, string> = {
    todo: "To do",
    in_progress: "In progress",
    in_review: "In review",
    done: "Done",
    failed: "Failed",
    blocked: "Blocked",
  };
  return pill(labels[status] ?? status, map[status] ?? map.todo);
}

export function AgentStatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    idle: "border-line bg-paper-2 text-muted",
    working: "border-[#CFE5DA] bg-ok-tint text-ok",
    awaiting_approval: "border-[#EEDFB9] bg-warn-tint text-warn",
    failed: "border-[#EFD3CD] bg-danger-tint text-danger",
    disabled: "border-line bg-transparent text-muted",
    paused: "border-line bg-transparent text-muted",
    error: "border-[#EFD3CD] bg-danger-tint text-danger",
  };
  const labels: Record<string, string> = {
    idle: "Idle",
    working: "Working",
    awaiting_approval: "Awaiting approval",
    failed: "Failed",
    disabled: "Disabled",
    paused: "Paused",
    error: "Error",
  };
  return pill(labels[status] ?? status, map[status] ?? map.idle);
}

export function PriorityPill({ priority }: { priority: string | null }) {
  const p = priority ?? "medium";
  const map: Record<string, string> = {
    low: "border-line bg-transparent text-muted",
    medium: "border-brass-line bg-brass-tint text-brass-strong",
    high: "border-[#EEDFB9] bg-warn-tint text-warn",
    urgent: "border-[#EFD3CD] bg-danger-tint text-danger",
  };
  const label = p.charAt(0).toUpperCase() + p.slice(1);
  return pill(label, map[p] ?? map.medium);
}

export function ApprovalStatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "border-[#EEDFB9] bg-warn-tint text-warn",
    approved: "border-[#CFE5DA] bg-transparent text-ok",
    rejected: "border-[#EFD3CD] bg-danger-tint text-danger",
    expired: "border-line bg-transparent text-muted",
  };
  const labels: Record<string, string> = {
    pending: "Pending",
    approved: "Approved",
    rejected: "Rejected",
    expired: "Expired",
  };
  return pill(labels[status] ?? status, map[status] ?? map.pending);
}

export function ExecutionStatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    queued: "border-line bg-transparent text-muted",
    running: "border-[#CFE5DA] bg-ok-tint text-ok",
    succeeded: "border-[#CFE5DA] bg-transparent text-ok",
    failed: "border-[#EFD3CD] bg-danger-tint text-danger",
  };
  const labels: Record<string, string> = {
    queued: "Queued",
    running: "Running",
    succeeded: "Succeeded",
    failed: "Failed",
  };
  return pill(labels[status] ?? status, map[status] ?? map.queued);
}

// DEMO executions are fixture outputs, never real model runs. The pill is
// the label that keeps that honest everywhere a run is shown.
export function DemoPill() {
  return pill(
    "DEMO",
    "border-brass-line bg-brass-tint text-brass-strong"
  );
}

export function EmptyState({
  title,
  hint,
}: {
  title: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-dashed border-line bg-surface px-6 py-10 text-center">
      <p className="font-medium text-ink">{title}</p>
      {hint && <p className="mx-auto mt-1 max-w-md text-sm text-muted">{hint}</p>}
    </div>
  );
}

export function ErrorBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p className="rounded-lg border border-[#AC4136]/40 bg-[#FBEDEA] px-4 py-3 text-sm text-[#AC4136]">
      {message}
    </p>
  );
}

export function fmtDate(value: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString();
}

export function fmtDateTime(value: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString();
}
