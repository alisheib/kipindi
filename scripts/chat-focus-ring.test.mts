/**
 * E-219 · THE CHAT COMPOSER PAINTS ONE FOCUS RING — the cascade half, provable offline.
 *
 * Ali, from the live product: *"in chatbot we got double borders on highlighting of input
 * text"*. `npm run qa:chat-focus-ring` is the PROOF — it counts painted pixels on
 * production and does not care what the CSS says. This suite is the part that can run in
 * `test:all` with `DATABASE_URL` unset, before a commit, and its job is narrower and
 * different: to pin the ONE MECHANISM that made a correct-looking rule wrong, so the fix
 * cannot be "simplified" back into the defect between deploys.
 *
 * ⭐ THE MECHANISM, AND IT IS THE ONLY REASON THIS FILE IS NOT A TAUTOLOGY.
 * `chat-styles.css` is `@import`ed at `globals.css:15`, i.e. its rules land ABOVE every
 * rule globals declares. So a chat rule at the SAME specificity as a globals rule loses
 * the tie on source order, every time. `.cm-composer textarea` is (0,1,1); the site-wide
 * `textarea:focus` is (0,1,1); the field therefore took back a `--brand-500` halo the
 * shell was already painting, and had done since 2026-06-05. The fix works only because
 * `.cm-composer textarea:focus` is (0,2,1). A future editor who tidies it to
 * `textarea:focus` inside this file reintroduces the bug and nothing would notice — so
 * that is what is asserted, rather than the mere presence of the declaration.
 *
 * ⛔ THE JUDGEMENT CHECK, asked of every assertion here: *would this still pass if the
 * feature were absent?* §2 is the positive control that answers it — if the SHELL stops
 * painting its ring, the composer has no focus indicator at all, and "the field paints
 * nothing" is then satisfied perfectly by a broken product.
 *
 * ⚠️ CSS IS READ DECOMMENTED. The rules here are explained by paragraphs that NAME the
 * declarations they are about ("box-shadow: none", "outline: 2px solid transparent"), and
 * `red:card-share` case 6 has already proved a raw-source scan reads the explanation as
 * the code and stays green over a rule that genuinely lost its declaration.
 *
 * Run: npm run test:chat-focus-ring
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { decomment } from "./lib/decomment.mts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
let pass = 0, fail = 0;
const ok = (l: string, c: boolean, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"} ${l}${x ? ` — ${x}` : ""}`); };

const chat = decomment(readFileSync(join(ROOT, "src/styles/chat/chat-styles.css"), "utf8"));
const globalsRaw = readFileSync(join(ROOT, "src/app/globals.css"), "utf8");
const globals = decomment(globalsRaw);

/** Body of the first rule whose selector list matches `sel` exactly (whitespace-insensitive). */
function ruleBody(css: string, sel: string): string | null {
  const norm = (s: string) => s.replace(/\s+/g, " ").trim();
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(css))) {
    if (norm(m[1]) === norm(sel)) return m[2];
  }
  return null;
}
/** Every selector list in the file that contains `needle`. */
function selectorsContaining(css: string, needle: string): string[] {
  const out: string[] = [];
  const re = /([^{}]+)\{[^{}]*\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(css))) {
    const sel = m[1].replace(/\s+/g, " ").trim();
    if (sel.includes(needle) && !sel.startsWith("@")) out.push(sel);
  }
  return out;
}

// ── 1 · The site-wide rule that causes this still exists, and still has the halo ──────
// ⛔ If globals ever stops giving a bare textarea its own ring, the neutraliser below
// becomes dead weight and this suite must say so rather than keep guarding nothing.
{
  const focus = ruleBody(globals, "textarea:focus");
  ok("1: globals still gives a bare textarea its own focus halo (the thing being neutralised)",
     !!focus && /box-shadow\s*:\s*0 0 0 3px/.test(focus!), focus ? focus.replace(/\s+/g, " ").trim().slice(0, 120) : "rule absent");
  ok("1: …and its keyboard state still paints a SOLID brand outline (E-129)",
     /textarea:focus-visible\s*\{[^}]*outline-color\s*:\s*var\(--brand-500\)/.test(globals));
  // The `@import` is the whole mechanism — assert it, because if chat-styles ever moves
  // BELOW globals the specificity reasoning in this file stops being the reason it works.
  const importLine = globalsRaw.split(/\r?\n/).findIndex((l) => l.includes('@import "../styles/chat/chat-styles.css"'));
  const firstRule = globalsRaw.split(/\r?\n/).findIndex((l) => /^\s*(textarea|\.input)\s*[,{:]/.test(l));
  ok("1: ⭐ chat-styles.css is @imported ABOVE globals' own rules — so a chat rule at equal specificity LOSES",
     importLine >= 0 && firstRule > importLine, `@import at line ${importLine + 1}, first competing rule at ${firstRule + 1}`);
}

// ── 2 · POSITIVE CONTROL — the SHELL paints the ring ─────────────────────────────────
// Without this, every assertion in §3 is satisfied by a composer that has no focus
// indicator whatsoever. This is the assertion that fails when the "fix" is deletion.
{
  const shell = ruleBody(chat, ".cm-composer:focus-within");
  ok("2: ⭐ POSITIVE CONTROL — the composer shell still paints the focus ring", !!shell);
  ok("2: …as a brand border", !!shell && /border-color\s*:\s*var\(--brand-500\)/.test(shell!));
  ok("2: …plus the 3px brand halo", !!shell && /box-shadow\s*:[^;]*0 0 0 3px/.test(shell!));
  ok("2: …and a real outline for forced-colors (E-129)", !!shell && /outline\s*:\s*2px solid transparent/.test(shell!));
}

// ── 3 · The field does not fight it — in the FOCUS state, which is where it went wrong ─
{
  const neutral = selectorsContaining(chat, ".cm-composer textarea:focus");
  ok("3: a rule neutralises the field's own ring in the FOCUS state", neutral.length > 0, neutral.join(" | ") || "none");

  const sel = neutral[0] ?? "";
  const body = sel ? ruleBody(chat, sel) : null;
  ok("3: …it zeroes the field's box-shadow", !!body && /box-shadow\s*:\s*none/.test(body!),
     body ? body.replace(/\s+/g, " ").trim().slice(0, 120) : "no rule");
  // ⛔ `outline: none` here would delete the substituted ring in Windows high-contrast,
  // which is the exact defect E-129 existed to repair. Colour only.
  ok("3: ⛔ …by making the outline TRANSPARENT, never `none` (E-129 forced-colors)",
     !!body && /outline-color\s*:\s*transparent/.test(body!) && !/outline\s*:\s*none/.test(body!));
  ok("3: …and it covers :focus-visible too, which is where the SOLID outline arrives",
     sel.includes(":focus-visible"), sel);

  // ⭐ THE ASSERTION THAT IS ACTUALLY ABOUT THE BUG. Same-specificity in this file loses.
  // `.cm-composer textarea:focus` = (0,2,1) beats `textarea:focus` = (0,1,1).
  const beatsGlobals = neutral.every((s) =>
    s.split(",").every((one) => one.includes(".cm-composer") && one.includes("textarea")));
  ok("3: ⭐ every branch is scoped to BOTH .cm-composer and textarea — (0,2,1), which outranks globals' (0,1,1)",
     neutral.length > 0 && beatsGlobals, neutral.join(" | "));
}

// ── 4 · The precedent this fix copies is still there ─────────────────────────────────
// ⭐ The kit solved this exact shape first: "The GROUP draws the ring, not the field."
// If that rule is ever deleted, the reference implementation of the pattern is gone and
// the next shell will be written without it — which is how the chat got here.
{
  ok("4: the kit's own reference implementation still exists (.input-group .input:focus)",
     /\.input-group \.input:focus\s*\{[^}]*box-shadow\s*:\s*none/.test(globals));
  ok("4: …and its shell still paints the ring it owns",
     /\.input-group:focus-within\s*\{[^}]*box-shadow\s*:[^;]*0 0 0 3px/.test(globals));
}

// ── 5 · The resting rule the focus rule depends on is unchanged ──────────────────────
// The field is borderless and ringless at rest; §3 only has to hold the FOCUS state
// because of that. A rule that rests differently would need a different neutraliser.
{
  const rest = ruleBody(chat, ".cm-composer textarea");
  ok("5: at rest the field still draws no border", !!rest && /border\s*:\s*none/.test(rest!));
  ok("5: …and carries the transparent outline forced-colors substitutes on",
     !!rest && /outline\s*:\s*2px solid transparent/.test(rest!));
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
