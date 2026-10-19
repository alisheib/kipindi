/**
 * Verify the signed cookie before a protected document can begin streaming.
 * Kept outside proxy.ts so the file convention exports only its route entry and
 * the already-established isProtectedPath guard seam.
 */
export type VerifiedProxySession = {
  role?: string;
  userId?: string;
  sessionId?: string;
  exp?: number;
  iat?: number;
  lastSeenAt?: number;
};

function b64uToBytes(s: string): Uint8Array {
  const std = s.replace(/-/g, "+").replace(/_/g, "/");
  const pad = std.length % 4 === 0 ? std : std + "=".repeat(4 - (std.length % 4));
  const bin = atob(pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function timingSafeEq(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a[i] ^ b[i];
  return r === 0;
}

/**
 * W25 belt 1: verifies the HMAC and returns its claims. The cookie's role is a
 * snapshot, so admin pages still re-read the stored role. Millionea's dark
 * ticket belt needs the signed account and session claims for its own reads.
 */
export async function readVerifiedSession(token: string | undefined): Promise<VerifiedProxySession | null> {
  if (!token) return null;
  const dot = token.indexOf(".");
  if (dot <= 0 || dot >= token.length - 1) return null;
  const b64 = token.slice(0, dot);
  const mac = token.slice(dot + 1);
  // Same key and dev fallback as src/lib/server/crypto.ts's sessionSecret().
  const secret = process.env.SESSION_SECRET
    || (process.env.NODE_ENV === "production"
        ? (() => { throw new Error("FATAL: SESSION_SECRET not set in production"); })()
        : "dev-only-secret-replace-in-prod-32chars-minimum");
  try {
    const key = await crypto.subtle.importKey(
      "raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
    );
    const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(b64));
    const expected = new Uint8Array(sig);
    let actual: Uint8Array;
    try { actual = b64uToBytes(mac); } catch { return null; }
    if (!timingSafeEq(expected, actual)) return null;
    try {
      const payload = JSON.parse(new TextDecoder().decode(b64uToBytes(b64))) as VerifiedProxySession;
      if (payload.exp && Date.now() > payload.exp) return null;
      return { role: payload.role, userId: payload.userId, sessionId: payload.sessionId,
        exp: payload.exp, iat: payload.iat, lastSeenAt: payload.lastSeenAt };
    } catch { return null; }
  } catch {
    return null;
  }
}
