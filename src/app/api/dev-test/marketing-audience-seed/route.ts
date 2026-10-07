/**
 * /api/dev-test/marketing-audience-seed — the world and the two switches of U38b's drive (`qa:marketing-audience`): the
 * campaign composer's audience card, counted.
 *
 * ⛔ 404 IN PRODUCTION, before anything else, like every route under `dev-test/` (`test:cert-devroutes`). It is reachable
 * only where `NODE_ENV` is not `production`, which on this platform means a developer's own machine. It sends nothing:
 * no SMS module is imported, and the count it serves never writes (U38a's guarantee).
 *
 * ⭐ WHY IT EXISTS. The card's states need an audience holding EVERY answer the send gate can give, a list of three for the
 * D19 floor, a count slow enough to photograph its keyed fallback, and a count that fails. ⭐ EVERY RECORD GOES IN THROUGH
 * THE PLATFORM'S OWN WRITERS, so the gate answers each exactly as it will a real one: an account through the user store
 * (as the contact book's seed makes its U22 players), every yes through `recordPlayerMarketingChoice` (the profile
 * switch's writer — the ledger row with its pinned sentence), a withdrawal an officer records through the ledger's ONE
 * writer (`appendMarketingConsent`), a stop through `ensureOptOutToken` + `stopMarketing` (the opt-out link's own path),
 * a break through `coolOff` (the player's own "Take a break"), and the three contacts through the ONE create builder and
 * the ONE mirror. No ledger row, stop or cache is written by hand here.
 *
 *   POST ?world=1    — idempotent (deterministic ids; a re-run writes nothing): thirteen player accounts that JOINED on
 *                      10 Jan 2025 — twelve on TTCL (073), which no other seed uses, and one on Telxer (064), which no
 *                      network serves — one per answer: six who will receive, a break and a minor (protected — ONE line),
 *                      one who never said yes, one who withdrew, one stopped by their link, one with no date of birth,
 *                      and the 064 number nobody can be sent to; and "U38b floor list", three contacts on 0762 000 00N.
 *                      `?pop=players&op=TELXER,TTCL` on the composer is exactly the thirteen. Answers what the drive
 *                      asserts: the ids, the list's id and the expected figures.
 *   POST ?delayMs=N  — hold every audience count N ms before it asks the split (0 clears; at most 15,000) — the keyed
 *                      fallback, "Counting who will receive it…", stays on screen long enough to photograph.
 *   POST ?fault=1|0  — every audience count throws / stops throwing — the card's error and its "Count again".
 */
import { NextResponse } from "next/server";
import { db } from "@/lib/server/store";
import type { StoredUser } from "@/lib/server/store";
import { parseTzNumber } from "@/lib/tz-msisdn";
import { recordPlayerMarketingChoice } from "@/lib/server/marketing/consent";
import { appendMarketingConsent } from "@/lib/server/marketing/consent-ledger";
import { ensureOptOutToken, stopMarketing } from "@/lib/server/marketing/optout-service";
import { coolOff } from "@/lib/server/responsible-gambling";
import { mirrorContactCache } from "@/lib/server/marketing/contact-cache";
import { newContactRow } from "@/lib/server/contacts/contact-write";

const JOINED = "2025-01-10T08:00:00.000Z";
const LIST_ID = "lst_u38b_floor";
const LIST_NAME = "U38b floor list";
const OFFICER = "usr_dev_u38b_seed";

/** What each seeded account is, for the gate. */
type Kind = "will" | "break" | "minor" | "never" | "withdrew" | "stopped" | "no_dob" | "unsendable";
const PLAYERS: ReadonlyArray<{ n: number; phone: string; kind: Kind }> = [
  { n: 1, phone: "+255730000001", kind: "will" },
  { n: 2, phone: "+255730000002", kind: "will" },
  { n: 3, phone: "+255730000003", kind: "will" },
  { n: 4, phone: "+255730000004", kind: "will" },
  { n: 5, phone: "+255730000005", kind: "break" },
  { n: 6, phone: "+255730000006", kind: "minor" },
  { n: 7, phone: "+255730000007", kind: "never" },
  { n: 8, phone: "+255730000008", kind: "withdrew" },
  { n: 9, phone: "+255730000009", kind: "stopped" },
  { n: 10, phone: "+255730000010", kind: "no_dob" },
  { n: 11, phone: "+255730000011", kind: "will" },
  { n: 12, phone: "+255730000012", kind: "will" },
  { n: 13, phone: "+255640000013", kind: "unsendable" },
];
const idOf = (n: number) => `usr_u38b_p${String(n).padStart(2, "0")}`;

/** The figures the composer's card must print for `?pop=players&op=TELXER,TTCL` — counted from the list above, never typed. */
function expected() {
  const c = (k: Kind) => PLAYERS.filter((p) => p.kind === k).length;
  const protectedCount = c("break") + c("minor");
  const notReceiving = c("stopped") + c("never") + c("withdrew") + c("no_dob") + protectedCount;
  return {
    matching: PLAYERS.length,
    willReceive: c("will"),
    unsendable: c("unsendable"),
    notReceiving,
    reasons: { suppressed: c("stopped"), no_consent: c("never"), withdrawn: c("withdrew"), age_unknown: c("no_dob"), protected: protectedCount },
  };
}

/** A date of birth `years` whole years and a fortnight ago — a minor at 16, an adult at 30. */
function bornYearsAgo(years: number): string {
  const d = new Date(Date.now() - 14 * 86_400_000);
  d.setUTCFullYear(d.getUTCFullYear() - years);
  return d.toISOString().slice(0, 10);
}

/** An account as sign-up leaves one (the contact book seed's own shape). ⛔ No wallet: the gate needs the account, not money. */
function playerRow(id: string, phoneE164: string, dob: string | null): StoredUser {
  return {
    id, phoneE164, email: null, passwordHash: null, passwordSalt: null, failedLoginCount: 0, lockedUntil: null,
    role: "PLAYER", status: "ACTIVE", locale: "SW", displayName: null, dob, region: null, acceptedTermsVersion: "v1",
    acceptedTermsAt: JOINED, marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null, emailVerifiedAt: null,
    createdAt: JOINED, updatedAt: JOINED, lastLoginAt: JOINED, closedAt: null,
  };
}

const say = (userId: string, on: boolean) => recordPlayerMarketingChoice({ userId, marketingOptIn: on, locale: "SW" });

/** One account, then its answer — through the writers named in the header. Nothing for an account that already exists. */
async function seedPlayer(p: (typeof PLAYERS)[number]): Promise<boolean> {
  const id = idOf(p.n);
  if (await db.user.findById(id)) return false;
  await db.user.create(playerRow(id, p.phone, p.kind === "minor" ? bornYearsAgo(16) : p.kind === "no_dob" ? null : bornYearsAgo(30)));
  if (p.kind === "never" || p.kind === "unsendable") return true;
  await say(id, true);
  if (p.kind === "withdrew") {
    // ⭐ A withdrawal RECORDED BY AN OFFICER (the bulk bar's own source) while the player's switch stays on — the ledger's
    // latest word is WITHDRAWN, which the gate answers "withdrew consent". (Turning the player's own switch off would be
    // answered "no consent" first: the switch is asked before the ledger.)
    await appendMarketingConsent({
      phoneE164: p.phone, locale: "SW", status: "WITHDRAWN", source: "OPERATOR", site: "PROFILE",
      evidence: "dev-seed: the U38b drive's officer-recorded withdrawal", recordedBy: OFFICER,
    });
  }
  if (p.kind === "break") await coolOff(id, "24h");
  if (p.kind === "stopped") {
    const token = await ensureOptOutToken(p.phone);
    if (token !== null) await stopMarketing(token, "SW");
  }
  return true;
}

/** "U38b floor list" — three contacts through the ONE builder and the ONE mirror, and the list that holds them. */
async function seedFloorList(): Promise<number> {
  const at = JOINED;
  if (!(await db.contactList.find(LIST_ID))) {
    await db.contactList.create({ id: LIST_ID, name: LIST_NAME, description: null, createdAt: at, createdBy: OFFICER, updatedAt: at, updatedBy: OFFICER });
  }
  let members = 0;
  for (const k of [1, 2, 3]) {
    const parsed = parseTzNumber(`076200000${k}`);
    if (parsed.verdict !== "ok" || !parsed.msisdn) continue;
    let row = await db.marketingContact.findByMsisdn(parsed.msisdn);
    if (!row) {
      row = await db.marketingContact.create(newContactRow({
        number: parsed, rawInput: `076200000${k}`, displayName: `Floor ${k}`, email: null, tags: [], notes: null,
        source: "OPERATOR", sourceRef: null, importId: null, officerId: OFFICER, at,
      }, `mc_u38b_floor_${k}`));
      if (row) await mirrorContactCache(row.msisdn, at);
    }
    if (row) {
      await db.contactListMember.add({ listId: LIST_ID, contactId: row.id, addedAt: at, addedBy: OFFICER });
      members++;
    }
  }
  return members;
}

export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ ok: false, error: "Not available" }, { status: 404 });
  }
  const url = new URL(req.url);
  const delay = url.searchParams.get("delayMs");
  if (delay !== null) {
    const ms = Math.max(0, Math.min(15_000, Math.floor(Number(delay) || 0)));
    globalThis.__50PICK_AUDIENCE_COUNT_DELAY_MS = ms;
    return NextResponse.json({ ok: true, delayMs: ms });
  }
  const fault = url.searchParams.get("fault");
  if (fault !== null) {
    globalThis.__50PICK_AUDIENCE_COUNT_FAULT = fault === "1";
    return NextResponse.json({ ok: true, fault: globalThis.__50PICK_AUDIENCE_COUNT_FAULT });
  }
  if (url.searchParams.get("world") !== null) {
    let created = 0;
    for (const p of PLAYERS) if (await seedPlayer(p)) created++;
    const members = await seedFloorList();
    return NextResponse.json({
      ok: true,
      created,
      players: PLAYERS.map((p) => ({ id: idOf(p.n), kind: p.kind })),
      listId: LIST_ID,
      listName: LIST_NAME,
      listMembers: members,
      expected: expected(),
    });
  }
  return NextResponse.json({ ok: false, error: "?world=1 · ?delayMs=<0–15000> · ?fault=1|0" }, { status: 400 });
}

export async function GET(req: Request) {
  return POST(req);
}
