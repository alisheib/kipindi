/**
 * Invite flow — end-to-end + stress (in-memory store; no DATABASE_URL).
 *
 * The full new-player journey the manager will exercise tomorrow:
 *   admin creates a campaign → adds email/phone contacts → sends invites →
 *   invitee registers with the code → bonus lands in their BONUS wallet →
 *   bonus is usable to bet. Plus stress: many concurrent registrations, repeated
 *   binds (idempotency), concurrent double-send, and edge/abuse cases.
 *
 * NOTE: registerWithPassword() itself needs a request context (headers()) so it
 * can't run in a plain script — we drive bindRegistration(), the exact function
 * the registration path calls after creating the user.
 */
import { db, type StoredWallet } from "../src/lib/server/store.ts";
import {
  createCampaign, addContacts, sendCampaign, cancelCampaign,
  bindRegistration, getCampaignDetail,
} from "../src/lib/server/invite-service.ts";
import { setBonusConfig } from "../src/lib/server/bonus-config.ts";
import { createMarket, buyPosition } from "../src/lib/server/market-service.ts";

let pass = 0, fail = 0;
function ok(label: string, cond: boolean, extra?: string) {
  if (cond) { pass++; } else { fail++; console.log(`FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
}
const now = () => new Date().toISOString();
let seq = 0;
async function mkUser(id: string, role = "PLAYER", balance = 0): Promise<void> {
  await db.user.create({
    id, phoneE164: `+25573${String(++seq).padStart(7, "0")}`, passwordHash: null, passwordSalt: null,
    failedLoginCount: 0, lockedUntil: null, role: role as never, status: "ACTIVE", locale: "EN",
    displayName: null, dob: null, region: null, acceptedTermsVersion: null, acceptedTermsAt: null,
    marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null,
    createdAt: now(), updatedAt: now(), lastLoginAt: null, closedAt: null,
  } as never);
  await db.wallet.create({ id: `wal_${id}`, userId: id, balance, pending: 0, hold: 0, bonusBalance: 0, currency: "TZS", status: "ACTIVE", createdAt: now(), updatedAt: now() } as StoredWallet);
}
const bonus = async (uid: string) => (await db.wallet.findByUserId(uid))?.bonusBalance ?? -1;

await mkUser("usr_if_admin", "ADMIN");

// ── 1. END-TO-END happy path ─────────────────────────────────────────────────
{
  const c = await createCampaign({ name: "Manager Test", bonusAmountTzs: 10_000, wagerMultiplier: 5, expiresInDays: 30, messageEn: "Join 50pick", messageSw: "Jiunge" }, "usr_if_admin");
  ok("campaign created", c.ok);
  if (!c.ok) throw new Error("setup failed");
  const cid = c.campaign.id;
  const code = c.campaign.code;

  const add = await addContacts(cid, "alice@example.com\n0712111222\n0713333444,15000", "usr_if_admin");
  ok("3 contacts added", add.ok && add.added === 3, add.ok ? `added=${add.added}` : "no");

  const sent = await sendCampaign(cid, "usr_if_admin");
  ok("send ok (3 sent via stub email + console sms)", sent.ok && sent.sent === 3, sent.ok ? `sent=${sent.sent} failed=${sent.failed}` : "no");
  ok("campaign now SENT", (await getCampaignDetail(cid))?.campaign.status === "SENT");

  // Invitee registers with the code (matches the 0712111222 entry by phone).
  await mkUser("usr_if_invitee");
  const r = await bindRegistration("usr_if_invitee", code, { phone: "+255712111222" });
  ok("bonus granted on register", r?.grantedTzs === 10_000, `granted=${r?.grantedTzs}`);
  ok("bonus wallet credited 10,000", (await bonus("usr_if_invitee")) === 10_000, `bonus=${await bonus("usr_if_invitee")}`);
  const grant = (await db.bonusGrant.listByUser("usr_if_invitee"))[0];
  ok("grant carries campaign multiplier (5×) + req 50,000", grant.wagerMultiplier === 5 && grant.wagerRequiredTzs === 50_000, `mult=${grant.wagerMultiplier} req=${grant.wagerRequiredTzs}`);
  ok("grant has expiry set", !!grant.expiresAt);
  ok("grant source INVITE", grant.source === "INVITE");
  const detail = await getCampaignDetail(cid);
  ok("entry marked REGISTERED", (detail?.counts.REGISTERED ?? 0) === 1);
  ok("campaign totalRegistered = 1", detail?.campaign.totalRegistered === 1, `tr=${detail?.campaign.totalRegistered}`);

  // Bonus is real money the invitee can bet with (proves the wallet works).
  const m = await createMarket({ titleEn: "Invitee market", titleSw: null as unknown as string, category: "macro", sourceUrl: "https://bot.go.tz", resolutionCriterion: "x", resolutionAt: new Date(Date.now() + 7 * 864e5).toISOString(), proposedBy: "t" } as never);
  const bet = await buyPosition("usr_if_invitee", { marketId: m.id, side: "YES", stake: 4_000 });
  ok("invitee can bet with bonus", bet.ok);
  ok("bonus reduced 10,000 → 6,000 after 4,000 bonus bet", (await bonus("usr_if_invitee")) === 6_000, `bonus=${await bonus("usr_if_invitee")}`);

  // Amount-override contact gets the overridden bonus.
  await mkUser("usr_if_override");
  const r2 = await bindRegistration("usr_if_override", code, { phone: "+255713333444" });
  ok("override contact gets TZS 15,000 bonus", r2?.grantedTzs === 15_000 && (await bonus("usr_if_override")) === 15_000, `granted=${r2?.grantedTzs}`);
}

// ── 2. STRESS: many concurrent distinct registrations → exact counter ─────────
{
  const c = await createCampaign({ name: "Mass Launch", bonusAmountTzs: 5_000, wagerMultiplier: 5, expiresInDays: 30, messageEn: "x", messageSw: "y" }, "usr_if_admin");
  if (!c.ok) throw new Error("setup");
  const code = c.campaign.code;
  const N = 40;
  const ids = Array.from({ length: N }, (_, i) => `usr_if_mass_${i}`);
  await Promise.all(ids.map((id) => mkUser(id)));
  // All register at once.
  await Promise.all(ids.map((id) => bindRegistration(id, code)));
  const detail = await getCampaignDetail(c.campaign.id);
  ok(`totalRegistered == ${N} (atomic counter, no lost updates)`, detail?.campaign.totalRegistered === N, `tr=${detail?.campaign.totalRegistered}`);
  let allGotBonus = true;
  for (const id of ids) if ((await bonus(id)) !== 5_000) allGotBonus = false;
  ok("every concurrent invitee got exactly TZS 5,000", allGotBonus);
}

// ── 3. Idempotency under race: same user binds many times → ONE bonus ─────────
{
  const c = await createCampaign({ name: "Idem", bonusAmountTzs: 8_000, messageEn: "x", messageSw: "y" }, "usr_if_admin");
  if (!c.ok) throw new Error("setup");
  await mkUser("usr_if_dup");
  await Promise.all(Array.from({ length: 12 }, () => bindRegistration("usr_if_dup", c.campaign.code)));
  ok("racing re-binds → bonus exactly 8,000 (no double credit)", (await bonus("usr_if_dup")) === 8_000, `bonus=${await bonus("usr_if_dup")}`);
  const grants = await db.bonusGrant.listByUser("usr_if_dup");
  ok("exactly one grant created", grants.length === 1, `grants=${grants.length}`);
  ok("totalRegistered counted once", (await getCampaignDetail(c.campaign.id))?.campaign.totalRegistered === 1);
}

// ── 4. Concurrent double-send does NOT double-deliver ────────────────────────
{
  const c = await createCampaign({ name: "DoubleSend", bonusAmountTzs: 5_000, messageEn: "x", messageSw: "y" }, "usr_if_admin");
  if (!c.ok) throw new Error("setup");
  await addContacts(c.campaign.id, "0719000001\n0719000002\n0719000003", "usr_if_admin");
  const [a, b] = await Promise.all([sendCampaign(c.campaign.id, "usr_if_admin"), sendCampaign(c.campaign.id, "usr_if_admin")]);
  const totalSent = (a.ok ? a.sent : 0) + (b.ok ? b.sent : 0);
  ok("total delivered == 3 across both concurrent sends (no double)", totalSent === 3, `total=${totalSent}`);
  ok("all 3 entries SENT (not re-queued)", (await getCampaignDetail(c.campaign.id))?.counts.SENT === 3);
}

// ── 5. Edge / abuse cases ────────────────────────────────────────────────────
{
  // Cancelled campaign → no bonus.
  const c = await createCampaign({ name: "Cancelled", bonusAmountTzs: 9_000, messageEn: "x", messageSw: "y" }, "usr_if_admin");
  if (!c.ok) throw new Error("setup");
  await cancelCampaign(c.campaign.id, "usr_if_admin");
  await mkUser("usr_if_cancelled");
  const r = await bindRegistration("usr_if_cancelled", c.campaign.code);
  ok("cancelled campaign grants nothing", r === null && (await bonus("usr_if_cancelled")) === 0);

  // Unknown code → no bonus, no throw.
  await mkUser("usr_if_unknown");
  const r2 = await bindRegistration("usr_if_unknown", "NOSUCHCODE");
  ok("unknown code → null, no bonus", r2 === null && (await bonus("usr_if_unknown")) === 0);

  // Bonus program disabled → invite grants nothing (registration would still succeed).
  const c2 = await createCampaign({ name: "Disabled", bonusAmountTzs: 7_000, messageEn: "x", messageSw: "y" }, "usr_if_admin");
  if (!c2.ok) throw new Error("setup");
  setBonusConfig({ enabled: false }, "usr_if_admin");
  await mkUser("usr_if_disabled");
  const r3 = await bindRegistration("usr_if_disabled", c2.campaign.code);
  ok("bonus disabled → no grant", r3 === null && (await bonus("usr_if_disabled")) === 0);
  setBonusConfig({ enabled: true }, "usr_if_admin");
  await mkUser("usr_if_reenabled");
  const r4 = await bindRegistration("usr_if_reenabled", c2.campaign.code);
  ok("re-enabled → grant works again", r4?.grantedTzs === 7_000);
}

console.log(`\ninvite-flow: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
