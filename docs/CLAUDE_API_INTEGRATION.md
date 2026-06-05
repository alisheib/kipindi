# Claude API integration — response shape, parsing, error handling

**Status:** Specification + worked examples. Not wired yet (no `ANTHROPIC_API_KEY` set). Once the key lands, swap in the `LIVE MODE` branch of [src/lib/chat/send-message.ts](../src/lib/chat/send-message.ts) and ship — no other file changes required.

---

## 1 · Install + import

```bash
npm install @anthropic-ai/sdk
```

```ts
// src/lib/chat/send-message.ts (top of file)
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  // Reads ANTHROPIC_API_KEY automatically from the environment.
  // Optional: maxRetries: 3 (default 2), timeout: 60_000 ms (default 600s).
});
```

Use **`claude-haiku-4-5-20251001`** for the help companion. Cheaper + faster than Opus/Sonnet; sufficient quality for support FAQ + RG-detection + escalation hand-off. Reserve Opus/Sonnet for the market-candidate pipeline.

---

## 2 · System prompt (the persona contract)

```ts
const SYSTEM_PROMPT = `
You are the 50pick Help Companion — an AI concierge for a licensed
Tanzania prediction-market platform. Your scope is strictly the
platform: deposits, the conviction dial, payouts, KYC, market rules,
how resolution works.

Rules:
- Reply in the LANGUAGE the player wrote in. English ↔ Swahili. Detect
  from their last message; never volunteer a language switch.
- NEVER give betting advice. Refuse cleanly: explain mechanics, never
  pick a side.
- If the player uses at-risk language ("losing too much", "can't stop",
  "chase my losses", "kucheza kunakuathiri"), reply with structured
  JSON: { kind: "rg_redirect", lang: "en" | "sw" }. No prose.
- If you cannot answer or the player explicitly asks for a person,
  reply with structured JSON: { kind: "escalate", lang, ticketId,
  etaMinutes }.
- For factual platform questions, cite sources. Use /help#... and
  /legal/... anchors. Embed citations as [1], [2], [3] in the prose,
  and emit a citations array.
- For numerals (TZS, %, IDs, durations), wrap in {curly braces} so
  the renderer applies tabular-nums treatment.
- Never refer to the support team as "human" or "person" — always
  "support team" / "timu ya msaada".
- Never mention betting odds, hot tips, lucky numbers, or implied
  outcomes.

Reply ALWAYS as valid JSON matching one of the four schemas in §4.
`.trim();
```

---

## 3 · Tool use — web_search for "current state" questions

When the player asks something the static knowledge base can't answer (e.g. "what markets are open right now?", "what's the current USD/TZS rate?"), pass the `web_search` tool. Claude will call it and fold the results into the reply.

```ts
const TOOLS = [
  {
    type: "web_search_20250320" as const,
    name: "web_search",
  },
];
```

The model will return additional tool_use blocks in the response — see §5 for parsing.

---

## 4 · Reply shapes the renderer expects

All four shapes match the `Message` discriminated union in [src/components/chat/types.ts](../src/components/chat/types.ts).

### 4a · Plain text reply
```json
{
  "kind": "text",
  "lang": "en",
  "text": "Yanga SC needs only a draw at JKT Tanzania on 29 May to clinch the title.",
  "unresolved": false
}
```

### 4b · Text with inline citations + sources footer
```json
{
  "kind": "text_with_citations",
  "lang": "en",
  "paragraphs": [
    "Deposits land in your wallet within about {30 seconds} of M-Pesa confirmation. The minimum is TZS {1,000} and the daily cap before KYC tier 2 is TZS {200,000}[1].",
    "If the deposit doesn't arrive within {2 minutes}, it usually means M-Pesa returned a soft failure — your money is safe and the transaction will auto-reverse within {24 hours}[2]."
  ],
  "citations": [
    { "n": 1, "href": "/help#deposits",       "label": "/help#deposits" },
    { "n": 2, "href": "/help#deposit-failed", "label": "/help#deposit-failed" }
  ]
}
```

Renderer in `messages/Primitives.tsx#renderParagraph` swaps `{...}` for `<Num>` and `[n]` for `<Cite n href>`. No HTML parsing — strict JSON.

### 4c · RG redirect (at-risk language detected)
```json
{
  "kind": "rg_redirect",
  "lang": "en"
}
```
No free text. The card itself supplies all copy.

### 4d · Escalate to support team
```json
{
  "kind": "escalate",
  "lang": "en",
  "ticketId": "HC-4421",
  "etaMinutes": 4
}
```
Triggers either by AI judgement OR by `ChatRoot.tsx` after **2 consecutive `unresolved: true` text replies** (see §6).

---

## 5 · Parsing the SDK response

`client.messages.create()` returns a `Message` object with a `content` array. For our use case (single-turn helper, optional web_search tool calls), we want the **last `text` block** the model emitted, parse it as JSON, and validate.

```ts
import type { Message as ChatMessage } from "@/components/chat/types";

async function callClaude(history: ChatMessage[], userText: string, lang: "en" | "sw"): Promise<ChatMessage> {
  const messages = [
    ...history.map((m) => ({
      role: m.role === "user" ? "user" : "assistant",
      content: m.role === "user" ? m.text : JSON.stringify(stripIdFromAi(m)),
    })),
    { role: "user" as const, content: userText },
  ];

  const resp = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    tools: TOOLS,
    messages,
  });

  // Iterate content blocks. Tool use blocks are handled by the SDK's
  // built-in execution for web_search_20250320; we just consume the
  // final `text` block.
  const textBlock = resp.content.find((b) => b.type === "text");
  if (!textBlock) {
    return {
      id: nextId(),
      role: "ai",
      kind: "text",
      lang,
      unresolved: true,
      text: lang === "sw"
        ? "Samahani, sijapata jibu. Nikukuelekeze kwa timu ya msaada?"
        : "Sorry, I didn't get a reply. Should I connect you with our support team?",
    };
  }

  return parseAndValidate(textBlock.text, lang);
}
```

### Parse + validate

The model's text content must be valid JSON matching one of the four shapes. Use a small validator instead of a heavy schema library to keep the cold-start light.

```ts
function parseAndValidate(raw: string, lang: "en" | "sw"): ChatMessage {
  let obj: unknown;
  try {
    // Strip a code fence if the model wraps the JSON.
    const stripped = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
    obj = JSON.parse(stripped);
  } catch {
    return fallbackUnresolved(lang, "non-json response");
  }
  if (!obj || typeof obj !== "object" || !("kind" in obj)) {
    return fallbackUnresolved(lang, "missing kind");
  }
  const o = obj as { kind: string };
  switch (o.kind) {
    case "text":
    case "text_with_citations":
    case "rg_redirect":
    case "escalate":
      return { id: nextId(), role: "ai", ...obj } as ChatMessage;
    default:
      return fallbackUnresolved(lang, `unknown kind ${o.kind}`);
  }
}

function fallbackUnresolved(lang: "en" | "sw", reason: string): ChatMessage {
  console.warn("[chat] fallback unresolved:", reason);
  return {
    id: nextId(),
    role: "ai",
    kind: "text",
    lang,
    unresolved: true,
    text: lang === "sw"
      ? "Sijapata uhakika. Nikukuelekeze kwa timu ya msaada?"
      : "I'm not sure. Should I connect you with our support team?",
  };
}
```

The `unresolved: true` flag on the fallback chains into the auto-escalate logic — after 2 in a row, [ChatRoot.tsx](../src/components/chat/ChatRoot.tsx) appends an escalate card on its own.

---

## 6 · Error handling

The SDK throws structured errors. Handle each class explicitly — never let an exception bubble to the UI as a blank message.

```ts
try {
  const reply = await callClaude(history, userText, lang);
  return reply;
} catch (e) {
  if (e instanceof Anthropic.APIConnectionTimeoutError) {
    return fallbackUnresolved(lang, "timeout");
  }
  if (e instanceof Anthropic.APIConnectionError) {
    return fallbackUnresolved(lang, "connection");
  }
  if (e instanceof Anthropic.RateLimitError) {
    // 429 — exponential backoff handled by SDK retries; if we still
    // land here, surface a calm "please retry" reply.
    return {
      id: nextId(),
      role: "ai", kind: "text", lang, unresolved: true,
      text: lang === "sw"
        ? "Mfumo una shughuli nyingi sasa. Jaribu tena baada ya muda kidogo."
        : "I'm a bit busy right now. Try again in a moment.",
    };
  }
  if (e instanceof Anthropic.AuthenticationError) {
    // 401 — bad API key. Critical: alert ops, never expose to the user.
    console.error("[chat] CRITICAL: Anthropic auth failed", e);
    return fallbackUnresolved(lang, "auth");
  }
  if (e instanceof Anthropic.PermissionDeniedError) {
    // 403 — usually a tool the account isn't enabled for.
    console.error("[chat] permission denied", e);
    return fallbackUnresolved(lang, "permission");
  }
  if (e instanceof Anthropic.NotFoundError) {
    // 404 — wrong model id.
    console.error("[chat] model not found", e);
    return fallbackUnresolved(lang, "model");
  }
  if (e instanceof Anthropic.UnprocessableEntityError) {
    // 422 — bad request shape.
    console.error("[chat] bad request shape", e);
    return fallbackUnresolved(lang, "bad-request");
  }
  if (e instanceof Anthropic.InternalServerError) {
    // 5xx — Anthropic's side. SDK already retried; surface gently.
    return fallbackUnresolved(lang, "upstream-5xx");
  }
  // Unknown — log + fallback.
  console.error("[chat] unknown error", e);
  return fallbackUnresolved(lang, "unknown");
}
```

### Retry policy

The SDK retries `429`, `408`, `409`, and `5xx` automatically with exponential backoff (default 2 retries). For our use case bump to **3 retries with a 60-second total timeout** at construction:

```ts
const client = new Anthropic({
  maxRetries: 3,
  timeout: 60_000,
});
```

If all retries exhausted, the SDK throws the original error class.

---

## 7 · Rate-limit + timeout examples

### Rate-limit response (429)

The SDK exposes these headers on `RateLimitError`:

```ts
catch (e) {
  if (e instanceof Anthropic.RateLimitError) {
    const retryAfter = e.headers?.["retry-after"]; // seconds
    const limit = e.headers?.["anthropic-ratelimit-requests-limit"];
    const remaining = e.headers?.["anthropic-ratelimit-requests-remaining"];
    const reset = e.headers?.["anthropic-ratelimit-requests-reset"]; // ISO
    console.warn("[chat] rate-limited", { retryAfter, limit, remaining, reset });
    // ...calm "try again" reply
  }
}
```

In production add **a per-user request quota in front of the SDK call** (e.g. 30 chat turns per hour per user) so a single abusive client can't burn the org budget.

### Timeout example

If the model takes longer than `client.timeout` to respond, `APIConnectionTimeoutError` is thrown. Default is generous (10 min). For chat, 60 s is appropriate — a single helper reply should never need more.

```ts
const client = new Anthropic({ timeout: 60_000 });
```

---

## 8 · Cost model (Haiku 4.5, Tanzania pricing)

| Item | Cost |
|---|---|
| Input tokens | ~$1 / million tokens |
| Output tokens | ~$5 / million tokens |
| Web search call | ~$10 / 1,000 searches |

**Per chat turn (typical):**
- system prompt: ~600 tokens
- conversation history (5 turns): ~1,500 tokens
- user message: ~50 tokens
- model response: ~250 tokens
- → **~$0.003–0.008 per turn** (without web_search) · **~$0.02–0.05** (with one web_search per turn)

**Monthly projection (moderate volume):**
- 200 active users × 5 chat turns/week × 4 weeks = 4,000 turns/month
- At $0.01 average = **~$40/month**

The market-candidate pipeline runs on Opus/Sonnet and costs ~10× more per call but runs less often — budget separately.

---

## 9 · Testing the integration

Once the key is wired, add this test:

```bash
node scripts/chat-live-api-smoke.mjs
```

It should:
1. Open the chat panel
2. Send "How do I deposit?"
3. Wait for a `text_with_citations` reply
4. Assert citations are non-empty and href starts with `/help` or `/legal`
5. Send "I'm losing too much" → assert `rg_redirect` card renders
6. Send "I need a person" → assert `escalate` card renders
7. Total cost: < $0.05 per run

Until then, the stub in [src/lib/chat/send-message.ts](../src/lib/chat/send-message.ts) returns realistic samples of each reply kind so the UI demos end-to-end at zero cost.

---

## 10 · What to change when the key arrives

A single diff in [src/lib/chat/send-message.ts](../src/lib/chat/send-message.ts) — uncomment the `LIVE MODE` block at the bottom and remove the `stubReply()` branch above it. The rest of the codebase (every component, every state, every message type) stays unchanged.

```ts
// Before (stub)
export async function sendMessage(history, userText) {
  const lang = detectLang(userText);
  await new Promise((r) => setTimeout(r, 600));
  const reply = stubReply(userText, lang);
  return { ...reply, id: nextId() };
}

// After (live)
export async function sendMessage(history, userText) {
  const lang = detectLang(userText);
  if (!process.env.ANTHROPIC_API_KEY) {
    return stubReply(userText, lang);  // fallback if env drops
  }
  try {
    return await callClaude(history, userText, lang);
  } catch (e) {
    return handleClaudeError(e, lang);
  }
}
```

Push the key into Railway env, redeploy, done.
