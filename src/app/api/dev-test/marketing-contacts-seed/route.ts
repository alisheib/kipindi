/**
 * /api/dev-test/marketing-contacts-seed — fill the contact book, for the U20/U21/U22/U23/U34a visual drive.
 *
 * ⛔ 404 IN PRODUCTION, like every other route under `dev-test/` (`test:cert-devroutes`). It is reachable only
 * where `NODE_ENV` is not `production`, which on this platform means a developer's own machine.
 *
 * ⭐ WHY THIS EXISTS AT ALL. Since U22 one contact can be added by hand, but a drive cannot type forty-five numbers to
 * photograph a populated, paged, filtered list — and the importers (U25–U32) are not live. The rows go in through
 * the ONE create builder (`newContactRow`, decision X6) and `db.marketingContact.create`, the path the form and the
 * importers take, so the page reads them exactly as it will read real ones.
 * ⭐ AND THE RECORDS BEHIND THEM ARE REAL. `consentState` is only a CACHE of the ledger and `suppressedAt` a
 * mirror of a stop, so a seed that set them alone showed "Consent: Given" beside "Reachable: No consent"
 * (measured on the first drive, 2026-10-01). A GIVEN row gets its ledger GIVEN, a WITHDRAWN row a GIVEN then
 * a WITHDRAWN (through the ledger's one clock — `test:dal-parity` §20 lists this route as a writer), and a
 * suppressed row a real stop; the builder writes the caches as "nothing known", and `mirrorContactCache` then
 * writes them from those records — U24's one cache writer, the same step the form takes.
 *
 *   POST ?count=45     — idempotent: deterministic ids and numbers, a re-run creates nothing new
 *   POST ?fault=1|0    — switch the MEMORY twin's read fault on/off, to photograph the page's error state
 *   POST ?u22=1        — U22's fixtures, idempotent: an ERASED row (`sourceRef = "erasure"`, decision C3), and for each
 *                        of three drive runs a PLAYER's number whose ledger says GIVEN and a stranger's number whose
 *                        ledger says WITHDRAWN — neither in the book, so the drive adds them through the form
 *   POST ?u23grant=view-only|reset — U23's act-gate state: the AUDITOR role given Growth VIEW without ACT (no default role
 *                        holds that pair, `roles.ts`), so the drive can photograph every bulk action disabled with its
 *                        reason; `reset` takes the view away again
 *   POST ?u23moved=1   — U23's moved audience: ONE more contact (tag "moved", on 0769 000 0NN, which nothing else uses),
 *                        added between the bulk bar's preview and its confirmation so the server's recount refuses it
 *   POST ?u34=1        — U34a's export fixture, idempotent: four live contacts tagged "export" (on 0764 000 0NN, which
 *                        nothing else uses) carrying the file's hard cases — a comma and doubled quotes in a name, a name
 *                        that is a formula, one already guarded, a line break in a note, emails to mask — and an ERASED
 *                        tombstone tagged "export" too, so a drive filtering ?tag=export must download exactly four rows
 *   POST ?u30=1        — S15's import world (the admin guide's import pictures and the importer's drive), idempotent, on
 *                        0768 000 0NN, which nothing else uses: 001 in the book with a name the file replaces, 002 in the
 *                        book AND on the stop list, 003 a PLAYER's number — the account and, as every client is a contact,
 *                        its book row through the ONE registration writer — 004 ERASED (an emptied row, `sourceRef` the
 *                        erasure mark, the person's last word WITHDRAWN), and 010 and 011 NOT in the book: a previous drive's
 *                        import added them, so they are taken out again through the resolver's one write door
 */
import { NextResponse } from "next/server";
import { db } from "@/lib/server/store";
import type { MessagingConsentSource, StoredMarketingContact, StoredUser } from "@/lib/server/store";
import { parseTzNumber } from "@/lib/tz-msisdn";
import { ledgerStamp } from "@/lib/server/marketing/ledger-stamp";
import { mirrorContactCache } from "@/lib/server/marketing/contact-cache";
import { newContactRow } from "@/lib/server/contacts/contact-write";
import { ERASURE_EVIDENCE } from "@/lib/marketing/erasure-mark";
import { setRoleGrant } from "@/lib/server/rbac";
import { ensureRegistrationContact } from "@/lib/server/marketing/registration-contact";
import { WHOLE_BOOK, contactAudienceWrites } from "@/lib/server/marketing/audience";

const SEED_WORDING = "Seeded by the contacts drive (dev only).";

async function ledgerRow(identifier: string, status: "GIVEN" | "WITHDRAWN", source: MessagingConsentSource = "IMPORT") {
  await db.messagingConsent.create({
    ...ledgerStamp(),
    channel: "SMS",
    identifier,
    category: "MARKETING",
    status,
    source,
    wording: SEED_WORDING,
    locale: "EN",
    evidence: "dev-seed",
    recordedBy: null,
  });
}

/* ═══ U22 · the form's drive fixtures ═══════════════════════════════════════════════════════════ */

/** On 076, which the 45-row seed never uses, so nothing here collides with it. */
const U22_ERASED = "0766000001";
const U22_RUNS = [0, 1, 2];
const u22Player = (run: number) => `076610000${run}`;
const u22Withdrawn = (run: number) => `076620000${run}`;

/** A player as sign-up leaves one — the account a number belongs to. ⛔ No wallet: the drive needs the account to EXIST
 *  (so the form's "never linked" can be seen), not to be funded. */
function u22PlayerRow(id: string, phoneE164: string, at: string): StoredUser {
  return {
    id,
    phoneE164,
    email: null,
    passwordHash: null,
    passwordSalt: null,
    failedLoginCount: 0,
    lockedUntil: null,
    role: "PLAYER",
    status: "ACTIVE",
    locale: "SW",
    displayName: null,
    dob: "1990-01-01",
    region: null,
    acceptedTermsVersion: "v1",
    acceptedTermsAt: at,
    marketingOptIn: true,
    twoFactorEnabled: false,
    avatarDataUrl: null,
    emailVerifiedAt: null,
    createdAt: at,
    updatedAt: at,
    lastLoginAt: at,
    closedAt: null,
  };
}

async function seedU22(): Promise<{ erasedId: string | null; erasedNumber: string; players: string[]; withdrawn: string[] }> {
  const at = new Date("2026-09-20T08:00:00.000Z").toISOString();
  // ── the erased tombstone: only its number, `sourceRef` the erasure mark, the person's last word WITHDRAWN ──
  let erasedId: string | null = null;
  const erased = parseTzNumber(U22_ERASED);
  if (erased.verdict === "ok" && erased.msisdn) {
    const created = await db.marketingContact.create(newContactRow({
      number: erased, rawInput: erased.msisdn, displayName: null, email: null, tags: [], notes: null,
      source: "IMPORT", sourceRef: ERASURE_EVIDENCE, importId: null, officerId: null, at,
    }, "mc_seed_erased"));
    if (created) {
      await ledgerRow(created.msisdn, "GIVEN");
      await ledgerRow(created.msisdn, "WITHDRAWN");
      await mirrorContactCache(created.msisdn, at);
    }
    erasedId = (await db.marketingContact.findByMsisdn(erased.msisdn))?.id ?? null;
  }
  for (const run of U22_RUNS) {
    // ── a PLAYER's number, consent GIVEN at sign-up — not in the book ──
    const player = parseTzNumber(u22Player(run));
    if (player.verdict === "ok" && player.msisdn && !(await db.user.findByPhone(`+${player.msisdn}`))) {
      await db.user.create(u22PlayerRow(`usr_u22_player_${run}`, `+${player.msisdn}`, at));
      await ledgerRow(player.msisdn, "GIVEN", "REGISTRATION");
    }
    // ── a stranger's number whose last word is WITHDRAWN — not in the book ──
    const stranger = parseTzNumber(u22Withdrawn(run));
    if (stranger.verdict === "ok" && stranger.msisdn
      && !(await db.messagingConsent.latestFor({ channel: "SMS", identifier: stranger.msisdn, category: "MARKETING" }))) {
      await ledgerRow(stranger.msisdn, "GIVEN");
      await ledgerRow(stranger.msisdn, "WITHDRAWN");
    }
  }
  return { erasedId, erasedNumber: U22_ERASED, players: U22_RUNS.map(u22Player), withdrawn: U22_RUNS.map(u22Withdrawn) };
}

/* ═══ U23 · the bulk bar's drive fixture ═════════════════════════════════════════════════════════ */

/** On 0769 000 0NN — the 45-row seed never uses 076, U22's fixtures use 076 6 and 076 7. */
const u23Moved = (k: number) => `07690000${String(k).padStart(2, "0")}`;

/** The next "moved" contact, through the ONE builder and the ONE mirror — the row a recount must notice. */
async function seedU23Moved(): Promise<{ moved: number }> {
  const at = new Date().toISOString();
  for (let k = 0; k < 100; k++) {
    const parsed = parseTzNumber(u23Moved(k));
    if (parsed.verdict !== "ok" || !parsed.msisdn) break;
    if (await db.marketingContact.findByMsisdn(parsed.msisdn)) continue;
    await db.marketingContact.create(newContactRow({
      number: parsed, rawInput: u23Moved(k), displayName: `Moved ${k + 1}`, email: null, tags: ["moved"], notes: null,
      source: "OPERATOR", sourceRef: null, importId: null, officerId: null, at,
    }, `mc_seed_moved_${String(k).padStart(2, "0")}`));
    await mirrorContactCache(parsed.msisdn, at);
    return { moved: k + 1 };
  }
  return { moved: -1 };
}

/* ═══ U34a · the export's drive fixture ═════════════════════════════════════════════════════════════ */

/** On 0764 000 0NN — the 45-row seed never uses 076, U22's fixtures use 076 6 / 076 7 and U23's 0769. */
const u34Number = (k: number) => `07640000${String(k).padStart(2, "0")}`;
const LF = String.fromCharCode(10);
/** The file's hard cases: a comma and doubled quotes in a name, a name that IS a formula, a name already guarded, a line
 *  break inside a note, a note that leads with a dash, two emails to mask, and a contact with neither name nor email. */
const U34_ROWS: Array<{ k: number; name: string | null; email: string | null; notes: string | null; tags: string[] }> = [
  { k: 1, name: 'Asha "Mama" Export, Dar', email: "asha.export@example.com", notes: "Line one" + LF + "Line two, with a comma", tags: ["export", "vip"] },
  { k: 2, name: "=SUM(1,2)", email: "formula.export@example.com", notes: null, tags: ["export"] },
  { k: 3, name: "'=already guarded", email: null, notes: "-starts with a dash", tags: ["export"] },
  { k: 4, name: null, email: null, notes: null, tags: ["export"] },
];

/** The four through the ONE builder and the ONE mirror, then the tombstone — `sourceRef` the erasure mark, in no file (C3).
 *  Answers what is IN THE BOOK afterwards (the live rows found, and whether the tombstone is there), never a constant. */
async function seedU34(): Promise<{ inBook: number; erasedPresent: boolean; erasedNumber: string }> {
  const at = new Date("2026-09-25T08:00:00.000Z").toISOString();
  for (const r of U34_ROWS) {
    const parsed = parseTzNumber(u34Number(r.k));
    if (parsed.verdict !== "ok" || !parsed.msisdn || (await db.marketingContact.findByMsisdn(parsed.msisdn))) continue;
    await db.marketingContact.create(newContactRow({
      number: parsed, rawInput: u34Number(r.k), displayName: r.name, email: r.email, tags: r.tags, notes: r.notes,
      source: "OPERATOR", sourceRef: null, importId: null, officerId: null, at,
    }, `mc_seed_export_${r.k}`));
    await mirrorContactCache(parsed.msisdn, at);
  }
  const erased = parseTzNumber(u34Number(99));
  if (erased.verdict === "ok" && erased.msisdn && !(await db.marketingContact.findByMsisdn(erased.msisdn))) {
    await db.marketingContact.create(newContactRow({
      number: erased, rawInput: erased.msisdn, displayName: null, email: null, tags: ["export"], notes: null,
      source: "IMPORT", sourceRef: ERASURE_EVIDENCE, importId: null, officerId: null, at,
    }, "mc_seed_export_erased"));
    await mirrorContactCache(erased.msisdn, at);
  }
  let inBook = 0;
  for (const r of U34_ROWS) {
    const parsed = parseTzNumber(u34Number(r.k));
    const row = parsed.verdict === "ok" && parsed.msisdn ? await db.marketingContact.findByMsisdn(parsed.msisdn) : null;
    if (row && row.sourceRef !== ERASURE_EVIDENCE && row.tags.includes("export")) inBook++;
  }
  const tomb = erased.verdict === "ok" && erased.msisdn ? await db.marketingContact.findByMsisdn(erased.msisdn) : null;
  return { inBook, erasedPresent: tomb?.sourceRef === ERASURE_EVIDENCE, erasedNumber: u34Number(99) };
}

/* ═══ S15 · the importer's drive world (the admin guide's import pictures) ════════════════════════════════════ */

/** On 0768 000 0NN — the 45-row seed never uses 076, U22's fixtures use 076 6 / 076 7, U23's 0769 and U34's 0764. */
const u30Number = (k: number) => `07680000${String(k).padStart(2, "0")}`;

/**
 * The world `scripts/live/admin-guide.mjs` pictures an import against (its IMPORT_CSV): 001 in the book with a name the
 * file's row replaces, 002 in the book and on the stop list, 003 a PLAYER's number, 004 ERASED, 010 and 011 new.
 * ⭐ THROUGH THE REAL WRITERS, as every world here: book rows by the ONE builder (`newContactRow`), the player's book row by
 * the ONE registration writer (`ensureRegistrationContact` — every client is a contact), the stop and the ledger rows as
 * the other worlds write them, then U24's mirror. ⭐ IDEMPOTENT: a re-run writes nothing new — and 010 and 011, which the
 * guide's import itself creates, are taken out again through the resolver's one write door, so every run of the guide
 * meets the same world. Answers the numbers as the guide types them (dev only — this route is 404 in production).
 */
async function seedU30(): Promise<{ inBook: string[]; stopped: string; player: string; erased: string; notInBook: string[]; removed: number }> {
  const at = new Date("2026-09-28T08:00:00.000Z").toISOString();
  const numberOf = (k: number) => {
    const p = parseTzNumber(u30Number(k));
    return p.verdict === "ok" && p.msisdn ? { parsed: p, msisdn: p.msisdn } : null;
  };

  // ── 001 · in the book, with a name the file's row replaces ──
  const one = numberOf(1);
  if (one && !(await db.marketingContact.findByMsisdn(one.msisdn))) {
    await db.marketingContact.create(newContactRow({
      number: one.parsed, rawInput: u30Number(1), displayName: "Asha", email: null, tags: ["dar"], notes: null,
      source: "OPERATOR", sourceRef: null, importId: null, officerId: null, at,
    }, "mc_seed_u30_001"));
    await mirrorContactCache(one.msisdn, at);
  }

  // ── 002 · in the book AND on the stop list: a real stop, then the mirror writes the cache from it ──
  const two = numberOf(2);
  if (two) {
    if (!(await db.marketingContact.findByMsisdn(two.msisdn))) {
      await db.marketingContact.create(newContactRow({
        number: two.parsed, rawInput: u30Number(2), displayName: "Chausiku", email: null, tags: [], notes: null,
        source: "OPERATOR", sourceRef: null, importId: null, officerId: null, at,
      }, "mc_seed_u30_002"));
    }
    if (!(await db.suppression.find({ channel: "SMS", identifier: two.msisdn, category: "MARKETING" }))) {
      await db.suppression.create({
        id: "sup_seed_u30_002", channel: "SMS", identifier: two.msisdn, category: "MARKETING",
        reason: "WITHDRAWN", evidence: "dev-seed", recordedBy: null, createdAt: at, liftedAt: null, liftedReason: null,
      });
    }
    await mirrorContactCache(two.msisdn, at);
  }

  // ── 003 · a PLAYER's number: the account, and — every client is a contact — its book row by the ONE registration writer ──
  const three = numberOf(3);
  if (three) {
    const phone = `+${three.msisdn}`;
    if (!(await db.user.findByPhone(phone))) await db.user.create(u22PlayerRow("usr_u30_player", phone, at));
    const player = await db.user.findByPhone(phone);
    if (player) await ensureRegistrationContact(player, { via: "backfill" });
  }

  // ── 004 · ERASED: only its number, `sourceRef` the erasure mark, the person's last word WITHDRAWN (U22's tombstone) ──
  const four = numberOf(4);
  if (four && !(await db.marketingContact.findByMsisdn(four.msisdn))) {
    const created = await db.marketingContact.create(newContactRow({
      number: four.parsed, rawInput: four.msisdn, displayName: null, email: null, tags: [], notes: null,
      source: "IMPORT", sourceRef: ERASURE_EVIDENCE, importId: null, officerId: null, at,
    }, "mc_seed_u30_004"));
    if (created) {
      await ledgerRow(created.msisdn, "GIVEN");
      await ledgerRow(created.msisdn, "WITHDRAWN");
      await mirrorContactCache(created.msisdn, at);
    }
  }

  // ── 010 · 011 · NOT in the book: the guide's own import adds them, so a re-run takes them out through the one door ──
  const stale: string[] = [];
  for (const k of [10, 11]) {
    const n = numberOf(k);
    const row = n ? await db.marketingContact.findByMsisdn(n.msisdn) : null;
    if (row && row.sourceRef !== ERASURE_EVIDENCE) stale.push(row.id);
  }
  const removed = stale.length > 0 ? (await contactAudienceWrites({ ...WHOLE_BOOK, ids: stale }).remove()).changed : 0;
  return {
    inBook: [1, 2, 3, 4].map(u30Number), stopped: u30Number(2), player: u30Number(3), erased: u30Number(4),
    notInBook: [10, 11].map(u30Number), removed,
  };
}

const NAMES = ["Asha Mwakalinga", "Baraka Juma", null, "Neema Kileo", "Juma Hassan", "Rehema Said", null, "Daudi Mrisho", "Zawadi Ally", "Faraja Mushi"];
const PREFIXES = ["071", "074", "075", "068", "062", "065", "078", "061"];
const CONSENT: StoredMarketingContact["consentState"][] = ["UNKNOWN", "GIVEN", "UNKNOWN", "WITHDRAWN", "GIVEN"];
const SOURCES: StoredMarketingContact["source"][] = ["IMPORT", "IMPORT", "OPERATOR", "AGENT", "IMPORT"];
const TAGS = [["vip"], [], ["dar", "football"], ["arusha"], [], ["vip", "dar", "weekend"]];

export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ ok: false, error: "Not available" }, { status: 404 });
  }
  const url = new URL(req.url);
  const fault = url.searchParams.get("fault");
  if (fault !== null) {
    globalThis.__50PICK_CONTACTS_READ_FAULT = fault === "1";
    return NextResponse.json({ ok: true, fault: globalThis.__50PICK_CONTACTS_READ_FAULT });
  }
  if (url.searchParams.get("u22") !== null) {
    return NextResponse.json({ ok: true, ...(await seedU22()) });
  }
  const grant = url.searchParams.get("u23grant");
  if (grant !== null) {
    // ⛔ DEV ONLY (the 404 above): Growth VIEW without ACT for the AUDITOR role, or that view taken away again.
    await setRoleGrant("AUDITOR", "growth", grant === "view-only", false, "dev-seed");
    return NextResponse.json({ ok: true, grant: grant === "view-only" ? "view-only" : "reset" });
  }
  if (url.searchParams.get("u23moved") !== null) {
    return NextResponse.json({ ok: true, ...(await seedU23Moved()) });
  }
  if (url.searchParams.get("u34") !== null) {
    return NextResponse.json({ ok: true, ...(await seedU34()) });
  }
  if (url.searchParams.get("u30") !== null) {
    return NextResponse.json({ ok: true, ...(await seedU30()) });
  }
  const count = Math.max(0, Math.min(200, Number(url.searchParams.get("count") ?? "45") || 0));
  const base = Date.parse("2026-09-01T08:00:00.000Z");
  let created = 0;
  for (let i = 0; i < count; i++) {
    const local = `${PREFIXES[i % PREFIXES.length]}${String(1000000 + i * 7919).slice(-7)}`;
    const parsed = parseTzNumber(local);
    if (parsed.verdict !== "ok" || !parsed.msisdn || !parsed.ndc) continue;
    const at = new Date(base + i * 3_600_000).toISOString();
    const consent = CONSENT[i % CONSENT.length];
    const stoppedAt = i % 11 === 5 ? at : null;
    // ⭐ THE ONE BUILDER (X6): the caches start as "nothing known" and the mirror below writes them from the records.
    const row = await db.marketingContact.create(newContactRow({
      number: parsed,
      rawInput: local,
      displayName: NAMES[i % NAMES.length],
      email: null,
      tags: TAGS[i % TAGS.length],
      notes: null,
      source: SOURCES[i % SOURCES.length],
      sourceRef: null,
      importId: null,
      officerId: null,
      at,
    }, `mc_seed_${String(i).padStart(3, "0")}`));
    if (!row) continue;
    created++;
    if (consent !== "UNKNOWN") await ledgerRow(row.msisdn, "GIVEN");
    if (consent === "WITHDRAWN") await ledgerRow(row.msisdn, "WITHDRAWN");
    if (stoppedAt) {
      await db.suppression.create({
        id: `sup_seed_${row.id}`, channel: "SMS", identifier: row.msisdn, category: "MARKETING",
        reason: "WITHDRAWN", evidence: "dev-seed", recordedBy: null, createdAt: stoppedAt,
        liftedAt: null, liftedReason: null,
      });
    }
    // U24 commit 2 · a writer of the ledger and the stop list mirrors the book like every other — here it WRITES the
    // caches the builder left empty, from the ledger rows and the stop just recorded (`test:contacts-audience` §6).
    await mirrorContactCache(row.msisdn, at);
  }
  return NextResponse.json({ ok: true, created, total: await db.marketingContact.count() });
}

export async function GET(req: Request) {
  return POST(req);
}
