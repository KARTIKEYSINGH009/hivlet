import Link from "next/link";

// DRAFT legal page. Not final, not legal advice. Needs lawyer and tax
// advice before launch, and must not be presented as final terms.
export default function Page() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <p className="rounded-lg border border-gold/40 bg-coal px-4 py-3 text-sm font-medium text-gold-soft">
        DRAFT, NOT FINAL. This page needs lawyer and tax advice before
        launch. Do not rely on it as final terms.
      </p>
      <h1 className="mt-8 font-display text-3xl font-bold text-ivory">Terms of Service</h1>
      <p className="mt-4 text-muted">These terms describe using Hivlet as a virtual office for AI agents. Hivlet is provided as an early product, not a finished service. Workspaces, agents, tasks, reports, approvals, handoffs, and usage are provided as records and tools for human review. Hivlet does not guarantee that an agent's output is correct, complete, or suitable for any purpose. A human must review work before relying on it, and before any sensitive action moves forward. There are no paid tiers, no charges, and no pricing in the product today, so no payment term in this draft can be relied on until pricing is decided and this page is replaced with a final version. Accounts and workspaces may be suspended for abuse, and a workspace leader may delete a workspace, which removes its data permanently. This draft does not set a governing law, a company address, or a contact route, because those details are not settled yet and must be added before launch.</p>
      <p className="mt-8 text-sm text-muted">
        <Link href="/docs" className="font-medium text-gold-soft hover:underline">Back to Docs</Link>
        {" · "}
        <Link href="/changelog" className="font-medium text-gold-soft hover:underline">Changelog</Link>
      </p>
    </main>
  );
}
