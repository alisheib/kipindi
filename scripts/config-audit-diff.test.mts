/**
 * THE CONFIG AUDIT'S `changes` FIELD IS A DIFF — executed, against the save that actually
 * went wrong on production.
 *
 *   npx tsx scripts/config-audit-diff.test.mts     (npm run test:config-audit-diff)
 *
 * 🔴 THE DEFECT THIS EXISTS FOR, AND IT WAS NOT HYPOTHETICAL. Every config audit wrote
 * `changes: updates`, and `updates` is the WHOLE POSTED FORM — an admin settings form seeds
 * its state from the entire current config and submits all of it, so a save that moved ONE
 * field recorded every field as "changed".
 *
 * On 2026-09-08T17:42:24Z an officer changed the agent programme's Lipa fee destination.
 * In that same save `feeVatRatePct` went **18 → 0**, taking the registration fee from
 * TZS 118,000 to TZS 100,000 and the VAT remitted to `HOUSE:TAX` to nothing — against a law
 * (`RULES.md` §6, `AGENT-PROGRAMME.md` §5a, `COMPLIANCE-DECISIONS.md` § 2026-09-08) that says
 * 118,000 at 18%. The audit row recorded **sixteen** indistinguishable "changes", and
 * `/admin/config` → History renders that blob `JSON.stringify`'d into one truncated cell.
 * Nothing on any screen could show which field had moved. (money-gate `LEAD-B.1a`, CONFIRMED
 * by two of three adversarial lenses; `MONEY-GATE-REMEDIATION.md` §7.1.)
 *
 * ⭐ NOTHING WAS EVER LOST — `before` and `after` were always complete. The row was
 * UNREADABLE, not incomplete, which is why no integrity check could see it and why §5 below
 * exists: the fix must not "clean up" the two fields that hold the actual record.
 *
 *   §1 `configChanges` reports ONLY the fields that moved, with both sides
 *   §2 ⭐ THE PRODUCTION SAVE, REPLAYED from the real audit row — 16 fields in, 3 out
 *   §3 the four live setters, DRIVEN, each emitting a diff and not a form
 *   §4 ⚠️ POSITIVE CONTROL, same run — the §3 checker REJECTS the pre-fix payload shape
 *   §5 ⛔ OVER-CORRECTION — `before` and `after` must still be COMPLETE snapshots
 *
 * In-memory: no DATABASE_URL, so the SystemConfig write-through no-ops and the audit ring is
 * the sole store.
 */
import { configChanges } from "../src/lib/server/config-store.ts";
import { setGlobalConfig } from "../src/lib/server/market-config.ts";
import { setProposalsConfig } from "../src/lib/server/proposals-config.ts";
import { auditFlush, getAuditPage } from "../src/lib/server/audit.ts";

let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, detail = "") => {
  if (cond) { pass++; console.log(`PASS ${label}`); }
  else { fail++; console.log(`FAIL ${label}${detail ? ` — ${detail}` : ""}`); }
};

const OFFICER = "usr_cfg_diff_officer";
type Diff = Record<string, { from: unknown; to: unknown }>;

// ── §1 · only what moved, with both sides ────────────────────────────────────
console.log("\n§1 · configChanges reports only the fields that moved");
{
  const before = { a: 1, b: "x", c: true, nested: { k: 1 } };
  const after = { a: 2, b: "x", c: true, nested: { k: 1 } };
  const d = configChanges(before, after);
  ok("one field moved → exactly one key", Object.keys(d).length === 1, JSON.stringify(d));
  ok("…and it carries BOTH sides", d.a?.from === 1 && d.a?.to === 2, JSON.stringify(d.a));
  ok("an unchanged nested object is NOT reported", !("nested" in d));

  ok("nothing moved → an EMPTY diff", Object.keys(configChanges(before, { ...before })).length === 0);

  const added = configChanges({ a: 1 }, { a: 1, fresh: 9 });
  ok("a field that appears is an ADDITION, from: undefined", added.fresh?.from === undefined && added.fresh?.to === 9);

  // A value moving to a falsy one is the exact shape of the production defect (18 → 0).
  const toZero = configChanges({ rate: 18 }, { rate: 0 });
  ok("⭐ 18 → 0 is reported — a falsy `to` is still a change", toZero.rate?.from === 18 && toZero.rate?.to === 0);
}

// ── §2 · the production save, replayed ───────────────────────────────────────
console.log("\n§2 · the 2026-09-08T17:42:24Z agent.config save, replayed from the audit row");
{
  // Verbatim `before` and `after` from production AuditLog action `agent.config.updated`.
  const before = {
    enabled: true, feeVatRatePct: 18, reviewSlaDays: 5, draftExpiryDays: 30,
    feeVatTreatment: "EXCLUSIVE", capPerRecruitTzs: 0, maxCommissionPct: 40,
    feeDestinationName: "Digital Selcom Bank", refundDeadlineDays: 7,
    registrationFeeTzs: 100000, reapplyCooldownDays: 90, defaultCommissionPct: 10,
    invitationExpiryDays: 1, feeDestinationAccount: "0769777877",
    agentWithholdingTaxPct: 5, commissionWindowMonths: 0,
  };
  const after = {
    ...before,
    feeVatRatePct: 0,
    feeDestinationName: "Selcom LIPA NAMBA - OCEAN ENTERTAINMENT LIMITED",
    feeDestinationAccount: "7006 3747",
  };

  ok("the replayed form really does carry 16 fields", Object.keys(before).length === 16);

  const d = configChanges(before, after);
  ok("⭐ 16 fields posted → 3 reported, not 16", Object.keys(d).length === 3, `got ${Object.keys(d).join(", ")}`);
  ok(
    "⭐ the statutory rate is NAMED, 18 → 0 — the thing no screen could show",
    d.feeVatRatePct?.from === 18 && d.feeVatRatePct?.to === 0,
  );
  ok("the two destination fields are reported too", "feeDestinationName" in d && "feeDestinationAccount" in d);
  ok(
    "…and the thirteen fields that did NOT move are absent",
    !("registrationFeeTzs" in d) && !("agentWithholdingTaxPct" in d) && !("defaultCommissionPct" in d),
  );

  // The whole point is legibility on a truncated cell. Measure it.
  const oldCell = JSON.stringify(after);          // what `changes: updates` rendered
  const newCell = JSON.stringify(d);              // what it renders now
  ok(
    `⭐ the rendered cell shrinks from ${oldCell.length} to ${newCell.length} characters`,
    newCell.length < oldCell.length / 2,
    `${oldCell.length} → ${newCell.length}`,
  );
  ok(
    "⭐ and `feeVatRatePct` is now inside the first 200 characters a truncated cell shows",
    newCell.indexOf("feeVatRatePct") >= 0 && newCell.indexOf("feeVatRatePct") < 200,
    `at index ${newCell.indexOf("feeVatRatePct")} (was ${oldCell.indexOf("feeVatRatePct")})`,
  );
}

// ── §3 · the live setters, driven ────────────────────────────────────────────
console.log("\n§3 · the real setters emit a diff, not the posted form");

/** The check §4 must be able to FAIL: a `changes` payload names only what moved. */
function changesIsADiff(changes: unknown, expectedKeys: string[]): { ok: boolean; why: string } {
  if (!changes || typeof changes !== "object") return { ok: false, why: "no changes object" };
  const keys = Object.keys(changes as object);
  if (keys.length !== expectedKeys.length || !expectedKeys.every((k) => keys.includes(k))) {
    return { ok: false, why: `expected [${expectedKeys.join(", ")}], got ${keys.length}: [${keys.join(", ")}]` };
  }
  for (const k of keys) {
    const v = (changes as Diff)[k];
    if (!v || typeof v !== "object" || !("from" in v) || !("to" in v)) {
      return { ok: false, why: `"${k}" is not a { from, to } pair — it is ${JSON.stringify(v)}` };
    }
  }
  return { ok: true, why: "" };
}

const findAudit = (action: string) => getAuditPage({ category: "ADMIN", limit: 300 }).find((e) => e.action === action);

{
  // market-config — the surface LEAD-B.1a was filed against.
  await setGlobalConfig({ gbtLevyOnCommissionRate: 0.06 }, OFFICER);
  await auditFlush();
  const e = findAudit("config.global.updated");
  ok("config.global.updated was written", !!e);
  const v = changesIsADiff(e?.payload?.changes, ["gbtLevyOnCommissionRate"]);
  ok("market-config · `changes` names ONLY the levy that moved", v.ok, v.why);
  ok(
    "…with the real before/after values on it",
    (e?.payload?.changes as Diff)?.gbtLevyOnCommissionRate?.to === 0.06,
    JSON.stringify((e?.payload?.changes as Diff)?.gbtLevyOnCommissionRate),
  );
  await setGlobalConfig({ gbtLevyOnCommissionRate: 0.05 }, OFFICER); // restore the lawful rate
  await auditFlush();
}

{
  // defineConfig — the factory the agent programme's own config is built on, and therefore
  // the exact code path the production save went through.
  setProposalsConfig({ state: "MAINTENANCE" }, OFFICER);
  await auditFlush();
  const e = findAudit("proposals.config.updated");
  ok("proposals.config.updated was written", !!e);
  const v = changesIsADiff(e?.payload?.changes, ["state"]);
  ok("⭐ defineConfig · `changes` names ONLY the field that moved", v.ok, v.why);
  setProposalsConfig({ state: "COMING_SOON" }, OFFICER);
  await auditFlush();
}

// ── §4 · POSITIVE CONTROL ────────────────────────────────────────────────────
console.log("\n§4 · ⚠️ POSITIVE CONTROL — the §3 checker must REJECT the pre-fix shape");
{
  // This is verbatim what `changes: updates` produced: the whole posted form, flat values.
  const preFix = {
    enabled: true, feeVatRatePct: 0, reviewSlaDays: 5, draftExpiryDays: 30,
    feeVatTreatment: "EXCLUSIVE", capPerRecruitTzs: 0, maxCommissionPct: 40,
    feeDestinationName: "Selcom LIPA NAMBA - OCEAN ENTERTAINMENT LIMITED",
    refundDeadlineDays: 7, registrationFeeTzs: 100000, reapplyCooldownDays: 90,
    defaultCommissionPct: 10, invitationExpiryDays: 1, feeDestinationAccount: "7006 3747",
    commissionWindowMonths: 0,
  };
  const v = changesIsADiff(preFix, ["feeVatRatePct"]);
  ok("⚠️ the checker REJECTS the whole-form payload", !v.ok, `it accepted it — the check is vacuous`);
  ok("…and says why, naming the count", /got 15/.test(v.why), v.why);

  // And it must reject a payload that has the right KEY but not the { from, to } shape —
  // otherwise a future "changes: { feeVatRatePct: 0 }" would slip through as a diff.
  const rightKeyWrongShape = changesIsADiff({ feeVatRatePct: 0 }, ["feeVatRatePct"]);
  ok("⚠️ …and rejects the right key without both sides", !rightKeyWrongShape.ok, rightKeyWrongShape.why);

  // The control must also ACCEPT a genuine diff, or §3 passing would mean nothing.
  const genuine = changesIsADiff({ feeVatRatePct: { from: 18, to: 0 } }, ["feeVatRatePct"]);
  ok("⚠️ …and ACCEPTS a genuine diff", genuine.ok, genuine.why);
}

// ── §5 · over-correction ─────────────────────────────────────────────────────
console.log("\n§5 · ⛔ OVER-CORRECTION — the diff must not replace the full record");
{
  await setGlobalConfig({ traTaxOnCommissionRate: 0.11 }, OFFICER);
  await auditFlush();
  const e = findAudit("config.global.updated");
  const before = e?.payload?.before as Record<string, unknown> | undefined;
  const after = e?.payload?.after as Record<string, unknown> | undefined;

  ok("`before` is still on the payload", !!before);
  ok("`after` is still on the payload", !!after);
  ok(
    "⛔ …and both are COMPLETE snapshots, not diffs — every rate is still recoverable",
    !!before && !!after
      && typeof before.platformFeeRate === "number" && typeof after.platformFeeRate === "number"
      && typeof before.withdrawalFeeRate === "number" && typeof after.withdrawalFeeRate === "number"
      && Object.keys(after).length > 10,
    `before ${Object.keys(before ?? {}).length} keys · after ${Object.keys(after ?? {}).length} keys`,
  );
  ok(
    "⛔ the levy's OLD value survives on `before` — a diff that dropped it would lose the record",
    before?.traTaxOnCommissionRate === 0.1,
    `before.traTaxOnCommissionRate = ${JSON.stringify(before?.traTaxOnCommissionRate)}`,
  );
  await setGlobalConfig({ traTaxOnCommissionRate: 0.1 }, OFFICER); // restore the lawful rate
  await auditFlush();
}

console.log(`\n${"═".repeat(70)}\n  CONFIG AUDIT DIFF: ${pass} passed, ${fail} failed\n${"═".repeat(70)}`);
process.exit(fail === 0 ? 0 : 1);
