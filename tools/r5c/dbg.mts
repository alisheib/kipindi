import { readFileSync } from "node:fs";
import { decomment } from "file:///F:/kipindi-r5c/scripts/lib/decomment.mts";
const src = decomment(readFileSync("F:/kipindi-r5c/src/components/ui/empty-state.tsx", "utf8").replace(/\r\n/g, "\n"));
const at = src.indexOf("function DefaultIllustration");
const end = src.indexOf("\n}\n", at);
console.log(at, end);
console.log(JSON.stringify(src.slice(at, at + 300)));
console.log(JSON.stringify(src.slice(Math.max(at, end - 150), end + 5)));
