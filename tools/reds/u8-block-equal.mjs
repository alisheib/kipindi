// The u8 opt-out drive reads four i18n blocks per locale. Do the old stripper (whole-line `//` only) and the shared
// decomment() hand it the SAME strings? The drive's own section()/block() are reproduced from its source at HEAD.
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { decomment } from "file:///F:/kipindi-rot3/scripts/lib/decomment.mts";
const R = "F:/kipindi-rot3";
const drive = execFileSync("git", ["-C", R, "show", "HEAD:scripts/live/marketing-u8-optout-drive.mjs"], { encoding: "utf8" });
const DICT_SRC = readFileSync(`${R}/src/lib/i18n-dict.ts`, "utf8").replace(/\r\n/g, "\n");
// localeSection(): taken from the drive's own source at HEAD (it finds `  <locale>: {` starts in the dict).
const a0 = drive.indexOf("function localeSection(");
const secSrc = drive.slice(a0, drive.indexOf("/** One top-level block", a0));
if (a0 < 0 || !secSrc) throw new Error("localeSection not found in the drive");
const section = new Function("DICT_SRC", `${secSrc}; return localeSection;`)(DICT_SRC);
const blockWith = (strip) => (sec, name) => {
  const m = sec.match(new RegExp(`^ {4}${name}: \\{\\n([\\s\\S]*?)^ {4}\\},?$`, "m"));
  if (!m) throw new Error(`no "${name}" block`);
  const out = {};
  for (const kv of strip(m[1]).matchAll(/(\w+): ("(?:[^"\\]|\\.)*")/g)) { try { out[kv[1]] = JSON.parse(kv[2]); } catch { /* as the drive */ } }
  return out;
};
const oldB = blockWith((s) => s.replace(/^\s*\/\/.*$/gm, ""));
const newB = blockWith((s) => decomment(s));
let same = 0, diff = 0;
for (const L of ["sw", "en", "zh"]) {
  const s = section(L);
  for (const name of ["optout", "footer", "chat", "primer"]) {
    const a = JSON.stringify(oldB(s, name)), b = JSON.stringify(newB(s, name));
    if (a === b) same++; else { diff++; console.log(`DIFFERS ${L}.${name}`); }
  }
}
console.log(diff ? `${diff} block(s) differ` : `all ${same} blocks identical (3 locales × optout, footer, chat, primer)`);
