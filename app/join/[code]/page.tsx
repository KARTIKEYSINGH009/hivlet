import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Resolves an invite link: /join/<invite_code>.
// Signed-out visitors are sent to sign in first, then back here.
// The join itself runs through the SECURITY DEFINER function
// join_workspace_by_code (supabase/policies.sql), so a visitor who is not
// yet a member can still join — plain SELECTs on workspaces would be
// blocked by RLS for non-members.
export default async function JoinPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/join/${code}`);

  const { error } = await supabase.rpc("join_workspace_by_code", {
    p_code: code,
  });

  if (error) redirect("/workspaces?error=invite");
  redirect("/workspaces");
}
