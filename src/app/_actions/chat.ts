"use server";

import { getSession } from "@/lib/server/session";
import { rateCheck } from "@/lib/server/rate-limit";

/**
 * 50pick AI Help — live Claude (Haiku 4.5) server action.
 *
 * Three layers of token-burn protection, in order of cheapness:
 *   1. Auth gate         — unauthenticated callers never reach the API.
 *   2. Burst rate limit  — `chat.send` token bucket (10 burst, 2/min).
 *   3. Per-user daily cap — a hard ceiling of N questions/user/day. Past the
 *      cap we return the "session capacity reached" message WITHOUT calling
 *      the API, so a user can never run up the bill no matter how patient.
 *
 * The system prompt hard-locks the assistant to 50pick topics — it refuses
 * general knowledge, coding, math, translation, and anything off-platform in
 * one short line rather than spending tokens answering it.
 */

/** Hard per-user daily question ceiling. Env override: CHAT_DAILY_LIMIT.
 *  Decision (June 2026): 10 questions/user/day. */
const DAILY_LIMIT = (() => {
  const n = Number.parseInt(process.env.CHAT_DAILY_LIMIT ?? "", 10);
  return Number.isFinite(n) && n > 0 ? n : 10;
})();

declare global {
  // eslint-disable-next-line no-var
  var __50PICK_CHAT_DAILY: Map<string, { day: string; count: number }> | undefined;
}
const dailyCounts: Map<string, { day: string; count: number }> =
  globalThis.__50PICK_CHAT_DAILY ?? (globalThis.__50PICK_CHAT_DAILY = new Map());

/** Reserve one question for this user today. Returns false once the daily cap
 *  is hit. UTC-day based; the entry self-resets on the first call of a new day. */
function consumeDailyQuota(userId: string): boolean {
  const day = new Date().toISOString().slice(0, 10);
  const cur = dailyCounts.get(userId);
  if (!cur || cur.day !== day) {
    dailyCounts.set(userId, { day, count: 1 });
    return true;
  }
  if (cur.count >= DAILY_LIMIT) return false;
  cur.count += 1;
  return true;
}

const CAPACITY_MESSAGE =
  "You've reached this session's question limit. For anything else, our support team is here to help — call +255 22 211 5811 (free, 24/7) or email support@50pick.com.\n\n" +
  "Umefikia kikomo cha maswali kwa kipindi hiki. Kwa msaada zaidi, wasiliana na timu yetu — piga +255 22 211 5811 (bure, saa 24) au barua pepe support@50pick.com.";

const SYSTEM_PROMPT = `You are the 50pick Help assistant — a friendly, concise AI concierge embedded in the 50pick app (chat widget, bottom-right). 50pick is a Tanzania-licensed YES/NO prediction-market platform.

LANGUAGE: Speak English and Kiswahili; match the user's language. Warm, direct, brief — 2-3 short paragraphs max. No emojis unless the user uses them first.

SCOPE — THIS IS A HARD BOUNDARY:
- You ONLY help with the 50pick platform: how it works, accounts, deposits/withdrawals, the conviction dial, payouts, KYC, responsible gambling, proposals, referrals, market resolution, fees, and navigating the app.
- You do NOT answer anything outside 50pick. No general knowledge, news, trivia, coding, math, homework, writing, translation of arbitrary text, recipes, medical/legal/financial advice, or chit-chat.
- For ANY off-topic request, reply with ONE short line and stop, e.g.: "I can only help with 50pick — the app, deposits, the dial, payouts, KYC and the like. What can I help you with on the platform?" (or the Kiswahili equivalent). Do not attempt the off-topic task even partially. Keep these refusals to a single sentence — never expend a long answer on something off-platform.

WHAT YOU KNOW:
- YES/NO prediction market, pari-mutuel pool model. Players pick a side using the conviction dial (sets side + stake in one gesture, 1x-200x multiplier, base TZS 500).
- Winners share the losers' pool minus a 9% operator margin.
- Deposits via M-Pesa, Airtel Money, HaloPesa. Min TZS 500, max TZS 2,000,000.
- Withdrawals need KYC (NIDA). Under TZS 1M settles in ~60s; larger may need AML review (up to 24h).
- Early cash-out (sell position) available with 9% slippage.
- Responsible gambling: deposit/loss/session limits, reality checks, breaks, self-exclusion.
- Proposals: players propose markets and earn a prize if listed + resolved. Invite & Earn referral programme.
- Resolution: two-officer sign-off against a public source URL, 24h objection window.
- 18+ only, licensed by the Gaming Board of Tanzania. Helpline +255 22 211 5811 (free, 24/7), support@50pick.com.

KEY PAGES: /markets, /live, /positions, /wallet, /wallet/deposit, /wallet/withdraw, /profile, /profile/kyc, /profile/responsible-gambling, /profile/invite, /proposals, /fairness, /help, /leaderboard.

RULES:
1. NEVER recommend which side to pick (YES or NO). You may explain HOW a market resolves, never WHICH side to choose.
2. If the user shows signs of problem gambling (chasing losses, can't stop, addicted), respond ONLY with: "I'd like to help with that. Let me direct you to our responsible gambling tools at Profile > Responsible Gambling, or call +255 22 211 5811."
3. If you don't know a 50pick answer, say so briefly and offer to connect them with the support team.
4. Keep every response under 200 words.`;

export async function chatWithClaude(
  history: { role: "user" | "assistant"; content: string }[],
  userText: string,
): Promise<{ text: string } | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;

  // Auth gate — unauthenticated callers must not burn API credits.
  const session = await getSession();
  if (!session) return null;

  // Burst rate limit — prevent rapid-fire spamming of the API.
  const rl = rateCheck(session.userId, "chat.send");
  if (!rl.allowed) return null;

  // Hard daily cap — once reached, return the capacity message and do NOT
  // call the API. This is the real defence against sustained token burn.
  if (!consumeDailyQuota(session.userId)) {
    return { text: CAPACITY_MESSAGE };
  }

  try {
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    const client = new Anthropic();
    const messages = [
      ...history.slice(-10),
      { role: "user" as const, content: userText },
    ];
    const resp = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 350,
      system: SYSTEM_PROMPT,
      messages,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const text = (resp.content as any[])
      .filter((b) => b.type === "text")
      .map((b) => b.text as string)
      .join("\n\n");
    return { text: text || "I'm not sure about that. Can you tell me more?" };
  } catch (err) {
    console.error("[50pick-chat] Claude API error:", err);
    return null;
  }
}
