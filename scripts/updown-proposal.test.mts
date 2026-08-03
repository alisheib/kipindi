/**
 * UP & DOWN AI PROPOSALS — the officer gate, and what it must never let through.
 *
 *   npx tsx scripts/updown-proposal.test.mts     (npm run test:updown-proposal)
 *
 * In-memory stores, mock AI provider, no DB and no network.
 *
 * ⛔ WHAT THIS SUITE EXISTS TO PREVENT. A proposal arms a chain that emits real-money rounds
 * on a timer, so the dangerous failures are not "the framing reads awkwardly" — they are:
 *
 *   1. a proposal ARMING WITHOUT AN OFFICER (the whole point of the queue);
 *   2. an APPROVAL SURVIVING AN EDIT that changes the terms it was granted for;
 *   3. arming on a link that is NOT on the operator's allowlist, or whose stated domain is
 *      not the link's own host — which would make every reading look like a mismatch;
 *   4. arming on a source NO PRICE CAN BE READ FROM, which is the single most likely real
 *      failure — and it is now measured against the PLATFORM'S OWN feed read rather than
 *      against what the AI claimed to have seen (E-47b, below);
 *   5. an arm path that writes chains or assets DIRECTLY, bypassing the source lock and the
 *      other refusals the console depends on;
 *   6. generating while the operator has AI switched off, or spending past the budget.
 *
 * §7 is the one that matters most for money: arming through the REAL service functions means
 * the source lock applies, so a proposal cannot move a source out from under a live round.
 *
 * ── ⭐ E-47b RESHAPED §1, AND THE RESHAPE IS THE POINT (Ali's decision, 2026-08-03) ────────
 * This suite used to assert that a proposal lands FILTERED because no price was read. That was
 * true of the real provider too — 12 production generations, 0 that ever read a price, $2.68
 * spent — because the approved domain is a keyed JSON API the AI cannot read and the HTML
 * alternative renders in JavaScript (E-16/E-25). The AI no longer reads prices: the platform
 * does, through the money path's own `readPrice()`. So §1 now asserts the opposite — a working
 * asset reaches PENDING_REVIEW directly — and §1b asserts the property that makes the change
 * worth having: an unreadable source is refused BEFORE any credit is spent, for $0.00.
 */
process.env.SESSION_SECRET ??= "test-only-session-secret-32chars-min-aaaa";
// No key ⇒ getAIProvider() returns the MOCK provider, which supplies framing only — the price
// on every proposal below comes from the mock PRICE FEED (config default `feedProvider: "mock"`,
// which refuses outright in production and is deterministic here).
delete process.env.ANTHROPIC_API_KEY;

import { __resetUpDownMemoryStores, roundStore } from "../src/lib/server/updown-dal.ts";
import {
  createAsset, setAssetEnabled, createChain, setChainState, listChains, getAsset,
  __resetUpDownConfig, setUpDownConfig,
} from "../src/lib/server/updown-config.ts";
import {
  generateProposal, validateProposal, editProposal, approveProposal, rejectProposal,
  armProposal, deleteProposal, listProposals, getProposal, countProposalsByState,
  __resetProposalsForTest, PROPOSAL_REJECT_REASONS,
  type StoredProposal,
} from "../src/lib/server/updown-proposal.ts";
import { openRound } from "../src/lib/server/updown-service.ts";
import { marketStore } from "../src/lib/server/market-dal.ts";
import { buyPosition } from "../src/lib/server/market-service.ts";
import { addSource, seedDefaultSources } from "../src/lib/server/source-registry.ts";
import { findSymbol, QUOTE_ENDPOINT, QUOTE_DOMAIN } from "../src/lib/server/updown-symbols.ts";
import { setPollGenEnabled } from "../src/lib/server/ai-controls.ts";
import { db } from "../src/lib/server/store.ts";

let pass = 0, fail = 0;
const ok = (l: string, c: boolean, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"} ${l}${x ? ` — ${x}` : ""}`); };

const OFFICER = "usr_officer";
const OTHER = "usr_other_officer";

__resetUpDownMemoryStores();
__resetUpDownConfig();
__resetProposalsForTest();
await seedDefaultSources();
await addSource({ domain: "kitco.com", label: "Kitco", category: "macro", rationale: "spot metals", addedBy: "system" });
await addSource({ domain: "goldprice.org", label: "GoldPrice", category: "macro", rationale: "spot gold", addedBy: "system" });
// E-47b — the fixtures are crypto now (see FIXTURE_SYMBOLS), and the platform reads their
// price from the real quote endpoint, so that host has to be trusted IN THAT CATEGORY. This is
// the production shape: every live asset is `api.twelvedata.com/quote`. `coingecko.com` is
// already a seeded crypto source and is what §4/§7 move TO, so a link change stays trusted.
await addSource({ domain: QUOTE_DOMAIN, label: "Twelve Data", category: "crypto", rationale: "metered quote API — the live price feed", addedBy: "system" });

let seq = 0;
async function fundedUser(id: string, balance: number): Promise<string> {
  const now = new Date().toISOString();
  await db.user.create({
    id, phoneE164: `+25598${String(++seq).padStart(7, "0")}`, passwordHash: null, passwordSalt: null,
    failedLoginCount: 0, lockedUntil: null, role: "PLAYER", status: "ACTIVE", locale: "EN",
    displayName: null, dob: null, region: null, acceptedTermsVersion: null, acceptedTermsAt: null,
    marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null,
    createdAt: now, updatedAt: now, lastLoginAt: null, closedAt: null,
  } as never);
  await db.wallet.create({
    id: `wal_${id}`, userId: id, balance, pending: 0, hold: 0,
    currency: "TZS", status: "ACTIVE", createdAt: now, updatedAt: now,
  } as never);
  return id;
}

/**
 * The symbols the fixtures use, cycled so each test still gets its OWN asset row.
 *
 * ⚠️ CRYPTO, AND THAT IS NOT A PREFERENCE. Two separate traps make it the only safe choice:
 *
 *  1 · E-46's `validateSymbolCategory` is a SERVER-SIDE gate on every asset write, so an
 *      invented symbol is refused outright. This suite used to build `${key}/USD` out of
 *      three-letter labels — `PLT/USD`, `CPR/USD`, `OIL/USD`, none of them catalogued — and
 *      had therefore been RED on every tree since session 14, dying at §3. (The same defect
 *      class session 15 found in `test:updown-engine`.) Everything now comes from
 *      `findSymbol()`, so the fixture cannot disagree with the platform again.
 *  2 · E-47b made `generateProposal` read a real price, which runs E-36's TRADING CALENDAR
 *      gate. A `macro` asset is SHUT from Fri 21:00 to Sun 22:00 UTC, so macro fixtures would
 *      make this suite pass on a Tuesday and fail on a Saturday. Crypto is 24/7.
 *
 * The KEY stays per-test and unique (it is ours, and only the key must be unique); the SYMBOL
 * repeats once the six run out, which is fine — two assets may track one instrument.
 */
const FIXTURE_SYMBOLS = ["BTC/USD", "ETH/USD", "SOL/USD", "XRP/USD", "BNB/USD", "LTC/USD"] as const;
let symbolIdx = 0;

/**
 * A DIFFERENT page that is still trusted in the fixtures' category — what §4 and §7 move to.
 * ⚠️ It has to be trusted, or those sections would fail on `source_not_trusted` and stop
 * testing the thing they are named after. `coingecko.com` is a seeded crypto source.
 * ⛔ It is also, deliberately, a page the Twelve Data reader could NOT quote in production —
 * which is exactly why moving a source must clear the reading (E-46's `ETH`-on-coingecko).
 */
const COINGECKO_PAGE = "https://www.coingecko.com/en/coins/bitcoin";

async function makeAsset(key: string): Promise<string> {
  const spec = findSymbol(FIXTURE_SYMBOLS[symbolIdx++ % FIXTURE_SYMBOLS.length]);
  if (!spec) throw new Error("fixture symbol is not in the catalogue");
  const a = await createAsset({
    key, symbol: spec.symbol, nameEn: spec.nameEn, nameSw: spec.nameSw, iconKey: spec.iconKey,
    // The endpoint every real asset uses. `category`/`decimals` come from the catalogue too,
    // because those three are the fields that must agree (E-46).
    priceSourceUrl: QUOTE_ENDPOINT, category: spec.category,
    decimals: spec.decimals, minMoveTicks: spec.minMoveTicks,
  }, OFFICER);
  if (!a.ok) throw new Error(`createAsset ${key}: ${a.error}`);
  const en = await setAssetEnabled(a.data.id, true, OFFICER);
  if (!en.ok) throw new Error(`enable ${key}: ${en.error}`);
  return a.data.id;
}

/**
 * A proposal in the reviewable state.
 *
 * ⭐ E-47b: with no `urlOverride` this is just `generateProposal` — the PLATFORM reads the
 * price from the asset's feed, so a working asset reaches PENDING_REVIEW directly. Under the
 * old model the mock AI reported no evidence and the suite had to inject some.
 *
 * `urlOverride` is the officer-moves-the-link case §7 needs. Editing the link deliberately
 * clears the reading (§4 — it belonged to the old link), and nothing can re-take one for a
 * link that is not the asset's own, so the evidence is written directly here. ⚠️ That is not
 * merely a test shortcut: it is **E-50**, a real dead end on the live console — an officer can
 * edit the source, which permanently blocks arming, with no way back but regenerating.
 */
async function readableProposal(assetId: string, urlOverride?: string, duration: 5 | 15 | 30 = 15): Promise<StoredProposal> {
  const g = await generateProposal({ assetId, durationMinutes: duration, actorId: OFFICER });
  if (!g.ok) throw new Error(`generate: ${g.error}`);
  if (!urlOverride) return g.data;

  const e = await editProposal(g.data.id, { sourceUrl: urlOverride }, OFFICER);
  if (!e.ok) throw new Error(`edit: ${e.error}`);
  const p = await getProposal(g.data.id);
  if (!p) throw new Error("proposal vanished");
  p.observedPrice = 2650.4;
  p.observedQuotedAt = new Date().toISOString();
  const re = await editProposal(p.id, {}, OFFICER);   // re-validate through the real path
  if (!re.ok) throw new Error(`revalidate: ${re.error}`);
  return re.data;
}

// ── 1 · E-47b · THE PLATFORM READS THE PRICE, AND AN UNREADABLE FEED IS FREE ──
console.log("\n── 1 · the price comes from the feed, not from the AI ──");
{
  // ⭐ THIS SECTION IS THE INVERSE OF WHAT IT USED TO ASSERT, and the inversion IS the fix.
  // It used to prove that the mock AI honestly reported no price, so every proposal landed
  // FILTERED as `source_unreadable` — which was true of the REAL provider too: 12 production
  // generations, 0 that ever read a price, $2.68 spent. A queue where nothing can ever be
  // approved is not a gate, it is a dead end. Ali chose option (b) on 2026-08-03: the AI
  // proposes framing and margin, the PLATFORM reads the price through the money path.
  const assetId = await makeAsset("BTCP");
  const g = await generateProposal({ assetId, durationMinutes: 15, actorId: OFFICER });
  ok("generation succeeds", g.ok, g.ok ? "" : g.error);
  if (g.ok) {
    ok("⭐ it reaches PENDING_REVIEW straight from generation", g.data.state === "PENDING_REVIEW",
      `got ${g.data.state} — reasons: ${g.data.filterReasons.join(",")}`);
    ok("…with a price the PLATFORM read", g.data.observedPrice !== null && g.data.observedPrice > 0,
      `observedPrice ${g.data.observedPrice}`);
    ok("…and the feed's own quote time", !!g.data.observedQuotedAt);
    ok("the source is the ASSET'S approved source, not one the AI chose",
      g.data.sourceUrl === QUOTE_ENDPOINT, `got ${g.data.sourceUrl}`);
    ok("…and its domain matches", g.data.sourceDomain === QUOTE_DOMAIN, `got ${g.data.sourceDomain}`);
    ok("the AI still supplies the framing", g.data.framingEn.length > 0 && g.data.framingSw.length > 0);
    ok("…and a margin, defaulted to the E-32 schedule", g.data.marginBps > 0);
    ok("the officer sees the reading as a good indicator",
      g.data.qualityIndicators.some((i) => i.status === "good" && /live quote/i.test(i.label)),
      g.data.qualityIndicators.map((i) => `${i.status}:${i.label}`).join(" | "));
  }
}

// ── 1b · ⛔ An unreadable source costs NOTHING, because the AI is never called ──
console.log("\n── 1b · a broken source is refused before a credit is spent ──");
{
  __resetProposalsForTest();
  const assetId = await makeAsset("BROKE");
  // Select a real provider with no key. `feedFromId` deliberately does NOT downgrade to the
  // mock — inventing a price on a money path is the worst thing it could do — so it refuses.
  await setUpDownConfig({ feedProvider: "twelvedata" }, OFFICER);
  const g = await generateProposal({ assetId, durationMinutes: 15, actorId: OFFICER });
  ok("⛔ generation is REFUSED, not filtered-after-the-fact", !g.ok, g.ok ? "it succeeded" : "");
  if (!g.ok) {
    ok("…and it says no credit was spent", /no ai credit was spent/i.test(g.error), g.error);
    ok("…and names the source as the thing to fix", /source/i.test(g.error), g.error);
  }
  // The row still exists so the attempt is visible in the queue — refused, not vanished.
  const rows = await listProposals({ assetId });
  ok("the attempt is recorded", rows.length === 1, `${rows.length} rows`);
  if (rows[0]) {
    ok("…as FILTERED", rows[0].state === "FILTERED", rows[0].state);
    ok("…for source_unreadable", rows[0].filterReasons.includes("source_unreadable"),
      rows[0].filterReasons.join(","));
    ok("⭐⭐ …and it cost ZERO — the old path spent ~$0.16 to learn this",
      rows[0].costUsd === 0 && rows[0].tokensUsed === 0,
      `costUsd ${rows[0].costUsd}, tokens ${rows[0].tokensUsed}`);
    ok("…and the reasoning explains it in the feed's own words",
      /could not|refused|not configured/i.test(rows[0].reasoning), rows[0].reasoning.slice(0, 120));
  }
  await setUpDownConfig({ feedProvider: "mock" }, OFFICER);   // restore for the rest of the suite
}

// ── 2 · The officer gate: only APPROVED may arm ──────────────────────────────
console.log("\n── 2 · ⛔ nothing arms without an officer ──");
{
  __resetProposalsForTest();
  const assetId = await makeAsset("XAG");
  const p = await readableProposal(assetId);
  ok("a readable proposal reaches PENDING_REVIEW", p.state === "PENDING_REVIEW", `got ${p.state}`);

  const armedTooEarly = await armProposal(p.id, { officerId: OFFICER });
  ok("⛔ arming a PENDING_REVIEW proposal is REFUSED", !armedTooEarly.ok);
  ok("…and the refusal says an officer must review it first",
    !armedTooEarly.ok && /officer must review/i.test(armedTooEarly.error), !armedTooEarly.ok ? armedTooEarly.error : "");
  ok("…and no chain was created", (await listChains({ assetId })).length === 0);

  const ap = await approveProposal(p.id, { officerId: OFFICER, note: "source checked by hand" });
  ok("an officer can approve it", ap.ok, ap.ok ? "" : ap.error);
  ok("the approval records WHO", ap.ok && ap.data.reviewedBy === OFFICER);
  ok("…and WHEN", ap.ok && !!ap.data.reviewedAt);
  ok("…and the note", ap.ok && ap.data.reviewNote === "source checked by hand");

  const armed = await armProposal(p.id, { officerId: OTHER });
  ok("an APPROVED proposal arms", armed.ok, armed.ok ? "" : armed.error);
  if (armed.ok) {
    ok("state becomes ARMED", armed.data.proposal.state === "ARMED");
    ok("the chain it armed is recorded", armed.data.proposal.armedChainId === armed.data.chainId);
    ok("…with who armed it, separately from who approved it",
      armed.data.proposal.armedBy === OTHER && armed.data.proposal.reviewedBy === OFFICER,
      "two-party visibility: the arm is not silently attributed to the approver");
    const chains = await listChains({ assetId });
    ok("the chain exists and is RUNNING", chains.length === 1 && chains[0].state === "RUNNING",
      chains.map((c) => `${c.durationMinutes}m:${c.state}`).join(","));
    ok("…at the approved duration", chains[0].durationMinutes === 15);
    ok("…carrying the approved margin", chains[0].marginBps === p.marginBps, `${chains[0].marginBps} vs ${p.marginBps}`);
  }

  const twice = await armProposal(p.id, { officerId: OFFICER });
  ok("⛔ arming twice is refused (idempotent, not duplicated)", !twice.ok);
  ok("…and says so plainly", !twice.ok && /already armed/i.test(twice.error));
}

// ── 3 · An approval does not survive an edit that changes the terms ──────────
console.log("\n── 3 · an approval is for SPECIFIC terms ──");
{
  __resetProposalsForTest();
  const assetId = await makeAsset("PLT");
  const p = await readableProposal(assetId);
  await approveProposal(p.id, { officerId: OFFICER });

  // Edit the link to something NOT on the allowlist. The approval must not carry over.
  const bad = await editProposal(p.id, { sourceUrl: "https://random-blog.example/gold" }, OFFICER);
  ok("the edit is accepted (an officer may edit)", bad.ok, bad.ok ? "" : bad.error);
  const after = await getProposal(p.id);
  ok("⛔ the proposal LOSES its APPROVED state", after?.state !== "APPROVED", `got ${after?.state}`);
  ok("…and the approver is cleared, not left implying they approved this",
    after?.reviewedBy === null, `reviewedBy=${after?.reviewedBy}`);
  ok("…because the link is not on the allowlist", (after?.filterReasons ?? []).includes("source_not_trusted"),
    (after?.filterReasons ?? []).join(","));

  const armBad = await armProposal(p.id, { officerId: OFFICER });
  ok("⛔ it cannot arm", !armBad.ok);
  ok("…and no chain was created", (await listChains({ assetId })).length === 0);
}

// ── 4 · Editing the link invalidates the evidence for the OLD link ──────────
console.log("\n── 4 · evidence belongs to the link it was read from ──");
{
  __resetProposalsForTest();
  const assetId = await makeAsset("CPR");
  const p = await readableProposal(assetId);
  ok("evidence is present before the edit", p.observedPrice !== null && p.observedQuotedAt !== null);

  // Move to a DIFFERENT trusted page. The AI read the old one; the evidence does not transfer.
  const moved = await editProposal(p.id, { sourceUrl: COINGECKO_PAGE }, OFFICER);
  ok("the edit is accepted", moved.ok, moved.ok ? "" : moved.error);
  ok("⛔ the observed price is CLEARED", moved.ok && moved.data.observedPrice === null,
    "carrying it over would show a reassuring number belonging to a different URL");
  ok("…and the observed timestamp too", moved.ok && moved.data.observedQuotedAt === null);
  ok("…so it drops back to FILTERED as unreadable", moved.ok && moved.data.state === "FILTERED", moved.ok ? moved.data.state : "");
  ok("…for exactly that reason", moved.ok && moved.data.filterReasons.includes("source_unreadable"));

  const noArm = await armProposal(p.id, { officerId: OFFICER });
  ok("⛔ and it cannot arm on an unread page", !noArm.ok);
}

// ── 5 · Approve cannot be forged past a failing proposal ────────────────────
console.log("\n── 5 · approve re-validates (a crafted POST does not win) ──");
{
  __resetProposalsForTest();
  const assetId = await makeAsset("OIL");
  const g = await generateProposal({ assetId, durationMinutes: 5, actorId: OFFICER });
  ok("generation succeeds", g.ok, g.ok ? "" : g.error);
  // ⚠️ E-47b: this section used to get its failing proposal for free, because the mock AI read
  // no price and EVERY proposal landed FILTERED. The platform reads the price now, so a healthy
  // asset is PENDING_REVIEW — a failing one has to be MADE. Moving the link to a page the
  // reading does not belong to is the officer-reachable way to do that (§4's property), and it
  // keeps the failure a REAL one rather than a hand-set state.
  const broken = await editProposal(g.ok ? g.data.id : "x", { sourceUrl: COINGECKO_PAGE }, OFFICER);
  ok("the proposal is FILTERED once its link no longer matches its reading",
    broken.ok && broken.data.state === "FILTERED", broken.ok ? broken.data.state : broken.error);
  // The UI does not offer Approve here — but the action is reachable directly.
  const forced = await approveProposal(g.ok ? g.data.id : "x", { officerId: OFFICER });
  ok("⛔ approving a FILTERED proposal is REFUSED by the SERVICE", !forced.ok);
  ok("…naming what still fails", !forced.ok && /source_unreadable/.test(forced.error), !forced.ok ? forced.error : "");
}

// ── 6 · Reject reasons are a closed set, validated server-side ──────────────
console.log("\n── 6 · a rejection must be countable ──");
{
  __resetProposalsForTest();
  const assetId = await makeAsset("PAL");
  const p = await readableProposal(assetId);

  const empty = await rejectProposal(p.id, { officerId: OFFICER, reasons: [] });
  ok("⛔ rejecting with no reason is refused", !empty.ok);

  const junk = await rejectProposal(p.id, {
    officerId: OFFICER,
    reasons: ["i just don't like it" as never, "officer_judgement"],
  });
  ok("a client-supplied reason string is DROPPED, not stored", junk.ok && junk.data.rejectReasons.length === 1);
  ok("…keeping only the allowlisted one", junk.ok && junk.data.rejectReasons[0] === "officer_judgement");
  ok("every reason in the exported set is accepted", PROPOSAL_REJECT_REASONS.length === 9);

  const armRejected = await armProposal(p.id, { officerId: OFFICER });
  ok("⛔ a REJECTED proposal cannot arm", !armRejected.ok);
  const editRejected = await editProposal(p.id, { marginBps: 60 }, OFFICER);
  ok("…and cannot be edited back to life (regenerate instead)", !editRejected.ok);
}

// ── 7 · ⛔ THE MONEY PROPERTY: arming goes through the SOURCE LOCK ──────────
console.log("\n── 7 · a proposal cannot move a source out from under a live round ──");
{
  __resetProposalsForTest();
  const assetId = await makeAsset("GLD");
  const chain = await createChain({ assetId, durationMinutes: 15 }, OFFICER);
  if (!chain.ok) throw new Error(chain.error);
  const run = await setChainState(chain.data.id, "RUNNING", OFFICER);
  if (!run.ok) throw new Error(run.error);

  // Open a real round and stake real money on it. `openRound(chain, openBoundaryIso, obsId,
  // openPrice)` — the boundary is the round's OPEN, so it closes duration-minutes later and
  // is genuinely open for betting now, which is what makes the stake below succeed.
  const opened = await openRound(run.data, new Date().toISOString(), null, 2600);
  ok("a round opened", opened.ok, opened.ok ? "" : opened.error);
  const roundId = opened.ok ? opened.data.id : "";
  const marketId = opened.ok ? opened.data.marketId : "";
  const punter = await fundedUser("usr_punter_prop", 50_000);
  const bet = await buyPosition(punter, { marketId, side: "YES", stake: 5_000, idempotencyKey: "prop-bet-1" });
  ok("a player staked on it", bet.ok, bet.ok ? "" : String((bet as { error?: string }).error ?? ""));
  const m = await marketStore.get(marketId);
  const staked = Number(m?.yesPool ?? 0) + Number(m?.noPool ?? 0);
  ok("the round holds real money", staked >= 5_000, `pool ${staked}`);

  // Now propose the SAME asset on a DIFFERENT trusted page and try to arm it.
  const p = await readableProposal(assetId, COINGECKO_PAGE, 30);
  ok("the proposal is reviewable", p.state === "PENDING_REVIEW", p.state);
  ok("…and it does propose a different link", p.sourceUrl !== QUOTE_ENDPOINT);
  const ap = await approveProposal(p.id, { officerId: OFFICER });
  ok("an officer approves it", ap.ok, ap.ok ? "" : ap.error);

  const armed = await armProposal(p.id, { officerId: OFFICER });
  ok("⛔⛔ ARMING IS REFUSED — the source lock holds through the arm path", !armed.ok,
    armed.ok ? "A PROPOSAL JUST MOVED THE SOURCE OF A ROUND HOLDING MONEY" : "");
  if (!armed.ok) {
    ok("…and the refusal names the unresolved round(s)", /unresolved|in-flight|1 round/i.test(armed.error), armed.error);
    ok("…and the way out (pause, let them settle, then edit)", /pause|settle/i.test(armed.error), armed.error);
  }
  const assetAfter = await getAsset(assetId);
  ok("⛔ the asset's link did NOT move", assetAfter?.priceSourceUrl === QUOTE_ENDPOINT,
    `now ${assetAfter?.priceSourceUrl}`);
  const rd = await roundStore.get(roundId);
  ok("⛔ and the live round's captured link is untouched",
    rd?.capturedSourceUrl === QUOTE_ENDPOINT, `captured ${rd?.capturedSourceUrl}`);
  ok("the proposal stays APPROVED (refused, not consumed)", (await getProposal(p.id))?.state === "APPROVED");
}

// ── 8 · The pause switch and the asset guards ───────────────────────────────
console.log("\n── 8 · one AI switch gates both generators ──");
{
  __resetProposalsForTest();
  const assetId = await makeAsset("TIN");
  await setPollGenEnabled(false, OFFICER);
  const off = await generateProposal({ assetId, durationMinutes: 15, actorId: OFFICER });
  ok("⛔ generation is refused while AI is paused", !off.ok);
  ok("…naming the AI toolkit as the place to turn it back on",
    !off.ok && /AI toolkit/i.test(off.error), !off.ok ? off.error : "");
  ok("…and NOTHING was persisted (no cost, no row)", (await listProposals()).length === 0,
    "a refused feature must not consult the meter or leave a record");
  await setPollGenEnabled(true, OFFICER);

  const back = await generateProposal({ assetId, durationMinutes: 15, actorId: OFFICER });
  ok("switching it back on restores generation", back.ok, back.ok ? "" : back.error);

  // A disabled asset cannot be proposed for: it cannot emit rounds.
  const dis = await makeAsset("ZNC");
  await setAssetEnabled(dis, false, OFFICER);
  const disabled = await generateProposal({ assetId: dis, durationMinutes: 15, actorId: OFFICER });
  ok("⛔ a disabled asset is refused before spending", !disabled.ok);
  ok("…and says to enable it first", !disabled.ok && /disabled/i.test(disabled.error));

  const badDur = await generateProposal({ assetId, durationMinutes: 7 as never, actorId: OFFICER });
  ok("⛔ an off-grid duration is refused", !badDur.ok);
}

// ── 9 · Validation reports EVERY failure, not just the first ────────────────
console.log("\n── 9 · an officer sees all the problems at once ──");
{
  __resetProposalsForTest();
  const assetId = await makeAsset("NCK");
  const g = await generateProposal({ assetId, durationMinutes: 15, actorId: OFFICER });
  if (!g.ok) throw new Error(g.error);
  const p = (await getProposal(g.data.id))!;
  // Three problems at once: off-allowlist link, absurd margin, no framing.
  p.sourceUrl = "https://not-approved.example/x";
  p.sourceDomain = "not-approved.example";
  p.marginBps = 99_999;
  p.framingEn = "";
  const { reasons } = await validateProposal(p);
  ok("all three are reported together", reasons.length >= 3, `got ${reasons.length}: ${reasons.join(",")}`);
  ok("…the untrusted source", reasons.includes("source_not_trusted"));
  ok("…the margin", reasons.includes("margin_out_of_range"));
  ok("…the missing framing", reasons.includes("framing_unclear"));

  // A link whose stated domain is NOT its own host — this would make every reading look
  // like a source mismatch and void real rounds.
  const q = (await getProposal(g.data.id))!;
  q.sourceUrl = QUOTE_ENDPOINT;
  q.sourceDomain = "coingecko.com";   // trusted in crypto, but NOT this link's host
  q.observedPrice = 2600;
  q.observedQuotedAt = new Date().toISOString();
  const mism = await validateProposal(q);
  ok("⛔ a link/domain mismatch is caught", mism.reasons.includes("source_not_trusted"),
    mism.reasons.join(","));
}

// ── 10 · A stale-but-readable page WARNS, it does not reject ────────────────
console.log("\n── 10 · staleness is a warning at proposal time, a refusal at a boundary ──");
{
  __resetProposalsForTest();
  await setUpDownConfig({ maxStalenessSeconds: 90 }, OFFICER);
  const assetId = await makeAsset("LED");
  const g = await generateProposal({ assetId, durationMinutes: 15, actorId: OFFICER });
  if (!g.ok) throw new Error(g.error);
  const p = (await getProposal(g.data.id))!;
  p.sourceUrl = QUOTE_ENDPOINT;
  p.sourceDomain = QUOTE_DOMAIN;
  p.framingEn = "Will lead rise?"; p.framingSw = "Je risasi itapanda?";
  p.observedPrice = 2000;
  p.observedQuotedAt = new Date(Date.now() - 6 * 3_600_000).toISOString();  // 6 hours stale
  const v = await validateProposal(p);
  ok("a 6-hour-old quote is NOT a rejection", !v.reasons.includes("source_unreadable"),
    "a proposal is reviewed minutes after generation; its evidence is legitimately older than a round window");
  ok("⛔ but the officer is WARNED", v.indicators.some((i) => i.status === "warn" && /old when read/i.test(i.label)),
    v.indicators.map((i) => `${i.status}:${i.label}`).join(" | "));
  ok("…and the warning states the round window for comparison",
    v.indicators.some((i) => /90s/.test(i.label)));
}

// ── 11 · Housekeeping: an armed proposal is a permanent record ──────────────
console.log("\n── 11 · the record of why a live chain exists cannot be deleted ──");
{
  __resetProposalsForTest();
  const assetId = await makeAsset("URN");
  const p = await readableProposal(assetId, undefined, 30);
  await approveProposal(p.id, { officerId: OFFICER });
  const armed = await armProposal(p.id, { officerId: OFFICER });
  ok("it armed", armed.ok, armed.ok ? "" : armed.error);
  const del = await deleteProposal(p.id, OFFICER);
  ok("⛔ deleting an ARMED proposal is refused", !del.ok);
  ok("…and points at stopping the chain instead", !del.ok && /stop the chain/i.test(del.error));

  const g2 = await generateProposal({ assetId, durationMinutes: 5, actorId: OFFICER });
  if (g2.ok) {
    const d2 = await deleteProposal(g2.data.id, OFFICER);
    ok("an unarmed proposal CAN be deleted", d2.ok, d2.ok ? "" : d2.error);
    ok("…and is gone", (await getProposal(g2.data.id)) === null);
  }

  const counts = await countProposalsByState();
  ok("the state counter reports every state", Object.keys(counts).length === 7, Object.keys(counts).join(","));
  ok("…and counts the armed one", counts.ARMED === 1, JSON.stringify(counts));
}

console.log(`\n  UPDOWN PROPOSALS: ${pass} passed, ${fail} failed`);
if (fail === 0) {
  console.log("  A proposal cannot arm without an officer; an approval does not survive an edit;");
  console.log("  evidence does not follow a changed link; and the source lock holds through the arm path.");
}
process.exit(fail === 0 ? 0 : 1);
