/**
 * Provably-fair Mapigo round outcomes.
 *
 * Pattern: commit-reveal.
 *  1. Round opens — server picks a random `serverSeed` (32 bytes), publishes only
 *     SHA-256(serverSeed) (the "commit"). Players see the hash before staking.
 *  2. Round settles — server publishes `serverSeed`. Anyone can verify
 *     SHA-256(serverSeed) == published commit AND recompute the outcome.
 *  3. Outcome derives from HMAC-SHA-256(serverSeed, `${roundId}:${nonce}`).
 *     The first 4 bytes of the HMAC, mapped against the published call-distribution,
 *     pick SPIKE / DRIFT / CALM.
 *
 * Aligns with GLI-19 §6.2 (game-round integrity) + LCCP §RTS 7B (player verifiability).
 */
import { createHash, createHmac, randomBytes } from "node:crypto";

export type CallResult = "SPIKE" | "DRIFT" | "CALM";

/** Distribution used by the verifier and the picker — must stay synchronised. */
export const CALL_DISTRIBUTION: Array<{ call: CallResult; weight: number }> = [
  { call: "SPIKE", weight: 45 },
  { call: "DRIFT", weight: 35 },
  { call: "CALM",  weight: 20 },
];

/** Generate a 32-byte server seed (CSPRNG, hex-encoded). */
export function generateServerSeed(): string {
  return randomBytes(32).toString("hex");
}

/** SHA-256 commit of a server seed. Published before the round closes. */
export function commitServerSeed(serverSeed: string): string {
  return createHash("sha256").update(serverSeed, "utf8").digest("hex");
}

/**
 * Derive the outcome from (serverSeed, roundId, nonce).
 * Pure function — same inputs always produce the same outcome.
 * Anyone can recompute this client-side after the seed is revealed.
 */
export function deriveOutcome(serverSeed: string, roundId: string, nonce: number): CallResult {
  const mac = createHmac("sha256", serverSeed).update(`${roundId}:${nonce}`).digest();
  const x = mac.readUInt32BE(0) % 100;
  let cursor = 0;
  for (const slot of CALL_DISTRIBUTION) {
    cursor += slot.weight;
    if (x < cursor) return slot.call;
  }
  return CALL_DISTRIBUTION[CALL_DISTRIBUTION.length - 1].call;
}

/** Verify a revealed seed matches its commit. Constant-time-friendly comparison. */
export function verifyCommit(serverSeed: string, expectedHash: string): boolean {
  const got = commitServerSeed(serverSeed);
  if (got.length !== expectedHash.length) return false;
  let diff = 0;
  for (let i = 0; i < got.length; i++) diff |= got.charCodeAt(i) ^ expectedHash.charCodeAt(i);
  return diff === 0;
}

/**
 * Full verification path used by the public /fairness verifier.
 * Returns whether the commit matches AND the recomputed outcome.
 */
export function verifyRound(opts: {
  serverSeed: string;
  serverSeedHash: string;
  roundId: string;
  nonce: number;
  expectedResult: CallResult;
}): { valid: boolean; commitMatch: boolean; computed: CallResult } {
  const commitMatch = verifyCommit(opts.serverSeed, opts.serverSeedHash);
  const computed = deriveOutcome(opts.serverSeed, opts.roundId, opts.nonce);
  return { valid: commitMatch && computed === opts.expectedResult, commitMatch, computed };
}
