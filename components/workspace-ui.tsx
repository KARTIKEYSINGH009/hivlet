import type { ReactNode } from "react";

// Shared presentational pieces for the LIGHT workspace content area
// (dark sidebar lives in workspace-sidebar.tsx). No client JS here.

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
        <h1 className="text-2xl font-bold tracking-tight text-stone-900">
          {title}
        </h1>
        {description && (
          <p className="mt-1 max-w-2xl text-sm text-stone-500">{description}</p>
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
    <div className="rounded-xl border border-stone-200 bg-white p-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">
        {label}
      </p>
      <p className="mt-2 text-3xl font-bold tracking-tight text-stone-900">
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-stone-500">{hint}</p>}
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
    todo: "border-stone-300 bg-stone-100 text-stone-700",
    in_progress: "border-blue-300 bg-blue-50 text-blue-700",
    in_review: "border-amber-300 bg-amber-50 text-amber-700",
    done: "border-emerald-300 bg-emerald-50 text-emerald-700",
    failed: "border-red-300 bg-red-50 text-red-700",
    blocked: "border-stone-300 bg-stone-100 text-stone-500",
  };
  const label = status.replace("_", " ");
  return pill(label, map[status] ?? map.todo);
}

export function AgentStatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    idle: "border-stone-300 bg-stone-100 text-stone-700",
    working: "border-blue-300 bg-blue-50 text-blue-700",
    awaiting_approval: "border-amber-300 bg-amber-50 text-amber-700",
    failed: "border-red-300 bg-red-50 text-red-700",
    disabled: "border-stone-300 bg-stone-100 text-stone-500",
    paused: "border-stone-300 bg-stone-100 text-stone-500",
    error: "border-red-300 bg-red-50 text-red-700",
  };
  return pill(status.replace("_", " "), map[status] ?? map.idle);
}

export function PriorityPill({ priority }: { priority: string | null }) {
  const p = priority ?? "medium";
  const map: Record<string, string> = {
    low: "border-stone-300 bg-stone-100 text-stone-600",
    medium: "border-blue-300 bg-blue-50 text-blue-700",
    high: "border-orange-300 bg-orange-50 text-orange-700",
    urgent: "border-red-300 bg-red-50 text-red-700",
  };
  return pill(p, map[p] ?? map.medium);
}

export function ApprovalStatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "border-amber-300 bg-amber-50 text-amber-700",
    approved: "border-emerald-300 bg-emerald-50 text-emerald-700",
    rejected: "border-red-300 bg-red-50 text-red-700",
    expired: "border-stone-300 bg-stone-100 text-stone-500",
  };
  return pill(status, map[status] ?? map.pending);
}

export function ExecutionStatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    queued: "border-stone-300 bg-stone-100 text-stone-700",
    running: "border-blue-300 bg-blue-50 text-blue-700",
    succeeded: "border-emerald-300 bg-emerald-50 text-emerald-700",
    failed: "border-red-300 bg-red-50 text-red-700",
  };
  return pill(status, map[status] ?? map.queued);
}

// DEMO executions are fixture outputs, never real model runs. The pill is
// the label that keeps that honest everywhere a run is shown.
export function DemoPill() {
  return pill(
    "DEMO",
    "border-violet-300 bg-violet-50 text-violet-700"
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
    <div className="rounded-xl border border-dashed border-stone-300 bg-white/60 px-6 py-10 text-center">
      <p className="font-medium text-stone-900">{title}</p>
      {hint && <p className="mx-auto mt-1 max-w-md text-sm text-stone-500">{hint}</p>}
    </div>
  );
}

export function ErrorBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
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
