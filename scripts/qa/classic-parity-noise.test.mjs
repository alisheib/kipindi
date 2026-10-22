/** Static red proof for the classic parity clock calibrations; no server or browser. */
import { createHash } from "node:crypto";
import { maskPositionCountdown } from "./classic-parity-noise.mjs";
import { BOOK_WATCHLIST_DATE, normaliseQuestionBreakClocks } from "../lib/question-time-mask.mjs";

const ring = (dash, value, label = "Selection closes") => `<svg role="img" aria-label="${label}" class="shrink-0"><circle></circle><circle stroke-dashoffset="${dash}"></circle><text>${value}</text></svg>`;
function clockGuard(mask) {
  return mask(ring(12.2, "3d")) === mask(ring(12.6, "2d"))
    && mask(ring(12.2, "3d")) !== mask(ring(12.6, "2d", "Selection closed"))
    && mask(ring(12.2, "3d")) !== mask(ring(12.2, "wrong"));
}

/**
 * The /watchlist card's time row as a capture records it (classic-parity-noise.mjs): the top-row label `.mcardp-closes`,
 * the live mark (6px) and a 4px gap before its words, pushed right by `margin-left: auto` in a row from x 120 to 331. Its
 * words are set in a proportional face, as Inter's digits are, so a "1" is narrower than a "4". The capture's line is
 * the label's box (rounded to half a pixel) and the id of its signature, the computed styles the harness records —
 * display, margin-left (the auto margin it computes), font-size and letter-spacing; never word-spacing, which PROPS
 * does not hold, so a word-spacing change shows only in the box.
 */
const ADVANCE = { 0: 7.1, 1: 4.6, 2: 6.4, 3: 6.6, 4: 7.0, 5: 6.5, 6: 6.7, 7: 6.0, 8: 6.8, 9: 6.7, " ": 3.3, ",": 2.9, ":": 2.9 };
const id = (s) => createHash("sha1").update(s).digest("hex").slice(0, 12);
const half = (n) => Math.round(n * 2) / 2;
const PATH = "main>div0>div0>section3>article6>div2>span0>span1";
function capture(moment, locale, before, { size = 13, wordSpacing = 0, right = true } = {}) {
  const leaf = { childNodes: [{ nodeType: 1 }, { nodeType: 3, nodeValue: moment }], childElementCount: 1 };
  before(leaf, locale);
  const words = leaf.childNodes.filter((n) => n.nodeType === 3).map((n) => n.nodeValue).join("");
  const width = half(6 + 4 + [...words].reduce((w, ch) => w + (ADVANCE[ch] ?? 7.4) * (size / 13) + (ch === " " ? wordSpacing : 0), 0));
  const x = right ? 331 - width : 120;
  const sig = `display:inline-flex\nmargin-left:${Math.round((x - 120) * 1000) / 1000}px\nfont-size:${size}px\nletter-spacing:normal`;
  return { line: `${PATH} ${x},990.5,${width}x17 ${id(sig)}`, store: { [id(sig)]: sig } };
}
/** What happens in the page before any box is read: the harness's canonical moment, BOOK_WATCHLIST_DATE. */
const canonical = (leaf, locale) => normaliseQuestionBreakClocks({ ...BOOK_WATCHLIST_DATE, locale }, [leaf]);
/** What --compare reads: the line as recorded, its signature resolved (ids are content hashes). */
const asRecorded = ({ line, store }) => `${line}\n${store[line.slice(line.lastIndexOf(" ") + 1)]}`;

function rowGuard(before, read) {
  return ["en", "sw"].every((locale) => {
    const month = locale === "sw" ? "Okt" : "Oct";
    const one = read(capture(`14 ${month}, 13:43`, locale, before));
    const servers = [`21 ${month}, 11:17`, `4 ${month}, 09:07`].every((m) => read(capture(m, locale, before)) === one);
    const real = [{ wordSpacing: 2 }, { right: false }, { size: 14 }]
      .every((change) => read(capture(`14 ${month}, 13:43`, locale, before, change)) !== one);
    return servers && real;
  });
}

if (!clockGuard(maskPositionCountdown)) throw new Error("the clock mask lost a numeric value or an accessible status");
if (!rowGuard(canonical, asRecorded)) throw new Error("the watchlist moment moved its row between servers, or a real change of its row was hidden");
if (process.argv.includes("--prove-red")) {
  // The retired forms: a mask that erased the whole accessible label; the watchlist moment masked only in the markup
  // (eat-dates), its box drawn from the raw moment; and that, read through the retired right-edge mask
  // (steadyTimeLeftLayout: the label's x, width and auto margin as "~" while its right edge holds).
  const oldClock = (s) => maskPositionCountdown(s).replace(/\baria-label="[^"]*"/, 'aria-label="~countdown"');
  const markupOnly = () => 0;
  const rightEdgeOnly = ({ line, store }) => {
    const [, path, x, y, width, height, sig] = /^(\S+) (-?[\d.]+),(-?[\d.]+),(-?[\d.]+)x(-?[\d.]+) ([0-9a-f]{12})$/.exec(line);
    return `${path} right:${Number(x) + Number(width)},${y},~x${height}\n${store[sig].replace(/^margin-left:-?[\d.]+px$/m, "margin-left:~")}`;
  };
  if (clockGuard(oldClock)) throw new Error("the old accessible-label mask escaped the guard");
  if (rowGuard(markupOnly, asRecorded)) throw new Error("the markup-only date mask escaped the guard");
  if (rowGuard(markupOnly, rightEdgeOnly)) throw new Error("the retired right-edge geometry mask escaped the guard");
  console.log("3/3 parity blind-spot plants caught");
} else console.log("clock value masked · accessible status kept · watchlist moment canonical before geometry · a real change of its row still seen");
