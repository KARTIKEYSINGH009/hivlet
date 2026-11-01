import { requireWorkspace } from "@/lib/workspace";
import { PageHeader } from "@/components/workspace-ui";

// Phase 6 trust page, true claims only. No fake clients, revenue,
// incidents, or certifications. What the worker cannot do yet is
// stated plainly, because that is part of the trust claim.
export default async function TrustPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { workspace } = await requireWorkspace(id);
  const items = [
    "Approval gates: a task moves to in_review after a run, never straight to done. A human accepts it.",
    "Role based access: leaders and members, membership scoped policies in Supabase.",
    "Append only audit logs: runs are recorded and not rewritten through the app.",
    "Keys referenced server side only: agent_credentials hold a reference, never a plaintext key in code or in the app.",
    "Data deletion: workspace data can be deleted on request through the workspace owner. No retention promise is made beyond what the docs state.",
    "What the worker cannot do yet: it records output only. It does not spend, publish, or send anything.",
    "What is not claimed: no security certification, no fake clients, no revenue, no incidents are claimed here.",
  ];
  return (
    <div>
      <PageHeader title="Trust and security" description={`What ${workspace.name} can rely on, and what Hivlet does not claim yet.`} />
      <div className="mt-10 space-y-3">
        {items.map((t) => <div key={t} className="rounded-xl border border-white/10 bg-coal p-5"><p className="text-sm text-ivory">{t}</p></div>)}
      </div>
    </div>
  );
}
