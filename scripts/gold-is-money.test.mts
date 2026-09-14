/**
 * Q5 — GOLD IS MONEY, AND NOTHING ELSE. The rule, enforced.
 *
 * ⭐ Ali's ruling 2026-08-10. M3 reserves struck gold for money that was **earned** — a payout,
 * a celebration, a resolved seal. Identity may be METALLIC; it may not wear the tokens the
 * money surfaces own: `--gilt`, `--gilt-metal`, `--gilt-ink`, `--gilt-strong`, and the
 * `--gold-300…500` ramp those aliases resolve to.
 *
 * 🔴 WHY THIS FILE EXISTS, AND IT IS NOT A FORMALITY. Q5 shipped as PROSE — the law was written
 * into `identity-avatar.tsx`'s own comment and into `globals.css`, and nothing checked it. An
 * audit of the close-out then found the law FALSE IN ITS OWN FILE: `TIER_RING` had been moved
 * off the money tokens and the `.tier-*` chord with it, but the sovereign ring's **inline**
 * `boxShadow` still read `var(--gilt)` — the money ink itself — because that one ring is
 * composed in TSX rather than read from the table. Two edits, both correct, and the violation
 * sat between them.
 *
 * ⛔ **A LAW WITH NO GATE IS A SUGGESTION**, and this one had already been broken by the commit
 * that introduced it. That is the argument for the file.
 *
 * ⚠️ SCOPED TO IDENTITY SURFACES ON PURPOSE. Money surfaces MUST use these tokens — that is the
 * whole point — so a repo-wide ban would be nonsense. The list below is the set of files that
 * render identity (who you are, which asset, which rank), and it may only GROW.
 */
import { readFileSync } from "node:fs";

/** Files that render IDENTITY. Gold here would mean "status", which is the confusion Q5 ends. */
const IDENTITY_SURFACES = [
  "src/components/ui/identity-avatar.tsx",
  "src/components/updown/updown-card.tsx",
];

/** The tokens the money surfaces own. Matching `--gold-N` covers the aliases' targets too. */
const MONEY_INK = /var\(\s*--(gilt|gilt-metal|gilt-ink|gilt-strong|gilt-reeding|gold-(300|400|500))\s*\)/g;

/**
 * 🔴 THE SAME TOKENS AS TAILWIND CLASSES (2026-09-14, session 97). `MONEY_INK` matches `var(--gold-300)` and nothing
 * else, so `className="text-gold-300"` on an identity surface — the way this codebase writes colour 244 times — passed
 * untouched. Found while asking why the suite was green over /live's gold "selection closed" time. (That one is not a
 * Q5 breach: Q5 polices IDENTITY surfaces, and flat `--gold-300` is also the warning ink — `--warning-fg` IS `--gilt`,
 * DESIGN_AUTHORITY F3 — which the market page uses for the same state three times.) The class form is policed now.
 */
const MONEY_CLASS = /\b(?:text|bg|border|ring|fill|stroke|from|via|to|shadow|outline|decoration|accent|caret|divide|placeholder)-(?:gold(?:-(?:300|400|500))?|gilt(?:-strong)?)(?![\w-])/g;

/** CSS rules that paint a RANK badge — same law, other side of the wire. */
const TIER_RULES = [".tier-bronze", ".tier-silver", ".tier-gold", ".tier-diamond", ".tier-sovereign"];

let pass = 0;
const fails: string[] = [];
const ok = (n: string, c: boolean, d = "") => {
  if (c) { pass++; console.log(`  ok   ${n}`); } else { fails.push(`${n}${d ? ` — ${d}` : ""}`); console.log(`  FAIL ${n}${d ? ` — ${d}` : ""}`); }
};
const read = (p: string) => readFileSync(p, "utf8").replace(/\r\n/g, "\n");
/** ⛔ Comments are stripped FIRST — this file's own law is written in a comment naming every
 *  banned token, and so are the tombstones in the surfaces below. Never match on words the
 *  code's own documentation will one day contain. */
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, "").replace(/\/\/.*$/gm, "");

console.log("\nQ5 — gold is money, and nothing else\n");

console.log("── 1 · identity surfaces carry no money ink ─────────────────────");
for (const f of IDENTITY_SURFACES) {
  const raw = read(f);
  const code = strip(raw);
  // ⭐ THE CONTROL FIRST. If `strip` ever over-reaches, every absence below passes over nothing.
  ok(`1.control · ${f} is still real code after stripping`, code.length > 500 && /export/.test(code), `${code.length} chars`);
  const hits = [...code.matchAll(MONEY_INK)].map((m) => m[0]);
  ok(`1 · ${f} uses no money-ink token`, hits.length === 0, hits.join(", "));
  const classHits = [...code.matchAll(MONEY_CLASS)].map((m) => m[0]);
  ok(`1b · ${f} uses no money-ink Tailwind class`, classHits.length === 0, classHits.join(", "));
}
// ⭐ CONTROLS for 1b — the class form of the defect, planted, must be caught; neighbouring non-money classes must not be.
{
  const hit = (src: string) => [...strip(src).matchAll(MONEY_CLASS)].map((m) => m[0]);
  ok("1b.control · a planted `text-gold-300` is caught", hit('<span className="font-mono text-gold-300">x</span>').length === 1);
  ok("1b.control · `border-gilt` and `bg-gold/15` are caught", hit('<i className="border-gilt bg-gold/15" />').length === 2);
  ok("1b.control · `text-goldenrod`-like and `gold-600` tokens are not money ink", hit('<i className="text-golden bg-gold-600" />').length === 0);
}

console.log("\n── 2 · the rank ladder is metallic, not monetary ────────────────");
const css = read("src/app/globals.css");
for (const sel of TIER_RULES) {
  const i = css.indexOf(`\n${sel}`);
  ok(`2.locate · ${sel} exists in globals.css`, i >= 0);
  if (i < 0) continue;
  const open = css.indexOf("{", i);
  const body = css.slice(open + 1, css.indexOf("}", open));
  const hits = [...body.matchAll(MONEY_INK)].map((m) => m[0]);
  ok(`2 · ${sel} wears no money-ink token`, hits.length === 0, hits.join(", "));
}

console.log("\n── 3 · …and the law is still WORTH enforcing (a live consumer exists) ──");
// ⛔ Without this the suite could pass by the tokens having been deleted platform-wide, which
// would be a different and much worse product. Money surfaces MUST still use them.
const motion = read("src/app/motion.css");
ok("3 · `.gilt-ink` still exists and is still consumed by a money surface",
   /\.gilt-ink\s*\{/.test(motion) && /gilt-ink/.test(read("src/components/markets/win-celebration.tsx")),
   "if this fails, gold was removed rather than reserved");

console.log(`\ngold-is-money: ${pass} passed, ${fails.length} failed\n`);
if (fails.length) {
  console.error("✗ Q5 BROKEN — an identity surface is wearing the ink that means EARNED MONEY.\n");
  for (const f of fails) console.error(`  · ${f}`);
  process.exit(1);
}
console.log("gold-is-money: OK — identity is metallic, money is gold, and the two do not overlap.");
