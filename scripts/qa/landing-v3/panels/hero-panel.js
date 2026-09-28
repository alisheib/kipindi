export const meta = {
  name: 'hero-frame-panel',
  description: 'Four-expert panel scores every real frame of the landing hero v3 1-10 (spec hero-v3 §11.6)',
  phases: [{ title: 'Panel', detail: 'UI/UX lead, graphic designer, gambling-industry marketer, accessibility/RG + compliance — each reads every PNG' }],
}

const A = args
const FRAME_LIST = A.frames.map((f) => `- ${A.dir}/${f}`).join('\n')

const COMMON = `You are one reviewer on a four-person panel that must rate the real, rendered first screen of a live money platform 1–10 per frame before it ships.

THE PRODUCT. 50pick (www.50pick.tz) is a licensed Tanzanian prediction market (pool-based YES/NO markets on real events); Swahili (sw) is the default locale, then en and zh. This unit is the landing page's HERO v3 (owner rulings R7, R8, R9): the claim "Tanzania's first licensed prediction market" / "Soko la kwanza la utabiri lenye leseni Tanzania" / "坦桑尼亚首家持牌预测市场" (R9: the owner's attestation + the Gaming Board licence-fee acknowledgement; "licensed" never dropped); the h1 is the question in the reader's language — "NDIO au HAPANA?" / "YES or NO?" / "是还是否？" (side words in the buttons' own inks); the lede "Chagua upande, weka dau. / Ukiwa sahihi, unalipwa."; the trust rows ABOVE the featured card (18+ · the Gaming Board licence line · the helpline tel: link; then "Weka na toa pesa kwa M-Pesa, Airtel Money, HaloPesa au Mixx by Yas" — the rails whose payout path is live); then the featured market card, the CTAs, and the sign-off "The wisdom of YES & NO." (the brand line, lang=en). The gambling-warning SENTENCE left the hero (R7(2)); the footer keeps it on every page. The 18+ badge is neutral ink site-wide (R7(5)). Locked fonts only (a display-face trial is the owner's later call).

READ FIRST (skim for what your rubric needs): the spec ${A.repo}/docs/design-system/v4-2026-09-26-landing-ten/specs/hero-v3.md (§2 first screen, §5 type/colour/spacing, §7 the 360 budget, §8 compliance, §11 verification and the panel); the rulings ${A.repo}/docs/design-system/v4-2026-09-26-landing-ten/INHERIT-MANIFEST.md rows R4, R7, R8, R9 and laws L6, L18, L21 (FINAL — do not score against them); the code if you need it: ${A.repo}/src/components/home/landing-hero.tsx and the .kp-hero rules in ${A.repo}/src/app/globals.css; the drive's measurements ${A.reports} (per frame: the featured card's YES/NO bottom = featuredActions.bottom, the claim rect, overflow, small text, clipping) and its served-HTML check ${A.served}; the landing gate's report ${A.gate}.

THE FRAMES — viewport tiles of the real local render (dark theme only), the page top unless noted. Folders: visitor = signed out; visitor740 = the delivery's own 360×740 first screen; player = signed in (demo0 zero balance, demo1 funded); states = 130% root text at 360 sw and focus/hover on the CTAs and the helpline. READ EVERY ONE with your Read tool:
${FRAME_LIST}

ALREADY DECIDED — do not deduct: the claim wording and the owner's "first" (R9); the h1 wording (R7(3)); no gambling-warning sentence in the hero (R7(2)); the header, bottom rail, LIVE strip and chat bubble (out of scope unless the hero collides with them); the featured market's content (seeded dev data — judge layout, not the market); the locked fonts.

HOW TO SCORE. Score every frame 1–10 from YOUR discipline only; 10 = nothing in this frame for you to fix. Any score below 10 MUST name a concrete defect you can SEE in that frame (or read in the measurements), where, and a concrete fix inside the kit (globals.css tokens, the type ladder, existing components, the laws). Taste without a concrete fix is not a deduction. Be exacting. If one defect spans many frames, list it on each (short) and once in crossFrame with the fix. Return through the StructuredOutput tool only.`

const RUBRICS = {
  'ui-ux-lead': `YOUR ROLE: UI/UX lead, reading as a Tanzanian first-time visitor on a mid-range Android. The spec's player test: in 3 seconds — what is it, what would you press, do you trust it; is anything foreign, cheap or scam-like; does anyone read "answer questions, get paid"? One focal point (the h1), a clear primary action, the trust rows reaching the first screen at 360×740 above the rail (K29/V21), the featured card's YES/NO reachable, the signed-in hero (the player's block replaces the CTAs), 130% text still usable, focus visible on every control.`,
  'graphic-designer': `YOUR ROLE: senior graphic / visual engineer. Hierarchy and the type roles (13 mono claim · 44–72 display h1 · 17–20 lede · 13 rows), weight contrast inside the h1 (800 sides vs 400 connective), tracking by size, the grouped rhythm (8/12/16/20), the claim lockup (wordmark + rule below 1280), the trust-row glyph column and hanging indents, wrap quality in all three scripts (no widows, "NDIO au / HAPANA?" breaking only between the groups), the budget as measured (featuredActions.bottom vs the rail at 360×740), nothing clipped, alignment and optical balance at 320/360/768/1024/1280.`,
  'gambling-industry-designer': `YOUR ROLE: gambling-industry marketer and product designer (East African sportsbooks and prediction markets). One idea per line; the product's own verbs ("Chagua upande, weka dau"); the name "50pick" on screen; the sign-off; does it look premium, licensed and trustworthy to a Tanzanian punter — "elite", not "basic" (the owner's word); YES/NO in the buttons' inks; the wallets a punter uses named; no chasing cue, no promised amount, no urgency beyond real ones; the featured card inviting a pick.`,
  'accessibility-rg': `YOUR ROLE: accessibility, responsible-gambling and compliance reviewer. Every line of spec §8 true on screen: "licensed" never dropped; "first" present only with its evidence (R9); "Ukiwa sahihi, unalipwa" literally true (a correct pick is never paid less than its stake; no amount, no multiplier — law 40, V16); the wallet names exactly the payout-live rails; 18+, the licence line and the helpline number on the first screen at 360×740 (K29); nothing "official / rasmi / 官方", no "not chance", no crowd claim. Accessibility: contrast (≥4.5 text, ≥3 marks), one lang attribute only on the English sign-off, heading order (one h1), the tel: link's accessible name and tap target (≥40px incl. its reach), focus visible (states/ frames), 130% text reflow without loss, sw/en/zh parity of meaning.`,
}

const SCHEMA = {
  type: 'object',
  properties: {
    reviewer: { type: 'string' },
    frames: { type: 'array', items: { type: 'object', properties: {
      frame: { type: 'string' }, score: { type: 'integer', minimum: 1, maximum: 10 },
      defects: { type: 'array', items: { type: 'object', properties: { what: { type: 'string' }, where: { type: 'string' }, fix: { type: 'string' } }, required: ['what', 'fix'] } },
    }, required: ['frame', 'score', 'defects'] } },
    crossFrame: { type: 'array', items: { type: 'object', properties: { what: { type: 'string' }, frames: { type: 'string' }, fix: { type: 'string' } }, required: ['what', 'fix'] } },
  },
  required: ['reviewer', 'frames', 'crossFrame'],
}

phase('Panel')
const results = await parallel(Object.entries(RUBRICS).map(([key, rubric]) => () =>
  agent(`${COMMON}\n\n${rubric}\n\nSet "reviewer" to "${key}".${A.round > 1 ? `\n\nThis is re-score round ${A.round}. What changed since the last round, and what was declined with its reason: ${A.prior} — verify each in the new frames yourself.` : ''}`,
    { label: `hero:${key}`, phase: 'Panel', schema: SCHEMA, effort: 'high' })))
const ok = results.filter(Boolean)
const byFrame = {}
for (const r of ok) for (const f of r.frames) {
  byFrame[f.frame] ??= { min: 10, by: {} }
  byFrame[f.frame].by[r.reviewer] = f.score
  byFrame[f.frame].min = Math.min(byFrame[f.frame].min, f.score)
}
const below = Object.entries(byFrame).filter(([, v]) => v.min < 10).map(([k]) => k)
log(`${ok.length}/4 reviewers; ${Object.keys(byFrame).length} frames; ${below.length} below 10`)
return { byFrame, below, results: ok }
