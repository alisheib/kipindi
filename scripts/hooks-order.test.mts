/**
 * test:hooks-order — no component may call a React hook AFTER an early return.
 *
 * 🔴 ORIGIN (2026-09-26). `nav-more.tsx` returned `null` for an empty list and THEN ran a `useEffect`
 * (the D30 rail-stacking effect, `2c9380e0`). The top bar hands it `items=[]` when signed out and a full
 * list when signed in, at a fixed position, so every SOFT change of session — a Server Action that starts
 * a break, self-excludes, closes the account or signs in through the form, and a `router.refresh()` after
 * a session ended elsewhere — re-rendered that same fiber with one hook fewer (or more). React threw
 * "Rendered fewer hooks than expected" above `app/error.tsx`, and the player got the ROOT error screen,
 * at the exact moment they had asked for a break. It shipped because nothing checked for it: `lint` is
 * `tsc --noEmit` and the repo has no `react-hooks/rules-of-hooks`.
 *
 * ⚠️ WHAT THIS IS: a line-structured scan, not a parser — the shape this codebase writes components in
 * (top-level `function X(` / `const X = `, two-space bodies). It catches the shape that shipped, a
 * `return` at the body's top level (or directly inside a top-level `if`) followed by a top-level hook
 * call. It does NOT see hooks inside nested helpers or conditional blocks. It proves itself on planted
 * controls below before its verdict on `src/` counts, so a scanner that stopped matching cannot pass.
 *
 * Run: npm run test:hooks-order
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

type Finding = { file: string; line: number; fn: string; returnLine: number; text: string };

const HOOK_AT_TOP = [
  /^ {2}(const|let|var) [^=]*= *(React\.)?use[A-Z][A-Za-z0-9]*\(/,
  /^ {2}(React\.)?use[A-Z][A-Za-z0-9]*\(/,
];

export function scan(file: string, src: string): { findings: Finding[]; functions: number } {
  const findings: Finding[] = [];
  let functions = 0;
  let inFn = false;
  let fn = "";
  let returned = 0;
  let last2 = "";
  const lines = src.split(/\r?\n/);
  lines.forEach((text, i) => {
    const n = i + 1;
    const fnDecl = /^(export )?(default )?(async )?function ([A-Za-z0-9_]+)/.exec(text);
    const constDecl = /^(export )?const ([A-Za-z][A-Za-z0-9_]*) = /.exec(text);
    if (fnDecl || constDecl) {
      inFn = true; returned = 0; last2 = ""; functions++;
      fn = fnDecl ? fnDecl[4] : constDecl![2];
      return;
    }
    if (/^};?\s*$/.test(text) || /^}\)[;)]*\s*$/.test(text)) { inFn = false; returned = 0; return; }
    if (!inFn) return;
    if (/^ {2}[^ /*]/.test(text) && !/^ {2}\}/.test(text)) last2 = text;
    if (!returned) {
      // `return (` is the JSX tail; nothing legitimately follows it, so it is not an EARLY return.
      if (/^ {2}(if \(.*\) )?return[ ;]/.test(text) && !/^ {2}return \(/.test(text)) returned = n;
      else if (/^ {4}return[ ;(]/.test(text) && (/^ {2}if /.test(last2) || /^ {2}\} else/.test(last2))) returned = n;
      return;
    }
    if (HOOK_AT_TOP.some((re) => re.test(text))) findings.push({ file, line: n, fn, returnLine: returned, text: text.trim() });
  });
  return { findings, functions };
}

let pass = 0;
const fails: string[] = [];
const ok = (cond: boolean, label: string, detail = "") => { if (cond) pass++; else fails.push(`${label}${detail ? ` — ${detail}` : ""}`); };

/* ══════════ 1 · THE SCANNER CATCHES THE SHAPE THAT SHIPPED (positive controls) ══════════ */
{
  const shipped = [
    "export function NavMore({ items }: { items: string[] }) {",
    "  const [open, setOpen] = useState(false);",
    "  useEffect(() => {}, [open]);",
    "",
    "  if (items.length === 0) return null;",
    "",
    "  const isRail = true;",
    "  useEffect(() => {",
    "    if (!isRail) return;",
    "  }, [isRail, open]);",
    "  return <div />;",
    "}",
  ].join("\r\n");
  const r = scan("planted/nav-more-2c9380e0.tsx", shipped);
  ok(r.findings.length === 1 && r.findings[0].line === 8, "1.1 the exact nav-more shape (CRLF) is flagged, on the hook's own line",
    JSON.stringify(r.findings));

  const blockReturn = [
    "function Panel({ user }: { user: User | null }) {",
    "  const t = useT();",
    "  if (!user) {",
    "    return null;",
    "  }",
    "  const [x] = React.useState(0);",
    "  return <p>{x}</p>;",
    "}",
  ].join("\n");
  ok(scan("planted/block.tsx", blockReturn).findings.length === 1, "1.2 a return inside a top-level `if` block, then `React.useState`, is flagged");
}

/* ══════════ 2 · AND IT DOES NOT CRY WOLF (negative controls) ══════════ */
{
  const fixed = [
    "export function NavMore({ items }: { items: string[] }) {",
    "  const [open, setOpen] = useState(false);",
    "  const hasItems = items.length > 0;",
    "  useEffect(() => {",
    "    if (!hasItems) return;",
    "  }, [hasItems, open]);",
    "  if (!hasItems) return null;",
    "  const label = items.join(\", \");",
    "  return <div>{label}</div>;",
    "}",
  ].join("\n");
  ok(scan("planted/fixed.tsx", fixed).findings.length === 0, "2.1 the fixed nav-more (hooks first, then the early return) passes");

  const nested = [
    "export function useThing(flag: boolean) {",
    "  const ref = useRef(0);",
    "  useEffect(() => {",
    "    if (!flag) return;",
    "    ref.current++;",
    "  }, [flag]);",
    "  return ref;",
    "}",
  ].join("\n");
  ok(scan("planted/nested.ts", nested).findings.length === 0, "2.2 a `return` INSIDE an effect callback is not an early return");
}

/* ══════════ 3 · THE REAL TREE ══════════ */
function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(tsx|ts)$/.test(p) && !p.endsWith(".d.ts")) out.push(p);
  }
  return out;
}
{
  const files = walk("src");
  let functions = 0;
  const all: Finding[] = [];
  for (const f of files) {
    const r = scan(f.replace(/\\/g, "/"), readFileSync(f, "utf8"));
    functions += r.functions;
    all.push(...r.findings);
  }
  // ⭐ Not vacuous: the scan must actually have walked the component tree.
  ok(files.length > 400 && functions > 1500, "3.0-control the scan walked the real tree", `${files.length} files, ${functions} functions`);
  const nav = scan("src/components/layout/nav-more.tsx", readFileSync("src/components/layout/nav-more.tsx", "utf8"));
  ok(nav.functions >= 1 && nav.findings.length === 0, "3.1 nav-more.tsx: every hook is above its early return");
  ok(all.length === 0, "3.2 NO component in src/ calls a hook after an early return",
    all.map((f) => `${f.file}:${f.line} (${f.fn}, return at ${f.returnLine}): ${f.text}`).join(" | "));
}

console.log(`hooks-order: ${pass} passed, ${fails.length} failed`);
if (fails.length) {
  fails.forEach((f) => console.error("  ✗ " + f));
  process.exit(1);
}
console.log("all green");
