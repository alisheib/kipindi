/**
 * Real Claude AI provider — calls the Anthropic API to generate poll candidates.
 *
 * Uses claude-sonnet-4-6 for structured poll generation (good balance of
 * quality + cost). The system prompt enforces the 4-layer pipeline:
 *   L1: Generation (structured JSON with YES/NO options)
 *   L2: Validation (title, criterion, date, sources, category)
 *   L3: Quality scoring (confidence, uniqueness, resolution clarity)
 *   L4: Admin review (human officer approves/rejects/edits)
 *
 * L1 happens here; L2–L4 happen in ai-poll-generation.ts.
 */
import type { AIProvider, AIProviderResponse, AIPollGeneration, GenerateRequest } from "./ai-provider";

const MODEL = "claude-sonnet-4-6-20250514";

const VALID_CATEGORIES = [
  "sports", "macro", "weather", "crypto", "culture", "infrastructure", "tech", "other",
];

const SYSTEM_PROMPT = `You are the 50pick poll generator — a Tanzania-licensed pari-mutuel prediction-market platform.

Your job: generate ONE high-quality YES/NO prediction market question for the given category.

RULES:
1. Output ONLY valid JSON matching the schema below. No markdown, no commentary.
2. The question MUST be a clear YES/NO binary outcome.
3. The resolution criterion MUST reference a specific, publicly verifiable source (official body, data provider, news agency).
4. Resolution date MUST be in the future (2-180 days from now).
5. Include at least one source URL (real, verifiable — not made-up).
6. NEVER generate questions about: politics, religion, violence, adult content, individual deaths/health, or anything that could be considered hate speech.
7. Focus on Tanzania and East Africa where possible, but global topics (crypto, weather, sports) are fine.
8. Title must be under 200 characters, in English. Provide Swahili translation in titleSw.
9. Set confidence 0-100 based on how clear and resolvable the question is.
10. Provide brief reasoning for why this is a good market.

JSON SCHEMA (output exactly this structure):
{
  "titleEn": "Will X happen by Y?",
  "titleSw": "Je, X itatokea ifikapo Y?",
  "category": "sports|macro|weather|crypto|culture|infrastructure|tech|other",
  "resolutionCriterion": "Specific source + condition for YES outcome",
  "resolutionAt": "ISO 8601 datetime (future)",
  "options": [
    { "label": "YES", "descriptionEn": "...", "descriptionSw": "..." },
    { "label": "NO", "descriptionEn": "...", "descriptionSw": "..." }
  ],
  "sources": [
    { "url": "https://...", "publisher": "Official source name" }
  ],
  "confidence": 85,
  "reasoning": "Why this is a good prediction market question"
}`;

export class ClaudeProvider implements AIProvider {
  name = "claude-sonnet";
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generate(req: GenerateRequest): Promise<AIProviderResponse> {
    const start = Date.now();
    const category = VALID_CATEGORIES.includes(req.category) ? req.category : "other";
    const userPrompt = req.prompt
      ? `Generate a ${category} prediction market. Additional guidance: ${req.prompt}`
      : `Generate a ${category} prediction market question relevant to Tanzania or East Africa. If the category is crypto or weather, global topics are fine. Make it interesting and timely (June 2026).`;

    try {
      const { default: Anthropic } = await import("@anthropic-ai/sdk");
      const client = new Anthropic({ apiKey: this.apiKey });

      const resp = await client.messages.create({
        model: MODEL,
        max_tokens: 800,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userPrompt }],
      });

      const latencyMs = Date.now() - start;
      const rawText = (resp.content as Array<{ type: string; text?: string }>)
        .filter((b) => b.type === "text")
        .map((b) => b.text ?? "")
        .join("");

      const tokensUsed = (resp.usage?.input_tokens ?? 0) + (resp.usage?.output_tokens ?? 0);
      // Sonnet pricing: $3/1M input + $15/1M output
      const costUsd = Math.round(
        ((resp.usage?.input_tokens ?? 0) * 0.003 + (resp.usage?.output_tokens ?? 0) * 0.015) / 1000 * 100
      ) / 100;

      // Parse JSON from response — Claude sometimes wraps in ```json blocks
      let jsonStr = rawText.trim();
      const fenceMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (fenceMatch) jsonStr = fenceMatch[1].trim();

      let generation: AIPollGeneration;
      try {
        generation = JSON.parse(jsonStr);
      } catch {
        return {
          ok: false,
          error: `Failed to parse JSON from Claude response`,
          rawResponse: rawText,
          tokensUsed,
          costUsd,
          latencyMs,
        };
      }

      return {
        ok: true,
        generation,
        rawResponse: rawText,
        tokensUsed,
        costUsd,
        latencyMs,
      };
    } catch (err) {
      return {
        ok: false,
        error: `Claude API error: ${(err as Error).message}`,
        tokensUsed: 0,
        costUsd: 0,
        latencyMs: Date.now() - start,
      };
    }
  }
}
