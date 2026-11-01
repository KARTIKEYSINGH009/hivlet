// Phase 6 pricing display only. No charge, no tier is created here.
// FX is a PLACEHOLDER, editable in one place, labelled everywhere it
// is shown. Replace it with a real, dated rate before quoting rupees
// to a customer. Pricing itself is NOT set: the shape below is the
// recommendation for Kartikey to decide, not a price list.
export const PLACEHOLDER_INR_PER_USD = 83;
export const PRICING_SHAPE = "Recommended shape, not set: subscription per workspace plus per seat, token budget included, provider cost shown separately from the Hivlet fee, no hidden token markup. Free pilot for one team only, time boxed.";
export function usdToInrPlaceholder(usd: number): number { return usd * PLACEHOLDER_INR_PER_USD; }
export function formatInrPlaceholder(usd: number): string { return `Rs ${usdToInrPlaceholder(usd).toFixed(2)} (placeholder FX)`; }
