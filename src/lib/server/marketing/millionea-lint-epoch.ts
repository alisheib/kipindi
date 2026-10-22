/**
 * WHEN MILLIONEA'S CLAIMS RULES FIRST RAN — the rollout's one instant (MASWALI-BUILD S6, the lane-N review's rounds 4 and
 * 5, rule 6; `millionea-claims.ts`).
 *
 * ⭐ A CLASSIC CAMPAIGN ALREADY SENDING WHEN THE RULES SHIPPED IS NOT PAUSED BY THEM. The engine's slice renders it with what
 *    the rules would refuse REPORTED, not refused (`renderForRecipient`'s `millioneaLint: "flag"`), says it once a run on
 *    the campaign's own page (`CAMPAIGN_FLAGGED_ACTION`, read by `campaign-live.ts`) and keeps sending. A sending campaign
 *    can be neither saved nor test-sent, so what binds it is what the code allows: a restart (a Pause, then a Resume), and
 *    every copy, which is judged in full at its save. Every campaign started on a build that carries the rules is judged
 *    in full.
 * ⛔ A CAMPAIGN NAMED AS MILLIONEA'S IS NEVER GRANDFATHERED (the lead's ruling, round 5 HIGH 3): it is judged in full,
 *    whenever it was started.
 * ⭐ "SHIPPED" IS A STAMP, NEVER A CLOCK CONSTANT. It is the start of the first process of a build that carries the rules —
 *    captured once, so a door that stamps late still stamps that instant (round 5, MEDIUM 4a) — written at its boot
 *    (`instrumentation.ts`), or by the first door that judges a campaign (the save, the slice): ONE `SystemConfig` row,
 *    written only while the key has none (`createConfigIfAbsent`), so every later process and deploy reads the same instant.
 *    Process memory without a database.
 * ⛔ AN INSTANT THAT CANNOT BE READ IS NO INSTANT: no campaign is then grandfathered — and a slice that only Millionea's
 *    rules would stop WAITS for it, never pauses on a transient read (round 5, MEDIUM 4b; `engine.ts`).
 */
import { createConfigIfAbsent, loadConfigResult } from "@/lib/server/config-store";
import { hasDatabase } from "@/lib/server/prisma";
import { campaignProductOf } from "@/lib/marketing/millionea-claims";
import type { StoredSmsCampaign } from "@/lib/server/store";

/** The one row's key. */
export const MILLIONEA_LINT_EPOCH_KEY = "marketing.millionea_claims.first_run";

/** The SYSTEM row a slice writes, once a run, for a campaign sending since before the rules: what they would refuse. */
export const CAMPAIGN_FLAGGED_ACTION = "marketing.campaign_flagged";

/** The deploy's overlap, as the rollout reads a campaign's start against the stamp (round 5, LOW 10). */
export const DEPLOY_OVERLAP_MS = 3 * 60_000;

declare global {
  // eslint-disable-next-line no-var
  var __50PICK_MILLIONEA_LINT_EPOCH: string | undefined;
}

const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;
const isIso = (v: unknown): v is string => typeof v === "string" && ISO.test(v) && Number.isFinite(Date.parse(v));

/** When this process started — captured ONCE, when this module is first loaded. */
const PROCESS_STARTED_AT_MS = Date.now() - Math.round(process.uptime() * 1000);

/** This process's start, on a door's own clock (`clock`: the door's now — the engine's slices run on `deps.now()`). */
export function processStartOn(clock: Date): Date {
  return new Date(PROCESS_STARTED_AT_MS + (clock.getTime() - Date.now()));
}

/** Remember the instant for this process (it never changes once stamped) and answer it. */
function known(iso: string): string {
  globalThis.__50PICK_MILLIONEA_LINT_EPOCH = iso;
  return iso;
}

/**
 * ⭐ THE INSTANT THE RULES FIRST RAN — the stored one, or, when there is none yet, this process's start stamped as it (on
 * the caller's clock; `stampAt` is a suite's own instant). Null when it cannot be read or written (a failed read, a
 * malformed row — never stamped over). Never throws.
 */
export async function millioneaLintEpoch(opts: { clock?: Date; stampAt?: Date } = {}): Promise<string | null> {
  const cached = globalThis.__50PICK_MILLIONEA_LINT_EPOCH;
  if (isIso(cached)) return cached;
  try {
    const stamp = (opts.stampAt ?? processStartOn(opts.clock ?? new Date())).toISOString();
    // Without a database the first call stamps, and every later one — the second of two first calls too — answers it.
    if (!hasDatabase()) return known((globalThis.__50PICK_MILLIONEA_LINT_EPOCH ??= stamp));
    const read = await loadConfigResult<unknown>(MILLIONEA_LINT_EPOCH_KEY);
    if (!read.ok) return null;
    if (isIso(read.value)) return known(read.value);
    if (read.value !== null) return null;
    if ((await createConfigIfAbsent(MILLIONEA_LINT_EPOCH_KEY, stamp)) === "created") return known(stamp);
    const again = await loadConfigResult<unknown>(MILLIONEA_LINT_EPOCH_KEY);
    return again.ok && isIso(again.value) ? known(again.value) : null;
  } catch {
    return null;
  }
}

/** A campaign as the rollout reads it. */
export type RolloutCampaign = Pick<StoredSmsCampaign, "status" | "name" | "startedAt" | "pausedAt" | "enqueuedAt" | "updatedAt">;

/**
 * ⭐ IS THIS CAMPAIGN SENDING SINCE BEFORE THE RULES FIRST RAN? Read by the campaign's START, never by its state at the
 * stamp (round 5, LOW 10): a classic campaign RUNNING now, started before the stamp (or as the outgoing build's), and not
 * restarted since — neither paused since the stamp, nor last moved into RUNNING by a Resume made after it. ⛔ A campaign
 * named as Millionea's never is (round 5, HIGH 3); an instant that cannot be read is never "before".
 */
export function sendingSincePreLint(c: RolloutCampaign, epoch: string | null): boolean {
  if (epoch === null || c?.status !== "RUNNING" || campaignProductOf(c.name) === "MILLIONEA") return false;
  const at = Date.parse(epoch);
  const started = Date.parse(c.startedAt ?? "");
  const since = Date.parse(c.updatedAt ?? "");
  const enqueued = Date.parse(c.enqueuedAt ?? "");
  const paused = c.pausedAt === null ? null : Date.parse(c.pausedAt);
  if (!Number.isFinite(at) || !Number.isFinite(started) || !Number.isFinite(since)) return false;
  if (started >= at + DEPLOY_OVERLAP_MS) return false;
  if (paused !== null && (!Number.isFinite(paused) || paused >= at)) return false;
  // RUNNING since its own list was written (the enqueue's own instant) — after a pause, only when that was before the stamp;
  // or since a Resume, which must have come before it.
  if (since === enqueued) return paused === null || enqueued < at;
  return since < at;
}
