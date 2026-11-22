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
      <p className="mt-4 text-muted">These Data Processing Terms form part of the agreement between Hivlet and a business customer that uses Hivlet to process personal data on its behalf. They are accepted when the customer creates an account or clicks &quot;I agree&quot;, as set out in the Terms of Service. If these terms conflict with the Terms of Service on a data processing matter, these terms take precedence for that matter.</p>

      <h2 className="mt-8 font-display text-xl font-bold text-ivory">Roles</h2>
      <p className="mt-4 text-muted">The customer is the data fiduciary for the personal data it puts into its workspaces, because it decides why and how that data is processed. Hivlet is the data processor for that customer workspace personal data. Hivlet is a data fiduciary in its own right for account data, as described in the Privacy Policy.</p>

      <h2 className="mt-8 font-display text-xl font-bold text-ivory">Scope and instructions</h2>
      <p className="mt-4 text-muted">Hivlet processes customer workspace personal data only to provide the Hivlet workspace, tasks, agents, reports, approvals, and usage features, and only on the customer&apos;s documented instructions, for as long as the customer uses the service. The data processed is the workspace data described in the Privacy Policy, relating to the customer&apos;s members, agents, and the people named in its tasks and reports. Hivlet will not process customer workspace personal data outside those instructions. Hivlet does not use customer workspace data to train models, and does not sell workspace data. The customer remains responsible for the personal data it puts into Hivlet, for having a lawful basis to do so, and for reviewing agent output before acting on it.</p>

      <h2 className="mt-8 font-display text-xl font-bold text-ivory">Confidentiality</h2>
      <p className="mt-4 text-muted">Hivlet will keep customer workspace personal data confidential, and will only let its personnel and sub-processors access it where needed to provide the service, under obligations of confidentiality.</p>

      <h2 className="mt-8 font-display text-xl font-bold text-ivory">Security</h2>
      <p className="mt-4 text-muted">Hivlet will use reasonable security safeguards, including encryption in transit and encryption at rest where applicable, access controls, multi-factor authentication where available, logging, backups, and vulnerability management, to protect customer workspace personal data against a personal data breach.</p>

      <h2 className="mt-8 font-display text-xl font-bold text-ivory">Sub-processors</h2>
      <p className="mt-4 text-muted">The customer gives general authorisation for Hivlet to use the sub-processors listed in Schedule A below. Hivlet will give the customer notice before adding or replacing a sub-processor, and will impose equivalent data protection obligations on each sub-processor. Schedule A: Supabase, for database and authentication, hosted in ap-south-1 (Mumbai, India); Vercel, for hosting and edge delivery, whose infrastructure and support processing locations are to be confirmed, and may include processing outside India.</p>

      <h2 className="mt-8 font-display text-xl font-bold text-ivory">Breach notification</h2>
      <p className="mt-4 text-muted">If Hivlet becomes aware of a personal data breach affecting customer workspace personal data, Hivlet will notify the customer without undue delay and in any event within 24 hours, describing the breach, its likely consequences, and the steps being taken.</p>

      <h2 className="mt-8 font-display text-xl font-bold text-ivory">Rights assistance, deletion, and audit</h2>
      <p className="mt-4 text-muted">Hivlet will give reasonable assistance to the customer in responding to requests from data principals to exercise their rights under the DPDP Act. On termination of the service, Hivlet will delete or return customer workspace personal data at the customer&apos;s choice, subject to legal retention, and will certify the deletion on request. Personal data, traffic data, and processing logs are retained for at least one year where Rule 8(3) of the DPDP Rules, 2025 requires it. The customer may audit Hivlet&apos;s compliance once per year, on reasonable notice, through security questionnaires and reports. Audit access does not extend to other customers&apos; data.</p>

      <h2 className="mt-8 font-display text-xl font-bold text-ivory">Cross-border transfers and governing law</h2>
      <p className="mt-4 text-muted">The customer authorises processing only in the locations listed in Schedule A. Hivlet will not transfer customer workspace personal data to a country notified as restricted under the DPDP Act. These terms are governed by the laws of India, and, subject to any consumer carve-out in the Terms of Service, the courts at Sehore have jurisdiction.</p>

      <h2 className="mt-8 font-display text-xl font-bold text-ivory">Liability</h2>
      <p className="mt-4 text-muted">Each party&apos;s liability under these terms is subject to the liability provisions in the Terms of Service. Nothing in these terms excludes liability for fraud or wilful misconduct, or any statutory consumer right.</p>

      <p className="mt-8 text-sm text-muted">
        <Link href="/legal/terms" className="font-medium text-gold-soft hover:underline">Terms of Service</Link>
        {" · "}
        <Link href="/legal/privacy" className="font-medium text-gold-soft hover:underline">Privacy Policy</Link>
        {" · "}
        <Link href="/legal/acceptable-use" className="font-medium text-gold-soft hover:underline">Acceptable Use Policy</Link>
        {" · "}
        <Link href="/legal/refunds" className="font-medium text-gold-soft hover:underline">Refund and Cancellation Policy</Link>
      </p>
      <p className="mt-8 text-sm text-muted">
        <Link href="/docs" className="font-medium text-gold-soft hover:underline">Back to Docs</Link>
        {" · "}
        <Link href="/changelog" className="font-medium text-gold-soft hover:underline">Changelog</Link>
      </p>
    </main>
  );
}
