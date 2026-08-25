/**
 * THE WALLET IS REACHABLE AT EVERY WIDTH — Ali, 2026-08-25:
 * *"a player should reach their wallet easily, not buried in the kebab."*
 * Ruled: a WALLET ICON BUTTON next to Deposit. ⛔ Not a balance readout, ⛔ not a
 * bottom-nav change.
 *
 * ⭐ THE RULE IS NOT "THERE IS A WALLET BUTTON". It is **every width has exactly one
 * obvious wallet door, and no width has two**. Stating it that way is what makes the
 * guard able to fail in BOTH directions — a missing door on a phone, and redundant
 * chrome at 1024 where the desktop nav already names Wallet. A presence check could
 * only ever see the first.
 *
 * The doors, measured 2026-08-25:
 *   < 640      the new icon button        (the pill is hidden here: ~109px + the eye
 *                                          cannot coexist with deposit/bell/avatar)
 *   640–1023   WalletBalancePill          (itself a <Link href="/wallet">)
 *   1024–1279  the desktop nav's Wallet   (the E-190 band — the pill yields here)
 *   1280–1535  nav + pill
 *   ≥ 1536     nav                        (8 links go inline; the pill yields again)
 *
 * 🔴 AND THIS IS THE EXACT CLUSTER `E-190` SEVERED. At 1024 in Swahili the account menu
 * ran entirely off-screen and the bell was cut, on every page, with three instruments
 * green over it. This suite pins the SOURCE rule that keeps the new control off that
 * band; `qa:wallet-reach` measures the rendered bar there, because a class name is not
 * a measurement.
 *
 * Run: npm run test:wallet-reach
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { decomment } from "./lib/decomment.mts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
let pass = 0, fail = 0;
const ok = (l: string, c: boolean, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"} ${l}${x ? ` — ${x}` : ""}`); };

const bar = decomment(readFileSync(join(ROOT, "src/components/layout/top-app-bar.tsx"), "utf8"));
const pill = decomment(readFileSync(join(ROOT, "src/components/layout/wallet-balance-pill.tsx"), "utf8"));
const rail = decomment(readFileSync(join(ROOT, "src/components/layout/bottom-nav.tsx"), "utf8"));
const glyphs = decomment(readFileSync(join(ROOT, "src/components/ui/glyphs.tsx"), "utf8"));

/** The wallet link block in the top bar, isolated so a match cannot come from the nav array. */
const control = (() => {
  const i = bar.indexOf('href="/wallet"');
  if (i < 0) return "";
  // From the enclosing `<Link` back-edge to the closing tag.
  const start = bar.lastIndexOf("<Link", i);
  const end = bar.indexOf("</Link>", i);
  return start < 0 || end < 0 ? "" : bar.slice(start, end);
})();

// ── 1 · The control exists, and is the kind of thing that was ruled ──────────
ok("1: the top bar carries a direct wallet link", control.length > 0);
ok("1: it is phone-only — `sm:hidden`", /\bsm:hidden\b/.test(control), control.slice(0, 200));
// ⛔ An icon-only control MUST be named, in all three locales, or it is an unnamed control.
ok("1: it is named from the dict, not a hardcoded string", /aria-label=\{t\.nav\.wallet\}/.test(control));
ok("1: it uses the kit's existing wallet glyph", /I\.wallet\b/.test(control));
// ⛔ A HOOK SO ITS *ABSENCE* IS TESTABLE LIVE. Three elements link to /wallet across the
// width range, so `qa:pager-wallet` cannot tell them apart by href — and the assertion that
// matters at 1024 is that THIS one is not rendered.
ok("1: it carries a testid so a live driver can assert its absence, not just its presence",
   /data-testid="wallet-door"/.test(control));
ok("1: …and the kit defines it", /\bwallet:\s*\(p: GlyphProps\)/.test(glyphs));
// The utility tier: bordered, --r-sm, 44×44 (the header's own three-tier model).
ok("1: it meets the 44px tap floor as a literal, not a scale token",
   /min-h-\[44px\]/.test(control) && /minWidth:\s*44/.test(control), control.slice(0, 400));
ok("1: it takes the UTILITY tier — bordered + rounded-md, like LanguageMenu beside it",
   /border-border-control/.test(control) && /rounded-md/.test(control));

// ── 2 · Signed-in only, and not a door to the room you are standing in ───────
ok("2: guests do not get it — they have no wallet", /user\.isAuthed && pathname !== "\/wallet"/.test(bar));
// ⚠️ `!==`, not startsWith: on /wallet/deposit and /wallet/withdraw this is the way back UP.
ok("2: it hides on /wallet itself and NOWHERE else",
   /pathname !== "\/wallet"/.test(bar) && !/pathname\.startsWith\("\/wallet"\)/.test(bar));

// ── 3 · ⛔ NO WIDTH GETS TWO DOORS — the half a presence check cannot see ────
{
  // The pill is a link in its own right, so it IS a wallet door wherever it renders.
  // ⚠️ THE NEGATIVE LOOKBEHIND IS LOAD-BEARING. `/href="\/wallet"/` also matches
  // `data-href="/wallet"`, so the first draft of this assertion stayed GREEN while
  // `red:wallet-reach` case 5 turned the pill from a link into an inert div. A substring
  // match on an attribute name is not an attribute check.
  ok("3: the balance pill is itself a link to /wallet", /(?<![-\w])href="\/wallet"/.test(pill));
  // Its visibility ladder, read from the bar rather than restated here.
  // ⚠️ `<WalletBalancePill`, WITH the angle bracket. Searching for the bare name finds the
  // IMPORT on line 10 and slices 600 characters of file header, where the visibility ladder
  // obviously is not — which is how the first draft of this assertion failed against
  // correct code. Ask for the JSX, not for the identifier.
  const usage = bar.indexOf("<WalletBalancePill");
  const pillBlock = usage < 0 ? "" : bar.slice(Math.max(0, usage - 600), usage);
  ok("3: the pill starts at `sm` — so the new control must stop there",
     /hidden sm:flex/.test(pillBlock), pillBlock.slice(-120));
  // ⭐ THE ASSERTION WITH TEETH. The icon is `sm:hidden` and the pill is `hidden sm:flex`,
  // so the two are exact complements: below 640 exactly one exists, from 640 exactly one
  // exists. A control that merely "has sm:hidden" could still overlap if the pill's own
  // breakpoint moved, so this pins them AGAINST EACH OTHER.
  ok("3: ⭐ the icon and the pill are complements — never both, never neither",
     /\bsm:hidden\b/.test(control) && /hidden sm:flex/.test(pillBlock));
  // And the desktop nav names Wallet from `lg`, which is why the icon must not reach 1024.
  ok("3: the desktop nav names Wallet outright, so the icon at 1024 would be redundant",
     /\{ href: "\/wallet",\s+label: t\.nav\.wallet \}/.test(bar));
}

// ── 4 · The bottom rail is UNCHANGED, and that is deliberate ─────────────────
{
  // Ali ruled: not a bottom-nav change. Nothing is removed and Live keeps its slot.
  const items = rail.slice(rail.indexOf("const items = ["), rail.indexOf("];", rail.indexOf("const items = [")));
  const hrefs = [...items.matchAll(/href: "([^"]+)"/g)].map((m) => m[1]);
  ok("4: the bottom rail still has exactly four primary slots + More",
     hrefs.length === 4, hrefs.join(", "));
  ok("4: …and Live still holds one of them — nothing was displaced for the wallet",
     hrefs.includes("/live"), hrefs.join(", "));
  // ⛔ Wallet STAYS under More. That is the named TEXT entry for anyone who navigates by
  // reading rather than by icon, and removing it would trade one audience for another.
  const more = rail.slice(rail.indexOf("moreItems"), rail.indexOf("moreActive"));
  ok("4: Wallet is STILL the named text entry under More", /href: "\/wallet"/.test(more));
}

// ── 5 · E-190: the band this control must not touch ──────────────────────────
{
  // The deposit label and the balance pill both yield across 1024–1279 because the cluster
  // has no slack there. A new 44px control that reached that band would re-open E-190.
  ok("5: the deposit label still yields at the lg–xl band", /hidden sm:inline lg:hidden xl:inline/.test(bar));
  ok("5: the balance pill still yields there too", /hidden sm:flex lg:hidden xl:flex 2xl:hidden/.test(bar));
  // ⭐ The rule, stated as a rule: nothing added to the right cluster may be visible at lg
  // without saying why. `sm:hidden` is the strongest possible form of that.
  ok("5: ⭐ the new control cannot exist at 1024 — it stops at 640",
     /\bsm:hidden\b/.test(control) && !/\blg:/.test(control) && !/\bxl:/.test(control), control.slice(0, 300));
}

console.log(`\nwallet-reach: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
