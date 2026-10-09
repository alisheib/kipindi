// How often does each of red:ops-provision-staff's six plant anchors occur in scripts/ops-provision-staff.mts?
// (test:red-anchors §3 requires a declared anchor to resolve exactly once.)
import { readFileSync } from "node:fs";
const src = readFileSync("F:/kipindi-s7/scripts/ops-provision-staff.mts", "utf8").replace(/\r\n/g, "\n");
const anchors = [
  "if (!process.env.DATABASE_URL) {",
  'if (has("--execute")) {',
  "function outsideOrIgnored(path: string): boolean {",
  "_PASSWORD=`, \"m\").test(",
  'import type { StoredUser, StoredWallet } from "../src/lib/server/store.ts";',
  "for (const c of created) console.log(`   ${c.role.padEnd(11)} ${c.phone}   ${c.id}`);",
];
for (const a of anchors) console.log(`${src.split(a).length - 1}× ${a}`);
