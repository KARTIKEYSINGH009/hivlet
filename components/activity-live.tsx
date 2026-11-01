"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

// Live activity updates for the Activity page. Subscribes to Postgres
// changes on the workspace's task_events, task_handoffs, reports, and
// approvals, and refreshes the server-rendered feed when a change
// arrives. This is local code only: realtime is NOT claimed as
// live-verified until Kartikey verifies it against a live Supabase
// project with realtime enabled. If the channel errors or realtime is
// unavailable, the page keeps working as a normal feed with a manual
// refresh button, and the banner below says so plainly.
export default function ActivityLive({
  workspaceId,
}: {
  workspaceId: string;
}) {
  const router = useRouter();
  const [live, setLive] = useState<boolean | null>(null);

  useEffect(() => {
    let supabase: ReturnType<typeof createClient> | null = null;
    let channel: RealtimeChannel | null = null;
    try {
      supabase = createClient();
      channel = supabase
        .channel(`workspace-activity-${workspaceId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "task_events",
            filter: `workspace_id=eq.${workspaceId}`,
          },
          () => router.refresh()
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "task_handoffs",
            filter: `workspace_id=eq.${workspaceId}`,
          },
          () => router.refresh()
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "reports",
            filter: `workspace_id=eq.${workspaceId}`,
          },
          () => router.refresh()
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "approvals",
            filter: `workspace_id=eq.${workspaceId}`,
          },
          () => router.refresh()
        )
        .subscribe((status) => {
          if (status === "SUBSCRIBED") setLive(true);
          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            setLive(false);
          }
        });
    } catch {
      setLive(false);
    }
    return () => {
      if (supabase && channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, [workspaceId, router]);

  return (
    <div className="mt-6 flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-coal px-4 py-3">
      <p className="text-sm text-muted">
        {live === null && "Connecting live updates…"}
        {live === true &&
          "Live updates on. New activity refreshes this feed automatically."}
        {live === false &&
          "Live updates unavailable here. The feed below is still accurate, use Refresh to see new activity. Realtime is not live-verified yet."}
      </p>
      <button
        type="button"
        onClick={() => router.refresh()}
        className="rounded-lg border border-white/15 bg-coal px-3 py-1.5 text-xs font-medium text-muted hover:border-gold"
      >
        Refresh feed
      </button>
    </div>
  );
}
