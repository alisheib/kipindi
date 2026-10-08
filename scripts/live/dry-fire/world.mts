/**
 * THE DRY-FIRE HARNESS'S MADE-UP PEOPLE — a seeded population written through the store's own doors (the memory twin or a
 * scratch Postgres alike), the campaign that targets it, and the ORACLE: for every person, what the ONE gate must do with them.
 *
 * ⭐ EVERY PERSON IS ONE OF THESE (the mix is the seed's, in the proportions below), and the oracle is the class:
 *   SENDABLE   player_book      a consenting player with a registration row in the contact book (walked by the book row)
 *              player_only      a consenting player the book does not hold (walked in the player arm — SCALE only)
 *              contact_ok       a book contact with a first-party IMPORT attestation of consent and of 18+ (rendered as `book`)
 *   REFUSED    contact_nocons   a book contact nobody ever asked                        → SKIPPED no_consent
 *              contact_noadult  a contact who said yes to SMS but has no 18+ evidence   → SKIPPED age_unknown
 *              contact_withdrawn a contact who consented, then withdrew                  → SKIPPED consent_withdrawn
 *              contact_suppressed an attested contact on the stop list                   → SKIPPED suppressed
 *              player_suppressed a consenting player the stop list holds                 → SKIPPED suppressed
 *              player_toggle_off a player whose marketing switch is off                  → SKIPPED no_consent
 *              player_withdrawn a player whose latest word in the ledger is "withdrawn"  → SKIPPED consent_withdrawn
 *              self_excluded    a player serving a self-exclusion                        → SKIPPED rg_self_excluded
 *              cooling_off      a player on a break                                      → SKIPPED rg_cooling_off
 *              under25_history  a 22-year-old with a break on record                     → SKIPPED rg_under25_history
 *              harm_marker      a player whose deposits trip the harm detector           → SKIPPED rg_harm_marker
 *              minor            an account whose date of birth is under 18               → SKIPPED age_minor
 *              suspended        an account that is not marketable                        → SKIPPED account_status
 *   UNWRITTEN  unusable         a contact whose number the numbering plan refuses (a dead NDC) → counted `unusable`, never a row
 *   AND        duplicates       a second contact row holding an already-listed number in another spelling (the trunk zero after
 *                               the country code, a legacy dirty row) → the second seed is skipped by the unique key
 * The proportions below are the default; each world moves every weight by up to 30 % either way from its seed.
 * This is the gate's own table (`consent.ts`), driven by the real rows; nothing here decides a verdict — it only writes the
 * rows and remembers what the gate is bound to answer.
 *
 * ⛔ No number is a real person's: they are `255` + a live NDC + seven digits made up from the world's index. ⛔ This file holds
 * no backslash (an editing tool decodes them).
 */
import type { StoredMarketingContact, StoredResponsibleGambling, StoredSmsCampaign, StoredSuppression, StoredUser } from "../../../src/lib/server/store.ts";
import type { ContactAudienceFilter } from "../../../src/lib/server/marketing/audience.ts";
import type { Harness } from "./core.mts";
import { DAY, HOUR, MIN, hash32, makeRng, pad } from "./kit.mts";

export type Cls =
  | "player_book" | "player_only" | "contact_ok"
  | "contact_nocons" | "contact_noadult" | "contact_withdrawn" | "contact_suppressed" | "player_suppressed" | "player_toggle_off"
  | "player_withdrawn" | "self_excluded" | "cooling_off" | "under25_history" | "harm_marker" | "minor" | "suspended"
  | "unusable";

export const SENDABLE: readonly Cls[] = ["player_book", "player_only", "contact_ok"];

/** What the gate is bound to do with a person. `unusable` people never become a row. */
export type Expect = { send: true; origin: "account" | "book" } | { send: false; reason: string } | { send: false; unusable: true };

export type Person = {
  idx: number;
  cls: Cls;
  /** The bare gateway key, `255…`. */
  key: string;
  userId: string | null;
  contactId: string | null;
  dupContactId: string | null;
  /** The display name the ACCOUNT holds (a contact's name is never printed — E17). */
  name: string | null;
  locale: "SW" | "EN";
  expect: Expect;
  /** A stop-link token minted before the run (an earlier campaign's message) — what lets the person "tap stop" mid-run. */
  oldToken: string | null;
  /** Set when a stop landed mid-run: the person is refused from that instant. */
  lateStopAt: number | null;
};

export type World = {
  id: string;
  tag: string;
  population: "book" | "both";
  filter: ContactAudienceFilter;
  people: Person[];
  byKey: Map<string, Person>;
  /** People who become a row on the campaign (everyone but the unusable). */
  expectedRows: number;
  /** Duplicate contact rows (their second seed is skipped). */
  duplicates: number;
  unusable: number;
  /** What the ONE walk yields: every contact row (people with one, duplicates, unusable) plus the players the book does not hold. */
  walkRows: number;
  counts: Record<string, number>;
};

/** Default proportions of the people (the duplicates are extra rows, `DUP_FRACTION` of the walk). Sums to 1. */
export const MIX: Readonly<Record<Cls, number>> = {
  player_book: 0.34, player_only: 0.08, contact_ok: 0.17,
  contact_nocons: 0.06, contact_noadult: 0.03, contact_withdrawn: 0.02, contact_suppressed: 0.05, player_suppressed: 0.03,
  player_toggle_off: 0.03, player_withdrawn: 0.01, self_excluded: 0.03, cooling_off: 0.02, under25_history: 0.02, harm_marker: 0.02,
  minor: 0.01, suspended: 0.01, unusable: 0.02,
};
export const DUP_FRACTION = 0.02;
/** Only an active player a book row can speak for, or a contact, can be a duplicate. */
const DUPLICABLE: readonly Cls[] = ["player_book", "contact_ok"];

/** Mobile ranges a gateway can dial (6x and 7x), one per operator — every one parses `ok` (`tz-msisdn.ts`). */
const NDCS = ["65", "67", "68", "71", "74", "75", "76", "78", "62", "69"] as const;
/** A range with no live network (`064`, Telxer) — the numbering plan refuses it. */
const DEAD_NDC = "64";

const NAMES = [
  "Neema Joseph", "Juma", "Asha", "Baraka Mushi", "Zawadi", "Hamisi", "Amina Said", "Rehema", "Salim", "Fatuma", "Daudi Kimaro",
  "Mwajuma", "Omari", "Upendo", "Chausiku", "Gaudence", "Kassim", "Lulu", "Mussa", "Nuru",
] as const;

export const SOURCE_LINE = "Kutoka orodha ya 50pick.";
export const BODY_SW = "50pick: Habari {jina}, ofa ya leo.";
export const BODY_EN = "50pick: Hi {jina}, today's offer.";
export const FALLBACK_SW = "Rafiki";
export const FALLBACK_EN = "Friend";
/** The number the harness sends its one code (OTP) message to — outside every world, so no campaign invariant meets it. */
export const OPS_NUMBER = "255789999901";

const iso = (ms: number): string => new Date(ms).toISOString();

/* ══ THE OFFICER AND THE SAVED WORDINGS ═════════════════════════════════════════════════════════════════════════════ */

/** The officer who acts: an ADMIN account with a name the live page can print ("Stopped by Amina at …"). */
export async function seedOfficer(h: Harness, id: string, name: string): Promise<void> {
  const at = iso(h.clock.now() - 30 * DAY);
  await Promise.resolve(h.S.db.user.create({
    id, phoneE164: "+255689999902", passwordHash: null, passwordSalt: null, failedLoginCount: 0, lockedUntil: null,
    role: "ADMIN", status: "ACTIVE", locale: "SW", displayName: name, dob: "1985-01-01", region: null,
    acceptedTermsVersion: "v1", acceptedTermsAt: at, marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null,
    createdAt: at, updatedAt: at, lastLoginAt: at, closedAt: null,
  } as StoredUser));
}

/** Save the first-party basis words and the 18+ sentence through the SHIPPED setter, so an import attestation is a row the gate
 *  recognises. Idempotent: saved already → nothing changes. */
export async function ensureWordings(h: Harness): Promise<{ ok: boolean; why: string }> {
  const W = h.S.wordings;
  const D = h.S.marketingWordings.WORDING_DEFAULTS as Record<string, string>;
  const patch: Record<string, string> = {};
  for (const key of ["basis.OWN_FORM", "adult.consent"]) {
    if (W.currentWording(key as never) !== null) continue;
    patch[key] = D[key];
    patch[`approve.${key}`] = "1";
    patch[`base.${key}`] = String(W.wordingHistory(key as never).length);
  }
  if (Object.keys(patch).length > 0) {
    const res = await W.saveMarketingWordings(patch, h.officer.id);
    if (!res.ok) return { ok: false, why: `the wordings did not save: ${res.reason}` };
  }
  const saved = W.currentWording("basis.OWN_FORM" as never) !== null && W.currentWording("adult.consent" as never) !== null;
  return { ok: saved, why: saved ? "saved" : "the wordings are not saved" };
}

/** The wording an officer's first-party import stores on a consent row — recognised by the gate as an 18+ attestation. */
export function attestationWording(h: Harness): string {
  const B = h.S.consentBasis;
  const w = B.importConsentWording(B.consentBasisFor("OWN_FORM"), h.S.wordings.savedBasisWordings());
  if (w === null) throw new Error("the first-party import wording is not saved — call ensureWordings first");
  return w;
}

/* ══ BUILDING A WORLD ═══════════════════════════════════════════════════════════════════════════════════════════════ */

export type WorldSpec = {
  /** "s1", "s2a" … — in every id and number block. */
  id: string;
  /** Number block (1–99, from `h.nextBlock()` when absent): the leading digits of the seven made-up digits, so two worlds never share a number. */
  block?: number;
  /** The walk's size in rows (people + duplicates). */
  n: number;
  population: "book" | "both";
  /** Class proportions (default `MIX`); classes absent are zero. */
  mix?: Partial<Record<Cls, number>>;
  duplicates?: number;
  /** Fraction of the sendable who already hold a stop link from an earlier campaign (default 0.06; never below 3 where possible). */
  oldTokens?: number;
};

/** Largest-remainder rounding so the class sizes sum to exactly `total`. */
function sizes(total: number, mix: Partial<Record<Cls, number>>): Map<Cls, number> {
  const entries = (Object.entries(mix) as [Cls, number][]).filter(([, f]) => f > 0);
  const sum = entries.reduce((a, [, f]) => a + f, 0);
  const raw = entries.map(([c, f]) => ({ c, exact: (f / sum) * total }));
  const out = new Map<Cls, number>(raw.map((r) => [r.c, Math.floor(r.exact)]));
  let left = total - [...out.values()].reduce((a, b) => a + b, 0);
  for (const r of raw.slice().sort((a, b) => (b.exact - Math.floor(b.exact)) - (a.exact - Math.floor(a.exact)) || (a.c < b.c ? -1 : 1))) {
    if (left <= 0) break;
    out.set(r.c, (out.get(r.c) ?? 0) + 1);
    left -= 1;
  }
  // A class the mix names must exist when the world is big enough to hold one of each (the smallest take from the largest).
  if (total >= raw.length * 3) {
    for (const r of raw) {
      if ((out.get(r.c) ?? 0) >= 1) continue;
      const big = [...out.entries()].sort((a, b) => b[1] - a[1])[0];
      out.set(big[0], big[1] - 1);
      out.set(r.c, 1);
    }
  }
  return out;
}

export async function buildWorld(h: Harness, spec: WorldSpec): Promise<World> {
  const { S } = h;
  const db = S.db;
  const rng = h.rng.fork(`world/${spec.id}`);
  const tag = `dryfire-r${h.runId}-${spec.id}`;
  const block = spec.block ?? h.nextBlock();
  // the default mix is the SEED's: every class keeps its place but its weight moves by up to 30 % either way, so two seeds are two
  // different crowds (more or fewer people on the stop list, more or fewer players the book does not hold); a scenario that names its
  // own mix (the one-class mini worlds) gets exactly that
  const mix: Partial<Record<Cls, number>> = {};
  const jitter = rng.fork("mix");
  for (const [c, w] of Object.entries(spec.mix ?? MIX) as [Cls, number][]) mix[c] = spec.mix === undefined ? w * (0.7 + 0.6 * jitter.next()) : w;
  if (spec.population === "book") delete mix.player_only;
  const dups = spec.duplicates ?? Math.round(spec.n * DUP_FRACTION);
  const peopleCount = Math.max(1, spec.n - dups);
  const plan = sizes(peopleCount, mix);
  const order: Cls[] = [];
  for (const [c, k] of plan) for (let i = 0; i < k; i++) order.push(c);
  const classes = rng.shuffle(order);
  const now = h.clock.now();
  const wording = attestationWording(h);
  const pinned = S.consentWording.SMS_CONSENT_WORDINGS.find((w) => w.site === "PROFILE" && w.locale === "SW")?.wording ?? "";
  const people: Person[] = [];
  const counts: Record<string, number> = {};
  let seq = 0;
  const wallets = new Map<string, string>();
  const nextId = (p: string): string => `${p}_df${h.runId}_${spec.id}_${pad(++seq, 6)}`;

  const user = async (p: Person, over: Partial<StoredUser>, optIn: boolean): Promise<string> => {
    const id = nextId("usr");
    const at = iso(now - 60 * DAY);
    await Promise.resolve(db.user.create({
      id, phoneE164: `+${p.key}`, passwordHash: null, passwordSalt: null, failedLoginCount: 0, lockedUntil: null,
      role: "PLAYER", status: "ACTIVE", locale: p.locale, displayName: p.name, dob: "1990-01-01", region: null,
      acceptedTermsVersion: "v1", acceptedTermsAt: at, marketingOptIn: optIn, twoFactorEnabled: false, avatarDataUrl: null,
      createdAt: at, updatedAt: at, lastLoginAt: at, closedAt: null, ...over,
    } as StoredUser));
    const walletId = nextId("wal");
    await Promise.resolve(db.wallet.create({
      id: walletId, userId: id, balance: 0, pending: 0, hold: 0, currency: "TZS", status: "ACTIVE", createdAt: at, updatedAt: at,
    } as never));
    wallets.set(id, walletId);
    return id;
  };
  // ⛔ `source` is the schema's own enum (MessagingConsentSource): a word outside it is accepted by the memory twin and REFUSED by
  // Postgres (STEP 54's heavy turn: "OPTOUT" for OPT_OUT_PAGE turned the scratch-Postgres dry-fire red in scenarios 1–3).
  const ledger = (key: string, status: "GIVEN" | "WITHDRAWN", source: "REGISTRATION" | "PROFILE" | "OPT_OUT_PAGE" | "KEYWORD" | "IMPORT" | "OPERATOR" | "RETENTION_LAPSE", words: string, recordedBy: string | null, at: number): Promise<unknown> =>
    Promise.resolve(db.messagingConsent.create({
      id: nextId("lc"), channel: "SMS", identifier: key, category: "MARKETING", status, source, wording: words, locale: "SW",
      evidence: "dry-fire", recordedBy, createdAt: iso(at),
    } as never));
  const contact = async (key: string, userId: string | null, source: "REGISTRATION" | "IMPORT", raw: string = key): Promise<string> => {
    const id = nextId("ct");
    const at = iso(now - 45 * DAY);
    const row = await Promise.resolve(db.marketingContact.create({
      id, msisdn: raw, rawInput: raw, displayName: null, email: null, ndc: key.slice(3, 5), operator: null, source, sourceRef: null,
      userId, consentState: "UNKNOWN", suppressedAt: null, tags: [tag], notes: null, importId: null, createdAt: at, createdBy: null,
      updatedAt: at, updatedBy: null,
    } as StoredMarketingContact));
    if (row === null) throw new Error(`dry-fire world: the contact row for ${id} collided with an existing number`);
    return id;
  };
  const suppress = (key: string, reason: "WITHDRAWN" | "OPERATOR"): Promise<unknown> =>
    Promise.resolve(db.suppression.create({
      id: nextId("sp"), channel: "SMS", identifier: key, category: "MARKETING", reason, evidence: "dry-fire", recordedBy: null,
      createdAt: iso(now - 5 * DAY), liftedAt: null, liftedReason: null,
    } as StoredSuppression));
  const rgRow = (userId: string, over: Partial<StoredResponsibleGambling>): Promise<unknown> =>
    Promise.resolve(db.responsible.upsert({
      userId, dailyDepositLimit: null, weeklyDepositLimit: null, monthlyDepositLimit: null, dailyLossLimit: null, sessionTimeLimitMin: null,
      realityCheckIntervalMin: 60, selfExclusionUntil: null, coolingOffUntil: null, selfExclusionStartedAt: null, coolingOffStartedAt: null,
      pendingIncreaseTo: null, pendingIncreaseEffectiveAt: null, pendingWeeklyIncreaseTo: null, pendingWeeklyIncreaseEffectiveAt: null,
      pendingMonthlyIncreaseTo: null, pendingMonthlyIncreaseEffectiveAt: null, ...over,
    } as StoredResponsibleGambling));
  const bornYearsAgo = (years: number): string => {
    const d = new Date(now - 14 * DAY);
    d.setUTCFullYear(d.getUTCFullYear() - years);
    return d.toISOString().slice(0, 10);
  };

  for (let i = 0; i < classes.length; i++) {
    const cls = classes[i];
    const ndc = cls === "unusable" ? DEAD_NDC : NDCS[hash32(`${h.seed}|${spec.id}|ndc|${i}`) % NDCS.length];
    const key = `255${ndc}${pad(block * 100_000 + i, 7)}`;
    h.numbers.add(key);
    const named = rng.chance(0.78);
    const p: Person = {
      idx: i, cls, key, userId: null, contactId: null, dupContactId: null,
      name: named ? NAMES[hash32(`${h.seed}|${spec.id}|name|${i}`) % NAMES.length] : null,
      locale: rng.chance(0.2) ? "EN" : "SW",
      expect: { send: false, reason: "no_consent" }, oldToken: null, lateStopAt: null,
    };
    counts[cls] = (counts[cls] ?? 0) + 1;
    switch (cls) {
      case "player_book":
        p.userId = await user(p, {}, true);
        await ledger(key, "GIVEN", "PROFILE", pinned, null, now - 20 * DAY);
        p.contactId = await contact(key, p.userId, "REGISTRATION");
        p.expect = { send: true, origin: "account" };
        break;
      case "player_only":
        p.userId = await user(p, {}, true);
        await ledger(key, "GIVEN", "PROFILE", pinned, null, now - 20 * DAY);
        p.expect = { send: true, origin: "account" };
        break;
      case "contact_ok":
        p.contactId = await contact(key, null, "IMPORT");
        await ledger(key, "GIVEN", "IMPORT", wording, h.officer.id, now - 20 * DAY);
        p.expect = { send: true, origin: "book" };
        break;
      case "contact_nocons":
        p.contactId = await contact(key, null, "IMPORT");
        p.expect = { send: false, reason: "no_consent" };
        break;
      case "contact_noadult":
        p.contactId = await contact(key, null, "IMPORT");
        await ledger(key, "GIVEN", "IMPORT", pinned, null, now - 20 * DAY);
        p.expect = { send: false, reason: "age_unknown" };
        break;
      case "contact_withdrawn":
        p.contactId = await contact(key, null, "IMPORT");
        await ledger(key, "GIVEN", "IMPORT", wording, h.officer.id, now - 20 * DAY);
        await ledger(key, "WITHDRAWN", "OPT_OUT_PAGE", "stop", null, now - 10 * DAY);
        p.expect = { send: false, reason: "consent_withdrawn" };
        break;
      case "contact_suppressed":
        p.contactId = await contact(key, null, "IMPORT");
        await ledger(key, "GIVEN", "IMPORT", wording, h.officer.id, now - 20 * DAY);
        await suppress(key, "WITHDRAWN");
        p.expect = { send: false, reason: "suppressed" };
        break;
      case "player_suppressed":
        p.userId = await user(p, {}, true);
        await ledger(key, "GIVEN", "PROFILE", pinned, null, now - 20 * DAY);
        p.contactId = await contact(key, p.userId, "REGISTRATION");
        await suppress(key, "OPERATOR");
        p.expect = { send: false, reason: "suppressed" };
        break;
      case "player_toggle_off":
        p.userId = await user(p, {}, false);
        p.contactId = await contact(key, p.userId, "REGISTRATION");
        p.expect = { send: false, reason: "no_consent" };
        break;
      case "player_withdrawn":
        p.userId = await user(p, {}, true);
        await ledger(key, "GIVEN", "PROFILE", pinned, null, now - 20 * DAY);
        await ledger(key, "WITHDRAWN", "PROFILE", "stop", null, now - 10 * DAY);
        p.contactId = await contact(key, p.userId, "REGISTRATION");
        p.expect = { send: false, reason: "consent_withdrawn" };
        break;
      case "self_excluded":
        p.userId = await user(p, { status: "SELF_EXCLUDED" }, true);
        await ledger(key, "GIVEN", "PROFILE", pinned, null, now - 20 * DAY);
        await rgRow(p.userId, { selfExclusionUntil: iso(now + 120 * DAY), selfExclusionStartedAt: iso(now - 30 * DAY) });
        p.contactId = await contact(key, p.userId, "REGISTRATION");
        p.expect = { send: false, reason: "rg_self_excluded" };
        break;
      case "cooling_off":
        p.userId = await user(p, { status: "COOLED_OFF" }, true);
        await ledger(key, "GIVEN", "PROFILE", pinned, null, now - 20 * DAY);
        await rgRow(p.userId, { coolingOffUntil: iso(now + 20 * DAY), coolingOffStartedAt: iso(now - 2 * DAY) });
        p.contactId = await contact(key, p.userId, "REGISTRATION");
        p.expect = { send: false, reason: "rg_cooling_off" };
        break;
      case "under25_history":
        p.userId = await user(p, { status: "COOLED_OFF", dob: bornYearsAgo(22) }, true);
        await rgRow(p.userId, { coolingOffUntil: iso(now - 30 * DAY), coolingOffStartedAt: iso(now - 40 * DAY) });
        await ledger(key, "GIVEN", "PROFILE", pinned, null, now - 10 * DAY);
        p.contactId = await contact(key, p.userId, "REGISTRATION");
        p.expect = { send: false, reason: "rg_under25_history" };
        break;
      case "harm_marker": {
        p.userId = await user(p, {}, true);
        await ledger(key, "GIVEN", "PROFILE", pinned, null, now - 20 * DAY);
        const wal = wallets.get(p.userId) as string;
        // 24h of deposits above twice the prior week's daily average and above TZS 50,000 — a marker that holds for ~20 virtual hours
        for (const [n, amount, ago] of [[0, 70_000, 3 * DAY], [1, 60_000, 2 * HOUR]] as const) {
          await Promise.resolve(db.txn.create({
            id: nextId("tx"), walletId: wal, userId: p.userId, type: "DEPOSIT", status: "CONFIRMED", amount, fee: 0, taxWithheld: 0,
            balanceAfter: null, currency: "TZS", provider: "MPESA", providerRef: null, msisdn: null, description: `dry-fire ${n}`, positionId: null,
            amlReason: null, createdAt: iso(now - ago), updatedAt: iso(now - ago), completedAt: null,
          } as never));
        }
        p.contactId = await contact(key, p.userId, "REGISTRATION");
        p.expect = { send: false, reason: "rg_harm_marker" };
        break;
      }
      case "minor":
        p.userId = await user(p, { dob: bornYearsAgo(16) }, true);
        await ledger(key, "GIVEN", "PROFILE", pinned, null, now - 20 * DAY);
        p.contactId = await contact(key, p.userId, "REGISTRATION");
        p.expect = { send: false, reason: "age_minor" };
        break;
      case "suspended":
        p.userId = await user(p, { status: "SUSPENDED" }, true);
        await ledger(key, "GIVEN", "PROFILE", pinned, null, now - 20 * DAY);
        p.contactId = await contact(key, p.userId, "REGISTRATION");
        p.expect = { send: false, reason: "account_status" };
        break;
      case "unusable":
        p.contactId = await contact(key, null, "IMPORT");
        p.expect = { send: false, unusable: true };
        break;
    }
    people.push(p);
  }

  // Duplicates: a second contact row for an already-listed number, in the legacy spelling with the trunk zero after 255.
  const duplicable = people.filter((p) => DUPLICABLE.includes(p.cls));
  let made = 0;
  for (const p of rng.shuffle(duplicable).slice(0, dups)) {
    const spelled = `2550${p.key.slice(3)}`;
    p.dupContactId = await contact(p.key, p.userId, "IMPORT", spelled);
    made += 1;
  }

  // Old stop links: a share of the sendable already hold one (an earlier campaign's message) — they can "tap stop" mid-run.
  const sendable = people.filter((p) => SENDABLE.includes(p.cls));
  const want = Math.min(sendable.length, Math.max(sendable.length >= 40 ? 3 : 0, Math.round(sendable.length * (spec.oldTokens ?? 0.06))));
  for (const p of rng.shuffle(sendable).slice(0, want)) p.oldToken = await S.optout.ensureOptOutToken(p.key);

  const byKey = new Map(people.map((p) => [p.key, p]));
  const playerOnly = people.filter((p) => p.contactId === null).length;
  const contactRows = people.filter((p) => p.contactId !== null).length + made;
  const filter: ContactAudienceFilter = spec.population === "both"
    ? { ...S.audience.WHOLE_BOOK, population: "both" }
    : { ...S.audience.WHOLE_BOOK, tags: [tag] };
  return {
    id: spec.id, tag, population: spec.population, filter, people, byKey,
    expectedRows: people.filter((p) => !("unusable" in p.expect)).length,
    duplicates: made, unusable: people.filter((p) => "unusable" in p.expect).length,
    walkRows: contactRows + (spec.population === "both" ? playerOnly : 0),
    counts,
  };
}

/* ══ THE CAMPAIGN ═══════════════════════════════════════════════════════════════════════════════════════════════════ */

export type CampaignSpec = {
  key: string;
  filter: ContactAudienceFilter;
  name?: string;
  /** The frozen limit (default: the estimate with a quarter to spare, never below the default TZS 10,000). */
  budgetTzs?: number;
  /** Price the estimate is frozen at (default 6, the settings' default). */
  priceTzs?: number;
  bilingual?: boolean;
};

/**
 * ⭐ A CONFIRMED CAMPAIGN, written as the confirmation (U40a) leaves one — the count the ONE walk gives NOW, typed tier, the
 * estimate frozen at the price, the limit frozen — through the ONE conditional transition. The confirmation's own service is
 * not run (it needs a signed fence and an officer's session); what it writes is.
 */
export async function confirmedCampaign(h: Harness, spec: CampaignSpec): Promise<StoredSmsCampaign> {
  const { S } = h;
  const id = `cmp_df${h.runId}_${spec.key}`;
  const at = iso(h.clock.now() - HOUR);
  const bodyEn = spec.bilingual === false ? null : BODY_EN;
  await Promise.resolve(S.db.smsCampaign.create({
    id, name: spec.name ?? `Dry-fire ${spec.key}`, status: "DRAFT", bodySw: BODY_SW, bodyEn,
    codingSw: "GSM7", segmentsSw: 1, codingEn: bodyEn === null ? null : "GSM7", segmentsEn: bodyEn === null ? null : 1,
    nameFallbackSw: FALLBACK_SW, nameFallbackEn: bodyEn === null ? null : FALLBACK_EN, sourcePhrase: SOURCE_LINE, draftRevision: 0,
    confirmTier: null, audienceFilter: S.audience.contactAudienceKey(spec.filter), audienceCount: null, audienceWatermark: null,
    estimateSegments: null, estimateTzs: null, budgetTzs: null, enqueueCursor: null, enqueuedAt: null, stopReason: null,
    createdBy: h.officer.id, confirmedBy: null, confirmedAt: null, startedAt: null, pausedAt: null, finishedAt: null, createdAt: at, updatedAt: at,
  } as StoredSmsCampaign));
  const count = await S.audience.campaignAudienceCount(spec.filter);
  const price = spec.priceTzs ?? 6;
  const estimateTzs = Math.ceil(count * price);
  const budget = spec.budgetTzs ?? Math.max(10_000, Math.ceil(estimateTzs * 1.25));
  const moved = await S.db.smsCampaign.transition(id, {
    from: ["DRAFT"], to: "CONFIRMED", draftRevision: 0, at: iso(h.clock.now()),
    patch: {
      audienceCount: count, confirmTier: "TYPED", audienceWatermark: null, estimateSegments: count, estimateTzs, budgetTzs: budget,
      confirmedBy: h.officer.id, confirmedAt: iso(h.clock.now()),
    },
  });
  if (moved === null) throw new Error(`dry-fire world: ${id} did not move DRAFT → CONFIRMED`);
  return moved;
}

/* ══ MID-RUN STOP LINKS ═════════════════════════════════════════════════════════════════════════════════════════════ */

/**
 * ⭐ SOME PEOPLE TAP THEIR STOP LINK WHILE THE CAMPAIGN RUNS — through the REAL opt-out service (the suppression row, the ledger
 * row, the toggle). Victims are chosen among those who hold an old link AND are still waiting unclaimed on this campaign, so the
 * oracle is crisp: from this instant each is refused (`suppressed`) and must have no message on the wire, before or after. Returns
 * how many stopped.
 */
export async function applyLateStops(h: Harness, world: World, campaignId: string, k: number): Promise<number> {
  const rows = await h.reader.recipients(campaignId);
  const waiting = new Set(rows.filter((r) => r.status === "PENDING" && r.claimToken === null).map((r) => r.msisdn));
  let done = 0;
  for (const p of world.people) {
    if (done >= k) break;
    // a person listed twice (a duplicate contact row) is left alone: were the unique key ever lost, one of their rows could be sent before the stop
    if (p.oldToken === null || p.lateStopAt !== null || p.dupContactId !== null || !waiting.has(p.key) || !p.expect.send) continue;
    const res = await h.S.optout.stopMarketing(p.oldToken, "SW");
    if (!res.ok) continue;
    p.lateStopAt = h.clock.now();
    p.expect = { send: false, reason: "suppressed" };
    done += 1;
  }
  return done;
}

/** A tiny deterministic sub-rng for a scenario's own choices. */
export const scenarioRng = (h: Harness, label: string) => makeRng(h.seed, `scenario/${label}`);

export const MINUTES = (n: number): number => n * MIN;
