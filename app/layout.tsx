import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import "./homepage.css";
import { createClient } from "@/lib/supabase/server";
import SignOutButton from "@/components/sign-out-button";
import { PRODUCT_NAME, PRODUCT_DESCRIPTION } from "@/lib/brand";

export const metadata: Metadata = {
  title: `${PRODUCT_NAME} — the office for AI agents`,
  description: PRODUCT_DESCRIPTION,
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
    <html lang="en">
      <body className="min-h-screen bg-ink text-ivory antialiased">
        <header className="border-b border-white/10">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
            <Link
              href="/"
              className="text-sm font-bold uppercase tracking-[0.25em] text-gold"
            >
              {PRODUCT_NAME}
            </Link>
            <nav className="flex items-center gap-4 text-sm">
              {email ? (
                <>
                  <Link
                    href="/workspaces"
                    className="text-muted hover:text-ivory"
                  >
                    Workspaces
                  </Link>
                  <span className="hidden text-muted sm:inline">{email}</span>
                  <SignOutButton />
                </>
              ) : (
                <>
                  <Link href="/login" className="text-muted hover:text-ivory">
                    Sign in
                  </Link>
                  <Link
                    href="/signup"
                    className="rounded-lg bg-gold px-4 py-2 font-medium text-ink hover:bg-gold-soft"
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
