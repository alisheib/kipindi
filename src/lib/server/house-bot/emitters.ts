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
import { formatNumber, formatTzs } from "@/lib/utils";
import { formatEat } from "@/lib/house-bot/clock";
import { RUNTIME_KEY } from "@/lib/house-bot/constants";
import { FIELD_META, FIELD_ORDER, isFieldId, type FieldMeta } from "@/lib/house-bot/rules";
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
import { officerLabel } from "../actor-label";
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

/* ═══ The ones the console's acts and the money hooks call directly ══════════════════════════════ */

/** One field a save moved, as its writer holds it: the field id (a `FIELD_META` key) and the two stored values. */
export type RosterChange = { field: string; before: unknown; after: unknown };

/**
 * A roster change (C13): designated, verified, started, paused by hand, removed, rules or limits saved, targets.
 * `event` is one of `ROSTER_EVENT_CODES` and `detail` its parts (ruling 142).
 *
 * ⭐ FS-09 (2026-09-27) · EVERY ACT THAT LANDS CALLS THIS, ONCE, AFTER ITS HISTORY EVENT IS WRITTEN — designate,
 * re-verify, Start, Pause, Remove, the rules save and the limits save (`designation.ts`, `roster-actions.ts`,
 * `rules-save.ts`, `limits-save.ts`). A refused act never reaches it, and a save that moved nothing does not call it.
 * ⛔ ALL OF ITS WORK IS INSIDE `safe`, the officer's name and the diff's formatting included: every caller has
 * already LANDED its write, so nothing here may throw back into a path that would then report the act as failed.
 * ⛔ THE OFFICER IS PASSED AS AN ID (`actorId`) and named here, after the act, the platform's one way
 * (`officerLabel`: their display name, else the id) — never "Player #…", which `displayLabel` would print for a
 * member of staff with no display name. An officer with no display name, or whose user row cannot be read, is
 * therefore named by their ACCOUNT ID — `officerLabel`'s own fallback, as `docs/HOUSE-BOTS.md` §9.2 says — which is
 * language-neutral, so no English stand-in lands inside the Swahili and Chinese bodies (ruling 142). The "by" clause
 * is left out only when no `actorId` is passed, or `officerLabel` itself throws.
 * ⛔ `botId` NULL is the desk's own change (a limits save): the notifier titles and links it as the desk's.
 */
export async function announceRoster(o: {
  botId: string | null; label: string | null; event: string; eventId: string | null;
  actorId?: string | null;
  /** RULES_SAVED / LIMITS_SAVED: every field that moved. Formatted here, into the sentence's one diff slot. */
  changes?: readonly RosterChange[];
  detail?: { byName?: string | null; field?: string | null; from?: string | null; to?: string | null; marketTitle?: string | null; timing?: { delaySec?: number | null; from?: "STAKE" | "EXIT" | null; heldToExit?: boolean | null } | null; cancelled?: number | null };
}): Promise<void> {
  await safe("roster", async () => {
    const byName = o.detail?.byName ?? (o.actorId ? await officerName(o.actorId) : null);
    const moved = o.changes ? rosterDiff(o.changes) : {};
    return notifyAdminsHouseBotRoster({
      botId: o.botId, label: o.label, event: o.event, eventId: o.eventId, at: nowAt(),
      detail: { ...o.detail, ...moved, byName },
    });
  });
}

/** An officer's name for a roster sentence: their display name, else their account id — `officerLabel` falls back to
 *  the id when the name is empty AND when the user row cannot be read. Null (the clause then left out) only if
 *  `officerLabel` itself throws. */
async function officerName(id: string): Promise<string | null> {
  try { return (await officerLabel(id))?.trim() || null; } catch { return null; }
}

/** One stored value, in the sentence's language-neutral form: a figure with its unit symbol, or "—" for unset. */
function rosterValue(meta: FieldMeta, v: unknown): string {
  if (v == null) return "—";
  if (typeof v !== "number" || !Number.isFinite(v)) return String(v);
  if (meta.unit === "TZS") return formatTzs(v);
  if (meta.unit === "%") return `${formatNumber(v)}%`;
  if (meta.unit === "s" || meta.unit === "min") return `${formatNumber(v)} ${meta.unit}`;
  return formatNumber(v);
}

/**
 * THE BEFORE → AFTER DIFF, IN `ROSTER_SENTENCE`'s OWN SHAPE (04 C13: "daily loss cap TZS 50,000 → TZS 200,000").
 *
 * The sentence has ONE diff slot — `field`, `from`, `to` — and renders `field: from → to` when `to` is set and
 * `field` alone when it is not. So:
 *   · one number moved → the three parts, exactly as the copy was written for;
 *   · several moved → every one of them in `field`, `label: from → to` each, joined by "; " in page order, with
 *     `from`/`to` left empty — no count word, no "and N more", because any such word would be English inside the
 *     Swahili and Chinese bodies (ruling 142) and a partial list would hide the field somebody raised.
 * ⛔ A SWITCH, A LIST OR A CHOICE IS NAMED, NOT VALUED: "on", "off" and a list's members are words or tokens the
 *    sentence cannot translate, and the account's stored rules keep the values the link opens onto.
 * ⛔ A RULE LEAF CARRIES ITS SECTION ("Counter · Delay minimum") where its own label does not already begin with
 *    it — the Counter's bare "Delay minimum" would otherwise read as either of the Opener's two, and a caps or
 *    limits label is already unambiguous.
 * ⛔ THE UNITS ARE SYMBOLS ("26 s", "30 min", "40%"), never the words `unitSuffix` spells, which are English.
 */
function rosterDiff(changes: readonly RosterChange[]): { field: string | null; from: string | null; to: string | null } {
  const order = (f: string) => { const i = (FIELD_ORDER as readonly string[]).indexOf(f); return i < 0 ? Number.MAX_SAFE_INTEGER : i; };
  const parts = [...changes].sort((a, b) => order(a.field) - order(b.field)).map((c) => {
    const meta = isFieldId(c.field) ? FIELD_META[c.field] : null;
    if (!meta) return { name: c.field, from: null, to: null };
    const name = meta.group === "rules" && !meta.label.startsWith(meta.section) ? `${meta.section} · ${meta.label}` : meta.label;
    /* A field with no numeric bounds is a switch, a list or a choice: named only. */
    return meta.min === null ? { name, from: null, to: null } : { name, from: rosterValue(meta, c.before), to: rosterValue(meta, c.after) };
  });
  if (parts.length === 0) return { field: null, from: null, to: null };
  if (parts.length === 1) return { field: parts[0].name, from: parts[0].from, to: parts[0].to };
  return { field: parts.map((p) => (p.to == null ? p.name : `${p.name}: ${p.from} → ${p.to}`)).join("; "), from: null, to: null };
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

/**
 * THE SUNSET — ⛔ ONE alert for the whole wind-down, never one per account (04 F2, FS-06).
 *
 * `removeHouseBot` announces per bot, which is right for an officer removing one account and wrong here:
 * a desk of five would ring five times for a single decision, and the fifth bell would say nothing the
 * first did not. The exposure rides along because a sunset does NOT void open money — it settles
 * normally — and an owner reading "retired" with no figure would reasonably assume otherwise.
 */
export async function announceSunset(o: { cancelled: number; openExposure: { tzs: number; markets: number } }): Promise<void> {
  await safe("sunset", () => notifyAdminsHouseBotSwitch({
    state: "OFF", cause: "SUNSET", cancelled: o.cancelled, openExposure: o.openExposure, at: nowAt(),
  }));
}
