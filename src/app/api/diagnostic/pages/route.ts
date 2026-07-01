/**
 * /api/diagnostic/pages — test every code path that page.tsx files use.
 *
 * Returns JSON with pass/fail for each step so we can see exactly what
 * throws on Railway without needing server logs. Public (no auth required)
 * for the unauthenticated path; shows auth-gated results when signed in.
 */
import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/session";
import { db } from "@/lib/server/store";
import { hasDatabase, pingDatabase } from "@/lib/server/prisma";
import { getBonusConfig } from "@/lib/server/bonus-config";
import { getServerT } from "@/lib/i18n-server";

type Step = { name: string; ok: boolean; ms: number; error?: string };

async function run(name: string, fn: () => Promise<unknown>): Promise<Step> {
  const t0 = Date.now();
  try {
    await fn();
    return { name, ok: true, ms: Date.now() - t0 };
  } catch (err) {
    return { name, ok: false, ms: Date.now() - t0, error: String((err as Error)?.message ?? err).slice(0, 300) };
  }
}

export async function GET() {
  const steps: Step[] = [];

  // 1. i18n — every page calls this
  steps.push(await run("getServerT", () => getServerT()));

  // 2. Session check
  let session: Awaited<ReturnType<typeof getSession>> = null;
  steps.push(await run("getSession", async () => { session = await getSession(); }));

  // 3. DB ping
  steps.push(await run("pingDatabase", () => pingDatabase()));

  // 4. Bonus config (sync but imports store which inits Prisma)
  steps.push(await run("getBonusConfig", async () => getBonusConfig()));

  // Auth-gated steps
  if (session) {
    // 5. User lookup (deposit page does this)
    steps.push(await run("db.user.findById", async () => db.user.findById(session!.userId)));

    // 6. Wallet lookup (withdraw page does this)
    steps.push(await run("db.wallet.findByUserId", async () => db.wallet.findByUserId(session!.userId)));

    // 7. KYC lookup (withdraw page does this)
    steps.push(await run("db.kyc.findByUserId", async () => db.kyc.findByUserId(session!.userId)));

    // 8. RG settings (app-shell does this)
    steps.push(await run("getRgSettings", async () => {
      const { getRgSettings } = await import("@/lib/server/responsible-gambling");
      return getRgSettings(session!.userId);
    }));

    // 9. Transactions (wallet page)
    steps.push(await run("db.txn.findByUser", async () => db.txn.findByUser(session!.userId, 10)));

    // 10. Bonus summary (wallet page)
    steps.push(await run("getBonusSummary", async () => {
      const { getBonusSummary } = await import("@/lib/server/bonus-service");
      return getBonusSummary(session!.userId);
    }));
  }

  const allOk = steps.every((s) => s.ok);

  return NextResponse.json({
    allOk,
    commit: "b16d9d6",
    ts: new Date().toISOString(),
    authed: !!session,
    backend: hasDatabase() ? "postgres" : "memory",
    nodeEnv: process.env.NODE_ENV,
    steps,
  });
}
