/**
 * backfill-zh-titles.mts — one-time Chinese (zh) title back-fill.
 *
 * Existing markets were created before trilingual titles, so their `titleZh`
 * is NULL and Chinese players see the English title (graceful fallback). This
 * script translates each missing `titleZh` once, using the cheap Haiku model
 * with NO web search (translation needs no fact-checking — English stays the
 * canonical/binding text). It is:
 *
 *   • idempotent  — only selects markets where titleZh IS NULL; safe to re-run
 *   • metered     — writes one AiUsageEvent row per call (feature "polls"),
 *                   so the spend shows on the admin AI-usage dashboard
 *   • bounded     — --limit caps the run; --dry-run translates nothing
 *
 * Run it INSIDE the Railway environment (it needs prod DATABASE_URL +
 * ANTHROPIC_API_KEY — never point it at prod from a laptop):
 *
 *   railway run npx tsx scripts/backfill-zh-titles.mts --dry-run        # preview + cost estimate
 *   railway run npx tsx scripts/backfill-zh-titles.mts --limit 50       # do 50
 *   railway run npx tsx scripts/backfill-zh-titles.mts                  # do the rest
 */
import { PrismaClient } from "@prisma/client";
import Anthropic from "@anthropic-ai/sdk";
import { randomUUID } from "node:crypto";

const MODEL = "claude-haiku-4-5-20251001";
const IN_PER_MTOK = 1; // USD — Haiku 4.5 input
const OUT_PER_MTOK = 5; // USD — Haiku 4.5 output
const CONCURRENCY = 5;

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const limitArg = args.find((a) => a.startsWith("--limit"));
const limit = limitArg ? parseInt(limitArg.split("=")[1] ?? args[args.indexOf(limitArg) + 1] ?? "0", 10) : 0;

const prisma = new PrismaClient();
const apiKey = process.env.ANTHROPIC_API_KEY;
const client = apiKey ? new Anthropic({ apiKey }) : null;

const SYSTEM =
  "You translate prediction-market questions into natural, fluent Simplified Chinese (简体中文). " +
  "Output ONLY the translated question — no quotes, no preamble, no explanation, no alternatives. " +
  "Translate the meaning, do not transliterate. Keep proper nouns, brand names, numbers, dates and " +
  "TZS amounts intact. The English version remains the official text used to settle the market.";

type Row = { id: string; titleEn: string };

async function translate(titleEn: string): Promise<{ zh: string; inTok: number; outTok: number }> {
  if (!client) throw new Error("ANTHROPIC_API_KEY is not set in this environment.");
  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 300,
    system: SYSTEM,
    messages: [{ role: "user", content: titleEn }],
  });
  const zh = res.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();
  return { zh, inTok: res.usage.input_tokens, outTok: res.usage.output_tokens };
}

async function main() {
  const pending: Row[] = await prisma.predictionMarket.findMany({
    where: { titleZh: null },
    select: { id: true, titleEn: true },
    orderBy: { createdAt: "desc" },
    ...(limit > 0 ? { take: limit } : {}),
  });

  console.log(`Markets missing a Chinese title: ${pending.length}${limit > 0 ? ` (capped at ${limit})` : ""}`);
  if (pending.length === 0) { console.log("Nothing to back-fill."); return; }
  if (dryRun) {
    console.log("DRY RUN — nothing will be written. Sample:");
    for (const r of pending.slice(0, 5)) console.log(`  • ${r.titleEn}`);
    console.log(`Estimated cost: ~$${(pending.length * 0.0008).toFixed(2)} (≈ $0.0008/market on Haiku, no web search).`);
    return;
  }

  let done = 0, failed = 0, totalIn = 0, totalOut = 0;
  for (let i = 0; i < pending.length; i += CONCURRENCY) {
    const batch = pending.slice(i, i + CONCURRENCY);
    await Promise.all(batch.map(async (r) => {
      try {
        const { zh, inTok, outTok } = await translate(r.titleEn);
        if (!zh) { failed++; return; }
        totalIn += inTok; totalOut += outTok;
        const costUsd = (inTok / 1e6) * IN_PER_MTOK + (outTok / 1e6) * OUT_PER_MTOK;
        await prisma.predictionMarket.update({ where: { id: r.id }, data: { titleZh: zh } });
        await prisma.aiUsageEvent.create({
          // id has no DB default — must be supplied explicitly (matches recordAiUsage).
          data: { id: `aiu_${randomUUID().replace(/-/g, "").slice(0, 14)}`,
            feature: "polls", model: MODEL, inputTokens: inTok, outputTokens: outTok,
            webSearches: 0, costUsd, ok: true, detail: `zh-backfill ${r.id}` },
        }).catch((e) => console.error(`  usage-meter write failed for ${r.id}: ${(e as Error).message}`));
        done++;
      } catch (e) {
        failed++;
        console.error(`  ✗ ${r.id}: ${(e as Error).message}`);
      }
    }));
    console.log(`  …${Math.min(i + CONCURRENCY, pending.length)}/${pending.length}`);
  }

  const cost = (totalIn / 1e6) * IN_PER_MTOK + (totalOut / 1e6) * OUT_PER_MTOK;
  console.log(`\nDone. Translated ${done}, failed ${failed}. Tokens in=${totalIn} out=${totalOut}. Cost ≈ $${cost.toFixed(2)}.`);
  if (failed > 0) console.log("Re-run to retry the failures (idempotent — only NULL titleZh is selected).");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
