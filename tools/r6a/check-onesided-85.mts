// R6-A · evaluate test:one-sided 8.5's new clauses on the current market page, without running the suite (read-only).
import { readFileSync } from "node:fs";
import { decomment } from "file:///F:/kipindi-r6a/scripts/lib/decomment.mts";
const detail = decomment(readFileSync("F:/kipindi-r6a/src/app/markets/[id]/page.tsx", "utf8").split("\r\n").join("\n"));
const asideAt = detail.indexOf("<aside ");
const aside = asideAt > 0 ? detail.slice(asideAt, detail.indexOf("</aside>", asideAt)) : "";
console.log("count", (aside.match(/\{oneSidedCallout\}/g) ?? []).length);
console.log("break arm", /session && breakBody \? \(\s*<>\s*(?:\{\s*\}\s*)*<h2 id=\{BET_PANEL_HEADING\} className="sr-only">\{t\.market\.placeYourStake\}<\/h2>\s*\{oneSidedCallout\}/.test(aside));
const i = aside.indexOf("session && breakBody");
console.log(JSON.stringify(aside.slice(i, i + 160)));
