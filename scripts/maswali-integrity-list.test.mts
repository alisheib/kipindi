/** Integrity list controls: complete-set selection, independent pages, and source wiring. */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import * as search from "../src/lib/search/index.ts";
import { integrityListParams, parseIntegrityListQuery, selectHeldShares, selectSealWeeks, selectWinnerTickets } from "../src/lib/maswali-integrity-list.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const helper = readFileSync(join(root, "src/lib/maswali-integrity-list.ts"), "utf8");
const page = readFileSync(join(root, "src/app/admin/maswali/integrity/page.tsx"), "utf8");
const consoleRead = readFileSync(join(root, "src/lib/server/maswali-console.ts"), "utf8");
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

const bad = query({ hdecision: "BAD", hsort: "sql", hdir: "other", hpage: "2junk", wreview: "BAD", wsort: "age", wpage: "-2", sstate: "OPEN", spage: "NaN" });
ok("untrusted URL values fall back to safe controls and first pages", bad.held.decision === "" && bad.held.sort === "week" && bad.held.dir === "desc" && bad.held.page === 1 && bad.winners.review === "" && bad.winners.sort === "week" && bad.winners.page === 1 && bad.seals.state === "" && bad.seals.page === 1);
const params = integrityListParams(query({ hq: " Amina ", hdecision: "pending", hpage: "2", wq: "MW-01", wsort: "share", wpage: "3", sq: "MW-02", sstate: "VOIDED", spage: "4" }));
ok("URL params preserve each list's independent filter, sort and page", params.hq === "Amina" && params.hdecision === "pending" && params.hpage === "2" && params.wq === "MW-01" && params.wsort === "share" && params.wpage === "3" && params.sq === "MW-02" && params.sstate === "VOIDED" && params.spage === "4");
ok("all three kit searches reset only their own pager", ["h", "w", "s"].every((prefix) => page.includes(`param="${prefix}q" pageParam="${prefix}page"`)) && searchBox.includes("sp.delete(pageParam)"));
ok("all three pagers retain sibling state and use their own page key", ["h", "w", "s"].every((prefix) => page.includes(`baseHref={buildBaseHref(INTEGRITY_HREF, listParams, "${prefix}page")} param="${prefix}page"`)));
ok("all three filter forms retain sibling controls and omit their own page", ["h", "w", "s"].every((prefix) => page.includes(`<OtherListState params={listParams} list="${prefix}" />`)) && /!key\.startsWith\(list\)/.test(page));
ok("read model selects complete winner, held, seal sets before page-only hydration", consoleRead.includes("selectHeldShares(allHeld") && consoleRead.includes("selectWinnerTickets(won") && consoleRead.includes("for (const { ticket: t, code } of selectedWinners.rows)") && consoleRead.includes("selectSealWeeks(sealed") && consoleRead.includes("for (const w of selectedSeals.rows)"));
ok("all three empty states distinguish no records from no matches", page.includes("v.heldPage.allTotal === 0") && page.includes("No held shares match these filters") && page.includes("v.winnersPage.allTotal === 0") && page.includes("No winners match these filters") && page.includes("v.sealWeeks.allTotal === 0") && page.includes("No sealed weeks match these filters"));

function mutated(source: string) {
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const mod = { exports: {} as Record<string, unknown> };
  runInNewContext(compiled, { module: mod, exports: mod.exports, require: (name: string) => {
    if (name === "@/lib/search") return search;
    throw new Error(`Unexpected module in mutation: ${name}`);
  }});
  return mod.exports as { selectHeldShares: typeof selectHeldShares; selectWinnerTickets: typeof selectWinnerTickets; selectSealWeeks: typeof selectSealWeeks };
}
if (process.argv.includes("--prove-red")) {
  const unsorted = helper.replace("return pageRows(all, ordered, query.page, perPage);", "return pageRows(all, filtered, query.page, perPage);");
  if (unsorted === helper) throw new Error("Held global-sort plant target missing");
  ok("red: a held page sliced without sorting fails the highest-share assertion", mutated(unsorted).selectHeldShares(held, query({ hsort: "share", hdir: "desc" }).held, 20).rows[0]?.weekSeq !== 1);
  const winnerUnsorted = helper.replace("return pageRows(all, ordered, query.page, perPage);\n}\n\nexport type SealListWeek", "return pageRows(all, filtered, query.page, perPage);\n}\n\nexport type SealListWeek");
  if (winnerUnsorted === helper) throw new Error("Winner global-sort plant target missing");
  ok("red: a winner page sliced without sorting fails the highest-share assertion", mutated(winnerUnsorted).selectWinnerTickets(winners, query({ wsort: "share", wdir: "desc" }).winners, 20).rows[0]?.seq !== 1);
  const unfilteredSeals = helper.replace("return pageRows(all, sorted(filtered, (week) => week.seq, query.dir), query.page, perPage);", "return pageRows(all, sorted([...all], (week) => week.seq, query.dir), query.page, perPage);");
  if (unfilteredSeals === helper) throw new Error("Seal filter plant target missing");
  ok("red: paging unfiltered seal weeks fails the older-week lookup", mutated(unfilteredSeals).selectSealWeeks(seals, query({ sq: "MW-01" }).seals, 4).rows[0]?.seq !== 1);
}
console.log(`maswali integrity lists: ${passed} passed, ${failed} failed`);
if (failed) process.exitCode = 1;
