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
 * ── U46a · E29 · THE SECRET ROTATES WITHOUT DROPPING A RECEIPT ────────────────
 * While the secret is being rotated, `BLACKBALL_WEBHOOK_SECRET_PREVIOUS` holds the OLD
 * value and is accepted beside the new one until Blackball's callback URL carries the
 * new secret (docs/BLACKBALL-SMS.md §7). Both must be at least `WEBHOOK_SECRET_MIN_CHARS`
 * (16) characters to be compared at all — the one floor boot warns below too
 * (`webhook-secret-floor.ts`) — and both are always compared, each in constant time.
 * Boot warns while PREVIOUS is set (`boot-checks.ts`), so it is never left behind.
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
 *  3. the msisdn, when a line carries one, must MATCH the one we sent to — and a
 *     line for a campaign message must carry it (U46a review)
 *  4. the state machine is monotonic, so a settled row cannot be rewritten
 * Even a fully-authenticated forger therefore holds one lever, and only for a message
 * whose reference it already has: a line can settle THAT message's still-open rows as a
 * real receipt would — the SmsMessage row; the invite it carried, DELIVERED or BOUNCED
 * (never one already REGISTERED; the line's words, at most 200 characters, as the
 * reason); and, since U46a and ONLY when the line also carries the message's own number,
 * the campaign recipient it names while that row is still open — DELIVERED, or FAILED
 * with the line's words, scrubbed of every phone number and at most 200 characters, as
 * its error. A campaign line without the number moves no recipient row. No money moves,
 * no session is created, and ⛔ an OTP receipt is explicitly inert — see the `Otp` note
 * below.
 *
 * ── U46a · E28 · THE CAMPAIGN ARM ────────────────────────────────────────────
 * A receipt for a campaign message settles its `SmsCampaignRecipient` row through ONE
 * door, `smsCampaignRecipient.recordReceipt`, run only when `recordDlr` MOVED the
 * message — and the door itself writes only the row the message named, while that row
 * holds the message's number and reference (or none yet) and is still open (PENDING,
 * SENT, UNCONFIRMED — `SMS_RECEIPT_FROM`). A mismatch writes nothing and is audited
 * SECURITY, masked. A line without the message's own number reaches no door at all: it
 * is audited SECURITY by its code (`sms.dlr.recipient_unverified`), and the vendor still
 * reads `{"status":"Ok"}`. A test send's receipt (`SmsCampaignTest`) settles its
 * SmsMessage row alone.
 * ⛔ Never deploy while a campaign is PREPARING or RUNNING (ENGINE-SPEC §5 rule 8): a
 * receipt that reaches the old build in the overlap settles only its SmsMessage row,
 * and its replay cannot re-run this arm.
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
// U46a · the target type the campaign slice sends under (`dispatch.ts`: "the DLR route's recipient arm keys on this"), the
// phone-run rule's two halves — a vendor's description is scrubbed, and read again, before it can become a row's `error` —
// and the longest description the receipt door writes (the rule set's own constant, so the cut and the refusal are one
// number).
import { DISPATCH_TARGET_TYPE } from "@/lib/server/marketing/dispatch";
import { scrubPhoneRuns, holdsPhoneRun } from "@/lib/contacts/contact-fields";
import { SMS_RECEIPT_DESC_MAX } from "@/lib/server/marketing/campaign-model";
// U46a review · the ONE floor a webhook secret must reach — boot warns below the very same number.
import { WEBHOOK_SECRET_MIN_CHARS as SECRET_MIN_CHARS } from "@/lib/server/webhook-secret-floor";

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
  // ⭐ E29 · THE ROTATION'S SECOND SECRET. The old value is accepted beside the new one while Blackball's URL is changed, so
  // no receipt is refused in between. ⛔ A secret counts only when it is SET to a real one (at least `SECRET_MIN_CHARS` —
  // `WEBHOOK_SECRET_MIN_CHARS`, the floor boot warns below): an unset PREVIOUS is the empty string, and the empty string
  // compares equal to an absent token — so without this floor every caller that sends NO token would be let in. ⚠️ The
  // CURRENT secret is held to the same floor (§4.14: both at least 16) — a change for a shorter one, which boot-checks
  // already warns about at every start; production's is not one (its boot log carries no such warning,
  // docs/BLACKBALL-SMS.md). `test:sms-dlr` §12 D9 holds both floors. Every secret that is set is compared, each in constant
  // time, and neither comparison is skipped because the other matched — the time a request takes never says which one it
  // carried.
  const previous = process.env.BLACKBALL_WEBHOOK_SECRET_PREVIOUS ?? "";
  const current = secret.length >= SECRET_MIN_CHARS && secretEqual(provided, secret);
  const rotated = previous.length >= SECRET_MIN_CHARS && secretEqual(provided, previous);
  return current || rotated;
}

/**
 * Their status token → ours, or `null` for "we do not recognise this".
 *
 * ⭐ THE VENDOR'S OFFICIAL LIST (their developer, by email, 2026-09-17; docs/BLACKBALL-SMS.md §3),
 * and every token on it already maps (corrected 2026-09-25):
 *   DELIVRD → DELIVERED · UNDELIV, REJECTD, EXPIRED, FAILED → FAILED ·
 *   SENT → null (received by the network, not yet a verdict, so the row stays ACCEPTED).
 * The other spellings in the arms below are SMPP synonyms kept as tolerance. An unrecognised
 * token returns null: the row keeps its status, the RAW token is stored on
 * `SmsMessage.dlrStatus` and audited as `sms.dlr.unmapped_status`, so the vocabulary is
 * extended from evidence, never guessed. Their own example spelled the token `DELIVERD`,
 * which maps to null; the real callbacks carry `DELIVRD`.
 *
 * ⭐ OBSERVED, NOT ASSUMED: `DELIVRD` with description `Success`, and no other token yet.
 * First in the portal's Out SMS on 2026-09-16 (sender `50pick`, Tigo Tz, on the handset in
 * two seconds), and in real callbacks since 2026-09-23 (§4.7, §4.8). No failure token has
 * ever arrived, so the FAILED arms are the vendor's word, not yet evidence.
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

const isObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const looksLikeLine = (v: unknown): boolean => isObject(v) && typeof v.reference === "string";

/**
 * The status lines in a callback body, or `null` when the body matches no shape we recognise.
 *
 * ⭐ THE DOCUMENTED SHAPE IS `{statuses:[…]}`, AND IT IS THE ONE OBSERVED: genuine callbacks
 * have arrived on their own since 2026-09-23, one or more lines per POST (§4.7 and §4.8 of
 * docs/BLACKBALL-SMS.md; corrected 2026-09-25). The other two shapes stay accepted anyway,
 * because several facts this vendor documented turned out wrong when measured (§1). A single
 * status object, or a bare array of them, would otherwise be acknowledged with 200 and silently
 * dropped — a delivery report lost with no trace, which is the one outcome this receiver must
 * never have.
 *
 * `{statuses: []}` is a recognised, empty callback (not malformed); `null` means "unrecognised".
 */
export function readStatusLines(body: unknown): StatusLine[] | null {
  if (isObject(body) && Array.isArray(body.statuses)) return body.statuses as StatusLine[];
  if (looksLikeLine(body)) return [body as StatusLine];
  if (Array.isArray(body) && body.length > 0 && body.every(looksLikeLine)) return body as StatusLine[];
  return null;
}

/** Top-level key NAMES only — never values, which could carry an msisdn. */
const topLevelKeys = (body: unknown): string[] => (isObject(body) ? Object.keys(body).slice(0, 10) : []);

/**
 * Record a callback we could not read. ⛔ Shape evidence only — reason, content-type, byte count and
 * key names; never the body. Deduped per window so a misbehaving sender cannot flood the chain.
 * Before this, a non-JSON or differently-shaped receipt left NO trace at all: indistinguishable from
 * "Blackball never called".
 */
function noteMalformed(req: Request, reason: "bad-json" | "unrecognised-shape", bytes: number, keys: string[]) {
  const contentType = (req.headers.get("content-type") ?? "").slice(0, 80);
  if (!firstSightIn(`malformed:${reason}:${contentType}:${keys.join(",")}`)) return;
  audit({
    category: "SYSTEM",
    action: "sms.dlr.malformed",
    actorId: null,
    targetType: null,
    targetId: null,
    payload: { reason, contentType, bytes, keys },
  });
}

/**
 * U46a · a campaign receipt that names a recipient row of ANOTHER number, or one already holding ANOTHER message's
 * reference — a vendor's error or a forgery, and either way the door wrote nothing. Audited SECURITY, as the message's own
 * number mismatch is. ⛔ Masked numbers only — the row's and the message's (§5.14) — beside the two references.
 */
async function noteRecipientMismatch(recipientId: string, reference: string, messageMsisdn: string): Promise<void> {
  const row = await db.smsCampaignRecipient.find(recipientId);
  audit({
    category: "SECURITY",
    action: "sms.dlr.recipient_mismatch",
    actorId: null,
    targetType: DISPATCH_TARGET_TYPE,
    targetId: recipientId,
    payload: {
      reference,
      heldReference: row?.smsReference ?? null,
      expected: row ? maskPhone(row.msisdn) : null,
      got: maskPhone(messageMsisdn),
    },
  });
}

/**
 * U46a review · a campaign receipt line that does not carry the message's own number — so nothing vouches that it is the
 * vendor's report about THIS person, and its words could fail a recipient. No door is asked; the line is audited SECURITY
 * by its code alone (`msisdn_missing`, or `msisdn_mismatch` should the route's own gate ever let one through) — no
 * number, no words. At most once per message: the arm runs only when the message moved, and a message moves once.
 */
function noteRecipientUnverified(recipientId: string, reference: string, token: string, code: "msisdn_missing" | "msisdn_mismatch"): void {
  audit({
    category: "SECURITY",
    action: "sms.dlr.recipient_unverified",
    actorId: null,
    targetType: DISPATCH_TARGET_TYPE,
    targetId: recipientId,
    payload: { reference, rawStatus: token, code },
  });
}

/**
 * U46a · the vendor's words as the receipt door may take them (§5.14): every phone number scrubbed, then cut to
 * `SMS_RECEIPT_DESC_MAX` — and, U46a review, scrubbed AGAIN while the cut text still holds one. A compatibility character
 * can fold into more than one digit (the fraction ¼ reads as 1, a slash, 4), so the two digits a mask keeps can join the
 * digits after it into a number one pass never saw. Three passes, then the words are dropped: the door refuses a number,
 * it never scrubs, and a refused receipt would leave the row unsettled for ever — the verdict must land, with its words
 * or without them.
 */
function receiptWords(description: string | null): string | null {
  if (description === null) return null;
  let words = scrubPhoneRuns(description).slice(0, SMS_RECEIPT_DESC_MAX);
  for (let pass = 0; pass < 3 && holdsPhoneRun(words); pass++) words = scrubPhoneRuns(words).slice(0, SMS_RECEIPT_DESC_MAX);
  return holdsPhoneRun(words) ? null : words;
}

/**
 * ⭐ A GET ANSWERS 200, AND DOES NOTHING ELSE.
 *
 * On 2026-09-16 the only request that reached this URL after the callback was registered was a
 * browser GET from a Tanzanian address — very likely the vendor checking the URL while whitelisting
 * it — and the route, POST-only, answered 405, which reads as "this URL is broken". A reachability
 * check deserves a yes. No token is read, nothing is written, nothing is revealed that a POST's 401
 * does not already reveal.
 */
export function GET() {
  return NextResponse.json({ status: "Ok" });
}

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

  // Read as TEXT first: a body that is not JSON is exactly the case whose size and content-type
  // are the evidence, and `req.json()` would consume it and throw that away.
  const raw = await req.text();
  let body: unknown = null;
  try {
    body = JSON.parse(raw);
  } catch {
    noteMalformed(req, "bad-json", raw.length, []);
    return NextResponse.json({ ok: false, error: "bad-json" }, { status: 400 });
  }

  const parsed = readStatusLines(body);
  if (parsed === null) {
    noteMalformed(req, "unrecognised-shape", raw.length, topLevelKeys(body));
  }
  const lines: StatusLine[] = parsed ?? [];
  // U46a · `campaign` — the campaign recipients this callback settled, beside `invites` (ENGINE-SPEC §4.14 decision 3).
  const counts = { applied: 0, replayed: 0, unknownRef: 0, unmapped: 0, mismatch: 0, invites: 0, campaign: 0 };
  const at = new Date().toISOString();

  for (const line of lines.slice(0, MAX_STATUSES)) {
    const reference = typeof line.reference === "string" ? line.reference : "";
    const rawStatus = typeof line.status === "string" ? line.status : "";
    // U46a · the description WHOLE as well: the campaign arm scrubs it before it cuts it, so a number the cut would split
    // is still a number the scrub can see.
    const description = typeof line.description === "string" ? line.description : null;
    const desc = description === null ? null : description.slice(0, 200);
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
          // where any status or description beyond the vendor's list (§3) is first observed,
          // and dropping the description would throw away half of it.
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
          // ⭐ THE RAW TOKEN, VERBATIM. This audit row is how any token beyond the vendor's
          // list gets mapped from evidence instead of guessed.
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

    // ⭐ U46a · THE CAMPAIGN ARM (E28). The message moved, and it was a campaign's: its recipient row settles through the
    // ONE door — which writes only that row, only while it holds the message's number and reference (or none yet), and
    // only out of PENDING, SENT or UNCONFIRMED, so a late or out-of-order receipt never moves a settled row.
    // ⛔ Guarded on `changed`, as the invite arm is: a replayed receipt cannot re-run this. ⛔ The door refuses, it never
    // scrubs, so what it is handed is lawful first: the token as the mapper read it (trimmed, upper case — a token the
    // mapper recognised, so a code of its own list in any spelling the vendor chose), and the description scrubbed of every
    // phone number and only THEN cut, then read again (`receiptWords` — §5.14). A test send's receipt (`SmsCampaignTest`)
    // never reaches here: it settles its SmsMessage row and nothing else.
    if (changed && after?.targetType === DISPATCH_TARGET_TYPE && after.targetId && (mapped === "DELIVERED" || mapped === "FAILED")) {
      const recipientId = after.targetId;
      const token = rawStatus.trim().toUpperCase();
      // ⛔ U46a review · THE LINE MUST CARRY THE MESSAGE'S OWN NUMBER HERE — required, not merely checked. The gate above
      // compares a number only when a line has one (an invite's or a code's message still settles on its reference alone,
      // unchanged), so a line holding nothing but a reference reached this arm and could fail a recipient with its own
      // words. Real callbacks always carry the number (docs/BLACKBALL-SMS.md §4.8), so a campaign line without it moves no
      // recipient row: audited SECURITY by its code, and the vendor still reads Ok. Its MESSAGE has settled, as before —
      // so the recipient keeps its last door-written state, and the audit row is how an operator finds it.
      const vouched = msisdn !== "" && msisdn.replace(/[^0-9]/g, "") === after.msisdn;
      if (!vouched) {
        noteRecipientUnverified(recipientId, reference, token, msisdn === "" ? "msisdn_missing" : "msisdn_mismatch");
        continue;
      }
      try {
        const outcome = await db.smsCampaignRecipient.recordReceipt(recipientId, {
          reference,
          msisdn: after.msisdn,
          status: mapped,
          rawStatus: token,
          desc: receiptWords(description),
          at,
        });
        if (outcome.changed) counts.campaign++;
        else if (outcome.reason === "mismatch") await noteRecipientMismatch(recipientId, reference, after.msisdn);
      } catch (err) {
        // ⛔ A RECEIPT THE DOOR REFUSED IS RECORDED, NEVER THROWN. The message has moved, so a retry from the vendor would
        // find nothing to change and could not re-run this arm — a 500 here would buy five retries and lose the receipt
        // anyway. ⛔ The error's CODE only: a database error's text can quote the call's arguments, and they hold a number.
        const code = (err as { code?: unknown } | null)?.code;
        audit({
          category: "SYSTEM",
          action: "sms.dlr.recipient_failed",
          actorId: null,
          targetType: DISPATCH_TARGET_TYPE,
          targetId: recipientId,
          payload: { reference, rawStatus: token, code: typeof code === "string" ? code : "refused" },
        });
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
