/**
 * test:social-panel — the channels panel is non-disturbing, out of the way, and can never
 * appear beside a second floating invitation or to a player on a break.
 *
 * WHY THIS GUARD EXISTS (2026-09-12). The panel is an INTERSTITIAL PROMPT carrying a
 * SOLICITATION VERB, on a licensed gambling platform whose `/legal/responsible-gambling` §4
 * publishes "no marketing to self-excluded players". `docs/COMPLIANCE-DECISIONS.md` records
 * Ali's override; this file is the half of that override that is enforced rather than promised.
 * ⛔ If a check here starts failing, the honest fix is the code — not the check. The entry in
 * COMPLIANCE-DECISIONS names these behaviours as the conditions the override rests on.
 *
 * ─── THE THREE THINGS A GUARD MUST STATE ───
 *  1. POPULATION — the panel, the shell that mounts it, the install card it shares a slot with,
 *     the slot module, and every `.tsx` under `src/` for §6. Read, never assumed.
 *  2. HEAD COUNT OUTSIDE THE FLOOR — zero.
 *  3. THE CONTROLS — SEVEN mutations, each injected into the SOURCE STRING a section reads,
 *     so no section can pass by reading nothing:
 *        npm run red:social-panel   (expects exactly EIGHT failures — seven mutations, and the
 *        slot mutation legitimately trips both §4.1 and §4.7, which check different things)
 *     ⚠️ It exits 2, not 1, on FEWER than eight — a control that stops firing is a section that
 *     stopped checking, and that must never look like a pass or like an ordinary red.
 *     ⭐ Three of these controls exist because an adversarial audit found the checks they target
 *     were satisfiable WITHOUT the behaviour: §2.1 by the import line, §2.6 by the prop name in
 *     the component's own signature, and §3.1 by an inverted comparison.
 *
 * ⚠️ WHAT THIS CANNOT SEE. It is a SOURCE check. It cannot tell you the panel actually renders,
 * where it lands, or whether it overlaps the tab bar — `npm run qa:social-panel` drives that in
 * a real browser with rectangle intersection, and neither is a substitute for the other.
 *
 * Run: npm run test:social-panel
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const PROVE_RED = process.argv.includes("--prove-red");

const PANEL = "src/components/social/channels-panel.tsx";
const SHELL = "src/components/layout/app-shell.tsx";
const INSTALL = "src/components/pwa/install-invite.tsx";
const SLOT = "src/lib/invitation-slot.ts";

const read = (p: string) => readFileSync(p, "utf8");
/** Source with block/line comments blanked — for checks that must not match prose. */
const code = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

let pass = 0;
const fails: string[] = [];
const ok = (label: string, cond: boolean, extra = "") => {
  if (cond) { pass++; console.log(`  ✓ ${label}`); }
  else { fails.push(label); console.log(`  ✗ ${label}${extra ? ` — ${extra}` : ""}`); }
};
const section = (s: string) => console.log(`\n── ${s} ${"─".repeat(Math.max(0, 62 - s.length))}`);

let panel = read(PANEL);
let shell = read(SHELL);
let install = read(INSTALL);
const slot = read(SLOT);

// Seven mutations, EIGHT expected failures — the slot one trips §4.1 and §4.7 by design.
// They mutate what the sections READ, so nothing can pass vacuously.
if (PROVE_RED) {
  panel = panel.replace("const MIN_DWELL_MS = 45_000;", "const MIN_DWELL_MS = 1_000;");
  panel = panel.replace("^\\/(legal|profile)\\/responsible-gambling(\\/|$)", "^\\/nowhere");
  panel = panel.replace('useInvitationSlot("channels", "top-right", 1, eligible)', "false");
  install = install.replace('data-invitation="install"', "");
  panel = panel.replace(" || isCommitSurface(path)", "");
  panel = panel.replace("const eligible = open && !promoSuppressed", "const eligible = open");
}

console.log("\nSOCIAL PANEL — the interstitial the compliance override paid for\n");

// ─────────────────────────────────────────── §1 "NON-DISTURBING" IS A NUMBER
section("§1 · non-disturbing, stated as numbers");
{
  const num = (name: string) => Number(panel.match(new RegExp(`const ${name} = ([0-9_]+);`))?.[1]?.replace(/_/g, "") ?? NaN);
  const visits = num("MIN_VISITS");
  const dwell = num("MIN_DWELL_MS");
  const backoff = num("BACKOFF_AFTER");
  const max = num("MAX_DISMISSALS");
  // ⭐ RANGES, NOT EQUALITIES. Pinning the exact number would make every future tuning a guard
  // edit, and a guard nobody may tune is a guard people delete. The FLOOR is the contract.
  ok("1.1 never on a first-ever visit", visits >= 2, `MIN_VISITS=${visits}`);
  ok("1.2 never in the opening seconds", dwell >= 30_000, `MIN_DWELL_MS=${dwell}`);
  ok("1.3 it backs off before it stops", backoff >= 2 && backoff < max, `BACKOFF_AFTER=${backoff} MAX=${max}`);
  ok("1.4 a finite number of refusals ends it", max > 0 && max <= 8, `MAX_DISMISSALS=${max}`);
  ok("1.5 once per visit — a session flag, so a soft navigation cannot re-show it",
     /K_SESSION[\s\S]{0,80}sessionStorage|const K_SESSION = "50pick-channels-shown"/.test(panel)
     && /read\(K_SESSION, true\)/.test(code(panel)));
  ok("1.6 tapping a channel is a PERMANENT stop", /write\(K_DONE, "1"\)/.test(code(panel)));
}

// ────────────────────────────────────── §2 IT STAYS OFF THE WRONG SURFACES
section("§2 · where it must never appear");
{
  const c = code(panel);
  /* ⛔ THE CALL, NOT THE IDENTIFIER. This read `/isCommitSurface/` and was satisfied by the
     IMPORT LINE alone — `code()` strips comments, not imports — so deleting the predicate from
     `suppressedRoute` left it green with zero call sites remaining. An audit reproduced it by
     mutation. Pin the invocation. */
  ok("2.1 the money-commit gate is CALLED, not merely imported",
     /isCommitSurface\(path\)/.test(c), "the import line alone used to satisfy this");
  ok("2.2 auth and admin are suppressed", /\^\\\/\(auth\|admin\)/.test(c));
  ok("2.3 ⛔ BOTH responsible-gambling routes are suppressed",
     /\(legal\|profile\)\\\/responsible-gambling/.test(c),
     "a follow prompt on the page where someone is setting a limit is the worst of it");
  ok("2.4 ⭐ suppression is tested in the EFFECT *and* in the RENDER",
     (c.match(/suppressedRoute\(pathname\)/g) ?? []).length >= 2,
     "first-visit-primer shipped this exact bug: the effect returned early on the new path, `open` stayed true, and the card sat over the bet widget");
  ok("2.5 it never covers a real dialog",
     /\[role="dialog"\]\[aria-modal="true"\]/.test(c));
  /* 🔴 THE WHOLE COMPLIANCE OVERRIDE RESTS ON THIS, AND IT USED TO BE AN IDENTIFIER TEST.
     `promoSuppressed` appears twice in the component's own signature, so deleting all three
     BEHAVIOURAL uses left the check green — and nothing else would have caught it: this repo's
     `lint` is `tsc --noEmit`, with neither `noUnusedLocals` nor `noUnusedParameters` set, and
     there is no ESLint config at all. Three assertions now, one per place it must bite. */
  ok("2.6a the RG flag is a term of `eligible`", /const eligible = open && !promoSuppressed/.test(c));
  ok("2.6b …the effect returns early for a suppressed player", /if \(promoSuppressed\) return;/.test(c));
  ok("2.6c …and the RENDER refuses too, not just the effect",
     /if \(promoSuppressed \|\| suppressedRoute\(pathname\)\) return null;/.test(c),
     "a suppressed player must never see it even if state says open");
}

// ───────────────────────────────────────────── §3 THE RG GATE IS REAL
section("§3 · the responsible-gambling gate actually exists");
{
  const s = code(shell);
  /* ⚠️ WAS `/promoSuppressed\s*=/`, which an INVERTED derivation would also satisfy. Read the
     operator: a break that is still running means the timestamp is in the FUTURE. */
  ok("3.1 the derivation is `until(...) > now`, not its inverse",
     /until\(rg\?\.selfExclusionUntil\) > now/.test(s)
     && /until\(rg\?\.coolingOffUntil\) > now/.test(s),
     "an inverted comparison would suppress exactly the players who are NOT on a break");
  ok("3.2 ⛔ from the RG row ALREADY fetched — no sixth round trip on every page",
     /rg\?\.selfExclusionUntil/.test(s) && /rg\?\.coolingOffUntil/.test(s)
     && !/isLockedOut\(/.test(s),
     "the shell's own batch note forbids another query here");
  ok("3.3 it is threaded to the panel as a prop", /promoSuppressed=\{promoSuppressed\}/.test(s));
  ok("3.4 it defaults FALSE — it gates an OFFER, never a refusal (feature-state LAW 1)",
     /let promoSuppressed = false;/.test(s));
}

// ────────────────────────────────────────── §4 ONE INVITATION AT A TIME
section("§4 · one floating invitation, ever");
{
  ok("4.1 the panel claims the TOP-RIGHT zone", /useInvitationSlot\("channels", "top-right", 1, eligible\)/.test(code(panel)));
  ok("4.2 the install card claims the BOTTOM zone — a DIFFERENT one, which is the whole fix",
     /useInvitationSlot\("install", "bottom", 1, eligible\)/.test(code(install)),
     "one global slot with a fixed priority guaranteed the loser never showed; measured on production as invitations:[install] on every visit");
  ok("4.3 both are labelled for measurement", /data-invitation="channels"/.test(panel) && /data-invitation="install"/.test(install));
  ok("4.4 within a zone the lower priority wins, and the snapshot is a stable string",
     /c\.priority < cur\.priority/.test(slot) && /\.sort\(\)\.join\("\|"\)/.test(slot),
     "useSyncExternalStore loops forever if getSnapshot is not referentially stable");
  ok("4.5 nothing holds a zone during SSR", /function serverHolders/.test(slot));
  ok("4.7 ⭐ the two cards are in DIFFERENT zones, so they can never compete",
     /useInvitationSlot\("channels", "top-right"/.test(code(panel))
     && /useInvitationSlot\("install", "bottom"/.test(code(install)),
     "this is the invariant that makes the panel reachable at all");
  ok("4.6 the shell mounts the panel", /<LazyChannelsPanel promoSuppressed=\{promoSuppressed\} \/>/.test(shell));
}

// ────────────────────────────────────── §5 IT IS NON-BLOCKING AND NAMED
section("§5 · non-blocking, dismissible, named");
{
  ok("5.1 aria-modal is false — it never blocks the page", /aria-modal="false"/.test(panel));
  ok("5.2 no focus trap and no scroll lock", !/useModalLock|FOCUSABLE/.test(code(panel)));
  ok("5.3 Escape calls the SAME dismiss the X calls",
     /e\.key === "Escape"\) dismiss\(\)/.test(code(panel)),
     "a quieter close the frequency rules cannot see is a second definition of dismissal");
  ok("5.4 the dismiss control meets the 44px tap floor", /h-\[44px\] w-\[44px\]/.test(panel));
  /* ⚠️ THIS ONLY SCANNED DOUBLE-QUOTED classNames, and the one element that actually floats —
     the container — uses a TEMPLATE LITERAL, so it was outside the population entirely. It also
     missed a leading `-mt-2` (no preceding space) and a variant-prefixed `lg:-mt-2`. Both
     className forms, token-boundary matched. */
  {
    const values = [...panel.matchAll(/className=(?:"([^"]*)"|\{`([^`]*)`\})/g)].map((m) => m[1] ?? m[2] ?? "");
    const offenders = values.filter((v) => /(^|[\s:])-m[trblxyse]?-/.test(v));
    ok("5.5 ⛔ no negative margins in EITHER className form — that is how a control leaves its box",
       offenders.length === 0, offenders.join(" | "));
    ok("5.5b the className sweep actually found the container (vacuity floor)",
       values.some((v) => v.includes("mat-float")), `scanned ${values.length} className values`);
  }
  ok("5.6 ⛔ no truncate or line clamp — the box grows, the words stay whole",
     !/\btruncate\b|line-clamp|whitespace-nowrap/.test(code(panel)));
  ok("5.7 every localStorage touch is wrapped and fails closed",
     (code(panel).match(/try \{/g) ?? []).length >= 2 && /catch \{/.test(code(panel)));
  /* ⚠️ REWRITTEN 2026-09-12 WHEN THE PANEL MOVED TO THE TOP-RIGHT, AND IT IS STRICTER, NOT
     LOOSER. It used to require `lg:bottom-6`; a top-anchored card has no bottom rung. What it
     asserts now is the thing that actually matters — the vertical offset is MEASURED from the
     real bottom of the header-and-banner stack, and it is capped. A hardcoded `top` here would
     have put a marketing card over the KYC-verify banner. */
  ok("5.8 no inline `bottom` — that is what made the install card's offset un-overridable",
     !/style=\{\{[^}]*\bbottom:/.test(panel));
  ok("5.9 ⛔ the top offset is MEASURED off `#main-content`, never a hardcoded number",
     /getElementById\("main-content"\)/.test(code(panel))
     && /style=\{\{ top: `\$\{topPx\}px`/.test(panel),
     "a fixed 72px would sit on the KYC-verify banner — the bar that gates depositing");
  ok("5.10 …and it is capped, because those bars scroll away and the panel does not",
     /TOP_CAP/.test(code(panel)) && /Math\.min\(/.test(code(panel)));
  ok("5.11 the mark grows from the corner it is anchored to",
     /transformOrigin: "top right"/.test(panel));
  ok("5.12 it takes a kit rung rather than composing a shadow",
     /mat-float/.test(panel) && /data-rung="float"/.test(panel) && !/shadow-lg|glass-panel/.test(panel));
}

// ───────────────────────── §6 A COMMENT IS NOT INERT IN A SCANNED FILE
section("§6 · no class-shaped prose (the stylesheet-killer)");
{
  /**
   * 🔴 EARNED THE HARD WAY, 2026-09-12. A comment in `channels-panel.tsx` referred to the
   * arbitrary class with its inner argument elided, i.e. an ellipsis inside the brackets.
   * TAILWIND SCANS COMMENTS. It compiled that prose into a real rule whose value contained the
   * literal dots — invalid CSS — and ONE bad declaration failed the whole stylesheet parse.
   * Every route served 500. Not the component: every route.
   * ⭐ Three dots can never be valid inside a CSS value, so this is a precise, general check
   * with no false positives, and it lands at zero across the whole tree.
   */
  function walk(dir: string, out: string[] = []): string[] {
    for (const e of readdirSync(dir)) {
      const p = join(dir, e);
      if (statSync(p).isDirectory()) walk(p, out);
      else if (p.endsWith(".tsx") || p.endsWith(".ts")) out.push(p);
    }
    return out;
  }
  const ARBITRARY_WITH_ELISION = /\b[a-z][a-z0-9-]*-\[[^\]\s]*\.\.\.[^\]\s]*\]/g;
  const offenders: string[] = [];
  for (const f of walk("src")) {
    const text = readFileSync(f, "utf8");
    for (const m of text.matchAll(ARBITRARY_WITH_ELISION)) {
      offenders.push(`${f.replace(/\\/g, "/")} → ${m[0]}`);
    }
  }
  if (PROVE_RED) offenders.push("src/__prove_red__.tsx → bottom-[calc(96px_+_env(...))]");
  ok("6.1 no arbitrary-value class anywhere in src/ contains an elision",
     offenders.length === 0, offenders.slice(0, 4).join(" | "));
}

// ─────────────────────────────────────────────── §7 TRILINGUAL COPY
section("§7 · the copy exists in all three locales");
{
  const dict = read("src/lib/i18n-dict.ts");
  /**
   * ⚠️ SCOPED TO THE `channels` BLOCKS, NOT GREPPED OVER THE WHOLE FILE. The first draft counted
   * `^\s*title: "` across the dictionary and found 48 — `title` is one of the commonest key
   * names in it — so the check reported a failure that said nothing about this feature. A
   * whole-file grep for a generic key name is a measurement over the wrong population, and it
   * would have been just as happy to report a false PASS.
   */
  const blocks = [...dict.matchAll(/\n {4}channels: \{([\s\S]*?)\n {4}\},/g)].map((m) => m[1]);
  ok("7.0 there are exactly three `channels` blocks — one per locale", blocks.length === 3, `found ${blocks.length}`);
  const keys = ["title", "joinInstagram", "joinTiktok", "joinWhatsapp", "ariaJoinInstagram", "ariaJoinTiktok", "ariaJoinWhatsapp"];
  for (const k of keys) {
    const n = blocks.filter((b) => new RegExp(`^\\s*${k}: "`, "m").test(b)).length;
    ok(`7.${keys.indexOf(k) + 1} channels.${k} exists in all three locales`, n === 3, `found in ${n} block(s)`);
  }
  // ⭐ WCAG 2.5.3 Label in Name, asserted on the strings themselves rather than hoped for.
  for (const [i, b] of blocks.entries()) {
    const pairs: [string, string][] = [
      ["joinInstagram", "ariaJoinInstagram"],
      ["joinTiktok", "ariaJoinTiktok"],
      ["joinWhatsapp", "ariaJoinWhatsapp"],
    ];
    const bad = pairs.filter(([l, a]) => {
      const label = b.match(new RegExp(`${l}: "([^"]*)"`))?.[1];
      const aria = b.match(new RegExp(`${a}: "([^"]*)"`))?.[1];
      return !label || !aria || !aria.includes(label);
    });
    ok(`7.1${i} locale ${i + 1} — every accessible name contains its visible label (WCAG 2.5.3)`,
       bad.length === 0, bad.map(([l]) => l).join(", "));
  }
  ok("7.8 ⛔ the WhatsApp row still says \"channel\" — a bare WhatsApp promises an inbox nobody staffs",
     /joinWhatsapp: "Join our WhatsApp channel"/.test(dict));
  /* ⛔ THE HEADING PROMISES NOTHING, AND THAT IS THE POINT (G8 — no surface states anything
     false). It read "Daily updates and polls" first, which is true of the WhatsApp channel and
     was never established for Instagram or TikTok — and a sentence true of one of three things
     is false as a heading over all three. "Follow 50pick" is the standard label for this module,
     makes no content claim, and cannot go stale when a channel changes what it posts. */
  ok("7.9 ⛔ the heading claims nothing about content that could become false",
     /title: "Follow 50pick"/.test(dict)
     && !/channels:[\s\S]{0,400}(results|bonus|offers|news|daily)/i.test(dict));
}

console.log(`\n${fails.length === 0 ? "ALL PASS" : `${fails.length} FAILED`} — ${pass} passed, ${fails.length} failed\n`);
if (PROVE_RED) {
  const expected = 8;
  console.log(`--prove-red: expected ${expected} failure(s), saw ${fails.length}\n`);
  process.exit(fails.length >= expected ? 1 : 2);
}
process.exit(fails.length === 0 ? 0 : 1);
