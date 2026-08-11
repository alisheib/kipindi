# 50pick — design handover, round 2

**Prepared:** 11 August 2026 · **Subject:** landing page composition + market discovery on `/markets`

---

## ⚠ Read this first

Round 1 went out of scope. The brief invited token changes, and the result changed the colour
palette and redesigned the market card. **Our design system is approved and shipping. It is not
being redesigned.**

This round is about **composition and discovery** — how the page is assembled from components we
already have, and how a user finds a market worth predicting on.

## Read in this order

1. **`FROZEN.md`** — what you must not change. Not optional, read it first.
2. **`BRIEF.md`** — what you are designing, and who we need you to be while doing it.
3. **`06-handover-contract/OUTPUT-SPEC.md`** — exactly what to return, and the self-check to run
   before you return it.
4. **`02-findings/LANDING-AND-FILTERING-FINDINGS.md`** — the measured problems, in-scope only.

## Contents

> 🔴 **THIS IS A REVIEW COPY, NOT A SENDABLE PACKAGE (stripped 2026-08-11).**
> Four folders were removed because every file in them was a **byte-identical copy** of a file
> already in the repo — including a `DESIGN_AUTHORITY.md` whose own line 6 reads *"THERE IS NO
> SECOND ONE."* **[`SOURCES.md`](SOURCES.md) maps every removed file to its one real home**, and
> lists **three defects that must be fixed before this package is ever rebuilt.**
> The complete original is `../50pick-design-handover-v2.zip`. ⛔ Do not send that zip as-is —
> assemble a commission from LIVE files at send time (`DESIGN_AUTHORITY.md` §0b, outbound row).
> **References to `03-brand/`, `04-design-system/`, `05-current-code/` and `tokens-LOCKED.css`
> elsewhere in this package resolve through `SOURCES.md`.**

| Folder | What it is |
|---|---|
| `01-approved-design/` | **Locked reference.** Screenshots of the approved market card, side picker and needle as they ship. Reproduce, do not redesign. *(The three source files now live in `src/` — see `SOURCES.md`.)* |
| `02-findings/` | Measured problems, deliberately limited to what is in scope. ⚠️ **7 of the 21 no longer hold** — re-verify before commissioning. |
| `02-current-state/screens/` | Live landing page and `/markets` at 390 and 1440, plus two rendering bugs |
| `SOURCES.md` | Where every removed file lives, and the three rebuild defects |
| ~~`03-brand/`~~ | removed — `public/brand/`, `public/icons/`, `public/pay/`, `public/favicon.svg` |
| ~~`04-design-system/`~~ | removed — `src/app/globals.css`, `motion.css`, `state-tokens.css`, `tailwind.config.ts`, `docs/DESIGN_AUTHORITY.md` |
| ~~`05-current-code/`~~ | removed — the eight files are in `src/`, listed in `SOURCES.md` |
| ~~`tokens-LOCKED.css`~~ | removed — it was an extract of `src/app/globals.css`, and **12 of its tokens resolved to nothing** without `motion.css` (see `SOURCES.md` defect 1) |

## The rule that matters

**Every colour in your deliverable must be a `var(--token)` reference.** No hex, no `rgb()`,
no `oklch()`, no named colours. If a colour you want does not exist as a token, it is out of scope —
put it in `OPEN-QUESTIONS.md`.

## Non-negotiables

- No changes to the palette, the market card, the conviction bar, the YES/NO control, or the brand
- No photography, no stock imagery, no AI-generated imagery
- No new fonts — Sora, Inter, JetBrains Mono only
- Every tap target ≥ 44 × 44 px
- Mobile (390px) is the primary case, not an afterthought
- Trilingual EN / SW / 中文 — Swahili labels run 15–25% longer
- Dark theme only
