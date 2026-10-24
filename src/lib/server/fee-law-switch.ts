/**
 * ⭐ THE NEW FEE LAW, SWITCHED ON — ONCE, AT THE FIRST BOOT OF THE RELEASE THAT OPENS ITS GATE (programme FEE-TAX-2026-10,
 * release R5; `docs/FEE-TAX-PLAN.md` §5).
 *
 * Ali's go-live answer of 2026-10-24 (`docs/COMPLIANCE-DECISIONS.md` § "2026-10-24 · The fee & tax change — Ali's go-live
 * answers …", item 1): "You do it, under my ruling." The release itself puts the new law in force, recorded in his name,
 * with no officer's click. `fee-law-gate.ts` makes the new law POSSIBLE; this act APPLIES it, through the same audited
 * writers an officer's saves go through — never around them — in this order, each read back before the next:
 *   1. the site banner (`setPlatformConfig`): the change in Swahili and English, its rates the ones step 2 saves;
 *   2. the polls (`setGlobalConfig`): the `stake-share` model and the winnings tax;
 *   3. Up & Down (`applyFeeProfileToEveryChain`): the product default and every chain, in any state, in ONE transaction —
 *      last of the saves, as the one step that commits whole or not at all;
 *   4. the switch record (`fee-switch-record.ts`): `at`, the instant every binding text dates the change from.
 *
 * ⛔ A STEP THAT FAILS PUTS BACK WHAT WAS DONE. The polls' model and rates return to what they were (a winnings tax left
 *    stored is inert under a legacy model: only a stake-share stamp carries one), the banner to what it was; Up & Down's
 *    act is one transaction. The record then reads FAILED, a COMPLIANCE row names the step and the reason, and the act is
 *    tried again — by this process after RETRY_MS (`startFeeLawSwitchAtBoot`), and by the next boot.
 * ⛔ ONCE, ACROSS CONTAINERS. With a database the act first CLAIMS the record's row (`createConfigIfAbsent`). A container
 *    that finds a claim younger than CLAIM_STALE_MS leaves the act to its owner and looks again after RETRY_MS; an older
 *    claim, or a FAILED record, is taken over by compare-and-swap (`replaceConfigIfValue`). A row that carries `at` is
 *    done, and nothing runs again. A row this file cannot read is never overwritten: it is reported, and left for an
 *    officer. With no database (local development; the drives' in-memory servers) the row is this process's own
 *    (`feeSwitchMemoryRow`), and the banner is left alone — those servers are thrown away, and a site-wide notice on every
 *    page of a drive would only move what the drive measures.
 * ⭐ THE RULING'S FIGURES ARE APPLIED HERE ONCE, NEVER PINNED: 13% of every stake — a product's stored Platform/Operator
 *    split kept when it already totals 13%, otherwise 3% + 10% — and a 15% winnings tax. From the moment this act is done,
 *    each one is the admins' to change, audited, at /admin/config (Ali, 2026-10-03: admins can change everything).
 * ⚠️ WHILE THE GATE IS SHUT THIS DOES NOTHING: a release that carries this file before the gate opens is inert.
 */
import { feeLawLive } from "@/lib/fee-law-gate";
import { rateBp } from "@/lib/payout";
import { feeProfileFromForm } from "@/lib/updown-fee-profile";
import { audit } from "./audit";
import { createConfigIfAbsent, loadConfigResult, replaceConfigIfValue } from "./config-store";
import { randomId } from "./crypto";
import { FEE_SWITCH_RECORD_KEY, feeSwitchMemoryRow, parseFeeSwitchRecord } from "./fee-switch-record";
import { readMarketConfigFresh, setGlobalConfig, type RateConfig } from "./market-config";
import { getPlatformConfig, setPlatformConfig, PLATFORM_CONFIG_KEY, type PlatformConfig } from "./platform-config";
import { hasDatabase } from "./prisma";
import { applyFeeProfileToEveryChain, getUpDownConfig } from "./updown-config";

/** Who every row this act writes names: the release, acting under Ali's ruling — never an officer's account. */
export const FEE_LAW_SWITCH_ACTOR = "system_fee_law_switch";
/** The ruling the act carries, on its record, its audit rows and the Up & Down act's own record. */
export const FEE_LAW_SWITCH_REASON =
  "FEE-TAX-2026-10 release R5: the new fee law switched on by the release under Ali's rulings and go-live answers of 2026-10-24 (docs/COMPLIANCE-DECISIONS.md, the two 2026-10-24 entries).";

/** Ali's ruled figures (2026-10-24), in basis points: the fee on every stake, its usual split, and the winnings tax. */
const RULED_STAKE_FEE_BP = 1_300;
const USUAL_SPLIT_BP = { platform: 300, operator: 1_000 } as const;
const RULED_WINNINGS_TAX_BP = 1_500;

/** A claim this old is a container that died mid-act: another container may take it over. */
export const CLAIM_STALE_MS = 10 * 60_000;
/** How long this process waits before it looks again, after leaving a claim to its owner or after a failure. */
export const RETRY_MS = 5 * 60_000;
/** How many times one process tries before it leaves the act to the next boot (each failure is its own alert). */
const MAX_ATTEMPTS_PER_PROCESS = 4;

/** The steps, in order — what a failure names. */
export type FeeLawSwitchStep = "read" | "banner" | "polls" | "updown" | "record";

/** The record row's three shapes. Only `done` carries `at` — the one field the binding texts read (`fee-switch-record.ts`). */
type ClaimRow = { state: "claimed"; claimId: string; claimedAt: string; by: string };
type FailedRow = { state: "failed"; claimId: string; failedAt: string; step: FeeLawSwitchStep; error: string; rolledBack: string[]; by: string };
type DoneRow = {
  state: "done"; at: string; claimId: string; by: string; reason: string;
  polls: { feeModel: "stake-share"; platformFeeRate: number; operatorFeeRate: number; winningsTaxRate: number; splitKept: boolean };
  updown: { actId: string | null; total: number; moved: number; platformFeeRate: number; operatorFeeRate: number; splitKept: boolean };
  banner: boolean;
};

/** What the act found or did — the boot logs it, the health route reads the state word, the suite reads all of it. */
export type FeeLawSwitchOutcome =
  | { ran: false; state: "gate-shut" }
  | { ran: false; state: "done"; at: string }
  | { ran: false; state: "claimed-elsewhere" }
  /** `retry`: false when the row is one this release cannot read (left for an officer), true when the read failed. */
  | { ran: false; state: "unreadable"; error: string; retry: boolean }
  | { ran: true; state: "done"; at: string; record: DoneRow }
  | { ran: true; state: "failed"; step: FeeLawSwitchStep; error: string; rolledBack: string[] };

/** The state word of a stored row — what `/api/health` publishes (the word only: never a reason or an author). */
export type FeeSwitchState = "none" | "claimed" | "failed" | "done" | "unreadable";

/** A stored row, understood. Pure. */
export function feeSwitchStateOf(v: unknown): FeeSwitchState {
  if (v === null || v === undefined) return "none";
  if (typeof v !== "object" || Array.isArray(v)) return "unreadable";
  const s = (v as { state?: unknown }).state;
  if (s === "done") return parseFeeSwitchRecord(v) ? "done" : "unreadable";
  if (s === "claimed") return typeof (v as ClaimRow).claimId === "string" && Number.isFinite(Date.parse(String((v as ClaimRow).claimedAt))) ? "claimed" : "unreadable";
  if (s === "failed") return typeof (v as FailedRow).claimId === "string" ? "failed" : "unreadable";
  return "unreadable";
}

/**
 * ⭐ THE SPLIT OF THE RULED 13% for one product: its stored Platform/Operator rates when they already total exactly 13%,
 * each a whole number of basis points; otherwise the usual 3% + 10%. `kept` says which, for the record. Pure.
 */
export function ruledSplit(platformFeeRate: unknown, operatorFeeRate: unknown): { platformFeeRate: number; operatorFeeRate: number; kept: boolean } {
  const whole = (r: unknown): r is number => typeof r === "number" && Number.isFinite(r) && r >= 0 && Math.abs(r * 10_000 - Math.round(r * 10_000)) < 1e-9;
  if (whole(platformFeeRate) && whole(operatorFeeRate) && rateBp(platformFeeRate) + rateBp(operatorFeeRate) === RULED_STAKE_FEE_BP) {
    return { platformFeeRate: rateBp(platformFeeRate) / 10_000, operatorFeeRate: rateBp(operatorFeeRate) / 10_000, kept: true };
  }
  return { platformFeeRate: USUAL_SPLIT_BP.platform / 10_000, operatorFeeRate: USUAL_SPLIT_BP.operator / 10_000, kept: false };
}

/** A rate as the percentage an admin form posts ("3", "10", "12.5") — through whole basis points, so 0.03 is "3". */
const percentOf = (rate: number) => String(rateBp(rate) / 100);

const SW_MONTHS = ["Jan", "Feb", "Mac", "Apr", "Mei", "Jun", "Jul", "Ago", "Sep", "Okt", "Nov", "Des"] as const;
const EN_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;
/** The banner's 280-character limit (`/admin/system → setAnnouncementAction`). */
export const BANNER_MAX = 280;

/**
 * ⭐ THE BANNER — Swahili first, then English (the banner has one text for every locale), the day in East Africa Time, and
 * the fee and the tax as saved: the rates are arguments, never literals in the sentence.
 */
export function switchBannerText(at: Date, rates: { stakeFeeRate: number; winningsTaxRate: number }, timeZone = "Africa/Dar_es_Salaam"): string {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone, day: "numeric", month: "numeric", year: "numeric" }).formatToParts(at);
  const part = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const day = part("day"), month = part("month") - 1, year = part("year");
  const fee = percentOf(rates.stakeFeeRate), tax = percentOf(rates.winningsTaxRate);
  const sw = `Kuanzia ${day} ${SW_MONTHS[month]} ${year}: ada ni ${fee}% ya kila dau, na kodi ya ${tax}% ya ushindi inakatwa kwa TRA. Masoko ya awali yanabaki na kanuni zake.`;
  const en = `From ${day} ${EN_MONTHS[month]} ${year}: the fee is ${fee}% of every stake, and a ${tax}% winnings tax is withheld for TRA. Earlier markets keep their rules.`;
  return `${sw} · ${en}`;
}

/**
 * The writers the act drives — the real ones unless a suite hands it others (`test:fee-law-switch` makes a step fail with
 * them, to prove the rollback). ⛔ Application code passes none.
 */
export type FeeLawSwitchWriters = {
  setBanner: (announcement: PlatformConfig["announcement"]) => Promise<{ ok: true } | { ok: false; error: string }>;
  setPolls: (updates: Partial<RateConfig>) => Promise<{ ok: true; warn?: string } | { ok: false; error: string }>;
  applyUpDown: (profile: Partial<RateConfig>) => Promise<{ ok: true; actId: string | null; total: number; moved: number } | { ok: false; error: string }>;
};

const REAL_WRITERS: FeeLawSwitchWriters = {
  setBanner: async (announcement) => {
    const r = await setPlatformConfig({ announcement }, FEE_LAW_SWITCH_ACTOR);
    return r.ok ? { ok: true } : { ok: false, error: r.error };
  },
  setPolls: async (updates) => {
    const r = await setGlobalConfig(updates, FEE_LAW_SWITCH_ACTOR);
    return r.ok ? { ok: true, warn: r.warn } : { ok: false, error: r.error };
  },
  applyUpDown: async (profile) => {
    const r = await applyFeeProfileToEveryChain(profile, FEE_LAW_SWITCH_ACTOR, FEE_LAW_SWITCH_REASON);
    return r.ok ? { ok: true, actId: r.data.actId ?? null, total: r.data.total, moved: r.data.moved } : { ok: false, error: r.error };
  },
};

/** The record row as stored now — `ok: false` when it could not be asked. */
async function readRow(): Promise<{ ok: true; value: unknown } | { ok: false; error: string }> {
  if (!hasDatabase()) return { ok: true, value: feeSwitchMemoryRow().value };
  const r = await loadConfigResult<unknown>(FEE_SWITCH_RECORD_KEY);
  return r.ok ? { ok: true, value: r.value } : { ok: false, error: r.error };
}

/** Replace the row only while it still holds `expected` — the compare-and-swap every move of the record goes through. */
async function swapRow(expected: unknown, next: unknown): Promise<boolean> {
  if (!hasDatabase()) {
    const mem = feeSwitchMemoryRow();
    if (JSON.stringify(mem.value) !== JSON.stringify(expected)) return false;
    mem.value = next;
    return true;
  }
  return replaceConfigIfValue(FEE_SWITCH_RECORD_KEY, expected, next);
}

/** Claim the act, or say why this container leaves it. */
async function claim(nowMs: number): Promise<{ ok: true; mine: ClaimRow } | { ok: false; outcome: FeeLawSwitchOutcome }> {
  const mine: ClaimRow = { state: "claimed", claimId: `fls_${randomId(8)}`, claimedAt: new Date(nowMs).toISOString(), by: FEE_LAW_SWITCH_ACTOR };
  if (hasDatabase()) {
    if ((await createConfigIfAbsent(FEE_SWITCH_RECORD_KEY, mine)) === "created") return { ok: true, mine };
  } else {
    const mem = feeSwitchMemoryRow();
    if (mem.value === null || mem.value === undefined) { mem.value = mine; return { ok: true, mine }; }
  }
  const cur = await readRow();
  if (!cur.ok) return { ok: false, outcome: { ran: false, state: "unreadable", error: `the switch record could not be read: ${cur.error}`, retry: true } };
  const state = feeSwitchStateOf(cur.value);
  if (state === "done") return { ok: false, outcome: { ran: false, state: "done", at: parseFeeSwitchRecord(cur.value)!.at } };
  if (state === "unreadable") {
    return { ok: false, outcome: { ran: false, state: "unreadable", error: "the switch record holds a row this release cannot read; it was left as it is for an officer", retry: false } };
  }
  // Taken a moment ago and gone again (only an officer's hand removes it): look again later rather than race it.
  if (state === "none") return { ok: false, outcome: { ran: false, state: "claimed-elsewhere" } };
  if (state === "claimed" && nowMs - Date.parse((cur.value as ClaimRow).claimedAt) < CLAIM_STALE_MS) {
    return { ok: false, outcome: { ran: false, state: "claimed-elsewhere" } };
  }
  // A stale claim (its container died mid-act) or a FAILED record: taken over — by exactly one container.
  return (await swapRow(cur.value, mine)) ? { ok: true, mine } : { ok: false, outcome: { ran: false, state: "claimed-elsewhere" } };
}

/** Did the platform row land with this banner? With a database, read from the row itself; without, from the store. */
async function bannerReadBack(want: PlatformConfig["announcement"]): Promise<boolean> {
  const same = (a: PlatformConfig["announcement"] | undefined) => JSON.stringify(a ?? null) === JSON.stringify(want ?? null);
  if (!hasDatabase()) return same((await getPlatformConfig()).announcement);
  const r = await loadConfigResult<PlatformConfig>(PLATFORM_CONFIG_KEY);
  return r.ok && !!r.value && same(r.value.announcement);
}

/**
 * ⭐ RUN THE ACT — once (see the header). Answers what it found or did; never throws for a refusal it can name.
 * `banner`: whether to put the banner up (default: only with a database). `writers`: a suite's, to make a step fail.
 */
export async function runFeeLawSwitch(opts: { now?: Date; banner?: boolean; writers?: Partial<FeeLawSwitchWriters> } = {}): Promise<FeeLawSwitchOutcome> {
  if (!feeLawLive()) return { ran: false, state: "gate-shut" };
  const W: FeeLawSwitchWriters = { ...REAL_WRITERS, ...opts.writers };
  const nowMs = (opts.now ?? new Date()).getTime();
  const showBanner = opts.banner ?? hasDatabase();
  const claimed = await claim(nowMs);
  if (!claimed.ok) return claimed.outcome;
  const mine = claimed.mine;

  const done: string[] = [];
  /** The step running now — what a throw is charged to. */
  let step: FeeLawSwitchStep = "read";
  let before: { polls: RateConfig; announcement: PlatformConfig["announcement"] } | null = null;
  const failAt = async (step: FeeLawSwitchStep, error: string): Promise<FeeLawSwitchOutcome> => {
    const rolledBack: string[] = [];
    // ⛔ Reverse order. Up & Down is never reversed here: it is the last save, one transaction, and a failure there
    // committed nothing. The record step fails only after every save stood — then nothing is reversed (see below).
    if (before && done.includes("polls")) {
      const r = await W.setPolls({ feeModel: before.polls.feeModel, platformFeeRate: before.polls.platformFeeRate, operatorFeeRate: before.polls.operatorFeeRate })
        .catch((e: unknown) => ({ ok: false as const, error: String((e as Error)?.message ?? e) }));
      rolledBack.push(r.ok ? "polls" : `polls NOT restored: ${r.error}`);
    }
    if (before && done.includes("banner")) {
      const r = await W.setBanner(before.announcement ?? null).catch((e: unknown) => ({ ok: false as const, error: String((e as Error)?.message ?? e) }));
      rolledBack.push(r.ok ? "banner" : `banner NOT restored: ${r.error}`);
    }
    const failed: FailedRow = { state: "failed", claimId: mine.claimId, failedAt: new Date().toISOString(), step, error: error.slice(0, 500), rolledBack, by: FEE_LAW_SWITCH_ACTOR };
    const recorded = await swapRow(mine, failed).catch(() => false);
    audit({
      category: "COMPLIANCE",
      action: "fee_law.switch_failed",
      actorId: FEE_LAW_SWITCH_ACTOR,
      targetType: "System",
      targetId: "fee-law",
      payload: { reason: FEE_LAW_SWITCH_REASON, claimId: mine.claimId, step, error: error.slice(0, 500), rolledBack, recorded,
        consequence: "The new fee law is NOT in force: every step taken was put back, and the act is tried again by this container and by the next boot. Read the step and the error." },
    });
    const undone = rolledBack.length > 0 ? rolledBack.join(", ") : "none needed";
    console.error(`[fee-law-switch] FAILED at ${step}: ${error} · rolled back: ${undone}`);
    return { ran: true, state: "failed", step, error, rolledBack };
  };

  try {
    // ── 0 · what stands now, read fresh: the rates every later step is chosen from, and what a rollback restores ──
    const fresh = await readMarketConfigFresh({ purpose: "check" });
    if (!fresh.ok) return failAt("read", `the platform's rates could not be read: ${fresh.error}`);
    const platformNow = await getPlatformConfig();
    before = { polls: fresh.config, announcement: platformNow.announcement ?? null };
    const pollSplit = ruledSplit(fresh.config.platformFeeRate, fresh.config.operatorFeeRate);
    const winningsTaxRate = RULED_WINNINGS_TAX_BP / 10_000;
    const udDefault = (await getUpDownConfig()).defaultRateProfile as Partial<RateConfig> & Record<string, unknown>;
    const udSplit = ruledSplit(udDefault.platformFeeRate, udDefault.operatorFeeRate);
    const profile = feeProfileFromForm(
      { feeModel: "stake-share", platformFeeRate: percentOf(udSplit.platformFeeRate), operatorFeeRate: percentOf(udSplit.operatorFeeRate) },
      udDefault,
    );
    if (!profile.ok) return failAt("read", `the Up & Down profile could not be built: ${profile.error}`);

    // ── 1 · the banner ──
    const announcement: PlatformConfig["announcement"] = {
      active: true,
      tone: "info",
      message: switchBannerText(new Date(nowMs), { stakeFeeRate: pollSplit.platformFeeRate + pollSplit.operatorFeeRate, winningsTaxRate }),
    };
    step = "banner";
    if (showBanner) {
      if (announcement.message.length > BANNER_MAX) return failAt("banner", `the banner is ${announcement.message.length} characters, over the ${BANNER_MAX} the banner holds`);
      const b = await W.setBanner(announcement);
      if (!b.ok) return failAt("banner", b.error);
      done.push("banner");
      if (!(await bannerReadBack(announcement))) return failAt("banner", "the banner was saved but did not read back");
    }

    // ── 2 · the polls ──
    step = "polls";
    const pollUpdates: Partial<RateConfig> = { feeModel: "stake-share", platformFeeRate: pollSplit.platformFeeRate, operatorFeeRate: pollSplit.operatorFeeRate, winningsTaxRate };
    const p = await W.setPolls(pollUpdates);
    if (!p.ok) return failAt("polls", p.error);
    done.push("polls");
    const pollsBack = await readMarketConfigFresh({ purpose: "check" });
    if (!pollsBack.ok || pollsBack.config.feeModel !== "stake-share" || pollsBack.config.winningsTaxRate === undefined
      || rateBp(pollsBack.config.winningsTaxRate) !== RULED_WINNINGS_TAX_BP
      || rateBp(pollsBack.config.platformFeeRate) + rateBp(pollsBack.config.operatorFeeRate) !== RULED_STAKE_FEE_BP) {
      return failAt("polls", pollsBack.ok ? "the polls' model, fee or tax did not read back as saved" : `the polls' rates could not be read back: ${pollsBack.error}`);
    }

    // ── 3 · Up & Down — last, one transaction ──
    step = "updown";
    const u = await W.applyUpDown(profile.profile);
    if (!u.ok) return failAt("updown", u.error);
    done.push("updown");

    // ── 4 · the record: `at` is the instant the saves stood ──
    step = "record";
    const at = new Date().toISOString();
    const record: DoneRow = {
      state: "done", at, claimId: mine.claimId, by: FEE_LAW_SWITCH_ACTOR, reason: FEE_LAW_SWITCH_REASON,
      polls: { feeModel: "stake-share", platformFeeRate: pollSplit.platformFeeRate, operatorFeeRate: pollSplit.operatorFeeRate, winningsTaxRate, splitKept: pollSplit.kept },
      updown: { actId: u.actId, total: u.total, moved: u.moved, platformFeeRate: udSplit.platformFeeRate, operatorFeeRate: udSplit.operatorFeeRate, splitKept: udSplit.kept },
      banner: showBanner,
    };
    // ⚠️ Past this line every save stands and the law IS in force: a record that fails to land is reported, never rolled
    // back. The claim then goes stale and the next run repeats the act — every save already holds, so nothing moves — and
    // records it.
    const recorded = await swapRow(mine, record);
    if (!recorded) {
      audit({
        category: "COMPLIANCE", action: "fee_law.switch_unrecorded", actorId: FEE_LAW_SWITCH_ACTOR, targetType: "System", targetId: "fee-law",
        payload: { reason: FEE_LAW_SWITCH_REASON, claimId: mine.claimId, record,
          consequence: "Every save stands and the new law is in force, but the switch record did not land, so the binding texts show no date yet. The act repeats once the claim is stale and records it." },
      });
      console.error("[fee-law-switch] the law is in force but the switch record did not land; it will be recorded by the next run");
      return { ran: true, state: "failed", step: "record", error: "the switch record did not land (the law is in force)", rolledBack: [] };
    }
    audit({
      category: "COMPLIANCE",
      action: "fee_law.switched",
      actorId: FEE_LAW_SWITCH_ACTOR,
      targetType: "System",
      targetId: "fee-law",
      payload: {
        reason: FEE_LAW_SWITCH_REASON, at, claimId: mine.claimId,
        polls: { before: { feeModel: before.polls.feeModel, platformFeeRate: before.polls.platformFeeRate, operatorFeeRate: before.polls.operatorFeeRate, winningsTaxRate: before.polls.winningsTaxRate ?? null },
          after: pollUpdates, splitKept: pollSplit.kept, warn: p.warn ?? null },
        updown: { actId: u.actId, total: u.total, moved: u.moved, profile: profile.profile, splitKept: udSplit.kept },
        banner: showBanner ? { before: before.announcement ?? null, after: announcement } : "not shown (no database: a throwaway server)",
      },
    });
    console.log(`[fee-law-switch] the new fee law is in force from ${at} (Up & Down: ${u.moved} of ${u.total} chains moved)`);
    return { ran: true, state: "done", at, record };
  } catch (err) {
    // A throw at the record step comes after every save stood: like a record that did not land, it is reported, and the
    // next run (once the claim is stale) records it. Before that, what was done is put back.
    if (step === "record") {
      console.error("[fee-law-switch] the law is in force but writing its record threw:", (err as Error)?.message ?? err);
      return { ran: true, state: "failed", step, error: String((err as Error)?.message ?? err), rolledBack: [] };
    }
    return failAt(step, String((err as Error)?.message ?? err));
  }
}

let attempts = 0;
/**
 * The boot's call (`instrumentation.ts`): run the act, and when it was left to another container or failed, look again
 * after RETRY_MS — at most MAX_ATTEMPTS_PER_PROCESS times; the next boot starts afresh. ⛔ Never throws: a boot must not
 * stop on this, and every failure is already its own COMPLIANCE row.
 */
export async function startFeeLawSwitchAtBoot(): Promise<void> {
  if (!feeLawLive()) return;
  attempts++;
  let out: FeeLawSwitchOutcome;
  try {
    out = await runFeeLawSwitch();
  } catch (err) {
    console.error("[fee-law-switch] the act could not run:", (err as Error)?.message ?? err);
    out = { ran: false, state: "unreadable", error: String((err as Error)?.message ?? err), retry: true };
  }
  const again = out.state === "claimed-elsewhere" || out.state === "failed" || (out.state === "unreadable" && out.retry);
  if (again && attempts < MAX_ATTEMPTS_PER_PROCESS) {
    const t = setTimeout(() => { void startFeeLawSwitchAtBoot(); }, RETRY_MS);
    (t as { unref?: () => void }).unref?.();
  }
}

/**
 * ⭐ WHAT `/api/health` PUBLISHES: whether the new law's gate is open in this build, the record's state word, and the
 * instant it is in force from. ⛔ Never a reason, an error or an author — the body is public. Never rejects.
 */
export async function feeLawHealth(): Promise<{ live: boolean; switch: FeeSwitchState; switchedAt: string | null }> {
  try {
    const row = await readRow();
    if (!row.ok) return { live: feeLawLive(), switch: "unreadable", switchedAt: null };
    return { live: feeLawLive(), switch: feeSwitchStateOf(row.value), switchedAt: parseFeeSwitchRecord(row.value)?.at ?? null };
  } catch {
    return { live: feeLawLive(), switch: "unreadable", switchedAt: null };
  }
}
