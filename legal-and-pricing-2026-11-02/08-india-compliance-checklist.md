# India Compliance Checklist

Status: CHECKLIST ONLY. Not legal advice. Every item is marked: draft, needs lawyer confirmation, or needs Kartikey decision. Where a fact could not be verified from a primary source, it is marked unverified. A lawyer must confirm applicability, timelines, and enforcement status before any item is published as compliant.

## A. DPDP Act, 2023 and DPDP Rules, 2025

Sources checked 2026-11-02, secondary unless stated: graylog.org DPDP explainer, matters.ai DPDP guide, dpdprules.org DPDP vs GDPR checker, whizzc.com DPDP guide, and an Indian-law plugin DPDP rules file on GitHub. The official sources to confirm against are MeitY and India Code, as cited in those sources. This checklist does not replace them.

| # | Item | Status | Notes |
|---|---|---|---|
| A1 | Lawful purpose and purpose limitation: collect and use personal data only for a stated, lawful purpose, and not beyond it | Draft, needs lawyer confirmation | Purposes are listed in 02-privacy-policy-draft.md, section 2. A lawyer must confirm they are lawful and complete. |
| A2 | Consent and notice: clear, plain-language notice before or at collection, listing data, purposes, goods/services, rights, withdrawal, and complaint route | Draft, needs lawyer confirmation, needs product build | A signup and collection notice is not built yet. A lawyer must confirm its contents and language requirements. Secondary sources cite DPDP Rules Rule 3 for a standalone notice. Verify against the Rules text. |
| A3 | Data minimisation: collect only what is needed for the purpose | Draft, needs lawyer confirmation | Current build collects account, workspace, work, and usage data only, by design. A lawyer must confirm no field is excessive. |
| A4 | Accuracy: keep personal data accurate, complete, and up to date, and correct it on request | Draft, needs lawyer confirmation | Correction route is not built yet. See A8. |
| A5 | Security safeguards: reasonable security safeguards to prevent a breach | Draft, needs lawyer confirmation | See 07-security-data-handling-note.md. No security standard is claimed. |
| A6 | Breach notice: notify affected data principals without delay, and notify the Data Protection Board of India, with an initial notice without delay and a detailed report within 72 hours | Needs lawyer confirmation, timeline partly verified from secondary sources | Secondary sources describe DPDP Rules Rule 7 this way, and say every breach must be reported, with no risk threshold in the rule text. Other secondary sources give different penalty figures for failure to notify (₹50 crore vs ₹200 crore in different sources). Do not publish a penalty figure or a timeline until a lawyer confirms it from the Act and Rules. |
| A7 | Retention and erasure: keep data only as long as needed, delete on withdrawal or when the purpose is fulfilled, except where law requires retention | Draft, needs lawyer confirmation, needs Kartikey decision on periods | Retention periods are proposals in the Privacy and Terms drafts, not confirmed periods. |
| A8 | Data principal rights: access to a summary of data and processing, correction, completion, updating, erasure, grievance redressal, nomination on death or incapacity | Draft, needs lawyer confirmation, needs product build | Secondary sources cite a 90-day maximum response period, but one source notes the 90-day wording in Rule 14(3) is unclear on its face about what it caps. Mark the response period as UNVERIFIED. Do not publish 90 days as a promise until a lawyer confirms it. |
| A9 | Grievance redressal: readily available grievance mechanism, with a published contact, and a response within the prescribed period | Draft, needs lawyer confirmation, needs Kartikey decision on officer and contact | Grievance officer name and contact are blank in all drafts. Do not publish a name until it is decided and the inbox is monitored. |
| A10 | Children's data: no tracking, behavioural monitoring, or targeted advertising at children, and verifiable parental consent where required | Needs lawyer confirmation, do not assume coverage | Orbely is not aimed at children, but a lawyer must confirm the children's-data rules before any use involving children's data. |
| A11 | Significant Data Fiduciary duties, including a Data Protection Officer in India, if Orbely is ever classified as one | Needs lawyer confirmation, applicability unverified | Do not assume Orbely is or is not a Significant Data Fiduciary. A lawyer must assess volume, sensitivity, and risk. |
| A12 | Enforcement timeline: secondary sources say DPDP Rules 2025 were notified 13 November 2025, with full substantive obligations by 13 May 2027, and penalties up to ₹250 crore per violation | Unverified, needs lawyer confirmation | Secondary sources differ on dates, phases, and penalty figures. Verify the current enforcement schedule at MeitY before citing any date or penalty in a customer document. |

## B. IT Rules, 2021 (Intermediary Guidelines and Digital Media Ethics Code)

Sources checked 2026-11-02: IT Rules text on indiankanoon.org, and Legal 500 and other explainers. The key grievance figures below are from the Rules text as quoted in those sources, but applicability to Orbely is a lawyer question.

| # | Item | Status | Notes |
|---|---|---|---|
| B1 | Grievance officer: publish the officer's name and contact details, and the complaint mechanism, on the website or app | Needs lawyer confirmation on applicability, needs Kartikey decision on officer | If Orbely is an intermediary under the IT Act, this applies. If it is a pure SaaS provider and not an intermediary, the position differs. Do not assume either. A lawyer must decide. |
| B2 | Grievance acknowledgement within 24 hours, resolution within 15 days, as quoted in Rule 3(2) explainers | Needs lawyer confirmation on applicability, timeline as quoted in secondary sources | The 24-hour / 15-day figures are well cited in explainers of the IT Rules, but they are intermediary grievance figures, not DPDP figures. Do not mix them with the DPDP grievance period in section A. A lawyer must confirm which regime, if either, governs a given complaint. |
| B3 | Due diligence: inform users of rules, privacy policy, and user agreement, and make reasonable efforts to prevent unlawful content | Draft, needs lawyer confirmation | The Terms, Privacy, and Acceptable Use drafts in this folder are the starting point, not a finished due-diligence package. |
| B4 | Takedown on court order or government notification, and other intermediary duties, including CERT-In incident reporting where applicable | Needs lawyer confirmation on applicability | Do not promise a takedown timeline in a final policy until a lawyer confirms which duties apply to Orbely. |
| B5 | Grievance Appellate Committee appeal, within 30 days, as cited in explainers | Needs lawyer confirmation on applicability | Cited in secondary explainers for intermediary grievances. Verify with a lawyer before promising an appeal route. |

## C. Company, tax, and payment items

| # | Item | Status | Notes |
|---|---|---|---|
| C1 | Company name, registered address, and contact email, for all legal pages and invoices | Needs Kartikey decision | Blank in all drafts. Nothing can be published until these are decided. |
| C2 | GST: GSTIN, invoice format (CGST/SGST vs IGST), GST on Orbely's own invoices, and export treatment | Needs CA confirmation, rate unverified here | This pack does not state a GST rate for Orbely's own invoices as a verified fact. Razorpay's 18% GST on its own platform fee, cited in the pricing file, is not Orbely's GST rate. Confirm with a CA. |
| C3 | Razorpay KYC and account activation, including business documents and bank details | Needs Kartikey decision and Razorpay signup | No Razorpay account has been set up in this work. Do not start KYC until Kartikey picks Razorpay as phase 1. |
| C4 | Stripe India onboarding, if Stripe is chosen for phase 2 | Needs Kartikey decision, onboarding unverified | Secondary sources report Stripe India as invite-based / preview. Check at application time, do not assume signup is open. |
| C5 | Merchant-of-record route, if chosen for phase 2: FIRC, FEMA, GST zero-rating on exports, and receipt naming | Needs CA and lawyer confirmation, secondary warning only | Secondary sources warn that a foreign MoR can complicate FIRC and GST zero-rating for an India seller. That is a warning to check, not a conclusion. |
| C6 | RBI e-mandate rules for recurring payments: mandate registration, pre-debit notice, auto-debit limit | Needs lawyer and Razorpay confirmation, limit unverified here | Secondary sources cite ₹15,000 as the auto-debit limit without re-authentication. Verify with Razorpay and a lawyer before launch. |
| C7 | Agency and client proof reports: who owns AI output, who is liable for billing a client, what a proof report does and does not guarantee | Needs lawyer confirmation, needs Kartikey decision on wording | See Terms draft, sections 2 and 4. An agency must not be promised that a proof report guarantees payment from its client. |
| C8 | AI accuracy disclaimer: no guarantee of accuracy, human verification required | Draft, needs lawyer confirmation | In Terms, Privacy, and Acceptable Use drafts. A lawyer must confirm the disclaimer is sufficient and not misleading. |
| C9 | Jurisdiction, governing law, and dispute route | Needs Kartikey decision and lawyer confirmation | Proposed as laws of India in the Terms draft, with court/city blank. Do not publish a city until decided. |
| C10 | Grievance officer (DPDP and IT Rules, if applicable), support contact, and incident contact, all monitored inboxes | Needs Kartikey decision | One person may or may not fill all three roles. A lawyer must confirm whether the same person can, and whether a separate officer is needed. |

## D. Pre-publication gate (all must be yes before legal pages go live)

- [ ] Kartikey has filled in company name, address, contact email, grievance officer, jurisdiction, prices, refund window, grace and retention periods.
- [ ] A lawyer has reviewed every draft in this folder and signed off the final versions, or listed the changes needed.
- [ ] A CA has confirmed GST, invoice format, and the payment route's tax and export documentation.
- [ ] Billing has passed test-mode end-to-end testing, with no double charge on webhook replay.
- [ ] The live cookie list, the provider retention terms, and the DPDP response period have been verified from primary sources, not secondary articles.
- [ ] The final legal pages are published with a version and date, and the DRAFT banners are removed only then.

## Sources

- DPDP: graylog.org/post/indias-data-protection-law-the-digital-personal-data-protection-act/ ; matters.ai/compliance/dpdp/dpdp-act-2023 ; dpdprules.org/tools/dpdp-vs-gdpr ; whizzc.com/blog/india-s-dpdp-act-rules-2025-the-complete-business-compliance-guide ; github.com/kousthubha-sky/indian-law-plugin (DPDP rules file). All secondary, checked 2026-11-02. Official sources to confirm against: MeitY and India Code.
- IT Rules: indiankanoon.org/doc/111130067/ (Rules text) ; legal500.com IT Rules highlights. Checked 2026-11-02. Applicability to Orbely is unverified and needs a lawyer.
- Billing sources: see pricing-billing-suggestion.md, section 8.
