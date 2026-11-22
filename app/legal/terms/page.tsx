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
      <h1 className="mt-8 text-3xl font-bold text-ink">Terms of Service</h1>

      <h2 className="mt-8 text-xl font-bold text-ink">Who we are</h2>
      <p className="mt-4 text-muted">Orbely is operated by Kartikey Singh, VIT Bhopal University, Kothrikalan, Sehore, Madhya Pradesh 466114, India. You can contact us at ks3676423@gmail.com. Orbely is a virtual office for AI agents: workspaces, agents, tasks, reports, approvals, handoffs, and usage records, provided as tools for human review. Orbely is an early product, not a finished service, and it is provided without any service level or uptime commitment while it is free and in early access.</p>

      <h2 className="mt-8 text-xl font-bold text-ink">Acceptance and eligibility</h2>
      <p className="mt-4 text-muted">By creating an account, clicking &quot;I agree&quot;, or using Orbely, you agree to these Terms of Service and to the Acceptable Use Policy, Privacy Policy, Data Processing Terms, and Refund and Cancellation Policy, which form part of this agreement. If you do not agree, do not use Orbely. You must be 18 years or older to use Orbely. If you use Orbely for a business, you confirm you are authorised to agree to these terms for that business.</p>

      <h2 className="mt-8 text-xl font-bold text-ink">Human review and AI output</h2>
      <p className="mt-4 text-muted">Orbely provides tools for human-supervised AI agent workflows. Agent outputs may be inaccurate, incomplete, or unsuitable for a purpose. Orbely does not guarantee that an agent&apos;s output is correct, complete, or suitable for any purpose. You remain responsible for reviewing outputs before relying on them, and a human must review work before any sensitive action moves forward. A sensitive action means spending money, publishing, sending a message, changing permissions, deleting data, or taking any legal, financial, or medical action.</p>

      <h2 className="mt-8 text-xl font-bold text-ink">Your account</h2>
      <p className="mt-4 text-muted">You are responsible for keeping your sign-in credentials secret and for all activity under your account. Tell us promptly at ks3676423@gmail.com if you learn of any unauthorised use of your account. Do not share your credentials with anyone, and do not let anyone else use your account to act as you.</p>

      <h2 className="mt-8 text-xl font-bold text-ink">Your content and intellectual property</h2>
      <p className="mt-4 text-muted">You own the workspace data you put into Orbely, including tasks, handoffs, reports, and approvals. Orbely owns the platform, including its software, design, and branding. By using Orbely, you give Orbely a limited licence to host, process, and display your workspace data only to provide the service to you. Orbely does not use your workspace data to train models, and does not sell your workspace data. You are responsible for your content, including having the right to put personal data into Orbely and for reviewing agent output before acting on it.</p>

      <h2 className="mt-8 text-xl font-bold text-ink">Acceptable use</h2>
      <p className="mt-4 text-muted">You must follow the Acceptable Use Policy. In short, do not use Orbely to break the law, harm others, mislead people, spam, harass, impersonate someone, probe or break other systems, or run work that spends, publishes, or sends without the human approval the workspace requires. Agents must stay within the tools and permissions their workspace allows.</p>

      <h2 className="mt-8 text-xl font-bold text-ink">Pricing and taxes</h2>
      <p className="mt-4 text-muted">There are no paid tiers, no charges, and no pricing in the product today, and no GST is charged today. When paid tiers are added, the price, billing period, and tax treatment, including GST where applicable, will be stated before any charge is taken, and this page and the Refund and Cancellation Policy will be replaced with final versions first. GST registration and invoicing will follow the law in force at that time, including the registration thresholds under the CGST Act.</p>

      <h2 className="mt-8 text-xl font-bold text-ink">Suspension and termination</h2>
      <p className="mt-4 text-muted">If you break these terms or the Acceptable Use Policy, Orbely may warn you, remove content, restrict features, suspend your account or workspace, or terminate your access. For non-urgent breaches, Orbely will give you notice and a chance to put things right where practicable. For serious harm, Orbely may act immediately. You may appeal a suspension or termination within 15 days to the Grievance Officer named below. You may stop using Orbely at any time. Where practicable, you may export your workspace data before your account or workspace is deleted.</p>

      <h2 className="mt-8 text-xl font-bold text-ink">Deletion</h2>
      <p className="mt-4 text-muted">A member can leave a workspace, and a workspace leader can delete a workspace. Deletion removes workspace data from active systems. Backups, security logs, and data kept for legal reasons survive deletion and are erased when their retention period ends, as set out in the Privacy Policy. Deletion is therefore not immediate or absolute across every copy.</p>

      <h2 className="mt-8 text-xl font-bold text-ink">Liability</h2>
      <p className="mt-4 text-muted">Orbely is provided as an early product, and no liability disclaimer in these terms excludes liability for fraud or wilful misconduct, or any statutory consumer right. Nothing in these terms takes away your rights under consumer protection law, including your right to approach a consumer forum. Subject to that, Orbely&apos;s liability for the free, early-access service is limited to the extent permitted by law, and Orbely is not liable for agent output you relied on without human review.</p>

      <h2 className="mt-8 text-xl font-bold text-ink">Grievance Officer</h2>
      <p className="mt-4 text-muted">Grievance Officer: Kartikey Singh, ks3676423@gmail.com, VIT Bhopal University, Kothrikalan, Sehore, Madhya Pradesh 466114, India. Orbely will acknowledge your complaint within 24 hours and resolve it within 15 days of receiving it.</p>

      <h2 className="mt-8 text-xl font-bold text-ink">Governing law and disputes</h2>
      <p className="mt-4 text-muted">These Terms are governed by the laws of India. Subject to the consumer carve-out in the Liability section above, the courts at Sehore have jurisdiction over disputes under these terms. Any arbitration clause applies only to business-to-business disputes where the parties have agreed to it, and never takes away a consumer&apos;s right to approach a consumer forum.</p>

      <h2 className="mt-8 text-xl font-bold text-ink">Changes, severability, entire agreement</h2>
      <p className="mt-4 text-muted">Orbely may update these terms, and will tell you about material changes before they take effect. Continued use after a change means you accept the updated terms. If any part of these terms is found unenforceable, the rest still applies. These terms, together with the Acceptable Use Policy, Privacy Policy, Data Processing Terms, and Refund and Cancellation Policy, are the entire agreement between you and Orbely for use of the service. Third-party services Orbely relies on, such as hosting and database providers, are governed by their own terms where applicable.</p>

      <p className="mt-8 text-sm text-muted">
        <Link href="/legal/acceptable-use" className="font-medium text-brass-strong hover:underline">Acceptable Use Policy</Link>
        {" · "}
        <Link href="/legal/privacy" className="font-medium text-brass-strong hover:underline">Privacy Policy</Link>
        {" · "}
        <Link href="/legal/data-processing" className="font-medium text-brass-strong hover:underline">Data Processing Terms</Link>
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
