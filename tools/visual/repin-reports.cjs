// house-bot-reports: the two pins round 3's R3-C moved, re-pinned in the open (cwd = F:/kipindi-vis).
const fs = require("fs");
const p = "scripts/lib/house-bot-reports-cases.mts";
let s = fs.readFileSync(p, "utf8");
const crlf = s.includes("\r\n");
s = s.replace(/\r\n/g, "\n");
const rep = (a, b) => {
  const n = s.split(a).length - 1;
  if (n !== 1) throw new Error(`anchor ×${n}: ${a.slice(0, 80)}`);
  s = s.replace(a, b);
};

// 1 · 0.232.2: the last of the seven sites moved +4.
rep("     * order — so the controls' `:2838`/`:1570` move to `:2887`/`:1619`.\n     */\n",
  "     * order — so the controls' `:2838`/`:1570` move to `:2887`/`:1619`.\n" +
  "     * ⭐ AND +4 ON THE LAST ONE (2026-10-09, the visual pass's round 3, R3-C): the win notice in `settleMarket` stopped\n" +
  "     * appending the position id to its words and carries it in its link, four lines above the emergency void — so its\n" +
  "     * `db.txn.create(` reads 4697 (main's 4693, byte for byte the same write); the six before it do not move.\n" +
  "     */\n");
rep(`"market-service.ts:4100", "market-service.ts:4693"]), j(marked));`,
  `"market-service.ts:4100", "market-service.ts:4697"]), j(marked));`);

// 2 · 0.198.2: the player's cancellation notice, re-measured with its change reviewed as one.
rep(`  notifyMarketCancelled: "0feaad927016a8180cb40edf492b2c5710567d8b9fb716a2e93e9212449e1392",`,
  `  // ⭐ RE-MEASURED 2026-10-09 WITH ITS CHANGE REVIEWED AS ONE (the visual pass's round 3, R3-C; main's 0feaad92… by the same\n` +
  `  // measure): an officer's reason that already ends in "." no longer gets a second one (\`endClause\`), the " · pos_…"\n` +
  `  // suffix left the words for the link (\`ticketHref\`, the refunded ticket, falling back to /wallet). No house reader, no\n` +
  `  // house word, the same three sentences otherwise — the four other notifiers' hashes are unchanged.\n` +
  `  notifyMarketCancelled: "303f06a9fa810c98f8e5864a2977161c8b9f8097f93d77c7ba7e843d3e0539f9",`);

fs.writeFileSync(p, crlf ? s.replace(/\n/g, "\r\n") : s);
console.log("ok");
