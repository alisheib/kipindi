/**
 * test:fee-gate — EVERY DOOR OF THE NEW FEE LAW, SHUT AND THEN OPEN (programme FEE-TAX-2026-10, release R2, lane a).
 *
 *   npx tsx scripts/fee-gate.test.mts     (npm run test:fee-gate)
 *
 * `src/lib/fee-law-gate.ts` holds `FEE_LAW_LIVE = false` until release R5 flips it in the same commit that rewrites every
 * rule a player reads. Until then no door may put the `stake-share` model or a winnings tax into force. This suite drives
 * the REAL doors, in memory, three times:
 *
 *   §0  the switch itself: false in this build; the in-process seam flips it and puts it back; no door reads the bare
 *       constant (so flipping the seam really does open every door); the seam is named nowhere in `src/` but its file
 *   §1  SHUT — the platform save, a per-market override, an Up & Down profile (default, chain created, chain edited), the
 *       one act that moves every chain onto stake-share (or with a tax), and the stamp itself all REFUSE; the older laws
 *       still save — and, since the R2 review, the act's read-only dry run RUNS shut and a legacy move (capped ↔
 *       loser-share) goes through
 *   §2  OPEN (flipped in this process) — they ACCEPT, with the new rules: the tax required and bounded in whole basis points,
 *       the fee on every stake ≤ 30%, the winner-floor guard a WARNING (worst ratio + break-even lean), never a refusal;
 *       overrides still refuse a model or a tax; a profile never carries a tax; a chain on another model needs an explicit
 *       override; the default's model moves only with every chain — and that act moves every chain in ANY state in one go,
 *       counted by state, audited once, with a dry run that writes nothing; a market created now freezes v3 with the tax
 *   §3  SHUT AGAIN over a stored stake-share model (a hand-edited row before R5): every save refuses, and so does the stamp
 *       — for a poll and for a round — so a row cannot put the law into force either
 */
process.env.SESSION_SECRET ??= "test-only-session-secret-32chars-min-aaaa";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { decomment } from "./lib/decomment.mts";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const gate = await import("../src/lib/fee-law-gate.ts");
const MC = await import("../src/lib/server/market-config.ts");
const UC = await import("../src/lib/server/updown-config.ts");
const DAL = await import("../src/lib/server/updown-dal.ts");
const MS = await import("../src/lib/server/market-service.ts");
const SR = await import("../src/lib/server/source-registry.ts");
const AU = await import("../src/lib/server/audit.ts");
const { resolveFeeModel } = await import("../src/lib/payout.ts");

let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, detail = "") => {
  cond ? pass++ : fail++;
  console.log(`${cond ? "PASS" : "FAIL"} ${label}${detail ? ` — ${detail}` : ""}`);
};
const section = (s: string) => console.log(`\n── ${s}`);
const j = (v: unknown) => JSON.stringify(v);
const err = (r: { ok: boolean; error?: string; reason?: string }) => (r.ok ? "accepted" : (r.error ?? r.reason ?? ""));
async function rejection(p: Promise<unknown>): Promise<unknown> {
  try { await p; return null; } catch (e) { return e; }
}
function thrown(fn: () => unknown): unknown {
  try { fn(); return null; } catch (e) { return e; }
}

const OFFICER = "usr_fee_gate_officer";
/** The officer of §1's legacy moves — kept apart so §2's "ONE audit row" counts §2's act alone. */
const LEGACY_OFFICER = "usr_fee_gate_legacy";
const REFUSAL = "The new fee law";
const SS_PROFILE = { feeModel: "stake-share" as const, platformFeeRate: 0.03, operatorFeeRate: 0.10, feeCeilingRate: 1 / 3, estimatedWinningsRate: 0.4, showEstimatedWinnings: true };
const LS_PROFILE = { ...UC.DEFAULT_UPDOWN_CONFIG.defaultRateProfile };
const CAP_PROFILE = { feeModel: "capped-commission" as const, commissionRate: 0.13, feeCeilingRate: 1 / 3 };
const marketInput = (title: string) => ({
  titleEn: title, titleSw: title, category: "macro", sourceUrl: "https://bot.go.tz",
  resolutionCriterion: "Resolves at the official date.", resolutionAt: new Date(Date.now() + 7 * 864e5).toISOString(), proposedBy: "test",
}) as never;

DAL.__resetUpDownMemoryStores();
UC.__resetUpDownConfig();
await SR.seedDefaultSources();
await SR.addSource({ domain: "api.twelvedata.com", label: "Twelve Data", category: "crypto", rationale: "test fixture", addedBy: "system" });
const created = await UC.createAsset({
  key: "BTCGATE", symbol: "BTC/USD", nameEn: "Bitcoin", nameSw: "Bitcoin", iconKey: "crypto",
  priceSourceUrl: "https://api.twelvedata.com/quote", category: "crypto", decimals: 2, minMoveTicks: 2,
}, OFFICER);
if (!created.ok) throw new Error(`asset fixture: ${created.error}`);
const assetId = created.data.id;

// ═══ §0 · THE SWITCH ══════════════════════════════════════════════════════════════════════════════════════════════════
section("§0 · the switch");
ok("0.1 · ★ the law is NOT in force in this build", gate.FEE_LAW_LIVE === false && gate.feeLawLive() === false
  && (gate.newFeeLawRefusal() ?? "").startsWith(REFUSAL), gate.newFeeLawRefusal() ?? "null");
gate.__setFeeLawLiveForTest(true);
const flipped = gate.feeLawLive() && gate.newFeeLawRefusal() === null;
gate.__setFeeLawLiveForTest(null);
ok("0.2 · the seam opens it in THIS process and puts it back", flipped && gate.feeLawLive() === false);
{
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const f of readdirSync(dir)) {
      const p = join(dir, f);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.(ts|tsx)$/.test(f)) files.push(p);
    }
  };
  walk(join(ROOT, "src"));
  const own = (p: string) => relative(ROOT, p).replace(/\\/g, "/") === "src/lib/fee-law-gate.ts";
  const code = files.filter((p) => !own(p)).map((p) => [relative(ROOT, p).replace(/\\/g, "/"), decomment(readFileSync(p, "utf8"))] as const);
  const seamUsers = code.filter(([, s]) => s.includes("__setFeeLawLiveForTest")).map(([f]) => f);
  ok("0.3 · ⛔ the seam is named nowhere in src/ but its own file", files.length > 500 && seamUsers.length === 0, seamUsers.join(", ") || `${files.length} files read`);
  const bare = code.filter(([, s]) => /\bFEE_LAW_LIVE\b/.test(s)).map(([f]) => f);
  ok("0.4 · ⛔ no door reads the bare constant — every one asks `feeLawLive()` / `newFeeLawRefusal()`, so the seam proves them",
    bare.length === 0, bare.join(", "));
  const readers = code.filter(([, s]) => /\b(feeLawLive|newFeeLawRefusal)\(/.test(s)).map(([f]) => f).sort();
  ok("0.5 · the doors that ask it: market-config (validate + the stamp), updown-config (the act), the config form",
    ["src/app/admin/config/config-form.tsx", "src/lib/server/market-config.ts", "src/lib/server/updown-config.ts"].every((f) => readers.includes(f)), j(readers));
}

// ═══ §1 · SHUT ════════════════════════════════════════════════════════════════════════════════════════════════════════
section("§1 · SHUT — every door refuses the new law");
{
  const r1 = await MC.setGlobalConfig({ feeModel: "stake-share" }, OFFICER);
  ok("1.1 · ★ the platform save refuses stake-share, in the gate's words", !r1.ok && err(r1).startsWith(REFUSAL), err(r1));
  ok("1.2 · …and nothing changed", (await MC.getGlobalConfig()).feeModel === "loser-share");
  const r2 = await MC.setGlobalConfig({ winningsTaxRate: 0.15 }, OFFICER);
  const r2z = await MC.setGlobalConfig({ winningsTaxRate: 0 }, OFFICER);
  ok("1.3 · ★ …and any winnings tax, even 0%", !r2.ok && err(r2).startsWith(REFUSAL) && !r2z.ok && err(r2z).startsWith(REFUSAL), `${err(r2)} | ${err(r2z)}`);
  ok("1.4 · …so no tax is stored", (await MC.getGlobalConfig()).winningsTaxRate === undefined);
  const v = MC.validateRateConfig(SS_PROFILE, { scope: "profile" });
  ok("1.5 · an Up & Down profile on stake-share is refused by the shared validator", !v.ok && (v as { reason: string }).reason.startsWith(REFUSAL), err(v));
  const o1 = await MC.setMarketOverride("mkt_fee_gate", { feeModel: "stake-share" }, OFFICER);
  const o2 = await MC.setMarketOverride("mkt_fee_gate", { winningsTaxRate: 0.15 }, OFFICER);
  const o3 = await MC.setMarketOverride("mkt_fee_gate", { feeModel: "loser-share" }, OFFICER);
  ok("1.6 · a per-market override refuses a fee model or a tax — any model, gate or no gate", !o1.ok && !o2.ok && !o3.ok && /per-market override/.test(err(o3)), `${err(o1)} | ${err(o3)}`);
  const o4 = await MC.setMarketOverride("mkt_fee_gate", { minStake: 2_000 }, OFFICER);
  const c4 = await MC.clearMarketOverride("mkt_fee_gate", OFFICER);
  ok("1.7 · CONTROL · an override of the stake bounds still saves and clears", o4.ok && c4.ok, `${err(o4)} | ${c4.ok}`);
  const ch1 = await UC.createChain({ assetId, durationMinutes: 15, rateProfile: SS_PROFILE }, OFFICER, { allowFeeModelOverride: true });
  ok("1.8 · ★ a chain cannot be CREATED on stake-share — not even with the explicit override", !ch1.ok && err(ch1).startsWith(REFUSAL), err(ch1));
  const ch2 = await UC.createChain({ assetId, durationMinutes: 30 }, OFFICER);
  ok("1.9 · CONTROL · a chain on the default (loser-share) is created", ch2.ok && resolveFeeModel((ch2 as { data: { rateProfile: object } }).data.rateProfile) === "loser-share", err(ch2));
  const ch3 = ch2.ok ? await UC.updateChain(ch2.data.id, { rateProfile: SS_PROFILE }, OFFICER, { allowFeeModelOverride: true }) : { ok: false, error: "no chain" };
  ok("1.10 · ★ …and cannot be EDITED onto stake-share", !ch3.ok && err(ch3).startsWith(REFUSAL), err(ch3));
  const d1 = await UC.setUpDownConfig({ defaultRateProfile: SS_PROFILE }, OFFICER);
  ok("1.11 · the product default refuses it", !d1.ok && err(d1).startsWith(REFUSAL), err(d1));
  const a1 = await UC.applyFeeProfileToEveryChain(SS_PROFILE, OFFICER, "A test of the shut gate, never applied.");
  ok("1.12 · ★ the one act that moves every chain is refused onto stake-share while the gate is shut", !a1.ok && err(a1).startsWith(REFUSAL), err(a1));
  const taxed = await UC.applyFeeProfileToEveryChain({ ...LS_PROFILE, winningsTaxRate: 0.15 }, OFFICER, "A test of the shut gate, never applied.");
  ok("1.12b · …and so is any profile carrying a winnings tax", !taxed.ok && err(taxed).startsWith(REFUSAL), err(taxed));
  // FEE-TAX R2 review · the dry run is READ-ONLY, so it runs with the gate shut — the admin card's counts, R5's preview.
  const shape = j({ cfg: (await UC.getUpDownConfig()).defaultRateProfile, chains: (await UC.listChains()).map((c) => [c.id, c.rateProfile]) });
  const a2 = await UC.applyFeeProfileToEveryChain(SS_PROFILE, OFFICER, "", { dryRun: true });
  ok("1.12c · ★ the DRY RUN runs while the gate is shut: counts by state, the refusal the real act would meet named, nothing written",
    a2.ok && a2.data.dryRun && a2.data.total === 1 && a2.data.moved === 1 && (a2.data.refusal ?? "").startsWith(REFUSAL)
      && j({ cfg: (await UC.getUpDownConfig()).defaultRateProfile, chains: (await UC.listChains()).map((c) => [c.id, c.rateProfile]) }) === shape,
    a2.ok ? j(a2.data) : err(a2));
  // ⭐ FEE-TAX R2 review · a LEGACY move is not the new law: every chain to capped-commission and back, before R5.
  const toCapped = await UC.applyFeeProfileToEveryChain(CAP_PROFILE, LEGACY_OFFICER, "A legacy move, every chain to capped-commission and back.");
  const cfgCapped = await UC.getUpDownConfig();
  const cappedModels = (await UC.listChains()).map((c) => resolveFeeModel(UC.rateProfileOf(c, cfgCapped)));
  const toLoser = await UC.applyFeeProfileToEveryChain(LS_PROFILE, LEGACY_OFFICER, "A legacy move, every chain back to loser-share.");
  const cfgBack = await UC.getUpDownConfig();
  ok("1.12d · ★ a LEGACY move goes through while the gate is shut — every chain to capped-commission, then back to loser-share",
    toCapped.ok && toCapped.data.moved === 1 && cappedModels.every((m) => m === "capped-commission") && toLoser.ok && toLoser.data.moved === 1
      && cfgBack.defaultRateProfile.feeModel === "loser-share" && (await UC.listChains()).every((c) => j(c.rateProfile) === j(LS_PROFILE)),
    `${toCapped.ok ? j(toCapped.data) : err(toCapped)} | ${toLoser.ok ? j(toLoser.data) : err(toLoser)}`);
  const stamp = thrown(() => MC.snapshotFromConfig({ ...MC.DEFAULT_GLOBAL_CONFIG, feeModel: "stake-share", winningsTaxRate: 0.15 }));
  ok("1.13 · ★ the stamp itself refuses a stake-share market (`RatesRefused`) — the last door every product passes", MC.isRatesRefused(stamp) && String((stamp as Error).message).includes(REFUSAL), String(stamp));
  const okSave = await MC.setGlobalConfig({ feeModel: "loser-share", platformFeeRate: 0.03 }, OFFICER);
  ok("1.14 · CONTROL · the law in force still saves while the gate is shut", okSave.ok, err(okSave));
}

// ═══ §2 · OPEN ════════════════════════════════════════════════════════════════════════════════════════════════════════
section("§2 · OPEN (flipped in this process) — the doors accept, under the new rules");
gate.__setFeeLawLiveForTest(true);
let explicitChainId = "";
{
  const n1 = await MC.setGlobalConfig({ feeModel: "stake-share" }, OFFICER);
  ok("2.1 · stake-share with NO winnings tax saved is refused — the tax is never defaulted", !n1.ok && /winnings tax/.test(err(n1)), err(n1));
  const n2 = await MC.setGlobalConfig({ winningsTaxRate: 0.15005 }, OFFICER);
  const n3 = await MC.setGlobalConfig({ winningsTaxRate: 0.6 }, OFFICER);
  ok("2.2 · a tax between basis points, or above 50%, is refused", !n2.ok && !n3.ok, `${err(n2)} | ${err(n3)}`);
  const t1 = await MC.setGlobalConfig({ winningsTaxRate: 0.15 }, OFFICER);
  ok("2.3 · ★ the 15% is saved by an audited save (the model still loser-share — the tax is inert under it)", t1.ok && (await MC.getGlobalConfig()).winningsTaxRate === 0.15, err(t1));
  const n4 = await MC.setGlobalConfig({ feeModel: "stake-share", platformFeeRate: 0.25, operatorFeeRate: 0.10 }, OFFICER);
  ok("2.4 · a fee above 30% of every stake is refused", !n4.ok && /every stake/i.test(err(n4)), err(n4));
  const s1 = await MC.setGlobalConfig({ feeModel: "stake-share", platformFeeRate: 0.03, operatorFeeRate: 0.10 }, OFFICER);
  const warn = s1.ok ? s1.warn ?? "" : "";
  ok("2.5 · ★ stake-share saves, and the winner-floor guard WARNS — never refuses — with the worst ratio and the break-even lean",
    s1.ok && /87\.\d%/.test(warn) && warn.includes("14.95%"), s1.ok ? warn : err(s1));
  ok("2.5b · the worst case's pool is printed to one decimal — 99.9/0.1, never \"100/0\" (a one-sided pool is refunded in full)",
    warn.includes("99.9/0.1") && !warn.includes("100/0"), warn);
  const zero = await MC.setGlobalConfig({ platformFeeRate: 0, operatorFeeRate: 0 }, OFFICER);
  const zeroWarn = zero.ok ? zero.warn ?? "" : "";
  const restore = await MC.setGlobalConfig({ platformFeeRate: 0.03, operatorFeeRate: 0.10 }, OFFICER);
  ok("2.5c · with no fee at all no winner is paid below their stake — so the below-stake sentence is NOT emitted",
    zero.ok && zeroWarn.length > 0 && !/less than they staked/.test(zeroWarn) && restore.ok, zero.ok ? zeroWarn : err(zero));
  const g = await MC.getGlobalConfig();
  ok("2.6 · the platform is on stake-share at 13% with a 15% tax", g.feeModel === "stake-share" && g.platformFeeRate === 0.03 && g.operatorFeeRate === 0.10 && g.winningsTaxRate === 0.15, j({ m: g.feeModel, t: g.winningsTaxRate }));
  const o1 = await MC.setMarketOverride("mkt_fee_gate", { winningsTaxRate: 0.2 }, OFFICER);
  ok("2.7 · a per-market override still cannot carry a tax (or a model) with the gate open", !o1.ok, err(o1));
  const snap = MC.snapshotFromConfig(g);
  ok("2.8 · ★ the stamp is v3: stake-share, 3% + 10%, the 15% tax frozen beside it",
    snap.v === 3 && snap.feeModel === "stake-share" && snap.winningsTaxRate === 0.15 && snap.platformFeeRate === 0.03 && snap.operatorFeeRate === 0.10, j(snap));
  const noTax = thrown(() => MC.snapshotFromConfig({ ...g, winningsTaxRate: undefined }));
  ok("2.9 · …and refuses (`RatesRefused`) to stamp one without its tax", MC.isRatesRefused(noTax), String(noTax));
  // FEE-TAX R2 review · a rate between two basis points would be frozen as one rate and charged as another (rateBp rounds).
  const halfBp = thrown(() => MC.snapshotFromConfig({ ...g, platformFeeRate: 0.03125 }));
  const halfBpTax = thrown(() => MC.snapshotFromConfig({ ...g, winningsTaxRate: 0.12345 }));
  ok("2.9b · ★ …and refuses a hand-edited rate between two basis points — 0.03125, or a 0.12345 tax — in so many words",
    MC.isRatesRefused(halfBp) && /whole number of basis points/.test(String((halfBp as Error).message))
      && MC.isRatesRefused(halfBpTax) && /whole number of basis points/.test(String((halfBpTax as Error).message)), `${String(halfBp)} | ${String(halfBpTax)}`);
  const m = await MS.createMarket(marketInput("Fee gate · open"));
  ok("2.10 · ★ a market created now freezes the new law, read fresh and stamped complete", m.feeSnapshot?.v === 3 && m.feeSnapshot?.feeModel === "stake-share" && m.feeSnapshot?.winningsTaxRate === 0.15, j(m.feeSnapshot));

  // ── Up & Down ──
  const pv = MC.validateRateConfig({ ...SS_PROFILE, winningsTaxRate: 0.15 }, { scope: "profile" });
  ok("2.11 · a profile carrying a tax is refused — a round takes the platform's", !pv.ok && /cannot carry a winnings tax/.test(err(pv)), err(pv));
  const c1 = await UC.createChain({ assetId, durationMinutes: 15, rateProfile: SS_PROFILE }, OFFICER);
  ok("2.12 · ★ a chain on another model than the default's is refused without the explicit override", !c1.ok && /explicit override/.test(err(c1)), err(c1));
  const c2 = await UC.createChain({ assetId, durationMinutes: 15, rateProfile: SS_PROFILE }, OFFICER, { allowFeeModelOverride: true });
  explicitChainId = c2.ok ? c2.data.id : "";
  ok("2.13 · …and accepted with it", c2.ok, err(c2));
  const d1 = await UC.setUpDownConfig({ defaultRateProfile: SS_PROFILE }, OFFICER);
  ok("2.14 · ★ the default's MODEL moves only with every chain, in one act", !d1.ok && /every chain/.test(err(d1)), err(d1));

  // Every state, and a chain with no profile of its own.
  const now = new Date().toISOString();
  const plant = (id: string, state: "RUNNING" | "PAUSED" | "STOPPED" | "ARCHIVED", rateProfile: Record<string, unknown> | null) =>
    DAL.chainStore.upsert({ id, assetId: "ast_fee_gate", durationMinutes: 60, state, gridAnchorAt: now, nextBoundaryAt: null, currentRoundId: null,
      minStake: null, maxStake: null, rateProfile, marginBps: null, createdBy: OFFICER, createdAt: now, updatedAt: now });
  await plant("udc_gate_running", "RUNNING", { ...LS_PROFILE });
  await plant("udc_gate_paused", "PAUSED", { ...CAP_PROFILE });
  await plant("udc_gate_null", "STOPPED", null);
  await plant("udc_gate_archived", "ARCHIVED", { ...LS_PROFILE });
  const want = { RUNNING: { total: 1, moved: 1 }, PAUSED: { total: 1, moved: 1 }, STOPPED: { total: 3, moved: 2 }, ARCHIVED: { total: 1, moved: 1 } };
  const before = j((await UC.listChains()).map((c) => [c.id, c.rateProfile]));
  const dry = await UC.applyFeeProfileToEveryChain(SS_PROFILE, OFFICER, "Ali's ruling of 2026-10-24: every Up & Down chain to stake-share.", { dryRun: true });
  ok("2.15 · ★ the dry run counts by state — 6 chains, 5 to move (the explicit stake-share chain stays) — and writes nothing",
    dry.ok && dry.data.dryRun && dry.data.total === 6 && dry.data.moved === 5 && j(dry.data.byState) === j(want)
      && j((await UC.listChains()).map((c) => [c.id, c.rateProfile])) === before
      && (await UC.getUpDownConfig()).defaultRateProfile.feeModel === "loser-share", dry.ok ? j(dry.data) : err(dry));
  const applied = await UC.applyFeeProfileToEveryChain(SS_PROFILE, OFFICER, "Ali's ruling of 2026-10-24: every Up & Down chain to stake-share.");
  const cfg = await UC.getUpDownConfig();
  const chains = await UC.listChains();
  const models = chains.map((c) => resolveFeeModel(UC.rateProfileOf(c, cfg)));
  ok("2.16 · ★ applied: every chain in every state — the null one included — now freezes stake-share, and so does the default",
    applied.ok && !applied.data.dryRun && applied.data.moved === 5 && j(applied.data.byState) === j(want)
      && chains.length === 6 && models.every((x) => x === "stake-share") && cfg.defaultRateProfile.feeModel === "stake-share"
      && chains.find((c) => c.id === "udc_gate_null")?.rateProfile !== null, applied.ok ? j({ counts: applied.data, models }) : err(applied));
  ok("2.17 · a chain already on the model keeps its own profile — the act moves a model, not a chain's tuning",
    j(chains.find((c) => c.id === explicitChainId)?.rateProfile) === j(SS_PROFILE));
  await AU.auditFlush();
  const rows = AU.getAuditPage({ category: "ADMIN", actorId: OFFICER, limit: 500 }).filter((e) => e.action === "updown.fee_profile.applied_everywhere");
  const payload = rows[0]?.payload as { counts?: { moved?: number }; reason?: string } | undefined;
  ok("2.18 · ONE audit row, with the counts and the reason", rows.length === 1 && payload?.counts?.moved === 5 && /2026-10-24/.test(payload?.reason ?? ""), j(rows.map((r) => r.payload)));
  // FEE-TAX R2 review · the act's own record is written INSIDE its transaction, and the audit row names the same act.
  const acts = await UC.listFeeProfileActs();
  const last = acts[acts.length - 1] as { actId?: string; officerId?: string; reason?: string; at?: string; counts?: { moved?: number; byState?: unknown } } | undefined;
  ok("2.18b · ★ the act's record — officer, reason, counts, time — was written with it, and the audit row carries the same act id",
    acts.length === 3 && last?.officerId === OFFICER && /2026-10-24/.test(last?.reason ?? "") && last?.counts?.moved === 5 && j(last?.counts?.byState) === j(want)
      && typeof last?.at === "string" && !Number.isNaN(Date.parse(last.at)) && applied.ok && last?.actId === applied.data.actId
      && (rows[0]?.payload as { actId?: string } | undefined)?.actId === last?.actId,
    j(acts.map((a) => ({ actId: (a as { actId?: string }).actId, officerId: (a as { officerId?: string }).officerId }))));
  const inherit = await UC.createChain({ assetId, durationMinutes: 5 }, OFFICER);
  const stale = await UC.createChain({ assetId, durationMinutes: 10, rateProfile: LS_PROFILE }, OFFICER);
  ok("2.19 · after it: a new chain takes stake-share; one on the old model is refused without an override — and the refusal SAYS why",
    inherit.ok && resolveFeeModel(inherit.data.rateProfile as object) === "stake-share"
      && !stale.ok && /This fee profile is loser-share, but Up & Down chains run on stake-share/.test(err(stale)) && /explicit override/.test(err(stale)),
    `${err(inherit)} | ${err(stale)}`);
  const noModel = await UC.applyFeeProfileToEveryChain({ platformFeeRate: 0.03, operatorFeeRate: 0.10 }, OFFICER, "A profile that names no model.");
  const noReason = await UC.applyFeeProfileToEveryChain(SS_PROFILE, OFFICER, " ");
  ok("2.20 · the act refuses a profile that names no model, and one without a reason", !noModel.ok && !noReason.ok, `${err(noModel)} | ${err(noReason)}`);
  // The other direction (FEE-TAX R2 review): moving the default OFF stake-share alone would split the board too.
  const off = await UC.setUpDownConfig({ defaultRateProfile: LS_PROFILE }, OFFICER);
  ok("2.21 · ★ the settings save cannot move the default OFF stake-share alone either — only the one act moves it",
    !off.ok && /to or from the stake-share fee model/.test(err(off)) && (await UC.getUpDownConfig()).defaultRateProfile.feeModel === "stake-share", err(off));
}

// ═══ §3 · SHUT AGAIN, OVER A STORED STAKE-SHARE MODEL ═════════════════════════════════════════════════════════════════
section("§3 · SHUT again over a stored stake-share model — the shape of a hand-edited row before R5");
gate.__setFeeLawLiveForTest(null);
{
  const s = await MC.setGlobalConfig({ minStake: 600 }, OFFICER);
  ok("3.1 · ★ no save goes through on it — even of an unrelated field", !s.ok && err(s).startsWith(REFUSAL), err(s));
  const g = await MC.getGlobalConfig();
  ok("3.2 · ★ the stamp refuses it (`RatesRefused`)", MC.isRatesRefused(thrown(() => MC.snapshotFromConfig(g))));
  const made = await rejection(MS.createMarket(marketInput("Fee gate · shut again")));
  ok("3.3 · ★ …so no POLL can be created on it", MC.isRatesRefused(made), String(made));
  const chain = (await UC.listChains()).find((c) => c.id === "udc_gate_running");
  const prof = chain ? await UC.rateProfileForStamping(chain) : { ok: false as const, error: "no chain" };
  const roundStamp = prof.ok ? thrown(() => MC.snapshotFromConfig({ ...g, ...prof.profile } as never)) : null;
  ok("3.4 · ★ …and no ROUND: its chain's profile is stake-share, and the stamp refuses it the same way", prof.ok && MC.isRatesRefused(roundStamp), String(roundStamp));
}

console.log(`\nfee-gate: ${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
