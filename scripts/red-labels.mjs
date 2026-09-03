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
    // ⚠️ RE-ANCHORED 2026-08-15: `marketTitle` became `LocalizedText`, so the Chinese body now
    // reads `opts.marketTitle.zh` — a Chinese sentence around a Chinese question rather than an
    // English one (§7.2c). The MUTATION is unchanged: put the stored enum back in place of the
    // dictionary word, and the scanner must see it.
    from: `    bodyZh: \`\${opts.marketTitle.zh.slice(0, 50)} · 结果：\${outcomeWordIn("zh", opts.outcome, "MARKET")}。\`,`,
    to: `    bodyZh: \`\${opts.marketTitle.zh.slice(0, 50)} · 结果：\${opts.outcome}。\`,`,
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
    // 🔴 THIS ONE SHIPPED. The guard was green while production's Chinese markets board read
    // "已结算 YES", because a template of PURE interpolations carries no literal word and the
    // prose test rejected it. Found by reading the live page. It is a mutation now so the
    // blind spot cannot come back.
    name: "§3 · a template that is ONLY interpolations — the shape that reached production",
    file: p("src", "app", "markets", "page.tsx"),
    from: `                timeLeft={m.resolvedOutcome === "VOID" ? t.common.voided : \`\${t.market.resolvedOutcome} \${outcomeWord(t, m.resolvedOutcome ?? "VOID", "MARKET")}\`}`,
    to: `                timeLeft={\`\${t.market.resolvedOutcome} \${m.resolvedOutcome}\`}`,
  },
  {
    // 🔴 PV-04, EXACTLY AS IT SHIPPED. This is the line a Chinese player met on the live
    // money control — "YES @ 51%" — while the board cards on the same page read "是 @ 56%".
    name: "§3b · the pick-gate types the raw enum where a player reads it (PV-04, live 2026-09-03)",
    file: p("src", "components", "markets", "side-picker.tsx"),
    from: `          {sideWord(t, "YES", "MARKET")} {hasPool && <span className="font-mono text-[12.5px] opacity-85">@ {yesPct}%</span>}`,
    to: `          YES {hasPool && <span className="font-mono text-[12.5px] opacity-85">@ {yesPct}%</span>}`,
  },
  {
    // 🔴 PV-04's second shape — and the one that proves WHY §3c judges the dictionary's
    // placeholder rather than the variable's name. The variable here is called `lock`; no
    // vocabulary of enum-ish identifier names would ever have matched it.
    name: "§3c · a translated sentence is filled with the STORED token (the `lock` shape)",
    file: p("src", "components", "markets", "conviction-dial.tsx"),
    from: `          <div className="grid grid-cols-2 gap-2" role="img" aria-label={t.market.backingLocked.replace("{side}", sideWord(t, lock, "MARKET"))}>`,
    to: `          <div className="grid grid-cols-2 gap-2" role="img" aria-label={t.market.backingLocked.replace("{side}", lock)}>`,
  },
  {
    // ⭐ §3b'S OWN BLINDNESS CONTROL, the same shape as #8 below. A population filter that
    // matches nothing reports "0 raw tokens" in the identical words as a clean tree.
    name: "§3b · ⭐ THE PLAYER-TREE SCANNER GOES BLIND — its population filter matches nothing",
    file: p("scripts", "label-lexicon.test.mts"),
    from: `  (f) => (f.includes(join("src", "app")) || f.includes(join("src", "components")))`,
    to: `  (f) => (f.includes(join("srcZZZ", "app")) || f.includes(join("srcZZZ", "components")))`,
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
