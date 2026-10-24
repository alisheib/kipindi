/**
 * test:fee-law-switch — THE NEW FEE LAW'S ONE-TIME SWITCH, DRIVEN (programme FEE-TAX-2026-10, release R5; the act:
 * `src/lib/server/fee-law-switch.ts`; Ali's go-live answer of 2026-10-24: "You do it, under my ruling" — the release
 * itself turns the new law on, recorded in his name, with no officer's click).
 *
 *   npx tsx scripts/fee-law-switch.test.mts     (npm run test:fee-law-switch — in predeploy)
 *
 *   §0 SHUT — while the gate is shut the act does nothing: no claim, no save, no banner, no audit row
 *   §1 ROLLBACK — each step made to fail in turn (the banner, the polls, Up & Down by refusal and by a throw): what was done
 *      is put back (the polls' model and rates, the banner), Up & Down is untouched, the record reads FAILED with the step,
 *      a COMPLIANCE row names it — and the law is NOT in force
 *   §2 THE ACT — the polls on stake-share at 13% with the 15% tax, Up & Down's default and every chain in any state on
 *      stake-share (a profile-less one included), the record DONE with `at`, the banner up in Swahili and English with the
 *      saved rates, ONE COMPLIANCE row; a market created now freezes v3 with the tax; the health word reads done
 *   §3 ONCE — run again: nothing moves and nothing is written; the instant stands
 *   §4 CLAIMS — a fresh claim of another container is left alone; a stale one is taken over and completed; a row this
 *      release cannot read is never overwritten (and is not retried)
 *   §5 THE SPLIT, THE BANNER, THE WIRING — a stored 13% split is kept, any other replaced by 3% + 10%; the banner is at most
 *      280 characters in every month, dated in East Africa Time, its rates the arguments (no literal in the sentence); the
 *      boot runs the act after the audit drain and the boot checks and before every scheduler; /api/health publishes it
 *
 * ⛔ IMPORT ORDER IS THE CONTRACT: every store picks memory or Postgres when it is first imported, so the environment comes
 *    first. This suite runs on memory only; the gate is opened IN THIS PROCESS through its test seam, never by editing it.
 */
delete process.env.DATABASE_URL;
process.env.USE_PRISMA_DAL = "false";
process.env.SESSION_SECRET ??= "fee-law-switch-secret-0123456789abcdef0123456789";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { decomment } from "./lib/decomment.mts";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const read = (rel: string) => readFileSync(`${ROOT}${rel}`, "utf8").replace(/\r\n/g, "\n");
const gate = await import("../src/lib/fee-law-gate.ts");
const SW = await import("../src/lib/server/fee-law-switch.ts");
const REC = await import("../src/lib/server/fee-switch-record.ts");
const MC = await import("../src/lib/server/market-config.ts");
const UC = await import("../src/lib/server/updown-config.ts");
const DAL = await import("../src/lib/server/updown-dal.ts");
const MS = await import("../src/lib/server/market-service.ts");
const PC = await import("../src/lib/server/platform-config.ts");
const AU = await import("../src/lib/server/audit.ts");
const SR = await import("../src/lib/server/source-registry.ts");
const { resolveFeeModel } = await import("../src/lib/payout.ts");
type Writers = Partial<import("../src/lib/server/fee-law-switch.ts").FeeLawSwitchWriters>;

let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, detail = "") => {
  cond ? pass++ : fail++;
  console.log(`${cond ? "PASS" : "FAIL"} ${label}${detail ? ` — ${detail}` : ""}`);
};
const section = (s: string) => console.log(`\n── ${s}`);
const j = (v: unknown) => JSON.stringify(v);
const row = () => REC.feeSwitchMemoryRow();
const actions = async (action: string) => {
  await AU.auditFlush();
  return AU.getAuditPage({ category: "COMPLIANCE", limit: 1_000 }).filter((e) => e.action === action);
};
const marketInput = (title: string) => ({
  titleEn: title, titleSw: title, category: "macro", sourceUrl: "https://bot.go.tz",
  resolutionCriterion: "Resolves at the official date.", resolutionAt: new Date(Date.now() + 7 * 864e5).toISOString(), proposedBy: "test",
}) as never;

// ── the world: the platform as production holds it today — loser-share, no tax, no banner — and chains in every state ──
DAL.__resetUpDownMemoryStores();
UC.__resetUpDownConfig();
await SR.seedDefaultSources();
const OFFICER = "usr_fee_switch_fixture";
const LS_PROFILE = { ...UC.DEFAULT_UPDOWN_CONFIG.defaultRateProfile };
const CAP_PROFILE = { feeModel: "capped-commission" as const, commissionRate: 0.13, feeCeilingRate: 1 / 3 };
{
  const now = new Date().toISOString();
  const plant = (id: string, state: "RUNNING" | "PAUSED" | "STOPPED" | "ARCHIVED", rateProfile: Record<string, unknown> | null) =>
    DAL.chainStore.upsert({ id, assetId: "ast_fee_switch", durationMinutes: 60, state, gridAnchorAt: now, nextBoundaryAt: null, currentRoundId: null,
      minStake: null, maxStake: null, rateProfile, marginBps: null, createdBy: OFFICER, createdAt: now, updatedAt: now });
  await plant("udc_sw_running", "RUNNING", { ...LS_PROFILE });
  await plant("udc_sw_paused", "PAUSED", { ...CAP_PROFILE });
  await plant("udc_sw_null", "STOPPED", null);
  await plant("udc_sw_archived", "ARCHIVED", { ...LS_PROFILE });
}
const PROMO = { active: true, message: "Promo: double points this weekend", tone: "success" as const };
await PC.setPlatformConfig({ announcement: PROMO }, OFFICER);
const pollsBefore = await MC.getGlobalConfig();
const chainsBefore = j((await UC.listChains()).map((c) => [c.id, c.rateProfile]));
const udDefaultBefore = j((await UC.getUpDownConfig()).defaultRateProfile);
/** The platform exactly as it stood before any attempt — what every rollback must return it to. */
const untouched = async () => {
  const g = await MC.getGlobalConfig();
  return g.feeModel === pollsBefore.feeModel && g.platformFeeRate === pollsBefore.platformFeeRate && g.operatorFeeRate === pollsBefore.operatorFeeRate
    && j((await UC.listChains()).map((c) => [c.id, c.rateProfile])) === chainsBefore && j((await UC.getUpDownConfig()).defaultRateProfile) === udDefaultBefore
    && j((await PC.getPlatformConfig()).announcement) === j(PROMO);
};

// ═══ §0 · SHUT ════════════════════════════════════════════════════════════════════════════════════════════════════════
section("§0 · SHUT — the act does nothing while the gate is shut");
{
  ok("0.0 · the world: loser-share with no tax, a promo banner up, four chains on two models", pollsBefore.feeModel === "loser-share"
    && pollsBefore.winningsTaxRate === undefined && (await UC.listChains()).length === 4 && gate.feeLawLive() === false, j({ m: pollsBefore.feeModel }));
  const out = await SW.runFeeLawSwitch({ banner: true });
  ok("0.1 · ★ with the gate shut: `gate-shut`, no claim, nothing saved, no banner, no row", out.state === "gate-shut" && row().value === null
    && (await untouched()) && (await actions("fee_law.switched")).length === 0 && (await actions("fee_law.switch_failed")).length === 0, j(out));
  const h = await SW.feeLawHealth();
  ok("0.2 · the health word: not live, no record, no instant", !h.live && h.switch === "none" && h.switchedAt === null, j(h));
  await SW.startFeeLawSwitchAtBoot();
  ok("0.3 · the boot's call is inert too", row().value === null && (await untouched()));
}

gate.__setFeeLawLiveForTest(true);
try {
  // ═══ §1 · ROLLBACK ═════════════════════════════════════════════════════════════════════════════════════════════════
  section("§1 · ROLLBACK — each step made to fail: what was done is put back, the record reads failed, a row names the step");
  {
    const fails = async (label: string, step: string, writers: Writers, rolled: string[]) => {
      const before = (await actions("fee_law.switch_failed")).length;
      const out = await SW.runFeeLawSwitch({ banner: true, writers });
      const rec = row().value as { state?: string; step?: string; rolledBack?: string[] } | null;
      const rows = await actions("fee_law.switch_failed");
      ok(`${label} · ★ fails at ${step}: ${rolled.length ? rolled.join(" + ") + " put back" : "nothing to put back"}, Up & Down untouched, the record FAILED at that step, ONE row`,
        out.ran && out.state === "failed" && out.step === step && j(out.rolledBack) === j(rolled) && (await untouched())
          && rec?.state === "failed" && rec.step === step && REC.parseFeeSwitchRecord(rec) === null && rows.length === before + 1
          && (rows[0]?.payload as { step?: string } | undefined)?.step === step,
        j({ out, rec }));
      ok(`${label}′ · …and the law is NOT in force: the health word reads failed, with no instant`,
        (await SW.feeLawHealth()).switch === "failed" && (await SW.feeLawHealth()).switchedAt === null && (await REC.readFeeSwitchRecord()) === null);
    };
    await fails("1.1", "banner", { setBanner: async () => ({ ok: false as const, error: "planted: the banner refused" }) }, []);
    await fails("1.2", "polls", { setPolls: async () => ({ ok: false as const, error: "planted: the polls refused" }) }, ["banner"]);
    await fails("1.3", "updown", { applyUpDown: async () => ({ ok: false as const, error: "planted: the chains refused" }) }, ["polls", "banner"]);
    await fails("1.4", "updown", { applyUpDown: async () => { throw new Error("planted: the chains threw"); } }, ["polls", "banner"]);
    const g = await MC.getGlobalConfig();
    ok("1.5 · the one trace a rollback leaves is the stored tax, inert under loser-share (only a stake-share stamp carries one)",
      g.feeModel === "loser-share" && g.winningsTaxRate === 0.15 && MC.snapshotFromConfig(g).winningsTaxRate === undefined, j({ m: g.feeModel, t: g.winningsTaxRate }));
  }

  // ═══ §2 · THE ACT ══════════════════════════════════════════════════════════════════════════════════════════════════
  section("§2 · THE ACT — every step, read back, recorded once");
  let at = "";
  {
    const t0 = Date.now();
    const out = await SW.runFeeLawSwitch({ banner: true });
    at = out.state === "done" ? out.at : "";
    ok("2.1 · ★ the act runs over the FAILED record (taken over) and completes: `done`, with the instant", out.ran && out.state === "done"
      && Date.parse(at) >= t0 - 1_000, j(out));
    const g = await MC.getGlobalConfig();
    ok("2.2 · ★ the polls: stake-share, 3% + 10% of every stake, the 15% winnings tax",
      g.feeModel === "stake-share" && g.platformFeeRate === 0.03 && g.operatorFeeRate === 0.1 && g.winningsTaxRate === 0.15, j({ m: g.feeModel, p: g.platformFeeRate, o: g.operatorFeeRate, t: g.winningsTaxRate }));
    const cfg = await UC.getUpDownConfig();
    const chains = await UC.listChains();
    const models = chains.map((c) => resolveFeeModel(UC.rateProfileOf(c, cfg)));
    ok("2.3 · ★ Up & Down: the default and EVERY chain — running, paused, stopped with no profile, archived — on stake-share at 3% + 10%, no tax in any profile",
      cfg.defaultRateProfile.feeModel === "stake-share" && cfg.defaultRateProfile.platformFeeRate === 0.03 && cfg.defaultRateProfile.operatorFeeRate === 0.1
        && !("winningsTaxRate" in cfg.defaultRateProfile) && chains.length === 4 && models.every((m) => m === "stake-share")
        && chains.every((c) => c.rateProfile !== null && !("winningsTaxRate" in (c.rateProfile as object))), j({ d: cfg.defaultRateProfile, models }));
    const rec = row().value as { state?: string; at?: string; by?: string; reason?: string; updown?: { moved?: number; total?: number }; polls?: { splitKept?: boolean } } | null;
    ok("2.4 · ★ the record: done, its instant the one every binding text reads, in the release's name and Ali's ruling",
      rec?.state === "done" && rec.at === at && (await REC.readFeeSwitchRecord())?.at === at && rec.by === SW.FEE_LAW_SWITCH_ACTOR
        && /Ali's rulings and go-live answers of 2026-10-24/.test(rec.reason ?? "") && rec.updown?.moved === 4 && rec.updown?.total === 4 && rec.polls?.splitKept === true,
      j(rec));
    const banner = (await PC.getPlatformConfig()).announcement;
    ok("2.5 · ★ the banner is up: Swahili first, then English, the saved 13% and 15%, TRA named, at most 280 characters",
      banner?.active === true && banner.tone === "info" && /^Kuanzia \d{1,2} [A-Z][a-z]{2} \d{4}: ada ni 13% ya kila dau/.test(banner.message)
        && / · From \d{1,2} [A-Z][a-z]{2} \d{4}: the fee is 13% of every stake, and a 15% winnings tax is withheld for TRA\./.test(banner.message)
        && banner.message.length <= SW.BANNER_MAX, banner?.message ?? "none");
    const rows = await actions("fee_law.switched");
    const p = rows[0]?.payload as { at?: string; polls?: { before?: { feeModel?: string }; after?: { feeModel?: string } }; banner?: { before?: unknown } } | undefined;
    ok("2.6 · ONE COMPLIANCE row, by the release's actor, with what stood before (the promo banner included) and after",
      rows.length === 1 && rows[0]?.actorId === SW.FEE_LAW_SWITCH_ACTOR && p?.at === at && p?.polls?.before?.feeModel === "loser-share"
        && p?.polls?.after?.feeModel === "stake-share" && j(p?.banner?.before) === j(PROMO), j(p));
    const m = await MS.createMarket(marketInput("Fee switch · after"));
    ok("2.7 · ★ a market created now freezes the new law: v3, stake-share, the 15% tax beside it",
      m.feeSnapshot?.v === 3 && m.feeSnapshot?.feeModel === "stake-share" && m.feeSnapshot?.winningsTaxRate === 0.15, j(m.feeSnapshot));
    const stamp = await UC.rateProfileForStamping(chains.find((c) => c.id === "udc_sw_null")!);
    ok("2.8 · …and an Up & Down round of the chain that had no profile stamps stake-share", stamp.ok && stamp.profile.feeModel === "stake-share", j(stamp));
    const h = await SW.feeLawHealth();
    ok("2.9 · the health word: live, done, the same instant", h.live && h.switch === "done" && h.switchedAt === at, j(h));
  }

  // ═══ §3 · ONCE ═════════════════════════════════════════════════════════════════════════════════════════════════════
  section("§3 · ONCE — a second run moves nothing");
  {
    const before = j({ g: await MC.getGlobalConfig(), c: (await UC.listChains()).map((c) => [c.id, c.rateProfile]), b: (await PC.getPlatformConfig()).announcement });
    const acts = (await UC.listFeeProfileActs()).length;
    const out = await SW.runFeeLawSwitch({ banner: true });
    ok("3.1 · ★ a second run answers `done` with the same instant and writes NOTHING — no save, no act, no row",
      !out.ran && out.state === "done" && out.at === at
        && j({ g: await MC.getGlobalConfig(), c: (await UC.listChains()).map((c) => [c.id, c.rateProfile]), b: (await PC.getPlatformConfig()).announcement }) === before
        && (await UC.listFeeProfileActs()).length === acts && (await actions("fee_law.switched")).length === 1, j(out));
    await SW.startFeeLawSwitchAtBoot();
    ok("3.2 · the boot's call over a done record is a no-op too", (await actions("fee_law.switched")).length === 1 && (row().value as { at?: string }).at === at);
    const tuned = await MC.setGlobalConfig({ winningsTaxRate: 0.16 }, OFFICER);
    const back = await MC.setGlobalConfig({ winningsTaxRate: 0.15 }, OFFICER);
    ok("3.3 · ★ after the act the tax is the admins' to change (Ali, 2026-10-03), and the switch never puts it back", tuned.ok && back.ok
      && (await SW.runFeeLawSwitch()).state === "done", tuned.ok ? "" : tuned.error);
  }

  // ═══ §4 · CLAIMS ═══════════════════════════════════════════════════════════════════════════════════════════════════
  section("§4 · CLAIMS — once across containers");
  {
    const done = row().value;
    const fresh = { state: "claimed", claimId: "fls_other", claimedAt: new Date().toISOString(), by: SW.FEE_LAW_SWITCH_ACTOR };
    row().value = fresh;
    const o1 = await SW.runFeeLawSwitch();
    ok("4.1 · ★ a FRESH claim of another container is left to it: `claimed-elsewhere`, the row untouched", o1.state === "claimed-elsewhere" && row().value === fresh, j(o1));
    const stale = { ...fresh, claimedAt: new Date(Date.now() - SW.CLAIM_STALE_MS - 60_000).toISOString() };
    row().value = stale;
    const o2 = await SW.runFeeLawSwitch();
    ok("4.2 · ★ a STALE claim (its container died mid-act) is taken over, and the act completes", o2.ran && o2.state === "done"
      && (row().value as { state?: string }).state === "done", j(o2));
    const odd = { hand: "edited" };
    row().value = odd;
    const o3 = await SW.runFeeLawSwitch();
    ok("4.3 · ★ a row this release cannot read is NEVER overwritten — reported, and not retried", o3.state === "unreadable" && o3.retry === false && row().value === odd, j(o3));
    ok("4.4 · …and the health word says so", (await SW.feeLawHealth()).switch === "unreadable");
    row().value = done;
    ok("4.5 · the state words, read from each shape", SW.feeSwitchStateOf(null) === "none" && SW.feeSwitchStateOf(fresh) === "claimed"
      && SW.feeSwitchStateOf({ state: "failed", claimId: "x" }) === "failed" && SW.feeSwitchStateOf(done) === "done"
      && SW.feeSwitchStateOf({ state: "done", at: "not a date" }) === "unreadable" && SW.feeSwitchStateOf([1]) === "unreadable");
  }
} finally {
  gate.__setFeeLawLiveForTest(null);
}

// ═══ §5 · THE SPLIT, THE BANNER, THE WIRING ═════════════════════════════════════════════════════════════════════════
section("§5 · the split, the banner, the wiring");
{
  const kept = SW.ruledSplit(0.02, 0.11), quarter = SW.ruledSplit(0.0325, 0.0975), other = SW.ruledSplit(0.05, 0.10);
  const blank = SW.ruledSplit(undefined, 0.10), between = SW.ruledSplit(0.03125, 0.09875);
  ok("5.1 · ★ a stored split totalling 13% is kept (2% + 11%, 3.25% + 9.75%); any other — 15%, a blank, a rate between basis points — is 3% + 10%",
    kept.kept && kept.platformFeeRate === 0.02 && kept.operatorFeeRate === 0.11 && quarter.kept && quarter.platformFeeRate === 0.0325
      && !other.kept && other.platformFeeRate === 0.03 && other.operatorFeeRate === 0.1 && !blank.kept && !between.kept && between.platformFeeRate === 0.03,
    j({ kept, quarter, other, blank, between }));
  const late = SW.switchBannerText(new Date("2026-10-24T21:30:00Z"), { stakeFeeRate: 0.13, winningsTaxRate: 0.15 });
  ok("5.2 · ★ the banner is dated in East Africa Time: 21:30 UTC on the 24th is the 25th in Dar es Salaam", late.startsWith("Kuanzia 25 Okt 2026:") && late.includes("From 25 Oct 2026:"), late);
  let longest = 0;
  for (let mo = 0; mo < 12; mo++) {
    const s = SW.switchBannerText(new Date(Date.UTC(2026, mo, 28, 9)), { stakeFeeRate: 0.1275, winningsTaxRate: 0.1725 });
    longest = Math.max(longest, s.length);
  }
  ok("5.3 · at most 280 characters in every month, even with two-decimal rates", longest <= SW.BANNER_MAX, `${longest}`);
  const odd = SW.switchBannerText(new Date("2026-11-03T10:00:00Z"), { stakeFeeRate: 0.12, winningsTaxRate: 0.2 });
  ok("5.4 · the rates are the arguments: 12% and 20% read 12% and 20%", odd.includes("ada ni 12% ya kila dau") && odd.includes("kodi ya 20% ya ushindi")
    && odd.includes("the fee is 12% of every stake") && odd.includes("a 20% winnings tax"), odd);
  const src = decomment(read("src/lib/server/fee-law-switch.ts"));
  const fn = src.slice(src.indexOf("export function switchBannerText"), src.indexOf("export type FeeLawSwitchWriters"));
  ok("5.5 · ⛔ no rate is written into the banner's sentences — no literal percentage in its function", fn.length > 200 && !/\d+(?:\.\d+)?%/.test(fn), fn.match(/\d+(?:\.\d+)?%/g)?.join(",") ?? "none");
  const boot = decomment(read("src/instrumentation.ts"));
  const iDrain = boot.indexOf("installAuditShutdownDrain("), iChecks = boot.indexOf("runBootChecks("), iSwitch = boot.indexOf("startFeeLawSwitchAtBoot");
  const firstScheduler = Math.min(...["hydrateSchedulerOnBoot", "hydrateUpDownOnBoot", "hydrateMaswaliOnBoot", "startLifecycleTicker", "startHouseBotEngine"].map((s) => boot.indexOf(s)).filter((i) => i >= 0));
  ok("5.6 · ★ the boot runs the act after the audit drain and the boot checks, and before every scheduler", iDrain > 0 && iChecks > iDrain && iSwitch > iChecks && iSwitch < firstScheduler,
    j({ iDrain, iChecks, iSwitch, firstScheduler }));
  const health = decomment(read("src/app/api/health/route.ts"));
  ok("5.7 · /api/health publishes the switch — the gate, the state word, the instant, nothing else", health.includes("await feeLawHealth()") && /\bfeeLaw,/.test(health));
  ok("5.8 · ⛔ the act's writers are the audited ones an officer's saves use — never a raw row write of a setting",
    /setPlatformConfig\(/.test(src) && /setGlobalConfig\(/.test(src) && /applyFeeProfileToEveryChain\(/.test(src) && !/saveConfig\(/.test(src));
}

console.log(`\nfee-law-switch: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
