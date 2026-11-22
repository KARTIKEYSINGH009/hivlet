import Link from "next/link";

// DRAFT legal page. Not final, not legal advice. Needs lawyer and tax
// advice before launch, and must not be presented as final terms.
export default function Page() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <p className="rounded-lg border border-brass-line bg-surface px-4 py-3 text-sm font-medium text-brass-strong">
        DRAFT, NOT FINAL. This page needs lawyer and tax advice before
        launch. Do not rely on it as final terms.
      </p>
      <h1 className="mt-8 text-3xl font-bold text-ink">Data Processing Terms</h1>
      <p className="mt-4 text-muted">These Data Processing Terms form part of the agreement between Orbely and a business customer that uses Orbely to process personal data on its behalf. They are accepted when the customer creates an account or clicks &quot;I agree&quot;, as set out in the Terms of Service. If these terms conflict with the Terms of Service on a data processing matter, these terms take precedence for that matter.</p>

      <h2 className="mt-8 text-xl font-bold text-ink">Roles</h2>
      <p className="mt-4 text-muted">The customer is the data fiduciary for the personal data it puts into its workspaces, because it decides why and how that data is processed. Orbely is the data processor for that customer workspace personal data. Orbely is a data fiduciary in its own right for account data, as described in the Privacy Policy.</p>

      <h2 className="mt-8 text-xl font-bold text-ink">Scope and instructions</h2>
      <p className="mt-4 text-muted">Orbely processes customer workspace personal data only to provide the Orbely workspace, tasks, agents, reports, approvals, and usage features, and only on the customer&apos;s documented instructions, for as long as the customer uses the service. The data processed is the workspace data described in the Privacy Policy, relating to the customer&apos;s members, agents, and the people named in its tasks and reports. Orbely will not process customer workspace personal data outside those instructions. Orbely does not use customer workspace data to train models, and does not sell workspace data. The customer remains responsible for the personal data it puts into Orbely, for having a lawful basis to do so, and for reviewing agent output before acting on it.</p>

      <h2 className="mt-8 text-xl font-bold text-ink">Confidentiality</h2>
      <p className="mt-4 text-muted">Orbely will keep customer workspace personal data confidential, and will only let its personnel and sub-processors access it where needed to provide the service, under obligations of confidentiality.</p>

      <h2 className="mt-8 text-xl font-bold text-ink">Security</h2>
      <p className="mt-4 text-muted">Orbely will use reasonable security safeguards, including encryption in transit and encryption at rest where applicable, access controls, multi-factor authentication where available, logging, backups, and vulnerability management, to protect customer workspace personal data against a personal data breach.</p>

      <h2 className="mt-8 text-xl font-bold text-ink">Sub-processors</h2>
      <p className="mt-4 text-muted">The customer gives general authorisation for Orbely to use the sub-processors listed in Schedule A below. Orbely will give the customer notice before adding or replacing a sub-processor, and will impose equivalent data protection obligations on each sub-processor. Schedule A: Supabase, for database and authentication, hosted in ap-south-1 (Mumbai, India); Vercel, for hosting and edge delivery, whose infrastructure and support processing locations are to be confirmed, and may include processing outside India.</p>

      <h2 className="mt-8 text-xl font-bold text-ink">Breach notification</h2>
      <p className="mt-4 text-muted">If Orbely becomes aware of a personal data breach affecting customer workspace personal data, Orbely will notify the customer without undue delay and in any event within 24 hours, describing the breach, its likely consequences, and the steps being taken.</p>

      <h2 className="mt-8 text-xl font-bold text-ink">Rights assistance, deletion, and audit</h2>
      <p className="mt-4 text-muted">Orbely will give reasonable assistance to the customer in responding to requests from data principals to exercise their rights under the DPDP Act. On termination of the service, Orbely will delete or return customer workspace personal data at the customer&apos;s choice, subject to legal retention, and will certify the deletion on request. Personal data, traffic data, and processing logs are retained for at least one year where Rule 8(3) of the DPDP Rules, 2025 requires it. The customer may audit Orbely&apos;s compliance once per year, on reasonable notice, through security questionnaires and reports. Audit access does not extend to other customers&apos; data.</p>

      <h2 className="mt-8 text-xl font-bold text-ink">Cross-border transfers and governing law</h2>
      <p className="mt-4 text-muted">The customer authorises processing only in the locations listed in Schedule A. Orbely will not transfer customer workspace personal data to a country notified as restricted under the DPDP Act. These terms are governed by the laws of India, and, subject to any consumer carve-out in the Terms of Service, the courts at Sehore have jurisdiction.</p>

      <h2 className="mt-8 text-xl font-bold text-ink">Liability</h2>
      <p className="mt-4 text-muted">Each party&apos;s liability under these terms is subject to the liability provisions in the Terms of Service. Nothing in these terms excludes liability for fraud or wilful misconduct, or any statutory consumer right.</p>

      <p className="mt-8 text-sm text-muted">
        <Link href="/legal/terms" className="font-medium text-brass-strong hover:underline">Terms of Service</Link>
        {" · "}
        <Link href="/legal/privacy" className="font-medium text-brass-strong hover:underline">Privacy Policy</Link>
        {" · "}
        <Link href="/legal/acceptable-use" className="font-medium text-brass-strong hover:underline">Acceptable Use Policy</Link>
        {" · "}
        <Link href="/legal/refunds" className="font-medium text-brass-strong hover:underline">Refund and Cancellation Policy</Link>
      </p>
      <p className="mt-8 text-sm text-muted">
        <Link href="/docs" className="font-medium text-brass-strong hover:underline">Back to Docs</Link>
        {" · "}
        <Link href="/changelog" className="font-medium text-brass-strong hover:underline">Changelog</Link>
      </p>
    </main>
  );
}
