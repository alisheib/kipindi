// R5-L · THE MERGE KIT: R5-L's change set laid onto vodacom-visual 6f5b24c0 (R5-G, R5-K, the route entrance) with ONE
// ghost helper, built in the scratchpad from git objects and the worktree's files — nothing in the repo is written.
//   base/<path>      the tip's file (absent where the tip has none)
//   onto-tip/<path>  the file after R5-L lands on the tip
//   ../r5l-on-6f5b24c0.patch   `git diff --no-index base onto-tip`, paths made repo-relative
// The six files both sides touched are resolved here by construction (each rule below says how); every other R5-L file is
// the worktree's, with the helper's import re-pointed at R5-K's `ghost-text.tsx`.
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const ROOT = "F:/kipindi-r5l/";
const HERE = "C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad/r5l/merge/";
const TIP = "6f5b24c0", BASE = "9677a3f54";
const git = (a) => execSync(`git -C ${ROOT} ${a}`, { encoding: "utf8", maxBuffer: 64 << 20 });
const show = (rev, f) => { try { return execSync(`git -C ${ROOT} show ${rev}:"${f}"`, { encoding: "utf8", maxBuffer: 64 << 20, stdio: ["ignore", "pipe", "ignore"] }); } catch { return null; } };
const lf = (s) => s.replace(/\r\n/g, "\n");
const mine = (f) => (fs.existsSync(ROOT + f) ? lf(fs.readFileSync(ROOT + f, "utf8")) : null);
const once = (s, from, to, label) => { const n = s.split(from).length - 1; if (n !== 1) throw new Error(`${label}: ${n} matches`); return s.replace(from, () => to); };
for (const d of ["base", "onto-tip"]) fs.rmSync(HERE + d, { recursive: true, force: true });
const out = new Map(); // path -> content | null (deleted)

const ours = git("diff --name-only HEAD").trim().split(/\r?\n/).concat(git("ls-files --others --exclude-standard").trim().split(/\r?\n/)).filter(Boolean);
const upstream = new Set(git(`diff --name-only ${BASE} ${TIP}`).trim().split(/\r?\n/));
const HELPER_IMPORT = /from "@\/components\/ui\/ghost-kit";/g;

for (const f of ours) {
  if (f === "src/components/ui/ghost-kit.tsx") { out.set(f, null); continue; } // the one helper is R5-K's ghost-text.tsx
  const m = mine(f);
  if (m === null) { out.set(f, null); continue; } // R5-L deleted it (src/app/agent/loading-shared.tsx)
  if (!upstream.has(f)) { out.set(f, m.replace(HELPER_IMPORT, 'from "@/components/ui/ghost-text";')); continue; }
  out.set(f, "__RESOLVE__");
}

// ── The six files both sides touched ────────────────────────────────────────────────────────────────────────────────
const tipOf = (f) => lf(show(TIP, f));
const merged3 = (f) => {
  // git merge-file on scratch copies: R5-L's version, the old base, the tip — for the two that merge without a conflict.
  const dir = HERE + "tmp/"; fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(dir + "mine", mine(f)); fs.writeFileSync(dir + "base", lf(show(BASE, f))); fs.writeFileSync(dir + "tip", tipOf(f));
  try { execSync(`git merge-file -L mine -L base -L tip "${dir}mine" "${dir}base" "${dir}tip"`); } catch (e) { throw new Error(`${f}: merge-file conflicted`); }
  return fs.readFileSync(dir + "mine", "utf8");
};
// eyebrow-roles.mjs and visual-pass-r5h.test.mts: the two sides' hunks are apart — a clean 3-way merge.
out.set("scripts/design-gate/eyebrow-roles.mjs", merged3("scripts/design-gate/eyebrow-roles.mjs"));
out.set("scripts/visual-pass-r5h.test.mts", merged3("scripts/visual-pass-r5h.test.mts"));
// package.json: both added a suite line after r5h's — keep R5-K's, then R5-L's.
out.set("package.json", once(tipOf("package.json"),
  '    "test:visual-pass-r5k": "tsx scripts/visual-pass-r5k.test.mts",\n',
  '    "test:visual-pass-r5k": "tsx scripts/visual-pass-r5k.test.mts",\n    "test:visual-pass-r5l": "tsx scripts/visual-pass-r5l.test.mts",\n',
  "package.json"));
// money-bar-ghost.tsx: R5-K exported its PillGhost and CountGhost for /positions; R5-L keeps ONE of each in the bar kit
// (`query-bar-ghost.tsx`), so the money books' ghost imports both — R5-L's file already makes R5-K's count-line change.
out.set("src/app/wallet/money-bar-ghost.tsx", mine("src/app/wallet/money-bar-ghost.tsx"));
// spacing-scale: R5-K -22 (453 → 431) and R5-L -9 on disjoint files → 422 on the merged tree.
{
  const tip = tipOf("scripts/spacing-scale.test.mts");
  const m = /^const CEILING = 431;   \/\/ (.*)$/m.exec(tip);
  if (!m) throw new Error("spacing-scale: tip ceiling line not found");
  const r5l = /^const CEILING = 444;   \/\/ (.*)$/m.exec(mine("scripts/spacing-scale.test.mts"));
  if (!r5l) throw new Error("spacing-scale: R5-L ceiling line not found");
  out.set("scripts/spacing-scale.test.mts", tip.replace(m[0], `const CEILING = 422;   // ${r5l[1].replace(/^-9, /, "-9 (453 → 444 alone, 431 → 422 over R5-K's), ")} // ${m[1]}`));
}
// ghost-landing.mjs: R5-K's §D (the signed-in K ghosts, RED_R5K) and R5-L's §E (every rebuilt ghost box for box,
// RED_BOXES, ONLY=E) side by side — built from the tip, R5-L's changes laid on it one by one.
{
  const M = mine("scripts/ghost-landing.mjs");
  let s = tipOf("scripts/ghost-landing.mjs");
  s = once(s,
    " *   RED_R5K=1 npm run qa:ghost-landing -- <base>     §D's ghosts are served back short (their bands collapsed)\n",
    " *   RED_R5K=1 npm run qa:ghost-landing -- <base>     §D's ghosts are served back short (their bands collapsed)\n"
    + " *   ONLY=E npm run qa:ghost-landing -- <base>        §E alone (R5-L): every rebuilt ghost, box for box\n"
    + " *   RED_BOXES=1 ONLY=E npm run qa:ghost-landing -- <base>   §E's ghosts' word boxes broken back out\n"
    + " *   E_WIDTHS=360,390,1280 E_LOCALES=sw,en,zh …       §E's grid (default 390 and 1280, Swahili)\n", "usage");
  // R5-L's header paragraph (§E) goes in front of the header's close.
  const head = M.slice(M.indexOf(" * ── §E · EVERY REBUILT GHOST"), M.indexOf(" */\nimport { chromium }"));
  s = once(s, " */\nimport { chromium }", head + " */\nimport { chromium }", "header");
  s = once(s,
    "const RED_R5K = process.env.RED_R5K === \"1\";\nconst RED = RED_GHOST || RED_STACK || RED_R5K;\n",
    "const RED_R5K = process.env.RED_R5K === \"1\";\nconst RED_BOXES = process.env.RED_BOXES === \"1\";\nconst RED = RED_GHOST || RED_STACK || RED_R5K || RED_BOXES;\n"
    + "/** `ONLY=E` runs §E alone (a lock turn's budget); otherwise §A–§D run and §E after them. */\nconst ONLY = (process.env.ONLY ?? \"\").toUpperCase();\n", "flags");
  s = once(s, 'const SECTION = { RED_GHOST: ["A"], RED_STACK: ["B", "C"], RED_R5K: ["D"] };', 'const SECTION = { RED_GHOST: ["A"], RED_STACK: ["B", "C"], RED_R5K: ["D"], RED_BOXES: ["E"] };', "section");
  // §A–§C stand down for ONLY=E (the same four gates and two skips R5-L's file carries).
  s = once(s, 'console.log("\\n§A · does the content land where the ghost promised?");', 'if (ONLY !== "E") console.log("\\n§A · does the content land where the ghost promised?");', "A title");
  s = once(s, 'for (const target of ["/live", "/markets", "/results"]) {', 'for (const target of ONLY === "E" ? [] : ["/live", "/markets", "/results"]) {', "A loop");
  for (const [from, to, label] of [
    ["console.log(`\\n§B · /live with MOTION ON", "if (ONLY !== \"E\") console.log(`\\n§B · /live with MOTION ON", "B title"],
    ["console.log(\"\\n§C · tapping a carousel dot must not move the board below it\");", "if (ONLY !== \"E\") console.log(\"\\n§C · tapping a carousel dot must not move the board below it\");", "C title"],
    ["for (const surface of [", "for (const surface of ONLY === \"E\" ? [] : [", "C loop"],
  ]) s = once(s, from, to, label);
  // §B's block: R5-L's file gates it the same way — take that gate from R5-L's text.
  const bGate = /\nif \(ONLY !== "E"\) \{\n/.exec(M.slice(M.indexOf("§B · /live with MOTION ON"), M.indexOf("§C · tapping")));
  if (!bGate) throw new Error("B block gate not found in R5-L's file");
  const bFrom = M.slice(M.indexOf("§B · /live with MOTION ON"), M.indexOf("§C · tapping"));
  const tipB = s.slice(s.indexOf("§B · /live with MOTION ON"), s.indexOf("§C · tapping"));
  const bOpen = /\n(\{|if \(true\) \{|[^\n]*\{)\n/.exec(tipB);
  void bOpen;
  // The tip's §B block opens on a bare `{` after its title line; R5-L's on `if (ONLY !== "E") {` — same block.
  s = s.replace(tipB, tipB.replace(/\n\{\n/, '\nif (ONLY !== "E") {\n'));
  if (!s.slice(s.indexOf("§B · /live with MOTION ON"), s.indexOf("§C · tapping")).includes('\nif (ONLY !== "E") {\n')) throw new Error("B gate not laid");
  // R5-K's §D stands down for ONLY=E too.
  s = once(s, "if (!LOOPBACK) {\n  console.log(\"\\n§D · SKIPPED", "if (ONLY === \"E\") {\n  // ONLY=E (R5-L): §E alone — the signed-in K ghosts are not measured on this run.\n} else if (!LOOPBACK) {\n  console.log(\"\\n§D · SKIPPED", "D gate");
  // R5-L's §E after R5-K's §D, on R5-K's LOOPBACK (its own copy of the rule goes).
  let e = M.slice(M.indexOf("/* ── §E ──"), M.indexOf("\nawait b.close();"));
  e = once(e, "  // R5-K's rule (§D): a scripted sign-in only through a LOCAL server's demo door — never a preview, never production.\n"
    + "  const LOOPBACK = /^https?:\\/\\/(?:localhost|127\\.0\\.0\\.1)(?::\\d+)?(?:\\/|$)/.test(BASE);\n",
    "  // R5-K's rule and its LOOPBACK (§D): a scripted sign-in only through a LOCAL server's demo door.\n", "E loopback");
  s = once(s, "\nawait b.close();", "\n" + e + "\nawait b.close();", "E block");
  s = once(s, 'RED_R5K ? "RED_R5K (§D\'s ghosts served back short)" : "GREEN";', 'RED_R5K ? "RED_R5K (§D\'s ghosts served back short)" : RED_BOXES ? "RED_BOXES (§E\'s word boxes broken back out)" : "GREEN";', "label");
  s = once(s, 'const want = SECTION[RED_GHOST ? "RED_GHOST" : RED_STACK ? "RED_STACK" : "RED_R5K"];', 'const want = SECTION[RED_GHOST ? "RED_GHOST" : RED_STACK ? "RED_STACK" : RED_R5K ? "RED_R5K" : "RED_BOXES"];', "want");
  out.set("scripts/ghost-landing.mjs", s);
}

// ── ONE HELPER: R5-K's ghost-text.tsx takes ButtonGhost; the one bar kit takes /positions' imports ──────────────────
{
  const kit = mine("src/components/ui/ghost-kit.tsx");
  const button = kit.slice(kit.indexOf("/** The glyph's room a button keeps beside its label"));
  out.set("src/components/ui/ghost-text.tsx", tipOf("src/components/ui/ghost-text.tsx").replace(/\n*$/, "\n\n") + button.replace(/\n*$/, "\n"));
  out.set("src/app/positions/positions-ghost.tsx", once(tipOf("src/app/positions/positions-ghost.tsx"),
    'import { CountGhost, PillGhost } from "@/app/wallet/money-bar-ghost";', 'import { CountGhost, PillGhost } from "@/components/ui/query-bar-ghost";', "positions import"));
  let suite = out.get("scripts/visual-pass-r5l.test.mts");
  const kitLine = /\/\*\* The ghost helper[^\n]*\*\/\nconst KIT = "src\/components\/ui\/ghost-kit\.tsx";/;
  if (!kitLine.test(suite)) throw new Error("suite KIT line not found");
  suite = suite.replace(kitLine, "/** The ghost helper — ONE file, R5-K's (`GhostText`, `ghostShape`, `ChipGhost`), with R5-L's `ButtonGhost`. */\nconst KIT = \"src/components/ui/ghost-text.tsx\";");
  suite = once(suite,
    " *   §9 THE KITS · the ghost helper — R5-K's `GhostText`, `ghostShape` and `ChipGhost`, verbatim, and `ButtonGhost` (ONE\n"
    + " *          helper: `ghost-text.tsx` on the merge) — and `query-bar-ghost.tsx` (the pill, count, group, sort, menu and\n"
    + " *          Filters ghosts), each against the page's own component it stands for\n",
    " *   §9 THE KITS · the one ghost helper — R5-K's `ghost-text.tsx` (`GhostText`, `ghostShape`, `ChipGhost`) with R5-L's\n"
    + " *          `ButtonGhost` — and `query-bar-ghost.tsx` (the pill, count, group, sort, menu and Filters ghosts), each\n"
    + " *          against the page's own component it stands for\n", "suite header");
  out.set("scripts/visual-pass-r5l.test.mts", suite);
}
// R5-L's notes that point at the helper by name stay true; any that name ghost-kit.tsx would not.
for (const [f, s] of out) if (s && s !== "__RESOLVE__" && /ghost-kit/.test(s)) throw new Error(`${f} still names ghost-kit`);
for (const [f, s] of out) if (s === "__RESOLVE__") throw new Error(`${f}: unresolved`);

// ── Write base/ and onto-tip/, and the patch ───────────────────────────────────────────────────────────────────────
for (const [f, s] of out) {
  const t = show(TIP, f);
  if (t !== null) { fs.mkdirSync(path.dirname(HERE + "base/" + f), { recursive: true }); fs.writeFileSync(HERE + "base/" + f, lf(t)); }
  if (s !== null) { fs.mkdirSync(path.dirname(HERE + "onto-tip/" + f), { recursive: true }); fs.writeFileSync(HERE + "onto-tip/" + f, s); }
}
let patch = "";
try { patch = execSync(`git diff --no-index --no-color --binary base onto-tip`, { cwd: HERE, encoding: "utf8", maxBuffer: 64 << 20 }); }
catch (e) { patch = e.stdout; } // exit 1 means "differences found"
patch = patch.replace(/^diff --git a\/base\/(\S+) b\/onto-tip\/(\S+)$/gm, "diff --git a/$1 b/$2")
  .replace(/^--- a\/base\//gm, "--- a/").replace(/^\+\+\+ b\/onto-tip\//gm, "+++ b/")
  .replace(/^diff --git a\/onto-tip\/(\S+) b\/onto-tip\/(\S+)$/gm, "diff --git a/$1 b/$2")
  .replace(/^diff --git a\/base\/(\S+) b\/base\/(\S+)$/gm, "diff --git a/$1 b/$2")
  .replace(/^--- a\/onto-tip\//gm, "--- a/").replace(/^\+\+\+ b\/base\//gm, "+++ b/");
fs.writeFileSync(HERE + "../r5l-on-6f5b24c0.patch", patch);
console.log(`files: ${out.size} (${[...out.values()].filter((v) => v === null).length} deleted) · patch ${patch.length} bytes`);
