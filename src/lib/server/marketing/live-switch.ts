/**
 * U37b · THE ONE LIVE-SEND SWITCH (DECISIONS X14) — the SystemConfig row `marketing.sms.live` = { enabledBy, enabledAt },
 * and the one rule every marketing-purpose send asks before anything is minted, written or handed to a carrier.
 *
 * ⛔ ABSENT MEANS CLOSED. So does a read that failed, and so does a row that is not exactly { enabledBy, enabledAt }: an
 * unreadable switch is a closed switch, never a guess. There is NO WRITER in this repository, and this module adds none —
 * opening it is owner gate G1, Ali's own act, and from then on every test send costs a real SMS (G3).
 *
 * ⭐ WHAT PASSES WHILE IT IS CLOSED: only the console stub (`SMS_PROVIDER=console` on a dev box) — it reaches no handset
 * and costs no money, so a local drive can photograph a test that was handed over. A real carrier passes only when the
 * row is recorded. In production the console stub is a dead rail (`smsRailProblem` → "console-in-production"), which the
 * test send refuses before it ever asks this gate.
 *
 * ⚠️ OWED DOWNSTREAM: U42's enqueue and U43's slice ask this same gate before their own `dispatchSlice` — one switch, not
 * one per caller.
 *
 * Guard: `npm run test:campaign-compose` §18 (the reader, the gate, and a real carrier with the row absent).
 */
import { loadConfigResult } from "@/lib/server/config-store";
import type { SmsProviderResolution } from "@/lib/server/sms";

/** The SystemConfig key. ⛔ Never a phone number or an id in it — a key is not data anybody can erase. */
export const MARKETING_LIVE_SWITCH_KEY = "marketing.sms.live";

export type MarketingLiveSwitch =
  | { state: "open"; enabledBy: string; enabledAt: string }
  | { state: "closed"; why: "absent" | "unreadable" | "malformed" };

/** What the reader is handed: `loadConfigResult`'s answer — whether the store answered, and what it held. */
export type MarketingLiveSwitchLoad = (key: string) => Promise<{ ok: true; value: unknown } | { ok: false; error: string }>;

/** An instant as `toISOString()` writes it (milliseconds optional): anything looser is not a recorded decision. */
const RECORDED_INSTANT = /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:[.][0-9]{1,3})?Z$/;

/**
 * Read the switch. ⛔ Fails CLOSED on every path that is not a well-formed recorded row: no database, no row, a read that
 * threw or did not land, a value that is not an object, any key beside the two, a blank `enabledBy`, an `enabledAt` that
 * is not an instant.
 */
export async function readMarketingLiveSwitch(load: MarketingLiveSwitchLoad = loadConfigResult): Promise<MarketingLiveSwitch> {
  let read: Awaited<ReturnType<MarketingLiveSwitchLoad>>;
  try {
    read = await load(MARKETING_LIVE_SWITCH_KEY);
  } catch {
    return { state: "closed", why: "unreadable" };
  }
  if (!read.ok) return { state: "closed", why: "unreadable" };
  const value = read.value;
  if (value === null || value === undefined) return { state: "closed", why: "absent" };
  if (typeof value !== "object" || Array.isArray(value)) return { state: "closed", why: "malformed" };
  const row = value as Record<string, unknown>;
  // ⛔ EXACTLY THE TWO KEYS (U37b review m3). A row that also carries `enabled: false` or a `disabledAt` is somebody
  // recording a CLOSE in the only shape there is — it reads closed, never open on the two fields it still holds.
  const keys = Object.keys(row).sort();
  if (keys.length !== 2 || keys[0] !== "enabledAt" || keys[1] !== "enabledBy") return { state: "closed", why: "malformed" };
  const enabledBy = typeof row.enabledBy === "string" ? row.enabledBy.trim() : "";
  const enabledAt = typeof row.enabledAt === "string" ? row.enabledAt.trim() : "";
  if (enabledBy === "" || !RECORDED_INSTANT.test(enabledAt) || !Number.isFinite(Date.parse(enabledAt))) {
    return { state: "closed", why: "malformed" };
  }
  return { state: "open", enabledBy, enabledAt };
}

export type MarketingLiveGate = { ok: true; via: "stub" | "open" } | { ok: false; reason: "live_sends_closed" };

/**
 * ⭐ THE GATE: the console stub always (no handset, no money); a real carrier only when the switch is recorded open;
 * anything else — an unrecognised provider — never.
 */
export function marketingLiveGate(provider: SmsProviderResolution, live: MarketingLiveSwitch): MarketingLiveGate {
  if (provider === "console") return { ok: true, via: "stub" };
  if (provider === "blackball" && live.state === "open") return { ok: true, via: "open" };
  return { ok: false, reason: "live_sends_closed" };
}
