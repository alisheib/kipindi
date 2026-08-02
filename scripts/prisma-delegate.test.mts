/**
 * GUARD — nobody may read a Prisma model off the `prisma` FUNCTION.
 *
 * `src/lib/server/prisma.ts` exports `prisma(): PrismaClient | null`. A model delegate is
 * therefore `prisma()!.someModel`, NEVER `prisma.someModel`. Get it wrong and the property
 * is `undefined`, so the first call on it throws
 * *"Cannot read properties of undefined (reading 'upsert')"* — at RUNTIME, on production.
 *
 * 🔴 THIS SHIPPED. `updown-proposal.ts` carried `(prisma as any).upDownProposal` from the
 * day the AI proposal queue merged. Every write threw, every read was swallowed by the
 * queue page's `.catch(() => [])`, and the page rendered "No proposals yet" — so the
 * feature looked unused rather than broken. It was found by an admin pressing the button
 * on production, not by us (campaign finding E-40).
 *
 * ⛔ WHY tsc CANNOT CATCH IT: the offending line was `(prisma as any).upDownProposal`. The
 * cast to `any` is precisely what erases the "Property does not exist on type
 * '() => PrismaClient'" error. So this has to be a source scan — a green build was, once
 * again, not evidence.
 *
 * The scan is deliberately narrow: it flags a property access on the bare identifier
 * `prisma` (optionally wrapped in a cast) and nothing else. `prisma()` in any form is
 * fine, as is a local variable holding the client.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const SRC = join(ROOT, "src");

let pass = 0;
const failures: string[] = [];

function check(name: string, ok: boolean, detail = "") {
  if (ok) { pass++; console.log(`  ok   ${name}`); }
  else { failures.push(`${name}${detail ? ` — ${detail}` : ""}`); console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`); }
}

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx|mts)$/.test(p)) out.push(p);
  }
  return out;
}

/**
 * A property read on the bare `prisma` identifier.
 *
 *   (prisma as any).upDownProposal     ← the bug
 *   (prisma as unknown as X).model     ← the same bug wearing a longer cast
 *   prisma.upDownProposal              ← the same bug undisguised
 *
 * `prisma()` and `prisma()!.model` never match, because a `(` follows the identifier.
 * `.length` / `.name` / `.call` / `.apply` / `.bind` are genuine Function members and are
 * not what this guard is about.
 */
const BARE_CAST = /\(\s*prisma\s+as\s+[^)]*\)\s*\.\s*([A-Za-z_$][\w$]*)/g;
const BARE_PLAIN = /(^|[^.\w$(])prisma\s*\.\s*([A-Za-z_$][\w$]*)/g;
const FUNCTION_MEMBERS = new Set(["length", "name", "call", "apply", "bind", "toString", "prototype", "constructor"]);

function offences(text: string): string[] {
  const hits: string[] = [];
  // Strip comments so the explanatory prose in prisma.ts / this file is not scanned.
  const code = text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
  for (const re of [BARE_CAST, BARE_PLAIN]) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(code))) {
      const prop = m[m.length - 1];
      if (!FUNCTION_MEMBERS.has(prop)) hits.push(`prisma.${prop}`);
    }
  }
  return hits;
}

console.log("\nprisma delegate access\n");

const files = walk(SRC);
check("scanned a non-trivial number of source files", files.length > 200, `${files.length} files`);

const offenders: Array<{ file: string; hits: string[] }> = [];
for (const f of files) {
  const hits = offences(readFileSync(f, "utf8"));
  if (hits.length) offenders.push({ file: relative(ROOT, f).replace(/\\/g, "/"), hits: [...new Set(hits)] });
}

check(
  "no module reads a model off the `prisma` function",
  offenders.length === 0,
  offenders.map((o) => `${o.file}: ${o.hits.join(", ")}`).join(" · "),
);

// ── SELF-TEST — a detector that cannot fail is not a detector ────────────────
// The §3 lesson, applied to this file: prove the scan catches the exact line that
// shipped, and does NOT flag the correct idiom.
check("self-test: flags the line that shipped",
  offences(`function pc(): any { return (prisma as any).upDownProposal; }`).length === 1);
check("self-test: flags a longer cast",
  offences(`return (prisma as unknown as Record<string, any>).upDownRound;`).length === 1);
check("self-test: flags an undisguised read",
  offences(`const rows = await prisma.upDownProposal.findMany();`).length === 1);
check("self-test: allows the CORRECT idiom",
  offences(`const c = prisma(); return (c as any).upDownProposal;`).length === 0);
check("self-test: allows prisma()!.model",
  offences(`await prisma()!.upDownProposal.findMany();`).length === 0);
check("self-test: allows a Function member",
  offences(`prisma.name;`).length === 0);
check("self-test: ignores commented-out code",
  offences(`// return (prisma as any).upDownProposal;\n/* (prisma as any).foo */`).length === 0);

// ── The real delegate exists on a real client ───────────────────────────────
// The scan above is structural. This asks the generated client directly, so a model
// that is in schema.prisma but missing from the client is caught too.
const { PrismaClient } = await import("@prisma/client");
const client = new PrismaClient();
for (const model of ["upDownProposal", "upDownAsset", "upDownChain", "upDownRound", "upDownObservation"]) {
  const delegate = (client as unknown as Record<string, any>)[model];
  check(`client exposes \`${model}\` with upsert + findMany`,
    !!delegate && typeof delegate.upsert === "function" && typeof delegate.findMany === "function");
}
await client.$disconnect();

console.log(`\n${pass} passed, ${failures.length} failed\n`);
if (failures.length) { for (const f of failures) console.log(`  · ${f}`); process.exit(1); }
