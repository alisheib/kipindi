/**
 * U43 browser evidence for money rows that the ordinary local handover cannot pause at.
 *
 * This deliberately corrupts ONE already-settled, synthetic demo player's in-memory
 * position. The payment-pending mode also hides the settlement stamps so the real
 * board/detail render their decided-but-unpaid copy. The ledger is deliberately not
 * changed; every screenshot must be labelled LOCAL SYNTHETIC DISPLAY STATE, never a
 * real payment, feed read or production fact. Restore before another fixture.
 *
 * The route is unreachable in production, with a database, from a nonlocal origin,
 * or without the existing /auth/demo player session. It is one-use at a time and
 * accepts only explicit row IDs already owned by that player.
 */
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { currentSession } from "@/lib/server/auth-service";
import { marketStore, positionStore } from "@/lib/server/market-dal";
import { roundStore } from "@/lib/server/updown-dal";
import { hasDatabase } from "@/lib/server/prisma";
import { db } from "@/lib/server/store";
import { validRealizedPayout } from "@/lib/updown-result-truth";
import type { StoredPosition } from "@/lib/server/market-service";

type Mode = "payment-pending" | "settled-open" | "null-payout" | "invalid-payout";
type Active = {
  id: string;
  userId: string;
  roundId: string;
  marketId: string;
  position: StoredPosition;
  marketSettledAt: string;
  roundSettledAt: string;
  mode: Mode;
};

declare global {
  // eslint-disable-next-line no-var
  var __u43FailclosedFixture: Active | undefined;
}

const reply = (body: object, status = 200) => NextResponse.json(body, {
  status, headers: { "Cache-Control": "no-store" },
});
const localHost = (req: Request) => {
  const url = new URL(req.url);
  const origin = req.headers.get("origin");
  return (url.hostname === "localhost" || url.hostname === "127.0.0.1")
    && (origin == null || origin === url.origin);
};

export async function POST(req: Request) {
  // FIRST: the deployed build cannot reach a store, a session, or a JSON body.
  if (process.env.NODE_ENV !== "development") return reply({ ok: false, error: "Not available" }, 404);
  if (!localHost(req)) return reply({ ok: false, error: "Localhost only" }, 404);
  if (process.env.DATABASE_URL || hasDatabase()) return reply({ ok: false, error: "In-memory local evidence only" }, 409);

  const session = await currentSession();
  if (!session) return reply({ ok: false, error: "Sign in required" }, 401);
  const user = await db.user.findById(session.userId);
  if (!user || user.role !== "PLAYER" || user.phoneE164 !== "+255700000000" || user.displayName !== "Demo Player") {
    return reply({ ok: false, error: "Synthetic demo player required" }, 403);
  }

  const input = await req.json().catch(() => null);
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return reply({ ok: false, error: "One bounded fixture operation required" }, 400);
  }

  if (input.operation === "restore") {
    if (Object.keys(input).sort().join(",") !== "fixtureId,operation"
      || typeof input.fixtureId !== "string" || !/^[a-f0-9-]{36}$/.test(input.fixtureId)) {
      return reply({ ok: false, error: "Fixture ID required" }, 400);
    }
    const active = globalThis.__u43FailclosedFixture;
    if (!active || active.id !== input.fixtureId || active.userId !== session.userId) {
      return reply({ ok: false, error: "Own active fixture not found" }, 404);
    }
    await positionStore.set(active.position);
    if (active.mode === "payment-pending") {
      await marketStore.stamp(active.marketId, { settledAt: active.marketSettledAt });
      await roundStore.patch(active.roundId, { settledAt: active.roundSettledAt });
    }
    const [restoredPosition, restoredMarket, restoredRound] = await Promise.all([
      positionStore.get(active.position.id), marketStore.get(active.marketId), roundStore.get(active.roundId),
    ]);
    if (!restoredPosition || !restoredMarket || !restoredRound
      || restoredPosition.status !== active.position.status
      || restoredPosition.finalPayout !== active.position.finalPayout
      || restoredPosition.settledAt !== active.position.settledAt
      || restoredMarket.settledAt !== active.marketSettledAt
      || restoredRound.settledAt !== active.roundSettledAt) {
      return reply({ ok: false, error: "Original local rows did not read back" }, 500);
    }
    delete globalThis.__u43FailclosedFixture;
    return reply({ ok: true, restored: true, roundId: active.roundId,
      positionStatus: restoredPosition.status, payoutValid: validRealizedPayout({
        status: restoredPosition.status, stake: restoredPosition.stake, payout: restoredPosition.finalPayout,
      }), marketSettled: restoredMarket.settledAt != null, roundSettled: restoredRound.settledAt != null });
  }

  const modes: readonly Mode[] = ["payment-pending", "settled-open", "null-payout", "invalid-payout"];
  if (input.operation !== "apply" || Object.keys(input).sort().join(",") !== "mode,operation,positionId,roundId"
    || !modes.includes(input.mode)
    || typeof input.roundId !== "string" || !/^udr_[a-z0-9]{4,100}$/.test(input.roundId)
    || typeof input.positionId !== "string" || !/^[a-zA-Z0-9_-]{4,120}$/.test(input.positionId)) {
    return reply({ ok: false, error: "One bounded round, position and mode required" }, 400);
  }
  if (globalThis.__u43FailclosedFixture) return reply({ ok: false, error: "Restore the active fixture first" }, 409);

  const round = await roundStore.get(input.roundId);
  const market = round ? await marketStore.get(round.marketId) : null;
  const position = await positionStore.get(input.positionId);
  if (!round || !market || market.productLine !== "UPDOWN" || market.id !== round.marketId
    || (market.status !== "RESOLVED" && market.status !== "VOIDED") || market.resolvedOutcome == null
    || !round.resolvedAt || !round.settledAt || !market.settledAt
    || !position || position.userId !== session.userId || position.marketId !== market.id
    || position.status === "OPEN" || !position.settledAt
    || !validRealizedPayout({ status: position.status, stake: position.stake, payout: position.finalPayout })) {
    return reply({ ok: false, error: "Premise absent: own genuinely settled Up & Down position required" }, 409);
  }

  // Another local capture can start while the three row reads above await. The
  // second check and assignment below have no await between them, so only one
  // request can own the original rows that a later restore must put back.
  if (globalThis.__u43FailclosedFixture != null) {
    return reply({ ok: false, error: "A fixture started while the rows were read" }, 409);
  }

  const active: Active = {
    id: randomUUID(), userId: session.userId, roundId: round.id, marketId: market.id,
    position: { ...position }, marketSettledAt: market.settledAt,
    roundSettledAt: round.settledAt, mode: input.mode,
  };
  globalThis.__u43FailclosedFixture = active;
  try {
    const changed: StoredPosition = input.mode === "payment-pending" || input.mode === "settled-open"
      ? { ...position, status: "OPEN", finalPayout: null, settledAt: null }
      : { ...position, finalPayout: input.mode === "null-payout" ? null : -1 };
    await positionStore.set(changed);
    if (input.mode === "payment-pending") {
      await marketStore.stamp(market.id, { settledAt: null });
      await roundStore.patch(round.id, { settledAt: null });
    }
    const [seenPosition, seenMarket, seenRound] = await Promise.all([
      positionStore.get(position.id), marketStore.get(market.id), roundStore.get(round.id),
    ]);
    if (!seenPosition || !seenMarket || !seenRound
      || seenPosition.status !== changed.status || seenPosition.finalPayout !== changed.finalPayout
      || seenMarket.settledAt !== (input.mode === "payment-pending" ? null : active.marketSettledAt)
      || seenRound.settledAt !== (input.mode === "payment-pending" ? null : active.roundSettledAt)) {
      throw new Error("Fixture write did not read back");
    }
    return reply({
      ok: true, fixtureId: active.id, mode: active.mode, roundId: active.roundId,
      positionId: position.id, positionStatus: seenPosition.status,
      payoutValid: validRealizedPayout({ status: seenPosition.status, stake: seenPosition.stake, payout: seenPosition.finalPayout }),
      marketSettled: seenMarket.settledAt != null, roundSettled: seenRound.settledAt != null,
      label: "LOCAL SYNTHETIC DISPLAY STATE · NOT A MONEY LEDGER OR PRODUCTION FACT",
    });
  } catch {
    await positionStore.set(active.position);
    await marketStore.stamp(active.marketId, { settledAt: active.marketSettledAt });
    await roundStore.patch(active.roundId, { settledAt: active.roundSettledAt });
    delete globalThis.__u43FailclosedFixture;
    return reply({ ok: false, error: "Fixture write failed and was restored" }, 500);
  }
}
