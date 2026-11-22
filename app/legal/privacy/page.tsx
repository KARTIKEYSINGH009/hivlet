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

      <h2 className="mt-8 font-display text-xl font-bold text-ivory">Who we are, and our roles</h2>
      <p className="mt-4 text-muted">Orbely is operated by Kartikey Singh, VIT Bhopal University, Kothrikalan, Sehore, Madhya Pradesh 466114, India. For privacy requests, contact ks3676423@gmail.com. Under India&apos;s Digital Personal Data Protection Act, 2023 (DPDP Act), Orbely acts as a data fiduciary for your account data, because it decides why and how that data is processed. For customer workspace data, Orbely acts as a data processor, processing it only on the customer&apos;s instructions. The Data Processing Terms set out the processor terms for business customers.</p>

      <h2 className="mt-8 font-display text-xl font-bold text-ivory">Consent notice</h2>
      <p className="mt-4 text-muted">When you sign up, Orbely shows you a standalone consent notice, separate from this policy, that lists the personal data being collected, the specific purpose of collecting it, and the service it enables. You give consent by a clear affirmative action. You can withdraw consent as easily as you gave it, by emailing ks3676423@gmail.com or using the account controls when they are available. Withdrawing consent does not affect processing already done, and may mean Orbely can no longer provide the service to you.</p>

      <h2 className="mt-8 font-display text-xl font-bold text-ivory">Data we collect, and why</h2>
      <ul className="mt-4 list-disc space-y-2 pl-6 text-muted">
        <li>Account data, such as your name, email address, sign-in identifiers, and authentication metadata, to create and secure your account and to contact you about the service.</li>
        <li>Workspace and member records, agent definitions, tasks, handoffs, reports, approvals, and activity events, to run your workspace and let members and leaders review work.</li>
        <li>Execution records, such as token counts, timing, error logs, and model and tool metadata, to measure usage, show costs, and keep the service running.</li>
        <li>Technical and security data, such as IP address, device and browser details, and logs, to protect the service, detect abuse, and investigate incidents.</li>
      </ul>
      <p className="mt-4 text-muted">Orbely does not collect payment details, because there is no billing today. Agent credentials, where they exist, are key references only, never plaintext keys. Orbely does not sell your personal data. Orbely does not use customer workspace data to train models, including through its sub-processors.</p>

      <h2 className="mt-8 font-display text-xl font-bold text-ivory">Legal basis</h2>
      <p className="mt-4 text-muted">Orbely processes your personal data on the basis of your consent, given through the consent notice above, and, where applicable, on the legitimate uses recognised by the DPDP Act, such as complying with a legal obligation. Orbely only collects the data needed for the purposes listed above.</p>

      <h2 className="mt-8 font-display text-xl font-bold text-ivory">Cookies and trackers</h2>
      <p className="mt-4 text-muted">Orbely uses only the cookies and similar technologies needed to run the service, such as keeping you signed in. Orbely does not use advertising trackers today.</p>

      <h2 className="mt-8 font-display text-xl font-bold text-ivory">Sub-processors and cross-border transfers</h2>
      <p className="mt-4 text-muted">Orbely uses these sub-processors to run the service: Supabase for database and authentication, hosted in ap-south-1 (Mumbai, India); and Vercel for hosting and edge delivery, whose infrastructure and support processing locations are to be confirmed, and may include processing outside India. Orbely will update this list when sub-processors change. Orbely will not transfer your personal data to a country notified as restricted under the DPDP Act.</p>

      <h2 className="mt-8 font-display text-xl font-bold text-ivory">Retention and deletion</h2>
      <p className="mt-4 text-muted">Account data is kept while your account is active and for 30 days after your account is deleted. Workspace data is kept as the workspace customer instructs. Personal data, traffic data, and processing logs are retained for at least one year, as required by Rule 8(3) of the DPDP Rules, 2025, and are then erased unless another law requires a longer period. Backups are kept for 30 days. When the purpose of processing is served or consent is withdrawn, Orbely erases the personal data, subject to legal retention. Orbely will give you at least 48 hours&apos; notice before erasing your data when your account is closed, so you can log in, contact Orbely, or exercise your rights first.</p>

      <h2 className="mt-8 font-display text-xl font-bold text-ivory">Your rights</h2>
      <p className="mt-4 text-muted">Under the DPDP Act, you have the right to access a summary of the personal data Orbely processes about you and who it has been shared with, to correct inaccurate or incomplete data, to ask for erasure when the purpose is spent or consent is withdrawn, to seek grievance redressal, and to nominate another person to exercise your rights if you die or become incapacitated. To exercise any of these rights, email ks3676423@gmail.com. Self-serve controls in the product are not yet available, so this email route is the working route for rights requests today. Orbely will respond within 90 days with a reasoned decision. If your grievance is not resolved, you may complain to the Data Protection Board of India. For personal data inside a workspace, members should contact their workspace leader first, and Orbely will assist the leader with the request.</p>

      <h2 className="mt-8 font-display text-xl font-bold text-ivory">Children</h2>
      <p className="mt-4 text-muted">Orbely is for users aged 18 and over. Orbely does not knowingly process the personal data of children, and does not do so without verifiable parental consent.</p>

      <h2 className="mt-8 font-display text-xl font-bold text-ivory">Security and breach</h2>
      <p className="mt-4 text-muted">Orbely uses reasonable security safeguards, including encryption in transit and encryption at rest where applicable, access controls, logging, and backups. If a personal data breach occurs, Orbely will inform each affected person without delay, describing the breach, its likely consequences, and the steps being taken, and will inform the Data Protection Board of India without delay, with a detailed report within 72 hours, as required by Rule 7 of the DPDP Rules, 2025. Where the CERT-In Directions apply, Orbely will report the specified cyber security incidents to CERT-In within 6 hours of noticing them.</p>

      <h2 className="mt-8 font-display text-xl font-bold text-ivory">Deletion in the product</h2>
      <p className="mt-4 text-muted">A member can leave a workspace, and a workspace leader can delete a workspace. Deletion removes workspace data from active systems. Backups, security logs, and data kept for legal reasons survive deletion and are erased when their retention period ends, as set out above. A leader deleting a workspace deletes the personal data of its members too, so leaders should only delete a workspace when the members no longer need it.</p>

      <h2 className="mt-8 font-display text-xl font-bold text-ivory">Grievances and complaints</h2>
      <p className="mt-4 text-muted">Grievance Officer: Kartikey Singh, ks3676423@gmail.com, VIT Bhopal University, Kothrikalan, Sehore, Madhya Pradesh 466114, India. Orbely will acknowledge your complaint within 24 hours and resolve it within 15 days of receiving it. If your grievance is not resolved, you may complain to the Data Protection Board of India.</p>

      <h2 className="mt-8 font-display text-xl font-bold text-ivory">Changes to this policy</h2>
      <p className="mt-4 text-muted">Orbely may update this policy, and will tell you about material changes before they take effect. Continued use after a change means you accept the updated policy.</p>

      <p className="mt-8 text-sm text-muted">
        <Link href="/legal/terms" className="font-medium text-gold-soft hover:underline">Terms of Service</Link>
        {" · "}
        <Link href="/legal/acceptable-use" className="font-medium text-gold-soft hover:underline">Acceptable Use Policy</Link>
        {" · "}
        <Link href="/legal/data-processing" className="font-medium text-gold-soft hover:underline">Data Processing Terms</Link>
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
