/**
 * /api/dev-test/marketing-contacts-seed — fill the contact book, for the U20 visual drive.
 *
 * ⛔ 404 IN PRODUCTION, like every other route under `dev-test/` (`test:cert-devroutes`). It is reachable only
 * where `NODE_ENV` is not `production`, which on this platform means a developer's own machine.
 *
 * ⭐ WHY THIS EXISTS AT ALL. Nothing writes a contact yet — the form is U22, the importers U25–U28 — so the
 * list has no populated state to photograph without one. The rows go in through `db.marketingContact.create`,
 * the same store method the importers will call, so the page reads them exactly as it will read real ones.
 * ⭐ AND THE RECORDS BEHIND THEM ARE REAL. `consentState` is only a CACHE of the ledger and `suppressedAt` a
 * mirror of a stop, so a seed that set them alone showed "Consent: Given" beside "Reachable: No consent"
 * (measured on the first drive, 2026-10-01). A GIVEN row gets its ledger GIVEN, a WITHDRAWN row a GIVEN then
 * a WITHDRAWN (through the ledger's one clock — `test:dal-parity` §20 lists this route as a writer), and a
 * suppressed row a real stop, so the page shows what production will.
 *
 *   POST ?count=45     — idempotent: deterministic ids and numbers, a re-run creates nothing new
 *   POST ?fault=1|0    — switch the MEMORY twin's read fault on/off, to photograph the page's error state
 */
import { NextResponse } from "next/server";
import { db } from "@/lib/server/store";
import type { StoredMarketingContact } from "@/lib/server/store";
import { parseTzNumber } from "@/lib/tz-msisdn";
import { ledgerStamp } from "@/lib/server/marketing/ledger-stamp";
import { mirrorContactCache } from "@/lib/server/marketing/contact-cache";

const SEED_WORDING = "Seeded by the U20 drive (dev only).";

async function ledgerRow(identifier: string, status: "GIVEN" | "WITHDRAWN") {
  await db.messagingConsent.create({
    ...ledgerStamp(),
    channel: "SMS",
    identifier,
    category: "MARKETING",
    status,
    source: "IMPORT",
    wording: SEED_WORDING,
    locale: "EN",
    evidence: "dev-seed",
    recordedBy: null,
  });
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
  const count = Math.max(0, Math.min(200, Number(url.searchParams.get("count") ?? "45") || 0));
  const base = Date.parse("2026-09-01T08:00:00.000Z");
  let created = 0;
  for (let i = 0; i < count; i++) {
    const local = `${PREFIXES[i % PREFIXES.length]}${String(1000000 + i * 7919).slice(-7)}`;
    const parsed = parseTzNumber(local);
    if (parsed.verdict !== "ok" || !parsed.msisdn || !parsed.ndc) continue;
    const at = new Date(base + i * 3_600_000).toISOString();
    const row = await db.marketingContact.create({
      id: `mc_seed_${String(i).padStart(3, "0")}`,
      msisdn: parsed.msisdn,
      rawInput: local,
      displayName: NAMES[i % NAMES.length],
      email: null,
      ndc: parsed.ndc,
      operator: null,
      source: SOURCES[i % SOURCES.length],
      sourceRef: null,
      userId: null,
      consentState: CONSENT[i % CONSENT.length],
      suppressedAt: i % 11 === 5 ? at : null,
      tags: TAGS[i % TAGS.length],
      notes: null,
      importId: null,
      createdAt: at,
      createdBy: null,
      updatedAt: at,
      updatedBy: null,
    });
    if (!row) continue;
    created++;
    if (row.consentState !== "UNKNOWN") await ledgerRow(row.msisdn, "GIVEN");
    if (row.consentState === "WITHDRAWN") await ledgerRow(row.msisdn, "WITHDRAWN");
    if (row.suppressedAt) {
      await db.suppression.create({
        id: `sup_seed_${row.id}`, channel: "SMS", identifier: row.msisdn, category: "MARKETING",
        reason: "WITHDRAWN", evidence: "dev-seed", recordedBy: null, createdAt: row.suppressedAt,
        liftedAt: null, liftedReason: null,
      });
    }
    // U24 commit 2 · a writer of the ledger and the stop list mirrors the book like every other — here it
    // answers "unchanged", because the rows above were written to agree (`test:contacts-audience` §6).
    await mirrorContactCache(row.msisdn, at);
  }
  return NextResponse.json({ ok: true, created, total: await db.marketingContact.count() });
}

export async function GET(req: Request) {
  return POST(req);
}
