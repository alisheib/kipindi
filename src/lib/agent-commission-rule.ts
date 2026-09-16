/**
 * 🔴 THE HARD CEILING, AS A RULE RATHER THAN A SETTING.
 *
 * `RULES.md` §2.10 states it, this constant enforces it, and `validate()` in `server/agent-config.ts` is the
 * only place that reads it for a decision. It is exported so a guard can assert the rule and the value cannot
 * drift apart — ⛔ never so a surface can render a figure an officer is not held to. A surface renders
 * `cfg.maxCommissionPct`, which is what an officer is actually held to.
 *
 * ⛔ PURE, AND THAT IS THE POINT (C4 ruling 151). It lived in `server/agent-config.ts`, and the admin agents
 * client imported it from there, which pulled `prisma.ts` — and Prisma's browser runtime, naming every model —
 * into a JavaScript chunk served on every route. Client code imports the rule from here.
 */
export const PLATFORM_MAX_COMMISSION_PCT = 40;
