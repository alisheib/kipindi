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
  // 2026-10-09 (round 3, tiles 177 178 203): the leaderboard's ribbon struck its top TIER in `text-gold-300` — "Fedha",
  // silver, in the money ink. The ribbon states ranks, counts and rates; its gold accent is gone, and this keeps it gone.
  "src/components/layout/page-ribbon.tsx",
  // 2026-10-09 (round 5, R5-C's gold audit, tiles r5-4): the leaderboard PAGE itself — the podium's #1 honours ring, its
  // crown and rank disc in `--gold-400`/`--gold-300`, and the hot-streak chip in the gold ramp ("gold is principled on
  // the leaderboard (earned standing)" — standing IS identity). They wear the tier ladder's metal, `--metal-gold`, now.
  "src/app/leaderboard/page.tsx",
  // …and the ACHIEVEMENT icons: each coin's one accent was `--gold-400`. An achievement is what a player has done — the
  // tier ladder's sibling, which globals.css's own badge note calls it — so it takes the same metal.
  "src/components/badges/icons.tsx",
];

/**
 * The tokens the money surfaces own. Matching `--gold-N` covers the aliases' TARGETS — but an identity surface can name
 * an ALIAS instead, and the alias is the money ink by another name: `--border-gold`, `--glow-gold`, `--glow-jackpot`,
 * `--g-gold`, `--gold`, `--bet-jackpot`… (R5-C, 2026-10-09: the achievement coin wore `--border-gold` and `--glow-gold`
 * and this list could not see either). And `--warning-fg` IS `--gilt` (DESIGN_AUTHORITY F3), so it is here too.
 */
const MONEY_INK = /var\(\s*--(gilt|gilt-metal|gilt-ink|gilt-strong|gilt-reeding|gilt-metal-edge|gilt-sheen|gold-(300|400|500)|gold|gold-(?:hover|active|fg|subtle|subtle-hover)|border-gold|glow-gold|glow-jackpot|g-gold|g-jackpot|bet-jackpot|bet-streak|warning-fg)\s*\)/g;

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

/** CSS rules that paint an ACHIEVEMENT coin — the tier ladder's sibling (R5-C, 2026-10-09). The coin, its edge ring, the
 *  unlocked state and the tier ribbon are identity METAL (`--metal-gold`); the progress ring and its count are PROGRESS
 *  (the brand family). None of them may wear the money ink. */
// Round 7 (R7-A, 2026-10-10, R5-8) moved one entry: the progress count is the tier pip's chip in the progress inks now, so
// its rule is `.badge-tier-pip.badge-count` (the count no longer hangs in the gap above the name).
const BADGE_RULES = [".badge", ".badge::after", ".badge--unlocked", ".badge-ring-arc", ".badge-tier-pip.badge-count", ".badge-tier-pip"];

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
// ⭐ CONTROLS for the aliases (R5-C) — an alias of the money ink is caught; the identity metal is not money ink.
{
  const hit = (src: string) => [...strip(src).matchAll(MONEY_INK)].map((m) => m[0]);
  ok("1c.control · a planted `var(--border-gold)` / `var(--glow-gold)` / `var(--warning-fg)` is caught",
    hit('<i style={{ border: "1px solid var(--border-gold)", boxShadow: "var(--glow-gold)", color: "var(--warning-fg)" }} />').length === 3);
  ok("1c.control · the identity metal `var(--metal-gold)` and `var(--gold-950)` are not money ink",
    hit('<i style={{ color: "var(--metal-gold)", background: "var(--gold-950)" }} />').length === 0);
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

console.log("\n── 2b · the achievement coins are metallic, not monetary (R5-C, 2026-10-09) ──");
{
  /** The body of the rule whose selector is EXACTLY `sel` (not a longer selector that starts with it). */
  const ruleBody = (src: string, sel: string): string | null => {
    const re = new RegExp(`\\n${sel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\{`);
    const m = re.exec(src);
    if (!m) return null;
    const open = m.index + m[0].length;
    return src.slice(open, src.indexOf("}", open));
  };
  const cssCode = strip(css);
  for (const sel of BADGE_RULES) {
    const body = ruleBody(cssCode, sel);
    ok(`2b.locate · ${sel} exists in globals.css`, body !== null);
    if (body === null) continue;
    const hits = [...body.matchAll(MONEY_INK)].map((m) => m[0]);
    ok(`2b · ${sel} wears no money-ink token`, hits.length === 0, hits.join(", "));
  }
  // ⭐ THE CONTROL — the coin is still METAL (the law is satisfied by the metal, not by an empty rule), and a planted gilt
  // rim back on the coin is caught by the same reading.
  const coin = ruleBody(cssCode, ".badge") ?? "";
  ok("2b.control · the coin's rim and stroke are the tier ladder's metal (`--metal-gold`)", /border:\s*1\.5px solid var\(--metal-gold\)/.test(coin) && /color:\s*var\(--metal-gold\)/.test(coin));
  const planted = cssCode.replace(/(\n\.badge\s*\{[^}]*?)border:\s*1\.5px solid var\(--metal-gold\)/, "$1border: 1.5px solid var(--border-gold)");
  ok("2b.control · a planted `--border-gold` rim on the coin is caught", [...(ruleBody(planted, ".badge") ?? "").matchAll(MONEY_INK)].length === 1);
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
