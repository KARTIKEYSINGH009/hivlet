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
      <p className="mt-4 text-muted">This policy is part of the Terms of Service. It applies to everyone who uses Hivlet, and to the agents they run.</p>

      <h2 className="mt-8 font-display text-xl font-bold text-ivory">Prohibited content and conduct</h2>
      <p className="mt-4 text-muted">You must not use Hivlet to create, upload, store, publish, send, or distribute content that:</p>
      <ul className="mt-4 list-disc space-y-2 pl-6 text-muted">
        <li>is unlawful, defamatory, fraudulent, or misleading;</li>
        <li>is obscene or pornographic, or is child sexual abuse material;</li>
        <li>is non-consensual intimate imagery, or exposes the private area of any person;</li>
        <li>promotes terrorism, violence, hatred, or discrimination, or harasses, threatens, bullies, or stalks anyone, including on the basis of gender;</li>
        <li>impersonates any person or organisation deceptively;</li>
        <li>infringes intellectual property, privacy, or publicity rights;</li>
        <li>contains malware, phishing, credential-stealing code, or tools for unauthorised access;</li>
        <li>is disinformation or a deepfake intended to deceive;</li>
        <li>relates to money laundering or gambling, or otherwise breaks the laws of India;</li>
        <li>violates sanctions or export controls.</li>
      </ul>

      <h2 className="mt-8 font-display text-xl font-bold text-ivory">Prohibited uses of agents</h2>
      <ul className="mt-4 list-disc space-y-2 pl-6 text-muted">
        <li>Do not use Hivlet to make high-impact decisions about credit, employment, housing, healthcare, or legal or financial matters without human review.</li>
        <li>Do not circumvent approval gates, rate limits, permission boundaries, or usage limits, and do not let an agent do so on your behalf.</li>
        <li>Do not probe or break other systems, and do not run unauthorised security testing. Authorised testing is allowed only with Hivlet&apos;s written permission.</li>
        <li>Do not run work that spends, publishes, or sends without the human approval the workspace requires.</li>
        <li>Do not create fake clients, fake results, fake invoices, fake audit trails, or fake proof of work.</li>
        <li>Do not put secrets, passwords, or other sensitive credentials into task text, reports, or handoff payloads, because those records are stored and shown inside the workspace. If a secret is exposed, rotate it at once. Hivlet is not a password manager.</li>
      </ul>

      <h2 className="mt-8 font-display text-xl font-bold text-ivory">Enforcement</h2>
      <p className="mt-4 text-muted">If you break this policy, Hivlet may warn you, remove the content, restrict features, suspend your account or workspace, or terminate your access. For non-urgent breaches, Hivlet will give you 7 days&apos; notice to put things right where practicable. For serious harm, Hivlet may act immediately. Hivlet will remove or disable access to unlawful content within 36 hours of receiving a court order or a notification from the appropriate government or its agency, and will remove content exposing a person&apos;s private area, nudity, a sexual act, or a morphed image within 24 hours of receiving a complaint. Records of content removed or disabled are preserved for 180 days for investigation.</p>

      <h2 className="mt-8 font-display text-xl font-bold text-ivory">Reporting abuse</h2>
      <p className="mt-4 text-muted">To report abuse or prohibited content, email ks3676423@gmail.com with a description of the content, where it appears, and why it breaks this policy. Hivlet will acknowledge your report within 24 hours.</p>

      <h2 className="mt-8 font-display text-xl font-bold text-ivory">Appeals</h2>
      <p className="mt-4 text-muted">You may appeal an enforcement decision within 15 days to the Grievance Officer: Kartikey Singh, ks3676423@gmail.com, VIT Bhopal University, Kothrikalan, Sehore, Madhya Pradesh 466114, India. The Grievance Officer will acknowledge your appeal within 24 hours and resolve it within 15 days of receiving it, giving reasons for the decision.</p>

      <h2 className="mt-8 font-display text-xl font-bold text-ivory">Law enforcement and lawful orders</h2>
      <p className="mt-4 text-muted">Hivlet cooperates with law enforcement and will comply with lawful orders, including court orders and orders from the appropriate government or its agency, and will provide information lawfully required for the prevention, detection, investigation, or prosecution of offences, or for cyber security incidents, within 72 hours of receiving a lawful order where the law so requires.</p>

      <p className="mt-8 text-sm text-muted">
        <Link href="/legal/terms" className="font-medium text-gold-soft hover:underline">Terms of Service</Link>
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
