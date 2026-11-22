# Orbely Build List: Token Savings + Growth, in Phases
Local only, updated 2026-11-01 21:51 IST at Kartikey's instruction: divide everything into phases and start now.
Not pushed to GitHub, not deployed to Vercel. No live site change in this update.

## USP, all 3 kept, in hierarchy, not as 3 equal headlines
- HEADLINE USP, the reason to pay: For agencies, Orbely turns AI work into a client ready proof report you can bill for.
- SUPPORTING PROMISE 1, how it works: Each teammate brings their own agent, and agents hand work to the next teammate's agent across humans, not just inside one user's crew of bots.
- SUPPORTING PROMISE 2, why it stays affordable: Cost preview before a run, hard budget per task, provider cost shown separately, aimed first at price sensitive Indian small teams and agencies.
- COMBINED ONE LINER, only if one line is needed: For agencies, Orbely is where each teammate's agent hands work to the next, and every verified task comes with client ready proof and a capped cost.
- NOT A USP: work together, verify, approve. Competitors already claim governance, audit trails, and human in the loop approval, so that language stays as a feature description only, never as the headline.

## Status key
- DONE LOCALLY, NOT LIVE VERIFIED: built in the 2026-11-01 local run, see LOCAL_BUILD_NOTES.md. Still needs live Supabase, live execution, and his yes before push or deploy.
- IN PROGRESS: started 2026-11-01 21:51 IST, local only, by a build subagent under Pip rules. Not finished, not pushed, not deployed.
- QUEUED: scoped and ready, starts only when the previous phase passes its acceptance check, so phases do not collide in the same code.
- DECISION NEEDED: Kartikey decides, team advises.

## Phase 0: Foundation, already done locally
Status: DONE LOCALLY, NOT LIVE VERIFIED
- Task board todo, in progress, in review, done, failed. Approval queue, leader only approve and reject. Daily reports with one tap human verification.
- Execution engine foundation, local only: durable queue, atomic claim, stale claim recovery, OpenAI, Anthropic, Gemini adapters, worker endpoint guarded by WORKER_SECRET, approval enqueue with approved payload only, idempotent. Tasks move to in_review after a run, never straight to done. Worker records output only, does not spend, publish, or send.
- Handoff creation UI, accept and reject from pending, task reassignment, task events logged.
- Usage page, tokens only, per agent and per workspace, prompt plus completion plus total. Demo executions counted separately, no token counts, so they never inflate real usage. No prices, no costs, no charges.
- Squad templates Launch, Product, and Content. Agent pause, paused agents excluded from new task assignment.
- Realtime activity feed on task events, handoffs, reports, and approvals, with manual refresh fallback.
- Docs, changelog (unreleased, local only), legal drafts with DRAFT banners, email and phone invite UI only (buttons send nothing, no provider claimed), guided onboarding page checking real agents, tasks, and reports.
- Acceptance check for Phase 0: local build passes, no secrets in code, no push, no deploy. That check was passed in the 2026-11-01 local run. Live verification is still separate and still blocked on his Supabase login and keys.

## Phase 1: Prove cost first, STARTED NOW
Status: IN PROGRESS, local only, started 2026-11-01 21:51 IST
Owner: Pip build, Boba cost logic check
1. Cost dashboard, prices on top of the existing token usage page. Per workspace, per agent, per task, per model: input tokens, output tokens, total tokens, provider cost, cost per completed task. Cache hit rate shown separately, never blended into a single savings number.
2. Cost preview before a big run, plus a naive baseline for comparison. Show estimated tokens and cost if the same task ran with full history and the largest model, next to the optimised estimate. Label estimates as estimates, show actuals after the run.
3. Token and cost logging for every real execution, including model name and latency, tagged by workspace, agent, task, and feature. Demo runs stay excluded.
4. Configurable provider rates, editable in one place, with placeholder rates clearly marked until the provider pick is made. No fake official price is presented as a provider price.
- Acceptance check: local build passes, usage page shows tokens and cost for real runs only, demo runs show no cost, no secrets, no charges, no push, no deploy.
- DECISION MADE 2026-11-01 22:05 IST: Provider pick is Groq first. Groq adapter build started locally only, no push or deploy. Replace placeholder rates with Groq rates only after checking his Groq account model list, and never quote a cost to a customer from placeholder rates.

## Phase 2: Cut tokens in the engine
Status: QUEUED, starts after Phase 1 acceptance check
Owner: Pip build
5. Model routing, small by default. Small models for classification, extraction, formatting, short summaries, and routing. Big models only for hard reasoning, high stakes output, or escalation when the small model is unsure. Founder can set routing per agent and per workspace, and override per task.
6. Stable prompt caching design. Stable instructions, tool definitions, and reference material first, variable input last, so provider caching can hit. Track cache hit rate and cache write cost, do not assume a discount.
7. Shared workspace memory and duplicate detection. If a task or question matches a previously verified answer, offer reuse instead of a fresh run. Store the final verified output as the team source of truth, not every draft.
8. Context pruning. Summarise older history instead of sending it verbatim, retrieve only the top relevant chunks instead of whole documents, prune tools to only those relevant to the task, and strip boilerplate from retrieved documents.
9. Output caps and concise structured output by default. Long form only when the task asks for it.
10. Per workspace, per agent, and per task budgets. Alert at 80 percent of budget, hard stop at 100 percent unless the founder overrides. Cost preview plus budget check happens before execution, not after the bill.
- Acceptance check: same task costs measurably less in tokens on a test workspace than the Phase 1 naive baseline, with quality checked by human review, not by token count alone.

## Phase 3: Cheaper scheduling and less rework
Status: QUEUED, starts after Phase 2 acceptance check
Owner: Pip build
11. Batch queue for work that can wait. Nightly summaries, bulk classification, enrichment, and reports run in a cheaper overnight batch where the provider offers a batch discount, while urgent tasks stay live. Label the tradeoff clearly: cheaper, slower.
12. Plan preview before a costly run. Show the agent plan, model, estimated tokens, and estimated cost, and let the founder approve or trim it. This extends the existing approval discipline from output to spend.
13. Task brief quality check. Require a clear brief, success criteria, and output format before a run, so vague tasks do not cause repeat runs. Failed runs show a sanitised reason and a one click retry with a smaller model or trimmed context where safe.
- Acceptance check: a non urgent task can be queued, run later, and shows its batch saving separately, and a vague task is stopped before it burns tokens.

## Phase 4: Agency proof, the headline USP
Status: QUEUED, starts after Phase 1 acceptance check, can run in parallel with Phase 2 only if code areas do not overlap
Owner: Pip build, Noodle copy check
14. Client proof export per verified task and per workspace period. One report per task: task brief, agent, human approver, approval history, handoffs, final output, tokens, and cost. Exportable and forwardable to a client, with no internal notes leaked.
15. Weekly ROI proof sheet for the founder, exportable inside the company. Tasks completed, tasks approved, errors or bad outputs caught in review, tokens used, tokens and cost saved vs the naive baseline, cost per completed task, and active teammates. This sheet is the renewal and expansion argument.
16. Case study capture flow. After a team completes its first verified workflow, ask for a short before and after note: what took how long before, what it takes now, what was caught in review. No case study is published without the customer's yes.
- Acceptance check: a completed, approved task produces a client ready report that a founder can send without editing out internal data, and the report never claims a saving that Phase 1 did not measure.

## Phase 5: Multi human handoffs, supporting promise 1
Status: QUEUED, starts after Phase 4 acceptance check
Owner: Pip build
17. Cross human, cross provider handoffs. An agent for teammate A hands a task to an agent for teammate B, even if they use different providers, with the handoff, payload, and approval history preserved. Existing local handoff UI is the base, this phase extends it across humans and providers.
18. Agent ownership and visibility. Each teammate's agent is clearly owned, pausable, and auditable by that teammate and the leader, with keys referenced server side only, never shown to other members.
- Acceptance check: a task moves from one human's agent to another human's agent, both humans can see the trail, and neither sees the other's provider key.

## Phase 6: Cost capped India launch, supporting promise 2, and growth
Status: QUEUED, starts after Phase 3 and Phase 4 acceptance checks
Owner: Pip build, Boba pricing check, Noodle copy check
19. Rupee cost display and transparent pricing page, pricing not set yet until Kartikey decides. Recommended shape to decide on: subscription per workspace plus per seat, with a token budget included, provider cost shown separately from the Orbely fee, no hidden token markup. Free pilot for one team only, time boxed, with the ROI sheet as the conversion step.
20. Land and expand playbook in product. One team, one painful workflow, one template, first visible win on day one. Then invite a second team, cross team handoffs, and shared reporting. Track expansion triggers: more teammates needing access, approvals turning one seat into many, and usage tied to a business outcome.
21. Niche templates beyond Launch, Product, and Content. First candidate: marketing agency content and reporting squad, with agency specific tasks, review steps, and report formats. Pick one niche for the first 10 paying teams, do not try to serve all companies at once.
22. Trust sales page, based only on what is true at launch. Approval gates, role based access, membership scoped policies, append only audit logs, server side key references only, data deletion flow, and a plain statement of what the worker cannot do yet. No fake clients, revenue, or incidents.
- Acceptance check: a new agency team can sign up, invite, run a first workflow, see cost in rupees, hit a budget stop, and export a client proof report, all without a manual workaround from Kartikey.

## Deliberately NOT in any phase
- No push to GitHub, no deploy to Vercel, no live site change, unless Kartikey gives a separate yes for that phase.
- No secrets, API keys, service keys, worker secrets, or provider keys in code or chat.
- No spend, publish, or send action executors. Worker still records output only.
- No billing charges, paid tiers, or pricing until Kartikey decides the model and billing is tested end to end.
- No claim that live execution, live Supabase, realtime, or signed in pages are verified live.

## Still blocked, Kartikey must provide or decide
- Live Supabase steps in LOCAL_BUILD_NOTES.md, then live execution verification with service role key, worker secret, and provider key, server side only.
- Provider pick, including Groq adapter decision.
- Paid tier model and billing provider, including Razorpay vs merchant of record.
- Lawyer and tax review of legal drafts before any market launch.
