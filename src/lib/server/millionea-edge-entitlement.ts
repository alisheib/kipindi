/**
 * A narrow pre-render entitlement for Millionea's ticket routes while the product is dark.
 * The page still checks the stored rollout, full session and its own ticket read. This check
 * only prevents a non-holder's streamed notFound() from leaving an HTTP 200 behind.
 * ⛔ IT NEVER THROWS (S5-FIX-PLATFORM D5): the proxy loads it on a signed-in request to a dark ticket address only
 *    (`ticketHolderAtEdge`, src/proxy.ts), and a throw there would answer that request 500. Every read is caught: a
 *    failed session or holding read is private absence (false), as the page's own admission rules; a failed detail read
 *    after admission is the PAGE's error path (true: the request goes on to the page, B-1).
 */
import { normalizeMillioneaSerial } from "@/lib/millionea-serial";
import { SESSION_IDLE_TIMEOUT_MS } from "@/lib/session-limits";
import { ticketStore } from "./maswali-dal";
import { readActiveSession } from "./session-registry";

export type MillioneaEdgeSession = {
  userId?: unknown;
  sessionId?: unknown;
  exp?: unknown;
  iat?: unknown;
  lastSeenAt?: unknown;
};

export type MillioneaTicketEdgeReads = {
  activeSession: typeof readActiveSession;
  holdsAny: (userId: string) => Promise<boolean>;
  ownerOf: (serial: string) => Promise<string | null>;
};

const productionReads: MillioneaTicketEdgeReads = {
  activeSession: readActiveSession,
  holdsAny: async (userId) => (await ticketStore.listForUser(userId, { limit: 1 })).length > 0,
  ownerOf: async (serial) => (await ticketStore.getBySerial(serial))?.userId ?? null,
};

/**
 * Exactly the list or a single ticket. Missing, malformed and another owner's serial all
 * return false; the proxy gives each the same private router 404 without exposing a read result.
 */
export async function millioneaTicketEntitledAtEdge(
  pathname: string,
  session: MillioneaEdgeSession | null,
  reads: MillioneaTicketEdgeReads = productionReads,
  now: number = Date.now(),
): Promise<boolean> {
  if (!session || typeof session.userId !== "string" || !session.userId
    || typeof session.sessionId !== "string" || !session.sessionId
    || typeof session.exp !== "number" || !Number.isFinite(session.exp) || now > session.exp) return false;
  const lastSeen = session.lastSeenAt ?? session.iat;
  if (typeof lastSeen !== "number" || !Number.isFinite(lastSeen) || now - lastSeen > SESSION_IDLE_TIMEOUT_MS) return false;

  // Same policy as getSessionState(): a temporarily unreadable registry does not revoke
  // an otherwise valid signed cookie. A true missing/displaced registry row does.
  let active: Awaited<ReturnType<typeof readActiveSession>>;
  try { active = await reads.activeSession(session.userId, session.sessionId); } catch { return false; }
  if (active.state === "absent" || (active.state === "active" && active.sessionId !== session.sessionId)) return false;
  // Match millioneaTicketAdmission: a failed holding read is private absence. The
  // page makes this same admission read before either its list or detail read.
  let holds: boolean;
  try { holds = await reads.holdsAny(session.userId); } catch { return false; }
  if (!holds) return false;
  if (pathname === "/millionea/tickets") return true;
  const prefix = "/millionea/tickets/";
  if (!pathname.startsWith(prefix)) return false;
  const tail = pathname.slice(prefix.length);
  if (!tail || tail.includes("/")) return false;
  let decoded: string;
  try { decoded = decodeURIComponent(tail); } catch { return false; }
  const serial = normalizeMillioneaSerial(decoded);
  if (serial === null) return false;
  // Once admission succeeded, a failed detail read is the PAGE's error path (B-1: never a not-found drawn over a ticket
  // that may hold the reader's money): the request goes on, and the page's own read answers it or throws to its retryable
  // error boundary. ⛔ Never thrown from here: the proxy would answer the whole request 500 (S5-FIX-PLATFORM D5). Only a
  // holder reaches this line, and the page still checks the serial is theirs. Foreign and unknown serials share one 404.
  let owner: string | null;
  try { owner = await reads.ownerOf(serial); } catch { return true; }
  return owner === session.userId;
}
