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
 *        · a search cut at the cap never keeps half a character (1.whole, the WP9 review): an emoji the cap splits is
 *          dropped with the space it uncovered, so the address is written rather than thrown (a URIError);
 *        · ALWAYS a same-origin path (1.same-origin): every target, the goldens' and an unpinned sweep of hostile
 *          requests', is / or /watchlist and passes isSafePath (`safe-next.ts`, the one rule) — A11 item 5;
 *        · the attribution kept is GA's own list (`GA_KEPT_PARAMS`), in its order;
 *        · the module imports only pending-bet.ts, the query helpers and the category list, nothing dynamic, carries no
 *          directive, and keeps no second copy of pending-bet's utm keys;
 *        · the wiring: this suite runs in predeploy and its red twin is declared.
 *   §2 THE TWO DOORS (S7 WP9, Correction 10, amendments A1 item 6, A11 item 5 and A18), read from their source:
 *        · AppShell's DOCUMENT door, a real 307 (`app-shell.tsx`): ONE statement, after the E-381 block, whose condition
 *          is exactly the board's own address (`/markets`, never a prefix: a question page is never redirected), a
 *          document (`x-kp-document`: a root-layout redirect on a flight blanks the page) and the request's journey
 *          answer (`journeyRead`, never a classic request) — no path rule of its own — and whose redirect goes through the
 *          one function, fed the request's path and query (`x-href`); after the `/admin` and opt-out returns and
 *          E-381's document redirect, before the render, at AppShell's own top level in no block (2.shell.top: inside
 *          `if (session)` a guest with a pass would get the board); S6's two anchors (`const h = await headers();`,
 *          `const journeyRead = resolveSimpleJourney();`) verbatim, once each;
 *        · the board page's FLIGHT door (`markets/page.tsx`): its first statement asks the one resolver, its second
 *          redirects a journey request (never a classic one) — so nothing is read before them, not the words, the board
 *          or the search — and its redirect goes through the same function, fed the page's own search;
 *        · ONE TARGET (2.callers): nothing but the two doors calls `journeyMarketsTarget`, nothing but its module defines
 *          it, and each door imports it from there — over every file under src/, its population printed;
 *        · the proxy names neither the preview pass nor the redirect (`test:simple-journey-flag` 10.no.grant's rule), and
 *          it SETS the two headers both doors trust — x-href from the path and query it parsed, x-kp-document from the
 *          browser's Sec-Fetch-Mode — over its copy of the client's headers, never forwarding a client's own
 *          (2.proxy.headers);
 *        · SHELVED.md carries the board's row in its six columns, naming this suite (A18).
 *
 * The journey home's own reading of `?cat` and `?q` is `test:journey-home`'s; where Tafuta sends `?q` from is
 * `test:journey-account`'s (§9).
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
import { srcFiles } from "./lib/tracked-files.mts";
import * as MR from "../src/lib/journey/markets-redirect.ts";
import { isSafePath } from "../src/lib/safe-next.ts";
import { GA_KEPT_PARAMS } from "../src/lib/google-tag.ts";
import { clampText } from "../src/lib/query/parse.ts";
import { MAX_QUERY_LEN } from "../src/lib/search/query.ts";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const PROVE_RED = process.argv.includes("--prove-red");
const LF = String.fromCharCode(10);
const CR = String.fromCharCode(13);
const MODULE = "src/lib/journey/markets-redirect.ts";
/** §2 · the two doors, the edge and the record (S7 WP9). */
const SHELL = "src/components/layout/app-shell.tsx";
const PAGE = "src/app/markets/page.tsx";
const PROXY = "src/proxy.ts";
const SHELVED = "docs/SHELVED.md";
const TARGET = "journeyMarketsTarget";

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
  /** §2 · AppShell's source (the document door). */
  shell: string;
  /** §2 · the board page's source (the flight door). */
  page: string;
  /** §2 · the proxy's source (which must name neither the pass nor the redirect). */
  proxy: string;
  /** §2 · docs/SHELVED.md (the board's row, A18). */
  shelved: string;
  /** §2 · every file under src/ whose text names the target, by path: 2.callers' population. */
  namers: Readonly<Record<string, string>>;
  /** §2 · how many files under src/ the census read (printed, and held to a floor). */
  walked: number;
};

/** Every file under src/ (the one walker, `tracked-files.mts`), read once; the census keeps those that name the target. */
const SRC = srcFiles();
const REAL: World = {
  target: MR.journeyMarketsTarget,
  keys: [...MR.KEPT_UTM_KEYS, ...MR.KEPT_CLICK_KEYS],
  ga: GA_KEPT_PARAMS,
  source: read(MODULE),
  scripts: (JSON.parse(read("package.json")) as { scripts: Record<string, string> }).scripts,
  shell: read(SHELL),
  page: read(PAGE),
  proxy: read(PROXY),
  shelved: read(SHELVED),
  namers: Object.fromEntries(SRC.map((p) => [p, read(p)] as const).filter(([, s]) => s.includes(TARGET))),
  walked: SRC.length,
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
/** An emoji, two UTF-16 units: put at the cap (`MAX_QUERY_LEN`, 120) after 119 letters, the cut splits it (1.whole). */
const EMOJI = String.fromCodePoint(0x1f600);
const ys = (n: number) => "y".repeat(n);
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
  // An emoji the cap cuts in two (the WP9 review): the target must still be written, never a URIError's error page.
  `/markets?q=${ys(119)}${EMOJI}`,
  `/markets?status=watch&topic=sports&q=${ys(119)}%F0%9F%98%80`,
  new URLSearchParams([["q", `${ys(119)}${EMOJI}`], ["utm_source", "x"]]),
];

// ══ §2's READERS — the source as its checks read it: comments out (`decomment`), every run of whitespace one space, so a
// statement reads as one line whatever its wrapping. Brackets are counted, so a term or a statement is cut only at its
// own level. (Each pattern is built from code points or plain text: this file carries no backslash.)
const WS = new RegExp(`[ ${TAB}${CR}${LF}]+`, "g");
const flat = (s: string) => decomment(s).replace(WS, " ");
const count = (hay: string, needle: string) => hay.split(needle).length - 1;
const OPENERS = "([{";
const CLOSERS = ")]}";
/** `s` cut at every `sep` that stands outside any bracket. */
function splitTop(s: string, sep: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let from = 0;
  for (let i = 0; i < s.length; i++) {
    if (OPENERS.includes(s[i])) depth++;
    else if (CLOSERS.includes(s[i])) depth--;
    else if (depth === 0 && s.startsWith(sep, i)) { out.push(s.slice(from, i).trim()); from = i + sep.length; i += sep.length - 1; }
  }
  out.push(s.slice(from).trim());
  return out;
}
/** Each `if (…) …;` statement of `code` that holds `needle`, whole: from the `if (` before it to the `;` after it. */
function ifsHolding(code: string, needle: string): string[] {
  const out = new Set<string>();
  for (let at = code.indexOf(needle); at >= 0; at = code.indexOf(needle, at + needle.length)) {
    const start = code.lastIndexOf("if (", at);
    const end = code.indexOf(";", at);
    if (start >= 0 && end > at) out.add(code.slice(start, end + 1));
  }
  return [...out];
}
/** An `if (cond) body;` statement: its condition's top-level `&&` terms, and the body after it. */
function parseIf(stmt: string): { terms: string[]; body: string } | null {
  if (!stmt.startsWith("if (")) return null;
  let depth = 0;
  for (let i = 3; i < stmt.length; i++) {
    if (stmt[i] === "(") depth++;
    else if (stmt[i] === ")" && --depth === 0) return { terms: splitTop(stmt.slice(4, i), " && "), body: stmt.slice(i + 1).trim() };
  }
  return null;
}
/** What follows the parameters of the function whose head is `head`: its body, then the rest of the file. */
function bodyAfter(code: string, head: string): string {
  const at = code.indexOf(head);
  const open = at < 0 ? -1 : code.indexOf(") {", at);
  return open < 0 ? "" : code.slice(open + 3).trim();
}
/** The first `n` statements of a body, each up to a `;` that stands outside any bracket. */
function statements(body: string, n: number): string[] {
  const out: string[] = [];
  let depth = 0;
  let from = 0;
  for (let i = 0; i < body.length && out.length < n; i++) {
    if (OPENERS.includes(body[i])) depth++;
    else if (CLOSERS.includes(body[i])) depth--;
    else if (body[i] === ";" && depth === 0) { out.push(body.slice(from, i + 1).trim()); from = i + 1; }
  }
  return out;
}
/** §2's terms, as AppShell writes them: the board's address, a document, the request's journey answer. */
const T_PATH = 'pathname === "/markets"';
const T_DOC = 'h.get("x-kp-document") === "1"';
const T_JOURNEY = "(await journeyRead).journey";
/** Nothing the edge may name: the preview pass in any spelling, its resolver, or the redirect (10.no.grant's rule). */
const PROXY_NEVER = ["kp_preview", "JOURNEY_PREVIEW_COOKIE", "journey-preview", "resolveSimpleJourney", "markets-redirect", TARGET];
/** The one import each door takes the target by. */
const TARGET_IMPORT = `import { ${TARGET} } from "@/lib/journey/markets-redirect";`;
/** What declares the target: a second one anywhere is a second rule. */
const DECLARES = [`function ${TARGET}(`, `const ${TARGET} =`, `let ${TARGET} =`, `var ${TARGET} =`];

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
    [`/markets?ref=${"a".repeat(64)}&invite=${"i".repeat(64)}`, `/?ref=${"a".repeat(64)}&invite=${"i".repeat(64)}`],
    [`/markets?ref=${"a".repeat(65)}&invite=${"i".repeat(65)}`, "/"],
    ["/markets?ref=%20ABCD%20&invite=%20INV-9%20", "/"],
    ["/markets?ref=%2Fbad&invite=%252Fbad", "/"],
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

  table("1.whole · a search cut at the cap never keeps half a character (the WP9 review): an emoji the cut splits is dropped, with the space the cut uncovered, so the address is written rather than thrown; a whole emoji at the cap stays — on / and on /watchlist, from an x-href (raw or encoded) and from Next's record", [
    [`/markets?q=${ys(119)}${EMOJI}`, `/?q=${ys(119)}`],
    [`/markets?q=${ys(119)}%F0%9F%98%80`, `/?q=${ys(119)}`],
    [`/markets?status=watch&q=${ys(119)}${EMOJI}`, `/watchlist?q=${ys(119)}`],
    [`/markets?q=${ys(118)}%20${EMOJI}`, `/?q=${ys(118)}`],
    [`/markets?q=${ys(118)}${EMOJI}`, `/?q=${ys(118)}%F0%9F%98%80`],
    [{ q: `${ys(119)}${EMOJI}`, topic: "sports" }, `/?cat=sports&q=${ys(119)}`],
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

  // ══ §2 · THE TWO DOORS (S7 WP9) ══
  // AppShell's DOCUMENT door: a real 307, because the root layout answers before the root loading file streams its 200.
  const shell = flat(w.shell);
  const branches = ifsHolding(shell, '"/markets"');
  const branch = branches.length === 1 ? parseIf(branches[0]) : null;
  const terms = branch?.terms ?? [];
  const seen = j({ statements: branches.length, terms });
  ok("2.shell.path · AppShell holds ONE branch for the board, and it answers the board's own address exactly (/markets, never a prefix: a question page is never redirected)",
    branches.length === 1 && terms.includes(T_PATH), seen);
  ok("2.shell.document · …for a DOCUMENT only (x-kp-document): a root-layout redirect on a flight blanks the page and it stays blank (E-381); a flight meets the page's own door",
    terms.includes(T_DOC), seen);
  ok("2.shell.journey · …for a request the journey is shown to only (this request's journeyRead): a classic request's /markets stays today's board",
    terms.includes(T_JOURNEY), seen);
  ok("2.shell.terms · …and on nothing else: no path rule of its own beside those three terms (safe-next.ts stays the one same-origin rule, A11 item 5)",
    terms.length > 0 && terms.every((t) => t === T_PATH || t === T_DOC || t === T_JOURNEY), seen);
  ok("2.shell.target · its redirect goes through the one function, fed the request's path and query (x-href), typed as typedRoutes asks — the shell's only call of it",
    branch !== null && branch.body === `redirect(${TARGET}(h.get("x-href") ?? pathname) as never);` && count(shell, `${TARGET}(`) === 1,
    j({ body: branch?.body ?? null, calls: count(shell, `${TARGET}(`) }));
  const at = branches.length === 1 ? shell.indexOf(branches[0]) : -1;
  const marks = {
    admin: shell.indexOf('if (pathname.startsWith("/admin"))'),
    optOut: shell.indexOf("if (isOptOutPath(pathname))"),
    e381: shell.indexOf('if (h.get("x-kp-document") === "1") redirect(href as never);'),
    render: shell.indexOf('return ( <div className="min-h-screen'),
  };
  ok("2.shell.order · it stands after the /admin return, the opt-out return and E-381's document redirect (the console is never previewed, the opt-out page never moves, an ended session hears so first), and before the render",
    at > 0 && Object.values(marks).every((m) => m > 0) && at > marks.admin && at > marks.optOut && at > marks.e381 && at < marks.render,
    j({ at, ...marks }));
  ok("2.shell.anchors · S6's two anchors stand verbatim, once each: `const h = await headers();` and `const journeyRead = resolveSimpleJourney();`",
    count(shell, "const h = await headers();") === 1 && count(shell, "const journeyRead = resolveSimpleJourney();") === 1);
  // The WP9 review: the branch is AppShell's own statement, in no block — inside `if (session)` it would answer only a
  // signed-in reader, and a guest holding a preview pass would get the board. Braces are counted from the body's start.
  const shellBody = bodyAfter(shell, "export async function AppShell(");
  const bodyAt = branches.length === 1 ? shellBody.indexOf(branches[0]) : -1;
  const before = bodyAt < 0 ? "" : shellBody.slice(0, bodyAt);
  const depth = count(before, "{") - count(before, "}");
  ok("2.shell.top · the branch stands at AppShell's own top level, in no block of its own (never inside `if (session)` or any other condition): every journey document load meets it, signed in or out",
    bodyAt > 0 && depth === 0, j({ bodyAt, depth }));

  // The board page's FLIGHT door: a soft hop or a refresh, which the router follows.
  const page = flat(w.page);
  const body = bodyAfter(page, "export default async function MarketsPage(");
  const [first, second] = statements(body, 2);
  ok("2.page.ask · the board page's FIRST statement asks the one resolver, so nothing is read before it: not the words, the board, the session or the search",
    first === "const { journey } = await resolveSimpleJourney();", j(first ?? null));
  ok("2.page.branch · its SECOND statement redirects a journey request, and only a journey request, before the page reads anything",
    typeof second === "string" && second.startsWith("if (journey) redirect(") && second.endsWith(");"), j(second ?? null));
  ok("2.page.target · that redirect goes through the one function, fed the page's own search, typed as typedRoutes asks — the page's only call of it",
    count(page, `redirect(${TARGET}(await searchParams) as never)`) === 1 && count(page, `${TARGET}(`) === 1, j({ calls: count(page, `${TARGET}(`) }));
  const meta = page.slice(Math.max(0, page.indexOf("export async function generateMetadata")), page.indexOf("export const dynamic"));
  ok("2.page.c · CONTROL · the page does read its words and its board (2.page.ask is not vacuous), and its title is still read apart, in a generateMetadata that redirects nothing",
    body.includes("getServerT(") && body.includes("getBoard(") && meta.includes("getServerT(") && !meta.includes("redirect("));

  // ONE TARGET: the two doors and the table, and nothing else, over every file under src/.
  const files: Record<string, string> = { ...w.namers, [SHELL]: w.shell, [PAGE]: w.page };
  const flats = Object.entries(files).map(([p, s]) => [p, flat(s)] as const);
  const defines = flats.filter(([, c]) => DECLARES.some((d) => c.includes(d))).map(([p]) => p).sort();
  const callers = flats.filter(([p, c]) => p !== MODULE && c.includes(`${TARGET}(`)).map(([p]) => p).sort();
  const imports = [SHELL, PAGE].map((p) => count(flat(files[p] ?? ""), TARGET_IMPORT));
  log(`     the census walked ${w.walked} files under src/; ${Object.keys(w.namers).length} name ${TARGET}: ${Object.keys(w.namers).sort().join(" · ")}`);
  ok(`2.callers · ONE target: nothing but the two doors calls ${TARGET}, nothing but its module declares it, and each door imports it from there (${w.walked} src files walked)`,
    w.walked >= 500 && j(defines) === j([MODULE]) && callers.every((p) => p === SHELL || p === PAGE) && imports.every((n) => n === 1),
    j({ defines, callers, imports }));

  // The edge, and the record.
  const proxy = flat(w.proxy);
  const named = PROXY_NEVER.filter((n) => proxy.includes(n));
  ok("2.proxy · the edge names neither the preview pass nor the redirect: it may not read the pass (10.no.grant), which is why the 307 is the shell's",
    proxy.includes("export async function proxy(") && named.length === 0, j(named));
  // The WP9 review: both doors trust two request headers, so the edge must SET them from what it measured — the path and
  // query it parsed, and the browser's own Sec-Fetch-Mode — over the copy of the client's headers it starts from, never
  // forward a value a client sent (a forged x-kp-document would turn a flight into a root-layout redirect: a blank page).
  const squeezed = proxy.split(" ").join("");
  const at4 = (needle: string) => squeezed.indexOf(needle);
  const COPY = "constrequestHeaders=newHeaders(req.headers);";
  const SET_HREF = 'requestHeaders.set("x-href",pathname+search);';
  const SET_DOC = 'requestHeaders.set("x-kp-document",req.headers.get("sec-fetch-mode")==="navigate"&&!req.headers.has("next-action")?"1":"0"';
  const PASS_ON = "NextResponse.next({request:{headers:requestHeaders}})";
  const clientReads = ["x-href", "x-kp-document"].flatMap((n) => ["get", "has", "append", "delete"].map((m) => `.${m}("${n}"`)).filter((r) => squeezed.includes(r));
  const order = [at4(COPY), at4(SET_HREF), at4(SET_DOC), at4(PASS_ON)];
  ok("2.proxy.headers · the edge SETS x-href (the path and query it parsed) and x-kp-document (from the browser's Sec-Fetch-Mode) over its copy of the client's headers, before passing them on — each named once, never read from or appended to what a client sent",
    squeezed.includes('const{pathname,search}=req.nextUrl;') && order.every((n) => n >= 0) && order[0] < order[1] && order[0] < order[2] && order[1] < order[3] && order[2] < order[3]
      && count(squeezed, '"x-href"') === 1 && count(squeezed, '"x-kp-document"') === 1 && clientReads.length === 0,
    j({ order, clientReads, href: count(squeezed, '"x-href"'), doc: count(squeezed, '"x-kp-document"') }));
  const rows = w.shelved.split(LF).filter((l) => l.startsWith("| The board (`/markets`)"));
  const cells = rows.length === 1 ? rows[0].split("|").slice(1, -1).map((c) => c.trim()) : [];
  ok("2.shelved · SHELVED.md carries the board's row in its six columns (A18): unmounted for a journey request, '§3.2: /markets answers 307', its date, how to re-mount it (the shell's branch and the page's redirect) and this suite",
    rows.length === 1 && cells.length === 6 && cells[1].includes("`src/app/markets/page.tsx`") && cells[1].includes("unmounted")
      && cells[2] === "§3.2: /markets answers 307" && /^20[0-9][0-9]-[0-9][0-9]-[0-9][0-9]$/.test(cells[3])
      && cells[4].includes("`src/components/layout/app-shell.tsx`") && cells[4].includes("`src/app/markets/page.tsx`")
      && cells[5].includes("`npm run test:markets-redirect`"),
    j({ rows: rows.length, cells }));
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
  /** §2's plants edit a copy of a door's text; an anchor that does not occur exactly once breaks the plant, never hides it. */
  const swap = (s: string, from: string, to: string): string => {
    if (s.split(from).length !== 2) throw new Error(`the plant's anchor does not resolve exactly once: ${from.slice(0, 90)}`);
    return s.split(from).join(to);
  };
  const onShell = (f: (s: string) => string) => (w: World): World => ({ ...w, shell: f(w.shell) });
  const onPage = (f: (s: string) => string) => (w: World): World => ({ ...w, page: f(w.page) });
  /** The shell's branch and the page's redirect, as written: the lines §2's moving plants lift and put back elsewhere. */
  const BRANCH = `  if (${T_PATH} && ${T_DOC} && ${T_JOURNEY}) redirect(${TARGET}(h.get("x-href") ?? pathname) as never);`;
  const PAGE_REDIRECT = `  if (journey) redirect(${TARGET}(await searchParams) as never);`;
  const PAGE_READS = `  const { t } = await getServerT();${LF}  const board = await getBoard();${LF}`;
  const PLANTS: Plant[] = [
    { name: "a dropped key leaks: the board's sort and page ride along to the home", fails: ["1.dropped"],
      plant: (w) => wrap(w, (input, real) => {
        const p = paramsOf(input);
        const extra = ["sort", "page"].flatMap((k) => { const v = p.get(k); return v === null ? [] : [`${k}=${encodeURIComponent(v)}`]; });
        return extra.length === 0 ? real : `${real}${real.includes("?") ? "&" : "?"}${extra.join("&")}`;
      }) },
    { name: "status=watch ignored: the reader's watch lens lands on the home (the greeting's and the cut search's watch rows with it)", fails: ["1.watch", "1.welcome", "1.whole"],
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
    { name: "the search clamped without its guard (the WP9 review): an emoji the cap cuts in two leaves half a character, writing the address throws a URIError, and a journey reader's /markets answers an error page", fails: ["1.whole", "1.same-origin"],
      plant: (w) => wrap(w, (input, real) => {
        const q = clampText(paramsOf(input).get("q") ?? undefined, MAX_QUERY_LEN);
        if (q !== "") encodeURIComponent(q);
        return real;
      }) },
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
    // §2 · the two doors (S7 WP9)
    { name: "the shell's document guard dropped: a soft hop's or a refresh's flight redirects in the root layout, which blanks the page (E-381)", fails: ["2.shell.document"],
      plant: onShell((s) => swap(s, `${T_PATH} && ${T_DOC} && `, `${T_PATH} && `)) },
    { name: "the shell's branch fires for a classic request (its journey term dropped): every player's /markets leaves the board", fails: ["2.shell.journey"],
      plant: onShell((s) => swap(s, ` && ${T_JOURNEY})`, ")")) },
    { name: "the shell's branch takes the board's address as a prefix: a question page (/markets/<id>) is sent home", fails: ["2.shell.path", "2.shell.terms"],
      plant: onShell((s) => swap(s, `if (${T_PATH} && `, 'if (pathname.startsWith("/markets") && ')) },
    { name: "the shell keeps a path rule of its own beside the three terms (a second same-origin rule, free to drift from safe-next.ts)", fails: ["2.shell.terms"],
      plant: onShell((s) => swap(s, ` && ${T_JOURNEY})`, ` && ${T_JOURNEY} && isSafePath(h.get("x-href") ?? ""))`)) },
    { name: "a second target function in the shell (an address made by hand beside WP3's table)", fails: ["2.shell.target"],
      plant: onShell((s) => swap(s, `redirect(${TARGET}(h.get("x-href") ?? pathname) as never);`, 'redirect(boardTarget(h.get("x-href") ?? pathname) as never);')
        + `${LF}function boardTarget(href: string) { return href.includes("topic=") ? "/?cat=" + href.split("topic=")[1] : "/"; }${LF}`) },
    { name: "the shell's branch moved above the opt-out return (a reader stopping marketing could be sent away from /s)", fails: ["2.shell.order"],
      plant: onShell((s) => swap(swap(s, `${BRANCH}${LF}`, ""), "  if (isOptOutPath(pathname)) {", `${BRANCH}${LF}  if (isOptOutPath(pathname)) {`)) },
    { name: "S6's anchor re-spelt: the resolver's read wrapped where S6's plants and censuses find it", fails: ["2.shell.anchors"],
      plant: onShell((s) => swap(s, "const journeyRead = resolveSimpleJourney();", "const journeyRead = resolveSimpleJourney().catch(() => NOTHING);")) },
    { name: "the page redirecting after its reads (the words asked and the board read for a request that leaves)", fails: ["2.page.branch"],
      plant: onPage((s) => swap(swap(s, `${PAGE_REDIRECT}${LF}`, ""), PAGE_READS, `${PAGE_READS}${PAGE_REDIRECT}${LF}`)) },
    { name: "the page redirects a classic request (its journey term inverted)", fails: ["2.page.branch"],
      plant: onPage((s) => swap(s, "if (journey) redirect(", "if (!journey) redirect(")) },
    { name: "a second target function on the page", fails: ["2.page.target"],
      plant: onPage((s) => swap(s, `redirect(${TARGET}(await searchParams) as never)`, "redirect(boardTarget(await searchParams) as never)")
        + `${LF}function boardTarget(sp: unknown) { return sp ? "/" : "/watchlist"; }${LF}`) },
    { name: "a third door calls the target (a question page sending its readers home)", fails: ["2.callers"],
      plant: (w) => ({ ...w, namers: { ...w.namers, "src/app/markets/[id]/page.tsx": `export default async function P({ searchParams }) { redirect(${TARGET}(await searchParams) as never); }${LF}` } }) },
    { name: "a second home for the target (a copy in another module, free to drift from WP3's table)", fails: ["2.callers"],
      plant: (w) => ({ ...w, namers: { ...w.namers, "src/lib/journey/home-list.ts": `export function ${TARGET}(search: string) { return search ? "/" : "/watchlist"; }${LF}` } }) },
    { name: "the edge reads the preview pass (to redirect /markets there)", fails: ["2.proxy"],
      plant: (w) => ({ ...w, proxy: `${w.proxy}${LF}const pass = req.cookies.get("kp_preview");${LF}` }) },
    { name: "the board's SHELVED row is gone (shelved with no record of how to bring it back)", fails: ["2.shelved"],
      plant: (w) => ({ ...w, shelved: w.shelved.split(LF).filter((l) => !l.startsWith("| The board (`/markets`)")).join(LF) }) },
    // The WP9 review's hardening
    { name: "the shell's branch nested inside `if (session)` (a guest holding a preview pass is served the board)", fails: ["2.shell.top"],
      plant: onShell((s) => swap(s, `${BRANCH}${LF}`, `  if (session) {${LF}  ${BRANCH}${LF}  }${LF}`)) },
    { name: "the edge forwards the client's own x-kp-document (a forged 1 turns a flight into a root-layout redirect: a blank page)", fails: ["2.proxy.headers"],
      plant: (w) => ({ ...w, proxy: swap(w.proxy, '    req.headers.get("sec-fetch-mode") === "navigate" && !req.headers.has("next-action") ? "1" : "0",',
        '    req.headers.get("x-kp-document") ?? "0",') }) },
    { name: "the edge stops setting x-href (a client's own x-href rides through the copied headers into the redirect's target)", fails: ["2.proxy.headers"],
      plant: (w) => ({ ...w, proxy: swap(w.proxy, `  requestHeaders.set("x-href", pathname + search);${LF}`, "") }) },
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
