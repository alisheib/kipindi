STATUS: authoritative — **THE** design rulebook of 50pick. Cited by code
(`globals.css`, `theme-provider.tsx`). Consolidated + re-verified 2026-08-08.

# 50pick — Design Authority

## ⭐ THIS IS THE ONLY DESIGN RULEBOOK. THERE IS NO SECOND ONE.

Every design law, floor, ratio, threshold and convention is in **this file**. If you
are building anything visual, you read this and nothing else is required. You do not
need `design-system/`, `design-brief/`, `design-master-brief.md` or any `spec.md` to
build correctly — those are **record**, not rule (§0c says what each is for).

> **Why this banner exists (2026-08-08).** Nine different files claimed to be the
> place to start — `design-system/README.md` ("start here for anything visual"),
> `00-START-HERE.md` ("chat histories, memories, or older files outside this archive
> have no authority" — which, read literally, voided this file), `11-material/README.md`
> ("read this before anything else"), `RULES.md` ("the laws"), and CLAUDE.md pointing
> at a different one again. They formed a **cycle**, and three of them disagreed with
> the shipped code on values a session would have pasted straight into `globals.css`:
> the canvas lightness, `--text-faint` (at a figure that fails AA), and easing tokens
> carrying baked-in durations — the exact shape that once zeroed motion platform-wide
> (§B5). A rulebook nobody can find the front door of is not a rulebook. **One door.**

This document records the **invariants** the design system must never violate.
It is cited by number in code comments (e.g. `/* DESIGN_AUTHORITY B3 */`). When a
rule lives beside the value it governs, a stale doc elsewhere can no longer mandate
a regression (that was audit finding C9).

### How to read a rule here

A rule is one of two kinds, and the difference is the whole discipline:

- **A law, floor, ratio or threshold** — stated *here*, in full, with its number.
  `≥ 4.5:1`, `≥ 40px`, `~35% expansion`, `below 0.35 px/ms nothing fires`. These are
  decisions about what is acceptable, and they belong in the rulebook.
- **A paint value** — a colour, a shadow, a duration, a radius. **Never restated here.**
  This file names the *token* and points at its ONE definition site. A value written in
  two places is a bug the moment one of them is edited (§B9), and a doc that restates a
  colour is a doc that will eventually mandate a regression. See §0d for the map.

> ### 🎨 THE COMMISSIONED MATERIAL SYSTEM IS DELIVERED, MERGED AND LAW — section M below
> The material system commissioned from Claude Design on **2026-08-06** (light source,
> elevation ladder, real gilt treatment, glyph/identity motion primitives) was accepted,
> merged into `src/` (sessions 34–35, 2026-08-07) and is codified here as **§M (M1–M8)**.
> Provenance — the delivery, the acceptance record, the four measured departures from it,
> and the designer Q&A — lives in `docs/design-system/v2-2026-07-27/11-material/` and
> `docs/design-brief/` (brief, before-picture `AUDIT.txt`, critique, `INTAKE.md` playbook).
> Adoption progress is tracked in `docs/ux-audit-2026-08/MASTER-PLAN.md` §6 (DA/DS).

**Hierarchy of truth:**
1. **`src/app/globals.css`** — the authoritative *implementation* (tokens, the live palette). Newest artifact; if anything disagrees with it, it wins.
2. **`docs/design-master-brief.md`** — palette *rationale* / ground-truth sRGB. The live tokens match it to ~0.3%.
3. **This file** — the *invariants* (what must stay true).

⚠️ **`50PICK/design_handoff_prediction_market_kit/kit/`** is a **SUPERSEDED snapshot**
(teal 215, dead `[data-theme="light"]`). **The folder no longer exists on disk** — it was
deleted in the 2026-07-15 finalization (archive: `F:/50pick-design-archive/` + git history).
Historical only. **Do NOT build from it** — following it reverts the brand to teal and
resurrects the killed light theme. If a note tells you to "consult the kit first", that note
is stale; consult `globals.css` instead.

---

## §0 — THE FILING LAW: where a design fact goes

> This section is why the consolidation holds. Without it, the next design document
> gets written somewhere new and the maze rebuilds itself in a month.

### 0a — One fact, one home

**If you find a value in two places, that is a bug. Fix it by DELETING one, never by
keeping both in sync.** Two copies do not stay equal; they diverge silently, and the
stale one is always the one somebody reads. This is the doc-level twin of §B9.

### 0b — Where each kind of design fact is written

| The thing you have | Where it goes | ⛔ Never |
|---|---|---|
| **A law / invariant / floor / ratio** | **This file**, in its lettered section | ⛔ a new top-level `docs/*.md`; ⛔ a component spec |
| **A token or paint value** | `src/app/globals.css` (or `motion.css` for timing) **at its line, with the rule as a comment beside it** | ⛔ any doc — docs *describe* values, they never *define* them |
| **A component's geometry that is genuinely code** (dial tilt maths, chart viewBox) | The component file itself, which is authoritative; this rulebook may *point* at it | ⛔ copying the numbers into a doc |
| **A component/page spec** | `docs/design-system/v2-2026-07-27/02-components/<name>/` beside its siblings | ⛔ a second specs folder |
| **An OUTBOUND commission** (the brief/package we send a designer) | `design-brief/<name>/` at the repo root — one folder per round, assembled from LIVE files at send time. While a round is **under review**, its authored `.md` files are **tracked** so a new session can read the plan; its screenshots stay gitignored | ⛔ anywhere else on disk; ⛔ carrying a COPY of this file, the tokens, or component source — a package **links**, it never bundles; ⛔ committing its screenshots; ⛔ two tracked commissions at once; ⛔ keeping the folder after the round is sent |

> ✅ **THE ROUND-2 COMMISSION IS RESOLVED (2026-08-12).** The round went out, the kit came
> back, and it was **accepted for three surfaces only** — the landing hero/banner, the
> `/markets` discovery layer, the landing composition (incl. header). The delivery is filed raw
> at `docs/design-system/v3-2026-08-11-landing-discovery/` with its `ACCEPTANCE.md`
> (INHERIT/IGNORE per file + the reconciliations where our laws beat the kit). The
> `design-brief/handover-v2-2026-08-11/` review folder and its `.gitignore` exception are
> deleted, per this row's own rule. The living application plan is
> `design-brief/PLAN-OF-RECORD.md`; the measured reference that outlived the round is
> `docs/design-brief/handover-2026-08/` (LAWS · LANGUAGE-AND-CONTENT · INVENTORY ·
> integration notes). A **total-replacement** commission was also assembled that day and the
> strategy was abandoned — if any document resurfaces ordering a from-scratch visual system or
> "ratchet allowlists regenerated at zero", it is dead; do not obey it.
| **An incoming commission from a designer** | `docs/design-system/` — an addition to the July system goes in `v2-2026-07-27/NN-<name>/`; a new dated delivery gets its own versioned folder (e.g. `v3-2026-08-11-landing-discovery/`) — raw and untouched, plus an acceptance record | ⛔ merging it into `src/` before acceptance |
| **A session handoff** | `docs/LIVE-QA-CAMPAIGN.md` §6b, at the TOP | ⛔ a new handoff file |
| **Provenance / "what the designer delivered"** | `07-provenance/` | ⛔ this file |
| **Evidence (screenshots)** | **Nowhere — it is gitignored** (`.qa-design*/`, `.qa-shots/`). A checked-in PNG is a claim nobody can re-derive. *Exception:* a shot cited by a doc as a finding's proof lives in `shots/<FINDING>/` and `test:docs` enforces that it exists | ⛔ committing regenerable screenshots |

> **Why the outbound row was added (2026-08-11).** §0b had a row for a commission coming *in*
> and none for one going *out*, so two rounds of outbound packages filed themselves: one at
> `design-brief/` (gitignored) and one unzipped at the repo root as `New Landing Design/`
> (untracked and **not** ignored — `git add -A` would have committed 2.37 MB of regenerable
> screenshots). Between them they held **27 byte-identical copies** of live files, a
> `tokens-LOCKED.css` duplicated inside a single package, and a copy of *this file* whose line 6
> reads *"THERE IS NO SECOND ONE."* Nothing in the packages was wrong on the day it was cut —
> that is the point. A snapshot is correct exactly once, and the older extract had already
> drifted: it still defined `--bg-elevated2`, retired at `globals.css:302` with the words *"Do
> not re-add"*, and told a designer the celebration amount is set in Sora, which §M4 overturned.
> **A missing filing row is not a tidiness problem — it is where the next stale truth gets born.**
> Guarded by `npm run test:design-one-door`, which now fails on a second `DESIGN_AUTHORITY.md`
> anywhere on disk, and on any index that calls something "the rulebook" without naming this file.

### 0c — What every other design file actually is

None of these is a rulebook. Each carries a header saying so.

| File / tree | What it is | Read it when |
|---|---|---|
| `src/app/globals.css`, `motion.css` | **The implementation — the values themselves.** Outranks every doc | always, for a value |
| [`docs/DESIGN-BASELINE.md`](DESIGN-BASELINE.md) | ⭐ **The state of the system after `DESIGN-GATE-2026-08-28` closed (2026-08-31): which guard holds which rule, what is deliberately left hand-typed and why, the blind spots no gate here can see, and how to add a guard.** A record and an on-ramp — ⛔ not law, and it restates no value | **first**, before adding any design work |
| `docs/design-master-brief.md` | Palette **rationale** + ground-truth sRGB | you want to know *why* a hue |
| `docs/design-system/README.md` | Index of the archive | you are looking for a delivered artefact |
| `docs/design-system/v2-2026-07-27/**` | The **July 2026 designer delivery**, frozen | you need provenance or a preview |
| `…/02-components/*/spec.md` | The designer's **original redlines**. ⚠️ Their fenced CSS blocks are stale scrapes — two carry WCAG-failing fills and nine carry the one-sided lamp §M1 bans | you want the *intent* behind a component |
| `docs/design-brief/` | The **before-picture**: the commission, the critique, `AUDIT.txt`, the `INTAKE.md` receiving playbook | you want to know what the material commission was *for* |
| `docs/design-system/…/11-material/` | Provenance for §M + the designer Q&A | you are auditing §M's derivation |

### 0d — Where values live (so this file never restates one)

| Family | Definition site |
|---|---|
| Palette, surfaces, borders, text ramp, semantic families | `src/app/globals.css` `:root` |
| Spacing `--sp-*`, radii `--r-*`, control heights `--h-control-*`, `--tap-min`, `--h-input` | `src/app/globals.css` |
| The measure (`--w-console/board/reading/form/receipt/auth`, field measure) | `src/app/globals.css` — see §B7 |
| Motion ladder `--t-*`, materials `--m-*`, easings | `src/app/motion.css` (imported LAST, so at equal specificity it outranks `globals.css`) |
| Elevation rungs `--elev-*`, `--shadow-*`, `--wash-*`, `--edge-lit*` | `src/app/globals.css` — guarded family, a second definition site is a hard `test:tokens` failure |
| Chat's own namespaced vocabulary (`--cm-*`) | `src/styles/chat/chat-tokens.css` + `src/styles/chat/chat-styles.css`, both `@import`ed by `globals.css`. ⚠️ **Added to this map 2026-08-21** — the chat layer is the one place §B5 rule 1 licenses a private scale, and a session reading only this table would not have known the vocabulary exists. It **namespaces**, never redeclares a global token |
| Tailwind aliases | `tailwind.config.ts` — a bridge only; it never originates a value |
| Glyph geometry | `src/components/ui/glyphs.tsx` |
| Dial / needle / chart geometry | the component file (`brand.tsx`, `pnl-chart.tsx`, `updown-card.tsx`) |
| Haptic patterns | `src/lib/haptics.ts` (product) and `src/lib/needle-haptics.js` (needle) — see §H |

### 0e — The tolerated exception (currently unused)

`docs/NEXT-SESSION-*.md` is a **tolerated exception, not a pattern**. There must never
be two. When its work is done, delete it.

✅ **2026-08-21: there are none.** The single instance, `NEXT-SESSION-MATERIAL-VISIBLE.md`,
carried its own delete-condition — *"delete it when the DA/DS sweep closes"* — and that
condition fired on 2026-08-10, when the sweep closed at 93/93. It sat there for eleven days
after it was spent, which is exactly how a finished prompt gets re-read as live instruction.
It is deleted; the durable record is `LIVE-QA-CAMPAIGN.md` §6b.

---

## B1 — Palette is royal 268

The brand hue is **royal indigo, OKLCH hue 268** — matching `design-master-brief.md`
(`#060A50` → hue 268). It is **not** teal 215. Core tokens, verified against the brief:

| Token | Hex | OKLCH | Role |
|---|---|---|---|
| YES | `#00A24F` | `oklch(62% 0.17 152)` | winning / affirmative money surface |
| NO | `#E6424C` | `oklch(62% 0.20 22)` | losing / negative money surface |
| Gilt | `#D49824` | `oklch(72% 0.14 78)` | needle, hub, accents |
| Canvas royal | `#060A50` | hue 268 (L deepened to ~15% by design) | app background |
| Aqua | `#36BABA` | `oklch(72% 0.110 195)` | finishing accent only (see B4) |
| Claret | `#A4273F` | `oklch(48% 0.160 15)` | editorial weight only (see B4) |

`src/app/globals.css` is authoritative for the exact values. Brand-identity hexes in
`src/components/brand.tsx` (`#1EA362`/`#B03A3E`/`#E3BC66`) are a deliberate byte-identical
port of the delivered logo `mark-a.svg` and are allowed to diverge from theme tokens —
brand identity ≠ theme tokens.

### B1a — ⭐ THE MARK ITSELF, and the two things people get wrong about it

Recorded 2026-08-06 because an outside design pass reconstructed the mark from prose as
*"the '50' on royal enamel over a −14° baton"* — and **both halves of that are wrong.**

**What the mark is** (`src/lib/brand-mark.ts`, the ONE definition — audit C11; delivered
`mark-a`, 2026-07-09): a circle split **YES-emerald LEFT · NO-rose RIGHT** by a diagonal
chord, the **gilt NEEDLE** riding the seam past the rim, over a gilt hub with a navy pivot.
⛔ **No ring, no numerals** — the wordmark carries the name.

1. ⛔ **There is no "50" glyph in the mark.** A coin face bearing numerals contradicts the
   canon. The name lives in `FiftyWordmark`; `FiftyLockup` is mark + wordmark, and the
   delivered lockups are `public/brand/lockup-horizontal.svg` and `lockup-stacked.svg`.
2. ⛔ **It is a NEEDLE, not a baton** — the same object as `TippingBar` and the conviction
   dial. The mark is not a logo that sits near the UI; it is **the UI's own instrument
   reduced**, and anything built on it must read as that instrument.

**The −14° axis is measured from this artwork, not chosen.** From the shipped coordinates
(`x1 38.39, y1 3.43 → x2 61.61, y2 96.57`): `atan(23.22 / 93.14) = 13.998°`, so
`--m-tilt: -14deg` is accurate to three significant figures. Negative because the needle's
top leans **left** of centre. ⚠️ `@keyframes m-axis-sweep` in `motion.css` writes `-14deg`
**literally** — `skewX()` cannot take a custom property in every engine we support — so it is
the one place the number is duplicated and it must move with the axis.

⛔ **Never hand-edit a GENERATED brand asset.** `scripts/build-brand-assets.mts`
(`npm run build:brand`) writes exactly eleven files from `brand-mark.ts`, and its own header
lists them: `public/brand/mark-{color,white,dark,simplified}.svg`, plus
`public/icons/{mark-color,mark-white,mark-dark,maskable,tile}-512.png`, `icon-192.png` and
`apple-touch-180.png`. Editing one of **those** directly is how the PWA icon and every outbound
email once shipped the superseded round-1 logo. **Change the source, regenerate.**

⚠️ **Corrected 2026-08-21, and the error ran in the dangerous direction.** This rule read
*"Every SVG and PNG under `public/brand/` and `public/icons/` is generated"* — which promises a
session that a regeneration will undo whatever it breaks. It will not. Six of the files in
those folders are **held, not generated**, and `build:brand` never writes one of them:
`lockup-horizontal.svg` and `lockup-stacked.svg` (the delivered lockups named two paragraphs
above), `email-signature.png` (`docs/EMAIL-SIGNATURES.md` serves it from the live domain), and
the three `icons/shortcut-*.png` cited by `public/manifest.json`. `favicon.svg` / `favicon.ico`
sit at `public/` root and are outside the generator too, as is anything else that has ever been
dropped into `public/icons/` by hand. An edit to any of them is unrecoverable by rerunning the
script — so for those the instruction is the opposite: **there is no source to change; keep the
file.** ⭐ The reliable test is not the folder, it is the script: if a filename is not in
`build-brand-assets.mts`, `build:brand` will not produce it.

⚠️ **And the mark's gold stays `#E3BC66`.** Any satin/material recipe adopted for *surfaces*
does not apply to the trademark — that is this rule's parent, B1, applied to the one place it
matters most.

**Reproduction law** (enforced in `FiftyMark`, which auto-switches below 24px): full mark
min **24px** · simplified min **14px** · clear space **0.25 × diameter**.

📌 **The per-player heraldic crest (`ui/identity-avatar.tsx`) is a SECOND system** and must not
borrow from the mark. E-111 fixed its sub-pixel geometry (every stroke now carries a 1-CSS-px
floor, guarded by `test:crest-legibility`); its band opacity and material remain open.

**Type:** Sora (display, `--font-display`) · Inter (body) · JetBrains Mono (money + numerals),
all Google Fonts under **SIL OFL 1.1** — commercial use, embedding and web serving, no in-UI
attribution. The wordmark is *set in Sora*; there is no separate logotype to license.

## B2 — YES / NO semantics are untouchable

Green means YES/win; rose means NO/loss. This mapping is load-bearing for a money
product and must never be inverted, re-hued, or reused for a non-money meaning. The
two together form the core betting control; their duality (one light-labelled, one
dark-labelled where contrast requires) must be preserved.

### B2a — Success and danger are APP-STATE colours; the betting pair is never borrowed (D2)

Added 2026-08-21 — **D2, Ali's ruling, applied at its stated default.** Green-for-good and
rose-for-bad are two *different facts* on this platform, and they sit close enough in hue to
be mistaken for one:

- **YES / NO are MONEY.** They name the side a player's stake is on. They belong to the
  betting controls and to the chips that carry a side, and §B2 above makes them untouchable.
- **Success and danger are the state of the INTERFACE** — saved, healthy, failed, refused.
  They are app states, they have their own semantic tokens, and they are not money.

⛔ Never reach for the betting pair to express an app state: a surface that says *saved* in
the YES ink has spent the money vocabulary on chrome, and the next player to see that green
has one less reason to read it as their side. ⛔ And never re-hue a state token toward the
betting pair to "match" — that closes the gap from the other end. Each family has its own
definition site (§0d); ⛔ no value is restated here.

🔴 **D2 MINTED THE TOKENS AND MIGRATED NOTHING — for nine days.** Found 2026-08-30, DG-A-21.
The ruling above names its own three motivating examples: *"a saved password, a confirmed
e-mail and a settled RG limit"*. On the day this was re-derived, **all three were still painted
in the betting ramp** — the password-strength meter in `ui/password-input.tsx` (whose tone
variable is literally named `danger` while it painted `bg-no-500`), the e-mail-confirmed pills,
and the responsible-gambling **support panel**: a helpline callout, on the page a player opens
when gambling is hurting them, in the colour that means *your bet won*. ⭐ **A ruling that mints
a token is half a ruling.** The tokens existed and were correct; nothing had adopted them, and
nothing went red, because a guard that reads a token's *definition* cannot see its *absence*.

✅ **THE SHARED KIT IS MIGRATED (2026-08-30).** That is where reach multiplies: the five field
atoms (`input`, `password-input`, `date-select`, `duration-input`, `time-select`) painted every
validation error on the platform — player and admin — in the betting rose, and shared one
hand-typed `oklch(58% 0.2 25 / 0.08)` errored wash across all five. ⭐ **That literal's hue is
25, which is `--danger`'s, not `--no-*`'s 22** — five files had been hand-typing the danger
colour without the danger token, so tokenising it as `--danger-wash` was a NAME fix that moved
no pixels and cleared five entries from `design-frozen`'s ratchet. Also migrated: `route-error`
(17 boundaries, and its own header had sanctioned "the only `--no-*` here" while three sites
carried it), `empty-state`, `notice-bar`'s tone literally named `success`, `search-box`, and
`lib/score-band.ts` — the shared helper a 2026-08-21 tombstone had named while repairing only
its own consumer.
⚠️ **The residual is real and it is NOT the console.** Re-derived at HEAD: the betting pair is
used as a non-money tone in **~414 lines across ~125 files** (comments stripped); only ~131
lines / 43 files are admin. So a console-scoped work order measures about a third of it. ⛔ A
guard over all of `src/` therefore **cannot land at zero** and would only ever be a baseline —
scope one to `src/components/ui/` + `src/lib/`, the sub-population that can.
⛔ **`ui/chip.tsx` binds ONE `GREEN` object to both `yes` and `success`** (and `ROSE` to both
`no` and `hot`), so §B11's dictionary itself routes every console APPROVED and LIVE chip into
`var(--yes-300)`. That is B2a broken beneath B11 — and splitting it is **Ali's call**, not a
session's: the file carries a dated counter-note that the pairs "share ONE style object so the
pair can never drift apart" and that collapsing them is "pending Ali's sign-off". Choosing the
right *name* at a call site is free and correct; splitting the object is not.
⛔ **And `.btn-yes` is not `.btn-primary` with a different fill.** It also sets `font-weight:
700`, `letter-spacing: 0.06em` and a text-shadow that neither `.btn-primary` nor `.btn-danger`
carries. Every betting-ink button swap is therefore a *typographic* change as well as a repaint
— which is the correct outcome (an operator's Approve should not wear the weight of a stake),
but it must be seen, not assumed.


## B3 — Single dark-royal theme. No light mode.

The product has **one theme: dark royal.** Light mode was deliberately killed and
correctly removed. `color-scheme: dark` is forced in `globals.css`. There are:
- 0 light-theme selectors (`[data-theme="light"]`, `.light`, `prefers-color-scheme`)
- 0 `next-themes` imports, 0 theme toggles
- 0 `dark:` variants

**Do not re-introduce a light theme.** Every WCAG contrast ratio the product proves is
computed for this one surface; a resurrected light mode would be an entirely unverified
contrast surface on money screens.

## B4 — Claret editorial-only; aqua ≤ 8% coverage

- **Claret** (`#A4273F`): editorial weight only — Politics chip, Sovereign tier,
  regulator/footer crest. **Never** on YES/NO money surfaces or adjacent to NO-rose.
- **Aqua** (hue 195): finishing pass only, **≤ 8% surface coverage**. Never a chip,
  button label, or anything semantic.

These usage rules are already encoded in the `globals.css` token comments; this is
the canonical statement of them.

### B4a — Claret is the colour of an irreversible operator ceremony (D3)

Added 2026-08-21 — **D3, Ali's ruling, applied at its stated default.** Editorial weight is
not claret's only job. **In the operator console, claret marks the act that cannot be taken
back** — the ceremony an officer performs once and then lives with: a settlement sealed, an
erasure executed, a market voided and refunded, an objection that is *freezing a market's
money* while it stands.

⛔ Claret is not "danger" and it is not "error". Rose already says *this failed* / *this was
refused*, and a recoverable mistake must never borrow the colour reserved for the one that
cannot be undone — if everything alarming is claret, nothing is. ⛔ And the rule above still
stands whole: never on a YES/NO money surface, never adjacent to NO-rose.


### B4b — The one sanctioned aqua surface (D6)

Added 2026-08-21 — **D6, Ali's ruling, applied at its stated default.** `/admin/live` is the
single named exception to *"aqua is a finishing pass, never semantic"*: it is an internal
operations console carrying live telemetry, no player ever reaches it, and it is an exception
**by name** — ⛔ no other surface inherits it, and citing this line to justify aqua anywhere
else is a misreading of it.


---

## B11 — The status-colour dictionary: one word, one tone, per surface

Added 2026-08-21 — **D4, Ali's ruling, applied at its stated default.**

§L2 gave a status **word** one definition site. Its **colour** had none. So the same word was
painted differently depending on which file happened to render it — and **not one of the
divergences was written down**, which is the part that matters: an undocumented difference
cannot be told apart from a mistake, so the next session "fixes" it in whichever direction it
read first and the drift simply changes shape.

Measured across the platform on 2026-08-21: **LIVE** was red-rose to a player, success-green
in the console and royal on `/proposals`; **RESOLVED** was a struck gilt gradient to a player
and a soft translucent gilt in the console; **CLOSED** and **PENDING** were royal to a player
and amber in the console; **APPROVED** was green in the KYC queue and a **solid gold
gradient** on `/proposals`; **REJECTED** was rose, slate or claret depending on the queue;
**OPEN** was info-royal to a player and claret to an officer.

**THE LAW.** A status word's tone is decided **once, per surface**, in
`src/lib/status-tone.ts`, and every render site consumes it. ⛔ A chip variant hand-typed
beside a status label is a second definition of a design fact (§0a, §B9). If a surface
genuinely needs a different tone for a word, it goes in that file's
`STATUS_TONE_EXCEPTIONS` **with its reason**, or it does not ship — a divergence written down
as a decision stops being a drift.

**THE DICTIONARY.** Tones, never values — the paint lives in `src/components/ui/chip.tsx` and
`globals.css` (§0d). The three *italic* cells are what this ruling changed.

| Word | Player | Console (admin) | `/proposals` |
|---|---|---|---|
| **LIVE** | broadcast red | success green | royal |
| **CLOSED** | royal | *royal* (was amber) | — |
| **PENDING** | royal | *royal* (was amber) | royal |
| **RESOLVED** | struck gilt | soft gilt | struck gilt |
| **APPROVED** | — | success green | *success green* (was struck gilt) |
| **REJECTED** | — | rose | claret |
| **OPEN** | royal | claret | — |

**The three corrections.**

1. **APPROVED is success-green everywhere.** `/proposals` was the last surface on the
   platform painting an approval with the struck gold gradient. §M3: struck gold means money
   that was **earned** — and an approval is not money, it is permission.
2. **PENDING is royal everywhere**, and **3. CLOSED is royal everywhere.** The console loses
   amber for both. A file waiting its turn in a queue, and a market waiting to be resolved,
   are the *normal* state of a queue and of a market; amber told an officer something was
   wrong while the player's own screen called the same state royal.

That leaves **amber with exactly one meaning in the console**: *an officer must do something
that is not simply waiting* — "More information needed", a cooling-off period, a payment
awaiting a decision. Slate keeps its own: **terminal or inert**.

**⛔ THE ONE KEPT SPLIT — LIVE — AND IT IS A DECISION, NOT A LEFTOVER.** LIVE is two facts
wearing one word. To a **player** it is a broadcast — *this is open, money is moving, act
now* — and the red live-pill is the platform's oldest and loudest signal of exactly that. To
an **officer** it is operational health — *this market is up* — sitting in a column beside
DRAFT and VOIDED, where red would read as an incident. Painting both the same would make one
of the two lie about what it is for. `/proposals` keeps royal: a listed proposal is a
lifecycle step reached, not a market broadcasting that it is taking money.

**The other recorded divergences** — decisions, not drift, each with its reason in
`STATUS_TONE_EXCEPTIONS`:

- **REJECTED** is rose in KYC/DSAR (a person was refused), claret on `/proposals` (an
  editorial decline, §B4) and deliberately **slate on the objection queue** — a rejected
  objection is a closed file, and rose there would read as though the player had done
  something wrong by objecting.
- **CLOSED** is royal as a *market lifecycle stage* and stays **slate as a terminal account
  state**. Royal would give a dead account the tone of a live one. The ruling's operative
  clause is that the console loses **amber** for CLOSED; slate was never amber.

**Migration state — a RECORD, re-derived 2026-08-30 (DG-P-10), named so nothing is mistaken
for done.** The console (`components/admin/status-badge.tsx`) and `/proposals`
(`components/proposals/status-badge.tsx`) have read the dictionary since 2026-08-21. **The
Player column now has readers too**: `markets/market-card.tsx`, `home/trust-band.tsx`,
`updown/history/page.tsx` and `updown/[roundId]/page.tsx` take their tone from
`STATUS_TONE[word].player`. **VOID joined the table** in the same pass — measured, not chosen:
five player surfaces already painted it royal and the console's market table already painted it
slate, and its third tone (the resolver's claret, §B4a) is now recorded in
`STATUS_TONE_EXCEPTIONS`.

⚠️ **Two corrections to what this paragraph used to say.** It named three files; two were
right and the third was not. `results/page.tsx` has never hard-typed a chip **class** — it
renders the kit `<Chip>` and hand-types the **variant** (`"pending"`, `"resolved"`), which is
still a §B11 site by the law above but a different defect with a different fix. And it never
named `home/trust-band.tsx` or `updown/[roundId]/page.tsx`, which held the same defect.

**Still hand-typed, on a PLAYER surface, and each one is one of two kinds:**

- *Agrees with the dictionary — a NAME fix at zero visual risk.* `markets/resolution-panel.tsx`
  (VOID · RESOLVED) · `updown/updown-card.tsx` (CLOSED · PENDING) ·
  `updown/round-action-panel.tsx` (CLOSED) · `markets/[id]/page.tsx:403,420` and
  `results/page.tsx:567,568` (kit variants beside LIVE · RESOLVED · VOID).
- 🔴 *DISAGREES with the dictionary — each is a REPAINT and needs a screenshot, not a sweep.*
  `markets/[id]/page.tsx:411-418` paints **CLOSED in the gilt family** (`--warning-fg` resolves
  to `--gilt`) on the player's own market page, while that market's card renders CLOSED royal —
  correction #3 running backwards on the surface it was written to protect.
  `markets/position-card.tsx:68` paints **OPEN as `info`**, not the royal the table gives it.
  `profile/account/page.tsx:70-73` paints **PENDING_KYC amber** (the console was corrected off
  amber for exactly this word), a **CLOSED account rose** where the exception above says slate,
  and **ACTIVE in the betting-YES token** (§B2a). ⛔ None of these three belongs in
  `STATUS_TONE_EXCEPTIONS` — writing a drift down as a decision would repeal the ruling by
  paperwork.

⚠️ **And a status pill is not always a chip.** `wallet/receipt/[id]/page.tsx` holds a file-local
constant *named* `STATUS_TONE`, shadowing this module's export, hand-typing seven payment tones
as Tailwind classes on a hand-rolled pill; `wallet/wallet-client.tsx` paints QUEUED amber;
`profile/email-editor.tsx` and `profile/kyc/page.tsx` dress app states in the betting-YES pair.
A census that only greps `chip-*` cannot see any of them.

**Re-derived at 2026-08-30, comment-stripped over all 487 `.tsx` + 320 `.ts` files under
`src/`** (`/\bchip-(live|resolved|pending|objection|hot-rose|signal|new|yes|no)\b/`): raw chip
colour classes went **50 → 34**; the player subset **33 → 17**, of which the outcome chips
(`chip-yes`/`chip-no` on UP/DOWN and YES/NO) and the board's crowd-signal flags are not §B11
sites at all. The console's own 17, in four files, are untouched and still owed.

---

## Accessibility floor (see audit H10)

Money controls must meet WCAG AA (≥ 4.5:1 for text on button fills, ≥ 3.0:1 for
control borders). Where a token fails, **darken the fill** rather than lighten the
label, to preserve the YES/NO convention. Contrast is re-checked by
`scripts/` contrast tooling on any token change.

## B6 — A settled outcome is READ, never inferred

Added 2026-07-20 after users reported resolved cards contradicting the detail page.

`market-card.tsx` rendered the settled result as `yesPct >= 50 ? YES : NO`. `yesPct` is
`impliedYesPct()` — `yesPool / (yesPool + noPool)`, the crowd's **money split**. It is
mathematically unrelated to how the market settled. On any upset (crowd 70% on YES, market
resolves NO) the board displayed the **opposite of the truth**, while `/markets/[id]` — which
reads the real `resolvedOutcome` — displayed the correct one. A user clicked a card marked
"RESOLVED YES" and landed on a page saying NO. The card had no `resolvedOutcome` prop at all,
so it could not have been right except by luck.

**Measured on production before the fix: 4 of 8 sampled resolved markets displayed the wrong
outcome** — half the resolved board. Three were lopsided pools at 100% YES that settled NO, so
the card read "RESOLVED YES" while the detail page read NO. After the fix, 8/8 card↔detail
agreement live.

The rule: **the settled side comes from `PredictionMarket.resolvedOutcome` or it is not
shown.** Never derive it from a probability, a percentage, or a pool comparison. When the
outcome is unknown, render "RESOLVED" with **no** side — an absent side is recoverable, a
wrong side is a false statement about someone's money.

Note *why* it skewed: a lopsided market (everyone on one side) pins `yesPct` to 100/0, so the
inference was **most confidently wrong exactly where the pool was most one-sided** — and those
are the markets where a refund or an upset matters most to the people who staked.

This generalises: on a money surface, prefer showing nothing to showing a guess.

**Full-surface audit (2026-07-20) — the defect was isolated to `market-card.tsx`.** Verified
clean: `resolveMarket()` and the whole payout path take the officer-supplied outcome as input
(`winningSidePositions = filter(p => p.side === opts.outcome)`) and never infer; `/positions`
uses the stored per-position `status === "WIN"|"LOSS"` written at settlement; `/results`
counters filter on `resolvedOutcome`; the win-share OG card resolves its side from an
HMAC-signed token re-read from the ledger; emails/notifications never state a side. A codebase
sweep for pool comparisons (`yesPool > noPool` and friends) and percentage thresholds returns
**zero** hits outside the payout math itself.

Two enforcement layers:

- **`scripts/outcome-display.test.mts`** (`npm run test:outcome`, in `test:all` + `predeploy`)
  — static. Fails on (1) a YES/NO ternary keyed off *any* probability variable, raw percentage
  or direct pool comparison, (2) a `<MarketCard>` that can render RESOLVED without passing
  `resolvedOutcome`, (3) the card reintroducing inference. Verified to fail on both the
  original `yesPct >= 50` line and a `yesPool > noPool` variant, and to pass on the fix.
- **`scripts/outcome-parity.mjs`** (`npm run qa:outcome`) — behavioural, against the running
  site. For every resolved market on the board it opens the detail page and asserts the two
  outcomes agree. This is the check that would have caught the user report directly. Live
  result after the fix: **14/14 match**, including a VOID.

---

## B5 — One definition site per motion token; easings are bare curves

Added 2026-07-20 after motion was found **silently dead across the whole platform**.

`globals.css` defined `--ease-micro: 100ms cubic-bezier(…)` — a shorthand with the duration
baked in. `micro-patterns.css` loads *after* it and redefined the same name as a bare curve.
Last declaration wins, so every rule written as `transition: border-color var(--ease-micro)`
expanded to a transition with **no duration → 0s**. Input focus rings, selects, textareas,
tabs, button shadows, progress bars and the probability-chart crosshair all snapped instantly.
Nothing errored. The same shadowing set `--dur-stage` 820ms → 240ms (countdown ring and chart
draw-in ran 3.4× too fast), killed all four chat easings (the AI panel had **zero** motion),
and let a button drop-glow overwrite the ambient badge `--glow-gold`.

The rules:
1. **A motion/elevation token is defined in exactly ONE file.** `globals.css` owns
   `--ease-*`, `--dur-*`, `--glow-*`, `--shadow-*`. Other stylesheets *consume*, never redeclare.
   A stylesheet needing its own scale must **namespace** it (the chat layer uses `--cm-*`).
2. **Easing tokens are bare curves.** No duration baked in. Ever.
3. **Every `transition`/`animation` states a duration before the easing:**
   `transition: opacity var(--dur-micro) var(--ease-micro);`

Enforced by **`scripts/token-collision.test.mts`** (`npm run test:tokens`, in `test:all` and
`predeploy`). It fails on a cross-file duplicate, a duration-bearing easing token, or a
duration-less transition. It caught a real regression during its own introduction — the chat
`prefers-reduced-motion` block was still overriding the pre-rename token names.

**Honest scope of the 2026-07-20 fix.** The token layer was genuinely broken, but not every
repaired rule reaches a user — several are dead CSS with zero component usages. Measured:

| Repaired rule | Component usages | User-visible? |
|---|---|---|
| chat easings (`--cm-*`) | whole chat panel | **yes** — panel had *zero* motion |
| ~~`.countdown-ring .ring-arc`~~ | **0** | ⚠️ **no — the row was wrong when written, and the class is now gone.** See the correction below |
| `.pchart-*` (draw-in, crosshair) | 2 | **yes** — draw 240→820ms, crosshair 0s→120ms |
| `.input` / `.select` CSS classes | 3 / 2 | partly — the `Input` **atom** uses Tailwind `transition-all duration-150`, not `.input`, so most fields were never affected |
| `.pbar-yes` / `.pbar-no` | **0** | no — dead CSS |
| `.win-seal`, `.badge-unlock-coin`, `.win-card-rare` | **0** | no — dead CSS (the `--ease-celebrate` phantom 600ms delay was real but unreachable) |

Do not cite this fix as "restored motion everywhere". It restored the token *contract*; the
visible delta measured in 2026-07 was the chat panel and the probability chart — the third
item this sentence named for a year, the countdown ring, was never in it. See below.

⚠️ **CORRECTED 2026-08-21 — a law doc was asserting a measurement that HEAD contradicts.**
Two rows above have moved, and one of them was never true:

- **`.countdown-ring .ring-arc` had ZERO consumers, not 3, for the life of the project**, so it
  was never part of the visible delta. The shipped ring is
  `src/components/positions/countdown-ring.tsx`, which composes its own inline SVG and has never
  touched these classes. The `.countdown-ring` block is **deleted** from `globals.css` in the
  dead-CSS sweep, and the comment above `--dur-stage` records the same correction. What actually
  consumes the 820ms rung now is `.badge-ring-arc`'s `stroke-dashoffset` transition, plus
  `.badge-unlock-rays` and `.m-draw`. ⛔ Do not restore a `.countdown-ring` rule to "support" the
  component — the component does not read CSS classes for its arc.
- **`.win-seal` and `.win-card-rare` are deleted** (E-128 / DA-8, 2026-08-07, with the rest of
  the dead `win-*` family). The row is kept because its *lesson* is the point — an unreachable
  `--ease-celebrate` delay measured as real — but the class names in it no longer exist.
  `.badge-unlock-coin` survives and still has zero consumers.

The remaining rows were re-verified at HEAD and stand: `.pchart-*` is live
(`probability-chart.tsx`), and `.pbar-yes` / `.pbar-no` are still 0-consumer dead CSS, kept
deliberately because `.pbar` is a documented kit atom with its own spec page and preview.

⭐ The general lesson, since this is the second measurement table in this file to rot: **a
usage count is a measurement of a moment.** Date it, name the file that would prove it, and
re-derive before citing it — never copy the number forward.

---

## B7 — The measure: every page states its width, once

Added 2026-07-28 after users reported that "sometimes the pages are too wide, and
the input fields as well". Both halves were true, and neither was anyone's
mistake — **there was no rule.** This file had B1–B6 and the design-system
`RULES.md` had 12 laws; neither mentioned width. The only statement anywhere was a
stale line in `CLAUDE.md` that the code did not match.

So width was a hand-typed string (`mx-auto max-w-[1280px] px-3 lg:px-6`) repeated
~60 times, drifted into **eight** page tiers where three were documented, and:

- `src/app/admin/layout.tsx` had **no cap at all** — all 43 admin pages rendered at
  `100vw − 216px`: 1,704px at 1920 and **2,344px at 2560**, while the player chrome
  above them was capped at 1280.
- The `Input` atom had a height, a radius, a border, a background… and **no width
  rule** (`size` is height-only). Every field was as wide as whatever page it
  landed on — `/admin/markets/new` measured **1,492px** text boxes.
- `notice-bar.tsx` was 1480 against 1280 chrome and renders only on an
  announcement / unconfirmed email / offline state. That is the **"sometimes"**.

**The rules.**

1. **Six tiers, and the numbers live in `globals.css` only.** `console` ·
   `board` · `reading` · `form` · `receipt` · `auth` (auth is the split-pane
   exception, not a general tier). `tailwind.config.ts` maps names onto the vars
   and adds no values of its own. This file deliberately does not restate them —
   a rule beside its value cannot be contradicted by a stale doc elsewhere.
2. **A page states its width through `<PageContainer tier>` and nothing else.**
   The tier is a TS union, so an invented width is a compile error, and it stamps
   `data-measure` so the width can be *measured* at runtime rather than trusted.
3. **A page and its `loading.tsx` state the same tier.** `/updown/[roundId]` was
   1232 against a 1080 skeleton — a 152px jump on every load that no test could see.
4. **A field never exceeds the measure its `<FormColumn>` sets.** `--field-max`
   defaults to `none`, so the cap is opt-in per form and an inline admin toolbar
   still flexes. Six atoms carry `.field-measure`; `OtpInput`,
   `DateTimeRangeFilter` and `TimeSelect` are documented exemptions and the guard
   asserts they *stay* exempt.
5. ⛔ **A page never renders its own `<main>`. The shell owns that landmark.**
   Added 2026-08-22. `AppShell` renders `<main id="main-content">` in the ROOT
   layout, so every route already has one — admin, auth and legal included. The
   only exemptions are `app-shell.tsx` itself and `app/global-error.tsx`, which
   renders its own `<html>`/`<body>` because the root layout never ran and so has
   no shell above it. `PageContainer` **cannot** render a `main`: `"main"` is not
   in its `as` union, so `tsc` is the guard at every call site.

**Rule 5's measured defect, because it is the reason rules 2 and 5 are one rule.**
Measured on production 2026-08-22, signed in, at 1280: **six of eight sampled
routes rendered TWO `<main>` elements, one nested inside the other** — `/markets`,
`/notifications`, `/results`, `/wallet`, `/profile`, `/legal/privacy`. A behavioural
sweep the same day put it at **17 of 17** player routes. Nested `main` is invalid
HTML, gives a screen reader two "main content" landmarks to choose between, and
the skip-link (`#main-content`) resolves to the OUTER one while the page's real
content begins inside the inner one. `landmark-no-duplicate-main` and
`landmark-main-is-top-level` are default axe rules and both fired.

⭐ **The 44 files doing it were exactly the population rule 2 was still migrating.**
A page that hand-typed `mx-auto max-w-[1080px] px-3 lg:px-6 py-6` on a `<main>` was
simultaneously a nested landmark, a hand-typed width, and a page whose `loading.tsx`
tier parity nothing could check — so ONE `<PageContainer tier>` edit closed all
three, and the ratchet falling is the proof it happened: **59 → 12**. The 12 that
remain are held back by **padding, not width** (`py-10`, `py-12`, `lg:py-8`,
`px-4`, and four full-height centring compositions); each is named with its reason
in `scripts/measure-system.test.mts`, and finishing them is a design decision, not
a rename.

⚠️ **Two guards were found asserting less than they claimed, both by the red
harness rather than by review** — the finding worth keeping:
- `decomment()` stripped **block comments before line comments**, so a `/*` inside
  a `//` comment (`// … deep links to /proposals/* are`) swallowed everything to
  the next `*/`: **7,581 characters across five files invisible** to the ratchet,
  the parity check and the call-site check, all of which reported PASS.
  🔴 **CLOSED 2026-08-23 (`E-188`) — AND BOTH HALVES OF WHAT WAS WRITTEN HERE ON THE
  DAY TURNED OUT TO BE WRONG. Read this part, not the paragraph it replaced.**
  · **THE FIX IS NOT AN ORDER.** Flipping the two `replace` calls does not remove the
    blindness, it MOVES it: line-comments-first means a `//` *inside* a block comment
    eats that block's terminator, the opener runs on to the next one, and the code
    between vanishes. Measured across `scripts/`: **5 sites**, the worst costing
    **~7.7k characters of `criterion-i18n.test.mts`** — which `pii-in-logs.test.mts`
    §3 genuinely reads, because it strips comments from every top-level `scripts/*.mts`.
    ⭐ **A pair of regexes cannot know it is standing inside a comment, so every
    ORDER is a choice of which blindness to have.** The fix is a **single-pass
    scanner** — `scripts/lib/decomment.mts`, walk once, first delimiter wins — which
    is **byte-identical to the flipped version across all 770 files of `src/`**, so
    adopting it changed no verdict. `test:decomment` §4.1 re-derives that equivalence
    rather than quoting it.
  · **THE POPULATION WAS AN UNDERCOUNT TWICE OVER.** A name-based grep said 18 and was
    wrong; counting the ORDERING as a fixed string says 22 and is **also** wrong. The
    real number of private strippers was **39**. `orphan-actions.test.mts` carried the
    identical two-regex ordering and hid from the fixed-string count purely by naming
    its parameter `src` instead of `s`; the other 16 pad comments with spaces, use a
    lookbehind, or add a JSX clause. ⭐ **A stripper is a SHAPE, not a string** — both
    counts keyed on the BODY, so both missed. `test:decomment` §2.2 looks for the
    declaration instead.
  · 🔴 **AND THE FIRST SCANNER SHIPPED WITH A REGRESSION OF ITS OWN (`E-189`), found
    the same day by adversarially reviewing the commit.** It had **no string-literal
    state**, so a `/*` inside a STRING or TEMPLATE opened a block comment running to
    the next terminator or to EOF — `full-flow-audit.mjs` decommented to **11% of
    itself**, and the identical planted violation was FOUND at line 425 and INVISIBLE
    at line 374 of `comms-email-truth.test.mts`. ⛔ **That was a REGRESSION, not an
    inherited limit:** the old regex is non-greedy and needs a closing terminator, so
    with none it simply does not match and the code survives. The scanner now tracks
    literals, KEEPS an unterminated block rather than swallowing it (text wrongly kept
    is a loud false positive; text wrongly removed is a silent false negative), and
    preserves newlines so line numbers do not move.
  · ⭐ **`test:decomment` §4 compares the shipped scanner against an INDEPENDENTLY
    WRITTEN reference tokeniser over all 1,498 files** — the only automatic way to
    catch a whole state the author forgot existed. It found two more real bugs the
    moment it existed.
  · **NOW:** one shared, literal-aware scanner with **27 importers**, `test:decomment`
    **22/22**, `red:decomment` **12/12 proven**, `test:red-anchors` **383/383**.
    ⚠️ **The migration is roughly a third done and the honest count is 55, not 14** —
    the first number came from looking for a DECLARATION named `decomment`/
    `stripComments`, and several converted files carry a SECOND, INLINE stripper
    further down (`outcome-display.test.mts:143`, `feedback-law.test.mts:123`). §2
    ratchets the shape-count, which no rename or inlining can dodge. ⛔ **One reason
    published here was false — "a plain `.mjs` cannot import a `.mts` module". Node 24,
    which this repo pins, does it fine.** ⛔ Do not tidy any of them into `decomment`
    without capturing that gate's full output before and after.
- The page/`loading.tsx` tier-parity check **compared 29 of 80 pairs and skipped
  51 in silence**, because a route that delegates its body to a sibling client
  component (`/wallet` → `./wallet-client`) stated no tier the check could read.
  It now follows one hop through same-directory imports and **prints its coverage**,
  so it can never again claim more than it measured.

**Why it survived every QA cycle, which is the part worth remembering:**
`scripts/responsive-audit.mjs` asserted `scrollWidth ≤ clientWidth`, tap targets
and off-screen overlays. **Every one of those is a lower bound**, and the sweep
stopped at 1920. A 2,400px form scored a clean pass. A gate that can only detect
*too narrow* will never report *too wide*.

Three enforcement layers:
- **`npm run test:measure`** — static. Tokens defined once with the expected
  values; no new hand-typed width ≥500px outside a ratchet list that may only
  shrink; page/loading tier parity **plus its coverage count**; the admin cap
  present; the field atoms and their exemptions; and (rule 5) **no file under
  `src` renders a `<main>` except the two named exemptions**, with the shell's
  skip-link target asserted still to exist so a sweep cannot delete the right one.
- **`npm run red:measure`** — the RED harness for the above. Five mutations,
  **5/5 proven** on 2026-08-22: the nested `<main>` put back, the shell's `<main>`
  demoted, a hand-typed width re-added to a migrated page, a page and its skeleton
  disagreeing on the tier, and the old comment-stripper restored (that one is
  *inverted* — it must WRONGLY pass, which is what makes the blindness visible).
  It mutates a **copy** of the tree in the OS temp dir and aims the gate at it with
  `MEASURE_ROOT`; it never writes to `src/`.
- **`scripts/responsive-audit.mjs`** — behavioural, now **three-sided**: a 2560
  breakpoint, per page "exactly one measure root, within its tier", and **exactly
  one `<main>`, which must be `#main-content`**. Verified to fail on the
  reintroduced bug (`console 2344px > 1600px` on every admin route) and to pass on
  the fix; the landmark check was red-proven **against production** — 17 of 17
  player routes reporting `2 <main>: #main-content | #(no id) NESTED` — before a
  single page was migrated.

- **`npm run qa:landmark-seal`** — the live, **signed-in** seal, added 2026-08-23
  because `test:responsive` cannot be one. That audit signs in with `/auth/demo`,
  which is dev-only and 404s in any production build, so against production it runs
  as a GUEST and prints a green cell named `/wallet` that measured `/auth/login`
  (`E-187`). This uses a real QA-fleet session and **asserts each gated route
  resolved to itself**, so a redirect can never read as a pass. Per cell: one
  `<main>`, id `main-content`, not nested, skip-link + target present, `<html lang>`
  matching the locale, zero overflow. First green **171 cells · 0 problems**
  (10 public + 9 gated × 360/768/1280 × EN/SW/ZH). Read-only — it moves no money.

⛔ **A Git Bash trap that cost a wrong measurement here.** `ONLY=/markets node
scripts/responsive-audit.mjs` silently becomes `ONLY=C:/Program Files/Git/markets`
— MSYS rewrites a lone leading-slash value into a filesystem path, so the FIRST
entry of any `ONLY`/`WIDTHS` list matches nothing and **the route is skipped while
the run still reports a clean pass**. That is how `/markets` first appeared to be
the one healthy route. Export `MSYS_NO_PATHCONV=1` (or run it from PowerShell), and
treat "0 passed · 0 failed" as a skipped sweep, never as a green one.

## B8 — A token class must resolve, or it is a typo

Added 2026-07-28. **1,325 utility-class usages compiled to nothing**, platform-wide,
for the life of the project.

`globals.css` defined a four-step ink ramp; `tailwind.config.ts` never bridged
three of its steps. Tailwind only emits a utility for a key present in the theme,
and there is no safelist and `plugins: []` — so `text-text-subtle` (732 uses),
`text-text-muted` (433), `text-text-faint` (59), `text-royal-300` (56) and
`text-gilt` (the brand needle's own colour, with no family in the config at all)
were not utilities. They were typos that `tsc` cannot see and the build does not
warn about, and every one of those elements silently inherited its parent's ink.

The visible consequence: a **four-step hierarchy rendered as two**. Everything
written to recede — captions, hints, table headers, timestamps — did not recede.

**The rule: every colour-utility class must name a key that exists in
`tailwind.config.ts`. If a token has no key, bridge it or stop using it — never
leave the class in place hoping it renders.** Where the CSS variable does not
exist, fix the CALL SITE rather than invent a colour (`border-brand-700` →
`border-brand-600`; `border-info-700` → `border-info-500`).

Guarded by **`npm run test:bridge`**, verified to fail on the reintroduced bug.

Contrast was **proven, not assumed** — making the quiet steps render for the first
time is a real darkening, and law 9 of the design system names faint body copy as
a failure mode. `npm run test:contrast` now covers the ramp on every surface it
lands on: muted 12.67/12.33/12.51 · subtle 7.22/7.03/7.13/7.37 · **faint
4.87/4.74/4.81** — all above AA 4.5, with faint the tight one. A rendered DOM
sweep of 1,519 text nodes found one AA failure (leaderboard avatar initials,
1.44:1) which reproduces identically with the change stashed — pre-existing, and
recorded rather than quietly absorbed.

⚠️ Why the 2026-07-17 `DESIGN_AUTHORITY.md` signed this off as
"launch-ready": it grepped for rogue *values* — raw hex, off-palette classes — and
correctly found none. It never checked that the on-palette classes **resolve**. A
dead class is invisible to a value audit.

---

## B9 — One design system. New design merges in; it never sits beside.

Added 2026-07-29. Every design change lands in the **canonical home** for its kind and
nowhere else: a *value* in `globals.css` (bridged in `tailwind.config.ts`), a *utility class*
naming a key that exists (B8), a *new state* as a **prop on the existing component**, and the
*written spec* in the matching `02-components/<name>/spec.md` + `07-provenance/CHANGELOG.md` —
in the same change. Search before you add; no new `.css` file, ever.

**Full law, with reasons and failure modes:**
`docs/design-system/v2-2026-07-27/06-patterns-and-rules/MERGE-DISCIPLINE.md` (also RULES.md law 15).

Why it exists: the product has been bitten three times by *parallel* design — the dead
`micro-patterns.css` shadow kit, the superseded teal `design_handoff` kit, and the 1,325
utility classes that resolved to nothing (B8). Each was a **second place a design truth could
live**. A truth in two places drifts, and on a money product drift means the board and the
detail page can disagree about someone's stake — which already happened (B6).

## B10 — The system is COMPLETE and FROZEN. Edges, shadows, popups — decided once.

Added 2026-07-29. Every visual primitive is decided once, in the system, and components only
*consume* it: edges (`--border`, `-strong`, `-royal`, `-gold`, `-control`), the elevation ladder
(`--shadow-1..5`, `--shadow-card`, `--shadow-card-top`, `--shadow-modal`, `--shadow-overlay`),
the radius scale, the popup primitives (`Modal` / `ConfirmModal` / `OperationResultModal` /
`Toast` / `Tooltip`), and motion/focus (one definition site per token — B5).

You change a look by editing its **token or spec in the system**, and every consumer updates at
once. You do **not** reach into a component for a border, a shadow, or a popup again. If a
component needs a look the system lacks, **the system gains the token + spec** — not the
component a one-off.

Guarded by `npm run test:design-frozen` (static, ratchet — the allowlist may only shrink),
alongside `test:tokens` and `test:bridge`.

**Full law:** `06-patterns-and-rules/MERGE-DISCIPLINE.md` (also RULES.md law 16).

### What the freeze pass found — do not undo these

The 2026-07-29 pass (LIVE on `main`) found that **three gates were passing while the
thing they guarded was broken.** Each fix is load-bearing:

1. **`scripts/contrast-audit.mts` now PARSES `globals.css`.** It used to hand-mirror the
   token values with a comment saying "update both together" — they were not. Its copy
   said `--bg-elevated` was L=0.19 against a real 0.22. Consequence: `--text-faint` on
   every elevated card measured **4.50, under the 4.5 AA floor**, while the gate printed a
   comfortable 4.74. **Do not "simplify" it back to hardcoded values.**
2. **`--text-faint` is 62%, and that is an accessibility floor, not a style choice.**
   Darkening it requires re-running `test:contrast`, which now tells the truth.
3. **`test:bridge` checks `shadow-*` against `boxShadow`,** not the colour map. Tailwind
   resolves it there; the old check made `shadow-overlay` pass only by colliding with a
   key in the `bg` family while correctly-bridged rungs were reported dead.

Two more standing rules from the same pass:

4. **The numeric `borderRadius` scale in `tailwind.config.ts` is frozen as LEGACY.**
   `rounded-md` is 8px while `--r-md` is 12px — they disagree. Reconciling them shifts
   every corner in the product, so it was deliberately deferred. New design uses the
   semantic `rounded-card` / `control` / `chip` / `modal`. **Do not renumber the scale.**
5. **Cold-start is ONE rule with FIVE consumers, and it is TWO questions — not one.**
   The consumers are the board (`markets/page.tsx`), the market card
   (`market-card.tsx`), the detail page (`markets/[id]/page.tsx`), the **landing hero**
   (`components/home/landing-hero.tsx` via `lib/markets/hero.ts`, 2026-08-13), and — since
   batch 3, same date — the **landing's topic-tile lean underline**
   (`lib/markets/landing.ts:141`), which draws the aggregate bar's own 2px
   `--bar-fill-yes` rule per topic and is gated identically: a topic with `pool === 0`
   renders no underline, never one drawn to the 50% midpoint. The detail page shipped a
   fabricated 50/50 split and a "TIPPING" badge above "TZS 0" until the freeze pass. If
   the rule changes, change all five — two surfaces disagreeing about someone's money is
   exactly the defect B6 exists for.

   ⚠️ **CORRECTED 2026-08-13.** This item used to state the rule as
   `volume === 0 && predictors === 0`. That conjunction is not the rule; it is the bug the
   card fixed and documents at `market-card.tsx:218-238`. There are **two** derived states
   and they have different gates:

   | State | Gate | What it drives |
   |---|---|---|
   | `fresh` — nobody has touched this yet | `volume === 0 && predictors === 0` | the NEW badge, no sparkline, no trader crest |
   | `noPrice` — there is no crowd price to state | **`volume === 0` — the POOL ALONE** | the em-dash, the dashed empty bar, YES/NO buttons with no `@ pct%` |

   ⛔ **The price gate is the pool and nothing else.** `predictorCount` is never
   decremented, so a market whose only bettor cashes out sits at volume 0 with predictors
   1 — reachable and ordinary — and under the conjunction it asserted a fabricated 50% to
   every player on the board. It is also the shape the pre-launch data purge leaves behind.
   The one implementation is `pricedYesPct(yesPool, noPool)` in `lib/markets/discovery.ts`,
   which returns **null**, never 50. Guarded by `npm run test:hero-contract` (+ its RED
   proof `red:hero-contract`, 6/6) and `npm run test:discovery-contract`.

---

## T — Type is a scale, and every numeral is mono

Values: the `--type-*` ladder in `globals.css`. Laws:

1. **The scale is closed.** Sizes come from the ladder. A hand-typed `text-[13.7px]` is
   a violation even if it looks right — the next screen will pick a different number and
   the product loses its rhythm one component at a time.
2. **`--type-h1` (32px) is NOT a page-title token.** Page and section `<h1>`s use the 28px
   page-title step; reading `--type-h1` as "the heading size" restyles the wrong thing.
   ⚠️ **Corrected 2026-08-21:** this law cited **`.mterm-q`** as the token's consumer and
   called it "the market-question size". **`.mterm-q` does not exist in `src/`** — it is a
   class from the v2 kit archive under `docs/design-system/`, and it was never shipped, so
   the law was pointing at a surface no player has ever seen. At HEAD the token's real
   consumers are three landing classes in `globals.css`: `.kp-hero__headline`, `.kp-shead__h`
   and `.kp-claim` — which is why the token is held at 32, so the landing is not restyled.
   ✅ **THE MARKET QUESTION IS ON THE LADDER — fixed 2026-08-30, DG-P-03.** This law used to
   read *"the market question itself is off the ladder: `src/app/markets/[id]/page.tsx` renders
   it as a hand-typed `text-[26px] md:text-[34px]` … the fix is to move the question onto the
   ladder, **never** to re-tune `--type-h1` to match it."* It was taken exactly as prescribed:
   **`text-title-lg md:text-display-3`** (28 → 36). The base is now rule 2's own page-title
   step — the size `page-header.tsx` gives all 25 of its call sites — so the question stops
   being the one `<h1>` in the product at a size of its own, and the deliberate desktop
   emphasis survives on the next rung up. `--type-h1` was not touched.
   ⛔ **The prohibition is the durable half of this note and it stands:** a hand-typed page
   title is moved onto the ladder, never answered by re-tuning the token.
3. **`--type-label` and `--type-nano` are the blessed sub-`micro` tier** — UPPERCASE mono
   tracking microlabels only. They sit below the reading floor deliberately.
   ⛔ **Never reading copy.**

   ⭐ **THE EYEBROW'S TRACKING IS 0.14em — AND "THE EYEBROW" IS ONE OF FOUR ROLES, NOT ALL
   UPPERCASE MONO TYPE.** Ruled 2026-08-30, DESIGN-GATE-2026-08-28 step 2 (DG-A-11 / DG-P-06),
   measured with `npm run qa:dg-type --bench recipe` on production, in the real JetBrains Mono.
   No law names a tracking value, so this is a taste call — taken against the screenshot and
   the rendered widths, not from a preference.

   🔴 **THE POPULATION FIRST, BECAUSE THE FIRST TWO COUNTS OF IT WERE BOTH WRONG.** The
   session-79 handover said *"tracking varies 0.12/0.14/0.16/0.20em"* — four values. A census of
   elements-with-a-closing-tag found **106 sites over nine values**. Widening the scan to
   `<button>`, `<a>` and `<input>` found **468**. ⛔ And the third count is the one that changes
   the answer, because the extra sites are not more eyebrows — they are a DIFFERENT ROLE:

   ⚠️ **AND THE FOURTH COUNT MOVED IT AGAIN — the table below is the read, 2026-08-30.**
   Every one of the **586** uppercase-and-tracked sites in `src/` was then READ, in three passes
   (classify · a reader briefed to REFUTE · a third pass over every control label once the
   enclosure test had to be sharpened). 23 calls were overturned on the second pass and 12 more
   on the third. The counts this rule first carried were estimates from a narrower scan, and
   **two of the three small ones were wrong**; these are the read:

   | role | tracking | n | what it is |
   |---|---|---|---|
   | **section eyebrow** | **0.14em** | **308** | the label over a block — the thing this rule governs |
   | control label | 0.08–0.14em | **102** | a word inside a control, read as a target not a heading |
   | **status chip** | 0.02–0.14em | **57** | a NON-interactive status badge. Not a label over anything |
   | **other** | mixed | **55** | a DATA value in a cell, an in-flight readout (“Recording…”), a count annotation |
   | **prose** | mixed | **48** | ⛔ a SENTENCE, or a label with its hint welded on, in an eyebrow's clothes — DG-A-14's population, not this rule's |
   | mark / celebration | 0.16–0.3em | **11** | error, not-found, win, the OG images and the transactional email |
   | type-to-confirm input | 0.2–0.3em | **5** | the operator types the word; the widest tracking is what makes it unambiguous |

   ⛔ **THE TWO SMALL COUNTS THIS RULE GOT WRONG, AND HOW.** *Type-to-confirm is 5, not 3*:
   `resolver/[id]/resolution-ceremony.tsx` holds two more — the SEAL fields on the settlement
   ceremony — and this table had filed them under mark/celebration because they sit at 0.3em,
   i.e. it grouped by VALUE where it claims to group by ROLE. *Celebration is 11, not 5*, once
   the OG-image routes and `lib/server/email.ts` are counted; both render the product's face and
   neither is a `.tsx` page, so a scan of pages could not see them.
   ⭐ **And two families this table never named at all.** A status chip and a data value are
   uppercase, mono and tracked, and neither is "the label over a block" — so a sweep keyed on
   the dressing would have moved 112 sites this rule does not govern.

   ⭐ **THE ENCLOSURE TEST, SHARPENED — because the shorthand below collapses on this tree.**
   *"A `<span>` inside a `<button>` is a control label"* read as *any interactive ancestor wins*
   makes a CARD'S OWN `<h3>` a control label: `markets/market-card.tsx:493` wraps the entire
   market card in a `<Link>`, and `position-card.tsx:58` and `home/trust-band.tsx` do the same.
   So the test is:
   · **CONTROL** — the control's accessible name IS this string: a button, tab, filter or sort
     chip, menu item, or a link whose visible text is its whole label. One target, one name; a
     glyph beside the word is still one name. → leave it alone.
   · **NAVIGATION WRAPPER** — a whole card, row or tile made clickable: a surface with contents,
     holding a heading, several fields, or its own `aria-label`. → the captions inside it KEEP
     THEIR OWN ROLES.
   That distinction moved **4 of 98** control-label calls on the third pass.

   ⛔ **So a sweep that standardises "every uppercase mono element" would flatten three real
   distinctions to buy one number.** That is the same error as counting an amount inside a
   sentence as an amount: a true measurement over the wrong population.

   ⭐ **WHY 0.14em, in the order the method requires.** ① No law decides it. ② A dated,
   shipped ruling does bear on it: `globals.css`'s `.admin-tbl thead` sets
   `letter-spacing: 0.14em` and applies to all 44 admin tables — the single largest eyebrow
   surface in the product, and the CSS side's own canonical answer. ③ Only then taste, against
   neighbours and the render: 0.14em is 142 sites, the modal value; at 0.1em the string still
   reads as compressed text rather than an identifier, which is the job §T3 gives it; at
   0.18–0.2em a long string breaks into loose letters. ④ Measured, and on the population §A5
   makes longest — Swahili: `JUMLA ILIYOLIPWA` at 10px renders **112px at 0.1em · 118.41px at
   0.14em · 121.61px at 0.16em · 128px at 0.2em**. 0.14 costs +6.41px over the old mode and
   leaves 9.6px of the range unspent, where 0.2 spends all of it.
   ✅ **`field-legend.tsx` WAS 0.16em — the kit was the odd one out, not the standard** — and
   that is the drift DG-A-11 exists to remove. It took `.eyebrow` with the rest on 2026-08-30,
   and its own header no longer claims to be "one source" for a value it does not own.
   ⛔ **An eyebrow with NO explicit tracking is not a neutral option:** `text-micro` emits
   `letter-spacing: 0.4px` of its own, measured on the bench. Omitting the class picks a value;
   it does not decline to pick one. Five sites were in exactly that state and now carry the
   value like the rest.

   ⭐ **AND THE VALUE IS WRITTEN ONCE, AS `.eyebrow` — SHIPPED 2026-08-30.** `globals.css`,
   beside `.amount`, doubled selector for the same measured reason (`sm:tracking-…` is emitted
   after everything that file writes, so a single class loses at ≥640px — asserted as a
   CONTROL by `qa:dg-type --bench eyebrow`). It carries **letter-spacing only**: §T3 rules the
   eyebrow's tracking and nothing else, its size belongs to §T7's Tailwind ladder, and its
   weight and colour vary legitimately by surface.
   ⛔ **Why a class and not 308 hand-typed values.** §0a: one fact, one home. 308 copies of
   0.14em are 308 definition sites that diverge — which had already happened, NINE values over
   one role, with 0.1em spelled two ways so a text-matching guard read them as different. And
   `test:type-scale` §6 ratchets hand-typed `tracking-[…]` toward ZERO: **converging** nine
   values onto one would have left that count at 602 forever, because what it counts is a value
   written at a CALL SITE. Adopting the class took it to **313**.
   ⚠️ **It is not a Tailwind utility, so it takes no variant prefix** — `sm:eyebrow` compiles
   to nothing, which is the §B8 defect. The sweep refuses any site that would need one.
   ⚠️ **And an inline `letterSpacing` cannot be reached by a class at all** — an inline
   declaration beats every selector. The four such eyebrows (both `AdminKpi` captions, the dial
   label, the probability chart's caption) have the value written in place, and the three inside
   `lib/server/email.ts` likewise. The first version of the sweep did not know this and wrote
   `text-transform: eyebrow uppercase` into five of them, which is invalid CSS — so those
   elements would have STOPPED BEING UPPERCASE. Caught before it shipped, by reading the diff.
4. **Reading-copy floor: 12.5px in-app, 12pt in print.** Below that is a label, not prose.

   ⭐ **AND "IS IT PROSE?" IS A READ, NOT A HEURISTIC — ruled 2026-08-30, DG-A-14.** §3 of
   `type-scale.test.mts` enforces this floor and used to exempt *"an UPPERCASE tracked
   microlabel"*, which is keyed on the DRESSING rather than on the string. So 48 sentences sat
   2–4px under this floor wearing an eyebrow's clothes and were counted as labels — including
   the arming instruction for an irreversible settlement and a promise to the player that their
   P&L will not move again.
   ⛔ **No text test decides it, and two were tried and measured.** The register's own
   *"paragraphs over 60 characters"* misses **92%** of them (34 of the 37 strings are shorter,
   *"Type PAUSE to stop deposits"* included). A word count cannot separate
   *"Reward modes · independently toggleable · Njia za zawadi"* — a bilingual LABEL — from
   *"changes apply on next bet — no redeploy"*. So the population is the §T3 role read
   (`scripts/design-gate/eyebrow-roles.mjs`), and §3 imports it: ONE list, no second home (§0a).
   ⚠️ **What a scanner CAN see is the ellipsis trap.** *"All figures final"* looks like a noun
   phrase only in English — it is a verbless clause, and Swahili and Chinese both write the
   copula out (*"Takwimu zote **ni** za mwisho"*). §A5 makes Swahili the longest population, so
   the widest thing a real player reads there is a five-word SENTENCE in 10px caps.
   ▶ **The two remedies, and a label keeps its dressing:** a SENTENCE drops the uppercase and
   the tracking and takes `text-body-sm` (13px, the lowest rung above this floor — ⛔ never
   `text-label` 12 or `text-caption` 11, which are below it). A LABEL WITH ITS HINT WELDED ON is
   SPLIT: the label keeps the eyebrow recipe and takes `.eyebrow`, the hint moves to its own
   legible line.
5. **Every numeral is JetBrains Mono with `font-variant-numeric: tabular-nums`** — no
   exceptions, *including numbers inside body sentences when they are data* (stakes, odds,
   times). Proportional digits make a changing number twitch; see §M4 for the money case.
6. **Families:** display = Sora, body = Inter, numerals/labels = JetBrains Mono.
   **CJK is per-glyph fallback — no CJK webfont is downloaded**, deliberately: our players
   are on Tanzanian mobile data and a CJK face is megabytes.
7. **THERE ARE TWO LADDERS. THEY HAVE DIFFERENT JOBS, AND FIVE NAMES MEAN TWO SIZES.**
   Ruled 2026-08-29, DESIGN-GATE-2026-08-28 step 2. Rule 1 above says "the ladder" and this
   file's preamble names `--type-*`; that was true of the CSS and never of the call sites.

   | | `--type-*` (`globals.css:206-221`) | Tailwind `fontSize` (`tailwind.config.ts:190-202`) |
   |---|---|---|
   | **Job** | sizes written **inside `globals.css`** | sizes written at a **call site** (`.tsx`) |
   | **Reach** | all 35 consumers are in `globals.css` itself; **zero `text-[…var(--type-*)…]` sites** | the only ladder a component can reach |
   | Rungs | 72·60·44·32·24·20·17·15·13·11·9.5·8.5 | 64·48·36·28·22·18·16·14·13·12·11·10 |

   ⛔ **So "move it onto the ladder" from a `.tsx` file means the TAILWIND ladder.** Rule 1
   is unchanged — the scale is still closed — but which closed scale depends on where you
   are writing. Reading a `--type-*` name and typing the Tailwind class of the same name is
   how this went wrong: the two ladders **share five names and agree on none of their values**
   — `micro` 11 vs 10 · `label` 9.5 vs 12 · `body` 15 vs 14 · `display-1` 60 vs 64 ·
   `display-2` 44 vs 48. They agree on two *values* under different names (13 = `small` /
   `body-sm`; 11 = `micro` / `caption`).

   ⛔ **THE FIVE COLLISIONS ARE FROZEN, AND A SIXTH IS A BUILD FAILURE.** Not because the
   duality is good — it is not — but because every fix costs more than it buys, and three
   were tried on paper first:
   · *Re-tune one ladder to the other* moves `text-label` 12 → 9.5 on **21 of 21 sites that
     are reading prose**, which rule 3 forbids by name and rule 4's floor condemns twice over.
   · *Mint a rung at 10* would put 11 / 10 / 9.5 / 8.5 inside 2.5px — the objection the
     `--type-table` ruling already sustained at `globals.css`'s `.admin-tbl`: *"two rungs no
     reader can tell apart is the 'fonts everywhere' feeling DG-A-11 exists to remove."*
   · *Rename the Tailwind keys* turns `test:type-scale` red and, worse, **silently shrinks its
     own metric** — that suite holds two hard-coded key lists (`SUBFLOOR_CLASSES` and the
     `KEYS` regex at `:696`), and a renamed key simply stops being counted. A fix that makes
     the instrument read better while the product is unchanged is this programme's signature
     failure, and it has now been caught four times.
   ⭐ **What DOES get fixed is growth.** `npm run test:type-scale` §7 pins the collision set at
   exactly these five and fails on a sixth, so the duality can be lived with and cannot spread.

   🔴 **AND HALF THE "ABOVE-FLOOR ARBITRARY SIZES" ARE NOT ARBITRARY — THEY ARE THIS LADDER,
   TYPED AT A CALL SITE.** Ruled 2026-08-31, DG-A-12. The register's remaining type tail listed
   13.5 · 15 · 17 · 19 · 26 · 34 · 38 as "per-site design calls". Re-derived at HEAD, **`15px`
   IS `--type-body` (`globals.css:213`) and `17px` IS `--type-h4` (`:212`)** — and among the
   sizes the register never named, **`20px` is `--type-h3` (`:211`) and `24px` is `--type-h2`
   (`:210`)**. So a session typing `text-[15px]` was not picking a number at random; it was
   reaching for the OTHER ladder's rung from a file that cannot reach it (row 2 of the table
   above: zero `text-[…var(--type-*)…]` sites exist).
   ⛔ **THAT MAKES "MOVE IT TO THE NEAREST RUNG" THE WRONG REMEDY, NOT MERELY AN OPTIONAL ONE.**
   `15 → 14` or `15 → 16` breaks alignment with every element sized from `--type-body` inside
   `globals.css`, and `17 → 16/18` does the same to `--type-h4` — and neither is even a nearest:
   15 is 1px from BOTH `body` 14 and `body-lg` 16, and 17 is 1px from BOTH `body-lg` 16 and
   `title-sm` 18. A tie is not a design call, it is a coin flip wearing one.
   ⭐ **SO THESE SITES STAY**, and the rule is: a hand-typed size that equals a `--type-*` rung
   is a CROSS-LADDER REACH, and its only correct fixes are to move the element's styling into
   `globals.css` (where the token is reachable) or to accept the value. It is not §T1 debt to be
   swept, and `test:type-scale` §4 counts it only as *hand-typed*, which it is.
   ⚠️ **57 sites at 15px and 8 at 17px** re-derived at HEAD — the largest block of the tail, and
   the reason that tail stopped shrinking.

   ⭐ **AND THE 10px EYEBROW IS ALREADY ON A LADDER.** The open DG-A-11 question — *"there is
   no rung at 10, so putting the eyebrow on the ladder costs +1px on 254 labels"* — was asked
   of the wrong ladder. `text-micro` **is** 10px, is the reachable ladder's rung, already
   holds 101 sites, and 10px is the mode of the whole 557-site microlabel census (341, 61%).
   The eyebrow takes `text-micro`. **Nothing moves**, and the +1px — measured at **+9.63px of
   width on "TOTAL SETTLED"**, ~10% — is not paid.

---

## S — Space, shape and the weight of a line

Values: `--sp-*`, `--r-*` in `globals.css`. Laws:

1. **Layout space comes from the `--sp-*` scale, applied as `gap`** on flex/grid — not as
   margins sprinkled per element. Consistent gutters are what make an unfamiliar screen
   read as the same product.

   ⭐ **THE PAGE RHYTHM IS DECLARED ON `<PageContainer>`, AND `space-y-*` IS NOT A GAP.**
   Ruled 2026-08-29, DESIGN-GATE-2026-08-28 step 2 (DG-P-04), measured on production with
   `npm run qa:dg-rhythm`. The product's rhythm idiom is a `space-y-*` on the page container
   — 35 of 41 containers, and only two values, `space-y-5` (24) and `space-y-6` (32), both
   on `--sp-*`. That satisfies this rule's PURPOSE (one decision, applied uniformly) even
   though `space-y` compiles to a margin: what the rule forbids is each child choosing for
   itself. A container that declares NOTHING is the violation, because then its bands do
   exactly that — `/results` spaced itself `mb-4` · `py-2.5` · `mt-1`, an asymmetric 32 above
   the search and 16 below it, while the skeleton standing in for it rendered 20 and 24, so
   the page moved twice on every load.

   🔴 **AND THE MECHANISM HAS A TRAP THAT COST FOUR PAGES A RUNG THEY NEVER ASKED FOR.**
   `space-y-5` emits `> :not([hidden]) ~ :not([hidden]) { margin-top: 24px }` — a SIBLING
   selector that counts DOM order and does not care whether the sibling it counts occupies
   any space. `.sr-only` is `position:absolute; margin:-1px` (read out of the served sheet,
   not assumed). So a page that opens with the correct WCAG 1.3.1/2.4.6
   `<h1 className="sr-only">` has a first child that takes no space and still holds the
   "first child gets no margin" slot — and the first band anyone can SEE is pushed down a
   full rung by nothing. Measured on production: `/live` **+24px**, `/proposals` **+32px**,
   against 0 on `/markets`, `/results`, `/leaderboard` and `/help`. ⭐ That is the register's
   *"seven section gaps across sibling pages"* with a cause attached: the gaps differed not
   because anyone chose differently but because an out-of-flow element ate a rung.
   ▶ **The fix is structural, never CSS:** wrap the `sr-only` heading together with the band
   it names, or move it inside that band — ⛔ never inside an `aria-hidden` one, and ⛔ never
   delete the heading. It is not the bug; being a ghost SIBLING is.
   ⚠️ **A corollary to know before editing one of these pages:** that selector is `(0,3,0)`,
   so it beats any `mt-*` utility `(0,1,0)` on a child. Adding a rhythm to a container
   therefore SILENTLY FLATTENS every per-element top margin already inside it — including a
   deliberate chapter break — with nothing going red. That is why `/markets` keeps its
   per-element margins for now and only its one **off-ladder** gap was fixed: `mt-10` renders
   **80px** on the overridden spacing scale, which is on neither `--sp-*` nor the four
   `--rh-*` gaps §Spacing allows a long page. It takes `--rh-section`.
2. **The radius scale is additive and closed, and each family has ONE radius:**
   cards, modals and sheets take `--r-lg`; inputs, stake rows, stat tiles and ledger
   containers take `--r-md`; tabs and filter pills take `--r-sm`; chips, quick-stake pills
   and split-bar tracks take `--r-pill`; avatars and dots are 50%. Buttons take the control
   radius, except `btn-xl`, which takes `--r-lg`.
   ⛔ **No one-off `rounded-[…]`.** An arbitrary radius is a second definition site.
3. **Border weights are semantic, not decorative:** 1px is structure (`--border`,
   `--border-strong` for emphasis, dashed for empty states); **1.5–1.9px is instrument** —
   dial rings at 1.5 (`brand.tsx`), and **the kit glyph family and the 64-grid empty-state
   line-arts at 1.9** (`glyphs.tsx`'s `G` and `GL` wrappers, 178 icons); 2–2.4px is brand
   (the mark's ring and divider, and the 56-grid badge medallions in
   `src/components/badges/icons.tsx` at 2.2, a separate documented tier); the needle is
   heaviest. A weight chosen for looks rather than for what the line *is* will contradict
   the next one. ⚠️ **Corrected 2026-08-21** — this rule said kit icon strokes were 1.5px.
   They are 1.9, and have been since the second 64-grid wrapper (at 2.2) was removed for
   drawing neighbouring empty states 16% apart in weight.
4. ⚠️ **The legacy numeric Tailwind radius scale is NOT the `--r-*` scale** (`rounded-md`
   is 8px, `--r-md` is 12px). Both are frozen; do not renumber (Ali deferred, 2026-07-29).
   Use the semantic keys.

---

## A — The floors: contrast, tap, focus, language

These are the accessibility and reach guarantees. They are floors: a design may exceed
them, never dip under.

1. **Contrast: WCAG 2.1 AA, text ≥ 4.5:1 measured ON ITS ACTUAL SURFACE** — not against
   the canvas it is nominally "on". Non-text UI ≥ 3.0:1. Guard: `npm run test:contrast`.
   ⚠️ `--text-faint` sits at its value **as an accessibility floor, not a style choice**;
   darkening it requires re-running the gate.

   🔴 **"ON ITS ACTUAL SURFACE" MEANS THE RENDERED INK, AND THE RENDERED INK IS
   `token × alpha × opacity`.** Ruled 2026-08-30, DG-P-12. `test:contrast` scored a token
   against a token for a year, so it printed `--text-subtle on --bg-inset 7.50 PASS` — a true
   statement about a pair — while the sign-up form painted that same pair at **2.02:1** through
   a `/40` utility, and every `.input` and `<textarea>` placeholder in the product painted it at
   **4.07** through a blanket `opacity: .7`. Under half the floor, on the field a new player
   types their date of birth into, with a green gate over it. ⛔ Same shape as §M4's
   `isTracked = /^tracking-/`: **a guard that reads the SPELLING of a value instead of the value
   that lands on the glass.** §P of `scripts/contrast-audit.mts` now reads the `opacity` out of
   the compiled rule and composites before scoring; §P-u bans a call-site alpha on subtle ink
   outright, because no rule exists for the gate to read one from.
   ⛔ **AND THE COMPOSITE IS DONE IN GAMMA-ENCODED sRGB, NOT LINEAR LIGHT** — this is where the
   first version of that very guard was wrong, and only its RED control caught it: blending in
   linear light scored the real shipped defect at **5.55 and PASSED**. A fix for "the gate
   scores the token, not the pixel" that itself scored the wrong pixel. `color-mix(in oklab, …)`
   is a different operation with a different model (`mixOklab`); using either for the other
   returns a wrong number that looks like a right one.
   ⚠️ **A DISABLED control is exempt (WCAG 1.4.3)** — and that exemption is earned by the class
   list carrying `cursor-not-allowed` / `pointer-events-none`, a rendered fact, never by a
   filename. A file-scoped allowlist would exempt every future site in the same file, which is
   how `filter-language` §6.7 once convicted an innocent `<input>`.
2. **Tap targets ≥ `--tap-min` (40px), 44px preferred on mobile.** Money controls are
   never the exception — a stake chip is where a player chooses how much to risk, and it
   was shipped at 26px once (E-112). `--h-input` already sits at 44px.
3. **The focus ring is one recipe, everywhere:** a 2px `--brand-500` outline at offset 2,
   plus a 4px 25% halo, with a defensive catch-all so nothing in the long tail is unfocusable.
   ⛔ Never `outline: none` without a replacement ring.
4. **Colour is never the only signal.** Every YES/NO, up/down, win/loss or status colour is
   paired with a word, an arrow or a glyph. About 8% of men are colour-blind, and this is a
   product where the colour means *which way your money went*.
5. **Trilingual reach: EN ships with SW and ZH.** Every label must survive **Swahili at
   ~35–40% longer** and Chinese at ~50% shorter. Wrap or ellipsise text —
   ⛔ **never clip money or a timestamp.**
6. **Design at 360 / 768 / 1280 / 1920, and zero horizontal overflow at 360.**

---

## C — What the interface may say: honesty and tone

The platform's hardest-won rules. Most were bought with an incident.

1. **Money is written `TZS 320,000`** — prefix, thousands separators, mono tabular.
   Never `KSH`, never a bare number. Signed P&L uses **U+2212 (−), not a hyphen**.
   The one legal `$` is an asset's own price, because the source publishes USD — and it
   must read as market data (muted or coloured), ⛔ **never gold** (§M3).
2. **Never render a guessed, placeholder, or zero-as-unknown number.**
   Unknown → **an em-dash plus a labelled state** ("awaiting read", "Confirming price").
   `livePrice ?? 0` rendering `$0.00` is the canonical bug; a skeleton number that looks
   like data is the same bug wearing a shimmer. Confirming states are calm and deliberate
   — a confirming price is not an error.
3. **An unrealised figure is always labelled as one.** Open-position value is captioned
   **"if settled now"**; a projected multiplier always carries "est." and a qualifier line;
   ⛔ per-position potential payout stays hidden pre-resolution. "You will win TZS 140" on
   an open round is a promised return, which is a licensing problem, not a copy preference.
   (2026-05 licence review.)
4. **Losses are stated with dignity: calm, factual, final.** No punishment styling, no
   alarm panels. The closing line is *"Every figure here is final — nothing further is
   owed."* **VOID / refunded is NEUTRAL — never an error treatment**; the money came back.
5. **The countdown is the only manufactured urgency permitted.** ⛔ No confetti, no
   flashing, no streak flames, no combo meters, no celebratory burst beyond the calm gilt
   aura. Wins breathe or fade; ⛔ nothing spins forever. (§M3, §M7.)
6. ⛔ **NO EMOJI IN UI COPY. ANYWHERE.** Glyphs are stroke SVG from the kit, or typographic
   marks. Reasons, in order: tone on a licensed money product; rendering on cheap Android;
   and localisation, because an emoji is not translatable.
7. **Illustration idiom: gilt line-art / etched SVG, 1.9 stroke, a single gold accent.**
   (⚠️ said 1.5px until 2026-08-21; the shipped line-arts come from `glyphs.tsx`'s `GL`
   64-grid wrapper, which strokes 1.9 — same weight as the icon family, by design.)
   ⛔ No mascots. ⛔ **No baked-in text in reusable art** — it cannot be translated.

---

## L — The label law: the right word, in the right place, in the right language

> Added 2026-08-15. §C says what the interface may CLAIM; this says what it may CALL
> things. It exists because the platform stores ONE vocabulary and sells TWO products, so
> the stored token does not tell a surface what word a player should read.
> Guarded by `npm run test:labels`; proved red by `npm run red:labels`.

### L1 — A label is any word that NAMES something to a human

An outcome, a side, a status, a column heading, a chip, a tab, a button, a filter, an
email subject, an audit action rendered to an officer, a notification title. The four ways
it goes wrong, each of which had a LIVE instance on the day this section was written:

| # | Failure | Shape |
|---|---|---|
| **L1** | Wrong vocabulary for the product | a poll's YES/NO used for an Up & Down round, whose sides are UP/DOWN |
| **L2** | A raw enum reaches a human | `resolved ${outcome}` interpolating `"YES"`; *"flip the position to CASHED_OUT"* in the FAQ |
| **L3** | An English token inside a translated string | `probOverTime` read *"YES 概率随时间变化"* while Swahili correctly read *"Uwezekano wa NDIYO"* |
| **L4** | Right word, wrong context | "Bet" where the product says "prediction"; "poll" on an Up & Down surface |

### L2 — One definition site per enum family, and it is PRODUCT-AWARE

A position's side is stored `YES | NO` whatever product owns it; the Up & Down layer maps
it to `UP | DOWN` at the edge. So the stored token is not the word.

⛔ **A render site that cannot tell which product it is holding IS the defect** — not the
word it happened to pick. `src/lib/side-label.ts` is the single map from (stored side,
`productLine`) to the word; `updown-refund-reason.ts` and `updown-source-label.ts` are the
same pattern for their families.

⭐ **§B11 is the COLOUR twin of this rule, and it was missing until 2026-08-21.** A status
word having one definition site says nothing about its *tone* — and seven words were being
painted differently on different surfaces with no record of why. `src/lib/status-tone.ts` is
to a status colour what `side-label.ts` is to a status word.

⛔ **`productLine` has no default and must never be given one.** A default is the bug: it
lets a caller that does not know its product compile, and answer confidently in the wrong
vocabulary.

⛔ **AND ON A MIXED BOOK, A LITERAL *IS* A DEFAULT — it just wears an argument.** Added
2026-08-19 (`E-170`, Gaming Board comment #10). If a surface's own read declares that it holds
**both** product lines — `productLine: "ALL"` — then every side word on it must be resolved from
the **row**, never from a hard-written `"MARKET"` or `"UPDOWN"`. `/results` and `/watchlist` both
passed the literal while reading a mixed book, and both were *accidentally* correct only for as
long as the read excluded the other product.

⭐ **THE TELL IS A DATA-DERIVED SIDE WITH A HARD-WRITTEN PRODUCT**, and that pairing is what
`test:labels` §10 looks for. Two shapes are deliberately NOT the defect:

- **both arguments literal** — `sideWord(t, "YES", "MARKET")` is NAMING a vocabulary, not
  describing a row. That is how `/results` labels its own product-filter pills, and it is why
  the split needed no new dictionary key.
- **a literal inside an arm that already established the product** — a service resolving per
  call inside a product branch. §10 therefore scans **render surfaces only**; §3, §7 and §9 own
  the notification paths.

⚠️ **A guard for this rule must not be satisfiable by an import.** `test:labels` §8 skips any
file containing `from "@/lib/side-label"` — and a file that passes a *wrong* literal to the
lexicon imports the lexicon, so that escape hatch fires on exactly the files most worth
checking. §10 asks its question of the **arguments**, which an import cannot answer.

⛔ **If you find a mapping in two places, DELETE one** (§0a). Measured 2026-08-15:
`market.sideYesWord.toUpperCase()` and `common.yes` are byte-identical in all three
locales — two homes for one word. The helper standardises on `common.*`.

### L3 — No enum ever reaches a sentence

⛔ Never interpolate a stored enum into copy, in any language. `resolved ${outcome}` put
the ASCII token `YES` inside an otherwise-Chinese sentence, and the same shape put
`CASHED_OUT` into player help text in **all three** languages. An enum is a storage
detail; a word is a product decision. They meet only in the lexicon.

### L4 — A translated string contains no English enum tokens

⛔ **`test:i18n` cannot catch this.** That guard compares a translation against its English
source and passes anything that DIFFERS — so `"YES 概率随时间变化"` counts as translated by
its measure. Six Chinese keys shipped that way, four of them `aria-label`s, so a Chinese
screen-reader user heard *"YES"*. Swahili had translated all six correctly, and that is
what proves it a defect rather than a house style: **the platform's own two translations
disagreed, over a dictionary that already defined `是` and `否`.**

⭐ **A Chinese side word next to a conjunction MUST be bracketed `「 」`.** `是` and `否` are
also ordinary function words, so `若是获胜` reads as the conjunction 若是 (*"if"*) swallowing
the side and the player never learns which one it was. Caught by reading the rendered
sentence, not by any suite — the string was correct token by token. The bracket belongs to
the SENTENCE, not to the word, so `side-label.ts` returns the bare word and the call site
adds the marks; a chip must not wear them.

⚠️ The exception is a DECIDED one and carries its reason in the allowlist of
`scripts/i18n-parity.test.mts` — e.g. `home.heroHeadline` (*"The wisdom of YES & NO."*) is
the brand line, verbatim in all three locales by Ali's call (PLAN-OF-RECORD §7b).
⛔ Do not "fix" an allowlisted string.

---

## H — Haptics: physical events only

⚠️ **There are TWO haptic modules and they are not interchangeable.**
`src/lib/haptics.ts` is the product vocabulary (tap · select · confirm · success · warning
· error · celebrate). `src/lib/needle-haptics.js` is the needle's *physical* vocabulary
(grab · wake · cross · tuck · trueFound · settled) and models a real object being handled.
Patterns live in those two files. Laws:

1. **Physical events only. Contact, passing true, coming to rest.**
   ⛔ Never encouragement, never reward, never to pull attention back to the app. On a
   licensed gambling product a congratulatory buzz is a dark pattern, not delight.
2. **Proportional.** Impact strength scales with real impact speed.
   **Below 0.35 px/ms nothing fires** — that is a graze you should see and not feel.
3. **Rate-limited to 40ms.** Closer than that is indistinguishable to skin and only
   costs battery.
4. **Silent when asked.** `prefers-reduced-motion`, the in-app mute
   (`50pick.haptics.muted`), or a hidden document suppress everything.
5. **Fails silently where unsupported — no feature-detection in calling code.**
6. ⛔ **iOS gets no haptics, and we do not fake it.** Safari has no Vibration API; the
   AudioContext workaround is a dark pattern. Leave it absent.
7. Duration is standing in for amplitude, which is a documented hack. If a native wrapper
   ever ships, replace this module's internals with real amplitude curves and
   **keep every call site identical.**

---

## F — The feedback law: what an action answers with

> Added 2026-08-15. §H says what a haptic may mark; this says which CHANNELS an action
> answers on at all, and at which severity. It exists because the defect in this layer was
> never "too few toasts" — it was **two actions of the same kind and consequence answering
> the player differently**, decided by whichever product the player happened to be in.
> Guarded by `npm run test:feedback-law`; proved red by `npm run red:feedback-law` (14/14).

### F1 — Five channels, and they are not interchangeable

| Channel | What it is for |
|---|---|
| **Popup** | the PRIMARY signal on a consequential mutation — the shared `OperationResultModal`, or `ConfirmModal` before one |
| **Toast** | the SECONDARY signal, and the primary one for a refusal the player can fix |
| **Haptic** | punctuation on a physical event (§H). Never a channel of its own — it rides the toast's variant or a confirm press |
| **In-app / push / email** | the record, for what the player is not looking at. Inventory is CODE: `src/lib/server/comms-registry.ts` |
| **The options inside them** | the CHOICES a dialog offers. ⛔ A dialog that states a problem and offers no way out is a dead end |

### F2 — The class of action decides the channels

| Class | Popup | Toast | Haptic | Record |
|---|---|---|---|---|
| **Money moved** (bet, sell, deposit, withdraw, settle) | ✅ `OperationResultModal`, success auto-dismisses at the shared 5s | ✅ secondary | ✅ via the toast variant | ✅ in-app + email where the registry says |
| **Account / compliance state** (KYC, RG, 2FA, close) | ✅ | ✅ secondary | ✅ | ✅ |
| **Preference** (watch, push toggle, language, name) | ⛔ never | ✅ only | ⛔ **silent** — a preference is not a physical event | — |
| **Refusal — the player can fix it** | ⛔ never | ✅ `factual` | ⛔ silent | — |
| **Refusal — a hard block or a real fault** | ✅ when it must be acknowledged (LCCP) | ✅ `danger`, sticky on a money path | ✅ `error` | — |

### F3 — Severity picks the variant, and gold is not available

Severities are `docs/FAILURE-INVENTORY.md` §0's: **info** · **warning** (the player can fix it,
their money did not move) · **error** (a hard block or a genuine fault).

- **warning → the `factual` toast.** ⛔ **NOT toast `warning`, which is struck in GOLD**
  (`--warning-500` is hue 86, `--gold-500` hue 84, and `--warning-fg` *is* `--gilt`) — and gold
  means money that was **earned** (§M3). A refusal has earned nothing.
- ⛔ **And not toast `default` either**, which paints `checkCircle`: a confirmation tick over
  a failure is the same euphemism `factual` was added to remove when "Round lost · TZS 2,000"
  shipped wearing a tick.
- `factual` fires **no haptic**, which is correct: a slip the player can fix is not an event
  landing on their money.
- **error → `danger`**, which is red, announces `role="alert"` and fires `haptics.error()`.
  ⛔ Do not spend it on a star that failed to save.

> ⚠️ **The platform had already decided this and only one surface knew.**
> `use-quick-bet.ts` has routed *insufficient balance* — a textbook fixable refusal — to
> `variant: "factual"` since UD-1, with the comment *"a fact about the wallet, not an alarm"*.
> Everything in F3 is that precedent written down and applied to its siblings, not a new
> preference. The eight surfaces `FAILURE-INVENTORY.md` §1.5 counted as saying only that
> something failed were all shouting `danger` at slips.

### F4 — Every refusal states the reason AND the next step

`docs/RULES.md` §2.9 is the standard; this is where it binds on the UI. A title that names
only the failure (*"Failed"*, *"Couldn't update your watchlist."*) is half a message: the
title says what did not happen, the description says what to do about it. Both, in EN + SW
+ ZH, and no two languages byte-identical.

### F5 — Nothing answers an action the player did not take

⛔ **No haptic on a render, a poll or a background refresh** (§H.1: never to pull attention
back to the app). A notification arriving is the *app's* act, not the player's.

> 🔴 **This was live.** `notifications-panel.tsx` fired `haptics.success()` — `[22, 36, 60]`,
> the money-settled pattern, byte-identical to a WIN — on the arrival of any unread during a
> 5-second poll. Its baseline started at `0`, so the first poll after every page load counted
> as an arrival: **open the app holding one unread and the handset buzzed for a render.** And
> the inbox carries LOSSES, whose copy is deliberately blunt ("Bet lost · TZS X") so a loss is
> not softened — so the win pattern played over them. Removed 2026-08-15; the bell's `.g-ring`
> is the signal, and the settlement moment is already marked on its own channel.

### F6 — One signal per event

⛔ A modal **and** a toast for one action is a double signal unless the toast is deliberately
the secondary one (F1). A burst of repeat actions **coalesces** into one dialog showing the
latest — never a stack, and never a gate on the next tap.

### F8 — How long a moment stays, and the intrusion rule

⭐ **THE MORE A SURFACE INTERRUPTS, THE LESS UNATTENDED TIME IT GETS.** A celebration is a
centred modal behind a scrim, so it may not linger uninvited; a result toast blocks nothing,
so it can afford to wait for a player who is mid-scroll. That is why the celebration's dwell
is **shorter** than the toast's — the ordering measures *cost to the player*, not importance.

Values live in **`src/lib/feedback-timing.ts`** and nowhere else (§0d). `6_000` was written
out at four call sites before 2026-08-15 — four chances to disagree about how long a player
gets to read that their money settled.

| Moment | Dwell | Why |
|---|---|---|
| Win celebration (blocking modal) | **7 s** | the amount counts up over ~900 ms and the modal takes ~400 ms to arrive, so the old 4.5 s left only ~3.2 s on the final figure |
| Result — won · lost · voided (toast) | **8 s** | non-blocking, and a corner toast takes a moment to notice at all |
| Bet placed | **unchanged** (5 s modal / 3 s toast) | Ali, 2026-08-15: *"keep placing bets popups normal"* |
| Any money-path failure | **sticky** (`durationMs: 0`) | not a dwell time — the absence of one |

⛔ **A DWELL IS A CEILING ON WAITING, NEVER A FLOOR ON WATCHING.** Dismissal stays instant
and always available — ✕, click-outside and Esc on the celebration; ✕, up-swipe or
horizontal swipe on a toast. A longer dwell is only defensible *because* leaving is instant.

⛔ **A LOSS IS TIMED IDENTICALLY TO A WIN.** One channel, one class of event — and §F exists
to stop two actions of the same kind answering differently. Timing a win longer would be the
platform leaning on the outcome it prefers, which §C4 forbids: losses are *calm, factual,
final*. The extra seconds are **reading** time, and they cut the right way for harm
prevention — the standard behind "Bet lost · TZS X" is that a loss must actually register.
⚠️ VOID takes the same value: a refund is neither good news nor bad, and timing it
differently would editorialise a neutral outcome.

⚠️ Wins QUEUE. The worst case is bounded by `MAX_INDIVIDUAL` (3) in `win-celebration.tsx`,
not by the dwell — past three the tail collapses into one honest summary. Without that cap
this raise would have turned a weekend backlog into minutes of modals.

Guarded by `test:feedback-law` §9; `red:feedback-law` proves the literal returning, the
ordering inverting, the raise being reverted, the bet path being swept up, and a loss being
timed shorter than a win.

### F7 — A promise about money is computed, never stated as a constant

If a dialog tells the player what will happen to their money, the figure and the condition
come from the same function the money path uses.

> ⛔ The Up & Down receipt's "way out" row is the worked example. `docs/RULES.md` §2.6 sets
> free cancellation at 5 minutes, and printing that would be **false on most Up & Down bets**:
> `cashOutValue` gates on RUNWAY (`hadRunway = graceMs > 0 && lockAt − placedAt >= graceMs`),
> so a 3-minute round has no exit at all and a bonus-funded bet never has one. The rule lives
> once, in `src/lib/updown-receipt.ts`, and `test:feedback-law` §6.6–6.10 pins it against the
> server's own expression so the two cannot drift.

---

## E — Elevation and motion mechanics

Extends §B5 (one definition site per motion token) and §M2 (a surface picks a rung).

1. **A shadow is COMPOSED from tokens, never retyped.** `box-shadow: var(--shadow-card-top),
   var(--shadow-4)`. `--shadow-*` is a guarded family: a second definition site is a hard
   `test:tokens` failure.
2. **The overlay rung is shallower than the modal rung on purpose** — an overlay is attached
   to a trigger, not to a scrim, so it must not claim a dialog's depth.
3. **Bottom-docked surfaces cast UPWARD** (`--shadow-overlay-up`). A downward cast on a
   bottom sheet throws its shadow off-screen and the panel reads as pasted onto the viewport.
4. **Glows mix off `--brand-500`, so they track the brand** instead of pinning a raw hue.
5. **Every keyframe family has a written calm branch, and they are not all the same branch.**
   Pausing a ticker, removing a shimmer, and reducing a celebration to a fade are three
   different answers. Ambient loops pause or stop; celebrations become **fade only**;
   count-ups become **colour only**; transforms are explicitly neutralised `from` *and* `to`;
   staggers collapse. See §M6 for the three gates this must satisfy, and `globals.css` §6
   for the low-end tier's list — **every `infinite` animation needs an entry there.**
6. **Before adding a keyframe, check the ones that already exist** (across `globals.css`,
   `motion.css`, `state-tokens.css`, `needle.css`). ⛔ No new name may duplicate an existing
   one; the registry is pinned by `test:keyframes`.
7. **There is no rung below `--t-flick`.** Any raw sub-`--t-flick` duration is a deliberate,
   documented exemption — not a convenience.
8. ⚠️ **`motion.css` is imported LAST** (`layout.tsx`), so at equal specificity it outranks
   everything in `globals.css`. Place a rule accordingly.

---

## K — Kit adoption, and the Definition of Done

1. ⛔ **Never hard-code a control height** (`h-8`, `min-h-[…]`) on a `.btn`. Sizes come from
   `--h-control-*` via `.btn-xs/sm/md/lg/xl`.
2. ⛔ **Never introduce a native `<select>`, `<input type=checkbox>` or `datetime-local`**, an
   ad-hoc portal, or a hard-coded token literal where a kit primitive exists.
   `npm run test:ui-consistency` fails the build.
3. ⛔ **Never import an icon library into a player surface.** Glyphs come from
   `src/components/ui/glyphs.tsx`.
4. ⛔ **Never read a `globals.css` out of a design export** — those are dated snapshots and
   they drift. The live file is the truth.
5. **Extend the kit; never fork it.** A one-off that duplicates a primitive is how a design
   system dies — not in one decision, but in fifteen reasonable-looking ones.
6b. ⭐ **AND AT PHONE WIDTH THE FILTERS LIVE IN A SHEET** (added 2026-08-15, batch 6).
   Below `lg`, `/markets` puts **odds, pool and topic** behind one `Filters` button —
   `src/components/markets/filter-sheet.tsx`, a `<details>` bottom sheet with a scrim, so it
   opens with **no JavaScript**. It took the sticky bar from 214px to **116px** at 360.
   ⛔ **Sort and status stay in the bar at EVERY width** — the round-2 kit's ruling, stated in
   four of its documents: *"they answer the first two questions a punter has and must never cost
   a tap"* (COMPONENTS §21). ⛔ **Never nest a `<details>` inside the sheet**: its body scrolls,
   and a box that scrolls on one axis clips an absolutely-positioned child on the other — the
   4px listbox of PLAN-OF-RECORD §8.7c. Everything in the sheet is a `FilterPill`.
   ⚠️ **`position: fixed` is not viewport-fixed inside page content.** `.route-enter` carries a
   `both`-filled animation, so its retained transform is the containing block for fixed
   descendants on every route; the sheet drops that animation while open. The shared `<Modal>`
   never meets this because it portals to `document.body`. Guarded by `test:filter-language` §5
   + `red:filter-language` (17/17).

6. ⛔ **THERE IS ONE FILTER CONTROL, AND IT IS `FilterPill`** (added 2026-08-14, batch 5).
   Every player-facing control that chooses which rows are shown renders through
   `src/components/ui/filter-pill.tsx` — no exceptions, no per-surface variant. **Only the
   SELECTED pill carries an outline; an unselected pill is text on transparent.** The rule is
   not taste: *"fifteen outlined capsules in one bar was the single biggest source of the
   'chunky' criticism the round-2 brief was answering."* A rail may differ from its neighbour in
   exactly one way — `rank`, a prop on the primitive — and never by an inline style at the call
   site. Its rail carries `data-filter-rail`. Spec:
   `docs/design-system/v2-2026-07-27/02-components/filter-pill/spec.md`.
   Guarded by `npm run test:filter-language` + `npm run red:filter-language`.
   ⚠️ This is rule 5 restated because rule 5 was not enough: five surfaces each wrote their own
   filter control while the kit's own reference sat one import away, and the divergence reached
   four control heights and two radii before anyone measured it.

7. ⛔ **THERE IS ONE SECTION RAIL, AND A TAB IS NOT A FILTER** (added 2026-08-31,
   `DESIGN-GATE-2026-08-28` step 5, DG-S-01 — Ali's commission: *"admin pages n tabs — some
   pages are so large to scroll down"*).

   A **section rail** chooses which *part of one page* an operator is looking at. A **filter
   rail** chooses which *rows* a list shows. They are different controls, and the platform
   already keeps them apart in code: `scripts/filter-language.test.mts:321` excludes
   `ui/tabs.tsx` from the filter language **by name**, with the reason written beside it at
   `:299-301` — *"Nav is out — an active NAV destination is a settled, separate language."*
   ⛔ **So a section rail is never a `FilterPill`, never carries `data-filter-rail`, and never
   takes rule 6's dense rank.** Routing one through `FilterPill` would drag it into that
   gate's `ADMIN_SURFACES`, where §6.6 forks density and would impose **32px on a page's
   primary navigation**. Rule 6 does not reach it either: it is double-scoped to *"every
   **player-facing** control that chooses which **rows** are shown"*, and a section rail is
   neither.

   🔴 **AND THE CONSOLE IS ALREADY TABBED, TWICE, IN TWO SPELLINGS THAT DISAGREE — which is
   why this rule exists at all.** The probe that reported *"`role="tab"` / `aria-selected`
   anywhere in admin: ZERO"* was keyed on **exactly the attributes A5 forbids**, so it was
   structurally incapable of finding either rail: a true measurement over the wrong
   population. Re-derived at HEAD 2026-08-31 — `src/app/admin/roles/page.tsx:60` and
   `src/app/admin/players/[id]/page.tsx:302` both ship a URL-backed `?tab=` rail with a
   **byte-identical container class string** (`flex gap-4 px-4 border-b border-border-subtle
   overflow-x-auto`) and divergent items: **40px vs 52px**, `<Link>` vs raw `<a>`,
   `aria-current="page"` vs **nothing at all** (`grep -c 'aria-current'` on the second file →
   **0**). That is the Definition of Done's own failure test — *"a grep for the thing you
   added finds it in exactly ONE definition site"* — and rule 6's postscript is this same
   sentence with a different noun. **This is rule 5 restated a third time, and the count is
   already two.**

   ### 7a — When a page earns tabs, and when it does not

   Apply these in order to a console you have never seen. **All three must hold.**

   1. **The height must come from the SECTION COUNT, not from ROW DENSITY.** If one panel is
      more than ~40% of the page's `docH`, that panel *is* the length and a rail moves
      nothing. Measured on production 2026-08-30 — re-derive with **`npm run qa:dg-measure`**,
      which writes `m1440.docH` into `.qa-design-gate/out-admin/`; ⛔ that directory is
      GITIGNORED EVIDENCE and is deleted when a programme closes, so the instrument is named
      here and the output is not — at 1440×900: `/admin/updown/proposals` is **8,657px**, the tallest page in the console —
      and its rows run 379.6–462.6px at `PER_PAGE = 20`, i.e. roughly 7,600px of one already
      paginated table. Tabbing it yields a 1,000px landing tab and an 8,000px queue tab.
      Against that, `/admin/system` is 3,327px whose *tallest* panel is 401px (**12%**) —
      many small independent sections, the clearest tab shape in the console.
   2. **The bands must be alternative TASKS, read one at a time — not one document read
      together.** A page whose bands are compared *against each other* stays scrolling. That
      is why `/admin/finance` does not qualify: wallet liability is read *against* house
      accounts, and tabs would put the two compared things on different screens.
   3. **Nothing load-bearing may be left behind a click.** See 7d.

   ⛔ **A tab is a REACHABILITY change, never a rhythm change, and LENGTH ALONE DOES NOT
   QUALIFY A PAGE.** Re-derived 2026-08-31 from the same drive: **13 admin routes exceed three
   screens** at 1440×900 — and only four pass all three tests above.

   ### 7b — The primitive, and what A5 does and does not forbid

   **One home: `src/components/ui/tabs.tsx`.** `TabItem` gains an optional `href`. With
   `href` the rail renders `<nav aria-label>` + `<Link aria-current="page">` on the option in
   force and nothing on the others; without it, today's `role="group"` + `<button
   aria-pressed>` is unchanged. ⛔ Do not mint a second tab component, and ⛔ do not leave a
   hand-rolled rail beside it — both shipped admin rails are deleted **into** the primitive
   (§B9: new design merges in, it never sits beside; §K5: extend the kit, never fork it).

   ⭐ **A5 (2026-08-21, `tabs.tsx:21-45`) STANDS, AND IS NARROWED ON ITS OWN TERMS — IT IS NOT
   REVERSED.** It is two rulings and only one of them is conditional.
   - **The structural half stands untouched:** *"THE FIX IS TO STOP CLAIMING THE WIDGET, not
     to build it here — and that is a fact about WHERE the panel lives … a primitive cannot
     label an element it does not own."* URL-backing changes nothing about who renders the
     panel. ⛔ **So no `role="tablist"`, no `role="tab"`, no `aria-selected`, no
     `aria-controls`** — building the widget would announce arrow-key navigation on a dozen
     consoles that would not have it, which is the exact lie A5 removed. Re-derived at HEAD:
     `role="tab` has **five** grep hits in `src/` and **all five are prose inside comments** —
     zero live elements.
   - **The `aria-current` half is a CONDITIONAL, and a URL falsifies its antecedent.** A5
     reads: *"NOT `aria-current` … **These change in-page view state without a URL**, which is
     the `/markets` discovery-chip case."* A rail whose selection lives in `?tab=` is not
     *these*. The general law is already written at `filter-pill.tsx:38-48` — *"⛔ ONE PROP,
     BOTH CORRECT — never one semantic imposed on both"* — and `roles/page.tsx:67` already
     ships it correctly.

   **The selection lives in the URL.** ⛔ Never `useState` alone. Three shipped reasons: (a)
   it is what makes `aria-current="page"` honest — `globals.css:4661-4664`'s own test is
   whether the option is a destination the browser goes to; (b) it is what lets a validation
   failure address the tab holding the offending field (7d); (c) it makes the server read
   **cheaper**, not dearer — `roles/page.tsx:36-38`: *"Only the matrix the active tab renders
   is read. Loading both would double a DB round trip on every visit to pay for a tab most
   visits never open."*
   ⚠️ **A panel is fetched conditionally ONLY when it owns a read no visible panel needs.**
   Otherwise every panel is rendered in one pass. `players/[id]:99-125` is the correct
   *unconditional* case — six panels off one player's record — and is not a defect.

   ### 7c — Geometry, paint, type and motion

   - **44px — `--h-control-md`.** §A2's preferred tap height, and what the `line` variant
     already ships. ⛔ **Not 32:** `globals.css:292` scopes `--h-control-xs` to *"dense
     mouse-only admin **inline** controls (documented floor exception)"* and its own note adds
     that all its call sites are inline admin controls; a page's section navigation is neither
     dense nor inline. ⛔ **Not 52** (`players/[id]`'s `py-3`): that is on no rung, and it is
     invisible to `test:tap-target`, which reads a **declared** height and cannot see one made
     of padding. ⛔ And never "tidied" into a scale class — `h-9` is 64px here, `h-10` is 80px.
   - **The underline is the section language; the capsule is the filter language.** `border-b`
     on the container, `border-b-2 border-brand-500` on the current item. Three shipped
     section rails are three-for-three an underline; all 25 `<FilterPill>` call sites are the
     capsule. ⛔ A section rail never wears `.kp-fchip`.
   - **The rail SCROLLS; it does not wrap.** `overflow-x-auto`, options `whitespace-nowrap`.
     This is structural, not taste: the `border-b` is on the **container**, so a wrapped second
     row leaves the first with no baseline under it. ⛔ Not an edge-fade in the console —
     refused with its reason at `globals.css:2065-2071` (DG-A-23, 2026-08-29). ⛔ And not
     `ScrollX`: all 57 of its call sites are admin **tables**, content with no focusable
     children, which is exactly why it carries `tabIndex=0`; a rail of links is already
     keyboard-reachable and the wrapper would insert a redundant tab stop before every rail.
   - **The active item takes no hover; every inactive item must.** DG-P-01, verified on
     production 2026-08-29 — hovering the active item would swap the brighter `--pill-active`
     for the darker sunken `--bg-overlay`, so the current section would appear to *lose*
     emphasis under the cursor. Both shipped admin rails already obey this.
   - **The label is `text-body-sm` (13px), sentence case, in the body face — NOT uppercase and
     NOT `font-display`.** §T3's enclosure test names *"a button, **tab**, filter or sort
     chip"* in the CONTROL bullet, and `scripts/design-gate/eyebrow-roles.mjs:302` already
     declares `tabs.tsx`'s label `CONTROL_LABEL`. ⛔ **The eyebrow recipe is not available to
     it, and the reason is arithmetic rather than taste:** re-derived 2026-08-31,
     `test:type-scale` §6 stands at **241 against a ratchet of 241** — zero slack — so an
     uppercase tracked tab label needs a ratchet raised that may only shrink. The same run
     puts §4 at **924/924**, so `tabs.tsx:153`'s `text-[13px]` must become the Tailwind rung
     `text-body-sm` (§T7: a size written at a call site comes from the **Tailwind** ladder) —
     a shrink to 923, which is legal. Three admin neighbours already render a section or nav
     label at 13px with no font class: `roles/page.tsx:68`, `players/[id]/page.tsx:321` and
     `admin-sidebar-nav.tsx:47`.
   - **The label is ENGLISH, single-language — and that is a dated ruling, not an omission.**
     `scripts/failure-reasons.test.mts:1080-1085`: *"The ADMIN console is an English-only staff
     surface by design, so counting its toasts here would have made this ratchet fail on
     30-odd non-defects."* The console's Swahili gloss belongs to its **headings**
     (`AdminPageHead sw`, `AdminCard sw`), which is a heading idiom; §T3 files a tab as a
     CONTROL. ⚠️ So `roles/page.tsx:72`'s `{t.label} · {t.sw}` is that heading idiom applied to
     a control, and the conversion drops the gloss to the card above it. That is the one
     *rendered* change the conversion makes, and it must be screenshotted, not assumed.
   - ⛔ **THE ACTIVE FILL IS `--pill-active`, AND THE PRIMITIVE IS FIXED BEFORE IT IS
     ADOPTED.** `globals.css:423` names itself *"one active filter/tab fill everywhere"* and
     means tabs by word. `tabs.tsx:99` paints `oklch(40% 0.08 264 / 0.55)` — a different
     chroma, hue *and* alpha, so **a different answer, not a copy**, which is precisely why
     `ui-consistency`'s `hardcoded-pill-active` cannot see it: that rule matches the token's
     literal text, so it finds copies and never divergence (§M4's named shape — a guard
     reading the SPELLING of a value instead of the value that lands on the glass).
     `tabs.tsx:127`'s `bg-brand-500/15 text-brand-300` is the same defect through a Tailwind
     alpha. ⚠️ **Both drifting variants have ZERO call sites at HEAD**, so the drift costs
     nothing today and costs every converted console the moment the primitive is adopted.
     **That is the whole sequencing argument: the primitive is repaired first, while the
     repaint is still free.**
     ⛔ **AND "NO ADOPTER" IS NOT "NO PIXEL" — THIS RULE SAID IT WAS, AND AN A/B BENCH IN THE
     REAL PRODUCTION FONTS REFUTED IT THE SAME DAY (2026-08-31, DG-S-02).** The `line` variant
     *does* ship, on `/wallet`, and moving its `text-[13px]` onto `text-body-sm` carries that
     rung's `letter-spacing: -0.05px` and `line-height: 18px` — which a hand-typed size never
     set. Measured old → new: the label "Activity" goes **92.44 → 92.03px**. It is a
     CONVERGENCE (both shipped admin section rails already render `text-body-sm`, so this rail
     was the one 13px label in the product off the rung), but it is rendered. ⭐ **Moving a
     hand-typed size onto its ladder rung is never only a rename — check what else the rung
     carries.** The two ladders' rungs bring tracking and line-height with them; `text-[Npx]`
     brings neither.
   - **Motion names a rung.** ⛔ No bare `transition-colors`, and no `duration-150`: 150 is on
     no rung (`motion.css:33-37` — `--t-quick` 140 · `--t-base` 220 · `--t-move` 340), and an
     omitted timing function silently means `ease` (§B5 rule 3). `globals.css:2037-2041` has
     already ruled this exact number for a colour change — *"150ms → `--t-quick` (140). A
     colour crossfade travels nowhere, so it takes `linear`."* ⭐ And the travelling underline
     has a shipped utility built for it with **zero consumers**: `motion.css:211` `.m-indicator`
     — *"Travelling indicator — tabs, filters, bottom nav. One object, never a cross-fade."*
   - **The rail's skeleton moves in the SAME commit, as a literal** (§B7 rule 3).
     `roles/loading.tsx:24` is `h-[41px]` with the arithmetic written out, because without a
     ghost *"the whole matrix below it jumped up by 41 + the body's 20px rhythm on every
     load"* — so a rail that becomes 44px leaves a 4px jump behind unless its `loading.tsx`
     moves with it.
   - ⚠️ **`eyebrow-roles.mjs` is keyed on line CONTENT.** Its declaration at `:302` quotes the
     `pill` variant's class string verbatim; editing that line — even to fix its duration —
     makes the declaration stale and turns `test:eyebrow-roles` red. Edit both in the same
     commit, or neither.

   ### 7d — What may never go behind a click

   ⛔ **A tab may hide a DETAIL. It may never hide a STATE.** Anything that answers *"is
   something wrong right now"* stays **above the rail, on every tab**: a money figure an
   officer acts on, a control that starts or stops something in production, and a backlog
   waiting on a human. The KPI band and any mode-or-paused banner sit above the rail — which
   is what makes this rule affordable rather than paralysing, and is already the shipped shape
   at `players/[id]:290-302` and `wallet-client.tsx:555-567`.

   **If a hidden section holds a pending action, its tab carries the count**, rendered through
   the kit `<CountBadge tone="brand">` — ⛔ never a bare number. The cap is the point
   (`count-badge.tsx:15-18`: *"The cap is not decoration; it is the reason a shared primitive
   exists"*), and `/admin/approvals` is kyc + aml + sof, which genuinely passes 99.
   `tabs.tsx` writes that pip by hand three times today, uncapped.
   ⛔ **A badge does not buy a kill-switch a hiding place.** `CountBadge` renders nothing at
   zero (`count-badge.tsx:81`), so it cannot distinguish *"nothing pending"* from *"this tab
   failed to read"*, and no number can state *"maintenance is ON"*.
   ⛔ **And a tab's count is never painted in the betting pair** (§B2a / D2).
   `players/[id]:313` paints a KYC compliance state `bg-yes-500` / `bg-no-500` today. That is
   a live breach; it is fixed in the conversion, not copied by it.

   **A tab switch is an EXIT.** A page whose tabs unmount their panels must (a) treat the
   switch as it treats an unload, and (b) resolve which tab owns the first invalid field and
   switch to it **before** focusing. ⛔ A helper that queries the DOM for a field on an
   unrendered tab returns `null` and refuses in silence — re-derived at HEAD,
   `poll-actions.tsx:197` is the repo's **only** such helper and it has no `else` branch.
   ⚠️ And *"keep applying the unsaved-changes detection"* is a **build, not a continuation**:
   there are **zero** `beforeunload` handlers in `src/`, and the four `dirty` booleans that
   exist only disable their own Save button. §K5 — it lands once, in the kit, not per page.

   ### 7e — The consoles that are NOT tabbed, and why

   - **`/admin/roles`** — ⛔ do not add tabs, and ⛔ do not remove the ones it has. Its rail is
     **Access vs Reads, two permission AXES, not roles**, and `roles/page.tsx:14-18` cites
     `docs/READ-TIERS.md` §6: *"two permission screens is how two permission models are
     born."* Comparison across roles happens **within** one matrix. ⚠️ Its recorded *"50
     cards"* is a probe artefact — `measure.mjs:164-171` counts any rounded painted box
     ≥160×40, and 6 editable roles × 7 domains + 6 role cards + 2 real cards = 50. The work
     here is to delete its hand-rolled rail into the primitive, and nothing else.
   - **`/admin/updown/proposals`, `/admin/resolver-queue`, `/admin/markets`** — single
     already-paginated lists. Row density, not section count (7a.1).
   - **`/admin/payments`** — after the control-plane, the payout declaration, the Selcom
     float, the per-MNO kill-switches, the frozen-payout alarm and reconciliation, the landing
     tab *is* the page under 7d. ⚠️ **The kill-switches are not in the control-plane:**
     `KillSwitch` renders inside the per-MNO health grid at `payments/page.tsx:288`, roughly
     4,000px down — so a plan that pins "the control-plane" pins the wrong card and pushes the
     real deposit/withdrawal stops behind a click.
   - **`/admin/config`** — every block is a fee statement, and *"Worst winner ratio"*
     (`page.tsx:72-81`, whose own comment reads *"If this ever reads below 1.00×, a player who
     called it right is losing money"*) is the invariant an officer must see **while** editing
     rates. Splitting the simulator from the rates is 7a.2's anti-pattern exactly.
   - **`/admin/finance`** — zero controls; one money statement read as one document.
   - **`/admin/sources`** — the per-category readiness chip *is* the comparison; hiding six of
     seven categories kills the only thing the page does.
   - **`/admin/reports`** — its bulk is six template cards. It is a **chooser**, and tabbing a
     chooser hides half the choices.

   ### 7f — What tabbing does to the gate population

   ⭐ **A tab may hide DOM from an operator. It may never hide DOM from an instrument.**

   **Inactive panels are NOT RENDERED** — the active panel is chosen server-side from `?tab=`.
   ⛔ **Not hidden-but-present:** `measure.mjs:83`'s `vis()`, `responsive-audit.mjs:288`'s
   `r.width < 8` skip and `contrast-rendered.mjs:197` each drop `display:none` DOM
   independently, so a four-tab page would be measured at roughly a quarter of itself with
   **every gate green** — and nothing would notice the shrink, because the rig's only
   DOM-volume heuristic (`redo.cjs:58-61`) needs zero cards AND zero tables AND ≤20 controls,
   and only *prints*. ⛔ **And never laid-out-but-off-screen:** `responsive-audit.mjs:221-231`
   hard-fails every control whose box runs past the viewport edge.

   ⛔ **`scripts/design-gate/routes.mjs` gains no `?` entries.** Re-derived 2026-08-31: **73
   entries across its three arrays, 0 containing a query string.** Two reasons, one legal and
   one mechanical. **LEGAL** — a hand-typed tab list is a §0a copy of a fact whose home is the
   page's own tab definition, and that file's header already forbids it. **MECHANICAL — it
   would not work:** `admin-shell-seal.mjs:120` strips the query off the landed URL *before*
   comparing it to the route string, so `/admin/config?tab=risk` files as REDIRECTED and is
   never probed — while `probed` stays non-zero from the other routes, so the *"zero probes is
   a skipped run"* guard never fires. **A silently unmeasured route inside a green run.**

   ▶ **So the tab set is READ OFF THE RENDERED RAIL, never typed.** The rail stamps
   `data-section-rail` (⛔ **not** `data-filter-rail` — that is `test:filter-language` §0.4's
   discovery key, and a section rail landing in that set turns the suite red for the right
   reason at the wrong time), each option carries its real `href`, and `routes.mjs` gains ONE
   shared expander that every importer calls — the same self-maintaining shape
   `admin-filter-drive.mjs:17-22` already rules for a driver's inputs: *"THE VALUE IS CHOSEN
   FROM THE DATA, NOT INVENTED."* ⚠️ `measure.mjs:294`'s `hit.split("?")[0]` must stop
   discarding the query in the same commit, or the drive cannot follow a tab link even when it
   finds one.
   ⭐ **THIS TRAP IS ALREADY LIVE, AT n=1.** `/admin/roles?tab=reads` — and with it the whole
   of `read-tiers-matrix.tsx` — has never been visited by `measure.mjs`, `qa:dg-shell`,
   `qa:admin-load` or the overlay drive, because `routes.mjs` lists the page bare.

   ### 7g — The gate

   **`test:section-rail`** — *"every `<nav>` that maps a rail of destinations states which one
   is current."* Keyed on the CONTROL, never on a spelling.

   - **POPULATION** — every `<nav>` in `src/**/*.tsx` that `.map()`s a rail of `<a>` / `<Link>`
     / `<FilterPill>` destinations, comments stripped first so prose cannot count as code.
     Re-derived 2026-08-31: 487 `.tsx` files scanned, 27 `<nav>` blocks parsed, **17 in
     population**.
   - **HEAD HITS, outside any allowlist: 1** — `players/[id]/page.tsx:302`, the rail that
     announces nothing. It lands at **0** the moment that rail is converted, which is work
     this rule already mandates. ⛔ No allowlist entry is available for it: an exemption here
     could only be earned by a filename, which §A1 forbids.
   - **THE CONTROL** — delete `aria-current` from `bottom-nav.tsx`, `legal-nav.tsx` or
     `admin-mobile-nav.tsx`, in a **copy** of the tree. Each takes hits 1 → 2; proved three
     ways, with the population steady at 17 in all four runs, so the control moves the finding
     and not the denominator.
   - **THE VACUITY FLOOR** — the gate asserts its own population is **≥ 17** and exits
     non-zero below it, so a rename, a refactor away from `<nav>` or a broken regex empties the
     subject set **loudly** instead of passing.
   - ⛔ **THE COMPLIANCE TEST READS THE RENDERED ARIA, NOT A PROP'S SPELLING — and two
     shallower keys were measured failing, which is why they are written down.** Keyed on
     `semantics="tab"`: `FilterPill`'s `semantics` **defaults** to `"tab"` (`filter-pill.tsx`),
     so a rail that never spells the prop still emits `aria-current="page"` — that key reported
     **HITS 4**, convicting three innocent filter rails. Keyed on the URL spelling `?tab=`: it
     reported **HITS 0 over the live defect**, because that rail computes its class into a
     `const` above the tag so no state token sits inside the tag body — and it would empty
     silently the day someone spells it `?section=`. Both are §A1's named disease.

   ⚠️ **WHAT THIS GATE DOES NOT PROVE, said out loud:** it proves the rail *says* which section
   is current. It cannot prove 7a (when to tab), 7d (what may not go behind a click) or 7e (the
   do-not-tab list). Those ship as **reviewed** rules, applied through the Definition of Done
   below and its *"look at the screenshots"* clause. Claiming a gate over them would be a gate
   one level too shallow, which is indistinguishable from no gate.


**Definition of Done — every design task, no exceptions:**

- Zero new hex/rgb literals in components; zero new `.css` files.
- Every new value is a token in `globals.css`, bridged in `tailwind.config.ts` if needed.
- Every new or changed state is a **prop on the existing component**, not a clone of it.
- The component's `spec.md` and the provenance `CHANGELOG.md` are updated in the same change.
- `test:tokens` + `test:bridge` + `test:measure` + `test:design-frozen` green.
- **A grep for the thing you added finds it in exactly ONE definition site.**

**Verification is visual, and a green suite is not proof.** Verify at 360 / 768 / 1280 /
1920, in EN + SW + ZH, and **look at the screenshots**. A deliberate exception must be
re-baselined with a written reason.

---

## M — The material law (M1–M8)

Merged 2026-08-07 from the accepted Claude Design commission (ATOM J). The measured state it
corrects: 79% of components had no light, 60% no elevation, 43 had neither and no motion. The
restraint law was right; answering it with flatness was the defect. Where these rules differ
from the delivery, the difference was **measured first** and recorded in
`docs/design-system/v2-2026-07-27/11-material/material.css` (header) — the law below states
what SHIPPED, which wins.

### M1 — One lamp

Light comes from high above the plane, tilted **−14°** — the mark's own axis (`--m-tilt`).
Every lit surface catches a soft, **even** 1px inner ring (`--edge-lit`) carrying a 4% royal
tint, never pure white — and never a one-sided line. The direction of the light lives in the
wash (`--light-angle`, 166deg); speculars centre at x ≈ 42%; shadows fall straight down.
**The tilt lives in the light, never in the gravity.** There is no second lamp; a surface lit
from below or from the right is a bug — including a `.tsx` inline style, which is where the
last seven lived (E-131). Guard: `npm run test:m1-light` — 0 lamps over 6 stylesheets **and**
the full component corpus (`scripts/m1-corpus.mjs` is the one file list).

### M2 — A surface picks a rung; it never composes a shadow

Five rungs: `flat → raised → float → modal → toast` (`--elev-*` + `--wash-*` in
`globals.css`, `.mat-*` in `motion.css`). A component takes a rung and is done. If it
genuinely needs a sixth rung, the SYSTEM gains one (token + spec, deliberately) — the
component does not improvise. `flat` is a legitimate rung (form rows, pollers, containers),
not a failure.

- **Every wash's lit stop is capped at 24%** (E-130) — solved from the ink floors
  (`--text-faint` 4.5, `--border-control` 3.0), not chosen. The ladder rises on the cast and
  the ring; the wash's one job is direction.
- **Tint is rung-independent**: `.mat-tint-yes/-no/-warn/-gold/-brand` compose a ring into
  ANY rung through the `--mat-tint` slot. (The delivery's `.mat-edge-*` welded a toast-level
  cast to whatever it touched — the D-6.6 send-back.)
- A surface taking `.mat-float` or `.mat-toast` **drops its own border** (those rungs carry
  an outer ring); `.mat-modal` does **not** — its cast carries only the inset edge.
- Each rung pairs with its arrival and every arrival has its exit: raised → `.m-in-lift`/
  `.m-out` · float → `.m-float-in`/`.m-float-out` · modal → `.m-dialog-in` or `.m-sheet-in`/
  `.m-out` (scrim `.m-scrim`) · toast → the toast component's own transition. There is no
  third entrance.

### M3 — Gold is struck, and struck means earned

Gilt renders as satin metal — one calm `--gilt-metal` ramp anchored on the **measured**
trademark: `#E3BC66` = `oklch(81.2% 0.1141 85.4)`, written at hue **84** (E-124 — the
delivery's `0.095` figure round-trips to a duller `#D7B672`; every gilt chroma shipped
×1.2011). An even `--gilt-metal-edge` ring; one soft `shimmer-gilt` specular sweep on hover
(a per-layer keyframe — do not "simplify" it back to one value, the metal slides off the
button). **No bloom** — radial glow dilutes the financial texture; **rays are banned**.
The usage law has teeth: **struck gold appears only where money was earned** (payout,
celebration, resolved seal). A decorative element wearing `--gilt-metal` is a violation, not
a style choice. And `.gilt-metal:focus-visible` **keeps a real `outline`** (E-129): a
box-shadow ring is invisible in forced-colors, and this class lands on the Deposit button.

### M3a — Which money commits wear gold, and which do not (D1, D5)

Added 2026-08-21 — **D1 and D5, Ali's rulings, applied at their stated defaults.** §M3 says
struck gold means **earned**. Two families of surface had been reading it as *"money is
involved"*, which is not the same claim:

- **D1 — the confirm button.** A **deposit** or a **withdrawal** commit is **brand** — not
  gold, and not claret. Moving your own money into or out of your own wallet earns nothing,
  so gold overstates it; and a routine transfer is not an irreversible ceremony (§B4a), so
  claret overstates it in the other direction. **Bet and sell keep gold**: a stake committed
  and a position sold are the money moments the gold budget exists for.
- **D5 — the wallet's promotional cards.** A **zero** bonus balance and a **deposit
  inducement** are not earned money. A card that says *you have TZS 0 in bonuses*, and a card
  whose whole purpose is to ask you to pay money in, must not wear the ink this platform uses
  to say *you won this* — on an inducement, a house colour becomes a marketing claim.


### M4 — Money is mono, and it never reflows

Every amount: `--font-mono`, `tabular-nums`, **never letter-spaced** — tracking is for
identifiers; money has weight, so at the earned peak it takes `.gilt-ink` (struck type,
glow at the measured 84/0.114). A motion on a changing number must not shift layout; verify
with tabular figures. (D-0's table listed `--font-display` for the celebration amount —
mono won, amended at source.)

⭐ **THE MECHANISM IS `.amount`, AND IT IS A RULE NOW, NOT A HABIT** (DESIGN-GATE-2026-08-28,
step 2, 2026-08-29). *"Never letter-spaced"* had no legal way to be obeyed from a call site:
**every one of the ten Tailwind `fontSize` rungs that emits CSS is a tuple that also emits
`letter-spacing`**, so an amount had to choose between the type ladder (§T1) and this rule.
Write an amount as `.amount` — `src/app/globals.css`, beside `.mono`/`.tabular`, which it
replaces at a money site — and take the size from any rung. Measured with
`npm run qa:dg-type` on production, in the real JetBrains Mono: `.amount` restores the
untracked width **byte for byte** (85.81px on `TZS 679,532`, identical to today's
`text-[13px]`), so adopting it moves the ladder and no pixels.

🔴 **THE SEVERITY IS NOT UNIFORM, AND QUOTING ONLY THE 13px CASE IS THE WRONG POPULATION.**
Over `TZS 1,234,567`: `text-micro` **+0.4px/glyph = +6.67%**, `text-caption` +3.02%,
`text-label` +0.68%, `text-body-sm` −0.65%, `text-title-lg` −5.06%. At the small rungs an
amount is tracked **out**, which is precisely the "reads like a reference code" this rule
exists to forbid; at the large ones it is tightened. Both are the defect.

⛔ **AND THE GUARD WAS BLIND TO ALL OF IT.** `type-scale.test.mts` §2 forbade "tracking over
an amount" via `isTracked = toks.some(t => /^tracking-/.test(t))` — **a spelling.** A money
element written `text-micro` is letter-spaced by 0.4px and §2 printed PASS; written
`tracking-[0.4px]` it renders identically and §2 failed. Measured 2026-08-29: **8 money
elements already carry a rung's tracking in production**, two of them tracked out, and the
guard reported ALL PASS over them. Same shape as `ui-consistency`'s `hardcoded-pill-active`,
which matches the token's literal text and so finds copies but never divergence. §2's
population now includes the rungs.

⚠️ **The population, re-derived — the register's "~190 money/mono sites" is the FILE count.**
Of ~900 sites carrying both a mono/tabular signal and an arbitrary size, **~450 are §T3
blessed uppercase microlabels, which this rule never governed** (an eyebrow is an identifier
and is *supposed* to be tracked); ~450 are numerals, of which the amounts are **tens**, not
hundreds. §T5 puts every numeral in mono; **§M4 governs amounts only.**

### M4a — Text fits its container, and a clipped NUMBER is a wrong number

🔬 Measured platform-wide by **`npm run qa:fit`** (2026-09-01): 220 page-views over 56 admin
and player routes at 320/360/430/1280, **37,127 text leaves**, 415 intentional truncations
excluded, **255 defect instances in 12 component signatures**.

✅ **CLOSED at 14 instances in 1 signature**, re-measured on production at `39fe2419` — and the
one that remains is the filed header finding at the bottom of this section, which needs a design
decision rather than a fix. ⚠️ Both numbers are from the same instrument AFTER its three
corrections below; the first run's figure is not comparable to a pre-correction one, which is why
the corrections are recorded here rather than tidied away.

**The four rules, each written from a defect the sweep found:**

1. ⛔ **`min-w-0` IS PERMISSION TO DISAPPEAR, NOT A REQUEST FOR SPACE.** A `shrink-0` action side
   beside a text side carrying only `min-w-0` means the text absorbs 100% of any shortfall.
   `AdminCard`'s header learned this as **`G-5`** in 2026-08-02; `roles-matrix.tsx` never got the
   fix and rendered its domain description into a **27px box holding 161px of text, 126 times**.
   ⭐ The repair is the card header's: the row **wraps** and the text keeps a **basis**.
   ⚠️ At 1280 that same element measures 161/161 and fits — reading the markup cannot find this.
2. 🔴 **A CLIPPED NUMERAL IS A MISREPORTED FIGURE.** `AdminFunnel` split its width evenly across
   `flex-1 min-w-0` steps, and at 320 each got ~31px: the VALUE `"103"` rendered in a **20px box**.
   A truncated word is annoying; a truncated number **reads as a different number**. Numbers get a
   **minimum width and a scrolling row** — never a `title`, which only makes a wrong figure
   recoverable rather than absent.
3. ⛔ **A FIXED-HEIGHT PILL MUST NOT WRAP.** `.chip` set `height: 21px` (23px on its variants) and
   said nothing about `white-space`, so a two-word label wrapped and was **sheared**:
   `"VOID · No move"` in a 23px box holding 37px of text. Invisible to every width-based check —
   the chip is exactly as wide as it should be. `nowrap`, not `min-height`: a pill that grows
   taller is a lozenge. A label too long now makes the chip **wider**, which is visible.
4. ⛔ **`truncate` WITHOUT `title` IS LOSS, NOT A CHOICE.** DG-A-10 already ruled that truncation is
   legitimate *paired with* `title`, which keeps the full string reachable. `/admin/proposals` and
   `/admin/compliance` truncated their primary content with no affordance (**33px box, 486px of
   content**).

⚠️ **THE INSTRUMENT NEEDED TWO CORRECTIONS BEFORE IT MEASURED ANYTHING REAL,** and both were
false POSITIVES that would have "fixed" correct code: it first reported every cell of tables
inside `overflow-x:auto` wrappers — this repo's own rule for wide content, so the sweep was
indicting the design — and then 67 "escapes" on `/markets` that were one animating **ticker**,
which `live-ticker.tsx` already carries a comment about an earlier probe getting wrong. An
element is only *escaping* when no ancestor can scroll **or animate** it into view.
⛔ **`FIT_PROVE_RED=1` is the control** — it injects one clipped span and one sheared pill per page
and requires both to be caught. It failed on its first run because the assertion looked for text
past the 48-char slice the measurement stores: the control was broken, not the sweep. A sweep
reporting zero is worth nothing until it has been shown to detect one.
⚠️ `FIT_ROUTES` needs `MSYS_NO_PATHCONV=1` under Git Bash, or a leading-slash value becomes a
Windows path, every route silently skips, and the run prints a clean **"0 defects"**.
⚠️ And it must not RACE the product: measuring 180ms after `networkidle` caught the live ticker
mid-hydration, before its wrapper carried the marker class, and reported one shell element as 14
identical escapes. 700ms. An instrument that races the product measures a frame, not a layout.

**⏳ FILED, NOT FIXED — the signed-in shell header is 21px wider than a 320px viewport.**
`body` carries `overflow-x: clip`, so the excess is **clipped rather than scrollable** and the
header crest button is cut by ~8px on the narrowest phones. ⚠️ It reproduces **only with a
session** — an unauthenticated probe of the same page finds nothing, which is why it survived
earlier responsive passes. Recovering those pixels means changing padding or gaps on the header
every page shares, on a live money platform: **a design call, not a bug fix's**, and it needs
Ali rather than a session.

### M5 — A glyph moves for a reason, and all 178 move the same way

Four primitives, applied as classes (`.g-settle`, `.g-nudge-up/-down`, `.g-ring`,
`.g-swap*` — state morphs go through the kit `GlyphSwap`, `ui/glyph-swap.tsx`): arrival,
directional emphasis, alert, state morph. Triggers are mount, data change, or state change —
**never hover**; icons respond, they do not perform. The nudges fire on a data CHANGE only,
never on mount. In-flight is the kit `Spinner`, not a spinning glyph. Glyph #179 inherits by
taking a class; a glyph with bespoke keyframes is a violation. Static glyphs stay static —
this law governs motion, it does not demand it. Guard: `npm run test:glyph-motion`.

### M6 — Every animation still works with motion off — and there are THREE gates

1. **`@media (prefers-reduced-motion: reduce)`** — the OS setting. The universal clamp
   zeroes duration **and delay** (E-126 — with only duration zeroed, a delayed animation
   holds its invisible first frame for the whole delay).
2. **`html.kp-reduce-motion`** — the user's own in-app setting, a written mirror of every
   branch.
3. **`[data-motion="reduced"]`** — the low-end-Android tier (`theme-provider.tsx`
   `detectLowEnd()`: ≤4 cores, ≤4GB RAM, or Save-Data). **A THROTTLE, not a clamp**: full
   durations, ambient loops off. Its one list lives in `globals.css` §6, and every
   `infinite` animation needs an entry there.

Every `.mat-*`/`.g-*`/`.seal-*`/`.crest-*` state has written branches for the two clamps:
end frames render, nothing invisible, the bloom rests at 0.35. A new animation lands with
its branches in the same change or it does not land. The delivery named only the first two
gates; this product has three (E-125) — our target device is exactly the one the third
covers. Guard: `npm run test:reduce-motion`.

### M7 — Wins get the seal; losses get the receipt

The celebration vocabulary (seal-impress, needle-sweep, mark-flip, gilt strike) is
EXCLUSIVE to a win. A loss renders as bookkeeping: the factual toast (plain rung 4, no
color, no tick), the settled card leading with the outcome, the needle settling crisply
against the position. No red ceremony, no drained counters, no altered mark — a dramatized
loss is punitive, dilutes the win, and is a compliance liability. The asymmetry is the
design (designer R2 Q5, confirmed).

### M8 — The mark performs; nothing else borrows its stage

Identity motion (mark-flip on the needle axis, `.mark-pending`'s ambient breath — listed in
the frozen ambient-loop set and in the third gate's list) is reserved for the trademark. The
mark's colours stay the delivered hexes (#1EA362 / #B03A3E / #E3BC66) in chrome; on the seal
it renders single-ink relief. Clear space 0.25 × diameter is law even inside our own seal —
76px on a 114px face is the ceiling, not a style choice. Surface gold is the trademark
re-derivation (M3); the two never drift because they share one source. `--m-pivot` is
reserved for the needle and dials — `.g-ring` takes `--m-glide` (a bell is neither).

---

## Related — all RECORD, none of it rule

⚠️ Nothing below is required to build correctly. Each file carries a "RECORD, NOT RULE"
banner and each may contain values that have since drifted; `globals.css` outranks them
all. §0c says what each one is for.

- **Palette rationale & history** (why a hue, not what it is): `docs/design-master-brief.md`
- **The delivered July-2026 archive** (component redlines, previews, foundations,
  provenance): `docs/design-system/` — index at its `README.md`
- **The material commission's before-picture** (the critique, `AUDIT.txt`, the `INTAKE.md`
  receiving playbook): `docs/design-brief/`
- **§M provenance** (the delivery, the four measured departures, designer Q&A):
  `docs/design-system/v2-2026-07-27/11-material/`
- **Superseded snapshot — do NOT use:** `50PICK/design_handoff_prediction_market_kit/`
- **Brand identity assets:** `public/brand/` (generated from `src/components/brand.tsx`)

---

## Open design decisions — need Ali, not a session

⚪ **NONE. All four were answered by Ali on 2026-08-10 and are recorded below.** ⛔ **Do not
put them to him again**, and do not treat this heading as an invitation to add one without a
date and a quote.

⚠️ **This section listed Q5, Q7 and Q8 as OPEN for the rest of the day after they were
answered**, in a file `docs/README.md` marks 🟢 LAW and which the design-system README points at
as the single front door. A law doc asserting refuted state is worse than a stale note: it is
the thing a session is told to trust. Found by auditing the close-out, not by reading it.

1. ✅ **Q5 — GOLD IS MONEY, AND NOTHING ELSE.** Both halves resolved: the Gold **asset chip**
   (`updown-card.tsx` `AssetMark`) and the **tier ring / badge** (`TIER_RING`, `.tier-*`) are
   off the money tokens. The rule, narrower than "no gold anywhere": a tier or asset may be
   METALLIC; it may not wear `--gilt`, `--gilt-metal`, `--gilt-ink`, `--gilt-strong` or
   `--gold-300…500`. ⛔ **Q7 forced this decision** — with the lettermarks final, the standing
   *"accept it, artwork replaces the tint anyway"* answer ceased to exist. **Enforced by
   `npm run test:gold-is-money`**, which exists because this law shipped as prose and was
   already broken in its own file (E-141).
2. ✅ **Q7 — the `Au` / `Ag` LETTERMARK CHIPS ARE FINAL.** No artwork is coming. ⚠️ They are
   ELEMENT symbols, not `ticker.slice(0,2)`: XAU and XAG both start "XA" and once rendered
   identical chips.
3. ✅ **Q8 — the Up & Down nav ships as the indigo pill with NO countdown.** The refusal at
   `top-app-bar.tsx:33-37` stands on its stated grounds: a permanent countdown in global chrome
   is a persistent urgency cue (an RG problem for a licensed operator) and a per-second
   re-render fails the *"usable on a low-end Android over 2G"* bar. ⚠️ Ali did not tick this one
   explicitly; it is closed on that argument and reopens by instruction, not by rediscovery.
4. ✅ **Q6 and the crest chief band opacity** — closed the same day; see *Closed here* below.

### ✅ Closed here, 2026-08-10 (session 38) — these were never Ali's to decide

- **The 360px card title (Q6) — ANSWERED BY IMPLEMENTATION.** The 2-line clamp shipped on
  both card families, and one of them cites Q6 by name: `updown-card.tsx:399-402`
  (`WebkitLineClamp: 2`) and `globals.css:2782` (`.mcardp-q`). Both took the recommended
  answer and agree with each other. ⚠️ It is *asserted, not proven* — `innerText` returns
  the full string either way and a WRAP satisfies `scrollWidth === clientWidth` exactly as
  a fit does, so the honest check is rendered: computed `-webkit-line-clamp` plus height at
  360 × sw/zh. That belongs to the exit sweeps.
- **The crest chief band opacity — DECLARED AT THE RENDERED VALUE, `0.16`.** Three
  documents held three answers (provenance `0.26`, this file "open", the render `0.16`)
  for one thing that has exactly one observable truth: `identity-avatar.tsx:123` paints
  `opacity="0.16"`. ⛔ **A value an engineer can read off the render is not an owner
  decision** — parking it as one is how a three-way disagreement survives four sessions.
  Provenance's `0.26` is corrected to match; if Ali later wants a different band, that is
  a new instruction, not an unanswered question.
