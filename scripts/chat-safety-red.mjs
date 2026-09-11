/**
 * RED harness for `npm run test:chat-safety` (SUPPORT & CARE Unit 6).
 *
 *   node scripts/chat-safety-red.mjs
 *
 * ⛔ IT DOES NOT WRITE TO src/. Every mutation goes to a COPY of the corpus in the
 * OS temp dir and the gate is aimed at it with `CHAT_SAFETY_ROOT`; the gate prints
 * the root it read on every run, and the tree is asserted unchanged at the end.
 *
 * "It exited non-zero" is not evidence — each run must name the CHECK that failed,
 * or a typo in this file would score as a caught defect.
 *
 * ⚠️ §2 IS NOT MUTATED HERE AND CANNOT BE. It imports the product directly, so it
 * always reads the real tree whatever `CHAT_SAFETY_ROOT` says. §2's red proof is
 * the recorded pre-fix run instead: against HEAD 140fcc6a it failed 2.2 on all five
 * Chinese phrases, on two Swahili ones, on 2.3 (a Swahili sentence detected as
 * English), and on 2.6 for all three locales of the platform's own FAQ question.
 * ⭐ That is a stronger proof than a mutation would have been — it is the guard
 * going red against the real, unfixed product rather than against a planted defect.
 */
import { readFileSync, writeFileSync, mkdtempSync, mkdirSync, cpSync, globSync } from "node:fs";
import { execSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";

const cwd = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const FILES = [
  ...globSync("src/**/*.tsx", { cwd }),
  ...globSync("src/**/*.ts", { cwd }),
].map((f) => f.replace(/\\/g, "/"));
const ORIGINAL = new Map(FILES.map((f) => [f, readFileSync(join(cwd, f), "utf8")]));

const CHAT_ROOT = "src/components/chat/ChatRoot.tsx";
const ACTION = "src/app/_actions/chat.ts";
const DICT = "src/lib/i18n-dict.ts";
const CARD = "src/components/chat/messages/EscalateHandoff.tsx";

const MUTATIONS = [
  {
    // 🔴 UNIT 6.1 ITSELF, PUT BACK: delete the interception and every backend
    // outcome bypasses the safety card again.
    name: "6.1 restored — the at-risk filter is gone from the send handler",
    check: "1.1",
    file: CHAT_ROOT,
    from: `      const intercepted = atRiskReply(text);`,
    to: `      const intercepted = null;`,
  },
  {
    // ⭐ THIS SLOT HELD AN ORDERING MUTATION AND IT WAS RE-AIMED, WHICH IS WORTH
    // RECORDING RATHER THAN HIDING. The first attempt added a SECOND
    // `chatWithClaude` call in order to make one happen earlier — so it broke the
    // subject two ways at once and the run failed on 1.5 (two call sites) instead
    // of on 1.1. A mutation that breaks two things proves nothing about either:
    // the gate went red for the wrong reason and scored as a MISS, correctly.
    // ⛔ A pure textual reorder is not expressible as a one-line substitution here,
    // because the two statements live in different scopes. So the slot now tests
    // what the failed attempt actually revealed — that a second backend call site
    // makes the offset comparison in 1.1 meaningless, and that 1.5 says so.
    name: "a second backend call site — the offset comparison in 1.1 becomes meaningless",
    check: "1.5",
    file: CHAT_ROOT,
    from: `        const liveResult = await chatWithClaude(historyForClaude, text, locale);`,
    to: `        const warm = await chatWithClaude([], "", locale);\n        const liveResult = warm ?? await chatWithClaude(historyForClaude, text, locale);`,
  },
  {
    // ⭐ COMPUTE THE ANSWER AND IGNORE IT — the `chat-availability` lesson, which
    // is that reading a switch and not branching on it is the same bug in better
    // clothes. 1.1 still passes here; only 1.4 can catch it.
    name: "the filter is called and its answer discarded — no early return",
    check: "1.4",
    file: CHAT_ROOT,
    from: `      if (intercepted) {\n        setMessages((prev) => [...prev, intercepted]);`,
    to: `      if (intercepted && false) {\n        setMessages((prev) => [...prev, intercepted]);`,
  },
  {
    // ⭐ THE ZERO-POPULATION CASE for §1: delete the live backend entirely and the
    // ORDERING claim in 1.1 becomes vacuously true. Only the control catches it.
    name: "delete the live backend — an ordering claim over one thing must FAIL",
    check: "1.2",
    file: CHAT_ROOT,
    from: `        const liveResult = await chatWithClaude(historyForClaude, text, locale);`,
    to: `        const liveResult = null;`,
  },
  {
    // 🔴 UNIT 6.2 PUT BACK on the server side.
    name: "6.2 restored — the daily-cap reply stops admitting it is not an answer",
    check: "3.2",
    file: ACTION,
    from: `    return { text: capacityMessage(locale), unresolved: true };`,
    to: `    return { text: capacityMessage(locale) };`,
  },
  {
    // 🔴 UNIT 6.2 PUT BACK on the client side — the half that made the whole
    // mechanism dead, and the half a server-only guard would have missed.
    name: "6.2 restored — ChatRoot drops `unresolved` when it wraps the live reply",
    check: "3.3",
    file: CHAT_ROOT,
    from: `unresolved: liveResult.unresolved, ts: Date.now() }`,
    to: `ts: Date.now() }`,
  },
  {
    // 🔴 UNIT 6.3 PUT BACK, in ENGLISH ONLY — the shape that matters, because a
    // guard that scanned one locale would go green over two false translations.
    name: "6.3 restored in EN only — the card promises an attachment again",
    check: "4.3",
    file: DICT,
    from: `      handoffBody: "This opens an email to our support desk. Please describe what you need, and include anything from this conversation that matters.",`,
    to: `      handoffBody: "Your chat history is attached so you won't have to repeat anything.",`,
  },
  {
    // ⭐ THE `6.7` SHAPE — the claim MOVES to a different key the card renders.
    // This is the mutation that a population of one pinned key cannot survive, and
    // it is the reason §4 discovers its keys from the component.
    name: "the promise moves to another key the card renders — a pinned-key guard would miss it",
    check: "4.3",
    file: DICT,
    from: `      specialistTakeOver: "A specialist will take this from here",`,
    to: `      specialistTakeOver: "A specialist will take this from here — you'll get a notification",`,
  },
  {
    // ⭐ THE ZERO-POPULATION CASE for §4: stop rendering the key at all and the
    // scan has nothing left to look at. Only the control catches it.
    name: "the card stops rendering handoffBody — a scan over zero keys must FAIL",
    check: "4.1",
    file: CARD,
    from: `          {t.chat.handoffBody}`,
    to: `          {""}`,
  },
];

const lf = (s) => s.replace(/\r\n/g, "\n");
let caught = 0;
const missed = [];

for (const [i, m] of MUTATIONS.entries()) {
  const base = lf(ORIGINAL.get(m.file) ?? "");
  if (!base.includes(lf(m.from))) {
    console.log(`  ✗ ${m.name}\n      ⛔ ANCHOR NOT FOUND in ${m.file} — the harness is broken, not the gate.`);
    missed.push(`${m.name} (anchor missing)`);
    continue;
  }
  const root = mkdtempSync(join(tmpdir(), `chat-safety-red-${i}-`));
  for (const f of FILES) {
    mkdirSync(join(root, dirname(f)), { recursive: true });
    cpSync(join(cwd, f), join(root, f));
  }
  const mutated = base.replace(lf(m.from), lf(m.to));
  if (mutated === base) {
    console.log(`  ✗ ${m.name}\n      ⛔ MUTATION IS A NO-OP — the harness is broken, not the gate.`);
    missed.push(`${m.name} (no-op)`);
    continue;
  }
  writeFileSync(join(root, m.file), mutated);

  let exitCode = 0, out = "";
  try {
    out = execSync("npx tsx scripts/chat-safety.test.mts", {
      cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, CHAT_SAFETY_ROOT: root },
    });
  } catch (e) {
    exitCode = e.status ?? 1;
    out = `${e.stdout ?? ""}${e.stderr ?? ""}`;
  }

  const failedCheck = new RegExp(`^\\s*FAIL ${m.check.replace(".", "\\.")} `, "m").test(out);
  const readTheCopy = out.includes(root);
  const ok = exitCode !== 0 && readTheCopy && failedCheck;

  if (ok) {
    caught++;
    const line = out.split("\n").find((l) => l.trim().startsWith(`FAIL ${m.check}`)) ?? "";
    console.log(`  ✓ RED  ${m.name}\n         → ${line.trim().slice(0, 130)}`);
  } else {
    missed.push(m.name);
    const why = !readTheCopy
      ? "the gate did NOT read the mutated copy — CHAT_SAFETY_ROOT was ignored"
      : exitCode === 0
        ? "the gate PASSED over a corpus that breaks it"
        : `exit ${exitCode}, but check ${m.check} was not the one that failed`;
    console.log(`  ✗ MISS ${m.name}\n         → ${why}`);
  }
}

for (const [f, text] of ORIGINAL) {
  if (readFileSync(join(cwd, f), "utf8") !== text) {
    console.log(`\n⛔ ${f} CHANGED. This harness must never write to the working tree.`);
    process.exit(1);
  }
}

console.log(`\nRED HARNESS (chat-safety) — ${caught}/${MUTATIONS.length} caught · src/ untouched`);
if (missed.length) {
  for (const m of missed) console.log(`  · ${m}`);
  process.exit(1);
}
