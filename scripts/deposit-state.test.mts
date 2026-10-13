/** S9 pure preparation only. No server, DB, provider, storage mutation or application wiring is exercised. */
import { readFileSync } from "node:fs";
import ts from "typescript";
import * as D from "../src/lib/journey/deposit-state.ts";
import * as PB from "../src/lib/journey/pending-bet.ts";
import * as SS from "../src/lib/journey/sheet-storage.ts";
import * as SN from "../src/lib/safe-next.ts";
import * as PH from "../src/lib/phone-normalize.ts";
import * as PM from "../src/lib/payment-providers.ts";
import * as RC from "../src/lib/wallet/receipts.ts";
import { MUTATIONS } from "./anchors/deposit-state.anchors.mjs";
import { injectDefect, resolveAnchor } from "./red-anchor.mjs";

const NOW = Date.UTC(2026, 9, 13, 12);
const BET = "mkt_s9.YES.5000";
const SAVED: D.SavedDepositBet = { v: 1, bet: BET, returnPath: "/live" };
const AT = new Date(NOW - 30_000).toISOString();
const BASE: D.DepositRow = {
  id: "txn_s9", userId: "usr_s9", type: "DEPOSIT", amount: 3_000, currency: "TZS", provider: "MPESA",
  msisdn: "+255712345678", status: "PROCESSING", createdAt: AT, completedAt: null, providerRef: "dep_s9",
  pendingBet: SAVED,
};
const age = (ms: number) => new Date(NOW - ms).toISOString();
const j = (v: unknown) => JSON.stringify(v);
const marker = PB.writeMarker(PB.parseBetParam(BET)!, NOW - 60_000);
const tab: D.DepositBetTrust = { kind: "tab-marker", hydrated: true, markerRaw: marker };

function run(impl: typeof D, verbose = false): { count: number; failed: string[] } {
  const failed: string[] = [];
  let count = 0;
  const ok = (name: string, cond: boolean) => {
    count++;
    if (!cond) failed.push(name);
    if (verbose) console.log(`  ${cond ? "PASS" : "FAIL"} ${name}`);
  };
  const trust = (source: D.DepositBetTrust, claim: unknown = BET, path: unknown = "/live", now = NOW) =>
    impl.trustedDepositBet("usr_s9", claim, path, source, now);

  ok("intent.canonical", j(impl.parseSavedDepositBet({ returnPath: "/live", bet: BET, v: 1 })) === j(SAVED));
  for (const raw of [null, undefined, [], "", { v: 2, bet: BET, returnPath: "/live" }, { ...SAVED, bet: "mkt_s9.YES" },
    { ...SAVED, bet: "mkt_s9.YES.05000" }, { ...SAVED, bet: "mkt_s9.UP.5000" }]) {
    ok(`intent.malformed.${j(raw)}`, impl.parseSavedDepositBet(raw) === null);
  }
  ok("intent.extra", impl.parseSavedDepositBet({ ...SAVED, k: "unfinished-bet-key" }) === null);
  for (const path of ["/wallet/deposit", "/wallet/deposit/waiting?txn=x", "/auth/login", "/admin", "/markets/mkt_other",
    "//evil.example", "https://evil.example", "/\t/evil.example", "/\\evil.example", "/live?status=PAID"]) {
    const value = impl.parseSavedDepositBet({ ...SAVED, returnPath: path });
    ok(`intent.payment-loop.${path}`, value === null);
  }
  ok("intent.query-dropped", impl.depositReturnPath("/live?status=PAID#x", PB.parseBetParam(BET)!) === "/live");
  ok("intent.oversize-path", impl.depositReturnPath(`/live?x=${"x".repeat(512)}`, PB.parseBetParam(BET)!) === null);
  const round = { v: 1, bet: "udr_s9.DOWN.2500", returnPath: "/updown/udr_s9" };
  ok("intent.round-kept", j(impl.parseSavedDepositBet(round)) === j(round));
  ok("intent.round-wrong-page", impl.parseSavedDepositBet({ ...round, returnPath: "/" }) === null);

  ok("trust.ssr", trust({ kind: "none" }) === null);
  ok("trust.hydration", trust({ ...tab, hydrated: false } as D.DepositBetTrust) === null);
  ok("trust.tab-exact", j(trust(tab)) === j(SAVED));
  ok("trust.missing", trust({ ...tab, markerRaw: null } as D.DepositBetTrust) === null);
  for (const claim of ["mkt_s9.YES.6000", "mkt_s9.NO.5000", "mkt_other.YES.5000"]) {
    ok(`trust.mismatch.${claim}`, trust(tab, claim) === null);
  }
  const ttl = PB.PENDING_BET_TTL_MS;
  ok("trust.ttl-minus-one", trust({ ...tab, markerRaw: PB.writeMarker(PB.parseBetParam(BET)!, NOW - ttl + 1) } as D.DepositBetTrust) !== null);
  ok("trust.ttl-boundary", trust({ ...tab, markerRaw: PB.writeMarker(PB.parseBetParam(BET)!, NOW - ttl) } as D.DepositBetTrust) === null);
  ok("trust.future", trust({ ...tab, markerRaw: PB.writeMarker(PB.parseBetParam(BET)!, NOW + 60_001) } as D.DepositBetTrust) === null);
  ok("trust.invalid-clock", trust(tab, BET, "/live", NaN) === null);
  ok("trust.owned-canonical", j(trust({ kind: "owned-deposit", row: BASE }, "mkt_other.NO.9999", "/watchlist")) === j(SAVED));
  ok("trust.foreign", trust({ kind: "owned-deposit", row: { ...BASE, userId: "usr_foreign" } }) === null);
  ok("trust.wrong-type", trust({ kind: "owned-deposit", row: { ...BASE, type: "WITHDRAWAL" } }) === null);
  ok("trust.house", trust({ kind: "owned-deposit", row: { ...BASE, houseBotId: "hbt_s9" } }) === null);
  ok("trust.legacy", trust({ kind: "owned-deposit", row: { ...BASE, pendingBet: null } }) === null);

  const key1 = "00000000-0000-4000-8000-000000000001", key2 = "00000000-0000-4000-8000-000000000002";
  const raw = SS.pendingStorage(PB.readMarker(marker, NOW), [
    { quote: { marketId: "mkt_old", side: "NO", stake: 1_000 }, key: key1, at: NOW - 300_000 },
    { quote: { marketId: "mkt_other", side: "YES", stake: 2_000 }, key: key2, at: NOW - 500_000 },
  ])!;
  const rewritten = impl.markerForDeposit("usr_s9", BET, "/live", tab, raw, NOW);
  ok("marker.keys", j(SS.pendingIntents(rewritten, NOW)) === j(SS.pendingIntents(raw, NOW)));
  ok("marker.age", PB.readMarker(rewritten, NOW)?.at === PB.readMarker(raw, NOW)?.at);
  ok("marker.selected", PB.readMarker(rewritten, NOW)?.bet === BET);
  ok("marker.input-untouched", raw === SS.pendingStorage(PB.readMarker(marker, NOW), SS.pendingIntents(raw, NOW)));
  ok("marker.ssr-no-write", impl.markerForDeposit("usr_s9", BET, "/live", { kind: "none" }, raw, NOW) === null);
  ok("marker.corrupt", impl.markerForDeposit("usr_s9", BET, "/live", { kind: "owned-deposit", row: BASE }, "{bad", NOW) === null);
  const huge = JSON.stringify({ ...JSON.parse(raw), padding: "x".repeat(PB.PENDING_BET_MAX_BYTES) });
  ok("marker.overcap", impl.markerForDeposit("usr_s9", BET, "/live", { kind: "owned-deposit", row: BASE }, huge, NOW) === null);
  const serverRaw = impl.markerForDeposit("usr_s9", "mkt_evil.NO.9999", "/watchlist", { kind: "owned-deposit", row: BASE }, raw, NOW);
  ok("marker.owned-keeps-keys", j(SS.pendingIntents(serverRaw, NOW)) === j(SS.pendingIntents(raw, NOW)));
  ok("marker.owned-no-url-override", PB.readMarker(serverRaw, NOW)?.bet === BET);
  ok("marker.age-owned", PB.readMarker(serverRaw, NOW)?.at === PB.readMarker(raw, NOW)?.at);
  const otherSelected = SS.pendingStorage(PB.readMarker(PB.writeMarker(PB.parseBetParam("mkt_other.NO.2000")!, NOW), NOW), SS.pendingIntents(raw, NOW))!;
  const restored = impl.markerForDeposit("usr_s9", BET, "/live", tab, otherSelected, NOW);
  ok("marker.restored-age", PB.readMarker(restored, NOW)?.at === PB.readMarker(marker, NOW)?.at);
  ok("marker.restored-keeps-keys", j(SS.pendingIntents(restored, NOW)) === j(SS.pendingIntents(raw, NOW)));

  ok("funding.same", impl.sameDepositFunding(BASE, BASE));
  for (const phone of ["0712345678", "712345678", "255712345678", "+255 712 345 678", "０７１２３４５６７８"]) {
    ok(`funding.normalized-phone.${phone}`, impl.sameDepositFunding({ ...BASE, msisdn: phone }, BASE));
  }
  for (const [name, patch] of Object.entries({ owner: { userId: "usr_other" }, type: { type: "WITHDRAWAL" },
    currency: { currency: "USD" }, amount: { amount: 4_000 }, rail: { provider: "MIXX" }, phone: { msisdn: "0788765432" },
    bet: { pendingBet: { ...SAVED, bet: "mkt_s9.NO.5000" } }, return: { pendingBet: { ...SAVED, returnPath: "/watchlist" } },
    legacy: { pendingBet: null }, malformed: { pendingBet: { ...SAVED, injected: true } },
    house: { houseBotId: "hbt_s9" },
  })) ok(`funding.${name}`, !impl.sameDepositFunding({ ...BASE, ...patch }, BASE));
  for (const amount of [0, -1, 1.1, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    ok(`funding.invalid-amount.${amount}`, impl.canonicalDepositFunding({ ...BASE, amount }) === null);
  }
  for (const msisdn of [null, "", "abc712345678", "+254712345678", "123", "07123456789"]) {
    ok(`funding.invalid-phone.${msisdn}`, impl.canonicalDepositFunding({ ...BASE, msisdn }) === null);
  }
  ok("funding.pending-order-canonical", impl.sameDepositFunding({ ...BASE, pendingBet: { returnPath: "/live", v: 1, bet: BET } }, BASE));
  ok("funding.legacy-both-null", impl.sameDepositFunding({ ...BASE, pendingBet: null }, { ...BASE, pendingBet: undefined }));
  const card = { ...BASE, provider: "CARD", msisdn: null, billing: { city: "Dar es Salaam" } };
  ok("funding.card-billing-not-identity", impl.sameDepositFunding({ ...card, billing: { city: "Dodoma" } }, card));
  ok("funding.card-null-phone", impl.canonicalDepositFunding(card)?.msisdn === null);

  for (const [ms, band] of [[0, "fresh"], [59_999, "fresh"], [60_000, "slow"], [599_999, "slow"],
    [600_000, "long"], [1_799_999, "long"], [1_800_000, "late"], [86_400_000, "late"]] as const) {
    ok(`time.band.${ms}`, impl.depositWaitingBand(age(ms), NOW) === band);
  }
  ok("time.invalid", impl.depositWaitingBand("bad", NOW) === "unknown");
  ok("time.future", impl.depositWaitingBand(age(-1), NOW) === "unknown");
  ok("time.invalid-clock", impl.depositWaitingBand(AT, NaN) === "unknown");

  const unknown = j({ state: "UNKNOWN" });
  ok("scope.missing", j(impl.depositProjection("usr_s9", null, NOW)) === unknown);
  ok("scope.foreign", j(impl.depositProjection("usr_other", BASE, NOW)) === unknown);
  ok("scope.type", j(impl.depositProjection("usr_s9", { ...BASE, type: "WITHDRAWAL" }, NOW)) === unknown);
  ok("scope.currency", j(impl.depositProjection("usr_s9", { ...BASE, currency: "USD" }, NOW)) === unknown);
  ok("scope.house", j(impl.depositProjection("usr_s9", { ...BASE, houseBotId: "hbt_s9" }, NOW)) === unknown);
  ok("scope.house-blank-nonnull", j(impl.depositProjection("usr_s9", { ...BASE, houseBotId: "" }, NOW)) === unknown);
  for (const ms of [0, 20_000, 60_000, 600_000, 1_800_000, 86_400_000]) {
    ok(`status.time-is-not-failure.${ms}`, impl.depositProjection("usr_s9", { ...BASE, createdAt: age(ms) }, NOW).state === "PENDING");
  }
  ok("status.paid", impl.depositProjection("usr_s9", { ...BASE, status: "CONFIRMED" }, NOW).state === "PAID");
  ok("status.failed", impl.depositProjection("usr_s9", { ...BASE, status: "FAILED" }, NOW).state === "FAILED");
  ok("status.held", impl.depositProjection("usr_s9", { ...BASE, status: "AML_REVIEW", amlReason: `${RC.RG_RETURN_MARK}cooling_off` }, NOW).state === "HELD");
  ok("status.review-not-failed", impl.depositProjection("usr_s9", { ...BASE, status: "AML_REVIEW", amlReason: "unknown officer review" }, NOW).state === "REVIEW");
  ok("status.rejected-rg-still-held", impl.depositProjection("usr_s9", { ...BASE, status: "FAILED", amlReason: `${RC.RG_RETURN_MARK}rejected` }, NOW).state === "HELD");
  ok("status.reversed", impl.depositProjection("usr_s9", { ...BASE, status: "REVERSED" }, NOW).state === "RETURNED");
  ok("status.unrecognised", j(impl.depositProjection("usr_s9", { ...BASE, status: "EXPIRED" }, NOW)) === unknown);
  const held = impl.depositProjection("usr_s9", { ...BASE, status: "AML_REVIEW", amlReason: RC.RG_RETURN_MARK }, NOW);
  ok("status.shared-receipt-lexicon", held.state === "HELD" && held.status === RC.presentedStatus({ type: "DEPOSIT", status: "AML_REVIEW" }));
  const projected = impl.depositProjection("usr_s9", { ...BASE, status: "CONFIRMED", pendingBet: { forged: true } }, NOW);
  ok("status.invalid-intent-does-not-hide-money", projected.state === "PAID" && projected.pendingBet === null);
  ok("status.no-raw-sensitive-fields", !["userId", "msisdn", "providerRef", "amlReason", "houseBotId", "balance"].some((key) => Object.hasOwn(projected, key)));
  ok("status.invalid-date", j(impl.depositProjection("usr_s9", { ...BASE, createdAt: "bad" }, NOW)) === unknown);
  ok("status.bad-amount", j(impl.depositProjection("usr_s9", { ...BASE, amount: NaN }, NOW)) === unknown);

  ok("probe.young", !impl.canProbeDeposit("usr_s9", { ...BASE, createdAt: age(19_999) }, NOW));
  ok("probe.boundary", impl.canProbeDeposit("usr_s9", { ...BASE, createdAt: age(20_000) }, NOW));
  ok("probe.card", !impl.canProbeDeposit("usr_s9", { ...BASE, provider: "CARD" }, NOW));
  ok("probe.terminal", !impl.canProbeDeposit("usr_s9", { ...BASE, status: "CONFIRMED" }, NOW));
  ok("probe.foreign", !impl.canProbeDeposit("usr_other", BASE, NOW));
  ok("probe.type", !impl.canProbeDeposit("usr_s9", { ...BASE, type: "WITHDRAWAL" }, NOW));
  ok("probe.reference", !impl.canProbeDeposit("usr_s9", { ...BASE, providerRef: null }, NOW));
  ok("probe.unknown-rail", !impl.canProbeDeposit("usr_s9", { ...BASE, provider: null }, NOW));
  ok("probe.invalid-amount", !impl.canProbeDeposit("usr_s9", { ...BASE, amount: NaN }, NOW));
  ok("probe.house", !impl.canProbeDeposit("usr_s9", { ...BASE, houseBotId: "hbt_s9" }, NOW));
  for (const provider of ["BANK_TRANSFER", "INTERNAL", "TIGO_PESA", "TTCL_PESA"]) {
    ok(`probe.non-mno.${provider}`, !impl.canProbeDeposit("usr_s9", { ...BASE, provider }, NOW));
  }
  for (const patch of [{ msisdn: "bad" }, { pendingBet: { forged: true } }]) {
    ok(`probe.invalid-funding.${j(patch)}`, !impl.canProbeDeposit("usr_s9", { ...BASE, ...patch }, NOW));
  }
  for (const provider of ["MPESA", "AIRTEL_MONEY", "HALO_PESA", "MIXX"]) {
    ok(`probe.registered-mno.${provider}`, impl.canProbeDeposit("usr_s9", { ...BASE, provider }, NOW));
  }
  ok("probe.future", !impl.canProbeDeposit("usr_s9", { ...BASE, createdAt: age(-1) }, NOW));
  ok("probe.invalid-date", !impl.canProbeDeposit("usr_s9", { ...BASE, createdAt: "bad" }, NOW));
  ok("poll.fresh", impl.depositPollDelay("PENDING", age(59_999), NOW) === 3_000);
  ok("poll.minute", impl.depositPollDelay("PENDING", age(60_000), NOW) === 10_000);
  ok("poll.long", impl.depositPollDelay("PENDING", age(600_000), NOW) === 10_000);
  ok("poll.late", impl.depositPollDelay("PENDING", age(1_800_000), NOW) === 10_000);
  ok("poll.unknown", impl.depositPollDelay("UNKNOWN", "bad", NOW) === 10_000);
  for (const state of ["PAID", "FAILED", "HELD", "RETURNED", "REVIEW"] as const) {
    ok(`poll.terminal.${state}`, impl.depositPollDelay(state, AT, NOW) === null);
  }

  const paid = { ...BASE, status: "CONFIRMED", completedAt: new Date(NOW).toISOString() };
  const quote = { marketId: "mkt_s9", side: "YES", stake: 5_000 };
  ok("origin.valid", impl.isDepositReturnBet("usr_s9", paid, quote, NOW));
  ok("origin.confirmed", !impl.isDepositReturnBet("usr_s9", { ...paid, status: "PROCESSING" }, quote, NOW));
  ok("origin.foreign", !impl.isDepositReturnBet("usr_other", paid, quote, NOW));
  ok("origin.house", !impl.isDepositReturnBet("usr_s9", paid, { ...quote, houseBotId: "hbt_s9" }, NOW));
  ok("origin.house-deposit", !impl.isDepositReturnBet("usr_s9", { ...paid, houseBotId: "hbt_s9" }, quote, NOW));
  ok("origin.before", !impl.isDepositReturnBet("usr_s9", paid, quote, NOW - 1));
  ok("origin.boundary", impl.isDepositReturnBet("usr_s9", paid, quote, NOW + 1_800_000));
  ok("origin.late", !impl.isDepositReturnBet("usr_s9", paid, quote, NOW + 1_800_001));
  ok("origin.invalid-completion", !impl.isDepositReturnBet("usr_s9", { ...paid, completedAt: null }, quote, NOW));
  ok("origin.chronology-invalid-created", !impl.isDepositReturnBet("usr_s9", { ...paid, createdAt: "bad" }, quote, NOW));
  ok("origin.chronology-before-creation", !impl.isDepositReturnBet("usr_s9", { ...paid, completedAt: age(30_001) }, quote, NOW));
  ok("origin.chronology-equal", impl.isDepositReturnBet("usr_s9", { ...paid, completedAt: AT }, quote, NOW));
  for (const patch of [{ side: "NO" }, { stake: 4_000 }, { marketId: "mkt_other" }]) {
    ok(`origin.changed.${j(patch)}`, !impl.isDepositReturnBet("usr_s9", paid, { ...quote, ...patch }, NOW));
  }
  ok("origin.round-not-question", !impl.isDepositReturnBet("usr_s9", { ...paid, pendingBet: round }, { marketId: "udr_s9", side: "DOWN", stake: 2_500 }, NOW));
  return { count, failed };
}

const source = readFileSync(new URL("../src/lib/journey/deposit-state.ts", import.meta.url), "utf8");
const normal = run(D, !process.argv.includes("--prove-red"));
if (normal.failed.length) {
  console.error(`deposit-state: ${normal.count - normal.failed.length}/${normal.count}; ${normal.failed.join(", ")}`);
  process.exit(1);
}
const imports: Record<string, unknown> = {
  "../safe-next": SN, "../phone-normalize": PH, "../payment-providers": PM, "../wallet/receipts": RC,
  "./pending-bet": PB, "./sheet-storage": SS,
};
function compiled(text: string): typeof D {
  const code = ts.transpileModule(text, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
  const module = { exports: {} };
  new Function("require", "module", "exports", code)((name: string) => {
    if (!Object.hasOwn(imports, name)) throw new Error(`Unexpected pure-module import: ${name}`);
    return imports[name];
  }, module, module.exports);
  return module.exports as typeof D;
}
const green = run(compiled(source));
if (green.failed.length) throw new Error(`Transpiled green control failed: ${green.failed.join(", ")}`);
for (const mutation of MUTATIONS) {
  const resolved = resolveAnchor(source, mutation.from);
  if (!resolved.ok) throw new Error(`${mutation.name}: ${resolved.reason}`);
}
// A real dependency allowlist and no imperative browser/clock/I/O reads, rather than a claim made in a comment.
const stripped = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
if (/\b(?:fetch|setTimeout|setInterval|Date\.now|sessionStorage|localStorage|document|window|process)\b/.test(stripped)
  || /(?:node:|\/server\/)/.test(stripped)) throw new Error("Pure helper gained an imperative runtime dependency");

if (process.argv.includes("--prove-red")) {
  let caught = 0;
  for (const mutation of MUTATIONS) {
    const result = run(compiled(injectDefect(source, mutation.from, mutation.to)));
    if (!result.failed.some((name) => name.startsWith(mutation.expect))) {
      throw new Error(`SURVIVED ${mutation.name}; expected ${mutation.expect}, actual ${result.failed.join(", ")}`);
    }
    caught++;
    console.log(`  PASS ${mutation.name} — ${mutation.expect}`);
  }
  console.log(`deposit-state red: ${caught}/${MUTATIONS.length}; green control ${green.count}/${green.count}; no disk plants`);
} else console.log(`deposit-state: ${normal.count}/${normal.count}; transpiled green control and ${MUTATIONS.length} unique declared anchors`);
