# 50pick — Admin Console Handoff

The operator-facing console. **In sync with the player handoff:** this package uses the
**exact same `kit50.css` token file** as the player system — same OKLCH ramps, radius,
motion, glow rules. Change a token in one, change it in both.

## Start here
1. **`50pick Admin Console — handoff.html`** — open in any browser, offline. Pan/zoom; ⤢ to focus.
2. **`source/`** — `kit50.css` (shared SOURCE OF TRUTH), shared atoms (`kit50.jsx`,
   `ds-brand-nav.jsx`, `ds-charts.jsx`, `ds-atoms2.jsx`), and **`ds-admin.jsx`** (the console).

## What's inside
**Operator console** — left sidebar nav (Dashboard / Markets / Resolver / Users / Finance /
Compliance / Settings), topbar with period picker, **KPI cards** (staked / active markets /
predictors / house margin / pending resolution), a **daily-volume chart**, the **two-officer
resolver queue** (both officers must agree · 24h objection window), and a **markets data table**
(question / category / status / pool / predictors / closes) with "New market".

## Sync contract with the player handoff
- Tokens: `kit50.css` is identical in both folders. Keep them byte-for-byte in sync.
- Atoms: `kit50.jsx` / `ds-brand-nav.jsx` / `ds-charts.jsx` / `ds-atoms2.jsx` are the shared kit.
- Only `ds-admin.jsx` is admin-specific.
- Same non-negotiables: YES green / NO rose / gold earned-only · mono numbers · glow is earned, not ambient · no emoji · royal-indigo 268 canvas.

The JSX is Babel-in-browser for preview only — precompile / port for production.
