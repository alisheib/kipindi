/**
 * UP & DOWN — THE PER-ROUND BELL ROW (owner decision 2026-08-22).
 *
 *   npm run test:updown-bell
 *
 * ── WHAT THIS GUARDS, AND WHY IT IS BEHAVIOURAL ──────────────────────────────
 *
 * `test:updown-push` reads the SOURCE and proves the call sites exist. That is the weaker
 * half and this repo has been burned by it repeatedly: a symbol present in a file is not a
 * row in a database. This suite DRIVES the emitters against the store and asserts on the
 * rows that come out — the distinction E-37 turned on, where the suppression was deleting
 * messages rather than moving them and every unit test was green throughout.
 *
 * ── THE DECISION THIS ENCODES ────────────────────────────────────────────────
 *
 * 2026-07-24 Ali suppressed per-round Up & Down messages ("forty emails an hour is
 * unusable"). 2026-08-05, shown the measured volume, he reaffirmed *"in-app only — no
 * email, no push, no inbox row"*. 2026-08-22, shown it again (worst observed hour: 20
 * messages to one player; 360/day if a 3-minute chain runs), he chose to put **every**
 * terminal outcome in the bell, with **email still suppressed**.
 *
 * ⛔ ALL FOUR OUTCOMES OR NONE. E-43 is why that is a law and not a preference: refunds
 * once leaked through the suppression while wins and losses did not, so the only outcome a
 * player ever heard about was the one where their money came back unchanged — 56/56 refunds
 * notified against 0/13 wins and 0/11 losses, measured on production.
 *
 * ⛔ THE DEDUPE IS THE SUBTLE ONE. `notify()` treats two byte-identical messages with the
 * same href inside 90 seconds as ONE event. Up & Down settles rounds minutes apart at the
 * same stake, so without a per-round href the second result would be silently swallowed —
 * a player would simply never be told about a round. §3 proves both directions: distinct
 * rounds survive, a genuine repeat of the SAME round is still collapsed.
 */
process.env.SESSION_SECRET ??= "test-only-session-secret-32chars-aaaa";
process.env.OTP_PEPPER ??= "test-only-otp-pepper-16chars";

import { db, type StoredWallet } from "../src/lib/server/store.ts";
import { NOTIFICATION_EMITTERS } from "../src/lib/server/comms-registry.ts";
import * as N from "../src/lib/server/notification-service.ts";

let pass = 0;
const fails: string[] = [];
const ok = (label: string, cond: boolean, extra = "") => {
  if (cond) { pass++; } else { fails.push(`${label}${extra ? ` — ${extra}` : ""}`); }
  return cond;
};
const section = (s: string) => console.log(`\n── ${s} ${"─".repeat(Math.max(0, 62 - s.length))}`);

const nowIso = new Date().toISOString();
let seq = 0;
async function mkUser(id: string): Promise<void> {
  await db.user.create({
    id, phoneE164: `+25579${String(++seq).padStart(7, "0")}`, email: `${id}@test.tz`,
    passwordHash: null, passwordSalt: null, failedLoginCount: 0, lockedUntil: null,
    role: "PLAYER", status: "ACTIVE", locale: "EN", displayName: null, dob: null, region: null,
    acceptedTermsVersion: null, acceptedTermsAt: null, marketingOptIn: false,
    twoFactorEnabled: false, avatarDataUrl: null,
    createdAt: nowIso, updatedAt: nowIso, lastLoginAt: null, closedAt: null,
  } as never);
  await db.wallet.create({ id: `wal_${id}`, userId: id, balance: 100_000, pending: 0, hold: 0, bonusBalance: 0, currency: "TZS", status: "ACTIVE", createdAt: nowIso, updatedAt: nowIso } as StoredWallet);
}

const TITLE = { en: "Bitcoin Up or Down", sw: "Bitcoin Juu au Chini", zh: "比特币涨跌" };
/** One distinct round per outcome — the shape production actually produces. */
const round = (n: string) => ({
  roundHref: `/updown/udr_${n}`,
  pushTag: `updown-result-mkt_${n}`,
  marketTitle: TITLE,
});

// ── §1 · all four outcomes produce a row ───────────────────────────────────────
section("1 · every terminal outcome lands in the bell (E-43's law)");

await mkUser("ud_bell");
const U = "ud_bell";

const OUTCOMES = [
  { name: "win",              kind: "WIN",     row: await N.notifyUpDownWin(U,             { ...round("w1"), stake: 5_000, payout: 8_700, positionId: "pos_w1" }) },
  { name: "loss",             kind: "LOSS",    row: await N.notifyUpDownLoss(U,            { ...round("l1"), stake: 5_000, positionId: "pos_l1" }) },
  { name: "void refund",      kind: "DEPOSIT", row: await N.notifyUpDownRefund(U,          { ...round("v1"), stake: 5_000, positionId: "pos_v1" }) },
  { name: "one-sided refund", kind: "DEPOSIT", row: await N.notifyUpDownOneSidedRefund(U,  { ...round("o1"), stake: 5_000, positionId: "pos_o1" }) },
] as const;

for (const o of OUTCOMES) {
  ok(`§1 ${o.name} produced a row`, o.row !== null,
     "null means the outcome is silent — this is the E-43 shape");
  if (!o.row) continue;
  ok(`§1 ${o.name} is filed under ${o.kind}`, o.row.kind === o.kind, `got ${o.row.kind}`);
  // ⛔ The row must be RETRIEVABLE, not merely returned. A function that hands back an
  // object it never persisted is exactly the failure E-37 hid behind.
  ok(`§1 ${o.name} is actually persisted`,
     (await db.notification.findByUser(U, 200)).some((n) => n.id === o.row!.id));
}

// The registry is what the C3 gate drives, so a missing entry means a silent emitter.
for (const fn of ["notifyUpDownWin", "notifyUpDownLoss", "notifyUpDownRefund", "notifyUpDownOneSidedRefund"]) {
  ok(`§1 ${fn} is registered in comms-registry`, NOTIFICATION_EMITTERS.some((e) => e.fn === fn));
}

// ── §2 · the row leads to THAT round ───────────────────────────────────────────
section("2 · every row deep-links to its own round (E-101)");

for (const o of OUTCOMES) {
  if (!o.row) continue;
  ok(`§2 ${o.name} links into /updown/`, (o.row.href ?? "").startsWith("/updown/"), String(o.row.href));
  // ⛔ NOT the list page. E-101 was `notifyWin` opening `/positions` — the right product by
  // luck, the wrong ROW always. A result row that opens the board tells the player nothing
  // about which round it is talking about.
  ok(`§2 ${o.name} is not the bare board or history`,
     o.row.href !== "/updown" && !(o.row.href ?? "").startsWith("/updown/history"), String(o.row.href));
}
{
  const hrefs = OUTCOMES.map((o) => o.row?.href).filter(Boolean);
  ok("§2 ⭐ the four rounds produced four DISTINCT links", new Set(hrefs).size === hrefs.length, hrefs.join(" · "));
}

// ── §3 · the dedupe cuts the right way ─────────────────────────────────────────
section("3 · dedupe — distinct rounds survive, a true repeat is collapsed");

{
  // Two rounds, same player, same stake, same outcome, seconds apart. This is ordinary
  // Up & Down and it MUST produce two rows. If the href were shared they would collapse
  // into one and a player would never hear about the second round at all.
  const a = await N.notifyUpDownLoss(U, { ...round("dedupe_a"), stake: 2_000, positionId: "pos_da" });
  const b = await N.notifyUpDownLoss(U, { ...round("dedupe_b"), stake: 2_000, positionId: "pos_db" });
  ok("§3 ⭐ two different rounds at the same stake produce two rows",
     a !== null && b !== null && a.id !== b.id, `a=${a?.id} b=${b?.id}`);

  // …and the guard still works in the direction it was built for: a genuine duplicate of
  // the SAME round (a retried settlement, a double fire) is still one event.
  const c = await N.notifyUpDownLoss(U, { ...round("dedupe_a"), stake: 2_000, positionId: "pos_da" });
  ok("§3 ⭐ the SAME round announced twice is still one row",
     c !== null && a !== null && c.id === a.id, `a=${a?.id} c=${c?.id}`);
}

// ── §4 · the words ─────────────────────────────────────────────────────────────
section("4 · trilingual money copy, direct in every language");

for (const o of OUTCOMES) {
  if (!o.row) continue;
  for (const [f, v] of [["titleEn", o.row.titleEn], ["titleSw", o.row.titleSw], ["titleZh", o.row.titleZh],
                        ["bodyEn", o.row.bodyEn], ["bodySw", o.row.bodySw], ["bodyZh", o.row.bodyZh]] as const) {
    ok(`§4 ${o.name}.${f} is present`, typeof v === "string" && v.trim().length > 0);
    ok(`§4 ${o.name}.${f} has no placeholder leak`,
       !String(v ?? "").includes("undefined") && !String(v ?? "").includes("NaN") && !String(v ?? "").includes("[object Object]"),
       String(v ?? "").slice(0, 80));
  }
  ok(`§4 ${o.name}: Chinese is real Chinese`, /[一-鿿]/.test(o.row.titleZh ?? ""));
  ok(`§4 ${o.name}: Swahili is not English`, o.row.bodySw !== o.row.bodyEn);
}

{
  // LCCP harm-prevention: the loss names the amount and is not softened anywhere.
  const loss = OUTCOMES.find((o) => o.name === "loss")!.row!;
  ok("§4 the loss names the stake in EN", /5,000/.test(loss.titleEn));
  ok("§4 …in SW", /5,000/.test(loss.titleSw));
  ok("§4 …and in ZH", /5,000/.test(loss.titleZh ?? ""));

  // 🔴 THE STRING THAT WAS LIVE AND WRONG. `投注失败` means the bet FAILED — never went
  // through — the opposite money consequence from a bet placed and lost. It shipped in the
  // Up & Down loss push until 2026-08-22 while `notifyLoss` carried a comment forbidding it.
  ok("§4 🔴 the ZH loss does NOT say the bet failed", !(loss.titleZh ?? "").includes("投注失败"), String(loss.titleZh));
  ok("§4 🔴 …it says the bet did not win", (loss.titleZh ?? "").includes("投注未中"), String(loss.titleZh));

  // The win states the REALISED payout (E-105), not the stake and not a projection.
  const win = OUTCOMES.find((o) => o.name === "win")!.row!;
  ok("§4 the win states the realised payout", /8,700/.test(win.titleEn), win.titleEn);
}

// ── §5 · what did NOT change ───────────────────────────────────────────────────
section("5 · email stays suppressed — the half of the decision that stands");

{
  // ⛔ Ali's 2026-07-24 objection was FORTY EMAILS an hour and it was never withdrawn. The
  // bell was added; email was not. Asserted at the source of the four call sites, because
  // an email is sent by a different function than the one under test here.
  const { readFileSync } = await import("node:fs");
  const MS = readFileSync(new URL("../src/lib/server/market-service.ts", import.meta.url), "utf8").replace(/\r\n/g, "\n");
  const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, "");
  const code = strip(MS);
  // Control first — an absence check over an empty string passes vacuously.
  ok("§5 control: stripped market-service is still real code",
     code.length > 10_000 && /export async function settleMarket\(/.test(code), `len=${code.length}`);

  // Each Up & Down announcement must not be accompanied by an email in its own branch.
  // Slice from the emitter call to the end of its statement and look for a mail call.
  for (const fn of ["notifyUpDownWin", "notifyUpDownLoss", "notifyUpDownRefund", "notifyUpDownOneSidedRefund"]) {
    const at = code.indexOf(`${fn}(p.userId, {`);
    ok(`§5 ${fn} call site found`, at > 0);
    if (at < 0) continue;
    const window = code.slice(at, at + 600);
    ok(`§5 ${fn} does not also send an email`, !/sendEmailToUser\(/.test(window));
  }
}

// ── §6 · the collapse key survives the move to the bell ────────────────────────
section("6 · the push keeps its PER-ROUND key (money news must not overwrite money news)");

{
  // 🔴 THIS GAP WAS FOUND BY THE RED HARNESS, NOT BY DESIGN. The first version of this
  // suite asserted nothing about the push tag, so `red:updown-bell`'s
  // `push-tag-falls-back-to-kind` mutation ran green — the emitters could have dropped the
  // per-round key and every test would still have passed. Recording it here because the
  // lesson is the reusable part: the mutation found a hole in the guard, which is what a
  // red proof is FOR, and a suite is only as good as the defects it has actually seen.
  //
  // ⚠️ This is a SOURCE assertion and therefore the weaker kind. `notify()` fans the push
  // out through a dynamic import of `push-service` inside a fire-and-forget IIFE, so there
  // is no seam to observe the tag behaviourally without stubbing the module — and a stub
  // would be asserting against the stub. Pinned at the source, with controls, and named
  // honestly rather than dressed up as behavioural.
  const { readFileSync } = await import("node:fs");
  const NS_SRC = readFileSync(new URL("../src/lib/server/notification-service.ts", import.meta.url), "utf8").replace(/\r\n/g, "\n");
  const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, "");
  const code = strip(NS_SRC);

  // Control — an absence/presence check over an emptied string proves nothing.
  ok("§6 control: stripped notification-service is still real code",
     code.length > 10_000 && /export async function notify\(/.test(code), `len=${code.length}`);

  // ① The shared builder must forward the caller's key…
  ok("§6 ⭐ the Up & Down builder forwards its per-round push tag",
     /\}, \{ pushTag: opts\.pushTag \}\);/.test(code));
  // ② …and `notify` must actually use it, falling back to the kind only when absent.
  ok("§6 ⭐ notify() honours an explicit pushTag over the kind default",
     /tag: opts\?\.pushTag \?\? n\.kind/.test(code));
  // ③ The four emitters all route through that one builder, so none can quietly drop it.
  for (const fn of ["notifyUpDownWin", "notifyUpDownLoss", "notifyUpDownRefund", "notifyUpDownOneSidedRefund"]) {
    const body = code.slice(code.indexOf(`export function ${fn}(`), code.indexOf(`export function ${fn}(`) + 700);
    ok(`§6 ${fn} routes through the shared builder`, /notifyUpDownResult\(userId, "/.test(body));
  }
}

const label = "Up & Down bell rows (owner decision 2026-08-22)";
if (fails.length) {
  console.error(`\n${label} — ${pass} passed, ${fails.length} FAILED\n`);
  for (const f of fails) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log(`\n${label} — ${pass} passed, 0 failed`);
