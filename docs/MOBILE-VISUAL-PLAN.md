# MOBILE VISUAL PLAN — 50pick on a phone

> **STATUS: 🟠 PLAN — approved by Ali 2026-09-15, not started.** This file is a RECORD and a WORK ORDER, **not** design law.
> The law is [`DESIGN_AUTHORITY.md`](DESIGN_AUTHORITY.md); token values live only in `src/app/globals.css`. This file mints no
> law. Where it quotes a number, the number is a measurement with a date or a target with its arithmetic, never a definition.
> Sibling record: [`PLAYER-VISUAL-2026-09.md`](PLAYER-VISUAL-2026-09.md) (measured 390/768/1024/1280/1920). **It never measured
> 360 or density**, and that is the gap this plan fills.

| | |
|---|---|
| **Opened** | 2026-09-15, on Ali's instruction ("full plan for mobile visuals … something perfect for mobile") |
| **Approved** | Ali, 2026-09-15, with owner decisions 1–10 in §4 answered explicitly |
| **Scope** | every player surface at phone width (320–639px): the market board, header, home, market detail, chat bubble, popups and questions, toasts, celebrations, notices, notifications, page shells, footer, copy. ⛔ Admin excluded |
| **Branch** | `main`, one unit per commit (push = live deploy) |
| **Live state** | ⚠️ re-derive every session: `git log --oneline -1 origin/main`. A merge state written in a table has a shelf life |
| **Evidence** | `.qa-shots/mobile-visual/<unit>/<before\|after>/` (gitignored, per DESIGN_AUTHORITY §0b). Only numbers are written here |

---

## §0 — RESUME AT

**Starting a session on this plan** (Ali, 2026-09-15: every later session starts here, with the progress):
1. `git pull` then `git log --oneline -5 origin/main`. A commit newer than §2's last entry means another session is in flight; coordinate first.
2. Read this §0 block, then the §1 status board, then §5 (hard rules), then the two units named in **NEXT** below (§9).
3. Work those two units exactly as §11 (Verification) says: RED guard first, gates twice, docs in the same commit, push, production re-measure.
4. Close the session by rewriting this §0 block, ticking §1, adding a §2 entry, and updating the board row in `NEXT-PLAN.md`, all in the closing commit.

```
▶ NEXT: Session S1 → U1 (baseline instrument + signed-in QA player) and U2 (density setting + switch, no visual change).
  Read §5 (hard rules) and §9 U1–U2 before touching code.

✔ LAST SESSION (S0, 2026-09-15): this plan written and pushed, with the owner rulings recorded in
  design-brief/PLAN-OF-RECORD.md §8.8 and the NEXT-PLAN.md board. No product code changed.

◐ HALF-DONE: nothing.

? OPEN OWNER QUESTIONS: none. SW/ZH wording for the new keys (U2, U20) needs a native reader before ship.

⚠ TRAPS ALREADY MET (2026-09-15 capture):
  · `networkidle` never fires on www (live stream). Use `load` + a 2.5s wait.
  · The first-visit primer covers every guest page. Set localStorage `50pick-primer-seen=1`; the primer is
    only photographed on purpose (`?primer=1`).
  · QA player accounts `alpha`/`echo` were rejected on production (likely the 2026-09-11 reset). U1 mints a labelled
    QA player; one login per account (a second login revokes the first; 5 failures lock it for 30 min).
  · Screenshot pixels are 2× CSS pixels at DPR 2. One "130px gap" was really 41px.
```

## §1 — Status board

Legend: ⬜ not started · 🟡 in progress · 🔵 shipped, not yet verified live · ✅ verified on production · ⏸ blocked (reason).
A row turns ✅ only after the production re-measure, **in the same commit that records the numbers**.

| Unit | Kind | Status | Session | Commit | Before → After (measured) | Guard RED-proven | Notes |
|---|---|---|---|---|---|---|---|
| U1 Baseline instrument + QA player | — | ⬜ | S1 | | | | |
| U2 Density setting + switch | Compact | ⬜ | S1 | | | | |
| U3 Market card + Up & Down card + skeleton token | Compact | ⬜ | S2 | | | | |
| U4 Discovery bar | Compact | ⬜ | S2 | | | | |
| U5 Header pills + phone rhythm tokens | General | ⬜ | S3 | | | | |
| U6 Home tightening | General | ⬜ | S3 | | | | |
| U7 Chat bubble | General | ⬜ | S4 | | | | |
| U8 Countdown + guest order | General | ⬜ | S4 | | | | |
| U9 Defects D1 · D5 · D7 | General | ⬜ | S5 | | | | |
| U10 Defects D2 · D6 | General | ⬜ | S5 | | | | |
| U11 Overlay census | — | ⬜ | S6 | | | | |
| U12 `<Modal>` + questions as sheets | General | ⬜ | S7 | | | | |
| U13 Result modal · bet confirm · sell confirm (+ D9) | General | ⬜ | S7 | | | | |
| U14 Win celebration | General | ⬜ | S8 | | | | |
| U15 Toasts | General | ⬜ | S8 | | | | |
| U16 Notice stack + first-visit coordination (D4) | General | ⬜ | S9 | | | | |
| U17 Notifications | General | ⬜ | S9 | | | | |
| U18 Page shells · primer · detail pages | General | ⬜ | S10 | | | | |
| U19 Live carousel · Help rows · auth forms | General | ⬜ | S11 | | | | |
| U20 Footer tap rows + Discussion copy (D8) | General | ⬜ | S11 | | | | |

| Defect | Status | Owning unit |
|---|---|---|
| D1 · D2 · D3 · D4 · D5 · D6 · D7 · D8 · D9 | ⬜ all | see §8 |

## §2 — Session log (newest first)

- **S0 · 2026-09-15.** Live capture of www.50pick.tz at 360×780 and 412×915, EN and SW, signed out (report:
  https://claude.ai/artifact/NknLB5EDQ9qrKGPHjMwtBA). Code exploration of the card, board, chrome, overlays and gates. Three independent
  verification passes checked every file:line in this plan, and corrected nine claims before they were written down (among them: the email bar is
  not dismissible by design, DG-P-08 forbids truncating podium handles, `.row-link` is uppercase, and the Closing-soonest titles are 17px squeezed
  by layout, not 20px). Owner decisions 1–10 answered. Plan and rulings pushed. No product code changed.

---

## §3 — Context: what was measured (2026-09-15, live, 360×780 unless noted)

Players (mostly on mobile) split: some say sizes are right, others that the site is "chunky and big". **Both are right.** Type and tap
targets are sound (card title 15px, YES/NO 40px). **The problem is density:**

| Measure | Value |
|---|---|
| Market card height | 278–354px (347 typical, 44% of the screen). Height comes from content; identical at 412 |
| Pinned chrome while scrolling `/markets` | 237px = header 56 + discovery bar 116 + rail 65, i.e. 30% of the screen, so about **1.6 cards** visible |
| Home document | 8,443px = 10.8 screens (SW 8,690 = 11.1) |
| Home hero | stats stacked (≈ 370px), 20px lede, 56px CTAs, 64px section gaps |
| Up & Down card | 550px and 468px (the tallest card on the platform) |
| Header Sign in / Sign up | 48px pills in a 56px bar |
| Chat bubble | 52px, fixed, covers card Details links on every page |
| Text mix | on most pages 42–86% of characters are 12px mono labels while headings are 28–32px, so the jump makes big things feel bigger |

## §4 — Owner decisions (Ali, 2026-09-15, each asked explicitly)

1. **Density:** Compact is the phone default, with a **Card spacing: Comfortable / Compact** switch to return to today's look.
2. **Home:** tighten on phones, keep every section.
3. **Chat bubble:** 44px, hides while scrolling, returns when scrolling stops.
4. **Sparkline in Compact:** kept, 28 → 20px (Compact changes spacing only; nothing disappears).
5. **Market detail, signed out, phones:** the YES/NO split and pool come first, then the sign-in box. Signed-in order unchanged.
6. **Countdown:** simplified **everywhere**. With ≥ 1 day left, days + hours; under 24h, all four tiles.
7. **Confirmation questions on phones** (sign out, deposit/withdraw confirm, RG limits, close account, cash-out): slide up from the
   bottom as sheets, with the same content and safety wording. Desktop unchanged.
8. **Toasts on phones:** at most **2** at once; the rest queue and nothing is dropped.
9. **Notice bars on phones:** announcements/maintenance and session-ended always show; the others show one at a time.
   ⚠️ Reconciled with code: the **email-verify bar is deliberately not dismissible**, only collapsible (`email-verify-banner.tsx:19-44`:
   *"would let a player permanently hide the reason their deposit will be refused"*), and it reads first by design (`app-shell.tsx:334-336`).
   So it keeps first place and non-dismissibility, and the **away summary waits** until the email bar is collapsed or absent.
10. **Scope:** the plan also covers toasts, popups/sheets, questions, celebrations, warnings, notifications and detail pages. Name: Mobile Visual Plan.

**⚖️ Decision 1 supersedes the 2026-08-13/14 deferral** "compact list / density toggle" (`NEXT-PLAN.md` "ruled out" line;
`design-brief/PLAN-OF-RECORD.md` §8.8). It stays honest to that deferral's reason: the switch is labelled **"Card spacing"** (never "list
view"), it changes spacing only, and **`MarketListRow` is still not built**. `DENSITY_IDS ["grid","list"]` (`discovery.ts:133`) stays unwired.

**Two kinds of change** (Ali: "not at compact level but also at general level"):
- **[Compact]**: only the market board's density: market cards, the Up & Down card (same `.mcardp` shell), grid gap, the sticky
  discovery bar. These follow the switch; Comfortable shows today's board exactly.
- **[General]**: everything else that makes phones fit better for every player in both settings. These do not follow the switch.

## §5 — Hard rules (law or dated ruling; MUST hold)

- **Tap floor** (DESIGN_AUTHORITY §A2): every control ≥ `--tap-min` 40px, 44 preferred. YES/NO stay 40; `.mcardp-info` stays `var(--h-control-md)`.
- **Type ladder closed** (§T1/§T3/§T7): no hand-typed sizes. Card title stays 15px; market title stays 28px (DG-P-03). A step is always onto an
  existing `--type-*` or `fontSize` key.
- **One home for values** (§0d): spacing, control and radius values live only in `globals.css`. Prefer stepping a token for phones (the `--rh-*` precedent).
- **B9/B10**: a new state is a prop or attribute on the existing component, with no new `.css` file and no second component. A moved spec changes its test in the same commit.
- **Filter language** (§6/6b): sort and status never cost a tap at any width. The discovery bar **does not hide on scroll**; row 2 never scrolls.
- **§A5/§A6**: SW ≈ 35–40% longer. Money and time are never clipped; zero horizontal overflow at 320/360.
- **E-276**: Sign in and Sign up both visible at every width including 320, at the same height.
- **Compliance messages are never hidden or made dismissible**: maintenance, session-ended, the email-verify bar (collapsible only), the 18+/RG
  footer lines, payout-status notices, the reality check's four actions.
- **Cold start**: `fresh = live && volume 0 && predictors 0`, consistent on card, board and detail.
- **Process**: one fix, a guard proven RED first, docs in the same commit, a push, a production re-measure; gates run twice; two units per
  session; stage by name; `git branch --show-current` before every commit.

## §6 — Could change / must not change

| Area | CAN change (phones) | MUST NOT change |
|---|---|---|
| Market card | inner gaps, action margins, sparkline height, grid gap, skeleton height (`.mcardp` has no fixed height; `MARKET_CARD_H` only sizes skeletons) | title size and 2-line reserve, 40px YES/NO, 44 info button, the footer's 10px gap + 13px bottom padding (the Details/share 40px `::after` reach depends on them) |
| Discovery bar | two rows → one control line + a count line (CSS) | hide-on-scroll, a scrolling row 2, sort behind a tap |
| Header | auth pills 48 → 40 (`--h-control-sm`) below 640 | bar height 56 (sticky `top-[56px]` depends on it), both pills visible |
| Bottom rail | nothing | 64px items (chat offset 80 and footer clearance 88 depend on them) |
| Home | `--rh-*` phone rungs, hero padding, lede one step, CTA height 56 → 48 (class `btn-xl` kept), proof in one row, topic tiles, the Closing-soonest row layout | sections, copy, the 17px question size, fabricated-number rules, PV-01 brand-mark backdrop |
| Chat bubble | 52 → 44, hide while scrolling | the `bottom: isMobile ? 80 : 16,` / `zIndex: 60` adjacent lines (`test:stacking`) |
| Overlays, toasts, notices | padding and figure rungs, close 48 → 44, questions as sheets, ≤ 2 toasts, one non-compliance bar at a time | money-commit `btn-lg`, feedback timings, z-ladder, compliance visibility, bet confirm centred |
| Desktop ≥ 640 | only the defect fixes, the countdown (ruled everywhere), and D9 | every card and board pixel (proved by a zero-diff control) |

## §7 — Standing rulings this plan inherits

- **PV-01 RULED keep**: the hero brand-mark backdrop stays.
- **PV-05 CLOSED 2026-09-04** (`docs/design-brief/player-visual-2026-09/handover/DECISIONS.md`): commit-sequence motion correct as
  shipped; both "dial reads thin / three words" concerns overturned by measurement. ⛔ The bet dial and its panel copy are not repainted here.
  D5 (hand-typed `animation-delay` 100/180/260/340ms at `chat-styles.css:904-907`, chat empty-state chips) stays filed; U7 does not touch it.
- **PV-13 fixed, "no visual change"**: heights sit on the rungs. Compact steps between rungs only.
- **DG-P-08** (`leaderboard/page.tsx:559-590`): podium handles are read whole: wrap, never truncate; `break-words`, never `break-all`.

## §8 — Defect register

| ID | Defect | Where | Unit |
|---|---|---|---|
| D1 | Status strip's half chip collides with the result count (412 EN, 360 SW) | `.kp-strip-fade` `globals.css:3063-3068` | U9 |
| D2 | Leaderboard podium handles break mid-word ("@Dhire / sh") | `leaderboard/page.tsx:591-594` | U10 |
| D3 | 52px chat bubble covers card Details / "Maelezo" / a tier badge | `ChatRoot.tsx:313-319`, `chat-styles.css:57` | U7 |
| D4 | First visit: primer modal and consent card both show, uncoordinated | `first-visit-primer.tsx:296-317`, `consent-prompt.tsx:61-62` | U16 |
| D5 | `/results` ≈ 65px gap between search and filter tabs | `search-box.tsx:181-187`, `results/page.tsx:104` | U9 |
| D6 | Market detail: star orphaned on its own row in SW | `markets/[id]/page.tsx:430-467` | U10 |
| D7 | Up & Down header icon-only links have no accessible name on phones | `updown/page.tsx:97-113` | U9 |
| D8 | Discussion box says "Sign in to predict" for commenting | `comments-thread.tsx:224-229` | U20 |
| D9 | Bet confirm: `lg:p-6` overrides the safe-area bottom padding (found in code) | `bet-confirm-modal.tsx:240` | U13 |

---

## §9 — Units

Each unit is one commit. **[Compact] control:** with `kp-density=comfortable`, and at every width ≥ 640, the drivers show a **zero diff**
against the U1 baseline. **[General] control:** ≥ 640 shows a zero diff unless the unit names a desktop change, and both densities show the same change.

### Phase A — Instrument and switch

**U1 · Baseline instrument + signed-in QA player**
- New `scripts/live/mobile-visual-drive.mjs` reusing `scripts/live/harness.mjs` (`loginOnce`, `recorder`, `measureClipping`) and
  `scripts/live/clip.mjs`. It measures card heights, pinned chrome, document heights, first-card y, bubble overlap and controls < 40px at
  **320/360/412/768/1280 × EN/SW/ZH × comfortable/compact**, writing JSON + shots to `.qa-shots/mobile-visual/U1/before/`.
  Method: `kp-locale` cookie on the context, `load` + 2.5s, primer marked seen, consent declined, `<html lang>` read back.
- Mint one labelled production QA player (`QA Mobile 01`) under the standing grant; the commit says what was minted.
- RED control: an injected `.mcardp{padding:40px}` trips the height assertions.
- Accept: every "Before" number in §1 and §11 re-derived from JSON.

**U2 · [Compact] Density setting + switch (no visual change yet)**
- `src/app/layout.tsx:145` already awaits `cookies()` for `kp-locale`. It also reads `kp-density`, and only `comfortable` stamps
  `data-density="comfortable"` on `<html>` (same component, already `suppressHydrationWarning`). No cookie means Compact, and there's no flash.
- Client setter mirrors `writeCookie` in `src/lib/i18n.tsx:~51-54` (`path=/; max-age=31536000; samesite=lax`), then sets the attribute.
- Switch lives once, in the rail's More menu (`bottom-nav.tsx:157` → `<NavMore variant="rail">`, a `role="menu"` of 44px rows). A bare
  `role="switch"` inside a menu is invalid ARIA, so it is a **44px `role="menuitemcheckbox"` row** with `aria-checked`, the `ui/toggle.tsx`
  visual `aria-hidden` inside. Added via an optional prop (B9), hidden ≥ 640.
- i18n keys in all three locale objects of `src/lib/i18n-dict.ts`: `cardSpacing`, `densityCompact`, `densityComfortable`, `cardSpacingHint`
  ("Phones only. Changes how tightly market cards are laid out. Nothing is hidden."). `test:i18n` (predeploy) fails on missing keys and on SW/ZH
  identical to EN. SW/ZH checked by a native reader.
- New `test:density-contract`: every Compact rule sits inside `@media (max-width:639.98px)` and `html:not([data-density="comfortable"])`.
  RED control: one ungated rule.
- Accept: the choice survives reload with no flash, in EN/SW/ZH, signed out and in.

### Phase B — Phone density and fit

**U3 · [Compact] Market card + Up & Down card + skeleton token**
- Gated CSS: card top padding 14→10, row gap 10→6 (footer keeps its 10px via margin-top), actions margin 11/9→6/4, sparkline 28→20,
  traders min-h 24→22, grid gap 14→10.
- Keep: title, %, chips, 40px YES/NO, 44 info button, 17px footer, 13px bottom padding.
- ⛔ **Source order is load-bearing.** `test:card-share` reads `.mcardp-share` / `.mcardp-details` by first match in the file; `test:tap-target` §6.1 matches a column-0
  `.mcardp-info {`; `test:betting-ink` reads the first `.mcardp-meta .live`. So the Compact block goes **after the last card rule (≈ `globals.css:5115`)**,
  indented. It never re-declares `.mcardp-info`'s box and never repeats the `tap-rung.anchors.mjs` declaration text.
- Existing duplicates: `.mcardp-spark` (`:3923`/`:3938`), `.mcardp-traders` (`:3924`/`:3928`).
- Sparkline: `MicroSpark height={28}` with `stretch` (`market-card.tsx:390`), so a CSS height overrides it; check by eye that the line still reads.
- Skeletons read a new `--mcard-h` token instead of literals at `markets/loading.tsx:95`, `markets/page.tsx:518`, `results/page.tsx:624`,
  `results/loading.tsx:25`, `updown/loading.tsx:33`, `app/loading.tsx:8`. `card-geometry.ts` exports both values.
- `UpDownCard` (`updown-card.tsx:724`): the same gated gaps plus one `--sp` step on its inner blocks; UP/DOWN stay `btn-lg`. Target ≤ 430px.
- Rebaseline by design: `qa:card-geometry`, `qa:card360`. Must stay green: `qa:tap-hit`, `test:card-share`, `test:tap-target`.
- Accept: live priced card ≤ **305px** (354 − 52 ≈ 302), and every card state ≥ 45px shorter than its baseline at 360/412 in EN/SW/ZH; skeleton = card ±2.

**U4 · [Compact] Discovery bar (still sticky, still one tap)**
- `src/components/ui/query-bar.tsx:53-165` + CSS via a `data-bar-row` hook: rows become `display:contents` in a grid, giving one control line
  `[strip][sort][dir][filters]` and a ~16px count line ("25 markets · Biggest pool", still the single `data-result-count`). Only the strip scrolls.
- Already compact, unchanged: `QuerySort` shows its value only below `lg`; direction is an icon-only 44×44 link.
- Compact change: the Filters `<summary>` (already `aria-label`led) hides `.kp-fsheet-trigger-label` and the caret; icon and count badge stay.
- ⛔ Don't edit the QuerySort summary class line (`red:bar-geometry` mutates it). `test:filter-language` §5.9–5.22 stay green (TSX structure unchanged).
- Guard: extend `scripts/live/bar-geometry-drive.mjs` (today stickiness only at ≥ 1280) with bar ≤ 80 at 360/412, sort and status visible with 0 taps,
  strip ≥ 160px. RED control: `display:none` on sort.
- Accept: pinned chrome ≤ **201px** at 360 in EN/SW/ZH.

**U5 · [General] Header pills + phone rhythm tokens**
- CSS only, inside the existing `@media (max-width:639.98px)` E-276 block (`globals.css:3388`): `.kp-auth-cta { height: var(--h-control-sm) }`
  with `.btn-sm` padding and font, both pills together. TSX strings stay: `wallet-reach.test.mts:155` requires `btn-pill kp-auth-cta` exactly twice.
- `--rh-section` 64→48 and `--rh-close` 32→24 on the `:root` base (the ≤767 rung, `:272-273`); the `min-width:768px` block (`:851-857`) stays immediately
  after `:root`. Inline consumers `app/page.tsx:225` and `trust-band.tsx:103` follow the token. Re-run `qa:dg-rhythm` and `scripts/live/landing-seam.mjs`.
- Guard: a source assertion that the phone block declares `height: var(--h-control-sm)` on `.kp-auth-cta`. RED control: 36px.
- Accept: at 320 both pills visible and `scrollWidth === 320`.

**U6 · [General] Home tightening (all sections kept)**
- **Closing soonest** (`landing-hero.tsx:186-188` → `QuestionRow`; `globals.css:3695-3746`): `.kp-qrow__q` is `--type-h4` (17px) with no clamp,
  in a 3-column grid `"i q p" / ". s p"` with a 20px gap, so at 360 the price column squeezes the title to ≈ 200px (4–5 lines). The cause is layout,
  so the size stays. Below 561px the grid becomes `"i q" / ". s"`, the price moves onto the sub line (same element), and the title gets a 3-line clamp
  with the full question in the accessible name. Row ≤ 110px.
- Hero (`:3519`) padding sp-12/sp-8 → sp-8/sp-6; lede (`:3546`, `--type-h3`) → `--type-h4`; CTA height (`:3809-3811` ≤560.98 block) →
  `var(--h-control-lg)` with class `btn-xl` kept (update `scripts/live-material-probe.mjs:112` and `live-button-contrast.mjs`, which expect 56);
  `.kp-proof` phone block (`:3686-3690`) three across with numbers one rung down, only if SW captions and money don't clip; `.kp-topic` (`:4584`)
  min-h 64 → 48 with the meta inline.
- `test:hero-contract` / `test:landing-contract` test data only; `test:betting-ink` checks colours only.
- Accept: home ≤ **7.5 screens** at 360 EN, ≤ 7.8 SW.

### Phase C — Chrome behaviour and defects (not density-gated; may move earlier)

**U7 · [General] Chat bubble 44px + hides while scrolling (D3)**
- `src/components/layout/scroll-cast.tsx` (mounted `app-shell.tsx:301`) also sets `data-scrolling` on `<html>` **once per burst** and clears it after a
  250ms idle timer (cleared on unmount), keeping the file's one-write-per-crossing rule.
- `chat-styles.css:57` `.cm-bubble-mobile` 52→44; `ChatBubble.tsx:41` HelpMark 30→24. `html[data-scrolling] .cm-fab` gets opacity 0, translateY 8,
  pointer-events none, on motion tokens (reduced motion: opacity only). Never while the chat is open (`open` in ChatRoot) or the bubble has focus.
- `ChatRoot.tsx:313-319` wrapper gains `className="cm-fab"`. `bottom: isMobile ? 80 : 16,` and `zIndex: 60` stay on adjacent lines
  (`stacking-contract.test.mts:188`, in predeploy).
- Overlap is measured on the `::after` pulse ring, not the 44px box. `scripts/chat-responsiveness-e2e.mjs` is stale (wrong breakpoints) and not evidence.
- Guard: a stacking-contract row plus a driver asserting the bubble spot hits the page while scrolling and the bubble after 400ms idle. RED: remove the hide rule.

**U8 · [General] Countdown everywhere + guest market split first**
- `src/components/markets/countdown.tsx:87-109`: ≥ 1 day → days + hours; < 24h → 4 cells; `<time dateTime>` kept. Only call sites are
  `markets/[id]/page.tsx:585` and `:593`.
- `markets/[id]/page.tsx:756`: one wrapper holds `<SidePicker>` (session) or the sign-in CTA (guest). Below `lg`: `session ? "order-1" : "order-3"`
  (probability section is `order-2`, `:499`). Signed-in order byte-identical.
- Guard (driver): 2 cells when days ≥ 1, 4 under 24h; guest probability above sign-in; signed-in unchanged. RED: always 4 cells; restore `order-1`.
- Accept: countdown panel ≤ 160px at 360.

**U9 · [General] Defects D1 · D5 · D7**
- D1: `.kp-strip-fade` fade 24→40px (below 1024; no test pins 24). If that isn't enough, add one gap step before the count; never put a positioned menu inside the mask.
- D7: `aria-label`s on `updown/page.tsx:97-113` from `common.readFullRules` / `market.udHistoryTitle`. Guard: a `test:ui-consistency` rule
  ("a link whose only label is `hidden sm:inline` needs `aria-label`", `Rule` shape `:80-85`, modelled on `bare-text-button`), baseline at 0. RED: remove one.
- D5: `SearchBox` prop `reserveEcho` (default true; all 14 call sites unchanged); only `results/page.tsx:372` passes false. Fix the stale
  comment at `results/page.tsx:355`. Driver: search-to-tabs gap ≤ 24.

**U10 · [General] Defects D2 · D6**
- D2 (DG-P-08 binds): below `sm` the `TierBadge` moves under the handle (`:591` wrapper) and the handle steps one rung down, so it gets the full ≈ 85px
  column; `break-words` stays as the last resort. Measure the real handles plus a 15-char fixture.
- D6: split the `:430-467` row into a wrapping status group (chips and closing/waiting/resolved pills) and a no-wrap action group
  (Source · `WatchStar` 40 · `ShareButton` 40 with label) pushed right.
- Guards (360/390 × 3 locales): no mid-word break or overflow; star top = share top in SW. RED controls restore each.

### Phase D — Overlays, messages, notifications, detail pages

**U11 · Overlay census (runs before any overlay fix)**
- Driver `scripts/live/mobile-overlay-census.mjs` at 320/360/412 × EN/SW/ZH records, per surface: height as % of viewport, primary action visible
  without scroll, title/body sizes, button rungs, overlap with rail and bubble, safe-area, dismiss reachability, overlays at once.
- Local `next dev` (after `rm -rf .next/dev`, `LIVE_BASE=http://localhost:PORT`, `MSYS_NO_PATHCONV=1`):

  | Surface | Trigger |
  |---|---|
  | Primer | `/?primer=1` |
  | Consent | `?consent=1` |
  | Welcome toast | `?welcome=new` / `?welcome=back` |
  | Session-ended | `/auth/login?revoked=1`, `?ended=idle` |
  | Email-verify bar | `/auth/demo?email=unverified` / `none` |
  | KYC gate / rejected | `/auth/demo?kyc=rejected` → `/wallet/withdraw` |
  | KYC first-deposit notice | `/auth/demo?deposit=0` / `1` → `/wallet` |
  | Payout-status notice | `/wallet/withdraw`, `/wallet/deposit` |
  | Win celebration | `window.dispatchEvent(new CustomEvent("50pick:celebrate",{detail:{kind:"WIN",…}}))`, shot at 1–6s |
  | Up & Down receipt, toast, result | `api/dev-test/updown-seed` → `updown-advance` → `updown-handover` arm/settle, page kept open |
  | Bet confirm | detail → dial → confirm, **cancelled, never submitted** |
  | Deposit / withdraw confirm | form submit on demo |
  | Reality check | sessionStorage `kp_session_started_at:<id>` / `kp_reality_check_last:<id>` |
  | Bell panel, avatar menu, language menu, More menu, filter sheet | open by click (`scripts/overlay-responsiveness-test.mjs`, `scripts/live/player-query-shots.mjs` show how) |
  | `/notifications` | after `api/dev-test/resolve-seed-markets` |

- Production confirmation of real-money moments (bet toast, win celebration, bell rows, away summary) with two QA-fleet players on opposite
  sides of a 3-minute round (`scripts/live-s30-win-moment.mjs`, `qa:updown-next-playable`).
- Out of reach, recorded rather than skipped: push opt-in (headed only), install invite and bonus (feature OFF), tier-up (no such celebration).
- Accept: a per-surface census table here with verdict **fits / chunky / broken**. U12–U18 are confirmed or re-scoped from it.

**Overlay rules for U12–U18:** phone-wide in both densities; each size step is one rung on an existing ladder, on tokens.
⛔ Kept as they are:
- the reality check's four stacked `btn-lg`;
- every money-commit `btn-lg`;
- feedback timings (toast 4.5/8/3s, win 7s, quote hold 10s, result auto-close 5s);
- the z-ladder;
- the commit-sequence motion and dial;
- `ConfirmModal`'s 36px medallion literal, the NoticeBar `-my-1`, and the comment-free toast body.

**U12 · [General] `<Modal>` on phones + questions as bottom sheets**
- `modal.tsx`: panel `p-5` (`:319`) one step down below 640; close `h-8` (`:329`) → 44. `sheet` (docks below 640, `:273-274`/`:320`) gains bottom
  padding + `env(safe-area-inset-bottom)` (none today), casts upward (`--shadow-overlay-up`, DESIGN_AUTHORITY §E3) and enters with `.m-sheet-in` (§M2).
- `ConfirmModal` (`:435-596`) gains `sheet?: boolean` **default true**, forwarded by `ConfirmDialog` (`confirm-dialog.tsx:40`, `:146`). This covers sign out
  (`avatar-menu.tsx:270`), deposit/withdraw confirm (`src/app/wallet/deposit/deposit-confirm.tsx:119`, `src/app/wallet/withdraw/withdraw-confirm.tsx:153`),
  close account, RG confirms (`rg-confirm-submit.tsx:45`) and unsaved changes. Cash-out (`sell-confirm-modal.tsx:74`) passes `sheet`.
  ⛔ Bet confirm stays centred.
- Focus unchanged (ConfirmModal on Cancel; sell/bet on commit).
- New guard (no Modal focus/Escape test exists today), at 360/393/768:
  - sheet bottom = viewport bottom with the safe-area pad;
  - focus on Cancel;
  - Escape closes;
  - focus returns to the trigger;
  - centred at ≥ 640.
  RED: remove the pad or the default.
- Accept: every question shows its primary action without scroll at 360×640.

**U13 · [General] Result modal, bet confirm, sell confirm (+ D9)**
- `operation-result-modal.tsx`: content `p-6 lg:p-7` (`:409`) one step down; icon 64 → 48 (`:421`); title `text-[22px]` (`:451`) →
  `text-title-sm`; primary `btn-lg` kept, secondary already `btn-md`.
- `bet-confirm-modal.tsx`:
  - content (`:240`) one step down;
  - **D9** fixed by making the safe-area `pb` win at every width;
  - side label 26px (`:284`) → `text-title-md`;
  - stake 22 (`:290`) → `text-title-sm`;
  - boxes one step down;
  - close → 44;
  - `btn-gold`/`btn-ghost` `btn-lg` kept, quote hold and motion unchanged;
  - the market title stays unclamped (`popup-fit.test.mts` §3.2).
- `sell-confirm-modal.tsx`: box one step, value 24 → 20, `btn-lg` kept.
- Guards: `qa-toast-modal.mjs`, `test:popup-fit`, `feedback-law.test.mts`, `test:motion-ladder`; driver: bet confirm at 360×780 with the longest real
  title shows Confirm without inner scroll in EN/SW/ZH. RED: restore paddings.
- Accept: result modal ≤ 60%, bet confirm ≤ 85% of 780.

**U14 · [General] Win celebration**
- `win-celebration.tsx`: `pt-10` 80 → 40, `px-7 pb-7` 40 → 24 (`:295`); seal 132 → 96 (`:134`); amount 38 → 32 (`:318`); gaps one step.
- Unchanged: dwell 7s, queueing, reduced motion.
- Pins stay green: `feedback-law.test.mts:479,502`, `stacking-contract.test.mts:165`, `popup-fit.test.mts:106`.
- Driver: `50pick:celebrate` event plus one real settle on prod. RED: restore sizes.
- Accept: ≤ 360px tall at 360, a 7-figure TZS amount never clipped in EN/SW/ZH.

**U15 · [General] Toasts**
- `toast.tsx`: icon `h-7` 40 → 32 (`:676`); close `h-8` 48 → 44 (`:692`); text right padding follows the close box.
- Top `env(safe-area-inset-top)` appended **after** the pinned class run `fixed inset-x-0 top-0 z-[1800] flex flex-col` (`stacking-contract.test.mts:164`).
- Phones show ≤ 2; the rest queue with their countdown not started. Not done by CSS hiding.
- Pins updated in the same commit:
  - `presence-class.test.mts:148, :298-301` (`toasts.slice(0, MAX_VISIBLE).map`);
  - the `ui-consistency` toast-dismiss baseline (`:504`);
  - the `design-frozen` toast literal budget (`:183`, so tokens, not literals).
- `feedback-law` §10.5/10.6 stay green.
- RED: 4 visible at 360.
- Accept: a single-line toast ≤ 64px, stack ≤ 150px, first toast below the safe area, and a queued toast gets its full duration.

**U16 · [General] Notice stack + first-visit coordination (D4)**
- `notice-bar.tsx:93`: below 640 the text's `basis-[14rem]` drops so the 44px action (`:184`) stays inline; text clamps to 2 lines with the full text in the
  accessible name. Bar ≤ 60px.
- Render order (`app-shell.tsx`): TopAppBar `:303` · Announcement `:304` · session-ended `:307` · EmailVerifyBanner `:333` (collapsible, never dismissible) ·
  AwaySummaryBar `:341` · LiveTicker `:351`. On phones the AwaySummaryBar waits while the email bar is expanded; nothing else changes order or dismissibility.
  Re-run `qa:social-panel`.
- D4: extend `src/lib/invitation-slot.ts` (today `useInvitationSlot(id, zone, priority, eligible)`, zones `bottom`/`top-right`) with a blocker the primer
  registers while open. Every claimant's eligibility (consent, install, channels) requires no blocker, and consent's 1200ms timer starts after the primer closes.
- Guards:
  - demo player (email unverified + away entries) at 360: the email bar shows while the away bar waits, then the away bar appears after collapse;
    announcement and session-ended are never hidden;
  - `?primer=1&consent=1`: never both visible in one frame.
  RED: both expanded together; remove the blocker read.
- Accept: the common signed-in case is ≤ 56 + 60 + 32px; no bar's action wraps under its text in EN/SW/ZH.

**U17 · [General] Notifications**
- Bell panel empty state `py-12` (128px each) → `py-8` (`notifications-panel.tsx:691`).
- `/notifications` rows (`page.tsx:238-275`) ≈ 90 → ≤ 72px: padding one step down, icon plate 32 → 28, 44×44 actions kept.
- Driver with seeded settlement notifications at 360 × 3 locales. RED: restore `py-12`.

**U18 · [General] Page shells, primer, detail pages**
- `page-container.tsx:106` `py-6` → one step below 640. ⚠️ **53 files use PageContainer** (49 under `src/app`, plus their `loading.tsx`), so every
  PageContainer route is measured before and after. Update `scripts/measure-system.test.mts` (`test:measure`), `scripts/measure-parity-check.mjs`
  (`qa:measure-parity`) and `scripts/anchors/measure.anchors.mjs:73` in the same commit. Pages with their own padding: `updown/[roundId]`, `fairness`, `legal`.
- Wallet/profile section gaps one step down; `KycGatePanel` `p-6` (`:133`) and `Callout` `stack` `p-6 sm:p-8` (`callout.tsx:257`) one step down below 640.
- Primer (`first-visit-primer.tsx:453-468`): body `pb` and illustration one step down; title 22 → 20 below 640.
- `/updown/[roundId]` `pb-14` (`page.tsx:276`) → the measured rail clearance.
- Kept: `PageHeader` `text-title-lg`, wallet 38px balance, UP/DOWN and stake `btn-lg`.
- Guards: `qa:footer-reachable`, `test:revoked-deadend`, page-height driver. Accept: each touched page shorter at 360, 0 overflow, nothing below the floor.

### Phase E — General phone fit found in the 2026-09-15 screenshots

**U19 · [General] Live carousel · Help rows · auth forms**
- `/live` featured card (`src/app/live/featured-contest.tsx`): the 19px title (`:114`) unclamped over 5 lines, card ≈ 460px. Clamp to 3 lines, step the
  inner padding and CTA gap (`:135`) down one step each, arrows stay 44 (`:205`). Target ≤ 360px.
- `/help` contact cards (`help/page.tsx:190`, `glass-panel p-4 space-y-2`, ≈ 146px each): below `sm` use the page's own row pattern (`:223`, ≈ 82px),
  keeping `tel:`/`mailto:`. Target ≤ 84px each.
- Auth forms: `AuthPanel` (`src/components/auth/auth-panel.tsx:59`, `p-6`) → `p-5 sm:p-6`, giving inputs ≈ 261 → ≥ 277px. Shared by **7 pages**
  (login, register, forgot-password, reset-password, otp, 2fa, verify-email), so all 7 are measured at 320/360 × 3 locales.
- `/leaderboard` was checked and is not a defect (the gap is ≈ 41 CSS px, the page's normal rhythm).
- Guard: per-surface driver targets. RED per sub-item.

**U20 · [General] Footer tap rows + Discussion copy (D8)**
- Footer list links (`src/components/layout/public-footer.tsx`, ≈ 19px rows) below 640 become `inline-flex items-center min-h-[var(--tap-min)]`,
  keeping font, colour and case. Not `.row-link` (`globals.css:1664`), which is uppercase. `qa:footer-reachable` stays green.
- D8: new `market.signInToComment` in EN/SW/ZH (native check) used at `comments-thread.tsx:224-229`; `signInToPredict` stays on bet surfaces.
- Guards: footer link boxes ≥ 40 at 360; `test:i18n` parity; a source assertion that comments-thread no longer reads `signInToPredict`. RED restores each.

---

## §10 — Session order (two units per session)

| Session | Units | Why this order |
|---|---|---|
| S0 ✅ | this plan + rulings | the record every later session starts from |
| S1 | U1 + U2 | measure and make reversible first |
| S2 | U3 + U4 | the two biggest density wins |
| S3 | U5 + U6 | header, rhythm, home |
| S4 | U7 + U8 | chat bubble, countdown, guest order |
| S5 | U9 + U10 | defects |
| S6 | U11 | overlay census (a full session) |
| S7 | U12 + U13 | modal primitive, then its heaviest consumers |
| S8 | U14 + U15 | celebration, toasts |
| S9 | U16 + U17 | notices, notifications |
| S10 | U18 | page shells, primer, detail pages |
| S11 | U19 + U20 | Live, Help, auth forms, footer, copy |
| Seal | — | full production re-measure: every width × locale × density |

U7–U10 don't depend on the density switch and may move earlier if Ali wants the chat overlap or defects sooner.

## §11 — Verification

**Every commit:**
1. RED first: the new guard fails on the unfixed tree, then the fix, then it passes.
2. Static gates **twice**:
   - In `predeploy`: `test:design-frozen`, `test:bridge`, `test:filter-language`, `test:contrast`, `test:ui-consistency`,
     `test:tokens`, `test:board-discovery`, `test:discovery-contract`, `test:betting-ink`, `test:hero-contract`, `test:stacking`, `test:motion-ladder`,
     `test:revoked-deadend`, `test:i18n` (+ `qa:live`).
   - By hand when touched: `test:tap-target`, `test:card-share`, `test:type-scale`, `red:filter-language`, `test:popup-fit`,
     `test:presence-class`, `test:wallet-reach`, `test:measure`, `test:docs`, `test:design-one-door`, `test:tracker-hygiene`, `test:integrity`.
   - Plus `test:all` compared against a clean `main` (`test:responsive` is already red with 81 pre-existing failures; compare counts).
3. Local drive on `next dev` after `rm -rf .next/dev`: the unit's driver at 320/360/412/768/1280 × EN/SW/ZH × both densities, including the zero-diff control.
4. **Look at the shots** at 360 EN, 360 SW and 412 EN. A green number is not proof.
5. Docs in the same commit:
   - this file's §0 rewritten, its §1 row and its §2 entry;
   - a `LIVE-QA-CAMPAIGN.md` §6 register row (from **E-414**) and a §6b RESUME AT pointer to this §0;
   - the `NEXT-PLAN.md` board status;
   - DESIGN_AUTHORITY or PLAN-OF-RECORD if a ruling or law is touched.
6. `git branch --show-current`, stage by name, commit, `git push origin HEAD:main`.
7. Production: deploy SUCCESS + `/api/health` ok, re-run the driver against `https://www.50pick.tz` (signed out and as the QA player), read the shots.
   Only then ✅.

**Programme acceptance at 360×780** ([Compact] rows in Compact, [General] rows in both densities). "Before" values marked ≈ come from the
2026-09-15 screenshots, and targets come from arithmetic. **U1 re-derives every "before"**; a target that proves unreachable or too easy is changed here
with its reason in §2, never silently.

| Measure | Before | Target |
|---|---|---|
| Market card, live priced | 347–354px | ≤ 305px; every state ≥ 45px shorter |
| Cards visible while scrolling `/markets` | ≈ 1.6 | ≈ 1.9 (a true 2.0 needs a card ≤ 280px, more than spacing can give) |
| Pinned chrome `/markets` | 237px | ≤ 201px |
| Home length | 10.8 screens (SW 11.1) | ≤ 7.5 (SW ≤ 7.8) |
| Closing-soonest row | ≈ 150px | ≤ 110px |
| Header auth pills | 48px | 40px, both visible at 320 |
| Chat bubble | 52px, covers Details | 44px, never covers while scrolling |
| Countdown panel (≥ 1 day), all widths | ≈ 220px, 8 tiles | ≤ 160px, 4 tiles |
| Up & Down card, live round | 550px | ≤ 430px |
| `/live` featured card | ≈ 460px | ≤ 360px |
| `/help` contact rows | ≈ 146px | ≤ 84px |
| Auth form field width (7 pages) | ≈ 261px | ≥ 277px |
| Footer navigation links | ≈ 19px rows | ≥ 40px |
| Confirmation questions | centred cards | bottom sheets, primary visible at 360×640, safe area respected |
| Overlays (census) | not measured | all "fits"; ≤ 1 blocking overlay at a time; toasts ≤ 2 |
| Defects D1–D9 | 9 open | 0 |
| Tap floor / overflow / clipped money | holds | still holds in EN/SW/ZH |
| Comfortable and ≥ 640 | — | zero diff against the U1 baseline |

## §12 — Risks

- **Baselines move by design.** Every 360/412 baseline shifts once Compact is the default. Drivers take `--density=comfortable` so new red is told apart from old red.
- **Pins that move** are named in their units (card-share first-match order, tap-rung anchor text, presence-class expression, toast baseline,
  measure anchors, live probes selecting `btn-xl`). Each changes its spec in the same commit; none is silenced.
- **Swahili length**: the Compact Filters trigger loses its label ("Vichujio"), and sort values are long ("Pesa nyingi"). Read 360 SW before accepting U4.
- **`next dev` on this machine** segfaults under sustained Playwright load and bloats `.next/dev`: fresh server per drive, rerun, never trust one run.
- **Sign-in**: one login per QA account; reuse the storage state.
- **Shared production board**: anything minted is named QA and retired, and the commit says what was minted.
- **Chat at rest**: a still 44px bubble can sit over one Details link; hiding while scrolling is Ali's chosen trade-off.
