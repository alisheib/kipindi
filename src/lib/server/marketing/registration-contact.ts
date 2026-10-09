/**
 * ⭐ EVERY CLIENT IS A CONTACT (the owner, 2026-10-03) — "every client is a contact in 50pick but not every contact is a
 * client: like in Awarkeh Mobiles, any number who registers to 50pick is added to contacts."
 *
 * The schema anticipated it: `ContactSource.REGISTRATION` ("the person signed up and their number came with the
 * account") and `MarketingContact.userId` (a LINK, never a copy). This module is the ONE writer of both:
 *   · `ensureRegistrationContact(user, deps?)` — THE RULE, for one account. Both sign-up doors reach it (through the
 *     bounded `registrationContactAtSignup`) and so does the backfill (`backfillRegistrationContacts`), so a door and
 *     the repair can never disagree about what a client's contact is.
 *   · `registrationContactAtSignup(user)` — the doors' one call: outside any lock, bounded by
 *     `REGISTRATION_CONTACT_BUDGET_MS`, and it never throws. ⛔ IT NEVER FAILS OR HOLDS A SIGN-UP: a contact the book
 *     could not take is a contact the backfill makes later; an account a sign-up could not create is a customer lost.
 *   · `backfillRegistrationContacts(deps?)` — every PLAYER account on a +255 number, walked by id (U38a's keyset,
 *     `user.playerWalk`), each through the same rule, answered as COUNTS only
 *     (`scripts/live/backfill-registration-contacts.mts` prints them).
 *
 * ⛔ CLIENTS ONLY (`registrationContactGate`): a PLAYER — never staff, an agent, or a number ADMIN_BOOTSTRAP_PHONES
 * promotes to ADMIN; a `+255` number the ONE table (`parseTzNumber`, U2) reads as a sendable Tanzanian mobile; never a
 * CLOSED account and never an erased one (its number is the `erased:<id>` tombstone, `erasure.ts`).
 *
 * WHAT IT WRITES, CASE BY CASE:
 *   · NO ROW HOLDS THE NUMBER → one row, shaped by U22's ONE builder (`newContactRow`, X6): source REGISTRATION,
 *     sourceRef the account id, the account's name and email through the ONE field rule (both nullable — at sign-up the
 *     name is always empty), the prefix from the ONE table, no stored operator (the brand is derived from `ndc` at
 *     render, U21), the account's own `createdAt` as the moment the number came with it — and THE LINK, set on the
 *     builder's row: sign-up's own fact (`contact-write.ts`: "a link is a fact only sign-up records"). Then U24's mirror.
 *   · AN UNLINKED ROW HOLDS IT (an officer or an import added the person first — "not every contact is a client" until
 *     they sign up) → LINKED: `userId` alone. Nothing an officer typed is overwritten, the source stays, and the row's
 *     own `updatedAt` is written back (OD56: a link is not an edit — an officer's open dialog stays valid, and a masked
 *     viewer, who is handed that stamp, sees nothing move). Then the mirror.
 *   · ALREADY LINKED TO THIS ACCOUNT → nothing (the mirror is asked, and writes only when the cache is wrong).
 *   · ⛔ AN ERASED TOMBSTONE (`sourceRef = erasure`) → KEPT, never revived. U18b's rules: no writer but erasure writes
 *     onto an erased person's number (C3 / A1.7), an erased row counts as present (X22), and a number outlives its holder
 *     — the next owner is a NEW person, reached as a PLAYER by the campaign's player arm (U38a walks the account; its
 *     book arm leaves the tombstone out). "Not a contact" never means "unreachable".
 *     ⚠️ C8a · the TOMBSTONE alone is asked here, on purpose: with NO book row, a sign-up writes the new account's own
 *     row even where an erasure stands on the number (the ledger's marker, `erasure-mark.ts`'s ONE rule). A sign-up is
 *     the account holder's own act and its row carries only what they gave at sign-up — never the erased person's name,
 *     email, notes or tags — so nothing erased comes back; and the marker still refuses the number at the gate until a
 *     GIVEN lifts it. The writers that would bring OLD data back — the importer and the Add form — ask the ONE rule.
 *   · ⛔ A ROW LINKED TO ANOTHER ACCOUNT → KEPT (U18b, `erase.ts`: "a row found by number that is linked to a different
 *     account is not this person's and is not touched"). Re-pointing it would hand that person's row — their name, their
 *     email — to this account's own data export (`dsar.ts` lists every LINKED row).
 *
 * ⛔ THE CACHE IS NEVER INVENTED. The consent state is U24's `mirrorContactCache`: the ledger's latest word for the
 * number, else UNKNOWN. Sign-up writes no ledger row since 2026-10-07 (the SMS-offers box is removed), so a new number
 * reads UNKNOWN, and a number the ledger already holds — a person who said yes or no before they signed up — reads that
 * word. This module writes NO ledger row and NO stop — OD8's zero backfill stands: this backfills the BOOK, never
 * consent.
 * ⛔ THE AUDIT NAMES THE MASKED NUMBER, THE ACCOUNT AND FIELD NAMES — never the digits, the name or the email (U22's
 * convention), and it is never awaited (a sign-up does not queue behind the audit chain). A failure is logged with the
 * error's NAME and CODE only: a database error's message can print the whole row it refused, the number included.
 *
 * Guard: `test:registration-contact` (in predeploy; in-process `--prove-red`). On Postgres:
 * `scripts/live/registration-contact-pg-probe.mts` (db-scratch, kept off predeploy).
 */
import { db } from "@/lib/server/store";
import type { PlayerWalk, PlayerWalkQuery, StoredMarketingContact, StoredUser } from "@/lib/server/store";
import { audit } from "@/lib/server/audit";
import { runOutsideLock } from "@/lib/server/locks";
import { mirrorContactCache } from "@/lib/server/marketing/contact-cache";
import type { ContactCacheOutcome } from "@/lib/server/marketing/contact-cache";
import { contactFormFields, isErasedContact, newContactRow } from "@/lib/server/contacts/contact-write";
import { parseTzNumber } from "@/lib/tz-msisdn";
import type { TzNumber } from "@/lib/tz-msisdn";
import { maskPhone } from "@/lib/phone-normalize";

/* ═══ THE SHAPES ════════════════════════════════════════════════════════════════════════════════ */

/** What the rule reads of an account — every field NAMED: no password, no avatar, nothing it does not decide on. */
export type RegistrationContactUser = Pick<
  StoredUser,
  "id" | "phoneE164" | "email" | "role" | "status" | "closedAt" | "displayName" | "createdAt"
>;

/** Why an account is not a client of the book. */
export type RegistrationContactSkip = "not_a_player" | "bootstrap_admin" | "closed" | "erased" | "not_tz_mobile";

/** Where a failed attempt stopped — `signup` is the wrapper's own belt. */
export type RegistrationContactStage = "read" | "create" | "link" | "mirror" | "signup";

export type RegistrationContactResult =
  | { outcome: "created"; contactId: string; cache: ContactCacheOutcome }
  | { outcome: "linked"; contactId: string; cache: ContactCacheOutcome }
  | { outcome: "already_linked"; contactId: string; cache: ContactCacheOutcome }
  /** ⛔ No id: an erased row is opened by nobody (A1.7). */
  | { outcome: "kept_erased"; cache: ContactCacheOutcome }
  /** ⛔ No id: the row is another account's. */
  | { outcome: "kept_other_account"; cache: ContactCacheOutcome }
  | { outcome: "skipped"; reason: RegistrationContactSkip }
  | { outcome: "failed"; stage: RegistrationContactStage }
  /** The sign-up wrapper only: the book did not answer within the budget. The write may still land; the backfill
   *  finds it either way. */
  | { outcome: "timed_out" };

/** The book's three moves, named so a red case can plant one. */
export type RegistrationBook = {
  findByMsisdn: (msisdn: string) => Promise<StoredMarketingContact | null>;
  create: (row: StoredMarketingContact) => Promise<StoredMarketingContact | null>;
  link: (row: StoredMarketingContact, userId: string) => Promise<StoredMarketingContact | null>;
};

export type RegistrationContactDeps = {
  /** The book (`REGISTRATION_BOOK` when absent). */
  book?: RegistrationBook;
  /** U24's ONE mirror (`mirrorContactCache` when absent). */
  mirror?: (msisdn: string) => Promise<ContactCacheOutcome>;
  /** Where an audit row goes (the platform's chain when absent). */
  audit?: (entry: Parameters<typeof audit>[0]) => unknown;
  /** The numbers ADMIN_BOOTSTRAP_PHONES promotes (read from the environment when absent). */
  bootstrapPhones?: ReadonlySet<string>;
  /** Named in the audit row: the two doors, or the backfill. */
  via?: "signup" | "backfill";
  /** The sign-up wrapper's patience, in milliseconds. */
  budgetMs?: number;
  /** The clock, for a row whose account carries no readable `createdAt`. */
  now?: () => Date;
};

/* ═══ THE BOOK — the store's own members, frozen ════════════════════════════════════════════════ */

export const REGISTRATION_BOOK: Readonly<RegistrationBook> = Object.freeze({
  findByMsisdn: async (msisdn: string) => Promise.resolve(db.marketingContact.findByMsisdn(msisdn)),
  create: async (row: StoredMarketingContact) => Promise.resolve(db.marketingContact.create(row)),
  /** ⭐ THE ONE LINK WRITE: `userId` and nothing else, with the row's own `updatedAt` written back (OD56). */
  link: async (row: StoredMarketingContact, userId: string) =>
    Promise.resolve(db.marketingContact.update(row.id, { userId }, row.updatedAt)),
});

/* ═══ THE GATE — clients only ═══════════════════════════════════════════════════════════════════ */

/**
 * The numbers ADMIN_BOOTSTRAP_PHONES promotes to ADMIN — read exactly as `auth-service.ts` (`adminBootstrapPhones`)
 * reads them: comma-separated, trimmed, empties dropped. ⛔ Such a number is never a client: the password door creates
 * it ADMIN, and the OTP door creates it PLAYER until the first password sign-in promotes it.
 */
export function bootstrapAdminPhones(raw: string | undefined = process.env.ADMIN_BOOTSTRAP_PHONES): ReadonlySet<string> {
  return new Set(String(raw ?? "").split(",").map((s) => s.trim()).filter(Boolean));
}

export type RegistrationContactGate =
  | { ok: true; number: TzNumber; msisdn: string }
  | { ok: false; reason: RegistrationContactSkip };

/** ⭐ THE ONE ANSWER TO "IS THIS ACCOUNT A CLIENT OF THE BOOK?" — in this order, so the reason is the most specific. */
export function registrationContactGate(
  user: RegistrationContactUser,
  bootstrap: ReadonlySet<string> = bootstrapAdminPhones(),
): RegistrationContactGate {
  if (user.role !== "PLAYER") return { ok: false, reason: "not_a_player" };
  const phone = String(user.phoneE164 ?? "");
  // The erasure tombstone (`erasure.ts`, `erasedPhoneTombstone`) keeps hex digits a normaliser would read as a
  // stranger's number (U18b's finding), so it is refused by its prefix before anything parses it.
  if (phone.startsWith("erased:")) return { ok: false, reason: "erased" };
  if (user.status === "CLOSED" || user.closedAt) return { ok: false, reason: "closed" };
  if (bootstrap.has(phone)) return { ok: false, reason: "bootstrap_admin" };
  if (!phone.startsWith("+255")) return { ok: false, reason: "not_tz_mobile" };
  const number = parseTzNumber(phone);
  if (number.verdict !== "ok" || number.msisdn === null || number.ndc === null) return { ok: false, reason: "not_tz_mobile" };
  return { ok: true, number, msisdn: number.msisdn };
}

/* ═══ THE ROW ═══════════════════════════════════════════════════════════════════════════════════ */

/** The account's name through the ONE field rule (`draftContactRow`, C12) — or null: a name the book's limits refuse is
 *  DROPPED, never cut (a cut name is a different name). */
function accountName(raw: string | null | undefined): string | null {
  const v = contactFormFields({ displayName: String(raw ?? ""), email: "", notes: "", tags: "" });
  return v.ok ? v.value.displayName : null;
}

/** The account's email through the same rule — lower case, the importer's shape — or null. */
function accountEmail(raw: string | null | undefined): string | null {
  const v = contactFormFields({ displayName: "", email: String(raw ?? ""), notes: "", tags: "" });
  return v.ok ? v.value.email : null;
}

/** When the number came with the account: the account's own `createdAt` (for a backfilled client, the day they signed
 *  up, so "Added" and the recent-additions count tell the truth); the clock only when that cannot be read. */
function registrationInstant(user: RegistrationContactUser, now: () => Date): string {
  const t = Date.parse(String(user.createdAt ?? ""));
  return Number.isFinite(t) ? new Date(t).toISOString() : now().toISOString();
}

function registrationRow(user: RegistrationContactUser, number: TzNumber, deps: RegistrationContactDeps): StoredMarketingContact {
  const row = newContactRow({
    number,
    rawInput: user.phoneE164,
    displayName: accountName(user.displayName),
    email: accountEmail(user.email),
    tags: [],
    notes: null,
    source: "REGISTRATION",
    sourceRef: user.id,
    importId: null,
    officerId: null,
    at: registrationInstant(user, deps.now ?? (() => new Date())),
  });
  // ⭐ THE LINK — sign-up's fact, on the row the ONE builder shaped. Nothing else of the builder's row changes.
  return { ...row, userId: user.id };
}

const filledFields = (row: StoredMarketingContact): string[] =>
  [row.displayName !== null ? "displayName" : null, row.email !== null ? "email" : null].filter((k): k is string => k !== null);

/* ═══ THE AUDIT AND THE LOG — no number, no name, no email ══════════════════════════════════════ */

function recordWrite(
  deps: RegistrationContactDeps,
  user: RegistrationContactUser,
  action: "contacts.contact.registered" | "contacts.contact.linked",
  row: StoredMarketingContact,
  extra: Record<string, unknown>,
): void {
  const via = deps.via ?? "signup";
  try {
    void Promise.resolve((deps.audit ?? audit)({
      category: "SYSTEM",
      action,
      // The person acted for themselves at sign-up; the backfill is the system's act.
      actorId: via === "signup" ? user.id : null,
      targetType: "MarketingContact",
      targetId: row.id,
      payload: { number: maskPhone(row.msisdn), account: user.id, via, ...extra },
    })).catch(() => undefined);
  } catch {
    // ⛔ An audit fault never undoes a write that landed: the row is in the book, and the chain's own drain is what
    // reports a lost append.
  }
}

/** The error's NAME and CODE — never its message (a Prisma message prints the invocation, the row's number in it). */
function failureKind(err: unknown): string {
  try {
    const e = (err ?? {}) as { name?: unknown; code?: unknown };
    const parts = [typeof e.name === "string" ? e.name : null, typeof e.code === "string" ? e.code : null]
      .filter((x): x is string => x !== null);
    return (parts.join(" ") || typeof err).slice(0, 60);
  } catch {
    return "unreadable";
  }
}

function logFailure(stage: RegistrationContactStage, err: unknown): void {
  console.error(`[registration-contact] the contact book was not written (${stage} · ${failureKind(err)}) — the sign-up went on; the backfill repairs it`);
}

/* ═══ THE RULE ══════════════════════════════════════════════════════════════════════════════════ */

/**
 * ⭐ ONE ACCOUNT, MADE A CONTACT — or left alone, with the reason. Never throws: every failure is answered `failed`
 * with the stage it stopped at, and logged without the number.
 */
export async function ensureRegistrationContact(
  user: RegistrationContactUser,
  deps: RegistrationContactDeps = {},
): Promise<RegistrationContactResult> {
  const gate = registrationContactGate(user, deps.bootstrapPhones ?? bootstrapAdminPhones());
  if (!gate.ok) return { outcome: "skipped", reason: gate.reason };
  const book = deps.book ?? REGISTRATION_BOOK;
  const mirror = deps.mirror ?? mirrorContactCache;
  const msisdn = gate.msisdn;
  let stage: RegistrationContactStage = "read";
  try {
    let row: StoredMarketingContact | null = await book.findByMsisdn(msisdn);
    if (row === null) {
      stage = "create";
      const created = await book.create(registrationRow(user, gate.number, deps));
      if (created !== null) {
        // The write landed: it is recorded before the cache is asked, so a mirror fault cannot lose its audit row.
        recordWrite(deps, user, "contacts.contact.registered", created, { fields: filledFields(created) });
        stage = "mirror";
        return { outcome: "created", contactId: created.id, cache: await mirror(msisdn) };
      }
      // ⭐ THE UNIQUE INDEX IS THE DUPLICATE CHECK (U22's rule): a row landed between the read and the create — the
      // backfill racing a sign-up, or a retry. Decide on the row that won.
      stage = "read";
      row = await book.findByMsisdn(msisdn);
      if (row === null) throw new Error("the book refused the row but holds none for its number");
    }
    if (isErasedContact(row)) {
      stage = "mirror";
      return { outcome: "kept_erased", cache: await mirror(msisdn) };
    }
    if (row.userId === user.id) {
      stage = "mirror";
      return { outcome: "already_linked", contactId: row.id, cache: await mirror(msisdn) };
    }
    if (row.userId !== null) {
      stage = "mirror";
      return { outcome: "kept_other_account", cache: await mirror(msisdn) };
    }
    stage = "link";
    const linked = await book.link(row, user.id);
    if (linked === null) throw new Error("the row left the book before it could be linked");
    recordWrite(deps, user, "contacts.contact.linked", linked, { keptSource: row.source });
    stage = "mirror";
    return { outcome: "linked", contactId: row.id, cache: await mirror(msisdn) };
  } catch (err) {
    logFailure(stage, err);
    return { outcome: "failed", stage };
  }
}

/* ═══ THE DOORS' CALL — bounded, outside every lock, never throws ═══════════════════════════════ */

/** How long a sign-up waits for the book. Past it the sign-up goes on and the write, if it lands, lands late. */
export const REGISTRATION_CONTACT_BUDGET_MS = 1_500;

/**
 * ⭐ THE ONE LINE BOTH SIGN-UP DOORS CALL, after the account row and the wallet (sign-up writes no consent ledger row
 * since the SMS-offers box was removed on 2026-10-07).
 * ⛔ OUTSIDE THE LOCK: the password door holds `register:<phone>` around this, and a write that outlives the budget must
 * not carry that lock's context into a transaction that has already committed (`runOutsideLock`, house bots C4 §2).
 * ⛔ BOUNDED: a book that does not answer within the budget is not waited for. ⛔ NEVER THROWS, NEVER REJECTS — a late
 * rejection is caught too, so it can never surface as an unhandled one.
 */
export async function registrationContactAtSignup(
  user: RegistrationContactUser,
  deps: RegistrationContactDeps = {},
): Promise<RegistrationContactResult> {
  const budgetMs = deps.budgetMs ?? REGISTRATION_CONTACT_BUDGET_MS;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const work = runOutsideLock(() => ensureRegistrationContact(user, { ...deps, via: "signup" }));
    void work.catch(() => undefined);
    const late = new Promise<RegistrationContactResult>((resolve) => {
      timer = setTimeout(() => resolve({ outcome: "timed_out" }), budgetMs);
    });
    const result = await Promise.race([work, late]);
    if (result.outcome === "timed_out") {
      console.error(`[registration-contact] the contact book did not answer within ${budgetMs} ms at sign-up — not waited for; the backfill repairs a miss`);
    }
    return result;
  } catch (err) {
    logFailure("signup", err);
    return { outcome: "failed", stage: "signup" };
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

/* ═══ THE BACKFILL — every client, by id, counts only ═══════════════════════════════════════════ */

export type RegistrationBackfillCounts = {
  /** Every account in the store when the walk began (staff and erased accounts included) — the census. */
  accounts: number;
  /** Player accounts on a `+255` number that the walk visited. */
  walked: number;
  /** Ids the walk named that the account read no longer returned (gone between the two reads). */
  missing: number;
  outcomes: {
    created: number;
    linked: number;
    already_linked: number;
    kept_erased: number;
    kept_other_account: number;
    skipped: number;
    failed: number;
  };
  skipped: Record<RegistrationContactSkip, number>;
  failed: Record<RegistrationContactStage, number>;
  cache: Record<ContactCacheOutcome, number>;
};

export type RegistrationBackfillDeps = {
  /** U38a's keyset walk over PLAYER accounts on a +255 number (`user.playerWalk`). */
  walk?: (q: PlayerWalkQuery) => Promise<PlayerWalk>;
  /** The accounts behind one page of ids (`user.findByIds` — the avatar is omitted on Postgres). */
  accounts?: (ids: string[]) => Promise<StoredUser[]>;
  /** How many accounts the store holds (`user.count`). */
  census?: () => Promise<number>;
  /** THE RULE, per account. */
  ensure?: (user: RegistrationContactUser, deps?: RegistrationContactDeps) => Promise<RegistrationContactResult>;
  /** Handed to the rule for every account (`via` is always "backfill"). */
  contact?: RegistrationContactDeps;
  /** Accounts per page, 1–1,000. */
  chunk?: number;
};

export const REGISTRATION_BACKFILL_CHUNK = 200;

function emptyBackfillCounts(): RegistrationBackfillCounts {
  return {
    accounts: 0,
    walked: 0,
    missing: 0,
    outcomes: { created: 0, linked: 0, already_linked: 0, kept_erased: 0, kept_other_account: 0, skipped: 0, failed: 0 },
    skipped: { not_a_player: 0, bootstrap_admin: 0, closed: 0, erased: 0, not_tz_mobile: 0 },
    failed: { read: 0, create: 0, link: 0, mirror: 0, signup: 0 },
    cache: { none: 0, unchanged: 0, updated: 0, failed: 0 },
  };
}

function tally(c: RegistrationBackfillCounts, r: RegistrationContactResult): void {
  switch (r.outcome) {
    case "created":
    case "linked":
    case "already_linked":
    case "kept_erased":
    case "kept_other_account":
      c.outcomes[r.outcome]++;
      c.cache[r.cache]++;
      return;
    case "skipped":
      c.outcomes.skipped++;
      c.skipped[r.reason]++;
      return;
    case "failed":
      c.outcomes.failed++;
      c.failed[r.stage]++;
      return;
    case "timed_out":
      c.outcomes.failed++;
      c.failed.signup++;
      return;
  }
}

/**
 * ⭐ EVERY CLIENT, THROUGH THE ONE RULE. Walks PLAYER accounts on a +255 number by id, a page at a time (a keyset —
 * an account created during the walk can make no other account be visited twice), reads each page's accounts in one
 * call, and asks the rule once per account. ⭐ IDEMPOTENT BY CONSTRUCTION: the rule's second answer for a client is
 * `already_linked` or a `kept_*`, which write nothing (the mirror writes only a cache that is wrong).
 * ⛔ IT HOLDS NO NUMBER AND NO NAME: the answer is counts, and the per-account result it reads carries none.
 */
export async function backfillRegistrationContacts(deps: RegistrationBackfillDeps = {}): Promise<RegistrationBackfillCounts> {
  const walk = deps.walk ?? (async (q: PlayerWalkQuery) => Promise.resolve(db.user.playerWalk(q)));
  const accountsOf = deps.accounts ?? (async (ids: string[]) => Promise.resolve(db.user.findByIds(ids)));
  const census = deps.census ?? (async () => Promise.resolve(db.user.count()));
  const ensure = deps.ensure ?? ensureRegistrationContact;
  const want = Number(deps.chunk ?? REGISTRATION_BACKFILL_CHUNK);
  const limit = Number.isFinite(want) ? Math.min(1_000, Math.max(1, Math.floor(want))) : REGISTRATION_BACKFILL_CHUNK;
  const counts = emptyBackfillCounts();
  counts.accounts = await census();
  let afterId: string | null = null;
  for (;;) {
    const page = await walk({ afterId, limit, ndcs: null, createdFrom: null, createdBefore: null });
    if (page.rows.length === 0) break;
    const byId = new Map((await accountsOf(page.rows.map((r) => r.id))).map((u) => [u.id, u] as const));
    for (const r of page.rows) {
      counts.walked++;
      const user = byId.get(r.id);
      if (user === undefined) {
        counts.missing++;
        continue;
      }
      tally(counts, await ensure(user, { ...deps.contact, via: "backfill" }));
    }
    // ⛔ A cursor that does not move would walk for ever: it ends the walk.
    if (page.nextAfterId === null || page.nextAfterId === afterId) break;
    afterId = page.nextAfterId;
  }
  return counts;
}

/**
 * The backfill's DRY RUN: the book is read, never written — a create or a link answers as if it had landed, the mirror
 * is not asked and nothing is audited — so the counts say what the real run WOULD do (its cache column reads "none").
 */
export function registrationDryRunDeps(): RegistrationContactDeps {
  return {
    book: {
      findByMsisdn: REGISTRATION_BOOK.findByMsisdn,
      create: async (row) => row,
      link: async (row, userId) => ({ ...row, userId }),
    },
    mirror: async (): Promise<ContactCacheOutcome> => "none",
    audit: () => undefined,
  };
}

/** The report's words for each count — a lexicon, never an identifier with its underscores taken out (`test:labels` §11a). */
const SKIP_WORDS: Record<RegistrationContactSkip, string> = {
  not_a_player: "staff or agent",
  bootstrap_admin: "bootstrap admin",
  closed: "closed account",
  erased: "erased account",
  not_tz_mobile: "not a Tanzanian mobile",
};
const STAGE_WORDS: Record<RegistrationContactStage, string> = {
  read: "reading the book",
  create: "creating the row",
  link: "linking the row",
  mirror: "mirroring the consent",
  signup: "at sign-up",
};
const CACHE_WORDS: Record<ContactCacheOutcome, string> = {
  none: "no row",
  unchanged: "already true",
  updated: "repaired",
  failed: "not read",
};

/** ⭐ THE ONLY LINES THE BACKFILL PRINTS — counts and their labels. ⛔ No number, no name, no email: the counts hold none. */
export function registrationBackfillReport(c: RegistrationBackfillCounts, o: { production: boolean; dryRun: boolean }): string[] {
  const list = <K extends string>(rec: Record<K, number>, words: Record<K, string>): string =>
    (Object.keys(words) as K[]).filter((k) => rec[k] > 0).map((k) => `${words[k]} ${rec[k]}`).join(" · ") || "none";
  return [
    `registration contacts backfill — ${o.production ? "PRODUCTION" : "scratch"}${o.dryRun ? " · DRY RUN (nothing written)" : ""}`,
    `accounts in the store: ${c.accounts}`,
    `walked (player accounts on a +255 number, by id): ${c.walked}`,
    `not walked (staff, agents, erased accounts, numbers outside +255): ${Math.max(0, c.accounts - c.walked)}`,
    `created: ${c.outcomes.created}`,
    `linked (an officer's or an import's contact, now this client's): ${c.outcomes.linked}`,
    `already linked: ${c.outcomes.already_linked}`,
    `kept — an erased number's row, never revived: ${c.outcomes.kept_erased}`,
    `kept — the number's row is linked to another account: ${c.outcomes.kept_other_account}`,
    `skipped: ${c.outcomes.skipped} (${list(c.skipped, SKIP_WORDS)})`,
    `failed: ${c.outcomes.failed} (${list(c.failed, STAGE_WORDS)})`,
    `consent cache: ${list(c.cache, CACHE_WORDS)}`,
    `gone between the walk and the read: ${c.missing}`,
  ];
}
