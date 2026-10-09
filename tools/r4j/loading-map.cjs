const fs = require("fs"), path = require("path");
const root = "F:/kipindi-r4j/src/app";
const pages = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name === "page.tsx") pages.push(p);
  }
})(root);
const norm = (s) => s.split(path.sep).join("/");
for (const p of pages) {
  let d = path.dirname(p);
  let L = null;
  for (;;) {
    if (fs.existsSync(path.join(d, "loading.tsx"))) { L = path.join(d, "loading.tsx"); break; }
    if (norm(d) === norm(path.resolve(root))) break;
    d = path.dirname(d);
  }
  const r = norm(path.dirname(p)).slice(norm(path.resolve(root)).length) || "/";
  if (r.startsWith("/admin") || r.startsWith("/api")) continue;
  const which = L ? norm(L).slice(norm(path.resolve(root)).length) : "(none)";
  console.log((which === "/loading.tsx" ? "ROOT  " : "own   ") + r.padEnd(40) + which);
}
