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
  /* ── §10 · short titles and competition (the Vodacom plan S2, 2026-09-30) ──────────────
   * ⭐ SIX MUTATIONS, one per way the silent no-op can come back for the four new columns — the sixth (the S2 review,
   * MS-4) is the competition read coercing again, which erases a key a later build dropped. The schema half (§11)
   * is read from ROOT and cannot be reached through KP_SRC, so it has no mutation here — `test:short-title-fit` (d)
   * holds the migrations instead. */
  {
    // ⭐ THE ONE-ARM DEFECT. The update arm forgets the Swahili short title, so the first resolve, settle, reopen or
    // void (every one a full-row `set`) wipes it on Postgres while every memory suite stays green.
    // ⚠️ A LONG ANCHOR, ON PURPOSE. Both arms carry the same block from `shortTitleSw` down to `resolveClaimedAt`; only
    // the update arm goes straight on to `reopenedAt` (the create arm has a comment between), so the anchor runs to
    // there to match exactly once.
    name: "market-dal.ts — the upsert's UPDATE arm forgets shortTitleSw",
    file: "src/lib/server/market-dal.ts",
    from: `        shortTitleSw: m.shortTitleSw ?? null,
        shortTitleZh: m.shortTitleZh ?? null,
        competition: m.competition ?? null,
        resolutionAt: new Date(m.resolutionAt),
        selectionClosedAt: m.selectionClosedAt ? new Date(m.selectionClosedAt) : null,
        status: m.status, yesPool: m.yesPool, noPool: m.noPool,
        predictorCount: m.predictorCount,
        feeSnapshot: (m.feeSnapshot ?? undefined) as never,
        resolvedOutcome: m.resolvedOutcome,
        resolutionStage1By: m.resolutionStage1By,
        resolutionStage1At: m.resolutionStage1At ? new Date(m.resolutionStage1At) : null,
        resolutionStage2By: m.resolutionStage2By,
        resolutionStage2At: m.resolutionStage2At ? new Date(m.resolutionStage2At) : null,
        objectionsClosedAt: m.objectionsClosedAt ? new Date(m.objectionsClosedAt) : null,
        settledAt: m.settledAt ? new Date(m.settledAt) : null,
        resolutionEvidence: m.resolutionEvidence ?? null,
        resolutionNotifiedAt: m.resolutionNotifiedAt ? new Date(m.resolutionNotifiedAt) : null,
        selectionClosedNotifiedAt: m.selectionClosedNotifiedAt ? new Date(m.selectionClosedNotifiedAt) : null,
        closingSoonNotifiedAt: m.closingSoonNotifiedAt ? new Date(m.closingSoonNotifiedAt) : null,
        sentinelOutcome: m.sentinelOutcome ?? null,
        sentinelEvidence: m.sentinelEvidence ?? null,
        sentinelReasoning: m.sentinelReasoning ?? null,
        sentinelSourceUrl: m.sentinelSourceUrl ?? null,
        sentinelConfidence: m.sentinelConfidence ?? null,
        sentinelClosedAt: m.sentinelClosedAt ? new Date(m.sentinelClosedAt) : null,
        sentinelDetermined: m.sentinelDetermined ?? null,
        resolutionMode: m.resolutionMode ?? null,
        resolveClaimedAt: m.resolveClaimedAt ? new Date(m.resolveClaimedAt) : null,
        reopenedAt: m.reopenedAt ? new Date(m.reopenedAt) : null,`,
    to: `        shortTitleZh: m.shortTitleZh ?? null,
        competition: m.competition ?? null,
        resolutionAt: new Date(m.resolutionAt),
        selectionClosedAt: m.selectionClosedAt ? new Date(m.selectionClosedAt) : null,
        status: m.status, yesPool: m.yesPool, noPool: m.noPool,
        predictorCount: m.predictorCount,
        feeSnapshot: (m.feeSnapshot ?? undefined) as never,
        resolvedOutcome: m.resolvedOutcome,
        resolutionStage1By: m.resolutionStage1By,
        resolutionStage1At: m.resolutionStage1At ? new Date(m.resolutionStage1At) : null,
        resolutionStage2By: m.resolutionStage2By,
        resolutionStage2At: m.resolutionStage2At ? new Date(m.resolutionStage2At) : null,
        objectionsClosedAt: m.objectionsClosedAt ? new Date(m.objectionsClosedAt) : null,
        settledAt: m.settledAt ? new Date(m.settledAt) : null,
        resolutionEvidence: m.resolutionEvidence ?? null,
        resolutionNotifiedAt: m.resolutionNotifiedAt ? new Date(m.resolutionNotifiedAt) : null,
        selectionClosedNotifiedAt: m.selectionClosedNotifiedAt ? new Date(m.selectionClosedNotifiedAt) : null,
        closingSoonNotifiedAt: m.closingSoonNotifiedAt ? new Date(m.closingSoonNotifiedAt) : null,
        sentinelOutcome: m.sentinelOutcome ?? null,
        sentinelEvidence: m.sentinelEvidence ?? null,
        sentinelReasoning: m.sentinelReasoning ?? null,
        sentinelSourceUrl: m.sentinelSourceUrl ?? null,
        sentinelConfidence: m.sentinelConfidence ?? null,
        sentinelClosedAt: m.sentinelClosedAt ? new Date(m.sentinelClosedAt) : null,
        sentinelDetermined: m.sentinelDetermined ?? null,
        resolutionMode: m.resolutionMode ?? null,
        resolveClaimedAt: m.resolveClaimedAt ? new Date(m.resolveClaimedAt) : null,
        reopenedAt: m.reopenedAt ? new Date(m.reopenedAt) : null,`,
    expect: `10.s2.both · marketStore.set writes "shortTitleSw" in BOTH upsert arms, once each, from m.shortTitleSw`,
  },
  {
    // The read half: the competition is written and never read back, so every card on Postgres says "no competition".
    name: "market-dal.ts — toStoredMarket stops reading competition",
    file: "src/lib/server/market-dal.ts",
    from: `    competition: typeof r.competition === "string" ? r.competition : null,`,
    to: `    competition: null,`,
    expect: `10.s2.read · toStoredMarket maps "competition" from the row, on one line`,
  },
  {
    // ⛔ MS-4 (the S2 review): the read COERCES again. A key a later build dropped reads as NULL, and the next edit of
    // any other field hands that NULL to the narrow writer, which stores it — the key is silently erased.
    name: "market-dal.ts — toStoredMarket coerces competition on read",
    file: "src/lib/server/market-dal.ts",
    from: `    competition: typeof r.competition === "string" ? r.competition : null,`,
    to: `    competition: normaliseCompetition(r.competition),`,
    expect: `10.s2.read.raw · toStoredMarket reads competition RAW — the stored string as it is, never through a coercer (MS-4)`,
  },
  {
    // ⛔ A title key made stampable: `stamp` is the writer the narrow method exists to avoid.
    name: "market-dal.ts — STAMPABLE gains shortTitleEn",
    file: "src/lib/server/market-dal.ts",
    from: `  updatedAt: (v) => (v ? new Date(v as string) : new Date()),`,
    to: `  shortTitleEn: (v) => v,
  updatedAt: (v) => (v ? new Date(v as string) : new Date()),`,
    expect: `10.s2.notStamp · "shortTitleEn" is not in STAMPABLE`,
  },
  {
    // The MEMORY twin of the narrow writer drops a column — the twin every behavioural suite actually runs on.
    // ⚠️ Two lines: `competition: fields.competition,` also sits in the Prisma twin (at a deeper indent).
    name: "market-dal.ts — the memory setShortTitles stops writing competition",
    file: "src/lib/server/market-dal.ts",
    from: `      competition: fields.competition,
      updatedAt: new Date().toISOString(),`,
    to: `      updatedAt: new Date().toISOString(),`,
    expect: `10.s2.narrow.memory · the memory setShortTitles keeps the row and writes exactly the four (+ updatedAt), never the caller's whole object`,
  },
  {
    // The PRISMA twin drops the Swahili column: an officer's edit is audited, returned and never reaches Postgres.
    name: "market-dal.ts — the Prisma setShortTitles stops writing shortTitleSw",
    file: "src/lib/server/market-dal.ts",
    from: `        shortTitleSw: fields.shortTitleSw,`,
    to: `        // (shortTitleSw dropped)`,
    expect: `10.s2.narrow.prisma · the Prisma setShortTitles is an UPDATE of exactly the four columns (+ updatedAt), each from the caller's fields`,
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
  {
    // 🔴 E2E 2026-09-27 · the Prisma create keeps the FIRST reason again, so a person's old
    // WITHDRAWN stop hides an officer's stop and their link can lift it.
    name: "prisma-dal.ts — suppression.create stops handing the reason to the stop now in force",
    file: "src/lib/server/prisma-dal.ts",
    from: `      await pc().suppression.updateMany({ where: { ...triple, liftedAt: { not: null } }, data: takeOver });`,
    to: `      await pc().suppression.updateMany({ where: { ...triple, liftedAt: { not: null } }, data: {} });`,
    expect: `17.supersede.prisma · ⛔ a RE-ARMED row takes the new reason, and a non-WITHDRAWN stop takes over an active WITHDRAWN one`,
  },
  {
    name: "store.ts — the memory suppression create keeps the FIRST reason over an officer's stop",
    file: "src/lib/server/store.ts",
    from: `          if (r.liftedAt || (r.reason === "WITHDRAWN" && row.reason !== "WITHDRAWN")) {`,
    to: `          if (false) {`,
    expect: `17.supersede.memory · ⛔ …and the memory twin does the same on the row already there`,
  },
  {
    name: "prisma-dal.ts — suppression.lift lifts any active row again, whatever its reason",
    file: "src/lib/server/prisma-dal.ts",
    from: `          // ⛔ Only a person's own stop is liftable — see the memory twin.
          reason: "WITHDRAWN",`,
    to: `          // (reason filter removed)`,
    expect: `17.liftreason · ⛔ \`lift\` lifts ONLY a WITHDRAWN row, in BOTH twins — the store refuses a complaint, an officer's stop or a self-exclusion even if a caller forgets to check`,
  },
  {
    name: "store.ts — the memory suppression lift lifts any active row again, whatever its reason",
    file: "src/lib/server/store.ts",
    from: `          if (r.reason !== "WITHDRAWN") return null;`,
    to: `          // (reason filter removed)`,
    expect: `17.liftreason · ⛔ \`lift\` lifts ONLY a WITHDRAWN row, in BOTH twins — the store refuses a complaint, an officer's stop or a self-exclusion even if a caller forgets to check`,
  },
  /* ── §19 · the contact book (marketing U18) ──────────────────────────────────────────── */
  {
    // 🔴 The unique violation escapes as a Prisma error, or is papered over — the importer's
    // "already in the book" branch stops existing and every caller has to know P2002.
    name: "prisma-dal.ts — marketingContact.create stops turning the duplicate into null",
    file: "src/lib/server/prisma-dal.ts",
    from: `        return toStoredMarketingContact(created);
      } catch (err) {
        if ((err as { code?: string })?.code === "P2002") return null;`,
    to: `        return toStoredMarketingContact(created);
      } catch (err) {
        if (false) return null;`,
    expect: `19.unique.prisma · the Prisma create turns P2002 into null, and does NOT upsert`,
  },
  {
    // 🔴 The memory twin stops faking the @unique: a re-import OVERWRITES the person already
    // in the book, which is how one number becomes two verdicts.
    name: "store.ts — the memory contact create no longer refuses a duplicate msisdn",
    file: "src/lib/server/store.ts",
    from: `      if (store.contactsByMsisdn.has(row.msisdn)) return null;`,
    to: `      // (the duplicate check removed)`,
    expect: `19.unique.memory · the memory create refuses an msisdn already in the book, and does not overwrite`,
  },
  {
    // 🔴 SUBTLER, AND WORSE: the check stays but the index it reads is never written, so the
    // FIRST duplicate passes and the guard above still looks satisfied.
    name: "store.ts — the memory contact create stops maintaining the secondary index",
    file: "src/lib/server/store.ts",
    from: `      store.contactsByMsisdn.set(row.msisdn, row.id);`,
    to: `      // (secondary index not maintained)`,
    expect: `19.unique.memory.index · the memory create MAINTAINS the secondary index it refuses on`,
  },
  {
    // 🔴 The silent-production-no-op in its original shape: the column is written but never
    // read back, so one twin answers with a field the other has lost.
    name: "prisma-dal.ts — the contact read mapper drops suppressedAt",
    file: "src/lib/server/prisma-dal.ts",
    from: `    suppressedAt: iso(c.suppressedAt),`,
    to: `    suppressedAt: null,`,
    expect: `19.read · toStoredMarketingContact maps "suppressedAt" from the row`,
  },
  {
    // 🔴 Re-adding walks `addedAt` forward, destroying the only record of when a list was built.
    name: "prisma-dal.ts — contactListMember.add stops returning the row already there",
    file: "src/lib/server/prisma-dal.ts",
    from: `      if (existing) return toStoredContactListMember(existing);`,
    to: `      // (always create, walking addedAt forward)`,
    expect: `19.readd.prisma · the Prisma add reads first and returns the existing row, never upserting`,
  },
  {
    name: "store.ts — the memory add replaces an existing membership instead of keeping it",
    file: "src/lib/server/store.ts",
    from: `      const existing = store.contactListMembers.get(k);
      if (existing) return existing;`,
    to: `      const existing = store.contactListMembers.get(k);`,
    expect: `19.readd.memory · the memory add returns the existing member rather than replacing it`,
  },
  {
    // 🔴 D16 ITSELF: the book starts carrying a COPY of the account, so erasing the player
    // leaves a marketable row behind.
    name: "prisma-dal.ts — the contact mapper copies the account's name through the relation",
    file: "src/lib/server/prisma-dal.ts",
    from: `    displayName: c.displayName,`,
    to: `    displayName: c.user.name,`,
    expect: `19.link.mapper · the read mapper never reaches through a \`user\` relation`,
  },
  {
    // 🔴 One twin loses a member — the exact asymmetry every marketing suite would then run
    // against without noticing, because they all run on the memory twin.
    name: "prisma-dal.ts — the Prisma contact namespace loses count()",
    file: "src/lib/server/prisma-dal.ts",
    from: `    count: async (): Promise<number> => pc().marketingContact.count(),`,
    to: `    // (count removed from the Prisma twin only)`,
    expect: `19.parity.marketingContact · both twins expose the same members`,
  },
  /* ── §20 · the consent ledger's clock (S10, 2026-10-01) ─────────────────────────────── */
  {
    // 🔴 THE TIE ITSELF, as it shipped: the opt-out page's ledger row goes back to a random id
    // and the wall clock, so a stop and a resume in one millisecond read back at random.
    name: "optout-service.ts — the opt-out ledger row goes back to randomUUID() + new Date()",
    file: "src/lib/server/marketing/optout-service.ts",
    from: `    ...ledgerStamp(),
    channel: "SMS",`,
    to: `    id: randomUUID(),
    createdAt: new Date().toISOString(),
    channel: "SMS",`,
    expect: `20.stamp · optout-service.ts — every ledger row takes its id AND createdAt from ledgerStamp(), nothing else`,
  },
  {
    name: "consent-ledger.ts — the register/profile ledger row goes back to randomUUID() + new Date()",
    file: "src/lib/server/marketing/consent-ledger.ts",
    from: `        ...ledgerStamp(),`,
    to: `        id: randomUUID(),
        createdAt: new Date().toISOString(),`,
    expect: `20.stamp · consent-ledger.ts — every ledger row takes its id AND createdAt from ledgerStamp(), nothing else`,
  },
  {
    // The counter that breaks a same-millisecond tie stops counting: every stamp in one
    // millisecond gets seq 0 and the random tail decides again.
    name: "ledger-stamp.ts — the in-millisecond counter stops counting",
    file: "src/lib/server/marketing/ledger-stamp.ts",
    from: `    clock.seq += 1;`,
    to: `    clock.seq = 0;`,
    expect: `20.clock · ledger-stamp holds a monotonic counter on globalThis and pads the id to fixed width`,
  },
  /* ── §21 · the audience where — one named shape, two translators (U24, S10 2026-10-01) ─────── */
  {
    // 🔴 THE WIDENING ITSELF: the memory translator tests `.length`, so a ticked-nothing selection reads as "no
    // constraint" and the whole book is the audience.
    name: "store.ts — the memory translator reads an empty selection as no constraint (`?.length` truthiness)",
    file: "src/lib/server/store.ts",
    from: `  if (w.ids !== null && !w.ids.includes(c.id)) return false;`,
    to: `  if (w.ids?.length && !w.ids.includes(c.id)) return false;`,
    expect: `21.empty · ⛔ neither translator tests an array's .length — every key is checked !== null, so an EMPTY array is NOTHING`,
  },
  {
    // 🔴 THE NULL TRAP: a bare `not` is `"sourceRef" <> 'erasure'`, NULL for every row with no sourceRef — the
    // production book empties while every memory suite stays green.
    name: "prisma-dal.ts — the erased exclusion loses its NULL arm",
    file: "src/lib/server/prisma-dal.ts",
    from: `  if (w.excludeSourceRef !== null) and.push({ OR: [{ sourceRef: null }, { sourceRef: { not: w.excludeSourceRef } }] });`,
    to: `  if (w.excludeSourceRef !== null) and.push({ OR: [{ sourceRef: { not: w.excludeSourceRef } }] });`,
    expect: `21.null · 🔴 the Prisma erased exclusion carries the NULL arm — OR [{ sourceRef: null }, { sourceRef: { not } }] — so a row with no sourceRef is kept`,
  },
  {
    // 🔴 A key the production translator forgets: a tag filter that narrows on memory and is IGNORED on Postgres.
    name: "prisma-dal.ts — the Prisma translator forgets the tags",
    file: "src/lib/server/prisma-dal.ts",
    from: `  if (w.tags !== null) and.push({ tags: { hasSome: w.tags } });`,
    to: `  // (tags dropped from the Prisma translator)`,
    expect: `21.prisma.tags · toPrismaContactWhere reads w.tags`,
  },
  {
    // 🔴 Erased rows counted on the suites' backend: the memory translator stops leaving the tombstone out.
    name: "store.ts — the memory translator stops excluding the erased tombstone",
    file: "src/lib/server/store.ts",
    from: `  if (w.excludeSourceRef !== null && c.sourceRef === w.excludeSourceRef) return false;`,
    to: `  // (the erased exclusion removed)`,
    expect: `21.memory.excludeSourceRef · contactMatchesAudience reads w.excludeSourceRef`,
  },
  {
    // 🔴 A part of a number searched as a number (moved from contacts-page red 5, memory half): a masked role
    // rebuilds a number digit by digit.
    name: "store.ts — the memory translator matches the number by prefix",
    file: "src/lib/server/store.ts",
    from: `  if (w.msisdn !== null && c.msisdn !== w.msisdn) return false;`,
    to: `  if (w.msisdn !== null && !c.msisdn.startsWith(w.msisdn)) return false;`,
    expect: `21.msisdn · ⛔ the number is matched EXACTLY in both twins — never a substring a masked role could walk digit by digit`,
  },
  {
    // …and the Prisma half, as U20's red case 5 planted it.
    name: "prisma-dal.ts — the Prisma translator searches INSIDE the number",
    file: "src/lib/server/prisma-dal.ts",
    from: `  if (w.msisdn !== null) and.push({ msisdn: w.msisdn });`,
    to: `  if (w.msisdn !== null) and.push({ msisdn: { contains: w.msisdn } });`,
    expect: `21.msisdn · ⛔ the number is matched EXACTLY in both twins — never a substring a masked role could walk digit by digit`,
  },
  {
    // 🔴 The walk loses its bound: one call reads the whole audience into memory (150,000 rows at §3c's scale).
    name: "prisma-dal.ts — the keyset walk's findMany loses its `take`",
    file: "src/lib/server/prisma-dal.ts",
    from: `        take: q.limit + 1,`,
    to: `        // (unbounded)`,
    expect: "21.window · every Prisma findMany in page and walk carries `take`, and the walk orders by id with `gt` — never `skip`",
  },
  {
    // 🔴 A contact with a repeated tag counted twice — the rail's pill promises more people than the filter finds.
    name: "prisma-dal.ts — tagCounts counts tag occurrences, not contacts",
    file: "src/lib/server/prisma-dal.ts",
    from: `        select t.tag as tag, count(distinct c.id)::int as n`,
    to: `        select t.tag as tag, count(*)::int as n`,
    expect: `21.tags.prisma · tagCounts counts each contact ONCE per tag in SQL, leaves the erased mark out NULL-safely, sorts ties in code-unit order and is bounded`,
  },
  /* ── §22 · the edit form's compare-and-set (U22, S10 2026-10-02) ───────────────────────────────── */
  {
    // 🔴 LAST WRITE WINS, ON POSTGRES ONLY: the conditional update loses its updatedAt clause, so a second officer's
    // stale save overwrites the first in production while every memory suite still refuses it.
    name: "prisma-dal.ts — the CAS where loses its updatedAt clause (last write wins on Postgres)",
    file: "src/lib/server/prisma-dal.ts",
    from: `          where: { id, updatedAt: new Date(guard.expectedUpdatedAt) },`,
    to: `          where: { id },`,
    expect: `22.prisma · the Prisma twin's write is ONE update whose where holds both id and updatedAt: new Date(guard.expectedUpdatedAt), and a refused compare is read back as stale or not_found`,
  },
  {
    // 🔴 …and on the twin every behavioural suite runs on: the memory compare is gone, so a stale edit lands.
    name: "store.ts — the memory CAS loses its compare (last write wins in memory)",
    file: "src/lib/server/store.ts",
    from: `      if (Date.parse(row.updatedAt) !== Date.parse(guard.expectedUpdatedAt)) return { ok: false, reason: "stale" };`,
    to: `      // (the compare removed)`,
    expect: `22.memory · the memory twin compares the row's updatedAt with guard.expectedUpdatedAt and returns stale BEFORE it writes`,
  },
  {
    // ⛔ C25 · the Prisma write stops stamping the caller's `at`: `@updatedAt` takes over, the twins hold different
    // instants, and the NEXT compare disagrees between the backends.
    // ⚠️ Four lines, because `            updatedAt: new Date(at),` also sits in the plain `update` above it.
    name: "prisma-dal.ts — the CAS write stops stamping the caller's at (C25 drift)",
    file: "src/lib/server/prisma-dal.ts",
    from: `            updatedAt: new Date(at),
          },
        });
        return { ok: true, row: toStoredMarketingContact(written) };`,
    to: `          },
        });
        return { ok: true, row: toStoredMarketingContact(written) };`,
    expect: `22.at · ⛔ C25 · BOTH twins write the caller's \`at\` as updatedAt, explicitly — never left to @updatedAt`,
  },
  /* ── §23 · the bulk where-methods (U23, S10 2026-10-02) — and §20's fourth ledger writer ───────────────────────── */
  {
    // 🔴 THE COIN FLIP BACK, IN THE BULK BAR: the officer's withdrawal goes back to a random id and the wall clock, so a
    // withdrawal and the consent it withdraws, written in one millisecond, read back at random.
    name: "contact-bulk.ts — the officer withdrawal's ledger row goes back to randomUUID() + new Date()",
    file: "src/lib/server/marketing/contact-bulk.ts",
    from: `        ...ledgerStamp(),
        channel: "SMS",
        identifier: c.msisdn,`,
    to: `        id: randomUUID(),
        createdAt: new Date().toISOString(),
        channel: "SMS",
        identifier: c.msisdn,`,
    expect: `20.stamp · contact-bulk.ts — every ledger row takes its id AND createdAt from ledgerStamp(), nothing else`,
  },
  {
    // 🔴 U18b's CLASS: the memory remove forgets what Postgres's ON DELETE CASCADE does, so every suite keeps the list
    // memberships production deletes — a list that still "holds" a removed contact.
    name: "store.ts — the memory removeWhere forgets the membership cascade",
    file: "src/lib/server/store.ts",
    from: `        for (const [k, m] of store.contactListMembers) if (m.contactId === c.id) store.contactListMembers.delete(k);`,
    to: `        // (the membership cascade forgotten)`,
    expect: `23.remove.memory.cascade · ⛔ the memory remove deletes the removed contact's list memberships — what Postgres's ON DELETE CASCADE does for the other twin`,
  },
  {
    // 🔴 …and the secondary index: the number stays "in the book" after its row is gone, so it can never be added again.
    name: "store.ts — the memory removeWhere leaves the unique index pointing at the removed row",
    file: "src/lib/server/store.ts",
    from: `        if (store.contactsByMsisdn.get(c.msisdn) === c.id) store.contactsByMsisdn.delete(c.msisdn);`,
    to: `        // (the index left behind)`,
    expect: `23.remove.memory.index · ⛔ the memory remove deletes the row AND frees the unique index it held (only while it still points at that row), so the number can be added again`,
  },
  {
    // 🔴 The 21st tag, on Postgres only: the cap leaves the raw statement, so a bulk tag pushes a full contact past C11's
    // limit while the memory twin refuses it — and the form can then never save that contact again.
    name: "prisma-dal.ts — the bulk tag statement loses the 20-tag cap",
    file: "src/lib/server/prisma-dal.ts",
    from: ` and cardinality("tags") < \${maxTags}::int`,
    to: ``,
    expect: `23.tag.prisma · the Prisma tag walks only rows lacking the tag and writes ONE statement per chunk that re-checks the tag is absent AND the row holds fewer than maxTags, stamping the caller's at and by`,
  },
  {
    // …and on the suites' twin.
    name: "store.ts — the memory tagWhere ignores the 20-tag cap",
    file: "src/lib/server/store.ts",
    from: `        if (c.tags.length >= maxTags) { out.full++; continue; }`,
    to: `        // (no cap)`,
    expect: `23.tag.memory · the memory tag leaves a carrier UNCHANGED, refuses a row at maxTags as FULL (C11), appends once and stamps the caller's at and by`,
  },
  {
    // 🔴 THE WIDENING: the untag walk drops the audience, so "untag these five" removes the tag from EVERY contact in
    // the book that carries it — in production only.
    name: "prisma-dal.ts — the bulk untag walks every carrier of the tag, not the audience",
    file: "src/lib/server/prisma-dal.ts",
    from: `        const carrying: Prisma.MarketingContactWhereInput[] = [where, { tags: { has: tag } }];`,
    to: `        const carrying: Prisma.MarketingContactWhereInput[] = [{ tags: { has: tag } }];`,
    expect: `23.scope.prisma · ⛔ each Prisma bulk member walks or deletes only INSIDE the translated where — never every row that carries a tag, never the whole book`,
  },
  {
    // 🔴 Re-adding walks `addedAt` forward (or throws on the compound key): when somebody joined a list is evidence.
    name: "prisma-dal.ts — the bulk list add loses skipDuplicates",
    file: "src/lib/server/prisma-dal.ts",
    from: `          out.changed += (await pc().contactListMember.createMany({ data: rows, skipDuplicates: true })).count;`,
    to: `          out.changed += (await pc().contactListMember.createMany({ data: rows })).count;`,
    expect: `23.add.prisma · the Prisma add is createMany with skipDuplicates (never an upsert, so an existing member keeps its addedAt), refuses a missing list first, and retries a chunk one row at a time on P2003`,
  },
  {
    // …and the memory twin overwrites an existing member, walking its addedAt forward.
    name: "store.ts — the memory addWhere overwrites an existing member",
    file: "src/lib/server/store.ts",
    from: `        if (store.contactListMembers.has(k)) { out.unchanged++; continue; }`,
    to: `        // (an existing member overwritten)`,
    expect: `23.add.memory · the memory add keeps an existing member UNTOUCHED (its original addedAt) — asked BEFORE it writes — stamps a new one with the caller's at, and refuses a list that does not exist, as the foreign key does`,
  },
  /* ── §24 · contact import staging — ContactImport / ContactImportRow (U29, S10 2026-10-02) ─────────────────────────── */
  {
    // ⭐ THE PLAN'S OWN RED: a key planted in ONE mapper only. The commit's resume point is written to Postgres and read
    // back as 0, so a resumed commit would start again from the file's first row — on Postgres only.
    name: "prisma-dal.ts — toStoredContactImport reads committedThrough as 0 (a key in one mapper only)",
    file: "src/lib/server/prisma-dal.ts",
    from: `    committedThrough: r.committedThrough,`,
    to: `    committedThrough: 0,`,
    expect: `24.read · toStoredContactImport maps "committedThrough" from the row`,
  },
  {
    // 🔴 THE STAGING COMPARE-AND-SET DROPPED, ON POSTGRES ONLY: two tabs posting one batch both move the cursor (the second
    // jumps it past rows nobody staged, or the unique line rolls back only the luckier one) while every memory suite
    // still refuses the second.
    name: "prisma-dal.ts — stageRows' conditional update loses stagedThrough: b.from - 1",
    file: "src/lib/server/prisma-dal.ts",
    from: `            where: { id: b.importId, status: "STAGING", stagedThrough: b.from - 1 },`,
    to: `            where: { id: b.importId, status: "STAGING" },`,
    expect: `24.cas.stage.prisma · ⭐ stageRows is ONE interactive transaction, its timeout and maxWait set, whose FIRST write is the compare-and-set — updateMany where { id, status STAGING, stagedThrough: b.from - 1 } — and whose rows are inserted only after it, only when it counted 1`,
  },
  {
    // 🔴 after() BY OFFSET: a row erasure deletes between two pages shifts the walk, and the commit skips a row.
    name: "prisma-dal.ts — after() pages by offset instead of a keyset on ordinal",
    file: "src/lib/server/prisma-dal.ts",
    from: `        where: { importId: w.importId, ordinal: { gt: w.afterOrdinal } },`,
    to: `        where: { importId: w.importId },
        skip: w.afterOrdinal,`,
    expect: `24.keyset.prisma · ⭐ after() is a KEYSET on ordinal — where ordinal gt w.afterOrdinal, ordered ordinal asc, take bounded by CONTACT_IMPORT_ROW_PAGE_MAX — and never skip`,
  },
  {
    // …and the same three defects on the twin every behavioural suite runs on.
    name: "store.ts — the memory stageRows loses its compare-and-set on stagedThrough",
    file: "src/lib/server/store.ts",
    from: `      if (run.stagedThrough !== b.from - 1) return { ok: false, reason: run.stagedThrough > b.from - 1 ? "already_staged" : "out_of_order", run };`,
    to: `      // (the compare-and-set removed)`,
    expect: `24.cas.stage.memory · ⭐ the memory stageRows refuses unless the run is STAGING and stagedThrough is exactly b.from - 1 — both asked BEFORE any row or the run is written`,
  },
  {
    name: "store.ts — the memory after() pages by offset (an index) instead of the ordinal keyset",
    file: "src/lib/server/store.ts",
    from: `        .filter((row) => row.ordinal > w.afterOrdinal)`,
    to: `        .filter((_row, index) => index >= w.afterOrdinal)`,
    expect: `24.keyset.memory · …and the memory after() filters row.ordinal > w.afterOrdinal, sorts by ordinal and slices only from 0 — never an offset`,
  },
  {
    // 🔴 U18b's CLASS AGAIN: the memory purge forgets what Postgres's ON DELETE CASCADE does, so every suite keeps the
    // staged rows of a run production has deleted — a person's name kept past its period, in memory only.
    name: "store.ts — the memory purgeFinished forgets the purged runs' rows",
    file: "src/lib/server/store.ts",
    from: `        store.contactImportRows.delete(r.id);`,
    to: `        // (the rows left behind)`,
    expect: `24.purge.memory.cascade · ⭐ the memory purgeFinished deletes the purged runs' ROWS too — the ON DELETE CASCADE Postgres does for the other twin`,
  },
  /* ── §26 · the campaign tables (U35b, S10 2026-10-02) ──────────────────────────────────────────────── */
  {
    // 🔴 The read half of the no-op, on the campaign: the audience is written and read back as nothing — U40's watermark
    // compare and U42's walk would run against an empty filter on Postgres only.
    name: "prisma-dal.ts — toStoredSmsCampaign stops reading audienceFilter from the row",
    file: "src/lib/server/prisma-dal.ts",
    from: `    audienceFilter: cmp.audienceFilter,`,
    to: `    audienceFilter: "{}",`,
    expect: `26.read.campaign · toStoredSmsCampaign maps "audienceFilter" from the row`,
  },
  {
    // 🔴 A KEY PLANTED IN ONE MAPPER ONLY (the plan's red): the Prisma twin hands back a field the stored shape — and the
    // memory twin — never carry, so the two backends disagree about what a recipient row IS.
    name: "prisma-dal.ts — a key planted in the recipient read mapper alone",
    file: "src/lib/server/prisma-dal.ts",
    from: `    gateTrail: rcp.gateTrail as SmsCampaignGateTrail | null,`,
    to: `    gateTrail: rcp.gateTrail as SmsCampaignGateTrail | null,
    plantedKey: rcp.gateTrail as SmsCampaignGateTrail | null,`,
    expect: `26.exact.recipient · ⛔ toStoredSmsCampaignRecipient writes EXACTLY the stored keys — a key planted in the mapper alone is reported`,
  },
  {
    // 🔴 The write half, at birth: create names the column and stores a constant — every campaign born on Postgres would
    // be addressed to the whole book while the memory twin kept the officer's filter.
    name: "prisma-dal.ts — smsCampaign.create stores a constant audience instead of the row's",
    file: "src/lib/server/prisma-dal.ts",
    from: `          audienceFilter: row.audienceFilter,`,
    to: `          audienceFilter: "{}",`,
    expect: `26.create · smsCampaign.create writes "audienceFilter" FROM the row`,
  },
  {
    // 🔴 SKIPDUPLICATES REMOVED (the plan's red): an enqueue restart's second batch throws P2002 on Postgres and the
    // campaign stalls — or, written row by row around it, a person is put on twice. Every memory suite stays green.
    name: "prisma-dal.ts — the recipient batch loses skipDuplicates",
    file: "src/lib/server/prisma-dal.ts",
    from: `      const batch = await pc().smsCampaignRecipient.createMany({ data, skipDuplicates: true });`,
    to: `      const batch = await pc().smsCampaignRecipient.createMany({ data });`,
    expect: `26.unique.prisma · the Prisma batch is ONE createMany with skipDuplicates: true, and never an upsert`,
  },
  {
    // 🔴 The batch names the seed's key and drops its value: every recipient written on Postgres has no opt-out link, and
    // U42's "a row without a token is never sent" quietly holds the whole campaign.
    name: "prisma-dal.ts — the recipient batch writes optOutToken as null",
    file: "src/lib/server/prisma-dal.ts",
    from: `        optOutToken: s.optOutToken,`,
    to: `        optOutToken: null,`,
    expect: `26.createMany.prisma · the Prisma batch writes EXACTLY the seed's keys, each FROM the seed (and updatedAt from its createdAt) — no status, no smsReference, nothing that settles a row`,
  },
  {
    // 🔴 …and on the twin every suite runs on: the faked unique index is never asked, so a restart doubles the campaign.
    name: "store.ts — the memory recipient batch stops skipping a key already held",
    file: "src/lib/server/store.ts",
    from: `        if (store.recipientsByCampaignMsisdn.has(k) || store.smsCampaignRecipients.has(s.id) || planned.has(k)) return false;`,
    to: `        if (store.smsCampaignRecipients.has(s.id)) return false;`,
    expect: `26.unique.memory · the memory batch SKIPS a (campaignId, msisdn) key — or an id — already held, and the second of two in one batch`,
  },
  {
    name: "store.ts — the memory recipient batch stops maintaining the index it skips on",
    file: "src/lib/server/store.ts",
    from: `        store.recipientsByCampaignMsisdn.set(k, row.id);`,
    to: `        // (the index never written)`,
    expect: `26.unique.memory.index · …and MAINTAINS the index it skips on, for every row it writes`,
  },
  {
    // 🔴 A CONFIRMED SCOPE WIDENED, ON POSTGRES ONLY: the draft save's WHERE loses its DRAFT clause, so a stale form can
    // rewrite the audience of a campaign that has already been confirmed.
    name: "prisma-dal.ts — the draft save's WHERE loses status: \"DRAFT\"",
    file: "src/lib/server/prisma-dal.ts",
    from: `      const saved = await pc().smsCampaign.updateMany({ where: { id, status: "DRAFT", draftRevision: guard.draftRevision }, data });`,
    to: `      const saved = await pc().smsCampaign.updateMany({ where: { id, draftRevision: guard.draftRevision }, data });`,
    expect: `26.frozen.prisma · ⛔ the Prisma draft save is ONE updateMany whose WHERE holds status: "DRAFT" AND the guard's draftRevision and whose data is the patch — null on count 0 — and moves the revision on by one`,
  },
  {
    // 🔴 The draft save moves the revision and drops the officer's text: "saved" on production, nothing changed.
    name: "prisma-dal.ts — the draft save writes the revision and the stamp but not the patch",
    file: "src/lib/server/prisma-dal.ts",
    from: `      const saved = await pc().smsCampaign.updateMany({ where: { id, status: "DRAFT", draftRevision: guard.draftRevision }, data });`,
    to: `      const saved = await pc().smsCampaign.updateMany({ where: { id, status: "DRAFT", draftRevision: guard.draftRevision }, data: { draftRevision: guard.draftRevision + 1, updatedAt: new Date(at) } });`,
    expect: `26.frozen.prisma · ⛔ the Prisma draft save is ONE updateMany whose WHERE holds status: "DRAFT" AND the guard's draftRevision and whose data is the patch — null on count 0 — and moves the revision on by one`,
  },
  {
    name: "store.ts — the memory draft save stops checking that the row is still a DRAFT",
    file: "src/lib/server/store.ts",
    from: `      if (row.status !== "DRAFT" || row.draftRevision !== guard.draftRevision) return null;`,
    to: `      if (row.draftRevision !== guard.draftRevision) return null;`,
    expect: `26.frozen.memory · ⛔ the memory draft save refuses unless the row is a DRAFT on the guard's revision, BEFORE it writes the patch, and moves the revision on by one`,
  },
  {
    name: "store.ts — the memory draft save moves the revision but never applies the patch",
    file: "src/lib/server/store.ts",
    from: `      for (const [k, v] of Object.entries(patch)) if (v !== undefined) (next as Record<string, unknown>)[k] = v;`,
    to: `      // (the patch never applied)`,
    expect: `26.frozen.memory · ⛔ the memory draft save refuses unless the row is a DRAFT on the guard's revision, BEFORE it writes the patch, and moves the revision on by one`,
  },
  {
    // 🔴 AN UNCONDITIONAL TRANSITION, ON POSTGRES ONLY: two officers' Pause and Stop both "win", and the row holds
    // whichever landed last — a cancelled campaign can come back as paused.
    name: "prisma-dal.ts — the transition's WHERE loses its status condition",
    file: "src/lib/server/prisma-dal.ts",
    from: `        where: { id, status: { in: [...t.from] }, ...(t.draftRevision !== null ? { draftRevision: t.draftRevision } : {}) },`,
    to: `        where: { id, ...(t.draftRevision !== null ? { draftRevision: t.draftRevision } : {}) },`,
    expect: `26.transition.prisma · ⛔ the Prisma transition is ONE updateMany with status: { in: [...t.from] } in the WHERE (and the revision when one is given) and the patch as its data — null on count 0`,
  },
  {
    // The status moves and the confirmation's or the engine's fields are dropped — a CONFIRMED row with no population.
    name: "prisma-dal.ts — the transition writes the stamp but not the patch",
    file: "src/lib/server/prisma-dal.ts",
    from: `        data,
      });
      if (moved.count === 0) return null;`,
    to: `        data: { updatedAt: new Date(t.at) },
      });
      if (moved.count === 0) return null;`,
    expect: `26.transition.prisma · ⛔ the Prisma transition is ONE updateMany with status: { in: [...t.from] } in the WHERE (and the revision when one is given) and the patch as its data — null on count 0`,
  },
  {
    name: "store.ts — the memory transition stops checking `from`",
    file: "src/lib/server/store.ts",
    from: `      if (row === undefined) return null;
      if (!t.from.includes(row.status)) return null;`,
    to: `      if (row === undefined) return null;`,
    expect: "26.transition.memory · ⛔ the memory transition refuses a row no longer in `from`, or on another revision, BEFORE it writes the patch",
  },
  {
    name: "store.ts — the memory transition moves the status but never applies the patch",
    file: "src/lib/server/store.ts",
    from: `      for (const [k, v] of Object.entries(t.patch)) if (v !== undefined) (next as Record<string, unknown>)[k] = v;`,
    to: `      // (the patch never applied)`,
    expect: "26.transition.memory · ⛔ the memory transition refuses a row no longer in `from`, or on another revision, BEFORE it writes the patch",
  },
  {
    // The counts read every row into the process and tally them — 150,000 rows for one rail at §3c's scale.
    name: "prisma-dal.ts — countByStatus reads the rows and tallies them instead of one groupBy",
    file: "src/lib/server/prisma-dal.ts",
    from: `      const groups = await pc().smsCampaignRecipient.groupBy({ by: ["status"], where: { campaignId }, _count: { _all: true } });`,
    to: `      const rows = await pc().smsCampaignRecipient.findMany({ where: { campaignId } });
      const groups = Object.entries(rows.reduce<Record<string, number>>((m, x) => ({ ...m, [x.status]: (m[x.status] ?? 0) + 1 }), {})).map(([status, n]) => ({ status, _count: { _all: n } }));`,
    expect: `26.counts.prisma · the Prisma countByStatus is ONE groupBy by status — never the rows — returned through fillRecipientCounts`,
  },
  {
    // 🔴 One twin loses a member — a call that works in every suite and throws on production.
    name: "prisma-dal.ts — the Prisma recipient namespace loses find",
    file: "src/lib/server/prisma-dal.ts",
    from: `    find: async (id: string): Promise<StoredSmsCampaignRecipient | null> => {`,
    to: `    findOne: async (id: string): Promise<StoredSmsCampaignRecipient | null> => {`,
    expect: `26.parity.smsCampaignRecipient · both twins expose the same members`,
  },
  {
    // 🔴 OD26: a stored counter on the campaign — the number a crash between two writes leaves wrong for ever.
    name: "store.ts — StoredSmsCampaign gains sentCount",
    file: "src/lib/server/store.ts",
    from: `export type StoredSmsCampaign = {`,
    to: `export type StoredSmsCampaign = {
  sentCount: number;`,
    expect: `26.nocounter · ⛔ no stored counter among StoredSmsCampaign's keys (OD26) — audienceCount, the confirmed population, is the one *Count`,
  },
  {
    // 🔴 The record that we messaged somebody becomes deletable.
    name: "store.ts — the memory recipient namespace gains a delete",
    file: "src/lib/server/store.ts",
    from: `  smsCampaignRecipient: {`,
    to: `  smsCampaignRecipient: {
    deleteForCampaign: (campaignId: string): number => 0,`,
    expect: `26.nodelete · ⛔ neither twin's campaign or recipient namespace exposes a delete, or removes a row (a recipient row is the record that we messaged somebody)`,
  },
  {
    // 🔴 THE ONE KEY'S SECOND SPELLING: without the batch check a "+255…" row sits beside the "255…" one, and the unique
    // index cannot see that they are one person — on Postgres only.
    name: "prisma-dal.ts — the Prisma recipient batch stops calling assertSeeds",
    file: "src/lib/server/prisma-dal.ts",
    from: `      assertSeeds(seeds);
      if (seeds.length === 0) return { inserted: 0, duplicates: 0 };`,
    to: `      if (seeds.length === 0) return { inserted: 0, duplicates: 0 };`,
    expect: `26.key · ⛔ both twins call assertSeeds(seeds) BEFORE their first write — a +255 spelling, a 1,001st seed or a settle key refuses the WHOLE batch`,
  },
  {
    // 🔴 D16 on the campaign: the recipient row carries a COPY of the contact's number, so erasing the contact leaves it.
    name: "prisma-dal.ts — the recipient mapper reads the number through the contact relation",
    file: "src/lib/server/prisma-dal.ts",
    from: `    campaignId: rcp.campaignId,
    msisdn: rcp.msisdn,`,
    to: `    campaignId: rcp.campaignId,
    msisdn: rcp.contact.msisdn,`,
    expect: `26.link · ⛔ the recipient mapper reaches no relation — no contact, user or campaign read through it — so it can copy no person's details`,
  },
  {
    // The memory transition stops asking the rule set: a frozen key from CONFIRMED, a move back to DRAFT, a terminal row
    // resumed — every one accepted on the suites' backend.
    name: "store.ts — the memory transition stops asking assertTransitionShape",
    file: "src/lib/server/store.ts",
    from: `      assertTransitionShape(t);
      const row = store.smsCampaigns.get(id);`,
    to: `      const row = store.smsCampaigns.get(id);`,
    expect: `26.shape · both twins ask the ONE rule set FIRST: create → assertNewCampaign, update → assertDraftPatch (with the caller's at), transition → assertTransitionShape`,
  },
  {
    // The write half of the no-op, on the campaign: a stop reason written by the engine reaches nothing on Postgres.
    name: "prisma-dal.ts — SMS_CAMPAIGN_COLUMN forgets stopReason",
    file: "src/lib/server/prisma-dal.ts",
    from: `  enqueuedAt: "date",
  stopReason: "plain",`,
    to: `  enqueuedAt: "date",
  stopReasonX: "plain",`,
    expect: `26.map · SMS_CAMPAIGN_COLUMN names "stopReason"`,
  },
  {
    // An ISO string reaching a Prisma DateTime throws on Postgres and nowhere else.
    name: "prisma-dal.ts — SMS_CAMPAIGN_COLUMN types pausedAt plain",
    file: "src/lib/server/prisma-dal.ts",
    from: `  startedAt: "date",
  pausedAt: "date",
  finishedAt: "date",`,
    to: `  startedAt: "date",
  pausedAt: "plain",
  finishedAt: "date",`,
    expect: `26.date · "pausedAt" is typed "date" in the map`,
  },
  {
    // A caller that edits the returned trail edits the stored one — a state Postgres, which hands back fresh rows, cannot reach.
    name: "store.ts — the memory recipient find hands back the stored gate trail",
    file: "src/lib/server/store.ts",
    from: `      return row ? { ...row, gateTrail: row.gateTrail === null ? null : row.gateTrail.map((g) => ({ ...g })) } : null;`,
    to: `      return row ? { ...row } : null;`,
    expect: `26.find · both finds read one row by id and hand back a copy — the gate trail copied too — never the stored object`,
  },
  {
    // 🔴 A removed contact leaves its recipients pointing at nothing in memory only — Postgres' SET NULL not mirrored, so
    // every suite reads a contact link production no longer has.
    name: "store.ts — the memory contact removal stops nulling the campaign recipients' link",
    file: "src/lib/server/store.ts",
    from: `        for (const r of store.smsCampaignRecipients.values()) if (r.contactId === c.id) r.contactId = null;`,
    to: `        // (the recipients' link left dangling)`,
    expect: `26.setnull.memory · ⛔ the memory twin's contact removal sets a recipient's contactId to null and deletes no recipient — Postgres' SET NULL, mirrored`,
  },
];
