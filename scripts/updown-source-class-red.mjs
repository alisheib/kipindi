/**
 * E-53 · RED HARNESS — reintroduce each way the vendor gets back onto a player surface.
 *
 *   node scripts/updown-source-class-red.mjs
 *
 * ⭐ `half-applied-proof` is not hypothetical: it is EXACTLY the state session 17 found and
 * deliberately reverted — `openSourceUrl` dropped, `closeSourceUrl` kept. It reads as done
 * and leaks from the close reading. A guard that misses it is worse than no guard, because
 * the tidy-looking half is what stops anyone re-checking.
 *
 * ⚠️ CRLF: an LF anchor silently fails to match a CRLF tree, the mutation never applies, and
 * the harness reports "defect not caught" as guard weakness. Every mutation matches both
 * line endings AND re-reads the file to confirm the anchor is gone from disk.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";

const BOARD = new URL("../src/lib/server/updown-board.ts", import.meta.url);
const CARD = new URL("../src/components/updown/updown-card.tsx", import.meta.url);
const PAGE = new URL("../src/app/updown/page.tsx", import.meta.url);
const DICT = new URL("../src/lib/i18n-dict.ts", import.meta.url);

const files = [BOARD, CARD, PAGE, DICT];
const originals = new Map(files.map((f) => [f, readFileSync(f, "utf8")]));
const restore = () => { for (const [f, s] of originals) writeFileSync(f, s); };

const MUTATIONS = [
  {
    name: "vendor-back-in-the-payload",
    why: "the board sends sourceDomain again — the leak is the PAYLOAD, not the render; View Source finds it whatever the UI shows",
    file: BOARD,
    from: "      iconKey: a.iconKey, decimals: a.decimals, sourceClass: publicSourceClassFor(a),\n      livePrice: live?.price ?? null, sourceQuotedAt: live?.quotedAt ?? null,\n      durations: [chain.durationMinutes],",
    to: "      iconKey: a.iconKey, decimals: a.decimals, sourceClass: publicSourceClassFor(a), sourceDomain: a.sourceDomain,\n      livePrice: live?.price ?? null, sourceQuotedAt: live?.quotedAt ?? null,\n      durations: [chain.durationMinutes],",
  },
  {
    name: "half-applied-proof",
    why: "closeSourceUrl comes back while openSourceUrl stays gone — session 17's actual half-applied state, which reads as finished and leaks from one reading",
    file: BOARD,
    from: "    openQuotedAt: string | null; openObservedAt: string | null;\n    closeQuotedAt: string | null; closeObservedAt: string | null;",
    to: "    openQuotedAt: string | null; openObservedAt: string | null;\n    closeSourceUrl: string | null; closeQuotedAt: string | null; closeObservedAt: string | null;",
  },
  {
    name: "card-prop-loosened-to-a-string",
    why: "sourceClass becomes a plain string again, so a domain can be passed without a compile error — the type IS the guard",
    file: CARD,
    from: "  sourceClass: PublicSourceClass;",
    to: "  sourceClass: string;",
  },
  {
    name: "one-builder-cleaned-and-one-not",
    why: "getRoundDetail keeps resolving the class while getBoard drifts back — the E-56 shape, where two copies of one decision disagree",
    file: BOARD,
    from: "        iconKey: a.iconKey, decimals: a.decimals, sourceClass: publicSourceClassFor(a),",
    to: "        iconKey: a.iconKey, decimals: a.decimals, sourceClass: \"generic\",",
  },
  {
    name: "chinese-copy-is-an-english-stub",
    why: "the ZH phrase is left as English — 94% of this platform's templates once shipped with no ZH, and a stub is invisible to anyone who reads English",
    file: DICT,
    from: '      udSourceCrypto: "加密货币实时行情", udSourceStock: "股票市场实时行情",',
    to: '      udSourceCrypto: "Live crypto market", udSourceStock: "股票市场实时行情",',
  },
];

let caught = 0;
const problems = [];

for (const m of MUTATIONS) {
  restore();
  const src = readFileSync(m.file, "utf8");
  const asCRLF = m.from.replace(/\n/g, "\r\n");
  const anchor = src.includes(m.from) ? m.from : src.includes(asCRLF) ? asCRLF : null;
  if (anchor === null) { problems.push(`${m.name} — HARNESS ERROR: anchor not found, mutation never applied`); continue; }

  writeFileSync(m.file, src.replace(anchor, anchor === asCRLF ? m.to.replace(/\n/g, "\r\n") : m.to));
  if (readFileSync(m.file, "utf8").includes(anchor)) {
    problems.push(`${m.name} — HARNESS ERROR: anchor still present after write`); continue;
  }

  let failed = false;
  try { execSync("npx tsx scripts/updown-source-class.test.mts", { cwd: new URL("..", import.meta.url), stdio: "pipe" }); }
  catch { failed = true; }

  if (failed) { caught++; console.log(`  ✓ RED  ${m.name} — ${m.why}`); }
  else problems.push(`${m.name} — GUARD DID NOT CATCH IT (${m.why})`);
}

restore();
console.log(`\ntree restored · ${caught}/${MUTATIONS.length} defects caught`);
if (problems.length) { for (const p of problems) console.error(`  ✗ ${p}`); process.exit(1); }
