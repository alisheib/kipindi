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

  // ── §10 · THE WRITER REFUSES WHAT IT CANNOT PUBLISH ────────────────────────────────────
  // 🔴 `SUPPORT_EMAIL()` is now the `ReplyTo` on every outbound message and the footer of all 61
  // templates, so a bad keystroke in the admin form is a TRANSPORT failure, not a cosmetic one.
  // These drive the REAL factory through the same seam §1 uses — a save is attempted and must
  // come back refused, with the config unchanged.
  // ⚠️ Each case is asserted TWICE: refused, AND the stored value untouched. A `set()` that
  // returned `{ok:false}` after already mutating the registry would satisfy the first alone, and
  // that is precisely the shape of defect this campaign's Unit 3 is about.
  const before = cfg.get();
  const refuses = (label: string, patch: Record<string, string>) => {
    const res = cfg.set(patch as never, "officer_test");
    ok(`§10 refuses ${label}`, res.ok === false, JSON.stringify(res));
    const after = cfg.get();
    ok(`§10 …and leaves the stored config untouched after ${label}`,
       after.email === before.email && after.phone === before.phone && after.phoneTel === before.phoneTel,
       JSON.stringify(after));
  };
  refuses("an address with no @", { email: "msaada", phone: before.phone, phoneTel: before.phoneTel });
  refuses("an address with a space", { email: "msaada @50pick.tz", phone: before.phone, phoneTel: before.phoneTel });
  refuses("a blank phone", { email: before.email, phone: "   ", phoneTel: "" });
  refuses("an undialable phone", { email: before.email, phone: "not-a-number", phoneTel: "" });

  // ⭐ THE POSITIVE CONTROL. Without it every §10 row above would still pass if `set()` refused
  // EVERYTHING — a config that never saves is not a validated config, it is a broken one.
  const good = cfg.set({ email: "msaada@50pick.tz", phone: "0712345678", phoneTel: "+255712345678" } as never, "officer_test");
  ok("§10 ⚠️ CONTROL — a well-formed save is ACCEPTED", good.ok === true, JSON.stringify(good));
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

// ────────────────────────────────────────────────────────────────────────────
// §8 — NO SUPPORT-CONTACT LITERAL OUTSIDE THE ONE FILE THAT OWNS IT
//
// 🔴 The campaign's own finding: fixing the persisted row fixed nothing, because the row was
// already right. What is wrong is every place that does NOT read it. Measured 2026-09-10, the
// tree carried THREE different support addresses as VALUES — `support@50pick.tz` in
// `server/email.ts` (the ReplyTo on all 61 templates) and in `push-service.ts`, and a third,
// `privacy@50pick.tz`, invented by the DSAR bundle and present in no config and no admin field.
//
// ⛔ AND A LITERAL IN A GUARD IS THE WORST CASE OF ALL. `pre-deploy-live-check.mjs:220` asserts
// the live footer contains `support@50pick.tz` — and `qa:live` IS on the `predeploy` chain. The
// footer already serves `msaada@50pick.tz`, so that gate pins a value the platform stopped
// publishing and would go RED against the correct fix. Same class as `multi-persona-test.mjs`
// asserting a retired `TZ-GBT`: a guard enforcing the defect.
//
// ⚠️ WHY THE DESK NUMBER IS BANNED ONLY IN E.164 FORM. The bare digits `0769777877` are ALSO the
// agent programme's `feeDestinationAccount` — a Selcom mobile-money account that happens to share
// its digits with the support line (`server/agent-config.ts`, `lipa-qr.test.mts`,
// `live/lipa-qr-drive.mjs`). A payment destination is not a contact, and banning the bare digits
// would accuse four correct files and collide with another campaign. `+255769777877` is only ever
// written as a contact, so that is the form this section forbids.
// ────────────────────────────────────────────────────────────────────────────
const CONTACT_LITERALS: [string, RegExp][] = [
  ["support@50pick.tz", /support@50pick\.tz/],
  ["msaada@50pick.tz", /msaada@50pick\.tz/],
  ["privacy@50pick.tz", /privacy@50pick\.tz/],
  ["the retired landline", /\+255\s?22\s?211\s?5811|\+255222115811/],
  ["the operator desk in E.164", /\+255\s?769\s?777\s?877|\+255769777877/],
];

/**
 * The only two files that may write a support contact as a VALUE.
 * ⭐ A comment may say anything — `decomment()` strips those before the scan — because a comment
 * recording what the app USED to serve is history, and deleting history is how this repo's
 * explanations rot. What may not survive is a value.
 */
const CONTACT_HOMES = new Set([
  "src/lib/support-config.ts",        // THE source of truth: the defaults and the pinned constants
  "scripts/support-contact.test.mts", // this file — a guard must name the values it asserts
]);

const v8: string[] = [];
{
  const scanned: string[] = [];
  (function walk(dir: string) {
    for (const e of readdirSync(dir)) {
      if (e === "node_modules" || e === ".next" || e.startsWith(".shots")) continue;
      const p = join(dir, e);
      if (statSync(p).isDirectory()) { walk(p); continue; }
      if (/\.(tsx|ts|mts|mjs|cjs|js)$/.test(e)) scanned.push(p);
    }
  })(ROOT + "/src");
  (function walk(dir: string) {
    for (const e of readdirSync(dir)) {
      if (e === "node_modules" || e.startsWith(".shots")) continue;
      const p = join(dir, e);
      if (statSync(p).isDirectory()) { walk(p); continue; }
      if (/\.(tsx|ts|mts|mjs|cjs|js)$/.test(e)) scanned.push(p);
    }
  })(ROOT + "/scripts");

  for (const f of scanned) {
    const rel = relative(ROOT, f).replace(/\\/g, "/");
    if (CONTACT_HOMES.has(rel)) continue;
    const src = decomment(readFileSync(f, "utf8"));
    src.split(/\r?\n/).forEach((line, i) => {
      for (const [name, re] of CONTACT_LITERALS) {
        if (re.test(line)) v8.push(`${rel}:${i + 1} — ${name} written as a literal`);
      }
    });
  }
  // The scan must actually have walked something, or §8 passes by finding no files.
  ok("§8 the literal sweep walked both trees", scanned.length > 400, `scanned ${scanned.length} files`);
}
ok("§8 no support contact is a literal outside support-config.ts", v8.length === 0, v8.join(" | "));

// ────────────────────────────────────────────────────────────────────────────
// §9 — THE DEFAULTS THEMSELVES, WHICH §8 DELIBERATELY CANNOT SEE
//
// ⛔ §8 exempts `support-config.ts`, because that file is where the values are allowed to live.
// The consequence is a blind spot, and a mutation proved it: reverting `SUPPORT_DEFAULTS.phone`
// to the retired landline passed every other section in this file. So the defaults need their
// own assertions.
//
// ⭐ THESE ARE STRUCTURAL, NOT A COPY OF TODAY'S NUMBER — on purpose. A guard that pins the
// literal `0769777877` would have to be edited the day the owner changes the desk line, and a
// guard that must be edited to let a correct change through is the exact trap this campaign
// found on the deploy path: `pre-deploy-live-check.mjs` demanding a footer address the platform
// had already stopped publishing, and `multi-persona-test.mjs` demanding a retired licence
// placeholder. What is invariant is the SHAPE the two fields exist to express:
//   · `phone` is what a player READS — the LOCAL form a Tanzanian dials, so never `+`-prefixed
//   · `phoneTel` is what a TAP dials — always E.164, and always derivable from `phone`
//   · `email` must be sendable, because it is now the ReplyTo on every message we send
// A ruling can move the digits; it cannot make the local form international.
// ────────────────────────────────────────────────────────────────────────────
{
  // Imported HERE rather than at the top so §9 reads the real module every run — the same
  // client-safe half the product imports, not a copy of its values transcribed into this file.
  const { SUPPORT_DEFAULTS, toDialTarget } = await import("../src/lib/support-config.ts");
  const d = SUPPORT_DEFAULTS;
  ok("§9 the default email is a usable address", /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email), d.email);
  ok("§9 the default phone is the LOCAL form a player reads", !!d.phone && !d.phone.trim().startsWith("+"), d.phone);
  ok("§9 the default phone is dialable at all", toDialTarget(d.phone) !== "", d.phone);
  ok("§9 the default phoneTel is E.164", /^\+\d{8,15}$/.test(d.phoneTel), d.phoneTel);
  // The load-bearing one: the number a player READS and the number a tap DIALS must be the same
  // number. This is what silently broke when the console derived one from the other by stripping
  // punctuation — a local `0…` stayed local and stopped dialling from abroad.
  ok("§9 phoneTel is exactly what phone derives to", toDialTarget(d.phone) === d.phoneTel,
     `phone ${d.phone} → ${toDialTarget(d.phone)} vs phoneTel ${d.phoneTel}`);
}

// ────────────────────────────────────────────────────────────────────────────
// §11 — NO MODULE-SCOPE VALUE MAY CAPTURE A CONFIG GETTER
//
// 🔴 Hydration is fire-and-forget, so anything evaluated at IMPORT captures `SUPPORT_DEFAULTS`
// and is frozen for the life of the process — while the same file's per-request reads see the
// operator's real row. One feature disagreeing with itself.
//
// ⛔ THE FIRST SWEEP FOR THIS CLASS REPORTED "NOTHING ELSE" AND WAS WRONG, WHICH IS WHY THIS IS A
// GUARD AND NOT A GREP. I looked for a getter and a `const` on the SAME LINE, found only
// `chat.ts`, and ticked the row. Three statutory legal pages — `legal/aml`, `legal/privacy`,
// `legal/responsible-gambling` — held the identical defect in a MULTI-LINE
// `const CONTENT: Record<Locale, React.ReactNode> = { … }`, invisible to a line-scoped search.
// A one-line search for a multi-line construct is the same mistake §3 made about JSX elements.
//
// ⚠️ A DEFERRED read is fine and must NOT be flagged: `const REPLY_TO = () => SUPPORT_EMAIL()`
// is a function, evaluated per call. So the test is not "does a getter appear in a top-level
// declaration" but "does it appear there with nothing to defer it".
// ────────────────────────────────────────────────────────────────────────────
const v11: string[] = [];
for (const f of files) {
  const src = decomment(readFileSync(f, "utf8"));
  const rel = relative(ROOT, f).replace(/\\/g, "/");
  // Top-level declarations only: `const`/`let`/`var` starting at column 0.
  const re = /^(?:export\s+)?(?:const|let|var)\s+[A-Za-z_$][\w$]*/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    // Span the declaration by tracking bracket depth until it closes at depth 0.
    let i = m.index + m[0].length, depth = 0, end = src.length;
    for (; i < src.length; i++) {
      const c = src[i];
      if (c === "{" || c === "(" || c === "[") depth++;
      else if (c === "}" || c === ")" || c === "]") depth--;
      else if (c === ";" && depth <= 0) { end = i; break; }
      if (depth < 0) { end = i; break; }
    }
    const span = src.slice(m.index, end);
    for (const g of OPERATOR_GETTERS) {
      const call = span.search(new RegExp(`\\b${g}\\s*\\(`));
      if (call < 0) continue;
      // Anything before the call that defers evaluation — an arrow or a function expression.
      const beforeCall = span.slice(0, call);
      if (/=>|\bfunction\b/.test(beforeCall)) continue;
      const line = src.slice(0, m.index).split(/\r?\n/).length;
      v11.push(`${rel}:${line} — module-scope value captures ${g}() at import`);
    }
  }
}
ok("§11 no module-scope value captures a config getter", [...new Set(v11)].length === 0, [...new Set(v11)].join(" | "));

// ────────────────────────────────────────────────────────────────────────────
// §12 — the LICENCE NUMBER, and the guard that could not fail   (Unit 8.3)
// ────────────────────────────────────────────────────────────────────────────
/**
 * 🔴 A GUARD FOR THIS ALREADY EXISTED AND IT WAS WORSE THAN NONE.
 * `rules-copy.test.mts:144` asserts `text.includes(LICENCE_NUMBER())` — and the text it
 * searches is `_content-yes-no.tsx:78`, which RENDERS `{LICENCE_NUMBER()}`. Both sides
 * call the same function, so the assertion holds for any value whatsoever, including a
 * placeholder, an empty string, or the `TZ-GBT-2026-XXXX` this platform actually
 * published to real players until 2026-09-10. ⭐ The tell is the one this repo has
 * written down before: BOTH SIDES MOVE TOGETHER.
 *
 * ⛔ SO THE VALUE HAS TO BE PINNED SOMEWHERE THAT DOES NOT READ IT FROM THE SUBJECT.
 * 12.1 is that place, and it is the only assertion in this file that hard-codes a
 * contact value on purpose: a licence reference is not deployment config, has no
 * environment variation, and has no correct value to fall back to. Ali supplied it.
 *
 * ⚠️ AND THE SCAN MUST SEE HARD-CODED COPIES, not only the dynamic path. A guard that
 * inspects `LICENCE_NUMBER()` call sites is blind to a second copy typed as a literal —
 * and a hard-coded literal is exactly what a wrong licence number looks like.
 */
{
  // ⚠️ ASSEMBLED, NOT SPELLED — for the same reason as RETIRED below. This file is inside
  // the population it scans, so a literal here would make §12.2 count the guard as a
  // second copy of the licence number. It did, on the first run with `scripts/` in scope.
  const LICENCE = ["OUS", "00000202602"].join("");
  const licenceDecl = readFileSync(join(SRC, "lib/support-config.ts"), "utf8");
  ok("§12.1 ⭐ the licence constant is the number Ali supplied — pinned against the RULING, not against itself",
    new RegExp(`LICENCE_NUMBER_VALUE\\s*=\\s*"${LICENCE}"`).test(licenceDecl),
    "the one assertion that rules-copy §3a cannot make, because it reads the value it checks");

  // Comments are stripped: this repo documents its retired values in prose, and a guard
  // that greps raw text matches the paragraph explaining the fix instead of the fix.
  const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, " ");

  /**
   * ⛔ THE POPULATION INCLUDES `scripts/`, AND THE FIRST DRAFT DID NOT — which made it
   * blind to the single place the retired placeholder actually survived.
   * `files` above walks `src/` and only `.ts`/`.tsx`, so a `.mjs` drive under `scripts/`
   * was outside the search by construction. That is the same blindness Unit 8.2 is about:
   * a guard whose population does not reach the defect passes beautifully.
   *
   * ⚠️ AND THE NEEDLE IS BUILT FROM PARTS ON PURPOSE. Once `scripts/` is in scope, this
   * file is in scope, so spelling the retired placeholder out here would make the guard
   * flag itself — §0a's "writing about a bad value reproduces it", which has already cost
   * this repo a `docs-links` failure today.
   */
  const RETIRED = ["TZ", "GBT"].join("-");
  const scriptFiles: string[] = [];
  (function walkScripts(dir: string) {
    for (const e of readdirSync(dir)) {
      const p = join(dir, e);
      if (statSync(p).isDirectory()) { walkScripts(p); continue; }
      if (/\.(mjs|mts|cjs|ts)$/.test(e)) scriptFiles.push(p);
    }
  })(join(ROOT, "scripts"));

  const literalSites: string[] = [];
  const retiredSites: string[] = [];
  const getterSites: string[] = [];
  for (const f of [...files, ...scriptFiles]) {
    const body = strip(readFileSync(f, "utf8"));
    const rel = relative(ROOT, f).replace(/\\/g, "/");
    if (body.includes(LICENCE)) literalSites.push(rel);
    if (body.includes(RETIRED)) retiredSites.push(rel);
    if (/\bLICENCE_NUMBER\s*\(/.test(body)) getterSites.push(rel);
  }

  ok("§12.2 the licence literal appears in exactly ONE file — its declaration, and nowhere else",
    literalSites.length === 1 && literalSites[0].endsWith("src/lib/support-config.ts"),
    literalSites.join(" | ") || "not found at all");
  // ⚠️ The label interpolates RETIRED rather than spelling it — a hard-coded name here
  // would be a third copy of the same mistake, in the failure message of the check that
  // exists to find it.
  ok(`§12.3 ⛔ no surface still carries the retired ${RETIRED} placeholder as a VALUE`,
    retiredSites.length === 0, retiredSites.join(" | "));
  // ⭐ CONTROL — without this, 12.2 and 12.3 both pass beautifully over a tree in which
  // nothing renders the licence at all. "No violations" and "no search" are not the same
  // reading, and this file's §0 exists for the same reason.
  ok("§12.4 ⚠️ CONTROL — the render sites were actually found, and they read the getter",
    getterSites.length >= 3, `found ${getterSites.length}: ${getterSites.slice(0, 6).join(", ")}`);
  // ⭐ CONTROL — the detector must still fire on a planted copy, or 12.2 proves only that
  // it ran. Constructed here rather than trusted.
  ok("§12.5 ⚠️ CONTROL — the literal detector still fires on a planted second copy",
    strip(`const footer = "Licensed under ${LICENCE}";`).includes(LICENCE));
}

// ────────────────────────────────────────────────────────────────────────────
// §13 — a guard off the deploy path cannot stop the regression it was written for  (Unit 8.1)
// ────────────────────────────────────────────────────────────────────────────
/**
 * ⭐ THE BRIEF'S LIST OF SIX "OMITTED" SUITES WAS STALE — two of them were added by row
 * 2.5 — and chasing it would have missed the sharper fact: FIVE OF THE GUARDS THIS
 * CAMPAIGN ITSELF SHIPPED were not on the chain a session runs before pushing. A guard
 * written for a defect, kept off the path that would catch it returning, is a guard that
 * has already failed once and nobody has noticed.
 *
 * ⚠️ THIS LIST IS HAND-WRITTEN, AND THAT IS DELIBERATE — it is the SPECIFICATION, not a
 * proxy for a population. Everywhere else in this file a hand-typed set would be the
 * failure mode (§3's population is derived from rendered English for exactly that
 * reason). Here the claim genuinely is "these named guards must be on the chain", so
 * naming them IS the assertion. What would make it vacuous is the chain not being read
 * at all, or a name being asserted that no longer exists — 13.2 and 13.3 close both.
 *
 * ⛔ AND RED SUITES STAY OFF, PERMANENTLY. `predeploy` is a pre-push checklist a human
 * runs; one that is red before you start is one people learn to ignore. Every suite added
 * here was confirmed green first.
 */
{
  const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")) as {
    scripts: Record<string, string>;
  };
  const chain = pkg.scripts.predeploy ?? "";
  const onChain = new Set([...chain.matchAll(/npm run ([A-Za-z0-9:_-]+)/g)].map((m) => m[1]));

  const MUST_BE_ON = [
    "test:support-contact",       // the contact source-of-truth guard, and §12 above
    "test:cert-c1",               // comms-email-truth — the 61-template inventory
    "test:chat-safety",           // Unit 6 — the at-risk path
    "test:rg-doors",              // Unit 7 — a break cannot be shortened
    "test:define-config-gate",    // Unit 3 — a save that never landed
    "test:config-hydration-gate", // Unit 5 — config frozen at module eval
    "test:stacking",              // Unit 9 — the primer over the bet widget
  ];
  const off = MUST_BE_ON.filter((k) => !onChain.has(k));
  ok("§13.1 ★ every guard this campaign shipped is on the predeploy chain", off.length === 0, off.join(" | "));

  // ⭐ CONTROL — if `predeploy` were renamed or emptied, `onChain` would be empty and
  // 13.1 would report every suite missing, which is loud. But if the REGEX stopped
  // matching, `off` would be everything too. The distinguishing reading is the size of
  // the chain itself: this is the check that separates "nothing is on it" from "I could
  // not read it".
  ok("§13.2 ⚠️ CONTROL — the predeploy chain was parsed and is substantial",
    onChain.size > 50, `parsed ${onChain.size} entries`);
  // ⭐ CONTROL — a named suite that no longer exists would sit on the chain as a broken
  // command and 13.1 would still be satisfied by its NAME appearing there.
  const phantom = MUST_BE_ON.filter((k) => !pkg.scripts[k]);
  ok("§13.3 ⚠️ CONTROL — every name asserted above is a real npm script", phantom.length === 0, phantom.join(" | "));
}

// ────────────────────────────────────────────────────────────────────────────
// §14 — a published contact must be ACTIONABLE where it is rendered   (Unit 10.1–10.3)
// ────────────────────────────────────────────────────────────────────────────
/**
 * ⭐ EVERY OTHER SECTION IN THIS FILE POLICES THE VALUE. NONE OF THEM HAS AN OPINION
 * ABOUT THE MARKUP — and the markup is the half that was failing. `/legal/terms` and
 * `/legal/privacy` printed the support address in a `<span>`, three times each, in three
 * locales, while attaching a 30-day disputes deadline to it; `reality-check.tsx` printed
 * the statutory helpline in a `<span>` inside the modal that interrupts live play,
 * directly under a Self-exclude button. Correct value, unreachable. `legal/aml` and
 * `legal/responsible-gambling` had the right shape all along, which is what makes this a
 * consistency rule rather than a new convention.
 *
 * ⛔ THE UNIT IS THE RENDERED TEXT NODE, NOT THE FILE. A file "contains a mailto" is
 * satisfiable by one correct anchor while five bare spans sit beside it — the footer
 * proves that shape exists. So each place the getter is rendered AS TEXT is located, and
 * the tag that encloses THAT occurrence is required to be an anchor with the matching
 * scheme.
 *
 * ⚠️ THIS CANNOT BE VERIFIED BY FETCHING THE LIVE PAGE, and that is worth recording.
 * Cloudflare Scrape Shield rewrites every `mailto:` on this origin into a
 * `/cdn-cgi/l/email-protection` interstitial and replaces the visible address with the
 * literal text "[email protected]" — measured 2026-09-11, zero real `mailto:` hrefs served
 * on any page. So a live grep for "mailto:" reads 0 whether the source is right or wrong.
 * The source is the only place this property is observable.
 */
{
  const SCHEMES: [string, string][] = [["SUPPORT_EMAIL", "mailto:"], ["HELPLINE", "tel:"]];
  /**
   * ⛔ ONE EXEMPTION, NAMED, WITH AN OWNER AND AN END DATE — not a pattern.
   * `legal/agent-terms/page.tsx` carries six bare renders across en/sw/zh and belongs to
   * the parallel PAYMENTS SEAL session (its Unit 6.3 rewrites those same JSX bodies).
   * Editing it from here would conflict inside a single paragraph. That session has the
   * anchor spec and removing this entry is the last step of its unit.
   * ⭐ 14.4 pins the exemption at exactly one file so it cannot quietly become a pattern.
   */
  const EXEMPT = ["src/app/legal/agent-terms/page.tsx"];

  const bare: string[] = [];
  let rendered = 0;
  for (const f of files) {
    const rel = relative(ROOT, f).replace(/\\/g, "/");
    if (EXEMPT.includes(rel)) continue;
    const body = readFileSync(f, "utf8");
    for (const [getter, scheme] of SCHEMES) {
      // `>{GETTER()}` — the getter standing as an element's own text. The same getter
      // inside an href reads `${GETTER()}`, preceded by `$`, so it cannot match here.
      const re = new RegExp(`>\\{${getter}\\(\\)\\}`, "g");
      for (const m of body.matchAll(re)) {
        rendered++;
        const before = body.slice(Math.max(0, m.index - 400), m.index);
        const open = before.lastIndexOf("<");
        const tag = open === -1 ? "" : before.slice(open);
        if (!(/^<a[\s>]/.test(tag) && tag.includes(scheme))) {
          const line = body.slice(0, m.index).split(/\r?\n/).length;
          bare.push(`${rel}:${line} renders ${getter}() with no ${scheme} anchor`);
        }
      }
    }
  }

  ok("§14.1 ★ every rendered support contact sits inside an anchor with the right scheme",
    bare.length === 0, bare.join(" | "));
  // ⭐ CONTROL — without this, 14.1 passes over a tree that renders no contact at all.
  ok("§14.2 ⚠️ CONTROL — contact text renders were actually found", rendered >= 8, `found ${rendered}`);
  // ⭐ CONTROLS — the detector must reject the bare shape and accept the correct one.
  // Calibrated on the two real shapes in this repo, constructed here rather than trusted.
  {
    const probe = (src: string) => {
      const m = [...src.matchAll(/>\{SUPPORT_EMAIL\(\)\}/g)][0];
      if (!m) return "no-match";
      const before = src.slice(0, m.index);
      const tag = before.slice(before.lastIndexOf("<"));
      return /^<a[\s>]/.test(tag) && tag.includes("mailto:") ? "accepted" : "flagged";
    };
    ok("§14.3 ⚠️ CONTROL — the detector flags a bare span and accepts a correct anchor",
      probe(`<span className="font-mono">{SUPPORT_EMAIL()}</span>`) === "flagged" &&
      probe("<a href={`mailto:${SUPPORT_EMAIL()}`} className=\"x\">{SUPPORT_EMAIL()}</a>") === "accepted");
  }
  ok("§14.4 ⚠️ CONTROL — the exemption list is exactly one named file that still exists",
    EXEMPT.length === 1 && files.some((f) => relative(ROOT, f).replace(/\\/g, "/") === EXEMPT[0]),
    EXEMPT.join(" | "));
}

// ────────────────────────────────────────────────────────────────────────────
// §15 — the last-resort error page duplicates the helpline ON PURPOSE   (Unit 10.6)
// ────────────────────────────────────────────────────────────────────────────
/**
 * ⭐ THIS IS THE ONE PLACE IN THE CAMPAIGN WHERE THE ANSWER IS *NOT* "READ THE CONSTANT",
 * and the reasoning is worth keeping because the obvious fix is the wrong one.
 *
 * `global-error.tsx` carries FOUR hardcoded copies of the statutory helpline — three
 * locale strings and one `tel:` href. The tempting fix is to import `HELPLINE()`, and it
 * is safe on the import graph: `src/lib/support-config.ts` imports NOTHING, and
 * `HELPLINE()` returns a module-scope const with no config read, no DB, no env.
 *
 * ⛔ BUT THE FILE CARRIES AN EXPLICIT, REASONED RULE AGAINST IT — *"Reach for ZERO
 * imports beyond React + next/link"*, *"this file deliberately imports nothing"*. It is
 * the root error boundary: it renders when the root layout itself has failed, which is
 * exactly the moment a module resolution is least trustworthy. Overriding a documented
 * ⛔ to save a duplication is how a robustness decision gets quietly undone by someone
 * who did not know it was one.
 *
 * ⭐ SO THE DUPLICATION STAYS AND THE DRIFT IS MADE IMPOSSIBLE INSTEAD. That is the same
 * trade the pinned constants already make: a value with no setter, held in one place,
 * and a gate that fails if a second place disagrees. What was actually wrong was never
 * the copies — it was that nothing compared them to anything.
 */
{
  const ge = readFileSync(join(SRC, "app/global-error.tsx"), "utf8");
  const helpline = HELPLINE();
  const helplineTel = HELPLINE_TEL();

  // Population DISCOVERED: every Tanzanian-helpline-shaped run of digits in the file,
  // spaced or unspaced. A hand-typed list of four line numbers would go blind the moment
  // a fifth copy appeared — which is the whole failure mode this campaign keeps meeting.
  const shaped = [...ge.matchAll(/0800[\d\s]{6,12}/g)].map((m) => m[0].trim());
  const wrong = shaped.filter((s) => s !== helpline && s.replace(/\s/g, "") !== helplineTel.replace(/\s/g, ""));

  ok("§15.1 ★ every helpline copy in the root error boundary matches the pinned constant",
    wrong.length === 0, wrong.join(" | "));
  // ⭐ CONTROL — 15.1 passes beautifully over a file that stopped showing the helpline at
  // all. The error page is where a player lands when everything else is broken; it losing
  // the statutory number silently is the outcome this control exists to make loud.
  ok("§15.2 ⚠️ CONTROL — the error boundary still publishes the helpline, and all four copies were found",
    shaped.length >= 4, `found ${shaped.length}`);
  // ⭐ CONTROL — the detector must reject a drifted copy, constructed rather than trusted.
  ok("§15.3 ⚠️ CONTROL — the detector rejects a drifted copy",
    [...("Helpline 0800 11 9999").matchAll(/0800[\d\s]{6,12}/g)]
      .map((m) => m[0].trim()).some((s) => s !== helpline));
}

// ── The population itself must not be empty, or §3 and §4 would pass by finding nothing.
// This is the check that separates "no violations" from "no search". ──
const helplineSurfaces = files.filter((f) =>
  HELPLINE_GETTERS.some((g) => new RegExp(`\\b${g}\\s*\\(`).test(readFileSync(f, "utf8"))),
);
ok("§0 the population is non-empty", helplineSurfaces.length >= 3, `found ${helplineSurfaces.length} helpline surfaces`);
ok("§0 the file sweep found src", files.length > 200, `found ${files.length} files`);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
