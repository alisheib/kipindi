/**
 * THE EVIDENCE DOWNLOAD'S DOOR (MASWALI-BUILD S6, MB-92; S6 review R2-5) — everything
 * `GET /api/admin/maswali/evidence/[weekId]` decides, with what it reaches outside itself passed in, so a suite drives
 * every refusal by behaviour (a script has no cookies): the contacts export's door pattern (`contacts/export.ts`). The
 * route maps the answer to a response and decides nothing of its own.
 *
 * ⛔ THE AUDIENCE IS THE EVIDENCE PAGE'S OWN: whoever may view `/admin/maswali/evidence` — Compliance, the Auditor (read
 *    only: the door writes nothing but its own record) and the Owner. Decided on the STORED role, never the cookie's
 *    (the transactions export's W25 lesson), with the console's second factor, and the export gate first: a cross-site
 *    navigation or a HEAD never starts an export. Anyone else meets the same 404 a missing route answers.
 * ⛔ ONLY A FINAL WEEK (`maswali-evidence.ts`): a week still deciding is refused by name, never served half.
 * ⭐ EVERY EXPORT IS RECORDED, AWAITED, BEFORE THE FILE LEAVES: who took which week's evidence, which part, and the
 *    SHA-256 of the exact bytes handed over — so a file produced at a hearing can be matched to its export. An export
 *    whose record could not be written hands over nothing.
 */
import { createHash } from "node:crypto";
import { currentSession } from "./auth-service";
import { canView } from "./rbac";
import { domainForPath, isAdmin } from "./roles";
import { checkAdminTotp } from "./admin-guard";
import { audit } from "./audit";
import { db } from "./store";
import { exportRequestAllowed } from "./contacts/export";
import { maswaliEvidencePack, maswaliEvidenceTickets } from "./maswali-evidence";

/** The page this download belongs to; its domain is the download's audience. */
const EVIDENCE_PAGE = "/admin/maswali/evidence";

export type EvidenceDoorRequest = { method: string; url: string; secFetchSite: string | null; weekId: string };

/** What the door reaches outside itself. The production members are `MASWALI_EVIDENCE_DOOR_DEPS`, frozen. */
export type EvidenceDoorDeps = {
  /** The signed-in viewer's ids, or null. The ROLE is never taken from here: it is read from the stored row. */
  session: () => Promise<{ userId: string; sessionId: string } | null>;
  /** The console's second factor for this session: "ok", or why not. */
  secondFactor: (userId: string, sessionId: string) => Promise<string>;
  /** Records the export, and says whether the record exists (`audit`'s own `recorded`). */
  record: (entry: Parameters<typeof audit>[0]) => Promise<{ recorded: boolean }>;
  /** The week's pack and its ticket CSV (`part=pack`). */
  pack: (weekId: string) => ReturnType<typeof maswaliEvidencePack>;
  /** R5 · the ticket CSV alone (`part=tickets`): built without the pack, so no section of the pack holds it back. */
  tickets: (weekId: string) => ReturnType<typeof maswaliEvidenceTickets>;
};

export const MASWALI_EVIDENCE_DOOR_DEPS: Readonly<EvidenceDoorDeps> = Object.freeze({
  session: async () => {
    const s = await currentSession();
    return s ? { userId: s.userId, sessionId: s.sessionId } : null;
  },
  secondFactor: (userId: string, sessionId: string) => checkAdminTotp(userId, sessionId),
  record: (entry: Parameters<typeof audit>[0]) => audit(entry),
  pack: (weekId: string) => maswaliEvidencePack(weekId),
  tickets: (weekId: string) => maswaliEvidenceTickets(weekId),
});

export type EvidenceDoorAnswer =
  | { kind: "not_found" }
  | { kind: "not_final"; error: string }
  | { kind: "unrecorded" }
  | { kind: "file"; body: string; sha256: string; contentType: string; fileName: string };

/** ⭐ ONE DOWNLOAD, DECIDED: the request, then the viewer, then the second factor, then the week, then its record. */
export async function maswaliEvidenceDoor(req: EvidenceDoorRequest, deps: Readonly<EvidenceDoorDeps> = MASWALI_EVIDENCE_DOOR_DEPS): Promise<EvidenceDoorAnswer> {
  if (req.method !== "GET" || !exportRequestAllowed(req.secFetchSite)) return { kind: "not_found" };
  const session = await deps.session();
  const u = session ? await Promise.resolve().then(() => db.user.findById(session.userId)).catch(() => null) : null;
  if (!session || !u || !(isAdmin(u.role) || (await canView(u.role, domainForPath(EVIDENCE_PAGE))))) return { kind: "not_found" };
  if ((await deps.secondFactor(session.userId, session.sessionId)) !== "ok") return { kind: "not_found" };

  const part = new URL(req.url).searchParams.get("part") === "tickets" ? "tickets" : "pack";
  // R5 · the ticket CSV is built on its own (the week and its tickets), never from the pack: a section of the pack that
  // cannot be read never holds back the CSV a refund is checked against.
  const built = part === "tickets"
    ? await deps.tickets(req.weekId).then((t) => (t.ok ? { ok: true as const, week: t.week, body: t.csv, tickets: t.tickets } : t))
    : await deps.pack(req.weekId).then((p) => (p.ok ? { ok: true as const, week: p.pack.week, body: JSON.stringify(p.pack, null, 2), tickets: p.pack.tickets } : p));
  if (!built.ok) return built.notFinal ? { kind: "not_final", error: built.error } : { kind: "not_found" };
  const { week, body, tickets } = built;
  const sha256 = createHash("sha256").update(body).digest("hex");
  const record = await deps.record({
    category: "COMPLIANCE",
    action: "maswali.evidence.exported",
    actorId: session.userId,
    targetType: "MaswaliCycle",
    targetId: week.id,
    payload: { week: week.code, part, sha256, bytes: Buffer.byteLength(body), tickets: tickets.count, ticketsSha256: tickets.sha256 },
  });
  // ⛔ An export whose record could not be written hands over nothing (the export doors' rule, `contacts/export.ts`).
  if (!record.recorded) return { kind: "unrecorded" };
  return {
    kind: "file",
    body,
    sha256,
    contentType: part === "tickets" ? "text/csv; charset=utf-8" : "application/json; charset=utf-8",
    fileName: `50pick-millionea-${part === "tickets" ? "tickets" : "evidence"}-${week.code}.${part === "tickets" ? "csv" : "json"}`,
  };
}
