/**
 * One-off: credit 1,000,000 TZS to every ADMIN-role account + the 0772388888
 * account, then email each recipient a "Gift from Ali 🎁" note.
 *
 * SAFE BY DEFAULT: prints the exact target list and TOTALS but moves nothing.
 * Pass --commit to actually credit money + send email.
 *
 * Money path: calls the audited wallet-service.adminAdjustBalance (atomic
 * wallet + CONFIRMED Transaction + double-entry ADJUSTMENT ledger + WATCHED
 * COMPLIANCE audit). Serializes with the live app via the PG advisory lock.
 *
 * Requires a REACHABLE prod DB. When run from outside Railway, set
 * DATABASE_URL (or DATABASE_PUBLIC_URL) to the public TCP proxy, and keep
 * USE_PRISMA_DAL=true so `db` routes to the real tables.
 *
 * Run:
 *   railway run --service 50pick npx tsx scripts/gift-admin-credit.ts            # dry-run
 *   railway run --service 50pick npx tsx scripts/gift-admin-credit.ts --commit   # execute
 */

// ── Connection: prefer the public proxy when running off-Railway. Must be set
//    BEFORE importing anything that touches ./prisma (singleton reads it once). ──
if (process.env.DATABASE_PUBLIC_URL && !process.env.DATABASE_URL?.includes(".proxy.")) {
  process.env.DATABASE_URL = process.env.DATABASE_PUBLIC_URL;
}
if (!process.env.USE_PRISMA_DAL) process.env.USE_PRISMA_DAL = "true";

const COMMIT = process.argv.includes("--commit");
const AMOUNT = 1_000_000;
const TARGET_PHONE = "+255772388888";
const REASON = "Gift from Ali - admin/test funding (approved by owner 2026-07-24)";

const fmt = (n: number) => n.toLocaleString("en-US") + " TZS";

async function main() {
  const { db } = await import("@/lib/server/store");
  const { adminAdjustBalance } = await import("@/lib/server/wallet-service");
  const { sendEmailToUser } = await import("@/lib/server/email");

  // ── Build the target set: ADMIN role + the specific phone, deduped by id ──
  const admins = await db.user.listByRoles(["ADMIN"]);
  const byPhone = await db.user.findByPhone(TARGET_PHONE);

  const map = new Map<string, any>();
  for (const u of admins ?? []) map.set(u.id, u);
  if (byPhone) map.set(byPhone.id, byPhone);
  const targets = [...map.values()];

  // Officer attribution: the 0772388888 admin, else the first ADMIN.
  const officer = (byPhone && byPhone.role === "ADMIN" ? byPhone : admins?.[0]) ?? targets[0];
  if (!officer) { console.log("No targets found. Nothing to do."); return; }

  console.log(`\nMode: ${COMMIT ? "COMMIT (real money will move)" : "DRY-RUN (no changes)"}`);
  console.log(`Amount each: ${fmt(AMOUNT)}   Officer: ${officer.phoneE164} (${officer.id})`);
  console.log(`\nTargets (${targets.length}):`);
  let creditable = 0;
  for (const u of targets) {
    const w = await db.wallet.findByUserId(u.id);
    const active = w && w.status === "ACTIVE";
    if (active) creditable++;
    console.log(`  ${active ? "✓" : "✗"} [${u.role}] ${u.phoneE164}  ${u.displayName ?? "—"}  ` +
      `wallet=${w?.status ?? "NONE"}  bal=${fmt(w?.balance ?? 0)}  email=${u.email ?? "—"}`);
  }
  console.log(`\nCreditable (ACTIVE wallet): ${creditable}   Total to credit: ${fmt(creditable * AMOUNT)}`);

  if (!COMMIT) {
    console.log("\nDRY-RUN only — nothing moved. Re-run with --commit to execute.");
    return;
  }

  console.log("\n── Committing ──");
  const results: { phone: string; ok: boolean; detail: string }[] = [];
  for (const u of targets) {
    const r = await adminAdjustBalance(u.id, officer.id, AMOUNT, REASON);
    if (!r.ok) { results.push({ phone: u.phoneE164, ok: false, detail: r.error }); console.log(`  ✗ ${u.phoneE164}: ${r.error}`); continue; }
    // Email the gift note (best-effort; never unwinds the credit).
    let mail = "no email on file";
    try {
      const res = await sendEmailToUser(u.id, (email) => ({
        to: email,
        subject: "🎁 A gift from Ali!",
        html: `<div style="font-family:system-ui,Segoe UI,Arial,sans-serif;max-width:520px;margin:auto;padding:24px">
          <h1 style="font-size:22px;margin:0 0 8px">🎁 A gift from Ali!</h1>
          <p style="font-size:16px;color:#222">Hi${u.displayName ? " " + u.displayName : ""},</p>
          <p style="font-size:16px;color:#222"><strong>${fmt(AMOUNT)}</strong> has been added to your 50pick wallet as a gift from Ali. Enjoy! 🎉</p>
          <p style="font-size:14px;color:#666">New balance: <strong>${fmt(r.balance)}</strong></p>
        </div>`,
        tag: "gift",
      }));
      mail = res.ok ? "emailed" : `email skipped (${res.reason})`;
    } catch (e) { mail = "email error: " + (e as Error).message; }
    results.push({ phone: u.phoneE164, ok: true, detail: `bal=${fmt(r.balance)} · ${mail}` });
    console.log(`  ✓ ${u.phoneE164}: credited → ${fmt(r.balance)} · ${mail}`);
  }

  const ok = results.filter((r) => r.ok).length;
  console.log(`\nDone. Credited ${ok}/${targets.length}. Failures: ${results.filter((r) => !r.ok).map((r) => r.phone).join(", ") || "none"}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
