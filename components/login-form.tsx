"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type LoginFormProps = {
  /** Where to send the user after a successful sign-in. */
  redirectTo?: string;
  /** Generic failure passed via ?error= (carries no detail). */
  initialError?: string;
};

const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(v.trim());

/*
 * Login form, styled by the supplied Orbely-Login.html design (app/login.css).
 * Auth is the same real flow as the old form: Supabase signInWithPassword,
 * redirect to redirectTo ?? "/workspaces" on success, real server error
 * surfaced in the design's status area. The design's fake 700ms submit was
 * dropped. The "Remember this device" checkbox is rendered as designed but
 * changes nothing about the session: the app never had remember-me handling,
 * and the Supabase browser client persists the session by default.
 */
export default function LoginForm({ redirectTo, initialError }: LoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [emailErr, setEmailErr] = useState(false);
  const [passwordErr, setPasswordErr] = useState(false);
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [loading, setLoading] = useState(false);

  function validate(showErrors: boolean) {
    const emailBad = !isEmail(email);
    const passBad = password.length < 6;
    if (showErrors) {
      setEmailErr(emailBad);
      setPasswordErr(passBad);
    }
    return !emailBad && !passBad;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!validate(true)) {
      const firstBad = document.querySelector<HTMLElement>(
        '#signin-form [aria-invalid="true"]'
      );
      if (firstBad) firstBad.focus();
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push(redirectTo ?? "/workspaces");
      router.refresh();
    }
  }

  return (
    <form id="signin-form" noValidate onSubmit={onSubmit}>
      <div className="field">
        <label htmlFor="email">Email</label>
        <div className="field__box">
          <input
            id="email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="username"
            placeholder="you@example.com"
            aria-describedby="email-err"
            aria-invalid={emailErr || undefined}
            required
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (isEmail(e.target.value)) setEmailErr(false);
            }}
            onBlur={() => {
              if (!email) return;
              setEmailErr(!isEmail(email));
            }}
          />
        </div>
        <p
          className={`field__err${emailErr ? " is-shown" : ""}`}
          id="email-err"
          role="alert"
        >
          <svg className="i" aria-hidden="true">
            <use href="#i-alert" />
          </svg>
          <span>Enter the email address you signed up with.</span>
        </p>
      </div>

      <div className="field field--pw">
        <label htmlFor="password">Password</label>
        <div className="field__box">
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="At least 6 characters"
            aria-describedby="password-err"
            aria-invalid={passwordErr || undefined}
            required
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (e.target.value.length >= 6) setPasswordErr(false);
            }}
            onBlur={() => {
              setCapsLock(false);
              if (!password) return;
              setPasswordErr(password.length < 6);
            }}
            onKeyUp={(e) => {
              if (typeof e.getModifierState !== "function") return;
              setCapsLock(e.getModifierState("CapsLock"));
            }}
          />
          <button
            className="field__toggle"
            id="pw-toggle"
            type="button"
            aria-pressed={showPassword}
            aria-controls="password"
            aria-label={showPassword ? "Hide password" : "Show password"}
            onClick={() => setShowPassword((v) => !v)}
          >
            <svg
              className="i"
              aria-hidden="true"
              style={{ width: 15, height: 15, margin: "0 auto" }}
            >
              <use href={showPassword ? "#i-eye-off" : "#i-eye"} />
            </svg>
          </button>
        </div>
        <p
          className={`field__err${passwordErr ? " is-shown" : ""}`}
          id="password-err"
          role="alert"
        >
          <svg className="i" aria-hidden="true">
            <use href="#i-alert" />
          </svg>
          <span>Passwords are at least 6 characters.</span>
        </p>
        <p className="field__hint" hidden={!capsLock}>
          Caps Lock is on.
        </p>
      </div>

      <div className="auth__row">
        <label className="check">
          <input type="checkbox" name="remember" id="remember" /> Remember
          this device
        </label>
      </div>

      <button className="btn" type="submit" id="submit-btn" disabled={loading}>
        {loading ? (
          "Signing in…"
        ) : (
          <>
            Sign in{" "}
            <svg className="i i--arrow" aria-hidden="true">
              <use href="#i-arrow-ur" />
            </svg>
          </>
        )}
      </button>

      {error && (
        <p className="auth__status is-shown" id="auth-status" role="status">
          <svg className="i" aria-hidden="true">
            <use href="#i-alert" />
          </svg>
          <span>{error}</span>
        </p>
      )}
    </form>
  );
}
