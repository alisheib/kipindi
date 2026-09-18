/**
 * THE GLOBAL LIMITS SAVE (C7-SPEC ruling 412; replan ruling 537, which REVERSES 433(a)).
 *
 * ⛔ WHY THIS MODULE EXISTS AND THE CONSOLE'S GATE DOES NOT HOLD IT. `house-console-read.ts` is the section's
 * COPY home and is scanned, string literal by string literal, by ruling 453's lexicon guard
 * (`test:house-bot-console` 4.453). This service has to name the control row's own table and the audit action
 * — `HouseBotControl`, `house_bot.limits_saved` — and those are house identifiers in STRING form, which is
 * exactly what that scan reads. Writing them there would put the feature's name inside the one module 453
 * exists to keep neutral. So the gate module GATES and paints; this module SAVES, beside the rest of the
 * house services, where identifiers are server-only and `verify:house-bot-bundle` owns their reachability.
 *
 * ⛔ WHAT WAS BELIEVED, AND WHAT WAS MEASURED (ruling 500(e)'s form). C7 step 3 shipped the limits tab
 * read-only under its own ruling 433(a), on the ground that "there is no limits-SAVE service in this
 * repository". Measured since: `houseBotControlStore.saveLimits` EXISTS in both twins with CAS semantics,
 * its whole validation surface is green at `test:house-bot-rules` 521/0, and `house_bot.limits_saved` is
 * already classified COMPLIANCE. What was missing was one server action, not a service — and 432(a) forbids
 * a control with nothing behind it, not a control whose service is built, tested and CAS-safe.
 *
 * ⛔ THE CAS IS THE BELT, AND THE VERSION CHECK BELOW IS NOT. Two officers on two tabs both read version 7,
 * both pass the cheap check, and both reach `saveLimits(7, …)`; the store's own conditional write is what
 * decides between them, and the loser is REFUSED and told — never merged, never clobbered. The cheap check
 * is kept only so a stale tab is refused before the roster and the platform config are read for nothing.
 *
 * ⛔ THE ACTOR IS AN ID (ruling 420). The audit row names `actorId` and nothing else: no display name, no
 * handle, no second read. The payload carries the new version and the fields that actually moved, and it is
 * held to the R7 allowlist before it is written — a key outside it cannot be erased from a seven-year chain.
 */
import { audit } from "../audit";
import { getGlobalConfig } from "../market-config";
import { RATE_RULES } from "../rate-limit";
import { HOUSE_AUDIT, HOUSE_CONTROL_ID, isAllowedHouseAuditPayload } from "@/lib/house-bot/constants";
import {
  CAP_FIELDS,
  LIMIT_FIELDS,
  RULES_CONTEXT_LISTS,
  validateHouseBotLimits,
  type CrossRuleId,
  type HouseBotCaps,
  type HouseBotLimits,
  type LimitField,
  type LimitsContext,
  type RulesBot,
} from "@/lib/house-bot/rules";
import {
  houseBotControlStore,
  houseBotStore,
  HouseSchemaNotReady,
  type HouseBotLimitsPatch,
  type StoredHouseBot,
  type StoredHouseBotControl,
} from "../house-bot-dal";

/** One field that moved, for the audit row. ⛔ Numbers or null only — the R7 allowlist refuses anything else. */
export type LimitChange = { field: string; before: number | null; after: number | null };

/**
 * What the save answers. ⛔ `field` is the COLUMN, because this module is server-only; the console maps it to
 * the form's neutral key before it reaches a browser (D19, ruling 453).
 */
export type LimitsSaveResult =
  /** ⛔ `recorded` is FALSE when the write LANDED and its compliance row did not — see the audit block below. */
  | { ok: true; limitsVersion: number; changes: LimitChange[]; recorded: boolean }
  | { ok: false; code: "SCHEMA" | "UNREADABLE" | "CONFLICT" }
  | { ok: false; code: "INVALID"; field: LimitField; rule: CrossRuleId | null; message: string };

const capsOf = (bot: StoredHouseBot): HouseBotCaps =>
  Object.fromEntries(CAP_FIELDS.map((k) => [k, bot[k]])) as HouseBotCaps;

const limitsOf = (control: StoredHouseBotControl): HouseBotLimits =>
  Object.fromEntries(LIMIT_FIELDS.map((k) => [k, control[k]])) as HouseBotLimits;

/**
 * Save every global limit at once, conditional on `baseVersion`.
 *
 * The order is deliberate: the control row FIRST (so a missing schema and an unreadable row are told apart
 * before anything else is read), then the reads the validator needs, then the validation, then the one
 * conditional write, then the audit row. Nothing is written before the validator has passed, so a refused
 * save leaves the row byte for byte as it was.
 */
export async function saveHouseBotLimits(input: {
  actorId: string;
  baseVersion: number;
  values: Record<LimitField, unknown>;
}): Promise<LimitsSaveResult> {
  let control: StoredHouseBotControl;
  try {
    control = await houseBotControlStore.get();
  } catch (err) {
    /* 421 · a table the migration has not reached is a STATE, not a failed read, and the two are told apart
       here so the console can say which one happened. */
    return { ok: false, code: err instanceof HouseSchemaNotReady ? "SCHEMA" : "UNREADABLE" };
  }
  if (!Number.isInteger(input.baseVersion) || control.limitsVersion !== input.baseVersion) {
    return { ok: false, code: "CONFLICT" };
  }

  let roster: StoredHouseBot[];
  let bounds: { minStake: number; maxStake: number };
  try {
    roster = await houseBotStore.listNonRemoved();
    bounds = await getGlobalConfig();
  } catch {
    return { ok: false, code: "UNREADABLE" };
  }

  /* ⛔ THE VALIDATOR'S CONTEXT IS THE LIVE PLATFORM, NOT A CONSTANT (04 F5). `gCapDailyStakeTzs` and four
     more limits are bounded BELOW by the live minimum stake, so a save validated against a stale floor
     would accept a limit the seam then refuses every stake against. */
  const ctx: LimitsContext = {
    stakeBounds: { minTzs: bounds.minStake, maxTzs: bounds.maxStake },
    betPlaceRefillPerMin: RATE_RULES["bet.place"].refillPerMin,
    durations: RULES_CONTEXT_LISTS.durations,
    /* `listNonRemoved` excludes REMOVED by construction, which is the whole of what `RulesBot["status"]`
       leaves out; the cast states that rather than widening the type. */
    bots: roster.map((b) => ({ botId: b.id, label: b.label, status: b.status as RulesBot["status"], caps: capsOf(b) })),
  };
  /* X-CLEAR-ON: a limit that is SET may not be cleared while the switch is on — the previous row is what
     makes that question answerable, so it is passed rather than re-derived inside the validator. */
  const checked = validateHouseBotLimits(input.values, ctx, { masterOn: control.enabled, limits: limitsOf(control) });
  if (!checked.ok) {
    const first = checked.errors[0];
    return { ok: false, code: "INVALID", field: first.field as LimitField, rule: first.rule ?? null, message: first.message };
  }

  const patch: HouseBotLimitsPatch = {};
  const changes: LimitChange[] = [];
  for (const field of LIMIT_FIELDS) {
    const after = checked.limits[field] as number | null;
    (patch as Record<string, number | null>)[field] = after;
    const before = control[field] as number | null;
    if (before !== after) changes.push({ field, before, after });
  }

  /* ⛔ THE CAS ROUND TRIP. A conflict REFUSES; it never merges and never overwrites. */
  const cas = await houseBotControlStore.saveLimits(input.baseVersion, patch);
  if (!cas.ok) return { ok: false, code: "CONFLICT" };

  const payload = { limitsVersion: cas.row.limitsVersion, changes };
  if (!isAllowedHouseAuditPayload(payload)) {
    throw new Error("house audit house_bot.limits_saved: payload keys outside the R7 allowlist");
  }
  /**
   * ⛔ THE WRITE HAS ALREADY LANDED BY THIS LINE, SO A FAILURE HERE MAY NOT BE REPORTED AS "NOTHING WAS SAVED".
   *
   * MEASURED 2026-09-18 on a SERVED build, which is the only place it could have been: the audit module is
   * documented as never rejecting and it fails OPEN on a database outage — but `chainSecret()` throws outright
   * under `NODE_ENV=production` without a distinct `AUDIT_CHAIN_SECRET`, and that throw escapes the in-memory
   * fallback too. The officer was told "Nothing was saved. Reload the page and try again." while the control row
   * HAD moved and the page still showed the old figures. A save that landed and says it did not is the most
   * expensive sentence this console can print: the next thing an officer does is type it again.
   * ⛔ SO THE OUTCOME IS THE TRUTH, AND THE GAP IS NAMED: the save is `ok`, `recorded` is false, and the console
   * says BOTH. It is never swallowed — a COMPLIANCE row that quietly did not write is the other half of the same
   * defect, and the caller renders a warning rather than a success.
   */
  let recorded = true;
  try {
    await audit({
      category: HOUSE_AUDIT["house_bot.limits_saved"],
      action: "house_bot.limits_saved",
      actorId: input.actorId,
      targetType: "HouseBotControl",
      targetId: HOUSE_CONTROL_ID,
      payload,
    });
  } catch (err) {
    recorded = false;
    console.error("[house-bot] the limits_saved compliance row could not be written (the limits DID change):",
      err instanceof Error ? err.message : String(err));
  }
  return { ok: true, limitsVersion: cas.row.limitsVersion, changes, recorded };
}
