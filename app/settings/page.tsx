import Link from "next/link";
import { requireUser } from "@/lib/workspace";
import SignOutButton from "@/components/sign-out-button";
import { PageHeader, EmptyState } from "@/components/workspace-ui";

// User account page. There is no profiles table yet, so this shows real
// auth data + workspace memberships only — no invented profile fields.
export default async function UserSettingsPage() {
  const { supabase, user } = await requireUser();

  const { data: memberships } = await supabase
    .from("workspace_members")
    .select("role, workspaces (id, name)")
    .eq("user_id", user.id);
  const workspaces = (memberships ?? [])
    .map((m) => ({
      role: m.role as string,
      workspace: m.workspaces as unknown as { id: string; name: string } | null,
    }))
    .filter((m) => m.workspace !== null);

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <PageHeader
        title="My account"
        description="Your sign-in details and workspaces."
        actions={<SignOutButton />}
      />

      <section className="mt-8 rounded-xl border border-white/10 bg-coal p-5">
        <h2 className="font-semibold text-ivory">Profile</h2>
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Email</dt>
            <dd className="font-medium text-ivory">{user.email}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted">User ID</dt>
            <dd className="break-all font-mono text-xs text-muted">
              {user.id}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Signed up</dt>
            <dd className="text-muted">
              {user.created_at
                ? new Date(user.created_at).toLocaleString()
                : "—"}
            </dd>
          </div>
        </dl>
        <p className="mt-4 text-xs text-muted">
          Display names, avatars, and notification preferences arrive with a
          profiles table in a later milestone.
        </p>
      </section>

      <section className="mt-6 rounded-xl border border-white/10 bg-coal p-5">
        <h2 className="font-semibold text-ivory">Your workspaces</h2>
        <div className="mt-3 space-y-2">
          {workspaces.length === 0 && (
            <EmptyState title="No workspaces yet" hint="Create one from the Workspaces page." />
          )}
          {workspaces.map((m) => (
            <Link
              key={m.workspace!.id}
              href={`/workspace/${m.workspace!.id}/overview`}
              className="flex items-center justify-between rounded-lg border border-white/10 px-4 py-3 hover:border-white/15"
            >
              <span className="text-sm font-medium text-ivory">
                {m.workspace!.name}
              </span>
              <span className="text-xs uppercase text-muted">{m.role}</span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
