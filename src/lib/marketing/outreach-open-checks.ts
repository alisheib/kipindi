/**
 * U33a-R · THE FOUR CHECKS THAT MUST ALL HOLD BEFORE LICENCE OUTREACH MAY BE OPENED — pure, so the card, the action and
 * `test:licence-outreach` all read ONE statement of what "ready" means (spec `docs/marketing-specs/U33a-U37c-OD58.md`
 * §5.3 · §6 U33a-R · §7.7; OD57 · OD58).
 *
 * ⭐ WHAT OPENING MEANS. Until it is open, a campaign may reach only people who gave consent. Open, it may also reach a
 * player who has not stopped 50pick offers, and a contact on a list recorded under the licence. That is a change to who
 * the platform may lawfully text, so the checks are not advice: the writer refuses while any of them fails, names each
 * one, and writes nothing.
 *
 * ⛔ THREE OF THE FOUR ARE ABOUT WHAT THE PUBLIC HAS BEEN TOLD, AND THEY ARE NOT THIS FILE'S OWN. They are
 * `policyOpeningProblems` (shipped with U33p), read over the words the two legal pages print NOW — because the promise
 * that binds is the one a reader can see, not the one in the repository. This module adds the fourth, which is about the
 * platform's own books rather than its pages, and gives all four the sentence the card shows.
 *
 * ⛔ AND THE RECORD HAS TO BE READABLE BEFORE ANY OF THIS MEANS ANYTHING. An unreadable record (never hydrated, or read
 * in part) makes every line look unsaved, which would name three checks that may all in fact be satisfied — a refusal
 * for the right reason told as three wrong ones. The server refuses that case on its own, BEFORE calling here
 * (`policyLinesReadable`, spec §5.3's ⚠️, and the U33p review's F8). This function is never asked to guess.
 */
import { policyOpeningProblems, type PolicyLinesRecord, type PolicyOpeningCheck } from "@/lib/legal/policy-lines";

/** The four, in the order the card shows them: the three the public texts own, then this unit's own. */
export const OUTREACH_OPEN_CHECKS = ["privacy_gateway", "privacy_lawful", "rg_age", "preledger"] as const;
export type OutreachOpenCheck = (typeof OUTREACH_OPEN_CHECKS)[number];

/**
 * ⛔ THE SWITCH-OFFS RECORDED BEFORE THE CONSENT LEDGER EXISTED. U33a-0 counted them on production
 * (`npm run ops:marketing-preledger-offs`, the plan's STEP 29) and found **none**, so there is nothing to carry into the
 * ledger and this check passes. It is a CODE constant rather than a config row on purpose: it is a statement about a
 * migration an engineer performed once, not a dial an officer may turn.
 */
export type PreLedgerOffs = "reconciled" | "outstanding";

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
 * sentence per returned check and writes nothing while the list is non-empty.
 */
export function outreachOpenProblems(record: PolicyLinesRecord, preLedgerOffs: PreLedgerOffs): OutreachOpenCheck[] {
  const out: OutreachOpenCheck[] = policyOpeningProblems(record).map((c) => POLICY_CHECK[c]);
  if (preLedgerOffs !== "reconciled") out.push("preledger");
  return OUTREACH_OPEN_CHECKS.filter((c) => out.includes(c));
}
