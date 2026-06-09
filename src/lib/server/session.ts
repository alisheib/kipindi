/**
 * Session management via signed HttpOnly cookies.
 * Security:
 *  - HttpOnly + SameSite=Lax + Secure (in prod)
 *  - HMAC-SHA-256 signed payload, tamper-evident
 *  - Rotating session ID, 7-day max lifetime, 24h sliding refresh recommended
 *  - Compliance: ISO 27001 A.9 access control, GBT user accountability
 */
import { cookies } from "next/headers";
import { signSession, verifySession, randomId } from "./crypto";
import { audit } from "./audit";

export type SessionData = {
  userId: string;
  sessionId: string;
  phoneE164: string;
  role: "PLAYER" | "AGENT" | "MODERATOR" | "ADMIN" | "COMPLIANCE" | "SUPPORT";
  kycStatus: "NOT_STARTED" | "IN_PROGRESS" | "PENDING_REVIEW" | "APPROVED" | "REJECTED" | "ADDITIONAL_INFO_REQUIRED";
  iat: number;       // issued at (ms epoch)
  exp: number;       // absolute expiry (ms epoch) — hard cap, not extended on activity
  lastSeenAt: number; // ms epoch — refreshed on activity, drives the idle-timeout check
};

const COOKIE_NAME = "kp_session";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;            // 7-day absolute cap
const IDLE_TIMEOUT_MS = 24 * 60 * 60 * 1000;               // 24 h since last activity
const REFRESH_THROTTLE_MS = 5 * 60 * 1000;                 // resign cookie at most every 5 min

// ── Server-side session registry ─────────────────────────────────────
// Maps userId → activeSessionId. A new login for the same user replaces
// the entry, which invalidates ALL prior sessions on any device. This
// enforces single-active-session per account — critical for a gambling
// platform where concurrent logins on the same account can lead to
// balance confusion, shared betting, and regulatory non-compliance.
declare global {
  // eslint-disable-next-line no-var
  var __50PICK_ACTIVE_SESSIONS: Map<string, string> | undefined;
}
const activeSessions: Map<string, string> =
  globalThis.__50PICK_ACTIVE_SESSIONS ?? (globalThis.__50PICK_ACTIVE_SESSIONS = new Map());

export async function createSession(data: Omit<SessionData, "iat" | "exp" | "sessionId" | "lastSeenAt">) {
  const now = Date.now();
  const session: SessionData = {
    ...data,
    sessionId: `sess_${randomId(16)}`,
    iat: now,
    exp: now + SESSION_TTL_MS,
    lastSeenAt: now,
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
  const previousSessionId = activeSessions.get(data.userId);
  activeSessions.set(data.userId, session.sessionId);
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
  // Single-active-session check.
  //
  // Three states:
  //   a) Registry has THIS sessionId → valid, proceed
  //   b) Registry has a DIFFERENT sessionId → revoked by newer login
  //   c) Registry has NO entry for this user → process restarted, registry
  //      was lost. Self-heal: register this session as the active one.
  //      The first device to make a request after restart "claims" the slot;
  //      the second device finds a mismatch and gets revoked. Equivalent to
  //      "the device the user is actually using survives."
  const activeId = activeSessions.get(session.userId);
  if (!activeId) {
    // Self-heal after restart — claim the slot
    activeSessions.set(session.userId, session.sessionId);
  } else if (activeId !== session.sessionId) {
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
      action: "session.revoked_by_newer_login",
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

  // Refresh the lastSeenAt cookie at most every REFRESH_THROTTLE_MS so
  // we don't re-sign on every single request (cheap but not free).
  if (now - lastSeen > REFRESH_THROTTLE_MS) {
    const refreshed: SessionData = { ...session, lastSeenAt: now };
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
  return session;
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
    if (activeSessions.get(session.userId) === session.sessionId) {
      activeSessions.delete(session.userId);
    }
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
