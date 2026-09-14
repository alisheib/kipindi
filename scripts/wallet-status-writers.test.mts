/**
 * WHO MAY WRITE A WALLET'S STATUS — A CENSUS OF EVERY WRITER, NOT A SENTENCE IN A HEADER.
 *
 *   npm run test:wallet-status-writers        (in predeploy — pure source, no store, no server)
 *
 * 🔴 WHY (audit session 95, 2026-09-14). `wallet-freeze.ts` opens by calling itself "the only writer of
 * Wallet.status = FROZEN and of Wallet.freezeReasons". Nothing checked that. It is load-bearing for the whole
 * identity-at-withdrawal ruling: a FINAL refusal holds the wallet under IDENTITY_REFUSED, an officer under OFFICER,
 * self-exclusion under its own reason, and every lifter removes only its own. ONE stray
 * `db.wallet.update(id, { status: "ACTIVE" })` anywhere in src/ lifts all of them at once — money out of a refused,
 * excluded or officer-held account — and passes every suite that drives the freeze through its own functions.
 *
 * THE POPULATION — every site in src/ (.ts and .tsx, comments removed by the SHARED stripper) that writes a wallet row:
 *   · `.wallet.update / create / upsert / updateMany / createMany (` on any client (`db`, `tx`, `pc()`, `prisma`);
 *   · the in-memory store's `wallets.set(`;
 *   · raw SQL that updates or inserts into "Wallet" (quoted, escaped inside a string, or schema-prefixed);
 *   · any OTHER `.wallet.<method>(` than the known reads, the patch writes and `adjust` — an unknown method is a writer;
 *   · a wallet delegate held under another name (`const w = db.wallet`, `const { wallet } = tx`, `db["wallet"]`).
 * And the DAL surface itself: `db.wallet`'s members in both stores are pinned (§2.9), and `adjust` may move amounts only.
 * Each site's patch is READ: an object literal directly; an identifier through its object-literal declaration in the
 * same file (and any later `name.status = …` on it); the Prisma `{ where, data }` shape through `data`. A patch that
 * cannot be read — a parameter, a spread, a call — is OPAQUE and counts as a writer.
 *
 * THE ALLOW-LIST — nothing else may write `status` or `freezeReasons`:
 *   · wallet-freeze.ts · applyFreeze — the reason-set writer every hold and every lift goes through;
 *   · user-service.ts · closeAccount — status "CLOSED" only (closure is terminal and ignores freezes);
 *   · auth-service.ts · the two registration paths — the wallet CREATED with status "ACTIVE" and no reasons;
 *   · store.ts and prisma-dal.ts — the TRANSPORT under `db.wallet.*`: they pass the caller's patch through and may
 *     not assign a status of their own;
 *   · fixtures under src/app/api/dev-test and src/app/auth/demo — only when this file PROVES them dev-only: every
 *     exported handler refuses in production with a 404 before its first await (directly or through one delegated
 *     function), and for dev-test the edge proxy 404s the whole prefix in production as well.
 *
 * ⛔ IT CANNOT PASS VACUOUSLY: the site count is pinned exactly, each production writer is pinned to its exact number of
 * sites, the population is printed, and §3 plants the defect in every shape the reader claims to see.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { decomment } from "./lib/decomment.mts";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, extra = ""): boolean => {
  if (cond) pass++; else fail++;
  console.log(`${cond ? "PASS" : "FAIL"} ${label}${extra ? ` — ${extra}` : ""}`);
  return cond;
};
const section = (s: string) => console.log(`\n${s}`);

// ═══ §0 · THE READER ════════════════════════════════════════════════════════════════════════════════════════════

/** End of the string/template literal opened at `i`, or -1. Same contract as scripts/lib/decomment.mts: an
 *  unmatched quote on its line is prose or a regex, not a literal. */
function endLiteral(s: string, i: number): number {
  const q = s[i];
  if (q === "`") {
    let depth = 0;
    for (let j = i + 1; j < s.length; j++) {
      const c = s[j];
      if (c === "\\") { j++; continue; }
      if (c === "$" && s[j + 1] === "{") { depth++; j++; continue; }
      if (c === "}" && depth > 0) { depth--; continue; }
      if (c === "`" && depth === 0) return j;
    }
    return -1;
  }
  for (let j = i + 1; j < s.length; j++) {
    const c = s[j];
    if (c === "\\") { j++; continue; }
    if (c === "\n") return -1;
    if (c === q) return j;
  }
  return -1;
}

const CLOSER: Record<string, string> = { "(": ")", "{": "}", "[": "]" };
/** Index of the bracket closing the one at `open`, literals skipped; -1 when unbalanced. */
function closeOf(s: string, open: number): number {
  if (!CLOSER[s[open]]) return -1;
  const stack: string[] = [];
  for (let i = open; i < s.length; i++) {
    const c = s[i];
    if (c === '"' || c === "'" || c === "`") { const j = endLiteral(s, i); if (j >= 0) i = j; continue; }
    if (CLOSER[c]) stack.push(CLOSER[c]);
    else if (c === ")" || c === "}" || c === "]") {
      if (stack.pop() !== c) return -1;
      if (stack.length === 0) return i;
    }
  }
  return -1;
}

/** Top-level comma split of an argument list. */
function splitTop(s: string): string[] {
  const out: string[] = [];
  let depth = 0, start = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '"' || c === "'" || c === "`") { const j = endLiteral(s, i); if (j >= 0) i = j; continue; }
    if (c === "(" || c === "{" || c === "[") depth++;
    else if (c === ")" || c === "}" || c === "]") depth--;
    else if (c === "," && depth === 0) { out.push(s.slice(start, i)); start = i + 1; }
  }
  out.push(s.slice(start));
  return out.map((x) => x.trim()).filter(Boolean);
}

/** Top-level declarations: this codebase starts each one at column 0, so a line that opens with a letter opens one. */
type Chunk = { name: string | null; start: number; end: number };
function chunksOf(d: string): Chunk[] {
  const starts = [0];
  for (const m of d.matchAll(/\n(?=[A-Za-z_$@])/g)) starts.push((m.index ?? 0) + 1);
  return starts.map((s, i) => {
    const end = i + 1 < starts.length ? starts[i + 1] : d.length;
    const head = d.slice(s, Math.min(end, s + 400));
    const m = head.match(/^(?:export\s+)?(?:default\s+)?(?:async\s+)?function\s*\*?\s*([\w$]+)/)
      ?? head.match(/^(?:export\s+)?(?:const|let|var)\s+([\w$]+)/);
    return { name: m ? m[1] : null, start: s, end };
  });
}
const chunkAt = (chunks: Chunk[], i: number) => chunks.find((c) => i >= c.start && i < c.end) ?? null;
const lineAt = (d: string, i: number) => d.slice(0, i).split("\n").length;
const esc = (name: string) => name.replace(/\$/g, "\\$");

/** The object literal an identifier was declared with, before `at` — or null (opaque). The declaration must be in
 *  the SAME top-level declaration as the write, or be a module-level `const <name> =` of its own: a same-named
 *  literal in another function is not this identifier. A parameter of that name — in the enclosing signature, or in
 *  an inner arrow or function between the declaration and the write — shadows it, and the patch is opaque. */
function resolveIdent(d: string, name: string, at: number): { literal: string; declAt: number } | null {
  const chunks = chunksOf(d);
  const here = chunkAt(chunks, at);
  const n = esc(name);
  const re = new RegExp(`\\b(?:const|let|var)\\s+${n}\\b(?:\\s*:[^=;]*)?\\s*=\\s*`, "g");
  let last: RegExpMatchArray | null = null;
  let fromModule = false;
  for (const m of d.matchAll(re)) {
    const i = m.index ?? 0;
    if (i >= at) continue;
    const owner = chunkAt(chunks, i);
    if (!owner) continue;
    const sameChunk = !!here && owner.start === here.start;
    const moduleConst = owner.name === name && /^(?:export\s+)?$/.test(d.slice(owner.start, i));
    if (sameChunk || moduleConst) { last = m; fromModule = !sameChunk; }
  }
  if (!last) return null;
  const isParam = (params: string) => new RegExp(`(?:^|[,(])\\s*(?:\\.\\.\\.)?${n}\\s*[?]?\\s*(?:[:,=)]|$)`).test(params);
  if (fromModule && here) {
    const head = d.slice(here.start, Math.min(here.end, here.start + 600));
    const sig = head.match(/^[^{=]*?(?:\bfunction\s*\*?\s*[\w$]*\s*|=\s*(?:async\s*)?)\(/);
    if (sig) {
      const po = here.start + sig[0].length - 1;
      const pc = closeOf(d, po);
      if (pc > po && isParam(d.slice(po + 1, pc))) return null;
    }
  }
  const between = d.slice((last.index ?? 0) + last[0].length, at);
  for (const m of between.matchAll(/\(([^()]*)\)\s*(?::[^=;{()]*)?=>|\bfunction\s*\*?\s*[\w$]*\s*\(([^()]*)\)/g)) {
    if (isParam(m[1] ?? m[2] ?? "")) return null;
  }
  if (new RegExp(`(?<![\\w$.])${n}\\s*=>`).test(between)) return null;
  const open = (last.index ?? 0) + last[0].length;
  if (d[open] !== "{") return null;
  const close = closeOf(d, open);
  return close < 0 ? null : { literal: d.slice(open, close + 1), declAt: last.index ?? 0 };
}

/** The text of the patch a write carries, and whether it could be read at all. */
function readArg(d: string, arg: string | undefined, at: number, hops = 0): { text: string; opaque: boolean } {
  if (!arg || hops > 2) return { text: arg ?? "", opaque: true };
  const bare = arg.replace(/\s+(?:as|satisfies)\s+[\w$.<>[\]|, ]+$/, "").trim();
  let text = bare;
  let opaque = false;
  if (/^[A-Za-z_$][\w$]*$/.test(bare)) {
    const r = resolveIdent(d, bare, at);
    if (!r) return { text: bare, opaque: true };
    text = r.literal;
    // Written onto the object after its declaration and before the write.
    const between = d.slice(r.declAt, at);
    for (const key of ["status", "freezeReasons"]) {
      if (new RegExp(`\\b${esc(bare)}\\s*(?:\\.\\s*${key}|\\[\\s*["'\`]${key}["'\`]\\s*\\])\\s*=(?!=)`).test(between)) text += `, ${key}: __assigned__`;
    }
    if (new RegExp(`Object\\.assign\\(\\s*${esc(bare)}\\b|\\b${esc(bare)}\\s*\\[[^\\]]+\\]\\s*=(?!=)`).test(between)) opaque = true;
  } else if (!bare.startsWith("{")) {
    return { text: bare, opaque: true };
  }
  // The Prisma shape — `{ where, data: X }` or `{ where, data }` — reads X the same way.
  const data = text.match(/(?:^|[{,])\s*data\s*(?::\s*([A-Za-z_$][\w$]*)\s*)?(?=[,}])/);
  if (data) {
    const r = readArg(d, data[1] ?? "data", at, hops + 1);
    text += ` ${r.text}`;
    opaque ||= r.opaque;
  }
  if (/\.\.\.\s*[\w$(]/.test(text)) opaque = true;
  return { text, opaque };
}

type Site = {
  path: string; line: number; fn: string | null; via: string; method: string;
  writesStatus: boolean; writesReasons: boolean; reasonsEmptyOnly: boolean; reasonsLiteral: boolean; statuses: string[]; opaque: boolean;
};

const WRITE = /\.\s*wallet\s*\.\s*(update|create|upsert|updateMany|createMany)\s*\(/g;
const STORE_SET = /\bwallets\s*\.\s*set\s*\(/g;
/** The table, quoted or not, with escaped quotes (a string literal) and an optional schema prefix. */
const WALLET_TABLE = String.raw`(?:\\?"?public\\?"?\s*\.\s*)?\\?"?Wallet\\?"?`;
const RAW_SQL = new RegExp(String.raw`\b(?:UPDATE\s+${WALLET_TABLE}\s+SET|(?:INSERT|MERGE)\s+INTO\s+${WALLET_TABLE})(?![\w"])`, "gi");
/** Every other `.wallet.<m>(` — a DAL method the census does not know is a writer until it is proven otherwise. */
const ANY_WALLET_CALL = /\.\s*wallet\s*\.\s*([A-Za-z_$][\w$]*)\s*\(/g;
const WALLET_READS = new Set(["findByUserId", "listAll", "findUnique", "findFirst", "findMany", "count", "aggregate", "groupBy"]);
const WALLET_PATCH_WRITES = new Set(["update", "create", "upsert", "updateMany", "createMany"]);
/** `adjust` moves balance / hold / pending by deltas; §2.10 pins that neither store's `adjust` writes status or reasons. */
const WALLET_DELTAS = new Set(["adjust"]);
/** The members of `db.wallet` in both stores, pinned by §2.9: a new member (`setStatus`) is a door around this census. */
const DAL_MEMBERS = ["adjust", "create", "findByUserId", "listAll", "update"];
const ASSIGNS_STATE = /(?:^|[{,])\s*(?:status|freezeReasons)\s*[:,}]|\.\s*(?:status|freezeReasons)\s*=(?!=)/;
/** A client's wallet delegate held under another name — `const w = db.wallet`, `const { wallet } = tx`, `db["wallet"]` —
 *  whose later `w.update(…)` no `.wallet.<m>(` pattern can see. None exists in src/ today (2026-09-14). */
const ALIASED_CLIENT = /\b(?:db|tx|prisma|client)\s*\.\s*wallet\b(?!\s*\.\s*[A-Za-z_$])|\bpc\(\)\s*\.\s*wallet\b(?!\s*\.\s*[A-Za-z_$])|\{[^{}]*\bwallet\b[^{}]*\}\s*=\s*(?:db|tx|prisma|client|pc\(\))(?![\w$])|\[\s*["'`]wallet["'`]\s*\]/g;

/** The members of a store's `wallet: { … }` object (the key at two spaces, its members at four). */
function walletMembersOf(raw: string): { names: string[]; bodies: Map<string, string> } | null {
  const d = decomment(raw);
  const at = d.search(/\n {2}wallet\s*:\s*\{/);
  if (at < 0) return null;
  const open = d.indexOf("{", at);
  const close = closeOf(d, open);
  if (close < 0) return null;
  const obj = d.slice(open + 1, close);
  const heads = [...obj.matchAll(/\n {4}([A-Za-z_$][\w$]*)\s*:/g)];
  const bodies = new Map<string, string>();
  heads.forEach((h, k) => bodies.set(h[1], obj.slice(h.index ?? 0, k + 1 < heads.length ? heads[k + 1].index : obj.length)));
  return { names: heads.map((h) => h[1]).sort(), bodies };
}

function sitesOf(path: string, raw: string): Site[] {
  const d = decomment(raw);
  const chunks = chunksOf(d);
  const out: Site[] = [];
  const add = (i: number, via: string, method: string, patch: { text: string; opaque: boolean }) => {
    const keys = new Set([...patch.text.matchAll(/(?:^|[{,])\s*(status|freezeReasons)\s*(?=[:,}])/g)].map((m) => m[1]));
    const statuses = [...patch.text.matchAll(/(?:^|[{,])\s*status\s*:\s*([^,}\n]+)/g)].map((m) => {
      const lit = m[1].trim().match(/^["'`]([A-Za-z_]+)["'`]/);
      return lit ? lit[1] : "<computed>";
    });
    if (keys.has("status") && statuses.length === 0) statuses.push("<computed>"); // shorthand `{ status }`
    const reasonValues = [...patch.text.matchAll(/(?:^|[{,])\s*freezeReasons\s*(?::\s*([^,}\n]+))?(?=[,}\n])/g)].map((m) => (m[1] ?? "").trim());
    out.push({
      path, line: lineAt(d, i), fn: chunkAt(chunks, i)?.name ?? null, via, method,
      writesStatus: keys.has("status"), writesReasons: keys.has("freezeReasons"),
      reasonsEmptyOnly: reasonValues.length > 0 && reasonValues.every((v) => /^\[\s*\]$/.test(v)),
      reasonsLiteral: reasonValues.some((v) => v.startsWith("[")),
      statuses, opaque: patch.opaque,
    });
  };
  for (const m of d.matchAll(WRITE)) {
    const i = m.index ?? 0;
    const open = i + m[0].length - 1;
    const close = closeOf(d, open);
    if (close < 0) { add(i, `.wallet.${m[1]}(`, m[1], { text: "", opaque: true }); continue; }
    const args = splitTop(d.slice(open + 1, close));
    const patchArg = m[1].startsWith("create") ? args[0] : args.length >= 2 ? args[args.length - 1] : args[0];
    add(i, `.wallet.${m[1]}(`, m[1], readArg(d, patchArg, i));
  }
  for (const m of d.matchAll(STORE_SET)) {
    const i = m.index ?? 0;
    const open = i + m[0].length - 1;
    const close = closeOf(d, open);
    const args = close < 0 ? [] : splitTop(d.slice(open + 1, close));
    add(i, "wallets.set(", "set", readArg(d, args[1], i));
  }
  for (const m of d.matchAll(RAW_SQL)) add(m.index ?? 0, "raw SQL", "sql", { text: m[0], opaque: true });
  for (const m of d.matchAll(ANY_WALLET_CALL)) {
    if (WALLET_READS.has(m[1]) || WALLET_PATCH_WRITES.has(m[1]) || WALLET_DELTAS.has(m[1])) continue;
    add(m.index ?? 0, `.wallet.${m[1]}(`, m[1], { text: "", opaque: true });
  }
  for (const m of d.matchAll(ALIASED_CLIENT)) add(m.index ?? 0, "aliased wallet client", "alias", { text: "", opaque: true });
  return out;
}

// ── dev-only proof for a fixture file ───────────────────────────────────────────────────────────────────────────
// The WHOLE condition: `if (process.env.NODE_ENV === "production" && process.env.X !== "1")` can be switched off.
const REFUSAL = /if\s*\(\s*process\.env\.NODE_ENV\s*===?\s*["'`]production["'`]\s*\)/;
/** The refusal comes before the first await of this body, and its branch answers 404. */
function refusesFirst(body: string): boolean {
  const m = body.match(REFUSAL);
  if (!m) return false;
  const at = m.index ?? 0;
  const firstAwait = body.search(/\bawait\b/);
  if (firstAwait !== -1 && firstAwait < at) return false;
  return /\b404\b/.test(body.slice(at, at + 260));
}
const PROXY_BLOCK = /if\s*\(\s*pathname\.startsWith\(\s*["'`]\/api\/dev-test["'`]\s*\)\s*&&\s*process\.env\.NODE_ENV\s*===\s*["'`]production["'`]\s*\)/;
const HTTP = "GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS";
function devOnly(path: string, raw: string, proxyRaw: string): { ok: boolean; why: string } {
  const d = decomment(raw);
  const chunks = chunksOf(d);
  const handlers = [...d.matchAll(new RegExp(`export\\s+(?:async\\s+)?function\\s+(${HTTP})\\s*\\(`, "g"))];
  // A handler exported in any other shape is one this proof cannot read — never assumed to refuse.
  const unreadable = d.match(new RegExp(`export\\s+(?:const|let|var)\\s+(?:${HTTP})\\b|export\\s*\\{[^}]*\\b(?:${HTTP})\\b[^}]*\\}`));
  if (unreadable) return { ok: false, why: `\`${unreadable[0].slice(0, 60)}\` exports a handler in a shape this proof cannot read` };
  if (handlers.length === 0) return { ok: false, why: "no exported HTTP handler — the file cannot be proven dev-only" };
  for (const h of handlers) {
    const c = chunkAt(chunks, h.index ?? 0);
    const body = d.slice(h.index ?? 0, c ? c.end : d.length);
    if (refusesFirst(body)) continue;
    const del = body.match(/\breturn\s+(?:await\s+)?([A-Za-z_$][\w$]*)\s*\(/);
    const target = del ? chunks.find((k) => k.name === del[1]) : undefined;
    if (target && refusesFirst(d.slice(target.start, target.end))) continue;
    return { ok: false, why: `${h[1]} does not refuse in production with a 404 before its first await` };
  }
  if (path.startsWith("src/app/api/dev-test/") && !PROXY_BLOCK.test(decomment(proxyRaw))) {
    return { ok: false, why: "src/proxy.ts no longer 404s /api/dev-test in production" };
  }
  return { ok: true, why: "" };
}

// ── the allow-list ──────────────────────────────────────────────────────────────────────────────────────────────
type Bucket = "not a status writer" | "transport" | "freeze" | "close" | "registration" | "fixture" | "VIOLATION";
const TRANSPORT = new Set(["src/lib/server/store.ts", "src/lib/server/prisma-dal.ts"]);
const REGISTRATION_FNS = new Set(["verifyOtpAndAuth", "registerWithPassword"]);
const FIXTURE_ROOTS = ["src/app/api/dev-test/", "src/app/auth/demo/"];

function judge(s: Site, raw: string, proxyRaw: string): { bucket: Bucket; why: string } {
  const touches = s.writesStatus || s.writesReasons || s.opaque || s.via === "raw SQL";
  if (!touches) return { bucket: "not a status writer", why: "" };
  const bad = (why: string) => ({ bucket: "VIOLATION" as const, why });
  if (s.via === "raw SQL") return bad("raw SQL writes the Wallet table around the DAL and the freeze");
  if (TRANSPORT.has(s.path)) {
    const literal = s.statuses.filter((v) => v !== "<computed>");
    if (literal.length > 0) return bad(`the store assigns status ${literal.join(", ")} of its own`);
    return s.reasonsLiteral ? bad("the store assigns freezeReasons of its own") : { bucket: "transport", why: "" };
  }
  if (s.path === "src/lib/server/wallet-freeze.ts") {
    return s.fn === "applyFreeze" && !s.opaque ? { bucket: "freeze", why: "" } : bad(`wallet-freeze.ts writes the wallet outside applyFreeze (in ${s.fn ?? "top level"})`);
  }
  if (s.path === "src/lib/server/user-service.ts") {
    return s.fn === "closeAccount" && !s.opaque && !s.writesReasons && s.statuses.length === 1 && s.statuses[0] === "CLOSED"
      ? { bucket: "close", why: "" }
      : bad(`user-service.ts may only CLOSE a wallet in closeAccount — this writes ${s.statuses.join(", ") || "an unreadable patch"} in ${s.fn ?? "top level"}`);
  }
  if (s.path === "src/lib/server/auth-service.ts") {
    return s.method === "create" && REGISTRATION_FNS.has(s.fn ?? "") && !s.opaque
      && s.statuses.length === 1 && s.statuses[0] === "ACTIVE" && (!s.writesReasons || s.reasonsEmptyOnly)
      ? { bucket: "registration", why: "" }
      : bad(`auth-service.ts may only CREATE an ACTIVE wallet at registration — this is .${s.method} with ${s.statuses.join(", ") || "an unreadable patch"} in ${s.fn ?? "top level"}`);
  }
  if (FIXTURE_ROOTS.some((r) => s.path.startsWith(r))) {
    const dev = devOnly(s.path, raw, proxyRaw);
    if (!dev.ok) return bad(`fixture not proven dev-only: ${dev.why}`);
    return s.opaque ? bad("fixture patch cannot be read") : { bucket: "fixture", why: "" };
  }
  return bad("not on the allow-list");
}

type Judged = Site & { bucket: Bucket; why: string };
function judgeFile(path: string, raw: string, proxyRaw: string): Judged[] {
  return sitesOf(path, raw).map((s) => ({ ...s, ...judge(s, raw, proxyRaw) }));
}
const where = (s: Site) => `${s.path}:${s.line}${s.fn ? ` (${s.fn})` : ""}`;

// ═══ §1 · THE POPULATION ═══════════════════════════════════════════════════════════════════════════════════════
section("§1 · the population — every wallet write in src/");
const files: string[] = [];
(function walk(dir: string) {
  for (const f of readdirSync(dir).sort()) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.tsx?$/.test(f)) files.push(p);
  }
})(join(ROOT, "src"));
const proxyRaw = readFileSync(join(ROOT, "src/proxy.ts"), "utf8");
const all: Judged[] = [];
for (const abs of files) {
  const rel = relative(ROOT, abs).split("\\").join("/");
  const raw = readFileSync(abs, "utf8");
  if (!/wallet|Wallet/.test(raw)) continue;
  all.push(...judgeFile(rel, raw, proxyRaw));
}
/** Measured 2026-09-14: 946 source files (a floor); 35 wallet write sites — an EXACT pin, because a reader that goes
 *  partly blind on a new call shape would drop real writers silently. Add or remove a wallet write in src/ and change
 *  this number in the same commit, after reading the population it prints. */
const FILE_FLOOR = 800;
// 36 since 2026-09-14 (visual pass 2): `auth/demo/route.ts` ensureDemoWallet empties the balance for `deposit=0`
// — a balance-only write in a dev-only fixture, not a status writer.
const SITE_COUNT = 36;
ok(`1.1 the walk read every .ts/.tsx under src/`, files.length >= FILE_FLOOR, `${files.length} files (floor ${FILE_FLOOR})`);
ok(`1.2 ⛔ RATCHET · the census found exactly the wallet write sites measured`, all.length === SITE_COUNT,
  `${all.length} sites (pinned ${SITE_COUNT} — a changed count is a changed population: read §1's list, then move the pin)`);
const writers = all.filter((s) => s.bucket !== "not a status writer");
console.log(`     ${writers.length} of ${all.length} sites write status or freezeReasons (or could not be read):`);
for (const s of writers) {
  console.log(`       · ${s.bucket.padEnd(12)} ${where(s)} · ${s.via} · status ${s.statuses.join("/") || "—"}${s.writesReasons ? " · freezeReasons" : ""}${s.opaque ? " · opaque" : ""}`);
}
ok("1.3 the other sites were read and write neither field (balance, hold, pending only)",
  all.some((s) => s.bucket === "not a status writer"), `${all.length - writers.length} site(s)`);

// ═══ §2 · THE VERDICT ══════════════════════════════════════════════════════════════════════════════════════════
section("§2 · nothing outside the allow-list writes a wallet's status or reasons");
{
  const violations = all.filter((s) => s.bucket === "VIOLATION");
  for (const v of violations) ok(`2.0 ⛔ ${where(v)} · ${v.via}`, false, v.why);
  ok("2.1 ⛔ no writer of Wallet.status / Wallet.freezeReasons outside the allow-list", violations.length === 0, `${violations.length} violation(s)`);

  const count = (b: Bucket) => all.filter((s) => s.bucket === b).length;
  ok("2.2 ⛔ RATCHET · applyFreeze is ONE site — the reason set has one writer", count("freeze") === 1, `${count("freeze")}`);
  ok("2.3 ⛔ RATCHET · closeAccount is ONE site, and it writes CLOSED", count("close") === 1, `${count("close")}`);
  ok("2.4 ⛔ RATCHET · registration creates the wallet at exactly TWO sites (password and one-time code)", count("registration") === 2, `${count("registration")}`);
  const production = count("freeze") + count("close") + count("registration");
  ok("2.5 ⛔ RATCHET · production status writers total exactly 4", production === 4, `${production}`);
  const transport = all.filter((s) => s.bucket === "transport");
  ok("2.6 both stores are seen as transport (the census reads the layer under db.wallet.*)",
    [...TRANSPORT].every((p) => transport.some((s) => s.path === p)), transport.map(where).join(", "));
  const fixtures = all.filter((s) => s.bucket === "fixture");
  const fixtureFiles = [...new Set(fixtures.map((s) => s.path))];
  ok("2.7 the dev fixtures are in the population, each file proven dev-only", fixtures.length >= 10, `${fixtures.length} site(s) in ${fixtureFiles.length} file(s)`);
  ok("2.8 …and /auth/demo is among them (a route, not under dev-test, with no proxy block of its own)",
    fixtureFiles.some((p) => p.startsWith("src/app/auth/demo/")));
  for (const p of TRANSPORT) {
    const m = walletMembersOf(readFileSync(join(ROOT, p), "utf8"));
    ok(`2.9 ⛔ RATCHET · ${p} · db.wallet has exactly ${DAL_MEMBERS.join(", ")} — no member that sets a status by another name`,
      m !== null && m.names.join(",") === DAL_MEMBERS.join(","), m ? m.names.join(", ") : "no `wallet: {` object found");
    const adjust = m?.bodies.get("adjust") ?? "";
    ok(`2.10 ⛔ ${p} · wallet.adjust moves amounts only — it assigns no status and no freezeReasons`,
      adjust.length > 50 && !ASSIGNS_STATE.test(adjust), `${adjust.length} chars read`);
  }
}

// ═══ §3 · CONTROLS — the defect in every shape the reader claims to see ════════════════════════════════════════
section("§3 · CONTROLS: each planted writer is caught, and the harmless shapes are not");
{
  const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");
  const flagged = (path: string, raw: string, proxy = proxyRaw) => judgeFile(path, raw, proxy).filter((s) => s.bucket === "VIOLATION");
  const fn = (body: string) => `import { db } from "./store";\nexport async function planted(w: { id: string }, tx: any, id: string, patch: object) {\n${body}\n}\n`;

  // The one the brief names: an extra `db.wallet.update(w.id, { status: "ACTIVE" })` in another file.
  const kyc = read("src/lib/server/kyc-service.ts");
  ok("3.1 CONTROL · the real kyc-service.ts has no violation", flagged("src/lib/server/kyc-service.ts", kyc).length === 0);
  ok("3.2 ⭐ CONTROL · …and one `db.wallet.update(w.id, { status: \"ACTIVE\" })` added to it is FLAGGED",
    flagged("src/lib/server/kyc-service.ts", kyc + fn(`  await db.wallet.update(w.id, { status: "ACTIVE" });`)).length === 1);

  const user = read("src/lib/server/user-service.ts");
  ok("3.3 CONTROL · the closeAccount write is present to mutate", user.includes(`{ status: "CLOSED" }`));
  ok("3.4 ⭐ CONTROL · closeAccount writing ACTIVE instead of CLOSED is FLAGGED",
    flagged("src/lib/server/user-service.ts", user.replace(`{ status: "CLOSED" }`, `{ status: "ACTIVE" }`)).length === 1);

  const freeze = read("src/lib/server/wallet-freeze.ts");
  ok("3.5 ⭐ CONTROL · a second writer in wallet-freeze.ts, outside applyFreeze, is FLAGGED",
    flagged("src/lib/server/wallet-freeze.ts", freeze + `\nexport async function thaw(userId: string) {\n  const w = await db.wallet.findByUserId(userId);\n  if (w) await db.wallet.update(w.id, { status: "ACTIVE", freezeReasons: [] });\n}\n`).length === 1);

  const auth = read("src/lib/server/auth-service.ts");
  ok("3.6 CONTROL · the registration create is present to mutate", auth.includes(`currency: "TZS", status: "ACTIVE",`));
  ok("3.7 ⭐ CONTROL · registration creating a FROZEN wallet is FLAGGED",
    flagged("src/lib/server/auth-service.ts", auth.replace(`currency: "TZS", status: "ACTIVE",`, `currency: "TZS", status: "FROZEN",`)).length === 1);

  const P = "src/lib/server/planted.ts";
  ok("3.8 ⭐ CONTROL · the Prisma shape `tx.wallet.update({ where, data: { freezeReasons: [] } })` is FLAGGED",
    flagged(P, fn(`  await tx.wallet.update({ where: { id }, data: { freezeReasons: [] } });`)).length === 1);
  ok("3.9 ⭐ CONTROL · the shorthand `{ status }` is FLAGGED",
    flagged(P, fn(`  const status = "ACTIVE";\n  await db.wallet.update(w.id, { status });`)).length === 1);
  ok("3.10 ⭐ CONTROL · a patch held in a variable is read through its declaration and FLAGGED",
    flagged(P, fn(`  const next = { balance: 0, status: "ACTIVE" as const };\n  await db.wallet.update(w.id, next);`)).length === 1);
  ok("3.11 ⭐ CONTROL · a status assigned onto `data` after its declaration is FLAGGED",
    flagged(P, fn(`  const data: Record<string, unknown> = {};\n  data.status = "ACTIVE";\n  await tx.wallet.updateMany({ where: { id }, data });`)).length === 1);
  ok("3.12 ⭐ CONTROL · an unreadable patch (a parameter) is FLAGGED, not assumed harmless",
    flagged(P, fn(`  await db.wallet.update(id, patch);`)).length === 1);
  ok("3.13 ⭐ CONTROL · a spread into the patch is FLAGGED",
    flagged(P, fn(`  await db.wallet.update(id, { ...patch, balance: 1 });`)).length === 1);
  ok("3.14 ⭐ CONTROL · raw SQL into \"Wallet\" is FLAGGED",
    flagged(P, fn("  await tx.$executeRaw`UPDATE \"Wallet\" SET \"status\" = 'ACTIVE' WHERE \"id\" = ${id}`;")).length === 1);
  const harmless = judgeFile(P, fn(`  await db.wallet.update(w.id, { balance: 5, hold: 0 });`), proxyRaw);
  ok("3.15 CONTROL · a balance-only update is seen and NOT flagged", harmless.length === 1 && harmless[0].bucket === "not a status writer");
  ok("3.16 CONTROL · a write that exists only in a comment is not a site (the shared stripper)",
    sitesOf(P, fn(`  // await db.wallet.update(w.id, { status: "ACTIVE" });\n  /* db.wallet.update(w.id, { status: "ACTIVE" }) */`)).length === 0);

  const F = "src/app/api/dev-test/zz-planted/route.ts";
  const create = `  await db.wallet.create({ id: "w", userId: "u", balance: 0, pending: 0, hold: 0, currency: "TZS", status: "FROZEN", createdAt: "", updatedAt: "" });`;
  const refusal = `  if (process.env.NODE_ENV === "production") {\n    return NextResponse.json({ ok: false }, { status: 404 });\n  }`;
  const route = (body: string) => `import { db } from "@/lib/server/store";\nexport async function POST() {\n${body}\n  return new Response("ok");\n}\n`;
  ok("3.17 CONTROL · a dev-test fixture that refuses first is allowed", flagged(F, route(`${refusal}\n${create}`)).length === 0);
  ok("3.18 ⭐ CONTROL · …the same fixture with NO production refusal is FLAGGED", flagged(F, route(create)).length === 1);
  ok("3.19 ⭐ CONTROL · …and with the refusal AFTER its first await is FLAGGED", flagged(F, route(`${create}\n${refusal}`)).length === 1);
  ok("3.20 ⭐ CONTROL · …and with the proxy's production block gone is FLAGGED", flagged(F, route(`${refusal}\n${create}`), "export function proxy() {}").length === 1);
  ok("3.21 ⭐ CONTROL · a fixture outside the two fixture roots is FLAGGED even when it refuses",
    flagged("src/app/api/qa/route.ts", route(`${refusal}\n${create}`)).length === 1);

  // Review of 2026-09-14 — the doors the first cut left open, each planted.
  ok("3.22 ⭐ CONTROL · raw SQL with escaped quotes in a string literal (`\\\"Wallet\\\"`) is FLAGGED",
    flagged(P, fn(`  await tx.$executeRawUnsafe("UPDATE \\"Wallet\\" SET \\"status\\" = 'ACTIVE' WHERE id = $1", id);`)).length === 1);
  ok("3.23 ⭐ CONTROL · raw SQL naming the schema (`\"public\".\"Wallet\"`) is FLAGGED",
    flagged(P, fn("  await tx.$executeRaw`UPDATE \"public\".\"Wallet\" SET \"freezeReasons\" = '{}' WHERE \"id\" = ${id}`;")).length === 1);
  ok("3.24 ⭐ CONTROL · a caller of a DAL method the census does not know (`db.wallet.setStatus(`) is FLAGGED",
    flagged(P, fn(`  await db.wallet.setStatus(w.id, "ACTIVE");`)).length === 1);
  {
    const storeRaw = read("src/lib/server/store.ts");
    const planted = storeRaw.replace(/\n {4}adjust\s*:/, `\n    setStatus: (id: string, status: StoredWallet["status"]) => { const w = store.wallets.get(id); if (w) store.wallets.set(id, { ...w, status }); return w; },\n    adjust:`);
    const m = walletMembersOf(planted);
    ok("3.25 ⭐ CONTROL · …and the member itself, planted in store.ts, breaks the DAL census",
      planted !== storeRaw && m !== null && m.names.includes("setStatus") && m.names.join(",") !== DAL_MEMBERS.join(","));
    ok("3.26 ⭐ CONTROL · an `adjust` that assigns a status is caught by 2.10's test",
      ASSIGNS_STATE.test(`    adjust: (id: string) => { const w = store.wallets.get(id)!; store.wallets.set(id, { ...w, status: "ACTIVE" }); },`)
      && ASSIGNS_STATE.test(`    adjust: (id: string) => { const w = store.wallets.get(id)!; w.freezeReasons = []; },`));
  }
  ok("3.27 ⭐ CONTROL · a production refusal another condition can switch off (`&& process.env.ALLOW !== \"1\"`) is FLAGGED",
    flagged(F, route(`${refusal.replace('=== "production")', '=== "production" && process.env.ALLOW !== "1")')}\n${create}`)).length === 1);
  ok("3.28 ⭐ CONTROL · a refusing async GET beside a NON-refusing sync `export function POST` is FLAGGED",
    flagged(F, `import { db } from "@/lib/server/store";\nexport async function GET() {\n${refusal}\n${create}\n  return new Response("ok");\n}\nexport function POST() {\n  void db.wallet.create({ id: "w", userId: "u", balance: 0, pending: 0, hold: 0, currency: "TZS", status: "FROZEN", createdAt: "", updatedAt: "" });\n  return new Response("ok");\n}\n`).length === 2);
  ok("3.29 ⭐ CONTROL · a handler exported as `export const PUT =` cannot be proven, so the file is FLAGGED",
    flagged(F, `${route(`${refusal}\n${create}`)}export const PUT = async () => new Response("x");\n`).length === 1);
  {
    const loosened = proxyRaw.replace(/(pathname\.startsWith\("\/api\/dev-test"\) && process\.env\.NODE_ENV === "production")\)/, "$1 && !process.env.OPEN_DEV_TEST)");
    ok("3.30 ⭐ CONTROL · a proxy block another condition can switch off is FLAGGED",
      loosened !== proxyRaw && flagged(F, route(`${refusal}\n${create}`), loosened).length === 1);
  }
  ok("3.31 ⭐ CONTROL · a parameter sharing its name with ANOTHER function's literal is still opaque and FLAGGED",
    flagged(P, `import { db } from "./store";\nexport function other() {\n  const patch = { balance: 1 };\n  return patch;\n}\nexport async function reopen(id: string, patch: object) {\n  await db.wallet.update(id, patch);\n}\n`).length === 1);
  ok("3.32 ⭐ CONTROL · a module-level literal SHADOWED by the writer's own parameter is FLAGGED",
    flagged(P, `import { db } from "./store";\nconst patch = { balance: 1 };\nexport async function reopen(id: string, patch: object) {\n  await db.wallet.update(id, patch);\n}\n`).length === 1);
  {
    const zero = judgeFile(P, `import { db } from "./store";\nconst ZERO = { balance: 0, hold: 0 };\nexport async function reset(id: string) {\n  await db.wallet.update(id, ZERO);\n}\n`, proxyRaw);
    ok("3.33 CONTROL · a module-level literal used by name, not shadowed, is read and NOT flagged",
      zero.length === 1 && zero[0].bucket === "not a status writer");
  }
  ok("3.34 ⭐ CONTROL · a wallet delegate held under another name (`const wal = db.wallet; wal.update(…)`) is FLAGGED",
    flagged(P, fn(`  const wal = db.wallet;\n  await wal.update(id, { status: "ACTIVE" });`)).length === 1);
  ok("3.35 ⭐ CONTROL · a destructured delegate (`const { wallet } = db`) is FLAGGED",
    flagged(P, fn(`  const { wallet } = db;\n  await wallet.update(id, { status: "ACTIVE" });`)).length === 1);
  ok("3.36 ⭐ CONTROL · a bracketed delegate (`db[\"wallet\"].update(`) is FLAGGED",
    flagged(P, fn(`  await db["wallet"].update(id, { status: "ACTIVE" });`)).length === 1);
}

console.log(`\nwallet-status-writers: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
