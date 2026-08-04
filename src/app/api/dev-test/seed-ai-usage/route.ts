/**
 * /api/dev-test/seed-ai-usage — dev-only. Generates a realistic spread of AI
 * usage events so the /admin/ai-usage page can be visually QA'd with volume
 * (pagination, filters, per-feature breakdown, credit panel). 404 in production.
 *
 *   POST { count?: number }  →  { ok: true, created, spentUsd }
 */
import { NextResponse } from "next/server";
import { aiUsageDal } from "@/lib/server/ai-usage-dal";
import { costOf } from "@/lib/server/ai-usage";
import { randomId } from "@/lib/server/crypto";

export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ ok: false, error: "Not available" }, { status: 404 });
  }
  const body = await req.json().catch(() => ({}));
  const count = Math.min(2000, Math.max(20, Number(body?.count) || 320));

  const rand = (min: number, max: number) => min + Math.random() * (max - min);
  const randint = (min: number, max: number) => Math.floor(rand(min, max + 1));
  const pick = <T>(a: T[]): T => a[Math.floor(Math.random() * a.length)];

  const SONNET = "claude-sonnet-4-6";
  const HAIKU = "claude-haiku-4-5-20251001";
  const ERRORS = ["credit balance too low", "overloaded_error (529)", "rate_limit_error (429)"];
  const POLL_CATS = ["sports", "crypto", "weather", "macro", "culture", "tech"];
  const PLAYERS = ["Mbappe at the World Cup", "Messi goals 2026", "Simba SC title", "Yanga CAF run", "Bitcoin above $150k", "Diamond Platnumz album"];

  const now = Date.now();
  const SPAN = 30 * 86_400_000; // spread across 30 days
  let created = 0;
  let spentUsd = 0;

  for (let i = 0; i < count; i++) {
    const createdAt = new Date(now - Math.random() * SPAN).toISOString();
    const roll = Math.random();
    let feature: string, model: string, inTok: number, outTok: number, searches: number, detail: string;
    if (roll < 0.62) {
      feature = "sentinel"; model = SONNET;
      inTok = randint(5000, 11000); outTok = randint(350, 700); searches = randint(1, 3);
      detail = `check · ${pick(PLAYERS)}`;
    } else if (roll < 0.82) {
      feature = "polls"; model = SONNET;
      inTok = randint(6000, 12000); outTok = randint(600, 1100); searches = randint(2, 4);
      detail = `generate · ${pick(POLL_CATS)}`;
    } else {
      feature = "chat"; model = HAIKU;
      inTok = randint(200, 1200); outTok = randint(80, 350); searches = 0;
      detail = "";
    }
    // ~9% errors (no output, no cost — mirrors the real exhausted-credit case)
    const ok = Math.random() > 0.09;
    const errorType = ok ? null : pick(ERRORS);
    if (!ok) { outTok = 0; searches = 0; }
    const cost = ok ? costOf(model, inTok, outTok, searches) : 0;
    spentUsd += cost;

    await aiUsageDal.create({
      id: `aiu_seed_${randomId(12)}`,
      createdAt,
      feature,
      model,
      inputTokens: ok ? inTok : Math.round(inTok * 0.4),
      outputTokens: outTok,
      webSearches: searches,
      costUsd: cost,
      ok,
      errorType,
      latencyMs: randint(1200, 9000),
      detail: detail || null,
    });
    created++;
  }

  // Credit cycle started 30 days ago so the seeded spend counts; limit $20 →
  // exercises the credit panel tone. (In-memory only locally.)
  (globalThis as Record<string, unknown>).__50PICK_AI_CREDIT = {
    limitUsd: 20,
    cycleStartIso: new Date(now - SPAN).toISOString(),
    alertedLevel: spentUsd >= 20 ? "limit" : spentUsd >= 16 ? "warn" : "none",
  };

  return NextResponse.json({ ok: true, created, spentUsd: Math.round(spentUsd * 100) / 100 });
}
