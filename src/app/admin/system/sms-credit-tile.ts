/**
 * ⭐ THE SMS CREDIT TILE ON /admin/system, AS DATA (2026-09-26, owner ruling D7). A pure function so
 * `test:sms-cost-guard` §9 can drive every state without rendering the page.
 *
 * 🔴 WHAT IT REPLACED. The tile was "SMS provider": its headline was the delivery rate ("Idle"), the balance was an
 * unlabelled "TZS 185" at the tail of the smallest text on the card, an unreadable balance was simply left out, a
 * stale one was shown as today's, low credit was a grey arrow, and below the floor it wore the aqua "live" badge.
 * At 360 the caption broke as "blackball · 0" / "sent · TZS 185", which reads as money sent.
 *
 * The rule now: the CREDIT is the headline, and the caption says the state in words (healthy, low, below floor,
 * couldn't read — and why — or last read at a time). A figure past the TTL, which the gate itself treats as unknown,
 * is headlined as a dash with the old figure and its time in the caption. Amounts, "N sent", "98.0% ok"
 * and "14:02 EAT" never break inside; each " · " separator stays with the fact after it, so no line ends on a dot.
 * ⛔ No pulse ("live" is the live-feed signal) and no arrow (an arrow claims a movement).
 */
import { formatTzs } from "@/lib/utils";
import type { SmsBalanceRead } from "@/lib/server/sms";

const NB = String.fromCharCode(0xa0);
/** Breaks may fall BEFORE the dot, never after it. */
const SEP = ` ·${NB}`;
/** One fact that must not break inside. */
const keep = (s: string) => s.replace(/ /g, NB);
const amount = (tzs: number) => keep(formatTzs(tzs));

/** The display name, never the transport slug (§L1 L2). */
const PROVIDER_LABEL: Record<string, string> = { blackball: "Blackball", console: "Console (dev)", unrecognised: "Unknown provider" };

/** Why an unknown balance is unknown, in words — or nothing when the read said nothing. The balance read is the one
 *  free live credential check, so wrong keys must not look like an outage. */
function unknownBecause(read: SmsBalanceRead | null, provider: string, name: string): string | null {
  if (read === null) return null;
  if (read.outcome === "pending") return `still waiting for ${name}`;
  if (read.outcome === "unavailable") return provider === "unrecognised" ? "SMS provider not recognised" : `no balance read on ${name}`;
  if (read.outcome !== "failed") return null;
  if (read.error === "refused") return `${name} refused our credentials`;
  if (read.error === "not-configured") return `${name} keys not set`;
  return `no answer from ${name}`;
}

const EAT_DAY = new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Dar_es_Salaam", day: "numeric", month: "short" });
const EAT_CLOCK = new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Dar_es_Salaam", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
/** "14:02 EAT", or "25 Sep 14:02 EAT" for a reading from another day. */
export function eatClock(ms: number, now = Date.now()): string {
  const d = new Date(ms);
  const day = EAT_DAY.format(d);
  const prefix = day === EAT_DAY.format(new Date(now)) ? "" : `${keep(day)} `;
  return `${prefix}${keep(`${EAT_CLOCK.format(d)} EAT`)}`;
}

export type SmsCreditTileInput = {
  /** `sms.name` — the resolved provider slug. */
  provider: string;
  /** What this render's refresh knew; null only if it threw (it is documented never to). */
  read: SmsBalanceRead | null;
  /** `smsBalanceSnapshot()` after the refresh — the gate's own reading. */
  snapshot: { tzs: number | null; at: number | null; stale: boolean; belowAlert: boolean; belowFloor: boolean };
  health: { sent: number; successRate: number | null };
  thresholds: { floorTzs: number; alertTzs: number };
  now?: number;
};

export type SmsCreditTile = { value: string; tone?: "danger" | "warning"; caption: string };

export function smsCreditTile(i: SmsCreditTileInput): SmsCreditTile {
  const s = i.snapshot;
  const name = PROVIDER_LABEL[i.provider] ?? i.provider;
  // Unknown: a dash and the words, never a blank and never zero (§C2) — and why, when the read said.
  if (s.tzs === null || s.at === null) {
    const why = unknownBecause(i.read, i.provider, name);
    return { value: "—", caption: `Couldn't read the balance${SEP}not zero${why ? `${SEP}${why}` : ""}` };
  }

  // ⛔ PAST THE TTL THE GATE ITSELF TREATS THE FIGURE AS UNKNOWN, so the headline does too: a dash, and the old
  // figure in the caption with its time. A low one keeps its word and warning ink, never the danger of "paused" —
  // the floor is not refusing on it.
  if (s.stale) {
    const was = s.tzs < i.thresholds.floorTzs ? ", below floor" : s.tzs <= i.thresholds.alertTzs ? ", low" : "";
    return {
      value: "—",
      tone: was ? "warning" : undefined,
      caption: `Last read ${eatClock(s.at, i.now)}${SEP}was ${amount(s.tzs)}${was}${SEP}couldn't refresh`,
    };
  }

  // ⛔ A figure this render could not confirm is shown WITH ITS TIME, never as today's credit.
  const confirmed = i.read !== null && (i.read.outcome === "fresh" || i.read.outcome === "reused");
  const lastRead = (first: "Last" | "last") => `${first} read ${eatClock(s.at!, i.now)}${SEP}couldn't refresh`;

  // The gate's own flags: below the floor it IS refusing invite and notice SMS right now.
  const level = s.belowFloor
    ? `Below floor${NB}— invites paused, login codes still send${SEP}top up now`
    : s.belowAlert
      ? `Low${NB}— top up soon${SEP}alert at ${amount(i.thresholds.alertTzs)}`
      : null;
  const tone: SmsCreditTile["tone"] = s.belowFloor ? "danger" : s.belowAlert ? "warning" : undefined;

  let caption: string;
  if (level) {
    caption = confirmed ? level : `${level}${SEP}${lastRead("last")}`;
  } else if (!confirmed) {
    caption = lastRead("Last");
  } else {
    // D7's healthy word first. The counters live in this process: "since restart" says so, and "idle" is no
    // longer a headline.
    const rate = i.health.successRate;
    caption = rate === null
      ? `Healthy${SEP}${name}${SEP}idle since restart`
      : `Healthy${SEP}${name}${SEP}${keep(`${(rate * 100).toFixed(1)}% ok`)}${SEP}${keep(`${i.health.sent} sent`)} since restart`;
  }
  return { value: amount(s.tzs), tone, caption };
}
