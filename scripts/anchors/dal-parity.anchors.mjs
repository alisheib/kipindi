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
  /* ── C5-8 · SIX OF THE SEVEN `test:dal-parity` ENTRIES C5's REGISTER LEFT OWED ──────────────────────────
     ⛔ THE RECORDED REASON FOR LEAVING THEM WAS WRONG, AND RE-DERIVING IT IS WHY THEY ARE HERE. C5-8's owed
     list says these name "a suite with NO roll-call key and no red harness at all". Measured 2026-09-21
     against `package.json` and this directory: `red:dal-parity` EXISTS and `dal-parity.anchors.mjs` — this
     file — EXISTS. They were never a no-harness problem; they were a FILING problem.
     ⛔ AND THEY CANNOT GO IN `house-bot-c5.anchors.mjs`: `test:house-bot-reports` 0.505 walks
     `scripts/anchors/house*.anchors.mjs` and demands every `suite` key found there be in `ROLL_CALL_SITES`
     or `ROLL_CALL_OWED`. `dal-parity` is in neither, and `ROLL_CALL_OWED`'s length is pinned at 7 and may
     only SHRINK — so declaring them there would have reddened 0.505 on an unlisted key, or bought silence by
     widening the one table that exists to stop being widened. Here they are audited by `test:red-anchors` §3
     and DRIVEN by `red:dal-parity`, which is what a declaration is for.
     ⛔ THE SEVENTH IS RECORDED, NOT BUILT. `5b-M11` mutates `prisma/schema.prisma`, which
     `dal-parity.test.mts` reads at `:53` and `:274` from ROOT — NOT through `KP_SRC` — so this harness's
     scratch-copy mechanism cannot reach it and a declaration would report NOT CAUGHT. It is written down in
     `DEFERRED-TESTS.md` with that measurement rather than declared here and left to lie. */
  {
    name: "house-bot-dal.ts — a struck step-3 member is declared on the house DAL interface again (C5-5b M13)",
    file: "src/lib/server/house-bot-dal.ts",
    from: "  saveLimits(baseVersion: number, patch: HouseBotLimitsPatch, tx?: HouseTx): Promise<CasResult<StoredHouseBotControl>>;",
    to: "  saveLimits(baseVersion: number, patch: HouseBotLimitsPatch, tx?: HouseTx): Promise<CasResult<StoredHouseBotControl>>;\n  recordDisclosure(sections: readonly string[], tx?: HouseTx): Promise<StoredHouseBotControl>;",
    expect: "16.d20 · ⛔ D20 · not one struck step-3 member is declared or implemented in the house DAL (either twin)",
  },
  {
    name: "txn-filters.ts — ruling 210's house filter survives in the search grammar (C5-5b M14)",
    file: "src/lib/server/txn-filters.ts",
    from: "  if (f.attentionOnly && attentionOf(t, nowMs)?.level !== \"warn\") return false;",
    to: "  if (f.attentionOnly && attentionOf(t, nowMs)?.level !== \"warn\") return false;\n  if (f.house === \"only\" && t.houseBotId == null) return false;",
    expect: "16.d20.house · ⛔ D20 · no house filter survives in the transaction search grammar or its Prisma where (ruling 210 struck)",
  },
  {
    name: "market-dal.ts — the MEMORY twin counts every round, marked or not (C5-5b M16)",
    file: "src/lib/server/market-dal.ts",
    from: "      if (p.houseBotId == null) e.ownRounds += 1;",
    to: "      e.ownRounds += 1;",
    expect: "16.ownRounds · ruling 235 · ownRounds counts unmarked positions in both twins, in the same single aggregate",
  },
  {
    name: "market-dal.ts — the SQL twin drops the houseBotId filter from ownRounds (C5-5b M17)",
    file: "src/lib/server/market-dal.ts",
    from: "              (count(*) filter (where p.\"houseBotId\" is null))::int                            as \"ownRounds\",",
    to: "              count(*)::int                                                                   as \"ownRounds\",",
    expect: "16.ownRounds · ruling 235 · ownRounds counts unmarked positions in both twins, in the same single aggregate",
  },
  {
    name: "store.ts — the memory twin of the concentration list excludes a house-marked row again (C5-5b M22, D20a)",
    file: "src/lib/server/store.ts",
    from: "        const isStake = t.type === \"BET_PLACED\";",
    to: "        if (t.houseBotId != null) continue;\n        const isStake = t.type === \"BET_PLACED\";",
    expect: "16.d20.aggregates · ⛔ D20 · neither player-facing aggregate excludes a house-marked row in either twin: top contributors (Prisma and memory) and the leaderboard (memory and SQL) name no marker and take no excludeHouse option",
  },
  {
    name: "market-dal.ts — the leaderboard takes an excludeHouse option again (C5-5b M23, D20a)",
    file: "src/lib/server/market-dal.ts",
    from: "      const e = acc.get(p.userId) ?? { resolved: 0, staked: 0, paidOut: 0 };",
    to: "      if (opts?.excludeHouse && p.houseBotId != null) continue;\n      const e = acc.get(p.userId) ?? { resolved: 0, staked: 0, paidOut: 0 };",
    expect: "16.d20.aggregates · ⛔ D20 · neither player-facing aggregate excludes a house-marked row in either twin: top contributors (Prisma and memory) and the leaderboard (memory and SQL) name no marker and take no excludeHouse option",
  },
  /* ── §17 · the consent ledger and suppression (marketing U6) ────────────────────────
   * ⭐ EIGHT MUTATIONS, ONE PER RULE §17 EXISTS TO HOLD. Four of them break an ABSENCE —
   * the append-only and never-deleted rules — which is the half a guard usually cannot
   * prove, because "nothing is there" is also what a broken check reports. */
  {
    // The verbatim-wording half of §5.7: the record keeps the field and stops carrying
    // the text. Every consent row then proves nothing about what the person was shown.
    name: "prisma-dal.ts — toStoredMessagingConsent stops carrying the verbatim wording",
    file: "src/lib/server/prisma-dal.ts",
    from: `    wording: c.wording,`,
    to: `    wording: "",`,
    expect: `17.read · toStoredMessagingConsent maps "wording" from the row`,
  },
  {
    // The write half: the wording never reaches Postgres. Memory suites stay green.
    name: "prisma-dal.ts — messagingConsent.create drops the wording column",
    file: "src/lib/server/prisma-dal.ts",
    from: `wording: row.wording, locale: row.locale,`,
    to: `locale: row.locale,`,
    expect: `17.create · messagingConsent.create writes "wording"`,
  },
  {
    // ⛔ THE APPEND-ONLY RULE BROKEN. An update path on an evidence table turns a record of
    // what happened into an opinion about it.
    name: "prisma-dal.ts — the consent ledger grows an update path",
    file: "src/lib/server/prisma-dal.ts",
    from: `    latestFor: async (key: MessagingKey): Promise<StoredMessagingConsent | null> => {`,
    to: `    update: async (id: string): Promise<StoredMessagingConsent | null> => null,
    latestFor: async (key: MessagingKey): Promise<StoredMessagingConsent | null> => {`,
    expect: `17.append.prisma · the Prisma ledger exposes NO update and NO delete`,
  },
  {
    // ⛔ THE NEVER-DELETED RULE BROKEN — this is how a person who opted out receives the
    // next campaign.
    name: "prisma-dal.ts — suppression grows a deleteMany",
    file: "src/lib/server/prisma-dal.ts",
    from: `    find: async (key: MessagingKey): Promise<StoredSuppression | null> => {`,
    to: `    deleteMany: async (identifier: string): Promise<number> => 0,
    find: async (key: MessagingKey): Promise<StoredSuppression | null> => {`,
    expect: `17.nodelete.prisma · the Prisma suppression namespace exposes NO delete`,
  },
  {
    // The upsert starts refreshing the row, so every re-import walks "when did they say no"
    // forward and the evidence is always brand new.
    // ⚠️ RE-ANCHORED FOR U8. This anchor quoted `update: {}`, and U8's lift changed that line
    // — the anchor stopped matching and the control silently stopped controlling. The rule it
    // guards is now "the update block touches nothing that is evidence", so this plants exactly
    // that: `createdAt` back inside the block.
    name: "prisma-dal.ts — re-suppression refreshes createdAt instead of leaving the original",
    file: "src/lib/server/prisma-dal.ts",
    from: `        update: { liftedAt: null, liftedReason: null },`,
    to: `        update: { liftedAt: null, liftedReason: null, createdAt: new Date() },`,
    expect: `17.idempotent.prisma · re-suppression is an UPSERT whose update block touches nothing that is evidence`,
  },
  {
    // 🔴 U8 · THE SECOND FALSE SUCCESS. The update block goes back to being EMPTY — the shape
    // this file asserted until U8 — so `stop → start again → stop again` hands back the LIFTED
    // row and the person is told they will never be marketed again while the lift stands.
    name: "prisma-dal.ts — re-suppression hands back the LIFTED row instead of re-arming it",
    file: "src/lib/server/prisma-dal.ts",
    from: `        update: { liftedAt: null, liftedReason: null },`,
    to: `        update: {},`,
    expect: `17.rearm.prisma · ⛔ …and it CLEARS THE LIFT, so re-suppression re-arms a lifted row rather than handing it back`,
  },
  {
    // ⛔ THE LIFT BECOMES A DELETE — the evidence that this person once said no is destroyed,
    // which is the whole reason §17 asserts the absence of a delete in both twins.
    name: "prisma-dal.ts — the lift deletes the row instead of superseding it",
    file: "src/lib/server/prisma-dal.ts",
    from: `      const hit = await pc().suppression.updateMany({`,
    to: `      const hit = await pc().suppression.deleteMany({`,
    expect: `17.lift.nodelete.prisma · ⛔ the lift writes an UPDATE and removes nothing`,
  },
  {
    // ⛔ `find` STOPS MEANING ACTIVE — so a person who resubscribed is refused for ever, and
    // the page's "start them again" is a success the send loop will not honour.
    name: "prisma-dal.ts — the Prisma find stops asking whether the row is still refusing",
    file: "src/lib/server/prisma-dal.ts",
    from: `          channel: key.channel, identifier: key.identifier, category: key.category,
          liftedAt: null,
        },
      });
      return row ? toStoredSuppression(row) : null;
    },
    /** ⭐ SUPERSEDE, NEVER DELETE (U8).`,
    to: `          channel: key.channel, identifier: key.identifier, category: key.category,
        },
      });
      return row ? toStoredSuppression(row) : null;
    },
    /** ⭐ SUPERSEDE, NEVER DELETE (U8).`,
    expect: `17.active.prisma · the Prisma \`find\` returns only rows that are still refusing`,
  },
  {
    // The twins disagree on a tie. Two rows in one millisecond then resolve one way in every
    // test and the other way on production.
    name: "prisma-dal.ts — latestFor loses the id tiebreak, so the twins disagree on a tie",
    file: "src/lib/server/prisma-dal.ts",
    from: `        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      });
      return row ? toStoredMessagingConsent(row) : null;`,
    to: `        orderBy: { createdAt: "desc" },
      });
      return row ? toStoredMessagingConsent(row) : null;`,
    expect: `17.tiebreak.prisma · BOTH Prisma readers order by createdAt DESC then id DESC`,
  },
  {
    // The memory twin stops being idempotent: a re-import replaces the row and moves the date.
    // ⚠️ RE-ANCHORED FOR U8 — the create body gained the two lines that clear the lift, so the
    // one-line anchor this used to quote stopped matching and the control stopped controlling.
    name: "store.ts — the memory suppression create stops returning the row already there",
    file: "src/lib/server/store.ts",
    from: `          r.liftedAt = null;
          r.liftedReason = null;
          return r;`,
    to: `          r.liftedAt = null;
          r.liftedReason = null;
          break;`,
    expect: `17.idempotent.memory · the memory twin returns the row ALREADY THERE instead of replacing it`,
  },
  {
    // 🔴 U8 · the memory twin stops re-arming a lifted row, so re-suppression is a no-op and
    // the page reports a stop that did not happen.
    name: "store.ts — the memory create hands back the LIFTED row instead of re-arming it",
    file: "src/lib/server/store.ts",
    from: `          r.liftedAt = null;
          r.liftedReason = null;
          return r;`,
    to: `          return r;`,
    expect: `17.rearm.memory · ⛔ …and it clears the lift on that row, the same way the Prisma twin does`,
  },
  {
    // ⛔ the memory `find` stops asking whether the row is still refusing — the twin that every
    // behavioural suite in this repo actually runs on.
    name: "store.ts — the memory find stops asking whether the row is still refusing",
    file: "src/lib/server/store.ts",
    from: `          return !r.liftedAt ? r : null;`,
    to: `          return r;`,
    expect: `17.active.memory · and the memory \`find\` does too, reading the lift FALSILY so a row with no lift still REFUSES`,
  },
  {
    // ⛔ the memory lift stops refusing an already-lifted row, so a SECOND lift walks the date
    // forward — `liftedAt` is evidence, exactly as `createdAt` is.
    name: "store.ts — a second lift is allowed to move the date forward",
    file: "src/lib/server/store.ts",
    from: `          if (r.liftedAt) return null;`,
    to: `          if (r.liftedAt === undefined) return null;`,
    expect: `17.lift.once.memory · and the memory lift refuses a row that is already lifted`,
  },
  {
    // ⛔ The memory ledger grows a delete — the absence rule broken on the twin every
    // behavioural suite actually runs on.
    name: "store.ts — the memory consent ledger grows a delete",
    file: "src/lib/server/store.ts",
    from: `    listFor: (key: MessagingKey): StoredMessagingConsent[] =>`,
    to: `    delete: (id: string): boolean => store.messagingConsents.delete(id),
    listFor: (key: MessagingKey): StoredMessagingConsent[] =>`,
    expect: `17.append.memory · the memory ledger exposes NO update and NO delete`,
  },
  {
    // The MEMORY twin loses the tiebreak instead — the mirror of case 21, on the backend every
    // behavioural suite actually runs on.
    name: "store.ts — the memory latestFor loses the id tiebreak",
    file: "src/lib/server/store.ts",
    from: `        .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id))[0] ?? null,`,
    to: `        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null,`,
    expect: `17.tiebreak.memory · BOTH memory readers break the tie on id, the same way`,
  },
  /* ── §18 · the opt-out link (marketing U8) ──────────────────────────────────────────── */
  {
    // The identifier stops being carried: the token resolves to nothing, and the person
    // holding that SMS can never leave. OD43's link never expires, so nor does the failure.
    name: "prisma-dal.ts — toStoredMarketingOptOutToken stops carrying the identifier",
    file: "src/lib/server/prisma-dal.ts",
    from: `    identifier: t.identifier,`,
    to: `    identifier: "",`,
    expect: `18.read · toStoredMarketingOptOutToken maps "identifier" from the row`,
  },
  {
    // The category never reaches Postgres, so the row cannot be matched to the suppression
    // triple the gate asks about.
    name: "prisma-dal.ts — marketingOptOutToken.create drops the category column",
    file: "src/lib/server/prisma-dal.ts",
    from: `            category: row.category, createdAt: new Date(row.createdAt),`,
    to: `            createdAt: new Date(row.createdAt),`,
    expect: `18.create · marketingOptOutToken.create writes "category"`,
  },
  {
    // ⛔ THE SILENT RE-POINT. An upsert quietly hands somebody else's live opt-out link to a
    // different person — and the first person can then never leave.
    name: "prisma-dal.ts — the token create becomes an upsert, silently re-pointing a live link",
    file: "src/lib/server/prisma-dal.ts",
    from: `        const created = await pc().marketingOptOutToken.create({`,
    to: `        const created = await pc().marketingOptOutToken.upsert({`,
    expect: `18.taken.prisma · the Prisma create turns its unique violation into null, and does not upsert`,
  },
  {
    // The memory twin overwrites instead of refusing, so the two backends disagree about who
    // a token belongs to — and every behavioural suite runs on the twin that is wrong.
    name: "store.ts — the memory token create overwrites a token already held",
    file: "src/lib/server/store.ts",
    from: `      if (store.optOutTokens.has(row.token)) return null;`,
    to: `      if (false) return null;`,
    expect: `18.taken.memory · the memory create refuses a token already held, and does not overwrite`,
  },
  {
    // ⛔ A delete on a link that OD43 says never expires.
    name: "prisma-dal.ts — the token namespace grows a delete",
    file: "src/lib/server/prisma-dal.ts",
    from: `    find: async (token: string): Promise<StoredMarketingOptOutToken | null> => {`,
    to: `    deleteMany: async (identifier: string): Promise<number> => 0,
    find: async (token: string): Promise<StoredMarketingOptOutToken | null> => {`,
    expect: `18.nodelete.prisma · the Prisma token namespace exposes NO delete`,
  },
];
