# 2026-07-29 — the design finalization brief (as delivered)

The source material for the pass that froze the design system. Archived here
unchanged so the kit records **what was asked**, next to what shipped.

| File | What it is |
|---|---|
| `DESIGN-PROMPT-share-now.md` | the brief — Steps 0–7 |
| `DESIGN-SYSTEM-MERGE-RULES.md` | the delivered law, installed as `06-patterns-and-rules/MERGE-DISCIPLINE.md` (B9/B10, RULES 15/16) |
| `50pick-design-target.html` | the visual target |
| `50pick-design-coldstart/` | the delivered cold-start bundle (Step 2) |

**What shipped:** `docs/DESIGN-FINALIZATION-PROGRESS.md` — every commit, the gate
results, what was verified live, and what was deliberately left open.

## Where the brief and the repo disagreed

Recorded because a future reader comparing the two will otherwise think work was
skipped. Four instructions described work that was **already done** on `main`:

- **Step 1.3** — delete `src/app/micro-patterns.css`. Already deleted in `d331cb2b`
  (2026-07-28). Its `.is-interactive` / `.spark-draw` / `.btn-spin` audit *was*
  outstanding, and found something worse than the suspected duplication: zero
  consumers anywhere. Deleted.
- **Step 4** — "make Pick your side a sticky right rail". Already sticky. The real
  gap was the empty column beneath it.
- **Step 6** — "starting with `wallet-result-modal.tsx`". Already routed through
  `OperationResultModal`.
- **Step 2 patch 2** — add `market.newBadge` ×3 locales. `common.newBadge` already
  existed with identical text in all three, so the card reuses it (law 15: search
  before you add). Three keys, not four.

**The delivered cold-start bundle was applied as CHANGES, not as a file drop.** Its
`market-card.tsx` was cut before Step 1, so replacing the file wholesale would have
reverted the Modal refactor. Its inline `style={{…}}` blocks were also promoted to
`.mcardp-*` classes — law 15 names that exact shape ("a cold-start look shipped as
inline style in `market-card.tsx`") as the failure to avoid, so shipping the bundle
verbatim would have broken the law the same bundle came packaged with.

**One instruction was internally contradictory** and is resolved in the tracker:
Step 4 asks to move the criterion, facts and related markets into the desktop rail
*and* to change nothing on mobile. Only content already rendering last on mobile can
move without reordering the phone, so Related markets moved and the rest stayed.
