# Orbely legal and pricing pack, 2026-11-02

Status: SUGGESTION AND DRAFT PACK ONLY. Local only. No push, no deploy, no live site change, no billing setup, no charges, no lawyer contacted.

This pack does NOT make Orbely production-ready on its own. It is the proposal Kartikey asked for on 2026-11-02, so he can decide pricing, billing route, and legal next steps.

## Files in this folder

| File | Status |
|---|---|
| pricing-billing-suggestion.md | Proposal only. Prices are SUGGESTED, not official Orbely prices. |
| 01-terms-of-service-draft.md | DRAFT, needs lawyer review |
| 02-privacy-policy-draft.md | DRAFT, needs lawyer review |
| 03-acceptable-use-policy-draft.md | DRAFT, needs lawyer review |
| 04-data-processing-addendum-outline.md | DRAFT outline, needs lawyer review |
| 05-refund-cancellation-policy-draft.md | DRAFT, refund window is a proposal |
| 06-cookie-policy-draft.md | DRAFT, needs lawyer review |
| 07-security-data-handling-note.md | Factual note about the current build, plus checks still open |
| 08-india-compliance-checklist.md | Checklist, every item marked draft / needs lawyer confirmation / needs Kartikey decision |

## Product facts this pack is built on

- Orbely: virtual office for AI agents. Headline USP: for agencies, Orbely turns AI work into a client-ready proof report you can bill for. Support: each teammate brings their own agent, agents hand work to the next teammate's agent. Support: cost-capped team office for India, cost preview before a run, hard budget per task, provider cost shown separately. Verify/approve is table stakes, never the headline.
- Worker records output only. It does not spend, publish, or send.
- Email/phone invites are UI only. Link/invite code only, no provider yet.
- Boss view shows Leader/Member plus first 8 chars of user id. No profiles table yet.
- Live Groq run is still blocked on WORKER_SECRET and SUPABASE_SERVICE_ROLE_KEY, not yet set in Vercel Production.
- Verified Groq rates, 2026-11-02, from Groq's official Supported Models page: gpt-oss-20b $0.075 input / $0.30 output, gpt-oss-120b $0.15 / $0.60, qwen/qwen3.8-27b $0.80 / $4.00, all per 1M tokens. Cached tokens priced at input rate in Orbely, because Groq's table lists input/output only. Qwen 3.8-27b is marked preview / evaluation only and may be discontinued at short notice.
- Other providers (OpenAI, Anthropic, Gemini) are still placeholders in Orbely. No price for them is quoted in this pack.
- Pricing page today is USD only. INR is undecided, no FX figure is used in this pack as a conversion. India and international prices below are separate list prices, not FX conversions of each other.

## What must happen before any paid charge

1. Kartikey picks the tiers, prices, billing provider, refund window, jurisdiction, and grievance officer.
2. A lawyer reviews every draft in this folder, and a CA/tax adviser confirms GST, invoicing, and payment KYC.
3. Billing is built and tested end to end in test mode first: checkout, webhook, invoice, upgrade, downgrade, cancellation, past-due grace, refund, and no double charge.
4. The live Groq run is verified, and the shared-queue fix is live (it is, in code, as of the free-pilot build).
5. Only then publish legal pages, and publish them as reviewed versions, not as these drafts.

## Sources checked 2026-11-02

Full source list and what is verified vs unverified is in pricing-billing-suggestion.md and 08-india-compliance-checklist.md. Where a fact could not be verified from a primary source, it is marked unverified in those files.
