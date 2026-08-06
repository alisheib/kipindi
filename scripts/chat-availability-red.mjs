/**
 * RED harness for `npm run test:chat-availability` (E-123).
 *
 *   node scripts/chat-availability-red.mjs
 *
 * ⛔ IT DOES NOT WRITE TO src/. Two sessions share this working tree. Every
 * mutation goes to a COPY of the `.tsx` corpus in the OS temp dir and the gate is
 * aimed at it with `CHAT_ROOT`; the gate prints the root it read on every run.
 * The tree is asserted unchanged at the end.
 *
 * "It exited non-zero" is not evidence — each run must name the CHECK that
 * failed, or a typo in this file would score as a caught defect.
 */
import { readFileSync, writeFileSync, mkdtempSync, mkdirSync, cpSync, globSync } from "node:fs";
import { execSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";

const cwd = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const FILES = globSync("src/**/*.tsx", { cwd }).map((f) => f.replace(/\\/g, "/"));
const ORIGINAL = new Map(FILES.map((f) => [f, readFileSync(join(cwd, f), "utf8")]));

const MUTATIONS = [
  {
    // 🔴 E-123 ITSELF, PUT BACK: the card rendered unconditionally, with no read
    // of the switch anywhere in the file.
    name: "E-123 restored — /help advertises live chat without asking whether it exists",
    check: "1.1",
    file: "src/app/help/page.tsx",
    from: `  const chatEnabled = await isChatbotEnabled().catch(() => true);`,
    to: `  const chatEnabled = true;`,
  },
  {
    // ⛔ THE OTHER END OF THE COUPLING. Remove the gate from the mount and the
    // promise becomes true again by accident — and a gate that only watched the
    // advertisers would go on passing while guarding nothing.
    name: "mount <ChatRoot /> unconditionally — the coupling loses its other end",
    check: "2.2",
    file: "src/components/layout/lazy-overlays.tsx",
    from: `      {chatbotEnabled && <ChatRoot />}`,
    to: `      <ChatRoot />`,
  },
  {
    // ⭐ THE ZERO-COVERAGE CASE. Rename the promise key and rule 1.1 has nothing
    // left to inspect — which is a gate passing because it stopped looking, the
    // exact shape `checks-that-lie` names. 1.2 must catch it.
    name: "rename the promise key out of the corpus — a gate over zero files must FAIL",
    check: "1.2",
    file: "src/app/help/page.tsx",
    from: `          title={t.help.liveChat}\n            value={t.help.inApp}\n            sub={t.help.tapChatBubble}`,
    to: `          title={t.help.liveChatRenamed}\n            value={t.help.inApp}\n            sub={t.help.tapChatBubbleRenamed}`,
  },
];

const lf = (s) => s.replace(/\r\n/g, "\n");
let caught = 0;
const missed = [];

for (const [i, m] of MUTATIONS.entries()) {
  const base = lf(ORIGINAL.get(m.file) ?? "");
  if (!base.includes(m.from)) {
    console.log(`  ✗ ${m.name}\n      ⛔ ANCHOR NOT FOUND in ${m.file} — the harness is broken, not the gate.`);
    missed.push(`${m.name} (anchor missing)`);
    continue;
  }
  const root = mkdtempSync(join(tmpdir(), `chat-red-${i}-`));
  for (const f of FILES) {
    mkdirSync(join(root, dirname(f)), { recursive: true });
    cpSync(join(cwd, f), join(root, f));
  }
  const mutated = base.replace(m.from, m.to);
  if (mutated === base) {
    console.log(`  ✗ ${m.name}\n      ⛔ MUTATION IS A NO-OP — the harness is broken, not the gate.`);
    missed.push(`${m.name} (no-op)`);
    continue;
  }
  writeFileSync(join(root, m.file), mutated);

  let exitCode = 0, out = "";
  try {
    out = execSync("npx tsx scripts/chat-availability.test.mts", {
      cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, CHAT_ROOT: root },
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
    console.log(`  ✓ RED  ${m.name}\n         → ${line.trim().slice(0, 120)}`);
  } else {
    missed.push(m.name);
    const why = !readTheCopy
      ? "the gate did NOT read the mutated copy — CHAT_ROOT was ignored"
      : exitCode === 0
        ? "the gate PASSED over a corpus that breaks it"
        : `exit ${exitCode}, but check ${m.check} was not the one that failed`;
    console.log(`  ✗ MISS ${m.name}\n         → ${why}`);
  }
}

for (const [f, text] of ORIGINAL) {
  if (readFileSync(join(cwd, f), "utf8") !== text) {
    console.log(`\n⛔ ${f} CHANGED. This harness must never write to the shared tree.`);
    process.exit(1);
  }
}

console.log(`\nRED HARNESS (chat-availability) — ${caught}/${MUTATIONS.length} caught · src/ untouched`);
if (missed.length) {
  for (const m of missed) console.log(`  · ${m}`);
  process.exit(1);
}
