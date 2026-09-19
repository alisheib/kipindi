/**
 * THE MASTER SWITCH GOING ON — the ceremony's service half (C7-SPEC rulings 306, 388, 415; owner-delegated 454;
 * replan ruling 549's 4b). ⛔ OFF has lived in `kill-switch.ts` since Commit 4; this is its opposite number, and
 * until C7 step 4b the ON path existed only as a DAL method with no caller under `src/` at all.
 *
 * ⛔ **THE SWITCH SHIPS OFF, AND NOTHING HERE CHANGES THAT** (owner ruling D1; PLAN §11). This module builds the
 * ACT; it does not perform it. No migration, no seed, no boot path and no default calls it — the only caller is
 * the owner's own console action, and the row on every environment this branch has ever touched is `enabled =
 * false`. What is new is that an owner can now turn it on WITHOUT a hand-written database statement, which is
 * exactly the thing a hand-written statement cannot do: leave a reason, an event and a compliance row behind it.
 *
 * ⛔ **IT REFUSES WHAT THE STRIP SAYS IT REFUSES.** The desk paints "Set N global limits first →" beside the
 * switch, and ruling 547's usage caption says in as many words that the master switch cannot be turned on while a
 * required limit is unset. If the server did not enforce that, the sentence would be a lie the officer could walk
 * straight through — and the consequence is real, not cosmetic: `over(cap, value)` in the seam is
 * `cap == null || value > cap`, so an unset required cap REFUSES EVERY STAKE. A desk switched on in that state is
 * a desk that looks live and does nothing.
 *
 * ⛔ **A WITHDRAWN DESK DOES NOT COME BACK BY A SWITCH** (`OFF_CAUSES.SUNSET`). Sunset ends targets and removes
 * accounts; turning the switch back on would paint a live desk over a roster that no longer exists. It is refused
 * here, in the service, so the refusal holds for any caller — not only for the one that happens to hide the button.
 *
 * ⛔ **THE WRITE IS CONDITIONAL, SO TWO OFFICERS PRODUCE ONE ON.** `switchOn` matches only `enabled = false`, and
 * it starts the scope in the SAME transaction (04 A11, C4-SPEC ruling 92) — a switch-on that left scope NULL
 * would put every stake out of scope, and one that left an old instant would replay history. A second writer's
 * update matches nothing, writes no second event and tells nobody twice.
 *
 * ⛔ **A19 ORDER**: the conditional write, then the event, then the awaited compliance row, then the admin alert —
 * every one of them outside every lock.
 *
 * ⛔ **AND THE COMPLIANCE ROW CANNOT REPORT A LANDED WRITE AS A FAILED ONE** (replan ruling 543). `audit()`'s own
 * docblock promises it never rejects, and `chainSecret()` throws past that promise under `NODE_ENV=production`
 * without a distinct `AUDIT_CHAIN_SECRET`. By the time this module audits, the desk is ON. So the outcome is the
 * truth and the gap is NAMED — `recorded: false` — exactly as ruling 537's limits save already does, and the
 * console renders a WARNING rather than a failure. 543 is fixed in the audit CONTRACT before Commit 8, not here.
 */
import { audit } from "../audit";
import { HOUSE_AUDIT, HOUSE_CONTROL_ID, isAllowedHouseAuditPayload } from "@/lib/house-bot/constants";
import { REQUIRED_FOR_MASTER_ON } from "@/lib/house-bot/rules";
import { houseBotControlStore, houseBotEventStore, houseBotStore, HouseSchemaNotReady, type StoredHouseBotControl } from "../house-bot-dal";
import { announceSwitchedOn } from "./emitters";

export type SwitchOnResult =
  /** ⛔ `changed: false` means it was ALREADY on: nothing was written and nobody was told. */
  | { ok: true; changed: boolean; activeBots: number; recorded: boolean }
  /** `unsetRequired` is a COUNT, never the field names — the console derives its own sentence from its own read. */
  | { ok: false; code: "LIMITS"; unsetRequired: number }
  | { ok: false; code: "SCHEMA" | "UNREADABLE" | "WITHDRAWN" | "WRITE_FAILED" };

const errMessage = (e: unknown) => String((e as Error)?.message ?? e).replace(/\s+/g, " ").slice(0, 300);

/**
 * Switch the desk on, for an officer who has already been proved to be the audience by the gate that calls this.
 *
 * ⛔ THIS MODULE MAKES NO AUDIENCE DECISION OF ITS OWN, and that is deliberate rather than an omission: ruling 523
 * measured that a server action is a POST to whatever URL the browser is on, so the verdict has to be taken in the
 * action's own path on the viewer's STORED role — which is `houseSwitchForConsole`'s first statement. A second
 * verdict here, on a different rule, is the two-gates-that-disagree shape rulings 309 and 433(d) refuse by name.
 */
export async function switchOnHouseBots(input: { actorId: string; reason: string | null }): Promise<SwitchOnResult> {
  let control: StoredHouseBotControl;
  try {
    control = await houseBotControlStore.get();
  } catch (err) {
    /* 421 · a table the migration has not reached is a STATE, not a failed read, and the two are told apart here
       so the console can say which one happened rather than printing one sentence for both. */
    return { ok: false, code: err instanceof HouseSchemaNotReady ? "SCHEMA" : "UNREADABLE" };
  }
  if (control.enabled) {
    /* Already on. Nothing is written, nothing is announced, and the caller is told plainly — a second "switched
       on" event and a second alert for a state that did not change is the duplicate 432(n) refuses on the screen
       and C4-SPEC ruling 139 refuses in the record. */
    return { ok: true, changed: false, activeBots: 0, recorded: true };
  }
  if (control.offCause === "SUNSET") return { ok: false, code: "WITHDRAWN" };

  /* ⛔ THE COUNT IS DERIVED OVER `REQUIRED_FOR_MASTER_ON`, never typed — the same closed list the strip's own
     sentence and the limits rail's badge are derived from, so the button, the sentence and the refusal cannot
     disagree about how many limits are missing. */
  const unsetRequired = REQUIRED_FOR_MASTER_ON.filter((f) => control[f] == null).length;
  if (unsetRequired > 0) return { ok: false, code: "LIMITS", unsetRequired };

  let on: StoredHouseBotControl | null;
  try {
    on = await houseBotControlStore.switchOn({ byId: input.actorId, reason: input.reason });
  } catch (err) {
    console.error("[house-bot] the master switch could not be written:", errMessage(err));
    return { ok: false, code: "WRITE_FAILED" };
  }
  /* The conditional update matched nothing: another officer switched it on between the read and the write. One ON,
     one event, one alert — whichever landed second changed nothing and says so. */
  if (!on) return { ok: true, changed: false, activeBots: 0, recorded: true };

  /* How many accounts this actually sets in motion. A read that fails does not fail the switch — the desk is
     already on by this line — and the alert then says nothing rather than a number nobody measured. */
  let activeBots = 0;
  try {
    activeBots = (await houseBotStore.listNonRemoved()).filter((b) => b.status === "ACTIVE").length;
  } catch (err) {
    console.error("[house-bot] the switch-on alert could not count active accounts:", errMessage(err));
  }

  const event = await houseBotEventStore.append({
    houseBotId: null, userId: null, marketId: null, kind: "SWITCH_ON", fromStatus: "OFF", toStatus: "ON",
    reason: input.reason, actorId: input.actorId, payload: { counts: { activeBots } },
  });

  const payload = { from: "OFF", to: "ON", counts: { activeBots }, eventId: event.id };
  if (!isAllowedHouseAuditPayload(payload)) {
    throw new Error("house audit house_bot.switch_on: payload keys outside the R7 allowlist");
  }
  let recorded = true;
  let auditId: string | null = null;
  try {
    const entry = (await audit({
      category: HOUSE_AUDIT["house_bot.switch_on"],
      action: "house_bot.switch_on",
      /* ⛔ AN ACTOR IS AN ID (ruling 420): no display name, no handle, and no second read to find one. */
      actorId: input.actorId,
      targetType: "HouseBotControl",
      targetId: HOUSE_CONTROL_ID,
      payload,
    })) as unknown;
    auditId = entry && typeof entry === "object" && typeof (entry as { id?: unknown }).id === "string" ? (entry as { id: string }).id : null;
  } catch (err) {
    recorded = false;
    console.error("[house-bot] the switch_on compliance row could not be written (the desk IS on):", errMessage(err));
  }
  if (auditId) await houseBotEventStore.setAuditId(event.id, auditId);

  /* ⛔ THE ALERT IS LAST AND IT NEVER FAILS THE ACT (`emitters.ts`'s own rule). The desk is on; a bell that could
     not be written must not report that it is off. `byName` is null on purpose — ruling 420's actor is an id, and
     finding a name here would be a second read on a path that has just moved money's gate. */
  await announceSwitchedOn({ byName: null, activeBots });

  return { ok: true, changed: true, activeBots, recorded };
}
