import { readFileSync } from "node:fs";
import { resolveAnchor } from "file:///F:/kipindi-rot2/scripts/red-anchor.mjs";
const src = readFileSync("F:/kipindi-rot2/src/lib/server/market-service.ts", "utf8");
const OPPOSITE = '    const opposite = mine.find((p) => p.houseBotId == null && p.status === "OPEN" && p.side !== opts.side);';
const anchors = {
  "wagering-credits-both-sides": '      const wr = opposite || ctx.kind === "house" ? { fulfilled: [], creditedToRealTzs: 0 } : await recordWageringLocked(userId, opts.stake, lockTx);',
  "OPPOSITE (mutations 2,4,5,6,7)": OPPOSITE,
  "cashout-keeps-the-turnover": "      await reverseWageringLocked(userId, p.stake);",
};
for (const [name, from] of Object.entries(anchors)) {
  const r = resolveAnchor(src, from);
  console.log(`${r.ok ? "OK " : "BAD"} ${name}: ${r.ok ? "resolves exactly once" : r.reason}`);
}
