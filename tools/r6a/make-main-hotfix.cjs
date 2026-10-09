// R6-A · build the A1 hotfix for MAIN, read-only towards both trees: main's blobs (git show origin/main:…) plus exactly the
// branch's A1 edits, written under S\r6a\main-hotfix\{o,n}\, and a patch made with `git diff --no-index` (LF, as stored).
// The only hunk that differs from the branch: email.ts's imports (main predates R5-B's eat-day/dict lines).
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const REPO = "F:/kipindi-r6a";
const S = path.dirname(__filename);
const OUT = path.join(S, "main-hotfix");
const O = path.join(OUT, "o"), N = path.join(OUT, "n");
const lf = (s) => s.split("\r\n").join("\n");
const git = (...a) => execFileSync("git", a, { cwd: REPO, encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });
const mainBlob = (p) => lf(git("show", `origin/main:${p}`));
const branchHead = (p) => lf(git("show", `HEAD:${p}`));
const work = (p) => lf(fs.readFileSync(path.join(REPO, p), "utf8"));
const put = (root, p, s) => { const f = path.join(root, p); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, s); };
const once = (s, from, to, what) => {
  const n = s.split(from).length - 1;
  if (n !== 1) throw new Error(`${what}: anchor found ${n}x`);
  return s.replace(from, () => to);
};
const region = (s, start, end, what) => {
  const a = s.indexOf(start); if (a < 0) throw new Error(`${what}: start missing`);
  const b = s.indexOf(end, a); if (b < 0) throw new Error(`${what}: end missing`);
  return [a, b];
};

fs.rmSync(OUT, { recursive: true, force: true });
const report = [];

// 1 · Files identical on main and the branch's HEAD: the hotfix version IS the worktree's version.
for (const p of ["src/lib/server/responsible-gambling.ts", "scripts/comms-email-truth.test.mts", "scripts/comms-email-shots.mts",
  "scripts/email-preview.mts", "scripts/email-stress.test.mts", "scripts/poll-lifecycle-e2e.test.mts"]) {
  const m = mainBlob(p);
  if (m !== branchHead(p)) throw new Error(`${p} differs between main and the branch — not transplantable whole`);
  put(O, p, m); put(N, p, work(p));
  report.push(`${p}: identical on main and HEAD → the worktree's version`);
}

// 2 · market-service.ts differs (R5-B): the one A1 line, applied to main's blob.
{
  const p = "src/lib/server/market-service.ts";
  const m = mainBlob(p);
  const w = work(p);
  const added = "        // R6-A (2026-10-09) · the instant, said on the East Africa clock by the letter's own row formatter — it was the UTC day.\n";
  if (!w.includes(added)) throw new Error("market-service: the branch's comment line is not where expected");
  const n = once(m, "        marketTitle: market.titleEn, placedAt: c.placedAt, resolutionDate: market.resolutionAt.slice(0, 10),\n",
    added + "        marketTitle: market.titleEn, placedAt: c.placedAt, resolvesAt: market.resolutionAt,\n", p);
  put(O, p, m); put(N, p, n);
  report.push(`${p}: the betPlacedHtml call's one line (+ its comment)`);
}

// 3 · email.ts differs (R5-B): the betPlacedHtml docblock/signature, the Resolves row and the two RG letters are transplanted
//     from the worktree region by region; the imports get main's own two lines beside its utils import.
{
  const p = "src/lib/server/email.ts";
  const m = mainBlob(p), w = work(p);
  let n = m;
  // 3a · betPlacedHtml's docblock tail + signature.
  {
    const S0 = " * admin retuned either one.\n", E0 = "}): string {";
    const [wa] = region(w, S0, "export function betPlacedHtml(", "branch betPlaced");
    const wb = w.indexOf(E0, w.indexOf("export function betPlacedHtml(")) + E0.length;
    const [ma] = region(n, S0, "export function betPlacedHtml(", "main betPlaced");
    const mb = n.indexOf(E0, n.indexOf("export function betPlacedHtml(")) + E0.length;
    if (lf(branchHead(p)).slice(lf(branchHead(p)).indexOf(S0), lf(branchHead(p)).indexOf(E0, lf(branchHead(p)).indexOf("export function betPlacedHtml(")) + E0.length) !== n.slice(ma, mb))
      throw new Error("betPlacedHtml head differs between main and HEAD");
    n = n.slice(0, ma) + w.slice(wa, wb) + n.slice(mb);
  }
  // 3b · the Resolves row.
  n = once(n, '      { label: "Resolves", value: resolutionDate },\n',
    '      ...(Number.isFinite(Date.parse(resolvesAt)) ? [{ label: "Resolves", value: fmtDateTime(resolvesAt) }] : []),\n', "Resolves row");
  // 3c · the two letters (and the docblock + helper the branch puts before them).
  {
    const [wa, wb] = region(w, "/**\n * ⭐ R6-A (2026-10-09, A1) · THE END OF A BREAK OR AN EXCLUSION", "export function amlRejectRefundHtml(", "branch letters");
    const [ma, mb] = region(n, "export function selfExclusionHtml(", "export function amlRejectRefundHtml(", "main letters");
    const h = branchHead(p);
    const [ha, hb] = region(h, "export function selfExclusionHtml(", "export function amlRejectRefundHtml(", "HEAD letters");
    if (h.slice(ha, hb) !== n.slice(ma, mb)) throw new Error("the letters differ between main and HEAD");
    n = n.slice(0, ma) + w.slice(wa, wb) + n.slice(mb);
  }
  // 3d · main's imports: the formatter and the dictionary, beside the utils import (where R5-B's lines stand on the branch,
  //      so a later merge of the branch meets them in the same place rather than doubling `dict`).
  n = once(n, 'import { formatTzs, formatDateShort } from "@/lib/utils";\n',
    'import { formatTzs, formatDateShort } from "@/lib/utils";\n'
    + "// R6-A (2026-10-09, A1): the end of a break or an exclusion, with its time, in each line's own month words (`rgEndIn`).\n"
    + 'import { formatEatDateTime } from "@/lib/eat-day";\n'
    + 'import { dict } from "@/lib/i18n-dict";\n', "main imports");
  put(O, p, m); put(N, p, n);
  report.push(`${p}: betPlacedHtml head + Resolves row + the two letters transplanted; main's own import lines`);
}

// 4 · package.json (main's own): the suite's script line beside test:rg-doors.
{
  const p = "package.json";
  const m = mainBlob(p);
  const n = once(m, '    "test:rg-doors": "tsx scripts/rg-doors.test.mts",\n',
    '    "test:rg-doors": "tsx scripts/rg-doors.test.mts",\n    "test:rg-email-end": "tsx scripts/rg-email-end.test.mts",\n', "package.json");
  put(O, p, m); put(N, p, n);
  report.push(`${p}: one script line`);
}

// 5 · the suite itself (new).
put(N, "scripts/rg-email-end.test.mts", work("scripts/rg-email-end.test.mts"));
report.push("scripts/rg-email-end.test.mts: new");

// The patch: git diff --no-index between the two trees, paths made repo-relative.
let patch = "";
try { execFileSync("git", ["-c", "core.autocrlf=false", "diff", "--no-index", "--src-prefix=a/", "--dst-prefix=b/", "o", "n"], { cwd: OUT, encoding: "utf8", maxBuffer: 256 * 1024 * 1024 }); }
catch (e) { patch = e.stdout; } // exit 1 = differences found
patch = patch.split("a/o/").join("a/").split("b/n/").join("b/").split("a/n/").join("a/");
fs.writeFileSync(path.join(S, "a1-main-hotfix.patch"), patch);
console.log(report.join("\n"));
console.log(`patch: ${patch.split("\n").length} lines → ${path.join(S, "a1-main-hotfix.patch")}`);
