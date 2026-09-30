/**
 * THE PREVIEW PASS — who sees the new journey before the S15 flip (the Vodacom plan, `docs/VODACOM-PLAN.md` S1,
 * 2026-09-30; ruling SJ-23: "every staff role, SUPPORT included, sees the journey before the flip. The agency
 * gets a signed, revocable 7-day visitor-preview link").
 *
 * A pass is ONE cookie, `kp_preview`, holding an HMAC-sealed `{ p, v, k, iss, iat, exp, n }`:
 *   · k "staff" — set by a staff member on `/admin/journey` (`POST /preview`). `iss` is their user id.
 *   · k "link"  — set when somebody opens a preview link the Owner issued (`GET /preview?t=…`). `iss` is the
 *                 link's id; the link itself lives in the Owner's sealed switch record, so a revoke kills it.
 * It lasts at most 24 hours (`PREVIEW_PASS_HOURS`), and a link's pass never outlives its link.
 *
 * ⛔ IT IS RE-CHECKED ON EVERY REQUEST, NOT TRUSTED FOR ITS LIFETIME. A staff pass counts only while its issuer's
 * STORED row is still a staff role on an open account (a session cookie is a photograph of a role; a demotion
 * revokes the issuer's session but not a cookie they left in a browser). A link pass counts only while its link
 * is in the record, unrevoked and unexpired. Both count only while the rollout is STAFF_PREVIEW.
 * ⛔ IT OPENS NOTHING BUT A VIEW. The pass is never read by RBAC, `requireStaff`, the proxy's `/admin` gate or any
 * money path: a browser holding one can see the new journey's screens and nothing else. That is why it survives
 * sign-out and sign-in — a staff member previews as a guest, registers a test player, and bets as that player
 * under the same pass (plan S8/S10/S14) — and why the marker is always on screen with a way out.
 *
 * ── ITS OWN SECRET ───────────────────────────────────────────────────────────────────────────────────
 * `JOURNEY_PREVIEW_SECRET`, not `SESSION_SECRET`: everything `signSession` seals is mutually verifiable (the
 * session, the two-step cookie, share and reset tokens, the switch records), and a pass must not be something any
 * of those could be passed off as. In production it must be ≥ 32 characters and differ from `SESSION_SECRET` and
 * `AUDIT_CHAIN_SECRET`. ⛔ A MISSING OR UNUSABLE SECRET TURNS THE PREVIEW OFF — IT NEVER THROWS. AppShell renders
 * every page, and a throw here would take the site down for everyone (the C7 boot-throw outage). `boot-checks.ts`
 * logs the gap; `/admin/journey` says it.
 *
 * ⛔ THE COOKIE IS WRITTEN IN ONE PLACE, `src/app/preview/route.ts`, and read in one place, `resolveSimpleJourney`
 * below. `test:simple-journey-flag` holds the repo to both — a page that read the cookie itself could disagree
 * with the shell about the same request.
 */
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { createHmac, timingSafeEqual } from "node:crypto";
import { randomId } from "./crypto";
import { previewSecret } from "./journey-preview-secret";
import { isStaffRole } from "./roles";
import { db } from "./store";
import { journeySwitchNow, linkIsLive, type JourneyPreviewLink, type StoredJourneySwitch } from "./simple-journey-switch";
import { simpleJourneyFor, type RolloutState } from "@/lib/feature-state";

export { previewSecret, previewSecretUsable } from "./journey-preview-secret";

/** ⛔ The census in `test:privacy-notice` resolves this by its name (it contains COOKIE) — keep both. */
export const JOURNEY_PREVIEW_COOKIE = "kp_preview";
/** A pass's longest life. Privacy §7 states it in words; `test:privacy-notice` reads it from here. */
export const PREVIEW_PASS_HOURS = 24;
export const PREVIEW_PASS_TTL_MS = PREVIEW_PASS_HOURS * 60 * 60 * 1000;
/** A preview link's life (SJ-23). */
export const PREVIEW_LINK_DAYS = 7;
export const PREVIEW_LINK_TTL_MS = PREVIEW_LINK_DAYS * 24 * 60 * 60 * 1000;

const PASS_PURPOSE = "journey.preview.pass";
const LINK_PURPOSE = "journey.preview.link";
const TOKEN_VERSION = 1;
const PASS_KEYS = ["exp", "iat", "iss", "k", "n", "p", "v"];
const LINK_KEYS = ["exp", "lid", "p", "v"];
/** A clock a little ahead of ours may mint a pass "in the future"; no more than this. */
const CLOCK_SKEW_MS = 60_000;
const TOKEN_MAX_LEN = 2048;
const LINK_ID_RE = /^[0-9a-f]{16}$/;
const NONCE_RE = /^[0-9a-f]{32}$/;

/** Account statuses whose holder may no longer vouch for a preview. PENDING_KYC is not one: staff need no KYC. */
const CLOSED_STATUSES = new Set(["SUSPENDED", "CLOSED", "SELF_EXCLUDED", "COOLED_OFF"]);

// ── THE SEAL ───────────────────────────────────────────────────────────────────────────────────────

function mac(secret: string, b64: string): string {
  return createHmac("sha256", secret).update(`kp-preview:${b64}`).digest("base64url");
}

function seal(secret: string, payload: Record<string, unknown>): string {
  const b64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${b64}.${mac(secret, b64)}`;
}

/** The payload of a token this secret sealed, or null. Constant-time; never throws. */
function unseal(secret: string, token: unknown): Record<string, unknown> | null {
  try {
    if (typeof token !== "string" || token.length === 0 || token.length > TOKEN_MAX_LEN) return null;
    const parts = token.split(".");
    if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
    const a = Buffer.from(parts[1]);
    const b = Buffer.from(mac(secret, parts[0]));
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    const payload: unknown = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8"));
    return payload && typeof payload === "object" && !Array.isArray(payload) ? (payload as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

const keysAre = (o: Record<string, unknown>, keys: string[]) => Object.keys(o).sort().join(",") === keys.join(",");
const isMs = (v: unknown): v is number => typeof v === "number" && Number.isSafeInteger(v) && v > 0;

// ── THE PASS ───────────────────────────────────────────────────────────────────────────────────────

export type PreviewPassKind = "staff" | "link";

/** A pass whose seal and shape are good. NOT yet an entitlement — see `resolvePreviewPass`. */
export type PreviewPassClaim = { kind: PreviewPassKind; issuer: string; iat: number; exp: number; nonce: string };

/** A pass that counts for THIS request: sealed, in date, and its issuer still vouches for it. */
export type PreviewPass = PreviewPassClaim & { valid: true };

/** Mint a pass. Null when there is no usable secret. `exp` is clamped to 24 h (and by the caller to a link's end). */
export function mintPreviewPass(kind: PreviewPassKind, issuer: string, exp: number, now: number = Date.now()): { token: string; claim: PreviewPassClaim } | null {
  const secret = previewSecret();
  if (!secret) return null;
  const claim: PreviewPassClaim = { kind, issuer, iat: now, exp: Math.min(exp, now + PREVIEW_PASS_TTL_MS), nonce: randomId(16) };
  if (claim.exp <= now) return null;
  return { token: seal(secret, { p: PASS_PURPOSE, v: TOKEN_VERSION, k: kind, iss: issuer, iat: claim.iat, exp: claim.exp, n: claim.nonce }), claim };
}

/**
 * Read a pass's seal and shape — STRICTLY. Null unless it is exactly a version-1 pass sealed with the preview
 * secret, minted no later than now (+1 min of skew), unexpired, and never longer-lived than 24 hours.
 * ⛔ `verifySession`'s rule "no exp never expires" does NOT apply here: exp is required, and bounded on READ.
 */
export function readPreviewPass(token: string | undefined | null, now: number = Date.now()): PreviewPassClaim | null {
  const secret = previewSecret();
  if (!secret) return null;
  const p = unseal(secret, token);
  if (!p || !keysAre(p, PASS_KEYS)) return null;
  if (p.p !== PASS_PURPOSE || p.v !== TOKEN_VERSION) return null;
  if (p.k !== "staff" && p.k !== "link") return null;
  if (typeof p.iss !== "string" || p.iss.length === 0 || p.iss.length > 200) return null;
  if (p.k === "link" && !LINK_ID_RE.test(p.iss)) return null;
  if (typeof p.n !== "string" || !NONCE_RE.test(p.n)) return null;
  if (!isMs(p.iat) || !isMs(p.exp)) return null;
  if (p.iat > now + CLOCK_SKEW_MS || p.exp <= now || p.exp <= p.iat || p.exp - p.iat > PREVIEW_PASS_TTL_MS) return null;
  return { kind: p.k, issuer: p.iss, iat: p.iat, exp: p.exp, nonce: p.n };
}

/** What the entitlement check needs to look up. Injected by suites; the real one reads the store. */
export type PreviewPassDeps = {
  findUser?: (id: string) => Promise<{ role: string; status: string } | null>;
  now?: number;
};

const findUserReal = async (id: string): Promise<{ role: string; status: string } | null> => {
  const u = await db.user.findById(id);
  return u ? { role: u.role, status: u.status } : null;
};

/**
 * ⭐ DOES THIS REQUEST'S PASS COUNT? Null unless ALL hold:
 *   · the rollout is STAFF_PREVIEW (WITHDRAWN ignores every pass; ACTIVE needs none);
 *   · the seal, shape and dates are good (`readPreviewPass`);
 *   · staff: the issuer's STORED row is a staff role (all seven, SUPPORT included — SJ-23) on an open account;
 *   · link: the link is in the record, unrevoked, unexpired, and the pass does not outlive it.
 * ⛔ Never throws: a failed lookup is no pass.
 */
export async function resolvePreviewPass(
  token: string | undefined | null,
  state: RolloutState,
  stored: StoredJourneySwitch,
  deps: PreviewPassDeps = {},
): Promise<PreviewPass | null> {
  try {
    if (state !== "STAFF_PREVIEW") return null;
    const now = deps.now ?? Date.now();
    const claim = readPreviewPass(token, now);
    if (!claim) return null;
    if (claim.kind === "staff") {
      const user = await (deps.findUser ?? findUserReal)(claim.issuer);
      if (!user || !isStaffRole(user.role) || CLOSED_STATUSES.has(user.status)) return null;
      return { ...claim, valid: true };
    }
    const link = stored.kind === "SET" ? stored.links.find((l) => l.id === claim.issuer) : undefined;
    if (!linkIsLive(link, now) || claim.exp > Date.parse(link.expiresAt)) return null;
    return { ...claim, valid: true };
  } catch {
    return null;
  }
}

// ── THE LINK ───────────────────────────────────────────────────────────────────────────────────────

/**
 * The token a link carries. DETERMINISTIC in (id, expiresAt), so `/admin/journey` can show the Owner the same URL
 * again at any time without storing it. Null when there is no usable secret.
 */
export function previewLinkToken(link: Pick<JourneyPreviewLink, "id" | "expiresAt">): string | null {
  const secret = previewSecret();
  if (!secret) return null;
  return seal(secret, { p: LINK_PURPOSE, v: TOKEN_VERSION, lid: link.id, exp: Date.parse(link.expiresAt) });
}

/** A link token's claim — its link id and end — or null. Strict, like the pass. */
export function readPreviewLinkToken(token: string | undefined | null, now: number = Date.now()): { linkId: string; exp: number } | null {
  const secret = previewSecret();
  if (!secret) return null;
  const p = unseal(secret, token);
  if (!p || !keysAre(p, LINK_KEYS)) return null;
  if (p.p !== LINK_PURPOSE || p.v !== TOKEN_VERSION) return null;
  if (typeof p.lid !== "string" || !LINK_ID_RE.test(p.lid) || !isMs(p.exp)) return null;
  if (p.exp <= now || p.exp - now > PREVIEW_LINK_TTL_MS + CLOCK_SKEW_MS) return null;
  return { linkId: p.lid, exp: p.exp };
}

// ── THE ONE RESOLVER ───────────────────────────────────────────────────────────────────────────────

export type JourneyResolution = {
  /** The effective rollout. */
  state: RolloutState;
  /** This request gets the new journey. */
  journey: boolean;
  /** This request wears the "Preview" marker. */
  preview: boolean;
  /** The pass that counted, or null. */
  pass: PreviewPass | null;
};

const NOTHING = (state: RolloutState): JourneyResolution => ({ state, journey: false, preview: false, pass: null });

/**
 * The resolution for one request, from its parts. ⭐ The testable core of `resolveSimpleJourney`.
 * ⛔ On `/admin` (and `/api`) the pass is ignored: the console is never previewed, and nothing there renders
 * the journey. Never throws.
 */
export async function resolveJourneyFor(
  input: { cookie: string | undefined | null; path: string | null | undefined },
  deps: PreviewPassDeps & { switchNow?: typeof journeySwitchNow } = {},
): Promise<JourneyResolution> {
  let state: RolloutState = "WITHDRAWN";
  try {
    const now = await (deps.switchNow ?? journeySwitchNow)();
    state = now.state;
    const path = typeof input.path === "string" ? input.path : "";
    if (path.startsWith("/admin") || path.startsWith("/api")) return NOTHING(state);
    const pass = state === "STAFF_PREVIEW" && input.cookie ? await resolvePreviewPass(input.cookie, state, now.stored, deps) : null;
    return { state, ...simpleJourneyFor(state, pass), pass };
  } catch {
    return NOTHING(state);
  }
}

/**
 * ⭐ THE PER-REQUEST ANSWER. AppShell and every journey page call THIS, and React's `cache` makes it one
 * resolution per request, so the shell and the page cannot disagree about one render.
 * ⚠️ AppShell is the ROOT layout and is not re-run on a soft navigation: a pass that expires mid-visit leaves the
 * marker up until the next document load while pages re-resolve. That is why setting and clearing a pass are
 * document navigations (a form POST answered by a 303), and why a page's own answer is the authority.
 */
export const resolveSimpleJourney = cache(async (): Promise<JourneyResolution> => {
  try {
    const [jar, h] = await Promise.all([cookies(), headers()]);
    return await resolveJourneyFor({ cookie: jar.get(JOURNEY_PREVIEW_COOKIE)?.value, path: h.get("x-pathname") });
  } catch {
    return NOTHING("WITHDRAWN");
  }
});
