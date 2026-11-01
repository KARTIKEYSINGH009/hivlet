import { requireWorkspace } from "@/lib/workspace";
import { PageHeader, EmptyState } from "@/components/workspace-ui";
import { checkBrief } from "@/lib/brief";
import { isBatchEligible } from "@/lib/batch";

// Phase 3: batch candidates + brief check, read-only.
// Batch-eligible = non-urgent, repeatable work that can wait for a
// cheaper batch run. Brief check stops vague tasks before tokens are
// spent. No task is auto-queued or auto-run from this page.
export default async function BatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, workspace } = await requireWorkspace(id);
  const { data: tasks } = await supabase.from("tasks").select("id, title, description, status, priority").eq("workspace_id", id).order("created_at", { ascending: false });
  const all = (tasks ?? []) as { id: string; title: string; description: string | null; status: string; priority: string | null }[];
  const batch = all.filter((t) => isBatchEligible(t.title, t.description, t.priority));
  const vague = all.filter((t) => t.status === "todo" && !checkBrief(t.title, t.description).ready);
  return (
    <div>
      <PageHeader title="Batch and brief check" description={`Work in ${workspace.name} that can wait, and todo tasks too vague to run cheaply. Nothing here runs automatically.`} />
      <section className="mt-10">
        <h2 className="font-semibold text-ivory">Batch candidates (cheaper, slower)</h2>
        <div className="mt-3 space-y-3">
          {batch.length === 0 && <EmptyState title="No batch candidates" hint="Nightly summaries, bulk classification, enrichment, and reports, at low or medium priority, qualify. Urgent work never does." />}
          {batch.map((t) => <div key={t.id} className="rounded-xl border border-white/10 bg-coal p-5"><p className="font-medium text-ivory">{t.title}</p><p className="mt-1 text-sm text-muted">Status: {t.status} · Priority: {t.priority ?? "medium"} · Can wait for a batch run.</p></div>)}
        </div>
      </section>
      <section className="mt-10">
        <h2 className="font-semibold text-ivory">Vague todo tasks, fix before running</h2>
        <div className="mt-3 space-y-3">
          {vague.length === 0 && <EmptyState title="No vague todo tasks" hint="Every todo task has a title, a description of 20+ characters, and a success signal." />}
          {vague.map((t) => <div key={t.id} className="rounded-xl border border-white/10 bg-coal p-5"><p className="font-medium text-ivory">{t.title}</p><p className="mt-1 text-sm text-muted">Missing: {checkBrief(t.title, t.description).missing.join(", ")}. Edit the task on the Tasks page before running it.</p></div>)}
        </div>
      </section>
    </div>
  );
}
