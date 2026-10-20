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
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
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
} as const;

/** Each Millionea control, its domain as written in the plan's §7b S4 table, and the route that hosts it. */
const CONTROLS: Array<{ id: ControlId; domain: string; route: keyof typeof ROUTES }> = [
  ...(["createMaswaliWeek", "editMaswaliQuestion", "attestMaswaliParity", "openMaswaliWeek", "moveMaswaliClose", "sealMaswaliQuestion",
    "voidMaswaliQuestion", "confirmMaswaliSeal", "correctMaswaliSeal"] as const).map((id) => ({ id, domain: "trading", route: "week" as const })),
  { id: "releaseMaswaliSettlement", domain: "accounting", route: "pools" },
  ...(["voidMaswaliWeek", "pauseMaswaliSales", "resumeMaswaliSales", "holdMaswaliShare", "releaseMaswaliShare", "forfeitMaswaliShare"] as const)
    .map((id) => ({ id, domain: "compliance", route: "integrity" as const })),
  ...(["fundMaswaliGuarantee", "returnMaswaliGuarantee", "sunsetMaswali", "setMaswaliLicenceBasis", "setMillioneaRollout"] as const)
    .map((id) => ({ id, domain: "ops", route: "pools" as const })),
];

// The acting role per domain, as DEFAULT_GRANTS ships it (`roles.ts`). ADMIN (the Owner) bypasses the table.
const ACTS: Record<string, string[]> = { trading: ["MODERATOR"], accounting: ["FINANCE"], compliance: ["COMPLIANCE"], ops: [] };
const ROLES: Role[] = ["ADMIN", "MODERATOR", "COMPLIANCE", "FINANCE", "GROWTH", "SUPPORT", "AUDITOR", "PLAYER", "AGENT"] as Role[];

// ── §1 · the routes ─────────────────────────────────────────────────────────
for (const [name, r] of Object.entries(ROUTES)) {
  ok(`1 · ${name} ${r.path} → ${r.domain}`, domainForPath(r.path) === r.domain, `got ${domainForPath(r.path)}`);
}

// ── §2 · every role × every control ─────────────────────────────────────────
ok("2 · there are 21 Millionea controls, each registered", CONTROLS.length === 21 && CONTROLS.every((c) => c.id in CONTROL_DOMAIN), `${CONTROLS.length}`);
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
  ok("5 · the group holds the three pages", (g?.items ?? []).map((i) => i.href).join(",") === "/admin/maswali,/admin/maswali/pools,/admin/maswali/integrity");
}

console.log(`\nmaswali-rbac: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
