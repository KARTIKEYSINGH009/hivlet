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
    "mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:border-stone-900 focus:outline-none";

  return (
    <div>
      <PageHeader
        title="Workspace settings"
        description={`Configuration for ${workspace.name}.`}
      />

      <section className="mt-8 rounded-xl border border-stone-200 bg-white p-5">
        <h2 className="font-semibold text-stone-900">Invite</h2>
        <p className="mt-1 text-sm text-stone-500">
          Anyone with this link can join as a member (invite code:{" "}
          <span className="font-medium text-stone-900">
            {workspace.invite_code}
          </span>
          ).
        </p>
        <div className="mt-3">
          <CopyInviteLink code={workspace.invite_code} />
        </div>
      </section>

      {leader ? (
        <section className="mt-6 rounded-xl border border-stone-200 bg-white p-5">
          <h2 className="font-semibold text-stone-900">Edit workspace</h2>
          <form action={updateWorkspace.bind(null, id)} className="mt-4 space-y-3">
            <input name="name" defaultValue={workspace.name} className={inputCls} />
            <input
              name="description"
              defaultValue={workspace.description ?? ""}
              className={inputCls}
            />
            <button
              type="submit"
              className="rounded-lg bg-stone-900 px-5 py-2 text-sm font-medium text-white hover:bg-stone-700"
            >
              Save changes
            </button>
          </form>
        </section>
      ) : (
        <p className="mt-6 text-sm text-stone-500">
          Only workspace leaders can edit settings. You are a member.
        </p>
      )}

      <section className="mt-6 rounded-xl border border-stone-200 bg-white p-5">
        <h2 className="font-semibold text-stone-900">
          Members ({memberList.length})
        </h2>
        <div className="mt-3 space-y-2">
          {memberList.length === 0 && (
            <EmptyState title="No members found" hint="Members appear here once they join." />
          )}
          {memberList.map((m) => (
            <div
              key={m.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-stone-100 px-4 py-3"
            >
              <span className="text-sm text-stone-700">
                {m.user_id === membership.user_id
                  ? "You"
                  : `Member ${m.user_id.slice(0, 8)}…`}
                <span className="ml-2 text-xs font-medium uppercase text-stone-500">
                  {m.role}
                </span>
              </span>
              {(leader || m.id === membership.id) && (
                <form action={removeMember.bind(null, id)}>
                  <input type="hidden" name="member_id" value={m.id} />
                  <button
                    type="submit"
                    className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 hover:border-red-400 hover:text-red-700"
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
        <section className="mt-6 rounded-xl border border-red-200 bg-white p-5">
          <h2 className="font-semibold text-red-700">Danger zone</h2>
          <p className="mt-1 text-sm text-stone-500">
            Deleting a workspace removes its agents, tasks, reports, and
            approvals permanently.
          </p>
          <form action={deleteWorkspace.bind(null, id)} className="mt-3">
            <button
              type="submit"
              className="rounded-lg bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-600"
            >
              Delete workspace
            </button>
          </form>
        </section>
      )}
    </div>
  );
}
