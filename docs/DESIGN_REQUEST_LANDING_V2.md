# Kipindi — Landing Page V2 Design Request

**Audience:** Claude Designer
**Project:** Kipindi — Tanzania-licensed pool-based time-window sports betting platform with an in-play prediction game called **Mapigo**
**Live demo (current landing):** https://kipindi-production.up.railway.app
**Design tokens already locked:** see [`docs/DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md) and [`docs/tokens.json`](tokens.json) — please do not invent new tokens.

---

## What I want

A **manager-ready, regulator-ready, world-class landing page** that:

1. Communicates trust + premium feel within 3 seconds of arrival
2. Has a single primary CTA that gets a first-time visitor into the demo with one click
3. Tells a non-technical Tanzanian football fan what Kipindi *is* (pool-based windows, not classic odds) and what Mapigo *feels like*
4. Looks credible to a Tanzanian government inspector reviewing the licence application
5. Looks elegant on a 393 px iPhone, a 768 px iPad, and a 1440 px desktop — same brand feel, different density

**Not what I want:** a SportPesa / Betway clone with red banners, marquee jackpots, and clip-art mascots. Tanzanian competitors look cheap. Kipindi looks premium.

---

## Brand baseline (locked — do not change)

- **Positive = gold (#DEBC54).** Wins, jackpots, success states.
- **Active = royal blue.** Selection, navigation, primary CTAs.
- **Neutral = grey scale.** Body content.
- **Live = gold pulsing dot.** Match-in-progress signal.
- **Loss is reframed as "the pool grew · bwawa limeongezeka"** — never "you lost."
- Typography: **Sora** (display), **Inter** (body), **JetBrains Mono** (numbers + labels).
- Pattern motif: **Sokoni** subtle gold pattern at low opacity.
- Bilingual EN + SW pairs throughout. Sometimes shown as `English · Kiswahili` on the same line; sometimes the SW line is italic underneath.
- We will be adding **French** (Lugha ya Kifaransa) for east-African FR-speaking diaspora — design for the language toggle + language-aware UI.

---

## Required sections (in order)

### 1. Hero
- **Above-the-fold** — must work at 393×600 viewport.
- One sentence headline + one supporting line. Both have the EN+SW pair.
- A single **Try demo · TZS 100,000** primary gold CTA → `/auth/demo`
- A secondary "Browse matches" outline button → `/live`
- Behind the headline: a **subtle live-feeling visualisation** — current candidates: animated waveform (Mapigo), pool counter ticking up, single live-match scoreline floating. Pick one and commit.
- A trust-strip directly under the CTA: **"Tanzania Gaming Board · NIDA verified · 18+ only · Helpline +255 22 211 5811"**

### 2. How it works (3 cards)
Three columns, left-to-right:
1. **Pick a window** (icon: time-clock) — "Bet the 0–15, 15–30, 30–45, 45–60, or full-time. Each window is its own pool."
2. **Pool pays out** (icon: gold coins) — "When the window settles, the winning pool is shared among everyone who picked the right side. Fair, transparent, no opaque odds."
3. **Mapigo · live in-play** (icon: waveform) — "Read the rhythm of the match. Call SPIKE, DRIFT or CALM. 60 seconds, real cash."

Each card has: icon (24px gold/royal stroke), 1-line title (display font), 2 lines body (body font), one EN+SW pair.

**Do not** disclose the operator's specific take percentage on the landing — the regulator-required payout structure lives in the Terms of Service. Marketing should describe the *experience*, not the math.

### 3. Live now (matches strip)
Horizontal scroll on mobile, 3-up grid on desktop. Each tile shows: league chip, two team badges, score (live = pulsing gold dot next to minute), pool size in large gold tabular numerals, "Bet · Weka" button. No fake animation — read from the same `/api/matches` source the rest of the app uses.

### 4. Numbers panel (credibility strip — minimal, no boasting)
A black/dark-navy slab with 4–5 understated stats in tabular gold. Pick from:
- "TZS X paid out · Imelipwa"
- "X verified players · Wachezaji"
- "60-second average withdrawal"
- "Mainland TZ + Zanzibar"
- "ISO 27001 audit · Q3 2026"

Avoid phrasings that read as marketing puffery ("biggest", "best", "we never lose") — they read as rookie. Numbers speak for themselves.

### 5. Mapigo showcase
A **dedicated section that earns its own scroll**. Black background, animated waveform, prediction tray (SPIKE/DRIFT/CALM) preview, "How it works" toggle, win-celebration screenshot below. CTA: "Play Mapigo · Cheza Mapigo" → `/mapigo`.

### 6. Trust + compliance footer band
Right above the actual footer: a 1-row band with:
- 🛡 NIDA-verified KYC
- 💳 Licensed mobile-money providers (M-Pesa, Tigo Pesa, Airtel Money, HaloPesa, Mixx)
- ⚖ Tanzania Gaming Board licensed (number once issued)
- 🆘 18+ Responsible gambling — link to `/legal/responsible-gambling`
- 🇹🇿 Tanzania PDPA compliant

### 7. Footer
- Three columns + copyright row
- Left: company info, address (Dar es Salaam), TIN
- Middle: Legal — Terms, Privacy, Responsible Gambling, AML/KYC
- Right: Help — phone, email, helpline, social
- Bottom: copyright + version + last-deploy timestamp

---

## What absolutely must work right (often missed in landing pages)

- **No layout shift** as the hero loads. Reserve the visualisation's space.
- **Lighthouse score targets:** Performance ≥ 90 mobile, A11y ≥ 95, Best practices = 100, SEO = 100.
- **First Contentful Paint < 1.2s on 4G.** No client-side JS for the hero — render server-side.
- **No `<img>` without explicit width/height.** No CLS.
- **`prefers-reduced-motion` honored.** All animations stop. Static fallbacks designed.
- **Dark + light theme pixel-equivalent.** Currently the app is locked to dark (light has known contrast issues). Please design BOTH themes with WCAG 2.1 AA contrast verified.
- **Bottom nav is hidden on the landing** (it's the marketing shell; only inside the app).
- **No marketing intrusions:** no chat-bot popup, no email-capture modal, no "spin to win" nonsense.

---

## Inspiration to look at + react against

Premium feel benchmarks (we want to match this calibre):
- Stripe homepage (information density + restraint)
- Apple One / Apple Sports (typography + numerical pride)
- Vercel landing (motion subtlety)
- Pinnacle Sports (the only premium sportsbook on the planet — minimal, numerical, no emojis)

Anti-patterns (we want to **not** look like):
- SportPesa, Betway, Bet365 — too dense, too red, too noisy
- Generic crypto-betting Web3 landings — neon gradients, "huge wins" hype
- Clip-art mascots, claps, fireworks, exclamation marks

---

## Output I'd like back from you

1. **Wireframe** at three breakpoints (393, 768, 1440)
2. **High-fidelity mock** in dark theme + light theme
3. **Annotation overlay** explaining the rationale for each major decision
4. **Component breakdown** mapped to existing tokens (where new tokens are required, list them as a TODO with proposed values)
5. **A specific "in-app feel" prediction** — how does this landing differ from the in-app shell, and how do we hand off cleanly when the user clicks the CTA?

---

## Existing assets you can reuse

- [`docs/DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md) — full token library + 44 component specs
- [`docs/tokens.json`](tokens.json) — machine-readable tokens
- [`docs/LOGO_SPEC.md`](LOGO_SPEC.md) — logo + 270° royal arc + gold dot SVG
- [`docs/MAPIGO_REQUEST.md`](MAPIGO_REQUEST.md) — Mapigo product brief
- Live application at https://kipindi-production.up.railway.app for browsing the existing visual language

---

## Constraints

- **Tanzanian first.** Currency is TZS. Phone format is +255. Demographics: 18-45, mobile-first (90%+), 4G or 3G connections, often low-end Android phones. Designs MUST work on 360 px width with 3G latency.
- **Regulator-readable.** A 60-year-old GBT inspector with a feature phone background should be able to look at this and say "this is a serious business." Avoid ambiguity. Show audit, regulator, licensing badges prominently.
- **No third-party trackers / analytics on the landing.** Compliance prefers we measure server-side from access logs.

Thank you. Send back a wireframe set first; we'll iterate from there.
