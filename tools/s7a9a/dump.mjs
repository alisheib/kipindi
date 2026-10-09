// Loads the tool's functions by evaluating its source minus the main block, then prints the fields of the synthetic document.
import { readFileSync } from "node:fs";
const src = readFileSync("F:/kipindi-s7a9a/scripts/qa-served-skeleton.mjs", "utf8");
const cut = src.indexOf("// ── main ──");
const body = src.slice(0, cut).replace(/^import .*$/gm, "");
const mod = new Function("existsSync", "readFileSync", "writeFileSync", "dirname", "join", "resolve", "spawnSync", "fileURLToPath", "importMetaUrl",
  body.replace("fileURLToPath(import.meta.url)", "\"F:/kipindi-s7a9a/scripts/qa-served-skeleton.mjs\"")
  + "\nreturn { synth, analyse, compareCells, EXTRAS };");
const fs = await import("node:fs"); const path = await import("node:path"); const cp = await import("node:child_process"); const url = await import("node:url");
const T = mod(fs.existsSync, fs.readFileSync, fs.writeFileSync, path.dirname, path.join, path.resolve, cp.spawnSync, url.fileURLToPath);
const NA = { hash: "0a1b2c3d", hash16: "0a1b2c3d4e5f6071", dpl: "dpl_A1", ts: "1700000000001", rid: "_R_1a_", avatar: "cm1x9k2", seg: "0", bnd: "0", port: "3041", mkt: "ab12cd34ef", time: "5<!-- --> min" };
const a = T.analyse(T.synth(NA), { main: true });
for (const f of ["status", "head", "preloads", "body", "main", "segments"]) { console.log(`== ${f}`); for (const l of a[f]) console.log(l); }
console.log("== bailouts", JSON.stringify(a.bailouts, null, 1));
const r = T.analyse(T.synth(NA), { main: true, extras: new Set(Object.keys(T.EXTRAS)) });
console.log("\n#### with every extra");
for (const f of ["body", "main", "segments"]) { console.log(`== ${f}`); for (const l of r[f]) console.log(l); }
