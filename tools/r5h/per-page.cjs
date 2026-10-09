// R5-D: the convention elements each polled page's refresh payload carries (a refresh renders from the root), before and
// after, from measure-conventions.cts's tables. Usage: node per-page.cjs <before.log> <after.log>
const fs = require("fs");
const table = (f) => JSON.parse(fs.readFileSync(f, "utf8").split(/\r?\n/).find((l) => l.startsWith("JSON ")).slice(5));
const B = table(process.argv[2]), A = table(process.argv[3]);
const ROOT = ["src/app/loading.tsx", "src/app/not-found.tsx"];
const PAGES = [
  ["/markets/[id]", 15, ["src/app/markets/loading.tsx", "src/app/markets/[id]/loading.tsx", "src/app/markets/[id]/not-found.tsx"]],
  ["/live", 15, ["src/app/live/loading.tsx"]],
  ["/updown/[roundId] (live)", 20, ["src/app/updown/loading.tsx", "src/app/updown/[roundId]/loading.tsx"]],
  ["/updown/[roundId] (awaiting result / handover)", 5, ["src/app/updown/loading.tsx", "src/app/updown/[roundId]/loading.tsx"]],
  ["/updown", 20, ["src/app/updown/loading.tsx"]],
  ["/updown/history (while a round is live)", 20, ["src/app/updown/loading.tsx", "src/app/updown/history/loading.tsx"]],
  ["/positions", 20, ["src/app/positions/loading.tsx"]],
  ["/wallet", 20, ["src/app/wallet/loading.tsx"]],
  ["/wallet/receipts (while one is in flight)", 15, ["src/app/wallet/loading.tsx", "src/app/wallet/receipts/loading.tsx"]],
  ["/wallet/receipt/[id] (while in flight)", 10, ["src/app/wallet/loading.tsx", "src/app/wallet/receipt/[id]/loading.tsx"]],
  ["/wallet/deposit/return (pending)", 10, ["src/app/wallet/loading.tsx", "src/app/wallet/deposit/loading.tsx", "src/app/wallet/deposit/return/loading.tsx"]],
  ["/watchlist", 20, ["src/app/watchlist/loading.tsx"]],
  ["/markets", 30, ["src/app/markets/loading.tsx"]],
  ["/leaderboard", 30, ["src/app/leaderboard/loading.tsx"]],
  ["/results", 60, ["src/app/results/loading.tsx"]],
];
const sum = (T, files) => files.reduce((s, f) => { if (!T[f] || T[f][0] < 0) throw new Error("missing " + f); return s + T[f][0]; }, 0);
const kb = (n) => (n / 1000).toFixed(1);
console.log("page | every | per refresh before → after (B) | of which segment loading files (unchanged) | per minute before → after (KB)");
for (const [page, sec, own] of PAGES) {
  const files = [...ROOT, ...own];
  const b = sum(B, files), a = sum(A, files), seg = sum(A, own.filter((f) => f.endsWith("loading.tsx")));
  const perMin = 60 / sec;
  console.log(`${page} | ${sec} s | ${b} → ${a} | ${seg} | ${kb(b * perMin)} → ${kb(a * perMin)}`);
}
const rootB = sum(B, ROOT), rootA = sum(A, ROOT);
console.log(`\nevery journey document and every refresh, whatever the page: the root's two elements ${rootB} → ${rootA} B`);
