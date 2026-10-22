/**
 * test:maswali-rbac — WHO MAY SEE AND DO WHAT ON MILLIONEA'S CONSOLE (MASWALI-BUILD S4; MASWALI-PLAN §7b S4 items 2–3).
 *
 *   npx tsx scripts/maswali-rbac.test.mts      (npm run test:maswali-rbac; red twin: npm run red:maswali-rbac)
 *
 *   §1 the four routes resolve to their domains: the money page to accounting and the integrity page to compliance,
 *      ABOVE the bare prefix (the matcher's first match wins), the week list and a week page to trading.
 *   §2 ⭐ every staff role × every Millionea control, written out (never derived from the grant table it tests): the
 *      week's officer runs the week, accounting releases, compliance pauses, voids and decides shares, the Owner alone
 *      funds, returns, stops, records the licence and moves the switch — and a role that may VIEW a page but not act
 *      on its domain is offered nothing.
 *   §3 every control is enforced in its own route's action file, by its own id: `requireStaff(CONTROL_DOMAIN.<id>, "<id>")`.
 *   §4 no control is placed on a page its acting role cannot open (the E-23 lesson: a control a role can work but
 *      never reach is not a control).
 *   §5 the nav: one Millionea group, each item in its page's own domain.
 *   §6 S7-F2 · the Owner's two forms on the trading page (the rules of the next week, the holiday list): each rendered
 *      behind its own flag, with a locked alternative naming its own control — and the values read by every viewer.
 *   §7 (S6, MB-92) the Auditor READS every Millionea record outside the trading console and acts on none; the sealing
 *      officer never opens the evidence; and the evidence module, its page and its download write nothing but the
 *      download's own record.
 *   §8 (S6, MB-64) the support desk's lookup: the support domain's page, never the sealer's; a read in no control table;
 *      its module, page, form and scripts write nothing; its action asks the page's own domain; it records itself
 *      before it answers and answers nothing when the record failed; and a ticket's answers only once its week is final.
 *   §9 (S6 review round 2) the integrity page prints a share's mark only through the one projection (R2-1), and pages
 *      the cluster report's groups and a group's accounts (R2-18). Round 3: the page's projection is the console's —
 *      an allowlisted hold word as it is — while the regulator's CSV keeps the neutral one and the access exports read
 *      neither; and each cluster line is keyed by its stable id. Round 4: the allowlist is typed by the settlement's own
 *      hold reasons; the table lists every line in the report's one order (R5's rule, across the weeks shown); and an
 *      opened crowded line is named as a place and read a page at a time.
 *   §10 ⭐ round 17 (M1) · what a role without a control is drawn: every console page decides each control from an AWAITED
 *      check (a pending promise in a condition is always true), and a role that may open the integrity page but not
 *      record the letters' check is drawn its lock — red plant (7).
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { decomment } from "./lib/decomment.mts";
import { CONTROL_DOMAIN, canUseControl, type ControlId } from "../src/lib/server/control-gates.ts";
import { canView } from "../src/lib/server/rbac.ts";
import { domainForPath, type Role } from "../src/lib/server/roles.ts";
import { NAV_GROUPS } from "../src/components/admin/admin-nav-groups.ts";

let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, extra = "") => {
  if (cond) pass++; else fail++;
  console.log(`${cond ? "PASS" : "FAIL"} ${label}${extra ? ` — ${extra}` : ""}`);
};
const read = (rel: string) => readFileSync(join(process.cwd(), rel), "utf8");

const ROUTES = {
  week: { path: "/admin/maswali", domain: "trading", file: "src/app/admin/maswali/actions.ts" },
  weekPage: { path: "/admin/maswali/mlw_example", domain: "trading", file: "src/app/admin/maswali/actions.ts" },
  pools: { path: "/admin/maswali/pools", domain: "accounting", file: "src/app/admin/maswali/pools/actions.ts" },
  integrity: { path: "/admin/maswali/integrity", domain: "compliance", file: "src/app/admin/maswali/integrity/actions.ts" },
  // S6 · MB-92 · no control lives here: the page only reads, and its download only records itself.
  evidence: { path: "/admin/maswali/evidence", domain: "compliance", file: "src/app/api/admin/maswali/evidence/[weekId]/route.ts" },
  // S6 · MB-64 · no control lives here either: the desk's lookup is a read.
  lookup: { path: "/admin/maswali/lookup", domain: "support", file: "src/app/admin/maswali/lookup/actions.ts" },
} as const;

/** Each Millionea control, its domain as written in the plan's §7b S4 table, and the route that hosts it. */
const CONTROLS: Array<{ id: ControlId; domain: string; route: keyof typeof ROUTES }> = [
  ...(["createMaswaliWeek", "editMaswaliQuestion", "attestMaswaliParity", "openMaswaliWeek", "moveMaswaliClose", "sealMaswaliQuestion",
    "voidMaswaliQuestion", "confirmMaswaliSeal", "correctMaswaliSeal"] as const).map((id) => ({ id, domain: "trading", route: "week" as const })),
  { id: "releaseMaswaliSettlement", domain: "accounting", route: "pools" },
  // S6 (2026-10-18): the desk's record of a call that reached a winner (MB-93) joins Compliance's acts on /integrity.
  // S7-OB: the ruling on a player's objection to one question (MR-16) joins them too.
  ...(["voidMaswaliWeek", "pauseMaswaliSales", "resumeMaswaliSales", "holdMaswaliShare", "releaseMaswaliShare", "forfeitMaswaliShare",
    "markMillioneaWinnerReached", "clearUnresolvedLetter", "ruleMaswaliObjection"] as const)
    .map((id) => ({ id, domain: "compliance", route: "integrity" as const })),
  ...(["fundMaswaliGuarantee", "returnMaswaliGuarantee", "sunsetMaswali", "setMaswaliLicenceBasis", "setMillioneaRollout"] as const)
    .map((id) => ({ id, domain: "ops", route: "pools" as const })),
  // S7-F2 · the Owner's (ops) forms on the trading page: the Owner opens every page, so §4 has no other actor to reach it.
  ...(["saveMaswaliConfig", "saveMaswaliHolidays"] as const).map((id) => ({ id, domain: "ops", route: "week" as const })),
];

// The acting role per domain, as DEFAULT_GRANTS ships it (`roles.ts`). ADMIN (the Owner) bypasses the table.
const ACTS: Record<string, string[]> = { trading: ["MODERATOR"], accounting: ["FINANCE"], compliance: ["COMPLIANCE"], ops: [] };
const ROLES: Role[] = ["ADMIN", "MODERATOR", "COMPLIANCE", "FINANCE", "GROWTH", "SUPPORT", "AUDITOR", "PLAYER", "AGENT"] as Role[];

// ── §1 · the routes ─────────────────────────────────────────────────────────
for (const [name, r] of Object.entries(ROUTES)) {
  ok(`1 · ${name} ${r.path} → ${r.domain}`, domainForPath(r.path) === r.domain, `got ${domainForPath(r.path)}`);
}

// ── §2 · every role × every control ─────────────────────────────────────────
// S6-INT 14 · 25 at the N squash: 21 before S7, S7-F2's two (saveMaswaliConfig, saveMaswaliHolidays) and the notices' two
// (markMillioneaWinnerReached, clearUnresolvedLetter, Compliance on /integrity) — the count this suite printed.
// S6-INT 21 · 26 with S7-OB's objection ruling (ruleMaswaliObjection, Compliance on /integrity) merged in.
ok("2 · there are 26 Millionea controls, each registered", CONTROLS.length === 26 && CONTROLS.every((c) => c.id in CONTROL_DOMAIN), `${CONTROLS.length}`);
for (const c of CONTROLS) {
  ok(`2 · ${c.id} is registered ${c.domain}`, CONTROL_DOMAIN[c.id] === c.domain, `registered ${CONTROL_DOMAIN[c.id]}`);
  for (const role of ROLES) {
    const want = role === "ADMIN" || ACTS[c.domain].includes(role);
    const got = await canUseControl(role, c.id);
    ok(`2 · ${role} · ${c.id} → ${want}`, got === want, got === want ? "" : `got ${got}`);
  }
  ok(`2 · no session · ${c.id} → false`, (await canUseControl(null, c.id)) === false);
}

// ── §3 · each control enforced in its own route's action file, by its own id ─
for (const c of CONTROLS) {
  const src = read(ROUTES[c.route].file);
  // The draft builder posts all changed slots to one atomic action; its audit name is plural.
  const actionName = c.id === "editMaswaliQuestion" ? "editMaswaliQuestions" : c.id;
  ok(`3 · ${c.id} is enforced as requireStaff(CONTROL_DOMAIN.${c.id}, "${actionName}") in ${ROUTES[c.route].file}`,
    src.includes(`requireStaff(CONTROL_DOMAIN.${c.id}, "${actionName}")`));
}

// ── §4 · every acting role can open the page that hosts its control ─────────
for (const c of CONTROLS) {
  for (const role of ACTS[c.domain]) {
    const reach = await canView(role as Role, domainForPath(ROUTES[c.route].path));
    ok(`4 · ${role} can open ${ROUTES[c.route].path}, where ${c.id} lives`, reach);
  }
}

// ── §5 · the nav ────────────────────────────────────────────────────────────
{
  const g = NAV_GROUPS.find((x) => x.group.en === "Millionea");
  ok("5 · one Millionea group in the admin nav", !!g);
  for (const item of g?.items ?? []) {
    ok(`5 · nav ${item.href} is in its page's domain (${domainForPath(item.href)})`, item.domain === domainForPath(item.href), `nav says ${item.domain}`);
  }
  // 2026-10-18 · MASWALI-BUILD S6 re-pins "the three pages" to five: the evidence page (MB-92) and the support desk's
  // lookup (MB-64) join the group.
  ok("5 · the group holds the five pages", (g?.items ?? []).map((i) => i.href).join(",") === "/admin/maswali,/admin/maswali/pools,/admin/maswali/integrity,/admin/maswali/evidence,/admin/maswali/lookup");
}

// ── §6 · S7-F2 · the Owner's forms: behind their own flags, locked and read-only for every other role ─────────────
{
  const page = decomment(read("src/app/admin/maswali/page.tsx"));
  for (const [id, flag, form] of [["saveMaswaliConfig", "canRules", "RulesForm"], ["saveMaswaliHolidays", "canHolidays", "HolidaysForm"]] as const) {
    ok(`6 · the page asks canUseControl(${id}) for the viewer's role`, page.includes(`canUseControl(session?.role, "${id}")`));
    const uses = page.split(`<${form} `).length - 1;
    ok(`6 · <${form}> is rendered once, behind ${flag}`, uses === 1 && page.includes(`${flag} ? <${form} `), `${uses} uses`);
    ok(`6 · …and its locked alternative names ${id}'s own domain`, page.includes(`need={CONTROL_DOMAIN.${id}}`));
  }
  ok("6 · a role that may not change them still reads every rule and the holiday list (MB-75, MB-85)",
    page.includes("<RulesReadOnly ") && page.includes("<HolidayList "));
  ok("6 · the rules card says a change applies from the next week to open, never to a running one (MB-75)",
    page.includes("A change applies from the next week to open, never to a running one"));
  ok("6 · ⛔ the licence basis is not on this form: no licence control on the trading page", !page.includes("setMaswaliLicenceBasis") && !page.includes("LicenceCeremony"));
}

// Nothing writes (§7, §8): a module, page or download holds no write, no lock, no money and no control. Comments are
// stripped first (a sentence naming a verb is not one), and a digest's `createHash(…).update(…)` is folded away: it feeds
// a hash, it writes no row.
const code = (rel: string) => read(rel).replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1")
  .replace(/createHash\([^)]*\)\.update\(/g, "createHash(");
const WRITES = /\.(create|createMany|createManyAndReturn|update|updateMany|upsert|delete|deleteMany|markSeen|patch)\(|\b(withLock|withMoneyTx|postMaswaliLines|postLedgerEntries|requireStaff|softRequireStaff|addWalletFreeze)\(|\$executeRaw|"use server"/;

// ── §7 · S6 · the Auditor reads, nothing writes (MB-92) ─────────────────────
{
  // Written out, never derived from the grant table under test: who may open each Millionea page, by default.
  const OPENS: Record<string, Role[]> = {
    "/admin/maswali": ["ADMIN", "MODERATOR"],
    "/admin/maswali/mlw_example": ["ADMIN", "MODERATOR"],
    "/admin/maswali/pools": ["ADMIN", "COMPLIANCE", "FINANCE", "AUDITOR"],
    "/admin/maswali/integrity": ["ADMIN", "COMPLIANCE", "AUDITOR"],
    "/admin/maswali/evidence": ["ADMIN", "COMPLIANCE", "AUDITOR"],
    // S6 · MB-64 · the support domain: the desk, Compliance (view) and the Owner.
    "/admin/maswali/lookup": ["ADMIN", "COMPLIANCE", "SUPPORT"],
  };
  const STAFF: Role[] = ["ADMIN", "MODERATOR", "COMPLIANCE", "FINANCE", "GROWTH", "SUPPORT", "AUDITOR"] as Role[];
  for (const [path, who] of Object.entries(OPENS)) {
    for (const role of STAFF) {
      const want = who.includes(role);
      const got = role === "ADMIN" ? true : await canView(role, domainForPath(path));
      ok(`7 · ${role} ${want ? "opens" : "does not open"} ${path}`, got === want, got === want ? "" : `got ${got}`);
    }
  }
  ok("7 · ⭐ the Auditor reads the pools, the integrity page and the evidence — every Millionea record outside the trading console",
    (await Promise.all(["/admin/maswali/pools", "/admin/maswali/integrity", "/admin/maswali/evidence"].map((p) => canView("AUDITOR" as Role, domainForPath(p))))).every(Boolean));
  ok(`7 · ⛔ …and acts on NONE of the ${CONTROLS.length} Millionea controls`,
    (await Promise.all(CONTROLS.map((c) => canUseControl("AUDITOR" as Role, c.id)))).every((x) => x === false));
  ok("7 · ⛔ MB-34 · the trading officer who seals cannot open the evidence (it carries every ticket's answers)",
    (await canView("MODERATOR" as Role, domainForPath("/admin/maswali/evidence"))) === false);

  // Nothing writes: the module, the page, the download's door and its route — the download's one side effect is its own
  // audit record.
  for (const rel of ["src/lib/server/maswali-evidence.ts", "src/lib/server/maswali-evidence-door.ts", "src/app/admin/maswali/evidence/page.tsx",
    "src/app/api/admin/maswali/evidence/[weekId]/route.ts"]) {
    const src = code(rel);
    ok(`7 · ⛔ ${rel} writes nothing`, src.length > 500 && !WRITES.test(src), (src.match(WRITES) ?? [""])[0]);
  }
  ok("7 · CONTROL · the same pattern FINDS a write where one lives, so the silences above are measurements",
    WRITES.test(code("src/app/admin/maswali/integrity/actions.ts")) && WRITES.test(code("src/lib/server/maswali-dal.ts")));
  const door = code("src/lib/server/maswali-evidence-door.ts");
  const route = code("src/app/api/admin/maswali/evidence/[weekId]/route.ts");
  ok("7 · the download's door asks the evidence PAGE's own domain, so the page and the file can never disagree about who may read",
    /const EVIDENCE_PAGE = "\/admin\/maswali\/evidence";/.test(door) && /canView\(u\.role, domainForPath\(EVIDENCE_PAGE\)\)/.test(door)
      && /checkAdminTotp\(/.test(door) && /exportRequestAllowed\(/.test(door) && /await deps\.record\(\{/.test(door));
  ok("7 · R2-5 · the route is thin: it hands the door the production object and decides nothing of its own",
    /maswaliEvidenceDoor\([\s\S]*?MASWALI_EVIDENCE_DOOR_DEPS\)/.test(route) && !/\b(?:currentSession|canView|checkAdminTotp|audit|db)\b/.test(route),
    (route.match(/\b(?:currentSession|canView|checkAdminTotp|audit|db)\b/) ?? [""])[0]);
}

// ── §8 · S6 · the support desk's lookup of one ticket (MB-64) ──────────────
{
  const LOOKUP = "/admin/maswali/lookup";
  ok("8 · ⛔ MB-34 · the trading officer who seals cannot open the desk's lookup",
    (await canView("MODERATOR" as Role, domainForPath(LOOKUP))) === false);
  ok("8 · the desk opens it, and Compliance reads it — the support domain's own grant",
    (await canView("SUPPORT" as Role, domainForPath(LOOKUP))) && (await canView("COMPLIANCE" as Role, domainForPath(LOOKUP))));
  ok("8 · the lookup is a read: no control id names it, so no role gains an act through it",
    !Object.keys(CONTROL_DOMAIN).some((id) => /lookup/i.test(id)));
  for (const rel of ["src/lib/server/maswali-support.ts", "src/lib/maswali-support-scripts.ts", "src/app/admin/maswali/lookup/page.tsx",
    "src/app/admin/maswali/lookup/lookup-form.tsx", "src/app/admin/maswali/lookup/script-block.tsx"]) {
    const src = code(rel);
    ok(`8 · ⛔ ${rel} writes nothing`, src.length > 500 && !WRITES.test(src), (src.match(WRITES) ?? [""])[0]);
  }
  // The action is a server action, so its directive is set aside before the same pattern reads it.
  const act = code("src/app/admin/maswali/lookup/actions.ts").replace(/^"use server";/m, "");
  ok("8 · ⛔ the lookup's action writes nothing either — behind the console guard, its one call is the lookup",
    act.length > 500 && !WRITES.test(act) && /softRequireConsole\(/.test(act) && /lookupMaswaliTicketForDesk\(/.test(act), (act.match(WRITES) ?? [""])[0]);
  ok("8 · the lookup asks the lookup PAGE's own domain, so the page and the read can never disagree about who may look",
    /const LOOKUP_PAGE = "\/admin\/maswali\/lookup";/.test(act) && /canView\(guard\.role, domainForPath\(LOOKUP_PAGE\)\)/.test(act));
  const sup = code("src/lib/server/maswali-support.ts");
  const recordAt = sup.indexOf("const record = await deps.record({");
  const refusedAt = sup.indexOf("if (!record.recorded) return { ok: false, error: DESK_UNRECORDED };");
  const notFoundAt = sup.indexOf("if (!view || !stored) return { ok: false, error: DESK_NOT_FOUND };");
  ok("8 · ⭐ the lookup records itself before it answers, found or not — and answers nothing when that record failed",
    recordAt > 0 && refusedAt > recordAt && notFoundAt > refusedAt && sup.indexOf("ok: true,") > notFoundAt, JSON.stringify([recordAt, refusedAt, notFoundAt]));
  ok("8 · ⛔ MB-34 · a ticket's answers are read only once its week is final, and the salt never (MB-32)",
    /const final = view\.week\.state === "SETTLED" \|\| view\.week\.state === "VOIDED";/.test(sup) && /answers: final \? view\.slots\.map\(/.test(sup)
      && !/\bsalt\b/.test(sup));
  // R2-4 · the budget is spent before the first read; R2-12 · every lookup reads the ticket by its serial AND the account
  // by the number typed — never the owner only when the serial exists — so an unknown serial costs what a known one does.
  const budgetAt = sup.indexOf("await deps.budget(input.officerId)"), firstReadAt = sup.indexOf("await ticketStore.getBySerial(serial)");
  ok("8 · ⛔ R2-4 · the officer's lookup budget is spent before anything is read, and the production budget is the `maswali.lookup` bucket",
    budgetAt > 0 && firstReadAt > budgetAt && /budget: \(officerId: string\) => rateCheckAsync\(officerId, "maswali\.lookup"\)/.test(sup), JSON.stringify([budgetAt, firstReadAt]));
  ok("8 · ⛔ R2-12 · an unknown serial costs the same reads as a known one: the account is read by the number typed, unconditionally",
    /const caller = await db\.user\.findByPhone\(/.test(sup) && !/stored \? await db\.user\.findById/.test(sup));
}

// ── §9 · S6 review round 2 · what the integrity page prints (R2-1, R2-18) ───
{
  const page = code("src/app/admin/maswali/integrity/page.tsx");
  // R3 · the deciding officer's projection: an allowlisted hold word as it is, every other mark as the neutral one reads it.
  ok("9.1 · ⛔ R2-1 · D19 · the integrity page prints a share's mark only through the console's projection — no raw reason in any cell, and both cells read it",
    !/\{\s*(?:h\.reason|w\.frozenReason)\s*\}/.test(page) && (page.match(/consoleShareNoteOf\(/g) ?? []).length >= 2,
    (page.match(/\{\s*(?:h\.reason|w\.frozenReason)\s*\}/) ?? [""])[0]);
  // S6-INT · one group's accounts page on `gpage`: S5's held-shares list pages on `hpage` on the same page.
  ok("9.2 · R2-18 · the cluster report's groups, and one group's accounts, come a page at a time through the console's pager",
    /param="cpage"/.test(page) && /param="gpage"/.test(page) && /parsePage\(query\.cpage, rows\.length, CONSOLE_PER_PAGE\)/.test(page)
      && /parsePage\(query\.gpage, open\.g\.accountCount, CONSOLE_PER_PAGE\)/.test(page));
  // R2-7 · the complaint path names the Terms section by the title the Terms print, so a renumbering cannot make it stale;
  // and the answer target is the setting's, never a constant.
  const scripts = read("src/lib/maswali-support-scripts.ts"), terms = read("src/app/legal/terms/page.tsx"), sup = code("src/lib/server/maswali-support.ts");
  ok("9.3 · R2-7 · the complaint path names the Terms section by the TITLE the Terms print, in each language — never by its number",
    /title="Voids and disputes"/.test(terms) && /title="Kufuta dau na migogoro"/.test(terms)
      && scripts.includes("“Voids and disputes”") && scripts.includes("“Kufuta dau na migogoro”") && !/section 6|kifungu cha 6/.test(scripts));
  ok("9.4 · R2-7 · the desk quotes the complaint answer target from `maswali.config`, live — no constant holds it",
    /answerDays: live\.complaintAnswerDays/.test(sup) && !/COMPLAINT_ANSWER_DAYS/.test(scripts + sup));
  // R3 · the console's allowlist stays on the console: the file that leaves it reads the neutral projection only.
  const evidence = code("src/lib/server/maswali-evidence.ts"), privacy = code("src/lib/server/privacy.ts");
  ok("9.5 · ⛔ R3 · the regulator's CSV reads a share's note only through the neutral projection — never the console's allowlist — and the access exports read neither",
    evidence.includes("won ? shareNoteOf(t.frozenReason) : null") && !(evidence + privacy).includes("consoleShareNoteOf")
      && !(evidence + privacy).includes("MILLIONEA_CONSOLE_HOLD_REASONS") && !privacy.includes("shareNoteOf("));
  ok("9.6 · R3 · the cluster table keys each line by its stable id, never by its place in the list — so a line's link opens that line",
    page.includes("key: `${c.weekId}.${g.id}`") && !page.includes(".map((g, j) =>"));
  // R4 · the allowlist's words are the settlement's own type, so a renamed reason fails the build instead of going neutral.
  const share = code("src/lib/maswali-share-note.ts");
  ok("9.7 · R4 · the console's allowlist takes its words from the settlement's `HoldReason` — a renamed reason fails the build, never turns neutral in silence",
    share.includes('import type { HoldReason } from "@/lib/server/maswali-settlement"') && share.includes("] as const satisfies readonly HoldReason[]);"));
  // R4 · one order for every line, a winner's first; and a crowded line opened as the place it is, a page at a time.
  // R6 · the order lives in the report's module: the report sorts its lines, and the page's helper sorts the weeks'.
  const integritySrc = code("src/lib/server/maswali-integrity.ts");
  ok("9.8 · ⭐ R4 · the cluster table lists the lines as the report's helper orders them — three tiers (R6–R8: not yet settled, settled holding a share, decided), each in the report's one order (R5); never the groups and then the places",
    page.includes("clusterRows(clusters)") && !page.includes("...c.crowded]") && !page.includes(".sort(")
      && integritySrc.includes(".sort((a, b) => paidOut(a.report) - paidOut(b.report) || clusterLineOrder(a.line, b.line));")
      && integritySrc.includes(".values()].sort(clusterLineOrder);"));
  ok("9.9 · R4 · an opened crowded line is named as a place its holders share — never one group's accounts — and its holders are read a page at a time",
    page.includes("holders on one crowded place") && page.includes("crowdedLineHolders(open.c.weekId, open.g.id, hpage, CONSOLE_PER_PAGE)"));
}

// ── §10 · what a role without a control is drawn (round 17, M1) ──────────────
// `canUseControl` answers a promise, and a pending promise in a condition is always true: a page draws a control from the
// AWAITED answer only, so a role that may open the page but not act is drawn the lock.
{
  const PAGES = ["src/app/admin/maswali/page.tsx", "src/app/admin/maswali/new/page.tsx", "src/app/admin/maswali/[weekId]/page.tsx",
    "src/app/admin/maswali/[weekId]/edit/page.tsx", "src/app/admin/maswali/pools/page.tsx", "src/app/admin/maswali/integrity/page.tsx"];
  /** The span of each `await Promise.all(` call's own parentheses. */
  const awaitedSpans = (src: string): Array<[number, number]> => {
    const spans: Array<[number, number]> = [];
    for (const m of src.matchAll(/await\s+Promise\.all\(/g)) {
      const open = (m.index ?? 0) + m[0].length - 1;
      let depth = 0;
      for (let i = open; i < src.length; i++) {
        if (src[i] === "(") depth++;
        else if (src[i] === ")" && --depth === 0) { spans.push([open, i]); break; }
      }
    }
    return spans;
  };
  for (const page of PAGES) {
    const src = read(page);
    const spans = awaitedSpans(src);
    const calls = [...src.matchAll(/canUseControl\(/g)].map((m) => m.index ?? 0);
    const pending = calls.filter((at) => !/await\s+$/.test(src.slice(Math.max(0, at - 12), at)) && !spans.some(([a, b]) => at > a && at < b));
    ok(`6 · ${page} decides each of its ${calls.length} control checks from an awaited answer`, calls.length > 0 && pending.length === 0,
      pending.map((at) => src.slice(at, at + 60)).join(" | "));
  }
  // The integrity page's check of the letters' control is awaited with the others, and its answer — taken by its place in
  // that list — is the condition that draws the control, else the lock.
  const integrity = read(ROUTES.integrity.file.replace("actions.ts", "page.tsx"));
  const inner = integrity.match(/Promise\.all\(\[\s*(canUseControl\(role, "[a-zA-Z]+"\)[\s\S]*?)\]\)/)?.[1] ?? "";
  const ids = [...inner.matchAll(/canUseControl\(role, "([a-zA-Z]+)"\)/g)].map((m) => m[1]);
  const names = (integrity.match(/const \[([^\]]+)\] = can;/)?.[1] ?? "").split(",").map((s) => s.trim()).filter((s) => s !== "");
  const name = names[ids.indexOf("clearUnresolvedLetter")];
  const drawn = ids.length > 0 && ids.length === names.length && !!name && integrity.includes(`{${name} ? <ClearLettersControl `)
    && integrity.includes(`: <ControlLocked what="Record the check" need={CONTROL_DOMAIN.clearUnresolvedLetter} />`);
  ok("10 · /admin/maswali/integrity draws the letters' check from its awaited answer: the control, else its lock",
    drawn, `${ids.length} checks · ${names.length} answers · condition ${name ?? "none"}`);
  const locked: string[] = [];
  for (const role of ROLES) {
    if (!(await canView(role, domainForPath(ROUTES.integrity.path)))) continue;
    if (await canUseControl(role, "clearUnresolvedLetter")) continue;
    locked.push(role);
    ok(`6 · ${role} opens /admin/maswali/integrity without clearUnresolvedLetter and is drawn the lock, never the control`, drawn);
  }
  ok("10 · at least one role opens the integrity page without the letters' control (the population the lock is for)", locked.length >= 1, locked.join(","));
}

console.log(`\nmaswali-rbac: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
