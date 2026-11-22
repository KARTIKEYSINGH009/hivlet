import Link from "next/link";

// Contact page. Hivlet owns no domain (hivlet.com belongs to someone
// else), so help@hivlet cannot receive mail directly. The address is
// shown as plain text only, never as a mailto link, and messages are
// delivered to Kartikey's Gmail via FormSubmit. FormSubmit's first
// submission triggers an activation email to ks3676423@gmail.com that
// must be clicked before any message is delivered. The form posts
// straight to FormSubmit and works without JavaScript.

const TOPICS = [
  "General question",
  "Grievance",
  "Privacy request",
  "Report abuse",
  "Billing",
];

export default async function ContactPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string }>;
}) {
  const params = await searchParams;
  const sent = params.sent === "1";

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-3xl font-bold text-ivory">
        Contact
      </h1>
      <p className="mt-4 text-muted">
        Write to the Hivlet team at{" "}
        <span className="font-medium text-gold-soft">help@hivlet</span>.
        Messages sent through the form below go to the Hivlet team.
      </p>

      {sent ? (
        <p className="mt-8 rounded-lg border border-gold/40 bg-coal px-4 py-3 text-sm font-medium text-gold-soft">
          Thanks, your message is on its way to the Hivlet team.
        </p>
      ) : (
        <form
          action="https://formsubmit.co/ks3676423@gmail.com"
          method="POST"
          className="mt-8 space-y-5 rounded-xl border border-white/10 bg-coal p-5"
        >
          <input type="hidden" name="_subject" value="Hivlet contact form" />
          <input type="hidden" name="_template" value="table" />
          <input type="hidden" name="_captcha" value="true" />
          <input
            type="hidden"
            name="_next"
            value="https://hivlet.vercel.app/contact?sent=1"
          />

          <div>
            <label
              htmlFor="contact-name"
              className="block text-sm font-medium text-ivory"
            >
              Your name
            </label>
            <input
              id="contact-name"
              name="name"
              type="text"
              required
              autoComplete="name"
              placeholder="Your name"
              className="mt-1.5 w-full rounded-lg border border-white/15 bg-ink px-4 py-2.5 text-sm text-ivory placeholder:text-muted focus:border-gold"
            />
          </div>

          <div>
            <label
              htmlFor="contact-email"
              className="block text-sm font-medium text-ivory"
            >
              Your email
            </label>
            <input
              id="contact-email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
              className="mt-1.5 w-full rounded-lg border border-white/15 bg-ink px-4 py-2.5 text-sm text-ivory placeholder:text-muted focus:border-gold"
            />
          </div>

          <div>
            <label
              htmlFor="contact-topic"
              className="block text-sm font-medium text-ivory"
            >
              Topic
            </label>
            <select
              id="contact-topic"
              name="topic"
              required
              defaultValue={TOPICS[0]}
              className="mt-1.5 w-full rounded-lg border border-white/15 bg-ink px-4 py-2.5 text-sm text-ivory focus:border-gold"
            >
              {TOPICS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="contact-message"
              className="block text-sm font-medium text-ivory"
            >
              Message
            </label>
            <textarea
              id="contact-message"
              name="message"
              required
              rows={6}
              placeholder="What do you need help with?"
              className="mt-1.5 w-full rounded-lg border border-white/15 bg-ink px-4 py-2.5 text-sm text-ivory placeholder:text-muted focus:border-gold"
            />
          </div>

          <button
            type="submit"
            className="rounded-lg bg-gold px-5 py-2.5 text-sm font-semibold text-ink hover:bg-gold-soft"
          >
            Send message
          </button>
        </form>
      )}

      <p className="mt-8 text-sm text-muted">
        Grievances are handled by Kartikey Singh, Hivlet&apos;s Grievance
        Officer. See the{" "}
        <Link
          href="/legal/terms"
          className="font-medium text-gold-soft hover:underline"
        >
          Terms
        </Link>{" "}
        and{" "}
        <Link
          href="/legal/privacy"
          className="font-medium text-gold-soft hover:underline"
        >
          Privacy Policy
        </Link>{" "}
        for how complaints and privacy requests are handled.
      </p>
    </main>
  );
}
