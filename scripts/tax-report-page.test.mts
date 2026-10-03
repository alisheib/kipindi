/**
 * test:tax-report-page — the Government Tax Report's SURFACES hold their invariants (docs/TAX-REPORT.md).
 *
 * `test:tax-report` executes the arithmetic and the reader. This suite reads the page, the export route
 * and the actions at SOURCE level for the rules a future edit could break without moving a single
 * figure in that suite:
 *   §1 the page computes nothing — every figure comes from `loadTaxReportView`, there is no `?? 0` on a
 *      figure (a failed read must render a load error, never a fabricated zero), money is `.amount`;
 *   §2 the export route gates on the STORED role + accounting VIEW + admin 2FA + a same-origin request,
 *      reads the same view, and refuses to release a file whose audit row did not land;
 *   §3 every server action gates BEFORE any read, recomputes the figures it locks (and refuses if they
 *      differ from what the officer saw), and the Owner-only acts gate on the STORED ADMIN role;
 *   §4 the dev seeder is dead in production before its first await.
 * ⭐ EVERY CHECK HAS A CONTROL: the same predicate is run over a planted bad snippet and must REFUSE it, so
 * no check here can pass by matching nothing.
 *
 * Run: npm run test:tax-report-page
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { decomment } from "./lib/decomment.mts";

process.exitCode = 1;
const ROOT = process.env.TAX_SRC ?? join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel: string) => decomment(readFileSync(join(ROOT, rel), "utf8").replace(/\r\n/g, "\n"));

let pass = 0;
const fails: string[] = [];
const ok = (n: string, c: boolean, d = "") => {
  if (c) { pass++; console.log(`  ok   ${n}`); }
  else { fails.push(`${n}${d ? ` — ${d}` : ""}`); console.log(`  FAIL ${n}${d ? `\n         ${d}` : ""}`); }
};
/** A check and its control: the predicate must accept the real source and REFUSE the planted one. */
function guard(n: string, pred: (src: string) => boolean, src: string, planted: string) {
  ok(n, pred(src));
  ok(`${n} · CONTROL — a planted violation is refused`, !pred(planted));
}

const page = read("src/app/admin/tax/page.tsx");
const route = read("src/app/api/admin/tax/export/route.ts");
const actions = read("src/app/admin/tax/actions.ts");
const seeder = read("src/app/api/dev-test/seed-tax-books/route.ts");

console.log("\ntax-report-page — the surfaces of the Government Tax Report\n");

console.log("§1 · the page computes nothing and fabricates nothing");
guard("1.1 every figure comes from loadTaxReportView (the ONE view the exports use too)",
  (s) => /await loadTaxReportView\(/.test(s) && !/buildTaxReportData\(/.test(s),
  page, page.replace("await loadTaxReportView(", "await buildTaxReportData("));
guard("1.2 no `?? 0` anywhere in the page — a failed read is a load error, never a zero",
  (s) => !/\?\?\s*0\b/.test(s), page, `${page}\nconst x = f.report1.salesCents ?? 0;`);
guard("1.3 a failed view renders AdminLoadError (A-5)",
  (s) => /if \(!loaded\.ok\)[\s\S]{0,400}AdminLoadError/.test(s), page, page.replace(/if \(!loaded\.ok\)/, "if (false)"));
guard("1.4 money is `.amount` — the Amt helper prints formatCents inside className amount",
  (s) => /function Amt\([\s\S]{0,200}"amount"[\s\S]{0,120}formatCents\(cents\)/.test(s), page, page.replace(/"amount", className/, '"price", className'));
guard("1.5 the page is gated by its own AdminPageGate and the STORED role before any read",
  (s) => /return <AdminPageGate title="Tax report"><AdminTaxContent \{\.\.\.props\} \/><\/AdminPageGate>;/.test(s)
    && s.indexOf("db.user.findById(session.userId)") > -1
    && s.indexOf("db.user.findById(session.userId)") < s.indexOf("loadTaxReportView("),
  page, page.replace("db.user.findById(session.userId)", "Promise.resolve(null)"));

console.log("§2 · the export route");
guard("2.1 gates on the STORED role with accounting VIEW (or the Owner)",
  (s) => /db\.user\.findById\(session\.userId\)/.test(s) && /u\.role === "ADMIN" \|\| \(await canView\(u\.role, "accounting"\)\)/.test(s),
  route, route.replace('(await canView(u.role, "accounting"))', "true"));
guard("2.2 demands admin 2FA",
  (s) => /checkAdminTotp\(session\.userId, session\.sessionId\)\) !== "ok"/.test(s), route, route.replaceAll("checkAdminTotp(", "noTotp("));
guard("2.3 refuses a cross-site request",
  (s) => /exportRequestAllowed\(req\.headers\.get\("sec-fetch-site"\)\)/.test(s), route, route.replace("exportRequestAllowed(", "Boolean("));
guard("2.4 reads the same view the page renders",
  (s) => /loadTaxReportView\(/.test(s) && !/buildTaxReportData\(/.test(s), route, route.replace("loadTaxReportView(", "buildTaxReportData("));
guard("2.5 never silently covers a different period (an unreadable one is a 400)",
  (s) => /if \(fellBack\) return NextResponse\.json\([^)]*status: 400/.test(s), route, route.replace("if (fellBack)", "if (false)"));
guard("2.6 THE RECORD BEFORE THE FIRST BYTE — the audit is awaited and an unrecorded download is refused",
  (s) => /const rec = await audit\(/.test(s) && /if \(!rec\.recorded\)/.test(s) && s.indexOf("if (!rec.recorded)") < s.indexOf("new NextResponse(body"),
  route, route.replace("if (!rec.recorded)", "if (false)"));

console.log("§3 · the actions");
const exportsOf = (s: string) => [...s.matchAll(/export async function (\w+)\(/g)].map((m) => m[1]);
const firstLine = (s: string, fn: string) => s.slice(s.indexOf(`export async function ${fn}(`)).split("\n").slice(1, 2).join("");
guard("3.1 every action gates on its first line (requireStaff / requireOwner)",
  (s) => exportsOf(s).length === 3 && exportsOf(s).every((fn) => /await (requireStaff\("accounting"\)|requireOwner\("tax-report-[a-z]+"\))/.test(firstLine(s, fn))),
  actions, actions.replace('const session = await requireOwner("tax-report-reopen");', ""));
guard("3.2 the Owner-only acts (reopen, rates) gate on the STORED ADMIN role (requireOwner), never a grantable domain; locking gates on \"accounting\"",
  (s) => /lockTaxPeriodAction[\s\S]{0,120}requireStaff\("accounting"\)/.test(s)
    && /unlockTaxPeriodAction[\s\S]{0,120}requireOwner\("tax-report-reopen"\)/.test(s)
    && /recordTaxRatesAction[\s\S]{0,120}requireOwner\("tax-report-rates"\)/.test(s),
  actions, actions.replace('requireOwner("tax-report-reopen")', 'requireStaff("ops")'));
guard("3.3 a lock RECOMPUTES the period from the books — no figure is taken from the form",
  (s) => /buildTaxReportData\(\{ period, product, nowMs \}\)/.test(s) && !/fd\.get\("(sales|payout|tax|total)/i.test(s),
  actions, actions.replace("buildTaxReportData({ period, product, nowMs })", "JSON.parse(String(fd.get(\"snapshot\")))"));
guard("3.4 an out-of-balance lock is the Owner's alone, with a written reason",
  (s) => /if \(!balanced \|\| wholeOut\)[\s\S]{0,300}actor\?\.role !== "ADMIN"[\s\S]{0,700}acknowledge\.length < REASON_MIN/.test(s),
  actions, actions.replace('actor?.role !== "ADMIN"', "false"));
guard("3.5 only a lockable period (finished, not custom, after the grace) can be locked",
  (s) => /if \(!isLockable\(period, nowMs\)\)/.test(s), actions, actions.replace("if (!isLockable(period, nowMs))", "if (false)"));
guard("3.6 WHAT WAS SHOWN IS WHAT IS LOCKED — the fingerprint of everything shown must equal the recompute's, or nothing locks",
  (s) => s.includes('const seen = fd.get("seen");') && s.includes('if (typeof seen !== "string" || seen !== seenFingerprint(data)) {'),
  actions, actions.replace("seen !== seenFingerprint(data)", "false"));
guard("3.6b …and the page puts that fingerprint, of the very data it renders, in the lock form",
  (s) => s.includes("const seen = seenFingerprint(data);") && /<TaxLockPanel[\s\S]{0,200}seen=\{seen\}/.test(s),
  page, page.replace("const seen = seenFingerprint(data);", "const seen = \"\";"));
guard("3.6c the lock panel is rebuilt per period and product (a typed note or an open dialog never carries over)",
  (s) => s.includes("key={`${period.kind}:${period.key}:${product}`}") && /<TaxLockPanel\s+key=/.test(s),
  page, page.replace("<TaxLockPanel" + String.fromCharCode(10) + "                  key=", "<TaxLockPanel" + String.fromCharCode(10) + "                  data-k="));
guard("3.7 one product cannot be locked around the whole book: a whole-book difference blocks it like its own",
  (s) => /const wholeOut = data\.wholeBook !== null && !data\.wholeBook\.balanced;/.test(s) && s.includes("if (!balanced || wholeOut)"),
  actions, actions.replace("if (!balanced || wholeOut)", "if (!balanced)"));

console.log("§4 · the dev seeder");
guard("4.1 seed-tax-books is a 404 in production BEFORE its first await",
  (s) => { const i = s.indexOf('process.env.NODE_ENV === "production"'); const a = s.indexOf("await "); return i > -1 && a > -1 && i < a; },
  seeder, seeder.replace('if (process.env.NODE_ENV === "production") {', 'const body0 = await req.text();\n  if (process.env.NODE_ENV === "production") {'));
guard("4.2 …and refuses to run against a database",
  (s) => /if \(hasDatabase\(\) && process\.env\.USE_PRISMA_DAL !== "false"\)/.test(s), seeder, seeder.replace("if (hasDatabase()", "if (false && hasDatabase()"));

console.log(`\ntax-report-page: ${pass} passed, ${fails.length} failed`);
if (fails.length) { console.log("\nFAILED:"); for (const f of fails) console.log(`  - ${f}`); }
process.exitCode = fails.length === 0 ? 0 : 1;
