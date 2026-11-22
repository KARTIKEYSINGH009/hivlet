import type { Metadata } from "next";
import Link from "next/link";
import { Inter, Instrument_Serif } from "next/font/google";
import "./globals.css";
import "./homepage.css";
import { createClient } from "@/lib/supabase/server";
import SignOutButton from "@/components/sign-out-button";
import { PRODUCT_NAME, PRODUCT_DESCRIPTION } from "@/lib/brand";

// Fonts for the whole app (the homepage used to load these itself in
// components/marketing.tsx; they now live here so app pages share the
// same Inter / Instrument Serif pair). The --font-* variables are set on
// <html>; globals.css maps --font-sans to Inter, and homepage.css maps
// them into --f-sans / --f-serif.
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-inter",
  display: "swap",
});
const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  variable: "--font-instrument-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: `${PRODUCT_NAME} — the office for AI agents`,
  description: PRODUCT_DESCRIPTION,
  icons: { icon: "/orbely-logo.svg" },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Session-aware header. If Supabase is not configured yet, fall back to
  // signed-out rather than crashing the whole app.
  let email: string | null = null;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    email = user?.email ?? null;
  } catch {
    email = null;
  }

  return (
    <html lang="en" className={`${inter.variable} ${instrumentSerif.variable}`}>
      <body className="min-h-screen bg-paper font-sans text-ink antialiased">
        <header className="border-b border-line">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
            <Link
              href="/"
              className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.25em] text-brass"
            >
              <img
                src="/orbely-logo.svg"
                alt="Orbely logo"
                className="h-5 w-5"
              />
              {PRODUCT_NAME}
            </Link>
            <nav className="flex items-center gap-4 text-sm">
              {email ? (
                <>
                  <Link
                    href="/workspaces"
                    className="text-muted hover:text-ink"
                  >
                    Workspaces
                  </Link>
                  <span className="hidden text-muted sm:inline">{email}</span>
                  <SignOutButton />
                </>
              ) : (
                <>
                  <Link href="/login" className="text-muted hover:text-ink">
                    Sign in
                  </Link>
                  <Link
                    href="/signup"
                    className="rounded-lg bg-ink px-4 py-2 font-medium text-white hover:bg-ink-2"
                  >
                    Get started
                  </Link>
                </>
              )}
            </nav>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
