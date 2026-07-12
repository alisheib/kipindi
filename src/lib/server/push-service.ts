/**
 * Web push (F4) — best-effort delivery of an in-app notification to a player's
 * subscribed browsers.
 *
 * Contract (mirrors `sendEmailToUser` in email.ts):
 *  - NEVER throws and NEVER blocks the caller. Call sites fire-and-forget.
 *  - The in-app notification store is the canonical record; push is a courtesy
 *    channel. A push failure must never affect a money/state path.
 *
 * Graceful degradation: when VAPID keys are unset the sender logs `[push-stub]`
 * and returns success — exactly like the Postmark/SMS stubs — so dev, tests and a
 * VAPID-less deploy all behave normally.
 *
 * RESPONSIBLE-GAMBLING SUPPRESSION (LCCP SR 3.4 / GLI-19): push is OUTBOUND
 * ENGAGEMENT. A self-excluded or cooling-off player must never be pushed at — the
 * whole point of the break is that we stop reaching out. The in-app notification
 * is still recorded (they can read it if they choose to log in) and transactional
 * email is unaffected, so nothing is hidden from them.
 */
import webpush from "web-push";
import { db } from "./store";
import { audit } from "./audit";
import { isLockedOut } from "./responsible-gambling";

export type PushPayload = {
  title: string;
  body: string;
  /** Deep link — becomes `data.url` in public/sw.js's notificationclick handler. */
  url?: string;
  /** Collapse key — the SW sets `renotify` when present. */
  tag?: string;
};

let configured: boolean | null = null;

/** Configure web-push once. Returns false when VAPID is not set (stub mode). */
function ensureConfigured(): boolean {
  if (configured !== null) return configured;
  const pub = process.env.VAPID_PUBLIC_KEY || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:support@50pick.tz";
  if (!pub || !priv) {
    configured = false;
    return false;
  }
  try {
    webpush.setVapidDetails(subject, pub, priv);
    configured = true;
  } catch {
    configured = false; // malformed keys → stay in stub mode rather than crash
  }
  return configured;
}

/** True when real push delivery is possible (VAPID configured). */
export function pushEnabled(): boolean {
  return ensureConfigured();
}

/**
 * Send a push to every device the user has subscribed. Best-effort:
 *  - RG-locked (self-excluded / cooling-off) → suppressed + audited, returns 0.
 *  - VAPID unset → `[push-stub]` log, returns 0 (no error).
 *  - A 404/410 from the push service means the endpoint is dead → pruned.
 * Never throws.
 */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<number> {
  try {
    // RG gate FIRST — before we even look up subscriptions.
    const lock = await isLockedOut(userId);
    if (lock.locked) {
      audit({
        category: "COMPLIANCE",
        action: "push.suppressed.rg_lockout",
        actorId: userId, targetType: "User", targetId: userId,
        payload: { reason: lock.reason, until: lock.until },
      });
      return 0;
    }

    const subs = await db.pushSub.listForUser(userId);
    if (subs.length === 0) return 0;

    if (!ensureConfigured()) {
      console.log(`[push-stub] To: ${userId} (${subs.length} device(s)) | ${payload.title} — ${payload.body}`);
      return 0;
    }

    const body = JSON.stringify({
      title: payload.title,
      body: payload.body,
      url: payload.url ?? "/",
      tag: payload.tag,
    });

    let sent = 0;
    await Promise.all(
      subs.map(async (s) => {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            body,
          );
          sent++;
        } catch (err) {
          const code = (err as { statusCode?: number }).statusCode;
          if (code === 404 || code === 410) {
            // Subscription is gone (uninstalled / permission revoked) — prune it.
            await db.pushSub.deleteByEndpoint(s.endpoint).catch(() => {});
          }
          // Any other failure is swallowed: push must never break a caller.
        }
      }),
    );
    return sent;
  } catch {
    return 0; // never throws
  }
}

/** Persist (or refresh) a browser subscription for a user. */
export async function savePushSubscription(userId: string, sub: { endpoint: string; p256dh: string; auth: string }): Promise<void> {
  await db.pushSub.upsert({ userId, endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth });
  audit({ category: "SECURITY", action: "push.subscribed", actorId: userId, targetType: "User", targetId: userId });
}

/** Remove a subscription (explicit opt-out on this device). */
export async function removePushSubscription(userId: string, endpoint: string): Promise<void> {
  await db.pushSub.deleteByEndpoint(endpoint);
  audit({ category: "SECURITY", action: "push.unsubscribed", actorId: userId, targetType: "User", targetId: userId });
}

/** How many devices this user currently has subscribed. */
export async function pushDeviceCount(userId: string): Promise<number> {
  return db.pushSub.countForUser(userId);
}
