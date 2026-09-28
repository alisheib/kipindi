export const meta = {
  name: 'band-frame-panel',
  description: 'Four-expert panel scores every real frame of the Up & Down band 1-10 (spec updown-band-v2 §15.8)',
  phases: [{ title: 'Panel', detail: 'UI/UX lead, graphic designer, gambling-industry designer, accessibility/RG — each reads every PNG' }],
}

const A = args
const STATE = {
  S8: "S8 · no live round — today's band, unchanged",
  S4: 'S4 · kick-off: the open confirmed, no read after it yet',
  S3: 'S3 · level: the newest read sits between the targets',
  S2: 'S2 · Down leads (newest read below the down target)',
  S1: 'S1 · Up leads (three reads 2 min apart: level tick, Down stem, Up stem + bead)',
  S5: 'S5 · aged: the Up read went stale while betting is still open — past tense, muted (Playwright clock)',
  S7: 'S7 · betting closed (Playwright clock): padlocked sides, the Watch link in the clock row, Play the next round',
  S7x: 'S7 after the deciding instant: the playhead parked on the flag',
  PAIR: 'the click-through pair at 360 sw — 1 = the band, 2 = the round page it lands on after tapping Juu',
  BACK: "after Back from the round page — the band's clock re-anchored",
  R5a: 'after the 60-second refresh brought a newer (Down) read in without a reload',
}
const describe = (file) => {
  const m = file.match(/^(S\d+x?|PAIR|BACK|R5a)-(.*)\.png$/)
  if (!m) return file
  return `${STATE[m[1]] ?? m[1]} — ${m[2].replace(/-b$/, ' (continued below)')}`
}
const FRAME_LIST = A.frames.map((file) => `- ${A.framesDir}/${file} — ${describe(file)}`).join('\n')

const COMMON = `You are one reviewer on a four-person panel that must rate a real, rendered UI band 1–10 per frame before it ships to a live money platform.

THE PRODUCT. 50pick (www.50pick.tz) is a licensed Tanzanian prediction market; Swahili (sw) is the default locale, then English (en) and Chinese (zh). The landing page has an "Up & Down" band for the fast game: a football-style scoreboard for ONE live round — who leads (Juu = Up, Chini = Down) from the newest CONFIRMED price read, dated ("saa 18:39"); the two bet links INSIDE the scoreboard (the teams are the buttons); one match timeline under it (a stem per confirmed read, the lock post where betting closes, the flag post where the price decides, the playhead); and a two-sentence rule. Owner's brief (ruling R5): "people don't really like these graphs … we need something more elite, more unique, more visually appealing", rated 10/10 by UI/UX + gambling-industry specialists on real frames.

READ FIRST (with your Read tool; skim for what your rubric needs, do not summarise them back):
- The design spec: ${A.repo}/docs/design-system/v4-2026-09-26-landing-ten/specs/updown-band-v2.md — §0 (the review history and conflicts C1–C13, which are SETTLED decisions), §1 (sketches of every state), §6 (CSS intent), §8 (states), §9 motion, §10 accessibility, §11 honesty ledger.
- The rulings: ${A.repo}/docs/design-system/v4-2026-09-26-landing-ten/INHERIT-MANIFEST.md rows R5, R8 and laws L5–L8, L12, L17 (these are FINAL; do not score against them).
- The shipped code, if you need to check a claim: ${A.repo}/src/components/home/updown-band.tsx, updown-match-*.tsx, ${A.repo}/src/components/charts/updown-match-track.tsx, and the band's CSS in ${A.repo}/src/app/globals.css (search ".kp-updown", ".kp-udbug", ".kp-udclock", ".kp-udtrack", ".kp-udrule").
- The measured figures for every frame: ${A.report} (per state → per cell: "figures" has card height "wrap.h", line counts, tap boxes, the detail's one-line need vs room, green-ink kinds, text under 13px, clipping; "breaches" lists what the numeric gate already flagged).
- Contrast audit output (WCAG pairs, worst stop of the panel gradient): ${A.contrast}

THE FRAMES — viewport tiles of the real local render (dark theme is the only theme), the band scrolled to just under the header. A "-b" tile continues the same frame below. READ EVERY ONE with your Read tool (they are PNG images) before scoring:
${FRAME_LIST}

ALREADY DECIDED — do not deduct for these:
- No pool, player count, payout, multiplier or absolute asset price on the band (R5(b), law 40, C4–C6). No source line (C5).
- The leader is NEVER lit: both bet buttons stay solid and equal whatever the score (L17, C1). The leader is told only by the verdict's words, arrow and ink.
- The band refreshes its confirmed read every 60 s while visible (R5(a)); nothing about a price animates.
- The chat bubble's position (bottom-right, over the page) is the owner's open call (V3) — out of scope. The header, bottom rail and other page sections are out of scope unless the band collides with them.
- The dev data: BTC is a simulated feed (~$2,896) and the round page (PAIR-2 frames) shows simulated prices — judge layout and wording, not the price level. The reads were planted two minutes apart, as the real confirmed grid spaces them.
- S6 ("Awaiting price") is not in the frames: the engine never opens a round without its open price (E-83), so it appears only on a failed store read; it is pinned by a unit guard.
- A blue focus ring in the S7 360-sw frame is the keyboard focus the band MOVED from the Up pick to the "Watch this round" link at close — intended, and itself under test.
- Settled copy decisions (C3 "Dau linafungwa baada ya", C7 "Ufunguzi" lane label, C8 the two tracked labels, C12 the kick-off verdict, C13 the closed state) stand; you may still flag a VISIBLE defect in how they render.

${A.note ? `ALREADY FIXED SINCE THESE FRAMES WERE CAPTURED (still score what you SEE; say "fixed since" in the defect if it is one of these): ${A.note}\n\n` : ''}HOW TO SCORE.
- Score every frame listed, 1–10, from YOUR discipline only. 10 = nothing in this frame for you to fix.
- Any score below 10 MUST name a concrete defect you can SEE in that frame (or read in its measured figures), where it is, and a concrete fix that stays inside the kit (globals.css tokens and type ladder, existing components, the laws above). Taste without a concrete, kit-consistent fix is not a deduction.
- Be exacting: this ships to real players and the owner asked for 10/10 from specialists. Look closely at alignment, rhythm, wrapping, truncation, balance, legibility of the track at 360, consistency across sw/en/zh, and whether each state reads correctly in three seconds.
- If the same defect appears in many frames, list it on each affected frame (short) and once in crossFrame with the fix.
Return your result through the StructuredOutput tool only.`

const RUBRICS = {
  'ui-ux-lead': `YOUR ROLE: UI/UX lead. Your rubric (spec §15.8): the 3-second read — verdict, clock and tap in one glance; one focal point; the clock on one line; no false affordance (nothing that is not a button looks like one); the flow from the band into the round page (PAIR frames: does the page the player lands on continue the band's answer?); the closed state's path forward (S7: is "play the next round" the obvious next step?); hierarchy and scannability at 360 first.`,
  'graphic-designer': `YOUR ROLE: senior graphic designer. Your rubric (spec §15.8): the glyph column and hanging indents (clock glyph, gutter arrows, the rule's flag all on one vertical); group rhythm (8px inside groups, 16px between below 768, 20px from 768); at most 4 type roles in the round panel; the colour budget (green marks in S1 ≤ 4 kinds: verdict, Up pick, newest stem + bead, earlier Up stems); concentric radii (plate 16 − 4px inset = buttons 12); wrap quality in all three scripts (sw, en, zh: no orphans, balanced breaks, nothing split mid-word or mid-number); track legibility at 360 (stems vs bead vs playhead vs tie tick distinguishable); optical centring and alignment everywhere.`,
  'gambling-industry-designer': `YOUR ROLE: gambling-industry product designer (East African sportsbooks — SportPesa, Betika, M-Bet, Meridian — and prediction markets like Polymarket/Kalshi). Your rubric (spec §15.8): Up left in green, Down right in rose; the selection lives in the match row (the scoreboard); timer placement and legibility; NO padlock while betting is open; padlocked inert sides when closed (the suspended-selection convention); a clear next-round path after close; NO chasing cue (no lit leader, no pulse, no urgency beyond the real countdown); dollars minimal; does it look premium and trustworthy to a Tanzanian football fan on a mid-range Android — "elite, unique, visually appealing", as the owner asked?`,
  'accessibility-rg': `YOUR ROLE: accessibility and responsible-gambling reviewer. Your rubric (spec §15.8): the contrast figures (${A.contrast}) — text ≥ 4.5:1, marks ≥ 3:1; screen-reader order (read updown-band.tsx / updown-match-live.tsx: eyebrow, h2, tagline, fixture, timer once, verdict, detail, Up then Down links, the track as one image with the timeline in words, the rule, the section link); timer semantics (role="timer", not live, read once); the focus move at close (S7); reduced motion; law 40 (no payout/estimate); no stale-as-live (every verdict dated; past tense once aged — S5); L17 (no pulse, no lit leader); the refund always stated (rule sentence 2, level note); sw/en/zh parity of meaning; tap targets ≥ 40px (buttons 48, links 44); the 12.5px sentence floor (13px used); colour never the only signal.`,
}

const SCHEMA = {
  type: 'object',
  properties: {
    reviewer: { type: 'string' },
    frames: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          frame: { type: 'string', description: 'the PNG file name exactly as listed' },
          score: { type: 'integer', minimum: 1, maximum: 10 },
          defects: {
            type: 'array',
            items: {
              type: 'object',
              properties: { what: { type: 'string' }, where: { type: 'string' }, fix: { type: 'string' } },
              required: ['what', 'fix'],
            },
          },
        },
        required: ['frame', 'score', 'defects'],
      },
    },
    crossFrame: {
      type: 'array',
      items: { type: 'object', properties: { what: { type: 'string' }, frames: { type: 'string' }, fix: { type: 'string' } }, required: ['what', 'fix'] },
    },
  },
  required: ['reviewer', 'frames', 'crossFrame'],
}

phase('Panel')
const results = await parallel(Object.entries(RUBRICS).map(([key, rubric]) => () =>
  agent(`${COMMON}\n\n${rubric}\n\nSet "reviewer" to "${key}".${A.round > 1 ? `\n\nThis is re-score round ${A.round}. The previous round's findings and what was changed for each are in ${A.prior} — check each fix in the new frames yourself; do not assume it worked.` : ''}`,
    { label: `panel:${key}`, phase: 'Panel', schema: SCHEMA, effort: 'high' })))

const ok = results.filter(Boolean)
const byFrame = {}
for (const r of ok) for (const f of r.frames) {
  byFrame[f.frame] ??= { min: 10, by: {} }
  byFrame[f.frame].by[r.reviewer] = f.score
  byFrame[f.frame].min = Math.min(byFrame[f.frame].min, f.score)
}
const below = Object.entries(byFrame).filter(([, v]) => v.min < 10).map(([k]) => k)
log(`${ok.length}/4 reviewers returned; ${Object.keys(byFrame).length} frames scored; ${below.length} below 10`)
return { reviewers: ok.length, byFrame, below, results: ok }
