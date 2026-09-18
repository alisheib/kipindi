/**
 * The case list behind `npm run test:house-bot-console`. Run by that suite in two child processes — one on Postgres,
 * one on the memory store — never on its own. The SOURCE pins run in the memory child only (they read files, not a
 * store), which is why this suite's `minPass` is a per-store pair.
 *
 * Sections:
 *   §1 the audience and the door — the gate is awaited FIRST, on the stored role, with a literal route, and an `ops`
 *      view grant written LIVE does not open the desk (rulings 300, 324, 340, 341, 380)
 *   §2 the painted view model — the strip's derived count, the four tiles, the roster's columns, the head action's
 *      sentence, every failure attributed to its own figure (rulings 303, 304, 306, 310, 314, 346, 347, 355, 361, 421)
 *   §3 THE NEUTRAL LEXICON (owner-delegated ruling 453) — nothing this section renders names the feature, in text or
 *      in an attribute, with a planted control that must fire
 *   §4 the section's source law — one route home, one read door, `force-dynamic`, no cache, no struck reader, the
 *      loader's ghosts card for card (rulings 302, 305, 312, 313, 319, 330, 333, 349, 356, 373, 403, 404, 407, 417, 422)
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { readFileSync, readdirSync, existsSync, statSync, writeFileSync, unlinkSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { decomment } from "./decomment.mts";
import { houseHits, consoleNeutralRegExp, HOUSE_WORD_SAMPLES, CONSOLE_EXTRA_SAMPLES, CONSOLE_BENIGN_SAMPLES } from "./house-bot-vocabulary.mjs";
/* ⛔ THE DECLARED MUTATIONS ARE READ BY THIS SUITE, so an `expect` that names no label it can print is reported HERE,
 * by a suite that runs every day, instead of by a drive nobody has run (§4's roll-call at the foot of this file). */
import { MUTATIONS as DECLARED_MUTATIONS } from "../anchors/house-bot-console.anchors.mjs";
import { expectDriftReport, expectDriftControl, type DeclaredMutation } from "./house-bot-expect-drift.mts";
import { loadWorld, OFFICER } from "./house-bot-world.mts";

type Any = any;
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const STORE = process.env.HB_MONEY_STORE ?? "unknown";
let pass = 0, fail = 0;
/** Every label this run emitted, so 1.422's roll-call can measure the suite instead of asserting `true`. */
const emitted: string[] = [];
const ok = (l: string, c: boolean, x = "") => {
  c ? pass++ : fail++;
  emitted.push(l);
  console.log(`${c ? "PASS" : "FAIL"} [${STORE}] ${l}${x ? ` — ${x}` : ""}`);
};
const section = (t: string) => console.log(`\n[${STORE}] ${t}`);
/**
 * The printed EXTRA, truncated so a failure line stays readable.
 * ⛔ NEVER A HAYSTACK. Used as one it silently scanned the first 260 characters of whatever it was given: three roster
 * rows serialise to ~1,400 characters, so "no row carries a net or a bare balance" was testing 19% of one row of three.
 * `all()` is the haystack; `j()` prints.
 */
const j = (v: unknown) => JSON.stringify(v)?.slice(0, 260) ?? String(v);
/** The WHOLE serialisation — the only form an assertion may scan. */
const all = (v: unknown) => JSON.stringify(v) ?? String(v);

process.env.SESSION_SECRET ??= "test-only-session-secret-32chars-aaaa";
process.env.OTP_PEPPER ??= "test-only-otp-pepper-16chars";

/* ── The section's own files, read from disk ──────────────────────────────────────────────────────────────────── */
const SECTION = "src/app/admin/desk";
const PAGE = `${SECTION}/page.tsx`;
const LAYOUT = `${SECTION}/layout.tsx`;
const LOADING = `${SECTION}/loading.tsx`;
/** ⭐ C7 step 3's own client module — NAMED, because 513's floor is a count and a count cannot notice which file left. */
const LIVE = `${SECTION}/desk-live.tsx`;
const GATE = "src/lib/server/house-console-read.ts";
const ROUTES_MODULE = "src/lib/house-bot/console-routes.ts";
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");
/**
 * ⛔ RULING 513 · THE SECTION'S POPULATION IS THE DIRECTORY, NEVER A TYPED LIST — and this is the class this project
 * keeps paying for. It was `[PAGE, LAYOUT, LOADING].filter(existsSync)`, three names typed by hand, so every file C7
 * steps 3-6 add under `src/app/admin/desk/**` — the limits form, the detail page, the wizard, every panel — would have
 * fallen OUTSIDE the guard that exists to keep the feature's name off the owner's screen, and NOTHING would have gone
 * red on the day it happened. Walked from disk instead, with the count PRINTED and a floor that only ever rises,
 * because a walk that finds nothing is the population trap in its purest form.
 * ⛔ AND A FILE THE SCANNER CANNOT PARSE IS REPORTED, NOT SKIPPED. `domLiterals` parses TypeScript; a `.css` or `.json`
 * dropped into the section would otherwise be silently outside the lexicon while sitting inside the route. The walk
 * collects EVERY file; `sectionUnscannable` is what 4.453 refuses.
 */
const walkSection = (dir: string, out: string[] = []): string[] => {
  for (const entry of readdirSync(join(ROOT, dir)).sort()) {
    const rel = `${dir}/${entry}`;
    if (statSync(join(ROOT, rel)).isDirectory()) walkSection(rel, out);
    else out.push(rel);
  }
  return out;
};
const sectionWalk = () => (existsSync(join(ROOT, SECTION)) ? walkSection(SECTION) : []);
const isScannable = (rel: string) => rel.endsWith(".ts") || rel.endsWith(".tsx");
const sectionAllFiles = sectionWalk();
const sectionFiles = sectionAllFiles.filter(isScannable);
const sectionUnscannable = sectionAllFiles.filter((f) => !isScannable(f));
/**
 * ⛔ THE FILES 4.453 WALKS, AND THE GATED READER IS ONE OF THEM. Almost every painted SENTENCE of this section is
 * written in `house-console-read.ts` (the module header says so: "THE COPY IS BUILT HERE, NOT IN THE PAGE"), and the
 * first pass walked only `src/app/admin/desk/**` — so the schema sentence, the three empty states, the unset-limit
 * delta and the unreadable sentence were outside 453's source guard entirely. 453 exempts IDENTIFIERS and IMPORTS,
 * which `domLiterals` does by construction, so adding a server-only module costs nothing and closes the hole.
 */
const lexiconFiles = [...sectionFiles, GATE];
/** The detail route's page — step 4's. Its EXISTENCE is what decides whether a row may carry a way-out link (432(h)). */
const DETAIL_PAGE = `${SECTION}/[id]/page.tsx`;

/**
 * ⛔ EVERY STRING OF A FILE THAT CAN REACH THE DOM, and only those (ruling 453). A module specifier is NOT one
 * — the gated readers are named `houseRosterForConsole` and they live behind `@/lib/house-bot/…`, both of which the
 * ruling exempts by name, because a server-only identifier's client-reachability is `verify:house-bot-bundle`'s job.
 * Comments are not literals, so the AST walk excludes them by construction rather than by a stripper.
 *
 * ⛔ JSX TEXT IS COLLECTED TOO, AND ITS ABSENCE WAS THIS GUARD'S LARGEST HOLE. `ts.isStringLiteral` does not match a
 * `JsxText` node, so every string written as ELEMENT CONTENT was invisible to 453's guard: measured on `page.tsx`,
 * 77 literals were walked and 17 JSX prose strings were not — "Designate an account", "Master switch", all four
 * auto-off Callout bodies, the schema Callout body, every table header and the way-out link. A `<th>House stake</th>`
 * or a Callout body saying "the bot" shipped green, and the planted control could not reveal it because all three of
 * its plants were ATTRIBUTE literals. 4.453.c1 now plants in JSX TEXT as well.
 */
function domLiterals(rel: string, code: string): string[] {
  const sf = ts.createSourceFile(rel, code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const out: string[] = [];
  const isSpecifier = (n: ts.Node): boolean => {
    const p = n.parent;
    if (!p) return false;
    if (ts.isImportDeclaration(p) || ts.isExportDeclaration(p) || ts.isImportTypeNode(p) || ts.isModuleDeclaration(p)) return true;
    if (ts.isExternalModuleReference(p)) return true;
    if (ts.isCallExpression(p) && p.expression.kind === ts.SyntaxKind.ImportKeyword) return true;
    return false;
  };
  const walk = (n: ts.Node) => {
    if ((ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) && !isSpecifier(n)) out.push(n.text);
    if (ts.isTemplateExpression(n)) {
      out.push(n.head.text, ...n.templateSpans.map((s) => s.literal.text));
    }
    if (n.kind === ts.SyntaxKind.JsxText) {
      const t = (n as ts.JsxText).text.replace(/\s+/g, " ").trim();
      if (t) out.push(t);
    }
    ts.forEachChild(n, walk);
  };
  walk(sf);
  return out;
}

/** 453's four forbidden words, on top of the SHARED vocabulary — composed in the vocabulary module, never here (ruling 175). */
const NEUTRAL = consoleNeutralRegExp();

/**
 * ⛔ EVERY PAINTED STATE §2 PRODUCES, KEPT FOR §3 TO SCAN. Ruling 453 is a hard rule on everything the console
 * renders, and the first version of §3 scanned ONE state — the one §2 happened to leave behind (switch ON, three rows,
 * every limit set, nothing rejecting). So the strings most likely to carry a feature word were never scanned at all:
 * the OFF sentence, the three "Not set" deltas, the `unavailable` copy, the roster-full sentence and all three
 * empty-state title/body pairs, each of which is `null` in that one state. The declared mutation `453-off` could not
 * even turn its named case red, because the OFF sentence is not painted in the ON state.
 */
const STATES: Array<[string, Any]> = [];

/* ════════════════════════════════════════════════════════════════════════════════════════════════════════════════
 * §1 · the audience and the door
 * ════════════════════════════════════════════════════════════════════════════════════════════════════════════════ */

const w = await loadWorld();
const GATEM: Any = await import("../../src/lib/server/house-console-read.ts");
const ROLES: Any = await import("../../src/lib/server/roles.ts");
const RBAC: Any = await import("../../src/lib/server/rbac.ts");
const R: Any = await import("../../src/lib/house-bot/rules.ts");
const CR: Any = await import("../../src/lib/house-bot/console-routes.ts");
const D: Any = await import("../../src/lib/server/house-bot/designation.ts");
const SD: Any = await import("../../src/lib/server/house-bot/status-display.ts");
const { formatTzs, formatTzsCompact, formatNumber }: Any = await import("../../src/lib/utils.ts");

/* ⛔ THE STORE MUST BE NAMED, not merely agreed with. `HB_MONEY_STORE` unset gave `STORE = "unknown"`, and
 * `w.onPostgres === ("unknown" === "postgres")` is `false === false` — so an UNLABELLED child printed ALL PASS while
 * skipping §4 entirely (the whole source law, 453's guard included), because §4 runs only when STORE is "memory". */
ok(`0.store · the store is NAMED and the world agrees (${STORE})`,
  (STORE === "memory" || STORE === "postgres") && w.onPostgres === (STORE === "postgres"), `onPostgres=${w.onPostgres}`);
await w.user({ id: OFFICER, role: "ADMIN" });
await w.limits();

/* ⛔ THE BEHAVIOURAL REGION (§1 + §2) IS GUARDED, BECAUSE A THROW IN IT USED TO BLIND EVERY SECTION BELOW.
 * MEASURED, 2026-09-18, with the declared `355-all` defect injected (`Promise.allSettled` → `Promise.all`): every
 * settled result loses its `status` field, the whole view model collapses to nulls, and §2 died on a `TypeError` at
 * the first roster row — so §3's lexicon scan and §4's entire source law never ran, and the ONE assertion that names
 * that defect (1.355's settling-combinator pin, which lives in §4) never printed. The suite was red, but on three
 * unrelated labels: what the declaration file calls WRONG-ASSERTION, and a guard that goes red for the wrong reason
 * will go green for the wrong reason too. A throw is now REPORTED as a failure of its own and the static guards below
 * still run. ⚠️ The body keeps its own indentation: re-indenting 500 lines would bury the one line that changed. */
try {
section("§1 · the audience, decided on the STORED role, through the gate");
{
  /* 1.341 · every role, and the two non-staff ones, against BOTH belts. ⛔ The `ops` view grant is WRITTEN for a
   * non-Owner role FIRST — that is the whole point: `ops` is DB-backed and the Owner can grant it live at
   * /admin/roles with no redeploy, so a gate resting on the domain would open here. */
  RBAC.__resetGrantsForTest?.();
  await RBAC.setRoleGrant("SUPPORT", "ops", true, true, "tester");
  const ids: Array<[string, string]> = [];
  for (const role of ["ADMIN", "COMPLIANCE", "MODERATOR", "FINANCE", "GROWTH", "AUDITOR", "SUPPORT", "PLAYER", "AGENT"]) {
    ids.push([role, await w.user({ role })]);
  }
  const verdicts: Record<string, boolean> = {};
  for (const [role, id] of ids) verdicts[role] = await GATEM.houseConsoleAudience(id, "/admin/desk");
  ok("1.341 · only ADMIN is in the desk's audience — with a live `ops` view grant written for SUPPORT first",
    verdicts.ADMIN === true && Object.entries(verdicts).filter(([r]) => r !== "ADMIN").every(([, v]) => v === false), j(verdicts));
  ok("1.341 · …and SUPPORT really did hold the `ops` view grant while that was measured", await RBAC.canView("SUPPORT", "ops"));

  const deep = await GATEM.houseConsoleAudience(ids[0][1], "/admin/desk/hb_0123456789abcdef01234567");
  const deepSupport = await GATEM.houseConsoleAudience(ids.find(([r]) => r === "SUPPORT")![1], "/admin/desk/hb_0123456789abcdef01234567");
  ok("1.341 · the record route inherits the verdict — true for ADMIN, false for a granted SUPPORT", deep === true && deepSupport === false, j({ deep, deepSupport }));

  ok("1.341 · a missing account is not in the audience (fail closed)", (await GATEM.houseConsoleAudience("usr_does_not_exist", "/admin/desk")) === false);
  ok("1.341 · a null viewer is not in the audience", (await GATEM.houseConsoleAudience(null, "/admin/desk")) === false);

  /* 1.341.c1 · THE SECOND BELT, MEASURED ON ITS OWN. ⚠️ It cannot be measured by patching `isOwnerOnlyPath` away: an
   * ESM namespace object is read-only, so the two belts can only be separated by measuring the gate's own predicate
   * and the ORDER it is consulted in. Both are asserted, because either alone could pass while the belt did nothing:
   * the predicate could be right and never called, or the call could be there over a predicate that answers nothing. */
  ok("1.341.c1 · the gate's OWN prefix belt answers for the section and everything under it, and for nothing else",
    GATEM.HOUSE_CONSOLE_PREFIX === "/admin/desk"
      && ["/admin/desk", "/admin/desk/new", "/admin/desk/hb_0123456789abcdef01234567"].every((p) => GATEM.isHouseConsoleRoute(p) === true)
      && ["/admin/deskx", "/admin/house", "/admin/staff", "/admin", "/desk"].every((p) => GATEM.isHouseConsoleRoute(p) === false),
    GATEM.HOUSE_CONSOLE_PREFIX);
  ok("1.341 · …and the belt is consulted BEFORE `isOwnerOnlyPath` and before `canView`, so losing the roles.ts entry cannot widen it",
    (() => {
      const g = read(GATE);
      const belt = g.indexOf("if (isHouseConsoleRoute(route)) return isAdmin(viewer.role);");
      const ownerOnly = g.indexOf("if (isOwnerOnlyPath(route)) return isAdmin(viewer.role);");
      const canView = g.indexOf("return (await canView(viewer.role, domainForPath(route))) === true;");
      return belt > 0 && ownerOnly > belt && canView > belt;
    })(), "");
  ok("1.341 · both belts really are in place today — the roles.ts entry AND the gate's own prefix",
    ROLES.isOwnerOnlyPath("/admin/desk") === true && (ROLES.OWNER_ONLY_PREFIXES as readonly string[]).includes("/admin/desk"), "");
  await RBAC.resetRoleGrantsToDefaults();
  ok("1.341 · teardown · the `ops` grant is back to its default", !(await RBAC.canView("SUPPORT", "ops")));

  /* 1.300(b) · a viewer outside the audience makes the reader do NOTHING: `null` out, and zero store calls. */
  const player = ids.find(([r]) => r === "PLAYER")![1];
  const realList = w.dal.houseBotStore.listNonRemoved;
  const realDay = w.dal.houseBookStore.dayRows;
  const realCtl = w.dal.houseBotControlStore.get;
  let calls = 0;
  try {
    w.dal.houseBotStore.listNonRemoved = (...a: Any[]) => { calls++; return realList.apply(w.dal.houseBotStore, a as Any); };
    w.dal.houseBookStore.dayRows = (...a: Any[]) => { calls++; return realDay.apply(w.dal.houseBookStore, a as Any); };
    w.dal.houseBotControlStore.get = (...a: Any[]) => { calls++; return realCtl.apply(w.dal.houseBotControlStore, a as Any); };
    const refused = await GATEM.houseRosterForConsole(player, "/admin/desk");
    ok("1.300 · the reader refuses a PLAYER with `null` and performs ZERO store calls — the verdict comes before the reads",
      refused === null && calls === 0, j({ refused, calls }));
    calls = 0;
    const mine = await GATEM.houseRosterForConsole(OFFICER, "/admin/desk");
    ok("1.300 · …and for the Owner it performs its reads and returns a view model", mine !== null && calls >= 3, j({ got: mine !== null, calls }));
  } finally {
    w.dal.houseBotStore.listNonRemoved = realList;
    w.dal.houseBookStore.dayRows = realDay;
    w.dal.houseBotControlStore.get = realCtl;
  }
}

/* ════════════════════════════════════════════════════════════════════════════════════════════════════════════════
 * §2 · the painted view model
 * ════════════════════════════════════════════════════════════════════════════════════════════════════════════════ */

section("§2 · the strip, the band, the roster and every failure");
{
  /* 1.306 · THE COUNT IS DERIVED, and the expected number is read from `REQUIRED_FOR_MASTER_ON.length` in the test —
   * never typed — so a ninth field added to that list cannot silently pass. */
  const ALL = R.REQUIRED_FOR_MASTER_ON as readonly string[];
  ok("1.306 · `REQUIRED_FOR_MASTER_ON` is the list the count is derived over, and it is longer than the six money globals",
    ALL.length >= 8 && ALL.includes("gCounterPerPlayerPerDay") && ALL.includes("gCounterPerPlayerTzsPerDay"), `${ALL.length}: ${ALL.join(",")}`);

  await w.limits(Object.fromEntries(ALL.map((f) => [f, null])) as Any);
  let v = await GATEM.houseRosterForConsole(OFFICER, "/admin/desk");
  ok(`1.306 · with every required limit unset the strip counts ${ALL.length}`, v.unsetRequired === ALL.length, j({ got: v.unsetRequired, want: ALL.length }));

  /* ⛔ THE CASE THAT IS RED UNDER THE DRAFT'S SIX-FIELD LIST: only the two COUNTERPARTY limits unset. A six-field
   * count renders 0, the strip says nothing, and the ON press fails with no explanation on screen. */
  await w.limits({ gCounterPerPlayerPerDay: null, gCounterPerPlayerTzsPerDay: null });
  v = await GATEM.houseRosterForConsole(OFFICER, "/admin/desk");
  ok("1.306 · with ONLY the two counterparty limits unset it counts 2, not nothing", v.unsetRequired === 2, j({ got: v.unsetRequired }));

  await w.limits({ gCapDailyStakeTzs: null, gCapDailyLossTzs: null });
  v = await GATEM.houseRosterForConsole(OFFICER, "/admin/desk");
  ok("1.306 · with exactly two required limits unset it counts 2", v.unsetRequired === 2, j({ got: v.unsetRequired }));

  /* 1.304 · an unset money cap renders a BLOCK, never a zero — and the band's text then carries no TZS at all. */
  await w.limits({ gCapDailyStakeTzs: null, gCapDailyLossTzs: null, gCapOpenExposureTzs: null });
  v = await GATEM.houseRosterForConsole(OFFICER, "/admin/desk");
  const moneyTiles = v.tiles.slice(0, 3);
  ok("1.304 · all three money limits NULL renders three 'Not set' tiles whose text carries no TZS",
    moneyTiles.every((t: Any) => t.value === "Not set") && !all(moneyTiles).includes("TZS"), j(moneyTiles));
  /* ⛔ AND THE DELTA CARRIES NO ARROW (ruling 432(i)): `AdminKpi`'s delta slot is a plain `<span>`, never a link, so
   * "set it on Limits →" pointed at a control that does not exist on that rung and at a tab with no panel. */
  ok("1.304 · …and each names the CONSEQUENCE, never a used amount beside no limit and never an arrow to nowhere",
    moneyTiles.every((t: Any) => typeof t.delta === "string" && /nothing can be staked/.test(t.delta) && !t.delta.includes("→")),
    j(moneyTiles.map((t: Any) => t.delta)));
  STATES.push(["limits-unset", v]);

  await w.limits();
  /* 1.303 / 1.404 · the band is FOUR tiles, one amount each, the limit named in the delta as a proportion with NO
   * second amount, and the fourth is the count pair. */
  v = await GATEM.houseRosterForConsole(OFFICER, "/admin/desk");
  ok("1.303 · four tiles, in order, labelled as the neutral lexicon requires",
    v.tiles.length === 4 && j(v.tiles.map((t: Any) => t.label)) === j(["Stake today", "Loss today", "Open exposure", "Accounts"]), j(v.tiles.map((t: Any) => t.label)));
  ok("1.404 · no delta carries a currency-prefixed amount, and no tile carries two amounts",
    v.tiles.every((t: Any) => !/TZS\s*[\d,]/.test(String(t.delta ?? ""))) && v.tiles.every((t: Any) => (String(t.value).match(/TZS/g) ?? []).length <= 1), j(v.tiles));
  ok("1.303 · the band's text contains no net, no lifetime and no bare balance",
    !/\bnet\b|\blifetime\b|\bbalance\b/i.test(all(v.tiles)), j(v.tiles));

  /* 1.346 / 1.347 · ONE roster read, ZERO countLive, ONE day read, ONE exposure read — and the band's exposure is
   * the arithmetic SUM of the rows it renders, asserted as an IDENTITY rather than against a literal. */
  const b1 = await w.bot({ caps: { capDailyLossTzs: 50_000, capOpenExposureTzs: 300_000, freqMaxPerDay: 200 } });
  const b2 = await w.bot({ caps: { capDailyLossTzs: null, capOpenExposureTzs: 300_000, freqMaxPerDay: null } });
  const b3 = await w.bot({ caps: { capDailyLossTzs: 50_000, capOpenExposureTzs: 300_000, freqMaxPerDay: 200 } });
  await w.dal.houseBotStore.setStatus(b2.botId, { from: ["ACTIVE"], to: "PAUSED", pauseReason: "MANUAL", pausedFromStatus: "ACTIVE" });
  await w.dal.houseBotStore.setStatus(b3.botId, { from: ["ACTIVE"], to: "AUTO_PAUSED", pauseReason: "WALLET_FROZEN", pausedFromStatus: "ACTIVE" });
  const gone = await w.bot();
  await w.dal.houseBotStore.setStatus(gone.botId, { from: ["ACTIVE"], to: "REMOVED", pauseReason: null, pausedFromStatus: null, removal: { byId: OFFICER, reason: "fixture", cause: "MANUAL" } });

  const spy = { list: 0, live: 0, day: 0, exposure: 0, wallet: 0, user: 0 };
  const orig = {
    list: w.dal.houseBotStore.listNonRemoved, live: w.dal.houseBotStore.countLive,
    day: w.dal.houseBookStore.dayRows, exposure: w.dal.houseBookStore.openExposure, wallet: w.db.wallet.findByUserId,
    user: w.db.user.findById,
  };
  try {
    w.dal.houseBotStore.listNonRemoved = (...a: Any[]) => { spy.list++; return orig.list.apply(w.dal.houseBotStore, a as Any); };
    w.dal.houseBotStore.countLive = (...a: Any[]) => { spy.live++; return orig.live.apply(w.dal.houseBotStore, a as Any); };
    w.dal.houseBookStore.dayRows = (...a: Any[]) => { spy.day++; return orig.day.apply(w.dal.houseBookStore, a as Any); };
    w.dal.houseBookStore.openExposure = (...a: Any[]) => { spy.exposure++; return orig.exposure.apply(w.dal.houseBookStore, a as Any); };
    w.db.wallet.findByUserId = (...a: Any[]) => { spy.wallet++; return orig.wallet.apply(w.db.wallet, a as Any); };
    /* ⛔ THE POSITIVE CONTROL FOR THE WALLET ZERO, ON THE SAME OBJECT AND THROUGH THE SAME RENDER (see below). */
    w.db.user.findById = (...a: Any[]) => { spy.user++; return orig.user.apply(w.db.user, a as Any); };
    v = await GATEM.houseRosterForConsole(OFFICER, "/admin/desk");
  } finally {
    w.dal.houseBotStore.listNonRemoved = orig.list; w.dal.houseBotStore.countLive = orig.live;
    w.dal.houseBookStore.dayRows = orig.day; w.dal.houseBookStore.openExposure = orig.exposure; w.db.wallet.findByUserId = orig.wallet;
    w.db.user.findById = orig.user;
  }
  ok("1.346 · exactly ONE `listNonRemoved` and ZERO `countLive` per render — two reads of one question can disagree inside a render",
    spy.list === 1 && spy.live === 0, j(spy));
  ok("1.347 · exactly ONE day read and ONE exposure read per render", spy.day === 1 && spy.exposure === 1, j(spy));
  ok("1.356 · ZERO wallet reads — the roster paints no balance and no floor state, so it reads none",
    spy.wallet === 0, j(spy));
  /* ⛔ THE POSITIVE CONTROL FOR THE TWO ZEROS, and without it they were UNPROVEN NEGATIVES: nothing in the run showed
   * that those two spies CAN increment, so a patch that never reached the module under test — the documented
   * double-load trap, where a module reached by a second specifier loads twice — would read exactly like compliance.
   * The three `=== 1` spies prove themselves; these two could not.
   *
   * ⛔ AND THE FIRST CONTROL WAS A TAUTOLOGY, WHICH IS WORSE THAN NO CONTROL. It patched the two handles and then
   * called THEM DIRECTLY — `await w.db.wallet.findByUserId(...)` — so it asserted a counter it had just incremented
   * itself, through no product code at all. The hazard it names is specifically that `w.db` may not be the object
   * `house-console-read.ts` imports (`w` reaches it as `../../src/lib/server/store.ts`, the gate as `./store`), and
   * calling the patch by hand cannot tell those two objects apart. The discriminating control is a read the RENDER
   * itself performs on the SAME object: `houseConsoleAudience` calls `db.user.findById(viewerUserId)` on every reader
   * call, so `spy.user >= 1` measured through the render above proves `w.db` IS the gate's `db` — and only then is
   * `spy.wallet === 0` on that same object a measurement rather than an unreached patch.
   * `countLive` lives on `w.dal.houseBotStore`, whose reachability the `spy.list === 1` above already proves. */
  ok("1.346 / 1.356 · CONTROL · the render itself fired a `db.user` read through the very object the wallet spy watches — so `wallet === 0` is a measurement on the module under test, not an unreached patch",
    spy.user >= 1 && spy.list === 1, j(spy));
  {
    const before = spy.live;
    const orig2 = w.dal.houseBotStore.countLive;
    try {
      w.dal.houseBotStore.countLive = (...a: Any[]) => { spy.live++; return orig2.apply(w.dal.houseBotStore, a as Any); };
      await w.dal.houseBotStore.countLive();
    } finally { w.dal.houseBotStore.countLive = orig2; }
    ok("1.346 · CONTROL · the `countLive` spy CAN fire through the same handle the render reads, so its zero above is a measurement",
      spy.live === before + 1, j(spy));
  }

  /* ⛔ KEYED BY ID, NEVER BY POSITION. Both twins order on `designatedAt` alone with no id tie-break, and this fixture
   * designates b1/b2/b3 back to back: two rows sharing an instant come back in an arbitrary order on Postgres while
   * memory's `Array.prototype.sort` is stable, so a positional expectation would report a false failure of the status
   * map on one store only. The ORDER is asserted on its own, below, over the ids the fixture created in sequence. */
  const byId = new Map<string, Any>(v.rows.map((r: Any) => [r.id, r]));
  ok("1.310 · the roster holds every non-REMOVED account and the REMOVED one is ABSENT",
    v.rows.length === 3 && !byId.has(gone.botId) && [b1, b2, b3].every((b: Any) => byId.has(b.botId)),
    j(v.rows.map((r: Any) => [r.id, r.statusWord])));
  /* ⛔ THE ORDER IS ASSERTED AGAINST THE STORED INSTANT, NOT AGAINST THE FIXTURE'S CREATION SEQUENCE, and the comment
   * six lines above is why: both twins order on `designatedAt` alone with NO id tie-break, so two rows sharing a
   * millisecond come back in an arbitrary order on Postgres while memory's `Array.prototype.sort` is stable. A
   * positional expectation over the creation sequence is therefore a two-store flake dressed as an ordering failure —
   * the file said so and then asserted the position anyway. Non-decreasing in the stored instant is the only order
   * BOTH twins define, it still catches a reversed sort, and its own precondition (the instants are not all equal,
   * or there is nothing to order) is asserted beside it instead of assumed. */
  const stampOf = new Map<string, number>(await Promise.all([b1, b2, b3].map(async (b: Any): Promise<[string, number]> =>
    [b.botId, Date.parse((await w.dal.houseBotStore.get(b.botId)).designatedAt)])));
  const renderedStamps = v.rows.map((r: Any) => stampOf.get(r.id) ?? Number.NaN);
  ok("1.310 · …oldest first — the rendered order is non-decreasing in the stored `designatedAt`, the only order both twins define",
    renderedStamps.every((t: number, i: number) => Number.isFinite(t) && (i === 0 || renderedStamps[i - 1] <= t)),
    j({ ids: v.rows.map((r: Any) => r.id), stamps: renderedStamps }));
  ok("1.310 · CONTROL · the fixture's three instants are not all equal, so the order above has something to decide",
    new Set([...stampOf.values()]).size >= 2, j([...stampOf.values()]));
  ok("1.310 · the three statuses render the ONE display map's word and chip, never a word typed beside a chip",
    ([[b1, "ACTIVE"], [b2, "PAUSED"], [b3, "AUTO_PAUSED"]] as Array<[Any, string]>).every(([b, s]) =>
      byId.get(b.botId)!.statusWord === SD.HOUSE_BOT_STATUS_DISPLAY[s].word
      && byId.get(b.botId)!.statusChip === SD.HOUSE_BOT_STATUS_DISPLAY[s].chip),
    j(v.rows.map((r: Any) => [r.statusWord, r.statusChip])));
  ok("1.310 · no row carries a net or a bare balance, and each holder is a handle, never a name or a phone",
    v.rows.every((r: Any) => /^Player #/.test(r.handle)) && !/\bnet\b|\bbalance\b/i.test(all(v.rows)), j(v.rows.map((r: Any) => r.handle)));
  /* ⛔ AND NO ROW CARRIES A WAY-OUT HREF WHILE THE PAGE IT OPENS IS UNBUILT (ruling 432(h)). The view model's own
   * `href` field is gone with the column, so a later step cannot re-render a 404 link by accident. */
  /* ⛔ PER ROW, IN BOTH DIRECTIONS. The first form was `existsSync(page) === rows.every(hasHref)`, which — while the
   * page is absent — is satisfied by ONE href-less row out of three: a reader that put a live `href` on SOME rows,
   * which is exactly the 404-link defect 432(h) exists to refuse, passed it. */
  ok("1.310 / 432(h) · EVERY row carries an `href` exactly when the detail page exists — today not one of them does",
    v.rows.length >= 3 && v.rows.every((r: Any) => (typeof r.href === "string") === existsSync(join(ROOT, DETAIL_PAGE))),
    j({ detailPage: existsSync(join(ROOT, DETAIL_PAGE)), hrefs: v.rows.filter((r: Any) => r.href != null).length }));

  /* ⛔ ONE UNKNOWN, ONE TREATMENT (ruling 416 / §C2), AND NO CASE HAD EVER PRODUCED THIS CELL. A rule set the reader
   * cannot parse rendered the words "couldn't read" — lowercase, a sentence fragment, mid-table, in
   * `text-text-secondary` — while a money or count read that FAILED in the SAME ROW rendered the kit's em dash in
   * `text-text-tertiary`. Two paints for one class of unknown inside one row. Every other failure string on this
   * page is sentence-cased ("Couldn't load the roster", "COULDN'T COMPUTE"), and this cell appears in no captured
   * tile at any width, so nobody had looked at it. */
  {
    const realList4 = w.dal.houseBotStore.listNonRemoved;
    let unparsed: Any;
    try {
      w.dal.houseBotStore.listNonRemoved = async (...a: Any[]) => {
        const rows = await realList4.apply(w.dal.houseBotStore, a as Any);
        /* A rule set from a FUTURE schema: `parseHouseBotRules` answers `{ ok: false, code: "RULES_FROM_FUTURE" }`,
         * which is the branch the Products cell paints and which no fixture had ever reached. */
        return rows.map((b: Any, i: number) => (i === 0 ? { ...b, rules: { schemaVersion: 9_999 } } : b));
      };
      unparsed = await GATEM.houseRosterForConsole(OFFICER, "/admin/desk");
    } finally { w.dal.houseBotStore.listNonRemoved = realList4; }
    ok("1.310 · 416 · a rule set the reader cannot parse renders ONE sentence-cased unknown, the way every other failure string on this page reads",
      unparsed.rows.length === 3 && unparsed.rows[0].products === "Couldn't read"
        && unparsed.rows.slice(1).every((r: Any) => r.products !== "Couldn't read" && r.products.length > 0),
      j(unparsed.rows.map((r: Any) => r.products)));
    ok("1.310 · 416 · CONTROL · the plant really did reach the parser — the other two rows still name their products, so the cell above is the parse failure and not an empty roster",
      unparsed.rows.slice(1).some((r: Any) => /Up|Poll|None/i.test(r.products)), j(unparsed.rows.map((r: Any) => r.products)));
  }
  ok("1.310 · an account with NO stakes today reads used TZS 0 of its limit — a documented zero, not a failure",
    byId.get(b1.botId)!.lossCell.text === `used ${formatTzs(0)} of ${formatTzs(50_000)}`
      && byId.get(b1.botId)!.lossCell.used === `used ${formatTzs(0)}` && byId.get(b1.botId)!.lossCell.limit === `of ${formatTzs(50_000)}`,
    j(byId.get(b1.botId)));
  /* ⛔ AND THE TWO HALVES THE PAGE LAYS OUT ARE THE FIGURE AND ITS WORD, SEPARATELY (ruling 409): only the FIGURE may
   * sit in an `.amount` span, so the reader hands the word and the figure apart and the page never puts prose in the
   * money face — nor makes the unbreakable unit wider than the figure it protects (432(b)). */
  ok("1.409 · each usage half carries its connective WORD apart from its FIGURE, and the halves rebuild `text` exactly",
    (() => {
      const c = byId.get(b1.botId)!.lossCell;
      return c.money === true && c.halves.length === 2
        && c.halves[0].word === "used" && c.halves[0].figure === formatTzs(0) && c.halves[0].suffix === ""
        && c.halves[1].word === "of" && c.halves[1].figure === formatTzs(50_000)
        && c.halves.map((h: Any) => `${h.word} ${h.figure}${h.suffix}`).join(" ") === c.text;
    })(), j(byId.get(b1.botId)!.lossCell));
  ok("1.409 · a COUNT usage is not money: its halves carry the noun as a WORD and the cell is not marked money",
    (() => {
      const c = byId.get(b1.botId)!.betsCell;
      return c.money === false && c.halves.length === 2 && c.halves[1].suffix === " bets"
        && !/TZS/.test(c.text) && c.halves.every((h: Any) => /^[\d,]+$/.test(h.figure));
    })(), j(byId.get(b1.botId)!.betsCell));
  ok("1.310 · an account whose loss limit is UNSET reads 'Not set', never a bar at zero, and hands the page NO figure to paint",
    byId.get(b2.botId)!.lossCell.text === "Not set" && byId.get(b2.botId)!.lossCell.limit === null
      && byId.get(b2.botId)!.lossCell.halves.length === 0 && byId.get(b2.botId)!.betsCell.text === "Not set", j(byId.get(b2.botId)));

  /* 1.361 · ONE grammar for every figure the console formats. */
  /* ⛔ THE LIMIT HALF IS MANDATORY. It used to be optional (`( of …)?`), which let `used TZS 5,000` with no limit
   * beside it pass — a BARE MONEY FIGURE, the one thing ruling 266 forbids and the thing this case exists to catch.
   * The count noun did not need that looseness; it has its own suffix group. */
  const USAGE = /^used (TZS [\d,]+|\d[\d,]*) of (TZS [\d,]+|\d[\d,]*)( bets)?$/;
  const cells = v.rows.flatMap((r: Any) => [r.lossCell, r.exposureCell, r.betsCell]).map((c: Any) => c.text).filter((c: string) => c !== "Not set" && c !== "—");
  ok("1.361 · every usage cell matches the one fixed grammar — lower-case 'used', no percentage, no 'remaining', no arrow",
    cells.length >= 4 && cells.every((c: string) => USAGE.test(c)), j(cells));

  /* ⛔ 1.347's IDENTITY, WITH REAL MONEY IN IT, AND OVER THE POPULATION THE GATE MEASURES (ruling 432(l)).
   *
   * Two defects the first version could not see. (a) It was `0 === 0`: no case in the suite ever produced a non-zero
   * usage, so `stakeUsed`, `lossUsed`, `exposureUsed` and `moneyTile`'s floored proportion were wholly unmeasured on
   * both stores — `const exposureUsed = 0;` would have left it green. Worse, the identity it asserted was
   * arithmetically impossible once usage existed, because the band's value is `formatTzsCompact` ("TZS 17K") and a
   * row is a full figure. (b) It pinned the WRONG POPULATION as the expected answer: the band's three figures measure
   * the three GLOBAL limits, and `cap-precheck.ts` reads those over EVERY bot (`houseDayBook(day, null)`,
   * `houseOpenExposure(null)` — neither filters REMOVED). A REMOVED account's stakes and open positions still count
   * against the limit that refuses the next stake, so a band folded over `listNonRemoved()` reads LOWER than the gate
   * and the owner is told "40%" while every stake is refused at 100%.
   *
   * So: the day and exposure reads are planted with real money for a RENDERED account AND for the REMOVED one, and
   * the band is asserted equal to the total over BOTH — the gate's own population — while the per-row cells stay
   * per-account and are asserted on their painted strings. */
  {
    /* Global limits small enough that a proportion is meaningful — the defaults are 900,000,000, which floors to 0%.
     * ⛔ AND THE EXPOSURE CAP IS 21,001, NOT A ROUND NUMBER, ON PURPOSE (see 1.404 below): against 21,000 of usage a
     * round cap made floor and round agree to the character, so `Math.floor` → `Math.round` was invisible. */
    await w.limits({ gCapDailyStakeTzs: 100_000, gCapDailyLossTzs: 100_000, gCapOpenExposureTzs: 21_001 });
    const realDayP = w.dal.houseBookStore.dayRows;
    const realExpP = w.dal.houseBookStore.openExposure;
    let planted: Any;
    try {
      w.dal.houseBookStore.dayRows = async () => [
        { houseBotId: b1.botId, bets: 3, staked: 40_000, openStake: 12_000, settledStake: 28_000, returned: 11_000 },
        { houseBotId: gone.botId, bets: 1, staked: 9_000, openStake: 9_000, settledStake: 0, returned: 0 },
      ];
      w.dal.houseBookStore.openExposure = async () => [
        { houseBotId: b1.botId, openStakeTzs: 12_000 },
        { houseBotId: gone.botId, openStakeTzs: 9_000 },
      ];
      planted = await GATEM.houseRosterForConsole(OFFICER, "/admin/desk");
    } finally { w.dal.houseBookStore.dayRows = realDayP; w.dal.houseBookStore.openExposure = realExpP; }

    const pById = new Map<string, Any>(planted.rows.map((r: Any) => [r.id, r]));
    ok("1.347 · a rendered account's own cells are ITS figures, in 361's grammar, painted from the day and exposure reads",
      pById.get(b1.botId)!.exposureCell.text === `used ${formatTzs(12_000)} of ${formatTzs(300_000)}`
        && pById.get(b1.botId)!.lossCell.text === `used ${formatTzs(29_000)} of ${formatTzs(50_000)}`
        && pById.get(b1.botId)!.betsCell.text === `used ${formatNumber(3)} of ${formatNumber(200)} bets`,
      j([pById.get(b1.botId)!.exposureCell.text, pById.get(b1.botId)!.lossCell.text, pById.get(b1.botId)!.betsCell.text]));
    ok("1.347 · the REMOVED account is still absent from the table",
      planted.rows.length === 3 && !pById.has(gone.botId), j(planted.rows.map((r: Any) => r.id)));
    /* ⛔ THE IDENTITY WITH THE GATE, not with the table: 12,000 + 9,000 = 21,000 open, 40,000 + 9,000 = 49,000 staked,
     * (28,000 − 11,000 + 12,000) + (0 − 0 + 9,000) = 38,000 projected loss. The rendered rows alone would read
     * 12,000 / 40,000 / 29,000 — which is the under-count this case exists to refuse. */
    ok("1.347 · 432(l) · the band measures the GATE's population — every bot in the day and exposure maps, the REMOVED one included",
      planted.tiles[0].value === formatTzsCompact(49_000) && planted.tiles[1].value === formatTzsCompact(38_000)
        && planted.tiles[2].value === formatTzsCompact(21_000),
      j({ stake: planted.tiles[0].value, loss: planted.tiles[1].value, exposure: planted.tiles[2].value,
        want: [formatTzsCompact(49_000), formatTzsCompact(38_000), formatTzsCompact(21_000)] }));
    ok("1.347 · …and each of the three is STRICTLY MORE than the roster-only sum, which is the defect this case exists for",
      planted.tiles[0].value !== formatTzsCompact(40_000) && planted.tiles[1].value !== formatTzsCompact(29_000)
        && planted.tiles[2].value !== formatTzsCompact(12_000),
      j({ rosterOnly: [formatTzsCompact(40_000), formatTzsCompact(29_000), formatTzsCompact(12_000)] }));
    /* ⛔ `Math.floor`, NEVER `round`: a rounded proportion prints "100%" at 99.6%, which is not true. */
    /* ⛔ AND THE FIXTURE NOW DISCRIMINATES FLOOR FROM ROUND, WHICH IT DID NOT. The cap was 30,000 against 21,000 of
     * usage — exactly 70%, where floor and round agree to the character — and the CONTROL beside it recomputed the
     * expected value with the very expression it was asserting, through no product code at all: `Math.floor` →
     * `Math.round` in `moneyTile` was invisible to the entire suite, and no declared mutation existed for it. At a
     * cap of 21,001 the true proportion is 99.995%: the product must print "99%", and a rounding reader prints
     * "100%" — a desk one shilling from its stop reported as having room. */
    const capLabel = R.FIELD_META.gCapOpenExposureTzs.label.toLowerCase();
    ok("1.404 · the delta is the FLOORED proportion of its OWN GLOBAL cap, named, with no second amount",
      planted.tiles[2].delta === `${formatNumber(99)}% of ${capLabel}`
        && !/TZS/.test(String(planted.tiles[2].delta)), j(planted.tiles[2]));
    ok("1.404 · CONTROL · this fixture DISCRIMINATES floor from round — 21,000 of 21,001 floors to 99% and rounds to 100%, so a rounding reader cannot pass the case above",
      Math.floor((21_000 / 21_001) * 100) === 99 && Math.round((21_000 / 21_001) * 100) === 100
        && planted.tiles[2].delta !== `${formatNumber(100)}% of ${capLabel}`, j(planted.tiles[2].delta));
    await w.limits();
  }

  /* 1.314 · the head action's disabled reason is the SERVER's own sentence with the CONFIGURED maximum. */
  await w.limits({ maxDesignatedBots: 3 });
  v = await GATEM.houseRosterForConsole(OFFICER, "/admin/desk");
  ok("1.314 · at the configured maximum the reason is `DESIGNATE_COPY.rosterFull(n, max)`, character for character",
    v.rosterFullReason === D.DESIGNATE_COPY.rosterFull(3, 3), j({ got: v.rosterFullReason, want: D.DESIGNATE_COPY.rosterFull(3, 3) }));
  ok("1.314 · …and the Accounts tile reads the same pair, from the SAME one read",
    v.tiles[3].value === `${formatNumber(3)} of ${formatNumber(3)}`, j(v.tiles[3]));
  await w.limits({ maxDesignatedBots: 5 });
  v = await GATEM.houseRosterForConsole(OFFICER, "/admin/desk");
  ok("1.314 · below the maximum there is no reason and the action is not disabled", v.rosterFullReason === null, j(v.rosterFullReason));

  /* 1.355 · every read's failure is attributed to ITS OWN figure, and one failure never blanks the page.
   * ⛔ EVERY PLANT IS CAUGHT, AND THE CATCH IS PART OF THE ASSERTION. With a settling combinator the reader must
   * RESOLVE under a rejecting read; the first version awaited each plant in a bare `try/finally`, so the declared
   * mutation that swaps `Promise.allSettled` for `Promise.all` killed the child before it could print a single FAIL
   * line — `red:house-bot-console` would class it WRONG-ASSERTION and exit 1, and the claim "one failure never blanks
   * the page" was never actually tested against a throw. */
  const plants: Record<string, Any> = {};
  const threw: Record<string, boolean> = {};
  const render = async (key: string): Promise<void> => {
    try { plants[key] = await GATEM.houseRosterForConsole(OFFICER, "/admin/desk"); threw[key] = false; }
    catch { plants[key] = null; threw[key] = true; }
  };
  const realList2 = w.dal.houseBotStore.listNonRemoved;
  try {
    w.dal.houseBotStore.listNonRemoved = () => Promise.reject(new Error("planted"));
    await render("roster");
  } finally { w.dal.houseBotStore.listNonRemoved = realList2; }
  ok("1.355 · a failed ROSTER read RESOLVES — the reader settles its reads, so one rejection never propagates out of it",
    threw.roster === false && plants.roster !== null, j({ threw: threw.roster }));
  ok("1.355 · a failed ROSTER read is `rows === null` — the page's AdminLoadError — never an empty state and never zero rows",
    plants.roster !== null && plants.roster.rows === null && plants.roster.empty === null, j({ rows: plants.roster?.rows, empty: plants.roster?.empty }));
  ok("1.355 · …and the strip still renders its own state, so one failure does not blank the page",
    typeof plants.roster?.stateSentence === "string" && plants.roster.stateSentence.length > 10, j(plants.roster?.stateSentence));
  /* ⛔ AND A FAILED ROSTER READ DOES NOT BLANK THE MONEY TILES: their figures never came from the roster, they came
   * from the day and exposure maps — the gate's own population (432(l)). Only the Accounts tile is the roster's. */
  ok("1.355 · a failed ROSTER read blanks the ACCOUNTS tile alone; the three money tiles are still real",
    plants.roster?.tiles.length === 4 && plants.roster.tiles[3].unavailable === true
      && plants.roster.tiles.slice(0, 3).every((t: Any) => t.unavailable !== true), j(plants.roster?.tiles));

  const realDay2 = w.dal.houseBookStore.dayRows;
  try {
    w.dal.houseBookStore.dayRows = () => Promise.reject(new Error("planted"));
    await render("day");
  } finally { w.dal.houseBookStore.dayRows = realDay2; }
  ok("1.355 · a failed MONEY read renders the kit's `unavailable` tile and the cell '—' — never a fabricated TZS 0",
    plants.day?.tiles[0].unavailable === true && plants.day.tiles[1].unavailable === true
      && plants.day.tiles[2].unavailable !== true && plants.day.tiles[3].unavailable !== true
      && plants.day.rows.every((r: Any) => r.lossCell.text === "—" && r.lossCell.limit === null && r.betsCell.text === "—"), j(plants.day?.tiles));
  ok("1.355 · …and the roster still renders its rows: one tile's failure suppresses neither the others nor the table",
    plants.day?.rows != null && plants.day.rows.length === 3, j(plants.day?.rows?.length));
  ok("1.355 · …and that failed money read RESOLVED too", threw.day === false, j({ threw: threw.day }));

  /* ⛔ THE FIFTH PLANT — the EXPOSURE read, which had no failure case at all. It is the one named read whose failure
   * path was untested: the exposure tile's `unavailable` and every row's exposure cell "—". */
  const realExp2 = w.dal.houseBookStore.openExposure;
  try {
    w.dal.houseBookStore.openExposure = () => Promise.reject(new Error("planted"));
    await render("exposure");
  } finally { w.dal.houseBookStore.openExposure = realExp2; }
  ok("1.355 · a failed EXPOSURE read blanks the exposure tile ALONE and renders every exposure cell '—' — never a fabricated zero",
    threw.exposure === false && plants.exposure?.tiles[2].unavailable === true
      && plants.exposure.tiles[0].unavailable !== true && plants.exposure.tiles[1].unavailable !== true && plants.exposure.tiles[3].unavailable !== true
      && plants.exposure.rows.every((r: Any) => r.exposureCell.text === "—" && r.exposureCell.limit === null && r.exposureCell.halves.length === 0)
      && plants.exposure.rows.every((r: Any) => r.lossCell.text !== "—"),
    j({ tiles: plants.exposure?.tiles.map((t: Any) => [t.label, t.unavailable ?? false]), cell: plants.exposure?.rows[0]?.exposureCell }));
  /* 1.355.c1 · the CONTROL: the same render with nothing rejecting must carry the real figures, so a case that cannot
   * tell the two apart goes red. */
  ok("1.355.c1 · CONTROL · with no rejection the same tiles carry real figures and no `unavailable`",
    v.tiles.every((t: Any) => t.unavailable !== true) && v.rows.every((r: Any) => r.lossCell.text !== "—"), j(v.tiles.map((t: Any) => t.value)));

  /* 1.421 · a house schema the migration has not reached is a STATE, not a crash and not a zero. */
  const realCtl2 = w.dal.houseBotControlStore.get;
  try {
    w.dal.houseBotControlStore.get = () => Promise.reject(new w.dal.HouseSchemaNotReady("planted"));
    await render("schema");
  } finally { w.dal.houseBotControlStore.get = realCtl2; }
  /* ⛔ AND THE ROSTER IS NOT LISTED, which the first render forced as a correction: only the CONTROL row is missing, so
   * the accounts still read — and a page headed "the desk is not set up on this database" with five accounts listed
   * beneath it says two opposite things at once. The table names the cause instead. */
  ok("1.421 · a `HouseSchemaNotReady` renders the schema STATE: no tile at all, no switch, NO ROSTER ROW, and an empty state naming that cause",
    plants.schema?.schemaMissing === true && plants.schema.controlUnreadable === false
      && plants.schema.tiles.length === 0 && plants.schema.on === null
      && plants.schema.chip === null && plants.schema.rows.length === 0 && plants.schema.empty !== null
      && !/TZS/.test(all(plants.schema)),
    j({ tiles: plants.schema.tiles.length, on: plants.schema.on, rows: plants.schema.rows.length, empty: plants.schema.empty }));
  /* ⛔ AND THE TABLE DOES NOT REPEAT THE CALLOUT ABOVE IT (ruling 432(n)): the first render printed the schema
   * sentence in a Callout and then, word for word, as the empty state's own title AND body 200px below. */
  ok("1.421 · 432(n) · the schema state's empty box says what the TABLE is and points at the notice — it does not restate the cause",
    plants.schema?.empty?.title === "No roster" && /see the notice above/.test(plants.schema.empty.body)
      && plants.schema.empty.title !== plants.schema.stateSentence && plants.schema.empty.body !== plants.schema.stateSentence,
    j(plants.schema.empty));

  /* ⛔ THE GENERIC CONTROL FAILURE — THE BLOCKER THIS CASE MISSED FIRST TIME (rulings 304, 355, 421).
   * The first version asserted only `schemaMissing === false` and never what the state DECIDED — the "assert that a
   * pass DECIDES" trap. What it actually decided was: the strip said "The desk is off. Nothing will be staked." while
   * the switch may have been ON and money moving, the chip and Toggle vanished, and `tiles` was `[]` so the whole
   * band disappeared instead of rendering four `unavailable` tiles. A failed read is never a state (355) and a failed
   * figure is the kit's `unavailable`, never an empty tile (304). */
  try {
    w.dal.houseBotControlStore.get = () => Promise.reject(new Error("a generic read failure"));
    await render("generic");
  } finally { w.dal.houseBotControlStore.get = realCtl2; }
  ok("1.421 · a GENERIC control failure is NOT collapsed into the schema state",
    threw.generic === false && plants.generic?.schemaMissing === false && plants.generic.controlUnreadable === true,
    j({ schemaMissing: plants.generic?.schemaMissing, controlUnreadable: plants.generic?.controlUnreadable }));
  ok("1.421 · …and it says NOTHING about whether the desk is on — never the OFF sentence, never a chip, never a Toggle",
    plants.generic?.stateSentence !== undefined && plants.generic.stateSentence !== "The desk is off. Nothing will be staked."
      && !/\bis off\b|will be staked/.test(plants.generic.stateSentence)
      && /could not be read/.test(plants.generic.stateSentence)
      && plants.generic.on === null && plants.generic.chip === null,
    j({ sentence: plants.generic.stateSentence, on: plants.generic.on, chip: plants.generic.chip }));
  ok("1.421 · …and the band is FOUR `unavailable` tiles, never suppressed — a failed figure is the kit's own state, not an absent card",
    plants.generic?.tiles.length === 4 && plants.generic.tiles.every((t: Any) => t.unavailable === true)
      && j(plants.generic.tiles.map((t: Any) => t.label)) === j(["Stake today", "Loss today", "Open exposure", "Accounts"])
      && !/TZS/.test(all(plants.generic?.tiles ?? [])),
    j(plants.generic?.tiles));
  ok("1.421 · …and the roster it CAN read is still rendered, with no fabricated figure in it",
    plants.generic?.rows != null && plants.generic.rows.length === 3, j(plants.generic?.rows?.length));

  /* ⛔ THE SEPARATOR BINDS THE DOT TO THE WORD THAT FOLLOWS IT (ruling 432(p)) — a breakable space, the dot, then a
   * NO-BREAK space — built the same way the reader builds it: `String.fromCharCode`, never a typed escape, because
   * the Edit tool decodes a backslash-u into the raw character. ⚠️ The first attempt put the no-break space BEFORE
   * the dot, which bound it to the preceding word and left the dot ENDING the line; only the render showed it. */
  const SEP = ` ·${String.fromCharCode(0xa0)}`;

  await w.switchOff();
  const offView = await GATEM.houseRosterForConsole(OFFICER, "/admin/desk");
  ok("1.306 · the OFF sentence is the one fixed sentence, whatever the cause",
    offView.stateSentence === "The desk is off. Nothing will be staked." && offView.chip.word === "Off", j(offView.stateSentence));
  await w.switchOn();
  const onView = await GATEM.houseRosterForConsole(OFFICER, "/admin/desk");
  ok("1.306 · the ON sentence names the time and the ACTOR BY ID — never a display name, a phone or an email (ruling 420)",
    /^On since \d\d:\d\d:\d\d EAT/.test(onView.stateSentence) && onView.stateSentence.includes(`${SEP}switched by `)
      && onView.stateSentence.includes(OFFICER) && onView.chip.word === "On",
    j(onView.stateSentence));
  /* ⛔ THE LABEL USED TO SAY THE OPPOSITE OF THE CODE, AND THE PREDICATE COULD NOT TELL THE TWO APART. It read "the
   * space BEFORE every '·' is a no-break space" while the reader binds the no-break space AFTER the dot — which is
   * the whole point, and which the file's own comment records as the first attempt's measured defect. And
   * `!/ · /` passes with the no-break space on EITHER side, so the one defect that was actually seen on a screen
   * (the dot ending a line) was guarded by nothing but a screenshot. The side is now asserted, with a control that
   * REJECTS both wrong forms. */
  const NBSP = String.fromCharCode(0xa0);
  const sepOk = (s: string): boolean =>
    s.split("·").length >= 3 && s.includes(SEP) && !s.includes(`${NBSP}· `) && !/ · /.test(s);
  ok("1.306 · 432(p) · a list never breaks onto a dangling separator — the no-break space is AFTER every '·', so the dot belongs to the word that FOLLOWS it",
    sepOk(onView.stateSentence), j(onView.stateSentence));
  ok("1.306 · 432(p) · CONTROL · the same test REJECTS the no-break space on the wrong side, and rejects a plain space on both sides",
    !sepOk(`a${NBSP}· b${NBSP}· c`) && !sepOk("a · b · c") && sepOk(`a${SEP}b${SEP}c`), "");

  /* ⛔ THE CONTROL ROW IS DOCTORED FOR THE BRANCHES THE STORE CANNOT REACH. `switchOn` clears the off cause, so a
   * STALE cause under a live switch, a NULL actor and a SUNSET desk can only be produced by planting the read. */
  const realCtl3 = w.dal.houseBotControlStore.get;
  const withControl = async (patch: Record<string, unknown>): Promise<Any> => {
    const base = await realCtl3.call(w.dal.houseBotControlStore);
    try {
      w.dal.houseBotControlStore.get = async () => ({ ...base, ...patch });
      return await GATEM.houseRosterForConsole(OFFICER, "/admin/desk");
    } finally { w.dal.houseBotControlStore.get = realCtl3; }
  };

  /* 1.308 · one Callout per AUTO-off cause, and NONE for a manual off or for a stale cause under a live switch. There
   * was no case for any of this: `offCause` appeared nowhere in the suite, so the two decisions that keep the four
   * Callouts honest were measured by nothing, and all four screenshots were taken with the switch OFF. */
  const lossStop = await withControl({ enabled: false, offCause: "GLOBAL_LOSS_STOP" });
  ok("1.308 · an AUTO-off cause is carried to the page so its own Callout renders",
    lossStop.offCause === "GLOBAL_LOSS_STOP" && lossStop.on === false
      && lossStop.stateSentence === "The desk is off. Nothing will be staked.", j({ offCause: lossStop.offCause }));
  const manualOff = await withControl({ enabled: false, offCause: "MANUAL" });
  ok("1.308 · a MANUAL off carries NO cause — an officer who switched it off does not need to be told why by a Callout",
    manualOff.offCause === null, j({ offCause: manualOff.offCause }));
  const staleCause = await withControl({ enabled: true, offCause: "ENGINE_FAULT" });
  ok("1.308 · a STALE cause left on the row while the switch is ON renders none — the switch's state decides, not the column",
    staleCause.offCause === null && staleCause.on === true, j({ offCause: staleCause.offCause, on: staleCause.on }));
  for (const cause of ["ENGINE_FAULT", "ENGINE_ERRORS", "SUNSET"]) {
    const c = await withControl({ enabled: false, offCause: cause });
    ok(`1.308 · '${cause}' reaches the page as its own cause`, c.offCause === cause, j({ got: c.offCause }));
  }

  /* 1.420 · the NULL actor, which had no behavioural case at all — only a source grep for `switchedById`.
   * ⛔ Ruling 420's own string was "System — house bot engine"; ruling 453 forbids those words on the screen, so the
   * neutral form is "System" (ruling 432(k)). */
  const noActor = await withControl({ enabled: true, switchedById: null });
  ok("1.420 · 432(k) · with no recorded actor the ON sentence reads 'switched by System' and carries no house word",
    noActor.stateSentence.includes(`${SEP}switched by System`) && !NEUTRAL.test(noActor.stateSentence), j(noActor.stateSentence));

  /* 432(m) · a WITHDRAWN desk is offered no remedy: the SUNSET Callout says "nothing can be designated", so a
   * sentence beside the disabled button saying "raise the roster limit" would contradict it on the same screen. */
  const sunsetFull = await withControl({ enabled: false, offCause: "SUNSET", maxDesignatedBots: 3 });
  ok("432(m) · a SUNSET desk at its maximum offers NO roster-full remedy, and the head still carries a reason",
    sunsetFull.rosterFullReason === null && typeof sunsetFull.actionReason === "string" && sunsetFull.actionReason.length > 8,
    j({ reason: sunsetFull.rosterFullReason, action: sunsetFull.actionReason }));
  const plainFull = await withControl({ enabled: false, offCause: "MANUAL", maxDesignatedBots: 3 });
  ok("432(m) · CONTROL · the same roster at the same maximum with an ordinary off cause DOES carry the remedy",
    plainFull.rosterFullReason === D.DESIGNATE_COPY.rosterFull(3, 3), j(plainFull.rosterFullReason));

  /* ⛔ 432(j) WITH 432(n) BESIDE IT, AND THE SECOND HALF IS WHAT THE SCREEN SHOWED. Every disabled control on this
   * rung carries a reason (432(j)) — but both reasons were the SAME SEVEN WORDS, "Not ready on this build yet.",
   * painted about 105px apart at 1280 and two blocks apart at 360: once beside the disabled "Designate an account"
   * in the head and once beside the disabled Toggle in the strip, in EVERY state where the roster is not full (read
   * off desk-notfull-1280.png and desk-notfull-360.png, and present again in the schema, roster-failed and
   * money-failed tiles). 432(n) is "NO STATE SAYS THE SAME FACT TWICE": two identical right-aligned sentences read
   * as a rendering fault, not as two reasons, and neither one says WHICH control it is about.
   * ⛔ AND 432(j) HAD NO CASE OF ITS OWN: it was guarded only through 432(m)'s SUNSET case, whose label names another
   * ruling, so the declared mutation for it reported under the wrong ruling's name. */
  ok("432(j) · 432(n) · every disabled control on this rung carries its OWN reason, and no two controls on one screen say the same words",
    [plainFull, sunsetFull].every((x: Any) =>
      typeof x.actionReason === "string" && x.actionReason.length > 8
      && typeof x.switchReason === "string" && x.switchReason.length > 8
      && x.actionReason !== x.switchReason),
    j({ action: plainFull.actionReason, sw: plainFull.switchReason }));
  ok("432(j) · CONTROL · both reasons were really read, and each names the CONTROL it belongs to rather than the build alone",
    plainFull.actionReason.toLowerCase().includes("designat") && plainFull.switchReason.toLowerCase().includes("switch"),
    j({ action: plainFull.actionReason, sw: plainFull.switchReason }));

  /* ⛔ AN INERT POINTER CARRIES NO ARROW (ruling 432(i)), AND THIS IS THE HALF THAT WAS MISSED. The server's
   * roster-full sentence is written for a LINK and ENDS "…raise the roster limit on Limits →". While the limits tab
   * has no panel the page paints it as PLAIN TEXT — arrow and all — so the head promised a navigation to a tab
   * `consoleTab()` resolves straight back to this same page, and named a rail option that is not on the rail (read
   * off desk-default-1280.png and desk-default-360.png, where the rail below reads only "Roster"). The strip's own
   * sibling forty lines down already drops its arrow when inert ("Set N global limits first"), so the page was
   * treating two inert pointers two different ways with no reason recorded anywhere.
   * ⛔ `rosterFullReason` STAYS BYTE-IDENTICAL to `DESIGNATE_COPY.rosterFull(n, max)` (432(c), 1.314): the linked
   * form is what the page renders in the same change as the panel it points at. */
  ok("1.314 · 432(i) · the PLAIN form of the roster-full sentence is the linked one WITHOUT its tail — an arrow on inert text promises a navigation that resolves back to this page",
    plainFull.rosterFullReason.endsWith("→")
      && !plainFull.rosterFullPlain.includes("→")
      && plainFull.rosterFullReason.startsWith(plainFull.rosterFullPlain)
      && plainFull.rosterFullPlain.length > 20,
    j({ linked: plainFull.rosterFullReason, plain: plainFull.rosterFullPlain }));
  ok("1.314 · 432(i) · CONTROL · with no roster-full state there is no sentence in either form, so the pair cannot drift apart",
    sunsetFull.rosterFullReason === null && sunsetFull.rosterFullPlain === null,
    j({ linked: sunsetFull.rosterFullReason, plain: sunsetFull.rosterFullPlain }));

  /* 1.310's empty-state precedence, which no case had produced: the switch's own state beats "none yet".
   * ⛔ The roster read is PLANTED empty rather than the fixture's accounts removed, so §3 and §4 still see real rows. */
  const realList3 = w.dal.houseBotStore.listNonRemoved;
  const emptyView = async (): Promise<Any> => {
    try {
      w.dal.houseBotStore.listNonRemoved = async () => [];
      return await GATEM.houseRosterForConsole(OFFICER, "/admin/desk");
    } finally { w.dal.houseBotStore.listNonRemoved = realList3; }
  };
  await w.switchOff();
  const emptyOff = await emptyView();
  await w.switchOn();
  const emptyOn = await emptyView();
  ok("1.310 · with NO account the OFF state's own title wins over 'none yet' — the switch's state beats the count",
    emptyOff.rows.length === 0 && emptyOff.empty.title === "The desk is off" && emptyOn.empty.title === "No accounts yet",
    j({ off: emptyOff.empty, on: emptyOn.empty }));
  /* ⛔ AND NEITHER EMPTY STATE INSTRUCTS THE READER TO USE A CONTROL THIS CHECKPOINT RENDERS DISABLED (432(n)).
   * "Designate an account to build the roster, or switch the desk on" was the only call to action on an empty page,
   * and both of those controls are disabled until steps 4 and 6. */
  ok("1.310 · 432(n) · no empty state tells the reader to designate an account or to switch the desk on",
    [emptyOff, emptyOn].every((x: Any) => !/Designate an account|switch the desk on/i.test(`${x.empty.title} ${x.empty.body}`)),
    j([emptyOff.empty.body, emptyOn.empty.body]));
  ok("1.310 · 432(n) · and no empty state repeats the strip's own sentence",
    [emptyOff, emptyOn].every((x: Any) => x.empty.body !== x.stateSentence && !x.stateSentence.includes(x.empty.body)),
    j([emptyOff.stateSentence, emptyOff.empty.body]));

  /* ══════════════════════════════════════════════════════════════════════════════════════════════════════════════
   * §2b · THE LIMITS PANEL (C7 step 3 · rulings 362, 364, 366, 367, 372, 409, 412, and 306/312's ONE derived count)
   * ══════════════════════════════════════════════════════════════════════════════════════════════════════════════ */

  /* 1.372(a) · QUERY-shaped, audience FIRST, and a refused viewer gets `null` with ZERO store calls — the same
   * proof the roster reader carries, because a second door is a second way past the gate. */
  {
    const playerId = await w.user({ role: "PLAYER" });
    const realCtl = w.dal.houseBotControlStore.get;
    let calls = 0;
    let refused: Any;
    try {
      w.dal.houseBotControlStore.get = (...a: Any[]) => { calls++; return realCtl.apply(w.dal.houseBotControlStore, a as Any); };
      refused = await GATEM.houseUsageForConsole(playerId, "/admin/desk", { houseBotId: null });
    } finally { w.dal.houseBotControlStore.get = realCtl; }
    ok("1.372 · the usage reader refuses a viewer outside the audience with `null` and performs ZERO store calls",
      refused === null && calls === 0, j({ refused, calls }));
  }

  /* ⛔ 1.306 / 1.312 · ONE CONTROL READ PER RENDER PASS, AND THE STRIP'S NUMBER IS THE BADGE'S NUMBER.
   * The rail's `limits` badge and the strip's "Set N global limits first →" are the SAME field of the SAME object,
   * built from ONE control row. Two reads inside one render can disagree — 346's own defect — and a badge that
   * disagrees with the sentence 40px above it is what this case exists against. The page therefore calls exactly ONE
   * gated reader per render, and each reader reads the control row exactly once. */
  {
    await w.limits({ gCapPerMarketTzs: null, gMaxBetsPerDay: null });
    const realCtl = w.dal.houseBotControlStore.get;
    const spyCtl = { roster: 0, usage: 0, direct: 0 };
    let rosterPass: Any, usagePass: Any;
    try {
      w.dal.houseBotControlStore.get = (...a: Any[]) => { spyCtl.roster++; return realCtl.apply(w.dal.houseBotControlStore, a as Any); };
      rosterPass = await GATEM.houseRosterForConsole(OFFICER, "/admin/desk");
      w.dal.houseBotControlStore.get = (...a: Any[]) => { spyCtl.usage++; return realCtl.apply(w.dal.houseBotControlStore, a as Any); };
      usagePass = await GATEM.houseUsageForConsole(OFFICER, "/admin/desk", { houseBotId: null });
      /* ⛔ THE CONTROL FOR THE TWO ONES, ON THE SAME HANDLE AND IN THE SAME RUN: without it, a patch that never
       * reached the module under test would read exactly like compliance (the double-load trap). */
      w.dal.houseBotControlStore.get = (...a: Any[]) => { spyCtl.direct++; return realCtl.apply(w.dal.houseBotControlStore, a as Any); };
      await w.dal.houseBotControlStore.get();
    } finally { w.dal.houseBotControlStore.get = realCtl; }
    ok("1.306 · 1.312 · each render pass reads the control row EXACTLY ONCE — the strip's count and the rail's badge can never be two different reads",
      spyCtl.roster === 1 && spyCtl.usage === 1, j(spyCtl));
    ok("1.306 · CONTROL · the spy CAN fire through the same handle the readers use, so the two ones above are a measurement",
      spyCtl.direct === 1, j(spyCtl));
    ok("1.306 · 1.312 · …and both panels report the SAME derived count, which is the number the badge and the sentence both paint",
      rosterPass.unsetRequired === 2 && usagePass.unsetRequired === rosterPass.unsetRequired,
      j({ roster: rosterPass.unsetRequired, usage: usagePass.unsetRequired }));
    /* ⛔ AND THE SHELL IS THE SAME SHELL ON BOTH TABS (ruling 406): the switch, the auto-off cause and the band live
     * above the rail, so a reader that built its own version of them would let one tab say the desk is off while the
     * other said it was on. */
    ok("1.406 · the strip, the auto-off cause and the band are the SAME values on both panels — one shell, built once",
      usagePass.stateSentence === rosterPass.stateSentence && usagePass.offCause === rosterPass.offCause
        && j(usagePass.tiles) === j(rosterPass.tiles) && usagePass.on === rosterPass.on
        && usagePass.limitsFirstUnsetHref === rosterPass.limitsFirstUnsetHref,
      j({ roster: rosterPass.stateSentence, usage: usagePass.stateSentence }));
    await w.limits();
  }

  /* ⛔ 1.364 · THE THREE UNSET CAPTIONS, CHOSEN BY MEMBERSHIP, ASSERTED AT THE FUNCTION LEVEL.
   * The LIMITS tab renders GLOBALS only, so every row on it falls in one of the first two branches — the third
   * would be an unexecuted branch with no proof until step 4 builds the per-account page. So the chooser is asserted
   * over the three populations READ FROM THE SOURCE OF TRUTH (`REQUIRED_FOR_MASTER_ON`, `CLEAR_EXEMPT`, and the caps
   * `cap-precheck.ts` reads unconditionally), and moving a field between those sets fails HERE. */
  {
    const REQ = R.REQUIRED_FOR_MASTER_ON as readonly string[];
    const EXEMPT = R.CLEAR_EXEMPT as readonly string[];
    const UNCONDITIONAL = ["stakeMinTzs", "stakeMaxTzs", "capPerMarketTzs", "balanceFloorTzs", "capDailyStakeTzs", "capDailyLossTzs", "capOpenExposureTzs"];
    const MASTER = "Not set — the master switch cannot be turned on.";
    const TARGETED = "Not set — targeted and manual stakes cannot be placed.";
    const ACCOUNT = "Not set — this account cannot place a bet.";
    ok("1.364 · every member of `REQUIRED_FOR_MASTER_ON` gets the master-switch caption, and the list is not empty",
      REQ.length >= 8 && REQ.every((f) => GATEM.unsetCaptionFor(f) === MASTER), j(REQ.filter((f) => GATEM.unsetCaptionFor(f) !== MASTER)));
    ok("1.364 · every member of `CLEAR_EXEMPT` gets the targeted-and-manual caption — the blanket sentence would be a LIE on a staff-chosen cap",
      EXEMPT.length >= 7 && EXEMPT.every((f) => GATEM.unsetCaptionFor(f) === TARGETED), j(EXEMPT.filter((f) => GATEM.unsetCaptionFor(f) !== TARGETED)));
    ok("1.364 · every cap the seam reads UNCONDITIONALLY gets the third caption, and it says `account` — ruling 453 outranks 364's own wording",
      UNCONDITIONAL.every((f) => GATEM.unsetCaptionFor(f) === ACCOUNT) && !NEUTRAL.test(ACCOUNT), j(UNCONDITIONAL.map((f) => GATEM.unsetCaptionFor(f))));
    /* ⛔ THE THREE POPULATIONS DO NOT OVERLAP, so the chooser's ORDER is not doing the deciding for it. */
    ok("1.364 · CONTROL · the three populations are disjoint and the three captions differ, so the branch order is not what makes the case pass",
      new Set([MASTER, TARGETED, ACCOUNT]).size === 3
        /* ⛔ AND THE ONE FIELD THE PANEL SELECTS BY PROPERTY RATHER THAN BY NAME REALLY IS UNIQUE (453). */
        && GATEM.TARGETED_DAILY_TZS_FIELD === "gCapStaffChosenDailyTzs"
        && (R.LIMIT_FIELDS as readonly string[]).filter((f) => EXEMPT.includes(f) && R.FIELD_META[f].unit === "TZS").length === 1
        && !REQ.some((f) => EXEMPT.includes(f)) && !UNCONDITIONAL.some((f) => REQ.includes(f) || EXEMPT.includes(f)),
      j({ req: REQ.length, exempt: EXEMPT.length, uncond: UNCONDITIONAL.length }));
    /* ⛔ AND THE CAPS THE SEAM READS UNCONDITIONALLY ARE READ FROM `cap-precheck.ts` ITSELF, not typed here: the list
     * above is only useful while it is the code's own list. A cap that becomes conditional fails this. */
    const precheck = decomment(read("src/lib/server/house-bot/cap-precheck.ts"));
    const staffBlock = precheck.slice(precheck.indexOf("if (f.staffChosen)"));
    ok("1.364 · CONTROL · every cap named unconditional really is read OUTSIDE `if (f.staffChosen)` in `cap-precheck.ts`",
      UNCONDITIONAL.every((f) => precheck.includes(`b.${f}`) && !staffBlock.includes(`b.${f}`)),
      j(UNCONDITIONAL.filter((f) => !precheck.includes(`b.${f}`) || staffBlock.includes(`b.${f}`))));
  }

  /* 1.364 / 1.372 / 1.409 · the panel itself: five usage rows, an unset cap with NO bar, and the read-only list. */
  {
    await w.limits({ gCapDailyStakeTzs: 100_000, gCapDailyLossTzs: 100_000, gCapOpenExposureTzs: 100_000, gCapStaffChosenDailyTzs: null });
    const u = await GATEM.houseUsageForConsole(OFFICER, "/admin/desk", { houseBotId: null });
    ok("1.364 · the panel carries the five all-account usage rows — the daily stake cap, the loss cap TWICE, the exposure cap scoped, and the targeted-and-manual cap",
      u.usage.length === 5
        && u.usage[1].name.endsWith("(projected)") && u.usage[2].name.endsWith("(settled)")
        && u.usage[1].name.slice(0, -12) === u.usage[2].name.slice(0, -10)
        && u.usage[3].name.endsWith("(open now)"),
      j(u.usage.map((r: Any) => r.name)));
    ok("1.365 · and NO usage row for a per-market, per-player or counterparty-share cap — this console renders no such figure",
      !/per-market|per player|Counterparty/i.test(all(u.usage.map((r: Any) => r.name))), j(u.usage.map((r: Any) => r.name)));
    const unset = u.usage[4];
    ok("1.364 · an UNSET cap renders NO bar and one of the three captions — never a bar at zero, which would say headroom where the gate refuses everything",
      unset.limitTzs === null && unset.usedTzs === null && unset.halves.length === 0
        && unset.unsetCaption === "Not set — targeted and manual stakes cannot be placed." && unset.unsetLinked === false,
      j(unset));
    /* ⛔ AND A REQUIRED cap's unset caption IS linked, because the field that fixes it is on this very page. */
    await w.limits({ gCapDailyStakeTzs: null });
    const u2 = await GATEM.houseUsageForConsole(OFFICER, "/admin/desk", { houseBotId: null });
    ok("1.364 · a REQUIRED cap's unset caption names the master switch and carries the link to the field that fixes it",
      u2.usage[0].limitTzs === null && u2.usage[0].unsetCaption === "Not set — the master switch cannot be turned on." && u2.usage[0].unsetLinked === true,
      j(u2.usage[0]));
    /* ⛔ THE ANCHOR IS ON THE FIRST UNSET REQUIRED LIMIT, AND ON EXACTLY ONE ROW. */
    const flagged = u2.limits.filter((l: Any) => l.firstUnset);
    ok("1.306 · exactly ONE row of the limits list carries the anchor, and it is the FIRST unset REQUIRED limit in form order",
      flagged.length === 1 && flagged[0].name === GATEM.consoleLimitLabel("gCapDailyStakeTzs")
        && u2.limits.findIndex((l: Any) => l.firstUnset) === u2.limits.findIndex((l: Any) => l.unset),
      j({ flagged: flagged.map((l: Any) => l.name), list: u2.limits.map((l: Any) => [l.name, l.unset, l.firstUnset]) }));
    /* ⛔ WITH EVERY LIMIT SET, NO ROW CARRIES IT — an anchor that always renders is an anchor that means nothing. */
    /* ⚠️ `gTargetsMaxActive` is NOT in the world's OPEN_LIMITS, so it is set explicitly here: an "everything set"
       control that leaves one field null is not the control it claims to be. */
    await w.limits({ gTargetsMaxActive: 50 });
    const u3 = await GATEM.houseUsageForConsole(OFFICER, "/admin/desk", { houseBotId: null });
    ok("1.306 · CONTROL · with every limit set no row carries the anchor and no row carries a caption",
      u3.limits.every((l: Any) => l.firstUnset === false && l.unset === false && l.caption === null)
        && u3.limits.length === (R.LIMIT_FIELDS as readonly string[]).length,
      j({ rows: u3.limits.length, want: (R.LIMIT_FIELDS as readonly string[]).length }));
    /* ⛔ AND EVERY LABEL AND SECTION THE PANEL PAINTS IS NEUTRAL (ruling 453, 432(f) amended): four `FIELD_META`
     * labels and one section name carry a word this section may not render, and `gCapStaffChosenDailyTzs` — the one
     * ruling 364 requires a USAGE ROW for — is the one 432(f) missed. */
    /* ⛔ A COUNT IS NOT MONEY (ruling 409), AND THE FIRST PASS GOT IT WRONG — read off desk-globals-1280.png, where
     * "Bets per minute 20" and "Bets per day 28,800" were painted in `.amount`, the class that means "this is a money
     * figure" everywhere in this kit and that is `white-space: nowrap`. The roster's own cell already distinguishes
     * them (`ConsoleUsageCell.money`); the limits list did not. The flag is derived from `FIELD_META`'s UNIT, so a
     * field that changes unit cannot drift away from the face it is painted in. */
    ok("1.409 · every limit row says whether it is MONEY, derived from `FIELD_META`'s own unit — never a count in the money face",
      u3.limits.every((l: Any, i: number) => l.money === (R.FIELD_META[(R.LIMIT_FIELDS as readonly string[])[i]].unit === "TZS"))
        && u3.limits.filter((l: Any) => l.money).length >= 5 && u3.limits.filter((l: Any) => !l.money).length >= 5,
      j(u3.limits.map((l: Any) => [l.name, l.money, l.value])));
    const painted = [...u3.limits.flatMap((l: Any) => [l.name, l.section, l.value]), ...u3.usage.map((r: Any) => r.name)];
    ok("1.364 · 453 · every limit name, section and value the panel paints is neutral, over the WHOLE limit table",
      painted.length >= 40 && painted.every((s: string) => !NEUTRAL.test(s)), j(painted.filter((s: string) => NEUTRAL.test(s))));
    /* ⛔ THE OVERRIDE POPULATION IS DERIVED, IN BOTH DIRECTIONS (replan ruling 539). It was a list of FOUR typed
     * here, so the three labels `/admin/desk?tab=limits` was actually painting — the two `gCounterPerPlayer*` and
     * `gStaffChosenMaxCounterpartyShare` — were outside the control that exists to find exactly them, and only a
     * reviewer's eyes could have found them. NEEDS is every limit field whose `FIELD_META` label carries a word;
     * OVERRIDDEN is every field the console actually renames. The two sets must be EQUAL: a missing override
     * paints the word, and an override for an already-neutral label is a rename nobody ruled. */
    const LIMITS = R.LIMIT_FIELDS as readonly string[];
    const NEEDS = LIMITS.filter((f) => NEUTRAL.test(R.FIELD_META[f].label));
    const OVERRIDDEN = LIMITS.filter((f) => GATEM.consoleLimitLabel(f) !== R.FIELD_META[f].label);
    ok("1.364 · CONTROL · every `FIELD_META` label this overrides really DOES carry a word, and every label that carries one IS overridden — the population is derived, never a typed four",
      NEEDS.length >= 7 && j(NEEDS) === j(OVERRIDDEN)
        && OVERRIDDEN.every((f) => !NEUTRAL.test(GATEM.consoleLimitLabel(f)))
        && NEUTRAL.test(R.FIELD_META.gCapStaffChosenDailyTzs.section),
      j({ needs: NEEDS, overridden: OVERRIDDEN, missing: NEEDS.filter((f) => !OVERRIDDEN.includes(f)), spurious: OVERRIDDEN.filter((f) => !NEEDS.includes(f)) }));
    /* ⛔ AND THE THREE RULING 539 FOUND ARE NAMED, so a future widening of the lexicon cannot quietly drop them
     * out of NEEDS and take the assertion above green with it. Their `FIELD_META` labels are the mechanism's
     * own name; the console's are not. */
    ok("1.364 · 539 · the three labels that were painting the mechanism on the limits tab are each overridden, and each original still reads as a hit",
      ["gCounterPerPlayerPerDay", "gCounterPerPlayerTzsPerDay", "gStaffChosenMaxCounterpartyShare"]
        .every((f) => NEUTRAL.test(R.FIELD_META[f].label) && !NEUTRAL.test(GATEM.consoleLimitLabel(f)) && GATEM.consoleLimitLabel(f) !== R.FIELD_META[f].label),
      j(["gCounterPerPlayerPerDay", "gCounterPerPlayerTzsPerDay", "gStaffChosenMaxCounterpartyShare"].map((f) => [R.FIELD_META[f].label, GATEM.consoleLimitLabel(f)])));
    STATES.push(["limits-panel", u3], ["limits-unset-required", u2]);
  }

  /* ━━ 1.348 · THE EAT DAY IS DERIVED ONCE PER RENDER, AND EVERY READ THAT NEEDS ONE IS GIVEN IT ━━━━━━━━━━━
   *
   * ⛔ RULING 348's PROOF (c) HAD NO ASSERTION ANYWHERE — `grep` for `1.348` found nothing in any suite, and §4
   * scheduled it in no step. It is written here, and the day-key half is asserted BEHAVIOURALLY rather than as a
   * source count, because the defect it names is not visible in the source at all: `readDeskCore` derives the key
   * and the docblock says "DERIVED ONCE PER RENDER, HERE", while the limits panel's FIFTH read
   * (`staffChosenPlacedToday`) derived a SECOND day inside the DAL — `eatDayKey(Date.now())` on memory and the
   * DATABASE CLOCK on Prisma. Across EAT midnight, or under app/DB clock skew, ONE card then showed two days.
   * ⚠️ Ruling 433(c) is AMENDED by this: dropping `dayKey` from the reader's `query` did not remove the second
   * derivation, it only moved it out of the module's sight.
   */
  {
    const CLOCK: Any = await import("../../src/lib/house-bot/clock.ts");
    await w.limits({ gCapStaffChosenDailyTzs: 500_000 });

    /* Two staff-chosen PLACED stakes: one finished inside YESTERDAY's EAT day, one inside TODAY's. A read that
       honours a passed day returns exactly one of them; a read that derives its own always returns today's. */
    const todayKey: string = CLOCK.eatDayKey(Date.now());
    const yKey: string = CLOCK.eatDayKey(CLOCK.eatDayStartMs(todayKey) - 1);
    const midOf = (k: string) => new Date(CLOCK.eatDayStartMs(k) + 12 * 3_600_000).toISOString();
    const poll = await w.poll();
    const plant = async (finishedAt: string, stakeTzs: number) => {
      const id = w.constants.HOUSE_ID_PREFIX ? `${w.constants.HOUSE_ID_PREFIX.intent}${w.uid("x")}` : w.uid("hbi_");
      await w.dal.houseBotIntentStore.insert({
        id, houseBotId: b1.botId, botUserId: b1.userId, kind: "MANUAL", marketId: poll.id, productLine: "MARKET",
        anchorKey: w.constants.manualAnchorKey(OFFICER, crypto.randomUUID()), triggerPositionId: null, triggerUserId: null, targetId: null,
        requestedById: OFFICER, entryCondition: "THIN", side: "YES", stakeTzs,
        dueAt: w.iso(-1_000), deadlineAt: w.iso(3_600_000), staleAt: w.iso(600_000), status: "PLACED", reasonCode: null,
        why: null, decision: {}, attempts: 0, transientAttempts: 0, nextAttemptAt: null, claimedBy: null,
        claimedUntil: null, positionId: `pos_${id}`, finishedAt, alertedAt: null,
      });
    };
    await plant(midOf(yKey), 7_000);
    await plant(midOf(todayKey), 3_000);

    /* ⛔ (a) BOTH TWINS HONOUR A PASSED DAY, AND THE TWO ANSWERS DIFFER. Without the widening the argument is
       ignored and both calls return today's 3,000 — which is the whole defect, on either store. */
    const forYesterday = await w.dal.houseBotIntentStore.staffChosenPlacedToday({ houseBotId: null, dayKey: yKey });
    const forToday = await w.dal.houseBotIntentStore.staffChosenPlacedToday({ houseBotId: null, dayKey: todayKey });
    const forNow = await w.dal.houseBotIntentStore.staffChosenPlacedToday({ houseBotId: null });
    ok("1.348 · `staffChosenPlacedToday` answers the day it is GIVEN, and a day it was not given is a different answer — on this store",
      forYesterday.stakeTzs === 7_000 && forYesterday.count === 1
        && forToday.stakeTzs === 3_000 && forToday.count === 1
        && forNow.stakeTzs === forToday.stakeTzs,
      j({ forYesterday, forToday, forNow, yKey, todayKey }));

    /* ⛔ (b) AND THE RENDER PASSES ITS OWN KEY TO IT. The spy records the INPUT the reader handed the DAL; the
       shell's `dayKey` is the key the render derived. One card, one day — asserted, not claimed in a docblock.
       ⚠️ THE CONTROL IS AN IDENTITY CHECK, NOT A CALL THROUGH THE HANDLE JUST PATCHED: a control that calls the spy
       itself fires whatever the reader did, which is the class this whole review is about. */
    const realFn = w.dal.houseBotIntentStore.staffChosenPlacedToday;
    const seen: Any[] = [];
    let live: Any;
    let calledHandle: Any = null;
    try {
      w.dal.houseBotIntentStore.staffChosenPlacedToday = function (this: Any, input: Any, tx?: Any) {
        calledHandle = w.dal.houseBotIntentStore.staffChosenPlacedToday;
        seen.push(input);
        return realFn.call(this, input, tx);
      };
      live = await GATEM.houseUsageForConsole(OFFICER, "/admin/desk", { houseBotId: null });
    } finally {
      w.dal.houseBotIntentStore.staffChosenPlacedToday = realFn;
    }
    ok("1.348 · the limits panel's fifth read is handed the RENDER's own day key — the page cannot straddle EAT midnight and paint two days on one card",
      seen.length === 1 && typeof live.dayKey === "string" && /^\d{4}-\d{2}-\d{2}$/.test(live.dayKey)
        && seen[0].dayKey === live.dayKey && seen[0].houseBotId === null,
      j({ passed: seen, dayKey: live.dayKey }));
    ok("1.348 · CONTROL · the spy IS the handle the reader called (an identity check — a control that calls through its own patch fires either way)",
      calledHandle !== null && calledHandle !== realFn && w.dal.houseBotIntentStore.staffChosenPlacedToday === realFn,
      j({ recorded: seen.length, restored: w.dal.houseBotIntentStore.staffChosenPlacedToday === realFn }));

    /* ⛔ (c) AND THE PAINTED FIGURE IS THAT DAY's FIGURE. `ConsoleDeskShell.dayKey` had NO reader anywhere before
       this case — a field on a view model nothing reads is a field nobody can be wrong about. It is read here, and
       it is what ties the row to the window. */
    const staffRow = live.usage[4];
    const direct = await w.dal.houseBotIntentStore.staffChosenPlacedToday({ houseBotId: null, dayKey: live.dayKey });
    ok("1.348 · the targeted-and-manual usage row is the figure for the render's OWN day, read back through the same door",
      staffRow.usedTzs === direct.stakeTzs && staffRow.usedTzs === forToday.stakeTzs && live.dayKey === todayKey,
      j({ row: staffRow.usedTzs, direct: direct.stakeTzs, dayKey: live.dayKey }));

    /* ⛔ (d) 348's SOURCE HALF: ONE derivation in the whole gated-reader module, and never the PLANNER's clock.
       348 names `dbClock()` by name as the wrong one — the seam refuses on `eatDayKey(Date.now())`, so a console
       measuring the database's day can disagree with the gate it is reporting on. */
    if (STORE === "memory") {
      const gateSrc = decomment(read(GATE));
      ok("1.348 · exactly ONE `eatDayKey(` call in the whole gated-reader module, and no `dbClock(` anywhere in it",
        (gateSrc.match(/eatDayKey\(/g) ?? []).length === 1 && !/dbClock\(/.test(gateSrc),
        j({ eatDayKey: (gateSrc.match(/eatDayKey\(/g) ?? []).length, dbClock: /dbClock\(/.test(gateSrc) }));
      /* ⛔ AND THE FIFTH READ REALLY IS GIVEN IT AT SOURCE. The behavioural case above proves today's code; this
         pins the SHAPE, so a future panel that adds a sixth read without a key is reported beside it. */
      ok("1.348 · `readDeskCore` takes a FACTORY of the day key, and the fifth read is called with it",
        /readDeskCore<T>\(extra: \(dayKey: string\) => Promise<T>\)/.test(gateSrc)
          && /staffChosenPlacedToday\(\{ houseBotId: query\.houseBotId, dayKey \}\)/.test(gateSrc)
          && /readDeskCore\(\(dayKey\) =>/.test(gateSrc),
        j({ factory: /readDeskCore<T>\(extra: \(dayKey: string\) => Promise<T>\)/.test(gateSrc) }));
    }
    await w.limits();
  }

  /* ⛔ 1.366 / 1.367 · TWO LOSS ROWS AGAINST ONE CAP, THE DISPLAY CLAMPED AT ZERO, AND AT/OVER SAID IN WORDS.
   * The reader is NOT clamped: `foldDayBook` keeps a negative realised loss, which is a PROFIT, and every gate and
   * stop still reads it. What is clamped is the RENDER, because "−TZS 12,000 of TZS 50,000" is "Today's net" wearing
   * a cap's label — the figure ruling 266 struck. */
  {
    await w.limits({ gCapDailyStakeTzs: 40_000, gCapDailyLossTzs: 50_000, gCapOpenExposureTzs: 10_000, gCapStaffChosenDailyTzs: 100_000 });
    const realDay = w.dal.houseBookStore.dayRows;
    const realExp = w.dal.houseBookStore.openExposure;
    let planted: Any;
    try {
      /* staked 40,000 = the cap exactly (AT); projected loss 30,000 − 11,000 + 12,000 = 31,000 (under);
       * realised loss 30,000 − 41,000 = −11,000, a PROFIT, which must RENDER as zero;
       * projected loss = realised + open = −11,000 + 12,000 = 1,000, which is under the 50,000 cap. */
      w.dal.houseBookStore.dayRows = async () => [
        { houseBotId: b1.botId, bets: 3, staked: 40_000, openStake: 12_000, settledStake: 30_000, returned: 41_000 },
      ];
      /* exposure 12,000 against a cap of 10,000 — OVER. */
      w.dal.houseBookStore.openExposure = async () => [{ houseBotId: b1.botId, openStakeTzs: 12_000 }];
      planted = await GATEM.houseUsageForConsole(OFFICER, "/admin/desk", { houseBotId: null });
    } finally { w.dal.houseBookStore.dayRows = realDay; w.dal.houseBookStore.openExposure = realExp; }

    const [stake, projected, settled, exposure] = planted.usage;
    ok("1.366 · the two loss rows are separate, share ONE cap, and the SETTLED one renders a profit as zero — never a signed amount",
      projected.limitTzs === settled.limitTzs && projected.limitTzs === 50_000
        && projected.usedTzs === 1_000 && settled.usedTzs === 0
        && settled.captionText.includes(`used ${formatTzs(0)} of ${formatTzs(50_000)}`)
        && !/[-−+]/.test(settled.captionText.replace(/—/g, "")),
      j({ projected: projected.captionText, settled: settled.captionText }));
    ok("1.366 · CONTROL · the READER is not clamped — `foldDayBook` still returns the negative realised loss the gates and stops read",
      (await import("../../src/lib/server/house-bot/book.ts") as Any)
        .foldDayBook({ bets: 3, staked: 40_000, openStake: 12_000, settledStake: 30_000, returned: 41_000 }, "x", "2026-01-01").realisedLossTzs === -11_000, "");
    ok("1.367 · usage EQUAL to its limit says so in words, and carries the true amount in full",
      stake.usedTzs === 40_000 && stake.edgeText === " — at the limit" && stake.captionText.endsWith(" — at the limit")
        && stake.captionText.includes(`used ${formatTzs(40_000)} of ${formatTzs(40_000)}`),
      j(stake.captionText));
    ok("1.367 · usage OVER its limit says so in words, and is NOT clamped to the limit — the bar saturates and cannot tell 100% from 140%",
      exposure.usedTzs === 12_000 && exposure.edgeText === " — over the limit"
        && exposure.captionText.includes(`used ${formatTzs(12_000)} of ${formatTzs(10_000)}`)
        && !exposure.captionText.includes(`used ${formatTzs(10_000)} of ${formatTzs(10_000)}`),
      j(exposure.captionText));
    ok("1.367 · and a row UNDER its limit carries no clause at all, so the clause is a signal and not decoration",
      projected.edgeText === "" && !/the limit/.test(projected.captionText), j(projected.captionText));
    /* ⛔ AT EVERY RENDER SITE (367): the caption, the plain `captionText` the bar's `aria-valuetext` takes, AND an
     * `.admin-tbl` usage cell, which has no bar at all and where the clause is the only signal there is. */
    let rosterPlanted: Any;
    try {
      w.dal.houseBookStore.dayRows = async () => [
        { houseBotId: b1.botId, bets: 200, staked: 40_000, openStake: 12_000, settledStake: 30_000, returned: 41_000 },
      ];
      w.dal.houseBookStore.openExposure = async () => [{ houseBotId: b1.botId, openStakeTzs: 400_000 }];
      rosterPlanted = await GATEM.houseRosterForConsole(OFFICER, "/admin/desk");
    } finally { w.dal.houseBookStore.dayRows = realDay; w.dal.houseBookStore.openExposure = realExp; }
    const rowB1 = rosterPlanted.rows.find((r: Any) => r.id === b1.botId);
    ok("1.367 · the SAME clause lands in a roster cell, where there is no bar and it is the only signal there is",
      rowB1.exposureCell.edgeText === " — over the limit" && rowB1.exposureCell.text.endsWith(" — over the limit")
        && rowB1.exposureCell.text.includes(`used ${formatTzs(400_000)} of ${formatTzs(300_000)}`)
        && rowB1.betsCell.edgeText === " — at the limit" && rowB1.betsCell.text.endsWith(" — at the limit"),
      j({ exposure: rowB1.exposureCell.text, bets: rowB1.betsCell.text }));
    ok("1.367 · CONTROL · the clause is written with a real em dash from `String.fromCharCode`, not a hyphen, and the same three sites agree on it",
      rowB1.exposureCell.edgeText === ` ${String.fromCharCode(0x2014)} over the limit`
        && exposure.edgeText === rowB1.exposureCell.edgeText
        && exposure.captionText.endsWith(exposure.edgeText), j(rowB1.exposureCell.edgeText));
    STATES.push(["limits-at-over", planted], ["roster-at-over", rosterPlanted]);
    await w.limits();
  }

  /* ⛔ 1.372(c) · A FAILED READ IS NEVER A ZERO, AND EACH ROW'S READABILITY IS ITS OWN READ'S (355). */
  {
    const realDay = w.dal.houseBookStore.dayRows;
    let dayFailed: Any;
    try {
      w.dal.houseBookStore.dayRows = async () => { throw new Error("planted day failure"); };
      dayFailed = await GATEM.houseUsageForConsole(OFFICER, "/admin/desk", { houseBotId: null });
    } finally { w.dal.houseBookStore.dayRows = realDay; }
    ok("1.372 · a failed day read makes the stake and both loss rows say so — and NEVER `used TZS 0 of TZS 50,000`",
      dayFailed.usage.slice(0, 3).every((r: Any) => r.unreadable === true && r.usedTzs === null && r.halves.length === 0
        && /couldn't read/i.test(r.captionText) && !/TZS\s*0\b/.test(r.captionText)),
      j(dayFailed.usage.map((r: Any) => [r.name, r.unreadable, r.captionText])));
    ok("1.372 · …and the exposure row, whose own read succeeded, is still REAL — one failure never blanks the panel",
      dayFailed.usage[3].unreadable === false && dayFailed.usage[3].usedTzs !== null, j(dayFailed.usage[3]));
    const realCtl2 = w.dal.houseBotControlStore.get;
    let schemaView: Any;
    try {
      const { HouseSchemaNotReady }: Any = await import("../../src/lib/server/house-bot-dal.ts");
      w.dal.houseBotControlStore.get = async () => { throw new HouseSchemaNotReady("planted"); };
      schemaView = await GATEM.houseUsageForConsole(OFFICER, "/admin/desk", { houseBotId: null });
    } finally { w.dal.houseBotControlStore.get = realCtl2; }
    ok("1.421 · with no control row the limits panel has nothing to measure against: no usage, no list, and the page's own Callout owns the cause",
      schemaView.schemaMissing === true && schemaView.usage === null && schemaView.limits === null && schemaView.tiles.length === 0,
      j({ schemaMissing: schemaView.schemaMissing, usage: schemaView.usage, limits: schemaView.limits }));
    STATES.push(["limits-day-failed", dayFailed], ["limits-schema", schemaView]);
  }

  /* ⛔ 1.316 / 473 · IS THE DESK WORTH RE-ASKING ABOUT? The poller is enabled from this server verdict AND from the
   * client's own REACT state. The three branches of the client predicate are asserted directly, because none of them
   * can be reached from a render today: no dialog and no form exists on this section until step 4. */
  {
    const LIVE: Any = await import("../../src/app/admin/desk/desk-live.tsx");
    ok("1.316 · the poller's predicate is pure and all three of its branches answer — live and unheld polls, a hold stops it, and nothing live never polls",
      LIVE.deskPollerEnabled(true, 0) === true && LIVE.deskPollerEnabled(true, 1) === false
        && LIVE.deskPollerEnabled(false, 0) === false && LIVE.deskPollerEnabled(false, 2) === false, "");
    await w.switchOff();
    const offLive = await GATEM.houseRosterForConsole(OFFICER, "/admin/desk");
    await w.switchOn();
    const onLive = await GATEM.houseRosterForConsole(OFFICER, "/admin/desk");
    ok("1.316 · `live` is true with the switch ON, and true with the switch OFF while an account is ACTIVE or AUTO_PAUSED — the engine can still move it",
      onLive.live === true && offLive.live === true, j({ on: onLive.live, off: offLive.live }));
    const realList4 = w.dal.houseBotStore.listNonRemoved;
    let dead: Any;
    try {
      await w.switchOff();
      w.dal.houseBotStore.listNonRemoved = async () => [];
      dead = await GATEM.houseRosterForConsole(OFFICER, "/admin/desk");
    } finally { w.dal.houseBotStore.listNonRemoved = realList4; await w.switchOn(); }
    ok("1.316 · CONTROL · with the switch off and no account at all `live` is FALSE — so a 20s refresh is not registered on a page nothing can change",
      dead.live === false, j({ live: dead.live, rows: dead.rows.length }));
  }

  /* ⛔ 1.393 · A NON-OWNER STAFF VIEWER IS OUTSIDE THE CONSOLE'S AUDIENCE, ON BOTH BELTS. `houseConsoleAudience`
   * has two branches and only one of them was ever driven: until C7 step 2 the probe's viewers were a player, the
   * holder, a trigger player and the ADMIN, so the OWNER-ONLY branch the whole console depends on had never been
   * exercised by a real staff session. The static half is asserted here; the SERVED half is the probe's 4.1b. */
  {
    const STAFF = ["SUPPORT", "COMPLIANCE", "MODERATOR", "FINANCE", "GROWTH", "AUDITOR"];
    const ids: Array<[string, string]> = [];
    for (const role of STAFF) ids.push([role, await w.user({ role })]);
    const verdicts: Record<string, boolean> = {};
    for (const [role, id] of ids) {
      verdicts[role] = (await GATEM.houseConsoleAudience(id, "/admin/desk"))
        || (await GATEM.houseConsoleAudience(id, "/admin/desk/new"))
        || (await GATEM.houseConsoleAudience(id, "/admin/desk/hb_0123456789abcdef01234567"));
    }
    ok("1.393 · no non-owner staff role is in the audience of ANY console route — the section, the wizard and a record path alike",
      STAFF.every((r) => verdicts[r] === false) && ROLES.isOwnerOnlyPath(CR.CONSOLE_ROUTE) === true, j(verdicts));
    ok("1.393 · CONTROL · the same six roles ARE in the audience of a route their domain grants, so the six falses above are a measurement and not an unreachable call",
      (await GATEM.houseConsoleAudience(ids.find(([r]) => r === "COMPLIANCE")![1], "/admin/audit")) === true, "");
  }

  /* ⛔ 1.332 · X13 · AN ADMIN WHO ALSO HOLDS A LIVE ACCOUNT KEEPS THE CONSOLE. Asserted deliberately, so a future
   * silent holder-exclusion turns this case red and has to be RULED rather than slipped in: on a one-owner platform
   * the alternative locks Ali out of the very controls that stop his own desk the moment he designates his own
   * account, and a "not a holder" test would need the holder set read on every gate call — a second read whose
   * failure mode is a locked-out owner. */
  {
    const adminHolder = await w.user({ role: "ADMIN" });
    const held = await w.bot({ holderId: adminHolder });
    const verdict = await GATEM.houseConsoleAudience(adminHolder, "/admin/desk");
    const view = await GATEM.houseRosterForConsole(adminHolder, "/admin/desk");
    ok("1.332 · X13 · an ADMIN who HOLDS a live account is still in the console's audience, and still reads its rows",
      verdict === true && view !== null && view.rows.some((r: Any) => r.id === held.botId),
      j({ verdict, rows: view?.rows?.length }));
    ok("1.332 · X13 · CONTROL · that account really is a live holder in this run, so the verdict above is the combination X13 names and not an ordinary ADMIN",
      (await w.dal.houseBotStore.findLiveByUserId(adminHolder))?.id === held.botId, "");
  }

  /* ⛔ AND EVERY ONE OF THEM IS HANDED TO §3's LEXICON SCAN. A painted branch nobody scans is a branch 453 does not
   * cover, and 453 is a HARD rule on everything the console renders. */
  STATES.push(["default", v], ["roster-failed", plants.roster], ["money-failed", plants.day],
    ["exposure-failed", plants.exposure], ["schema", plants.schema], ["control-unreadable", plants.generic],
    ["off", offView], ["on", onView], ["loss-stop", lossStop], ["stale-cause", staleCause],
    ["no-actor", noActor], ["sunset-full", sunsetFull], ["roster-full", plainFull],
    ["empty-off", emptyOff], ["empty-on", emptyOn]);
}
} catch (err) {
  /* ⛔ NOT A SWALLOW. The throw is an assertion of its own, it is printed with its stack, and §3 and §4 still run — a
   * partially filled `STATES` makes 3.453's own population floor fail too, which is the correct second report. */
  ok("0.throw · no behavioural case threw — a throw here would otherwise skip §3's lexicon scan and §4's whole source law",
    false, String((err as Any)?.stack ?? err).replace(/\s+/g, " ").slice(0, 300));
}

/* ════════════════════════════════════════════════════════════════════════════════════════════════════════════════
 * §3 · THE NEUTRAL LEXICON (ruling 453)
 * ════════════════════════════════════════════════════════════════════════════════════════════════════════════════ */

section("§3 · nothing the desk renders names the feature, in ANY state");
{
  /**
   * Every COPY field of one painted view. ⛔ `label`, `handle` and `id` are a record's own VALUES, not copy — they
   * are nested inside a row and this sweep never reaches them.
   * ⛔ THE TOP LEVEL IS SWEPT, NOT TYPED. It was a hand-written list and it had already stopped covering:
   * `rosterFullPlain` — the sentence C7 step 3 paints at `page.tsx` when the limits panel is not linkable — was
   * added to the view model and never added here, so 453's strictest scan did not read it. Every string-valued
   * key of the shell is now in the population on the day it lands, hrefs and the day key included: 453 names
   * route metadata too, and a neutral value costs nothing to scan.
   */
  const copyOf = (view: Any): string[] => [
    ...Object.values(view).filter((v: unknown): v is string => typeof v === "string"),
    view.empty?.title, view.empty?.body,
    ...(view.tiles ?? []).flatMap((t: Any) => [t.label, t.value, t.delta]),
    ...(view.rows ?? []).flatMap((r: Any) => [r.statusWord, r.lossCell.text, r.exposureCell.text, r.betsCell.text, r.products,
      ...[r.lossCell, r.exposureCell, r.betsCell].flatMap((c: Any) => c.halves.flatMap((h: Any) => [h.word, h.suffix, c.edgeText]))]),
    /* ⭐ C7 step 3 · THE LIMITS PANEL'S OWN COPY. Its five usage names come from `FIELD_META`, four of whose labels
       and one of whose section names carry a word this section may not render (432(f), amended) — so the branch most
       likely to break 453 on this checkpoint is the one that would have been outside the scan. */
    ...(view.usage ?? []).flatMap((r: Any) => [r.name, r.captionText, r.unsetCaption, r.edgeText,
      ...r.halves.flatMap((h: Any) => [h.word, h.suffix])]),
    ...(view.limits ?? []).flatMap((l: Any) => [l.section, l.name, l.value, l.caption]),
    view.chip?.word,
  ].filter((s: unknown): s is string => typeof s === "string");

  const fresh = await GATEM.houseRosterForConsole(OFFICER, "/admin/desk");
  const scanned: Array<[string, string[]]> = [["fresh", copyOf(fresh)], ...STATES.map(([n, v]) => [n, copyOf(v)] as [string, string[]])];
  const hits = scanned.flatMap(([n, c]) => c.filter((s) => NEUTRAL.test(s)).map((s) => `${n}: ${s}`));
  const total = scanned.reduce((n, [, c]) => n + c.length, 0);
  /* ⛔ THE FLOOR IS OVER THE STATES AND THE STRINGS BOTH: a scan of one state, or of a view whose branches are all
   * null, is not a scan. Sixteen states were produced above; each carries at least a sentence and four tile labels. */
  ok("3.453 · not one painted string of ANY state carries a house-vocabulary word, or the words bot, house, liquidity or counter-stake",
    scanned.length >= 23 && total >= 1434 && hits.length === 0, j({ states: scanned.length, scanned: total, hits }));
  /* ⛔ AND THE BRANCHES MOST LIKELY TO CARRY ONE ARE PROVEN PRESENT IN THE SCAN, by name — a state list that quietly
   * stopped producing the OFF sentence or an empty state would otherwise read as compliance. */
  const seen = new Set(scanned.flatMap(([, c]) => c));
  ok("3.453 · …and the scan really did include the OFF sentence, an unset-limit delta, the roster-full sentence, an `unavailable` value and an empty state",
    seen.has("The desk is off. Nothing will be staked.")
      && [...seen].some((s) => /nothing can be staked until this limit is set/.test(s))
      && [...seen].some((s) => /The roster is full/.test(s))
      && seen.has("n/a") && seen.has("No accounts yet") && seen.has("No roster"),
    j({ states: scanned.map(([n]) => n) }));
  /* ⛔ THE SWEEP REALLY IS A SWEEP. A `copyOf` that quietly returned only the keys it used to type would pass
   * every assertion above, so the keys the typed list MISSED are named here — and nothing else names them. */
  {
    const full = await GATEM.houseRosterForConsole(OFFICER, "/admin/desk");
    const sweptKeys = Object.keys(full).filter((k) => typeof (full as Any)[k] === "string");
    ok("3.453 · CONTROL · the top-level sweep reaches every string key of the shell, `rosterFullPlain`, the two hrefs and the day key included — the four a typed list had left out",
      sweptKeys.length >= 5 && sweptKeys.every((k) => copyOf(full).includes((full as Any)[k]))
        && copyOf(full).includes(full.limitsFirstUnsetHref) && copyOf(full).includes(full.dayKey),
      j({ sweptKeys, copied: copyOf(full).length }));
  }
  ok("3.453.c1 · CONTROL · the same test fires on each of the shared vocabulary's own samples and on the words 453 adds, and does NOT fire on an innocent word that merely contains one",
    HOUSE_WORD_SAMPLES.every((s: string) => NEUTRAL.test(s)) && CONSOLE_EXTRA_SAMPLES.every((s: string) => NEUTRAL.test(s))
      /* ⛔ BOTH DIRECTIONS (ruling 539). The stem widened from `counter[- ]?stakes?` to the bare word, and a
       * widening with no accept side is the guard that cries wolf until somebody switches it off. */
      && CONSOLE_BENIGN_SAMPLES.every((s: string) => !NEUTRAL.test(s))
      && !NEUTRAL.test("The desk is off. Nothing will be staked.")
      && !NEUTRAL.test("nothing can be staked until this limit is set"),
    j(CONSOLE_BENIGN_SAMPLES.filter((s: string) => NEUTRAL.test(s))));
}

/* ════════════════════════════════════════════════════════════════════════════════════════════════════════════════
 * §4 · the section's source law — memory child only (it reads files, not a store)
 * ════════════════════════════════════════════════════════════════════════════════════════════════════════════════ */

if (STORE === "memory") {
  section("§4 · the section's source law");
  const pageRaw = read(PAGE);
  const pageCode = decomment(pageRaw);
  const gateCode = decomment(read(GATE));

  /* 4.453 · THE GUARD RULING 453 ASKS FOR, over every string of the section AND of the gated reader that writes its
   * copy, JSX TEXT INCLUDED — the two holes the first version had. */
  const allLits = lexiconFiles.flatMap((f) => domLiterals(f, read(f)).map((s) => [f, s] as const));
  const litHits = allLits.filter(([, s]) => NEUTRAL.test(s));
  const jsxLits = domLiterals(PAGE, pageRaw);
  /* ⛔ 513's FLOORS, AND WHY THEY ARE THREE AND NOT ONE. `sectionFiles.length >= 3` alone would pass on a walk that
   * found three OTHER files; the entry files are therefore named and required, and any file the scanner cannot parse
   * is refused outright rather than quietly dropped. Every number is PRINTED, so the next session raises the floor to
   * what a run measured instead of guessing at one. ⛔ A floor only ever rises. */
  ok("4.453 · ⛔ RULING 453 · no string that can reach the DOM — in the section OR in the reader that writes its copy — carries a house word, in text, aria-*, title, placeholder or route metadata",
    allLits.length >= 297 && litHits.length === 0
      && sectionFiles.length >= 4 && [PAGE, LAYOUT, LOADING, LIVE].every((f) => sectionFiles.includes(f))
      && sectionUnscannable.length === 0 && lexiconFiles.length === sectionFiles.length + 1,
    j({ files: lexiconFiles.length, section: sectionFiles.length, walked: sectionAllFiles, unscannable: sectionUnscannable, literals: allLits.length, hits: litHits }));
  /* ⛔ AND THE JSX PROSE IS PROVABLY IN THE POPULATION. `ts.isStringLiteral` does not match a `JsxText` node, so
   * every string written as element content — every table header, every Callout body, the primary button's label —
   * was outside this guard, and the control could not reveal it because all three of its plants were attributes. */
  ok("4.453 · …and the population includes the page's JSX PROSE, not only its attribute literals",
    ["Designate an account", "Master switch", "Account", "Status", "Products"].every((s) => jsxLits.includes(s)),
    j({ pageStrings: jsxLits.length }));
  /* ⛔ THE PLANTED CONTROL, and it must fire: the real page with the head title and the switch's aria-label put back
   * to the words ruling 306 originally wrote. A guard whose control cannot fire is decoration. */
  const plantedTitle = pageRaw.replace('title="Desk"', () => 'title="House bots"');
  const plantedAria = pageRaw.replace('aria-label="Desk master switch"', () => 'aria-label="House bots master switch"');
  /* ⚠️ THE PLANT TARGETS THE CODE LINE, NOT THE BARE SENTENCE, and that is a measured trap: the module's own
   * docblock QUOTES the OFF sentence when it explains the state it replaced, and that comment comes FIRST in the
   * file — so a bare `String.replace` planted into a COMMENT and the control reported nothing fired. */
  const OFF_LINE = ': "The desk is off. Nothing will be staked.";';
  const plantedOff = read(GATE).replace(OFF_LINE, () => ': "House bots are off. No bot will place a bet.";');
  /* ⛔ THE FOURTH PLANT IS IN JSX TEXT, and it is the one the first control could not make: a header, in element
   * content, where `ts.isStringLiteral` never looked. */
  const plantedText = pageRaw.replace(">Products</th>", () => ">House bots</th>");
  const firedTitle = domLiterals(PAGE, plantedTitle).filter((s) => NEUTRAL.test(s));
  const firedAria = domLiterals(PAGE, plantedAria).filter((s) => NEUTRAL.test(s));
  const firedOff = domLiterals(GATE, plantedOff).filter((s) => NEUTRAL.test(s));
  const firedText = domLiterals(PAGE, plantedText).filter((s) => NEUTRAL.test(s));
  ok("4.453.c1 · CONTROL · the head title, the switch's aria-label, a table header in JSX TEXT and the gate's OFF sentence each go RED when put back to the words 453 replaced",
    plantedTitle !== pageRaw && plantedAria !== pageRaw && plantedText !== pageRaw && plantedOff !== read(GATE)
      && firedTitle.length === 1 && firedAria.length === 1 && firedOff.length >= 1 && firedText.length === 1,
    j({ firedTitle, firedAria, firedOff, firedText }));
  ok("4.453 · the three sentences ruling 453 FIXES are the ones in the code, word for word",
    gateCode.includes("The desk is off. Nothing will be staked.") && pageCode.includes('aria-label="Desk master switch"')
      && pageCode.includes('title="Desk"') && gateCode.includes('label: "Accounts"'), "");

  /* ⛔ 4.453.c2 · RULING 513's OWN CONTROL, AND IT IS A REAL FILE ON DISK. A virtual injection would prove the SCANNER
   * works; only a file actually written under `src/app/admin/desk/` proves the POPULATION is the directory, which is
   * the whole of 513 — every panel C7 steps 3-6 add lands exactly this way. Written, walked, scanned, then removed in a
   * `finally`, and the walk is re-run afterwards so a control that leaks its own plant is itself red. The name is not
   * one Next routes (`page`/`layout`/`route`/`loading`/`template`/`default`/`error`), so it serves nothing even in the
   * milliseconds it exists, and §4 runs in the MEMORY child only, so there is exactly one writer. */
  {
    const PLANT_REL = `${SECTION}/zz-ruling-513-control.tsx`;
    const PLANT_BODY = `
export default function Ruling513Control() {
  return <p title="House bots">Liquidity desk</p>;
}
`;
    const before = sectionWalk();
    let walkedWith: string[] = [];
    let plantHits: Array<readonly [string, string]> = [];
    let threw = "";
    writeFileSync(join(ROOT, PLANT_REL), PLANT_BODY);
    try {
      walkedWith = sectionWalk();
      const filesWith = [...walkedWith.filter(isScannable), GATE];
      plantHits = filesWith.flatMap((f) => domLiterals(f, read(f)).map((s) => [f, s] as const))
        .filter(([f, s]) => f === PLANT_REL && NEUTRAL.test(s));
    } catch (e) {
      threw = String((e as Error)?.message ?? e);
    } finally {
      unlinkSync(join(ROOT, PLANT_REL));
    }
    const after = sectionWalk();
    ok("4.453.c2 · CONTROL · ⛔ 513 · a file WRITTEN under src/app/admin/desk/ is picked up by the walk and BOTH its painted house words — an attribute and JSX prose — are reported; the plant is gone again afterwards and the walk is back to what it was",
      threw === "" && !before.includes(PLANT_REL) && walkedWith.includes(PLANT_REL) && walkedWith.length === before.length + 1
        && plantHits.some(([, s]) => s === "House bots") && plantHits.some(([, s]) => s === "Liquidity desk")
        && !after.includes(PLANT_REL) && j(after) === j(before),
      j({ before: before.length, withPlant: walkedWith.length, after: after.length, hits: plantHits.map(([, s]) => s), threw }));
  }

  /* 1.301 · THE SECTION GATE'S NEUTRAL `title`, AND WHY IT IS AN ID FIX RATHER THAN A WORD FIX. The gate titles its own
   * restricted panel from the LAST URL SEGMENT, and `looksLikeId` keeps a prefixed, digit-bearing segment VERBATIM — so
   * on the detail route the panel's heading would BE the record id, in a body the layout streams to any signed-in
   * account (ruling 259). Measured here on the real resolver, so the prop can never be "tidied away" as cosmetic.
   * ⚠️ The served half of this is NOT MEASURED until the detail route exists (C7 step 4): `/admin/desk/<id>` has no
   * page yet, so it 404s before any layout paints — recorded in `DEFERRED-TESTS.md`, never claimed as passed. */
  const NAV: Any = await import("../../src/components/admin/admin-nav-groups.ts");
  const ID_PATH = "/admin/desk/hb_0123456789abcdef01234567";
  ok("1.301 · without the prop the gate would head its restricted panel with the raw record id — the resolver is measured, not assumed",
    NAV.crumbsFromPath(ID_PATH).at(-1) === "hb_0123456789abcdef01234567"
      && NAV.crumbsFromPath("/admin/desk").at(-1) === "Desk", j(NAV.crumbsFromPath(ID_PATH)));
  ok("1.301 · …so the section layout passes the neutral section word itself, as a literal, and adds no condition of its own",
    /<AdminSectionGate title="Desk">\{children\}<\/AdminSectionGate>/.test(decomment(read(LAYOUT)))
      && !/isAdmin|houseConsoleAudience|currentSession/.test(decomment(read(LAYOUT))), "");
  ok("1.301 · …and the gate's `title` prop is OPTIONAL, so no other section changes",
    /title\?: string/.test(read("src/components/admin/admin-section-gate.tsx"))
      && /titleProp \?\? crumbsFromPath/.test(read("src/components/admin/admin-section-gate.tsx")), "");

  /* 1.300 / 1.380 · the gate is awaited FIRST, with a STRING LITERAL route, before the reader. */
  const gateAt = pageCode.indexOf('houseConsoleAudience(session?.userId ?? null, "/admin/desk")');
  const readerAt = pageCode.indexOf('houseRosterForConsole(session?.userId ?? null, "/admin/desk")');
  ok("1.300 · the page awaits `houseConsoleAudience` with a literal route BEFORE it calls the gated reader",
    gateAt > 0 && readerAt > gateAt, j({ gateAt, readerAt }));
  ok("1.380 · the route argument is a literal, never a header value", !/headers\(\)/.test(pageCode) && !/x-pathname/.test(pageCode));
  ok("1.302 / 1.356 · the route declares `force-dynamic` and a static neutral `metadata.title`",
    /export const dynamic = "force-dynamic"/.test(pageCode) && /export const metadata = \{ title: "Admin · Desk" \}/.test(pageCode));
  ok("1.356 · nothing in the section or the gate names a cache wrapper",
    ![pageCode, gateCode].some((c) => /unstable_cache|revalidate|next\/cache|"force-cache"/.test(c)));
  /* ⛔ 1.355's OTHER HALF, WHICH RULING 355's PROOF NAMES AND THE FIRST PASS DID NOT WRITE: "a pin that the readers
   * use a settling combinator and not `Promise.all`". Without it the only thing standing between the console and a
   * page that blanks on one failed read was the behavioural plants — and those cannot see the difference between
   * "settled" and "the child died", which is exactly what the declared `355-all` mutation produces. */
  ok("1.355 · the gated readers combine their reads with a SETTLING combinator, and name `Promise.all` nowhere",
    /await Promise\.allSettled\(\[/.test(gateCode) && !/await Promise\.all\(/.test(gateCode), "");
  /* ⛔ THE FIFTH READ IS NAMED AND PINNED AT ONE CALL (ruling 432(q)). §3 step 1 fixes the read set at four; the
   * Products column's words need `loadParseContext()`, which itself issues two platform reads (`listAssets` +
   * `listChains`). It is a deviation, recorded in 432, and it is held at ONE call so a later step cannot quietly add
   * a second context read inside the same render. */
  ok("1.347 · 432(q) · the reader's read set is the four house reads plus EXACTLY ONE `loadParseContext()`, all inside the one settled set",
    (gateCode.match(/loadParseContext\(\)/g) ?? []).length === 1
      && (gateCode.match(/houseBotControlStore\.get\(\)/g) ?? []).length === 1
      && (gateCode.match(/houseBotStore\.listNonRemoved\(\)/g) ?? []).length === 1
      && (gateCode.match(/houseDayBooks\(/g) ?? []).length === 1
      && (gateCode.match(/houseBookStore\.openExposure\(/g) ?? []).length === 1, "");

  /* 1.340 / 1.305 / 1.349 · the page names NO read module and no struck reader. */
  const STRUCK = ["houseBotBook", "HouseBotBook", "netTzs", "feeWithheldTzs", "gStaffEdge", "boardDisclosure",
    "houseStaffScorecard", "entryRows", "stakeRows", "feeInputs", "ledgerRows", "positionsForUser", "txnPageForUser",
    "houseStakeByMarket", "derivedFeeShares", "placedTimes", "countLive"];
  const sectionCode = sectionFiles.map((f) => decomment(read(f))).join("\n");
  ok("1.305 / 1.349 · no file under the section names a struck reader, a result field or a fee derivation",
    STRUCK.every((n) => !sectionCode.includes(n)), STRUCK.filter((n) => sectionCode.includes(n)).join(","));
  ok("1.340 · the page imports house data ONLY from the gate module — no `house-bot/*`, no DAL, no book, no cap-precheck",
    /from "@\/lib\/server\/house-console-read"/.test(pageCode)
      && !/from "@\/lib\/server\/house-bot/.test(pageCode) && !/house-bot-dal/.test(pageCode)
      && !/house-bot\/book|cap-precheck/.test(pageCode), "");
  ok("1.305 · and `houseBotBook` still has no caller anywhere under src/ but its own declaration",
    (() => {
      const hits: string[] = [];
      const walkSrc = (dir: string) => {
        for (const e of readdirSync(join(ROOT, dir))) {
          const rel = `${dir}/${e}`;
          if (statSync(join(ROOT, rel)).isDirectory()) walkSrc(rel);
          else if (/\.tsx?$/.test(e) && rel !== "src/lib/server/house-bot/book.ts" && decomment(read(rel)).includes("houseBotBook")) hits.push(rel);
        }
      };
      walkSrc("src");
      return hits.length === 0;
    })(), "");

  /* 1.319 · ONE home for the route. The RBAC and nav tables are named, because a route prefix CANNOT stay in one
   * file: the gate needs it in `roles.ts` and the sidebar highlight needs it in `admin-nav-groups.ts`, and both are
   * in the client import graph — which is ruling 320's whole reason for choosing a neutral segment. */
  const ALLOWED_ROUTE_FILES = new Set([ROUTES_MODULE, "src/lib/server/roles.ts", "src/components/admin/admin-nav-groups.ts", GATE, PAGE, LAYOUT]);
  const typers: string[] = [];
  const walkAll = (dir: string) => {
    for (const e of readdirSync(join(ROOT, dir))) {
      const rel = `${dir}/${e}`;
      if (statSync(join(ROOT, rel)).isDirectory()) walkAll(rel);
      else if (/\.(tsx?|mts|mjs)$/.test(e) && decomment(read(rel)).includes("/admin/desk") && !ALLOWED_ROUTE_FILES.has(rel)) typers.push(rel);
    }
  };
  walkAll("src");
  ok("1.319 · the console's route segment is typed in ONE module plus the RBAC and nav tables that must hold the prefix, and nowhere else in src/",
    typers.length === 0, typers.join(", "));
  ok("1.319 · the two sealed refusals take their href from that module, never from a literal",
    !decomment(read("src/lib/server/house-bot/designation.ts")).includes('"/admin/desk')
      && !decomment(read("src/lib/server/house-bot/eligibility.ts")).includes('"/admin/desk'), "");
  ok("1.319 · `LIMITS_TAB_HREF` is a RE-EXPORT of that module's builder, not a third spelling",
    R.LIMITS_TAB_HREF === CR.CONSOLE_LIMITS_HREF && CR.CONSOLE_LIMITS_HREF === `${CR.CONSOLE_ROUTE}?tab=limits`, R.LIMITS_TAB_HREF);
  ok("1.314 · the roster-full sentence is NOT re-typed under the section, and the eligibility row spells it identically to the exported one",
    !/roster is full|Roster full/i.test(sectionCode)
      && decomment(read("src/lib/server/house-bot/eligibility.ts")).includes("Remove an account or raise the roster limit on Limits →")
      && D.DESIGNATE_COPY.rosterFull(1, 1).includes("Remove an account or raise the roster limit on Limits →"), "");

  /* 1.312a · the rail renders exactly the closed list's keys — ONE at this step — and every other `?tab=` resolves
   * to it. ⛔ A rail option whose panel is not written is a dead control. */
  ok("1.312a · the rail's options come from the closed list, and the page renders a panel for every key in it",
    /CONSOLE_TABS\.map/.test(pageCode) && CR.CONSOLE_TABS.every((k: string) => pageCode.includes(`tab === "${k}"`))
      && CR.CONSOLE_TABS.length === 2 && j([...CR.CONSOLE_TABS]) === j(["roster", "limits"]), j(CR.CONSOLE_TABS));
  /* ⛔ A TAB EXISTS ONLY WITH ITS PANEL (ruling 312), AND THE LIST GROWS ONE KEY PER PANEL. The `limits` key joined
   * it at C7 step 3 with the panel below; `activity` and `history` join at step 5. This case is what stops a rail
   * option shipping ahead of the thing it opens — a dead control in its honest-looking half (432(i)). */
  ok("1.312a · the closed list holds a key for EVERY panel the page renders, and a panel for every key — neither ahead of the other",
    j([...new Set([...pageCode.matchAll(/tab === "([a-z-]+)"/g)].map((m) => m[1]))].sort()) === j([...CR.CONSOLE_TABS].sort()), "");
  for (const raw of [undefined, "", "limitz", "roster", ["roster", "limits"] as Any]) {
    ok(`1.302 · \`?tab=${j(raw)}\` resolves to the roster — never a 404 and never a redirect`, CR.consoleTab(raw) === "roster", j(CR.consoleTab(raw)));
  }
  ok("1.302 · `?tab=limits` now resolves to the LIMITS panel, because the panel exists", CR.consoleTab("limits") === "limits", j(CR.consoleTab("limits")));
  ok("1.302 · `notFound()` is not called anywhere in the section — it is reserved for a missing RECORD on the detail route",
    !sectionCode.includes("notFound"), "");
  /* ⛔ THE PROBE READS THE FILE RAW, COMMENTS AND ALL. `house-bot-console-probe.mts` discovers a page's tabs with
   * `/tab === "([a-z-]+)"/g` over `readFileSync`, so a COMMENT that quotes the idiom invents a `?tab=` instance that
   * no panel answers and the probe then requests a page that does not exist. Both forms are asserted: the RAW file
   * must yield exactly the closed list, in rail order. */
  ok("1.315 · the tab selection is written in the shipped idiom the served probe discovers tabs by — in the RAW file, comments included",
    [...new Set([...pageRaw.matchAll(/tab === "([a-z-]+)"/g)].map((m) => m[1]))].join(",") === CR.CONSOLE_TABS.join(",")
      && [...new Set([...pageCode.matchAll(/tab === "([a-z-]+)"/g)].map((m) => m[1]))].join(",") === CR.CONSOLE_TABS.join(","),
    j([...pageRaw.matchAll(/tab === "([a-z-]+)"/g)].map((m) => m[1])));

  /* 1.373 / 1.407 · money SECOND and THIRD, every money cell `tabular` + `.amount`, no min-width on a money table. */
  const thead = /<thead[\s\S]*?<\/thead>/.exec(pageCode)?.[0] ?? "";
  /* ⚠️ `<th\s` — the whitespace is load-bearing: `<th[^>]*>` also matches `<thead …>`, which put an empty first
     entry in front of every header and made this case report a 7-column table as an 8-column one. */
  const headers = [...thead.matchAll(/<th\s[^>]*>([^<]*)</g)].map((m) => m[1].trim());
  /* ⛔ SIX COLUMNS, NOT SEVEN, AND THE MISSING ONE IS THE WAY OUT (ruling 432(h)) — `/admin/desk/[id]` has no page
   * until step 4, so the column arrives with the page it opens. "Last bet" is step 5's (432(g)). */
  ok("1.310 / 1.373 · the roster's headers are the control facts, in order, with money second and third",
    j(headers) === j(["Account", "Loss today (projected)", "Open exposure", "Status", "Bets today", "Products"]), j(headers));
  ok("1.373 · the basis is NAMED IN THE HEADER — a column headed 'Loss today' with no basis is the ambiguity 366 exists to prevent",
    headers[1] === "Loss today (projected)", headers[1]);
  /* ⛔ AND THE HEADER MAY WRAP, WHICH IS WHAT KEEPS THE FIGURE ON SCREEN (ruling 432(o)). `.admin-tbl th` is
   * `white-space: nowrap`, so 22 tracked-mono characters set this column's minimum at ~210px and — the cells being
   * right-aligned — PINNED the figure to that far edge: read off the 360 tile, the header's ")" and the row's
   * "used TZS 0" were both sliced by the card's right edge. §A5 is never clip money. */
  ok("1.373 · 432(o) · every money-bearing header may WRAP, so a long basis costs thead height and not a clipped figure",
    (thead.match(/!whitespace-normal/g) ?? []).length === 3
      && /<th scope="col" className="text-right p-3 !whitespace-normal">Loss today \(projected\)<\/th>/.test(pageCode)
      /* ⛔ THE `!` IS THE ASSERTION. `.admin-tbl th` is (0,1,1) and a bare utility is (0,1,0), so the class LOST to
         the stylesheet: the first fix compiled, passed every source pin, and left the figure sliced on screen. */
      && !/className="text-right p-3 whitespace-normal"/.test(pageCode), "");
  /* ⛔ AND THE BAND AND THE COLUMN CALL THE SAME FIGURE THE SAME THING (432(o)): the tile above reads "Open exposure"
   * and the column below it read "Exposure", which is the one word a reader uses to tie the two together. */
  ok("1.373 · 432(o) · every money column's header is the label of the tile that measures the same figure",
    headers[2] === "Open exposure" && gateCode.includes('moneyTile("Open exposure"') && gateCode.includes('moneyTile("Loss today"'), j(headers));
  /* ⛔ AND THE COUNT USAGE READS ON THE SAME AXIS AS THE TWO MONEY USAGES BESIDE IT (432(o)): same grammar, same
   * shape, three adjacent figures — left-aligning one of them put them on two axes. */
  ok("1.407 · 432(o) · every usage column is right-aligned, so three adjacent usage figures read on ONE axis",
    (pageCode.match(/<th scope="col" className="text-right p-3 !whitespace-normal">/g) ?? []).length === 3
      && (pageCode.match(/<td className="p-3 text-right(?: text-text-secondary)?"><Usage cell=/g) ?? []).length === 3, "");
  ok("1.373 · no header reads 'House stake', 'Today net' or 'Live balance'",
    !/House stake|house stake|Today net|Live balance/.test(pageCode), "");
  /* 1.373 · THE TABLE ITSELF CARRIES NO `min-w-*`, and the money CELLS carry no `.tabular`, and both are the same
     decision, MEASURED at 360 on the real page: a pair bound into one unbreakable line made each money column 243px,
     put the second answer at 357→600 on a 360 viewport, and left the account column at 93px. Ruling 373's named
     fallback (the cap in the column HEADER) is unbuildable — the cap is PER ACCOUNT. So the pair WRAPS: each amount
     stays indivisible through the kit's own `.amount` nowrap, and the subject column gets a floor of its own. */
  ok("1.373 · the money-bearing TABLE carries no `min-w-*` of its own — a width on the table stretches every column",
    /<table className="admin-tbl">/.test(pageCode), "");
  /* ⛔ NO MONEY COLUMN CARRIES A FLOOR — only the SUBJECT and the STATUS column do, and each for a measured reason:
   * without the subject floor the account column absorbed the whole shortfall and laid out at 93px at 360; without
   * the status floor the AUTO-PAUSED chip rendered as a TWO-LINE pill beside single-line ones at every width up to
   * 1280, and it cannot be fixed on the Chip (an inline `whiteSpace: "normal"` beats any class). Ruling 432(b), (o). */
  ok("1.373 · …and only the SUBJECT and STATUS columns carry a floor — never a money column, which would pin its figure off-screen",
    /<th scope="col" className="text-left p-3 min-w-\[150px\]">Account<\/th>/.test(pageCode)
      && /<th scope="col" className="text-left p-3 min-w-\[128px\]">Status<\/th>/.test(pageCode)
      && (pageCode.match(/min-w-\[/g) ?? []).length === 2
      && !/text-right p-3[^"]*min-w-\[/.test(pageCode), "");
  /* ⛔ ONLY THE FIGURE IS IN `.amount` (ruling 409). Wrapping "used" and "of" inside it put prose in the money face
   * and made each unbreakable unit wider than the figure it protected — the constraint 432(b) was solving. A COUNT
   * is not money, so it takes the mono/tabular face without `.amount`'s meaning. */
  ok("1.407 / 1.409 · every `<th>` carries `scope=\"col\"`; the FIGURE alone is `.amount tabular-nums`, its words are not, and no cell is bound by `.tabular`",
    headers.length === (thead.match(/scope="col"/g) ?? []).length
      && /const figure = cell\.money \? "amount tabular-nums" : "font-mono tabular-nums";/.test(pageCode)
      && (pageCode.match(/className=\{figure\}/g) ?? []).length === 1
      && !/className="amount tabular-nums">\{cell\./.test(pageCode)
      && !/td className="[^"]*\btabular\b/.test(pageCode), "");
  /* ⛔ THE WAY OUT EXISTS EXACTLY WHEN THE PAGE IT OPENS EXISTS (ruling 432(h)). Every row shipped a live
   * `open →` to `/admin/desk/<id>` while that route had no page, so the first control an officer reaches on the
   * deliverable answered the app-root 404 — the same defect the head action and the master switch are rendered
   * disabled for. Tying the assertion to the FILE means step 4 turns the column on and no checkpoint in between can
   * ship a 404 link. */
  ok("1.407 · 432(h) · the roster carries a way-out link EXACTLY when `/admin/desk/[id]/page.tsx` exists",
    existsSync(join(ROOT, DETAIL_PAGE)) === /className="row-link/.test(pageCode),
    j({ detailPage: existsSync(join(ROOT, DETAIL_PAGE)), rowLink: /className="row-link/.test(pageCode) }));
  ok("1.407 · 432(h) · …and the same rule for the wizard: no `/admin/desk/new` link while it has no page",
    existsSync(join(ROOT, `${SECTION}/new/page.tsx`)) === /href=\{[^}]*designateHref/.test(pageCode),
    j({ newPage: existsSync(join(ROOT, `${SECTION}/new/page.tsx`)) }));
  /* ⛔ AND NO RENDERED LINK NAMES A `?tab=` VALUE WITH NO PANEL BEHIND IT (ruling 432(i)). `consoleTab()` resolves an
   * unknown tab BACK to the roster, so such a link repaints the identical page with no message — a dead control. */
  /* ⭐ C7 STEP 3 TURNED BOTH SITES ON, AND THE FLAG STILL DECIDES. `LIMITS_TAB_READY` is derived from
   * `CONSOLE_TABS`, so the two guarded sites paint LINKS today and would fall back to plain text the moment the key
   * left the list — which is exactly the rule steps 4 and 5 inherit for `activity`, `history`, `rules` and
   * `targets`. ⛔ BOTH BRANCHES ARE STILL GUARDED IN SOURCE: deleting the ternary would ship the link
   * unconditionally, which is the dead control 432(i) was written for. */
  ok("1.312a · 432(i) · both limits pointers are still GUARDED by the flag, and the flag is derived from the closed list — never typed",
    (pageCode.match(/LIMITS_TAB_READY/g) ?? []).length === 3
      && CR.LIMITS_TAB_READY === CR.CONSOLE_TABS.includes("limits")
      && CR.LIMITS_TAB_READY === true && CR.consoleTab("limits") === "limits", j({ ready: CR.LIMITS_TAB_READY }));
  /* ⛔ AND THE INERT BRANCH KEEPS ITS PROOF, AT THE FUNCTION LEVEL. `LIMITS_TAB_READY` is now true, so the
   * plain-text branch cannot execute in any render — and a proof deleted the day its branch stops running is how the
   * next dead control ships. `stripLinkedTail`'s behaviour and the reader's `rosterFullPlain` are therefore asserted
   * DIRECTLY (§2 above, 1.314/432(i)), and the page is held to still carrying the plain form for the states
   * steps 4 and 5 will re-open. */
  ok("1.312a · 432(i) · the inert form is still BUILT and still reachable from the page, though its branch no longer executes",
    pageCode.includes("view.rosterFullPlain") && read(GATE).includes("function stripLinkedTail(")
      && decomment(read(GATE)).includes("stripLinkedTail(rosterFullReason)"), "");
  ok("1.312a · 432(i) · …and every `<Link href=` in the section points at one of the gate's own console hrefs, never a literal",
    [...pageCode.matchAll(/<Link href=\{([^}]*)\}/g)].length >= 2
      && [...pageCode.matchAll(/<Link href=\{([^}]*)\}/g)].every((m) => /view\.limitsHref|view\.limitsFirstUnsetHref|unsetHref/.test(m[1])),
    j([...pageCode.matchAll(/<Link href=\{([^}]*)\}/g)].map((m) => m[1])));
  /* ⛔ THE ANCHOR'S HREF IS ONE LITERAL — because `test:tab-anchors` reads SOURCE TEXT and a template built from
   * `${CONSOLE_ROUTE}` is invisible to it — and it is held EQUAL to the composed form so the literal cannot rot. */
  ok("1.306 · the first-unset href is a literal the anchor guard can see, and it equals the composed form exactly",
    CR.CONSOLE_LIMITS_FIRST_UNSET_HREF === `${CR.CONSOLE_LIMITS_HREF}#${CR.LIMITS_FIRST_UNSET_ID}`
      && CR.CONSOLE_LIMITS_FIRST_UNSET_HREF === "/admin/desk?tab=limits#limits-first-unset"
      && read(ROUTES_MODULE).includes('"/admin/desk?tab=limits#limits-first-unset"'), CR.CONSOLE_LIMITS_FIRST_UNSET_HREF);
  /* ⛔ AND THE ID IS RENDERED INSIDE THE LIMITS GROUP, AS A LITERAL, IN BOTH BRANCHES. Measured on this file:
   * `id={cond ? "limits-first-unset" : undefined}` is invisible to the guard, and the same literal inside a helper
   * FUNCTION sits above every tab group and reads as "above the rail (every tab)" — a PASS that proves nothing. */
  {
    const open = pageCode.indexOf('{tab === "limits" && (<>');
    const close = pageCode.indexOf("</>)}", open);
    const idAt = pageCode.indexOf('id="limits-first-unset"');
    ok("1.306 · the anchor is rendered as a LITERAL id inside the limits group — the form `test:tab-anchors` can actually see",
      open > 0 && idAt > open && close > idAt
        && (pageCode.match(/id="limits-first-unset"/g) ?? []).length === 1
        && !/id=\{[^}]*limits-first-unset/.test(pageCode),
      j({ open, idAt, close }));
  }
  /* ⛔ AND THE LINKED SENTENCE IS PAINTED ONLY INSIDE THAT ONE `<Link>`. Everywhere else the head paints the PLAIN
   * form, because the server's sentence ends in an arrow and an arrow on inert text is a promise of navigation to a
   * tab that is not on the rail. The sibling in the strip already did this by writing two different strings; the
   * head passed the linked string straight through. */
  /* ⛔ `rosterFull` READS the field as a predicate, which is not PAINTING it, so that one line is named and removed
   * before the rest of the file is scanned for a paint. Everything else that reaches the DOM must be the plain form. */
  const outsideLink = pageCode
    .replace(new RegExp("<Link[^]*?</Link>", "g"), () => "")
    .replace("const rosterFull = view.rosterFullReason !== null;", () => "");
  ok("1.312a · 432(i) · the head paints the LINKED roster-full sentence only inside the one guarded `<Link>`, and the PLAIN one everywhere else",
    /<Link[^>]*>\{view\.rosterFullReason\}<\/Link>/.test(pageCode)
      && pageCode.includes("view.rosterFullPlain")
      && !outsideLink.includes("view.rosterFullReason"),
    j({ paintedOutsideTheLink: outsideLink.includes("view.rosterFullReason") }));

  /* ⛔ 432(n) IN THE HALF NOBODY CHECKED: THE CALLOUT BODIES. "NO STATE SAYS THE SAME FACT TWICE" was applied to the
   * empty states and not to the three auto-off Callouts, every one of which ended "Nothing will be staked." — the
   * strip's own fixed OFF sentence, repeated one card below it, about 60px away at 1280 and about 150px at 360 (read
   * off desk-sunset-full-1280.png and desk-sunset-full-360.png, where "The desk is off. Nothing will be staked."
   * sits directly above "The desk has been withdrawn. Nothing will be staked, and nothing can be designated.").
   * ⛔ THIS IS NOT THE 453-versus-432(n) COLLISION IT LOOKS LIKE. Ruling 453 fixes the STRIP sentence verbatim "for
   * every off cause" and says nothing whatever about the Callout bodies, which are this commit's own copy: the strip
   * owns "the desk is off", the Callout owns WHY, and neither has to say the other's sentence. */
  const calloutBodies = [...pageCode.matchAll(new RegExp("<Callout[^>]*>([^]*?)</Callout>", "g"))]
    .map((m) => m[1].replace(/\s+/g, " ").trim());
  ok("1.308 · 432(n) · no auto-off Callout body repeats the strip's own OFF sentence — the strip says the desk is off, the Callout says WHY",
    calloutBodies.length >= 3 && calloutBodies.every((b) => !b.includes("Nothing will be staked")), j(calloutBodies));
  ok("1.308 · 432(n) · CONTROL · the Callout bodies were really read, and the clause the strip owns IS the reader's own OFF sentence",
    calloutBodies.length >= 3 && calloutBodies.every((b) => b.length > 40)
      && gateCode.includes("The desk is off. Nothing will be staked."), j(calloutBodies.map((b) => b.length)));

  /* 1.361 · no banned formatter, here or in the gated reader. */
  const BANNED = ["formatTzsSigned", "formatTzsAbs", "formatWhole", "toLocaleString"];
  ok("1.361 · no console file or gated reader calls a banned money formatter or declares a local one",
    BANNED.every((n) => !pageCode.includes(n) && !gateCode.includes(n)), BANNED.filter((n) => pageCode.includes(n) || gateCode.includes(n)).join(","));
  ok("1.361 · `formatTzsCompact` appears only in the KPI value slot's one sanctioned home",
    !pageCode.includes("formatTzsCompact") && (gateCode.match(/formatTzsCompact/g) ?? []).length <= 2, "");

  /* 1.306(c) / 1.404 · never gold, never a tone, never a pulse. */
  ok("1.306 · no file under the section contains `gold` or `gilt` — gold is earned money only, and `test:gold-is-money` is scoped to two identity files and could never report a tile here",
    !/gold|gilt/i.test(sectionCode), "");
  ok("1.404 · no `AdminKpi` under the section receives `gold`, `tone`, `pulse` or `series`",
    !/(gold|tone|pulse|series)=\{?/.test(/<AdminKpi[\s\S]*?\/>/.exec(pageCode)?.[0] ?? ""), "");
  ok("1.306 · the Toggle is `tone=\"brand\"` — never gold (earned money) and never claret (ON MEANS STOPPED)",
    /<Toggle[^>]*tone="brand"/.test(pageCode), "");

  /* 1.311 · the status word and chip have exactly ONE definition site. */
  ok("1.311 · no status word is typed beside a chip under the section, and none of them imports `status-tone` for a house tone",
    !/(>Active<|>Paused<|>Auto-paused<|>Removed<)/.test(pageCode) && !/status-tone/.test(sectionCode), "");

  /* 1.313 / 1.417 · the loaders. */
  ok("1.313 · the roster loader carries the REAL neutral head, and no string in it matches the shared vocabulary",
    /<AdminPageHead title="Desk" sw="Dawati"/.test(decomment(read(LOADING)))
      && domLiterals(LOADING, read(LOADING)).every((s) => houseHits(s).length === 0), "");
  const ghosts = [...decomment(read(LOADING)).matchAll(/<(Sk[A-Za-z]+|div)\b/g)].map((m) => m[1]);
  ok("1.417 · the loader's ghost sequence matches the page's card sequence, one ghost per card, in order: the head's action, the strip, the band, the rail, the table",
    j(ghosts) === j(["SkChip", "SkCard", "SkKpiRow", "div", "SkTableCard"]), j(ghosts));
  /* ⛔ AND THE HEAD'S OWN ACTION ROW IS GHOSTED, AT THE HEIGHT THE CONTROL REALLY IS. The page's head ALWAYS renders a
   * 44px disabled primary and its reason (432(a), 432(j)) and the loader's head carried NO `actions` at all;
   * `AdminPageHead` is `flex items-end justify-between gap-4 flex-wrap`, so at 360 the real actions wrap onto their
   * own row and the whole page drops about 105px on the swap (read off desk-default-360.json: the button alone is
   * t=239 h=44, ending at y=283, against a ghost head that ends near y=195). The closest kit neighbour states the
   * rule in its own words and obeys it — `/admin/house/loading.tsx` passes `actions={<SkChip … />}` with the comment
   * "a ghost the wrong height is a layout jump". Ruling 417's own read was taken at 1280, where the title block is
   * taller than the action row and hides the defect entirely. */
  ok("1.417 · the loader ghosts the head's action row whenever the page's head renders a control, at that control's own height",
    /<Button[^>]*size="md"/.test(pageCode) === /actions=\{<SkChip[^>]*h-\[44px\]/.test(decomment(read(LOADING))),
    j({ pageControl: /<Button[^>]*size="md"/.test(pageCode) }));
  /* ⛔ `cellPy` IS A FACT ABOUT THE PAGE, NOT A DEFAULT. The page overrides every cell to `p-3`, which is 16px on this
     repo's own spacing scale, so a 12px ghost is 8px short on every row — measured on the swap at 1280 (279px of ghost
     against 361px of table). The assertion reads the PAGE's own padding class and requires the ghost to agree with it,
     so the pair cannot drift apart in either direction. */
  /* ⛔ THE COLUMN COUNT IS READ FROM THE PAGE, NEVER TYPED TWICE. The way-out column left with 432(h) and a ghost
   * that still drew seven would be a one-column jump on every swap. */
  ok("1.417 · the table ghost states the page's real facts — the PAGE's own column count, no pager, and a cell padding read from the page's own class",
    new RegExp(`cols=\\{${headers.length}\\}`).test(read(LOADING)) && !/pager/.test(read(LOADING))
      && /className="p-3/.test(pageCode) === /cellPy=\{16\}/.test(read(LOADING)), `headers=${headers.length}`);
  /* ⛔ AND THE LOADER'S DOCBLOCK MAY NOT CONTRADICT ITS OWN CALL SITE. It claimed "`.admin-tbl`'s own 12px cell
   * padding — this page overrides no cell padding" six lines above `cellPy={16}` and a note explaining that the page
   * overrides every cell to `p-3`, which IS 16px on this repo's scale. A false authority in the file the next step
   * reads first is the wrong-AUTHORITY class this programme has paid for repeatedly. */
  ok("1.417 · …and the loader's own prose does not contradict it — one statement of the cell padding, not two",
    !/overrides no cell padding/.test(read(LOADING)) && !/12px cell padding/.test(read(LOADING)), "");

  /* 1.403 · a gloss only where the word already ships. */
  const glosses = [...sectionFiles.flatMap((f) => [...read(f).matchAll(/sw="([^"]+)"/g)].map((m) => m[1]))];
  const shipped = read("src/lib/i18n-dict.ts") + read("src/lib/admin-status-lexicon.ts");
  ok("1.403 · every Swahili gloss the section passes occurs verbatim in a shipped source — nothing invented, nothing machine-translated",
    glosses.length >= 2 && glosses.every((g) => shipped.includes(g)), j(glosses));
  ok("1.403 · the page renders no `<main>`, no `<h1>` and no second header of its own",
    !/<main|<h1/.test(pageCode), "");

  /* 1.422 · read-only is unreachable BY CONSTRUCTION on an Owner-only route, so no page may draw one. */
  ok("1.422 · no file under the section renders `ActReadOnlyBanner`, reads `mayAct`, or declares a viewer/role/mayView/isOwner prop",
    !/ActReadOnlyBanner|mayAct|isOwner|mayView/.test(sectionCode), "");
  /* ⛔ 1.422's ROLL-CALL, MEASURED OVER THE LABELS THIS RUN ACTUALLY EMITTED. It used to assert the literal `true`:
   * it named the seven states in its own label and could never fail, so a state whose case was deleted was not
   * reported — a vacuous assertion inside the suite whose own law is that every assertion must be shown able to
   * fail. Each state below names the substring its own case's label must carry, in THIS run. */
  {
    const HOMES: Array<[string, string[]]> = [
      ["loading", ["1.313 · the roster loader carries the REAL neutral head", "1.417 · the loader's ghost sequence"]],
      ["error", ["1.355 · a failed ROSTER read is", "1.355 · a failed MONEY read", "1.355 · a failed EXPOSURE read"]],
      ["schema-not-ready", ["1.421 · a `HouseSchemaNotReady` renders the schema STATE"]],
      ["unreadable", ["1.421 · a GENERIC control failure is NOT collapsed"]],
      ["empty", ["1.310 · with NO account the OFF state's own title wins"]],
      ["read-only", ["1.422 · no file under the section renders `ActReadOnlyBanner`"]],
    ];
    const missing = HOMES.filter(([, subs]) => !subs.every((s) => emitted.some((l) => l.includes(s)))).map(([n]) => n);
    ok("1.422 · every state this checkpoint can reach was exercised by a named case in THIS run — loading, error, schema-not-ready, unreadable, empty, read-only (stale and pending are C7 step 4's)",
      missing.length === 0, missing.join(", "));
    ok("1.422 · CONTROL · the roll-call reads the run's own labels, so a state whose case is deleted is reported",
      emitted.length > 60 && !emitted.some((l) => l.includes("1.999 · a case that does not exist")), `${emitted.length} labels`);
  }

  /* ⛔ 1.330 / 1.401 · THE SECTION'S CLIENT FILES, AND WHAT MAY NOT BE IN ONE. C7 step 3 added the first
   * (`desk-live.tsx`, the strip's one `RefreshPoller`), so this assertion has a population for the first time.
   * ⛔ NO HOUSE MODULE, BY VALUE OR BY TYPE (384): a type-only import is erased by the bundler and invisible to the
   * disclosure walker, which is exactly the shape that survives review and becomes a value import in one careless
   * edit — so the pin is on the SPECIFIER, which catches both.
   * ⛔ NO ROUTE LITERAL AND NO ROUTE KEY (330): `admin-nav-groups.ts`'s tables ship verbatim in a public chunk, and
   * the console's whole segment choice rests on nothing else naming it from a client file. */
  {
    const clientFiles = sectionFiles.filter((f) => read(f).includes('"use client"'));
    const HOUSE_SPECIFIERS = ["@/lib/house-bot/", "@/lib/server/house-bot", "house-bot-dal", "house-console-read", "./console-routes"];
    const clientCode = clientFiles.map((f) => decomment(read(f))).join("\n");
    ok("1.330 · 1.401 · no client file of the section names a house module in ANY import form, or types the console's route or route key",
      clientFiles.length >= 1
        && HOUSE_SPECIFIERS.every((m) => !clientCode.includes(m))
        && !clientCode.includes("/admin/desk") && !/ROUTE_KEYS|CRUMB_LABELS|NAV_GROUPS/.test(clientCode),
      j({ clientFiles, hits: HOUSE_SPECIFIERS.filter((m) => clientCode.includes(m)) }));
    ok("1.401 · no client file of the section names a notification KIND or reaches the notification registry (386)",
      !/HOUSE_BOT|notification-filters|comms-registry|detail\.notification/.test(clientCode)
        && clientCode.includes('eventName="50pick:sse:notification"'), "");
    /* ⛔ AND THE MONEY GUARDS ARE TOLD HOW TO SEE THIS SECTION'S MONEY (401). `test:type-scale` detects money only
     * through a literal `formatTzs*` call inside an element whose whole content is text — and every figure here
     * arrives as an already-formatted STRING from the server, so that detector is blind to the entire section. The
     * source fact is asserted directly: every element that paints a money value carries `amount` at its OWN call
     * site, and no money value is passed into a tracked or sub-body rung without it. */
    const moneySites = [...pageCode.matchAll(/"([^"]*\bamount\b[^"]*)"/g)].map((m) => m[1]);
    ok("1.401 · every money element under the section carries `amount` at its own call site, and none of them is on a tracked or micro rung",
      moneySites.length >= 3 && moneySites.every((c) => !/text-micro|text-caption|tracking-/.test(c)),
      j(moneySites));
    ok("1.401 · 409 · the limits list chooses its face from the ROW, so a count never lands in `.amount`",
      /row\.money \? "amount tabular-nums text-body-sm text-text" : "font-mono tabular-nums text-body-sm text-text"/.test(pageCode), "");
    ok("1.401 · CONTROL · the walked money sites are the ones the page really paints — the roster's figure, the bar caption's figures and the limit list's value",
      pageCode.includes('const figure = cell.money ? "amount tabular-nums"')
        && pageCode.includes('<span className="amount tabular-nums">{h.figure}</span>')
        && pageCode.includes('"amount tabular-nums text-body-sm text-text"'), j(moneySites));
  }

  /* ⛔ 1.316 / 473 · THE PAGE'S ONE LIVE TRIGGER, IN THE STRIP, ON `LIVE_ROUND_MS`, ENABLED FROM REACT STATE. */
  {
    const liveFile = `${SECTION}/desk-live.tsx`;
    const liveCode = decomment(read(liveFile));
    const stripAt = pageCode.indexOf("<AdminCard padding=\"p-4\">");
    const pollerAt = pageCode.indexOf("<DeskLive live={view.live} />");
    const railAt = pageCode.indexOf("<Tabs");
    ok("1.316 · exactly ONE `RefreshPoller` in the whole section, and it is mounted from the strip — ABOVE the rail, so no tab switch remounts it",
      (sectionFiles.map((f) => decomment(read(f))).join("\n").match(/<RefreshPoller/g) ?? []).length === 1
        && (pageCode.match(/<DeskLive /g) ?? []).length === 1
        && stripAt > 0 && pollerAt > stripAt && railAt > pollerAt, j({ stripAt, pollerAt, railAt }));
    ok("1.316 · it polls on `LIVE_ROUND_MS` (20s, against ruling 353's 30s staleness threshold), never the component's 30s default",
      /intervalMs=\{LIVE_ROUND_MS\}/.test(liveCode) && liveCode.includes('from "@/lib/refresh-cadence"')
        && (await import("../../src/lib/refresh-cadence.ts") as Any).LIVE_ROUND_MS === 20_000, "");
    ok("1.316 · `enabled` is composed from REACT STATE and the server's own verdict — and no file under the section asks the DOM whether a dialog is open",
      /useState/.test(liveCode) && /enabled=\{deskPollerEnabled\(live, holds\)\}/.test(liveCode)
        && !/querySelector|\[role=.?dialog|getElementsBy/.test(sectionFiles.map((f) => decomment(read(f))).join("\n")), "");
  }

  /* ⛔ 1.362 / 1.409 · THE KIT'S NEW CAPTION PAIR, AND THE ONE EXISTING CALLER IS UNTOUCHED. */
  {
    const bar = decomment(read("src/components/ui/progress-bar.tsx"));
    ok("1.362 · the kit's built-in numeric line renders ONLY when no caption is given — never two lines, and never a tracked bare number under a named cap",
      /\{caption \? \(/.test(bar) && /aria-valuetext=\{captionText\}/.test(bar)
        && (bar.match(/value\.toLocaleString\(\)/g) ?? []).length === 1, "");
    ok("1.362 · the two caption props are a PAIR the type refuses to split — a ReactNode cannot be an aria attribute, and one without the other stamps `[object Object]`",
      /caption\?: undefined; captionText\?: undefined/.test(bar) && /caption: ReactNode;/.test(bar) && /captionText: string;/.test(bar), "");
    ok("1.362 · the one existing caller passes no caption and keeps the kit's own line (§K5: extend the kit, never fork it)",
      !/caption(Text)?=/.test(decomment(read("src/app/admin/retention/purge-chain-card.tsx"))), "");
    /* ⛔ EVERY MONEY BAR UNDER THE SECTION PASSES BOTH PROPS, BUILT FROM THE SAME EXPRESSIONS, AND NONE IS CLARET. */
    const bars = [...pageCode.matchAll(/<ProgressBar[\s\S]*?\/>/g)].map((m) => m[0]);
    ok("1.409 · every money bar passes BOTH caption props from the same row, names its cap FIRST, and is never claret",
      bars.length === 1 && bars.every((b) => /captionText=\{row\.captionText\}/.test(b) && /caption=\{/.test(b)
        && /\{row\.name\}/.test(b) && /tone="brand"/.test(b) && !/tone="claret"/.test(b)), j(bars.length));
    ok("1.409 · the caption's FIRST text node is the cap's name and each figure sits in its OWN `.amount` span — `label` is `aria-label` and paints nothing",
      /caption=\{\s*<>\s*\{row\.name\}/.test(pageCode)
        && /<span className="amount tabular-nums">\{h\.figure\}<\/span>/.test(pageCode), "");
    ok("1.409 · `captionText` is PLAIN — no markup, no `<span`, and it carries 361's grammar after the cap's name",
      decomment(read(GATE)).includes("captionText: `${name} · ${cell.text}`")
        && !/captionText=\{[^}]*</.test(pageCode), "");
  }

  /* ⛔ 1.405 · THE RAIL IS THE KIT'S LINE VARIANT, URL-BACKED, WITH ITS COUNT THROUGH `CountBadge`. */
  {
    const rail = /<Tabs[\s\S]*?\/>/.exec(pageCode)?.[0] ?? "";
    ok("1.405 · the rail is `variant=\"line\"`, URL-backed from 319's one home, and carries no eyebrow, uppercase or tracking of its own",
      /variant="line"/.test(rail) && /href: consoleTabHref\(k\)/.test(rail)
        && !/eyebrow|uppercase|tracking-|rank="dense"|data-filter-rail|ScrollX/.test(rail), j(rail.replace(/\s+/g, " ").slice(0, 200)));
    ok("1.405 · the labels are English sentence case, one per key of the closed list",
      j(CR.CONSOLE_TABS.map((k: string) => ({ roster: "Roster", limits: "Limits" } as Any)[k])) === j(["Roster", "Limits"])
        && /TAB_LABEL: Record<\(typeof CONSOLE_TABS\)\[number\], string>/.test(pageCode), "");
    /* ⛔ THE COUNT IS THE STRIP'S OWN NUMBER, PASSED AS `TabItem.count` SO THE KIT'S `CountBadge` PAINTS IT — never
     * a bare number typed into a label, and never a second derivation. `CountBadge` renders nothing at 0, which is
     * why a count may not stand in for a read's health (312). */
    ok("1.405 · the limits badge is `TabItem.count` — the kit's `CountBadge` — and it is the SAME field the strip's sentence reads",
      /count: k === "limits" \? view\.unsetRequired : undefined/.test(pageCode)
        && !/REQUIRED_FOR_MASTER_ON/.test(pageCode) && !/\.filter\(/.test(pageCode)
        && /count\?: number;/.test(read("src/components/ui/tabs.tsx"))
        && read("src/components/ui/tabs.tsx").includes("CountBadge"), "");
  }

  /* ⛔ 1.406 · THE SWITCH, THE ENGINE STATE AND EVERY CAP BREACH LIVE ABOVE THE RAIL ON EVERY TAB — provable now
   * that a second panel exists. Each of them is rendered OUTSIDE the `?tab=` switch, so no tab can own one. */
  {
    const firstPanel = pageCode.indexOf('{tab === "roster" && (<>');
    const sites: Array<[string, number]> = [
      ["the master-switch strip", pageCode.indexOf("Desk master switch")],
      ["the auto-off Callout", pageCode.indexOf("<Callout tone=\"warning\"")],
      ["the schema Callout", pageCode.indexOf("<Callout tone=\"neutral\"")],
      ["the KPI band", pageCode.indexOf("<KpiGrid")],
      ["the rail", pageCode.indexOf("<Tabs")],
      ["the live poller", pageCode.indexOf("<DeskLive")],
    ];
    ok("1.406 · the strip, both Callouts, the band, the rail and the live trigger are ALL rendered before the first `?tab=` group — no tab owns a control that stops money",
      firstPanel > 0 && sites.every(([, at]) => at > 0 && at < firstPanel), j({ firstPanel, sites }));
    ok("1.406 · CONTROL · the two panels really are inside `?tab=` groups, so the comparison above has something to decide",
      pageCode.indexOf('{tab === "limits" && (<>') > firstPanel && (pageCode.match(/\{tab === "[a-z-]+" && \(<>/g) ?? []).length === 2, "");
  }

  /* ⛔ 1.412 / 433 · THE LIMITS PANEL IS READ-ONLY, AND THAT IS TIED TO THE SERVICE THAT WOULD MAKE IT WRITABLE.
   * There is no limits-SAVE anywhere in this repository: `saveLimits` has no caller under `src/` and
   * `house_bot.limits_saved` has no writer. So the panel renders NO typed control — an editable field that discards
   * what an officer types is worse than one that says it cannot be edited (432(a)) — and the reason is on screen
   * beside it (432(j)). ⛔ THE TWO ARE TIED BY EXISTENCE, the same shape 432(h) used for the way-out column, so the
   * step that builds the save cannot ship inputs without `UnsavedChangesGuard`, and cannot ship the guard without
   * the inputs. */
  {
    const saveWired = (() => {
      const hits: string[] = [];
      const walkSrc = (dir: string) => {
        for (const e of readdirSync(join(ROOT, dir))) {
          const rel = `${dir}/${e}`;
          if (statSync(join(ROOT, rel)).isDirectory()) walkSrc(rel);
          else if (/\.tsx?$/.test(e) && rel !== "src/lib/server/house-bot-dal.ts" && decomment(read(rel)).includes("saveLimits(")) hits.push(rel);
        }
      };
      walkSrc("src");
      return hits.length > 0;
    })();
    const typed = /<Input\b|<Textarea\b|<Select\b|<input\b|<textarea\b|<select\b/.test(sectionCode);
    ok("1.412 · 433 · the section renders a typed control EXACTLY when a limits-save is wired — today neither, with the reason on screen beside the panel",
      typed === saveWired && decomment(read(GATE)).includes("Editing limits is not ready on this build yet.")
        && pageCode.includes("{limitsView?.formReason}"),
      j({ typedControl: typed, saveWired }));
    ok("1.412 · and when it lands it lands guarded: a typed control under this section requires `UnsavedChangesGuard`, which is `test:unsaved-changes`' own population rule",
      typed === /<UnsavedChangesGuard\b/.test(sectionCode), j({ typedControl: typed }));
    /* ⛔ THE FORM'S COLUMN IS ALREADY THE FORM TIER, so the measure does not move when the inputs arrive (412). */
    ok("1.412 · the limits column is `FormColumn measure=\"form\"` (640) already, and nothing under the section uses the `sm` rungs",
      /<FormColumn measure="form">/.test(pageCode) && !/<(Input|Select|Textarea|Button)\b[^>]*size="sm"/.test(sectionCode)
        && (pageCode.match(/size="md"/g) ?? []).length >= 1, "");
  }

  /* 1.333 · the nav item carries no badge. */
  const nav = decomment(read("src/components/admin/admin-nav-groups.ts"));
  ok("1.333 · the desk's nav item is `ownerOnly` and carries NO badge — the chrome is shared by 47 routes",
    /\{ href: "\/admin\/desk", label: "Desk", key: "desk", domain: "ops", ownerOnly: true \}/.test(nav)
      && !/key: "desk"[^}]*badge/.test(nav), "");
  ok("1.333 · and there is NO `CRUMB_LABELS` entry for it — that is the one place a neutral segment could be mapped back inside a client chunk",
    !/CRUMB_LABELS[\s\S]*?\n\};/.exec(nav)?.[0].includes("desk"), "");

  /* 1.420 · an actor is an id. */
  ok("1.420 · the ON sentence names the actor by id and the reader performs NO lookup for one",
    gateCode.includes("control?.switchedById") && !/displayLabel|displayName|phoneE164/.test(gateCode), "");
  ok("1.420 · `playerHandle` is used for the HOLDER only, never for a staff actor",
    (gateCode.match(/playerHandle\(/g) ?? []).length === 1 && gateCode.includes("playerHandle(bot.userId)"), "");

  /* ════════════════════════════════════════════════════════════════════════════════════════════════════════════════
   * §5 · THE D19 SECTION (C7-SPEC ruling 398; the assignments are replan ruling 506's)
   *
   * ⛔ WHY IT IS ITS OWN SECTION. Ruling 398 gives this suite the D19 source pins of Area 5 — 380 to 399 — "every one
   * built on the SHARED vocabulary, and every one with a PLANTED CONTROL in the same run that shows the assertion can
   * fail". Replan ruling 506 then found that TWELVE of those assertions were named by a ruling's Proof clause as its
   * only guard and appeared in NO step's prose, NO §4 row and NO case: they would have been lost between the steps
   * rather than decided. Seven of them land here, at step 2, because their subjects are already built.
   *
   * ⛔ AND THE SECTION HAS A ROLL-CALL OF ITS OWN (398, corrected by 506). Until now 398 only checked that assertions
   * which EXIST have planted controls — so an assertion that was NEVER WRITTEN was invisible to the guard that exists
   * to find exactly that, which is how the twelve went missing. The roll-call below holds the section's ACTUAL case
   * ids against 398's own enumerated closed list, with the STEP each is owed at, so a missing assertion is a printed
   * line rather than a silence.
   * ════════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
  section("§5 · D19 for the console itself");
  {
    const liveFile = `${SECTION}/desk-live.tsx`;
    const clientFiles = sectionFiles.filter((f) => read(f).includes('"use client"'));
    const clientCode = clientFiles.map((f) => decomment(read(f))).join("\n");

    /* ── 1.381 · ONE NEUTRAL CODENAME, AND IT IS `desk` ──────────────────────────────────────────────────────────
     * Three server-rendered strings are not free even behind the gate: the route's `metadata.title` (the document
     * `<title>` is emitted into a response served 200 to ANY signed-in account under ruling 259), the loader's head,
     * and the section gate's restricted-panel heading, which is computed from the last URL segment — a second,
     * independent reason the console adds no `CRUMB_LABELS` entry. */
    ok("1.381 · the codename is `desk` and it is a hit in NO family of the shared vocabulary — so it names the feature to nobody",
      houseHits("desk").length === 0 && houseHits("Desk").length === 0 && houseHits("/admin/desk").length === 0
        && CR.CONSOLE_ROUTE === "/admin/desk", j(houseHits("/admin/desk")));
    ok("1.381 · the three server-rendered strings take the codename: the route's `metadata.title`, the loader's head, and the crumb the gate computes from the segment",
      /export const metadata = \{ title: "Admin · Desk" \}/.test(pageCode)
        && /<AdminPageHead title="Desk"/.test(decomment(read(LOADING)))
        && NAV.crumbsFromPath("/admin/desk").at(-1) === "Desk"
        && houseHits(["Admin · Desk", "Desk", NAV.crumbsFromPath("/admin/desk").join(" ")].join(" ")).length === 0, "");
    /* ⛔ AND THE CODENAME IS NOT ADDED TO `HOUSE_BENIGN_SAMPLES` (381, §6 item 19): that list holds LOOK-ALIKES that
     * must NOT match, and `desk` resembles no needle, so the entry would be a control that cannot fail. */
    ok("1.381 · CONTROL · the vocabulary really can see a codename that DOES name the feature, so the zero above is a measurement",
      houseHits("/admin/house-bots").length > 0 && houseHits("exposure-console").length === 0
        && !(await import("./house-bot-vocabulary.mjs") as Any).HOUSE_BENIGN_SAMPLES.includes("desk"), "");

    /* ── 1.384 · NO CONSOLE CLIENT MODULE REACHES A HOUSE MODULE, BY VALUE OR BY TYPE ────────────────────────────
     * A type-only import is ERASED by the bundler and invisible to the disclosure walker (its own 2.c3/2.c6
     * controls say so), which makes it the exact shape that survives review and becomes a value import in one
     * careless edit. The pin is therefore on the import SPECIFIER, which catches both. */
    const HOUSE_SPECIFIERS = ["@/lib/house-bot/", "@/lib/server/house-bot", "house-bot-dal", "house-console-read",
      "feed-copy", "alert-copy", "pause-reasons", "status-display"];
    ok("1.384 · no client file of the section carries a house module SPECIFIER in any import form — `import`, `import type`, `require` or `import()`",
      clientFiles.length >= 1 && HOUSE_SPECIFIERS.every((m) => !clientCode.includes(m)),
      j({ clientFiles, hits: HOUSE_SPECIFIERS.filter((m) => clientCode.includes(m)) }));
    ok("1.384 · CONTROL · the same test fires on a planted `import type` — the form 1.1 and 1.2 are blind to, which is the whole reason this assertion exists",
      (() => {
        const planted = `${clientCode}\nimport type { ConsoleTab } from "@/lib/house-bot/console-routes";`;
        return HOUSE_SPECIFIERS.some((m) => planted.includes(m));
      })(), "");
    ok("1.384 · every client file receives a plain view model: no house-shaped prop name, and nothing but primitives crosses the boundary",
      clientFiles.every((f) => !/\b(bot|house|liquidity|counterStake)[A-Za-z]*\s*[?:]/.test(decomment(read(f))))
        && /export function DeskLive\(\{ live \}: \{ live: boolean \}\)/.test(decomment(read(liveFile))), "");

    /* ── 1.386 · THE LIVE-REFRESH TRIGGER NAMES NO NOTIFICATION KIND ────────────────────────────────────────────
     * `HOUSE_BOT` is matched by the identifier family, so a kind comparison in client code is a hit in the
     * disclosure walk AND in the bundle scan. The filter buys nothing: `notification:new` is USER_SCOPED, so the SSE
     * route forwards a notification only to the account it belongs to, and every house alert goes to admins only. */
    const EVENT_STREAM = decomment(read("src/lib/use-event-stream.ts"));
    const windowEventName = /"notification:new":\s*"([^"]+)"/.exec(EVENT_STREAM)?.[1] ?? "";
    ok("1.386 · the strip listens for the GENERIC window event `EVENT_MAP` gives `notification:new`, read from the hook's own map — never the wire type, which nothing dispatches on `window`",
      windowEventName === "50pick:sse:notification"
        && clientCode.includes(`eventName="${windowEventName}"`)
        && !clientCode.includes('"notification:new"'), j({ windowEventName }));
    ok("1.386 · and it inspects NO kind: no `HOUSE_BOT` literal, no `detail.notification.kind`, and no import of the notification registry or its filters",
      !/HOUSE_BOT|detail\.notification|notification-filters|comms-registry|NOTIFICATION_KINDS/.test(clientCode), "");
    ok("1.386 · CONTROL · a planted kind comparison IS a hit in the shared vocabulary, so the absence above is a measurement",
      houseHits('if (e.detail.notification.kind === "HOUSE_BOT") router.refresh();').length > 0, "");

    /* ── 1.389 · THE COUNTDOWN ADDS NO CLIENT MODULE, NO HOUSE WORD AND NO SERVER-CONFIG REACH ───────────────────
     * ⚠️ RECORDED, NOT OVERSTATED: the console has no countdown until C7 step 4's action row. What IS asserted now
     * is the rule that decides what step 4 may add — no new countdown component under the section, and no client
     * file reaching `@/lib/utils`' date helpers, which pull server platform config into a chunk (trap E-322). */
    ok("1.389 · no client file of the section imports `@/lib/utils`' date helpers, which reach server platform config from a chunk (trap E-322)",
      !/from "@\/lib\/utils"/.test(clientCode) && !/formatEat|getPlatformTimezone|eatDayKey/.test(clientCode), "");
    ok("1.389 · the section adds NO countdown component of its own — the kit's `CountdownPill` is the one home, and it takes server-computed seconds",
      sectionFiles.every((f) => !/function\s+\w*Countdown|const\s+\w*Countdown\s*=/.test(decomment(read(f))))
        && existsSync(join(ROOT, "src/components/ui/countdown-pill.tsx")), "");
    /* ⛔ AND BOTH HALVES OF THAT ASSERTION CAN FIRE: a planted date-helper import and a planted local countdown are
     * each caught by the very expressions above, so the two absences are measurements and not unreached scans. */
    ok("1.389 · CONTROL · a planted `@/lib/utils` date import and a planted local Countdown component are each reported by the same two scans",
      /from "@\/lib\/utils"/.test(`${clientCode}
import { formatEat } from "@/lib/utils";`)
        && /function\s+\w*Countdown|const\s+\w*Countdown\s*=/.test("function DeskCountdown() { return null; }"), "");

    /* ── 1.342 · THE AUDIENCE VERDICT IS RESOLVED ONCE PER RENDER PASS, INSIDE THE MODULE ────────────────────────
     * `db.user.findById` is a real `findUnique` returning the WHOLE row including `avatarDataUrl` — a column
     * `user.list()` explicitly omits for this reason — and the console asks the audience question several times per
     * page. `sensitive.tsx` measured and closed this exact N+1 for the same lookup, and its shape is the one used.
     * ⛔ AND THE LIMIT OF THE PROOF IS MEASURED AND WRITTEN DOWN RATHER THAN GLOSSED. React's `cache()` memoises
     * per RENDER PASS; outside one it is a pass-through, MEASURED 2026-09-18 on this repo's own React (three calls
     * of a `cache()`d function invoked the body three times). So a spy in this suite cannot see the memo, and a case
     * asserting "exactly one lookup" here would be green for a reason that has nothing to do with production. What
     * is asserted is what CAN be: the wrapper is in the module, the lookup is named ONCE, and no console file
     * resolves or receives the verdict itself. */
    ok("1.342 · the viewer lookup is wrapped in React `cache()` inside the gate module, and `db.user.findById` is named EXACTLY ONCE there",
      /cache\(/.test(gateCode) && /import \{ cache \} from "react";/.test(gateCode)
        && (gateCode.match(/db\.user\.findById/g) ?? []).length === 1, j((gateCode.match(/db\.user\.findById/g) ?? []).length));
    ok("1.342 · …and it is the SAME shape `sensitive.tsx` already uses for the same lookup, so the console did not invent a second memo idiom",
      /const viewerRole = cache\(async \(\) => \{/.test(decomment(read("src/components/ui/sensitive.tsx"))), "");
    ok("1.342 · no file under the section resolves the verdict itself or takes it as a prop — the answer stays in the module that gates on it",
      !/viewer\s*[?:]|role\s*[?:]\s*(Role|string)|mayView|isOwner|isAdmin|canView|findById/.test(sectionCode), "");
    ok("1.342 · CONTROL · MEASURED LIMIT, not a claim · React `cache()` does NOT memoise outside a render pass, so this suite cannot prove the per-pass reduction and does not pretend to",
      await (async () => {
        const { cache }: Any = await import("react");
        let n = 0;
        const f = cache(async () => { n++; return n; });
        await f(); await f(); await f();
        return n === 3;
      })(), "three calls, three invocations — the memo is a render-pass property and is proved by its source, not by a spy here");

    /* ── 1.343 · THE ROUTE A GATE CALL NAMES IS A STRING LITERAL EQUAL TO THE FILE'S OWN CONSOLE ROUTE ───────────
     * `test:house-bot-reports` 0.260.1 holds every gate call to the signed-in viewer and the file's own route; what
     * is added here is the shape that pin cannot see from the other side: nothing under the section BUILDS that
     * argument from a header or a search param, which would report as a value rather than as a literal and would
     * let a mistyped route widen a page's read audience to a whole RBAC domain. */
    const gateCalls = [...pageCode.matchAll(/house(?:ConsoleAudience|RosterForConsole|UsageForConsole|AuditForConsole)\(([^;]*?)\)/g)].map((m) => m[1]);
    ok("1.343 · every gate call under the section passes the literal `\"/admin/desk\"` as its route, and there are at least three of them",
      gateCalls.length >= 3 && gateCalls.every((a) => a.includes('"/admin/desk"')), j(gateCalls));
    ok("1.343 · and no gate argument is built from a header, a search param or the route module — a literal is what the pin can measure",
      !/headers\(\)|x-pathname|sp\.tab.*houseConsole|CONSOLE_ROUTE/.test(pageCode)
        && (pageCode.match(/"\/admin\/desk"/g) ?? []).length === gateCalls.length, j(pageCode.match(/"\/admin\/desk"/g)));
    /* ⛔ THE CONTROL IS THE DERIVED FORM 343 REFUSES: a header value reads as a VALUE to the arity/own-route pin,
     * not as the literal it insists on, so a mistyped route would silently widen a page's read audience to a whole
     * RBAC domain — and the scan above must be able to see it. */
    ok("1.343 · CONTROL · the same scan fires on a planted header-derived route argument, so the absence above is a measurement",
      /headers\(\)|x-pathname/.test(`${pageCode}
const r = headers().get("x-pathname");`), "");

    /* ── 1.332 · X13 · A HOLDER WHO IS ALSO AN ADMIN STAYS INSIDE THE AUDIENCE ───────────────────────────────────
     * Asserted DELIBERATELY, so a future silent holder-exclusion turns this case red and has to be ruled rather
     * than slipped in. The alternative locks a one-owner platform out of the very controls that stop its own desk. */
    ok("1.332 · X13 · designating an account that holds a STAFF role is refused outright — which is why the combination can only arise by PROMOTING an existing holder",
      /staff/i.test(decomment(read("src/lib/server/house-bot/eligibility.ts")).slice(0, 200_000))
        && decomment(read("src/lib/server/house-bot/eligibility.ts")).includes("STAFF_ACCOUNT"), "");
    ok("1.332 · X13 · no holder-exclusion clause exists in the gate: the audience is the STORED ROLE and nothing else",
      !/holder|findLiveByUserId|houseBotStore\.find/.test(decomment(read(GATE)).split("export type ConsoleAuditRead")[0]), "");
  }

  /* ⛔ 1.398's ROLL-CALL · THE D19 SECTION'S ACTUAL CASE IDS AGAINST ITS OWN CLOSED LIST (ruling 398, corrected by
   * replan ruling 506). Until this existed, 398 checked only that assertions which EXIST have planted controls — so
   * an assertion that was NEVER WRITTEN was invisible to the guard whose whole purpose is to find exactly that, and
   * TWELVE went missing that way. The list below is 398's own enumeration of Area 5 plus 506's three additions, each
   * with the STEP it is owed at and the instrument that owns it. Every entry due at or before the step this tree has
   * BUILT must appear in the labels THIS RUN printed; every later one is printed with its step, so a missing
   * assertion is a line on the screen rather than a silence. ⛔ `BUILT_THROUGH` only ever rises, and it rises in the
   * commit that builds the step. */
  {
    const BUILT_THROUGH = 3;
    type Owed = { id: string; step: number; owner: string; what: string };
    const D19: Owed[] = [
      { id: "1.380", step: 1, owner: "console", what: "the gate's position, the literal route, force-dynamic, no gate in the loader" },
      { id: "1.381", step: 2, owner: "console", what: "ONE neutral codename, and the three server-rendered strings that take it" },
      { id: "1.382", step: 6, owner: "console", what: "every action export name and guard label is house-free" },
      { id: "1.383", step: 6, owner: "console", what: "the guard is first and the refusal is not an oracle" },
      { id: "1.384", step: 2, owner: "console", what: "no client module reaches a house module, by value OR by type" },
      { id: "1.385", step: 6, owner: "console", what: "copy provenance: no server sentence appears in a client module" },
      { id: "1.386", step: 2, owner: "console", what: "the live-refresh trigger names no notification kind" },
      { id: "1.387", step: 6, owner: "console", what: "the account picker is neutral and is not an enumeration oracle" },
      { id: "1.388", step: 6, owner: "console", what: "dialog copy comes from the server; no typed word names a bot" },
      { id: "1.389", step: 2, owner: "console", what: "the countdown adds no client module and no server-config reach" },
      { id: "1.390", step: 7, owner: "console", what: "no action throws an Error whose message names the feature" },
      { id: "1.391", step: 7, owner: "console", what: "client drafts live outside the house modules and hold no secret" },
      { id: "1.392", step: 2, owner: "qa:house-bot-console-probe", what: "the probe's population GROWS, and an unfilled console route FAILS" },
      { id: "1.393", step: 2, owner: "console", what: "a non-owner staff viewer is outside the audience, on both belts" },
      { id: "1.394", step: 2, owner: "qa:house-bot-console-probe", what: "the action pass is selected by the manifest's filename" },
      { id: "1.395", step: 7, owner: "console", what: "the console adds no admin API route, over the WALKED inventory" },
      { id: "1.396", step: 2, owner: "verify:house-bot-bundle", what: "ZERO, on a build first shown to CONTAIN the console" },
      { id: "1.397", step: 7, owner: "console", what: "the vocabulary grows by one MEASURED word, never by a new regex" },
      { id: "1.398", step: 2, owner: "console", what: "this roll-call, and every assertion shown able to fail" },
      /* ⚠️ 1.399 IS STEP 4's, NOT STEP 2's, AND THE REASON IS MEASURED. Its subject is the `[id]` route answering
       * identically for "no such record", "removed" and "not the audience" — and `/admin/desk/[id]` has no page
       * until step 4, so neither the probe's three fixtures nor the source pin on `notFound()` has anything to read.
       * §4's row 2 scheduled it here; the code says otherwise and the code wins (§0). RECORDED, not skipped. */
      { id: "1.399", step: 4, owner: "console", what: "a missing record and a refused viewer answer identically" },
      { id: "1.332", step: 2, owner: "console", what: "X13 · a holder who is also an ADMIN stays inside the audience" },
      { id: "1.342", step: 2, owner: "console", what: "the audience verdict is resolved ONCE per render pass, in the module" },
      { id: "1.343", step: 2, owner: "console", what: "the route a gate call names is a STRING LITERAL, never a header" },
    ];
    /* ⚠️ 1.398 ITSELF IS EXCLUDED FROM ITS OWN ROLL-CALL, and that is not an exemption: `emitted` is the list of
     * labels printed SO FAR, and this case's own label is appended by `ok()` after the predicate is evaluated — so
     * including it would make the roll-call report itself missing, every run, for ever. It is present by
     * construction: if this case did not run, nothing below would print at all. */
    const dueHere = D19.filter((d) => d.step <= BUILT_THROUGH && d.owner === "console" && d.id !== "1.398");
    const missing = dueHere.filter((d) => !emitted.some((l) => l.startsWith(`${d.id} `)));
    const later = D19.filter((d) => d.step > BUILT_THROUGH || d.owner !== "console");
    ok("1.398 · ROLL-CALL · every D19 assertion owed at or before the step this tree has built was PRINTED by this run, and every later one is named with its step and its instrument",
      missing.length === 0 && dueHere.length >= 9 && D19.length === 23,
      j({ builtThrough: BUILT_THROUGH, dueHere: dueHere.length, missing: missing.map((d) => `${d.id} (${d.what})`), later: later.map((d) => `${d.id}@step${d.step}:${d.owner}`) }));
    /* ⛔ THE CONTROL IS THE POINT: the roll-call must be able to report an id that was never written, which is the
     * failure mode it exists for. An invented id is looked for and must NOT be found; a real one must be. */
    ok("1.398 · CONTROL · the roll-call reads this run's own labels — an id that was never written IS reported, and one that was is not",
      !emitted.some((l) => l.startsWith("1.997 ")) && emitted.some((l) => l.startsWith("1.381 "))
        && D19.filter((d) => d.id === "1.997").length === 0
        && [{ id: "1.997", step: 1, owner: "console", what: "an assertion nobody wrote" }]
             .filter((d) => !emitted.some((l) => l.startsWith(`${d.id} `))).length === 1, "");
    /* ⛔ AND EVERY ASSERTION IN THIS SECTION HAS A PLANTED CONTROL IN THE SAME RUN (398's original half, kept): the
     * section's own labels are counted, and each `id · CONTROL ·` is matched to an id that printed. */
    const controls = emitted.filter((l) => / · CONTROL · /.test(l)).map((l) => l.split(" ")[0]);
    ok("1.398 · every D19 assertion printed here carries a planted CONTROL of its own in the same run",
      dueHere.filter((d) => d.owner === "console" && d.step === 2).every((d) => controls.includes(d.id))
        && controls.length >= 20,
      j({ controls: [...new Set(controls)].sort(), dueAtStep2: dueHere.filter((d) => d.step === 2).map((d) => d.id) }));
  }

  /* ⛔ 1.318's ROLL-CALL OVER THE DECLARED MUTATIONS, AND IT MUST BE LAST — it reads the labels THIS run printed.
   * `red:house-bot-console` matches a run's FAIL lines with `result.fails.find((l) => l.includes(d.expect))`, so an
   * `expect` that is not a substring of any label this suite can print is classed WRONG-ASSERTION, `missed++`, and
   * the drive exits 1 — red for the wrong reason, which is the one thing the drive exists to refuse.
   * MEASURED 2026-09-18: THREE of the 59 declarations had rotted this way and nothing reported it. `453-off` and
   * `453-accounts` — the two mutations that exist to prove ruling 453's runtime lexicon scan can fire — both named
   * "3.453 · not one painted string carries a house-vocabulary word" after the case had been reworded to "…not one
   * painted string of ANY state carries…", and `373-subject` named "only the SUBJECT column carries a floor" after
   * its case became "the SUBJECT and STATUS columns". `test:red-anchors` §3 is structurally blind to this: it
   * resolves the `from` TEXT and never looks at `expect`, so all 59 printed "anchor resolves exactly once" while
   * three of them could not report through the assertion they name.
   * ⛔ `console-mem` ONLY: the `rbac` and `admin-nav` entries name labels of other suites, which this run cannot
   * print — they are counted and named in the extra so the exclusion is visible rather than silent. */
  {
    /* ⛔ THE BLOCK THAT USED TO BE WRITTEN OUT HERE IS NOW `scripts/lib/house-bot-expect-drift.mts` (ruling 505), and
     * it is called at the end of `house-bot-engine-cases`, `house-bot-money-cases`, `house-bot-seam.test`,
     * `house-book.test` and `house-page.test` as well — 84 declarations were unaudited while this class was guarded in
     * ONE file. The two tiers, the sentinel-by-concatenation and the naming of other suites' entries all moved with it;
     * the two LABELS are unchanged to the byte, because the declared mutation `318-expect-drift` names `1.318`. */
    const selfCode = decomment(readFileSync(fileURLToPath(import.meta.url), "utf8"));
    const LBL = "1.318 · every declared `console-mem` mutation names an assertion THIS run actually printed — an `expect` that matches no label can only ever report WRONG-ASSERTION";
    const LBLC = "1.318 · CONTROL · the roll-call reads this run's own labels and this suite's own source, so a drifted `expect` IS reported and an invented one is never found";
    const input = {
      suiteKeys: ["console-mem"], declarations: DECLARED_MUTATIONS as DeclaredMutation[],
      emitted, source: selfCode, ownLabels: [LBL, LBLC],
    };
    const rc = expectDriftReport(input);
    ok(LBL, rc.declared >= 40 && rc.stale.length === 0, j(rc));
    const control = expectDriftControl(input, 120);
    ok(LBLC, control.pass, control.extra);
  }
}

console.log(`\n@@SUMMARY ${JSON.stringify({ pass, fail })}`);
console.log(`\n${fail === 0 ? "ALL PASS" : "FAILURES"} — house-bot-console [${STORE}]: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
