/**
 * Real Claude AI provider — calls the Anthropic API to generate poll candidates.
 *
 * Model: configured centrally via ai-config.ts (default: Claude Sonnet 4).
 * Override via AI_MODEL env var on Railway.
 *
 * This is Layer 1 of the 4-layer pipeline (L2–L4 live in ai-poll-generation.ts):
 *   L1  Generation     ← HERE
 *   L2  Validation     (title / criterion / date / sources / category)
 *   L3  Quality scoring (confidence, lead-time, dedup, trusted source)
 *   L4  Admin review    (human officer approves / rejects / edits)
 *
 * Two accuracy hardening mechanisms beyond a plain prompt:
 *
 *   1. DATE ANCHORING — the model's training cutoff is in the past relative to
 *      "now", so left to itself it invents events that may already be resolved
 *      and dates that are stale. We inject the real current date and an explicit
 *      future window so every question is genuinely open and forward-looking.
 *
 *   2. WEB SEARCH (toggleable) — when enabled, the model searches the live web
 *      first, so questions are grounded in real upcoming events and the source
 *      URLs are real (not hallucinated). This is the single biggest accuracy
 *      lever. Controlled by AIPollConfig.webSearchEnabled.
 *
 * Output is forced through a structured `submit_poll` tool so we never parse
 * free-text JSON (eliminating the whole "failed to parse" failure class). When
 * web search is on we use tool_choice:auto (the model must be free to call the
 * server-side search tool first); a text-JSON fallback covers the rare case
 * where the model answers in prose instead of calling the tool.
 */
import Anthropic from "@anthropic-ai/sdk";
import type { AIProvider, AIProviderResponse, AIPollGeneration, GenerateRequest } from "./ai-provider";
import { getAIPollConfig } from "./ai-poll-config";
import { ai } from "./ai-config";
import { recordAiUsage } from "./ai-usage";

const VALID_CATEGORIES = [
  "sports", "macro", "weather", "crypto", "culture", "infrastructure", "tech", "other",
];

/** The structured-output contract. The model fills this in by calling the
 *  `submit_poll` tool — the input we get back is already valid JSON. */
const SUBMIT_POLL_TOOL = {
  name: "submit_poll",
  description:
    "Submit the finished YES/NO prediction-market poll. Call this exactly once, " +
    "as your final action, with the complete poll.",
  input_schema: {
    type: "object" as const,
    properties: {
      titleEn: { type: "string", description: "English question, under 200 chars, clear binary YES/NO outcome." },
      titleSw: { type: "string", description: "Kiswahili translation of the question." },
      category: { type: "string", enum: VALID_CATEGORIES },
      resolutionCriterion: { type: "string", description: "The specific, publicly verifiable condition + named source that decides YES." },
      resolutionAt: { type: "string", description: "ISO 8601 datetime the question resolves. MUST be in the future." },
      options: {
        type: "array",
        items: {
          type: "object",
          properties: {
            label: { type: "string" },
            descriptionEn: { type: "string" },
            descriptionSw: { type: "string" },
          },
          required: ["label"],
        },
      },
      sources: {
        type: "array",
        items: {
          type: "object",
          properties: {
            url: { type: "string", description: "Real, reachable https URL of the source." },
            publisher: { type: "string" },
          },
          required: ["url", "publisher"],
        },
      },
      confidence: { type: "number", description: "0-100 self-assessment of how clear and resolvable this question is." },
      reasoning: { type: "string", description: "Brief reasoning for why this is a good market." },
    },
    required: ["titleEn", "category", "resolutionCriterion", "resolutionAt", "options", "sources", "confidence", "reasoning"],
  },
};

/** Per-category "hot topic" steering so every category yields strong, current,
 *  debate-worthy markets — not weak or obvious ones. These are prompts to think
 *  along, NOT facts to assert; with web search on the model confirms specifics. */
const CATEGORY_GUIDANCE: Record<string, string> = {
  sports:
    "Tanzanian Premier League title + relegation race (Simba SC, Young Africans/Yanga, Azam FC), CAF Champions League / Confederation Cup ties involving Tanzanian clubs, Taifa Stars / Serengeti Boys fixtures and AFCON 2027 (co-hosted by Tanzania, Kenya, Uganda) preparations, plus marquee global fixtures (Premier League title & top-4, UEFA Champions League, NBA Finals, F1 championship) when timely.",
  macro:
    "Bank of Tanzania policy/CBR rate decisions, TZS/USD exchange-rate thresholds, year-on-year inflation prints (NBS), quarterly GDP growth, tourist-arrival records, EWURA fuel-price caps, and DSE all-share index levels.",
  weather:
    "TMA seasonal forecasts and monthly rainfall totals for Dar es Salaam, Dodoma, Arusha, Mwanza and the Masika / Vuli rains; El Niño / La Niña effects; Kilimanjaro and coastal anomalies.",
  crypto:
    "Bitcoin and Ethereum price thresholds by a dated close (CoinGecko/CoinMarketCap), major network upgrades, ETF flows, and Tanzanian/African crypto-regulation milestones.",
  culture:
    "Bongo Flava — Diamond Platnumz, Harmonize, Zuchu, Rayvanny — album drops, awards (Tanzania Music Awards, AFRIMMA), record streaming or YouTube milestones; Fiesta tour, Sauti za Busara, Swahili film (AMVCA), and Miss Tanzania.",
  infrastructure:
    "SGR (Standard Gauge Railway) phase openings Dar–Morogoro–Dodoma–Tabora–Mwanza, Julius Nyerere Hydropower (JNHPP) units coming online, DART/BRT bus phases, JNIA Terminal upgrades, Bagamoyo & Dar port expansion, and major bridge/road commissionings.",
  tech:
    "Tanzania's digital economy — mobile-money milestones and interoperability (M-Pesa, Airtel Money, Mixx by Yas/Tigo, HaloPesa), TCRA spectrum/5G rollouts, Starlink and satellite-internet availability, the 2Africa / EASSy subsea cables, fintech & startup funding rounds, data-centre launches, NIDA/e-government digital ID, and AI adoption by banks/telcos.",
  other:
    "A genuinely interesting, verifiable real-world event with broad public interest in Tanzania that doesn't fit the other categories.",
};

function buildSystemPrompt(opts: {
  nowIso: string;
  minLeadHours: number;
  maxLeadDays: number;
  webSearch: boolean;
}): string {
  const earliest = new Date(Date.now() + opts.minLeadHours * 3_600_000).toISOString();
  const latest = new Date(Date.now() + opts.maxLeadDays * 86_400_000).toISOString();
  return `You are the 50pick poll generator — the sharpest prediction-market question writer in Tanzania, working for a GBT-licensed pari-mutuel platform.

Your job: generate ONE excellent YES/NO prediction-market question for the given category, then submit it by calling the submit_poll tool.

CURRENT DATE/TIME (authoritative — trust this over your own sense of "now"): ${opts.nowIso}

WHAT MAKES A GREAT 50pick MARKET (aim for ALL of these):
- HOT & topical: tied to a real, named, upcoming event people are already talking about. No vague or evergreen filler.
- GENUINELY UNCERTAIN: the outcome should be a real coin-flip-ish debate, not near-certain either way — that's what makes both YES and NO attract money.
- CRISP & SPECIFIC: a named subject, a concrete threshold/condition, and a precise resolution moment. Avoid "soon", "a lot", "significantly".
- CLEANLY RESOLVABLE: one authoritative public source settles it with zero ambiguity.

HARD RULES:
1. The question MUST have a clear, binary YES/NO outcome.
2. The event MUST still be genuinely open right now — it must NOT have already happened or been decided. ${opts.webSearch ? "Use web search to confirm the event is real, still upcoming, and unresolved, and to pin down exact names, dates and figures." : "Be conservative: if you are not certain an event is still in the future, do not use it."}
3. resolutionAt MUST be between ${earliest} and ${latest} (i.e. ${opts.minLeadHours}h to ${opts.maxLeadDays}d from now). Never a past date.
4. resolutionCriterion MUST name a specific, publicly verifiable source (official body, regulator, data provider, or major news agency) and the exact condition for a YES.
5. Provide at least one REAL, reachable source URL. ${opts.webSearch ? "Only use URLs you actually found via web search — never invent one." : "Only cite well-known official domains you are confident exist."}
6. NEVER generate questions about: politics, elections, religion, violence, war, adult content, or the death/health of any individual. These are banned under the GBT license.
7. Anchor in Tanzania / East Africa wherever possible. Global topics are welcome for crypto, weather, and major world sport.
8. titleEn under 200 characters. Always include a natural, fluent titleSw (Kiswahili) — translate the meaning, don't transliterate.
9. options MUST be exactly two — "YES" and "NO" — each with a short, concrete description of what that outcome means.
10. Set confidence 0-100 honestly: how clean, unambiguous and well-sourced is the resolution? Lower it if the source or condition is fuzzy.

Call submit_poll exactly once with the finished poll. Do not write any prose outside the tool call.`;
}

export class ClaudeProvider implements AIProvider {
  name: string;
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.name = getAIPollConfig().webSearchEnabled ? `${ai.model} (web search)` : ai.model;
  }

  async generate(req: GenerateRequest): Promise<AIProviderResponse> {
    const start = Date.now();
    const cfg = getAIPollConfig();
    const category = VALID_CATEGORIES.includes(req.category) ? req.category : "other";
    const nowIso = new Date().toISOString();

    const guidance = CATEGORY_GUIDANCE[category] ?? CATEGORY_GUIDANCE.other;
    const userPrompt = req.prompt
      ? `Generate a HOT ${category} prediction market. Steer toward: ${guidance}\n\nAdditional operator guidance (takes priority): ${req.prompt}`
      : `Generate a fresh, HOT, genuinely-uncertain ${category} prediction-market question, anchored in Tanzania / East Africa (global topics are fine for crypto, weather, and major world sport). It must be about a real event still upcoming as of ${nowIso}.\n\nGood angles for this category: ${guidance}`;

    try {
      const client = new Anthropic({ apiKey: this.apiKey });

      const tools: Anthropic.Messages.ToolUnion[] = [SUBMIT_POLL_TOOL as unknown as Anthropic.Messages.Tool];
      if (cfg.webSearchEnabled) {
        tools.unshift({
          type: ai.webSearchTool.type,
          name: ai.webSearchTool.name,
          max_uses: 4,
        } as unknown as Anthropic.Messages.ToolUnion);
      }

      const resp = await client.messages.create({
        model: ai.model,
        max_tokens: 1500,
        system: buildSystemPrompt({
          nowIso,
          minLeadHours: cfg.minLeadTimeHours,
          maxLeadDays: cfg.maxLeadTimeDays,
          webSearch: cfg.webSearchEnabled,
        }),
        // When web search is on the model must be free to call it before
        // submit_poll, so we can only force *some* tool, not submit_poll
        // specifically. When it's off, force submit_poll for guaranteed JSON.
        tool_choice: cfg.webSearchEnabled
          ? { type: "auto" }
          : { type: "tool", name: "submit_poll" },
        tools,
        messages: [{ role: "user", content: userPrompt }],
      });

      const latencyMs = Date.now() - start;

      // Usage + cost. Server-tool (web search) requests are billed per call.
      const usage = resp.usage as
        | { input_tokens?: number; output_tokens?: number; server_tool_use?: { web_search_requests?: number } }
        | undefined;
      const inTok = usage?.input_tokens ?? 0;
      const outTok = usage?.output_tokens ?? 0;
      const searches = usage?.server_tool_use?.web_search_requests ?? 0;
      const tokensUsed = inTok + outTok;
      const costUsd =
        Math.round(
          (inTok * ai.pricing.inputPerToken + outTok * ai.pricing.outputPerToken + searches * ai.pricing.perWebSearch) * 10000,
        ) / 10000;

      // Meter the spend (best-effort) regardless of how parsing goes below.
      await recordAiUsage({ feature: "polls", model: ai.model, inputTokens: inTok, outputTokens: outTok, webSearches: searches, ok: true, latencyMs, detail: `generate · ${category}` });

      const content = resp.content as Array<{ type: string; name?: string; input?: unknown; text?: string }>;
      const rawResponse = JSON.stringify(content, null, 2).slice(0, 8000);

      // Primary path: the structured submit_poll tool call.
      const toolCall = content.find((b) => b.type === "tool_use" && b.name === "submit_poll");
      if (toolCall?.input && typeof toolCall.input === "object") {
        return {
          ok: true,
          generation: toolCall.input as AIPollGeneration,
          rawResponse,
          tokensUsed,
          costUsd,
          latencyMs,
        };
      }

      // Fallback: model answered in prose — try to parse JSON out of the text.
      const text = content
        .filter((b) => b.type === "text")
        .map((b) => b.text ?? "")
        .join("\n");
      const parsed = tryParseJson(text);
      if (parsed) {
        return { ok: true, generation: parsed, rawResponse, tokensUsed, costUsd, latencyMs };
      }

      return {
        ok: false,
        error: "Claude did not return a structured poll (no submit_poll tool call and no parseable JSON).",
        rawResponse,
        tokensUsed,
        costUsd,
        latencyMs,
      };
    } catch (err) {
      console.error("[50pick-polls] Claude API error:", err);
      await recordAiUsage({ feature: "polls", model: ai.model, ok: false, latencyMs: Date.now() - start, errorType: (err as Error).message?.slice(0, 200), detail: `generate · ${category}` });
      return {
        ok: false,
        error: `Claude API error: ${(err as Error).message}`,
        rawResponse: String(err),
        tokensUsed: 0,
        costUsd: 0,
        latencyMs: Date.now() - start,
      };
    }
  }
}

function tryParseJson(text: string): AIPollGeneration | null {
  let s = text.trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) s = fence[1].trim();
  // If there's leading/trailing prose, grab the outermost { … }.
  const first = s.indexOf("{");
  const last = s.lastIndexOf("}");
  if (first !== -1 && last > first) s = s.slice(first, last + 1);
  try {
    return JSON.parse(s) as AIPollGeneration;
  } catch {
    return null;
  }
}
