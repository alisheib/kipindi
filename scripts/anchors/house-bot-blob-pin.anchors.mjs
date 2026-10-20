/** The reviewed dictionary blob rotates on rebase; read the one declared slot. */
import { readFileSync } from "node:fs";

const file = "scripts/lib/house-bot-absence-cases.mts";
const source = readFileSync(new URL("../lib/house-bot-absence-cases.mts", import.meta.url), "utf8");
const slots = [...source.matchAll(/"src\/lib\/i18n-dict\.ts": "([a-f0-9]{40})"/g)];
if (slots.length !== 1) throw new Error("Expected one reviewed U43 dictionary blob slot");
const from = slots[0][0];
const hash = slots[0][1];
const changedHash = `${hash[0] === "0" ? "1" : "0"}${hash.slice(1)}`;
export const MUTATIONS = [
  { name: "wrong reviewed blob", file, from,
    to: from.replace(hash, changedHash) },
  { name: "missing dictionary path", file, from,
    to: from.replace("i18n-dict.ts", "i18n-removed.ts") },
];
