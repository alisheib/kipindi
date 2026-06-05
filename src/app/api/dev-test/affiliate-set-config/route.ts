/**
 * /api/dev-test/affiliate-set-config — dev-only. Applies a (partial) affiliate
 * config so UI tests can drive every program state (active/paused, reward-mode
 * on/off combos) without clicking through the admin form each time.
 *
 * 404 in production. POST with a JSON body = DeepPartial<AffiliateConfig>.
 * Returns the resulting config (or a validation error).
 */
import { NextResponse, type NextRequest } from "next/server";
import { setAffiliateConfig, getAffiliateConfig, DEFAULT_AFFILIATE_CONFIG, type AffiliateConfig } from "@/lib/server/affiliate-config";

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === "production") return NextResponse.json({ ok: false, error: "Not available" }, { status: 404 });
  let body: Partial<AffiliateConfig>;
  try {
    body = (await req.json()) as Partial<AffiliateConfig>;
  } catch {
    body = {};
  }
  // `reset` shortcut restores the shipped defaults.
  const updates = (body as { reset?: boolean }).reset ? DEFAULT_AFFILIATE_CONFIG : body;
  const r = setAffiliateConfig(updates, "system_test");
  return NextResponse.json(r.ok ? { ok: true, config: r.config } : { ok: false, error: r.error, config: getAffiliateConfig() }, { status: r.ok ? 200 : 400 });
}
