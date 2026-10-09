const fs = require("fs");
process.chdir("F:/kipindi-r4i");
const f = "scripts/design-gate/eyebrow-roles.mjs";
let s = fs.readFileSync(f, "utf8");
const crlf = s.includes("\r\n");
const nl = crlf ? "\r\n" : "\n";
const lines = s.split(nl);
const i = lines.findIndex((l) => l.startsWith('  ["app/auth/login/page.tsx :: className=') && l.includes("font-mono text-micro uppercase tracking-[0.14em] text-text-subtle hover:text-text"));
if (i < 0) { console.error("entry not found"); process.exit(1); }
lines.splice(i, 1, "  // R4-I (2026-10-09): the sign-in page's \"Forgot password?\" is no longer an uppercase tracked microlabel — it reads as a link,", "  // 13px in the brand ink (edges E12: caps 8px under the reading floor on the one recovery control) — so its row is gone.");
fs.writeFileSync(f, lines.join(nl));
console.log("ok", crlf);
