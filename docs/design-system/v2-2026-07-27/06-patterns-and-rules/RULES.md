> 📑 **RECORD, NOT RULE.** The design rulebook is **`docs/DESIGN_AUTHORITY.md`** — every
> law, floor and threshold is there, and nothing else is required to build correctly.
> This file is kept as the designer's original wording of the laws, with its worked 'broken looks like' examples.
> ⚠️ **Values written here are a snapshot and some have drifted.** The live values are in
> `src/app/globals.css` / `src/app/motion.css`, which outrank every document.
> (Consolidated 2026-08-08 — nine files used to claim to be the place to start.)

# The laws

For each: the rule → the reason → an example of it being broken (so you recognise the failure).

## 1 · Money display
**Rule:** the player's money is always `TZS 320,000` — TZS prefix, thousands separators, JetBrains Mono tabular. Never KSH, never `$`, never a bare number. Signed P&L uses `+`/`−` (U+2212, not hyphen). The one legal `$` is the asset's own price (the source publishes USD) — and it must be visually distinct from TZS amounts (it is coloured/muted market data, never gold).
**Reason:** licensed real-money product; a misread currency is a compliance and trust failure.
**Broken looks like:** a stake row reading `$25,000`; a payout as `320000`; the gold TZS balance next to a gold USD gold-price — indistinguishable.

## 2 · YES/NO colour (green/rose)
**Rule:** YES/UP = emerald 152, NO/DOWN = rose 22 — only inside betting actions and market-direction read-outs. Never navigation, never decoration, never inverted or re-hued. Always paired with a word or arrow — colour is never the only signal.
**Reason:** these two hues carry the product's entire semantic weight; dilute them anywhere and every bet button gets ambiguous. ~8% of men are colour-blind.
**Broken looks like:** a green "Save" settings button; a rose logout icon; a price that is green with no arrow or sign.

## 3 · Gold
**Rule:** gold = earned money only — wins, payouts, settled profit, the final money-commit button, chip-resolved, the gilt brand needle. Never nav, never chips (other than resolved), never decoration, never projections/unrealised value.
**Reason:** gold must mean "this is real money you have" the instant it is seen. Every decorative use taxes that meaning.
**Broken looks like:** gold section headers; a gold "× 1.4" estimate (it is a *projection* — neutral ink); gold onboarding highlights.

## 4 · Live / real-time indicators
**Rule:** the red LIVE dot (--live-400, brightness-breathe) marks live rounds/markets; the aqua pip marks streaming data feeds. Aqua is a finishing pass, ≤8% coverage, never semantic. Real-time values flash (odds-flash, value-flash) — they never move layout.
**Reason:** urgency belongs to real events only; a page that constantly wiggles reads as manipulation (and fails reduced-motion users).
**Broken looks like:** a pulsing gold balance; marquee-scrolling headlines; a "LIVE" chip on a settled market.

## 5 · Real data or nothing
**Rule:** never render a guessed, placeholder, or zero-as-unknown number. Unknown → an em-dash + a labelled state ("awaiting read", "Confirming price"). Confirming states are calm and deliberate, not spinners-as-panic.
**Reason:** the settlement story is the product's licence to exist; one invented number on screen poisons every real one.
**Broken looks like:** `livePrice ?? 0` rendering `$0.00`; a fake "estimated close" during confirmation; skeleton numbers that look like data.

## 6 · Loss & failure copy
**Rule:** losses are stated with dignity — rose ink, calm, final ("Every figure here is final — nothing further is owed."). VOID/refund is neutral, never an error. Payment errors use --danger, not NO-rose. No punishment styling, no alarm panels.
**Reason:** a real-money product for ordinary players; shame and alarm are dark patterns.
**Broken looks like:** a red full-card overlay reading "YOU LOST"; a VOID round styled like a crash dialog.

## 7 · No manufactured urgency / no casino
**Rule:** the countdown is the only tension. No confetti, no flashing, no streak flames, no combo meters, no celebratory bursts beyond the calm gilt aura. Wins breathe or fade — never spin infinitely.
**Reason:** trustworthy first, exciting second — regulatory posture and brand.
**Broken looks like:** the 🔥 streak chip (existed in a kit specimen — superseded); a spinning sunburst behind a win (replaced by win-aura-breathe).

## 8 · Emoji
**Rule:** none. Anywhere. Glyphs are stroke SVG (the live set: `src/components/ui/glyphs.tsx`; the archive's 03-glyphs folder was deleted 2026-08-12 as a stale 39-glyph subset) or typographic marks (✓ ! × i in toasts).
**Reason:** tone (licensed product), rendering inconsistency across cheap Android devices, localisation.
**Broken looks like:** 🔥 streaks, 🎉 win toasts, 📈 market categories.

## 9 · Accessibility floors
**Rule:** WCAG 2.1 AA — text contrast ≥ 4.5:1 on its actual surface; visible focus everywhere (kit :focus-visible ring: 2px --brand-500 outline, offset 2, +4px 25% halo; defensive aqua ring for the long tail); tap targets ≥ 40px; zero horizontal overflow at 360px; reduced-motion honoured by the global clamp + explicit calm branches (see elevation-motion.md); colour never the only signal.
**Broken looks like:** --text-faint 9px body copy; a keyboard focus that vanishes on custom buttons; 32px-tall bet buttons.

## 10 · Multi-language
**Rule:** EN ships with SW and ZH. Every label survives ~35% expansion — wrap or ellipsise text, never clip money or timestamps; CJK renders via system-font fallback (--font-cjk), no CJK webfont.
**Broken looks like:** a fixed 80px button that truncates "Thibitisha"; a mono timestamp ellipsised to "quoted 14:…".

## 11 · Unrealised honesty (Positions/P&L law, 2026-05 licence review)
**Rule:** open-position value is always captioned "if settled now"; per-position potential payout stays hidden pre-resolution; the "× 1.4" figure is always visibly an estimate ("est." + qualifier line), never a promised return.
**Broken looks like:** "You will win TZS 140" on an open round.

## 12 · One dark theme
**Rule:** deep royal indigo (hue 268), no light mode, no toggle, ever.
**Broken looks like:** any white-canvas variant "for print" shipping to players.

## 13 · The measure (added 2026-07-28 — DESIGN_AUTHORITY B7)
**Rule:** every page states its width once, through `<PageContainer tier>`, from a six-tier scale whose numbers live only in `globals.css` (console 1600 · board 1280 · reading 1080 · form 640 · receipt 560 · auth 1152). A page and its `loading.tsx` state the same tier. A field never exceeds the measure its `<FormColumn>` sets — the field measure is 460, and it is opt-in so inline toolbars still flex.
**Reason:** width was the one thing the system never named, so it drifted into eight tiers, and the admin console — which had no cap at all — rendered at 2,344px on a 2560 monitor with 1,492px-wide text boxes. A rule that is not written is not a rule. And the QA gate could not see it: every criterion it asserted was a *lower* bound (no horizontal overflow), so "too wide" scored a clean pass at every width up to 1920.
**Broken looks like:** a 43-row transactions table stretched to 2,400px so the eye loses the row between the ID and the amount; a settings form whose phone-number field is 1,400px wide; a skeleton 152px narrower than the page it becomes, jumping on every load; a notice bar 200px wider than the top bar above it, so the page changes width depending on whether there is an announcement.

## 14 · A token class must resolve (added 2026-07-28 — DESIGN_AUTHORITY B8)
**Rule:** a colour class must name a key that exists in `tailwind.config.ts`. If the bridge is missing, add it (only when the CSS variable really exists) or change the call site. Never leave a class in place hoping it renders.
**Reason:** Tailwind emits nothing for a key it does not have, and there is no safelist. 1,325 usages across the app — including `text-gilt`, the brand needle's own colour — compiled to zero CSS, so a four-step ink ramp rendered as two and everything meant to recede did not. `tsc` cannot see it and the build does not warn. A palette audit cannot see it either: grepping for rogue *values* finds nothing wrong with a class that is spelled correctly and simply does not exist.
**Broken looks like:** a caption that is exactly as bright as the heading above it; an admin table where the column headers, the timestamps and the amounts all read at one weight; a "quiet" hint that quietly isn't.

## 15 · One design system — new design merges in, never beside (added 2026-07-29 — DESIGN_AUTHORITY B9)
**Rule:** every design change lands in the ONE canonical home for its kind and nowhere else — a value in `globals.css` bridged in `tailwind.config.ts`; a utility class naming a key that exists; a new state as a **prop on the existing component**, never a near-duplicate; the written spec in the matching `02-components/<name>/spec.md` + `CHANGELOG.md`, in the *same* change. Search before you add. No new `.css` file, ever.
**Reason:** a design truth that lives in two places will drift, and on a money product drift means the board and the detail page can disagree about someone's stake (that already happened — B6). One home per truth is the only version a test can guard.
**Broken looks like:** a cold-start look shipped as `style={{…}}` inside `market-card.tsx` instead of a class in `globals.css`; a `#1EA362` typed into a component "just this once"; an `EmptyTippingBar` sitting next to `TippingBar`; a shipped screen whose look appears in no spec.
**Full law:** `06-patterns-and-rules/MERGE-DISCIPLINE.md`.

## 16 · The system is COMPLETE and FROZEN (added 2026-07-29 — DESIGN_AUTHORITY B10)
**Rule:** every visual primitive — edges, the elevation ladder, radii, popups, motion/focus — is decided **once**, in the system; components only consume. You change a look by editing its token or spec, and every consumer updates at once. You do not reach into a component for a border, a shadow, or a popup again. If a component needs a look the system lacks, the **system** gains the token + spec.
**Reason:** "never come back to touch design" is only true if design lives entirely in the system. Every inline value, bespoke shadow or hand-rolled popup is a promise to revisit that exact spot later.
**Broken looks like:** a modal with its own `box-shadow: 0 30px 80px …` typed inline; a card border typed `border: 1px solid oklch(…)` in a component; a popup whose `rounded-[14px]` doesn't match the modal radius token; a toast that rolls its own portal + scrim.
**Guarded by:** `npm run test:design-frozen` (ratchet — the allowlist may only shrink), with `test:tokens` + `test:bridge`.
