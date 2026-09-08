/**
 * /api/dev-test/agent-set-config — dev-only. Applies a (partial) agent-programme
 * config so a UI drive can put the fee destination into a known state without
 * clicking through the admin form.
 *
 * ⭐ WHY THE LIPA DRIVE NEEDS THIS. The QR renders only when the fee destination IS
 * the Lipa number the QR encodes (`shouldShowLipaQr`) — and the shipped default
 * points somewhere else, deliberately, because changing it alters `/legal/agent-terms`
 * in three languages and is a business decision rather than an engineering one. So a
 * drive that just loaded `/agent` would measure the hidden case and report a failure
 * for a product that is behaving exactly as designed.
 *
 * With this route the drive arranges BOTH states and asserts both: destination = the
 * Lipa number → the QR is painted and decodes; destination = anything else → it is
 * gone. That is the safety rule proven on a real page, which is the only place it
 * matters. ⛔ It does NOT change what ships; the drive restores the default it found.
 *
 * 404 in production, exactly like its affiliate sibling. POST a JSON body =
 * Partial<AgentConfig>. Returns the resulting config (or a validation error).
 */
import { NextResponse, type NextRequest } from "next/server";
import { setAgentConfig, getAgentConfig, DEFAULT_AGENT_CONFIG, type AgentConfig } from "@/lib/server/agent-config";

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === "production") return NextResponse.json({ ok: false, error: "Not available" }, { status: 404 });
  let body: Partial<AgentConfig>;
  try {
    body = (await req.json()) as Partial<AgentConfig>;
  } catch {
    body = {};
  }
  // `reset` shortcut restores the shipped defaults.
  const updates = (body as { reset?: boolean }).reset ? DEFAULT_AGENT_CONFIG : body;
  const r = setAgentConfig(updates, "system_test");
  return NextResponse.json(r.ok ? { ok: true, config: r.config } : { ok: false, error: r.error, config: getAgentConfig() }, { status: r.ok ? 200 : 400 });
}
