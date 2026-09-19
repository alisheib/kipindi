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
/* ⭐ replan ruling 537 · the section's first server action and its first typed control. */
const ACTIONS = `${SECTION}/actions.ts`;
const FORM = `${SECTION}/limits-form.tsx`;
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

  /* ━━ 1.306 · THE SENTENCE ITSELF, IN BOTH FORMS, AND THE STATE IT MUST NOT APPEAR IN ━━━━━━━━━━━━━━━━━━━━
   * ⛔ NO SUITE ASSERTED THE TEXT AT ALL — only the NUMBER. Both forms were spelled out twice in JSX with no single
   * home, so the words an officer reads beside the switch that stops money were unproved in either branch.
   * ⛔ AND IT MUST NOT APPEAR BESIDE A SWITCH THAT IS ALREADY ON (ruling 306: the sentence explains why the switch
   * CANNOT be turned on). Read off the implementer's own 1280 tile: chip ON, "On since 20:14:12 EAT …", and
   * "Set 1 global limit first →" beside it — two opposite instructions on one screen, 432(m)/(n)'s class. The state
   * is reachable because a limit can be cleared after the desk is switched on.
   * ⛔ N IS READ FROM `REQUIRED_FOR_MASTER_ON`, never typed, so a ninth field cannot silently pass. */
  {
    const sentence = (n: number) => `Set ${n} global limit${n === 1 ? "" : "s"} first →`;
    ok("1.306 · 432(m) · with two required limits unset and the switch OFF the strip says so in words — the LINKED form, and the plain form without its arrow",
      v.limitsFirstReason === sentence(2) && v.limitsFirstPlain === "Set 2 global limits first"
        && v.limitsFirstReason.endsWith("→") && !v.limitsFirstPlain.includes("→"),
      j({ linked: v.limitsFirstReason, plain: v.limitsFirstPlain }));

    await w.limits({ gCapDailyStakeTzs: null });
    const one = await GATEM.houseRosterForConsole(OFFICER, "/admin/desk");
    ok("1.306 · ONE unset required limit is singular — `limit`, not `limits` — and the sentence is built from the count, not typed twice",
      one.limitsFirstReason === sentence(1) && one.unsetRequired === 1
        && one.limitsFirstReason.includes(` ${one.unsetRequired} `), j({ got: one.limitsFirstReason }));

    await w.limits(Object.fromEntries(ALL.map((f) => [f, null])) as Any);
    const all8 = await GATEM.houseRosterForConsole(OFFICER, "/admin/desk");
    ok(`1.306 · with every required limit unset the sentence counts ${ALL.length}, read from REQUIRED_FOR_MASTER_ON and never typed`,
      all8.limitsFirstReason === sentence(ALL.length) && all8.unsetRequired === ALL.length, j({ got: all8.limitsFirstReason }));

    /* ⛔ THE STATE THE FIRST RENDER ACTUALLY SHOWED: the switch ON with a required limit still unset. */
    await w.limits({ gCapDailyStakeTzs: null });
    await w.switchOn();
    const onUnset = await GATEM.houseRosterForConsole(OFFICER, "/admin/desk");
    ok("1.306 · 432(m) · with the switch ON the sentence is NOT painted, though the limit is still unset — the strip never gives two opposite instructions",
      onUnset.on === true && onUnset.unsetRequired === 1
        && onUnset.limitsFirstReason === null && onUnset.limitsFirstPlain === null,
      j({ on: onUnset.on, unsetRequired: onUnset.unsetRequired, reason: onUnset.limitsFirstReason }));
    /* ⛔ AND THE RAIL'S BADGE STILL COUNTS, because a COUNT is honest in either state — the badge is not the
     * instruction, and suppressing it would hide a real fact from the one screen that can act on it. */
    ok("1.306 · CONTROL · …and the badge's number survives that, so the two are not the same decision",
      onUnset.unsetRequired === 1 && onUnset.stateSentence.startsWith("On since"), j({ sentence: onUnset.stateSentence }));
    STATES.push(["strip-on-with-unset", onUnset]);

    /* ━━ 1.474 · THE TWO OPERATOR-TYPED VALUES, NAMED AND BOUNDED ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     * Ruling 474 requires `bot.label` and `control.switchedReason` to render as plain text WITH A LENGTH CLAMP and
     * to be NAMED as explicit operator-data exemptions from 453's lexicon. Neither render site clamped: the only
     * bound was a DAL storage invariant, which is not a render decision — a widening of either check would have
     * walked straight onto the screen. And the exemption was not written down at all: `copyOf` dropped `label` under
     * a comment that never named 474, and `switchedReason` was not excluded anywhere — it passed only because the
     * fixture's value happened to be neutral. An Owner typing "bots on for the weekend" paints the word the whole
     * lexicon exists to keep off the screen. */
    {
      const EX = GATEM.OPERATOR_DATA_EXEMPT as ReadonlyArray<Any>;
      ok("1.474 · exactly TWO operator-typed values are exempted from 453, each NAMED with where it paints and the bound it paints under",
        EX.length === 2 && j(EX.map((e: Any) => e.value)) === j(["label", "switchedReason"])
          && EX.every((e: Any) => typeof e.where === "string" && e.where.length > 0 && e.maxCodePoints > 0), j(EX));
      /* ⛔ CODE POINTS, NOT UTF-16 UNITS, and the ellipsis is INSIDE the bound — a clamp that slices a surrogate
         pair in half paints a replacement glyph, and one that appends past its own bound is not a bound. */
      const clamp = GATEM.clampOperatorText as (t: string, n: number) => string;
      const astral = "\u{1F600}".repeat(10);
      ok("1.474 · the clamp cuts at CODE POINTS, keeps the text verbatim up to the bound, and its ellipsis is inside it",
        clamp("abcdef", 10) === "abcdef" && clamp("abcdef", 4) === "abc\u2026"
          && [...clamp(astral, 4)].length === 4 && !clamp(astral, 4).includes("\uFFFD"),
        j({ short: clamp("abcdef", 4), astral: clamp(astral, 4) }));
      /* ⛔ AND IT IS APPLIED WHERE THE TEXT IS PAINTED. The reason's storage bound is 300 code points; the render
         bound is 120, so this is a branch a real Owner can reach, not a theoretical one. */
      const bound = EX.find((e: Any) => e.value === "switchedReason")!.maxCodePoints;
      await w.dal.houseBotControlStore.switchOff({ cause: "MANUAL", byId: OFFICER, reason: "test" });
      await w.dal.houseBotControlStore.switchOn({ byId: OFFICER, reason: "R".repeat(300) });
      const longReason = await GATEM.houseRosterForConsole(OFFICER, "/admin/desk");
      const tail = longReason.stateSentence.slice(longReason.stateSentence.indexOf("reason: ") + 8);
      ok("1.474 · a 300-code-point switch reason is BOUNDED at the render site — verbatim up to the bound, never censored, never the whole 300",
        [...tail].length === bound && tail.endsWith("\u2026") && tail.startsWith("R".repeat(20))
          && (await w.dal.houseBotControlStore.get()).switchedReason.length === 300,
        j({ painted: [...tail].length, bound, stored: 300 }));
      /* ⛔ THE LABEL'S CLAMP IS PINNED AT SOURCE, AND THAT IS THE HONEST INSTRUMENT FOR IT.
         `HouseBot_label_check` bounds a label at the SAME 32 code points, so the clamp cannot fire from any
         reachable fixture — measured: the declared mutation `474-label-unclamped` left every behavioural
         assertion green. It exists so that a widening of that storage check cannot walk straight onto the screen,
         and a pin on the call site is what makes that intent enforceable. The bound itself is read from the named
         list, never typed at the site, so the two can never drift. */
      if (STORE === "memory") {
        const gateSrc = decomment(read(GATE));
        ok("1.474 · both exemptions are CLAMPED at their own render site, with the bound read from the named list rather than typed there",
          /label: clampOperatorText\(bot\.label, operatorBound\("label"\)\)/.test(gateSrc)
            && /const reasonText = control\?\.switchedReason \? clampOperatorText\(control\.switchedReason, operatorBound\("switchedReason"\)\) : null;/.test(gateSrc)
            /* ⭐ FOUR SITES FROM C7 STEP 4: the declaration, the roster row's label, the strip's switch reason
               and the ACCOUNT PAGE's own label — which is the head of that page and therefore the string most
               likely to sit in a screenshot of it. */
            && /label: clampOperatorText\(bot\.label, operatorBound\("label"\)\),/.test(gateSrc)
            && (gateSrc.match(/clampOperatorText\(/g) ?? []).length === 4
            && !/maxCodePoints: \d+/.test(gateSrc.slice(gateSrc.indexOf("function clampOperatorText"))),
          j({ sites: (gateSrc.match(/clampOperatorText\(/g) ?? []).length }));
      }
      STATES.push(["strip-long-reason", longReason]);
      await w.dal.houseBotControlStore.switchOff({ cause: "MANUAL", byId: OFFICER, reason: "test" });
    }
    await w.switchOff();
    await w.limits({ gCapDailyStakeTzs: null, gCapDailyLossTzs: null });
    v = await GATEM.houseRosterForConsole(OFFICER, "/admin/desk");
  }

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
  /* ⭐ WIDENED AT C7 STEP 4b, NEVER WEAKENED. The switch is OPERABLE now, so "every disabled control carries a
   * reason" has a different POPULATION: the head action is still disabled in every state, and the Toggle is
   * disabled only in the states where there is no act to perform. An assertion that kept demanding a sentence
   * beside an ENABLED control would have been the fix invalidating its own proof — so it is re-expressed over the
   * states themselves, in BOTH directions, and it now covers FOUR where it covered two:
   *   · disabled ⟹ EXACTLY ONE sentence beside it — its own, or the strip's "Set N global limits first →" three
   *     characters to its left, never both (432(n)) and never neither (432(j));
   *   · operable ⟹ NO sentence at all, because there is nothing to explain about a control that works;
   *   · and in every state, the switch's sentence is never the head action's words. */
  const unsetOne = await withControl({ enabled: false, offCause: "MANUAL", gCapOpenExposureTzs: null });
  const onNow = await withControl({ enabled: true, offCause: null });
  const switchStates: Array<[string, Any]> = [["off · ready", plainFull], ["off · withdrawn", sunsetFull], ["off · a required limit unset", unsetOne], ["on", onNow]];
  const besideSwitch = (x: Any): string[] => [x.switchReason, x.limitsFirstReason].filter((s: unknown) => typeof s === "string" && s.length > 8);
  ok("432(j) · 432(n) · a DISABLED master switch carries exactly one reason beside it — its own or the limits sentence, never both and never neither — and an OPERABLE one carries none",
    switchStates.every(([, x]) => ((x.switchDialog ?? null) === null ? besideSwitch(x).length === 1 : besideSwitch(x).length === 0))
      && switchStates.every(([, x]) => typeof x.actionReason === "string" && x.actionReason.length > 8 && x.switchReason !== x.actionReason),
    j(switchStates.map(([name, x]) => [name, x.switchDialog?.to ?? "disabled", besideSwitch(x).length])));
  ok("432(j) · CONTROL · the four states really are four different answers — two operable in opposite directions, one disabled with its own sentence and one disabled with the limits sentence — so the rule above was exercised and not satisfied by an empty population",
    plainFull.switchDialog?.to === "ON" && onNow.switchDialog?.to === "OFF"
      && (sunsetFull.switchDialog ?? null) === null && typeof sunsetFull.switchReason === "string" && sunsetFull.switchReason.toLowerCase().includes("switch")
      && (unsetOne.switchDialog ?? null) === null && (unsetOne.switchReason ?? null) === null && typeof unsetOne.limitsFirstReason === "string"
      && plainFull.actionReason.toLowerCase().includes("designat"),
    j({ plain: plainFull.switchDialog?.to, on: onNow.switchDialog?.to, sunset: sunsetFull.switchReason, unset: unsetOne.limitsFirstReason }));

  /* ══ THE MASTER-SWITCH CEREMONY (rulings 306, 388, 415; owner-delegated 454; replan ruling 549's 4b) ══════════
   * ⛔ THE SWITCH SHIPS OFF (owner ruling D1). Every case below runs against a database this RUN created and drops
   * — the two-store runner's own `CREATE DATABASE`/`DROP DATABASE` pair on the scratch cluster, or the memory
   * store, which has no database at all. Nothing here reaches any other environment.
   * ⛔ AND THE CEREMONY IS WHY THE CONTROL MAY EXIST. 432(a) refuses a live control with nothing behind it; this
   * is the other half of that rule — a control whose server would only ever refuse it is the same lie one layer
   * down, so the reader offers no dialog in the states the service refuses, and these cases hold the two together. */
  {
    const { deskSwitchArmed }: Any = await import("../../src/app/admin/desk/switch-ceremony.tsx");
    const FEEDC: Any = await import("../../src/lib/house-bot/feed-copy.ts");
    /* ⛔ EVERY CALL IS CAUGHT AND ASSERTED, NEVER HANDED TO THE SECTION GUARD (E25 lesson, and the engine suite's
     * own idiom). A throw here would skip every later case in the guarded region — including §3's lexicon scan —
     * and the suite would go red on three unrelated labels, which is what the declaration file calls
     * WRONG-ASSERTION. It also makes the ABSENT state measurable case by case rather than as one throw. */
    const callSwitch = async (viewer: string, input: Any): Promise<Any> => {
      try { return await GATEM.houseSwitchForConsole(viewer, "/admin/desk", input); }
      catch (e) { return { ok: false, error: "", threw: String((e as Error)?.message ?? e) }; }
    };
    const WORD = GATEM.CONSOLE_SWITCH_ON_WORD;
    const MIN = GATEM.CONSOLE_REASON_MIN;
    const MAX = GATEM.CONSOLE_REASON_MAX;
    const REASON = "weekend cover";
    /* ⛔ THE BLOCK SETS ITS OWN STARTING STATE. Earlier cases in §2 leave the row switched on or a limit cleared,
     * and a ceremony case that inherits "already on" would assert nothing about switching on. Off, with every
     * limit set, is the state the product ships in and the only one this block may start from.
     * ⛔ EVERY LINE BELOW RUNS ON A DATABASE THIS RUN CREATED AND DROPS (the two-store runner's own
     * CREATE/DROP pair on the scratch cluster) or on the memory store, which has no database at all. */
    await w.switchOff();
    await w.limits();

    ok("1.454 · the typed word is SWITCH ON — it names the ACT, not the feature — and it is the SERVER's, handed to the dialog as a prop",
      WORD === "SWITCH ON" && plainFull.switchDialog?.word === WORD && plainFull.switchDialog?.wordLabel?.includes(WORD) === true,
      j({ WORD, dialog: plainFull.switchDialog?.word }));
    /* ⛔ THE STRUCK PHRASE IS MEASURED OVER THE DERIVED POPULATION — every file of the section walked from disk
     * plus the gate module, the same population 4.453 uses — because a hand-typed file list stops covering what it
     * was written to cover (ruling 513). ⚠️ IT SCANS RAW TEXT, COMMENTS INCLUDED, and that caught its own home on
     * the first run: the gate module's docblock SPELLED the struck phrase while explaining that it was struck. The
     * prose was reworded; the guard was not. */
    const struckPhrase = `BOTS${" "}ON`;
    const struckScan = [...sectionFiles, GATE].filter((f: string) => read(f).includes(struckPhrase));
    ok("1.454 · …and the draft's feature-shaped confirmation phrase is struck everywhere under the section and in the gate module — which matters precisely because it is not a needle any guard can see",
      !all(plainFull.switchDialog).includes(struckPhrase) && struckScan.length === 0 && sectionFiles.length >= 6,
      j({ hits: struckScan, scanned: sectionFiles.length + 1 }));
    ok("1.454 · CONTROL · the same scan FINDS the phrase when it is planted in a copy of a real section file, so the zero above is a measurement and not an unreached walk",
      [...sectionFiles, GATE].map((f: string) => `${read(f)}\n// ${struckPhrase}`).every((c: string) => c.includes(struckPhrase)), "");
    ok("1.415 · the way OFF takes NO typed word and the way ON does — a stop is the SAFE direction, and ceremony in front of it is money still moving",
      onNow.switchDialog?.to === "OFF" && onNow.switchDialog?.word === null && onNow.switchDialog?.wordLabel === null
        && plainFull.switchDialog?.to === "ON" && typeof plainFull.switchDialog?.word === "string",
      j({ off: onNow.switchDialog?.word, on: plainFull.switchDialog?.word }));
    ok("1.415 · both directions still require a reason, with ONE pair of bounds shared by the field, its live count and the server's own refusal",
      MIN === 5 && MAX === 300
        && [onNow, plainFull].every((x: Any) => x.switchDialog?.reasonMin === MIN && x.switchDialog?.reasonMax === MAX && typeof x.switchDialog?.reasonLabel === "string"),
      j({ MIN, MAX }));

    /* ⛔ THE ARMING PREDICATE IS PURE AND EXPORTED, so every branch is measured DIRECTLY rather than through a
     * render that can only reach one of them — and `Modal` returns null until it is mounted, so a static render
     * of the dialog is NOT MEASURED by construction (415). */
    const onCopy = { word: WORD, reasonMin: MIN, reasonMax: MAX };
    const offCopy = { word: null, reasonMin: MIN, reasonMax: MAX };
    /* ⛔ THE WHOLE BATTERY IS CAUGHT, so an ABSENT predicate is a failed assertion and not a throw that blinds
     * every section below it. */
    const armedTable = (): boolean => {
      try {
        return deskSwitchArmed(onCopy, REASON, WORD) === true
          && deskSwitchArmed(onCopy, "no", WORD) === false
          && deskSwitchArmed(onCopy, "x".repeat(Number(MAX) + 1), WORD) === false
          && deskSwitchArmed(onCopy, REASON, "switch on") === false
          && deskSwitchArmed(onCopy, REASON, "SWITCHON") === false
          && deskSwitchArmed(onCopy, REASON, "") === false
          && deskSwitchArmed(offCopy, REASON, "") === true
          && deskSwitchArmed(offCopy, "no", "") === false;
      } catch { return false; }
    };
    ok("1.415 · 454 · the confirm arms only on a reason of the required length AND the word typed EXACTLY — never case-folded, because 'switch on' must not arm a control that exists so it cannot be armed by habit",
      armedTable(), "");

    /* ⛔ AND THE SERVER CHECKS IT AGAIN. A ceremony verified only in a browser is one a crafted POST walks straight
     * through, and this is the single act on the platform that opens money's own gate. */
    const wrongWord = await callSwitch(OFFICER, { to: "ON", reason: REASON, typed: "switch on" });
    const shortReason = await callSwitch(OFFICER, { to: "ON", reason: "no", typed: WORD });
    const longReason = await callSwitch(OFFICER, { to: "ON", reason: "x".repeat(MAX + 1), typed: WORD });
    ok("1.454 · the SERVER refuses a word that only looks right, and a reason outside the bounds — the dialog's own arming is a courtesy, not the gate",
      wrongWord.ok === false && String(wrongWord.error).includes(WORD)
        && shortReason.ok === false && longReason.ok === false && shortReason.error !== longReason.error,
      j({ wrongWord: wrongWord.error, short: shortReason.error, long: longReason.error }));
    ok("1.454 · CONTROL · the desk is still OFF after all three refusals — a refusal that wrote something would be the worst possible pass here",
      (await w.dal.houseBotControlStore.get()).enabled === false, "");

    /* ⛔ 300/380 · A VIEWER OUTSIDE THE AUDIENCE IS REFUSED BEFORE ANYTHING IS READ OR WRITTEN, and the refusal is
     * not an oracle: it carries no state, no count and no figure (383). */
    const playerId = await w.user({ role: "PLAYER" });
    const refused = await callSwitch(playerId, { to: "ON", reason: REASON, typed: WORD });
    ok("1.415 · 300 · a signed-in PLAYER's ceremony is refused, and the refusal names no state, no count and no figure",
      refused.ok === false && typeof refused.error === "string" && refused.error.length > 8
        && !/\d/.test(refused.error) && !NEUTRAL.test(refused.error)
        && (await w.dal.houseBotControlStore.get()).enabled === false,
      j(refused));

    /* ⛔ 306 · THE REFUSAL THE STRIP PROMISES IS REAL. "Set N global limits first →" beside the Toggle would be a
     * lie the officer could walk straight through if the service did not enforce it — and the consequence is not
     * cosmetic: `over(cap, value)` in the seam is `cap == null || value > cap`, so an unset required cap REFUSES
     * EVERY STAKE. A desk switched on in that state looks live and does nothing. */
    const ctlBefore: Any = await w.dal.houseBotControlStore.get();
    await w.dal.houseBotControlStore.saveLimits(ctlBefore.limitsVersion, { gCapOpenExposureTzs: null });
    const unsetRefusal = await callSwitch(OFFICER, { to: "ON", reason: REASON, typed: WORD });
    const unsetView = await GATEM.houseRosterForConsole(OFFICER, "/admin/desk");
    ok("1.306 · 454 · with a required limit unset the ceremony is REFUSED by the server, with the SAME derived count the strip paints — and the desk stays off",
      unsetRefusal.ok === false && /\b1\b/.test(String(unsetRefusal.error))
        && unsetView.unsetRequired === 1 && (unsetView.switchDialog ?? null) === null
        && (await w.dal.houseBotControlStore.get()).enabled === false,
      j({ error: unsetRefusal.error, unsetRequired: unsetView.unsetRequired, dialog: unsetView.switchDialog }));
    await w.limits();

    /* ⭐ THE ACT ITSELF, ON A DATABASE THIS RUN CREATED AND DROPS. */
    const before: Any = await w.dal.houseBotControlStore.get();
    const switched = await callSwitch(OFFICER, { to: "ON", reason: REASON, typed: WORD });
    const after: Any = await w.dal.houseBotControlStore.get();
    ok("1.415 · ⭐ THE CEREMONY MOVES THE SWITCH: the desk goes ON, the officer's own id and reason are on the row, and the off cause is cleared",
      before.enabled === false && switched.ok === true && switched.changed === true && switched.on === true
        && after.enabled === true && after.switchedById === OFFICER && after.switchedReason === REASON && after.offCause === null,
      j({ ok: switched.ok, changed: switched.changed, by: after.switchedById, reason: after.switchedReason, offCause: after.offCause }));
    ok("1.415 · …and the scope starts with it (04 A11, ruling 92) — a switch-on that left scope NULL would put every stake out of scope, and one that left an old instant would replay history",
      typeof (await w.dal.houseBotRuntimeStore.get((await import("../../src/lib/house-bot/constants.ts") as Any).RUNTIME_KEY.global))?.scopeFrom === "string", "");
    const onAgain = await callSwitch(OFFICER, { to: "ON", reason: "again, by mistake", typed: WORD });
    ok("1.415 · a second ON changes NOTHING and says so — one ON, one event, one alert, whichever officer landed second",
      onAgain.ok === true && onAgain.changed === false && typeof onAgain.note === "string" && onAgain.warn === false
        && (await w.dal.houseBotControlStore.get()).switchedReason === REASON,
      j({ changed: onAgain.changed, note: onAgain.note }));

    /* ⭐ RULING 547, RE-VERIFIED IN THE ONE STATE IT WAS WRITTEN ABOUT AND WHICH HAD NEVER BEEN REACHABLE THROUGH
     * THE UI. With the desk ON and a required cap unset, the usage card used to say "Not set — the master switch
     * cannot be turned on." beside a chip reading ON: two opposite statements about one switch on one screen.
     * 547's fix (`unsetCaptionFor(field, on)`) landed at C7 step 4a while the Toggle was still disabled, so the
     * state could only be reached by writing the row by hand. It is reachable now, through the ceremony. */
    const onCtl: Any = await w.dal.houseBotControlStore.get();
    await w.dal.houseBotControlStore.saveLimits(onCtl.limitsVersion, { gCapOpenExposureTzs: null });
    const onWithUnset = await GATEM.houseUsageForConsole(OFFICER, "/admin/desk", { houseBotId: null });
    const unsetCaptions = [
      ...(onWithUnset.usage as Any[]).map((u: Any) => u.unsetCaption),
      ...(onWithUnset.limits as Any[]).filter((l: Any) => l.unset).map((l: Any) => l.caption),
    ].filter((c: unknown): c is string => typeof c === "string");
    ok("1.415 · 547 · with the desk switched ON through the CEREMONY, no usage caption and no limits row says the master switch cannot be turned on — the state ruling 547 was written about, reached through the console for the first time",
      onWithUnset.on === true && unsetCaptions.length >= 2
        && unsetCaptions.every((c: string) => !/master switch cannot be turned on/.test(c)),
      j({ on: onWithUnset.on, captions: unsetCaptions }));
    await w.limits();

    /* ⭐ THE KILL SWITCH — the other direction, and the one that must never be blocked. */
    const stopped = await callSwitch(OFFICER, { to: "OFF", reason: "stopping for the night" });
    const offRow: Any = await w.dal.houseBotControlStore.get();
    ok("1.415 · ⭐ THE KILL SWITCH STOPS THE DESK: off, with the officer's id and reason on the row and the MANUAL cause recorded",
      stopped.ok === true && stopped.changed === true && stopped.on === false
        && offRow.enabled === false && offRow.switchedById === OFFICER && offRow.offCause === "MANUAL",
      j({ ok: stopped.ok, changed: stopped.changed, offCause: offRow.offCause }));
    ok("1.415 · 266 · a stop reports what it cancelled as a COUNT or says nothing at all — never an amount, here or anywhere on this section",
      stopped.ok === true && (stopped.note === null || (!/TZS/.test(String(stopped.note)) && !NEUTRAL.test(String(stopped.note)))),
      j({ note: stopped.note }));
    const stopAgain = await callSwitch(OFFICER, { to: "OFF", reason: "stopping again" });
    ok("1.415 · a second OFF changes nothing and says so — and it is never refused, because a stop that is refused is the one refusal this console must not have",
      stopAgain.ok === true && stopAgain.changed === false, j(stopAgain));

    /* ⛔ THE ONE BRANCH WHERE THE SHARED SENTENCE WOULD REACH A SCREEN, AND NO ORDINARY RUN REACHES IT — which is
     * exactly why it needs a case rather than a comment. `SWITCH_OFF_COPY.WRITE_FAILED` reads "Could not reach the
     * database. House bots were NOT switched off…": correct on the ops script and in the admin bell, which D19
     * exempts, and three words of the feature's own name on the one surface ruling 453 exists to keep neutral.
     * ⚠️ FOUND BY APPLYING THE DECLARED MUTATION AND RE-EVALUATING IT (replan ruling 541), not by reading: the
     * first `415-shared-copy` declaration was MISSED, because the branch it aimed at was exercised by nothing. */
    const realOff = w.dal.houseBotControlStore.switchOff;
    let offFailed: Any;
    try {
      w.dal.houseBotControlStore.switchOff = async () => { throw new Error("the control row could not be written"); };
      offFailed = await callSwitch(OFFICER, { to: "OFF", reason: "stopping, with the database unreachable" });
    } finally {
      w.dal.houseBotControlStore.switchOff = realOff;
    }
    ok("1.415 · 453 · a kill switch whose WRITE FAILED says so in the console's own neutral words, and names the remedy — never the shared sentence, which names the feature three words in",
      offFailed?.ok === false && typeof offFailed.error === "string" && offFailed.error.length > 8
        && !NEUTRAL.test(offFailed.error) && offFailed.error !== FEEDC.SWITCH_OFF_COPY.WRITE_FAILED
        && offFailed.threw === undefined,
      j(offFailed));
    ok("1.415 · 453 · CONTROL · the shared sentence this branch replaced DOES name the feature, so the case above is a comparison with something rather than with nothing",
      NEUTRAL.test(FEEDC.SWITCH_OFF_COPY.WRITE_FAILED), j(FEEDC.SWITCH_OFF_COPY.WRITE_FAILED));

    /* ⛔ 453 · EVERY WORD EITHER DIALOG CAN PAINT, SCANNED — the titles, the bodies, both button labels, the field
     * labels, the typed word, the hints and both toast titles, in BOTH directions. */
    const ceremonyStrings = [plainFull.switchDialog, onNow.switchDialog]
      .flatMap((d: Any) => Object.values(d ?? {}))
      .filter((v: unknown): v is string => typeof v === "string");
    ok("1.415 · 453 · not one word of either ceremony names the feature, and the scan really had both dialogs' whole copy in it",
      ceremonyStrings.length >= 20 && ceremonyStrings.every((s: string) => !NEUTRAL.test(s)) && houseHits(ceremonyStrings.join(" ")).length === 0,
      j({ scanned: ceremonyStrings.length, hits: ceremonyStrings.filter((s: string) => NEUTRAL.test(s)) }));
    ok("1.415 · 453 · CONTROL · the same scan fires on the kill switch's SHARED copy, which names the feature three times over — which is exactly why the console builds its own sentence from the structured result instead of passing that table through",
      (() => {
        const shared = Object.values(FEEDC.SWITCH_OFF_COPY) as string[];
        return shared.length >= 3 && shared.some((s) => NEUTRAL.test(s)) && ceremonyStrings.every((s: string) => !shared.includes(s));
      })(), j(Object.values(FEEDC.SWITCH_OFF_COPY).filter((s: Any) => NEUTRAL.test(String(s)))));

    await w.switchOff();
  }

  /* ══ THE ENGINE-HEALTH CALLOUT, INSIDE THE ONE DOOR (rulings 309, 352, 353, 354, 414; replan 435(e), 507, 514) ══
   * ⛔ 435(e) · NOT a second gated reader. 353's verdict needs the master switch, which the reader has already read,
   * so a second door would put a SECOND control read in one render — 433(d)'s named refusal. These cases read the
   * notice off the SAME painted view model the page renders, with real runtime rows behind it. */
  {
    const KC: Any = await import("../../src/lib/house-bot/constants.ts");
    const RK = KC.RUNTIME_KEY;
    const ENGINE_KEY = RK.engine("case-i1");
    const POLLER_KEY = RK.pollerBeat("case-i1");
    const ago = (ms: number) => new Date(Date.now() - ms).toISOString();
    const BLANK = { beatAt: null, bootAt: null, pollerErrorAt: null, pollerErrorCode: null, pollerErrorStreak: 0, skewMs: null };
    const setRuntime = async (rows: Array<[string, Any]>) => {
      for (const key of [ENGINE_KEY, POLLER_KEY, RK.plannerBeat]) await w.dal.houseBotRuntimeStore.upsert(key, { ...BLANK });
      for (const [key, patch] of rows) await w.dal.houseBotRuntimeStore.upsert(key, patch);
    };
    /** The desk ON, with the runtime rows this case planted behind it — the page's own view model, not a helper's. */
    const noticeFor = async (rows: Array<[string, Any]>): Promise<Any> => {
      await setRuntime(rows);
      return (await withControl({ enabled: true, offCause: null })).engine ?? null;
    };

    const stale = await noticeFor([[ENGINE_KEY, { bootAt: ago(600_000) }], [RK.plannerBeat, { beatAt: ago(45_000) }]]);
    ok("1.353 · 414 · a STALE engine paints the DANGER Callout with `role=\"alert\"`, and its meta says when the planner was last seen",
      stale?.tone === "danger" && stale?.alert === true && typeof stale?.title === "string"
        && String(stale?.meta).startsWith("Last seen:") && typeof stale?.noticeKey === "string",
      j(stale));
    const healthy = await noticeFor([[ENGINE_KEY, { bootAt: ago(600_000) }], [RK.plannerBeat, { beatAt: ago(5_000) }]]);
    ok("1.353 · …and a live planner with NO poller beat at all paints NOTHING — the idle-engine false alarm PLAN.md:450's OR would have printed on the console's gravest statement",
      healthy === null, j(healthy));
    const booting = await noticeFor([[ENGINE_KEY, { bootAt: ago(20_000) }]]);
    ok("1.414 · a boot inside the grace is NEUTRAL and does NOT announce — an alert that fires on every deploy trains an officer to ignore the one that matters",
      booting?.tone === "neutral" && booting?.alert === false, j(booting));
    const failing = await noticeFor([
      [ENGINE_KEY, { bootAt: ago(600_000) }], [RK.plannerBeat, { beatAt: ago(5_000) }],
      [POLLER_KEY, { beatAt: ago(120_000), pollerErrorAt: ago(4_000), pollerErrorCode: "claim exploded", pollerErrorStreak: 11 }],
    ]);
    ok("1.414 · ⭐ 514 · a poller ERROR newer than its own beat is DANGER and announces — the condition A24 exists for, and the one that had no writer at all before this step",
      failing?.tone === "danger" && failing?.alert === true && /\b11\b/.test(String(failing?.body)) && !/TZS/.test(String(failing?.body)),
      j(failing));
    const duty = await noticeFor([
      [ENGINE_KEY, { bootAt: ago(600_000) }],
      [RK.plannerBeat, { beatAt: ago(5_000), pollerErrorAt: ago(5_000), pollerErrorCode: "hourly,lossStops" }],
    ]);
    ok("1.414 · ⭐ X1 · a live engine whose last pass failed a duty is a WARNING that does not announce, and the duties are named in the console's own words — never as identifiers and never as the database's message",
      duty?.tone === "warning" && duty?.alert === false
        && String(duty?.body).includes(GATEM.consoleDutyPhrase("hourly")) && String(duty?.body).includes(GATEM.consoleDutyPhrase("lossStops"))
        && !String(duty?.body).includes("lossStops") && !String(duty?.body).includes("hourly,"),
      j(duty));

    /* ⛔ 354(c) · A FAILED BEAT READ IS NEVER AN ABSENT CARD AND NEVER A HEALTHY-LOOKING ONE. */
    const realInstances = w.dal.houseBotRuntimeStore.listInstances;
    let unreadable: Any;
    try {
      w.dal.houseBotRuntimeStore.listInstances = async () => { throw new Error("the runtime rows could not be read"); };
      unreadable = (await withControl({ enabled: true, offCause: null })).engine ?? null;
    } finally {
      w.dal.houseBotRuntimeStore.listInstances = realInstances;
    }
    ok("1.354 · 309 · beats that could NOT be read paint the DANGER Callout with meta 'Last seen: unknown' — never an absent card, and never a healthy band",
      unreadable?.tone === "danger" && unreadable?.alert === true && unreadable?.meta === "Last seen: unknown", j(unreadable));
    ok("1.354 · CONTROL · the same render with the read WORKING does not paint that meta, so the sentence above came from the failure and not from every render",
      (await noticeFor([[ENGINE_KEY, { bootAt: ago(600_000) }], [RK.plannerBeat, { beatAt: ago(45_000) }]]))?.meta !== "Last seen: unknown", "");

    /* ⛔ 432(n) · THE SWITCH BEING OFF SAYS NOTHING HERE, because the strip one card up already says it. */
    await setRuntime([[ENGINE_KEY, { bootAt: ago(600_000) }], [RK.plannerBeat, { beatAt: ago(45_000) }]]);
    const offView = await withControl({ enabled: false, offCause: "MANUAL" });
    ok("1.414 · 432(n) · with the desk OFF the engine Callout is not painted at all — the strip one card up already says 'The desk is off. Nothing will be staked.'",
      (offView.engine ?? null) === null && offView.stateSentence === "The desk is off. Nothing will be staked.", j(offView.engine));

    /* ⛔ 309 · ONE BEAT READ PER RENDER, measured with a spy that is shown able to fire. */
    let instanceReads = 0;
    try {
      w.dal.houseBotRuntimeStore.listInstances = (...a: Any[]) => { instanceReads++; return realInstances.apply(w.dal.houseBotRuntimeStore, a as Any); };
      await GATEM.houseRosterForConsole(OFFICER, "/admin/desk");
    } finally {
      w.dal.houseBotRuntimeStore.listInstances = realInstances;
    }
    ok("1.309 · exactly ONE beat read per render pass, inside the one settled set — the engine facts are not a second door (435(e))",
      instanceReads === 1, j({ instanceReads }));

    /* ⛔ X1 · EVERY DUTY THE PLANNER CAN NAME HAS A PHRASE, over the POPULATION DERIVED FROM THE PLANNER'S OWN
     * UNION — never a list typed here, because a duty added later would then reach an owner's screen as an
     * identifier and nothing would go red on the day it happened (ruling 513's class). */
    const plannerSrc = decomment(read("src/lib/server/house-bot/planner.ts"));
    const unionText = /export type DutyName\s*=([\s\S]*?);/.exec(plannerSrc)?.[1] ?? "";
    const dutyNames = [...unionText.matchAll(/"([A-Za-z]+)"/g)].map((m) => m[1]);
    ok("1.414 · X1 · every member of the planner's own `DutyName` union has a neutral phrase, over a population DERIVED from that union rather than typed here",
      dutyNames.length >= 15 && dutyNames.every((n: string) => GATEM.consoleDutyPhrase(n) !== n && !NEUTRAL.test(GATEM.consoleDutyPhrase(n))),
      j({ duties: dutyNames.length, missing: dutyNames.filter((n: string) => GATEM.consoleDutyPhrase(n) === n) }));
    ok("1.414 · X1 · CONTROL · the union really was parsed (it names the money duties by their own spellings) and an INVENTED duty falls through to its bare name, which is the window the case above keeps one run long",
      dutyNames.includes("deadline") && dutyNames.includes("lossStops") && dutyNames.includes("hourly")
        && GATEM.consoleDutyPhrase("notADuty") === "notADuty",
      j(dutyNames.slice(0, 4)));

    /* ⛔ 453 · EVERY SENTENCE THE CALLOUT CAN PAINT, OVER EVERY VERDICT THIS RUN REACHED. */
    const noticeStrings = [stale, booting, failing, duty, unreadable, healthy]
      .filter((n: Any) => n !== null)
      .flatMap((n: Any) => [n.title, n.body, n.meta, n.caption])
      .filter((v: unknown): v is string => typeof v === "string");
    ok("1.414 · 453 · not one word of any engine Callout names the feature, and the scan had five distinct verdicts' copy in it",
      noticeStrings.length >= 12 && noticeStrings.every((s: string) => !NEUTRAL.test(s)) && houseHits(noticeStrings.join(" ")).length === 0,
      j({ scanned: noticeStrings.length, hits: noticeStrings.filter((s: string) => NEUTRAL.test(s)) }));
    ok("1.414 · 453 · CONTROL · the scan really covered five different verdicts, each with its own stable key, so a refresh cannot re-announce a state that has not changed (309)",
      new Set([stale, booting, failing, duty, unreadable].map((n: Any) => n?.noticeKey)).size === 5, "");

    await setRuntime([]);
  }

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
    const spyCtl = { roster: 0, usage: 0, sawSpy: 0, sawReal: 0 };
    let rosterPass: Any, usagePass: Any;
    /* ⛔ THE IDENTITY THE CONTROL BELOW CHECKS. Each spy records, FROM INSIDE ITS OWN BODY, which function object was
     * installed on the store at the moment the reader called it. That is what proves the patch reached the module
     * under test — the old control called through the handle it had just patched, so it incremented whatever the
     * readers had done and could not fail. A control that fires either way is not a control. */
    let rosterSpy: Any, usageSpy: Any;
    try {
      rosterSpy = (...a: Any[]) => {
        spyCtl.roster++;
        if (w.dal.houseBotControlStore.get === rosterSpy) spyCtl.sawSpy++; else spyCtl.sawReal++;
        return realCtl.apply(w.dal.houseBotControlStore, a as Any);
      };
      w.dal.houseBotControlStore.get = rosterSpy;
      rosterPass = await GATEM.houseRosterForConsole(OFFICER, "/admin/desk");
      usageSpy = (...a: Any[]) => {
        spyCtl.usage++;
        if (w.dal.houseBotControlStore.get === usageSpy) spyCtl.sawSpy++; else spyCtl.sawReal++;
        return realCtl.apply(w.dal.houseBotControlStore, a as Any);
      };
      w.dal.houseBotControlStore.get = usageSpy;
      usagePass = await GATEM.houseUsageForConsole(OFFICER, "/admin/desk", { houseBotId: null });
    } finally { w.dal.houseBotControlStore.get = realCtl; }
    ok("1.306 · 1.312 · each render pass reads the control row EXACTLY ONCE — the strip's count and the rail's badge can never be two different reads",
      spyCtl.roster === 1 && spyCtl.usage === 1, j(spyCtl));
    ok("1.306 · CONTROL · IDENTITY · both reads went through the patched handle itself — not through a second copy of the DAL, and not through a control that called its own patch",
      spyCtl.sawSpy === 2 && spyCtl.sawReal === 0 && rosterSpy !== usageSpy
        && w.dal.houseBotControlStore.get === realCtl, j(spyCtl));
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
    /* ⛔ THE THIRD POPULATION IS DERIVED FROM `cap-precheck.ts`, NOT TYPED. It was a list of seven written here,
     * and the control below only VALIDATED each typed name against the source — so a cap that BECAME unconditional,
     * or a new one, was invisible to the guard whose whole subject is "which caption does this field get". The
     * fields the seam reads before it ever enters `if (f.staffChosen)` are read off the function itself. */
    const precheckSrc = decomment(read("src/lib/server/house-bot/cap-precheck.ts"));
    const fnAt = precheckSrc.indexOf("export function capPrecheck(");
    const preStaff = precheckSrc.slice(fnAt, precheckSrc.indexOf("if (f.staffChosen)", fnAt));
    const UNCONDITIONAL = [...new Set([...preStaff.matchAll(/\bb\.(\w+)/g)].map((m) => m[1]))];
    const MASTER = "Not set — the master switch cannot be turned on.";
    const TARGETED = "Not set — targeted and manual stakes cannot be placed.";
    const ACCOUNT = "Not set — this account cannot place a bet.";
    /* ⚠️ EVERY CALL NOW PASSES THE RENDER'S SWITCH STATE (replan ruling 547). The chooser took the field alone and
     * had no reference to `on` at all, which is how "the master switch cannot be turned on" came to sit under a chip
     * reading ON. These three assert the SWITCH-OFF reading; the ON reading is its own case below. */
    const off = (f: string) => GATEM.unsetCaptionFor(f, false);
    ok("1.364 · every member of `REQUIRED_FOR_MASTER_ON` gets the master-switch caption while the desk is OFF, and the list is not empty",
      REQ.length >= 8 && REQ.every((f) => off(f) === MASTER), j(REQ.filter((f) => off(f) !== MASTER)));
    ok("1.364 · every member of `CLEAR_EXEMPT` gets the targeted-and-manual caption — the blanket sentence would be a LIE on a staff-chosen cap",
      EXEMPT.length >= 7 && EXEMPT.every((f) => off(f) === TARGETED), j(EXEMPT.filter((f) => off(f) !== TARGETED)));
    ok("1.364 · every cap the seam reads UNCONDITIONALLY gets the third caption, and it says `account` — ruling 453 outranks 364's own wording",
      UNCONDITIONAL.every((f) => off(f) === ACCOUNT) && !NEUTRAL.test(ACCOUNT), j(UNCONDITIONAL.map((f) => off(f))));
    /* ━━ 1.547 · RULING 306's DEFECT, ONE CARD LOWER ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     * Found by rendering the ON state, which no tile of this section had ever carried: the chip read ON, 306's own
     * fix held in the STRIP — "Set N global limits first →" correctly absent — and about 500px lower the usage card
     * still said "the master switch cannot be turned on." Two opposite statements about one switch, on one screen,
     * on the card that stops money.
     * ⚠️ The state is REACHABLE: a required limit can be cleared AFTER the desk is switched on, which is exactly how
     * the tile that found this was taken.
     * ⛔ AND THE ON SENTENCE IS NOT NEW COPY — it is the consequence the KPI tile has spelled since step 1, which is
     * what makes it the right one: with the desk ON and a required cap unset, `over(cap, value)` is
     * `cap == null || value > cap`, so every stake is refused. The two are asserted to be the SAME STRING, so a
     * later edit cannot drift one from the other. */
    {
      const onCap = (f: string) => GATEM.unsetCaptionFor(f, true);
      ok("1.547 · with the desk ON, a required limit's unset caption states the CONSEQUENCE — never that a switch already on cannot be turned on",
        REQ.every((f) => onCap(f) !== MASTER && onCap(f).startsWith("Not set —") && /nothing can be staked until this limit is set/.test(onCap(f))),
        j([...new Set(REQ.map(onCap))]));
      ok("1.547 · …and the OFF reading is unchanged, so the split is a BRANCH and not a rewrite",
        REQ.every((f) => off(f) === MASTER) && new Set(REQ.map(onCap)).size === 1 && onCap(REQ[0]) !== off(REQ[0]),
        j({ on: onCap(REQ[0]), off: off(REQ[0]) }));

      /* ⛔ AND THE STATE THE TILE ACTUALLY SHOWED, RENDERED — the panel with the desk ON and a required cap cleared.
       * A function-level split alone would not have caught this: the defect was that the PANEL never told the
       * chooser what the strip already knew. So the two cards are read off ONE render and compared to each other. */
      await w.limits({ gCapOpenExposureTzs: null });
      await w.switchOn();
      const onPanel = await GATEM.houseUsageForConsole(OFFICER, "/admin/desk", { houseBotId: null });
      const onRow = (onPanel.limits as Any[]).find((l: Any) => l.unset && l.name === GATEM.consoleLimitLabel("gCapOpenExposureTzs")) ?? null;
      const onBar = (onPanel.usage as Any[]).find((u: Any) => u.unsetCaption !== null) ?? null;
      const unsetTile = (onPanel.tiles as Any[]).find((t: Any) => t.value === "Not set") ?? null;
      ok("1.547 · RENDERED · with the chip reading ON, neither the usage bar nor the limits list says the master switch cannot be turned on",
        onPanel.on === true && onPanel.limitsFirstReason === null
          && onRow !== null && onBar !== null
          && !/master switch cannot be turned on/.test(onRow.caption)
          && !/master switch cannot be turned on/.test(onBar.unsetCaption),
        j({ on: onPanel.on, strip: onPanel.limitsFirstReason, row: onRow && onRow.caption, bar: onBar && onBar.unsetCaption }));
      /* ⛔ ONE HOME, COMPARED AGAINST THE TILE ITSELF: the sentence the ON caption spends is the KPI tile's own
       * delta for an unset limit, read off the SAME painted view model rather than re-typed in this file. */
      ok("1.547 · CONTROL · that sentence is the KPI tile's own delta for an unset limit — ONE home, compared on one render, never typed twice",
        unsetTile !== null && onRow !== null && onRow.caption === `Not set — ${unsetTile.delta}.`
          && onBar !== null && onBar.unsetCaption === onRow.caption,
        j({ caption: onRow && onRow.caption, delta: unsetTile && unsetTile.delta }));
      /* ⛔ AND THE OFF STATE STILL SAYS THE SWITCH SENTENCE ON THE SAME PANEL, so the case above measures the BRANCH
       * and not the disappearance of a sentence. */
      await w.switchOff();
      const offPanel = await GATEM.houseUsageForConsole(OFFICER, "/admin/desk", { houseBotId: null });
      const offRow = (offPanel.limits as Any[]).find((l: Any) => l.unset && l.name === GATEM.consoleLimitLabel("gCapOpenExposureTzs")) ?? null;
      ok("1.547 · CONTROL · switched OFF, the very same row says the master switch cannot be turned on — and the strip says it too",
        offPanel.on === false && offRow !== null && /master switch cannot be turned on/.test(offRow.caption)
          && offPanel.limitsFirstReason !== null,
        j({ on: offPanel.on, row: offRow && offRow.caption, strip: offPanel.limitsFirstReason }));
      await w.limits();
    }
    /* ⛔ THE THREE POPULATIONS DO NOT OVERLAP, so the chooser's ORDER is not doing the deciding for it. */
    ok("1.364 · CONTROL · the three populations are disjoint and the three captions differ, so the branch order is not what makes the case pass",
      new Set([MASTER, TARGETED, ACCOUNT]).size === 3
        /* ⛔ AND THE ONE FIELD THE PANEL SELECTS BY PROPERTY RATHER THAN BY NAME REALLY IS UNIQUE (453). */
        && GATEM.TARGETED_DAILY_TZS_FIELD === "gCapStaffChosenDailyTzs"
        && (R.LIMIT_FIELDS as readonly string[]).filter((f) => EXEMPT.includes(f) && R.FIELD_META[f].unit === "TZS").length === 1
        && !REQ.some((f) => EXEMPT.includes(f)) && !UNCONDITIONAL.some((f) => REQ.includes(f) || EXEMPT.includes(f)),
      j({ req: REQ.length, exempt: EXEMPT.length, uncond: UNCONDITIONAL.length }));
    /* ⛔ AND THE DERIVATION IS SHOWN TO HAVE READ SOMETHING, AND TO HAVE READ THE RIGHT HALF. A slice that found
     * nothing yields an EMPTY population, and `[].every(…)` is the absence trap in its purest form; a slice that ran
     * past `if (f.staffChosen)` would drag the staff-chosen caps in and give them the wrong caption. Both are
     * refused: a floor of seven, and every derived name must be absent from the staff-chosen block. */
    const staffBlock = precheckSrc.slice(precheckSrc.indexOf("if (f.staffChosen)"));
    ok("1.364 · CONTROL · the unconditional population is DERIVED from `cap-precheck.ts` — at least seven caps, each really read OUTSIDE `if (f.staffChosen)`",
      fnAt > 0 && UNCONDITIONAL.length >= 7
        && UNCONDITIONAL.every((f) => precheckSrc.includes(`b.${f}`) && !staffBlock.includes(`b.${f}`))
        && (R.CLEAR_EXEMPT as readonly string[]).every((f) => !UNCONDITIONAL.includes(f)),
      j({ derived: UNCONDITIONAL }));
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
    /* ⛔ AND A REQUIRED cap's unset caption IS linked, because the field that fixes it is on this very page.
       ⛔ TWO REQUIRED LIMITS ARE UNSET, NOT ONE, AND THAT IS WHAT MAKES THE NEXT ASSERTION ABLE TO FAIL (replan
       ruling 541(c)). With exactly one unset member of `REQUIRED_FOR_MASTER_ON`, `unset && required` and
       `unset && required && !firstUnsetTaken` produce the SAME single flag — so the declared mutation
       `306-anchor-everywhere`, which drops `!firstUnsetTaken`, passed. A fixture in the one shape that cannot
       discriminate is not a fixture. */
    await w.limits({ gCapDailyStakeTzs: null, gCapOpenExposureTzs: null });
    const u2 = await GATEM.houseUsageForConsole(OFFICER, "/admin/desk", { houseBotId: null });
    ok("1.364 · a REQUIRED cap's unset caption names the master switch and carries the link to the field that fixes it",
      u2.usage[0].limitTzs === null && u2.usage[0].unsetCaption === "Not set — the master switch cannot be turned on." && u2.usage[0].unsetLinked === true,
      j(u2.usage[0]));
    /* ⛔ THE ANCHOR IS ON THE FIRST UNSET REQUIRED LIMIT, AND ON EXACTLY ONE ROW. */
    const flagged = u2.limits.filter((l: Any) => l.firstUnset);
    ok("1.306 · exactly ONE row of the limits list carries the anchor, and it is the FIRST unset REQUIRED limit in form order — with TWO of them unset, so the `!firstUnsetTaken` term is doing the deciding",
      flagged.length === 1 && flagged[0].name === GATEM.consoleLimitLabel("gCapDailyStakeTzs")
        && u2.limits.filter((l: Any) => l.unset && (R.REQUIRED_FOR_MASTER_ON as readonly string[]).some((f) => GATEM.consoleLimitLabel(f) === l.name)).length >= 2
        && u2.limits.findIndex((l: Any) => l.firstUnset) === u2.limits.findIndex((l: Any) => l.unset),
      j({ flagged: flagged.map((l: Any) => l.name), list: u2.limits.map((l: Any) => [l.name, l.unset, l.firstUnset]) }));
    /* ⛔ AND THE ONE-UNSET BOUNDARY IS KEPT BESIDE IT. 541(c)'s fixture is a STRENGTHENING, not a replacement:
       the single-unset state is the one an officer actually meets most often, it is the state the strip's
       "Set 1 global limit first →" is written for, and dropping it would quietly take two painted strings and a
       whole state out of §3's lexicon scan. */
    await w.limits({ gCapDailyStakeTzs: null });
    const u2one = await GATEM.houseUsageForConsole(OFFICER, "/admin/desk", { houseBotId: null });
    ok("1.306 · with exactly ONE required limit unset the anchor is on it, and the strip's count agrees",
      u2one.limits.filter((l: Any) => l.firstUnset).length === 1 && u2one.unsetRequired === 1
        && u2.unsetRequired === 2,
      j({ one: u2one.unsetRequired, two: u2.unsetRequired }));
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
    /* ⭐ THE POPULATION IS BOTH HALVES OF THE FIELD TABLE AT C7 STEP 4. Step 3 derived it over `LIMIT_FIELDS`
       alone, because the limits tab was the only surface that painted a field name; the account page paints the
       PER-ACCOUNT caps, and two of those labels carry `staff[- ]?chosen` exactly as their global twins do. A
       population that stops at the surface that existed when it was written is the class 513 and 539 both are. */
    const NAMED_FIELDS = [...LIMITS, ...(R.CAP_FIELDS as readonly string[])];
    const NEEDS = NAMED_FIELDS.filter((f) => NEUTRAL.test(R.FIELD_META[f].label));
    const OVERRIDDEN = NAMED_FIELDS.filter((f) => GATEM.consoleLimitLabel(f) !== R.FIELD_META[f].label);
    ok("1.364 · CONTROL · every `FIELD_META` label this overrides really DOES carry a word, and every label that carries one IS overridden — the population is derived, never a typed four",
      NEEDS.length >= 9 && j(NEEDS) === j(OVERRIDDEN)
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
    STATES.push(["limits-panel", u3], ["limits-unset-required", u2], ["limits-unset-one", u2one]);
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
      /* ⭐ TWO DERIVATIONS FROM C7 STEP 4, ONE PER RENDER PASS, AND EACH IS NAMED. 348 fixes the key at one
         derivation PER RENDER, not one per module: the desk's own read set derives it in `readDeskCore`, and the
         account page — a different render of a different route — derives its own in `houseDetailForConsole` and
         hands it to every read that needs a day. What 348 forbids is a SECOND derivation inside one pass, and what
         it names as the wrong clock is `dbClock()`, which still appears nowhere.
         ⛔ SO THE PIN IS PER READER, NOT A MODULE COUNT: each of the two slices holds exactly one. A module count
         would have had to rise every time a route was added, which is a ratchet that teaches you to raise it. */
      const deskSlice = gateSrc.slice(gateSrc.indexOf("async function readDeskCore"), gateSrc.indexOf("export async function houseUsageForConsole"));
      const detailSlice = gateSrc.slice(gateSrc.indexOf("export async function houseDetailForConsole"));
      ok("1.348 · exactly ONE `eatDayKey(` call in EACH gated reader's own slice — two renders, two passes, never two days in one — and no `dbClock(` anywhere in the module",
        (deskSlice.match(/eatDayKey\(/g) ?? []).length === 1
          && (detailSlice.match(/eatDayKey\(/g) ?? []).length === 1
          && (gateSrc.match(/eatDayKey\(/g) ?? []).length === 2 && !/dbClock\(/.test(gateSrc),
        j({ desk: (deskSlice.match(/eatDayKey\(/g) ?? []).length, detail: (detailSlice.match(/eatDayKey\(/g) ?? []).length, dbClock: /dbClock\(/.test(gateSrc) }));
      /* ⛔ AND THE FIFTH READ REALLY IS GIVEN IT AT SOURCE. The behavioural case above proves today's code; this
         pins the SHAPE, so a future panel that adds a sixth read without a key is reported beside it. */
      /* ⭐ TWO FACTORIES FROM C7 STEP 4, EACH SETTLED ON ITS OWN. The roster needs the Products words AND the
         rate read "Last bet" comes from; wrapping the two in one `Promise.all` inside the settled set would let one
         failure blank both cells, which is the attribution 355 exists to keep. Both are still FACTORIES of the day
         key, which is what lets a read be created with the render's own key in hand and still start inside the one
         settled set — the correction 433(c) needed. */
      ok("1.348 · `readDeskCore` takes FACTORIES of the day key, and the panel read is still called with it",
        /* ⚠️ TERM BY TERM, NEVER AS ONE MULTI-LINE REGEX: the files in this repository are CRLF, so a pattern
           spelling `\n` between two lines of a signature matches nothing and the pin reads as a pass that proves
           less than it says. Measured on this very assertion. */
        /async function readDeskCore<A, B>\(/.test(gateSrc)
          && /extraA: \(dayKey: string\) => Promise<A>,/.test(gateSrc)
          && /extraB\?: \(dayKey: string\) => Promise<B>,/.test(gateSrc)
          && /staffChosenPlacedToday\(\{ houseBotId: query\.houseBotId, dayKey \}\)/.test(gateSrc)
          && /readDeskCore\(\(dayKey\) =>/.test(gateSrc),
        j({ factory: /async function readDeskCore<A, B>\(/.test(gateSrc) }));
      /* ⛔ AND THE ACCOUNT PAGE HANDS ITS OWN KEY TO BOTH READS THAT NEED A DAY, for the same reason: the card
         would otherwise straddle EAT midnight and print two days on one screen. */
      ok("1.348 · the account page's day-book and targeted-and-manual reads are both given the render's OWN key",
        /houseDayBook\(dayKey, bot\.id\)/.test(gateSrc)
          && /staffChosenPlacedToday\(\{ houseBotId: bot\.id, dayKey \}\)/.test(gateSrc), "");
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
    /* ⛔ A MISSING SCHEMA IS A STATE; ONLY A FAILED READ IS `null` (421, 355, 432(n)). The reader answered `null`
       for both, so `?tab=limits` on a database without the migration painted TWO `AdminLoadError` cards UNDER the
       Callout that had already said why — the same fact three times, with the kit's failure treatment standing in
       for a state. The old case could not have caught it: its label claimed "the page's own Callout owns the cause"
       while it asserted only the READER's nulls. */
    ok("1.421 · a missing schema leaves the limits panel with nothing to LIST — empty, not failed, and never the kit's failure treatment",
      schemaView.schemaMissing === true && Array.isArray(schemaView.usage) && schemaView.usage.length === 0
        && Array.isArray(schemaView.limits) && schemaView.limits.length === 0 && schemaView.tiles.length === 0,
      j({ schemaMissing: schemaView.schemaMissing, usage: schemaView.usage, limits: schemaView.limits }));
    /* ⛔ AND A READ THAT REALLY FAILED IS STILL `null`, so `AdminLoadError` keeps meaning what it says. */
    const realCtl3 = w.dal.houseBotControlStore.get;
    let unreadableView: Any;
    try {
      w.dal.houseBotControlStore.get = async () => { throw new Error("planted generic control failure"); };
      unreadableView = await GATEM.houseUsageForConsole(OFFICER, "/admin/desk", { houseBotId: null });
    } finally { w.dal.houseBotControlStore.get = realCtl3; }
    ok("1.421 · CONTROL · a GENERIC control failure is NOT that state: usage and limits are `null`, which is what the kit's failure treatment is for",
      unreadableView.schemaMissing === false && unreadableView.controlUnreadable === true
        && unreadableView.usage === null && unreadableView.limits === null,
      j({ schemaMissing: unreadableView.schemaMissing, unreadable: unreadableView.controlUnreadable }));
    STATES.push(["limits-unreadable", unreadableView]);
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
/* ════════════════════════════════════════════════════════════════════════════════════════════════════════════════
 * §2b · THE LIMITS SAVE — the console's first working control (replan ruling 537, which REVERSES ruling 433(a))
 *
 * ⛔ WHAT 433(a) BELIEVED, AND WHAT WAS MEASURED. Step 3 shipped this panel read-only because "there is no
 * limits-SAVE service in this repository". `houseBotControlStore.saveLimits` exists in BOTH twins with CAS
 * semantics, its validation surface is green at `test:house-bot-rules` 521/0, and `house_bot.limits_saved` was
 * already classified COMPLIANCE with no writer — the dead-row class ruling 514 named. What was missing was one
 * server action. So this section proves the whole round trip, on BOTH stores: the refusal, the write, the audit
 * row, the CAS conflict under TWO REAL WRITERS, every refusal sentence, and the neutral keys.
 * ════════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
section("§2b · the limits save");
{
  const { auditFlush, getAuditPage }: Any = await import("../../src/lib/server/audit.ts");
  const CONST: Any = await import("../../src/lib/house-bot/constants.ts");
  /* ⛔ A BASELINE THE EDITS BELOW CANNOT VIOLATE BY ACCIDENT. The world's open limits set the daily LOSS and the
     targeted daily cap to the same 900,000,000 as the daily STAKE, so every case that lowers the stake would trip
     `L-LOSS-LE-DAY` or `N1-c` and be refused for a reason it was not written to measure — a case that goes red for
     the wrong reason goes green for the wrong reason too. Both are put well below every stake this section types. */
  await w.limits({ gCapDailyLossTzs: 100_000, gCapStaffChosenDailyTzs: 100_000 });
  await w.switchOff();
  const LIMITS = R.LIMIT_FIELDS as readonly string[];
  const view0 = await GATEM.houseUsageForConsole(OFFICER, "/admin/desk", { houseBotId: null });
  const keyOf = (field: string): string => view0.limits[LIMITS.indexOf(field)].key;
  const control = () => w.dal.houseBotControlStore.get() as Promise<Any>;
  const versionNow = async () => (await control()).limitsVersion as number;
  /** Exactly what the form posts: every neutral key, with the saved digits, and the caller's own edits on top. */
  const postAt = (v: number, patch: Record<string, string> = {}) => ({
    baseVersion: v,
    values: { ...Object.fromEntries(view0.limits.map((l: Any) => [l.key, l.input])), ...patch } as Record<string, string>,
  });
  const save = (viewer: string | null, body: Any) => GATEM.houseLimitsSaveForConsole(viewer, "/admin/desk", body) as Promise<Any>;

  ok("2.537 · fixture · the panel hands the form a base version and one row per limit, each with a neutral key of its own",
    typeof view0.limitsVersion === "number" && view0.limits.length === LIMITS.length
      && new Set(view0.limits.map((l: Any) => l.key)).size === LIMITS.length,
    j({ version: view0.limitsVersion, rows: view0.limits.length }));

  /* ⛔ 537 / 522 / 523 · A VIEWER OUTSIDE THE AUDIENCE IS REFUSED BEFORE ANYTHING IS READ OR WRITTEN. A server
   * action is a POST to whatever URL the browser is on, so no path rule can see it: this is the only gate there is,
   * and it decides on the STORED row. The spy counts the same three doors 1.300 counts, plus the WRITE itself. */
  {
    const player = await w.user({ role: "PLAYER" });
    const auditor = await w.user({ role: "AUDITOR" });
    const realCtl = w.dal.houseBotControlStore.get;
    const realSave = w.dal.houseBotControlStore.saveLimits;
    const realList = w.dal.houseBotStore.listNonRemoved;
    let calls = 0;
    let refusedPlayer: Any, refusedAuditor: Any, refusedAnon: Any;
    try {
      w.dal.houseBotControlStore.get = (...a: Any[]) => { calls++; return realCtl.apply(w.dal.houseBotControlStore, a as Any); };
      w.dal.houseBotControlStore.saveLimits = (...a: Any[]) => { calls++; return realSave.apply(w.dal.houseBotControlStore, a as Any); };
      w.dal.houseBotStore.listNonRemoved = (...a: Any[]) => { calls++; return realList.apply(w.dal.houseBotStore, a as Any); };
      const body = postAt(view0.limitsVersion, { [keyOf("gCapDailyStakeTzs")]: "123000" });
      refusedPlayer = await save(player, body);
      refusedAuditor = await save(auditor, body);
      refusedAnon = await save(null, body);
    } finally {
      w.dal.houseBotControlStore.get = realCtl;
      w.dal.houseBotControlStore.saveLimits = realSave;
      w.dal.houseBotStore.listNonRemoved = realList;
    }
    const after = await control();
    ok("2.537 · a PLAYER, a signed-in AUDITOR and an anonymous caller are each REFUSED, with ZERO store calls and not one column touched",
      [refusedPlayer, refusedAuditor, refusedAnon].every((r) => r.ok === false && typeof r.error === "string" && r.field === undefined)
        && calls === 0 && after.limitsVersion === view0.limitsVersion && after.gCapDailyStakeTzs !== 123_000,
      j({ calls, version: after.limitsVersion, player: refusedPlayer, auditor: refusedAuditor }));
    ok("2.537 · CONTROL · the spy was live — the SAME body from the Owner reaches the store and lands",
      await (async () => {
        let owned = 0;
        const r2 = w.dal.houseBotControlStore.saveLimits;
        try {
          w.dal.houseBotControlStore.saveLimits = (...a: Any[]) => { owned++; return r2.apply(w.dal.houseBotControlStore, a as Any); };
          const done = await save(OFFICER, postAt(await versionNow(), { [keyOf("gCapDailyStakeTzs")]: "123000" }));
          return done.ok === true && owned === 1 && (await control()).gCapDailyStakeTzs === 123_000;
        } finally { w.dal.houseBotControlStore.saveLimits = r2; }
      })(), "");
  }

  /* ⛔ 537 · THE SAVE LANDS, AND `house_bot.limits_saved` GAINS ITS WRITER (the dead-row class of ruling 514). */
  {
    const v = await versionNow();
    const done = await save(OFFICER, postAt(v, { [keyOf("gCapDailyStakeTzs")]: "777000" }));
    const row = await control();
    ok("2.537 · the Owner's save lands: the column moves, the version advances by exactly one, the result counts what changed and says its record was written",
      done.ok === true && done.limitsVersion === v + 1 && done.changed === 1 && done.recorded === true
        && row.gCapDailyStakeTzs === 777_000 && row.limitsVersion === v + 1,
      j({ done, version: row.limitsVersion, value: row.gCapDailyStakeTzs }));

    await auditFlush();
    const rows = (getAuditPage({ limit: 10_000 }) as Any[]).filter((e) => e.action === "house_bot.limits_saved");
    const entry = rows.find((e) => e.payload?.limitsVersion === v + 1) ?? null;
    ok("2.537 · …and it writes the COMPLIANCE row `house_bot.limits_saved` — which had a classification and no writer at all until now",
      rows.length >= 1 && entry !== null && entry.category === CONST.HOUSE_AUDIT["house_bot.limits_saved"]
        && entry.targetType === "HouseBotControl" && entry.targetId === CONST.HOUSE_CONTROL_ID,
      j({ found: rows.length, entry: entry && { action: entry.action, category: entry.category, target: entry.targetId } }));
    ok("2.537 · 420 · the row names the ACTOR BY ID and the payload carries only the version and the fields that moved — no label, no handle, no name",
      entry !== null && entry.actorId === OFFICER
        && j(entry.payload.changes) === j([{ field: "gCapDailyStakeTzs", before: 123_000, after: 777_000 }])
        && CONST.isAllowedHouseAuditPayload(entry.payload) === true
        && !/label|displayName|phone|handle|Player #/i.test(all(entry.payload)),
      j({ actorId: entry?.actorId, payload: entry?.payload }));
  }

  /* ⛔ A SAVE THAT LANDED MAY NOT REPORT THAT NOTHING WAS SAVED — AND THIS WAS MEASURED ON A SERVED BUILD.
   *
   * The audit module is documented as never rejecting and it fails OPEN on a database outage, so the first pass
   * awaited it after the write and let it speak for itself. Driven against `next start`, `chainSecret()` threw
   * outright (`NODE_ENV=production` without a distinct `AUDIT_CHAIN_SECRET`) — past the in-memory fallback too —
   * and the officer was told "Nothing was saved. Reload the page and try again." while the control row HAD moved.
   * The next thing an officer does with that sentence is type the change again.
   * ⛔ THE FAULT IS INJECTED THROUGH THE AUDIT MODULE'S OWN PRECONDITION, not through a seam invented for a test:
   * under `NODE_ENV=production` it REQUIRES a chain secret distinct from the session secret, and both halves of
   * that are restored in a `finally`. ⛔ And the gap is never swallowed: `recorded` is FALSE, which is what makes
   * the page render a warning instead of a success. */
  {
    const v = await versionNow();
    const before = (await control()).gCapPerMarketTzs;
    const env0 = { node: process.env.NODE_ENV, chain: process.env.AUDIT_CHAIN_SECRET, session: process.env.SESSION_SECRET };
    let landed: Any;
    try {
      (process.env as Any).NODE_ENV = "production";
      process.env.SESSION_SECRET = "same-secret-for-both-32-characters";
      process.env.AUDIT_CHAIN_SECRET = "same-secret-for-both-32-characters";
      landed = await save(OFFICER, postAt(v, { [keyOf("gCapPerMarketTzs")]: "44000" }));
    } finally {
      (process.env as Any).NODE_ENV = env0.node;
      if (env0.chain === undefined) delete process.env.AUDIT_CHAIN_SECRET; else process.env.AUDIT_CHAIN_SECRET = env0.chain;
      if (env0.session === undefined) delete process.env.SESSION_SECRET; else process.env.SESSION_SECRET = env0.session;
    }
    const row = await control();
    ok("2.537 · a save whose COMPLIANCE ROW cannot be written still reports the truth: it LANDED, and it says the record did not",
      landed.ok === true && landed.recorded === false && landed.limitsVersion === v + 1
        && row.gCapPerMarketTzs === 44_000 && row.limitsVersion === v + 1 && before !== 44_000,
      j({ landed, before, after: row.gCapPerMarketTzs }));
    const good = await save(OFFICER, postAt(await versionNow(), { [keyOf("gCapPerMarketTzs")]: "45000" }));
    ok("2.537 · CONTROL · with the chain secret back, the same save reports its record WRITTEN — so the flag above is a measurement and not a constant",
      good.ok === true && good.recorded === true, j(good));
  }

  /* ⛔ 537 · THE CAS ROUND TRIP, WITH TWO REAL WRITERS. A "concurrency check" that serialises itself proves nothing,
   * so both saves are issued against the SAME base version and awaited together: one lands, the other is REFUSED and
   * told, and the loser's value is nowhere in the row. ⛔ The winner is not asserted — either may win; what is
   * asserted is that exactly one did and that nothing was merged. */
  {
    const v = await versionNow();
    const [ra, rb] = await Promise.all([
      save(OFFICER, postAt(v, { [keyOf("gCapDailyStakeTzs")]: "111000" })),
      save(OFFICER, postAt(v, { [keyOf("gCapDailyStakeTzs")]: "222000" })),
    ]);
    const row = await control();
    const winner = ra.ok ? 111_000 : 222_000;
    const loser = ra.ok ? 222_000 : 111_000;
    ok("2.537 · TWO REAL WRITERS on ONE base version: exactly one lands, the other is REFUSED with the server's own sentence, and nothing is clobbered or merged",
      [ra, rb].filter((r) => r.ok === true).length === 1 && [ra, rb].filter((r) => r.ok === false).length === 1
        && row.limitsVersion === v + 1 && row.gCapDailyStakeTzs === winner && row.gCapDailyStakeTzs !== loser,
      j({ ra, rb, version: row.limitsVersion, value: row.gCapDailyStakeTzs }));
    const refusal = (ra.ok ? rb : ra) as Any;
    ok("2.537 · …and the loser is TOLD, in one sentence that says nothing was saved and names no field to fix",
      refusal.ok === false && /Nothing was saved/.test(refusal.error) && refusal.field === undefined && !NEUTRAL.test(refusal.error),
      j(refusal));
    /* ⛔ A STALE TAB IS REFUSED BY THE CHEAP HALF OF THE CHECK, BEFORE ANYTHING ELSE IS READ. The CAS would refuse
     * it too, so the cheap check earns its place only if it saves the reads — which is asserted, not claimed: the
     * roster read is spied, and a save that cannot possibly land must not take it. */
    const realList = w.dal.houseBotStore.listNonRemoved;
    let listCalls = 0;
    let stale: Any;
    try {
      w.dal.houseBotStore.listNonRemoved = (...a: Any[]) => { listCalls++; return realList.apply(w.dal.houseBotStore, a as Any); };
      stale = await save(OFFICER, postAt(v, { [keyOf("gCapDailyStakeTzs")]: "333000" }));
    } finally { w.dal.houseBotStore.listNonRemoved = realList; }
    ok("2.537 · a tab rendered from an older version is refused before the roster is read at all, and its value never reaches the row",
      stale.ok === false && /Nothing was saved/.test(stale.error) && listCalls === 0
        && (await control()).gCapDailyStakeTzs !== 333_000, j({ stale, listCalls }));
  }

  /* ⛔ 537 / 412 · EVERY REFUSAL SENTENCE IS THE SERVER'S, AND IT COMES HOME BY THE FORM'S OWN NEUTRAL KEY. */
  {
    const v = await versionNow();
    const bad = await save(OFFICER, postAt(v, {
      [keyOf("gCapDailyStakeTzs")]: "100000",
      [keyOf("gCapDailyLossTzs")]: "200000",
      [keyOf("gCapStaffChosenDailyTzs")]: "50000",
    }));
    ok("2.537 · a cross-field rule REFUSES, names the field by its NEUTRAL key, gives the validator's own sentence — and writes nothing",
      bad.ok === false && bad.field === keyOf("gCapDailyLossTzs") && bad.error === R.ruleCopy("L-LOSS-LE-DAY")
        && (await versionNow()) === v,
      j(bad));
    /* ⛔ AND WHERE THE SHARED SENTENCE NAMES THE FEATURE, THE CONSOLE SUBSTITUTES ITS OWN (453). Both halves are
     * asserted: the console's sentence is painted, AND the sentence it replaced really does carry a word — an
     * override whose original was already clean would be a rename nobody ruled. */
    const cpp = await save(OFFICER, postAt(v, {
      [keyOf("gCounterPerPlayerPerDay")]: "1000",
      [keyOf("gMaxBetsPerDay")]: "100",
    }));
    ok("2.537 · 453 · a refusal whose SHARED copy names the mechanism is painted in the console's own words — and the copy it replaced really does carry one",
      cpp.ok === false && cpp.field === keyOf("gCounterPerPlayerPerDay")
        && !NEUTRAL.test(cpp.error) && NEUTRAL.test(R.ruleCopy("L-CPP-LE-DAY")) && cpp.error !== R.ruleCopy("L-CPP-LE-DAY"),
      j({ painted: cpp.error, shared: R.ruleCopy("L-CPP-LE-DAY") }));
    /* A bound refusal is the validator's own and is already neutral — asserted, not assumed. */
    const low = await save(OFFICER, postAt(v, { [keyOf("gCapDailyStakeTzs")]: "1" }));
    ok("2.537 · a bound refusal comes back on its own field, in the validator's own words, and needs no override",
      low.ok === false && low.field === keyOf("gCapDailyStakeTzs") && /At least TZS/.test(low.error) && !NEUTRAL.test(low.error), j(low));
  }

  /* ⛔ X-CLEAR-ON: a set limit may not be cleared while the desk is ON, and that sentence names the feature too. */
  {
    await w.limits();
    await w.switchOn();
    const v = await versionNow();
    const cleared = await save(OFFICER, postAt(v, { [keyOf("gCapDailyStakeTzs")]: "" }));
    ok("2.537 · 453 · clearing a required limit while the desk is ON is refused in the console's own words, and the shared sentence it replaces carries a word",
      cleared.ok === false && cleared.field === keyOf("gCapDailyStakeTzs")
        && !NEUTRAL.test(cleared.error) && NEUTRAL.test(R.ruleCopy("X-CLEAR-ON"))
        && (await versionNow()) === v && (await control()).gCapDailyStakeTzs !== null,
      j({ painted: cleared.error, shared: R.ruleCopy("X-CLEAR-ON") }));
    await w.switchOff();
  }

  /* ⛔ THE WHOLE FORM OR NOTHING, AND AN UNKNOWN KEY IS REFUSED RATHER THAN IGNORED. A partial post would leave the
   * missing fields to the validator's "unset" branch and silently CLEAR limits the officer never touched. */
  {
    const v = await versionNow();
    const body = postAt(v);
    const partial = { baseVersion: v, values: { ...body.values } };
    delete partial.values[keyOf("gMaxBetsPerDay")];
    const missing = await save(OFFICER, partial);
    const unknown = await save(OFFICER, { baseVersion: v, values: { ...body.values, gCapDailyStakeTzs: "5000" } });
    const row = await control();
    ok("2.537 · a post missing a field, and a post carrying a COLUMN NAME as a key, are both refused — and neither writes",
      missing.ok === false && unknown.ok === false && row.limitsVersion === v && row.gMaxBetsPerDay !== null,
      j({ missing, unknown }));
  }

  /* ⛔ D19 · THE KEYS THAT CROSS INTO THE BROWSER ARE NEUTRAL, AND NONE OF THEM IS A COLUMN NAME. This is the half
   * ruling 453's scan of RENDERED TEXT cannot see: a `name` is not copy, and it ships in the chunk and in the POST. */
  {
    const keys = view0.limits.map((l: Any) => l.key);
    ok("2.537 · D19 · every key the form posts is neutral, is not the column's own name, and the fourteen are distinct",
      keys.length === LIMITS.length && new Set(keys).size === LIMITS.length
        && keys.every((k: string) => !NEUTRAL.test(k)) && keys.every((k: string, i: number) => k !== LIMITS[i])
        && keys.every((k: string) => /^[a-z][a-z0-9-]*$/.test(k)),
      j(keys));
    /* ⚠️ MEASURED, NOT GUESSED: THREE, not four. The two `gCounterPerPlayer*` identifiers do NOT match the
       lexicon — `\bcounter\b` needs a word boundary after the stem and "gCounterPerPlayerPerDay" has a capital P
       there — so what the keys stand in for is the three `StaffChosen` columns. Their LABELS are a separate matter
       and are overridden by `CONSOLE_LIMIT_LABEL` (1.364). The floor is what this run printed. */
    ok("2.537 · D19 · CONTROL · the column names the keys stand in for DO carry a word, so the substitution is doing work",
      LIMITS.filter((f) => NEUTRAL.test(f)).length >= 3, j(LIMITS.filter((f) => NEUTRAL.test(f))));
    ok("2.537 · D19 · every hint and every saved value the form paints is neutral too — the half a label-only scan misses",
      view0.limits.every((l: Any) => !NEUTRAL.test(String(l.hint ?? "")) && !NEUTRAL.test(l.value) && !NEUTRAL.test(l.input) && !NEUTRAL.test(l.section)),
      j(view0.limits.filter((l: Any) => NEUTRAL.test(String(l.hint ?? ""))).map((l: Any) => l.hint)));
  }

  /* ⛔ RENDERED, NOT GREPPED — AND THAT IS THE WHOLE POINT OF THE NEUTRAL-KEY RULE.
   *
   * Everything above is about the view MODEL. A `name`, a `data-field` and a fragment anchor only exist in MARKUP,
   * and markup is what ships: the POST body carries the name, the client chunk carries it, and a screenshot carries
   * whatever is painted beside it. `DeskLimitFields` is a pure function of its rows for exactly this reason — it
   * takes no hook, so it renders outside the admin shell and outside a router, and this reads what it produced.
   * ⛔ WITH A PLANTED CONTROL: the same render with one key put back to a house word MUST fire the lexicon, or the
   * zero above is not a measurement. */
  {
    const { createElement: h }: Any = await import("react");
    const { renderToStaticMarkup }: Any = await import("react-dom/server");
    const { DeskLimitFields }: Any = await import("../../src/app/admin/desk/limits-form.tsx");
    await w.limits({ gCapOpenExposureTzs: null });
    const v = await GATEM.houseUsageForConsole(OFFICER, "/admin/desk", { houseBotId: null });
    const errKey = keyOf("gCapDailyStakeTzs");
    const html = renderToStaticMarkup(h(DeskLimitFields, {
      rows: v.limits, anchorId: "limits-first-unset", errors: { [errKey]: "At least TZS 1,000." },
    }));
    const names = [...html.matchAll(/name="([^"]*)"/g)].map((m: Any) => m[1]);
    const fields = [...html.matchAll(/data-field="([^"]*)"/g)].map((m: Any) => m[1]);
    ok("2.537 · RENDERED · D19 · every field's `name` and `data-field` is the server's neutral key, one per limit, and not one house word reaches the markup",
      names.length === LIMITS.length && j(names) === j(v.limits.map((l: Any) => l.key)) && j(fields) === j(names)
        && !NEUTRAL.test(html),
      j({ names, hit: NEUTRAL.exec(html)?.[0] ?? null }));
    ok("2.537 · RENDERED · CONTROL · the same render with ONE key put back to a house word DOES fire the lexicon — so the clean markup above is a measurement",
      NEUTRAL.test(renderToStaticMarkup(h(DeskLimitFields, {
        rows: v.limits.map((l: Any, i: number) => (i === 0 ? { ...l, key: "house-bots-daily" } : l)),
        anchorId: "limits-first-unset", errors: {},
      }))), "");
    const at = html.indexOf('id="limits-first-unset"');
    const anchored = at < 0 ? null : (/data-field="([^"]*)"/.exec(html.slice(at))?.[1] ?? null);
    ok("2.537 · RENDERED · the strip's fragment lands on the FIRST unset required limit, exactly once — the field the sentence promises the officer will find",
      (html.match(/id="limits-first-unset"/g) ?? []).length === 1 && anchored === keyOf("gCapOpenExposureTzs"),
      j({ anchored, want: keyOf("gCapOpenExposureTzs") }));
    ok("2.537 · RENDERED · 412 · the refusal is painted under ITS OWN field, money fields carry the kit's TZS prefix, the percent field its suffix, and every box is on the 44px rung",
      html.includes("At least TZS 1,000.") && (html.match(/>TZS</g) ?? []).length >= 5 && html.includes(">%<")
        && (html.match(/h-\[var\(--h-input\)\]/g) ?? []).length === LIMITS.length,
      j({ tzs: (html.match(/>TZS</g) ?? []).length, pct: html.includes(">%<") }));
    ok("2.537 · RENDERED · 364 · an unset REQUIRED limit paints the caption naming what it costs, and a set one paints its saved value in the money face",
      html.includes("Not set — the master switch cannot be turned on.")
        && /<span class="amount tabular-nums">TZS /.test(html),
      "");
    /* ⛔ 432(n) · RENDERED, BOTH WAYS. The page's card is headed with a section's own name, and the form's first
     * group printed it again 34px below — read off the first render at 1280 AND 360. The suppression is measured
     * on the MARKUP and in both directions: the heading is gone exactly when the card carries it, and present when
     * it does not, so a suppression that swallowed every heading would be just as red. */
    {
      const first = (v.limits[0].section as string);
      const withTitle = renderToStaticMarkup(h(DeskLimitFields, { rows: v.limits, anchorId: "x", errors: {}, omitSection: first }));
      const headings = (t: string) => [...t.matchAll(/<p class="text-body-sm font-semibold text-text">([^<]*)<\/p>/g)].map((m: Any) => m[1]);
      ok("2.537 · RENDERED · 432(n) · the group whose name the card already carries loses its heading, and every other group keeps one",
        headings(html).includes(first) && !headings(withTitle).includes(first)
          && headings(withTitle).length === headings(html).length - 1 && headings(withTitle).length >= 2,
        j({ withoutOmit: headings(html), withOmit: headings(withTitle) }));
    }
    /* ⛔ 432(n) AGAIN, AND THE SECOND HALF IS WHAT MAKES IT A GUARD. Read off `form-dirty-360.png`: an unset cap
     * painted the placeholder "Not set" INSIDE the box and the caption "Not set — the master switch cannot be
     * turned on." 30px below it — one fact twice in one field, on the tab whose whole job is to say which limits
     * are missing. The placeholder is suppressed exactly when the row is already saying it, and KEPT on a row that
     * is optional and SET, which is the one state where it says something new: an officer who has just emptied a
     * saved box. A suppression that swallowed every placeholder would be as wrong as none at all, so the count is
     * derived from the rows in both directions. */
    {
      const placeholders = (html.match(/placeholder="Not set"/g) ?? []).length;
      const optionalSet = v.limits.filter((l: Any) => l.optional && !l.unset).length;
      const optionalUnset = v.limits.filter((l: Any) => l.optional && l.unset).length;
      const unsetKeys = v.limits.filter((l: Any) => l.unset).map((l: Any) => l.key);
      /* The field's own markup slice, so "no placeholder HERE" is not satisfied by the whole document. */
      const sliceOf = (key: string) => {
        const a = html.indexOf(`data-field="${key}"`);
        const b = html.indexOf("data-field=", a + 1);
        return a < 0 ? "" : html.slice(a, b < 0 ? html.length : b);
      };
      ok("2.537 · RENDERED · 432(n) · an UNSET limit says \"Not set\" ONCE — the caption keeps it, the box's placeholder gives it up",
        optionalUnset >= 1 && optionalSet >= 1 && placeholders === optionalSet
          && unsetKeys.every((k: string) => !sliceOf(k).includes('placeholder="Not set"'))
          && unsetKeys.every((k: string) => /Not set —/.test(sliceOf(k))),
        j({ placeholders, optionalSet, optionalUnset, unsetKeys }));
      ok("2.537 · RENDERED · CONTROL · …and a row that is optional and SET still carries the placeholder, so the suppression is keyed on the STATE and not on the field",
        v.limits.filter((l: Any) => l.optional && !l.unset)
          .every((l: Any) => sliceOf(l.key).includes('placeholder="Not set"')), "");
    }
    await w.limits({ gCapDailyLossTzs: 100_000, gCapStaffChosenDailyTzs: 100_000 });
  }

  /* ⛔ THE TWO OVERRIDE POPULATIONS ARE DERIVED, IN BOTH DIRECTIONS (the shape ruling 539 forced on the labels).
   * A hand-typed list of overrides stops covering the day a shared sentence is reworded, which is exactly how three
   * limit labels came to be painted live on this tab. So: every hint the shared table carries that names the
   * feature — or that carries a `{placeholder}` this surface has no figures to fill — must be replaced, and every
   * hint this console replaces must really have been one of those. */
  {
    const hintNeeds = LIMITS.filter((f) => {
      const h = R.FIELD_META[f].hint;
      return typeof h === "string" && (NEUTRAL.test(h) || h.includes("{"));
    });
    const hintOverridden = LIMITS.filter((f, i) => (view0.limits[i].hint ?? null) !== (R.FIELD_META[f].hint ?? null));
    ok("2.537 · 453 · every shared HINT that names the feature or carries a placeholder is replaced, and every replacement really did replace one — the population is derived, never typed",
      hintNeeds.length >= 6 && j(hintNeeds) === j(hintOverridden)
        && hintOverridden.every((f) => {
          const h = view0.limits[LIMITS.indexOf(f)].hint as string;
          return typeof h === "string" && !NEUTRAL.test(h) && !h.includes("{");
        }),
      j({ needs: hintNeeds, overridden: hintOverridden, missing: hintNeeds.filter((f) => !hintOverridden.includes(f)), spurious: hintOverridden.filter((f) => !hintNeeds.includes(f)) }));

    /* ⛔ 432(n) · THE UNSET CONSEQUENCE HAS EXACTLY ONE HOME, AND A HINT IS NOT IT. Read off
     * `limits-unset-exempt-unsetfield-1280.png`: four hints had carried their shared table's "Not set = …" clause
     * across the neutral rewrite, so the panel said the consequence TWICE when the field was unset (364's amber
     * caption, then the same sentence again in the grey hint 40px below it) and — worse — printed
     * "Not set — targeted and manual stakes cannot be placed" under a field whose own value read 200. A hint is
     * true in EVERY state; a consequence of being unset is true in one, and `unsetCaptionFor` owns it.
     * ⛔ THE POPULATION IS EVERY HINT THE PANEL RENDERS, derived from the rows, not the four that were wrong. */
    {
      const hints = view0.limits.map((l: Any) => l.hint).filter((h: Any) => typeof h === "string") as string[];
      const captions = LIMITS.map((f) => GATEM.unsetCaptionFor(f, false));
      ok("2.537 · 432(n) · not one hint this panel renders says \"Not set\" — the unset consequence has ONE home, and a hint is true in every state",
        hints.length >= 8 && hints.every((h) => !/Not set/i.test(h)), j(hints.filter((h) => /Not set/i.test(h))));
      ok("2.537 · 432(n) · CONTROL · the ONE home really does say it — every caption `unsetCaptionFor` produces opens with \"Not set\", so the absence above is a measurement and not an empty population",
        captions.length === LIMITS.length && captions.every((c: string) => c.startsWith("Not set —"))
          && new Set(captions).size >= 2, j([...new Set(captions)]));
    }

    /* The refusal side, measured the same way: which LIMITS-scope REFUSE rules carry a word in their shared copy. */
    const limitRules = (R.CROSS_FIELD_RULES as ReadonlyArray<Any>)
      .filter((r) => (r.scopes as readonly string[]).includes("LIMITS") && r.kind === "REFUSE");
    const needsCopy = limitRules.filter((r) => NEUTRAL.test(String(r.messages[0]))).map((r) => r.id as string);
    ok("2.537 · 453 · CONTROL · exactly three of the limits scope's refusal sentences name the feature, and they are the three the console substitutes for — a fourth would be reported here",
      limitRules.length >= 5 && j(needsCopy.slice().sort()) === j(["L-CPP-LE-DAY", "N1-c", "X-CLEAR-ON"].sort()),
      j({ rules: limitRules.map((r) => r.id), needsCopy }));

    /* And the third of those three, painted — the two others are exercised above. */
    const v = await versionNow();
    const n1c = await save(OFFICER, postAt(v, {
      [keyOf("gCapDailyStakeTzs")]: "150000",
      [keyOf("gCapStaffChosenDailyTzs")]: "200000",
    }));
    ok("2.537 · 453 · the third feature-naming refusal is painted in the console's own words too, on its own neutral key",
      n1c.ok === false && n1c.field === keyOf("gCapStaffChosenDailyTzs")
        && !NEUTRAL.test(n1c.error) && NEUTRAL.test(R.ruleCopy("N1-c", 0)) && n1c.error !== R.ruleCopy("N1-c", 0)
        && (await versionNow()) === v,
      j({ painted: n1c.error, shared: R.ruleCopy("N1-c", 0) }));
  }

  /* ⛔ THE ROUND TRIP AN OFFICER ACTUALLY MAKES: an unset REQUIRED limit is set, and the strip's count, the rail's
   * badge and the anchor all move with it — from the ONE read, on the next render. */
  {
    await w.limits({ gCapOpenExposureTzs: null });
    const before = await GATEM.houseUsageForConsole(OFFICER, "/admin/desk", { houseBotId: null });
    const anchored = before.limits.find((l: Any) => l.firstUnset) ?? null;
    const fixed = await save(OFFICER, {
      baseVersion: before.limitsVersion,
      values: { ...Object.fromEntries(before.limits.map((l: Any) => [l.key, l.input])), [keyOf("gCapOpenExposureTzs")]: "400000" },
    });
    const after = await GATEM.houseUsageForConsole(OFFICER, "/admin/desk", { houseBotId: null });
    ok("2.537 · setting the FIRST unset required limit clears it everywhere at once: the count, the badge's number, the anchor and the usage bar",
      anchored !== null && anchored.key === keyOf("gCapOpenExposureTzs")
        && fixed.ok === true && after.unsetRequired === before.unsetRequired - 1
        && after.limits.every((l: Any) => l.firstUnset === false)
        && after.limits[LIMITS.indexOf("gCapOpenExposureTzs")].unset === false,
      j({ before: before.unsetRequired, after: after.unsetRequired, anchored: anchored && anchored.key }));
    await w.limits();
  }
}

/* ════════════════════════════════════════════════════════════════════════════════════════════════════════════════
 * §2c · `botRateUsage` — C7 STEP 4's ONE NEW SEAM MEMBER (C7-SPEC ruling 351), BEHAVIOURAL, ON BOTH STORES
 *
 * The detail page's "Limit usage" card carries TWO COUNT ROWS — bets this hour and bets today — and the roster's
 * "Last bet" column needs a last-placement instant (ruling 363, and 432(g), which deferred that column to the step
 * that brings this reader). Neither figure exists on any reader the console already has:
 *   · `botUsage` REQUIRES a `marketId` and must keep requiring it — a caller with no market reads `countOnMarket: 0`
 *     and `stakeOnMarket: 0`, which are the PER_MARKET and PER_MARKET_COUNT gate figures, so an optional market
 *     would turn a gate reader into one that waves a stake through;
 *   · `placedTimes(...).length` is an UNBOUNDED row read on a page render in both twins.
 * So one new member, one statement per call, the same rolling windows on the DATABASE clock — and the identity with
 * `botUsage` is asserted here, on both stores, because that is what makes "the same terms" a measurement.
 * ════════════════════════════════════════════════════════════════════════════════════════════════════════════════ */

section("§2c · botRateUsage — the market-free rate reader (ruling 351)");
try {
  await w.limits();
  await w.switchOn();
  const seam = w.dal.houseSeamStore;
  const rb = await w.bot();
  const other = await w.bot();
  const quiet = await w.bot();

  /** One OPENER stake on a fresh poll, returned as its position id. */
  const placeOne = async (b: Any): Promise<string> => {
    const market = await w.poll({ graceMin: 0 });
    const i = await w.intent(b, market.id, { kind: "OPENER", side: "YES", stakeTzs: 1_000 });
    const r = await w.place(b, i);
    if (!r.ok) throw new Error(`§2c fixture bet refused: ${JSON.stringify(r).slice(0, 200)}`);
    return r.data.positionId;
  };

  /* Three stakes for one account: one NOW, one two hours ago, one two days ago. So the hour window holds 1 and the
   * day window holds 2 — two DIFFERENT numbers, which is what stops a reader that returns the same count twice. */
  const pNow = await placeOne(rb);
  const pHour = await placeOne(rb);
  const pDay = await placeOne(rb);
  await w.backdate(pHour, 2 * 60 * 60 * 1_000);
  await w.backdate(pDay, 2 * 24 * 60 * 60 * 1_000);
  /* And one for a SECOND account, so the roster-wide call has more than one row to group. */
  await placeOne(other);
  /* `quiet` never places: a bot with no marked position must come back as NO ROW, so the console defaults it to
   * zero itself rather than reading a fabricated zero out of the store. */
  void quiet;

  const mine = await seam.botRateUsage({ houseBotId: rb.botId });
  /* ⛔ `lastPlacedAt` IS THE NEWEST, NOT THE OLDEST — asserted against the two backdated instants rather than
   * against a clock reading, so a reader returning `min("placedAt")` is red and a slow run is not. */
  const lastMs = mine[0] ? Date.parse(mine[0].lastPlacedAt ?? "") : NaN;
  ok("1.351 · one account's rate usage: the HOUR and DAY windows are counted separately, on the database clock, and the NEWEST placement comes back with them",
    mine.length === 1 && mine[0].houseBotId === rb.botId
      && mine[0].placedLastHour === 1 && mine[0].placedLastDay === 2
      && Number.isFinite(lastMs) && lastMs > Date.now() - 60 * 60 * 1_000,
    j({ row: mine[0], placed: [pNow, pHour, pDay].length }));

  /* ⛔ THE IDENTITY RULING 351 ASSERTS: "the same market-free terms `botUsage` computes". If the two ever disagree,
   * the console's count rows and the gate's own rate refusal are reading two different facts about one account. */
  const viaBotUsage = await seam.botUsage({ houseBotId: rb.botId, marketId: (await w.poll({ graceMin: 0 })).id });
  ok("1.351 · …and every one of those three terms EQUALS what `botUsage` computes for the same account — the same windows, read two ways",
    mine[0].placedLastHour === viaBotUsage.placedLastHour
      && mine[0].placedLastDay === viaBotUsage.placedLastDay
      && mine[0].lastPlacedAt === viaBotUsage.lastPlacedAt,
    j({ rate: mine[0], usage: viaBotUsage }));

  /* ⛔ ONE STATEMENT FOR THE WHOLE ROSTER, NEVER A PER-BOT LOOP (ruling 351). The spy counts CALLS, which is the
   * half a suite can see; the ONE-STATEMENT half is `test:dal-parity` 16.botRateUsage over the Prisma body. */
  const realRate = seam.botRateUsage;
  let calls = 0;
  let everyone: Any;
  try {
    seam.botRateUsage = async (...a: Any[]) => { calls++; return realRate.call(seam, ...a); };
    everyone = await seam.botRateUsage({ houseBotId: null });
  } finally { seam.botRateUsage = realRate; }
  const ids = everyone.map((r: Any) => r.houseBotId);
  ok("1.351 · a NULL account reads the whole roster in ONE call, ordered by account, with a row only for an account that has placed",
    calls === 1 && ids.includes(rb.botId) && ids.includes(other.botId) && !ids.includes(quiet.botId)
      && j(ids) === j([...ids].sort()),
    j({ calls, ids }));
  ok("1.351 · CONTROL · the spy really fires, so the ONE above is a measurement and not an uncalled counter",
    calls === 1 && everyone.length >= 2, j({ calls, rows: everyone.length }));

  /* ⛔ AND `botUsage`'s MARKET STAYS REQUIRED (ruling 351's own prohibition), asserted on the FUNCTION rather than
   * on the type, because a type alone disappears at runtime: called with no market it must NOT answer as though the
   * per-market gate figures were zero. */
  /* ⚠️ ON THE BOUND FUNCTION, NOT ITS ARITY. `Function.length` is 1 on the memory twin (`({…})`) and 2 on the
   * Prisma one (`({…}, tx)`), so an arity pin is a per-store number pretending to be a rule. What is the same on
   * both stores is that the body NAMES `marketId` and gives it no default — which is the thing 351 forbids. The
   * INTERFACE's own signature is pinned in `test:dal-parity` 16.botRateUsage. */
  ok("1.351 · `botUsage` still NAMES its market and gives it no default — this reader is why it did not have to become optional",
    /marketId/.test(String(seam.botUsage)) && !/marketId\s*=[^=]/.test(String(seam.botUsage)),
    String(seam.botUsage).slice(0, 80));
  await w.switchOff();
} catch (err) {
  ok("1.351 · the rate reader's fixture ran", false, String((err as Any)?.stack ?? err).replace(/\s+/g, " ").slice(0, 400));
}

/* ════════════════════════════════════════════════════════════════════════════════════════════════════════════════
 * §2d · THE WAY OUT OF A PAUSE, IN THE CONSOLE'S OWN WORDS (ruling 432(f), owed since step 1 and discharged here)
 *
 * Ruling 311 renders, under the status chip, `wayOutCopy(wayOutForCause(sortCauses(causes)[0]), label)` — the
 * sentence that tells an officer how to get an account running again. 432(f) measured ONE of those sentences
 * carrying a forbidden word (`HOLDER_WITHDREW`'s "liquidity stakes") and rendered the chip ALONE at step 1, owing
 * the neutral pass to the step that would paint the caption. This is that step, and the population is DERIVED:
 * every way-out whose shared copy carries a word must be overridden, and every override must replace one that does.
 * ⛔ A HAND READING IS WHAT PUT 432(f) ONE SHORT — it named the `liquidity` row and none of the six `bot` ones, the
 * same class 433(b) and replan 539 found twice over on `FIELD_META`. So the guard enumerates the table, not a
 * reviewer.
 * ════════════════════════════════════════════════════════════════════════════════════════════════════════════════ */

section("§2d · the way out of a pause, neutral (ruling 432(f))");
{
  const PR: Any = await import("../../src/lib/house-bot/pause-reasons.ts");
  /* The whole population: every `PAUSE_REASON_WAY_OUT` row, plus the two SHARED way-outs that belong to no single
   * code — `wayOutForCause` answers with them for CONSENT_VOID and for support's temporary password, so a guard
   * that walked the record alone would never scan either. */
  const CAUSES: Array<{ code: string; method?: string }> = [
    ...Object.keys(PR.PAUSE_REASON_WAY_OUT).map((code) => ({ code })),
    { code: "CONSENT_VOID" },
    { code: "PASSWORD_CHANGED", method: "OFFICER_TEMP" },
  ];
  const LABEL = "Account one";
  const shared = (c: Any) => PR.wayOutCopy(PR.wayOutForCause(c), LABEL) as string;
  const painted = (c: Any) => GATEM.consoleWayOutCopy(c, LABEL) as string;
  const carries = (s: string) => NEUTRAL.test(s) || (houseHits(s) ?? []).length > 0;

  const DIRTY = CAUSES.filter((c) => carries(shared(c)));
  const OVERRIDDEN = CAUSES.filter((c) => painted(c) !== shared(c));
  ok("1.311 · 432(f) · the population is not empty: the SHARED table really does carry a forbidden word in more than one row",
    DIRTY.length >= 7, j(DIRTY.map((c) => GATEM.consoleWayOutKey(c))));
  ok("1.311 · 432(f) · not one way-out sentence the console paints carries a house-vocabulary word, over the WHOLE table",
    CAUSES.every((c) => !carries(painted(c))), j(CAUSES.filter((c) => carries(painted(c))).map((c) => [GATEM.consoleWayOutKey(c), painted(c)])));
  ok("1.311 · 432(f) · CONTROL · the two sets are EQUAL — every dirty sentence is overridden, and no already-clean one is",
    j(DIRTY.map((c) => GATEM.consoleWayOutKey(c)).sort()) === j(OVERRIDDEN.map((c) => GATEM.consoleWayOutKey(c)).sort()),
    j({ dirty: DIRTY.map((c) => GATEM.consoleWayOutKey(c)), overridden: OVERRIDDEN.map((c) => GATEM.consoleWayOutKey(c)) }));
  /* ⛔ THE SHARED TABLE IS NOT REWRITTEN (432(b)'s own decision, applied to the same class): those sentences are the
   * engine's and the admin bell's internal vocabulary, which D19 exempts. The override lives in the console's one
   * copy home, and the shared row it replaces still says what it always said. */
  ok("1.311 · 432(f) · CONTROL · `pause-reasons.ts` is UNTOUCHED — the fix is an override in the console's copy home, not a rewrite of the engine's own words",
    DIRTY.every((c) => carries(shared(c))) && /liquidity/.test(shared({ code: "HOLDER_WITHDREW" })), "");
  /* ⛔ THE KEY IS NOT THE CAUSE CODE ALONE. Two causes answer with SHARED way-out objects, so keying on the code
   * would hand each of them the wrong override the day either stopped being neutral. */
  ok("1.311 · 432(f) · the override key separates the two SHARED way-outs from the codes that reach them",
    GATEM.consoleWayOutKey({ code: "CONSENT_VOID" }) === "CONSENT_VOID"
      && GATEM.consoleWayOutKey({ code: "PASSWORD_CHANGED", method: "OFFICER_TEMP" }) === "OFFICER_TEMP"
      && GATEM.consoleWayOutKey({ code: "PASSWORD_CHANGED" }) === "PASSWORD_CHANGED"
      && shared({ code: "PASSWORD_CHANGED", method: "OFFICER_TEMP" }) !== shared({ code: "PASSWORD_CHANGED" }), "");
  /* ⛔ AND `{label}` STILL RESOLVES: the one placeholder the shared table spends is filled by the same helper the
   * engine uses, so an overridden sentence cannot ship a raw brace onto the screen. */
  ok("1.311 · 432(f) · no painted sentence carries an unresolved placeholder, and the one row that HAS a placeholder still fills it",
    CAUSES.every((c) => !painted(c).includes("{label}"))
      && painted({ code: "RULES_OUTDATED" }).includes(LABEL), j(painted({ code: "RULES_OUTDATED" })));
}


/* ════════════════════════════════════════════════════════════════════════════════════════════════════════════════
 * §2e · THE ACCOUNT PAGE — `/admin/desk/[id]` (C7-SPEC rulings 358, 363, 366, 367, 368/459, 399, 311/413, 432(f),
 * 432(g); replan rulings 507's X6 and 508; C7 step 4)
 *
 * ⛔ THE THREE ANSWERS, AND WHY THEY ARE THE FIRST THING THIS SECTION MEASURES. Under ruling 259 a signed-in PLAYER
 * reaches this route, so an honest `notFound()` taken BEFORE the audience verdict is an ORACLE: every live record id
 * could be enumerated by status code, with no feature word in either body and therefore invisible to the probe's
 * needle test. The reader answers `null` for a refused viewer and `{ found: false }` for a missing record, and the
 * page turns the second into a 404 — so the difference exists for the ADMIN alone.
 * ════════════════════════════════════════════════════════════════════════════════════════════════════════════════ */

section("§2e · the account page (rulings 358, 363, 368, 399, 507, 508)");
try {
  const PRC: Any = await import("../../src/lib/house-bot/pause-reasons.ts");
  await w.limits();
  const acct = await w.bot({ caps: { capDailyLossTzs: 50_000, capOpenExposureTzs: 300_000, capDailyStakeTzs: 120_000, freqMaxPerHour: 30, freqMaxPerDay: 200, balanceFloorTzs: 1_000, capStaffChosenDailyTzs: 80_000 } });
  const playerId = await w.user({ role: "PLAYER" });

  /* ━━ 1.399 · A MISSING RECORD AND A REFUSED VIEWER ANSWER IDENTICALLY ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
  {
    const real = await GATEM.houseDetailForConsole(OFFICER, "/admin/desk", acct.botId);
    const invented = await GATEM.houseDetailForConsole(OFFICER, "/admin/desk", "hb_0123456789abcdef01234567");
    const playerReal = await GATEM.houseDetailForConsole(playerId, "/admin/desk", acct.botId);
    const playerInvented = await GATEM.houseDetailForConsole(playerId, "/admin/desk", "hb_0123456789abcdef01234567");
    ok("1.399 · for a viewer OUTSIDE the audience a real id and an invented one answer IDENTICALLY — the page is not an id oracle",
      playerReal === null && playerInvented === null && all(playerReal) === all(playerInvented),
      j({ real: playerReal, invented: playerInvented }));
    ok("1.399 · CONTROL · the ADMIN can tell them apart, which is what makes the two nulls above a measurement",
      real !== null && real.found === true && invented !== null && invented.found === false,
      j({ real: real && real.found, invented: invented && invented.found }));
    /* ⛔ AND A REFUSED VIEWER'S PAYLOAD CARRIES NOTHING AT ALL — no label, no id, no figure, no sentence. */
    ok("1.399 · a refused viewer's answer holds no label, no handle and no figure",
      !all(playerReal).includes(acct.botId) && all(playerReal) === "null", j(all(playerReal)));
  }

  /* ━━ 1.363 / 1.351 · THE FIVE MONEY ROWS AND THE TWO COUNT ROWS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   * ⛔ FIVE money rows in the seam's own order, TWO of them the SAME cap read two ways (366: the seam refuses a new
   * stake on PROJECTED loss and a stop fires only on SETTLED loss), and the exposure row scoped "open now" and NOT
   * "today" — its reader has no day filter, so a "today" heading over it would be a mislabelled amount. */
  {
    const v = await GATEM.houseDetailForConsole(OFFICER, "/admin/desk", acct.botId);
    const names = v.usage.map((r: Any) => r.name);
    const lossRows = v.usage.filter((r: Any) => r.name.startsWith(GATEM.consoleLimitLabel("capDailyLossTzs")));
    ok("1.363 · the card carries exactly FIVE money rows, in the seam's own order, and the loss cap is read TWICE against ONE limit",
      v.usage.length === 5 && lossRows.length === 2
        && lossRows[0].limitTzs === lossRows[1].limitTzs && lossRows[0].limitTzs === 50_000
        && lossRows[0].name !== lossRows[1].name, j(names));
    ok("1.363 · every money row's NAME is the field table's own label, never typed beside the field — so a cap renamed in `rules.ts` moves here",
      ["capDailyStakeTzs", "capDailyLossTzs", "capOpenExposureTzs", GATEM.ACCOUNT_TARGETED_DAILY_TZS_FIELD]
        .every((f: string) => names.some((n: string) => n.startsWith(GATEM.consoleLimitLabel(f)))),
      j({ names, labels: ["capDailyStakeTzs", "capOpenExposureTzs"].map((f) => GATEM.consoleLimitLabel(f)) }));
    /* ⭐ THE SCOPE WORD IS SPENT ONLY WHERE IT DISCRIMINATES, AND THAT WAS READ OFF A 360 TILE. Ruling 363 gives
       every row a scope and argues the point from ONE of them: `openExposure` has no day filter, so an exposure
       figure under a "today" heading is a mislabelled amount. Spent on a row whose cap already names its window it
       says the same fact twice in adjacent words — measured on the first render: "Daily stake cap (today)",
       "Bets per hour (this hour)", "Bets per day (today)". 432(n) refuses exactly that. So the word stays on the
       exposure row 363 argues from, and on the two rows that share ONE cap and are told apart by nothing else
       (366's projected and settled), and nowhere else. */
    ok("1.363 · the exposure row is scoped `open now`, the two loss rows are told apart by theirs, and no other row spends a scope word its own cap already carries",
      names.filter((n: string) => n.endsWith("(open now)")).length === 1
        && j(lossRows.map((r: Any) => r.name).sort()) === j([
          `${GATEM.consoleLimitLabel("capDailyLossTzs")} (projected)`,
          `${GATEM.consoleLimitLabel("capDailyLossTzs")} (settled)`,
        ].sort())
        && names.filter((n: string) => /\(/.test(n)).length === 3
        && !names.some((n: string) => /today|this hour/.test(n)),
      j(names));
    ok("1.363 · 432(n) · CONTROL · the two count rows spend NO scope at all — their caps are named `per hour` and `per day`, so a scope word would say it twice",
      v.counts.every((r: Any) => !/\(/.test(r.name))
        && v.counts.map((r: Any) => r.name).join("|") === `${GATEM.consoleLimitLabel("freqMaxPerHour")}|${GATEM.consoleLimitLabel("freqMaxPerDay")}`,
      j(v.counts.map((r: Any) => r.name)));
    /* ⛔ AND THE FIELD WHOSE IDENTIFIER CARRIES A NEEDLE IS SELECTED BY PROPERTY, NEVER TYPED (433(b)). */
    ok("1.363 · 433(b) · the targeted-and-manual cap is selected by PROPERTY and that selection is UNIQUE — typing its id would put the shared vocabulary's own word in a literal of the gate module",
      GATEM.ACCOUNT_TARGETED_DAILY_TZS_FIELD === "capStaffChosenDailyTzs"
        && (R.CAP_FIELDS as readonly string[]).filter((f) => R.isClearExempt(f) && R.FIELD_META[f].unit === "TZS").length === 1,
      j(GATEM.ACCOUNT_TARGETED_DAILY_TZS_FIELD));
    /* ⛔ THE TWO COUNT ROWS ARE 351's READER'S, in 361's grammar with the noun OUTSIDE the figure. */
    ok("1.363 · 351 · the two count rows are the hour and day windows, in the same grammar, with the noun outside the figure",
      v.counts.length === 2
        && v.counts.every((r: Any) => r.captionText.includes(" bets") || r.unsetCaption !== null)
        && v.counts[0].limitTzs === 30 && v.counts[1].limitTzs === 200,
      j(v.counts.map((r: Any) => r.captionText)));
    /* ⛔ 266 · NOT ONE FIGURE ON THIS PAGE IS A NET, A RESULT OR A BARE BALANCE. */
    ok("1.408 · 266 · no row of the account page carries a net, a result or a bare balance — money is usage against a configured limit and nothing else",
      !/\bnet\b|\breturned\b|\bprofit\b|\bfee withheld\b/i.test(all(v.usage) + all(v.counts)), j(names));
    STATES.push(["detail-active", v]);
  }

  /* ━━ 1.368 / 459 · THE BALANCE FLOOR IS A STATE, NEVER AN AMOUNT ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
  {
    const above = await GATEM.houseDetailForConsole(OFFICER, "/admin/desk", acct.botId);
    ok("1.368 · with the balance above the floor the page says so, names the FLOOR — a configured limit — and never the balance",
      typeof above.floorSentence === "string" && above.floorSentence.includes(formatTzs(1_000))
        && /above the floor/.test(above.floorSentence) && above.floorUnsetCaption === null,
      j(above.floorSentence));
    /* ⛔ THE HOLDER'S BALANCE IS 5,000,000 IN THIS FIXTURE AND IT APPEARS NOWHERE IN THE PAINTED MODEL. That figure
     * is a real person's money — the one number on these screens belonging to someone other than 50pick, and the
     * one most likely to sit in a screenshot (ruling 459, which withdrew 368's last exception). */
    ok("1.368 · 459 · the holder's own balance appears NOWHERE in the painted view model, in any form",
      !all(above).includes(formatTzs(5_000_000)) && !all(above).includes("5000000")
        && !/balance is [A-Z]|TZS 5,000,000/.test(all(above)), j(above.floorSentence));
    /* ⛔ AND THE OTHER SIDE OF THE FLOOR IS A DIFFERENT SENTENCE, so the case above measures a BRANCH. */
    await w.setCaps(acct.botId, { balanceFloorTzs: 9_000_000 });
    const below = await GATEM.houseDetailForConsole(OFFICER, "/admin/desk", acct.botId);
    ok("1.368 · CONTROL · with the balance BELOW the floor the sentence flips and says the account cannot place a bet",
      /below the floor/.test(below.floorSentence) && /cannot place a bet/.test(below.floorSentence)
        && below.floorSentence !== above.floorSentence, j(below.floorSentence));
    /* ⛔ AND AN UNSET FLOOR IS 364's THIRD CAPTION — the branch this page is the FIRST surface to reach, because
     * every row of the limits tab falls in one of the other two. */
    await w.setCaps(acct.botId, { balanceFloorTzs: null });
    const unset = await GATEM.houseDetailForConsole(OFFICER, "/admin/desk", acct.botId);
    ok("1.368 · 364 · an UNSET floor renders no sentence and no amount — it renders the unconditional-cap caption, which this page is the first surface to reach",
      unset.floorSentence === null && unset.floorUnsetCaption === GATEM.unsetCaptionFor("balanceFloorTzs", false)
        && /this account cannot place a bet/.test(unset.floorUnsetCaption), j(unset.floorUnsetCaption));
    await w.setCaps(acct.botId, { balanceFloorTzs: 1_000 });
    STATES.push(["detail-floor-below", below], ["detail-floor-unset", unset]);
  }

  /* ━━ 1.356 / 1.368 · EXACTLY ONE WALLET READ FOR A LIVE ACCOUNT, AND THE FAILED READ SAYS SO ━━━━━━━━━━━━━ */
  {
    const realWallet = w.db.wallet.findByUserId;
    let calls = 0;
    let v: Any;
    try {
      w.db.wallet.findByUserId = async (...a: Any[]) => { calls++; return realWallet.apply(w.db.wallet, a as Any); };
      v = await GATEM.houseDetailForConsole(OFFICER, "/admin/desk", acct.botId);
    } finally { w.db.wallet.findByUserId = realWallet; }
    ok("1.356 · the account page reads the holder's wallet EXACTLY ONCE, and that one read is what the floor STATE is built from",
      calls === 1 && typeof v.floorSentence === "string", j({ calls }));
    ok("1.356 · CONTROL · the spy really fires, so the ONE above is a measurement and not an uncalled counter",
      calls === 1 && w.db.wallet.findByUserId === realWallet, j({ calls }));
  }

  /* ━━ X6 (replan ruling 507) · A MISSING HOLDER WALLET IS A CONSOLE STATE, NOT ONLY AN ALERT ━━━━━━━━━━━━━━
   * A missing wallet blocks SETTLEMENT for every player on the markets this account holds open stakes in. The
   * register itself says a condition that stops other people's money must not live only in an alert: an alert is
   * read once and then it is gone, and this is a state an officer has to be able to come back to. */
  {
    const realWallet = w.db.wallet.findByUserId;
    let blocked: Any;
    try {
      w.db.wallet.findByUserId = async (userId: string) => (userId === acct.userId ? null : realWallet.call(w.db.wallet, userId));
      blocked = await GATEM.houseDetailForConsole(OFFICER, "/admin/desk", acct.botId);
    } finally { w.db.wallet.findByUserId = realWallet; }
    const normal = await GATEM.houseDetailForConsole(OFFICER, "/admin/desk", acct.botId);
    ok("1.507 · X6 · a MISSING holder wallet is painted as a STATE on the account's own page",
      blocked.settlementBlocked === true, j({ blocked: blocked.settlementBlocked }));
    ok("1.507 · X6 · CONTROL · with the wallet present the same state is FALSE, so the chip is a measurement and not a decoration",
      normal.settlementBlocked === false, j({ normal: normal.settlementBlocked }));
    /* ⛔ AND IT IS NOT A LIVE CAUSE. `WALLET_MISSING` is a PauseReason and not a `HolderCause`, so a causes test
     * would have COMPILED and been false for ever — which is the shape 541 calls a mutation aimed at nothing. */
    ok("1.507 · X6 · CONTROL · `WALLET_MISSING` is not a member of the live-cause list at all, which is why the state is read off the wallet row",
      !(PRC.HOLDER_CAUSES as readonly string[]).includes("WALLET_MISSING"), j([...PRC.HOLDER_CAUSES]));
    /* ⛔ AND THE FLOOR SENTENCE DOES NOT CLAIM THE BALANCE IS FINE WHEN NOBODY COULD READ IT (355). */
    ok("1.368 · 355 · with no wallet to read, the floor sentence says the check could not be made — never `above the floor`, and never an amount",
      /could not be checked/.test(blocked.floorSentence) && !/above the floor/.test(blocked.floorSentence), j(blocked.floorSentence));
    STATES.push(["detail-settlement-blocked", blocked]);
  }

  /* ━━ 508 · THE RULES AND TARGETS PANELS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
  {
    const v = await GATEM.houseDetailForConsole(OFFICER, "/admin/desk", acct.botId);
    ok("1.508 · the rules panel lists every saved cap plus the three scope facts, as VALUES, with the reason it cannot be edited beside it",
      Array.isArray(v.rules) && v.rules.length === (R.CAP_FIELDS as readonly string[]).length + 3
        && v.rules.some((r: Any) => r.name === GATEM.consoleLimitLabel("capDailyLossTzs") && r.value === formatTzs(50_000))
        && /not ready on this build yet/.test(v.rulesReason), j({ rows: v.rules && v.rules.length }));
    ok("1.508 · 453 · not one rule name, section or value the panel paints carries a house-vocabulary word",
      v.rules.flatMap((r: Any) => [r.name, r.section, r.value]).every((s: string) => !NEUTRAL.test(s)),
      j(v.rules.flatMap((r: Any) => [r.name, r.section, r.value]).filter((s: string) => NEUTRAL.test(s))));
    ok("1.508 · the targets panel reads this account's targets and counts the live ones — and an account with none is an EMPTY list, never a failed read",
      Array.isArray(v.targets) && v.targets.length === 0 && v.targetsActive === 0, j({ targets: v.targets, active: v.targetsActive }));
    /* ⛔ 432(f), THE TARGET-END HALF: the population is DERIVED, not typed. Three of `TARGET_END_CAPTION`'s eleven
     * rows carry a word the console may not paint, and a hand reading is what left 432(f) one short on the way-out
     * table. Both directions: every dirty caption is overridden, and no already-clean one is. */
    {
      const FC: Any = await import("../../src/lib/house-bot/feed-copy.ts");
      const CAUSES = Object.keys(FC.TARGET_END_CAPTION);
      const dirty = CAUSES.filter((c) => NEUTRAL.test(FC.TARGET_END_CAPTION[c]) || (houseHits(FC.TARGET_END_CAPTION[c]) ?? []).length > 0);
      const overridden = CAUSES.filter((c) => GATEM.consoleTargetEndCaption(c, "Account one") !== String(FC.TARGET_END_CAPTION[c]).replaceAll("{bot}", "Account one"));
      ok("1.508 · 432(f) · not one target-end caption the console paints carries a house-vocabulary word, over the WHOLE table",
        CAUSES.length >= 10 && CAUSES.every((c) => !NEUTRAL.test(GATEM.consoleTargetEndCaption(c, "Account one"))),
        j(CAUSES.filter((c) => NEUTRAL.test(GATEM.consoleTargetEndCaption(c, "Account one")))));
      ok("1.508 · 432(f) · CONTROL · the two sets are EQUAL — every dirty caption is overridden and no already-clean one is, and the shared table still says what it always said",
        dirty.length >= 3 && j(dirty.sort()) === j(overridden.sort()) && /Bot removed/.test(FC.TARGET_END_CAPTION.BOT_REMOVED),
        j({ dirty, overridden }));
      /* ⛔ AND NO PAINTED CAPTION CARRIES AN UNRESOLVED PLACEHOLDER: the shared table's one slot is built rather
       * than typed in the gate module, because as a literal it is a hit in the module 4.453 scans. */
      ok("1.508 · 432(f) · no painted target-end caption carries an unresolved placeholder",
        CAUSES.every((c) => !GATEM.consoleTargetEndCaption(c, "Account one").includes("{")), "");
    }
  }

  /* ━━ 432(g) · "LAST BET" ON BOTH SURFACES, FROM THE ONE READER ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
  {
    const never = await GATEM.houseDetailForConsole(OFFICER, "/admin/desk", acct.botId);
    ok("1.432g · an account that has never staked has NO last placement — the page paints an em dash, never a fabricated date",
      never.lastBet === null, j(never.lastBet));
    const market = await w.poll({ graceMin: 0 });
    const i = await w.intent(acct, market.id, { kind: "OPENER", side: "YES", stakeTzs: 1_000 });
    await w.switchOn();
    const placed = await w.place(acct, i);
    await w.switchOff();
    if (!placed.ok) throw new Error(`§2e fixture bet refused: ${j(placed)}`);
    const after = await GATEM.houseDetailForConsole(OFFICER, "/admin/desk", acct.botId);
    ok("1.432g · after one stake the page paints a RELATIVE phrase with the absolute EAT instant in its title — both built on the server",
      after.lastBet !== null && /just now|min ago|h ago|d ago/.test(after.lastBet.text)
        && /EAT$/.test(after.lastBet.title) && after.lastBet.title !== after.lastBet.text,
      j(after.lastBet));
    /* ⛔ THE ROSTER'S OWN COLUMN IS THE SAME FACT FROM THE SAME READER, which is what stops the two disagreeing. */
    const roster = await GATEM.houseRosterForConsole(OFFICER, "/admin/desk");
    const mine = roster.rows.find((r: Any) => r.id === acct.botId);
    ok("1.432g · the roster's `Last bet` cell is the SAME phrase as the account page's, from the same reader",
      mine != null && mine.lastBet !== null && mine.lastBet.text === after.lastBet.text
        && mine.lastBet.title === after.lastBet.title, j({ roster: mine && mine.lastBet, page: after.lastBet }));
    /* ⛔ AND EVERY ROSTER ROW NOW CARRIES ITS WAY OUT, because the page it opens exists (432(h)). */
    ok("1.432h · every roster row carries a way-out href to its own account page, now that that page exists",
      roster.rows.length >= 1 && roster.rows.every((r: Any) => r.href === CR.consoleBotHref(r.id)),
      j(roster.rows.map((r: Any) => r.href).slice(0, 3)));
    /* ⛔ THE RELATIVE PHRASE NEVER RUNS BACKWARDS: a container clock behind the database reads a just-placed stake
     * as future, and "in 3 minutes" on a stake already placed is worse than no phrase at all. */
    ok("1.432g · CONTROL · a FUTURE instant reads `just now`, never `in N minutes` — a clock behind the database must not make the phrase run backwards",
      GATEM.relativeEat(new Date(Date.now() + 120_000).toISOString(), Date.now())?.text === "just now"
        && GATEM.relativeEat(new Date(Date.now() - 7_200_000).toISOString(), Date.now())?.text === "2 h ago"
        && GATEM.relativeEat(null, Date.now()) === null,
      j(GATEM.relativeEat(new Date(Date.now() + 120_000).toISOString(), Date.now())));
  }

  /* ━━ 1.358 · A REMOVED ACCOUNT IS READ-ONLY, AND ITS READ SET IS NAMED ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
  {
    const dead = await w.bot();
    await w.dal.houseBotStore.setStatus(dead.botId, { from: ["ACTIVE"], to: "REMOVED", pauseReason: null, pausedFromStatus: null, removal: { byId: OFFICER, reason: "fixture", cause: "MANUAL" } });
    const spy = { wallet: 0, day: 0, exposure: 0, rate: 0, targets: 0, staff: 0 };
    const real = {
      wallet: w.db.wallet.findByUserId,
      day: w.dal.houseBookStore.dayRows,
      exposure: w.dal.houseBookStore.openExposure,
      rate: w.dal.houseSeamStore.botRateUsage,
      targets: w.dal.targetStore.listForBot,
      staff: w.dal.houseBotIntentStore.staffChosenPlacedToday,
    };
    let v: Any;
    try {
      w.db.wallet.findByUserId = async (...a: Any[]) => { spy.wallet++; return real.wallet.apply(w.db.wallet, a as Any); };
      w.dal.houseBookStore.dayRows = async (...a: Any[]) => { spy.day++; return real.day.apply(w.dal.houseBookStore, a as Any); };
      w.dal.houseBookStore.openExposure = async (...a: Any[]) => { spy.exposure++; return real.exposure.apply(w.dal.houseBookStore, a as Any); };
      w.dal.houseSeamStore.botRateUsage = async (...a: Any[]) => { spy.rate++; return real.rate.apply(w.dal.houseSeamStore, a as Any); };
      w.dal.targetStore.listForBot = async (...a: Any[]) => { spy.targets++; return real.targets.apply(w.dal.targetStore, a as Any); };
      w.dal.houseBotIntentStore.staffChosenPlacedToday = async (...a: Any[]) => { spy.staff++; return real.staff.apply(w.dal.houseBotIntentStore, a as Any); };
      v = await GATEM.houseDetailForConsole(OFFICER, "/admin/desk", dead.botId);
    } finally {
      w.db.wallet.findByUserId = real.wallet;
      w.dal.houseBookStore.dayRows = real.day;
      w.dal.houseBookStore.openExposure = real.exposure;
      w.dal.houseSeamStore.botRateUsage = real.rate;
      w.dal.targetStore.listForBot = real.targets;
      w.dal.houseBotIntentStore.staffChosenPlacedToday = real.staff;
    }
    ok("1.358 · a REMOVED account renders — `get(id)` reads it, and `listNonRemoved` would have made this page 404 on a row that exists",
      v !== null && v.found === true && v.removed === true && v.statusWord === SD.HOUSE_BOT_STATUS_DISPLAY.REMOVED.word
        && v.statusChip === SD.HOUSE_BOT_STATUS_DISPLAY.REMOVED.chip, j({ removed: v.removed, word: v.statusWord }));
    ok("1.358 · its read set is the row, its final state and its SAVED RULES — ZERO wallet, day-book, exposure, rate, target and targeted-and-manual reads",
      spy.wallet === 0 && spy.day === 0 && spy.exposure === 0 && spy.rate === 0 && spy.targets === 0 && spy.staff === 0
        && Array.isArray(v.rules) && v.rules.length > 0, j(spy));
    ok("1.358 · CONTROL · every one of those six spies FIRES on a LIVE account in the same run, so the six zeros above are a measurement",
      await (async () => {
        const live = { wallet: 0, day: 0, exposure: 0, rate: 0, targets: 0, staff: 0 };
        try {
          w.db.wallet.findByUserId = async (...a: Any[]) => { live.wallet++; return real.wallet.apply(w.db.wallet, a as Any); };
          w.dal.houseBookStore.dayRows = async (...a: Any[]) => { live.day++; return real.day.apply(w.dal.houseBookStore, a as Any); };
          w.dal.houseBookStore.openExposure = async (...a: Any[]) => { live.exposure++; return real.exposure.apply(w.dal.houseBookStore, a as Any); };
          w.dal.houseSeamStore.botRateUsage = async (...a: Any[]) => { live.rate++; return real.rate.apply(w.dal.houseSeamStore, a as Any); };
          w.dal.targetStore.listForBot = async (...a: Any[]) => { live.targets++; return real.targets.apply(w.dal.targetStore, a as Any); };
          w.dal.houseBotIntentStore.staffChosenPlacedToday = async (...a: Any[]) => { live.staff++; return real.staff.apply(w.dal.houseBotIntentStore, a as Any); };
          await GATEM.houseDetailForConsole(OFFICER, "/admin/desk", acct.botId);
        } finally {
          w.db.wallet.findByUserId = real.wallet;
          w.dal.houseBookStore.dayRows = real.day;
          w.dal.houseBookStore.openExposure = real.exposure;
          w.dal.houseSeamStore.botRateUsage = real.rate;
          w.dal.targetStore.listForBot = real.targets;
          w.dal.houseBotIntentStore.staffChosenPlacedToday = real.staff;
        }
        return Object.values(live).every((n) => n >= 1);
      })(), "");
    ok("1.358 · it carries a terminal sentence and NO control: no usage, no counts, no last placement, no targets",
      typeof v.removedNote === "string" && /Removed on /.test(v.removedNote)
        && v.usage === null && v.counts === null && v.lastBet === null && v.targets === null
        && v.wayOut === null && v.floorSentence === null, j({ note: v.removedNote, usage: v.usage, targets: v.targets }));
    /* ⛔ AND IT IS STILL ABSENT FROM THE ROSTER (its doors are the history row and a typed id, 358). */
    const roster2 = await GATEM.houseRosterForConsole(OFFICER, "/admin/desk");
    ok("1.358 · CONTROL · the same account is ABSENT from the roster, so the page really is its only door",
      !roster2.rows.some((r: Any) => r.id === dead.botId), j(roster2.rows.map((r: Any) => r.id).slice(0, 5)));
    STATES.push(["detail-removed", v]);
  }
} catch (err) {
  ok("1.358 · the account page's fixture ran", false, String((err as Any)?.stack ?? err).replace(/\s+/g, " ").slice(0, 400));
}

  /* ━━ 1.435 · A REMOVED ACCOUNT RENDERS NO RAIL AND NO OVERVIEW CARD (ruling 435(a)) ━━━━━━━━━━━━━━━━━━━━━━━━
   * Read off `acct-removed-360.png` and `acct-removed-1280.png`: under the terminal Callout the overview painted
   * `AdminLoadError` — "Couldn't load limit usage · A data read failed — this may not be empty" — an EMPTY
   * "Balance floor" card and a "Last bet —" card. Nothing had failed. Ruling 358 names wallet, cap, rate and
   * target reads as the ones a removed account does NOT take, and 355 reserves the kit's failure treatment for a
   * read that DID fail; this is 421's distinction one route over, got wrong in the same direction.
   * ⛔ AND THE SECOND READING IS THE ONE THAT SETTLED THE SHAPE: guarding the three cards left a rail whose
   * Overview tab rendered 600px of NOTHING and whose Targets tab would have painted the same failure treatment one
   * click away — ruling 312's dead control, which on this route is a property of the RECORD and not only of the
   * build. So the rail is not rendered at all, and the one thing a removed account still holds is shown directly.
   * ⛔ THE GUARD IS INSIDE EACH PANEL, NEVER A SECOND TERM IN THE TAB TEST (433(e)): a second term makes a panel
   * read as "above the rail", which is the strongest possible answer and a PASS that proves nothing. */
  {
    const detail = decomment(read(DETAIL_PAGE));
    const guards = (detail.match(/\{!view\.removed && \(/g) ?? []).length;
    ok("1.435 · 358 · every card of the account page is guarded by `removed` — the rail, the usage card, the floor sentence, the last placement and both other panels",
      /* ⚠️ THE SOURCE IS DECOMMENTED, so a pin may not reach for a comment as its landmark — measured on the
         first run of this very assertion, which looked for the `312` note above the rail and found nothing. */
      guards === 6 && /\{!view\.removed && \(\s*<Tabs/.test(detail)
        && /\{view\.removed && \(\s*<AdminCard title="Saved rules">/.test(detail),
      j({ guards }));
    /* ⛔ AND THE TAB TESTS ARE STILL PURE, which is what keeps `test:tab-anchors` and the served probe able to read
     * this page's panels at all. */
    ok("1.435 · 433(e) · every tab test is the tab and NOTHING else, so no panel reads as `above the rail`",
      (detail.match(/\{tab === "[a-z]+" && \(<>/g) ?? []).length === CR.CONSOLE_DETAIL_TABS.length
        && !/tab === "[a-z]+" && [a-z]/.test(detail),
      j((detail.match(/\{tab === "[a-z]+" && \(<>/g) ?? [])));
    /* ⛔ AND THE RAW FILE — COMMENTS AND ALL — YIELDS EXACTLY THE CLOSED LIST, which is the OTHER half of 433(e)
     * and the half this page broke on the day it was written: the served probe discovers a page tab with
     * `/tab === "([a-z-]+)"/g` over `readFileSync`, so a COMMENT quoting the idiom invents a key no panel answers
     * and the probe then requests a page that does not exist. Measured here: the first draft of this file spelled
     * the opener inside a comment and invented a tab. */
    const detailRawTabs = [...new Set([...read(DETAIL_PAGE).matchAll(/tab === "([a-z-]+)"/g)].map((m) => m[1]))];
    ok("1.435 · 433(e) · the RAW account page yields exactly the closed tab list — no comment invents a key no panel answers",
      j(detailRawTabs) === j([...CR.CONSOLE_DETAIL_TABS]), j(detailRawTabs));
    /* ⛔ AND THE PAGE NEVER PAINTS THE KIT'S FAILURE TREATMENT FOR A REMOVED ACCOUNT: every `AdminLoadError` on it
     * sits inside a `!view.removed` guard or behind a `=== null` test that a removed account cannot reach. */
    ok("1.435 · 355 · the account page carries no `AdminLoadError` a REMOVED account can reach — a read that was never taken has not failed",
      (detail.match(/<AdminLoadError/g) ?? []).length === 4
        && detail.indexOf('{view.removed && (') < detail.indexOf('{tab === "overview"'),
      j({ loadErrors: (detail.match(/<AdminLoadError/g) ?? []).length }));
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
   * ⛔ RULING 474's TWO EXEMPTIONS, WRITTEN DOWN — an exemption nobody wrote down is a guard whose population is a
   * lie. `bot.label` and `control.switchedReason` are DATA an operator typed, not this console's copy, and 453 may
   * not silently rewrite them. They are therefore removed from the scan BY NAME, from the one list the reader also
   * publishes (`OPERATOR_DATA_EXEMPT`), and the control below plants a house word into each and requires that the
   * scan does NOT fire — and plants the same word into a NON-exempt field and requires that it DOES.
   */
  const operatorExempt = (s: string): string => s.replace(/ ·\u00a0reason: [\s\S]*$/, "");
  /**
   * Every COPY field of one painted view. ⛔ `label`, `handle` and `id` are a record's own VALUES, not copy — they
   * are nested inside a row and this sweep never reaches them.
   * ⛔ THE TOP LEVEL IS SWEPT, NOT TYPED. It was a hand-written list and it had already stopped covering:
   * `rosterFullPlain` — the sentence C7 step 3 paints at `page.tsx` when the limits panel is not linkable — was
   * added to the view model and never added here, so 453's strictest scan did not read it. Every string-valued
   * key of the shell is now in the population on the day it lands, hrefs and the day key included: 453 names
   * route metadata too, and a neutral value costs nothing to scan.
   */
  /* ⭐ 474's EXEMPTION IS BY KEY NAME, READ FROM THE NAMED LIST (C7 step 4). The account page paints the
     account's own LABEL at the TOP LEVEL — it is that page's heading — where the roster carried it nested inside a
     row and the sweep never reached it. Dropping it by NAME, from `OPERATOR_DATA_EXEMPT` itself, is the only form
     of this exemption that cannot drift from the ruling: a hand-typed key here would be a second home for a list
     ruling 474 already publishes, and the controls below plant a house word into an exempt key AND into a
     neighbouring one and require exactly one of them to fire. */
  const EXEMPT_KEYS = new Set((GATEM.OPERATOR_DATA_EXEMPT as ReadonlyArray<Any>).map((e: Any) => String(e.value)));
  const copyOf = (view: Any): string[] => [
    ...Object.entries(view)
      .filter(([k, v]) => typeof v === "string" && !EXEMPT_KEYS.has(k))
      .map(([, v]) => operatorExempt(v as string)),
    view.empty?.title, view.empty?.body,
    ...(view.tiles ?? []).flatMap((t: Any) => [t.label, t.value, t.delta]),
    ...(view.rows ?? []).flatMap((r: Any) => [r.statusWord, r.lossCell.text, r.exposureCell.text, r.betsCell.text, r.products,
      ...[r.lossCell, r.exposureCell, r.betsCell].flatMap((c: Any) => c.halves.flatMap((h: Any) => [h.word, h.suffix, c.edgeText]))]),
    /* ⭐ C7 step 3 · THE LIMITS PANEL'S OWN COPY. Its five usage names come from `FIELD_META`, four of whose labels
       and one of whose section names carry a word this section may not render (432(f), amended) — so the branch most
       likely to break 453 on this checkpoint is the one that would have been outside the scan. */
    ...(view.usage ?? []).flatMap((r: Any) => [r.name, r.captionText, r.unsetCaption, r.edgeText,
      ...r.halves.flatMap((h: Any) => [h.word, h.suffix])]),
    /* ⭐ replan ruling 537 · THE FORM'S OWN FOUR. `key` is the field's `name` and its `data-field`, `hint` is
       the sentence under it, `input` is what the box starts with and `unit` dresses it — every one of them
       reaches the DOM, and the KEY reaches the POST body as well, which is the half a scan of rendered TEXT
       cannot see. A row field added to the view model and not added here is outside 453's strictest scan. */
    ...(view.limits ?? []).flatMap((l: Any) => [l.section, l.name, l.value, l.caption, l.key, l.hint, l.input, l.unit]),
    view.chip?.word,
    /* ⭐ C7 step 4 · THE ACCOUNT PAGE'S OWN COPY. Its two count rows, its saved-rule list and its target rows are
       each built from a shared table whose words D19 exempts but ruling 453 does not — `FIELD_META`'s per-account
       labels and `TARGET_END_CAPTION` both carry the feature's own vocabulary — so these are the branches most
       likely to break 453 on this checkpoint, and a list that stopped at the surfaces step 3 had is the population
       trap 513 and 539 both are. */
    ...(view.counts ?? []).flatMap((r: Any) => [r.name, r.captionText, r.unsetCaption, r.edgeText,
      ...r.halves.flatMap((h: Any) => [h.word, h.suffix])]),
    ...(view.rules ?? []).flatMap((r: Any) => [r.section, r.name, r.value, r.caption]),
    ...(view.targets ?? []).flatMap((t: Any) => [t.statusWord, t.endCaption, t.when]),
  ].filter((s: unknown): s is string => typeof s === "string");

  const fresh = await GATEM.houseRosterForConsole(OFFICER, "/admin/desk");
  const scanned: Array<[string, string[]]> = [["fresh", copyOf(fresh)], ...STATES.map(([n, v]) => [n, copyOf(v)] as [string, string[]])];
  const hits = scanned.flatMap(([n, c]) => c.filter((s) => NEUTRAL.test(s)).map((s) => `${n}: ${s}`));
  const total = scanned.reduce((n, [, c]) => n + c.length, 0);
  /* ⛔ THE FLOOR IS OVER THE STATES AND THE STRINGS BOTH: a scan of one state, or of a view whose branches are all
   * null, is not a scan. Sixteen states were produced above; each carries at least a sentence and four tile labels. */
  ok("3.453 · not one painted string of ANY state carries a house-vocabulary word, or the words bot, house, liquidity or counter-stake",
    /* ⭐ THE FLOORS ROSE WITH C7 STEP 4's OWN STATES: 24/1528 at step 3, 32 states and 2,128 strings measured with
       the account page's five — active, both floor branches, settlement-blocked and removed — in the list. */
    scanned.length >= 32 && total >= 2_128 && hits.length === 0, j({ states: scanned.length, scanned: total, hits }));
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
      /* ⛔ THROUGH `operatorExempt`, because that is what the sweep itself does (474): the ON sentence carries an
         operator-typed tail, and comparing against the RAW value would make this control fail whenever the desk
         happens to be on — for a reason that has nothing to do with whether the sweep reached the key. */
      sweptKeys.length >= 5 && sweptKeys.every((k) => copyOf(full).includes(operatorExempt((full as Any)[k])))
        && copyOf(full).includes(full.limitsFirstUnsetHref) && copyOf(full).includes(full.dayKey),
      j({ sweptKeys, copied: copyOf(full).length }));
  }
  /* ⛔ 474's EXEMPTION, PROVEN IN BOTH DIRECTIONS. An exemption that has never been shown to let its own value
   * through, and to still catch everything else, is an exemption nobody can audit. */
  {
    const base = await GATEM.houseRosterForConsole(OFFICER, "/admin/desk");
    const withReason = { ...base, stateSentence: `On since 20:14:12 EAT ·\u00a0switched by ${OFFICER} ·\u00a0reason: bots on for the weekend` };
    const withCopy = { ...base, actionReason: "bots on for the weekend" };
    const exemptNames = (GATEM.OPERATOR_DATA_EXEMPT as ReadonlyArray<Any>).map((e: Any) => e.value);
    ok("3.453 · 474 · CONTROL · an operator's typed reason carrying a house word does NOT fire the lexicon — and the same words in the console's OWN copy DO",
      copyOf(withReason).filter((c: string) => NEUTRAL.test(c)).length === 0
        && copyOf(withCopy).filter((c: string) => NEUTRAL.test(c)).length === 1
        && j(exemptNames) === j(["label", "switchedReason"]),
      j({ exempted: copyOf(withReason).filter((c: string) => NEUTRAL.test(c)), copy: copyOf(withCopy).filter((c: string) => NEUTRAL.test(c)) }));
    /* ⛔ AND THE OTHER EXEMPTION IS A ROW'S `label`, which this sweep never reaches by construction — asserted, not
     * assumed, because "it is nested" is exactly the kind of claim that stops being true. */
    const labelled = { ...base, rows: [{ statusWord: "ACTIVE", label: "house bot", handle: "@x", products: "None",
      lossCell: { text: "", halves: [], edgeText: "" }, exposureCell: { text: "", halves: [], edgeText: "" }, betsCell: { text: "", halves: [], edgeText: "" } }] };
    const loud = { ...labelled, rows: [{ ...labelled.rows[0], label: "ok", statusWord: "house bot" }] };
    ok("3.453 · 474 · CONTROL · a row's operator-chosen `label` is outside the scan, while the same words in the row's own STATUS word are inside it",
      copyOf(labelled).filter((c: string) => NEUTRAL.test(c)).length === 0
        && copyOf(loud).filter((c: string) => NEUTRAL.test(c)).length === 1, "");
    /* ⭐ AND THE SAME EXEMPTION AT THE TOP LEVEL, WHICH IS WHERE THE ACCOUNT PAGE PAINTS IT (C7 step 4). The
       account's label is that page's HEADING, so it is a top-level string of the view model and the sweep reaches
       it — which is why the exemption has to be by KEY NAME and not by nesting. Both directions: the word in the
       exempt key does NOT fire, the same word in a neighbouring key of the same view DOES. */
    const detailShaped = { label: "house bot", handle: "Player #ABCDEF", rulesReason: "ok", wayOut: null };
    const detailLoud = { ...detailShaped, label: "ok", rulesReason: "house bot" };
    ok("3.453 · 474 · CONTROL · the account page's TOP-LEVEL `label` is exempt by NAME, while the same words one key away are not",
      copyOf(detailShaped).filter((c: string) => NEUTRAL.test(c)).length === 0
        && copyOf(detailLoud).filter((c: string) => NEUTRAL.test(c)).length === 1
        && EXEMPT_KEYS.has("label") && EXEMPT_KEYS.size === 2, j([...EXEMPT_KEYS]));
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
    /* ⭐ THE FLOOR ROSE WITH C7 STEP 4's OWN WALK: 297 at step 3, 597 measured with the account page and its
       loader inside the population. A floor only ever rises, and only to a count a run PRINTED. */
    allLits.length >= 597 && litHits.length === 0
      && sectionFiles.length >= 6 && [PAGE, LAYOUT, LOADING, LIVE, DETAIL_PAGE].every((f) => sectionFiles.includes(f))
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
  /* ⭐ SIX AT C7 STEP 4, NOT FIVE, AND THE SIXTH IS NAMED: "Last bet" needs a last-placement instant, and the
     only reader that has one is `botRateUsage` (ruling 351). It is ONE statement for the whole roster — never a
     per-account loop, and never `placedTimes(...).length`, which is unbounded in both twins.
     ⛔ AND THE PIN IS SCOPED TO THE DESK'S OWN SLICE. A module-wide count would have risen the moment the account
     page's reader was added below, which is a ratchet that teaches a reader to raise it instead of reading it. */
  const deskReaderSlice = gateCode.slice(gateCode.indexOf("async function readDeskCore"), gateCode.indexOf("export async function houseUsageForConsole"));
  ok("1.347 · 432(q) · the desk's read set is the four house reads plus EXACTLY ONE `loadParseContext()` and ONE rate read, all inside the one settled set",
    (deskReaderSlice.match(/loadParseContext\(\)/g) ?? []).length === 1
      && (deskReaderSlice.match(/houseSeamStore\.botRateUsage\(/g) ?? []).length === 1
      && (deskReaderSlice.match(/houseBotControlStore\.get\(\)/g) ?? []).length === 1
      && (deskReaderSlice.match(/houseBotStore\.listNonRemoved\(\)/g) ?? []).length === 1
      && (deskReaderSlice.match(/houseDayBooks\(/g) ?? []).length === 1
      && (deskReaderSlice.match(/houseBookStore\.openExposure\(/g) ?? []).length === 1
      && deskReaderSlice.length > 2_000, j({ slice: deskReaderSlice.length }));

  /* 1.340 / 1.305 / 1.349 · the page names NO read module and no struck reader. */
  const STRUCK = ["houseBotBook", "HouseBotBook", "netTzs", "feeWithheldTzs", "gStaffEdge", "boardDisclosure",
    "houseStaffScorecard", "entryRows", "stakeRows", "feeInputs", "ledgerRows", "positionsForUser", "txnPageForUser",
    "houseStakeByMarket", "derivedFeeShares", "placedTimes", "countLive"];
  const sectionCode = sectionFiles.map((f) => decomment(read(f))).join("\n");
  ok("1.305 / 1.349 · no file under the section names a struck reader, a result field or a fee derivation",
    STRUCK.every((n) => !sectionCode.includes(n)), STRUCK.filter((n) => sectionCode.includes(n)).join(","));
  /* ⛔ WIDENED FROM THE PAGE TO THE WHOLE SECTION (replan ruling 537). The section gained a `"use server"` action,
   * and an action is exactly the file a later step would reach for a store from — it is not a page, so a pin
   * written for `page.tsx` would never have looked at it. Every file under the section is held to the one door. */
  ok("1.340 · NO file under the section imports house data except from the gate module — no `house-bot/*`, no DAL, no book, no cap-precheck",
    /from "@\/lib\/server\/house-console-read"/.test(pageCode)
      && !/from "@\/lib\/server\/house-bot/.test(sectionCode) && !/house-bot-dal/.test(sectionCode)
      && !/house-bot\/book|cap-precheck/.test(sectionCode), "");
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
  /* ⛔ THE ACTION IS FORCED TO TYPE THE LITERAL, AND BY THE GATE PIN ITSELF (replan ruling 537). Case 0.260.1 in
   * `house-bot-reports-cases.mts` requires arg 1 of every `CONSOLE_GATES` door to be a STRING LITERAL equal to the
   * calling file's own console route — a door asked about a route read from a constant could not be measured at
   * all. `page.tsx` is on this list for exactly that reason and the save action is now on it for the same one.
   * ⛔ THE LIST IS PINNED AT ITS LENGTH BELOW, so it cannot be padded to quiet a new typer, and every member is
   * required to really contain the literal, so a stale entry cannot sit here earning nothing. */
  /* ⭐ THE ACCOUNT PAGE JOINS THE ALLOWANCE AT C7 STEP 4, AND IT IS NOT A WIDENING — IT IS ANOTHER RULING'S
     REQUIREMENT. Ruling 343 and case 0.260.1 insist that the route a gate call names is a STRING LITERAL equal to
     the calling file's own console route (or a prefix sharing its view domain), precisely so the gate pin can READ
     it; a template built from `CONSOLE_ROUTE` would be invisible to that pin, which is the hole 319 and 343 are
     two halves of. The same allowance already covers `page.tsx` and `actions.ts` for the same reason, and the
     CONTROL below requires every named file to really hold the literal, so the list cannot be padded. */
  const ALLOWED_ROUTE_FILES = new Set([ROUTES_MODULE, "src/lib/server/roles.ts", "src/components/admin/admin-nav-groups.ts", PAGE, ACTIONS, DETAIL_PAGE]);
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
  ok("1.319 · CONTROL · the allowance is exactly six files and every one of them really does hold the literal — a list that can be padded, or that carries a name earning nothing, is not a rule",
    ALLOWED_ROUTE_FILES.size === 6
      && [...ALLOWED_ROUTE_FILES].every((f) => decomment(read(f)).includes("/admin/desk")),
    j([...ALLOWED_ROUTE_FILES].filter((f) => !decomment(read(f)).includes("/admin/desk"))));
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
  /* ⭐ C7 STEP 4 BUILT THE ONE SURFACE `notFound()` IS RESERVED FOR (rulings 302, 399). Until this step the
     assertion was that the section called it NOWHERE; now it is that the section calls it EXACTLY ONCE, on the
     account page, and AFTER the audience verdict — which is 1.399's source half. The two readings are the same
     rule at two points in the tree, and the second is the stronger one. */
  {
    const detailRaw = existsSync(join(ROOT, DETAIL_PAGE)) ? decomment(read(DETAIL_PAGE)) : "";
    const others = sectionFiles.filter((f) => f !== DETAIL_PAGE && decomment(read(f)).includes("notFound"));
    ok("1.302 · 399 · `notFound()` is called in exactly ONE file of the section — the account page — and nowhere else",
      others.length === 0 && (detailRaw.match(/notFound\(\)/g) ?? []).length === 1,
      j({ others, calls: (detailRaw.match(/notFound\(\)/g) ?? []).length }));
    /* ⛔ AND THE VERDICT PRECEDES IT IN SOURCE ORDER (ruling 399's own Proof). Without this the honest 404 is an
       ORACLE: under ruling 259 a signed-in player reaches this route, so a record check that ran first would let
       them enumerate every live id by STATUS CODE — with no feature word in either body, and therefore invisible
       to the probe's needle test, which scans for words, labels and ids and not for a status pattern. */
    const gateAt = detailRaw.indexOf("houseDetailForConsole(session?.userId ?? null,");
    const refusedAt = detailRaw.indexOf("if (!answer) return null;");
    const notFoundAt = detailRaw.indexOf("notFound()");
    ok("1.399 · the audience verdict is AWAITED, and the refusal returned, BEFORE `notFound()` can be reached — so the 404 is not an id oracle",
      gateAt > 0 && refusedAt > gateAt && notFoundAt > refusedAt,
      j({ gateAt, refusedAt, notFoundAt }));
  }
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
  /* ⭐ EIGHT COLUMNS AT LAST (rulings 310, 432(g), 432(h)). Six shipped at step 1 because the other two were
   * tied to things that did not exist: the way-out link to `/admin/desk/[id]`, which would have answered the
   * app-root 404, and "Last bet" to a last-placement instant no reader had. C7 step 4 built the page and added
   * ruling 351's rate reader, so both arrive here — and the way-out column's header carries NO WORD, which is the
   * kit's own shape for a row-link column on `/admin/kyc` and `/admin/approvals`. */
  ok("1.310 / 1.373 · the roster's headers are the control facts, in order, with money second and third and the way out last",
    j(headers) === j(["Account", "Loss today (projected)", "Open exposure", "Status", "Bets today", "Last bet", "Products", ""]), j(headers));
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
  /* ⚠️ IT NOW COMPARES THEM. The label said "every money column's header is the label of the tile that measures the
   * same figure" while the predicate checked one literal and two `includes` — it never put the two sides together, so
   * renaming BOTH in step would have passed and renaming one would have passed too. The tile labels are read out of
   * the gate module; the basis parenthetical 373(b) requires is stripped before the comparison, not typed around. */
  {
    const tileLabels = [...gateCode.matchAll(/moneyTile\("([^"]+)"/g)].map((m) => m[1]);
    const moneyHeaders = [headers[1], headers[2]].map((h: string) => h.replace(/ \([^)]*\)$/, ""));
    ok("1.373 · 432(o) · every money column's header IS the label of the tile that measures the same figure — compared, not asserted twice",
      tileLabels.length >= 3 && moneyHeaders.every((h) => tileLabels.includes(h))
        && j(moneyHeaders) === j(["Loss today", "Open exposure"]),
      j({ tileLabels, moneyHeaders, headers }));
  }
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
  /* ⛔ EACH LINK SITE IS PINNED BY POSITION, AS AN EXACT ORDERED LIST — AN `OR` WIDENS (replan ruling 541(b)).
   * This read `every(m => /view\.limitsHref|view\.limitsFirstUnsetHref|unsetHref/.test(m[1]))`, which makes the three
   * hrefs INTERCHANGEABLE at every site: the declared mutation `306-anchor-href` swaps the strip's
   * `limitsFirstUnsetHref` for `limitsHref` — sending an officer to the tab to hunt for the field the sentence
   * promised — and this still passed, while the assertion the mutation NAMED reads only `console-routes.ts` and
   * never touches the page at all. The three sites are different answers to different questions and are held apart:
   * the bar's "Set it below →" takes the prop, the head's roster-full sentence takes the TAB, and the strip's
   * "Set N global limits first →" takes the FRAGMENT, because it names a field the reader must land on. */
  {
    const linkExprs = [...pageCode.matchAll(/<Link href=\{([^}]*)\}/g)].map((m) => m[1].trim());
    /* ⭐ A FOURTH SITE AT C7 STEP 4 — the roster row's way out, which is the ONLY link on this page whose href is
       a per-row value. It is pinned in position like the other three: an `OR` widens, and the four are different
       answers to different questions. */
    const WANT = ["unsetHref as Route", "view.limitsHref as Route", "view.limitsFirstUnsetHref as Route", "r.href as Route"];
    ok("1.306 · 432(i) · 541(b) · every `<Link href=` in the section is pinned BY POSITION — the bar's prop, then the head's tab href, then the strip's FRAGMENT href",
      j(linkExprs) === j(WANT), j({ found: linkExprs, want: WANT }));
    /* ⛔ AND THE FRAGMENT HREF IS SPENT TWICE, both times on the field the strip promises: once as the strip's own
     * link and once as the prop every unset usage bar links through. A count is what notices one of them being
     * swapped for the bare tab href even if a future site reorders the list above. */
    ok("1.306 · 541(b) · `view.limitsFirstUnsetHref` is spent exactly TWICE — the strip's link and the bars' prop — and `view.limitsHref` exactly once",
      (pageCode.match(/view\.limitsFirstUnsetHref/g) ?? []).length === 2
        && (pageCode.match(/view\.limitsHref/g) ?? []).length === 1
        && /unsetHref=\{view\.limitsFirstUnsetHref\}/.test(pageCode),
      j({ firstUnset: (pageCode.match(/view\.limitsFirstUnsetHref/g) ?? []).length, limits: (pageCode.match(/view\.limitsHref/g) ?? []).length }));
  }
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
    /* ⛔ THE POPULATION IS THE WHOLE SECTION, NOT THE PAGE (replan ruling 537). The limits list's money value moved
     * into `limits-form.tsx` when the panel gained its inputs, and a pin that had stayed on `page.tsx` would have
     * gone on passing while the one figure it was written for was painted somewhere it never looked — the
     * pinned-to-a-path class. The rule is unchanged; the population now follows the money. */
    const moneySites = [...sectionCode.matchAll(/"([^"]*\bamount\b[^"]*)"/g)].map((m) => m[1]);
    ok("1.401 · every money element under the section carries `amount` at its own call site, and none of them is on a tracked or micro rung",
      moneySites.length >= 3 && moneySites.every((c) => !/text-micro|text-caption|tracking-/.test(c)),
      j(moneySites));
    ok("1.401 · 409 · the limits form chooses its face from the ROW, so a count never lands in `.amount`",
      /row\.money \? "amount tabular-nums" : "font-mono tabular-nums"/.test(decomment(read(FORM))), "");
    ok("1.401 · CONTROL · the walked money sites are the ones the section really paints — the roster's figure, the bar caption's figures and the limits form's saved value",
      pageCode.includes('const figure = cell.money ? "amount tabular-nums"')
        && pageCode.includes('<span className="amount tabular-nums">{h.figure}</span>')
        && decomment(read(FORM)).includes('<span className={row.money ? "amount tabular-nums" : "font-mono tabular-nums"}>{row.value}</span>'),
      j(moneySites));
  }

  /* ⛔ 1.316 / 473 · THE PAGE'S ONE LIVE TRIGGER, IN THE STRIP, ON `LIVE_ROUND_MS`, ENABLED FROM REACT STATE. */
  {
    const liveFile = `${SECTION}/desk-live.tsx`;
    const liveCode = decomment(read(liveFile));
    const stripAt = pageCode.indexOf("<AdminCard padding=\"p-4\">");
    const pollerAt = pageCode.indexOf("<DeskLive live={view.live} />");
    const railAt = pageCode.indexOf("<Tabs");
    /* ⛔ AND NOTHING CONDITIONAL ON THE TAB MAY LIE BETWEEN THE STRIP AND THE POLLER (replan ruling 541(a)). The
       ordering terms alone survive `406-strip`, which wraps the poller in place: both indices shift together. What
       the defect actually does is put a `tab === ` between them, so that is what is refused. */
    ok("1.316 · exactly ONE `RefreshPoller` in the whole section, and it is mounted from the strip — ABOVE the rail, with no tab condition between them, so no tab switch remounts it",
      (sectionFiles.map((f) => decomment(read(f))).join("\n").match(/<RefreshPoller/g) ?? []).length === 1
        && (pageCode.match(/<DeskLive /g) ?? []).length === 1
        && stripAt > 0 && pollerAt > stripAt && railAt > pollerAt
        && !pageCode.slice(stripAt, pollerAt).includes("tab === "),
      j({ stripAt, pollerAt, railAt, between: pageCode.slice(stripAt, pollerAt).includes("tab === ") }));
    ok("1.316 · it polls on `LIVE_ROUND_MS` (20s, against ruling 353's 30s staleness threshold), never the component's 30s default",
      /intervalMs=\{LIVE_ROUND_MS\}/.test(liveCode) && liveCode.includes('from "@/lib/refresh-cadence"')
        && (await import("../../src/lib/refresh-cadence.ts") as Any).LIVE_ROUND_MS === 20_000, "");
    ok("1.316 · `enabled` is composed from REACT STATE and the server's own verdict — and no file under the section asks the DOM whether a dialog is open",
      /useState/.test(liveCode) && /enabled=\{deskPollerEnabled\(live, holds\)\}/.test(liveCode)
        && !/querySelector|\[role=.?dialog|getElementsBy/.test(sectionFiles.map((f) => decomment(read(f))).join("\n")), "");
    /* ⛔ 316's HOLD HAS NO DISPATCHER TODAY, AND THAT IS TIED TO THE POPULATION BEING EMPTY (432(h)'s idiom).
     * `DESK_HOLD_EVENT` and `DESK_RELEASE_EVENT` have a listener and no sender, so `holds` is permanently 0 and
     * `deskPollerEnabled(live, holds)` reduces to `live`. That is LEGITIMATE while the section renders no dialog —
     * and it is exactly the state in which nothing would notice step 4 adding one without raising the hold, which is
     * the defect 316 is written against: a 20-second `router.refresh()` under an open ceremony. So the two are tied
     * by EXISTENCE now, while the tie costs nothing.
     * ⭐ THE DIRTY-FORM HALF LANDED (replan ruling 537), so the tie gains its second antecedent. It read
     * `hasDialog === dispatchesHold` and was true of NEITHER; the limits form is a control an officer types into for
     * minutes at a time under a 20-second `router.refresh()`, which is the same defect as an open dialog and the
     * more likely one. The equality is kept — a hold raised by nothing would still be red — and the antecedent is
     * now "a dialog OR a typed form", so the day step 4 adds a dialog it is inside this assertion too. */
    const sectionAll = sectionFiles.map((f) => decomment(read(f))).join("\n");
    const hasDialog = /<Modal\b|<ConfirmDialog\b|role="dialog"|<Drawer\b/.test(sectionAll);
    const hasTypedForm = /<Input\b|<Textarea\b|<Select\b|<input\b|<textarea\b|<select\b/.test(sectionAll);
    const dispatchesHold = /dispatchEvent\(/.test(sectionAll) && /DESK_HOLD_EVENT/.test(sectionAll.replace(/export const DESK_HOLD_EVENT[^\n]*/, ""));
    ok("1.316 · 432(h) · 537 · the section raises the poller's HOLD exactly when it renders something that would lose work to a refresh — a dialog or a typed form",
      (hasDialog || hasTypedForm) === dispatchesHold && /DESK_HOLD_EVENT/.test(liveCode) && /DESK_RELEASE_EVENT/.test(liveCode),
      j({ hasDialog, hasTypedForm, dispatchesHold }));
    /* ⛔ AND THE HOLD IS RAISED FROM THE FORM'S OWN DIRTY STATE, NOT FROM A MOUNT. A hold taken on mount would
     * silence the poller for as long as the tab is open, whether or not anything is being typed — which is the
     * opposite defect and just as invisible. */
    ok("1.316 · 537 · the hold follows the form's DIRTY state and is released again, in one effect with a cleanup",
      /useEffect\(\(\) => \{\s*if \(!armed\) return undefined;/.test(decomment(read(FORM)))
        && /window\.dispatchEvent\(new Event\(DESK_HOLD_EVENT\)\);/.test(decomment(read(FORM)))
        && /window\.dispatchEvent\(new Event\(DESK_RELEASE_EVENT\)\);/.test(decomment(read(FORM))), "");
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
    /* ⛔ AND THE PAIR IS RENDERED, NOT GREPPED (replan review, 2026-09-18). Every term above is a regex over source
     * text, and `ProgressBar` is rendered by no suite at all — so a version that painted BOTH lines, or that stamped
     * `[object Object]` into `aria-valuetext`, would satisfy the whole proof of the discriminated pair. The kit's own
     * `admin-charts.test.mts` already renders its components with `renderToStaticMarkup`; this does the same. */
    {
      const { createElement: h }: Any = await import("react");
      const { renderToStaticMarkup }: Any = await import("react-dom/server");
      const { ProgressBar }: Any = await import("../../src/components/ui/progress-bar.tsx");
      const withCaption = renderToStaticMarkup(h(ProgressBar, {
        value: 4_000, max: 10_000, label: "Daily stake limit", captionText: "Daily stake limit · used TZS 4,000 of TZS 10,000",
        caption: h("span", null, "Daily stake limit · used TZS 4,000 of TZS 10,000"),
      }));
      const without = renderToStaticMarkup(h(ProgressBar, { value: 1, max: 2, label: "Rows purged" }));
      ok("1.362 · RENDERED · with a caption the bar paints EXACTLY ONE line, the kit's own tracked number is gone, and `aria-valuetext` carries the PLAIN sentence",
        (withCaption.match(/<p /g) ?? []).length === 1
          && !withCaption.includes("4,000 of 10,000")
          && withCaption.includes('aria-valuetext="Daily stake limit · used TZS 4,000 of TZS 10,000"')
          && !withCaption.includes("[object Object]"),
        j({ paragraphs: (withCaption.match(/<p /g) ?? []).length }));
      ok("1.362 · RENDERED · CONTROL · without a caption the SAME component paints the kit's built-in line and carries no `aria-valuetext` — so the branch above is a measurement",
        (without.match(/<p /g) ?? []).length === 1 && without.includes("1 of 2")
          && !without.includes("aria-valuetext") && !without.includes("[object Object]"),
        j({ builtIn: /1 of 2/.test(without), valuetext: without.includes("aria-valuetext") }));
    }
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
    /* ⛔ 1.544 · THE BAR'S AT/OVER CLAUSE IS THE ONLY THING THAT SEPARATES 100% FROM 185%, AND IT IS MEASURED
     * RATHER THAN ARGUED. `ProgressBar` clamps at `Math.min(100, …)`, so `limits-at-1280.png` and
     * `limits-over-1280.png` — taken on a served build with usage at 7,430,000 against caps of 7,430,000 and
     * 5,000,000 — are pixel-identical in the meter. Set in the sentence's own tone the clause is four grey words
     * at the end of five near-identical grey lines, on the card that says whether the gate is refusing stakes.
     * ⛔ THE THREE TERMS ARE A SET, AND EACH ONE ALONE WOULD BE A GUARD THAT CANNOT FAIL:
     *   (a) the BAR's clause is toned, and the tone is the one this card already spends on a cap that stops money;
     *   (b) `captionText` is UNTOUCHED, so the announced sentence gained no markup (the `aria-valuetext` trap);
     *   (c) the ROSTER CELL's clause is NOT toned — a roster row has a status chip to colour and the module says
     *       so in its own words, so a sweep that coloured every `edgeText` would be just as red as one that
     *       coloured none.
     * The clause itself stays in the markup either way, so colour is the SECOND signal here and never the only
     * one. Declared mutation: `544-edge-tone`. */
    {
      const barEdge = /\{row\.edgeText \? <span className="text-warning-fg">\{row\.edgeText\}<\/span> : null\}/.test(pageCode);
      const cellEdge = /\{cell\.edgeText \? <span className="text-text-secondary">\{cell\.edgeText\}<\/span> : null\}/.test(pageCode);
      ok("1.544 · the BAR's at/over clause carries the warning tone the card already spends on a cap that stops money — the geometry saturates and cannot say it",
        barEdge && (pageCode.match(/row\.edgeText/g) ?? []).length === 2, j({ barEdge, n: (pageCode.match(/row\.edgeText/g) ?? []).length }));
      ok("1.544 · CONTROL · the ROSTER CELL's clause is NOT toned, and `captionText` gained no markup — a sweep that coloured every clause would fail here",
        cellEdge && !/text-warning-fg/.test(/function Usage\(\{ cell[\s\S]*?\n\}/.exec(pageCode)?.[0] ?? "")
          && !/captionText=\{[^}]*text-warning-fg/.test(pageCode), j({ cellEdge }));
    }
  }

  /* ⛔ 1.405 · THE RAIL IS THE KIT'S LINE VARIANT, URL-BACKED, WITH ITS COUNT THROUGH `CountBadge`. */
  {
    const rail = /<Tabs[\s\S]*?\/>/.exec(pageCode)?.[0] ?? "";
    ok("1.405 · the rail is `variant=\"line\"`, URL-backed from 319's one home, and carries no eyebrow, uppercase or tracking of its own",
      /variant="line"/.test(rail) && /href: consoleTabHref\(k\)/.test(rail)
        && !/eyebrow|uppercase|tracking-|rank="dense"|data-filter-rail|ScrollX/.test(rail), j(rail.replace(/\s+/g, " ").slice(0, 200)));
    /* ⛔ THE LABELS ARE READ FROM `TAB_LABEL` IN `page.tsx`, NOT TYPED HERE. It mapped `CONSOLE_TABS` through a
     * label table written INSIDE this test and compared the result with a literal also written inside this test, so
     * it never read the product at all: changing the page to `limits: "Caps"` left it green. A check built from the
     * value it checks is the class this whole review is about.
     * ⛔ AND THE RULE IS DERIVED, NOT LISTED: the rail's English label is the tab KEY in sentence case — which is
     * what `roster`/`limits` are, and what `activity`, `history`, `rules` and `targets` will be at steps 4-6. A tab
     * that genuinely needs another word fails HERE and takes a ruling, which is the right way round. */
    const tabTable = pageCode.slice(pageCode.indexOf("const TAB_LABEL"), pageCode.indexOf("};", pageCode.indexOf("const TAB_LABEL")));
    const parsed = [...tabTable.matchAll(/(\w+):\s*"([^"]*)"/g)].map((m) => [m[1], m[2]] as const);
    const sentenceCase = (k: string) => `${k[0].toUpperCase()}${k.slice(1)}`;
    ok("1.405 · the rail's labels are the PAGE's own `TAB_LABEL`, one per key of the closed list, each the key in English sentence case",
      parsed.length > 0 && j(parsed.map(([k]) => k)) === j([...CR.CONSOLE_TABS])
        && parsed.every(([k, v]) => v === sentenceCase(k))
        && /TAB_LABEL: Record<\(typeof CONSOLE_TABS\)\[number\], string>/.test(pageCode)
        && /labelEn: TAB_LABEL\[k\]/.test(pageCode),
      j({ parsed, tabs: [...CR.CONSOLE_TABS] }));
    ok("1.405 · CONTROL · the parse really read the page's table — not an empty match set that would pass every term above",
      parsed.length === (CR.CONSOLE_TABS as readonly string[]).length && parsed.every(([, v]) => v.length >= 4),
      j(parsed));
    /* ⛔ THE COUNT IS THE STRIP'S OWN NUMBER, PASSED AS `TabItem.count` SO THE KIT'S `CountBadge` PAINTS IT — never
     * a bare number typed into a label, and never a second derivation. `CountBadge` renders nothing at 0, which is
     * why a count may not stand in for a read's health (312). */
    /* ⛔ ONE VALUE, TWO SURFACES. The badge takes `view.unsetRequired` and the strip's sentence is BUILT from the
     * same number on the server — so the page spends the raw count EXACTLY ONCE, and a badge that disagrees with the
     * sentence 40px above it has nowhere to come from. Both forms of the sentence used to be spelled out in JSX
     * here, which is how the strip came to paint it beside a switch that was already on. */
    ok("1.405 · the limits badge is `TabItem.count` — the kit's `CountBadge` — and the page spends the raw count EXACTLY ONCE, the strip's sentence coming from the server",
      /count: k === "limits" \? view\.unsetRequired : undefined/.test(pageCode)
        && (pageCode.match(/view\.unsetRequired/g) ?? []).length === 1
        /* twice: the branch test and the LINK's own child. The plain form once, in the inert branch. */
        && (pageCode.match(/view\.limitsFirstReason/g) ?? []).length === 2
        && (pageCode.match(/view\.limitsFirstPlain/g) ?? []).length === 1
        /* ⛔ AND THE WORDS ARE NOT SPELLED HERE AT ALL — no interpolated count, no hand-written sentence. */
        && !/Set \{?view/.test(pageCode) && !/global limits? first/.test(pageCode)
        && !/REQUIRED_FOR_MASTER_ON/.test(pageCode) && !/\.filter\(/.test(pageCode)
        && /count\?: number;/.test(read("src/components/ui/tabs.tsx"))
        && read("src/components/ui/tabs.tsx").includes("CountBadge"),
      j({ unsetRequired: (pageCode.match(/view\.unsetRequired/g) ?? []).length }));
  }

  /* ⛔ 1.406 · THE SWITCH, THE ENGINE STATE AND EVERY CAP BREACH LIVE ABOVE THE RAIL ON EVERY TAB — provable now
   * that a second panel exists. Each of them is rendered OUTSIDE the `?tab=` switch, so no tab can own one. */
  {
    /* ⛔ TAB OWNERSHIP, NOT A SOURCE OFFSET — AND THE OFFSET FORM WAS A MUTATION AIMED AT NOTHING (replan ruling
     * 541(a)). This read `at < firstPanel`, where `firstPanel` is the index of the first tab group. The declared
     * mutation `406-strip` wraps the poller IN PLACE (`<DeskLive …>` → `{tab === "roster" ? <DeskLive …> : null}`),
     * so the insert shifts `pollerAt` AND `firstPanel` by the same amount and every term stayed true. SIMULATED on a
     * copy: BASE {p1406:true} / 406-MUT {p1406:true}. No assertion in the suite could see the desk's one live
     * trigger move inside a tab group — the whole defect 406 and 316 exist for.
     * ⛔ WHAT DECIDES OWNERSHIP IS WHETHER A `tab === ` CONDITION LIES BETWEEN THE BODY AND THE SITE. The search
     * starts at `<AdminBody>` deliberately: the reader selection thirty lines above (`tab === "roster" ? await
     * houseRosterForConsole(…)`) is a `tab ===` that is not a tab GROUP, and starting at 0 would make every site
     * fail for the wrong reason — a guard that goes red for the wrong reason goes green for the wrong reason too. */
    const bodyAt = pageCode.indexOf("<AdminBody>");
    const firstTabCond = pageCode.indexOf('tab === "', bodyAt);
    const firstPanel = pageCode.indexOf('{tab === "roster" && (<>');
    const sites: Array<[string, number]> = [
      ["the master-switch strip", pageCode.indexOf("Desk master switch")],
      ["the auto-off Callout", pageCode.indexOf("<Callout tone=\"warning\"")],
      ["the schema Callout", pageCode.indexOf("<Callout tone=\"neutral\"")],
      ["the KPI band", pageCode.indexOf("<KpiGrid")],
      ["the rail", pageCode.indexOf("<Tabs")],
      ["the live poller", pageCode.indexOf("<DeskLive")],
    ];
    ok("1.406 · the strip, both Callouts, the band, the rail and the live trigger are ALL rendered before ANY `tab === ` condition in the body — no tab owns a control that stops money",
      bodyAt > 0 && firstTabCond > bodyAt && sites.every(([, at]) => at > bodyAt && at < firstTabCond),
      j({ bodyAt, firstTabCond, inside: sites.filter(([, at]) => !(at > bodyAt && at < firstTabCond)) }));
    ok("1.406 · CONTROL · the two panels really are inside `?tab=` groups, and the FIRST condition in the body is a tab GROUP opener — so the assertion above has something to decide",
      firstPanel > 0 && firstTabCond === firstPanel + 1
        && pageCode.indexOf('{tab === "limits" && (<>') > firstPanel
        && (pageCode.match(/\{tab === "[a-z-]+" && \(<>/g) ?? []).length === 2,
      j({ firstPanel, firstTabCond }));
  }

  /* ⛔ 1.412 / 537 · THE TYPED CONTROL, THE WIRED SAVE AND THE UNSAVED-CHANGES GUARD STAND OR FALL TOGETHER.
   *
   * ⚠️ THIS ASSERTION USED TO POINT THE OTHER WAY, and it had to be rewritten rather than deleted. Under ruling
   * 433(a) it read `typed === saveWired` with BOTH false — a true statement about a panel with no service behind
   * it. Ruling 537 measured that the service exists in both twins, tested and CAS-safe, so 433(a) is reversed and
   * both halves are now TRUE. An equality that has only ever been checked in one direction is exactly the shape
   * this project keeps paying for, so the tie is a CHAIN: a typed control with no wired save is red, a wired save
   * with no `UnsavedChangesGuard` in front of it is red, and a guard with no bar beside it is red. Each of the four
   * has a declared mutation of its own.
   * ⛔ `test:unsaved-changes`' population rule is the same rule from the other side: any `.tsx` under `src/app/admin`
   * with a typed control must carry the guard or be a NAMED exemption, and this form is neither exempt nor exempted. */
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
    const guarded = /<UnsavedChangesGuard\b/.test(sectionCode);
    const bars = (sectionCode.match(/<PendingChangesBar\b/g) ?? []).length;
    const forms = (sectionCode.match(/<form\b/g) ?? []).length;
    ok("1.412 · 537 · a typed control, a wired limits SAVE and an `UnsavedChangesGuard` exist TOGETHER or not at all — each one is red without the other two",
      typed === saveWired && saveWired === guarded && typed === true,
      j({ typedControl: typed, saveWired, guarded }));
    ok("1.412 · EXACTLY ONE guarded form on the tab, with the singleton `PendingChangesBar` beside it — the bar is a singleton and two would elect one painter and hide the other",
      forms === 1 && bars === 1 && guarded, j({ forms, bars }));
    /* ⛔ THE FORM'S COLUMN IS THE FORM TIER, AND IT DID NOT MOVE WHEN THE INPUTS ARRIVED (412). */
    ok("1.412 · the limits column is `FormColumn measure=\"form\"` (640), every control is `size=\"md\"`, and nothing under the section uses the `sm` rungs",
      /<FormColumn measure="form">/.test(pageCode) && !/<(Input|Select|Textarea|Button)\b[^>]*size="sm"/.test(sectionCode)
        && (sectionCode.match(/size="md"/g) ?? []).length >= 2, "");
    /* ⛔ RULING 433's READ-ONLY REASON IS GONE FROM BOTH OF ITS PINS, IN THIS SAME CHANGE. A sentence saying
     * "editing is not ready" beside a form an officer can type into is 432(j) inverted — the disabled-control rule
     * telling a lie about a control that works — and leaving the string behind would have made this case pass on
     * the WORD rather than on the shape. */
    ok("1.412 · 537 · the read-only reason is gone from the reader AND from the page, in the same change as the form",
      !decomment(read(GATE)).includes("Editing limits is not ready on this build yet.")
        && !decomment(read(GATE)).includes("formReason") && !pageCode.includes("formReason"),
      "");
    /* ⛔ NO FORM WITHOUT A BASE VERSION, AND THE ANCHOR'S LITERAL STAYS IN THE PAGE. */
    ok("1.412 · 537 · the page renders the form ONLY with a base version, hands it the anchor id as a literal, and passes the action down itself",
      /limitRows === null \|\| limitsVersion === null/.test(pageCode)
        && /<DeskLimitsForm rows=\{limitRows\} baseVersion=\{limitsVersion\} id="limits-first-unset" omitSection=\{LIMITS_CARD_TITLE\} onSave=\{saveDeskLimitsAction\} \/>/.test(pageCode)
        && pageCode.includes('id="limits-first-unset"'), "");
    /* ⛔ EVERY FIELD IS ADDRESSABLE, AND THE ADDRESS IS THE SERVER'S NEUTRAL KEY — DG-S-05/06's whole point is that
     * a refusal without an address can take nobody anywhere. */
    const formCode = decomment(read(FORM));
    ok("1.412 · §K 7d · every field carries `dataField` and `name` from the SAME server key, and the refusal's result UNION is handled rather than dropped",
      /dataField=\{row\.key\}/.test(formCode) && /name=\{row\.key\}/.test(formCode)
        && /focusFirstInvalid\(form, \[result\.field\]\)/.test(formCode)
        && /landed\.reason === "not-rendered" && landed\.ownedByTab/.test(formCode), "");
    /* ⛔ 432(n) · THE CARD'S HEADING IS NOT SAID TWICE, AND THE THING THE FORM SUPPRESSES IS THE CARD'S OWN TITLE.
     * READ OFF THE FIRST RENDER of this form: `<AdminCard title="Global limits">` and the form's first group printed
     * the same two words 34px apart, at 1280 and at 360 — one state saying one fact twice. A literal typed in the
     * form and compared against another literal typed in the page would hide the heading for whichever spelling was
     * guessed; the page passes its OWN title, so a rename on either side brings the heading straight back instead of
     * staying silently hidden. */
    ok("1.412 · 432(n) · the limits card names its section ONCE — the form suppresses the heading the card already carries, from the card's own one home",
      /const LIMITS_CARD_TITLE = "[^"]+";/.test(pageCode)
        && (pageCode.match(/LIMITS_CARD_TITLE/g) ?? []).length === 3
        && !/title="Global limits"/.test(pageCode)
        && /section\.name === omitSection \? null :/.test(formCode), "");
  }

  /* ⛔ 1.537 · THE SAVE'S ONLY GATE IS INSIDE THE ACTION (rulings 259, 522, 523).
   *
   * A Next server action is a POST to whatever URL the browser happens to be on, carrying a `Next-Action` id in a
   * header — it has no path of its own, so no middleware rule, no layout and no `AdminSectionGate` can see it. The
   * action therefore decides for itself, through the one named door, on the viewer's STORED row. */
  {
    const actionsRaw = read(ACTIONS);
    const actionsCode = decomment(actionsRaw);
    ok("1.537 · 523 · the action is `\"use server\"`, resolves the session itself, and hands the gated writer the session's USER ID and its own route literal",
      /^"use server";/.test(actionsRaw.replace(/^\uFEFF/, ""))
        && /const session = await currentSession\(\);/.test(actionsCode)
        && /houseLimitsSaveForConsole\(session\?\.userId \?\? null, "\/admin\/desk", input\)/.test(actionsCode),
      j(actionsCode.replace(/\s+/g, " ").slice(0, 200)));
    ok("1.537 · 522 · the action reads NO role of its own — a cookie's photograph of a role cannot answer the demoted-account question, so the action never asks it",
      !/\.role\b/.test(actionsCode) && !/isAdmin|canAct|canView|requireStaff|requireOwner/.test(actionsCode), "");
    ok("1.537 · 340 · the action names no store, no house read module and no column — the reads and the write are behind the door",
      !/from "@\/lib\/server\/house-bot/.test(actionsCode) && !/house-bot-dal/.test(actionsCode)
        && !/\bdb\./.test(actionsCode) && !/Store\./.test(actionsCode)
        && (R.LIMIT_FIELDS as readonly string[]).every((f) => !actionsCode.includes(f)), "");
    /* ⛔ A REFUSAL CHANGED NOTHING, SO IT MUST NOT INVALIDATE THE RENDER: a `revalidatePath` on the refusal path
     * would replace the officer's own typing with a fresh server payload at the exact moment they are being told
     * to fix one field. */
    ok("1.537 · only a save that LANDED revalidates the section — a refusal leaves the officer's typing alone",
      /if \(result\.ok\) revalidatePath\(CONSOLE_ROUTE\);/.test(actionsCode), "");
    /* ⛔ AND THE DOOR ITSELF DECIDES BEFORE IT READS: the audience call is the FIRST statement of the writer. */
    const gateSrc = decomment(read(GATE));
    const at = gateSrc.indexOf("export async function houseLimitsSaveForConsole");
    const body = gateSrc.slice(at, at + 900);
    ok("1.537 · 259 · the gated writer's FIRST statement is the audience verdict, before any read, any write and any mapping",
      at > 0 && /^\s*if \(!\(await houseConsoleAudience\(viewerUserId, route\)\)/m.test(body.slice(body.indexOf("): Promise<ConsoleLimitsSaveResult> {") + 36))
        && body.indexOf("houseConsoleAudience") < body.indexOf("saveHouseBotLimits"), j(body.replace(/\s+/g, " ").slice(0, 200)));
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
  /* ⭐ TWO SITES AT C7 STEP 4 — the roster row and the account page's strip — and BOTH are `bot.userId`. The
     assertion is not a count for its own sake: `playerHandle` turns a user id into "Player #TAIL", and using it on
     an ACTOR would put a staff member behind a player's mask on a screen about a player's account. */
  ok("1.420 · `playerHandle` is used for the HOLDER only, never for a staff actor — every call takes `bot.userId`",
    (gateCode.match(/playerHandle\(/g) ?? []).length === 2
      && (gateCode.match(/playerHandle\(bot\.userId\)/g) ?? []).length === 2, "");

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
    /* ⛔ A POSITIVE TERM, BECAUSE A PURE ABSENCE READS AN EMPTY POPULATION AS COMPLIANCE. With no client file — or
     * with one the walk failed to read — every `!test` below is trivially true. */
    ok("1.389 · no client file of the section imports `@/lib/utils`' date helpers, which reach server platform config from a chunk (trap E-322)",
      clientFiles.length >= 1 && clientCode.length > 200
        && !/from "@\/lib\/utils"/.test(clientCode) && !/formatEat|getPlatformTimezone|eatDayKey/.test(clientCode),
      j({ clientFiles, chars: clientCode.length }));
    ok("1.389 · the section adds NO countdown component of its own — the kit's `CountdownPill` is the one home, and it takes server-computed seconds",
      sectionFiles.every((f) => !/function\s+\w*Countdown|const\s+\w*Countdown\s*=/.test(decomment(read(f))))
        && existsSync(join(ROOT, "src/components/ui/countdown-pill.tsx")), "");
    /* ⛔ AND BOTH HALVES OF THAT ASSERTION CAN FIRE: a planted date-helper import and a planted local countdown are
     * each caught by the very expressions above, so the two absences are measurements and not unreached scans. */
    /* ⛔ THE CONTROL EXERCISES THE SCAN, IN BOTH DIRECTIONS, AGAINST THE REAL POPULATION — it did not. It built a
     * string containing the pattern and asked whether it contained the pattern (and the second half tested a pattern
     * against a CONSTANT), so it was true for an empty `clientCode` and for a `sectionFiles` that found nothing: a
     * control that has never been shown to REJECT anything is not a control. The plant now goes into a copy of the
     * real files, the same expression is re-run over it, and the ORIGINAL is required to stay clean. */
    ok("1.389 · CONTROL · planting a date-helper import into the REAL client code, and a local Countdown into a REAL section file, makes the same two scans report — and the originals do not",
      (() => {
        const plantedClient = `${clientCode}\nimport { formatEat } from "@/lib/utils";`;
        const bodies = sectionFiles.map((f) => decomment(read(f)));
        const plantedSection = [...bodies, "function DeskCountdown() { return null; }"];
        const scanImport = (code: string) => /from "@\/lib\/utils"/.test(code) || /formatEat|getPlatformTimezone|eatDayKey/.test(code);
        const scanCountdown = (all: string[]) => !all.every((b) => !/function\s+\w*Countdown|const\s+\w*Countdown\s*=/.test(b));
        return clientFiles.length >= 1 && bodies.length >= 4
          && scanImport(plantedClient) && !scanImport(clientCode)
          && scanCountdown(plantedSection) && !scanCountdown(bodies);
      })(),
      j({ clientFiles: clientFiles.length, sectionFiles: sectionFiles.length }));

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
    /* ⛔ BOTH DIRECTIONS, AGAINST THE REAL PAGE. It tested the pattern against a string it had just put the
     * pattern into, so it was true whatever `pageCode` held — including nothing at all. */
    ok("1.343 · CONTROL · planting a header-derived route argument into the REAL page makes the same scan report, and the real page does not",
      (() => {
        const scan = (code: string) => /headers\(\)|x-pathname/.test(code);
        return pageCode.length > 2_000 && gateCalls.length >= 3
          && scan(`${pageCode}\nconst r = headers().get("x-pathname");`) && !scan(pageCode);
      })(),
      j({ pageChars: pageCode.length, gateCalls: gateCalls.length }));

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
    /* ⛔ `BUILT_THROUGH` IS READ OFF THE TREE, NOT TYPED. It was a hand ratchet with no tie to anything the build
     * produces, so a step-4 build that forgot to bump it would silently stop requiring 1.399 — the roll-call would
     * report every owed assertion as present because none was owed. Each rung is the artefact that step creates. */
    const rung = (hasWizard: boolean, hasActivity: boolean, hasDetail: boolean, hasLimits: boolean) =>
      hasWizard ? 6 : hasActivity ? 5 : hasDetail ? 4 : hasLimits ? 3 : 1;
    const tree = {
      wizard: existsSync(join(ROOT, `${SECTION}/new/page.tsx`)),
      activity: (CR.CONSOLE_TABS as readonly string[]).includes("activity"),
      detail: existsSync(join(ROOT, DETAIL_PAGE)),
      limits: (CR.CONSOLE_TABS as readonly string[]).includes("limits"),
    };
    const BUILT_THROUGH = rung(tree.wizard, tree.activity, tree.detail, tree.limits);
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
    /* ⛔ THE POPULATION IS DERIVED FROM THE SPEC, NOT COUNTED BY HAND. `D19.length === 23` was a number tied to
     * nothing on disk: a ruling added to Area 5 would have joined the spec and never the roll-call, which is the
     * exact failure 506 found twelve instances of. Area 5's own `#### <n>.` headings ARE the closed list. */
    const area5Src = (() => {
      const spec = read("plans/house-bots/C7-SPEC.md");
      const from = spec.indexOf("### Area 5 — D19 for the console itself");
      const to = spec.indexOf("### Area 6 —", from);
      return from >= 0 && to > from ? spec.slice(from, to) : "";
    })();
    const area5 = [...area5Src.matchAll(/^#### (3[89]\d)\. /gm)].map((m) => `1.${m[1]}`);
    const extras = D19.map((d) => d.id).filter((id) => !area5.includes(id));
    ok("1.398 · ROLL-CALL · every D19 assertion owed at or before the step this tree has built was PRINTED by this run, and every later one is named with its step and its instrument",
      missing.length === 0 && dueHere.length >= 9
        && area5.length >= 19 && area5.every((id) => D19.some((d) => d.id === id))
        && j(extras) === j(["1.332", "1.342", "1.343"]),
      j({ builtThrough: BUILT_THROUGH, dueHere: dueHere.length, area5: area5.length, notInRollCall: area5.filter((id) => !D19.some((d) => d.id === id)), missing: missing.map((d) => `${d.id} (${d.what})`), later: later.map((d) => `${d.id}@step${d.step}:${d.owner}`) }));
    /* ⛔ AND THE DERIVATION IS SHOWN TO HAVE READ THE SPEC: an empty slice makes `every` trivially true, which is
     * the population trap the roll-call itself was written against. */
    /* ⛔ AND THE LADDER REALLY MOVES WITH THE TREE. A ratchet read off disk is worth nothing if the reading is a
     * constant, so `rung` is exercised over every rung it can return — and the tree's own four facts are PRINTED, so
     * the step that adds the detail page or the wizard sees the number change rather than having to trust it.
     * ⚠️ This control does NOT assert today's tree shape: a step-4 build must not go red here for building step 4. */
    ok("1.398 · CONTROL · Area 5 was really parsed out of C7-SPEC §2, and `BUILT_THROUGH` is a LADDER over the tree — not a constant, and not typed",
      area5Src.length > 2_000 && area5.includes("1.380") && area5.includes("1.399")
        && j([rung(false, false, false, false), rung(false, false, false, true), rung(false, false, true, true), rung(false, true, true, true), rung(true, true, true, true)]) === j([1, 3, 4, 5, 6])
        && BUILT_THROUGH === rung(tree.wizard, tree.activity, tree.detail, tree.limits),
      j({ area5Chars: area5Src.length, area5, tree, builtThrough: BUILT_THROUGH }));
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


/* ════════════════════════════════════════════════════════════════════════════════════════════════════════════════
 * §4b · 1.350 — THE NAMED LIST OF DAL MEMBERS THE CONSOLE NEEDS, AND THE LIST IT DOES NOT (ruling 350; replan 506)
 *
 * ⛔ WHY IT LANDS HERE. Ruling 350 is the only guard over its own two lists, and replan ruling 506 found it homeless:
 * named by a Proof clause as its own instrument and written in no suite. Step 4 is where it belongs, because the
 * member-by-member decision ruling 504 forced — `lastStoppedAt` deleted, `veto` kept with its callers named — is
 * exactly this ruling's subject, and because this step added the one member 350's KEEP list allows (`botRateUsage`).
 * ⛔ THE POPULATION IS THE GATE MODULE, not the whole tree: what 350 governs is what the CONSOLE reads. A member on
 * the NOT-NEEDED list may live on an engine caller's account (350 says so in as many words); what it may not do is
 * appear behind the console's one door.
 * ════════════════════════════════════════════════════════════════════════════════════════════════════════════════ */

if (STORE === "memory") {
  section("§4b · ruling 350's two lists, over the console's one door");
  const gate350 = decomment(read(GATE));
  /* Ruling 350's NOT-NEEDED half, verbatim from the ruling. ⛔ A member here may exist in the DAL on an ENGINE
   * caller's account; what it may not do is appear inside the console's gate module. */
  const NOT_NEEDED = ["recordDisclosure", "listOverlapping", "listByKindsInWindow", "listByUserKinds", "countByBot",
    "counteredPositionsCount", "listInWindow", "countRegister", "entryRows", "stakeRows", "feeInputs", "ledgerRows",
    "positionsForUser", "txnPageForUser", "houseBotBook", "houseStaffScorecard", "houseStakeByMarket",
    "houseStakeForAudit", "placedTimes", "botUsage", "marketUsage", "counterpartyToday", "lockedPool",
    "staffChosenPlacedSince", "placedInWindow", "staffChosenPlaced", "listAlertRepair", "listActive",
    "activeForMarket", "everStopped", "lastStoppedAt", "listForPress", "drawOpenerSide", "findOpenerDraw",
    "pruneInstanceRows", "blackoutRow", "rawProductLine", "roundLock", "marketView", "plannableMarkets",
    "triggerPage", "triggerAccount", "intentFreshness", "revertPlacedInMemory"];
  const reached = NOT_NEEDED.filter((m) => new RegExp(`\\.${m}\\(`).test(gate350));
  ok("1.350 · not one member of ruling 350's NOT-NEEDED list is called behind the console's one door",
    reached.length === 0 && NOT_NEEDED.length >= 40, j({ reached, population: NOT_NEEDED.length }));
  ok("1.350 · CONTROL · the detector finds a member the door DOES call, so the zero above is a measurement",
    /\.listNonRemoved\(/.test(gate350) && /\.botRateUsage\(/.test(gate350)
      && new RegExp("\\.placedTimesXyz\\(").test(gate350) === false, "");
  /* ⛔ AND THE TWO MEMBERS RULING 504 DECIDED ARE DECIDED IN THE TREE, not only in a plan file: one is GONE from the
   * house DAL entirely, and the other is still the interface plus both twins with its behavioural callers intact. */
  const dal350 = decomment(read("src/lib/server/house-bot-dal.ts"));
  ok("1.350 · 504 · `lastStoppedAt` is gone from the DAL and `veto` is still the interface plus BOTH twins — the two members 350's mechanism had left undecided",
    !new RegExp("(^|[^A-Za-z])(async )?lastStoppedAt\\(", "m").test(dal350)
      && (dal350.split("veto(").length - 1) >= 3, j({ veto: dal350.split("veto(").length - 1 }));
  /* ⛔ AND THE ONE MEMBER THIS STEP ADDED IS ON 350's KEEP LIST BY NAME — 351 is the ruling that put it there, and
   * a member added to the seam without a cited scope line is exactly what C5-5b's exit rule deletes. */
  ok("1.350 · 351 · the one seam member this step added is the one ruling 351 names, and it is the ONLY new one",
    /botRateUsage\(input: \{ houseBotId: string \| null \}/.test(dal350)
      && (dal350.match(/botRateUsage\(/g) ?? []).length === 3, j({ named: (dal350.match(/botRateUsage\(/g) ?? []).length }));
}
console.log(`\n@@SUMMARY ${JSON.stringify({ pass, fail })}`);
console.log(`\n${fail === 0 ? "ALL PASS" : "FAILURES"} — house-bot-console [${STORE}]: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
