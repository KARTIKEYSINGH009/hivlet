# Orbely pricing and billing suggestion

Status: PROPOSAL ONLY. Every price below is SUGGESTED, not an official Orbely price. Nothing here charges anyone. No billing account has been set up.

Date: 2026-11-02. Groq rates used: verified 2026-11-02, Groq official Supported Models page.

## 1. Pricing principle, tied to the USP

Sell the proof, cap the cost, do not sell unlimited AI.

- Headline: for agencies, Orbely turns AI work into a client-ready proof report you can bill for.
- The price must therefore include proof reports, not just seats and tasks.
- The cost cap is the India promise: cost preview before a run, a hard budget, provider cost shown separately. A customer should never get a surprise AI bill from Orbely.
- Rule for this proposal: no automatic overage billing. Overage only happens if a workspace leader raises the budget first. At 100% of budget, new provider runs stop, by default.

## 2. Suggested tiers

India and international prices are separate list prices, not FX conversions. Annual = 10 months paid for 12 months, i.e. 2 months free, as a proposal.

### Free Pilot (existing target, no card required)

- Price: ₹0 / $0.
- 1 workspace, up to 3 seats, 2 agents, 20 tasks per month.
- Provider cost allowance: $2 per workspace per month, hard stop at 100%.
- Proof reports for verified tasks only. Budgets and cost preview included.
- Support: community / email, best effort, no SLA.
- Purpose: prove a real run and a real proof report, before a customer pays. This is the tier the current free pilot should stay on until the live Groq retest passes.

### Starter Team (suggested)

- India: ₹999 per month, ₹9,990 per year.
- International: $15 per month, $150 per year.
- 1 workspace, up to 5 seats, 10 agents, 200 tasks per month.
- Provider cost allowance: $10 per workspace per month, hard stop at 100% unless the leader raises the budget.
- Includes: cost preview, budgets, proof reports, ROI sheet, case-study notes (unpublished by default), all current signed-in pages.
- Support: email support, 2 business day target response (proposal, not an SLA until a lawyer reviews it).

### Agency (suggested, the headline tier)

- India: ₹2,999 per month, ₹29,990 per year.
- International: $49 per month, $490 per year.
- Up to 5 workspaces, up to 20 seats total, 50 agents, 1,000 tasks per month across workspaces.
- Provider cost allowance: $50 per workspace per month, hard stop at 100% unless the leader raises the budget.
- Includes everything in Starter, plus: client-ready proof sheets per verified task, agency squad template, cross-human handoff trail, priority email support.
- This is the tier that matches the headline USP. Do not sell it as white-label, SSO, or custom SLA. Those are not built, and are not in this proposal.

### Enterprise / Custom (suggested, talk to us only)

- Price: custom, by quote only.
- No price is proposed here, because it would depend on workspaces, seats, support, and legal review. Do not quote a number for this tier until Kartikey decides it.

### What is NOT included in any tier

- No spend, publish, or send actions. The worker records output only.
- No email/phone invites sent by Orbely. Invite link / invite code only, until a provider is built.
- No guarantee of AI accuracy. Every output needs human verification, which is the product's own rule.
- No white-label, SSO, dedicated support SLA, or data-residency promise, unless built and lawyer-reviewed later.

## 3. Why these prices fit Groq costs (worked examples, Groq only)

Groq rates, per 1M tokens: gpt-oss-20b $0.075 input / $0.30 output; gpt-oss-120b $0.15 / $0.60; qwen/qwen3.8-27b $0.80 / $4.00. Cached tokens at input rate.

Example task, 10,000 input tokens + 3,000 output tokens:
- gpt-oss-20b: $0.00075 + $0.00090 = $0.00165 per task.
- gpt-oss-120b: $0.00150 + $0.00180 = $0.00330 per task.
- qwen 3.8-27b: $0.00800 + $0.01200 = $0.02000 per task.

That means a $10 Starter allowance covers, at gpt-oss-20b prices, roughly 6,000 such tasks on provider cost alone, and a $50 Agency allowance covers roughly 30,000. The real limit for Starter and Agency is therefore tasks and seats, not provider cost, at Groq's current small-model prices. That is intentional: it protects Orbely if a customer uses the larger or preview model heavily, while keeping the headline price simple.

If a customer uses only qwen 3.8-27b at the example size, $10 covers about 500 tasks and $50 covers about 2,500. That is why the allowance is shown in dollars of provider cost, not in a promise of unlimited tasks, and why the hard stop matters.

Other providers are placeholders in Orbely today. Do not apply these allowances to OpenAI, Anthropic, or Gemini until their real rates are verified and added. If a customer needs another provider, that is a custom quote, not a tier price.

## 4. Overage, as a proposal

- No overage charge is taken automatically.
- If a workspace hits 100% of its provider cost allowance, new provider runs stop.
- A leader can raise the budget for that workspace. Extra provider cost above the allowance is then billed at the next invoice at actual provider cost plus a 25% platform margin, as a proposal, shown separately on the invoice as provider cost + platform margin. This margin is a proposal for Kartikey to confirm, not a current charge.
- A leader can also buy a one-off top-up, as a proposal, only after billing is built. Do not promise top-ups until then.
- All overage must be visible in the usage page before it is billed, with the same placeholder-free Groq rates above.

## 5. Billing routes compared

### Razorpay (India, INR)

- What it is: Indian payment gateway and subscription billing, with cards, UPI AutoPay, and e-mandate (eNACH).
- Fees, from Razorpay's own pricing explanation page, checked 2026-11-02: standard domestic gateway pricing 2% plus GST, no setup fee, no annual maintenance charge. GST is 18% on the platform fee only, not on the full transaction value, so 2% becomes 2.36% all-in on the fee. Subscriptions add about 0.99% per transaction on top of the gateway fee, so a recurring domestic card charge is roughly 2.99% plus GST on fees. International cards are up to 3% in some Razorpay material. New-merchant zero-platform-fee offers exist with caps and dates, verify at signup, do not rely on them in pricing.
- Pros: UPI AutoPay, INR settlement, Indian customers can pay in rupees, familiar to Indian small teams and agencies, no setup fee.
- Cons: subscription fee stacks on the gateway fee, recurring billing is governed by RBI e-mandate rules (mandate registration, a per-transaction auto-debit limit, and pre-debit notice; secondary sources cite ₹15,000 as the auto-debit limit without re-authentication, verify with Razorpay and a lawyer before launch), international coverage is weaker than a global MoR.
- GST/tax: Orbely remains the seller, so Orbely must issue GST invoices, handle GSTIN, and handle its own tax filings. Confirm the GST rate, invoice format, and export rules with a CA. This pack does not state a GST rate for Orbely's own invoices as a verified fact.
- Webhooks/refunds: Razorpay webhooks must be signature-verified, deduped by event id, and refunded through Razorpay, with Orbely's own refund window (see file 05) applied on top. Test mode first, every time.

### Stripe (international, and India with limits)

- What it is: payment processor and subscription billing. With Stripe alone, Orbely remains the merchant of record and owns tax compliance.
- Fees, from Stripe's India pricing page, checked 2026-11-02: 2% for cards issued in India, 3% for cards issued outside India, 4.3% for international cards with USD or other currency presentment, plus 2% if currency conversion is required, dispute fee ₹1,000 per dispute. US headline rates (2.9% + $0.30) do NOT apply to an India account. Secondary sources also cite Stripe Billing at +0.7% on subscription volume; that figure is NOT confirmed from Stripe's India pricing page in this check, verify it on Stripe's Billing pricing before using it in a cost model.
- Pros: strong international card coverage, mature subscription and metered billing, good developer tooling.
- Cons: India onboarding has been invite-based / preview in secondary reporting, and international fees stack quickly for an India account. Tax is Orbely's job unless Stripe Tax (a paid add-on, calculates only) or Stripe Managed Payments (a separate MoR product) is used. Do not assume Stripe India signup is open; check it at the time of application.
- GST/tax: same as Razorpay, Orbely remains the seller unless a MoR product is used. Export documentation (e.g. FIRA/eBRC in secondary sources) is a CA question, not settled in this pack.
- Webhooks/refunds: Stripe webhooks must be signature-verified with the endpoint secret, deduped by event id, and refunds issued through Stripe, with Orbely's refund window applied on top.

### Merchant of record, Paddle / Lemon Squeezy style

- What it is: the MoR becomes the legal seller. The customer's receipt is from the MoR, the MoR collects and remits sales tax / VAT / GST where it is the seller, and Orbely receives a payout.
- Fees, from secondary comparisons only, checked 2026-11-02, not from a primary Paddle/Lemon Squeezy pricing page in this check: roughly 5% + $0.50 per transaction for both Paddle and Lemon Squeezy, with international and subscription surcharges varying by source (one source cites Lemon Squeezy +1.5% international, another cites Paddle as flat). Treat all MoR fee figures in this pack as unverified until checked on the vendor's own pricing page at contracting time.
- Pros: global tax handling without Orbely registering for VAT in many countries, single payout, chargeback handling by the MoR.
- Cons: higher headline fee than a domestic gateway, the MoR's name is on the receipt, less control over checkout and invoicing, and, for an India-incorporated seller, secondary sources warn about FIRC / FEMA documentation and GST zero-rating on exports when a foreign MoR is the seller. That warning is NOT legal advice and must be checked with a CA/lawyer before any MoR is chosen. Lemon Squeezy's move into Stripe Managed Payments, reported in secondary sources in October 2026, is another reason to verify the exact product and contract at the time of signing, not to rely on a 2026 comparison article.
- GST/tax: do not assume an MoR removes Orbely's Indian tax duties. Confirm with a CA whether, and how, MoR payouts are taxed and documented in India.
- Webhooks/refunds: MoR webhooks must still be signature-verified and deduped, and refunds follow the MoR's flow plus Orbely's refund window. Test mode first.

### Comparison table

| Route | Best for | Headline fee (checked) | Seller / tax owner | UPI / INR | Key risk |
|---|---|---|---|---|---|
| Razorpay | India-first, INR | 2% + GST on fee, +0.99% subscriptions | Orbely | Yes, UPI AutoPay | RBI mandate rules, stacked subscription fee |
| Stripe | International cards, mature billing | India: 2% domestic, 3% outside, 4.3% USD presentment +2% conversion, ₹1,000 dispute | Orbely (unless MoR product) | INR cards yes, UPI no in this check | Invite/preview onboarding in India, stacked international fees, tax is yours |
| MoR (Paddle / Lemon Squeezy style) | Global tax handling | ~5% + $0.50, secondary sources only, unverified here | MoR, as seller | Varies, verify | Higher fee, receipt is MoR's, India FIRC/FEMA/GST questions need CA/lawyer |

## 6. Recommendation

- Phase 1, India-first: Razorpay, INR, for Indian customers. It matches the first niche, price-sensitive Indian small teams and agencies, and it supports UPI AutoPay.
- Phase 2, international: add Stripe, or a merchant of record, only after a CA/lawyer confirms the tax and export documentation route for an India seller. Do not pick between Stripe and an MoR in this pack, because that choice depends on whether Orbely wants to own international tax or pay an MoR to own it, and on Stripe India onboarding at that time. That is a Kartikey decision, with CA/lawyer input.
- Do not launch paid billing on more than one route at once. Launch one route, test it end to end, then add the second.

## 7. Billing safety rules (must be built and tested before charging anyone)

1. No charge without a plan: a customer must pick a tier, see the price, allowance, hard-stop rule, and refund window, and confirm, before any charge.
2. Idempotency: every checkout and every subscription change uses an idempotency key, for example subscription id + billing period, so a retry cannot double-charge.
3. Webhook signatures: verify every webhook signature with the provider's secret, before acting on it. Never trust a webhook by URL or payload alone.
4. Dedupe: store the provider event id, ignore a repeat event id, and never apply the same payment twice.
5. Past-due as grace, not instant lockout (proposal): on a failed renewal, give 7 days grace with full access, then downgrade to Free Pilot, not deletion. Keep workspace data for at least 30 days after downgrade, as a proposal, then follow the deletion rule in the Privacy Policy draft.
6. Invoices: every charge gets an invoice, downloadable in the app, with plan, period, provider cost allowance used, overage shown separately, taxes shown separately, and GST details where applicable. Confirm invoice format with a CA.
7. Refunds and cancellation: see file 05. The refund window is a proposal, not a promise, until Kartikey and a lawyer confirm it.
8. No billing test in production with real cards until test mode passes: checkout, first charge, renewal, failed payment, grace, downgrade, upgrade, cancellation, refund, and webhook replay, all tested, with no double charge in any replay.
9. Secrets: payment provider keys and webhook secrets are server-side only, never in code, never in chat, never in a client bundle. The same rule already applies to GROQ_API_KEY, WORKER_SECRET, and SUPABASE_SERVICE_ROLE_KEY.
10. Pricing changes: never change a customer's price mid-cycle without notice. Announce a price change at least 30 days before it takes effect, as a proposal, and let the customer cancel before the new price starts.

## 8. What this suggestion does not decide

- Kartikey must confirm the tier prices, the 25% overage margin, the 7-day grace, the 30-day data retention after downgrade, and the annual discount.
- A CA must confirm GST, invoice format, export documentation, and whether an MoR route works for an India seller.
- A lawyer must confirm the refund window, jurisdiction, and all legal drafts in this folder.
- No price in this file is official until Kartikey says it is, and no price should be put on the live pricing page until then. The live pricing page today correctly ends "Early access · Pricing is not set yet."

## Sources

- Razorpay, Payment Gateway Pricing and Fees Explained, razorpay.com/blog/razorpay-payment-gateway-pricing-explained/ (official, checked 2026-11-02): 2% domestic plus GST, no setup or annual fee, subscriptions +0.99%, GST 18% on the fee only.
- Stripe, Pricing and Fees, India, stripe.com/in/pricing (official, checked 2026-11-02): 2% India cards, 3% outside India, 4.3% USD presentment, +2% conversion, ₹1,000 dispute fee.
- Secondary comparisons for MoR and for Stripe Billing +0.7%, and for RBI e-mandate limits: codingcapybaras.com, webversearena.com, artisangrowthstrategies.com, devtoolpicks.com, editorialge.com, rebounce.dev. These are secondary sources, not vendor contracts, and every figure taken from them is marked as such above.
- Groq official Supported Models page, console.groq.com/docs/models, rates as listed in 00-readme.md, fetched 2026-11-02 by the free-pilot build. This pack reuses those rates and does not re-verify them here.
