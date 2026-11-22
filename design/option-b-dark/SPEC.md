# Orbely UI overhaul, Option B: all dark premium

Status: mockup and spec only, 2026-11-01.
Kartikey's choice: Option B, all dark premium. Explicitly not light premium everywhere.
Nothing here changes the live site, the app code, or GitHub. Implementation needs his separate yes after he reviews the mockup.

## Direction in one line

One visual system from landing page to workspace: deep ink page, coal cards, ivory text, muted secondary text, champagne gold as the only accent, hairline borders, flat colour, typography first, zero images over mediocre ones.

No light content area. No light mode toggle in this version, because a toggle would keep two systems alive and reintroduce the clash this overhaul is meant to kill.

## Tokens, already in globals.css plus one raised surface

- Page: ink #0b0b0e
- Panel: coal #141419
- Raised card inside a panel, for example a task card: #1c1c24
- Text: ivory #f5f1e8
- Secondary text: muted #a7a29a
- Accent: gold #c9a86a, gold soft #e3c98f for small gold text
- Hairline: white at 10 percent opacity
- Radius: card 12px, button and input 8px, pill full
- Shadows: none. Gradients: none.
- Display type: Georgia for page titles and section titles, system sans for body and controls.
- Focus: 2px gold outline, everywhere interactive.

Contrast rule: gold background is only for primary buttons with ink text. Small gold text uses gold soft, not gold, so it stays readable on ink. Muted text is for secondary copy only, never for a primary label or a heading.

## Status pills, dark version

Old rainbow pills go. New system:

- todo, idle, disabled, paused: muted pill, ivory border at low opacity, muted text.
- in progress, working, running: gold pill, ink text.
- in review, awaiting approval, pending: gold outline pill, gold soft text.
- done, succeeded, approved, verified: muted green pill, green #9db89a, used only for status.
- failed, rejected, error: muted red pill, red #d98c8c, used only for status.
- DEMO: gold outline pill, gold soft text. No violet.

This keeps gold as action and working, and reserves green and red strictly for outcome status.

## Component mapping, light to dark

- Workspace layout background #faf8f3 becomes ink. Content padding stays.
- Sidebar stays ink, gains a hairline right border. Active nav item becomes raised coal with ivory text and a gold marker. On mobile, sidebar becomes a top bar with horizontally scrolling nav, not a full width stack that pushes content down.
- PageHeader: title becomes Georgia, ivory. Description becomes muted. No stone-900 text anywhere.
- MetricCard: coal card, hairline border, uppercase muted label, large ivory number, muted hint.
- Cards, forms, lists: coal background, hairline border, ivory headings, muted secondary text. Inputs: ink background, hairline border, ivory text, muted placeholder, gold focus border and outline.
- Primary buttons: gold background, ink text, gold soft on hover. Secondary buttons: transparent, hairline border, ivory text, gold border on hover. Old stone-900 buttons become gold primary or ghost secondary depending on importance, never both on the same row at equal weight.
- EmptyState: coal card, dashed gold-tinted border, ivory title, muted hint, plus one primary action button. No dead end empty states.
- Activity feed: human sentences, not raw event names. Example: "Builder moved Launch post to review" instead of a raw task event label.
- Task board: five columns on desktop, one stacked list on mobile. Task cards are raised, not white.
- Approvals: approval request card leads with what will happen, who requested it, the exact payload, and Approve as the single gold action. Reject is ghost.
- Dashboard: this is where the current bug lives. Dashboard renders under the dark global layout but uses dark stone headings, so it must be converted to the same dark tokens as the workspace, not left as light cards on a dark page.
- Home, login, signup, workspaces: already mostly dark and consistent. Keep them, tighten hierarchy and copy only. Home invite copy must say link invites only until email and phone invites exist.

## Files Pip would touch, when approved, not now

- app/globals.css: add raised token only, no new palette.
- components/workspace-ui.tsx: PageHeader, MetricCard, all pills, EmptyState, ErrorBanner.
- components/workspace-sidebar.tsx: active state, mobile behaviour.
- app/workspace/[id]/layout.tsx: background.
- app/dashboard/page.tsx, app/workspace/[id]/overview/page.tsx, tasks, agents, agent detail, reports, approvals, activity, settings.
- app/page.tsx, login, signup, workspaces: copy and hierarchy tweaks only, unless review finds more.

## Risks to watch in implementation

- Dense task board readability in dark mode: keep task titles ivory and bold, body muted, and generous line height. Do not shrink text to fit five columns.
- Gold on small text: use gold soft, and never gold on coal for a long paragraph.
- Long JSON payloads in approvals: keep a dark code block with horizontal scroll, ivory text on ink, not a light block in a dark card.
- Accessibility: check muted text contrast on ink and coal, and gold focus visibility on every interactive element, before calling it done.

## What to decide next

1. Approve this dark mockup direction, or ask for changes to spacing, type size, or status colours.
2. If approved, Pip implements Phase 1 token conversion only, then shows a live preview, still no deploy without Kartikey's yes.
3. Phase 2 after that: home and auth copy, guided first run, and human activity sentences.
