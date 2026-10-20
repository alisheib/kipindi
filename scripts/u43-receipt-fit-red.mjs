/** Physical red proof: run the real receipt guard against independent scratch files. */
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { MUTATIONS } from "./anchors/u43-receipt-fit.anchors.mjs";

const root = process.cwd();
const guard = resolve(root, "scripts/u43-receipt-fit.test.mts");
const paths = [
  "src/components/updown/updown-bet-receipt-modal.tsx",
  "src/components/markets/operation-result-modal.tsx",
  "src/app/globals.css",
];
const source = new Map(paths.map((path) => [path, readFileSync(resolve(root, path), "utf8")]));
const fingerprint = () => createHash("sha256").update(paths.map((p) => readFileSync(resolve(root, p))).join("\n")).digest("hex");
const before = fingerprint();
const scratch = mkdtempSync(join(tmpdir(), "u43-receipt-fit-"));
const inScratch = (path) => {
  const target = resolve(scratch, path);
  if (isAbsolute(relative(scratch, target)) || relative(scratch, target).startsWith("..")) {
    throw new Error(`Refusing path outside receipt scratch: ${path}`);
  }
  return target;
};
const restore = () => {
  for (const [path, body] of source) {
    const target = inScratch(path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, body);
  }
};
const run = () => spawnSync(process.execPath, [guard], { cwd: scratch, encoding: "utf8" });

const plants = MUTATIONS;

try {
  restore();
  const green = run();
  if (green.status !== 0) throw new Error(`Baseline guard failed: ${green.stderr || green.stdout}`);
  for (const { name, file: path, from, to } of plants) {
    restore();
    const body = source.get(path);
    if (!body?.includes(from)) throw new Error(`Plant anchor absent: ${name}`);
    writeFileSync(inScratch(path), body.replace(from, to));
    const red = run();
    if (red.status === 0) throw new Error(`RED MISSED: ${name}`);
    if (!/AssertionError|ERR_ASSERTION/.test(`${red.stderr}\n${red.stdout}`)) {
      throw new Error(`Guard failed for another reason: ${name}: ${red.stderr || red.stdout}`);
    }
    console.log(`RED: ${name}`);
  }
  if (fingerprint() !== before) throw new Error("Shared source files changed during receipt red proof");
  console.log(`U43 phone receipt fit red: ${plants.length}/${plants.length} physical reversions caught; shared source unchanged`);
} finally {
  const parent = resolve(tmpdir());
  if (dirname(scratch) !== parent) throw new Error("Refusing receipt scratch cleanup outside OS temp");
  rmSync(scratch, { recursive: true, force: true });
}
