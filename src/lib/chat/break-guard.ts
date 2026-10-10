/**
 * THE THREE PROGRAMMES, AS A CHAT CAN NAME THEM — R8-D (2026-10-10, the owner's ruling (4) completed; owner items 16 and 56).
 *
 * During a reader's break the Help chat shows no door to the three programmes that pay for activity: Alika (the invite,
 * /profile/invite), Mapendekezo (Propose & earn, /proposals) and Kuwa wakala (Become an agent, /agent). `chat-reader.ts` asks
 * this module one question of two texts — the reader's question and the model's answer: does it touch one of them? ONE
 * vocabulary answers both: the three routes, and the words the product itself gives the three doors in en, sw and zh (the
 * dictionary's `profile.inviteFriends`, `proposals.title`, `footer.proposeGetPaid`, `agent.footerLink`; the live prompt's own
 * "referral link" and "Agent Affiliates"; the offline answers' "Profile → Invite friends").
 * ⛔ NARROW ON PURPOSE — an ordinary answer must never be taken for an offer. "agent" alone is a support agent, "wakala" alone
 * an M-Pesa agent, "pendekeza" alone is "recommend" (RULE 1's own refusal says "sipendekezi upande wowote"), 推荐 alone is
 * "recommend", and "alikuwa" is "he was": each is matched only in the compound that names a programme.
 * Pure — no I/O, no React, no server import — so a suite runs it directly.
 */

/** Every way a text can touch one of the three programmes. */
export const OFFER_PATTERNS: readonly RegExp[] = [
  // the three doors' routes
  /\/profile\/invite\b/i,
  /\/proposals\b/i,
  /\/agent\b/i,
  // English
  /\binvit(?:e|es|ed|ing|ation|ations)\b/i,
  /\breferr?als?\b/i,
  /\brefer (?:a |your )?friends?\b/i,
  /\baffiliates?\b/i,
  /\bpropos(?:e|es|ed|ing|al|als)\b/i,
  /\bsuggest(?:ing)? a market\b/i,
  /\b(?:become|becoming|be) an? (?:verified )?(?:50pick )?agent\b/i,
  /\bagent (?:programme|program|application|dashboard|code)\b/i,
  // Kiswahili
  // "alika" with the prefixes a question takes (ku-, kuwa-, wa-) — never a longer word that only contains it ("alikuwa").
  /(?<![a-z])(?:ku|kuwa|wa)?alik(?:a|e|wa)\b/i,
  /\bmwaliko\b/i,
  /\bmialiko\b/i,
  /\bmapendekezo\b/i,
  // "pendekeza" only with the market it proposes — any verb prefix ("kupendekeza soko", "ninapendekeza masoko").
  /pendekez[a-z]* (?:soko|masoko)\b/i,
  /\bkuwa wakala\b/i,
  /\buwakala\b/i,
  /\bwakala wa 50pick\b/i,
  // 中文
  /邀请/,
  /推荐(?:码|链接|奖励)/,
  /提案/,
  /提议市场|市场提议/,
  /成为代理|代理(?:计划|申请|项目)|认证代理/,
];

/** Does this text touch one of the three programmes — name a door, or ask about one? */
export function touchesAnOffer(text: string): boolean {
  return OFFER_PATTERNS.some((re) => re.test(text));
}
