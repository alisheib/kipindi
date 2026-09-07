/**
 * Anchors for red:dal-parity — each reintroduces the silent-production-no-op in one of its
 * shapes, on the file where it lived. DATA, so `test:red-anchors` can audit that every `from`
 * still resolves exactly once without running the harness.
 *
 * ⛔ A red anchor quotes SOURCE. Editing any of these lines in `prisma-dal.ts` must be paired
 * with re-anchoring here, or the harness reports ANCHOR FAIL — loudly, by design.
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
];
