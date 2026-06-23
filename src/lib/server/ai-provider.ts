/**
 * Claude AI provider layer — mock implementation for sprint validation.
 *
 * Architecture:
 *   AIProvider interface → MockClaudeProvider (this sprint)
 *                        → ClaudeProvider (production — swap one line)
 *
 * The provider generates structured poll candidates from a category + prompt.
 * The mock simulates realistic Claude responses including:
 *   - Clean, high-quality generations
 *   - Incomplete / partial responses
 *   - Malformed structures
 *   - Unexpected categories
 *   - Empty generations
 *   - Duplicated options
 *   - Overly long titles/descriptions
 *   - Unsupported characters
 *   - Timeout / failure scenarios
 */

/* ─── Response schema (matches what production Claude will return) ─── */

export type AIPollOption = {
  label: string;
  descriptionEn?: string;
  descriptionSw?: string;
};

export type AIPollGeneration = {
  titleEn: string;
  titleSw?: string;
  category: string;
  resolutionCriterion: string;
  resolutionAt: string;
  options: AIPollOption[];
  sources: Array<{ url: string; publisher: string }>;
  confidence: number;       // 0..100 — model self-assessment
  reasoning: string;        // model chain-of-thought summary
};

export type AIProviderResponse = {
  ok: boolean;
  generation?: AIPollGeneration;
  rawResponse?: string;     // for admin debugging
  error?: string;
  tokensUsed: number;
  costUsd: number;
  latencyMs: number;
};

export type GenerateRequest = {
  category: string;
  prompt?: string;          // optional admin freeform guidance
  locale?: "en" | "sw";
};

/* ─── Provider interface ─── */

export interface AIProvider {
  name: string;
  generate(req: GenerateRequest): Promise<AIProviderResponse>;
}

/* ─── Mock data pools ─── */

const MOCK_POLLS: Record<string, AIPollGeneration[]> = {
  sports: [
    {
      titleEn: "Will Simba SC win the Tanzanian Premier League 2026?",
      titleSw: "Je, Simba SC itashinda Ligi Kuu ya Tanzania 2026?",
      category: "sports",
      resolutionCriterion: "Official TFF announcement of 2026 TPL champion. Simba SC must be declared winner.",
      resolutionAt: new Date(Date.now() + 30 * 86400_000).toISOString(),
      options: [
        { label: "YES", descriptionEn: "Simba SC wins TPL 2026", descriptionSw: "Simba SC inashinda" },
        { label: "NO", descriptionEn: "Another team wins", descriptionSw: "Timu nyingine inashinda" },
      ],
      sources: [
        { url: "https://www.tff.or.tz/news/2026-season", publisher: "TFF Official" },
        { url: "https://www.bbc.com/swahili/habari", publisher: "BBC Swahili" },
      ],
      confidence: 88,
      reasoning: "High-profile domestic league question with clear binary outcome and official resolution source (TFF). Strong public interest in Tanzania.",
    },
    {
      titleEn: "Will Young Africans SC qualify for CAF Champions League group stage?",
      titleSw: "Je, Young Africans SC itafuzu hatua ya makundi ya CAF Champions League?",
      category: "sports",
      resolutionCriterion: "CAF official confirmation that Young Africans SC has qualified for the 2026 Champions League group stage.",
      resolutionAt: new Date(Date.now() + 45 * 86400_000).toISOString(),
      options: [
        { label: "YES", descriptionEn: "Yanga qualifies for group stage" },
        { label: "NO", descriptionEn: "Yanga eliminated in qualifiers" },
      ],
      sources: [
        { url: "https://www.cafonline.com/champions-league", publisher: "CAF Online" },
      ],
      confidence: 82,
      reasoning: "Well-defined sporting event with clear qualification criteria. CAF publishes official results.",
    },
  ],
  macro: [
    {
      titleEn: "Will Tanzania GDP growth exceed 6% in Q3 2026?",
      titleSw: "Je, ukuaji wa GDP wa Tanzania utazidi 6% katika Q3 2026?",
      category: "macro",
      resolutionCriterion: "National Bureau of Statistics (NBS) Tanzania quarterly GDP report showing Q3 2026 growth rate.",
      resolutionAt: new Date(Date.now() + 120 * 86400_000).toISOString(),
      options: [
        { label: "YES", descriptionEn: "GDP growth > 6%" },
        { label: "NO", descriptionEn: "GDP growth <= 6%" },
      ],
      sources: [
        { url: "https://www.nbs.go.tz/", publisher: "NBS Tanzania" },
        { url: "https://www.imf.org/en/Countries/TZA", publisher: "IMF" },
      ],
      confidence: 79,
      reasoning: "Macro-economic indicator with official government reporting. Clear threshold for resolution.",
    },
  ],
  weather: [
    {
      titleEn: "Will Dar es Salaam receive over 200mm rainfall in July 2026?",
      titleSw: "Je, Dar es Salaam itapokea mvua zaidi ya 200mm Julai 2026?",
      category: "weather",
      resolutionCriterion: "Tanzania Meteorological Authority (TMA) official monthly rainfall report for Dar es Salaam, July 2026.",
      resolutionAt: new Date(Date.now() + 60 * 86400_000).toISOString(),
      options: [
        { label: "YES", descriptionEn: "Over 200mm recorded" },
        { label: "NO", descriptionEn: "200mm or less recorded" },
      ],
      sources: [
        { url: "https://www.meteo.go.tz/", publisher: "TMA" },
      ],
      confidence: 76,
      reasoning: "Weather prediction with official meteorological authority as resolution source. July is typically dry season — interesting market.",
    },
  ],
  crypto: [
    {
      titleEn: "Will Bitcoin price exceed $150,000 USD by end of August 2026?",
      titleSw: "Je, bei ya Bitcoin itazidi $150,000 USD ifikapo mwisho wa Agosti 2026?",
      category: "crypto",
      resolutionCriterion: "CoinGecko BTC/USD price at 23:59 UTC on August 31, 2026. Must show price above $150,000.",
      resolutionAt: new Date(Date.now() + 90 * 86400_000).toISOString(),
      options: [
        { label: "YES", descriptionEn: "BTC > $150K" },
        { label: "NO", descriptionEn: "BTC <= $150K" },
      ],
      sources: [
        { url: "https://www.coingecko.com/en/coins/bitcoin", publisher: "CoinGecko" },
      ],
      confidence: 85,
      reasoning: "Clear price threshold with widely-accepted data source. High engagement topic globally.",
    },
  ],
  culture: [
    {
      titleEn: "Will Diamond Platnumz release a new album before October 2026?",
      titleSw: "Je, Diamond Platnumz atatoa albamu mpya kabla ya Oktoba 2026?",
      category: "culture",
      resolutionCriterion: "Official release on major streaming platforms (Spotify, Apple Music, Boomplay) of a new studio album by Diamond Platnumz before October 1, 2026.",
      resolutionAt: new Date(Date.now() + 120 * 86400_000).toISOString(),
      options: [
        { label: "YES", descriptionEn: "New album released" },
        { label: "NO", descriptionEn: "No album by deadline" },
      ],
      sources: [
        { url: "https://www.boomplay.com/", publisher: "Boomplay" },
      ],
      confidence: 72,
      reasoning: "Entertainment prediction with verifiable outcome via streaming platforms. Popular artist in Tanzania.",
    },
  ],
  infrastructure: [
    {
      titleEn: "Will the SGR Dodoma-Singida section begin operations before December 2026?",
      titleSw: "Je, sehemu ya SGR Dodoma-Singida itaanza huduma kabla ya Desemba 2026?",
      category: "infrastructure",
      resolutionCriterion: "Official announcement by RAHCO or Tanzania Railways Corporation of commercial operations beginning on the Dodoma-Singida SGR section.",
      resolutionAt: new Date(Date.now() + 180 * 86400_000).toISOString(),
      options: [
        { label: "YES", descriptionEn: "Operations begin" },
        { label: "NO", descriptionEn: "Not operational by deadline" },
      ],
      sources: [
        { url: "https://www.trc.go.tz/", publisher: "TRC" },
      ],
      confidence: 68,
      reasoning: "Infrastructure project with government oversight. Resolution depends on official government announcement.",
    },
  ],
};

/* ─── Edge-case / stress-test mock responses ─── */

type MockScenario = "clean" | "incomplete" | "malformed" | "empty" | "duplicate_options" | "long_text" | "bad_chars" | "wrong_category" | "timeout" | "error";

const SCENARIO_WEIGHTS: Array<[MockScenario, number]> = [
  ["clean", 88],
  ["incomplete", 2],
  ["malformed", 1],
  ["empty", 1],
  ["duplicate_options", 2],
  ["long_text", 1],
  ["bad_chars", 1],
  ["wrong_category", 1],
  ["timeout", 1],
  ["error", 2],
];

function pickScenario(): MockScenario {
  const total = SCENARIO_WEIGHTS.reduce((s, [, w]) => s + w, 0);
  let r = Math.random() * total;
  for (const [scenario, weight] of SCENARIO_WEIGHTS) {
    r -= weight;
    if (r <= 0) return scenario;
  }
  return "clean";
}

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function simulateLatency(): number {
  return 800 + Math.random() * 2200; // 0.8s - 3s
}

function simulateTokens(): number {
  return 1200 + Math.floor(Math.random() * 3000);
}

function simulateCost(tokens: number): number {
  return Math.round(tokens * 0.000015 * 100) / 100; // ~$0.015/1k tokens
}

/* ─── Mock provider ─── */

export class MockClaudeProvider implements AIProvider {
  name = "mock-claude-opus";

  async generate(req: GenerateRequest): Promise<AIProviderResponse> {
    const scenario = pickScenario();
    const latency = simulateLatency();
    const tokens = simulateTokens();
    const cost = simulateCost(tokens);

    // Simulate network delay
    await new Promise((r) => setTimeout(r, Math.min(latency, 500)));

    switch (scenario) {
      case "clean": {
        const category = req.category || "sports";
        const pool = MOCK_POLLS[category] ?? MOCK_POLLS.sports;
        const poll = { ...randomFrom(pool) };
        // Randomize confidence slightly
        poll.confidence = Math.max(50, Math.min(100, poll.confidence + Math.floor(Math.random() * 20 - 10)));
        return {
          ok: true,
          generation: poll,
          rawResponse: JSON.stringify(poll, null, 2),
          tokensUsed: tokens,
          costUsd: cost,
          latencyMs: latency,
        };
      }

      case "incomplete": {
        const pool = MOCK_POLLS[req.category] ?? MOCK_POLLS.sports;
        const base = randomFrom(pool);
        // Missing fields
        return {
          ok: true,
          generation: {
            titleEn: base.titleEn,
            category: base.category,
            resolutionCriterion: "",  // missing
            resolutionAt: "",         // missing
            options: [],              // empty
            sources: [],
            confidence: 0,
            reasoning: "",
          },
          rawResponse: '{"titleEn":"' + base.titleEn + '","options":[]}',
          tokensUsed: tokens,
          costUsd: cost,
          latencyMs: latency,
        };
      }

      case "malformed": {
        return {
          ok: true,
          generation: {
            titleEn: "{{UNTERMINATED TEMPLATE",
            category: "???invalid???",
            resolutionCriterion: "null",
            resolutionAt: "not-a-date",
            options: [{ label: "" }, { label: "" }],
            sources: [{ url: "not-a-url", publisher: "" }],
            confidence: -5,
            reasoning: "",
          },
          rawResponse: '{"error": "partial parse", "titleEn": "{{UNTERMINATED',
          tokensUsed: tokens,
          costUsd: cost,
          latencyMs: latency,
        };
      }

      case "empty": {
        return {
          ok: true,
          generation: {
            titleEn: "",
            category: "",
            resolutionCriterion: "",
            resolutionAt: "",
            options: [],
            sources: [],
            confidence: 0,
            reasoning: "",
          },
          rawResponse: "{}",
          tokensUsed: Math.floor(tokens * 0.1),
          costUsd: Math.round(cost * 0.1 * 100) / 100,
          latencyMs: latency * 0.3,
        };
      }

      case "duplicate_options": {
        const pool = MOCK_POLLS[req.category] ?? MOCK_POLLS.sports;
        const base = randomFrom(pool);
        return {
          ok: true,
          generation: {
            ...base,
            options: [
              ...base.options,
              ...base.options, // duplicated
              { label: "YES", descriptionEn: "Duplicate YES again" },
            ],
            confidence: base.confidence - 15,
            reasoning: base.reasoning + " [Note: model produced duplicate options]",
          },
          rawResponse: JSON.stringify({ ...base, note: "duplicates present" }),
          tokensUsed: tokens,
          costUsd: cost,
          latencyMs: latency,
        };
      }

      case "long_text": {
        return {
          ok: true,
          generation: {
            titleEn: "A".repeat(500) + " — This title is absurdly long and exceeds any reasonable display limit for a prediction market poll title in any language",
            titleSw: "B".repeat(500),
            category: req.category || "sports",
            resolutionCriterion: "C".repeat(2000),
            resolutionAt: new Date(Date.now() + 30 * 86400_000).toISOString(),
            options: [
              { label: "YES", descriptionEn: "D".repeat(500) },
              { label: "NO", descriptionEn: "E".repeat(500) },
            ],
            sources: [{ url: "https://example.com", publisher: "Test" }],
            confidence: 60,
            reasoning: "F".repeat(1000),
          },
          rawResponse: "[long text response truncated]",
          tokensUsed: tokens * 3,
          costUsd: cost * 3,
          latencyMs: latency * 1.5,
        };
      }

      case "bad_chars": {
        return {
          ok: true,
          generation: {
            titleEn: "Will \u0000null\u0000 bytes \uFFFD and <script>alert('xss')</script> break the UI?",
            titleSw: "\u200B\u200B\u200Bzero-width\u200B\u200B spaces",
            category: req.category || "sports",
            resolutionCriterion: 'Resolution with "smart quotes" and em—dashes and \t\ttabs',
            resolutionAt: new Date(Date.now() + 30 * 86400_000).toISOString(),
            options: [
              { label: "YES\n\n", descriptionEn: "<b>Bold injection</b>" },
              { label: "NO\r\n", descriptionEn: "Normal option" },
            ],
            sources: [{ url: "javascript:alert(1)", publisher: '<img onerror="alert(1)">' }],
            confidence: 45,
            reasoning: "Testing sanitisation boundaries.",
          },
          rawResponse: "[bad chars scenario]",
          tokensUsed: tokens,
          costUsd: cost,
          latencyMs: latency,
        };
      }

      case "wrong_category": {
        const pool = MOCK_POLLS.culture;
        const base = randomFrom(pool);
        return {
          ok: true,
          generation: {
            ...base,
            category: "politics",  // explicitly banned
            confidence: 90,
            reasoning: "Model returned a politics category which is banned under GBT license.",
          },
          rawResponse: JSON.stringify({ ...base, category: "politics" }),
          tokensUsed: tokens,
          costUsd: cost,
          latencyMs: latency,
        };
      }

      case "timeout": {
        await new Promise((r) => setTimeout(r, 800));
        return {
          ok: false,
          error: "Request timed out after 30000ms — Claude API did not respond.",
          tokensUsed: 0,
          costUsd: 0,
          latencyMs: 30000,
        };
      }

      case "error": {
        return {
          ok: false,
          error: randomFrom([
            "Claude API rate limit exceeded (429). Retry after 60s.",
            "Internal server error from Claude API (500).",
            "Invalid API key or subscription expired.",
            "Content policy violation — prompt was flagged.",
            "Model overloaded — try again later.",
          ]),
          tokensUsed: 0,
          costUsd: 0,
          latencyMs: latency * 0.2,
        };
      }
    }
  }
}

/* ─── Provider factory — swap mock → real here ─── */

import { ClaudeProvider } from "./ai-provider-claude";

let _provider: AIProvider | null = null;

export function getAIProvider(): AIProvider {
  if (_provider) return _provider;

  // Use real Claude when API key is set, mock otherwise (dev/test)
  if (process.env.ANTHROPIC_API_KEY) {
    _provider = new ClaudeProvider(process.env.ANTHROPIC_API_KEY);
    return _provider;
  }

  _provider = new MockClaudeProvider();
  return _provider;
}

/** Allow tests to inject a custom provider. */
export function setAIProvider(p: AIProvider) {
  _provider = p;
}
