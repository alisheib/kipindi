/**
 * ADMIN CLIPPING — text that is cut off INSIDE its own card.
 *
 *   npx tsx scripts/admin-clip.test.mts      (npm run test:admin-clip)
 *
 * ⛔ WHY THIS EXISTS (finding E-30, live QA campaign 2026-08-01). Two admin surfaces were
 * clipping text mid-word on production, in all three locales, and **every existing check
 * was green**:
 *
 *   · `/admin/updown/proposals` @360 — the "Awaiting you" tile read `▲ 0 review · 0 arm`,
 *     21px past its card;
 *   · every admin page @768 — the breadcrumb `Admin / Up & Down / Proposals` ran 34px past
 *     its nav.
 *
 * ⭐ THE REASON NOTHING CAUGHT IT, and the reason this file is structural rather than a
 * screenshot diff: **clipping inside a card never reaches `document.scrollWidth`.** The
 * campaign's standing bar — "0 horizontal overflow" — is a DOCUMENT measure, and it was
 * honestly reporting 0 while the text was unreadable. A green audit is not a readable
 * screen.
 *
 * ⭐ ONE ROOT CAUSE, and it is a CSS default rather than a typo: a flex item's
 * `min-width` defaults to `auto`, which refuses to shrink below its content. So
 * `whitespace-nowrap` (the KPI delta) or `truncate` (the breadcrumb crumb) inside a flex
 * row does nothing at all unless something on the chain sets `min-w-0`. `truncate` on a
 * child whose PARENT cannot shrink is decoration.
 *
 * ⛔ AND THE MITIGATION THAT DID NOT WORK, because it is the reason this is a test and not
 * a comment: the KPI already carried a warning — *"Keep every `delta` SHORT… at 360px a
 * long string is clipped mid-word"* — and the very line carrying that comment was clipped
 * anyway. Its author had already shortened "armed" to "arm". **A convention its own author
 * cannot satisfy while writing it down is not a mitigation.** The component has to be safe
 * for any caller.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p: string) => readFileSync(join(ROOT, p), "utf8");

let pass = 0, fail = 0;
const ok = (l: string, c: boolean, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"} ${l}${x ? ` — ${x}` : ""}`); };

const shell = read("src/components/admin/admin-shell.tsx");
/**
 * ⚠️ E-70 (c83fe83a, session 70) moved the breadcrumb markup VERBATIM out of the shell into its
 * own client component, so the trail re-derives from usePathname() instead of freezing on a
 * layout-computed header. The E-30 box-model fixes travelled WITH it — so this guard follows the
 * MARKUP, not the file it used to live in. Nothing about what §2 measures changes.
 */
const crumbsSrc = read("src/components/admin/admin-crumbs.tsx");

/** The class list of the single element matching `anchor`, for precise assertions. */
function classesNear(src: string, anchor: string, window = 400): string {
  const i = src.indexOf(anchor);
  if (i < 0) return "";
  return src.slice(i, i + window);
}

// ── 1 · The KPI delta must be safe for ANY caller ────────────────────────────
console.log("\n── 1 · AdminKpi's delta cannot be clipped by a long string ──");
{
  // ⚠️ Window generously. The first version read 700 chars from `delta && (` and went red
  // when the fix's own explanatory comment pushed the class list past the end — a guard
  // that fails because the code gained a comment teaches the next session to delete it.
  const deltaSpan = classesNear(shell, "delta && (", 2000);
  ok("1.0 · the delta span was found (not a vacuous pass)",
     deltaSpan.length > 0 && deltaSpan.includes("deltaDir === \"up\""),
     "the window must actually reach the span's classes");
  ok("1.1 · ⛔ the delta truncates rather than overflowing its card",
     /overflow-hidden/.test(deltaSpan) && /text-ellipsis/.test(deltaSpan), deltaSpan.slice(0, 80));
  ok("1.2 · ⛔ …and it can actually shrink (min-w-0 defeats flex min-width:auto)",
     /min-w-0/.test(deltaSpan));
  ok("1.3 · the full string stays reachable when truncated",
     /title=\{delta\}/.test(deltaSpan),
     "a truncated value that cannot be read in full is data loss, not a layout fix");
  ok("1.4 · the row that holds it can shrink too",
     /mt-auto flex items-end gap-2 min-w-0/.test(shell),
     "min-w-0 on the child alone is not enough — the parent flex item must shrink as well");
}

// ── 2 · The breadcrumb ───────────────────────────────────────────────────────
console.log("\n── 2 · the breadcrumb truncates instead of running past its nav ──");
{
  const nav = classesNear(crumbsSrc, 'aria-label="Breadcrumb"', 700);
  // ⭐ AND THAT THE SHELL STILL MOUNTS IT. Following the markup into its own file opened a hole
  // the old single-file check did not have: delete <AdminCrumbs> from the shell and leave the
  // component orphaned, and every assertion below would still pass — against a file nothing
  // renders. A guard that reads correct markup no page shows is measuring nothing.
  ok("2.0 · the breadcrumb was found AND is still mounted in the shell",
     nav.length > 0 && /<AdminCrumbs\b/.test(shell),
     "a correct component the shell no longer renders is a guard measuring nothing");
  ok("2.1 · the nav itself can shrink and hides the excess",
     /min-w-0/.test(nav) && /overflow-hidden/.test(nav));
  ok("2.2 · ⛔ the per-crumb WRAPPER can shrink — this is the bit that was missing",
     /<span key=\{i\} className="flex items-center gap-2 min-w-0">/.test(nav),
     "without it the crumbs' own `truncate` can never engage");
  ok("2.3 · the crumbs still truncate", /truncate/.test(nav));
  ok("2.4 · the separator is not what collapses", /opacity-50 shrink-0/.test(nav));
}

// ── 3 · ⛔ The GENERAL rule, so the next surface cannot repeat it ────────────
/**
 * Any `whitespace-nowrap` inside the admin shell must be able to shrink or be allowed to
 * clip deliberately. This is the check that generalises E-30 rather than pinning its two
 * instances — Ali's standing note that visuals and CONSISTENCY both matter.
 */
console.log("\n── 3 · no nowrap text in the shell that cannot shrink ──");
{
  // Strip comments: prose describing the rule must never fail the rule (the house trap,
  // paid for by test:updown-heal 10.4 and again by test:control-gates §5).
  // The admin chrome is TWO files since E-70; scan both, or the rule stops covering the half
  // that moved.
  const src = `${shell}
${crumbsSrc}`.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  /**
   * ⚠️ Read the WHOLE className expression, not one string literal.
   *
   * The first version of this check matched `className=…"([^"]*whitespace-nowrap[^"]*)"`
   * and duly reported the delta span — which had just been FIXED — as an offender, because
   * its classes are a `[...]​.join(" ")` array and `min-w-0 … text-ellipsis` sits in the
   * SECOND entry. A guard that reads one fragment of a multi-part class list will keep
   * accusing correct code, and the "fix" would be to re-flatten the array. So: span from
   * the `className` back-reference to the end of its expression, and test the lot.
   */
  const offenders: string[] = [];
  for (const m of src.matchAll(/whitespace-nowrap/g)) {
    const at = m.index ?? 0;
    const start = src.lastIndexOf("className", at);
    if (start < 0) continue;
    // The expression ends at `.join(` for an array form, else at the closing quote.
    const joinAt = src.indexOf(".join(", at);
    const quoteAt = src.indexOf('"', at);
    const end = joinAt > 0 && joinAt - at < 400 ? joinAt : quoteAt > 0 ? quoteAt : at + 200;
    const cls = src.slice(start, end);
    // Safe if it can shrink+ellipsis, or is explicitly pinned as non-shrinking chrome
    // (a shrink-0 pill is a deliberate fixed-size element, not a clipping hazard).
    if (/min-w-0/.test(cls) || /truncate/.test(cls) || /shrink-0/.test(cls) || /flex-none/.test(cls)) continue;
    offenders.push(cls.replace(/\s+/g, " ").slice(0, 90));
  }
  ok("3.1 · every nowrap class in admin-shell can shrink, truncate, or is pinned",
     offenders.length === 0, offenders.join(" | "));
  ok("3.2 · the scan is not vacuous",
     (src.match(/whitespace-nowrap/g) ?? []).length > 0,
     `${(src.match(/whitespace-nowrap/g) ?? []).length} nowrap classes scanned`);
}

const line = "─".repeat(66);
console.log(`\n${line}\n  ADMIN CLIPPING: ${pass} passed, ${fail} failed\n${line}`);
if (fail === 0) {
  console.log("  OK — a long KPI delta truncates with its full value on hover, and the");
  console.log("       breadcrumb shortens instead of running past its nav.");
}
process.exit(fail === 0 ? 0 : 1);
