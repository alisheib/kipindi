/** Physical red proof for the dev-only U43 corruption fixture and both player
 * surfaces. Run only while the shared source is frozen. Each planted reversal
 * must make its own green guard fail, then every byte is restored. */
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { MUTATIONS } from "./anchors/u43-failclosed-fixture.anchors.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const files = {
  route: "src/app/api/dev-test/u43-failclosed-fixture/route.ts",
  card: "src/components/updown/updown-card.tsx",
  detail: "src/app/updown/[roundId]/page.tsx",
};
const routeOnly = process.env.ROUTE_ONLY === "1";
const cli = join(root, "node_modules", "tsx", "dist", "cli.mjs");
const test = join(root, "scripts", "u43-failclosed-fixture.test.mts");
const goldTest = join(root, "scripts", "gold-is-money.test.mts");
const run = () => spawnSync(process.execPath, [cli, test], { cwd: root, encoding: "utf8", timeout: 60_000 });
const runGold = () => spawnSync(process.execPath, [cli, goldTest], { cwd: root, encoding: "utf8", timeout: 60_000 });
const control = run();
if (control.status !== 0) throw new Error(`green control failed before red: ${control.stdout}\n${control.stderr}`);
const goldControl = runGold();
if (goldControl.status !== 0) throw new Error(`gold guard failed before red: ${goldControl.stdout}\n${goldControl.stderr}`);

const cases = MUTATIONS.filter((entry) => !routeOnly || entry.key === "route");
const touched = new Set(cases.map((entry) => entry.key));
const original = new Map([...touched].map((key) => [key, readFileSync(join(root, files[key]), "utf8")]));

let caught = 0;
try {
  for (const { name, key, from, to, expected, goldProof } of cases) {
    const path = join(root, files[key]);
    const src = original.get(key);
    if (readFileSync(path, "utf8") !== src) throw new Error(`${name}: source changed during red fleet`);
    if (src.split(from).length !== 2) throw new Error(`${name}: expected exactly one mutation anchor`);
    try {
      writeFileSync(path, src.replace(from, to));
      const result = run();
      const output = `${result.stdout}\n${result.stderr}`;
      if (result.status === 0 || !output.includes(expected)) {
        throw new Error(`${name}: guard did not catch the planted reversal: ${output.slice(0, 800)}`);
      }
      if (goldProof) {
        const gold = runGold();
        if (gold.status === 0 || !gold.stdout.includes("FAIL 1.card · Up & Down's only gold")) {
          throw new Error(`${name}: gold guard did not catch the planted reversal: ${gold.stdout.slice(0, 800)}`);
        }
      }
      caught++;
      console.log(`RED ${caught}/${cases.length}: ${name}`);
    } finally {
      writeFileSync(path, src);
    }
  }
} finally {
  for (const key of touched) {
    const relative = files[key];
    const path = join(root, relative);
    if (readFileSync(path, "utf8") !== original.get(key)) {
      throw new Error(`${relative} was not restored byte-for-byte`);
    }
  }
}
const after = run();
if (after.status !== 0) throw new Error(`green control failed after red: ${after.stdout}\n${after.stderr}`);
const goldAfter = runGold();
if (goldAfter.status !== 0) throw new Error(`gold guard failed after red: ${goldAfter.stdout}\n${goldAfter.stderr}`);
console.log(`U43 fail-closed physical red: ${caught}/${cases.length} reversals caught, all source restored`);
