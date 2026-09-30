/**
 * THE OWNER'S CEREMONY FOR THE NEW JOURNEY — the kill, the resume, and the preview links (Vodacom plan S1).
 *
 * The WRITE side of `simple-journey-switch.ts`, and its ONE writer. Imported by `/admin/journey`'s actions and by
 * the suites. Modelled step for step on `invite-rewards-ceremony.ts` (the Owner's Payable switch), because it is
 * the same kind of control: one sealed record, the Owner only, a reason on file, nothing unrecorded.
 *
 * Three acts, one record:
 *   · CAP         — set the Owner's cap on the rollout. WITHDRAWN is the instant kill (nobody sees the journey,
 *                   every pass is ignored, on every container within 10 s). ACTIVE means "no cap": the code and
 *                   the environment decide (`simpleJourneyCeiling`). STAFF_PREVIEW is the soft rollback once the
 *                   ceiling is ACTIVE (after S15): players go back to the old journey, previews carry on.
 *   · ISSUE_LINK  — a signed 7-day preview link for someone outside 50pick (SJ-23: the agency). No admin access.
 *   · REVOKE_LINK — that link, and every pass minted from it, stop counting (within 10 s).
 * ⛔ A LINK ACT NEVER MOVES THE ROLLOUT. With no record yet the cap is written as ACTIVE (no cap — what ABSENT
 * already means); over an unreadable record it is written as WITHDRAWN (what MALFORMED already means). Only CAP
 * changes what anybody sees.
 *
 * ⛔ THE CHECKS RUN IN ONE ORDER, AND THE ORDER IS THE SPEC. (1) a session at all ("Your session ended", no
 * audit row), then the viewer's STORED role — a refusal writes a SECURITY `privilege_escalation_blocked` row.
 * (2) the console's two-step status (passes when `DISABLE_ADMIN_TOTP=true`). (3) the act, understood. (4) the
 * reason, cleaned of invisible characters. (5) the act's own fields. (6) under the switch's lock: a fresh read,
 * the seq the page was rendered on, the no-op check, the COMPLIANCE attempt row (refused unless RECORDED), the
 * sealed write, read back. (7) after the lock, the COMPLIANCE outcome row (`confirmed: false` when unknown).
 * ⛔ A REFUSAL IS A UNION, NEVER A THROW.
 */
import { audit } from "./audit";
import { db } from "./store";
import { withLock } from "./locks";
import { randomId } from "./crypto";
import type { AdminTotpStatus } from "./admin-guard";
import { appUrl } from "@/lib/app-url";
import { cleanReason } from "@/lib/affiliate-rules";
import { isRolloutState, simpleJourneyCeiling, type RolloutState } from "@/lib/feature-state";
import { PREVIEW_LINK_TTL_MS, previewLinkToken, previewSecret } from "./journey-preview";
import {
  JOURNEY_LINKS_MAX,
  JOURNEY_LINK_LABEL_MAX,
  JOURNEY_LINK_LABEL_MIN,
  JOURNEY_REASON_MAX,
  JOURNEY_REASON_MIN,
  JOURNEY_SWITCH_KEY,
  composeSimpleJourney,
  linkIsLive,
  readJourneySwitchFresh,
  writeJourneySwitchVerified,
  type JourneyPreviewLink,
  type JourneySwitchRecord,
  type StoredJourneySwitch,
} from "./simple-journey-switch";

export { JOURNEY_REASON_MAX, JOURNEY_REASON_MIN, JOURNEY_LINK_LABEL_MAX, JOURNEY_LINK_LABEL_MIN } from "./simple-journey-switch";

/** The switch's lock. Every act is serialised on it, across containers. */
export const JOURNEY_SWITCH_LOCK = "simple-journey:switch";

/** How long an ended link stays listed on the page before a later act prunes it from the record. */
const LINK_PRUNE_AFTER_MS = 30 * 24 * 60 * 60 * 1000;
const LINK_ID_RE = /^[0-9a-f]{16}$/;

/** What the page posts. */
export type JourneyCeremonyInput =
  | { op: "CAP"; to: RolloutState; reason: string; expectSeq: number }
  | { op: "ISSUE_LINK"; label: string; reason: string; expectSeq: number }
  | { op: "REVOKE_LINK"; linkId: string; reason: string; expectSeq: number };

/**
 * What it answers. `state` is the rollout AFTER the act. `link` is set for ISSUE_LINK: the new link and its URL
 * (the Owner copies it from here). `recorded` is false only when the act LANDED and its COMPLIANCE row did not.
 */
export type JourneyCeremonyResult =
  | { ok: true; changed: boolean; state: RolloutState; note: string | null; warn: boolean; recorded: boolean; link: { id: string; url: string | null; expiresAt: string } | null }
  | { ok: false; error: string; field?: "reason" | "label" | "seq" | "to" | "link" };

/** The ceremony's context — resolved by the action, never by this module (no cookies here). */
export type JourneyCeremonyContext = { totp: AdminTotpStatus };

const COPY = {
  refused: "Only the Owner can change the new journey's rollout or its preview links.",
  whoUnknown: "We could not confirm who you are, so nothing changed. Reload the page and try again.",
  totpNotEnrolled: "Two-step sign-in is not set up on this account. Set it up, then try again. Nothing changed.",
  totpUnverified: "Your console session needs its two-step check again. Reload the page, then try again. Nothing changed.",
  notUnderstood: "The request was not understood, so nothing changed. Reload the page and try again.",
  reasonShort: `Say why, in ${JOURNEY_REASON_MIN} characters or more. It is kept with the change.`,
  reasonLong: `Keep the reason under ${JOURNEY_REASON_MAX} characters.`,
  labelBad: `Name who the link is for, in ${JOURNEY_LINK_LABEL_MIN} to ${JOURNEY_LINK_LABEL_MAX} characters.`,
  noSecret: "Preview links need the server's preview secret (JOURNEY_PREVIEW_SECRET), which is not set. Nothing changed.",
  tooManyLinks: `${JOURNEY_LINKS_MAX} preview links are live. Revoke one nobody needs, then try again. Nothing changed.`,
  noSuchLink: "That link is not in the record. Reload the page to see the links as they are now. Nothing changed.",
  seqStale: "The switch was changed a moment ago. Reload the page to see who changed it and why. Nothing changed.",
  unread: "The stored switch could not be read, so nothing changed. Try again.",
  notStored: "The change did not reach the database, so nothing changed. Try again.",
  attemptUnrecorded: "The compliance record could not be written first, so nothing changed. Try again.",
  outcomeUnknown: "Outcome unknown — reload to see the current state.",
  sessionEnded: "Your session ended — sign in again. Nothing changed.",
  alreadyCap: "The switch was already in that position. Nothing changed.",
  alreadyRevoked: "That link had already stopped working. Nothing changed.",
  notRecorded: "⚠️ Its compliance record could not be written — tell whoever keeps the records.",
  capBelowCeiling: "Stored — the server's own ceiling is lower, so the rollout does not move until it rises.",
} as const;

type Parsed =
  | { op: "CAP"; to: RolloutState }
  | { op: "ISSUE_LINK"; label: string }
  | { op: "REVOKE_LINK"; linkId: string };

/**
 * ⭐ THE CEREMONY.
 * @param viewerUserId the SESSION's user id (null when there is none); the role is read from the row.
 * @param input        what the page posted — treated as untrusted, field by field.
 * @param ctx          the action's own two-step status for this session (`checkAdminTotp`).
 */
export async function runJourneyCeremony(
  viewerUserId: string | null | undefined,
  input: JourneyCeremonyInput,
  ctx: JourneyCeremonyContext,
): Promise<JourneyCeremonyResult> {
  const post: Record<string, unknown> = input && typeof input === "object" ? (input as unknown as Record<string, unknown>) : {};
  const auditAction = post.op === "ISSUE_LINK" ? "journey.preview.link.issued" : post.op === "REVOKE_LINK" ? "journey.preview.link.revoked" : "journey.rollout.set";

  // (1) THE OWNER — on the STORED row. No session at all is a session that ENDED, not an escalation.
  if (typeof viewerUserId !== "string" || viewerUserId.length === 0) return { ok: false, error: COPY.sessionEnded };
  const actorId: string = viewerUserId;
  let role: string | null;
  try {
    role = (await db.user.findById(actorId))?.role ?? null;
  } catch {
    return { ok: false, error: COPY.whoUnknown };
  }
  if (role !== "ADMIN") {
    void audit({
      category: "SECURITY",
      action: "privilege_escalation_blocked",
      actorId,
      targetType: "Action",
      targetId: auditAction,
      payload: { role: role ?? "unknown", ownerOnly: true, action: auditAction },
    });
    return { ok: false, error: COPY.refused };
  }

  // (2) THE CONSOLE'S TWO-STEP STATUS for this session.
  if (ctx?.totp !== "ok") return { ok: false, error: ctx?.totp === "not-enrolled" ? COPY.totpNotEnrolled : COPY.totpUnverified };

  // (3) THE ACT.
  const parsed = parseAct(post);
  if ("error" in parsed) return { ok: false, error: COPY.notUnderstood, ...(parsed.field ? { field: parsed.field } : {}) };
  const act: Parsed = parsed;

  // (4) THE REASON — cleaned (five zero-width spaces are not a reason), bounded, stored as cleaned.
  const reason = cleanReason(post.reason);
  if (reason.length < JOURNEY_REASON_MIN) return { ok: false, error: COPY.reasonShort, field: "reason" };
  if (reason.length > JOURNEY_REASON_MAX) return { ok: false, error: COPY.reasonLong, field: "reason" };

  // (5) THE ACT'S OWN FIELDS.
  if (act.op === "ISSUE_LINK") {
    if (act.label.length < JOURNEY_LINK_LABEL_MIN || act.label.length > JOURNEY_LINK_LABEL_MAX) return { ok: false, error: COPY.labelBad, field: "label" };
    if (!previewSecret()) return { ok: false, error: COPY.noSecret };
  }
  const expectSeq = post.expectSeq;
  if (typeof expectSeq !== "number" || !Number.isSafeInteger(expectSeq) || expectSeq < 0) return { ok: false, error: COPY.seqStale, field: "seq" };

  // (6) UNDER THE LOCK. ⛔ No write begins unrecorded, and every outcome is READ BACK, never inferred.
  const { ceiling } = simpleJourneyCeiling();
  type Landed = { changed: false; note: string } | { changed: true; from: RolloutState; stored: StoredJourneySwitch; seq: number; link: JourneyPreviewLink | null };
  type Unknown = { unknown: true };
  const progress: { writesBegan: boolean; attemptSeq: number; landed: Landed | null } = { writesBegan: false, attemptSeq: 0, landed: null };

  const lockedAct = async (): Promise<JourneyCeremonyResult | Landed | Unknown> => {
    const fresh = await readJourneySwitchFresh();
    if (fresh.kind === "UNREAD") return { ok: false, error: COPY.unread };
    const currentSeq = fresh.kind === "SET" ? fresh.seq : 0;
    if (expectSeq !== currentSeq) return { ok: false, error: COPY.seqStale, field: "seq" };
    const from = composeSimpleJourney(ceiling, fresh);
    /* ⛔ THE BASE CAP PRESERVES WHAT ANYBODY SEES: no record means no cap (ACTIVE); an unreadable one reads as
       WITHDRAWN and is rewritten as WITHDRAWN. Only a CAP act moves it. */
    const baseCap: RolloutState = fresh.kind === "SET" ? fresh.cap : fresh.kind === "ABSENT" ? "ACTIVE" : "WITHDRAWN";
    const now = Date.now();
    const nowIso = new Date(now).toISOString();
    const baseLinks: JourneyPreviewLink[] = fresh.kind === "SET"
      ? fresh.links.filter((l) => Math.max(Date.parse(l.expiresAt), l.revokedAt ? Date.parse(l.revokedAt) : 0) > now - LINK_PRUNE_AFTER_MS)
      : [];
    let record: JourneySwitchRecord;
    let newLink: JourneyPreviewLink | null = null;
    if (act.op === "CAP") {
      if (fresh.kind !== "MALFORMED" && baseCap === act.to) return { changed: false, note: COPY.alreadyCap };
      record = { cap: act.to, links: baseLinks, seq: currentSeq + 1, changedAt: nowIso, changedBy: actorId, reason };
    } else if (act.op === "ISSUE_LINK") {
      /* ⭐ A FULL RECORD MAKES ROOM FROM THE LINKS THAT NO LONGER OPEN ANYTHING — revoked or ended, the one that
         stopped earliest first — and refuses only when every slot holds a LIVE link. A revoke therefore frees a
         slot at once, which is what the refusal tells the Owner to do. A link dropped here is refused by both
         doors (they need it present and live); its history stays in the COMPLIANCE rows. ⛔ The record never
         exceeds JOURNEY_LINKS_MAX, or the parser would read it MALFORMED — and MALFORMED is WITHDRAWN. */
      const endedAt = (l: JourneyPreviewLink) => (l.revokedAt ? Date.parse(l.revokedAt) : Date.parse(l.expiresAt));
      const ended = baseLinks.filter((l) => !linkIsLive(l, now)).sort((a, b) => endedAt(a) - endedAt(b));
      while (baseLinks.length >= JOURNEY_LINKS_MAX && ended.length > 0) {
        const drop = ended.shift()!;
        baseLinks.splice(baseLinks.indexOf(drop), 1);
      }
      if (baseLinks.length >= JOURNEY_LINKS_MAX) return { ok: false, error: COPY.tooManyLinks };
      let id = randomId(8);
      while (baseLinks.some((l) => l.id === id)) id = randomId(8);
      newLink = { id, label: act.label, issuedBy: actorId, issuedAt: nowIso, expiresAt: new Date(now + PREVIEW_LINK_TTL_MS).toISOString(), revokedAt: null, revokedBy: null };
      record = { cap: baseCap, links: [newLink, ...baseLinks], seq: currentSeq + 1, changedAt: nowIso, changedBy: actorId, reason };
    } else {
      const target = fresh.kind === "SET" ? fresh.links.find((l) => l.id === act.linkId) : undefined;
      if (!target) return { ok: false, error: COPY.noSuchLink, field: "link" };
      if (!linkIsLive(target, now)) return { changed: false, note: COPY.alreadyRevoked };
      newLink = { ...target, revokedAt: nowIso, revokedBy: actorId };
      const revoked = newLink;
      const kept = baseLinks.some((l) => l.id === revoked.id) ? baseLinks : [target, ...baseLinks];
      record = { cap: baseCap, links: kept.map((l) => (l.id === revoked.id ? revoked : l)), seq: currentSeq + 1, changedAt: nowIso, changedBy: actorId, reason };
    }
    progress.attemptSeq = record.seq;
    const attemptPayload: Record<string, unknown> = { op: act.op, reason, seq: record.seq, ceiling, from };
    if (act.op === "CAP") attemptPayload.to = act.to;
    if (newLink) attemptPayload.link = newLink.id;
    if (!(await recordRow(actorId, "journey.rollout.attempt", attemptPayload))) return { ok: false, error: COPY.attemptUnrecorded };
    progress.writesBegan = true;
    const written = await writeJourneySwitchVerified(record);
    if (!written.ok) {
      if (written.code === "UNCONFIRMED") return { unknown: true };
      return { ok: false, error: COPY.notStored };
    }
    const landed: Landed = { changed: true, from, stored: written.stored, seq: record.seq, link: newLink };
    progress.landed = landed;
    return landed;
  };

  let inLock: JourneyCeremonyResult | Landed | Unknown;
  try {
    inLock = await withLock(JOURNEY_SWITCH_LOCK, lockedAct);
  } catch (err) {
    if (progress.landed) inLock = progress.landed;
    else if (progress.writesBegan) inLock = { unknown: true };
    else throw err;
  }

  if ("ok" in inLock) return inLock;
  if ("unknown" in inLock) {
    await recordRow(actorId, auditAction, { op: act.op, reason, seq: progress.attemptSeq, ceiling, confirmed: false, outcome: "unknown" });
    return { ok: false, error: COPY.outcomeUnknown };
  }
  if (!inLock.changed) {
    const fresh = await readJourneySwitchFresh();
    return { ok: true, changed: false, state: composeSimpleJourney(ceiling, fresh), note: inLock.note, warn: false, recorded: true, link: null };
  }

  // (7) THE COMPLIANCE ROW — after the lock. The act has LANDED and been READ BACK by this line, so a failed
  // record is a WARNING beside a true outcome, never a failure.
  const stateAfter = composeSimpleJourney(ceiling, inLock.stored);
  const payload: Record<string, unknown> = { op: act.op, reason, seq: inLock.seq, ceiling, from: inLock.from, to: stateAfter, confirmed: true };
  if (act.op === "CAP") payload.cap = act.to;
  if (inLock.link) payload.link = { id: inLock.link.id, label: inLock.link.label, expiresAt: inLock.link.expiresAt };
  const recorded = await recordRow(actorId, auditAction, payload);

  const capNote = act.op === "CAP" && stateAfter !== act.to && act.to !== "ACTIVE" ? COPY.capBelowCeiling : null;
  const note = [capNote, recorded ? null : COPY.notRecorded].filter(Boolean).join(" ") || null;
  const link = act.op === "ISSUE_LINK" && inLock.link
    ? { id: inLock.link.id, url: previewLinkUrl(inLock.link), expiresAt: inLock.link.expiresAt }
    : null;
  return { ok: true, changed: true, state: stateAfter, note, warn: !recorded, recorded, link };
}

/** What the page asked for, understood — or which field was not. */
function parseAct(post: Record<string, unknown>): Parsed | { error: true; field?: "to" | "link" } {
  if (post.op === "CAP") return isRolloutState(post.to) ? { op: "CAP", to: post.to } : { error: true, field: "to" };
  if (post.op === "ISSUE_LINK") return { op: "ISSUE_LINK", label: cleanReason(post.label) };
  if (post.op === "REVOKE_LINK") {
    return typeof post.linkId === "string" && LINK_ID_RE.test(post.linkId) ? { op: "REVOKE_LINK", linkId: post.linkId } : { error: true, field: "link" };
  }
  return { error: true };
}

/** The URL the Owner sends: `/preview?t=…` on the public host. Null without a usable secret. */
export function previewLinkUrl(link: Pick<JourneyPreviewLink, "id" | "expiresAt">): string | null {
  const token = previewLinkToken(link);
  return token ? `${appUrl()}/preview?t=${token}` : null;
}

/** One COMPLIANCE row, and whether it is ON FILE. ⚠️ `audit()` never rejects — only `recorded` says so. */
async function recordRow(actorId: string, action: string, payload: Record<string, unknown>): Promise<boolean> {
  const row = await audit({ category: "COMPLIANCE", action, actorId, targetType: "JourneyRollout", targetId: JOURNEY_SWITCH_KEY, payload });
  if (row.recorded) return true;
  console.error(`[simple-journey] the ${action} row was not recorded (${row.unrecorded})${action.endsWith(".attempt") ? " — nothing was changed" : ""}`);
  return false;
}
