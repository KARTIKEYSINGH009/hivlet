import { requireWorkspace } from "@/lib/workspace";
import { PageHeader, EmptyState } from "@/components/workspace-ui";
import { findReuseCandidates } from "@/lib/memory";

// Phase 2 shared memory page. Lists verified outputs (done or
// in_review tasks with a result) and, for each todo task, up to 3
// similar verified tasks it could reuse. This only suggests reuse.
// It never auto-completes, blocks, or rewrites a task, because a
// similar title is not proof the answer is the same.
export default async function MemoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, workspace } = await requireWorkspace(id);
  const { data: tasks } = await supabase.from("tasks").select("id, title, status, result").eq("workspace_id", id).order("created_at", { ascending: false });
  const all = (tasks ?? []) as { id: string; title: string; status: string; result: string | null }[];
  const verified = all.filter((t) => (t.status === "done" || t.status === "in_review") && t.result);
  const todos = all.filter((t) => t.status === "todo");
  return (
    <div>
      <PageHeader title="Shared memory" description={`Verified work in ${workspace.name} that other tasks can reuse, instead of paying for a fresh run. Suggestions only, never automatic.`} />
      <section className="mt-10">
        <h2 className="font-semibold text-ivory">Reuse suggestions for todo tasks</h2>
        <div className="mt-3 space-y-3">
          {todos.length === 0 && <EmptyState title="No todo tasks" hint="Create a todo task, then similar verified work will be suggested here." />}
          {todos.map((t) => {
            const cands = findReuseCandidates(t.title, verified);
            return (
              <div key={t.id} className="rounded-xl border border-white/10 bg-coal p-5">
                <p className="font-medium text-ivory">{t.title}</p>
                {cands.length === 0 ? <p className="mt-2 text-sm text-muted">No similar verified work found. Run this fresh.</p> : cands.map((c) => <p key={c.id} className="mt-2 text-sm text-muted">Reuse candidate: {c.title} ({(c.score * 100).toFixed(0)}% title overlap). Check the verified result before reusing it.</p>)}
              </div>
            );
          })}
        </div>
      </section>
      <section className="mt-10">
        <h2 className="font-semibold text-ivory">Verified outputs</h2>
        <div className="mt-3 space-y-3">
          {verified.length === 0 && <EmptyState title="No verified outputs yet" hint="Complete and accept a task, then its result will appear here as reusable memory." />}
          {verified.map((t) => (
            <div key={t.id} className="rounded-xl border border-white/10 bg-coal p-5">
              <p className="font-medium text-ivory">{t.title}</p>
              <p className="mt-2 text-sm text-muted">{t.result}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
