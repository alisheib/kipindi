/**
 * F5 · RED HARNESS — every rate this sweep made data-driven, put back.
 *
 *   node scripts/rate-copy-red.mjs      (npm run red:rate-copy)
 *
 * ⭐ EVERY MUTATION IS A STRING THAT ACTUALLY SHIPPED. This is not a hypothetical guard:
 * mutation 1 is the hint that quoted 1.5× on a product that pays 1.4×; mutations 2 and 3 are
 * the BINDING LEGAL DOCUMENT, in the state it was in this morning; mutation 4 is the in-app
 * assistant confidently teaching customers a retired fee rule; mutation 6 is the leaderboard
 * threshold pair that the guard itself found on its first run, which nobody had listed.
 *
 * ⚠️ MUTATION 7 IS THE ONE THAT MATTERS MOST FOR A SCANNER. It blanks the pattern list —
 * the guard then inspects every string and finds nothing, forever. A scanner that has gone
 * blind and a codebase that is clean produce the SAME green, and §2's positive control is
 * the only thing that can tell them apart.
 *
 * ⚠️ CRLF-aware, anchors re-read from disk after writing, positive control first.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";

const DICT = new URL("../src/lib/i18n-dict.ts", import.meta.url);
const TERMS = new URL("../src/app/legal/terms/page.tsx", import.meta.url);
const CHAT = new URL("../src/app/_actions/chat.ts", import.meta.url);
const SCAN = new URL("./rate-copy.test.mts", import.meta.url);
const originals = new Map([
  [DICT, readFileSync(DICT, "utf8")],
  [TERMS, readFileSync(TERMS, "utf8")],
  [CHAT, readFileSync(CHAT, "utf8")],
  [SCAN, readFileSync(SCAN, "utf8")],
]);
const restore = () => { for (const [f, s] of originals) writeFileSync(f, s); };

const CWD = new URL("..", import.meta.url);
const suiteFails = () => {
  try { execSync("npx tsx scripts/rate-copy.test.mts", { cwd: CWD, stdio: "pipe" }); return false; }
  catch { return true; }
};

restore();
if (suiteFails()) {
  console.error("✗ POSITIVE CONTROL FAILED — the unmutated suite is already red.");
  process.exit(1);
}
console.log("  ✓ CONTROL  the unmutated tree is GREEN — a red below is caused by the mutation\n");

const MUTATIONS = [
  /* ── the objection window, added 2026-09-05 ──────────────────────────────────────────
     ⛔ THE FOURTH ONE IS THE POINT. The first three re-state the window in the dictionary,
     one per locale, and any competent regex catches those. The fourth puts it back in the
     CHATBOT'S SYSTEM PROMPT — which is not in the dictionary, was the worst miss of the
     original sweep, and would go on answering players with the old number while every
     dictionary check stayed green. If §3b ever stops catching it, the guard has quietly
     narrowed back to the surface that was already safe. */
  {
    name: "fairness-copy-restates-the-window-in-english",
    why: "⭐ THE SHIPPED STRING — the fairness page told every player a flat 24 hours, on the surface the regulator reads",
    file: DICT,
    from: `A public objection window of {hours} hour(s) opens after resolution, and no money moves until it closes.`,
    to: `A 24-hour public objection window opens after resolution.`,
  },
  {
    name: "fairness-copy-restates-the-window-in-swahili",
    why: "⛔ SWAHILI PUTS THE UNIT FIRST (\"masaa 24\"), and the first draft of the pattern only knew number-then-unit — it caught EN and ZH and passed this one",
    file: DICT,
    from: `Dirisha la pingamizi la saa {hours} linafunguliwa baada ya utatuzi, na hakuna fedha inayohamishwa hadi lifungwe.`,
    to: `Dirisha la pingamizi la masaa 24 linafunguliwa baada ya utatuzi.`,
  },
  {
    name: "fairness-copy-restates-the-window-in-chinese",
    why: "the same restatement in the third locale, where the unit is a single character and no space separates it from the digit",
    file: DICT,
    from: `结算后开放 {hours} 小时的公开异议窗口，窗口关闭前不会有任何资金转移。`,
    to: `结算后开放24小时公开异议窗口。`,
  },
  {
    name: "assistant-prompt-hardcodes-the-window",
    why: "🔴 THE LIVE CHATBOT — a literal here is a WRONG ANSWER DELIVERED ON DEMAND to a player asking when they get paid, and no dictionary scan can see it",
    file: CHAT,
    from: `The verdict is recorded but pays NOBODY yet: the pool stays whole for a \${objectionHours}-hour objection window`,
    to: `The verdict is recorded but pays NOBODY yet: the pool stays whole for a 24-hour objection window`,
  },
  {
    name: "terms-void-ground-hardcodes-24-hours",
    why: "⛔ THE BINDING LEGAL TEXT — §6's void ground back to a flat 24 hours, a promise the platform cannot keep once the window is shorter",
    file: TERMS,
    from: `          or the result is corrected by the source authority within {objectionHours} hour`,
    to: `          or the result is corrected by the source authority within 24 hours`,
  },
  {
    name: "estimate-hint-hardcodes-1.5x",
    why: "⭐ THE SHIPPED STRING — the hint explaining the estimate quoted 1.5× while Up & Down pays 1.4×, so it disagreed with the button beside it",
    file: DICT,
    from: `      estimateHowItWorks: "A rough guide ({mult}× your stake).`,
    to: `      estimateHowItWorks: "A rough guide (1.5× your stake).`,
  },
  {
    name: "terms-restore-the-retired-ceiling",
    why: "⭐ THE BINDING LEGAL DOCUMENT as it stood this morning — §4 stating the retired capped-commission rule, in English",
    file: TERMS,
    from: `          <strong className="text-text">Our commission is 13% of the losing side.</strong>`,
    to: `          <strong className="text-text">Our commission is 10% of the pool, but never more than a third of the smaller side.</strong>`,
  },
  {
    name: "terms-withdrawal-fee-back-to-1pct",
    why: "⭐ THE LEGAL DOCUMENT SAYING 1% WHILE PRODUCTION CHARGES 1.5% — the state it was in for at least four days",
    file: TERMS,
    from: `          <strong className="text-text">A withdrawal is charged a 1.5% fee, and nothing else. No tax is withheld`,
    to: `          <strong className="text-text">A withdrawal is charged a 1% fee, and nothing else. No tax is withheld`,
  },
  {
    name: "assistant-teaches-the-retired-rule",
    why: "⭐ THE IN-APP ASSISTANT — it would state the retired fee rule to a customer, confidently, in whatever language they asked in",
    file: CHAT,
    from: `- Winners share the pool. Our commission is 13% OF THE LOSING SIDE.`,
    to: `- Winners share the pool. Our commission is 10% of the pool, but NEVER more than a third of the smaller side.`,
  },
  {
    name: "assistant-loses-the-per-bet-qualifier",
    why: "⚠️ the assistant drops 'PER BET' from the maximum — docs/RULES.md §1 records that no surface may imply the cap bounds TOTAL exposure on a market",
    file: CHAT,
    from: `The minimum stake is TZS 1,000 and the maximum is TZS 1,000,000 PER BET — a player may place as many bets as they like on one market, on either side or both, so the maximum does NOT limit their total exposure on a market.`,
    to: `The minimum stake is TZS 1,000 and the maximum is TZS 1,000,000.`,
  },
  {
    name: "leaderboard-tiers-restate-the-thresholds",
    why: "⭐ FOUND BY THIS GUARD ON ITS FIRST RUN, and nobody had listed it — the copy restating the very numbers the classifier tests",
    file: DICT,
    from: `      tierGold: "Gold · ≥{resolved} resolved · ≥{roi}% ROI",`,
    to: `      tierGold: "Gold · ≥10 resolved · ≥15% ROI",`,
  },
  {
    name: "the-scanner-goes-blind",
    why: "⚠️ THE SHAPE THAT MATTERS MOST — the pattern list is emptied. The scan then inspects every string and finds nothing, forever, and a blind scanner is GREEN exactly like a clean codebase. Only §2's positive control separates them",
    file: SCAN,
    from: `  { re: /(?<!\\{)\\b\\d{1,3}(?:\\.\\d+)?\\s*%/g, what: "a percentage" },`,
    to: `  // pattern removed`,
  },
];

let caught = 0;
const problems = [];

for (const m of MUTATIONS) {
  restore();
  const src = readFileSync(m.file, "utf8");
  const asCRLF = m.from.replace(/\n/g, "\r\n");
  const anchor = src.includes(m.from) ? m.from : src.includes(asCRLF) ? asCRLF : null;
  if (anchor === null) { problems.push(`${m.name} — HARNESS ERROR: anchor not found`); continue; }

  writeFileSync(m.file, src.replace(anchor, anchor === asCRLF ? m.to.replace(/\n/g, "\r\n") : m.to));
  if (readFileSync(m.file, "utf8").includes(anchor)) {
    problems.push(`${m.name} — HARNESS ERROR: anchor still present after write`); continue;
  }

  if (suiteFails()) { caught++; console.log(`  ✓ RED  ${m.name} — ${m.why}`); }
  else problems.push(`${m.name} — GUARD DID NOT CATCH IT (${m.why})`);
}

restore();
console.log(`\ntree restored · ${caught}/${MUTATIONS.length} defects caught`);
if (problems.length) { for (const p of problems) console.error(`  ✗ ${p}`); process.exit(1); }
