// qa-served-skeleton: Turbopack's dev chunk hash as an always-on normalisation, with its self-test (cwd = the WP1 tree).
const fs = require("fs");
const p = "scripts/qa-served-skeleton.mjs";
let s = fs.readFileSync(p, "utf8");
const crlf = s.includes("\r\n");
s = s.replace(/\r\n/g, "\n");
const rep = (a, b) => {
  const n = s.split(a).length - 1;
  if (n !== 1) throw new Error(`anchor ×${n}: ${a.slice(0, 90)}`);
  s = s.replace(a, b);
};

// 1 · the header: the new always-on line, after the chunk-hash one
rep(` *   · chunk hashes            a run of 8+ hex digits in a /_next/static/ path, its %2F-encoded form, or a
 *                             next_static/ precedence key → "~"
`, ` *   · chunk hashes            a run of 8+ hex digits in a /_next/static/ path, its %2F-encoded form, or a
 *                             next_static/ precedence key → "~"
 *   · Turbopack's dev chunk hashes   the 7 characters Turbopack's dev server writes before "._.js" / "._.css" in a
 *                             chunk's name, in the same three places: src_app_page_tsx_1133eyd._.js →
 *                             src_app_page_tsx_~._.js. They are not hex ("0c.3d1v", "050~h13", "0b3_sbz"), so the rule
 *                             above never read them, and they change with every server start: S7 WP1's calibration
 *                             null pair (2026-10-08, two fresh servers at b644717d) differed in head and preloads in 13
 *                             of its 14 cells on these alone. Exactly 7, and only right before "._.": a wider run would
 *                             eat the module's own name ("…_tsx_1133eyd"), which is a real difference.
`);

// 2 · the normalisation, its own entry so N.3 proves it absorbs its own noise
rep(`  ["?dpl=", (s) => {`, `  ["Turbopack's dev chunk hashes", (s) => s.replace(/(\\/_next\\/static\\/|%2F_next%2Fstatic%2F|next_static\\/)([^"'\\s)?#&]*)/gi,
    (m, p, rest) => p + rest.replace(/_[0-9a-z._~-]{7}(\\._\\.(?:js|css))(?![0-9A-Za-z])/g, "_~$1"))],
  ["?dpl=", (s) => {`);

// 3 · the synthetic document carries one Turbopack dev chunk in head
rep("    `<script src=\"/_next/static/chunks/main-app-${v.hash16}.js?dpl=${v.dpl}\" async=\"\"></script>`,\n",
  "    `<script src=\"/_next/static/chunks/main-app-${v.hash16}.js?dpl=${v.dpl}\" async=\"\"></script>`,\n" +
  "    `<script src=\"/_next/static/chunks/src_app_page_tsx_${v.tp}._.js\" async=\"\"></script>`,\n");
rep(`dpl: "dpl_A1", ts: "1700000000001",`, `dpl: "dpl_A1", tp: "1133eyd", ts: "1700000000001",`);
rep(`dpl: "dpl_B2", ts: "1700000099999",`, `dpl: "dpl_B2", tp: "0c.3d1v", ts: "1700000099999",`);

// 4 · the control that it reads only the hash: a renamed module is still a difference
rep(`    ok("null", "N.4 a ?v= outside /_next/static/ is never normalised", fieldsOf(feed(1), feed(2), { main: true }) === "head", fieldsOf(feed(1), feed(2), { main: true }));
  }
`, `    ok("null", "N.4 a ?v= outside /_next/static/ is never normalised", fieldsOf(feed(1), feed(2), { main: true }) === "head", fieldsOf(feed(1), feed(2), { main: true }));
  }
  {
    // Turbopack's dev hash is read as noise; the module's NAME in front of it is not.
    const renamed = { ...B, html: B.html.replace("src_app_page_tsx_", "src_app_pages_tsx_") };
    const f = fieldsOf(A, renamed, { main: true });
    ok("null", "N.5 a Turbopack dev chunk whose module name changes is still a difference — only the 7-character hash is noise", f === "head", f);
    const tilde = { ...B, html: B.html.replace(\`_\${NB.tp}._.js\`, "_050~h13._.js") };
    ok("null", "N.6 a hash holding '~' (as Turbopack's do) is read as the same noise", fieldsOf(A, tilde, { main: true }) === "(none)", fieldsOf(A, tilde, { main: true }));
  }
`);

fs.writeFileSync(p, crlf ? s.replace(/\n/g, "\r\n") : s);
console.log("ok", crlf ? "CRLF" : "LF");
