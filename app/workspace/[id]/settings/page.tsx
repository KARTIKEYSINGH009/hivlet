import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireWorkspace, isLeader } from "@/lib/workspace";
import { isValidWebhookUrl } from "@/lib/verification";
import { getWorkspaceWebhookUrl } from "@/lib/approval-webhook";
// Billing (migration 012, DRAFT): best-effort read; a workspace with
// no billing row shows as Free with 100 runs, exactly as today.
import {
  FREE_TIER,
  PLAN_LIMITS,
  getWorkspaceBilling,
  runsRemaining,
} from "@/lib/billing";
import BillingUpgradeButton from "@/components/billing-upgrade-button";
import CopyInviteLink from "@/components/copy-invite-link";
import DeleteWorkspaceForm from "@/components/delete-workspace-form";
import {
  getInviteProviderStatus,
  requestInvite,
  type InviteChannel,
} from "@/lib/invite-providers";
import {
  PageHeader,
  EmptyState,
} from "@/components/workspace-ui";

async function updateWorkspace(workspaceId: string, formData: FormData) {
  "use server";
  const { supabase, membership } = await requireWorkspace(workspaceId);
  if (!isLeader(membership)) return;
  await supabase
    .from("workspaces")
    .update({
      name: String(formData.get("name") ?? "").trim(),
      description: String(formData.get("description") ?? "").trim() || null,
    })
    .eq("id", workspaceId);
  revalidatePath(`/workspace/${workspaceId}/settings`);
}

async function removeMember(workspaceId: string, formData: FormData) {
  "use server";
  const { supabase, membership } = await requireWorkspace(workspaceId);
  const memberId = String(formData.get("member_id") ?? "");
  // Leaders remove others; anyone can remove themselves (leave).
  if (!isLeader(membership) && memberId !== membership.id) return;
  await supabase
    .from("workspace_members")
    .delete()
    .eq("id", memberId)
    .eq("workspace_id", workspaceId);
  revalidatePath(`/workspace/${workspaceId}/settings`);
}

// Invite request handler. This deliberately sends nothing. It runs the
// provider abstraction in lib/invite-providers.ts, which returns
// configured: false for email and phone, and then redirects back with a
// plain message. No provider is hardcoded and no secret is read here.
async function requestInviteAction(workspaceId: string, formData: FormData) {
  "use server";
  await requireWorkspace(workspaceId);
  const channel = String(formData.get("channel") ?? "") as InviteChannel;
  const result = requestInvite(channel);
  void result;
  redirect(`/workspace/${workspaceId}/settings?invite=not-configured`);
}

async function deleteWorkspace(workspaceId: string, formData: FormData) {
  "use server";
  const { supabase, workspace, membership } = await requireWorkspace(workspaceId);
  if (!isLeader(membership)) return;
  // Server-side guard, not just UI: the typed name must match exactly,
  // otherwise nothing is deleted, even if the form is submitted directly.
  if (String(formData.get("confirm") ?? "") !== workspace.name) return;
  await supabase.from("workspaces").delete().eq("id", workspaceId);
  redirect("/workspaces");
}

// Leader-only approval webhook URL. The URL is stored in the PENDING
// column workspaces.approval_webhook_url (Piece 1 owns the migration):
// until that column exists the save fails cleanly with a banner and
// nothing is stored anywhere else. The URL must be https (http only
// for localhost). The signing secret is server-only
// (HIVLET_WEBHOOK_SECRET env), never stored here and never shown.
async function saveApprovalWebhookUrl(workspaceId: string, formData: FormData) {
  "use server";
  const { supabase, membership } = await requireWorkspace(workspaceId);
  if (!isLeader(membership)) return;
  const url = String(formData.get("approval_webhook_url") ?? "").trim();
  if (url && !isValidWebhookUrl(url)) {
    redirect(`/workspace/${workspaceId}/settings?webhook=invalid_url`);
  }
  const { error } = await supabase
    .from("workspaces")
    .update({ approval_webhook_url: url || null })
    .eq("id", workspaceId);
  if (error) {
    console.error("approval webhook URL save failed:", error.message);
    redirect(`/workspace/${workspaceId}/settings?webhook=pending_column`);
  }
  revalidatePath(`/workspace/${workspaceId}/settings`);
}

export default async function WorkspaceSettingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ invite?: string; webhook?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const { supabase, workspace, membership } = await requireWorkspace(id);
  const leader = isLeader(membership);

  // Best-effort read: null when the pending column does not exist yet
  // or no URL is configured.
  const webhookUrl = leader ? await getWorkspaceWebhookUrl(supabase, id) : null;

  // Billing, best-effort: null until migration 012 runs live or until
  // a subscription creates a row. Null shows as Free / 100 runs.
  const billing = leader ? await getWorkspaceBilling(supabase, id) : null;
  const billingView = billing ?? { ...FREE_TIER, workspace_id: id };
  const remaining = runsRemaining(billing);

  const { data: members } = await supabase
    .from("workspace_members")
    .select("id, user_id, role, created_at")
    .eq("workspace_id", id)
    .order("created_at");
  const memberList = (members ?? []) as {
    id: string;
    user_id: string;
    role: string;
    created_at: string;
  }[];

  const inputCls =
    "mt-1 w-full rounded-lg border border-white/15 bg-coal px-3 py-2 text-sm text-ivory focus:border-gold";

  return (
    <div>
      <PageHeader
        title="Workspace settings"
        description={`Configuration for ${workspace.name}.`}
      />

      <section className="mt-8 rounded-xl border border-white/10 bg-coal p-5">
        <h2 className="font-semibold text-ivory">Invite</h2>
        <p className="mt-1 text-sm text-muted">
          Anyone with this link can join as a member (invite code:{" "}
          <span className="font-medium text-ivory">
            {workspace.invite_code}
          </span>
          ).
        </p>
        <div className="mt-3">
          <CopyInviteLink code={workspace.invite_code} />
        </div>
      </section>

      {sp.invite === "not-configured" && (
        <p className="mt-6 rounded-lg border border-gold/40 bg-coal px-4 py-3 text-sm text-gold-soft">
          Email and phone invites are not configured, so nothing was sent.
          Link invites work today.
        </p>
      )}

      {sp.webhook === "pending_column" && (
        <p className="mt-6 rounded-lg border border-[#d98c8c]/40 bg-coal px-4 py-3 text-sm text-[#d98c8c]">
          The webhook URL could not be saved yet: the workspaces column
          for it does not exist in the database (migration pending).
          Nothing was stored.
        </p>
      )}
      {sp.webhook === "invalid_url" && (
        <p className="mt-6 rounded-lg border border-[#d98c8c]/40 bg-coal px-4 py-3 text-sm text-[#d98c8c]">
          That is not a valid webhook URL. Use an https URL (http is
          allowed only for localhost).
        </p>
      )}

      <section className="mt-6 rounded-xl border border-white/10 bg-coal p-5">
        <h2 className="font-semibold text-ivory">
          Email and phone invites, not working yet
        </h2>
        <p className="mt-1 text-sm text-muted">
          These buttons exist so the option is visible, but they do not
          send anything. A provider must be chosen and configured
          server-side before email or SMS invites work. No provider is
          hardcoded here, and no secret is stored here.
        </p>
        <div className="mt-4 space-y-3">
          {getInviteProviderStatus().map((p) => (
            <div
              key={p.channel}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium text-ivory">{p.label}</p>
                <p className="text-xs text-muted">{p.note}</p>
              </div>
              {p.configured ? (
                <span className="text-xs font-medium text-muted">Working</span>
              ) : (
                <form action={requestInviteAction.bind(null, id)}>
                  <input type="hidden" name="channel" value={p.channel} />
                  <button
                    type="submit"
                    className="rounded-lg border border-white/15 bg-coal px-3 py-1.5 text-xs font-medium text-muted hover:border-gold"
                  >
                    Try {p.label} (not configured)
                  </button>
                </form>
              )}
            </div>
          ))}
        </div>
      </section>

      {leader ? (
        <section className="mt-6 rounded-xl border border-white/10 bg-coal p-5">
          <h2 className="font-semibold text-ivory">Edit workspace</h2>
          <form action={updateWorkspace.bind(null, id)} className="mt-4 space-y-3">
            <input name="name" defaultValue={workspace.name} className={inputCls} />
            <input
              name="description"
              defaultValue={workspace.description ?? ""}
              className={inputCls}
            />
            <button
              type="submit"
              className="rounded-lg bg-gold px-5 py-2 text-sm font-medium text-ink hover:bg-gold-soft"
            >
              Save changes
            </button>
          </form>
        </section>
      ) : (
        <p className="mt-6 text-sm text-muted">
          Only workspace leaders can edit settings. You are a member.
        </p>
      )}

      {leader && (
        <section className="mt-6 rounded-xl border border-white/10 bg-coal p-5">
          <h2 className="font-semibold text-ivory">Billing</h2>
          <p className="mt-1 text-sm text-muted">
            DRAFT: billing is not live yet, no payment is taken, and
            these prices are a proposal. A verified run counts only when
            a real run completes; failed runs and cache hits do not
            count.
          </p>
          <div className="mt-3 space-y-1 text-sm text-muted">
            <p>
              Plan:{" "}
              <span className="font-medium capitalize text-ivory">
                {billingView.tier}
              </span>
              {billingView.status && billingView.status !== billingView.tier && (
                <span> ({billingView.status})</span>
              )}
            </p>
            <p>
              Verified runs this cycle:{" "}
              <span className="font-medium text-ivory">
                {billingView.runs_used_this_cycle} / {billingView.monthly_run_limit}
              </span>
              {remaining !== null && (
                <span> ({remaining} remaining)</span>
              )}
              {billingView.extra_runs_balance > 0 && (
                <span>
                  {" "}
                  + {billingView.extra_runs_balance} top-up runs
                </span>
              )}
            </p>
            <p>
              Member limit:{" "}
              <span className="font-medium text-ivory">
                {memberList.length} / {billingView.max_members}
              </span>
            </p>
            {billingView.current_period_end && (
              <p>
                Current period ends:{" "}
                <span className="font-medium text-ivory">
                  {new Date(billingView.current_period_end).toLocaleDateString()}
                </span>
              </p>
            )}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {billingView.tier === "free" && (
              <>
                <BillingUpgradeButton
                  workspaceId={id}
                  tier="pro"
                  label="Upgrade to Pro — $19 / ₹999 per month (draft)"
                />
                <BillingUpgradeButton
                  workspaceId={id}
                  tier="team"
                  label="Upgrade to Team — $49 / ₹2,999 per month (draft)"
                />
              </>
            )}
            {billingView.tier === "pro" && (
              <BillingUpgradeButton
                workspaceId={id}
                tier="team"
                label="Upgrade to Team — $49 / ₹2,999 per month (draft)"
              />
            )}
            <a
              href="/pricing"
              className="text-sm font-medium text-gold-soft hover:underline"
            >
              See all plans
            </a>
          </div>
          <p className="mt-3 text-xs text-muted">
            Limits: Free {PLAN_LIMITS.free.monthlyRuns} runs, Pro{" "}
            {PLAN_LIMITS.pro.monthlyRuns.toLocaleString()} runs, Team{" "}
            {PLAN_LIMITS.team.monthlyRuns.toLocaleString()} runs per
            month. Workspaces without a billing record keep running as
            today with no cap.
          </p>
        </section>
      )}

      {leader && (
        <section className="mt-6 rounded-xl border border-white/10 bg-coal p-5">
          <h2 className="font-semibold text-ivory">Approval webhook</h2>
          <p className="mt-1 text-sm text-muted">
            When a leader approves an approval, Hivlet POSTs a signed JSON
            event (<span className="font-mono text-xs text-ivory">approval.approved</span>)
            to this URL, with an HMAC-SHA256 signature in the{" "}
            <span className="font-mono text-xs text-ivory">X-Hivlet-Signature</span>{" "}
            header. It fires only on approval, never automatically and
            never from a demo run. Delivery status shows on the Approvals
            page, where a failed delivery can be retried. The signing
            secret lives only on the server (HIVLET_WEBHOOK_SECRET) and
            is never shown here.
          </p>
          <p className="mt-2 text-xs text-muted">
            {webhookUrl ? (
              <>
                Configured:{" "}
                <span className="font-mono text-ivory">{webhookUrl}</span>
              </>
            ) : (
              "No webhook URL configured — approvals will not notify any endpoint."
            )}
          </p>
          <form action={saveApprovalWebhookUrl.bind(null, id)} className="mt-4 space-y-3">
            <input
              name="approval_webhook_url"
              type="url"
              placeholder="https://example.com/hivlet-approvals"
              defaultValue={webhookUrl ?? ""}
              className={inputCls}
            />
            <button
              type="submit"
              className="rounded-lg bg-gold px-5 py-2 text-sm font-medium text-ink hover:bg-gold-soft"
            >
              Save webhook URL
            </button>
          </form>
        </section>
      )}

      <section className="mt-6 rounded-xl border border-white/10 bg-coal p-5">
        <h2 className="font-semibold text-ivory">
          Members ({memberList.length})
        </h2>
        <div className="mt-3 space-y-2">
          {memberList.length === 0 && (
            <EmptyState title="No members found" hint="Members appear here once they join." />
          )}
          {memberList.map((m) => (
            <div
              key={m.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-white/10 px-4 py-3"
            >
              <span className="text-sm text-muted">
                {m.user_id === membership.user_id
                  ? "You"
                  : `Member ${m.user_id.slice(0, 8)}…`}
                <span className="ml-2 text-xs font-medium uppercase text-muted">
                  {m.role}
                </span>
              </span>
              {(leader || m.id === membership.id) && (
                <form action={removeMember.bind(null, id)}>
                  <input type="hidden" name="member_id" value={m.id} />
                  <button
                    type="submit"
                    className="rounded-lg border border-white/15 bg-coal px-3 py-1.5 text-xs font-medium text-muted hover:border-[#d98c8c] hover:text-[#d98c8c]"
                  >
                    {m.id === membership.id ? "Leave" : "Remove"}
                  </button>
                </form>
              )}
            </div>
          ))}
        </div>
      </section>

      {leader && (
        <section className="mt-6 rounded-xl border border-white/10 bg-coal p-5">
          <h2 className="font-semibold text-ivory">Danger zone</h2>
          <p className="mt-1 text-sm text-muted">
            Deleting a workspace removes its agents, tasks, reports, and
            approvals permanently.
          </p>
          <div className="mt-3">
            <DeleteWorkspaceForm
              workspaceName={workspace.name}
              onDelete={deleteWorkspace.bind(null, id)}
            />
          </div>
        </section>
      )}
    </div>
  );
}
