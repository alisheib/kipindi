# 50pick Design System — the rule book

> **Start here for anything visual.** This is the entry point for every design
> question, every new screen, and every future theme change.
>
> **Last updated:** 2026-07-24 · **Current version:** `v1-2026-07-24`

---

## 0 · The one rule that governs this folder

**One fact, one home.** A value lives in exactly one place, and everything else links
to it. This is not tidiness — it is the defect this project has already been burned by
twice:

- A **superseded teal kit** stayed on disk and kept being treated as current. It would
  have reverted the brand to teal 215 and resurrected the killed light theme.
- **`seedHistory()` fabricated price history** for real-money bettors for months,
  because a second definition of "chart data" existed alongside the real one.

So: if you find a value in two places, that is a bug. Fix it by deleting one, not by
keeping both in sync.

---

## 1 · Where truth actually lives

**⚠️ THE MOST IMPORTANT TABLE IN THIS FOLDER.** Nothing in `v1-2026-07-24/` overrides
these. The archive is a *record of designs*, not the definition of the system.

| Truth | Authoritative source | Never |
|---|---|---|
| **Tokens** — colour, type, spacing, radii, shadows, motion | **`src/app/globals.css`** | Never read a `globals.css` from a design export — those are dated snapshots and they drift |
| **Design invariants** — palette, YES/NO, theme, gold budget, a11y floor | [`docs/DESIGN_AUTHORITY.md`](../DESIGN_AUTHORITY.md) | — |
| **Palette rationale** — ground-truth sRGB, why each hue | [`docs/design-master-brief.md`](../design-master-brief.md) | — |
| **Components** | `src/components/ui/**`, `src/components/admin/**` | Never hand-roll a one-off that duplicates a primitive — extend the kit |
| **Glyphs** | `src/components/ui/glyphs.tsx` | Never import an icon library into a player surface |
| **Brand marks** | `src/components/brand.tsx`, `public/brand/**` | Never re-tint, mirror or stretch |

**Rule of thumb:** if it renders in production, the code is the truth. This folder
records *what was designed and why*, so a future session can understand the intent
behind the code rather than re-deriving it.

---

## 2 · What is in here

```
docs/design-system/
├── README.md                    ← you are here — the rule book + index
└── v1-2026-07-24/
    ├── specs/                   implementation specs: redlines + prop contracts
    ├── canvases/                rendered design mockups (.dc.html, open in a browser)
    ├── components/              proposed component code, NOT yet in src/
    └── provenance/              what Claude Design was told, and by whom
```

### `v1-2026-07-24/specs/`
| File | Covers | Status |
|---|---|---|
| `D1-updown-card-spec.md` | The Up & Down round card — 7 states, redlines, prop contract | ✅ Reviewed, approved with 3 open questions |
| `D2-updown-board-spec.md` | The `/updown` board — tabs, grid, results strip, empty, skeleton | ✅ Reviewed, 1 item rejected (see §4) |
| `README-handoff.md` | Positions P&L work (a separate, earlier brief) | ⬜ Not yet implemented |

### `v1-2026-07-24/components/`
Proposed implementations from the Positions P&L brief. **These are not live** —
they have not been reviewed against the current `src/` and must not be dropped in
without one. Treat as design intent expressed in code.

### `v1-2026-07-24/provenance/`
The rules and briefs Claude Design was given. `01-RULES-and-invariants.md` is a useful
plain-English summary of the brand invariants — but [`DESIGN_AUTHORITY.md`](../DESIGN_AUTHORITY.md)
wins on any conflict.

---

## 3 · What was deliberately NOT kept, and why

Cleaned out on 2026-07-24. Every removal was verified as either a duplicate or a
reconstructible copy — **nothing unique was lost.**

| Removed | Reason |
|---|---|
| `Final Design Sytem/` (repo root) | **Byte-for-byte identical** to `Up Down Design System/` — same files, same checksums. Two names for one export. |
| `Up Down Design System/` (repo root) | Consolidated into `v1-2026-07-24/` |
| `theme/globals.css` (97,006 bytes) | A **stale snapshot**. The live file is 102,215 bytes. Keeping it invites someone to build from it. |
| `uploads/globals_css-*.css` (97,109 bytes) | A **third, different** stale copy. Three versions of one file is the drift bug itself. |
| `uploads/*.jsx`, `uploads/*.tsx` | Copies of our own `src/` files, sent as context. Git history is the archive for those. |
| `uploads/UPDOWN-DESIGN-PROMPTS.md` | Already lives at [`docs/UPDOWN-DESIGN-PROMPTS.md`](../UPDOWN-DESIGN-PROMPTS.md) |
| `support.js`, `.thumbnail` | Claude Design editor runtime artifacts, not design content |

**The superseded teal kit** (`50PICK/design_handoff_prediction_market_kit/`) is **not in
this repo** — it was moved to `F:/50pick-design-archive/`. ⛔ **Never build from it.** It
uses teal 215 and a light theme, both killed.

---

## 4 · Design decisions on record

| Decision | Ruling |
|---|---|
| Board grid at 1920 | **Stays 3-column.** A 4-column grid would need the max-width lifted to ~1648px, breaking the platform's fixed 3-tier system (1280 grid / 1080 content / 640 forms). The brief was wrong; the design was right. |
| `× 1.4` multiplier | Display estimate only, never fixed odds. Must always carry a qualifier. |
| "Confirming price" state | Calm and deliberate, never an error, and **never a guessed number**. |
| VOID / refunded | Neutral, not a failure state. |
| Gold on the Up & Down card | **Not** used for the projected return or the resolved band — correct. The asset-icon tint is an open question (§5). |

---

## 5 · Open questions

| # | Question | Owner |
|---|---|---|
| Q5 | The Gold asset icon uses a gold tint as *asset identity*, which collides with "gold = earned money only". Accept (artwork replaces it anyway), or use a neutral metallic ring? | Ali |
| Q6 | Card title at 360px — ellipsis on one line, or 2-line clamp? Recommend the clamp: Swahili and Chinese expand ~35%. | Ali |
| Q7 | Real Gold/Silver artwork to replace the `Au`/`Ag` placeholder glyphs. | Ali |
| Q8 | Top-nav treatment for Up & Down — purple highlight + live round timer, to signal "different game". Prompt D6 drafted. | Ali |

---

## 6 · ⏳ What this archive is still missing

**This is not yet the complete design system.** `v1-2026-07-24` covers the Up & Down
and Positions work only. The full archive — foundations, every component with every
state, the glyph sheet, brand assets, every page ever designed, the pattern rules, and
a changelog/superseded record — has been requested from Claude Design but **not yet
delivered**.

The export prompt is drafted and ready to run. When that ZIP arrives it becomes
`v2-<date>/` alongside this one, and this README's §2 grows to index it. Until then,
**§1 remains the only authority** — do not treat this folder as complete.

---

## 7 · How to use this when adding a feature

1. Read [`DESIGN_AUTHORITY.md`](../DESIGN_AUTHORITY.md) — the invariants are law.
2. Check `src/components/ui/**` for a primitive that already does it. **Extend the kit;
   never fork it.**
3. Read the closest spec in `v1-*/specs/` for the redline idiom to match.
4. If a genuinely new value is needed, **add it to the kit** (`globals.css` + the
   component), never hard-code it in one file — and say so in the spec.
5. Verify at **360 / 768 / 1280 / 1920**, in EN + SW + ZH, and **look at the
   screenshots**. A green automated suite is not proof.
