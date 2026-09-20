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
import { blankLiterals, decomment } from "./decomment.mts";
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
 * ⭐ C7 STEP 7's REVIEW FIX · THE SECTION'S ONE WAY OUT, AND IT IS A COMPONENT.
 * The review declared it as a shared CLASS STRING in `console-routes.ts`; `test:house-bot-rules` 0.console-routes.ts
 * refused that for a measured reason — Tailwind scans EVERY file, so a class-shaped string in a routes module becomes
 * CSS and an invalid one once 500'd every route on this platform. The review's reasoning (one shared thing, not three
 * hand-typed looks) was right and only its home was wrong, so the thing moved here. ⛔ NAMED, because 1.432 measures
 * ONE declaration site and a count cannot notice which file declared it.
 */
const WAY_OUT_FILE = `${SECTION}/way-out-link.tsx`;
/** ⭐ C7 step 6 · the designate wizard: its page, its loader, its own actions file and its one client module. */
const NEW_PAGE = `${SECTION}/new/page.tsx`;
const NEW_LOADING = `${SECTION}/new/loading.tsx`;
const NEW_ACTIONS = `${SECTION}/new/actions.ts`;
const NEW_CLIENT = `${SECTION}/new/designate-wizard.tsx`;

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
/** ⭐ C7 step 6 · the picker's own bucket (387(e)) — named here because `rateCheckAsync` FAILS OPEN on a key it
 *  does not know, so a rule that is deleted or renamed switches its own control off in silence. */
const RATEM: Any = await import("../../src/lib/server/rate-limit.ts");
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
/**
 * ⛔ ONE PANEL'S OWN SOURCE, AND IT IS A NARROWING RATHER THAN A WIDENING. The landing page carried two panels
 * when its money rules were written, so a file-wide count of a money header or a column floor WAS that panel's
 * count. With four panels a file-wide count answers about the page and not about the table, and the two answers
 * diverge silently — a roster floor deleted while an activity floor is added reads as unchanged. Every scan
 * that is about ONE table reads that table's own slice, which says strictly more than the count it replaces.
 *
 * ⛔ AND IT IS DECLARED HERE, ABOVE THE BEHAVIOURAL REGION'S OWN `try`, BECAUSE THREE SECTIONS NOW SLICE THE SAME
 * PAGE AND THEY DO NOT SHARE ONE SCOPE. It was a local of §4, which runs on the memory child only; §2e3 runs on
 * BOTH stores and called it, so the Postgres child threw `panelOf is not defined` — and a throw there does not
 * fail one case, it ABORTS the child, which is exactly how §3's lexicon scan and §4's whole source law came to be
 * skipped while the run still printed 414 passes.
 * 🔴 AND MOVING IT TO COLUMN ZERO WAS NOT ENOUGH, WHICH IS THE SECOND HALF OF THE SAME LESSON AND IT COST A RUN.
 * §1 and §2 sit inside ONE `try` that opens immediately below this block and closes past §2e3; a declaration
 * written at column zero INSIDE that try is a local of it, reads exactly like a top-level one, and §4 — which is
 * outside it — threw `pageRaw is not defined` and aborted the MEMORY child at 0 assertions while the Postgres
 * child printed ALL PASS. Indentation is not scope. It is declared ABOVE the `try` so every section below can see
 * it. ⛔ ONE definition, above every reader of it: a second copy is a second answer to "what is this panel",
 * and this file has a 0.throw case precisely because a silent skip reads like a pass.
 */
const pageRaw = read(PAGE);
const pageCode = decomment(pageRaw);
const panelOf = (tab: string): string => {
  const open = pageCode.indexOf(`{tab === "${tab}" && (<>`);
  if (open < 0) return "";
  const close = pageCode.indexOf("\n        </>)}", open);
  return close < 0 ? pageCode.slice(open) : pageCode.slice(open, close);
};

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
            /* ⭐ A FIFTH SITE AT C7 STEP 5's LANDING HALF: the desk-wide feed and history each name the account a
               row is about, and that name is the operator's own text on a page that lists every account at once
               — so it is bounded by the SAME named bound, read from the same list, at the one site both panels
               get it from. */
            && /accountName: clampOperatorText\(found\.label, operatorBound\("label"\)\),/.test(gateSrc)
            && (gateSrc.match(/clampOperatorText\(/g) ?? []).length === 5
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
  /* ⭐ RE-AIMED AT C7 STEP 6, AND THE PREMISE REALLY DID CHANGE. The head action was DISABLED in every state while
     the wizard had no page, so "every state carries a sentence beside it" was the right rule; step 6 made it a LIVE
     LINK, and an assertion that kept demanding a sentence beside a working control would have been the fix
     invalidating its own proof. It is therefore re-expressed over the states themselves, in BOTH directions and for
     BOTH controls — the switch and the head action — rather than deleted:
       · a disabled control ⇒ EXACTLY ONE sentence beside it, never both and never neither (432(j) with 432(n));
       · a live control ⇒ no sentence at all;
       · and in every state the switch's sentence is never the head action's words. */
  const besideAction = (x: Any): string[] => [x.actionReason, x.rosterFullReason].filter((s: unknown) => typeof s === "string" && s.length > 8);
  ok("432(j) · 432(n) · a DISABLED master switch carries exactly one reason beside it — its own or the limits sentence, never both and never neither — and an OPERABLE one carries none",
    switchStates.every(([, x]) => ((x.switchDialog ?? null) === null ? besideSwitch(x).length === 1 : besideSwitch(x).length === 0))
      && switchStates.every(([, x]) => x.switchReason === null || x.switchReason !== x.actionReason),
    j(switchStates.map(([name, x]) => [name, x.switchDialog?.to ?? "disabled", besideSwitch(x).length])));
  ok("432(j) · 432(n) · ⭐ THE HEAD ACTION OBEYS THE SAME RULE NOW THAT IT WORKS — a LIVE link carries no sentence, and a disabled one carries exactly one",
    switchStates.every(([, x]) => (x.designateLive === true ? besideAction(x).length === 0 : besideAction(x).length === 1)),
    j(switchStates.map(([name, x]) => [name, x.designateLive, besideAction(x).length])));
  ok("432(j) · CONTROL · the four states really are four different answers — two operable in opposite directions, one disabled with its own sentence and one disabled with the limits sentence — so the rule above was exercised and not satisfied by an empty population",
    plainFull.switchDialog?.to === "ON" && onNow.switchDialog?.to === "OFF"
      && (sunsetFull.switchDialog ?? null) === null && typeof sunsetFull.switchReason === "string" && sunsetFull.switchReason.toLowerCase().includes("switch")
      && (unsetOne.switchDialog ?? null) === null && (unsetOne.switchReason ?? null) === null && typeof unsetOne.limitsFirstReason === "string"
      && plainFull.designateLive === false && plainFull.actionReason === null && plainFull.rosterFullReason !== null
      && sunsetFull.designateLive === false && typeof sunsetFull.actionReason === "string"
      && onNow.designateLive === true && onNow.actionReason === null && onNow.rosterFullReason === null,
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
      ceremonyStrings.length >= 22 && ceremonyStrings.every((s: string) => !NEUTRAL.test(s)) && houseHits(ceremonyStrings.join(" ")).length === 0,
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

  /* ══ REPLAN RULING 548 · THE BREADCRUMB PAINTS NO RECORD ID ON THIS SECTION ═══════════════════════════════════
   * Read off C7 step 4's own tile: `/admin/desk/hb_32320_2` rendered the crumb "Admin / Desk / hb_32320_2".
   * ⚠️ AND IT IS DELIBERATELY NOT RECORDED AS A DISCLOSURE. The crumb is built from the URL segment the viewer
   * THEMSELVES requested, so it cannot tell a non-audience viewer an id they did not already hold — at worst it
   * echoes back what they typed, which is the opposite direction from ruling 259's class. What it IS is a
   * SCREENSHOT channel, which is the exact reason 453 is stricter than its adjudicator asked. And nothing saw it:
   * the bounded-id needle wants 24 hex characters and that id shape has none.
   * ⛔ THE POPULATION IS EVERY CRUMB THIS CONSOLE CAN RENDER, DERIVED FROM ITS OWN ROUTE HOME — never a typed list
   * of paths, because the next href builder added to that module would fall outside it in silence. */
  {
    const { crumbsFromPath, assertNavKeysResolve }: Any = await import("../../src/components/admin/admin-nav-groups.ts");
    const RECORD_ID = "hb_32320_2";
    /* Every href the console's ONE route home can build for a record, taken from the module rather than typed. */
    const consolePaths: string[] = [
      CR.CONSOLE_ROUTE,
      CR.CONSOLE_NEW_ROUTE,
      CR.consoleBotHref(RECORD_ID),
      ...CR.CONSOLE_DETAIL_TABS.map((t: string) => CR.consoleBotTabHref(RECORD_ID, t)),
      CR.consoleReverifyHref(RECORD_ID),
      CR.consoleActivityHref(RECORD_ID),
      CR.consoleEventHref(RECORD_ID, "hbe_00000000000000000000abcd"),
    ].map((h: string) => h.split("?")[0].split("#")[0]);
    const crumbsOf = (p: string): string[] => crumbsFromPath(p);
    const painted = consolePaths.filter((p) => crumbsOf(p).some((c: string) => c.includes(RECORD_ID)));
    ok("1.548 · not one crumb this console can render paints a record id — the population is every href its ONE route home builds, not a typed list of paths",
      consolePaths.length >= 7 && painted.length === 0, j({ paths: consolePaths.length, painted }));
    ok("1.548 · …and the id segment renders a NEUTRAL word instead, the way ruling 313 already gives the detail route a ghost title — never a blank, which would read as a broken trail",
      j(crumbsOf(CR.consoleBotHref(RECORD_ID))) === j(["Admin", "Desk", "Account"])
        && !NEUTRAL.test(crumbsOf(CR.consoleBotHref(RECORD_ID)).join(" ")),
      j(crumbsOf(CR.consoleBotHref(RECORD_ID))));
    /* ⛔ THE FIX IS IN THE CRUMB BUILDER'S OWN HOME AND IS KEYED BY THE SECTION, NOT BY AN ID PREFIX. `looksLikeId`
     * keeps ANY digit-bearing segment containing an underscore, so adding one more prefix to its allowlist would
     * leave the NEXT prefix to re-land the same defect — which is exactly what happened here, since `hb_` was never
     * on that allowlist and was kept by the generic rule. */
    const navSrc = decomment(read("src/components/admin/admin-nav-groups.ts"));
    ok("1.548 · the fix is in the crumb builder's own home, keyed by the SECTION KEY — not a prefix added to `looksLikeId`, which the next prefix would walk straight past",
      /const ID_CRUMB: Record<string, string> = \{/.test(navSrc)
        && /^\s*if \(\/\^\(usr\|mkt\|udr\|txn\|kyc\)_\/i\.test\(p\)\) return true;$/m.test(navSrc)
        && !/hb_/.test(navSrc), j({ hasTable: /ID_CRUMB/.test(navSrc) }));
    ok("1.548 · CONTROL · a section that does NOT declare its ids maskable still paints them — so the zero above is a masked section and not a crumb builder that has stopped rendering ids at all",
      crumbsOf("/admin/players/usr_6e24abc123def456789012").includes("usr_6e24abc123def456789012")
        && crumbsOf(`/admin/kyc/${RECORD_ID}`).includes(RECORD_ID), "");
    ok("1.548 · CONTROL · the mask's own population is the ROUTE TABLE: an entry naming a key no route emits is reported, and the real table is not",
      j(assertNavKeysResolve()) === j([]), j(assertNavKeysResolve()));
  }

  /* ══ 432(f)'s `eligibility.ts` HALF — MEASURED, AND TIED BY EXISTENCE TO THE SURFACE THAT WOULD RENDER IT ══════
   * 432(f) named TWO of that module's sentences ("Already house bot “X”", "This account is already a house bot.").
   * Its `PAUSE_REASON_WAY_OUT` half was then measured at SEVEN dirty rows where the ruling had named one, so this
   * one is DERIVED rather than read off the ruling — and the same under-count holds: the walk below prints what it
   * finds and the floor only rises.
   * ⛔ NO OVERRIDE COPY IS WRITTEN HERE, AND THAT IS 432(a)'s RULE APPLIED TO COPY. The wizard is C7 step 6's;
   * eleven rewritten sentences that nothing renders is a writer with no reader, and each carries interpolated data
   * whose shape that surface has not settled. What lands instead is the MEASUREMENT and an EXISTENCE TIE — the
   * idiom 432(h) used for the way-out column and 433(a) for the limits form — so the step that renders an
   * eligibility row cannot ship without the override, and cannot ship the override with nothing rendering it. */
  {
    const ELIG = "src/lib/server/house-bot/eligibility.ts";
    const eligLiterals = domLiterals(ELIG, read(ELIG));
    const dirtyRows = eligLiterals.filter((s: string) => s.length > 2 && NEUTRAL.test(s));
    ok("1.432f · every sentence `eligibility.ts` can put on a screen is WALKED, and the ones carrying a house word are COUNTED rather than taken from the ruling — which named two",
      /* ⛔ THE FLOOR IS WHAT THIS RUN MEASURED — FOURTEEN, where ruling 432(f) named two — and it only rises. */
      dirtyRows.length >= 14 && dirtyRows.some((s: string) => s.toLowerCase().includes("already")),
      j({ dirty: dirtyRows.length, scanned: eligLiterals.length }));
    ok("1.432f · CONTROL · the walk really read that module and can say NO — a module SPECIFIER is not copy, its neutral sentences are not counted, and a planted sentence IS",
      eligLiterals.length > dirtyRows.length
        && !eligLiterals.includes("@/lib/house-bot/constants")
        && domLiterals("x.ts", `const x = "Their account is closed.";`).every((s: string) => !NEUTRAL.test(s))
        && domLiterals("x.ts", `const x = "This account is already a house bot.";`).some((s: string) => NEUTRAL.test(s)),
      j({ all: eligLiterals.length, dirty: dirtyRows.length }));

    /* ⛔ THE TIE. `houseCheckForConsole` is ruling 359's reader and does not exist yet; the day it does, this goes
     * red unless the console's own override goes with it. Both directions, so neither half can ship alone. */
    const namesElig = (code: string) => /eligibility|EligibilityRow|houseBotEligibility/.test(code);
    const hasOverride = (code: string) => /CONSOLE_ELIGIBILITY/.test(code);
    const consumers = [...sectionFiles, GATE].map((f: string) => decomment(read(f)));
    const sectionNamesEligibility = consumers.some(namesElig);
    const overrideExists = consumers.some(hasOverride);
    ok("1.432f · the section renders an eligibility row ⟺ the console's own override for those sentences exists — so C7 step 6 can ship neither half alone",
      sectionNamesEligibility === overrideExists, j({ sectionNamesEligibility, overrideExists, files: consumers.length }));
    /* ⭐ RE-AIMED AT C7 STEP 6, AND IT IS THE SAME MEASUREMENT FROM THE OTHER SIDE. The tie was written while the
       wizard did not exist, so the control proved the detectors could fire by PLANTING each subject into a copy of a
       module that carried neither. Both now really are in the module, so the plant would prove nothing and the
       inverse does the work instead: each detector must STOP firing when its own subject's lines are taken out of a
       copy, and must fire on the real file. A control whose premise a later step invalidates is re-aimed, never
       deleted and never quietly satisfied by the thing it was written to catch. */
    ok("1.432f · CONTROL · each detector fires on the REAL gate module and STOPS firing when its own subject's lines are removed from a copy — so the equality above is a measurement, not two unreached scans",
      (() => {
        const real = decomment(read(GATE));
        const without = (drop: (l: string) => boolean) => real.split("\n").filter((l) => !drop(l)).join("\n");
        return namesElig(real) && !namesElig(without(namesElig))
          && hasOverride(real) && !hasOverride(without(hasOverride));
      })(), "");
  }

  /* ══ THE ACCOUNT'S ACTION ROW (rulings 388, 415, 420, 453; replan ruling 549's 4b) ════════════════════════════
   * The half that makes the account page OPERABLE. Pause and Remove had NO service under `src/` at all before this
   * step — `outcomes.ts`'s `stopBot` is the ENGINE's stop, with a cause, no actor and a SYSTEM audit, and
   * collapsing the two would make "the engine stopped it" and "a person stopped it" indistinguishable in a record
   * kept seven years. */
  {
    const { deskActArmed }: Any = await import("../../src/app/admin/desk/[id]/account-actions.tsx");
    const DESIG: Any = await import("../../src/lib/server/house-bot/designation.ts");
    const callAct = async (viewer: string, input: Any): Promise<Any> => {
      try { return await GATEM.houseAccountActForConsole(viewer, "/admin/desk", input); }
      catch (e) { return { ok: false, error: "", threw: String((e as Error)?.message ?? e) }; }
    };
    const detail = async (id: string): Promise<Any> => GATEM.houseDetailForConsole(OFFICER, "/admin/desk", id);
    const statusOf = async (id: string): Promise<string> => (await w.dal.houseBotStore.get(id))?.status ?? "GONE";
    const actsOf = (v: Any): string[] => (v.acts ?? []).map((a: Any) => a.act);

    /* ── which acts each state allows (432(a): never a control whose service cannot perform it) ── */
    const live = await w.bot();
    const paused = await w.bot();
    await w.dal.houseBotStore.setStatus(paused.botId, { from: ["ACTIVE"], to: "PAUSED", pauseReason: "MANUAL", pausedFromStatus: null });
    const autoPaused = await w.bot();
    await w.dal.houseBotStore.setStatus(autoPaused.botId, { from: ["ACTIVE"], to: "AUTO_PAUSED", pauseReason: "WALLET_FROZEN", pausedFromStatus: "ACTIVE" });
    const goneAcct = await w.bot();
    await w.dal.houseBotStore.setStatus(goneAcct.botId, { from: ["ACTIVE"], to: "REMOVED", pauseReason: null, pausedFromStatus: null, removal: { byId: OFFICER, reason: "fixture", cause: "MANUAL" } });

    const vLive = await detail(live.botId);
    const vPaused = await detail(paused.botId);
    const vAuto = await detail(autoPaused.botId);
    const vGone = await detail(goneAcct.botId);
    ok("1.415 · the action row offers exactly the acts this account's CURRENT state allows — Pause only on a running account, Start and Confirm permission only on a stopped one, Remove on anything that is still on the desk",
      j(actsOf(vLive)) === j(["PAUSE", "REMOVE"])
        && j(actsOf(vPaused)) === j(["START", "REVERIFY", "REMOVE"])
        && j(actsOf(vAuto)) === j(["START", "REVERIFY", "REMOVE"]),
      j({ live: actsOf(vLive), paused: actsOf(vPaused), auto: actsOf(vAuto) }));
    ok("1.415 · 358 · a REMOVED account gets NO row at all — not a row of dead buttons, which is what a read-only page would otherwise be",
      j(actsOf(vGone)) === j([]) && vGone.removed === true, j(actsOf(vGone)));
    ok("1.415 · 415 · Remove is the ONE act that wears claret and the one that arms on a typed word; everything else is primary and takes no word",
      ((vLive.acts ?? []) as Any[]).every((a: Any) => (a.act === "REMOVE") === (a.tone === "claret"))
        && ((vLive.acts ?? []) as Any[]).every((a: Any) => (a.act === "REMOVE") === (a.word !== null))
        && ((vPaused.acts ?? []) as Any[]).find((a: Any) => a.act === "REVERIFY")?.passwordLabel !== null,
      j(((vLive.acts ?? []) as Any[]).map((a: Any) => [a.act, a.tone, a.word])));

    /* ⛔ 432(j) ON THIS PAGE — THE STATE WITH NO REASON BESIDE IT, WHICH STEP 4a MEASURED AND LEFT OPEN. */
    ok("1.415 · 432(j) · an AUTO-PAUSED account whose cause has since cleared carries an honest sentence, and it can be Started right now — a claret chip with nothing under it reads as a broken page",
      typeof vAuto.statusNote === "string" && vAuto.statusNote.length > 20 && vAuto.wayOut === null
        && actsOf(vAuto).includes("START") && !NEUTRAL.test(vAuto.statusNote),
      j({ note: vAuto.statusNote, wayOut: vAuto.wayOut }));
    ok("1.415 · 432(j) · …and the two are NEVER both painted: a running account has neither, and a state with a LIVE cause carries the way out instead",
      vLive.statusNote === null && vLive.wayOut === null && vGone.statusNote === null
        && typeof vPaused.statusNote === "string",
      j({ live: [vLive.statusNote, vLive.wayOut], removed: vGone.statusNote, paused: vPaused.statusNote }));

    /* ── PAUSE, the act itself ── */
    const pausedOut = await callAct(OFFICER, { id: live.botId, act: "PAUSE" });
    const pausedRow: Any = await w.dal.houseBotStore.get(live.botId);
    ok("1.415 · ⭐ PAUSE STOPS A RUNNING ACCOUNT: PAUSED with the MANUAL reason, written by the officer — never the engine's AUTO_PAUSED, which carries a cause, no actor and a SYSTEM audit",
      pausedOut.ok === true && pausedOut.changed === true
        && pausedRow?.status === "PAUSED" && pausedRow?.pauseReason === "MANUAL",
      j({ ok: pausedOut.ok, changed: pausedOut.changed, status: pausedRow?.status, reason: pausedRow?.pauseReason }));
    const pausedTwice = await callAct(OFFICER, { id: live.botId, act: "PAUSE" });
    ok("1.415 · a second Pause changes NOTHING and says so — the write is conditional, so two officers produce one act, one event and one alert",
      pausedTwice.ok === true && pausedTwice.changed === false && typeof pausedTwice.note === "string",
      j(pausedTwice));
    ok("1.415 · 266 · what an act cancelled is reported as a COUNT or not at all — never an amount, here or anywhere on this section",
      [pausedOut, pausedTwice].every((r: Any) => r.note === null || (!/TZS/.test(String(r.note)) && !NEUTRAL.test(String(r.note)))),
      j({ a: pausedOut.note, b: pausedTwice.note }));

    /* ── REMOVE: the typed word and the reason are checked on the SERVER, and the act ends the targets with it ── */
    const noWord = await callAct(OFFICER, { id: paused.botId, act: "REMOVE", reason: "closing this account" });
    const noReason = await callAct(OFFICER, { id: paused.botId, act: "REMOVE", reason: "no", typed: GATEM.CONSOLE_REMOVE_WORD });
    ok("1.415 · 388 · Remove is refused by the SERVER without the typed word and without a reason of the required length — a ceremony verified only in a browser is one a crafted POST walks straight through",
      noWord.ok === false && noWord.field === "typed" && String(noWord.error).includes(GATEM.CONSOLE_REMOVE_WORD)
        && noReason.ok === false && noReason.field === "reason"
        && (await statusOf(paused.botId)) === "PAUSED",
      j({ noWord: noWord.error, noReason: noReason.error }));
    const removed = await callAct(OFFICER, { id: paused.botId, act: "REMOVE", reason: "closing this account", typed: GATEM.CONSOLE_REMOVE_WORD });
    const removedRow: Any = await w.dal.houseBotStore.get(paused.botId);
    ok("1.415 · ⭐ REMOVE takes the account off the desk, with the officer's id and free text on the row and the MANUAL cause recorded",
      removed.ok === true && removed.changed === true && removedRow?.status === "REMOVED"
        && removedRow?.removedById === OFFICER && removedRow?.removedCause === "MANUAL",
      j({ ok: removed.ok, status: removedRow?.status, by: removedRow?.removedById, cause: removedRow?.removedCause }));
    ok("1.415 · …and a second Remove changes nothing rather than refusing — an act that already happened is not an error",
      (await callAct(OFFICER, { id: paused.botId, act: "REMOVE", reason: "closing this account", typed: GATEM.CONSOLE_REMOVE_WORD })).changed === false, "");

    /* ── RE-VERIFY: the refusals are the console's own words. The happy path is the SERVICE's, proven on its own
       suite (`test:house-bot-designation`) with a real scrypt password; this world's holder hash is a fixture, so
       driving it here would measure the fixture rather than the product. ── */
    const wrongPw = await callAct(OFFICER, { id: autoPaused.botId, act: "REVERIFY", password: "not-their-password" });
    const noPw = await callAct(OFFICER, { id: autoPaused.botId, act: "REVERIFY", password: "" });
    const runningReverify = await callAct(OFFICER, { id: goneAcct.botId, act: "REVERIFY", password: "x" });
    ok("1.415 · 453 · every re-verify refusal is the CONSOLE's own sentence, names the field to fix, and carries no house word — the service's own copy says 'This bot was removed.' and 'the bot is running'",
      [wrongPw, noPw, runningReverify].every((r: Any) => r.ok === false && typeof r.error === "string" && r.error.length > 8 && !NEUTRAL.test(r.error))
        && noPw.field === "password" && wrongPw.error !== noPw.error,
      j({ wrong: wrongPw.error, empty: noPw.error, removed: runningReverify.error }));
    ok("1.415 · 453 · CONTROL · the shared sentences those replaced DO name the feature, so the case above is a comparison with something rather than with nothing",
      NEUTRAL.test(DESIG.VERIFY_COPY.removed) && NEUTRAL.test(DESIG.REVERIFY_COPY.running),
      j({ removed: DESIG.VERIFY_COPY.removed, running: DESIG.REVERIFY_COPY.running }));

    /* ══ CA-19 · A DOUBLE TAP OF **ONE PRESS** COSTS THE HOLDER ONE ATTEMPT, NOT TWO (2026-09-20) ═════════════
     * 🔴 WHAT IT COST. Re-verify spends the HOLDER'S sign-in attempts and the last two of three are kept for
     * them, so an officer effectively has one. `verifyHouseBotPassword` has always been able to refuse the copy
     * of a press — it claims `submit:<officer>:<id>` durably BEFORE the password is checked — the designate
     * wizard has carried a nonce since C7 step 6, the cancel control makes `submitId` REQUIRED, and
     * `CONSOLE_ACT_REFUSAL.DUPLICATE_SUBMIT` was already written for THIS row. Nothing sent this row an id.
     * The only guard was `if (pending) return` in the dialog, and `useTransition` does not set `pending` until
     * it has RE-RENDERED — so two taps inside one frame both walked past it and a mistyped password burned TWO
     * of the holder's three attempts.
     * ⛔ THE MEASUREMENT IS THE HOLDER'S COUNTER, NOT THE SENTENCE. A case that only read the refusal back would
     * pass on a build that refused the copy AFTER charging for it. The sentence is read out of the shipped
     * table rather than typed here, so the two cannot drift. */
    {
      const { hashPassword, randomId }: Any = await import("../../src/lib/server/crypto.ts");
      const DUP = /\n {2}DUPLICATE_SUBMIT: "([^"]+)",/.exec(decomment(read(GATE)))?.[1] ?? "";
      const attemptsOf = async (uid: string): Promise<number> => Number(((await w.db.user.findById(uid)) as Any)?.failedLoginCount ?? -1);
      /** A desk account whose holder has a REAL salted password — without one, eligibility answers NO_PASSWORD and
       *  `verifyHouseBotPassword` is never reached, so the counter this case measures could never move. */
      const reverifiable = async (): Promise<{ botId: string; userId: string }> => {
        const b = await w.bot();
        const salt = randomId(16);
        await w.setUserFields(b.userId, {
          passwordHash: await hashPassword("ca19-holder-password", salt), passwordSalt: salt,
          passwordSetAt: new Date().toISOString(), passwordSetVia: "SELF_CHANGE",
        });
        await w.dal.houseBotStore.setStatus(b.botId, { from: ["ACTIVE"], to: "PAUSED", pauseReason: "MANUAL", pausedFromStatus: null });
        return b;
      };
      const WRONG = "not-their-password";

      const one = await reverifiable();
      const beforeOne = await attemptsOf(one.userId);
      const press = `ca19-${STORE}-one-press`;
      const [tapA, tapB] = await Promise.all([
        callAct(OFFICER, { id: one.botId, act: "REVERIFY", password: WRONG, submitId: press }),
        callAct(OFFICER, { id: one.botId, act: "REVERIFY", password: WRONG, submitId: press }),
      ]);
      const afterOne = await attemptsOf(one.userId);
      const dupes = [tapA, tapB].filter((r: Any) => r.error === DUP);
      ok("1.CA19 · ⛔ a DOUBLE-TAPPED Confirm is ONE attempt against the holder's three — the copy is refused as already sent, and the holder's counter moves by 1",
        DUP.length > 8 && afterOne - beforeOne === 1 && dupes.length === 1
          && tapA.ok === false && tapB.ok === false,
        j({ dup: DUP, before: beforeOne, after: afterOne, a: tapA.error, b: tapB.error }));

      /* ⭐ POSITIVE CONTROL · THE REFUSAL MUST NOT HAVE EATEN THE FEATURE. Two DISTINCT presses are two real
       * attempts and both must still reach the password check — a build that refused every second call, or one
       * whose nonce outlived its own refusal, would pass the case above and BRICK the control. That exact
       * defect shipped on the designate wizard (C7 step 6) and is what 1.412 exists for. */
      const two = await reverifiable();
      const beforeTwo = await attemptsOf(two.userId);
      const [pressA, pressB] = await Promise.all([
        callAct(OFFICER, { id: two.botId, act: "REVERIFY", password: WRONG, submitId: `ca19-${STORE}-press-a` }),
        callAct(OFFICER, { id: two.botId, act: "REVERIFY", password: WRONG, submitId: `ca19-${STORE}-press-b` }),
      ]);
      const afterTwo = await attemptsOf(two.userId);
      ok("1.CA19 · ⭐ POSITIVE CONTROL · two DISTINCT presses are still two attempts, and NEITHER is refused as a duplicate",
        afterTwo - beforeTwo === 2 && ![pressA, pressB].some((r: Any) => r.error === DUP),
        j({ before: beforeTwo, after: afterTwo, a: pressA.error, b: pressB.error }));

      /* ⭐ POSITIVE CONTROL · AND THE FIELD IS OPTIONAL, which is what makes adding it safe. A caller that sends
       * no id is refused nothing: it keeps exactly the behaviour this row had before. ⛔ The empty string must
       * be read as ABSENT, not claimed — one caller sharing the empty key with the next would turn every second
       * re-verify on the platform into a permanent DUPLICATE_SUBMIT. */
      const none = await reverifiable();
      const beforeNone = await attemptsOf(none.userId);
      const bare1 = await callAct(OFFICER, { id: none.botId, act: "REVERIFY", password: WRONG });
      const bare2 = await callAct(OFFICER, { id: none.botId, act: "REVERIFY", password: WRONG, submitId: "" });
      const afterNone = await attemptsOf(none.userId);
      ok("1.CA19 · ⭐ POSITIVE CONTROL · a caller that sends NO id — or an empty one — is refused nothing: both reach the password check, as this row behaved before",
        afterNone - beforeNone === 2 && ![bare1, bare2].some((r: Any) => r.error === DUP),
        j({ before: beforeNone, after: afterNone, a: bare1.error, b: bare2.error }));

      /* ⛔ AND THE DIALOG MINTS AND SPENDS THE NONCE, which is the half no server case can see: a server that
       * honours `submitId` while the browser sends the same one forever is a control that answers
       * "already sent" to every press after the first. The twin of 1.412's source clause, on the act row. */
      ok("1.CA19 · …and the DIALOG mints a fresh nonce per press and spends it on either answer — never one derived from what was typed",
        (() => {
          const c = decomment(read(`${SECTION}/[id]/account-actions.tsx`));
          return /const newAttemptNonce = \(\): string =>/.test(c)
            && /if \(attempt\.current === ""\) attempt\.current = newAttemptNonce\(\);/.test(c)
            && /attempt\.current = "";/.test(c)
            && /submitId\b/.test(c)
            && !/submitId: `\$\{/.test(c);
        })(), "");
    }

    /* ── START: it is OFFERED on a stopped account even though its service may refuse it, and the refusal IS the
       workflow. ⛔ C10 · an account starts while the desk is OFF, and the officer is told so. ── */
    const freshStart = await w.bot({ caps: { freqMinGapSec: 20 } });
    await w.dal.houseBotStore.setStatus(freshStart.botId, { from: ["ACTIVE"], to: "PAUSED", pauseReason: "MANUAL", pausedFromStatus: null });
    /* ⚠️ THE FIXTURE'S HOLDER NEEDS A SALT, AND THE SERVICE IS RIGHT TO REFUSE WITHOUT ONE. The world writes a
     * placeholder hash and no salt, so the eligibility read answers NO_PASSWORD — "this account has no password …
     * it can't give or confirm permission" — which is the product being correct about a fixture, not a defect.
     * Measured by driving that read directly when the first form of this case went red. */
    await w.setUserFields(freshStart.userId, { passwordSalt: "case-salt-for-start" });
    /* ⚠️ AND REAL RULES, FOR THE SAME REASON. The world writes `{ schemaVersion: 1 }` — a stub that parses to
     * nothing — so Start answers RULES: "the saved rules can't be read … Open Rules, review them, save, then
     * start." Correct product behaviour on a stub, and a second thing the fixture owed rather than the service. */
    {
      const cur: Any = await w.dal.houseBotStore.get(freshStart.botId);
      const rules: Any = R.DEFAULT_RULES_V1({ stakeBounds: { minTzs: 1_000, maxTzs: 10_000_000 } });
      /* A product, an entry mode and a min gap at the floor — the three `rulesStartProblems` refuses a start
         without, measured by driving it directly. The default document chooses none of them. */
      rules.scope.products.polls = true;
      rules.scope.categories = ["macro"];
      rules.modes.polls = { counter: true, fill: true, opener: true };
      const saved = await w.dal.houseBotStore.saveRules(freshStart.botId, cur.rulesVersion, { rules });
      if (!saved.ok) throw new Error("the Start fixture could not save its rules");
    }
    const started = await callAct(OFFICER, { id: freshStart.botId, act: "START" });
    ok("1.415 · ⭐ C10 · START moves a stopped account, and when the desk's master switch is OFF the officer is TOLD so rather than left reading a green chip beside a switch that is off",
      /* ⛔ NO OR-ESCAPE HERE. An assertion that also accepts "it was already running" would pass on a fixture
         that never started, which is exactly what the first form of this case did before the fixture was
         given its salt, its rules and its min gap. */
      started.ok === true && started.changed === true && (await statusOf(freshStart.botId)) === "ACTIVE"
        && started.warn === true && typeof started.note === "string" && /switch/i.test(started.note) && !NEUTRAL.test(started.note),
      j({ ok: started.ok, error: started.error, changed: started.changed, note: started.note, warn: started.warn, status: await statusOf(freshStart.botId) }));
    const startRemoved = await callAct(OFFICER, { id: goneAcct.botId, act: "START" });
    ok("1.415 · 453 · a Start the service refuses answers in the CONSOLE's own words, never the service's",
      startRemoved.ok === false && typeof startRemoved.error === "string" && !NEUTRAL.test(startRemoved.error), j(startRemoved));

    /* ⛔ THE REFUSAL MAP COVERS EVERY CODE BOTH SERVICE UNIONS CAN ANSWER, over a population DERIVED from the
     * source unions — never a list typed here, because a code added later would then reach an owner's screen as
     * the shared sentence or as a bare identifier, and nothing would go red on the day it happened. */
    const desigSrc = decomment(read("src/lib/server/house-bot/designation.ts"));
    const codesOf = (re: RegExp): string[] => [...(re.exec(desigSrc)?.[1] ?? "").matchAll(/"([A-Z_]+)"/g)].map((m) => m[1]);
    const serviceCodes = [...new Set([
      ...codesOf(/export type VerifyRefusalCode\s*=([\s\S]*?);/),
      ...codesOf(/export type ReverifyResult\s*=([\s\S]*?)\n\s*\n/),
      ...codesOf(/export type StartResult\s*=([\s\S]*?)\n\s*\n/),
      ...["NOT_FOUND", "REMOVED", "SCHEMA", "UNREADABLE", "WRITE_FAILED"],
    ])];
    const gateSrc = read(GATE);
    const missing = serviceCodes.filter((c) => !new RegExp(`\\n  ${c}: "`).test(gateSrc));
    ok("1.415 · 453 · every refusal code the four services can answer has the console's OWN sentence, over a population DERIVED from their source unions rather than typed in this case",
      serviceCodes.length >= 18 && missing.length === 0, j({ codes: serviceCodes.length, missing }));
    ok("1.415 · 453 · CONTROL · the unions really were parsed — they name the codes this case drove — and an INVENTED code is reported missing, so the zero above is a measurement",
      serviceCodes.includes("WRONG_PASSWORD") && serviceCodes.includes("INELIGIBLE") && serviceCodes.includes("EMPTY")
        && !new RegExp(`\\n  NOT_A_REAL_CODE: "`).test(gateSrc),
      j(serviceCodes.slice(0, 6)));

    /* ⛔ THE ARMING PREDICATE IS PURE AND EXPORTED, so every branch is measured directly — `Modal` returns null
     * until it is mounted, so a static render of a dialog is NOT MEASURED by construction (415). */
    const removeCopy = ((vLive.acts ?? []) as Any[]).find((a: Any) => a.act === "REMOVE");
    const pauseCopy = ((vLive.acts ?? []) as Any[]).find((a: Any) => a.act === "PAUSE");
    const pwCopy = ((vPaused.acts ?? []) as Any[]).find((a: Any) => a.act === "REVERIFY");
    ok("1.415 · the confirm arms only when every field the act ASKS FOR is filled — and a field it does not ask for is never a reason to refuse",
      (() => {
        try {
          const full = { reason: "closing this account", password: "pw", typed: GATEM.CONSOLE_REMOVE_WORD };
          return deskActArmed(pauseCopy, { reason: "", password: "", typed: "" }) === true
            && deskActArmed(removeCopy, full) === true
            && deskActArmed(removeCopy, { ...full, typed: "remove" }) === false
            && deskActArmed(removeCopy, { ...full, reason: "no" }) === false
            && deskActArmed(pwCopy, { reason: "", password: "pw", typed: "" }) === true
            && deskActArmed(pwCopy, { reason: "", password: "", typed: "" }) === false;
        } catch { return false; }
      })(), "");

    /* ⛔ 453 · EVERY WORD OF EVERY DIALOG, over all four acts. */
    const actStrings = [...((vLive.acts ?? []) as Any[]), ...((vPaused.acts ?? []) as Any[])]
      .flatMap((a: Any) => Object.values(a))
      .filter((s: unknown): s is string => typeof s === "string");
    ok("1.415 · 453 · not one word of any act's dialog names the feature, and the scan had all four acts' whole copy in it",
      actStrings.length >= 44 && actStrings.every((s: string) => !NEUTRAL.test(s)) && houseHits(actStrings.join(" ")).length === 0,
      j({ scanned: actStrings.length, hits: actStrings.filter((s: string) => NEUTRAL.test(s)) }));

    /* ⛔ 300/380 · A VIEWER OUTSIDE THE AUDIENCE IS REFUSED BEFORE ANYTHING IS READ OR WRITTEN. */
    const playerAct = await callAct(await w.user({ role: "PLAYER" }), { id: autoPaused.botId, act: "PAUSE" });
    ok("1.415 · 300 · a signed-in PLAYER's act is refused, the account does not move, and the refusal names no state and no figure",
      playerAct.ok === false && typeof playerAct.error === "string" && playerAct.error.length > 8
        && !/\d/.test(playerAct.error) && !NEUTRAL.test(playerAct.error)
        && (await statusOf(autoPaused.botId)) === "AUTO_PAUSED",
      j(playerAct));
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

    /* ━━ ⛔ THE TARGETS GRID PAGES, AND ITS TOTAL IS A COUNT AND NOT A PAGE LENGTH (C7 step 4c) ━━━━━━━━━━━━━━
     * `test:grid-paging` 2.2 caught this route rendering a limit-20 read whole with no pager — the defect that
     * suite exists for, and one the file could not have had on `origin/main` because the file did not exist there.
     * ⛔ THE STANDING TEST, APPLIED: would this still pass if the pager were absent? No. `targetsTotal` must be
     * the WHOLE set (22) while the page holds 20; a total read off `targets.length` answers 20, the control's
     * last page becomes its first, and the case below goes red. The same for `targetsActive`, which used to be
     * counted over the page's own rows and therefore changed as an officer paged.
     */
    {
      const paged = await w.bot({});
      const mk = (n: number): string => `mkt_pager_${String(n).padStart(2, "0")}`;
      for (let n = 1; n <= 22; n++) {
        await w.dal.targetStore.insert({
          id: `hbt_pager_${String(n).padStart(2, "0")}`, houseBotId: paged.botId, marketId: mk(n),
          delayMinSec: 10, delayMaxSec: 20, timingFrom: "STAKE", reactTo: "FIRST", createdById: OFFICER,
          snapshot: { titleEn: `Poll ${n}`, category: "sports", cutoff: "2026-12-31T00:00:00.000Z", rawYes: 0, rawNo: 0 },
        } as Any);
      }
      /* ⛔ THE DOOR IS DRIVEN WITH THE ADDRESS ITSELF, NOT WITH A PRE-PARSED NUMBER (C7 step 5). Its fourth argument
         became the REQUEST's own query string when the two panels landed — so these calls now exercise the
         validation too, which a hand-parsed `2` walked straight past. The arity is unchanged at four. */
      const p1 = await GATEM.houseDetailForConsole(OFFICER, "/admin/desk", paged.botId, { tab: "targets", tpage: "1" });
      const p2 = await GATEM.houseDetailForConsole(OFFICER, "/admin/desk", paged.botId, { tab: "targets", tpage: "2" });
      const ids = (x: Any): string[] => (x.targets ?? []).map((t: Any) => t.id);
      ok("1.grid22 · the Targets grid serves ONE page of 20 and says how many there are in all — the total is a COUNTING read, never the page's own length",
        p1.targets.length === 20 && p1.targetsTotal === 22 && p1.targetsPage === 1 && p1.targetsPerPage === 20
          && p1.targetsTotal !== p1.targets.length,
        j({ rows: p1.targets.length, total: p1.targetsTotal, page: p1.targetsPage, per: p1.targetsPerPage }));
      ok("1.grid22 · page 2 is a DIFFERENT set of rows, and the two pages together are the whole set with nothing repeated and nothing lost",
        p2.targets.length === 2 && p2.targetsPage === 2
          && new Set([...ids(p1), ...ids(p2)]).size === 22
          && ids(p1).every((id: string) => !ids(p2).includes(id)),
        j({ p2: p2.targets.length, union: new Set([...ids(p1), ...ids(p2)]).size }));
      /* ⛔ THE TAB COUNT IS THE WHOLE SET, NOT THE PAGE. It was `targetRows.filter(ACTIVE).length` over one page,
         so the badge read 20 on page 1 and 2 on page 2 for the same account — a figure with no basis. */
      ok("1.grid22 · the tab count is the account's own ACTIVE total and does not change as the officer pages",
        p1.targetsActive === 22 && p2.targetsActive === 22 && p1.targetsActive === p2.targetsActive,
        j({ p1: p1.targetsActive, p2: p2.targetsActive }));
      /* ⛔ A HAND-TYPED PAGE PAST THE END IS SERVED AS THE LAST PAGE, never as an empty grid under a pager
         pointing somewhere else — and a page number that is not a page at all reads as page 1. */
      const over = await GATEM.houseDetailForConsole(OFFICER, "/admin/desk", paged.botId, { tab: "targets", tpage: "99" });
      const junk = await GATEM.houseDetailForConsole(OFFICER, "/admin/desk", paged.botId, { tab: "targets", tpage: "x" });
      ok("1.grid22 · `?tpage=99` is served as the LAST page with its rows, and a page number that is not one reads as page 1",
        over.targetsPage === 2 && j(ids(over)) === j(ids(p2)) && junk.targetsPage === 1 && j(ids(junk)) === j(ids(p1)),
        j({ over: over.targetsPage, overRows: over.targets.length, junk: junk.targetsPage }));
    }
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
    /* ⭐ SIX BECAME EIGHT AT C7 STEP 5, AND THE RULE IS UNCHANGED: every card of this page is guarded by `removed`
       from the INSIDE. The two new panels are two more guards — the activity panel and the history panel — and the
       number is an EQUALITY, not a floor, so a panel that ships without its guard is still red. Re-derived from a
       run of this suite on both stores, never carried over from the last one. */
    ok("1.435 · 358 · every card of the account page is guarded by `removed` — the rail, the usage card, the floor sentence, the last placement and all four other panels",
      /* ⚠️ THE SOURCE IS DECOMMENTED, so a pin may not reach for a comment as its landmark — measured on the
         first run of this very assertion, which looked for the `312` note above the rail and found nothing. */
      guards === 8 && /\{!view\.removed && \(\s*<Tabs/.test(detail)
        && /\{view\.removed && \(\s*<SavedRulesCard rows=\{rulesRows\} reason=\{view\.rulesReason\} captions=\{false\} \/>/.test(detail),
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
      /* ⛔ THREE SINCE THE C7 STEP 7 REVIEW, NOT FOUR, AND THE DROP IS THE FIX: the saved-rules card was two
         copies of one list and is now one component used by both states (review visual-8), so its failure
         treatment is written once. The read behind it IS taken on a removed account — the rules are parsed to
         be shown as a record — so this one is reachable and correct; what 355 refuses is a failure treatment
         for a read a removed account never takes. */
      (detail.match(/<AdminLoadError/g) ?? []).length === 5 /* ⭐ FIVE SINCE C7 STEP 5: the activity panel and the
           history panel each own one, each INSIDE its own `!view.removed` guard — a removed account takes neither
           list read, and a read that was never taken has not failed. Still an EQUALITY; re-derived from this run. */
        && detail.indexOf('{view.removed && (') < detail.indexOf('{tab === "overview"'),
      j({ loadErrors: (detail.match(/<AdminLoadError/g) ?? []).length }));
  }

  /* ════════════════════════════════════════════════════════════════════════════════════════════════════════════
   * §2e2 · C7 STEP 5 — THE ACCOUNT PAGE'S TWO PANELS (rulings 312, 317, 344, 345, 355, 369, 410, 411, 453)
   *
   * ⛔ WHY THE ACCOUNT HALF LANDED FIRST, MEASURED. `scripts/lib/house-bot-comms-cases.mts` case 7.2d asserts
   * `!consoleTabExists("activity") && !consoleTabExists("history")` AND `deadTabs.length >= 1`. A run of that
   * suite prints ELEVEN `?tab=` hrefs — ten DETAIL links and exactly one LANDING link (the hour summary's) — so a
   * landing-panels-first build reds 7.2d on arrival while this one leaves that single landing link dead and 7.2d
   * measuring it. The debt list beside that case is keyed per SHAPE for the same reason.
   * ════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
  section("§2e2 · the account page's activity and history panels");

  /* ── 1.312 · THE DETAIL RAIL'S CLOSED LIST, BOTH DIRECTIONS ───────────────────────────────────────────────── */
  {
    const detailRaw = read(DETAIL_PAGE);
    const detail = decomment(detailRaw);
    const panelKeys = [...new Set([...detail.matchAll(/\{tab === "([a-z-]+)" && \(<>/g)].map((m) => m[1]))];
    ok("1.312 · the account page's rail is FIVE keys in rail order — overview · activity · rules · targets · history — and nothing else",
      all([...CR.CONSOLE_DETAIL_TABS]) === all(["overview", "activity", "rules", "targets", "history"])
        && CR.DEFAULT_DETAIL_TAB === "overview", j([...CR.CONSOLE_DETAIL_TABS]));
    /* ⛔ BOTH DIRECTIONS, AND IN ORDER. A panel for every key is ruling 312's dead control; a key for every panel
       is the other half — a panel nothing can reach is dead code that reads as a feature in a diff. */
    ok("1.312 · a panel for every key AND a key for every panel, in the SAME order — read off the page as TEXT, which is how the served probe reads it too",
      all(panelKeys) === all([...CR.CONSOLE_DETAIL_TABS]), j({ panelKeys, tabs: [...CR.CONSOLE_DETAIL_TABS] }));
    ok("1.312 · CONTROL · the both-ways comparison really fires — a key with no panel and a panel with no key are each reported, and the shipped page is not",
      all([...CR.CONSOLE_DETAIL_TABS, "money"]) !== all(panelKeys)
        && all([...panelKeys, "money"]) !== all([...CR.CONSOLE_DETAIL_TABS])
        && all(panelKeys) === all([...CR.CONSOLE_DETAIL_TABS]), "");
    /* ⭐ 302's POSITIVE HALF, WHICH ONLY EXISTS ONCE A PANEL DOES: the two new keys now resolve to THEMSELVES. */
    ok("1.302 · `?tab=activity` and `?tab=history` resolve to themselves now that their panels exist — the fallback is for values with no panel, not for these",
      CR.consoleDetailTab("activity") === "activity" && CR.consoleDetailTab("history") === "history"
        && CR.consoleDetailTabExists("activity") && CR.consoleDetailTabExists("history"), "");
    ok("1.302 · …and every value with no panel still resolves to the default — absent, empty, misspelled, a repeated parameter and a struck key alike, never a 404 and never a redirect",
      [undefined, "", "Activity", "money", "hist0ry"].every((v) => CR.consoleDetailTab(v as Any) === "overview")
        && CR.consoleDetailTab(["activity", "history"] as Any) === "overview", "");
    /* ⛔ RULING 312's OWN PROOF CLAUSE, WHICH GREP SHOWS HAS NEVER BEEN ASSERTED ANYWHERE: the design gate holds
       the PAGE and not a tab of it. A `?tab=` entry there would make the gate photograph one panel and call it the
       route, and the next panel would ship unphotographed with a green gate. */
    {
      const gateRoutes = read("scripts/design-gate/routes.mjs");
      const deskEntries = [...gateRoutes.matchAll(/"(\/admin\/desk[^"]*)"/g)].map((m) => m[1]);
      ok("1.312 · 329 · the design gate holds the console's PAGES and no `?tab=` of them — ruling 312's own Proof clause, asserted here for the first time",
        deskEntries.length >= 2 && deskEntries.includes(CR.CONSOLE_ROUTE) && deskEntries.includes(CR.CONSOLE_NEW_ROUTE)
          && deskEntries.every((r) => !r.includes("?")), j(deskEntries));
      ok("1.312 · 329 · CONTROL · the scan really reads that file and would see a query entry — planted, it is reported; the shipped list is not",
        [...`${gateRoutes}\n  "/admin/desk?tab=activity",`.matchAll(/"(\/admin\/desk[^"]*)"/g)].some((m) => m[1].includes("?"))
          && deskEntries.every((r) => !r.includes("?")), "");
    }
    /* ── 1.405 · THE DETAIL RAIL'S LABELS, READ FROM THE PAGE'S OWN TABLE ──────────────────────────────────── */
    const tabTable = detail.slice(detail.indexOf("const TAB_LABEL"), detail.indexOf("};", detail.indexOf("const TAB_LABEL")));
    const parsedLabels = [...tabTable.matchAll(/(\w+):\s*"([^"]*)"/g)].map((m) => [m[1], m[2]] as const);
    const sentenceCase = (k: string) => `${k[0].toUpperCase()}${k.slice(1)}`;
    ok("1.405 · the account rail's labels are the PAGE's own `TAB_LABEL`, one per key of the closed list, each the key in English sentence case",
      parsedLabels.length === CR.CONSOLE_DETAIL_TABS.length
        && all(parsedLabels.map(([k]) => k)) === all([...CR.CONSOLE_DETAIL_TABS])
        && parsedLabels.every(([k, v]) => v === sentenceCase(k))
        && /TAB_LABEL: Record<\(typeof CONSOLE_DETAIL_TABS\)\[number\], string>/.test(detail)
        && /labelEn: TAB_LABEL\[k\]/.test(detail), j(parsedLabels));
    ok("1.405 · CONTROL · the parse really read the page's table, and a label that is NOT the key in sentence case is reported",
      parsedLabels.length === 5 && parsedLabels.every(([, v]) => v.length >= 4)
        && !([["activity", "Feed"]] as Array<readonly [string, string]>).every(([k, v]) => v === sentenceCase(k))
        && ([["activity", "Activity"]] as Array<readonly [string, string]>).every(([k, v]) => v === sentenceCase(k)),
      j(parsedLabels.length));
    /* ⛔ AND NO DOCBLOCK MAY QUOTE THE PANEL IDIOM (433(e)): the served probe reads the RAW file, so a comment
       spelling `tab === "…"` invents a tab key no panel answers and the probe then requests a page nobody built. */
    const rawKeys = [...new Set([...detailRaw.matchAll(/tab === "([a-z-]+)"/g)].map((m) => m[1]))];
    ok("1.315 · the RAW account page still yields exactly the closed list after two panels were added — no comment on either invents a key",
      all(rawKeys) === all([...CR.CONSOLE_DETAIL_TABS]), j(rawKeys));
  }

  /* ── 1.317 · THE EVENT WORD MAP IS TOTAL, NEUTRAL, AND HAS NO RAW-ENUM ESCAPE ─────────────────────────────── */
  {
    const K = (await import("../../src/lib/house-bot/constants.ts")) as Any;
    const WORD = GATEM.CONSOLE_EVENT_WORD as Record<string, string>;
    const kinds = [...K.EVENT_KINDS] as string[];
    ok("1.317 · the console's event word map is TOTAL over `EVENT_KINDS` — every kind has a word and no word names a kind that does not exist, compared member for member",
      all(Object.keys(WORD).sort()) === all([...kinds].sort()) && kinds.length >= 30,
      j({ kinds: kinds.length, words: Object.keys(WORD).length }));
    /* 🔴 AND THE COMPARISON READS THE WHOLE SERIALISATION, WHICH THIS SUITE'S OWN DISPLAY HELPER DOES NOT.
     * `j` is `JSON.stringify(v)?.slice(0, 260)` — a helper for the line an assertion PRINTS — and the file says so
     * two screens up: `all` is "the WHOLE serialisation, the only form an assertion may scan". Written with `j`,
     * this comparison was TRUE with a kind renamed, because thirty keys serialise to roughly 600 characters and
     * the rename sits well past the cut. MEASURED, not reasoned about: the declared mutation `317-word-hole` put
     * that exact defect back and the suite stayed GREEN — the red harness found the hole in the guard, which is
     * the entire reason a guard is driven instead of read. The control below keeps the finding.
     */
    ok("1.317 · CONTROL · the totality comparison reads the WHOLE key set — a kind renamed 600 characters in is reported, and the suite's 260-character DISPLAY helper would have hidden exactly that",
      (() => {
        const renamed = Object.keys(WORD).map((k) => (k === "SUNSET" ? "SUNSET_DISABLED" : k)).sort();
        const kindsSorted = [...kinds].sort();
        return all(renamed) !== all(kindsSorted) && j(renamed) === j(kindsSorted)
          && all(kindsSorted) === all([...kinds].sort());
      })(), "");
    ok("1.317 · 453 · not one of its words carries a house-vocabulary word, or the words this section additionally may not render",
      Object.values(WORD).every((v) => !NEUTRAL.test(v) && houseHits(v).length === 0),
      j(Object.entries(WORD).filter(([, v]) => NEUTRAL.test(v))));
    /* ⛔ AND THIS IS WHY TOTALITY IS THE GUARD RATHER THAN A SCAN. `CONSOLE_EXTRA_WORDS` opens with a `\bbots?\b`
       word-boundary pattern and an UNDERSCORE IS A WORD CHARACTER — so there is no boundary before `BOT` in
       `HOLDER_AGAINST_BOT` and the lexicon cannot see that kind at all. A `WORD[kind] ?? kind` fallback would have
       painted the feature's own name with NOTHING reporting it: not this scan, not 4.453, not the bundle scan. */
    ok("1.317 · ⛔ MEASURED · the lexicon is BLIND to `HOLDER_AGAINST_BOT` — an underscore is a word character, so `\\bbots?\\b` has no boundary before BOT — which is exactly why the map is TOTAL and tsc-enforced instead of scanned",
      kinds.includes("HOLDER_AGAINST_BOT")
        && !NEUTRAL.test("HOLDER_AGAINST_BOT") && houseHits("HOLDER_AGAINST_BOT").length === 0
        && NEUTRAL.test("HOLDER AGAINST BOT"),
      j({ blind: !NEUTRAL.test("HOLDER_AGAINST_BOT"), spaced: NEUTRAL.test("HOLDER AGAINST BOT") }));
    ok("1.317 · CONTROL · the same scan DOES fire on a word that names the feature, so the zero above is a measurement and not an empty walk",
      NEUTRAL.test("The holder staked against this bot") && Object.values(WORD).length >= 30, "");
    /* ⛔ AND NO RAW-ENUM ESCAPE EXISTS BESIDE IT — not in the gate module, not in either panel. */
    const gateSrcNow = decomment(read(GATE));
    ok("1.317 · 453 · no raw-enum fallback survives anywhere the two panels are built — no `?? kind`, no `?? e.kind`, and no `?? code`",
      !/\?\?\s*(?:e\.)?kind\b/.test(gateSrcNow) && !/\?\?\s*code\b/.test(gateSrcNow)
        && !/\?\?\s*(?:r\.)?(?:kind|reasonCode|status)\b/.test(decomment(read(DETAIL_PAGE))),
      "");
    ok("1.317 · CONTROL · that scan really fires on the fallback it forbids",
      /\?\?\s*(?:e\.)?kind\b/.test("eventWord: STAFF_EVENT_WORD[e.kind] ?? e.kind,"), "");
    /* ⛔ AND THE SHARED TABLE IS NOT THE CONSOLE'S: `feed-copy.ts` is `Partial` and one of its own words is a
       needle of the shared vocabulary, so a console that reached for it would paint the feature behind the gate. */
    const FC = (await import("../../src/lib/house-bot/feed-copy.ts")) as Any;
    const staffWords = Object.values(FC.STAFF_EVENT_WORD ?? {}) as string[];
    ok("1.317 · 370(c) · the ENGINE's own event words are NOT the console's — that table is partial and at least one of its words is a needle of the shared vocabulary, and no file under the section imports it",
      staffWords.length > 0 && staffWords.length < kinds.length
        && staffWords.some((s) => NEUTRAL.test(s))
        && sectionFiles.every((f) => !decomment(read(f)).includes("feed-copy")),
      j({ partial: staffWords.length, kinds: kinds.length, needles: staffWords.filter((s) => NEUTRAL.test(s)) }));
  }

  /* ── THE PANELS, DRIVEN (both stores) ─────────────────────────────────────────────────────────────────────── */
  {
    const KC = (await import("../../src/lib/house-bot/constants.ts")) as Any;
    const K_INTENT_KINDS = KC.INTENT_KINDS as readonly string[];
    const K_INTENT_STATUSES = KC.INTENT_STATUSES as readonly string[];
    const panels = await w.bot({});
    const other = await w.bot({});
    /* 41 stakes on 41 distinct markets — `anchorKey` for a FILL row IS the market, so distinct markets is what
       makes a set this size insertable at all. The instants are separated on purpose: rows that share a
       millisecond are a fixture artefact, and a pager is about a real order. */
    const feedIds: string[] = [];
    const KINDS = ["COUNTER", "FILL", "OPENER", "MANUAL"] as const;
    const STATUSES = ["PENDING", "PLACED", "SKIPPED", "FAILED", "CANCELLED"] as const;
    for (let n = 1; n <= 41; n++) {
      const id = `hbi_panel_${String(n).padStart(2, "0")}`;
      const kind = KINDS[n % 4];
      const status = STATUSES[n % 5];
      const manual = kind === "MANUAL";
      const counter = kind === "COUNTER";
      /* Every row satisfies the table's own CHECKs, so the fixture is the shape production really stores:
         a COUNTER is anchored on its trigger position, a MANUAL on a submit id and always on a poll, and a
         PLACED row holds the position it placed. */
      const submitId = `00000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
      await w.dal.houseBotIntentStore.insert({
        id, houseBotId: panels.botId, botUserId: panels.userId, kind,
        anchorKey: counter ? `pos_panel_${n}` : manual ? `manual:${OFFICER}:${submitId}` : `mkt_panel_${n}`,
        marketId: `mkt_panel_${n}`, productLine: !manual && n % 3 === 0 ? "UPDOWN" : "MARKET",
        triggerPositionId: counter ? `pos_panel_${n}` : null,
        triggerUserId: counter ? "usr_panel_trigger_player" : null,
        targetId: null, requestedById: manual ? OFFICER : null,
        entryCondition: manual ? "THIN" : null, side: "YES", stakeTzs: 1_000 + n,
        dueAt: w.iso(-1_000), deadlineAt: w.iso(3_600_000), staleAt: w.iso(600_000),
        status, reasonCode: status === "SKIPPED" ? "CAP_PER_HOUR" : status === "FAILED" ? "INTERNAL" : null,
        why: "Counter · a sentence the console must never paint · TZS 9,999",
        decision: { snapshot: "blob" }, attempts: 0, transientAttempts: 0, nextAttemptAt: null,
        claimedBy: null, claimedUntil: null,
        positionId: status === "PLACED" ? `pos_placed_panel_${n}` : null,
        finishedAt: null, alertedAt: null,
      } as Any);
      feedIds.push(id);
      await new Promise((r) => setTimeout(r, 2));
    }
    /* One stake on the OTHER account, so every count below is shown to be scoped and not a whole-table count. */
    await w.dal.houseBotIntentStore.insert({
      id: "hbi_panel_other", houseBotId: other.botId, botUserId: other.userId, kind: "FILL",
      anchorKey: "mkt_panel_other", marketId: "mkt_panel_other", productLine: "MARKET",
      triggerPositionId: null, triggerUserId: null, targetId: null, requestedById: null, entryCondition: null,
      side: "NO", stakeTzs: 7_000, dueAt: w.iso(-1_000), deadlineAt: w.iso(3_600_000), staleAt: w.iso(600_000),
      status: "PLACED", reasonCode: null, why: null, decision: {}, attempts: 0, transientAttempts: 0,
      nextAttemptAt: null, claimedBy: null, claimedUntil: null, positionId: "pos_placed_panel_other",
      finishedAt: null, alertedAt: null,
    } as Any);

    const feedView = (qq: Record<string, unknown> = {}) =>
      GATEM.houseDetailForConsole(OFFICER, "/admin/desk", panels.botId, { tab: "activity", ...qq });

    const p1 = await feedView();
    const p2 = await feedView({ page: "2" });
    const p3 = await feedView({ page: "3" });
    const ids = (v: Any): string[] => (v.feed ?? []).map((r: Any) => `${r.whenTitle}|${r.stake}`);

    /* ⛔ 344 · THE TOTAL IS A COUNTING READ AND NEVER THE PAGE'S OWN LENGTH. */
    ok("1.344 · the activity panel serves ONE page of 20 and says how many there are in all — the total is a COUNTING read, never the page's own length",
      p1.feed.length === 20 && p1.feedTotal === 41 && p1.feedPage === 1 && p1.feedPerPage === 20
        && p1.feedTotal !== p1.feed.length, j({ rows: p1.feed.length, total: p1.feedTotal, page: p1.feedPage }));
    ok("1.344 · …and the total does not move as the officer pages, because it is not read off the page",
      p2.feedTotal === 41 && p3.feedTotal === 41 && p2.feed.length === 20 && p3.feed.length === 1,
      j({ p2: p2.feed.length, p3: p3.feed.length, totals: [p1.feedTotal, p2.feedTotal, p3.feedTotal] }));
    ok("1.344 · the three pages together are the whole set with nothing repeated and nothing lost",
      new Set([...ids(p1), ...ids(p2), ...ids(p3)]).size === 41
        && ids(p1).every((x) => !ids(p2).includes(x)) && ids(p2).every((x) => !ids(p3).includes(x)),
      j({ union: new Set([...ids(p1), ...ids(p2), ...ids(p3)]).size }));
    /* ⛔ AND THE COUNT IS THIS ACCOUNT'S, not the table's: the other account's stake is in neither. */
    ok("1.344 · the total and the rows are scoped to THIS account — the second account's stake is in neither, so the count is a scoped count and not a table count",
      p1.feedTotal === 41 && !ids(p1).concat(ids(p2), ids(p3)).some((x) => x.endsWith(`|${formatTzs(7_000)}`)),
      j({ total: p1.feedTotal }));
    /* ⛔ A HAND-TYPED PAGE PAST THE END IS SERVED AS THE LAST PAGE — the idiom this section already ships. */
    const over = await feedView({ page: "99" });
    const junk = await feedView({ page: "x" });
    ok("1.411 · `?page=99` is served as the LAST page with its rows, and a page number that is not one reads as page 1 AND is reported as a refusal",
      over.feedPage === 3 && over.feed.length === 1 && junk.feedPage === 1 && junk.feed.length === 20
        && typeof junk.queryRefusal === "string" && junk.queryRefusal.includes("page"),
      j({ over: over.feedPage, junk: junk.feedPage, refusal: junk.queryRefusal }));

    /* ── 1.345 · THE ROWS AND THE TOTAL MOVE TOGETHER OVER EVERY FACET ───────────────────────────────────── */
    const agree = async (qq: Record<string, unknown>, want: number) => {
      const v = await feedView(qq);
      return { total: v.feedTotal, rows: v.feed.length, want, ok: v.feedTotal === want && v.feed.length === Math.min(want, 20) && v.queryRefusal === null };
    };
    const byKind = await agree({ kind: "manual" }, 10);
    /* ⚠️ `up-down`, NOT `updown`: a URL token is the option's own painted word slugged, never the enum lowercased
       — see the leak recorded at `consoleSlug`. The fixture asks for it the way an officer's browser would. */
    const byProduct = await agree({ product: "up-down" }, 9);
    const byOutcome = await agree({ outcome: "failed" }, 8);
    const byBoth = await agree({ kind: "manual", outcome: "failed" }, 2);
    ok("1.345 · the listing reader and the COUNTING reader are called with the same facets, so the rows and the total move together over each one — type, product, outcome, and two at once",
      [byKind, byProduct, byOutcome, byBoth].every((x) => x.ok),
      j({ byKind, byProduct, byOutcome, byBoth }));
    ok("1.345 · CONTROL · the facets really NARROW — each of the four answers fewer rows than the unfiltered 41, and the two-facet answer is narrower than either of its halves",
      byKind.total < 41 && byProduct.total < 41 && byOutcome.total < 41
        && byBoth.total < byKind.total && byBoth.total < byOutcome.total,
      j({ all: 41, byKind: byKind.total, byProduct: byProduct.total, byOutcome: byOutcome.total, byBoth: byBoth.total }));
    /* ⛔ SOURCE HALF · ONE FILTER OBJECT, spread into the page read and passed whole to the count — a hand-copied
       twin of the facet list is how a total comes to measure a different population from the rows above it. */
    const gateNow = decomment(read(GATE));
    ok("1.345 · SOURCE · there is ONE filter object: the count takes it whole and the page read spreads it with only the paging words added",
      /const feedFilter: IntentFeedCount = \{/.test(gateNow)
        && /houseBotIntentStore\.countFeed\(feedFilter\)/.test(gateNow)
        /* ⭐ FOUR SITES SINCE THE LANDING HALF: each panel reads its page ONCE and re-reads it ONCE when the
           address asked for a page past the end, and every one of the four spreads the SAME filter object with
           only the paging words added. ⛔ The count is an EQUALITY: a fifth read built from a hand-copied facet
           list is exactly the drift this case exists for. */
        && (gateNow.match(/listFeed\(\{ \.\.\.feedFilter, limit: CONSOLE_FEED_PER_PAGE, offset:/g) ?? []).length === 4
        /* ⛔ AND THE DESK-WIDE COUNT TAKES THE SAME OBJECT WHOLE, exactly as the account page's does. */
        && (gateNow.match(/countFeed\(feedFilter\)/g) ?? []).length === 2,
      j({ countCalls: (gateNow.match(/countFeed\(/g) ?? []).length }));

    /* ── 1.355 · A FAILED READ IS NEVER AN EMPTY STATE, AND EACH FAILURE IS ATTRIBUTED TO ITS OWN FIGURE ──── */
    const realList = w.dal.houseBotIntentStore.listFeed;
    const realCount = w.dal.houseBotIntentStore.countFeed;
    let listFailed: Any; let countFailed: Any;
    try {
      w.dal.houseBotIntentStore.listFeed = async () => { throw new Error("planted feed page failure"); };
      listFailed = await feedView();
    } finally { w.dal.houseBotIntentStore.listFeed = realList; }
    try {
      w.dal.houseBotIntentStore.countFeed = async () => { throw new Error("planted feed count failure"); };
      countFailed = await feedView();
    } finally { w.dal.houseBotIntentStore.countFeed = realCount; }
    ok("1.355 · a failed activity read is `feed === null` — the page's AdminLoadError — and NEVER an empty list, which says a different thing",
      listFailed.feed === null && Array.isArray(p1.feed), j({ failed: listFailed.feed, ok: Array.isArray(p1.feed) }));
    ok("1.355 · …and the failure is attributed to ITS figure: a failed PAGE read leaves the rest of the account page whole, and a failed COUNT leaves the rows",
      listFailed.label === p1.label && listFailed.usage !== null
        && countFailed.feedTotal === null && Array.isArray(countFailed.feed) && countFailed.feed.length === 20,
      j({ countRows: countFailed.feed?.length, countTotal: countFailed.feedTotal }));
    ok("1.355 · CONTROL · both planted failures RESOLVED — the reader settles its reads, so one rejection never propagates out of the door",
      listFailed !== null && listFailed.found === true && countFailed !== null && countFailed.found === true, "");

    /* ── EMPTY, AND THE TWO EMPTIES ARE DIFFERENT SENTENCES ──────────────────────────────────────────────── */
    const empty = await GATEM.houseDetailForConsole(OFFICER, "/admin/desk", other.botId, { tab: "activity", outcome: "expired" });
    const emptyBare = await w.bot({});
    const bare = await GATEM.houseDetailForConsole(OFFICER, "/admin/desk", emptyBare.botId, { tab: "activity" });
    ok("1.355 · an account with nothing to show answers an EMPTY LIST and its own empty state — never null, which is a failed read",
      Array.isArray(bare.feed) && bare.feed.length === 0 && bare.feedTotal === 0
        && bare.feedFiltered === false && bare.feedEmpty.title === "Nothing staked yet", j(bare.feedEmpty));
    ok("1.355 · 432(j) · a FILTER that matched nothing says so in different words, and offers the way back — an empty list and an empty filter are not the same state",
      empty.feed.length === 0 && empty.feedFiltered === true
        && empty.feedEmpty.title !== bare.feedEmpty.title
        && typeof empty.feedClearHref === "string" && !empty.feedClearHref.includes("outcome="),
      j({ filtered: empty.feedEmpty, bare: bare.feedEmpty, clear: empty.feedClearHref }));

    /* ── VALIDATION · EVERY AXIS CHECKED IN THE DOOR, EVERY REFUSAL NAMED ────────────────────────────────── */
    const smuggle = await feedView({ outcome: "'; DROP TABLE", kind: "<script>", product: "MARKET_OR_1=1" });
    ok("1.302 · a bypassed client smuggles NOTHING past the door: three crafted axes narrow nothing, and the answer is the unfiltered list",
      smuggle.feedTotal === 41 && smuggle.feed.length === 20 && smuggle.feedFiltered === false,
      j({ total: smuggle.feedTotal, filtered: smuggle.feedFiltered }));
    ok("1.302 · 432(j) · …and every refused axis is NAMED, by its own screen word, in one sentence — never a silent narrowing",
      typeof smuggle.queryRefusal === "string"
        && ["type", "product", "outcome"].every((axis) => smuggle.queryRefusal.includes(axis)),
      j(smuggle.queryRefusal));
    const repeated = await feedView({ outcome: ["failed", "placed"] });
    ok("1.302 · a REPEATED parameter is one value for nobody — it is refused and named, never resolved to whichever arrived first",
      repeated.feedTotal === 41 && repeated.feedFiltered === false
        && typeof repeated.queryRefusal === "string" && repeated.queryRefusal.includes("outcome"),
      j({ total: repeated.feedTotal, refusal: repeated.queryRefusal }));
    ok("1.302 · CONTROL · the SAME axes with real values are honoured and NOTHING is refused, so the refusals above are a measurement and not a door that refuses everything",
      byOutcome.ok && (await feedView({ outcome: "failed" })).queryRefusal === null, "");
    const badWindow = await feedView({ range: "3000y" });
    ok("1.302 · a window preset the rail does not offer is refused and named, and the panel stays on the window it was on",
      badWindow.feedTotal === 41 && typeof badWindow.queryRefusal === "string" && badWindow.queryRefusal.includes("window"),
      j({ refusal: badWindow.queryRefusal }));

    /* ── THE RAIL IS BUILT FROM THE SAME PARSE, SO THE CONTROL AND THE READ CANNOT DISAGREE ──────────────── */
    const railed = await feedView({ outcome: "failed" });
    const groups = railed.feedFilters as Any[];
    ok("1.410 · the rail is THREE axes, each an 'Any …' option plus one per member of its own closed list, with the live one marked",
      groups.length === 3 && all(groups.map((g) => g.param)) === all(["kind", "product", "outcome"])
        && groups[0].options.length === 1 + (K_INTENT_KINDS as string[]).length
        && groups[2].options.some((o: Any) => o.on === true && o.key === "failed")
        && groups[0].options.filter((o: Any) => o.on).length === 1,
      j(groups.map((g) => ({ param: g.param, options: g.options.length, on: g.options.filter((o: Any) => o.on).length }))));
    ok("1.411 · every rail link carries the tab and every OTHER live filter, and DROPS the page — a filter change that kept the page lands on one the narrowed list no longer has",
      groups.every((g) => g.options.every((o: Any) => o.href.includes("tab=activity") && !/[?&]page=/.test(o.href)))
        && groups[0].options.some((o: Any) => o.href.includes("outcome=failed")),
      j(groups[0].options.map((o: Any) => o.href).slice(0, 3)));
    /* 🔴 EVERY OPTION'S KEY AND EVERY LINK IT BUILDS, NOT ONLY ITS LABEL — AND THIS GUARD EXISTS BECAUSE THE
       FIRST BUILD OF THIS RAIL LEAKED. Read off a SERVED page on a scratch database, not reasoned about: with the
       token derived as `member.toLowerCase()`, `/admin/desk/<id>?tab=activity` came back carrying
       `href="…&kind=counter"` and `data-chip="kind:counter"` five times — a word 453 forbids, in served markup and
       in the address bar, where it lands in every screenshot of the screen. ⛔ AND EVERY SUITE WAS GREEN: 4.453
       scans source LITERALS and the token is computed at runtime; 3.453 scanned the painted LABELS and not the
       keys; `verify:house-bot-bundle` reads chunks and this is server markup. The rule is now inverted — a token
       may only be the option's OWN painted word, slugged — and this is the assertion that keeps it.
       ⚠️ Only the QUERY half of each href is scanned: the PATH necessarily carries the record id the viewer
       themselves asked for, which ruling 548 settled is not a disclosure and is not this rule's subject. */
    const railQuery = (href: string) => decodeURIComponent(href.split("?")[1] ?? "");
    ok("1.453 · every option KEY and every link the rail builds is neutral too — a token is the option's own painted word slugged, never the enum lowercased",
      groups.every((g) => g.options.every((o: Any) =>
        !NEUTRAL.test(o.key) && houseHits(o.key).length === 0
        && !NEUTRAL.test(railQuery(o.href)) && houseHits(railQuery(o.href)).length === 0)),
      j(groups.flatMap((g) => g.options.map((o: Any) => o.key)).filter((k: string) => NEUTRAL.test(k))));
    ok("1.453 · CONTROL · the token the first build shipped IS a hit and the token it ships now is not — so the zero above is a measurement and not a scan that stopped matching",
      NEUTRAL.test("counter") && NEUTRAL.test("kind=counter") && NEUTRAL.test("tab=activity&kind=counter")
        && !NEUTRAL.test("kind=responding") && !NEUTRAL.test("tab=activity&kind=responding"), "");
    ok("1.453 · …and each axis's tokens are DISTINCT, so two members can never slug to one address and silently filter for each other",
      groups.every((g) => new Set(g.options.map((o: Any) => o.key)).size === g.options.length),
      j(groups.map((g) => ({ param: g.param, keys: g.options.map((o: Any) => o.key) }))));
    /* ⛔ AND THE TOKEN THE RAIL PUBLISHES IS THE TOKEN THE DOOR READS — one table, read from both ends, so a
       control an officer clicks can never address a filter the server does not recognise. */
    ok("1.453 · the rail's token and the door's parse are ONE table — every option the rail publishes round-trips through the door and narrows the list it says it will",
      (await Promise.all(groups.flatMap((g) => g.options.filter((o: Any) => o.key !== "").map(async (o: Any) => {
        const v = await feedView({ [g.param]: o.key });
        return v.queryRefusal === null && v.feedFiltered === true;
      })))).every(Boolean),
      j(groups.flatMap((g) => g.options.map((o: Any) => `${g.param}=${o.key}`)).slice(0, 6)));
    ok("1.410 · 453 · not one option label, group label or empty-state sentence of either panel names the feature",
      groups.flatMap((g) => [g.label, ...g.options.map((o: Any) => o.label)])
        .concat([railed.feedEmpty.title, railed.feedEmpty.body, railed.feedOrderNote, railed.historyEmpty.title, railed.historyEmpty.body])
        .every((s: string) => !NEUTRAL.test(s) && houseHits(s).length === 0),
      j(groups.flatMap((g) => g.options.map((o: Any) => o.label)).filter((s: string) => NEUTRAL.test(s))));

    /* ── 1.453 / D20 · WHAT THE ROW MAY NOT CARRY ───────────────────────────────────────────────────────── */
    const painted = JSON.stringify(p1.feed);
    ok("1.453 · D20 · no feed row carries the engine's composed sentence, its decision blob or another player's id — and the fixture PLANTED all three, so this is a measurement",
      !painted.includes("a sentence the console must never paint") && !painted.includes("TZS 9,999")
        && !painted.includes("blob") && !painted.includes("usr_panel_trigger_player")
        && !NEUTRAL.test(painted),
      j(Object.keys(p1.feed[0] ?? {})));
    ok("1.453 · CONTROL · the planted sentence really IS a lexicon hit and really IS on the stored row, so its absence above is an omission that was checked",
      NEUTRAL.test("Counter · a sentence the console must never paint · TZS 9,999")
        && (await w.dal.houseBotIntentStore.get(feedIds[0]))!.why !== null, "");
    ok("1.453 · every painted feed field is a FINISHED string or a boolean — no id, no raw enum and no number crosses into the view model",
      p1.feed.every((r: Any) => all(Object.keys(r).sort()) === all(["anchored", "note", "productWord", "stake", "statusChip", "statusWord", "typeWord", "when", "whenTitle"])
        && typeof r.anchored === "boolean" && Object.entries(r).every(([k, v]) => k === "anchored" || typeof v === "string" || v === null)),
      j(Object.keys(p1.feed[0] ?? {}).sort()));
    ok("1.317 · every row's outcome word and type word come from the console's own TOTAL maps, and its note is the console's own sentence — never a raw enum",
      p1.feed.every((r: Any) => !(K_INTENT_STATUSES as string[]).includes(r.statusWord) && !(K_INTENT_KINDS as string[]).includes(r.typeWord))
        && p1.feed.some((r: Any) => typeof r.note === "string" && r.note.length > 10)
        && p1.feed.every((r: Any) => r.note === null || !/^[A-Z_]+$/.test(r.note)),
      j([...new Set(p1.feed.map((r: Any) => r.statusWord))]));

    /* ── THE BELL LANDS ON THE PAGE ITS OWN ROW IS ON ───────────────────────────────────────────────────── */
    const oldest = feedIds[0];
    const anchored = await feedView({ intent: oldest });
    ok("1.302 · a bell's `&intent=` resolves the row's page SERVER-SIDE and lands on it — page 3 of 41, with the row itself marked",
      anchored.feedPage === 3 && anchored.feed.some((r: Any) => r.anchored === true)
        && anchored.feed.filter((r: Any) => r.anchored).length === 1,
      j({ page: anchored.feedPage, marked: anchored.feed.filter((r: Any) => r.anchored).length }));
    ok("1.302 · CONTROL · the same panel WITHOUT the anchor is on page 1 and marks nothing, so the jump above came from the anchor",
      p1.feedPage === 1 && p1.feed.every((r: Any) => r.anchored === false), "");
    ok("1.302 · an explicit `?page=` WINS over the anchor — an officer who typed a page is not moved off it",
      (await feedView({ intent: oldest, page: "1" })).feedPage === 1, "");
    const foreign = await feedView({ intent: "hbi_panel_other" });
    const junkAnchor = await feedView({ intent: "../../etc/passwd" });
    ok("1.302 · an anchor naming ANOTHER account's row, and one that is not an id at all, both leave the panel where it was — and the malformed one is refused and named",
      foreign.feedPage === 1 && junkAnchor.feedPage === 1
        && typeof junkAnchor.queryRefusal === "string" && junkAnchor.queryRefusal.includes("link")
        && foreign.queryRefusal === null,
      j({ foreign: foreign.feedPage, junk: junkAnchor.feedPage, refusal: junkAnchor.queryRefusal }));

    /* ── THE HISTORY PANEL ──────────────────────────────────────────────────────────────────────────────── */
    const eventIds: string[] = [];
    const EV = ["STARTED", "PAUSED", "RULES_SAVED", "HOLDER_AGAINST_BOT", "OWNER_MONEY"] as const;
    /* ⛔ THE BASE IS READ, NEVER GUESSED: designating an account writes its own DESIGNATED event, so the total this
       panel answers is that row plus what this fixture adds. A number typed here would rot the day designation
       records one more thing. */
    const histBase = (await GATEM.houseDetailForConsole(OFFICER, "/admin/desk", panels.botId, { tab: "history" })).historyTotal as number;
    /* ⚠️ EVERY ROW GETS A DISTINCT PAINTED ACTOR, because the pager's disjointness has to be measured on what the
       panel PAINTS — and `whenTitle` is a second, which twenty-three rows two milliseconds apart share. One row is
       left actorless so the engine's own branch ("System") is painted too. */
    for (let n = 1; n <= 23; n++) {
      const kind = EV[n % 5];
      const e = await w.dal.houseBotEventStore.append({
        houseBotId: panels.botId, userId: null, marketId: null, kind,
        fromStatus: kind === "PAUSED" ? "ACTIVE" : null, toStatus: kind === "PAUSED" ? "PAUSED" : kind === "STARTED" ? "ACTIVE" : null,
        reason: "an officer's own words, which this panel does not paint",
        actorId: n === 7 ? null : `usr_panel_actor_${String(n).padStart(2, "0")}`,
        payload: kind === "OWNER_MONEY" ? { event: "DEPOSIT", amountTzs: 500_000, balanceTzs: 9_900_000, txnId: `txn_panel_${n}` } : null,
      } as Any);
      eventIds.push(e.id);
      await new Promise((r) => setTimeout(r, 2));
    }
    const histTotal = histBase + 23;
    /* One event on the OTHER account and one CONTROL-ROW event, so the scope below is measured twice over. */
    await w.dal.houseBotEventStore.append({ houseBotId: other.botId, userId: null, marketId: null, kind: "STARTED", fromStatus: null, toStatus: "ACTIVE", reason: null, actorId: OFFICER, payload: null } as Any);
    await w.dal.houseBotEventStore.append({ houseBotId: null, userId: null, marketId: null, kind: "SWITCH_ON", fromStatus: null, toStatus: null, reason: null, actorId: OFFICER, payload: null } as Any);

    const histView = (qq: Record<string, unknown> = {}) =>
      GATEM.houseDetailForConsole(OFFICER, "/admin/desk", panels.botId, { tab: "history", ...qq });
    const h1 = await histView();
    const h2 = await histView({ hpage: "2" });
    const hWho = (v: Any): string[] => (v.history ?? []).map((r: Any) => r.who);
    ok("1.317 · the history panel serves ONE page of 20 with a COUNTING total, and page 2 holds the rest",
      h1.history.length === 20 && h1.historyTotal === histTotal && h1.historyPage === 1 && h1.historyPerPage === 20
        && h2.history.length === histTotal - 20 && h2.historyTotal === histTotal && h1.historyTotal !== h1.history.length,
      j({ p1: h1.history.length, total: h1.historyTotal, p2: h2.history.length, base: histBase }));
    ok("1.317 · the two pages are the whole set with nothing repeated, and the panel is scoped to THIS account — the second account's event and the desk-wide SWITCH_ON are in neither",
      new Set([...hWho(h1), ...hWho(h2)]).size === histTotal
        && hWho(h1).every((x) => !hWho(h2).includes(x))
        && !h1.history.concat(h2.history).some((r: Any) => r.eventWord === GATEM.CONSOLE_EVENT_WORD.SWITCH_ON),
      j({ union: new Set([...hWho(h1), ...hWho(h2)]).size, total: histTotal }));
    ok("1.317 · every Event cell is the console's own word — the blind kind `HOLDER_AGAINST_BOT` included — and NOT one raw enum reaches a row",
      h1.history.concat(h2.history).some((r: Any) => r.eventWord === GATEM.CONSOLE_EVENT_WORD.HOLDER_AGAINST_BOT)
        && h1.history.concat(h2.history).every((r: Any) => !/^[A-Z_]+$/.test(r.eventWord) && !NEUTRAL.test(r.eventWord)),
      j([...new Set(h1.history.map((r: Any) => r.eventWord))]));
    /* ⛔ 266 / 369(c) / 456 · NO AMOUNT AND NO BALANCE — and the fixture PLANTED both on every money row. */
    const histPainted = JSON.stringify(h1.history.concat(h2.history));
    ok("1.369 · 266 · no history row carries an amount or the holder's wallet balance — the fixture planted 500,000 and 9,900,000 on every money event and neither reaches the view",
      !histPainted.includes("500,000") && !histPainted.includes("500000")
        && !histPainted.includes("9,900,000") && !histPainted.includes("9900000")
        && !histPainted.includes("amountTzs") && !histPainted.includes("balanceTzs"),
      j(Object.keys(h1.history[0] ?? {})));
    ok("1.369 · 456 · a money row carries a DOOR instead: the platform's own transactions screen, by transaction id",
      h1.history.concat(h2.history).some((r: Any) => typeof r.moneyHref === "string" && r.moneyHref.startsWith("/admin/transactions?q=txn_panel_"))
        && h1.history.concat(h2.history).filter((r: Any) => r.moneyHref !== null).every((r: Any) => !/\d{3},\d{3}/.test(r.moneyHref)),
      j(h1.history.find((r: Any) => r.moneyHref)?.moneyHref));
    ok("1.369 · SOURCE · no file under the section, and no line of the gate module, reads `payload.amountTzs` or `payload.balanceTzs`, and neither `?tab=money` nor `formatTzsSigned` survives anywhere under the section",
      sectionFiles.concat([GATE]).every((f) => {
        const s = decomment(read(f));
        return !/payload\.amountTzs|payload\.balanceTzs|\?tab=money|formatTzsSigned/.test(s);
      }), "");
    ok("1.369 · CONTROL · that scan fires on each of the four things it forbids",
      /payload\.amountTzs/.test("const a = e.payload.amountTzs;") && /payload\.balanceTzs/.test("e.payload.balanceTzs")
        && /\?tab=money/.test("/admin/desk/x?tab=money") && /formatTzsSigned/.test("formatTzsSigned(n)"), "");
    /* ⛔ THE OFFICER'S OWN WORDS ARE NOT PAINTED HERE. A reason is unbounded operator text and the audit trail is
       where it belongs; this panel answers who, what and when from TYPED fields only. */
    ok("1.453 · 474 · no history row paints the officer's free-text reason — the fixture wrote one on every event and the panel carries who, what and when from typed fields alone",
      !histPainted.includes("an officer's own words")
        && h1.history.every((r: Any) => all(Object.keys(r).sort()) === all(["anchored", "change", "eventWord", "moneyHref", "when", "whenTitle", "who"])),
      j(Object.keys(h1.history[0] ?? {}).sort()));
    ok("1.317 · the Change cell is the ONE status map's words, never a raw status, and an event that changed no status carries none",
      h1.history.concat(h2.history).some((r: Any) => r.change === "Active → Paused")
        && h1.history.concat(h2.history).every((r: Any) => r.change === null || !/[A-Z_]{4,}/.test(r.change)),
      j([...new Set(h1.history.concat(h2.history).map((r: Any) => r.change))]));
    /* ⛔ 420 · AN ACTOR IS AN ID, NEVER A NAME — the same rule the ON sentence one card up already follows. A
       name here would put a staff member's identity on a screen a record id is itself masked out of (548), and the
       console resolves no name for an actor at all. An event nobody pressed reads as the engine's own word. */
    const whoAll = h1.history.concat(h2.history).map((r: Any) => r.who as string);
    ok("1.420 · every actor cell is a raw account ID or the console's word for the engine — never a display name, and the reader resolves no name for one",
      whoAll.length > 0 && whoAll.every((x) => x === "System" || /^usr_[A-Za-z0-9_]+$/.test(x))
        && whoAll.includes("System")
        && !/displayName|firstName|fullName/.test(decomment(read(GATE))),
      j([...new Set(whoAll)].slice(0, 4)));
    ok("1.420 · CONTROL · the same scan rejects a display name, so the shape above is a measurement",
      !/^usr_[A-Za-z0-9_]+$/.test("Juma Mwakalinga") && /^usr_[A-Za-z0-9_]+$/.test(OFFICER), "");
    /* 🔴 BOTH PANELS' `When` CELL STATES SECONDS, AND THAT WAS READ OFF A SERVED PAGE. With `HH:MM`, twenty
       rows of a busy account all read "20 Sep 15:10" — so the ONE column that states the order could not be used to
       check it, and "Newest first." was a claim the screen could not support. The targets grid keeps minutes on
       purpose: a target is a rare, deliberate act; a stake is not. */
    const SECONDS = /^\d{1,2} [A-Z][a-z]{2} \d{2}:\d{2}:\d{2}$/;
    ok("1.373 · both panels' `When` cell states SECONDS, and its `title` carries the absolute EAT instant — a time column under a 'newest first' order that cannot tell two rows apart is a claim the screen does not support",
      p1.feed.every((r: Any) => SECONDS.test(r.when) && r.whenTitle.endsWith(" EAT"))
        && h1.history.every((r: Any) => SECONDS.test(r.when) && r.whenTitle.endsWith(" EAT")),
      j({ feed: p1.feed[0]?.when, history: h1.history[0]?.when }));
    ok("1.373 · CONTROL · the minute-only form the targets grid keeps is NOT accepted by that scan, and the shipped form is",
      !SECONDS.test("20 Sep 15:10") && SECONDS.test("20 Sep 15:10:07"), "");

    const hOver = await histView({ hpage: "9" });
    ok("1.317 · a history page past the end is served as the LAST page — the same idiom, never a second one",
      hOver.historyPage === 2 && hOver.history.length === histTotal - 20 && all(hWho(hOver)) === all(hWho(h2)),
      j({ page: hOver.historyPage, rows: hOver.history.length }));
    const hAnchor = await histView({ event: eventIds[0] });
    ok("1.302 · a bell's `&event=` lands on the page its row is on and marks it",
      hAnchor.historyPage === 2 && hAnchor.history.filter((r: Any) => r.anchored).length === 1,
      j({ page: hAnchor.historyPage, marked: hAnchor.history.filter((r: Any) => r.anchored).length }));
    const realAll = w.dal.houseBotEventStore.listAll;
    let histFailed: Any;
    try {
      w.dal.houseBotEventStore.listAll = async () => { throw new Error("planted history failure"); };
      histFailed = await histView();
    } finally { w.dal.houseBotEventStore.listAll = realAll; }
    ok("1.355 · a failed history read is `history === null` — the kit's failure treatment — and never an empty list",
      histFailed.history === null && Array.isArray(h1.history), j({ failed: histFailed.history }));
    /* ⛔ AN EMPTY READ AND A FAILED ONE ARE DIFFERENT ANSWERS, AND THE DIFFERENCE IS THE POINT (355, 421).
       ⚠️ NO ACCOUNT ON THIS PLATFORM HAS AN EMPTY HISTORY — designating one writes its own DESIGNATED event — so
       the empty READ is planted rather than waited for. The plant is named and it is the honest one: the store
       answers no rows and a count of zero, which is exactly what a fresh migration would answer. */
    const realAllEmpty = w.dal.houseBotEventStore.listAll;
    const realCountEmpty = w.dal.houseBotEventStore.countAll;
    let histEmpty: Any;
    try {
      w.dal.houseBotEventStore.listAll = async () => [];
      w.dal.houseBotEventStore.countAll = async () => 0;
      histEmpty = await histView();
    } finally {
      w.dal.houseBotEventStore.listAll = realAllEmpty;
      w.dal.houseBotEventStore.countAll = realCountEmpty;
    }
    ok("1.355 · an empty history READ answers an EMPTY LIST and its own empty state — never null, which is what a FAILED read answers one line above",
      Array.isArray(histEmpty.history) && histEmpty.history.length === 0 && histEmpty.historyTotal === 0
        && histEmpty.historyEmpty.title === "No changes yet"
        && histFailed.history === null,
      j({ empty: histEmpty.history, failed: histFailed.history }));
    ok("1.355 · CONTROL · the store really was restored — the same call answers the whole set again, so the two answers above came from the plants and not from a reader that lost its rows",
      (await histView()).historyTotal === histTotal, "");

    /* ⛔ A PANEL THAT IS NOT IN VIEW TAKES NO LIST READ AT ALL — so the account page's other three tabs do not pay
       for these two, and the one-reader-per-render law is not quietly turned into a one-reader-five-reads law. */
    const onOverview = await GATEM.houseDetailForConsole(OFFICER, "/admin/desk", panels.botId, {});
    ok("1.306 · the overview tab takes NEITHER list read — the two panels' reads are taken only for the tab in view",
      onOverview.feed === null && onOverview.feedTotal === null
        && onOverview.history === null && onOverview.historyTotal === null
        && onOverview.usage !== null,
      j({ feed: onOverview.feed, history: onOverview.history }));

    STATES.push(["detail-activity", p1], ["detail-activity-filtered", railed], ["detail-activity-empty", bare], ["detail-history", h1]);

    /* ══ C7 STEP 5 · THE LANDING HALF — THE DESK-WIDE PANELS, DRIVEN ═══════════════════════════════════════════
     * The same fixture, read the other way round: 41 stakes on one account, one on a second, and the desk's own
     * events beside both. What these measure that §2e2's cannot is the DIFFERENCE between the two shapes — a
     * count that is the desk's and not one account's, a history that keeps the control row's own events, and a
     * control an officer can act with. */
    {
      const { auditFlush, getAuditPage }: Any = await import("../../src/lib/server/audit.ts");
      const CONST: Any = await import("../../src/lib/house-bot/constants.ts");
      /* A viewer outside the audience, minted here: this block is its own scope, and a refusal proved with a
         handle borrowed from another block is a refusal proved against a viewer nobody can see. */
      const outsiderId = await w.user({ role: "PLAYER" });
      const deskFeed = (qq: Record<string, unknown> = {}) =>
        GATEM.houseFeedForConsole(OFFICER, "/admin/desk", { tab: "activity", ...qq });
      const deskHist = (qq: Record<string, unknown> = {}) =>
        GATEM.houseHistoryForConsole(OFFICER, "/admin/desk", { tab: "history", ...qq });

      /* ⛔ THE GATE IS FIRST AND NOTHING IS READ BEFORE IT (rulings 259, 300, 340, 380). */
      const realFeedList = w.dal.houseBotIntentStore.listFeed;
      let refusedCalls = 0;
      let refusedFeed: Any; let refusedHist: Any;
      try {
        w.dal.houseBotIntentStore.listFeed = (...a: Any[]) => { refusedCalls++; return realFeedList.apply(w.dal.houseBotIntentStore, a as Any); };
        refusedFeed = await GATEM.houseFeedForConsole(outsiderId, "/admin/desk", { tab: "activity" });
        refusedHist = await GATEM.houseHistoryForConsole(outsiderId, "/admin/desk", { tab: "history" });
      } finally { w.dal.houseBotIntentStore.listFeed = realFeedList; }
      ok("1.340 · both desk-wide readers refuse a viewer outside the audience with `null` and perform ZERO store calls — a refused payload carries no label, no handle, no amount and no sentence",
        refusedFeed === null && refusedHist === null && refusedCalls === 0,
        j({ feed: refusedFeed, history: refusedHist, calls: refusedCalls }));

      const d1 = await deskFeed();
      /* ⛔ EVERY NUMBER IN THIS BLOCK IS RE-DERIVED FROM THIS RUN AND NONE IS TYPED. The sections above leave
         their own rows on the desk, so a hand-written total would be a number tied to the order this file happens
         to run in — which is the recorded-number class, and it rots. What is asserted is the RELATIONSHIP: the
         desk's population is the accounts' populations together, the pages tile it exactly, and the badge is a
         count of one status across all of it. */
      const deskTotal: number = d1.feedTotal;
      const lastPage = Math.max(1, Math.ceil(deskTotal / d1.feedPerPage));
      const d2 = await deskFeed({ page: "2" });
      const d3 = await deskFeed({ page: String(lastPage) });
      const rowKey = (v: Any): string[] => (v.feed ?? []).map((r: Any) => `${r.whenTitle}|${r.stake}`);
      const pages: Any[] = [];
      for (let n = 1; n <= lastPage; n++) pages.push(await deskFeed({ page: String(n) }));
      const everyKey = pages.flatMap(rowKey);

      /* ⛔ 344 · THE TOTAL IS A COUNTING READ, AND IT IS THE DESK'S — 42, not one account's 41. */
      ok("1.411 · both landing pagers take `total` from a COUNTING reader and never from the page: the desk feed serves ONE page of 20 out of a total larger than it, and the total does not move as the officer pages",
        d1.feed.length === d1.feedPerPage && d1.feedPerPage === 20 && d1.feedPage === 1
          && deskTotal > d1.feed.length && lastPage >= 3
          && d2.feedTotal === deskTotal && d3.feedTotal === deskTotal,
        j({ rows: d1.feed.length, total: deskTotal, lastPage, lastRows: d3.feed.length }));
      /* ⛔ WHAT A STABLE DECLARED ORDER BUYS, MEASURED THREE WAYS — and NOT by unique row keys, because a feed row
         deliberately carries no id (D19: a bounded record id is the one thing this section may not put in a
         response it does not have to) and two stakes in one second are a real state, not a fixture artefact.
         (a) the pages TILE the total exactly, every page full but the last;
         (b) a second read of every page returns the IDENTICAL sequence — an unstable order is one that moves
             between two reads of the same address, which is precisely what a numbered pager cannot survive;
         (c) no page repeats its neighbour's boundary row, which is how an unstable order shows one row twice and
             hides another. */
      const everyKeyAgain: string[] = [];
      for (let n = 1; n <= lastPage; n++) everyKeyAgain.push(...rowKey(await deskFeed({ page: String(n) })));
      ok("1.411 · the pages together are the whole desk with nothing repeated and nothing lost — they tile the total exactly, a second read returns the identical sequence, and no page repeats its neighbour's boundary row",
        everyKey.length === deskTotal
          && pages.every((pg, i) => pg.feed.length === (i + 1 < lastPage ? 20 : deskTotal - 20 * (lastPage - 1)))
          && j(everyKey) === j(everyKeyAgain)
          && pages.every((pg, i) => i + 1 >= lastPage || rowKey(pg)[pg.feed.length - 1] !== rowKey(pages[i + 1])[0]),
        j({ total: deskTotal, perPage: pages.map((pg) => pg.feed.length), stable: j(everyKey) === j(everyKeyAgain) }));
      /* ⛔ AND IT IS THE DESK'S POPULATION, NOT ONE ACCOUNT'S — the second account's stake is IN it, which is the
         one difference between this reader and the account page's and the thing a scoped reader would drop. */
      const acctTotal = (await GATEM.houseDetailForConsole(OFFICER, "/admin/desk", panels.botId, { tab: "activity" })).feedTotal;
      const otherTotal = (await GATEM.houseDetailForConsole(OFFICER, "/admin/desk", other.botId, { tab: "activity" })).feedTotal;
      ok("1.411 · the desk feed is the DESK's population and not one account's: the second account's stake is IN it, and the desk's total is strictly larger than either account's",
        everyKey.some((x) => x.endsWith(`|${formatTzs(7_000)}`))
          && acctTotal === 41 && otherTotal === 1
          && deskTotal > acctTotal && deskTotal >= acctTotal + otherTotal,
        j({ deskTotal, acctTotal, otherTotal }));
      /* ⛔ A PAGE PAST THE END IS SERVED AS THE LAST PAGE, and a page number that is not one is REFUSED BY NAME. */
      const dOver = await deskFeed({ page: "999" });
      const dJunk = await deskFeed({ page: "x" });
      ok("1.411 · `?page=999` on the desk feed is served as the LAST page with its rows, and a page number that is not one reads as page 1 AND is reported as a refusal",
        dOver.feedPage === lastPage && dOver.feed.length > 0 && dJunk.feedPage === 1 && dJunk.feed.length === 20
          && typeof dJunk.queryRefusal === "string" && dJunk.queryRefusal.includes("page"),
        j({ over: dOver.feedPage, lastPage, junk: dJunk.feedPage, refusal: dJunk.queryRefusal }));

      /* ── 1.345 · THE ROWS AND THE TOTAL MOVE TOGETHER OVER EVERY FACET, ON THE DESK'S OWN POPULATION ────── */
      /* ⛔ THE FACET IS MEASURED AGAINST THE STORE'S OWN COUNT OF THE SAME FACET, not against a typed number:
         what this case is about is that the READER's rows and the READER's total agree with each other and with
         the population, whatever that population happens to hold when this file runs. */
      const deskAgree = async (qq: Record<string, unknown>, filter: Record<string, unknown>) => {
        const v = await deskFeed(qq);
        const want = await w.dal.houseBotIntentStore.countFeed(filter as Any);
        return { total: v.feedTotal, rows: v.feed.length, want, ok: v.feedTotal === want && v.feed.length === Math.min(want, 20) && v.queryRefusal === null };
      };
      const dKind = await deskAgree({ kind: "manual" }, { kinds: ["MANUAL"] });
      const dOutcome = await deskAgree({ outcome: "failed" }, { statuses: ["FAILED"] });
      const dBoth = await deskAgree({ kind: "manual", outcome: "failed" }, { kinds: ["MANUAL"], statuses: ["FAILED"] });
      ok("1.345 · the desk-wide feed's rows and total move together over every facet — type, outcome, and two at once — because ONE filter object feeds the page read and the count",
        [dKind, dOutcome, dBoth].every((x) => x.ok), j({ dKind, dOutcome, dBoth }));
      ok("1.345 · CONTROL · the facets really NARROW the desk's own population, and the two-facet answer is narrower than either of its halves",
        dKind.total < deskTotal && dOutcome.total < deskTotal && dBoth.total < dKind.total && dBoth.total < dOutcome.total,
        j({ all: deskTotal, dKind: dKind.total, dOutcome: dOutcome.total, dBoth: dBoth.total }));

      /* ── 312 · THE BADGE IS THE DESK'S QUEUED STAKES, IT IS UNFILTERED BY THE RAIL, AND IT IS ON EVERY TAB ── */
      const onRoster = await GATEM.houseRosterForConsole(OFFICER, "/admin/desk");
      const onLimits = await GATEM.houseUsageForConsole(OFFICER, "/admin/desk", { houseBotId: null });
      const onHist = await deskHist();
      const queued: number = await w.dal.houseBotIntentStore.countFeed({ statuses: ["PENDING"] });
      ok("1.312 · the activity badge is the desk's QUEUED stakes, counted by a COUNTING reader over the same predicate the feed pages over, and it is the SAME number on all four tabs — one read in the shell, never one per panel",
        queued > 0 && d1.pendingIntents === queued && onRoster.pendingIntents === queued
          && onLimits.pendingIntents === queued && onHist.pendingIntents === queued,
        j({ queued, feed: d1.pendingIntents, roster: onRoster.pendingIntents, limits: onLimits.pendingIntents, history: onHist.pendingIntents }));
      ok("1.312 · …and it does NOT move as the officer filters: a bell's own narrowed address cannot change the number beside the tab it points at",
        (await deskFeed({ kind: "manual" })).pendingIntents === queued
          && (await deskFeed({ outcome: "failed" })).pendingIntents === queued
          && (await deskFeed({ outcome: "queued" })).pendingIntents === queued
          /* ⛔ AND THE ROWS REALLY DID MOVE UNDER IT, which is the half that makes the line above a measurement:
             at least one of these filters answers a different number of rows from the badge, so a badge that was
             quietly being recomputed from the filtered population could not have matched. */
          && [dKind.total, dOutcome.total, dBoth.total].some((n) => n !== queued),
        j({ filtered: (await deskFeed({ kind: "manual" })).pendingIntents, rowsThatFilter: [dKind.total, dOutcome.total, dBoth.total], queued }));
      /* ⛔ AND IT IS `PENDING` ALONE — ruling 312's own word — never PENDING+CLAIMED: a CLAIMED stake is already in
         flight and there is nothing left for an officer to cancel about it, so a badge counting it would offer a
         number no control on the page can act on. */
      ok("1.312 · CONTROL · the badge counts PENDING ALONE and not the LIVE pair, and the two are really different populations of this store",
        queued === await w.dal.houseBotIntentStore.countFeed({ statuses: ["PENDING"] })
          && (await w.dal.houseBotIntentStore.countFeed({ statuses: ["PENDING", "CLAIMED"] })) >= queued
          && (await w.dal.houseBotIntentStore.countFeed({ statuses: ["CLAIMED"] })) >= 0,
        j({ pending: queued, live: await w.dal.houseBotIntentStore.countFeed({ statuses: ["PENDING", "CLAIMED"] }) }));

      /* ── 355 · A FAILED READ IS NEVER AN EMPTY TABLE, AND A FAILED COUNT IS NEVER A ZERO ─────────────────── */
      const realList = w.dal.houseBotIntentStore.listFeed;
      const realCount = w.dal.houseBotIntentStore.countFeed;
      let feedListFailed: Any; let feedCountFailed: Any;
      try {
        w.dal.houseBotIntentStore.listFeed = async () => { throw new Error("planted desk feed page failure"); };
        feedListFailed = await deskFeed();
      } finally { w.dal.houseBotIntentStore.listFeed = realList; }
      try {
        w.dal.houseBotIntentStore.countFeed = async () => { throw new Error("planted desk feed count failure"); };
        feedCountFailed = await deskFeed();
      } finally { w.dal.houseBotIntentStore.countFeed = realCount; }
      ok("1.355 · a FAILED desk read paints the kit's failure treatment and never an empty state: a failed page read answers `null` rows with the total intact, and a failed COUNT answers `null` for the total AND `null` for the badge — never a zero",
        feedListFailed.feed === null && feedListFailed.feedTotal === deskTotal
          && feedCountFailed.feedTotal === null && feedCountFailed.pendingIntents === null
          && Array.isArray(feedCountFailed.feed),
        j({ listFailed: { feed: feedListFailed.feed, total: feedListFailed.feedTotal },
            countFailed: { total: feedCountFailed.feedTotal, badge: feedCountFailed.pendingIntents } }));
      ok("1.355 · CONTROL · the store really was restored — the same call answers the whole desk again, so the two answers above came from the plants and not from a reader that lost its rows",
        (await deskFeed()).feedTotal === deskTotal && (await deskFeed()).pendingIntents === queued, "");
      /* ⛔ AND A FILTER THAT MATCHED NOTHING READS DIFFERENTLY FROM A LIST WITH NOTHING IN IT (416). */
      const noMatch = await deskFeed({ kind: "manual", outcome: "cancelled", product: "up-down" });
      /* 🔴 THE `body` IS READ NOW, AND IT IS READ BECAUSE THE RENDER FOUND WHAT THIS LINE COULD NOT. The first
         version compared the two TITLES and then checked the UNFILTERED body for the word "desk" — so the FILTERED
         body, the one string the reader borrowed from the account page, was the one string nothing looked at. It
         said "No stake on **this account** matches" on the page that lists every account, and was read off a
         served page at `?tab=activity&kind=manual&outcome=cancelled&product=up-down` with every suite green.
         ⛔ BOTH SUBJECTS ARE NOW HELD APART IN BOTH DIRECTIONS: each of the desk's two sentences names the DESK and
         never an account, and each of the account page's names the ACCOUNT and never the desk. A guard that
         checks one side of a swap cannot see the swap. */
      const deskPlain = await deskFeed();
      const acctNoMatch = await GATEM.houseDetailForConsole(OFFICER, "/admin/desk", panels.botId, { tab: "activity", kind: "manual", outcome: "cancelled", product: "up-down" });
      const acctPlain = await GATEM.houseDetailForConsole(OFFICER, "/admin/desk", panels.botId, { tab: "activity" });
      const namesDesk = (e: Any) => /\bthe desk\b/.test(e.body) && !/this account/.test(e.body);
      const namesAccount = (e: Any) => /this account/.test(e.body) && !/\bthe desk\b/.test(e.body);
      ok("1.355 · 416 · an empty desk list and a filter that matched nothing say DIFFERENT things, and BOTH of the desk's sentences name the DESK — body included, which is where the account page's sentence was found painted on the landing page",
        noMatch.feedTotal === 0 && noMatch.feed.length === 0 && noMatch.feedFiltered === true
          && noMatch.feedEmpty.title !== deskPlain.feedEmpty.title
          && namesDesk(deskPlain.feedEmpty) && namesDesk(noMatch.feedEmpty)
          && typeof noMatch.feedClearHref === "string" && noMatch.feedClearHref.includes("tab=activity"),
        j({ filtered: noMatch.feedEmpty.body, unfiltered: deskPlain.feedEmpty.body }));
      ok("1.355 · 416 · CONTROL · the ACCOUNT page's own pair names the ACCOUNT in both states and never the desk, so the line above is a swap that would be reported in either direction and not a word that happens to appear",
        acctNoMatch.feedFiltered === true && namesAccount(acctNoMatch.feedEmpty) && namesAccount(acctPlain.feedEmpty)
          && acctNoMatch.feedEmpty.body !== noMatch.feedEmpty.body
          && acctPlain.feedEmpty.body !== deskPlain.feedEmpty.body,
        j({ acctFiltered: acctNoMatch.feedEmpty.body, acctPlain: acctPlain.feedEmpty.body }));

      /* ── 317 · THE DESK HISTORY KEEPS THE CONTROL ROW'S OWN EVENTS, WHICH A PER-ACCOUNT READ CORRECTLY DROPS ── */
      await w.dal.houseBotEventStore.append({
        houseBotId: null, userId: null, marketId: null, kind: "LIMITS_SAVED",
        fromStatus: null, toStatus: null, reason: null, actorId: OFFICER, payload: { landing: true },
      } as Any);
      const deskH = await deskHist();
      const acctH = await GATEM.houseDetailForConsole(OFFICER, "/admin/desk", panels.botId, { tab: "history" });
      ok("1.317 · the desk history carries the CONTROL ROW's own events — the switch, a limits save, the withdrawal — which belong to no account, and the per-account read correctly drops them",
        deskH.historyTotal > acctH.historyTotal
          && deskH.history.some((r: Any) => r.accountHref === null)
          && acctH.history.length > 0,
        j({ desk: deskH.historyTotal, account: acctH.historyTotal }));
      /* ⛔ AND THE ROW SAYS WHOSE IT IS, IN THREE DISTINCT STATES — the operator's own text, the desk's own word,
         and the console's word for an account the roster no longer holds. Never one standing in for another. */
      ok("1.317 · 474 · every desk row NAMES the account it is about, and the desk's own rows say so in the console's own word rather than being blank or borrowing an account's name",
        deskH.history.every((r: Any) => typeof r.accountName === "string" && r.accountName.length > 0)
          && deskH.history.some((r: Any) => r.accountIsOperatorText === true && r.accountHref !== null)
          && deskH.history.some((r: Any) => r.accountIsOperatorText === false && r.accountHref === null),
        j(deskH.history.slice(0, 4).map((r: Any) => [r.accountName, r.accountIsOperatorText, r.accountHref !== null])));
      ok("1.317 · the desk history pages against a COUNTING reader in the same declared order, and a page past the end is served as the LAST page",
        (await deskHist({ hpage: "1" })).historyPage === 1
          && (await deskHist({ hpage: "999" })).historyPage === Math.max(1, Math.ceil(deskH.historyTotal / deskH.historyPerPage))
          && (await deskHist({ hpage: "999" })).history.length > 0,
        j({ total: deskH.historyTotal, perPage: deskH.historyPerPage }));
      /* ⛔ NO AMOUNT AND NO BALANCE REACHES A ROW, and the money door is the platform's own screen (266, 369, 456). */
      ok("1.369 · not one desk history row carries an amount or a wallet balance — an OWNER_MONEY row carries a DOOR to the platform's own transactions screen instead",
        deskH.history.every((r: Any) => !("amountTzs" in r) && !("balanceTzs" in r) && !/TZS/.test(all(r)))
          && deskH.history.every((r: Any) => r.moneyHref === null || r.moneyHref.startsWith("/admin/transactions?q=")),
        j(deskH.history.slice(0, 3)));
      /* ⛔ AND NO FEED ROW CARRIES `why`, `decision` OR A TRIGGER PLAYER'S RAW ID. */
      ok("1.453 · not one desk feed row carries the engine's own sentence, its decision blob or another player's raw id — the projection is finished strings and booleans",
        d1.feed.every((r: Any) => !("why" in r) && !("decision" in r) && !("triggerUserId" in r))
          && !all(d1.feed).includes("a sentence the console must never paint")
          && !all(d1.feed).includes("usr_panel_trigger_player"),
        j(d1.feed[0]));

      /* ── 415 · THE STOP CONTROL, AND THE WRITE BEHIND IT ─────────────────────────────────────────────────── */
      ok("1.415 · the stop control is offered on exactly the rows the badge counts — a QUEUED stake carries the id the control posts and every other row carries `null`, so no control is drawn over a stake the service could only refuse",
        pages.flatMap((pg) => pg.feed).every((r: Any) => (r.statusWord === "Queued") === (r.cancelId !== null))
          && pages.flatMap((pg) => pg.feed).filter((r: Any) => r.cancelId !== null).length === queued
          && d1.cancelCopy !== null && typeof d1.cancelCopy.confirmLabel === "string",
        j({ offered: pages.flatMap((pg) => pg.feed).filter((r: Any) => r.cancelId !== null).length, queued }));
      ok("1.415 · 453 · not one word of the stop dialog names the feature, and the id it posts is never PAINTED — no row renders it",
        Object.values(d1.cancelCopy as Record<string, unknown>).filter((v) => typeof v === "string")
          .every((v) => !NEUTRAL.test(v as string) && houseHits(v as string).length === 0)
          /* ⛔ POSTED, NEVER PAINTED: the id crosses as a PROP and no cell renders it. A bounded record id in
             served markup is the one thing D19 says this section may never put in a response it does not have to,
             and the difference between the two is exactly the difference between `id={…}` and `>{…}<`. */
          && /<StopQueued id=\{r\.cancelId\}/.test(decomment(read(PAGE)))
          && !/>\s*\{r\.cancelId\}/.test(decomment(read(PAGE)))
          && !/\{r\.cancelId\}<\//.test(decomment(read(PAGE))),
        j(d1.cancelCopy));
      /* ⛔ THE BOUNDS ARE CHECKED ON THE SERVER TOO — a ceremony verified only in a browser is one a crafted POST
         walks straight through, and this door is reachable by any signed-in account (383). */
      const uuid = (n: number) => `00000000-0000-0000-0000-${String(900 + n).padStart(12, "0")}`;
      const victim = pages.flatMap((pg) => pg.feed).find((r: Any) => r.cancelId !== null)!.cancelId as string;
      const tooShort = await GATEM.houseCancelIntentForConsole(OFFICER, "/admin/desk", { id: victim, submitId: uuid(1), reason: "no" });
      const tooLong = await GATEM.houseCancelIntentForConsole(OFFICER, "/admin/desk", { id: victim, submitId: uuid(2), reason: "z".repeat(400) });
      const noId = await GATEM.houseCancelIntentForConsole(OFFICER, "/admin/desk", { id: "", submitId: uuid(3), reason: "a real reason" });
      const badSubmit = await GATEM.houseCancelIntentForConsole(OFFICER, "/admin/desk", { id: victim, submitId: "not-a-uuid", reason: "a real reason" });
      const outsider = await GATEM.houseCancelIntentForConsole(outsiderId, "/admin/desk", { id: victim, submitId: uuid(4), reason: "a real reason" });
      ok("1.415 · the cancel door validates the reason with the SAME bounds the control arms on, refuses a malformed idempotency key before it reads anything, and refuses a viewer outside the audience — each by its own sentence",
        tooShort.ok === false && tooShort.field === "reason"
          && tooLong.ok === false && tooLong.field === "reason"
          && noId.ok === false && badSubmit.ok === false && outsider.ok === false
          && new Set([tooShort.error, noId.error, badSubmit.error, outsider.error]).size === 4,
        j({ tooShort: tooShort.error, tooLong: tooLong.error, noId: noId.error, badSubmit: badSubmit.error, outsider: outsider.error }));
      ok("1.415 · CONTROL · the refusals really are refusals — the stake is still QUEUED after all five, so none of them wrote anything",
        (await w.dal.houseBotIntentStore.get(victim))!.status === "PENDING", "");
      /* ⛔ THE CANCEL LANDS, AND IT IS THE FIRST PRESS ANYTHING UNDER `src/` HAS EVER CREATED. */
      const stopped = await GATEM.houseCancelIntentForConsole(OFFICER, "/admin/desk", { id: victim, submitId: uuid(5), reason: "stopped by the officer for a test" });
      const afterRow = await w.dal.houseBotIntentStore.get(victim);
      ok("1.415 · the stop LANDS: the queued stake is CANCELLED, the result says so, and the badge falls by exactly one because it counts the same population the control acts on",
        stopped.ok === true && stopped.changed === true
          && afterRow!.status === "CANCELLED" && afterRow!.reasonCode === "CANCELLED_BY_ADMIN"
          && (await deskFeed()).pendingIntents === queued - 1,
        j({ stopped, status: afterRow!.status, badge: (await deskFeed()).pendingIntents, queued }));
      const repeat = await GATEM.houseCancelIntentForConsole(OFFICER, "/admin/desk", { id: victim, submitId: uuid(5), reason: "stopped by the officer for a test" });
      ok("1.415 · a repeat of the SAME press is not a second cancel — the idempotency key is consulted BEFORE the row's status, so the officer is told what their own press did rather than that the stake had already left the queue",
        repeat.ok === true && repeat.changed === true && (await deskFeed()).pendingIntents === queued - 1,
        j({ repeat, badge: (await deskFeed()).pendingIntents, queued }));
      const secondAttempt = await GATEM.houseCancelIntentForConsole(OFFICER, "/admin/desk", { id: victim, submitId: uuid(6), reason: "a second attempt at a cancelled stake" });
      ok("1.415 · a NEW press over a stake that has already left the queue is refused BY NAME — the officer is told what happened rather than met with a silent no-op, and its sentence is not the repeat's",
        secondAttempt.ok === false && typeof secondAttempt.error === "string" && secondAttempt.error.length > 20,
        j({ secondAttempt }));
      /* ⛔ THE AUDIT KEY IS THE ONE `press-audit.ts` MAPS THIS PURPOSE TO, AND IT IS A `HOUSE_AUDIT` MEMBER —
         membership is what keeps the row out of a player's own audit read, so a key renamed for neutrality would
         silently leave the exclusion. */
      await auditFlush();
      const cancelRows = (getAuditPage({ limit: 10_000 }) as Any[]).filter((e) => e.action === "house_bot.staff_intent_cancelled");
      ok("1.382 · the cancel's audit action is a `HOUSE_AUDIT` key — `house_bot.staff_intent_cancelled`, the one the press builder already maps this purpose to — and it names the ACTOR BY ID with no free text in the payload",
        cancelRows.length >= 1
          && cancelRows[0].category === CONST.HOUSE_AUDIT["house_bot.staff_intent_cancelled"]
          && cancelRows[0].actorId === OFFICER
          && CONST.isAllowedHouseAuditPayload(cancelRows[0].payload) === true
          && !all(cancelRows[0].payload).includes("stopped by the officer for a test"),
        j({ found: cancelRows.length, row: cancelRows[0] && { action: cancelRows[0].action, category: cancelRows[0].category, payload: cancelRows[0].payload } }));
      ok("1.382 · CONTROL · the writerless ADMIN twin is still written by NOBODY, so the key above was chosen and not defaulted into",
        CONST.HOUSE_AUDIT["house_bot.intent_cancelled"] === "ADMIN"
          && (getAuditPage({ limit: 10_000 }) as Any[]).every((e) => e.action !== "house_bot.intent_cancelled"),
        "");
      /* ⛔ AND THE OFFICER'S REASON IS ON THE EVENT, WHERE ERASURE CAN REACH IT (INT-10). */
      const cancelEvents = (await w.dal.houseBotEventStore.listAll({ limit: 200 })).filter((e: Any) => e.kind === "STAFF_INTENT_CANCELLED");
      ok("1.382 · INT-10 · the officer's typed sentence is on the EVENT and never in the audit payload — erasure rewrites one and structurally cannot rewrite the other",
        cancelEvents.length >= 1 && cancelEvents[0].reason === "stopped by the officer for a test"
          && cancelEvents[0].actorId === OFFICER,
        j({ events: cancelEvents.length, reason: cancelEvents[0]?.reason }));
    }
  }

  /* ── 1.411 / 1.410 · THE PAGERS AND THE RAIL, AT THE RENDER SITE ──────────────────────────────────────────── */
  {
    const detail = decomment(read(DETAIL_PAGE));
    /* ⭐ THE RAIL MOVED UP ONE DIRECTORY WHEN THE LANDING PANELS LANDED, AND THAT IS §K5 RATHER THAN TIDINESS:
       both pages render the SAME activity rail, and two copies of one control is the exact defect this section
       was pulled up on. It is still under `src/app/admin/desk/**`, which is what puts it inside 4.453's
       `lexiconFiles` walk and 1.360's money walk at all. */
    const rail = `${SECTION}/activity-filters.tsx`;
    const railSrc = decomment(read(rail));
    /* ⛔ BOTH PAGED PANELS DRAW THE SHARED PAGER, AND NEITHER TAKES ITS TOTAL FROM THE ROWS. */
    ok("1.411 · both paged panels render the shared `AdminPagination`, each with its OWN page parameter, and the account page now draws three pagers in all — targets, activity and history",
      (detail.match(/<AdminPagination/g) ?? []).length === 3
        && /param="page"/.test(detail) && /param="hpage"/.test(detail) && /param="tpage"/.test(detail),
      j({ pagers: (detail.match(/<AdminPagination/g) ?? []).length }));
    ok("1.411 · every `total` is a COUNTING field of the view and never a rendered array's length, and the page and page size come from the view too — never `parsePage`, whose module is client-reachable",
      /total=\{view\.feedTotal\}/.test(detail) && /total=\{view\.historyTotal\}/.test(detail) && /total=\{view\.targetsTotal\}/.test(detail)
        && !/total=\{[^}]*\.length\}/.test(detail) && !/parsePage/.test(detail)
        && /page=\{view\.feedPage\}/.test(detail) && /perPage=\{view\.feedPerPage\}/.test(detail),
      "");
    ok("1.411 · CONTROL · that scan fires on a total taken from the rows, which is the defect ruling 344 exists for",
      /total=\{[^}]*\.length\}/.test("<AdminPagination total={feedRows.length} />"), "");
    ok("1.411 · each pager's `baseHref` carries its own panel's live parameters, built from the VIEW and never re-typed at the call site",
      /baseHref=\{buildBaseHref\(`\$\{CONSOLE_ROUTE\}\/\$\{view\.id\}`, view\.feedParams, "page"\)\}/.test(detail)
        && /baseHref=\{buildBaseHref\(`\$\{CONSOLE_ROUTE\}\/\$\{view\.id\}`, view\.historyParams, "hpage"\)\}/.test(detail),
      "");
    /* ⛔ THE RAIL IS ONE, IT IS UNDER THE SECTION, AND IT IS NOT ON THE `<Tabs>`. */
    const railHooks = sectionFiles.filter((f) => /data-filter-rail/.test(decomment(read(f))));
    ok("1.410 · exactly ONE `data-filter-rail` exists under the whole section, it is in the rail's own file, and the `<Tabs>` element carries none",
      railHooks.length === 1 && railHooks[0] === rail
        && (railSrc.match(/data-filter-rail/g) ?? []).length === 1
        && !/<Tabs[\s\S]*?data-filter-rail/.test(detail),
      j(railHooks));
    ok("1.410 · every rank-taking control on the rail takes the DENSE rank and `replace` — a filter is not a navigation, and a rail half at one height is worse than either",
      (railSrc.match(/<(?:FilterPill|DateTimeRangeFilter)\b/g) ?? []).length === 2
        && (railSrc.match(/rank="dense"/g) ?? []).length === 2
        && (railSrc.match(/\breplace\b/g) ?? []).length === 2
        && !/QueryStrip/.test(railSrc) && !/h-\[32px\]|32px/.test(railSrc),
      j({ controls: (railSrc.match(/<(?:FilterPill|DateTimeRangeFilter)\b/g) ?? []).length }));
    ok("1.410 · the rail is DECLARED in the filter-language gate's own surface list, which is what subjects it to that suite's §6 rules at all",
      read("scripts/filter-language.test.mts").includes(`"${rail}"`), rail);
    /* ⛔ AND THE RAIL FILE REACHES NOTHING: no route literal, no closed list, no house module, and no server module. */
    ok("1.453 · the rail file types no route, no closed list and no house module — every label and every href arrives as a finished server-built string",
      !/\/admin\/desk/.test(railSrc) && !/@\/lib\/house-bot|@\/lib\/server|house-bot-dal|console-routes/.test(railSrc)
        && !/COUNTER|OPENER|PENDING|MARKET|UPDOWN/.test(railSrc)
        && /groups\.map/.test(railSrc), "");
    ok("1.453 · CONTROL · each of those three scans fires on the thing it forbids",
      /\/admin\/desk/.test('href={`/admin/desk/${id}?tab=activity`}') && /@\/lib\/house-bot/.test('import { CONSOLE_ROUTE } from "@/lib/house-bot/console-routes";')
        && /COUNTER/.test('const KINDS = ["COUNTER"];'), "");
    /* ⛔ THE MONEY COLUMN IS SECOND, IT IS THE KIT'S OWN MONEY SHAPE, AND THE TABLE TAKES NO MIN-WIDTH. */
    const feedThead = /\{tab === "activity"[\s\S]*?<\/thead>/.exec(detail)?.[0] ?? "";
    const feedHeaders = [...feedThead.matchAll(/<th\s[^>]*>([^<]*)</g)].map((m) => m[1].trim());
    ok("1.373 · the activity table's headers are the control facts in order, with the money column SECOND and headed exactly `Stake`",
      all(feedHeaders) === all(["When", "Stake", "Outcome", "Type", "Product", "Note"]), j(feedHeaders));
    ok("1.373 · the money cell is the kit's own money shape — `tabular text-right` with `.amount` — and neither panel's table takes a `min-w-*`, which would push the figure off a phone",
      /<td className="p-3 tabular text-right"><span className="amount">\{r\.stake\}<\/span><\/td>/.test(detail)
        && !/admin-tbl min-w-/.test(detail), "");
    ok("1.373 · CONTROL · the header scan really read the ACTIVITY table and not the history one, so the order above is that table's",
      feedHeaders.length === 6 && !feedHeaders.includes("Event"), j(feedHeaders));
    const histThead = /\{tab === "history"[\s\S]*?<\/thead>/.exec(detail)?.[0] ?? "";
    const histHeaders = [...histThead.matchAll(/<th\s[^>]*>([^<]*)</g)].map((m) => m[1].trim());
    ok("1.373 · 266 · the history table carries NO money column at all — who, what, when and the change, and a door where an amount would have been",
      all(histHeaders) === all(["When", "Event", "Change", "Who"]) && !/amount/.test(histThead), j(histHeaders));
    /* 🔴 THE REFUSAL'S HEADING IS NUMBER-AGNOSTIC, AND THAT TOO WAS READ OFF A TILE: a singular title
       ("Part of this address was not used") sat above a plural sentence ("Parts of this address were …"), one
       above the other, on the same card. The heading comes from the SERVER like every other sentence here, so the
       two cannot be reworded apart. */
    ok("1.302 · 432(n) · the refusal card's heading is number-agnostic and comes from the reader, so it can never disagree with the sentence beneath it",
      !/\bParts?\b/.test(GATEM.CONSOLE_REFUSAL_TITLE as string)
        && /title=\{CONSOLE_REFUSAL_TITLE\}/.test(detail)
        && !NEUTRAL.test(GATEM.CONSOLE_REFUSAL_TITLE as string),
      j(GATEM.CONSOLE_REFUSAL_TITLE));
    ok("1.302 · CONTROL · the heading the first build shipped IS reported by that scan",
      /\bParts?\b/.test("Part of this address was not used"), "");
    /* ⛔ AND EACH PANEL'S EMPTY STATE IS THE KIT'S, SO A FAILED READ CANNOT LOOK LIKE ONE. */
    ok("1.355 · each panel paints the kit's EMPTY state only on a `length === 0` branch and the kit's FAILURE state only on a `=== null` branch — the two can never be reached by the same condition",
      /feedRows === null \? \(/.test(detail) && /feedRows\.length === 0 \? \(/.test(detail)
        && /historyRows === null \? \(/.test(detail) && /historyRows\.length === 0 \? \(/.test(detail)
        && (detail.match(/<AdminTableEmpty/g) ?? []).length === 3, "");
  }



/* ═══ §2e3 · THE LANDING PAGE'S TWO PANELS, AT THE RENDER SITE (C7 step 5's landing half) ══════════════
 * ⛔ The behavioural half is driven above, on both stores. What only a source scan can say is that the PAGE spends
 * what the reader gives it — the rail file both pages share, a pager whose base href carries the live filters, and
 * a bell whose window the door can actually read. */
section("§2e3 · the desk landing page's activity and history panels");
{
  /* The page's decommented source, under this section's own name — the ONE read hoisted above. */
  const landing = pageCode;
  const railFile = `${SECTION}/activity-filters.tsx`;
  /* ⛔ ONE RAIL FILE, RENDERED BY BOTH PAGES (§K5). Two copies of one control is the defect this section was
     pulled up on, and a second rail would also be a second `data-filter-rail` under one section (1.410). */
  ok("1.410 · the landing activity panel renders the SAME rail file the account page does, with the reader's own groups, presets and default — and the section still holds exactly one rail file",
    /<ActivityFilters groups=\{feedView\.feedFilters\} presets=\{feedView\.feedPresets\} presetDefault=\{feedView\.feedPresetDefault\} \/>/.test(landing)
      && /<ActivityFilters groups=\{view\.feedFilters\} presets=\{view\.feedPresets\} presetDefault=\{view\.feedPresetDefault\} \/>/.test(decomment(read(DETAIL_PAGE)))
      && sectionFiles.filter((f) => /data-filter-rail/.test(decomment(read(f)))).length === 1
      && existsSync(join(ROOT, railFile)),
    j({ rail: railFile, hooks: sectionFiles.filter((f) => /data-filter-rail/.test(decomment(read(f)))) }));
  ok("1.410 · CONTROL · the scan really reads the landing page — a rail rendered with its own typed options instead of the reader's is reported",
    !/<ActivityFilters groups=\{\[/.test(landing) && /<ActivityFilters groups=\{\[/.test('<ActivityFilters groups={[{ param: "kind" }]} />'), "");

  /* ⛔ BOTH PAGERS TAKE THEIR TOTAL FROM A COUNTING FIELD AND THEIR BASE HREF FROM THE READER'S LIVE PARAMETERS.
     A base href re-typed at the call site is how page 2 of a filtered list becomes page 2 of the unfiltered one. */
  ok("1.411 · each landing pager's `baseHref` carries its own panel's live parameters, built from the VIEW and never re-typed at the call site, and each list owns its own page parameter",
    /baseHref=\{buildBaseHref\(CONSOLE_ROUTE, feedView\.feedParams, "page"\)\}/.test(landing)
      && /baseHref=\{buildBaseHref\(CONSOLE_ROUTE, historyView\.historyParams, "hpage"\)\}/.test(landing)
      && /param="page"/.test(landing) && /param="hpage"/.test(landing)
      && !/baseHref=\{buildBaseHref\(CONSOLE_ROUTE, \{/.test(landing),
    "");
  ok("1.411 · both landing panels draw the shared `AdminPagination`, each total is a COUNTING field of its view, and neither is a rendered array's length",
    (landing.match(/<AdminPagination/g) ?? []).length === 2
      && /total=\{feedView\.feedTotal\}/.test(landing) && /total=\{historyView\.historyTotal\}/.test(landing)
      && !/total=\{[^}]*\.length\}/.test(landing)
      && !/parsePage/.test(landing)
      && /page=\{feedView\.feedPage\}/.test(landing) && /perPage=\{feedView\.feedPerPage\}/.test(landing),
    j({ pagers: (landing.match(/<AdminPagination/g) ?? []).length }));
  /* ⛔ AND THE UNPAGED PANELS DRAW NONE: the roster and the limits panel are whole reads, and a pager over a list
     that is never paged is 432(a)'s dead control. */
  ok("1.411 · the roster and limits panels draw NO pager — a numbered control over a list that is never paged is a control with nothing behind it",
    !/<AdminPagination/.test(panelOf("roster")) && !/<AdminPagination/.test(panelOf("limits"))
      && /<AdminPagination/.test(panelOf("activity")) && /<AdminPagination/.test(panelOf("history")),
    "");
  /* ⛔ EACH PANEL'S EMPTY STATE IS THE KIT'S AND IS REACHED ONLY BY A `length === 0` BRANCH; THE FAILURE STATE IS
     REACHED ONLY BY A `=== null` BRANCH. The two can never be reached by one condition (355). */
  ok("1.355 · each landing panel paints the kit's EMPTY state only on a `length === 0` branch and `AdminLoadError` only on a `=== null` branch — a failed read can never render as an empty table",
    /feedRows === null \? \(/.test(landing) && /feedRows\.length === 0 \? \(/.test(landing)
      && /historyRows === null \? \(/.test(landing) && /historyRows\.length === 0 \? \(/.test(landing)
      && (panelOf("activity").match(/<AdminTableEmpty/g) ?? []).length === 1
      && (panelOf("history").match(/<AdminTableEmpty/g) ?? []).length === 1
      && (panelOf("activity").match(/<AdminLoadError/g) ?? []).length === 1
      && (panelOf("history").match(/<AdminLoadError/g) ?? []).length === 1,
    "");
  /* ⛔ AND THE TWO FAILURE SENTENCES NAME THEIR OWN SUBJECT — "the desk's activity" is not "the desk's history",
     and neither is "the roster": a failure treatment that does not say what failed is one an officer cannot act on. */
  {
    const whats = [...landing.matchAll(/<AdminLoadError what=\{?"([^"]+)"/g)].map((m) => m[1]);
    ok("1.355 · every failure treatment on this page NAMES its own subject, and no two name the same one",
      whats.length >= 4 && new Set(whats).size === whats.length
        && whats.includes("the desk's activity") && whats.includes("the desk's history"),
      j(whats));
  }
  /* ⛔ THE MONEY COLUMN OF THE DESK FEED IS THE KIT'S OWN MONEY SHAPE, ITS HEADER IS EXACTLY `Stake`, AND THE
     SUBJECT COLUMN IS FIRST — the roster's own shape one card above, applied to this table's own subject. */
  {
    const feedThead = /<thead[\s\S]*?<\/thead>/.exec(panelOf("activity"))?.[0] ?? "";
    const feedHeaders = [...feedThead.matchAll(/<th\s[^>]*>([^<]*)</g)].map((m) => m[1].trim());
    const histThead = /<thead[\s\S]*?<\/thead>/.exec(panelOf("history"))?.[0] ?? "";
    const histHeaders = [...histThead.matchAll(/<th\s[^>]*>([^<]*)</g)].map((m) => m[1].trim());
    ok("1.373 · the desk activity table's headers are the control facts in order — the SUBJECT first and the money SECOND, headed exactly `Stake`, with the control column carrying no header word",
      j(feedHeaders) === j(["Account", "Stake", "When", "Outcome", "Type", "Product", "Note", ""]),
      j(feedHeaders));
    ok("1.373 · 266 · the desk history table carries NO money column at all — whose, when, what, the change and who did it, and a door where an amount would have been",
      j(histHeaders) === j(["Account", "When", "Event", "Change", "Who"]) && !/amount/.test(histThead),
      j(histHeaders));
    ok("1.373 · the desk feed's money cell is the kit's own money shape — `tabular text-right` with `.amount` — and neither landing table takes a `min-w-*` on the table itself",
      /<td className="p-3 tabular text-right"><span className="amount">\{r\.stake\}<\/span><\/td>/.test(panelOf("activity"))
        && !/admin-tbl min-w-/.test(landing), "");
  }
  /* ⛔ THE HOUR SUMMARY'S BELL LANDS ON THE WINDOW IT IS ABOUT. `parseEatLocal` requires a full instant and
     answers null for `14:00`, so the clock form resolved to "custom" over the last 24 hours — a different window
     under the name of the one the bell was about, with nothing on screen saying so. */
  {
    const notif = decomment(read("src/lib/server/notification-service.ts"));
    const emit = decomment(read("src/lib/server/house-bot/emitters.ts"));
    const DR: Any = await import("../../src/lib/server/date-range.ts");
    /* ⛔ THE ASSERTION IS THE ROUND TRIP, NOT THE SPELLING. A scan that only forbade the clock form passed while
       the link carried a full ISO instant — which the parser refuses just as completely. So the window the emitter
       WRITES is handed to the resolver the door actually uses, and the span that comes back is compared with the
       span that went in. That is the only form of this check that could not be satisfied by a wrong shape. */
    const fromMs = Date.parse("2026-09-20T13:00:00.000Z");
    const toMs = Date.parse("2026-09-20T14:00:00.000Z");
    const nowMs = Date.parse("2026-09-20T18:00:00.000Z");
    const round = (a: number, b: number) => {
      const w = DR.resolveRange({ range: "custom", from: DR.formatEatLocal(a), to: DR.formatEatLocal(b) }, nowMs, "24h");
      return { start: w.start, end: w.end };
    };
    const trip = round(fromMs, toMs);
    ok("1.369 · the hour summary's bell lands on the HOUR IT IS ABOUT: the window the emitter writes, handed to the door's own resolver, comes back as exactly that window — same start, same end, to the minute",
      trip.start === fromMs && trip.end === toMs
        && /&from=\$\{encodeURIComponent\(opts\.fromEat\)\}&to=\$\{encodeURIComponent\(opts\.toEat\)\}/.test(notif)
        && !/&from=\$\{encodeURIComponent\(opts\.(?:fromHH|fromIso)\)\}/.test(notif)
        && /\$\{opts\.fromHH\}–\$\{opts\.toHH\}/.test(notif)
        && /formatEatLocal\(Date\.parse\(fromIso\)\)/.test(emit),
      j({ start: new Date(trip.start).toISOString(), end: new Date(trip.end).toISOString() }));
    /* ⛔ THE CONTROL, AND IT IS THE ONE THAT WOULD HAVE CAUGHT THE FIRST FIX. BOTH wrong forms are driven through
       the same resolver and BOTH must come back as something other than the asked hour — the clock form, and the
       ISO instant that a field called `fromIso` invites. Measured: the ISO pair returns a 24-HOUR span, still
       labelled "custom", with no refusal anywhere. A guard that cannot tell those two apart is not measuring the
       bell, it is measuring a spelling. */
    const clockTrip = DR.resolveRange({ range: "custom", from: "13:00", to: "14:00" }, nowMs, "24h");
    const isoTrip = DR.resolveRange({ range: "custom", from: new Date(fromMs).toISOString(), to: new Date(toMs).toISOString() }, nowMs, "24h");
    ok("1.369 · CONTROL · both forms the console CANNOT read are driven through the same resolver and both come back as a different window — the clock form and the full ISO instant alike — and the parser refuses each outright while accepting the one the emitter writes",
      DR.parseEatLocal("13:00") === null
        && DR.parseEatLocal(new Date(fromMs).toISOString()) === null
        && DR.parseEatLocal(DR.formatEatLocal(fromMs)) !== null
        && !(clockTrip.start === fromMs && clockTrip.end === toMs)
        && !(isoTrip.start === fromMs && isoTrip.end === toMs)
        && isoTrip.end - isoTrip.start === 24 * 3600_000
        && isoTrip.preset === "custom",
      j({ isoSpanHours: (isoTrip.end - isoTrip.start) / 3600_000, isoPreset: isoTrip.preset }));
  }
}

/* ════════════════════════════════════════════════════════════════════════════════════════════════════════════════
 * §2f · THE DESIGNATE WIZARD — `/admin/desk/new` (C7-SPEC rulings 356, 359, 368/459, 382, 383, 387; C7 step 6)
 *
 * ⛔ THE THREE DOORS ARE THE WHOLE PROTECTION. Ruling 383 measured 200 of the 221 server-action ids in this build's
 * manifest inside publicly downloadable chunks, so any signed-in account can POST the lookup, the check and the
 * write. There is no layout, no nav and no page in that path — only each door's own verdict on the stored row.
 * ⛔ AND THE REFUSAL MUST NOT BE AN ORACLE. A refused caller's answer is byte-identical for a real account, an
 * invented one and one already on the desk, and the picker's empty answer is byte-identical to its refusal.
 * ════════════════════════════════════════════════════════════════════════════════════════════════════════════════ */

section("§2f · the designate wizard (rulings 356, 359, 382, 383, 387)");
try {
  const ELIG: Any = await import("../../src/lib/server/house-bot/eligibility.ts");
  const { hashPassword, randomId }: Any = await import("../../src/lib/server/crypto.ts");
  /* ⛔ THE ROSTER LIMIT IS RAISED FOR THIS BLOCK ALONE, because §2 and §2e have already designated four
     accounts against a default maximum of five and a ROSTER_FULL refusal here would be a fixture artefact
     masquerading as the assertion's own answer. */
  await w.limits({ maxDesignatedBots: 20 });
  const PW = "candidate-password-v1";
  /** A player with a REAL salted password, which is what `verifyHouseBotPassword` actually checks. */
  const candidate = async (o: { balance?: number; role?: string } = {}): Promise<string> => {
    const id = await w.user({ role: o.role ?? "PLAYER", balance: o.balance ?? 0 });
    const salt = randomId(16);
    await w.setUserFields(id, {
      passwordHash: await hashPassword(PW, salt), passwordSalt: salt,
      passwordSetAt: new Date().toISOString(), passwordSetVia: "SELF_CHANGE",
    });
    return id;
  };
  const outsider = await w.user({ role: "PLAYER" });
  /* A candidate that passes every check: a player, funded, with a password of their own. */
  const good = await candidate({ balance: 250_000 });
  /* A candidate that fails on a fact the check card must name in the CONSOLE's own words, not the service's. */
  const staffer = await candidate({ role: "SUPPORT" });
  /* A candidate with a password but an empty wallet — 459's "Not funded" state, which is NOT a blocking row. */
  const empty = await candidate({ balance: 0 });

  /* ━━ 1.359 · THE CHECK CARD IS READ THROUGH THE GATE, AND A REFUSED VIEWER RECEIVES NOTHING ━━━━━━━━━━━━━ */
  const card = await GATEM.houseCheckForConsole(OFFICER, "/admin/desk", good);
  const refusedCard = await GATEM.houseCheckForConsole(outsider, "/admin/desk", good);
  ok("1.359 · the wizard's check card is a PAINTED view model from the gated reader — the handle, the funded state, the open-position count and every check as a finished sentence",
    card !== null && card.handle.startsWith("Player #") && card.eligible === true
      && card.funded !== null && card.funded.word === "Funded"
      && typeof card.openPositions === "string" && card.continueReason === null,
    j({ handle: card && card.handle, funded: card && card.funded, open: card && card.openPositions }));
  ok("1.359 · a viewer OUTSIDE the audience receives `null` and nothing else — no handle, no phone, no sentence and no id",
    refusedCard === null && all(refusedCard) === "null" && !all(refusedCard).includes(good), j(all(refusedCard)));
  /* ⛔ THE PHONE CROSSES AS A RAW SERVER-ONLY FIELD, because the platform's own SERVER `Sensitive` is what computes
   * the mask and calls `readCell`. A reader that handed the page a pre-masked triple would move READ-TIERS into a
   * `.tsx`, which `sensitive.tsx` forbids in as many words (359, corrected). */
  ok("1.359 · the phone arrives RAW as a server-only field, so the platform's own `Sensitive` decides the mask — the reader never masks it and never names a read class",
    card !== null && typeof card.phoneE164 === "string" && card.phoneE164.startsWith("+255")
      && !/mask/i.test(all(card)), j({ shape: card && typeof card.phoneE164 }));
  /* ⛔ 459 · A FUNDED STATE, NEVER AN AMOUNT. The seeded balance is a unique figure; it must appear nowhere in the
   * painted card, in any form, and neither must a currency prefix. */
  const emptyCard = await GATEM.houseCheckForConsole(OFFICER, "/admin/desk", empty);
  ok("1.359 · 459 · the card paints a funded STATE in both polarities and NO amount — not the balance, not a compacted form, not a TZS prefix anywhere",
    card !== null && emptyCard !== null
      && card.funded.word === "Funded" && emptyCard.funded.word === "Not funded"
      && !all(card).includes("250000") && !all(card).includes("250,000") && !/TZS/.test(all(card))
      && !/TZS/.test(all(emptyCard)),
    j({ funded: card && card.funded.word, empty: emptyCard && emptyCard.funded.word }));
  /* ⛔ AND EVERY SENTENCE IS THE CONSOLE'S OWN (453): the service's rows for this same account name the feature. */
  const staffCard = await GATEM.houseCheckForConsole(OFFICER, "/admin/desk", staffer);
  const rawStaff = await ELIG.houseBotEligibility(staffer, { context: "designate", actorId: OFFICER });
  ok("1.359 · 453 · every blocking and warning sentence the card paints is the CONSOLE's own, and not one of them carries a house-vocabulary word",
    staffCard !== null && staffCard.eligible === false && staffCard.blocking.length >= 1
      && !NEUTRAL.test(all(staffCard.blocking)) && !NEUTRAL.test(all(staffCard.warnings))
      && staffCard.continueReason !== null,
    j({ blocking: staffCard && staffCard.blocking, reason: staffCard && staffCard.continueReason }));
  ok("1.359 · CONTROL · the SERVICE's own rows for that same account DO carry one, which is why the override exists",
    rawStaff.blocking.length >= 1 && NEUTRAL.test(all(rawStaff.blocking)),
    j(rawStaff.blocking.map((r: Any) => r.message).slice(0, 2)));
  /* ⛔ AND THE POPULATION IS DERIVED FROM THE SERVICE'S OWN UNIONS, never typed here: a code added to either list
   * later cannot reach an owner's screen as the shared sentence or as a bare identifier. */
  {
    const codes = [...ELIG.ELIGIBILITY_BLOCKING_CODES, ...ELIG.ELIGIBILITY_WARNING_CODES] as string[];
    const missing = codes.filter((c) => GATEM.consoleCheckSentence(c) === GATEM.consoleCheckSentence("zz_no_such_code"));
    const dirty = codes.filter((c) => NEUTRAL.test(GATEM.consoleCheckSentence(c)));
    ok("1.359 · 453 · the console has a sentence of its own for EVERY code in the service's two unions, and not one of them names the feature",
      codes.length >= 30 && missing.length === 0 && dirty.length === 0, j({ codes: codes.length, missing, dirty }));
    ok("1.359 · CONTROL · an invented code answers the neutral fallback, so the `missing` zero above is a measurement and not an empty scan",
      GATEM.consoleCheckSentence("zz_no_such_code").length > 20
        && !NEUTRAL.test(GATEM.consoleCheckSentence("zz_no_such_code")),
      GATEM.consoleCheckSentence("zz_no_such_code"));
  }
  /* ⛔ 356 · EXACTLY ONE WALLET READ FOR THE WHOLE CARD, and it is the one `houseBotEligibility` already takes. */
  {
    const spyW = { wallet: 0, user: 0 };
    const origW = { wallet: w.db.wallet.findByUserId, user: w.db.user.findById };
    try {
      w.db.wallet.findByUserId = (...a: Any[]) => { spyW.wallet++; return origW.wallet.apply(w.db.wallet, a as Any); };
      w.db.user.findById = (...a: Any[]) => { spyW.user++; return origW.user.apply(w.db.user, a as Any); };
      await GATEM.houseCheckForConsole(OFFICER, "/admin/desk", good);
    } finally {
      w.db.wallet.findByUserId = origW.wallet; w.db.user.findById = origW.user;
    }
    ok("1.356 · the wizard's check card performs EXACTLY ONE wallet read, and it is the one the eligibility check already takes",
      spyW.wallet === 1, j(spyW));
    ok("1.356 · CONTROL · the same render fired `db.user` reads through the very object the wallet spy watches, so the ONE above is a measurement on the module under test",
      spyW.user >= 2, j(spyW));
  }

  /* ━━ 1.359 · A `?u=` WITH NO ACCOUNT BEHIND IT IS A STATE, NOT A CARD OF FACTS ABOUT NOTHING ━━━━━━━━
   * Read off the first render (355, 416): the card painted a HANDLE built out of the typed id, an EMPTY "Phone"
   * term with nothing under it, and "Open positions 0" for an account that does not exist — a fabricated zero
   * beside a labelled row that says nothing. */
  {
    const nothing = await GATEM.houseCheckForConsole(OFFICER, "/admin/desk", "usr_no_such_account_at_all");
    ok("1.359 · 355 · a `?u=` with no account behind it answers `accountMissing`, and the page has one honest thing to paint: the cause",
      nothing !== null && nothing.accountMissing === true && nothing.eligible === false
        && nothing.blocking.length === 1 && nothing.blocking[0].code === "ACCOUNT_MISSING"
        && nothing.phoneE164 === null, j({ missing: nothing && nothing.accountMissing, blocking: nothing && nothing.blocking }));
    ok("1.359 · CONTROL · a REAL account answers the opposite on both flags, so the state above is a measurement and not a shape every card carries",
      card !== null && card.accountMissing === false && card.phoneE164 !== null, j({ missing: card && card.accountMissing }));
  }

  /* ━━ 1.387 · THE PICKER IS NEUTRAL AND IS NOT AN ENUMERATION ORACLE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
  {
    const hit = await GATEM.houseAccountsForConsole(OFFICER, "/admin/desk", good);
    const miss = await GATEM.houseAccountsForConsole(OFFICER, "/admin/desk", "usr_no_such_account_at_all");
    const refusedHit = await GATEM.houseAccountsForConsole(outsider, "/admin/desk", good);
    const refusedMiss = await GATEM.houseAccountsForConsole(outsider, "/admin/desk", "usr_no_such_account_at_all");
    const refusedUnknown = await GATEM.houseAccountsForConsole(outsider, "/admin/desk", "hb_0123456789abcdef01234567");
    ok("1.387 · the owner's search finds the account by its id and paints the handle alone — never a name, a phone or an email",
      hit.rows.length === 1 && hit.rows[0].userId === good && hit.rows[0].handle.startsWith("Player #")
        && hit.rows[0].reason === null && !/\+255/.test(all(hit)), j(hit));
    ok("1.387 · for a caller OUTSIDE the audience a matching query, a non-matching query and an unknown id answer IDENTICALLY — and identically to the owner's own empty answer",
      all(refusedHit) === all(refusedMiss) && all(refusedMiss) === all(refusedUnknown)
        && all(refusedHit) === all(miss) && refusedHit.rows.length === 0 && refusedHit.count === "",
      j({ refusedHit, miss }));
    ok("1.387 · CONTROL · the owner CAN tell those two apart, which is what makes the identity above a measurement",
      all(hit) !== all(miss) && hit.count.length > 0 && miss.count === "", j({ hit: hit.count, miss: miss.count }));
    /* ⛔ AN OPTION THAT CANNOT BE CHOSEN SAYS SO, from the account row and the ONE roster read — never a per-row
     * eligibility check, which would pull ten players' balances and settings into a lookup. */
    const staffHit = await GATEM.houseAccountsForConsole(OFFICER, "/admin/desk", staffer);
    ok("1.387 · an option that cannot be chosen carries its reason, and the reason names no feature word",
      staffHit.rows.length === 1 && typeof staffHit.rows[0].reason === "string"
        && !NEUTRAL.test(all(staffHit)) && staffHit.count.includes("cannot be chosen"), j(staffHit));
    /* ⛔ A ONE-CHARACTER QUERY READS NOTHING AT ALL — the officer has not asked a question yet.
       ⛔ AND "TAKES NO READ" IS NOW MEASURED, NOT ASSERTED IN A TITLE (C7 step 6 review,
       test-strength-picker-floor). The case checked the SHAPE of the answer and nothing else, so the half of the
       label that names the property worth having was the half nothing tested. */
    const spyQ = { users: 0, roster: 0 };
    const origQ = { users: w.db.user.list, roster: w.dal.houseBotStore.listNonRemoved };
    let short: Any = null;
    try {
      w.db.user.list = (...a: Any[]) => { spyQ.users++; return origQ.users.apply(w.db.user, a as Any); };
      w.dal.houseBotStore.listNonRemoved = (...a: Any[]) => { spyQ.roster++; return origQ.roster.apply(w.dal.houseBotStore, a as Any); };
      short = await GATEM.houseAccountsForConsole(OFFICER, "/admin/desk", "a");
    } finally {
      w.db.user.list = origQ.users; w.dal.houseBotStore.listNonRemoved = origQ.roster;
    }
    const belowFloor = { ...spyQ };
    try {
      w.db.user.list = (...a: Any[]) => { spyQ.users++; return origQ.users.apply(w.db.user, a as Any); };
      w.dal.houseBotStore.listNonRemoved = (...a: Any[]) => { spyQ.roster++; return origQ.roster.apply(w.dal.houseBotStore, a as Any); };
      await GATEM.houseAccountsForConsole(OFFICER, "/admin/desk", good);
    } finally {
      w.db.user.list = origQ.users; w.dal.houseBotStore.listNonRemoved = origQ.roster;
    }
    ok("1.387 · a query under the floor answers with no rows, no count and no sentence — and takes no read",
      short.rows.length === 0 && short.note === null && short.count === ""
        && belowFloor.users === 0 && belowFloor.roster === 0,
      j({ short, belowFloor }));
    ok("1.387 · CONTROL · a query AT the floor fires both of those reads through the very objects the spy watches, so the zeros above are a measurement and not an unreached patch",
      spyQ.users >= 1 && spyQ.roster >= 1, j(spyQ));
  }

  /* ━━ 1.383 · EVERY DOOR IS A PLAYER-CALLABLE ENDPOINT, AND ITS REFUSAL IS NOT AN ORACLE ━━━━━━━━━━━━━━━━━ */
  {
    const before = (await w.dal.houseBotStore.listNonRemoved()).length;
    const real = await GATEM.houseDesignateForConsole(outsider, "/admin/desk", { userId: good, label: "Desk one", password: "whatever" });
    const invented = await GATEM.houseDesignateForConsole(outsider, "/admin/desk", { userId: "usr_no_such_account_at_all", label: "Desk one", password: "whatever" });
    const after = (await w.dal.houseBotStore.listNonRemoved()).length;
    ok("1.383 · a caller outside the audience receives ONE fixed refusal — no field, no href, no id, no count and no existence signal — and it is the same answer for a real account and an invented one",
      real.ok === false && all(real) === all(invented)
        && (real as Any).field === undefined && (real as Any).href === undefined
        && !all(real).includes(good) && !NEUTRAL.test(all(real)), j(real));
    ok("1.383 · …and that path wrote NOTHING: the roster is unchanged on both sides of it",
      before === after, j({ before, after }));
    ok("1.383 · CONTROL · the OWNER's own refusal for the same input is a DIFFERENT answer, so the two above are a measurement and not an unreached door",
      await (async () => {
        const owned = await GATEM.houseDesignateForConsole(OFFICER, "/admin/desk", { userId: good, label: "Desk one", password: "definitely-wrong" });
        return owned.ok === false && all(owned) !== all(real) && (owned as Any).field === "password";
      })(), "");
    /* ⛔ AND THE LABEL'S SHAPE IS REFUSED BEFORE A PASSWORD ATTEMPT IS SPENT, in the console's own words. */
    /* ⛔ AND THE SENTENCE IS THE ONE ONLY THE EARLY CHECK CAN PRODUCE (C7 step 6 review,
       test-strength-383-label-late). `field === "label"` alone could not fail: with the console's own
       `validateLabel` removed the call falls through to `designateHouseBot`, whose FIRST two lines validate the
       same label and answer the same `field`, and the console maps that to `labelTaken`. So the assertion pinned a
       shape both paths produce and its declared mutation could never redden it. The LENGTH sentence belongs to the
       console's early check; `labelTaken` is what the late path says. ⛔ And the holder's own attempt counter is
       read on both sides, because "before a password attempt is spent" is a claim about the holder's reserve. */
    const beforeAttempts = ((await w.db.user.findById(good)) as Any)?.failedLoginCount ?? 0;
    const shortLabel = await GATEM.houseDesignateForConsole(OFFICER, "/admin/desk", { userId: good, label: "x", password: "" });
    const afterAttempts = ((await w.db.user.findById(good)) as Any)?.failedLoginCount ?? 0;
    ok("1.383 · a mistyped name is refused on its own field, in the console's own words, before a password attempt is spent",
      shortLabel.ok === false && (shortLabel as Any).field === "label" && !NEUTRAL.test(all(shortLabel))
        && (shortLabel as Any).error === GATEM.CONSOLE_DESIGNATE_LABEL_LENGTH
        && afterAttempts === beforeAttempts,
      j({ shortLabel, beforeAttempts, afterAttempts }));
    ok("1.383 · CONTROL · the LATE path says something else entirely — a name the console's own check accepts and the roster refuses answers `labelTaken`, so the sentence above is the early check's and not a shape both paths share",
      GATEM.CONSOLE_DESIGNATE_LABEL_LENGTH !== GATEM.CONSOLE_DESIGNATE_LABEL_TAKEN
        && GATEM.CONSOLE_DESIGNATE_LABEL_LENGTH.length > 20,
      j({ early: GATEM.CONSOLE_DESIGNATE_LABEL_LENGTH, late: GATEM.CONSOLE_DESIGNATE_LABEL_TAKEN }));
  }

  /* ━━ 1.359 · AND THE DESIGNATION ITSELF LANDS, WHICH IS WHAT MAKES EVERY REFUSAL ABOVE A REFUSAL ━━━━━━━━━ */
  {
    const done = await GATEM.houseDesignateForConsole(OFFICER, "/admin/desk", { userId: good, label: "Desk one", password: PW });
    ok("1.359 · the owner's own designation LANDS, with a neutral note and the new account's own page as its way on",
      done.ok === true && typeof (done as Any).href === "string" && !NEUTRAL.test(all(done)), j(done));
    if (done.ok) {
      /* ⛔ AND THE SECOND ATTEMPT ON THE SAME ACCOUNT IS REFUSED IN THE CONSOLE'S OWN WORDS — the service's own
         sentence for this case reads "This account is already a house bot." */
      const again = await GATEM.houseDesignateForConsole(OFFICER, "/admin/desk", { userId: good, label: "Desk two", password: PW });
      ok("1.359 · 453 · a second designation of the same account is refused in the CONSOLE's words, never the service's",
        again.ok === false && !NEUTRAL.test(all(again)), j(again));
      /* ⛔ AND THE PICKER NOW SAYS SO ON THE OPTION ITSELF, from the one roster read. */
      const now = await GATEM.houseAccountsForConsole(OFFICER, "/admin/desk", good);
      ok("1.387 · an account already on the desk comes back as an option that cannot be chosen, decided on the ONE roster read",
        now.rows.length === 1 && now.rows[0].reason !== null && !NEUTRAL.test(all(now)), j(now));
      STATES.push(["wizard-copy", GATEM.CONSOLE_WIZARD_COPY]);
      STATES.push(["wizard-check", card]);
      STATES.push(["wizard-check-blocked", staffCard]);
      STATES.push(["wizard-picker", now]);
    }
  }

  /* ━━ ⭐ C7 STEP 6 · WHAT THE REVIEW MEASURED — every one of these had no case at all ━━━━━━━━━━━━━━━━━━━━━ */

  /* ⛔ 259 · A REFUSED VIEWER TAKES NO READ, not merely an empty answer. Ruling 359's Proof is two halves —
     "a PLAYER calling the reader gets `null` AND the spy records zero store calls" — and only the first was
     asserted, so an edit that moved the verdict BELOW the settled read set would have kept the case green while
     pulling a player's wallet, roster rows and positions for a viewer who may not see any of them. */
  {
    const spyR = { wallet: 0, positions: 0, roster: 0 };
    const orig = {
      wallet: w.db.wallet.findByUserId,
      positions: w.mdal.positionStore.countOwnOpenForUser,
      roster: w.dal.houseBotStore.listByUserId,
    };
    let refusedReads = { wallet: -1, positions: -1, roster: -1 };
    try {
      w.db.wallet.findByUserId = (...a: Any[]) => { spyR.wallet++; return orig.wallet.apply(w.db.wallet, a as Any); };
      w.mdal.positionStore.countOwnOpenForUser = (...a: Any[]) => { spyR.positions++; return orig.positions.apply(w.mdal.positionStore, a as Any); };
      w.dal.houseBotStore.listByUserId = (...a: Any[]) => { spyR.roster++; return orig.roster.apply(w.dal.houseBotStore, a as Any); };
      await GATEM.houseCheckForConsole(outsider, "/admin/desk", empty);
      refusedReads = { ...spyR };
      await GATEM.houseCheckForConsole(OFFICER, "/admin/desk", empty);
    } finally {
      w.db.wallet.findByUserId = orig.wallet;
      w.mdal.positionStore.countOwnOpenForUser = orig.positions;
      w.dal.houseBotStore.listByUserId = orig.roster;
    }
    ok("1.359 · 259 · a viewer OUTSIDE the audience takes ZERO reads — no wallet, no roster row and no position count, not merely an empty answer",
      refusedReads.wallet === 0 && refusedReads.positions === 0 && refusedReads.roster === 0, j(refusedReads));
    ok("1.359 · CONTROL · the OWNER's own call fired every one of those three through the very objects the spy watches, so the zeros above are a measurement and not an unreached patch",
      spyR.wallet >= 1 && spyR.positions >= 1 && spyR.roster >= 1, j(spyR));
  }

  /* ⛔ 387 · THE REFUSAL IS IDENTICAL FOR EVERY NON-OWNER ROLE, not only for a PLAYER. Ruling 387's Proof names
     EIGHT, and the case exercised one — so a role-specific hole in the audience (the `canView(role, "ops")` branch
     ruling 341 exists to close) would not have been reported here. */
  {
    const NON_OWNER = [...ROLES.STAFF_ROLES.filter((r: string) => r !== "ADMIN"), "PLAYER", "AGENT"] as string[];
    const shapes: string[] = [];
    for (const role of NON_OWNER) {
      const who = await w.user({ role });
      for (const q of [good, "usr_no_such_account_at_all", "hb_0123456789abcdef01234567"]) {
        shapes.push(all(await GATEM.houseAccountsForConsole(who, "/admin/desk", q)));
      }
    }
    const ownerHit = await GATEM.houseAccountsForConsole(OFFICER, "/admin/desk", good);
    ok("1.387 · the picker's refusal is BYTE-IDENTICAL for all eight non-owner roles × three query shapes — a matching query, a non-matching one and an unknown id",
      NON_OWNER.length === 8 && shapes.length === 24 && new Set(shapes).size === 1, j({ roles: NON_OWNER, shapes: [...new Set(shapes)] }));
    ok("1.387 · CONTROL · the OWNER's own answer for the first of those queries is a DIFFERENT shape, so the identity above is a measurement over a population that really ran",
      all(ownerHit) !== shapes[0] && ownerHit.rows.length >= 1, j({ owner: ownerHit.count }));
  }

  /* ⛔ 387(e) · THE PICKER'S RATE RULE IS THE NAMED CONTROL, AND IT FAILS OPEN WHEN IT IS GONE. `rateCheckAsync`
     returns `{ allowed: true }` for an unknown key, so deleting or renaming the rule silently switches the control
     off with every suite still green — and nothing anywhere named it. */
  {
    const rule = RATEM.RATE_RULES["desk.picker"] as Any;
    ok("1.387(e) · the picker's rate rule EXISTS, is keyed on the CALLER, and is no looser than the burst and rate it was written with",
      typeof rule?.capacity === "number" && rule.capacity <= 30 && typeof rule.refillPerMin === "number" && rule.refillPerMin <= 15,
      j(rule));
    ok("1.387(e) · CONTROL · an unknown key is ALLOWED by the same checker, which is exactly why the rule's existence has to be asserted rather than assumed",
      (await RATEM.rateCheckAsync("whoever", "desk.picker.no.such.rule" as Any)).allowed === true, "");
    /* ⛔ AND A BUSY BUCKET IS NOT AN EMPTY RESULT (d19-hunt-03). The officer is inside the audience; telling them
       "Nothing to show." about accounts that exist is a false statement on the screen that admits an account.
       ⚠️ THE BUCKET IS EXHAUSTED ON AN OWNER OF ITS OWN, because the rule is keyed on the CALLER (387(e)) — spending
       `OFFICER`'s allowance here would leave every later picker case in this file answering BUSY, which is the
       fixture-artefact-as-assertion trap. That the two callers do not share a bucket is itself the ruling. */
    const burner = await w.user({ role: "ADMIN" });
    let busy: Any = null;
    for (let i = 0; i <= (rule?.capacity ?? 30) + 1 && busy === null; i++) {
      const a = await GATEM.houseAccountsForConsole(burner, "/admin/desk", good);
      if (a.note === GATEM.CONSOLE_PICKER_BUSY) busy = a;
    }
    ok("1.387(e) · CONTROL · the bucket really is keyed on the CALLER — one owner exhausted it and another owner's very next lookup still answers",
      await (async () => {
        const other = await GATEM.houseAccountsForConsole(OFFICER, "/admin/desk", good);
        return other.note !== GATEM.CONSOLE_PICKER_BUSY;
      })(), "");
    ok("1.387(e) · a rate-limited lookup answers its OWN sentence — never the refusal's, which would tell an owner inside the audience that accounts which exist do not",
      busy !== null && busy.note === GATEM.CONSOLE_PICKER_BUSY && busy.rows.length === 0 && busy.count === ""
        && GATEM.CONSOLE_PICKER_BUSY !== GATEM.CONSOLE_PICKER_EMPTY && !NEUTRAL.test(GATEM.CONSOLE_PICKER_BUSY),
      j(busy));
  }

  /* ⛔ 412 · THE TEN-OPTION BOUND, AND A COUNT THAT DOES NOT LIE ABOUT IT (d19-hunt-04). The count reported the
     rows SHOWN — "10 accounts" for a query that matched forty — on the one screen where an account the officer
     cannot see reads as an account that does not exist. And the slice took whichever ten the store happened to
     return: `db.user.list()` is `findMany` with no `orderBy` on Postgres and insertion order in memory, so the
     ten could differ between the twins and between two runs of the same query. */
  {
    let oneAnswer: Any = null;
    const bulkTag = `c7s6bulk${process.pid}`;
    const bulk: string[] = [];
    for (let i = 0; i < 12; i++) bulk.push(await w.user({ id: `usr_${bulkTag}_${i}`, role: "PLAYER" }));
    const wide = await GATEM.houseAccountsForConsole(OFFICER, "/admin/desk", bulkTag);
    const again = await GATEM.houseAccountsForConsole(OFFICER, "/admin/desk", bulkTag);
    ok("1.387 · 412 · the answer is capped at ten options and the count says so — the number MATCHED, not the number shown, and what to do about it",
      wide.rows.length === 10 && / of 12 accounts/.test(wide.count) && /narrow the search/.test(wide.count)
        && !NEUTRAL.test(wide.count), j({ rows: wide.rows.length, count: wide.count }));
    ok("1.387 · …and the ten that survive the slice are the same ten a second run returns, in one total order, on either store",
      j(wide.rows.map((r: Any) => r.userId)) === j(again.rows.map((r: Any) => r.userId))
        && j(wide.rows.map((r: Any) => r.userId)) === j([...wide.rows.map((r: Any) => r.userId)].sort()),
      j(wide.rows.map((r: Any) => r.userId)));
    ok("1.387 · CONTROL · a query that matches ONE says the plain count with no truncation clause, so the sentence above is chosen by the measurement and not always printed",
      await (async () => {
        const one = await GATEM.houseAccountsForConsole(OFFICER, "/admin/desk", bulk[0]);
        oneAnswer = one;
        return one.rows.length === 1 && one.count.startsWith("1 account") && !/ of /.test(one.count);
      })(), j(oneAnswer));
  }

  /* ⛔ 344 · "OPEN POSITIONS" IS COUNTED, NEVER PAGED. It was `listForUser(id, 100).filter(OPEN).length` — the
     hundred NEWEST positions of EVERY status — so an account whose settled positions are newer than its open ones
     rendered a number that was wrong and could read 0 beside a warning saying they hold some. */
  {
    const holder = await candidate({ balance: 100_000 });
    const mkt = await w.poll();
    const now = Date.now();
    const seed = async (i: number, status: string, minutesAgo: number, houseBotId: string | null = null) => {
      await w.mdal.positionStore.set({
        id: `pos_c7s6_${process.pid}_${i}`, userId: holder, marketId: mkt.id, side: "YES", stake: 1_000,
        potentialPayout: 1_500, status, finalPayout: status === "OPEN" ? null : 0,
        placedAt: new Date(now - minutesAgo * 60_000).toISOString(),
        settledAt: status === "OPEN" ? null : new Date(now - minutesAgo * 60_000).toISOString(),
        idempotencyKey: null, houseBotId,
      } as Any);
    };
    /* Three OPEN own positions, OLDER than four newer rows a page of that size would return instead. */
    await seed(1, "OPEN", 90); await seed(2, "OPEN", 80); await seed(3, "OPEN", 70);
    await seed(4, "WIN", 20); await seed(5, "LOSS", 15); await seed(6, "VOID", 10);
    const counted = await w.mdal.positionStore.countOwnOpenForUser(holder);
    const pagedThree = (await w.mdal.positionStore.listForUser(holder, 3)).filter((p: Any) => p.status === "OPEN" && p.houseBotId == null).length;
    const holderCard = await GATEM.houseCheckForConsole(OFFICER, "/admin/desk", holder);
    ok("1.344 · the check card's open-position figure comes from a COUNTING reader — three open, and a page of three over the same account answers zero because its newest three are settled",
      counted === 3 && pagedThree === 0 && holderCard !== null && holderCard.openPositions === "3",
      j({ counted, pagedThree, painted: holderCard && holderCard.openPositions }));
    /* ⛔ AND BOTH TWINS COUNT THE HOLDER'S OWN BOOK — a position the desk placed FROM the account is not one the
       holder is in. ⚠️ Asserted at SOURCE rather than by seeding a marked position: a marked OPEN row is a row
       every house exposure read in this process would then see, and a fixture that moves another assertion's
       population is worse than the one it proves. */
    ok("1.344 · …and the count is the holder's OWN book in BOTH twins — the memory filter and the SQL predicate each exclude a marked position",
      /countOwnOpenForUser\(userId\) \{[\s\S]{0,200}?houseBotId == null/.test(decomment(read("src/lib/server/market-dal.ts")))
        && /position\.count\(\{ where: \{ userId, status: "OPEN", houseBotId: null \} \}\)/.test(decomment(read("src/lib/server/market-dal.ts"))),
      "");
    /* ⛔ 356 · AND THE CARD TAKES THAT COUNT EXACTLY ONCE. */
    {
      const spyP = { count: 0 };
      const origP = w.mdal.positionStore.countOwnOpenForUser;
      try {
        w.mdal.positionStore.countOwnOpenForUser = (...a: Any[]) => { spyP.count++; return origP.apply(w.mdal.positionStore, a as Any); };
        await GATEM.houseCheckForConsole(OFFICER, "/admin/desk", holder);
      } finally { w.mdal.positionStore.countOwnOpenForUser = origP; }
      ok("1.356 · the wizard's check card takes the position COUNT exactly once", spyP.count === 1, j(spyP));
    }
  }

  /* ⛔ 355 · THE SETTLED SET'S FAILURE BRANCHES, WHICH HAD NO CASE AND NO MUTATION AT ALL. Ruling 355's whole
     point is that a failed read DEGRADES — it does not blank the card and it does not fabricate a zero — and three
     of its branches were unreachable by the fixture: the `UNREADABLE` blocking row, the em dash, and `funded`
     withheld when the balance cannot be read. */
  {
    const subject = await candidate({ balance: 5_000 });
    /* ⚠️ THE FAILURE IS PLANTED ON THE READ, NOT ON THE MODULE. An ESM namespace object's exports are read-only,
       so `houseBotEligibility` cannot be replaced — it is made to FAIL instead, on the subject's own row and on
       nobody else's, which is also closer to the production shape this branch exists for. */
    const origU = w.db.user.findById;
    let brokenElig: Any = null;
    try {
      w.db.user.findById = ((uid: string, ...rest: Any[]) => {
        if (uid === subject) throw new Error("the account row could not be read");
        return origU.apply(w.db.user, [uid, ...rest] as Any);
      }) as Any;
      brokenElig = await GATEM.houseCheckForConsole(OFFICER, "/admin/desk", subject);
    } finally { w.db.user.findById = origU; }
    ok("1.359 · 355 · a failed eligibility read is a BLOCKING ROW, not an eligible account — and it paints no funded state and no fabricated check",
      brokenElig !== null && brokenElig.eligible === false && brokenElig.blocking.length === 1
        && brokenElig.blocking[0].code === "UNREADABLE" && brokenElig.funded === null
        && brokenElig.continueReason !== null && !NEUTRAL.test(all(brokenElig)),
      j({ blocking: brokenElig && brokenElig.blocking, funded: brokenElig && brokenElig.funded }));

    const origC = w.mdal.positionStore.countOwnOpenForUser;
    let brokenPos: Any = null;
    try {
      w.mdal.positionStore.countOwnOpenForUser = async () => { throw new Error("the position count could not be read"); };
      brokenPos = await GATEM.houseCheckForConsole(OFFICER, "/admin/desk", subject);
    } finally { w.mdal.positionStore.countOwnOpenForUser = origC; }
    ok("1.359 · 355 · a failed position count renders an EM DASH, never a fabricated zero — and the rest of the card survives it",
      brokenPos !== null && brokenPos.openPositions === "—" && brokenPos.openPositions !== "0"
        && brokenPos.handle.startsWith("Player #"), j({ open: brokenPos && brokenPos.openPositions }));
    ok("1.359 · CONTROL · the same account with both reads working answers a NUMBER and a funded state, so the two degraded shapes above are measurements and not what every card looks like",
      await (async () => {
        const fine = await GATEM.houseCheckForConsole(OFFICER, "/admin/desk", subject);
        return fine !== null && fine.openPositions === "0" && fine.funded !== null && fine.blocking.every((r: Any) => r.code !== "UNREADABLE");
      })(), "");
    /* ⛔ AND A FAILED READ NEVER TAKES THE DOOR WITH IT (456, 459). `holderHref` and the bonus fact are not reads,
       so they stand in every one of these branches — the page used to hide both behind `funded !== null`. */
    ok("1.359 · 456 · the way to the holder's own money screen and the bonus fact survive EVERY failed read — they are facts, not reads",
      brokenElig !== null && brokenPos !== null
        && brokenElig.holderHref.length > 0 && brokenElig.bonusCaption.length > 20
        && brokenPos.holderHref === brokenElig.holderHref && brokenPos.bonusCaption === brokenElig.bonusCaption,
      j({ href: brokenElig && brokenElig.holderHref }));
  }

  /* ⛔ 412 · THE SUBMIT CLAIM IS A PROPERTY OF THE PRESS, NOT OF WHAT WAS TYPED INTO IT. The wizard sent
     `${userId}:${label}` — recomputed identically on every attempt — and `verifyHouseBotPassword` claims a
     `submitId` ONCE, durably, BEFORE the password is checked, with no path that gives it back. So one wrong
     password burned the key and every later attempt for that account and that name answered DUPLICATE_SUBMIT. */
  {
    const victim = await candidate({ balance: 60_000 });
    const reused = `${victim}:Desk reuse`;
    const wrong = await GATEM.houseDesignateForConsole(OFFICER, "/admin/desk", { userId: victim, label: "Desk reuse", password: "definitely-wrong", submitId: reused });
    const retrySame = await GATEM.houseDesignateForConsole(OFFICER, "/admin/desk", { userId: victim, label: "Desk reuse", password: PW, submitId: reused });
    const retryFresh = await GATEM.houseDesignateForConsole(OFFICER, "/admin/desk", { userId: victim, label: "Desk reuse", password: PW, submitId: `${reused}:2` });
    ok("1.412 · a `submitId` is spent ONCE — the right password behind a reused claim is refused, and the same right password behind a fresh claim LANDS",
      wrong.ok === false && retrySame.ok === false && retryFresh.ok === true,
      j({ wrong: (wrong as Any).error, retrySame: (retrySame as Any).error, retryFresh: retryFresh.ok }));
    ok("1.412 · …so the wizard mints a NEW nonce for every armed attempt and spends it on refusal — it never derives one from the account and the typed name",
      await (async () => {
        const c = decomment(read(NEW_CLIENT));
        return /submitId: attempt\.current/.test(c)
          && /attempt\.current = ""/.test(c)
          && !/submitId: `\$\{userId\}/.test(c)
          && /const newAttemptNonce = \(\): string =>/.test(c);
      })(), "");
  }
} catch (err) {
  ok("1.359 · the wizard's fixture ran", false, String((err as Any)?.stack ?? err).replace(/\s+/g, " ").slice(0, 400));
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
    /* ⚠️ `rows` IS NOT ONE SHAPE ANY MORE (C7 step 6). The roster's row carries three usage cells; the wizard's
       picker row carries a handle and a refusal. A scanner that assumed one shape CRASHED on the other — measured
       here the day the wizard's states joined the list — and a crash in §3 skips §4's whole source law. So each
       row contributes what it HAS, and the picker's own strings are scanned rather than dropped. */
    ...(view.rows ?? []).flatMap((r: Any) => [r.statusWord, r.products, r.handle, r.reason,
      ...[r.lossCell, r.exposureCell, r.betsCell].filter(Boolean).flatMap((c: Any) => [c.text, c.edgeText,
        ...(c.halves ?? []).flatMap((h: Any) => [h.word, h.suffix])])]),
    /* ⭐ C7 step 6 · THE WIZARD'S OWN COPY. Every blocking and warning sentence the check card paints is the
       CONSOLE's own override of `eligibility.ts`'s rows, ELEVEN of which name the feature — so this is the branch
       most likely to break 453 on this checkpoint, exactly as the limits panel was on the last one. */
    ...(view.blocking ?? []).flatMap((r: Any) => [r.code, r.text]),
    ...(view.warnings ?? []).flatMap((r: Any) => [r.code, r.text]),
    view.funded?.word, view.funded?.sentence, view.bonusCaption, view.priorNote, view.continueReason, view.count,
    view.handle, view.openPositions, view.note,
    /* ⭐ C7 step 6, FIXED · THE WIZARD'S CONSENT AND REVIEW COPY. Ruling 388's Proof moved every sentence longer
       than a label out of the `"use client"` file and onto the server, which is where it belongs — and the moment
       it moved, four paragraphs describing what the holder is agreeing to became SERVER copy that 453 must scan.
       A branch that is not in this list is outside the strictest scan the console has. */
    ...(view.consentBullets ?? []),
    view.searchLabel, view.searchHint, view.searchIntro, view.listLabel, view.consentTitle, view.labelLabel,
    view.labelHint, view.noteLabel, view.noteHint, view.reviewTitle, view.passwordLabel, view.passwordHint,
    view.refusedTitle, view.wayOut,
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
    /* ⭐ C7 STEP 5 · THE TWO PANELS' OWN COPY. Both are built from tables the console had to write for itself:
       the event word map is TOTAL over 30 kinds because the lexicon is structurally BLIND to one of them, and the
       outcome sentence map is TOTAL over 64 engine codes because `feed-copy.ts`'s own table names the feature in
       more than twenty rows. Those are the two branches most likely to break 453 on this checkpoint, so leaving
       them out of the strictest scan the console has would be the silent-hole class 513 and 539 both record. The
       rail's group labels and option labels are here too — a filter label is copy, and it reaches the DOM. */
    ...(view.feedFilters ?? []).flatMap((g: Any) => [g.label, ...(g.options ?? []).map((o: Any) => o.label)]),
    view.feedEmpty?.title, view.feedEmpty?.body, view.historyEmpty?.title, view.historyEmpty?.body,
    ...(view.feed ?? []).flatMap((r: Any) => [r.when, r.whenTitle, r.stake, r.statusWord, r.typeWord, r.productWord, r.note]),
    ...(view.history ?? []).flatMap((r: Any) => [r.when, r.whenTitle, r.eventWord, r.change, r.who, r.moneyHref]),
    ...Object.values(view.feedParams ?? {}), ...Object.values(view.historyParams ?? {}),
    /* ⛔ AND THE WHOLE OF BOTH TOTAL MAPS, NOT ONLY THE ROWS THIS FIXTURE HAPPENED TO PAINT. A word map scanned
       through its rendered rows is scanned at whatever coverage the fixture reached; scanned whole it is scanned
       at 100%, which is the only coverage a TOTAL map is worth having. */
    ...Object.values(GATEM.CONSOLE_EVENT_WORD as Record<string, string>),
  ].filter((s: unknown): s is string => typeof s === "string");

  const fresh = await GATEM.houseRosterForConsole(OFFICER, "/admin/desk");
  const scanned: Array<[string, string[]]> = [["fresh", copyOf(fresh)], ...STATES.map(([n, v]) => [n, copyOf(v)] as [string, string[]])];
  const hits = scanned.flatMap(([n, c]) => c.filter((s) => NEUTRAL.test(s)).map((s) => `${n}: ${s}`));
  const total = scanned.reduce((n, [, c]) => n + c.length, 0);
  /* ⛔ THE FLOOR IS OVER THE STATES AND THE STRINGS BOTH: a scan of one state, or of a view whose branches are all
   * null, is not a scan. Sixteen states were produced above; each carries at least a sentence and four tile labels. */
  ok("3.453 · not one painted string of ANY state carries a house-vocabulary word, or the words bot, house, liquidity or counter-stake",
    /* ⭐ THE FLOORS ROSE WITH C7 STEP 4's OWN STATES: 24/1528 at step 3, 32 states and 2,128 strings measured with
       the account page's five — active, both floor branches, settlement-blocked and removed — in the list.
       ⭐ AND AGAIN AT C7 STEP 6's FIX, to what the run PRINTED on BOTH stores: 36 states and 2,646 strings, with
       the wizard's own copy object in the list. The state floor had risen at step 6 while the STRING floor had
       not, so the branch the step's own comment called "most likely to break 453" sat inside a scan that could
       have lost ~20 strings to a field rename and still read as compliance. A floor only ever rises, and only to
       a count a run printed.
       ⭐ AND AGAIN AT C7 STEP 5's ACCOUNT HALF, to what THIS pass printed on BOTH stores: 40 states and 4,883
       strings, with the activity panel's rows, the history panel's rows, the rail's own labels, both empty states
       and the whole of the TOTAL event-word map in the list. The two panels' copy would otherwise have contributed
       ZERO strings while `hits.length === 0` still read as compliance — the silent-hole class rulings 513 and 539
       both record, and the reason both halves of the floor are raised together. */
    scanned.length >= 40 && total >= 4_883 && hits.length === 0, j({ states: scanned.length, scanned: total, hits }));
  /* ⛔ AND THE BRANCHES MOST LIKELY TO CARRY ONE ARE PROVEN PRESENT IN THE SCAN, by name — a state list that quietly
   * stopped producing the OFF sentence or an empty state would otherwise read as compliance. */
  const seen = new Set(scanned.flatMap(([, c]) => c));
  ok("3.453 · …and the scan really did include the OFF sentence, an unset-limit delta, the roster-full sentence, an `unavailable` value and an empty state",
    seen.has("The desk is off. Nothing will be staked.")
      && [...seen].some((s) => /nothing can be staked until this limit is set/.test(s))
      && [...seen].some((s) => /The roster is full/.test(s))
      && seen.has("n/a") && seen.has("No accounts yet") && seen.has("No roster")
      /* ⭐ C7 step 6, FIXED · AND THE WIZARD'S OWN FOUR, BY VALUE. The states joined the scan at step 6 and the
         presence control did not follow them, so a field rename on the view model would have dropped the console's
         thirty-two eligibility sentences and all four consent paragraphs out of the scan with `hits.length === 0`
         still reading as compliance. */
      && seen.has("This is a staff account. Only a player's own account can be used here.")
      && seen.has("There is money in this wallet, so a stake can be funded from it.")
      && seen.has("Bonus money is never staked from the desk, whatever the wallet holds.")
      && seen.has("Nothing is staked until an officer starts this account and the desk's master switch is on.")
      && seen.has("Already on the desk"),
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
  /* ⛔ `pageRaw`, `pageCode` and `panelOf` are the TOP-LEVEL ones, declared once above §2e3 — this block used to
     own them, and that scoping is what aborted the Postgres child. Nothing is re-read here on purpose. */
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
    /* ⭐ THE FLOOR ROSE WITH C7 STEP 6's OWN WALK: 597 at step 4, **1,332 measured** with the wizard's four files
       inside the population. A floor only ever rises, and only to a count a run PRINTED — which is why the count is
       now the FIRST thing the extra prints. */
    allLits.length >= 1_332 && litHits.length === 0
      && sectionFiles.length >= 10
      && [PAGE, LAYOUT, LOADING, LIVE, DETAIL_PAGE, NEW_PAGE, NEW_LOADING, NEW_ACTIONS, NEW_CLIENT].every((f) => sectionFiles.includes(f))
      && sectionUnscannable.length === 0 && lexiconFiles.length === sectionFiles.length + 1,
    /* ⛔ THE COUNT COMES FIRST, because `j()` truncates at 260 characters and the walked FILE LIST pushed
       `literals` off the end — so the number a later session must raise the floor TO was the one number this line
       never printed. A floor that can only be raised to a printed count needs the count printed. */
    j({ literals: allLits.length, files: lexiconFiles.length, section: sectionFiles.length, hits: litHits, unscannable: sectionUnscannable, walked: sectionAllFiles }));
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
  /* ⭐ RE-EXPRESSED AT C7 STEP 4b, AND IT IS A SECOND BELT RATHER THAN A WEAKENING. This read "without the prop the
   * gate would head its panel with the raw record id", measured on the resolver — and replan ruling 548 has since
   * made the resolver itself mask this section's ids, so that sentence is no longer true HERE. The REASON the prop
   * exists is unchanged and is still measured, on a section that declares no mask; what this now also pins is that
   * BOTH mechanisms are in place on the desk, so losing either one alone still leaves the panel neutral. An
   * assertion whose premise a later fix invalidates must be re-aimed at the same subject, never deleted and never
   * quietly satisfied by the thing it was written to catch. */
  ok("1.301 · 548 · the resolver still paints a raw record id for a section that declares no mask — the reason the gate's `title` prop exists, measured rather than assumed",
    NAV.crumbsFromPath("/admin/kyc/hb_0123456789abcdef01234567").at(-1) === "hb_0123456789abcdef01234567"
      && NAV.crumbsFromPath("/admin/desk").at(-1) === "Desk", j(NAV.crumbsFromPath("/admin/kyc/hb_0123456789abcdef01234567")));
  ok("1.301 · 548 · …and on THIS section the id is neutral for two independent reasons: the gate is handed a literal title, and the crumb builder masks the segment — so losing either alone still leaves the panel neutral",
    NAV.crumbsFromPath(ID_PATH).at(-1) === "Account"
      && /<AdminSectionGate title="Desk">/.test(decomment(read(LAYOUT))), j(NAV.crumbsFromPath(ID_PATH)));
  ok("1.301 · …so the section layout passes the neutral section word itself, as a literal, and adds no condition of its own",
    /<AdminSectionGate title="Desk">\{children\}<\/AdminSectionGate>/.test(decomment(read(LAYOUT)))
      && !/isAdmin|houseConsoleAudience|currentSession/.test(decomment(read(LAYOUT))), "");
  ok("1.301 · …and the gate's `title` prop is OPTIONAL, so no other section changes",
    /title\?: string/.test(read("src/components/admin/admin-section-gate.tsx"))
      && /titleProp \?\? crumbsFromPath/.test(read("src/components/admin/admin-section-gate.tsx")), "");

  /* ━━ ⛔ 551(a) · A REFUSAL MAY NOT HAND THE RECORD ID BACK IN ITS OWN REDIRECT TARGET ━━━━━━━━━━━━━━━━━━━━━
   * MEASURED, not predicted: `qa:house-bot-console-probe` printed `leaks: 96` = 8 route instances × 4 non-admin
   * viewers × 3 transports, and for the player, the holder and a trigger player every single body was
   * `NEXT_REDIRECT;replace;/auth/admin?next=%2Fadmin%2Fdesk%2Fhb_1d2a…;307;`. The admin shell carries a deep-link
   * destination through the login gate, and on a record route that destination IS the record id.
   * ⚠️ The id was in the URL the viewer themselves requested, so no refusal ever told anyone an id they did not
   * hold — this is ruling 548's screenshot-and-log channel, not ruling 259's payload class. It is fixed anyway:
   * the section serves a refused officer just as well, and it empties three quarters of the probe's population.
   * ⛔ THE POPULATION IS `ID_CRUMB`'s, so the rule cannot be re-landed by a new id prefix, and BOTH directions are
   * pinned: the desk loses its id, and a section that paints its ids keeps its deep link. */
  {
    const dest = (p: string): string => NAV.adminNextDest(p);
    ok("1.551a · the desk's refusal destination is the SECTION — the record id is gone from the `next=` target, with the record's tab",
      dest(ID_PATH) === "/admin/desk" && dest(`${ID_PATH}?tab=targets`) === "/admin/desk"
        && !dest(ID_PATH).includes("hb_"), j({ bare: dest(ID_PATH), tabbed: dest(`${ID_PATH}?tab=targets`) }));
    ok("1.551a · …and the SECTION's own deep link is untouched, so nothing legitimate is lost",
      dest("/admin/desk") === "/admin/desk" && dest("/admin/desk?tab=limits") === "/admin/desk?tab=limits",
      j([dest("/admin/desk"), dest("/admin/desk?tab=limits")]));
    ok("1.551a · CONTROL · a section that does NOT mask its ids still keeps its deep link whole — this is a declared rule, not a blanket truncation of every admin URL",
      dest("/admin/kyc/hb_0123456789abcdef01234567") === "/admin/kyc/hb_0123456789abcdef01234567"
        && dest("/admin/players/usr_6e2412ab?tab=audit") === "/admin/players/usr_6e2412ab?tab=audit",
      j([dest("/admin/kyc/hb_0123456789abcdef01234567"), dest("/admin/players/usr_6e2412ab?tab=audit")]));
    /* ⛔ AND EVERY `next=` THE ADMIN SHELL BUILDS GOES THROUGH IT. Four sites build one — two login redirects and
       the TOTP step-up in the layout, and the action guard's own. A site that skipped the helper would leak on
       exactly the request that reached it, so the population is counted from disk, not trusted. */
    const layoutSrc = decomment(read("src/app/admin/layout.tsx"));
    const guardSrc = decomment(read("src/lib/server/admin-guard.ts"));
    const built = (src: string): number => (src.match(/next=\$\{encodeURIComponent\(/g) ?? []).length;
    const viaHelper = (src: string): number => (src.match(/next=\$\{encodeURIComponent\(adminNextDest\(/g) ?? []).length;
    ok("1.551a · every `next=` target the admin shell builds is passed through `adminNextDest` — none is built from the raw href",
      built(layoutSrc) === 3 && viaHelper(layoutSrc) === 3 && built(guardSrc) === 1 && viaHelper(guardSrc) === 1,
      j({ layout: [built(layoutSrc), viaHelper(layoutSrc)], guard: [built(guardSrc), viaHelper(guardSrc)] }));
  }

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
  /* ── 1.371 · THE RESULTS READER IS GONE FROM THE TREE, NOT MERELY UNUSED (ruling 371, C7 step 7) ──────────────
   * `houseBotBook` and the `HouseBotBook` type were written at Commit 1 for a lifetime-and-today "Book" card, and
   * owner ruling D20 struck that card. C5-5b removed their last callers; step 7 removes the declarations, because a
   * reader with no reader is an invitation — the next page "just uses the book" and re-acquires `netTzs` and
   * `feeWithheldTzs`, the two figures ruling 266 confines the whole console away from.
   * ⛔ THE POPULATION IS HOUSE-BOT CODE, AND IT IS DERIVED FROM THE PATH, NOT TYPED. `netTzs` is also the AGENT
   * fee module's own field name (`src/app/agent/page.tsx`, `legal/agent-terms`), so a repo-wide grep for it would
   * report a platform figure that has nothing to do with this feature — measurement of the wrong population, which
   * on this programme is the most expensive kind of green there is.
   * ⛔ AND A NAME INSIDE A GUARD'S CLOSED LIST IS NOT A CALLER. `"houseBotBook"` survives as DATA in this suite's
   * own `STRUCK` array and in 1.350's NOT-NEEDED list — that is what keeps it out. So string and template literals
   * are stripped before the scan: what is looked for is the name as CODE. */
  /* ⛔ THE STRIPPER IS THE SHARED SCANNER, AND THE THREE `.replace()` PASSES THAT WERE HERE WERE BLIND (C7 step 7
   * review, conformance-371-blind-scan / test-strength-01). They paired delimiters with regexes, which cannot know
   * they are standing inside a literal: MEASURED on this case's own 119-file population on 2026-09-20, they deleted
   * 71% of THIS file, 81% of `house-bot-dal.ts` and more than 40% of 25 files, and a planted `houseBotBook` was
   * INVISIBLE at 50%, 70% and 90% of this file while being found in the small file the control planted into — so
   * the control passed over a detector that was blind across most of its own subject. That is the `E-189` shape,
   * and `decomment.mts` is where this repo keeps the scanner that does not have it. `{ regex: true }` blanks regex
   * BODIES as well, for the same reason the strings are blanked: a guard's own detector spelling a struck name is
   * data about the name, not a use of it. ⛔ Never write a private stripper here again. */
  const STRUCK_GONE = ["houseBotBook", "HouseBotBook", "netTzs", "feeWithheldTzs", "byEntry", "feeInputs", "houseStaffScorecard"];
  const stripLiterals = (code: string) => blankLiterals(code, { regex: true });
  const houseCodeFiles = (() => {
    const out: string[] = [];
    const walkFor = (dir: string, keep: (rel: string) => boolean) => {
      for (const e of readdirSync(join(ROOT, dir))) {
        const rel = `${dir}/${e}`;
        if (statSync(join(ROOT, rel)).isDirectory()) { if (e !== "node_modules") walkFor(rel, keep); }
        else if (/\.(tsx?|mts|mjs)$/.test(e) && keep(rel)) out.push(rel);
      }
    };
    walkFor("src", (rel) => /\/house-bot|house-bot-dal|house-console-read|app\/admin\/desk\//.test(rel));
    walkFor("scripts", (rel) => /house|dal-parity/.test(rel));
    return out;
  })();
  /* ⛔ AND THE STRIPPER IS HELD TO ITS OWN INVARIANT, PER FILE. A stripper that eats code fails SILENTLY — it
   * reports zero over a text it has gutted — so the one thing that must be measured is that nothing was lost.
   * `blankLiterals` replaces a literal's body with SPACES, so a correct pass returns EXACTLY the same number of
   * characters it was given; the three `.replace()` passes this replaces returned 19% of `house-bot-dal.ts`. The
   * per-file before/after counts are printed below, so a future desync is a line on the screen, not a quiet zero. */
  const stripped = houseCodeFiles.map((rel) => {
    const dec = decomment(read(rel));
    const code = stripLiterals(dec);
    return { rel, code, before: dec.length, after: code.length };
  });
  const desynced = stripped.filter((f) => f.before !== f.after).map((f) => `${f.rel} ${f.before}→${f.after}`);
  const struckHits = stripped.flatMap(({ rel, code }) =>
    STRUCK_GONE.filter((n) => new RegExp(`\\b${n}\\b`).test(code)).map((n) => `${rel}:${n}`));
  ok("1.371 · no house-bot module and no house-bot guard names `houseBotBook`, `HouseBotBook`, `netTzs`, `feeWithheldTzs`, `byEntry`, `feeInputs` or `houseStaffScorecard` as CODE — the results reader and the last of the fee derivation are gone from the tree",
    struckHits.length === 0 && houseCodeFiles.length >= 119 && desynced.length === 0,
    j({ hits: struckHits, population: houseCodeFiles.length, desynced }));
  ok("1.371 · …and `book.ts` itself declares neither of them, while the three readers a console may reach are still exported — the deletion took the results reader, not the day book",
    (() => {
      const book = decomment(read("src/lib/server/house-bot/book.ts"));
      return !/export (async )?function houseBotBook\(/.test(book) && !/export type HouseBotBook/.test(book)
        && /export async function houseDayBook\(/.test(book) && /export async function houseDayBooks\(/.test(book)
        && /export async function houseOpenExposure\(/.test(book) && /export function foldDayBook\(/.test(book);
    })(), "");
  /* ⛔ THE CONTROL PLANTS INTO THE BIG FILES, NOT ONLY THE SMALL ONE, AND THAT IS THE WHOLE REPAIR. It used to
   * plant one caller into `book.ts` — 260 lines, and the one file where the retired stripper still worked — so it
   * passed while the detector was blind over 25 of its own 119 files. Now the same name is planted at four DEPTHS
   * of each of four large files, at a line the decommented text shows ending a statement (never inside a comment
   * or a multi-line template), and every one of the sixteen must be reported. ⛔ A control that plants only where
   * the detector is known to work measures the plant, not the detector. */
  const plantSites = (raw: string): number[] => {
    const dec = decomment(raw).split("\n");
    const sites = dec.map((l, k) => ({ l, k })).filter((x) => /;\s*$/.test(x.l)).map((x) => x.k);
    return [20, 40, 60, 80].map((p) =>
      sites.reduce((b, k) => Math.abs(k - (dec.length * p) / 100) < Math.abs(b - (dec.length * p) / 100) ? k : b, sites[0]));
  };
  const plantProbe = (rel: string, name: string): string[] => {
    const lines = read(rel).split("\n");
    return plantSites(read(rel)).filter((at) => {
      const m = [...lines.slice(0, at + 1), `const leakProbe = ${name};`, ...lines.slice(at + 1)].join("\n");
      return !new RegExp(`\\b${name}\\b`).test(stripLiterals(decomment(m)));
    }).map((at) => `${rel}:${at}`);
  };
  const blindSpots = [
    ["scripts/lib/house-bot-console-cases.mts", "houseBotBook"],
    ["src/lib/server/house-bot-dal.ts", "netTzs"],
    ["src/lib/server/house-console-read.ts", "feeWithheldTzs"],
    ["scripts/house-bot-rules.test.mts", "feeInputs"],
  ].flatMap(([rel, name]) => plantProbe(rel, name));
  ok("1.371 · CONTROL · the scan reads CODE, not comments and not guard lists — a planted caller is reported at FOUR depths of each of the four biggest files in the population, while `book.ts`'s own record of the removal and this suite's `STRUCK` array are not",
    /* ⛔ AND THE CONTROL NEVER SPELLS A STRUCK NAME IN TEXT THE SCANNER KEEPS. A nested template inside an
     * interpolation is CODE by this blanker's contract and is copied through verbatim — the loud direction —
     * so writing the plant as one made this very file report itself. Both names come from `STRUCK_GONE`. */
    (() => {
      const [READER, TYPE] = STRUCK_GONE;
      const real = read("src/lib/server/house-bot/book.ts");
      const plantedSrc = `${real}\nconst b = await ${READER}({ houseBotId: null });\n`;
      const planted = stripLiterals(decomment(plantedSrc));
      const recordOnly = stripLiterals(decomment(real));
      const spelt = new RegExp(`\\b${READER}\\b`);
      return blindSpots.length === 0
        && spelt.test(planted) && !spelt.test(recordOnly)
        && real.includes(`\`${READER}\` and the \`${TYPE}\` type were deleted here`)
        && !spelt.test(stripLiterals(decomment(read("scripts/lib/house-bot-console-cases.mts"))));
    })(), j({ blindSpots }));

  /* ── 1.370 · THE KILL SWITCH SHOWS NO HELD AMOUNT (ruling 370, C7 step 7) ────────────────────────────────────
   * Ruling 254 proposed putting the amount still at risk into `CAP_EXPOSURE`'s sentence, and 370 decides it NOT
   * KEPT — on a premise the ruling itself records as false: there is no held amount anywhere in the kill-switch
   * path. `switchOffHouseBots` returns `changed`, `drain` and a COUNT, and the officer's "what is still at risk"
   * question is answered by 364's global open-exposure usage row, which stays rendered while the switch is OFF
   * and reads what is still open AGAINST the exposure limit — money as usage, which is all 266 allows.
   * ⛔ AND THE COST OF ADDING IT IS WHAT MAKES THIS A DECISION RATHER THAN A PREFERENCE: a figure rendered behind
   * a refusal sentence must be STORED on the intent or its audit to be renderable later — the per-decision money
   * record D20 struck — or re-derived at render time, which the display-only law forbids. */
  {
    const feedCopy = read("src/lib/house-bot/feed-copy.ts");
    /* ⛔ THE CAPTURE IS PROVED COMPLETE AGAINST THE BLOCK'S OWN KEY COUNT (C7 step 7 review, test-strength-06).
     * It read `: "…"` only, so a sentence written as a TEMPLATE — which is the form an interpolated amount
     * necessarily takes, i.e. EXACTLY the defect ruling 370 refuses — was silently dropped from the population,
     * and a `>= 60` floor against a measured 64 absorbed four such drops without a word. Now all three value
     * forms are read and the count is checked against the KEYS the block declares, so a dropped entry is a
     * failure rather than a smaller number. */
    const grabBlock = (name: string) =>
      new RegExp(`export const ${name} = \\{[\\s\\S]*?\\n\\} as const`, "m").exec(feedCopy)?.[0] ?? "";
    const grabKeys = (name: string) => (grabBlock(name).match(/^\s{2}[A-Z][A-Z_0-9]*:/gm) ?? []).length;
    const grabMap = (name: string) =>
      [...grabBlock(name).matchAll(/:\s*(?:"([^"]*)"|`([^`]*)`|'([^']*)')/g)].map((x) => x[1] ?? x[2] ?? x[3] ?? "");
    const MONEY_SHAPED = /TZS\s*[\d{]|\{(amount|tzs|stake|held|exposure|balance)\}|\d{1,3}(,\d{3})+/i;
    const engineSentences = grabMap("ENGINE_CODE_SENTENCE");
    const offSentences = grabMap("SWITCH_OFF_COPY");
    ok("1.370 · not one `EngineCode` sentence and not one switch-off sentence carries a formatted amount or an amount placeholder — the words name the cap that stopped the stake, never the money behind it, and the capture is shown to have read EVERY key each block declares",
      engineSentences.length === grabKeys("ENGINE_CODE_SENTENCE") && engineSentences.length >= 64
        && offSentences.length === grabKeys("SWITCH_OFF_COPY") && offSentences.length === 4
        && ![...engineSentences, ...offSentences].some((s) => MONEY_SHAPED.test(s)),
      j({ engine: engineSentences.length, engineKeys: grabKeys("ENGINE_CODE_SENTENCE"), off: offSentences.length, offKeys: grabKeys("SWITCH_OFF_COPY"), money: [...engineSentences, ...offSentences].filter((s) => MONEY_SHAPED.test(s)) }));
    ok("1.370 · CONTROL · a sentence written as a TEMPLATE with an interpolated amount — the very form the old capture dropped — is read and IS reported",
      (() => {
        const planted = feedCopy.replace('  NO_REACT_ZONE: "the stake came too close to betting close",', '  NO_REACT_ZONE: `the stake came too close to betting close, TZS 50,000 still held`,');
        const block = new RegExp("export const ENGINE_CODE_SENTENCE = \\{[\\s\\S]*?\\n\\} as const", "m").exec(planted)?.[0] ?? "";
        const vals = [...block.matchAll(/:\s*(?:"([^"]*)"|`([^`]*)`|'([^']*)')/g)].map((x) => x[1] ?? x[2] ?? x[3] ?? "");
        return planted !== feedCopy && vals.length === grabKeys("ENGINE_CODE_SENTENCE") && vals.some((v) => MONEY_SHAPED.test(v));
      })(), "");
    const killSrc = read("src/lib/server/house-bot/kill-switch.ts");
    const outcomeType = killSrc.slice(killSrc.indexOf("export type SwitchOffOutcome"), killSrc.indexOf("const errMessage"));
    ok("1.370 · `SwitchOffOutcome` carries no money field at all — it answers `changed`, a drain STATE and a COUNT, so there is no held figure for a later render to reach for",
      outcomeType.length > 200 && !/Tzs\b|amountTzs|heldTzs|exposureTzs/.test(outcomeType)
        && /cancelled: number;/.test(outcomeType) && /drain: "drained" \| "busy" \| "skipped";/.test(outcomeType),
      j({ chars: outcomeType.length }));
    ok("1.370 · and `feed-copy.ts` is reached by NO client file of the section — its literals name house bots, so a client import would put the feature's word in `.next/static` and in a signed-in player's payload",
      sectionFiles.filter((f) => read(f).includes('"use client"')).every((f) => !decomment(read(f)).includes("feed-copy"))
        && houseHits(engineSentences.join(" ")).length > 0,
      j({ needles: houseHits(engineSentences.join(" ")).length }));
    ok("1.370 · CONTROL · the money shape really fires — on the amount ruling 254 proposed, on an amount placeholder and on a bare thousands figure — and not on the percentage and name placeholders these sentences DO use",
      MONEY_SHAPED.test("TZS 50,000 was still held") && MONEY_SHAPED.test("{amount} was still held")
        && MONEY_SHAPED.test("1,250,000 still open")
        && !MONEY_SHAPED.test("one player held more than {limit}% of the locked money")
        && !MONEY_SHAPED.test("the target was stopped by {name}"), "");
  }

  /* ── 1.375 · `reimbursement_recorded` IS NOT BUILT, AND THE DEFAULT IS ON THE RECORD (ruling 375) ─────────────
   * REPLAN ruling 271 left it to Commit 7 with "default: not built". Decided NOT BUILT: it is an owner action that
   * RECORDS a money movement the platform cannot make (D3b — there is no payment feature), so it would be a
   * written claim about money with no transaction behind it, and D20b removed the internal record it would have
   * lived in. ⛔ THE AUDIT KEY ITSELF IS OLDER THAN THIS DECISION — Commit 1 wrote it into `HOUSE_AUDIT` and into
   * the migration's enum — so the assertion is not "the key is absent" (it is not) but the two things that
   * matter: nothing WRITES it, and the key set is PINNED at its post-un-build size so a re-introduction has to be
   * ruled rather than slipped in beside it. */
  {
    const K = (await import("../../src/lib/house-bot/constants.ts")) as Any;
    const auditKeys = Object.keys(K.HOUSE_AUDIT);
    const writers = (() => {
      const hits: string[] = [];
      const walkFor = (dir: string) => {
        for (const e of readdirSync(join(ROOT, dir))) {
          const rel = `${dir}/${e}`;
          if (statSync(join(ROOT, rel)).isDirectory()) { if (e !== "node_modules") walkFor(rel); }
          else if (/\.tsx?$/.test(e) && rel !== "src/lib/house-bot/constants.ts"
            && /reimbursement/i.test(decomment(read(rel)))) hits.push(rel);
        }
      };
      walkFor("src");
      return hits;
    })();
    /* ⭐ C7 STEP 5 · THE SCAN GAINED A TERM AND ACCOUNTED FOR ITS ONE HIT; IT DID NOT LOSE ONE.
     * The word-shaped walk above is deliberately broad, and the account page's history tab gave it its first
     * legitimate hit: `CONSOLE_EVENT_WORD` is a TOTAL `Record<HouseBotEventKind, string>` — `tsc` refuses a kind
     * without a word — so the console's own neutral sentence for the `REIMBURSEMENT_RECORDED` EVENT KIND lives in
     * the gate module. An event word is not a writer, and a rule that convicts a word map for a writer's crime is
     * a rule that gets exempted and then protects nothing.
     * ⛔ SO THE HIT IS ACCOUNTED FOR BY NAME AND BY SHAPE, NEVER EXEMPTED BY FILE: the only file that may name the
     * word is the gate module, the occurrence must be a VALUE of that map, and — the term that did not exist
     * before — NOTHING under `src/` may write the AUDIT KEY, which is what "not built" actually means. A second
     * file naming the word, or the same file calling anything with the key, is still red. */
    const ACCOUNTED = "src/lib/server/house-console-read.ts";
    const unaccounted = writers.filter((f) => f !== ACCOUNTED);
    const gateWordMap = (() => {
      const src = decomment(read(ACCOUNTED));
      const at = src.indexOf("export const CONSOLE_EVENT_WORD");
      return at < 0 ? "" : src.slice(at, src.indexOf("} as const satisfies", at));
    })();
    const keyWriters = (() => {
      const hits: string[] = [];
      const walkFor = (dir: string) => {
        for (const e of readdirSync(join(ROOT, dir))) {
          const rel = `${dir}/${e}`;
          if (statSync(join(ROOT, rel)).isDirectory()) { if (e !== "node_modules") walkFor(rel); }
          else if (/\.tsx?$/.test(e) && rel !== "src/lib/house-bot/constants.ts"
            && /house_bot\.reimbursement_recorded/.test(decomment(read(rel)))) hits.push(rel);
        }
      };
      walkFor("src");
      return hits;
    })();
    ok("1.375 · `reimbursement_recorded` has no writer anywhere under `src/` — nothing names its AUDIT KEY, the one file that names the word is the gate module's TOTAL event-word map, and no other file under `src/` names it at all",
      keyWriters.length === 0
        && unaccounted.length === 0
        && gateWordMap.includes("REIMBURSEMENT_RECORDED:")
        && /reimbursement/i.test(gateWordMap)
        && !/reimbursement/i.test(sectionCode)
        && auditKeys.includes("house_bot.reimbursement_recorded"), j({ writers, unaccounted, keyWriters }));
    ok("1.375 · CONTROL · both halves of the accounting really fire — the word planted in a SECOND file is reported, and the audit key planted in the gate module's own body is reported, while the shipped tree is not",
      (() => {
        const plantedWord = [...writers, "src/lib/server/store.ts"].filter((f) => f !== ACCOUNTED);
        const plantedKey = /house_bot\.reimbursement_recorded/.test('await writeHouseAudit("house_bot.reimbursement_recorded", {});');
        return plantedWord.length === 1 && plantedKey && unaccounted.length === 0 && keyWriters.length === 0;
      })(), "");
    ok("1.375 · and `HOUSE_AUDIT`'s key set is PINNED at its post-un-build size, so a re-introduction is a ruling rather than one more line in a map",
      auditKeys.length === 31 && auditKeys.every((k) => k.startsWith("house_bot.")), j({ keys: auditKeys.length }));
    ok("1.375 · CONTROL · the writer scan really finds the word — planted into a real console file it is reported, and the real file does not carry it",
      /reimbursement/i.test(`${decomment(read(ACTIONS))}\nawait writeHouseAudit("house_bot.reimbursement_recorded", {});`)
        && !/reimbursement/i.test(decomment(read(ACTIONS))), "");
  }

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
  /* ⭐ THE WIZARD AND ITS ACTIONS JOIN THE ALLOWANCE AT C7 STEP 6, FOR THE SAME REASON THE OTHER THREE PAGES DID
     AND FOR NO OTHER: ruling 343 and case 0.260.1 require the route a gate call names to be a STRING LITERAL equal
     to the calling file's own console route, precisely so the gate pin can READ it. A template built from
     `CONSOLE_ROUTE` is invisible to that pin. The CONTROL below requires every named file to really hold the
     literal and pins the list's LENGTH, so it cannot be padded to quiet a new typer. */
  const ALLOWED_ROUTE_FILES = new Set([ROUTES_MODULE, "src/lib/server/roles.ts", "src/components/admin/admin-nav-groups.ts", PAGE, ACTIONS, DETAIL_PAGE, NEW_PAGE, NEW_ACTIONS]);
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
  ok("1.319 · CONTROL · the allowance is exactly eight files and every one of them really does hold the literal — a list that can be padded, or that carries a name earning nothing, is not a rule",
    ALLOWED_ROUTE_FILES.size === 8
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

  /* 1.312 · the rail renders exactly the closed list's keys, in RAIL ORDER, and every other `?tab=` resolves to
   * the roster. ⛔ A rail option whose panel is not written is a dead control.
   * ⭐ FOUR KEYS AT C7 STEP 5's LANDING HALF, AND THE ORDER IS ASSERTED RATHER THAN THE COUNT: `roster · activity ·
   * limits · history` is ruling 312's own rail order — who is on the desk, what it is doing, what would stop it,
   * what was done to it — and a list with the right members in the wrong order is a rail an officer has to read
   * twice. This line was `1.312a` and hard-coded the two-key list; it is REPLACED rather than relaxed. */
  ok("1.312 · the rail's options come from the closed list, and the page renders a panel for every key in it — four keys, in rail order",
    /CONSOLE_TABS\.map/.test(pageCode) && CR.CONSOLE_TABS.every((k: string) => pageCode.includes(`tab === "${k}"`))
      && CR.CONSOLE_TABS.length === 4 && j([...CR.CONSOLE_TABS]) === j(["roster", "activity", "limits", "history"]), j(CR.CONSOLE_TABS));
  /* ⛔ AND EVERY KEY'S PANEL IS REALLY THERE TO BE SLICED — the population trap a `panelOf` scan carries: an
   * opener that moved would make every panel-scoped scan below read an EMPTY string and pass on nothing. */
  ok("1.312 · CONTROL · each of the four panels is found and non-empty in the page's own source, so every panel-scoped scan below is measuring a table and not an empty slice",
    CR.CONSOLE_TABS.every((k: string) => panelOf(k).length > 200) && panelOf("nowhere") === "",
    j(CR.CONSOLE_TABS.map((k: string) => [k, panelOf(k).length])));
  /* ⛔ A TAB EXISTS ONLY WITH ITS PANEL (ruling 312), AND THE LIST GROWS ONE KEY PER PANEL. The `limits` key joined
   * it at C7 step 3 with the panel below; `activity` and `history` join at step 5. This case is what stops a rail
   * option shipping ahead of the thing it opens — a dead control in its honest-looking half (432(i)). */
  ok("1.312 · the closed list holds a key for EVERY panel the page renders, and a panel for every key — neither ahead of the other",
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
    (panelOf("roster").match(/<th scope="col" className="text-right p-3 !whitespace-normal">/g) ?? []).length === 3
      && (panelOf("roster").match(/<td className="p-3 text-right(?: text-text-secondary)?"><Usage cell=/g) ?? []).length === 3, "");
  ok("1.373 · no header reads 'House stake', 'Today net' or 'Live balance'",
    !/House stake|house stake|Today net|Live balance/.test(pageCode), "");
  /* 1.373 · THE TABLE ITSELF CARRIES NO `min-w-*`, and the money CELLS carry no `.tabular`, and both are the same
     decision, MEASURED at 360 on the real page: a pair bound into one unbreakable line made each money column 243px,
     put the second answer at 357→600 on a 360 viewport, and left the account column at 93px. Ruling 373's named
     fallback (the cap in the column HEADER) is unbuildable — the cap is PER ACCOUNT. So the pair WRAPS: each amount
     stays indivisible through the kit's own `.amount` nowrap, and the subject column gets a floor of its own. */
  /* 🔴 THIS LINE WAS A PRESENCE CHECK AND THE LANDING HALF SILENTLY BROKE IT. With ONE table on the page,
     `/<table className="admin-tbl">/` answered about THE table; with FOUR panels there are three, and a width
     added to the money-bearing one passes on the strength of the other two still being bare. Measured here, not
     reasoned: the declared mutation `373-minw` could not even be INJECTED any more (its anchor matched 3×) — the
     red harness reported the rot, and the repair is to ask about EVERY table rather than about ANY table.
     ⛔ DERIVED, NEVER TYPED: the openers are read off the page and each must be the bare one, so a fifth panel's
     table is inside this rule on the day it is written. */
  const tableOpeners = [...pageCode.matchAll(/<table className="[^"]*"/g)].map((m: Any) => m[0]);
  ok("1.373 · the money-bearing TABLE carries no `min-w-*` of its own — a width on the table stretches every column — and EVERY table on this page is the bare kit opener, derived from the page rather than asked of one of them",
    tableOpeners.length >= 3 && tableOpeners.every((t: string) => t === '<table className="admin-tbl"'),
    j({ openers: [...new Set(tableOpeners)], count: tableOpeners.length }));
  ok("1.373 · CONTROL · the sweep really would report ONE widened table among bare ones, which is what the presence check it replaced could not do",
    (() => {
      const widened = [...tableOpeners, '<table className="admin-tbl min-w-[720px]"'];
      return widened.some((t: string) => t !== '<table className="admin-tbl"')
        && /<table className="admin-tbl">/.test(pageCode);
    })(), "");
  /* ⛔ NO MONEY COLUMN CARRIES A FLOOR — only the SUBJECT and the STATUS column do, and each for a measured reason:
   * without the subject floor the account column absorbed the whole shortfall and laid out at 93px at 360; without
   * the status floor the AUTO-PAUSED chip rendered as a TWO-LINE pill beside single-line ones at every width up to
   * 1280, and it cannot be fixed on the Chip (an inline `whiteSpace: "normal"` beats any class). Ruling 432(b), (o). */
  /* 🔴 AND THE SUBJECT FLOOR WAS THE SAME PRESENCE CHECK, BROKEN THE SAME WAY. Three panels paint an
     `Account` subject column now, so a floor deleted from ONE of them passed on the strength of the other two.
     Every panel that paints that header is read out of its OWN slice and must carry the floor — derived from the
     closed tab list, so a panel written tomorrow is inside the rule without anyone remembering to add it. */
  const subjectCols = CR.CONSOLE_TABS
    .map((k: string) => [k, /<th scope="col" className="([^"]*)">Account<\/th>/.exec(panelOf(k))?.[1] ?? null] as [string, string | null])
    .filter(([, c]) => c !== null) as [string, string][];
  /* 🔴 474 · OPERATOR TEXT IS BOUNDED, NEVER REWRITTEN — AND A CSS TRANSFORM IS A REWRITE. Found on a
     PHOTOGRAPH, not in any source scan: `.row-link` carries `text-transform: uppercase` and
     `letter-spacing: .10em`, and the landing panels wrapped the Owner's own typed label in it. Computed styles
     off the served page: the roster painted `Evening desk - widest label yetX` with `text-transform: none`,
     these two painted `EVENING DESK - WIDEST LABEL YETX` — one label, two looks, 40px apart on one screen.
     ⛔ THE RULE IS DERIVED FROM THE STYLESHEET, NOT TYPED HERE: whatever `.row-link` is declared to do, no
     element carrying `data-operator-text` may carry that class. So if the shared rule is ever changed, this
     stays a statement about the class the section's fixed words use, and the reason is re-read from disk. */
  {
    const css = read("src/app/globals.css");
    const rule = /\.row-link\.row-link\s*\{([^}]*)\}/.exec(css)?.[1] ?? "";
    const operatorSites = [...pageCode.matchAll(/className="([^"]*)"[^>]*data-operator-text/g)].map((m: Any) => m[1]);
    const detailSites = [...decomment(read(DETAIL_PAGE)).matchAll(/className="([^"]*)"[^>]*data-operator-text/g)].map((m: Any) => m[1]);
    ok("1.474 · not one element that carries the Owner's OWN TEXT wears the row-exit class, whose declared job includes rewriting the case — the platform's fixed words keep it, operator data never does",
      /text-transform:\s*uppercase/.test(rule)
        && operatorSites.length >= 3 && [...operatorSites, ...detailSites].every((c: string) => !/\brow-link\b/.test(c)),
      j({ rule: rule.replace(/\s+/g, " ").trim().slice(0, 90), sites: operatorSites.length + detailSites.length }));
    ok("1.474 · CONTROL · the class really IS still used on this page for its own purpose — a FIXED word, the roster's way out — so the line above is a rule about what it may WRAP and not a ban that emptied itself",
      /className="row-link[^"]*"[^>]*>open →</.test(pageCode)
        && (pageCode.match(/\brow-link\b/g) ?? []).length >= 1
        && !/row-link[^"]*"[^>]*data-operator-text/.test(pageCode),
      j({ rowLinkUses: (pageCode.match(/\brow-link\b/g) ?? []).length }));
    /* ⛔ AND THE SUBJECT CELL KEEPS THE TAP FLOOR THE CLASS WAS GIVING IT, read from the token rather than typed. */
    ok("1.474 · …and dropping the class did not drop the tap floor with it: each operator-text link carries the `--tap-min` floor at its own site, the repo's own idiom for exactly that",
      operatorSites.filter((c: string) => /\bhover:underline\b/.test(c)).every((c: string) => /min-h-\[var\(--tap-min\)\]/.test(c)),
      j(operatorSites));
  }
  ok("1.373 · EVERY panel that paints the subject column carries the SAME floor, read out of that panel's own slice — a floor deleted from one table can no longer pass on another table still having one",
    subjectCols.length >= 3 && subjectCols.every(([, c]) => /min-w-\[150px\]/.test(c)),
    j(subjectCols));
  ok("1.373 · …and only the SUBJECT and STATUS columns carry a floor — never a money column, which would pin its figure off-screen",
    /<th scope="col" className="text-left p-3 min-w-\[150px\]">Account<\/th>/.test(pageCode)
      && /<th scope="col" className="text-left p-3 min-w-\[128px\]">Status<\/th>/.test(pageCode)
      /* ⛔ THE ROSTER'S OWN TWO FLOORS, counted in the ROSTER's own slice — the other three panels have their own
         subject columns and their own floors, and a page-wide count would let one be deleted while another is
         added. ⛔ THE "NO MONEY FLOOR" HALF STAYS PAGE-WIDE, because it is a rule about every table here. */
      && (panelOf("roster").match(/min-w-\[/g) ?? []).length === 2
      && !/text-right p-3[^"]*min-w-\[/.test(pageCode), "");
  /* ⛔ ONLY THE FIGURE IS IN `.amount` (ruling 409). Wrapping "used" and "of" inside it put prose in the money face
   * and made each unbreakable unit wider than the figure it protected — the constraint 432(b) was solving. A COUNT
   * is not money, so it takes the mono/tabular face without `.amount`'s meaning. */
  ok("1.407 / 1.409 · every `<th>` carries `scope=\"col\"`; the FIGURE alone is `.amount tabular-nums`, its words are not, and no cell is bound by `.tabular`",
    headers.length === (thead.match(/scope="col"/g) ?? []).length
      && /const figure = cell\.money \? "amount tabular-nums" : "font-mono tabular-nums";/.test(pageCode)
      && (pageCode.match(/className=\{figure\}/g) ?? []).length === 1
      && !/className="amount tabular-nums">\{cell\./.test(pageCode)
      /* ⛔ THE ROSTER'S USAGE CELLS ARE NEVER BOUND BY `.tabular`, and that is this table's rule rather than the
         page's: a usage cell carries a PAIR that must be allowed to wrap, while the activity panel's Stake cell is
         ONE amount and takes the kit's own `tabular text-right` money shape (373). Measured at 360 on the real
         page: binding the pair made each money column 243px and pushed the second answer off the screen. */
      && !/td className="[^"]*\btabular\b/.test(panelOf("roster")), "");
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
    /* ⭐ A FOURTH SITE AT C7 STEP 4 — the roster row's way out, which is the ONLY link on this page whose href is
       a per-row value. It is pinned in position like the other three: an `OR` widens, and the four are different
       answers to different questions. */
    /* ⭐ A FIFTH SITE AT C7 STEP 6 — the head's own primary action, which became a LINK with the page it opens
       (432(h)). It is pinned in position like the other four: an `OR` widens, and the five are different answers to
       different questions. */
    /* ⛔ AND THE SCAN LEARNED THE SECOND LINK-PAINTING ELEMENT AT C7 STEP 7's REVIEW FIX — WIDER, NEVER LOOSER.
       It read `<Link href={…}` alone, so the moment the head's roster-full sentence became the shared
       `<WayOutLink>` the population lost a member and the list read FOUR on a page that renders five links. ⛔ THE
       REPAIR IS NOT TO EXPECT FOUR. Lowering the count would have un-pinned a live link and left this assertion
       passing — the precise shape of a weakened guard. The scan now walks EVERY element whose name ends in `Link`
       and pins the ELEMENT beside its href, so each entry says strictly MORE than it did: a `<Link>` quietly
       becoming a `<WayOutLink>`, or the reverse, is now a reported difference where it used to be invisible.
       ⛔ AND THE POPULATION IS CLOSED TWO WAYS: the element names found on the page are pinned as an exact set, so
       a THIRD link component cannot slip in unpinned; and every opening link tag must carry a braced `href=`, so a
       link written with a string-literal href cannot fall outside the list either. */
    const LINK_EL = /<((?:[A-Z][A-Za-z]*)?Link)\b/g;
    const LINK_HREF = /<((?:[A-Z][A-Za-z]*)?Link) href=\{([^}]*)\}/g;
    const elementsOf = (code: string) => [...new Set([...code.matchAll(LINK_EL)].map((m) => m[1]))].sort();
    const exprsOf = (code: string) => [...code.matchAll(LINK_HREF)].map((m) => `${m[1]} ${m[2].trim()}`);
    const linkExprs = exprsOf(pageCode);
    const openings = [...pageCode.matchAll(LINK_EL)].length;
    const ELEMENTS = ["Link", "WayOutLink"];
    /* ⭐ THREE MORE AT C7 STEP 5's LANDING HALF, EACH PINNED IN POSITION LIKE THE FIVE BEFORE THEM: the activity
       row's account cell, the history row's account cell — ONE shape for one thing, which is why they are the same
       expression — and the history row's door to the platform's transactions screen, which is what an OWNER_MONEY
       row carries INSTEAD of an amount (266, 369(c), 456). An `OR` would widen; eight positions are eight answers. */
    const WANT = ["Link unsetHref as Route", "WayOutLink view.limitsHref", "Link view.designateHref as Route", "Link view.limitsFirstUnsetHref as Route", "Link r.href as Route", "Link r.accountHref as Route", "Link r.accountHref as Route", "Link r.moneyHref as Route"];
    ok("1.306 · 432(i) · 541(b) · every `<Link href=` in the section is pinned BY POSITION — the bar's prop, then the head's tab href, then the strip's FRAGMENT href",
      j(linkExprs) === j(WANT) && j(elementsOf(pageCode)) === j(ELEMENTS) && linkExprs.length === openings,
      j({ found: linkExprs, want: WANT, elements: elementsOf(pageCode), openings }));
    /* ⛔ CONTROL · THE PIN MEASURES THE ELEMENT AS WELL AS THE HREF. The same href painted by a bare `<Link>`
       instead of the shared component is a DIFFERENT entry — which is the one difference the old scan could not
       see, and the reason it silently dropped a live link from its own population. */
    ok("1.306 · CONTROL · the positional pin really is measured on the ELEMENT — the head's way-out href written back as a bare `<Link>` in memory changes the list, and the real tree matches",
      (() => {
        const back = pageCode.replace("<WayOutLink href={view.limitsHref}>", "<Link href={view.limitsHref as Route}>");
        return j(exprsOf(pageCode)) === j(WANT) && back !== pageCode && j(exprsOf(back)) !== j(WANT);
      })(), "");
    /* ⛔ CONTROL · AND A THIRD LINK-PAINTING ELEMENT CANNOT SLIP PAST THE POPULATION — the exact way this assertion
       came to measure four links on a page that renders five. */
    ok("1.306 · CONTROL · a third link-painting element planted in a copy of the page is REPORTED, so the two-element population above is a measurement and not a scan that stopped matching",
      (() => {
        const planted = `${pageCode}\n<QuietLink href={view.limitsHref}>x</QuietLink>\n`;
        return j(elementsOf(pageCode)) === j(ELEMENTS) && j(elementsOf(planted)) === j(["Link", "QuietLink", "WayOutLink"]);
      })(), "");
    /* ⛔ CONTROL · AND A LINK WHOSE HREF IS A STRING LITERAL FALLS OUT OF THE HREF SCAN WHILE STILL OPENING A TAG,
       which is what the opening-count clause exists to catch. */
    ok("1.306 · CONTROL · a link written with a string-literal href is counted as an opening and NOT as a pinned href, so the count clause really closes that door",
      (() => {
        const planted = `${pageCode}\n<Link href="/admin/desk?tab=limits">x</Link>\n`;
        return exprsOf(planted).length === linkExprs.length && [...planted.matchAll(LINK_EL)].length === openings + 1;
      })(), "");
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
  /* ⛔ AND THE STRIPPER LEARNED THE SHARED COMPONENT AT C7 STEP 7's REVIEW FIX. It removed `<Link>…</Link>` blocks
   * only, so when the guarded sentence became a `<WayOutLink>` the paint survived the strip and this assertion
   * reported the sentence as painted OUTSIDE a link — a false red about a page that had not changed its behaviour.
   * ⛔ THE REPAIR IS NOT TO STOP LOOKING. The stripper takes any element whose name ends in `Link` and closes on
   * that SAME name (a back-reference, so an opener cannot be closed by a different element), and the assertion adds
   * the paint COUNT: the field may appear exactly twice in the page — once as the predicate named and removed
   * below, once as the single guarded paint. That is the claim it always made, now measured rather than inferred
   * from a strip that could quietly stop matching. */
  const LINK_BLOCK = /<((?:[A-Z][A-Za-z]*)?Link)\b[^]*?<\/\1>/g;
  const LINKED_PAINT = /<((?:[A-Z][A-Za-z]*)?Link)\b[^>]*>\{view\.rosterFullReason\}<\/\1>/;
  const stripLinks = (code: string) => code
    .replace(LINK_BLOCK, () => "")
    .replace("const rosterFull = view.rosterFullReason !== null;", () => "");
  const outsideLink = stripLinks(pageCode);
  const reasonPaints = (pageCode.match(/view\.rosterFullReason/g) ?? []).length;
  ok("1.312a · 432(i) · the head paints the LINKED roster-full sentence only inside the one guarded `<Link>`, and the PLAIN one everywhere else",
    LINKED_PAINT.test(pageCode)
      && reasonPaints === 2
      && pageCode.includes("view.rosterFullPlain")
      && !outsideLink.includes("view.rosterFullReason"),
    j({ paintedOutsideTheLink: outsideLink.includes("view.rosterFullReason"), reasonPaints }));
  /* ⛔ CONTROL · THE STRIP REALLY REPORTS. A second paint of the LINKED sentence outside every link — the defect
   * this assertion exists for, and the shape the head shipped before 1.312a was written — is named in memory, and
   * the real tree is not. */
  ok("1.312a · CONTROL · a second paint of the LINKED sentence outside every link is REPORTED in memory, so the zero above is a measurement and not a stripper that stopped matching",
    (() => {
      const leaked = `${pageCode}\n<p className="text-body-sm">{view.rosterFullReason}</p>\n`;
      return !outsideLink.includes("view.rosterFullReason") && stripLinks(leaked).includes("view.rosterFullReason")
        && (leaked.match(/view\.rosterFullReason/g) ?? []).length === reasonPaints + 1;
    })(), "");

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
  /* ⛔ ONE CALLOUT ON THIS PAGE CARRIES NO COPY OF ITS OWN: the activity panel's refusal sentence is the SERVER's,
     handed through as an expression (387 — an address that was not taken at its word says so, in the door's own
     words). It is NAMED here rather than being allowed to shorten the floor for everything else, so a second
     expression-bodied Callout — the way a hand-written sentence would sneak past a length rule — is reported. */
  const EXPR_BODIES = ["{feedView.queryRefusal}"];
  const proseBodies = calloutBodies.filter((b) => !EXPR_BODIES.includes(b));
  ok("1.308 · 432(n) · CONTROL · the Callout bodies were really read, every body this page WORDS ITSELF is a real sentence, and the one expression body is the reader's own refusal",
    proseBodies.length >= 3 && proseBodies.every((b) => b.length > 40)
      && calloutBodies.length - proseBodies.length === 1
      && gateCode.includes("The desk is off. Nothing will be staked."),
    j({ prose: proseBodies.map((b) => b.length), expr: calloutBodies.length - proseBodies.length }));

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

  /* ⭐ C7 STEP 6 · THE WIZARD'S OWN SOURCE LAW, AND BOTH HALVES WERE READ OFF A TILE (355, 416, 359).
   * · the fact grid and the footer are guarded by `!view.accountMissing`, so a card of facts about an account that
   *   does not exist cannot be painted again;
   * · the Phone TERM is guarded by the value, because `Sensitive` renders NOTHING when there is none and an
   *   unconditional `<dt>` is a labelled row that says nothing. */
  {
    const wizardCode = decomment(read(NEW_PAGE));
    ok("1.359 · 355 · 416 · the wizard's fact grid, its funded state and its footer are all guarded by `accountMissing`, and the missing state paints the cause and the way back instead",
      /\{view !== null && step === "check" && view\.accountMissing && \(/.test(wizardCode)
        && /\{view !== null && step === "check" && !view\.accountMissing && \(/.test(wizardCode)
        && (wizardCode.match(/view\.accountMissing/g) ?? []).length === 2
        && /\{view\.blocking\[0\]\?\.text\}/.test(wizardCode), "");
    /* ⛔ 259 · 300 · 324 · 380 · THE PAGE'S OWN VERDICT IS ITS FIRST STATEMENT, AND IT IS NOT THE READER'S
       (C7 step 6 review, conformance-380). It gated only when a `?u=` was present, because the only gate call was
       the CHECK READER's — so a bare `/admin/desk/new` performed no audience check at all and a signed-in PLAYER
       received the head, the step line, the find card's copy and the picker's action reference in the payload
       behind the layout's redirect. The sibling page has always done it; this one now does it in the same shape,
       on the same stored row, with the same route literal, BEFORE the search params are even read. */
    ok("1.380 · 324 · the wizard's page decides its OWN audience first, on the stored row, with a literal route — before any search param, any read and any JSX",
      /* ⚠️ MEASURED INSIDE THE FUNCTION BODY, never over the whole file: the import list names every gated reader,
         so a whole-file `indexOf` compares import positions and says nothing about the order of the STATEMENTS. */
      ((body) =>
        /^\{\s*const session = await currentSession\(\);\s*if \(!\(await houseConsoleAudience\(session\?\.userId \?\? null, "\/admin\/desk"\)\)\) return null;/.test(body)
          && body.indexOf("houseConsoleAudience") < body.indexOf("await searchParams")
          && body.indexOf("houseConsoleAudience") < body.indexOf("houseCheckForConsole")
          && body.indexOf("houseConsoleAudience") < body.indexOf("<AdminPageHead")
      )(wizardCode.slice(wizardCode.indexOf("async function AdminDeskNewContent"))
        .replace(/^async function AdminDeskNewContent\([^)]*\)[^{]*/, "")),
      j(wizardCode.replace(/\s+/g, " ").slice(wizardCode.replace(/\s+/g, " ").indexOf("async function AdminDeskNewContent")).slice(0, 260)));
    /* ⛔ RE-AIMED AT C7 STEP 7, AT THE SAME DEFECT AND ONE MEASURE WIDER (`test:read-tiers` 7.1). The term is still
       drawn only when there is a value — what changed is WHERE the presence is decided. It was `view.phoneE164 !==
       null` in the JSX, and the READ-TIERS ratchet strips `<Sensitive …/>` and then reports every other braced
       expression naming a governed accessor, so a check that renders nothing read to it exactly like a page printing
       the number in the clear: the desk joined `/admin/agents` on a line whose ceiling is 0, measured on this branch
       and NOT on `origin/main`. The value now crosses into the page only inside `Sensitive`; the branch takes a
       server-computed boolean. Both halves are asserted, because dropping either is how this comes back. */
    ok("1.359 · the Phone term is drawn only when there is a value for the platform's own gate to decide about — and the branch takes a boolean, so the governed accessor appears NOWHERE outside `Sensitive`",
      /\{view\.hasPhone && \(/.test(wizardCode)
        && (wizardCode.match(/<Sensitive /g) ?? []).length === 1
        && !/SensitiveReveal/.test(wizardCode)
        && !/phoneE164/.test(wizardCode.replace(/<Sensitive[\s\S]*?\/>/g, "")),
      j({ outsideSensitive: (wizardCode.replace(/<Sensitive[\s\S]*?\/>/g, "").match(/phoneE164/g) ?? []).length }));
    /* ⚠️ THE CONTROL BELOW IS THE RATCHET'S CORE ONLY, AND THE LABEL NOW SAYS SO (C7 step 7 review,
     * test-strength-10). It reproduces the `<Sensitive …/>` strip and the braced-expression match; it does NOT
     * reproduce the ratchet's five skips (the allowlist, the reviewed-fragment key, the bare presence check, the
     * ternary residue and the `mask*()` call). A second full copy of a shared detector is the drift ruling 175
     * refuses everywhere else on this programme — so instead of copying more, the skips themselves are PINNED
     * below, and a change to any of them is reported here rather than discovered by a red in another suite. */
    ok("1.359 · CONTROL · the ratchet's CORE detector is reproduced here and shown to FIRE on the shape this page used to have — so the zero above is a measurement and not a scan that stopped matching",
      (() => {
        const seen = (code: string) => (code.replace(/<Sensitive[\s\S]*?\/>/g, "").match(/\{[^{}]*\.\bphoneE164\b[^{}]*\}/g) ?? []).length;
        return seen(wizardCode) === 0
          && seen(wizardCode.replace("{view.hasPhone && (", "{view.phoneE164 !== null && (")) === 1;
      })(), "");
    /* ⛔ AND THE FIVE SKIPS THE COPY DOES NOT REPRODUCE ARE PINNED IN THE RATCHET'S OWN SOURCE, so `test:read-tiers`
     * cannot change its detector with nothing here going red. The strings are the ratchet's, verbatim. */
    ok("1.359 · and the five exclusions this control does NOT copy are still declared in test:read-tiers' own source — the detector may not drift on one side of a two-sided pin",
      (() => {
        const ratchet = decomment(read("scripts/read-tiers.test.mts"));
        const skips = [
          "GOVERNED_ALLOW.has(relf)",
          "GOVERNED_REVIEWED.keys()",
          "if (/^\\{[^{}]*&&\\s*\\($/.test(m.replace(/\\s+/g, \" \").trim())) continue;",
          "if (/\\?\\s*:/.test(m)) continue;",
          "if (/\\bmask[A-Z]\\w*\\s*\\(/.test(m)) continue;",
        ];
        const missing = skips.filter((t) => !ratchet.includes(t));
        return missing.length === 0 && ratchet.includes("replace(/<Sensitive[\\s\\S]*?\\/>/g, \"\")");
      })(),
      j({ ratchetChars: decomment(read("scripts/read-tiers.test.mts")).length }));
    /* ⛔ 456 · 355 · AND A FAILED READ DOES NOT TAKE THE DOOR WITH IT (C7 step 6 review, conformance-355). The
       whole block hung on `funded !== null`, so an unreadable wallet removed 459's bonus fact AND 456's link to
       the screen where the figure legitimately lives — the officer lost the way forward at the exact moment they
       needed it. The STATE is what a failed read withholds; the fact and the door are not reads. */
    {
      /* ⛔ THE DOOR IS A `<WayOutLink>` SINCE C7 STEP 7's REVIEW FIX, and this probe had to learn the new shape.
       * It looked for `href={view.holderHref as Route}` — the raw `<Link>` attribute — so the door simply stopped
       * being FOUND (`doorAt: -1`) and the assertion went red about an ORDER that had not changed.
       * ⛔ THE REPAIR IS NOT TO DELETE `doorAt`. The claim is unchanged — the bonus FACT and the DOOR are painted
       * after the funded guard closes, so a failed wallet read cannot take either with it — and the probe is
       * stricter in two ways: it requires the door to be a rendered LINK ELEMENT rather than any mention of the
       * href, and it requires EXACTLY ONE door on the page, so a second copy inside the guard cannot hide behind a
       * first one outside it. */
      const DOOR = /<WayOutLink href=\{view\.holderHref\}>/g;
      const probe = (code: string) => {
        const fundedAt = code.indexOf("{view.funded !== null && (");
        const guardClose = code.indexOf(")}", fundedAt);
        const bonusAt = code.indexOf("view.bonusCaption");
        const doors = [...code.matchAll(DOOR)].map((m) => m.index ?? -1);
        return { fundedAt, guardClose, bonusAt, doors, doorAt: doors[0] ?? -1 };
      };
      const outsideTheGuard = (p: ReturnType<typeof probe>) =>
        p.fundedAt > 0 && p.guardClose > p.fundedAt && p.bonusAt > p.guardClose && p.doors.length === 1 && p.doorAt > p.guardClose;
      const real = probe(wizardCode);
      ok("1.359 · 456 · the page paints the bonus fact and the way to the holder's own money screen OUTSIDE the funded guard, so an unreadable wallet cannot remove them",
        outsideTheGuard(real),
        j({ fundedAt: real.fundedAt, guardClose: real.guardClose, bonusAt: real.bonusAt, doorAt: real.doorAt, doors: real.doors.length }));
      /* ⛔ CONTROL · THE PROBE REALLY REPORTS THE DEFECT IT IS FOR. The door dragged back INSIDE the funded guard —
       * the exact shape conformance-355 found, where an unreadable wallet removed 456's link with the state — is
       * named in memory, and the real tree is not. */
      ok("1.359 · 456 · CONTROL · the same door dragged back INSIDE the funded guard in memory is REPORTED, so the order above is a measurement and not a probe that stopped matching",
        (() => {
          const dragged = wizardCode
            .replace(/\s*<WayOutLink href=\{view\.holderHref\}>[^]*?<\/WayOutLink>/, "")
            .replace("{view.funded !== null && (", "{view.funded !== null && (<WayOutLink href={view.holderHref}>Open</WayOutLink>");
          const moved = probe(dragged);
          return dragged !== wizardCode && outsideTheGuard(real) && !outsideTheGuard(moved)
            && moved.doors.length === 1 && moved.doorAt < moved.guardClose;
        })(), "");
      /* ⛔ CONTROL · AND A SECOND DOOR CANNOT HIDE BEHIND THE FIRST — the count clause is what makes "outside the
       * guard" a statement about every door on the page rather than about whichever one comes first. */
      ok("1.359 · 456 · CONTROL · a SECOND door planted inside the funded guard in memory is REPORTED even with the real one still outside it",
        (() => {
          const twinned = wizardCode.replace("{view.funded !== null && (", "{view.funded !== null && (<WayOutLink href={view.holderHref}>Open</WayOutLink>");
          const two = probe(twinned);
          return two.doors.length === 2 && !outsideTheGuard(two);
        })(), "");
    }
    /* ⛔ AND THE WIZARD READS NOTHING OF ITS OWN (340): no house module, no DAL, no eligibility, no designation. */
    ok("1.359 · 340 · no file under the wizard imports `eligibility.ts`, `designation.ts`, the DAL or `sensitive-reveal` — the check card is served by the gated reader alone",
      [NEW_PAGE, NEW_LOADING, NEW_ACTIONS, NEW_CLIENT].every((f) => {
        const c = decomment(read(f));
        return !/house-bot\/eligibility|house-bot\/designation|house-bot-dal|sensitive-reveal/.test(c);
      }), "");
  }

  /* ⭐ C7 STEP 6 · THE WIZARD'S LOADER (rulings 313, 417), and BOTH of its facts were read off a tile.
   * · it carries the page's REAL title, which is only safe because the title is neutral (313) — the ACCOUNT page's
   *   loader is this section's one exception, because its real title is a gated value;
   * · and it ghosts at the page's OWN MEASURE. Without `FormColumn measure="form"` the card ghost laid out at
   *   998px against the page's 640 — a 358px horizontal jump on every swap, which is exactly the class 417 exists
   *   for, read off `wiz-loading-1280.png`. */
  {
    const newLoader = decomment(read(NEW_LOADING));
    const wizardSrc = decomment(read(NEW_PAGE));
    ok("1.313 · the wizard's loader carries the REAL neutral head, and no string in it matches the shared vocabulary",
      /<AdminPageHead title="Designate an account"/.test(newLoader)
        && domLiterals(NEW_LOADING, read(NEW_LOADING)).every((x) => houseHits(x).length === 0 && !NEUTRAL.test(x)), "");
    const newGhosts = [...newLoader.matchAll(/<(Sk[A-Za-z]+|FormColumn|div)[ />]/g)].map((m) => m[1]);
    /* ⭐ RE-ANCHORED TO THE SAME DEFECT AT C7 STEP 6's FIX, NEVER LOOSENED. Both facts this pinned were WRONG
       against the page, and the tiles measured both: the step line ghosted the eyebrow-and-bar of a page that no
       longer paints an eyebrow (`ProgressBar` with no caption ALWAYS paints its own line BENEATH the bar, so the
       ghost was a row short and the wrong way round — 34px at 1280, 43px at 360), and `SkFormCard` ghosted the
       CONSENT step's two fields and an unconditional submit button on a route that opens at the FIND step, which
       has one field and no button. The sequence below is the find card, ghost for ghost. */
    ok("1.417 · the wizard loader's ghost sequence matches the page's own order — the head's action, the page's measure, the bar and the bar's own line, then the FIND step's card",
      j(newGhosts) === j(["SkChip", "FormColumn", "div", "div", "SkBar", "div", "SkTitle", "div", "SkBar", "SkBar", "div", "SkBar", "SkBar", "SkBar"]), j(newGhosts));
    ok("1.417 · …and it ghosts at the PAGE'S OWN MEASURE with the PAGE'S OWN RHYTHM, so the swap cannot jump sideways or re-space itself",
      /<FormColumn measure="form" className="space-y-4">/.test(newLoader)
        && /<FormColumn measure="form" className="space-y-4">/.test(wizardSrc)
        && (wizardSrc.match(/<FormColumn measure="form"/g) ?? []).length === 1, "");
    ok("1.417 · …and neither the loader nor the page ghosts a submit the find step does not have",
      !/SkFormCard/.test(newLoader) && (newLoader.match(/h-\[44px\]/g) ?? []).length === 1, "");
  }

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
    /* ⭐ TWO BADGES AT C7 STEP 5's LANDING HALF, AND EACH IS STILL ONE READ SPENT ONCE. `limits` carries the unset
       count; `activity` carries the desk-wide QUEUED-stake count, which is a COUNTING read of the same predicate
       the feed pages over and never `rows.length` (344). ⛔ `?? undefined` IS THE ASSERTION, NOT A CONVENIENCE: the
       count is `number | null` and `null` is a FAILED read — `CountBadge` renders nothing at zero, so `?? 0` would
       paint a failed read as "nothing queued", which is a count standing in for a read's health.
       ⛔ ROSTER AND HISTORY CARRY NONE: a count of the rows in the table under it, and a count nothing on the page
       can act on, are both badges that say nothing (432(a)). */
    ok("1.405 · both badges are `TabItem.count` — the kit's `CountBadge` — each raw count is spent EXACTLY ONCE, a FAILED count paints no badge, and the strip's sentence still comes from the server",
      /count: k === "limits" \? view\.unsetRequired : k === "activity" \? view\.pendingIntents \?\? undefined : undefined/.test(pageCode)
        && (pageCode.match(/view\.unsetRequired/g) ?? []).length === 1
        && (pageCode.match(/view\.pendingIntents/g) ?? []).length === 1
        && !/view\.pendingIntents \?\? 0/.test(pageCode)
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
    /* ⛔ THE COUNT IS DERIVED FROM THE CLOSED LIST, NOT TYPED: a panel group per key and no others, so a fifth
       group with no key — or a key whose group was never written — is reported here as well as at 1.312. */
    ok("1.406 · CONTROL · every panel really is inside its own `?tab=` group, and the FIRST condition in the body is a tab GROUP opener — so the assertion above has something to decide",
      firstPanel > 0 && firstTabCond === firstPanel + 1
        && pageCode.indexOf('{tab === "limits" && (<>') > firstPanel
        && (pageCode.match(/\{tab === "[a-z-]+" && \(<>/g) ?? []).length === CR.CONSOLE_TABS.length,
      j({ firstPanel, firstTabCond, groups: (pageCode.match(/\{tab === "[a-z-]+" && \(<>/g) ?? []).length }));
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
  /* ⭐ RE-AIMED AT C7 STEP 6, AND THE SUBJECT IS UNCHANGED. This banned the three person-identifying tokens from the
     WHOLE module, which held while the module read nothing about a person but a house bot's holder. The wizard's
     check card has to hand the platform's own `Sensitive` a phone, and its picker has to MATCH on the computed
     handle — neither is a lookup of an ACTOR, which is all ruling 420 governs. So the ban is held where it bites:
     no display NAME anywhere at all (346's rule for the roster, applied to every console surface), the phone named
     only as the SERVER-ONLY field `Sensitive` consumes, and `displayLabel` confined to the search matcher's own
     record, never assigned to anything a page paints. */
  {
    const gateLines = gateCode.split("\n");
    const labelLines = gateLines.filter((l) => l.includes("displayLabel"));
    const phoneLines = gateLines.filter((l) => l.includes("phoneE164"));
    ok("1.420 · the ON sentence names the actor by id and the module resolves NO name for one — no display name anywhere, the phone only as `Sensitive`'s server-only field, and the computed handle only inside the search matcher",
      gateCode.includes("control?.switchedById")
        && !/displayName/.test(gateCode)
        && phoneLines.length === 4
        && phoneLines.some((l) => l.includes("phoneE164: string | null;"))
        && phoneLines.some((l) => l.includes("const phone = user?.phoneE164 ?? null;"))
        && phoneLines.some((l) => l.includes("phoneE164: phone,"))
        /* ⭐ THE THIRD IS THE PICKER'S ORDERING RANK, AND IT IS THE SAME EXEMPTION `displayLabel` HOLDS: a
           COMPARISON inside the search matcher, never a value assigned to anything a page paints. It exists
           because the slice was taking whichever ten the store happened to return. */
        && phoneLines.some((l) => l.includes('(u.phoneE164 ?? "").toLowerCase() === qLower'))
        && labelLines.length === 2
        && labelLines.some((l) => l.trim().startsWith("import { displayLabel }"))
        && labelLines.some((l) => l.includes("displayLabel: displayLabel(u)")),
      j({ phoneLines: phoneLines.map((l) => l.trim().slice(0, 50)), labelLines: labelLines.map((l) => l.trim().slice(0, 50)) }));
  }
  /* ⭐ TWO SITES AT C7 STEP 4 — the roster row and the account page's strip — and BOTH are `bot.userId`. The
     assertion is not a count for its own sake: `playerHandle` turns a user id into "Player #TAIL", and using it on
     an ACTOR would put a staff member behind a player's mask on a screen about a player's account. */
  /* ⭐ FOUR SITES AT C7 STEP 6 — the roster row, the account page's strip, and the wizard's picker option and check
     card — and every one of them is the ACCOUNT HOLDER'S own id. The assertion is not a count for its own sake:
     `playerHandle` turns a user id into "Player #TAIL", and using it on an ACTOR would put a staff member behind a
     player's mask on a screen about a player's account. The wizard's two take the candidate's own id, which is the
     holder-to-be; neither takes `switchedById`, `actorId` or `viewerUserId`, and that is what is pinned. */
  {
    const handleArgs = [...gateCode.matchAll(/playerHandle\(([^)]*)\)/g)].map((m) => m[1].trim());
  /* ⭐ FIVE SITES AT C7 STEP 5's LANDING HALF — the desk-wide feed and history name WHOSE account each row is
     about, and the third argument below is that account's own `userId`, read from the roster the shell already
     holds. It is the HOLDER again, never `e.actorId`: the history's Who column carries the ACTOR, by id and never
     behind a player's mask, and the two are three lines apart in the same row. */
    const HOLDER_ARGS = ["bot.userId", "bot.userId", "found.userId", "u.id", "id"];
    ok("1.420 · `playerHandle` is used for the HOLDER only, never for a staff actor — every call takes an account's own id, pinned by position",
      j(handleArgs) === j(HOLDER_ARGS), j({ found: handleArgs, want: HOLDER_ARGS }));
  }

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
    /* ⭐ THE PIN IS WIDENED AT C7 STEP 5, AND IT MEASURED LESS THAN ITS LABEL CLAIMED.
     * It read `\s*[?:]`, which matches ONLY an inline props-type annotation. Measured: that tail misses an imported
     * props ALIAS (`type P = { botId: string }`, destructured at the call), a JSX ATTRIBUTE at a server call site
     * (`<CancelIntent botId={…} />`) and a PROPERTY READ in client code (`const botLabel = row.label`) — and all
     * three put the bare word into `.next/static`. `verify:house-bot-bundle`'s identifier family knows `houseBotId`
     * and NOT bare `botId`, and 4.453 exempts identifiers by construction, so ruling 401's prop-name obligation had
     * in practice no guard at all for those three shapes.
     * ⛔ SO THE TAIL GAINS `=` AND THE POPULATION GAINS THE WHOLE SECTION — a prop name is published by the file
     * that DECLARES it and by the file that PASSES it, and one of those two is usually a server file. It is never
     * narrowed to buy a green run: the control below plants each of the three spellings it was blind to. */
    const PROP_NAME = /\b(bot|house|liquidity|counterStake)[A-Za-z]*\s*[?:=]/;
    /* ⛔ AND THE SERVER HALF IS THE JSX ATTRIBUTE, NOT EVERY OBJECT KEY. A prop name is published when it CROSSES
     * the client boundary, and a server file crosses it at a JSX attribute — `<CancelIntent botId={…} />` — never
     * at an argument one server function hands another. Measured: `page.tsx` passes `{ houseBotId: null }` to a
     * GATED READER, which is a server-to-server call that reaches no chunk at all, and a rule that convicted it
     * would be a rule someone exempts, and then it protects nothing. `[^<>]*` so the scan cannot run past a tag. */
    const JSX_PROP = /<[A-Z][A-Za-z0-9]*\s[^<>]*\b(bot|house|liquidity|counterStake)[A-Za-z]*\s*=/;
    const propHits = clientFiles.filter((f) => PROP_NAME.test(decomment(read(f))))
      .concat(sectionFiles.filter((f) => JSX_PROP.test(decomment(read(f)))));
    ok("1.384 · 401 · no house-shaped PROP NAME crosses the client boundary anywhere in this section — not declared in a client file, not read there, and not passed as a JSX attribute by a server one",
      propHits.length === 0 && clientFiles.length >= 1 && sectionFiles.length >= 6
        && /export function DeskLive\(\{ live \}: \{ live: boolean \}\)/.test(decomment(read(liveFile))),
      j({ propHits, clientFiles: clientFiles.length, sectionFiles: sectionFiles.length }));
    ok("1.384 · 401 · CONTROL · the pin fires on ALL THREE spellings the old `[?:]` tail was blind to — an imported props alias, a property read and a server call site's JSX attribute — still fires on the inline props type it always caught, and does NOT fire on the server-to-server argument that is not a prop at all",
      PROP_NAME.test("type P = { botId: string }")
        && PROP_NAME.test("const botLabel = row.label;")
        && JSX_PROP.test("<CancelIntent botId={row.id} className=\"x\" />")
        && PROP_NAME.test("function X({ houseStake }: { houseStake: string })")
        && !PROP_NAME.test("const account = view.label;")
        && !JSX_PROP.test("await houseUsageForConsole(id, \"/admin/desk\", { houseBotId: null })"), "");

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


    /* ── 1.382 · EVERY CONSOLE ACTION EXPORT NAME AND EVERY GUARD LABEL IS HOUSE-FREE ──────────────────────────
     * Measured (ruling 382): a server action's exported NAME survives verbatim into publicly downloadable chunks —
     * `setRoleGrant`, `resetRoleGrants`, `addStaffByPhone`, `setStaffRole` and `buildDsarBundleAction` are each
     * findable in `.next/static`. And measured in the code path: `requireOwner`/`requireStaff` write
     * `privilege_escalation_blocked` with `targetId: action`, that action key is in no `HOUSE_AUDIT` set, and
     * `exportUserData` is PLAYER-triggered from `/profile/account` — so a house-named guard label reaches the
     * refused player's own data export. The population is DERIVED from disk, never typed: every `"use server"` file
     * under the section, and every exported symbol of each. */
    {
      const actionFiles = sectionFiles.filter((f) => read(f).includes('"use server"'));
      const exportNames = actionFiles.flatMap((f) => [...decomment(read(f)).matchAll(/export\s+(?:async\s+)?function\s+([A-Za-z0-9_$]+)/g)].map((m) => m[1]));
      const guardLabels = actionFiles.flatMap((f) => [...decomment(read(f)).matchAll(/require(?:Owner|Staff|HouseOwner)\(\s*"([^"]+)"/g)].map((m) => m[1]));
      ok("1.382 · every exported symbol of every console `\"use server\"` file, and every literal it passes a guard as an `action`, is house-free by the SHARED vocabulary",
        actionFiles.length >= 2 && exportNames.length >= 4
          && exportNames.every((n) => houseHits(n).length === 0 && !NEUTRAL.test(n))
          && guardLabels.every((n) => houseHits(n).length === 0 && !NEUTRAL.test(n)),
        j({ files: actionFiles, exports: exportNames, guards: guardLabels }));
      ok("1.382 · CONTROL · the same measure fires on the name ruling 382 forbids by name, and does NOT fire on the ones actually shipped",
        NEUTRAL.test("startHouseBotAction") && houseHits("exportHouseBotCsvAction").length > 0
          && exportNames.includes("designateDeskAccountAction") && !NEUTRAL.test("designateDeskAccountAction"),
        j(exportNames));
      /* ⛔ AND THE GUARD-LABEL HALF RUNS OVER AN EMPTY POPULATION, WHICH IS STATED RATHER THAN HIDDEN (C7 step 6
       * review, conformance-382). `[].every(...)` is true, so that clause could not tell a clean tree from a broken
       * extractor: no console `"use server"` file calls `requireOwner`/`requireStaff`/`requireHouseOwner` at all —
       * they delegate to the gated door, which writes no `privilege_escalation_blocked` row of its own. The FACT is
       * pinned, and the extractor is proved live on a synthetic source so a regex that stopped matching would be
       * reported instead of read as compliance. */
      const GUARD_RE = /require(?:Owner|Staff|HouseOwner)\(\s*"([^"]+)"/g;
      const plantedGuardSrc = [
        '"use server";',
        'export async function x() { await requireOwner("startHouseBot"); }',
      ].join(" ");
      const plantedGuards = [...plantedGuardSrc.matchAll(GUARD_RE)].map((m) => m[1]);
      ok("1.382 · the console's action files pass NO guard label at all — the audience is decided inside the gated door, which is why that clause has an empty population",
        guardLabels.length === 0 && actionFiles.length >= 2, j({ actionFiles, guardLabels }));
      ok("1.382 · CONTROL · the guard-label extractor is proved LIVE on a synthetic source, so the empty population above is a measurement and not a regex that stopped matching",
        plantedGuards.length === 1 && plantedGuards[0] === "startHouseBot" && NEUTRAL.test(plantedGuards[0]),
        j(plantedGuards));
    }

    /* ── 1.385 · COPY PROVENANCE: NO SENTENCE THE SERVER CAN EMIT APPEARS IN A CLIENT MODULE ───────────────────
     * Ruling 385's own measurement is why this is not a style rule: MOST of the sentences this console emits carry
     * no vocabulary word at all, so one typed into a client component ships to every visitor with the disclosure
     * walk and the bundle scan both reporting clean. The test is therefore an INTERSECTION — every long string
     * literal in a client file is required to be absent from the gate module's own copy — plus a floor on how much
     * copy the server owns, so an empty intersection cannot read as compliance. */
    {
      const serverCopy = new Set(domLiterals(GATE, read(GATE)).filter((s) => s.length >= 25));
      const clientCopy = clientFiles.flatMap((f) => domLiterals(f, read(f)).filter((s) => s.length >= 25).map((s) => [f, s] as const));
      const shared = clientCopy.filter(([, s]) => serverCopy.has(s));
      ok("1.385 · not one sentence the gate module can emit is ALSO typed into a console client file — every word about an account crosses the boundary as a prop",
        serverCopy.size >= 60 && shared.length === 0, j({ serverSentences: serverCopy.size, clientSentences: clientCopy.length, shared }));
      /* ⛔ AND THE CLIENT FILES DO OWN A FEW SENTENCES — about the FORM and the TRANSPORT, which the server cannot
       * word because the request never reached it. They are named, so "no long strings at all" cannot pass for
       * provenance. */
      /* ⛔ THE CONTROL RUNS THE ASSERTION'S OWN EXPRESSION (C7 step 6 review, test-strength-385). It used to plant
       * `serverCopy[0]` into a copy of the client list and then ask whether some element of `serverCopy` equalled
       * some element of that list — true whenever `serverCopy` is non-empty, which the line above already asserts,
       * and never once calling `serverCopy.has`, the predicate under test. */
      const plantedClientCopy = clientCopy.concat([[NEW_CLIENT, [...serverCopy][0]] as const]);
      const plantedShared = plantedClientCopy.filter(([, s]) => serverCopy.has(s));
      ok("1.385 · CONTROL · the intersection CAN fire — the SAME `serverCopy.has` filter reports exactly the planted sentence, and the sentences the client legitimately owns are about the form and the transport, never about an account",
        plantedShared.length === 1 && plantedShared[0][0] === NEW_CLIENT && shared.length === 0
          && clientCopy.length >= 3 && !clientCopy.some(([, s]) => NEUTRAL.test(s)),
        j({ planted: plantedShared.map(([f]) => f), client: clientCopy.map(([, s]) => s.slice(0, 40)).slice(0, 6) }));
    }

    /* ── 1.388 · DIALOG AND FORM COPY COMES FROM THE SERVER AS PROPS, AND NO TYPED WORD NAMES A BOT ────────────
     * Measured (ruling 388): client component PROP NAMES survive minification into public chunks — `mayAct`,
     * `domainLabel`, `subjectId`, `serverNow` and `alreadyClosed` are each findable in `.next/static` — so a prop
     * named for the feature is published even when its value is not. Both halves are pinned: no prop name and no
     * declared field of a client type carries a vocabulary word, and the arming word the ceremony checks is a prop
     * rather than a literal. */
    {
      const propNames = clientFiles.flatMap((f) => [...decomment(read(f)).matchAll(/^\s{2}([a-zA-Z][A-Za-z0-9_]*)[,:]/gm)].map((m) => m[1]));
      ok("1.388 · not one prop name, type field or string literal of any console client file carries a vocabulary word — the values AND the names are neutral",
        clientFiles.length >= 3 && propNames.length >= 20
          && propNames.every((n) => houseHits(n).length === 0 && !NEUTRAL.test(n))
          && clientFiles.every((f) => domLiterals(f, read(f)).every((s) => !NEUTRAL.test(s))),
        j({ clientFiles, props: [...new Set(propNames)].slice(0, 24) }));
      /* ⛔ AND THE ARMING WORD ARRIVES AS A PROP. "BOTS ON" is not a vocabulary needle ✔ — which is precisely why
       * it must not be relied on: it would ship a bot-shaped confirmation phrase to every visitor with no guard
       * able to see it. The word is the server's, checked again on the way back. */
      /* ⛔ 388's OWN PROOF, WHICH HAD NEVER BEEN WRITTEN (C7 step 6 review, conformance-388). The ruling's Proof is
       * "no console client file contains a string literal of 25+ characters that is not a prop name, class name,
       * aria string or event name (an enumerated allowlist)" — and only the VOCABULARY half above existed, which
       * is precisely the half ruling 385 measured to be useless on its own: most sentences this console can emit
       * carry no vocabulary word, so a paragraph describing the feature ships verbatim in a public chunk with the
       * disclosure walk and the bundle scan both clean. 🔴 MEASURED ON THIS FILE: the consent step typed four such
       * paragraphs into a "use client" file.
       * ⛔ A CLASS LIST IS NOT COPY, and the exclusion is a SHAPE, not a list of known strings: every
       * whitespace-separated token must carry a utility's own punctuation or be one of the bare utilities this
       * repo ships. A lowercase sentence does NOT pass it, which is the control below. */
      {
        const BARE_UTILITIES = new Set(["flex", "grid", "block", "inline", "hidden", "relative", "absolute", "static", "fixed", "sticky", "uppercase", "italic", "underline", "truncate", "eyebrow", "tabular", "group", "amount", "btn", "sr", "border", "rounded", "shadow", "ring", "table", "contents", "transition", "overflow"]);
        const isClassList = (x: string): boolean => {
          const tokens = x.trim().split(/\s+/).filter(Boolean);
          return tokens.length > 0 && tokens.every((t) => /[-:[\/]/.test(t) || BARE_UTILITIES.has(t));
        };
        /** Every 25+ character string a console client file may own, each with the reason the SERVER cannot word it. */
        const CLIENT_OWNED_COPY: ReadonlyArray<readonly [string, string]> = [
          ["That did not reach the server. Nothing changed — try again.", "the transport failure: a request that never reached the server cannot be worded by it"],
          ["The change did not reach the server. Nothing was saved — try again.", "the same, on the limits form"],
          [" The permanent record could not be written — tell an administrator.", "the limits form's own tail on a partial save"],
          ["These limits govern every stake the desk places.", "⚠️ C7 step 3's, OWED a move to the server before the commit close"],
          ["These limits have been changed but not saved. Leaving now discards the change.", "⚠️ C7 step 3's, the unsaved-changes prompt, OWED the same move"],
          ["Every limit is saved together, or none is", "⚠️ C7 step 3's, OWED the same move"],
        ];
        const allowed = new Set(CLIENT_OWNED_COPY.map(([x]) => x));
        const proseOf = (code: string, rel: string) => domLiterals(rel, code).filter((x) => x.length >= 25 && !isClassList(x));
        const stray = clientFiles.flatMap((f) => proseOf(read(f), f).filter((x) => !allowed.has(x)).map((x) => `${f}: ${x.slice(0, 60)}`));
        ok("1.388 · every string of 25+ characters in every console client file is either a class list or one of the six the client is ALLOWED to own — every other sentence crosses the boundary as a prop",
          clientFiles.length >= 3 && stray.length === 0 && allowed.size === 6, j({ clientFiles, stray }));
        ok("1.388 · CONTROL · the same scan reports a SERVER sentence planted into the real client code, and does NOT report the class lists that file is full of — so the zero above is a measurement and not a filter that swallows everything",
          (() => {
            const serverSentence = GATEM.CONSOLE_WIZARD_COPY.consentBullets[0] as string;
            const planted = `${read(NEW_CLIENT)}\nconst LEAK = "${serverSentence}";`;
            const found = proseOf(planted, NEW_CLIENT).filter((x) => !allowed.has(x));
            const classy = domLiterals(NEW_CLIENT, read(NEW_CLIENT)).filter((x) => x.length >= 25 && isClassList(x));
            return found.length === 1 && found[0] === serverSentence && classy.length >= 8
              && !isClassList("Nothing is staked until an officer starts this account")
              && !isClassList("nothing is staked until an officer starts this account")
              && isClassList("font-mono text-micro eyebrow uppercase text-text-tertiary");
          })(),
          "");
        /* ⛔ AND THE SENTENCES THAT LEFT THIS FILE ARE ON THE SERVER, not merely deleted. */
        ok("1.388 · …and the four consent paragraphs, both step headings and all three long hints are the GATE MODULE's, handed down as one prop",
          GATEM.CONSOLE_WIZARD_COPY.consentBullets.length === 4
            && GATEM.CONSOLE_WIZARD_COPY.consentBullets.every((x: string) => x.length >= 25)
            && /copy=\{CONSOLE_WIZARD_COPY\}/.test(decomment(read(NEW_PAGE)))
            && /copy\.consentBullets\.map/.test(decomment(read(NEW_CLIENT)))
            && !decomment(read(NEW_CLIENT)).includes(GATEM.CONSOLE_WIZARD_COPY.passwordHint),
          j({ bullets: GATEM.CONSOLE_WIZARD_COPY.consentBullets.length }));
      }
      ok("1.388 · CONTROL · the measure fires on the prop name ruling 388 forbids, and the arming word is the SERVER's — no console client file types it",
        NEUTRAL.test("houseBotLabel") && houseHits("houseBotLabel").length > 0
          && !/BOTS ON/.test(clientCode) && !new RegExp(`"${GATEM.CONSOLE_SWITCH_ON_WORD}"`).test(clientCode)
          && decomment(read(GATE)).includes(`CONSOLE_SWITCH_ON_WORD = "${GATEM.CONSOLE_SWITCH_ON_WORD}"`),
        j({ word: GATEM.CONSOLE_SWITCH_ON_WORD }));
    }

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
    /* ⭐ RE-AIMED AT C7 STEP 6, NEVER WEAKENED. This counted EVERY `db.user.findById` in the module and required
     * exactly one — which was the VIEWER's lookup and nothing else, until the wizard's check card had to read the
     * SUBJECT's own row for a name and a phone. Those are two different questions: one decides who is looking and
     * must be memoised per pass, the other is the record the page is about and is read once per render by
     * construction. So the count is held where the ruling actually bites: the VIEWER is looked up in exactly one
     * place, through the `cache()` wrapper, and every other call in the module is named and is not the viewer's. */
    const viewerLookups = (gateCode.match(/db\.user\.findById\(viewerUserId\)/g) ?? []).length;
    const allLookups = (gateCode.match(/db\.user\.findById\(/g) ?? []).length;
    ok("1.342 · the viewer lookup is wrapped in React `cache()` inside the gate module, is named EXACTLY ONCE there, and is the only call that takes the viewer",
      /cache\(/.test(gateCode) && /import \{ cache \} from "react";/.test(gateCode)
        && /const viewerRow = cache\(async \(viewerUserId: string\) => db\.user\.findById\(viewerUserId\)\)/.test(gateCode)
        && viewerLookups === 1 && allLookups === 2
        && /\(async \(\) => db\.user\.findById\(id\)\)\(\)/.test(gateCode),
      j({ viewerLookups, allLookups }));
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
    const gateCalls = [...pageCode.matchAll(/house(?:ConsoleAudience|RosterForConsole|UsageForConsole|AuditForConsole|FeedForConsole|HistoryForConsole)\(([^;]*?)\)/g)].map((m) => m[1]);
    ok("1.343 · every gate call under the section passes the literal `\"/admin/desk\"` as its route, and there are at least three of them",
      gateCalls.length >= 3 && gateCalls.every((a) => a.includes('"/admin/desk"')), j(gateCalls));
    /* ⛔ THE PIN IS ON THE ROUTE ARGUMENT ITSELF, WHICH IS STRICTLY STRONGER THAN THE FILE-WIDE SCAN IT REPLACES.
       The old form forbade the identifier `CONSOLE_ROUTE` ANYWHERE in the page — which was true while no pager
       existed and is the wrong rule now that ruling 319 requires the pager's own `baseHref` to be built from that
       one module rather than from a literal. 343's subject was never the file: it is that the SECOND argument of
       every gate call is the literal, because a route built from a value reads as a value to the arity pin and a
       mistyped one would widen a page's read audience to a whole RBAC domain. So the second argument is compared
       EXACTLY, and every `"/admin/desk"` literal in the file is still accounted for by a gate call. */
    const routeArgs = gateCalls.map((a) => (a.split(",")[1] ?? "").trim());
    ok("1.343 · and no gate argument is built from a header, a search param or the route module — every gate call's SECOND argument is the literal itself",
      !/headers\(\)|x-pathname/.test(pageCode)
        && routeArgs.length === gateCalls.length && routeArgs.every((a) => a === '"/admin/desk"')
        && (pageCode.match(/"\/admin\/desk"/g) ?? []).length === gateCalls.length,
      j({ routeArgs, literals: (pageCode.match(/"\/admin\/desk"/g) ?? []).length }));
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

    /* ══ C7 STEP 7 · THE FOUR D19 ASSERTIONS THE CLOSING STEP OWES (rulings 390, 391, 395, 397) ═════════════════
     * Each was named by its ruling's Proof clause as its own only instrument and was owed at step 7 by 398's
     * roll-call. They land here, in the D19 section, so `emitted` carries them before the roll-call reads it. */

    /* ── 1.390 · NO CONSOLE ACTION THROWS AN ERROR WHOSE MESSAGE NAMES THE FEATURE ───────────────────────────────
     * MEASURED, and the measurement is the point: `runAdminAction` appends up to 140 characters of `e.message` to
     * the string the caller renders, and Next's masking of a thrown Server Action message is an ENVIRONMENT
     * behaviour of production builds, not a guard in this repository. So a thrown message is one deploy flag away
     * from the person who POSTed the action id. The console answers with TYPED refusals instead — there is not one
     * `throw` in its server modules or behind its one door — and the sentences those refusals carry are held to the
     * shared vocabulary AND to 453's console lexicon. */
    const serverFiles = sectionFiles.filter((f) => !read(f).includes('"use client"'));
    const clientFilesHere = sectionFiles.filter((f) => read(f).includes('"use client"'));
    const throwSites = [...serverFiles, GATE].flatMap((f) =>
      [...decomment(read(f)).matchAll(/\bthrow\b([^;]{0,200})/g)].map((m) => `${f}:${m[1].replace(/\s+/g, " ").trim()}`));
    ok("1.390 · not one `throw` in the console's server modules or behind its one read door — every failure is a TYPED refusal, so `runAdminAction`'s 140-character echo of `e.message` has nothing of this feature to echo",
      throwSites.length === 0 && serverFiles.length >= 6, j({ throwSites, serverFiles: serverFiles.length }));
    /* ⛔ THE SENTENCE SCAN READS THE DECOMMENTED SOURCE AT ANY INDENT, AND ITS FLOOR IS THE COUNT A RUN PRINTED
     * (C7 step 7 review, test-strength-09). It read the RAW file, so a commented-out constant counted as a live
     * refusal sentence; it required exactly two leading spaces, so a map nested one level deeper left the
     * population silently; and its floor was 18 against a measured 71, which is 53 sentences that could vanish
     * under a green `every`. */
    const refusalSentences = [...decomment(read(GATE)).matchAll(/^\s*([A-Z][A-Z_]{2,}): "([^"]+)"/gm)].map((m) => m[2]);
    ok("1.390 · and every refusal SENTENCE the door can hand back is free of the shared vocabulary AND of 453's console lexicon — what an officer reads on a failure names the act, never the feature",
      refusalSentences.length >= 71 && refusalSentences.every((s) => houseHits(s).length === 0 && !NEUTRAL.test(s)),
      j({ sentences: refusalSentences.length, hits: refusalSentences.filter((s) => houseHits(s).length > 0 || NEUTRAL.test(s)) }));
    /* ⛔ AND THE OTHER DOOR THAT HANDS A HOUSE REFUSAL TO A NON-OWNER OFFICER (⛔ D19; C7 step 7 review,
     * d19-hunt-01). `anonymizeClosedAccount` refuses a DSAR erasure while a live record exists, and `privacy.ts`
     * passes that sentence to `/admin/privacy` — a COMPLIANCE-domain route, whose officer ruling 393 puts
     * OUTSIDE this feature's audience and `OWNER_ONLY_PREFIXES` forbids the console to. Until 2026-09-20 the
     * sentence carried the feature's name, the bounded id AND the console path, from a control that officer is
     * entitled to use. It was outside 1.390's population — a refusal sentence the console's own scan could not
     * see — which is why the population is now the SITE, not the module. */
    const erasureSrc = decomment(read("src/lib/server/erasure.ts"));
    const erasureRefusals = [...erasureSrc.matchAll(/error:\s*"([^"]+)"/g)].map((m) => m[1]);
    ok("1.390 · and the ERASURE door's own refusal — the one house sentence a COMPLIANCE officer can make the platform print — names neither the feature, nor a record id, nor the owner-only route",
      erasureRefusals.length >= 1
        && erasureRefusals.every((t) => houseHits(t).length === 0 && !NEUTRAL.test(t))
        && !/error:\s*`[^`]*\$\{[^}]*\bliveBot\b/.test(erasureSrc)
        && !/consoleBotHref/.test(erasureSrc)
        && /reason: "house_bot_live"/.test(erasureSrc),
      j({ sentences: erasureRefusals.length, hits: erasureRefusals.filter((t) => houseHits(t).length > 0 || NEUTRAL.test(t)) }));
    /* ⛔ BOTH HALVES ARE PLANTED INTO THE REAL SOURCES AND RE-EXTRACTED (C7 step 7 review,
     * conformance-390-control-overclaims). The label already claimed that; only the throw half did it, and the
     * lexicon half was asserted on two invented strings — so nothing showed that the SENTENCE extractor, run over
     * the real gate, can fire on a real sentence. A label that claims more than its predicate is the over-claim
     * this programme treats as a defect in itself. */
    ok("1.390 · CONTROL · the scan really finds a throw, and really finds a sentence that names the feature — both planted into the REAL sources and RE-EXTRACTED from them, and neither is there",
      (() => {
        const planted = [...decomment(`${read(ACTIONS)}\nif (!x) throw new Error("house bots are off for this desk");\n`).matchAll(/\bthrow\b([^;]{0,200})/g)];
        const mutatedGate = decomment(read(GATE)).replace('  NOT_FOUND: "That account', '  NOT_FOUND: "That house bot');
        const reExtracted = [...mutatedGate.matchAll(/^\s*([A-Z][A-Z_]{2,}): "([^"]+)"/gm)].map((m) => m[2]);
        const named = reExtracted.filter((t) => houseHits(t).length > 0 || NEUTRAL.test(t));
        const erasureMutated = [...erasureSrc.replace("This account is still in use by an owner-managed account", "This account is still house bot hb_0123456789abcdef01234567").matchAll(/error:\s*"([^"]+)"/g)].map((m) => m[1]);
        return planted.length === 1 && houseHits(planted[0][1]).length > 0
          && mutatedGate !== decomment(read(GATE)) && reExtracted.length === refusalSentences.length && named.length === 1
          && erasureMutated.some((t) => houseHits(t).length > 0)
          && refusalSentences.length > 0 && !NEUTRAL.test(refusalSentences[0]);
      })(), "");
    /* ⛔ AND THE PROPERTY THAT ACTUALLY HOLDS THE NO-THROW LAW IS ASSERTED, not assumed (C7 step 7 review,
     * test-strength-05). 1.390's population is the section's own files plus the gate; every module BEHIND the
     * door does throw — `limits-save.ts`, `designation.ts`, `switch-on.ts` — and what stops those reaching
     * `runAdminAction`'s 140-character echo is the `catch` in each action, which nothing measured. Deleting one
     * would have left 1.390 green. */
    /** Every `catch` body in `src`, its extent found by brace depth so a nested block cannot cut it short. */
    const catchBodies = (body: string): string[] => {
      const out: string[] = [];
      const re = /catch\s*(?:\([^)]*\))?\s*\{/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(body)) !== null) {
        const from = m.index + m[0].length;
        let depth = 1;
        let k = from;
        for (; k < body.length && depth > 0; k++) {
          if (body[k] === "{") depth++;
          else if (body[k] === "}") depth--;
        }
        out.push(body.slice(from, Math.max(from, k - 1)));
      }
      return out;
    };
    const actionCatches = [ACTIONS, NEW_ACTIONS].flatMap((f) => {
      const code = decomment(read(f));
      return [...code.matchAll(/export async function (\w+)\(/g)].map((m) => {
        const from = m.index ?? 0;
        const nextIdx = code.indexOf("export async function", from + 10);
        const body = code.slice(from, nextIdx === -1 ? code.length : nextIdx);
        /* ⛔ A CATCH THAT RETURNS THE ACTION'S OWN REFUSAL SHAPE, which is not always `safeError`:
           `findDeskAccountsAction` answers the picker's neutral empty answer, because ruling 387(c) says a
           refused caller and a search that found nothing must be indistinguishable — so a message there would
           be the oracle. And an action may carry a SECOND, deliberately empty catch around `revalidatePath`,
           which is the shape that keeps a landed write from reporting "nothing changed". What every action must
           do is CATCH, never rethrow, return its own shape from at least one catch, and build any `error`
           string with `safeError`.
           ⚠️ THE BODIES ARE FOUND BY BRACE DEPTH, not by a lazy regex: a lazy `\n  }` ran from the inline
           revalidation catch to the function's own closing brace and swallowed the real one. */
        const catches = catchBodies(body);
        const guarded = catches.length >= 1
          && catches.every((c) => !/\bthrow\b/.test(c))
          && catches.some((c) => /return /.test(c))
          && catches.every((c) => !/\berror:/.test(c) || /safeError\(/.test(c));
        return { fn: `${f}:${m[1]}`, guarded };
      });
    });
    ok("1.390 · and every exported console action turns a throw from BEHIND the door into a typed refusal — the `catch … safeError(` is what makes the no-throw law true of the modules 1.390 cannot see, and it is asserted per action rather than assumed",
      actionCatches.length >= 5 && actionCatches.every((a) => a.guarded),
      j({ actions: actionCatches.length, unguarded: actionCatches.filter((a) => !a.guarded).map((a) => a.fn) }));
    ok("1.390 · CONTROL · that per-action scan really reports — an action whose catch is removed from the REAL source is named",
      (() => {
        const real = decomment(read(ACTIONS));
        const code = real.replace("safeError(err, \"Nothing was saved. Reload the page and try again.\")", "String(err)");
        const scan = (src: string) => [...src.matchAll(/export async function (\w+)\(/g)].map((m) => {
          const from = m.index ?? 0;
          const nextIdx = src.indexOf("export async function", from + 10);
          const body = src.slice(from, nextIdx === -1 ? src.length : nextIdx);
          const catches = catchBodies(body);
          return catches.length >= 1 && catches.every((c) => !/\bthrow\b/.test(c))
            && catches.some((c) => /return /.test(c))
            && catches.every((c) => !/\berror:/.test(c) || /safeError\(/.test(c));
        });
        return code !== real && scan(real).every(Boolean) && scan(code).some((g) => !g);
      })(), "");

    /* ── 1.391 · CLIENT-SIDE DRAFTS LIVE OUTSIDE THE HOUSE MODULES, UNDER THE CODENAME, AND HOLD NO SECRET ───────
     * 04 C12's draft module was drafted for `src/lib/house-bot/draft.ts`; ruling 391 rules it is BORN in the
     * console's own neutral client module instead, and strikes the `hb:` key prefix — which no guard on this branch
     * can see, because `HOUSE_ID_SOURCE` matches only `hb_`/`hbi_` + 24 hex. MEASURED at this step: the console
     * stores NOTHING in the browser, so the rules bite on the next writer rather than on today's code — which is
     * exactly why the pin is written over the section as a WALK and not over a file somebody remembered. */
    ok("1.391 · no draft module was smuggled into `src/lib/house-bot/`, and nothing under the section writes to browser storage at all today — so there is no key to leak and no TTL to get wrong",
      !existsSync(join(ROOT, "src/lib/house-bot/draft.ts"))
        && !/sessionStorage|localStorage|indexedDB|document\.cookie/.test(sectionCode)
        && sectionFiles.length >= 10, j({ files: sectionFiles.length }));
    /* ⛔ ALL FOUR RULES ARE APPLIED TO THE WALKED STRINGS, not two of them (C7 step 7 review, test-strength-07).
     * The label said four and the predicate ran two — the storage APIs and the key shape — while the secret rule
     * and the hard-coded-route rule existed only as literals inside the control, so the control demonstrated
     * capabilities the assertion never used. */
    /* ⛔ THE LABEL NAMES WHAT THE PREDICATE MEASURES, AND NOT ONE RULE MORE. All four key rules live in
     * `keyOffence`; two of them — the struck prefix and the feature's words — can be applied to EVERY string a
     * client file holds, and two cannot: "password" is a legitimate FIELD LABEL on the account action dialog and
     * "/admin/desk" is a legitimate href, so running the secret and route rules over every string would condemn
     * the correct code. They bite on a storage KEY, and this section stores nothing — which is why the walk below
     * proves the ABSENCE of storage and the control proves all four rules on a planted key. */
    const keyOffence = (str: string) => /^hb[:_]/.test(str) || houseHits(str).length > 0 || /pass|secret|token/i.test(str) || str.startsWith("/admin/");
    const alwaysOffends = (str: string) => /^hb[:_]/.test(str) || houseHits(str).length > 0;
    const clientKeyHits = clientFilesHere.flatMap((f) => {
      const code = decomment(read(f));
      const storage = /sessionStorage|localStorage|indexedDB/.test(code) ? [`${f}:browser-storage`] : [];
      return [...storage, ...[...code.matchAll(/"([^"\n]{2,80})"/g)].map((m) => m[1]).filter(alwaysOffends).map((t) => `${f}:${t}`)];
    });
    ok("1.391 · and the rule the first writer will meet is stated where it binds: the section's OWN client files are walked and shown to reach no browser storage at all and to hold no string carrying the struck `hb:` prefix or the feature's words — the secret and route rules bite on a storage KEY, and the control below shows all four firing on one",
      clientFilesHere.length >= 5 && clientKeyHits.length === 0,
      j({ clientFiles: clientFilesHere, hits: clientKeyHits }));
    /* ⛔ THE CONTROL IS A VIRTUAL FILE, WHICH IS THE IDIOM 398 NAMES (C7 step 7 review, conformance-398-control-391).
     * It used to test the four rules against four strings typed beside it and never ran the WALK — so it could not
     * show that the walk over the section's real client files would report a planted key, which is the only thing
     * a control over a walk is for. The real text of a real client file is mutated in memory and the SAME
     * predicate is run over it. */
    ok("1.391 · CONTROL · the WALK itself reports — a real client file's own text, given a draft key and a storage write in memory, is named by the same predicate that reports nothing over the real one",
      (() => {
        const live = clientFilesHere.find((f) => f.endsWith("desk-live.tsx")) ?? clientFilesHere[0];
        const scan = (code: string, rule: (t: string) => boolean) => {
          const storage = /sessionStorage|localStorage|indexedDB/.test(code) ? ["browser-storage"] : [];
          return [...storage, ...[...code.matchAll(/"([^"\n]{2,80})"/g)].map((m) => m[1]).filter(rule)];
        };
        const real = decomment(read(live));
        const virtual = `${real}\nconst DRAFT_KEY = "hb:desk-draft";\nsessionStorage.setItem(DRAFT_KEY, "1");\n`;
        const found = scan(virtual, alwaysOffends);
        /* All four rules, on the keys each exists for — and the neutral key the section would be allowed. */
        const four = keyOffence("hb:desk-draft") && keyOffence("house-bots:draft") && keyOffence("desk:password") && keyOffence("/admin/desk/new");
        return scan(real, alwaysOffends).length === 0 && found.includes("browser-storage") && found.includes("hb:desk-draft")
          && four && !keyOffence("desk:draft") && houseHits("house-bots:draft").length > 0;
      })(), "");

    /* ══ C7 STEP 7 REVIEW · THE EIGHT SURFACE FINDINGS, EACH PINNED WHERE IT WAS FOUND ═══════════════════════════
     * Every one of these was a render the step's own capture set had already been READ over, and every one is the
     * kind of defect a screenshot proves and no suite was asking about. A pin is what stops the next pass having
     * to look again. */

    /* ⛔ 474 · THE OPERATOR HOOK IS ON EVERY SITE THAT PAINTS THE LABEL, AND THE POPULATION IS A GREP (review
     * d19-hunt-03). It was wired on the roster cell alone; the DETAIL page renders the SAME operator value as its
     * `<h1>` through `AdminPageHead`, which took a plain string and had nowhere to put a hook — so an
     * Owner-chosen label was scanned by the served gate as if this repo had written it, which is exactly the
     * defect the roster's own hook comment records as MEASURED on 2026-09-18. */
    const labelSites = sectionFiles.flatMap((f) => {
      const code = decomment(read(f));
      return [...code.matchAll(/\b(?:view|r)\.label\b/g)].map((m) => ({ f, win: code.slice(Math.max(0, (m.index ?? 0) - 220), (m.index ?? 0) + 220) }));
    });
    const unhooked = labelSites.filter((x) => !/data-operator-text|titleIsOperatorText/.test(x.win)).map((x) => x.f);
    ok("1.474 · EVERY site under the section that paints the account's own LABEL carries the 474 hook — the population is a walk for the value, not a list of the sites somebody remembered",
      labelSites.length >= 2 && unhooked.length === 0
        && /titleIsOperatorText \? \{ "data-operator-text": "label" \} : \{\}/.test(decomment(read("src/components/admin/admin-shell.tsx"))),
      j({ sites: labelSites.length, unhooked }));
    ok("1.474 · and the served gate removes the operator's marked text from the SHARED vocabulary scan as well as from 453's — one exemption, both scans",
      (() => {
        const gateSrc = decomment(read("scripts/qa-house-bots-visual.mjs"));
        return (gateSrc.match(/facts\.operatorText\.reduce\(/g) ?? []).length >= 2
          && /houseHits\(bodySubject\)/.test(gateSrc) && !/houseHits\(facts\.body\)/.test(gateSrc);
      })(), "");
    ok("1.474 · CONTROL · the label walk really reports — the detail page's own head, with its hook removed in memory, is named, and the real tree is not",
      (() => {
        const code = decomment(read(DETAIL_PAGE));
        const scan = (src: string) => [...src.matchAll(/\b(?:view|r)\.label\b/g)]
          .filter((m) => !/data-operator-text|titleIsOperatorText/.test(src.slice(Math.max(0, (m.index ?? 0) - 220), (m.index ?? 0) + 220))).length;
        const stripped = code.replace("        titleIsOperatorText", "        sw={undefined}");
        return scan(code) === 0 && stripped !== code && scan(stripped) === 1;
      })(), "");

    /* ⛔ 432 · ONE WAY-OUT LINK TREATMENT FOR THE SECTION (review visual-2). The wizard's repair declared the class
     * string in its own file, so the account page — built two steps earlier — kept hover-only affordance: no
     * underline and no brand ink at rest, which on a phone is no affordance at all. One section, two looks for one
     * control, and the two sat one click apart. */
    /** A file that DECLARES the section's way out — as the component it is now, or as the class string it was. */
    const DECLARES_WAY_OUT = /export function WayOutLink\b|\bWAY_OUT_LINK\s*=/;
    /** A call site trying to ADD to the shared look — the prop the component deliberately does not take. */
    const EXTENDS_WAY_OUT = /<WayOutLink[^>]*\bclassName/;
    /** The component's props, pinned CLOSED: a `className` or a rest spread here would reopen the three-looks door. */
    const CLOSED_PROPS = /export function WayOutLink\(\{ href, children \}: \{ href: string; children: React\.ReactNode \}\)/;
    /** A file re-typing TODAY's treatment verbatim. The DECLARING file is exempt from this one and only this one:
     *  it is where the treatment lives, so it necessarily contains it. */
    const RETYPES_TODAYS = (code: string, treatment: string) => treatment.length > 40 && code.includes(treatment);
    /** ⛔ THE HOVER-ONLY TREATMENT THE REVIEW REPLACED — and NO file is exempt from this one, the declaring file
     *  least of all. The C7 step 7 review's whole finding was that a way out with no underline and no brand ink at
     *  rest is no affordance at all on a phone. If the ONE module that owns the shared look reverted to it, every
     *  page in the section would wear it at once — the worst form of the defect, not an excused one.
     *  ⛔ AND IT WAS EXEMPT UNTIL NOW (found by this repair's own verifier, 2026-09-20): the declaring file was
     *  excused from BOTH halves when it should have been excused from one. Today's treatment does not contain this
     *  string, so the clause cannot fire on the honest file — it can only fire on the regression. */
    const RETYPES_LEGACY = (code: string) => /hover:text-brand-300 hover:underline/.test(code);
    /* ⛔ AND THE SHARED THING IS A COMPONENT, NOT THE CLASS STRING THE REVIEW FIRST WROTE (C7 step 7's review fix).
     * The review declared `WAY_OUT_LINK` in `console-routes.ts`; `test:house-bot-rules` 0.console-routes.ts refused
     * it, for a measured reason and not tidiness — Tailwind scans EVERY file, so a class-shaped string in a routes
     * module becomes CSS and an invalid one once 500'd every route on this platform. The review's reasoning was
     * right and only its home was wrong.
     * ⛔ THE THREE CLAIMS ARE UNCHANGED: ONE declaration site, at least TWO users BY NAME, ZERO files re-typing the
     * treatment. Each is simply asked about the shape that now carries the look.
     * ⭐ AND THE THIRD IS NOW STRUCTURALLY IMPOSSIBLE AS WELL AS MEASURED: a component with no `className` prop
     * cannot have classes added to it at a call site, which is how one shared look becomes three again. ⛔ THE SCAN
     * STAYS ANYWAY. "Impossible" is a reading of TODAY's signature, so the signature is pinned here beside it and
     * the call sites are swept for a `className` they have no prop for — widening the component then costs a red
     * rather than a screenshot. A proof deleted the day its defect becomes hard to write is how it comes back.
     * ⛔ THE TREATMENT IS READ OFF THE DECLARING FILE, NEVER TYPED HERE. A needle written twice rots, and an empty
     * capture would make `includes()` report every file clean — so its length is asserted before it is used. */
    ok("1.432 · the way-out link is declared ONCE, in the three pages' one shared module, and every page under the section uses it by name — no file re-types the treatment, and no caller can add to it",
      (() => {
        const routes = decomment(read(ROUTES_MODULE));
        const wayOutSrc = decomment(read(WAY_OUT_FILE));
        const treatment = /className="([^"]*)"/.exec(wayOutSrc)?.[1] ?? "";
        const declarers = sectionFiles.filter((f) => DECLARES_WAY_OUT.test(decomment(read(f))));
        const users = sectionFiles.filter((f) => f !== WAY_OUT_FILE && /<WayOutLink[\s>]/.test(decomment(read(f))));
        const retyped = sectionFiles.filter((f) => RETYPES_LEGACY(decomment(read(f)))
          || (f !== WAY_OUT_FILE && RETYPES_TODAYS(decomment(read(f)), treatment)));
        const extended = sectionFiles.filter((f) => EXTENDS_WAY_OUT.test(decomment(read(f))));
        return treatment.length > 40 && declarers.length === 1 && declarers[0] === WAY_OUT_FILE
          && users.length >= 2 && retyped.length === 0 && extended.length === 0
          && CLOSED_PROPS.test(wayOutSrc) && !/WAY_OUT_LINK/.test(routes);
      })(),
      j({
        declarers: sectionFiles.filter((f) => DECLARES_WAY_OUT.test(decomment(read(f)))),
        users: sectionFiles.filter((f) => f !== WAY_OUT_FILE && /<WayOutLink[\s>]/.test(decomment(read(f)))),
      }));
    ok("1.432 · CONTROL · the re-typed-treatment scan really fires — the old hover-only class string is reported when it is put back into a real section file in memory",
      (() => {
        const real = decomment(read(DETAIL_PAGE));
        const old = 'className="inline-flex items-center min-h-[var(--tap-min)] text-body-sm text-text-secondary hover:text-brand-300 hover:underline"';
        return !/hover:text-brand-300 hover:underline/.test(real) && /hover:text-brand-300 hover:underline/.test(`${real}\n${old}\n`);
      })(), "");
    ok("1.432 · CONTROL · …and it fires on TODAY's treatment too — the component's own class string pasted into a real section file in memory is reported, and the real tree is not",
      (() => {
        const treatment = /className="([^"]*)"/.exec(decomment(read(WAY_OUT_FILE)))?.[1] ?? "";
        const real = decomment(read(DETAIL_PAGE));
        return treatment.length > 40 && !RETYPES_TODAYS(real, treatment)
          && RETYPES_TODAYS(`${real}\nclassName="${treatment}"\n`, treatment);
      })(), "");
    /* ⛔ THE CONTROL FOR THE EXEMPTION ITSELF. The repair that re-aimed this assertion excused the DECLARING file
     * from both re-typing clauses when it should have excused it from one, so the single module that owns the
     * shared look could have reverted to the hover-only treatment and stayed green — every page in the section
     * wearing the defect at once. This plants exactly that regression into the declaring file in memory and
     * requires it to be reported. ⭐ It also asserts the honest file is NOT reported, so the clause is a
     * measurement rather than a scan that fires on everything. */
    ok("1.432 · CONTROL · the DECLARING file is NOT exempt from the hover-only treatment — the regression planted in way-out-link.tsx itself is reported",
      (() => {
        const wayOut = decomment(read(WAY_OUT_FILE));
        const reverted = wayOut.replace(
          /className="[^"]*"/,
          'className="inline-flex items-center min-h-[var(--tap-min)] text-body-sm text-text-secondary hover:text-brand-300 hover:underline"');
        return !RETYPES_LEGACY(wayOut) && RETYPES_LEGACY(reverted) && reverted !== wayOut;
      })(), "");
    ok("1.432 · CONTROL · a SECOND declaration planted in a real section file in memory is reported, so the ONE-declaration count is a measurement and not a scan that stopped matching",
      (() => {
        const real = decomment(read(DETAIL_PAGE));
        const planted = `${real}\nexport function WayOutLink({ href, children }: { href: string; children: React.ReactNode }) { return null; }\n`;
        return !DECLARES_WAY_OUT.test(real) && DECLARES_WAY_OUT.test(planted)
          && DECLARES_WAY_OUT.test(decomment(read(WAY_OUT_FILE)));
      })(), "");
    ok("1.432 · CONTROL · and a caller that tries to ADD to the treatment is reported — the `className` the component has no prop for, planted on a real call site in memory",
      (() => {
        const real = decomment(read(DETAIL_PAGE));
        const widened = real.replace("<WayOutLink href={CONSOLE_ROUTE}>", '<WayOutLink href={CONSOLE_ROUTE} className="text-heading-sm">');
        return !EXTENDS_WAY_OUT.test(real) && widened !== real && EXTENDS_WAY_OUT.test(widened);
      })(), "");

    /* ⛔ 432 · THE STATUS CHIP CANNOT SHRINK (review visual-1). Read off `acct-autopaused-360.png`: "Auto-paused"
     * broke at its hyphen into a two-line pill beside the one-line ACTIVE and PAUSED pills of the other states. The
     * roster had already ruled on this exact break and fixed it with a column floor; the page that paints the SAME
     * chip from the SAME server map got nothing. In a flex row a `size="sm"` chip is a shrinkable item. */
    ok("1.432 · the account strip's status chip is pinned against the flex shrink that broke the longest status word across two lines at 360",
      /<Chip size="sm" variant=\{view\.statusChip\} className="shrink-0">/.test(decomment(read(DETAIL_PAGE)))
        && /AUTO_PAUSED: \{ word: "Auto-paused"/.test(decomment(read("src/lib/server/house-bot/status-display.ts"))),
      "");

    /* ⛔ 432(o) · THE BAND'S TILE NAMES THE SCOPE OF ITS CEILING (review visual-3). The tile folds the PROJECTED
     * loss, the column 150px below heads it "(PROJECTED)", and the Limits tab splits the same ceiling into a
     * projected row and a settled row — so an unqualified "of daily loss limit" was one figure under three names,
     * two of them on one screen. The distinction decides which control acts. */
    ok("1.432 · the LOSS TODAY tile names its ceiling with the SCOPE the figure actually has, and the label itself stays short because the kit truncates a KPI label",
      (() => {
        const gateSrc = decomment(read(GATE));
        return /moneyTile\("Loss today", lossUsed, control\.gCapDailyLossTzs, `\$\{FIELD_META\.gCapDailyLossTzs\.label\} \(projected\)`\)/.test(gateSrc)
          && /const lossUsed = Math\.max\(0, sumDay\(dayBooks, \(b\) => b\.projectedLossTzs\)\);/.test(gateSrc)
          && /"projected"/.test(gateSrc) && /"settled"/.test(gateSrc);
      })(), "");

    /* ⛔ 388 · A REQUIRED FIELD SAYS SO (review visual-5). All three reason fields gate their primary button on
     * `CONSOLE_REASON_MIN`, and the counter counts DOWN from the maximum — so an officer who typed the confirm word
     * and no reason met a dead button with nothing on screen to explain it. Six admin dialogs next door already
     * mark the same field. */
    ok("1.388 · every reason field the console asks for is MARKED required, in the one copy home, and the floor that makes it required is still the shared constant",
      (() => {
        const gateSrc = decomment(read(GATE));
        const labels = [...gateSrc.matchAll(/reasonLabel: "([^"]+)"/g)].map((m) => m[1]);
        return labels.length === 4 && labels.every((t) => t.endsWith("(required)"))
          && /export const CONSOLE_REASON_MIN = 5;/.test(gateSrc)
          && /reason\.length < CONSOLE_REASON_MIN/.test(gateSrc);
      })(),
      j({ labels: [...decomment(read(GATE)).matchAll(/reasonLabel: "([^"]+)"/g)].map((m) => m[1]) }));

    /* ⛔ 453 · ONE APOSTROPHE GLYPH ACROSS THE WHOLE CONSOLE (review visual-6). A single U+2019 sat in one Global
     * limits row label among rows that all use the ASCII form — one row of that list would have rendered a
     * different glyph from its neighbours, and it lives below the fold of every tile this branch has captured. */
    ok("1.432 · not one curly apostrophe anywhere the console writes its own copy — the section's files and the gate use one glyph",
      [GATE, ...sectionFiles].every((f) => !read(f).includes("\u2019")),
      j({ dirty: [GATE, ...sectionFiles].filter((f) => read(f).includes("\u2019")) }));
    ok("1.432 · CONTROL · that glyph scan really fires — the gate's own text with one curly apostrophe put back is reported",
      !read(GATE).includes("\u2019") && `${read(GATE)}One player\u2019s share limit`.includes("\u2019"), "");

    /* ⛔ 435 · A PERMANENT RECORD CARRIES ITS YEAR (review visual-7). The removal Callout is the one card whose
     * whole purpose is to outlive the account, and it printed "Removed on 20 Sep 03:33 EAT" — a removal from a
     * previous year reads as this year. The clock already offers the wider pattern; the section's other two EAT
     * renderings are TODAY-scoped and correctly stay year-less. */
    ok("1.435 · the removal record's date carries the YEAR, while the two TODAY-scoped times beside it correctly do not",
      (() => {
        const gateSrc = decomment(read(GATE));
        return /formatEat\(removedAtMs, "D MMM YYYY"\)/.test(gateSrc)
          && /case "D MMM YYYY":/.test(decomment(read("src/lib/house-bot/clock.ts")));
      })(), "");

    /* ⛔ 432(n) · THE SAVED-RULES CARD IS ONE COMPONENT, AND ITS ONE DIFFERENCE IS NAMED (review visual-8). It was
     * two copies of one list that differed in exactly one line — the per-row caption — with nothing saying why, so
     * the divergence was invisible and the next edit would have landed on one of them. */
    ok("1.435 · the saved-rules card is declared ONCE and used by both states, and the caption difference is a named argument rather than a second copy of the markup",
      (() => {
        const code = decomment(read(DETAIL_PAGE));
        return (code.match(/function SavedRulesCard\(/g) ?? []).length === 1
          && (code.match(/<SavedRulesCard /g) ?? []).length === 2
          && /<SavedRulesCard rows=\{rulesRows\} reason=\{view\.rulesReason\} captions=\{false\} \/>/.test(code)
          && /<SavedRulesCard rows=\{rulesRows\} reason=\{view\.rulesReason\} captions \/>/.test(code)
          && (code.match(/<AdminCard title="Saved rules">/g) ?? []).length === 1;
      })(), "");

    /* ── 1.395 · THE CONSOLE ADDS NO ADMIN API ROUTE, OVER THE WALKED INVENTORY ──────────────────────────────────
     * ⛔ THE POPULATION IS THE DISK WALK, NEVER A REQUESTED-PATH LIST. The probe's `API_PATHS` substitutes report-id
     * VALUES into `/api/admin/reports/[id]` and carries the string `house-liquidity` as a FIXTURE, so an assertion
     * phrased over requested paths would report a fixture value as a route and fail on day one. Under D20 there is
     * no CSV, no report and no export, so every console read is a server-component read or a server action, and a
     * future console API route needs its own owner ruling and is judged as a public endpoint. */
    const apiRoutes = (() => {
      const out: string[] = [];
      const walkApi = (dir: string) => {
        for (const e of readdirSync(join(ROOT, dir))) {
          const rel = `${dir}/${e}`;
          if (statSync(join(ROOT, rel)).isDirectory()) walkApi(rel);
          else if (/^route\.tsx?$/.test(e)) out.push(dir.replace(/^src\/app/, ""));
        }
      };
      walkApi("src/app/api");
      return out;
    })();
    ok("1.395 · not one route PATH in the walked API inventory carries a vocabulary hit in any segment, and the console's own segment appears in it nowhere",
      apiRoutes.length >= 62 && apiRoutes.every((p) => houseHits(p).length === 0)
        && apiRoutes.every((p) => !p.includes("/desk")),
      j({ routes: apiRoutes.length, hits: apiRoutes.filter((p) => houseHits(p).length > 0 || p.includes("/desk")) }));
    /* ⛔ THE FILE WALK CARRIES ITS OWN POPULATION FLOOR AND ITS OWN CONTROL (C7 step 7 review, test-strength-11).
     * It had neither: a renamed directory or a changed extension filter would collect nothing, `bad.length === 0`
     * would be green for the wrong reason, and the extra printed nothing at all. The sibling control exercises the
     * PATH inventory, which is a different predicate. */
    const apiFileScan = (() => {
      const scanned: string[] = [];
      const bad: string[] = [];
      const walkFiles = (dir: string) => {
        for (const e of readdirSync(join(ROOT, dir))) {
          const rel = `${dir}/${e}`;
          if (statSync(join(ROOT, rel)).isDirectory()) walkFiles(rel);
          else if (/\.tsx?$/.test(e)) {
            scanned.push(rel);
            const code = decomment(read(rel));
            if (code.includes("/admin/desk") || code.includes("house-console-read")) bad.push(rel);
          }
        }
      };
      walkFiles("src/app/api");
      return { scanned, bad };
    })();
    ok("1.395 · and no file under `src/app/api/` names the console route or reaches its one read door — the desk is server-component and server-action only",
      apiFileScan.bad.length === 0 && apiFileScan.scanned.length >= 62,
      j({ scanned: apiFileScan.scanned.length, bad: apiFileScan.bad }));
    ok("1.395 · CONTROL · the FILE walk reports too — one real API file's own text, given the console route and the door's module name in memory, is named by the same predicate",
      (() => {
        const one = apiFileScan.scanned.find((f) => f.endsWith("health/route.ts")) ?? apiFileScan.scanned[0];
        const hit = (code: string) => code.includes("/admin/desk") || code.includes("house-console-read");
        const real = decomment(read(one));
        return !hit(real) && hit(`${real}\nconst DESK = "/admin/desk";\n`) && hit(`${real}\nimport "@/lib/server/house-console-read";\n`);
      })(), "");
    ok("1.395 · CONTROL · the same predicate, run over the REAL inventory with one console route planted into it, reports — and over the real inventory alone it does not",
      (() => {
        const bad = (inv: string[]) => inv.filter((p) => houseHits(p).length > 0 || p.includes("/desk"));
        return apiRoutes.includes("/api/health") && apiRoutes.length >= 50
          && bad([...apiRoutes, "/api/admin/desk"]).length === 1
          && bad([...apiRoutes, "/api/admin/house-bots"]).length === 1
          && bad(apiRoutes).length === 0;
      })(), j(apiRoutes.slice(0, 4)));

    /* ── 1.397 · THE VOCABULARY GROWS BY ONE MEASURED WORD, NEVER BY A NEW REGEX ─────────────────────────────────
     * ⛔ AND "enter now" IS NOT THAT WORD — DECIDED AGAINST THE DRAFT, ON A MEASUREMENT. C7-SPEC 397(b) scheduled
     * its promotion into `HOUSE_WORD_SOURCE` at this step. Replan ruling 511 had already refused it in the
     * vocabulary module's own header, and the tree says why: "Enter now" is a LIVE console control — ruling 508
     * built it at step 4 and the rules panel renders a row called exactly that (`house-console-read.ts`) — so
     * promoting the word would turn the desk's own control RED on §3, the guard that exists to keep the FEATURE's
     * name off the owner's screen. A word that can only match the console's own button measures nothing about
     * disclosure and costs every consumer a scan. NOT PROMOTED, and this case is the record of the decision. */
    const vocabSrc = read("scripts/lib/house-bot-vocabulary.mjs");
    ok("1.397 · `enter now` is NOT in the shared words, the module RECORDS why in its own header, and the console really does render it — so the refusal is a measured decision, not an omission",
      houseHits("enter now").length === 0 && houseHits("Enter now checked").length === 0
        && /`enter now` — ⛔ NOT a vocabulary word/.test(vocabSrc)
        && /name: "Enter now"/.test(read(GATE)),
      j({ hits: houseHits("enter now") }));
    /* ⛔ THE CONTROL RUNS THE EXTENDED PATTERN OVER THE GATE'S OWN RENDERED ROWS (C7 step 7 review,
     * test-strength-08). It used to build a regex beginning `enter now` and then check that it matched the string
     * "Enter now", which cannot be false for any such regex — a tautology standing where the claim "it finds the
     * desk's own rules row" belongs. The rows are right there in the gate's source. */
    ok("1.397 · CONTROL · promoting it WOULD redden the console — the extended pattern finds the desk's own rules row IN THE GATE'S OWN RENDERED ROWS, while today's finds none of them",
      (() => {
        const withIt = new RegExp(`enter now|${(consoleNeutralRegExp("i") as RegExp).source}`, "i");
        const rulesRows = [...read(GATE).matchAll(/name: "([^"]+)"/g)].map((m) => m[1]);
        return rulesRows.length >= 3 && rulesRows.some((r) => withIt.test(r)) && !rulesRows.some((r) => NEUTRAL.test(r))
          && !NEUTRAL.test("Enter now") && houseHits("liquidity").length > 0;
      })(), j({ rows: [...read(GATE).matchAll(/name: "([^"]+)"/g)].map((m) => m[1]) }));
    /* ⛔ 397(a) · THE PROBE JOINS THE CLOSED LIST OF ABSENCE CONSUMERS. It imports `houseHits` and declares no
     * pattern of its own, and until this step the single-source pin did not cover it — an absence instrument
     * outside the list that keeps every absence instrument honest. Read from the list's own SOURCE, because
     * importing that module would run `test:house-bot-reports`' cases. */
    const consumersSrc = read("scripts/lib/house-bot-reports-cases.mts");
    const consumers = [...(/export const VOCABULARY_CONSUMERS = \[([\s\S]*?)\] as const;/.exec(consumersSrc)?.[1] ?? "").matchAll(/"([^"]+)"/g)].map((m) => m[1]);
    ok("1.397 · the served probe is inside `VOCABULARY_CONSUMERS`, and the list only ever grows — the six absence instruments are all held to one vocabulary",
      consumers.includes("scripts/house-bot-console-probe.mts") && consumers.length >= 6
        && ["scripts/house-bot-disclosure.test.mts", "scripts/verify-house-bot-bundle.mjs"].every((f) => consumers.includes(f)),
      j({ consumers }));
    /* ⛔ 397(e) · A MEASURED DEVIATION, RECORDED RATHER THAN ENGINEERED AROUND — AND THE MEASUREMENT IS THE POINT.
     * 397(e) also asks that THIS suite join `VOCABULARY_CONSUMERS`. It cannot, and no cleverer detector rescues it:
     * `ownVocabulary` reports any regex whose source SPELLS a house word, and a SOURCE-LAW suite over house modules
     * must spell them as CODE to prove the one door reads what it says it reads. MEASURED on this file: NINETEEN
     * distinct regex sources spell a shared word sample, and every one but 1.373's struck-header scan is an
     * identifier scan — `houseBotControlStore\.get\(\)`, `houseBotStore\.listNonRemoved\(\)`,
     * `export type HouseBotBook`. Nothing mechanical separates those from a word list, so joining the closed list
     * would mean a per-file allowlist of nineteen entries, and `0.175.allow` exists precisely so such a list can
     * only SHRINK. What 397(e) actually wants is asserted here instead, and it is the half that can fail: this
     * suite re-declares none of the three family SOURCES, its every absence VERDICT is `houseHits` or the shared
     * console pattern, and the deviation is written down in the closed list's OWN source, where the next reader
     * looks — not in a plan file nobody greps. */
    const selfSrc = decomment(read("scripts/lib/house-bot-console-cases.mts"));
    const FAMILY_SOURCES = ["HOUSE_WORD_SOURCE", "HOUSE_IDENTIFIER_SOURCE", "HOUSE_ID_SOURCE", "PROPOSED_WORD_SAMPLES"];
    ok("1.397 · 397(e) · this suite imports the shared vocabulary, re-declares none of its three family sources, and reaches every absence verdict through `houseHits` or the one shared console pattern",
      /from "\.\/house-bot-vocabulary\.mjs"/.test(selfSrc)
        && FAMILY_SOURCES.every((n) => !new RegExp(`(const|let|var)\\s+${n}\\s*=`).test(selfSrc))
        && /const NEUTRAL = consoleNeutralRegExp\(\);/.test(selfSrc)
        && (selfSrc.match(/houseHits\(/g) ?? []).length >= 36,
      j({ houseHits: (selfSrc.match(/houseHits\(/g) ?? []).length }));
    /* ⛔ A GUARD MAY RECORD A DEVIATION; IT MAY NOT MAKE THE RULING'S OWN REMEDY A FAILURE (C7 step 7 review,
     * conformance-397e-pins-the-deviation). This case asserted `!consumers.includes(this file)` — so the session
     * that DID the work 397(e) orders (join the list with a per-file `VOCABULARY_PATTERN_ALLOWLIST` entry, which
     * is exactly the mechanism `0.175.allow` exists for and which the disclosure suite already uses) would have
     * turned this suite RED for complying. The case now passes EITHER way — the deviation recorded, or the work
     * done — and what it refuses is the third state: neither in the list nor explained. */
    const deviationRecorded = /house-bot-console-cases\.mts` is deliberately NOT here/.test(consumersSrc)
      && /0\.175\.allow` exists precisely so/.test(consumersSrc);
    ok("1.397 · 397(e) · this file is EITHER inside `VOCABULARY_CONSUMERS` or the reason it is not is written in that list's own source — the deviation lives where the next reader looks, and doing the work the ruling asks for can never turn this red",
      consumers.includes("scripts/lib/house-bot-console-cases.mts") || deviationRecorded,
      j({ inList: consumers.includes("scripts/lib/house-bot-console-cases.mts"), deviationRecorded }));
    ok("1.397 · 397(e) · CONTROL · the third state IS reported — neither in the list nor explained fails, while each of the two acceptable states passes",
      (() => {
        const decide = (inList: boolean, recorded: boolean) => inList || recorded;
        return decide(true, false) && decide(false, true) && decide(true, true) && !decide(false, false);
      })(), "");
    ok("1.397 · 397(e) · CONTROL · the family-source detector really fires — each of the four planted into this file's own text is reported, and none of them is there today",
      FAMILY_SOURCES.every((n) => new RegExp(`(const|let|var)\\s+${n}\\s*=`).test(`${selfSrc}\nconst ${n} = "x";`))
        && FAMILY_SOURCES.every((n) => !new RegExp(`(const|let|var)\\s+${n}\\s*=`).test(selfSrc)), "");

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
    /* ⭐ C7 STEP 7 ADDS THE SEVENTH RUNG, AND ITS ARTEFACT IS A REMOVAL. Every rung below is a page or a tab the
     * step CREATED; the closing step creates none — what it does is retire two things that were only ever
     * scaffolding, so the rung is read off their ABSENCE: `book.ts` no longer declares the results reader D20
     * struck (371), and the comms suite no longer carries the `COMMIT_7` exemption that let `7.2` skip the
     * console's own hrefs while its three pages were being built one at a time (320). Both are read as CODE, so
     * the record either file keeps of the removal in a comment cannot satisfy the ladder. */
    /* ⛔ THE LADDER IS READ FROM THE BOTTOM, AND A HOLE IS REPORTED RATHER THAN SKIPPED (C7 step 7 review,
     * d19-hunt-02 / test-strength-02). It was a short-circuit chain with the TOP rung first, so a true higher
     * rung masked a false lower one: MEASURED on this tree, `closing` is true and `activity` is FALSE — C7 step
     * 5 was never built — and the chain returned 7 without ever looking at `activity`. The guard whose whole
     * purpose is to refuse a silence therefore printed "built through 7" over a console missing a whole area,
     * and its own docblock's invariant ("each rung is the artefact that step creates") was false as written.
     * ⛔ `built` STAYS THE HIGHEST RUNG PRESENT, deliberately. Lowering it to the last unbroken rung would stop
     * requiring the step-6 and step-7 D19 ids the tree DOES carry — a guard failing open to look tidier. The
     * hole is reported beside it instead, and PRINTED every run. */
    const RUNGS: ReadonlyArray<readonly [number, "limits" | "detail" | "activity" | "wizard" | "closing"]> =
      [[3, "limits"], [4, "detail"], [5, "activity"], [6, "wizard"], [7, "closing"]];
    const ladder = (t: Record<string, boolean>) => {
      const present = RUNGS.filter(([, k]) => t[k]);
      const built = present.length ? present[present.length - 1][0] : 1;
      return { built, gaps: RUNGS.filter(([n, k]) => n <= built && !t[k]).map(([n, k]) => `${n}:${k}`) };
    };
    const tree = {
      closing: !decomment(read("src/lib/server/house-bot/book.ts")).includes("houseBotBook")
        && !decomment(read("scripts/lib/house-bot-comms-cases.mts")).includes("COMMIT_7"),
      wizard: existsSync(join(ROOT, `${SECTION}/new/page.tsx`)),
      activity: (CR.CONSOLE_TABS as readonly string[]).includes("activity"),
      detail: existsSync(join(ROOT, DETAIL_PAGE)),
      limits: (CR.CONSOLE_TABS as readonly string[]).includes("limits"),
    };
    const rungs = ladder(tree);
    const BUILT_THROUGH = rungs.built;
    /* ⛔ THE HOLES THIS TREE IS RECORDED AS HAVING, AND IT IS A DEBT THAT CAN ONLY SHRINK — never a permission.
     * ⭐ IT IS EMPTY AS OF 2026-09-20, AND THE ENTRY WAS DELETED IN THE SAME COMMIT AS THE BUILD THAT PAID IT.
     * `5:activity` recorded C7 step 5: first the whole step, then — when the ACCOUNT page's half landed — the
     * LANDING half alone. Both halves are on disk now: `CONSOLE_TABS` carries `activity` and `history`, the two
     * DESK-WIDE readers are behind them, the landing rail is the account page's own rail file, both panels page
     * against COUNTING readers, and the cancel write path creates the first press anything under `src/` ever has.
     * ⛔ A RECORD LEFT DESCRIBING WORK THAT IS DONE IS A WRONG AUTHORITY, and this programme has paid for that
     * class more than once — so the list is emptied with the build rather than merely kept.
     * ⛔ AND AN EMPTY LIST IS NOT A WEAKER GUARD: `rungs.gaps.every(...)` over an empty `RECORDED_GAPS` means any
     * hole at all is reported by name, which is the strongest this case can be. An UNRECORDED hole fails
     * immediately, and a recorded one that has since been built fails until its entry is deleted. */
    const RECORDED_GAPS: readonly string[] = [];
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
      missing.length === 0 && dueHere.length >= 19
        && area5.length >= 19 && area5.every((id) => D19.some((d) => d.id === id))
        && j(extras) === j(["1.332", "1.342", "1.343"]),
      j({ builtThrough: BUILT_THROUGH, gaps: rungs.gaps, dueHere: dueHere.length, area5: area5.length, notInRollCall: area5.filter((id) => !D19.some((d) => d.id === id)), missing: missing.map((d) => `${d.id} (${d.what})`), later: later.map((d) => `${d.id}@step${d.step}:${d.owner}`) }));
    ok("1.398 · LADDER · every rung below the highest one this tree carries is either PRESENT or a hole this repository has recorded — an unrecorded hole is named here, and a recorded one that has since been built is named so the record is deleted with the build",
      rungs.gaps.every((g) => RECORDED_GAPS.includes(g)) && RECORDED_GAPS.every((g) => rungs.gaps.includes(g)),
      j({ builtThrough: BUILT_THROUGH, gaps: rungs.gaps, recorded: RECORDED_GAPS, tree }));
    /* ⛔ THE POSITIVE HOLE CASE IS DELETED, NOT WEAKENED (C7 step 5, the landing half). It asserted
     * `rungs.gaps.length === 1 && rungs.gaps[0] === "5:activity" && tree.activity === false` — that this tree
     * REALLY had the hole the list recorded. Its subject is gone: there is no hole. Lowering it to `>= 0` would
     * have left a line that can never fail, which is the shape this whole programme is written against.
     * ⛔ WHAT REPLACES IT ASKS THE SAME QUESTION OF THE STATE THAT EXISTS NOW: the ladder is COMPLETE, and both
     * halves of step 5 are read separately and PRINTED, so "step 5 is built" can never again be inferred from one
     * of them. A rung that is true for the wrong half is exactly how this rung read "built through 7" over a
     * console missing a whole area. */
    ok("1.398 · LADDER · ⛔ THE LADDER IS COMPLETE AND BOTH HALVES OF STEP 5 ARE READ SEPARATELY: this tree carries the closing step's artefact AND `CONSOLE_TABS`'s two new keys AND `CONSOLE_DETAIL_TABS`'s — no rung is satisfied by the other half's build",
      rungs.gaps.length === 0 && BUILT_THROUGH === 7 && tree.activity === true
        && CR.consoleTabExists("activity") && CR.consoleTabExists("history")
        && CR.consoleDetailTabExists("activity") && CR.consoleDetailTabExists("history")
        /* ⛔ AND THE RUNG IS READ OFF THE LANDING LIST, which is the half it has always measured: a tree with the
           detail panels alone must still report the hole, and the vector below proves it does. */
        && ladder({ ...tree, activity: false }).gaps.length === 1
        && ladder({ ...tree, activity: false }).gaps[0] === "5:activity",
      j({ gaps: rungs.gaps, landing: [...CR.CONSOLE_TABS], detail: [...CR.CONSOLE_DETAIL_TABS] }));
    /* ⛔ AND THE DERIVATION IS SHOWN TO HAVE READ THE SPEC: an empty slice makes `every` trivially true, which is
     * the population trap the roll-call itself was written against. */
    /* ⛔ AND THE LADDER REALLY MOVES WITH THE TREE. A ratchet read off disk is worth nothing if the reading is a
     * constant, so `rung` is exercised over every rung it can return — and the tree's own four facts are PRINTED, so
     * the step that adds the detail page or the wizard sees the number change rather than having to trust it.
     * ⚠️ This control does NOT assert today's tree shape: a step-4 build must not go red here for building step 4. */
    ok("1.398 · CONTROL · Area 5 was really parsed out of C7-SPEC §2, `BUILT_THROUGH` is a LADDER over the tree — not a constant, not typed — and the MIXED shape this tree actually has is exercised, which the nested-only vector never was",
      (() => {
        const t = (limits: boolean, detail: boolean, activity: boolean, wizard: boolean, closing: boolean) =>
          ladder({ limits, detail, activity, wizard, closing });
        const nested = [t(false, false, false, false, false), t(true, false, false, false, false), t(true, true, false, false, false),
          t(true, true, true, false, false), t(true, true, true, true, false), t(true, true, true, true, true)];
        const mixed = t(true, true, false, true, true);
        return area5Src.length > 2_000 && area5.includes("1.380") && area5.includes("1.399")
          && j(nested.map((r) => r.built)) === j([1, 3, 4, 5, 6, 7])
          && nested.every((r) => r.gaps.length === 0)
          && mixed.built === 7 && j(mixed.gaps) === j(["5:activity"])
          && BUILT_THROUGH === ladder(tree).built;
      })(),
      j({ area5Chars: area5Src.length, area5, tree, builtThrough: BUILT_THROUGH, gaps: rungs.gaps }));
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
      dueHere.filter((d) => d.owner === "console" && (d.step === 2 || d.step === 7)).every((d) => controls.includes(d.id))
        && controls.length >= 20,
      j({ controls: [...new Set(controls)].sort(), dueControlled: dueHere.filter((d) => d.step === 2 || d.step === 7).map((d) => d.id) }));
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
