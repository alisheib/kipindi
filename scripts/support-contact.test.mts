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

// ── The population itself must not be empty, or §3 and §4 would pass by finding nothing.
// This is the check that separates "no violations" from "no search". ──
const helplineSurfaces = files.filter((f) =>
  HELPLINE_GETTERS.some((g) => new RegExp(`\\b${g}\\s*\\(`).test(readFileSync(f, "utf8"))),
);
ok("§0 the population is non-empty", helplineSurfaces.length >= 3, `found ${helplineSurfaces.length} helpline surfaces`);
ok("§0 the file sweep found src", files.length > 200, `found ${files.length} files`);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
