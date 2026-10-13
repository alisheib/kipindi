/** Source plants for the real-service prerequisites; all injections remain in memory. */
const file = "src/lib/server/wallet-service.ts";
const mutation = (name, from, to, expect) => ({ name, file, from, to, expect });
export const MUTATIONS = [
  mutation("early-global-key-without-intent", "if (!matchesFunding(existing)) return keyConflict();", "", "early.owner"),
  mutation("race-key-without-intent", "if (existing) return matchesFunding(existing) ? { ok: true, txn: existing, reused: true } : keyConflict();\n      }\n      throw err;", "if (existing) return { ok: true, txn: existing, reused: true };\n      }\n      throw err;", "catch.owner"),
  mutation("no-locked-key-recheck", "if (idempotencyKey) {\n      const existing = await db.txn.findByIdempotencyKey(idempotencyKey);\n      if (existing) return matchesFunding(existing) ? { ok: true, txn: existing, reused: true } : keyConflict();\n    }", "", "locked.same-intent-race"),
  mutation("locked-key-without-intent", "if (existing) return matchesFunding(existing) ? { ok: true, txn: existing, reused: true } : keyConflict();\n    }\n    // Responsible-gambling", "if (existing) return { ok: true, txn: existing, reused: true };\n    }\n    // Responsible-gambling", "locked.owner"),
  { name: "withdrawal-reference-on-return", file: "src/lib/server/deposit-status.ts", from: 'txn.type !== "DEPOSIT" || ', to: "", expect: "return.wrong-type" },
  { name: "marked-row-on-return", file: "src/lib/server/deposit-status.ts", from: " || txn.houseBotId != null", to: "", expect: "return.house" },
  { name: "wrong-currency-on-return", file: "src/lib/server/deposit-status.ts", from: 'txn.currency !== "TZS" || ', to: "", expect: "return.currency" },
  { name: "foreign-reference-on-return", file: "src/lib/server/deposit-status.ts", from: "txn.userId !== userId || ", to: "", expect: "return.foreign" },
  mutation("replay-ignores-current-rail-grammar", "DepositSchema.shape.provider.safeParse(input?.provider).success && sameDepositFunding", "sameDepositFunding", "early.unsupported-rail"),
  { name: "prisma-relabels-foreign-currency", file: "src/lib/server/prisma-dal.ts", from: "currency: t.currency,\n    provider: t.provider", to: 'currency: "TZS",\n    provider: t.provider', expect: "dal.currency" },
  mutation("reservation-loses-chosen-bet", "origin: (parse.data as { origin?: \"low_balance\" }).origin ?? null,\n        pendingBet,", "origin: (parse.data as { origin?: \"low_balance\" }).origin ?? null,", "metadata.saved-before-dispatch"),
  mutation("malformed-intent-dispatches", 'if (savedBet != null && !pendingBet) return { ok: false, error: "The saved question selection is invalid.", code: "INVALID" };', "", "metadata.malformed-before-send"),
];
