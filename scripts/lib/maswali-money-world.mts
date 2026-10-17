/**
 * THE MILLIONEA MONEY WORLD — one set of fixtures for the S3 money suites (`test:maswali-purchase`, `test:maswali-settle`),
 * on either store. It sits on the house-bot world (`house-bot-world.mts`: funded players, desk designations, `backdate`).
 *
 * ⛔ EVERY WEEK AND EVERY TICKET GOES THROUGH THE PRODUCT'S OWN DOORS: the licence ceremony, the Owner's guarantee
 *    ceremony, `createWeek` → `attestParity` → `openWeek`, `purchaseMaswaliTickets` (the one bet path), `closeWeek`,
 *    `sealQuestion`. Never a seeded ticket (MASWALI-PLAN §11: the responsible-gambling gates live only on `buyPosition`).
 * ⏱ THE WEEK'S CLOCK IS INJECTED, MONEY'S IS REAL. The weeks sit two and more weeks ahead of today, opened, closed and
 *    sealed at their own instants (`now`), exactly as the S2 engine suite runs them; a purchase reads the real database
 *    clock, which is before every close. The settlement takes the week's clock for the objection window.
 *
 * ⛔ IMPORT ORDER IS THE CONTRACT (the stores pick Postgres or memory on first import): the child sets the environment,
 *    then awaits `loadMaswaliWorld()`.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
type Any = any;
import { loadWorld } from "./house-bot-world.mts";

export const DRAFTER = "usr_mln_drafter";
export const READER = "usr_mln_reader";
export const SEALER = "usr_mln_sealer";
export const OWNER = "usr_mln_owner";
export const RELEASER = "usr_mln_accounting";
const DAY = 86_400_000;

export async function loadMaswaliWorld() {
  // R10a · THE TICKET ARM ASKS THE REAL ROLLOUT ITSELF (defence in depth), so the world's purchases meet it too: the
  // ceiling is raised to ACTIVE the way production raises it (`FEATURE_MILLIONEA`; a fresh store's switch is unset, so the
  // ceiling decides). `buy`'s injected `state` still drives `purchaseMaswaliTickets`' own check; a case that needs the
  // product itself below ACTIVE sets the variable and puts it back.
  process.env.FEATURE_MILLIONEA = "ACTIVE";
  const w = await loadWorld();
  const svc: Any = await import("../../src/lib/server/maswali-service.ts");
  const money: Any = await import("../../src/lib/server/maswali-money-service.ts");
  const settle: Any = await import("../../src/lib/server/maswali-settlement.ts");
  const dal: Any = await import("../../src/lib/server/maswali-dal.ts");
  const ledger: Any = await import("../../src/lib/server/ledger.ts");
  const { eatWeekStartMs, eatWeekAt }: Any = await import("../../src/lib/eat-day.ts");
  const { utcToZonedLocal }: Any = await import("../../src/lib/maswali-time.ts");
  const { recordLicenceBasis }: Any = await import("../../src/lib/server/maswali-licence.ts");
  const { MAIN_COUNT }: Any = await import("../../src/lib/maswali-score.ts");

  const SOURCES = [
    { category: "sports", url: "https://www.nbc.co.tz/results" }, { category: "sports", url: "https://www.tff.or.tz/fixtures" },
    { category: "macro", url: "https://www.bot.go.tz/rates" }, { category: "weather", url: "https://www.meteo.go.tz/bulletin" },
    { category: "crypto", url: "https://www.coingecko.com/en/coins/bitcoin" },
  ];
  const weekStartAhead = (weeks: number) => eatWeekStartMs(Date.now()) + weeks * 7 * DAY;

  /** Fifteen clean questions, events on the Saturday after the week's Friday close (the engine suite's template). */
  function questions(weekStart: number) {
    return Array.from({ length: 15 }, (_, i) => {
      const main = i < 10;
      const src = SOURCES[i % SOURCES.length];
      const at = weekStart + 5 * DAY + (main ? 9 : 14) * 3_600_000 + i * 60 * 60_000;
      return {
        role: main ? "MAIN" : "RESERVE", ordinal: main ? i + 1 : i - 9, category: src.category,
        textEn: `Will event ${i + 1} happen?`, textSw: `Je, tukio la ${i + 1} litatokea?`, textZh: `第 ${i + 1} 个事件会发生吗？`,
        criterionEn: `YES if event ${i + 1} is confirmed by the source.`, criterionSw: `NDIO ikiwa tukio la ${i + 1} litathibitishwa.`,
        criterionZh: `如果第 ${i + 1} 个事件得到确认则为是。`,
        sourceUrl: src.url, eventKind: "SPORT", eventLocalStart: utcToZonedLocal(at, "Africa/Dar_es_Salaam"), eventZone: "Africa/Dar_es_Salaam",
        probabilityEstimate: 0.5, probabilitySource: "officer estimate from the source's form table",
      };
    });
  }

  /** The licence basis (OD-01) and the Owner's guarantee (MB-03), through their own ceremonies. */
  async function setup(o: { guarantee?: number } = {}): Promise<void> {
    dal.__resetMaswaliMemoryStores?.();
    money.__resetMaswaliLedgerMirror?.();
    await recordLicenceBasis({ kind: "OWNER_RULING", ref: "Owner ruling 2026-10-16, docs/COMPLIANCE-DECISIONS.md" }, OWNER);
    if ((o.guarantee ?? 0) > 0) {
      const f = await money.fundMaswaliGuarantee({ amount: o.guarantee, reference: "TEST-RAIL-0001", typed: money.GUARANTEE_FUND_WORD, ownerId: OWNER });
      if (!f.ok) throw new Error(`world.setup: the guarantee could not be funded: ${f.error}`);
    }
  }

  /** A week `weeksAhead` from today, drafted, attested and OPEN (its market created by the open). */
  async function openWeek(o: { weeksAhead: number; visibility?: "PUBLIC" | "DRIVE" }): Promise<{ week: Any; start: number }> {
    const start = weekStartAhead(o.weeksAhead);
    const c = await svc.createWeek({ weekStartMs: start, visibility: o.visibility ?? "PUBLIC", questions: questions(start), officerId: DRAFTER, now: new Date(start - 3 * DAY) });
    if (!c.ok) throw new Error(`world.openWeek: draft refused: ${c.error}`);
    const a = await svc.attestParity({ weekId: c.week.id, officerId: READER });
    if (!a.ok) throw new Error(`world.openWeek: attest refused: ${a.error}`);
    const r = await svc.openWeek({ weekId: c.week.id, officerId: DRAFTER, guarantee: money.guaranteeReader, now: new Date(start + 60_000) });
    if (!r.ok) throw new Error(`world.openWeek: open refused: ${r.error}`);
    return { week: r.week, start };
  }

  /** Fifteen picks: the ten mains all `main`, the reserves all YES (no main voids in these weeks, so reserves never score). */
  const slip = (main: "YES" | "NO" = "YES", missAt?: number) =>
    Array.from({ length: 15 }, (_, i) => (i < MAIN_COUNT ? (i === missAt ? (main === "YES" ? "NO" : "YES") : main) : "YES"));
  const WIN = slip("YES");
  const LOSE = slip("YES", 0);

  /**
   * A purchase through the one bet path, `purchaseMaswaliTickets`' rollout read as `state` (ACTIVE unless a case says
   * otherwise). ⚠️ The ticket arm then reads the REAL rollout (`FEATURE_MILLIONEA`, set above) — R10a.
   */
  async function buy(userId: string, weekId: string, slips: Any[], o: { key?: string; state?: string } = {}): Promise<Any> {
    return svc.purchaseMaswaliTickets({
      userId, weekId, slips, idempotencyKey: o.key, stateNow: async () => o.state ?? "ACTIVE",
    });
  }

  /** `n` tickets for a week, spread over players of `perPlayer` each, every ticket with the same slip. Returns the buyers. */
  async function sell(weekId: string, n: number, s: Any, players: string[], perPlayer = 10): Promise<void> {
    let left = n, i = 0;
    while (left > 0) {
      const take = Math.min(perPlayer, left);
      const r = await buy(players[i++], weekId, Array.from({ length: take }, () => s));
      if (!r.ok) throw new Error(`world.sell: a purchase was refused: ${r.error} (${r.reason})`);
      left -= take;
    }
  }

  /** Close the sales at the week's own close, then seal all fifteen YES — or as `outcomes` says (a VOID with its ground). */
  async function closeAndSeal(week: Any, start: number, outcomes: Array<"YES" | "NO" | { void: string }> = []): Promise<Date> {
    const closeAt = new Date(Date.parse(week.closesAt) + 60_000);
    const c = await svc.closeWeek({ weekId: week.id, now: closeAt });
    if (!c.ok) throw new Error(`world.closeAndSeal: close refused: ${c.error}`);
    const sealAt = new Date(start + 9 * DAY); // the Tuesday after the weekend's events: every void deadline has passed
    for (let slot = 1; slot <= 15; slot++) {
      const o = outcomes[slot - 1] ?? "YES";
      const r = typeof o === "string"
        ? await svc.sealQuestion({ weekId: week.id, slot, outcome: o, evidence: `Official result for event ${slot}`, officerId: SEALER, now: sealAt })
        : await svc.sealQuestion({ weekId: week.id, slot, outcome: "VOID", voidReason: o.void, evidence: `The event ${slot} did not take place as drawn`, officerId: SEALER, now: sealAt });
      if (!r.ok) throw new Error(`world.closeAndSeal: seal ${slot} refused: ${r.error}`);
    }
    const after = await dal.weekStore.get(week.id);
    if (!after?.objectionsCloseAt) throw new Error("world.closeAndSeal: the graded set did not go final");
    return new Date(Date.parse(after.objectionsCloseAt) + 60_000);
  }

  /** Prepare and release a week's settlement, as accounting would. */
  async function release(weekId: string, now: Date): Promise<Any> {
    const p = await settle.previewMaswaliSettlement(weekId, now);
    // A settled week has nothing to prepare; the release itself answers whether it is already settled.
    if (!p.ok && (await dal.weekStore.get(weekId))?.state === "SETTLED") {
      return settle.settleMaswaliWeek({ weekId, releasedBy: RELEASER, digest: "", now });
    }
    if (!p.ok) return p;
    const r = await settle.settleMaswaliWeek({ weekId, releasedBy: RELEASER, digest: p.preview.digest, now });
    return r.ok ? { ...r, preview: p.preview } : r;
  }

  const balanceOf = (account: string) => money.maswaliAccountBalance(account);
  const acct = ledger.acct;

  return {
    ...w, w, svc, money, settle, dal, ledger, acct, eatWeekAt, weekStartAhead, questions, setup, openWeek, slip, WIN, LOSE, buy, sell,
    closeAndSeal, release, balanceOf,
  };
}
