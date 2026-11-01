import { revalidatePath } from "next/cache";
import { requireWorkspace } from "@/lib/workspace";
import { PageHeader, EmptyState } from "@/components/workspace-ui";

// Phase 4 case study capture. A note is stored unpublished only.
// No publish action exists in this phase: publishing needs the
// customer's explicit yes outside this system.
async function submitCaseStudy(workspaceId: string, formData: FormData) {
  "use server";
  const { supabase, membership } = await requireWorkspace(workspaceId);
  const before = String(formData.get("before_text") ?? "").trim();
  const after = String(formData.get("after_text") ?? "").trim();
  if (!before || !after) return;
  await supabase.from("case_studies").insert({ workspace_id: workspaceId, submitted_by_member_id: membership.id, before_text: before, after_text: after, caught_in_review: String(formData.get("caught_in_review") ?? "").trim() || null, published: false });
  revalidatePath(`/workspace/${workspaceId}/case-studies`);
}

export default async function CaseStudiesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, workspace } = await requireWorkspace(id);
  let list: { id: string; before_text: string; after_text: string; caught_in_review: string | null }[] = [];
  let tableMissing = false;
  const { data, error } = await supabase.from("case_studies").select("id, before_text, after_text, caught_in_review").eq("workspace_id", id).order("created_at", { ascending: false });
  if (error) tableMissing = true; else list = (data ?? []) as typeof list;
  return (
    <div>
      <PageHeader title="Case studies" description={`Before and after notes for ${workspace.name}. Stored unpublished only. Nothing here is published without the customer's yes.`} />
      {tableMissing ? (
        <div className="mt-8"><EmptyState title="Case studies are not available yet" hint="Run migration 008_phase4_case_studies.sql, then return here." /></div>
      ) : (
        <>
          <form action={submitCaseStudy.bind(null, id)} className="mt-10 rounded-xl border border-white/10 bg-coal p-5 space-y-3">
            <h2 className="font-semibold text-ivory">Capture a case study note</h2>
            <label className="block text-sm text-muted">Before<textarea name="before_text" required className="mt-1 w-full rounded-lg border border-white/15 bg-ink px-3 py-2 text-sm text-ivory" /></label>
            <label className="block text-sm text-muted">After<textarea name="after_text" required className="mt-1 w-full rounded-lg border border-white/15 bg-ink px-3 py-2 text-sm text-ivory" /></label>
            <label className="block text-sm text-muted">What was caught in review?<textarea name="caught_in_review" className="mt-1 w-full rounded-lg border border-white/15 bg-ink px-3 py-2 text-sm text-ivory" /></label>
            <button type="submit" className="rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-ink">Save unpublished note</button>
          </form>
          <div className="mt-10 space-y-3">
            {list.length === 0 && <EmptyState title="No case study notes yet" hint="Submit the first note above after a verified workflow." />}
            {list.map((c) => <div key={c.id} className="rounded-xl border border-white/10 bg-coal p-5"><p className="text-sm text-muted">Before: {c.before_text}</p><p className="mt-2 text-sm text-muted">After: {c.after_text}</p>{c.caught_in_review && <p className="mt-2 text-sm text-muted">Caught in review: {c.caught_in_review}</p>}<p className="mt-2 text-xs text-muted">Status: unpublished</p></div>)}
          </div>
        </>
      )}
    </div>
  );
}
