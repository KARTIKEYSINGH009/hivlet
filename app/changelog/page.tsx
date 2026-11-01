import Link from "next/link";

// Public changelog. New work is labelled local only, not deployed, and
// not live-verified. Earlier entries summarise project notes, they were
// not re-verified in the run that produced this page.
export default function ChangelogPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-3xl font-bold text-ivory">Changelog</h1>
      <p className="mt-3 text-muted">
        What changed, and what is still local only. Nothing here claims a
        live verification that has not happened.
      </p>

      <section className="mt-10">
        <h2 className="font-display text-xl font-bold text-ivory">
          Unreleased, local only, not deployed
        </h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-muted">
          <li>Handoff creation UI, with accept and reject, and task reassignment on accept.</li>
          <li>Token-only Usage page, per agent and per workspace. No prices, no costs, no charges.</li>
          <li>Squad templates: Launch, Product, and Content squads that create agents and starter tasks.</li>
          <li>Agent pause and resume, reusing the existing paused status. Paused agents are not offered for new tasks.</li>
          <li>Realtime activity updates with a manual refresh fallback. Realtime is not live-verified yet.</li>
          <li>Docs page, this changelog, draft legal pages, email and phone invite UI that sends nothing, and a guided Get started checklist inside each workspace.</li>
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-xl font-bold text-ivory">Earlier, as recorded in project notes</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-muted">
          <li>Workspaces, auth, invite links, task board, agent management, daily reports with verification, and approval gates.</li>
          <li>Execution engine foundation: durable queue, provider adapters, worker endpoint, approval enqueue, demo executions, and execution history. Local only at first, live verification still pending.</li>
          <li>Gold Option B UI: all dark premium, ink, coal, raised, ivory, muted, and gold only, with no light workspace, no red primary, and no rainbow pills.</li>
          <li>Gold homepage: hero, how it works, product preview, trust and control, about, and closing call to action. Pricing omitted until pricing is decided.</li>
        </ul>
      </section>

      <p className="mt-10 text-sm text-muted">
        <Link href="/docs" className="font-medium text-gold-soft hover:underline">
          Back to Docs
        </Link>
      </p>
    </main>
  );
}
