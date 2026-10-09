// R5-G port · route-ghost.tsx: R5-H's routes table (and its `at` pin), the deposit entry handed `journey` — only a journey
// reader is drawn this ghost, so its deposit drawing is the journey's head.
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "./resolve-blocks.mjs";
const P = "F:/kipindi-r5g/src/components/journey/route-ghost.tsx";
resolve(P, [["      routes={routes}"]]);
const s = readFileSync(P, "utf8");
const from = '    "/wallet/deposit": <DepositGhost />,';
if (s.split(from).length !== 2) throw new Error("deposit entry not found exactly once");
writeFileSync(P, s.replace(from, '    "/wallet/deposit": <DepositGhost journey />,'));
console.log("route ghost: deposit entry takes `journey`");
