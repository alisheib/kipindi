// Mapigo — mock data + waveform math.
// Replaced by live match feed in Sprint 3.

export type MapigoCall = "SPIKE" | "DRIFT" | "CALM";

export type MapigoRound = {
  id: string;
  number: number;
  result: MapigoCall;
  pool: number;
  payRate: { SPIKE: number; DRIFT: number; CALM: number };
  poolByCall: { SPIKE: number; DRIFT: number; CALM: number };
  endedAt: number;        // ms ago
  yourCall?: MapigoCall;  // your prediction
  yourStake?: number;
  yourReturn?: number;
};

export const recentRounds: MapigoRound[] = [
  { id: "r84", number: 84, result: "SPIKE", pool: 1_240_000, payRate: { SPIKE: 2.4, DRIFT: 3.1, CALM: 4.6 }, poolByCall: { SPIKE: 520_000, DRIFT: 410_000, CALM: 310_000 }, endedAt: 5,   yourCall: "SPIKE", yourStake: 1_000, yourReturn: 2_400 },
  { id: "r83", number: 83, result: "DRIFT", pool:   980_000, payRate: { SPIKE: 2.8, DRIFT: 2.6, CALM: 3.8 }, poolByCall: { SPIKE: 360_000, DRIFT: 380_000, CALM: 240_000 }, endedAt: 70 },
  { id: "r82", number: 82, result: "CALM",  pool: 1_120_000, payRate: { SPIKE: 3.4, DRIFT: 2.9, CALM: 2.2 }, poolByCall: { SPIKE: 320_000, DRIFT: 380_000, CALM: 420_000 }, endedAt: 132, yourCall: "DRIFT", yourStake: 500 },
  { id: "r81", number: 81, result: "SPIKE", pool: 1_410_000, payRate: { SPIKE: 2.1, DRIFT: 3.4, CALM: 4.8 }, poolByCall: { SPIKE: 670_000, DRIFT: 420_000, CALM: 320_000 }, endedAt: 195, yourCall: "SPIKE", yourStake: 800,   yourReturn: 1_680 },
  { id: "r80", number: 80, result: "DRIFT", pool: 1_080_000, payRate: { SPIKE: 2.6, DRIFT: 2.8, CALM: 4.2 }, poolByCall: { SPIKE: 410_000, DRIFT: 390_000, CALM: 280_000 }, endedAt: 258 },
  { id: "r79", number: 79, result: "CALM",  pool:   870_000, payRate: { SPIKE: 3.6, DRIFT: 2.7, CALM: 2.4 }, poolByCall: { SPIKE: 240_000, DRIFT: 320_000, CALM: 310_000 }, endedAt: 320 },
  { id: "r78", number: 78, result: "SPIKE", pool: 1_650_000, payRate: { SPIKE: 2.2, DRIFT: 3.2, CALM: 4.4 }, poolByCall: { SPIKE: 750_000, DRIFT: 510_000, CALM: 390_000 }, endedAt: 384 },
  { id: "r77", number: 77, result: "DRIFT", pool:   930_000, payRate: { SPIKE: 3.1, DRIFT: 2.5, CALM: 4.0 }, poolByCall: { SPIKE: 300_000, DRIFT: 370_000, CALM: 260_000 }, endedAt: 446 },
];

export const currentRound = {
  number: 85,
  startedAtMs: 22, // seconds elapsed in this round
  durationMs: 60_000,
  pool: 740_000,
  poolByCall: { SPIKE: 320_000, DRIFT: 240_000, CALM: 180_000 },
  payRate: { SPIKE: 2.3, DRIFT: 3.1, CALM: 4.2 },
  participants: 184,
};

export const sessionStats = {
  totalRounds: 84,
  yourWins: 38,
  yourWinRate: 45.2,
  yourROI: 18.3,
  topRoiToday: 62.1,
  yourStreak: 3,
  ambient: 60, // BPM
};

/**
 * Generate a deterministic Mapigo waveform sample over `points` values.
 * Combines a slow drift (low-freq sine), high-freq jitter, and rare spikes.
 * Output values 0..100 representing match-intensity at each tick.
 */
export function genWaveform(points = 120, seed = 1): number[] {
  const out: number[] = [];
  const spikes = new Set([
    Math.floor(points * 0.18) + (seed % 3),
    Math.floor(points * 0.46) - (seed % 4),
    Math.floor(points * 0.78) + (seed % 5),
  ]);
  for (let i = 0; i < points; i++) {
    const baseline = 28 + Math.sin((i + seed) * 0.06) * 6 + Math.sin((i + seed) * 0.13) * 4;
    const jitter = Math.sin((i + seed) * 0.7) * 3 + Math.sin((i + seed) * 1.7) * 2;
    let v = baseline + jitter;
    // Spike profile — sharp rise, decay
    spikes.forEach((sIdx) => {
      const dist = i - sIdx;
      if (dist >= -1 && dist <= 6) {
        if (dist === 0) v = 92;
        else if (dist === -1) v = Math.max(v, 60);
        else if (dist > 0) v = Math.max(v, 92 * Math.exp(-0.55 * dist));
      }
    });
    out.push(Math.min(98, Math.max(8, v)));
  }
  return out;
}

/** Detect outcome type for a window of waveform values. */
export function classifyWaveform(window: number[]): MapigoCall {
  if (!window.length) return "CALM";
  const max = Math.max(...window);
  const min = Math.min(...window);
  const range = max - min;
  if (max >= 75 && range >= 40) return "SPIKE";
  if (range >= 20) return "DRIFT";
  return "CALM";
}
