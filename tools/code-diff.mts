// Scratch check (read-only): for each edited file, strip comments with the repo's OWN helper from both the committed
// version (git show HEAD:path) and the working copy, and diff the remaining CODE line by line. If the only differences
// are the intended URL literals, no code-shape predicate (private-stripper population, account-fact writers) can have
// changed membership because of my edits.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { decomment } from "file:///F:/kipindi-rot1/scripts/lib/decomment.mts";

const ROOT = "F:/kipindi-rot1";
const files = [
  "scripts/cls-budget.mjs",
  "scripts/detail-order-and-hints.mjs",
  "scripts/fairness-phone.mjs",
  "scripts/focus-and-fit.mjs",
  "scripts/ghost-landing.mjs",
  "scripts/pager-wallet-shots.mjs",
  "scripts/qa/landing-ten.mjs",
  "scripts/qa/landing-v3/og-prod.mjs",
  "scripts/signup-funnel.mjs",
  "scripts/live-target-safe.test.mjs",
];

// The two shapes decomment.test.mts counts as a "private stripper" (copied from that test), and the two predicates
// house-bot-holder-lifecycle.test.mts uses on scripts (SQL_FIELD; writersIn is not importable, so the code diff below
// is the evidence for that one).
const BLOCK_RE = /\/\\\/\\\*\[\\s\\S\]\*\?\\\*\\\//;
const LINE_RE = /\/(?:\(\^\|\[\^:"'`\\w\/\]\)|\(\^\|\[\^:\]\)|\^\\s\*|\(\?<!:\))?\\\/\\\/[^/]*\//;
const SQL_FIELD = /"passwordHash"|'passwordHash'|passwordHash\s*=/;

const LF = String.fromCharCode(10);
const CRLF = String.fromCharCode(13) + LF;
const norm = (s: string) => s.split(CRLF).join(LF);

let anyUnexpected = false;
for (const f of files) {
  const head = norm(execFileSync("git", ["show", "HEAD:" + f], { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }));
  const work = norm(readFileSync(ROOT + "/" + f, "utf8"));
  const a = decomment(head).split(LF);
  const b = decomment(work).split(LF);
  // Compare as multisets of non-blank code lines: comment removal leaves blank lines whose count differs, and that is
  // not code.
  const strip = (xs: string[]) => xs.map((l) => l.trimEnd()).filter((l) => l.trim().length > 0);
  const A = strip(a), B = strip(b);
  const onlyHead: string[] = [], onlyWork: string[] = [];
  const bag = new Map<string, number>();
  for (const l of B) bag.set(l, (bag.get(l) ?? 0) + 1);
  for (const l of A) { const n = bag.get(l) ?? 0; if (n > 0) bag.set(l, n - 1); else onlyHead.push(l); }
  const bag2 = new Map<string, number>();
  for (const l of A) bag2.set(l, (bag2.get(l) ?? 0) + 1);
  for (const l of B) { const n = bag2.get(l) ?? 0; if (n > 0) bag2.set(l, n - 1); else onlyWork.push(l); }

  const carriesHead = BLOCK_RE.test(decomment(head)) || LINE_RE.test(decomment(head));
  const carriesWork = BLOCK_RE.test(decomment(work)) || LINE_RE.test(decomment(work));
  const sqlHead = SQL_FIELD.test(decomment(head)), sqlWork = SQL_FIELD.test(decomment(work));
  console.log("=== " + f);
  console.log("   private-stripper carrier: HEAD=" + carriesHead + "  working=" + carriesWork + (carriesHead === carriesWork ? "  (same)" : "  (CHANGED!)"));
  console.log("   SQL_FIELD (passwordHash):  HEAD=" + sqlHead + "  working=" + sqlWork + (sqlHead === sqlWork ? "  (same)" : "  (CHANGED!)"));
  console.log("   code lines only in HEAD:    " + onlyHead.length);
  for (const l of onlyHead) console.log("      - " + l.trim().slice(0, 150));
  console.log("   code lines only in working: " + onlyWork.length);
  for (const l of onlyWork) console.log("      + " + l.trim().slice(0, 150));
  if (carriesHead !== carriesWork || sqlHead !== sqlWork || onlyHead.length > 1 || onlyWork.length > 1) anyUnexpected = true;
}
console.log(anyUnexpected ? "\nUNEXPECTED DIFFERENCES FOUND" : "\nOK: the only code change in each file is the single intended target line, and no predicate changed.");
