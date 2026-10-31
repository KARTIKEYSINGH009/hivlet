import type { SupabaseClient } from "@supabase/supabase-js";

// Append-only activity log for a task. Logging must never fail the main
// action, so errors are swallowed (and printed server-side) by design.
export async function logTaskEvent(
  supabase: SupabaseClient,
  args: {
    workspaceId: string;
    taskId: string;
    eventType: string;
    memberId: string | null;
    detail?: Record<string, unknown>;
  }
) {
  const { error } = await supabase.from("task_events").insert({
    workspace_id: args.workspaceId,
    task_id: args.taskId,
    event_type: args.eventType,
    actor_member_id: args.memberId,
    detail: args.detail ?? {},
  });
  if (error) console.error("task_events insert failed:", error.message);
}
