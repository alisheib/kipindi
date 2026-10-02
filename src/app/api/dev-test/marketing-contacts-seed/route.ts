/**
 * /api/dev-test/marketing-contacts-seed — fill the contact book, for the U20/U21/U22/U23 visual drive.
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
