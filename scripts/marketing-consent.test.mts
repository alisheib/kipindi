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
import { mayReceiveMarketingSms, userPhoneKeyFor } from "../src/lib/server/marketing/consent.ts";
import type { MarketingGateVerdict, MarketingSkipReason } from "../src/lib/server/marketing/consent.ts";
import { db } from "../src/lib/server/store.ts";
import type { StoredUser, StoredResponsibleGambling } from "../src/lib/server/store.ts";
import { toMsisdn255 } from "../src/lib/phone-normalize.ts";
import { selfExclusionStanding } from "../src/lib/server/responsible-gambling.ts";

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

const rgRow = (userId: string, selfExclusionUntil: string | null): StoredResponsibleGambling => ({
  userId,
  dailyDepositLimit: null, weeklyDepositLimit: null, monthlyDepositLimit: null,
  dailyLossLimit: null, sessionTimeLimitMin: null, realityCheckIntervalMin: 60,
  selfExclusionUntil, coolingOffUntil: null,
  selfExclusionStartedAt: selfExclusionUntil, coolingOffStartedAt: null,
  pendingIncreaseTo: null, pendingIncreaseEffectiveAt: null,
  pendingWeeklyIncreaseTo: null, pendingWeeklyIncreaseEffectiveAt: null,
  pendingMonthlyIncreaseTo: null, pendingMonthlyIncreaseEffectiveAt: null,
} as StoredResponsibleGambling);

type Fixtures = Record<string, string>;

/** Seed one self-contained world and hand back the phone number for each case. */
async function seed(run: number): Promise<Fixtures> {
  const p = (i: number) => phoneFor(run, i);
  const mk = async (phone: string, over: Partial<StoredUser>, seUntil?: string | null) => {
    const id = `u${run}-${seq++}`;
    // ⭐ Stored the way registration really stores it: `tzPhone` yields `+255…`, WITH the plus.
    await Promise.resolve(db.user.create(makeUser(id, `+${toMsisdn255(phone)}`, over)));
    if (seUntil !== undefined) await Promise.resolve(db.responsible.upsert(rgRow(id, seUntil)));
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

  return {
    consenting: p(1), suppressed: p(2), stranger: p(3), contactGiven: p(4), contactWithdrawn: p(5),
    serving: p(6), minimumServed: p(7), toggledOff: p(8), closed: p(9), overriddenPlayer: p(10),
    consentingId,
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
  await expect("5 · a contact who consented is ALLOWED", f.contactGiven, "ALLOWED");
  await expect("6 · a contact who withdrew is refused, and the reason says so", f.contactWithdrawn, "consent_withdrawn");

  // ── the player branch ───────────────────────────────────────────────────────────────────
  await expect("7 · ⭐ a 24-hour self-exclusion that ELAPSED A YEAR AGO is still refused (D9 — the period ending is not the person asking)", f.minimumServed, "rg_self_excluded");
  await expect("8 · a player whose own toggle is off is refused", f.toggledOff, "no_consent");
  await expect("9 · a CLOSED account is refused on status, before consent is even reached", f.closed, "account_status");
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
}

/* ══ THE MODEL USED FOR PLANTING ════════════════════════════════════════════════════════════
 * ⚠️ This is the gate's shape written out so ONE step at a time can be made wrong. It is not
 * imported by anything and never ships. With no flags set it is asserted to agree with the
 * shipped gate on every fixture, so a red case's failure is attributable to the flag. */
type Defect = {
  swapOrder?: boolean;              // consent asked before suppression (OD11 broken)
  noBridge?: boolean;               // the `+` never added — every player becomes a stranger
  allowMinimumServed?: boolean;     // an elapsed self-exclusion re-permits marketing (D9)
  writesRgRow?: boolean;            // the predicate is asked unguarded, so asking WRITES
  ledgerOverridesPlayer?: boolean;  // an imported row speaks over a player's own no (OD10)
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
    const askConsent = async (): Promise<MarketingGateVerdict | null> => {
      const user = await Promise.resolve(db.user.findByPhone(d.noBridge ? identifier : `+${identifier}`));
      if (user) {
        const hasRow = (await Promise.resolve(db.responsible.get(user.id))) !== null;
        const rg = (d.writesRgRow || hasRow) ? await selfExclusionStanding(user.id) : ({ state: "none" } as const);
        const refuseRg = d.allowMinimumServed ? rg.state === "serving" : (rg.state === "serving" || rg.state === "minimum_served");
        if (refuseRg) return { ok: false, skipReason: "rg_self_excluded", detail: rg.state };
        if (!["ACTIVE", "PENDING_KYC"].includes(user.status)) return { ok: false, skipReason: "account_status", detail: user.status };
        if (user.marketingOptIn !== true) {
          if (!d.ledgerOverridesPlayer) return { ok: false, skipReason: "no_consent", detail: "toggle off" };
          const l = await Promise.resolve(db.messagingConsent.latestFor(key));
          if (l?.status === "GIVEN") return { ok: true };
          return { ok: false, skipReason: "no_consent", detail: "toggle off" };
        }
        return { ok: true };
      }
      const latest = await Promise.resolve(db.messagingConsent.latestFor(key));
      if (!latest) return { ok: false, skipReason: "no_consent", detail: "no row" };
      if (latest.status === "WITHDRAWN") return { ok: false, skipReason: "consent_withdrawn", detail: "withdrawn" };
      return { ok: true };
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

/* ══ RUN ════════════════════════════════════════════════════════════════════════════════════ */
if (!PROVE_RED) {
  const f = await seed(0);
  await runAssertions(mayReceiveMarketingSms, f, "");
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
      name: "an ELAPSED self-exclusion re-permits marketing (D9 — the isLockedOut lift, reintroduced)",
      defect: { allowMinimumServed: true },
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

  const caught = CASES.length - problems.filter((x) => x.startsWith("case")).length;
  console.log(`\n${caught}/${CASES.length} caught`);
  if (problems.length) {
    console.log("\nPROBLEMS:");
    for (const x of problems) console.log(`  ✗ ${x}`);
    process.exitCode = 1;
  } else {
    console.log("RED PROOF COMPLETE");
    process.exitCode = 0;
  }
}
