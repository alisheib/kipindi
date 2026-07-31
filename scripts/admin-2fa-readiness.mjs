/**
 * Can we safely turn admin 2FA back on? — read-only, moves nothing, changes nothing.
 *
 *   railway ssh "node scripts/admin-2fa-readiness.mjs"     # ✅ run it INSIDE production
 *
 * ⚠️ Use `railway ssh`, not `railway run`. `run` executes on your laptop with production's env
 * injected, and `DATABASE_URL` there is the INTERNAL host (`postgres.railway.internal`) which only
 * resolves inside Railway's network. See docs/SELCOM-PAYOUT-RAILS.md for the same trap costing an
 * evening.
 *
 * 🔴 THE HAZARD THIS EXISTS TO PREVENT. `DISABLE_ADMIN_TOTP=true` is set on production, so the
 * admin console is password-only. Unsetting it looks like a one-line security win. But
 * `src/app/admin/layout.tsx` FORCES enrolment: an admin with no TOTP secret is redirected to
 * `/admin/2fa/setup`. If that redirect ever fails — or if the only admin account cannot complete
 * enrolment — the owner is locked out of his own console on a live real-money platform, with no
 * admin able to let him back in.
 *
 * So: count who is actually enrolled BEFORE flipping anything.
 */
import { PrismaClient } from "@prisma/client";

const STAFF = ["ADMIN", "COMPLIANCE", "MODERATOR", "SUPPORT", "FINANCE"];

const prisma = new PrismaClient();

try {
  const staff = await prisma.user.findMany({
    where: { role: { in: STAFF } },
    select: { id: true, role: true, phone: true, status: true },
  });

  // TotpSecret is keyed by userId; presence = enrolled.
  const secrets = await prisma.totpSecret.findMany({ select: { userId: true } });
  const enrolled = new Set(secrets.map((s) => s.userId));

  const mask = (p) => (p ? `${p.slice(0, 6)}***${p.slice(-2)}` : "—");

  console.log("");
  console.log("═".repeat(70));
  console.log("  ADMIN 2FA READINESS — can DISABLE_ADMIN_TOTP be safely unset?");
  console.log("═".repeat(70));
  console.log(`  DISABLE_ADMIN_TOTP = ${process.env.DISABLE_ADMIN_TOTP ?? "(unset)"}`);
  console.log(`  → admin 2FA is currently ${process.env.DISABLE_ADMIN_TOTP === "true" ? "DISABLED" : "ENFORCED"}`);
  console.log("");
  console.log(`  Staff accounts: ${staff.length}`);
  for (const u of staff) {
    const has = enrolled.has(u.id);
    console.log(`    ${has ? "✅ enrolled  " : "❌ NOT enrolled"}  ${String(u.role).padEnd(11)} ${mask(u.phone)}  ${u.status}`);
  }

  const admins = staff.filter((u) => u.role === "ADMIN" && u.status === "ACTIVE");
  const enrolledAdmins = admins.filter((u) => enrolled.has(u.id));

  console.log("");
  console.log(`  ACTIVE ADMIN accounts: ${admins.length}   of which enrolled: ${enrolledAdmins.length}`);
  console.log("─".repeat(70));

  if (enrolledAdmins.length === 0) {
    console.log("  🔴 DO NOT UNSET DISABLE_ADMIN_TOTP YET.");
    console.log("     No active ADMIN has a TOTP secret. Unsetting it now sends every admin to");
    console.log("     /admin/2fa/setup with no verified path back in.");
    console.log("");
    console.log("     Do this first, in THIS order:");
    console.log("       1. While 2FA is still disabled, log in to /admin and visit /admin/2fa/setup");
    console.log("       2. Enrol an authenticator and SAVE THE BACKUP CODES somewhere off-machine");
    console.log("       3. Re-run this script and confirm at least one enrolled ACTIVE admin");
    console.log("       4. Only then: railway variables --set DISABLE_ADMIN_TOTP=false, redeploy");
    console.log("       5. Verify /api/health reports security.adminTotp = \"enforced\"");
    process.exitCode = 2;
  } else {
    console.log(`  ✅ SAFE TO PROCEED — ${enrolledAdmins.length} enrolled active admin(s).`);
    console.log("     Unset DISABLE_ADMIN_TOTP in Railway, redeploy, then confirm");
    console.log("     /api/health reports security.adminTotp = \"enforced\".");
    console.log("     Keep the backup codes off-machine before you do.");
  }
  console.log("═".repeat(70));
  console.log("");
} finally {
  await prisma.$disconnect();
}
