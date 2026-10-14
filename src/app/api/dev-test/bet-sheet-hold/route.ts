/** Bounded local WP11a gate: hold the REAL market mutex; observe ONLY the signed-in synthetic player's wallet mutex. */
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { currentSession } from "@/lib/server/auth-service";
import { hasDatabase } from "@/lib/server/prisma";
import { db } from "@/lib/server/store";
import { getMarket } from "@/lib/server/market-service";
import { withLock, drainLock } from "@/lib/server/locks";

type Hold = { userId: string; marketId: string; id: string; held: boolean; release: () => void; done: Promise<void> };
const HOLD_MS = 90_000;
const globalHold = globalThis as typeof globalThis & { __sheetQaHold?: Hold };
const reply = (body: object, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ ok: false, error: "Not available" }, { status: 404 });
  }
  if (process.env.DATABASE_URL || hasDatabase()) {
    return reply({ ok: false, error: "In-memory local evidence only" }, 409);
  }
  const session = await currentSession();
  if (!session) return reply({ ok: false, error: "Sign in required" }, 401);
  const input = await req.json().catch(() => null);
  const operation = input?.operation;
  const allowed = operation === "hold" ? ["operation", "marketId"] : ["operation", "holdId"];
  if (!input || typeof input !== "object" || Array.isArray(input) || !["hold", "status", "release"].includes(operation)
    || Object.keys(input).some(key => !allowed.includes(key))
    || (operation === "hold" ? typeof input.marketId !== "string" || !/^[a-zA-Z0-9_-]{1,160}$/.test(input.marketId)
      : typeof input.holdId !== "string" || !/^[a-f0-9-]{36}$/.test(input.holdId))) {
    return reply({ ok: false, error: "One bounded own-session operation required" }, 400);
  }
  const user = await db.user.findById(session.userId);
  if (!user || user.role !== "PLAYER" || user.displayName !== "Local Sheet Matrix" || !/^\+25571\d{7}$/.test(user.phoneE164)) {
    return reply({ ok: false, error: "Synthetic QA player required" }, 403);
  }
  if (operation !== "hold") {
    const hold = globalHold.__sheetQaHold;
    if (!hold || hold.userId !== session.userId || hold.id !== input.holdId) return reply({ ok: false, error: "No own hold" }, 404);
    if (operation === "release") {
      hold.release(); await hold.done;
      return reply({ ok: true, released: true });
    }
    const market = await drainLock(`market:${hold.marketId}`, { timeout: "50ms" });
    const wallet = await drainLock(`wallet:${session.userId}`, { timeout: "50ms" });
    return reply({ ok: true, held: hold.held && market === "busy", ownWalletBusy: wallet === "busy" });
  }
  if (globalHold.__sheetQaHold) return reply({ ok: false, error: "Local fixture already occupied" }, 409);
  const market = await getMarket(input.marketId);
  if (!market || market.status !== "LIVE") return reply({ ok: false, error: "Live question required" }, 404);
  // Recheck after the asynchronous public read, so two simultaneous requests cannot both acquire a fixture slot.
  if (globalHold.__sheetQaHold) return reply({ ok: false, error: "Local fixture already occupied" }, 409);
  let release!: () => void, acquired!: () => void;
  const untilRelease = new Promise<void>(resolve => { release = resolve; });
  const acquisition = new Promise<void>(resolve => { acquired = resolve; });
  const hold: Hold = { userId: session.userId, marketId: input.marketId, id: randomUUID(), held: false, release, done: Promise.resolve() };
  globalHold.__sheetQaHold = hold;
  const timer = setTimeout(release, HOLD_MS);
  hold.done = withLock(`market:${hold.marketId}`, async () => {
    hold.held = true; acquired();
    await untilRelease;
  }).finally(() => {
    hold.held = false; clearTimeout(timer);
    if (globalHold.__sheetQaHold === hold) delete globalHold.__sheetQaHold;
  });
  let acquisitionTimer: ReturnType<typeof setTimeout> | undefined;
  const unavailable = new Promise<false>(resolve => { acquisitionTimer = setTimeout(() => resolve(false), 2_000); });
  try {
    const got = await Promise.race([acquisition.then(() => true), unavailable, hold.done.then(() => false)]);
    if (!got) { release(); return reply({ ok: false, error: "Real lock was not acquired" }, 409); }
    return reply({ ok: true, holdId: hold.id, held: true, maxHoldMs: HOLD_MS });
  } finally { if (acquisitionTimer) clearTimeout(acquisitionTimer); }
}
