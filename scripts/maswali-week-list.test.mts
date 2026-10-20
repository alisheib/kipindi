/** Officer week-list behavior and source wiring. --prove-red mutates the real selector in memory. */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { WEEK_STATES } from "../src/lib/maswali-week-label.ts";
import * as search from "../src/lib/search/index.ts";
import { parseWeekListQuery, selectWeekPage, weekListParams } from "../src/lib/maswali-week-list.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const helperPath = join(root, "src/lib/maswali-week-list.ts");
const page = readFileSync(join(root, "src/app/admin/maswali/page.tsx"), "utf8");
const searchBox = readFileSync(join(root, "src/components/ui/search-box.tsx"), "utf8");
const consoleRead = readFileSync(join(root, "src/lib/server/maswali-console.ts"), "utf8");
const helper = readFileSync(helperPath, "utf8");
let passed = 0, failed = 0;
function ok(name: string, condition: boolean) {
  console.log(`${condition ? "PASS" : "FAIL"} ${name}`);
  condition ? passed++ : failed++;
}

const all = Array.from({ length: 45 }, (_, i) => {
  const seq = 45 - i;
  return {
    id: `wk_${seq}`, code: `MW-2026-${String(seq).padStart(2, "0")}`, seq,
    visibility: seq % 3 === 0 ? "DRIVE" as const : "PUBLIC" as const,
    state: WEEK_STATES[(seq - 1) % WEEK_STATES.length]!,
    closesAt: new Date(Date.UTC(2026, 0, seq)).toISOString(),
    ticketCount: 1000 - seq * 13,
    settledAt: seq % 5 === 0 ? new Date(Date.UTC(2026, 1, seq)).toISOString() : null,
  };
});
const codes = (rows: typeof all) => rows.map((row) => row.code).join(",");
const query = (sp: Record<string, string | undefined> = {}) => parseWeekListQuery(sp);

const first = selectWeekPage(all, 1, 20, query());
ok("default week order is newest and keeps all 45 reachable", first.total === 45 && first.allTotal === 45 && first.weeks[0]?.seq === 45 && first.weeks.at(-1)?.seq === 26);
ok("third page reaches the oldest five", codes(selectWeekPage(all, 3, 20, query()).weeks) === codes(all.slice(40)));
ok("out-of-range page clamps to filtered last page", selectWeekPage(all, 999, 2, query({ q: "2026-0" })).page === 5);
ok("week-code search is case-insensitive and finds a middle substring", selectWeekPage(all, 1, 20, query({ q: "w-2026-0" })).total === 9);
ok("shared search grammar supports code field and exclusion", selectWeekPage(all, 1, 20, query({ q: "code:2026-0 -07" })).total === 8);
const narrowed = selectWeekPage(all, 2, 1, query({ q: "2026-0", state: "DRAFT", line: "PUBLIC" }));
ok("code, state and line compose before pagination", narrowed.total === 2 && narrowed.page === 2 && narrowed.weeks[0]?.seq === 1);
const tickets = selectWeekPage(all, 1, 20, query({ sort: "tickets", dir: "desc" }));
ok("ticket sort takes its first page from the whole result set", tickets.total === 45 && tickets.weeks[0]?.seq === 1 && tickets.weeks.at(-1)?.seq === 20);
ok("ascending ticket sort reverses the full set", selectWeekPage(all, 1, 2, query({ sort: "tickets", dir: "asc" })).weeks[0]?.seq === 45);
ok("close-date sort is global", selectWeekPage(all, 2, 20, query({ sort: "closes", dir: "asc" })).weeks[0]?.seq === 21);
ok("unsettled dates stay last in both directions", selectWeekPage(all, 1, 2, query({ sort: "settled", dir: "asc" })).weeks.every((w) => w.settledAt !== null) && selectWeekPage(all, 1, 2, query({ sort: "settled", dir: "desc" })).weeks.every((w) => w.settledAt !== null));
ok("empty inventory and no-match filter have distinguishable totals", selectWeekPage([], 1, 20, query()).allTotal === 0 && selectWeekPage(all, 1, 20, query({ q: "absent" })).allTotal === 45 && selectWeekPage(all, 1, 20, query({ q: "absent" })).total === 0);
const invalid = query({ state: "BAD", line: "NOPE", sort: "sql", dir: "sideways" });
ok("invalid URL controls cannot change the read", invalid.state === "" && invalid.line === "" && invalid.sort === "week" && invalid.dir === "desc");
const params = weekListParams(query({ q: " MW-2026 ", state: "OPEN", line: "DRIVE", sort: "tickets", dir: "asc" }));
ok("validated URL state preserves filters and sort for pager links", params.q === "MW-2026" && params.state === "OPEN" && params.line === "DRIVE" && params.sort === "tickets" && params.dir === "asc" && !("page" in params));
const weekFormWired = (source: string) => /<SearchBox mode="form" formId="maswali-week-filters"[^>]*helpFields=\{\["code"\]\}/.test(source)
  && /<form id="maswali-week-filters" method="get"/.test(source)
  && !/type="hidden" name="q"/.test(source);
ok("kit search is the GET form's sole q input and keeps URL state while resetting page", weekFormWired(page)
  && /name="sort" value=\{query\.sort\}/.test(page) && /name="dir" value=\{query\.dir\}/.test(page) && !/name="page"/.test(page));
const formSearchWired = (source: string) => source.includes('name={mode === "form" ? param : undefined}')
  && source.includes('form={mode === "form" ? formId : undefined}')
  && source.includes('if (mode === "form") return;')
  && source.includes('e.key === "Enter" && mode !== "form"');
ok("form search submits the current field on Apply or Enter without a competing debounce", formSearchWired(searchBox));
ok("form search resyncs on URL/back navigation even when the input stays focused", searchBox.includes('mode === "url" && document.activeElement === inputRef.current'));
ok("six scalar headings sort; filtered pager keeps validated state", (page.match(/<SortTh field=/g) ?? []).length === 6 && /sp=\{listParams\}/.test(page) && /baseHref=\{buildBaseHref\("\/admin\/maswali", listParams\)\}/.test(page));
ok("empty states report the actual cause", page.includes("weeks.allTotal === 0") && page.includes("No week yet") && page.includes("weeks.total === 0") && page.includes("No weeks match these filters"));
ok("server reads the complete list and selects before building page rows", /weekStore\.list\(\{\}\)/.test(consoleRead) && /selectWeekPage\(weeks, askedPage, perPage, query\)/.test(consoleRead) && /selected\.weeks\.map\(rowOf\)/.test(consoleRead));

function mutated(source: string) {
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const mod = { exports: {} as Record<string, unknown> };
  runInNewContext(compiled, { module: mod, exports: mod.exports, require: (name: string) => {
    if (name === "@/lib/maswali-week-label") return { WEEK_STATES };
    if (name === "@/lib/search") return search;
    throw new Error(`Unexpected module in mutation: ${name}`);
  }});
  return mod.exports as { selectWeekPage: typeof selectWeekPage };
}
if (process.argv.includes("--prove-red")) {
  const detached = page.replace('mode="form" formId="maswali-week-filters"', 'mode="url" formId="maswali-week-filters"');
  if (detached === page) throw new Error("Week form-mode plant target missing");
  ok("red: a detached week search would lose a rapid Apply value", !weekFormWired(detached));
  const noFieldName = searchBox.replace('name={mode === "form" ? param : undefined}', 'name={undefined}');
  if (noFieldName === searchBox) throw new Error("SearchBox form-name plant target missing");
  ok("red: a nameless form search cannot submit typed text", !formSearchWired(noFieldName));
  const noSubstring = helper.replace("matchesQuery(parsed, { code: w.code }, CODE_SEARCH)", "w.code.toLowerCase() === query.q.toLowerCase()");
  if (noSubstring === helper) throw new Error("Substring plant target missing");
  const plantedSearch = mutated(noSubstring).selectWeekPage(all, 1, 20, query({ q: "w-2026-0" }));
  ok("red: exact-only search loses nine real substring matches", plantedSearch.total !== 9);
  const beforeSortSlice = "weeks: sorted.slice((page - 1) * size, page * size)";
  const noSort = helper.replace(beforeSortSlice, "weeks: filtered.slice((page - 1) * size, page * size)");
  if (noSort === helper) throw new Error("Global sort plant target missing");
  const plantedSort = mutated(noSort).selectWeekPage(all, 1, 20, query({ sort: "tickets", dir: "desc" }));
  ok("red: slicing unsorted rows hides the highest-ticket weeks", plantedSort.weeks[0]?.seq !== 1);
}
console.log(`maswali week list: ${passed} passed, ${failed} failed`);
if (failed) process.exitCode = 1;
