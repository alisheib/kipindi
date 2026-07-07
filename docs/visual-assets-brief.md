# 50pick — Visual Asset Production Brief

> **For an image/design generation tool (or a design Claude).** Produce final-quality
> visual assets to finalize the 50pick product. Everything here is grounded in the live
> codebase — filenames, dimensions, and placement are exact, so deliverables drop straight
> in. **Read §1–§3 (art direction + palette + rules) before generating anything**, then work
> the asset table in §4. Delivery + naming in §6.

---

## 1. The brand in one paragraph

**50pick** is a Tanzania-licensed, regulator-ready **pari-mutuel prediction market** — players
back **YES** or **NO** on real-world outcomes (sport, weather, macro, crypto, culture, tech) and
the correct side shares the pool. The feeling is **editorial confidence, not casino flash** —
"**the wisdom of YES & NO.**" Think *a premium broadsheet's data desk crossed with a high-end
sportsbook*, rendered in **deep royal navy and restrained gilt**. Mobile-first, dark-first,
trilingual (EN/SW/ZH), real money under a gambling license → **trust and clarity over spectacle.**

## 2. Palette (authoritative — sRGB hex, match these)

| Role | Hex | Use in imagery |
|---|---|---|
| **Canvas / base** | `#0A0E33` (deep) → `#060A50` (royal) | Dominant background. Deep royal navy — **never pure black.** |
| Panel / raised navy | `#131645` / `#05024F` | Secondary surfaces, depth. |
| **Gilt / gold (hero accent)** | `#D49824` (gold) · `#FEC766` (light) · `#B97F12` (deep) | The "earned" accent — light, wins, seals. **Restrained**, metallic, warm — not yellow, not neon. |
| **Royal / brand** | `#4983F4` (indigo-blue) | Active/energy accent, glow. |
| **Aqua / live** | `#36BABA` | "In play", pulse, live energy. |
| **YES** | `#00A24F` (green) | The YES side. |
| **NO** | `#E6424C` (rose-red) | The NO side. |
| Claret (grave) | `#A4273F` | Rare — serious/irreversible tone only. |
| Ink / text | `#F5F8FF` (near-white) · `#C8CBCF` (muted) | Never for large fills in imagery; app draws text. |

**Signature move:** the **YES-green ↔ NO-rose duality** and **gilt on royal-navy**. Lean on these.

## 3. Rules — every asset MUST obey

**DO**
- Deep royal-navy base with **gilt highlights** and a **cinematic, low-key** light.
- Cohesive **series** — consistent grade, grain, contrast, and light direction across a set.
- Leave **left-third safe/quiet** for overlaid text on wide/hero pieces (see per-asset notes).
- Subtle, tasteful **Tanzanian flavor** where natural (Dar es Salaam energy, local sport/
  culture, warm crowds) — evocative, **not** clichéd flags/maps/wildlife.
- Fine **film grain + soft vignette** so assets sit in a dark UI without banding.
- Honour the **YES/green–NO/rose** and **gilt-on-navy** identity.

**DON'T**
- ❌ No pure black; no neon/cyberpunk; no casino clichés (dice, roulette, cards, slot 7s).
- ❌ No **money-rain / cash stacks / gambling-addiction** cues — regulator-sensitive.
- ❌ No **baked-in text or logos** (except the OG card, §4.9) — the app is trilingual and adds
  text itself.
- ❌ No cartoon mascots, no emoji, no stocky "diverse team high-fiving" clichés.
- ❌ Nothing that fights an overlaid gradient (hero is darkened + left-graded in code).

## 4. Assets to produce (priority order)

> Paths are relative to the repo root. `webp` preferred for photos/large art (quality ~82);
> `png` for anything needing crisp edges/transparency; `svg` if it's truly vector.

### Tier 1 — First impression
**4.1 Hero background** — `public/hero/hero-bg.webp` (replaces current generic stock)
- **2400 × 1600** (3:2), webp. A cinematic, on-brand scene of **anticipation → vindication**
  (a decisive sporting/real-world moment, warm crowd energy, gilt light) over royal navy.
- The app applies `saturate(0.75) brightness(0.5)` + a left→right dark gradient, so **render it
  reasonably bright and rich** (it will be darkened) and keep the **left 40% low-detail** for the
  headline. Focal energy on the **right**.
- **Optional bonus:** a cohesive **set of 4–6** interchangeable variants (same grade) named
  `hero-bg-01.webp … hero-bg-06.webp` if we want a rotating hero. (Note: the old
  `public/hero/slides/*` — 20 mismatched stock images, ~10 MB — are **unused** and will be
  deleted; replace, don't match, them.)

### Tier 2 — In-page banners (today these are flat gradients — add subtle art)
**4.2 "Propose & earn" banner** — `public/banners/propose.webp`
- **1600 × 360** wide strip, webp. Very subtle dark-navy texture with a faint **gilt motif of
  question-marks / a struck gavel / YES·NO glyphs**. Must read behind a trophy glyph + white text
  on the **left**; keep left 55% quiet. Low contrast — it's a *background*, not a poster.

**4.3 Cash-back / bonus banner** — `public/banners/bonus.webp`
- **1600 × 360**, webp. Warm **gilt** wash on navy, faint coin/laurel/seal texture (abstract,
  **not** cash stacks). Left 55% quiet.

**4.4 Invite & Earn hero texture** — `public/banners/invite.webp`
- **1200 × 480**, webp. Celebratory but restrained — gilt rays / concentric "earnings ring"
  energy on navy, radiating from center-right (the page overlays a gold EarningsRing).

### Tier 3 — Social / brand
**4.5 Default OG share card** — `public/og/og-1200x630.png`
- **1200 × 630** png. Premium branded link-preview: royal-navy, gilt lockup **"50pick"** +
  tagline **"The wisdom of YES & NO."**, subtle YES/NO duality. **Text/logo allowed here** (this
  one is a finished card). Keep composition centered/safe for cropping.
**4.6 Twitter/X card** — `public/og/twitter-1200x600.png` — as above at **1200 × 600**.

### Tier 4 — Cohesive system art (optional but high-polish)
**4.7 Category art set** — `public/category/{sports,macro,weather,crypto,culture,tech,other}.webp`
- **800 × 500** each, webp, one cohesive series. Abstract, low-key navy+gilt evocations of each
  topic (sport = motion arcs; weather = rain/isobars; macro = candlesticks/curve; crypto = node
  mesh; culture = crowd/stage; tech = circuit filaments). Used as subtle market-card/section
  toppers. Must tile calmly behind chips + text.

**4.8 Section texture / pattern** — `public/texture/navy-weave.png`
- **1024 × 1024** seamless tile, png, near-invisible (2–4% contrast) navy weave/grain to lift flat
  panels and the confidential band.

### Tier 5 — The emotional peak
**4.9 Win / resolution seal** — `public/celebrate/win-seal.png`
- **1024 × 1024** png, **transparent bg**. A gilt **wax-seal / laurel medallion** burst for the
  "you won / market resolved" moment (pairs with existing `celebrate-pop` / `seal-impress`
  animation). Centered, radial, transparent — no text.

## 5. App icons / favicons — reference only (already exist; regenerate only if asked)
`public/icons/` holds `icon-192.png`, `mark-color-512.png`, `maskable-512.png`, `tile-512.png`,
`apple-touch-180.png`, `favicon-16/32.png`, plus `public/favicon.svg`. Master marks are vector in
`public/brand/*.svg` (color / dark / white / simplified). If refreshing: **keep the "50" mark
identity**; maskable needs ~20% safe padding; base `#0A0E33`.

## 6. Delivery & naming
- Deliver at the **exact path + filename + dimensions** above so they drop in with zero renames.
- Photos/large art → **webp** (q≈82) *and* a **png/jpg fallback** if easy. Vector → svg. Seals/
  transparency → png. OG → png.
- Keep each ≤ ~600 KB where possible (webp); size is otherwise unconstrained.
- If you can only do a subset, prioritize **4.1 → 4.5 → 4.2/4.3/4.4**.

## 7. Reference bundle (in this zip)
`palette.txt` (hex + roles) · `brand/*.svg` (the marks) · `hero-bg-current.webp` (the image to
beat) · `screens/*.png` (current home / markets / wallet / market-card for grade + context) ·
`design-handover.md` (the interaction-design companion) · `manifest.json` (icon specs).

## 8. One-paragraph creative summary (paste to the tool)
> Deep royal-navy (#0A0E33) canvas, restrained metallic **gilt** (#D49824/#FEC766) light, and a
> **YES-green (#00A24F) / NO-rose (#E6424C)** duality. Editorial, cinematic, confident — a premium
> data-desk-meets-sportsbook feel for a **Tanzania-licensed prediction market**, "the wisdom of
> YES & NO." Cohesive grade with fine grain + soft vignette so everything sits in a dark UI. **No**
> neon, casino clichés, cash/money-rain, baked-in text (except the OG card), or mascots. Leave the
> left third quiet on wide pieces for overlaid headlines.
