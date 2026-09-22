/**
 * test:density-contract — THE CARD-SPACING CONTRACT (docs/MOBILE-VISUAL-PLAN.md §4 decision 1, §9 U2, §12).
 *
 *   npm run test:density-contract           # the contract over the real tree, plus its planted fixtures
 *   npm run red:density-contract            # --prove-red: plants violations into the real CSS text IN MEMORY
 *
 * Ali, 2026-09-15: Compact is the phone default, Comfortable returns today's board EXACTLY, and the switch changes
 * spacing only. That promise holds only if every Compact rule is doubly fenced:
 *   · inside the phone query `@media (max-width: 639.98px)` — ≥ 640 must be a zero diff (plan §9 [Compact] control);
 *   · and every selector part starts `html:not([data-density="comfortable"])` — Comfortable must be a zero diff too.
 * No cookie stamps nothing, so Compact is the ABSENCE of the attribute (src/lib/card-spacing.ts): a rule written the
 * other way round (`[data-density="compact"]`) would never match, and a rule gated on `comfortable` would change the
 * very board Comfortable promises to leave alone.
 *
 * WHAT IT CHECKS
 *   §1  every CSS rule that mentions data-density is a correctly fenced Compact rule (the population, printed);
 *   §2  SCOPE: every phone-only rule that touches the board's density scope (market cards and the Up & Down card —
 *       one `.mcardp` shell — the grid, the discovery bar) is fenced, or carries a `density: general` comment saying
 *       why it must apply in both settings. Without this, a Compact rule that FORGOT its selector gate would look like
 *       an ordinary phone rule and §1 would never see it;
 *   §3  no density gating outside globals.css (no Tailwind `data-[density…]` variant, no second reader), §0d;
 *   §4  the wiring: the layout stamps ONLY "comfortable", the cookie is kp-density, the rail row is a 44px
 *       `menuitemcheckbox` hidden ≥ 640 with a decorative toggle, and only the rail's menu carries it;
 *   §5  planted fixtures — each defect shape above, run through the same functions, must be reported.
 *
 * ⚠️ AT U2 THE §1 POPULATION IS EMPTY — U2 adds the switch, not a single Compact rule (U3 and U4 do). An empty
 * population passes vacuously, so §5 and --prove-red are what prove the checks can fail; the count is printed.
 * ⛔ In-process by design (red-anchors §4 counts it as such): this file must never write to disk.
 */
import postcss, { type Rule } from "postcss";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { decomment } from "./lib/decomment.mts";

const ROOT = process.cwd();
const PROVE_RED = process.argv.includes("--prove-red");
const GATE = 'html:not([data-density="comfortable"])';
const PHONE = "(max-width:639.98px)";
/** The density scope of plan §4 [Compact]: market cards + the Up & Down card (one .mcardp shell), the grid, the bar. */
const SCOPE = /\.mcardp\b|\.mcardp-|\.market-grid\b|\.kp-discovery-bar\b|\[data-filter-rail\]/;
const EXEMPT = /density:\s*general\b/i;

let pass = 0;
const fails: string[] = [];
function ok(name: string, cond: boolean, detail = "") {
  if (cond) { pass++; console.log(`  PASS ${name}`); }
  else { fails.push(name); console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`); }
}

function walk(dir: string, re: RegExp, out: string[] = []): string[] {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) walk(p, re, out);
    else if (re.test(n)) out.push(p);
  }
  return out;
}
const norm = (s: string) => s.replace(/\s+/g, "");
function mediaChain(r: Rule): string[] {
  const out: string[] = [];
  for (let p = r.parent; p && p.type !== "root"; p = p.parent) if (p.type === "atrule" && (p as postcss.AtRule).name === "media") out.push(norm((p as postcss.AtRule).params));
  return out;
}
const phoneOnly = (chain: string[]) => chain.some((m) => { const w = m.match(/max-width:(\d+(?:\.\d+)?)px/); return !!w && Number(w[1]) < 640; });
const fencedByPhone = (chain: string[]) => chain.some((m) => m.includes(PHONE)) && !chain.some((m) => /min-width:(\d+)/.test(m) && Number(m.match(/min-width:(\d+)/)![1]) >= 640);
const gated = (sel: string) => sel.split(",").every((part) => part.trim().startsWith(GATE));
const exempt = (r: Rule) => r.nodes?.some((n) => n.type === "comment" && EXEMPT.test(n.text)) ?? false;

/** §1 + §2 over one stylesheet's text. Returns the defects and the size of each population. */
function cssDefects(css: string, file: string): { defects: string[]; density: number; scoped: number } {
  const defects: string[] = [];
  let density = 0, scoped = 0;
  postcss.parse(css, { from: file }).walkRules((r) => {
    const at = `${file}:${r.source?.start?.line ?? "?"}`;
    const chain = mediaChain(r);
    if (/data-density/.test(r.selector)) {
      density++;
      if (!gated(r.selector)) defects.push(`${at} every selector part must start ${GATE}: "${r.selector.replace(/\s+/g, " ").slice(0, 90)}"`);
      if (!fencedByPhone(chain)) defects.push(`${at} a Compact rule outside @media ${PHONE}: "${r.selector.replace(/\s+/g, " ").slice(0, 60)}"`);
      return;
    }
    if (phoneOnly(chain) && SCOPE.test(r.selector)) {
      scoped++;
      if (!exempt(r)) defects.push(`${at} a phone rule on the board's density scope with no gate and no "density: general" reason: "${r.selector.replace(/\s+/g, " ").slice(0, 70)}"`);
    }
  });
  return { defects, density, scoped };
}

/** §3 — density is decided in globals.css only; code may stamp and read the attribute in exactly two files. */
const READERS = new Set(["src/app/layout.tsx", "src/lib/card-spacing.ts"]);
function codeDefects(files: Array<{ rel: string; src: string }>): string[] {
  const d: string[] = [];
  for (const f of files) {
    const c = decomment(f.src);
    if (/data-\[density|\[data-density|html:not\(\[data-density/.test(c)) d.push(`${f.rel}: a density variant in code — Compact rules live in globals.css only (§0d)`);
    else if (/data-density/.test(c) && !READERS.has(f.rel)) d.push(`${f.rel}: reads or stamps data-density — only ${[...READERS].join(" and ")} may`);
  }
  return d;
}

/* ── §1 · §2 over every stylesheet ─────────────────────────────────────────────────────────── */
console.log("\n§1 · §2 · the Compact fence over every stylesheet");
const cssFiles = walk(join(ROOT, "src"), /\.css$/).map((p) => ({ rel: relative(ROOT, p).replace(/\\/g, "/"), src: readFileSync(p, "utf8") }));
let density = 0, scoped = 0;
const cssFound: string[] = [];
for (const f of cssFiles) {
  const r = cssDefects(f.src, f.rel);
  density += r.density; scoped += r.scoped; cssFound.push(...r.defects);
}
ok(`${cssFiles.length} stylesheets parsed · ${density} Compact rule(s) · ${scoped} phone rule(s) on the density scope — all fenced`,
  cssFound.length === 0, cssFound.slice(0, 6).join(" · "));
if (density === 0) console.log("    ⚠️ population 0: no Compact rule exists yet (U3/U4 add them) — §5 and --prove-red prove the check can fail");

/* ── §3 · no density outside globals.css ───────────────────────────────────────────────────── */
console.log("\n§3 · density is decided in CSS, stamped in one place");
const codeFiles = walk(join(ROOT, "src"), /\.(tsx?|jsx?)$/).map((p) => ({ rel: relative(ROOT, p).replace(/\\/g, "/"), src: readFileSync(p, "utf8") }));
const codeFound = codeDefects(codeFiles);
ok(`${codeFiles.length} source files: no density variant, no third reader`, codeFound.length === 0, codeFound.slice(0, 4).join(" · "));

/* ── §4 · the wiring ───────────────────────────────────────────────────────────────────────── */
console.log("\n§4 · the wiring");
const read = (p: string) => decomment(readFileSync(join(ROOT, p), "utf8"));
const lib = read("src/lib/card-spacing.ts");
const layout = read("src/app/layout.tsx");
const nav = read("src/components/layout/nav-more.tsx");
const rail = read("src/components/layout/bottom-nav.tsx");
const bar = read("src/components/layout/top-app-bar.tsx");
const toggle = read("src/components/ui/toggle.tsx");
ok("§4a the cookie is kp-density, and only the literal \"comfortable\" selects Comfortable",
  /export const CARD_SPACING_COOKIE = "kp-density";/.test(lib) && /raw === "comfortable" \? "comfortable" : "compact"/.test(lib));
ok("§4b the layout reads the cookie on the server and stamps ONLY comfortable (no attribute = Compact)",
  /cardSpacingFromCookie\(jar\.get\(CARD_SPACING_COOKIE\)\?\.value\) === "comfortable" \? "comfortable" : undefined/.test(layout)
  && /<html [^>]*data-density=\{density\}/.test(layout));
ok("§4c the client setter writes the cookie with the attribute, removing it for Compact",
  /document\.cookie = `\$\{CARD_SPACING_COOKIE\}=\$\{v\}; path=\/; max-age=\$\{60 \* 60 \* 24 \* 365\}; samesite=lax`/.test(lib)
  && /setAttribute\("data-density", "comfortable"\)/.test(lib) && /removeAttribute\("data-density"\)/.test(lib));
const row = nav.match(/role="menuitemcheckbox"[\s\S]{0,1600}?<\/button>/)?.[0] ?? "";
ok("§4d the rail row is one 44px menuitemcheckbox, hidden ≥ 640, with its state and a decorative toggle",
  !!row && /aria-checked=\{compact\}/.test(row) && /min-h-\[44px\]/.test(row) && /\bsm:hidden\b/.test(row) && /<Toggle on=\{compact\} decorative \/>/.test(row));
ok("§4e only the rail's menu carries it: bottom-nav passes cardSpacing, the top bar does not",
  /<NavMore[\s\S]{0,200}?variant="rail"[\s\S]{0,120}?cardSpacing/.test(rail) && /<NavMore\b/.test(bar) && !/cardSpacing/.test(bar));
const deco = toggle.match(/if \(decorative\) \{[\s\S]*?\n  \}/)?.[0] ?? "";
ok("§4f the decorative toggle is a bare aria-hidden span — no role, no focus, no handler",
  !!deco && /<span\s+aria-hidden/.test(deco) && !/role=|tabIndex|onClick|<button/.test(deco));

/* ── §5 · planted fixtures ─────────────────────────────────────────────────────────────────── */
console.log("\n§5 · planted fixtures — each must be reported");
const P = "@media (max-width: 639.98px)";
const FIX: Array<[string, string, boolean]> = [
  ["a fenced Compact rule", `${P} { ${GATE} .mcardp { padding-top: 10px; } }`, false],
  ["a fenced comma list", `${P} { ${GATE} .mcardp, ${GATE} .market-grid { gap: 10px; } }`, false],
  ["an exempt general phone rule", `${P} { .mcardp-share::after { /* density: general — D28 reach, both settings */ top: -14px; } }`, false],
  ["a gate with no phone query", `${GATE} .mcardp { padding-top: 10px; }`, true],
  ["a phone query under a ≥ 640 query", `@media (min-width: 768px) { ${P} { ${GATE} .mcardp { gap: 6px; } } }`, true],
  ["a comma list with one ungated part", `${P} { ${GATE} .mcardp, .market-grid { gap: 10px; } }`, true],
  ["the wrong polarity ([data-density=compact])", `${P} { html[data-density="compact"] .mcardp { gap: 6px; } }`, true],
  ["a gate on comfortable (changes the promised board)", `${P} { html[data-density="comfortable"] .mcardp { gap: 6px; } }`, true],
  ["a phone rule on the card that FORGOT its gate", `${P} { .mcardp { padding-top: 10px; } }`, true],
  ["a phone rule on the discovery bar that forgot its gate", `@media (max-width: 560.98px) { .kp-discovery-bar { padding: 4px; } }`, true],
];
for (const [name, css, bad] of FIX) {
  const r = cssDefects(css, "fixture.css");
  ok(`§5 ${name} → ${bad ? "reported" : "accepted"}`, bad ? r.defects.length > 0 : r.defects.length === 0, r.defects.join(" · "));
}
const tsxFix: Array<[string, string, boolean]> = [
  ["a Tailwind density variant in a component", 'export const C = () => <div className="data-[density=comfortable]:gap-3" />;', true],
  ["a third reader of the attribute", 'const d = document.documentElement.getAttribute("data-density");', true],
  ["a comment that merely names data-density", "// the menu reads <html data-density> while open\nexport const x = 1;", false],
];
for (const [name, src, bad] of tsxFix) {
  const d = codeDefects([{ rel: "src/fixture.tsx", src }]);
  ok(`§5 ${name} → ${bad ? "reported" : "accepted"}`, bad ? d.length > 0 : d.length === 0, d.join(" · "));
}

/* ── --prove-red · plant into the REAL stylesheet text, in memory ─────────────────────────── */
if (PROVE_RED) {
  console.log("\n--prove-red · violations planted into the real globals.css text (memory only)");
  const real = cssFiles.find((f) => f.rel === "src/app/globals.css")!.src;
  const plants: Array<[string, string]> = [
    ["an ungated phone rule on the market card", `\n${P} { .mcardp { padding-top: 10px; } }\n`],
    ["a Compact gate with no phone query", `\n${GATE} .market-grid { gap: 10px; }\n`],
  ];
  let caught = 0;
  for (const [name, add] of plants) {
    const hit = cssDefects(real + add, "src/app/globals.css").defects.length > 0;
    console.log(`  ${hit ? "CAUGHT" : "MISSED"} ${name}`);
    if (hit) caught++;
  }
  const clean = cssDefects(real, "src/app/globals.css").defects.length === 0;
  console.log(`\n${caught}/${plants.length} planted density violations caught${clean ? "" : " — ⛔ but the untouched tree is itself red, so the proof is void"}`);
  process.exit(caught === plants.length && clean ? 0 : 1);
}

console.log(`\n${fails.length ? "FAILURES" : "ALL PASS"} — ${pass} passed, ${fails.length} failed`);
process.exit(fails.length ? 1 : 0);
