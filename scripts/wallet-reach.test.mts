/**
 * THE BALANCE IS VISIBLE AT EVERY WIDTH, AND IT IS THE WALLET DOOR.
 *
 * Ali, 2026-08-25: *"find a way to always show balance on all types of screens, for mobile
 * and widescreens, and the eye"* — and, separately, *"remove the wallet from the top navbar,
 * it got rejected by votes of players."*
 *
 * ⛔ THIS FILE REPLACED ITS OWN EARLIER RULE, IT DID NOT LOSE IT. The first version pinned a
 * phone-only wallet ICON and asserted the balance pill was ABSENT below `sm`. Both were
 * correct for the ruling of that morning and both are wrong now. The history is kept in §3
 * as anti-regressions, because the shape that was removed is the shape most likely to come
 * back by accident.
 *
 * ── WHAT WAS ACTUALLY WRONG, AND IT WAS NOT "THE PILL WAS HIDDEN" ────────────
 * The old ladder read `hidden sm:flex lg:hidden xl:flex 2xl:hidden` — shown, hidden, shown,
 * hidden as the window WIDENS. Every branch had a reason and the SEQUENCE had none, so the
 * same account on the same build showed a balance on a 1440 laptop and none on a 1920
 * monitor. ⭐ **A responsive rule a player experiences as randomness is a defect even when
 * every branch is deliberate**, and §2 is written so that shape cannot return.
 *
 * ── THE RULE, IN ONE LINE ────────────────────────────────────────────────────
 * **Exactly one wallet door at every width, it is the balance capsule, and the eye is inside
 * it.** Stating it that way is what lets the guard fail in BOTH directions — a missing
 * balance, and a second door beside it.
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

const { formatBalancePill, formatTzs, formatTzsCompact, BALANCE_COMPACT_ABOVE } =
  await import("../src/lib/utils.ts");

// ── 1 · ONE CAPSULE: the number and its eye are a single control ─────────────
{
  ok("1: the pill renders a capsule wrapper", /data-testid="wallet-balance-capsule"/.test(pill));
  ok("1: the number inside it links to /wallet", /href="\/wallet"/.test(pill));
  ok("1: the eye lives INSIDE the capsule, not beside it", /<CashEye\b/.test(pill));
  // ⛔ A <button> nested inside an <a> is invalid HTML and neither control is reliably
  // operable. The capsule must hold the two as SIBLINGS.
  const capsuleOpen = pill.slice(pill.indexOf("wallet-balance-capsule"));
  ok("1: the eye is a SIBLING of the link, never nested inside it",
     capsuleOpen.indexOf("</Link>") < capsuleOpen.indexOf("<CashEye"),
     "a <button> inside an <a> is invalid HTML");
  // ⚠️ The testid is the LAST attribute on the capsule, so the border sits BEFORE it —
  // a forward-only window found nothing and failed on correct code. Read the whole
  // element, not the text after its name.
  const capsuleEl = pill.slice(pill.lastIndexOf("<div", pill.indexOf("wallet-balance-capsule")),
                               pill.indexOf("wallet-balance-capsule"));
  /**
   * ⚠️ CORRECTED 2026-09-03 (PV-13a). Both assertions pinned the OLD literal rather than the
   * rule: `border: flashing` and `height: 44`. PV-13a moved the border to an `inset`
   * box-shadow — a real `border` sits INSIDE the border-box (Tailwind's preflight), so it was
   * eating 2px off this element's CONTENT height, which is exactly why the eye's `h-full`
   * first resolved to 42px instead of 44 when this capsule still said `height: 44` — and moved
   * the bare `44` to `var(--h-control-md)` so the capsule and the rung it names cannot drift
   * apart (§0a). Neither change removes the thing the check cares about: the capsule still
   * visually reads as ONE bordered shape (now via `boxShadow: … flashing …`), and it still
   * holds the 44px rung (now BY NAME, not by a literal nobody can trace to the ruling that set
   * it) — so the assertion is rewritten to the rule, not deleted for the convenience of the fix.
   */
  ok("1: the capsule owns the border, so the pair is not two chips",
     /boxShadow: flashing/.test(capsuleEl) && /rounded-pill/.test(capsuleEl));
  ok("1: it holds the 44px tap height, BY NAME — a --h-control-* rung, not a bare literal",
     /height: "var\(--h-control-md\)"/.test(pill));
  // ⛔ The top bar consumes ONE component — no wrapper div, no second CashEye out there.
  ok("1: the top bar renders the capsule as a single control",
     /<WalletBalancePill balance=\{user\.balance\}\s*\/>/.test(bar));
  ok("1: …and no longer mounts its own CashEye beside it", !/<CashEye\b/.test(bar));
}

// ── 2 · ⭐ VISIBLE AT EVERY WIDTH — the assertion with teeth ─────────────────
{
  const i = bar.indexOf("<WalletBalancePill");
  const guardBlock = bar.slice(Math.max(0, i - 500), i);
  // ⛔ DISPLAY classes only. A first draft matched every `sm:`-prefixed utility and failed
  // on the cluster's own `sm:gap-2` — a GAP does not gate visibility, and a rule that
  // cannot tell spacing from display would block any future spacing tweak while missing
  // `sm:block`. Ask for what actually hides a thing.
  const responsive = guardBlock.match(/\b(?:hidden|(?:sm|md|lg|xl|2xl):(?:hidden|flex|block|inline|inline-flex|grid))\b/g) ?? [];
  ok("2: ⭐ nothing responsive gates the balance — it renders at EVERY width",
     responsive.length === 0, responsive.join(" "));
  ok("2: it is still signed-in only — a guest has no wallet",
     /user\.isAuthed && user\.balance !== null/.test(bar));
}

// ── 3 · ANTI-REGRESSIONS: the shapes that were removed ──────────────────────
{
  ok("3: ⛔ the old non-monotonic ladder has not come back",
     !/hidden sm:flex lg:hidden xl:flex 2xl:hidden/.test(bar));
  ok("3: ⛔ the rejected phone-only wallet icon is gone", !/wallet-door/.test(bar));
  ok("3: …and nothing renders I.wallet in the bar", !/I\.wallet\b/.test(bar));
  // ⛔ ONE DOOR PER WIDTH. The capsule is a /wallet link at every width, so an inline nav
  // item pointing at the same room is a SECOND door from `lg` up — and it was the wider of
  // the two, which is what pushed the row 77px past 1024 in Swahili.
  const core = bar.slice(bar.indexOf("const CORE_ITEMS"), bar.indexOf("const MORE_ITEMS"));
  ok("3: ⭐ /wallet is NOT an inline nav link — the capsule is the door",
     !/href: "\/wallet"/.test(core), "two doors to one room");
  const more = bar.slice(bar.indexOf("const MORE_ITEMS"), bar.indexOf("return ("));
  ok("3: …but it keeps a NAMED text entry in More, for readers not scanners",
     /href: "\/wallet"/.test(more));
  ok("3: the overflow links no longer promote inline at 2xl",
     !/hidden 2xl:inline-flex/.test(bar) && /<NavMore items=\{MORE_ITEMS\}/.test(bar));
}

// ── 4 · WHAT YIELDS INSTEAD, and the trap that made one of them not work ─────
{
  // 🔴 `hidden sm:inline-flex` ON a `.btn` DOES NOTHING. `.btn { display: inline-flex }`
  // sits at globals.css:911, AFTER `@tailwind utilities` (line 19), so at equal specificity
  // the component class wins. The first attempt put the classes on the <Link> and the CTA
  // still rendered at 360, 33px past the edge. The hide must be on a WRAPPER.
  const at = bar.indexOf('href="/wallet/deposit"');
  const dep = bar.slice(Math.max(0, at - 400), at + 400);
  ok("4: the Deposit CTA is hidden by a WRAPPER, not by classes on the .btn",
     /<span className="hidden sm:inline-flex">\s*<Link/.test(dep));
  ok("4: ⛔ and the hide is NOT on the button itself, where `.btn` would beat it",
     !/className="btn[^"]*\bhidden\b/.test(bar));
  ok("4: the mark carries the brand below xl", /mark-flip-i inline-flex xl:hidden/.test(bar));
  ok("4: …and the full lockup returns at xl", /hidden xl:inline-flex"><FiftyLockup/.test(bar));
  ok("4: ⛔ the brand is never absent — one of the two always renders",
     /inline-flex xl:hidden/.test(bar) && /hidden xl:inline-flex/.test(bar));
}

// ── 5 · THE THRESHOLD RULE — pure, exported, and driven ─────────────────────
{
  ok("5: the threshold is exported, not buried in a render", typeof formatBalancePill === "function");
  ok("5: it is 1,000,000, the measured production maximum", BALANCE_COMPACT_ABOVE === 1_000_000);

  // ⭐ BELOW the threshold the figure is EXACT, because the pill's whole purpose is to roll
  // the digits so a player sees their money move. Compact would round a 500 TZS bet away.
  ok("5: a normal balance is exact, so the rolling counter still reads",
     formatBalancePill(194_740) === formatTzs(194_740), formatBalancePill(194_740));
  ok("5: …and a 500 TZS move CHANGES the rendered string",
     formatBalancePill(194_740) !== formatBalancePill(194_240),
     `${formatBalancePill(194_740)} vs ${formatBalancePill(194_240)}`);

  // ⭐ AT and ABOVE it, letters — which is what BOUNDS the width.
  ok("5: a huge balance compacts to letters",
     formatBalancePill(12_345_678) === formatTzsCompact(12_345_678), formatBalancePill(12_345_678));
  ok("5: the boundary itself compacts", /[KMB]/.test(formatBalancePill(BALANCE_COMPACT_ABOVE)));
  ok("5: one shilling below it does not", !/[KMB]/.test(formatBalancePill(BALANCE_COMPACT_ABOVE - 1)));

  // ⛔ NO THIRD FORMAT — both branches must BE formatters that already existed.
  ok("5: both branches are existing formatters, so no new spelling was invented",
     formatBalancePill(1_000) === formatTzs(1_000) && formatBalancePill(5_000_000) === formatTzsCompact(5_000_000));

  // ⭐ THE WIDTH IS BOUNDED, WHICH IS THE POINT. `formatTzs` grows with the balance, so a
  // bar that fits a small one can break for a big one — and it breaks for exactly the
  // players who look at it most. Sweep the magnitudes and pin the longest possible string.
  let longest = "";
  for (let v = 0; v <= 5_000_000_000; v = v < 1000 ? v + 137 : Math.round(v * 1.37)) {
    const s = formatBalancePill(v);
    if (s.length > longest.length) longest = s;
  }
  ok("5: ⭐ the widest string this pill can EVER render is bounded",
     longest.length <= 11, `longest = "${longest}" (${longest.length} chars)`);
  ok("5: …and a negative cannot smuggle in extra characters",
     formatBalancePill(-999_999).length <= 12, formatBalancePill(-999_999));
}

// ── 6 · The bottom rail is untouched — Ali ruled it out of scope ─────────────
{
  const items = rail.slice(rail.indexOf("const items = ["), rail.indexOf("];", rail.indexOf("const items = [")));
  const hrefs = [...items.matchAll(/href: "([^"]+)"/g)].map((m) => m[1]);
  ok("6: the bottom rail still has exactly four primary slots", hrefs.length === 4, hrefs.join(", "));
  ok("6: …and Live still holds one of them", hrefs.includes("/live"), hrefs.join(", "));
  const more = rail.slice(rail.indexOf("moreItems"), rail.indexOf("moreActive"));
  ok("6: Wallet is STILL the named text entry under More on phones", /href: "\/wallet"/.test(more));
}

console.log(`\nwallet-reach: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
