/**
 * THE ENGINE'S VOICE — the real `EngineAlerts` and `HolderAlerts` (PLAN §7, 04 C13, C4-SPEC rulings 46 and 141).
 *
 * ⭐ THE CHANNELS ARE INJECTED, AND THIS IS WHAT IS INJECTED IN PRODUCTION. Every engine module takes its alert
 * channel as an argument so a test can record instead of send; this module is the one place that turns those calls
 * into notifications. Ruling 46: nothing that pauses a bot may run before its channel exists, so the call sites and
 * this module land together.
 *
 * ⛔ THE CAPS LIVE HERE, NOT IN THE EMITTER. The control row says how many per-bet bells an admin may get in an hour
 * and how many notices a holder may get; the counter is `bumpHourCount`, and the planner's hourly summary accounts
 * for exactly what these caps suppressed (`planner.ts hourlyDuties`).
 *
 * ⛔ A SEND NEVER FAILS A DECISION. Every call is best effort: a bell that cannot be written must not roll back a
 * stake that is already placed, or leave a bot half-stopped. The claim-and-release rules live with the callers
 * (`alertOnce`, `claimThen`), which is why nothing here claims.
 *
 * ⛔ THE HOLDER IS A HANDLE (04 R6) and an officer's reason is never quoted (INT-10) — both enforced in the copy.
 */
import { displayLabel } from "@/lib/display-label";
import { formatEat } from "@/lib/house-bot/clock";
import { RUNTIME_KEY } from "@/lib/house-bot/constants";
import type { MoneyEventCode } from "@/lib/house-bot/alert-copy";
import type { CredentialChangedVia, PauseReason } from "@/lib/house-bot/pause-reasons";
import {
  houseBotControlStore, houseBotRuntimeStore, houseBotStore, houseSeamStore,
  type StoredHouseBot, type StoredHouseBotIntent,
} from "../house-bot-dal";
import {
  notifyAdminsHouseBotAlert, notifyAdminsHouseBotBet, notifyAdminsHouseBotHourSummary, notifyAdminsHouseBotMoneyEvent,
  notifyAdminsHouseBotPaused, notifyAdminsHouseBotRoster, notifyAdminsHouseBotStaffChosen, notifyAdminsHouseBotSwitch,
} from "../notification-service";
import { formatEatLocal } from "../date-range";
import { db } from "../store";
import { playerHandle } from "./alerts";
import type { HolderAlerts } from "./holder-hook";
import type { EngineAlerts, EngineAlertMessage } from "./outcomes";

const errMessage = (e: unknown) => String((e as Error)?.message ?? e).replace(/\s+/g, " ").slice(0, 300);
/** Best effort, always: a failed bell never fails the decision it announces. */
const safe = async (what: string, send: () => Promise<unknown>): Promise<void> => {
  try { await send(); } catch (e) { console.error(`[house-bot] ${what} alert failed:`, errMessage(e)); }
};

const nowAt = (): string => formatEat(Date.now(), "HH:MM:SS");
const hhmm = (ms: number): string => formatEat(ms, "HH:MM");

/** A staff name is a name; a player is never one (04 R6). */
async function actorName(id: string | null | undefined): Promise<string> {
  if (!id) return "an officer";
  try {
    const u = await db.user.findById(id);
    return u ? displayLabel({ id: u.id, displayName: u.displayName ?? null }) : "an officer";
  } catch { return "an officer"; }
}

async function botOf(botId: string): Promise<StoredHouseBot | null> {
  try { return await houseBotStore.get(botId); } catch { return null; }
}

async function marketTitle(marketId: string | null | undefined): Promise<string> {
  if (!marketId) return "a market";
  try { return (await houseSeamStore.marketView(marketId))?.titleEn ?? marketId; } catch { return marketId; }
}

/** 02 §2.3's `{how}`, from the method the hook read. UNKNOWN is left out rather than guessed. */
function howChanged(method: CredentialChangedVia): string {
  if (method === "SELF_CHANGE") return "in their account settings";
  if (method === "RESET_LINK") return "with a reset link";
  if (method === "OFFICER_TEMP") return "— support issued a temporary password";
  return "";
}

/** A2 rows 5, 11 and 14 also email when the cause is added to a bot that was already stopped (04:1046-1048). */
const CAUSE_EMAILS: ReadonlySet<string> = new Set(["ACCOUNT_CLOSED", "IDENTITY_REFUSED", "HOLDER_ERASURE_REQUEST"]);

/* ═══ EngineAlerts ═══════════════════════════════════════════════════════════════════════════════ */

/** `EngineAlerts.placed`: the admins' row (capped, or uncapped when staff chose it) and the holder's own notice. */
async function announcePlaced(intent: StoredHouseBotIntent): Promise<void> {
  const [bot, control, title] = await Promise.all([botOf(intent.houseBotId), houseBotControlStore.get(), marketTitle(intent.marketId)]);
  const label = bot?.label ?? intent.houseBotId;
  const at = nowAt();
  const staffChosen = intent.kind === "MANUAL" || intent.targetId != null;

  if (staffChosen) {
    // Uncapped and never counted: a person chose this stake, so every admin hears it one by one (04 N1 §7).
    const byName = await actorName(intent.requestedById);
    await safe("staff-chosen", () => notifyAdminsHouseBotStaffChosen({
      botId: intent.houseBotId, label, side: intent.side, stakeTzs: intent.stakeTzs, marketTitle: title,
      marketId: intent.marketId, intentId: intent.id, entry: intent.kind === "MANUAL" ? "MANUAL" : "TARGET",
      byName, sideRule: intent.why ?? "recorded in the activity feed", at,
    }));
  } else {
    const { count } = await houseBotRuntimeStore.bumpHourCount(RUNTIME_KEY.global);
    if (count <= control.bellAlertsPerHour) {
      await safe("bet", () => notifyAdminsHouseBotBet({
        botId: intent.houseBotId, label, side: intent.side, stakeTzs: intent.stakeTzs, marketTitle: title,
        marketId: intent.marketId, intentId: intent.id, at,
      }));
    }
    // Over the cap the hour's summary accounts for it (planner.ts hourlyDuties) — nothing is lost, only quieter.
  }

  // ⛔ The holder hears nothing about a stake from their account (D19c, C4 ruling 149).
}

/** `EngineAlerts.once`: the summaries go to their own emitters; every other code is one alert row. */
async function announceOnce(message: EngineAlertMessage): Promise<void> {
  const at = nowAt();
  const detail = message.detail ?? {};
  if (message.code === "HOUR_SUMMARY_ADMINS") {
    /* ⛔ TWO FORMS OF ONE WINDOW, AND THEY ARE NOT INTERCHANGEABLE (C7 step 5's landing half). The BODY reads
     * "Between 13:00 and 14:00 EAT", which is the clock form a person reads; the LINK must carry the form the
     * console's window parser accepts, and that is NEITHER of the two obvious candidates:
     *   · `14:00` — the clock form — is refused outright (`parseEatLocal` requires a date), and
     *   · `2026-09-20T13:00:00.000Z` — the ISO instant on the alert's own detail — is ALSO refused, because the
     *     parser's pattern is anchored at `HH:MM` and a seconds/millis/`Z` tail does not match it.
     * ⛔ AND A REFUSED `from` IS SILENT: `resolveRange`'s custom branch has no "I could not read that" path, so it
     * falls back to `now - 24h → now` and still labels the window **custom**. Both wrong forms therefore land the
     * officer on the last 24 hours under the name of the hour the bell is about, with nothing on screen saying so.
     * ⛔ THE ZONE IS THE OTHER HALF: the parser reads an EAT wall clock, so a `…Z` instant would shift the window
     * by three hours even once its shape matched. `formatEatLocal` is the parser's own inverse, exported from the
     * module that owns the parse, so the two cannot drift. */
    const fromIso = typeof detail.fromIso === "string" ? detail.fromIso : "";
    const toIso = typeof detail.toIso === "string" ? detail.toIso : "";
    const from = fromIso ? hhmm(Date.parse(fromIso)) : "";
    const to = toIso ? hhmm(Date.parse(toIso)) : "";
    await safe("hour summary", () => notifyAdminsHouseBotHourSummary({
      fromHH: from, toHH: to,
      fromEat: fromIso ? formatEatLocal(Date.parse(fromIso)) : "",
      toEat: toIso ? formatEatLocal(Date.parse(toIso)) : "",
      count: Number(detail.count ?? 0), stakeTzs: Number(detail.stakeTzs ?? 0),
      beyondCap: Number(detail.beyondCap ?? 0), staffChosen: Number(detail.staffChosen ?? 0), at,
    }));
    return;
  }
  const bot = message.botId ? await botOf(message.botId) : null;
  const holderId = typeof detail.userId === "string" ? detail.userId : null;
  await safe("alert", () => notifyAdminsHouseBotAlert({
    code: message.code, botId: message.botId ?? null, label: bot?.label ?? null,
    holder: typeof detail.handle === "string" ? detail.handle : holderId ? playerHandle(holderId) : bot ? playerHandle(bot.userId) : null,
    marketId: message.marketId ?? null, intentId: message.intentId ?? null, detail, at,
  }));
}

/** A bot the engine or the hook stopped. Admins only — the holder is never told (D19c, ruling 149). */
async function announceStopped(bot: StoredHouseBot, change: { to: "AUTO_PAUSED" | "REMOVED"; cause: PauseReason; cancelled: number }): Promise<void> {
  const at = nowAt();
  await safe("stop", () => notifyAdminsHouseBotPaused({
    variant: "STOP", botId: bot.id, label: bot.label, holder: playerHandle(bot.userId),
    cause: change.cause, cancelled: change.cancelled, at,
  }));
}

/** The whole engine channel. */
export function houseEngineAlerts(): EngineAlerts {
  return {
    placed: async (intent) => { await safe("placed", () => announcePlaced(intent)); },
    once: async (_key, message) => { await announceOnce(message); },
    security: async (message) => {
      const at = nowAt();
      await safe("switch defect", () => notifyAdminsHouseBotSwitch({
        state: "OFF", cause: message.code, defect: message.code, cancelled: 0, at,
      }));
    },
    botStopped: async (bot, change) => { await announceStopped(bot, change); },
    switchedOff: async (change) => {
      const at = nowAt();
      await safe("switched off", () => notifyAdminsHouseBotSwitch({
        state: "OFF", cause: change.cause, cancelled: change.cancelled, at,
      }));
    },
  };
}

/* ═══ HolderAlerts ═══════════════════════════════════════════════════════════════════════════════ */

export function houseHolderAlerts(): HolderAlerts {
  const engine = houseEngineAlerts();
  return {
    passwordPaused: async (bot, change) => {
      const at = change.changedAt ? hhmm(Date.parse(change.changedAt)) : nowAt();
      await safe("A1", () => notifyAdminsHouseBotPaused({
        variant: change.again ? "A1_AGAIN" : "A1", botId: bot.id, label: bot.label, holder: playerHandle(bot.userId),
        how: howChanged(change.method), cancelled: change.cancelled, changedAt: change.changedAt, at,
      }));
    },
    passwordChanged: async (bot, change) => {
      const at = change.changedAt ? hhmm(Date.parse(change.changedAt)) : nowAt();
      // 02:95 · an erased account has no password left, and only Remove is open to it.
      let erased = false;
      try { erased = !(await db.user.findById(bot.userId))?.passwordHash; } catch { erased = false; }
      const variant = erased ? "A2_ERASED" : change.method === "OFFICER_TEMP" ? "A2_OFFICER" : "A2";
      await safe("A2", () => notifyAdminsHouseBotPaused({
        variant, botId: bot.id, label: bot.label, holder: playerHandle(bot.userId),
        how: howChanged(change.method), status: bot.pauseReason ? `Auto-paused: ${bot.pauseReason}` : "Paused", at,
      }));
    },
    botStopped: engine.botStopped,
    causeAdded: async (bot, cause) => {
      await safe("cause added", () => notifyAdminsHouseBotPaused({
        variant: "CAUSE", botId: bot.id, label: bot.label, holder: playerHandle(bot.userId),
        cause: cause.code, email: CAUSE_EMAILS.has(cause.code), at: nowAt(),
      }));
    },
    causeCleared: async (bot, code) => {
      await safe("cause cleared", () => notifyAdminsHouseBotAlert({
        code: "CAUSE_CLEARED", botId: bot.id, label: bot.label, holder: playerHandle(bot.userId),
        detail: { cause: code }, at: nowAt(),
      }));
    },
    holderLockedOut: async (bot, until) => {
      await safe("locked out", () => notifyAdminsHouseBotAlert({
        code: "HOLDER_LOCKED_OUT", botId: bot.id, label: bot.label, holder: playerHandle(bot.userId),
        detail: { until: until ? hhmm(Date.parse(until)) : "" }, at: nowAt(),
      }));
    },
    officerSetEmail: async (bot) => {
      await safe("officer email", () => notifyAdminsHouseBotAlert({
        code: "OFFICER_SET_EMAIL", botId: bot.id, label: bot.label, holder: playerHandle(bot.userId), at: nowAt(),
      }));
    },
    breakEnded: async (bot, untilIso) => {
      await safe("break ended", () => notifyAdminsHouseBotAlert({
        code: "RG_ENDED", botId: bot.id, label: bot.label, holder: playerHandle(bot.userId),
        detail: { until: untilIso }, at: nowAt(),
      }));
    },
  };
}

/* ═══ The two the console and the money hooks call directly ══════════════════════════════════════ */

/**
 * A roster change (C13): designated, verified, started, paused by hand, removed, rules or limits saved, targets.
 * `event` is one of `ROSTER_EVENT_CODES` and `detail` its parts (ruling 142) — commit 7's console actions call this.
 */
export async function announceRoster(o: {
  botId: string; label: string; event: string; eventId: string;
  detail?: { byName?: string | null; field?: string | null; from?: string | null; to?: string | null; marketTitle?: string | null; timing?: { delaySec?: number | null; from?: "STAKE" | "EXIT" | null; heldToExit?: boolean | null } | null; cancelled?: number | null };
}): Promise<void> {
  await safe("roster", () => notifyAdminsHouseBotRoster({ ...o, at: nowAt() }));
}

/** The holder's own money moved on a live house-bot account (F7, step 10's hooks). `event` is a code (ruling 142). */
export async function announceMoneyEvent(o: { botId: string; label: string; holderUserId: string; event: MoneyEventCode; amountTzs: number; txnId: string; balanceTzs: number }): Promise<void> {
  await safe("money event", () => notifyAdminsHouseBotMoneyEvent({
    botId: o.botId, label: o.label, holder: playerHandle(o.holderUserId), event: o.event,
    amountTzs: o.amountTzs, txnId: o.txnId, balanceTzs: o.balanceTzs, at: nowAt(),
  }));
}

/** The master switch going ON (the console's own action, commit 7) — OFF speaks through the kill switch. */
export async function announceSwitchedOn(o: { byName: string | null; activeBots: number }): Promise<void> {
  await safe("switch on", () => notifyAdminsHouseBotSwitch({ state: "ON", byName: o.byName, activeBots: o.activeBots, at: nowAt() }));
}
