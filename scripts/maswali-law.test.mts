/**
 * test:maswali-law — MASWALI MILLIONEA'S LAW IS WRITTEN WHERE THE LAW LIVES, AND THE CODE AGREES (MASWALI-BUILD S1).
 *
 *   npm run test:maswali-law          Red: npm run red:maswali-law
 *
 * `docs/RULES.md` is the single authoritative statement of what 50pick charges. Its own §5 says a rule changes in one
 * commit: the decision, this file, the code, the config and every surface that states it. This guard holds the S1 half:
 *
 *   L1 the roll-out row says Millionea is DECIDED and NOT SELLING (⏳), so nobody quotes §2.12 as live behaviour
 *   L2 §1 carries the five Millionea rows — ticket, fee, floor, rollover, cap
 *   L3 §2.12 exists with its decided / enforced / configured / stated / guarded table
 *   L4 §2.4 names the cap as its ONE exception; §2.8 says Millionea charges nothing else either
 *   L5 §3 is "THE THREE FEE MODELS" and names `jackpot-payout`; §6 records the 2026-10-16 decision
 *   L6 the code's fee models are exactly the three, and the caption fits its cell
 *   L7 the decision the law cites exists in COMPLIANCE-DECISIONS
 *
 * ⛔ IN-PROCESS BY CONSTRUCTION: `--prove-red` plants every defect IN MEMORY (the `test:migration-ownership` way), so this
 * file makes no file-writing call and can never leave the law edited on disk.
 */
import { readFileSync } from "node:fs";
import { FEE_CAPTION_MAX_CHARS, FEE_MODELS, describeFeeModel } from "../src/lib/payout.ts";

process.exitCode = 1;
const PROVE_RED = process.argv.includes("--prove-red");
const read = (rel: string) => readFileSync(new URL(`../${rel}`, import.meta.url), "utf8").replace(/\r\n/g, "\n");

type World = { rules: string; decisions: string; feeModels: readonly string[]; caption: string };
const REAL: World = {
  rules: read("docs/RULES.md"),
  decisions: read("docs/COMPLIANCE-DECISIONS.md"),
  feeModels: FEE_MODELS,
  caption: describeFeeModel({ feeModel: "jackpot-payout", jackpotFeeRate: 0.13 }).caption,
};

/** The section of RULES.md from a heading to the next heading of the same or higher level. */
function section(rules: string, heading: RegExp): string {
  const m = heading.exec(rules);
  if (!m) return "";
  const level = (/^#+/.exec(m[0]) ?? ["##"])[0].length;
  const rest = rules.slice(m.index + m[0].length);
  const next = new RegExp(`^#{1,${level}} `, "m").exec(rest);
  return m[0] + (next ? rest.slice(0, next.index) : rest);
}

/** Every failure, as `[Ln] what`. Empty means the law and the code agree. */
function check(w: World): string[] {
  const f: string[] = [];
  const status = section(w.rules, /^### ⏳ ROLL-OUT STATUS[^\n]*/m);
  if (!/^\| \*\*Maswali Millionea\*\* \(§2\.12\)[^\n]*⏳ \*\*DECIDED, NOT SELLING\.\*\*/m.test(status)) f.push("[L1] the roll-out table has no ⏳ DECIDED, NOT SELLING row for Millionea");
  const s1 = section(w.rules, /^## §1 · THE RULE SET/m);
  for (const row of ["Millionea ticket", "Millionea fee", "Millionea floor", "Millionea rollover", "Millionea cap"]) {
    if (!new RegExp(`^\\| \\*\\*${row}\\*\\* \\|[^\\n]*\\| Millionea \\(§2\\.12\\) \\|$`, "m").test(s1)) f.push(`[L2] §1 has no "${row}" row applying to Millionea (§2.12)`);
  }
  const s212 = section(w.rules, /^### 2\.12 · Maswali Millionea[^\n]*/m);
  if (!s212) f.push("[L3] §2.12 is missing");
  else {
    for (const k of ["Decided", "Enforced", "Configured", "Stated", "Guarded by"]) {
      if (!new RegExp(`^\\| \\*\\*${k}\\*\\* \\|`, "m").test(s212)) f.push(`[L3] §2.12 has no ${k} row`);
    }
    if (!/⏳ \*\*DECIDED, NOT SELLING\*\*/.test(s212)) f.push("[L3] §2.12 does not open with its ⏳ not-selling marker");
    if (!/taken \*\*only when k ≥ 1\*\*/.test(s212)) f.push("[L3] §2.12 does not say the fee is taken only when a week has a winner");
    if (!/maswali\.config/.test(s212)) f.push("[L3] §2.12 does not name the config that holds its figures");
  }
  const s24 = section(w.rules, /^### 2\.4 · Positions per market[^\n]*/m);
  if (!/THE ONE EXCEPTION — MASWALI MILLIONEA/.test(s24) || !/\*\*10 per week\*\*/.test(s24)) f.push("[L4] §2.4 does not name the Millionea cap as its one exception");
  const s28 = section(w.rules, /^### 2\.8 · What a player is charged, in full/m);
  if (!/Maswali Millionea \(§2\.12[^)]*\) is the same, in full/.test(s28)) f.push("[L4] §2.8 does not extend 'Nothing else' to Millionea");
  const s3 = section(w.rules, /^## §3 · [^\n]*/m);
  if (!/^## §3 · THE THREE FEE MODELS/m.test(s3)) f.push("[L5] §3 is not 'THE THREE FEE MODELS'");
  if (!/`jackpot-payout` is \*\*Maswali Millionea's\*\*/.test(s3)) f.push("[L5] §3 does not name jackpot-payout as Millionea's model");
  const s6 = section(w.rules, /^## §6 · DECISION HISTORY/m);
  if (!/^\| 2026-10-16 \| ⭐ \*\*Maswali Millionea, a third product\*\*/m.test(s6)) f.push("[L5] §6 has no 2026-10-16 Millionea row");
  if (JSON.stringify([...w.feeModels]) !== JSON.stringify(["capped-commission", "loser-share", "jackpot-payout"])) f.push(`[L6] the code's fee models are ${JSON.stringify(w.feeModels)}, not the three the law names`);
  if (w.caption.length === 0 || w.caption.length > FEE_CAPTION_MAX_CHARS) f.push(`[L6] the jackpot caption "${w.caption}" does not fit ${FEE_CAPTION_MAX_CHARS} characters`);
  if (!/^## 2026-10-16 · Maswali Millionea/m.test(w.decisions)) f.push("[L7] COMPLIANCE-DECISIONS has no 2026-10-16 Millionea decision for the law to cite");
  return f;
}

let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, detail = "") => {
  if (cond) { pass++; console.log(`PASS ${label}`); }
  else { fail++; console.log(`FAIL ${label}${detail ? ` — ${detail}` : ""}`); }
};

if (!PROVE_RED) {
  const failures = check(REAL);
  ok("L · the law and the code agree on Maswali Millionea", failures.length === 0, failures.join(" · "));
  for (const id of ["L1", "L2", "L3", "L4", "L5", "L6", "L7"]) ok(`${id} · holds`, !failures.some((x) => x.startsWith(`[${id}]`)));
} else {
  // Each plant is one way the law could drift from the code; each must be reported under its own id, and the real
  // world must stay green in the same run (the positive control).
  const swap = (w: World, k: "rules" | "decisions", a: string, b: string): World => {
    if (!w[k].includes(a)) throw new Error(`STALE plant: "${a.slice(0, 60)}" is not in ${k}`);
    return { ...w, [k]: w[k].replace(a, b) };
  };
  const plants: Array<[string, () => World, string]> = [
    ["the ⏳ marker dropped from the roll-out row (§2.12 read as live)", () => swap(REAL, "rules", "⏳ **DECIDED, NOT SELLING.** Ruled", "✅ **LIVE.** Ruled"), "[L1]"],
    ["the cap row deleted from §1", () => swap(REAL, "rules", "| **Millionea cap** |", "| **Millionea limit** |"), "[L2]"],
    ["§2.12 retitled away", () => swap(REAL, "rules", "### 2.12 · Maswali Millionea", "### 2.12 · Weekly jackpot"), "[L3]"],
    ["the fee loses 'only when k ≥ 1'", () => swap(REAL, "rules", "taken **only when k ≥ 1**", "taken **every week**"), "[L3]"],
    ["§2.4's exception removed", () => swap(REAL, "rules", "THE ONE EXCEPTION — MASWALI MILLIONEA", "A NOTE ON MILLIONEA"), "[L4]"],
    ["§2.8's extension removed", () => swap(REAL, "rules", "is the same, in full", "differs"), "[L4]"],
    ["§3 back to two fee models", () => swap(REAL, "rules", "## §3 · THE THREE FEE MODELS", "## §3 · THE TWO FEE MODELS"), "[L5]"],
    ["the history row removed", () => swap(REAL, "rules", "| 2026-10-16 | ⭐ **Maswali Millionea, a third product**", "| 2026-10-16 | Millionea"), "[L5]"],
    ["the code forgets jackpot-payout", () => ({ ...REAL, feeModels: ["capped-commission", "loser-share"] }), "[L6]"],
    ["a caption too long for its cell", () => ({ ...REAL, caption: "13% of the jackpot at payout" }), "[L6]"],
    ["the cited decision missing", () => swap(REAL, "decisions", "## 2026-10-16 · Maswali Millionea", "## 2026-10-16 · Weekly product"), "[L7]"],
  ];
  ok("RED control · the real world is green in this run", check(REAL).length === 0, check(REAL).join(" · "));
  for (const [name, plant, id] of plants) {
    let w: World;
    try { w = plant(); } catch (e) { ok(`RED · ${name}`, false, String((e as Error).message)); continue; }
    const got = check(w);
    ok(`RED · ${name} → reported under ${id}`, got.some((x) => x.startsWith(id)), got.join(" · ") || "nothing reported");
  }
}

console.log(`\n${"═".repeat(70)}\n  MASWALI LAW${PROVE_RED ? " (RED)" : ""}: ${pass} passed, ${fail} failed\n${"═".repeat(70)}`);
process.exit(fail === 0 ? 0 : 1);
