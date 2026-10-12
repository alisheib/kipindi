/**
 * test:markets-redirect — WHERE A JOURNEY READER'S `/markets` GOES (the Vodacom plan S7: `docs/VODACOM-PLAN.md` §3.2;
 * `docs/design-system/v5-2026-09-29-simplified-journey/S7-PLAN.md` WP3 step 3, Open point 13, amendment A11).
 *
 *   npm run test:markets-redirect     (in predeploy, beside test:journey-home)
 *   npm run red:markets-redirect      (--prove-red: every defect below is planted IN MEMORY and must fail exactly its checks)
 *
 *   §1 THE TABLE (S7 WP3), `journeyMarketsTarget` in `src/lib/journey/markets-redirect.ts`, the one target both of WP9's
 *      doors answer with, as goldens:
 *        · the category: topic becomes cat when it is a known id; topic=all, an unknown topic or an empty one is none; a
 *          repeated topic takes its first value; a known cat with no topic is kept; a topic outranks a cat;
 *        · what is kept, each in its own safe shape: q (trimmed, clamped), side, bet (written again), ref, invite, the five
 *          utm keys, utm_id and the three click ids;
 *        · the fixed order; what is dropped; status=watch going to /watchlist with cat and q only;
 *        · welcome=new and welcome=back kept and written last (A11), any other value dropped;
 *        · every form a door hands in (an x-href, a bare search, Next's record, URLSearchParams, nothing), a fragment, and
 *          crafted keys such as __proto__;
 *        · a path in the request, or one inside q, is never copied into the target (1.no-path-copy, its goldens);
 *        · ALWAYS a same-origin path (1.same-origin): every target, the goldens' and an unpinned sweep of hostile
 *          requests', is / or /watchlist and passes isSafePath (`safe-next.ts`, the one rule) — A11 item 5;
 *        · the attribution kept is GA's own list (`GA_KEPT_PARAMS`), in its order;
 *        · the module imports only pending-bet.ts, the query helpers and the category list, nothing dynamic, carries no
 *          directive, and keeps no second copy of pending-bet's utm keys;
 *        · the wiring: this suite runs in predeploy and its red twin is declared.
 *   §2 (WP9) will hold AppShell's document branch and the page's flight redirect to this one function.
 *
 * ⛔ IN-PROCESS BY CONSTRUCTION: `--prove-red` plants each defect into a copy of the world held in memory, and this file
 * only ever READS files, so `test:red-anchors` §4 counts it in the in-process class. Each plant declares the exact set of
 * checks it must fail, and anything more or less is a miss.
 * ⚠️ This file carries no escape a tool could decode on its way to disk: no backslash anywhere.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { decomment } from "./lib/decomment.mts";
import * as MR from "../src/lib/journey/markets-redirect.ts";
import { isSafePath } from "../src/lib/safe-next.ts";
import { GA_KEPT_PARAMS } from "../src/lib/google-tag.ts";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const PROVE_RED = process.argv.includes("--prove-red");
const LF = String.fromCharCode(10);
const CR = String.fromCharCode(13);
const MODULE = "src/lib/journey/markets-redirect.ts";

/** A file's text with CRLF read as LF (this machine checks files out as CRLF). */
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8").split(CR + LF).join(LF);
const j = (v: unknown) => JSON.stringify(v);

type Input = MR.MarketsSearch | null | undefined;

/** Everything the checks read. The red run plants on copies of it. */
type World = {
  target: typeof MR.journeyMarketsTarget;
  /** The module's kept attribution keys: the utm keys, then utm_id and the click ids. */
  keys: readonly string[];
  /** GA's own list (`google-tag.ts`), which the kept keys must equal. */
  ga: readonly string[];
  /** The module's source text. */
  source: string;
  scripts: Readonly<Record<string, string>>;
};

const REAL: World = {
  target: MR.journeyMarketsTarget,
  keys: [...MR.KEPT_UTM_KEYS, ...MR.KEPT_CLICK_KEYS],
  ga: GA_KEPT_PARAMS,
  source: read(MODULE),
  scripts: (JSON.parse(read("package.json")) as { scripts: Record<string, string> }).scripts,
};

/** The parameters of any input form, read as the module reads them (the query after the first "?", before any "#"). */
function paramsOf(input: Input): URLSearchParams {
  if (typeof input === "string") {
    const bare = input.split("#")[0];
    const at = bare.indexOf("?");
    return new URLSearchParams(at < 0 ? "" : bare.slice(at + 1));
  }
  if (input instanceof URLSearchParams) return new URLSearchParams(input);
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(input ?? {})) for (const x of Array.isArray(v) ? v : v === undefined ? [] : [v]) p.append(k, x);
  return p;
}

const brief = (v: unknown): unknown =>
  v instanceof URLSearchParams ? `URLSearchParams(${v.toString()})` : typeof v === "string" && v.length > 64 ? `${v.slice(0, 40)}...(${v.length} chars)` : v;

/** A backslash and a tab, built from their code points (this file carries no backslash). */
const BS = String.fromCharCode(92);
const TAB = String.fromCharCode(9);
/**
 * Hostile requests with NO golden of their own: 1.same-origin asserts only that each one's target is safe, so a defect
 * that copies a request value into the path is caught even where no golden happens to look (a backslash after the first
 * slash, which a hand-rolled leading-slash test passes; encoded slashes in every kept key; a tab; another scheme; a
 * path-shaped key; a path inside URLSearchParams).
 */
const SWEEP: Input[] = [
  `/${BS}evil.example/markets?q=x`,
  `${BS}${BS}evil.example/markets?topic=sports`,
  `/markets?q=${encodeURIComponent(BS + "evil.example")}`,
  "/markets?q=%09%2F%2Fevil.example",
  "/markets?topic=%2F%2Fevil.example&cat=%2F%2Fevil.example",
  "/markets?bet=%2F%2Fevil.example.YES",
  "/markets?welcome=%2F%2Fevil.example",
  "/markets?ref=%2F%2Fevil&gclid=%2F%2Fevil",
  "/markets?status=watch&q=%2F%2Fevil.example",
  "javascript:alert(1)//markets?q=x",
  `/markets?${TAB}=x&q=a`,
  { q: "//evil.example", "/evil": "x" },
  new URLSearchParams([["q", `/${BS}evil.example`]]),
];

function run(w: World, log: (l: string) => void): string[] {
  const failed: string[] = [];
  const ok = (label: string, cond: boolean, extra = "") => {
    if (cond) log(`  PASS ${label}`);
    else { failed.push(label); log(`  FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
  };
  /** Every target this run produced: the same-origin check reads them all. */
  const targets: string[] = [];
  const go = (input: Input): string => {
    let out: string;
    try { out = w.target(input); } catch (e) { out = `threw: ${(e as Error).message}`; }
    targets.push(out);
    return out;
  };
  const mismatches = (rows: Array<[Input, string]>) =>
    rows.flatMap(([input, want]) => { const got = go(input); return got === want ? [] : [[brief(input), want, brief(got)]]; });
  const table = (label: string, rows: Array<[Input, string]>) => {
    const bad = mismatches(rows);
    ok(label, bad.length === 0, `[input, wanted, got]: ${j(bad)}`);
  };

  table("1.topic · the board's topic becomes the home's cat when it is a known id: none, all, an unknown or an empty topic is /; a repeated topic takes its first value; a known cat with no topic is kept; a topic outranks a cat", [
    ["/markets", "/"],
    ["/markets?topic=sports", "/?cat=sports"],
    ["/markets?topic=all", "/"],
    ["/markets?topic=politics", "/"],
    ["/markets?topic=", "/"],
    ["/markets?topic=sports&topic=macro", "/?cat=sports"],
    ["/markets?cat=weather", "/?cat=weather"],
    ["/markets?cat=bogus", "/"],
    ["/markets?topic=all&cat=sports", "/"],
  ]);

  table("1.kept · each kept parameter in its own safe shape: q trimmed and clamped; side YES or NO only; a valid bet written again and an invalid one dropped; ref and invite in pending-bet's code shape; the five utm keys in its utm shape; utm_id and the click ids in one token shape", [
    ["/markets?q=%20%20simba%20yanga%20", "/?q=simba%20yanga"],
    [`/markets?q=${"y".repeat(300)}`, `/?q=${"y".repeat(120)}`],
    ["/markets?side=YES", "/?side=YES"],
    ["/markets?side=NO", "/?side=NO"],
    ["/markets?side=no", "/"],
    ["/markets?side=UP", "/"],
    ["/markets?bet=mkt_b040971a5824517186c3.YES.5000", "/?bet=mkt_b040971a5824517186c3.YES.5000"],
    ["/markets?bet=udr_4f1c09aa2d.UP", "/?bet=udr_4f1c09aa2d.UP"],
    ["/markets?bet=mkt_x.MAYBE", "/"],
    ["/markets?bet=mkt_x.YES.0500", "/"],
    ["/markets?ref=abc_123&invite=INV-9", "/?ref=abc_123&invite=INV-9"],
    [`/markets?ref=%3Cscript%3E&invite=${"i".repeat(65)}`, "/"],
    ["/markets?utm_source=facebook&utm_medium=cpc&utm_campaign=launch%20week&utm_term=x&utm_content=y",
      "/?utm_source=facebook&utm_medium=cpc&utm_campaign=launch%20week&utm_term=x&utm_content=y"],
    [`/markets?utm_source=${"u".repeat(101)}&utm_medium=%22quoted%22`, "/"],
    ["/markets?utm_id=cmp.42&gclid=Cj0KCQjw-abc_123&gbraid=0AAAAAo~x&wbraid=CjkKCAjw",
      "/?utm_id=cmp.42&gclid=Cj0KCQjw-abc_123&gbraid=0AAAAAo~x&wbraid=CjkKCAjw"],
    [`/markets?gclid=a%20b&gbraid=${"g".repeat(201)}&wbraid=%3Cx%3E`, "/"],
  ]);

  table("1.order · the order is fixed, whatever order the link wrote: cat, q, side, bet, ref, invite, the utm keys, then the click ids", [
    ["/markets?wbraid=w1&utm_content=c&utm_source=s&invite=i1&gclid=g1&ref=r1&bet=mkt_a1.NO&side=NO&utm_id=u1&q=x&topic=macro&gbraid=b1",
      "/?cat=macro&q=x&side=NO&bet=mkt_a1.NO&ref=r1&invite=i1&utm_source=s&utm_content=c&utm_id=u1&gclid=g1&gbraid=b1&wbraid=w1"],
  ]);

  table("1.dropped · the board's own axes and anything else are dropped: status, sort, dir, odds, pool, page, when, w and an unknown key", [
    ["/markets?status=open&sort=closing&dir=asc&odds=any&pool=big&page=3&when=today&w=1&foo=bar", "/"],
    ["/markets?topic=sports&sort=pool&page=2", "/?cat=sports"],
  ]);

  table("1.watch · status=watch goes to /watchlist, carrying cat and q only", [
    ["/markets?status=watch", "/watchlist"],
    ["/markets?status=watch&topic=sports&q=simba&side=YES&utm_source=x&bet=mkt_a1.YES", "/watchlist?cat=sports&q=simba"],
    ["/markets?status=watch&cat=macro", "/watchlist?cat=macro"],
  ]);

  table("1.welcome · the sign-up greeting survives the redirect (A11): welcome=new and welcome=back are kept and written last; any other value is dropped", [
    ["/markets?welcome=new", "/?welcome=new"],
    ["/markets?topic=sports&welcome=new", "/?cat=sports&welcome=new"],
    ["/markets?status=watch&welcome=new", "/watchlist?welcome=new"],
    ["/markets?welcome=x", "/"],
    ["/markets?welcome=back&gclid=g1&q=x", "/?q=x&gclid=g1&welcome=back"],
  ]);

  table("1.forms · every form a door hands in reads the same: an x-href, a bare search, Next's searchParams record, URLSearchParams and nothing; a fragment is not the query; crafted keys are ordinary keys, never a crash", [
    ["?topic=weather", "/?cat=weather"],
    [{ topic: ["sports", "macro"], q: " yanga ", utm_source: "x", status: undefined }, "/?cat=sports&q=yanga&utm_source=x"],
    [new URLSearchParams("topic=culture&q=a+b"), "/?cat=culture&q=a%20b"],
    [null, "/"],
    [undefined, "/"],
    ["", "/"],
    ["/markets#?topic=sports", "/"],
    ["/markets?topic=tech#top", "/?cat=tech"],
    ["/markets?__proto__=x&constructor=y&toString=z&hasOwnProperty=w", "/"],
  ]);

  table("1.no-path-copy · a path in the request, or one inside q, is never copied into the target: ?q=/evil.example is the search /evil.example on the home, and a request whose path is //evil.example or https://evil.example still goes home", [
    ["/markets?q=/evil.example", "/?q=%2Fevil.example"],
    ["/markets?q=%2F%2Fevil.example", "/?q=%2F%2Fevil.example"],
    ["//evil.example/markets?topic=sports", "/?cat=sports"],
    ["https://evil.example/markets?topic=macro", "/?cat=macro"],
  ]);

  // The sweep's targets join the goldens' in `targets`; nothing pins their exact text, only their safety below.
  for (const input of SWEEP) go(input);
  const unsafe = targets.filter((t) => !isSafePath(t) || !(t === "/" || t.startsWith("/?") || t === "/watchlist" || t.startsWith("/watchlist?")));
  ok("1.same-origin · every target, the goldens' and an unpinned sweep of hostile requests', is / or /watchlist and passes isSafePath (safe-next.ts, the one rule; A11 item 5)",
    unsafe.length === 0 && targets.length >= 60, j({ unsafe: unsafe.slice(0, 3).map(brief), targets: targets.length }));

  ok("1.ga · the attribution kept is GA's own list (google-tag.ts GA_KEPT_PARAMS), in its order: the five utm keys, utm_id, then gclid, gbraid and wbraid",
    j(w.keys) === j(w.ga), j({ redirect: w.keys, ga: w.ga }));

  const code = decomment(w.source);
  const specs = [...code.matchAll(/^import[^;]*?from[ ]*["']([^"']+)["']/gm)].map((m) => m[1]).sort();
  const allowed = ["@/lib/journey/pending-bet", "@/lib/markets/categories", "@/lib/query/parse", "@/lib/search/query"];
  const secondUtmList = code.includes('"utm_source"');
  ok("1.imports · the module imports only pending-bet.ts, the query helpers and the category list (A11 item 5, plus the platform's one category list), nothing dynamic, carries no directive, and keeps no second copy of pending-bet's utm keys",
    code.length > 1_000 && j(specs) === j(allowed) && !/import[ ]*[(]|require[ ]*[(]/.test(code) && !/["']use (?:client|server)["']/.test(code)
      && !secondUtmList,
    j({ specs, chars: code.length, secondUtmList }));

  ok("1.wired · test:markets-redirect runs this file and sits in predeploy beside test:journey-home; red:markets-redirect runs it with --prove-red",
    w.scripts["test:markets-redirect"] === "tsx scripts/markets-redirect.test.mts"
      && w.scripts["red:markets-redirect"] === "tsx scripts/markets-redirect.test.mts --prove-red"
      && (w.scripts.predeploy ?? "").includes("npm run test:journey-home && npm run test:markets-redirect && "),
    j({ test: w.scripts["test:markets-redirect"] ?? null, red: w.scripts["red:markets-redirect"] ?? null }));
  return failed;
}

if (!PROVE_RED) {
  console.log("markets-redirect — where a journey reader's /markets goes (the Vodacom plan S7)");
  const failed = run(REAL, (l) => console.log(l));
  console.log(`${LF}MARKETS REDIRECT — ${failed.length === 0 ? "all checks passed" : `${failed.length} failed`}${LF}`);
  process.exitCode = failed.length === 0 ? 0 : 1;
} else {
  const quiet = () => {};
  /** `fails`: the exact set of checks the plant must turn red. */
  type Plant = { name: string; fails: string[]; plant: (w: World) => World };
  /** The real target with one defect laid over its answer. */
  const wrap = (w: World, f: (input: Input, real: string) => string): World => ({ ...w, target: (input) => f(input, w.target(input)) });
  const PLANTS: Plant[] = [
    { name: "a dropped key leaks: the board's sort and page ride along to the home", fails: ["1.dropped"],
      plant: (w) => wrap(w, (input, real) => {
        const p = paramsOf(input);
        const extra = ["sort", "page"].flatMap((k) => { const v = p.get(k); return v === null ? [] : [`${k}=${encodeURIComponent(v)}`]; });
        return extra.length === 0 ? real : `${real}${real.includes("?") ? "&" : "?"}${extra.join("&")}`;
      }) },
    { name: "status=watch ignored: the reader's watch lens lands on the home (the greeting's watch row with it)", fails: ["1.watch", "1.welcome"],
      plant: (w) => wrap(w, (input, real) => {
        const p = paramsOf(input);
        if (p.get("status") !== "watch") return real;
        p.delete("status");
        return w.target(`?${p.toString()}`);
      }) },
    { name: "an unvalidated topic passes through as the home's cat", fails: ["1.topic"],
      plant: (w) => wrap(w, (input, real) => {
        const t = paramsOf(input).get("topic");
        if (!t || real.includes("cat=")) return real;
        const rest = real.split("?")[1];
        return `/?cat=${encodeURIComponent(t)}${rest ? `&${rest}` : ""}`;
      }) },
    { name: "the sign-up greeting dropped in the redirect (A11)", fails: ["1.welcome"],
      plant: (w) => wrap(w, (_input, real) => {
        const [path, qs] = real.split("?");
        const kept = (qs ?? "").split("&").filter((s) => s !== "" && !s.startsWith("welcome="));
        return kept.length > 0 ? `${path}?${kept.join("&")}` : path;
      }) },
    { name: "the target built from a request value: ?q=/evil.example becomes //evil.example, another site (A11)", fails: ["1.no-path-copy", "1.same-origin"],
      plant: (w) => wrap(w, (input, real) => { const q = paramsOf(input).get("q"); return q && q.startsWith("/") ? `/${q}` : real; }) },
    { name: "the request's path copied into the target behind a hand-rolled leading-slash test, which a backslash after the first slash passes (the hole 6.one-rule closed): no golden sees it, isSafePath over every target does", fails: ["1.same-origin"],
      plant: (w) => wrap(w, (input, real) => {
        if (typeof input !== "string") return real;
        const path = input.split("#")[0].split("?")[0];
        const naiveSamePath = path.startsWith("/") && !path.startsWith("//");
        return path !== "" && path !== "/markets" && naiveSamePath ? `${path}${real.slice(1)}` : real;
      }) },
    { name: "a click id kept without its token shape: any value rides along to the home", fails: ["1.kept"],
      plant: (w) => wrap(w, (input, real) => {
        const p = paramsOf(input);
        const extra = MR.KEPT_CLICK_KEYS.flatMap((k) => { const v = p.get(k); return v === null || real.includes(`${k}=`) ? [] : [`${k}=${encodeURIComponent(v)}`]; });
        return extra.length === 0 ? real : `${real}${real.includes("?") ? "&" : "?"}${extra.join("&")}`;
      }) },
    { name: "the utm keys written before ref and invite (the fixed order broken)", fails: ["1.order"],
      plant: (w) => wrap(w, (_input, real) => {
        const [path, qs] = real.split("?");
        if (!qs) return real;
        const parts = qs.split("&");
        const isUtm = (s: string) => MR.KEPT_UTM_KEYS.some((k) => s.startsWith(`${k}=`));
        const firstCode = parts.findIndex((s) => s.startsWith("ref=") || s.startsWith("invite="));
        if (firstCode < 0 || !parts.some(isUtm)) return real;
        const rest = parts.filter((s) => !isUtm(s));
        const at = rest.findIndex((s) => s.startsWith("ref=") || s.startsWith("invite="));
        return `${path}?${[...rest.slice(0, at), ...parts.filter(isUtm), ...rest.slice(at)].join("&")}`;
      }) },
    { name: "a fragment read as part of the query (a link's #?topic= becomes the home's chip)", fails: ["1.forms"],
      plant: (w) => wrap(w, (input, real) => (typeof input === "string" && input.includes("#") ? w.target(input.split("#").join("")) : real)) },
    { name: "GA's list gains a key the redirect does not keep", fails: ["1.ga"],
      plant: (w) => ({ ...w, ga: [...w.ga, "dclid"] }) },
    { name: "the module imports a server module (the server graph in a browser chunk)", fails: ["1.imports"],
      plant: (w) => ({ ...w, source: `import { db } from "@/lib/server/store";${LF}${w.source}` }) },
    { name: "the five utm keys re-declared in the module (a second list beside pending-bet's, free to drift)", fails: ["1.imports"],
      plant: (w) => {
        const anchor = "export const KEPT_CLICK_KEYS";
        if (w.source.split(anchor).length !== 2) throw new Error(`the plant's anchor does not resolve exactly once: ${anchor}`);
        const copy = 'const UTM_COPY = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"] as const;';
        return { ...w, source: w.source.split(anchor).join(`${copy}${LF}${anchor}`) };
      } },
    { name: "the suite left out of predeploy (a gate not in the pipeline is not a gate)", fails: ["1.wired"],
      plant: (w) => ({ ...w, scripts: { ...w.scripts, predeploy: (w.scripts.predeploy ?? "").split("npm run test:markets-redirect && ").join("") } }) },
  ];
  let caught = 0, fail = 0;
  const ok = (label: string, cond: boolean, extra = "") => { if (!cond) fail++; console.log(`${cond ? "PROVED  " : "MISSED  "} ${label}${extra ? ` — ${extra}` : ""}`); };
  const idOf = (label: string) => label.split(" · ")[0];
  /** The verdict: the set of checks that failed is EXACTLY the plant's declared set. */
  const judge = (failures: string[], fails: string[]) => {
    const got = [...new Set(failures.map(idOf))].sort();
    return { exact: j(got) === j([...fails].sort()), got };
  };
  // CONTROL, before any plant: the verdict must refuse a missing check, an extra one, and a neighbouring id.
  {
    const cases: Array<[string[], string[], boolean]> = [
      [["1.watch · a", "1.welcome · b"], ["1.watch", "1.welcome"], true], [["1.topic · a", "1.topic · b"], ["1.topic"], true],
      [["1.watch · a"], ["1.watch", "1.welcome"], false], [["1.watch · a", "1.topic · c"], ["1.watch"], false],
      [["1.topics · a"], ["1.topic"], false], [[], ["1.topic"], false],
    ];
    const wrong = cases.filter(([failures, fails, want]) => judge(failures, fails).exact !== want);
    ok("the verdict's control: exactly the declared checks prove a plant; one missing, one extra, a neighbouring id or nothing does not",
      wrong.length === 0, wrong.length === 0 ? "" : j(wrong));
  }
  const clean = run(REAL, quiet);
  ok("the REAL module passes every check", clean.length === 0, clean.join(" | "));
  for (const p of PLANTS) {
    let failures: string[];
    try { failures = run(p.plant(REAL), quiet); }
    catch (e) { ok(p.name, false, `the plant is broken: ${(e as Error).message}`); continue; }
    const { exact, got } = judge(failures, p.fails);
    if (exact) caught++;
    ok(p.name, exact, exact ? "" : got.length === 0 ? "NOTHING failed — the gate cannot see this defect" : `failed ${j(got)}, wanted exactly ${j([...p.fails].sort())}`);
  }
  console.log(`${LF}RED CONTROL — ${caught}/${PLANTS.length} caught, each on exactly its own checks${fail === 0 ? "" : ` · ${fail} FAILED`}${LF}`);
  process.exitCode = fail === 0 ? 0 : 1;
}
