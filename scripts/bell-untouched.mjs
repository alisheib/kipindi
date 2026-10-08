/**
 * `qa:bell-untouched` — S6 NEVER TOUCHED THE CLASSIC BELL (the Vodacom plan S6,
 * `docs/design-system/v5-2026-09-29-simplified-journey/S6-PLAN.md` amendment A1, "Still owed (2)").
 *
 *   npm run qa:bell-untouched                                   (after a git fetch, so origin/main is today's)
 *   npm run qa:bell-untouched -- --since <sha> --main <ref>
 *
 * A1 kept `src/components/layout/notifications-panel.tsx` — the bell every live player has — out of S6 until S15: the
 * journey's tab dot and Arifa row were given a counter of their own instead of a store shared with the bell (critic G1,
 * G10). This proves the promise from git, three ways:
 *   1 · A1's own command, as written: `git diff --exit-code $(git merge-base origin/main HEAD) HEAD -- <the bell>`.
 *   2 · ⚠️ THE SAME DIFF FROM THE PLAN'S OWN COMMIT — the commit that added S6-PLAN.md ("the flagged-shell build plan
 *       filed": no S6 code before it), found by git, never typed. S6 went to main package by package, so the merge
 *       base with origin/main is the last commit this branch pushed, and check 1 covers only what is still unpushed.
 *       Check 2 covers the whole of S6.
 *   3 · the working tree and the index hold no change to the bell either.
 * ⭐ CONTROLS FIRST, or a clean diff means nothing: every revision resolves, the plan's commit is an ancestor of HEAD,
 * the bell exists at every revision compared (a moved or deleted file diffs as empty), the same diff over S6's range
 * DOES see S6's change to `app-shell.tsx` (WP6b's swap), and the same diff DOES see the bell's own last change before
 * the plan — so the path is the bell's, and a change to it would be seen.
 * ⚠️ ANOTHER LANE MAY FIX THE BELL (A1's own reason for keeping this out of predeploy), and S6's packages were rebased
 * over other lanes' commits, so check 2's range holds both. When the bell changed in that range, the commits that
 * touched it are listed: one whose subject names the plan ("Vodacom …", "S6: …") is S6's, and fails the run; when none
 * does, the run says READ EACH (exit 3) — never a pass, and never a blame, because S6 also committed under other
 * subjects (A0 "fix(positions): …", A8 "fix(cashout): …", the red twins it re-armed). A subject is a hint, not a verdict.
 * ⛔ NOT IN PREDEPLOY, AND NOT A TEST KEY (`test:all` runs every one of those): another lane's fix must not turn
 * anybody's battery red (A1).
 * Git reads only, with `--no-optional-locks`, so it never takes the index lock a running battery may hold.
 * Exit 0 = untouched · 1 = touched (by S6's own commits, the unpushed range or the tree) · 2 = refused, or a control
 * failed · 3 = touched in S6's range only by commits that do not name the plan: read each.
 */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const BELL = "src/components/layout/notifications-panel.tsx";
/** A file S6 certainly changed (WP6b's shell swap): the control that this diff can see a change at all. */
const CONTROL = "src/components/layout/app-shell.tsx";
/** The plan. The commit that ADDED it is where S6 began (`docs/VODACOM-PLAN.md` §0i, "Plan filed"). */
const PLAN_DOC = "docs/design-system/v5-2026-09-29-simplified-journey/S6-PLAN.md";
/** A commit subject that names the plan: S6's own packages and records. */
const PLAN_SUBJECT = /^(?:Vodacom|S6)(?![\w-])/;
const NL = String.fromCharCode(10);
const argv = process.argv.slice(2);
const valueOf = (flag) => {
  const i = argv.indexOf(flag);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : null;
};
const MAIN = valueOf("--main") ?? process.env.KP_PARITY_MAIN ?? "origin/main";
const git = (...args) => {
  const r = spawnSync("git", ["--no-optional-locks", "-C", ROOT, ...args], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  return { code: r.status ?? -1, out: (r.stdout ?? "").trim(), err: (r.stderr ?? "").trim() || (r.error ? String(r.error.message) : "") };
};
const short = (sha) => String(sha ?? "").slice(0, 8);

let passed = 0;
const failed = [];
const ok = (label, cond, extra = "") => {
  if (cond) {
    passed++;
    console.log(`  ✓ ${label}`);
  } else {
    failed.push(label);
    console.log(`  ✗ ${label}${extra ? ` ${extra}` : ""}`);
  }
};
const refuse = (why) => {
  console.log(`${NL}REFUSED — ${why}`);
  process.exit(2);
};

console.log(`${NL}[bell-untouched] ${BELL}`);
const head = git("rev-parse", "--verify", "HEAD^{commit}");
if (head.code !== 0) refuse(`HEAD does not resolve (${head.err})`);
const main = git("rev-parse", "--verify", `${MAIN}^{commit}`);
if (main.code !== 0) refuse(`${MAIN} does not resolve (${main.err}) — fetch it, or name another with --main`);
const named = valueOf("--since") ?? process.env.KP_S6_SINCE ?? null;
const added = named ? null : git("log", "--diff-filter=A", "--format=%H", "--reverse", head.out, "--", PLAN_DOC);
const SINCE = named ?? (added && added.code === 0 ? added.out.split(NL)[0] : "");
if (!SINCE) refuse(`no commit in HEAD's history adds ${PLAN_DOC} (${added?.err || "none found"}) — name the plan's commit with --since`);
const since = git("rev-parse", "--verify", `${SINCE}^{commit}`);
if (since.code !== 0) refuse(`the plan's commit ${SINCE} does not resolve (${since.err}) — name it with --since`);
if (git("merge-base", "--is-ancestor", since.out, head.out).code !== 0) {
  refuse(`${short(since.out)} is not an ancestor of HEAD — the history was rewritten; name the plan's rewritten commit with --since`);
}
const base = git("merge-base", main.out, head.out);
if (base.code !== 0 || !base.out) refuse(`${MAIN} and HEAD share no merge base (${base.err})`);
console.log(`  HEAD ${short(head.out)} · ${MAIN} ${short(main.out)} · merge base ${short(base.out)}${base.out === head.out ? " (HEAD itself: nothing is unpushed)" : ""} · S6 began after ${short(since.out)} (${named ? "named by --since / KP_S6_SINCE" : "the commit that added S6-PLAN.md"})`);

console.log(`${NL}§0 · controls`);
const exists = (rev) => git("cat-file", "-e", `${rev}:${BELL}`).code === 0;
ok("0.1 the bell exists at HEAD, at the merge base and at the plan's commit — a file that moved would diff as empty",
  exists(head.out) && exists(base.out) && exists(since.out));
const seen = git("diff", "--quiet", since.out, head.out, "--", CONTROL);
ok(`0.2 control · the same diff over S6's range sees S6's change to ${CONTROL}`, seen.code === 1,
  `(exit ${seen.code}${seen.err ? `: ${seen.err}` : ""} — expected 1, a difference)`);
const lastBefore = git("log", "-1", "--format=%H", since.out, "--", BELL);
const seenBell = lastBefore.code === 0 && lastBefore.out
  ? git("diff", "--quiet", `${lastBefore.out}^`, lastBefore.out, "--", BELL)
  : { code: -1, err: lastBefore.err || "no commit before the plan touched it" };
ok(`0.3 control · the same diff sees the bell's own last change before the plan (${short(lastBefore.out) || "none"})`, seenBell.code === 1,
  `(exit ${seenBell.code}${seenBell.err ? `: ${seenBell.err}` : ""} — expected 1, a difference)`);
if (failed.length) refuse("a control failed, so a clean diff below would mean nothing");

console.log(`${NL}§1 · the bell`);
const asWritten = git("diff", "--exit-code", "--stat", base.out, head.out, "--", BELL);
ok(`1 A1 as written — no change from the merge base with ${MAIN} to HEAD`, asWritten.code === 0,
  asWritten.code === 1 ? `${NL}${asWritten.out}` : `(exit ${asWritten.code}: ${asWritten.err})`);
const sinceS6 = git("diff", "--exit-code", "--stat", since.out, head.out, "--", BELL);
let readEach = false;
if (sinceS6.code === 1) {
  const touched = git("log", "--format=%h %ad %s", "--date=short", `${since.out}..${head.out}`, "--", BELL).out.split(NL).filter(Boolean);
  const plans = touched.filter((l) => PLAN_SUBJECT.test(l.split(" ").slice(2).join(" ")));
  const listed = touched.map((l) => `    ${PLAN_SUBJECT.test(l.split(" ").slice(2).join(" ")) ? "S6 →" : "  ? "} ${l}`).join(NL);
  if (plans.length) {
    ok(`2 since the plan's commit ${short(since.out)} — no change anywhere in S6's range`, false,
      `${NL}${sinceS6.out}${NL}  touched by (S6 → names the plan):${NL}${listed}`);
  } else {
    readEach = true;
    console.log(`  ? 2 since the plan's commit ${short(since.out)} — the bell CHANGED in S6's range, and no commit that touched it names the plan:${NL}${sinceS6.out}${NL}${listed}`);
    console.log("    ⚠️ Not a verdict either way: S6 also committed under other subjects, and its packages were rebased over other lanes' commits. Read each commit above — one that is S6's is a failure (A1); another lane's fix is not S6's.");
  }
} else {
  ok(`2 since the plan's commit ${short(since.out)} — no change anywhere in S6's range`, sinceS6.code === 0,
    `(exit ${sinceS6.code}: ${sinceS6.err})`);
}
const tree = git("diff", "--exit-code", "--stat", "HEAD", "--", BELL);
ok("3 the working tree and the index hold no change to it", tree.code === 0,
  tree.code === 1 ? `${NL}${tree.out}` : `(exit ${tree.code}: ${tree.err})`);

const verdict = failed.length ? "❌ TOUCHED" : readEach ? "❓ READ EACH" : "✅ UNTOUCHED";
console.log(`${NL}${verdict} — ${passed} passed, ${failed.length} failed${readEach ? ", 1 to read" : ""}`);
process.exit(failed.length ? 1 : readEach ? 3 : 0);
