// Line endings of every file R5-K touched (the worktree is autocrlf: CRLF on disk, LF in the blobs). Prints, per file, the
// newline count, CRLF count, bare-LF count, and whether the file ends with a newline — and the same for the base blob.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
const REPO = "F:/kipindi-r5k/";
const st = execFileSync("git", ["status", "--porcelain"], { cwd: REPO, encoding: "utf8" });
const files = st.split("\n").filter(Boolean).map((l) => l.slice(3).replace(/^"|"$/g, ""));
const eol = (b) => { const s = b.toString("utf8"); const nl = (s.match(/\n/g) ?? []).length; const crlf = (s.match(/\r\n/g) ?? []).length; return { nl, crlf, lf: nl - crlf, endNl: s.endsWith("\n"), loneCr: (s.match(/\r(?!\n)/g) ?? []).length }; };
let bad = 0;
for (const f of files) {
  const w = eol(readFileSync(REPO + f));
  let b = null; try { b = eol(execFileSync("git", ["show", `HEAD:${f}`], { cwd: REPO, stdio: ["ignore", "pipe", "ignore"] })); } catch {}
  const ok = w.lf === 0 && w.loneCr === 0 && w.endNl;
  if (!ok) bad++;
  console.log(`${ok ? "ok " : "BAD"} ${f}: worktree ${w.nl} lines, ${w.crlf} CRLF, ${w.lf} bare LF, lone CR ${w.loneCr}, ends with newline ${w.endNl}${b ? ` · blob ${b.nl} lines, ${b.crlf} CRLF` : " · new"}`);
}
console.log(bad ? `${bad} file(s) not pure CRLF` : "every touched file is pure CRLF on disk");
const attr = execFileSync("git", ["config", "--get", "core.autocrlf"], { cwd: REPO, encoding: "utf8" }).trim();
console.log(`core.autocrlf = ${attr}`);
