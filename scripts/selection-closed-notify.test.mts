/**
 * Tests the "selections closed — waiting for results" lifecycle sweep:
 * bettors on a market whose selection window has passed get a one-time in-app
 * notification + email; it fires exactly once; future-cutoff and Demo markets
 * are excluded. In-memory store.
 *
 * Run: npm run test:selection-closed
 */
process.env.SESSION_SECRET ??= "test-only-session-secret-32chars-min-aaaa";

import { marketStore, positionStore } from "../src/lib/server/market-dal.ts";
import { notifySelectionClosedMarkets } from "../src/lib/server/market-service.ts";
import { listForUser } from "../src/lib/server/notification-service.ts";
import { selectionClosedHtml } from "../src/lib/server/email.ts";
import { db } from "../src/lib/server/store.ts";

let pass = 0, fail = 0;
const ok = (l: string, c: boolean, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"} ${l} ${x}`); };
const now = Date.now();
const iso = new Date(now).toISOString();
const ago = (mins: number) => new Date(now - mins * 60_000).toISOString();
const ahead = (mins: number) => new Date(now + mins * 60_000).toISOString();

function mkMarket(id: string, opts: { titleEn?: string; selectionClosedAt: string | null; resolutionAt: string; status?: string; notified?: string | null }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return marketStore.set({
    id, titleEn: opts.titleEn ?? `Market ${id}`, titleSw: "SW", category: "crypto", sourceUrl: "https://x",
    resolutionCriterion: "crit", resolutionAt: opts.resolutionAt, selectionClosedAt: opts.selectionClosedAt,
    status: opts.status ?? "LIVE", yesPool: 1000, noPool: 1000, predictorCount: 0, resolvedOutcome: null,
    resolutionStage1By: null, resolutionStage1At: null, resolutionStage2By: null, resolutionStage2At: null,
    objectionsClosedAt: null, resolutionNotifiedAt: null, selectionClosedNotifiedAt: opts.notified ?? null,
    proposedBy: "system", createdAt: iso, updatedAt: iso,
  } as any);
}
function mkPosition(id: string, marketId: string, userId: string, status = "OPEN") {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return positionStore.set({
    id, marketId, userId, side: "YES", stake: 1000, shares: 1000, status,
    avgPricePct: 50, finalPayout: null, settledAt: null, createdAt: iso, updatedAt: iso,
  } as any);
}
async function mkUser(id: string, email: string | null = null) {
  await db.user.create({
    id, phoneE164: `+25572${id.slice(-7).padStart(7, "0")}`, passwordHash: null, passwordSalt: null, failedLoginCount: 0,
    lockedUntil: null, role: "PLAYER", status: "ACTIVE", locale: "EN", displayName: id, dob: "1990-01-01", region: "TZ",
    acceptedTermsVersion: "v1", acceptedTermsAt: iso, marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null,
    email, emailVerifiedAt: null, createdAt: iso, updatedAt: iso, lastLoginAt: iso, closedAt: null,
  });
}

// 0. Email template renders.
{
  const html = selectionClosedHtml({ marketTitle: "Will it rain in Dodoma Friday?", closedAt: iso, resolvesAt: ahead(120), marketId: "mkt_x" });
  ok("email shows market title", html.includes("Will it rain in Dodoma Friday?"));
  ok("email says waiting for results", html.toLowerCase().includes("waiting for results"));
  ok("email links to the market", html.includes("/markets/mkt_x"));
}

await mkUser("usr_sc_alice", "alice@test.tz");
await mkUser("usr_sc_bob");                       // no email — in-app only
await mkUser("usr_sc_carol", "carol@test.tz");    // bets on a FUTURE market — must NOT be notified

// 1. Selection closed (5 min ago), resolution later → both bettors notified once.
await mkMarket("mkt_sc_1", { titleEn: "Will Simba win on Sunday?", selectionClosedAt: ago(5), resolutionAt: ahead(180) });
mkPosition("pos_a1", "mkt_sc_1", "usr_sc_alice");
mkPosition("pos_b1", "mkt_sc_1", "usr_sc_bob");
mkPosition("pos_a1b", "mkt_sc_1", "usr_sc_alice", "OPEN"); // alice holds 2 positions → still ONE notification

// 2. Selection still OPEN (closes in 60 min) → carol must NOT be notified.
await mkMarket("mkt_sc_future", { titleEn: "Future market", selectionClosedAt: ahead(60), resolutionAt: ahead(240) });
mkPosition("pos_c1", "mkt_sc_future", "usr_sc_carol");

// 3. Demo market past cutoff → excluded (auto-resolves instantly).
await mkMarket("mkt_sc_demo", { titleEn: "Demo · quick market", selectionClosedAt: ago(5), resolutionAt: ahead(5) });
mkPosition("pos_d1", "mkt_sc_demo", "usr_sc_alice");

const r1 = await notifySelectionClosedMarkets();
await new Promise((res) => setTimeout(res, 150)); // flush fire-and-forget emails

ok("1 market notified", r1.notified === 1, JSON.stringify(r1));
ok("2 distinct bettors notified (alice once despite 2 positions)", r1.bettors === 2, JSON.stringify(r1));

const aliceNs = (await listForUser("usr_sc_alice")).filter((n) => n.kind === "SELECTION_CLOSED");
const bobNs = (await listForUser("usr_sc_bob")).filter((n) => n.kind === "SELECTION_CLOSED");
const carolNs = (await listForUser("usr_sc_carol")).filter((n) => n.kind === "SELECTION_CLOSED");
ok("alice got exactly ONE selection-closed bell", aliceNs.length === 1, `got ${aliceNs.length}`);
ok("bob got one selection-closed bell", bobNs.length === 1, `got ${bobNs.length}`);
ok("carol (future market) got NONE", carolNs.length === 0, `got ${carolNs.length}`);
ok("alice's bell deep-links to the market", aliceNs[0]?.href === "/markets/mkt_sc_1", aliceNs[0]?.href);
ok("alice's bell did NOT come from the demo market", !aliceNs.some((n) => n.href === "/markets/mkt_sc_demo"));

// 4. Idempotency — running again notifies nobody new.
const r2 = await notifySelectionClosedMarkets();
ok("second sweep notifies 0 markets", r2.notified === 0, JSON.stringify(r2));
const aliceAfter = (await listForUser("usr_sc_alice")).filter((n) => n.kind === "SELECTION_CLOSED");
ok("alice still has exactly ONE bell after re-sweep", aliceAfter.length === 1, `got ${aliceAfter.length}`);

// 5. The market got stamped.
const m1 = await marketStore.get("mkt_sc_1");
ok("market stamped selectionClosedNotifiedAt", !!m1?.selectionClosedNotifiedAt, String(m1?.selectionClosedNotifiedAt));

// 6. When the future market's window passes, its bettor gets notified.
const fut = await marketStore.get("mkt_sc_future");
// eslint-disable-next-line @typescript-eslint/no-explicit-any
await marketStore.set({ ...(fut as any), selectionClosedAt: ago(1) });
const r3 = await notifySelectionClosedMarkets();
const carolAfter = (await listForUser("usr_sc_carol")).filter((n) => n.kind === "SELECTION_CLOSED");
ok("carol notified once her market's window closed", carolAfter.length === 1 && r3.notified === 1, `${carolAfter.length} / ${JSON.stringify(r3)}`);

console.log(`\nselection-closed-notify: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
