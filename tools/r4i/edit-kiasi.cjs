const edit = require("./edit-lib.cjs");
process.chdir("F:/kipindi-r4i");
edit("src/app/markets/[id]/page.tsx", [
  [`label={t.market.volume} font={freshMarket ? undefined : "mono"} value={freshMarket ? t.market.noPoolYet : <span className="amount">`,
   `label={t.market.volume} font={freshMarket ? undefined : "mono"} value={freshMarket ? keepText(t.market.noPoolYet) : <span className="amount">`],
]);
