// Phase 6 pricing display only. No charge, no tier is created here.
// Pricing itself is NOT set: the shape below is the recommendation
// for Kartikey to decide, not a price list. INR pricing is UNDECIDED:
// there is deliberately no FX rate and no rupee figure in this file,
// so no page can present a rupee amount as a price. USD cost estimates
// use the rates in lib/cost.ts. Do not add an FX rate here until
// Kartikey decides INR pricing with a real, dated rate.
export const PRICING_SHAPE = "Recommended shape, not set: subscription per workspace plus per seat, token budget included, provider cost shown separately from the Hivlet fee, no hidden token markup. Free pilot for one team only, time boxed.";
export const INR_PRICING_STATUS = "Undecided: no INR price is set. Do not quote rupees to a customer yet.";
