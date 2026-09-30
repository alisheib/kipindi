/**
 * THE PREVIEW'S DOORS — turning a pass on, turning it off, and opening a preview link (the Vodacom plan S1).
 *
 * The decisions live here, as plain functions of what the request carried, so `test:simple-journey-flag` drives
 * them without a server. `src/app/preview/route.ts` is the only caller: it gathers the request's facts, asks one
 * of these, and turns the answer into a 303 (a DOCUMENT navigation — AppShell is the root layout and only a
 * document load re-runs it, so the marker appears and disappears with the navigation that caused it).
 *
 * ⛔ EVERY DOOR ANSWERS, NONE THROWS, AND NONE SAYS WHY TO A STRANGER. A refused link lands on `/` exactly like
 * an expired one, with no cookie. A refused staff request lands back on `/admin/journey` with a short code the
 * page turns into a sentence.
 * ⛔ THE AUDIT ROW COMES FIRST. A pass is set only once its row is RECORDED (`audit()` never rejects — read
 * `.recorded`), so "every pass is on the record" is true of every pass that exists. Clearing needs no row to
 * proceed — taking a pass away is always allowed — but writes one when there was a pass to take.
 */
import { audit } from "./audit";
import { db } from "./store";
import { isStaffRole } from "./roles";
import { rateCheckAsync } from "./rate-limit";
import type { AdminTotpStatus } from "./admin-guard";
import { journeySwitchNow, linkIsLive } from "./simple-journey-switch";
import {
  PREVIEW_PASS_TTL_MS,
  mintPreviewPass,
  previewSecret,
  readPreviewLinkToken,
  readPreviewPass,
} from "./journey-preview";

/** What a door asks the route to do: where to send the browser, and what to do with the pass cookie. */
export type DoorAnswer = {
  /** A same-origin path. */
  to: string;
  /** Set the pass: the token and its cookie lifetime in seconds. */
  set?: { token: string; maxAgeSec: number };
  /** Clear the pass. */
  clear?: true;
};

/** Refusal codes `/admin/journey` reads from `?preview=`. */
export type PreviewRefusal = "cross-site" | "not-staff" | "withdrawn" | "no-secret" | "unrecorded" | "who";

const CLOSED_STATUSES = new Set(["SUSPENDED", "CLOSED", "SELF_EXCLUDED", "COOLED_OFF"]);
const PAGE = "/admin/journey";
const refuse = (code: PreviewRefusal): DoorAnswer => ({ to: `${PAGE}?preview=${code}` });

/** A request that carries `Sec-Fetch-Site` from anywhere but this origin is a cross-site request. A browser too
 *  old to send the header is let through: the session cookie is SameSite=Lax, so a cross-site POST carries none. */
export function sameOriginRequest(secFetchSite: string | null | undefined): boolean {
  return !secFetchSite || secFetchSite === "same-origin";
}

/**
 * ⭐ PREVIEW ON — a staff member sets a pass in their own browser.
 * Checks, in order: same origin; a session; the STORED row is a staff role (all seven — SJ-23) on an open
 * account; the console's two-step status; the rollout is not WITHDRAWN; a usable secret; the audit row recorded.
 * Then a 24-hour pass, and the browser goes to `/` to see it.
 */
export async function previewOnDoor(input: {
  viewerUserId: string | null | undefined;
  totp: AdminTotpStatus;
  secFetchSite: string | null | undefined;
}): Promise<DoorAnswer> {
  if (!sameOriginRequest(input.secFetchSite)) return refuse("cross-site");
  const userId = input.viewerUserId;
  if (typeof userId !== "string" || userId.length === 0) return { to: `/auth/admin?next=${encodeURIComponent(PAGE)}` };
  let user: { role: string; status: string } | null;
  try {
    const u = await db.user.findById(userId);
    user = u ? { role: u.role, status: u.status } : null;
  } catch {
    return refuse("who");
  }
  if (!user || !isStaffRole(user.role) || CLOSED_STATUSES.has(user.status)) {
    void audit({ category: "SECURITY", action: "journey.preview.refused", actorId: userId, targetType: "JourneyPreview", targetId: "staff", payload: { role: user?.role ?? "unknown" } });
    return refuse("not-staff");
  }
  if (input.totp !== "ok") return { to: input.totp === "not-enrolled" ? "/admin/2fa/setup" : `/admin/totp-verify?next=${encodeURIComponent(PAGE)}` };
  const { state } = await journeySwitchNow();
  if (state === "WITHDRAWN") return refuse("withdrawn");
  if (!previewSecret()) return refuse("no-secret");
  const now = Date.now();
  const minted = mintPreviewPass("staff", userId, now + PREVIEW_PASS_TTL_MS, now);
  if (!minted) return refuse("no-secret");
  const row = await audit({
    category: "ADMIN",
    action: "journey.preview.on",
    actorId: userId,
    targetType: "JourneyPreview",
    targetId: "staff",
    payload: { role: user.role, state, nonce: minted.claim.nonce, expiresAt: new Date(minted.claim.exp).toISOString() },
  });
  if (!row.recorded) return refuse("unrecorded");
  return { to: "/", set: { token: minted.token, maxAgeSec: Math.floor((minted.claim.exp - now) / 1000) } };
}

/**
 * ⭐ PREVIEW OFF — anybody may take the pass out of their own browser. Always clears; records it when there was a
 * pass to take. `back` is where to land: `/admin/journey` when the form was there, `/` otherwise.
 */
export async function previewOffDoor(input: { cookie: string | undefined | null; back: string | null | undefined }): Promise<DoorAnswer> {
  const to = input.back === PAGE ? PAGE : "/";
  const claim = readPreviewPass(input.cookie);
  if (claim) {
    await audit({
      category: "ADMIN",
      action: "journey.preview.off",
      actorId: claim.kind === "staff" ? claim.issuer : null,
      targetType: "JourneyPreview",
      targetId: claim.kind,
      payload: claim.kind === "link" ? { link: claim.issuer, nonce: claim.nonce } : { nonce: claim.nonce },
    });
  }
  return { to, clear: true };
}

/**
 * ⭐ A PREVIEW LINK IS OPENED — the agency (or whoever the Owner sent it to) gets a pass in their browser.
 * Checks: a per-address rate limit (link unfurlers and guessers); the token's seal and dates; the rollout is
 * STAFF_PREVIEW; the link is in the Owner's record, unrevoked, unexpired, and it is THAT issue of the link; the
 * opening recorded (the link's id and label, the new pass's nonce and end — no address, no device; the address
 * is only the rate limiter's key and is never stored). Then a pass that ends at 24 hours or at the
 * link's end, whichever is first. ⛔ Any refusal lands on `/` with no cookie and no explanation.
 */
export async function previewLinkDoor(input: { token: string | null | undefined; ip: string | null | undefined }): Promise<DoorAnswer> {
  const home: DoorAnswer = { to: "/" };
  try {
    const rate = await rateCheckAsync(input.ip || "unknown", "journey.link");
    if (!rate.allowed) return home;
    const claim = readPreviewLinkToken(input.token);
    if (!claim) return home;
    const { state, stored } = await journeySwitchNow();
    if (state !== "STAFF_PREVIEW" || stored.kind !== "SET") return home;
    const now = Date.now();
    const link = stored.links.find((l) => l.id === claim.linkId);
    if (!linkIsLive(link, now) || Date.parse(link.expiresAt) !== claim.exp) return home;
    const minted = mintPreviewPass("link", link.id, claim.exp, now);
    if (!minted) return home;
    const row = await audit({
      category: "ADMIN",
      action: "journey.preview.link.opened",
      actorId: null,
      targetType: "JourneyPreviewLink",
      targetId: link.id,
      payload: { label: link.label, nonce: minted.claim.nonce, passExpiresAt: new Date(minted.claim.exp).toISOString() },
    });
    if (!row.recorded) return home;
    return { to: "/", set: { token: minted.token, maxAgeSec: Math.max(1, Math.floor((minted.claim.exp - now) / 1000)) } };
  } catch {
    return home;
  }
}
