/**
 * RED harness for `npm run test:updown-late-close`.
 *
 *   node scripts/updown-late-close-red.mjs
 *
 * ⛔ MUTATION 1 IS THE IMPORTANT ONE: it restores, character for character, the
 * past-deadline branch that shipped — the one that voided a round **without re-reading**.
 * That is E-69, and a guard for it is worth nothing unless it rejects the exact code that
 * caused it.
 *
 * Rules obeyed (each learned the hard way in this campaign):
 *  1. An anchor that does not match is a BROKEN HARNESS, not a missed defect — CRLF has fooled
 *     four sessions this way, and `updown-feed.ts` is a CRLF file. Asserted present before.
 *  2. "The file changed" is not evidence. Non-zero exit AND a named failure, or it is a MISS.
 *  3. A mutation must locate its target exactly as the guard does, or the harness edits text
 *     the guard never reads and a real defect goes unproven while the run looks orderly.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";

const SERVICE = new URL("../src/lib/server/updown-service.ts", import.meta.url);
const CONFIG = new URL("../src/lib/server/updown-config.ts", import.meta.url);
const PROVIDERS = new URL("../src/lib/updown-providers.ts", import.meta.url);
const DAL = new URL("../src/lib/server/updown-dal.ts", import.meta.url);

const MUTATIONS = [
  {
    // THE SHIPPED DEFECT, restored. The healer reaches the past-deadline branch and closes the
    // round without ever asking the feed — which is exactly what refunded E-69's player.
    name: "void-without-reading — the shipped E-69 branch, restored verbatim",
    file: SERVICE,
    from: `    const decision = lateCloseDecision(findProvider(cfg.feedProvider), elapsedSec, cfg);`,
    to: `    const decision = { reread: false };`,
  },
  {
    // The careless inversion: always re-read. Costs real money on a quote feed and settles a
    // boundary on an instant that is not it.
    name: "always-reread — the quote path re-dials a boundary it can never answer",
    file: CONFIG,
    from: `  if (!provider?.dated) return { reread: false, why: "feed-cannot-answer-about-the-past" };`,
    to: `  if (false) return { reread: false, why: "feed-cannot-answer-about-the-past" };`,
  },
  {
    // "Late" becomes unbounded — a round from any distance settles, so a stake has no
    // guaranteed terminal state any more.
    name: "unbounded-lookback — a week-old round settles instead of refunding",
    file: CONFIG,
    from: `  if (elapsedSeconds > cfg.maxSettleLookbackSeconds) return { reread: false, why: "beyond-the-lookback" };`,
    to: `  if (false) return { reread: false, why: "beyond-the-lookback" };`,
  },
  {
    // The second defect: `no-bar` at the boundary burns the attempt budget, so every round
    // starts a life down for a bar that publishes four seconds later.
    name: "no-bar-burns-the-budget — attempt 1 is charged for a bar that has not published yet",
    file: CONFIG,
    from: `    return elapsedSeconds > cfg.barPublicationGraceSeconds;`,
    to: `    return true;`,
  },
  {
    // The opposite mistake: a bar that NEVER publishes never spends the budget, so the round
    // rides out the deadline instead of failing its boundary on time.
    name: "no-bar-never-burns — a boundary that will never publish is retried forever",
    file: CONFIG,
    from: `  if (reason === "bar-not-published") {`,
    to: `  if (reason === "bar-not-published") { return false; } else if (false) {`,
  },
  {
    // The write-once ledger relaxed, AT THE PLACE THAT ACTUALLY ENFORCES IT.
    //
    // ⚠️ The first version of this mutation removed the `FAILED` early-return in
    // `acquireObservation` and the guard did not go red — correctly. That early return is
    // convenience; the real guarantee is the DAL's claim-the-row `confirm`, which is
    // conditional on `state: "PENDING"`, so a revived read still cannot overwrite a settled
    // price. Defence in depth is why the first mutation was harmless, and mutating the
    // convenience layer proved nothing about the invariant. This mutates the invariant.
    // ⛔ THIS ONE NEEDS THREE EDITS, AND THAT IS THE FINDING, NOT A CONTRIVANCE.
    //
    // The write-once ledger is defended in depth, and each layer alone is enough: the
    // healer's `state === "PENDING"` gate never attempts the read; `acquireObservation`
    // early-returns on FAILED; and the DAL's claim-the-row `confirm` is conditional on
    // PENDING so even a read that got through could not overwrite a settled price.
    // Mutating any ONE of them leaves the suite green — which is the correct outcome and
    // was mis-scored as a MISS twice before this was understood.
    //
    // So the mutation is the realistic one: somebody deliberately adding "let the late path
    // revive a failed boundary" would have to remove all three, and §6 must catch that.
    // ⚠️ Anchored on `confirm`'s own comment + statement pair, because the identical
    // statement appears again inside `fail()` fifteen lines later.
    name: "revive-a-failed-observation — all three write-once layers removed at once",
    edits: [
      {
        file: SERVICE,
        from: `    if (decision.reread && (!observation || observation.state === "PENDING")) {`,
        to: `    if (decision.reread) {`,
      },
      {
        file: SERVICE,
        from: `  if (obs.state === "FAILED") {
    return { state: "failed", id: obs.id, detail: obs.failReason ?? "boundary failed" };
  }`,
        to: `  if (obs.state === "FAILED" && !opts?.pastDeadline) {
    return { state: "failed", id: obs.id, detail: obs.failReason ?? "boundary failed" };
  }`,
      },
      {
        file: DAL,
        from: `    // The in-memory mirror of the conditional UPDATE ... WHERE state = 'PENDING'.
    if (!cur || cur.state !== "PENDING") return false;`,
        to: `    // The in-memory mirror of the conditional UPDATE ... WHERE state = 'PENDING'.
    if (!cur) return false;`,
      },
    ],
  },
  {
    // The shared-list failure applied to settlement: the bar provider silently stops being
    // dated, so every late close voids again while the console still offers it.
    name: "provider-loses-its-dated-flag — the late close silently reverts",
    file: PROVIDERS,
    from: `    needsKey: true,
    dated: true,
  },`,
    to: `    needsKey: true,
  },`,
  },
];

let caught = 0;
const missed = [];
const cwd = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");

/**
 * ⛔ CRLF, FOR THE FIFTH TIME IN THIS CAMPAIGN — and this is the general fix, not another
 * hand-patched anchor. `updown-service.ts` is a CRLF file while `updown-config.ts` and
 * `updown-providers.ts` are LF, so a multi-line anchor written with `\n` matches one and
 * silently misses the other. It reports ANCHOR NOT FOUND, which reads as a broken harness on
 * a perfectly good guard — and the single-line anchors keep working, so the failure looks
 * random rather than systematic.
 *
 * Every anchor is authored with `\n` and re-expressed in whatever the TARGET FILE actually
 * uses, so neither the harness author nor the next session has to know or care.
 */
const toFileEol = (text, fileContents) => (fileContents.includes("\r\n") ? text.replace(/\n/g, "\r\n") : text);

for (const m of MUTATIONS) {
  // A mutation is one or more edits. Several defects can only be expressed by touching more
  // than one layer at once — see the write-once one below.
  const edits = m.edits ?? [{ file: m.file, from: m.from, to: m.to }];
  const backups = new Map();
  let anchorMissing = null;
  for (const e of edits) {
    if (!backups.has(e.file.href)) backups.set(e.file.href, { file: e.file, text: readFileSync(e.file, "utf8") });
    const cur = readFileSync(e.file, "utf8");
    e.from = toFileEol(e.from, cur);
    e.to = toFileEol(e.to, cur);
    if (!cur.includes(e.from)) { anchorMissing = e.from.split("\n")[0].trim().slice(0, 60); break; }
  }
  if (anchorMissing) {
    console.log(`  ✗ ${m.name}\n      ⛔ ANCHOR NOT FOUND (${anchorMissing}) — the harness is broken, not the guard.`);
    missed.push(`${m.name} (anchor missing)`);
    for (const b of backups.values()) writeFileSync(b.file, b.text);
    continue;
  }
  try {
    for (const e of edits) {
      const cur = readFileSync(e.file, "utf8");
      const next = cur.replace(e.from, e.to);
      if (next === cur) throw new Error("mutation did not land on disk");
      writeFileSync(e.file, next);
    }
    let exitCode = 0, out = "";
    try {
      out = execSync("npx tsx scripts/updown-late-close.test.mts", { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    } catch (e) {
      exitCode = e.status ?? 1;
      out = `${e.stdout ?? ""}${e.stderr ?? ""}`;
    }
    // ⛔ ANCHOR ON THE SUITE'S OWN SUMMARY LINE, NOT ON THE BARE WORDS `N failed`.
    // The first version matched `/(\d+) failed/`, and the healer logs
    // `[updown-heal] 1 scanned — … 0 waiting, 0 failed` on EVERY sweep — which appears long
    // before the summary. So every mutation was scored against the healer's own progress
    // line and reported `0 failed` while the suite was genuinely red with 3. The harness
    // called all 7 a MISS and would have sent a working guard back for rework.
    // Same trap as §0.1a's two tracker guards: never locate a result by words the run's own
    // output will also contain. `late-close: N passed, N failed` is a line only this suite
    // can print.
    const failed = Number(/late-close: \d+ passed, (\d+) failed/.exec(out)?.[1] ?? 0);
    // ⛔ Non-zero exit AND a named failure. A harness that only checked "the file changed"
    // once printed "✓ RED" for three mutations the guard silently passed.
    if (exitCode !== 0 && failed > 0) {
      caught++;
      console.log(`  ✓ RED  ${m.name}\n         → ${failed} failed · ${(/FAIL (.+)/.exec(out)?.[1] ?? "").slice(0, 88)}`);
    } else {
      missed.push(m.name);
      console.log(`  ✗ MISS ${m.name}\n         → exit ${exitCode}, ${failed} failed — the guard did NOT catch this`);
    }
  } finally {
    for (const b of backups.values()) writeFileSync(b.file, b.text);
  }
}

console.log(`\nRED HARNESS — ${caught}/${MUTATIONS.length} caught`);
if (missed.length) { for (const m of missed) console.log(`  · ${m}`); process.exit(1); }
