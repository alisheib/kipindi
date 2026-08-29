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
import { decomment } from "./lib/decomment.mts";

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

/**
 * Helper: EVERY string literal in the file, with the index its CONTENT starts at.
 *
 * ⭐ Why this exists beside `classNames()`. That helper reads `className="…"`, which
 * is the one form a drifting class list is NOT written in — `cn(…)`, an array
 * `.join(" ")` and a template literal all hide their tokens from it. That is
 * literally how `refresh-button.tsx` and `admin/markets/page.tsx` each carried a
 * `btn-sm h-8` past every className rule in this file until Stage 3 swept them by
 * hand. A class token is a class token wherever it is written.
 *
 * 🔴 EACH LITERAL IS CLOSED BY ITS OWN DELIMITER. A single character class for all
 * three quotes — `/["'`]([^"'`]*)["'`]/g` — pairs an opening BACKTICK with the next
 * DOUBLE quote, so on `` `base ${on ? "h-8" : ""}` `` the interpolated tokens land
 * in the gap between matches and are never seen. That is standards §5b#6 (the
 * `test:bridge` one-character blind spot) in a new costume; measured while writing
 * `scripts/type-scale.test.mts`, where the same bug hid 22 real usages.
 */
function stringLiterals(body: string): Array<{ index: number; value: string }> {
  const out: Array<{ index: number; value: string }> = [];
  const re = /"((?:\\.|[^"\\\n])*)"|'((?:\\.|[^'\\\n])*)'|`((?:\\.|[^`\\])*)`/g;
  for (const m of body.matchAll(re)) {
    const value = m[1] ?? m[2] ?? m[3] ?? "";
    if (value.trim()) out.push({ index: (m.index ?? 0) + 1, value });
  }
  return out;
}

/**
 * ⛔ COMPONENTS WHOSE ACCESSIBLE-NAME PROP IS camelCase AND CANNOT RECEIVE THE HYPHENATED ONE.
 *
 * 🔴 TypeScript CANNOT see this mistake. A JSX attribute whose name contains a hyphen is exempt
 * from excess-property checking — TS assumes `aria-*`/`data-*` passthrough — so
 * `<Select aria-label="Category">` compiles clean, is dropped on the floor by a component whose
 * prop is `ariaLabel`, and the control ships with the generic fallback name. Found 2026-08-26 on
 * production: the re-categorise combobox announced itself as "Select…", and the live driver that
 * was supposed to prove the feature located it by that same attribute — so it matched nothing,
 * every leg was unrunnable, and the one leg that did run asserted an ABSENCE and passed vacuously.
 *
 * ⭐ THE LIST IS DERIVED, NEVER TYPED OUT. A hand-written list rots the moment a kit component
 * gains or loses a rest spread. A component qualifies when its source names `ariaLabel`, does NOT
 * declare the quoted `"aria-label"` prop (Toggle does, and is correctly exempt), and spreads no
 * rest props (TimeSelect reads `rest["aria-label"]` and PhoneInput spreads it — both forward fine).
 */
const ARIA_LABEL_CAMEL_ONLY: Set<string> = (() => {
  const out = new Set<string>();
  for (const f of walk(join(SRC, "components", "ui"))) {
    if (!f.endsWith(".tsx")) continue;
    const b = readFileSync(f, "utf8");
    if (!/\bariaLabel\b/.test(b)) continue;
    if (/["']aria-label["']\s*[?:]/.test(b)) continue;
    if (/\.\.\.(rest|props|other)\b/.test(b)) continue;
    for (const m of b.matchAll(/export function ([A-Z][A-Za-z0-9]*)/g)) out.add(m[1]);
  }
  return out;
})();

const RULES: Rule[] = [
  {
    id: "dropped-aria-label-prop",
    severity: "error",
    desc: "hyphenated aria-label passed to a kit component whose prop is ariaLabel — tsc cannot see it and it is silently DROPPED, shipping the generic fallback name",
    scan: (b, f) => {
      if (isKitFile(f)) return [];
      const out: Array<{ index: number; snippet: string }> = [];
      for (const m of b.matchAll(/<([A-Z][A-Za-z0-9]*)\s([^<>]*?)\/?>/g)) {
        if (!ARIA_LABEL_CAMEL_ONLY.has(m[1])) continue;
        if (!/\baria-label\s*=/.test(m[2] ?? "")) continue;
        out.push({ index: m.index ?? 0, snippet: `<${m[1]} aria-label=…> should be ariaLabel` });
      }
      return out;
    },
  },
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
    /* ⭐ DG-A-09 — A `<tr>` MUST NOT RE-AUTHOR THE ROW HOVER. `globals.css`'s
       `.admin-tbl tbody tr:hover` is specificity (0,2,2) and a `hover:bg-*` utility is (0,2,0),
       and the compiled sheet has ZERO `@layer`, so the canon wins every time: a call-site row
       hover is DEAD CSS that looks like a decision. Four existed when this rule was written —
       two admin, and ⚠️ two PLAYER, because `.admin-tbl` is not admin-only (`/leaderboard`,
       `/profile/account`). All four asked for `/40` or `/50` and all four rendered the canon's
       50%. Deleted, so this rule ships at ZERO findings and writes no baseline entry — any
       reintroduction is a NEW (rule,file) pair and fails.
       ⛔ It matches a `<tr>` ONLY. A `hover:bg-*` on a control inside a cell is that control's
       own affordance and is none of this rule's business — the register's version of this
       finding ("delete per-cell hover:bg-*") would have stripped five real button hovers and
       condemned the kit's own `tr:hover td:first-child` inset bar. */
    id: "tr-restates-row-hover",
    severity: "error",
    desc: "a <tr> re-authors the row hover — dead CSS, .admin-tbl tbody tr:hover (0,2,2) always wins",
    scan: (b) => matches(/<tr\b[^>]*\bhover:bg-/g, b),
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
      // ⚠️ `[^>]*` STOPS AT THE FIRST `>`, AND AN ARROW FUNCTION CONTAINS ONE. Any button
      // written `onClick={() => …}` — which is most of them — ends its match at the `=>`,
      // so `className` is never captured and the button is silently skipped. Found
      // 2026-08-21 when simplifying one handler to `onClick={open}` made a button the rule
      // had never been able to see appear as "new drift". ⛔ The rule has therefore been
      // UNDER-reporting for its whole life, and the lazy match below is the fix.
      // (Measured: seeing those buttons at last did NOT raise the count — the icon
      // exemption below retired more false positives than the wider match added, 58 → 55.)
      for (const m of b.matchAll(/<button\b((?:[^>]|=>)*?)>/gs)) {
        const cm = m[1].match(/className=\{?["'`]([^"'`]+)["'`]/);
        if (!cm) continue;                                   // no className at all → unstyled by intent
        const cls = cm[1];
        if (/\b(btn|bg-|border|ring-|shadow|chip|rounded-full|underline)/.test(cls)) continue;
        // ⭐ AN ICON IS PAINT. The rule's own words are "painted ONLY with type" — a button
        // carrying a kit glyph or an inline SVG is not that. `<span>text</span><I.edit/>` is
        // the product's edit-in-place affordance, and a pencil is precisely what tells a
        // reader the text is pressable. Flagging it would push authors toward a `btn` on a
        // control the design deliberately keeps quiet.
        const body = b.slice((m.index ?? 0) + m[0].length, (m.index ?? 0) + m[0].length + 600);
        const end = body.indexOf("</button>");
        if (/<(?:I\.|svg\b|Glyph)/.test(end >= 0 ? body.slice(0, end) : body)) continue;
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
    // 🔴 E-100 · AN IDENTIFIER THAT CANNOT BREAK. Found by Ali on a real phone, on `/wallet`:
    // the TICKET box read `pos_e290a28e8e906b6255…` running straight out of its border, while
    // TRANSACTION ID **in the same grid, two boxes up** wrapped perfectly — because those two
    // carried `break-all` and the ticket did not. A ticket a player cannot read in full is a
    // ticket they cannot quote to support, which is the only reason it is printed at all.
    //
    // These strings are `pos_…` / `txn_…` cuids: one unbroken 28-character token with no spaces
    // and no hyphens, so normal wrapping CANNOT act on it. It needs `break-all` explicitly, and
    // that is what makes this a rule rather than a preference.
    //
    // ⚠️ `whitespace-nowrap` and `truncate` are ACCEPTED, not flagged. In a scrolling admin
    // table a nowrap id is correct (the table scrolls, the cell does not clip), and a truncated
    // one with the full value reachable is the documented pattern in `admin-clip.test.mts` §1.3.
    // Flagging those would condemn correct code, which teaches people to ignore the detector —
    // the same damage as missing the defect (E-97's first version did exactly that).
    id: "unwrappable-identifier",
    severity: "warning",
    desc: "a raw id (pos_/txn_ cuid) rendered in a mono element with no way to break — it will run out of its box on a narrow screen (E-100)",
    scan: (b) => {
      const out: Array<{ index: number; snippet: string }> = [];
      // Opening tag → its closing tag, so the className and the content are judged together.
      for (const m of b.matchAll(/<(p|span)\b([^>]*className=\{?["'`]([^"'`]*)["'`][^>]*)>([\s\S]{0,300}?)<\/\1>/g)) {
        const cls = m[3] ?? "";
        const inner = m[4] ?? "";
        if (!/\bfont-mono\b/.test(cls)) continue;
        // Does it render an identifier rather than a formatted value?
        if (!/\{\s*[\w.?]*\b(positionId|providerRef|\w+Ref|tx\.id|txnId|referenceId)\s*\}/.test(inner)) continue;
        if (/\b(break-all|break-words|whitespace-nowrap|truncate)\b/.test(cls)) continue;
        if (/overflow-wrap/.test(cls)) continue;
        out.push({ index: m.index ?? 0, snippet: m[0].replace(/\s+/g, " ").trim().slice(0, 110) });
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
    // 🔴 THE NUMERIC-SIZE TRAP · A CLASS THAT MEANS ROUGHLY DOUBLE WHAT IT SAYS.
    //
    // `tailwind.config.ts` REPLACES the numeric spacing keys (theme.extend.spacing,
    // ~line 200): the product's 4px-step scale maps 7→40px, 8→48, 9→64, 10→80,
    // 11→96, 12→128. Stock Tailwind maps the same keys to 28/32/36/40/44/48. So an
    // author reaching for the height they have typed a thousand times in other
    // projects writes `h-8` meaning 32px and ships **48px**, and `h-10` meaning
    // 40px and ships **80px** — a control twice the size of its neighbours, on a
    // dense admin row, with nothing in the class name to hint at it.
    //
    // ⚠️ This is not theoretical: Stage 3 of this campaign swept ~121 accidental
    // sites. `src/components/admin/refresh-button.tsx` and
    // `src/app/admin/markets/page.tsx` both carry a comment where the bug used to
    // be ("⛔ NO `h-8` OVERRIDE. It rendered 48px (overridden scale) and fought…").
    // This rule is what stops them coming back — the sweep was manual and a manual
    // sweep is a one-off.
    //
    // ⛔ SCANNED FROM EVERY STRING LITERAL, NOT FROM `className="…"`. Those two
    // files hid their `h-8` inside `cn()` and a template literal, which is exactly
    // why no existing rule here could see them. See `stringLiterals` above.
    //
    // ⚠️ ~56 OF THE SITES BELOW ARE CORRECT AND ARE BASELINED, NOT "FIXED". The
    // modal ✕ and the toast dismiss really are 48px; `filter-pill`, `pagination`,
    // `menu-shell` and `language-menu` carry explicit "never a scale token"
    // warnings at their call sites; a 40px `h-7 w-7` icon button is the tap-target
    // floor doing its job. Condemning correct code teaches people to ignore the
    // detector, which costs exactly as much as missing the defect (standards
    // §5b#9). The baseline is the honest place for them.
    //
    // Scope note: `max-h-`/`max-w-` are included even though the tree has ZERO of
    // them today — they read from the same overridden scale, so leaving them out
    // would be an opening rather than an exemption, and including them costs no
    // baseline entry. The lookahead rejects `w-7/12` (a fraction is a different
    // class, and `test:bridge` was burned by a terminator list that erased a real
    // distinction — standards §5b#6).
    id: "numeric-size-utility",
    severity: "error",
    desc: "h-/w-/min-/max- with a numeric key 7–12 — the spacing scale is OVERRIDDEN (h-8 = 48px, h-10 = 80px), so this renders ~double. Use an explicit literal (h-[32px]) or a --h-control-* token",
    scan: (b) => {
      const out: Array<{ index: number; snippet: string }> = [];
      // Built as a plain literal — no runtime-escaped fragments. Standards §5b#7:
      // escaping in two alphabets at once mis-parses silently.
      //
      // ⚠️ THE LEADING BOUNDARY IS NOT JUST WHITESPACE, and the red proof is what
      // taught it. `` `w-9 ${live ? "h-7" : ""}` `` yielded the `w-9` and swallowed
      // the `h-7`: inside a template literal the nested token is preceded by a
      // QUOTE, not a space, so a `(?:^|\s)` boundary walks straight past it — a
      // half-blind rule that reports the easy half of a defect and looks like it
      // works. The class below is every character that can legally sit before a
      // class token in JS/JSX source, minus `-` and word characters (which would
      // let `foo-h-8` match).
      const TOKEN = /(?:^|[\s"'`{(,?:])((?:[a-z0-9.-]+:)*)(min-h|min-w|max-h|max-w|h|w)-(7|8|9|10|11|12)(?![\d./a-zA-Z-])/g;
      for (const lit of stringLiterals(b)) {
        for (const m of lit.value.matchAll(TOKEN)) {
          // +offset of the token inside the match (the boundary char is not part of it).
          const off = (m.index ?? 0) + m[0].length - (m[1].length + m[2].length + m[3].length + 1);
          out.push({
            index: lit.index + off,
            snippet: `${m[1]}${m[2]}-${m[3]}  in  "${lit.value.replace(/\s+/g, " ").trim().slice(0, 70)}"`,
          });
        }
      }
      return out;
    },
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
