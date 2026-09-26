/**
 * ⛔ ONE SAVE ON SCREEN, NEVER TWO — as a gate that fails, not a kit option a caller can forget.
 *
 *   npx tsx scripts/single-save.test.mts     (npm run test:single-save · control: npm run red:single-save)
 *
 * The owner, 2026-09-22: *"we have 2 save buttons, one pending changes and one always there, I don't
 * know when should both be visible"*. And again, 2026-09-26: *"there are multiple save buttons — when I
 * change something the pending-changes bar appears but I also have a Save button; users are confused
 * whether the save worked or not."*
 *
 * 🔴 WHY THE SECOND SENTENCE WAS POSSIBLE AFTER THE FIRST WAS ANSWERED. The kit answered 2026-09-22 with
 * `saveAnchor` (rule "NEVER BOTH" in `unsaved-changes.tsx`) — and made it OPTIONAL, so 14 bars in 12
 * admin files never passed it and kept painting a second primary Save beside the form's own. The kit's
 * own test was also wrong at both edges: one pixel of the form's Save counted as "in reach", and a Save
 * sitting BEHIND the bar counted as visible, so the bar hid its Save and the page showed NONE. A rule a
 * caller can forget is a rule that gets forgotten; this file is what makes it one nobody can.
 *
 * WHAT IT HOLDS
 *   §0 the reader (shared with `test:tap-target`, `scripts/lib/jsx-open-tag.mts`), proved on fixtures
 *   §1 the kit contract — the bar hides its Save only while the form's own is REALLY in reach, read
 *      for what it does, not its shape: EVERY element wired to the Save sits behind `!anchorOnScreen`,
 *      the ratio is an `&&` term on the latest record, and the band cut off is the height the page reserves
 *   §2 every `<PendingChangesBar>` in `src/` that offers a Save names the form's Save (`saveAnchor`),
 *      reports `saving`, attaches that ref in its own component, spreads nothing and is never aliased;
 *      a bar that offers no Save carries no Save wiring
 *   §3 the allowlist — EMPTY, shrink-only, with a ceiling
 *   §4 the bar's Save says the form's Save's words, wherever both are plain strings
 *
 * ⚠️ WHAT IT CANNOT SEE, stated so nobody reads it as more. It is a SOURCE contract: it proves the ref
 * is attached to SOME element in the bar's own component, not that the element is the form's Save (§4
 * reads that element's words where it can), and it cannot see geometry. The rendered half — exactly one visible
 * Save at 1440 and 390, the bar's when the form's is scrolled away or behind the bar, "Saved" after a
 * save — is the live drive, `npm run qa:single-save`.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { decomment } from "./lib/decomment.mts";
import { endOfBracket, endOfOpenTag, topLevelProps, type OpenTagProps } from "./lib/jsx-open-tag.mts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
/** ⚠️ `KP_SRC` points the gate at a MUTATED COPY of the tree (`red:single-save`); unset, it reads `src/`. */
const SRC = process.env.KP_SRC || join(ROOT, "src");
const SRC_BASE = join(SRC, "..");
const relOf = (f: string) => relative(SRC_BASE, f).replace(/\\/g, "/");
const KIT_REL = "src/components/ui/unsaved-changes.tsx";

let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, detail = "", why = "") => {
  cond ? pass++ : fail++;
  const tail = cond ? why : detail;
  console.log(`${cond ? "PASS" : "FAIL"} ${label}${tail ? ` — ${tail}` : ""}`);
  return cond;
};
/**
 * One rule over a population: ONE PASS line when every row holds, and one FAIL line PER offending row,
 * each naming its site — so `red:single-save` can check the RIGHT bar went red, not merely some bar.
 */
function every<T>(id: string, rule: string, rows: T[], site: (r: T) => string, why: (r: T) => string | null, passNote: string) {
  const bad = rows.map((r) => [r, why(r)] as const).filter(([, w]) => w !== null);
  for (const [r, w] of bad) { fail++; console.log(`FAIL ${id} ${site(r)} — ${w}`); }
  if (bad.length === 0) { pass++; console.log(`PASS ${id} ${rule} — ${passNote}`); }
}
const finish = () => { console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0); };
/** Whitespace-free, so `{ saveRef }` and a CRLF-wrapped value compare equal to `{saveRef}`. */
const squash = (s: string) => s.replace(/\s+/g, "");

// ===========================================================================
console.log("\n§0 · the reader, proved on the inputs that defeat a regex");
// ===========================================================================
const readBar = (src: string) => {
  const at = src.indexOf("<PendingChangesBar");
  const end = endOfOpenTag(src, at);
  return end < 0 ? null : topLevelProps(src.slice(at, end + 1));
};
const names = (p: OpenTagProps | null) => (p ? p.names.join(",") : "UNREAD");
{
  const a = "<PendingChangesBar dirty={d} onSave={() => formRef.current?.requestSubmit()} saveAnchor={saveRef} saving={pending} />\n<Other />";
  const pa = readBar(a);
  ok("0.1 an arrow-function prop does not end the tag early",
     names(pa) === "dirty,onSave,saveAnchor,saving" && pa?.values.get("saveAnchor") === "{saveRef}",
     `read ${names(pa)}`, "the `>` in `=>` sits inside a brace scope");

  const b = '<PendingChangesBar dirty={d} detail={<>Press <strong className="x" onClick={go}>Reject</strong> in the panel.</>} onDiscard={() => reset()} />';
  const pb = readBar(b);
  ok("0.2 JSX nested in detail={…} is ONE prop — its tags and props belong to another element",
     names(pb) === "dirty,detail,onDiscard", `read ${names(pb)}`, "`className`/`onClick` inside detail are not the bar's");

  const c = "<PendingChangesBar dirty={d} onSave={mayAct ? save : undefined} />";
  ok("0.3 a CONDITIONAL onSave counts as present — the source passes it, whatever it evaluates to",
     !!readBar(c)?.names.includes("onSave"), `read ${names(readBar(c))}`);

  const d = "<PendingChangesBar {...barProps} dirty={d} />";
  const pd = readBar(d);
  ok("0.4 a spread is detected (what it sets cannot be read from source)",
     !!pd?.spread && names(pd) === "dirty", `spread=${pd?.spread} read ${names(pd)}`);

  const e = "<PendingChangesBar\r\n  dirty={d}\r\n  saveAnchor={ saveRef }\r\n  onSave={() => save()}\r\n/>\r\n";
  const pe = readBar(e);
  ok("0.5 a CRLF checkout reads the same as LF",
     names(pe) === "dirty,saveAnchor,onSave" && squash(pe?.values.get("saveAnchor") ?? "") === "{saveRef}",
     `read ${names(pe)}`, "every separator the reader skips is `\\s`, which includes `\\r`");

  const f = '<PendingChangesBar dirty={d} detail={`Not saved: ${xs.map((x) => `${x}`).join(" · ")}.`} saveLabel="Save > now" onSave={s} />';
  const pf = readBar(f);
  ok("0.6 a template with nested `${}` strings, and a `>` inside a string prop, do not end the tag",
     names(pf) === "dirty,detail,saveLabel,onSave" && pf?.values.get("saveLabel") === '"Save > now"', `read ${names(pf)}`);

  const naive = /<PendingChangesBar\b([^>]*)>/.exec(a);
  ok("0.7 the naive `<PendingChangesBar\\b([^>]*)>` really does fail on 0.1's input",
     !!naive && !naive[1].includes("saveAnchor"),
     "the naive regex captured saveAnchor, so 0.1 no longer demonstrates the defect",
     `naive captured only ${JSON.stringify(naive?.[1] ?? "")}`);

  // ⛔ THE KNOWN LIMIT, PROVED LOUD: an apostrophe in JSX prose inside a prop opens a string the lexer
  // chases. What matters is that §2 then reports the bar UNREAD — never as a bar with no onSave.
  const h = "<PendingChangesBar dirty={d} detail={<>Don't leave</>} onSave={s} />\nconst x = 1;\n";
  const ph = readBar(h);
  ok("0.8 the reader's known limit comes back UNREAD, never as a bar without its onSave",
     ph === null || ph.lost, `read ${names(ph)} — a misread tag would be judged on props it does not have`);

  const g = decomment("<PendingChangesBar\n  dirty={d}\n  {/* onSave={save} is off on purpose */}\n  onDiscard={reset}\n/>");
  const pg = readBar(g);
  ok("0.9 a JSX comment inside the tag is neither a prop nor a spread",
     names(pg) === "dirty,onDiscard" && pg?.spread === false, `read ${names(pg)} spread=${pg?.spread}`);
}

// ===========================================================================
console.log("\n§1 · the kit — the bar hides its Save only while the form's own is REALLY in reach");
// ===========================================================================
const kitPath = join(SRC, "components", "ui", "unsaved-changes.tsx");
const kit = existsSync(kitPath) ? decomment(readFileSync(kitPath, "utf8")) : "";
if (!ok("1.0 the kit exists", kit.length > 0, KIT_REL)) finish();

/** The source of a bracketed region that opens at the first `(`/`{`/`[` at or after `from`. */
const region = (s: string, from: number, opener: "(" | "{" | "["): string => {
  if (from < 0) return "";
  const o = s.indexOf(opener, from);
  const c = o < 0 ? -1 : endOfBracket(s, o);
  return c < 0 ? "" : s.slice(o, c + 1);
};
/** An identifier read out of source, made safe to put inside a RegExp (`$` is legal in both). */
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** A number written in the kit — a literal, or a `const NAME = 0.75` it names. */
const numberOf = (tok: string): number | null => {
  if (/^\d*\.?\d+$/.test(tok)) return Number(tok);
  const m = new RegExp(`\\bconst\\s+${esc(tok)}\\s*=\\s*(\\d*\\.?\\d+)\\b`).exec(kit);
  return m ? Number(m[1]) : null;
};
/** `(a && b)` → `a && b`, only while one pair of parens wraps the whole. */
const unwrap = (s: string): string => {
  let t = s.trim();
  while (t.startsWith("(") && endOfBracket(t, 0) === t.length - 1) t = t.slice(1, -1).trim();
  return t;
};
/** The terms of an `&&` chain, split at bracket depth 0 and flattened through wrapping parens. */
const conjuncts = (s: string): string[] => {
  const t = unwrap(s), out: string[] = [];
  let depth = 0, from = 0;
  for (let i = 0; i < t.length; i++) {
    if ("([{".includes(t[i])) depth++;
    else if (")]}".includes(t[i])) depth--;
    else if (depth === 0 && t[i] === "&" && t[i + 1] === "&") { out.push(t.slice(from, i)); from = i + 2; i++; }
  }
  out.push(t.slice(from));
  return out.length === 1 ? [t] : out.flatMap(conjuncts);
};
{
  const props = region(kit, kit.search(/\b(?:type\s+BarProps\s*=|interface\s+BarProps)\s*\{/), "{");
  ok("1.1 BarProps declares `saveAnchor?:` — the form's own Save, optional for a bar that offers none",
     /\bsaveAnchor\?\s*:/.test(props),
     props ? "BarProps no longer declares saveAnchor" : "cannot find `type BarProps = {…}` in the kit");
}
/** The line of offset `i` in the decommented kit. */
const kitLine = (i: number) => kit.slice(0, i).split("\n").length;
{
  /* ⭐ EVERY element the bar paints that is wired to the Save — `onClick={shownSave}`, an arrow that
     calls it, `shown?.onSave`, a `const` alias of either — must sit inside the parens of a
     `{… && !anchorOnScreen && (…)}` guard. Finding the Save by one exact spelling let a second,
     unguarded Save beside it pass.
     ⛔ An `||`, a `??` or a ternary in that condition could show it anyway, so each fails
     (optional chaining `?.` is not a ternary and is allowed). */
  const handles = new Set(["shownSave", "onSave"]);
  for (let grew = true; grew;) {
    grew = false;
    for (const m of kit.matchAll(/\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*([^;]+);/g)) {
      const rhs = squash(m[2]);
      const alt = [...handles].map(esc).join("|");
      const path = new RegExp(`^(?:[\\w$?.]*\\.)?(?:${alt})$`).test(rhs);
      const fn = /^(?:async)?(?:\([^()]*\)|[A-Za-z_$][\w$]*)=>|^(?:async)?function\b|^(?:React\.)?useCallback\(/.test(rhs)
        && new RegExp(`\\b(?:${alt})\\b`).test(rhs);
      if ((path || fn) && !handles.has(m[1])) { handles.add(m[1]); grew = true; }
    }
  }
  const handleRe = new RegExp(`\\b(?:${[...handles].map(esc).join("|")})\\b`);
  const subjects: number[] = [];
  const unread: number[] = [];
  for (const m of kit.matchAll(/<([A-Za-z][\w.]*)(?=[\s/>])/g)) {
    const a = m.index ?? 0;
    const e = endOfOpenTag(kit, a);
    if (e < 0 || e - a > 4000) {
      const eol = kit.indexOf("\n", a);
      if (handleRe.test(kit.slice(a + m[0].length, eol < 0 ? kit.length : eol))) unread.push(a);
      continue;
    }
    if (handleRe.test(kit.slice(a + m[0].length, e + 1))) subjects.push(a);
  }
  /* Each `{COND && (` in the kit, with the extent of its parens. A guard counts only when COND is a
     pure `&&` chain holding `!anchorOnScreen` and the parens are the whole of the braces — in
     `{c && (x) || y}` the `y` renders when `c` is false. */
  const guards: Array<{ cond: string; from: number; to: number; valid: boolean }> = [];
  for (const m of kit.matchAll(/\{([^{}]*)&&\s*\(/g)) {
    const g = m.index ?? 0, p = g + m[0].length - 1;
    const pEnd = endOfBracket(kit, p), gEnd = endOfBracket(kit, g);
    if (pEnd < 0) continue;
    const cond = m[1].trim();
    const valid = conjuncts(cond).includes("!anchorOnScreen") && !/\|\||\?\?|\?(?!\.)/.test(cond)
      && gEnd > pEnd && kit.slice(pEnd + 1, gEnd).trim() === "";
    guards.push({ cond, from: p, to: pEnd, valid });
  }
  const bad = subjects.flatMap((a) => {
    const around = guards.filter((g) => g.from < a && a < g.to);
    if (around.some((g) => g.valid)) return [];
    const inner = around.sort((x, y) => y.from - x.from)[0];
    return [`line ${kitLine(a)}: a Save ${inner ? `guarded by \`${inner.cond}\`` : "that no condition guards"}`];
  });
  for (const a of unread) bad.push(`line ${kitLine(a)}: a tag naming the Save that the reader could not close`);
  ok("1.2 the bar's Save renders only when `shownSave && !anchorOnScreen`",
     subjects.length > 0 && bad.length === 0,
     subjects.length === 0 ? `no element in the kit is wired to the Save (${[...handles].join(", ")}) — the check lost its subject` : `${bad.join(" · ")} — while the form's Save is in reach the bar must not paint a second`,
     `${subjects.length} element(s) wired to the Save (${[...handles].join(", ")}), each inside a !anchorOnScreen guard`);
}
const ioAt = kit.search(/new\s+IntersectionObserver\s*\(/);
const ioArgs = region(kit, ioAt, "(");
{
  /* ⭐ "In reach" is ≥ the threshold VISIBLE, read off the LATEST record — `isIntersecting` alone is
     true for one pixel, which is DEFECT 1: the bar kept its Save hidden until the form's button had
     entirely left. And the ratio must be one of the observer's thresholds, or the callback never
     fires as the button crosses it.
     ⛔ The words being present is not enough: every test the callback writes to the on-screen state
     is an `&&` chain holding `<latest>.intersectionRatio >= N`, the latest being
     `records[records.length - 1]` or `records.at(-1)`. An `||`, a `??` or a ternary beside the ratio
     lets one pixel through again, and `records[0]` can be a stale record. */
  const thrRaw = /threshold\s*:\s*(\[[^\]]*\]|[A-Za-z_$][\w$]*|\d*\.?\d+)/.exec(ioArgs)?.[1] ?? "";
  const thresholds = (thrRaw.startsWith("[") ? thrRaw.slice(1, -1).split(",") : [thrRaw]).map((t) => numberOf(t.trim())).filter((v): v is number => v !== null);
  const anyRecord = /\.\s*(?:some|find|every)\s*\(/.test(ioArgs);
  const setter = /\bconst\s*\[\s*anchorOnScreen\s*,\s*([A-Za-z_$][\w$]*)\s*\]\s*=\s*(?:React\s*\.\s*)?useState\b/.exec(kit)?.[1] ?? null;
  const param = /^\(\s*(?:async\s+)?(?:\(\s*([A-Za-z_$][\w$]*)\s*[,:)]|([A-Za-z_$][\w$]*)\s*=>|function\b[^(]*\(\s*([A-Za-z_$][\w$]*))/.exec(ioArgs);
  const recs = param ? (param[1] ?? param[2] ?? param[3] ?? null) : null;
  const isLatest = (expr: string) => recs !== null && [`${recs}[${recs}.length-1]`, `${recs}.at(-1)`].includes(squash(expr));
  /** The expression a record is read from — itself when it is the latest, or a `const` declared as it. */
  const latestRecord = (subject: string) => {
    if (isLatest(subject)) return true;
    if (!/^[A-Za-z_$][\w$]*$/.test(subject)) return false;
    const init = new RegExp(`\\bconst\\s+${esc(subject)}\\s*=\\s*([^;]+);`).exec(ioArgs)?.[1] ?? null;
    return init !== null && isLatest(init);
  };
  const tests = setter === null ? [] : [...ioArgs.matchAll(new RegExp(`\\b${esc(setter)}\\s*\\(`, "g"))]
    .map((m) => region(ioArgs, (m.index ?? 0) + m[0].length - 1, "(").slice(1, -1).trim())
    .filter((arg) => arg !== "false");
  const ratios: number[] = [];
  const problems = tests.flatMap((arg) => {
    const call = `${setter}(${arg.replace(/\s+/g, " ")})`;
    if (/\|\||\?\?|\?(?!\.)/.test(arg)) return [`${call} joins its test with \`||\`, \`??\` or a ternary — one visible pixel can satisfy it`];
    const term = conjuncts(arg).map((t) => /^(.+?)\s*\??\.\s*intersectionRatio\s*>=?\s*([A-Za-z_$][\w$]*|\d*\.?\d+)$/.exec(t)).find(Boolean) ?? null;
    if (!term) return [`${call} holds no \`intersectionRatio >=\` joined by \`&&\` — one visible pixel counts as in reach`];
    if (!latestRecord(term[1].trim())) return [`${call} reads \`${term[1].trim()}\`, not the latest record (\`${recs}[${recs}.length - 1]\` or \`${recs}.at(-1)\`) — a batch can end OFF screen, so only the latest counts`];
    const ratio = numberOf(term[2]);
    if (ratio === null) return [`the ratio \`${term[2]}\` is not a number the kit names`];
    if (ratio < 0.5) return [`the ratio is ${ratio}: under half a button visible is not in reach`];
    if (!thresholds.includes(ratio)) return [`the ratio ${ratio} is not one of the observer's thresholds [${thresholds.join(", ")}], so crossing it is never reported`];
    ratios.push(ratio);
    return [];
  });
  const why = !ioArgs ? "no `new IntersectionObserver(…)` in the kit"
    : setter === null ? "no `const [anchorOnScreen, set…] = useState(…)` in the kit — what the observer writes cannot be followed"
    : recs === null ? "the observer's callback is not an inline function taking the records — which record it reads cannot be seen"
    : anyRecord ? "it reads ANY record (`.some`/`.find`/`.every`); a batch can end OFF screen, so only the latest counts"
    : tests.length === 0 ? `the observer's callback never calls \`${setter}(…)\` with a test`
    : problems.join(" · ");
  ok("1.3 the on-screen test requires `intersectionRatio >=` a threshold, joined by `&&`, on the latest record", why === "", why,
     `${tests.length} test(s) on ${recs}'s latest record · ratio ${ratios.join(", ")} · thresholds [${thresholds.join(", ")}]`);
}
{
  /* ⚠️ The bar is a SINGLETON painting the most recently dirtied entry, which may belong to another
     instance. Observing this instance's own anchor hides the Save on a button nobody is looking at. */
  const painted = /\bconst\s+shown\s*=\s*([A-Za-z_$][\w$]*)\s*\??\.props\.current\b/.exec(kit)?.[1] ?? null;
  const ioVar = /\bconst\s+([A-Za-z_$][\w$]*)\s*=\s*new\s+IntersectionObserver\s*\(/.exec(kit)?.[1] ?? null;
  const observed = ioVar ? new RegExp(`\\b${esc(ioVar)}\\.observe\\(\\s*([A-Za-z_$][\\w$]*)\\s*\\)`).exec(kit)?.[1] ?? null : null;
  const init = observed ? new RegExp(`\\bconst\\s+${esc(observed)}\\s*=\\s*([^;]+);`).exec(kit)?.[1]?.trim() ?? null : null;
  const good = !!painted && !!init && new RegExp(`^${esc(painted)}\\s*\\??\\.props\\.current\\s*\\??\\.saveAnchor\\b`).test(init);
  ok("1.4 it observes the PAINTED entry's saveAnchor, not this instance's", good,
     `painted entry ${painted ?? "?"}, observer ${ioVar ?? "?"} observes ${observed ?? "?"} = ${init ?? "?"}`,
     `${ioVar}.observe(${observed}) where ${observed} = ${init}`);
}
{
  /* ⛔ DEFECT 2: the observer's root is the viewport, but the bar covers the bottom of it. A form Save
     BEHIND the bar counted as on screen, so the bar hid its Save and the page showed NONE. The bottom
     of the root must shrink by the bar's measured height, and the observer re-made when that changes. */
  // \x60 is a backtick: a raw one inside a regex literal would open a template for every scanner that reads this file.
  const margin = /rootMargin\s*:\s*\x60([^\x60]*)\x60/.exec(ioArgs)?.[1]?.trim().split(/\s+/) ?? [];
  const inset = /^-\$\{\s*([A-Za-z_$][\w$]*)\s*\}px$/.exec(margin[2] ?? "")?.[1] ?? null;
  const effAt = ioAt < 0 ? -1 : Math.max(kit.lastIndexOf("useEffect(", ioAt), kit.lastIndexOf("useLayoutEffect(", ioAt));
  const effArgs = region(kit, effAt, "(");
  const deps = /\[([^\]]*)\]\s*\)$/.exec(effArgs)?.[1]?.split(",").map((t) => t.trim()) ?? [];
  /* ⛔ AND THE INSET MUST BE THE BAR'S HEIGHT. A `-${x}px` margin whose `x` is written 0 has the
     right shape and cuts nothing. So `x` is a useState value whose setter is only ever called with
     the height the reserve effect writes to `document.body.style.paddingBottom`. */
  const setInset = inset === null ? null
    : new RegExp(`\\bconst\\s*\\[\\s*${esc(inset)}\\s*,\\s*([A-Za-z_$][\\w$]*)\\s*\\]\\s*=\\s*(?:React\\s*\\.\\s*)?useState\\b`).exec(kit)?.[1] ?? null;
  const pad = /document\s*\.\s*body\s*\.\s*style\s*\.\s*paddingBottom\s*=\s*\x60\$\{\s*([A-Za-z_$][\w$]*)\s*\}px\x60/.exec(kit);
  const measured = pad?.[1] ?? null;
  const padAt = pad?.index ?? -1;
  const resAt = padAt < 0 ? -1 : Math.max(kit.lastIndexOf("useEffect(", padAt), kit.lastIndexOf("useLayoutEffect(", padAt));
  const resOpen = resAt < 0 ? -1 : kit.indexOf("(", resAt);
  const resClose = resOpen < 0 ? -1 : endOfBracket(kit, resOpen);
  const reserve = resClose > padAt ? kit.slice(resOpen, resClose + 1) : "";
  const writes = setInset === null ? [] : [...kit.matchAll(new RegExp(`\\b${esc(setInset)}\\s*\\(`, "g"))]
    .map((m) => squash(region(kit, (m.index ?? 0) + m[0].length - 1, "(").slice(1, -1)));
  const setsMeasured = !!measured && !!setInset && new RegExp(`\\b${esc(setInset)}\\s*\\(\\s*${esc(measured)}\\s*\\)`).test(reserve);
  const why = margin.length !== 4 ? "no four-part `rootMargin` template on the observer — the bar's own band counts as on screen"
    : inset === null ? `rootMargin bottom is \`${margin[2]}\`, not \`-\${<measured bar height>}px\``
    : !deps.includes(inset) ? `\`${inset}\` is not in the observer effect's dependencies [${deps.join(", ")}], so a taller bar keeps the old band`
    : setInset === null ? `\`${inset}\` is not a \`const [${inset}, set…] = useState(…)\` value — what it holds cannot be followed`
    : measured === null ? "no `document.body.style.paddingBottom = \x60${…}px\x60` in the kit — the height the page reserves cannot be found"
    : !reserve ? "the paddingBottom write sits in no effect — the reserve cannot be read"
    : !setsMeasured ? `the reserve effect never calls \`${setInset}(${measured})\` — the band cut from the root is not the height the page reserves`
    : writes.some((w) => w !== measured) ? `\`${setInset}\` is also written with ${writes.filter((w) => w !== measured).map((w) => `\`${w}\``).join(", ")} — the band is the measured height or nothing`
    : "";
  ok("1.5 it excludes the bar's own band via `rootMargin`, re-made when the bar's height changes", why === "", why,
     `rootMargin bottom -\${${inset}}px, ${inset} = the reserved height ${measured} (${setInset}(${measured})), re-observed on [${deps.join(", ")}]`);
}

// ===========================================================================
console.log("\n§2 · every <PendingChangesBar> that offers a Save names the form's own");
// ===========================================================================
function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    if (e === "node_modules" || e === ".next") continue;
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(tsx|ts)$/.test(e)) out.push(p);
  }
  return out;
}
const sources = walk(SRC).map((abs) => ({ abs, rel: relOf(abs) })).filter((f) => f.rel !== KIT_REL);
const bodies = new Map<string, string>();
const bodyOf = (f: { abs: string; rel: string }) => {
  if (!bodies.has(f.rel)) bodies.set(f.rel, decomment(readFileSync(f.abs, "utf8")));
  return bodies.get(f.rel) as string;
};

type Bar = { site: string; file: string; at: number; line: number; p: OpenTagProps | null; unread: string | null };
const bars: Bar[] = [];
for (const f of sources) {
  if (!f.rel.endsWith(".tsx") || !readFileSync(f.abs, "utf8").includes("PendingChangesBar")) continue;
  const body = bodyOf(f);
  let n = 0;
  for (const m of body.matchAll(/<PendingChangesBar(?=[\s/>])/g)) {
    const at = m.index ?? 0;
    const site = `${f.rel}#${++n}`;
    const line = body.slice(0, at).split("\n").length;
    const end = endOfOpenTag(body, at);
    if (end < 0 || end - at > 4000) {
      bars.push({ site, file: f.rel, at, line, p: null, unread: end < 0 ? "the open tag never closed" : `the open tag ran ${end - at} characters` });
      continue;
    }
    const p = topLevelProps(body.slice(at, end + 1));
    bars.push({ site, file: f.rel, at, line, p, unread: p.lost ? "a prop could not be read" : null });
  }
}
const has = (b: Bar, prop: string) => !!b.p?.names.includes(prop);
const offers = bars.filter((b) => has(b, "onSave"));
const anchored = bars.filter((b) => has(b, "saveAnchor"));
const siteOf = (b: Bar) => `${b.site} (line ${b.line})`;

/**
 * ⛔ A COVERAGE FLOOR. Every rule below reports "0 findings" both when there are none AND when the scan
 * reaches nothing — a moved directory, a renamed component, a reader regression. 28 bars (18 offering a
 * Save) were counted at 2026-09-26; the floor sits below that so a real removal is not a false alarm,
 * and far above zero so blindness is loud.
 */
const BAR_FLOOR = 25, SAVE_FLOOR = 15;
ok(`2.0 CONTROL — the population is real (floor ${BAR_FLOOR} bars, ${SAVE_FLOOR} offering a Save)`,
   bars.length >= BAR_FLOOR && offers.length >= SAVE_FLOOR,
   `${bars.length} bars in ${new Set(bars.map((b) => b.file)).size} files · ${offers.length} offer a Save — the scan lost its subject`,
   `${bars.length} bars in ${new Set(bars.map((b) => b.file)).size} files · ${offers.length} offer a Save`);

every("2.p", "every bar was read to its end and carries `dirty`", bars, siteOf,
  (b) => b.unread ? `UNREAD: ${b.unread} — the reader lost sync, so this bar is judged on nothing (see §0.8)`
    : !has(b, "dirty") ? "no `dirty` prop read — the only required prop, so the tag was misread" : null,
  `${bars.length} bars read`);

/** §3's allowlist is consulted by 2.a only; it is declared there, with its rules. */
const ALLOW: Record<string, string> = {};

every("2.a", "every bar that offers a Save names the form's own (`saveAnchor`)", offers, siteOf,
  (b) => has(b, "saveAnchor") || b.site in ALLOW ? null
    : "offers a Save (onSave) but names no saveAnchor — the bar paints a second Save beside the form's own. Pass `saveAnchor={saveRef}` and put `ref={saveRef}` on the form's Save",
  `${offers.length} of ${offers.length}`);

every("2.b", "every bar that offers a Save reports `saving`", offers, siteOf,
  (b) => has(b, "saving") ? null : "offers a Save but passes no `saving` — its button cannot show the save in flight, and \"Saved\" can never be told apart from a Discard",
  `${offers.length} of ${offers.length}`);

/**
 * Where the top-level declaration enclosing offset `i` starts — a `function`/`const`/`class` line at
 * column 0. ⚠️ WHY SCOPE AND NOT FILE: `staff-forms.tsx`, `poll-actions.tsx` and `system-client.tsx`
 * each hold two forms, in two components, and BOTH name their ref `saveRef`. A per-file match lets one
 * form's button vouch for the other's bar; the bar and its button must share a component.
 */
const scopeOf = (body: string, i: number): number => {
  let start = 0;
  for (const m of body.matchAll(/^(?:export\s+(?:default\s+)?)?(?:async\s+)?(?:function|const|let|class)\b/gm)) {
    if ((m.index ?? 0) > i) break;
    start = m.index ?? 0;
  }
  return start;
};
const lineAt = (body: string, i: number) => body.slice(0, i).split("\n").length;
/** Every element in `file` whose own top-level `ref` is `{name}`. */
function refTargets(file: string, name: string) {
  const body = bodies.get(file) ?? "";
  const hits: Array<{ tag: string; at: number; end: number }> = [];
  for (const m of body.matchAll(/<([A-Za-z][\w.]*)(?=[\s/>])/g)) {
    const a = m.index ?? 0;
    const e = endOfOpenTag(body, a);
    if (e < 0 || e - a > 4000) continue;
    const open = body.slice(a, e + 1);
    if (!/\bref\s*=/.test(open)) continue;
    const p = topLevelProps(open);
    if (squash(p.values.get("ref") ?? "") === `{${name}}`) hits.push({ tag: p.tag, at: a, end: e });
  }
  return hits;
}
const anchorName = (b: Bar) => /^\{([A-Za-z_$][\w$.]*)\}$/.exec(squash(b.p?.values.get("saveAnchor") ?? ""))?.[1] ?? null;
/** The elements carrying this bar's `saveAnchor` ref inside the bar's own top-level component. */
const ownTargets = (b: Bar, x: string) => {
  const body = bodies.get(b.file) ?? "";
  return refTargets(b.file, x).filter((t) => scopeOf(body, t.at) === scopeOf(body, b.at));
};
every("2.r", "every `saveAnchor={X}` has a `ref={X}` attached in the bar's own component", anchored, siteOf,
  (b) => {
    const x = anchorName(b);
    if (x === null) return `saveAnchor=${b.p?.values.get("saveAnchor")} is not a plain ref name, so where it points cannot be read`;
    if (ownTargets(b, x).length) return null;
    const elsewhere = refTargets(b.file, x).map((t) => lineAt(bodies.get(b.file) ?? "", t.at));
    return elsewhere.length
      ? `ref={${x}} is attached only in ANOTHER component (line ${elsewhere.join(", ")}) — this bar's own form never mounts its anchor`
      : `saveAnchor={${x}} but no element in ${b.file} carries ref={${x}} — the anchor is never mounted, so the bar can never know the form's Save is on screen`;
  },
  `${anchored.length} anchors, each attached in its bar's component · ⚠️ limit: this proves the ref is ATTACHED there, not that the element is the form's Save (§4 reads its words)`);

every("2.s", "no bar takes a spread", bars, siteOf,
  (b) => b.p?.spread ? "a `{...x}` spread on the bar — what it passes (onSave? saveAnchor?) cannot be read, so every rule here would be judging a guess" : null,
  `${bars.length} bars, props all written out`);

every("2.d", "a bar that offers no Save carries no Save wiring", bars.filter((b) => b.p && !has(b, "onSave")), siteOf,
  (b) => {
    const dead = ["saveAnchor", "saveLabel", "savedLabel"].filter((k) => has(b, k));
    return dead.length ? `no onSave, yet it passes ${dead.join(", ")} — a decision bar names its panel's button in \`detail\` and paints warning + Discard only` : null;
  },
  `${bars.length - offers.length} bars with no Save, none half-wired`);

{
  /* ⛔ The whole of §2 finds bars by the TAG NAME. `import { PendingChangesBar as Bar }`, a namespace
     import, `const B = PendingChangesBar` or `createElement(PendingChangesBar, …)` would render a bar
     this scan never sees. So every mention outside the kit is an import/export specifier or a tag. */
  const aliases: string[] = [];
  for (const f of sources) {
    const raw = readFileSync(f.abs, "utf8");
    if (!raw.includes("PendingChangesBar") && !raw.includes("unsaved-changes")) continue;
    const body = bodyOf(f);
    if (/\bimport\s+\*\s+as\s+[A-Za-z_$][\w$]*\s+from\s*["'][^"']*\/unsaved-changes["']/.test(body)) aliases.push(`${f.rel} imports the kit as a namespace`);
    const lists: Array<[number, number]> = [];
    for (const m of body.matchAll(/\b(?:import|export)\s+(?:type\s+)?\{([^}]*)\}\s*from\s*["'][^"']+["']/g)) {
      if (/\bPendingChangesBar\s+as\b/.test(m[1])) aliases.push(`${f.rel} renames PendingChangesBar in an import/export`);
      lists.push([m.index ?? 0, (m.index ?? 0) + m[0].length]);
    }
    for (const m of body.matchAll(/\bPendingChangesBar\b/g)) {
      const i = m.index ?? 0;
      if (lists.some(([a, b]) => i >= a && i < b) || body[i - 1] === "<" || body.slice(i - 2, i) === "</") continue;
      aliases.push(`${f.rel}:${body.slice(0, i).split("\n").length} uses PendingChangesBar as a value, not a tag`);
    }
  }
  ok("2.i PendingChangesBar is never imported or used under another name", aliases.length === 0,
     `${aliases.join(" · ")} — a bar under another name is invisible to every rule above`,
     `${sources.length} files read`);
}

// ===========================================================================
console.log("\n§3 · the allowlist — EMPTY, and it may only shrink");
// ===========================================================================
/**
 * ⛔ `ALLOW` (declared in §2, above 2.a) maps `<file>#<n>` → a written reason, and it STARTS EMPTY: every
 * bar that offers a Save lands on the rule. An entry earns its place by a rendered fact or a reason,
 * never by a filename (DESIGN-BASELINE §3), and it goes the moment it stops being true — when the bar
 * no longer offers a Save, or now has its saveAnchor. ⛔ Raising `ALLOW_CEILING` is the one edit this
 * file forbids; the count comes DOWN to meet it, never the reverse (the `test:red-anchors` §4 rule).
 */
const ALLOW_CEILING = 0;
{
  const rows = Object.entries(ALLOW);
  const stale = rows.filter(([site]) => {
    const b = bars.find((x) => x.site === site);
    return !b || !has(b, "onSave") || has(b, "saveAnchor");
  }).map(([site]) => site);
  ok("3.1 every allowlist row still names a bar that offers a Save without a saveAnchor", stale.length === 0,
     `${stale.join(" · ")} — the row outlived its reason; DELETE it (and lower ALLOW_CEILING)`, `${rows.length} row(s)`);
  ok("3.2 every allowlist row carries a written reason", rows.every(([, why]) => why.trim().length >= 20),
     "a row without a reason is a filename wearing a rule's clothes");
  ok(`3.3 ★ ${rows.length} allowlisted bar(s) (ceiling ${ALLOW_CEILING})`, rows.length <= ALLOW_CEILING,
     `${rows.length} vs ${ALLOW_CEILING} — the ceiling is never raised; wire the bar instead`);
  ok("3.4 ⛔ …and if that count drops, LOWER THE CEILING in the same commit", rows.length === ALLOW_CEILING,
     `${rows.length} vs ${ALLOW_CEILING} — a ceiling above the real count stops being a ratchet`);
}

// ===========================================================================
console.log("\n§4 · the bar's Save says the form's Save's words");
// ===========================================================================
/**
 * ⭐ The bar's Save is the SAME action as the form's, reached from further away, so it must say the same
 * words — "Save" beside "Save settings" makes an officer ask whether they differ. Compared only where
 * BOTH are plain strings; a computed label (`{pending ? "Adding…" : "Add source"}`) is counted
 * UNCHECKED and listed, never guessed at. A bar that passes no `saveLabel` paints the kit's default.
 */
{
  const KIT_DEFAULT = /\bshown\s*\??\.saveLabel\s*\?\?\s*"([^"]*)"/.exec(kit)?.[1] ?? null;
  const plain = (v: string | undefined): string | null => {
    if (v === undefined) return null;
    const m = /^(?:"([^"]*)"|'([^']*)'|\{\s*"([^"\\]*)"\s*\}|\{\s*'([^'\\]*)'\s*\})$/.exec(v.trim());
    return m ? (m[1] ?? m[2] ?? m[3] ?? m[4] ?? null) : null;
  };
  const text = (s: string) => s.replace(/&amp;/g, "&").replace(/&nbsp;/g, " ").replace(/&middot;/g, "·")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/\s+/g, " ").trim();
  const checked: Array<{ b: Bar; bar: string; form: string }> = [];
  const unchecked: string[] = [];
  for (const b of anchored.filter((x) => has(x, "onSave"))) {
    const x = anchorName(b);
    const targets = x ? ownTargets(b, x) : [];
    if (targets.length !== 1) { unchecked.push(`${b.site} (ref attached to ${targets.length} elements in its component)`); continue; }
    const t = targets[0];
    const body = bodies.get(b.file) ?? "";
    const next = body.indexOf("<", t.end + 1);
    const kids = body.slice(t.end + 1, next);
    const form = body[t.end - 1] === "/" || next < 0 || !body.startsWith(`</${t.tag}`, next) || /[{}]/.test(kids) ? null : text(kids);
    const barRaw = has(b, "saveLabel") ? plain(b.p?.values.get("saveLabel")) : KIT_DEFAULT;
    const bar = barRaw === null ? null : text(barRaw);
    if (form === null || bar === null || form === "") {
      unchecked.push(`${b.site} (${bar === null ? "bar label computed" : "form button label computed"})`);
      continue;
    }
    checked.push({ b, bar, form });
  }
  console.log(`     4.0 labels: ${checked.length} pair(s) compared, ${unchecked.length} unchecked${unchecked.length ? `: ${unchecked.join(" · ")}` : ""}`);
  every("4.1", "where both are plain strings, the bar's Save and the form's Save say the same words", checked, (c) => siteOf(c.b),
    (c) => c.bar === c.form ? null : `the bar says "${c.bar}", the form's Save says "${c.form}" — make them one label`,
    `${checked.length} pair(s) match`);
  /* A floor, because 4.1 over zero pairs is a pass over nothing. 13 pairs were compared on 2026-09-26
     once the affiliate bar was anchored (5 unchecked, every one a computed label); the floor sits 3
     below, like 2.0's. */
  const LABEL_FLOOR = 10;
  ok(`4.2 CONTROL — at least ${LABEL_FLOOR} label pairs were actually compared`, checked.length >= LABEL_FLOOR,
     `${checked.length} compared — the reader stopped reaching the form buttons`, `${checked.length} compared`);
}

finish();
