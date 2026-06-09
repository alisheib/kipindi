/**
 * Real Claude AI provider — calls the Anthropic API to generate poll candidates.
 *
 * Model: claude-haiku-4-5 (fast + cheap, handles structured output well).
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

const MODEL = "claude-haiku-4-5-20251001";

// Haiku 4.5 token pricing (USD per token).
const PRICE_INPUT_PER_TOKEN = 1 / 1_000_000;   // $1 / MTok
const PRICE_OUTPUT_PER_TOKEN = 5 / 1_000_000;  // $5 / MTok
const PRICE_PER_WEB_SEARCH = 0.01;             // $10 / 1,000 searches

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

function buildSystemPrompt(opts: {
  nowIso: string;
  minLeadHours: number;
  maxLeadDays: number;
  webSearch: boolean;
}): string {
  const earliest = new Date(Date.now() + opts.minLeadHours * 3_600_000).toISOString();
  const latest = new Date(Date.now() + opts.maxLeadDays * 86_400_000).toISOString();
  return `You are the 50pick poll generator — a Tanzania-licensed pari-mutuel prediction-market platform.

Your job: generate ONE high-quality YES/NO prediction-market question for the given category, then submit it by calling the submit_poll tool.

CURRENT DATE/TIME (authoritative — trust this over your own sense of "now"): ${opts.nowIso}

HARD RULES:
1. The question MUST have a clear, binary YES/NO outcome.
2. The event MUST still be genuinely open right now — it must NOT have already happened or already been decided. ${opts.webSearch ? "Use web search to confirm the event is still upcoming and unresolved." : "Be conservative: if you are not certain an event is still in the future, do not use it."}
3. resolutionAt MUST be between ${earliest} and ${latest} (i.e. ${opts.minLeadHours}h to ${opts.maxLeadDays}d from now). Never a past date.
4. resolutionCriterion MUST name a specific, publicly verifiable source (official body, regulator, data provider, or major news agency) and the exact condition for a YES.
5. Provide at least one REAL, reachable source URL. ${opts.webSearch ? "Only use URLs you actually found via web search — never invent one." : "Only cite well-known official domains you are confident exist."}
6. NEVER generate questions about: politics, elections, religion, violence, war, adult content, or the death/health of any individual. These are banned under the GBT license.
7. Prefer Tanzania and East Africa topics. Global topics are fine for crypto, weather, and major world sport.
8. titleEn under 200 characters. Always include titleSw (Kiswahili).
9. options MUST be exactly two: a "YES" and a "NO", each with a short description.
10. Set confidence 0-100 honestly based on how clear and resolvable the question is.

Call submit_poll exactly once with the finished poll. Do not write any prose outside the tool call.`;
}

export class ClaudeProvider implements AIProvider {
  name: string;
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.name = getAIPollConfig().webSearchEnabled ? "claude-haiku (web search)" : "claude-haiku";
  }

  async generate(req: GenerateRequest): Promise<AIProviderResponse> {
    const start = Date.now();
    const cfg = getAIPollConfig();
    const category = VALID_CATEGORIES.includes(req.category) ? req.category : "other";
    const nowIso = new Date().toISOString();

    const userPrompt = req.prompt
      ? `Generate a ${category} prediction market. Additional guidance: ${req.prompt}`
      : `Generate a fresh, timely ${category} prediction-market question relevant to Tanzania or East Africa (global topics are fine for crypto, weather, and major world sport). It must be about an event that is still upcoming as of ${nowIso}.`;

    try {
      const client = new Anthropic({ apiKey: this.apiKey });

      const tools: Anthropic.Messages.ToolUnion[] = [SUBMIT_POLL_TOOL as unknown as Anthropic.Messages.Tool];
      if (cfg.webSearchEnabled) {
        tools.unshift({
          type: "web_search_20250305",
          name: "web_search",
          max_uses: 4,
        } as unknown as Anthropic.Messages.ToolUnion);
      }

      const resp = await client.messages.create({
        model: MODEL,
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
          (inTok * PRICE_INPUT_PER_TOKEN + outTok * PRICE_OUTPUT_PER_TOKEN + searches * PRICE_PER_WEB_SEARCH) * 10000,
        ) / 10000;

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
