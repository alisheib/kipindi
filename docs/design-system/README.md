# 50pick Design System — the archive index

> 📑 **RECORD, NOT RULE. This is not the rule book — `docs/DESIGN_AUTHORITY.md` is.**
> That file holds every law, floor and threshold, and nothing else is needed to build
> correctly. This file is the **index of the delivered design archive**: what was
> commissioned, what landed, and where each artefact sits.
>
> ⚠️ **This file used to open by claiming to be where every visual question begins —
> which is how the product ended up with nine competing front doors** (this one, `00-START-HERE.md`,
> `11-material/README.md`, `RULES.md`, `DESIGN_AUTHORITY.md` and CLAUDE.md pointing at
> a different one again). They formed a cycle, and three of them disagreed with the
> shipped code on values a session would have pasted into `globals.css`. One door now.
> The filing law that keeps it that way is **`DESIGN_AUTHORITY.md` §0**.

<!-- superseded entry-point claim, kept struck so its absence is legible:
> ~~Start here for anything visual. This is the entry point for every design
> question, every new screen, and every future theme change.~~
-->

**Last updated:** 2026-08-12 · **Archive versions:** `v2-2026-07-27` — the complete delivered
system (the earlier `v1-2026-07-24` was retired into it; see §6) — plus
**`v3-2026-08-11-landing-discovery/`**, the round-2 delivery (landing composition + `/markets`
discovery ONLY), accepted 2026-08-12; its `ACCEPTANCE.md` records INHERIT/IGNORE per file and
every place our laws beat the kit. Both archives are frozen; the *rules* extracted from them
live in `DESIGN_AUTHORITY.md`. The v3 kit is being applied per `design-brief/PLAN-OF-RECORD.md`;
the measured reference from that commission round lives at `docs/design-brief/handover-2026-08/`.

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

## 0b · ⭐ WHERE A NEW DESIGN DOCUMENT GOES — read this BEFORE creating one

Added 2026-08-06 at Ali's instruction: *"always make sure the location of the design
system is in a common place, and known for other sessions to see where to store it and
prevent redundancies."* §0's rule tells you not to duplicate a **value**; this table tells
you where to put a **file**, which is how the duplication actually starts.

| you are writing… | it goes here | ⛔ not here |
|---|---|---|
| a **law / invariant** (a rule that binds future code) | `docs/DESIGN_AUTHORITY.md`, in the lettered section it belongs to | a new top-level `docs/*.md` |
| a **token / value** | `src/app/globals.css` at its line, with the rule in a comment beside it | any doc — docs describe values, they never define them |
| a **component or page spec** | `docs/design-system/v2-2026-07-27/0X-…/` beside its siblings | a new folder |
| an **incoming commission** (someone designed something for us) | `docs/design-system/` — an addition to the July system goes in `v2-2026-07-27/NN-<name>/`; a new dated delivery gets its own versioned folder (e.g. `v3-2026-08-11-landing-discovery/`) — raw and untouched, + an acceptance record | anywhere outside the versioned system |
| the **integration playbook** for such a commission | `docs/design-brief/INTAKE.md` | a second playbook |
| a **session handoff / next-session prompt** | `docs/LIVE-QA-CAMPAIGN.md` §6b, at the TOP | ⚠️ a `docs/NEXT-SESSION-*.md` — see the note below |
| **provenance** (rendered stills, the state something was signed off in) | `.../v2-2026-07-27/07-provenance/` | committed screenshots elsewhere |
| **evidence** (QA shots, probe output) | nowhere — it is **gitignored** (`.qa-design*/`) | the repo. A checked-in PNG is a claim nobody can re-derive |

⚠️ **`docs/NEXT-SESSION-*.md` is a tolerated exception, not a pattern.** A copy-pasteable
prompt is a different artefact from a tracker section, so **one** may exist — **never two.**
When its work is done, delete it; the durable record is §6b. If you are about to create a
second one, you are creating the redundancy this section exists to stop.

✅ **2026-08-21: none exists.** This paragraph named `NEXT-SESSION-MATERIAL-VISIBLE.md` as the
one instance. Its own delete-condition — *"delete it when the DA/DS sweep closes"* — fired on
2026-08-10 when the sweep closed at 93/93, and it was still sitting in `docs/` eleven days
later, which is precisely how a spent prompt gets re-read as live instruction. It is deleted.

⛔ **THE FIVE PLACES DESIGN FILES LIVE, so nobody invents a sixth** (re-measured 2026-08-11):

| path | what it is | status |
|---|---|---|
| `docs/DESIGN_AUTHORITY.md` | **the rulebook** — every law, floor, ratio and threshold | ⭐ **the one door** |
| `src/app/globals.css` + `motion.css` | **the values themselves** | outranks every document |
| `docs/design-system/README.md` + `v2-2026-07-27/` | **this file and the archive it indexes** — the delivered July-2026 system, 11 sections | 📑 record, not rule; frozen |
| `docs/design-brief/` | the material commission's brief + `INTAKE.md`, the receiving playbook | 📑 record |
| `design-brief/` *(repo root, **gitignored**)* | **outbound commissions only** — the package we send a designer, plus its `SOURCES.md` | ⛔ never a source of truth, never merge from it |

**Two entries were removed from this table on 2026-08-11 because they no longer exist:**

- `design-brief/law/` — the 2026-08-06 outbound extract. **Deleted.** It was the one file on
  disk claiming `STATUS: authoritative` with no RECORD banner while being 482 lines short of the
  rulebook (missing §0, §T, §S, §A, §C, §H, §E, §K and all of §M), and its `keyframes.css` was
  brace-unbalanced (194 `{` vs 195 `}`). Archived to `F:\50pick-design-archive\`.
- `50PICK/design_handoff_prediction_market_kit/` — the teal kit. Not on disk since the
  2026-07-15 finalization; listing it as a "place design files live" implied otherwise.

⛔ **A commission package NEVER carries a copy of the rulebook, the tokens, or component
source.** It links to them. The 2026-08-11 round-2 package bundled 27 byte-identical copies —
including a `DESIGN_AUTHORITY.md` whose own line 6 reads *"THERE IS NO SECOND ONE"* — at the
repo root, untracked and un-ignored, where `git add -A` would have committed 2.37 MB of
regenerable screenshots. Guarded now by `npm run test:design-one-door`, which fails on a second
`DESIGN_AUTHORITY.md` anywhere on disk.

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
    ├── 03-glyphs/               ⛔ DELETED 2026-08-12 — 39 SVGs at 1.5/1.85px stroke, 22% of the live corpus. The glyph truth is src/components/ui/glyphs.tsx (178 keys @1.9px). Archived off-repo; see design-brief/CLEANUP-MANIFEST.md
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
| `theme/globals.css` (97,006 bytes) | A **stale snapshot**. Keeping it invites someone to build from it. |
| `uploads/globals_css-*.css` (97,109 bytes) | A **third, different** stale copy. Three versions of one file is the drift bug itself. |

> ⚠️ **CORRECTED 2026-08-11 — read this before trusting the two rows above.**
> They said *"the live file is 102,215 bytes"*. It is **178,429**. More importantly, the table
> reads as if the ~97 KB stale snapshots are gone and *"nothing unique was lost"*. They are not
> gone: **four of them are still in this archive**, at the exact byte counts named above —
>
> | file | bytes | `--bg` |
> |---|---|---|
> | `v2-2026-07-27/01-foundations/tokens.css` | 97,351 | `oklch(15% 0.130 268)` |
> | `v2-2026-07-27/05-pages/theme/globals.css` | 97,356 | `oklch(15% 0.130 268)` |
> | `v2-2026-07-27/09-needle/theme/globals.css` | 97,006 | `oklch(15% 0.130 268)` |
> | `v2-2026-07-27/07-provenance/kit-source/globals.css` | 97,109 | `oklch(15% 0.130 268)` |
>
> **Live `--bg` is `oklch(6.5% 0.130 268)`** — the archived canvas is more than twice as light,
> and all four still define `--bg-elevated2`, which `globals.css:302` retired with the words
> *"Do not re-add"*. The canvas lightness is one of the three values `DESIGN_AUTHORITY.md`'s own
> banner names as having *"disagreed with the shipped code on values a session would have pasted
> straight into `globals.css`."*
>
> They were **kept deliberately, not overlooked**: the 34 `.dc.html` previews in `05-pages/` and
> `09-needle/` load their sibling `theme/` folder so the archive runs offline, and the other two
> are provenance §0b assigns a home. Deleting them breaks the previews — which was tried on
> 2026-08-11 and reverted. **Every one now opens with a `DATED SNAPSHOT` header stating its own
> drift**, so a session that greps for `--bg` and lands mid-file is warned at the point of use
> rather than three folders away. That is the §0d principle: a rule beside its value cannot be
> contradicted by a stale doc elsewhere.
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
| ~~Q5~~ | ✅ **CLOSED 2026-08-10 — GOLD IS MONEY, AND NOTHING ELSE.** Both halves shipped: the Gold asset chip and the tier ring/badge are off `--gilt` / `--gilt-metal` / `--gold-300…500`. A tier or asset may be METALLIC; it may not wear the money tokens. ⚠️ The “accept — artwork replaces it anyway” option died with Q7. Enforced by `npm run test:gold-is-money`. Rule lives in `DESIGN_AUTHORITY.md` — that file is the rulebook; this row is record. | — |
| ~~Q6~~ | ✅ **CLOSED 2026-08-10 — answered by implementation, not by Ali.** The clamp shipped on both card families: `updown-card.tsx:399-402` (`WebkitLineClamp: 2`, cites Q6 by name) and `globals.css:2782` (`.mcardp-q`). See `DESIGN_AUTHORITY.md` → *Closed here* — that file is the rulebook; this row is record. | — |
| ~~Q7~~ | ✅ **CLOSED 2026-08-10 — the `Au`/`Ag` lettermark chips are FINAL.** No artwork is coming. ⚠️ They are ELEMENT symbols, not `ticker.slice(0,2)` — XAU and XAG both start “XA” and once rendered identical chips. ⭐ This answer is what forced Q5 to a decision. | — |
| ~~Q8~~ | ✅ **CLOSED 2026-08-10 — indigo pill, NO countdown.** The timer half was refused on record: a permanent countdown in global chrome is a persistent urgency cue (an RG problem for a licensed operator) and a per-second re-render fails the “usable on a low-end Android over 2G” bar. ⚠️ Reopens by instruction, not by rediscovery. | — |

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
