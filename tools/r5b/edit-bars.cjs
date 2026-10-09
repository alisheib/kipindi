// R5-B · F14: the two money bars take QUERY_BAR_ROW1_WRAP_CLASS (query-bar.tsx); keeps CRLF; refuses anything ambiguous.
const fs = require("fs");
const files = ["src/app/wallet/wallet-bar.tsx", "src/app/wallet/receipts/receipts-bar.tsx"];
for (const f of files) {
  const raw = fs.readFileSync(f, "utf8");
  const crlf = raw.includes("\r\n");
  let s = raw.replace(/\r\n/g, "\n");
  const swaps = [
    ['<div className={cn(QUERY_BAR_ROW1_CLASS, "flex-wrap justify-end gap-y-1 lg:flex-nowrap")}>', "<div className={QUERY_BAR_ROW1_WRAP_CLASS}>"],
    ["  QUERY_BAR_ROW1_CLASS,\n", "  QUERY_BAR_ROW1_WRAP_CLASS,\n"],
    ['import { cn } from "@/lib/utils";\n', ""],
  ];
  for (const [a, b] of swaps) {
    const n = s.split(a).length - 1;
    if (n !== 1) { console.error(`${f}: ${n} matches for ${JSON.stringify(a)}`); process.exit(1); }
    s = s.replace(a, () => b);
  }
  if (/\bcn\(/.test(s)) { console.error(`${f}: cn( still used`); process.exit(1); }
  fs.writeFileSync(f, crlf ? s.replace(/\n/g, "\r\n") : s);
  console.log(`${f}: ok`);
}
