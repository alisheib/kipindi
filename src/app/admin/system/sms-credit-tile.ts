/**
 * ⭐ THE SMS CREDIT TILE ON /admin/system, AS DATA (2026-09-26, owner ruling D7). A pure function so
 * `test:sms-cost-guard` §9 can drive every state without rendering the page.
 *
 * 🔴 WHAT IT REPLACED. The tile was "SMS provider": its headline was the delivery rate ("Idle"), the balance was an
 * unlabelled "TZS 185" at the tail of the smallest text on the card, an unreadable balance was simply left out, a
 * stale one was shown as today's, low credit was a grey arrow, and below the floor it wore the aqua "live" badge.
 * At 360 the caption broke as "blackball · 0" / "sent · TZS 185", which reads as money sent.
 *
 * The rule now: the CREDIT is the headline, and the tile says the state in words. Four slots, one job each:
 *   · `provenance` — its own line under the figure: the exact amount behind a compacted headline and, for a figure this
 *     render could not confirm, when it was read and why it was not refreshed ("Last read 14:02 EAT · couldn't refresh
 *     — no answer from Blackball"). Absent when the figure is current. Drawn in neutral ink: it qualifies the figure.
 *   · `note` — the state and the action, short (healthy, low, below floor, sends failing, no SMS can send, couldn't
 *     read), drawn as prose in the tone's ink.
 *   · `vars` — the Railway variables a fix names, drawn whole in mono under the note.
 *   · `caption` — the plain facts for the small chip: SMS traffic since the server started. One fact, no provider (the
 *     note names Blackball wherever it matters) and no inner " · ", so a wrapped chip never reads as a bullet list.
 * A figure past the TTL, which the gate itself treats as unknown, is headlined as a dash: the old figure is in the
 * note, its time in the provenance. Amounts, counts and "14:02 EAT" never break inside; each " · " separator stays
 * with the fact after it, so no line ends on a dot.
 *
 * ⭐ RE-REVIEW, 2026-09-27. "Healthy" is said only when SMS can actually go out: no sender ID, unset or refused keys, or
 * an unknown provider is danger with its consequence and its fix, and failing sends are said in words (the balance
 * read and the send are separate endpoints). The reason a read failed survives a first reading; a slow vendor is
 * "checking", not a failure; an unread balance makes no claim about the amount; a stale low figure keeps its action;
 * a seven-figure credit is compacted rather than clipped.
 * ⭐ FINAL VISUAL REVIEW, 2026-09-27. "Last read … · couldn't refresh" was clauses 4 and 5 of a six-clause red run-on,
 * so an unconfirmed "TZS 30" read as today's credit: it is the provenance line now. The fix for refused keys said
 * "BLACKBALL_CLIENT_ID / SECRET" (no variable is called SECRET) and broke the name mid-token at 360. "Healthy" names
 * the alert line. A stale figure below the floor is danger: invites are sending again on the credit login codes need.
 * ⛔ No pulse ("live" is the live-feed signal) and no arrow (an arrow claims a movement).
 */
import { formatNumber, formatTzs, formatTzsCompact } from "@/lib/utils";
import type { SmsBalanceRead, SmsRailProblem } from "@/lib/server/sms";

const NB = String.fromCharCode(0xa0);
/** Breaks may fall BEFORE the dot, never after it. */
const SEP = ` ·${NB}`;
/** One fact that must not break inside. */
const keep = (s: string) => s.replace(/ /g, NB);
const amount = (tzs: number) => keep(formatTzs(tzs));
/** "1,234 sent": the count never breaks from its word. */
const count = (n: number, what: string) => keep(`${formatNumber(n)} ${what}`);
const sentence = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
/** From here the full figure ("TZS 1,000,000", 13 characters) would ellipsise in a 2-up tile at 360, and §A5 forbids
 *  clipping money: the headline takes the platform's one compaction grammar and the provenance keeps the exact figure. */
const COMPACT_FROM = 1_000_000;
/** Under this delivery rate since the server started, with a failure among the sends, the tile never says "Healthy". */
const FAILING_BELOW = 0.9;
/** What every dead rail means: login codes are SMS too. */
const NO_SMS = "no SMS can send, login codes included";
/** The send counters live on `globalThis` in this process, so ANY restart zeroes them — a deploy, a crash, a Railway
 *  restart. The window is named for what resets it, never "since deploy" and never "today". */
const SINCE = "since server start";
/** The two Railway variables Blackball's keys live in, both named in full (sms.ts reads exactly these). */
const BLACKBALL_KEYS = ["BLACKBALL_CLIENT_ID", "BLACKBALL_CLIENT_SECRET"];

/** The display name, never the transport slug (§L1 L2). */
const PROVIDER_LABEL: Record<string, string> = { blackball: "Blackball", console: "Console (dev)", unrecognised: "Unknown provider" };

/** The display name for a provider slug (`sms.name`) — the tile's own, and the composer's sender line's (U37b). */
export function smsProviderLabel(slug: string): string {
  return PROVIDER_LABEL[slug] ?? slug;
}

/** One dead-rail sentence: why, the consequence, the fix — and the Railway names the fix needs. */
type Said = [why: string, fix: string, vars?: string[]];
const noteOf = (said: Said): { note: string; vars?: string[] } =>
  ({ note: `${said[0]}${SEP}${NO_SMS}${SEP}${said[1]}`, ...(said[2] ? { vars: said[2] } : {}) });

/** The four `smsRailProblem` answers in this tile's words. */
function railSaid(rail: SmsRailProblem, name: string): Said {
  switch (rail) {
    case "provider-unrecognised": return ["SMS provider not recognised", "set SMS_PROVIDER to blackball on Railway"];
    case "console-in-production": return ["The console stub is selected and sends nothing", "set SMS_PROVIDER to blackball on Railway"];
    case "keys-not-set": return [`${name} keys not set`, "set both keys on Railway", BLACKBALL_KEYS];
    case "sender-id": return ["Sender ID missing or too long", "check SMS_SENDER_ID on Railway"];
  }
}

/**
 * ⭐ U37b · THE RAIL'S OWN PROBLEM, IN THIS TILE'S WORDS — exported so the SMS campaign composer's read-only sender line
 * (/admin/campaigns/new, OD45) says exactly what Admin → System says: one wording of one fault, never a second.
 * `name` is the provider's display name (`smsProviderLabel`).
 */
export function railProblemNote(rail: SmsRailProblem, name: string): { note: string; vars?: string[] } {
  return noteOf(railSaid(rail, name));
}

/** When NO SMS can leave this box: why, the consequence and the fix, as one sentence — or null. The rail's own problem
 *  first (`smsRailProblem`, the words behind `smsConfigured`), then the balance read's verdict: the read uses the same
 *  keys as every send, so keys the vendor refused are keys no SMS goes out on. */
function deadRail(i: SmsCreditTileInput, name: string): { note: string; vars?: string[] } | null {
  const keysUnset = i.read?.outcome === "failed" && i.read.error === "not-configured";
  const rail = i.rail ?? (keysUnset ? "keys-not-set" : null);
  if (rail !== null) return railProblemNote(rail, name);
  if (i.read?.outcome === "failed" && i.read.error === "refused") {
    return noteOf([`${name} refused our keys`, "check both keys on Railway", BLACKBALL_KEYS]);
  }
  return null;
}

/** Why a read FAILED, in words, when the rail is not dead — or null when the read said nothing more. The balance read
 *  is the one free live credential check, so an outage must not look like wrong keys, nor wrong keys like an outage. */
function failedBecause(read: SmsBalanceRead | null, name: string): string | null {
  if (read?.outcome !== "failed") return null;
  if (read.error === "unreachable") return `no${NB}answer from ${name}`;
  if (read.error === "unexpected") return `${name} sent a reply we couldn't read`;
  return null;
}

/** The chip's one fact: what this process carried since it started. 🔴 E-330 ②: no traffic reads "0 sent", never a
 *  100% rate. */
function factsOf(h: SmsCreditTileInput["health"]): string {
  return `${count(h.sent, "sent")}${h.failed > 0 ? `, ${count(h.failed, "failed")}` : ""} ${SINCE}`;
}

/** Month names from a fixed list, never from Intl: ICU spells September "Sep" on one Node build and "Sept" on the
 *  next, and the tile must read the same on every box. */
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;
/** The zone database's offset for Dar es Salaam, read as NUMBERS only — no name, no locale-dependent text. */
const EAT_PARTS = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Africa/Dar_es_Salaam", year: "numeric", month: "numeric", day: "numeric",
  hour: "numeric", minute: "numeric", second: "numeric", hourCycle: "h23",
});
/** The wall clock in Dar es Salaam at `ms`, as a Date read back with the getUTC* getters, which no locale touches. */
function eatWall(ms: number): Date {
  const p: Record<string, number> = {};
  for (const part of EAT_PARTS.formatToParts(new Date(ms))) if (part.type !== "literal") p[part.type] = Number(part.value);
  // `% 24`: an ICU that prints midnight as "24" under h23 still lands on the right day.
  return new Date(Date.UTC(p.year, p.month - 1, p.day, p.hour % 24, p.minute, p.second));
}
const pad = (n: number) => String(n).padStart(2, "0");
/** "14:02 EAT", or "25 Sep 14:02 EAT" for a reading from another EAT day. */
export function eatClock(ms: number, now = Date.now()): string {
  const d = eatWall(ms);
  const today = eatWall(now);
  const sameDay = d.getUTCFullYear() === today.getUTCFullYear() && d.getUTCMonth() === today.getUTCMonth() && d.getUTCDate() === today.getUTCDate();
  const prefix = sameDay ? "" : `${keep(`${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`)} `;
  return `${prefix}${keep(`${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())} EAT`)}`;
}

export type SmsCreditTileInput = {
  /** `sms.name` — the resolved provider slug. */
  provider: string;
  /** What this render's refresh knew; null only if it threw (it is documented never to). */
  read: SmsBalanceRead | null;
  /** `smsBalanceSnapshot()` after the refresh — the gate's own reading. */
  snapshot: { tzs: number | null; at: number | null; stale: boolean; belowAlert: boolean; belowFloor: boolean };
  /** `smsHealthSnapshot()` — this process's counters, `failed` included. */
  health: { sent: number; failed: number; successRate: number | null };
  /** `smsRailProblem()` — why no SMS can send on this box, or null when it can. */
  rail: SmsRailProblem | null;
  thresholds: { floorTzs: number; alertTzs: number };
  now?: number;
};

/** `provenance` is the line under the figure, `note` the state and the action, `vars` the Railway names a fix needs,
 *  `caption` the chip's one fact. A tile always says its state in words: in `note`, or — for a figure that is fine
 *  but unconfirmed — in `provenance` alone. */
export type SmsCreditTile = {
  value: string;
  tone?: "danger" | "warning";
  provenance?: string;
  note?: string;
  vars?: string[];
  caption: string;
};

export function smsCreditTile(i: SmsCreditTileInput): SmsCreditTile {
  const s = i.snapshot;
  const name = smsProviderLabel(i.provider);
  const dead = deadRail(i, name);
  const pending = i.read?.outcome === "pending";
  const reason = failedBecause(i.read, name);
  const facts = factsOf(i.health);

  // Unknown: a dash and the words, never a blank and never a claim about the amount (§C2) — and why, when the read said.
  if (s.tzs === null || s.at === null) {
    if (dead) return { value: "—", tone: "danger", ...dead, caption: facts };
    // A slow vendor is not a failure: the read carries on and records itself when it lands.
    if (pending) return { value: "—", note: `Checking with ${name}…${SEP}reload in a few seconds`, caption: facts };
    if (i.read?.outcome === "unavailable") return { value: "—", note: `No balance read on ${name}`, caption: facts };
    return { value: "—", tone: "warning", note: `Couldn't read the balance${reason ? `${NB}— ${reason}` : ""}`, caption: facts };
  }

  // What this render could not confirm, and why — the reason survives a first reading (2026-09-27).
  const refresh = pending ? `still waiting for ${name}` : `couldn't refresh${reason ? `${NB}— ${reason}` : ""}`;
  const clock = eatClock(s.at, i.now);

  // ⛔ PAST THE TTL THE GATE ITSELF TREATS THE FIGURE AS UNKNOWN, so the headline does too: a dash, the old figure in
  // the note and its time on the provenance line. Unknown is not low, so on an expired reading under the floor invites
  // are SENDING AGAIN and eat the credit login codes need: danger with "top up now" (final visual review, 2026-09-27),
  // but never the word "paused" — the floor is not refusing on it. A low one keeps its word and warning ink.
  if (s.stale) {
    const belowFloor = s.tzs < i.thresholds.floorTzs;
    const low = !belowFloor && s.tzs <= i.thresholds.alertTzs;
    const act = belowFloor ? [...(pending ? [] : ["invites are sending again"]), "top up now"] : low ? ["top up soon"] : [];
    return {
      value: "—",
      tone: dead || belowFloor ? "danger" : low || !pending ? "warning" : undefined,
      // A dead rail's sentence already says why nothing was refreshed; the line keeps the time and the old figure.
      provenance: `Last read ${clock}${SEP}${dead ? `was ${amount(s.tzs)}` : refresh}`,
      note: dead?.note ?? [`Was ${amount(s.tzs)}${belowFloor ? ", below floor" : low ? ", low" : ""}`, ...act].join(SEP),
      ...(dead?.vars ? { vars: dead.vars } : {}),
      caption: facts,
    };
  }

  // ⛔ A figure this render could not confirm is shown WITH ITS TIME, never as today's credit — on its own line under
  // the figure, never at the tail of the state sentence.
  const confirmed = i.read !== null && (i.read.outcome === "fresh" || i.read.outcome === "reused");
  const compact = s.tzs >= COMPACT_FROM;
  const lastRead = confirmed ? null : dead ? `last read ${clock}` : `last read ${clock}${SEP}${refresh}`;
  const told = [compact ? amount(s.tzs) : null, lastRead].filter((x): x is string => x !== null);
  const provenance = told.length ? sentence(told.join(SEP)) : undefined;

  // The gate's own flags: below the floor it IS refusing invite and notice SMS right now. The floor is named, as the
  // bell and the email that link here name it.
  const floorAt = amount(i.thresholds.floorTzs);
  const level = s.belowFloor
    ? `Below the ${floorAt} floor${NB}— invites paused, login codes still send${SEP}top up ${name} now`
    : s.belowAlert
      ? `Low${NB}— top up ${name} soon${SEP}invites pause below ${floorAt}`
      : null;
  const levelTone: SmsCreditTile["tone"] = s.belowFloor ? "danger" : s.belowAlert ? "warning" : undefined;

  // ⛔ NEVER "HEALTHY" WHILE SENDS FAIL (2026-09-27): a rejected sender ID leaves the balance readable while nothing
  // goes out. Danger when nothing was accepted at all.
  const h = i.health;
  const failing = h.successRate !== null && h.failed > 0 && h.successRate < FAILING_BELOW;
  const noneOut = failing && h.sent === 0;
  const sendsFailing = failing
    ? `Sends failing${NB}— ${keep(`${formatNumber(h.failed)} of ${formatNumber(h.sent + h.failed)} failed`)} ${SINCE}${noneOut ? `${SEP}none accepted, login codes included` : ""}${SEP}check ${name}`
    : null;

  // "Healthy" only on a confirmed figure, and with the line it is measured against (sms.ts's "alert at TZS 150").
  // A figure that is fine but unconfirmed says so on the provenance line alone.
  const said = [level, sendsFailing].filter((x): x is string => x !== null);
  const note = dead?.note ?? (said.length ? said.join(SEP) : confirmed ? `Healthy${SEP}alert at ${amount(i.thresholds.alertTzs)}` : undefined);
  const tone: SmsCreditTile["tone"] = dead || noneOut ? "danger" : levelTone ?? (failing ? "warning" : undefined);
  const value = s.tzs >= COMPACT_FROM ? keep(formatTzsCompact(s.tzs)) : amount(s.tzs);
  return { value, tone, provenance, note, ...(dead?.vars ? { vars: dead.vars } : {}), caption: facts };
}
