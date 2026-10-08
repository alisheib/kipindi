/**
 * U33a-G · THE DECISION TABLE, EXECUTED — the gate's §3.2 table run twice over one seeded world, once with the
 * licence-outreach record CLOSED and once OPEN (spec `docs/marketing-specs/U33a-U37c-OD58.md` §3.1–§3.5 · §9 U33a-G;
 * OD57 · OD58). A section of `test:marketing-consent`, beside `consent-basis.mts`.
 *
 * ⭐ IT DRIVES THE REAL GATE, not a re-implementation of it. The three reads that existed before U33a-G are the store's
 * own (`DB_GATE_READS`), answering out of this section's seeded rows, and only the TWO NEW reads are planted: the
 * record, and the number's book standing. That split is the point — whether the DAL computes a standing correctly is
 * `test:dal-parity` §27's question, and what this section asks is the one nothing else can: given a standing and a
 * record, what does the gate DECIDE. The RG standing, the identity check and the account status are read from the
 * seeded rows exactly as production reads them, so a licence basis cannot quietly skip them.
 *
 * ⛔ WHAT THE TWO COLUMNS ARE FOR. Every row is asserted in BOTH states, because the dangerous failure is not a wrong
 * answer while the record is open — it is a change of answer while the record is CLOSED. Production is closed today, so
 * the closed column is a parity check against the behaviour that is live right now, and any drift in it is a regression
 * shipped to real people.
 *
 * ⚠️ WHAT THE RED CASES HERE DO AND DO NOT PROVE. Each plants a gate that answers wrongly in exactly ONE named way and
 * requires the assertion naming that row to turn red — so every assertion below is proven live rather than decorative.
 * ⛔ It is NOT a source-level mutation of `consent.ts`: it cannot catch a defect nobody thought to name. The spec's full
 * `gateWithDefect` matrix (G0 parity against the pre-change model, and its twelve source plants) is still owed, and the
 * tracker says so — this section is the decision table, not the whole of §9 U33a-G.
 *
 * ⭐ THE FINAL RULE (2026-10-07) — two changes to the table, each a row here with its plant:
 *   · Q9 REVERSED (G4, G4b): the two-year lapse is refused EXACTLY as before while the record is closed, and reached on
 *     LICENCE_PLAYER while it is open — then held to RG, age and status exactly as a never-asked player is;
 *   · U33r, step 1b (G18–G23): a number keyed as a promised agent referee is refused `agent_referee` in BOTH states —
 *     a consenting player's, a never-asked player's, a listed contact's and a typed test's — after the stop list and
 *     before any basis is read; and it never asks WHEN a referee was named — the key holds no instant (the U33r review's
 *     MAJOR-1): the WRITER decides who was promised (`referee-exclusion.mts` R8), and a key held is the whole answer.
 *     The referee keys are written by the REAL writer (`recordRefereeKeys`), and the gate reads them through the store's
 *     own read (`DB_GATE_READS.refereeHeld`) — so this is the keyed hash, end to end.
 */
// house-bot: covered by L2 sweep — this seeds fixture accounts and one self-exclusion row straight through the store, so no in-app
// hook fires; the holder sweep re-reads every bot holder once a minute and applies whatever changed (04 F8, A2). It writes only to the
// accounts it creates itself (`lu<n>`), which no bot holds, and it is imported only by `test:marketing-consent`.
import { db } from "../../src/lib/server/store.ts";
import type {
  BookStanding, MessagingLocale, StoredKyc, StoredResponsibleGambling, StoredUser,
} from "../../src/lib/server/store.ts";
import { toMsisdn255 } from "../../src/lib/phone-normalize.ts";
import { mayReceiveMarketingSms, DB_GATE_READS } from "../../src/lib/server/marketing/consent.ts";
import type {
  MarketingGateContext, MarketingGateReads, MarketingGateVerdict, TestAttestation,
} from "../../src/lib/server/marketing/consent.ts";
import type { LicenceOutreach } from "../../src/lib/server/marketing/outreach-record.ts";
import { SMS_CONSENT_WORDINGS } from "../../src/lib/marketing/consent-wording.ts";
// U33r · the REAL writer seeds the referee keys, and the constant it asks when it writes.
import { recordRefereeKeys, REFEREE_NEW_WORDS_LIVE_AT } from "../../src/lib/server/marketing/referee-exclusion.ts";

export type Ok = (label: string, cond: boolean, detail?: string) => void;

/** The gate under test. The real one by default; a red case hands in one that answers wrongly in one way. */
export type LicenceImpl = {
  readonly gate: (
    msisdn: string, now: Date, reads: MarketingGateReads, context: MarketingGateContext,
  ) => Promise<MarketingGateVerdict>;
};
export const REAL_LICENCE: LicenceImpl = { gate: mayReceiveMarketingSms };

const PINNED_SW = (() => {
  const found = SMS_CONSENT_WORDINGS.find((w) => w.site === "REGISTRATION" && w.locale === "SW");
  if (!found) throw new Error("no pinned SW registration wording");
  return found.wording;
})();
/** A GIVEN under words that never named SMS — the pre-U6 tick. Not a consent to SMS marketing (OQ11). */
const OLD_WORDING = "Nipe matangazo.";

/** The record, in each of the two states the table is run under. */
const CLOSED: LicenceOutreach = { state: "closed", why: "default" };
const OPEN: LicenceOutreach = { state: "open", recordedBy: "usr_officer_g", recordedAt: "2026-10-05T09:00:00.000Z" };

const COVER = { basisId: "lb_abcdefghijklmnopqrst", listId: "cl_x", recordedAt: "2026-09-01T00:00:00.000Z" };
const NO_ROW: BookStanding = { row: "none", cover: null };
const LIVE_COVERED: BookStanding = { row: "live", cover: COVER };
const LIVE_BARE: BookStanding = { row: "live", cover: null };
const ERASED: BookStanding = { row: "erased", cover: null };

export const LICENCE_LABELS = {
  g1: "G1 · a player who was never asked — no ledger row, toggle off — is refused `no_consent` while the record is closed, and ALLOWED on LICENCE_PLAYER when it is open, with the record's own instant as the ref",
  g2: "G2 · a player whose only GIVEN is under words that never named SMS is refused while closed, and ALLOWED on LICENCE_PLAYER while open — the licence reaches somebody who was never properly asked",
  g3: "G3 · ⛔ a WITHDRAWN latest row is refused `consent_withdrawn` in BOTH states — the licence basis never overrides a stop, and says so",
  g4: "G4 · ⭐ Q9 REVERSED (the owner's FINAL rule, 2026-10-07) · a toggle switched off after a GIVEN with no withdrawal (the two-year lapse) is refused `no_consent` while the record is CLOSED — today's detail, byte for byte — and ALLOWED on LICENCE_PLAYER while it is OPEN, with the record's own instant as the ref",
  g4b: "G4b · ⛔ …and a LAPSED player is then held to RG, age and status exactly as a never-asked one: serving a self-exclusion → `rg_self_excluded`, under 18 → `age_minor`, a CLOSED account (closure clears the flag too) → `account_status` while open — and each `no_consent` while closed",
  g5: "G5 · ⛔ a player serving a self-exclusion is refused `rg_self_excluded` in both states — a licence basis never counts as opting in again (S11)",
  g6: "G6 · ⛔ a player under 18 is refused `age_minor` in both states, whatever the basis",
  g7: "G7 · ⛔ a CLOSED account is refused `account_status` in both states",
  g8: "G8 · a contact on a list whose unrevoked basis covers them is refused while closed and ALLOWED on LICENCE_LIST while open, with the basis id as the ref and the 18+ taken from the cover",
  g9: "G9 · a contact on no list, or whose cover was revoked or post-dates them, is refused `no_consent` while closed and `no_basis` while open — its own reason, never folded into no_consent",
  g10: "G10 · ⛔ an ERASED book record is refused `no_basis` while open — only a new consent reaches it again, and no list basis and no attestation override it",
  g11: "G11 · ⛔ a WITHDRAWN contact ON a covering list is refused `consent_withdrawn` in both states — the list never outranks the person's own stop",
  g12: "G12 · ⛔ a suppressed number is refused `suppressed` in both states, asked FIRST, before any basis is considered",
  g13: "G13 · a contact consented under a pinned SMS sentence with no 18+ evidence is refused `age_unknown` in both states — consent to be messaged is not a statement of age (OD14)",
  g14: "G14 · a contact consented under a pinned sentence AND covered by a list is ALLOWED on CONSENT in both states — consent is asked first and wins wherever it exists, and the 18+ comes from the cover",
  g15: "G15 · the typed test's attestation: a non-member is ALLOWED on LICENCE_TEST while open; it is ignored while the record is closed, ignored when stale, and never overrides an erased record",
  g16: "G16 · ⛔ asking changes nothing — no consent row, suppression, user, RG row or referee key is written by any call in this table",
  g17: "G17 · every ALLOWED names a basis whose ref has that kind's shape, and no ref that can reach an audit payload carries a run of nine digits",
  g18: "G18 · ⛔ U33r · a CONSENTING player whose number is a promised agent referee is refused `agent_referee` in BOTH states — the promise is asked before any basis, so a consent given at that number never outranks it — with no account on the refusal, and a detail that names NO instant (MAJOR-1) and no number",
  g19: "G19 · ⛔ U33r · a NEVER-ASKED player and a LAPSED player whose numbers are promised referees are refused `agent_referee` in BOTH states — an open licence-outreach record never reaches a referee",
  g20: "G20 · ⛔ U33r · a contact consented under a pinned sentence AND covered by a list, and a contact handed a fresh typed-test attestation, whose numbers are promised referees, are refused `agent_referee` in BOTH states — no consent, list basis or attestation reaches a referee",
  g21: "G21 · ⛔ U33r · THE ORDER — a referee on the stop list is refused `suppressed` (the stop list is asked first), and a referee is refused right after it, BEFORE any basis is read: the account, the ledger, the record and the book are never asked about the number",
  g22: "G22 · ⛔ U33r · THE GATE NEVER ASKS WHEN — with no new words live (REFEREE_NEW_WORDS_LIVE_AT is null) a referee keyed with a naming years from now is refused in both states and on a typed test, and the gate's read answers a yes or a no, never an instant (MAJOR-1: who was promised is the writer's decision)",
  g23: "G23 · ⚠️ CONTROL · U33r · every referee number this section keyed reads HELD through the store's own read, and none of G1–G15's numbers does — so every row above is a non-referee, answering exactly as it always did",
} as const;

/* ══ THE WORLD ══════════════════════════════════════════════════════════════════════════════════════════════════ */

const BASE = 61_000_000;
let seq = 0;
const phone = (i: number): string => `07${String(BASE + i)}`;
const key = (i: number): string => toMsisdn255(phone(i));

function makeUser(id: string, phoneE164: string, over: Partial<StoredUser>): StoredUser {
  const now = new Date().toISOString();
  return {
    id, phoneE164,
    passwordHash: null, passwordSalt: null, failedLoginCount: 0, lockedUntil: null,
    role: "PLAYER", status: "ACTIVE", locale: "SW", displayName: null,
    dob: "1990-01-01", region: null, acceptedTermsVersion: "v1", acceptedTermsAt: now,
    marketingOptIn: false, emailVerifiedAt: null, email: null, idType: null, idNumber: null,
    idVerifiedAt: null, createdAt: now, updatedAt: now, ...over,
  } as StoredUser;
}

const rgRow = (userId: string, selfExclusionUntil: string | null): StoredResponsibleGambling => ({
  id: `lrg${seq++}`, userId, selfExclusionUntil,
  dailyDepositLimitTzs: null, weeklyDepositLimitTzs: null, monthlyDepositLimitTzs: null,
  dailyLossLimitTzs: null, sessionMinutes: null, breakUntil: null, pendingLimit: null,
  createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z",
} as StoredResponsibleGambling);

/** Which fixture each phone is — so a plant can corrupt exactly one row's answer and nothing else. */
export const FX = {
  neverAsked: 1, oldWordingPlayer: 2, withdrawnPlayer: 3, lapsedPlayer: 4, selfExcluded: 5,
  minor: 6, closedAccount: 7, listed: 8, uncovered: 9, erasedContact: 10, withdrawnListed: 11,
  suppressedListed: 12, consentedBare: 13, consentedListed: 14, typedTest: 15,
  // ── Q9 reversed · a lapse held to the protections (G4b) ──
  lapsedSelfExcluded: 16, lapsedMinor: 17, lapsedClosed: 18,
  // ── U33r · promised agent referees (G18–G22) ──
  refereeConsenting: 19, refereeNeverAsked: 20, refereeLapsed: 21, refereeListed: 22, refereeTyped: 23,
  refereeSuppressed: 24, refereeLater: 25,
} as const;

/** U33r · the fixtures whose numbers this section keys as promised referees — every other FX number is a non-referee. */
export const REFEREE_FX: readonly number[] = [
  FX.refereeConsenting, FX.refereeNeverAsked, FX.refereeLapsed, FX.refereeListed, FX.refereeTyped, FX.refereeSuppressed, FX.refereeLater,
];
/** When the referees were named — the agent programme's first week — and, for `refereeLater`, years after any plausible
 *  re-wording: with no new words live, it is excluded all the same (G22). */
const REFEREES_NAMED_AT = "2026-09-08T10:00:00.000Z";
const REFEREE_NAMED_LATER = "2030-01-01T00:00:00.000Z";

const STANDING: Record<number, BookStanding> = {
  [FX.listed]: LIVE_COVERED,
  [FX.uncovered]: LIVE_BARE,
  [FX.erasedContact]: ERASED,
  [FX.withdrawnListed]: LIVE_COVERED,
  [FX.suppressedListed]: LIVE_COVERED,
  [FX.consentedBare]: LIVE_BARE,
  [FX.consentedListed]: LIVE_COVERED,
  // U33r · a referee contact that WOULD be reached on its own consent and its list's cover — and must not be.
  [FX.refereeListed]: LIVE_COVERED,
  [FX.refereeSuppressed]: LIVE_COVERED,
  [FX.refereeTyped]: LIVE_BARE,
};

let seeded = false;
export async function seedLicenceWorld(): Promise<void> {
  if (seeded) return;
  seeded = true;
  const consent = async (i: number, status: "GIVEN" | "WITHDRAWN", wording: string, when: string) =>
    Promise.resolve(db.messagingConsent.create({
      id: `lc${seq++}`, channel: "SMS", identifier: key(i), category: "MARKETING",
      status, source: "REGISTRATION", wording, locale: "SW" as MessagingLocale,
      evidence: "fixture", recordedBy: null, createdAt: when,
    }));
  const user = async (i: number, over: Partial<StoredUser>, seUntil?: string | null) => {
    const id = `lu${seq++}`;
    await Promise.resolve(db.user.create(makeUser(id, `+${key(i)}`, over)));
    if (seUntil !== undefined) await Promise.resolve(db.responsible.upsert(rgRow(id, seUntil)));
    return id;
  };

  // ── the player rows ──
  await user(FX.neverAsked, { marketingOptIn: false });                                   // no ledger row at all
  await user(FX.oldWordingPlayer, { marketingOptIn: true });
  await consent(FX.oldWordingPlayer, "GIVEN", OLD_WORDING, "2026-01-01T00:00:00.000Z");
  await user(FX.withdrawnPlayer, { marketingOptIn: true });
  await consent(FX.withdrawnPlayer, "GIVEN", PINNED_SW, "2026-01-01T00:00:00.000Z");
  await consent(FX.withdrawnPlayer, "WITHDRAWN", PINNED_SW, "2026-02-01T00:00:00.000Z");
  await user(FX.lapsedPlayer, { marketingOptIn: false });
  await consent(FX.lapsedPlayer, "GIVEN", PINNED_SW, "2026-01-01T00:00:00.000Z");
  await user(FX.selfExcluded, { marketingOptIn: false }, new Date(Date.now() + 30 * 86400_000).toISOString());
  await user(FX.minor, { marketingOptIn: false, dob: "2015-01-01" });
  await user(FX.closedAccount, { marketingOptIn: false, status: "CLOSED" });

  // ── the contact rows (no account holds these numbers) ──
  await consent(FX.withdrawnListed, "WITHDRAWN", PINNED_SW, "2026-02-01T00:00:00.000Z");
  await Promise.resolve(db.suppression.create({
    id: `ls${seq++}`, channel: "SMS", identifier: key(FX.suppressedListed), category: "MARKETING",
    reason: "WITHDRAWN", evidence: "fixture", recordedBy: null,
    createdAt: "2026-01-01T00:00:00.000Z", liftedAt: null, liftedReason: null,
  }));
  await consent(FX.consentedBare, "GIVEN", PINNED_SW, "2026-01-01T00:00:00.000Z");
  await consent(FX.consentedListed, "GIVEN", PINNED_SW, "2026-01-01T00:00:00.000Z");
  // FX.uncovered and FX.erasedContact and FX.listed and FX.typedTest carry no ledger row at all.

  // ── Q9 reversed · three LAPSED players (the flag cleared, the latest row still GIVEN), each with a protection (G4b) ──
  await user(FX.lapsedSelfExcluded, { marketingOptIn: false }, new Date(Date.now() + 30 * 86400_000).toISOString());
  await consent(FX.lapsedSelfExcluded, "GIVEN", PINNED_SW, "2024-01-01T00:00:00.000Z");
  await user(FX.lapsedMinor, { marketingOptIn: false, dob: "2015-01-01" });
  await consent(FX.lapsedMinor, "GIVEN", PINNED_SW, "2024-01-01T00:00:00.000Z");
  await user(FX.lapsedClosed, { marketingOptIn: false, status: "CLOSED" });
  await consent(FX.lapsedClosed, "GIVEN", PINNED_SW, "2024-01-01T00:00:00.000Z");

  // ── U33r · the promised referees: each a fixture that WOULD be reached, or refused for another reason, without the key ──
  await user(FX.refereeConsenting, { marketingOptIn: true });                              // a consent the gate counts
  await consent(FX.refereeConsenting, "GIVEN", PINNED_SW, "2026-01-01T00:00:00.000Z");
  await user(FX.refereeNeverAsked, { marketingOptIn: false });                             // LICENCE_PLAYER while open
  await user(FX.refereeLapsed, { marketingOptIn: false });                                 // the lapse, reached while open
  await consent(FX.refereeLapsed, "GIVEN", PINNED_SW, "2024-01-01T00:00:00.000Z");
  await consent(FX.refereeListed, "GIVEN", PINNED_SW, "2026-01-01T00:00:00.000Z");         // a consented, covered contact
  await Promise.resolve(db.suppression.create({
    id: `ls${seq++}`, channel: "SMS", identifier: key(FX.refereeSuppressed), category: "MARKETING",
    reason: "WITHDRAWN", evidence: "fixture", recordedBy: null,
    createdAt: "2026-01-01T00:00:00.000Z", liftedAt: null, liftedReason: null,
  }));
  // FX.refereeTyped and FX.refereeLater carry no ledger row: a stranger, but for the key.
  // ⭐ Keyed by the REAL writer, from contacts spelled the way applicants type them — the gate then reads the keyed hash.
  const spelled = (i: number): string => `+255 ${phone(i).slice(1, 4)} ${phone(i).slice(4, 7)} ${phone(i).slice(7)}`;
  await recordRefereeKeys({
    contacts: [phone(FX.refereeConsenting), spelled(FX.refereeNeverAsked), `${phone(FX.refereeLapsed)} / ${spelled(FX.refereeListed)}`],
    namedAt: REFEREES_NAMED_AT,
  });
  await recordRefereeKeys({ contacts: [phone(FX.refereeTyped), phone(FX.refereeSuppressed)], namedAt: REFEREES_NAMED_AT });
  await recordRefereeKeys({ contacts: [spelled(FX.refereeLater)], namedAt: REFEREE_NAMED_LATER });
}

/** The reads: the store's own three, and the two U33a-G planted ones. */
function readsFor(record: LicenceOutreach): MarketingGateReads {
  return {
    ...DB_GATE_READS,
    outreach: () => record,
    bookStanding: (m: string) => {
      const idx = Object.values(FX).find((i) => key(i) === m);
      return (idx !== undefined ? STANDING[idx] : undefined) ?? NO_ROW;
    },
  };
}

const NOW = new Date("2026-10-05T10:00:00.000Z");
const attestation = (over: Partial<TestAttestation> = {}): TestAttestation => ({
  officerId: "usr_officer_g", at: NOW.toISOString(), attemptRef: "att_abcdefgh", wordingVersion: 1, ...over,
});

/* ══ THE ASSERTIONS ═════════════════════════════════════════════════════════════════════════════════════════════ */

type Answer = { ok: true; basis: string; basisRef: string } | { ok: false; reason: string; detail: string } | { threw: string };

export async function assertLicenceBasis(impl: LicenceImpl, tag: string, ok: Ok): Promise<void> {
  const p = (label: string) => `${tag}${label}`;
  const L = LICENCE_LABELS;
  await seedLicenceWorld();

  /** ⛔ A throw is an answer too — recorded, never a crash that hides every assertion after it. */
  const ask = async (i: number, record: LicenceOutreach, context: MarketingGateContext = {}): Promise<Answer> => {
    try {
      const v = await impl.gate(phone(i), NOW, readsFor(record), context);
      return v.ok ? { ok: true, basis: v.basis, basisRef: v.basisRef } : { ok: false, reason: v.skipReason, detail: v.detail };
    } catch (e) {
      return { threw: e instanceof Error ? e.message : String(e) };
    }
  };
  const closed = (i: number, ctx?: MarketingGateContext) => ask(i, CLOSED, ctx);
  const open = (i: number, ctx?: MarketingGateContext) => ask(i, OPEN, ctx);
  const refused = (a: Answer, reason: string): boolean => "ok" in a && a.ok === false && a.reason === reason;
  const allowed = (a: Answer, basis: string, ref?: string): boolean =>
    "ok" in a && a.ok === true && a.basis === basis && (ref === undefined || a.basisRef === ref);
  const show = (a: Answer): string => ("threw" in a ? `threw ${a.threw}` : a.ok ? `${a.basis}/${a.basisRef}` : a.reason);

  // ── G1 · the player nobody ever asked ───────────────────────────────────────────────────────────────────────────
  {
    const c = await closed(FX.neverAsked); const o = await open(FX.neverAsked);
    ok(p(L.g1), refused(c, "no_consent") && allowed(o, "LICENCE_PLAYER", `outreach:${OPEN.recordedAt}`),
      `closed ${show(c)} · open ${show(o)}`);
  }
  // ── G2 · the old wording ────────────────────────────────────────────────────────────────────────────────────────
  {
    const c = await closed(FX.oldWordingPlayer); const o = await open(FX.oldWordingPlayer);
    ok(p(L.g2), refused(c, "no_consent") && allowed(o, "LICENCE_PLAYER"), `closed ${show(c)} · open ${show(o)}`);
  }
  // ── G3 · a stop is a stop ───────────────────────────────────────────────────────────────────────────────────────
  {
    const c = await closed(FX.withdrawnPlayer); const o = await open(FX.withdrawnPlayer);
    const says = "ok" in o && o.ok === false && o.detail.includes("the licence basis never overrides a stop");
    ok(p(L.g3), refused(c, "consent_withdrawn") && refused(o, "consent_withdrawn") && says,
      `closed ${show(c)} · open ${show(o)} · names the rule ${says}`);
  }
  // ── G4 · the lapse — Q9 REVERSED: refused exactly as before while closed, reached on the licence while open ────────
  {
    const c = await closed(FX.lapsedPlayer); const o = await open(FX.lapsedPlayer);
    // ⛔ The closed answer is today's, detail and all: the toggle refuses before the ledger is ever read (S5).
    const today = "ok" in c && c.ok === false && c.detail === "the player's own marketing toggle is off";
    ok(p(L.g4), refused(c, "no_consent") && today && allowed(o, "LICENCE_PLAYER", `outreach:${OPEN.recordedAt}`),
      `closed ${show(c)} (today's detail ${today}) · open ${show(o)}`);
  }
  // ── G4b · a lapse reached is a lapse protected: RG, age and status, exactly as a never-asked player ─────────────────
  {
    const rows = [
      [FX.lapsedSelfExcluded, "rg_self_excluded"], [FX.lapsedMinor, "age_minor"], [FX.lapsedClosed, "account_status"],
    ] as const;
    const said: string[] = [];
    let held = true;
    for (const [i, reason] of rows) {
      const c = await closed(i); const o = await open(i);
      said.push(`${reason}: closed ${show(c)} · open ${show(o)}`);
      if (!refused(c, "no_consent") || !refused(o, reason)) held = false;
    }
    ok(p(L.g4b), held, said.join(" · "));
  }
  // ── G5–G7 · the protections a basis never lowers ────────────────────────────────────────────────────────────────
  {
    const c = await closed(FX.selfExcluded); const o = await open(FX.selfExcluded);
    ok(p(L.g5), refused(c, "no_consent") && refused(o, "rg_self_excluded"), `closed ${show(c)} · open ${show(o)}`);
  }
  {
    const c = await closed(FX.minor); const o = await open(FX.minor);
    ok(p(L.g6), refused(c, "no_consent") && refused(o, "age_minor"), `closed ${show(c)} · open ${show(o)}`);
  }
  {
    const c = await closed(FX.closedAccount); const o = await open(FX.closedAccount);
    ok(p(L.g7), refused(c, "no_consent") && refused(o, "account_status"), `closed ${show(c)} · open ${show(o)}`);
  }
  // ── G8 · the covered contact ────────────────────────────────────────────────────────────────────────────────────
  {
    const c = await closed(FX.listed); const o = await open(FX.listed);
    ok(p(L.g8), refused(c, "no_consent") && allowed(o, "LICENCE_LIST", `list-basis:${COVER.basisId}`),
      `closed ${show(c)} · open ${show(o)}`);
  }
  // ── G9 · covered by nothing ─────────────────────────────────────────────────────────────────────────────────────
  {
    const c = await closed(FX.uncovered); const o = await open(FX.uncovered);
    ok(p(L.g9), refused(c, "no_consent") && refused(o, "no_basis"), `closed ${show(c)} · open ${show(o)}`);
  }
  // ── G10 · the erased record ─────────────────────────────────────────────────────────────────────────────────────
  {
    const o = await open(FX.erasedContact);
    const withAtt = await open(FX.erasedContact, { testAttestation: attestation() });
    ok(p(L.g10), refused(o, "no_basis") && refused(withAtt, "no_basis"),
      `open ${show(o)} · with an attestation ${show(withAtt)}`);
  }
  // ── G11 · a stop outranks a list ────────────────────────────────────────────────────────────────────────────────
  {
    const c = await closed(FX.withdrawnListed); const o = await open(FX.withdrawnListed);
    ok(p(L.g11), refused(c, "consent_withdrawn") && refused(o, "consent_withdrawn"), `closed ${show(c)} · open ${show(o)}`);
  }
  // ── G12 · suppression first, always ─────────────────────────────────────────────────────────────────────────────
  {
    const c = await closed(FX.suppressedListed); const o = await open(FX.suppressedListed);
    ok(p(L.g12), refused(c, "suppressed") && refused(o, "suppressed"), `closed ${show(c)} · open ${show(o)}`);
  }
  // ── G13 · consent is not a statement of age ─────────────────────────────────────────────────────────────────────
  {
    const c = await closed(FX.consentedBare); const o = await open(FX.consentedBare);
    ok(p(L.g13), refused(c, "age_unknown") && refused(o, "age_unknown"), `closed ${show(c)} · open ${show(o)}`);
  }
  // ── G14 · consent wins, and the cover supplies the 18+ ──────────────────────────────────────────────────────────
  {
    const c = await closed(FX.consentedListed); const o = await open(FX.consentedListed);
    const refShape = "ok" in c && c.ok === true && c.basisRef.startsWith("ledger:");
    ok(p(L.g14), allowed(c, "CONSENT") && allowed(o, "CONSENT") && refShape,
      `closed ${show(c)} · open ${show(o)}`);
  }
  // ── G15 · the typed test ────────────────────────────────────────────────────────────────────────────────────────
  {
    const live = await open(FX.typedTest, { testAttestation: attestation() });
    const whileClosed = await closed(FX.typedTest, { testAttestation: attestation() });
    const stale = await open(FX.typedTest, { testAttestation: attestation({ at: "2026-10-05T09:55:00.000Z" }) });
    const malformed = await open(FX.typedTest, { testAttestation: attestation({ attemptRef: "short" }) });
    ok(p(L.g15),
      allowed(live, "LICENCE_TEST", "test:att_abcdefgh") && refused(whileClosed, "no_consent")
        && refused(stale, "no_basis") && refused(malformed, "no_basis"),
      `open ${show(live)} · closed ${show(whileClosed)} · stale ${show(stale)} · malformed ${show(malformed)}`);
  }
  // ── G16 · asking writes nothing (the U7 lesson) ─────────────────────────────────────────────────────────────────
  {
    const count = async () => JSON.stringify({
      consents: (await Promise.resolve(db.messagingConsent.latestFor({ channel: "SMS", identifier: key(FX.neverAsked), category: "MARKETING" }))) ?? null,
      stop: (await Promise.resolve(db.suppression.find({ channel: "SMS", identifier: key(FX.listed), category: "MARKETING" }))) ?? null,
      optIn: (await Promise.resolve(db.user.findByPhone(`+${key(FX.neverAsked)}`)))?.marketingOptIn ?? null,
      // U33r · the referee keys — every row, not a count: a write that replaced one would move it too.
      referees: [...(globalThis as unknown as { __50PICK_STORE?: { agentRefereeKeys?: Map<string, unknown> } }).__50PICK_STORE?.agentRefereeKeys?.entries() ?? []],
    });
    const before = await count();
    for (const i of Object.values(FX)) { await open(i); await closed(i); }
    const after = await count();
    ok(p(L.g16), before === after, `before ${before.slice(0, 80)} · after ${after.slice(0, 80)}`);
  }
  // ── G17 · every ref has its kind's shape, and none that can be audited carries a phone number ───────────────────
  {
    const answers = [
      await open(FX.neverAsked), await open(FX.listed), await open(FX.consentedListed),
      await open(FX.typedTest, { testAttestation: attestation() }),
    ];
    const SHAPE: Record<string, RegExp> = {
      CONSENT: /^ledger:.+/, LICENCE_PLAYER: /^outreach:.+/, LICENCE_LIST: /^list-basis:.+/, LICENCE_TEST: /^test:.+/,
    };
    const shaped = answers.every((a) => "ok" in a && a.ok === true && SHAPE[a.basis]?.test(a.basisRef) === true);
    /* ⛔ A ref that reaches an audit payload must not carry a number. `ledger:` refs never do (S7), and the other
       three are ids and instants — a nine-digit run in any of them would be a phone number in the chain. */
    const auditable = answers.filter((a) => "ok" in a && a.ok === true && !a.basisRef.startsWith("ledger:"));
    const clean = auditable.every((a) => "ok" in a && a.ok === true && !/\d{9}/.test(a.basisRef));
    ok(p(L.g17), shaped && clean && auditable.length === 3,
      `shaped ${shaped} · auditable ${auditable.length} · clean ${clean}`);
  }

  /* ══ U33r · STEP 1b — THE PROMISED AGENT REFEREES ══════════════════════════════════════════════════════════════════ */
  // ── G18 · a consent never outranks the promise ──────────────────────────────────────────────────────────────────────
  {
    const c = await closed(FX.refereeConsenting); const o = await open(FX.refereeConsenting);
    let v: MarketingGateVerdict | null = null;
    try { v = await impl.gate(phone(FX.refereeConsenting), NOW, readsFor(OPEN), {}); } catch { v = null; }
    const noAccount = v !== null && !v.ok && v.userId === undefined;
    const detail = "ok" in o && o.ok === false ? o.detail : "";
    const says = detail.includes("referee") && !ISO_DAY.test(detail) && !detail.includes(REFEREES_NAMED_AT)
      && !NINE_DIGITS.test(detail) && !detail.includes(key(FX.refereeConsenting).slice(3));
    ok(p(L.g18), refused(c, "agent_referee") && refused(o, "agent_referee") && noAccount && says,
      `closed ${show(c)} · open ${show(o)} · no account ${noAccount} · detail names no instant and no number ${says}`);
  }
  // ── G19 · an open record never reaches a referee — never asked, or lapsed ────────────────────────────────────────────
  {
    const never = [await closed(FX.refereeNeverAsked), await open(FX.refereeNeverAsked)];
    const lapsed = [await closed(FX.refereeLapsed), await open(FX.refereeLapsed)];
    ok(p(L.g19), [...never, ...lapsed].every((a) => refused(a, "agent_referee")),
      `never asked ${never.map(show).join("/")} · lapsed ${lapsed.map(show).join("/")}`);
  }
  // ── G20 · no consent, list basis or attestation reaches a referee contact ───────────────────────────────────────────
  {
    const listed = [await closed(FX.refereeListed), await open(FX.refereeListed)];
    const typed = [await closed(FX.refereeTyped, { testAttestation: attestation() }), await open(FX.refereeTyped, { testAttestation: attestation() })];
    ok(p(L.g20), [...listed, ...typed].every((a) => refused(a, "agent_referee")),
      `listed and consented ${listed.map(show).join("/")} · typed ${typed.map(show).join("/")}`);
  }
  // ── G21 · the order: the stop list first, then the promise, then nothing else is read ───────────────────────────────
  {
    const stopped = [await closed(FX.refereeSuppressed), await open(FX.refereeSuppressed)];
    const count = { stop: 0, referee: 0, account: 0, ledger: 0, record: 0, book: 0, refereeEmail: 0, refereeBook: 0 };
    const base = readsFor(OPEN);
    const counting: MarketingGateReads = {
      suppression: (k) => { count.stop++; return base.suppression(k); },
      refereeHeld: (m) => { count.referee++; return base.refereeHeld(m); },
      userByPhone: (ph) => { count.account++; return base.userByPhone(ph); },
      latestConsent: (k) => { count.ledger++; return base.latestConsent(k); },
      outreach: () => { count.record++; return base.outreach(); },
      bookStanding: (m) => { count.book++; return base.bookStanding(m); },
      refereeEmailHeld: (e) => { count.refereeEmail++; return base.refereeEmailHeld(e); },
      refereeBookEmailHeld: (m) => { count.refereeBook++; return base.refereeBookEmailHeld(m); },
    };
    let v: MarketingGateVerdict | null = null;
    try { v = await impl.gate(phone(FX.refereeConsenting), NOW, counting, {}); } catch { v = null; }
    const refereeReads = { ...count };
    // ⚠️ CONTROL: the same counting reads DO see the account and the ledger for a non-referee player — so a zero above is
    // the gate not asking, never a counter that does not count.
    for (const k of Object.keys(count) as (keyof typeof count)[]) count[k] = 0;
    try { await impl.gate(phone(FX.neverAsked), NOW, counting, {}); } catch { /* the counts say what was read */ }
    const controlSaw = count.account >= 1 && count.ledger >= 1;
    ok(p(L.g21),
      stopped.every((a) => refused(a, "suppressed")) && v !== null && !v.ok && v.skipReason === "agent_referee"
        && refereeReads.stop === 1 && refereeReads.referee === 1
        && refereeReads.account === 0 && refereeReads.ledger === 0 && refereeReads.record === 0 && refereeReads.book === 0 && refereeReads.refereeEmail === 0 && refereeReads.refereeBook === 0 && controlSaw,
      `stopped ${stopped.map(show).join("/")} · referee reads ${JSON.stringify(refereeReads)} · control saw the account ${controlSaw}`);
  }
  // ── G22 · the gate never asks when ──────────────────────────────────────────────────────────────────────────────────
  {
    const later = [await closed(FX.refereeLater), await open(FX.refereeLater), await open(FX.refereeLater, { testAttestation: attestation() })];
    const answer = await Promise.resolve(DB_GATE_READS.refereeHeld(key(FX.refereeLater)));
    ok(p(L.g22), REFEREE_NEW_WORDS_LIVE_AT === null && later.every((a) => refused(a, "agent_referee")) && answer === true,
      `constant ${String(REFEREE_NEW_WORDS_LIVE_AT)} · named ${REFEREE_NAMED_LATER} → ${later.map(show).join("/")} · the read answers ${JSON.stringify(answer)}`);
  }
  // ── G23 · CONTROL — the keys are there, and only for the referees ───────────────────────────────────────────────────
  {
    const answers = await Promise.all(Object.values(FX).map(async (i) => [i, await Promise.resolve(DB_GATE_READS.refereeHeld(key(i)))] as const));
    const keyed = answers.filter(([i]) => REFEREE_FX.includes(i)).every(([, held]) => held === true);
    const others = answers.filter(([i]) => !REFEREE_FX.includes(i)).every(([, held]) => held === false);
    ok(p(L.g23), keyed && others && answers.length === Object.values(FX).length,
      answers.map(([i, held]) => `${i}:${held ? "held" : "-"}`).join(" "));
  }
}

/** A run of nine digits — a phone number's national part in any refusal text or ref. ⛔ A character class, no escape. */
const NINE_DIGITS = /[0-9]{9}/;
/** An ISO day — what any instant in a detail would start with. ⛔ Character classes, no escape. */
const ISO_DAY = /[0-9]{4}-[0-9]{2}-[0-9]{2}/;

/* ══ THE RED CASES ══════════════════════════════════════════════════════════════════════════════════════════════ */

export type LicenceDefect = {
  /** The licence basis is handed out as though it were a consent — the audit row would then claim a consent. */
  readonly basisAsConsent?: boolean;
  /** A WITHDRAWN row is overridden by a list cover. */
  readonly stopOverridden?: boolean;
  /** ⛔ Q9 UN-REVERSED — the lapse refusal restored: a switched-off player is refused under an open record again (the plant
   *  that was "the lapse rule dropped" until the owner's final rule made dropping it the law). */
  readonly lapseRestored?: boolean;
  /** A lapsed player reached under the licence WITHOUT the protections — RG, age and status skipped for them. */
  readonly lapseUnprotected?: boolean;
  /** An erased record is treated as an ordinary uncovered one. */
  readonly erasedForgotten?: boolean;
  /** The record is honoured as open even when it is closed. */
  readonly openWhileClosed?: boolean;
  /** A stale attestation is honoured. */
  readonly staleHonoured?: boolean;
  /** U33r · the referee keys never asked — every referee answered as a stranger. */
  readonly refereeIgnored?: boolean;
  /** U33r · consent asked BEFORE the promise — a referee who consented is reached on CONSENT. */
  readonly refereeAfterConsent?: boolean;
  /** U33r · the promise kept only while the record is CLOSED — an open record reaches a referee. */
  readonly refereeOnlyWhileClosed?: boolean;
  /** U33r · the promise asked BEFORE the stop list — a stopped referee says `agent_referee`, not `suppressed`. */
  readonly refereeBeforeStop?: boolean;
  /** U33r · the account read BEFORE the promise — the gate asks about a referee's account at all. */
  readonly accountBeforeReferee?: boolean;
  /** U33r · a guess at WHEN: a referee keyed with a naming after the final rule is let through though no new words are live. */
  readonly cutoffGuessed?: boolean;
};

/**
 * A gate that answers wrongly in exactly ONE way. ⛔ It wraps the REAL gate and corrupts one decision, so what it proves
 * is that the assertion naming that decision is live — see this file's header for what that does and does not cover.
 */
export function licenceGateWithDefect(d: LicenceDefect): LicenceImpl {
  return {
    gate: async (msisdn, now, reads, context) => {
      const record = await Promise.resolve(reads.outreach());
      const effective: MarketingGateReads = d.openWhileClosed ? { ...reads, outreach: () => OPEN } : reads;
      const ctx: MarketingGateContext = d.staleHonoured && context.testAttestation
        ? { testAttestation: { ...context.testAttestation, at: now.toISOString() } }
        : context;
      // U33r · the account asked about first — before the gate (and so before its promise) is asked at all.
      if (d.accountBeforeReferee) await Promise.resolve(reads.userByPhone(`+${toMsisdn255(msisdn)}`));
      const v = await mayReceiveMarketingSms(msisdn, now, effective, ctx);
      const standing = await Promise.resolve(reads.bookStanding(toMsisdn255(msisdn)));
      /** The same question with the referee keys answering "not a referee" — what each referee plant hands back. */
      const withoutPromise = () => mayReceiveMarketingSms(msisdn, now, { ...effective, refereeHeld: () => false }, ctx);
      if (d.basisAsConsent && v.ok && v.basis !== "CONSENT") return { ok: true, basis: "CONSENT", basisRef: v.basisRef };
      if (!v.ok && d.stopOverridden && v.skipReason === "consent_withdrawn" && standing.cover) {
        return { ok: true, basis: "LICENCE_LIST", basisRef: `list-basis:${standing.cover.basisId}` };
      }
      if (v.ok && d.lapseRestored && record.state === "open" && msisdn === phone(FX.lapsedPlayer)) {
        return { ok: false, skipReason: "no_consent", detail: "a lapse — the licence basis does not reach it" };
      }
      if (!v.ok && d.lapseUnprotected && record.state === "open"
        && [phone(FX.lapsedSelfExcluded), phone(FX.lapsedMinor), phone(FX.lapsedClosed)].includes(msisdn)) {
        return { ok: true, basis: "LICENCE_PLAYER", basisRef: `outreach:${OPEN.recordedAt}` };
      }
      if (!v.ok && d.erasedForgotten && standing.row === "erased" && context.testAttestation) {
        return { ok: true, basis: "LICENCE_TEST", basisRef: `test:${context.testAttestation.attemptRef}` };
      }
      if (!v.ok && v.skipReason === "agent_referee") {
        if (d.refereeIgnored) return withoutPromise();
        if (d.refereeAfterConsent) {
          const w = await withoutPromise();
          if (w.ok && w.basis === "CONSENT") return w;
        }
        if (d.refereeOnlyWhileClosed && record.state === "open") return withoutPromise();
        // The table holds no instant, so a gate that guessed WHEN could only guess per number — this one lets through the
        // referee the fixtures named years after the final rule.
        if (d.cutoffGuessed && msisdn === phone(FX.refereeLater)) return withoutPromise();
      }
      if (!v.ok && v.skipReason === "suppressed" && d.refereeBeforeStop) {
        const held = await Promise.resolve(reads.refereeHeld(toMsisdn255(msisdn)));
        if (held) return { ok: false, skipReason: "agent_referee", detail: "a referee, asked before the stop list" };
      }
      return v;
    },
  };
}

export function licenceCases(): { name: string; defect: LicenceDefect; expect: string }[] {
  return [
    { name: "a licence basis handed out as a CONSENT", defect: { basisAsConsent: true }, expect: LICENCE_LABELS.g1 },
    { name: "a list cover overriding a WITHDRAWN row", defect: { stopOverridden: true }, expect: LICENCE_LABELS.g11 },
    { name: "⛔ Q9 un-reversed — the lapse refusal restored under an open record", defect: { lapseRestored: true }, expect: LICENCE_LABELS.g4 },
    { name: "a lapsed player reached with RG, age and status skipped", defect: { lapseUnprotected: true }, expect: LICENCE_LABELS.g4b },
    { name: "an erased record reached by an attestation", defect: { erasedForgotten: true }, expect: LICENCE_LABELS.g10 },
    { name: "the record read open while it is closed", defect: { openWhileClosed: true }, expect: LICENCE_LABELS.g1 },
    { name: "a stale attestation honoured", defect: { staleHonoured: true }, expect: LICENCE_LABELS.g15 },
    { name: "U33r · the referee keys never asked", defect: { refereeIgnored: true }, expect: LICENCE_LABELS.g18 },
    { name: "U33r · consent asked before the promise — a consenting referee reached", defect: { refereeAfterConsent: true }, expect: LICENCE_LABELS.g18 },
    { name: "U33r · the promise kept only while the record is closed", defect: { refereeOnlyWhileClosed: true }, expect: LICENCE_LABELS.g19 },
    { name: "U33r · the promise asked before the stop list", defect: { refereeBeforeStop: true }, expect: LICENCE_LABELS.g21 },
    { name: "U33r · the referee's account read before the promise", defect: { accountBeforeReferee: true }, expect: LICENCE_LABELS.g21 },
    { name: "U33r · a referee keyed with a later naming let through on a guess at WHEN", defect: { cutoffGuessed: true }, expect: LICENCE_LABELS.g22 },
  ];
}
