/** S17's disposable load shape. MASWALI-PLAN §7b S7 owns the synthetic test reference. */
export const DEFAULT_RUSH = {
  testReferencePerMin: 30,
  multiplier: 10,
  minutes: 10,
  lastMinuteFactor: 3,
  afterCloseSec: 60,
} as const;

/** The fixture's purchase sizes. The worker and the load budget must use the same distribution. */
export const RUSH_SLIP_SIZES = [1, 1, 1, 1, 2, 2, 3, 5, 10] as const;

export type RushShapeInput = {
  testReferencePerMin: number;
  multiplier: number;
  minutes: number;
  lastMinuteFactor: number;
  afterCloseSec: number;
};

export function rushShape(input: RushShapeInput) {
  const rate = input.testReferencePerMin * input.multiplier;
  return {
    rate,
    lastMinuteRate: rate * input.lastMinuteFactor,
    plannedBefore: rate * (Math.max(0, input.minutes - 1) + Math.min(1, input.minutes) * input.lastMinuteFactor),
    plannedAfter: rate * input.afterCloseSec / 60,
  };
}

/** Six Poisson standard deviations below the planned arrivals; a missed load is a failed proof. */
export function arrivalFloor(planned: number): number {
  return Math.max(0, Math.floor(planned - 6 * Math.sqrt(planned)));
}

export function rushTargetLabel(input: RushShapeInput): string {
  const { rate } = rushShape(input);
  return `${rate}/min Millionea purchases (${input.testReferencePerMin}/min synthetic test reference × ${input.multiplier}; not a measured production peak)`;
}
