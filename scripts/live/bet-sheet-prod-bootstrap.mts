/** A21's local production-build fixture. Preloaded into next start; never an HTTP seeder or production database tool. */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

if (process.env.KP_QA_MEMORY_BOOTSTRAP !== "bet-sheet-local-production" || process.env.NODE_ENV !== "production" || process.env.DATABASE_URL ||
    !process.argv.includes("start") || !process.argv.includes("127.0.0.1")) {
  throw new Error("Bet-sheet production fixture requires explicit local memory mode and next start bound to127.0.0.1, with no DATABASE_URL.");
}
if (!process.env.SESSION_SECRET || !process.env.JOURNEY_PREVIEW_SECRET) throw new Error("Local fixture secrets are required.");

// A21 explicitly measures next start's production client on memory. Use the existing build-only memory exception
// inside this guarded, loopback-only fixture process; the application's production store guard stays unchanged.
process.env.NEXT_PHASE = "phase-production-build";
// Next requires this environment shim before anything imports next/headers (the same ordering as its own server).
await import("next/dist/server/node-environment.js");
const { db } = await import("../../src/lib/server/store.ts");
const { marketStore } = await import("../../src/lib/server/market-dal.ts");
const { createMarket } = await import("../../src/lib/server/market-service.ts");
const { signSession } = await import("../../src/lib/server/crypto.ts");
const { setActiveSessionId } = await import("../../src/lib/server/session-registry.ts");
const { mintPreviewPass } = await import("../../src/lib/server/journey-preview.ts");
const now = Date.now(), at = new Date(now).toISOString();
const userId = "usr_s8productionfixture", sessionId = "sess_s8productionfixture", phone = "+255700008081";
await db.user.create({
  id: userId, phoneE164: phone, email: null, emailVerifiedAt: null, passwordHash: null, passwordSalt: null,
  failedLoginCount: 0, lockedUntil: null, role: "SUPPORT", status: "ACTIVE", locale: "EN", displayName: "S8 local production fixture",
  dob: "1990-01-01", region: "TZ", acceptedTermsVersion: "v1", acceptedTermsAt: at, marketingOptIn: false,
  twoFactorEnabled: false, avatarDataUrl: null, createdAt: at, updatedAt: at, lastLoginAt: at, closedAt: null,
});
await db.wallet.create({ id: "wal_s8productionfixture", userId, balance: 50_000, bonusBalance: 0, pending: 0, hold: 0, currency: "TZS", status: "ACTIVE", createdAt: at, updatedAt: at });
await setActiveSessionId(userId, sessionId);
const session = signSession({ userId, phoneE164: phone, role: "SUPPORT", kycStatus: "NONE", sessionId, iat: now, exp: now + 3600_000, lastSeenAt: now, playStartedAt: now });
const preview = mintPreviewPass("staff", userId, now + 3600_000, now);
if (!preview) throw new Error("Local preview pass could not be minted.");
const market = await createMarket({
  titleEn: "Dodoma wins the next match", titleSw: "Dodoma yashinda mechi inayofuata", titleZh: "多多马赢得下一场比赛",
  shortTitleEn: "Dodoma wins next match", shortTitleSw: "Dodoma yashinda mechi", shortTitleZh: "多多马赢得下一场比赛",
  category: "sports", sourceUrl: "https://example.invalid/local-fixture", resolutionCriterion: "Local rendering fixture only",
  resolutionAt: new Date(now + 48 * 3600_000).toISOString(), selectionClosedAt: new Date(now + 24 * 3600_000).toISOString(), proposedBy: userId,
});
// Only rendering/latency is measured here. Synthetic pools do not stand in for any money or exactly-once proof.
await marketStore.set({ ...market, yesPool: 24_825, noPool: 50_462 });
const outDir = resolve(process.cwd(), ".qa-artifacts", "s8-production");
mkdirSync(outDir, { recursive: true });
writeFileSync(resolve(outDir, "fixture.json"), JSON.stringify({ marketId: market.id, userId, cookies: [
  { name: "kp_session", value: session }, { name: "kp_preview", value: preview.token }, { name: "kp-locale", value: "en" },
] }), { mode: 0o600 });
const required = JSON.parse(readFileSync(resolve(process.cwd(), ".next", "required-server-files.json"), "utf8"));
const staticDir = resolve(process.cwd(), ".next", "static");
mkdirSync(staticDir, { recursive: true });
writeFileSync(resolve(staticDir, "kp-s8-local-build.json"), JSON.stringify({
  mode: process.env.NODE_ENV, databaseConfigured: false, localOnly: true, memoryFixtureBuildException: true,
  buildSha: required.config.deploymentId ?? null,
  sourceHead: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  sourceDirty: execFileSync("git", ["status", "--porcelain", "--", "src", "next.config.ts", "prisma", "package-lock.json"], { encoding: "utf8" }).trim().length > 0,
  buildId: readFileSync(resolve(process.cwd(), ".next", "BUILD_ID"), "utf8").trim(),
}));
console.log("[S8 QA] local production rendering fixture ready; credentials written only to ignored artifacts.");
