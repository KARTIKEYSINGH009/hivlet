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

      <h2 className="mt-8 font-display text-xl font-bold text-ivory">Current status: no paid plans</h2>
      <p className="mt-4 text-muted">Orbely does not currently offer paid plans. No fees are charged, no payment is due, and no GST is charged. There is therefore nothing to refund today. Payments, when paid plans exist, are taken only through the checkout inside the Orbely product itself. Do not pay anyone who claims to sell Orbely access outside the product. If you have paid someone claiming to sell Orbely access, or if a payment was taken from you by mistake, contact ks3676423@gmail.com at once and Orbely will look into it.</p>

      <h2 className="mt-8 font-display text-xl font-bold text-ivory">Future paid plans</h2>
      <p className="mt-4 text-muted">Before Orbely takes any charge, this page will be replaced with a final policy. At that time, Orbely will state the price, the billing period, the GST treatment, the GSTIN, the place of supply, and the invoice details for each plan. Prices will be shown inclusive or exclusive of GST before you pay, so the amount you will actually be charged is clear, with no added charges at checkout.</p>

      <h2 className="mt-8 font-display text-xl font-bold text-ivory">Cancellation</h2>
      <p className="mt-4 text-muted">For future paid plans, you will be able to cancel before the next billing date through the method stated at checkout. Cancellation takes effect at the end of the current billing period, and you keep access until then. Orbely will state what happens to your workspace data on cancellation, including how long it is kept and how you can export it, before any charge is taken. There are no cancellation charges, unless Orbely itself bears similar charges for the cancellation, in which case that will be stated before you pay.</p>

      <h2 className="mt-8 font-display text-xl font-bold text-ivory">Refunds</h2>
      <p className="mt-4 text-muted">For future paid plans, Orbely will state a refund window of 7 days and the conditions for a refund, for example where fewer than 50 runs have been used. Refunds that are due will be made within a reasonable time to the original payment method. If a payment fails, Orbely will tell you before suspending access, and will give you a chance to fix the payment. Upgrades and downgrades will be prorated as stated at checkout. If you dispute a charge, contact ks3676423@gmail.com first, and Orbely will investigate before any chargeback is needed.</p>

      <h2 className="mt-8 font-display text-xl font-bold text-ivory">Your rights</h2>
      <p className="mt-4 text-muted">Nothing in this policy affects your mandatory consumer rights, including your right to approach a consumer forum. If you have a complaint about a payment, contact the Grievance Officer: Kartikey Singh, ks3676423@gmail.com, VIT Bhopal University, Kothrikalan, Sehore, Madhya Pradesh 466114, India. Orbely will acknowledge your complaint within 24 hours and resolve it within 15 days of receiving it.</p>

      <p className="mt-8 text-sm text-muted">
        <Link href="/legal/terms" className="font-medium text-gold-soft hover:underline">Terms of Service</Link>
        {" · "}
        <Link href="/legal/privacy" className="font-medium text-gold-soft hover:underline">Privacy Policy</Link>
        {" · "}
        <Link href="/legal/acceptable-use" className="font-medium text-gold-soft hover:underline">Acceptable Use Policy</Link>
        {" · "}
        <Link href="/legal/data-processing" className="font-medium text-gold-soft hover:underline">Data Processing Terms</Link>
      </p>
      <p className="mt-8 text-sm text-muted">
        <Link href="/docs" className="font-medium text-gold-soft hover:underline">Back to Docs</Link>
        {" · "}
        <Link href="/changelog" className="font-medium text-gold-soft hover:underline">Changelog</Link>
      </p>
    </main>
  );
}
