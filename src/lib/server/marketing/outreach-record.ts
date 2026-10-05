/**
 * U33a-R · THE LICENCE-OUTREACH RECORD — the SystemConfig row `marketing.outreach.licence`, the reader every licence
 * send asks, and the two writers the "Licence outreach" card on /admin/system calls (spec
 * `docs/marketing-specs/U33a-U37c-OD58.md` §5.3 · §6 U33a-R · §7.7 · §8; OD57 · OD58).
 *
 * ⭐ WHAT IT RECORDS. Not a preference — a decision, with a name and an instant against it: from this moment 50pick may
 * text a player who has not stopped its offers, and a contact on a list recorded under the licence. Until it is open,
 * only consent reaches anybody. That is why opening is refused while any of the four checks fails
 * (`outreachOpenProblems`), and why both acts are audited under COMPLIANCE rather than as a settings change.
 *
 * ⛔ ABSENT MEANS CLOSED, AND SO DOES ANYTHING THAT IS NOT EXACTLY AN OPEN ROW — the live-switch rule
 * (`live-switch.ts`), for the same reason: a record nobody can read is not permission anybody gave. No database, a read
 * that threw, a value that is not an object, a missing or blank `recordedBy`, a `recordedAt` that is not an instant, a
 * misspelt state, one extra key — every one of them reads CLOSED.
 *
 * ⛔ THE ROW IS REPLACED WHOLE, NEVER SPREAD OVER. The factory's default `merge` is a shallow spread, and under it a
 * close (`closedBy`/`closedAt`) would leave its keys sitting in the next OPEN row — which then has five keys, which the
 * reader rightly calls malformed, which reads CLOSED while the card says open. `mergeWhole` replaces, and R4b (open →
 * close → open) is the case that fails the moment somebody restores the spread.
 *
 * ⛔ AND A RECORD THIS PROCESS CANNOT READ IN FULL REFUSES TO OPEN AT ALL. The four checks are read off the saved policy
 * lines; while `policyLinesReadable()` is false every line looks unsaved, so three checks would be named that may all in
 * fact be satisfied — a true refusal told as three false reasons. It refuses as `unreadable` instead, and says so.
 * ⚠️ OWED TO U33a-G: the same `policyLinesReadable()` must refuse every licence SEND, not only an opening (spec §5.3).
 *
 * ⚠️ KNOWN GAP, inherited from every `defineConfig` record (the U33w review's m5): the factory's own
 * `config.outreach_updated` row is fire-and-forget — the WRITE is verified (read back before it is believed), its audit
 * row is not. The two COMPLIANCE rows this file writes are awaited.
 *
 * Guard: `npm run test:licence-outreach` (R1–R5 and five red plants drive THIS file, through `__licenceOutreachForTest`).
 */
import { defineConfig } from "../define-config";
import { audit } from "../audit";
import { policyLinesReadable, savedPolicyLines } from "../legal/policy-lines";
import {
  OUTREACH_CHECK_SENTENCE, OUTREACH_OPEN_CHECKS, outreachOpenProblems,
  type OutreachOpenCheck, type PreLedgerOffs,
} from "@/lib/marketing/outreach-open-checks";

/** The SystemConfig key. */
export const LICENCE_OUTREACH_KEY = "marketing.outreach.licence";

/** The factory's audit row for every write (spec §8). */
export const LICENCE_OUTREACH_AUDIT = { action: "config.outreach_updated", targetType: "MARKETING_OUTREACH" } as const;

/**
 * ⛔ U33a-0 COUNTED THE PRE-LEDGER SWITCH-OFFS ON PRODUCTION AND FOUND NONE (`ops:marketing-preledger-offs`, the plan's
 * STEP 29), so there is nothing to carry into the consent ledger and check 4 passes. A constant, not a config row: it
 * states that an engineering step was completed once, and nobody should be able to assert it from a form.
 */
export const PRE_LEDGER_OFFS: PreLedgerOffs = "reconciled";

/** The record as it is stored. A closed row keeps who closed it; the default has neither. */
export type LicenceOutreachRecord = {
  readonly state: string;
  readonly recordedBy?: string;
  readonly recordedAt?: string;
  readonly closedBy?: string;
  readonly closedAt?: string;
};

/** What the reader answers. `why` is for the console and the tests — a caller only ever asks `state`. */
export type LicenceOutreach =
  | { readonly state: "open"; readonly recordedBy: string; readonly recordedAt: string }
  | { readonly state: "closed"; readonly why: "default" | "closed" | "malformed" };

/** Why an open was refused. Every refusal writes nothing and makes no COMPLIANCE audit row. */
export type OutreachRefusal = "no_officer" | "unreadable" | "checks" | "not_saved";

export type OutreachOpenResult =
  | { readonly ok: true; readonly recordedAt: string; readonly checks: readonly OutreachOpenCheck[] }
  | { readonly ok: false; readonly reason: OutreachRefusal; readonly error: string; readonly failing: readonly OutreachOpenCheck[] };

export type OutreachCloseResult =
  | { readonly ok: true; readonly closedAt: string }
  | { readonly ok: false; readonly reason: Exclude<OutreachRefusal, "checks" | "unreadable">; readonly error: string };

/** The console's sentence for a refusal of the whole act; a failing CHECK says its own (`OUTREACH_CHECK_SENTENCE`). */
export const OUTREACH_REFUSAL_SENTENCE: Readonly<Record<OutreachRefusal, string>> = Object.freeze({
  no_officer: "Sign in again to change licence outreach.",
  unreadable: "The saved policy lines could not be read, so nothing was changed. Ask the developer to check the public policy lines setting.",
  checks: "Licence outreach can't be opened yet — each remaining step is listed below.",
  not_saved: "That didn't save — nothing was changed. Reload the page to check before trying again.",
});

/** An instant as `toISOString()` writes it (milliseconds optional) — the live-switch rule, so one shape means "recorded". */
const RECORDED_INSTANT = /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:[.][0-9]{1,3})?Z$/;

const DEFAULTS: LicenceOutreachRecord = { state: "closed" };

/* ⛔ REPLACE, NEVER SPREAD (R4b). The update IS the next row; a key the previous row held and this one does not is
   GONE, which is the only way an open row can be exactly its three keys after a close. */
const mergeWhole = (_current: LicenceOutreachRecord, updates: LicenceOutreachRecord): LicenceOutreachRecord => ({ ...updates });

type OutreachStore = {
  readonly read: () => LicenceOutreach;
  readonly reload: () => Promise<LicenceOutreach>;
  readonly open: (officerId: string, nowIso?: string) => Promise<OutreachOpenResult>;
  readonly close: (officerId: string, nowIso?: string) => Promise<OutreachCloseResult>;
};

type OutreachDeps = {
  /** The saved policy lines the four checks read — injected so the test drives the real checks over a planted record. */
  readonly readPolicyLines?: typeof savedPolicyLines;
  readonly policyReadable?: typeof policyLinesReadable;
  readonly preLedgerOffs?: PreLedgerOffs;
  /** ⚠️ TEST SEAM ONLY (the `policy-lines.ts` `rules` precedent) — the four checks and the whole-row merge, so
   *  `red:licence-outreach` can plant ONE of them and prove the assertion that names it actually turns red. Application
   *  code never passes either: `live` is built with neither, so what ships is the real pair. */
  readonly openProblems?: typeof outreachOpenProblems;
  readonly merge?: typeof mergeWhole;
};

/**
 * ⭐ Read a stored value as the record, or say it is not one. Kept apart from the store so the reader's whole truth table
 * (R1) is one function over one input.
 */
export function readLicenceOutreachRow(value: unknown): LicenceOutreach {
  if (value === null || value === undefined) return { state: "closed", why: "default" };
  if (typeof value !== "object" || Array.isArray(value)) return { state: "closed", why: "malformed" };
  const row = value as Record<string, unknown>;
  const state = typeof row.state === "string" ? row.state : "";
  // The default and every close read closed — but only when the row is one we recognise. An unknown state is malformed,
  // never "closed enough": the difference is whether anybody could be reading it as open elsewhere.
  if (state === "closed") return { state: "closed", why: Object.keys(row).length === 1 ? "default" : "closed" };
  if (state !== "open") return { state: "closed", why: "malformed" };
  // ⛔ EXACTLY THE THREE KEYS. A row that also carries `closedAt` is somebody's close that did not replace the row, and
  // it reads closed rather than open on the three fields it still holds.
  const keys = Object.keys(row).sort();
  if (keys.length !== 3 || keys[0] !== "recordedAt" || keys[1] !== "recordedBy" || keys[2] !== "state") {
    return { state: "closed", why: "malformed" };
  }
  const recordedBy = typeof row.recordedBy === "string" ? row.recordedBy.trim() : "";
  const recordedAt = typeof row.recordedAt === "string" ? row.recordedAt.trim() : "";
  if (recordedBy === "" || !RECORDED_INSTANT.test(recordedAt) || !Number.isFinite(Date.parse(recordedAt))) {
    return { state: "closed", why: "malformed" };
  }
  return { state: "open", recordedBy, recordedAt };
}

function storeOver(
  cfg: {
    get: () => LicenceOutreachRecord;
    setVerified: (u: LicenceOutreachRecord, officerId: string) => Promise<{ ok: true; config: LicenceOutreachRecord } | { ok: false; error: string }>;
    reload: () => Promise<{ ok: true; config: LicenceOutreachRecord; stored: boolean } | { ok: false; error: string }>;
  },
  deps: OutreachDeps,
): OutreachStore {
  const readPolicyLines = deps.readPolicyLines ?? savedPolicyLines;
  const policyReadable = deps.policyReadable ?? policyLinesReadable;
  const preLedgerOffs = deps.preLedgerOffs ?? PRE_LEDGER_OFFS;
  const openProblems = deps.openProblems ?? outreachOpenProblems;

  const read = (): LicenceOutreach => readLicenceOutreachRow(cfg.get());

  const reload = async (): Promise<LicenceOutreach> => {
    const fresh = await cfg.reload();
    // ⛔ A reload that could not ask is not evidence of a close — but it is not evidence of an OPEN either, and this
    // reader fails closed. U43 calls it once per slice, so the safe answer is the one that sends nothing.
    return fresh.ok ? readLicenceOutreachRow(fresh.config) : { state: "closed", why: "malformed" };
  };

  const open = async (officerId: string, nowIso?: string): Promise<OutreachOpenResult> => {
    if (typeof officerId !== "string" || officerId.trim() === "") {
      return { ok: false, reason: "no_officer", error: OUTREACH_REFUSAL_SENTENCE.no_officer, failing: [] };
    }
    // ⛔ Readability first: see this file's docblock — an unreadable record would name three checks it cannot judge.
    if (!policyReadable()) {
      return { ok: false, reason: "unreadable", error: OUTREACH_REFUSAL_SENTENCE.unreadable, failing: [] };
    }
    const failing = openProblems(readPolicyLines(), preLedgerOffs);
    if (failing.length > 0) {
      return { ok: false, reason: "checks", error: OUTREACH_REFUSAL_SENTENCE.checks, failing };
    }
    const recordedAt = typeof nowIso === "string" ? nowIso : new Date().toISOString();
    const res = await cfg.setVerified({ state: "open", recordedBy: officerId, recordedAt }, officerId);
    if (!res.ok) return { ok: false, reason: "not_saved", error: res.error, failing: [] };
    // ⭐ The four checks AS THEY PASSED — the evidence that the decision was taken on a lawful footing, and the only
    // place it is recorded. No free text, no number: the check ids and the instant (spec §8).
    await audit({
      category: "COMPLIANCE",
      action: "marketing.outreach_opened",
      actorId: officerId,
      targetType: "SystemConfig",
      targetId: LICENCE_OUTREACH_KEY,
      payload: { recordedAt, checks: [...OUTREACH_OPEN_CHECKS] },
    });
    return { ok: true, recordedAt, checks: OUTREACH_OPEN_CHECKS };
  };

  const close = async (officerId: string, nowIso?: string): Promise<OutreachCloseResult> => {
    if (typeof officerId !== "string" || officerId.trim() === "") {
      return { ok: false, reason: "no_officer", error: OUTREACH_REFUSAL_SENTENCE.no_officer };
    }
    // ⭐ A CLOSE IS NEVER REFUSED FOR A FAILING CHECK. Outreach must stop the moment anybody wants it stopped; the
    // checks exist to guard the start of it. (Decided here, on Ali's standing delegation of technical calls: closing is
    // any admin's, not owner-only — a stop that waits for one person is not a stop. §0's open call for the lead.)
    const closedAt = typeof nowIso === "string" ? nowIso : new Date().toISOString();
    const res = await cfg.setVerified({ state: "closed", closedBy: officerId, closedAt }, officerId);
    if (!res.ok) return { ok: false, reason: "not_saved", error: res.error };
    await audit({
      category: "COMPLIANCE",
      action: "marketing.outreach_closed",
      actorId: officerId,
      targetType: "SystemConfig",
      targetId: LICENCE_OUTREACH_KEY,
      payload: { recordedAt: closedAt },
    });
    return { ok: true, closedAt };
  };

  return { read, reload, open, close };
}

function makeStore(key: string, deps: OutreachDeps, factoryDeps?: Parameters<typeof defineConfig>[0]["deps"]): OutreachStore {
  const cfg = defineConfig<LicenceOutreachRecord, LicenceOutreachRecord>({
    key,
    defaults: DEFAULTS,
    merge: deps.merge ?? mergeWhole,
    audit: LICENCE_OUTREACH_AUDIT,
    deps: factoryDeps,
  });
  return storeOver(cfg, deps);
}

const live = makeStore(LICENCE_OUTREACH_KEY, {});

/** ⭐ IS LICENCE OUTREACH OPEN — this process's cache, sync, the answer every licence send is built on. Fails CLOSED. */
export function licenceOutreach(): LicenceOutreach {
  return live.read();
}

/** ⭐ Re-read the row and replace the cache, then answer. ⚠️ U43 calls this ONCE PER SLICE, so a close taken on another
 *  instance (or during a deploy's overlap) stops the next slice rather than the next boot. */
export function reloadLicenceOutreach(): Promise<LicenceOutreach> {
  return live.reload();
}

/** ⛔ ONE OF THE TWO WRITERS, and the only door the card's action may open it through. */
export function openLicenceOutreach(officerId: string, nowIso?: string): Promise<OutreachOpenResult> {
  return live.open(officerId, nowIso);
}

/** ⛔ THE OTHER WRITER. Never refused for a failing check — see `close` above. */
export function closeLicenceOutreach(officerId: string, nowIso?: string): Promise<OutreachCloseResult> {
  return live.close(officerId, nowIso);
}

/** The four checks as the card must show them now: each failing one, with its sentence. `[]` means it may be opened. */
export function licenceOutreachBlockers(): { check: OutreachOpenCheck; sentence: string }[] {
  if (!policyLinesReadable()) {
    return OUTREACH_OPEN_CHECKS.map((check) => ({ check, sentence: OUTREACH_CHECK_SENTENCE[check] }));
  }
  return outreachOpenProblems(savedPolicyLines(), PRE_LEDGER_OFFS).map((check) => ({ check, sentence: OUTREACH_CHECK_SENTENCE[check] }));
}

/**
 * ⚠️ TEST SEAM ONLY — never call this from application code.
 *
 * A SECOND instance built by the same `makeStore`, so `test:licence-outreach` drives the code that ships (the reader,
 * both writers, the factory's read-back and its hydration gate) with the policy record and the pre-ledger constant
 * planted, rather than a re-implementation of them.
 */
export function __licenceOutreachForTest(opts: OutreachDeps & { factoryDeps?: Parameters<typeof defineConfig>[0]["deps"] } = {}): OutreachStore {
  const { factoryDeps, ...deps } = opts;
  return makeStore(`${LICENCE_OUTREACH_KEY}.__test__${Math.random().toString(36).slice(2)}`, deps, factoryDeps);
}
