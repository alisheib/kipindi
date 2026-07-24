/**
 * Seed an ADMIN + a populated resolver queue into a REAL database, for visual
 * verification against a production build.
 *
 * The /api/dev-test/* helpers 404 under `next start` (NODE_ENV=production), and
 * the store hard-locks production traffic without a DATABASE_URL — so a build+start
 * visual pass needs the fixtures seeded directly. This does exactly what
 * /api/dev-test/seed-admin does, minus the session cookie (Playwright logs in
 * through the real /auth/admin form).
 *
 *   DATABASE_URL='postgresql://…?schema=visual' npx tsx scripts/seed-visual-admin.mts
 *
 * ⚠️ Dev/QA only — never point this at the production database.
 */
process.env.SESSION_SECRET ??= "test-only-session-secret-32chars-min-aaaa";

import { db, type StoredUser, type StoredWallet, type StoredKyc } from "../src/lib/server/store.ts";
import { hashPassword, randomId } from "../src/lib/server/crypto.ts";
import { createMarket, listMarkets } from "../src/lib/server/market-service.ts";

const PHONE = "+255700000001";
const PASSWORD = "Admin2026!";
const NAME = "Ali Admin";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required (this seeds a real database).");
  process.exit(1);
}
if (/railway|prod|50pick\.tz/i.test(process.env.DATABASE_URL)) {
  console.error("Refusing to run: DATABASE_URL looks like a production database.");
  process.exit(1);
}

const now = new Date().toISOString();
const existing = await db.user.findByPhone(PHONE);

if (existing) {
  await db.user.update(existing.id, { role: "ADMIN", status: "ACTIVE", displayName: NAME });
  console.log(`admin already present — promoted ${existing.id}`);
} else {
  const id = `usr_${randomId(12)}`;
  const salt = randomId(16);
  const hash = await hashPassword(PASSWORD, salt);
  const u: StoredUser = {
    id, phoneE164: PHONE, email: null,
    passwordHash: hash, passwordSalt: salt,
    failedLoginCount: 0, lockedUntil: null,
    role: "ADMIN", status: "ACTIVE", locale: "EN", displayName: NAME,
    dob: "1990-01-01", region: "TZ",
    acceptedTermsVersion: "v1", acceptedTermsAt: now,
    marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null,
    emailVerifiedAt: null, createdAt: now, updatedAt: now, lastLoginAt: now, closedAt: null,
  };
  await db.user.create(u);
  const w: StoredWallet = {
    id: `wal_${randomId(12)}`, userId: id, balance: 1_000_000, pending: 0, hold: 0,
    currency: "TZS", status: "ACTIVE", createdAt: now, updatedAt: now,
  };
  await db.wallet.create(w);
  const kyc: StoredKyc = {
    id: `kyc_${randomId(10)}`, userId: id, status: "APPROVED",
    rejectReason: null, rejectNote: null,
    nidaNumber: "19900101000000001", nidaVerifiedAt: now,
    fullName: NAME, dob: "1990-01-01", documents: [], extraRequests: [],
    reviewerId: "system", reviewedAt: now, submittedAt: now, createdAt: now, updatedAt: now,
  };
  await db.kyc.upsert(kyc);
  console.log(`admin created ${id}`);
}

// The /auth/demo bootstrap signs in a FIXED phone and mints the session from that
// user's stored role. Promote it up-front, or the session is minted as a PLAYER and
// every money surface renders its "Restricted" card instead of the screen under test.
const DEMO_PHONE = "+255700000000";
const demo = await db.user.findByPhone(DEMO_PHONE);
if (demo) {
  await db.user.update(demo.id, { role: "ADMIN", status: "ACTIVE" });
  console.log(`demo user ${demo.id} promoted to ADMIN`);
} else {
  const id = `usr_${randomId(12)}`;
  const salt = randomId(16);
  const hash = await hashPassword(PASSWORD, salt);
  await db.user.create({
    id, phoneE164: DEMO_PHONE, email: null,
    passwordHash: hash, passwordSalt: salt,
    failedLoginCount: 0, lockedUntil: null,
    role: "ADMIN", status: "ACTIVE", locale: "EN", displayName: "Demo Admin",
    dob: "1990-01-01", region: "TZ",
    acceptedTermsVersion: "v1", acceptedTermsAt: now,
    marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null,
    emailVerifiedAt: null, createdAt: now, updatedAt: now, lastLoginAt: now, closedAt: null,
  } as StoredUser);
  await db.wallet.create({
    id: `wal_${randomId(12)}`, userId: id, balance: 1_000_000, pending: 0, hold: 0,
    currency: "TZS", status: "ACTIVE", createdAt: now, updatedAt: now,
  } as StoredWallet);
  await db.kyc.upsert({
    id: `kyc_${randomId(10)}`, userId: id, status: "APPROVED",
    rejectReason: null, rejectNote: null,
    nidaNumber: "19900101000000002", nidaVerifiedAt: now,
    fullName: "Demo Admin", dob: "1990-01-01", documents: [], extraRequests: [],
    reviewerId: "system", reviewedAt: now, submittedAt: now, createdAt: now, updatedAt: now,
  } as StoredKyc);
  console.log(`demo admin created ${id}`);
}

// Populate the resolver queue: markets resolving inside its default 24h window,
// with a range of shapes so the cards render realistically at every width.
const already = (await listMarkets()).filter((m) => m.status === "LIVE").length;
if (already < 3) {
  const specs = [
    { titleEn: "Will the Bank of Tanzania hold the policy rate this month?", titleSw: "Je, BoT itashikilia riba mwezi huu?", category: "macro" as const, hours: 2 },
    { titleEn: "Will Simba SC win their next Premier League fixture?", titleSw: "Je, Simba SC watashinda mechi yao ijayo?", category: "sports" as const, hours: 5 },
    { titleEn: "Will Bitcoin close above $100,000 today?", titleSw: "Je, Bitcoin itafunga juu ya $100,000 leo?", category: "crypto" as const, hours: 9 },
  ];
  for (const s of specs) {
    await createMarket({
      titleEn: s.titleEn, titleSw: s.titleSw, titleZh: null,
      category: s.category,
      sourceUrl: "https://www.bot.go.tz/",
      resolutionCriterion: "Resolved against the official published source at the resolution time.",
      resolutionAt: new Date(Date.now() + s.hours * 3600_000).toISOString(),
      selectionClosedAt: new Date(Date.now() + (s.hours - 1) * 3600_000).toISOString(),
      proposedBy: "system_visual_seed",
    });
  }
  console.log(`seeded ${specs.length} live markets`);
} else {
  console.log(`${already} live markets already present — not seeding more`);
}

console.log(`\nlogin: ${PHONE} / ${PASSWORD}`);
process.exit(0);
