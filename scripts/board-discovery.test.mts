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
 *   1. The default board applies NO time cutoff. A player who has chosen nothing is
 *      never shown a subset of the live book chosen by a clock.
 *   2. The default lives in ONE place. Four sites hard-coded it independently — two
 *      readers and two href builders that omit the param when it equals the default
 *      — so changing three of four silently produces links that disagree with the
 *      page they point at.
 *   3. A "recent" section sorts by its own clock, descending. Never slice a
 *      board-ordered list and call the result recent.
 *   4. A count rendered beside a control names the set that control would show.
 *      The 2026-08-10 header was factually TRUE and the board was still a lie.
 *
 * ⚠️ REWRITTEN 2026-08-13, and the rewrite is the point. This used to be a SOURCE
 * guard that grepped `page.tsx` for `DEFAULT_WHEN`, the `WHEN_CUTOFFS` table and the
 * `sp.when` readers, because — in its own words — "there is no seam to call its
 * filter logic directly". The round-2 discovery work created that seam: the whole
 * contract now lives in the pure module `src/lib/markets/discovery.ts`. So properties
 * 1, 2 and 4 are asserted BEHAVIOURALLY here, against real rows, instead of by
 * matching the spelling of an implementation. That is strictly stronger: a rename
 * cannot fake it, and a refactor cannot break it without breaking the product.
 *
 * ⛔ The old anchors (`DEFAULT_WHEN`, `WHEN_CUTOFFS`, `sp.when`) are GONE from the
 * product, deliberately — the 5-window rail they belonged to was replaced by the
 * status segments. Do not "restore" them.
 *
 * Run: npm run test:board-discovery     RED proof: npm run red:board-discovery
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  DEFAULTS,
  DEFAULT_STATE,
  countFor,
  filterRows,
  matchesStatus,
  type DiscoveryRow,
} from "../src/lib/markets/discovery.ts";

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

const NOW = Date.parse("2026-08-13T12:00:00Z");
const DAY = 24 * 3600_000;
const noText = () => true;

function row(over: Partial<DiscoveryRow> = {}): DiscoveryRow {
  return {
    id: "m" + Math.random().toString(36).slice(2, 8),
    category: "sports",
    pool: 5_000,
    predictors: 3,
    yesPct: 50,
    move24h: 1,
    createdAtMs: NOW - DAY,
    bettableUntilMs: NOW + DAY,
    selectionClosed: false,
    status: "LIVE",
    watched: false,
    ...over,
  };
}

log("\n── 0 · the corpus is real ──────────────────────────────────────");
// ⛔ A guard that reads nothing prints PASS forever.
check("the board page was read", src.length > 4000, `${src.length} chars`);
check("it is the board (it builds the live grid)", /market-grid/.test(src));

log("\n── 1 · the landing board is not gated on a clock ───────────────");
/**
 * ⭐ THE REAL PROPERTY, ASSERTED AGAINST BEHAVIOUR.
 *
 * The production book is long-dated: 38 of 40 markets settled beyond a week. So the
 * question is not what the default is CALLED — it is whether a market closing far out
 * survives it. This builds exactly that book and requires the default board to keep it.
 */
{
  const longDated = [2, 9, 30, 180].map((d) => row({ bettableUntilMs: NOW + d * DAY }));
  const shown = filterRows(longDated, DEFAULT_STATE, NOW, noText);
  check(
    "the default board keeps a long-dated book (the 2026-08-10 shape)",
    shown.length === longDated.length,
    `${shown.length} of ${longDated.length} survived — a clock is narrowing the default view`,
  );

  // And the specific regression: the default must not BE the 24-hour window.
  const beyondToday = row({ bettableUntilMs: NOW + 30 * DAY });
  check(
    "a market settling in 30 days is on the default board",
    matchesStatus(beyondToday, DEFAULTS.status, NOW),
    `DEFAULTS.status = "${DEFAULTS.status}" excludes it`,
  );
  check(
    'the default is NOT the bounded "closing today" window',
    DEFAULTS.status !== "today",
    "a player who chose nothing would be shown only part of the live book",
  );
  // A bounded window must still EXIST — the fix was never to delete narrowing, only to
  // stop it being the default. If `today` stops narrowing, this gate is measuring nothing.
  check(
    "a bounded window still exists as a deliberate CHOICE",
    !matchesStatus(beyondToday, "today", NOW) && matchesStatus(row({ bettableUntilMs: NOW + 3600_000 }), "today", NOW),
    "`today` no longer narrows, so the default passing this test proves nothing",
  );
}

log("\n── 2 · one definition, not four ────────────────────────────────");
{
  // The page must not re-express a default it can import. Four sites once hard-coded the
  // window independently; changing three of four produced links that disagreed with the page.
  const bareStatusLiteral = /\?\?\s*"(open|today|new|watch|all)"/.test(src);
  check("the page does not fall back to a bare status literal", !bareStatusLiteral,
    'use DEFAULTS/parseDiscoveryParams so every site moves together');

  const handBuiltQuery = /params\.set\(\s*"(status|sort|odds|pool|topic)"/.test(src);
  check("the page does not hand-assemble the filter query string", !handBuiltQuery,
    "every href must come from buildDiscoveryHref — the page previously had four builders");

  check("the page parses its params through the shared contract",
    /parseDiscoveryParams\(/.test(src));
  check("the page builds its hrefs through the shared contract",
    /buildDiscoveryHref\(/.test(src));

  // Omitting a default from the URL must be decided by comparing against DEFAULTS, which is
  // the builder's job — so the page should never compare a status to a literal itself.
  const literalOmit = /!==\s*"(open|today|new|watch|all)"\s*\)/.test(src);
  check("no href builder compares the status to a literal", !literalOmit,
    "an omit-if-default check pinned to a literal produces links that disagree with the page");
}

log("\n── 3 · a 'recent' section sorts by its own clock ───────────────");
// listBoard returns resolutionAt ASC. Slicing it for a "recent" section takes the
// OLDEST rows. Require an explicit descending re-sort before any slice.
{
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
}

log("\n── 4 · a count names the set its control would show ────────────");
/**
 * The 2026-08-10 header said "40 live" and the grid held zero cards. The number was
 * FACTUALLY TRUE — it counted the census while the grid counted a filtered subset.
 * With a count now rendered beside every control, that gap must be structurally closed:
 * pressing a control must deliver exactly the number it promised.
 */
{
  const rows = [
    row({ category: "sports", pool: 30_000 }),
    row({ category: "sports", pool: 30_000 }),
    row({ category: "macro", pool: 1_000 }),
  ];
  const active = { ...DEFAULT_STATE, pool: "10k" as const };
  for (const topic of ["all", "sports", "macro"]) {
    const promised = countFor(rows, active, NOW, noText, { topic });
    const delivered = filterRows(rows, { ...active, topic }, NOW, noText).length;
    check(`topic=${topic}: promises ${promised}, delivers ${delivered}`, promised === delivered);
  }
  // The specific failure shape: a count computed over the census rather than the active filters.
  const macroPromised = countFor(rows, active, NOW, noText, { topic: "macro" });
  check("a count respects the OTHER active filters (census counting is the bug)",
    macroPromised === 0,
    `Macro promised ${macroPromised} while a 10k pool filter is pressed — that is the census, not the board`);
}

log("\n── 5 · 'New' follows the card, never a clock ───────────────────");
/**
 * The old board had a "just listed" section defined by the active WINDOW; the round-2 board
 * replaces it with a `New` status segment. The kit proposed "added in the last four days" —
 * a clock. ACCEPTANCE.md:109-110 overrides that: New follows `market-card.tsx`'s own rule, so
 * the board and the card can never disagree about which markets wear the badge.
 */
{
  const freshOld = row({ pool: 0, predictors: 0, createdAtMs: NOW - 400 * DAY });
  const busyNew = row({ pool: 50_000, predictors: 9, createdAtMs: NOW - 60_000 });
  check("a market with no pool and no predictors is New, however old the listing",
    matchesStatus(freshOld, "new", NOW));
  check("a market created minutes ago but already staked is NOT New",
    !matchesStatus(busyNew, "new", NOW),
    "New has drifted back to a clock — it must follow market-card.tsx");
}

log("\n────────────────────────────────────────────────────────────────");
log(`  BOARD DISCOVERY: ${fail === 0 ? "all checks passed" : `${fail} FAILED`}`);
log("────────────────────────────────────────────────────────────────");
process.exit(fail === 0 ? 0 : 1);
