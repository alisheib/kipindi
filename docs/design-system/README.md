# 50pick Design System — the rule book

> **Start here for anything visual.** This is the entry point for every design
> question, every new screen, and every future theme change.
>
> **Last updated:** 2026-07-27 · **Current version:** `v2-2026-07-27` — the complete system and the ONLY archive (the earlier `v1-2026-07-24` was retired into it; see §6)

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

**⚠️ THE MOST IMPORTANT TABLE IN THIS FOLDER.** Nothing in `v2-2026-07-27/` overrides
these. An archive is a *record of designs*, not the definition of the system — this holds
even though v2's `00-START-HERE.md` calls its own `tokens.css` "the theme"; that file is
a dated snapshot, and the live `src/app/globals.css` wins on any conflict.

| Truth | Authoritative source | Never |
|---|---|---|
| **Tokens** — colour, type, spacing, radii, shadows, motion | **`src/app/globals.css`** | Never read a `globals.css` from a design export — those are dated snapshots and they drift |
| **Design invariants** — palette, YES/NO, theme, gold budget, a11y floor | [`docs/DESIGN_AUTHORITY.md`](../DESIGN_AUTHORITY.md) | — |
| **Palette rationale** — ground-truth sRGB, why each hue | [`docs/design-master-brief.md`](../design-master-brief.md) | — |
| **Components** | `src/components/ui/**`, `src/components/admin/**` | Never hand-roll a one-off that duplicates a primitive — extend the kit |
| **Glyphs** | `src/components/ui/glyphs.tsx` | Never import an icon library into a player surface |
| **Brand marks** | `src/components/brand.tsx`, `public/brand/**` | Never re-tint, mirror or stretch |
| **Control sizing** — button/input/chip heights | `--tap-min` + `--h-control-xs/sm/md/lg/xl` + `--h-input` in `globals.css`; sizes `.btn-xs/sm/md/lg/xl` | Never hard-code a control height or `h-8`/`min-h-[…]` override on a `.btn` — use a size class / token |
| **Consistency enforcement** | `scripts/ui-consistency.test.mts` (`npm run test:ui-consistency`, in `test:all`) + tracker [`npm run test:ui-consistency`](../DESIGN_AUTHORITY.md) | Never introduce a native `<select>`/`<input type=checkbox>`/`datetime-local`, an ad-hoc portal, or a hard-coded token literal where a kit primitive exists — the linter fails the build |

**Rule of thumb:** if it renders in production, the code is the truth. This folder
records *what was designed and why*, so a future session can understand the intent
behind the code rather than re-deriving it.

---

## 2 · What is in here

```
docs/design-system/
├── README.md                    ← you are here — the rule book + index
└── v2-2026-07-27/               ← CURRENT — the complete design system, the ONLY archive (installed 2026-07-27)
    ├── 00-START-HERE.md         manifest + order of authority
    ├── 01-foundations/          tokens.css / tokens.json (SNAPSHOT — see §1) + colour/type/space/elevation docs
    ├── 02-components/           every component (preview.html + spec.md); _specs-as-delivered/ holds D1/D2/D3 + P&L handoff code
    ├── 03-glyphs/               39 stroke SVGs + contact sheet
    ├── 04-brand/                brand.md + preview
    ├── 05-pages/                every screen as a runnable .dc.html
    ├── 06-patterns-and-rules/   RULES.md — the 12 platform laws
    ├── 07-provenance/           CHANGELOG · SUPERSEDED · SOURCES · OPEN-GAPS · kit-source (teal, dead) · app-source (diff refs)
    ├── 08-motion/               motion.css — "The Settle" motion language
    ├── 09-needle/               The Needle: physics engine + haptics + spec + playground
    └── 10-haptics/              named haptic vocabulary
```

### `v2-2026-07-27/` — the complete system (CURRENT)
The full export that §6 previously said was pending: foundations, every component with
every state, the glyph sheet, brand, every page, the pattern rules
(`06-patterns-and-rules/RULES.md` — the 12 laws), motion, The Needle, haptics, and the
provenance trail (`07-provenance/`: CHANGELOG, SUPERSEDED, SOURCES, OPEN-GAPS). Authority
order *inside the archive*: `tokens.css` > `RULES.md` > component spec / `_specs-as-delivered/`
> prose — but **§1 still wins**: the live `src/app/globals.css` is the token truth; the
archive's `tokens.css` is a dated snapshot. `07-provenance/kit-source/*` is the superseded
teal generation — **never build from it**.

### `v1-2026-07-24/` — retired 2026-07-27
The earlier partial archive (Up & Down D1/D2 specs + the Positions P&L brief only) was
**100% contained in v2** — verified by content hash, every one of its 16 files — and was
referenced by no code, so it was deleted: one archive, one home. Its history is in git;
its content is in v2. The two `src/` comments that used to cite `v1-*/specs/` were
repointed to `v2-2026-07-27/02-components/_specs-as-delivered/`.

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
| `uploads/UPDOWN-SPEC.md` | Already lives at [`docs/UPDOWN-SPEC.md`](../UPDOWN-SPEC.md) |
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

## 6 · ✅ The complete system has landed

The full archive that this section used to say was pending **arrived and was installed
on 2026-07-27** as `v2-2026-07-27/` (see §2): foundations, every component with every
state, the glyph sheet, brand, every page, the pattern rules, motion, The Needle,
haptics, and the changelog/superseded/open-gaps record. It supersedes `v1-2026-07-24/`
(a documented superset — nothing removed).

Installed by moving the delivered archive here and deleting every duplicate — the four
`New developments/…` sibling kits were byte-identical subsets (verified by content hash)
and were removed, the loose `New developments/` staging folder was removed, the
fully-redundant `v1-2026-07-24/` archive (100% contained in v2, hash-verified) was
retired, and the two stale `src/` comments that cited the v1 spec paths were repointed to
v2. Dead `tsconfig` excludes and `.gitignore` lines pointing at long-gone kits were pruned
too. Full audit trail:
[`v2-2026-07-27/07-provenance/CHANGELOG.md`](v2-2026-07-27/07-provenance/CHANGELOG.md).
**§1 remains the only token authority** (`src/app/globals.css`); the archive is the record.

---

## 7 · How to use this when adding a feature

1. Read [`DESIGN_AUTHORITY.md`](../DESIGN_AUTHORITY.md) — the invariants are law.
2. Check `src/components/ui/**` for a primitive that already does it. **Extend the kit;
   never fork it.**
3. Read the closest spec in `v2-2026-07-27/02-components/` (component `spec.md`, or
   `_specs-as-delivered/` for D1/D2/D3 + P&L) for the redline idiom to match.
4. If a genuinely new value is needed, **add it to the kit** (`globals.css` + the
   component), never hard-code it in one file — and say so in the spec.
5. Verify at **360 / 768 / 1280 / 1920**, in EN + SW + ZH, and **look at the
   screenshots**. A green automated suite is not proof.
6. Run **`npm run test:ui-consistency`** (the kit-adoption linter — fails on native controls,
   ad-hoc portals, hard-coded token literals, off-token control heights) and
   **`npm run test:responsive`** (tap sizes + overflow). Both are in `test:all`. If you
   deliberately add a tracked exception, re-baseline with a documented reason and note it in
   [`npm run test:ui-consistency`](../DESIGN_AUTHORITY.md).
