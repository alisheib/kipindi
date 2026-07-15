/**
 * /api/diagnostic — production-safe state check.
 *
 * Intentionally usable in production (unlike /api/dev-test/* which is
 * 404 there). Requires a valid session and only returns information
 * the signed-in user is allowed to know about themselves plus a
 * couple of non-sensitive system signals (DB backend, total user
 * count, audit chain valid). This is the endpoint Ali should hit on
 * Railway when the ADMIN role isn't showing — it tells him in one
 * call:
 *
 *   • Is my session role ADMIN or PLAYER?
 *   • Is my phone in ADMIN_BOOTSTRAP_PHONES?
 *   • Is Postgres actually connected? (DATABASE_URL set + reachable)
 *   • How many users are persisted? (a 0 here means the snapshot
 *     reload didn't run — disk-only on a fresh Railway redeploy
 *     would show this).
 *
 * Privacy: returns the masked phone, never the password hash, never
 * other users' data, never API keys.
 */
import { NextResponse } from "next/server";
import { currentSession } from "@/lib/server/auth-service";
import { db } from "@/lib/server/store";
import { hasDatabase, pingDatabase } from "@/lib/server/prisma";
import { verifyChain } from "@/lib/server/audit";

function maskPhone(p: string): string {
  if (p.length <= 6) return p;
  return `${p.slice(0, 4)}*****${p.slice(-2)}`;
}

function bootstrapPhones(): string[] {
  return (process.env.ADMIN_BOOTSTRAP_PHONES ?? "")
    .split(",").map(s => s.trim()).filter(Boolean);
}

export async function GET() {
  const session = await currentSession();
  if (!session) {
    // Even unauthed callers learn whether the env var is set and how
    // many phones are in it — they don't see which phones, so this
    // doesn't leak operator identities.
    return NextResponse.json({
      ok: false,
      reason: "no_session",
      message: "Sign in first, then re-hit this URL.",
      bootstrap: {
        envVarSet: bootstrapPhones().length > 0,
        phoneCount: bootstrapPhones().length,
      },
      db: {
        backend: hasDatabase() ? "postgres" : "disk-only",
      },
      build: {
        nodeEnv: process.env.NODE_ENV ?? "(unset)",
        hasDatabaseUrl: !!process.env.DATABASE_URL,
      },
    }, { status: 401 });
  }

  let user: Awaited<ReturnType<typeof db.user.findById>> = null;
  try { user = await db.user.findById(session.userId); } catch { /* graceful */ }
  const bootstrap = bootstrapPhones();
  const isInBootstrapList = !!user && bootstrap.includes(user.phoneE164);
  const chain = verifyChain();

  let userCount = -1;
  try { userCount = await db.user.count(); } catch { /* graceful */ } // audit H4/M5 — COUNT(*)
  // Active DB ping — proves reachability + table existence WITHOUT
  // having to perform a mutation. Cheap (5–50ms on a healthy link).
  let ping: Awaited<ReturnType<typeof pingDatabase>> = { envSet: false, reachable: false, tableExists: false, latencyMs: null, hostHint: null, error: "not-attempted" };
  try { ping = await pingDatabase(); } catch { /* graceful */ }

  return NextResponse.json({
    ok: true,
    you: {
      sessionRole: session.role,
      dbRole: user?.role ?? null,
      status: user?.status ?? null,
      phoneE164Masked: user ? maskPhone(user.phoneE164) : null,
      isInBootstrapList,
    },
    bootstrap: {
      envVarSet: bootstrap.length > 0,
      phoneCount: bootstrap.length,
      // Show the FULL list ONLY if the caller is themselves an admin
      // OR is in the bootstrap list. Otherwise just the count, so a
      // regular player can't enumerate operator phone numbers.
      list: (user?.role === "ADMIN" || isInBootstrapList)
        ? bootstrap
        : "[redacted — only admins or bootstrap-listed users see the values]",
    },
    db: {
      backend: hasDatabase() ? "postgres" : "disk-only",
      hasDatabaseUrl: !!process.env.DATABASE_URL,
      userCount,
      auditChainValid: chain.valid,
      // Live ping result — reachable=true means we just talked to
      // Postgres successfully. tableExists=true means the migration
      // has been applied. Together they prove "database is connected"
      // 100% without needing a mutation.
      ping: {
        reachable: ping.reachable,
        tableExists: ping.tableExists,
        latencyMs: ping.latencyMs,
        host: ping.hostHint,
        error: ping.error,
      },
      health: "prisma",
    },
    build: {
      nodeEnv: process.env.NODE_ENV ?? "(unset)",
    },
    diagnosis:
      !user ? "Session exists but the user record was not found in the store."
      : user.role === "ADMIN" ? "OK — you are ADMIN. The pill on /profile should be gold."
      : isInBootstrapList && hasDatabase() ? "Phone IS in ADMIN_BOOTSTRAP_PHONES, Postgres is connected, but role is " + user.role + ". Sign out and sign back in — the auto-promote on login (Sprint 55) needs a fresh login to mint a session with the new role."
      : isInBootstrapList && !hasDatabase() ? "Phone IS in ADMIN_BOOTSTRAP_PHONES but DATABASE_URL is not set — the store is disk-only and Railway's filesystem is wiped on every redeploy. Set DATABASE_URL on Railway, redeploy, then sign out + back in."
      : !isInBootstrapList && bootstrap.length === 0 ? "ADMIN_BOOTSTRAP_PHONES env var is empty. Set it on Railway (e.g. +255777777777), redeploy, then sign out + sign back in."
      : !isInBootstrapList ? "Your phone (" + maskPhone(user.phoneE164) + ") is NOT in ADMIN_BOOTSTRAP_PHONES. Either add it to the env list and redeploy, or sign in with the right account."
      : "Unknown — paste this whole response back to support.",
  });
}
