/**
 * REMOVING A CHAIN CANNOT DESTROY THE SETTLEMENT RECORD — Jay (Gaming Board) item #3.
 *
 * 🔴 THE DEFECT THIS PREVENTS HAS ALREADY HAPPENED HERE. `UpDownRound.chain` is
 * `onDelete: Cascade`, so deleting a chain deletes **every round it ever ran** — the
 * settlement record for real money. `scripts/live/ops/e63-window.cjs` exists because
 * **1,915 "failures" turned out to be rounds deleted along with their board.**
 *
 * ⭐ The Board's own interest argues for the safer form: it audits settlement history, so the
 * control it asked for must not be able to erase that history.
 *
 * ── THE RULE, AND WHY IT IS TWO OPERATIONS ───────────────────────────────────
 * **ARCHIVE** is the answer for a chain that has run: a fourth resting state, out of the
 * operator's working list and off the player board, every round kept. **DELETE** is permitted
 * only for the case that actually motivated the request — the mistyped chain, minutes old,
 * that has never opened a round.
 *
 * ⛔ AND THE SUITE DRIVES THE REAL SERVICE, NOT A DESCRIPTION OF IT. §2 and §3 call
 * `deleteChain` against the real in-memory stores with real rounds present and absent, because
 * a source scan asserting "there is a guard" is the weakest kind of evidence (E-4) — and the
 * acceptance explicitly asks for the refusal AND a positive control proving a zero-round chain
 * really can be deleted.
 *
 * Run: npm run test:chain-removal
 */
process.env.SESSION_SECRET ??= "test-only-session-secret-32chars-min-aaaa";

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { decomment } from "./lib/decomment.mts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
let pass = 0, fail = 0;
const ok = (l: string, c: boolean, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"} ${l}${x ? ` — ${x}` : ""}`); };

const { assetStore, chainStore, roundStore, __resetUpDownMemoryStores } =
  await import("../src/lib/server/updown-dal.ts");
const { archiveChain, unarchiveChain, deleteChain, setChainState } =
  await import("../src/lib/server/updown-config.ts");
const { generateRoundNow } = await import("../src/lib/server/updown-service.ts");

const schema = readFileSync(join(ROOT, "prisma/schema.prisma"), "utf8");
const board = decomment(readFileSync(join(ROOT, "src/lib/server/updown-board.ts"), "utf8"));
const page = decomment(readFileSync(join(ROOT, "src/app/admin/updown/page.tsx"), "utf8"));
const actions = decomment(readFileSync(join(ROOT, "src/app/admin/updown/actions.ts"), "utf8"));

const OFFICER = "usr_test_officer";

/** The store API is `upsert` for assets/chains and `create` for rounds, and each takes a FULL
 *  record — the same shape `grid-paging.test.mts` seeds, so the two suites cannot drift on what
 *  a valid fixture looks like. */
const iso = (n: number) => new Date(Date.UTC(2026, 7, 1, 0, n)).toISOString();

async function seed(rounds: number) {
  __resetUpDownMemoryStores();
  await assetStore.upsert({
    id: "ast_t", key: "TTT", symbol: "T/USD", nameEn: "T", nameSw: "T", nameZh: null, iconKey: "gold",
    priceSourceUrl: "https://api.twelvedata.com/quote", sourceDomain: "api.twelvedata.com",
    category: "crypto", decimals: 2, minMoveTicks: 2, enabled: true, sortOrder: 0,
    createdBy: "test", createdAt: iso(0), updatedAt: iso(0),
  } as never);
  await chainStore.upsert({
    id: "chn_t", assetId: "ast_t", durationMinutes: 5, state: "STOPPED", gridAnchorAt: iso(0),
    nextBoundaryAt: null, currentRoundId: null, minStake: null, maxStake: null,
    rateProfile: null, marginBps: null, createdBy: "test", createdAt: iso(0), updatedAt: iso(0),
  } as never);
  for (let i = 0; i < rounds; i++) {
    await roundStore.create({
      id: `udr_t_${i}`, chainId: "chn_t", marketId: `mkt_t_${i}`, roundNumber: i + 1,
      opensAt: iso(i), closesAt: iso(i + 1), boundaryAt: iso(i + 1),
      openObservationId: null, closeObservationId: null, openPrice: null, closePrice: null,
      marginBps: null, upTarget: null, downTarget: null,
      capturedSourceUrl: null, capturedSourceDomain: null,
      outcome: "UP", voidReason: null, resolvedAt: iso(i + 2), settledAt: iso(i + 3),
      createdAt: iso(i), updatedAt: iso(i),
    } as never);
  }
  return (await chainStore.get("chn_t"))!;
}

// ── 1 · THE CASCADE IS REAL — the premise, asserted rather than believed ────
{
  // ⛔ If this ever stops being a cascade the whole rule changes shape, and a suite that
  // assumed it would keep passing while protecting nothing.
  ok("1: 🔴 UpDownRound still cascades from its chain — the deletion really would take the rounds",
     /chain\s+UpDownChain\s+@relation\(fields: \[chainId\], references: \[id\], onDelete: Cascade\)/.test(schema));
  ok("1: ARCHIVED exists as a chain state", /enum UpDownChainState[\s\S]{0,200}?ARCHIVED/.test(schema));
}

// ── 2 · 🔴 THE REFUSAL — driven, with the reason and the audit ──────────────
{
  const chain = await seed(3);
  const before = await roundStore.count({ chainId: chain.id });
  ok("2: the fixture really has rounds — the refusal is reachable", before === 3, String(before));

  const r = await deleteChain(chain.id, OFFICER);
  ok("2: 🔴 deleting a chain WITH rounds is refused", r.ok === false);
  ok("2: …and the refusal states the COUNT, so an operator knows what is at stake",
     !r.ok && /3 rounds/.test(r.error), !r.ok ? r.error : "");
  ok("2: …and names the remedy rather than just saying no",
     !r.ok && /[Aa]rchive it instead/.test(r.error), !r.ok ? r.error : "");
  // ⛔ AND NOTHING WAS DESTROYED. The chain and every round must still be there — a refusal
  // that half-ran would be worse than one that never guarded.
  ok("2: 🔴 the chain still exists after the refusal", (await chainStore.get(chain.id)) !== null);
  ok("2: 🔴 …and every round is still there", (await roundStore.count({ chainId: chain.id })) === 3);
}

// ── 3 · ⭐ THE POSITIVE CONTROL — a zero-round chain really can be deleted ──
{
  // Without this, §2 would pass over a `deleteChain` that refused EVERYTHING — a control that
  // never works is not a safe control, it is a broken one, and the acceptance asks for this
  // half by name.
  const chain = await seed(0);
  ok("3: the fixture has no rounds", (await roundStore.count({ chainId: chain.id })) === 0);
  const r = await deleteChain(chain.id, OFFICER);
  ok("3: ⭐ a chain that never opened a round IS deleted", r.ok === true, r.ok ? "" : r.error);
  ok("3: …and it is really gone", (await chainStore.get(chain.id)) === null);
}

// ── 4 · ARCHIVE — reversible, and refused while the chain is running ────────
{
  const chain = await seed(4);
  const a = await archiveChain(chain.id, OFFICER);
  ok("4: a stopped chain with rounds CAN be archived", a.ok === true, a.ok ? "" : a.error);
  ok("4: …and it lands in ARCHIVED", (await chainStore.get(chain.id))?.state === "ARCHIVED");
  // ⭐ THE WHOLE POINT: archiving keeps the rounds. Deleting would not.
  ok("4: ⭐ every round survives the archive", (await roundStore.count({ chainId: chain.id })) === 4);

  const u = await unarchiveChain(chain.id, OFFICER);
  ok("4: it can be restored", u.ok === true, u.ok ? "" : u.error);
  // ⛔ Back to STOPPED, never straight to RUNNING — restoring a board and starting it are two
  // decisions, and the start path re-checks the asset and its trusted source.
  ok("4: ⛔ …to STOPPED, not straight back to RUNNING",
     (await chainStore.get(chain.id))?.state === "STOPPED");

  // ⛔ A RUNNING chain is still opening rounds; archiving it silently would take a live board
  // off the operator's list while it kept taking bets.
  await chainStore.patch(chain.id, { state: "RUNNING" } as never);
  const busy = await archiveChain(chain.id, OFFICER);
  ok("4: 🔴 a RUNNING chain is refused, with the reason", busy.ok === false && /[Ss]top the chain/.test(busy.error ?? ""),
     busy.ok ? "archived a running chain" : busy.error);
}

// ── 5 · Who can see an archived chain, and who cannot ──────────────────────
{
  // ⚠️ Players needed NO change: the board filters on RUNNING, so an archived chain is
  // invisible to them by construction — the same way STOPPED already is. Pinning it here
  // means a future "show non-running chains" change cannot leak an archived board silently.
  ok("5: the player board still renders only RUNNING chains", /state === "RUNNING"/.test(board));
  // Admins keep a way back. A filing state that cannot be un-filed is a deletion with extra
  // steps.
  ok("5: the working list excludes archived chains",
     /allChains\.filter\(\(c\) => c\.state !== "ARCHIVED"\)/.test(page));
  ok("5: ⭐ …and they are still listed for admins, with a control",
     /allChains\.filter\(\(c\) => c\.state === "ARCHIVED"\)/.test(page) && /Archived chains/.test(page));
  // ⛔ Archiving is not a run-state change: it must not be reachable through the start/pause/
  // stop control, which has a different precondition and a different audit action.
  ok("5: ⛔ setChainStateAction still refuses ARCHIVED — archiving has its own door",
     /state !== "RUNNING" && state !== "PAUSED" && state !== "STOPPED"/.test(actions));
  ok("5: …and archive/restore/delete each have their own action",
     /archiveChainAction/.test(actions) && /unarchiveChainAction/.test(actions) && /deleteChainAction/.test(actions));
}

// ── 6 · The healer still reads an archived chain's rounds ──────────────────
{
  // E-24's rule: "switching the game off must not trap stakes." The healer reads ROUNDS and
  // ignores chain state, so archiving cannot strand an in-flight stake. Asserted because the
  // acceptance asks for it by name.
  const heal = decomment(readFileSync(join(ROOT, "src/lib/server/updown-scheduler.ts"), "utf8"));
  const src = /healStuckRounds/.test(heal) ? heal
    : decomment(readFileSync(join(ROOT, "src/lib/server/updown-service.ts"), "utf8"));
  ok("6: ⭐ the healer exists and reads rounds, not chain state", /healStuckRounds/.test(src));
  ok("6: ⛔ …and it does not filter on a chain being RUNNING",
     !/chain[\s\S]{0,40}state === "RUNNING"[\s\S]{0,80}heal/i.test(src));
}

// ── 7 · ⛔ ARCHIVED CANNOT OPEN A ROUND — driven, and DISCRIMINATED (S-16) ──
/**
 * `generateRoundNow` is the ONLY way an Up & Down round comes into existence since E-67, and
 * it never read `chain.state`. The product's promise that an archived chain "disappears from
 * the player board" was kept solely by admin/updown/page.tsx filtering archived rows out of
 * the working table so the Generate button never rendered — a guarantee living in a list
 * filter rather than in the money path.
 *
 * ⭐ THIS IS A DISCRIMINATION TEST, NOT A REFUSAL TEST, and that is the whole point. Asserting
 * only "ARCHIVED is refused" would pass just as happily over a check that refused EVERY state —
 * which would break the normal operating flow outright, because since E-67 every chain sits
 * STOPPED by design and rounds are generated by hand. So all four states are driven and the
 * three RUN states must get PAST the state check.
 *
 * ⚠️ The fixture gives the chain a LIVE UNRESOLVED round on purpose. The three allowed states
 * then stop at the one-round-per-chain check, which sits immediately after the state check and
 * before any price read — so the discrimination is exact AND the suite never touches the feed.
 */
{
  const chain = await seed(0);
  await roundStore.create({
    id: "udr_live", chainId: chain.id, marketId: "mkt_live", roundNumber: 1,
    opensAt: iso(0), closesAt: iso(5), boundaryAt: iso(5),
    openObservationId: null, closeObservationId: null, openPrice: null, closePrice: null,
    marginBps: null, upTarget: null, downTarget: null,
    capturedSourceUrl: null, capturedSourceDomain: null,
    outcome: null, voidReason: null, resolvedAt: null, settledAt: null,
    createdAt: iso(0), updatedAt: iso(0),
  } as never);

  const setState = async (state: string) => {
    await chainStore.upsert({
      id: "chn_t", assetId: "ast_t", durationMinutes: 5, state, gridAnchorAt: iso(0),
      nextBoundaryAt: null, currentRoundId: null, minStake: null, maxStake: null,
      rateProfile: null, marginBps: null, createdBy: "test", createdAt: iso(0), updatedAt: iso(0),
    } as never);
  };

  for (const state of ["RUNNING", "PAUSED", "STOPPED"]) {
    await setState(state);
    const r = await generateRoundNow("chn_t", OFFICER);
    ok(`7: ⭐ a ${state} chain is NOT refused for its state`,
       !r.ok && !/archived/i.test(r.error), r.ok ? "(unexpectedly ok)" : r.error);
    ok(`7: …it reaches the live-round check, so the guard let it through`,
       !r.ok && /already live/i.test(r.error), r.ok ? "(unexpectedly ok)" : r.error);
  }

  await setState("ARCHIVED");
  const r = await generateRoundNow("chn_t", OFFICER);
  ok("7: 🔴 an ARCHIVED chain IS refused a round", !r.ok && /archived/i.test(r.error),
     r.ok ? "(a round was opened on an archived chain)" : r.error);
  ok("7: …and the refusal NAMES the chain, not just the rule",
     !r.ok && /TTT 5m/.test(r.error), r.ok ? "" : r.error);
  ok("7: …and names the remedy — restore, not 'restore and start' (STOPPED generates)",
     !r.ok && /restore it/i.test(r.error), r.ok ? "" : r.error);
  // ⛔ And the refusal must come from the STATE, not from the live round that is also present.
  // Reseeded rather than deleted: `RoundStore` has no deleteMany, and an optional call that
  // silently no-ops would leave the live round in place — the assertion would then pass on the
  // wrong reason, which is the failure mode this whole section exists to avoid.
  await seed(0);
  await setState("ARCHIVED");
  const r2 = await generateRoundNow("chn_t", OFFICER);
  ok("7: ⛔ …and it refuses on the STATE even with no live round in the way",
     !r2.ok && /archived/i.test(r2.error), r2.ok ? "(unexpectedly ok)" : r2.error);
}

// ── 8 · ⛔ A FAILED DELETE IS NOT AUDITED AS A SUCCESS (S-18) ───────────────
/**
 * `chainStore.delete` ended in `.catch(() => {})` and returns void either way, and
 * `deleteChain` never read anything back — so a delete that hit an FK violation, a dropped
 * connection or a vanished row still returned `{ ok: true }` AND wrote the
 * `updown.chain.deleted` audit row. The audit log would assert a deletion that never
 * happened, on the one control that exists to be answerable to the Gaming Board.
 *
 * ⚠️ THE MIRROR IMAGE OF A DEFECT ALREADY RECORDED HERE. The reset script's comment reads
 * "the deletion landed and the audit row did not… and the script still printed ✅, because it
 * verified the DELETION and never the audit." This was the other way round, which is worse:
 * the audit said yes and the data said no.
 *
 * ⭐ DRIVEN, NOT SCANNED. A source check for "is there a try/catch" would pass over a caller
 * that catches and audits success anyway. The store's delete is replaced with one that throws,
 * the real `deleteChain` is called, and the AUDIT RING is read — the artefact that would have
 * carried the lie.
 */
{
  const { getAuditPage, auditFlush } = await import("../src/lib/server/audit.ts");

  /* ⛔ THE DELTA, NOT THE TOTAL. The audit ring is global and §3 above legitimately deletes a
   * chain, so "is there an `updown.chain.deleted` row anywhere?" is already true before this
   * section runs — and every chain here is seeded as `chn_t`, so targetId cannot separate them
   * either. Only rows that appear ACROSS this call mean anything. (Asserted the lazy way first;
   * the suite caught it, which is the argument for driving rather than scanning.) */
  await auditFlush();
  const idsBefore = new Set(getAuditPage({ limit: 500 }).map((e) => e.id));
  const since = () => getAuditPage({ limit: 500 }).filter((e) => !idsBefore.has(e.id));

  const chain = await seed(0);
  const realDelete = chainStore.delete;

  // A store whose delete fails the way a real one does — it throws, and the row survives.
  chainStore.delete = async () => { throw new Error("P2025: record to delete does not exist"); };
  const r = await deleteChain(chain.id, OFFICER);
  chainStore.delete = realDelete;
  await auditFlush();

  ok("8: 🔴 a delete that throws is REFUSED, not reported as done", r.ok === false,
     r.ok ? "(returned ok:true over a failed delete)" : r.error);
  ok("8: 🔴 …and NO `updown.chain.deleted` row was written",
     !since().some((e) => e.action === "updown.chain.deleted"),
     "the audit log would have asserted a deletion that never happened");
  ok("8: …and the failure IS recorded, so the attempt is not silent",
     since().some((e) => e.action === "updown.chain.delete_failed"));
  ok("8: ⛔ …and the chain really is still there", (await chainStore.get(chain.id)) !== null);

  /* ⛔ THE SILENT FAILURE — the case the READ-BACK exists for, and the one a throw cannot
   * reach. A store that neither throws nor deletes is not hypothetical: it is what
   * `.catch(() => {})` MADE every failure look like, and what the in-memory twin does for a
   * missing id. The catch block above returns early, so without this case the read-back is
   * dead code that every assertion still passes over. (The red harness found exactly that:
   * nulling the read-back stayed GREEN until this block existed.) */
  const chain3 = await seed(0);
  chainStore.delete = async () => { /* reports success, removes nothing */ };
  const r3 = await deleteChain(chain3.id, OFFICER);
  chainStore.delete = realDelete;
  await auditFlush();

  ok("8: 🔴 a delete that SILENTLY does nothing is refused too", r3.ok === false,
     r3.ok ? "(returned ok:true while the chain survived)" : r3.error);
  ok("8: 🔴 …and it writes no `updown.chain.deleted` row either",
     since().filter((e) => e.action === "updown.chain.deleted").length === 0,
     "a store that lies about success must not be believed");
  ok("8: ⛔ …and the chain really is still there", (await chainStore.get(chain3.id)) !== null);

  // ⭐ POSITIVE CONTROL — the same path with a working store must still delete AND audit.
  // Without this, §8 would pass over a `deleteChain` that refused everything and audited
  // nothing, which is "safe" in the same way an unplugged machine is safe.
  const chain2 = await seed(0);
  const r2 = await deleteChain(chain2.id, OFFICER);
  await auditFlush();
  ok("8: ⭐ a delete that WORKS is still permitted", r2.ok === true, r2.ok ? "" : r2.error);
  ok("8: ⭐ …and it IS audited as deleted",
     since().some((e) => e.action === "updown.chain.deleted"));

  /* ── The DAL half, which no driven case above can reach ──────────────────────
   * §8 replaces `chainStore.delete` to make the caller's handling observable, and the
   * in-memory store is what runs here anyway — so the PRISMA implementation is invisible to
   * every assertion above. That is not a gap in the fixture, it is the limit of driving
   * without a database, and it has to be said rather than left implied: restoring
   * `.catch(() => {})` on the Prisma delete changed nothing in this suite until this check
   * existed. Read as source, over a NAMED population, reconciled so it cannot pass on zero.
   *
   * ⛔ The rule is not "this one line has no .catch". It is that NO destructive method in the
   * DAL swallows — because the defect's whole shape was one forgiving delete sitting beside
   * siblings that all rejected properly, which is what made it read as deliberate. */
  const dalSrc = decomment(readFileSync(join(ROOT, "src/lib/server/updown-dal.ts"), "utf8"));
  const deleteMethods = [...dalSrc.matchAll(/async delete\([^)]*\)\s*\{([^\n]*)\}/g)].map((m) => m[1]);
  ok("8: the DAL's delete methods were located at all — the source rule is not vacuous",
     deleteMethods.length >= 2, `${deleteMethods.length} found`);
  ok("8: ⛔ no destructive DAL delete swallows its own error",
     deleteMethods.every((b) => !/\.catch\(/.test(b)),
     deleteMethods.filter((b) => /\.catch\(/.test(b)).join(" · "));
}

console.log(`\nchain-removal: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
