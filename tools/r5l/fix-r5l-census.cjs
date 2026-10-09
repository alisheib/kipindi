// R5-L onto R5-G and R5-J (merged 2026-10-09): R5-L's new ghosts entered two censuses. Usage: node fix-r5l-census.cjs <root>
// · R5-G 4.12 (every source printing the regulator's name, classified): the agent page's ghost draws the waterfall's GBT row.
// · R5-J 1.1/1.2 (every count through formatNumber; no stale entry): the apply ghost's one-digit placeholders, and the bar
//   ghost's count phrase moved into the shared query-bar ghost.
const fs = require("fs");
const R = (process.argv[2] || "F:/kipindi-vis").replace(/\/?$/, "/");
function edit(p, pairs) {
  let s = fs.readFileSync(R + p, "utf8");
  const crlf = s.includes("\r\n");
  s = s.replace(/\r\n/g, "\n");
  for (const [a, b] of pairs) {
    const n = s.split(a).length - 1;
    if (n !== 1) throw new Error(`${p}: ${n} matches for ${a.slice(0, 90)}`);
    s = s.replace(a, () => b);
  }
  fs.writeFileSync(R + p, crlf ? s.replace(/\n/g, "\r\n") : s);
}
edit("scripts/visual-pass-r5g.test.mts", [
  ["    \"src/components/agent/commission-waterfall.tsx\": \"never splits where its line can hold it: the name STARTS the label, so a greedy line breaks inside it only when the line is narrower than the name\",\n",
   "    \"src/components/agent/commission-waterfall.tsx\": \"never splits where its line can hold it: the name STARTS the label, so a greedy line breaks inside it only when the line is narrower than the name\",\n" +
   "    \"src/app/agent/loading.tsx\": \"the agent page's loading ghost (R5-L, merged 2026-10-09): the waterfall's GBT row set and not shown, in the waterfall's own classes — it breaks where the waterfall's line does\",\n"],
]);
edit("scripts/visual-pass-r5j.test.mts", [
  ["  \"src/app/wallet/money-bar-ghost.tsx :: jsx :: count\": \"the loading ghost's phrase drawn transparent to its width (\\\"Miamala 00\\\"), not a count — R5-K/L's ghosts\",\n",
   "  \"src/components/ui/query-bar-ghost.tsx :: jsx :: count\": \"the loading ghost's phrase drawn transparent to its width (\\\"Miamala 00\\\"), not a count — R5-K's bar ghost, shared by R5-L (merged 2026-10-09)\",\n" +
   "  \"src/app/agent/apply/loading.tsx :: slot {n} :: \\\"0\\\"\": \"the loading ghost's placeholder digit (the seven documents: one digit's room), not a count — R5-L's ghosts (merged 2026-10-09)\",\n" +
   "  \"src/app/agent/apply/loading.tsx :: slot {total} :: \\\"0\\\"\": \"the loading ghost's placeholder digit (the seven documents: one digit's room), not a count — R5-L's ghosts (merged 2026-10-09)\",\n"],
]);
console.log("ok");
