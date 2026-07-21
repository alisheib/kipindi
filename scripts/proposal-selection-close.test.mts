/**
 * Proposal betting-close (selection date) — whole-flow tests (in-memory store).
 *
 * Guards the fix + feature:
 *   - createProposal stores an optional selectionCloseDate (null when omitted)
 *   - a close date after resolution, or in the past, is rejected
 *   - editProposal (officer) can set / change / clear the close date and other fields
 *   - editProposal is allowed on REVIEW/CHANGES/APPROVED, rejected once LISTED
 *   - goLiveProposal carries the proposal's close date into the market's
 *     selectionClosedAt (and falls back to auto when unset)
 */
import { db, type StoredWallet } from "../src/lib/server/store.ts";
import {
  createProposal, approveProposal, goLiveProposal, editProposal, getProposalDetail,
} from "../src/lib/server/proposals-service.ts";
import { getMarket } from "../src/lib/server/market-service.ts";
import { setProposalsConfig } from "../src/lib/server/proposals-config.ts";
import { setBonusConfig } from "../src/lib/server/bonus-config.ts";

let pass = 0, fail = 0;
function ok(label: string, cond: boolean, extra?: string) {
  if (cond) { pass++; } else { fail++; console.log(`FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
}
const now = () => new Date().toISOString();
let seq = 0;
const TRUSTED_MACRO = "https://www.bot.go.tz/exchange-rates"; // trusted for macro at go-live
const futureDate = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
const base = (over: Record<string, unknown>) => ({
  titleEn: "Will inflation stay under five percent?", resolutionCriterion: "Resolves from official Bank of Tanzania figures.",
  category: "macro" as const, sourceUrl: TRUSTED_MACRO, ...over,
});

async function mkUser(role: "PLAYER" | "ADMIN" = "PLAYER"): Promise<string> {
  const id = `usr_${role}_${++seq}`;
  await db.user.create({
    id, phoneE164: `+25573${String(seq).padStart(7, "0")}`, passwordHash: null, passwordSalt: null,
    failedLoginCount: 0, lockedUntil: null, role, status: "ACTIVE", locale: "EN",
    displayName: null, dob: null, region: null, acceptedTermsVersion: null, acceptedTermsAt: null,
    marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null,
    createdAt: now(), updatedAt: now(), lastLoginAt: null, closedAt: null,
  } as never);
  await db.wallet.create({
    id: `wal_${id}`, userId: id, balance: 0, pending: 0, hold: 0, bonusBalance: 0,
    currency: "TZS", status: "ACTIVE", createdAt: now(), updatedAt: now(),
  } as StoredWallet);
  return id;
}

setBonusConfig({ enabled: true, defaultWagerMultiplier: 5, defaultExpiryDays: 30, proposalToBonus: true } as never, "test");
setProposalsConfig({ state: "ACTIVE", prizeTzs: 5_000, hotThreshold: 200, rateLimit: 20 } as never, "test");
const officer = await mkUser("ADMIN");

// 1. create WITHOUT close date → null
{
  const P = await mkUser();
  const r = await createProposal(P, base({ resolutionDate: futureDate(40) }));
  ok("1: create without close date ok", r.ok, r.ok ? "" : r.error);
  ok("1: selectionCloseDate null when omitted", r.ok && r.proposal.selectionCloseDate === null);
}

// 2. create WITH a valid close date (before resolution)
{
  const P = await mkUser();
  const close = futureDate(20);
  const r = await createProposal(P, base({ resolutionDate: futureDate(40), selectionCloseDate: close }));
  ok("2: create with close date ok", r.ok, r.ok ? "" : r.error);
  ok("2: close date stored", r.ok && r.proposal.selectionCloseDate === close);
}

// 3. close date AFTER resolution → rejected
{
  const P = await mkUser();
  const r = await createProposal(P, base({ resolutionDate: futureDate(20), selectionCloseDate: futureDate(40) }));
  ok("3: close after resolution rejected", !r.ok);
}

// 4. close date in the PAST → rejected
{
  const P = await mkUser();
  const r = await createProposal(P, base({ resolutionDate: futureDate(40), selectionCloseDate: "2000-01-01" }));
  ok("4: past close date rejected", !r.ok);
}

// 5. officer edit can SET the close date; detail reflects it
{
  const P = await mkUser();
  const c = await createProposal(P, base({ resolutionDate: futureDate(40) }));
  const close = futureDate(15);
  const e = c.ok ? await editProposal(c.proposal.id, officer, { selectionCloseDate: close }) : { ok: false };
  ok("5: edit set close date ok", e.ok);
  const d = c.ok ? await getProposalDetail(c.proposal.id, null) : null;
  ok("5: detail reflects new close date", d?.selectionCloseDate === close, `got=${d?.selectionCloseDate}`);
}

// 6. officer edit with close AFTER resolution → rejected
{
  const P = await mkUser();
  const c = await createProposal(P, base({ resolutionDate: futureDate(30) }));
  const e = c.ok ? await editProposal(c.proposal.id, officer, { selectionCloseDate: futureDate(50) }) : { ok: true };
  ok("6: edit close after resolution rejected", !e.ok);
}

// 7. FULL FLOW: close date carries into the published market's selectionClosedAt
{
  const P = await mkUser();
  const close = futureDate(18);
  const c = await createProposal(P, base({ resolutionDate: futureDate(40), selectionCloseDate: close }));
  const a = c.ok ? await approveProposal(c.proposal.id, officer) : { ok: false };
  ok("7: approve ok", a.ok);
  const g = c.ok ? await goLiveProposal(c.proposal.id, officer, TRUSTED_MACRO) : { ok: false as const };
  ok("7: go-live ok", g.ok, g.ok ? "" : (g as { error?: string }).error ?? "");
  const m = g.ok ? await getMarket(g.marketId) : null;
  ok("7: market selectionClosedAt matches proposal close date",
    m?.selectionClosedAt === `${close}T23:59:59.000Z`, `got=${m?.selectionClosedAt}`);
}

// 8. FULL FLOW without a close date: market still gets a resolution + (auto) close
{
  const P = await mkUser();
  const c = await createProposal(P, base({ resolutionDate: futureDate(40) }));
  if (c.ok) await approveProposal(c.proposal.id, officer);
  const g = c.ok ? await goLiveProposal(c.proposal.id, officer, TRUSTED_MACRO) : { ok: false as const };
  ok("8: go-live without explicit close ok", g.ok, g.ok ? "" : (g as { error?: string }).error ?? "");
  const m = g.ok ? await getMarket(g.marketId) : null;
  ok("8: market has a resolutionAt", !!m?.resolutionAt);
}

// 9. edit allowed on APPROVED, rejected once LISTED
{
  const P = await mkUser();
  const c = await createProposal(P, base({ resolutionDate: futureDate(40) }));
  if (c.ok) await approveProposal(c.proposal.id, officer);
  const e1 = c.ok ? await editProposal(c.proposal.id, officer, { titleEn: "Edited title while still approved" }) : { ok: false };
  ok("9: edit allowed on APPROVED", e1.ok);
  const g = c.ok ? await goLiveProposal(c.proposal.id, officer, TRUSTED_MACRO) : { ok: false as const };
  ok("9: go-live ok", g.ok);
  const e2 = c.ok ? await editProposal(c.proposal.id, officer, { titleEn: "Trying to edit after it is listed" }) : { ok: true };
  ok("9: edit rejected once LISTED", !e2.ok);
}

// 10. officer edit can CLEAR an existing close date (set → null)
{
  const P = await mkUser();
  const c = await createProposal(P, base({ resolutionDate: futureDate(40), selectionCloseDate: futureDate(15) }));
  const e = c.ok ? await editProposal(c.proposal.id, officer, { selectionCloseDate: null }) : { ok: false };
  ok("10: edit clear close date ok", e.ok);
  const d = c.ok ? await getProposalDetail(c.proposal.id, null) : null;
  ok("10: close date cleared to null", d?.selectionCloseDate === null, `got=${d?.selectionCloseDate}`);
}

// 11. officer edit can change the category
{
  const P = await mkUser();
  const c = await createProposal(P, base({ resolutionDate: futureDate(40) }));
  const e = c.ok ? await editProposal(c.proposal.id, officer, { category: "sports" }) : { ok: false };
  ok("11: edit category ok", e.ok);
  const d = c.ok ? await getProposalDetail(c.proposal.id, null) : null;
  ok("11: category updated to sports", d?.category === "sports", `got=${d?.category}`);
}

// 12. officer edit can move the resolution date later
{
  const P = await mkUser();
  const c = await createProposal(P, base({ resolutionDate: futureDate(30) }));
  const newRes = futureDate(60);
  const e = c.ok ? await editProposal(c.proposal.id, officer, { resolutionDate: newRes }) : { ok: false };
  ok("12: edit resolution date ok", e.ok);
  const d = c.ok ? await getProposalDetail(c.proposal.id, null) : null;
  ok("12: resolution date updated", d?.resolutionDate === newRes, `got=${d?.resolutionDate}`);
}

// 13. reconcile guard: moving resolution to/before an existing close date is rejected
{
  const P = await mkUser();
  const c = await createProposal(P, base({ resolutionDate: futureDate(40), selectionCloseDate: futureDate(20) }));
  const e = c.ok ? await editProposal(c.proposal.id, officer, { resolutionDate: futureDate(10) }) : { ok: true };
  ok("13: move resolution before existing close rejected", !e.ok);
}

// 14. strictly-before: close == resolution is rejected (create + edit)
{
  const P = await mkUser();
  const same = futureDate(40);
  const r = await createProposal(P, base({ resolutionDate: same, selectionCloseDate: same }));
  ok("14: create with close == resolution rejected", !r.ok);
  const c = await createProposal(P, base({ resolutionDate: same }));
  const e = c.ok ? await editProposal(c.proposal.id, officer, { selectionCloseDate: same }) : { ok: true };
  ok("14: edit close == resolution rejected", !e.ok);
}

console.log(`\nproposal-selection-close: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
