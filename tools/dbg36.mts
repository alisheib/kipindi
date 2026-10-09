import { readFileSync } from "node:fs";
import { decomment } from "./scripts/lib/decomment.mts";
const page = decomment(readFileSync("src/app/notifications/page.tsx", "utf8").replace(/\r\n/g, "\n"));
console.log((page.match(/<DotSeq text=\{pickTitle\(n\)\} renderPart=\{moneyRuns\} \/>/g) ?? []).length);
console.log(/\{pickTitle\(n\)\}/.test(page), page.includes("{moneySentence(pickBody(n))}"), /\>\{pickBody\(n\)\}</.test(page));
const i = page.indexOf("pickTitle(n)"); console.log(page.slice(i - 200, i + 100));
