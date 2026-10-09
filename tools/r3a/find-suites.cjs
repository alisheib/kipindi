// Lists the npm test:* scripts whose script file mentions a file this change touched.
const fs = require("fs");
const path = require("path");
const ROOT = "F:/kipindi-r3a";
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
const NEEDLES = ["globals.css", "app/page.tsx", "landing-hero", "live-ticker", "market-card", "landing-picks", "platform-stats",
  "hero-copy.test", "landing-mine.test", "featured-card", "journey-shell.test", "design-frozen.test", "anchors/featured-card"];
const out = [];
for (const [name, cmd] of Object.entries(pkg.scripts)) {
  if (!/^test:/.test(name)) continue;
  const files = [...cmd.matchAll(/scripts\/[\w./-]+\.(?:mts|mjs|ts|cjs|js)/g)].map((m) => m[0]);
  const hits = new Set();
  for (const f of files) {
    const p = path.join(ROOT, f);
    if (!fs.existsSync(p)) continue;
    const s = fs.readFileSync(p, "utf8");
    for (const n of NEEDLES) if (s.includes(n)) hits.add(n);
    // one level of local imports (./lib/*.mts, ./anchors/*.mjs)
    for (const m of s.matchAll(/from\s+["'](\.\/[^"']+)["']/g)) {
      const q = path.join(path.dirname(p), m[1]);
      if (fs.existsSync(q)) { const t = fs.readFileSync(q, "utf8"); for (const n of NEEDLES) if (t.includes(n)) hits.add(n + "(via " + m[1] + ")"); }
    }
  }
  if (hits.size) out.push(`${name}\t${[...hits].join(", ")}`);
}
console.log(out.join("\n"));
console.log(`\n${out.length} suites`);
