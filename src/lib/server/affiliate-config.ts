/**
 * Affiliate / referral program config — the admin money-lever.
 *
 * One global config object: a service-level `enabled` pause plus three independently-toggleable
 * reward modes (commission / bonus / prize), each with its own rates, amounts and caps. Every
 * mutation is HMAC-audited for the GBT inspector trail, and the object is DB-persisted + cached
 * across hot-reloads by the shared `defineConfig` factory (same eager write-through hydration +
 * ADMIN `{ before, after, changes }` audit as bonus/proposals). The affiliate-specific pieces are the
 * deep `merge` for its nested modes and the rules in `@/lib/affiliate-rules`.
 *
 * Brand/compliance note: referral rewards are a regulated inducement under Gaming Board of
 * Tanzania guidance — the Owner switches payment on only after the structure is cleared.
 *
 * ⛔ THIS IS NOT WHAT DECIDES WHETHER A PLAYER IS PAID (since 2026-09-25, and since 2026-09-26 by the
 * Owner's switch). `policyFor` asks the OWNER'S "Payable / Not payable" switch first
 * (`invite-rewards-switch.ts`, composed under the code/env ceiling in `feature-state.ts`) and refuses
 * every PLAYER accrual while it says Not payable — whatever these values say. Not payable is the
 * default and every failure mode. The values here are the amounts the switch pays WHEN it is on, and
 * `/admin/affiliate` locks them while it is off. See docs/PLAYER-INVITE-UNPAID.md §4/§12. Agent
 * commission is not read from here at all (agent-config.ts).
 *
 * ⛔ A ROW CANNOT SMUGGLE A VALUE IN ANY MORE. Saves are TYPE-validated (`validateAffiliateConfig`:
 * whole shillings, a whole-percent rate ≤ 50%, a 1–60 month window) and a persisted row is repaired
 * field by field on load (`sanitizePersistedAffiliateConfig`, where a bad field falls back to the value
 * that PAYS LEAST, never to the shipped prize) — `defineConfig` itself merges a restored row
 * unchecked, which is how `feeVatRatePct` once reached production as 0.
 */
import { defineConfig } from "./define-config";
import {
  DEFAULT_AFFILIATE_CONFIG,
  AFFILIATE_SECTIONS,
  affiliateSectionKeys,
  retiredDepositModes,
  sanitizePersistedAffiliateConfig,
  validateAffiliateConfig,
  type AffiliateConfig,
  type AffiliateSection,
} from "../affiliate-rules";

export type { AffiliateConfig, BonusRecipient, BonusTrigger, PrizeMilestone } from "../affiliate-rules";
export { DEFAULT_AFFILIATE_CONFIG } from "../affiliate-rules";

const AFFILIATE_CONFIG_KEY = "affiliate.config";

export type InviteTrigger = "SIGNUP" | "FIRST_BET";

declare global {
  // eslint-disable-next-line no-var
  var __50PICK_AFFILIATE_ROW_RETIRED: { bonus: boolean; prize: boolean } | undefined;
}

/**
 * ⛔ WHAT THE STORED ROW ITSELF ARMED, AS IT WAS LAST READ (2026-09-26). A row that still arms a retired
 * deposit-tied mode (`FIRST_DEPOSIT`, `DEPOSIT_THRESHOLD`) loads with that mode switched OFF, so the
 * config in hand pays nothing — but it can no longer SAY a deposit mode was armed, and the deposit hook
 * must refuse such a row out loud, audited, until a Save rewrites it. Noted on every read of the row
 * (boot hydration, `reload`, `setVerified`'s read-back), on `globalThis` beside the registry it describes.
 */
function noteRowRetiredModes(persisted: unknown): void {
  globalThis.__50PICK_AFFILIATE_ROW_RETIRED = retiredDepositModes(persisted);
}

/** A partial update: any top-level field, and any subset of a mode's fields. */
export type AffiliateConfigUpdate = { [K in keyof AffiliateConfig]?: AffiliateConfig[K] extends object ? Partial<AffiliateConfig[K]> : AffiliateConfig[K] };

const isObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);

/**
 * ⭐ KEY BY KEY, OFF THE RULE TABLE — never `{ ...section }`. A spread copies whatever keys the object
 * carries, so a stray field in a posted form (or in a hand-edited row) would ride into the registry
 * and back out to the database. The keys come from `affiliateSectionKeys`, which the compiler holds
 * to `keyof AffiliateConfig[section]`.
 */
function cloneSection<S extends AffiliateSection>(section: S, from: AffiliateConfig[S]): AffiliateConfig[S] {
  const src = from as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const key of affiliateSectionKeys(section)) out[String(key)] = src[String(key)];
  return out as unknown as AffiliateConfig[S];
}

function deepClone(c: AffiliateConfig): AffiliateConfig {
  return {
    enabled: c.enabled,
    commission: cloneSection("commission", c.commission),
    bonus: cloneSection("bonus", c.bonus),
    prize: cloneSection("prize", c.prize),
  };
}

/**
 * Deep-merge a partial update onto the current config, KNOWN KEYS ONLY. A value of the wrong TYPE
 * is merged as sent and then refused by `validateAffiliateConfig` — the merge does not guess.
 */
function mergeConfig(base: AffiliateConfig, u: AffiliateConfigUpdate): AffiliateConfig {
  const upd: Record<string, unknown> = isObject(u) ? u : {};
  const merged = deepClone(base);
  if (upd.enabled !== undefined) (merged as { enabled: unknown }).enabled = upd.enabled;
  for (const section of AFFILIATE_SECTIONS) {
    const part = upd[section];
    if (!isObject(part)) continue;
    const target = merged[section] as Record<string, unknown>;
    for (const key of affiliateSectionKeys(section)) {
      const v = part[String(key)];
      if (v !== undefined) target[String(key)] = v;
    }
  }
  return merged;
}

// The shared factory owns the globalThis cache, eager DB hydration, write-through persistence and
// the ADMIN `{ before, after, changes }` audit. Getters are sync (58 call sites), matching the factory.
const _config = defineConfig<AffiliateConfig, AffiliateConfigUpdate>({
  key: AFFILIATE_CONFIG_KEY,
  defaults: DEFAULT_AFFILIATE_CONFIG,
  validate: validateAffiliateConfig,
  /* ⛔ THE LOAD IS REPAIRED, NOT TRUSTED — see `sanitizePersistedAffiliateConfig`. `defineConfig`
     merges `{ ...defaults, ...restored }` shallowly and unchecked; this hands it a complete, typed
     object instead. ⭐ And it NOTES what the row itself armed first (`noteRowRetiredModes`), because
     the repair switches a retired deposit-tied mode off and the config in hand can no longer say so. */
  migrate: (persisted) => {
    noteRowRetiredModes(persisted);
    return sanitizePersistedAffiliateConfig(persisted);
  },
  audit: { action: "affiliate.config.updated", targetType: "AffiliateConfig" },
  merge: (current, updates) => mergeConfig(current, updates),
});

/** Sync read. Deep-cloned so a caller can't mutate a nested mode in the cache. */
export function getAffiliateConfig(): AffiliateConfig {
  return deepClone(_config.get());
}

/**
 * The SYNCHRONOUS save — `set()` persists fire-and-forget. Kept for the existing test and dev-route
 * callers, which configure on the first tick with no database.
 * ⛔ Not for an officer: a failed write here still reports success. The console saves through
 * `setAffiliateConfigVerified`, via `saveInviteRewardSettings` (`invite-rewards-ceremony.ts`).
 */
export function setAffiliateConfig(updates: AffiliateConfigUpdate, officerId: string):
  | { ok: true; config: AffiliateConfig }
  | { ok: false; error: string } {
  return _config.set(updates, officerId);
}

/**
 * 🔴 THE OFFICER SAVE — persists, READS THE ROW BACK, and only then caches, audits and reports
 * success (`define-config.ts` → `setVerified`). A "Saved" that did not land is how an officer ends
 * up saving the same field twice and trusting neither.
 * ⛔ Called by the console only through `invite-rewards-ceremony.ts`, under the switch's lock, so a
 * save and a Payable / Not payable change cannot interleave.
 */
export function setAffiliateConfigVerified(updates: AffiliateConfigUpdate, officerId: string):
  Promise<{ ok: true; config: AffiliateConfig } | { ok: false; error: string }> {
  return _config.setVerified(updates, officerId);
}

/**
 * ⭐ THE MONEY PATH'S CONFIG READ — re-read `affiliate.config` from its row NOW, replace this
 * container's cache with it, and return it (`define-config.ts` → `reload`: the same sanitize-on-load
 * as hydration, so a bad field still falls back to the value that pays least).
 *
 * 🔴 WHY. This container's cache is the config it BOOTED with. When the Owner makes invites payable
 * with "Nothing yet" on another container — or the growth officer saves there — this one would read
 * the switch fresh and still price from its old cache: the shipped prize ON at TZS 10,000.
 * ⛔ `ok: false` (the row could not be read) means REFUSE the accrual — never pay from the cache.
 * ⛔ AND SO DOES `stored: false` ON THE MONEY PATH (review, 2026-09-26): the store has NO row, and the
 * config answered is the shipped defaults — prize ON at TZS 10,000 — which nobody chose. The page and the
 * ceremony may still start from the defaults (a first Save or Make payable writes the row).
 * ⛔ CALL IT ONLY AFTER THE SWITCH HAS SAID PAYABLE, so an unpaid platform never pays for the read.
 * With no database it reads nothing: the cache is the store.
 */
export async function reloadAffiliateConfig(): Promise<{ ok: true; config: AffiliateConfig; stored: boolean } | { ok: false; error: string }> {
  const fresh = await _config.reload();
  return fresh.ok ? { ok: true, config: deepClone(fresh.config), stored: fresh.stored } : { ok: false, error: fresh.error };
}

/**
 * ⛔ DOES ANYTHING STILL ARM A RETIRED DEPOSIT-TIED MODE? — for the deposit hook's audited refusal
 * (2026-09-26, the RG policy's "No bonus offers tied to deposit increases"). True for a mode when EITHER
 * the stored row, as last read, armed it (the load has already switched it off in the config in hand) OR
 * the config in hand itself still spells it (something bypassed the load's repair). Answering it costs no
 * read. ⛔ It only decides what is AUDITED: a deposit pays no referral reward whatever this says.
 */
export function armedRetiredDepositModes(): { bonus: boolean; prize: boolean } {
  const inHand = retiredDepositModes(_config.get());
  const row = globalThis.__50PICK_AFFILIATE_ROW_RETIRED ?? { bonus: false, prize: false };
  return { bonus: inHand.bonus || row.bonus, prize: inHand.prize || row.prize };
}
