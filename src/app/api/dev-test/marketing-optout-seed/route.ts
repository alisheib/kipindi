/**
 * /api/dev-test/marketing-optout-seed — mint a real opt-out token, for the U8 visual drive.
 *
 * ⛔ 404 IN PRODUCTION, like every other route under `dev-test/`. It is reachable only where
 * `NODE_ENV` is not `production`, which on this platform means a developer's own machine.
 *
 * ⭐ WHY THIS EXISTS AT ALL. Nothing mints an opt-out token yet — that is U42, far downstream —
 * so `/s/<token>` has no valid state to photograph without one. ⛔ And the token is minted
 * through `mintOptOutToken`, the SAME function production will call: a drive that hand-built a
 * row would be a picture of a page resolving a fixture, which proves nothing about the page
 * resolving a real link.
 */
import { NextResponse } from "next/server";
import { mintOptOutToken } from "@/lib/server/marketing/optout-service";
import { toMsisdn255 } from "@/lib/phone-normalize";

export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ ok: false, error: "Not available" }, { status: 404 });
  }
  const phone = new URL(req.url).searchParams.get("phone") ?? "0712000501";
  const identifier = toMsisdn255(phone);
  if (!identifier || identifier.length < 12) {
    return NextResponse.json({ ok: false, error: "that number does not normalise" }, { status: 400 });
  }
  const token = await mintOptOutToken(identifier);
  return token
    ? NextResponse.json({ ok: true, token, identifier })
    : NextResponse.json({ ok: false, error: "could not mint" }, { status: 500 });
}

export async function GET(req: Request) {
  return POST(req);
}
