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
  audit({
    category: "AUTH",
    action: "session.created",
    actorId: data.userId,
    targetType: "Session",
    targetId: session.sessionId,
    payload: { role: data.role, kyc: data.kycStatus },
  });
  return session;
}

export async function getSession(): Promise<SessionData | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  const session = verifySession<SessionData>(token);
  if (!session) return null;

  const now = Date.now();
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
  const session = await getSession();
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
  if (session) {
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
