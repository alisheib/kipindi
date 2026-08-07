/**
 * E-57 · RED HARNESS — reintroduce the failure this guard exists for, and prove it fires.
 *
 *   node scripts/updown-push-red.mjs
 *
 * The mutations are not hypothetical. Each is a shape this codebase has ALREADY shipped or
 * nearly shipped:
 *   · `only-wins-push` is E-43 exactly — announce the good outcome, stay silent on the
 *     others. Measured on production: 0 of 13 wins and 0 of 11 losses notified, 56 of 56
 *     refunds notified. Every unit test was green throughout.
 *   · `results-share-the-bet-tag` is the coalescing mistake — a win silently replaced on
 *     the device by a later loss, because both collapse under one key.
 *   · `push-writes-an-inbox-row` rebuilds the forty-rows-an-hour problem the digest exists
 *     to prevent.
 *
 * ⚠️ CRLF. An anchor authored with LF against a CRLF tree silently matches nothing, the
 * mutation never applies, the suite passes, and the harness reports "defect not caught" as
 * if the guard were weak — three sessions of this campaign have been fooled by it. Every
 * mutation here matches both line endings AND re-reads the file to confirm the anchor is
 * GONE from disk. A mutation that did not apply is a HARNESS ERROR, never a green.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";

const MS = new URL("../src/lib/server/market-service.ts", import.meta.url);
const NS = new URL("../src/lib/server/notification-service.ts", import.meta.url);

const originals = new Map([[MS, readFileSync(MS, "utf8")], [NS, readFileSync(NS, "utf8")]]);
const restore = () => { for (const [f, src] of originals) writeFileSync(f, src); };

const MUTATIONS = [
  {
    name: "only-wins-push",
    why: "E-43's exact shape — the win pushes, the LOSS goes silent, so we only reach the player with good news",
    file: MS,
    from: `          pushOnly(p.userId, {
            titleEn: \`Bet lost · \${formatTzs(p.stake)}\`,`,
    to: `          void 0 && pushOnly(p.userId, {
            titleEn: \`Bet lost · \${formatTzs(p.stake)}\`,`,
  },
  {
    name: "refund-goes-silent",
    why: "the voided-round refund stops pushing, so a player whose stake came back hears nothing",
    file: MS,
    from: "          bodyEn: `${m.titleEn.slice(0, 60)} — the round was voided and your stake came back in full.`,",
    to: "          bodyEn: `${m.titleEn.slice(0, 60)} — settled.`,",
  },
  {
    name: "gate-loses-its-else",
    why: "the refund gate's else is severed into a dead `if` — the push still reads as a statement, but no branch of the gate can ever reach it",
    file: MS,
    from: `      } else {
        // E-57 · ⛔ THE REFUND PUSHES TOO, AND THIS BRANCH IS THE WHOLE POINT OF E-43.`,
    to: `      }
      if (Math.random() < 0) {
        // E-57 · ⛔ THE REFUND PUSHES TOO, AND THIS BRANCH IS THE WHOLE POINT OF E-43.`,
  },
  {
    name: "results-share-the-bet-tag",
    why: "outcomes collapse under the bet's key, so a win is silently replaced on the device by a later loss",
    file: MS,
    from: 'export const updownResultPushTag = (marketId: string) => `updown-result-${marketId}`;',
    to: 'export const updownResultPushTag = (_marketId: string) => "updown-bet";',
  },
  {
    name: "push-writes-an-inbox-row",
    why: "pushOnly starts recording notifications, rebuilding the forty-rows-an-hour problem the digest prevents",
    file: NS,
    from: "      const { sendPushToUser } = await import(\"./push-service\");\n      const user = await db.user.findById(userId);",
    to: "      const { sendPushToUser } = await import(\"./push-service\");\n      await db.notification.create({} as never);\n      const user = await db.user.findById(userId);",
  },
];

let caught = 0;
const problems = [];

for (const m of MUTATIONS) {
  restore();
  const src = readFileSync(m.file, "utf8");

  const asCRLF = m.from.replace(/\n/g, "\r\n");
  const anchor = src.includes(m.from) ? m.from : src.includes(asCRLF) ? asCRLF : null;
  if (anchor === null) {
    problems.push(`${m.name} — HARNESS ERROR: anchor not found, mutation never applied`);
    continue;
  }

  const replacement = anchor === asCRLF ? m.to.replace(/\n/g, "\r\n") : m.to;
  writeFileSync(m.file, src.replace(anchor, replacement));

  // ⭐ Believe nothing until the anchor is actually gone from what is on disk.
  if (readFileSync(m.file, "utf8").includes(anchor)) {
    problems.push(`${m.name} — HARNESS ERROR: anchor still present after write`);
    continue;
  }

  let failed = false;
  try {
    execSync("npx tsx scripts/updown-push.test.mts", { cwd: new URL("..", import.meta.url), stdio: "pipe" });
  } catch { failed = true; }

  if (failed) { caught++; console.log(`  ✓ RED  ${m.name} — ${m.why}`); }
  else problems.push(`${m.name} — GUARD DID NOT CATCH IT (${m.why})`);
}

restore();
console.log(`\ntree restored · ${caught}/${MUTATIONS.length} defects caught`);
if (problems.length) {
  for (const p of problems) console.error(`  ✗ ${p}`);
  process.exit(1);
}
