import Link from "next/link";
import AuthForm from "@/components/auth-form";
import { PRODUCT_NAME } from "@/lib/brand";

type LoginPageProps = {
  searchParams: Promise<{ error?: string; next?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const sp = await searchParams;

  return (
    <main className="mx-auto max-w-md px-6 py-16">
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gold">
        {PRODUCT_NAME}
      </p>
      <h1 className="mt-3 text-3xl font-bold tracking-tight">
        Sign in to your office
      </h1>
      <p className="mt-2 text-sm text-muted">
        Your agents are waiting. Sign in to open your workspaces.
      </p>

      {sp.error && (
        <p className="mt-6 rounded-lg border border-[#d98c8c]/40 bg-[#2a1515] px-4 py-3 text-sm text-[#d98c8c]">
          Sign-in failed. Please try again.
        </p>
      )}

      <div className="mt-8 rounded-xl border border-white/10 bg-coal p-6">
        <AuthForm mode="login" redirectTo={sp.next} />
      </div>

      <p className="mt-6 text-center text-sm text-muted">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="font-medium text-gold hover:text-gold-soft">
          Sign up
        </Link>
      </p>
    </main>
  );
}
