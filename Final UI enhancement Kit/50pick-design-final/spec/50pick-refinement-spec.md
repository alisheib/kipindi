# 50pick — Full Refinement Pass (Claude Design, 2026-07-07)

> Grounded in: `design-master-brief.md` (source of truth), `design-handover.md`,
> `visual-assets-brief.md`, `kit-gap-audit.md`, `glyph-reference-for-design.md`,
> `PLAYER_VIEW_AUDIT` / `ADMIN_VIEW_AUDIT` / `consistency-audit.md`, `FLOWS.md`,
> the theme kit (`tokens.css`, `markets.jsx`, `conviction-slider*.jsx`, `banners.jsx`),
> `palette.txt`, `brand/*.svg`, and the five current screenshots.
>
> Companion file: **`50pick-refinement-mockups.html`** — high-fidelity mockups of the
> §6 cross-cutting items with the full data model baked in (exact hex, real markets,
> EN/SW/ZH, all states). Per-route mockups for the remaining routes should follow the
> same specimen pattern in batches (see §E "Mockup batching plan").

Palette used verbatim throughout: canvas `#0A0E33` / royal `#060A50` / panel `#131645` ·
gilt `#D49824` / `#FEC766` / `#B97F12` · brand `#4983F4` / `#6CA2FF` · aqua `#36BABA` ·
YES `#00A24F` · NO `#E6424C` · claret `#A4273F` · ink `#F5F8FF` / muted `#C8CBCF`.

---

## PART A — Cross-cutting priorities (brief §6, do these first)

### A1. MarketCard v2 — render the spark + trader crests — [impact H] [effort M]
- Route/component: `components/markets/market-card.tsx` — used on `/`, `/markets`, `/live`, `/results` · State(s) shown in mockups: default · hover · skeleton · resolved · SW-long variant · urgent (<1h)
- Change: The card already fetches `spark` and `traders` and throws them away — the single cheapest lift in the product. Add a **24h YES% sparkline** (28px tall, full card width, drawn in `--aqua-400 #36BABA` at 1.5px with a 6% area fill) directly under the TippingBar, and a **trader-crest stack** (3 overlapping 20px avatars + `+997`) replacing the bare "1,000 predictors" text. Restore the kit's `@` in action labels (gap audit A-3): `YES @ 50%` / `NDIO @ 50%` / `是 @ 50%`. Real data model: "Simba SC wins NBC Premier League 2026-27" · pool `TZS 4.2M` · `1,000 predictors` · `6d left` / SW `Zimebaki siku 6` / ZH `剩6天`. SW footer proof: "Mvua za masika kuanza kabla ya 15 Aprili" with `NDIO @ 64% / HAPANA @ 36%` must fit a 360px card without truncation — mockup shows it.
- Kit/token/glyph: kit `MarketCard` spec (`markets.jsx:6-62`) + `ProbabilityBar micro` · `--aqua-400` for the spark (live-heartbeat role, **not** gold) · `Chip variant=live dot` · existing `Avatar`.
- Motion: on card mount → sparkline path draws in via `stroke-dashoffset`, 480ms `cubic-bezier(0.4,0,0.2,1)`, staggered 40ms per card with the existing `kp-rise` grid stagger · reduced-motion: path renders complete, no draw-in, no rise.
- Asset(s) to produce: none — pure component work. (If real 24h series is unavailable per gap-audit A-5, the spark must render the **real YES% history**, never a synthetic walk; hide when <4 data points.)
- Why it earns its place: one component change visibly upgrades the four most-trafficked pages and stops paying a dead data-fetch cost. · Risk/money-path: none — display only; the A-5 "no fabricated volume" rule is respected by binding to YES% history, not volume.

### A2. `AuthShell` + brand side-rail — [impact H] [effort M]
- Route/component: new `components/auth/auth-shell.tsx`, adopted by all 6 `/auth/*` routes · States: default · SW variant · mobile (rail hidden)
- Change: Extract the six hand-rolled centered cards into one `AuthShell`: form card right, and an `lg:`-only **brand side-rail** on the left — royal `#060A50` panel, `BrandTopo` at 0.09 opacity, a live `TippingBar` specimen (YES 64% aqua-pulsing), the tagline set in Sora 600: EN "Predict events. Not chance." / SW "Tabiri matukio. Si bahati." / ZH "预测事件，而非运气。", and a mono trust strip `18+ · Tanzania licensed · EN · SW · 中文` (never fabricate a licence number — the strip names the fact, not the value). This also resolves the audit's "two banner styles across 4 auth pages" — one `AuthBanner` slot lives inside the shell.
- Kit/token/glyph: `BrandTopo` (bumped to 0.09 per §5c) · `TippingBar` from `brand.tsx` · `--brand-500 #4983F4` for the rail accent, gold **absent** (no earned money on auth).
- Motion: rail TippingBar uses the existing `aqua-pulse` on its live pip only · reduced-motion: static bar, pip solid.
- Asset(s) to produce: none new (reuses BrandTopo + marks).
- Why it earns its place: one component brings brand warmth to six of the coldest screens — the first thing every new player sees. · Risk/money-path: none; also fixes the OTP raw-input inconsistency by routing the form column through `<Input>`/`OtpInput`.

### A3. Shared `RouteError` — [impact H] [effort S]
- Route/component: new `components/ui/route-error.tsx`, adopted by root `error.tsx` + the 6 route error boundaries · States: error (default) · SW · retrying (loading)
- Change: Replace the seven divergent boundaries (six of which drop all brand) with one component: `FiftyMark` at 64px over a `BrandTopo` frame, headline Sora 600 EN "Something went wrong" / SW "Hitilafu imetokea" / ZH "出错了", body one sentence naming the section ("We couldn't load your positions" / "Hatukuweza kupakia nafasi zako" / "无法加载您的持仓"), and a single `btn-primary` "Try again / Jaribu tena / 重试". No claret — an error boundary is recoverable, not destructive; claret stays reserved for irreversible confirms.
- Kit/token/glyph: `FiftyMark`, `BrandTopo`, `Button variant=primary` · `--no-400 #E6424C` only for the small alert glyph tint, `--text-muted #C8CBCF` body.
- Motion: `content-fade-in` on mount, spinner in the retry button while re-rendering · reduced-motion: instant render.
- Asset(s) to produce: none — kit motifs only (matches the "no mascot" 404 direction; the same frame with an "extreme TippingBar" — bar pegged 100/0 — makes the bespoke `not-found.tsx`).
- Why it earns its place: errors are where trust is most fragile; today they're the least branded screens in the app. · Risk/money-path: positive — a consistent recoverable-error surface on wallet/positions protects money-path confidence.

### A4. `PageHero` adoption on the 5 bare routes — [impact M] [effort S]
- Route/component: `/proposals` (glow=gold — the propose reward **is** earned money), `/proposals/new` (gold), `/proposals/[id]` (gold), `/fairness` (glow=info), `/profile/invite` (gold) · States: default · SW
- Change: All five get the existing masthead. Copy, verbatim: Proposals — EN "Propose & earn TZS 20,000" / SW "Pendekeza upate TZS 20,000" / ZH "提议并赚取 TZS 20,000"; Fairness — EN "How results are decided" / SW "Jinsi matokeo yanavyoamuliwa" / ZH "结果如何裁定"; Invite — EN "Invite & earn" / SW "Alika upate" / ZH "邀请赚取". Gold glow is principled on the three reward pages (earned-money rule), info/royal on fairness.
- Kit/token/glyph: existing `PageHero` variants · `trophy` glyph on proposals, `shieldcheck` on fairness, `gift` on invite.
- Motion: existing `reveal-up` · reduced-motion: static.
- Asset(s) to produce: none.
- Why it earns its place: erases the "which app am I in?" flatness on five routes for near-zero cost. · Risk/money-path: none.

### A5. Shared "reward burst" — [impact M→H] [effort M]
- Route/component: new `components/brand/reward-burst.tsx` — used by proposals-approved (`/proposals/[id]`), KYC APPROVED (`/profile/kyc`), market-create success modal, and win payout (with `win-seal.png`) · States: burst (animated) · settled (static end frame) · reduced-motion
- Change: One composable crest: 12 gilt rays (`#FEC766` → transparent, 1.5px strokes) radiating from a `GiltCorner`-framed medallion holding the context glyph (trophy / shieldcheck / resolved star), amount line in JetBrains Mono `--gold-300`: "+ TZS 20,000" with `count-up-flash`, caption Sora: EN "Approved" / SW "Imeidhinishwa" / ZH "已批准" (KYC: "Verified / Imethibitishwa / 已验证"). Gold is legitimate on every one of these — each is an earned-money or earned-status peak.
- Kit/token/glyph: `GiltCorner`, `FiftyMark` watermark at 0.06, `celebrate-pop` + `badge-seal-rays` keyframes, `--gold-300/-500`.
- Motion: mount → medallion `celebrate-pop` (280ms spring) → rays scale-fade 420ms stagger 30ms → amount `count-up-flash` · reduced-motion: static end-frame with rays at 40% opacity, amount rendered final.
- Asset(s) to produce: `public/celebrate/win-seal.png` 1024×1024 transparent PNG (gilt wax-seal/laurel medallion, no text — per visual-assets-brief 4.9) for the payout variant only; the other three variants are pure SVG.
- Why it earns its place: four emotional peaks currently share one flat trophy; a single asset finishes all of them. · Risk/money-path: the burst must render **after** the server-confirmed state, never optimistically on money events.

### A6. MNO / payment logo set — [impact H] [effort S build + external sourcing]
- Route/component: `/wallet/deposit`, `/wallet/withdraw`, wallet "Methods" tab · States: default · selected · disabled (provider down) · SW
- Change: Replace the initials-in-circles with a **provider tile system**: 48×48 logo slot on `#131645` panel, `--r-md`, 8px clearspace, provider name in Inter 500 beneath, selected = 2px `--brand-500` ring + check pip, disabled = 40% opacity + "Temporarily unavailable / Haipatikani kwa sasa / 暂不可用". **Do not redraw the marks**: M-Pesa, Airtel Money, HaloPesa, Mixx by Yas logos are trademarked — source official assets from each operator's brand portal (standard practice and typically a contractual requirement for payment partners); Card/Bank use in-house glyphs in the 129-glyph idiom (1.9px, round joins). The mockup board shows the tile system with text-label placeholders so layout ships before brand assets land.
- Kit/token/glyph: new glyphs `cardPay` + `bankBuilding` (extend `landmark`) in `glyphs.tsx` · `Chip variant=neutral` for the fee note.
- Motion: selection ring 120ms `--ease-micro` scale-in · reduced-motion: instant ring.
- Asset(s) to produce: `public/pay/{mpesa,airtel,halopesa,mixx}.svg` (official, sourced) + `public/pay/{card,bank}.svg` (in-house, 24×24 grid) — plus the deposit-page **trust strip** slot (regulator seal placeholder; never fabricate the seal — leave the slot labeled until the licensed asset is supplied).
- Why it earns its place: recognizable payment marks are the single strongest trust signal on the deposit path for this audience. · Risk/money-path: **money-path critical** — selected-state clarity must beat decoration; keep the amount step visually unchanged.

### A7. Category-art layer — [impact M] [effort M]
- Route/component: topic filter chips on `/markets` + `/results`, detail-header watermark on `/markets/[id]`, new home category row · States: chip default · selected · SW-long ("Hali ya hewa" for Weather must fit)
- Change: Promote the 8 category glyphs (football, economy, weather, crypto, entertainment, tech, politics→"Other", forex) from watermark-only to: (1) 14px glyph inside each topic chip; (2) a 96px 6% -opacity glyph watermark behind the market question on `/markets/[id]` (the brief's H item — the hero currently sits on flat bg); (3) a home "Browse by topic" row of 8 tappable tiles. Chip copy trilingual: Sports/Michezo/体育 · Weather/Hali ya hewa/天气 · Macro/Uchumi/宏观 · Crypto/Sarafu-mtandao/加密货币 · Culture/Utamaduni/文化 · Tech/Teknolojia/科技.
- Kit/token/glyph: existing category glyphs · `Chip` selected = `--brand-500` fill at 16% + 1px `--brand-400` ring (royal = active/nav, per colour discipline; **not** gold).
- Motion: chip select 120ms `--ease-micro`; watermark none · reduced-motion: n/a beyond chip (instant).
- Asset(s) to produce: `public/category/{sports,macro,weather,crypto,culture,tech,other}.webp` 800×500 series per visual-assets-brief 4.7 for section toppers (navy+gilt abstract, no text) — the chip/watermark tier needs no bitmaps.
- Why it earns its place: gives the board scannability and the detail page the identity the brief flags as its top player-core gap. · Risk/money-path: none.

### A8. Admin primitives: `AdminKpi spark` + `AdminBarList` + `AdminMeter` + `AdminFunnelChart` — [impact M] [effort M]
- Route/component: `components/admin/admin-charts.tsx` (+ helper feeding `AdminKpi spark`) · adopted by `ai-usage`, `players`, `moderation`, `ai-polls`, `candidates`, `players/cohorts`, `config`, `privacy`, `invites`, `audit`, `players/[id]`, overview/live/finance · States: populated · empty (route through illustrated `EmptyState`) · loading skeleton
- Change: Four small primitives finish most admin elevations. `AdminMeter`: horizontal value-vs-cap gauge, track `#131645`, fill `--brand-500`, threshold tick, turns `--no-500` past 90% (fee-vs-ceiling, DSAR SLA, credit budget). `AdminBarList`: label + mono value + proportional bar rows (cohort distributions — replaces the hand-rolled divs). `AdminFunnelChart`: stage columns from `countByState()` for the ai-polls/candidates pipeline that's currently prose. Spark helper: feed 24h/7d mini-series into the unused `AdminKpi spark` slot. Restraint per brief §5d: no gold anywhere in admin except the resolved seal; aqua only on live feeds.
- Kit/token/glyph: `AdminKpi`, `AdminCard`, `admin-tbl`, `SortTh` (also fixes `players`' local SortTh) · `--brand-*`, `--no-*` only.
- Motion: bars grow-in 240ms once on mount · reduced-motion: static.
- Asset(s) to produce: none.
- Why it earns its place: the console reads as one system but is data-blind; four primitives light up ~13 screens. · Risk/money-path: display-only; `ai-usage` gets its missing time-series (its H item).

### A9. Invite share-card + QR, and wallet balance sparkline — [impact H] [effort M]
- Route/component: `/profile/invite` (share-card via `navigator.share` + QR block) and `/wallet` (30-day balance spark) · States: invite default · shared (toast "Link copied / Kiungo kimenakiliwa / 链接已复制") · wallet populated · wallet empty (<2 points: hide spark)
- Change: **Invite share-card**: a generated 1080×1080 image — royal `#060A50` field, `FiftyMark` gilt, headline EN "You've been invited" / SW "Umealikwa" / ZH "您已被邀请", the invite code in JetBrains Mono `--gold-300` inside a `GiltCorner` frame, QR bottom-right (QR is a sanctioned raw-hex context per the handover). Gold is principled: the invite pays the referrer. **Wallet spark**: a 30-day balance line above the activity list, `--aqua-400` 1.5px with terminal pip, mono caption "30 days / Siku 30 / 30天" — aqua, not gold, because balance is state, not earnings; the bonus card keeps its gold.
- Kit/token/glyph: `GiltCorner`, `FiftyMark`, `EarningsRing` (already on invite — the card echoes it) · Satori for the share-card render (sanctioned hex context).
- Motion: share-card slides up in a `sheet-rise`; wallet spark draws in 480ms · reduced-motion: static card, complete path.
- Asset(s) to produce: `public/banners/invite.webp` 1200×480 (gilt concentric-ring energy, center-right, per assets-brief 4.4) as the page texture; share-card is runtime-generated.
- Why it earns its place: these are the two "net-new features" that most finish their pages — invite currently shares bare text+URL. · Risk/money-path: share-card must show the code, never a balance.

### A10. Leaderboard podium — [impact H] [effort S]
- Route/component: `/leaderboard` header · States: populated (real players from row 1 — also fixes the audit's 12-fake-rows issue) · empty (existing podium empty-state finally matches reality) · SW
- Change: Top-3 podium: center #1 raised, 56px avatar in a gilt `#D49824` ring + crown glyph + `TierBadge` (the **canonical** import — kills the leaderboard's local re-implementation and the sovereign/silver "S" collision), #2/#3 flanking at 44px with muted-ink rings. Gold on #1 is principled: the podium is literally earned money/standing. Restore the kit LeaderboardRow fidelity below it (gap audit A-4): streak chip with `hot` flame glyph ("4-win streak / Mfululizo wa ushindi 4 / 4连胜"), `@handle`, "{n} markets resolved / masoko {n} yametatuliwa / 已结算{n}个市场".
- Kit/token/glyph: kit `LeaderboardRow` (`markets.jsx:246-281`) · canonical `TierBadge` · `crown` + `hot` glyphs · `--gold-400` ring #1, `--text-muted` rings #2/#3.
- Motion: podium avatars `kp-rise` staggered 60ms, crown settles with a 6° overshoot rotate · reduced-motion: static.
- Asset(s) to produce: none.
- Why it earns its place: the empty state promises a podium the real board never delivers — an inversion players will notice. · Risk/money-path: none.

---

## PART B — Refine-existing pass (brief §4g): keep or upgrade

1. **ConvictionDial / TippingBar — KEEP, three upgrades.** The dial is the product's signature and the screenshot shows it landing. Upgrades: (a) **thumb affordance** — current needle reads as display, not control, on first touch; add a 28px grab-pip on the needle tip with a 2px `--brand-400` ring on `:focus-visible` and a one-time "drag to set stake / buruta kuweka dau / 拖动设置金额" coach hint; (b) **trilingual fit** — "NDIO"/"HAPANA" at the dial poles need the label box widened ~24%; verify at 360px; (c) the 200× range (TZS 500→100,000 in one gesture) is an **RG concern the audit already flags** — add a soft detent + haptic at 10× and require a deliberate second gesture past 50×. Reduced-motion: needle jumps, no spring.
2. **MarketCard — UPGRADE** (A1 above). Additionally: demote the `MoveChip (+Npt)` to mono micro text right-aligned above the bar — two chips + a badge + a chip-stack currently compete in the header.
3. **Empty states — KEEP the system, redraw two, add five.** `emptyLeaderboard` and `emptyPositions` are strong; `emptyMarkets` (scales) is the weakest — redraw with the scales holding a YES/NO pip pair. Widen box to the kit's 360px and drop the 52px ring badge (gap audit A-6). New kinds per brief §4e: proposals (ballot+quill), KYC progress rail, provably-fair diagram, RG self-care scene, admin generic — all 64×64 grid, 1.9px, gilt line-art, no text.
4. **Buttons & chips — KEEP variants, systematize states** (see Part D state-token recipe). Fix kit drift: per-size padding 12/16/20/24 and `--r-md` (xl `--r-lg`) per gap-audit A-1; spinner unified at 0.7s (A-2). Gold CTA: verify "Weka dau" fits `btn-lg` without wrapping — it does at 15px/600 but not with a leading glyph; drop the glyph on SW.
5. **PageHero — KEEP; add one variant.** Add `glow=aqua` for `/live` (live identity is the page's own brief gap). Bump internal `BrandTopo` to 0.09.
6. **Wallet cards / profile hero / EarningsRing — KEEP.** These are the reference surfaces. Only addition: the balance spark (A9) and real Methods/Limits data (the audit's hardcoded-mock flag is a launch blocker, not a design one).
7. **Modals — KEEP chrome, upgrade the success crest.** `dialog-rise`/`scrim-fade` are right. `OperationResultModal` success state adopts the reward-burst end-frame (A5). Bet-confirm: add a one-line pool-share framing sentence "If YES wins, you share the pool / NDIO ikishinda, unagawana mfuko / 若"是"获胜，您将分享奖池" — pool-share framing is a kit hard invariant and currently absent from the confirm.
8. **Admin KPI/tables/charts — UPGRADE via A8.** KPI tile itself is fine; it's data-starved, not mis-designed.
9. **The 129 glyphs — KEEP; redraw 3, add 12.** Redraw for optical weight: `percent` (circles read light at 12px — thicken to 2.1 optical), `activity` (peak clips the 24px box), `landmark` (pediment merges at 12px). Add the 8 must-have + 4 nice-to-have Controlled-Poll glyphs from the glyph reference (calendarClock, hourglassHalf, hourglassOff, target, sliders, calendarRange, gauge, shuffle; circleStop, timerReset, listFilter, stepForward) — specs are already exact; follow them.
10. **Hero image — REPLACE.** The current F1 crowd shot is strong in grade but off-subject for a Tanzanian market (no local resonance, and motorsport isn't a listed category). Produce `public/hero/hero-bg.webp` 2400×1600 per assets-brief 4.1: a decisive East-African sporting/civic moment, warm crowd, gilt light, left 40% quiet; render bright (code darkens it). Optional rotating set `hero-bg-01…06`. Delete the 20 orphan slides and the two orphan hero components (audit flag).
11. **BrandTopo — UPGRADE:** 0.05 → 0.09 opacity everywhere it's used; it is currently invisible on navy.
12. **PulseRing / SignalPip / GiltCorner — KEEP** as-is; they carry the live/earned language correctly.

---

## PART C — Per-page items not covered above

### C1. High-priority routes
- **`/markets/[id]` hero — [H][S]:** category-glyph watermark (A7) + a slim gilt hairline band (1px `#B97F12` at 40%) above the question — gilt as *seal of the real*, ~2% of the surface, doesn't breach earned-money (it frames the market, not decoration on a CTA). States: open · closing (<1h: countdown pill pulses aqua→gold) · waiting-for-results ("Selection closed — waiting for results / Uchaguzi umefungwa — inasubiri matokeo / 选择已截止——等待结果" with `hourglassOff` glyph) · resolved (ResolutionPanel, shipped).
- **`/profile/kyc` — [H][M]:** progress-rail illustration (64-grid line-art: 4 nodes ID→selfie→review→verified, gilt fill up to current node); per-slot ID-silhouette line-art (passport vs national-ID outlines); APPROVED adopts the reward-burst "Verified / Imethibitishwa / 已验证". All fields route through canonical `<Input>` (kills the page's `admin-focus` leak, audit item). Money-path: KYC gates withdraw — clarity first, burst renders only on server-confirmed APPROVED.
- **`/profile/sessions` — [H][S]:** replace the debug dump with device cards: `smartphone`/`device` glyph, "Dar es Salaam · Chrome on Android", relative time in mono, current session gets a 2px `--aqua-400` left rule + "This device / Kifaa hiki / 此设备" chip. Revoke = `btn-ghost` with claret text (destructive). IP shown truncated with reveal-on-tap.
- **`/fairness` — [H][M]:** `PageHero glow=info` + the provably-fair SVG diagram: 5-step horizontal chain (market opens → selections lock → two officers attest → objection window → payout) drawn in the glyph idiom, gilt only on the attestation seal node. Trilingual step labels live in HTML, not the SVG (no baked-in text rule).
- **`/live` — [M→H][M]:** identity fix: `PageHero glow=aqua`, hero shows the **most-contested** market (the audit found the label lies today — it shows soonest-closing; sort by `abs(yesPct−50)`), plus a dense TippingBar-wall variant of the card (bar + title + `@` prices only) so the page stops being /markets with a different URL.

### C2. Medium/low items (condensed; all follow the state matrix + SW rule)
- `/` home: category row (A7) + an animated stats band — two mono counters "markets settled / masoko yaliyotatuliwa / 已结算市场" and "TZS paid out / TZS zilizolipwa / 已派彩 TZS" with `count-up-flash` on scroll-into-view; reduced-motion: static values. Never a fabricated number — bind to real aggregates.
- `/results`: aggregate YES/NO donut in the header (green/rose only) + one "notable result" featured card with the resolved gilt seal chip. Keeps header parity with /markets otherwise (handover Q5: **leave lean**, the donut is data, not a masthead).
- `/positions`: mini countdown-ring (Part D unified countdown) on open cards + a YES/NO exposure bar (green/rose split of open stake).
- `/positions/performance`: streak pip-chain (filled `hot` pips) + "best win" gilt crest (earned money — gold is right).
- `/wallet/withdraw`: KYC-lock line-art (padlock over ID silhouette); merge the three notices into one iconized panel; **route amount through the deposit's kit control and balance through `<Cash>`** (both are open audit flags on a money path).
- `/proposals*`: PageHero (A4), proposals-native EmptyState (ballot/quill), reward-reminder banner `public/banners/propose.webp` 1600×360 (left 55% quiet), per-card CategoryIcon tint.
- `/profile`, `/profile/account`, `/profile/source-of-funds`: GiltCorner on the KYC/SoF CTA cards **only if** the reward/verification framing holds — SoF is compliance, not earnings, so use royal, not gold; per-source glyphs (salary=briefcase+coin, business=storefront, savings=jar, investment=trend, gift=gift) in the 24-grid idiom; signature line-art on the declaration; warning-topo (claret-tinted BrandTopo 0.08) on close-account.
- `/profile/responsible-gambling`: RG self-care line-art (sunrise/shield motif, no gambling imagery), helpline as a `yes`-toned support callout ("Support is available / Msaada unapatikana / 可获得帮助").
- `/help`: per-FAQ topic glyphs, tone-coded quick-link chips.
- Offline: branded `/offline` route (FiftyMark + "You're offline / Uko nje ya mtandao / 您已离线" + retry) + precache.
- OG: extend dynamic OG to leaderboard/results/proposals/profile; align gradient to `#0A0E33→#060A50`; produce `public/og/og-1200x630.png` + `twitter-1200x600.png` (text allowed — finished cards, gilt lockup + "The wisdom of YES & NO.").
- `manifest.json`: add `shortcuts` (Markets `/markets`, Wallet `/wallet`, Deposit `/wallet/deposit` with 96px monochrome glyph icons); fix the narrow screenshot label.
- `legal/*`: `LegalHeader` — GiltCorner frame + per-doc glyph (scrollText/shield/heartPulse/landmark).

---

## PART D — Systems answers (handover §6 questions)

**1–2. Top 5 by impact-for-effort** (kit primitive in brackets): ① MarketCard v2 [ProbabilityBar + spark] — 4 pages, S/M effort; ② AuthShell [BrandTopo + TippingBar] — 6 pages, M; ③ RouteError [FiftyMark] — 7 boundaries, S; ④ Leaderboard podium [LeaderboardRow + TierBadge] — H visibility, S; ⑤ MNO tiles [new glyph slots] — deposit trust, S build.

**3. The active-tab colour rule.** The principle that resolves gold-underline-on-wallet vs royal-pills-elsewhere: **royal marks *where you are*; gold marks *what you earned*.** Navigation state — including tabs — is location, so all tabs unify on royal (`--brand-500` underline/pill), wallet included. The wallet keeps its gold where gold is content: the bonus card, cash-back banner, deposit CTA. This keeps "gold = earned-money only" literally true and gives engineers a one-line rule instead of a per-page exception.

**4. The 3–4 state changes that most deserve micro-interaction:**
- *Bet placed → position appears*: confirm modal closes → the new position card `kp-rise`s into the list with a one-shot 1px `--brand-400` ring fade (600ms) · reduced-motion: card appears, ring at 40% static for 1s then gone.
- *Odds change on a visible card*: use the existing `odds-flash-up/down` on the **price numerals only** (never the bar fill — the bar animating reads as manipulation), 400ms · reduced-motion: no flash, value swaps.
- *Board filter switch*: crossfade old grid 120ms out → skeleton only if >150ms latency → new grid staggered `kp-rise` 40ms/card · reduced-motion: instant swap, no skeleton shimmer.
- *Countdown urgency threshold*: at <1h the pill transitions aqua→gold→(at <10m)→rose with a single `live-pulse` per minute, not continuous · reduced-motion: colour change only, no pulse.

**5. Win/resolution moment.** The pieces (`gavel-strike`, `seal-impress`, `celebrate-pop`) exist but fire as isolated effects. Sequence them: scrim → seal presses (`seal-impress`, 360ms) → outcome chip stamps (YES green or NO rose) → *then* and only for winners, the reward burst (A5) with `count-up-flash` on the payout. Losers get the seal + calm ledger line, no rose burst — dignity in loss is an RG stance. Voided markets must fire the toast at all (open audit bug). Reduced-motion: final composition rendered static.

**6. Accessibility findings from the screenshots:** (a) muted-ink `#C8CBCF` on panel `#131645` passes AA for body but the mono micro-labels at 9–11px with 0.1em tracking sit near the perception floor — raise micro to 11px minimum; (b) YES/NO must never be colour-only: the `@ %` numerals and left/right invariant carry it, but the exposure bar (C2) needs end-labels; (c) the dial needs a full keyboard path (arrows = detent steps, PgUp/PgDn = 10×) and `aria-valuetext` "TZS 25,000 on YES / TZS 25,000 kwa NDIO"; (d) hover-only affordances (card lift) need visible `:focus-visible` twins everywhere — fold into the state-token recipe: hover = brightness(1.06)+lift 2px; focus-visible = 2px `--brand-300` ring offset 2px; active = `press-pop` scale .98; disabled = 45% opacity, no filter.

**7. Over-designed / simplify:** the MarketCard header (chip + chip + signal badge + MoveChip) — demote MoveChip (Part B-2); the three withdraw notices (merge, C2); the leaderboard's synthetic sparkline rows (cut until real series exists — same honesty rule as A-5); the two orphan hero components (delete).

---

## PART E — Asset production list (exact paths) & mockup batching plan

| Asset | Path | Dims/format | Note |
|---|---|---|---|
| Hero background | `public/hero/hero-bg.webp` | 2400×1600 webp q82 | left 40% quiet, render bright; optional `-01…06` set |
| Propose banner | `public/banners/propose.webp` | 1600×360 webp | left 55% quiet, gilt question-mark/gavel motif |
| Bonus banner | `public/banners/bonus.webp` | 1600×360 webp | gilt wash, coin/laurel abstract, no cash stacks |
| Invite texture | `public/banners/invite.webp` | 1200×480 webp | gilt concentric rings, center-right |
| OG default | `public/og/og-1200x630.png` | 1200×630 png | text allowed: lockup + tagline |
| X card | `public/og/twitter-1200x600.png` | 1200×600 png | as above |
| Category set | `public/category/*.webp` ×7 | 800×500 webp | one grade, tiles calmly behind chips |
| Section texture | `public/texture/navy-weave.png` | 1024×1024 png | 2–4% contrast seamless |
| Win seal | `public/celebrate/win-seal.png` | 1024×1024 png transparent | pairs with reward-burst payout variant |
| MNO logos | `public/pay/{mpesa,airtel,halopesa,mixx}.svg` | vector | **source official brand assets — do not redraw** |
| Card/Bank glyphs | `public/pay/{card,bank}.svg` | 24-grid vector | in-house, 1.9px idiom |
| New glyphs ×12 | `components/ui/glyphs.tsx` | 24-grid | Controlled-Poll set per glyph reference — **DELIVERED** in `glyphs-additions.tsx` |
| Line-art SVGs ×9 | in-component | 64-grid | KYC rail, fairness diagram, RG scene, SoF sources, device, FAQ, proposals-empty, reward burst, 404/offline motifs — **DELIVERED** (glyph kit) |

**Delivered with this pass:** `glyphs-additions.tsx` (49 glyphs + 5 empty-state illustrations in the exact `G`-wrapper idiom: full Controlled-Poll set, payments incl. the percent/activity/landmark redraws, source-of-funds ×5, devices ×3, help/support ×4, status-tag set ×8, system ×3, category reference ×8) and `50pick-glyph-kit.html` (the specimen sheet, incl. the complete chip/tag anatomy in EN/SW/ZH). Both generated from one source so they cannot diverge.

**Mockup batching plan** (each batch = one specimen HTML in the pattern of the attached board): Batch 1 (delivered) = §6 cross-cutting. Batch 2 = money path (`/wallet` full, deposit, withdraw, bet-confirm, ConvictionDial states). Batch 3 = identity (`/profile/*`, KYC rail, sessions, SoF). Batch 4 = discovery (`/`, `/markets`, `/live`, `/results`, `/markets/[id]`). Batch 5 = admin primitives on real layouts. Batch 6 = auth/legal/system (404, offline, OG).

---

## VERDICT

The design baseline is genuinely high — the palette discipline, the dial, the wallet cards, and the admin shell are already better than most licensed operators ship — but the product currently spends its quality unevenly: the four highest-traffic surfaces sit on a card that discards its own data, six auth pages and seven error boundaries drop the brand entirely, and every emotional peak (win, approval, verification, invitation) resolves into a flat gradient, while gold — the one colour the system reserves for exactly these moments — goes underused where it's earned and leaks slightly where it isn't (wallet tabs). Nothing here needs a restyle; it needs the existing system finally paid off at its peaks and edges. **The single highest-value move is A1, the MarketCard v2 sparkline + trader-crest upgrade:** it is the most-repeated component in the product, it turns an existing dead data cost into visible life on `/`, `/markets`, `/live`, and `/results` simultaneously, and it sets the honesty precedent (real series or nothing) that every chart after it should follow.
