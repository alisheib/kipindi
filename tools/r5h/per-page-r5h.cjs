// R5-H · G-2: the loading and not-found elements each polled page's payload carries (a refresh renders from the root),
// before and after, for a journey and a classic reader — from measure-conventions.cts's tables (R5-D's per-page.cjs,
// extended). Each new client module a payload names also costs one import row, ~200 B (R5-D's Turbopack-shaped estimate).
// Usage: node per-page-r5h.cjs <dir> <locale>
const fs = require("fs");
const [dir, l = "sw"] = process.argv.slice(2);
const table = (f) => JSON.parse(fs.readFileSync(`${dir}/${f}`, "utf8").split(/\r?\n/).find((x) => x.startsWith("JSON ")).slice(5));
const T = { jb: table(`conv-before-${l}-journey.log`), ja: table(`conv-after-${l}-journey.log`), cb: table(`conv-before-${l}-classic.log`), ca: table(`conv-after-${l}-classic.log`) };
const ROOT = ["src/app/loading.tsx", "src/app/not-found.tsx"];
const PAGES = [
  ["/markets/[id]", 15, ["src/app/markets/loading.tsx", "src/app/markets/[id]/loading.tsx", "src/app/markets/[id]/not-found.tsx"]],
  ["/live", 15, ["src/app/live/loading.tsx"]],
  ["/updown/[roundId] (live)", 20, ["src/app/updown/loading.tsx", "src/app/updown/[roundId]/loading.tsx"]],
  ["/updown/[roundId] (awaiting result)", 5, ["src/app/updown/loading.tsx", "src/app/updown/[roundId]/loading.tsx"]],
  ["/updown", 20, ["src/app/updown/loading.tsx"]],
  ["/updown/history (a round live)", 20, ["src/app/updown/loading.tsx", "src/app/updown/history/loading.tsx"]],
  ["/positions", 20, ["src/app/positions/loading.tsx"]],
  ["/wallet", 20, ["src/app/wallet/loading.tsx"]],
  ["/wallet/receipts (one in flight)", 15, ["src/app/wallet/loading.tsx", "src/app/wallet/receipts/loading.tsx"]],
  ["/wallet/receipt/[id] (in flight)", 10, ["src/app/wallet/loading.tsx", "src/app/wallet/receipt/[id]/loading.tsx"]],
  ["/wallet/deposit/return (pending)", 10, ["src/app/wallet/loading.tsx", "src/app/wallet/deposit/loading.tsx", "src/app/wallet/deposit/return/loading.tsx"]],
  ["/watchlist", 20, ["src/app/watchlist/loading.tsx"]],
  ["/markets", 30, ["src/app/markets/loading.tsx"]],
  ["/leaderboard", 30, ["src/app/leaderboard/loading.tsx"]],
  ["/results", 60, ["src/app/results/loading.tsx"]],
];
const sum = (t, files) => files.reduce((s, f) => { if (!t[f] || t[f][0] < 0) throw new Error("missing " + f); return s + t[f][0]; }, 0);
const kb = (n) => (n / 1000).toFixed(1);
console.log(`locale ${l} · bytes of Flight JSON per refresh (= in each document) · the root's loading + not-found, then the page's segments`);
console.log("page | every | journey reader: before → after B (per min KB) | classic reader: before → after B (per min KB)");
for (const [page, sec, own] of PAGES) {
  const files = [...ROOT, ...own], m = 60 / sec;
  const jb = sum(T.jb, files), ja = sum(T.ja, files), cb = sum(T.cb, files), ca = sum(T.ca, files);
  console.log(`${page} | ${sec} s | ${jb} → ${ja} (${kb(jb * m)} → ${kb(ja * m)}) | ${cb} → ${ca} (${kb(cb * m)} → ${kb(ca * m)})`);
}
const seg = (t) => Object.entries(t).filter(([f]) => !f.startsWith("src/app/admin") && f.endsWith("loading.tsx") && f !== "src/app/loading.tsx").reduce((s, [, v]) => s + v[0], 0);
console.log(`\nall player segment loading elements together: journey ${seg(T.jb)} → ${seg(T.ja)} B, classic ${seg(T.cb)} → ${seg(T.ca)} B`);
