/**
 * Drives the REAL /markets board over HTTP and asserts, for every control on the discovery
 * bar, that the count it promises is the count you get when you press it.
 *
 * A unit test proves the contract module is self-consistent. This proves the PAGE is — that
 * the counts rendered next to the controls were computed over the same set the grid draws,
 * through the real server, the real store and the real search grammar.
 *
 * Run: npm run qa:discovery-probe -- [baseUrl]        (default http://localhost:3009)
 *      npm run qa:discovery-probe -- https://50pick.tz   — read-only, safe against production
 */
const BASE = process.argv[2] || "http://localhost:3009";

let fail = 0;
const ok = (label, cond, detail = "") => {
  if (cond) console.log(`  PASS ${label}`);
  else { console.log(`  FAIL ${label}${detail ? ` — ${detail}` : ""}`); fail++; }
};

async function board(qs = "") {
  const url = `${BASE}/markets${qs}`;
  const res = await fetch(url);
  const html = await res.text();
  const resultCount = Number((html.match(/data-result-count="(\d+)"/) || [])[1] ?? NaN);
  // Promised counts, keyed "axis:value".
  const promised = {};
  for (const m of html.matchAll(/data-chip="([^"]+)"\s+data-count="(\d+)"/g)) promised[m[1]] = Number(m[2]);
  /**
   * ⛔ CARD COUNTING DOES NOT LIVE HERE ANY MORE — see `scripts/live-discovery-board.mjs` (npm run qa:discovery-board).
   *
   * Three attempts failed, each for its own reason, and the third is the one that matters:
   *   · counting every `mcardp-q` also counted the 3-card "recently resolved" strip → 15 of
   *     40 on production. It passed LOCALLY only because the in-memory store holds ZERO
   *     resolved markets, so the strip it should have excluded never rendered at all.
   *   · taking the first `.market-grid` picked up a streamed Suspense SKELETON (production
   *     HTML carries four such blocks; three are fallbacks).
   *   · slicing between `data-board="grid"` and the next grid read 6 — because React STREAMS
   *     Suspense content, so the byte order of the response is not the DOM order. Of the 15
   *     questions on the page, 6 bytes-land before the resolved strip and 9 after it.
   *
   * A regex over a streamed response cannot answer "what does the grid render". A browser
   * can. This driver keeps only the assertions that read ATTRIBUTES, which are position-
   * independent and therefore safe.
   */
  const cards = null;
  const hasPager = /aria-label="Next page"/.test(html);
  return { status: res.status, url, resultCount, promised, cards, hasPager, html };
}

console.log(`\ndriving ${BASE}/markets\n`);

const home = await board();
ok("board renders 200", home.status === 200, String(home.status));
ok("the bar exposes a result count", Number.isFinite(home.resultCount), String(home.resultCount));
ok("the bar exposes per-control counts", Object.keys(home.promised).length > 0,
  JSON.stringify(Object.keys(home.promised)));

console.log(`\n  default board: ${home.resultCount} results, ${home.cards} cards drawn`);
console.log(`  promised: ${JSON.stringify(home.promised)}\n`);

// ── every control: what it promises is what it delivers ────────────────────────
console.log("── promise == delivery, control by control ──");
for (const [key, promisedN] of Object.entries(home.promised)) {
  const [axis, value] = key.split(":");
  const got = await board(`?${axis}=${encodeURIComponent(value)}`);
  ok(`${axis}=${value} promised ${promisedN}, delivered ${got.resultCount}`,
    got.resultCount === promisedN, got.url);
}

// ── the pager total IS the bar's count (the kit's no-drift contract) ───────────
console.log("\n── pager total is the bar count ──");
{
  const PAGE = 12;
  ok("a pager renders exactly when the set exceeds one page",
    home.hasPager === home.resultCount > PAGE, `hasPager=${home.hasPager} count=${home.resultCount}`);
  console.log("  (grid card counts are asserted in a real browser — see scripts/live-discovery-board.mjs)");
}

// ── cross-filtering: a count must respect the OTHER active filters ─────────────
console.log("\n── counts are cross-filtered, not census figures ──");
{
  const filtered = await board("?pool=10k");
  for (const [key, promisedN] of Object.entries(filtered.promised)) {
    const [axis, value] = key.split(":");
    if (axis === "pool") continue; // pressing pool replaces the active pool filter
    const got = await board(`?pool=10k&${axis}=${encodeURIComponent(value)}`);
    ok(`with pool=10k active, ${axis}=${value} promised ${promisedN} → ${got.resultCount}`,
      got.resultCount === promisedN, got.url);
  }
}

// ── a clean board has a clean URL; defaults are not written ────────────────────
console.log("\n── URL hygiene ──");
{
  const explicit = await board("?status=open&sort=closing&odds=any&pool=any&topic=all");
  ok("writing every default explicitly gives the same board as no params",
    explicit.resultCount === home.resultCount, `${explicit.resultCount} vs ${home.resultCount}`);
  const junk = await board("?status=banana&sort=..%2Fetc&odds=9&pool=x&topic=politics");
  ok("a hand-edited URL still renders a board (never a 500)", junk.status === 200, String(junk.status));
  ok("junk params fall back to the default board", junk.resultCount === home.resultCount,
    `${junk.resultCount} vs ${home.resultCount}`);
}

// ── sorting actually reorders, and absent values sink in BOTH directions ───────
console.log("\n── sorting ──");
{
  const firstTitle = (html) => (html.match(/<h3 class="mcardp-q">([^<]{4,90})/) || [])[1]?.trim();
  /**
   * ⚠️ THIS ASSERTION STATES ITS OWN PRECONDITION, because it was once green for the wrong
   * reason. Comparing `sort=closing` against `sort=pool` passes only while the fixture holds
   * markets with DIFFERENT pools. On a freshly seeded board every pool is 0, so `pool` ties
   * everywhere and falls to its documented tie-break — `bettableUntil` ascending — which IS
   * the closing order. Identical lead cards, entirely correctly.
   *
   * So: gather the lead card across all six sorts and require that at least two of them
   * disagree. That holds on any non-trivial board, and when it does not, the reason is
   * reported rather than dressed up as a product failure.
   */
  const leads = {};
  for (const s of ["closing", "pool", "people", "close", "move", "new"]) {
    leads[s] = firstTitle((await board(`?sort=${s}`)).html);
  }
  const distinct = new Set(Object.values(leads).filter(Boolean));
  ok(`sorting reorders the board (${distinct.size} distinct lead cards across 6 sorts)`,
    distinct.size > 1,
    `every sort led with the same card — ${JSON.stringify(leads)}. If every pool is 0 and every ` +
    `predictor count equal, that is arithmetically correct, not a defect: seed real stakes first.`);
  for (const dir of ["asc", "desc"]) {
    const moved = await board(`?sort=move&dir=${dir}`);
    ok(`sort=move dir=${dir} renders (absent move24h must not crash or vanish rows)`,
      moved.status === 200 && moved.resultCount === home.resultCount,
      `${moved.status} count=${moved.resultCount} vs ${home.resultCount}`);
  }
}

// ── empty states: an offered exit must never lead to another empty board ───────
console.log("\n── empty states ──");
{
  const empty = await board("?q=zzzzzznotarealmarketzzzzz");
  ok("a search that matches nothing yields 0 results", empty.resultCount === 0, String(empty.resultCount));
  ok("the empty board still returns 200", empty.status === 200, String(empty.status));
  // Every exit rendered in the empty state carries a count; each must be > 0.
  const exitCounts = [...empty.html.matchAll(/tabular-nums opacity-80">(\d+)</g)].map((m) => Number(m[1]));
  ok("every exit offered from an empty board leads somewhere non-empty",
    exitCounts.every((n) => n > 0), JSON.stringify(exitCounts));
}

console.log(fail === 0 ? `\n✅ the board delivers what it promises` : `\n❌ ${fail} failure(s)`);
process.exit(fail === 0 ? 0 : 1);
