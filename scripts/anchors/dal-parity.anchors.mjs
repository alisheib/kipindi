/**
 * Anchors for red:dal-parity — each reintroduces the silent-production-no-op in one of its
 * shapes, on the file where it lived. DATA, so `test:red-anchors` can audit that every `from`
 * still resolves exactly once without running the harness.
 *
 * ⛔ A red anchor quotes SOURCE. Editing any of these lines in `prisma-dal.ts`, `market-dal.ts`
 * or `house-bot-dal.ts` must be paired with re-anchoring here, or the harness reports ANCHOR FAIL
 * — loudly, by design.
 */
export const MUTATIONS = [
  {
    // ⭐ THE ORIGINAL DEFECT'S READ HALF: drop the discriminator from the read mapper. An
    // officer's approval is written and then simply not there as far as the app is concerned.
    name: "prisma-dal.ts — toStoredAffiliate stops mapping approvedAt (the read half of the no-op)",
    file: "src/lib/server/prisma-dal.ts",
    from: `    approvedAt: iso(a.approvedAt),
    approvedBy: a.approvedBy ?? null,
    active: a.active ?? true,`,
    to: `    approvedAt: null,
    approvedBy: a.approvedBy ?? null,
    active: a.active ?? true,`,
    expect: `1.defect · "approvedAt" is read, mapped and created (the 2026-09-07 no-op)`,
  },
  {
    // The write half: take commissionPct out of the column map. With `tsc` off (a red
    // harness runs the suite through tsx, which does not type-check), the map compiles and
    // an officer's rate is dropped on the floor.
    name: "prisma-dal.ts — AFFILIATE_COLUMN forgets commissionPct (the write half of the no-op)",
    file: "src/lib/server/prisma-dal.ts",
    from: `  commissionPct: { col: "commissionPct", kind: "plain" },`,
    to: `  commissionPctX: { col: "commissionPct", kind: "plain" },`,
    expect: `1.map · AFFILIATE_COLUMN names "commissionPct"`,
  },
  {
    // Restore the original mechanism verbatim: a hand-written allow-list in update.
    name: "prisma-dal.ts — affiliate.update goes back to an if-chain allow-list",
    file: "src/lib/server/prisma-dal.ts",
    from: `        const spec = AFFILIATE_COLUMN[k as keyof StoredAffiliateAccount];`,
    to: `        if (patch.code !== undefined) data.code = patch.code;
        const spec = AFFILIATE_COLUMN[k as keyof StoredAffiliateAccount];`,
    expect: `1.update · …and no hand-written \`if (patch.x !== undefined) data.y\` allow-list survives`,
  },
  {
    // The provenance stamp's DateTime falls out of the date list → ISO string → Postgres
    // throws on every recruited registration, memory suites green.
    name: "prisma-dal.ts — recruitedAt leaves user.update's date list",
    file: "src/lib/server/prisma-dal.ts",
    from: `"closedAt", "emailVerifiedAt", "recruitedAt"] as const;`,
    to: `"closedAt", "emailVerifiedAt"] as const;`,
    expect: `2.update · "recruitedAt" is in user.update's date-field list`,
  },
  {
    // The column that separates agent spend from promo cost is written by memory, defaulted
    // by Prisma, read back NULL.
    name: "prisma-dal.ts — referralReward.create forgets programme",
    file: "src/lib/server/prisma-dal.ts",
    from: `          programme: r.programme,
          rateApplied: r.rateApplied,`,
    to: `          rateApplied: r.rateApplied,`,
    expect: `3.create · referralReward.create writes "programme"`,
  },
  // ── House bots (build commit 1) ──────────────────────────────────────────────────────────
  {
    // ⭐ The ledger marker read as NULL: the house book reads returned money only from marked rows,
    // so every payout on a house stake would vanish from its loss figures — on Postgres only.
    // ⚠️ Two lines, because `houseBotId: t.houseBotId ?? null,` also sits in txn.create.
    name: "prisma-dal.ts — toStoredTxn stops reading the house marker",
    file: "src/lib/server/prisma-dal.ts",
    from: `    pendingNotifiedAt: iso(t.pendingNotifiedAt),
    houseBotId: t.houseBotId ?? null,`,
    to: `    pendingNotifiedAt: iso(t.pendingNotifiedAt),
    houseBotId: null,`,
    expect: `8.read · toStoredTxn maps "houseBotId" from the row`,
  },
  {
    // The marker becomes rewritable: settlement and cash-out write positions from copies, and a copy
    // read before the column existed would un-mark house money.
    name: "market-dal.ts — the positions.set update arm writes houseBotId",
    file: "src/lib/server/market-dal.ts",
    from: `        idempotencyKey: p.idempotencyKey ?? null,
      },
    });`,
    to: `        idempotencyKey: p.idempotencyKey ?? null,
        houseBotId: p.houseBotId ?? null,
      },
    });`,
    expect: `9.immutable · positions.set update arm does NOT write houseBotId`,
  },
  {
    // The password-history time leaves the date list → an ISO string reaches a DateTime column →
    // Postgres throws on every password write, memory suites green.
    name: "prisma-dal.ts — passwordSetAt leaves user.update's date list",
    file: "src/lib/server/prisma-dal.ts",
    from: `const dateFields = ["passwordSetAt", "emailSetByOfficerAt",`,
    to: `const dateFields = ["emailSetByOfficerAt",`,
    expect: `7.update · "passwordSetAt" is in user.update's date-field list`,
  },
  {
    // The intent's staleness instant read as nothing: the claim filter and the seam's re-read would
    // see no deadline at all.
    name: "house-bot-dal.ts — toHouseBotIntent stops reading staleAt",
    file: "src/lib/server/house-bot-dal.ts",
    from: `    staleAt: iso(r.staleAt),`,
    to: `    staleAt: null,`,
    expect: `6.read · toHouseBotIntent maps "staleAt"`,
  },
];
