# When the Claude Design work arrives — what to do with it, and where it goes

**For whichever session receives the delivery.** Written 2026-08-06, before anything was sent, so
it is a plan and not a rationalisation. `README.md` in this folder is what we commissioned;
`AUDIT.txt` is the measured state it was commissioned against. Read both before integrating.

⛔ **Do not start by pasting anything into `src/`.** The order in §3 exists because tokens are
inherited — integrating a component before the ladder it depends on produces a component that
looks right once and drifts the moment the ladder lands.

---

## 1 · First, verify the delivery against what was asked

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
| **the raw delivery, untouched** | `docs/design-brief/delivery/` (create it) | keep the original. When something looks wrong six weeks later, the question is always *"is this what they sent, or what we did to it?"* |

⛔ **Nothing goes in `src/lib/server/`.** Design work never touches the money path.

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

## 4 · The gates — every commit, no exceptions

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
   `src/components/updown/`), not a design one. ⛔ Removing those two is the first job for
   whoever finds that directory quiet.
