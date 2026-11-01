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
      <h1 className="mt-8 font-display text-3xl font-bold text-ivory">Data Processing Terms</h1>
      <p className="mt-4 text-muted">This draft is for business customers who use Hivlet to process personal data on their behalf. Hivlet processes workspace data only to provide the workspace, tasks, agents, reports, approvals, and usage features, and only on the customer's instructions. It does not use customer workspace data to train models, and it does not sell workspace data. Sub-processors, data locations, retention periods, security measures in detail, breach notification timing, and audit rights are not yet settled, and must be listed before any business customer relies on this page. The customer remains responsible for the personal data it puts into Hivlet, for having a lawful basis to do so, and for reviewing agent output before acting on it. This page is not a signed agreement and must be reviewed by a lawyer before use.</p>
      <p className="mt-8 text-sm text-muted">
        <Link href="/docs" className="font-medium text-gold-soft hover:underline">Back to Docs</Link>
        {" · "}
        <Link href="/changelog" className="font-medium text-gold-soft hover:underline">Changelog</Link>
      </p>
    </main>
  );
}
