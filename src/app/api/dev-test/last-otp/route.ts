/**
 * /api/dev-test/last-otp — dev-only one-time-code peek for end-to-end tests.
 *
 * Returns the most recent code sent to a given address. Returns 404 in production — never
 * reachable on a live deployment.
 *
 *   GET /api/dev-test/last-otp?phone=+255700000123        (the consoleSms ring)
 *   GET /api/dev-test/last-otp?email=neema@50pick.test    (the Postmark outbox)
 *   { ok: true, code: "123456", at: 1714... }
 *
 * ⭐ ONE ROUTE, TWO CHANNELS, because there is one question: "what code did we just send
 * this person?" The agent invitation moved from SMS to email on 2026-09-08 (no SMS provider
 * is licensed), and a second `/api/dev-test/last-email-otp` beside this one would be the
 * §0a duplicate — two places to look for one fact, and a drive that reads the wrong one
 * fails with "no code" rather than with the reason.
 *
 * ⚠️ THE EMAIL SIDE NEEDS `EMAIL_OUTBOX_CAPTURE=1` ON THE SERVER, and it says so when it is
 * missing rather than reporting "no code for that address" — an unarmed capture and an
 * unsent mail are different faults and a drive must not have to guess which it hit.
 */
import { NextResponse } from "next/server";
import { emailOutbox } from "@/lib/server/email";

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
  const email = url.searchParams.get("email");
  if (!phone && !email) {
    return NextResponse.json({ ok: false, error: "phone or email required" }, { status: 400 });
  }

  if (email) {
    if (process.env.EMAIL_OUTBOX_CAPTURE !== "1") {
      return NextResponse.json(
        { ok: false, error: "EMAIL_OUTBOX_CAPTURE=1 is not set on the server, so no mail was captured" },
        { status: 409 },
      );
    }
    // ⚠️ Case-insensitive: an address is, and the officer may have typed a different case
    // from the one the drive asks with.
    const want = email.trim().toLowerCase();
    const mine = emailOutbox().filter((m) => m.to.toLowerCase() === want);
    if (mine.length === 0) {
      return NextResponse.json({ ok: false, error: "No mail for that address" }, { status: 404 });
    }
    const last = mine[mine.length - 1];
    // ⛔ THE CODE ELEMENT FIRST, then a bare six-digit fallback. The OTP template sets the
    // code in its own tag; a naive `\d{6}` over the whole document could just as easily
    // match a shilling amount or a date in a different mail to the same person.
    const code = last.html.match(/>(\d{6})</)?.[1] ?? last.html.match(/\b(\d{6})\b/)?.[1];
    if (!code) {
      return NextResponse.json({ ok: false, error: "No code in the last mail", subject: last.subject }, { status: 404 });
    }
    return NextResponse.json({ ok: true, code, subject: last.subject });
  }

  const buf = globalThis.__50PICK_LAST_SMS?.get(phone!);
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
