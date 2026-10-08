/**
 * THE SEVEN SCENARIOS, in order, and how big each is. Scenario 1 is the SCALE scenario and takes `--n`; the others derive
 * their size from it (a fraction of it, between a floor that keeps the scenario meaningful and a cap that keeps it quick).
 *
 * ⛔ This file holds no backslash (an editing tool decodes them).
 */
import type { Harness } from "./core.mts";
import { scale } from "./s1-scale.mts";
import { drivers } from "./s2-drivers.mts";
import { controls } from "./s3-controls.mts";
import { faults } from "./s4-faults.mts";
import { crash } from "./s5-crash.mts";
import { receipts } from "./s6-receipts.mts";
import { credit } from "./s7-credit.mts";

export type Scenario = {
  n: number;
  key: string;
  name: string;
  /** How many people this scenario's audience holds, given the run's `--n`. */
  size: (n: number) => number;
  run: (h: Harness, size: number) => Promise<Record<string, unknown>>;
};

const clamp = (n: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, Math.round(n)));

export const SCENARIOS: readonly Scenario[] = [
  { n: 1, key: "scale", name: "SCALE", size: (n) => Math.max(40, n), run: scale },
  { n: 2, key: "drivers", name: "TWO DRIVERS", size: (n) => clamp(n * 0.4, 80, 1500), run: drivers },
  { n: 3, key: "controls", name: "PAUSE/RESUME/STOP", size: (n) => clamp(n * 0.4, 300, 1500), run: controls },
  { n: 4, key: "faults", name: "FAULTS", size: () => 200, run: faults },
  { n: 5, key: "crash", name: "CRASH AND REAP", size: (n) => clamp(n * 0.3, 300, 600), run: crash },
  { n: 6, key: "receipts", name: "RECEIPTS", size: (n) => clamp(n * 0.3, 300, 600), run: receipts },
  { n: 7, key: "credit", name: "CREDIT", size: (n) => clamp(n * 0.3, 180, 180), run: credit },
];
