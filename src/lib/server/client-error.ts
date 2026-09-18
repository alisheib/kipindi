/**
 * CLIENT-SIDE CRASH REPORTS — the thing this platform did not have, and the absence cost two
 * whole sessions on ONE player's phone.
 *
 * 🔴 WHY IT EXISTS. On 2026-09-18 a player was shown *"Ukurasa huu umekumbana na tatizo"* on
 * `/updown` after a bet that had SUCCEEDED. The investigation had nothing to work with, because
 * a client-side throw on this platform was **completely invisible**:
 *   · React renders the route's `error.tsx` and the response is still HTTP **200** — so the
 *     Railway HTTP logs contain nothing, and a log search for `status=404`/`5xx` ruled out a
 *     fault that was really happening;
 *   · `error.digest` is minted only for a **server**-render throw, so the error surface showed
 *     no reference code and there was nothing to look up;
 *   · `RouteError` logged `console.warn` — into a phone's console, where nobody can read it.
 * Two real crashes were found and fixed by inspection, and NEITHER could be confirmed as the one
 * the player saw. That is the gap this closes: the next occurrence identifies itself.
 *
 * ── WHAT IT MAY NEVER DO ────────────────────────────────────────────────────────────────────
 * ⛔ **IT MUST NEVER CARRY MONEY OR IDENTITY.** A crash report is diagnostic text, and the
 * surfaces that crash here are wallets, stakes and positions — the message could easily read
 * *"insufficient balance 412500"* or sit on a URL holding an invite token. `scrubReport` is the
 * one chokepoint and it redacts by SHAPE, not by a blocklist of field names, because the shapes
 * (a long digit run, a `token=`, an email) survive a refactor and field names do not.
 * ⚠️ It runs SERVER-side on purpose. A browser-side scrub is advice; this one cannot be skipped
 * by a caller, and the raw body never reaches a log line unscrubbed.
 *
 * ⚠️ AND IT IS FIRE-AND-FORGET BY CONTRACT. Its route always answers 204. A reporting failure
 * must never become an error a page can see — the one surface that must never throw is the
 * surface whose whole job is showing that something threw.
 */

/** The report a browser may send. Everything is optional except the message. */
export type ClientErrorReport = {
  /** `error.message`, scrubbed and capped. */
  message: string;
  /** `error.stack`, scrubbed and capped — the first frames are the useful ones. */
  stack: string | null;
  /** The route the crash happened on, PATH ONLY (a query string is dropped, never scrubbed). */
  path: string;
  /** `error.digest` when React minted one (a server throw); null for a pure client throw. */
  digest: string | null;
  /** `globalThis.NEXT_DEPLOYMENT_ID` — which build the browser was running. */
  build: string | null;
};

const MAX_MESSAGE = 500;
const MAX_STACK = 2_000;
const MAX_PATH = 200;
const MAX_ID = 64;

/**
 * Redact anything that could be money, identity or a credential — by SHAPE.
 *
 * ⭐ THE ORDER MATTERS AND IS NOT ARBITRARY. `token=`-style secrets are taken first, because a
 * token's VALUE often contains digit runs that the numeric rule would otherwise chew into an
 * unrecognisable half-redaction, leaving the rest of the secret visible. Emails go before the
 * digit rule for the same reason (`ali07@x.com` → the local part is not a number but contains
 * one). Then phones, then any remaining long digit run.
 *
 * ⚠️ IT IS DELIBERATELY OVER-EAGER. A redacted timestamp costs a little debugging comfort; a
 * leaked balance or invite token costs a great deal more. A crash still identifies itself by its
 * message and its stack FRAMES, which is what the diagnosis actually needs.
 */
export function scrubText(raw: string): string {
  return raw
    // credentials and tokens, including the query-string forms
    .replace(/\b(token|key|secret|password|pwd|auth|bearer|session|otp|pepper)\b\s*[:=]\s*\S+/gi, "$1=[redacted]")
    // email addresses
    .replace(/\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g, "[email]")
    // E.164 / Tanzanian phone shapes, before the generic digit rule
    .replace(/\+?255\d{9}\b/g, "[phone]")
    .replace(/\b0[67]\d{8}\b/g, "[phone]")
    // ⛔ ANY remaining run of 4+ digits: a stake, a balance, a payout, an epoch-ms instant, an
    // account number. Grouped forms ("412,500" / "412 500") are one run, not three.
    .replace(/\b\d[\d,\s]{3,}\d\b/g, "[num]")
    .replace(/\b\d{4,}\b/g, "[num]");
}

/**
 * Validate and normalise whatever the browser sent. Returns `null` for anything unusable, so the
 * route can drop it without deciding anything itself.
 *
 * ⛔ THE PATH'S QUERY STRING IS DISCARDED, NOT SCRUBBED. `/wallet/deposit?token=…` has already
 * leaked an invite token by the time a regex is deciding what to keep; a route's identity is its
 * pathname, and that is all this needs.
 */
export function parseClientErrorBody(body: string): ClientErrorReport | null {
  let raw: unknown;
  try { raw = JSON.parse(body); } catch { return null; }
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;

  const message = typeof o.message === "string" ? o.message.trim() : "";
  if (!message) return null; // a report with no error is not a report

  const str = (v: unknown, cap: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, cap) : null);

  // Path only — and only a real, same-origin-looking path.
  let path = str(o.path, MAX_PATH) ?? "/";
  path = path.split("?")[0].split("#")[0];
  if (!path.startsWith("/")) path = "/";

  // ⚠️ `digest` and `build` are ids, not prose: constrain them to an id shape rather than
  // scrubbing them, or the digit rule above would redact the very value we look up.
  const idish = (v: unknown) => {
    const s = str(v, MAX_ID);
    return s && /^[\w.:-]+$/.test(s) ? s : null;
  };

  return {
    message: scrubText(message).slice(0, MAX_MESSAGE),
    stack: (() => { const s = str(o.stack, MAX_STACK * 2); return s ? scrubText(s).slice(0, MAX_STACK) : null; })(),
    path,
    digest: idish(o.digest),
    build: idish(o.build),
  };
}

/**
 * Put it where a human will find it. One line, greppable, no PII.
 *
 * ⚠️ `console.error` is the transport on purpose: Railway captures stdout/stderr already, so this
 * needs no new infrastructure and cannot fail in a way that matters. If a durable store is ever
 * wanted, add it HERE — the route and the scrub above do not change.
 */
export function recordClientError(r: ClientErrorReport, ua: string | null): void {
  console.error(
    `[client-error] path=${r.path} build=${r.build ?? "-"} digest=${r.digest ?? "-"} ` +
    `msg=${JSON.stringify(r.message)}` +
    (ua ? ` ua=${JSON.stringify(ua.slice(0, 180))}` : "") +
    (r.stack ? `\n[client-error] stack: ${r.stack}` : ""),
  );
}
