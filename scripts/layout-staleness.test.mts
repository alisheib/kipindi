/**
 * E-70 · NO LAYOUT-COMPUTED VALUE MAY GO STALE ACROSS A SOFT NAVIGATION — AND THE PLAYER'S
 * BALANCE MUST HAVE A LIVE FEED THAT IS ACTUALLY FED.
 *
 * Ali, 2026-08-27, two reports that turned out to share a mechanism and NOT a cause:
 *   *"1 — The money amount in the top navbar is different from that inside the wallet page after
 *    playing a poll. Validate how they update. A massive bug."*
 *   *"4 — In the Legal and Responsible Gambling page, there is a Terms grid. No matter where we
 *    click, the highlighted tab is always Responsible Gambling."*
 *
 * ⭐ THE MECHANISM: in the App Router **a layout is NOT re-executed on a client-side soft
 * navigation.** It is preserved across route changes, so anything a layout computed on the last
 * HARD load stays frozen while the user clicks around inside it. `test:shell-boundary` already
 * guards ONE consequence of this (crossing between the player and admin shells must be a hard
 * navigation). This suite guards the other, larger one: **values.**
 *
 * ⛔ AND A PER-PAGE ASSERTION IS NOT COVERAGE HERE. The rule has a POPULATION — every layout that
 * decides something about the current page from a request header, and every layout that hands a
 * per-request money figure to the chrome. §1 enumerates that population **from disk**, so a
 * layout added next month joins the guard without anybody remembering to add it.
 *
 * ── 🔴 WHAT THE ENUMERATION FOUND, WHICH IS WHY IT IS AN ENUMERATION ───────────────────────
 * Three instances existed beyond the two Ali reported, and one of them sat beside a control that
 * was already correct:
 *   · `app/admin/layout.tsx` computed the BREADCRUMB TRAIL and the MOBILE nav's active key from
 *     `x-pathname`, in the layout. `admin-sidebar-nav.tsx` had re-derived the same answer from
 *     `usePathname()` since it was written — so on every admin soft navigation the sidebar
 *     highlighted the right item while the breadcrumb beside it still read the previous page.
 *   · `app/auth/layout.tsx` gated the "bounce an authed user off login/register" redirect on the
 *     stale header, so an authed officer who entered `/auth` on a route outside the bounce set
 *     (`/auth/otp`, `/auth/verify-email`, `/auth/forgot-password`) and clicked through to
 *     `/auth/login` was never bounced at all.
 *
 * ── 🔴 AND THE BALANCE WAS NOT THE SAME BUG AT ALL, WHICH ONLY MEASURING SHOWED ────────────
 * The pill was NOT stale merely because the layout froze. `WalletBalancePill` already subscribes
 * to `50pick:sse:wallet-balance`; `use-event-stream.ts` already bridges `wallet:balance` onto
 * that window event; `/api/events` already allow-lists it and scopes it per user; `event-bus.ts`
 * already fans it out across containers over Redis. **The entire live path was built, shipped and
 * hardened — and `emit("wallet:balance")` was called from `wallet-service.ts` only.**
 * `market-service.ts` mutated `Wallet.balance` at TEN sites (the bet debit and its rollback, the
 * cash-out credit, three settlement payouts, the void refunds, the orphan repair) and emitted at
 * NONE. The one event the pipeline exists for was never emitted by the code that moves money when
 * a player PLAYS. So §5 asserts the CHAIN, end to end, across five files — because every link
 * lives in a different file and deleting any one of them silently restores the bug.
 *
 *   npm run test:layout-staleness
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

let pass = 0;
const fails: string[] = [];
const ok = (n: string, c: boolean, d = "") => {
  if (c) { pass++; console.log(`  ok   ${n}`); } else { fails.push(`${n}${d ? ` — ${d}` : ""}`); console.log(`  FAIL ${n}${d ? ` — ${d}` : ""}`); }
  return c;
};

/** Read with line endings normalised — this repo is CRLF and every needle here is written LF. */
const read = (p: string) => readFileSync(p, "utf8").replace(/\r\n/g, "\n");

/** The ACTUAL read of the header, not the word. ⛔ Four files now discuss `x-pathname` in prose
 *  explaining this very bug; a guard that matched the vocabulary would fire on its own comments.
 *  A word is not a control. */
const READS_PATHNAME = /\.get\(\s*["']x-pathname["']\s*\)/;

console.log("\nE-70 · no layout-computed value may go stale across a soft navigation\n");

// ── §1 · THE POPULATION, ENUMERATED FROM DISK ──────────────────────────────────────────────
console.log("§1 · the population — every layout under src/app, walked, never listed");
function walkLayouts(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walkLayouts(p, out);
    else if (name === "layout.tsx") out.push(p.replace(/\\/g, "/"));
  }
  return out;
}
const layouts = walkLayouts("src/app").sort();
/**
 * ⛔ A RATCHET, AND IT MAY ONLY BE RAISED BY A HUMAN WHO READ THIS FILE. A new layout is a new
 * place for a per-request value to freeze, and the whole finding is that nobody thinks about that
 * when adding one. If this fails, read §2 and either fix the new layout or add it to REVIEWED
 * with a written reason.
 */
const LAYOUTS_EXPECTED = 4;
ok(`1.1 ⛔ RATCHET · ${layouts.length} layouts under src/app, and the reviewed count is ${LAYOUTS_EXPECTED}`,
   layouts.length === LAYOUTS_EXPECTED, layouts.join(" · "));
// ⭐ POSITIVE CONTROL: an empty or broken walk must not be able to satisfy 1.1's equality by
// accident, and it must not be able to satisfy §2 by having nothing to look at.
ok("1.2 ⭐ POSITIVE CONTROL · the walker really found the root layout and the three nested ones",
   layouts.includes("src/app/layout.tsx") && layouts.includes("src/app/admin/layout.tsx")
   && layouts.includes("src/app/legal/layout.tsx") && layouts.includes("src/app/auth/layout.tsx"),
   layouts.join(" · "));

// ── §2 · NO LAYOUT DECIDES THE CURRENT ROUTE FROM A REQUEST HEADER ─────────────────────────
console.log("\n§2 · a layout may not answer \"where am I?\" from the x-pathname header");
/**
 * Every entry needs a written reason, and this list may only SHRINK. ⛔ Being on it is not
 * absolution — it means the staleness is understood, bounded and mitigated somewhere a reader can
 * find.
 */
const REVIEWED: Record<string, string> = {
  "src/app/admin/layout.tsx":
    "REVIEWED · three reads remain, and none of them decides a rendered value any more. "
    + "(a) two `x-href ?? x-pathname` reads only preserve a deep-link through a redirect whose "
    + "PRIMARY line is `proxy.ts`'s `isProtected` middleware gate — a soft navigation that skips "
    + "this layout has already passed that gate. (b) `path` now feeds only FALLBACKS: the "
    + "breadcrumb and both navs re-derive from `usePathname()`. "
    + "⚠️ (c) `TOTP_EXEMPT.has(path)` is FILED, NOT FIXED — see E-229. It is latent today "
    + "(`/api/health` reports `security.adminTotp: DISABLED` on production, and A6 is parked), and "
    + "the sensitive actions behind it step up independently via `requireAdminTotp`.",
};
for (const f of layouts) {
  const src = read(f);
  const reads = READS_PATHNAME.test(src);
  if (!reads) { ok(`2.1 ${f} does not read the x-pathname header at all`, true); continue; }
  ok(`2.1 ⛔ RATCHET · ${f} reads x-pathname and is REVIEWED with a written reason`,
     !!REVIEWED[f], "add it to REVIEWED with a reason, or move the decision to the client");
}
// ⭐ THE CHECK THAT KEEPS §2 HONEST. If no reviewed file contains the read any more, the pattern
// has rotted and every 2.1 above is passing over nothing.
{
  const stillMatch = Object.keys(REVIEWED).filter((f) => READS_PATHNAME.test(read(f)));
  ok("2.2 ⭐ POSITIVE CONTROL · the READS_PATHNAME pattern can still match real source",
     stillMatch.length > 0,
     "no reviewed file matches — the pattern has rotted and every check in §2 is vacuous");
  ok("2.3 …and the reviewed list may only SHRINK — every entry still exists on disk",
     Object.keys(REVIEWED).every((f) => layouts.includes(f)),
     Object.keys(REVIEWED).filter((f) => !layouts.includes(f)).join(" · "));
}
// A server-decided active state in a layout is the legal-nav bug, whatever file it appears in.
for (const f of layouts) {
  const src = read(f);
  ok(`2.4 ${f} does not render a <Link> carrying a server-decided aria-current`,
     !(/aria-current/.test(src) && /<Link/.test(src)),
     "a layout deciding which of its own links is current freezes on soft navigation — that IS Ali's item 4");
}

// ── §3 · THE CLIENT RE-DERIVATIONS, PHRASED AS THE FIXED STATE ─────────────────────────────
// ⛔ Every assertion below states the CORRECT arrangement, never the defect. A check phrased as
// the defect goes RED the moment somebody fixes it, which this campaign has already paid for.
console.log("\n§3 · the current route is answered by the client, where it is knowable");
/**
 * ⛔ THE THIRD ENTRY IS WHY THIS IS A TABLE AND NOT A GREP, AND IT WAS ADDED BECAUSE
 * `red:layout-staleness` REPORTED A MISS RATHER THAN A CATCH. The first version asserted only
 * that `usePathname()` was CALLED — and the mutation `the-crumbs-component-trusts-its-prop`
 * leaves the call in place and simply stops using its result (`const crumbs = fallback;`). The
 * guard was green over a component that asks where it is and then ignores the answer.
 * ⭐ So each row names the expression through which the pathname must actually DECIDE the
 * rendered value. Calling the hook is vocabulary; consuming it is the control.
 */
const CLIENT_DERIVERS = [
  ["src/app/legal/legal-nav.tsx", "the legal nav Ali reported", /pathname\.startsWith\(/],
  ["src/components/admin/admin-sidebar-nav.tsx", "the admin sidebar (already correct before this work)", /activeKeyFromPath\(pathname\)/],
  ["src/components/admin/admin-crumbs.tsx", "the admin breadcrumb trail", /crumbsFromPath\(pathname\)/],
  ["src/components/admin/admin-mobile-nav.tsx", "the admin mobile drawer", /activeKeyFromPath\(pathname\)/],
] as const;
for (const [f, what, consumes] of CLIENT_DERIVERS) {
  const src = read(f);
  ok(`3.1 ${what} is a client component that reads usePathname()`,
     /^"use client"/m.test(src) && /usePathname\(\)/.test(src) && /from "next\/navigation"/.test(src),
     f);
  ok(`3.1b ${what} — the pathname is what DECIDES its rendered value, not just something it asks for`,
     consumes.test(src), `${f} — expected ${consumes.source}`);
}
{
  const legalLayout = read("src/app/legal/layout.tsx");
  ok("3.2 legal/layout.tsx hands the nav server-resolved LABELS and no route decision",
     !READS_PATHNAME.test(legalLayout) && /<LegalNav/.test(legalLayout),
     "the layout must not compute `active` — that is the frozen value");
  const adminShell = read("src/components/admin/admin-shell.tsx");
  ok("3.3 admin-shell renders <AdminCrumbs fallback=…> rather than building the trail itself",
     /<AdminCrumbs\s+fallback=/.test(adminShell) && !/aria-label="Breadcrumb"/.test(adminShell),
     "the trail must be derived where the route is known");
  ok("3.4 …and the mobile drawer is handed a fallbackKey, not an activeKey",
     /<AdminMobileNavTrigger[^>]*fallbackKey=/.test(adminShell) && !/<AdminMobileNavTrigger[^>]*\sactiveKey=/.test(adminShell),
     "naming it `activeKey` is what made a stale value look authoritative for a year");
}

{
  // ⛔ AND THE CURRENT PAGE MUST BE SAYABLE, NOT ONLY PAINTABLE. Both admin navs used to mark the
  // active item with a background and a font weight and NOTHING ELSE — so a screen reader had no
  // way to know where it was, and a probe could only ask a question about paint. The first version
  // of `qa:e70-admin` did exactly that: it matched an unrelated link and reported a FAIL against
  // a breadcrumb that was working. WCAG 1.4.1 / 2.4.8, and it is what makes §3 assertable at all.
  for (const [f, what] of [
    ["src/components/admin/admin-sidebar-nav.tsx", "the admin sidebar"],
    ["src/components/admin/admin-mobile-nav.tsx", "the admin mobile drawer"],
    ["src/app/legal/legal-nav.tsx", "the legal nav"],
  ] as const) {
    ok(`3.5 ${what} announces the current page with aria-current, not with colour alone`,
       /aria-current=\{active \? "page" : undefined\}/.test(read(f)), f);
  }
}

// ── §4 · THE AUTH BOUNCE RE-EXECUTES, AND KEEPS THE PROPERTY THAT MAKES IT SAFE ────────────
console.log("\n§4 · the bounce off login/register runs in the PAGES, which do re-execute");
{
  const authLayout = read("src/app/auth/layout.tsx");
  ok("4.1 auth/layout.tsx no longer gates anything on a request header",
     !READS_PATHNAME.test(authLayout) && !/getSession\(/.test(authLayout), "the gate moved to the pages");
  // ⚠️ ASSERT THE CALL SITE, NOT THE SYMBOL. A helper that exists and is never called is the
  // same defect as the one being fixed — this platform's recorded KYC-domain lesson.
  for (const page of ["src/app/auth/login/page.tsx", "src/app/auth/register/page.tsx"]) {
    ok(`4.2 ${page} CALLS bounceIfAuthed()`, /await bounceIfAuthed\(\)/.test(read(page)),
       "importing it is not calling it");
  }
  const helper = read("src/app/auth/bounce-authed.ts");
  // ⛔ THE PROPERTY THAT PREVENTS AN INFINITE REDIRECT LOOP, asserted because the obvious
  // "improvement" — move this to the middleware, where the pathname is always right — destroys
  // it. `proxy.ts` gates on `isSessionCookieValid` (HMAC only), and a REVOKED device still
  // carries a valid cookie while `AppShell` deliberately routes it TO /auth/login?revoked=1.
  // ⚠️ ASSERTED ON THE IMPORT AND THE CALL, NOT ON THE WORD — and this check FAILED on its first
  // run for exactly the reason it exists. `bounce-authed.ts`'s docstring NAMES
  // `isSessionCookieValid` while explaining why the middleware is the wrong home, so a
  // vocabulary match fired on the prose that documents the fix. A word is not a control.
  ok("4.3 ⛔ the bounce resolves the session (not just the cookie's signature) — the property that keeps B-13's revoked-device flow from looping for ever",
     /await getSession\(\)/.test(helper) && !/^import[^\n]*isSessionCookieValid/m.test(helper),
     "a cookie-validity gate here loops: bounce → / → revoked-redirect → login → bounce");
}

// ── §5 · THE BALANCE CHAIN, END TO END, ACROSS FIVE FILES ──────────────────────────────────
console.log("\n§5 · the top-bar balance has a live feed, and something actually feeds it");
{
  const pill = read("src/components/layout/wallet-balance-pill.tsx");
  ok("5.1 the pill subscribes to the balance event",
     /addEventListener\("50pick:sse:wallet-balance"/.test(pill), "the READ end of the chain");
  const bridge = read("src/lib/use-event-stream.ts");
  ok("5.2 the SSE hook bridges wallet:balance onto that window event",
     /"wallet:balance":\s*"50pick:sse:wallet-balance"/.test(bridge), "the BRIDGE");
  const route = read("src/app/api/events/route.ts");
  /**
   * ⛔ EACH LIST IS READ SEPARATELY, AND THAT IS A CORRECTION `red:layout-staleness` FORCED.
   * The first version counted occurrences of `"wallet:balance"` in the file and required ≥ 2 —
   * but this route's DOCSTRING names the event twice while explaining that it is user-scoped, so
   * the raw count is 4 and the mutation that deleted it from `ALL_EVENTS` left 3. The guard
   * passed over a transport that no longer forwards the event. **Counting a name in a file is
   * counting prose.** Both declarations are now extracted and each is checked on its own.
   */
  // ⚠️ The opener is the ASSIGNMENT, not the first `[`. Looking for a bare `[` found the one
  // inside the TYPE — `SseEventType[]` — and returned a one-character body, so this check failed
  // on correct source the first time it ran. A guard that cries wolf gets deleted; the harness's
  // "green before and after" mirror is what caught it.
  const listBody = (decl: string, open: string) => {
    const i = route.indexOf(decl);
    if (i < 0) return null;
    const j = route.indexOf(open, i);
    if (j < 0) return null;
    const k = route.indexOf("]", j + open.length);
    return k < 0 ? null : route.slice(j + open.length, k);
  };
  const all = listBody("const ALL_EVENTS", "= [");
  const scoped = listBody("const USER_SCOPED", "new Set([");
  ok("5.3 /api/events forwards wallet:balance — it is in ALL_EVENTS",
     !!all && /"wallet:balance"/.test(all), all === null ? "ALL_EVENTS declaration not found — this check is blind" : all.replace(/\s+/g, " "));
  ok("5.3b …and it is USER-SCOPED, so one player's balance can never reach another's stream",
     !!scoped && /"wallet:balance"/.test(scoped), scoped === null ? "USER_SCOPED declaration not found — this check is blind" : scoped.replace(/\s+/g, " "));
  const bus = read("src/lib/server/event-bus.ts");
  ok("5.4 the bus types it and accepts it off the Redis wire",
     /"wallet:balance":\s*\{ userId: string; balance: number \}/.test(bus) && /"wallet:balance",/.test(bus),
     "the FAN-OUT — without the allow-list entry a multi-container emit is dropped on arrival");

  const ms = read("src/lib/server/market-service.ts");
  ok("5.5 market-service defines the publisher",
     /async function emitWalletBalances\(/.test(ms), "the WRITE end — this is the half that did not exist");

  /**
   * ⛔ THE RATCHET THAT MATTERS, AND IT IS ABOUT THE RULE RATHER THAN A COUNT: every top-level
   * function in market-service that moves `Wallet.balance` must also publish it. The population
   * is derived by walking the file, so a new money path joins the guard by existing.
   */
  const fnStarts = [...ms.matchAll(/^(?:export )?async function ([A-Za-z0-9_]+)\s*\(/gm)]
    .map((m) => ({ name: m[1], at: m.index ?? 0 }));
  const fnAt = (i: number) => {
    let cur = "(module scope)";
    for (const f of fnStarts) { if (f.at <= i) cur = f.name; else break; }
    return cur;
  };
  const movesBalance = new Set<string>();
  for (const m of ms.matchAll(/db\.wallet\.adjust\(([^;]{0,200})/g)) {
    // `bonusBalance:` is a different column and is not what the pill renders. Strip it first so
    // it cannot satisfy the `balance:` test — the two names overlap as substrings.
    const args = m[1].replace(/bonusBalance:/g, "«bonus»:");
    if (/\bbalance:/.test(args)) movesBalance.add(fnAt(m.index ?? 0));
  }
  const publishes = new Set<string>();
  for (const m of ms.matchAll(/emitWalletBalances\(/g)) {
    const f = fnAt(m.index ?? 0);
    if (f !== "emitWalletBalances") publishes.add(f);
  }
  ok("5.6 ⭐ POSITIVE CONTROL · the walker found real money paths (an empty set would pass 5.7 vacuously)",
     movesBalance.size >= 5, `moves balance in: ${[...movesBalance].join(", ") || "(none)"}`);
  const unpublished = [...movesBalance].filter((f) => !publishes.has(f));
  ok("5.7 ⛔ RATCHET · every function that moves Wallet.balance also publishes it",
     unpublished.length === 0,
     `moves but never publishes: ${unpublished.join(", ")} · publishes: ${[...publishes].join(", ")}`);

  // ⭐ TWO INDEPENDENT PUBLISHERS. The deposit/withdrawal path emits directly and always did;
  // asserting it here means a refactor that centralises emitting cannot quietly drop one half.
  const ws = read("src/lib/server/wallet-service.ts");
  ok("5.8 wallet-service still emits the same event on the deposit / withdrawal / adjustment paths",
     (ws.match(/emit\("wallet:balance"/g) ?? []).length >= 5,
     "the money paths OUTSIDE play — this suite would otherwise green over losing them");
}

console.log(`\nlayout-staleness: ${pass} passed, ${fails.length} failed`);
if (fails.length) {
  console.error("\n✗ E-70 — a layout-computed value can go stale across a soft navigation, or the balance's live feed is broken. A layout is NOT re-executed on a client-side soft navigation; read scripts/layout-staleness.test.mts's header before 'fixing' this with force-dynamic.\n");
  for (const f of fails) console.log(`  · ${f}`);
  process.exit(1);
}
console.log("layout-staleness: OK — every current-page decision is made where the route is known, and the balance chain is whole end to end");
