# When the Claude Design work arrives — what to do with it, and where it goes

> ✅ **IT ARRIVED, 2026-08-06, and it lives at**
> **`docs/design-system/v2-2026-07-27/11-material/`** — read that folder's `README.md` first: it
> carries the merge map, the eight laws in one line each, and the designer's own open items.
> ⛔ **Nothing is merged yet.** Everything below still applies — §1 acceptance, §2 placement,
> §3 order, and above all **§3b, what DIES when each piece lands.** The `delivery/` drop folder
> this file used to name is gone; the delivery is in the design system where it cannot go stale.

**For whichever session receives the delivery.** Written 2026-08-06, before anything was sent, so
it is a plan and not a rationalisation. `README.md` in this folder is what we commissioned;
`AUDIT.txt` is the measured state it was commissioned against. Read both before integrating.

⛔ **Do not start by pasting anything into `src/`.** The order in §3 exists because tokens are
inherited — integrating a component before the ladder it depends on produces a component that
looks right once and drifts the moment the ladder lands.

---

## 1 · First, verify the delivery against what was asked

> ✅ **DONE 2026-08-06. The delivery is ACCEPTED.** The completed table, the D-6.6 result and the
> four things the delivery gets factually wrong about our own files all live in
> **`11-material/README.md`** — one definition site, not two. The short version:
> **one item goes back** (there is no rung-independent tint recipe, so a tinted-but-flat surface
> like `ui/callout.tsx` cannot be expressed and D-6.6 forces a guess), and everything else is
> sound. ⭐ The ladder turned out not to be a second ladder at all: `--elev-raised`'s cast is
> **byte-identical** to our shipped `--shadow-card`, and every rung's only delta is that the
> banned one-sided `inset 0 1px 0` becomes an even ring.

Before any file moves, check the delivery against **D-0 … D-6** in `README.md`. Anything missing
is cheaper to ask for now than to reverse-engineer later.

| check | where it was specified | reject if |
|---|---|---|
| every animation names its **easing + duration token** | D-1.2 | a raw `cubic-bezier(…)` or a bare `320ms` appears |
| every animation has a **written** reduced-motion branch | D-1.5 | described but not written |
| nothing animates a **layout property** | D-1.6 | `width` / `height` / `top` / `left` / `margin` is animated |
| colours are **`oklch()`** | D-5 | any hex or `rgb()` |
| **no new runtime dependency** | D-5 | a `package.json` change arrives |
| **no public prop changes** | D-5 | a component's exported props differ from `components/*.tsx` |
| an **elevation ladder as tokens** exists | D-3 | shadows are hand-written per component |
| a **"how to extend this"** note exists | D-3 | only components arrived, no rules |

⭐ **The acceptance test that matters (D-6.6): pick a component they never saw — `ui/callout.tsx`
is a good one — and try to apply the system from the written rules alone.** If you have to guess,
D-3 was not delivered and that is the thing to send back. Everything else is repairable in-house.

---

## 2 · Where each artifact goes

| what arrives | goes to | notes |
|---|---|---|
| **design tokens** (elevation ladder, gilt recipe, any new `--*`) | `src/app/globals.css`, in the existing `:root` block, beside the tokens they extend | ⛔ **one definition site.** Never a second `:root` and never a token in a component file (DESIGN_AUTHORITY B5) |
| **easings / durations** | `src/app/motion.css` | the vocabulary lives there; `globals.css` only aliases it |
| **`@keyframes`** | `src/app/globals.css` | check `law/keyframes.css` first — **do not add a second name for a motion that already exists** |
| **utility classes** (`.ticket-target`-style) | `src/app/globals.css`, next to the rule they belong to, **with the comment explaining why they exist** | a class with no comment is one nobody dares delete later |
| **component changes** | the existing file in `src/components/…` — *edit in place* | ⛔ never a `-v2` copy. Two components doing one job is the drift the ratchet exists to stop |
| **new shared primitives** | `src/components/ui/` | must be usable by admin and player alike |
| **SVG assets** (the seal, crest parts) | inline in the component, as now | we have no asset pipeline and do not want one — everything is inline SVG |
| **the written rules** ("how to extend this") | `docs/DESIGN_AUTHORITY.md`, merged into the relevant section | this is the file future sessions actually read |
| **motion documentation** | `docs/design-system/v2-2026-07-27/08-motion/` | the versioned system already has this section |
| **their rendered stills** | `docs/design-system/v2-2026-07-27/07-provenance/` | provenance, so a future session can see what was signed off |
| **the raw delivery, untouched** | ✅ already at `docs/design-system/v2-2026-07-27/11-material/` | keep the original. When something looks wrong six weeks later, the question is always *"is this what they sent, or what we did to it?"* |

⛔ **Nothing goes in `src/lib/server/`.** Design work never touches the money path.

### ⛔ 2a · A token that ALREADY EXISTS is edited AT ITS LINE — never re-declared at the top

Added 2026-08-06. This is the single hazard most likely to make an atom *appear* to land while
changing nothing, and it cuts in **both** directions:

- **The browser takes the LAST declaration. `scripts/contrast-audit.mts` takes the FIRST.**
  Its `token()` uses `CSS.match(re)`, which returns the first hit (`contrast-audit.mts:37-38`).
  So re-declaring `--bg` near the top of `:root` while `globals.css:244` still defines it means
  **the product renders the old canvas and the gate scores the new one** — every ratio prints
  better than reality, including `--text-faint`, which sits at 4.88 against a 4.5 floor. That is
  byte-for-byte the drift the parser's own header says it was written to kill.
- **And the mirror image: the repair silently does nothing.** Re-declare `--shadow-card-top` at
  the top and `globals.css:398` still wins in the browser. The atom ships, the production LOOK
  shows no change, and `test:tokens` passes — because its cross-file rule compares *files*, and
  both declarations are in `globals.css`. You would have no way to tell.

**So: additive tokens go in a new block; existing tokens are edited in place.** In this delivery
exactly two qualify — `--bg` (`globals.css:244`) and `--shadow-card-top` (`:398`).

### ⚠️ 2b · The wash cannot be delivered by redefining `--bg-elevated`

`--bg-elevated` is consumed as a **colour**, not just as a background: inside `color-mix()` at
`globals.css:1215, 1425, 1824, 2362, 2363`, and as Tailwind alpha `bg-bg-elevated/40|50|60|85`
across a dozen components. A `linear-gradient()` is not a colour, so `color-mix()` becomes
invalid and **those declarations drop entirely** — silently, with no build error. The wash must
arrive as a **class per surface** (`.mat-raised` et al), which is what M2 says anyway: a surface
*picks* a rung. ⭐ The elevation half of the ladder can be reached by repairing a token; the
background half cannot.

---

## 3 · Integration order — and why it is this order

Everything inherits from the layer above it, so integrating out of order means doing it twice.

1. **Tokens first** — elevation ladder, gilt recipe, any new easing. Nothing visual yet.
   → `npm run test:design-frozen` must still pass. Commit alone.
2. **Keyframes + utility classes.** Still nothing consuming them.
   → `npx tsc --noEmit && npm run build`. Commit alone.
3. **One representative component per family** — pick `ui/modal.tsx` (overlays),
   `markets/market-card.tsx` (cards), `ui/button.tsx` (controls). Integrate, then **LOOK at it**
   at 360 and 1280 in EN/SW/ZH before touching the rest of the family.
   → this is the moment to find out the ladder is wrong, while three files use it and not forty.
4. **The rest of each family**, family by family, a commit each.
5. **The 185 icons** — mechanical once the primitive exists. One commit.
6. **The written rules into `DESIGN_AUTHORITY.md`** — same commit as the last code that proves them.

⭐ **Stop after step 3 and re-read the audit.** `AUDIT.txt` is a before-picture; re-run
`node scripts/ui-material-audit.mjs` and the numbers should move in the direction you expect. If
they do not, the integration is wrong, not the audit.

---

## 3b · ⛔ WHAT DIES WHEN EACH PIECE LANDS — replace, never accumulate

**This is the section that keeps the repo clean, and it is the one most likely to be skipped.**
A delivery is a *replacement*, not an addition. If the old thing survives beside the new one you
have not integrated a design system — you have created a second one, and every future session
has to guess which is current. **Two definitions of one truth is the single most expensive
defect class in this repo's history.**

| when this lands | this must be DELETED in the same commit |
|---|---|
| the **struck seal** | the drawn trophy + its **eight straight-line rays** in `brand/reward-burst.tsx`, and any keyframe that only animated them |
| an **elevation ladder** as tokens | every hand-written `box-shadow` / `ring-` in a component that the ladder now covers — grep `box-shadow` under `src/components/` and justify each survivor |
| a **gilt/metal recipe** | every one-off gold gradient or `--gilt` blend written inline in a component |
| an **entrance/exit family** | the superseded keyframes it replaces. ⛔ Check `law/keyframes.css` — 33 exist; if the new family covers `toast-slide` or `kp-rise`, those go |
| **icon motion primitives** | any bespoke per-icon transition added ad hoc |
| **new tokens** | the literals they replace. A token that lands while the literal survives has bought nothing |

### The three checks that prove nothing was left behind

1. **`npm run test:design-frozen` — the allowlist should SHRINK.** It holds 45 files carrying
   inline design values. If the delivery is real, several stop needing the exemption. ⭐ **A
   delivery that leaves it at 45 did not replace anything, it decorated.**
2. **`npm run test:motion-ladder` — its allowlist is at 0 and may only stay there.** The two
   scheduling exemptions were cleared 2026-08-06; a new entry re-opens the hole.
3. 🔴 **`node scripts/ui-material-audit.mjs` — AND THIS CHECK, AS ORIGINALLY WRITTEN, IS BACKWARDS.
   Corrected 2026-08-06 at acceptance, by reading the script instead of trusting its output.**

   It said: *"the before-picture is `AUDIT.txt` — 79% no light · 60% no elevation · 44% no motion ·
   43 with all three absent. Those numbers must move. If they do not, the integration is wrong,
   not the audit."* **That is false for this instrument, and believing it would have made us do the
   integration wrong on purpose.**

   `ui-material-audit.mjs:44-47` scores each component by **word-grepping its own `.tsx` source**:
   ```
   light     = /gradient|specular|inset 0|backdrop-filter|blur\(/i
   elevation = /shadow|--shadow-|ring-|elevat/i
   tokens    = /--m-[a-z]|--t-[a-z]|var\(--ease|var\(--dur/
   ```
   `.mat-raised` contains none of those words. `--elev-*` and `--wash-*` match neither detector.
   **So material that lands where B9/B10 REQUIRE it to land — in the law layer — is invisible to
   this audit, and a component that stops hand-writing a `boxShadow` and takes a class LOSES its
   elevation tick.** A correct merge drives these numbers the wrong way.

   Measured, not argued: **`markets/market-card.tsx` scores 🔴 all-three-absent** and sits at the
   very top of `AUDIT.txt` — while `.mcardp` (`globals.css:2196-2200`) already carries a cast, a
   lit edge, a border, a background and a `m-draw` spark-line animation. The audit could not see
   any of it. ⚠️ And ~8 of the 43 are not renderable surfaces at all (`notify-poller`,
   `refresh-poller`, `scroll-restore`, `lazy-overlays`, `event-stream-provider`, `page-container`,
   `form-column`, `scroll-x`) — a poller has no surface to light. **"43 → 0" was a grep result
   being read as a brief.** The script's own header says so: *"THIS IS A PRE-FLIGHT, NOT A VERDICT
   … It ranks; it does not judge."*

   **What to do instead — two instruments, and say which is which:**
   - **`ui-material-audit.mjs` stays byte-identical**, because it is the instrument that produced
     `AUDIT.txt` and changing it would make the before and after two different rulers. Its number
     is a *continuity* reading. Expect it to stay flat or worsen, and **say so plainly** rather
     than quietly re-tuning it into agreement.
   - **`--resolve` mode** follows each `className` into `globals.css`/`motion.css` and scores the
     CSS that actually applies. That is the number that measures the merge.
   - ⭐ **`test:design-frozen` is the honest scoreboard, but it is a NARROW one — measure what it
     can actually see before promising it will move.** It is honest by construction: its per-line
     escape hatch skips any line containing `var(--`, which is exactly what this merge does to a
     hand-written shadow, and it **FAILS if a listed file becomes clean and is left on the list**
     (`design-frozen.test.mts:192-201`, *"the ratchet holds no stale exemptions"*), so the number
     cannot be left at 45 by accident.

     ⚠️ **But it walks `.tsx` only.** Every token, keyframe and utility atom — the whole law
     layer — is invisible to it. Only the atoms that edit components can move it at all.

     ⚠️ **And most of the 45 are not held there by a shadow.** Measured 2026-08-06 by running the
     script's own five rules against the single-violation files, minus the `var(--` hatch:
     `ui/chip.tsx` is five raw `oklch()` **colour** literals in a variant table · `ui/tabs.tsx`
     and `layout/nav-more.tsx` are raw `oklch()` backgrounds · `ui/empty-state.tsx` is a colour
     **constant** (`const g = "oklch(78% 0.14 86)"`) · `layout/avatar-menu.tsx` and
     `layout/notifications-panel.tsx` are `borderRadius:` **numbers**. **Material work does not
     touch any of them.** The files this merge genuinely clears are the ones held by an actual
     inline shadow or by geometry that is being deleted: `ui/toast.tsx` (`boxShadow: "0 0 6px 0
     currentColor"`) and `brand/reward-burst.tsx` (two `borderRadius` values on the heraldic
     corner brackets, which die with the rays). ⛔ **So expect roughly 45 → 42, not 45 → 30**, and
     the honest report says which files moved and why — not a number with a story attached.

     ⛔ And do not count `markets/position-card.tsx:55` as ratchet progress. Its duplicated
     `shadow-[…]` line contains `var(--brand-500)`, so the per-line hatch already exempts it.
     Fixing it is right — it is a verbatim second copy of `.mcardp:hover` — but it moves the
     scoreboard by exactly zero, and claiming otherwise is the kind of arithmetic this campaign
     has had to retract before.

### What to delete outside `src/`

- **superseded design docs** — if a rule moves into `DESIGN_AUTHORITY.md`, remove the older
  wording rather than leaving both. `npm run test:integrity` exists to catch exactly this.
- **the scratch** — `.qa-s3*/`, `design-brief/`, `design-brief.zip` are gitignored build output.
  Never commit them.

### What to KEEP, deliberately

- **`docs/design-system/v2-2026-07-27/11-material/`, untouched** — spec, manifest and the two Q&A rounds. It is provenance, not clutter.
- **`AUDIT.txt` and `CURRENT-STATE.md`** — they are the *before*. Deleting them destroys the
  only evidence of what the commission was for.
- **`shots/podium-and-avatars.png`** — the BEFORE of E-111, paired with its AFTER.

---

## 3c · ⭐ DRIVE IT — a gate is a pre-flight, the browser is the evidence

⛔ **No integration commit is finished until the thing has been driven on production.** Every
gate in §4 can pass over a screen a person cannot read; this campaign's record on that is
unambiguous, and the defects that mattered were found by opening an image.

**For each family, after it lands:**

```bash
# the whole sweep — viewport shots, 4 widths × 3 locales, ranked
SHOT_DIR=.qa-design node scripts/live-s29-sweep.mjs player 360,768,1280,1920 en,sw,zh
SHOT_DIR=.qa-design node scripts/live-s29-sweep.mjs admin  360,1280 en,sw,zh
```

⛔ `locator.screenshot()`, **never `fullPage`** — Playwright stitches, so a sticky header paints
mid-document and lands on the content, which reads exactly like a z-index bug and is entirely
the harness's. ⚠️ The scan **ranks, it does not judge** — open the images.

**The celebration and the overlays cannot be swept**, because they need a state. Drive them:

```bash
SHOT_DIR=.qa-design node scripts/live-s31-win-popup.mjs   # win modal, EN/SW/ZH × 360/1280
```

⚠️ Two timing traps already paid for: the payout is a **rolling counter over ~900ms** (a
screenshot taken early photographs it 10 short, which reads exactly like a money bug), and the
modal **auto-dismisses at 4.5s**. Shoot inside that window.

**Still never seen live and worth catching:** the **VOID/refund toast** — the toasts are
context-only with no imperative API, so it needs a real settlement on a round the viewer holds.

**What to look for, specifically:**

| | |
|---|---|
| **360 SW** | Swahili runs ~40% longer. It is where truncation and wrapping bite first |
| **360 ZH** | ~50% shorter — the opposite failure, panels that now look empty |
| **the boundary** | anything that changes at a phase change: a clock hitting zero, a result arriving |
| **reduced motion** | run once with the OS setting on. Every animation must still convey its state change |

---

## 4 · The gates — every commit, no exceptions

### ⭐ 4a · THE EXIT GATE FOR AN ATOM IS FOUR-PART, AND ALL FOUR ARE REQUIRED

Ali, 2026-08-06: *"don't finish any phase unless it's validated visually and technically and
consistency-wise with the design handover and responsiveness."* An atom is **not done** until
every one of these is true, and each has to be *shown*, not asserted:

| | what it means | how it is shown |
|---|---|---|
| **1 · Technical** | the gates below are green **and the change is the one you meant** | `tsc` · `build` exit code · the `test:*` set · plus a **falsifiable check** — the grep or probe that would FAIL if the atom had done nothing |
| **2 · Visual** | a person has **opened the image** | `scripts/live-material-probe.mjs` for material (4× corner crops — a 1px ring is invisible at 1×), `live-s29-sweep.mjs` for layout. ⛔ `locator.screenshot()`, never `fullPage` |
| **3 · Consistency with the handover** | the shipped thing matches **what the delivery actually specifies**, not what looks fine | re-read the relevant M-law and the `spec.html` section for that surface, and state which one it satisfies. ⛔ "It looks good" is not this check |
| **4 · Responsiveness** | **360 · 768 · 1280 · 1920 × EN · SW · ZH** | the same probe across the matrix. **360 SW** is where truncation bites first (~40% longer); **360 ZH** is the opposite failure, panels that look empty (~50% shorter) |

⛔ **A single-viewport, single-locale capture does not close an atom.** Measured on this very
merge: ATOM 2 was verified at 1280/EN, looked complete, and was **reopened** because 11 of its 12
required cells had never been shot.

## The gates themselves

```
npx tsc --noEmit
npm run build                 # the deploy gate
npm run test:design-frozen    # the ratchet over 45 files — it may only SHRINK
npm run test:ui-consistency   # no new drift beyond the tracked baseline
npm run test:motion           # motion-token adoption
npm run test:trilingual       # EN/SW/ZH parity
```

⚠️ `test:responsive` and `test:motion` need a live server on `:3000` — that is the documented
exception class, not a regression.

⛔ **And then LOOK.** Every gate here can pass over a screen a person cannot read. This campaign's
own record is unambiguous: the defects that mattered were found by opening the image, never by the
suite beside it. **Shoot with `locator.screenshot()`, never `fullPage`** — Playwright stitches, so
a sticky header paints mid-document and lands on the content, which reads exactly like a z-index
bug and is entirely the harness's.

Use `scripts/live-s29-sweep.mjs` — it captures viewport shots across 4 widths × 3 locales and
ranks what to open first. ⚠️ Its scan is a **pre-flight, not evidence**.

---

## 5 · What to reject, and say so plainly

- **A component without its states.** D-2 lists them; a hover-only delivery is a third of a
  component.
- **A motion with no exit.** Every entrance needs its leave.
- **Anything that animates a layout property.** Non-negotiable — it is a jank source on the
  low-end Android over 2G we target.
- **A second definition of an existing token or keyframe.** Two definitions of one truth is the
  single most expensive defect class in this repo's history.
- **A celebration that escalates.** The register is fixed: calm, heraldic, never casino. If it
  arrives with confetti energy, it is wrong however well it is made.
- **Gold used decoratively.** `--gilt` on a player surface means **earned money**. A gold accent
  on a neutral control breaks a rule players read without knowing they read it.

---

## 6 · Record what happened

In the same commit as the integration, not after it:

- `docs/LIVE-QA-CAMPAIGN.md` §6 — a finding row per defect the new work fixes or exposes;
- `docs/design-system/v2-2026-07-27/07-provenance/CHANGELOG.md` — what landed, from whom, when;
- `docs/DESIGN_AUTHORITY.md` — the new rules, in its voice;
- this file — if the intake taught us something, amend it. ⛔ A playbook that lags the work is
  worse than none, because the next session trusts it.

---

## 7 · If the delivery is good, the follow-on work is ours

Two things are **in-house and do not need a designer**, and neither should wait for the delivery:

1. ✅ **DONE 2026-08-06 (E-111) — the crest geometry.** Every stroke in `ui/identity-avatar.tsx`
   rendered sub-pixel at all six sizes (0.16px–0.64px); each now carries a 1-CSS-px floor and
   the heraldic layer is visible for the first time. `test:crest-legibility` guards it.
   ⛔ **What is still open is the band OPACITY and the crest's material — that is Claude
   Design's, not ours**, and re-doing it here would smuggle a redesign into a bug fix.
2. ✅ **DONE 2026-08-06 (E-113) — the token ladder.** 14 components migrated, 23 literals
   replaced, and one animation that ran at **800ms above the ladder's 620ms ceiling** brought
   down to it. `test:motion-ladder` is now a ratchet whose allowlist may only shrink — already
   5 → 2, and both survivors are a **scheduling** exemption (another session was live in
   `src/components/updown/`), not a design one. ✅ **CLEARED THE SAME DAY — the ratchet is now at
   0.** That session finished its Up & Down work and removed them itself; both held the identical
   literal `color 240ms ease`, now `var(--t-base) var(--m-glide)`.
   ⚠️ `--t-base` (220ms) was chosen as the nearest rung to **preserve** the behaviour. The
   ladder's own semantics would argue for `--t-flick` (a colour change travels nowhere), but
   240 → 90 is a feel change on the clock counting out a player's last seconds to bet — **that
   one is yours to decide deliberately, not to inherit.**

---

## 8 · ⚠️ WHAT CHANGED UNDER THIS BRIEF WHILE IT WAS OUT — read before designing the card

The brief and `AUDIT.txt` are a photograph, and the product moved on 2026-08-06 while they sat in
the drop folder. **One of the four surfaces the critique names has changed shape**, and a
material treatment sized to the old one would have to be re-worked.

### The Up & Down **bettable** card is taller and busier than the shots (E-109)

`CURRENT-STATE.md` §4 critiques `shots/board-card-settled.png` — the **settled** state, which is
unchanged and whose critique still stands in full. But the **bettable** state gained, the same
day, the honest-multiplier work:

- the two place buttons now carry **different** multiples (`× 1.00 est.` / `× 2.66 est.`) instead
  of one flat `× 1.5` — on a one-sided round they differ by an order of magnitude, so the two
  buttons are no longer typographically symmetrical;
- an **info-glyph sentence** — *"Nobody has backed Down yet — if that does not change, your stake
  comes back"* — wrapping to 2 lines at 360;
- the estimate note now renders on the **compact** size too, another 2–3 lines.

**Measured on production at 360:** card height **563px (EN) · 578px (SW) · 545px (ZH)**, with
0 overflow, 0 clipping and 0 document overflow in all three. Shots:
`.qa-s32/e109-card-360-{en,sw,zh}.png` (gitignored — re-shoot with
`SHOT_DIR=.qa-design node scripts/live-s32-card360.mjs`).

⭐ **Why it matters to the material work:** this card is the iconic surface, it now carries **four
text rows below its primary action**, and it is the surface most bets are placed from. An
elevation and light treatment has more to hold up than the shots suggest.

### Two live findings ON that card, filed FOR this pass and deliberately not fixed

| id | what | why it was left |
|---|---|---|
| **E-112** | the five stake chips (`500 · 1K · 2.5K · 5K · Custom`) render **26px** tall against the platform's own **40px** tap floor — in all three languages, at 360. These choose **how much money a player stakes** | it is a control-height change (`chipBase`'s `py-1`, or the `--h-control-*` tokens) on the surface this pass owns. Two sessions restyling one row is how the UI-consistency work gets undone |
| — | the footer trust line is ellipsised at **7% hidden in EN and 51% in SW** — *"Soko la sarafu-fiche la moja k…"*. Half the sentence naming where the price comes from sits behind the "…" | ⛔ a legitimate `text-overflow: ellipsis`, **not** a clip, and §0.1b.3 forbids scoring one as a defect. But 51% is a judgement a person should make, not a scan |

### The rest of the alignment, one line each

- ✅ `src/components/updown/` is **quiet** — that session is finished there. Nothing is reserved.
- ✅ `test:motion-ladder` is at **0** exemptions. `test:design-frozen` still holds **45** — that is
  the number §3b says must shrink when the delivery lands.
- ⛔ **`src/lib/updown-pricing.ts` and `src/lib/updown-movement.ts` are money and gate logic**, not
  design. Nothing in the delivery touches them, and nothing in `src/lib/server/` either (§2).
- ⚠️ **Two sessions share this tree.** Stage surgically (`git add <path>`,
  `git commit -F msg -- <paths>`), never `git add -A` — it shipped a half-finished feature to
  `main` on 2026-08-06 and only the build failing kept it off production. And **re-grep finding
  ids at the moment you file**: `E-111` was claimed by two sessions within minutes, and
  `test:tracker-hygiene` §1 is what caught it.
