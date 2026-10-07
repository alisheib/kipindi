/**
 * U33r · THE AGENT-REFEREE EXCLUSION, WRITTEN — a section of `test:marketing-consent`, beside `licence-basis.mts` (which
 * holds the gate's step 1b row by row). This section holds the WRITERS to the promise /legal/privacy §9 made every agent
 * applicant's referee, "we never contact you for marketing" (Q8; the owner's FINAL rule of 2026-10-07): every place a
 * referee's number exists must key it before it can stop existing, and the gate must then refuse it.
 *
 *   R1  the free-text reader: every spelling an applicant types is read as the gate's key, two numbers in one field are
 *       both read, and an e-mail, a landline and a typo give nothing;
 *   R2  the key is the keyed hash — thirty-two letters a–p, one per number whatever its spelling, never a digit — and is
 *       refused for anything but a gate key;
 *   R3  `setReferees` (the REAL service) keys both referees BEFORE it saves: a key write that fails saves nothing, one that
 *       works makes the gate refuse both numbers, an e-mail keys nothing, and no stored row holds a digit;
 *   R4  a referee REPLACED by a later save keeps their key — the gate still refuses them (append-only);
 *   R5  the applicant's ERASURE keys referees never keyed (an application older than the exclusion) BEFORE it empties the
 *       contacts — the contacts end empty, the numbers refused, and nothing of the applicant in the table;
 *   R6  the BACKFILL keys every older application's referees: the census says how many are missing before, 0 after, the
 *       gate refuses them, and a re-run writes nothing;
 *   R7  a referee in a real send slice is SKIPPED `agent_referee` before the wire, and no RG COMPLIANCE line is written for
 *       it (the reason never starts `rg_`).
 *
 * ⛔ IN-PROCESS BY CONSTRUCTION: every red case below plants ONE defect in the impl handed in (a swapped function, a store
 * member stubbed and restored in `finally`) and requires the matching row to turn red. Nothing here writes a file.
 * ⛔ Every number is this section's own (its own block), so a red run never reads a green run's rows.
 */
import { db } from "../../src/lib/server/store.ts";
import type { StoredAgentApplication, StoredUser } from "../../src/lib/server/store.ts";
import { toMsisdn255 } from "../../src/lib/phone-normalize.ts";
import { parseTzNumber, readAsciiDigits } from "../../src/lib/tz-msisdn.ts";
import { mayReceiveMarketingSms } from "../../src/lib/server/marketing/consent.ts";
import {
  refereeNumbersIn, refereeKeyOf, recordRefereeKeys, backfillRefereeKeys, refereeKeyCensus,
} from "../../src/lib/server/marketing/referee-exclusion.ts";
import { setReferees, pseudonymiseAgentApplications } from "../../src/lib/server/agent-application-service.ts";
import { dispatchSlice, MARKETING_RG_SUPPRESSED_ACTION } from "../../src/lib/server/marketing/dispatch.ts";
import type { SliceDeps, SliceRecipient, SliceOutcome } from "../../src/lib/server/marketing/dispatch.ts";
import { getAuditForTargetsDurable, audit } from "../../src/lib/server/audit.ts";
import { ALWAYS_OPEN } from "../lib/send-window.mts";

export type Ok = (label: string, cond: boolean, detail?: string) => void;

/** The pieces under test. The real ones by default; a red case hands in one that is wrong in one way. */
export type RefereeImpl = {
  readonly numbersIn: typeof refereeNumbersIn;
  readonly setReferees: typeof setReferees;
  readonly pseudonymise: typeof pseudonymiseAgentApplications;
  readonly backfill: typeof backfillRefereeKeys;
  readonly dispatch: (rows: SliceRecipient[], deps: SliceDeps) => Promise<SliceOutcome[]>;
};
export const REAL_REFEREE: RefereeImpl = {
  numbersIn: refereeNumbersIn,
  setReferees,
  pseudonymise: pseudonymiseAgentApplications,
  backfill: backfillRefereeKeys,
  dispatch: (rows, deps) => dispatchSlice(rows, deps),
};

export const REFEREE_LABELS = {
  r1: "R1 · U33r · the free-text reader reads every spelling an applicant types as the gate's key — '0712 345 678', '+255 712 345 678', '+255 (0) 712-345-678', '00255712345678', '712345678' and Arabic-Indic digits — reads BOTH numbers of a field holding two, and reads nothing from an e-mail, a landline or a typo",
  r2: "R2 · U33r · the key is the keyed hash — thirty-two letters a–p, the SAME for every spelling of one number, different for another number, never a digit — and anything but a gate key (a '+255…' or a '0712…' spelling) is refused, never hashed",
  r3: "R3 · ⛔ U33r · setReferees KEYS BOTH REFEREES BEFORE IT SAVES — a key write that fails saves nothing; one that works makes the gate refuse both numbers agent_referee; an e-mail contact keys nothing; and no stored row holds a digit",
  r4: "R4 · ⛔ U33r · a referee REPLACED by a later save keeps their key — the gate still refuses the first referee's number after the applicant names another (append-only)",
  r5: "R5 · ⛔ U33r · the applicant's ERASURE keys referees never keyed before (an application older than the exclusion) BEFORE it empties the contacts — the contacts end empty, both numbers are refused agent_referee, and the table holds nothing of the applicant",
  r6: "R6 · ⭐ U33r · the BACKFILL keys every older application's referees — the census counts them missing before and 0 after, the gate refuses each, and a re-run writes nothing",
  r7: "R7 · ⛔ U33r · a referee in a real send slice is SKIPPED agent_referee before the wire (the wire never called), and no RG COMPLIANCE line is written for it — the reason never starts rg_",
} as const;

/* ══ THE WORLD — this section's own numbers, one block per run ═════════════════════════════════════════════════════ */

let seq = 0;
/** NDC 74 (Vodacom), a block per run, a slot per number: 0 7 4 then seven digits. */
const phoneOf = (run: number, i: number): string => `074${String(1000000 + run * 1000 + i).slice(-7)}`;
const keyOf = (run: number, i: number): string => toMsisdn255(phoneOf(run, i));

function makeUser(id: string, phoneE164: string): StoredUser {
  const now = new Date().toISOString();
  return {
    id, phoneE164,
    passwordHash: null, passwordSalt: null, failedLoginCount: 0, lockedUntil: null,
    role: "PLAYER", status: "ACTIVE", locale: "SW", displayName: null,
    dob: "1990-01-01", region: null, acceptedTermsVersion: "v1", acceptedTermsAt: now,
    marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null,
    createdAt: now, updatedAt: now, lastLoginAt: now, closedAt: null,
  } as StoredUser;
}

/** An application in the shape the service writes — DRAFT unless told otherwise, referees as given. */
function application(id: string, userId: string, over: Partial<StoredAgentApplication> = {}): StoredAgentApplication {
  const now = new Date().toISOString();
  return {
    id, userId, status: "DRAFT", source: "SELF_SERVICE",
    refereeOneName: null, refereeOneContact: null, refereeTwoName: null, refereeTwoContact: null, refereeConsentAt: null,
    feeAmountTzs: null, feeAttestedTzs: null, feeFundingSource: null, feeReference: null, feeStatementRef: null,
    feeReconciledAt: null, feeReconciledById: null, feeSourceAccount: null,
    feeWaivedAt: null, feeWaivedById: null, feeWaiverReason: null,
    feeDisposition: "NONE", feeRefundDueAt: null, feeRefundedAt: null, feeRefundedById: null, feeRefundReference: null, feeRefundAmountTzs: null,
    reviewerId: null, reviewedAt: null, rejectReason: null, rejectNote: null, infoRequestNote: null, infoRequestedAt: null,
    approvedRatePct: null, agentCode: null, acceptedTermsVersion: null, acceptedTermsAt: null,
    submittedAt: null, expiresAt: null, createdAt: now, updatedAt: now,
    ...over,
  } as StoredAgentApplication;
}

/** An applicant (an account of their own, outside the referee numbers) with one application. */
async function applicant(run: number, slot: number, over: Partial<StoredAgentApplication> = {}): Promise<{ userId: string; appId: string }> {
  const userId = `rfu${run}-${seq++}`;
  const appId = `rfa${run}-${seq++}`;
  await Promise.resolve(db.user.create(makeUser(userId, `+${keyOf(run, 900 + slot)}`)));
  await Promise.resolve(db.agentApplication.create(application(appId, userId, over)));
  return { userId, appId };
}

const said = async (msisdn: string): Promise<string> => {
  const v = await mayReceiveMarketingSms(msisdn);
  return v.ok ? "ALLOWED" : v.skipReason;
};
const storeRows = (): Array<[string, unknown]> =>
  [...((globalThis as unknown as { __50PICK_STORE?: { agentRefereeKeys?: Map<string, unknown> } }).__50PICK_STORE?.agentRefereeKeys?.entries() ?? [])];
const DIGIT = /[0-9]/;
const LETTERS_KEY = /^[a-p]{32}$/;
/** Arabic-Indic digits for an ASCII run — what a phone set to Arabic types. */
const arabicIndic = (ascii: string): string => [...ascii].map((c) => (c >= "0" && c <= "9" ? String.fromCharCode(0x0660 + Number(c)) : c)).join("");
async function safe<T>(fn: () => Promise<T>): Promise<T | null> {
  try { return await fn(); } catch { return null; }
}

/* ══ THE ASSERTIONS ═════════════════════════════════════════════════════════════════════════════════════════════════ */

export async function assertRefereeExclusion(impl: RefereeImpl, run: number, tag: string, ok: Ok): Promise<void> {
  const p = (label: string) => `${tag}${label}`;
  const L = REFEREE_LABELS;

  // ── R1 · the reader ──
  {
    const k = keyOf(run, 1);
    const nat = k.slice(3);
    const one = [
      `0${nat.slice(0, 3)} ${nat.slice(3, 6)} ${nat.slice(6)}`,
      `+255 ${nat.slice(0, 3)} ${nat.slice(3, 6)} ${nat.slice(6)}`,
      `+255 (0) ${nat.slice(0, 3)}-${nat.slice(3, 6)}-${nat.slice(6)}`,
      `00255${nat}`,
      nat,
      arabicIndic(`0${nat}`),
    ].map((c) => impl.numbersIn(c));
    const k2 = keyOf(run, 2);
    const two = impl.numbersIn(`0${nat} / +${k2}`);
    const none = [
      impl.numbersIn("referee@example.com"),
      impl.numbersIn("022 211 2345"),
      impl.numbersIn(`0${nat}9`),
      impl.numbersIn(""),
      impl.numbersIn(null),
    ];
    ok(p(L.r1),
      one.every((x) => x.length === 1 && x[0] === k) && two.length === 2 && two.includes(k) && two.includes(k2) && none.every((x) => x.length === 0),
      `one ${JSON.stringify(one)} · two ${JSON.stringify(two)} · none ${JSON.stringify(none)}`);
  }

  // ── R2 · the key ──
  {
    const k = keyOf(run, 3);
    const a = refereeKeyOf(k);
    const b = refereeKeyOf(keyOf(run, 4));
    const spellings = impl.numbersIn(`+255 ${k.slice(3)}`).concat(impl.numbersIn(`0${k.slice(3)}`)).map(refereeKeyOf);
    const refused = [`+${k}`, `0${k.slice(3)}`, "255221234567", ""].map((x) => {
      try { refereeKeyOf(x); return false; } catch { return true; }
    });
    ok(p(L.r2),
      LETTERS_KEY.test(a) && LETTERS_KEY.test(b) && a !== b && !DIGIT.test(a) && spellings.length === 2 && spellings.every((x) => x === a)
        && refused.every(Boolean),
      `key ${a.slice(0, 6)}… · differs ${a !== b} · spellings ${spellings.length} · refused ${refused.join(",")}`);
  }

  // ── R3 · setReferees keys first ──
  {
    const { userId, appId } = await applicant(run, 1);
    const k1 = keyOf(run, 10);
    const k2 = keyOf(run, 11);
    const input = { oneName: "Amina Referee", oneContact: `0${k1.slice(3)}`, twoName: "Baraka Referee", twoContact: `+${k2}`, consent: true };
    // 1 · the key write FAILS: nothing may be saved.
    const keys = db.agentRefereeKey as unknown as { record: (...a: unknown[]) => unknown };
    const realRecord = keys.record;
    keys.record = () => { throw new Error("fixture: the referee keys could not be written"); };
    let failed: unknown;
    try { failed = await safe(() => impl.setReferees(userId, input)); } finally { keys.record = realRecord; }
    const afterFail = await Promise.resolve(db.agentApplication.findById(appId));
    const savedNothing = afterFail !== null && afterFail.refereeOneContact === null && afterFail.refereeTwoContact === null;
    // 2 · the key write works: both numbers refused, and an e-mail referee on a second application keys nothing.
    const done = await impl.setReferees(userId, input);
    const gate = [await said(k1), await said(k2)];
    const mail = await applicant(run, 2);
    const before = storeRows().length;
    await impl.setReferees(mail.userId, { oneName: "Chausiku Referee", oneContact: "chausiku@example.com", twoName: "Daudi Referee", twoContact: "daudi@example.com", consent: true });
    const mailKeyed = storeRows().length - before;
    const clean = storeRows().every(([pk, row]) => !DIGIT.test(pk.split("|")[0]) && LETTERS_KEY.test((row as { refereeKey: string }).refereeKey));
    ok(p(L.r3),
      (failed === null || (failed as { ok?: boolean }).ok !== true) && savedNothing && done.ok && gate.every((g) => g === "agent_referee") && mailKeyed === 0 && clean,
      `failed write saved nothing ${savedNothing} · then ${JSON.stringify(done)} · gate ${gate.join("/")} · e-mail keyed ${mailKeyed} · letters only ${clean}`);
  }

  // ── R4 · a replaced referee keeps their key ──
  {
    const { userId } = await applicant(run, 3);
    const first = keyOf(run, 20);
    const second = keyOf(run, 21);
    const other = keyOf(run, 22);
    await impl.setReferees(userId, { oneName: "Eliya Referee", oneContact: `+${first}`, twoName: "Faraja Referee", twoContact: `+${other}`, consent: true });
    await impl.setReferees(userId, { oneName: "Gift Referee", oneContact: `+${second}`, twoName: "Faraja Referee", twoContact: `+${other}`, consent: true });
    const gate = [await said(first), await said(second), await said(other)];
    ok(p(L.r4), gate.every((g) => g === "agent_referee"), `first ${gate[0]} · second ${gate[1]} · kept ${gate[2]}`);
  }

  // ── R5 · the erasure keys before it empties ──
  {
    const r1 = keyOf(run, 30);
    const r2 = keyOf(run, 31);
    // An application older than the exclusion: its referees were written straight to the row, never keyed.
    const { userId, appId } = await applicant(run, 4, {
      status: "REJECTED", refereeOneName: "Halima Referee", refereeOneContact: `0${r1.slice(3)}`, refereeTwoName: "Idrisa Referee",
      refereeTwoContact: `+255 ${r2.slice(3)}`, refereeConsentAt: "2026-09-08T10:00:00.000Z",
    });
    const before = [await said(r1), await said(r2)];
    await impl.pseudonymise(userId);
    const row = await Promise.resolve(db.agentApplication.findById(appId));
    const emptied = row !== null && row.refereeOneContact === null && row.refereeTwoContact === null && row.refereeOneName === "Erased";
    const after = [await said(r1), await said(r2)];
    const nothingOfTheirs = storeRows().every(([pk, row2]) => !pk.includes(userId) && !pk.includes(appId) && !JSON.stringify(row2).includes(appId));
    ok(p(L.r5),
      before.every((g) => g !== "agent_referee") && emptied && after.every((g) => g === "agent_referee") && nothingOfTheirs,
      `before ${before.join("/")} · emptied ${emptied} · after ${after.join("/")} · nothing of the applicant ${nothingOfTheirs}`);
  }

  // ── R6 · the backfill ──
  {
    const r1 = keyOf(run, 40);
    const r2 = keyOf(run, 41);
    const r3 = keyOf(run, 42);
    await applicant(run, 5, { refereeOneName: "Jabari Referee", refereeOneContact: `+${r1}`, refereeTwoName: "Kesi Referee", refereeTwoContact: `0${r2.slice(3)}`, refereeConsentAt: "2026-09-09T08:00:00.000Z" });
    // ⭐ No consent stamp at all — the oldest shape: it is keyed too, named at the application's creation.
    await applicant(run, 6, { status: "EXPIRED", refereeOneName: "Lulu Referee", refereeOneContact: `+255 ${r3.slice(3)}` });
    const census = await refereeKeyCensus();
    const before = [await said(r1), await said(r2), await said(r3)];
    const filled = await impl.backfill();
    const after = [await said(r1), await said(r2), await said(r3)];
    const again = await impl.backfill();
    ok(p(L.r6),
      census.missing >= 3 && before.every((g) => g !== "agent_referee") && filled.missing === 0 && filled.written >= 3
        && after.every((g) => g === "agent_referee") && again.written === 0 && again.missing === 0,
      `missing before ${census.missing} · gate before ${before.join("/")} · written ${filled.written}, missing after ${filled.missing} · gate after ${after.join("/")} · re-run wrote ${again.written}`);
  }

  // ── R7 · the send loop skips a referee, and writes no RG line for it ──
  {
    const ref = keyOf(run, 50);
    const holder = `rfp${run}-${seq++}`;
    await Promise.resolve(db.user.create({ ...makeUser(holder, `+${ref}`), marketingOptIn: true }));
    await recordRefereeKeys({ contacts: [`+${ref}`], namedAt: "2026-09-08T10:00:00.000Z" });
    let wireCalls = 0;
    const out = await impl.dispatch([{ ref: `rf7-${run}`, msisdn: ref, body: "50pick: tangazo." }], {
      send: async () => { wireCalls++; return { results: [], balanceTzs: null }; },
      window: ALWAYS_OPEN,
    });
    const rgRows = (await getAuditForTargetsDurable({
      targetType: "User", targetIds: [holder], actions: [MARKETING_RG_SUPPRESSED_ACTION], sinceIso: "1970-01-01T00:00:00.000Z",
    })).entries;
    const skipped = out[0]?.outcome === "skipped" && (out[0] as { skipReason?: string }).skipReason === "agent_referee";
    ok(p(L.r7), skipped && wireCalls === 0 && rgRows.length === 0,
      `${JSON.stringify(out[0] ?? null)} · wire calls ${wireCalls} · RG lines ${rgRows.length}`);
  }
}

/* ══ THE RED CASES ══════════════════════════════════════════════════════════════════════════════════════════════════ */

/** Each case: a pieces set wrong in ONE way, and the row it must turn red. */
export function refereeCases(): { name: string; impl: RefereeImpl; expect: string }[] {
  const REAL = REAL_REFEREE;
  return [
    {
      name: "the reader takes the WHOLE field only, as the gate's parser does — a contact holding two numbers keys neither",
      impl: {
        ...REAL,
        numbersIn: (c) => {
          const whole = parseTzNumber(readAsciiDigits(typeof c === "string" ? c : ""));
          return whole.verdict === "ok" && whole.msisdn ? [whole.msisdn] : [];
        },
      },
      expect: REFEREE_LABELS.r1,
    },
    {
      name: "⛔ a key write that fails is SWALLOWED — the referees saved with no exclusion",
      impl: {
        ...REAL,
        setReferees: async (userId, input) => {
          const keys = db.agentRefereeKey as unknown as { record: (...a: unknown[]) => unknown };
          const real = keys.record;
          keys.record = () => 0;
          try { return await setReferees(userId, input); } finally { keys.record = real; }
        },
      },
      expect: REFEREE_LABELS.r3,
    },
    {
      name: "⛔ the erasure EMPTIES the contacts first — the only copy of a never-keyed referee's number is gone before it is keyed",
      impl: {
        ...REAL,
        pseudonymise: async (userId) => {
          for (const a of await Promise.resolve(db.agentApplication.listByUser(userId))) {
            await Promise.resolve(db.agentApplication.update(a.id, { refereeOneContact: null, refereeTwoContact: null }));
          }
          return pseudonymiseAgentApplications(userId);
        },
      },
      expect: REFEREE_LABELS.r5,
    },
    {
      name: "the backfill keys only the FIRST referee of each application",
      impl: {
        ...REAL,
        backfill: async (at?: string) => {
          let written = 0;
          for (const a of await Promise.resolve(db.agentApplication.list())) {
            written += await recordRefereeKeys({ contacts: [a.refereeOneContact], namedAt: a.refereeConsentAt ?? a.createdAt }, at);
          }
          return { ...(await refereeKeyCensus()), written };
        },
      },
      expect: REFEREE_LABELS.r6,
    },
    {
      name: "⛔ an RG line written for a referee — the COMPLIANCE feed would name the account a protected player",
      impl: {
        ...REAL,
        dispatch: (rows, deps) => dispatchSlice(rows, {
          ...deps,
          rgAudit: async (v) => {
            if (!v.ok && v.userId === undefined) {
              const holder = await Promise.resolve(db.user.findByPhone(`+${rows[0]?.msisdn ?? ""}`));
              if (holder) await audit({ category: "COMPLIANCE", action: MARKETING_RG_SUPPRESSED_ACTION, actorId: null, targetType: "User", targetId: holder.id, payload: { reason: v.skipReason } });
            }
          },
        }),
      },
      expect: REFEREE_LABELS.r7,
    },
  ];
}
