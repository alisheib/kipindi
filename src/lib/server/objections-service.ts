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
import { withLock } from "./locks";
import { getMarket, listPositionsForMarket, type StoredMarket } from "./market-service";
import { getEffectiveConfig } from "./market-config";
import { notifyAdminObjectionFiled, notifyObjectionDecided } from "./notification-service";
import { MONEY_ROLES, type Role } from "./roles";
import type { ServiceResult } from "./auth-service";

/** The player's case, capped so a huge paste can't be used as a storage attack. */
export const DETAIL_MAX = 1000;
const DETAIL_MIN = 10;

export const OBJECTION_REASONS: ObjectionReason[] = [
  "WRONG_OUTCOME",
  "SOURCE_CONTRADICTS",
  "AMBIGUOUS_CRITERION",
  "RESOLVED_EARLY",
  "OTHER",
];

/**
 * Ruling on an objection is a MONEY act — upholding VOIDs a market (refunding
 * every stake) or REVERSEs the verdict (paying the other side instead), and even
 * a rejection releases a settlement freeze so the pool pays out. So the role is
 * checked HERE, in the service, not only in the server action.
 *
 * This mirrors emergencyVoidMarket, which has always gated at the service layer
 * and audited the attempt: a route guard alone protects one door, while the
 * service guard protects the act. MODERATOR is deliberately excluded — the same
 * tier that may not emergency-void a market may not reverse one either.
 */
async function requireRulingOfficer(officerId: string, action: string): Promise<boolean> {
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

/** The officer queue: OPEN first (they hold money), then most recent. */
export async function listObjections(filter?: { status?: StoredObjection["status"] }): Promise<StoredObjection[]> {
  const all = await db.objection.list();
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
): Promise<{ eligible: true; closesAt: string | null } | { eligible: false; why: "NOT_ADJUDICATED" | "ALREADY_SETTLED" | "WINDOW_CLOSED" | "NO_POSITION" | "ALREADY_OBJECTED" | "ALREADY_DECIDED" }> {
  const m = await getMarket(marketId);
  if (!m || (m.status !== "RESOLVED" && m.status !== "VOIDED")) return { eligible: false, why: "NOT_ADJUDICATED" };
  // The money is gone — an objection here could not change it, so we do not
  // offer one. Support is the honest route at that point.
  if (m.settledAt) return { eligible: false, why: "ALREADY_SETTLED" };
  if (m.objectionsClosedAt && Date.now() > Date.parse(m.objectionsClosedAt)) {
    return { eligible: false, why: "WINDOW_CLOSED" };
  }
  const holdsPosition = (await listPositionsForMarket(marketId)).some((p) => p.userId === userId);
  if (!holdsPosition) return { eligible: false, why: "NO_POSITION" };

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
 * An emergency void kills a market outright and refunds every stake. It is the
 * ops kill-switch, so it deliberately does NOT wait for objections — but that
 * leaves any OPEN objection stranded on a market that has now settled: stuck in
 * the officer queue as un-actionable, inflating the frozen-money KPI, and leaving
 * the player who filed it with no answer.
 *
 * A void IS the VOID remedy — every stake came back in full, which is exactly what
 * upholding with VOID does. So we close them out as UPHELD/VOID and tell the
 * objector, rather than letting them rot. Called from emergencyVoidMarket AFTER
 * the officer's role has already been checked there.
 */
export async function closeObjectionsForVoidedMarket(
  marketId: string,
  officerId: string,
  reason: string,
): Promise<number> {
  const open = (await db.objection.listForMarket(marketId)).filter((o) => o.status === "OPEN");
  const now = new Date().toISOString();
  for (const o of open) {
    await db.objection.update(o.id, {
      status: "UPHELD",
      remedy: "VOID",
      reviewedBy: officerId,
      reviewedAt: now,
      reviewNote: `Market emergency-voided; every stake refunded in full. Reason: ${reason}`.slice(0, 1000),
    });
    audit({
      category: "COMPLIANCE",
      action: "objection.closed_by_void",
      actorId: officerId,
      targetType: "Market",
      targetId: marketId,
      payload: { objectionId: o.id, objectorId: o.userId, reason, effect: "market voided and every stake refunded — the objection is answered by the void" },
    });
    notifyObjectionDecided(o.userId, { upheld: true, marketId, note: `The market was voided and your stake was refunded in full. ${reason}` }).catch(() => {});
  }
  return open.length;
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
 * ⭐ SEPARATION OF DUTIES COMES FREE, AND THAT IS THE REASON FOR THIS SHAPE. The row's `userId`
 * is the OFFICER who raised it, and both rulings already refuse when `o.userId === officerId`
 * ("You cannot rule on your own objection"). So the officer who freezes a market structurally
 * cannot be the one who releases it — a second officer must. That property is inherited, not
 * re-implemented, which is why it cannot drift away from the player path's version of it.
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
        effect: "settlement frozen until a DIFFERENT officer rules — the filer cannot release their own hold",
      },
    });

    // Every other officer needs to know the pool is frozen and why — the same fan-out a
    // player objection triggers, so one queue shows both kinds of case.
    notifyAdminObjectionFiled(objection.id, m.titleEn).catch(() => {});

    return { ok: true, data: { objectionId: objection.id } };
  });
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
  if (o.status !== "OPEN") return { ok: false, error: "This objection has already been decided.", code: "INVALID" };
  // Separation of duties — an officer cannot rule on their own objection.
  if (o.userId === officerId) {
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

  await db.objection.update(objectionId, {
    status: "REJECTED",
    reviewedBy: officerId,
    reviewedAt: new Date().toISOString(),
    reviewNote,
  });
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
 *   VOID    → nobody was right; refund every stake in full (0% fee).
 *   REVERSE → the other side actually won; flip the verdict.
 *
 * A REVERSE re-opens the objection window: the verdict changed, so the players it
 * now goes against deserve the same right to object that the original side had.
 * A VOID does not — a full refund cannot aggrieve anyone, so it settles on the
 * next sweep.
 *
 * Both remedies are only reachable while settledAt is null. If the market somehow
 * settled underneath us, we refuse rather than attempt a clawback.
 */
export async function upholdObjection(
  objectionId: string,
  officerId: string,
  input: { remedy: ObjectionRemedy; note: string },
): Promise<ServiceResult<{ newOutcome: string }>> {
  const reviewNote = (input.note ?? "").trim().slice(0, 1000);
  if (reviewNote.length < 5) {
    return { ok: false, error: "Record why the objection is upheld (5+ characters).", code: "INVALID" };
  }
  if (!(await requireRulingOfficer(officerId, "objection.uphold"))) {
    return { ok: false, error: "Forbidden: ADMIN or COMPLIANCE role required to rule on an objection.", code: "INVALID" };
  }
  const o = await db.objection.findById(objectionId);
  if (!o) return { ok: false, error: "Objection not found.", code: "NOT_FOUND" };
  if (o.status !== "OPEN") return { ok: false, error: "This objection has already been decided.", code: "INVALID" };
  if (o.userId === officerId) {
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

  const ruling = await withLock(`market:${o.marketId}`, async (): Promise<ServiceResult<{ newOutcome: string }>> => {
    // Re-read under the lock — this is a money decision.
    const { marketStore } = await import("./market-dal");
    const m = await marketStore.get(o.marketId);
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

    const previousOutcome = m.resolvedOutcome;
    const now = new Date().toISOString();

    if (input.remedy === "VOID") {
      m.resolvedOutcome = "VOID";
      m.status = "VOIDED";
      // Refunds cannot aggrieve anyone, so no fresh window: settle on the next
      // sweep. (Backdating by a second keeps the sweeper's `<= now` honest.)
      m.objectionsClosedAt = new Date(Date.now() - 1000).toISOString();
    } else {
      m.resolvedOutcome = m.resolvedOutcome === "YES" ? "NO" : "YES";
      m.status = "RESOLVED";
      // The verdict changed — the newly-losing side gets its own objection window.
      const cfg = await getEffectiveConfig(m.id);
      m.objectionsClosedAt = new Date(Date.now() + Math.max(0, cfg.objectionWindowHours) * 3600_000).toISOString();
    }
    m.updatedAt = now;
    await marketStore.set(m);

    await db.objection.update(objectionId, {
      status: "UPHELD",
      reviewedBy: officerId,
      reviewedAt: now,
      reviewNote,
      remedy: input.remedy,
    });

    audit({
      category: "COMPLIANCE",
      action: "objection.upheld",
      actorId: officerId,
      targetType: "Market",
      targetId: m.id,
      payload: {
        objectionId,
        objectorId: o.userId,
        reason: o.reason,
        remedy: input.remedy,
        previousOutcome,
        newOutcome: m.resolvedOutcome,
        note: reviewNote,
        objectionsClosedAt: m.objectionsClosedAt,
        note2: "money had not moved — the verdict was corrected before settlement",
      },
    });

    notifyObjectionDecided(o.userId, { upheld: true, marketId: m.id, note: reviewNote }).catch(() => {});

    return { ok: true, data: { newOutcome: m.resolvedOutcome! } };
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
