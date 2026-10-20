/** D19a's U43 publication pin must survive a rebase and a fresh checkout. */
import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { U43_REVIEWED_BLOBS, u43ReviewedBlobMatches } from "./lib/house-bot-absence-cases.mts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const git = (...args: string[]) => execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
let passed = 0, failed = 0;
const ok = (name: string, condition: boolean) => {
  if (condition) { passed++; console.log(`ok ${name}`); }
  else { failed++; console.log(`FAIL ${name}`); }
};

const paths = Object.keys(U43_REVIEWED_BLOBS).sort();
const expected = [
  "src/app/legal/rules/_content-up-down.tsx",
  "src/app/legal/rules/up-down/page.tsx",
  "src/lib/i18n-dict.ts",
].sort();
ok("U43 D19a pin population is exactly the dictionary and both Rules files",
  JSON.stringify(paths) === JSON.stringify(expected));
for (const rel of expected) {
  let committed: string | null = null;
  try { committed = git("rev-parse", `HEAD:${rel}`); } catch { /* missing is a failing premise */ }
  ok(`${rel} reviewed blob is the blob committed at HEAD`,
    committed !== null && /^[a-f0-9]{40}$/.test(committed) && u43ReviewedBlobMatches(rel, committed));
  ok(`${rel} pin rejects a changed blob and an absent blob`,
    committed !== null && !u43ReviewedBlobMatches(rel, `${committed[0] === "0" ? "1" : "0"}${committed.slice(1)}`)
    && !u43ReviewedBlobMatches(rel, null));
}
ok("U43 pin refuses a different path even with the dictionary's reviewed blob",
  !u43ReviewedBlobMatches("src/lib/not-the-dictionary.ts", U43_REVIEWED_BLOBS["src/lib/i18n-dict.ts"]));
console.log(`house-bot-blob-pin: ${passed} passed, ${failed} failed`);
process.exitCode = failed === 0 ? 0 : 1;
