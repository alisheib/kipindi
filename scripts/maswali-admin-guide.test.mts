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
 *   §3 NOTHING AN ADMIN READS NAMES THE PROGRAMME OR THE CODE: no programme code — not even a rule number (MR-n,
 *      RULES §n) —, no file, no path, no code identifier. The audit names an admin reads in the audit log are the one
 *      exception, in the audit table alone, and that table lists exactly the Millionea audit actions the source writes —
 *      no more, no fewer.
 *   §4 THE GUIDE LINKS ONLY WHERE AN ADMIN CAN FOLLOW: one place, the binding rules players accept (the published
 *      Millionea rules page), named in part 1; never the repository or a programme document. (MASWALI-BUILD S6-GUIDE,
 *      the lead's brief of 2026-10-23 under Ali's standard — "no unneeded wording, no unneeded things": the rule-number
 *      links into the repository's plan are gone; part 1 states each rule in words.)
 *   §5 EVERY PICTURE IS THERE: each screenshot the guide shows (Ali, 2026-10-23: "make it clear to my admin with
 *      screenshots as needed") is a committed image beside it — never one from the network — exists, and says in its
 *      alt text what it shows. The pictures come from a local dev server's demo data, never production.
 *   --prove-red: each check catches its own plant, made in memory on the guide's text.
 *
 * Pure and static: it reads files and parses source; no server, no database.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
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
/** What a reader sees: no markup, no comments, no style; the audit table's names taken out first when asked. */
function visible(html: string, opts: { withoutAuditNames?: boolean } = {}): string {
  let h = stripStyle(html);
  if (opts.withoutAuditNames) h = h.replace(/<td class="mono">[\s\S]*?<\/td>/g, " ");
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

// ── The one place the guide links: the binding rules players accept, as 50pick publishes them ──────────
/** S6-GUIDE · the published Millionea rules page — the binding text part 1 sums up, which an admin can open. */
const RULES_PAGE = "https://www.50pick.tz/legal/rules/millionea";
/** Every link target the guide carries, in order. */
const linksOf = (html: string): string[] => [...stripStyle(html).matchAll(/<a\b[^>]*?\bhref="([^"]*)"/g)].map((m) => m[1]);

/** S6-GUIDE 4 · every picture the guide shows: a committed image beside it (docs/…), present, with alt text in words. */
function picturesOf(html: string): Array<{ src: string; problem: string | null }> {
  return [...stripStyle(html).matchAll(/<img\b[^>]*>/g)].map((m) => {
    const src = /\bsrc="([^"]*)"/.exec(m[0])?.[1] ?? "";
    const alt = /\balt="([^"]*)"/.exec(m[0])?.[1] ?? "";
    if (!src) return { src, problem: "no source" };
    if (/^(?:[a-z]+:|\/\/|\/)/i.test(src)) return { src, problem: "not a committed image beside the guide" };
    if (!existsSync(join(root, "docs", src))) return { src, problem: "the file is missing" };
    if (alt.trim().split(/\s+/).length < 3) return { src, problem: "no alt text in words" };
    return { src, problem: null };
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
    // S6-GUIDE · a rule number is a programme code too, inside a link or out of one: part 1 states each rule in words.
    ["a rule number", /\bMR-\d/], ["a RULES section number", /\bRULES §/],
  ];
  const codeHits = CODES.filter(([, re]) => re.test(text)).map(([n, re]) => `${n}: "${(text.match(re) ?? [""])[0]}"`);
  v.codes = { ok: codeHits.length === 0, detail: codeHits.join(" · ") };

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

  const pictures = picturesOf(html);
  const badPictures = pictures.filter((p) => p.problem);
  v.pictures = { ok: badPictures.length === 0, detail: badPictures.map((p) => `${p.src || "(no src)"}: ${p.problem}`).join(" · ") };

  const stray = linksOf(html).filter((href) => href !== RULES_PAGE);
  const named = p1 >= 0 && p2 > p1 && linksOf(html.slice(p1, p2)).includes(RULES_PAGE);
  v.refs = { ok: stray.length === 0 && named,
    detail: [...stray.map((href) => `a link to somewhere else: ${href}`), ...(named ? [] : ["part 1 does not name the published rules"])].join(" · ") };
  return v;
}

const guide = read(GUIDE);
const verdict = judge(guide);
const NAMES: Record<string, string> = {
  parts: "1 · three parts in order: how it works, how admins run it, what everything means",
  steps: "1 · every step of part 2 states who, where, what is refused and what to do then — each in words, with a role named",
  labels: "2 · ⭐ every label the guide quotes is printed by its own screen's source (whole, or the fixed head of a run-time label)",
  codes: "3 · no programme code reaches the reader — not even a rule number",
  names: "3 · no file, path, code identifier, type or table name reaches the reader",
  audit: "3 · the audit table lists exactly the Millionea audit actions the source writes",
  refs: "4 · the guide links only to the binding rules players accept, and part 1 names them",
  pictures: "5 · every screenshot is a committed image beside the guide, present, with alt text in words",
};
for (const [k, n] of Object.entries(NAMES)) ok(n, verdict[k].ok, verdict[k].detail);
const steps = stepsOf(guide).length, labels = labelsOf(guide).length, pictureCount = picturesOf(guide).length;
console.log(`  (${steps} steps · ${labels} quoted labels over ${new Set(labelsOf(guide).map((l) => l.screen)).size} screens · ${pictureCount} screenshots · ${linksOf(guide).length} link(s) · ${SOURCE_ACTIONS.size} audit actions)`);
// Floors, at the counts a green run printed: the guide never quietly loses its steps, its quoted labels or its pictures.
// S6-GUIDE 3 · 27 → 28 steps (S6-MONEY's payment of a winner who cannot sign in) and 318 → 353 labels.
// S6-GUIDE 4 · the label floor FALLS 353 → 288 by the owner's own order (Ali, 2026-10-23: "guide no unneeded words, no
// unneeded titles"; the lead approved the fall): each list's spelled-out search, filter and sort names are cut, because
// the screenshots now show those controls. It is a deliberate cut, recorded — never a quiet loss. Nine screenshots.
ok("1 · floor: at least 28 steps in part 2", steps >= 28, `${steps}`);
ok("2 · floor: at least 288 quoted labels", labels >= 288, `${labels}`);
ok("5 · floor: at least 9 screenshots", pictureCount >= 9, `${pictureCount}`);

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
  plant("a rule number (MR-16)", "codes", "It is not a void and not a stop.", "It is not a void and not a stop (MR-16).");
  plant("a rule number as a link's words", "codes", ">50pick.tz/legal/rules/millionea</a>", ">MR-30</a>");
  plant("a RULES section number", "codes", "It is not a void and not a stop.", "It is not a void and not a stop (RULES §2.12).");
  plant("a file name", "names", "It is not a void and not a stop.", "It is not a void and not a stop, says maswali-pause.ts.");
  plant("a code identifier", "names", "It is not a void and not a stop.", "It is not a void and not a stop: read salesPause.");
  plant("a table name", "names", "It is not a void and not a stop.", "It is not a void and not a stop on MaswaliCycle.");
  plant("an audit name the source never writes", "audit", '<td class="mono">maswali.week.drafted</td>', '<td class="mono">maswali.week.invented</td>');
  plant("an audit action left out of the table", "audit", /<tr><td class="mono">maswali\.week\.voided<\/td><td>[^<]*<\/td><\/tr>/, "");
  plant("the rules link pointed into the repository", "refs", '<a href="https://www.50pick.tz/legal/rules/millionea">',
    '<a href="https://github.com/alisheib/kipindi/blob/main/docs/MASWALI-PLAN.md#g--money">');
  plant("a second link, to a programme document", "refs", "It is not a void and not a stop.",
    'It is not a void and not a stop (<a href="https://github.com/alisheib/kipindi/blob/main/docs/RULES.md">the rules</a>).');
  plant("part 1 without the published rules", "refs", /<a href="https:\/\/www\.50pick\.tz\/legal\/rules\/millionea">([^<]*)<\/a>/, "$1");
  plant("a part missing", "parts", '<h2 id="part-3">', '<h2 id="part-three">');
  plant("a screenshot whose file is gone", "pictures", 'src="guide-img/maswali/weeks.png"', 'src="guide-img/maswali/weeks-gone.png"');
  plant("a screenshot from the network", "pictures", 'src="guide-img/maswali/weeks.png"', 'src="https://www.50pick.tz/weeks.png"');
  plant("a screenshot without alt text", "pictures", /(<img src="guide-img\/maswali\/weeks\.png") alt="[^"]*"/, '$1 alt=""');
}

console.log(`\nmaswali-admin-guide: ${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
