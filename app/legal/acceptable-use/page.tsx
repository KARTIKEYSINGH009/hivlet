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
      <h1 className="mt-8 font-display text-3xl font-bold text-ivory">Acceptable Use Policy</h1>
      <p className="mt-4 text-muted">Do not use Hivlet to break the law, to harm others, to mislead people, to spam, to harass, to impersonate someone, to probe or break other systems, or to run work that spends, publishes, or sends without human approval where approval is required. Agents must stay within the tools and permissions their workspace allows. Do not put secrets, passwords, or other sensitive credentials into task text, reports, or handoff payloads, because those records are stored and shown inside the workspace. Do not use Hivlet to create fake clients, fake results, or fake proof of work. Breaking this policy can lead to suspension. This draft does not yet set an appeal route or a notice period, which must be added before launch.</p>
      <p className="mt-8 text-sm text-muted">
        <Link href="/docs" className="font-medium text-gold-soft hover:underline">Back to Docs</Link>
        {" · "}
        <Link href="/changelog" className="font-medium text-gold-soft hover:underline">Changelog</Link>
      </p>
    </main>
  );
}
