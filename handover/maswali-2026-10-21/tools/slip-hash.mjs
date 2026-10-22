// Measures the Millionea slip paragraph's hash per locale exactly as scripts/lib/s8-published-words.mts does.
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
const file = process.argv[2];
const text = readFileSync(file, "utf8").replace(/\r\n/g, "\n");
const sha = (s) => createHash("sha256").update(s).digest("hex").slice(0, 12);
const WORDING_BLOCK = /\n {8}<MillioneaWording>[\s\S]*?\n {8}<\/MillioneaWording>/g;
const SLIP_PARAGRAPH = /<p data-policy-addition="millionea-slip">[\s\S]*?<\/p>/;
const wrapped = [...text.matchAll(WORDING_BLOCK)].map((m) => m[0]);
const slips = wrapped.map((w) => w.match(SLIP_PARAGRAPH)?.[0] ?? "");
["en", "sw", "zh"].forEach((loc, i) => console.log(loc, sha((slips[i] ?? "").replace(/\s+/g, " ").trim())));
