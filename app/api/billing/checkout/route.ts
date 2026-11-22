// Billing checkout: POST /api/billing/checkout
//
// Creates a Lemon Squeezy checkout (merchant of record) for a workspace
// upgrade. Leader-only: the caller must be a leader of the workspace.
// Billing is DRAFT: this route fails closed (503) until the Lemon
// Squeezy env vars are set, and no payment is taken until Kartikey
// confirms the prices and the test-mode store. No real credentials are
// stored here; LEMONSQUEEZY_API_KEY / LEMONSQUEEZY_STORE_ID /
// LS_PRO_VARIANT_ID / LS_TEAM_VARIANT_ID are server-only env vars.
//
// Body: { "workspaceId": string, "tier": "pro" | "team" }
// Response: { "url": string } — the hosted checkout URL to redirect to.
//
// Gemini's plan used workspaces.owner_id to verify the leader; Hivlet
// has no owner_id column. The leader check here uses the workspace
// membership role (requireWorkspace + isLeader), which is the real
// authority in this codebase.

import { NextResponse } from "next/server";
import { requireWorkspace, isLeader } from "@/lib/workspace";
import type { PlanTier } from "@/lib/billing";

export const runtime = "nodejs";

const LEMON_SQUEEZY_API = "https://api.lemonsqueezy.com/v1/checkouts";

function variantIdForTier(tier: PlanTier): string | null {
  if (tier === "pro") return process.env.LS_PRO_VARIANT_ID ?? null;
  if (tier === "team") return process.env.LS_TEAM_VARIANT_ID ?? null;
  return null;
}

export async function POST(req: Request) {
  let body: { workspaceId?: unknown; tier?: unknown };
  try {
    body = (await req.json()) as { workspaceId?: unknown; tier?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const workspaceId = typeof body.workspaceId === "string" ? body.workspaceId : "";
  const tier = body.tier === "pro" || body.tier === "team" ? body.tier : null;
  if (!workspaceId || !tier) {
    return NextResponse.json(
      { error: "workspaceId and tier (pro or team) are required." },
      { status: 400 }
    );
  }

  // Leader-only. requireWorkspace redirects when signed out or not a
  // member; in a route handler a redirect is not useful, so catch the
  // leader check explicitly instead: read the membership via
  // requireWorkspace and return 403 when not a leader.
  let workspace;
  let membership;
  try {
    ({ workspace, membership } = await requireWorkspace(workspaceId));
  } catch {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  void workspace;
  if (!isLeader(membership)) {
    return NextResponse.json(
      { error: "Only workspace leaders can manage billing." },
      { status: 403 }
    );
  }

  const apiKey = process.env.LEMONSQUEEZY_API_KEY;
  const storeId = process.env.LEMONSQUEEZY_STORE_ID;
  const variantId = variantIdForTier(tier);
  if (!apiKey || !storeId || !variantId) {
    return NextResponse.json(
      {
        error:
          "Billing is not configured yet: the Lemon Squeezy store and variant are not set up. No payment was taken.",
      },
      { status: 503 }
    );
  }

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? "https://hivlet.vercel.app";

  const response = await fetch(LEMON_SQUEEZY_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/vnd.api+json",
      Accept: "application/vnd.api+json",
    },
    body: JSON.stringify({
      data: {
        type: "checkouts",
        attributes: {
          checkout_data: {
            custom: {
              workspace_id: workspaceId,
              leader_user_id: membership.user_id,
            },
          },
          product_options: {
            redirect_url: `${appUrl}/workspace/${workspaceId}/billing?success=true`,
          },
        },
        relationships: {
          store: { data: { type: "stores", id: storeId } },
          variant: { data: { type: "variants", id: String(variantId) } },
        },
      },
    }),
  });

  if (!response.ok) {
    console.error("Lemon Squeezy checkout failed:", response.status);
    return NextResponse.json(
      { error: "Could not start checkout. No payment was taken." },
      { status: 502 }
    );
  }

  const checkout = (await response.json()) as {
    data?: { attributes?: { url?: string } };
  };
  const url = checkout.data?.attributes?.url;
  if (!url) {
    console.error("Lemon Squeezy checkout returned no URL.");
    return NextResponse.json(
      { error: "Could not start checkout. No payment was taken." },
      { status: 502 }
    );
  }
  return NextResponse.json({ url });
}
