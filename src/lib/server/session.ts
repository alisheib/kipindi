/**
 * Session management via signed HttpOnly cookies.
 * Security:
 *  - HttpOnly + SameSite=Lax + Secure (in prod)
 *  - HMAC-SHA-256 signed payload, tamper-evident
 *  - Rotating session ID, 7-day max lifetime, 24h sliding refresh recommended
 *  - Compliance: ISO 27001 A.9 access control, GBT user accountability
 */
import { cookies } from "next/headers";
import { cache } from "react";
import { signSession, verifySession, randomId } from "./crypto";
import { audit } from "./audit";
import { getActiveSessionId, setActiveSessionId, clearActiveSession } from "./session-registry";

/**
 * B-13 — request-scoped "this session was just revoked" signal.
 *
 * `getSession()` mostly runs during Server Component renders, where cookie
 * mutation THROWS — so the kp_revoked flash was never actually written from the
 * common path and the revoked device saw an unexplained silent sign-out.
 * React `cache()` gives one shared cell per request render pass: the mismatch
 * branch sets it, and AppShell (which itself calls getSession) reads it to
 * route the device to `/auth/login?revoked=1` with the real explanation.
 */
const revocationSignal = cache(() => ({ revoked: false }));
export function wasSessionRevokedThisRequest(): boolean {
  return revocationSignal().revoked;
}

export type SessionData = {
  userId: string;
  sessionId: string;
  phoneE164: string;
  role: "PLAYER" | "AGENT" | "MODERATOR" | "ADMIN" | "COMPLIANCE" | "SUPPORT" | "FINANCE" | "GROWTH" | "AUDITOR";
  kycStatus: "NOT_STARTED" | "IN_PROGRESS" | "PENDING_REVIEW" | "APPROVED" | "REJECTED" | "ADDITIONAL_INFO_REQUIRED";
  iat: number;       // issued at (ms epoch)
  exp: number;       // absolute expiry (ms epoch) — hard cap, not extended on activity
  lastSeenAt: number; // ms epoch — refreshed on activity, drives the idle-timeout check
  /**
   * E-235 · ms epoch this PLAY SESSION began — the clock `sessionTimeLimitMin` is measured
   * against. NOT `iat`: a signed-in player may hold a cookie for the full 7-day cap, so
   * measuring from login would put everyone instantly past a 30-minute limit. A gap in
   * activity of `PLAY_SESSION_GAP_MIN` ends one play session and starts the next, which is
   * what a player means by "a session".
   *
   * ⭐ IT LIVES IN THE SIGNED COOKIE, AND THAT IS THE POINT. The reality-check prompt keeps
   * its own clock in `sessionStorage`, where the player can clear it — fine for a nudge,
   * useless for a limit that refuses bets. This value is signed by the server, so the limit
   * cannot be reset by clearing site data.
   *
   * Optional only for cookies minted before this existed; `getSession` stamps those on
   * first read rather than treating a missing value as "started at the epoch".
   */
  playStartedAt?: number;
};

const COOKIE_NAME = "kp_session";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;            // 7-day absolute cap
const IDLE_TIMEOUT_MS = 24 * 60 * 60 * 1000;               // 24 h since last activity
const REFRESH_THROTTLE_MS = 5 * 60 * 1000;                 // resign cookie at most every 5 min
/* E-235 — a gap this long ends one play session and begins the next.
 *
 * ⭐ MOVED TO `@/lib/play-session` ON 2026-09-04 AND RE-EXPORTED HERE, so this module's
 * surface is unchanged. The client needs the same boundary — `presence-window.ts` measures
 * it in ATTENTION, which is the half of the truth this file cannot see (every poll from a
 * backgrounded tab runs `getSession()` and refreshes `lastSeenAt`, so a sleeping player looks
 * present to the server) — and this module is unreachable from the client graph: it imports
 * `next/headers`, `./crypto`, `./audit` and `./session-registry`.
 *
 * ⛔ Importing the constant from here would drag the session machinery into a browser chunk.
 * That is the `hashKey64` → `lock-key.ts` extraction, for the identical measured reason, and
 * Ali's ruling of the same date was explicit that the two sides must share ONE definition
 * rather than agree by coincidence. */
export { PLAY_SESSION_GAP_MIN } from "@/lib/play-session";
import { PLAY_SESSION_GAP_MS } from "@/lib/play-session";

// ── Server-side session registry ─────────────────────────────────────
// One active sessionId per userId. A new login replaces it, invalidating ALL
// prior sessions on any device — single-active-session per account, critical
// for a gambling platform (concurrent logins → balance confusion, shared
// betting, accountability gaps). Backed by the durable ActiveSession table
// (see session-registry.ts) so the invariant survives deploys/restarts and
// supports immediate server-side revocation.

export async function createSession(data: Omit<SessionData, "iat" | "exp" | "sessionId" | "lastSeenAt">) {
  const now = Date.now();
  const session: SessionData = {
    ...data,
    sessionId: `sess_${randomId(16)}`,
    iat: now,
    exp: now + SESSION_TTL_MS,
    lastSeenAt: now,
    playStartedAt: now,
  };
  const token = signSession(session);
  const jar = await cookies();
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  });
  // Register as the ONLY active session for this user. Any previous
  // session (on another device) is now invalid — getSession() will
  // reject it on the next request.
  const previousSessionId = await setActiveSessionId(data.userId, session.sessionId);
  audit({
    category: "AUTH",
    action: "session.created",
    actorId: data.userId,
    targetType: "Session",
    targetId: session.sessionId,
    payload: { role: data.role, kyc: data.kycStatus, revokedPrior: previousSessionId ?? null },
  });
  return session;
}

export async function getSession(): Promise<SessionData | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  const session = verifySession<SessionData>(token);
  if (!session) return null;

  const now = Date.now();
  // Single-active-session check (DB-authoritative).
  //
  //   a) Registry has THIS sessionId → valid, proceed
  //   b) Registry has a DIFFERENT sessionId → revoked by a newer login
  //   c) Registry has NO row → not an active session. Strict: sign out. This is
  //      what makes server-side revocation (logout/suspend/self-exclude) real —
  //      a deleted row means logged out, not "claim the slot". A cookie minted
  //      before the durable registry existed lands here once and re-logs-in.
  const activeId = await getActiveSessionId(session.userId);
  if (!activeId || activeId !== session.sessionId) {
    // B-13 — the cookie mutations below THROW in a Server Component render
    // (most getSession calls), so the flash was silently never written and the
    // player got an unexplained sign-out. The request-scoped signal is the
    // render-safe channel: AppShell reads it and sends the revoked device to
    // /auth/login?revoked=1 with the explanation. The cookie path is kept for
    // actions/route handlers, where it does work.
    revocationSignal().revoked = true;
    try {
      jar.delete(COOKIE_NAME);
      // Short-lived flash cookie so the login page can explain WHY
      // the user was signed out (rather than a silent redirect).
      jar.set("kp_revoked", "1", {
        httpOnly: false,
        path: "/",
        maxAge: 30,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      });
    } catch { /* read-only context */ }
    audit({
      category: "AUTH",
      action: activeId ? "session.revoked_by_newer_login" : "session.revoked_no_active_record",
      actorId: session.userId,
      targetType: "Session",
      targetId: session.sessionId,
      payload: { replacedBy: activeId },
    });
    return null;
  }

  // Absolute expiry — hard 7-day cap. Without this, a tampered cookie
  // with a far-future exp could survive indefinitely.
  if (session.exp && now > session.exp) {
    try { jar.delete(COOKIE_NAME); } catch { /* read-only context */ }
    audit({ category: "AUTH", action: "session.expired", actorId: session.userId, targetType: "Session", targetId: session.sessionId });
    return null;
  }
  // Idle timeout — kick the session if it hasn't been seen in 24h, even
  // though the absolute exp may still be hours away. LCCP / GBT
  // account-protection: idle browsers that left the tab open should not
  // remain authenticated for the full 7-day cap.
  const lastSeen = session.lastSeenAt ?? session.iat ?? now;
  if (now - lastSeen > IDLE_TIMEOUT_MS) {
    // Drop the cookie so subsequent calls are clean.
    try { jar.delete(COOKIE_NAME); } catch { /* read-only context */ }
    audit({
      category: "AUTH",
      action: "session.idle_timeout",
      actorId: session.userId,
      targetType: "Session",
      targetId: session.sessionId,
      payload: { idleMs: now - lastSeen },
    });
    return null;
  }

  // ── E-235 · WHERE ONE PLAY SESSION ENDS AND THE NEXT BEGINS ──────────────
  // The same `lastSeen` the idle timeout uses answers this too, so it costs no extra read.
  // A gap of PLAY_SESSION_GAP_MIN means the player went away and came back: that is a new
  // session, and their time limit starts again. Anything shorter is the same sitting.
  //
  // ⚠️ A cookie minted before this field existed is stamped NOW rather than defaulting to
  // `iat`. Defaulting to `iat` would have every already-signed-in player land mid-deploy
  // with hours on the clock and be refused their next bet by a limit they had not reached.
  let playStartedAt = session.playStartedAt ?? 0;
  let playReset = false;
  if (!playStartedAt || now - lastSeen > PLAY_SESSION_GAP_MS) {
    playStartedAt = now;
    playReset = true;
  }

  // Refresh the lastSeenAt cookie at most every REFRESH_THROTTLE_MS so
  // we don't re-sign on every single request (cheap but not free).
  // ⛔ `playReset` forces a re-sign regardless of the throttle: a reset that is computed and
  // then not persisted would be recomputed identically on every request inside the throttle
  // window, so the clock would never actually start.
  if (playReset || now - lastSeen > REFRESH_THROTTLE_MS) {
    const refreshed: SessionData = { ...session, lastSeenAt: now, playStartedAt };
    try {
      const token2 = signSession(refreshed);
      jar.set(COOKIE_NAME, token2, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: Math.max(0, Math.floor((session.exp - now) / 1000)),
      });
    } catch {
      // Read-only / static-render contexts can't write cookies — fall
      // back to the in-memory refreshed value, the next mutable
      // request will resync.
    }
    return refreshed;
  }
  return { ...session, playStartedAt };
}

export async function destroySession() {
  // Read the cookie directly (not via getSession which would check the
  // registry and potentially return null for a revoked session — we still
  // want to clean up the cookie and audit the explicit logout).
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  const session = verifySession<SessionData>(token);
  jar.delete(COOKIE_NAME);
  if (session) {
    // Only clear the registry if THIS session is still the active one.
    // If another device already replaced it, don't clear their session.
    await clearActiveSession(session.userId, session.sessionId);
    audit({
      category: "AUTH",
      action: "session.destroyed",
      actorId: session.userId,
      targetType: "Session",
      targetId: session.sessionId,
    });
  }
}

export async function requireSession(): Promise<SessionData> {
  const s = await getSession();
  if (!s) throw new SessionRequiredError();
  return s;
}

export class SessionRequiredError extends Error {
  constructor() { super("Sign in required"); this.name = "SessionRequiredError"; }
}
