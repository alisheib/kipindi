const file = "src/lib/server/deposit-recheck.ts";
const route = "src/app/api/wallet/deposits/[id]/recheck/route.ts";
const m = (name, from, to, expect) => ({ name, file, from, to, expect });
const ORIGINAL_BIND = '\n        || !matchesDepositRecheckBinding(userId, txnId, binding, fresh)';
const INITIAL_BIND = 'let fresh = await db.txn.findById(initial.id, tx);\n      if (!ownedDeposit(userId, fresh) || !sameDepositFunding(initial, fresh)\n        || fresh.providerRef !== initial.providerRef || fresh.idempotencyKey !== initial.idempotencyKey' + ORIGINAL_BIND + ') return unknown();';
const binding = (name, from, to, expect) => m(name, INITIAL_BIND, INITIAL_BIND.replace(from, to).replace(ORIGINAL_BIND, ''), expect);
const WALLET_READ = '      const wallet = await db.wallet.findByUserId(userId, tx);\n      if (!wallet || wallet.currency !== "TZS" || !Number.isSafeInteger(wallet.balance) || wallet.balance < 0) return unknown();\n';
const CLAIM = `      const opposed = (fresh.status === "FAILED" && verifiedTerminal === "CONFIRMED")
        || (fresh.status === "CONFIRMED" && verifiedTerminal === "FAILED");
      if (opposed && projection.state !== "REVIEW" && projection.state !== "HELD") {
        // Claim only after fresh canonical binding, including any drift during provider I/O. The existing claim
        // reenters this SAME wallet lock; it records review, never a debit/reversal or a new collection.
        await settlePaymentWebhook({ providerRef: fresh.providerRef!, status: verifiedTerminal!,
          ...(verifiedTerminal === "CONFIRMED" ? { amount: verifiedAmount } : {}) });
        fresh = await db.txn.findById(initial.id, tx);
        if (!ownedDeposit(userId, fresh) || !sameDepositFunding(initial, fresh)
          || fresh.providerRef !== initial.providerRef || fresh.idempotencyKey !== initial.idempotencyKey
          || !matchesDepositRecheckBinding(userId, txnId, binding, fresh)) return unknown();
        projection = depositProjection(userId, fresh, Date.now());
      }
      if (projection.state === "UNKNOWN" || projection.state === "PENDING" || projection.state === "RETURNED") return unknown();
      if (opposed && projection.state !== "REVIEW" && projection.state !== "HELD") return unknown();
      if (projection.state === "FAILED" && (verifiedTerminal !== "FAILED" || fresh.status !== "FAILED")) return unknown();
`;
export const MUTATIONS = [
  m("caller-budget-skipped", "if (!callerRate.allowed) return unknown(callerRate.retryAfterSec, true);", "", "rate.caller"),
  m("caller-budget-on-submitted-id", 'rateCheckAsync(userId, "deposit.status")', 'rateCheckAsync(txnId, "deposit.status")', "rate.caller-key"),
  m("caller-rebound-to-posted-owner", "if (!userId) return unknown();", "if (!userId) return unknown(); userId = (expected as any)?.owner ?? userId;", "capsule.foreign-owner"),
  m("invalid-identifier-refusal-not-audited", '      await audit({ category: "SECURITY", action: "deposit.recheck.lookup_refused", actorId: userId,\n        targetType: "Transaction", targetId: null, payload: { reason: "invalid-identifier" } });', '', "scope.invalid-audit"),
  m("malformed-saved-intent-erased", "const stored = await db.txn.findById(txnId);", "let stored = await db.txn.findById(txnId); if (stored) stored = { ...stored, pendingBet: null };", "scope.canonical"),
  m("posted-owner-looked-up-before-match", 'if (!binding || binding.owner !== userId || binding.txnId !== txnId) return unknown();', 'if (!binding || binding.txnId !== txnId) return unknown();', "capsule.foreign-owner"),
  m("original-binding-ignored-before-probe", ' || !matchesDepositRecheckBinding(userId, txnId, binding, stored)', '', "capsule.key-mismatch"),
  m("probe-budget-skipped", "if (!probeRate.allowed) return unknown(probeRate.retryAfterSec, true);", "", "rate.probe"),
  m("probe-budget-on-caller", 'rateCheckAsync(initial.id, "deposit.probe")', 'rateCheckAsync(userId, "deposit.probe")', "rate.probe"),
  m("legacy-provider-terminal-probe", ' || (initial.provider !== "CARD" && !isMobileMoneyMethodId(initial.provider))', '', "scope.legacy-rail"),
  m("unsupported-promoted-to-failed", 'const verified = await verifyDepositStatus(initial.providerRef);', 'const verified = await verifyDepositStatus(initial.providerRef); if (verified.status === "UNSUPPORTED") verified.status = "FAILED";', "authority.UNSUPPORTED"),
  m("provided-amount-not-checked", "if (verified.amount !== undefined && (!Number.isSafeInteger(verified.amount) || verified.amount <= 0 || verified.amount !== initial.amount)) return unknown();", "", "authority.amount"),
  m("contradiction-not-persisted", 'await settlePaymentWebhook({ providerRef: fresh.providerRef!, status: verifiedTerminal!,\n          ...(verifiedTerminal === "CONFIRMED" ? { amount: verifiedAmount } : {}) });', '', "review.confirmed"),
  binding("changed-canonical-intent-accepted", " || !sameDepositFunding(initial, fresh)", "", "fresh.amount"),
  binding("changed-reference-accepted", "fresh.providerRef !== initial.providerRef || ", "", "fresh.providerRef"),
  binding("changed-funding-key-accepted", " || fresh.idempotencyKey !== initial.idempotencyKey", "", "fresh.key"),
  m("fresh-signed-opposition-not-recorded", '(fresh.status === "CONFIRMED" && verifiedTerminal === "FAILED")', 'false', "review.fresh-confirmed-opposes-failed"),
  m("fresh-marker-ignored", 'let projection = depositProjection(userId, fresh, Date.now());', 'let projection = depositProjection(userId, { ...fresh, providerStatus: null }, Date.now());', "fresh.review"),
  m("missing-wallet-fabricates-zero", 'if (!wallet || wallet.currency !== "TZS" || !Number.isSafeInteger(wallet.balance) || wallet.balance < 0) return unknown();', 'if (!wallet) return { view: { ...projection, balance: 0, retryAfterSec: 0, failureAuthority: "signed-recheck" }, rateLimited: false, unavailable: false };', "wallet.missing"),
  m("invalid-wallet-allows-review-claim", 'if (!wallet || wallet.currency !== "TZS" || !Number.isSafeInteger(wallet.balance) || wallet.balance < 0) return unknown();', '', "wallet.opposed.wrong-currency"),
  m("wallet-validated-after-review-claim", WALLET_READ + CLAIM, CLAIM + WALLET_READ, "wallet.opposed.wrong-currency"),
  { name: "review-marker-write-escapes-tx", file: "src/lib/server/wallet-service.ts", from: 'const saved = await db.txn.update(txnId, { providerStatus: DEPOSIT_STATUS_REVIEW_MARK }, tx);', to: 'const saved = await db.txn.update(txnId, { providerStatus: DEPOSIT_STATUS_REVIEW_MARK });', expect: "review.reentrant-same-tx" },
  m("review-reread-escapes-tx", '        fresh = await db.txn.findById(initial.id, tx);', '        fresh = await db.txn.findById(initial.id);', "review.reentrant-same-tx"),
  m("final-read-outside-wallet-lock", 'return await withLock(', 'return await (async (_key: string, callback: any) => callback(null))(', "safe.MPESA"),
  m("unsafe-failed-authority-missing", 'failureAuthority: "signed-recheck" as const', 'failureAuthority: "stored-failed" as any', "safe.MPESA"),
  { name: "same-origin-gate-skipped", file: route, from: 'req.headers.get("sec-fetch-site") !== "same-origin"', to: "false", expect: "route.cross-site" },
  { name: "custom-fetch-header-skipped", file: route, from: 'req.headers.get("x-kp-deposit-recheck") !== "1"', to: "false", expect: "route.no-header" },
  { name: "streamed-body-cap-skipped", file: route, from: 'if (bytes > DEPOSIT_RECHECK_MAX_BYTES)', to: 'if (false)', expect: "route.body.body-over-cap" },
  { name: "declared-body-cap-skipped", file: route, from: 'Number(declared) > DEPOSIT_RECHECK_MAX_BYTES', to: 'false', expect: "route.body.declared-over-cap" },
  { name: "capsule-extra-status-accepted", file: "src/lib/journey/deposit-recheck-binding.ts", from: 'Object.keys(raw).sort().join(",") !== "funding,fundingKey,owner,providerRef,txnId,v" || ', to: '', expect: "capsule.extra-status" },
];
// These plants need an actual rollback: a Map fixture must not pretend to provide SQL atomicity.
export const PG_MUTATIONS = [
  { name: "review-marker-autocommits-before-outer-rollback", file: "src/lib/server/wallet-service.ts", from: 'const saved = await db.txn.update(txnId, { providerStatus: DEPOSIT_STATUS_REVIEW_MARK }, tx);', to: 'const saved = await db.txn.update(txnId, { providerStatus: DEPOSIT_STATUS_REVIEW_MARK });', expect: "review.pg-rollback-no-partial-marker" },
  { name: "review-notice-escapes-rollback", file: "src/lib/server/wallet-service.ts", from: 'if (reviewAdded) afterCommit(currentLockTx(), () => notifyDeposit(txn.userId,\n        { status: "AML_REVIEW", amount: Math.abs(txn.amount), provider: friendlyProvider(txn.provider), txnId: txn.id }));', to: 'if (reviewAdded) notifyDeposit(txn.userId,\n        { status: "AML_REVIEW", amount: Math.abs(txn.amount), provider: friendlyProvider(txn.provider), txnId: txn.id });', expect: "review.pg-rollback-no-review-notice" },
];
