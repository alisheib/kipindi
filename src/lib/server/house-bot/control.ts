/**
 * FRESH READS FOR THE ENGINE — the master switch, maintenance, the bot and its holder (PLAN §4.1, F5 steps 1–4,
 * 04 A3, F7).
 *
 * ⛔ FRESH, AND FAILING CLOSED (PLAN I5). Fire re-checks everything a decision assumed before it touches the seam.
 * Every read here either answers or throws; a throw is the caller's transient requeue, never a stake.
 *
 * ⛔ ONE HOLDER SNAPSHOT. `holderCauses` (`consent.ts`) is the only definition of "this holder can't provide
 * liquidity right now". The snapshot below is built field for field as `eligibility.ts` builds it, so Start, the
 * strip and fire can never disagree about a cause.
 *
 * ⛔ MAINTENANCE THROUGH `loadConfigResult` (04 F7). `getPlatformConfig` latches its first read in a module flag and
 * cannot tell "not stored" from "could not ask". Fire reads the row itself: an unreadable config throws. A stored
 * config is interpreted as the player path interprets it (a row without `timezone` falls back to the defaults),
 * so fire never refuses a stake the bet path would take, or the reverse. The seam's own maintenance check still
 * runs inside the bet.
 */
import { db } from "../store";
import { loadConfigResult } from "../config-store";
import { PLATFORM_CONFIG_KEY, type PlatformConfig } from "../platform-config";
import { getRgSettings, checkLossLimit } from "../responsible-gambling";
import { openErasureRequest } from "../privacy";
import { passwordFingerprint } from "../password-reset";
import { houseBotControlStore, houseBotStore, type StoredHouseBot, type StoredHouseBotControl } from "../house-bot-dal";
import { consentValid, holderCauses, type HolderSnapshot } from "@/lib/house-bot/consent";
import type { HolderCause } from "@/lib/house-bot/pause-reasons";
import { isFinalRefusal } from "@/lib/kyc-refusal";

export async function readControl(): Promise<StoredHouseBotControl> {
  return houseBotControlStore.get();
}

/** F7: maintenance as the bet path sees it, or a throw when the config row cannot be read. */
export async function maintenanceOn(): Promise<boolean> {
  const res = await loadConfigResult<PlatformConfig>(PLATFORM_CONFIG_KEY);
  if (!res.ok) throw new Error(`house-bot: platform config unreadable — ${res.error}`);
  const stored = res.value;
  return !!stored?.timezone && stored.maintenanceMode === true;
}

const DAY_MS = 86_400_000;

export type BotAndHolder =
  | { found: false; missing: "BOT" | "ACCOUNT" }
  | {
      found: true;
      bot: StoredHouseBot;
      snapshot: HolderSnapshot;
      causes: HolderCause[];
      /** `consentValid` — the fingerprint matches and no void stands (A3). */
      consentOk: boolean;
      /** Null only when the wallet read itself failed. */
      walletBalance: number | null;
    };

/**
 * The bot and its holder, read fresh. `ownerLossStakeTzs` asks the holder's own loss limit about a stake of that
 * size (the OWNER_LOSS_LIMIT cause); without it the cause is never raised here.
 */
export async function readBotAndHolder(botId: string, opts: { ownerLossStakeTzs?: number | null; nowMs?: number } = {}): Promise<BotAndHolder> {
  const nowMs = opts.nowMs ?? Date.now();
  const bot = await houseBotStore.get(botId);
  if (!bot) return { found: false, missing: "BOT" };
  const user = await db.user.findById(bot.userId);
  if (!user) return { found: false, missing: "ACCOUNT" };
  const wallet = await db.wallet.findByUserId(bot.userId);
  const rg = await getRgSettings(bot.userId);
  const kyc = await db.kyc.findByUserId(bot.userId);
  // Ruling 130 · the durable queue, awaited; a failed read throws (fire requeues, the sweep retries).
  const erasure = (await openErasureRequest(bot.userId)) != null;
  let ownerLossBlocked = false;
  if (opts.ownerLossStakeTzs != null && opts.ownerLossStakeTzs > 0) {
    ownerLossBlocked = !(await checkLossLimit(bot.userId, opts.ownerLossStakeTzs)).allowed;
  }
  const fingerprintNow = passwordFingerprint(user.passwordHash);
  const snapshot: HolderSnapshot = {
    bot,
    fingerprintNow,
    user: { role: user.role, status: user.status, closedAt: user.closedAt ?? null, passwordSetAt: user.passwordSetAt ?? null, passwordSetVia: user.passwordSetVia ?? null },
    wallet: wallet ? { status: wallet.status, freezeReasons: wallet.freezeReasons ?? null } : null,
    rg: { selfExclusionUntil: rg.selfExclusionUntil ?? null, coolingOffUntil: rg.coolingOffUntil ?? null },
    erasureRequestOpen: erasure,
    identityRefused: !!kyc && kyc.status === "REJECTED" && isFinalRefusal(kyc.rejectReason),
    ownerLossLimit: { blocked: ownerLossBlocked, freesAt: ownerLossBlocked ? new Date(nowMs + DAY_MS).toISOString() : null },
    nowMs,
  };
  return {
    found: true,
    bot,
    snapshot,
    causes: holderCauses(snapshot),
    consentOk: consentValid(bot, fingerprintNow),
    walletBalance: wallet ? wallet.balance : null,
  };
}
