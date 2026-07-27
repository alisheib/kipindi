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
**Rule:** none. Anywhere. Glyphs are stroke SVG (03-glyphs) or typographic marks (✓ ! × i in toasts).
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
