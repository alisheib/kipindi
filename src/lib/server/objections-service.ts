/**
 * OBJECTIONS (F11) — the player's formal route to dispute a market's verdict.
 *
 * This only means anything because settlement is gated. A market that has been
 * adjudicated (status RESOLVED/VOIDED) but not yet settled (settledAt === null)
 * still has its whole pool intact and every position OPEN. That is the window a
 * player objects in, and it is why an upheld objection can actually change the
 * money instead of chasing a clawback out of players' wallets.
 *
 * The rules that keep this honest:
 *   - Only a STAKEHOLDER may object. You need an actual position in the market —
 *     money at risk. This is the anti-spam mechanism (and the fairness one: a
 *     bystander has nothing to be aggrieved about).
 *   - One OPEN objection per player per market. A double-submit is idempotent,
 *     not a second case.
 *   - You may only object while the money is still there. Once a market has
 *     settled, this path is closed and the player is routed to support — because
 *     at that point an objection genuinely cannot undo the payout, and pretending
 *     otherwise would be the same lie the old "objection window" told.
 *   - An OPEN objection FREEZES settlement (settleMarket refuses), so an officer
 *     always gets to read it before the pool moves.
 *   - Every mutation is audited; the objector is shown to officers by
 *     displayLabel(), never by phone number.
 */
import { db, type StoredObjection, type ObjectionReason, type ObjectionRemedy } from "./store";
import { audit } from "./audit";
import { randomId } from "./crypto";
import { afterCommit, withLock } from "./locks";
import { getMarket, isFencedMaswali, listPositionsForMarket, MASWALI_FENCE_ERROR, type StoredMarket } from "./market-service";
import { roundStore, type VoidReason } from "./updown-dal";
import { getEffectiveConfig } from "./market-config";
import { notifyAdminObjectionFiled, notifyObjectionDecided } from "./notification-service";
// R9-D: every objection write below moves the rulings memo's generation once it has landed (reversals.ts).
import { noteObjectionWrite } from "./reversals";
import { MONEY_ROLES, type Role } from "./roles";
import type { ServiceResult } from "./auth-service";
import { secondOfficerChecksOn } from "./second-officer-policy";

/** The player's case, capped so a huge paste can't be used as a storage attack. Shared with the Millionea objection door
 *  (`maswali-objections.ts`, MR-16), which files through this service's reasons and bounds. */
export const DETAIL_MAX = 1000;
export const DETAIL_MIN = 10;

export const OBJECTION_REASONS: ObjectionReason[] = [
  "WRONG_OUTCOME",
  "SOURCE_CONTRADICTS",
  "AMBIGUOUS_CRITERION",
  "RESOLVED_EARLY",
  "OTHER",
];

/** ⛔ A Millionea objection (one question of a week, MR-16) is ruled on `/admin/maswali/integrity` — by an officer other than the
 *  question's sealer, re-grading the week (`maswali-objections.ts`; the rule: `docs/RULES.md` §2.12 "Objections"). These
 *  Yes/No rulings would rule the week's market. */
const MILLIONEA_RULED_ELSEWHERE = "This is a Millionea objection to one question: it is ruled on /admin/maswali/integrity, never here.";

/**
 * Ruling on an objection is a MONEY act — upholding VOIDs a market (refunding
 * stakes still held while keeping earlier cash-outs) or REVERSEs the verdict (paying the other side instead), and even
 * a rejection releases a settlement freeze so the pool pays out. So the role is
 * checked HERE, in the service, not only in the server action.
 *
 * This mirrors emergencyVoidMarket, which has always gated at the service layer
 * and audited the attempt: a route guard alone protects one door, while the
 * service guard protects the act. MODERATOR is deliberately excluded — the same
 * tier that may not emergency-void a market may not reverse one either.
 * ⭐ A Millionea question's ruling is the same act (`maswali-objections.ts`, MR-16) and asks this same gate.
 */
export async function requireRulingOfficer(officerId: string, action: string): Promise<boolean> {
  const u = await db.user.findById(officerId);
  if (u && MONEY_ROLES.has(u.role as Role)) return true;
  audit({
    category: "SECURITY",
    action: "privilege_escalation_blocked",
    actorId: officerId,
    targetType: "Action",
    targetId: action,
    payload: { role: u?.role ?? "unknown", required: "ADMIN or COMPLIANCE", note: "objection rulings move money" },
  });
  return false;
}

/** Objections that are currently freezing a market's money. */
export async function countOpenObjections(marketId: string): Promise<number> {
  return (await db.objection.listForMarket(marketId)).filter((o) => o.status === "OPEN").length;
}

export async function listObjectionsForUser(userId: string): Promise<StoredObjection[]> {
  return db.objection.listForUser(userId);
}

/** The officer queue: OPEN first (they hold money), then most recent. ⛔ A Millionea objection (one question of a week,
 *  MR-16) is not this queue's: it is ruled per question in `/admin/maswali` — its controls here would rule a week's market
 *  as a Yes/No verdict, so it is never listed here. */
export async function listObjections(filter?: { status?: StoredObjection["status"] }): Promise<StoredObjection[]> {
  const all = (await db.objection.list()).filter((o) => o.questionOrdinal == null);
  const rows = filter?.status ? all.filter((o) => o.status === filter.status) : all;
  return rows.sort((a, b) => {
    if (a.status === "OPEN" && b.status !== "OPEN") return -1;
    if (b.status === "OPEN" && a.status !== "OPEN") return 1;
    return b.createdAt.localeCompare(a.createdAt);
  });
}

/**
 * Can this player object to this market right now? Returns the reason they
 * cannot, so the UI can say something true instead of hiding the control.
 */
export async function objectionEligibility(
  userId: string,
  marketId: string,
): Promise<{ eligible: true; closesAt: string | null } | { eligible: false; why: "NOT_ADJUDICATED" | "ALREADY_SETTLED" | "WINDOW_CLOSED" | "NO_POSITION" | "HOUSE_STAKE_ONLY" | "ALREADY_OBJECTED" | "ALREADY_DECIDED" }> {
  const m = await getMarket(marketId);
  // ⛔ A Millionea week has no Yes/No verdict to dispute: its questions are objected to one by one (`maswali-objections.ts`).
  if (!m || isFencedMaswali(m) || (m.status !== "RESOLVED" && m.status !== "VOIDED")) return { eligible: false, why: "NOT_ADJUDICATED" };
  // The money is gone — an objection here could not change it, so we do not
  // offer one. Support is the honest route at that point.
  if (m.settledAt) return { eligible: false, why: "ALREADY_SETTLED" };
  if (m.objectionsClosedAt && Date.now() > Date.parse(m.objectionsClosedAt)) {
    return { eligible: false, why: "WINDOW_CLOSED" };
  }
  const minePositions = (await listPositionsForMarket(marketId)).filter((p) => p.userId === userId);
  if (minePositions.length === 0) return { eligible: false, why: "NO_POSITION" };
  // ⛔ SANCTIONED CHANGE (f)/(n) (house bots, PLAN §3, 04 A18): standing to object comes from the
  // player's OWN money. A house stake placed from their account gives none — otherwise the
  // holder could freeze a market's payout on the strength of a stake they did not choose. Own plus house
  // positions stay eligible; a player with no marker is untouched.
  // D19c, ruling 146: `HOUSE_STAKE_ONLY` never leaves the server — the page shows `NOT_ELIGIBLE` and the
  // filing path answers with its generic sentence.
  if (minePositions.every((p) => p.houseBotId != null)) return { eligible: false, why: "HOUSE_STAKE_ONLY" };

  // ONE objection per player per market — for the life of the market, not merely
  // one at a time.
  //
  // Checking only for an OPEN objection was a denial-of-payout hole: an objection
  // freezes the market's money, so a player could file, wait for the officer to
  // reject it, file again, and re-freeze — over and over for the whole window.
  // Every other player in that market goes unpaid the entire time, and each round
  // burns an officer ruling. You get one case per market. Make it count.
  const mine = (await db.objection.listForUser(userId)).filter((o) => o.marketId === marketId);
  const open = mine.find((o) => o.status === "OPEN");
  if (open) return { eligible: false, why: "ALREADY_OBJECTED" };
  const decided = mine.find((o) => o.status === "UPHELD" || o.status === "REJECTED");
  if (decided) return { eligible: false, why: "ALREADY_DECIDED" };

  return { eligible: true, closesAt: m.objectionsClosedAt };
}

/**
 * File an objection. Taken under the market lock so that a market cannot settle
 * between the eligibility check and the write — otherwise a player could file
 * against a market that is being paid out in the same instant, and the objection
 * would be born already-moot.
 */
export async function fileObjection(
  userId: string,
  input: { marketId: string; reason: ObjectionReason; detail: string },
): Promise<ServiceResult<{ objectionId: string }>> {
  const detail = (input.detail ?? "").trim().slice(0, DETAIL_MAX);
  if (detail.length < DETAIL_MIN) {
    return { ok: false, error: `Tell us what is wrong — at least ${DETAIL_MIN} characters.`, code: "INVALID" };
  }
  if (!OBJECTION_REASONS.includes(input.reason)) {
    return { ok: false, error: "Pick a reason for the objection.", code: "INVALID" };
  }

  return withLock(`market:${input.marketId}`, async (): Promise<ServiceResult<{ objectionId: string }>> => {
    const elig = await objectionEligibility(userId, input.marketId);
    if (!elig.eligible) {
      const msg: Record<string, string> = {
        NOT_ADJUDICATED: "This market has not been resolved yet.",
        ALREADY_SETTLED: "This market has already paid out — contact support.",
        WINDOW_CLOSED: "The objection window for this market has closed.",
        NO_POSITION: "Only a player who staked on this market can object to its result.",
        ALREADY_OBJECTED: "You already have an objection open on this market.",
        ALREADY_DECIDED: "Your objection on this market has already been reviewed. Contact support if you still disagree.",
      };
      return { ok: false, error: msg[elig.why] ?? "You cannot object to this market.", code: "INVALID" };
    }

    const m = (await getMarket(input.marketId)) as StoredMarket;
    const now = new Date().toISOString();
    const objection: StoredObjection = {
      id: `obj_${randomId(12)}`,
      marketId: input.marketId,
      userId,
      reason: input.reason,
      detail,
      status: "OPEN",
      createdAt: now,
      reviewedBy: null,
      reviewedAt: null,
      reviewNote: null,
      remedy: null,
      outcomeAtFiling: m.resolvedOutcome,
    };
    await db.objection.create(objection);
    noteObjectionWrite();

    audit({
      category: "COMPLIANCE",
      action: "objection.filed",
      actorId: userId,
      targetType: "Market",
      targetId: input.marketId,
      payload: {
        objectionId: objection.id,
        reason: input.reason,
        outcomeAtFiling: m.resolvedOutcome,
        objectionsClosedAt: m.objectionsClosedAt,
        effect: "settlement frozen until an officer rules",
      },
    });

    // Officers must know the pool is frozen — best-effort, never blocks the filing.
    notifyAdminObjectionFiled(objection.id, m.titleEn).catch(() => {});

    return { ok: true, data: { objectionId: objection.id } };
  });
}

/**
 * An emergency void kills a market outright and refunds stakes still held. It is the
 * ops kill-switch, so it deliberately does NOT wait for objections — but that
 * leaves any OPEN objection stranded on a market that has now settled: stuck in
 * the officer queue as un-actionable, inflating the frozen-money KPI, and leaving
 * the player who filed it with no answer.
 *
 * A void IS the VOID remedy — held stakes came back in full, while earlier cash-outs
 * keep their paid amount — which is exactly what
 * upholding with VOID does. So we close them out as UPHELD/VOID and tell the
 * objector, rather than letting them rot. Called from emergencyVoidMarket AFTER
 * the officer's role has already been checked there.
 */
export async function closeObjectionsForVoidedMarket(
  marketId: string,
  officerId: string,
  reason: string,
  deferNoticeUntilRefundsFinish?: (notice: () => void) => void,
): Promise<number> {
  // emergencyVoidMarket calls this while it holds this exact lock. Re-entry
  // joins the same PostgreSQL transaction; direct callers acquire the lock too.
  // The old DAL calls used pc() on another connection, so a later failure could
  // roll the refunds back while leaving these cases UPHELD and players notified.
  return withLock(`market:${marketId}`, async (tx) => {
    const { marketStore } = await import("./market-dal");
    const market = await marketStore.get(marketId, tx);
    if (!market || market.status !== "VOIDED" || market.resolvedOutcome !== "VOID" || !market.settledAt) {
      throw new Error("cannot close objections before the emergency VOID is recorded");
    }
    const open = tx
      ? await tx.objection.findMany({ where: { marketId, status: "OPEN" }, orderBy: { createdAt: "desc" } })
      : (await db.objection.listForMarket(marketId)).filter((o) => o.status === "OPEN");
    const now = new Date().toISOString();
    const reviewNote = `Market emergency-voided; held stakes refunded in full, earlier cash-outs kept their paid amount. Reason: ${reason}`.slice(0, 1000);
    const changedMemory: StoredObjection[] = [];
    const notices: Array<() => void> = [];
    try { for (const o of open) {
      if (tx) {
        await tx.objection.update({
          where: { id: o.id },
          data: { status: "UPHELD", remedy: "VOID", reviewedBy: officerId, reviewedAt: new Date(now), reviewNote },
        });
      } else {
        const written = await db.objection.update(o.id, {
          status: "UPHELD", remedy: "VOID", reviewedBy: officerId, reviewedAt: now, reviewNote,
        });
        if (!written) throw new Error("OPEN objection disappeared during emergency VOID closure");
        changedMemory.push(o as StoredObjection);
      }
      notices.push(() => {
        audit({
          category: "COMPLIANCE", action: "objection.closed_by_void", actorId: officerId,
          targetType: "Market", targetId: marketId,
          payload: { objectionId: o.id, objectorId: o.userId, reason,
            effect: "market voided; held stakes refunded and earlier cash-outs kept their paid amount — the objection is answered by the void" },
        });
        void notifyObjectionDecided(o.userId, { upheld: true, marketId,
          note: `The market was voided. Stakes still held were refunded; earlier cash-outs kept their paid amount. ${reason}` }).catch(() => {});
      });
    } } catch (error) {
      // The in-memory twin has no database rollback. At least make this helper
      // all-or-none: undo any objection rows changed before a later write fault,
      // and send none of their notices. The broader emergency money path remains
      // non-transactional in memory; PostgreSQL rolls the whole market back.
      if (!tx) {
        const rollbackErrors: unknown[] = [];
        for (const prior of changedMemory.reverse()) {
          try {
            await db.objection.update(prior.id, {
              status: prior.status, remedy: prior.remedy, reviewedBy: prior.reviewedBy,
              reviewedAt: prior.reviewedAt, reviewNote: prior.reviewNote,
            });
          } catch (rollbackError) { rollbackErrors.push(rollbackError); }
        }
        // A reader may have cached the temporary UPHELD row before the memory
        // rollback. Invalidate that snapshot even when a restore itself failed.
        noteObjectionWrite();
        if (rollbackErrors.length) throw new AggregateError([error, ...rollbackErrors], "emergency objection closure and memory rollback failed");
      }
      throw error;
    }
    afterCommit(tx, () => noteObjectionWrite());
    for (const notice of notices) afterCommit(tx, () => {
      if (deferNoticeUntilRefundsFinish) deferNoticeUntilRefundsFinish(notice);
      else notice();
    });
    return open.length;
  });
}

/**
 * ⭐ THE OFFICER HOLD — freeze one market's payout without holding a stake.
 *
 * 🔴 WHY IT DID NOT EXIST, AND WHY IT HAD TO (management ruling ②, 2026-09-05). The
 * management specification says settlement locks in "unless an official dispute is raised by
 * an authorized admin". No such mechanism was here. The ONLY thing that freezes `settleMarket`
 * is an OPEN objection row, and `fileObjection` routes every filer through
 * `objectionEligibility`, which refuses `NO_POSITION` — so an officer who could see a verdict
 * was wrong, but held no stake in it, could not stop the payout. Their only instrument was
 * `emergencyVoidMarket`: refund the entire market, right or wrong. A tool that can only do the
 * largest possible thing is a tool nobody reaches for in the sixty minutes that matter.
 *
 * ⭐ IT REUSES THE FREEZE RATHER THAN INVENTING ONE. This writes exactly the row
 * `countOpenObjections` already counts and `settleMarket` already refuses on, so there is ONE
 * settlement freeze on this platform with one definition — not a second `settlementHeldBy`
 * column that the money path would have to learn about. No schema change, and every existing
 * proof of the freeze covers this too.
 *
 * ⭐ SEPARATION OF DUTIES ON THE RULING PATHS COMES FREE, AND THAT IS THE REASON FOR THIS SHAPE.
 * The row's `userId` is the OFFICER who raised it, and both rulings already refuse when
 * `o.userId === officerId` ("You cannot rule on your own objection"). So the officer who freezes
 * a market cannot REJECT their own hold (letting the recorded verdict pay) nor UPHOLD it (paying
 * the other side) — a second officer must. That property is inherited, not re-implemented, which
 * is why it cannot drift away from the player path's version of it.
 * ⭐ FEE-TAX R1 · …WHILE THE OWNER'S "SECOND-OFFICER CHECKS" ARE ON (ruling 6 of 2026-10-24, `second-officer-policy.ts`;
 * a stored ON, or a read that fails — nothing stored is the Owner's OFF). While they are OFF the officer who placed a hold
 * may rule on it like any officer — unless
 * they hold money in the market, which makes it a case on their OWN stake, refused whatever the setting says
 * (`officerOwnCaseBarred`, below; ruling 6b keeps an officer's checks on their own account).
 *
 * ⛔ AND HERE IS THE LIMIT OF THAT SENTENCE, BECAUSE THE FIRST VERSION OF THIS COMMENT OVERCLAIMED
 * IT AND THE CLAIM WAS WRITTEN INTO A PRODUCTION AUDIT ROW. It said the filer "structurally cannot
 * be the one who releases it". There is a third writer of objection status and it has NO
 * self-review check: `closeObjectionsForVoidedMarket` (below) closes EVERY open objection on a
 * market — the caller's own hold included — and its only caller is `emergencyVoidMarket`, whose
 * role gate is the SAME `["ADMIN","COMPLIANCE"]` set that may file a hold, and whose officer-
 * conflict block was deliberately removed (owner decision 2026-07-24).
 *
 * ⚠️ SO THE HONEST STATEMENT IS NARROWER, AND IT IS STILL THE PROPERTY WORTH HAVING: a lone
 * officer cannot turn their own hold into a PAYOUT while second-officer checks are ON. Both directions
 * that move money to a player — reject (pay the recorded verdict) and uphold/REVERSE (pay the other
 * side) — then require a second officer (OFF, the Owner has ruled that one officer may; the audit
 * row's `effect` says both). What one officer can still do alone is VOID the market, which refunds held stakes at
 * zero fee and answers their own case by destroying it. That is the pre-existing kill switch, not
 * a hole this feature opened, and it is deliberately NOT closed here: leaving an objection OPEN
 * on a market that has been voided and fully refunded would strand the row and the market, which
 * is worse than the thing it would be protecting against.
 *
 * ⛔ Do not "restore" the stronger wording. It was refuted by reading the code, and the audit
 * payload below says the narrower true thing on purpose.
 *
 * ⛔ TWO DELIBERATE DIFFERENCES FROM A PLAYER OBJECTION, both widening:
 *   1. NO STAKE REQUIRED — the whole point.
 *   2. NO WINDOW CHECK. A player may not object after `objectionsClosedAt`, because by then
 *      the money is about to move and a late case cannot be honoured fairly. An officer may
 *      hold right up to the instant the money actually moves: the settle timer can lag behind
 *      its deadline (a back-off, a boot grace, a queued burst), and in that gap an officer who
 *      spots a wrong verdict must be able to stop it. `settledAt` is still an absolute wall —
 *      once money has moved, a freeze would be theatre.
 *
 * ⚠️ It is NOT idempotent by design: a second hold by a DIFFERENT officer on the same market is
 * a second, independent case, and both must be ruled on before the pool moves. A repeat by the
 * SAME officer is refused, so a double-click cannot manufacture two.
 */
export async function holdSettlementAsOfficer(
  officerId: string,
  input: { marketId: string; reason: ObjectionReason; detail: string },
): Promise<ServiceResult<{ objectionId: string }>> {
  const detail = (input.detail ?? "").trim().slice(0, DETAIL_MAX);
  if (detail.length < DETAIL_MIN) {
    return { ok: false, error: `Record why this payout is being held — at least ${DETAIL_MIN} characters.`, code: "INVALID" };
  }
  if (!OBJECTION_REASONS.includes(input.reason)) {
    return { ok: false, error: "Pick a reason for the hold.", code: "INVALID" };
  }
  if (!(await requireRulingOfficer(officerId, "objection.officer_hold"))) {
    return { ok: false, error: "Forbidden: ADMIN or COMPLIANCE role required to hold a settlement.", code: "INVALID" };
  }

  // Under the market lock for the same reason `fileObjection` is: without it a hold could be
  // written against a market that is being paid out in the same instant, and be born moot.
  return withLock(`market:${input.marketId}`, async (): Promise<ServiceResult<{ objectionId: string }>> => {
    const m = await getMarket(input.marketId);
    if (!m) return { ok: false, error: "Market not found.", code: "NOT_FOUND" };
    // ⛔ The action refuses a Millionea week (`test:maswali-fence` 5.4); the act refuses it too, whoever calls it.
    if (isFencedMaswali(m)) return { ok: false, error: MASWALI_FENCE_ERROR, code: "INVALID" };
    if (m.status !== "RESOLVED" && m.status !== "VOIDED") {
      return { ok: false, error: "Only a market with a recorded verdict can have its payout held.", code: "INVALID" };
    }
    if (m.settledAt) {
      return { ok: false, error: "This market has already paid out — a hold cannot recall money. Use the reversal path.", code: "INVALID" };
    }
    const mine = (await db.objection.listForUser(officerId)).filter(
      (o) => o.marketId === input.marketId && o.status === "OPEN",
    );
    if (mine.length > 0) {
      return { ok: false, error: "You already have a hold open on this market.", code: "INVALID" };
    }

    const now = new Date().toISOString();
    const objection: StoredObjection = {
      id: `obj_${randomId(12)}`,
      marketId: input.marketId,
      userId: officerId,
      reason: input.reason,
      detail,
      status: "OPEN",
      createdAt: now,
      reviewedBy: null,
      reviewedAt: null,
      reviewNote: null,
      remedy: null,
      outcomeAtFiling: m.resolvedOutcome,
    };
    await db.objection.create(objection);
    noteObjectionWrite();

    audit({
      category: "COMPLIANCE",
      action: "objection.officer_hold",
      actorId: officerId,
      targetType: "Market",
      targetId: input.marketId,
      payload: {
        objectionId: objection.id,
        reason: input.reason,
        outcomeAtFiling: m.resolvedOutcome,
        objectionsClosedAt: m.objectionsClosedAt,
        pastWindow: !!m.objectionsClosedAt && Date.now() > Date.parse(m.objectionsClosedAt),
        // ⛔ NARROWED 2026-09-05, AND THE OLD WORDING WAS A FALSE STATEMENT ON A REGULATOR-FACING
        // TRAIL. It read "…the filer cannot release their own hold", which is true of both RULING
        // paths and false of `emergencyVoidMarket`, where the same officer can close their own
        // case by voiding the market. An audit row is the one place a claim must be exactly as
        // strong as the code — see the note on the function above.
        // ⭐ FEE-TAX R1 · and as strong as the code AT RULING TIME, whatever the Owner's setting reads now: the rule this
        // sentence names is read when the hold is ruled on, not when it is placed.
        effect:
          "settlement frozen: no winner is paid until an objection ruling. While the Owner's second-officer checks are ON, " +
          "both paying outcomes (reject → the recorded verdict pays; uphold → the other side pays) require a DIFFERENT " +
          "officer, because a filer cannot rule on their own case; while they are OFF the officer who placed this hold may " +
          "rule on it too, unless they hold money in this market. A void, which refunds held " +
          "stakes while preserving earlier cash-outs, remains available to a single ADMIN/COMPLIANCE officer and would close this hold.",
      },
    });

    // Every other officer needs to know the pool is frozen and why — the same fan-out a
    // player objection triggers, so one queue shows both kinds of case.
    notifyAdminObjectionFiled(objection.id, m.titleEn).catch(() => {});

    return { ok: true, data: { objectionId: objection.id } };
  });
}

/**
 * ⭐ FEE-TAX R1 · MAY THE OFFICER WHO FILED THIS CASE RULE ON IT? Asked by both rulings only when the case is the ruling
 * officer's own (`o.userId === officerId`); true means refuse, exactly as before R1.
 *   · while the Owner's "Second-officer checks" are ON (a stored ON, or a read that fails; `second-officer-policy.ts`): always —
 *     the filer of a case never rules on it;
 *   · while they are OFF: only when the officer holds money in the market — then it is a case on their OWN stake (a
 *     player's objection, which only a stakeholder can file, or a hold beside a stake of their own), and a check on an
 *     officer's own account stays whatever the setting says (ruling 6b). An officer's hold on a market they hold no money
 *     in is the case the ruling releases: they rule on it as any officer does.
 * ⛔ Fails closed: a position read that fails is a refusal, never "no stake".
 */
async function officerOwnCaseBarred(marketId: string, officerId: string): Promise<boolean> {
  if (await secondOfficerChecksOn()) return true;
  try {
    return (await listPositionsForMarket(marketId)).some((p) => p.userId === officerId);
  } catch {
    return true;
  }
}

/**
 * REJECT — the officer has read the case and the verdict stands. This releases
 * the freeze; the market settles on the next sweep (if its window has elapsed).
 * A reason is mandatory: "we looked and you're wrong" must be on the record.
 */
export async function rejectObjection(
  objectionId: string,
  officerId: string,
  note: string,
): Promise<ServiceResult<void>> {
  const reviewNote = (note ?? "").trim().slice(0, 1000);
  if (reviewNote.length < 5) {
    return { ok: false, error: "Record why the objection is rejected (5+ characters).", code: "INVALID" };
  }
  if (!(await requireRulingOfficer(officerId, "objection.reject"))) {
    return { ok: false, error: "Forbidden: ADMIN or COMPLIANCE role required to rule on an objection.", code: "INVALID" };
  }
  const o = await db.objection.findById(objectionId);
  if (!o) return { ok: false, error: "Objection not found.", code: "NOT_FOUND" };
  if (o.questionOrdinal != null) return { ok: false, error: MILLIONEA_RULED_ELSEWHERE, code: "INVALID" };
  if (o.status !== "OPEN") return { ok: false, error: "This objection has already been decided.", code: "INVALID" };
  // Separation of duties — an officer cannot rule on their own objection.
  // (FEE-TAX R1 · an officer's own payout hold only while the Owner's second-officer checks are ON — `officerOwnCaseBarred`.)
  if (o.userId === officerId && (await officerOwnCaseBarred(o.marketId, officerId))) {
    audit({
      category: "COMPLIANCE",
      action: "objection.self_review_blocked",
      actorId: officerId,
      targetType: "Objection",
      targetId: objectionId,
      payload: { marketId: o.marketId },
    });
    return { ok: false, error: "You cannot rule on your own objection.", code: "CONFLICT" };
  }

  // A rejection and an uphold for the SAME OPEN case must serialize. Previously
  // reject wrote outside the market lock, so two officers could both pass the
  // OPEN pre-check and each announce a different final ruling. PostgreSQL's
  // conditional update runs inside the same transaction as the market lock.
  const rejected = await withLock(`market:${o.marketId}`, async (tx) => {
    const live = tx
      ? await tx.objection.findUnique({ where: { id: objectionId } })
      : await db.objection.findById(objectionId);
    if (!live || live.status !== "OPEN") return false;
    if (tx) {
      await tx.objection.update({
        where: { id: objectionId },
        data: { status: "REJECTED", reviewedBy: officerId, reviewedAt: new Date(), reviewNote },
      });
    } else {
      await db.objection.update(objectionId, {
        status: "REJECTED", reviewedBy: officerId,
        reviewedAt: new Date().toISOString(), reviewNote,
      });
    }
    return true;
  });
  if (!rejected) return { ok: false, error: "This objection has already been decided.", code: "INVALID" };
  noteObjectionWrite();
  audit({
    category: "COMPLIANCE",
    action: "objection.rejected",
    actorId: officerId,
    targetType: "Market",
    targetId: o.marketId,
    payload: { objectionId, objectorId: o.userId, reason: o.reason, note: reviewNote, effect: "verdict stands; settlement released" },
  });
  notifyObjectionDecided(o.userId, { upheld: false, marketId: o.marketId, note: reviewNote }).catch(() => {});

  // 🔴 RE-ARM THE SETTLE TIMER — THE REJECT PATH NEVER DID, AND THE UPHOLD PATH ALWAYS HAS.
  //
  // Rejecting releases the freeze, but it does not move `objectionsClosedAt`, so this looked
  // like a case that needed no timer work. It is not. The armed timer already FIRED at the
  // window and was refused with OBJECTION_OPEN, which re-arms it on the 5-minute back-off
  // (`SETTLE_RETRY_MS`). So after a rejection the market waits out the remainder of that
  // back-off instead of paying at once — and the reconciler cannot help, because it skips any
  // market that already has a live timer.
  //
  // ⛔ At a 24-hour window a few minutes was noise. At ONE HOUR it is a material share of the
  // whole window, on a payout an officer has just explicitly released. One call, mirroring
  // exactly what the uphold path does and for the same reason.
  //
  // ⚠️ Fire-and-forget and outside nothing (this path holds no lock): the ruling is already
  // written and audited, and a scheduler hiccup must not fail it.
  {
    const { armMarket } = await import("./market-scheduler");
    void armMarket(o.marketId).catch(() => {});
  }
  return { ok: true };
}

/**
 * UPHOLD — the player was right. Because the market has not settled, the pool is
 * still whole and we can genuinely fix the outcome:
 *
 *   VOID    → no side wins; refund stakes still held in full (0% fee), preserving earlier cash-outs.
 *   REVERSE → the other side actually won; flip the verdict.
 *
 * A REVERSE re-opens the objection window: the verdict changed, so the players it
 * now goes against deserve the same right to object that the original side had.
 * A VOID does not — held stakes get a full refund, so it settles on the
 * next sweep.
 *
 * Both remedies are only reachable while settledAt is null. If the market somehow
 * settled underneath us, we refuse rather than attempt a clawback.
 */
export async function upholdObjection(
  objectionId: string,
  officerId: string,
  input: { remedy: Exclude<ObjectionRemedy, "REINSTATE">; note: string },
): Promise<ServiceResult<{ newOutcome: string }>> {
  const reviewNote = (input.note ?? "").trim().slice(0, 1000);
  if (reviewNote.length < 5) {
    return { ok: false, error: "Record why the objection is upheld (5+ characters).", code: "INVALID" };
  }
  // A Yes/No market's verdict is voided or reversed — nothing else, whatever a form posts (REINSTATE is a Millionea
  // question's remedy alone; anything unread here was flipped as a REVERSE).
  if (input.remedy !== "VOID" && input.remedy !== "REVERSE") {
    return { ok: false, error: "Choose VOID or REVERSE.", code: "INVALID" };
  }
  if (!(await requireRulingOfficer(officerId, "objection.uphold"))) {
    return { ok: false, error: "Forbidden: ADMIN or COMPLIANCE role required to rule on an objection.", code: "INVALID" };
  }
  const o = await db.objection.findById(objectionId);
  if (!o) return { ok: false, error: "Objection not found.", code: "NOT_FOUND" };
  if (o.questionOrdinal != null) return { ok: false, error: MILLIONEA_RULED_ELSEWHERE, code: "INVALID" };
  if (o.status !== "OPEN") return { ok: false, error: "This objection has already been decided.", code: "INVALID" };
  // The filer never rules on their own case (FEE-TAX R1 · an officer's own payout hold only while the Owner's
  // second-officer checks are ON — `officerOwnCaseBarred`).
  if (o.userId === officerId && (await officerOwnCaseBarred(o.marketId, officerId))) {
    audit({
      category: "COMPLIANCE",
      action: "objection.self_review_blocked",
      actorId: officerId,
      targetType: "Objection",
      targetId: objectionId,
      payload: { marketId: o.marketId },
    });
    return { ok: false, error: "You cannot rule on your own objection.", code: "CONFLICT" };
  }

  const ruling = await withLock(`market:${o.marketId}`, async (tx): Promise<ServiceResult<{ newOutcome: string }>> => {
    // Re-read under the lock — this is a money decision.
    const { marketStore } = await import("./market-dal");
    const liveObjection = tx
      ? await tx.objection.findUnique({ where: { id: objectionId } })
      : await db.objection.findById(objectionId);
    if (!liveObjection || liveObjection.status !== "OPEN") {
      return { ok: false, error: "This objection has already been decided.", code: "INVALID" };
    }
    const m = await marketStore.get(o.marketId, tx);
    if (!m) return { ok: false, error: "Market not found.", code: "NOT_FOUND" };
    if (m.settledAt) {
      // Should be impossible (an OPEN objection freezes settlement), but if it
      // ever happens we refuse loudly rather than invent a clawback.
      audit({
        category: "COMPLIANCE",
        action: "objection.uphold_too_late",
        actorId: officerId,
        targetType: "Market",
        targetId: m.id,
        payload: { objectionId, settledAt: m.settledAt },
      });
      return { ok: false, error: "This market has already settled — its money has moved.", code: "INVALID" };
    }
    if (input.remedy === "REVERSE" && (m.resolvedOutcome !== "YES" && m.resolvedOutcome !== "NO")) {
      return { ok: false, error: "Only a YES/NO verdict can be reversed. Use VOID.", code: "INVALID" };
    }

    // Up & Down keeps the price observation on its round, while the PredictionMarket
    // carries the money verdict. Validate the linked row BEFORE any write. On PostgreSQL
    // the three writes below share this lock's transaction, so a failed round update
    // cannot leave a changed money verdict with an old player-facing round result.
    const round = m.productLine === "UPDOWN"
      ? tx
        ? await tx.upDownRound.findUnique({ where: { marketId: m.id } })
        : await roundStore.getByMarketId(m.id)
      : null;
    if (m.productLine === "UPDOWN" && !round) {
      return { ok: false, error: "The Up & Down round linked to this market is missing.", code: "NOT_FOUND" };
    }

    const previousOutcome = m.resolvedOutcome;
    const now = new Date().toISOString();
    const newOutcome = input.remedy === "VOID" ? "VOID" : previousOutcome === "YES" ? "NO" : "YES";
    const objectionsClosedAt = input.remedy === "VOID"
      ? new Date(Date.now() - 1000).toISOString()
      : new Date(Date.now() + Math.max(0, (await getEffectiveConfig(m.id)).objectionWindowHours) * 3600_000).toISOString();
    const correction = m.productLine === "UPDOWN" && previousOutcome !== newOutcome;
    const priorEvidence = m.resolutionEvidence ?? "";
    // A second successful objection must describe the LATEST official verdict,
    // while retaining the original source record only once. Audit rows preserve
    // each intervening ruling; nesting correction prose here would mislabel an
    // earlier officer ruling as a read and bury the original price evidence.
    const originalEvidence = priorEvidence.startsWith("UPDOWN_OFFICER_CORRECTION:")
      ? priorEvidence.split("Prior resolution record: ").at(-1) ?? ""
      : priorEvidence;
    const resolutionEvidence = correction
      ? (`UPDOWN_OFFICER_CORRECTION: Official verdict changed from ${previousOutcome ?? "unrecorded"} to ${newOutcome} after an upheld objection. ` +
          `The recorded open and close prices and targets remain unchanged. Prior resolution record: ${originalEvidence}`)
      : m.resolutionEvidence;

    // A VOID needs no fresh objection window; the still-held stakes are due back
    // when settlement commits. A REVERSE gives the newly losing side a fresh window.
    try {
    await marketStore.stamp(m.id, {
      resolvedOutcome: newOutcome,
      status: newOutcome === "VOID" ? "VOIDED" : "RESOLVED",
      objectionsClosedAt,
      resolutionEvidence,
      updatedAt: now,
    }, tx);

    if (round) {
      const roundOutcome = newOutcome === "YES" ? "UP" : newOutcome === "NO" ? "DOWN" : "VOID";
      const priorReason = round.voidReason;
      const validPriorReason: VoidReason | null = priorReason === "no-move" || priorReason === "source-failed" ||
        priorReason === "source-mismatch" || priorReason === "operator" ? priorReason : null;
      const voidReason: VoidReason | null = roundOutcome === "VOID"
        ? previousOutcome === "VOID" ? validPriorReason : "operator"
        : null;
      // Preserve immutable source observations, prices and frozen targets. The
      // officer's ruling changes the payable verdict, not what the feed recorded.
      if (tx) {
        await tx.upDownRound.update({
          where: { id: round.id }, data: { outcome: roundOutcome, voidReason },
        });
      } else {
        await roundStore.patch(round.id, { outcome: roundOutcome, voidReason });
      }
    }

    if (tx) {
      await tx.objection.update({
        where: { id: objectionId },
        data: { status: "UPHELD", reviewedBy: officerId, reviewedAt: new Date(now), reviewNote, remedy: input.remedy },
      });
    } else {
      const written = await db.objection.update(objectionId, {
        status: "UPHELD", reviewedBy: officerId, reviewedAt: now, reviewNote, remedy: input.remedy,
      });
      if (!written) throw new Error("OPEN objection disappeared before its ruling could be recorded");
    }
    } catch (error) {
      // Production's explicit `tx` rolls all three rows back. The local memory
      // twin has no transaction; restore its prior snapshots too, so a fault in
      // the round or objection write never leaves an OPEN case with a flipped
      // market that a retry would flip back a second time.
      if (!tx) {
        const rollbackErrors: unknown[] = [];
        if (round) {
          try {
            await roundStore.patch(round.id, {
              outcome: round.outcome as "UP" | "DOWN" | "VOID" | null,
              voidReason: round.voidReason as VoidReason | null,
            });
          } catch (rollbackError) { rollbackErrors.push(rollbackError); }
        }
        try {
          await marketStore.stamp(m.id, {
            resolvedOutcome: m.resolvedOutcome, status: m.status,
            objectionsClosedAt: m.objectionsClosedAt,
            resolutionEvidence: m.resolutionEvidence, updatedAt: m.updatedAt,
          });
        } catch (rollbackError) { rollbackErrors.push(rollbackError); }
        try {
          const after = await db.objection.findById(objectionId);
          if (after?.status === "UPHELD") await db.objection.update(objectionId, {
            status: liveObjection.status, reviewedBy: liveObjection.reviewedBy,
            // This branch has no Prisma transaction, so the row came from the
            // memory DAL and its timestamp is already an ISO string or null.
            reviewedAt: (liveObjection as StoredObjection).reviewedAt,
            reviewNote: liveObjection.reviewNote, remedy: (liveObjection as StoredObjection).remedy,
          });
        } catch (rollbackError) { rollbackErrors.push(rollbackError); }
        // The failed ruling could have been observed between its memory write
        // and this restore; the rulings memo must not keep that temporary row.
        noteObjectionWrite();
        if (rollbackErrors.length) throw new AggregateError([error, ...rollbackErrors], "officer ruling and memory rollback failed");
      }
      throw error;
    }

    afterCommit(tx, () => {
      noteObjectionWrite();
      audit({
        category: "COMPLIANCE", action: "objection.upheld", actorId: officerId,
        targetType: "Market", targetId: m.id,
        payload: {
          objectionId, objectorId: o.userId, reason: o.reason, remedy: input.remedy,
          previousOutcome, newOutcome, roundId: round?.id ?? null,
          note: reviewNote, objectionsClosedAt,
          note2: "held positions had not settled; earlier cash-outs retain their paid amounts",
        },
      });
      void notifyObjectionDecided(o.userId, { upheld: true, marketId: m.id, note: reviewNote }).catch(() => {});
    });

    return { ok: true, data: { newOutcome } };
  });

  // 🔴 RE-ARM THE SETTLE TIMER — MOVING `objectionsClosedAt` IS NOT ENOUGH.
  //
  // Upholding an objection rewrites the settlement deadline in BOTH directions: a VOID
  // remedy backdates it to a second ago so refunds go out immediately, and a flipped
  // verdict opens a fresh window. But the market already HAS an armed timer — it is
  // RESOLVED/VOIDED with settledAt null, which is exactly the shape `nextDeadlineFor`
  // arms a "settle" deadline for — and that timer is still pointing at the OLD instant.
  //
  // ⛔ The reconciler cannot rescue it. `reconcileMarketSchedules` exists to arm markets
  // that have NO live timer and skips anything already armed (`if (timers.has(m.id))
  // continue`), so it walks straight past a timer aimed at the wrong time.
  //
  // The comment on the VOID branch said "settle on the next sweep". There is no sweep
  // that would: the refund waited for the ORIGINAL objection window — up to a full 24
  // hours after an officer ruled the market void — while the settlement page told the
  // operator the reconciler would pick it up.
  //
  // ⚠️ Outside the lock, so the row is committed before the scheduler re-reads it —
  // `armMarket` fetches fresh state and would otherwise arm against the pre-write row.
  // Fire-and-forget, like every other arm site: a scheduler hiccup must not fail a
  // ruling that has already been recorded and audited.
  if (ruling.ok) {
    const { armMarket } = await import("./market-scheduler");
    void armMarket(o.marketId).catch(() => {});
    // ⭐ AND ON A REVERSE, TELL EVERY BETTOR AGAIN (management ruling ①, 2026-09-05).
    //
    // 🔴 A REVERSE IS THE ONE SEAL NOBODY WAS EVER TOLD ABOUT. It flips the verdict and
    // re-opens a FRESH objection window — deliberately, because the players it now goes
    // against deserve the same right the original side had. But the only message it sent was
    // `notifyObjectionDecided` to the OBJECTOR, and it does not even emit `market:resolve`,
    // so an open page did not refresh either. The side that just lost learned nothing, and
    // with a one-hour window their new right to object would expire unexercised.
    //
    // `reversed: true` so the notice reads "Result corrected", not "Result recorded" — a
    // player who already had the first notice must be able to tell the second one apart.
    // ⚠️ A VOID remedy backdates the deadline to a second ago so refunds go out immediately;
    // there is no window left to announce, and the refund receipt is the honest message.
    if (input.remedy === "REVERSE") {
      const { notifyVerdictRecordedForMarket } = await import("./market-service");
      void notifyVerdictRecordedForMarket(o.marketId, { reversed: true }).catch(() => {});
    }
  }
  return ruling;
}
