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
 *  3. THE CONTROLS — five, each injecting a synthetic violation into the SOURCE STRING the
 *     section reads, so a section cannot pass by reading nothing:
 *        npm run red:social-panel   (runs all five in one pass and expects exactly 5 failures)
 *     ⚠️ It exits 2, not 1, if it sees FEWER than five — a control that stops firing is a
 *     section that stopped checking, and that must not look like a pass or like a normal red.
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

// The five controls mutate what the sections READ, so nothing can pass vacuously.
if (PROVE_RED) {
  panel = panel.replace("const MIN_DWELL_MS = 45_000;", "const MIN_DWELL_MS = 1_000;");
  panel = panel.replace("^\\/(legal|profile)\\/responsible-gambling(\\/|$)", "^\\/nowhere");
  panel = panel.replace('useInvitationSlot("channels", 2, eligible)', "false");
  install = install.replace('data-invitation="install"', "");
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
  ok("2.1 the money-commit gate is applied", /isCommitSurface/.test(c));
  ok("2.2 auth and admin are suppressed", /\^\\\/\(auth\|admin\)/.test(c));
  ok("2.3 ⛔ BOTH responsible-gambling routes are suppressed",
     /\(legal\|profile\)\\\/responsible-gambling/.test(c),
     "a follow prompt on the page where someone is setting a limit is the worst of it");
  ok("2.4 ⭐ suppression is tested in the EFFECT *and* in the RENDER",
     (c.match(/suppressedRoute\(pathname\)/g) ?? []).length >= 2,
     "first-visit-primer shipped this exact bug: the effect returned early on the new path, `open` stayed true, and the card sat over the bet widget");
  ok("2.5 it never covers a real dialog",
     /\[role="dialog"\]\[aria-modal="true"\]/.test(c));
  ok("2.6 the RG gate is honoured", /promoSuppressed/.test(c));
}

// ───────────────────────────────────────────── §3 THE RG GATE IS REAL
section("§3 · the responsible-gambling gate actually exists");
{
  const s = code(shell);
  ok("3.1 the shell derives promoSuppressed", /promoSuppressed\s*=/.test(s));
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
  ok("4.1 the panel claims the slot at priority 2", /useInvitationSlot\("channels", 2, eligible\)/.test(code(panel)));
  ok("4.2 the install card claims it at priority 1 and therefore wins",
     /useInvitationSlot\("install", 1, eligible\)/.test(code(install)));
  ok("4.3 both are labelled for measurement", /data-invitation="channels"/.test(panel) && /data-invitation="install"/.test(install));
  ok("4.4 lower priority wins, and the holder is a stable value",
     /c\.priority < best\.priority/.test(slot) && /return best \? best\.id : null;/.test(slot));
  ok("4.5 nothing holds the slot during SSR", /function serverHolder/.test(slot));
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
  ok("5.5 ⛔ no negative margins — that is how a control leaves its box", !/className="[^"]*\s-m[trblxy]?-/.test(panel));
  ok("5.6 ⛔ no truncate or line clamp — the box grows, the words stay whole",
     !/\btruncate\b|line-clamp|whitespace-nowrap/.test(code(panel)));
  ok("5.7 every localStorage touch is wrapped and fails closed",
     (code(panel).match(/try \{/g) ?? []).length >= 2 && /catch \{/.test(code(panel)));
  ok("5.8 the offset is a class, not an inline style — an inline `bottom` cannot be responsive",
     !/style=\{\{[^}]*\bbottom:/.test(panel) && /lg:bottom-6/.test(panel));
  ok("5.9 it takes a kit rung rather than composing a shadow",
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
  ok("7.9 ⛔ the only claim made is the one the channel delivers",
     /title: "Daily updates and polls"/.test(dict)
     && !/channels:[\s\S]{0,400}(results|bonus|offers|news)/i.test(dict));
}

console.log(`\n${fails.length === 0 ? "ALL PASS" : `${fails.length} FAILED`} — ${pass} passed, ${fails.length} failed\n`);
if (PROVE_RED) {
  const expected = 5;
  console.log(`--prove-red: expected ${expected} failure(s), saw ${fails.length}\n`);
  process.exit(fails.length >= expected ? 1 : 2);
}
process.exit(fails.length === 0 ? 0 : 1);
