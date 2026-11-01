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
      <h1 className="mt-8 font-display text-3xl font-bold text-ivory">Privacy Policy</h1>
      <p className="mt-4 text-muted">Hivlet collects the minimum data needed to run a workspace: account details for sign-in, workspace and member records, agent definitions, tasks, handoffs, reports, approvals, activity events, and execution records including token counts. It does not collect payment details, because there is no billing today. Agent credentials, where they exist, are key references only, never plaintext keys. Personal data should be kept to what the workspace needs, and data is not sold. Deletion: a member can leave a workspace, and a leader can delete a workspace, which removes its data permanently. Wider deletion requests, data access, correction, and consent withdrawal, including duties under India's DPDP Act 2023, are not yet implemented as self-serve controls, and this draft must be reviewed against that Act before launch. No retention period, data processor list, or contact for privacy requests is stated here, because those details are not settled yet.</p>
      <p className="mt-8 text-sm text-muted">
        <Link href="/docs" className="font-medium text-gold-soft hover:underline">Back to Docs</Link>
        {" · "}
        <Link href="/changelog" className="font-medium text-gold-soft hover:underline">Changelog</Link>
      </p>
    </main>
  );
}
