/**
 * THE PER-ACCOUNT RULES AND LIMITS SAVE — the write that this repository has never had (2026-09-21).
 *
 * ⛔ WHAT WAS MEASURED, AND WHY THIS MODULE EXISTS. On 2026-09-21 the owner and a manager could not start a
 * single account on the live desk. Designation creates every account with `rules: { schemaVersion }` and all
 * fourteen caps NULL (`designation.ts:318`); `rulesStartProblems` then refuses one per unset cap plus "no
 * product" plus "no entry mode"; `startHouseBot` answers `RULES`; and the console prints "Open Rules, review
 * them, save, then start." — while the Rules tab beside it said "Editing an account's rules is not ready on
 * this build yet." `houseBotStore.saveRules` and `validateHouseBotRules` had ZERO callers in `src/`. The
 * validator was green at `test:house-bot-rules` 521/0 and the CAS write existed in both twins; what was
 * missing was the service that joins them, one server action, and a form. This is the service.
 *
 * ⛔ WHY IT IS NOT IN `house-console-read.ts`, for the same reason `limits-save.ts` is not. That module is the
 * section's COPY home and is scanned string literal by string literal by ruling 453's lexicon guard. This
 * service must name `house_bot.rules_saved` and the bot's own table in STRING form, which is exactly what that
 * scan reads. The gate module gates and paints; this module saves.
 *
 * ⛔ THE CAS IS THE BELT, AND THE VERSION PRECHECK IS NOT. Two officers on two tabs both read version 3, both
 * pass the cheap check, and both reach `saveRules(3, …)`; the store's conditional write decides between them
 * and the loser is REFUSED and told — never merged, never clobbered. The precheck is kept only so a stale tab
 * is refused before the platform context is read for nothing.
 *
 * ⚠️ THE VALIDATOR IS GIVEN THE PREVIOUS ROW, NOT JUST THE NEW VALUES. `X-CLEAR-ACTIVE` refuses clearing a cap
 * while the account is running, and that question cannot be answered from the submitted values alone.
 */
import { audit } from "../audit";
import { HOUSE_AUDIT, isAllowedHouseAuditPayload } from "@/lib/house-bot/constants";
import {
  CAP_FIELDS,
  DEFAULT_RULES_V1,
  parseHouseBotRules,
  validateHouseBotRules,
  type CapField,
  type CrossRuleId,
  type FieldError,
  type HouseBotCaps,
  type RulesWarning,
} from "@/lib/house-bot/rules";
import {
  houseBotEventStore,
  houseBotStore,
  HouseSchemaNotReady,
  type HouseBotRulesPatch,
  type StoredHouseBot,
} from "../house-bot-dal";
import { loadRulesContext } from "./rules-context";

/** One cap that moved, for the audit row. ⛔ Numbers or null only — the R7 allowlist refuses anything else. */
export type CapChange = { field: string; before: number | null; after: number | null };

/** The three entry modes of one product, as the form's switches hold them. */
type ModeFlagsInput = { counter: boolean; fill: boolean; opener: boolean };

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

/**
 * What the save answers.
 *
 * ⛔ `recorded` is FALSE when the write LANDED and its compliance row did not — the same gap `limits-save.ts`
 * names, and for the same reason: a save that landed and says it did not is the most expensive sentence this
 * console can print, because the next thing an officer does is type it again.
 * ⛔ `field` is the validator's FIELD ID (`scope.products.updown`, `stakeMinTzs`), because this module is
 * server-only; the console maps it to the form's neutral key before it reaches a browser (D19, ruling 453).
 */
export type RulesSaveResult =
  | { ok: true; rulesVersion: number; changes: CapChange[]; rulesChanged: boolean; recorded: boolean; warnings: RulesWarning[] }
  /** ⛔ `RULES_UNREADABLE` is the stored document refusing to parse — a REFUSAL, never a silent rebuild. */
  | { ok: false; code: "SCHEMA" | "UNREADABLE" | "NOT_FOUND" | "REMOVED" | "CONFLICT" | "RULES_UNREADABLE" }
  /**
   * ⛔ `errors` IS THE WHOLE LIST, AND `field`/`rule`/`message` ARE ITS FIRST ENTRY — measured on a running
   * build, 2026-09-21 (owner's report: "sometimes after they change several checkboxes and save, it says
   * Couldn't save").
   *
   * 🔴 THIS SAVE USED TO ANSWER `errors[0]` AND THROW THE REST AWAY. Four bad fields therefore cost four
   * round trips: fix the stake band, save, "Couldn't save" again for the frequency, fix that, save, again —
   * with nothing on screen ever saying how many problems were left. The validator had found all four on the
   * FIRST call and the shape of this result was the only thing that lost them. A form that knows every
   * problem and reveals one is a form that teaches an officer the save is unreliable.
   * ⚠️ The first entry stays named separately because the field order is `FIELD_ORDER`, so entry 0 is the
   * EARLIEST failing field on the page — which is the one to focus and the one the sentence should be about.
   */
  | { ok: false; code: "INVALID"; field: string; rule: CrossRuleId | null; message: string; errors: FieldError[]; warnings: RulesWarning[] };

const capsOf = (bot: StoredHouseBot): HouseBotCaps =>
  Object.fromEntries(CAP_FIELDS.map((k) => [k, bot[k]])) as HouseBotCaps;

/**
 * Save one account's rules and its fourteen caps at once, conditional on `baseVersion`.
 *
 * The order is deliberate and mirrors the global save: the row FIRST (so a missing schema and an unreadable
 * row are told apart before anything else is read), then the platform context the validator needs, then the
 * validation, then ONE conditional write, then the history row, then the compliance row. Nothing is written
 * before the validator has passed, so a refused save leaves the account byte for byte as it was.
 */
export async function saveHouseBotRules(input: {
  actorId: string;
  botId: string;
  baseVersion: number;
  caps: Record<CapField, unknown>;
  /**
   * ⛔ THE SWITCHES THE FORM OWNS, AND NOTHING ELSE — the rest of the rules object is carried through from what
   * is stored (see the overlay below). The form posts ten booleans and, since 2026-09-22, the two scope lists
   * (`lists` below); it does not post a rules document, so a
   * stale tab cannot silently revert a numeric rule it never showed.
   */
  flags: {
    products: { updown: boolean; polls: boolean };
    modes: { updown: ModeFlagsInput; polls: ModeFlagsInput };
    enterNow: boolean;
    targeting: boolean;
  };
  /**
   * ⛔ THE TWO SCOPE LISTS THE FORM OWNS NOW (prod finding 2026-09-22). Until this parameter existed the save
   * spread the stored `scope` through unchanged, so `chains` and `categories` — the two fields the engine's
   * predicate ends in — could be written by NOTHING under `src/`: every account kept `DEFAULT_RULES_V1`'s empty
   * lists and matched no market, ever, while the roster called it active. The console checks every member
   * against the live list before it reaches here; the validator's `pickList` refuses a stranger again, and
   * `R-PRODUCT-LIST` refuses a ticked product whose list is empty — on the list's own field.
   */
  lists: { categories: readonly string[]; chains: readonly string[] };
}): Promise<RulesSaveResult> {
  let bot: StoredHouseBot | null;
  try {
    bot = await houseBotStore.get(input.botId);
  } catch (err) {
    /* 421 · a table the migration has not reached is a STATE, not a failed read, and the two are told apart
       here so the console can say which one happened. */
    return { ok: false, code: err instanceof HouseSchemaNotReady ? "SCHEMA" : "UNREADABLE" };
  }
  if (!bot) return { ok: false, code: "NOT_FOUND" };
  /* ⛔ 358 · A REMOVED ACCOUNT'S RULES ARE A RECORD, NOT A FORM. The page draws no control for one; this
     refuses the write even if a stale tab still holds one open. */
  if (bot.status === "REMOVED") return { ok: false, code: "REMOVED" };
  if (!Number.isInteger(input.baseVersion) || bot.rulesVersion !== input.baseVersion) {
    return { ok: false, code: "CONFLICT" };
  }

  let ctx;
  try {
    /* ⛔ THE VALIDATOR'S CONTEXT IS THE LIVE PLATFORM, NOT A CONSTANT (04 F5). The stake bounds, the live
       chains and the bet-place refill all bound these values, so a save validated against a stale context
       would accept rules the seam then refuses every stake against. */
    ctx = await loadRulesContext();
  } catch {
    return { ok: false, code: "UNREADABLE" };
  }

  /**
   * ⭐ THE OVERLAY — WHY THE FORM POSTS TEN BOOLEANS AND NOT A RULES DOCUMENT.
   *
   * ⛔ THE STORED RULES ARE THE BASE, READ THROUGH THE REAL PARSER. A fresh account holds `{schemaVersion:1}`
   * and nothing else, and `readStoredRulesV1` fills every numeric leaf no enabled mode reads from
   * `DEFAULT_RULES_V1` — so parsing it yields a COMPLETE, valid document with sane delays, guards and
   * shaping. That is what makes "tick a product, turn on a mode, Save" sufficient on a brand-new account:
   * the numbers the newly-enabled mode needs are already there, and the officer never had to invent them.
   * ⛔ AND A DOCUMENT THAT WILL NOT PARSE IS REFUSED, NEVER RESET. Silently rebuilding from defaults would
   * throw away an account's saved rules on the one day they could not be read — the officer is told instead.
   */
  const parsed = parseHouseBotRules(bot.rules, ctx);
  if (!parsed.ok) return { ok: false, code: "RULES_UNREADABLE" };

  /**
   * ⛔ WHAT IS VALIDATED IS THE WHOLE DOCUMENT; WHAT IS STORED IS ONLY WHAT THE FORM OWNS. Two objects, and
   * the difference is the point (peer review, 2026-09-21).
   *
   * ⭐ VALIDATION NEEDS THE COMPLETE DOCUMENT, because a mode being turned ON puts the numeric leaves that
   * mode reads inside the validator's population — a delay, a guard, a react probability. Those come from the
   * parse, which fills every unused leaf from `DEFAULT_RULES_V1`, and that is what makes "tick a product,
   * turn on a mode, Save" sufficient on a brand-new account without the officer inventing numbers.
   *
   * ⛔ BUT STORING THAT COMPLETE DOCUMENT WOULD PIN EVERY ONE OF THOSE LEAVES TO TODAY'S DEFAULT, on an
   * account whose officer never saw them — a save carrying fields nobody looked at. The consequence is not
   * theoretical: change a delay or a guard default later for a safety reason, and every account saved before
   * the change silently keeps the old number while never-saved accounts pick up the new one, with nothing on
   * any screen saying why two accounts behave differently.
   * ⭐ SO THE STORED DOCUMENT IS A PATCH over whatever was already there: the ten switches and the two scope
   * lists the form draws pickers for, and nothing else.
   * `readStoredRulesV1` falls back per leaf, so an absent leaf keeps FOLLOWING the default instead of being
   * frozen at it — the officer's own choices are preserved, and a later safety change reaches this account.
   * ⚠️ The patch carries only booleans, so nothing is lost by not storing the validator's normalised numbers:
   * there are none to normalise. Every numeric value this form owns lives in a COLUMN, not in this JSON.
   */
  const storedRaw: Record<string, unknown> =
    typeof bot.rules === "object" && bot.rules !== null && !Array.isArray(bot.rules)
      ? (bot.rules as Record<string, unknown>)
      : {};
  const storedScope = isRecord(storedRaw.scope) ? storedRaw.scope : {};
  /**
   * ⛔ THE SCHEDULE IS SEEDED WHEN THERE IS NONE, AND THAT IS NOT THE SAME DECISION AS THE LEAVES ABOVE.
   *
   * 🔴 MEASURED BY DRIVING IT (2026-09-21, before any of this shipped): `parseHouseBotRules({schemaVersion:1})`
   * returns `schedule: { days: [], allDay: false, windows: [] }` — NOT `DEFAULT_RULES_V1`'s "every day, all
   * day". `expandWindows` then refuses an empty `days` with "Pick at least one day.", so EVERY save on a fresh
   * account was refused on a field this form does not draw. An officer would have been told to pick a day with
   * no day picker on the screen — the same shape of trap as the Start refusal this whole change exists to fix,
   * shipped by the fix for it.
   * ⛔ SO ABSENCE IS NOT A SAFE STATE FOR THIS ONE KEY. Every other absent leaf follows its default through the
   * parse; this one parses to something the validator rejects, so it has to be written down. It is the
   * DOCUMENTED default (`DEFAULT_RULES_V1`), and the form says so in words rather than materialising it
   * silently — which is the whole objection to writing values nobody reviewed.
   * ⚠️ AND ONLY WHEN THERE IS NONE: a schedule an officer has already narrowed is never widened back.
   */
  const storedSchedule = isRecord(storedRaw.schedule) ? storedRaw.schedule : null;
  const scheduleChosen = storedSchedule !== null && Array.isArray(storedSchedule.days) && storedSchedule.days.length > 0;
  const schedule = scheduleChosen ? storedSchedule : DEFAULT_RULES_V1({ stakeBounds: ctx.stakeBounds }).schedule;
  /* ⛔ THE TWO LISTS ARE WRITTEN INTO BOTH DOCUMENTS — the patch that is STORED and the document that is CHECKED
     — so the scope row the validator raises is raised against what will be saved, and what is saved is what the
     officer ticked. A list written into one and not the other is the defect this parameter exists to close, one
     layer down. */
  const scopeLists = { chains: [...input.lists.chains], categories: [...input.lists.categories] };
  const rulesToStore = {
    ...storedRaw,
    schedule,
    scope: { ...storedScope, products: { ...input.flags.products }, ...scopeLists },
    modes: { updown: { ...input.flags.modes.updown }, polls: { ...input.flags.modes.polls } },
    enterNow: { ...(isRecord(storedRaw.enterNow) ? storedRaw.enterNow : {}), enabled: input.flags.enterNow },
    targeting: { ...(isRecord(storedRaw.targeting) ? storedRaw.targeting : {}), enabled: input.flags.targeting },
  };
  /* The COMPLETE document, for the validator only — the parse's filled leaves under the officer's switches. */
  const rulesToCheck = {
    ...parsed.rules,
    schedule,
    scope: { ...parsed.rules.scope, products: { ...input.flags.products }, ...scopeLists },
    modes: { updown: { ...input.flags.modes.updown }, polls: { ...input.flags.modes.polls } },
    enterNow: { ...parsed.rules.enterNow, enabled: input.flags.enterNow },
    targeting: { ...parsed.rules.targeting, enabled: input.flags.targeting },
  };

  const checked = validateHouseBotRules(
    { rules: rulesToCheck, caps: input.caps, label: bot.label },
    ctx,
    { status: bot.status, caps: capsOf(bot), label: bot.label },
  );
  if (!checked.ok) {
    const first: FieldError = checked.errors[0];
    /* ⛔ EVERY ERROR TRAVELS, NOT JUST THE FIRST (see `RulesSaveResult`). The validator already found them all;
       dropping them here is what made one save into four. */
    return {
      ok: false, code: "INVALID",
      field: first.field, rule: first.rule ?? null, message: first.message,
      errors: checked.errors, warnings: checked.warnings,
    };
  }

  /**
   * ⭐ THE MINIMAL DOCUMENT IS STORED ONLY IF IT PROVABLY ROUND-TRIPS — measured, not assumed (2026-09-21).
   *
   * 🔴 THE DRY FIRE CAUGHT THIS BEFORE IT SHIPPED. Storing the switches alone is right until the officer turns
   * a mode ON: `LEAF_USED_BY` then puts that mode's leaves inside the parser's REQUIRED set, so
   * `counter.amount` — absent, and previously filled from the default — makes the very document we just wrote
   * fail to parse. Start then refused with "the saved rules can't be read", which is how a save that landed
   * would have bricked the account it was configuring.
   * ⭐ SO THE CHOICE IS DECIDED BY RE-READING IT. The minimal form is parsed back and compared with the
   * document that was validated; it is stored only when the two are identical, and otherwise the complete
   * validated document is stored instead. Absent leaves keep following their defaults wherever that is still
   * safe, and the moment the officer's own choice makes a leaf load-bearing it is written down — which is the
   * honest place for that line, because a value in use should not change under a running account.
   * ⛔ AND THE GUARANTEE IS THE COMPARISON, NOT THE REASONING. This holds without this module knowing which
   * leaves which mode reads, so a mode added later cannot quietly reintroduce the defect.
   */
  const roundTrip = parseHouseBotRules(rulesToStore, ctx);
  const minimalHolds = roundTrip.ok && JSON.stringify(roundTrip.rules) === JSON.stringify(checked.rules);
  const patch: HouseBotRulesPatch = { rules: minimalHolds ? rulesToStore : checked.rules };
  const changes: CapChange[] = [];
  for (const field of CAP_FIELDS) {
    const after = checked.caps[field];
    (patch as Record<string, unknown>)[field] = after;
    const before = bot[field] as number | null;
    if (before !== after) changes.push({ field, before, after });
  }
  /* ⚠️ WHETHER THE RULES OBJECT ITSELF MOVED IS A SEPARATE QUESTION FROM WHETHER A CAP DID, and the console
     needs both: "nothing changed" is a true and useful sentence, and fourteen unchanged caps do not make it
     true on their own. Compared as the validator's normalised output against the stored value, so a re-save
     of identical values is not reported as a change by key order alone. */
  const rulesChanged = JSON.stringify(bot.rules ?? null) !== JSON.stringify(patch.rules);

  /* ⛔ THE CAS ROUND TRIP. A conflict REFUSES; it never merges and never overwrites. */
  const cas = await houseBotStore.saveRules(input.botId, input.baseVersion, patch);
  if (!cas.ok) return { ok: false, code: "CONFLICT" };

  /**
   * ⛔ THE HISTORY ROW IS PART OF THE RECORD, AND ITS FAILURE MAY NOT FAIL THE SAVE. `RULES_SAVED` is a
   * declared event kind with its own alert copy and its own "Rules saved" label on the History tab; an
   * account whose rules moved with no row saying so is a desk that cannot answer "who changed this".
   * ⚠️ The write has already landed by this line, so this is logged and reported — never thrown.
   */
  try {
    await houseBotEventStore.append({
      houseBotId: input.botId,
      userId: bot.userId,
      marketId: null,
      kind: "RULES_SAVED",
      fromStatus: bot.status,
      toStatus: bot.status,
      reason: null,
      actorId: input.actorId,
      payload: { rulesVersion: cas.row.rulesVersion },
    });
  } catch (err) {
    console.error("[house-bot] the RULES_SAVED history row could not be written (the rules DID change):",
      err instanceof Error ? err.message : String(err));
  }

  const payload = { rulesVersion: cas.row.rulesVersion, changes };
  if (!isAllowedHouseAuditPayload(payload)) {
    throw new Error("house audit house_bot.rules_saved: payload keys outside the R7 allowlist");
  }
  /**
   * ⛔ THE WRITE HAS ALREADY LANDED, SO A FAILURE HERE MAY NOT BE REPORTED AS "NOTHING WAS SAVED" — measured
   * on a served build for the global save (`limits-save.ts`), where `chainSecret()` throws under
   * NODE_ENV=production without a distinct AUDIT_CHAIN_SECRET and escapes the in-memory fallback. The outcome
   * is the truth and the gap is named: the save is `ok`, `recorded` is false, and the console says BOTH.
   */
  let recorded = true;
  try {
    await audit({
      category: HOUSE_AUDIT["house_bot.rules_saved"],
      action: "house_bot.rules_saved",
      actorId: input.actorId,
      targetType: "HouseBot",
      targetId: input.botId,
      payload,
    });
  } catch (err) {
    recorded = false;
    console.error("[house-bot] the rules_saved compliance row could not be written (the rules DID change):",
      err instanceof Error ? err.message : String(err));
  }

  return { ok: true, rulesVersion: cas.row.rulesVersion, changes, rulesChanged, recorded, warnings: checked.warnings };
}
