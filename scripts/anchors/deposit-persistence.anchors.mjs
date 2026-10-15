/** Unique source controls for S9's additive storage and narrow latest-confirmed read. */
const memory = "src/lib/server/store.ts", prisma = "src/lib/server/prisma-dal.ts", positions = "src/lib/server/market-dal.ts";
const m = (name, file, from, to, expect) => ({ name, file, from, to, expect });
export const MUTATIONS = [
  m("memory-overwrites-saved-intent", memory, "pendingBet: _pendingBet, ...rest", "...rest", "source.memory-intent-update"),
  m("prisma-overwrites-saved-intent", prisma, ' || k === "pendingBet"', "", "source.prisma-intent-update"),
  m("prisma-does-not-create-intent", prisma, "pendingBet: t.pendingBet == null ? PrismaRuntime.DbNull : t.pendingBet as Prisma.InputJsonValue,", "", "source.prisma-intent-create"),
  m("prisma-loses-intent-on-read", prisma, "pendingBet: t.pendingBet ?? null,", "pendingBet: null,", "source.prisma-intent-read"),
  m("prisma-loses-origin-on-read", positions, "origin: r.origin ?? null,", "origin: null,", "source.prisma-position-read"),
  m("memory-rewrites-funding-origin", memory, "origin: _origin, pendingBet:", "pendingBet:", "source.memory-intent-update"),
  m("prisma-rewrites-funding-origin", prisma, ' || k === "origin" || k === "pendingBet"', ' || k === "pendingBet"', "source.prisma-intent-update"),
  m("memory-rewrites-bet-origin", positions, "origin: prev.origin ?? null", "origin: p.origin ?? null", "source.memory-position-origin"),
  m("prisma-rewrites-bet-origin", positions, "update: {\n        userId: p.userId, marketId: p.marketId,", "update: {\n        origin: p.origin ?? null,\n        userId: p.userId, marketId: p.marketId,", "source.prisma-position-origin"),
  m("prisma-does-not-create-bet-origin", positions, "houseBotId: p.houseBotId ?? null,\n        origin: p.origin ?? null,", "houseBotId: p.houseBotId ?? null,", "source.prisma-position-create"),
  m("memory-foreign-history", memory, 't.userId === userId && t.type === "DEPOSIT" && t.status === "CONFIRMED" && t.currency', 't.type === "DEPOSIT" && t.status === "CONFIRMED" && t.currency', "source.memory-history"),
  m("memory-pending-history", memory, 't.status === "CONFIRMED" && t.currency === "TZS" && t.houseBotId', 't.currency === "TZS" && t.houseBotId', "source.memory-history"),
  m("prisma-foreign-history", prisma, 'where: { userId, type: "DEPOSIT", status: "CONFIRMED", currency: "TZS", houseBotId: null, provider:', 'where: { type: "DEPOSIT", status: "CONFIRMED", currency: "TZS", houseBotId: null, provider:', "source.prisma-history"),
  m("prisma-pending-history", prisma, 'where: { userId, type: "DEPOSIT", status: "CONFIRMED", currency: "TZS", houseBotId: null, provider:', 'where: { userId, type: "DEPOSIT", currency: "TZS", houseBotId: null, provider:', "source.prisma-history"),
  m("non-rerunnable-metadata", "prisma/migrations/20261013160000_deposit_return_intent/migration.sql", 'ADD COLUMN IF NOT EXISTS "pendingBet"', 'ADD COLUMN "pendingBet"', "source.additive-migration"),
  m("unbounded-migration-lock-wait", "prisma/migrations/20261013160000_deposit_return_intent/migration.sql", "PERFORM set_config('lock_timeout', '3s', true);", "", "source.additive-migration"),
  m("unbounded-migration-retry", "prisma/migrations/20261013160000_deposit_return_intent/migration.sql", "IF attempt >= 20 THEN", "IF false THEN", "source.additive-migration"),
  // M1 (S9 root review): the file must take "Position" before "Transaction" (the bet's write order) and retry a deadlock.
  m("migration-takes-transaction-first", "prisma/migrations/20261013160000_deposit_return_intent/migration.sql",
    'ALTER TABLE "Position" ADD COLUMN IF NOT EXISTS "origin" TEXT;\n      ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "pendingBet" JSONB;',
    'ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "pendingBet" JSONB;\n      ALTER TABLE "Position" ADD COLUMN IF NOT EXISTS "origin" TEXT;', "source.migration-bet-lock-order"),
  m("migration-deadlock-not-retried", "prisma/migrations/20261013160000_deposit_return_intent/migration.sql",
    "EXCEPTION WHEN lock_not_available OR deadlock_detected THEN", "EXCEPTION WHEN lock_not_available THEN", "source.migration-deadlock-retried"),
];
