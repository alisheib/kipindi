/** Integrity list controls: complete-set selection, independent pages, and source wiring. */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import * as search from "../src/lib/search/index.ts";
import { adminCount } from "../src/lib/utils.ts";
import { integrityListParams, parseIntegrityListQuery, selectHeldShares, selectSealWeeks, selectVoidableWeeks, selectWinnerTickets } from "../src/lib/maswali-integrity-list.ts";
import { clusterCoverage } from "../src/lib/maswali-cluster-coverage.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const helper = readFileSync(join(root, "src/lib/maswali-integrity-list.ts"), "utf8");
const page = readFileSync(join(root, "src/app/admin/maswali/integrity/page.tsx"), "utf8");
const consoleRead = readFileSync(join(root, "src/lib/server/maswali-console.ts"), "utf8");
const coverageSource = readFileSync(join(root, "src/lib/maswali-cluster-coverage.ts"), "utf8");
const reportSource = readFileSync(join(root, "src/lib/server/maswali-integrity.ts"), "utf8");
const searchBox = readFileSync(join(root, "src/components/ui/search-box.tsx"), "utf8");
let passed = 0, failed = 0;
function ok(name: string, condition: boolean) {
  console.log(`${condition ? "PASS" : "FAIL"} ${name}`);
  condition ? passed++ : failed++;
}
const query = (sp: Record<string, string | undefined> = {}) => parseIntegrityListQuery(sp);

const held = Array.from({ length: 45 }, (_, i) => {
  const seq = 45 - i;
  return {
    weekCode: `MW-${String(seq).padStart(2, "0")}`, weekSeq: seq, serial: `T-${String(seq).padStart(3, "0")}`,
    holder: seq % 2 ? "Amina" : "Baraka", payout: 100_000 - seq * 11, forfeited: seq % 5 === 0,
  };
});
const winners = held.map((row) => ({ code: row.weekCode, seq: row.weekSeq, ticket: {
  serial: row.serial, payout: row.payout, frozenReason: row.forfeited ? "review" : null,
}}));
const seals = Array.from({ length: 11 }, (_, i) => ({ code: `MW-${String(11 - i).padStart(2, "0")}`, seq: 11 - i, state: (i % 2 ? "VOIDED" : "SETTLED") }));
const voidable = Array.from({ length: 26 }, (_, i) => ({ code: `MW-${String(26 - i).padStart(2, "0")}`, seq: 26 - i,
  visibility: (i % 2 ? "DRIVE" : "PUBLIC") as "PUBLIC" | "DRIVE", ticketCount: i + 1 }));

const h1 = selectHeldShares(held, query().held, 20);
ok("held shares are paged without a silent cap", h1.total === 45 && h1.allTotal === 45 && h1.rows.length === 20 && selectHeldShares(held, query({ hpage: "3" }).held, 20).rows.length === 5);
ok("held holder lookup and decision filter act before page", selectHeldShares(held, query({ hq: "holder:amina", hdecision: "pending", hpage: "2" }).held, 5).rows.every((row) => row.holder === "Amina" && !row.forfeited));
ok("held share sort takes the highest payouts from the complete set", selectHeldShares(held, query({ hsort: "share", hdir: "desc" }).held, 20).rows[0]?.weekSeq === 1);
ok("held decision sort orders the full set", selectHeldShares(held, query({ hsort: "decision", hdir: "desc" }).held, 20).rows.slice(0, 9).every((row) => row.forfeited));
ok("held empty cause separates inventory from no match", selectHeldShares([], query().held, 20).allTotal === 0 && selectHeldShares(held, query({ hq: "absent" }).held, 20).allTotal === 45 && selectHeldShares(held, query({ hq: "absent" }).held, 20).total === 0);

ok("winner search reaches an older ticket before pagination", selectWinnerTickets(winners, query({ wq: "ticket:T-001" }).winners, 20).rows[0]?.seq === 1);
ok("winner flagged filter counts the whole set", selectWinnerTickets(winners, query({ wreview: "flagged" }).winners, 20).total === 9);
ok("winner share sort uses the full set before slicing", selectWinnerTickets(winners, query({ wsort: "share", wdir: "desc" }).winners, 20).rows[0]?.seq === 1);
ok("winner filtered page clamps after the filter", selectWinnerTickets(winners, query({ wreview: "flagged", wpage: "99" }).winners, 4).page === 3);

ok("seal-log week search reaches an older week before paging", selectSealWeeks(seals, query({ sq: "MW-01" }).seals, 4).rows[0]?.seq === 1);
ok("seal state filter and ascending sort precede week paging", selectSealWeeks(seals, query({ sstate: "VOIDED", sdir: "asc", spage: "2" }).seals, 2).rows[0]?.seq === 6);
ok("seal log pages whole weeks, not individual question rows", selectSealWeeks(seals, query({ spage: "3" }).seals, 4).rows.length === 3);

ok("voidable queue pages the complete eligible set", selectVoidableWeeks(voidable, query().voidable, 20).total === 26
  && selectVoidableWeeks(voidable, query({ vpage: "2" }).voidable, 20).rows.length === 6);
ok("voidable code lookup reaches a week beyond the first page", selectVoidableWeeks(voidable, query({ vq: "mw-01" }).voidable, 20).rows[0]?.seq === 1);
ok("voidable line filter applies before paging", selectVoidableWeeks(voidable, query({ vline: "DRIVE" }).voidable, 5).total === 13);
ok("voidable ticket-count sort applies before paging", selectVoidableWeeks(voidable, query({ vsort: "tickets", vdir: "desc" }).voidable, 20).rows[0]?.ticketCount === 26);
ok("voidable filtered pager clamps after lookup", selectVoidableWeeks(voidable, query({ vq: "MW-01", vpage: "99" }).voidable, 20).page === 1);
ok("voidable empty cause separates no eligible week from no match", selectVoidableWeeks([], query().voidable, 20).allTotal === 0
  && selectVoidableWeeks(voidable, query({ vq: "absent" }).voidable, 20).allTotal === 26
  && selectVoidableWeeks(voidable, query({ vq: "absent" }).voidable, 20).total === 0);

const bad = query({ hdecision: "BAD", hsort: "sql", hdir: "other", hpage: "2junk", wreview: "BAD", wsort: "age", wpage: "-2", sstate: "OPEN", spage: "NaN", vline: "PRIVATE", vsort: "name", vpage: "-3" });
ok("untrusted URL values fall back to safe controls and first pages", bad.held.decision === "" && bad.held.sort === "week" && bad.held.dir === "desc" && bad.held.page === 1 && bad.winners.review === "" && bad.winners.sort === "week" && bad.winners.page === 1 && bad.seals.state === "" && bad.seals.page === 1 && bad.voidable.line === "" && bad.voidable.sort === "week" && bad.voidable.page === 1);
const params = integrityListParams(query({ hq: " Amina ", hdecision: "pending", hpage: "2", wq: "MW-01", wsort: "share", wpage: "3", sq: "MW-02", sstate: "VOIDED", spage: "4", vq: "MW-03", vline: "DRIVE", vsort: "tickets", vpage: "5" }));
ok("URL params preserve each list's independent filter, sort and page", params.hq === "Amina" && params.hdecision === "pending" && params.hpage === "2" && params.wq === "MW-01" && params.wsort === "share" && params.wpage === "3" && params.sq === "MW-02" && params.sstate === "VOIDED" && params.spage === "4" && params.vq === "MW-03" && params.vline === "DRIVE" && params.vsort === "tickets" && params.vpage === "5");
ok("all four kit searches reset only their own pager", ["h", "w", "s", "v"].every((prefix) => page.includes(`param="${prefix}q" pageParam="${prefix}page"`)) && searchBox.includes("sp.delete(pageParam)"));
const formIds = { v: "maswali-voidable-filters", h: "maswali-held-filters", w: "maswali-winners-filters", s: "maswali-seals-filters" };
const allSearchFormsWired = (source: string) => Object.entries(formIds).every(([prefix, id]) =>
  source.includes(`<SearchBox mode="form" formId="${id}" param="${prefix}q"`)
  && source.includes(`<form id="${id}" method="get" action={INTEGRITY_HREF}`)
  && !source.includes(`type="hidden" name="${prefix}q"`));
ok("all four searches submit current text through their own GET filter form", allSearchFormsWired(page));
ok("the shared form search has a named associated field and native Enter", searchBox.includes('name={mode === "form" ? param : undefined}')
  && searchBox.includes('form={mode === "form" ? formId : undefined}')
  && searchBox.includes('e.key === "Enter" && mode !== "form"'));
ok("all four pagers retain sibling state and use their own page key", ["h", "w", "s", "v"].every((prefix) => page.includes(`baseHref={buildBaseHref(INTEGRITY_HREF, listParams, "${prefix}page")} param="${prefix}page"`)));
ok("all four filter forms retain sibling controls and omit their own page", ["h", "w", "s", "v"].every((prefix) => page.includes(`<OtherListState params={listParams} list="${prefix}" />`)) && /!key\.startsWith\(list\)/.test(page));
ok("read model selects complete winner, held, seal and voidable sets before page-only hydration", consoleRead.includes("selectHeldShares(allHeld") && consoleRead.includes("selectWinnerTickets(won") && consoleRead.includes("for (const { ticket: t, code } of selectedWinners.rows)") && consoleRead.includes("selectSealWeeks(sealed") && consoleRead.includes("for (const w of selectedSeals.rows)") && consoleRead.includes("selectVoidableWeeks(voidable") && consoleRead.includes("selectedVoidable.rows.map(rowOf)"));
ok("all four empty states distinguish no records from no matches", page.includes("v.heldPage.allTotal === 0") && page.includes("No held shares match these filters") && page.includes("v.winnersPage.allTotal === 0") && page.includes("No winners match these filters") && page.includes("v.sealWeeks.allTotal === 0") && page.includes("No sealed weeks match these filters") && page.includes("v.voidablePage.allTotal === 0") && page.includes("No voidable weeks match these filters"));

function countLabelsAreSingularSafe(source: string) {
  return [
    'adminCount(v.voidablePage.allTotal, "week")',
    'adminCount(w.ticketCount, "ticket")',
    'adminCount(v.heldPage.allTotal, "held share")',
    'adminCount(v.winnersPage.allTotal, "winner")',
    'adminCount(v.sealWeeks.allTotal, "sealed week")',
  ].every((expression) => source.includes(expression));
}
ok("Integrity counts show one week, ticket, held share, winner and sealed week without clipping the search hint",
  countLabelsAreSingularSafe(page) && page.includes('placeholder="Search week code"')
  && adminCount(1, "week") === "1 week" && adminCount(1, "ticket") === "1 ticket"
  && adminCount(1, "held share") === "1 held share" && adminCount(1, "winner") === "1 winner"
  && adminCount(1, "sealed week") === "1 sealed week" && adminCount(1000, "week") === "1,000 weeks");

const smallCoverage = clusterCoverage(4, 2, false);
ok("connected report with four holders and two groups is complete",
  smallCoverage.connectedHoldersChecked === 4 && smallCoverage.groupsShown === 2 && !smallCoverage.limited);
function holderBoundary(cover: typeof clusterCoverage) {
  const at = cover(5_000, 0, false), past = cover(5_001, 0, false);
  return at.connectedHoldersChecked === 5_000 && !at.limited
    && past.connectedHoldersChecked === 5_000 && past.holdersTotal === 5_001 && past.limited;
}
ok("⛔ the 5,000-holder boundary announces a limited connection sample only above the cap", holderBoundary(clusterCoverage));
function groupBoundary(cover: typeof clusterCoverage) {
  const at = cover(10, 50, false), past = cover(10, 51, false);
  return at.groupsShown === 50 && !at.limited
    && past.groupsShown === 50 && past.groupsFound === 51 && past.limited;
}
ok("⛔ the 50-group boundary reports found versus shown without hiding the 51st", groupBoundary(clusterCoverage));
ok("a reached connection-source cap is marked limited even with every holder in scope", clusterCoverage(10, 0, true).limited);
function reportWired(source: string) {
  return source.includes("connectedGroups(userIds.slice(0, CLUSTER_HOLDER_SCAN_LIMIT))")
    && source.includes("const coverage = clusterCoverage(userIds.length, groups.length, connected?.sourceLimitReached ?? false);")
    && source.includes("groups: groups.slice(0, coverage.groupsShown)")
    && source.includes("a.length > CLUSTER_SOURCE_GROUP_LIMIT || b.length > CLUSTER_SOURCE_GROUP_LIMIT");
}
ok("the report uses its measured holder and group coverage to bound the real result", reportWired(reportSource));
function warningWired(source: string) {
  return source.includes("c.coverage.limited && <p role=\"alert\"")
    && source.includes("c.coverage.connectedHoldersChecked.toLocaleString")
    && source.includes("c.coverage.groupsShown < c.coverage.groupsFound")
    && source.includes("!c.readable && <p role=\"alert\"")
    && source.includes('c.coverage.limited ? "No group in the checked records." : "No group to look at."');
}
ok("Integrity warns separately about incomplete reads and a bounded holder or group result", warningWired(page));

function mutatedCoverage(source: string): typeof clusterCoverage {
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const mod = { exports: {} as Record<string, unknown> };
  runInNewContext(compiled, { module: mod, exports: mod.exports });
  return mod.exports.clusterCoverage as typeof clusterCoverage;
}

function mutated(source: string) {
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const mod = { exports: {} as Record<string, unknown> };
  runInNewContext(compiled, { module: mod, exports: mod.exports, require: (name: string) => {
    if (name === "@/lib/search") return search;
    throw new Error(`Unexpected module in mutation: ${name}`);
  }});
  return mod.exports as { selectHeldShares: typeof selectHeldShares; selectWinnerTickets: typeof selectWinnerTickets; selectSealWeeks: typeof selectSealWeeks; selectVoidableWeeks: typeof selectVoidableWeeks };
}
if (process.argv.includes("--prove-red")) {
  const unlimitedHolders = coverageSource.replace("Math.min(holdersTotal, CLUSTER_HOLDER_SCAN_LIMIT)", "holdersTotal");
  if (unlimitedHolders === coverageSource) throw new Error("Holder-cap plant target missing");
  ok("red: a hidden 5,001st holder fails the holder-coverage boundary", !holderBoundary(mutatedCoverage(unlimitedHolders)));
  const unlimitedGroups = coverageSource.replace("Math.min(groupsFound, CLUSTER_GROUP_DISPLAY_LIMIT)", "groupsFound");
  if (unlimitedGroups === coverageSource) throw new Error("Group-cap plant target missing");
  ok("red: a hidden 51st group fails the group-coverage boundary", !groupBoundary(mutatedCoverage(unlimitedGroups)));
  const hiddenSourceLimit = coverageSource.replace("|| connectionSourceLimitReached ||", "|| false ||");
  if (hiddenSourceLimit === coverageSource) throw new Error("Source-cap plant target missing");
  ok("red: a source scan at its cap fails the limited-report assertion", !mutatedCoverage(hiddenSourceLimit)(10, 0, true).limited);
  const hiddenWarning = page.replace("c.coverage.limited && <p role=\"alert\"", "false && <p role=\"alert\"");
  if (hiddenWarning === page) throw new Error("Limited-report warning plant target missing");
  ok("red: removing the warning fails the page wiring guard", !warningWired(hiddenWarning));
  const unboundedReport = reportSource.replace("connectedGroups(userIds.slice(0, CLUSTER_HOLDER_SCAN_LIMIT))", "connectedGroups(userIds)");
  if (unboundedReport === reportSource) throw new Error("Connected-holder scope plant target missing");
  ok("red: a report that bypasses the measured holder scope fails the source guard", !reportWired(unboundedReport));
  const unboundedDisplay = reportSource.replace("groups: groups.slice(0, coverage.groupsShown)", "groups");
  if (unboundedDisplay === reportSource) throw new Error("Group-display scope plant target missing");
  ok("red: a report that bypasses the measured group scope fails the source guard", !reportWired(unboundedDisplay));
  const brokenCount = page.replace('adminCount(v.voidablePage.allTotal, "week")', 'v.voidablePage.allTotal');
  if (brokenCount === page) throw new Error("Integrity singular count plant target missing");
  ok("red: a raw voidable count loses the singular count guard", !countLabelsAreSingularSafe(brokenCount));
  const detached = page.replace('mode="form" formId="maswali-voidable-filters"', 'mode="url" formId="maswali-voidable-filters"');
  if (detached === page) throw new Error("Voidable form-mode plant target missing");
  ok("red: a detached voidable search loses fast Apply text", !allSearchFormsWired(detached));
  const duplicate = page.replace('<OtherListState params={listParams} list="h" />', '<OtherListState params={listParams} list="h" /><input type="hidden" name="hq" value={query.held.q} />');
  if (duplicate === page) throw new Error("Held duplicate-search plant target missing");
  ok("red: a hidden held query cannot override the typed search", !allSearchFormsWired(duplicate));
  const unsorted = helper.replace("return pageRows(all, ordered, query.page, perPage);", "return pageRows(all, filtered, query.page, perPage);");
  if (unsorted === helper) throw new Error("Held global-sort plant target missing");
  ok("red: a held page sliced without sorting fails the highest-share assertion", mutated(unsorted).selectHeldShares(held, query({ hsort: "share", hdir: "desc" }).held, 20).rows[0]?.weekSeq !== 1);
  const winnerUnsorted = helper.replace(/return pageRows\(all, ordered, query\.page, perPage\);(?=\r?\n}\r?\n\r?\nexport type SealListWeek)/, "return pageRows(all, filtered, query.page, perPage);");
  if (winnerUnsorted === helper) throw new Error("Winner global-sort plant target missing");
  ok("red: a winner page sliced without sorting fails the highest-share assertion", mutated(winnerUnsorted).selectWinnerTickets(winners, query({ wsort: "share", wdir: "desc" }).winners, 20).rows[0]?.seq !== 1);
  const windowsHelper = helper.replace(/\r?\n/g, "\r\n");
  const windowsPlant = windowsHelper.replace(/return pageRows\(all, ordered, query\.page, perPage\);(?=\r?\n}\r?\n\r?\nexport type SealListWeek)/, "return pageRows(all, filtered, query.page, perPage);");
  if (windowsPlant === windowsHelper) throw new Error("Winner CRLF plant target missing");
  ok("red: the same winner guard catches a CRLF checkout", mutated(windowsPlant).selectWinnerTickets(winners, query({ wsort: "share", wdir: "desc" }).winners, 20).rows[0]?.seq !== 1);
  const unfilteredSeals = helper.replace("return pageRows(all, sorted(filtered, (week) => week.seq, query.dir), query.page, perPage);", "return pageRows(all, sorted([...all], (week) => week.seq, query.dir), query.page, perPage);");
  if (unfilteredSeals === helper) throw new Error("Seal filter plant target missing");
  ok("red: paging unfiltered seal weeks fails the older-week lookup", mutated(unfilteredSeals).selectSealWeeks(seals, query({ sq: "MW-01" }).seals, 4).rows[0]?.seq !== 1);
  const unfilteredVoidable = helper.replace('const ordered = sorted(filtered, (week) => query.sort === "tickets" ? week.ticketCount : week.seq, query.dir);',
    'const ordered = sorted([...all], (week) => query.sort === "tickets" ? week.ticketCount : week.seq, query.dir);');
  if (unfilteredVoidable === helper) throw new Error("Voidable full-set lookup plant target missing");
  ok("red: paging unfiltered voidable weeks fails the beyond-page code lookup",
    mutated(unfilteredVoidable).selectVoidableWeeks(voidable, query({ vq: "MW-01" }).voidable, 20).rows[0]?.seq !== 1);
}
console.log(`maswali integrity lists: ${passed} passed, ${failed} failed`);
if (failed) process.exitCode = 1;
