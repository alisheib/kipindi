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
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  DEFAULTS,
  DEFAULT_STATE,
  STATUS_IDS,
  countFor,
  filterRows,
  matchesStatus,
  type DiscoveryRow,
} from "../src/lib/markets/discovery.ts";
// The skeleton's own declaration of how many status pills it reserves space for. Imported, not
// re-typed, so §7 compares the real array against the real status list.
import { STATUS_PILL_W } from "../src/app/markets/loading.tsx";

/**
 * The status-id alternation used by §2's source scans, BUILT FROM `STATUS_IDS`.
 *
 * ⛔ It was a hand-typed `(open|today|new|watch|all)` until 2026-09-06. A hand-typed population
 * silently stops covering a new member: adding `progress` would have left two scans that read
 * as prohibitions on "a bare status literal" while being blind to the newest literal anyone
 * could type. A guard that chooses its own population cannot fail.
 */
const STATUS_ALT = STATUS_IDS.join("|");

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
    resolvesAtMs: NOW + 2 * DAY,
    selectionClosed: false,
    verdictRecorded: false,
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
  const bareStatusLiteral = new RegExp(`\\?\\?\\s*"(${STATUS_ALT})"`).test(src);
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
  const literalOmit = new RegExp(`!==\\s*"(${STATUS_ALT})"\\s*\\)`).test(src);
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

  // 🔴 THE LEAK, LIVE UNTIL 2026-09-06. `market-card.tsx` gates its NEW badge on its own
  // `live = status === "LIVE" && !selectionClosed`, so it never drew NEW on a shut market —
  // while this predicate happily filed one under New. The board and the card disagreed, which
  // is the exact thing the comment above promises they cannot do.
  check("a market with no pool and no predictors whose SELECTION HAS CLOSED is not New",
    !matchesStatus(row({ pool: 0, predictors: 0, selectionClosed: true }), "new", NOW),
    "the board would advertise a market that has stopped taking bets as somewhere to place the first one");
}

log("\n── 6 · the board carries the whole unsettled book ──────────────");
/**
 * ⭐ THE INVARIANT THE 2026-09-06 WIDENING RESTS ON, ASSERTED RATHER THAN ASSUMED.
 *
 * `getBoard` stopped filtering on `isClosedByTime`, so LIVE rows past their resolution clock now
 * reach the board. That is only safe because such a row can never land in `open` or `today` —
 * and that in turn holds only because `selectionClosedAt` is always EARLIER than `resolutionAt`
 * (`market-service.ts` computeSelectionClosedAt; the AI-poll editor enforces the same). If a
 * write path ever inverted them, a market nobody can bet on would appear on the default board
 * with a live YES/NO pair. So the property is pinned here instead of trusted.
 */
{
  const pastResolution = row({ selectionClosed: true, bettableUntilMs: NOW - 2 * DAY, resolvesAtMs: NOW - DAY });
  check("6.1 · a market past its resolution clock is NOT offered as open",
    !matchesStatus(pastResolution, "open", NOW),
    "the widened board would put an unbettable market under the default lens");
  check("6.2 · …nor under Closing today",
    !matchesStatus(pastResolution, "today", NOW));
  check("6.3 · …but it IS in progress — that is the whole reason the filter was removed",
    matchesStatus(pastResolution, "progress", NOW));
  check("6.4 · …and it is still inside the unsettled book",
    matchesStatus(pastResolution, "all", NOW));

  // The source-level half: the filter must stay gone, or the tab silently empties again.
  check("6.5 · ⛔ getBoard does not re-filter LIVE rows on isClosedByTime",
    !/live\.filter\(\s*\(m\)\s*=>\s*!isClosedByTime/.test(src),
    "restoring that filter hides every market whose result is overdue from every player surface");

  /**
   * ⛔ 6.6 / 6.7 — THE INVARIANT THE WIDENING RESTS ON, PINNED WHERE IT CAN ROT.
   *
   * Removing the `isClosedByTime` filter also removed a BACKSTOP. If a market could ever hold
   * `selectionClosedAt >= resolutionAt`, then `isSelectionClosed` would read false while the
   * resolution clock had passed — and the row would land in `open`, on the DEFAULT board, with
   * live YES/NO buttons on a market that cannot take a bet. The old filter caught that by
   * accident; nothing else does.
   *
   * Two things make it impossible, and neither lives in this file:
   *   · `createMarket` corrects any `selectionClosedAt` that is not strictly inside
   *     (now, resolutionAt) — every creation path funnels through it (admin, AI polls, events,
   *     player proposals).
   *   · Nothing MUTATES `resolutionAt` on an existing market outside `/api/dev-test/`, which is
   *     404 in production and blocked at the edge.
   * The second is a claim about a POPULATION, so it is measured rather than asserted in prose.
   */
  const svc = readFileSync(join(ROOT, "src/lib/server/market-service.ts"), "utf8");
  check("6.6 · createMarket refuses a selection close that is not strictly before resolution",
    /selMs <= nowMs \|\| selMs >= resMs/.test(svc),
    "without this correction an inverted pair would put an unbettable market under the default lens");

  {
    const files: string[] = [];
    (function walk(d: string) {
      for (const e of readdirSync(d)) {
        const full = join(d, e);
        if (statSync(full).isDirectory()) walk(full);
        else if (/\.(ts|tsx)$/.test(e)) files.push(full);
      }
    })(join(ROOT, "src"));
    /**
     * ⚠️ REVIEWED, WITH A REASON — and the reason is the difference between a POLL and a MARKET.
     * `ai-poll-generation.ts` assigns `poll.resolutionAt` / `sanitised.resolutionAt` on an AI
     * CANDIDATE, which is a draft row in a different table. A candidate becomes a market only by
     * being published through `createMarket`, which is where 6.6's correction runs — so these
     * assignments cannot produce an inverted pair on a `PredictionMarket`. ⛔ Kept as a named
     * exemption rather than by narrowing the regex to `m.` / `market.`, because a variable-name
     * regex would silently stop covering the next author who calls their local `row`.
     */
    const REVIEWED_NON_MARKET = new Map<string, string>([
      ["src/lib/server/ai-poll-generation.ts",
       "assigns on an AI poll CANDIDATE, not a PredictionMarket — publication goes through createMarket, where 6.6's correction runs"],
    ]);
    const mutators = files
      .map((f) => f.slice(join(ROOT, "src").length - 3).replace(/\\/g, "/"))
      .filter((rel) => !rel.includes("/api/dev-test/"))
      .filter((rel) => !REVIEWED_NON_MARKET.has(rel))
      .filter((rel) => /\.resolutionAt\s*=[^=]/.test(readFileSync(join(ROOT, rel), "utf8")));
    check("6.7 · ⛔ nothing outside dev-test mutates resolutionAt on an existing MARKET",
      mutators.length === 0,
      mutators.join(", ") || `0 — the pair can only be set at creation, where it is corrected (${REVIEWED_NON_MARKET.size} reviewed non-market writer)`);
    // ⭐ POSITIVE CONTROL. 6.7 is an ABSENCE over a walked population, which is the shape that
    // passes hardest when it is measuring nothing: an empty `files` array reports "0 mutators"
    // in exactly the words a clean tree does. So the population is asserted, and so is its
    // ability to still match — the dev-test writer it deliberately excludes must be findable.
    check("6.7b · ⭐ POSITIVE CONTROL · the walk found a real tree, and can still see a writer",
      files.length > 200
      && /\.resolutionAt\s*=[^=]/.test(readFileSync(join(ROOT, "src/app/api/dev-test/fast-forward-market/route.ts"), "utf8")),
      `${files.length} src files scanned`);
  }
}

log("\n── 7 · the skeleton is the right shape ─────────────────────────");
/**
 * 🔴 A SKELETON THAT LIES ABOUT THE PAGE IS WORSE THAN NO SKELETON — `markets/loading.tsx`'s own
 * header documents the 2026-08-10 measurement where it drew 220px cards against a real 349.4px.
 * The status strip has the same exposure one dimension along: its pill widths are a hand-typed
 * array, so shipping a sixth status leaves the first paint one pill short and then widens the
 * bar under the reader's eye. The widths must stay literal (they are per-label); the COUNT must
 * not. Caught here rather than by looking, because a missing pill is four pixels of shimmer.
 */
{
  check("7.1 · the skeleton draws exactly one status pill per status",
    STATUS_PILL_W.length === STATUS_IDS.length,
    `skeleton draws ${STATUS_PILL_W.length}, STATUS_IDS has ${STATUS_IDS.length}`);
  check("7.2 · …and every one of them has a real width",
    STATUS_PILL_W.every((w) => Number.isFinite(w) && w > 0),
    "a zero-width shimmer pill reserves no space at all");
}

log("\n────────────────────────────────────────────────────────────────");
log(`  BOARD DISCOVERY: ${fail === 0 ? "all checks passed" : `${fail} FAILED`}`);
log("────────────────────────────────────────────────────────────────");
process.exit(fail === 0 ? 0 : 1);
