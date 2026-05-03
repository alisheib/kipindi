/**
 * Public fairness proof endpoint.
 *
 * Returns the proof bundle (round id + revealed seed + commit + nonce + result)
 * for the most recent settled Mapigo rounds. Anyone can hit this and verify
 * the hash chain locally with the same SHA-256 + HMAC algorithm published in
 * `src/lib/server/fairness.ts`.
 */
import { NextResponse } from "next/server";
import { getRecentRounds } from "@/lib/server/mapigo-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const rounds = getRecentRounds(20);
  return NextResponse.json({
    proofs: rounds.map((r) => ({
      roundId: r.id,
      roundNumber: r.number,
      result: r.result,
      serverSeed: r.serverSeed,
      serverSeedHash: r.serverSeedHash,
      nonce: r.nonce,
      endedAt: r.endedAt,
    })),
  });
}
