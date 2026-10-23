/**
 * test:maswali-admin-guide — THE MILLIONEA ADMIN GUIDE SAYS WHAT THE CONSOLE SAYS (`docs/maswali-operator-guide.html`,
 * rendered to the admins' PDF by `scripts/generate-pdfs.mjs`).
 *
 *   npx tsx scripts/maswali-admin-guide.test.mts               (npm run test:maswali-admin-guide)
 *   npx tsx scripts/maswali-admin-guide.test.mts --prove-red   (npm run red:maswali-admin-guide)
 *
 *   §1 SHAPE · three parts in order — how it works, how admins run it, what everything means — and every step of part 2
 *      states who may act, where, what is refused and what to do then, each in words.
 *   §2 ⭐ EVERY LABEL THE GUIDE QUOTES IS THE CONSOLE'S OWN. A quoted label is `<b class="ui" data-screen="…">`; it must be
 *      printed by that screen's own source — a string literal, a template part or JSX text, read with the TypeScript
 *      parser — whole, or as the fixed head of a label the console completes at run time ("Release" + the week's code).
 *      A label renamed in the console, or quoted from the wrong screen, fails here.
 *   §3 NOTHING AN ADMIN READS NAMES THE PROGRAMME OR THE CODE: no programme code, no file, no path, no code identifier.
 *      The audit names an admin reads in the audit log are the one exception, in the audit table alone, and that table
 *      lists exactly the Millionea audit actions the source writes — no more, no fewer.
 *   §4 EVERY RULE LINKS ITS OWNER: each reference goes to a real heading of the rulebook (MASWALI-PLAN §3) or RULES, and
 *      each rule number it names is stated under that heading; every row of part 1 carries one.
 *   --prove-red: each check catches its own plant, made in memory on the guide's text.
 *
 * Pure and static: it reads files and parses source; no server, no database.
 */
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel: string) => readFileSync(join(root, rel), "utf8");
const GUIDE = "docs/maswali-operator-guide.html";
const PROVE_RED = process.argv.includes("--prove-red");

let passed = 0, failed = 0;
function ok(name: string, condition: boolean, detail = "") {
  console.log(`${condition ? "PASS" : "FAIL"} ${name}${!condition && detail ? ` — ${detail}` : ""}`);
  if (condition) passed++; else failed++;
}

// ── The sources each screen's labels are printed by ──────────────────────────────────────────────
const SCREENS: Record<string, readonly string[]> = {
  nav: ["src/components/admin/admin-nav-groups.ts"],
  // S6-SHIP 6 · the front page's Millionea card takes its link's words from the strip-link module (the link a viewer may open).
  home: ["src/app/admin/page.tsx", "src/lib/maswali-strip-link.ts"],
  weeks: ["src/app/admin/maswali/page.tsx", "src/app/admin/maswali/rules-controls.tsx", "src/app/admin/maswali/rules-form.ts", "src/lib/maswali-admin-format.ts"],
  draft: ["src/app/admin/maswali/new/page.tsx", "src/app/admin/maswali/new/week-builder.tsx", "src/app/admin/maswali/[weekId]/edit/page.tsx"],
  week: ["src/app/admin/maswali/[weekId]/page.tsx", "src/app/admin/maswali/[weekId]/week-controls.tsx", "src/lib/maswali-void-reason.ts", "src/lib/maswali-admin-format.ts"],
  pools: ["src/app/admin/maswali/pools/page.tsx", "src/app/admin/maswali/pools/pools-controls.tsx", "src/lib/maswali-admin-format.ts"],
  integrity: ["src/app/admin/maswali/integrity/page.tsx", "src/app/admin/maswali/integrity/integrity-controls.tsx", "src/lib/maswali-share-note.ts",
    // S7-OB · the objection queue and its ruling controls are the integrity page's own (S6-DOCS 10).
    "src/app/admin/maswali/integrity/objection-queue.tsx", "src/app/admin/maswali/integrity/objection-controls.tsx"],
  evidence: ["src/app/admin/maswali/evidence/page.tsx", "src/lib/maswali-admin-format.ts"],
  lookup: ["src/app/admin/maswali/lookup/page.tsx", "src/app/admin/maswali/lookup/lookup-form.tsx", "src/app/admin/maswali/lookup/script-block.tsx"],
  tax: ["src/app/admin/tax/page.tsx", "src/lib/tax-report.ts"],
  reports: ["src/app/admin/reports/page.tsx"],
  house: ["src/app/admin/house/page.tsx"],
};

const ENTITIES: Record<string, string> = { "&apos;": "'", "&rsquo;": "'", "&lsquo;": "'", "&quot;": '"', "&ldquo;": '"', "&rdquo;": '"', "&amp;": "&", "&lt;": "<", "&gt;": ">", "&nbsp;": " ", "&hellip;": "…", "&mdash;": "—", "&ndash;": "–", "&middot;": "·" };
const decode = (s: string) => s.replace(/&[a-z]+;/g, (e) => ENTITIES[e] ?? e).replace(/[‘’]/g, "'");
/** A printed unit as a reader meets it: entities decoded, whitespace folded, and the separators a label sits between
 *  (" · ", ": ", " — ") trimmed from its ends. */
const unitOf = (s: string) => decode(s).replace(/\s+/g, " ").trim().replace(/^[·:—–,;\s]+|[·:—–,;\s]+$/g, "").trim();

/** Every text a source file can print: string literals, template parts and JSX text — one unit each. */
function printedUnits(rel: string): string[] {
  const code = read(rel);
  const sf = ts.createSourceFile(rel, code, ts.ScriptTarget.Latest, true, rel.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const out: string[] = [];
  const go = (n: ts.Node) => {
    const p = n.parent;
    const specifier = p && ((ts.isImportDeclaration(p) || ts.isExportDeclaration(p)) && p.moduleSpecifier === n);
    if (!specifier && (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n) || ts.isTemplateHead(n) || ts.isTemplateMiddle(n) || ts.isTemplateTail(n) || ts.isJsxText(n))) {
      const u = unitOf(n.text);
      if (u) out.push(u);
    }
    n.forEachChild(go);
  };
  sf.forEachChild(go);
  return out;
}
const unitCache = new Map<string, string[]>();
const unitsOf = (screen: string) => {
  if (!unitCache.has(screen)) unitCache.set(screen, (SCREENS[screen] ?? []).flatMap(printedUnits));
  return unitCache.get(screen)!;
};
/** A label is printed when a unit IS it, or a unit is it followed by a run-time tail (the next character is no letter). */
const printed = (label: string, units: readonly string[]) =>
  units.some((u) => u === label || (u.startsWith(label) && !/[\p{L}\p{N}]/u.test(u.charAt(label.length))));

// ── Reading the guide ─────────────────────────────────────────────────────────────────────────────
type Label = { screen: string; text: string };
function labelsOf(html: string): Label[] {
  return [...html.matchAll(/<b class="ui" data-screen="([a-z-]+)">([\s\S]*?)<\/b>/g)]
    .map((m) => ({ screen: m[1], text: decode(m[2].replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim() }));
}
const stripStyle = (html: string) => html.replace(/<style[\s\S]*?<\/style>/g, "").replace(/<!--[\s\S]*?-->/g, "");
/** What a reader sees: no markup, no comments, no style; the audit table's names and the rule links taken out first when asked. */
function visible(html: string, opts: { withoutAuditNames?: boolean; withoutRefs?: boolean } = {}): string {
  let h = stripStyle(html);
  if (opts.withoutAuditNames) h = h.replace(/<td class="mono">[\s\S]*?<\/td>/g, " ");
  if (opts.withoutRefs) h = h.replace(/<a class="ref"[^>]*>[\s\S]*?<\/a>/g, " ");
  return decode(h.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ");
}
function partsOf(html: string) {
  const at = (id: string) => html.indexOf(`<h2 id="${id}">`);
  return { p1: at("part-1"), p2: at("part-2"), p3: at("part-3") };
}
type Step = { id: string; terms: string[]; bodies: string[] };
function stepsOf(html: string): Step[] {
  return [...html.matchAll(/<section class="step" id="([a-z0-9-]+)">([\s\S]*?)<\/section>/g)].map((m) => {
    const dl = /<dl class="f4">([\s\S]*?)<\/dl>/.exec(m[2])?.[1] ?? "";
    const pairs = [...dl.matchAll(/<dt>([\s\S]*?)<\/dt>\s*<dd>([\s\S]*?)<\/dd>/g)];
    return { id: m[1], terms: pairs.map((p) => p[1].trim()), bodies: pairs.map((p) => decode(p[2].replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim()) };
  });
}

// ── The owners' headings (GitHub's anchor for each, as github-slugger makes it) ──────────────────────
type Heading = { slug: string; text: string; level: number; start: number };
function headingsOf(md: string): Heading[] {
  const seen = new Map<string, number>();
  const out: Heading[] = [];
  for (const m of md.matchAll(/^(#{1,6}) (.+)$/gm)) {
    const base = m[2].trim().toLowerCase().replace(/[^\p{L}\p{M}\p{N}\p{Pc} -]/gu, "").replace(/ /g, "-");
    const n = seen.get(base) ?? 0;
    seen.set(base, n + 1);
    out.push({ slug: n === 0 ? base : `${base}-${n}`, text: m[2].trim(), level: m[1].length, start: m.index ?? 0 });
  }
  return out;
}
const OWNERS: Record<string, { md: string; heads: Heading[] }> = {};
for (const doc of ["MASWALI-PLAN.md", "RULES.md"]) {
  const md = read(`docs/${doc}`);
  OWNERS[doc] = { md, heads: headingsOf(md) };
}
/** The text under a heading, to the next heading of its level or higher. */
function sectionText(doc: string, slug: string): string | null {
  const { md, heads } = OWNERS[doc];
  const i = heads.findIndex((h) => h.slug === slug);
  if (i < 0) return null;
  const next = heads.slice(i + 1).find((h) => h.level <= heads[i].level);
  return md.slice(heads[i].start, next ? next.start : md.length);
}
type Ref = { href: string; text: string; problem: string | null };
function refsOf(html: string): Ref[] {
  return [...html.matchAll(/<a class="ref" href="([^"]+)">([\s\S]*?)<\/a>/g)].map((m) => {
    const href = m[1], text = decode(m[2]).replace(/\s+/g, " ").trim();
    const hit = /^https:\/\/github\.com\/alisheib\/kipindi\/blob\/main\/docs\/(MASWALI-PLAN\.md|RULES\.md)#([a-z0-9-]+)$/.exec(href);
    if (!hit) return { href, text, problem: "links nowhere the rules live" };
    const [, doc, slug] = hit;
    const sec = sectionText(doc, slug);
    if (sec === null) return { href, text, problem: `#${slug} is no heading of ${doc}` };
    if (doc === "MASWALI-PLAN.md") {
      if (!/^MR-/.test(text)) return { href, text, problem: "a rulebook link names no MR" };
      if (text === "MR-n") return { href, text, problem: null };
      const nums = [...text.matchAll(/MR-(\d+)/g)].map((x) => Number(x[1]));
      const range = /MR-(\d+) – MR-(\d+)/.exec(text);
      const all = range ? Array.from({ length: Number(range[2]) - Number(range[1]) + 1 }, (_, k) => Number(range[1]) + k) : nums;
      const missing = all.filter((n) => !sec.includes(`**MR-${n} ·`));
      return { href, text, problem: missing.length ? `MR-${missing.join(", MR-")} is not stated under #${slug}` : null };
    }
    if (!/^RULES §/.test(text)) return { href, text, problem: "a RULES link names no section" };
    if (text === "RULES §n") return { href, text, problem: null };
    const n = /^RULES §([\d.]+)$/.exec(text)?.[1];
    const head = OWNERS[doc].heads.find((h) => h.slug === slug);
    return { href, text, problem: n && head && head.text.startsWith(`${n} ·`) ? null : `RULES §${n} is not the heading #${slug}` };
  });
}

// ── The Millionea audit actions the source writes ─────────────────────────────────────────────────
function sourceAuditActions(): Set<string> {
  const dir = join(root, "src/lib/server");
  const out = new Set<string>();
  for (const f of readdirSync(dir).filter((x) => x.endsWith(".ts"))) {
    const code = readFileSync(join(dir, f), "utf8");
    for (const m of code.matchAll(/action: *"((?:maswali|millionea)\.[a-z_.]+)"|[A-Z_]*ACTION *= *"((?:maswali|millionea)\.[a-z_.]+)"/g)) out.add(m[1] ?? m[2]);
  }
  return out;
}
const SOURCE_ACTIONS = sourceAuditActions();

// ── The checks, over one text of the guide ─────────────────────────────────────────────────────────
const ROLE_WORDS = /\b(Trading|Finance|Compliance|Auditor|Support|Owner|platform)\b/;
const FOUR = ["Who", "Where", "Refused when", "If refused"];
type Verdict = Record<string, { ok: boolean; detail: string }>;
function judge(html: string): Verdict {
  const v: Verdict = {};
  const { p1, p2, p3 } = partsOf(html);
  v.parts = { ok: p1 >= 0 && p2 > p1 && p3 > p2, detail: JSON.stringify({ p1, p2, p3 }) };

  const steps = stepsOf(html);
  const at = (id: string) => html.indexOf(`<section class="step" id="${id}">`);
  const badShape = steps.filter((s) => s.terms.join("|") !== FOUR.join("|") || s.bodies.some((b) => b.length < 8) || !ROLE_WORDS.test(s.bodies[0] ?? ""));
  const outside = steps.filter((s) => !(at(s.id) > p2 && at(s.id) < p3));
  v.steps = { ok: steps.length > 0 && badShape.length === 0 && outside.length === 0,
    detail: [...badShape.map((s) => `${s.id}: ${s.terms.join("/")}`), ...outside.map((s) => `${s.id}: outside part 2`)].join(" · ") };

  const labels = labelsOf(html);
  const unknownScreen = labels.filter((l) => !SCREENS[l.screen]);
  const unprinted = labels.filter((l) => SCREENS[l.screen] && !printed(l.text, unitsOf(l.screen)));
  v.labels = { ok: labels.length > 0 && unknownScreen.length === 0 && unprinted.length === 0,
    detail: [...unknownScreen.map((l) => `no screen "${l.screen}"`), ...unprinted.map((l) => `${l.screen}: "${l.text}"`)].join(" · ") };

  const text = visible(html, { withoutAuditNames: true });
  const CODES: Array<[string, RegExp]> = [
    ["MB-n", /\bMB-\d/], ["OD-n", /\bOD-\d/], ["MASWALI-BUILD", /MASWALI-BUILD/], ["a session or lane code", /\bS\d{1,2}(?:-[A-Z0-9]+)?\b/],
    ["an R- ruling key", /\bR-[A-Z]{3,}\b/], ["a failure code", /\bE-\d{2,}\b/], ["a design or review code", /\b[DL]\d{1,3}[a-z]?\b/],
  ];
  const codeHits = CODES.filter(([, re]) => re.test(text)).map(([n, re]) => `${n}: "${(text.match(re) ?? [""])[0]}"`);
  const loneMr = /\bMR-\d/.test(visible(html, { withoutRefs: true }));
  v.codes = { ok: codeHits.length === 0 && !loneMr, detail: [...codeHits, ...(loneMr ? ["an MR number outside a rule link"] : [])].join(" · ") };

  const NAMES: Array<[string, RegExp]> = [
    ["a file", /\b[\w-]+\.(?:tsx?|mts|mjs|cjs|jsx?|json|prisma|sql|md|css|html)\b/i], ["a path", /(?:^|[\s(])(?:src|scripts|prisma|docs)\//],
    ["a code identifier", /\b[a-z]+[A-Z][A-Za-z0-9]*\b/], ["a type or table name", /\b[A-Z][a-z0-9]+[A-Z][A-Za-z0-9]*\b/],
    ["a dotted or snake_case name", /\b[a-z]+(?:[._][a-z0-9]+)+\b/],
  ];
  const nameHits = NAMES.filter(([, re]) => re.test(text)).map(([n, re]) => `${n}: "${(text.match(re) ?? [""])[0]}"`);
  v.names = { ok: nameHits.length === 0, detail: nameHits.join(" · ") };

  const audit = [...html.matchAll(/<td class="mono">([\s\S]*?)<\/td>/g)].map((m) => m[1].trim());
  const notInSource = audit.filter((a) => !SOURCE_ACTIONS.has(a));
  const notInGuide = [...SOURCE_ACTIONS].filter((a) => !audit.includes(a));
  v.audit = { ok: audit.length > 0 && notInSource.length === 0 && notInGuide.length === 0,
    detail: [...notInSource.map((a) => `not written by the source: ${a}`), ...notInGuide.map((a) => `missing from the guide: ${a}`)].join(" · ") };

  const refs = refsOf(html);
  const badRefs = refs.filter((r) => r.problem);
  const rows = [...(html.slice(p1, p2).match(/<table class="rules">([\s\S]*?)<\/table>/)?.[1] ?? "").matchAll(/<tr>([\s\S]*?)<\/tr>/g)];
  const bare = rows.filter((r) => !r[1].includes('class="ref"'));
  v.refs = { ok: refs.length > 0 && rows.length > 0 && badRefs.length === 0 && bare.length === 0,
    detail: [...badRefs.map((r) => `${r.text}: ${r.problem}`), ...bare.map((r) => `a part 1 row without its rule: ${visible(r[1]).slice(0, 40)}`)].join(" · ") };
  return v;
}

const guide = read(GUIDE);
const verdict = judge(guide);
const NAMES: Record<string, string> = {
  parts: "1 · three parts in order: how it works, how admins run it, what everything means",
  steps: "1 · every step of part 2 states who, where, what is refused and what to do then — each in words, with a role named",
  labels: "2 · ⭐ every label the guide quotes is printed by its own screen's source (whole, or the fixed head of a run-time label)",
  codes: "3 · no programme code reaches the reader; a rule number only inside its rule link",
  names: "3 · no file, path, code identifier, type or table name reaches the reader",
  audit: "3 · the audit table lists exactly the Millionea audit actions the source writes",
  refs: "4 · every rule link goes to a real heading of its owner, every rule it names is stated there, and every part 1 row has one",
};
for (const [k, n] of Object.entries(NAMES)) ok(n, verdict[k].ok, verdict[k].detail);
const steps = stepsOf(guide).length, labels = labelsOf(guide).length;
console.log(`  (${steps} steps · ${labels} quoted labels over ${new Set(labelsOf(guide).map((l) => l.screen)).size} screens · ${refsOf(guide).length} rule links · ${SOURCE_ACTIONS.size} audit actions)`);
// Floors, at the counts a green run printed: the guide never quietly loses its steps or its quoted labels.
ok("1 · floor: at least 27 steps in part 2", steps >= 27, `${steps}`);
ok("2 · floor: at least 318 quoted labels", labels >= 318, `${labels}`);

if (PROVE_RED) {
  const plant = (name: string, check: string, from: RegExp | string, to: string) => {
    const planted = guide.replace(from, to);
    if (planted === guide) { ok(`red: ${name} — the plant's target is present`, false, String(from)); return; }
    ok(`red: ${name}`, !judge(planted)[check].ok);
  };
  plant("a label renamed away from the console (Draft a week → Draft the week)", "labels", '<b class="ui" data-screen="weeks">Draft a week</b>', '<b class="ui" data-screen="weeks">Draft the week</b>');
  plant("a label quoted from the wrong screen", "labels", '<b class="ui" data-screen="pools">Release the settlement</b>', '<b class="ui" data-screen="weeks">Release the settlement</b>');
  plant("a label quoted from no screen", "labels", '<b class="ui" data-screen="lookup">Look up</b>', '<b class="ui" data-screen="desk">Look up</b>');
  plant("a step without what to do when refused", "steps", /<dt>If refused<\/dt><dd>[\s\S]*?<\/dd>/, "");
  plant("a step whose Who names no role", "steps", "<dt>Who</dt><dd>Finance.</dd>", "<dt>Who</dt><dd>Someone, eventually.</dd>");
  plant("a step outside part 2", "steps", "Part 3 · What everything means</h2>", 'Part 3 · What everything means</h2><section class="step" id="stray"><dl class="f4"><dt>Who</dt><dd>The Owner, again.</dd><dt>Where</dt><dd>Somewhere else.</dd><dt>Refused when</dt><dd>Never refused at all.</dd><dt>If refused</dt><dd>Nothing to do then.</dd></dl></section>');
  plant("a programme code (MB-92)", "codes", "It is not a void and not a stop.", "It is not a void and not a stop (MB-92).");
  plant("a session code (S6)", "codes", "It is not a void and not a stop.", "It is not a void and not a stop, as S6 built it.");
  plant("an MR number outside a rule link", "codes", "It is not a void and not a stop.", "It is not a void and not a stop (MR-16).");
  plant("a file name", "names", "It is not a void and not a stop.", "It is not a void and not a stop, says maswali-pause.ts.");
  plant("a code identifier", "names", "It is not a void and not a stop.", "It is not a void and not a stop: read salesPause.");
  plant("a table name", "names", "It is not a void and not a stop.", "It is not a void and not a stop on MaswaliCycle.");
  plant("an audit name the source never writes", "audit", '<td class="mono">maswali.week.drafted</td>', '<td class="mono">maswali.week.invented</td>');
  plant("an audit action left out of the table", "audit", /<tr><td class="mono">maswali\.week\.voided<\/td><td>[^<]*<\/td><\/tr>/, "");
  plant("a rule link to no heading", "refs", 'MASWALI-PLAN.md#i--end-of-life-and-launch">MR-30</a>', 'MASWALI-PLAN.md#z--nowhere">MR-30</a>');
  plant("a rule link naming a rule its heading does not state", "refs", 'MASWALI-PLAN.md#f--grading">MR-17 · MR-18</a>', 'MASWALI-PLAN.md#f--grading">MR-16 · MR-18</a>');
  plant("a RULES link to the wrong section", "refs", ">RULES §2.6</a>", ">RULES §2.7</a>");
  plant("a part 1 row without its rule", "refs", /(<tr><td>Rollover<\/td><td>[\s\S]*?)<a class="ref"[^>]*>MR-21<\/a>/, "$1");
  plant("a part missing", "parts", '<h2 id="part-3">', '<h2 id="part-three">');
}

console.log(`\nmaswali-admin-guide: ${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
