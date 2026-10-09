// R5-B · F14: the receipts ghost takes the wrapped row's constant and the count line's own height; keeps CRLF.
const fs = require("fs");
const f = "src/app/wallet/receipts/loading.tsx";
const raw = fs.readFileSync(f, "utf8");
const crlf = raw.includes("\r\n");
let s = raw.replace(/\r\n/g, "\n");
const swaps = [
  ['import { QUERY_BAR_CLASS, QUERY_BAR_ROW1_CLASS, QUERY_BAR_ROW2_CLASS } from "@/components/ui/query-bar";',
   'import { QUERY_BAR_CLASS, QUERY_BAR_ROW1_WRAP_CLASS, QUERY_BAR_ROW2_CLASS } from "@/components/ui/query-bar";'],
  ["        {/* Row 1 — the three lenses (their own line below lg), then the result count. */}\n        <div className={`${QUERY_BAR_ROW1_CLASS} flex-wrap justify-end gap-y-1 lg:flex-nowrap`}>",
   "        {/* Row 1 — the three lenses (their own line below lg), then the result count: the bar's own wrapped row\n            (`QUERY_BAR_ROW1_WRAP_CLASS`, R5-B 2026-10-09 — it was retyped here), and the count as tall as its line\n            (11.5px mono × 1.5 = 17.25px, its bar centred in it), so row 2 lands where the page puts it. */}\n        <div className={QUERY_BAR_ROW1_WRAP_CLASS}>"],
  ['          <div className="h-3 w-[80px] shrink-0 rounded bg-bg-overlay" />',
   '          <div className="flex h-[17.25px] shrink-0 items-center"><div className="h-3 w-[80px] rounded bg-bg-overlay" /></div>'],
];
for (const [a, b] of swaps) {
  const n = s.split(a).length - 1;
  if (n !== 1) { console.error(`${f}: ${n} matches for ${JSON.stringify(a.slice(0, 80))}`); process.exit(1); }
  s = s.replace(a, () => b);
}
fs.writeFileSync(f, crlf ? s.replace(/\n/g, "\r\n") : s);
console.log(`${f}: ok`);
