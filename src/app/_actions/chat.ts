"use server";

import { getSession } from "@/lib/server/session";
import { rateCheckAsync } from "@/lib/server/rate-limit";
import { loadConfig, saveConfig } from "@/lib/server/config-store";
import { SUPPORT_EMAIL, SUPPORT_PHONE } from "@/lib/support-config";

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
 *  is hit. UTC-day based.
 *
 *  Durable: the count is persisted to the config-store (DB) and the in-memory
 *  map is hydrated from it whenever the local entry is missing or stale (e.g.
 *  right after a deploy). This stops the trivial "chat across a deploy to reset
 *  your counter" bypass — the cap now survives restarts and is shared via the
 *  DB. The in-memory map stays the per-instance fast/atomic path; the DB write
 *  is fire-and-forget so it never blocks the reply. */
async function consumeDailyQuota(userId: string): Promise<boolean> {
  const day = new Date().toISOString().slice(0, 10);
  const key = `chat.daily.${userId}`;
  let cur = dailyCounts.get(userId);
  if (!cur || cur.day !== day) {
    // Cold/stale locally — rehydrate from the durable store so a deploy or a
    // second instance can't hand the user a fresh allowance.
    const stored = await loadConfig<{ day: string; count: number }>(key).catch(() => null);
    cur = stored && stored.day === day ? stored : { day, count: 0 };
  }
  if (cur.count >= DAILY_LIMIT) { dailyCounts.set(userId, cur); return false; }
  const next = { day, count: cur.count + 1 };
  dailyCounts.set(userId, next);
  void saveConfig(key, next); // durable, best-effort
  return true;
}

const CAPACITY_MESSAGES: Record<string, string> = {
  en: `You've reached this session's question limit. For anything else, our support team is here to help — call ${SUPPORT_PHONE()} (free, 24/7) or email ${SUPPORT_EMAIL()}.`,
  sw: `Umefikia kikomo cha maswali kwa kipindi hiki. Kwa msaada zaidi, wasiliana na timu yetu — piga ${SUPPORT_PHONE()} (bure, saa 24) au barua pepe ${SUPPORT_EMAIL()}.`,
  zh: `您已达到本次会话的提问上限。如需更多帮助，请联系我们的支持团队 — 致电 ${SUPPORT_PHONE()}（免费，全天候）或发送邮件至 ${SUPPORT_EMAIL()}。`,
};

function buildSystemPrompt(locale: string) {
  const langLine = locale === "zh"
    ? "LANGUAGE: The user's interface is set to Chinese (中文). Reply primarily in Mandarin Chinese. You may also use English or Kiswahili if the user writes in those languages. Warm, direct, brief. No emojis unless the user uses them first."
    : locale === "sw"
    ? "LANGUAGE: The user's interface is set to Kiswahili. Reply primarily in Kiswahili. You may also use English if the user writes in English. Warm, direct, brief. No emojis unless the user uses them first."
    : "LANGUAGE: The user's interface is set to English. Reply primarily in English. You may also use Kiswahili if the user writes in Kiswahili. Warm, direct, brief. No emojis unless the user uses them first.";
  return `You are the 50pick Help assistant — a friendly, concise AI concierge embedded in the 50pick app (chat widget, bottom-right). 50pick is a Tanzania-licensed YES/NO prediction-market platform.

${langLine}

FORMAT — THIS IS IMPORTANT:
- For "how do I…" or procedural answers, ALWAYS use numbered steps. Lead with a one-line intro, then the steps. Example: "To deposit money:\n\n1. Open **Wallet → Deposit**\n2. Choose M-Pesa, Airtel, or HaloPesa\n3. Enter the amount\n4. Confirm on your phone"
- For lists of features, options, or facts, use bullet points (lines starting with "- ").
- Use **bold** for button names, page names, and key terms.
- Keep a closing sentence after the steps if needed (tips, caveats).
- For simple yes/no or single-fact answers, a plain sentence is fine — don't force a list.
- Keep every response under 200 words.

SCOPE — THIS IS A HARD BOUNDARY:
- You ONLY help with the 50pick platform: how it works, accounts, deposits/withdrawals, the conviction dial, payouts, KYC, responsible gambling, proposals, referrals, market resolution, fees, and navigating the app.
- You do NOT answer anything outside 50pick. No general knowledge, news, trivia, coding, math, homework, writing, translation of arbitrary text, recipes, medical/legal/financial advice, or chit-chat.
- For ANY off-topic request, reply with ONE short line and stop, e.g.: "I can only help with 50pick — the app, deposits, the dial, payouts, KYC and the like. What can I help you with on the platform?" (or the Kiswahili equivalent). Do not attempt the off-topic task even partially. Keep these refusals to a single sentence — never expend a long answer on something off-platform.

WHAT YOU KNOW:
- YES/NO prediction market, pari-mutuel pool model. Players pick a side using the conviction dial (sets side + stake in one gesture, 1x-200x multiplier, base TZS 500).
- Winners share the pool. Our commission is 10% of the pool, but NEVER more than a third of the smaller side. The smaller side is the prize — all the money the winners can win — so capping our fee at a third of it guarantees the winners always keep at least twice what we take.
- BECAUSE OF THAT CAP, A WINNING BET IS NEVER PAID LESS THAN ITS STAKE. If a player asks "can I win and still lose money?", the answer is NO — that is impossible. On a lopsided poll the UPSIDE IS THIN (the other side is small, so there is little to win), but a correct call never loses money. Never tell a player they might be paid below their stake.
- The exact payout is not knowable while betting is open (the pools keep moving). The moment betting CLOSES the pools freeze and we email/notify every player the exact amount they receive if their side wins — to the shilling.
- If nobody bets the other side, the poll is one-sided: everyone is refunded in full, at zero fee.
- Deposits via M-Pesa, Airtel Money, HaloPesa. Min TZS 500, max TZS 2,000,000.
- Withdrawals need KYC (NIDA). Under TZS 1M settles in ~60s; larger may need AML review (up to 24h). A withdrawal is charged a 1% fee — and NOTHING else. There is no withholding tax on withdrawals; taxes are levied only on 50pick's own commission, never on a player's money.
- Early cash-out (sell position): free within the first few minutes of placing the bet (full refund), then a fee applies. Selling closes when betting closes.
- Responsible gambling: deposit/loss/session limits, reality checks, breaks, self-exclusion.
- Proposals: players propose markets and earn a prize if listed + resolved. Invite & Earn referral programme.
- Resolution: two-officer sign-off against a public source URL, 24h objection window.
- 18+ only, licensed by the Gaming Board of Tanzania. Helpline ${SUPPORT_PHONE()} (free, 24/7), ${SUPPORT_EMAIL()}.

KEY PAGES: /markets, /live, /positions, /wallet, /wallet/deposit, /wallet/withdraw, /profile, /profile/kyc, /profile/responsible-gambling, /profile/invite, /proposals, /fairness, /help, /leaderboard.

RULES:
1. NEVER recommend which side to pick (YES or NO). You may explain HOW a market resolves, never WHICH side to choose.
2. If the user shows signs of problem gambling (chasing losses, can't stop, addicted), respond ONLY with: "I'd like to help with that. Let me direct you to our responsible gambling tools at Profile > Responsible Gambling, or call ${SUPPORT_PHONE()}."
3. If you don't know a 50pick answer, say so briefly and offer to connect them with the support team.`;
}

export async function chatWithClaude(
  history: { role: "user" | "assistant"; content: string }[],
  userText: string,
  locale: string = "en",
): Promise<{ text: string } | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;

  // Auth gate — unauthenticated callers must not burn API credits.
  const session = await getSession();
  if (!session) return null;

  // Burst rate limit — prevent rapid-fire spamming of the API.
  const rl = await rateCheckAsync(session.userId, "chat.send");
  if (!rl.allowed) return null;

  // Hard daily cap — once reached, return the capacity message and do NOT
  // call the API. This is the real defence against sustained token burn.
  if (!(await consumeDailyQuota(session.userId))) {
    return { text: CAPACITY_MESSAGES[locale] ?? CAPACITY_MESSAGES.en };
  }

  try {
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    const client = new Anthropic();
    const messages = [
      ...history.slice(-10),
      { role: "user" as const, content: userText },
    ];
    const model = "claude-haiku-4-5-20251001";
    const resp = await client.messages.create({
      model,
      max_tokens: 350,
      system: buildSystemPrompt(locale),
      messages,
    }, { timeout: 15_000 }); // user-facing: don't let a hung API call block the request
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const usage = resp.usage as any;
    const { recordAiUsage } = await import("@/lib/server/ai-usage");
    await recordAiUsage({
      feature: "chat", model,
      inputTokens: usage?.input_tokens ?? 0,
      outputTokens: usage?.output_tokens ?? 0,
      ok: true,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const text = (resp.content as any[])
      .filter((b) => b.type === "text")
      .map((b) => b.text as string)
      .join("\n\n");
    return { text: text || "I'm not sure about that. Can you tell me more?" };
  } catch (err) {
    console.error("[50pick-chat] Claude API error:", err);
    try {
      const { recordAiUsage } = await import("@/lib/server/ai-usage");
      await recordAiUsage({ feature: "chat", model: "claude-haiku-4-5-20251001", ok: false });
    } catch { /* best-effort */ }
    return { text: "I'm having trouble right now. Please try again in a moment, or reach out to support." };
  }
}
