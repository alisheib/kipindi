// In-memory plant for read-only probes: patches fs.readFileSync for named repo files; nothing on disk changes.
import fs from "node:fs";
import { syncBuiltinESMExports } from "node:module";
const spec = JSON.parse(fs.readFileSync(process.env.PROBE_SPEC, "utf8"));
const real = fs.readFileSync;
const norm = (p) => String(p).split(String.fromCharCode(92)).join("/");
fs.readFileSync = function (p, ...rest) {
  const out = real.call(this, p, ...rest);
  if (typeof p !== "string") return out;
  const s = norm(p);
  for (const [rel, edits] of Object.entries(spec)) {
    if (!s.endsWith("/" + rel)) continue;
    let t = (typeof out === "string" ? out : out.toString("utf8")).split(String.fromCharCode(13)).join("");
    for (const [from, to] of edits) {
      const n = t.split(from).length - 1;
      if (n !== 1) process.stderr.write("PROBE ANCHOR " + rel + " occurs " + n + " times: " + from.slice(0, 70) + "\n");
      t = t.split(from).join(to);
    }
    process.stderr.write("PROBE planted " + rel + "\n");
    return typeof out === "string" ? t : Buffer.from(t, "utf8");
  }
  return out;
};
syncBuiltinESMExports();
