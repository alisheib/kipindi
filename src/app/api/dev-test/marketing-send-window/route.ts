/**
 * /api/dev-test/marketing-send-window — the send window's clock, pinned for a drive (marketing U13).
 *
 * ⛔ 404 IN PRODUCTION, before anything else, like every route under `dev-test/` (`test:cert-devroutes`) — and the clock it
 * pins is read only where `NODE_ENV` is not `production` (`sendWindowNow`, `src/lib/server/marketing/send-window-clock.ts`),
 * so a value left pinned can never move production's window either.
 *
 * ⭐ WHY THIS EXISTS. The composer's window note and the test send's quiet-hours refusal show only outside the send window —
 * at hours nobody photographs anything. `qa:marketing-compose` pins the window's clock at 03:00 EAT for its window-closed
 * pass (and at noon for every other pass, so a test is handed over whatever hour the drive runs), then puts the real clock
 * back. It moves NOTHING else: not the platform's clock, not a setting, not a row.
 *
 *   POST ?at=<ISO instant>   — judge the send window at that instant from now on (this server process only)
 *   POST ?at=now             — back to the real clock
 * Answers with the window exactly as the send path now reads it (`liveSendWindow`).
 */
import { NextResponse } from "next/server";
import { liveSendWindow } from "@/lib/server/marketing/dispatch";
import { __setSendWindowClockForDev } from "@/lib/server/marketing/send-window-clock";

export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ ok: false, error: "Not available" }, { status: 404 });
  }
  const at = new URL(req.url).searchParams.get("at");
  if (at === null || at.trim() === "") {
    return NextResponse.json({ ok: false, error: "Say ?at=<ISO instant>, or ?at=now for the real clock." }, { status: 400 });
  }
  let pinned: string | null = null;
  if (at === "now") {
    __setSendWindowClockForDev(null);
  } else {
    const ms = Date.parse(at);
    if (!Number.isFinite(ms)) {
      return NextResponse.json({ ok: false, error: "?at must be an ISO instant, or now." }, { status: 400 });
    }
    __setSendWindowClockForDev(ms);
    pinned = new Date(ms).toISOString();
  }
  return NextResponse.json({ ok: true, at: pinned, window: await liveSendWindow() });
}
