// R5-J G-4: every query bar's result phrase and filter-count label group their count through `formatNumber`.
// Exact, counted replacements; CRLF kept.
import { readFileSync, writeFileSync } from "node:fs";
const ROOT = "F:/kipindi-r5j/";
const IMPORT_AFTER = /^import \{ FilterPill(?:, FilterGroupKey)? \} from "@\/components\/ui\/filter-pill";$/m;
const NEW_IMPORT = `import { formatNumber } from "@/lib/utils";`;
const BARS = {
  "src/app/fairness/fairness-bar.tsx": { result: 1, sheet: 1 },
  "src/app/notifications/notifications-bar.tsx": { result: 1, sheet: 0 },
  "src/app/positions/performance/performance-bar.tsx": { result: 1, sheet: 0 },
  "src/app/positions/positions-bar.tsx": { result: 1, sheet: 1 },
  "src/app/profile/account/account-bar.tsx": { result: 1, sheet: 1 },
  "src/app/profile/invite/recruits-bar.tsx": { result: 1, sheet: 0 },
  "src/app/proposals/proposals-bar.tsx": { result: 1, sheet: 1 },
  "src/app/results/results-bar.tsx": { result: 1, sheet: 1 },
  "src/app/updown/history/history-bar.tsx": { result: 1, sheet: 1 },
  "src/app/wallet/receipts/receipts-bar.tsx": { result: 1, sheet: 1 },
  "src/app/wallet/wallet-bar.tsx": { result: 1, sheet: 1 },
  "src/app/watchlist/watchlist-bar.tsx": { result: 1, sheet: 1 },
  "src/components/markets/discovery-bar.tsx": { result: 1, sheet: 1 },
};
const swap = (s, from, to, want, rel) => {
  const n = s.split(from).length - 1;
  if (n !== want) { console.error(`${rel}: ${JSON.stringify(from)} expected ${want}, found ${n}`); process.exit(1); }
  return s.split(from).join(to);
};
for (const [rel, want] of Object.entries(BARS)) {
  const p = ROOT + rel;
  const raw = readFileSync(p, "utf8");
  let s = raw.replace(/\r\n/g, "\n");
  s = swap(s, `.replace("{n}", String(resultCount))`, `.replace("{n}", formatNumber(resultCount))`, want.result, rel);
  s = swap(s, `.replace("{n}", String(sheetCount))`, `.replace("{n}", formatNumber(sheetCount))`, want.sheet, rel);
  if (rel === "src/components/markets/discovery-bar.tsx") {
    s = swap(s, `import { formatTzsCompact } from "@/lib/utils";`, `import { formatNumber, formatTzsCompact } from "@/lib/utils";`, 1, rel);
    s = swap(s, `                  {counts.topic[tp.id] ?? 0}\n`, `                  {formatNumber(counts.topic[tp.id] ?? 0)}\n`, 1, rel);
  } else {
    const m = IMPORT_AFTER.exec(s);
    if (!m) { console.error(`${rel}: no FilterPill import line`); process.exit(1); }
    if (s.includes(NEW_IMPORT)) { console.error(`${rel}: already imports formatNumber`); process.exit(1); }
    s = s.slice(0, m.index + m[0].length) + "\n" + NEW_IMPORT + s.slice(m.index + m[0].length);
  }
  writeFileSync(p, raw.includes("\r\n") ? s.replace(/\n/g, "\r\n") : s);
  console.log(`${rel}: result ${want.result}, sheet ${want.sheet}${rel.endsWith("discovery-bar.tsx") ? ", topic option 1" : ", import added"}`);
}
