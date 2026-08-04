/**
 * RED harness for `npm run test:updown-bars`.
 *
 *   node scripts/updown-bars-red.mjs
 *
 * Each mutation is a way the dated reader could quietly settle the wrong money. Several are
 * the obvious "helpful" edit a future session would make — substituting the nearest bar when
 * the exact one is missing looks like robustness and is actually settling a holiday as a market.
 *
 * Rules: an unmatched anchor is a BROKEN HARNESS (CRLF has fooled three sessions), and "the
 * file changed" is not evidence — non-zero exit AND a named failure, or it is a MISS.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";

const FEED = new URL("../src/lib/server/updown-feed.ts", import.meta.url);

const MUTATIONS = [
  {
    name: "settle-on-the-CLOSE-instead-of-the-open — the price from the wrong end of the minute",
    from: `      price: Number(bar.open.toFixed(req.decimals)),`,
    to: `      price: Number(bar.close.toFixed(req.decimals)),`,
  },
  {
    name: "substitute-the-NEAREST-bar — a holiday settles as a market (looks like robustness)",
    from: `    if (idx < 0) {
      return {
        ok: false,
        reason: "no-bar",`,
    to: `    if (idx < 0 && bars.length > 0) {
      const bar2 = bars[bars.length - 1];
      return {
        ok: true, price: Number(bar2.open.toFixed(req.decimals)),
        quotedAt: new Date(Date.parse(bar2.datetime.replace(" ", "T") + "Z")).toISOString(),
        sourceUrl: url.origin + url.pathname, evidence: "x", rawHash: "x", provider: this.id,
      };
    }
    if (idx < 0) {
      return {
        ok: false,
        reason: "no-bar",`,
  },
  {
    name: "drop-timezone-UTC — E-71, gold silently ten hours out",
    from: `    url.searchParams.set("timezone", "UTC");`,
    to: `    // removed`,
  },
  {
    name: "remove-the-bad-print-guard — one bad tick pays the wrong side, reproducibly",
    from: `      if (jumpPct > TwelveDataBarFeed.MAX_JUMP_PCT) {`,
    to: `      if (false && jumpPct > TwelveDataBarFeed.MAX_JUMP_PCT) {`,
  },
  {
    name: "tighten-the-bound-to-0.1% — refuses real markets, voids rounds for nothing (E-25)",
    from: `  private static readonly MAX_JUMP_PCT = 2;`,
    to: `  private static readonly MAX_JUMP_PCT = 0.1;`,
  },
  {
    name: "hash-the-batch-body — a receipt nobody can re-derive",
    from: `      evidence: canonical,
      rawHash: hashRaw(canonical),`,
    to: `      evidence: body.slice(0, 500),
      rawHash: hashRaw(body),`,
  },
  {
    name: "leak-the-API-key-into-sourceUrl — a metered credential in the audit trail",
    from: `      sourceUrl: \`\${url.origin}\${url.pathname}?symbol=\${encodeURIComponent(req.symbol)}&interval=1min\`, // key NEVER stored`,
    to: `      sourceUrl: url.toString(),`,
  },
];

let caught = 0;
const missed = [];
const cwd = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");

// ⛔ NORMALISE LINE ENDINGS BEFORE MATCHING. `updown-feed.ts` is a tracked file with CRLF
// endings, so a multi-line anchor written with \n matches NOTHING — the file is rewritten
// unchanged and the run reports "defect not caught" as if the guard were weak. That exact trap
// has fooled three sessions of this campaign. Two of the seven mutations below hit it on the
// first run; the harness reported ANCHOR NOT FOUND rather than MISS, which is why it was
// visible at all. Restoration writes back the ORIGINAL bytes, not the normalised copy.
const lf = (s) => s.replace(/\r\n/g, "\n");

for (const m of MUTATIONS) {
  const originalRaw = readFileSync(FEED, "utf8");
  const original = lf(originalRaw);
  if (!original.includes(m.from)) {
    console.log(`  ✗ ${m.name}\n      ⛔ ANCHOR NOT FOUND — the harness is broken, not the guard.`);
    missed.push(`${m.name} (anchor missing)`);
    continue;
  }
  writeFileSync(FEED, original.replace(m.from, m.to));
  try {
    if (readFileSync(FEED, "utf8") === original) throw new Error("mutation did not land on disk");
    let exitCode = 0, out = "";
    try {
      out = execSync("npx tsx scripts/updown-bars.test.mts", { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    } catch (e) {
      exitCode = e.status ?? 1;
      out = `${e.stdout ?? ""}${e.stderr ?? ""}`;
    }
    const failed = Number(/(\d+) failed/.exec(out)?.[1] ?? 0);
    // A mutation that fails to COMPILE also counts: tsx exits non-zero and the defect never ships.
    const compileFail = exitCode !== 0 && failed === 0 && /error|Error/.test(out);
    if (exitCode !== 0 && (failed > 0 || compileFail)) {
      caught++;
      const why = failed > 0 ? `${failed} failed · ${(/✗ (.+)/.exec(out)?.[1] ?? "").slice(0, 88)}` : "rejected at compile time";
      console.log(`  ✓ RED  ${m.name}\n         → ${why}`);
    } else {
      missed.push(m.name);
      console.log(`  ✗ MISS ${m.name}\n         → exit ${exitCode}, ${failed} failed — the guard did NOT catch this`);
    }
  } finally {
    writeFileSync(FEED, original);
  }
}

console.log(`\nRED HARNESS — ${caught}/${MUTATIONS.length} caught`);
if (missed.length) { for (const m of missed) console.log(`  · ${m}`); process.exit(1); }
