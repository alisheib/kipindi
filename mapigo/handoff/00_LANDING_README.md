# Kipindi Landing Page — Claude Code Handoff

**For:** Claude Code (engineering implementation)
**From:** Design
**Status:** 3 directions delivered. Pick one, ship it.

---

## What you have

| File | Purpose |
|---|---|
| `Kipindi Landing.html` | **Self-contained** spec — open it. A pan/zoom design canvas with 3 full landing-page variations rendered live (animated waveform, count-ups, ticker) at 1920px wide. |
| `00_LANDING_README.md` | This file — handoff brief + paste-ready prompt for Claude Code. |

Open `Kipindi Landing.html` in a browser. It runs offline, no dependencies.

---

## The 3 variations

1. **Editorial Pulse** — magazine-grade. Sora 800 at 104px, asymmetric grid, live waveform card, three-panel editorial body, fixtures grid. Quiet luxury.
2. **Kinetic Stadium** — alive. Live ticker bar, animated count-ups, three-column hero (pitch · live stage · winners feed), dual-language statement band, Mapigo showcase, stats panel.
3. **Cinematic Manifesto** — dramatic. 144px hero statement over an animated waveform, four-pillar manifesto grid, full Mapigo showcase, app download with phone mockup, huge closing CTA.

All three share Kipindi tokens, fonts (Sora / Inter / JetBrains Mono), the gold-on-navy palette, the live animated waveform as hero, **"Watch the live waveform"** as primary CTA, mixed African + European fixtures, English-first with Swahili accents.

---

## Build instructions (paste this to Claude Code)

> Build the **Kipindi marketing landing page**.
>
> Full design spec is in `Kipindi Landing.html` — a self-contained file with 3 variations rendered side-by-side. **Pick variation [1 / 2 / 3]** (or the mash-up specified below) and implement it as the production landing page.
>
> **Mandatory inheritance:** Use Kipindi `DESIGN_SYSTEM v1.0` tokens — colors, type stack (Sora / Inter / JetBrains Mono), spacing, radii, motion easings, glows, gradients. Do not invent new tokens.
>
> **Stack:** Next.js (App Router), server components where possible, framer-motion for hero waveform + count-ups + ticker animations. SVG only for the waveform — no canvas/WebGL.
>
> **Implementation requirements:**
> 1. **Animated waveform hero** — SVG, 60fps, deterministic spike/calm/drift profile per spec. Pauses on `prefers-reduced-motion` (replace with static snapshot).
> 2. **Live data placeholders** — fixtures grid, winners feed, count-ups, ticker — all wired to mock JSON for now; structure them so backend can swap to live feeds without UI changes.
> 3. **Responsive** — design canvas is 1920px desktop. Build down to 390px mobile (mobile-first execution, even though desktop is the showcase). The hero waveform must remain the focal point on every breakpoint.
> 4. **Dual language** — every visible string EN + SW per the copy already in the spec. Use a `t()` helper, store strings in `locales/en.json` + `locales/sw.json`. Lang toggle persists in localStorage.
> 5. **Primary CTA** — "Watch the live waveform" routes to `/mapigo` (the signature game).
> 6. **Performance** — LCP < 2.0s on 3G, 4G. Bundle < 180KB JS. Use `font-display: swap`. Lazy-load below-the-fold sections.
> 7. **Accessibility** — AA contrast, semantic landmarks, skip-to-content, keyboard navigation, `aria-live` on count-ups.
> 8. **SEO** — full meta + OG + Twitter cards, structured data for organization.
> 9. **Compliance footer** — 18+, BCLB licensing, helpline — present on every screen, never tucked under a fold.
>
> **Hard constraints:**
> - No team marks, no player names, no copyrighted music, no real broadcast clips. Abstract only.
> - The Mapigo waveform is the hero — don't decorate around it, let it breathe.
> - Mobile bottom-nav inherits from the parent app; landing must integrate cleanly when user transitions to the authed shell.
>
> **Acceptance:**
> - [ ] Lighthouse score 95+ across the board on desktop and mobile
> - [ ] Hero waveform runs 60fps on a 3GB Android over 3G
> - [ ] EN + SW strings complete; lang toggle works and persists
> - [ ] All CTAs route correctly (/mapigo, /signup, /matches)
> - [ ] AA contrast verified on all text
> - [ ] Compliance footer present on every viewport
> - [ ] OG cards render correctly when shared on WhatsApp / Twitter / Telegram
>
> Ping me when staged and I'll review.

---

## Out of scope (do not do)

- Don't redesign the Kipindi visual system. Inherit it.
- Don't add stock photos of stadiums, players, or "African landscapes." The waveform is the hero.
- Don't add a chatbot, popup, cookie-banner-as-modal, or any growth-hack pattern.
- Don't propose a different framework. Next.js + the existing Kipindi component library.
