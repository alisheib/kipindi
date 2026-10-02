/**
 * SOURCE BYTES — no raw control character in the source, because every one found so far was an ESCAPE A TOOL DECODED.
 *
 * 🔴 WHY THIS EXISTS (2026-10-02). The file-writing tools this repository is edited with decode JSON escapes in the text
 * they are handed, and the regex word boundary is spelled exactly like JSON's BACKSPACE escape. So a pattern written as
 * "word boundary, then reset(" landed on disk as "BACKSPACE, then reset(": a regex that can never match, inside a
 * negated check that therefore always passed. Three were live when they were found — all reading green:
 *   · `test:deploy-skew` §2g, "it does not retry the action, only the page" — the guard that a deploy-skew recovery
 *     never replays an action (a replayed deposit is a double submit);
 *   · `test:house-bot-console` 1.541's control, "never an engine code handed to the page";
 *   · the house-bot panel drive's pager filter, which could never find a pager button by its label.
 *
 * ⛔ BACKSPACE, VERTICAL TAB and FORM FEED are refused EVERYWHERE: nothing in this codebase means them, and each is what a
 * decoded escape looks like. The other C0 controls (NUL, SOH …) are refused outside the fixtures named below, each one
 * a deliberate input or separator. TAB, LF and CR are text. Invisible format characters (a zero-width space, a word
 * joiner, a BOM) are not this guard's business: several are deliberate, and they decode to what they say.
 *
 * ⛔ This file holds no backslash at all, on purpose — the characters it hunts are built with String.fromCharCode.
 *
 * Run: npm run test:source-bytes (in `predeploy`).
 */
import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";

let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, detail = "") => {
  if (cond) pass++; else fail++;
  console.log(`${cond ? "PASS" : "FAIL"} ${label}${!cond && detail ? ` — ${detail}` : ""}`);
};

const ROOT = process.cwd();
const TOPS = ["src", "scripts", "prisma"];
const EXT = /[.](ts|tsx|mts|mjs|js|cjs|css|json|prisma|sql)$/;
const SKIP_DIRS = new Set(["node_modules", ".next"]);

/** Never meant in this codebase — each is a decoded escape (backspace, vertical tab, form feed). */
const NEVER = new Set([8, 11, 12]);
/** Text, not control. */
const TEXT = new Set([9, 10, 13]);

/**
 * ⛔ THE FIXTURES THAT CARRY A RAW CONTROL CHARACTER ON PURPOSE — may only SHRINK. Each one must still hold one (checked
 * below), so an entry that stopped needing it is removed, not inherited.
 */
const ALLOW: Record<string, string> = {
  "scripts/ai-poll-break-it.mts": "a NUL inside a poll title — the generator's input sanitiser is the thing under test",
  "scripts/fuzz-malformed-payloads.mjs": "a NUL-byte payload, sent on purpose",
  "scripts/kyc-cert-d4.test.mts": "a NUL in a file name the upload path must refuse",
  "scripts/ops-prelaunch-reset.mts": "NUL and SOH as hash separators — no key or value can contain them",
  "scripts/updown-bet-feedback.test.mts": "a NUL sentinel no toast text can equal",
};

type Hit = { file: string; line: number; code: number };

/** Every control character in a text, by line. ⭐ ONE definition — the scan and the controls both call it. */
function controlsIn(file: string, text: string): Hit[] {
  const hits: Hit[] = [];
  let line = 1;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code === 10) { line++; continue; }
    if ((code < 32 || code === 127) && !TEXT.has(code)) hits.push({ file, line, code });
  }
  return hits;
}

/** The verdict on one file's hits: a NEVER code is refused anywhere; any other control only outside ALLOW. */
function refused(hits: Hit[]): Hit[] {
  return hits.filter((h) => NEVER.has(h.code) || !(h.file in ALLOW));
}

function walk(dir: string): string[] {
  let out: string[] = [];
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const d of entries) {
    if (d.isDirectory()) { if (!SKIP_DIRS.has(d.name)) out = out.concat(walk(join(dir, d.name))); }
    else if (EXT.test(d.name)) out.push(join(dir, d.name));
  }
  return out;
}

const norm = (p: string) => p.split(String.fromCharCode(92)).join("/");
const files = TOPS.flatMap((t) => walk(join(ROOT, t))).map((p) => norm(relative(ROOT, p)));
const all: Hit[] = [];
for (const f of files) all.push(...controlsIn(f, readFileSync(join(ROOT, f), "utf8")));
const bad = refused(all);
const show = (h: Hit) => `${h.file}:${h.line} (0x${h.code.toString(16).padStart(2, "0")})`;

console.log("source bytes");
ok("1 · no BACKSPACE, VERTICAL TAB or FORM FEED anywhere in src/, scripts/ or prisma/ — each is a decoded escape",
  all.filter((h) => NEVER.has(h.code)).length === 0, all.filter((h) => NEVER.has(h.code)).map(show).join(" · "));
ok("2 · no other raw control character outside the named fixtures", bad.length === 0, bad.map(show).join(" · "));
const stale = Object.keys(ALLOW).filter((f) => !all.some((h) => h.file === f));
ok("3 · every allowlisted fixture still carries its control character (the list may only shrink)", stale.length === 0,
  `remove from ALLOW: ${stale.join(" · ")}`);

// ── CONTROLS — the same two functions, on planted text ────────────────────────────────────────────────────────────
const BS = String.fromCharCode(8);
const NUL = String.fromCharCode(0);
ok("C1 · CONTROL · a planted backspace before `reset(` is refused — even inside an allowlisted fixture",
  refused(controlsIn("scripts/fuzz-malformed-payloads.mjs", `ok(!/${BS}reset/.test(body));`)).length === 1);
ok("C2 · CONTROL · a NUL is refused in a file that is not a named fixture, and allowed in one that is",
  refused(controlsIn("src/lib/x.ts", `const s = "a${NUL}b";`)).length === 1
    && refused(controlsIn("scripts/kyc-cert-d4.test.mts", `const s = "a${NUL}b";`)).length === 0);
ok("C3 · CONTROL · tabs, line feeds and carriage returns are text, and the line count follows the line feeds",
  controlsIn("a.ts", `a${String.fromCharCode(9)}b${String.fromCharCode(13, 10)}c${BS}`).map((h) => `${h.line}:${h.code}`).join() === "2:8");
ok("C4 · CONTROL · the scan read the tree (2,000+ source files under src/, scripts/ and prisma/)", files.length > 2000, `${files.length}`);

console.log(`source-bytes: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
