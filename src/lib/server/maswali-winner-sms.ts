/**
 * MASWALI MILLIONEA — THE WINNER'S ONE SERVICE SMS (MASWALI-BUILD S6; OD-25, MB-93, MB-44, OD-13).
 *
 * One SMS per winning holder per week (OD-25): the amount and "open the app", and nothing else — no link, no later week's
 * figure (MB-44), no word a campaign would use. It is a SERVICE message (`OPS`), sent only to a player whose own ticket
 * won, so the marketing consent gate is not its door: anyone else hears of Millionea only through an approved campaign
 * wording, past that gate (`millionea-claims.ts`, MB-47).
 *
 * ⭐ THE CREDIT IS CHECKED BEFORE THE BATCH (MB-93). Login and withdrawal codes ride the same account, so a winners' batch
 *    may spend only what lies above the credit kept for them — the Marketing SMS settings' `codesReserveTzs` (TZS 20,000
 *    unless the owner saves another), judged by the platform's one rule (`creditVerdict`) on a credit the read CONFIRMED
 *    (`balanceFigureOf`). A batch that would go below it, a credit that cannot be read, or settings that cannot be read in
 *    full HOLD the batch whole: nothing is sent, the run records why, and the desk list names those winners for a call
 *    (`maswali-console.ts`). The bell and the letter have gone already; the SMS never stands in for them.
 * ⭐ ONCE PER PLAYER-WEEK. Each message carries its target (`MaswaliWinner`, `<weekId>:<userId>`), and a target that already
 *    has a message is never sent again — the SmsMessage row is the stamp, and its delivery receipt the record (MB-93: "log
 *    delivery status"). A read of the targets that fails holds the batch: never a second SMS. ⭐ RESERVED, NOT ONLY
 *    CHECKED (round 3, A5): the batch writes that row BEFORE its request, and both store twins write it as the target's one
 *    row — under a unique index on Postgres (`@/lib/sms-targets`) — so two processes that both read "not sent" cannot both
 *    send: the second one's write is refused, its batch sends nothing, and it counts the first one's message.
 * ⛔ No market title reaches this SMS, and none may: `test:campaign-compose` §19 reads every SMS composer in src/.
 */
import { db, type SmsStatus } from "./store";
import { refreshSmsBalance, sendBatch, type SmsBatchOutcome, type SmsOutbound } from "./sms";
import { channelAllowed } from "./comms-registry";
import { creditVerdict } from "@/lib/marketing/credit-guard";
import type { BalanceFigure } from "@/lib/marketing/campaign-estimate";
import { sizeSms } from "@/lib/sms-compose";
import { formatTzs } from "@/lib/utils";
import { eatWeekNumberOf } from "@/lib/eat-day";
import { isSmsTargetTaken, WINNER_SMS_TARGET } from "@/lib/sms-targets";

/** The target every winner SMS carries — the key that keeps it to one per player and week (its row reserves it). */
export { WINNER_SMS_TARGET };

/** One player-week's target id. */
export function winnerSmsTargetId(weekId: string, userId: string): string {
  return `${weekId}:${userId}`;
}

/** The SmsMessage reads take at most this many targets at once (`assertTargetsRead`, the campaign engine's bound). */
const TARGETS_PER_READ = 200;

/**
 * Each of these targets' winner SMS as its own row records it — the newest message per target, its status and its
 * delivery receipt (MB-93: "log delivery status") — read in the store's bound. The batch's "already sent" and the desk
 * list's "what was sent" are this one read. A target with no message has no entry.
 */
export async function winnerSmsRecords(targetIds: readonly string[]): Promise<Map<string, { status: SmsStatus; dlr: string | null }>> {
  const out = new Map<string, { status: SmsStatus; dlr: string | null }>();
  for (let i = 0; i < targetIds.length; i += TARGETS_PER_READ) {
    for (const m of await db.smsMessage.findByTargets(WINNER_SMS_TARGET, targetIds.slice(i, i + TARGETS_PER_READ))) {
      if (m.targetId) out.set(m.targetId, { status: m.status, dlr: m.dlrStatus });
    }
  }
  return out;
}

/** One winning player of one week, as the SMS needs them. */
export type WinnerSmsLine = {
  userId: string;
  weekId: string;
  weekCode: string;
  /** Winning tickets (paid and held alike), and the paid shares' sum. */
  tickets: number;
  paidTzs: number;
  /** Every winning share of theirs is held for Compliance (MB-43): no figure, and the team will contact them. */
  held: boolean;
  /** The account cannot sign in (self-excluded, closed, suspended): "contact support", never "open the app" (OD-13). */
  cannotSignIn: boolean;
  phone: string | null;
  locale: "EN" | "SW" | "ZH";
};

/**
 * ⭐ THE BODY (OD-25): the week, the amount, and "open the app" — or, for a share held or an account that cannot sign in,
 * the one true next step. No link. English and Swahili stay inside the GSM alphabet (one segment, every variant); Chinese
 * is Unicode by nature and stays inside its 70.
 */
export function winnerSmsBody(l: WinnerSmsLine): string {
  const n = eatWeekNumberOf(l.weekCode);
  const money = formatTzs(l.paidTzs);
  const many = l.tickets > 1;
  if (l.locale === "SW") {
    const head = many ? `50pick: Tiketi zako ${l.tickets} za Millionea Wiki ${n} zimeshinda` : `50pick: Tiketi yako ya Millionea Wiki ${n} imeshinda`;
    if (l.held) return `${head}. Zawadi imeshikiliwa kwa sasa; timu yetu itawasiliana nawe.`;
    return `${head} ${money}. ${l.cannotSignIn ? "Wasiliana na huduma kwa wateja ya 50pick kuipokea." : "Fungua programu ya 50pick kuona."}`;
  }
  if (l.locale === "ZH") {
    const head = many ? `50pick：您有 ${l.tickets} 张 Millionea 第${n}周彩票中奖` : `50pick：您的 Millionea 第${n}周彩票中奖`;
    if (l.held) return `${head}。奖金暂时保留；我们的团队会联系您。`;
    return `${head}，${many ? "共 " : ""}${money}。${l.cannotSignIn ? "请联系 50pick 客服领取。" : "请打开 50pick 应用查看。"}`;
  }
  const head = many ? `50pick: Your ${l.tickets} Millionea Week ${n} tickets won` : `50pick: Your Millionea Week ${n} ticket won`;
  if (l.held) return `${head}. The share is held for now; our team will contact you.`;
  return `${head} ${money}. ${l.cannotSignIn ? "Contact 50pick support to receive it." : "Open the 50pick app to see it."}`;
}

/** What the batch did: nothing to send, HELD whole (and why), or handed to the rail. */
export type WinnerSmsOutcome =
  | { kind: "none" }
  | { kind: "held"; reason: "channel_closed" | "targets_unreadable" | "settings_unreadable" | "credit_unreadable" | "credit_low"; winners: number; costTzs: number | null }
  | {
      kind: "sent"; accepted: number; failed: number; refused: string | null; alreadySent: number;
      /** The failures by their code (`SmsResult.code`; UNKNOWN when none was given) — so a run can tell a refusal that can
       *  never clear (a number the gateway cannot dial, no rail) from one the next run may clear (round 3, A12). */
      codes: Partial<Record<string, number>>;
    };

/** Every read and the send, injectable for the suites. */
export type WinnerSmsDeps = {
  /** The credit as the read CONFIRMED it (`balanceFigureOf`): live, or unreadable with no figure. */
  credit(): Promise<BalanceFigure>;
  /** The owner's price per segment and the credit kept for codes — null when the record cannot be read in full. */
  settings(): Promise<{ pricePerSegmentTzs: number; codesReserveTzs: number } | null>;
  /** The targets among these that already carry a message. */
  sentTargets(targetIds: readonly string[]): Promise<Set<string>>;
  send(messages: SmsOutbound[]): Promise<SmsBatchOutcome>;
};

const LIVE: WinnerSmsDeps = {
  async credit() {
    // Loaded on use: the estimate module is the campaign screen's, and its one rule for "a figure the read confirmed" is
    // the rule this batch needs (a minute's reuse, as Admin → System reads it).
    const { balanceFigureOf } = await import("./marketing/estimate");
    return balanceFigureOf(await refreshSmsBalance({ maxAgeMs: 60_000 }));
  },
  async settings() {
    const { reloadMarketingSmsSettings } = await import("./marketing/sms-settings");
    const r = await reloadMarketingSmsSettings();
    return r.ok && r.readable ? { pricePerSegmentTzs: r.settings.pricePerSegmentTzs, codesReserveTzs: r.settings.codesReserveTzs } : null;
  },
  async sentTargets(targetIds) {
    return new Set((await winnerSmsRecords(targetIds)).keys());
  },
  send: (messages) => sendBatch(messages),
};

/**
 * ⭐ SEND ONE WEEK'S WINNER SMS, ONCE — see the header. Never throws: a hold or a failure is an outcome the caller records.
 */
export async function sendMillioneaWinnerSms(lines: readonly WinnerSmsLine[], deps: WinnerSmsDeps = LIVE): Promise<WinnerSmsOutcome> {
  const reachable = lines.filter((l): l is WinnerSmsLine & { phone: string } => typeof l.phone === "string" && l.phone.trim() !== "");
  if (reachable.length === 0) return { kind: "none" };
  const hold = (reason: Extract<WinnerSmsOutcome, { kind: "held" }>["reason"], costTzs: number | null): WinnerSmsOutcome =>
    ({ kind: "held", reason, winners: reachable.length, costTzs });
  // The channel policy is asked, never re-decided (F6): a win may use SMS.
  if (!channelAllowed("WIN").sms) return hold("channel_closed", null);
  let already: Set<string>;
  try {
    already = await deps.sentTargets(reachable.map((l) => winnerSmsTargetId(l.weekId, l.userId)));
  } catch {
    return hold("targets_unreadable", null);
  }
  const due = reachable.filter((l) => !already.has(winnerSmsTargetId(l.weekId, l.userId)));
  if (due.length === 0) return { kind: "sent", accepted: 0, failed: 0, refused: null, alreadySent: reachable.length, codes: {} };
  const messages: SmsOutbound[] = due.map((l): SmsOutbound => ({
    to: l.phone, body: winnerSmsBody(l), purpose: "OPS", targetType: WINNER_SMS_TARGET, targetId: winnerSmsTargetId(l.weekId, l.userId),
  }));
  const settings = await deps.settings().catch(() => null);
  if (!settings) return hold("settings_unreadable", null);
  const costTzs = messages.reduce((s, m) => s + sizeSms(m.body).segments, 0) * settings.pricePerSegmentTzs;
  const balance = await deps.credit().catch((): BalanceFigure => ({ kind: "unreadable", why: "failed", error: "unreachable" }));
  const verdict = creditVerdict({ balance, costTzs, reserveTzs: settings.codesReserveTzs });
  if (!verdict.ok) return hold(verdict.reason, costTzs);
  try {
    const out = await deps.send(messages);
    const accepted = out.results.filter((x) => x.ok).length;
    const codes: Partial<Record<string, number>> = {};
    for (const x of out.results) if (!x.ok) codes[x.code ?? "UNKNOWN"] = (codes[x.code ?? "UNKNOWN"] ?? 0) + 1;
    return { kind: "sent", accepted, failed: out.results.length - accepted, refused: out.refused ?? null, alreadySent: reachable.length - due.length, codes };
  } catch (err) {
    // ⭐ A write refused because another process's row for the target landed first is that process's message — counted
    // as already sent, never as a failure of ours (the row is the reservation). ⭐ Round 4, L5 · ONLY that refusal says so:
    // the batch's rows are one statement, so none of ours was written, and a row there now is theirs. Any other throw may
    // come after our own rows were written — a row there is then OURS, and our message failed.
    const taken = isSmsTargetTaken(err)
      ? await deps.sentTargets(due.map((l) => winnerSmsTargetId(l.weekId, l.userId))).catch(() => new Set<string>())
      : new Set<string>();
    const lost = due.filter((l) => taken.has(winnerSmsTargetId(l.weekId, l.userId))).length;
    if (lost < due.length) console.error("[maswali-winner-sms] the winners' batch failed:", (err as Error)?.message ?? err);
    return {
      kind: "sent", accepted: 0, failed: due.length - lost, refused: lost === due.length ? null : "UNKNOWN",
      alreadySent: reachable.length - due.length + lost, codes: lost === due.length ? {} : { UNKNOWN: due.length - lost },
    };
  }
}
