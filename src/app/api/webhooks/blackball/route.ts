/**
 * Blackball delivery-receipt (DLR) receiver.
 *
 * Blackball POSTs `{statuses:[{status, reference, description, msisdn}]}` here when a
 * message reaches its final state, and expects the body `{"status":"Ok"}` back —
 * ⛔ NOT this codebase's usual `{ok:true}`. Their contract, their shape.
 *
 * Auth: a shared secret, the `postmark/route.ts` model. Register the URL with
 * Blackball as `https://<host>/api/webhooks/blackball?token=<BLACKBALL_WEBHOOK_SECRET>`
 * (or let them send it as `X-Blackball-Token`). Compared in constant time.
 *
 * ── ⛔ ONE DELIBERATE DEVIATION FROM THE POSTMARK TEMPLATE ───────────────────
 * Postmark's `authorized()` returns `NODE_ENV !== "production"` when the secret is
 * unset — open in dev. That is tolerable for a suppression list. It is not
 * tolerable here, because this endpoint mutates delivery status and, through it,
 * `InviteEntry`. So the dev convenience closes the moment a real provider is
 * selected: once `SMS_PROVIDER=blackball`, real references exist and an open
 * endpoint is a status-forgery door regardless of which box it is running on.
 *
 * ── FOUR LAYERS AGAINST FORGERY, AND AN HONEST BLAST RADIUS ──────────────────
 *  1. the shared secret, timing-safe, failing closed once the provider is live
 *  2. the reference must EXIST — 24 hex characters, not guessable
 *  3. the msisdn must MATCH the one we sent to
 *  4. the state machine is monotonic, so a settled row cannot be rewritten
 * Even a fully-authenticated forger can therefore do exactly one thing: mark an
 * invite delivered that was not. No money moves, no session is created, and ⛔ an
 * OTP receipt is explicitly inert — see the `Otp` note below.
 *
 * Guard: `npm run test:sms-dlr` · `npm run red:sms-dlr`.
 */
import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { db } from "@/lib/server/store";
import type { SmsStatus } from "@/lib/server/store";
import { smsProviderResolution } from "@/lib/server/sms";
import { audit } from "@/lib/server/audit";
import { maskPhone } from "@/lib/phone-normalize";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** A callback carrying more than this is not a delivery report, it is a flood. */
const MAX_STATUSES = 500;

/** Constant-time secret compare (consistent with the payments and postmark webhooks). */
function secretEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

export function authorized(req: Request): boolean {
  const secret = process.env.BLACKBALL_WEBHOOK_SECRET ?? "";
  if (!secret) {
    // ⛔ OPEN ONLY WHERE NOTHING REAL CAN ARRIVE: not production, AND no live
    // provider. The second half is the one that matters — a QA box pointed at the
    // real gateway has real references, and an open endpoint there is a forgery door.
    return process.env.NODE_ENV !== "production" && smsProviderResolution() !== "blackball";
  }
  const provided =
    new URL(req.url).searchParams.get("token") ?? req.headers.get("x-blackball-token") ?? "";
  return secretEqual(provided, secret);
}

/**
 * Their status token → ours, or `null` for "we do not recognise this".
 *
 * ⛔ BLACKBALL HAS NOT PUBLISHED ITS VALUE SET. These arms are seeded from the
 * common SMPP vocabulary and are a STARTING POINT, not a specification. An
 * unrecognised token returns null: the row keeps its status, the RAW token is
 * stored on `SmsMessage.dlrStatus`, and the real vocabulary gets learned from
 * production rather than invented here.
 *
 * ⭐ OBSERVED, NOT ASSUMED: `DELIVRD` with description `Success`. The first live send
 * (2026-09-16, sender `50pick`, Tigo Tz) reached the handset in two seconds and the
 * portal's Out SMS recorded exactly that pair. It is the only token confirmed from
 * Blackball so far; every other arm below is still the SMPP seed.
 *
 * ⛔ THE ONE ARM THAT MUST NEVER EXIST IS A DEFAULT TO DELIVERED. That would report
 * delivery we have no evidence for, on the rail that carries login codes — and a
 * delivered-looking OTP nobody received is a support case with no trail.
 */
export function mapDlrStatus(raw: string): SmsStatus | null {
  const t = (raw ?? "").trim().toUpperCase();
  if (["DELIVERED", "DELIVRD", "SUCCESS", "SUCCESSFUL", "DELIVERY_SUCCESS"].includes(t)) return "DELIVERED";
  if (
    ["FAILED", "FAILURE", "UNDELIV", "UNDELIVERABLE", "UNDELIVERED", "REJECTD", "REJECTED", "EXPIRED", "DELETED", "UNKNOWN_SUBSCRIBER", "DELIVERY_FAILED"].includes(t)
  ) {
    return "FAILED";
  }
  return null;
}

/** Bounded, time-windowed dedupe so a forger cannot flood the hash-chained audit log
 *  with unknown-reference rows. Same shape as `monitoring.ts`'s error fingerprint. */
declare global {
  // eslint-disable-next-line no-var
  var __50PICK_DLR_SEEN: Map<string, number> | undefined;
}
const AUDIT_WINDOW_MS = 10 * 60_000;
function firstSightIn(window: string): boolean {
  const m = (globalThis.__50PICK_DLR_SEEN ??= new Map<string, number>());
  const now = Date.now();
  const last = m.get(window);
  if (last && now - last < AUDIT_WINDOW_MS) return false;
  if (m.size > 2_000) m.clear();
  m.set(window, now);
  return true;
}

type StatusLine = { status?: unknown; reference?: unknown; description?: unknown; msisdn?: unknown };

export async function POST(req: Request) {
  if (!authorized(req)) {
    audit({
      category: "SYSTEM",
      action: "webhook.blackball.rejected",
      actorId: null,
      targetType: null,
      targetId: null,
      payload: { reason: "bad-secret" },
    });
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let body: { statuses?: unknown } | null = null;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad-json" }, { status: 400 });
  }

  const lines: StatusLine[] = Array.isArray(body?.statuses) ? (body.statuses as StatusLine[]) : [];
  const counts = { applied: 0, replayed: 0, unknownRef: 0, unmapped: 0, mismatch: 0, invites: 0 };
  const at = new Date().toISOString();

  for (const line of lines.slice(0, MAX_STATUSES)) {
    const reference = typeof line.reference === "string" ? line.reference : "";
    const rawStatus = typeof line.status === "string" ? line.status : "";
    const desc = typeof line.description === "string" ? line.description.slice(0, 200) : null;
    const msisdn = typeof line.msisdn === "string" ? line.msisdn : "";
    if (!reference) continue;

    const row = await db.smsMessage.findByReference(reference);
    if (!row) {
      // ⛔ ACK AN UNKNOWN REFERENCE, NEVER 404. A 404 invites a retry storm and turns
      // this endpoint into a reference-probing oracle — a caller could enumerate which
      // references exist by reading the status code.
      counts.unknownRef++;
      if (firstSightIn(`unknown:${reference}`)) {
        audit({
          category: "SYSTEM",
          action: "sms.dlr.unknown_reference",
          actorId: null,
          targetType: null,
          targetId: reference,
          // ⭐ BOTH vendor fields, verbatim. A receipt for a message sent by the live drive
          // (`scripts/live/blackball-drive.mts`) lands HERE by design — the drive talks to the
          // gateway directly and never writes a production SmsMessage row, because a local
          // process writing production audit rows would fork the HMAC chain. So this row is
          // where the vendor's undocumented status AND description vocabulary is first
          // observed, and dropping the description would throw away half of it.
          payload: { rawStatus, description: desc, msisdn: msisdn ? maskPhone(msisdn) : null },
        });
      }
      continue;
    }

    // ⭐ THE IDENTITY WE ASK ABOUT MUST BE THE ONE WE SETTLE — the lesson the payments
    // webhook learned the hard way. A receipt whose msisdn is not the one we sent to is
    // either a vendor bug or a forgery, and either way it must not write.
    if (msisdn && row.msisdn !== msisdn.replace(/\D/g, "")) {
      counts.mismatch++;
      audit({
        category: "SECURITY",
        action: "sms.dlr.msisdn_mismatch",
        actorId: null,
        targetType: "SmsMessage",
        targetId: reference,
        payload: { expected: maskPhone(row.msisdn), got: maskPhone(msisdn) },
      });
      continue;
    }

    const mapped = mapDlrStatus(rawStatus);
    if (mapped === null) {
      counts.unmapped++;
      if (firstSightIn(`unmapped:${rawStatus}`)) {
        audit({
          category: "SYSTEM",
          action: "sms.dlr.unmapped_status",
          actorId: null,
          targetType: "SmsMessage",
          targetId: reference,
          // ⭐ THE RAW TOKEN, VERBATIM. This audit row is how the vendor's undocumented
          // vocabulary gets extended from evidence instead of guessed.
          payload: { rawStatus, description: desc },
        });
      }
    }

    const { changed, row: after } = await db.smsMessage.recordDlr(reference, {
      status: mapped,
      rawStatus,
      desc,
      at,
    });
    if (changed) counts.applied++;
    else if (mapped !== null) counts.replayed++;

    // ⭐ THE TWO ENUM ARMS THAT HAVE NEVER BEEN WRITTEN. `InviteEntryStatus` has
    // carried DELIVERED and BOUNCED since the campaign feature shipped, and nothing
    // could ever write them because nothing knew what happened after the send.
    // ⛔ Guarded on `changed`, so a replayed receipt cannot re-run this.
    if (changed && after?.targetType === "InviteEntry" && after.targetId) {
      const entry = await db.inviteEntry.findById(after.targetId);
      // ⛔ NEVER DEMOTE A REGISTERED ENTRY. The person already signed up; a late
      // delivery report about the invite that brought them is not news that outranks it.
      if (entry && entry.status !== "REGISTERED") {
        await db.inviteEntry.update(after.targetId, {
          status: mapped === "DELIVERED" ? "DELIVERED" : "BOUNCED",
          ...(mapped === "FAILED" ? { failureReason: (desc ?? rawStatus).slice(0, 200) } : {}),
        });
        counts.invites++;
      }
    }

    // ⛔ AN OTP RECEIPT UPDATES THE SmsMessage ROW AND NOTHING ELSE. It does not
    // consume, extend, validate or invalidate the `Otp`. A delivery report is not an
    // authentication event, and wiring one to the login path would make authentication
    // depend on an endpoint an attacker can reach.
  }

  // ⛔ AN EMPTY CALLBACK WRITES NOTHING. `sms.dlr.received` goes into the hash-chained audit
  // log, which cannot be pruned without breaking the chain — so a row that records "nothing
  // happened" is permanent noise. Measured 2026-09-16: fifteen authorised empty POSTs (a
  // reachability test) wrote fifteen such rows. A callback that carries lines is still
  // audited exactly once, whatever those lines turned out to be.
  if (lines.length > 0) {
    audit({
      category: "SYSTEM",
      action: "sms.dlr.received",
      actorId: null,
      targetType: null,
      targetId: null,
      payload: { lines: lines.length, ...counts },
    });
  }

  // ⛔ EXACTLY `{"status":"Ok"}`. Blackball's documented expectation, and not the
  // `{ok:true}` every other webhook in this codebase returns.
  return NextResponse.json({ status: "Ok" });
}
