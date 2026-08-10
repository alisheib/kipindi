/**
 * BOARD DISCOVERY GUARD — the page a player lands on must show the live book.
 *
 * The bug this exists to prevent (measured on production 2026-08-10):
 *
 *   `/markets` defaulted to `when="today"`, a 24-hour window. 50pick's inventory is
 *   long-dated and structurally always will be — of 40 live polls, **0 resolved
 *   within 24h, 2 within a week, 38 beyond it**. So the default board rendered
 *   ZERO cards, in a real browser, at 360/768/1280 × en/sw/zh — all nine
 *   combinations — directly beneath its own header reading "40 live · TZS 1,659k in
 *   play". The only content on the landing view was three RESOLVED markets.
 *
 *   Three separate mechanisms had been built to compensate (a featured treatment, a
 *   "just listed" section, a see-wider nudge) and none of them fixed it, because all
 *   three are downstream of the default. The see-wider nudge in particular requires
 *   `live.length > 0` — it is disabled exactly when the board is emptiest.
 *
 *   And "Recently resolved" showed the OLDEST results on the platform, permanently:
 *   `listBoard` orders `resolutionAt: "asc"` (correct for the LIVE board — soonest
 *   to close first) and the section sliced that same ascending list. Production
 *   offered three markets from 5 JULY as "recently resolved" while markets settled
 *   on 1-2 August sat further down the same array.
 *
 * THE PROPERTIES PINNED HERE (not the wording, not the literal):
 *   1. The default window is one with NO time cutoff. A player who has chosen
 *      nothing is never shown a subset of the live book chosen by a clock.
 *   2. The default lives in ONE place. Four sites hard-coded it independently — two
 *      readers and two href builders that omit the param when it equals the default
 *      — so changing three of four silently produces links that disagree with the
 *      page they point at.
 *   3. A "recent" section sorts by its own clock, descending. Never slice a
 *      board-ordered list and call the result recent.
 *
 * ⚠️ This is deliberately a SOURCE guard. The board is an async server component
 * that awaits the DAL, the search grammar, chart batches and comment counts; there
 * is no seam to call its filter logic directly, and a browser probe
 * (`npm run qa:poll-board`) proves the rendered result but needs a running server
 * and a populated board, so it cannot run in `test:all`. This asserts the invariant
 * that makes the rendered result possible.
 *
 * Run: npm run test:board-discovery     RED proof: npm run red:board-discovery
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const PAGE = join(ROOT, "src/app/markets/page.tsx");

let fail = 0;
const log = (m: string) => console.log(m);
function check(label: string, cond: boolean, detail = "") {
  if (cond) log(`  PASS ${label}`);
  else { log(`  FAIL ${label}${detail ? ` — ${detail}` : ""}`); fail++; }
}

const raw = readFileSync(PAGE, "utf8");
/** Strip comments — this file's own prose quotes the buggy forms on purpose. */
const src = raw.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

log("\n── 0 · the corpus is real ──────────────────────────────────────");
// ⛔ A guard that reads nothing prints PASS forever.
check("the board page was read", src.length > 4000, `${src.length} chars`);
check("it is the board (it builds the live grid)", /market-grid/.test(src));

log("\n── 1 · the landing board is not gated on a clock ───────────────");
const declMatch = src.match(/const\s+DEFAULT_WHEN\s*:\s*WhenFilter\s*=\s*"([a-z]+)"/);
check("DEFAULT_WHEN is declared once, as a named constant", !!declMatch,
  "the default window must be a single named constant, not a literal at each use site");

const defaultWhen = declMatch?.[1];
// Parse the cutoff table and require the default's cutoff to be null ("no cutoff").
// ⭐ This is the real property. It stays correct if the windows are renamed, if new
// ones are added, or if the default becomes some future "everything" key — and it
// fails the moment the landing view is pointed at a bounded window again.
const tableMatch = src.match(/WHEN_CUTOFFS\s*:\s*Record<WhenFilter,\s*number\s*\|\s*null>\s*=\s*\{([\s\S]*?)\}/);
check("the cutoff table is present", !!tableMatch);
if (tableMatch && defaultWhen) {
  const entries = Object.fromEntries(
    Array.from(tableMatch[1].matchAll(/(\w+)\s*:\s*([^,\n]+)/g)).map((m) => [m[1], m[2].trim()]),
  );
  const cutoff = entries[defaultWhen];
  check(`the default window ("${defaultWhen}") has a cutoff entry`, cutoff !== undefined);
  check(
    `the default window ("${defaultWhen}") applies NO time cutoff`,
    cutoff === "null",
    `it is \`${cutoff}\` — a player who chose nothing would be shown only part of the live book`,
  );
}

log("\n── 2 · one definition, not four ────────────────────────────────");
// Every site that reads the param or builds an href must go through the constant.
const usages = (src.match(/DEFAULT_WHEN/g) || []).length;
check("DEFAULT_WHEN is used at every site (>= 5: 1 decl + 2 readers + 2 builders)",
  usages >= 5, `found ${usages}`);
// A bare `?? "today"` on the WINDOW param is the shape that drifted.
// ⚠️ Scope this to `sp.when` and nothing else. A first cut matched any
// `?? "<window name>"` and flagged `sp.cat ?? "all"` twice — the CATEGORY default,
// which is entirely correct and shares the word "all". A guard that reports its own
// vocabulary collision as a product defect is measuring the list, not the product.
const whenReaders = Array.from(src.matchAll(/sp\.when[^;\n]{0,80}?\?\?\s*([A-Za-z_$"][\w$"]*)/g)).map((m) => m[1]);
check("every `when` reader was found", whenReaders.length >= 2, `found ${whenReaders.length}`);
const bareDefaults = whenReaders.filter((d) => d.startsWith('"'));
check("no `when` reader falls back to a bare literal", bareDefaults.length === 0,
  `found ${bareDefaults.join(", ")} — use DEFAULT_WHEN so every site moves together`);
// An href builder that omits the param must compare against the constant, never a literal.
const literalOmit = Array.from(src.matchAll(/!==\s*"(new|soon|today|week|all)"\s*\)\s*params\.set\(\s*"when"/g));
check("no href builder compares the window to a literal", literalOmit.length === 0,
  "an omit-if-default check pinned to a literal produces links that disagree with the page");

log("\n── 3 · a 'recent' section sorts by its own clock ───────────────");
// listBoard returns resolutionAt ASC. Slicing it for a "recent" section takes the
// OLDEST rows. Require an explicit descending re-sort before any slice.
const resolvedBlock = src.match(/const\s+resolvedAll\s*=[\s\S]{0,400}?;/);
check("the resolved teaser re-sorts before slicing", !!resolvedBlock,
  "expected a `resolvedAll` binding that sorts the RESOLVED rows before they are sliced");
if (resolvedBlock) {
  check(
    "it sorts resolutionAt DESCENDING (newest first)",
    /\.sort\(\s*\([a-z]+,\s*[a-z]+\)\s*=>\s*b\.resolutionAt\.localeCompare\(a\.resolutionAt\)\s*\)/.test(resolvedBlock[0]),
    "a `recently resolved` section that does not sort descending shows the oldest results on the platform",
  );
}

log("\n── 4 · 'just listed' means hidden BY THE WINDOW, not by the pager ──");
// Subtracting the current PAGE re-advertises page 2 under a "just listed" heading,
// directly beneath the pager that already leads there.
check(
  "the new-markets section subtracts the windowed set, not the page",
  /const\s+inWindow\s*=\s*new Set\(\s*live\.map/.test(src),
  "it should exclude markets already inside the active window (`live`), never the current page (`pagedLive`)",
);
check(
  "the page slice is not used to define 'new'",
  !/!shownIds\.has\(m\.id\)/.test(src),
  "`shownIds` is the current page — using it makes 'just listed' a duplicate of the pager",
);

log("\n────────────────────────────────────────────────────────────────");
log(`  BOARD DISCOVERY: ${fail === 0 ? "all checks passed" : `${fail} FAILED`}`);
log("────────────────────────────────────────────────────────────────");
process.exit(fail === 0 ? 0 : 1);
