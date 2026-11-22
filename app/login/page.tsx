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
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-brass">
        {PRODUCT_NAME}
      </p>
      <h1 className="mt-3 text-3xl font-bold tracking-tight">
        Sign in to your office
      </h1>
      <p className="mt-2 text-sm text-muted">
        Your agents are waiting. Sign in to open your workspaces.
      </p>

      {sp.error && (
        <p className="mt-6 rounded-lg border border-[#AC4136]/40 bg-[#FBEDEA] px-4 py-3 text-sm text-[#AC4136]">
          Sign-in failed. Please try again.
        </p>
      )}

      <div className="mt-8 rounded-xl border border-line bg-surface p-6">
        <AuthForm mode="login" redirectTo={sp.next} />
      </div>

      <p className="mt-6 text-center text-sm text-muted">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="font-medium text-brass hover:text-brass-strong">
          Sign up
        </Link>
      </p>
    </main>
  );
}
