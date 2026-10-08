/**
 * THE SEVEN SCENARIOS, in order, and how big each is. Scenario 1 is the SCALE scenario and takes `--n`; the others derive
 * their size from it (a fraction of it, between a floor that keeps the scenario meaningful and a cap that keeps it quick).
 *
 * ⛔ This file holds no backslash (an editing tool decodes them).
 */
import type { Harness } from "./core.mts";
import { scale } from "./s1-scale.mts";

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
];
