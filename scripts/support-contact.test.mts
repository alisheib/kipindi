/**
 * SUPPORT CONTACT — the saved value must REACH a player, and the statutory helpline
 * must never be something an operator can retype.
 *
 *   npx tsx scripts/support-contact.test.mts   (npm run test:support-contact)
 *
 * 🔴 E-226 — A CONFIG WITH A WRITER AND NO READER. An operator saved the support address
 * and phone through the admin console on 2026-08-19, and again on 2026-09-08. Neither save
 * has ever reached a player. `SUPPORT_CONFIG_KEY` had a definition, an import and a WRITE,
 * and no reader anywhere: the module cache starts from `DEFAULTS` in every process, and two
 * code comments assert a boot hydration (`boot-checks.ts`) that does not exist — `grep -n
 * support src/lib/server/boot-checks.ts` returns NOTHING. Measured on production 2026-09-10:
 * the saved row reads `msaada@50pick.tz` / `+255769777877`, and `/help` served
 * `support@50pick.tz` x6 and `+255 22 211 5811` x4. Five of five values wrong, 21 surfaces,
 * including the four statutory pages a Board reviewer opens first.
 *
 * 🔴 E-328 — AND THE REMEDY CARRIES THE DEFECT. The saved row sets `helpline` to
 * `+255769777877` — 50pick's OWN desk. So "make the reader work" would have published the
 * operator's number under *"Tanzania Helpline"* on `/legal/responsible-gambling`, re-opening
 * by hydration exactly the harm session 91 fixed by hand in `email.ts` (a private
 * `HELPLINE = "+255 22 211 5811"` printed under *"Contact the Tanzania Gambling Helpline"*
 * in the SELF-EXCLUSION email). That fix corrected the CONSTANT and not the CLASS, so
 * `reality-check.tsx:183` still renders `{t.rg.helpline}` — "Tanzania Helpline" /
 * "Msaada wa Tanzania" / "坦桑尼亚热线" — beside `SUPPORT_PHONE()`.
 *
 * ⭐ THE RULE THE SPLIT ENCODES: the operator's own address and desk line are THEIRS to
 * change; the national problem-gambling helpline is NOT. Pinning it is not a restriction,
 * it is the only arrangement in which a persisted row cannot walk a distressed player back
 * to the operator.
 *
 *   §1 a saved row REACHES the readers            (E-226 — the missing reader)
 *   §2 a saved row CANNOT move the helpline       (E-328 — the trap in the remedy)
 *   §3 POPULATION: label says helpline => renders the helpline
 *   §4 POPULATION: no client bundle reads an operator-editable contact value
 *
 * ⛔ §3's population is derived from the ENGLISH TEXT A PLAYER READS, resolved through
 * `dict.en` — never from identifier names. A guard keyed on names is the one that passed
 * over eight live defects; a new key called `t.rg.gamblingLine` whose English is
 * "Tanzania Helpline" is caught here, and would not be by a name match.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, detail = "") => {
  if (cond) { pass++; console.log(`PASS ${label}`); }
  else { fail++; console.log(`FAIL ${label}${detail ? ` — ${detail}` : ""}`); }
};

const tick = () => new Promise((r) => setImmediate(r));
const ROOT = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const SRC = join(ROOT, "src");

// ────────────────────────────────────────────────────────────────────────────
// §1 + §2 — behaviour, driven against the REAL module through the store seam
// ────────────────────────────────────────────────────────────────────────────
// The row an operator actually saved on production (read 2026-09-10). It carries the
// operator's own number in `helpline`, which is the whole reason §2 exists.
const SAVED_ROW = {
  email: "msaada@50pick.tz",
  phone: "+255769777877",
  phoneTel: "+255769777877",
  helpline: "+255769777877",
  helplineTel: "+255769777877",
};

const { __defineSupportConfigForTest, HELPLINE, HELPLINE_TEL } = await import(
  "../src/lib/server/support-config.ts"
);

{
  const store = {
    loadConfigResult: (async () => ({ ok: true as const, value: SAVED_ROW })) as never,
    saveConfig: (async () => {}) as never,
    hasDatabase: (() => true) as never,
  };
  const cfg = __defineSupportConfigForTest(store);
  await tick();
  await tick();

  const got = cfg.get();

  // §1 — the operator's saved contact details reach the readers. This is the assertion
  // that was false on production for three weeks.
  ok("§1 saved email reaches the reader", got.email === "msaada@50pick.tz", `got ${got.email}`);
  ok("§1 saved phone reaches the reader", got.phone === "+255769777877", `got ${got.phone}`);
  ok("§1 saved phoneTel reaches the reader", got.phoneTel === "+255769777877", `got ${got.phoneTel}`);

  // §2 — and the SAME row cannot move the helpline. Not "does not today": the field is
  // not part of the persisted shape at all, so there is no value for a row to carry.
  ok("§2 helpline ignores the saved row", HELPLINE() === "0800 11 0011", `got ${HELPLINE()}`);
  ok("§2 helplineTel ignores the saved row", HELPLINE_TEL() === "0800110011", `got ${HELPLINE_TEL()}`);
  ok(
    "§2 helpline is not a persisted field",
    !("helpline" in (got as Record<string, unknown>)) && !("helplineTel" in (got as Record<string, unknown>)),
    `config still carries ${Object.keys(got).join(",")}`,
  );
}

// ────────────────────────────────────────────────────────────────────────────
// §3 + §4 — populations, over the whole of src/
// ────────────────────────────────────────────────────────────────────────────
const files: string[] = [];
(function walk(dir: string) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) { walk(p); continue; }
    if (/\.(tsx|ts)$/.test(e)) files.push(p);
  }
})(SRC);

const { dict } = await import("../src/lib/i18n-dict.ts");

/** Resolve `t.a.b.c` (or `tt.a.b`) against the ENGLISH dictionary — the text a player reads. */
const resolveEn = (path: string): string | null => {
  const parts = path.split(".").slice(1); // drop the `t` / `tt` root
  let node: unknown = dict.en;
  for (const k of parts) {
    if (typeof node !== "object" || node === null || !(k in node)) return null;
    node = (node as Record<string, unknown>)[k];
  }
  return typeof node === "string" ? node : null;
};

const OPERATOR_GETTERS = ["SUPPORT_PHONE", "SUPPORT_PHONE_TEL", "SUPPORT_EMAIL"];
const HELPLINE_GETTERS = ["HELPLINE", "HELPLINE_TEL"];
const LOOKS_LIKE_HELPLINE = /helpline|hotline/i;

/**
 * ⛔ COMMENTS ARE NOT CODE, AND THE FIRST RUN OF THIS GUARD PROVED IT THE HARD WAY.
 *
 * §4 reported `ChatPanel.tsx` and `public-footer.tsx` as violations on the very run that was
 * meant to confirm they were FIXED — because the fixes carry comments that NAME the getter
 * they removed ("an imported `SUPPORT_EMAIL()` would be…"). A guard that reads prose as code
 * accuses the fix of being the defect, and the next person to see it deletes the explanation
 * to make the suite green.
 *
 * ⭐ AND THE STRIPPER IS THE SHARED ONE, NOT A PRIVATE PAIR OF REGEXES. This file first shipped
 * its own `stripComments` — a block-comment `.replace()` followed by a line-comment one — which
 * is precisely the shape `scripts/lib/decomment.mts` exists to abolish, and `test:decomment`
 * caught it as the 21st private stripper against a ceiling of 20. That helper's own docblock
 * names both bugs mine had: a two-regex pass has an ORDER, and either order is a blindness
 * (`E-186`), and a `/*` inside a STRING literal opens a comment that runs to EOF (`E-189`).
 * It is a scanner that tracks literals, and every newline survives — so line numbers still
 * point at the real line, which is all §3 needed from the private copy.
 */
import { decomment } from "./lib/decomment.mts";

const v3: string[] = [];
const v4: string[] = [];
const v5: string[] = [];

for (const f of files) {
  const raw = readFileSync(f, "utf8");
  const src = decomment(raw);
  const rel = relative(ROOT, f).replace(/\\/g, "/");

  // ── §3 ── For every line that renders an operator getter, resolve any `t.*` label on
  // the SAME line. If the label a player reads says "helpline", the number beside it must
  // be the helpline. The line is the unit because that is the unit a player reads.
  const lines = src.split(/\r?\n/);
  lines.forEach((line, i) => {
    const callsOperator = OPERATOR_GETTERS.some((g) => new RegExp(`\\b${g}\\s*\\(`).test(line));
    if (!callsOperator) return;
    for (const m of line.matchAll(/\b(t{1,2}(?:\.[A-Za-z0-9_]+)+)/g)) {
      const en = resolveEn(m[1]);
      if (en && LOOKS_LIKE_HELPLINE.test(en)) {
        v3.push(`${rel}:${i + 1} — label ${m[1]} = "${en}" rendered beside an operator number`);
      }
    }
  });

  // ── §4 ── A "use client" module cannot be hydrated: its module cache is the BROWSER
  // bundle's, which no server-side load ever touches. So an operator-editable value read
  // from a client component is stale by construction, forever, however good the server
  // hydration is. The pinned helpline is safe there precisely because it is a constant.
  //
  // ⛔ THE DIRECTIVE IS SEARCHED OVER THE WHOLE FILE, NOT THE FIRST FEW LINES — and that is
  // not a refinement, it is the bug this section was written with. The first version read the
  // top 5 lines, and `public-footer.tsx` carries an 8-line docblock above its `"use client"`,
  // so the ONE client component that renders on EVERY player-facing page was invisible to the
  // check meant to find exactly it. Same class as the finding: a population that quietly
  // excludes its most important member. See [[a-guard-whose-population-is-blind]].
  if (!/^\s*["']use client["']/m.test(src)) continue;
  for (const g of OPERATOR_GETTERS) {
    if (new RegExp(`\\b${g}\\s*\\(`).test(src)) {
      v4.push(`${rel} — client component reads ${g}()`);
    }
  }
  // ── §5 ── And it may not IMPORT the server module at all: that one reaches `defineConfig`
  // → `prisma`, which cannot be bundled for a browser. A narrower rule than "no client file
  // imports @/lib/server/*", deliberately — four client files legitimately import plain
  // constants from server modules that pull in nothing, and a guard that failed on those
  // would be turned off rather than obeyed.
  if (/^import[^;]*from ["']@\/lib\/server\/support-config["']/m.test(src)) {
    v5.push(`${rel} — client component imports the SERVER support-config`);
  }
}

ok("§3 every helpline label renders the helpline", v3.length === 0, v3.join(" | "));
ok("§4 no client component reads an operator-editable contact", v4.length === 0, v4.join(" | "));
ok("§5 no client component imports the server support-config", v5.length === 0, v5.join(" | "));

// ────────────────────────────────────────────────────────────────────────────
// §6 + §7 — THE UNIT IS WHAT A PLAYER READS, AND §3's UNIT WAS THE SOURCE LINE
//
// 🔴 §3 says of itself: "The line is the unit because that is the unit a player reads."
// ⭐ THAT IS FALSE, AND IT COST US THREE LIVE DEFECTS. A player reads a CARD and a
// PARAGRAPH. §3 went green on 2026-09-10 while production served, measured:
//     «Call us +255769777877 Free helpline · 24/7»   on /help
// The operator's own desk line, published as the free national helpline. §3 could not see
// any of the three sites, each for a DIFFERENT reason, and every reason is a property of
// the unit or the vocabulary rather than of the code being checked:
//
//   1. `/help`'s ContactCard spans TWO lines of ONE element — `value={SUPPORT_PHONE()}`
//      on one, `sub={t.help.freeHelpline}` on the next. A line-scoped check sees a getter
//      with no label, then a label with no getter, and reports nothing. → §6 widens the
//      unit to the ELEMENT.
//   2. `/help`'s problem-gambling FAQ appends ` ${SUPPORT_PHONE()} (${t.common.free})`.
//      Same line, so §3 resolved the label — but `t.common.free` is "free", and
//      LOOKS_LIKE_HELPLINE is /helpline|hotline/i, which does not match it. → §6 widens the
//      VOCABULARY: a number offered as "free" is making the same claim as one called a
//      helpline, in every locale this platform serves.
//   3. `chat.ts` writes `Helpline ${SUPPORT_PHONE()} (free, 24/7)` as an ENGLISH LITERAL in
//      a prompt string. There is no `t.*` path on the line, so `resolveEn` is never called
//      and the loop has nothing to test. → §6 reads the window's RAW text as well as its
//      resolved labels. A claim is a claim whether it came from the dictionary or not.
//
// ⛔ AND §7 IS NOT A SPELLING RULE — IT IS THE ONE THAT MATTERS. `chat.ts` RULE 2 instructs
// the model, when a player says they cannot stop or are addicted, to reply with the
// OPERATOR'S OWN number. The statutory free line `0800 11 0011` is pinned three imports
// away and `grep -n HELPLINE src/app/_actions/chat.ts` returns nothing. A person asking the
// house for help getting away from the house is handed the house's phone number.
// ⚠️ Rewording a prompt makes a model MORE LIKELY to say the right thing, never certain —
// so §7 is a floor, not the safety mechanism. It fails if an at-risk response can name an
// operator getter at all, which is a property of the source and therefore actually decidable.
// ────────────────────────────────────────────────────────────────────────────

/** A number offered as free/24-7, in all three locales the platform serves. */
const FREE_FRAMING = /\b(free|toll[-\s]?free|bure|24\s*\/\s*7)\b|免费|全天候|saa\s*24/i;
/** A number called a helpline/hotline, in all three locales. */
const HELPLINE_WORD = /helpline|hotline|msaada wa tanzania|热线/i;
/** The moment a player identifies themselves as at risk. */
const AT_RISK = /problem gambling|gambling problem|chasing losses|can['’]?t stop|addicted|kucheza kupita kiasi|博彩问题/i;

/**
 * Every JSX component element's OPEN TAG, with its props — the unit a player actually meets.
 * Depth-tracked so a nested element inside a prop (`icon={<I.phone s={15} />}`) does not end
 * the scan early, which is exactly the shape `/help`'s ContactCard has.
 */
function elementWindows(src: string): { start: number; text: string }[] {
  const out: { start: number; text: string }[] = [];
  const re = /<([A-Z][A-Za-z0-9_]*)\b/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    let i = m.index + m[0].length, depth = 0, end = -1;
    while (i < src.length) {
      const c = src[i];
      if (c === "<") depth++;
      else if (c === ">") { if (depth === 0) { end = i; break; } depth--; }
      i++;
    }
    if (end > 0) out.push({ start: m.index, text: src.slice(m.index, end + 1) });
  }
  return out;
}

/** Resolve every `t.*` path in a window and return the English a player would read. */
const labelsIn = (text: string): string =>
  [...text.matchAll(/\b(t{1,2}(?:\.[A-Za-z0-9_]+)+)/g)]
    .map((m) => resolveEn(m[1])).filter(Boolean).join(" | ");

const v6: string[] = [];
const v7: string[] = [];

for (const f of files) {
  const src = decomment(readFileSync(f, "utf8"));
  const rel = relative(ROOT, f).replace(/\\/g, "/");
  const lineOf = (off: number) => src.slice(0, off).split(/\r?\n/).length;
  const callsOperator = (s: string) => OPERATOR_GETTERS.some((g) => new RegExp(`\\b${g}\\s*\\(`).test(s));

  // The window is the ELEMENT where there is one, and the LINE everywhere else — so a prompt
  // string, a plain sentence and a JSX card are each judged as the thing a player receives.
  const windows: { start: number; text: string }[] = [
    ...elementWindows(src).filter((w) => callsOperator(w.text)),
  ];
  let off = 0;
  for (const line of src.split(/\r?\n/)) {
    if (callsOperator(line)) windows.push({ start: off, text: line });
    off += line.length + 1;
  }

  for (const w of windows) {
    const readable = `${w.text} ${labelsIn(w.text)}`;
    const claim = HELPLINE_WORD.test(readable) ? "helpline/hotline"
      : FREE_FRAMING.test(readable) ? "free/24-7" : null;
    if (claim) {
      v6.push(`${rel}:${lineOf(w.start)} — an operator contact is published under a ${claim} claim`);
    }
    if (AT_RISK.test(readable)) {
      v7.push(`${rel}:${lineOf(w.start)} — an AT-RISK response names an operator contact instead of HELPLINE()`);
    }
  }
}

// De-duplicate: an element window and its own line both legitimately match the same defect.
const uniq = (a: string[]) => [...new Set(a)].sort();
ok("§6 no operator contact is published as a helpline or as free", uniq(v6).length === 0, uniq(v6).join(" | "));
ok("§7 no at-risk response hands out an operator contact", uniq(v7).length === 0, uniq(v7).join(" | "));

// ── The population itself must not be empty, or §3 and §4 would pass by finding nothing.
// This is the check that separates "no violations" from "no search". ──
const helplineSurfaces = files.filter((f) =>
  HELPLINE_GETTERS.some((g) => new RegExp(`\\b${g}\\s*\\(`).test(readFileSync(f, "utf8"))),
);
ok("§0 the population is non-empty", helplineSurfaces.length >= 3, `found ${helplineSurfaces.length} helpline surfaces`);
ok("§0 the file sweep found src", files.length > 200, `found ${files.length} files`);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
