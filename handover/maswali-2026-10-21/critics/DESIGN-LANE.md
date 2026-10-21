# MASWALI MILLIONEA — design lanes: the common brief (binding)

Ali (owner, 2026-10-21): *"if you think anything regarding design, animations, or progress of the Maswali game is not 10/10
rated as player or UI/UX engineer or animation specialist, move it to 10/10 perfectly with full consistency with our design.
you know better, keep going until live and clean."* Design critics scored every Millionea surface (round 1). Your lane owns
ONE surface group: you implement its critic report until every cell of its score table is honestly 10/10, prove it in code
and on screen, and hand back. An independent critic re-scores after you (round 2); anything below 10 comes back to you.

## Read first
- `AGENTS.md` in your worktree (§6 honesty, §7 UI, §8 checks) — wins over everything.
- `docs/DESIGN_AUTHORITY.md` §0 and §M8a (+ the platform rulings it cites); `src/app/globals.css`, `motion.css`,
  `state-tokens.css` for values; the kit in `src/components/ui/*` — reuse, extend, never hand-roll a duplicate.
- The critics' common brief: C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\408dbc60-fcd0-43af-899c-8602858935b5\scratchpad\critics\COMMON.md
- YOUR work order: the critic report file named in your prompt (R1-*.md in the same folder). Lines marked **LEAD RULING**
  are decisions — follow them. Everything else: verify the finding in the code/tiles first; implement the stated fix or a
  better one that is MORE consistent with the platform (say why); a finding you prove wrong is reported, not "fixed".
- The lane rules C:\Users\asheib\AppData\Local\Temp\claude\C--Users-asheib\408dbc60-fcd0-43af-899c-8602858935b5\scratchpad\handover\handover\maswali-2026-10-19\briefs\LANE-COMMON.md
  with these OVERRIDES: slot helper `MLN_SLOTS=3 bash C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/408dbc60-fcd0-43af-899c-8602858935b5/scratchpad/mln-slot.sh <lane> <cmd…>`
  (shared S5 slots; RAM is tight — batch your heavy runs: one tsc, few servers); server runner
  `bash C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/408dbc60-fcd0-43af-899c-8602858935b5/scratchpad/mln-server-run.sh <your tree> <port> <log> [VAR=…] -- <cmd>`
  (fresh in-memory next dev; never warm /auth/demo); your scratch folder, KP_SCRATCH_PORT and ports are in your prompt. The
  lead owns docs/MASWALI-PLAN.md §0/§1 and docs/NEXT-PLAN.md — don't edit them; DESIGN_AUTHORITY §M8a amendments for a
  ruling you implement ARE yours (same commit, cite "Ali 2026-10-21 10/10 pass").

## Who owns which file (the design lanes branch from S5-FIX-PLAYER's head cdb4bf46e; that lane has handed its code back
## and only verifies now — if it adds a follow-up commit the lead merges it). Edit only your lane's files; for anything
## else message the lead (SendMessage to "main"). Shared files: tight hunks, never reformat, never reorder.
- DESIGN-HUB: src/app/millionea/page.tsx, hub-*.tsx (hub-pool, hub-notices, hub-ghost …), src/components/maswali/
  maswali-pool-figure.tsx, the hub's own helpers.
- DESIGN-SLIP: src/app/millionea/slip/**, src/components/maswali/maswali-slip.tsx (+ its confirm/stamp parts),
  src/lib/millionea-slip-draft.ts, src/components/ui/stepped-progress.tsx, the kit Modal's `handoff` and
  OperationResultModal's `panelDelay` (byte-identical for every caller that does not pass them — prove it), scripts/
  maswali-multi-slip-drive.mjs.
- DESIGN-TICKETS: src/app/millionea/tickets/**, src/components/maswali/maswali-ticket.tsx, maswali-win-ledger.tsx
  (the receipts), ticket-acts.tsx, src/components/journey/tickets/* (the kind switch), the tickets/ticket ghosts.
- DESIGN-REGISTER (register + How to play): src/app/millionea/register/**, src/app/millionea/how/**, AND the shared
  pieces it owns for everyone: the kit ReceiptRow (its sentence-case label variant), a shared Millionea ledger-row
  builder (MR-26's in/out identity), the WeekStateChip (register-parts.tsx), MaswaliCarry (maswali-carry.tsx: the scale
  fix, the both-ends-in-view rule, the run counter). Other lanes ADOPT these in round 2, after the lead merges.
- DESIGN-DOORS: the Millionea cards, their ghosts, markets/loading.tsx, /results' section (millionea-results.tsx), the
  /positions row.
- src/app/millionea/millionea-view.ts and src/lib/server/maswali-player.ts are SHARED: add new helpers/fields in your
  own clearly-named block at the END of the file; change an existing helper/field only by asking the lead first.
- S5-FIX-SRV: src/lib/server/maswali-service.ts, maswali-integrity.ts, maswali-dal.ts, audit.ts, src/app/admin/maswali/**,
  src/lib/maswali-seal-batch.ts, maswali-integrity-list.ts, maswali-console.ts.
- S5-FIX-SRV: src/lib/server/maswali-service.ts, maswali-integrity.ts, maswali-dal.ts, audit.ts, src/app/admin/maswali/**,
  src/lib/maswali-seal-batch.ts, maswali-integrity-list.ts, maswali-console.ts.
- S5-FIX-PLATFORM: src/lib/millionea-edge.ts, src/proxy.ts, millionea-edge-entitlement.ts, src/components/layout/app-shell.tsx,
  src/app/api/og/**, src/components/journey/route-ghost.tsx, src/app/leaderboard/**, src/lib/leaderboard/**, nav-more.tsx.
- U43 (another session): src/app/updown/**, src/components/updown/**, market-card.tsx, updown-board.ts — never.
- PHOSPHOR (another session): scripts/glyphs/* and the kit glyph doors — a new glyph key goes through the lead.
- i18n-dict.ts and globals.css are SHARED: edit only your own keys/blocks (the `millionea` namespace keys of your surface;
  `kp-mln-*` classes of your surface), keep edits in tight hunks, never reformat a block.

## The loop (repeat until 10/10)
1. Implement in small commits (`MASWALI-BUILD S5-DESIGN-<LANE> <n>: …`), each with its guard (assert the value — a measured
   box, a computed style, a rendered string in all three languages, a contrast ratio — not the source text) and a mutation
   proof (a plant that the guard catches). Push after every commit (full refspec; verify with ls-remote).
2. Derive and run every script that reads a changed file (`git grep -l <path> -- scripts/` — tests, red twins, anchors; S5's
   anchors pin exact lines: re-pin what you move). Floors rise only to printed counts.
3. SHOOT EVERY STATE of your surface — not only what the default seed shows: extend the dev-test seeding (src/app/api/dev-test/**,
   dev-only and refused in production — keep every existing gate) or the shot script's options to produce each state the
   critic listed as owed. Widths 320 · 360 · 768 · 1024 · 1280 · 1920; locales sw, en, zh (sw first: the longest). Viewport
   tiles, every page to its end. READ every tile yourself (Read tool). Measure positional claims (box/pixel probes), don't
   eyeball them.
4. Self-score the critic's table honestly; fix; re-shoot; until every cell is 10.
5. `npx tsc --noEmit` (slot helper), then hand back.

## Rules that never bend
No fabricated figure, time, window or officer; gold only on earned money (§M8a item 7, §M3a); one glyph family `I` (a new
key → ask the lead); money via formatTzs/.amount; motion only from the platform's tokens, with a reduced-motion end state, and
never on mount for a figure; no layout shift; tap targets ≥ 40px; every player string in en/sw/zh with identical placeholders
and the DECIDED words (MASWALI-PLAN §0a rulings; S5-VIS-FINDINGS §D); RG: nothing invites a player on a break to play; the
rollout gates untouched (WITHDRAWN must stay dark — a door you change must still draw nothing while WITHDRAWN).

## Your final report (the lead acts on it)
1. The critic's table re-scored by you, with the tile files proving each 10.
2. Per finding: done (commit) / changed approach (why) / not reproduced (proof) / blocked (on what).
3. Every changed or new string in en/sw/zh (for Gate B native review).
4. Checks run with printed counts; reds with proof of origin.
5. Final ls-remote head; `git status --short` (clean).
