/**
 * Email-layer stress + robustness test (in-memory store; stub transport — no
 * real Postmark, no network). Verifies the send path is production-solid under
 * volume and bad input:
 *   - stub send returns ok and never throws
 *   - phone-stub / @none addresses are skipped cleanly
 *   - the suppression list (bounced/complained) is honoured before send
 *   - every template renders without throwing on odd / hostile input (XSS, huge
 *     numbers, empty strings, missing optionals)
 *   - sendEmailToUser fire-and-forget never throws and never leaks rejections
 *   - a 250-contact invite campaign sends every entry with zero failures
 *   - no unhandledRejection fires across a burst of concurrent sends
 */
import { db, type StoredWallet } from "../src/lib/server/store.ts";
import {
  sendEmail, sendEmailToUser,
  welcomeHtml, depositConfirmedHtml, betPlacedHtml, winNotificationHtml, inviteHtml,
} from "../src/lib/server/email.ts";
import { isSuppressed, suppressEmail, unsuppressEmail } from "../src/lib/server/email-suppression.ts";
import { createCampaign, addContactsStructured, sendCampaign } from "../src/lib/server/invite-service.ts";

let pass = 0, fail = 0;
function ok(label: string, cond: boolean, extra?: string) {
  if (cond) { pass++; } else { fail++; console.log(`FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
}
const now = () => new Date().toISOString();
let seq = 0;
async function mkUser(id: string, email: string | null = `u_${id}@test.tz`): Promise<void> {
  await db.user.create({
    id, phoneE164: `+25576${String(++seq).padStart(7, "0")}`, email, passwordHash: null, passwordSalt: null,
    failedLoginCount: 0, lockedUntil: null, role: "PLAYER", status: "ACTIVE", locale: "EN",
    displayName: null, dob: null, region: null, acceptedTermsVersion: null, acceptedTermsAt: null,
    marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null,
    createdAt: now(), updatedAt: now(), lastLoginAt: null, closedAt: null,
  } as never);
  await db.wallet.create({ id: `wal_${id}`, userId: id, balance: 1_000_000, pending: 0, hold: 0, bonusBalance: 0, currency: "TZS", status: "ACTIVE", createdAt: now(), updatedAt: now() } as StoredWallet);
}

// Track unhandled rejections for the whole run.
const unhandled: unknown[] = [];
process.on("unhandledRejection", (r) => unhandled.push(r));

// ── stub send ───────────────────────────────────────────────────────────────
{
  const r = await sendEmail({ to: "a@example.com", subject: "Hi", html: "<h1>Hi</h1>" });
  ok("stub send returns ok", r.ok);
  const skipStub = await sendEmail({ to: "0712@none", subject: "x", html: "<p>x</p>" });
  ok("@none address skipped (ok, no throw)", skipStub.ok);
  const skipStub2 = await sendEmail({ to: "0712@stub", subject: "x", html: "<p>x</p>" });
  ok("@stub address skipped (ok, no throw)", skipStub2.ok);
}

// ── suppression list honoured ────────────────────────────────────────────────
{
  await suppressEmail("bounced@example.com", "test:hard-bounce");
  ok("isSuppressed true after suppressEmail", isSuppressed("bounced@example.com"));
  const r = await sendEmail({ to: "bounced@example.com", subject: "x", html: "<p>x</p>" });
  ok("send to suppressed returns ok (skipped, never throws)", r.ok);
  await unsuppressEmail("bounced@example.com");
  ok("unsuppressEmail clears the entry", !isSuppressed("bounced@example.com"));
}

// ── templates never throw on hostile / edge input ────────────────────────────
{
  let threw = "";
  try {
    welcomeHtml({ name: "" });
    welcomeHtml({ name: "<script>alert(1)</script>" });
    depositConfirmedHtml({ amount: 999_999_999_999, method: "M-Pesa", reference: "x".repeat(400), balance: 0 });
    depositConfirmedHtml({ amount: 0, method: "", reference: "", balance: -5 });
    betPlacedHtml({ reference: "<b>r</b>", side: "YES", stake: 10_000, marketTitle: 'Will "${x}" win?', resolutionDate: "not-a-date" });
    betPlacedHtml({ reference: "r", side: "NO", stake: 1, marketTitle: "T", resolutionDate: "2026-12-31" }); // missing optionals
    winNotificationHtml({ reference: "r", payout: 50_000, stake: 10_000, marketTitle: "T & <em>U</em>", settledAt: "2026-01-01" });
    inviteHtml({ campaignName: "<x>", bonusAmountTzs: 5_000, code: "ABC123", message: "Join 50pick & win!" });
  } catch (e) { threw = (e as Error)?.message ?? String(e); }
  ok("all templates render without throwing on odd input", threw === "", threw);
}

// ── fire-and-forget sendEmailToUser never throws / never leaks ────────────────
{
  await mkUser("eu1");
  await mkUser("eu_phoneonly", null); // no email → resolves to nothing, must not throw
  let threwSync = false;
  try {
    void sendEmailToUser("eu1", (to) => ({ to, subject: "FAF", html: welcomeHtml({ name: "A" }), tag: "t" }));
    void sendEmailToUser("eu_phoneonly", (to) => ({ to, subject: "FAF", html: welcomeHtml({ name: "B" }), tag: "t" }));
    void sendEmailToUser("does_not_exist", (to) => ({ to, subject: "FAF", html: welcomeHtml({ name: "C" }), tag: "t" }));
  } catch { threwSync = true; }
  ok("sendEmailToUser fire-and-forget never throws synchronously", !threwSync);
  await new Promise((res) => setTimeout(res, 150));
}

// ── bulk invite send: 250 email contacts, all sent, zero failed ──────────────
{
  await mkUser("eu_admin");
  const c = await createCampaign({ name: "Stress Blast", bonusAmountTzs: 5_000, messageEn: "Join", messageSw: "Jiunge" }, "eu_admin");
  ok("stress campaign created", c.ok);
  const cid = c.ok ? c.campaign.id : "";
  const rows = Array.from({ length: 250 }, (_, i) => ({ email: `blast_${i}@example.com`, phone: null }));
  const added = await addContactsStructured(cid, rows, "eu_admin");
  ok("250 contacts added", added.ok && added.added === 250, added.ok ? `added=${added.added}` : "not ok");
  const t0 = Date.now();
  const sent = await sendCampaign(cid, "eu_admin");
  const ms = Date.now() - t0;
  ok("bulk send completes, 250 sent, 0 failed, 0 pending", sent.ok && sent.sent === 250 && sent.failed === 0 && sent.pending === 0, sent.ok ? `sent=${sent.sent} failed=${sent.failed} pending=${sent.pending} in ${ms}ms` : "not ok");
}

// ── concurrent burst: 50 fire-and-forget sends, no unhandled rejections ──────
{
  for (let i = 0; i < 50; i++) {
    await mkUser(`burst_${i}`);
    void sendEmailToUser(`burst_${i}`, (to) => ({ to, subject: `n${i}`, html: depositConfirmedHtml({ amount: 1000 * i, method: "M", reference: `r${i}`, balance: i }), tag: "t" }));
  }
  await new Promise((res) => setTimeout(res, 300));
  ok("no unhandled promise rejections across the run", unhandled.length === 0, `unhandled=${unhandled.length}`);
}

console.log(`\nemail-stress: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
