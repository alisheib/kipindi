/**
 * WITHDRAWN FEATURES — the guard that makes the withdrawal REAL rather than merely invisible.
 *
 * Invite and the bonus wallet are withdrawn from the player product (`src/lib/feature-state.ts`).
 * Hiding surfaces is the easy half. This suite measures the two halves that actually matter:
 *
 *   LAW 1 — GATE THE OFFER, NEVER THE REFUSAL.  A feature flag may hide something we GIVE.
 *   It may never hide something we FORBID. The bonus-funded cash-out block is the sharpest
 *   case: gating it would convert a laundering block into a laundering ROUTE (bonus stake →
 *   cash out → withdrawable cash). §2 proves it still fires with the programme withdrawn.
 *
 *   LAW 2 — A DORMANT PATH ROTS UNLESS SOMETHING STILL RUNS IT.  §4 drives the ON state, so
 *   the re-enablement path is executed on every deploy for as long as the feature sleeps.
 *
 * ⛔ WHAT §3 DOES AND DOES NOT MEASURE. It is a SOURCE-level check over the player app — it
 * proves no player route still READS the withdrawn copy keys. It is NOT a rendered-page
 * sweep, and it must never be described as one: a true "player-reachable render" measurement
 * needs a signed-in browser and belongs in the live drive. Naming the population honestly is
 * the whole point — a true measurement over the wrong population is the most convincing way
 * to be wrong.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { inviteIsLiveFor, bonusIsLiveFor, inviteStateFor } from "../src/lib/feature-state.ts";
import { cashOutValue } from "../src/lib/server/market-service.ts";

let pass = 0, fail = 0;
function ok(label: string, cond: boolean, extra?: string) {
  if (cond) { pass++; } else { fail++; console.log(`FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
}

// ── §1 · THE SEAM ANSWERS PER ROLE ─────────────────────────────────────────
{
  ok("§1 invite is WITHDRAWN for a player", inviteStateFor("PLAYER") === "WITHDRAWN", inviteStateFor("PLAYER"));
  ok("§1 invite is not live for a player", !inviteIsLiveFor("PLAYER"));
  ok("§1 invite is not live for a signed-out viewer", !inviteIsLiveFor(null));
  // ⭐ THE CONTROL. Without this the suite would pass by refusing everyone, and a seam that
  // refuses everyone is indistinguishable from a seam that is simply broken.
  ok("§1 CONTROL · invite IS live for an approved AGENT", inviteIsLiveFor("AGENT"));
  ok("§1 bonus is not live for anyone", !bonusIsLiveFor("PLAYER") && !bonusIsLiveFor("AGENT") && !bonusIsLiveFor(null));
  // ⛔ WITHDRAWN, NOT COMING_SOON. A gilt "coming soon" badge is a PROMISE, and we are not
  // promising players this programme. If someone softens the constant back to COMING_SOON,
  // every entry point starts advertising again and this is the line that says so.
  ok("§1 the state is WITHDRAWN, never COMING_SOON", inviteStateFor("PLAYER") !== "COMING_SOON");
}

// ── §2 · LAW 1 — THE REFUSAL IS NOT GATED ──────────────────────────────────
// A bonus-funded position must STILL be unsellable while the programme is withdrawn.
{
  const now = Date.now();
  const market = {
    id: "m_law1", yesPool: 100_000, noPool: 100_000,
    resolutionAt: new Date(now + 6 * 3_600_000).toISOString(),
    selectionClosedAt: new Date(now + 3 * 3_600_000).toISOString(),
    feeSnapshot: null,
  };
  const placedAt = new Date(now - 30_000).toISOString(); // well inside the free window

  const bonusFunded = await cashOutValue(
    { side: "YES", stake: 20_000, placedAt, bonusStakeTzs: 5_000 },
    market as never,
  );
  ok("§2 bonus-funded position is NOT sellable", bonusFunded.sellable === false, `sellable=${bonusFunded.sellable}`);
  ok("§2 and it says BONUS_FUNDED", bonusFunded.reason === "BONUS_FUNDED", `reason=${bonusFunded.reason}`);

  // ⭐ THE CONTROL, and it is the one that makes §2 mean anything: the SAME market, the SAME
  // timing, cash-funded. If this were also unsellable the refusal above would be proving the
  // window, not the bonus rule.
  const cashFunded = await cashOutValue(
    { side: "YES", stake: 20_000, placedAt, bonusStakeTzs: 0 },
    market as never,
  );
  ok("§2 CONTROL · the same position cash-funded IS sellable", cashFunded.sellable === true, `sellable=${cashFunded.sellable} reason=${cashFunded.reason}`);
}

// ── §3 · NO PLAYER ROUTE STILL READS THE WITHDRAWN COPY ────────────────────
// Population: `src/app` minus `admin` and `api`, plus `src/components/layout`.
// The admin console is EXCLUDED on purpose — an operator must still be able to read and
// audit the grants that exist. Withdrawal is a player-product decision, not a data deletion.
{
  const ROOTS = ["src/app", "src/components/layout"];
  const SKIP = ["src/app/admin", "src/app/api"];
  const WITHDRAWN_KEYS = ["inviteComingSoonTag", "inviteComingSoonTitle", "inviteComingSoonBody"];

  const files: string[] = [];
  const walk = (dir: string) => {
    let entries: string[] = [];
    try { entries = readdirSync(dir); } catch { return; }
    for (const e of entries) {
      const p = join(dir, e).replace(/\\/g, "/");
      if (SKIP.some((s) => p.startsWith(s))) continue;
      if (statSync(p).isDirectory()) walk(p);
      else if (p.endsWith(".tsx") || p.endsWith(".ts")) files.push(p);
    }
  };
  for (const r of ROOTS) walk(r);

  // ⛔ A gate over zero files proves nothing — the population must be non-empty and plausible.
  ok("§3 population is real (>80 player files scanned)", files.length > 80, `scanned=${files.length}`);

  const offenders: string[] = [];
  for (const f of files) {
    const src = readFileSync(f, "utf8");
    for (const key of WITHDRAWN_KEYS) {
      if (src.includes(key)) offenders.push(`${f} → ${key}`);
    }
  }
  ok("§3 no player route reads the invite coming-soon copy", offenders.length === 0, offenders.join(" · "));

  // The old single-switch module must stay gone: a shim would let a role-blind
  // `inviteIsLive()` keep compiling at call sites that must now ask about a role.
  const shimUsers = files.filter((f) => readFileSync(f, "utf8").includes("invite-feature"));
  ok("§3 nothing imports the deleted invite-feature module", shimUsers.length === 0, shimUsers.join(" · "));
}

// ── §4 · LAW 2 — THE ON PATH IS STILL EXECUTABLE ───────────────────────────
// ⭐ This is what stops re-enablement shipping broken. The state is read through an env
// override precisely so the ACTIVE branch can be driven while the feature sleeps; without
// it the ON path would go unexecuted for months and rot silently.
{
  process.env.FEATURE_INVITE = "ACTIVE";
  process.env.FEATURE_BONUS = "ACTIVE";
  try {
    ok("§4 invite re-enables for an ordinary player", inviteIsLiveFor("PLAYER"));
    ok("§4 invite stays live for an agent", inviteIsLiveFor("AGENT"));
    ok("§4 bonus re-enables", bonusIsLiveFor("PLAYER"));
  } finally {
    delete process.env.FEATURE_INVITE;
    delete process.env.FEATURE_BONUS;
  }
  // ⛔ And the override must not leak past this block, or every later assertion in any suite
  // that imports this module would be measuring the wrong state.
  ok("§4 the override is restored, not leaked", !inviteIsLiveFor("PLAYER") && !bonusIsLiveFor("PLAYER"));
}

console.log(`\n${pass} passed · ${fail} failed`);
if (pass === 0) { console.log("⛔ 0 passed — a zero-assertion run is a SKIPPED run, never a green one."); process.exit(1); }
process.exit(fail === 0 ? 0 : 1);
