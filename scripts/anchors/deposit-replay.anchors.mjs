/** Source plants for the real-service prerequisites; all injections remain in memory. */
const file = "src/lib/server/wallet-service.ts";
const mutation = (name, from, to, expect) => ({ name, file, from, to, expect });
export const MUTATIONS = [
  mutation("early-global-key-without-intent", "if (!matchesFunding(existing)) return keyConflict();", "", "early.owner"),
  mutation("race-key-without-intent", "if (existing) return matchesFunding(existing) ? { ok: true, txn: existing, reused: true } : keyConflict();\n      }\n      throw err;", "if (existing) return { ok: true, txn: existing, reused: true };\n      }\n      throw err;", "catch.owner"),
  mutation("no-locked-key-recheck", "if (idempotencyKey) {\n      const existing = await db.txn.findByIdempotencyKey(idempotencyKey);\n      if (existing) return matchesFunding(existing) ? { ok: true, txn: existing, reused: true } : keyConflict();\n    }", "", "locked.same-intent-race"),
  mutation("locked-key-without-intent", "if (existing) return matchesFunding(existing) ? { ok: true, txn: existing, reused: true } : keyConflict();\n    }\n    // Responsible-gambling", "if (existing) return { ok: true, txn: existing, reused: true };\n    }\n    // Responsible-gambling", "locked.owner"),
  mutation("withdrawal-reference-on-return", ' || txn.type !== "DEPOSIT"', "", "return.wrong-type"),
  mutation("marked-row-on-return", " || txn.houseBotId != null", "", "return.house"),
  mutation("wrong-currency-on-return", ' || txn.currency !== "TZS"', "", "return.currency"),
  mutation("foreign-reference-on-return", "!txn || txn.userId !== userId || txn.type", "!txn || txn.type", "return.foreign"),
  mutation("replay-ignores-current-rail-grammar", "DepositSchema.shape.provider.safeParse(input?.provider).success && sameDepositFunding", "sameDepositFunding", "early.unsupported-rail"),
  { name: "prisma-relabels-foreign-currency", file: "src/lib/server/prisma-dal.ts", from: "currency: t.currency,\n    provider: t.provider", to: 'currency: "TZS",\n    provider: t.provider', expect: "dal.currency" },
];
