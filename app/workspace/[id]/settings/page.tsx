import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireWorkspace, isLeader } from "@/lib/workspace";
import CopyInviteLink from "@/components/copy-invite-link";
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

async function deleteWorkspace(workspaceId: string) {
  "use server";
  const { supabase, membership } = await requireWorkspace(workspaceId);
  if (!isLeader(membership)) return;
  await supabase.from("workspaces").delete().eq("id", workspaceId);
  redirect("/workspaces");
}

export default async function WorkspaceSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, workspace, membership } = await requireWorkspace(id);
  const leader = isLeader(membership);

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
    "mt-1 w-full rounded-lg border border-white/15 bg-coal px-3 py-2 text-sm text-ivory focus:border-gold focus:outline-none";

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
                    className="rounded-lg border border-white/15 bg-coal px-3 py-1.5 text-xs font-medium text-muted hover:border-red-400 hover:text-red-700"
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
        <section className="mt-6 rounded-xl border border-red-200 bg-coal p-5">
          <h2 className="font-semibold text-red-700">Danger zone</h2>
          <p className="mt-1 text-sm text-muted">
            Deleting a workspace removes its agents, tasks, reports, and
            approvals permanently.
          </p>
          <form action={deleteWorkspace.bind(null, id)} className="mt-3">
            <button
              type="submit"
              className="rounded-lg border border-[#d98c8c]/40 bg-[#2a1515] px-4 py-2 text-sm font-medium text-[#d98c8c] hover:border-[#d98c8c]"
            >
              Delete workspace
            </button>
          </form>
        </section>
      )}
    </div>
  );
}
