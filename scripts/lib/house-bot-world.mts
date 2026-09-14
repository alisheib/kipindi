/**
 * THE HOUSE-BOT TEST WORLD — one set of fixtures for the seam, money and caps suites, on either store.
 *
 * ⛔ IMPORT ORDER IS THE CONTRACT. Every store picks Postgres or memory when its module is first
 * imported, so a caller sets `DATABASE_URL` / `USE_PRISMA_DAL` and only THEN awaits `loadWorld()`.
 *
 * Everything is created through the real services and DALs — `createMarket`, `buyPosition`, the house
 * stores — never by writing a row the product could not write, with two declared exceptions:
 *   · `backdate` moves a position's `placedAt` into the past, so an exit window or a rate window can
 *     be tested without waiting minutes. It is a fixture of TIME, not of money.
 *   · `setUserFields` sets role, status, recruiter or password hash directly, standing in for the
 *     officer and account flows that own those columns (they have suites of their own).
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
type Any = any;

export const OFFICER = "usr_hb_officer";
export const HOLDER_HASH = "hash_holder_v1";

export async function loadWorld() {
  process.env.MARKET_SCHEDULER = "false";
  const svc: Any = await import("../../src/lib/server/market-service.ts");
  const { db }: Any = await import("../../src/lib/server/store.ts");
  const mdal: Any = await import("../../src/lib/server/market-dal.ts");
  const dal: Any = await import("../../src/lib/server/house-bot-dal.ts");
  const constants: Any = await import("../../src/lib/house-bot/constants.ts");
  const { passwordFingerprint }: Any = await import("../../src/lib/server/password-reset.ts");
  const { labelKey }: Any = await import("../../src/lib/house-bot/rules.ts");
  const { prisma }: Any = await import("../../src/lib/server/prisma.ts");
  const onPostgres = !!process.env.DATABASE_URL && process.env.USE_PRISMA_DAL !== "false";

  let seq = 0;
  const uid = (p: string) => `${p}_${process.pid}_${++seq}`;
  const iso = (msFromNow = 0) => new Date(Date.now() + msFromNow).toISOString();

  async function user(o: { id?: string; balance?: number; bonusBalance?: number; role?: string; passwordHash?: string | null; recruitedBy?: string | null } = {}): Promise<string> {
    const id = o.id ?? uid("usr_hb");
    const now = iso();
    await db.user.create({
      id, phoneE164: `+2557${String(Math.floor(Math.random() * 1e8)).padStart(8, "0")}`, email: null,
      passwordHash: o.passwordHash ?? null, passwordSalt: null, failedLoginCount: 0, lockedUntil: null,
      role: o.role ?? "PLAYER", status: "ACTIVE", locale: "EN", displayName: null, dob: null, region: null,
      acceptedTermsVersion: null, acceptedTermsAt: null, marketingOptIn: false, twoFactorEnabled: false,
      avatarDataUrl: null, recruitedBy: o.recruitedBy ?? null, createdAt: now, updatedAt: now, lastLoginAt: null, closedAt: null,
    } as never);
    await db.wallet.create({
      id: `wal_${id}`, userId: id, balance: o.balance ?? 0, pending: 0, hold: 0, bonusBalance: o.bonusBalance ?? 0,
      currency: "TZS", status: "ACTIVE", createdAt: now, updatedAt: now,
    } as never);
    // The seeded cash enters the books as a deposit, so the trial balance measures what the suites DO,
    // not how the fixture funded the wallet. A seeded bonus has no grant behind it and is recorded so a
    // check can name it as the one expected difference.
    if ((o.balance ?? 0) > 0) {
      const { postLedgerEntries, depositEntries } = await import("../../src/lib/server/ledger.ts");
      await postLedgerEntries(`seed_${id}`, depositEntries({ txnId: `seed_${id}`, userId: id, amount: o.balance!, provider: "TEST_SEED" }));
    }
    if ((o.bonusBalance ?? 0) > 0) seededBonus.set(id, o.bonusBalance!);
    return id;
  }
  const seededBonus = new Map<string, number>();

  async function setUserFields(id: string, patch: Record<string, unknown>): Promise<void> {
    await db.user.update(id, patch);
  }

  /** A LIVE poll through `createMarket`. `graceMin` 0 gives stakes no exit window (locked on placement). */
  async function poll(o: { graceMin?: number; paidMin?: number; resolutionInMs?: number } = {}): Promise<Any> {
    return svc.createMarket({
      titleEn: "House seam poll", titleSw: "Soko la jaribio", category: "macro", sourceUrl: "https://bot.go.tz",
      resolutionCriterion: "Resolves at the official date.", resolutionAt: iso(o.resolutionInMs ?? 7 * 864e5), proposedBy: OFFICER,
      rateOverrides: { freeExitGraceMinutes: o.graceMin ?? 0, paidExitWindowMinutes: o.paidMin ?? 0 },
    });
  }

  /** Global limits generous enough that no case trips one it did not set. */
  const OPEN_LIMITS = {
    gCapDailyStakeTzs: 900_000_000, gCapDailyLossTzs: 900_000_000, gCapOpenExposureTzs: 900_000_000, gCapPerMarketTzs: 900_000_000,
    gMaxBetsPerMinute: 20, gMaxBetsPerDay: 28_800, gCounterPerPlayerPerDay: 1_440, gCounterPerPlayerTzsPerDay: 900_000_000,
    gCapStaffChosenPerDay: 200, gCapStaffChosenDailyTzs: 900_000_000, gStaffChosenMaxCounterpartyShare: 100,
  };
  const OPEN_CAPS = {
    stakeMinTzs: 1_000, stakeMaxTzs: 10_000_000, capPerMarketTzs: 900_000_000, capDailyStakeTzs: 900_000_000,
    capDailyLossTzs: 900_000_000, capOpenExposureTzs: 900_000_000, balanceFloorTzs: 0, freqMinGapSec: 0,
    freqMaxPerHour: 60, freqMaxPerDay: 1_440, freqMaxPerMarket: 6, capStaffChosenPerDay: 50, capStaffChosenDailyTzs: 900_000_000,
    targetsMaxActive: 50,
  };

  async function limits(patch: Record<string, unknown> = {}): Promise<void> {
    const c = await dal.houseBotControlStore.get();
    const r = await dal.houseBotControlStore.saveLimits(c.limitsVersion, { ...OPEN_LIMITS, ...patch });
    if (!r.ok) throw new Error("world.limits: CAS failed");
  }
  async function switchOn(): Promise<void> { await dal.houseBotControlStore.switchOn({ byId: OFFICER, reason: "test" }); }
  async function switchOff(): Promise<void> { await dal.houseBotControlStore.switchOff({ cause: "MANUAL", byId: OFFICER, reason: "test" }); }

  /** A designated, ACTIVE bot on a fresh holder with a real consent fingerprint and open caps. */
  async function bot(o: { balance?: number; bonusBalance?: number; caps?: Record<string, unknown>; holderId?: string } = {}): Promise<{ botId: string; userId: string }> {
    const userId = o.holderId ?? await user({ balance: o.balance ?? 5_000_000, bonusBalance: o.bonusBalance ?? 0, passwordHash: HOLDER_HASH });
    const botId = uid("hb");
    const label = `Bot ${seq}`;
    const now = iso();
    await dal.houseBotStore.designate({
      bot: {
        id: botId, userId, label, labelKey: labelKey(label), note: null, passwordFingerprint: passwordFingerprint(HOLDER_HASH),
        verifiedAt: now, verifiedById: OFFICER, designatedAt: now, designatedById: OFFICER, rules: { schemaVersion: 1 },
        ...Object.fromEntries(Object.keys(OPEN_CAPS).map((k) => [k, null])),
      },
      event: { actorId: OFFICER, reason: null, payload: null },
    });
    const saved = await dal.houseBotStore.saveRules(botId, 1, { ...OPEN_CAPS, ...(o.caps ?? {}) });
    if (!saved.ok) throw new Error("world.bot: saveRules CAS failed");
    const started = await dal.houseBotStore.setStatus(botId, { from: ["PAUSED"], to: "ACTIVE", pauseReason: null, pausedFromStatus: null });
    if (!started) throw new Error("world.bot: could not start");
    return { botId, userId };
  }

  async function setCaps(botId: string, patch: Record<string, unknown>): Promise<void> {
    const b = await dal.houseBotStore.get(botId);
    const r = await dal.houseBotStore.saveRules(botId, b.rulesVersion, patch);
    if (!r.ok) throw new Error("world.setCaps: CAS failed");
  }

  /** A CLAIMED intent matching a planned stake. Kind-specific fields go in `o`. */
  async function intent(b: { botId: string; userId: string }, marketId: string, o: Record<string, unknown> & { side?: string; stakeTzs?: number; kind?: string } = {}): Promise<Any> {
    const id = constants.HOUSE_ID_PREFIX ? `${constants.HOUSE_ID_PREFIX.intent}${uid("x")}` : uid("hbi_");
    const kind = o.kind ?? "FILL";
    const row = {
      id, houseBotId: b.botId, botUserId: b.userId, kind, marketId, productLine: "MARKET",
      anchorKey: kind === "COUNTER" ? String(o.triggerPositionId) : kind === "MANUAL" ? constants.manualAnchorKey(OFFICER, crypto.randomUUID()) : marketId,
      triggerPositionId: null, triggerUserId: null, targetId: null, requestedById: kind === "MANUAL" ? OFFICER : null,
      entryCondition: kind === "MANUAL" ? "THIN" : null, side: "YES", stakeTzs: 1_000,
      dueAt: iso(-1_000), deadlineAt: iso(3_600_000), staleAt: iso(600_000), status: "PENDING", reasonCode: null, why: null,
      decision: {}, attempts: 0, transientAttempts: 0, nextAttemptAt: null, claimedBy: null, claimedUntil: null,
      positionId: null, finishedAt: null, alertedAt: null,
      ...o,
    };
    await dal.houseBotIntentStore.insert(row);
    const claimed = await dal.houseBotIntentStore.claimById(id, "world");
    if (!claimed) throw new Error(`world.intent: could not claim ${id}`);
    return claimed;
  }

  /** The seam call exactly as `fire.ts` will make it. */
  function place(b: { botId: string; userId: string }, i: Any): Promise<Any> {
    return svc.placeHouseBet(b.userId, { marketId: i.marketId, side: i.side, stake: i.stakeTzs, idempotencyKey: constants.houseIntentKey(i.id) }, { botId: b.botId, intentId: i.id });
  }

  /** Move a position's placement instant into the past (a fixture of time; see the header). */
  async function backdate(positionId: string, byMs: number): Promise<void> {
    if (onPostgres) {
      await prisma()!.$executeRawUnsafe(`UPDATE "Position" SET "placedAt" = "placedAt" - ($1::int * interval '1 millisecond') WHERE "id" = $2`, byMs, positionId);
    } else {
      const p = await mdal.positionStore.get(positionId);
      p.placedAt = new Date(Date.parse(p.placedAt) - byMs).toISOString();
    }
  }

  /**
   * Age every house position placed in the last minute by 61 s, so a suite that places more than
   * `gMaxBetsPerMinute` (≤ 20 by CHECK) house bets a minute can test other caps. A fixture of time; the
   * per-minute cap itself is tested before anything calls this.
   */
  async function ageHouseMinute(): Promise<void> {
    if (onPostgres) {
      await prisma()!.$executeRawUnsafe(`UPDATE "Position" SET "placedAt" = "placedAt" - interval '61 seconds'`
        + ` WHERE "houseBotId" IS NOT NULL AND "placedAt" > (clock_timestamp() AT TIME ZONE 'UTC') - interval '61 seconds'`);
    } else {
      const cutoff = Date.now() - 61_000;
      for (const p of await mdal.positionStore.values()) {
        if (p.houseBotId != null && Date.parse(p.placedAt) > cutoff) p.placedAt = new Date(Date.parse(p.placedAt) - 61_000).toISOString();
      }
    }
  }

  const bal = async (userId: string) => (await db.wallet.findByUserId(userId)) as Any;
  const positionsOf = async (marketId: string) => (await svc.listPositionsForMarket(marketId)) as Any[];
  const txnsFor = async (positionId: string) => ((await db.txn.listAll()) as Any[]).filter((t) => t.positionId === positionId);

  return {
    svc, db, mdal, dal, constants, prisma, onPostgres, uid, iso,
    user, setUserFields, poll, limits, switchOn, switchOff, bot, setCaps, intent, place, backdate, ageHouseMinute, bal, positionsOf, txnsFor, seededBonus,
    OPEN_CAPS, OPEN_LIMITS,
  };
}

export type World = Awaited<ReturnType<typeof loadWorld>>;
