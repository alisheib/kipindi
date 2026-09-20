/**
 * RED PROOF for `test:house-bot-disclosure` §6 — the D19d chatbot guard.
 *
 *   npm run red:house-bot-chatbot
 *
 * ⛔ A GATE NOBODY HAS WATCHED FAIL IS NOT EVIDENCE. Every §6 assertion is put in front of a defect the real
 * code could contain, and this harness asserts the gate goes red for the RIGHT ONE — matched on
 * `FAIL <expect>`, never on a non-zero exit, because an exit code cannot tell a caught defect from a syntax
 * error, an unrelated regression, or a section that crashed before reaching the leg in question.
 *
 * ── 🔴 IT DOES NOT TOUCH THE REPOSITORY, AND THAT IS THE DESIGN, NOT A COURTESY ────────────────────────
 * Every other harness in this fleet rewrites real source and undoes it in a `finally`. This one copies the
 * files §6 reads into a scratch directory, mutates THERE, and runs the section against that shadow root.
 * The reason is on the record: two concurrent runs of a tree-mutating harness once left a live payout gate
 * DISABLED while the harness printed clean and `git diff` showed nothing. The subjects here are the file
 * that talks to players (`src/app/_actions/chat.ts`), the register a regulator's answers are drawn from,
 * and a shared branch a second agent is committing to today. §0 below MEASURES the promise: the repository's
 * `git status --porcelain` is captured before and after and asserted byte-identical.
 *
 * ⭐ WHAT MAKES THE SHADOW POSSIBLE is that §6 reads every one of its inputs under `ROOT` — the two chatbot
 * modules, the dictionary, the register, the support config AND its own assurance lexicon. That last one is
 * why the CONTROLS are provable too: `the-independent-pattern-goes-flat` widens a pattern in a shadow copy
 * of the lexicon and 6.c3, the positive control, goes red. With a static import that case could only have
 * been proved by editing the real file.
 *
 * ── ⭐ THE PART THIS LANE LEARNED THE HARD WAY ─────────────────────────────────────────────────────────
 * A refusal assertion cannot notice a deletion — absence is exactly what deleting text produces. This lane's
 * last two runs shipped a protection sweep that refused its own cleanup, and thirteen "this is refused"
 * assertions that passed HARDER while the feature was broken. So a case may declare `stillGreen`, and the
 * cases that delete a protected sentence do: they assert the positive control goes red AND that the refusal
 * assertions stay green — the measurement that says "only the positive control catches this".
 *
 * The cases are DATA, in `scripts/anchors/house-bot-chatbot.anchors.mjs`, so `test:red-anchors` §3 can audit
 * that every anchor still resolves exactly once against real source without running a thing.
 */
import { readFileSync, writeFileSync, mkdtempSync, mkdirSync, cpSync, rmSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { injectDefect } from "./red-anchor.mjs";
import { MUTATIONS } from "./anchors/house-bot-chatbot.anchors.mjs";
import { runChatbotCases } from "./lib/house-bot-chatbot-cases.mts";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * ⛔ THE SHADOW'S FILE LIST IS NOT A GUESS, AND IT IS NOT AUDITED BY READING IT. The pristine run below is
 * the proof: if a file §6 reads were missing from this list, the copy would not contain it and the section
 * would throw or fail a population floor — loudly, before a single mutation is applied. A list that is wrong
 * cannot print green here.
 *
 * ⚠️ `src/lib/support-config.ts` and the two `scripts/lib` modules are IMPORTED from the shadow (so their
 * own import closure has to be inside it — both are measured self-contained: neither carries an `import`).
 * The rest are read as text.
 */
const SHADOW_READS = [
  "src/app/_actions/chat.ts",
  "src/lib/chat/send-message.ts",
  "src/lib/i18n-dict.ts",
  "src/lib/support-config.ts",
  "src/lib/server/support-config.ts",
  "docs/COMPLIANCE-DECISIONS.md",
  "plans/house-bots/DEFERRED-TESTS.md",
  "scripts/lib/house-bot-assurances.mjs",
  "scripts/lib/house-bot-vocabulary.mjs",
];

/**
 * ⛔ THE UNCOVERED COUNT IS A RATCHET, ASSERTED AS AN EQUALITY, not a comment saying coverage is good.
 * It names the §6 cases that no mutation drives red, and those are exactly the ones whose subject is a
 * fixture this harness cannot reach: a control that builds its own degenerate input inside the cases module,
 * which is imported by identifier rather than read through `ROOT`. Each is two-directional in the suite
 * already, and each is a named row in `plans/house-bots/DEFERRED-TESTS.md` §1k (row 92) — NOT MEASURED with
 * its reason, never quietly dropped. ⛔ Raising this number is the one edit this file forbids; the count
 * comes DOWN to meet it.
 */
const UNCOVERED_CEILING = 5;

type Result = { label: string; pass: boolean; detail: string };

let pass = 0;
const fails: string[] = [];
const ok = (name: string, cond: boolean, detail = "") => {
  if (cond) { pass++; console.log(`  PASS ${name}${detail ? ` — ${detail}` : ""}`); }
  else { fails.push(`${name}${detail ? ` — ${detail}` : ""}`); console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`); }
  return cond;
};

const git = (cwd: string, args: string[]) => execFileSync("git", ["-C", cwd, ...args], { encoding: "utf8" });

/** Run §6 against a root and collect every assertion. A throw is a result too — a section that crashed
 *  proves nothing, and must never be read as "the defect was caught". */
async function runAgainst(root: string): Promise<{ results: Result[]; crash: string | null }> {
  const results: Result[] = [];
  try {
    await runChatbotCases((label, cond, detail = "") => results.push({ label, pass: !!cond, detail }), () => {}, root);
    return { results, crash: null };
  } catch (e) {
    return { results, crash: e instanceof Error ? `${e.message}` : String(e) };
  }
}

const red = (r: Result[]) => r.filter((x) => !x.pass).map((x) => x.label.split(" · ").slice(0, 2).join(" · "));
const matching = (r: Result[], needle: string) => r.filter((x) => x.label.includes(needle));

console.log(`\nhouse-bot-chatbot-red — ${MUTATIONS.length} declared mutation(s) against test:house-bot-disclosure §6\n`);

// ── §0 · the tree this harness must leave exactly as it found it ────────────────────────────────────
const statusBefore = git(ROOT, ["status", "--porcelain"]);
const parent = mkdtempSync(join(tmpdir(), "hb-chatbot-red-"));
let template = "";

try {
  console.log("§0 · the shadow tree — built once, committed once, copied per case");
  {
    template = join(parent, "template");
    for (const rel of SHADOW_READS) {
      const src = join(ROOT, rel);
      if (!existsSync(src)) { ok(`0.copy · ${rel} exists in the tree`, false, "missing — the shadow cannot be built"); continue; }
      const dest = join(template, rel);
      mkdirSync(dirname(dest), { recursive: true });
      cpSync(src, dest);
    }
    /**
     * ⛔ A SCRATCH REPOSITORY, SO 6.6 IS MEASURED AND NOT MERELY BLIND. `git diff --quiet <ref> -- <path>`
     * against a path that does not exist on the ref exits 0 — clean, and completely uninformative — which
     * is why 6.6 refuses to report clean unless the ref resolves AND the path is a real blob on it. A shadow
     * with no repository would make every case's 6.6 say NOT MEASURED, and the chat.ts cases would then be
     * "red" for the wrong reason. `origin/main` here is the PRISTINE copy, so a mutated chat.ts differs from
     * it for exactly the reason the real assertion names.
     */
    git(template, ["init", "-q"]);
    git(template, ["add", "-A", "-f"]);
    git(template, ["-c", "user.email=red@local", "-c", "user.name=red", "-c", "commit.gpgsign=false", "commit", "-q", "-m", "pristine"]);
    git(template, ["update-ref", "refs/remotes/origin/main", "HEAD"]);
    ok("0.1 · the shadow carries every file §6 reads, committed as its own origin/main",
       SHADOW_READS.every((rel) => existsSync(join(template, rel))) && git(template, ["rev-parse", "--short", "origin/main"]).trim().length >= 7,
       `${SHADOW_READS.length} file(s) · scratch origin/main ${git(template, ["rev-parse", "--short", "origin/main"]).trim()} · ${parent}`);
  }

  // ── §1 · ⭐ THE POSITIVE CONTROL FOR THE WHOLE HARNESS ────────────────────────────────────────────
  /**
   * ⛔ WITHOUT THIS, EVERY RED BELOW WOULD BE WORTHLESS. A shadow tree missing a file, a dictionary that
   * would not import, a scratch repo whose ref did not resolve — each makes the section red for a reason
   * that has nothing to do with the planted defect, and 26 cases would all report "went red" and look like
   * a triumph. The unmutated shadow must be GREEN, assertion for assertion, before anything is planted.
   */
  console.log("\n§1 · ⭐ POSITIVE CONTROL — the UNMUTATED shadow is green, assertion for assertion");
  const pristineDir = join(parent, "case-pristine");
  cpSync(template, pristineDir, { recursive: true });
  const pristine = await runAgainst(pristineDir);
  ok("1.1 · the section ran against the shadow without crashing", pristine.crash === null, pristine.crash ?? "");
  ok("1.2 · ⭐ every §6 assertion PASSES on the unmutated shadow — so a red below is the plant, not the shadow",
     pristine.results.length > 0 && pristine.results.every((r) => r.pass),
     `${pristine.results.length} assertion(s) · red: [${red(pristine.results).join(" | ") || "none"}]`);
  const liveCount = Number(/(\d+) passed/.exec(
    execFileSync("npx", ["tsx", "scripts/house-bot-disclosure.test.mts"], { cwd: ROOT, encoding: "utf8", shell: true }).split("\n").filter((l) => l.includes("house-bot-disclosure:")).join(""),
  )?.[1] ?? "0");
  ok("1.3 · POPULATION · the shadow runs the same §6 the live suite runs — every §6 label of the real run is present here",
     pristine.results.length >= 30 && liveCount >= pristine.results.length,
     `shadow §6 ${pristine.results.length} assertion(s) · live suite ${liveCount} assertion(s) in total`);

  // ── §2 · every declared `expect` names a real assertion ──────────────────────────────────────────
  /**
   * ⛔ AN `expect` THAT NAMES NOTHING CAN NEVER FAIL TO MATCH — the case would report "went red" off some
   * other assertion, or report a wrong reason forever. This is the same rot `test:red-anchors` §3 exists for,
   * pointed at the label instead of the anchor.
   */
  console.log("\n§2 · every declared expect and stillGreen names exactly one live assertion");
  for (const m of MUTATIONS) {
    const hits = matching(pristine.results, m.expect);
    ok(`2.${m.name} · expect names exactly one §6 assertion`, hits.length === 1,
       hits.length === 1 ? hits[0].label.split(" · ").slice(0, 2).join(" · ") : `${hits.length} label(s) contain "${m.expect}"`);
    for (const g of m.stillGreen ?? []) {
      ok(`2.${m.name} · stillGreen "${g.slice(0, 40)}" names a live assertion`, matching(pristine.results, g).length >= 1);
    }
  }

  // ── §3 · the coverage ratchet ────────────────────────────────────────────────────────────────────
  console.log("\n§3 · the ratchet — §6 assertions no mutation drives red");
  {
    const claimed = MUTATIONS.flatMap((m) => [m.expect, ...(m.alsoRed ?? [])]);
    const uncovered = pristine.results.filter((r) => !claimed.some((c) => r.label.includes(c))).map((r) => r.label.split(" · ").slice(0, 2).join(" · "));
    console.log(`     uncovered (${uncovered.length}): ${uncovered.join(" | ") || "none"}`);
    ok(`3.1 · ★ ${uncovered.length} of ${pristine.results.length} §6 assertions have no declared mutation (ceiling ${UNCOVERED_CEILING})`,
       uncovered.length <= UNCOVERED_CEILING, `${uncovered.length} vs ${UNCOVERED_CEILING}`);
    ok("3.2 · ⛔ …and if that count drops, LOWER THE CEILING in the same commit",
       uncovered.length === UNCOVERED_CEILING, `${uncovered.length} vs ${UNCOVERED_CEILING} — a ceiling above the real count stops being a ratchet`);
  }

  // ── §4 · the mutations ───────────────────────────────────────────────────────────────────────────
  console.log("\n§4 · every declared defect, planted in a COPY, drives its own assertion red");
  let n = 0;
  for (const m of MUTATIONS) {
    n++;
    const dir = join(parent, `case-${n}`);
    cpSync(template, dir, { recursive: true });
    const target = join(dir, m.file);
    let mutated: string;
    try { mutated = injectDefect(readFileSync(target, "utf8"), m.from, m.to); }
    catch (e) { ok(`4.${m.name} · could be planted`, false, `${m.file}: ${e instanceof Error ? e.message : String(e)}`); rmSync(dir, { recursive: true, force: true }); continue; }
    writeFileSync(target, mutated, "utf8");

    const run = await runAgainst(dir);
    const reds = red(run.results);
    if (run.crash) {
      ok(`4.${m.name} · the gate goes red for the declared reason`, false, `the section CRASHED instead — ${run.crash}`);
    } else {
      const hit = matching(run.results, m.expect);
      const caught = hit.length === 1 && !hit[0].pass;
      ok(`4.${m.name} · FAIL ${m.expect.slice(0, 54)}`, caught,
         caught ? `red: [${reds.join(" | ")}]` : `⛔ WRONG REASON — expected that assertion red; red were: [${reds.join(" | ") || "nothing at all"}]`);
      for (const g of m.stillGreen ?? []) {
        const still = matching(run.results, g);
        ok(`4.${m.name} · ⭐ …and "${g.slice(0, 44)}" STAYS GREEN — only the positive control catches this`,
           still.length >= 1 && still.every((x) => x.pass), `${still.filter((x) => !x.pass).length} of ${still.length} went red`);
      }
      for (const a of m.alsoRed ?? []) {
        const also = matching(run.results, a);
        ok(`4.${m.name} · …and "${a.slice(0, 44)}" is red too, as declared`, also.length >= 1 && also.some((x) => !x.pass));
      }
    }
    rmSync(dir, { recursive: true, force: true });
  }
} finally {
  rmSync(parent, { recursive: true, force: true });
}

// ── §5 · the promise this harness makes about the repository ────────────────────────────────────────
console.log("\n§5 · ⛔ the repository is exactly as it was found");
{
  const statusAfter = git(ROOT, ["status", "--porcelain"]);
  ok("5.1 · ⛔ `git status --porcelain` is byte-identical before and after — every mutation lived and died in a scratch directory",
     statusAfter === statusBefore,
     statusAfter === statusBefore ? `${statusBefore.split("\n").filter(Boolean).length} dirty path(s), unchanged` : `BEFORE:\n${statusBefore}\nAFTER:\n${statusAfter}`);
  ok("5.2 · the scratch directory is gone", !existsSync(parent), parent);
}

console.log(`\nhouse-bot-chatbot-red: ${pass} passed, ${fails.length} failed\n`);
for (const f of fails) console.log(`  · ${f}`);
process.exit(fails.length ? 1 : 0);
