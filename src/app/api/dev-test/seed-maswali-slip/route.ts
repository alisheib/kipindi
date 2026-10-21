/**
 * DEV ONLY — the slip's states a freshly seeded week cannot show by itself (MASWALI-BUILD S5; Ali 2026-10-21 10/10 pass:
 * the slip's design lane shoots every state of its surface). 404 in production, 409 on a configured database: in-memory
 * evidence only. Each acts through the product's OWN service, never a store write, on the open public week that
 * `/api/dev-test/seed-maswali` sells:
 *
 *   POST { closeInMinutes: N }       → its sales close moved EARLIER, to now + N minutes (`moveClose`, MB-28: never inside
 *                                      the free-cancel grace + 1 minute) — the slip's last hour for N < 60; and once it
 *                                      passes, on a server started with MASWALI_SCHEDULER=false and LIFECYCLE_TICKER=false
 *                                      (so no tick closes the week first), the slip drawn after its close.
 *   POST { buyFor: "+2557…", tickets: n } → n tickets of fifteen YES bought for that player (`purchaseMaswaliTickets`, the
 *                                      bet path's own gates) — the week's cap reached, at 10.
 *
 *   →  { ok, weekId, closesAt, bought? }
 */
import { NextResponse } from "next/server";
import { hasDatabase } from "@/lib/server/prisma";
import { db } from "@/lib/server/store";
import { weekStore } from "@/lib/server/maswali-dal";
import { moveClose, purchaseMaswaliTickets } from "@/lib/server/maswali-service";

/** The seed's own owner account (`seed-maswali`'s OWNER): the officer the moved close is audited under. */
const OWNER = "usr_dev_owner";
const YES15 = Array.from({ length: 15 }, () => "YES" as const);

export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") return NextResponse.json({ ok: false, error: "Not available" }, { status: 404 });
  if (process.env.DATABASE_URL || hasDatabase()) return NextResponse.json({ ok: false, error: "In-memory local evidence only" }, { status: 409 });
  const input = (await req.json().catch(() => null)) as { closeInMinutes?: unknown; buyFor?: unknown; tickets?: unknown } | null;
  if (!input || typeof input !== "object") return NextResponse.json({ ok: false, error: "A JSON body is required" }, { status: 400 });
  const week = await weekStore.openFor("PUBLIC");
  if (!week) return NextResponse.json({ ok: false, error: "No public week is open: seed one with /api/dev-test/seed-maswali first." }, { status: 409 });
  try {
    if (input.closeInMinutes !== undefined) {
      const n = input.closeInMinutes;
      if (typeof n !== "number" || !Number.isInteger(n) || n < 6 || n > 24 * 60) {
        return NextResponse.json({ ok: false, error: "closeInMinutes: a whole number of minutes, 6 to 1440" }, { status: 400 });
      }
      const moved = await moveClose({ weekId: week.id, toCloseAt: new Date(Date.now() + n * 60_000).toISOString(), officerId: OWNER });
      if (!moved.ok) return NextResponse.json({ ok: false, error: moved.error }, { status: 409 });
    }
    let bought: number | undefined;
    if (input.buyFor !== undefined) {
      const phone = input.buyFor, tickets = input.tickets;
      if (typeof phone !== "string" || !/^\+2557\d{8}$/.test(phone) || typeof tickets !== "number" || !Number.isInteger(tickets) || tickets < 1 || tickets > 10) {
        return NextResponse.json({ ok: false, error: "buyFor: a +2557… number; tickets: 1 to 10" }, { status: 400 });
      }
      const user = await db.user.findByPhone(phone);
      if (!user) return NextResponse.json({ ok: false, error: "No such player" }, { status: 404 });
      const r = await purchaseMaswaliTickets({ userId: user.id, weekId: week.id, slips: Array.from({ length: tickets }, () => YES15) });
      if (!r.ok) return NextResponse.json({ ok: false, error: r.error }, { status: 409 });
      bought = tickets;
    }
    const now = await weekStore.get(week.id);
    return NextResponse.json({ ok: true, weekId: week.id, closesAt: now?.closesAt ?? week.closesAt, ...(bought ? { bought } : {}) }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String((err as Error).message ?? err) }, { status: 500 });
  }
}
