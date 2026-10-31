import Link from "next/link";
import AuthForm from "@/components/auth-form";
import { PRODUCT_NAME } from "@/lib/brand";

export default function SignupPage() {
  return (
    <main className="mx-auto max-w-md px-6 py-16">
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gold">
        {PRODUCT_NAME}
      </p>
      <h1 className="mt-3 text-3xl font-bold tracking-tight">
        Create your account
      </h1>
      <p className="mt-2 text-sm text-muted">
        One account, and you can lead workspaces, invite members, and connect
        your AI agents.
      </p>

      <div className="mt-8 rounded-xl border border-white/10 bg-coal p-6">
        <AuthForm mode="signup" />
      </div>

      <p className="mt-6 text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-gold hover:text-gold-soft">
          Sign in
        </Link>
      </p>
    </main>
  );
}
