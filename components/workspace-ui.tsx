import type { ReactNode } from "react";

// Shared presentational pieces for the DARK workspace area (Option B, gold).
// Page background is ink, panels are coal, text is ivory, secondary text
// is muted, gold is the only accent. Green and red are status only.

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
        <h1 className="font-display text-[28px] font-bold leading-[36px] tracking-tight text-ivory sm:text-[32px] sm:leading-[40px]">
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
    <div className="rounded-xl border border-white/10 bg-coal p-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted">
        {label}
      </p>
      <p className="mt-2 text-3xl font-bold tabular-nums tracking-tight text-ivory">
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
    todo: "border-white/15 bg-coal text-muted",
    in_progress: "border-gold bg-gold text-ink",
    in_review: "border-gold/60 bg-transparent text-gold-soft",
    done: "border-[#9db89a]/40 bg-[#1a2a1d] text-[#9db89a]",
    failed: "border-[#d98c8c]/40 bg-[#2a1515] text-[#d98c8c]",
    blocked: "border-white/15 bg-coal text-muted",
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
    idle: "border-white/15 bg-coal text-muted",
    working: "border-gold bg-gold text-ink",
    awaiting_approval: "border-gold/60 bg-transparent text-gold-soft",
    failed: "border-[#d98c8c]/40 bg-[#2a1515] text-[#d98c8c]",
    disabled: "border-white/15 bg-coal text-muted",
    paused: "border-white/15 bg-coal text-muted",
    error: "border-[#d98c8c]/40 bg-[#2a1515] text-[#d98c8c]",
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
    low: "border-white/15 bg-coal text-muted",
    medium: "border-gold/60 bg-transparent text-gold-soft",
    high: "border-gold bg-gold text-ink",
    urgent: "border-[#d98c8c]/40 bg-[#2a1515] text-[#d98c8c]",
  };
  const label = p.charAt(0).toUpperCase() + p.slice(1);
  return pill(label, map[p] ?? map.medium);
}

export function ApprovalStatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "border-gold/60 bg-transparent text-gold-soft",
    approved: "border-[#9db89a]/40 bg-[#1a2a1d] text-[#9db89a]",
    rejected: "border-[#d98c8c]/40 bg-[#2a1515] text-[#d98c8c]",
    expired: "border-white/15 bg-coal text-muted",
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
    queued: "border-white/15 bg-coal text-muted",
    running: "border-gold bg-gold text-ink",
    succeeded: "border-[#9db89a]/40 bg-[#1a2a1d] text-[#9db89a]",
    failed: "border-[#d98c8c]/40 bg-[#2a1515] text-[#d98c8c]",
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
    "border-gold/60 bg-transparent text-gold-soft"
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
    <div className="rounded-xl border border-dashed border-white/15 bg-coal px-6 py-10 text-center">
      <p className="font-medium text-ivory">{title}</p>
      {hint && <p className="mx-auto mt-1 max-w-md text-sm text-muted">{hint}</p>}
    </div>
  );
}

export function ErrorBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p className="rounded-lg border border-[#d98c8c]/40 bg-[#2a1515] px-4 py-3 text-sm text-[#d98c8c]">
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
