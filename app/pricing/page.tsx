import Link from "next/link";
import { PLAN_LIMITS, PLAN_PRICES, TOPUP_PRICE } from "@/lib/billing";

// DRAFT pricing page. Billing is NOT live: no payment is taken, no
// checkout works, and no tier can be bought from this page. The prices
// below are Gemini's draft proposal (2026-11-22), not set prices —
// Kartikey has not confirmed them. In particular the rupee figures
// are a proposal only: lib/pricing.ts records INR pricing as UNDECIDED.
// Do not present this page as a live price list.
const TIERS = [
  {
    tier: "free" as const,
    name: "Free",
    tagline: "Try Orbely with one workspace.",
    usd: PLAN_PRICES.free.usdPerMonth,
    inr: PLAN_PRICES.free.inrPerMonth,
    features: [
      `${PLAN_LIMITS.free.monthlyRuns} verified runs / month`,
      `${PLAN_LIMITS.free.workspaces} workspace`,
      `Leader only (${PLAN_LIMITS.free.maxMembers} member)`,
      "Approval-gated runs, human review first",
    ],
  },
  {
    tier: "pro" as const,
    name: "Pro",
    tagline: "For a solo founder or a small team.",
    usd: PLAN_PRICES.pro.usdPerMonth,
    inr: PLAN_PRICES.pro.inrPerMonth,
    features: [
      `${PLAN_LIMITS.pro.monthlyRuns.toLocaleString()} verified runs / month`,
      `${PLAN_LIMITS.pro.workspaces} workspace (more later)`,
      `Up to ${PLAN_LIMITS.pro.maxMembers} members`,
      "Top-ups when you run out",
    ],
  },
  {
    tier: "team" as const,
    name: "Team",
    tagline: "For multi-agent operations.",
    usd: PLAN_PRICES.team.usdPerMonth,
    inr: PLAN_PRICES.team.inrPerMonth,
    features: [
      `${PLAN_LIMITS.team.monthlyRuns.toLocaleString()} verified runs / month`,
      `Up to ${PLAN_LIMITS.team.workspaces} workspaces`,
      `Up to ${PLAN_LIMITS.team.maxMembers} members`,
      "Top-ups when you run out",
    ],
  },
];

export default function PricingPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <p className="rounded-lg border border-gold/40 bg-coal px-4 py-3 text-sm font-medium text-gold-soft">
        DRAFT, NOT LIVE. Billing is not switched on yet: no payment is
        taken, no checkout works, and these prices are a proposal, not
        set prices. Do not rely on this page as a price list.
      </p>
      <h1 className="mt-8 font-display text-3xl font-bold text-ivory">
        Pricing
      </h1>
      <p className="mt-4 text-muted">
        Orbely charges per workspace, not per seat: one leader can run
        several agents while members review approvals, without paying
        per human. A verified run is counted only when an agent run
        completes; failed runs never count, and runs served from the
        dedup cache cost nothing and do not count either.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {TIERS.map((t) => (
          <section
            key={t.tier}
            className="rounded-xl border border-white/10 bg-coal p-5"
          >
            <h2 className="font-display text-xl font-bold text-ivory">
              {t.name}
            </h2>
            <p className="mt-1 text-sm text-muted">{t.tagline}</p>
            <p className="mt-4 text-2xl font-bold text-ivory">
              {t.usd === 0 ? "$0" : `$${t.usd}`}
              <span className="text-sm font-normal text-muted"> / month</span>
            </p>
            <p className="mt-1 text-sm text-muted">
              {t.inr === 0
                ? "₹0 / month"
                : `₹${t.inr?.toLocaleString("en-IN")} / month (draft)`}
            </p>
            <ul className="mt-4 space-y-2 text-sm text-muted">
              {t.features.map((f) => (
                <li key={f}>· {f}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <section className="mt-8 rounded-xl border border-white/10 bg-coal p-5">
        <h2 className="font-display text-xl font-bold text-ivory">
          Top-ups
        </h2>
        <p className="mt-2 text-sm text-muted">
          Need more runs in a month? ${TOPUP_PRICE.usdPer1000Runs} (draft
          ₹{TOPUP_PRICE.inrPer1000Runs}) per 1,000 extra verified runs.
          Top-ups are spent only after the monthly allowance runs out.
        </p>
        <p className="mt-2 text-sm text-muted">
          Yearly billing is proposed at ${PLAN_PRICES.pro.yearlyUsdPerMonth}{" "}
          / month for Pro and ${PLAN_PRICES.team.yearlyUsdPerMonth} / month
          for Team (draft ₹{PLAN_PRICES.pro.yearlyInrPerMonth} and ₹
          {PLAN_PRICES.team.yearlyInrPerMonth?.toLocaleString("en-IN")}).
        </p>
      </section>

      <p className="mt-8 text-sm text-muted">
        Orbely is in early access and free today. When billing goes
        live, the price, billing period, and tax treatment will be
        stated before any charge is taken, and the{" "}
        <Link
          href="/legal/terms"
          className="font-medium text-gold-soft hover:underline"
        >
          Terms
        </Link>{" "}
        and{" "}
        <Link
          href="/legal/refunds"
          className="font-medium text-gold-soft hover:underline"
        >
          Refund and Cancellation Policy
        </Link>{" "}
        will be replaced with final versions first.
      </p>
    </main>
  );
}
