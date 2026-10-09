// R5-B · F10 siblings: the four email subjects that quote a market's title cut it at a word with "…" (clipQuote); CRLF kept.
const fs = require("fs");
const f = "src/lib/server/market-service.ts";
const raw = fs.readFileSync(f, "utf8");
const crlf = raw.includes("\r\n");
let s = raw.replace(/\r\n/g, "\n");
const swaps = [
  ['subject: `Bet placed · ${opts.side} on "${market.titleEn.slice(0, 40)}"`,', 'subject: `Bet placed · ${opts.side} on "${clipQuote(market.titleEn, 40)}"`,'],
  ["subject: `Betting closed — if you're right you receive ${formatTzs(Math.max(ifYes, ifNo))} · ${m.titleEn.slice(0, 40)}`,", "subject: `Betting closed — if you're right you receive ${formatTzs(Math.max(ifYes, ifNo))} · ${clipQuote(m.titleEn, 40)}`,"],
  ["subject: `Market awaiting resolution · ${m.titleEn.slice(0, 60)}`,", "subject: `Market awaiting resolution · ${clipQuote(m.titleEn, 60)}`,"],
  ["subject: `Market cancelled · ${m.titleEn.slice(0, 50)}`,", "subject: `Market cancelled · ${clipQuote(m.titleEn, 50)}`,"],
];
for (const [a, b] of swaps) {
  const n = s.split(a).length - 1;
  if (n !== 1) { console.error(`${n} matches for ${a.slice(0, 70)}`); process.exit(1); }
  s = s.replace(a, () => b);
}
fs.writeFileSync(f, crlf ? s.replace(/\n/g, "\r\n") : s);
console.log("ok");
