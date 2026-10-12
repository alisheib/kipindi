/**
 * THE JOURNEY HOME ABOVE THE FOLD — its matrix, its cells table, its probe and its verdicts, defined ONCE and imported by
 * the drive (`qa:journey-above-fold`) and by the drive's own red control, so a gate and its proof cannot drift apart
 * (`live/clip.mjs`'s rule). The Vodacom plan S7: `docs/design-system/v5-2026-09-29-simplified-journey/S7-PLAN.md`
 * WP11 step 1 as amendment A5 amends it (VODACOM-PLAN §0h points 67 and 75: the budget measured on the product, every
 * GATED cell holding on main `daf0e799`).
 *
 * ── WHAT IS MEASURED ─────────────────────────────────────────────────────────────────────────────────────────────
 * The page a player will see after the flip: `/` for a reader holding a staff preview pass, with the preview marker
 * asserted present, its height recorded, and then hidden by a page-only style (A5 (a): figures with the marker on are
 * recorded, never gated). In every cell, from the page as drawn:
 *   R1 the How-to card is the first journey element in the main landmark;
 *   R2 the How-to card's bottom is at or above the rail's top (the journey tabs);
 *   R3 the bottom of card 1's picks is at or above the rail's top;
 *   R4 the headline is exactly two lines (below 1024 its rung holds two: VODACOM-PLAN §0h point 67).
 * ⭐ THE PASS RULE IS THE TABLE BELOW, NEVER A HARD-CODED EXEMPTION (A5 (b)): R1, R2 and R4 are gated in every cell; R3 is
 * gated in every cell with no transient bar and in the all-bars cells at 390×844, and RECORDED (measured and printed,
 * never passed or failed) in the all-bars cells at 360×640 and 360×740.
 * ⛔ INVALID IS NEVER A PASS: a cell whose rail is not on screen, or in which a bar its state expects is not visible, is
 * INVALID, and an INVALID cell fails the run as a FAIL does.
 *
 * ── THE MATRIX ───────────────────────────────────────────────────────────────────────────────────────────────────
 * 360×640 · 360×740 · 390×844 × sw · en · zh × a guest and the demo player × two bar states — `none` (no transient
 * bar) and `all` (the announcement, plus the session-ended notice for a guest or the away summary when signed in) — ×
 * two books: card 1 with its FULL title (S2's short titles are not approved on production, so a card reads its full
 * title, clamped to two lines) and card 1 with a SHORT title at the full budget (`SHORT_TITLE_MAX`, 100 / 100 / 50 code
 * points since Ali's ruling of 2026-10-10; never clamped). 72 cells.
 */

export const AF_VIEWPORTS = [
  { w: 360, h: 640 },
  { w: 360, h: 740 },
  { w: 390, h: 844 },
];
export const AF_LOCALES = ["sw", "en", "zh"];
export const AF_READERS = ["guest", "player"];
export const AF_BARS = ["none", "all"];
export const AF_BOOKS = ["full", "short"];

/** The selectors, each the product's own test id or class. */
export const SEL = {
  main: "#main-content",
  home: '[data-testid="journey-home"]',
  howto: '[data-testid="journey-howto-card"]',
  title: "h1.kp-jhome__title",
  card: '[data-testid="journey-card"]',
  picks: ".kp-jcard__picks",
  rail: '[data-testid="journey-tabs"]',
  header: 'header[data-testid="journey-top-bar"]',
  marker: '[data-testid="journey-preview-marker"]',
  away: '[data-testid="away-summary-bar"]',
  ended: '[data-testid="session-ended-notice"]',
};

/** The page-only style that hides the preview marker before a cell is measured (A5 (a)). */
export const HIDE_MARKER_CSS = `${SEL.marker} { display: none !important; }`;

/**
 * ⭐ THE CELLS TABLE (A5 (b)), mirrored in VODACOM-PLAN §0j: for a viewport and a bar state, whether card 1's picks are
 * GATED or RECORDED. R1, R2 and R4 are gated everywhere.
 */
export function picksKind({ w, h }, bars) {
  if (bars === "none") return "GATED";
  return w === 390 && h === 844 ? "GATED" : "RECORDED";
}
export const CELLS_TABLE = AF_VIEWPORTS.flatMap((vp) => AF_BARS.map((bars) => ({ viewport: `${vp.w}×${vp.h}`, bars, picks: picksKind(vp, bars) })));

/** The bars a cell's state expects to be visible: `all` raises the announcement and one reader's own bar. */
export function expectedBars(reader, bars) {
  if (bars === "none") return [];
  return reader === "guest" ? ["announcement", "ended"] : ["announcement", "away"];
}

/**
 * Runs IN THE PAGE: every figure the verdicts read, in viewport pixels. `announce` is the announcement's text (the bar
 * has no test id of its own: it is found by its words, inside the kit's notice bar). ⛔ A real function, never a string
 * (`live/clip.mjs` records what a string costs: E-191).
 */
export const PROBE = ({ sel, announce }) => {
  const r1 = (n) => Math.round(n * 10) / 10;
  const box = (el) => {
    if (!el) return null;
    const b = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    const shown = b.height > 0 && b.width > 0 && cs.display !== "none" && cs.visibility !== "hidden";
    return { top: r1(b.top), bottom: r1(b.bottom), h: r1(b.height), shown };
  };
  const main = document.querySelector(sel.main);
  const howtoEl = document.querySelector(sel.howto);
  // R1: the first element in main that carries a journey test id, in document order — skipping the ones that HOLD the
  // How-to card (the home's own root wraps everything it draws, so it is never "before" the card).
  const firstJourney = main ? [...main.querySelectorAll("[data-testid]")]
    .filter((e) => (e.getAttribute("data-testid") ?? "").startsWith("journey-"))
    .find((e) => e === howtoEl || !howtoEl || !e.contains(howtoEl)) : null;
  const title = document.querySelector(sel.title);
  let lines = null;
  if (title) {
    const lh = parseFloat(getComputedStyle(title).lineHeight);
    lines = Number.isFinite(lh) && lh > 0 ? Math.round(title.getBoundingClientRect().height / lh) : null;
  }
  const card = document.querySelector(sel.card);
  const picks = card ? card.querySelector(sel.picks) : null;
  const bars = {};
  bars.marker = box(document.querySelector(sel.marker));
  bars.away = box(document.querySelector(sel.away));
  bars.ended = box(document.querySelector(sel.ended));
  const notice = announce ? [...document.querySelectorAll('div[role="status"]')].find((e) => (e.textContent ?? "").includes(announce)) : null;
  bars.announcement = box(notice ?? null);
  return {
    first: firstJourney ? firstJourney.getAttribute("data-testid") : null,
    howto: box(howtoEl),
    title: title ? { ...box(title), lines } : null,
    picks: box(picks),
    card: box(card),
    rail: box(document.querySelector(sel.rail)),
    header: box(document.querySelector(sel.header)),
    bars,
    scrollY: window.scrollY,
  };
};

/**
 * One cell's verdict from its probe: `{ verdict, problems, invalid, figures }`. verdict is PASS, FAIL or INVALID; R3's
 * slack in a RECORDED cell is a figure, never a problem.
 */
export function judge(cell, m) {
  const invalid = [];
  const problems = [];
  if (!m) return { verdict: "INVALID", invalid: ["the page was not measured"], problems, figures: {} };
  if (!m.rail?.shown) invalid.push("the rail is not on screen");
  for (const bar of expectedBars(cell.reader, cell.bars)) if (!m.bars?.[bar]?.shown) invalid.push(`the ${bar} bar is not visible`);
  if (cell.bars === "none") for (const bar of ["announcement", "away", "ended"]) if (m.bars?.[bar]?.shown) invalid.push(`a transient bar (${bar}) is up in a no-bar cell`);
  if (m.bars?.marker?.shown) invalid.push("the preview marker was not hidden");
  const railTop = m.rail?.top ?? null;
  const slackHowto = railTop !== null && m.howto ? Math.round((railTop - m.howto.bottom) * 10) / 10 : null;
  const slackPicks = railTop !== null && m.picks ? Math.round((railTop - m.picks.bottom) * 10) / 10 : null;
  const figures = { railTop, howtoBottom: m.howto?.bottom ?? null, picksBottom: m.picks?.bottom ?? null, slackHowto, slackPicks, titleLines: m.title?.lines ?? null, picksKind: picksKind(cell.viewport, cell.bars) };
  if (m.first !== "journey-howto-card") problems.push(`R1 the first journey element in main is ${JSON.stringify(m.first)}, not the How-to card`);
  if (!m.howto?.shown) problems.push("R2 the How-to card is not drawn");
  else if (slackHowto !== null && slackHowto < 0) problems.push(`R2 the How-to card ends ${-slackHowto}px below the rail's top`);
  if (!m.picks?.shown) problems.push("R3 card 1's picks are not drawn");
  else if (figures.picksKind === "GATED" && slackPicks !== null && slackPicks < 0) problems.push(`R3 card 1's picks end ${-slackPicks}px below the rail's top`);
  if (m.title?.lines !== 2) problems.push(`R4 the headline is ${m.title?.lines ?? "no"} line(s), not two`);
  const verdict = invalid.length ? "INVALID" : problems.length ? "FAIL" : "PASS";
  return { verdict, invalid, problems, figures };
}

/**
 * ⭐ THE RED CONTROL (WP11 step 1 and A5 item 4): page-only plants — a style added to the page, never a repository file.
 * Each must turn ITS rule red (or make its cell INVALID) in the cell it is planted in, and a clean run of the same cell
 * must pass first, so a plant that "fails" a cell that was failing anyway proves nothing.
 *   · a 300px How-to card            — card 1's picks pushed past the rail (R3), at 360×640 with no bar;
 *   · card 1 pushed down 200px        — R3;
 *   · a How-to card pushed past the rail (a 700px card) — R2;
 *   · the headline set on one line    — R4;
 *   · a journey element before the How-to card — R1 (a page script inserts one at the top of the home);
 *   · the rail removed                — the cell is INVALID (never a pass);
 *   · the session-ended notice hidden in an all-bars guest cell — INVALID (A5 item 4).
 */
export const RED_PLANTS = [
  { name: "a 300px How-to card", cell: { vp: 0, locale: "sw", reader: "guest", bars: "none", book: "full" }, css: `${SEL.howto} { height: 300px !important; min-height: 300px !important; }`, want: /^R3 / },
  { name: "card 1 pushed down 200px", cell: { vp: 0, locale: "en", reader: "player", bars: "none", book: "full" }, css: `${SEL.card} { margin-top: 200px !important; }`, want: /^R3 / },
  { name: "the How-to card pushed past the rail (700px)", cell: { vp: 0, locale: "zh", reader: "guest", bars: "none", book: "full" }, css: `${SEL.howto} { height: 700px !important; min-height: 700px !important; }`, want: /^R2 / },
  { name: "the headline set on one line", cell: { vp: 2, locale: "sw", reader: "player", bars: "none", book: "full" }, css: `${SEL.title} { font-size: 10px !important; } ${SEL.title} br { display: none !important; }`, want: /^R4 / },
  { name: "a journey element drawn before the How-to card", cell: { vp: 2, locale: "en", reader: "guest", bars: "none", book: "full" }, script: true, want: /^R1 / },
  { name: "the rail removed", cell: { vp: 1, locale: "sw", reader: "guest", bars: "none", book: "full" }, css: `${SEL.rail} { display: none !important; }`, wantInvalid: /rail/ },
  { name: "the session-ended notice hidden (all bars, a guest)", cell: { vp: 2, locale: "sw", reader: "guest", bars: "all", book: "full" }, css: `${SEL.ended} { display: none !important; }`, wantInvalid: /ended/ },
];

/** The R1 plant's page script: a journey element inserted as the home's first child (runs IN THE PAGE). */
export const R1_PLANT = (sel) => {
  const home = document.querySelector(sel.home);
  if (!home) return false;
  const d = document.createElement("div");
  d.setAttribute("data-testid", "journey-planted");
  d.textContent = "planted";
  home.insertBefore(d, home.firstChild);
  return true;
};

/** Whether a plant's outcome is the one it must produce. */
export function plantCaught(plant, j) {
  if (plant.wantInvalid) return j.verdict === "INVALID" && j.invalid.some((x) => plant.wantInvalid.test(x));
  return j.verdict === "FAIL" && j.problems.some((x) => plant.want.test(x));
}
