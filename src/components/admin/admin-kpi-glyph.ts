import type { DuoGlyphKey } from "@/components/ui/glyphs";

/** A KPI's subject, independent of its value or current status. Keep this at the shared
 * card door: the same "GGR" card must carry the same glyph on every admin page. More
 * specific phrases precede broad ones (for example, "withdrawal fee" before "fee"). */
const SUBJECTS: readonly [RegExp, DuoGlyphKey][] = [
  [/withdraw|cash.out|payout|paid out|paid by|returned to players|refund|unlocked to cash/i, "cashOut"],
  [/deposit|custodial cash|funded free cash|funded cycles/i, "arrowDownToLine"],
  [/wallet|liability|held for unverified/i, "wallet"],
  [/bonus|grant|jackpot|guarantee/i, "gift"],
  [/tax|levies|TRA \+ GBT/i, "tax"],
  // The desk builds these labels in its server reader rather than JSX literals.
  [/^Stake today$|^Loss today$/i, "coins"],
  [/fee|commission|GGR|NGR|margin|spend|cost|sales|staked|turnover|handle|pool|float|money frozen|exposure|loss limit|payable|free cash/i, "coins"],
  [/agent|affiliate|referrer|referral|partner/i, "agent"],
  [/invite|invited|conversion/i, "invites"],
  [/staff|owner|officer|auditor|support|trading|growth/i, "staff"],
  [/^Accounts$/i, "users"],
  [/players|users|predictors|registered|have bet|self.excluded|closed accounts|^Active$|top proposer/i, "users"],
  [/KYC|identity|SOF|review target|none sent|declaration/i, "idCard"],
  [/AML|suspicious|flag|compliance|blocked|refused/i, "shieldAlert"],
  [/consent|contact|in the book|suppressed/i, "contacts"],
  [/privacy|access|erasure|fulfilled/i, "privacy"],
  [/audit|chain integrity|global conservation|imbalance|drifting|unreconciled/i, "integrity"],
  [/disabled categories/i, "shieldOff"],
  [/source|categor(?:y|ies)/i, "sources"],
  [/market|match|position|ticket|round|poll|proposal|armed|settled|resolved|voided|^Results$/i, "markets"],
  [/published|approved|active grants|active affiliates|ready to settle/i, "checkCircle"],
  [/pending|awaiting|in queue|overdue|expiring|on hold|in flight|cooling.off/i, "clockPending"],
  [/^Open$|frozen by objection/i, "lock"],
  [/forfeited/i, "shieldAlert"],
  [/filtered|rejected|didn.t pass|dropped|auto.hidden|turned away/i, "xCircle"],
  [/visit|page view|pages per visit|traffic|top source/i, "traffic"],
  [/live|running|engine|enabled|rollout/i, "live"],
  [/AI|anthropic|oracle|cycle|model|stored \(180d\)/i, "brain"],
  [/SMS|message/i, "megaphone"],
  [/clock|time|window|expiry|day|week|month|p95|staleness|last position|last 24h/i, "clock"],
  [/schema|queue depth|server/i, "server"],
  [/licence|basis|limit|ceiling|worst winner ratio|hold %|default class/i, "limits"],
  [/report|entries|decisions recorded|total filed/i, "reports"],
];

export function adminKpiGlyph(label: string): DuoGlyphKey {
  for (const [pattern, glyph] of SUBJECTS) if (pattern.test(label)) return glyph;
  // A computed label can arrive from a live desk reading. Chart is a neutral data
  // subject, never a success or money-state assertion.
  return "chart";
}
