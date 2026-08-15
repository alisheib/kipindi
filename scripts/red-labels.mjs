/**
 * RED PROOF for the LABEL guard (`npm run test:labels`).
 *
 * ⛔ "THE FILE CHANGED" IS NOT A RED. Every mutation below must make the suite EXIT
 * NON-ZERO *and* report ≥1 failing check. Every mutation is reverted and the file verified
 * byte-for-byte afterwards. A mutation whose anchor is missing is reported as PROVING
 * NOTHING — never skipped quietly, because a stale anchor is an ABSENT test that fails in
 * the direction of looking fine (`red-e64.cjs` sat stale for eight days that way).
 *
 * ⛔ ANCHORS GO THROUGH `red-anchor.mjs`. It is the shared resolver, it normalises line
 * endings — `core.autocrlf=true` here with no `.gitattributes`, so a multi-line anchor
 * written with `\n` silently misses on a Windows checkout — and it REFUSES an ambiguous
 * anchor. The last harness that hand-rolled matching had all five of its multi-line anchors
 * quietly missing.
 *
 * ⭐ EVERY MUTATION IS A DEFECT THAT WAS ACTUALLY LIVE ON 2026-08-15, or the exact inverse
 * of one:
 *   1. the Chinese dictionary key carrying the ASCII token          (§2 — six keys did)
 *   2. player help text naming the raw `CASHED_OUT` enum            (§2 — in all 3 languages)
 *   3. the stored enum interpolated into a translated sentence      (§3 — notifyWatchedSettled)
 *   4. 🔴 ALI'S BUG: the Up & Down push in the POLL's vocabulary     (§3 — "Bet placed · YES")
 *   5. a side that resolves to no word at all                       (§1)
 *   6. the round vocabulary collapsing into the poll's              (§1b — the root of #4)
 *   7. a tenth private copy of the word map                         (§4 ratchet)
 *   8. ⭐ THE SCANNER GOING BLIND                                    (§2's refuse-to-run)
 *
 * ⭐ #8 IS THE ONE MOST WORTH HAVING. A scanner that locates nothing prints "0 violations"
 * in exactly the same words as a clean tree — which is how the first draft of this guard
 * reported two findings where there were eight. It must FAIL, not pass, when it cannot see.
 *
 * Run: npm run red:labels
 */
import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { injectDefect } from "./red-anchor.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SUITE = join(ROOT, "scripts", "label-lexicon.test.mts");
const p = (...s) => join(ROOT, ...s);

const MUTATIONS = [
  {
    name: "§2 · a Chinese key carries the ASCII token YES again (the shipped defect)",
    file: p("src", "lib", "i18n-dict.ts"),
    from: `      probOverTime: "「是」概率随时间变化",`,
    to: `      probOverTime: "YES 概率随时间变化",`,
  },
  {
    name: "§2 · player help text names the raw CASHED_OUT enum again",
    file: p("src", "lib", "i18n-dict.ts"),
    from: `卖出成功后持仓状态变为「已兑现」，资金返回您的钱包。",`,
    to: `卖出成功后持仓状态变为 CASHED_OUT，资金返回您的钱包。",`,
  },
  {
    name: "§3 · the stored enum goes back into a translated sentence",
    file: p("src", "lib", "server", "notification-service.ts"),
    from: `    bodyZh: \`\${opts.marketTitle.slice(0, 50)} · 结果：\${outcomeWordIn("zh", opts.outcome, "MARKET")}。\`,`,
    to: `    bodyZh: \`\${opts.marketTitle.slice(0, 50)} · 结果：\${opts.outcome}。\`,`,
  },
  {
    name: "§3 · 🔴 ALI'S BUG — the Up & Down push speaks the poll's vocabulary again",
    file: p("src", "lib", "server", "market-service.ts"),
    from: `        titleZh: \`已下注 · \${sideWordIn("zh", opts.side, "UPDOWN")} \${formatTzs(opts.stake)}\`,`,
    to: `        titleZh: \`已下注 · \${opts.side} \${formatTzs(opts.stake)}\`,`,
  },
  {
    name: "§1 · a side resolves to no word at all",
    file: p("src", "lib", "side-label.ts"),
    from: `  return stored === "YES" ? t.common.yes : t.common.no;`,
    to: `  return stored === "YES" ? "" : t.common.no;`,
  },
  {
    name: "§1b · the round vocabulary collapses into the poll's — the ROOT of Ali's bug",
    file: p("src", "lib", "side-label.ts"),
    from: `  if (productLine === "UPDOWN") return stored === "YES" ? t.market.udUp : t.market.udDown;`,
    to: `  if (productLine === "UPDOWN") return stored === "YES" ? t.common.yes : t.common.no;`,
  },
  {
    name: "§4 · a further private copy of the word map appears",
    file: p("src", "components", "markets", "resolution-panel.tsx"),
    from: `          {isVoid ? t.market.resVoided : \`\${t.market.resolvedOutcome} · \${outcomeWord(t, outcome, "MARKET")}\`}`,
    to: `          {isVoid ? t.market.resVoided : \`\${t.market.resolvedOutcome} · \${outcome === "YES" ? t.common.yes : t.common.no}\`}`,
  },
  {
    name: "§2 · ⭐ THE SCANNER GOES BLIND — the locale-block locator stops matching",
    file: p("scripts", "label-lexicon.test.mts"),
    from: `const blockStart = (k: string) => dictLines.findIndex((l) => new RegExp(\`^  \${k}: \\\\{\`).test(l));`,
    to: `const blockStart = (k: string) => dictLines.findIndex((l) => new RegExp(\`^ZZZ  \${k}: \\\\{\`).test(l));`,
  },
];

const run = () => spawnSync("npx", ["tsx", SUITE], { encoding: "utf8", shell: true });

// ── The suite must be GREEN before any mutation, or every "CAUGHT" below is meaningless.
console.log("\nRED PROOF — label guard (DESIGN_AUTHORITY §L)\n");
const baseline = run();
if (baseline.status !== 0) {
  console.error("🔴 BASELINE IS ALREADY RED — a mutation cannot prove anything against it.");
  console.error((baseline.stdout + baseline.stderr).split(/\r?\n/).filter((l) => /FAIL/.test(l)).join("\n"));
  process.exit(2);
}
console.log("  baseline: test:labels is GREEN — mutations below must each turn it RED.\n");

let proven = 0;
for (const m of MUTATIONS) {
  console.log(`▶ ${m.name}`);
  const original = readFileSync(m.file, "utf8");

  let mutated;
  try {
    mutated = injectDefect(original, m.from, m.to);
  } catch (e) {
    // ⛔ Loud, and counted as a failure. An anchor that has drifted is an ABSENT test.
    console.error(`   ✗ ANCHOR PROBLEM — THIS MUTATION PROVES NOTHING: ${e.message}`);
    continue;
  }

  writeFileSync(m.file, mutated, "utf8");
  const r = run();
  const out = r.stdout + r.stderr;
  const failures = (out.match(/^\s*FAIL /gm) ?? []).length;
  const caught = r.status !== 0 && failures >= 1;
  console.log(`   exit=${r.status}  failing checks=${failures}  ${caught ? "✓ CAUGHT" : "✗ MISSED"}`);
  for (const line of out.split(/\r?\n/).filter((l) => /^\s*FAIL /.test(l)).slice(0, 2)) {
    console.log(`     ${line.trim().slice(0, 150)}`);
  }

  writeFileSync(m.file, original, "utf8");
  if (readFileSync(m.file, "utf8") !== original) {
    console.error(`   🔴 REVERT FAILED on ${m.file} — stop and restore by hand`);
    process.exit(2);
  }
  if (caught) proven++;
}

console.log(`\n${proven}/${MUTATIONS.length} mutations caught — every file restored byte-for-byte.`);
process.exit(proven === MUTATIONS.length ? 0 : 1);
