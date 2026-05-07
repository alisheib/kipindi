/**
 * /api/dev-test/last-otp — dev-only OTP peek for end-to-end tests.
 *
 * Returns the most recent OTP code SMS sent to the given phone via the
 * `consoleSms` provider's recordTestSms ring. Returns 404 in production
 * — never reachable on a live deployment.
 *
 *   GET /api/dev-test/last-otp?phone=+255700000123
 *   { ok: true, code: "123456", at: 1714... }
 */
import { NextResponse } from "next/server";

declare global {
  // eslint-disable-next-line no-var
  var __50PICK_LAST_SMS: Map<string, { body: string; at: number }[]> | undefined;
}

export async function GET(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ ok: false, error: "Not available" }, { status: 404 });
  }
  const url = new URL(req.url);
  const phone = url.searchParams.get("phone");
  if (!phone) {
    return NextResponse.json({ ok: false, error: "phone required" }, { status: 400 });
  }
  const buf = globalThis.__50PICK_LAST_SMS?.get(phone);
  if (!buf || buf.length === 0) {
    return NextResponse.json({ ok: false, error: "No SMS for that phone" }, { status: 404 });
  }
  const last = buf[buf.length - 1];
  // OTP messages always carry "<code> 6-digit" — pull it with a regex.
  const m = last.body.match(/(\d{6})/);
  if (!m) {
    return NextResponse.json({ ok: false, error: "No OTP in last SMS" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, code: m[1], at: last.at });
}
