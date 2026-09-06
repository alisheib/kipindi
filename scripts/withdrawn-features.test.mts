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
// ⛔ ONE HOME FOR COMMENT-STRIPPING — `test:decomment` §2.1 exists because two suites shipped
// private four-line strippers. A note ABOUT a link must never be read as a link.
import { decomment } from "./lib/decomment.mts";
import { inviteIsLiveFor, bonusIsLiveFor, inviteStateFor } from "../src/lib/feature-state.ts";
import { cashOutValue } from "../src/lib/server/market-service.ts";
import { db } from "../src/lib/server/store.ts";
import { bindRecruit, ensureAffiliateAccount, resolveReferralPreview } from "../src/lib/server/affiliate-service.ts";

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

// ── §5 · ATTRIBUTION — A CODE ONLY RECRUITS IF ITS OWNER MAY REFER ─────────
// 🔴 THE LIABILITY THIS CLOSES. Every player was auto-minted a code, and until this
// programme every shared market/position link carried one. Those links are already out there
// and they never expire. `bindRecruit` writes `recruitedBy` ONCE and `already_bound` means it
// is never re-attributed — so a bind made today is permanent.
// ⛔ "It pays nothing right now" is not a defence: nothing pays today because the reward modes
// are gated, but the ROW is still written, and it becomes a live attribution nobody chose the
// moment the programme returns.
//
// ⛔ §5c IS THE CONTROL AND IT CARRIES THIS WHOLE SECTION. A gate that refused EVERYONE would
// pass §5a and §5b while having silently broken the agent programme. The control is what makes
// the two refusals mean something.
{
  const stamp = () => new Date().toISOString();
  let n = 0;
  const mk = async (id: string, role: "PLAYER" | "AGENT") => {
    await db.user.create({
      id, phoneE164: `+25579${String(++n).padStart(7, "0")}`, email: `${id}@t.tz`,
      passwordHash: null, passwordSalt: null, failedLoginCount: 0, lockedUntil: null,
      role, status: "ACTIVE", locale: "EN", displayName: null, dob: null, region: null,
      acceptedTermsVersion: null, acceptedTermsAt: null, marketingOptIn: false,
      twoFactorEnabled: false, avatarDataUrl: null, recruitedBy: null,
      createdAt: stamp(), updatedAt: stamp(), lastLoginAt: null, closedAt: null,
    } as never);
  };

  await mk("w5_player_ref", "PLAYER");
  await mk("w5_agent_ref", "AGENT");
  await mk("w5_recruit_a", "PLAYER");
  await mk("w5_recruit_b", "PLAYER");

  const playerCode = (await ensureAffiliateAccount("w5_player_ref")).code;
  const agentCode = (await ensureAffiliateAccount("w5_agent_ref")).code;

  // §5a · an ordinary player's code must not recruit
  const viaPlayer = await bindRecruit({ recruitUserId: "w5_recruit_a", code: playerCode });
  ok("§5a a PLAYER's code does not recruit", viaPlayer.bound === false, JSON.stringify(viaPlayer));
  ok("§5a the refusal names its reason", viaPlayer.bound === false && viaPlayer.reason === "referrer_not_eligible", JSON.stringify(viaPlayer));
  const recA = await db.user.findById("w5_recruit_a");
  ok("§5a recruitedBy is NOT written — nothing to un-attribute later", !recA?.recruitedBy, `recruitedBy=${recA?.recruitedBy}`);

  // §5b · the register ribbon must not promise what the bind will refuse
  const previewPlayer = await resolveReferralPreview(playerCode);
  ok("§5b no ribbon for a withdrawn referrer", previewPlayer === null, JSON.stringify(previewPlayer));

  // §5c · CONTROL — an AGENT's code still recruits, and still shows its ribbon
  const viaAgent = await bindRecruit({ recruitUserId: "w5_recruit_b", code: agentCode });
  ok("§5c CONTROL · an AGENT's code DOES recruit", viaAgent.bound === true, JSON.stringify(viaAgent));
  const recB = await db.user.findById("w5_recruit_b");
  ok("§5c CONTROL · recruitedBy is written for the agent", recB?.recruitedBy === "w5_agent_ref", `recruitedBy=${recB?.recruitedBy}`);
  const previewAgent = await resolveReferralPreview(agentCode);
  ok("§5c CONTROL · the ribbon renders for an agent", previewAgent !== null && typeof previewAgent?.referrerName === "string", JSON.stringify(previewAgent));
}

// ── §6–§8 · PORTED FROM THE RETIRED `test:invite-coming-soon` ──────────────
// ⭐ WHY THESE ARE HERE AND THAT SUITE IS GONE. It guarded the rule "Invite is COMING_SOON and
// every surface says so from ONE switch". That rule is superseded — invite is WITHDRAWN, and its
// switch moved from `invite-feature.ts` to `feature-state.ts` — so the suite went red on its own
// premise. But its INTENT outlived its subject, and it is the intent worth keeping:
//   · one fact, one home;
//   · ⭐ no entry point decides on its own — a POSITIONAL rule, not a file-level mention;
//   · ⭐ the page guards BEFORE it mints a code.
// ⛔ Ported rather than deleted, and ported HERE rather than left as a second suite: two guards
// over one withdrawal is exactly the drift that produces a stale one. The old §4 (coming-soon
// copy in three locales) is deliberately NOT ported — there is no coming-soon copy any more.
{
  const SRC = (process.env.KP_SRC ?? "src").replace(/\\/g, "/").replace(/\/$/, "");
  const walk = (dir: string, out: string[] = []): string[] => {
    for (const e of readdirSync(dir)) {
      const p = join(dir, e);
      if (statSync(p).isDirectory()) walk(p, out);
      else if (/\.(tsx|ts)$/.test(e)) out.push(p.replace(/\\/g, "/"));
    }
    return out;
  };
  const files = walk(SRC).map((p) => `src/${p.slice(SRC.length + 1)}`);
  const read = (rel: string) => readFileSync(`${SRC}/${rel.slice(4)}`, "utf8");

  // §6.0 · CONTROL — a walk that reached nothing reports "0 offenders" in the same words as a
  // clean sweep, so every assertion below is meaningless without this line.
  ok("§6.0 CONTROL · the walk read a plausible source tree", files.length > 300, `${files.length} files`);

  // §6 · ONE HOME for the product state.
  const declarers = files.filter((f) => /^\s*const PRODUCT_STATE\b/m.test(decomment(read(f))));
  ok("§6 exactly ONE file declares PRODUCT_STATE", declarers.length === 1, declarers.join(", ") || "NONE — the switch is gone");
  ok("§6 …and it is src/lib/feature-state.ts", declarers[0] === "src/lib/feature-state.ts", declarers[0] ?? "none");

  // §7 · COVERAGE — every player-facing link to the page sits beside the gate.
  //
  // ⛔ POSITION, NOT MENTION, and the retired suite's own header explains why: its first version
  // asked "does this file reference the switch?" and passed over both realistic mutations,
  // because severing a surface's condition leaves the file's IMPORT untouched. A guard that
  // reads the source's vocabulary cannot see a defect that leaves the vocabulary in place.
  //
  // ⚠️ THE MARKERS CHANGED WITH THE MECHANISM. The client surfaces no longer call the switch at
  // all — they receive `inviteVisible` as a prop, because the role lives on the server. So the
  // marker set is the gate function, the product state, the prop that carries its answer, and
  // the menu-row flag that routes to it.
  const NOT_ENTRY_POINTS = new Set([
    "src/lib/chat/send-message.ts",        // an AI citation href, not a nav surface
    "src/lib/server/email.ts",             // email templates, not a rendered page
    "src/lib/server/notification-service.ts",
    "src/app/admin/affiliate/actions.ts",  // admin console, not the player product
  ]);
  const linkers = files.filter((f) => decomment(read(f)).includes('"/profile/invite"'));
  ok("§7.0 the population is non-empty (a rule over zero surfaces proves nothing)", linkers.length >= 3, `${linkers.length} linkers`);

  const MARKER = /inviteIsLiveFor|inviteStateFor|PRODUCT_STATE|inviteVisible|(^|[^a-zA-Z])invite\s*:/;
  const WINDOW = 8;
  const uncovered: string[] = [];
  for (const f of linkers) {
    if (NOT_ENTRY_POINTS.has(f)) continue;
    const lines = decomment(read(f)).split("\n");
    lines.forEach((line, i) => {
      if (!line.includes('"/profile/invite"')) return;
      const near = lines.slice(Math.max(0, i - WINDOW), i + WINDOW + 1).join("\n");
      if (!MARKER.test(near)) uncovered.push(`${f}:${i + 1}`);
    });
  }
  ok("§7 ⭐ every /profile/invite link sits WITHIN 8 lines of the gate", uncovered.length === 0, uncovered.join(" · "));
  // ⛔ A stale exemption is how a coverage rule quietly stops covering.
  const staleExempt = [...NOT_ENTRY_POINTS].filter((f) => !linkers.includes(f));
  ok("§7 the exemption list holds nothing stale", staleExempt.length === 0, staleExempt.join(", "));

  // §8 · THE PAGE GUARDS BEFORE IT MINTS.
  // ⭐ The highest-value assertion the retired suite had, and it is a POSITION. The page's live
  // body hands out a real referral CODE, a LINK and a QR encoding it. A gate consulted AFTER the
  // summary is fetched still mints. Only ordering catches that.
  {
    const PAGE = "src/app/profile/invite/page.tsx";
    const body = decomment(read(PAGE));
    const guardAt = body.search(/\binviteIsLiveFor\s*\(/);
    const readAt = body.search(/\bgetPlayerReferralSummary\s*\(/);
    ok("§8 the page consults the gate at all", guardAt >= 0, "no inviteIsLiveFor() in the page");
    ok("§8 the page still has a live body to guard", readAt >= 0, "no getPlayerReferralSummary — §8 would pass vacuously");
    ok("§8 ⭐ the gate is consulted BEFORE the referral summary is fetched", guardAt >= 0 && readAt >= 0 && guardAt < readAt, `gate at ${guardAt}, read at ${readAt}`);
  }
}

console.log(`\n${pass} passed · ${fail} failed`);
if (pass === 0) { console.log("⛔ 0 passed — a zero-assertion run is a SKIPPED run, never a green one."); process.exit(1); }
process.exit(fail === 0 ? 0 : 1);
