# Privacy Policy (Draft)

DRAFT - NOT LEGAL ADVICE - LAWYER REVIEW REQUIRED

This draft is not final and must not be published as a final privacy policy until a lawyer reviews it, including under India's Digital Personal Data Protection Act, 2023 and the DPDP Rules, 2025. Every bracketed item needs a Kartikey decision or a lawyer confirmation.

## 1. Who is responsible

- Data Fiduciary (proposal, needs lawyer confirmation): [COMPANY NAME - NEEDS KARTIKEY DECISION], [CONTACT EMAIL - NEEDS KARTIKEY DECISION].
- Grievance contact: [GRIEVANCE OFFICER NAME AND CONTACT - NEEDS KARTIKEY DECISION]. See 08-india-compliance-checklist.md for the grievance timelines a lawyer must confirm.
- This policy covers hivlet.vercel.app and the Orbely service. It does not cover a customer's own clients, or a third-party site a customer links to.

## 2. What data Orbely collects, and why

Orbely collects only what it needs to run a virtual office for AI agents. The current build, as a factual note, stores:

- Account data: email and authentication data, via Supabase Auth, to sign a user in.
- Workspace data: workspace names and descriptions, memberships and roles (leader/member), invite codes.
- Work data: agents (name, role, provider, model, instructions), tasks (title, description, status, assignee, priority, due date), approvals (agent, task, action type, payload, reason, decision), executions (input, output, status, token counts, provider, model, cost estimate), reports, activity, budgets, proof and case-study notes.
- Billing data, only when paid plans are built: plan, billing period, invoice data, and payment provider references. Orbely does not store full card numbers. Payment details go to the payment provider, not to Orbely's database, as a design rule to be confirmed when billing is built.
- Technical data: limited logs needed for security, debugging, and abuse prevention, for example request logs from Vercel and Supabase. Exact log retention needs a lawyer and product decision.

Orbely does NOT collect, by design today:
- Phone numbers or email addresses for invites, because email/phone invites are UI only and no provider is built.
- Profile names or photos, because there is no profiles table. Boss view shows Leader/Member plus first 8 chars of user id.
- Provider API keys as plaintext. Agent credentials store a key reference only. GROQ_API_KEY, WORKER_SECRET, and SUPABASE_SERVICE_ROLE_KEY are server-side only.

Purposes, as a proposal: to provide the service, to run approved agent executions, to show usage and cost, to enforce budgets and approvals, to keep audit logs, to support the customer, to prevent abuse, and to meet legal duties. No purpose beyond these should be added without a lawyer review and a policy update.

## 3. What is sent to AI providers

- When an agent runs, Orbely sends the approved task prompt and relevant workspace context to the AI provider chosen for that agent, for example Groq, to produce output.
- That means task text, agent instructions, and any content a customer puts in a task may leave Orbely and be processed by that provider, under that provider's terms.
- Groq's data retention, training use, and zero-retention terms are UNVERIFIED in this pack. Do not claim Groq does not train on prompts, or that prompts are deleted, until Groq's current terms are checked and a lawyer confirms what can be promised. The same applies to any other provider added later.
- The customer must not put highly sensitive personal data, secrets, or client-confidential material into a task unless it has checked the provider's terms and its own duties to its clients. Human verification is required before any output is used or shared.

## 4. Lawful basis, consent, and notice

- Proposal, needs lawyer confirmation: Orbely processes personal data to perform the service a customer asked for, with consent where required, and for legitimate interests in security and abuse prevention, as a lawyer confirms under DPDP.
- A clear, plain-language notice must be shown at signup and at data collection, listing what data is collected, why, how long it is kept, how to exercise rights, and how to complain. That notice is a separate product and legal task, not satisfied by this draft alone.
- Consent withdrawal: a user may withdraw consent for processing that depends on consent, subject to the service consequences a lawyer confirms. Withdrawing consent does not erase data Orbely must keep for tax, legal, or fraud reasons, for a period a lawyer confirms.
- Children's data: Orbely is not aimed at children, and a customer must not use it to process children's personal data without a lawyer confirming the DPDP children's-data rules first. Mark this as needs lawyer confirmation, do not assume it is covered.

## 5. Sharing

Orbely shares personal data only with:
- The AI provider chosen for an agent, for that run only, as in section 3.
- Hosting and database providers, currently Vercel (hosting) and Supabase (database and auth), to run the service.
- A payment provider, only when paid plans are built, to process payment.
- Authorities, where required by law, or to protect safety, after a lawyer review of the request where practicable.
- No sale of personal data. No sharing for third-party advertising, as a proposal, subject to lawyer confirmation.

## 6. Security

- Service-role key, worker secret, and provider keys are server-side only, never in code, never in a client bundle, never in chat.
- Access is workspace-scoped. A member sees only workspaces they belong to, subject to the access rules in code.
- Audit logs are append-only by design.
- Security safeguards, encryption in transit and at rest, access controls, and incident handling are described in 07-security-data-handling-note.md, and need a lawyer and security review before any promise is published. This draft does not promise a specific security standard, certification, or breach-free service.

## 7. Retention and deletion

- Proposal, needs lawyer confirmation: workspace and work data are kept while the workspace exists and the account is active, plus a retention period after closure for tax, legal, or fraud reasons, to be confirmed by a lawyer.
- On a deletion request, Orbely will delete or anonymise personal data that is no longer needed, except for records it must keep, and except for data in backups, which will be deleted on the backup cycle, as a lawyer confirms.
- Deletion request route: [CONTACT EMAIL / IN-APP ROUTE - NEEDS KARTIKEY DECISION AND PRODUCT BUILD]. Do not publish a deletion route until it is built and tested.
- Past-due downgrade retention is proposed as at least 30 days in the Terms draft. That figure needs lawyer confirmation and must match this policy before publication.

## 8. Rights of data principals

Under DPDP, as a checklist for a lawyer to confirm, not as legal advice in this draft, data principals may have rights to: access a summary of their personal data and processing, correction, completion, updating, erasure, grievance redressal, and nomination of another person to exercise rights on death or incapacity. Response periods, and whether a 90-day maximum applies, are marked unverified in 08-india-compliance-checklist.md and must be confirmed by a lawyer, because secondary sources differ on the exact period and on which rules are in force when.

How to exercise a right: [CONTACT EMAIL AND FORM - NEEDS KARTIKEY DECISION AND PRODUCT BUILD]. A request will be acknowledged, verified for identity and workspace membership, and answered within the period a lawyer confirms. A user who is not satisfied may complain to the grievance contact, and then to the Data Protection Board of India, subject to the DPDP process a lawyer confirms.

## 9. Breach notice

- Proposal, needs lawyer confirmation: on becoming aware of a personal data breach, Orbely will notify affected users without delay, with the nature, extent, timing, likely impact, and mitigation steps, and will notify the Data Protection Board of India, with an initial notice without delay and a detailed report within 72 hours, as secondary sources describe DPDP Rule 7. The exact recipients, thresholds, and timelines must be confirmed by a lawyer, because secondary sources differ on whether every breach must be reported and on the Board's detailed-report contents.
- Do not publish a breach timeline in a final policy until a lawyer confirms it.

## 10. International transfers

- Orbely is hosted on Vercel and Supabase, and AI runs go to the provider chosen for an agent, which may be outside India. Transfer safeguards, and whether a specific transfer mechanism is needed, need lawyer confirmation. Do not promise data residency in India, or any other country, in this draft.

## 11. Changes

- Material changes to this policy will be notified, as a proposal, at least 30 days before they take effect, subject to lawyer confirmation. The policy version and date must be shown on publication.

## Status

- Draft: all clauses.
- Needs lawyer confirmation: lawful basis, notice, children's data, retention, deletion, rights periods, breach notice, transfers, and every security promise.
- Needs Kartikey decision: company name, contact email, grievance officer, deletion route, retention periods.
- Unverified: Groq and other providers' retention and training terms, log retention, and DPDP response periods. See 08-india-compliance-checklist.md.
