import type { Metadata } from "next";
import Link from "next/link";
import LoginForm from "@/components/login-form";

export const metadata: Metadata = {
  title: "Sign in — Orbely",
  description: "Sign in to your Orbely workspace. Your agents are waiting.",
  robots: { index: false, follow: false },
};

type LoginPageProps = {
  searchParams: Promise<{ error?: string; next?: string }>;
};

/*
 * Login page, ported 1:1 from the supplied Orbely-Login.html design
 * (styles in app/login.css, scoped under .orbely-auth). The office-card
 * panel is static demo markup, no live data. Auth is wired for real in
 * components/login-form.tsx. There is no password-reset route in the app,
 * so the design's "Forgot password?" link (which pointed at a
 * Cloudflare-obfuscated email address) is omitted, not invented.
 */
export default async function LoginPage({ searchParams }: LoginPageProps) {
  const sp = await searchParams;

  return (
    <div className="orbely-auth">
      <a className="skip" href="#auth-main">
        Skip to form
      </a>

      <svg
        width="0"
        height="0"
        style={{ position: "absolute" }}
        aria-hidden="true"
        focusable="false"
      >
        <symbol id="i-arrow-ur" viewBox="0 0 24 24">
          <path d="M7 17 17 7M9 7h8v8" />
        </symbol>
        <symbol id="i-arrow-l" viewBox="0 0 24 24">
          <path d="M20 12H5M11 18l-6-6 6-6" />
        </symbol>
        <symbol id="i-alert" viewBox="0 0 24 24">
          <path d="M12 4.5 3.8 18.5h16.4z" />
          <path d="M12 10v3.4M12 16.2v.1" />
        </symbol>
        <symbol id="i-eye" viewBox="0 0 24 24">
          <path d="M2.5 12S6 5.8 12 5.8 21.5 12 21.5 12 18 18.2 12 18.2 2.5 12 2.5 12z" />
          <circle cx="12" cy="12" r="3.1" />
        </symbol>
        <symbol id="i-eye-off" viewBox="0 0 24 24">
          <path d="M4 4.5 20 20" />
          <path d="M9.6 6.2A9.7 9.7 0 0 1 12 6c6 0 9.5 6 9.5 6a17 17 0 0 1-3 3.7" />
          <path d="M6.2 8.1A17 17 0 0 0 2.5 12S6 18 12 18a9.6 9.6 0 0 0 4-.85" />
          <path d="M9.9 10a3 3 0 0 0 4.2 4.2" />
        </symbol>
        <symbol id="i-layers" viewBox="0 0 24 24">
          <path d="m12 3.5 8.5 4.3L12 12.1 3.5 7.8z" />
          <path d="m3.5 12.5 8.5 4.3 8.5-4.3" />
          <path d="m3.5 16.8 8.5 4.2 8.5-4.2" />
        </symbol>
        <symbol id="i-sparkle" viewBox="0 0 24 24">
          <path d="M12 3.5 13.9 9l5.6 2-5.6 2L12 18.5 10.1 13 4.5 11l5.6-2z" />
        </symbol>
        <symbol id="i-pen" viewBox="0 0 24 24">
          <path d="M4.5 19.5h4L19 9a2.1 2.1 0 0 0-3-3L5.5 16.5z" />
        </symbol>
        <symbol id="i-shield" viewBox="0 0 24 24">
          <path d="M12 3.5 5 6.2v5.4c0 4.1 2.9 7.4 7 8.9 4.1-1.5 7-4.8 7-8.9V6.2z" />
        </symbol>
        <symbol id="i-gate" viewBox="0 0 24 24">
          <rect x="4.5" y="10" width="15" height="9.5" rx="2.5" />
          <path d="M8.5 10V7.8a3.5 3.5 0 0 1 7 0V10" />
        </symbol>
      </svg>

      <header className="site-header">
        <div className="wrap header-inner">
          <Link href="/" className="brand" aria-label="Orbely — home">
            <svg
              className="brand__mark"
              viewBox="0 0 32 32"
              aria-hidden="true"
              fill="none"
            >
              <rect
                x="0.75"
                y="0.75"
                width="30.5"
                height="30.5"
                rx="8.5"
                stroke="currentColor"
                strokeOpacity=".16"
              />
              <circle
                cx="16"
                cy="16"
                r="7.4"
                stroke="currentColor"
                strokeWidth="1.6"
              />
              <circle cx="16" cy="16" r="2.7" fill="currentColor" />
              <circle
                className="orbit"
                cx="16"
                cy="16"
                r="11.4"
                stroke="currentColor"
                strokeOpacity=".22"
                strokeDasharray="2 4"
              />
            </svg>
            <span className="brand__word">Orbely</span>
          </Link>
          <div className="header-actions" style={{ marginLeft: "auto" }}>
            <Link href="/" className="btn btn--ghost">
              <svg
                className="i"
                aria-hidden="true"
                style={{ width: 14, height: 14 }}
              >
                <use href="#i-arrow-l" />
              </svg>{" "}
              Back to site
            </Link>
            <Link href="/signup" className="btn btn--secondary">
              Create account
            </Link>
          </div>
        </div>
      </header>

      <main id="auth-main" className="auth">
        <section className="auth__col" aria-labelledby="auth-title">
          <div className="auth__inner">
            <p className="eyebrow eyebrow--plain">
              <span className="eyebrow__t">Sign in</span>
            </p>
            <h1 id="auth-title">Sign in to your office.</h1>
            <p className="lede">
              Your agents are waiting. Sign in to open your workspaces.
            </p>

            <LoginForm
              redirectTo={sp.next}
              initialError={
                sp.error ? "Sign-in failed. Please try again." : undefined
              }
            />

            <p className="auth__alt">
              Don&apos;t have an account?{" "}
              <Link href="/signup">Create one</Link>.
            </p>
            <p className="auth__legal">
              By signing in you agree to our{" "}
              <Link
                href="/legal/terms"
                style={{
                  borderBottom: "1px solid var(--line-3)",
                  color: "inherit",
                }}
              >
                Terms
              </Link>{" "}
              and{" "}
              <Link
                href="/legal/privacy"
                style={{
                  borderBottom: "1px solid var(--line-3)",
                  color: "inherit",
                }}
              >
                Privacy
              </Link>{" "}
              notice. Early access · a human is still in the loop.
            </p>
          </div>
        </section>

        <aside className="auth__panel" aria-label="About Orbely">
          <p className="auth__statement">
            Agents work.
            <br />
            <em>People decide.</em>
          </p>

          <div className="office-card">
            <div className="office-card__head">
              <span className="tile">
                <svg
                  className="i"
                  aria-hidden="true"
                  style={{ width: 15, height: 15 }}
                >
                  <use href="#i-layers" />
                </svg>
              </span>
              <div>
                <strong>The launch team</strong>
                <span>One office. A shared direction.</span>
              </div>
              <span className="tag">Example</span>
            </div>
            <div className="office-card__body">
              <div className="office-card__kicker">
                <span>Today</span>
                <span>3 agents</span>
              </div>
              <div className="office-agents" style={{ marginTop: ".35rem" }}>
                <div className="agent-row">
                  <span className="avatar">
                    <svg
                      className="i"
                      aria-hidden="true"
                      style={{ width: 13, height: 13 }}
                    >
                      <use href="#i-sparkle" />
                    </svg>
                  </span>
                  <div className="agent-row__id">
                    <strong>Researcher</strong>
                    <span>Owned by Dev</span>
                  </div>
                  <span className="pill pill--idle">
                    <i className="dot"></i>Idle
                  </span>
                </div>
                <div className="agent-row">
                  <span className="avatar avatar--brass">
                    <svg
                      className="i"
                      aria-hidden="true"
                      style={{ width: 13, height: 13 }}
                    >
                      <use href="#i-pen" />
                    </svg>
                  </span>
                  <div className="agent-row__id">
                    <strong>Writer</strong>
                    <span>Owned by Maya</span>
                  </div>
                  <span className="pill pill--working">
                    <i className="dot"></i>Working
                  </span>
                </div>
                <div className="agent-row">
                  <span className="avatar">
                    <svg
                      className="i"
                      aria-hidden="true"
                      style={{ width: 13, height: 13 }}
                    >
                      <use href="#i-shield" />
                    </svg>
                  </span>
                  <div className="agent-row__id">
                    <strong>Reviewer</strong>
                    <span>Owned by Patrick</span>
                  </div>
                  <span className="pill pill--review">
                    <i className="dot"></i>Awaiting approval
                  </span>
                </div>
              </div>
              <div className="approval-strip" style={{ cursor: "default" }}>
                <svg className="i" aria-hidden="true">
                  <use href="#i-gate" />
                </svg>
                <span>
                  <strong>A little human judgment, please.</strong>
                  <span>The launch announcement is ready to review.</span>
                </span>
              </div>
            </div>
            <div className="office-card__foot">
              <span className="live">Illustrative workspace</span>
              <span>Sign in to see yours</span>
            </div>
          </div>

          <p className="auth__panelmeta">
            <span className="live">Early access</span>
            <span>·</span>
            <span>Nothing is published without a person.</span>
          </p>
        </aside>
      </main>
    </div>
  );
}
