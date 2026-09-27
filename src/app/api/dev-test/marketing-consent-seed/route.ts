/**
 * /api/dev-test/marketing-consent-seed — put the SIGNED-IN player on a real break, for the visual drive of the
 * SMS consent card on /profile/notifications (its HELD and PAUSED states).
 *
 * ⛔ 404 IN PRODUCTION, before anything else, like every route under `dev-test/` (`test:dev-route-guard`).
 *
 * ⭐ THE BREAK IS TAKEN, NOT WRITTEN. `?do=break` calls `coolOff` — the function the player's own Take a break
 * form calls — so the row, the COOLED_OFF status, the house-bot holder hook, the audit row, the email and the
 * in-app notice are exactly what a real break leaves. Unlike the form it does not sign the player out, so the
 * drive goes straight to the card, which shows HELD at once. `?period=` takes a `COOLING_OFF_PERIODS_SEC` key;
 * the default is `1h`, the shortest, so the drive heals itself within the hour.
 *
 * ⛔ AND THERE IS NO "END THE BREAK NOW". The first version moved the end one second into the past with a direct
 * RG row write: a state production can never reach (a break is one-way until it expires), written past the
 * holder hook, and a new writer of an A2 fact that `test:house-bot-holder-lifecycle` 1.2 counts. The PAUSED card is
 * photographed after a `1h` break has really ended — consent given first, then the break, then the hour — and
 * what it shows is still derived by the real `marketingToggleState`.
 */
import { NextResponse } from "next/server";
import { currentSession } from "@/lib/server/auth-service";
import { coolOff, COOLING_OFF_PERIODS_SEC } from "@/lib/server/responsible-gambling";

export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ ok: false, error: "Not available" }, { status: 404 });
  }
  const session = await currentSession();
  if (!session) return NextResponse.json({ ok: false, error: "sign in first (/auth/demo)" }, { status: 401 });
  const params = new URL(req.url).searchParams;
  const what = params.get("do");
  if (what === "break") {
    const period = params.get("period") ?? "1h";
    if (!Object.hasOwn(COOLING_OFF_PERIODS_SEC, period)) {
      return NextResponse.json({ ok: false, error: `?period= is one of ${Object.keys(COOLING_OFF_PERIODS_SEC).join(", ")}` }, { status: 400 });
    }
    const r = await coolOff(session.userId, period as keyof typeof COOLING_OFF_PERIODS_SEC);
    return NextResponse.json({ ok: true, period, coolingOffUntil: r.data.until });
  }
  if (what === "end-break") {
    return NextResponse.json({ ok: false, error: "a break cannot be ended early — take ?do=break (1h) and photograph PAUSED once it has ended" }, { status: 410 });
  }
  return NextResponse.json({ ok: false, error: "?do=break[&period=1h|24h|1w]" }, { status: 400 });
}

export async function GET(req: Request) {
  return POST(req);
}
