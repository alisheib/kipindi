/**
 * DEV ONLY — the slip's states a freshly seeded week cannot show by itself (MASWALI-BUILD S5; Ali 2026-10-21 10/10 pass:
 * the slip's design lane shoots every state of its surface). 404 in production, 409 on a configured database: in-memory
 * evidence only. Each acts through the product's OWN service, never a store write, on the open public week that
 * `/api/dev-test/seed-maswali` sells:
 *
 *   POST {}                          → that week's id and close (read only).
 *   POST { buyFor: "+2557…", tickets: n } → n tickets of fifteen YES bought for that player (`purchaseMaswaliTickets`, the
 *                                      bet path's own gates) — the week's cap reached, at 10.
 *   POST { cancelFor: "+2557…" }     → every LIVE ticket that player holds in the week cancelled in its free window
 *                                      (`cancelMaswaliTicket`, the player's own cancel) — so a drive can cut a ticket at
 *                                      every width and language and still meet the cap only where it asks for it.
 *   POST { breakFor: "+2557…" }      → that player on an hour's break (`coolOff`, the player's own RG control) — the slip
 *                                      that stands down for a break.
 *
 *   →  { ok, weekId, closesAt, bought?, cancelled? }
 *
 * ⚠️ NO "CLOSE IT NOW": the seeded week sells weeks ahead of the calendar (`seed-maswali`: "two to seven weeks ahead"), so
 * its open is later than any close a drive could ask for (`moveClose` meets MaswaliCycle_close_after_open_check — shots
 * run 1, 2026-10-21). The last hour and the close arriving are drawn on the BROWSER's clock instead: the slip counts from
 * the server's instant plus the browser's elapsed time (`useServerNowGated`), so a drive that moves the browser's clock
 * (Playwright `clock`) draws them exactly as a real close would — `scripts/maswali-slip-shots.mjs` §7.
 */
import { NextResponse } from "next/server";
import { hasDatabase } from "@/lib/server/prisma";
import { db } from "@/lib/server/store";
import { ticketStore, weekStore } from "@/lib/server/maswali-dal";
import { purchaseMaswaliTickets } from "@/lib/server/maswali-service";
import { cancelMaswaliTicket } from "@/lib/server/maswali-money-service";
import { coolOff } from "@/lib/server/responsible-gambling";

const YES15 = Array.from({ length: 15 }, () => "YES" as const);
const PHONE = /^\+2557\d{8}$/;

export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") return NextResponse.json({ ok: false, error: "Not available" }, { status: 404 });
  if (process.env.DATABASE_URL || hasDatabase()) return NextResponse.json({ ok: false, error: "In-memory local evidence only" }, { status: 409 });
  const input = (await req.json().catch(() => null)) as { buyFor?: unknown; tickets?: unknown; cancelFor?: unknown; breakFor?: unknown } | null;
  if (!input || typeof input !== "object") return NextResponse.json({ ok: false, error: "A JSON body is required" }, { status: 400 });
  const week = await weekStore.openFor("PUBLIC");
  if (!week) return NextResponse.json({ ok: false, error: "No public week is open: seed one with /api/dev-test/seed-maswali first." }, { status: 409 });
  const playerOf = async (phone: unknown) => (typeof phone === "string" && PHONE.test(phone) ? db.user.findByPhone(phone) : null);
  try {
    let cancelled: number | undefined;
    if (input.cancelFor !== undefined) {
      const user = await playerOf(input.cancelFor);
      if (!user) return NextResponse.json({ ok: false, error: "cancelFor: a +2557… number of a player" }, { status: 400 });
      cancelled = 0;
      for (const t of await ticketStore.listForUser(user.id, { cycleId: week.id })) {
        if (t.status !== "LIVE") continue;
        const r = await cancelMaswaliTicket({ userId: user.id, positionId: t.positionId });
        if (!r.ok) return NextResponse.json({ ok: false, error: r.error }, { status: 409 });
        cancelled++;
      }
    }
    let bought: number | undefined;
    if (input.buyFor !== undefined) {
      const user = await playerOf(input.buyFor);
      const tickets = input.tickets;
      if (!user || typeof tickets !== "number" || !Number.isInteger(tickets) || tickets < 1 || tickets > 10) {
        return NextResponse.json({ ok: false, error: "buyFor: a +2557… number of a player; tickets: 1 to 10" }, { status: 400 });
      }
      const r = await purchaseMaswaliTickets({ userId: user.id, weekId: week.id, slips: Array.from({ length: tickets }, () => YES15) });
      if (!r.ok) return NextResponse.json({ ok: false, error: r.error }, { status: 409 });
      bought = tickets;
    }
    if (input.breakFor !== undefined) {
      const user = await playerOf(input.breakFor);
      if (!user) return NextResponse.json({ ok: false, error: "breakFor: a +2557… number of a player" }, { status: 400 });
      await coolOff(user.id, "1h");
    }
    return NextResponse.json({ ok: true, weekId: week.id, closesAt: week.closesAt, ...(bought ? { bought } : {}), ...(cancelled !== undefined ? { cancelled } : {}) },
      { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String((err as Error).message ?? err) }, { status: 500 });
  }
}
