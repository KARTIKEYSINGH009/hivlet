// Human-edit provenance + best-effort optional-column writes.
//
// Two problems this module solves, both caused by columns that do not
// exist in the database yet (Piece 1 owns migrations):
//
//   1. A leader editing a report or an approval payload must leave a
//      durable "a human edited this" trail. Until the pending columns
//      exist, that trail lives in the append-only audit_logs table,
//      which already exists and already has a member-insert policy.
//      Nothing here invents a column in a UI query that could crash.
//
//   2. Writing the pending columns (was_human_edited,
//      human_edited_payload, webhook_delivery_status,
//      webhook_http_status) must degrade gracefully: try the full
//      update, and if Postgres rejects it because the column is
//      missing, retry with only the columns that are known to exist.
//      The edit itself never fails because a tracking column is absent.
//
// PENDING COLUMNS (Piece 1 owns the migration; do NOT write SQL here):
//   approvals.was_human_edited boolean not null default false
//   approvals.human_edited_payload jsonb   -- the pre-edit payload
//   approvals.webhook_delivery_status text -- pending | delivered | delivery_failed
//   approvals.webhook_http_status integer
//   reports.was_human_edited boolean not null default false
//   workspaces.approval_webhook_url text   -- nullable, leader-configured
//
// Once the migration lands, the best-effort updates below start writing
// the columns automatically (the first attempt succeeds) and the audit
// log stays as the permanent trail. No code change is needed then.

import type { SupabaseClient } from "@supabase/supabase-js";

type TableName = "approvals" | "reports" | "workspaces";

// Update a row with the base patch (columns that exist today) plus
// optional patches (pending columns). If the full update fails —
// typically "Could not find the 'x' column" on an older database —
// retry with the base patch only, so the real edit is never lost.
// Returns true when the base update landed.
export async function updateWithOptionalColumns(
  supabase: SupabaseClient,
  table: TableName,
  id: string,
  basePatch: Record<string, unknown>,
  optionalPatch: Record<string, unknown>
): Promise<boolean> {
  const full = { ...basePatch, ...optionalPatch };
  const { error } = await supabase.from(table).update(full).eq("id", id);
  if (!error) return true;
  console.error(
    `optional-column update on ${table} failed, retrying with base columns only:`,
    error.message
  );
  // No base columns to retry with (caller only wanted optional ones):
  // the edit is still recorded in the audit log by the caller.
  if (Object.keys(basePatch).length === 0) return false;
  const { error: baseError } = await supabase
    .from(table)
    .update(basePatch)
    .eq("id", id);
  if (baseError) {
    console.error(`base update on ${table} failed:`, baseError.message);
    return false;
  }
  return true;
}

// Append-only human-edit record. Never throws: logging must never fail
// the edit it describes.
export async function recordHumanEdit(
  supabase: SupabaseClient,
  args: {
    workspaceId: string;
    memberId: string | null;
    action: "approval_payload_edited" | "report_edited";
    targetId: string;
    summary: Record<string, unknown>;
  }
): Promise<void> {
  const { error } = await supabase.from("audit_logs").insert({
    workspace_id: args.workspaceId,
    actor_type: "member",
    actor_id: args.memberId,
    action: args.action,
    target_type: args.action === "approval_payload_edited" ? "approval" : "report",
    target_id: args.targetId,
    summary: { ...args.summary, human_edited: true },
  });
  if (error) console.error("human-edit audit insert failed:", error.message);
}

// Which approvals / reports in this workspace carry a human-edit audit
// record. Used to render the "Human edited" badge without depending on
// the pending was_human_edited columns.
export async function fetchHumanEditedIds(
  supabase: SupabaseClient,
  workspaceId: string
): Promise<{ approvals: Set<string>; reports: Set<string> }> {
  const approvals = new Set<string>();
  const reports = new Set<string>();
  const { data, error } = await supabase
    .from("audit_logs")
    .select("action, target_id")
    .eq("workspace_id", workspaceId)
    .in("action", ["approval_payload_edited", "report_edited"]);
  if (error || !data) {
    if (error) console.error("human-edit audit read failed:", error.message);
    return { approvals, reports };
  }
  for (const row of data as { action: string; target_id: string | null }[]) {
    if (!row.target_id) continue;
    if (row.action === "approval_payload_edited") approvals.add(row.target_id);
    if (row.action === "report_edited") reports.add(row.target_id);
  }
  return { approvals, reports };
}

// Best-effort read of the pending was_human_edited flags. Returns an
// empty set when the columns do not exist yet (the select errors and we
// fall back to the audit log, which fetchHumanEditedIds already covers).
export async function fetchWasHumanEditedFlags(
  supabase: SupabaseClient,
  table: "approvals" | "reports",
  workspaceId: string
): Promise<Set<string>> {
  const flags = new Set<string>();
  const { data, error } = await supabase
    .from(table)
    .select("id, was_human_edited")
    .eq("workspace_id", workspaceId);
  if (error || !data) return flags; // columns missing: degrade silently
  for (const row of data as { id: string; was_human_edited: boolean | null }[]) {
    if (row.was_human_edited) flags.add(row.id);
  }
  return flags;
}

// ── Revision context (for the next agent run) ────────────────────────────────
// When a leader requests revision on an in_review task, the tasks page
// logs a task_events row (event_type "revision_requested") whose detail
// carries ONLY the previous output plus the human correction note —
// never a fresh task description, never a restart. The next run must be
// scoped to that context. This helper is the read side of that contract
// for the worker prompt builder (Piece 2 owns lib/execution.ts): call it
// before building the next run's prompt for a task that came back from
// review, and prepend the returned context instead of re-sending the
// whole task. Returns null when no revision was ever requested.
export async function getLatestRevisionContext(
  supabase: SupabaseClient,
  taskId: string
): Promise<{
  correctionNote: string;
  previousOutput: string | null;
  requestedAt: string;
} | null> {
  const { data, error } = await supabase
    .from("task_events")
    .select("detail, created_at")
    .eq("task_id", taskId)
    .eq("event_type", "revision_requested")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();
  if (error || !data) return null;
  const detail = (data as { detail: Record<string, unknown> }).detail ?? {};
  const note = typeof detail.correction_note === "string" ? detail.correction_note : "";
  const prev =
    typeof detail.previous_output === "string" ? detail.previous_output : null;
  return {
    correctionNote: note,
    previousOutput: prev,
    requestedAt: (data as { created_at: string }).created_at,
  };
}

// Formats the revision context as the prompt scope for the next run:
// previous output + human correction note, nothing else.
export function formatRevisionPromptScope(ctx: {
  correctionNote: string;
  previousOutput: string | null;
}): string {
  const prev = ctx.previousOutput ?? "(no previous output recorded)";
  const note = ctx.correctionNote.trim()
    ? ctx.correctionNote.trim()
    : "(no correction note left — review the previous output and fix what is wrong with it)";
  return (
    `This is a REVISION, not a new task. Do not restart the work.\n` +
    `Previous output:\n${prev}\n\n` +
    `Human correction note:\n${note}\n\n` +
    `Revise only what the note asks for, keeping everything else from the previous output.`
  );
}
