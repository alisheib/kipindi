/**
 * `/notifications` — the screen that holds what the bell cannot.
 *
 *   npm run test:notifications-page
 *
 * ── WHAT THIS GUARDS ─────────────────────────────────────────────────────────
 *
 * The bell shows the newest 30 rows, ordered purely by time, with no priority by kind. Once
 * Up & Down began writing a row per settled round (E-178) a player could push a SECURITY
 * alert or a KYC decision out of it — 20 rows to one player in an hour, measured on
 * production. This screen is the door with no window, and these are the properties that make
 * it worth trusting.
 *
 * ⭐ MOSTLY BEHAVIOURAL, ON PURPOSE. A source scan can prove a filter EXISTS; only driving it
 * proves the filter RETURNS the right rows. This repo has shipped the other kind repeatedly —
 * a guard that matched a symbol and asserted nothing about a value. §1 and §7 are the two
 * that must read source (an import graph and a width tier are not runtime values), and they
 * say so.
 */
process.env.SESSION_SECRET ??= "test-only-session-secret-32chars-aaaa";
process.env.OTP_PEPPER ??= "test-only-otp-pepper-16chars";

import { readFileSync } from "node:fs";
import { db, type StoredNotification, type StoredWallet } from "../src/lib/server/store.ts";
import { pageForUser, restore } from "../src/lib/server/notification-service.ts";
import { MONEY_KINDS } from "../src/lib/server/comms-registry.ts";
import { ACCOUNT_FILTER_KINDS, NOTIFICATION_FILTERS } from "../src/lib/notification-filters.ts";

let pass = 0;
const fails: string[] = [];
const ok = (label: string, cond: boolean, extra = "") => {
  if (cond) { pass++; } else { fails.push(`${label}${extra ? ` — ${extra}` : ""}`); }
  return cond;
};
const section = (s: string) => console.log(`\n── ${s} ${"─".repeat(Math.max(0, 60 - s.length))}`);
const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8").replace(/\r\n/g, "\n");
/** ⛔ Absence checks read COMMENT-STRIPPED source — a comment explaining a ban contains the
 *  banned words, and this repo has reddened a correct tree that way more than once. */
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, "");

const PANEL = "src/components/layout/notifications-panel.tsx";
const PAGE = "src/app/notifications/page.tsx";
const LOADING = "src/app/notifications/loading.tsx";
const APPEARANCE = "src/lib/notification-appearance.ts";

// ── §1 · one home for how a kind looks ─────────────────────────────────────────
section("1 · the bell and the page render one row, from one place");
{
  const app = read(APPEARANCE);
  const panel = read(PANEL);
  const page = read(PAGE);
  const panelCode = strip(panel);
  const pageCode = strip(page);

  // Control first: an absence check over an emptied string passes over nothing.
  ok("§1 control: stripped sources are still real code",
     panelCode.length > 5_000 && pageCode.length > 2_000 && /export function NotificationsPanel/.test(panelCode),
     `panel=${panelCode.length} page=${pageCode.length}`);

  ok("§1 the appearance module exports both maps",
     /export const iconFor/.test(app) && /export const tintFor/.test(app));
  ok("§1 the bell imports them", /from "@\/lib\/notification-appearance"/.test(panelCode));
  ok("§1 the page imports them", /from "@\/lib\/notification-appearance"/.test(pageCode));

  // ⭐ THE ONE THAT MATTERS. A second map is how a win comes to be gold in the bell and grey
  // on the page — the same drift that left the Chinese loss string wrong in one of two
  // copies for three weeks (E-179).
  ok("§1 ⭐ the bell declares no map of its own",
     !/const iconFor\s*=/.test(panelCode) && !/const tintFor\s*=/.test(panelCode));
  ok("§1 ⭐ the page declares no map of its own",
     !/const iconFor\s*=/.test(pageCode) && !/const tintFor\s*=/.test(pageCode));
}

// ── §2 · the lenses ────────────────────────────────────────────────────────────
section("2 · every lens returns the rows it claims (driven, not read)");

const nowIso = new Date().toISOString();
let seq = 0;
async function mkUser(id: string): Promise<void> {
  await db.user.create({
    id, phoneE164: `+25576${String(++seq).padStart(7, "0")}`, email: `${id}@test.tz`,
    passwordHash: null, passwordSalt: null, failedLoginCount: 0, lockedUntil: null,
    role: "PLAYER", status: "ACTIVE", locale: "EN", displayName: null, dob: null, region: null,
    acceptedTermsVersion: null, acceptedTermsAt: null, marketingOptIn: false,
    twoFactorEnabled: false, avatarDataUrl: null,
    createdAt: nowIso, updatedAt: nowIso, lastLoginAt: null, closedAt: null,
  } as never);
  await db.wallet.create({ id: `wal_${id}`, userId: id, balance: 0, pending: 0, hold: 0, bonusBalance: 0, currency: "TZS", status: "ACTIVE", createdAt: nowIso, updatedAt: nowIso } as StoredWallet);
}

await mkUser("np_player");
await mkUser("np_other");
const U = "np_player";

/** Seeded rows, with the shape production actually produces. */
let made = 0;
async function seed(userId: string, kind: string, opts: { read?: boolean; cleared?: boolean } = {}) {
  made++;
  const n: StoredNotification = {
    id: `ntf_np_${String(made).padStart(3, "0")}`,
    userId, kind: kind as never,
    titleEn: `T${made}`, titleSw: `T${made}sw`, titleZh: `T${made}zh`,
    bodyEn: `B${made}`, bodySw: `B${made}sw`, bodyZh: `B${made}zh`,
    href: `/updown/udr_${made}`,
    readAt: opts.read ? nowIso : null,
    dismissedAt: opts.cleared ? nowIso : null,
    // ⛔ Distinct, ASCENDING createdAt per row — equal timestamps make "newest first"
    // ambiguous and a pagination test built on an ambiguous order proves nothing.
    createdAt: new Date(Date.parse(nowIso) + made * 1000).toISOString(),
  } as StoredNotification;
  await db.notification.create(n);
  return n;
}

await seed(U, "WIN");                        // money, unread
await seed(U, "LOSS", { read: true });       // money, read
await seed(U, "DEPOSIT");                    // money, unread
// ⛔ WITHDRAW EXISTS IN THIS FIXTURE ON PURPOSE. It is the one kind that could plausibly be
// filed under BOTH money and account, so it is the only row that can prove the two lenses do
// not overlap. Without it `money-and-account-overlap` mutated a population it could not
// affect and the suite stayed green — a control that cannot fail is not a control.
await seed(U, "WITHDRAW");                   // money, unread — the overlap probe
await seed(U, "KYC");                        // account, unread
await seed(U, "SECURITY", { read: true });   // account, read
await seed(U, "RG");                         // account, unread
await seed(U, "WATCHLIST", { read: true });  // neither lens
await seed(U, "ROUND_RESULT");               // neither lens, unread
await seed(U, "WIN", { cleared: true });     // CLEARED
await seed(U, "KYC", { cleared: true });     // CLEARED
await seed("np_other", "WIN");               // ⛔ another player's row — must never appear

const get = (filter: string, page = 1, perPage = 50) =>
  pageForUser({ userId: U, filter: filter as never, sort: "newest", page, perPage });

{
  const all = await get("all");
  const cleared = await get("cleared");
  const unread = await get("unread");
  const money = await get("money");
  const account = await get("account");

  ok("§2 all excludes dismissed rows", all.items.every((n) => !n.dismissedAt), `${all.total}`);
  ok("§2 all excludes other players' rows", all.items.every((n) => n.userId === U));
  ok("§2 ⭐ cleared shows ONLY dismissed rows",
     cleared.total > 0 && cleared.items.every((n) => !!n.dismissedAt), `${cleared.total}`);

  // ⛔ Disjoint AND exhaustive: `all + cleared` is the player's whole history, and a row in
  // both would read as two events — the duplicate-notification shape that shipped once
  // already (28 byte-identical rows on production).
  const allIds = new Set(all.items.map((n) => n.id));
  const clearedIds = new Set(cleared.items.map((n) => n.id));
  ok("§2 ⭐ all and cleared never overlap",
     [...clearedIds].every((id) => !allIds.has(id)));
  ok("§2 ⭐ all + cleared is the whole history",
     allIds.size + clearedIds.size === made - 1, `${allIds.size}+${clearedIds.size} vs ${made - 1}`);

  ok("§2 unread is a subset of all", unread.items.every((n) => allIds.has(n.id)));
  ok("§2 unread rows are actually unread", unread.items.every((n) => !n.readAt));
  ok("§2 money is a subset of all", money.items.every((n) => allIds.has(n.id)));
  ok("§2 money holds only money kinds",
     money.items.every((n) => (MONEY_KINDS as readonly string[]).includes(n.kind as string)),
     money.items.map((n) => n.kind).join(","));
  ok("§2 account is a subset of all", account.items.every((n) => allIds.has(n.id)));
  ok("§2 account holds only account/security kinds",
     account.items.every((n) => (ACCOUNT_FILTER_KINDS as readonly string[]).includes(n.kind as string)),
     account.items.map((n) => n.kind).join(","));
  // ⚠️ The two kind lenses must not overlap, or a pill's count cannot be read as a number of
  // things — see `notification-filters.ts` on why WITHDRAW lives in money alone.
  const moneyIds = new Set(money.items.map((n) => n.id));
  ok("§2 ⭐ money and account never overlap",
     account.items.every((n) => !moneyIds.has(n.id)));
}

// ── §3 · the counts ────────────────────────────────────────────────────────────
section("3 · every pill's count equals what its page returns");
{
  const all = await get("all");
  for (const f of NOTIFICATION_FILTERS) {
    const r = await get(f);
    // ⛔ FilterPill: "Omit where no honest count exists. Never invent one — A-5." So the
    // number on the pill must BE the number of rows that lens holds.
    ok(`§3 counts.${f} equals the ${f} total`, all.counts[f] === r.total, `${all.counts[f]} vs ${r.total}`);
  }
}

// ── §4 · pagination ────────────────────────────────────────────────────────────
section("4 · paging drops nothing and repeats nothing");
{
  const full = await get("all", 1, 100);
  const seen: string[] = [];
  const perPage = 3;
  const pages = Math.ceil(full.total / perPage);
  for (let p = 1; p <= pages; p++) {
    const r = await get("all", p, perPage);
    ok(`§4 page ${p} is within its size`, r.items.length <= perPage);
    seen.push(...r.items.map((n) => n.id));
  }
  ok("§4 ⭐ every row appears exactly once across the pages",
     seen.length === full.total && new Set(seen).size === full.total,
     `${seen.length} seen, ${new Set(seen).size} unique, ${full.total} total`);
  ok("§4 the walked order matches the single-page order",
     seen.join(",") === full.items.map((n) => n.id).join(","));

  // Sort actually reverses, rather than being accepted and ignored.
  const oldest = await pageForUser({ userId: U, filter: "all", sort: "oldest", page: 1, perPage: 100 });
  ok("§4 ⭐ oldest-first is the reverse of newest-first",
     oldest.items.map((n) => n.id).join(",") === [...full.items].reverse().map((n) => n.id).join(","));

  // A page past the end is empty, not a crash and not a wrapped first page.
  const far = await get("all", 999, perPage);
  ok("§4 a page past the end is empty", far.items.length === 0 && far.total === full.total);
}

// ── §5 · restore ───────────────────────────────────────────────────────────────
section("5 · restore is the undo for CLEAR ALL, and it is owner-scoped");
{
  const clearedBefore = await get("cleared");
  const victim = clearedBefore.items[0];
  ok("§5 fixture: something is cleared", !!victim);

  // ⛔ THE SECURITY HALF. A notification id alone is not proof of ownership.
  const stolen = await restore(victim.id, "np_other");
  ok("§5 ⭐ another player cannot restore it", stolen === null);
  const stillCleared = await get("cleared");
  ok("§5 ⭐ …and it is still cleared afterwards",
     stillCleared.items.some((n) => n.id === victim.id));

  const mine = await restore(victim.id, U);
  ok("§5 the owner can restore it", mine !== null && !mine.dismissedAt);
  const after = await get("cleared");
  ok("§5 it leaves the cleared lens", !after.items.some((n) => n.id === victim.id));
  const back = await get("all");
  ok("§5 ⭐ and comes back into all — the record is not lost",
     back.items.some((n) => n.id === victim.id));
}

// ── §6 · the bell's count is the server's ──────────────────────────────────────
section("6 · the unread count cannot saturate at the list cap");
{
  const panel = strip(read(PANEL));
  // 🔴 This read `items.filter(n => !n.readAt).length`, and `items` is capped at 30 — so a
  // player with 40 unread saw 30. The action had been computing the honest count and
  // discarding it on the next line.
  ok("§6 ⭐ the panel takes the count from the server", /serverUnread/.test(panel));
  ok("§6 ⭐ …and the fetch actually returns one",
     /unread: await unreadCount\(session\.userId\)/.test(read("src/app/_actions/notifications.ts")));
  ok("§6 the strip and the badge render the same value",
     (panel.match(/const unread = serverUnread \?\?/g) ?? []).length === 1);
}

// ── §7 · the measure ───────────────────────────────────────────────────────────
section("7 · B7 — the page states its width once, and its skeleton agrees");
{
  const page = strip(read(PAGE));
  const loading = strip(read(LOADING));
  ok("§7 the page uses PageContainer, not a hand-typed width",
     /<PageContainer tier="reading"/.test(page) && !/max-w-\[/.test(page));
  // ⛔ B7 rule 3 — a page and its loading.tsx state the SAME tier. `reading` is 1080.
  ok("§7 ⭐ the skeleton states the same tier", /width=\{1080\}/.test(loading), loading.slice(0, 120));
}

const label = "notifications page (the door the bell cannot be)";
if (fails.length) {
  console.error(`\n${label} — ${pass} passed, ${fails.length} FAILED\n`);
  for (const f of fails) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log(`\n${label} — ${pass} passed, 0 failed`);
