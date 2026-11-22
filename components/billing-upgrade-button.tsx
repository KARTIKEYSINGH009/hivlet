"use client";

import { useState } from "react";

// Upgrade button for the workspace Billing section. POSTs to the
// checkout route and redirects to the Lemon Squeezy hosted checkout.
// Billing is DRAFT: until the Lemon Squeezy env vars are set the
// route returns 503 and this button shows that billing is not
// configured yet. No payment is taken from this button itself.
export default function BillingUpgradeButton({
  workspaceId,
  tier,
  label,
}: {
  workspaceId: string;
  tier: "pro" | "team";
  label: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startCheckout() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId, tier }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setError(data.error ?? "Could not start checkout.");
        setBusy(false);
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Could not start checkout.");
      setBusy(false);
    }
  }

  return (
    <span>
      <button
        type="button"
        onClick={startCheckout}
        disabled={busy}
        className="rounded-lg bg-gold px-4 py-2 text-sm font-medium text-ink hover:bg-gold-soft disabled:opacity-60"
      >
        {busy ? "Starting checkout…" : label}
      </button>
      {error && (
        <span className="ml-3 text-xs text-[#d98c8c]">{error}</span>
      )}
    </span>
  );
}
