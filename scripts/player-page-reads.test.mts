/**
 * WHAT EACH STAFF ROLE ACTUALLY SEES ON `/admin/players/[id]` — measured from the page's OWN
 * gate expressions, not read off the source by eye.
 *
 * ⛔ WHY THIS EXISTS. `docs/READ-TIERS.md` §1 is the measured basis for Jay unit K, and unit K's
 * rulings (§4a) cite it. It states that a SUPPORT agent reads "every player's exact wallet
 * balance, lifetime deposits, full email, date of birth and region". Three of those five are
 * already gated by the DOMAIN axis — `canSeeMoney` wraps the money KPIs and the transactions tab,
 * `canSeePII` wraps the KYC panel — and SUPPORT holds neither `accounting` nor `compliance`.
 *
 * ⭐ A DESIGN PREMISE THAT NOBODY RE-MEASURES BECOMES A FEATURE BUILT FOR A PROBLEM THAT IS
 * ALREADY SOLVED. This suite pins the real answer so the doc can be corrected against a number
 * rather than an impression, and so it cannot drift again: the expectations below are asserted,
 * not printed.
 *
 * Run: npm run test:player-page-reads
 */
process.env.SESSION_SECRET ??= "test-only-session-secret-32chars-min-aaaa";

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { decomment } from "./lib/decomment.mts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
let pass = 0, fail = 0;
const ok = (l: string, c: boolean, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"} ${l}${x ? ` — ${x}` : ""}`); };

const { canView, canAct, __resetGrantsForTest } = await import("../src/lib/server/rbac.ts");
const { STAFF_ROLES } = await import("../src/lib/server/roles.ts");
__resetGrantsForTest();

const PAGE = join(ROOT, "src/app/admin/players/[id]/page.tsx");
const src = decomment(readFileSync(PAGE, "utf8"));

console.log("\n§1 · the page's gate expressions are the ones this suite models");

// ⛔ IF THE PAGE STOPS COMPUTING THESE, THE MEASUREMENT BELOW IS FICTION. Assert the four gate
// expressions still exist and still read the domains this suite assumes, or the whole file lies.
ok("1.1 the page derives capSupport from canAct(support)",
   /const capSupport = vRole \? await canAct\(vRole, "support"\)/.test(src));
ok("1.2 the page derives canSeeMoney from canView(accounting)",
   /const canSeeMoney = vRole \? await canView\(vRole, "accounting"\)/.test(src));
ok("1.3 the page derives canSeePII from canView(compliance)",
   /const canSeePII = vRole \? await canView\(vRole, "compliance"\)/.test(src));

// ⭐ AND THAT THEY STILL GATE WHAT THIS SUITE CLAIMS THEY GATE. A flag that exists but no longer
// wraps the money block would make every row below wrong in the reassuring direction.
ok("1.4 canSeeMoney wraps the money KPI block",  /\{canSeeMoney && \(/.test(src));
ok("1.5 canSeeMoney wraps the transactions tab", /tab === "transactions" && canSeeMoney/.test(src));
ok("1.6 canSeePII wraps the KYC panel",          /tab === "kyc" && canSeePII/.test(src));
ok("1.7 both gate the TAB LIST too, so a hidden tab is not merely an empty one",
   /t\.id !== "kyc" \|\| canSeePII/.test(src) && /t\.id !== "transactions" \|\| canSeeMoney/.test(src));

// ⚠️ The header block — email + region — carries NO gate. This is the assertion that says the
// remaining exposure is real rather than assumed. If someone gates it later, this must go RED so
// the doc gets corrected rather than silently over-claiming.
const header = src.slice(src.indexOf("<Avatar initials={initials}"), src.indexOf("<AccountStatusBadge"));
ok("1.8 ⛔ the header's email + region are rendered with NO read gate — this is the real exposure",
   /user\.email &&/.test(header) && /user\.region/.test(header)
   && !/canSee(PII|Money)/.test(header),
   "header block contains no canSee* guard");

console.log("\n§2 · what each role therefore sees");

const rows: Array<{ role: string; money: boolean; pii: boolean; desk: boolean }> = [];
for (const role of STAFF_ROLES) {
  rows.push({
    role,
    money: await canView(role, "accounting"),
    pii: await canView(role, "compliance"),
    desk: await canAct(role, "support"),
  });
}
for (const r of rows) {
  console.log(`   ${r.role.padEnd(11)} money=${String(r.money).padEnd(5)} pii=${String(r.pii).padEnd(5)} desk=${r.desk}`);
}

const support = rows.find((r) => r.role === "SUPPORT")!;

// 🔴 THE THREE CORRECTIONS TO §1, ASSERTED.
ok("2.1 🔴 SUPPORT does NOT see the wallet balance or lifetime deposits — §1 said it did",
   support.money === false, "canView(SUPPORT, accounting) = false ⇒ the money KPI block is not rendered");
ok("2.2 🔴 SUPPORT does NOT see the transactions tab — so 'movements yes, totals no' is not reachable today",
   support.money === false);
ok("2.3 🔴 SUPPORT does NOT see the date of birth — it lives in the KYC panel, behind canSeePII",
   support.pii === false, "canView(SUPPORT, compliance) = false");

// ⭐ AND THE PART OF §1 THAT WAS RIGHT.
ok("2.4 ⭐ SUPPORT DOES run the desk — suspend / reset are theirs",
   support.desk === true);
ok("2.5 ⭐ …and the email + region ARE exposed to them, because the header has no gate at all",
   support.desk === true, "see 1.8 — the header renders user.email and user.region unconditionally");

// ⛔ THE CONSEQUENCE FOR THE DESIGN, ASSERTED SO IT CANNOT BE FORGOTTEN.
// §2.2 says READ_TIERS "can only ever subtract". §3.2 gives SUPPORT money.figures = masked,
// whose stated purpose is that an agent can see a failed withdrawal. But the transactions tab is
// gated by the DOMAIN axis, which READ_TIERS may not widen (§6). So that cell cannot deliver its
// own motivating example without a DOMAIN change — which §6 puts out of scope.
ok("2.6 ⛔ SUPPORT's money.figures=masked cannot deliver its motivating example without a DOMAIN change",
   support.money === false,
   "the transactions tab is domain-gated; READ_TIERS may only subtract (§2.2, §6)");

console.log(`\nplayer-page-reads: ${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
