> 📑 **RECORD, NOT RULE.** The rulebook is **`docs/DESIGN_AUTHORITY.md`**.
>
> 🔴 **This file's "Authority" section is SUPERSEDED (2026-08-08).** It declared that
> nothing outside this archive carried any weight, and put its own dated `tokens.css`
> at the top of the order of truth. Read literally,
> that voided `DESIGN_AUTHORITY.md` — which lives outside this archive — and promoted a
> July snapshot above the shipped `globals.css`. The real order is:
> **1. `src/app/globals.css` + `motion.css` (the implementation) · 2. `DESIGN_AUTHORITY.md`
> (the laws) · 3. everything in here (the record).**
> This archive is the *delivery*, frozen at its date. It is not the law.

# 50pick Design System — v1.1 · 2026-07-27

## What this is
The canonical, versioned archive of everything designed for **50pick.tz** (Tanzanian real-money prediction market: long-form "Markets" polls + the short-term "Up & Down" price rounds) as of 24 July 2026. It exists so that, years from now, someone with zero context can see exactly what 50pick looked like, why, and which parts were deliberate law versus one designer's improvisation.

**Supersedes:** v1.0 (2026-07-24). v1.1 adds the motion identity, The Needle and the
haptic vocabulary; nothing from v1.0 was removed or re-specified. It *contains* one superseded generation: the teal-hued concept kit (see 07-provenance/SUPERSEDED.md). Do not resurrect teal surfaces from kit-source without reading that file first.

## How to read this archive
1. **06-patterns-and-rules/** first — the laws. Everything else is an application of them.
2. **01-foundations/** — tokens.css is the single source of truth for every value; tokens.json is the same data machine-readable; the four .md files explain intent.
3. **02-components/** — one folder per component: `preview.html` (open in any browser, offline) + `spec.md` (exact values, token names, prop contract, GIVEN/INVENTED provenance).
4. **03-glyphs/** — every icon as SVG + contact-sheet.html.
5. **04-brand/** — mark, wordmark, lockup, never-do list.
6. **05-pages/** — every screen ever designed, as runnable HTML. Open the .dc.html files directly in a browser **keeping the folder intact** (they load ./support.js and ./theme/globals.css). See its README for the route map.
7. **08-motion/** — "The Settle": the motion language. Four curves, six duration tiers,
   the −14° signature axis. `motion.css` is drop-in beside globals.css.
8. **09-needle/** — The Needle: the persistent pause object. Engine, haptics, bare
   playground, and NEEDLE-SPEC.md (read §0 before touching its colour).
9. **10-haptics/** — the haptic vocabulary, standalone.
10. **11-material/** — ⭐ **the material system** (Claude Design, 2026-08-06): one lamp at −14°,
    five elevation rungs, one struck gold, glyph motion, and the win/loss asymmetry. **Delivered,
    NOT yet merged** — its `README.md` carries the merge map and what dies when each piece lands.
10. **07-provenance/** — where every fact came from, what was inferred, what was replaced, and what is still missing. **Read OPEN-GAPS.md before building anything new.**

## Authority — 🔴 SUPERSEDED 2026-08-08, corrected below

~~This archive is the final word on the 50pick theme as of its date.~~ It is the **delivery**,
frozen at its date. It was never the law, and its own `tokens.css` is a July snapshot that
has since drifted from the shipped stylesheet.

**The order of truth is:**
1. **`src/app/globals.css` + `src/app/motion.css`** — the implementation. Newest artifact;
   if anything disagrees with it, it wins.
2. **`docs/DESIGN_AUTHORITY.md`** — the laws, floors and thresholds. The only rulebook.
3. **Everything in this archive** — record: redlines, previews, provenance, reasoning.

~~Chat histories, memories, or older files outside this archive have no authority.~~
That sentence was the dangerous one: `DESIGN_AUTHORITY.md` lives *outside* this archive,
so read literally it voided the rulebook and promoted a dated snapshot above the shipped
code. A session that obeyed it would have pasted a canvas lightness, a `--text-faint`
that fails AA, and duration-bearing easing tokens into `globals.css`.

A future theme change supersedes **the rulebook's affected section** and the values in
`globals.css`; this archive is not re-opened (follow `07-provenance/SUPERSEDED.md` as the
model for recording what was replaced and why).

## Conventions used throughout
- **GIVEN** = handed to the design sessions by the team (kit specimens, globals.css, briefs) — authoritative.
- **INVENTED** = created in the June–July 2026 design sessions (Positions/P&L; Up & Down D1–D2) and flagged as new in the delivered specs.
- Exact values everywhere; token names where they exist. If a doc and tokens.css ever disagree, **tokens.css wins**.

## Offline note
No CDN, no webfonts: the Google Fonts import was removed from the archived tokens.css (documented inline). Text falls back to system faces; the live product loads Sora / Inter / JetBrains Mono — see 01-foundations/typography.md.

## Version
v1.1 · assembled 2026-07-27 · covers everything in v1.0 (given kit, Positions &
Performance, Up & Down D1–D2) plus the motion identity, The Needle and haptics.
D3–D5 of the Up & Down brief remain **not yet designed**.
