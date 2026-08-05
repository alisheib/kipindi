/**
 * UI-consistency linter — the static half of the platform-wide UI-consistency
 * program (Phase 0). The rendered half lives in scripts/responsive-audit.mjs
 * (tap sizes, overflow, focus rings); this catches DRIFT FROM THE KIT in source:
 * native controls where a kit primitive exists, hard-coded design-token literals,
 * ad-hoc portals off the kit Modal, undefined CSS classes, raw buttons that should
 * be the kit <Button>, inline height overrides on .btn-*, and tables that skip the
 * shared .admin-tbl skin.
 *
 * Baseline model (so "detect everything" is enforceable without a big-bang fix):
 *   - Findings are aggregated to a COUNT per `rule::file` (robust to line shifts).
 *   - scripts/ui-consistency-baseline.json records today's known counts.
 *   - The suite FAILS only when a (rule,file) exceeds its baseline count, or a new
 *     (rule,file) appears — i.e. NEW drift. Pre-existing drift is tracked, not fatal.
 *   - As each remediation phase lands, regenerate the baseline; the counts shrink.
 *   - DONE = the baseline is empty (see docs/UI-CONSISTENCY-AUDIT.md).
 *
 * Run:     npm run test:ui-consistency
 * Rebase:  npm run test:ui-consistency -- --update-baseline   (after a remediation)
 * Report:  npm run test:ui-consistency -- --report            (per-rule tally, no fail)
 */
import { readFileSync, readdirSync, statSync, writeFileSync, existsSync } from "node:fs";
import { join, relative, basename } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const SRC = join(ROOT, "src");
const BASELINE = join(ROOT, "scripts", "ui-consistency-baseline.json");
const UPDATE = process.argv.includes("--update-baseline");
const REPORT = process.argv.includes("--report");

// ---------------------------------------------------------------------------
// File walk — every .ts/.tsx under src, excluding declaration files.
// ---------------------------------------------------------------------------
function walk(dir: string): string[] {
  const out: string[] = [];
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (/\.(tsx?|mts)$/.test(e) && !e.endsWith(".d.ts")) out.push(p);
  }
  return out;
}
const rel = (f: string) => relative(ROOT, f).replace(/\\/g, "/");

// Strip JS/TS/JSX comments so commented-out examples never trip a rule.
function decomment(s: string): string {
  return s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}

type Finding = { rule: string; file: string; line: number; snippet: string };

// Portals that are legitimate NON-MODAL overlays — each is a distinct, sanctioned
// pattern (NOT a centered dialog, so the kit Modal is the wrong tool):
//   modal/select/tooltip/toast  — kit overlay primitives
//   avatar-menu/notifications-panel — intentional slide-overs
//   action-overlay              — admin progress/result overlay primitive
//   admin-mobile-nav            — admin nav drawer
//   needle-drawer               — the Needle bottom-sheet (Modal `sheet` is centered ≥sm)
//   market-card                 — the "How it works" hover popover (anchored, not modal)
//   share-button                — the share menu popover (anchored dropdown)
// Anything ELSE calling createPortal is an ad-hoc overlay that should adopt the kit.
const PORTAL_ALLOW = new Set([
  "modal.tsx", "select.tsx", "date-select.tsx", "tooltip.tsx", "toast.tsx",
  "avatar-menu.tsx", "notifications-panel.tsx",
  "action-overlay.tsx", "admin-mobile-nav.tsx", "needle-drawer.tsx",
  "market-card.tsx", "share-button.tsx",
]);
// Kit files that legitimately render the native element they wrap.
const KIT_NATIVE = new Set(["select.tsx", "checkbox.tsx", "toggle.tsx", "button.tsx", "submit-button.tsx"]);
// Native date/time entry that is DELIBERATELY kept native: the market-resolution
// timestamp is money-critical and the browser's `datetime-local` is the most reliable
// precise-entry control; the kit has no combined date+time picker (only a range filter).
// Documented in docs/design-system/.../07-provenance/OPEN-GAPS.md.
const DATETIME_ALLOW = new Set(["events-client.tsx", "wizard.tsx"]);
// The kit primitives (and kit-level overlays) legitimately author raw `<button class="btn">`
// — they DEFINE the kit; flagging them as "should use <Button>" is a false positive.
const isKitFile = (f: string) => {
  const p = f.replace(/\\/g, "/");
  return p.includes("/components/ui/") || p.endsWith("/action-overlay.tsx");
};

type Rule = {
  id: string;
  severity: "error" | "warning";
  desc: string;
  scan: (body: string, file: string) => Array<{ index: number; snippet: string }>;
};

// Helper: collect all regex matches with their string index.
function matches(re: RegExp, body: string): Array<{ index: number; snippet: string }> {
  const out: Array<{ index: number; snippet: string }> = [];
  for (const m of body.matchAll(re)) {
    out.push({ index: m.index ?? 0, snippet: m[0].replace(/\s+/g, " ").trim().slice(0, 80) });
  }
  return out;
}
// Helper: className attribute values (string literals) with their index.
function classNames(body: string): Array<{ index: number; value: string; raw: string }> {
  const out: Array<{ index: number; value: string; raw: string }> = [];
  for (const m of body.matchAll(/className=\{?["'`]([^"'`]+)["'`]/g)) {
    out.push({ index: m.index ?? 0, value: m[1], raw: m[0] });
  }
  return out;
}

const RULES: Rule[] = [
  {
    id: "native-select",
    severity: "error",
    desc: "raw <select> — use the kit <Select> (src/components/ui/select.tsx)",
    scan: (b, f) => (KIT_NATIVE.has(basename(f)) ? [] : matches(/<select[\s>]/g, b)),
  },
  {
    id: "native-datetime",
    severity: "error",
    desc: "native date/time input — use kit DateSelect/TimeSelect/DateTimeRangeFilter (DATETIME_ALLOW = deliberate money-critical exceptions)",
    scan: (b, f) => (DATETIME_ALLOW.has(basename(f)) ? [] : matches(/type=["'](?:datetime-local|date|time|month|week)["']/g, b)),
  },
  {
    id: "native-checkbox",
    severity: "error",
    desc: "raw <input type=checkbox> — use the kit <Checkbox>",
    scan: (b, f) => (KIT_NATIVE.has(basename(f)) ? [] : matches(/type=["']checkbox["']/g, b)),
  },
  {
    id: "hardcoded-pill-active",
    severity: "error",
    desc: "hard-coded --pill-active literal — use var(--pill-active)",
    scan: (b) => matches(/oklch\(\s*40%\s+0\.12\s+262\s*\/\s*0\.35\s*\)/g, b),
  },
  {
    id: "adhoc-portal",
    severity: "warning",
    desc: "createPortal off the kit Modal — use <Modal> / <Modal sheet> (has focus-trap + scroll-lock)",
    scan: (b, f) => (PORTAL_ALLOW.has(basename(f)) ? [] : matches(/createPortal\s*\(/g, b)),
  },
  {
    id: "undefined-admin-table-class",
    severity: "error",
    desc: "className 'admin-table' is not defined in globals.css (only .admin-tbl) — renders unstyled",
    scan: (b) =>
      classNames(b)
        .filter((c) => /\badmin-table\b/.test(c.value))
        .map((c) => ({ index: c.index, snippet: c.raw.slice(0, 80) })),
  },
  {
    id: "raw-button-btn-class",
    severity: "warning",
    desc: "raw <button className='btn …'> — prefer the kit <Button> (spinner, aria-busy, icon slots)",
    scan: (b, f) =>
      KIT_NATIVE.has(basename(f)) || isKitFile(f)
        ? []
        : matches(/<button\b[^>]*?className=\{?["'`][^"'`]*\bbtn\b[^"'`]*["'`]/gs, b),
  },
  {
    // 🔴 E-91 · A CONTROL THAT LOOKS LIKE A LABEL. `raw-button-btn-class` catches a hand-rolled
    // button that at least wears the kit's `btn` class — it cannot see one that wears nothing at
    // all, which is the worse case. Measured on production: the Up & Down chain row's `Stop`
    // rendered with no background, no border and 6.65:1 ink beside three siblings at 16.8–17.4,
    // so the ONE destructive control on the page was the one that did not look pressable.
    //
    // ⚠️ Deliberately narrow. A button carrying a component CSS class (`cm-send`, `pchart-range`)
    // or any paint at all (`bg-`, `border`, `ring-`, `shadow`, `rounded-full`, `underline`) is
    // styled somewhere and is not what this is looking for. What is flagged is a `<button>` whose
    // entire appearance is type.
    id: "bare-text-button",
    severity: "warning",
    desc: "a <button> painted only with type — no kit `btn`, no background, no border. Reads as a label, not a control",
    scan: (b, f) => {
      if (isKitFile(f)) return [];
      const out: Array<{ index: number; snippet: string }> = [];
      for (const m of b.matchAll(/<button\b([^>]*)>/gs)) {
        const cm = m[1].match(/className=\{?["'`]([^"'`]+)["'`]/);
        if (!cm) continue;                                   // no className at all → unstyled by intent
        const cls = cm[1];
        if (/\b(btn|bg-|border|ring-|shadow|chip|rounded-full|underline)/.test(cls)) continue;
        out.push({ index: m.index ?? 0, snippet: m[0].slice(0, 90) });
      }
      return out;
    },
  },
  {
    // 🔴 E-98 · A CONTROL THAT HIDES ITS OWN ANSWER. A dropdown's CLOSED trigger is the only
    // place an operator reads what they chose, so `truncate` there is not a layout fix — it is
    // data loss, which `scripts/admin-clip.test.mts` §1.3 already says in as many words about
    // the KPI delta. Measured on production at 1280: the Up & Down winning band rendered
    // `Smallest possible (reco…` — hiding the one word that tells an operator which band to
    // pick — and the chain Edit panel rendered `Inherit · smal…`, 162px of a 307px label gone,
    // on the control that decides what winning MEANS for a chain that already holds stakes.
    //
    // ⛔ WHY A STATIC RULE AND NOT A SCREENSHOT CHECK. Truncation is PAINT: `innerText` returns
    // the whole string however little of it is visible, so every DOM-text assertion passes with
    // the label completely invisible. This session wrote one of those and watched it score green
    // beside the screenshot that disproved it. Geometry (`scrollWidth > clientWidth`) is the only
    // honest runtime measure — `scripts/live-s28-clip.mjs` does that against production — and
    // this rule is the cheap half: it stops the kit being edited back.
    //
    // ⚠️ SCOPED TO THE TRIGGER, NOT THE FILE. `truncate` is correct and common elsewhere in the
    // same file — the OPTION labels in the open panel legitimately truncate when they carry no
    // hint. A file-wide grep for the word would fail on correct code, which is the "assert the
    // call site, not the symbol" trap in the standards skill §5b.
    id: "combobox-trigger-truncates",
    severity: "error",
    desc: "a role=combobox trigger truncates its selected label — the operator cannot read what they chose (E-98)",
    scan: (b) => {
      const out: Array<{ index: number; snippet: string }> = [];
      for (const m of b.matchAll(/role="combobox"/g)) {
        const from = m.index ?? 0;
        const end = b.indexOf("</button>", from);
        if (end < 0) continue;                       // not a <button> trigger — nothing to judge
        const trigger = b.slice(from, end);
        // ⛔ Comments stripped FIRST. A guard that greps for a defect will match the comment
        // explaining its fix — this repo has been bitten by that twice in one session.
        const code = trigger.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
        if (/\btruncate\b/.test(code)) {
          out.push({ index: from, snippet: code.replace(/\s+/g, " ").trim().slice(0, 90) });
        }
      }
      return out;
    },
  },
  {
    id: "btn-inline-height-override",
    severity: "warning",
    desc: "height override (h-N / min-h-[] ) on a .btn — size via --h-control-* tokens, not utilities",
    scan: (b) =>
      classNames(b)
        .filter((c) => /\bbtn\b/.test(c.value) && /(?:^|\s)(h-\d|min-h-\[)/.test(c.value))
        .map((c) => ({ index: c.index, snippet: c.raw.slice(0, 80) })),
  },
  {
    id: "table-not-admin-tbl",
    severity: "warning",
    desc: "<table> not using the shared .admin-tbl skin — adopt it (or the AdminTable helper)",
    scan: (b) => {
      const out: Array<{ index: number; snippet: string }> = [];
      for (const m of b.matchAll(/<table\b([^>]*)>/g)) {
        const attrs = m[1];
        // HTML-email layout tables (role="presentation") are not admin data tables — skip.
        if (/role=["']presentation["']/.test(attrs)) continue;
        const cls = attrs.match(/className=\{?["'`]([^"'`]+)["'`]/);
        const classVal = cls ? cls[1] : "";
        if (!/\badmin-tbl\b/.test(classVal)) {
          out.push({ index: m.index ?? 0, snippet: `<table ${attrs.trim()}>`.slice(0, 80) });
        }
      }
      return out;
    },
  },
];

// ---------------------------------------------------------------------------
// Scan.
// ---------------------------------------------------------------------------
const files = walk(SRC);
const findings: Finding[] = [];
for (const f of files) {
  const relFile = rel(f);
  const body = decomment(readFileSync(f, "utf8"));
  const lineStarts: number[] = [0];
  for (let i = 0; i < body.length; i++) if (body[i] === "\n") lineStarts.push(i + 1);
  const lineOf = (idx: number) => {
    let lo = 0, hi = lineStarts.length - 1;
    while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (lineStarts[mid] <= idx) lo = mid; else hi = mid - 1; }
    return lo + 1;
  };
  for (const r of RULES) {
    for (const hit of r.scan(body, f)) {
      findings.push({ rule: r.id, file: relFile, line: lineOf(hit.index), snippet: hit.snippet });
    }
  }
}

// Aggregate to counts per `rule::file`.
const counts = new Map<string, number>();
for (const fd of findings) counts.set(`${fd.rule}::${fd.file}`, (counts.get(`${fd.rule}::${fd.file}`) ?? 0) + 1);

const severityOf = (ruleId: string) => RULES.find((r) => r.id === ruleId)!.severity;

// Per-rule tally (for the report + tracker doc).
const perRule = new Map<string, number>();
for (const fd of findings) perRule.set(fd.rule, (perRule.get(fd.rule) ?? 0) + 1);

function printTally() {
  console.log("  Findings by rule:");
  for (const r of RULES) {
    const n = perRule.get(r.id) ?? 0;
    console.log(`    ${n.toString().padStart(4)}  [${r.severity === "error" ? "E" : "W"}] ${r.id}`);
  }
  console.log(`  ── ${findings.length} findings across ${counts.size} (rule,file) pairs, ${files.length} source files.`);
}

// ---------------------------------------------------------------------------
// --update-baseline: write today's counts and exit.
// ---------------------------------------------------------------------------
if (UPDATE) {
  const obj: Record<string, number> = {};
  for (const k of [...counts.keys()].sort()) obj[k] = counts.get(k)!;
  const payload = {
    _note:
      "UI-consistency baseline: known drift counts per rule::file. Regenerate after a remediation " +
      "phase with `npm run test:ui-consistency -- --update-baseline`. DONE when this is empty. " +
      "See docs/UI-CONSISTENCY-AUDIT.md.",
    _generated: "run with --update-baseline",
    _total: findings.length,
    counts: obj,
  };
  writeFileSync(BASELINE, JSON.stringify(payload, null, 2) + "\n");
  console.log("UI-consistency linter — baseline updated\n");
  printTally();
  console.log(`\n  Wrote ${counts.size} (rule,file) entries to ${rel(BASELINE)}`);
  process.exit(0);
}

// ---------------------------------------------------------------------------
// --report: tally only, never fail.
// ---------------------------------------------------------------------------
if (REPORT) {
  console.log("UI-consistency linter — report\n");
  printTally();
  process.exit(0);
}

// ---------------------------------------------------------------------------
// Compare against the baseline. Fail ONLY on new/increased drift.
// ---------------------------------------------------------------------------
console.log("UI-consistency linter\n");
if (!existsSync(BASELINE)) {
  console.log("  FAIL — no baseline file. Generate one with:");
  console.log("         npm run test:ui-consistency -- --update-baseline");
  process.exit(1);
}
const baseline: Record<string, number> = JSON.parse(readFileSync(BASELINE, "utf8")).counts ?? {};

const regressions: string[] = [];
for (const [key, n] of counts) {
  const base = baseline[key] ?? 0;
  if (n > base) {
    const [rule, file] = key.split("::");
    const extra = findings
      .filter((fd) => fd.rule === rule && fd.file === file)
      .slice(0, 3)
      .map((fd) => `L${fd.line} ${fd.snippet}`)
      .join("  ·  ");
    regressions.push(`[${severityOf(rule) === "error" ? "E" : "W"}] ${rule} in ${file}: ${base} → ${n}\n        ${extra}`);
  }
}
// Fixed (baseline higher than current) — not a failure; a nudge to re-baseline.
const fixed: string[] = [];
for (const [key, base] of Object.entries(baseline)) {
  const n = counts.get(key) ?? 0;
  if (n < base) fixed.push(`${key}: ${base} → ${n}`);
}

const baselineTotal = Object.values(baseline).reduce((a, b) => a + b, 0);
printTally();
console.log(`\n  Baseline: ${Object.keys(baseline).length} (rule,file) pairs, ${baselineTotal} known findings.`);

if (fixed.length) {
  console.log(`\n  ✓ ${fixed.length} baseline entr${fixed.length === 1 ? "y" : "ies"} improved — re-baseline to lock in the win:`);
  for (const s of fixed.slice(0, 20)) console.log(`      ${s}`);
  console.log("      → npm run test:ui-consistency -- --update-baseline");
}

if (regressions.length) {
  console.log(`\n  FAIL — ${regressions.length} NEW/increased drift (not in the baseline):\n`);
  for (const s of regressions) console.log(`      ${s}`);
  console.log("\n  Fix the drift (use the kit primitive), or if intentional, re-baseline with a documented reason.");
  process.exit(1);
}

console.log("\n  ALL PASS — no new UI-consistency drift beyond the tracked baseline.");
process.exit(0);
