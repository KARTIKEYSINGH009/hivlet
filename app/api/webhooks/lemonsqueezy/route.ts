// Lemon Squeezy webhook: POST /api/webhooks/lemonsqueezy
//
// Verifies the HMAC-SHA256 signature (x-signature header) against
// LEMONSQUEEZY_WEBHOOK_SECRET using the raw request body, then applies
// subscription lifecycle events to workspace_billing. Idempotent: the
// event id is inserted into billing_webhook_events first, and a
// duplicate insert means the event was already processed.
//
// Events handled:
//   subscription_created / subscription_updated — upsert the billing
//     row (a workspace with no row gets one) with tier, limits, MoR
//     ids, status, period end, and cancel_at_period_end, mapped from
//     the variant id (LS_PRO_VARIANT_ID / LS_TEAM_VARIANT_ID).
//   subscription_payment_success — mark active and reset
//     runs_used_this_cycle to 0 for the new period.
//   subscription_expired — downgrade to Free (100 runs, 1 member).
// Events with no workspace_id in meta.custom_data are acknowledged
// and ignored (they are not workspace subscriptions).
//
// Uses the service-role client: the webhook is server-to-server and
// bypasses RLS by design. Fails closed (503) when the webhook secret
// or service-role key is unset.

import { NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { PLAN_LIMITS, type PlanTier } from "@/lib/billing";

export const runtime = "nodejs";

function variantConfig(variantId: string): { tier: PlanTier } | null {
  const proId = process.env.LS_PRO_VARIANT_ID;
  const teamId = process.env.LS_TEAM_VARIANT_ID;
  if (proId && variantId === String(proId)) return { tier: "pro" };
  if (teamId && variantId === String(teamId)) return { tier: "team" };
  return null;
}

function mapStatus(lsStatus: string, cancelled: boolean): string {
  if (lsStatus === "active") return "active";
  if (lsStatus === "past_due" || lsStatus === "unpaid") return "past_due";
  if (lsStatus === "cancelled" || cancelled) return "cancelled";
  if (lsStatus === "expired") return "free";
  if (lsStatus === "paused") return "paused";
  return "free";
}

export async function POST(req: Request) {
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
  const url =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret || !url || !serviceKey) {
    return NextResponse.json(
      { error: "Webhook not configured." },
      { status: 503 }
    );
  }

  const rawBody = await req.text();
  const signature = req.headers.get("x-signature") ?? "";

  // HMAC-SHA256 over the raw body. Lengths must match before
  // timingSafeEqual, otherwise it throws.
  const digest = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");
  const digestBuffer = Buffer.from(digest, "utf8");
  const sigBuffer = Buffer.from(signature, "utf8");
  if (
    digestBuffer.length !== sigBuffer.length ||
    !crypto.timingSafeEqual(digestBuffer, sigBuffer)
  ) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  let payload: {
    meta?: { event_name?: string; custom_data?: { workspace_id?: string } };
    data?: {
      id?: string | number;
      attributes?: {
        variant_id?: string | number;
        customer_id?: string | number;
        status?: string;
        cancelled?: boolean;
        renews_at?: string | null;
        ends_at?: string | null;
        updated_at?: string;
      };
    };
  };
  try {
    payload = JSON.parse(rawBody) as typeof payload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const eventName = payload.meta?.event_name ?? "";
  const workspaceId = payload.meta?.custom_data?.workspace_id;
  if (!workspaceId) {
    // Not a workspace subscription event: acknowledge, ignore.
    return NextResponse.json({ received: true });
  }

  const supabaseAdmin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Idempotency: one row per event. A duplicate insert means this
  // event was already processed; acknowledge without re-applying.
  const eventId = `${eventName}_${String(payload.data?.id ?? "unknown")}_${payload.data?.attributes?.updated_at ?? ""}`;
  const { error: dupError } = await supabaseAdmin
    .from("billing_webhook_events")
    .insert({
      event_id: eventId,
      event_name: eventName,
      workspace_id: workspaceId,
    });
  if (dupError) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  const attrs = payload.data?.attributes ?? {};
  const variantId =
    attrs.variant_id !== undefined && attrs.variant_id !== null
      ? String(attrs.variant_id)
      : "";

  switch (eventName) {
    case "subscription_created":
    case "subscription_updated": {
      const config = variantId ? variantConfig(variantId) : null;
      if (!config) {
        console.error(
          "Lemon Squeezy webhook: unknown variant, ignoring:",
          variantId
        );
        break;
      }
      const limits = PLAN_LIMITS[config.tier];
      // owner_user_id is NOT NULL, so resolve the workspace creator
      // first (the checkout's custom_data carries the leader id, but
      // the webhook payload only guarantees workspace_id).
      const { data: ws } = await supabaseAdmin
        .from("workspaces")
        .select("created_by")
        .eq("id", workspaceId)
        .single();
      const ownerId = (ws as { created_by?: string } | null)?.created_by;
      if (!ownerId) {
        console.error(
          "Lemon Squeezy webhook: workspace not found, cannot upsert billing row:",
          workspaceId
        );
        break;
      }
      const { error } = await supabaseAdmin.from("workspace_billing").upsert(
        {
          workspace_id: workspaceId,
          owner_user_id: ownerId,
          mor_customer_id:
            attrs.customer_id !== undefined && attrs.customer_id !== null
              ? String(attrs.customer_id)
              : null,
          mor_subscription_id: String(payload.data?.id ?? ""),
          mor_variant_id: variantId,
          tier: config.tier,
          status: mapStatus(attrs.status ?? "", attrs.cancelled ?? false),
          monthly_run_limit: limits.monthlyRuns,
          max_members: limits.maxMembers,
          current_period_end: attrs.renews_at ?? attrs.ends_at ?? undefined,
          cancel_at_period_end: attrs.cancelled ?? false,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "workspace_id" }
      );
      if (error) {
        console.error(
          "Lemon Squeezy webhook: could not upsert billing row:",
          error.message
        );
      }
      break;
    }

    case "subscription_payment_success": {
      await supabaseAdmin
        .from("workspace_billing")
        .update({
          status: "active",
          runs_used_this_cycle: 0,
          current_period_start: new Date().toISOString(),
          current_period_end: attrs.renews_at ?? undefined,
          updated_at: new Date().toISOString(),
        })
        .eq("workspace_id", workspaceId);
      break;
    }

    case "subscription_expired": {
      await supabaseAdmin
        .from("workspace_billing")
        .update({
          tier: "free",
          status: "free",
          monthly_run_limit: PLAN_LIMITS.free.monthlyRuns,
          max_members: PLAN_LIMITS.free.maxMembers,
          updated_at: new Date().toISOString(),
        })
        .eq("workspace_id", workspaceId);
      break;
    }

    default:
      // Other Lemon Squeezy events (e.g. order_created): acknowledged
      // above via the idempotency insert; nothing to apply.
      break;
  }

  return NextResponse.json({ received: true });
}
