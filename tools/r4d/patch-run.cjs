const fs = require("fs");
let s = fs.readFileSync("run-suites.mjs", "utf8");
s = s.replace('"brand.tsx", "query-bar"];', '"brand.tsx", "query-bar", "positions/page", "eyebrow"];');
s = s.replace("const list = [...new Set([...required, ...updown, ...readers])];",
  "// ⛔ No browser: a suite whose script drives Playwright/Chromium is a live audit (needs a server), never run here.\nconst live = (k) => { const f = fileOf(S[k]); try { return /playwright|chromium\.launch/.test(readFileSync(f, \"utf8\")); } catch { return false; } };\nconst all = [...new Set([...required, ...updown, ...readers, \"test:eyebrow-roles\"])];\nconst skipped = all.filter(live);\nconst list = all.filter((k) => !live(k));");
s = s.replace("writeFileSync(OUT, `# ${list.length} suites, ${new Date().toISOString()}\n`);", "writeFileSync(OUT, `# ${list.length} suites, ${new Date().toISOString()} · skipped as live (browser): ${skipped.join(\", \")}\n`);");
fs.writeFileSync("run-suites.mjs", s);
