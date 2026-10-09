// R5-L · every suite under scripts/ that reads a touched (or planned) file — by its path, its src-relative path or its
// @/ import — with its npm names. Run from the worktree:  node <this file> [--planned]
const fs = require("fs");
const cp = require("child_process");
const PLANNED = [
  "src/components/ui/page-loader.tsx", "src/components/ui/query-bar-ghost.tsx", "src/app/wallet/money-bar-ghost.tsx",
  "src/app/agent/loading.tsx", "src/app/agent/loading-shared.tsx", "src/app/agent/apply/loading.tsx", "src/app/agent/status/loading.tsx",
  "src/app/agent/invite/[token]/loading.tsx", "src/app/leaderboard/loading.tsx", "src/app/results/loading.tsx", "src/app/results/page.tsx",
  "src/app/markets/loading.tsx", "src/app/markets/page.tsx", "src/app/live/loading.tsx",
  "src/app/fairness/loading.tsx", "src/app/help/loading.tsx", "src/app/notifications/loading.tsx", "src/app/profile/account/loading.tsx",
  "src/app/profile/activity/loading.tsx", "src/app/profile/invite/loading.tsx", "src/app/profile/kyc/loading.tsx",
  "src/app/profile/notifications/loading.tsx", "src/app/profile/responsible-gambling/loading.tsx", "src/app/profile/security/loading.tsx",
  "src/app/profile/sessions/loading.tsx", "src/app/profile/source-of-funds/loading.tsx", "src/app/proposals/[id]/loading.tsx",
  "src/app/proposals/loading.tsx", "src/app/proposals/new/loading.tsx", "src/app/watchlist/loading.tsx", "src/components/ui/back-link.tsx",
];
const planned = process.argv.includes("--planned");
const touched = planned ? PLANNED : [
  ...cp.execSync("git diff --name-only", { encoding: "utf8" }).trim().split(/\r?\n/),
  ...cp.execSync("git ls-files --others --exclude-standard", { encoding: "utf8" }).trim().split(/\r?\n/),
].filter((f) => f.startsWith("src/"));
const pkg = JSON.parse(fs.readFileSync("package.json", "utf8")).scripts;
const files = cp.execSync("git ls-files scripts", { encoding: "utf8" }).trim().split(/\r?\n/).filter((f) => /\.(mts|mjs|ts|js|cjs|cts)$/.test(f));
const out = [];
const names = new Set();
for (const f of files) {
  const s = fs.readFileSync(f, "utf8");
  const by = touched.filter((t) => s.includes(t) || s.includes(t.replace(/^src\//, "")) || s.includes(t.replace(/^src\//, "@/").replace(/\.tsx?$/, "")) || s.includes(t.replace(/^src\//, "").replace(/\.tsx?$/, "")));
  if (!by.length) continue;
  const base = f.replace(/^scripts\//, "");
  const n = Object.entries(pkg).filter(([k, v]) => /^(test|red):/.test(k) && v.split(/\s+/).some((w) => w.endsWith(base))).map(([k]) => k);
  n.forEach((x) => names.add(x));
  out.push(`${f} [${n.join(" ") || "—"}] <- ${by.join(", ")}`);
}
console.log(out.join("\n"));
console.log(`\nNPM: ${[...names].sort().join(" ")}`);
