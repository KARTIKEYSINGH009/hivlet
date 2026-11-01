import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CopyInviteLink from "@/components/copy-invite-link";

type WorkspacesPageProps = {
  searchParams: Promise<{ error?: string }>;
};

// Server Action: create a workspace and make the creator its leader.
//
// BUG FIX 2026-11-01: the old code inserted into workspaces, then
// .select("id"), then inserted the leader member row. That select was
// filtered by the members-only RLS read policy, and the user was not a
// member yet, so the select returned no row, the code took the error
// path, and the member insert never ran. The workspace row was already
// inserted, but invisible, because the list is driven by
// workspace_members. That is why a valid name failed with the generic
// error and the list still said "No workspaces yet".
//
// The fix is atomic: create_workspace_with_leader (migration 004,
// SECURITY DEFINER, same pattern as join_workspace_by_code) inserts
// the workspace and the leader member row in one transaction and
// returns the id directly. If either insert fails, nothing is left
// behind. No orphan, no two-step race. The creator-read policy added
// to policies.sql is belt and braces for any direct select, not the
// primary path. Errors are logged server-side with the database
// message and code, so a missing function (migration 004 not yet run
// live) shows up in logs instead of only as a generic banner. The
// user-facing banner stays generic on purpose, so database internals
// are not leaked to the browser.
async function createWorkspace(formData: FormData) {
  "use server";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  if (!name) redirect("/workspaces?error=name");

  const { data: workspaceId, error } = await supabase.rpc(
    "create_workspace_with_leader",
    { p_name: name, p_description: description || null }
  );

  if (error || !workspaceId) {
    console.error("createWorkspace failed:", {
      message: error?.message ?? "no workspace id returned",
      code: error?.code ?? null,
      details: error?.details ?? null,
      hint: error?.hint ?? null,
    });
    redirect("/workspaces?error=create");
  }

  void workspaceId;
  redirect("/workspaces");
}

export default async function WorkspacesPage({
  searchParams,
}: WorkspacesPageProps) {
  const sp = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Only rows this user belongs to are visible (RLS, see supabase/policies.sql).
  const { data: memberships } = await supabase
    .from("workspace_members")
    .select("role, workspaces (id, name, description, invite_code, created_at)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const errorText =
    sp.error === "name"
      ? "Give the workspace a name first."
      : sp.error === "create"
        ? "Could not create the workspace. Please try again."
        : sp.error === "invite"
          ? "That invite link is invalid or expired."
          : null;

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gold">
        Your offices
      </p>
      <h1 className="mt-3 text-3xl font-bold tracking-tight">Workspaces</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        A workspace is one team&apos;s office. Create one, invite members with
        the share link, and their AI agents get a desk here.
      </p>

      {errorText && (
        <p className="mt-6 rounded-lg border border-[#d98c8c]/40 bg-[#2a1515] px-4 py-3 text-sm text-[#d98c8c]">
          {errorText}
        </p>
      )}

      <section className="mt-8 rounded-xl border border-white/10 bg-coal p-6">
        <h2 className="font-semibold">Create a workspace</h2>
        <form action={createWorkspace} className="mt-4 space-y-4">
          <div>
            <label htmlFor="name" className="text-sm font-medium">
              Workspace name
            </label>
            <input
              id="name"
              name="name"
              required
              placeholder="e.g. Atlas Builders"
              className="mt-1.5 w-full rounded-lg border border-white/15 bg-ink px-4 py-2.5 text-sm text-ivory placeholder:text-muted focus:border-gold"
            />
          </div>
          <div>
            <label htmlFor="description" className="text-sm font-medium">
              Description <span className="text-muted">(optional)</span>
            </label>
            <input
              id="description"
              name="description"
              placeholder="What does this team build?"
              className="mt-1.5 w-full rounded-lg border border-white/15 bg-ink px-4 py-2.5 text-sm text-ivory placeholder:text-muted focus:border-gold"
            />
          </div>
          <button
            type="submit"
            className="rounded-lg bg-gold px-5 py-2.5 text-sm font-semibold text-ink hover:bg-gold-soft"
          >
            Create workspace
          </button>
        </form>
      </section>

      <section className="mt-10">
        <h2 className="font-semibold">
          {memberships && memberships.length > 0
            ? `Your workspaces (${memberships.length})`
            : "No workspaces yet"}
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {(memberships ?? []).map((m) => {
            const ws = m.workspaces as unknown as {
              id: string;
              name: string;
              description: string | null;
              invite_code: string;
            } | null;
            if (!ws) return null;
            return (
              <article
                key={ws.id}
                className="rounded-xl border border-white/10 bg-coal p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-semibold">{ws.name}</h3>
                  <span className="shrink-0 rounded-full border border-gold/40 px-2.5 py-0.5 text-xs font-medium text-gold">
                    {m.role === "leader" ? "Leader" : "Member"}
                  </span>
                </div>
                {ws.description && (
                  <p className="mt-1 text-sm text-muted">{ws.description}</p>
                )}
                <div className="mt-4 border-t border-white/10 pt-4">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted">
                    Invite code:{" "}
                    <span className="text-gold">{ws.invite_code}</span>
                  </p>
                  <div className="mt-2">
                    <CopyInviteLink code={ws.invite_code} />
                  </div>
                  <a
                    href={`/workspace/${ws.id}/overview`}
                    className="mt-3 inline-block text-sm font-medium text-gold hover:text-gold-soft"
                  >
                    Open office →
                  </a>
                </div>
              </article>
            );
          })}
        </div>
        {(!memberships || memberships.length === 0) && (
          <p className="mt-4 text-sm text-muted">
            Create your first workspace above — you&apos;ll be its leader, and
            its invite link will appear here.
          </p>
        )}
      </section>
    </main>
  );
}
