/**
 * /api/dev-test/seed-ai-polls — dev-only fixture loader for the AI poll
 * generation pipeline. Creates a representative spread across every state
 * so the /admin/ai-polls page can be exercised end-to-end without spending
 * real Claude API tokens.
 *
 * Returns 404 in production. POST with no body.
 */
import { NextResponse } from "next/server";
import { seedAIPollFixtures } from "@/lib/server/ai-poll-generation";

export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ ok: false, error: "Not available" }, { status: 404 });
  }

  const seeded = seedAIPollFixtures();
  return NextResponse.json({
    ok: true,
    seeded: seeded.length,
    polls: seeded.map((p) => ({ id: p.id, state: p.state, title: p.titleEn })),
  });
}
