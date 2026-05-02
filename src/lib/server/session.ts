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
  demoMode?: boolean;     // dev-only sandbox flag
  iat: number; // issued at
  exp: number; // expiry (ms epoch)
};

const COOKIE_NAME = "kp_session";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export async function createSession(data: Omit<SessionData, "iat" | "exp" | "sessionId">) {
  const now = Date.now();
  const session: SessionData = {
    ...data,
    sessionId: `sess_${randomId(16)}`,
    iat: now,
    exp: now + SESSION_TTL_MS,
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
  return verifySession<SessionData>(token);
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
