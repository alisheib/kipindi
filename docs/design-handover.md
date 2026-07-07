# 50pick — Design Review Handover

> **For a design-focused Claude.** This is a handover so you can review the product's
> visual/interaction design and return grounded, actionable feedback. An implementing
> Claude (with the codebase) will act on your notes, so please tie every suggestion to
> a concrete primitive/token/screen and a reduced-motion fallback. **Return format is at
> the bottom** — please follow it so the handoff round-trips cleanly.
>
> You do **not** need the code to review this — routes + screenshots are enough. If the
> human can share screenshots of the routes listed in §7, review those.

---

## 1. Product context

**50pick** — a Tanzania-licensed, regulator-ready **pari-mutuel prediction market**.
Players pick **YES** or **NO** on a real-world proposition (sport, weather, macro, crypto,
culture, tech); all stakes on a market join one pool; after tax + commission (~9%) the net
pool pays out pro-rata to the correct side. Implied probability updates live with every bet.

- **Audience:** Tanzanian, **mobile-first**, money-conscious. Trust + clarity matter more
  than flash — this is real money under a gambling license.
- **Languages:** fully **trilingual EN / SW / ZH** (Swahili is primary local; SW strings run
  **~20–40% longer** than EN — every label must survive wrapping).
- **Surface:** **dark-first** app. Two consoles: the **player app** and a staff **admin console**.
- **Tone:** confident, editorial, "the wisdom of YES & NO." Gilt accents, not neon.

---

## 2. Design system snapshot (what already exists — reuse it)

**Type:** Sora (display), Inter (body), JetBrains Mono (numerals/labels/eyebrows).

**Colour is role-based and disciplined — this is the single most important rule:**
| Role | Colour | Used for |
|---|---|---|
| **Gold / gilt** | `--gold-*` | **Earned-money moments ONLY** — winnings, bonus, deposit CTA, resolved seal. Never decorative. |
| **Aqua / teal** | `--aqua-*` | Live pulse, "in play", system heartbeat (SignalPip). Deliberately *not* gold. |
| **Royal / brand** | `--brand-*` | Active nav/tab/selection state, primary non-money actions. |
| **Claret** | `--claret-*` | Destructive / irreversible confirms (sign-out, self-exclude, void). |
| **No / rose** | `--no-*` | Loss, NO side, errors. |
| **Yes / green** | `--yes-*` | YES side, success. |

All colour is **oklch tokens** in `globals.css` (`--bg-*`, `--text-*`, `--border-*`,
`--gold-50…950`, etc.). Raw `oklch()`/hex in JSX is treated as a bug (Satori/QR contexts are
the only sanctioned exceptions).

**Component kit:** `src/components/ui/*` (Button, Chip, Tabs, EmptyState, ConfirmDialog,
Input, Avatar, Pagination, …) and brand pieces in `src/components/brand.tsx`. Admin has its
own kit (`AdminKpi`, `AdminCard`, `admin-tbl`, `SortTh`, chart primitives in
`components/admin/admin-charts.tsx`).

**Motion vocabulary (already built — extend, don't reinvent):**
- Components: `ConfidenceDial`, `TippingBar`, `PulseRing`, `SignalPip`, `BrandSpinner`,
  `SectionLoader`, `GiltCorner` (`brand.tsx`).
- 40+ keyframes in `globals.css`: `odds-flash-up/down`, `gavel-strike`, `seal-impress`/
  `seal-place`/`badge-seal-rays` (resolution), `celebrate-pop`/`count-up-flash` (wins),
  `live-pulse`/`aqua-pulse`/`gold-pulse`, `settling-sweep`, `dialog-rise`/`sheet-rise`/
  `scrim-fade` (modals), `reveal-up`/`content-fade-in` (route/section enter), `kp-shimmer`
  (skeletons), `ticker-scroll`.
- **`prefers-reduced-motion` is respected and MUST stay respected** — every animation needs a
  static fallback.

**Existing design references in-repo:** `50PICK/design_handoff_prediction_market_kit/`
(`Design Kit.html` + `kit/` + `screenshots/`), `docs/glyph-reference-for-design.md`,
`docs/kit-gap-audit.md`, `docs/elevation-tracker.md`.

---

## 3. What's already strong — please DON'T churn these

- **Home hero** (`/`) — "The wisdom of YES & NO", gilt lockup, themed image, dual CTA. Confident.
- **Market card + ConfidenceDial** — LIVE/HOT chips, YES/NO pricing, conviction bar, predictor
  count, spark, "6d left". Dense but readable. (`components/markets/market-card.tsx`)
- **Empty states** — dashed card + line-art illustration + helpful copy + real CTA. Consistent
  and on-brand (`components/ui/empty-state.tsx`). No mascots by design.
- **Wallet** (`/wallet`) — dual hero cards (teal Available / gold Bonus with "PLAY TO UNLOCK"
  watermark), cash-back promo, clean tabs.
- **Admin KPI system** — `AdminKpi` grid + confidential band + grouped sidebar reads as one
  system across ~25 screens.

The design baseline is **high**. We're looking for *elevation where it earns its place*, not a
restyle. No motion for motion's sake.

---

## 4. Open design opportunities (where you can add value)

Ranked by our guess at value. Push back / reprioritise freely.

1. **Micro-interactions on state change.** The app is fairly static between the big set-pieces
   (win celebration, resolution seal). Candidates where a *tasteful* transition would reduce
   abruptness: bet placed → position appears; filter switch on the markets board (currently a
   skeleton→grid pop); odds change on a card (there's `odds-flash-up/down` — is it used enough?);
   tab-content swaps. **Question: which 3–4 state changes most deserve motion, and what?**

2. **Active-tab colour split.** Wallet tabs use a **gold underline**; positions/markets use
   **brand/royal pills**. Given "gold = earned-money only", is the wallet gold underline
   principled (it *is* the money screen) or an inconsistency to reconcile to brand? We want a
   **rule**, not a one-off. (`app/wallet/wallet-client.tsx` vs `app/positions/page.tsx`)

3. **Charts.** Admin cohorts (`/admin/players/cohorts`) hand-rolls distribution bars from divs;
   an `AdminAreaChart`/`AdminStackedBars` kit exists. Player market-detail has a price chart.
   **Question: any chart form/legend/axis improvements? Is a horizontal category-bar a kit gap
   worth adding?** (see `docs/dataviz` conventions if provided)

4. **New object/card formations & glyphs.** We have license to add *purposeful* new glyphs
   (`components/ui/glyphs.tsx`, `docs/glyph-reference-for-design.md`) or card layouts where a
   screen is thin. **Question: any screen that would benefit from a genuinely new formation
   (not a restyle of the existing card)?**

5. **Results header** (`/results`) — an audit flagged it "thin", but it *intentionally* mirrors
   the deliberately-lean `/markets` header ("marketing hero lives on the homepage"). **Confirm:
   leave lean, or is there a lightweight lift that keeps parity with /markets?**

6. **Resolution & win moments.** `gavel-strike`, `seal-impress`, `celebrate-pop` exist.
   **Question: are these landing, or is there a more elegant "market resolved / you won"
   sequence?** (This is the emotional peak of the product.)

---

## 5. Hard constraints (please respect in every suggestion)

- **Reuse the kit + tokens.** Propose changes as "use `<Chip>` / `--gold-300` / `dialog-rise`",
  not raw values. Flag genuine kit gaps explicitly.
- **Never regress money paths.** Deposit / withdraw / bet / resolve / payout screens are
  license-critical — clarity and predictability beat delight.
- **Colour discipline** (§2) is inviolable — gold is earned-money only.
- **`prefers-reduced-motion`** — every motion needs a static fallback.
- **Trilingual** — SW labels run long; nothing may rely on EN-length strings. No text baked into
  images.
- **Dark-first.**
- **Don't fabricate** legal/business values (license no., TIN, regulator names).

---

## 6. Specific questions to answer (the human will paste these to you)

1. Rank the top 5 design elevations by impact-for-effort, given §3–§5.
2. For each: which existing kit primitive / token / keyframe to use (or the specific new one to add)?
3. The active-tab colour rule (opp. #2) — gold-on-money vs brand-everywhere: what's the principle?
4. Which 3–4 state changes most deserve micro-interaction, and describe each (trigger → motion →
   reduced-motion fallback)?
5. Is the win/resolution moment (opp. #6) landing, or what would make it more elegant?
6. Any accessibility/contrast/hierarchy issues you spot in the screenshots?
7. Anything we've over-designed and should simplify?

---

## 7. Reference: routes to view + how to run

**Player:** `/` · `/markets` · `/markets/[id]` (bet + dial) · `/live` · `/results` · `/positions`
· `/wallet` · `/wallet/deposit` · `/profile` · `/profile/invite` · `/leaderboard`
**Admin:** `/admin` · `/admin/resolver-queue` (reference-quality) · `/admin/aml` · `/admin/audit`
· `/admin/players/cohorts`

Run locally (Node 24): `SESSION_SECRET=<32+> OTP_PEPPER=<16+> NODE_ENV=development
DISABLE_ADMIN_TOTP=true npx next dev -p 3000`; player session via `GET /auth/demo`; seed markets
via `POST /api/dev-test/stress-money`. Design kit: open
`50PICK/design_handoff_prediction_market_kit/Design Kit.html`.

---

## 8. Please return feedback in THIS format (so it round-trips to the implementing Claude)

For each recommendation:

```
### <short title>  — [impact: high/med/low] [effort: S/M/L]
- Screen/route + component: <where>
- Change: <what, concretely>
- Kit/token to use: <e.g. Chip variant=brand / --gold-300 / add keyframe X>
- Motion (if any): <trigger → animation → duration/easing>  ·  reduced-motion: <fallback>
- Why it earns its place: <1 sentence>
- Risk / money-path impact: <none / note>
```

End with a **one-paragraph verdict**: is the design fine as-is, or does it genuinely need
enhancement — and if so, the single highest-value move.
