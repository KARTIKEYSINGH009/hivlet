import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CopyInviteLink from "@/components/copy-invite-link";

type WorkspacesPageProps = {
  searchParams: Promise<{ error?: string }>;
};

// Server Action: create a workspace and make the creator its leader.
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

  const { data: workspace, error } = await supabase
    .from("workspaces")
    .insert({ name, description: description || null, created_by: user.id })
    .select("id")
    .single();

  if (error || !workspace) redirect("/workspaces?error=create");

  // RLS policy allows the workspace creator to add themselves as leader.
  // If this fails, the workspace would be invisible to its own creator
  // (RLS only shows workspaces you belong to), so surface the error.
  const { error: memberError } = await supabase
    .from("workspace_members")
    .insert({
      workspace_id: workspace.id,
      user_id: user.id,
      role: "leader",
    });

  if (memberError) redirect("/workspaces?error=create");

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
        <p className="mt-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
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
              className="mt-1.5 w-full rounded-lg border border-white/15 bg-ink px-4 py-2.5 text-sm text-ivory placeholder:text-muted focus:border-gold focus:outline-none"
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
              className="mt-1.5 w-full rounded-lg border border-white/15 bg-ink px-4 py-2.5 text-sm text-ivory placeholder:text-muted focus:border-gold focus:outline-none"
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
