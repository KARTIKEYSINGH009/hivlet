import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import WorkspaceSidebar from "@/components/workspace-sidebar";

// Guards every /workspace/[id]/* route: signed-in + member of this
// workspace, checked server-side before any child page renders (RLS is
// the second layer, not the only one).
export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("workspace_id", id)
    .eq("user_id", user.id)
    .single();
  if (!membership) redirect("/workspaces");

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("id, name")
    .eq("id", id)
    .single();
  if (!workspace) redirect("/workspaces");

  const { data: all } = await supabase
    .from("workspace_members")
    .select("workspaces (id, name)")
    .eq("user_id", user.id);
  const workspaces = (all ?? [])
    .map((m) => m.workspaces as unknown as { id: string; name: string } | null)
    .filter((w): w is { id: string; name: string } => w !== null);

  return (
    <div className="flex min-h-screen flex-col bg-[#faf8f3] sm:flex-row">
      <WorkspaceSidebar
        workspaceId={workspace.id}
        workspaceName={workspace.name}
        workspaces={workspaces}
      />
      <main className="min-w-0 flex-1 px-4 py-8 sm:px-8">{children}</main>
    </div>
  );
}
