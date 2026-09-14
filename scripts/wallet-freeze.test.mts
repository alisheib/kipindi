/**
 * THE WALLET FREEZE — a set of reasons, not a flag, driven through the real services.   `npm run test:wallet-freeze`
 *
 *   Run: npx tsx scripts/wallet-freeze.test.mts
 *
 * ⭐ WHAT IS BEING HELD (2026-09-13, docs/COMPLIANCE-DECISIONS.md). Until 2026-09-13 self-exclusion was the only
 * writer of `Wallet.status = FROZEN`, and the officer's "reopen a served self-exclusion" set the wallet straight
 * back to ACTIVE. From that date two more holds exist — a FINAL identity refusal and an officer's own freeze — so
 * `src/lib/server/wallet-freeze.ts` records each hold BY REASON and every lifter removes only its own. This suite
 * proves the model through `addWalletFreeze` / `removeWalletFreeze` / the officer entry points, and proves the
 * freeze is a MONEY control by driving `deposit()`, `withdraw()` and `buyPosition()` into it.
 *
 * ⛔ EVERY REFUSAL HAS AN ACCEPTANCE BESIDE IT, AND EVERY "NOTHING WAS WRITTEN" A COUNT PROVEN ABLE TO MOVE. A
 * negative assertion with no positive on the same path passes vacuously.
 * ⛔ NO `verified-fixtures` IMPORT. The one account that must clear identity (§6, to reach the withdrawal's wallet
 * check) is given an APPROVED row by hand, visibly, so the refusal measured is the freeze and not the gate.
 * ⚠️ `db.wallet` in the memory store keeps whole objects, so it cannot prove the column survives Postgres —
 * `test:dal-parity` §5 holds `freezeReasons` in the Prisma mapper.
 */
import { readFileSync } from "node:fs";
import { db, type StoredWallet } from "../src/lib/server/store.ts";
import {
  addWalletFreeze, removeWalletFreeze, freezeWalletByOfficer, unfreezeWalletByOfficer, OFFICER_FREEZE_REASON_MIN,
} from "../src/lib/server/wallet-freeze.ts";
import { currentFreezeReasons, statusForFreezeReasons } from "../src/lib/wallet-freeze-reasons.ts";
import { deposit, withdraw } from "../src/lib/server/wallet-service.ts";
import { createMarket, buyPosition } from "../src/lib/server/market-service.ts";
import { selfExclude } from "../src/lib/server/responsible-gambling.ts";
import { getAuditForTarget, auditFlush } from "../src/lib/server/audit.ts";
import { decomment } from "./lib/decomment.mts";

let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, extra = "") => {
  if (cond) { pass++; console.log(`PASS ${label}${extra ? ` — ${extra}` : ""}`); }
  else { fail++; console.log(`FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
};
const section = (s: string) => console.log(`\n${s}`);
const now = () => new Date().toISOString();
const settle = async () => { await new Promise((r) => setTimeout(r, 150)); await auditFlush(); };

const OFFICER = "usr_wf_officer";
let seq = 0;
const localOf = new Map<string, string>();

async function account(id: string, wallet: Partial<StoredWallet> = {}, opts: { approved?: boolean } = {}) {
  const local = `74${String(++seq).padStart(7, "0")}`;
  localOf.set(id, local);
  await db.user.create({
    id, phoneE164: `+255${local}`, passwordHash: null, passwordSalt: null, failedLoginCount: 0, lockedUntil: null,
    role: "PLAYER", status: "ACTIVE", locale: "EN", displayName: null, dob: "1990-01-01", region: "TZ",
    acceptedTermsVersion: "v1", acceptedTermsAt: now(), marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null,
    email: `${id}@t.tz`, emailVerifiedAt: now(), createdAt: now(), updatedAt: now(), lastLoginAt: now(), closedAt: null,
  } as never);
  await db.wallet.create({
    id: `wal_${id}`, userId: id, balance: 0, pending: 0, hold: 0, bonusBalance: 0,
    currency: "TZS", status: "ACTIVE", createdAt: now(), updatedAt: now(), ...wallet,
  } as StoredWallet);
  if (opts.approved) {
    await db.kyc.upsert({
      id: `kyc_${id}`, userId: id, status: "APPROVED", rejectReason: null, rejectNote: null,
      idType: "NIDA", idNumber: `199001014${String(seq).padStart(11, "0")}`, idExpiry: null, idVerifiedAt: now(),
      fullName: "Freeze Fixture", dob: "1990-01-01", documents: [], reviewerId: OFFICER, reviewedAt: now(),
      submittedAt: now(), approvedAt: now(), createdAt: now(), updatedAt: now(),
    } as never);
  }
}
const walletOf = async (id: string) => (await db.wallet.findByUserId(id))!;
const rows = (id: string, action: string) => getAuditForTarget("User", id, 10_000).filter((e) => e.action === action).length;
const meta = { actorId: OFFICER, note: "fixture hold" };

await db.user.create({
  id: OFFICER, phoneE164: "+255740000999", passwordHash: null, passwordSalt: null, failedLoginCount: 0, lockedUntil: null,
  role: "COMPLIANCE", status: "ACTIVE", locale: "EN", displayName: "Officer", dob: null, region: null,
  acceptedTermsVersion: null, acceptedTermsAt: null, marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null,
  createdAt: now(), updatedAt: now(), lastLoginAt: null, closedAt: null,
} as never);
await db.wallet.create({
  id: `wal_${OFFICER}`, userId: OFFICER, balance: 0, pending: 0, hold: 0, currency: "TZS", status: "ACTIVE",
  createdAt: now(), updatedAt: now(),
} as StoredWallet);

// ── §1 · a set of reasons; idempotent both ways; FROZEN exactly when a reason stands ─────────────────
section("§1 · add and remove are idempotent, and FROZEN ⇔ at least one reason");
{
  const u = "usr_wf_set";
  await account(u);
  const a1 = await addWalletFreeze(u, "OFFICER", meta);
  await settle();
  ok("1.1 · adding a hold freezes the wallet", a1.ok && a1.changed && a1.status === "FROZEN", JSON.stringify(a1));
  ok("1.2 · control · the instrument sees the one audit row that add wrote", rows(u, "wallet.freeze_added") === 1, `${rows(u, "wallet.freeze_added")}`);
  const a2 = await addWalletFreeze(u, "OFFICER", meta);
  await settle();
  ok("1.3 · ⛔ adding the SAME hold again changes nothing …", a2.ok && !a2.changed, JSON.stringify(a2));
  ok("1.4 · ⛔ …and writes no second audit row", rows(u, "wallet.freeze_added") === 1, `${rows(u, "wallet.freeze_added")}`);

  await addWalletFreeze(u, "IDENTITY_REFUSED", meta);
  const r1 = await removeWalletFreeze(u, "OFFICER", meta);
  ok("1.5 · lifting one of two holds leaves the wallet FROZEN on the other", r1.ok && r1.changed && r1.status === "FROZEN"
    && JSON.stringify(r1.reasons) === JSON.stringify(["IDENTITY_REFUSED"]), JSON.stringify(r1));
  await settle();
  const removedOnce = rows(u, "wallet.freeze_removed");
  const r2 = await removeWalletFreeze(u, "OFFICER", meta);
  await settle();
  ok("1.6 · ⛔ lifting a hold that does not stand changes nothing and writes nothing",
    r2.ok && !r2.changed && removedOnce === 1 && rows(u, "wallet.freeze_removed") === 1, `${JSON.stringify(r2)} · rows ${removedOnce}→${rows(u, "wallet.freeze_removed")}`);
  const r3 = await removeWalletFreeze(u, "IDENTITY_REFUSED", meta);
  const w = await walletOf(u);
  ok("1.7 · lifting the LAST hold makes the wallet ACTIVE, and the stored row agrees",
    r3.ok && r3.status === "ACTIVE" && w.status === "ACTIVE" && (w.freezeReasons ?? []).length === 0, `${w.status} · ${JSON.stringify(w.freezeReasons)}`);
  ok("1.8 · the rule itself: [] → ACTIVE, one reason → FROZEN, whatever the wallet said before",
    statusForFreezeReasons("FROZEN", []) === "ACTIVE" && statusForFreezeReasons("ACTIVE", ["OFFICER"]) === "FROZEN");
}

// ── §2 · CLOSED is terminal ──────────────────────────────────────────────────────────────────────────
section("§2 · a CLOSED wallet is never re-opened by a freeze or an unfreeze");
{
  const u = "usr_wf_closed";
  await account(u, { status: "CLOSED", freezeReasons: ["OFFICER"] });
  const r = await removeWalletFreeze(u, "OFFICER", meta);
  ok("2.1 · ⛔ lifting the last hold on a CLOSED wallet leaves it CLOSED", r.ok && r.status === "CLOSED" && (await walletOf(u)).status === "CLOSED", JSON.stringify(r));
  const a = await addWalletFreeze(u, "SELF_EXCLUSION", meta);
  ok("2.2 · ⛔ adding a hold to a CLOSED wallet leaves it CLOSED (not FROZEN)", a.ok && a.status === "CLOSED" && (await walletOf(u)).status === "CLOSED", JSON.stringify(a));
  ok("2.3 · control · the same lift on an open wallet does re-open it (§1.7), so 2.1 is not vacuous",
    statusForFreezeReasons("FROZEN", []) === "ACTIVE" && statusForFreezeReasons("CLOSED", []) === "CLOSED");
}

// ── §3 · a wallet frozen before the column existed ───────────────────────────────────────────────────
section("§3 · a legacy FROZEN wallet with no reasons reads as a self-exclusion");
{
  const u = "usr_wf_legacy";
  await account(u, { status: "FROZEN" }); // no freezeReasons at all — a row written before 2026-09-13
  const w = await walletOf(u);
  ok("3.1 · fixture · the row really carries no reasons", w.status === "FROZEN" && w.freezeReasons === undefined, JSON.stringify(w.freezeReasons));
  ok("3.2 · it reads as SELF_EXCLUSION — the only writer of FROZEN there was", JSON.stringify(currentFreezeReasons(w)) === JSON.stringify(["SELF_EXCLUSION"]), JSON.stringify(currentFreezeReasons(w)));
  ok("3.3 · control · an ACTIVE wallet with no reasons reads as none", currentFreezeReasons({ status: "ACTIVE", freezeReasons: [] }).length === 0);
  const off = await unfreezeWalletByOfficer(OFFICER, u, "Officer attempting to lift a legacy hold");
  ok("3.4 · ⛔ an officer's unfreeze does not lift it, and says what the wallet IS held for",
    !off.ok && /Self-exclusion/.test(off.error) && (await walletOf(u)).status === "FROZEN", JSON.stringify(off));
  const a = await addWalletFreeze(u, "OFFICER", meta);
  ok("3.5 · adding a hold keeps the legacy reason explicit beside it", a.ok && JSON.stringify(a.reasons) === JSON.stringify(["SELF_EXCLUSION", "OFFICER"]), JSON.stringify(a));
}

// ── §4 · reopening a served self-exclusion lifts THAT hold and no other ─────────────────────────────
section("§4 · lifting a served self-exclusion does NOT lift an officer's freeze or an identity refusal");
{
  const u = "usr_wf_selfex";
  await account(u);
  await selfExclude(u, "24h");
  ok("4.0 · fixture · the real self-exclusion wrote its hold", JSON.stringify(currentFreezeReasons(await walletOf(u))) === JSON.stringify(["SELF_EXCLUSION"]), JSON.stringify((await walletOf(u)).freezeReasons));
  await freezeWalletByOfficer(OFFICER, u, "Suspicious deposit pattern under review");
  await addWalletFreeze(u, "IDENTITY_REFUSED", meta);
  // The one wallet write `restorePlayerAction` makes when it reopens a served exclusion (asserted by source below).
  const r = await removeWalletFreeze(u, "SELF_EXCLUSION", { actorId: OFFICER, note: "served", ref: { via: "rg.self_exclusion.reopened" } });
  const w = await walletOf(u);
  ok("4.1 · ⛔ the wallet stays FROZEN with the officer's and the identity hold standing",
    r.ok && w.status === "FROZEN" && JSON.stringify([...currentFreezeReasons(w)].sort()) === JSON.stringify(["IDENTITY_REFUSED", "OFFICER"]), `${w.status} · ${JSON.stringify(w.freezeReasons)}`);
  const lonely = "usr_wf_selfex_only";
  await account(lonely);
  await selfExclude(lonely, "24h");
  await removeWalletFreeze(lonely, "SELF_EXCLUSION", { actorId: OFFICER, note: "served" });
  ok("4.2 · control · the same lift on a wallet held ONLY for self-exclusion re-opens it", (await walletOf(lonely)).status === "ACTIVE", (await walletOf(lonely)).status);

  const src = decomment(readFileSync(new URL("../src/app/admin/players/[id]/actions.ts", import.meta.url), "utf8"));
  const at = src.indexOf("export async function restorePlayerAction");
  const body = at < 0 ? "" : src.slice(at, src.indexOf("\nexport ", at + 10));
  const writesWalletDirectly = (s: string) => /db\.wallet\.(update|adjust)\s*\(/.test(s);
  ok("4.3 · restorePlayerAction is found — the checks below read something", body.length > 800, `${body.length} chars`);
  ok("4.4 · ⛔ restorePlayerAction lifts only the SELF_EXCLUSION reason …", /removeWalletFreeze\(\s*userId,\s*"SELF_EXCLUSION"/.test(body));
  ok("4.5 · ⛔ …and never writes the wallet row itself", !writesWalletDirectly(body));
  ok("4.6 · control · the pre-2026-09-13 shape is caught", writesWalletDirectly(`if (w) await db.wallet.update(w.id, { status: "ACTIVE" });`));
}

// ── §5 · the officer's own lever: never on themselves, never without a reason ────────────────────────
section("§5 · an officer cannot freeze themselves, and must write a reason");
{
  const selfBefore = rows(OFFICER, "wallet.freeze.self_blocked");
  const s = await freezeWalletByOfficer(OFFICER, OFFICER, "Freezing my own wallet for a test");
  const s2 = await unfreezeWalletByOfficer(OFFICER, OFFICER, "Unfreezing my own wallet for a test");
  await settle();
  ok("5.1 · ⛔ an officer's freeze of their OWN wallet is refused, and so is the unfreeze", !s.ok && !s2.ok, `${JSON.stringify(s)} · ${JSON.stringify(s2)}`);
  ok("5.2 · …the wallet did not move", (await walletOf(OFFICER)).status === "ACTIVE", (await walletOf(OFFICER)).status);
  ok("5.3 · …and both attempts are SECURITY facts", rows(OFFICER, "wallet.freeze.self_blocked") === selfBefore + 2, `${selfBefore}→${rows(OFFICER, "wallet.freeze.self_blocked")}`);

  const u = "usr_wf_reason";
  await account(u);
  const short = "x".repeat(OFFICER_FREEZE_REASON_MIN - 1);
  const r1 = await freezeWalletByOfficer(OFFICER, u, short);
  const r2 = await freezeWalletByOfficer(OFFICER, u, `   ${short}   `);
  await settle();
  ok(`5.4 · ⛔ a reason under ${OFFICER_FREEZE_REASON_MIN} characters is refused, padded or not`, !r1.ok && !r2.ok, `${JSON.stringify(r1)} · ${JSON.stringify(r2)}`);
  ok("5.5 · …with nothing frozen and nothing written", (await walletOf(u)).status === "ACTIVE" && rows(u, "wallet.freeze_added") === 0);
  const r3 = await freezeWalletByOfficer(OFFICER, u, "x".repeat(OFFICER_FREEZE_REASON_MIN));
  await settle();
  ok(`5.6 · control · exactly ${OFFICER_FREEZE_REASON_MIN} characters is accepted, and is a COMPLIANCE fact`,
    r3.ok && (await walletOf(u)).status === "FROZEN" && getAuditForTarget("User", u).some((e) => e.action === "wallet.freeze_added" && e.category === "COMPLIANCE"), JSON.stringify(r3));
  const none = await freezeWalletByOfficer(OFFICER, "usr_wf_nobody", "A player that does not exist");
  ok("5.7 · a player with no wallet is NOT_FOUND, never a silent success", !none.ok && none.code === "NOT_FOUND", JSON.stringify(none));
}

// ── §6 · the freeze is a money control, in both directions and on the stake path ────────────────────
section("§6 · a frozen wallet refuses deposit, withdrawal and bet — and the same calls succeed once lifted");
{
  const u = "usr_wf_money";
  await account(u, { balance: 100_000 }, { approved: true });
  const market = await createMarket({
    titleEn: "Wallet freeze market", titleSw: "Soko la kufungia", category: "macro",
    sourceUrl: "https://bot.go.tz", resolutionCriterion: "Resolves at the official date.",
    resolutionAt: new Date(Date.now() + 7 * 864e5).toISOString(), proposedBy: "test",
  } as never);
  const f = await freezeWalletByOfficer(OFFICER, u, "Holding money movement pending review");
  ok("6.0 · fixture · the officer froze the wallet", f.ok && (await walletOf(u)).status === "FROZEN", JSON.stringify(f));
  const txnsBefore = (await db.txn.listForUser(u)).length;

  const d = await deposit(u, { provider: "MPESA", amount: 50_000, msisdn: "712345678" });
  ok("6.1 · ⛔ deposit refused on the frozen wallet", !d.ok && d.code === "SUSPENDED", JSON.stringify(d));
  const w = await withdraw(u, { provider: "MPESA", amount: 20_000, msisdn: localOf.get(u)! } as never);
  ok("6.2 · ⛔ withdrawal refused on the frozen wallet — by the freeze, not the identity gate",
    !w.ok && w.code === "SUSPENDED" && !/^kyc_/.test((w as { reason?: string }).reason ?? ""), JSON.stringify(w));
  const b = await buyPosition(u, { marketId: market.id, side: "YES", stake: 5_000 });
  ok("6.3 · ⛔ bet refused through the real buyPosition, as wallet_frozen", !b.ok && (b as { reason?: string }).reason === "wallet_frozen", JSON.stringify(b));
  const after = await walletOf(u);
  ok("6.4 · ⛔ nothing moved and no transaction was written",
    after.balance === 100_000 && after.hold === 0 && (await db.txn.listForUser(u)).length === txnsBefore, `balance ${after.balance} · hold ${after.hold} · txns ${txnsBefore}→${(await db.txn.listForUser(u)).length}`);

  const lift = await unfreezeWalletByOfficer(OFFICER, u, "Review complete, nothing found");
  ok("6.5 · fixture · the officer lifted their own freeze", lift.ok && lift.status === "ACTIVE", JSON.stringify(lift));
  const d2 = await deposit(u, { provider: "MPESA", amount: 50_000, msisdn: "712345678" });
  const b2 = await buyPosition(u, { marketId: market.id, side: "YES", stake: 5_000 });
  const w2 = await withdraw(u, { provider: "MPESA", amount: 20_000, msisdn: localOf.get(u)! } as never);
  ok("6.6 · control · the same deposit goes through once lifted", d2.ok, JSON.stringify(d2));
  ok("6.7 · control · the same bet goes through once lifted", b2.ok, JSON.stringify(b2));
  ok("6.8 · control · the same withdrawal goes through once lifted", w2.ok, JSON.stringify(w2));
}

console.log(`\nwallet-freeze: ${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
