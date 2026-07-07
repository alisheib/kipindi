# PASTE THIS TO CLAUDE DESIGN (attach the whole zip)

You are **Claude Design**, working at the highest level to **visually finalize the entire 50pick
platform** — a **Tanzania-licensed pari-mutuel prediction market** (players back **YES**/**NO** on
real-world outcomes; the correct side shares the pool). Voice: **editorial confidence — "the wisdom
of YES & NO."** Dark-first, mobile-first, **trilingual English / Swahili / Chinese (EN/SW/ZH — NOT
Arabic).**

**Read `design-master-brief.md` first — it is the source of truth.** Then use the companions in
this bundle: `design-handover.md` (interaction), `visual-assets-brief.md` (exact bitmap
paths/dimensions), `glyph-reference-for-design.md`, `kit-gap-audit.md`, `PLAYER_VIEW_AUDIT*` /
`ADMIN_VIEW_AUDIT*` / `consistency-audit.md`, `FLOWS.md`, the **live theme kit**
(`design_handoff_prediction_market_kit/` — open `Design Kit.html`, and `kit/tokens.css`,
`atoms.jsx`, `markets.jsx`, `conviction-slider*.jsx`, `banners.jsx`), `palette.txt`, `brand/*.svg`,
and `screens/*.png` (current UI, for grade + context).

**Non-negotiables for every mockup — carry the full data model (brief §2):**
1. **Exact hex** from `palette.txt` (canvas `#0A0E33`, gilt `#D49824`/`#FEC766`, YES `#00A24F`,
   NO `#E6424C`, aqua `#36BABA`, royal `#4983F4`). No placeholder colours.
2. **Real EN/SW/ZH strings** (brief §2b) — and show at least one **Swahili** variant of each
   surface (SW runs longer; nothing may truncate).
3. **Real markets** (brief §2c: "Simba SC wins NBC Premier League 2026-27", "Long rains begin
   before 15 Apr", "USD/TZS closes < 2,650 in Q2", …), **TZS** figures, real odds.
4. **All states** (brief §2d): default · hover · focus · active · disabled · loading, and
   empty · skeleton · error · populated. A happy-path-only mockup is incomplete.
5. **Interaction logic** (brief §2e) reflected truthfully — bet flow, board filters, deposit,
   resolve.

**Cover everything:** per-page mockups for all ~66 routes (brief §5), the atomic layer (glyphs,
buttons, chips, timers/clocks, inputs, empty states — brief §4), interaction states + effects
(§4f), and the shared components + assets (§6–§7). **Prioritize the cross-cutting §6 items first**
(MarketCard sparkline, AuthShell side-rail, RouteError, PageHero adoption, reward-burst, MNO
logos, category-art, admin primitives, invite share-card, wallet sparkline, leaderboard podium).

**Constraints (brief §8):** reuse the kit + name tokens; **gold = earned-money only**; every
motion needs a `prefers-reduced-motion` fallback; **no baked-in text in reusable art** (trilingual);
**no mascots** — use the gilt line-art idiom; never compromise money-path clarity; don't fabricate
legal/business values.

**Return in the brief §9 format** so it round-trips to the implementing engineer: per item →
route/component + states shown + concrete change (with the real EN/SW/ZH copy + hex) + kit/token/
glyph + motion & reduced-motion + asset path/dimensions + why + money-path risk. Deliver the assets
in `visual-assets-brief.md` at their **exact filenames/sizes**. End with a one-paragraph verdict +
the single highest-value move.

If anything is ambiguous, ask before generating.
