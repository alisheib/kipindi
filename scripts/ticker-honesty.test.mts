/**
 * test:ticker-honesty — the live ticker states things that HAPPENED, or it states nothing.
 *
 * Origin. `src/lib/server/ticker-feed.ts` was a hardcoded twelve-item synthetic array rendered by
 * `app-shell` on EVERY page of a licensed real-money platform: "TZS 180K won on YES on Long rains
 * begin before 15 Apr · 5m ago", a TZS 2,400,000 Bitcoin settlement, "50pick reaches 1,000
 * predictions this week". Its own header called it *"realistic synthetic data that matches real
 * platform patterns."* Same class as the fabricated price history killed in `6b1975b`.
 *
 * ⭐ EVERY REFUSAL CHECK BELOW CARRIES A POSITIVE CONTROL IN THE SAME RUN. A check phrased as the
 * defect ("no unsettled row appears") passes trivially on an empty array, on a broken import, and
 * on a feature that has been deleted — so each one is paired with an assertion that the thing it
 * is refusing IS otherwise produced. Without the pair, "0 unsettled rows" and "0 rows" read
 * identically and the gate would go GREEN over a ticker that had stopped working entirely.
 *
 * Run: npm run test:ticker-honesty       RED proof: npm run red:ticker-honesty
 */
import { tickerEvents, TICKER_LIMIT, type TickerRow } from "../src/lib/markets/ticker.ts";
import { readFileSync } from "node:fs";

let pass = 0;
const fails: string[] = [];

function ok(cond: boolean, label: string, detail = "") {
  if (cond) { pass++; return; }
  fails.push(`${label}${detail ? ` — ${detail}` : ""}`);
}
function eq(actual: unknown, expected: unknown, label: string) {
  ok(JSON.stringify(actual) === JSON.stringify(expected), label, `got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)}`);
}

/**
 * Source with comments blanked — the corpus every structural assertion below reads.
 *
 * 🔴 THIS EXISTS BECAUSE TWO OF THIS GATE'S OWN ASSERTIONS WERE WRONG BEFORE THE PRODUCT WAS,
 * both in one sitting, and in OPPOSITE directions:
 *   · 8.2 asserted the dict declares no `tickerPredicted` key and went RED over a dict that no
 *     longer has it — the note recording the deletion NAMES it. A guard crying wolf.
 *   · 9.9 asserted `ratesFor(m)` appears, and passed on the DOC COMMENT saying so, over code
 *     that had been mutated to price the fee from live config. A vacuous check: it would have
 *     stayed green on the exact defect it is for, and `red:ticker-honesty` is what caught it.
 * A name written in an explanation is not a name anything executes. Read code, never prose.
 *
 * `readCode` returns the stripped source AND asserts the stripping did not erase the file, so an
 * over-reaching stripper cannot make every absence pass over nothing.
 */
function readCode(path: string, label: string): string {
  const raw = readFileSync(path, "utf8");
  const code = raw
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    // Not `https://` — a URL is code. Requires the slashes to follow whitespace or a line start.
    .replace(/(^|[\s({[,;])\/\/[^\n]*/g, "$1");
  ok(code.trim().length > raw.length * 0.15 && code.length > 200,
    `${label}-corpus comment-stripping left real code behind`, `${code.length} of ${raw.length} bytes`);
  return code;
}

const T0 = Date.parse("2026-08-13T09:00:00.000Z");
const row = (over: Partial<TickerRow> & { id: string }): TickerRow => ({
  settledAtMs: T0,
  outcome: "YES",
  amountTzs: 90_000,
  title: `Question ${over.id}`,
  ...over,
});

/* ══════════════ 1 · A ROW STILL INSIDE ITS OBJECTION WINDOW IS NOT AN EVENT ══════════════
   `status: RESOLVED` is the verdict; `settledAt` is when the money moved. A RESOLVED market with
   `settledAt: null` has an intact pool and every position still OPEN — it is the state a player
   objects FROM. Announcing it as settled, with a figure, states an outcome the platform has not
   finished standing behind. */
{
  const out = tickerEvents([
    row({ id: "m_unsettled", settledAtMs: null }),
    row({ id: "m_settled" }),
  ]);
  eq(out.map((e) => e.id), ["m_settled"], "1.1 a null settledAt is excluded");
  // ⭐ POSITIVE CONTROL — without this, 1.1 passes on an empty array and on a deleted feature.
  ok(out.length === 1, "1.1-control the settled sibling IS produced", `length=${out.length}`);

  // The adjacent shapes a plain `!= null` would let through.
  eq(tickerEvents([row({ id: "z", settledAtMs: 0 })]).length, 0, "1.2 a zero stamp is not a time");
  eq(tickerEvents([row({ id: "z", settledAtMs: NaN })]).length, 0, "1.3 NaN (Date.parse of junk) is excluded");
  eq(tickerEvents([row({ id: "z", settledAtMs: -1 })]).length, 0, "1.4 a negative stamp is excluded");
  // And the control for all three: the same row WITH a real stamp does appear.
  eq(tickerEvents([row({ id: "z" })]).length, 1, "1.5-control the same row with a real stamp appears");
}

/* ══════════════ 2 · A VOID CARRIES NO AMOUNT ══════════════
   On a void we keep nothing and every stake is refunded, so `netPool` does not describe what
   happened to anyone's money. Licence condition 4 / §C4: a refund is NEUTRAL, never an error. */
{
  // Deliberately passes a large amount: the module must DROP it, not merely fail to set it.
  const out = tickerEvents([row({ id: "m_void", outcome: "VOID", amountTzs: 500_000 })]);
  eq(out.length, 1, "2.1 a void IS an event (it happened)");
  eq(out[0].kind, "void", "2.2 a void gets its own kind");
  ok(out[0].amount === undefined, "2.3 a void carries NO amount", `amount=${String(out[0].amount)}`);
  ok(out[0].side === undefined, "2.4 a void names no winning side", `side=${String(out[0].side)}`);
  // ⭐ POSITIVE CONTROL — proves 2.3 is about VOID and not about amounts being broken everywhere.
  const paid = tickerEvents([row({ id: "m_yes", amountTzs: 500_000 })]);
  eq(paid[0].amount, 500_000, "2.3-control a YES settlement DOES carry its amount");
  eq(paid[0].side, "YES", "2.4-control a YES settlement DOES name its side");
}

/* ══════════════ 3 · AN EMPTY PLATFORM YIELDS AN EMPTY ARRAY ══════════════
   `LiveTicker` returns null on an empty list, so the strip stops existing rather than inventing
   a line to fill itself. A-5: nothing over a guess. */
{
  eq(tickerEvents([]), [], "3.1 no settlements -> no events");
  eq(tickerEvents([], 12), [], "3.2 still empty with an explicit limit");
  // ⭐ POSITIVE CONTROL — 3.1 passes on a function that returns [] unconditionally.
  ok(tickerEvents([row({ id: "one" })]).length === 1, "3.1-control one settlement -> one event");
}

/* ══════════════ 4 · THE OUTCOME IS READ, NEVER INFERRED (law 25) ══════════════ */
{
  eq(tickerEvents([row({ id: "m", outcome: null })]).length, 0, "4.1 an unrecorded outcome is DROPPED, not guessed");
  // A wrong side is a false statement about money; an absent event is recoverable.
  eq(tickerEvents([row({ id: "m", outcome: "MAYBE" as never })]).length, 0, "4.2 an unknown outcome value is dropped");
  eq(tickerEvents([row({ id: "m", outcome: "NO" })])[0].side, "NO", "4.3-control NO is carried through as NO");
}

/* ══════════════ 5 · ORDER IS `settledAt` DESC, AND TOTAL ══════════════
   Slicing a board-ordered list once pinned three July markets as "recent" on production. */
{
  const out = tickerEvents([
    row({ id: "old", settledAtMs: T0 - 86_400_000 }),
    row({ id: "newest", settledAtMs: T0 + 60_000 }),
    row({ id: "mid", settledAtMs: T0 }),
  ]);
  eq(out.map((e) => e.id), ["newest", "mid", "old"], "5.1 most recently settled first");

  // Equal stamps are ORDINARY here — many markets share one objectionsClosedAt deadline — so the
  // order must be total rather than left to sort stability.
  const tied = tickerEvents([row({ id: "b" }), row({ id: "a" }), row({ id: "c" })]);
  eq(tied.map((e) => e.id), ["a", "b", "c"], "5.2 equal stamps break by id, deterministically");
  const tiedAgain = tickerEvents([row({ id: "c" }), row({ id: "b" }), row({ id: "a" })]);
  eq(tiedAgain.map((e) => e.id), ["a", "b", "c"], "5.3 same set in another input order gives the same output");

  // And the input array is not mutated — the caller's rows are a memoised, shared value.
  const rows = [row({ id: "y", settledAtMs: T0 }), row({ id: "x", settledAtMs: T0 + 1 })];
  tickerEvents(rows);
  eq(rows.map((r) => r.id), ["y", "x"], "5.4 the caller's array is NOT sorted in place");
}

/* ══════════════ 6 · THE LIMIT HOLDS ══════════════ */
{
  const many = Array.from({ length: 40 }, (_, i) => row({ id: `m${String(i).padStart(2, "0")}`, settledAtMs: T0 + i }));
  eq(tickerEvents(many).length, TICKER_LIMIT, "6.1 the default limit caps the strip");
  eq(tickerEvents(many, 3).map((e) => e.id), ["m39", "m38", "m37"], "6.2 the limit keeps the NEWEST, not the first N of the input");
  eq(tickerEvents(many, 0).length, 0, "6.3 a zero limit yields nothing");
  eq(tickerEvents(many, -5).length, 0, "6.4 a negative limit cannot become a slice from the end");
}

/* ══════════════ 7 · A SETTLEMENT OF ZERO SHOWS NO FIGURE ══════════════
   §C2: a zero never stands in for an unknown, and a bare "TZS 0" on a live strip reads as a
   broken number rather than as a fact. */
{
  const out = tickerEvents([row({ id: "m", amountTzs: 0 })]);
  eq(out.length, 1, "7.1 the settlement is still an event");
  ok(out[0].amount === undefined, "7.2 but it carries no figure", `amount=${String(out[0].amount)}`);
  eq(tickerEvents([row({ id: "m", amountTzs: null })])[0].amount, undefined, "7.3 a null amount is absent, not 0");
  eq(tickerEvents([row({ id: "m", amountTzs: 1 })])[0].amount, 1, "7.4-control a positive amount IS carried");
  eq(tickerEvents([row({ id: "m", amountTzs: 90_000.6 })])[0].amount, 90_001, "7.5 amounts are whole shillings");
}

/* ══════════════ 8 · NO INDIVIDUAL BET CAN EVER REACH THE STRIP ══════════════
   "TZS 45K predicted YES on X · 2m ago" publishes one identifiable player's stake on every page.
   With 73 accounts on production that is not anonymous to anyone who knows them — PDPA, not a
   missing-data problem. This is a SOURCE contract: the kinds are a closed set of two, and the
   copy keys that could render a bet are gone from every locale. */
{
  const src = readCode("src/lib/markets/ticker.ts", "8.0");
  // ⛔ Control first: prove the file is still real code, so an absence cannot pass over nothing.
  ok(src.includes("export function tickerEvents"), "8.0-control ticker.ts is still the real module");
  // Statement position, not a mention: the union that TYPES the field.
  ok(/kind:\s*"settled"\s*\|\s*"void"/.test(src), "8.1 TickerEvent.kind is exactly settled|void — no bet kind exists");

  const dict = readCode("src/lib/i18n-dict.ts", "8.1a");
  for (const dead of ["tickerPredicted", "tickerWonOn"]) {
    ok(!new RegExp(`${dead}\\s*:`).test(dict), `8.2 the dict declares no "${dead}" key (it could only render a stake)`);
  }
  // Control: the keys the strip DOES use are declared in all three locales.
  for (const live of ["tickerSettled", "tickerOn", "tickerVoided"]) {
    const n = dict.split(`${live}:`).length - 1;
    ok(n === 3, `8.3-control "${live}" is declared in all three locales`, `found ${n}`);
  }
}

/* ══════════════ 9 · THE FEED DOES NOT ADD A SECOND UNBOUNDED SCAN ══════════════
   `listMarkets({status:"RESOLVED"})` takes no limit (1,987 rows on production) and the ticker is
   rendered by `app-shell` on EVERY page. Its own read would put a full scan behind every request
   on the site, so it must consume `getPlatformStats`, which already runs that scan behind a 60s
   memo — and which used to throw every row away to keep a `.length`. */
{
  const feed = readCode("src/lib/server/ticker-feed.ts", "9.0");
  ok(/export async function getTickerFeed/.test(feed), "9.0-control ticker-feed.ts is still the real module");
  ok(!/listMarkets\s*\(/.test(feed), "9.1 the feed calls listMarkets NOWHERE — no second scan");
  ok(/getPlatformStats\s*\(/.test(feed), "9.2 it reads the memoised getPlatformStats instead");
  // The synthetic array must not come back, in any renaming. Its tell was a hardcoded market
  // title in a data module — the same shape `test:history` bans for chart points.
  ok(!/marketTitle\s*:\s*"/.test(feed), "9.3 no hardcoded market title survives in the feed");
  ok(!/timeAgo/.test(feed), "9.4 `timeAgo` is gone — a baked relative time is stale on arrival");

  // And the title reaches the strip already localised, which is what makes the
  // Chinese-connectives-around-English-titles defect unrepresentable.
  ok(/pickLocalized\s*\(/.test(feed), "9.5 the market question is localised before it is rendered");

  const stats = readCode("src/lib/server/platform-stats.ts", "9.6");
  ok(/recentSettlements/.test(stats), "9.6-control getPlatformStats exposes the rows it used to discard");
  // The strip must key off settledAt, from the money side, not from the verdict.
  ok(/settledAtMs/.test(stats) && /m\.settledAt/.test(stats), "9.7 the rows carry settledAt, not just RESOLVED");
  // A VOID must not be given a netPool figure on the way out of the server module either — the
  // rule is enforced in TWO places on purpose, because this is the one that computes money.
  ok(/resolvedOutcome\s*!==\s*"YES"\s*&&\s*m\.resolvedOutcome\s*!==\s*"NO"\)\s*return null/.test(stats),
    "9.8 settledAmount returns null for anything that is not a YES/NO settlement");
  // ⭐ ASSERT THE VALUE THE CALL CARRIES, NOT THE SYMBOL. `poolFee(..., ratesFor(m), ...)` is the
  // whole rule: a bare `ratesFor(m)` anywhere in the file passed while the poolFee call had been
  // rewritten to `{}` (live config). `red:ticker-honesty` case 10 is the proof of this assertion.
  ok(/poolFee\s*\([^)]*ratesFor\s*\(\s*m\s*\)[^)]*\)/.test(stats),
    "9.9 the fee poolFee is GIVEN is the poll's FROZEN snapshot, never live config");
}

/* ══════════════ 10 · THE TYPE HAS EXACTLY ONE DECLARATION ══════════════
   It used to be declared twice — in `ticker-feed.ts` and in `live-ticker.tsx` — which is how a
   `timeAgo` field that nothing rendered survived in both copies (B9 / §0a). */
{
  const files = [
    "src/lib/markets/ticker.ts",
    "src/lib/server/ticker-feed.ts",
    "src/components/layout/live-ticker.tsx",
  ];
  const decls = files.filter((f, i) => /export type TickerEvent\s*=/.test(readCode(f, `10.1.${i}`)));
  eq(decls, ["src/lib/markets/ticker.ts"], "10.1 TickerEvent is declared once, in the pure module");

  const client = readCode("src/components/layout/live-ticker.tsx", "10.0");
  ok(client.includes('"use client"'), "10.0-control live-ticker is still a client component");
  // A VALUE import here would pull the server graph into a browser chunk — the failure that broke
  // the build when audit.ts dragged in node:async_hooks.
  ok(/import type \{[^}]*TickerEvent[^}]*\} from "@\/lib\/markets\/ticker"/.test(client),
    "10.2 the client imports the type with `import type` (erased at compile time)");
}

console.log(`ticker-honesty: ${pass} assertions passed`);
if (fails.length) {
  console.error(`\n${fails.length} FAILED:`);
  fails.forEach((f) => console.error("  ✗ " + f));
  process.exit(1);
}
console.log("all green");
