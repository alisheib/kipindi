"use server";

import { safeError } from "@/lib/server/safe-error";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { currentSession } from "@/lib/server/auth-service";
import { db } from "@/lib/server/store";
import { type AdminDomain } from "@/lib/server/roles";
import { requireStaff } from "@/lib/server/rbac-guard";
import { CONTROL_DOMAIN, type ControlId } from "@/lib/server/control-gates";
import { findProvider, type FeedProviderId } from "@/lib/updown-providers";
import {
  createAsset, updateAsset, setAssetEnabled,
  createChain, updateChain, setChainState,
  setUpDownConfig,
  ALLOWED_DURATIONS, type Duration,
  archiveChain, unarchiveChain, deleteChain,
} from "@/lib/server/updown-config";
import { voidRoundByOperator, generateRoundNow } from "@/lib/server/updown-service";
import type { ChainState } from "@/lib/server/updown-dal";
import type { MarketCategory } from "@/lib/server/market-service";

/**
 * TWO TIERS, deliberately different — see docs/UPDOWN-ARCHITECTURE.md §10.
 *
 *  · CONFIG_ROLES (ADMIN/COMPLIANCE, never MODERATOR) — the asset registry, the rate
 *    profile and the thresholds. These change ECONOMICS: the fee a round freezes, and
 *    the price source real money is settled against.
 *  · MARKET_OPS_ROLES (adds MODERATOR) — starting, pausing and stopping a chain. That
 *    is operational: it changes whether rounds are emitted, not what they are worth.
 *
 * Widening either tier re-grants authority everywhere it is imported. Keep them tight.
 */
// RBAC: economics config (asset registry, rate profile, thresholds, price source) is
// money-grade → `accounting`; chain start / pause / stop is operational → `trading`.
// requireStaff enforces the role's canAct for the domain (Owner/ADMIN bypass), audits
// a blocked attempt, then step-up 2FA. Mirrors the old CONFIG vs MARKET_OPS split.
/**
 * ⛔ E-27. Every CONFIG-tier control on this page names itself, and takes its domain from
 * `CONTROL_DOMAIN` rather than a literal here. Two things were wrong before, and they are
 * different problems with the same cause — the domain living in this file only:
 *
 *  1. **The page could not ask the question the action would ask.** `/admin/updown` is a
 *     `trading` route, so a MODERATOR saw "+ Add asset", the reading-method switch and
 *     "Save thresholds" fully armed, and every one of them bounced. Proven on production
 *     2026-08-01 as the QA trading officer: the control armed, `Save reading method`
 *     enabled, the click refused, `updown.config` unchanged — **with no visible refusal**.
 *  2. **The audit trail could not name the control.** `ensure(domain)` dropped
 *     `requireStaff`'s second argument, so the SECURITY row read
 *     `{"role":"MODERATOR","action":null,"domain":"accounting"}` — a compliance officer
 *     reading the log learns that a moderator tried to act on *accounting*, but not on
 *     WHICH control. The pre-migration path recorded `targetId: recheckMarketNow`; moving
 *     to `requireStaff` silently lost that.
 *
 * The domain assignment itself is UNCHANGED and deliberately so — `docs/UPDOWN-
 * ARCHITECTURE.md` §10 says CONFIG_ROLES, "never MODERATOR — it changes economics".
 */
async function ensure(domain: AdminDomain, control?: ControlId) {
  return requireStaff(domain, control);
}

/** Chain start / pause / stop — operational, and genuinely this route's own domain. */
const ensureOps = () => ensure("trading");

const refresh = () => revalidatePath("/admin/updown");

const num = (fd: FormData, k: string): number | undefined => {
  const raw = String(fd.get(k) ?? "").trim();
  if (raw === "") return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
};

// ── Assets (CONFIG tier — the source real money resolves against) ────────────

export async function createAssetAction(formData: FormData) {
  const session = await ensure(CONTROL_DOMAIN.createAsset, "createAsset");
  try {
    const r = await createAsset({
      key: String(formData.get("key") ?? ""),
      symbol: String(formData.get("symbol") ?? ""),
      nameEn: String(formData.get("nameEn") ?? ""),
      nameSw: String(formData.get("nameSw") ?? ""),
      nameZh: String(formData.get("nameZh") ?? "") || null,
      iconKey: String(formData.get("iconKey") ?? "gold"),
      priceSourceUrl: String(formData.get("priceSourceUrl") ?? ""),
      category: (String(formData.get("category") ?? "macro") || "macro") as MarketCategory,
      decimals: num(formData, "decimals"),
      minMoveTicks: num(formData, "minMoveTicks"),
      sortOrder: num(formData, "sortOrder"),
    }, session.userId);
    if (!r.ok) return { ok: false as const, error: r.error };
    refresh();
    return { ok: true as const };
  } catch (err) {
    return { ok: false as const, error: safeError(err, "Create asset failed") };
  }
}

export async function updateAssetAction(formData: FormData) {
  const session = await ensure(CONTROL_DOMAIN.updateAsset, "updateAsset");
  const id = String(formData.get("id") ?? "");
  try {
    const r = await updateAsset(id, {
      symbol: String(formData.get("symbol") ?? "") || undefined,
      nameEn: String(formData.get("nameEn") ?? "") || undefined,
      nameSw: String(formData.get("nameSw") ?? "") || undefined,
      priceSourceUrl: String(formData.get("priceSourceUrl") ?? "") || undefined,
      decimals: num(formData, "decimals"),
      minMoveTicks: num(formData, "minMoveTicks"),
    }, session.userId);
    if (!r.ok) return { ok: false as const, error: r.error };
    refresh();
    return { ok: true as const };
  } catch (err) {
    return { ok: false as const, error: safeError(err, "Update asset failed") };
  }
}

export async function toggleAssetAction(formData: FormData) {
  const session = await ensure(CONTROL_DOMAIN.toggleAsset, "toggleAsset");
  const id = String(formData.get("id") ?? "");
  const enabled = String(formData.get("enabled") ?? "false") === "true";
  try {
    // The service re-checks the trusted source on enable and refuses to disable an
    // asset with a running chain. Both refusals surface to the operator as-is.
    const r = await setAssetEnabled(id, enabled, session.userId);
    if (!r.ok) return { ok: false as const, error: r.error };
    refresh();
    return { ok: true as const };
  } catch (err) {
    return { ok: false as const, error: safeError(err, "Toggle asset failed") };
  }
}

// ── Chains (OPS tier — whether rounds are emitted) ───────────────────────────

export async function createChainAction(formData: FormData) {
  const session = await ensureOps();
  const assetId = String(formData.get("assetId") ?? "");
  const duration = Number(formData.get("durationMinutes") ?? 0);
  if (!ALLOWED_DURATIONS.includes(duration as Duration)) {
    return { ok: false as const, error: `Duration must be one of ${ALLOWED_DURATIONS.join(", ")} minutes.` };
  }
  try {
    // ⭐ THE BAND ARRIVES AS BASIS POINTS FROM A DROPDOWN, not as a typed percentage.
    // ⚠️ `marginPct` is still accepted so an older open tab, or the chain-EDIT form, keeps
    // working — dropping it would make a stale page silently create a chain at the default
    // rather than at the band the operator picked. New submissions send `marginBpsChoice`.
    const bpsChoice = num(formData, "marginBpsChoice");
    const marginPct = num(formData, "marginPct");
    const marginBps = bpsChoice != null ? Math.round(bpsChoice)
      : marginPct != null ? Math.round(marginPct * 100)
      : null;
    const r = await createChain({
      assetId,
      durationMinutes: duration as Duration,
      minStake: num(formData, "minStake") ?? null,
      maxStake: num(formData, "maxStake") ?? null,
      // Blank = inherit the product default (which is now the tick floor).
      marginBps,
    }, session.userId);
    if (!r.ok) return { ok: false as const, error: r.error };
    refresh();
    return { ok: true as const };
  } catch (err) {
    return { ok: false as const, error: safeError(err, "Create chain failed") };
  }
}

export async function setChainStateAction(formData: FormData) {
  const session = await ensureOps();
  const id = String(formData.get("id") ?? "");
  const state = String(formData.get("state") ?? "") as ChainState;
  if (state !== "RUNNING" && state !== "PAUSED" && state !== "STOPPED") {
    return { ok: false as const, error: "Invalid chain state." };
  }
  try {
    const r = await setChainState(id, state, session.userId);
    if (!r.ok) return { ok: false as const, error: r.error };
    refresh();
    return { ok: true as const };
  } catch (err) {
    return { ok: false as const, error: safeError(err, "Chain state change failed") };
  }
}

/**
 * ⭐ ARCHIVE / UNARCHIVE / DELETE — Jay (Gaming Board) item #3.
 *
 * ⛔ `setChainStateAction` above deliberately REFUSES "ARCHIVED": archiving is not a run-state
 * change an operator makes with the start/pause/stop control, it is a filing decision with its
 * own precondition (the chain must not be running) and its own audit action. Letting it in
 * through that door would have made a fourth radio button out of a different kind of act.
 */
export async function archiveChainAction(formData: FormData) {
  const session = await ensureOps();
  const id = String(formData.get("id") ?? "");
  try {
    const r = await archiveChain(id, session.userId);
    if (!r.ok) return { ok: false as const, error: r.error };
    refresh();
    return { ok: true as const };
  } catch (err) {
    return { ok: false as const, error: safeError(err, "Archive failed") };
  }
}

export async function unarchiveChainAction(formData: FormData) {
  const session = await ensureOps();
  const id = String(formData.get("id") ?? "");
  try {
    const r = await unarchiveChain(id, session.userId);
    if (!r.ok) return { ok: false as const, error: r.error };
    refresh();
    return { ok: true as const };
  } catch (err) {
    return { ok: false as const, error: safeError(err, "Restore failed") };
  }
}

/**
 * 🔴 THE REFUSAL IS THE POINT OF THIS ACTION, NOT AN EDGE CASE. `UpDownRound.chain` is
 * `onDelete: Cascade`, so a chain with rounds cannot be deleted without erasing their
 * settlement record — the thing the Gaming Board audits. `deleteChain` counts the rounds,
 * refuses with the count and the remedy, and audits the ATTEMPT.
 */
export async function deleteChainAction(formData: FormData) {
  const session = await ensureOps();
  const id = String(formData.get("id") ?? "");
  try {
    const r = await deleteChain(id, session.userId);
    if (!r.ok) return { ok: false as const, error: r.error };
    refresh();
    return { ok: true as const };
  } catch (err) {
    return { ok: false as const, error: safeError(err, "Delete failed") };
  }
}

export async function updateChainAction(formData: FormData) {
  const session = await ensureOps();
  const id = String(formData.get("id") ?? "");
  try {
    const patch: { minStake: number | null; maxStake: number | null; marginBps?: number | null } = {
      minStake: num(formData, "minStake") ?? null,
      maxStake: num(formData, "maxStake") ?? null,
    };
    // Only touch the margin when the field is present, so a stake-only edit never
    // silently clears a chain's margin override. Blank-but-present = inherit (null).
    if (formData.has("marginPct")) {
      const marginPct = num(formData, "marginPct");
      patch.marginBps = marginPct != null ? Math.round(marginPct * 100) : null;
    }
    const r = await updateChain(id, patch, session.userId);
    if (!r.ok) return { ok: false as const, error: r.error };
    refresh();
    return { ok: true as const };
  } catch (err) {
    return { ok: false as const, error: safeError(err, "Update chain failed") };
  }
}

// ── Rounds (MONEY tier — this one hands real stakes back) ────────────────────

/**
 * Void a round and refund every stake in full — the operator's remedy for a round the
 * engine could not finish.
 *
 * FINDING E-23. `voidRoundByOperator` has existed since the subsystem shipped, audits
 * properly and refunds through the normal settlement path — and `grep -rn` found
 * exactly ONE reference to it: its own definition. No action, no button, no route. So
 * when E-24 stranded a stake, nobody on the platform could release it through the
 * product; the 1,395 historical `operator` voids must have come from a hand-run
 * script. A remedy that only exists in a script is not a remedy an operator has.
 *
 * ⛔ THE DOMAIN IS `trading`, and that is an EVIDENCED correction, not a default.
 * It first shipped as `compliance`, on the reasoning that stopping a chain changes
 * whether rounds are emitted whereas this hands money back. Driving it on production
 * proved that reasoning wrong in practice: `compliance` made the control Owner-only, so
 * the operator who actually runs Up & Down still could not reach the remedy — which is
 * the very defect E-23 is about. `test:control-gates` now pins the whole role matrix.
 * It is read from CONTROL_DOMAIN so the rounds page can ask the identical question
 * before it renders anything (E-18).
 *
 * ℹ️ MERGE NOTE (2026-08-01). `feat/updown-source-pinning-and-proposals` independently
 * gated this as CONFIG/`accounting` via `ensureConfig()`, reasoning that a MODERATOR who
 * may pause a chain must not be able to move a balance. That is a coherent position, but
 * it is the one production already disproved, and the live matrix is pinned by a guard —
 * so the gate below stands. What was taken from that branch is its stricter INPUT
 * validation (an explicit missing-id refusal and an upper bound on the reason).
 */
/**
 * ⭐ E-67 · GENERATE ONE ROUND. The control that replaced automatic emission.
 *
 * Ali, 2026-08-03: *"nothing should be by 50pick automatic — my admins will enter and generate
 * every 5 min… because sometimes we might not generate, other times we would."* All chains are
 * STOPPED; this is now the only way a round comes into existence.
 *
 * ⛔ NO CONFIRMATION TEXT IS DEMANDED, unlike `voidRoundAction`. Voiding hands a stake back and
 * is irreversible, so it makes an officer type a reason. Generating a round takes no money, is
 * undone by voiding the round it created, and is expected to happen every few minutes — a
 * confirmation dialog on a routine act trains people to click through dialogs.
 *
 * The refusals all live in `generateRoundNow` and are returned VERBATIM: an operator needs to
 * know it was the calendar, or a live round, or an unreadable price — "generate failed" would
 * throw away the only useful part.
 */
export async function generateRoundAction(formData: FormData) {
  const session = await requireStaff(CONTROL_DOMAIN.generateUpDownRound, "generateUpDownRound");
  const chainId = String(formData.get("chainId") ?? "").trim();
  if (!chainId) return { ok: false as const, error: "Which chain? No chain id was supplied." };
  try {
    const r = await generateRoundNow(chainId, session.userId);
    if (!r.ok) return { ok: false as const, error: r.error };
    revalidatePath("/admin/updown");
    revalidatePath("/admin/updown/rounds");
    return {
      ok: true as const,
      roundId: r.data.id,
      openPrice: r.data.openPrice,
      closesAt: r.data.closesAt,
    };
  } catch (err) {
    return { ok: false as const, error: safeError(err, "Generate round failed") };
  }
}

export async function voidRoundAction(formData: FormData) {
  const session = await requireStaff(CONTROL_DOMAIN.voidUpDownRound, "voidUpDownRound");
  const id = String(formData.get("id") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();
  if (!id) return { ok: false as const, error: "Which round? No round id was supplied." };
  // An officer-entered reason is required and is NOT decorated by us: whatever is
  // stored here is what the compliance record says about why a player's stake was
  // handed back (the E-6 rule — our words never masquerade as the officer's).
  if (reason.length < 5) {
    return { ok: false as const, error: "Give a reason of at least 5 characters — it is recorded on the compliance trail." };
  }
  if (reason.length > 300) {
    return { ok: false as const, error: "Keep the reason under 300 characters." };
  }
  try {
    const r = await voidRoundByOperator(id, session.userId, reason);
    if (!r.ok) return { ok: false as const, error: r.error };
    revalidatePath("/admin/updown/rounds");
    revalidatePath("/admin/updown");
    return { ok: true as const, settled: r.data.settled };
  } catch (err) {
    return { ok: false as const, error: safeError(err, "Void round failed") };
  }
}

// ── Thresholds (CONFIG tier — they govern what counts as a valid price) ──────

/**
 * Which reader produces prices, and from which provider.
 *
 * CONFIG tier, and the most consequential switch on this page: it decides what number real
 * money settles against. Mirrors `setPaymentProvider` — the operator may choose a simulated
 * provider in a test money mode, but must type the word to do it, and the choice is visible
 * on every surface afterwards. The code refuses a simulated feed in production regardless of
 * what is selected here (`MockPriceFeed`), so this control cannot be the only thing standing
 * between a mis-click and invented prices on a live round.
 */
export async function updateReadingMethodAction(formData: FormData) {
  const session = await ensure(CONTROL_DOMAIN.updateReadingMethod, "updateReadingMethod");
  try {
    const method = String(formData.get("observationMethod") ?? "").trim();
    const provider = String(formData.get("feedProvider") ?? "").trim();
    if (method !== "feed" && method !== "ai") {
      return { ok: false as const, error: "Choose a reading method: market feed or AI." };
    }
    // ⛔ VALIDATED AGAINST THE SHARED LIST, never a hand-written pair. This line was
    // `provider !== "mock" && provider !== "twelvedata"` — the exact drift the console's
    // own dropdown comment says was fixed on the DISPLAY side ("rendered from the shared
    // list") while the ACTION kept a stale literal: the console OFFERED all four providers
    // and this refused both `-bars` readers with "Choose a feed provider." — including
    // `twelvedata-bars`, the DATED reader the whole settlement rebuild runs on. An operator
    // could not select the production reader through the product. Found by driving the
    // ceremony end-to-end (the type-to-arm modal completed, then the refusal toast).
    const spec = findProvider(provider as FeedProviderId);
    if (!spec) {
      return { ok: false as const, error: "Choose a feed provider." };
    }
    // The typed confirmation is required for ANY simulated provider (the spec's own flag,
    // not an id comparison — same rule the console uses), and only when the feed method
    // would actually use it. Asking for it on every save trains the operator to type it
    // without reading.
    if (method === "feed" && spec.simulated) {
      if (String(formData.get("confirm") ?? "").trim().toUpperCase() !== "SIMULATED") {
        return { ok: false as const, error: 'Type SIMULATED to confirm a simulated price feed.' };
      }
    }
    const r = await setUpDownConfig({ observationMethod: method, feedProvider: provider as FeedProviderId }, session.userId);
    if (!r.ok) return { ok: false as const, error: r.error };
    refresh();
    return { ok: true as const, warn: r.warn };
  } catch (err) {
    return { ok: false as const, error: safeError(err, "Update reading method failed") };
  }
}

export async function updateThresholdsAction(formData: FormData) {
  const session = await ensure(CONTROL_DOMAIN.updateThresholds, "updateThresholds");
  try {
    const marginPct = num(formData, "defaultMarginPct");
    const r = await setUpDownConfig({
      maxStalenessSeconds: num(formData, "maxStalenessSeconds"),
      confidenceThreshold: num(formData, "confidenceThreshold"),
      maxObservationAttempts: num(formData, "maxObservationAttempts"),
      defaultMinStake: num(formData, "defaultMinStake"),
      defaultMaxStake: num(formData, "defaultMaxStake"),
      // Round margin: % in the UI → basis points (0.5% → 50). See UPDOWN-PRICING.md.
      defaultMarginBps: marginPct != null ? Math.round(marginPct * 100) : undefined,
    }, session.userId);
    if (!r.ok) return { ok: false as const, error: r.error };
    refresh();
    return { ok: true as const, warn: r.warn };
  } catch (err) {
    return { ok: false as const, error: safeError(err, "Update thresholds failed") };
  }
}
