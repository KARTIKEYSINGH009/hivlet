import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Server-side session + workspace-membership guard. Every authenticated
// route calls one of these in addition to RLS: RLS is the backstop, this
// is the front door (correct redirects + typed data for the page).

export type MembershipRow = {
  id: string;
  workspace_id: string;
  user_id: string;
  role: "leader" | "member";
  created_at: string;
};

export type WorkspaceRow = {
  id: string;
  name: string;
  description: string | null;
  invite_code: string;
  created_by: string | null;
  created_at: string;
};

export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

export async function requireWorkspace(workspaceId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("workspace_members")
    .select("id, workspace_id, user_id, role, created_at")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .single();

  if (!membership) redirect("/workspaces");

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("id, name, description, invite_code, created_by, created_at")
    .eq("id", workspaceId)
    .single();

  if (!workspace) redirect("/workspaces");

  return {
    supabase,
    user,
    membership: membership as unknown as MembershipRow,
    workspace: workspace as unknown as WorkspaceRow,
  };
}

export function isLeader(membership: MembershipRow) {
  return membership.role === "leader";
}

// All workspaces the current user belongs to (for the sidebar selector).
export async function listMyWorkspaces() {
  const { supabase, user } = await requireUser();
  const { data } = await supabase
    .from("workspace_members")
    .select("role, workspaces (id, name)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  return (data ?? [])
    .map((m) => ({
      role: m.role as "leader" | "member",
      workspace: m.workspaces as unknown as {
        id: string;
        name: string;
      } | null,
    }))
    .filter((m) => m.workspace !== null) as {
    role: "leader" | "member";
    workspace: { id: string; name: string };
  }[];
}
