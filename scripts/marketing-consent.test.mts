/**
 * test:marketing-consent — U7's gate, EXECUTED.
 *
 * ⭐ THE ACCEPT LINE IS THE DESIGN: four mutually exclusive states in ONE run (allowed ·
 * suppressed · no consent · RG), so neither an always-open gate nor an always-closed one can
 * pass. A suite that only ever asserts refusals is satisfied by `return false`.
 *
 * ⛔ IN-PROCESS BY CONSTRUCTION. `--prove-red` plants the pre-fix shapes IN MEMORY and requires
 * the MATCHING assertion to fire. This file makes no file-writing call of any kind, so it stays
 * outside `test:red-anchors` §4's undeclared count.
 *
 * ⚠️ THE MODEL IS PROVEN FAITHFUL BEFORE IT IS USED TO PLANT ANYTHING. `gateWithDefect({})` —
 * the variant with no defect set — is asserted to agree with the shipped gate on every fixture.
 * Without that, a red case going red would be evidence about the model, not about the gate.
 *
 * Run:  npm run test:marketing-consent
 * Red:  npm run red:marketing-consent
 */
import { mayReceiveMarketingSms, userPhoneKeyFor, marketingAge, MARKETING_YOUNG_ADULT_AGE } from "../src/lib/server/marketing/consent.ts";
import type { MarketingGateVerdict, MarketingSkipReason } from "../src/lib/server/marketing/consent.ts";
import { marketingRgStanding } from "../src/lib/server/marketing/rg.ts";
import { db } from "../src/lib/server/store.ts";
import type { StoredUser, StoredResponsibleGambling } from "../src/lib/server/store.ts";
import { toMsisdn255 } from "../src/lib/phone-normalize.ts";
import { selfExclusionStanding, selfExclusionStandingOf, selfExclude, coolOff } from "../src/lib/server/responsible-gambling.ts";
import { dispatchSlice, MARKETING_RG_SUPPRESSED_ACTION } from "../src/lib/server/marketing/dispatch.ts";
import type { SliceRecipient, SliceOutcome, SliceDeps } from "../src/lib/server/marketing/dispatch.ts";
import { mintOptOutToken, stopMarketing } from "../src/lib/server/marketing/optout-service.ts";
import { getAuditForTargetsDurable } from "../src/lib/server/audit.ts";
import type { SmsOutbound, SmsBatchOutcome } from "../src/lib/server/sms.ts";
import { readFileSync } from "node:fs";
import { decomment } from "./lib/decomment.mts";

/* ⛔ FAILURE IS THE DEFAULT, SET BEFORE THE FIRST `await`. A suite whose verdict is written only
 * at the end scores GREEN when a promise never settles or the process exits early. */
process.exitCode = 1;

const PROVE_RED = process.argv.includes("--prove-red");

let pass = 0, fail = 0;
const failed: string[] = [];
const ok = (l: string, c: boolean, x = "") => {
  if (c) pass++; else { fail++; failed.push(l); }
  console.log(`${c ? "PASS" : "FAIL"} ${l}${x ? ` — ${x}` : ""}`);
};

type Gate = (msisdn: string) => Promise<MarketingGateVerdict>;

/* ══ FIXTURES ═══════════════════════════════════════════════════════════════════════════════
 * Every run takes its OWN block of numbers: the memory store is a process-global map, so a red
 * case reusing the green case's numbers would be asserting against rows the previous run left
 * behind — and a suite reading another run's state is not measuring what it names. */
let seq = 0;
const phoneFor = (run: number, idx: number): string => `07${String(10000000 + run * 100 + idx)}`;

function makeUser(id: string, phoneE164: string, over: Partial<StoredUser>): StoredUser {
  const now = new Date().toISOString();
  return {
    id, phoneE164,
    passwordHash: null, passwordSalt: null, failedLoginCount: 0, lockedUntil: null,
    role: "PLAYER", status: "ACTIVE", locale: "SW", displayName: null,
    dob: "1990-01-01", region: null, acceptedTermsVersion: "v1", acceptedTermsAt: now,
    marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null,
    createdAt: now, updatedAt: now, lastLoginAt: now, closedAt: null,
    ...over,
  };
}

const rgRow = (userId: string, selfExclusionUntil: string | null, patch: Partial<StoredResponsibleGambling> = {}): StoredResponsibleGambling => ({
  userId,
  dailyDepositLimit: null, weeklyDepositLimit: null, monthlyDepositLimit: null,
  dailyLossLimit: null, sessionTimeLimitMin: null, realityCheckIntervalMin: 60,
  selfExclusionUntil, coolingOffUntil: null,
  selfExclusionStartedAt: selfExclusionUntil, coolingOffStartedAt: null,
  pendingIncreaseTo: null, pendingIncreaseEffectiveAt: null,
  pendingWeeklyIncreaseTo: null, pendingWeeklyIncreaseEffectiveAt: null,
  pendingMonthlyIncreaseTo: null, pendingMonthlyIncreaseEffectiveAt: null,
  ...patch,
} as StoredResponsibleGambling);
const DAY = 86400_000;
const daysFromNow = (d: number) => new Date(Date.now() + d * DAY).toISOString();
/** A date of birth `n` whole years (and a fortnight) ago, as registration stores it: `YYYY-MM-DD`. */
const bornYearsAgo = (n: number): string => {
  const d = new Date(Date.now() - 14 * DAY);
  d.setUTCFullYear(d.getUTCFullYear() - n);
  return d.toISOString().slice(0, 10);
};

type Fixtures = Record<string, string>;

/** Seed one self-contained world and hand back the phone number for each case. */
async function seed(run: number): Promise<Fixtures> {
  const p = (i: number) => phoneFor(run, i);
  const mk = async (phone: string, over: Partial<StoredUser>, seUntil?: string | null, rgPatch: Partial<StoredResponsibleGambling> = {}) => {
    const id = `u${run}-${seq++}`;
    // ⭐ Stored the way registration really stores it: `tzPhone` yields `+255…`, WITH the plus.
    await Promise.resolve(db.user.create(makeUser(id, `+${toMsisdn255(phone)}`, over)));
    if (seUntil !== undefined) await Promise.resolve(db.responsible.upsert(rgRow(id, seUntil, rgPatch)));
    return id;
  };
  const consent = async (phone: string, status: "GIVEN" | "WITHDRAWN", when: string) =>
    Promise.resolve(db.messagingConsent.create({
      id: `c${run}-${seq++}`, channel: "SMS", identifier: toMsisdn255(phone), category: "MARKETING",
      status, source: "IMPORT", wording: "Ninakubali kupokea matangazo kwa SMS.", locale: "SW",
      evidence: "fixture", recordedBy: null, createdAt: when,
    }));

  // A · a consenting player — ⭐ deliberately given NO ResponsibleGambling row
  const consentingId = await mk(p(1), { marketingOptIn: true });
  // B · a consenting player who is ALSO suppressed — the order case
  await mk(p(2), { marketingOptIn: true });
  await Promise.resolve(db.suppression.create({
    id: `s${run}-${seq++}`, channel: "SMS", identifier: toMsisdn255(p(2)), category: "MARKETING",
    reason: "WITHDRAWN", evidence: "fixture", recordedBy: null, createdAt: "2026-01-01T00:00:00.000Z",
    // U8 · a suppression that has NOT been lifted — the row is still refusing.
    liftedAt: null, liftedReason: null,
  }));
  // C · a stranger with no ledger row at all
  // D · a contact who consented
  await consent(p(4), "GIVEN", "2026-01-01T00:00:00.000Z");
  // E · a contact who consented and then withdrew
  await consent(p(5), "GIVEN", "2026-01-01T00:00:00.000Z");
  await consent(p(5), "WITHDRAWN", "2026-02-01T00:00:00.000Z");
  // F · a player currently serving a self-exclusion
  await mk(p(6), { marketingOptIn: true }, new Date(Date.now() + 30 * 86400_000).toISOString());
  // G · ⭐ a player whose 24-hour self-exclusion ELAPSED A YEAR AGO (D9)
  await mk(p(7), { marketingOptIn: true }, new Date(Date.now() - 365 * 86400_000).toISOString());
  // H · a player who turned the toggle off
  await mk(p(8), { marketingOptIn: false });
  // I · a closed account that still carries consent
  await mk(p(9), { marketingOptIn: true, status: "CLOSED" });
  // J · ⭐ a player who said no, with an imported GIVEN ledger row trying to speak over them
  await mk(p(10), { marketingOptIn: false });
  await consent(p(10), "GIVEN", "2026-03-01T00:00:00.000Z");

  // ── U10 · cooling-off and the §5.6 order ───────────────────────────────────────────────────
  // K · a player ON a break (the status `coolOff` really writes, and a timer still running)
  await mk(p(11), { marketingOptIn: true, status: "COOLED_OFF" }, null, { coolingOffUntil: daysFromNow(2) });
  // L · ⭐ a break that ended, then a consent given AFTER it — the lift must exist
  await mk(p(12), { marketingOptIn: true, status: "COOLED_OFF" }, null, { coolingOffUntil: daysFromNow(-10) });
  await consent(p(12), "GIVEN", daysFromNow(-5));
  // M · ⭐ a break that ended yesterday, and the only consent PREDATES it (D9's shape, for breaks)
  await mk(p(13), { marketingOptIn: true, status: "COOLED_OFF" }, null, { coolingOffUntil: daysFromNow(-1) });
  await consent(p(13), "GIVEN", daysFromNow(-30));
  // N · 🔴 a consenting player whose pending deposit-limit rise has COME DUE — the write U7's fix missed
  const maturedId = await mk(p(14), { marketingOptIn: true }, null,
    { dailyDepositLimit: 1_000, pendingIncreaseTo: 5_000, pendingIncreaseEffectiveAt: daysFromNow(-1) });
  // O · a player SERVING a self-exclusion whose toggle is OFF — §5.6 asks consent first
  await mk(p(15), { marketingOptIn: false, status: "SELF_EXCLUDED" }, daysFromNow(30));

  // ── U11 · age, and U12 · the under-25 promise ──────────────────────────────────────────────
  // P · a consenting player aged 16 — registration refuses this, so it is a typed-false date of birth
  await mk(p(16), { marketingOptIn: true, dob: bornYearsAgo(16) });
  // Q · a consenting player with NO date of birth (erasure nulls it; one dev seed writes null)
  await mk(p(17), { marketingOptIn: true, dob: null });
  // R · ⭐ aged 20, took a break, the break ended, consented again after it — U10 lifts, U12 must not
  await mk(p(18), { marketingOptIn: true, status: "COOLED_OFF", dob: bornYearsAgo(20) }, null, { coolingOffUntil: daysFromNow(-30) });
  await consent(p(18), "GIVEN", daysFromNow(-10));
  // S · the SAME history at 30 — the control that the rule is the AGE BAND, not the history
  await mk(p(19), { marketingOptIn: true, status: "COOLED_OFF", dob: bornYearsAgo(30) }, null, { coolingOffUntil: daysFromNow(-30) });
  await consent(p(19), "GIVEN", daysFromNow(-10));
  // T · aged 20 with NO history — the control that under 25 alone is not refused (the promise is
  //     "under 25 IN a vulnerability segment", not "under 25")
  await mk(p(20), { marketingOptIn: true, dob: bornYearsAgo(20) });

  return {
    consenting: p(1), suppressed: p(2), stranger: p(3), contactGiven: p(4), contactWithdrawn: p(5),
    serving: p(6), minimumServed: p(7), toggledOff: p(8), closed: p(9), overriddenPlayer: p(10),
    onBreak: p(11), breakOverReconsented: p(12), breakOverStale: p(13), matured: p(14), servingNoConsent: p(15),
    minor: p(16), noDob: p(17), youngWithHistory: p(18), olderWithHistory: p(19), youngNoHistory: p(20),
    consentingId, maturedId,
  };
}

/* ══ THE ASSERTIONS ═════════════════════════════════════════════════════════════════════════ */
async function runAssertions(gate: Gate, f: Fixtures, tag: string): Promise<void> {
  const p = (n: string) => `${tag}${n}`;
  const verdict = async (phone: string) => gate(phone);
  const reasonOf = (v: MarketingGateVerdict): string => (v.ok ? "ALLOWED" : v.skipReason);
  const expect = async (label: string, phone: string, want: "ALLOWED" | MarketingSkipReason) => {
    const v = await verdict(phone);
    ok(p(label), reasonOf(v) === want, `got ${reasonOf(v)}${v.ok ? "" : ` — ${v.detail}`}`);
    return v;
  };

  // ── the four mutually exclusive states the Accept line demands, in one run ───────────────
  await expect("1 · a consenting player is ALLOWED", f.consenting, "ALLOWED");
  await expect("2 · ⛔ a SUPPRESSED number is refused even though its consent is valid — suppression is asked FIRST (OD11)", f.suppressed, "suppressed");
  await expect("3 · a stranger with no ledger row is refused — silence is never permission (OD7)", f.stranger, "no_consent");
  await expect("4 · a player serving a self-exclusion is refused", f.serving, "rg_self_excluded");

  // ── the ledger branch ───────────────────────────────────────────────────────────────────
  await expect("5 · a contact who consented is refused ONLY on age — no 18+ attestation exists until U33 (OD14), and none is inferred", f.contactGiven, "age_unknown");
  await expect("6 · a contact who withdrew is refused, and the reason says so", f.contactWithdrawn, "consent_withdrawn");

  // ── the player branch ───────────────────────────────────────────────────────────────────
  await expect("7 · ⭐ a 24-hour self-exclusion that ELAPSED A YEAR AGO is still refused (D9 — the period ending is not the person asking)", f.minimumServed, "rg_self_excluded");
  await expect("8 · a player whose own toggle is off is refused", f.toggledOff, "no_consent");
  await expect("9 · a CLOSED account is refused on status even though its toggle is on", f.closed, "account_status");
  await expect("10 · ⛔ an imported GIVEN row can NEVER speak over a player's own no (OD10)", f.overriddenPlayer, "no_consent");

  await expect("11 · an unusable number is refused before it can become a billed send", "123", "bad_msisdn");

  // ── ⭐ THE FORMAT BRIDGE, PINNED IN BOTH DIRECTIONS ──────────────────────────────────────
  // `tzPhone` stores `+255…`; the marketing key is bare `255…`. A gate that looks a player up
  // with the marketing key finds NOBODY, treats the whole player base as strangers, and hands
  // every one of them to the ledger branch — silently, with no error anywhere.
  const bare = toMsisdn255(f.consenting);
  ok(p("12 · ⭐ the BARE marketing key finds no user — the trap is real, not hypothetical"),
    (await Promise.resolve(db.user.findByPhone(bare))) === null, `looked up ${bare}`);
  ok(p("12b · ⭐ …and the bridged key finds the player"),
    (await Promise.resolve(db.user.findByPhone(userPhoneKeyFor(bare)))) !== null, `looked up ${userPhoneKeyFor(bare)}`);

  // ── the Accept line, asserted as a property rather than hoped for ────────────────────────
  const seen = new Set<string>();
  for (const phone of [f.consenting, f.suppressed, f.stranger, f.serving]) seen.add(reasonOf(await verdict(phone)));
  ok(p("13 · ACCEPT · four MUTUALLY EXCLUSIVE outcomes in one run — neither an always-open nor an always-closed gate can pass this"),
    seen.size === 4, `saw ${[...seen].sort().join(", ")}`);

  // ── 🔴 ASKING THE QUESTION MUST NOT WRITE ────────────────────────────────────────────────
  // `selfExclusionStanding` → `getRgSettings` ends in `db.responsible.upsert(fresh)` for any user
  // with no row, so the obvious gate CREATES a ResponsibleGambling row per recipient. At §3c's
  // 150,000-recipient audience that is 150,000 rows written by a decision not to message anyone.
  // The consenting fixture is seeded with NO rg row, and the gate has already run on it above.
  ok(p("14 · 🔴 the gate created NO ResponsibleGambling row — deciding must not write (150k recipients = 150k rows)"),
    (await Promise.resolve(db.responsible.get(f.consentingId))) === null,
    "a row here means the gate writes once per recipient");

  // ── U10 · the RG STANDING, through the gate ─────────────────────────────────────────────
  await expect("15 · a player ON a break is refused with its own reason, not as `account_status`", f.onBreak, "rg_cooling_off");
  await expect("16 · ⭐ a break that ENDED does not reopen marketing by itself — the consent on file predates it (D9, breaks)", f.breakOverStale, "rg_cooling_off");
  await expect("17 · ⭐ a break that ended, then a consent AFTER it: ALLOWED — the COOLED_OFF status nothing ever clears is admitted only then", f.breakOverReconsented, "ALLOWED");
  const matured = await verdict(f.matured);
  const maturedRow = await Promise.resolve(db.responsible.get(f.maturedId));
  ok(p("18 · 🔴 a row whose pending limit rise has COME DUE is not rewritten by the gate — the write U7's fix missed"),
    maturedRow?.pendingIncreaseTo === 5_000 && maturedRow?.dailyDepositLimit === 1_000,
    `verdict ${reasonOf(matured)} · pending=${maturedRow?.pendingIncreaseTo} daily=${maturedRow?.dailyDepositLimit}`);
  await expect("19 · §5.6 ORDER — a self-excluded player whose toggle is off is refused on CONSENT, which is asked first (the costly RG step never runs)", f.servingNoConsent, "no_consent");

  // ── U11 · AGE — adult, minor, unknown: three fixtures, three outcomes (the Accept line) ─────
  await expect("20 · a consenting player aged 16 is refused as a minor", f.minor, "age_minor");
  await expect("21 · ⭐ a consenting player with NO date of birth is refused as age_unknown — never treated as adult", f.noDob, "age_unknown");
  const ages = new Set<string>();
  for (const phone of [f.consenting, f.minor, f.noDob]) ages.add(reasonOf(await verdict(phone)));
  ok(p("22 · ACCEPT (U11) · adult, minor and unknown give THREE different outcomes in one run"), ages.size === 3, `saw ${[...ages].sort().join(", ")}`);

  // ── U12 · the published promise: under 25 IN a vulnerability segment ───────────────────────
  await expect("23 · ⭐ aged 20 with a break on record is refused even after re-consenting — U10's lift does not reach the under-25 promise", f.youngWithHistory, "rg_under25_history");
  await expect("24 · ⚠️ CONTROL — the SAME history at 30 is allowed: the rule is the age band, not the history", f.olderWithHistory, "ALLOWED");
  await expect("25 · ⚠️ CONTROL — aged 20 with NO history is allowed: the promise is 'under 25 in a segment', not 'under 25'", f.youngNoHistory, "ALLOWED");
}

/* ══ THE MODEL USED FOR PLANTING ════════════════════════════════════════════════════════════
 * ⚠️ This is the gate's shape written out so ONE step at a time can be made wrong. It is not
 * imported by anything and never ships. With no flags set it is asserted to agree with the
 * shipped gate on every fixture, so a red case's failure is attributable to the flag. */
type Defect = {
  swapOrder?: boolean;              // consent asked before suppression (OD11 broken)
  noBridge?: boolean;               // the `+` never added — every player becomes a stranger
  lockoutSemantics?: boolean;       // RG read the way `isLockedOut` reads it: only a RUNNING period refuses (D9)
  writesRgRow?: boolean;            // U7's first shape: `selfExclusionStanding` asked unguarded, so asking WRITES
  readsThroughWriter?: boolean;     // U7's fix: guarded for a MISSING row, but an existing row still goes through the writer
  ledgerOverridesPlayer?: boolean;  // an imported row speaks over a player's own no (OD10)
  rgBeforeConsent?: boolean;        // U7's order — RG asked before consent (§5.6 reversed, and the harm scan runs on everybody)
  breakNeverAdmitted?: boolean;     // pre-U10: COOLED_OFF refused for ever as `account_status`, whatever the player later says
  nullDobIsAdult?: boolean;         // U11's RED: a missing date of birth treated as adult
  contactAgeAssumed?: boolean;      // pre-U11: a consenting contact marketed with no 18+ attestation
  under25Ignored?: boolean;         // pre-U12: the published under-25 promise has no code behind it
};

function gateWithDefect(d: Defect): Gate {
  return async (msisdn) => {
    const identifier = toMsisdn255(msisdn);
    if (!identifier || identifier.length < 12) return { ok: false, skipReason: "bad_msisdn", detail: "unusable" };
    const key = { channel: "SMS" as const, identifier, category: "MARKETING" as const };

    const askSuppression = async (): Promise<MarketingGateVerdict | null> => {
      const s = await Promise.resolve(db.suppression.find(key));
      return s ? { ok: false, skipReason: "suppressed", detail: "suppressed" } : null;
    };
    // The RG step, or one of the three shapes this platform has shipped or nearly shipped instead of it.
    type RgAnswer = { refusal: MarketingGateVerdict | null; coolingOffEnded: boolean; rgHistory: boolean };
    const askRg = async (user: StoredUser): Promise<RgAnswer> => {
      if (d.writesRgRow || d.readsThroughWriter) {
        const hasRow = (await Promise.resolve(db.responsible.get(user.id))) !== null;
        const rg = (d.writesRgRow || hasRow) ? await selfExclusionStanding(user.id) : ({ state: "none" } as const);
        if (rg.state === "serving" || rg.state === "minimum_served") return { refusal: { ok: false, skipReason: "rg_self_excluded", detail: rg.state }, coolingOffEnded: false, rgHistory: true };
      }
      if (d.lockoutSemantics) {
        const row = await Promise.resolve(db.responsible.get(user.id));
        if (selfExclusionStandingOf(row?.selfExclusionUntil ?? null).state === "serving") return { refusal: { ok: false, skipReason: "rg_self_excluded", detail: "serving" }, coolingOffEnded: false, rgHistory: true };
        const co = row?.coolingOffUntil ? Date.parse(row.coolingOffUntil) : NaN;
        if (co > Date.now()) return { refusal: { ok: false, skipReason: "rg_cooling_off", detail: "on a break" }, coolingOffEnded: false, rgHistory: true };
        return { refusal: null, coolingOffEnded: !Number.isNaN(co), rgHistory: Boolean(row?.selfExclusionUntil || row?.coolingOffUntil) };
      }
      const rg = await marketingRgStanding(user, identifier);
      if (!rg.ok) return { refusal: { ok: false, skipReason: rg.skipReason, detail: rg.detail }, coolingOffEnded: false, rgHistory: true };
      return { refusal: null, coolingOffEnded: rg.coolingOffEnded, rgHistory: rg.rgHistory };
    };
    const askConsent = async (): Promise<MarketingGateVerdict | null> => {
      const user = await Promise.resolve(db.user.findByPhone(d.noBridge ? identifier : `+${identifier}`));
      if (user) {
        const consentRefusal = async (): Promise<MarketingGateVerdict | null> => {
          if (user.marketingOptIn === true) return null;
          if (!d.ledgerOverridesPlayer) return { ok: false, skipReason: "no_consent", detail: "toggle off" };
          const l = await Promise.resolve(db.messagingConsent.latestFor(key));
          return l?.status === "GIVEN" ? null : { ok: false, skipReason: "no_consent", detail: "toggle off" };
        };
        let rg: RgAnswer;
        if (d.rgBeforeConsent) {
          rg = await askRg(user);
          if (rg.refusal) return rg.refusal;
          const c = await consentRefusal();
          if (c) return c;
        } else {
          const c = await consentRefusal();
          if (c) return c;
          rg = await askRg(user);
          if (rg.refusal) return rg.refusal;
        }
        // Age, then the under-25 promise — the shipped gate's 2c/2d, each plantable on its own.
        const age = d.nullDobIsAdult && !user.dob ? { band: "adult" as const, years: 30 } : marketingAge(user.dob);
        if (age.band === "unknown") return { ok: false, skipReason: "age_unknown", detail: "no dob" };
        if (age.band === "minor") return { ok: false, skipReason: "age_minor", detail: "minor" };
        if (!d.under25Ignored && (age.years as number) < MARKETING_YOUNG_ADULT_AGE && rg.rgHistory) {
          return { ok: false, skipReason: "rg_under25_history", detail: "under 25 with history" };
        }
        const statusOk = ["ACTIVE", "PENDING_KYC"].includes(user.status)
          || (user.status === "COOLED_OFF" && rg.coolingOffEnded && !d.breakNeverAdmitted);
        if (!statusOk) return { ok: false, skipReason: "account_status", detail: user.status };
        return { ok: true };
      }
      const latest = await Promise.resolve(db.messagingConsent.latestFor(key));
      if (!latest) return { ok: false, skipReason: "no_consent", detail: "no row" };
      if (latest.status === "WITHDRAWN") return { ok: false, skipReason: "consent_withdrawn", detail: "withdrawn" };
      if (d.contactAgeAssumed) return { ok: true };
      return { ok: false, skipReason: "age_unknown", detail: "no attestation" };
    };

    if (d.swapOrder) {
      const c = await askConsent();
      // ⛔ THE PRE-FIX SHAPE: consent decides first, and only a refusal ever reaches suppression.
      // A withdrawn person still holding last year's consent row therefore sends.
      if (c && c.ok) return c;
      const s = await askSuppression();
      return s ?? (c as MarketingGateVerdict);
    }
    const s = await askSuppression();
    if (s) return s;
    return (await askConsent()) as MarketingGateVerdict;
  };
}

/* ══ U9 · THE LOOP CONTRACT ═════════════════════════════════════════════════════════════════
 * ⭐ WHAT A SEND LOOP MUST DO, asserted on a real two-slice drive. Between slice one and slice two three
 * people change their minds through the REAL acts — an opt-out through U8's `stopMarketing`, a
 * `selfExclude`, a `coolOff` — and none of them may reach the wire in slice two.
 * ⚠️ There is no production loop yet (U43). This contract is written so U43's engine plugs in as another
 * DRIVER and must pass the same assertions; today the driver is `dispatchSlice` called once per slice.
 * The fake wire returns its results in REVERSED order, so a loop that settles by position cannot pass. */
type Driver = (slices: SliceRecipient[][], between: () => Promise<void>, deps: SliceDeps) => Promise<SliceOutcome[]>;
type Dispatch = (rows: SliceRecipient[], deps: SliceDeps) => Promise<SliceOutcome[]>;

/** The loop U43 will be: slice by slice, the dispatch step asked at the moment of sending. */
const loopOver = (dispatch: Dispatch): Driver => async (slices, between, deps) => {
  const out: SliceOutcome[] = [];
  for (const [i, slice] of slices.entries()) {
    if (i > 0) await between();
    out.push(...await dispatch(slice, deps));
  }
  return out;
};

type Wire = { sent: SmsOutbound[]; calls: number; send: SliceDeps["send"] };
function fakeWire(failMsisdn: Set<string>, refused?: SmsBatchOutcome["refused"]): Wire {
  const w: Wire = { sent: [], calls: 0, send: async () => ({ results: [], balanceTzs: null }) };
  w.send = async (messages) => {
    w.calls++;
    if (refused) return { results: [], balanceTzs: null, refused };
    w.sent.push(...messages);
    const results = messages.map((m) => failMsisdn.has(m.to)
      ? { reference: `ref_${m.targetId}`, to: m.to, ok: false, code: "BAD_MSISDN" as const, error: "refused at the wire", targetType: m.targetType, targetId: m.targetId }
      : { reference: `ref_${m.targetId}`, to: m.to, ok: true, targetType: m.targetType, targetId: m.targetId });
    return { results: results.reverse(), balanceTzs: 100 };
  };
  return w;
}

async function seedLoop(run: number) {
  const p = (i: number) => phoneFor(run, i);
  const mkp = async (i: number) => {
    const id = `loop${run}-${i}`;
    await Promise.resolve(db.user.create(makeUser(id, `+${toMsisdn255(p(i))}`, { marketingOptIn: true })));
    await Promise.resolve(db.wallet.create({ id: `wal_${id}`, userId: id, balance: 0, pending: 0, hold: 0, currency: "TZS", status: "ACTIVE", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } as never));
    return { id, msisdn: toMsisdn255(p(i)) };
  };
  const A = await mkp(1), B = await mkp(2), X = await mkp(3), Y = await mkp(4), Z = await mkp(5), F = await mkp(6), G = await mkp(7);
  const token = await mintOptOutToken(X.msisdn);
  return { A, B, X, Y, Z, F, G, token };
}

async function runLoopContract(driver: Driver, run: number, tag: string): Promise<void> {
  const p = (n: string) => `${tag}${n}`;
  const w = await seedLoop(run);
  const row = (who: { msisdn: string }, ref: string): SliceRecipient => ({ ref, msisdn: who.msisdn, body: "50pick: tangazo." });
  const slices = [[row(w.A, "rA")], [row(w.X, "rX"), row(w.Y, "rY"), row(w.Z, "rZ"), row(w.B, "rB"), row(w.F, "rF")]];
  const wire = fakeWire(new Set([w.F.msisdn]));
  const between = async () => {
    // Three people change their minds while the campaign is between slices — each through the real act.
    if (w.token) await stopMarketing(w.token, "SW");
    await selfExclude(w.Y.id, "24h");
    await coolOff(w.Z.id, "1h");
  };
  const outcomes = await driver(slices, between, { send: wire.send });
  const of = (ref: string) => outcomes.find((o) => o.ref === ref);
  const onWire = (msisdn: string) => wire.sent.some((m) => m.to === msisdn);
  const show = (ref: string) => JSON.stringify(of(ref) ?? null);

  ok(p("U9.0 · ⚠️ CONTROL — the opt-out token was minted, so the opt-out between slices is real"), w.token !== null);
  ok(p("U9.1 · ⭐ a number that OPTED OUT between slice one and slice two never reaches the wire — skipped as suppressed"),
    !onWire(w.X.msisdn) && of("rX")?.outcome === "skipped" && (of("rX") as { skipReason?: string }).skipReason === "suppressed", show("rX"));
  ok(p("U9.2 · a player who SELF-EXCLUDED between slices never reaches the wire — skipped rg_self_excluded"),
    !onWire(w.Y.msisdn) && (of("rY") as { skipReason?: string }).skipReason === "rg_self_excluded", show("rY"));
  const rgRows = (await getAuditForTargetsDurable({ targetType: "User", targetIds: [w.Y.id], actions: [MARKETING_RG_SUPPRESSED_ACTION], sinceIso: "1970-01-01T00:00:00.000Z" })).entries;
  ok(p("U9.2b · …and the RG refusal left ONE COMPLIANCE audit line against the ACCOUNT, with no phone number in it (§5.14)"),
    rgRows.length === 1 && !JSON.stringify(rgRows[0]?.payload ?? {}).includes(w.Y.msisdn.slice(3)),
    `${rgRows.length} row(s) ${JSON.stringify(rgRows[0]?.payload ?? null)}`);
  ok(p("U9.3 · a player who took a BREAK between slices never reaches the wire — skipped rg_cooling_off"),
    !onWire(w.Z.msisdn) && (of("rZ") as { skipReason?: string }).skipReason === "rg_cooling_off", show("rZ"));
  ok(p("U9.4 · ⚠️ CONTROL — the loop DOES send: slice one's and slice two's eligible players were handed over (an always-closed gate fails here)"),
    of("rA")?.outcome === "handed_over" && of("rB")?.outcome === "handed_over", `${show("rA")} ${show("rB")}`);
  const refusals = outcomes.filter((o) => ["rX", "rY", "rZ"].includes(o.ref));
  ok(p("U9.5 · ⛔ every refusal is `skipped`, never `failed` — the only failure is the one the WIRE refused"),
    refusals.every((o) => o.outcome === "skipped") && outcomes.filter((o) => o.outcome === "failed").map((o) => o.ref).join() === "rF",
    outcomes.map((o) => `${o.ref}:${o.outcome}`).join(" "));
  ok(p("U9.6 · ⛔ settled by KEY, never by position — with the wire answering in reverse, each row got its OWN reference"),
    (of("rB") as { reference?: string }).reference === "ref_rB" && (of("rA") as { reference?: string }).reference === "ref_rA", `${show("rA")} ${show("rB")}`);
  ok(p("U9.7 · a message the wire refused is `failed` with the wire's code — not skipped, not handed over"),
    of("rF")?.outcome === "failed" && (of("rF") as { code?: string }).code === "BAD_MSISDN", show("rF"));
  ok(p("U9.8 · ONE send per slice — two slices, two calls to the wire"), wire.calls === 2, `${wire.calls} call(s)`);

  // ── the three ways a slice ends without a verdict about the PERSON ────────────────────────
  const G = row(w.G, "rG");
  const shut = fakeWire(new Set(), "BALANCE_FLOOR");
  const [held] = await driver([[G]], async () => {}, { send: shut.send });
  ok(p("U9.9 · a SHOP-WIDE refusal (balance floor) holds the row — not failed, not skipped: nothing about this person was decided"),
    held?.outcome === "held" && (held as { reason?: string }).reason === "BALANCE_FLOOR", JSON.stringify(held ?? null));
  const blind = fakeWire(new Set());
  const [unanswered] = await driver([[G]], async () => {}, { send: blind.send, gate: async () => { throw new Error("db down"); } });
  ok(p("U9.10 · ⛔ a gate that cannot ANSWER holds the row and sends NOTHING — never a send on an unanswered question"),
    unanswered?.outcome === "held" && blind.sent.length === 0, `${JSON.stringify(unanswered ?? null)} · sent ${blind.sent.length}`);
  const [lost] = await driver([[G]], async () => {}, { send: async () => { throw new Error("socket hang up"); } });
  ok(p("U9.11 · a send that THROWS leaves the row `unconfirmed` — the gateway may have taken it, so it is never retried by itself (OD23)"),
    lost?.outcome === "unconfirmed", JSON.stringify(lost ?? null));
}

/** The dispatch step written out so one step at a time can be made wrong. Never ships; with no flag set it
 *  is asserted to agree with `dispatchSlice` on the whole contract before any plant is trusted. */
type LoopDefect = { hoisted?: boolean; settleByIndex?: boolean; skipAsFailed?: boolean; gateErrorSends?: boolean; noRgAudit?: boolean };
function dispatchModel(d: LoopDefect): Dispatch {
  return async (rows, deps) => {
    const ask = deps.gate ?? mayReceiveMarketingSms;
    const out = new Map<string, SliceOutcome>();
    const cleared: SliceRecipient[] = [];
    for (const r of rows) {
      let v: MarketingGateVerdict;
      try { v = await ask(r.msisdn); } catch {
        if (d.gateErrorSends) { cleared.push(r); continue; }
        out.set(r.ref, { ref: r.ref, outcome: "held", reason: "gate_unanswered" }); continue;
      }
      if (!v.ok) {
        out.set(r.ref, d.skipAsFailed
          ? { ref: r.ref, outcome: "failed", code: v.skipReason, error: v.detail }
          : { ref: r.ref, outcome: "skipped", skipReason: v.skipReason, detail: v.detail });
        if (!d.noRgAudit && v.skipReason.startsWith("rg_") && v.userId) {
          const { audit } = await import("../src/lib/server/audit.ts");
          await audit({ category: "COMPLIANCE", action: MARKETING_RG_SUPPRESSED_ACTION, actorId: null, targetType: "User", targetId: v.userId, payload: { reason: v.skipReason, detail: v.detail } });
        }
        continue;
      }
      cleared.push(r);
    }
    if (cleared.length) {
      let b: SmsBatchOutcome | null = null;
      try { b = await deps.send(cleared.map((r) => ({ to: r.msisdn, body: r.body, targetType: "SmsCampaignRecipient", targetId: r.ref }))); } catch { b = null; }
      if (b === null) for (const r of cleared) out.set(r.ref, { ref: r.ref, outcome: "unconfirmed" });
      else if (b.refused) for (const r of cleared) out.set(r.ref, { ref: r.ref, outcome: "held", reason: b.refused });
      else for (const [i, r] of cleared.entries()) {
        const res = d.settleByIndex ? b.results[i] : b.results.find((x) => x.targetId === r.ref);
        if (!res) out.set(r.ref, { ref: r.ref, outcome: "unconfirmed" });
        else if (res.ok) out.set(r.ref, { ref: r.ref, outcome: "handed_over", reference: res.reference });
        else out.set(r.ref, { ref: r.ref, outcome: "failed", code: res.code ?? "UNKNOWN", error: res.error ?? null });
      }
    }
    return rows.map((r) => out.get(r.ref) as SliceOutcome);
  };
}

/** ⛔ THE DEFECT U9 EXISTS FOR: the gate asked ONCE, when the list is built, and the slices sent on that. */
const hoistedDriver = (dispatch: Dispatch): Driver => async (slices, between, deps) => {
  const ask = deps.gate ?? mayReceiveMarketingSms;
  const approved: SliceRecipient[][] = [];
  for (const slice of slices) {
    const keep: SliceRecipient[] = [];
    for (const r of slice) { const v = await ask(r.msisdn).catch(() => null); if (v?.ok) keep.push(r); }
    approved.push(keep);
  }
  const out: SliceOutcome[] = [];
  for (const [i, slice] of approved.entries()) {
    if (i > 0) await between();
    out.push(...await dispatch(slice, { ...deps, gate: async () => ({ ok: true }) }));
  }
  return out;
};

/** Structural: the shipped step asks the gate INSIDE the per-row loop and BEFORE the one send, and the
 *  send has no default — nothing in production can reach the wire through it until U35/U43. */
function assertDispatchShape(tag: string): void {
  const src = decomment(readFileSync(new URL("../src/lib/server/marketing/dispatch.ts", import.meta.url), "utf8"));
  const iLoop = src.indexOf("for (const row of rows)");
  const iAsk = src.indexOf("await ask(row.msisdn)");
  const iSend = src.indexOf("deps.send(");
  ok(`${tag}U9.12 · ⚠️ CONTROL — dispatch.ts was found and its three landmarks located`, src.length > 1_000 && iLoop > 0 && iAsk > 0 && iSend > 0, `loop@${iLoop} ask@${iAsk} send@${iSend}`);
  ok(`${tag}U9.12a · ⭐ the gate is asked INSIDE the per-recipient loop and BEFORE the send — the order §5.6 requires`, iLoop < iAsk && iAsk < iSend);
  ok(`${tag}U9.12b · ⛔ \`send\` has no default and \`sendBatch\` is not imported — no production path to the wire until U35 gives it a purpose`,
    !/\bsendBatch\b/.test(src) && !/deps\.send\s*\?\?/.test(src));
}

/* ══ RUN ════════════════════════════════════════════════════════════════════════════════════ */
if (!PROVE_RED) {
  const f = await seed(0);
  await runAssertions(mayReceiveMarketingSms, f, "");
  console.log("\n── U9 · the loop contract (dispatchSlice, two slices, three minds changed between them)\n");
  await runLoopContract(loopOver(dispatchSlice), 300, "");
  assertDispatchShape("");
  console.log(`\nmarketing-consent: ${pass} passed, ${fail} failed`);
  process.exitCode = fail === 0 ? 0 : 1;
} else {
  const problems: string[] = [];

  // §0 — the shipped gate passes first, or "every proof held" means nothing.
  const f0 = await seed(90);
  await runAssertions(mayReceiveMarketingSms, f0, "base:");
  if (fail !== 0) problems.push(`BASELINE: the shipped gate is already red (${failed.join(" | ")})`);
  console.log(`\n§0 baseline · shipped gate: ${pass} passed, ${fail} failed\n`);

  // §0b — the MODEL is faithful, so a flag is the only thing a red case can be blamed on.
  pass = 0; fail = 0; failed.length = 0;
  const fm = await seed(91);
  await runAssertions(gateWithDefect({}), fm, "model:");
  if (fail !== 0) problems.push(`MODEL: the defect-free model disagrees with the shipped gate (${failed.join(" | ")})`);
  console.log(`\n§0b model · no defect set: ${pass} passed, ${fail} failed\n`);

  const CASES: Array<{ name: string; defect: Defect; expect: string }> = [
    {
      name: "consent is asked BEFORE suppression (OD11 reversed) — last year's consent row out-argues \"stop\"",
      defect: { swapOrder: true },
      expect: "2 · ⛔ a SUPPRESSED number is refused even though its consent is valid — suppression is asked FIRST (OD11)",
    },
    {
      name: "the `+` bridge is dropped — every player is looked up with the marketing key and found to be a stranger",
      defect: { noBridge: true },
      expect: "1 · a consenting player is ALLOWED",
    },
    {
      name: "RG read the way isLockedOut reads it — only a RUNNING period refuses (D9 — the lift, reintroduced)",
      defect: { lockoutSemantics: true },
      expect: "7 · ⭐ a 24-hour self-exclusion that ELAPSED A YEAR AGO is still refused (D9 — the period ending is not the person asking)",
    },
    {
      name: "the RG predicate is asked unguarded, so ASKING WRITES a row per recipient (150k rows per campaign)",
      defect: { writesRgRow: true },
      expect: "14 · 🔴 the gate created NO ResponsibleGambling row — deciding must not write (150k recipients = 150k rows)",
    },
    {
      name: "an imported ledger row speaks over a player's own no (OD10 broken)",
      defect: { ledgerOverridesPlayer: true },
      expect: "10 · ⛔ an imported GIVEN row can NEVER speak over a player's own no (OD10)",
    },
    {
      name: "U7's own fix — a MISSING row is guarded, but an EXISTING row still goes through the writer (`effectivize`)",
      defect: { readsThroughWriter: true },
      expect: "18 · 🔴 a row whose pending limit rise has COME DUE is not rewritten by the gate — the write U7's fix missed",
    },
    {
      name: "U7's order — RG asked BEFORE consent (§5.6 reversed; the 10,000-row harm scan runs on every non-consenting player)",
      defect: { rgBeforeConsent: true },
      expect: "19 · §5.6 ORDER — a self-excluded player whose toggle is off is refused on CONSENT, which is asked first (the costly RG step never runs)",
    },
    {
      name: "pre-U10 — COOLED_OFF refused for ever as `account_status`, so a player who asks again after a break is never heard",
      defect: { breakNeverAdmitted: true },
      expect: "17 · ⭐ a break that ended, then a consent AFTER it: ALLOWED — the COOLED_OFF status nothing ever clears is admitted only then",
    },
    {
      name: "U11's RED — a missing date of birth is treated as ADULT",
      defect: { nullDobIsAdult: true },
      expect: "21 · ⭐ a consenting player with NO date of birth is refused as age_unknown — never treated as adult",
    },
    {
      name: "pre-U11 — a consenting contact is marketed with no 18+ attestation on record",
      defect: { contactAgeAssumed: true },
      expect: "5 · a contact who consented is refused ONLY on age — no 18+ attestation exists until U33 (OD14), and none is inferred",
    },
    {
      name: "pre-U12 — the published under-25 promise has no code behind it",
      defect: { under25Ignored: true },
      expect: "23 · ⭐ aged 20 with a break on record is refused even after re-consenting — U10's lift does not reach the under-25 promise",
    },
  ];

  for (const [i, c] of CASES.entries()) {
    pass = 0; fail = 0; failed.length = 0;
    const tag = `red${i + 1}:`;
    console.log(`── case ${i + 1}: ${c.name}`);
    const fx = await seed(i + 1);
    await runAssertions(gateWithDefect(c.defect), fx, tag);
    const wanted = `${tag}${c.expect}`;
    if (fail === 0) problems.push(`case ${i + 1} (${c.name}): stayed GREEN`);
    else if (!failed.includes(wanted)) problems.push(`case ${i + 1} (${c.name}): red, but not on "${c.expect}" — got ${failed.join(" | ")}`);
    else console.log(`   caught → ${c.expect}\n`);
  }

  // ── U9 · the loop contract: the shipped step green, the model faithful, then one plant at a time ──
  pass = 0; fail = 0; failed.length = 0;
  await runLoopContract(loopOver(dispatchSlice), 390, "loopbase:");
  assertDispatchShape("loopbase:");
  if (fail !== 0) problems.push(`LOOP BASELINE: the shipped dispatch step is already red (${failed.join(" | ")})`);
  console.log(`\n§0 loop baseline · dispatchSlice: ${pass} passed, ${fail} failed`);
  pass = 0; fail = 0; failed.length = 0;
  await runLoopContract(loopOver(dispatchModel({})), 391, "loopmodel:");
  if (fail !== 0) problems.push(`LOOP MODEL: the defect-free model disagrees with dispatchSlice (${failed.join(" | ")})`);
  console.log(`§0b loop model · no defect set: ${pass} passed, ${fail} failed\n`);

  const LOOP_CASES: Array<{ name: string; driver: Driver; expect: string }> = [
    {
      name: "⭐ the gate HOISTED to list-build time — asked once when the list is made, then the slices sent on that answer",
      driver: hoistedDriver(dispatchModel({})),
      expect: "U9.1 · ⭐ a number that OPTED OUT between slice one and slice two never reaches the wire — skipped as suppressed",
    },
    {
      name: "results settled by POSITION rather than by key",
      driver: loopOver(dispatchModel({ settleByIndex: true })),
      expect: "U9.6 · ⛔ settled by KEY, never by position — with the wire answering in reverse, each row got its OWN reference",
    },
    {
      name: "a gate refusal recorded as a FAILURE",
      driver: loopOver(dispatchModel({ skipAsFailed: true })),
      expect: "U9.5 · ⛔ every refusal is `skipped`, never `failed` — the only failure is the one the WIRE refused",
    },
    {
      name: "a gate that cannot answer is treated as a yes",
      driver: loopOver(dispatchModel({ gateErrorSends: true })),
      expect: "U9.10 · ⛔ a gate that cannot ANSWER holds the row and sends NOTHING — never a send on an unanswered question",
    },
    {
      name: "an RG refusal acted on with no audit line",
      driver: loopOver(dispatchModel({ noRgAudit: true })),
      expect: "U9.2b · …and the RG refusal left ONE COMPLIANCE audit line against the ACCOUNT, with no phone number in it (§5.14)",
    },
  ];
  for (const [i, c] of LOOP_CASES.entries()) {
    pass = 0; fail = 0; failed.length = 0;
    const tag = `loopred${i + 1}:`;
    console.log(`── loop case ${i + 1}: ${c.name}`);
    await runLoopContract(c.driver, 400 + i, tag);
    const wanted = `${tag}${c.expect}`;
    if (fail === 0) problems.push(`loop case ${i + 1} (${c.name}): stayed GREEN`);
    else if (!failed.includes(wanted)) problems.push(`loop case ${i + 1} (${c.name}): red, but not on "${c.expect}" — got ${failed.join(" | ")}`);
    else console.log(`   caught → ${c.expect}\n`);
  }

  const caughtGate = CASES.length - problems.filter((x) => x.startsWith("case")).length;
  const caughtLoop = LOOP_CASES.length - problems.filter((x) => x.startsWith("loop case")).length;
  const caught = caughtGate + caughtLoop;
  console.log(`\ngate ${caughtGate}/${CASES.length} · loop ${caughtLoop}/${LOOP_CASES.length}`);
  console.log(`${caught}/${CASES.length + LOOP_CASES.length} caught`);
  if (problems.length) {
    console.log("\nPROBLEMS:");
    for (const x of problems) console.log(`  ✗ ${x}`);
    process.exitCode = 1;
  } else {
    console.log("RED PROOF COMPLETE");
    process.exitCode = 0;
  }
}
