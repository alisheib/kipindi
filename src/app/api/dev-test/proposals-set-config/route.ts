/** /api/dev-test/proposals-set-config — dev-only. Apply a (partial) proposals
 *  config so UI tests can drive every state. 404 in prod. POST JSON body. */
import { NextResponse, type NextRequest } from "next/server";
import { setProposalsConfig, getProposalsConfig, DEFAULT_PROPOSALS_CONFIG, type ProposalsConfig } from "@/lib/server/proposals-config";

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === "production") return NextResponse.json({ ok: false, error: "Not available" }, { status: 404 });
  let body: Partial<ProposalsConfig> & { reset?: boolean };
  try { body = await req.json(); } catch { body = {}; }
  const updates = body.reset ? DEFAULT_PROPOSALS_CONFIG : body;
  const r = setProposalsConfig(updates, "system_test");
  return NextResponse.json(r.ok ? { ok: true, config: r.config } : { ok: false, error: r.error, config: getProposalsConfig() }, { status: r.ok ? 200 : 400 });
}
