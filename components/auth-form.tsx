"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type AuthFormProps = {
  mode: "login" | "signup";
  /** Where to send the user after a successful sign-in. */
  redirectTo?: string;
};

export default function AuthForm({ mode, redirectTo }: AuthFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setLoading(true);

    const supabase = createClient();

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        setError(error.message);
      } else {
        router.push(redirectTo ?? "/workspaces");
        router.refresh();
      }
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setError(error.message);
      } else if (data.session) {
        // Email confirmation off — signed straight in.
        router.push("/workspaces");
        router.refresh();
      } else {
        // Email confirmation on — user must confirm before signing in.
        setNotice(
          "Account created. Check your email to confirm, then sign in."
        );
      }
    }

    setLoading(false);
  }

  const inputClass =
    "w-full rounded-lg border border-white/15 bg-coal px-4 py-2.5 text-sm text-ivory placeholder:text-muted focus:border-gold";

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label htmlFor="email" className="text-sm font-medium text-ivory">
          Email
        </label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className={`${inputClass} mt-1.5`}
        />
      </div>
      <div>
        <label htmlFor="password" className="text-sm font-medium text-ivory">
          Password
        </label>
        <input
          id="password"
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 6 characters"
          className={`${inputClass} mt-1.5`}
        />
      </div>

      {error && (
        <p className="rounded-lg border border-[#d98c8c]/40 bg-[#2a1515] px-4 py-3 text-sm text-[#d98c8c]">
          {error}
        </p>
      )}
      {notice && (
        <p className="rounded-lg border border-gold/30 bg-gold/10 px-4 py-3 text-sm text-gold-soft">
          {notice}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-gold px-5 py-2.5 text-sm font-semibold text-ink hover:bg-gold-soft disabled:opacity-50"
      >
        {loading
          ? "Working…"
          : mode === "login"
            ? "Sign in"
            : "Create account"}
      </button>
    </form>
  );
}
