/**
 * U33a-R · THE FIVE CHECKS THAT MUST ALL HOLD BEFORE LICENCE OUTREACH MAY BE OPENED — pure, so the card, the action and
 * `test:licence-outreach` all read ONE statement of what "ready" means (spec `docs/marketing-specs/U33a-U37c-OD58.md`
 * §5.3 · §6 U33a-R · §7.7; OD57 · OD58).
 *
 * ⭐ WHAT OPENING MEANS. Until it is open, a campaign may reach only people who gave consent. Open, it may also reach a
 * player who has not stopped 50pick offers, and a contact on a list recorded under the licence. That is a change to who
 * the platform may lawfully text, so the checks are not advice: the writer refuses while any of them fails, names each
 * one, and writes nothing.
 *
 * ⛔ THREE OF THE FIVE ARE ABOUT WHAT THE PUBLIC HAS BEEN TOLD, AND THEY ARE NOT THIS FILE'S OWN. They are
 * `policyOpeningProblems` (shipped with U33p), read over the words the two legal pages print NOW — because the promise
 * that binds is the one a reader can see, not the one in the repository. This module adds the other two, which are about
 * the platform's own books rather than its pages, and gives all five the sentence the card shows.
 *
 * ⭐ THE FIFTH (U33r, 2026-10-07): `referee_keys` — every agent referee named before the exclusion existed must be keyed
 * (`npm run ops:marketing-referee-keys -- backfill` on production) before outreach can reach anybody, or a referee
 * promised "we never contact you for marketing" is a stranger to the gate. ⛔ The live-send switch refuses to open on the
 * SAME check (`live-switch.ts`), so neither door to a send opens while it is outstanding.
 *
 * ⛔ AND THE RECORD HAS TO BE READABLE BEFORE ANY OF THIS MEANS ANYTHING. An unreadable record (never hydrated, or read
 * in part) makes every line look unsaved, which would name three checks that may all in fact be satisfied — a refusal
 * for the right reason told as three wrong ones. The server refuses that case on its own, BEFORE calling here
 * (`policyLinesReadable`, spec §5.3's ⚠️, and the U33p review's F8). This function is never asked to guess.
 */
import { policyOpeningProblems, type PolicyLinesRecord, type PolicyOpeningCheck } from "@/lib/legal/policy-lines";

/** The five, in the order the card shows them: the three the public texts own, then this unit's two. */
export const OUTREACH_OPEN_CHECKS = ["privacy_gateway", "privacy_lawful", "rg_age", "preledger", "referee_keys"] as const;
export type OutreachOpenCheck = (typeof OUTREACH_OPEN_CHECKS)[number];

/**
 * ⛔ THE SWITCH-OFFS RECORDED BEFORE THE CONSENT LEDGER EXISTED. U33a-0 counted them on production
 * (`npm run ops:marketing-preledger-offs`, the plan's STEP 29) and found **none**, so there is nothing to carry into the
 * ledger and this check passes. It is a CODE constant rather than a config row on purpose: it is a statement about a
 * migration an engineer performed once, not a dial an officer may turn.
 */
export type PreLedgerOffs = "reconciled" | "outstanding";

/**
 * U33r · WHAT `npm run ops:marketing-referee-keys` COUNTS — counts only, never a number, a key or an application id.
 * ⛔ A "number" here is a Tanzanian mobile number a PROMISED referee's contact leads to: written in it, or held by an
 * account or a book row with an e-mail address written in it (the reviewers' MINOR-1).
 */
export type RefereeKeyCounts = {
  /** Every agent application read. */
  readonly applications: number;
  /** Those whose referees were given the old promise — named before the re-worded /legal/privacy §9 went live. */
  readonly promised: number;
  /** Promised applications holding at least one referee contact. */
  readonly withContact: number;
  /** The distinct referee numbers those contacts lead to. */
  readonly numbers: number;
  /** ⛔ How many of those numbers have no key yet — 0 once the backfill has run. */
  readonly missing: number;
  /** ⛔ Contacts with no e-mail in them holding nine or more digits that gave NO number, and that read as neither a
   *  landline nor a foreign number — the reader could not tell whose number they are (the reviewers' MINOR-2). */
  readonly unreadable: number;
  /** Contacts that read as a landline or a foreign number: no marketing SMS can reach them, so nothing is keyed. */
  readonly notMobile: number;
  /** Contacts holding an e-mail and no number, whose e-mail no account or book row with a number holds. */
  readonly emailOnlyUnmatched: number;
};

/**
 * ⛔ U33r · PRODUCTION'S RECORD OF THE REFEREE-KEY BACKFILL — the two lines the ops door printed there, copied into the
 * code by the commit that records them (`REFEREE_KEYS_ON_PRODUCTION`, `outreach-record.ts`). `status` is the census
 * BEFORE the backfill; `backfill` is the door's AFTER line with how many rows it wrote.
 */
export type RefereeKeysRecord = {
  /** When the backfill ran on production — an ISO instant. */
  readonly ranAt: string;
  readonly status: RefereeKeyCounts;
  readonly backfill: RefereeKeyCounts & { readonly written: number };
};
export type RefereeKeysState = "reconciled" | "outstanding";

const COUNT_KEYS: readonly (keyof RefereeKeyCounts)[] = [
  "applications", "promised", "withContact", "numbers", "missing", "unreadable", "notMobile", "emailOnlyUnmatched",
];
const isCount = (v: unknown): v is number => typeof v === "number" && Number.isSafeInteger(v) && v >= 0;
const isCounts = (v: unknown): boolean =>
  v !== null && typeof v === "object" && COUNT_KEYS.every((k) => isCount((v as Record<string, unknown>)[k]));

/**
 * ⭐ IS THE BACKFILL DONE ON PRODUCTION? Only a recorded, well-formed record whose AFTER line says NOTHING is missing and
 * NOTHING is unreadable — every promised referee's number keyed, and no contact the reader could not read. ⛔ Anything
 * else is OUTSTANDING: no record (today), a malformed one, a count that is not a count, a number still missing, an
 * unreadable contact still on file. Never on a guess.
 */
export function refereeKeysState(record: RefereeKeysRecord | null): RefereeKeysState {
  if (record === null || typeof record !== "object") return "outstanding";
  if (typeof record.ranAt !== "string" || !Number.isFinite(Date.parse(record.ranAt))) return "outstanding";
  if (!isCounts(record.status) || !isCounts(record.backfill) || !isCount(record.backfill.written)) return "outstanding";
  return record.backfill.missing === 0 && record.backfill.unreadable === 0 ? "reconciled" : "outstanding";
}

/** One sentence per check — exactly the words of spec §7.7, so the card never phrases a refusal its own way. */
export const OUTREACH_CHECK_SENTENCE: Readonly<Record<OutreachOpenCheck, string>> = Object.freeze({
  privacy_gateway:
    "The Privacy Notice still says offers go only to people who agree. Update it first (Public policy lines → Privacy §4).",
  privacy_lawful:
    "Add the Privacy Notice's licence line and review its consent line first (Public policy lines → Privacy §3).",
  rg_age:
    "The Responsible Gambling line must say how a non-player's age is confirmed before outreach can reach non-players. Update it first.",
  preledger:
    "The switch-offs recorded before the consent ledger existed haven't been reconciled yet (an engineering step).",
  referee_keys:
    "The agent referees named before their marketing exclusion existed haven't all been excluded yet (an engineering step).",
});

/* ⛔ The three public checks keep THEIR ids, and this maps them rather than restating them: `PolicyOpeningCheck` is
   already `"privacy_gateway" | "privacy_lawful" | "rg_age"`, so the compiler refuses the day U33p renames one — which a
   second hand-written list of the same three could not do. */
const POLICY_CHECK: Readonly<Record<PolicyOpeningCheck, OutreachOpenCheck>> = Object.freeze({
  privacy_gateway: "privacy_gateway",
  privacy_lawful: "privacy_lawful",
  rg_age: "rg_age",
});

/**
 * ⭐ EVERY FAILING CHECK, IN THE ORDER OF `OUTREACH_OPEN_CHECKS` — `[]` means outreach may be opened. The caller shows one
 * sentence per returned check and writes nothing while the list is non-empty. ⛔ Each engineering check passes ONLY on
 * the exact word "reconciled": a missing argument is a failing check, never a passing one.
 */
export function outreachOpenProblems(
  record: PolicyLinesRecord,
  preLedgerOffs: PreLedgerOffs,
  refereeKeys: RefereeKeysState,
): OutreachOpenCheck[] {
  const out: OutreachOpenCheck[] = policyOpeningProblems(record).map((c) => POLICY_CHECK[c]);
  if (preLedgerOffs !== "reconciled") out.push("preledger");
  if (refereeKeys !== "reconciled") out.push("referee_keys");
  return OUTREACH_OPEN_CHECKS.filter((c) => out.includes(c));
}
