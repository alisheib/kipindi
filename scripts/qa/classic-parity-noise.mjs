/**
 * Only live values may disappear from the classic parity capture.
 *
 * ⭐ THE /watchlist CARD'S MOMENT IS STEADIED BEFORE GEOMETRY, NEVER MASKED AFTER IT (MASWALI-BUILD S5-PARITY, 2026-10-21).
 * A seeded /watchlist card states its row's EAT moment ("14 Oct, 13:43": formatEatDateTime of the row's resolutionAt, so
 * the seeding moment of the server that drew it). Since U43 B4 (1384383fd) it is the card's top-row time
 * (`.mcardp-closes`, data-market-part="time", right-aligned by `margin-left: auto` and drawn only while the card takes
 * bets). The book's eat-dates reads its markup as `~date`, but Inter's digits are not tabular, so the label's width, its
 * x and its computed auto margin followed the moment's digits: main 4471bb44's null pair (two fresh servers, one commit,
 * 2026-10-21) differed in 12 of 569 layout lines in each of the four player /watchlist cells, the three open cards'
 * labels (e.g. 88.5px wide at x 321, margin-left 198.453px, against 91.5px at x 318, margin-left 195.25px) and the live
 * marks inside them. The harness now writes ONE canonical same-format moment (BOOK_WATCHLIST_DATE in
 * ../lib/question-time-mask.mjs, the question page's break-end-clock approach) into each label before any box is read,
 * so the text and the boxes are both the same on every server, and every real change in the row — its font, its
 * spacing (word-spacing included, which no signature records), its alignment, its live mark — still moves a box.
 * The compare-time geometry mask that stood here (steadyTimeLeftLayout, which read the label's x, width and auto margin
 * as "~" while its right edge held) is retired: it matched only the pre-U43 footer label (`.mcardp-timeleft`), so it
 * matched nothing the product draws now, and wherever it matched it hid a real change of the label's width.
 * classic-parity-noise.test.mjs holds both halves: the canonical moment gives two servers one row, and a real change of
 * the row is still seen; its --prove-red shows the retired forms each escape that guard.
 */

/** The open ticket's ring ticks every 15 seconds. Keep its accessible status words and ink. */
export const maskPositionCountdown = (html) => String(html).replace(
  /<svg\b(?=[^>]*\brole="img")(?=[^>]*\bclass="shrink-0")[^>]*>[\s\S]*?<\/svg>/g,
  (svg) => {
    if ([...svg.matchAll(/<circle\b/g)].length !== 2 || !/<circle\b[^>]*\bstroke-dashoffset="[^"]*"/.test(svg)
      || !/<text\b[^>]*>(?:\d+[dhm]|·)<\/text>/.test(svg)) return svg;
    return svg.replace(/\bstroke-dashoffset="[^"]*"/, 'stroke-dashoffset="~"')
      .replace(/(<text\b[^>]*>)(?:\d+[dhm]|·)(<\/text>)/, '$1~$2');
  },
);
