export const meta = {
  name: 'visual-critics-panel',
  description: 'Six professional visual critics review phone screenshots of 50pick; every claim is adversarially re-checked on the same frame',
  whenToUse: 'MOBILE-VISUAL-PLAN §3b baseline and the Seal re-run (§1a). Capture first: node scripts/live/mobile-visual-capture.mjs, then pass {shots: "<absolute frames dir>"}.',
  phases: [
    { title: 'Critique', detail: 'six critics, each with a distinct professional lens, read the actual frames' },
    { title: 'Verify', detail: 'an adversarial verifier re-opens each named frame: new, known, or refuted' },
    { title: 'Completeness', detail: 'what did the panel miss?' },
  ],
}

// ⛔ WHY THE VERDICT HAS THREE VALUES, NOT TWO. The first run of this panel (2026-09-16) gave verifiers
// upheld/refuted only. A verifier who opened the frame, saw the defect exactly as described, and knew it
// was already registered as D1, D2 or D3 had nowhere honest to put it — so it went into REFUTED, beside
// claims that were simply false. A "29 refuted" count therefore mixed "not true" with "true and known",
// and anyone reading the bucket and not the reasons would have dropped real, still-shipping defects.
// `known` is its own bucket now, and it carries the id it is known as.

const SHOTS = args && args.shots
if (!SHOTS) throw new Error('pass args.shots: the absolute directory scripts/live/mobile-visual-capture.mjs wrote')
const REPO = (args && args.repo) || 'F:/kipindi-main'
const PLAN = `${REPO}/docs/MOBILE-VISUAL-PLAN.md`

const SURFACES = `The frames are in ${SHOTS}, named <surface>__s<NN>.png where NN is the scroll position (s00 = top
of page; the highest NN of each surface is its last screen, where the footer is). Surfaces: home, markets,
detail (one market), updown, live, results, leaderboard, help, login. ${SHOTS}/index.json has the measured
geometry per surface: pinned chrome, document height in screens, horizontal overflow, card heights.
Images are captured at DPR 2, so ONE CSS PIXEL IS TWO IMAGE PIXELS — never quote an image measurement as CSS.`

const CONTEXT = `50pick is a live real-money prediction market in Tanzania (www.50pick.tz). Players are
overwhelmingly on phones. It is trilingual EN/SW/ZH with one dark theme, and SWAHILI IS THE DEFAULT — unless
the capture says otherwise, these frames are what a visitor who never chose a language sees.

The owner's brief: "we need perfection in every inch of the platform ... we want everyone to love it,
especially professional visual critics."

Before you open a frame, read in ${PLAN}: §8 (the defect register — every known defect with its D-id),
§8a (the phone design sheet — the aesthetic guardrails), the "OPEN OWNER ITEMS" list in §0 (things already
escalated to the owner), and §3b (what the previous panel found). Anything you report that is already
registered must carry its id in duplicateOf. The panel exists to find what the register does NOT hold.

⛔ OPEN THE IMAGES with the Read tool. A critique written from file names, index.json or source code is
discarded. Every finding names the one frame it is visible in and describes what is ON that frame.

⛔ SEPARATE TASTE FROM DEFECT honestly. A defect is broken, contradictory, unreadable or unreachable. Taste
is a preference someone could reasonably refuse. Both are welcome — say which, and never dress a preference
as a fault. Three real findings beat thirty plausible ones.`

const FINDING_SCHEMA = {
  type: 'object',
  properties: {
    overallRead: { type: 'string', description: 'Two or three sentences a professional would say to the client about this product through your lens. Specific and honest; praise where earned.' },
    scoreOutOf10: { type: 'number' },
    scoreJustification: { type: 'string', description: 'What holds the score where it is, and the single change that would move it most' },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          surface: { type: 'string' },
          frame: { type: 'string', description: 'the exact png filename it is visible in' },
          title: { type: 'string', description: 'one line: the claim itself' },
          whatIsVisible: { type: 'string', description: 'what is literally on the frame, checkable by someone opening the same file' },
          whyItMatters: { type: 'string' },
          fix: { type: 'string' },
          severity: { type: 'string', enum: ['high', 'medium', 'low'] },
          tasteOrDefect: { type: 'string', enum: ['defect', 'taste'] },
          duplicateOf: { type: 'string', description: 'a D-id from §8, or an owner item from §0, if already known; else empty' },
        },
        required: ['surface', 'frame', 'title', 'whatIsVisible', 'whyItMatters', 'fix', 'severity', 'tasteOrDefect', 'duplicateOf'],
      },
    },
  },
  required: ['overallRead', 'scoreOutOf10', 'scoreJustification', 'findings'],
}

const VERDICT_SCHEMA = {
  type: 'object',
  properties: {
    verdicts: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'the finding title, copied exactly' },
          verdict: { type: 'string', enum: ['new', 'known', 'refuted'], description: 'new = visible as described and not registered; known = visible as described AND already in §8 or §0; refuted = not visible, or visible but misdescribed so badly the claim fails' },
          knownAs: { type: 'string', description: 'for known: the D-id or owner item it already is; else empty' },
          reason: { type: 'string', description: 'what you saw when you opened the frame yourself' },
          correctedSeverity: { type: 'string', enum: ['high', 'medium', 'low'] },
          correctedKind: { type: 'string', enum: ['defect', 'taste'] },
        },
        required: ['title', 'verdict', 'knownAs', 'reason', 'correctedSeverity', 'correctedKind'],
      },
    },
  },
  required: ['verdicts'],
}

const CRITICS = [
  {
    key: 'art-direction',
    who: 'You are an art director who builds visual identities for consumer fintech and betting products, known for saying plainly when something looks assembled rather than designed.',
    look: 'Is this one designed product or a stack of components? Is there a signature a player would recognise with the logo cropped out? Where does the page spend its boldness, and does it spend it twice? Read home, board and footer as one sequence: does the identity survive to the bottom of a long page? Judge the brand marks, the gilt and accent economy, and whether decoration does any work.',
  },
  {
    key: 'typography',
    who: 'You are a typographer who sets editorial and financial interfaces, reading type at the level of ladder, weight, measure, rhythm and alignment.',
    look: 'Read the type as a system. A real hierarchy, or many sizes doing one job? Do the uppercase letter-spaced labels earn their frequency at 360? Line length and leading in Swahili, which runs 35-40% longer than English. Are figures tabular where they line up, and does money read as money? Find headings that outweigh their content and text set too tight or too loose against its neighbours.',
  },
  {
    key: 'colour-and-theme',
    who: 'You are a colour specialist for dark-theme interfaces who knows how quickly a dark UI turns muddy or into a lightshow.',
    look: 'Palette discipline: how many accents, and does each keep one meaning everywhere? Green/red for YES/NO and gold for money — honoured, or does a hue appear where it means nothing? Contrast of quiet text on its ground; anything important carried by colour alone. How surfaces separate — border, fill, shadow, radius — and whether elevation does consistent work.',
  },
  {
    key: 'layout-and-density',
    who: 'You are a layout critic who reviews mobile products for a living; your eye is calibrated to grid, optical alignment and spacing rhythm.',
    look: 'Players are split: some say sizing is good, others that it is chunky and big. Judge that frame by frame. Where does vertical space go — content, or padding and chrome? Are spacing steps a rhythm or ad hoc? Optical alignment down the left edge; repeated rows keeping the same internal geometry; items stretched over dead space; edges that nearly line up; anything crowding the screen edge. Use index.json for pinned chrome.',
  },
  {
    key: 'information-design',
    who: 'You are an information designer in the Tufte tradition, reviewing whether each screen answers the question its viewer arrived with.',
    look: 'For each surface name the question a player opens it to answer, and judge whether the first frame answers it. Does data or decoration lead? Do charts, bars, sparklines and the needle encode something true, with labels attached to what they label, and no false precision? Find repeated numbers that could disagree, figures with no unit or timeframe, statements a player cannot verify, and what is missing that a player needs.',
  },
  {
    key: 'swahili-reader',
    who: 'You are a bilingual Tanzanian product critic reviewing the Swahili experience as the DEFAULT one, not as a translation of an English original.',
    look: 'Read every string on screen. English left inside Swahili; translations that read as machine output; terms a Tanzanian bettor would not use; register too formal or too casual for money; one concept given two words. Where longer Swahili breaks a layout fitted to English — wraps, clipping, a control that fits one word but not the other. Say plainly which screens feel authored in Swahili and which merely rendered in it.',
  },
]

phase('Critique')

const results = await pipeline(
  CRITICS,
  (c) => agent(
    `${c.who}\n\n${CONTEXT}\n\n${SURFACES}\n\nYOUR LENS:\n${c.look}\n\n` +
    'Open EVERY frame of home, markets and detail, and every frame of at least two more surfaces. ' +
    'Report what you would put in front of a paying client. If a screen is genuinely good through your lens, say so in overallRead.',
    { label: `critic:${c.key}`, phase: 'Critique', schema: FINDING_SCHEMA, effort: 'high' },
  ),
  (review, c) => {
    if (!review || !review.findings || !review.findings.length) return review ? { critic: c.key, review, verdicts: [] } : null
    const list = review.findings
      .map((f, i) => `${i + 1}. [${f.severity}/${f.tasteOrDefect}] "${f.title}" — frame ${f.frame} — claims: ${f.whatIsVisible}`)
      .join('\n')
    return agent(
      `You are an adversarial reviewer. A ${c.key} critic made these claims about phone screenshots of 50pick. ` +
      `Your job is to test them, not to agree.\n\n${list}\n\nThe frames are in ${SHOTS}. OPEN EACH NAMED FRAME YOURSELF. ` +
      'For each claim: is the thing described actually visible in THAT file, and is the description accurate or embellished? ' +
      'The images are DPR 2, so a critic quoting image pixels as CSS pixels has doubled their number. ' +
      `Then check ${PLAN} §8 and the §0 OPEN OWNER ITEMS: if it is visible as described AND already registered, the verdict is ` +
      '"known" with its id — NOT "refuted". "refuted" is only for claims that are not visible or are wrong. ' +
      'When unsure whether something is visible, refute it. Correct severity and the defect/taste call where overstated.',
      { label: `verify:${c.key}`, phase: 'Verify', schema: VERDICT_SCHEMA, effort: 'high' },
    ).then((v) => ({ critic: c.key, review, verdicts: v ? v.verdicts : [] }))
  },
)

const panels = results.filter(Boolean)
const dropped = CRITICS.length - panels.length
if (dropped) log(`⚠️ ${dropped} critic(s) returned nothing — the panel is incomplete and its scores must not be compared with a full run`)

phase('Completeness')

const summary = panels.map((p) => {
  const kept = p.verdicts.filter((v) => v.verdict !== 'refuted').map((v) => `${v.title}${v.verdict === 'known' ? ` (known: ${v.knownAs})` : ''}`)
  return `### ${p.critic} — ${p.review.scoreOutOf10}/10\n${p.review.overallRead}\nSURVIVED: ${kept.join(' | ') || '(none)'}`
}).join('\n\n')

const gaps = await agent(
  `Six professional critics reviewed the same phone screenshots of 50pick (in ${SHOTS}). Their conclusions:\n\n${summary}\n\n` +
  `You are the completeness critic. Read ${PLAN} §8 and §0 first, then open the frames yourself and answer one question: WHAT DID ` +
  'THIS PANEL MISS? Consider lenses nobody ran (iconography, the empty and edge states visible here, footer and legal furniture, ' +
  'form design, what the product looks like to someone who has never bet), the surfaces that got least attention, and any claim ' +
  'above that looks wrong. Report only things you saw in a named frame, and mark duplicateOf for anything already registered.',
  { label: 'completeness', phase: 'Completeness', schema: FINDING_SCHEMA, effort: 'high' },
)

return {
  shots: SHOTS,
  critics: CRITICS.length,
  critiquesReturned: panels.length,
  panels: panels.map((p) => ({
    critic: p.critic, score: p.review.scoreOutOf10, justification: p.review.scoreJustification,
    overallRead: p.review.overallRead, findings: p.review.findings, verdicts: p.verdicts,
  })),
  completeness: gaps,
}
