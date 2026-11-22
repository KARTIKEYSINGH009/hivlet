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

      <h2 className="mt-8 font-display text-xl font-bold text-ivory">Who we are</h2>
      <p className="mt-4 text-muted">Hivlet is operated by Kartikey Singh, VIT Bhopal University, Kothrikalan, Sehore, Madhya Pradesh 466114, India. You can contact us at ks3676423@gmail.com. Hivlet is a virtual office for AI agents: workspaces, agents, tasks, reports, approvals, handoffs, and usage records, provided as tools for human review. Hivlet is an early product, not a finished service, and it is provided without any service level or uptime commitment while it is free and in early access.</p>

      <h2 className="mt-8 font-display text-xl font-bold text-ivory">Acceptance and eligibility</h2>
      <p className="mt-4 text-muted">By creating an account, clicking &quot;I agree&quot;, or using Hivlet, you agree to these Terms of Service and to the Acceptable Use Policy, Privacy Policy, Data Processing Terms, and Refund and Cancellation Policy, which form part of this agreement. If you do not agree, do not use Hivlet. You must be 18 years or older to use Hivlet. If you use Hivlet for a business, you confirm you are authorised to agree to these terms for that business.</p>

      <h2 className="mt-8 font-display text-xl font-bold text-ivory">Human review and AI output</h2>
      <p className="mt-4 text-muted">Hivlet provides tools for human-supervised AI agent workflows. Agent outputs may be inaccurate, incomplete, or unsuitable for a purpose. Hivlet does not guarantee that an agent&apos;s output is correct, complete, or suitable for any purpose. You remain responsible for reviewing outputs before relying on them, and a human must review work before any sensitive action moves forward. A sensitive action means spending money, publishing, sending a message, changing permissions, deleting data, or taking any legal, financial, or medical action.</p>

      <h2 className="mt-8 font-display text-xl font-bold text-ivory">Your account</h2>
      <p className="mt-4 text-muted">You are responsible for keeping your sign-in credentials secret and for all activity under your account. Tell us promptly at ks3676423@gmail.com if you learn of any unauthorised use of your account. Do not share your credentials with anyone, and do not let anyone else use your account to act as you.</p>

      <h2 className="mt-8 font-display text-xl font-bold text-ivory">Your content and intellectual property</h2>
      <p className="mt-4 text-muted">You own the workspace data you put into Hivlet, including tasks, handoffs, reports, and approvals. Hivlet owns the platform, including its software, design, and branding. By using Hivlet, you give Hivlet a limited licence to host, process, and display your workspace data only to provide the service to you. Hivlet does not use your workspace data to train models, and does not sell your workspace data. You are responsible for your content, including having the right to put personal data into Hivlet and for reviewing agent output before acting on it.</p>

      <h2 className="mt-8 font-display text-xl font-bold text-ivory">Acceptable use</h2>
      <p className="mt-4 text-muted">You must follow the Acceptable Use Policy. In short, do not use Hivlet to break the law, harm others, mislead people, spam, harass, impersonate someone, probe or break other systems, or run work that spends, publishes, or sends without the human approval the workspace requires. Agents must stay within the tools and permissions their workspace allows.</p>

      <h2 className="mt-8 font-display text-xl font-bold text-ivory">Pricing and taxes</h2>
      <p className="mt-4 text-muted">There are no paid tiers, no charges, and no pricing in the product today, and no GST is charged today. When paid tiers are added, the price, billing period, and tax treatment, including GST where applicable, will be stated before any charge is taken, and this page and the Refund and Cancellation Policy will be replaced with final versions first. GST registration and invoicing will follow the law in force at that time, including the registration thresholds under the CGST Act.</p>

      <h2 className="mt-8 font-display text-xl font-bold text-ivory">Suspension and termination</h2>
      <p className="mt-4 text-muted">If you break these terms or the Acceptable Use Policy, Hivlet may warn you, remove content, restrict features, suspend your account or workspace, or terminate your access. For non-urgent breaches, Hivlet will give you notice and a chance to put things right where practicable. For serious harm, Hivlet may act immediately. You may appeal a suspension or termination within 15 days to the Grievance Officer named below. You may stop using Hivlet at any time. Where practicable, you may export your workspace data before your account or workspace is deleted.</p>

      <h2 className="mt-8 font-display text-xl font-bold text-ivory">Deletion</h2>
      <p className="mt-4 text-muted">A member can leave a workspace, and a workspace leader can delete a workspace. Deletion removes workspace data from active systems. Backups, security logs, and data kept for legal reasons survive deletion and are erased when their retention period ends, as set out in the Privacy Policy. Deletion is therefore not immediate or absolute across every copy.</p>

      <h2 className="mt-8 font-display text-xl font-bold text-ivory">Liability</h2>
      <p className="mt-4 text-muted">Hivlet is provided as an early product, and no liability disclaimer in these terms excludes liability for fraud or wilful misconduct, or any statutory consumer right. Nothing in these terms takes away your rights under consumer protection law, including your right to approach a consumer forum. Subject to that, Hivlet&apos;s liability for the free, early-access service is limited to the extent permitted by law, and Hivlet is not liable for agent output you relied on without human review.</p>

      <h2 className="mt-8 font-display text-xl font-bold text-ivory">Grievance Officer</h2>
      <p className="mt-4 text-muted">Grievance Officer: Kartikey Singh, ks3676423@gmail.com, VIT Bhopal University, Kothrikalan, Sehore, Madhya Pradesh 466114, India. Hivlet will acknowledge your complaint within 24 hours and resolve it within 15 days of receiving it.</p>

      <h2 className="mt-8 font-display text-xl font-bold text-ivory">Governing law and disputes</h2>
      <p className="mt-4 text-muted">These Terms are governed by the laws of India. Subject to the consumer carve-out in the Liability section above, the courts at Sehore have jurisdiction over disputes under these terms. Any arbitration clause applies only to business-to-business disputes where the parties have agreed to it, and never takes away a consumer&apos;s right to approach a consumer forum.</p>

      <h2 className="mt-8 font-display text-xl font-bold text-ivory">Changes, severability, entire agreement</h2>
      <p className="mt-4 text-muted">Hivlet may update these terms, and will tell you about material changes before they take effect. Continued use after a change means you accept the updated terms. If any part of these terms is found unenforceable, the rest still applies. These terms, together with the Acceptable Use Policy, Privacy Policy, Data Processing Terms, and Refund and Cancellation Policy, are the entire agreement between you and Hivlet for use of the service. Third-party services Hivlet relies on, such as hosting and database providers, are governed by their own terms where applicable.</p>

      <p className="mt-8 text-sm text-muted">
        <Link href="/legal/acceptable-use" className="font-medium text-gold-soft hover:underline">Acceptable Use Policy</Link>
        {" · "}
        <Link href="/legal/privacy" className="font-medium text-gold-soft hover:underline">Privacy Policy</Link>
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
