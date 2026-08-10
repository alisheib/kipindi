/**
 * RED harness for `test:market-result-announce` (DA-5 / E-115).
 *
 * Each mutation restores ONE of the four defects the atom closed, plus the two ways the
 * fix itself could be undone quietly. Every one must make the suite EXIT NON-ZERO **and**
 * fail the NAMED check — "the file changed" is not a pass, and neither is "something went
 * red", because a mutation that trips an unrelated assertion proves nothing about the one
 * it was written for.
 *
 * ⛔ Money-display code. The tree is shared: every file is restored in `finally` and the
 * restore is verified byte-for-byte before exit.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";

const REPO = process.env.KP_REPO || process.cwd();
const POLLER = `${REPO}/src/components/markets/notify-poller.tsx`;
const ROUTE = `${REPO}/src/app/api/positions/settled/route.ts`;
const DIAL = `${REPO}/src/components/markets/conviction-dial.tsx`;

const ORIG = {
  [POLLER]: readFileSync(POLLER, "utf8"),
  [ROUTE]: readFileSync(ROUTE, "utf8"),
  [DIAL]: readFileSync(DIAL, "utf8"),
};

let pass = 0, fail = 0;
const check = (n, ok, d = "") => { console.log(`  ${ok ? "ok  " : "FAIL"} ${n}${d ? ` — ${d}` : ""}`); ok ? pass++ : fail++; };

const run = () => {
  try {
    const out = execSync("npm run test:market-result-announce", { cwd: REPO, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    return { code: 0, out };
  } catch (e) { return { code: e.status ?? 1, out: `${e.stdout ?? ""}${e.stderr ?? ""}` }; }
};

/** `from` may be a RegExp — it MUST be wherever the target spans a line break, because
 *  these files are CRLF here and a literal "\n" would silently match nothing. */
function mutate(label, file, from, to, mustFail) {
  const src = ORIG[file];
  const found = typeof from === "string" ? src.includes(from) : from.test(src);
  if (!found) { check(`${label} — target located`, false, String(from).slice(0, 70)); return; }
  writeFileSync(file, src.replace(from, to));
  const r = run();
  writeFileSync(file, src);
  check(`${label} → EXITS NON-ZERO`, r.code !== 0, `exit ${r.code}`);
  const line = r.out.split("\n").find((l) => l.trim().startsWith("FAIL") && l.includes(mustFail));
  check(`${label} → and it is ${mustFail} that fails`, Boolean(line), line ? line.trim().slice(0, 88) : `no FAIL line mentioning "${mustFail}"`);
}

console.log("\nRED HARNESS — DA-5 / E-115, the market result announcement\n");

try {
  const base = run();
  check("baseline: clean tree is GREEN", base.code === 0, `exit ${base.code}`);

  // ① the original defect: headline a place-time projection again
  mutate("headline a place-time projection instead of the row", POLLER,
    /amount: p\.payout,/, 'amount: JSON.parse(localStorage.getItem("50pick-bet-" + p.marketId) || "{}").payoutIfWin,', "1.1");

  // ② announce before the money moved — drop the settledAt requirement
  mutate("drop the settledAt requirement (announce at adjudication)", ROUTE,
    /p\.settledAt != null &&/, "true &&", "3.1");

  // ③ celebrate a cashed-out player
  mutate("let CASHED_OUT through as a settled outcome", ROUTE,
    /\(p\.status === "WIN" \|\| p\.status === "LOSS" \|\| p\.status === "VOID"\)/,
    '(p.status === "WIN" || p.status === "LOSS" || p.status === "VOID" || p.status === "CASHED_OUT")', "3.2");

  // ④ E-114 again: a refund wearing a confirmation tick
  mutate("paint the refund toast with `default` (the checkCircle tick)", POLLER,
    /title: t\.market\.marketStakeReturnedTitle,([\s\S]{0,120}?)variant: "factual",/,
    'title: t.market.marketStakeReturnedTitle,$1variant: "default",', "5.1");

  // ⑤ the fix undone quietly: dedupe per market again, swallowing the second bet
  mutate("key the seen-set by marketId again", POLLER,
    /seen\.has\(p\.positionId\)/, "seen.has(p.marketId)", "6.1");

  // ⑥ ⭐ the security one: serve rows for an id the CLIENT supplies
  mutate("read positions for a user id taken from the query string", ROUTE,
    /listPositionsForUser\(session\.userId, 200, "MARKET"\)/,
    'listPositionsForUser(url.searchParams.get("userId") ?? session.userId, 200, "MARKET")', "4.2");

  // ⑦ `green`: a compliant edit the suite must stay SILENT on.
  {
    const src = ORIG[ROUTE];
    const from = "const MAX_MARKETS = 40;";
    const to = "const MAX_MARKETS = 25;";
    if (!src.includes(from)) check("green mutation — target located", false);
    else {
      writeFileSync(ROUTE, src.replace(from, to));
      const r = run();
      writeFileSync(ROUTE, src);
      check("GREEN mutation (a smaller fan-out cap, still correct) leaves the suite SILENT", r.code === 0, `exit ${r.code}`);
    }
  }
} finally {
  for (const [f, s] of Object.entries(ORIG)) writeFileSync(f, s);
  const restored = Object.entries(ORIG).every(([f, s]) => readFileSync(f, "utf8") === s);
  console.log(`\n  ${restored ? "✅" : "🔴"} restore verified byte-for-byte: ${restored}`);
  if (!restored) { console.error("  ⛔ A FILE WAS LEFT MUTATED — fix before anything else."); process.exit(1); }
}

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
