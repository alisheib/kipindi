/**
 * ⭐ "SECOND-OFFICER CHECKS" — THE OWNER'S ONE SETTING OVER EVERY CHECK THAT A DIFFERENT OR SECOND OFFICER MUST ACT, OR THAT
 * ONLY THE SAME OFFICER MAY ACT, ON ANOTHER PERSON'S CASE (programme FEE-TAX-2026-10, release R1).
 *
 * The ruling: `docs/COMPLIANCE-DECISIONS.md` § "2026-10-24 · The fee becomes 13% of every stake, a 15% winnings tax on every
 * win, Millionea's fee moves to the ticket, and any admin may do any step (owner rulings; in force from the switch)", item 6.
 * Ali: "any admin to do anything … we allow our admins full access as they are very limited in quantity and trusted" —
 * "No more second-person checks", for every staff account. The tracker is `docs/FEE-TAX-PLAN.md` §4 R1.
 *
 *   ON  — the twelve checks below refuse exactly as they did before R1.
 *   OFF — each of the twelve is skipped, and the act proceeds as it does for any officer. Nothing else moves: every act is
 *         still audited under the officer's own name, by the same rows as before.
 *
 * ⭐ WHERE THE ANSWER COMES FROM — THREE CASES, AND THE OWNER'S RULING IS THE DEFAULT:
 *   · NOTHING STORED (no row was ever saved) — OFF. The setting goes live OFF by the Owner's own word, with no click after the
 *     release: the ruling above and his go-live answers of the same day, 2026-10-24 ("no more second-person checks"; the
 *     setting OFF from the release, not from an act after it). The ruling carries his name and its date; no row is needed
 *     to make it the law, and none is written on his behalf.
 *   · A READ THAT FAILS — the store could not be asked (`loadConfigResult` answers `ok: false`) or it threw — ON. Stricter
 *     on an error, never weaker: a database fault re-imposes the second officer, it never removes one. A stored row this
 *     version cannot understand is the same kind of error, and reads ON too.
 *   · A STORED, WELL-FORMED ROW — whatever it says, ON or OFF. A stored value always wins over the default: the Owner turns
 *     the checks back ON from the card on /admin/system (and OFF again), each change an audited act with his reason.
 *
 * THE TWELVE, each gated at its own site through `secondOfficerChecksOn` (the ON words of each are unchanged):
 *    1. Millionea — the officer who drafted a week may not attest its translations (`maswali-service.ts`, attestParity);
 *    2. Millionea — nor may an officer who edited the draft since its last attestation; and the draft-history read that
 *       exists only for these two (`draftAuthorship`) is neither made nor a refusal while OFF;
 *    3. Millionea — only the officer who set a question's present result may correct it (`maswali-service.ts`, correctSeal);
 *    4. Millionea — objection rulings are barred to the question's sealer and its confirmer (`maswali-objections.ts`);
 *    5. Millionea — and to the officer whose upheld ruling set the present result (the same function);
 *    6. KYC — the high-risk maker-checker and its fail-closed risk-score read (`kyc-risk.ts`, kycApprovalMakerChecker);
 *    7. the monthly Gaming Board pack — its preparer may not approve it (`report-pack.ts`, packApprovalGate);
 *    8. Up & Down — an archived chain's purge needs its second stage from a different officer (`purge-stage1-store.ts`,
 *       purgeStage2Gate);
 *    9. a held withdrawal at or above the two-person line — two different approvers (`aml/stage1-store.ts`, amlReleaseStep);
 *   10. a balance adjustment at or above that line — a second, different officer submits it again
 *       (`players/[id]/adjust-stage1-store.ts`, largeAdjustmentStep);
 *   11. Yes/No and Up & Down markets — the officer who placed a payout hold may not decide it (`objections-service.ts`,
 *       rejectObjection and upholdObjection). ⛔ Only an officer's hold on a market they hold no money in: an objection on
 *       one's OWN stake stays refused whatever the setting says (ruling 6b, below);
 *   12. contacts imports — only the officer who started one, or an ADMIN, may continue it (`contacts/import-staging.ts`,
 *       mayDriveImport — the one rule the staging, the check and the commit ask — and importOpenRuns, the way to the runs).
 * And one wording follows its OWN switch, not this one: the bulk-resolve row of a staged market says "another officer must
 * complete it" only while two-officer approval of resolutions is ON (`bulk-verdict-copy.ts`).
 *
 * ⛔ WHAT IT NEVER TOUCHES (ruling 6b and the records): an officer's checks on their OWN account — their identity, source of
 *    funds, held money, wallet freeze, refused funds, proposal prize, agent application, standing and invite, desk account;
 *    the rules that staff may not play — no Millionea ticket, the ticket-holder bars, no desk or agent account, the
 *    promotion block; every role and grant check (`roles.ts`, `control-gates.ts`, `MONEY_ROLES`); the Owner's typed
 *    ceremonies; every audit row. Two-officer approval of market RESOLUTION has its own switch on the resolver queue
 *    (`resolution.policy.requireTwoOfficer`, `resolution-policy.ts`) and is not this setting — the Millionea confirm-seal
 *    bars follow that switch, not this one.
 *
 * ⛔ TWO DELIBERATE DIFFERENCES FROM THE HOUSE PATTERN IT FOLLOWS (`resolution-policy.ts` — a SystemConfig row, audited
 *    COMPLIANCE, one writer):
 *    · IT IS READ FRESH ON EVERY CHECK. No hydrate-once cache: the platform runs on more than one container, and a cached
 *      flag keeps a container on the answer it read at boot until it restarts — so the Owner's change would hold on one
 *      container and not on the next. One keyed read per officer act is cheap, and it is the only shape in which a change
 *      made anywhere holds everywhere at once.
 *    · A FAILED READ ANSWERS ON. Nothing stored is the relaxed position here as it is there (the Owner's ruling, OFF), but
 *      the resolution switch answers a read that failed with no answer at all (`readRequireTwoOfficerResolution` → null, so
 *      its callers refuse); this one answers the STRICT position, so every gated act still proceeds — under a second
 *      officer. It tells the two cases apart through `loadConfigResult`, never `loadConfig`, which folds a failed read into
 *      "nothing stored": the Owner's OFF is the answer only when the store answered that no row exists.
 *
 * With no database (local development, the in-memory suites) the row lives in process memory, exactly as the journey and
 * invite switches keep theirs (`simple-journey-switch.ts`): a fresh process holds nothing, so it reads OFF, as production
 * does before the Owner stores a position.
 *
 * Guards: `test:second-officer-switch` (each of the twelve under each answer — nothing stored, a failed read, a stored ON, a
 * stored OFF — and the setting's own rules) and its red twin `red:second-officer-switch`.
 */
import { audit } from "./audit";
import { loadConfigResult, saveConfigOrThrow } from "./config-store";
import { hasDatabase } from "./prisma";
import { withLock } from "./locks";
import { db } from "./store";
import { cleanReason } from "@/lib/affiliate-rules";

/** The SystemConfig key — one row, written only by `setSecondOfficerChecks`. */
export const SECOND_OFFICER_POLICY_KEY = "second_officer.policy";
/** The Owner's written reason, kept with the change: at least this many characters… */
export const SECOND_OFFICER_REASON_MIN = 5;
/** …and at most this many. */
export const SECOND_OFFICER_REASON_MAX = 300;

/** The stored row: the position, and who put it there, when and why. */
type StoredPolicy = { on: boolean; changedBy: string; changedAt: string; reason: string };

/**
 * The setting as read NOW. `on` is what every check obeys; `source` says where it came from, so the Owner's card can say
 * "OFF by the Owner's ruling" or "it could not be read, so the checks are ON" instead of drawing a position nobody stored.
 * ⭐ Nothing stored is the Owner's ruling (OFF); a failed read and a row this version cannot understand are errors (ON).
 */
export type SecondOfficerPolicy =
  | { source: "stored"; on: boolean; changedBy: string; changedAt: string; reason: string }
  | { source: "absent"; on: false }
  | { source: "unreadable" | "malformed"; on: true };

/** Why the Owner's act changed nothing — a code the card words in the officer's language (`secondOfficer.refused*`). */
export type SecondOfficerRefusal =
  | "not_understood" | "session" | "who_unknown" | "not_owner" | "reason_short" | "reason_long" | "unread" | "not_stored" | "outcome_unknown";

/** What the Owner's act answers. `recorded` is false only when the change LANDED and its COMPLIANCE row did not. */
export type SecondOfficerSetResult =
  | { ok: true; changed: boolean; on: boolean; recorded: boolean }
  | { ok: false; code: SecondOfficerRefusal; error: string; field?: "reason" };

/** The refusals in English — the server's log and the suites read these; the card words the code in the officer's language. */
const COPY: Record<SecondOfficerRefusal, string> = {
  not_understood: "The request was not understood, so nothing changed. Reload the page and try again.",
  session: "Your session ended — sign in again. Nothing changed.",
  who_unknown: "We could not confirm who you are, so nothing changed. Reload the page and try again.",
  not_owner: "Only the Owner can change second-officer checks.",
  reason_short: `Say why, in ${SECOND_OFFICER_REASON_MIN} characters or more. It is kept with the change.`,
  reason_long: `Keep the reason to ${SECOND_OFFICER_REASON_MAX} characters or fewer.`,
  unread: "The setting could not be read, so nothing changed. Try again in a moment.",
  not_stored: "The change did not reach the database, so nothing changed. Try again.",
  outcome_unknown: "The change was sent but could not be read back. Reload the page to see the setting as it is now.",
};
const refusal = (code: SecondOfficerRefusal, field?: "reason"): SecondOfficerSetResult =>
  (field ? { ok: false, code, error: COPY[code], field } : { ok: false, code, error: COPY[code] });

// ── THE STORE — the database row, or process memory with no database ──────────────────────────────────────────────

/** ⚠️ TEST SEAM SHAPE — the journey switch's. `hasDatabase() === false` selects the in-memory row. */
export type SecondOfficerStoreDeps = {
  loadConfigResult?: (key: string) => Promise<{ ok: true; value: unknown } | { ok: false; error: string }>;
  saveConfig?: (key: string, value: unknown) => Promise<void>;
  hasDatabase?: () => boolean;
};

declare global {
  // eslint-disable-next-line no-var
  var __50PICK_SECOND_OFFICER_MEM: { value: unknown } | undefined;
  // eslint-disable-next-line no-var
  var __50PICK_SECOND_OFFICER_DEPS: SecondOfficerStoreDeps | null | undefined;
}

/** On globalThis, as the house's in-memory rows are: a dev server bundles a page and a server action apart, and both must
 *  read the one row. */
const mem = () => (globalThis.__50PICK_SECOND_OFFICER_MEM ??= { value: null });
const deps = (): SecondOfficerStoreDeps | null => globalThis.__50PICK_SECOND_OFFICER_DEPS ?? null;
const dbPresent = () => (deps()?.hasDatabase ?? hasDatabase)();

/** ⭐ A Json column does not hand back the object you gave it; neither does the memory row. */
const jsonCopy = (v: unknown): unknown => (v === undefined ? null : JSON.parse(JSON.stringify(v)));

async function storeLoad(): Promise<{ ok: true; value: unknown } | { ok: false }> {
  if (!dbPresent()) return { ok: true, value: jsonCopy(mem().value) };
  const load: NonNullable<SecondOfficerStoreDeps["loadConfigResult"]> = deps()?.loadConfigResult ?? loadConfigResult;
  const res = await load(SECOND_OFFICER_POLICY_KEY);
  return res.ok ? { ok: true, value: res.value } : { ok: false };
}

/** ⛔ THROWS when the write fails (`saveConfigOrThrow`): `saveConfig` swallows its error, and a change reported as made
 *  that never reached the row is the one failure this act must not have. The read-back below confirms it either way. */
async function storeSave(value: StoredPolicy): Promise<void> {
  if (!dbPresent()) { mem().value = jsonCopy(value); return; }
  const save: NonNullable<SecondOfficerStoreDeps["saveConfig"]> = deps()?.saveConfig ?? saveConfigOrThrow;
  await save(SECOND_OFFICER_POLICY_KEY, value);
}

/** A stored value, understood — or null when it is not the shape this version writes (an error, which reads as ON). */
function parsePolicy(v: unknown): StoredPolicy | null {
  if (!v || typeof v !== "object" || Array.isArray(v)) return null;
  const r = v as Record<string, unknown>;
  if (typeof r.on !== "boolean") return null;
  if (typeof r.changedBy !== "string" || typeof r.changedAt !== "string" || typeof r.reason !== "string") return null;
  return { on: r.on, changedBy: r.changedBy, changedAt: r.changedAt, reason: r.reason };
}

// ── THE READERS ─────────────────────────────────────────────────────────────────────────────────────────────────────

/** ⭐ THE SETTING, READ NOW. ⛔ Never rejects: a store that throws, or answers that it could not be asked, is `unreadable`
 *  — and `unreadable` is ON. Nothing stored is `absent`: the Owner's ruling, OFF. */
export async function readSecondOfficerPolicy(): Promise<SecondOfficerPolicy> {
  let res: Awaited<ReturnType<typeof storeLoad>>;
  try {
    res = await storeLoad();
  } catch {
    return { source: "unreadable", on: true };
  }
  if (!res.ok) return { source: "unreadable", on: true };
  // ⭐ The Owner's ruling of 2026-10-24 is the default: with no row ever saved the checks are OFF (the header).
  if (res.value === null || res.value === undefined) return { source: "absent", on: false };
  const p = parsePolicy(res.value);
  if (!p) return { source: "malformed", on: true };
  return { source: "stored", on: p.on, changedBy: p.changedBy, changedAt: p.changedAt, reason: p.reason };
}

/**
 * ⭐ THE ONE QUESTION EVERY GATED CHECK ASKS: are second-officer checks ON? True when the Owner's stored row says ON, and
 * when the setting cannot be read or understood; false when the stored row says OFF, and when nothing is stored (the
 * Owner's ruling). Read fresh, every time — see the header. ⛔ Never rejects.
 */
export async function secondOfficerChecksOn(): Promise<boolean> {
  return (await readSecondOfficerPolicy()).on;
}

// ── THE WRITER — the Owner's act, the only door ─────────────────────────────────────────────────────────────────────

/** Every act on the setting is serialised on this lock, so the "before" an act records is the row it replaced. */
const POLICY_LOCK = "second-officer:policy";

/**
 * ⭐ THE OWNER TURNS SECOND-OFFICER CHECKS ON OR OFF. The action calls `requireOwner` first (the Owner's session and its
 * step-up); this re-reads the actor's STORED role itself, so no caller can reach the write with a grant alone. Then a
 * written reason, cleaned of invisible characters, of 5–300 characters. Under the lock: a fresh read (a setting that cannot
 * be read changes nothing — the officer would be told a "before" nobody read), the no-op check, the write, the read-back,
 * and only then the COMPLIANCE row with the setting before and after, the reason, and who and when.
 * ⛔ A REFUSAL IS A UNION, NEVER A THROW. Turning the checks ON writes a reason too: both directions carry a name and a time.
 *
 * @param on       the position the Owner chose — ON re-imposes every check, OFF lets any officer act;
 * @param ownerId  the SESSION's user id (the action's `requireOwner`), never a posted one;
 * @param reason   the Owner's words, kept on the row and on the audit record.
 */
export async function setSecondOfficerChecks(on: boolean, ownerId: string, reason: string): Promise<SecondOfficerSetResult> {
  if (typeof on !== "boolean") return refusal("not_understood");
  if (typeof ownerId !== "string" || ownerId.length === 0) return refusal("session");
  const auditAction = on ? "second_officer.checks_on" : "second_officer.checks_off";

  // (1) THE OWNER — on the STORED row. A refusal is a SECURITY row, as `requireOwner`'s is.
  let role: string | null;
  try {
    role = (await db.user.findById(ownerId))?.role ?? null;
  } catch {
    return refusal("who_unknown");
  }
  if (role !== "ADMIN") {
    void audit({
      category: "SECURITY",
      action: "privilege_escalation_blocked",
      actorId: ownerId,
      targetType: "Action",
      targetId: auditAction,
      payload: { role: role ?? "unknown", ownerOnly: true, action: auditAction },
    });
    return refusal("not_owner");
  }

  // (2) THE REASON — cleaned (five zero-width spaces are not a reason), bounded, stored as cleaned.
  const why = cleanReason(reason);
  if (why.length < SECOND_OFFICER_REASON_MIN) return refusal("reason_short", "reason");
  if (why.length > SECOND_OFFICER_REASON_MAX) return refusal("reason_long", "reason");

  type Landed = { changed: false } | { changed: true; before: SecondOfficerPolicy; after: StoredPolicy };
  const out = await withLock(POLICY_LOCK, async (): Promise<SecondOfficerSetResult | Landed> => {
    // (3) A FRESH READ. ⛔ An unreadable setting changes nothing: the record would name a "before" nobody read.
    const before = await readSecondOfficerPolicy();
    if (before.source === "unreadable") return refusal("unread");
    // Already in that position: nothing is written and nothing is recorded — nothing stored already reads OFF (the Owner's
    // ruling), so an OFF then changes nothing. A malformed row is rewritten either way — it reads ON, and the Owner's act
    // is what puts a readable row back.
    if ((before.source === "stored" || before.source === "absent") && before.on === on) return { changed: false };
    // (4) THE WRITE, then (5) THE READ-BACK — never inferred from the write having returned.
    const after: StoredPolicy = { on, changedBy: ownerId, changedAt: new Date().toISOString(), reason: why };
    try {
      await storeSave(after);
    } catch {
      return refusal("not_stored");
    }
    const back = await readSecondOfficerPolicy();
    if (back.source === "unreadable") return refusal("outcome_unknown");
    if (back.source !== "stored" || back.on !== on || back.changedAt !== after.changedAt || back.changedBy !== ownerId) {
      return refusal("not_stored");
    }
    return { changed: true, before, after };
  });
  if ("ok" in out) return out;
  if (!out.changed) return { ok: true, changed: false, on, recorded: true };

  // (6) THE COMPLIANCE ROW — after the read-back, with the setting before and after. ⚠️ `audit()` never rejects: only
  // `recorded` says whether the row is on file, and a landed change whose row is missing is said as exactly that.
  const before = out.before;
  const row = await audit({
    category: "COMPLIANCE",
    action: auditAction,
    actorId: ownerId,
    targetType: "SystemFlag",
    targetId: SECOND_OFFICER_POLICY_KEY,
    payload: {
      before: before.source === "stored"
        ? { on: before.on, source: "stored", changedBy: before.changedBy, changedAt: before.changedAt }
        : { on: before.on, source: before.source },
      after: { on: out.after.on, changedAt: out.after.changedAt },
      reason: why,
      note: on
        ? "Second-officer checks ON — each of the twelve checks named in docs/FEE-TAX-PLAN.md §4 R1 refuses as before R1: a different or second officer must act on another person's case."
        : "Second-officer checks OFF — any officer may take each of the twelve steps named in docs/FEE-TAX-PLAN.md §4 R1 (owner ruling 6 of 2026-10-24). Checks on an officer's own account, the staff-may-not-play rules and every role check stay.",
    },
  });
  if (!row.recorded) console.error(`[second-officer] the ${auditAction} row was not recorded (${row.unrecorded}) — the change landed`);
  return { ok: true, changed: true, on, recorded: row.recorded };
}

/**
 * ⚠️ TEST SEAM ONLY — never call this from application code. Points the setting at an injected store (`deps`), or back at
 * the real one (`null`, which also empties the in-memory row: the no-database boot state, "absent" — the Owner's OFF).
 * Answers the store it replaced, so a suite that moves the setting for one act can put back exactly what it had.
 */
export function __setSecondOfficerStoreForTests(next: SecondOfficerStoreDeps | null): SecondOfficerStoreDeps | null {
  if (process.env.NODE_ENV === "production") throw new Error("__setSecondOfficerStoreForTests is a test seam and refuses to run in production.");
  const before = globalThis.__50PICK_SECOND_OFFICER_DEPS ?? null;
  globalThis.__50PICK_SECOND_OFFICER_DEPS = next;
  if (next === null) mem().value = null;
  return before;
}
