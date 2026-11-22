// Signed outbound webhook fired on leader approval — server only.
//
// Flow: a leader approves an approval in the approvals page. ONLY then,
// after the approval row is updated and the execution is enqueued, this
// module POSTs a signed JSON event to the workspace-configured webhook
// URL. It never fires automatically, never fires from a demo run (demo
// runs never touch decideApproval), and never fires for a rejection.
//
//   * URL: per workspace, leader-configured in Workspace settings.
//     Stored in the PENDING column workspaces.approval_webhook_url
//     (Piece 1 owns the migration). Until that column exists, the URL
//     cannot be saved anywhere and delivery reports "not_configured".
//     The read below is best-effort: a missing column degrades to
//     "not configured" instead of crashing the approval.
//   * Secret: server-only env HIVLET_WEBHOOK_SECRET. Never a client
//     key, never read from the workspace row, never logged, never
//     stored in the database. If it is unset, delivery fails closed
//     (recorded as delivery_failed, approval itself still stands).
//     A per-workspace secret is a later milestone; until then one
//     server secret signs every workspace's webhook.
//   * Signature: HMAC-SHA256 over the raw request body, sent as
//     `X-Hivlet-Signature: sha256=<hex>`, plus
//     `X-Hivlet-Event: approval.approved` so receivers can route it.
//   * Delivery status: recorded on the approval as
//     webhook_delivery_status (pending | delivered | delivery_failed)
//     plus webhook_http_status — both PENDING columns, written
//     best-effort (see lib/human-edits.ts updateWithOptionalColumns).
//     The status is ALSO written to the append-only audit_logs table
//     every time, so it is durable even before the migration lands.
//     The approvals page reads both sources and prefers the columns.
//
// Nothing in this module sends anything live on its own: the only
// caller is the leader-only approve action (and the leader-only
// redeliver action for an already-approved approval). No live sends
// were made while building this; the code path is untested against a
// real endpoint until a workspace configures a URL and a leader
// approves something.
//
// PENDING COLUMNS (Piece 1 owns the migration; do NOT write SQL here):
//   workspaces.approval_webhook_url text
//   approvals.webhook_delivery_status text
//   approvals.webhook_http_status integer

import { createHmac } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { updateWithOptionalColumns } from "@/lib/human-edits";

export type WebhookDeliveryStatus =
  | "not_configured" // no webhook URL saved for this workspace
  | "pending" // approved, delivery not attempted yet / in flight
  | "delivered" // endpoint answered 2xx
  | "delivery_failed" // no URL secret, network error, or non-2xx
  | "skipped"; // caller asked to deliver for a non-approved approval: never sent

export type WebhookDeliveryResult = {
  status: WebhookDeliveryStatus;
  httpStatus: number | null;
  error?: string;
};

export type ApprovalForWebhook = {
  id: string;
  workspace_id: string;
  agent_id: string;
  task_id: string | null;
  action_type: string;
  action_detail: Record<string, unknown>;
  status: string;
  decided_by_member_id: string | null;
  decided_at: string | null;
};

const WEBHOOK_TIMEOUT_MS = 10_000;

// HMAC-SHA256 over the raw body. Returns the header value:
// `sha256=<hex>`. Receivers recompute it with the shared secret.
export function signWebhookPayload(secret: string, body: string): string {
  const hex = createHmac("sha256", secret).update(body, "utf8").digest("hex");
  return `sha256=${hex}`;
}

// Best-effort read of the workspace's configured webhook URL. Returns
// null when the pending column does not exist yet, or no URL is saved.
export async function getWorkspaceWebhookUrl(
  supabase: SupabaseClient,
  workspaceId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from("workspaces")
    .select("approval_webhook_url")
    .eq("id", workspaceId)
    .single();
  if (error || !data) return null; // column missing or row unreadable
  const url = (data as { approval_webhook_url?: unknown }).approval_webhook_url;
  return typeof url === "string" && url.trim() ? url.trim() : null;
}

// Best-effort read of delivery statuses for approvals in a workspace.
// Prefers the pending columns when they exist; falls back to the audit
// log, which deliverApprovalWebhook always writes.
export async function fetchWebhookDeliveryStatuses(
  supabase: SupabaseClient,
  workspaceId: string
): Promise<Map<string, { status: WebhookDeliveryStatus; httpStatus: number | null }>> {
  const out = new Map<
    string,
    { status: WebhookDeliveryStatus; httpStatus: number | null }
  >();
  // Audit log first: it always exists, so it is the reliable source
  // until the columns land.
  const { data: audit, error: auditError } = await supabase
    .from("audit_logs")
    .select("action, target_id, summary, created_at")
    .eq("workspace_id", workspaceId)
    .in("action", ["approval_webhook_delivered", "approval_webhook_failed"])
    .order("created_at", { ascending: false });
  if (!auditError && audit) {
    for (const row of audit as {
      action: string;
      target_id: string | null;
      summary: Record<string, unknown>;
    }[]) {
      if (!row.target_id || out.has(row.target_id)) continue;
      out.set(row.target_id, {
        status:
          row.action === "approval_webhook_delivered"
            ? "delivered"
            : "delivery_failed",
        httpStatus:
          typeof row.summary?.http_status === "number"
            ? (row.summary.http_status as number)
            : null,
      });
    }
  }
  // Pending columns override the audit log when they exist (they are
  // written in the same step, so they agree; this just prefers them).
  const { data: cols, error: colsError } = await supabase
    .from("approvals")
    .select("id, webhook_delivery_status, webhook_http_status")
    .eq("workspace_id", workspaceId);
  if (!colsError && cols) {
    for (const row of cols as {
      id: string;
      webhook_delivery_status: string | null;
      webhook_http_status: number | null;
    }[]) {
      if (!row.webhook_delivery_status) continue;
      out.set(row.id, {
        status: row.webhook_delivery_status as WebhookDeliveryStatus,
        httpStatus: row.webhook_http_status,
      });
    }
  }
  return out;
}

// Deliver the approval event. Server-only: reads the server secret from
// env, signs the body, POSTs it, records the outcome, and never throws.
// Call ONLY after a leader has approved (status === "approved").
// Returns "skipped" without sending anything for any other status.
export async function deliverApprovalWebhook(
  supabase: SupabaseClient,
  approval: ApprovalForWebhook
): Promise<WebhookDeliveryResult> {
  if (approval.status !== "approved") {
    return {
      status: "skipped",
      httpStatus: null,
      error: "Approval is not approved; webhook is never sent.",
    };
  }

  const record = async (
    status: "delivered" | "delivery_failed",
    httpStatus: number | null,
    error?: string
  ): Promise<WebhookDeliveryResult> => {
    // Best-effort columns first (no-op until the migration lands),
    // then the append-only audit log, which is the durable record.
    await updateWithOptionalColumns(
      supabase,
      "approvals",
      approval.id,
      {},
      {
        webhook_delivery_status: status,
        webhook_http_status: httpStatus,
      }
    );
    const { error: auditError } = await supabase.from("audit_logs").insert({
      workspace_id: approval.workspace_id,
      actor_type: "system",
      actor_id: approval.decided_by_member_id,
      action:
        status === "delivered"
          ? "approval_webhook_delivered"
          : "approval_webhook_failed",
      target_type: "approval",
      target_id: approval.id,
      summary: {
        http_status: httpStatus,
        error: error ?? null,
        event: "approval.approved",
      },
    });
    if (auditError) {
      console.error("webhook audit insert failed:", auditError.message);
    }
    return { status, httpStatus, error };
  };

  const url = await getWorkspaceWebhookUrl(supabase, approval.workspace_id);
  if (!url) {
    return record(
      "delivery_failed",
      null,
      "No approval webhook URL is configured for this workspace."
    );
  }
  const secret = process.env.HIVLET_WEBHOOK_SECRET;
  if (!secret) {
    return record(
      "delivery_failed",
      null,
      "HIVLET_WEBHOOK_SECRET is unset on the server."
    );
  }

  const body = JSON.stringify({
    event: "approval.approved",
    approval_id: approval.id,
    workspace_id: approval.workspace_id,
    agent_id: approval.agent_id,
    task_id: approval.task_id,
    action_type: approval.action_type,
    action_detail: approval.action_detail,
    decided_by_member_id: approval.decided_by_member_id,
    decided_at: approval.decided_at,
    delivered_at: new Date().toISOString(),
  });
  const signature = signWebhookPayload(secret, body);

  let res: Response;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);
    try {
      res = await fetch(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-hivlet-event": "approval.approved",
          "x-hivlet-signature": signature,
        },
        body,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Webhook request failed.";
    return record("delivery_failed", null, message.slice(0, 300));
  }

  if (res.ok) {
    return record("delivered", res.status);
  }
  return record(
    "delivery_failed",
    res.status,
    `Webhook endpoint answered HTTP ${res.status}.`
  );
}
