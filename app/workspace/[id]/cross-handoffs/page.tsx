import { requireWorkspace } from "@/lib/workspace";
import { PageHeader, EmptyState } from "@/components/workspace-ui";

// Phase 5 cross-human, cross-provider handoffs. An agent for one
// teammate hands a task to an agent for another teammate, even on a
// different provider. The trail is shown, provider keys are never
// shown: agents carry no key here, only a name, provider, and the
// owning member's short id, because workspace_members has no name
// field and no profiles table exists yet.
export default async function CrossHandoffsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, workspace } = await requireWorkspace(id);
  const { data: handoffs } = await supabase.from("task_handoffs").select("id, task_id, from_agent_id, to_agent_id, status, note").eq("workspace_id", id).order("created_at", { ascending: false });
  const { data: agents } = await supabase.from("agents").select("id, name, provider, model, member_id").eq("workspace_id", id);
  const { data: tasks } = await supabase.from("tasks").select("id, title").eq("workspace_id", id);
  const agentById = new Map(((agents ?? []) as { id: string; name: string; provider: string; model: string | null; member_id: string }[]).map((a) => [a.id, a]));
  const taskById = new Map(((tasks ?? []) as { id: string; title: string }[]).map((t) => [t.id, t.title]));
  const list = (handoffs ?? []) as { id: string; task_id: string; from_agent_id: string; to_agent_id: string; status: string; note: string | null }[];
  const short = (s: string) => s.slice(0, 8);
  return (
    <div>
      <PageHeader title="Cross-human handoffs" description={`Handoffs in ${workspace.name} from one teammate's agent to another's, across providers. No provider key is shown anywhere here.`} />
      <div className="mt-10 space-y-3">
        {list.length === 0 && <EmptyState title="No handoffs yet" hint="Create a handoff on the Handoffs page, then its cross-human trail will appear here." />}
        {list.map((h) => {
          const from = agentById.get(h.from_agent_id); const to = agentById.get(h.to_agent_id);
          const crossHuman = from && to && from.member_id !== to.member_id;
          const crossProvider = from && to && from.provider !== to.provider;
          return (
            <div key={h.id} className="rounded-xl border border-white/10 bg-coal p-5">
              <p className="font-medium text-ivory">{taskById.get(h.task_id) ?? "Task"}</p>
              <p className="mt-1 text-sm text-muted">From: {from ? `${from.name} (${from.provider}${from.model ? ` / ${from.model}` : ""}, member ${short(from.member_id)})` : "Unknown agent"}</p>
              <p className="text-sm text-muted">To: {to ? `${to.name} (${to.provider}${to.model ? ` / ${to.model}` : ""}, member ${short(to.member_id)})` : "Unknown agent"}</p>
              <p className="mt-1 text-sm text-muted">Status: {h.status}{crossHuman ? " · Cross-human" : ""}{crossProvider ? " · Cross-provider" : ""}</p>
              {h.note && <p className="mt-1 text-sm text-muted">Note: {h.note}</p>}
            </div>
          );
        })}
      </div>
      <section className="mt-10">
        <h2 className="font-semibold text-ivory">Agent ownership</h2>
        <div className="mt-3 space-y-3">
          {((agents ?? []) as { id: string; name: string; provider: string; member_id: string }[]).map((a) => (
            <div key={a.id} className="rounded-xl border border-white/10 bg-coal p-5"><p className="font-medium text-ivory">{a.name}</p><p className="text-sm text-muted">Owner member: {short(a.member_id)} · Provider: {a.provider} · Keys are referenced server side only, never shown to other members.</p></div>
          ))}
        </div>
      </section>
    </div>
  );
}
