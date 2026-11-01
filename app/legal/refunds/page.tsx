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
      <h1 className="mt-8 font-display text-3xl font-bold text-ivory">Refund and Cancellation Policy</h1>
      <p className="mt-4 text-muted">There is nothing to refund today, because Hivlet has no paid tiers, no pricing, and no charges. Do not pay anyone who claims to sell Hivlet access outside the product itself. When paid tiers are added, this page must be replaced with a final policy before any charge is taken, stating the price, billing period, taxes including GST where applicable, cancellation method, what happens to data on cancellation, and the refund window, if any. Past-due handling, upgrades, downgrades, and failed payments must also be stated then. Until that final version exists, no refund promise in this draft should be relied on, and any payment question should be treated as unresolved.</p>
      <p className="mt-8 text-sm text-muted">
        <Link href="/docs" className="font-medium text-gold-soft hover:underline">Back to Docs</Link>
        {" · "}
        <Link href="/changelog" className="font-medium text-gold-soft hover:underline">Changelog</Link>
      </p>
    </main>
  );
}
