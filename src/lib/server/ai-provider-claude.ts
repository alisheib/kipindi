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
import type { AIProvider, AIProviderResponse, AIPollGeneration, GenerateRequest, IdeateRequest, IdeateResponse, PollIdea } from "./ai-provider";
import { getAIPollConfig } from "./ai-poll-config";
import { ai } from "./ai-config";
import { recordAiUsage, costOf } from "./ai-usage";
import { getPlatformTimezone } from "./platform-config";

const VALID_CATEGORIES = [
  "sports", "macro", "weather", "crypto", "culture", "infrastructure", "tech", "other",
];

/** The structured-output contract. The model fills this in by calling the
 *  `submit_poll` tool — the input we get back is already valid JSON. */
/** Tier-1 ideation model — cheap Haiku, env-overridable; same family the
 *  sentinel triage uses. No web search at this tier. */
const IDEATION_MODEL = process.env.AI_POLL_IDEATION_MODEL || "claude-haiku-4-5-20251001";

const SUBMIT_IDEAS_TOOL = {
  name: "submit_ideas",
  description: "Submit the brainstormed prediction-market ideas. Call exactly once with all ideas.",
  input_schema: {
    type: "object" as const,
    properties: {
      ideas: {
        type: "array",
        description: "The candidate poll ideas.",
        items: {
          type: "object",
          properties: {
            titleEn: { type: "string", description: "English YES/NO question, under 200 chars." },
            category: { type: "string", enum: VALID_CATEGORIES },
            resolutionDateGuess: { type: "string", description: "Approximate resolution date, ISO YYYY-MM-DD." },
            why: { type: "string", description: "One short line on why it's a hot, uncertain, bettable market." },
          },
          required: ["titleEn", "category", "resolutionDateGuess", "why"],
        },
      },
    },
    required: ["ideas"],
  },
};

const SUBMIT_POLL_TOOL = {
  name: "submit_poll",
  description:
    "Submit the finished YES/NO prediction-market poll. Call this exactly once, " +
    "as your final action, with the complete poll.",
  input_schema: {
    type: "object" as const,
    properties: {
      titleEn: { type: "string", description: "English question, under 200 chars, clear binary YES/NO outcome." },
      titleSw: { type: "string", description: "Kiswahili translation of the question — natural and fluent, same meaning as the English." },
      titleZh: { type: "string", description: "Simplified Chinese (简体中文) translation of the question — natural and fluent, same meaning as the English." },
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
            descriptionZh: { type: "string" },
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
  avoidTitles?: string[];
}): string {
  const earliest = new Date(Date.now() + opts.minLeadHours * 3_600_000).toISOString();
  const latest = new Date(Date.now() + opts.maxLeadDays * 86_400_000).toISOString();
  // Cap the list so the prompt stays small even with a big board.
  const avoid = (opts.avoidTitles ?? []).slice(0, 60);
  const avoidBlock = avoid.length
    ? `\n\nDO NOT DUPLICATE — the platform ALREADY has these questions live or in review. Your question must be MEANINGFULLY DIFFERENT (different subject, threshold, or resolution moment); never a paraphrase of any of these:\n${avoid.map((t) => `- ${t}`).join("\n")}\n`
    : "";
  return `You are the 50pick poll generator — the sharpest prediction-market question writer in Tanzania, working for a GBT-licensed pari-mutuel platform.${avoidBlock}

Your job: generate ONE excellent YES/NO prediction-market question for the given category, then submit it by calling the submit_poll tool.

CURRENT DATE/TIME (authoritative — trust this over your own sense of "now"): ${opts.nowIso} (platform timezone: ${getPlatformTimezone()})

WHAT MAKES A GREAT 50pick MARKET (aim for ALL of these):
- HOT & topical: tied to a real, named, upcoming event people are already talking about. No vague or evergreen filler.
- GENUINELY UNCERTAIN: the outcome should be a real coin-flip-ish debate, not near-certain either way — that's what makes both YES and NO attract money.
- CRISP & SPECIFIC: a named subject, a concrete threshold/condition, and a precise resolution moment. Avoid "soon", "a lot", "significantly".
- CLEANLY RESOLVABLE: one authoritative public source settles it with zero ambiguity.

HARD RULES:
1. The question MUST have a clear, binary YES/NO outcome.
2. The event MUST still be genuinely open right now — it must NOT have already happened or been decided. ${opts.webSearch ? "Use web search to confirm the event is real, still upcoming, and unresolved, and to pin down exact names, dates and figures." : "Be conservative: if you are not certain an event is still in the future, do not use it."}
3. resolutionAt MUST be between ${earliest} and ${latest} (i.e. ${opts.minLeadHours}h to ${opts.maxLeadDays}d from now). Never a past date. Note: betting closes BEFORE the resolution date (e.g. 1h before for sports, 2h for crypto, 1–2 days for macro). Pick events where this lead time makes sense.
4. resolutionCriterion MUST name a specific, publicly verifiable source (official body, regulator, data provider, or major news agency) and the exact condition for a YES.
5. Provide at least one REAL, reachable source URL. ${opts.webSearch ? "Only use URLs you actually found via web search — never invent one." : "Only cite well-known official domains you are confident exist."}
6. NEVER generate questions about: politics, elections, religion, violence, war, adult content, or the death/health of any individual. These are banned under the GBT license.
7. Anchor in Tanzania / East Africa wherever possible. Global topics are welcome for crypto, weather, and major world sport.
8. titleEn under 200 characters. Always include a natural, fluent titleSw (Kiswahili) AND titleZh (Simplified Chinese, 简体中文) — translate the MEANING in each, don't transliterate. Keep proper nouns, brand names, numbers and TZS amounts intact; English remains the official version used to settle the market.
9. options MUST be exactly two — "YES" and "NO" — each with a short, concrete description of what that outcome means.
10. Set confidence 0-100 honestly: how clean, unambiguous and well-sourced is the resolution? Lower it if the source or condition is fuzzy.

Call submit_poll exactly once with the finished poll. Do not write any prose outside the tool call.`;
}

export class ClaudeProvider implements AIProvider {
  name: string;
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.name = getAIPollConfig().webSearchEnabled ? `Claude (web search)` : `Claude`;
  }

  async generate(req: GenerateRequest): Promise<AIProviderResponse> {
    const start = Date.now();
    const cfg = getAIPollConfig();
    const category = VALID_CATEGORIES.includes(req.category) ? req.category : "other";
    // Resolve the live admin-configured model (config-store → env → default)
    const { getConfiguredModel } = await import("./ai-config");
    const activeModel = await getConfiguredModel();
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
        model: activeModel,
        max_tokens: 1500,
        system: buildSystemPrompt({
          nowIso,
          minLeadHours: cfg.minLeadTimeHours,
          maxLeadDays: cfg.maxLeadTimeDays,
          webSearch: cfg.webSearchEnabled,
          avoidTitles: req.avoidTitles,
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
      const costUsd = costOf(activeModel, inTok, outTok, searches);

      // Meter the spend (best-effort) regardless of how parsing goes below.
      await recordAiUsage({ feature: "polls", model: activeModel, inputTokens: inTok, outputTokens: outTok, webSearches: searches, ok: true, latencyMs, detail: `generate · ${category}` });

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
      await recordAiUsage({ feature: "polls", model: activeModel, ok: false, latencyMs: Date.now() - start, errorType: (err as Error).message?.slice(0, 200), detail: `generate · ${category}` });
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

  async ideate(req: IdeateRequest): Promise<IdeateResponse> {
    const start = Date.now();
    const nowIso = new Date().toISOString();
    const cfg = getAIPollConfig();
    const cats = req.categories.filter((c) => VALID_CATEGORIES.includes(c));
    const categories = cats.length ? cats : ["sports"];
    const count = Math.max(1, Math.min(50, Math.floor(req.count) || 1));
    const userPrompt = req.prompt
      ? `Brainstorm ${count} prediction-market ideas across: ${categories.join(", ")}. Operator steer (priority): ${req.prompt}`
      : `Brainstorm ${count} fresh, hot, genuinely-uncertain prediction-market ideas across: ${categories.join(", ")}.`;
    try {
      const client = new Anthropic({ apiKey: this.apiKey });
      const resp = await client.messages.create({
        model: IDEATION_MODEL,
        max_tokens: 1500,
        system: buildIdeationPrompt({ nowIso, minLeadHours: cfg.minLeadTimeHours, maxLeadDays: cfg.maxLeadTimeDays, categories, count, avoidTitles: req.avoidTitles }),
        tool_choice: { type: "tool", name: "submit_ideas" },
        tools: [SUBMIT_IDEAS_TOOL as unknown as Anthropic.Messages.Tool],
        messages: [{ role: "user", content: userPrompt }],
      });
      const latencyMs = Date.now() - start;
      const usage = resp.usage as { input_tokens?: number; output_tokens?: number } | undefined;
      const inTok = usage?.input_tokens ?? 0;
      const outTok = usage?.output_tokens ?? 0;
      const costUsd = costOf(IDEATION_MODEL, inTok, outTok, 0);
      await recordAiUsage({ feature: "polls", model: IDEATION_MODEL, inputTokens: inTok, outputTokens: outTok, webSearches: 0, ok: true, latencyMs, detail: `ideate · ${count}` });

      const content = resp.content as Array<{ type: string; name?: string; input?: unknown }>;
      const toolCall = content.find((b) => b.type === "tool_use" && b.name === "submit_ideas");
      const rawIdeas = (toolCall?.input as { ideas?: unknown } | undefined)?.ideas;
      const ideas: PollIdea[] = Array.isArray(rawIdeas)
        ? rawIdeas
            .map((x) => x as Record<string, unknown>)
            .filter((x) => x && typeof x.titleEn === "string")
            .map((x) => ({
              titleEn: String(x.titleEn).slice(0, 240),
              category: String(x.category ?? "other").toLowerCase(),
              resolutionDateGuess: String(x.resolutionDateGuess ?? ""),
              why: String(x.why ?? "").slice(0, 240),
            }))
        : [];
      return { ok: true, ideas, tokensUsed: inTok + outTok, costUsd, latencyMs };
    } catch (err) {
      await recordAiUsage({ feature: "polls", model: IDEATION_MODEL, ok: false, latencyMs: Date.now() - start, errorType: (err as Error).message?.slice(0, 200), detail: "ideate" });
      return { ok: false, ideas: [], error: `Ideation error: ${(err as Error).message}`, tokensUsed: 0, costUsd: 0, latencyMs: Date.now() - start };
    }
  }
}

function buildIdeationPrompt(opts: {
  nowIso: string;
  minLeadHours: number;
  maxLeadDays: number;
  categories: string[];
  count: number;
  avoidTitles?: string[];
}): string {
  const earliest = new Date(Date.now() + opts.minLeadHours * 3_600_000).toISOString().slice(0, 10);
  const latest = new Date(Date.now() + opts.maxLeadDays * 86_400_000).toISOString().slice(0, 10);
  const avoid = (opts.avoidTitles ?? []).slice(0, 60);
  const avoidBlock = avoid.length
    ? `\n\nDO NOT repeat anything equivalent to these existing questions:\n${avoid.map((t) => `- ${t}`).join("\n")}\n`
    : "";
  return `You are the 50pick idea scout. Brainstorm ${opts.count} DISTINCT prediction-market IDEAS for a GBT-licensed Tanzanian pari-mutuel platform. This is a cheap first pass — just the seed of each market, no sources or full criteria yet.${avoidBlock}

CURRENT DATE: ${opts.nowIso}

For EACH idea give: titleEn (a crisp binary YES/NO question), category (one of: ${opts.categories.join(", ")}), resolutionDateGuess (approx resolution date between ${earliest} and ${latest}), and why (one line: why it's hot + genuinely uncertain).

RULES:
- Each idea = a real, named, UPCOMING event resolving between ${earliest} and ${latest}. Never already-decided.
- Genuinely uncertain (coin-flip-ish), crisp and specific. No vague/evergreen filler.
- Anchor in Tanzania / East Africa where possible (global ok for crypto, weather, major world sport).
- NEVER: politics, elections, religion, violence, war, adult content, death/health of individuals (banned under the GBT license).
- All ${opts.count} ideas must be DISTINCT from each other and from any existing question listed above.

Call submit_ideas exactly once with all ${opts.count} ideas.`;
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
