/** S5's public settled-week sitemap. --prove-red plants policy breaks in the code under test, in memory. */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { millioneaSitemap } from "../src/lib/maswali-sitemap.ts";

const root = fileURLToPath(new URL("..", import.meta.url));
const source = (path: string) => readFileSync(join(root, path), "utf8");
const helperSource = source("src/lib/maswali-sitemap.ts");
const routeSource = source("src/app/sitemap.ts");
const origin = "https://www.50pick.tz";
const rows = [
  { code: "MLN-2026-W44", visibility: "PUBLIC", state: "SETTLED", settledAt: "2026-11-01T10:00:00.000Z", createdBy: "private-officer" },
  { code: "MLN-2026-W43", visibility: "PUBLIC", state: "SETTLED", settledAt: "2026-10-25T10:00:00.000Z" },
  { code: "MLN-2026-W42", visibility: "DRIVE", state: "SETTLED", settledAt: "2026-10-18T10:00:00.000Z" },
  { code: "MLN-2026-W45", visibility: "PUBLIC", state: "OPEN", settledAt: null },
  { code: "MLN-2026-W41", visibility: "PUBLIC", state: "VOIDED", settledAt: null },
  { code: "MLN-2026-W40", visibility: "PUBLIC", state: "SETTLED", settledAt: null },
  { code: "../../private", visibility: "PUBLIC", state: "SETTLED", settledAt: "2026-10-01T00:00:00.000Z" },
];
let pass = 0, fail = 0;
function ok(label: string, condition: boolean) {
  console.log(`${condition ? "PASS" : "FAIL"} ${label}`);
  condition ? pass++ : fail++;
}
const urls = (entries: Array<{ url: string }>) => entries.map((entry) => entry.url);
const expected = [origin, `${origin}/millionea/register`, `${origin}/millionea/register/MLN-2026-W44`, `${origin}/millionea/register/MLN-2026-W43`];
const active = millioneaSitemap("ACTIVE", rows as never, origin);
ok("ACTIVE indexes the register and every real public settled week", JSON.stringify(urls(active)) === JSON.stringify(expected));
ok("a settled week's lastmod is its actual settlement stamp", active[2]?.lastModified instanceof Date
  && active[2].lastModified.toISOString() === rows[0].settledAt && active[3]?.lastModified instanceof Date
  && active[3].lastModified.toISOString() === rows[1].settledAt);
ok("the sitemap never carries officer data or a made-up home timestamp", !JSON.stringify(active).includes("private-officer")
  && !("lastModified" in active[0]));
ok("WITHDRAWN and STAFF_PREVIEW index no Millionea URL", ["WITHDRAWN", "STAFF_PREVIEW"].every((state) =>
  JSON.stringify(urls(millioneaSitemap(state as never, rows as never, origin))) === JSON.stringify([origin])));

function compiled(code: string, mocks: Record<string, unknown>) {
  const js = ts.transpileModule(code, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const mod = { exports: {} as Record<string, unknown> };
  runInNewContext(js, {
    module: mod, exports: mod.exports, Date, Number, RegExp, encodeURIComponent,
    require: (name: string) => {
      if (!(name in mocks)) throw new Error(`Unexpected import: ${name}`);
      return mocks[name];
    },
  });
  return mod.exports;
}

async function route(code: string, state: string, read: () => Promise<unknown>) {
  const calls: unknown[] = [];
  const mod = compiled(code, {
    "@/lib/app-url": { appUrl: () => origin },
    "@/lib/maswali-sitemap": { millioneaSitemap },
    "@/lib/server/maswali-dal": { weekStore: { list: async (opts: unknown) => { calls.push(opts); return read(); } } },
    "@/lib/server/millionea-switch": { millioneaStateNow: async () => state },
  });
  const result = await (mod.default as () => Promise<Array<{ url: string }>>)();
  return { urls: urls(result), calls, dynamic: mod.dynamic };
}
const dark = await route(routeSource, "WITHDRAWN", async () => rows);
const preview = await route(routeSource, "STAFF_PREVIEW", async () => rows);
const live = await route(routeSource, "ACTIVE", async () => rows);
const unread = await route(routeSource, "ACTIVE", async () => { throw new Error("record unreadable"); });
ok("the route rechecks rollout on every request and never reads hidden-week data", dark.calls.length === 0 && preview.calls.length === 0
  && JSON.stringify(dark.urls) === JSON.stringify([origin]) && JSON.stringify(preview.urls) === JSON.stringify([origin])
  && live.dynamic === "force-dynamic");
ok("the route reads only settled PUBLIC weeks from its store", live.calls.length === 1
  && JSON.stringify(live.calls[0]) === JSON.stringify({ visibility: "PUBLIC", states: ["SETTLED"] })
  && JSON.stringify(live.urls) === JSON.stringify(expected));
ok("an unreadable week record cannot publish stale or unverified week URLs", JSON.stringify(unread.urls) === JSON.stringify([origin]));

if (process.argv.includes("--prove-red")) {
  function replaceOnce(haystack: string, before: string, after: string) {
    if (haystack.split(before).length !== 2) throw new Error(`Mutation target absent or ambiguous: ${before}`);
    return haystack.replace(before, after);
  }
  const changedState = replaceOnce(helperSource, 'if (state !== "ACTIVE") return home;', 'if (state === "ACTIVE") return home;');
  const stateHelper = compiled(changedState, {}).millioneaSitemap as typeof millioneaSitemap;
  ok("red: a reversed rollout gate reveals the register while WITHDRAWN", urls(stateHelper("WITHDRAWN", rows as never, origin)).length > 1);
  const changedLine = replaceOnce(helperSource, 'week.visibility !== "PUBLIC"', 'week.visibility === "PUBLIC"');
  const lineHelper = compiled(changedLine, {}).millioneaSitemap as typeof millioneaSitemap;
  ok("red: a reversed visibility test leaks the DRIVE week", urls(lineHelper("ACTIVE", rows as never, origin)).some((url) => url.endsWith("W42")));
  const changedRoute = replaceOnce(routeSource, 'if (state !== "ACTIVE")', 'if (state === "ACTIVE")');
  const darkWithRead = await route(changedRoute, "WITHDRAWN", async () => rows);
  ok("red: a reversed route gate reads the database while WITHDRAWN", darkWithRead.calls.length === 1);
}

console.log(`maswali sitemap: ${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
