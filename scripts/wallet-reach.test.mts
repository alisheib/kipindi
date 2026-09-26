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
 * ── AMENDED 2026-09-26 BY ALI'S RULING R1 (landing v3) ───────────────────────
 * The capsule is still the one door and the eye still lives inside it; the door now OPENS THE
 * WALLET (a bottom sheet below 1024, a panel under the chip from 1024) instead of navigating to
 * /wallet: balance, Deposit and Withdraw side by side at the SAME size, Set limits, and the full
 * wallet page. At ZERO balance the capsule gives way to a gold Deposit at every width — the
 * header never prints "TZS 0". A frozen wallet keeps its capsule, and its Wallet offers no money
 * buttons. §1, §4 and §7 pin the amended contract. Authority:
 * `docs/design-system/v4-2026-09-26-landing-ten/INHERIT-MANIFEST.md` R1, L19, L20.
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
/* U5 · the pills stand on a rung declared in the stylesheet, so the stylesheet is read here too. */
const css = readFileSync(join(ROOT, "src/app/globals.css"), "utf8");

const { formatBalancePill, formatTzs, formatTzsCompact, BALANCE_COMPACT_ABOVE } =
  await import("../src/lib/utils.ts");

// ── 1 · ONE CAPSULE: the number and its eye are a single control ─────────────
{
  ok("1: the pill renders a capsule wrapper", /data-testid="wallet-balance-capsule"/.test(pill));
  // ⭐ R1 · the number is a BUTTON that opens the Wallet — announced as opening a dialog, with its state.
  const capsuleOpen = pill.slice(pill.indexOf("wallet-balance-capsule"));
  // ⚠️ Sliced to the chip's own testid, not to the next ">" — the arrow in its onClick is one.
  const chip = capsuleOpen.slice(capsuleOpen.indexOf("<button"), capsuleOpen.indexOf('data-testid="wallet-balance-pill"'));
  ok("1: R1 · the number is a <button> that OPENS the Wallet (not a link that navigates)",
     /<button\b/.test(chip) && /aria-haspopup="dialog"/.test(chip) && /aria-expanded=\{open\}/.test(chip) && /onClick=\{\(\) => setOpen\(true\)\}/.test(chip));
  ok("1: …and the Wallet it opens is mounted by the capsule's own component",
     /<WalletSheet open=\{open\}[^\n]*anchorRef=\{capsuleRef\}/.test(pill) && /ref=\{capsuleRef\}/.test(pill));
  ok("1: the eye lives INSIDE the capsule, not beside it", /<CashEye\b/.test(pill));
  // ⛔ Two <button>s cannot nest either — the capsule holds the chip and the eye as SIBLINGS.
  ok("1: the eye is a SIBLING of the chip button, never nested inside it",
     capsuleOpen.indexOf("</button>") > 0 && capsuleOpen.indexOf("</button>") < capsuleOpen.indexOf("<CashEye"),
     "a control inside a control is invalid HTML");
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
  // ⭐ R1 · with the LIVE balance (SSE), so the bar's zero/funded decision and the figure agree.
  ok("1: the top bar renders the capsule as a single control, fed the LIVE balance",
     /<WalletBalancePill balance=\{liveBalance\} held=\{!!user\.walletHeld\}\s*\/>/.test(bar) &&
     /const liveBalance = useLiveBalance\(user\.balance \?\? 0\)/.test(bar));
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
  ok("4: the Deposit CTA is hidden by a WRAPPER, not by classes on the .btn (funded only — R1)",
     /<span className=\{funded \? "hidden sm:inline-flex" : "inline-flex"\}>\s*<Link/.test(dep));
  ok("4: ⛔ and the hide is NOT on the button itself, where `.btn` would beat it",
     !/className="btn[^"]*\bhidden\b/.test(bar));
  ok("4: the mark carries the brand below xl", /mark-flip-i inline-flex xl:hidden/.test(bar));
  ok("4: …and the full lockup returns at xl", /hidden xl:inline-flex"><FiftyLockup/.test(bar));
  ok("4: ⛔ the brand is never absent — one of the two always renders",
     /inline-flex xl:hidden/.test(bar) && /hidden xl:inline-flex/.test(bar));

  /**
   * 🔴 E-276 · AND `Sign in` IS NOT ALLOWED TO YIELD, WHICH IS THE OPPOSITE RULE.
   * The Deposit CTA above may yield below `sm` — a signed-in player reaches the wallet three
   * other ways. `Sign in` may not: it is the ONLY route into an existing account from the
   * header, and hiding it leaves a returning player looking at a screen whose single account
   * control creates a SECOND account.
   *
   * Ali, from his own phone: *"when I'm a player on phone not signed in there is only a Sign
   * up button."* Measured signed-out on production at 320/360/390/414 — `a[href="/auth/login"]`
   * rendered at **width 0** at every one.
   *
   * ⚠️ The yield had been justified as "the two pills do not fit at 360", and this file's own
   * §4 comment recorded that the `hidden` had never actually applied — so the pair had been
   * rendering at 360 all along without overflowing. The premise was false when it was written;
   * re-measured 2026-09-05, `pastRight` is 0 at 360/390/414, and 0 at 320 once `.kp-auth-cta`
   * tightens the pair below `sm`.
   */
  const authAt = bar.indexOf('href={"/auth/login" as never}');
  const auth = bar.slice(Math.max(0, authAt - 300), authAt + 300);
  ok("4: 🔴 `Sign in` is NOT wrapped in a width hide — it is the only way back into an account",
     authAt > 0 && !/<span className="hidden sm:inline-flex">\s*<Link\s+href=\{"\/auth\/login"/.test(auth));
  ok("4: …and both account actions carry `.kp-auth-cta`, which is what makes 320 fit",
     (bar.match(/btn-pill kp-auth-cta/g) ?? []).length === 2,
     `${(bar.match(/kp-auth-cta/g) ?? []).length} occurrence(s)`);

  /* U5 · THE PAIR SITS ON THE sm RUNG BELOW 640, AND IT MUST BE THE TOKEN, NOT THE NUMBER.
     40 is also --tap-min, so a literal 40px here would read as correct while silently
     un-coupling the pill from the control ladder — the next ladder decision would move .btn-sm
     and leave these two behind. This asserts the phone block declares the RUNG. */
  const phoneBlock = css.slice(css.indexOf("@media (max-width: 639.98px)", css.indexOf(".kp-auth-cta") - 2000), css.indexOf(".kp-auth-cta") + 400);
  ok("4: the auth pills take the sm rung below 640 — the token, never the number",
     /\.kp-auth-cta\s*\{[^}]*height:\s*var\(--h-control-sm\)/.test(css),
     phoneBlock.slice(-160));
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

// ── 7 · R1 · THE WALLET — what the door opens (landing v3, 2026-09-26) ─────
{
  const sheet = decomment(readFileSync(join(ROOT, "src/components/layout/wallet-sheet.tsx"), "utf8"));
  ok("7: a bottom sheet below 1024 and a panel under the chip from 1024",
     /<Modal\b[^>]*\bsheet\b[^>]*sheetUntil="lg"[^>]*anchorRef=\{anchorRef\}/.test(sheet));
  // ⭐ V19 · MONEY PARITY. Withdraw is as easy to find as Deposit: the same rung, the same box,
  // side by side. Only the skin differs (struck gold for money in, ghost for money out).
  const link = (href: string) => {
    const at = sheet.indexOf(`href="${href}"`);
    return at < 0 ? "" : sheet.slice(sheet.lastIndexOf("<Link", at), sheet.indexOf("</Link>", at));
  };
  const dep = link("/wallet/deposit"), wd = link("/wallet/withdraw");
  const geom = (s: string) => (s.match(/className="btn (?:gilt-metal|btn-ghost) ([^"]+)"/) ?? [])[1] ?? null;
  ok("7: ⭐ Deposit and Withdraw are BOTH in the Wallet", !!dep && !!wd);
  ok("7: ⭐ …at the SAME size — one rung and one box, only the skin differs",
     geom(dep) !== null && geom(dep) === geom(wd), `${geom(dep)} vs ${geom(wd)}`);
  ok("7: …Deposit is struck gold (money), Withdraw is not a lesser control hidden in a menu",
     /btn gilt-metal/.test(dep) && /btn btn-ghost/.test(wd));
  const pairAt = sheet.indexOf("kp-wsheet__pair");
  ok("7: …side by side, in one two-column pair", pairAt > 0 && pairAt < sheet.indexOf('href="/wallet/deposit"') && pairAt < sheet.indexOf('href="/wallet/withdraw"') &&
     /\.kp-wsheet__pair\s*\{[^}]*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/.test(css));
  ok("7: Set limits and the full wallet page are in the Wallet",
     /href="\/profile\/responsible-gambling"/.test(sheet) && /href="\/wallet"/.test(sheet));
  // ⛔ A frozen wallet is offered nothing its pages refuse.
  const heldAt = sheet.indexOf("{held ? (");
  ok("7: ⛔ a FROZEN wallet gets no money buttons — the pair lives in the not-held branch",
     heldAt > 0 && heldAt < sheet.indexOf('href="/wallet/deposit"') && /t\.kycGate\.frozenTitle/.test(sheet));
  ok("7: the balance obeys the eye — the Wallet masks through <Cash>, with its own eye",
     /<Cash>\{formatTzs\(balance\)\}<\/Cash>/.test(sheet) && /<CashEye\b/.test(sheet));
  // ⭐ ZERO: never "TZS 0" in the header — the capsule yields to a gold Deposit at every width.
  ok("7: ⭐ at zero the capsule is not rendered (unless the wallet is frozen)",
     /\(funded \|\| user\.walletHeld\) && \(\s*<WalletBalancePill/.test(bar) && /const funded = liveBalance > 0/.test(bar));
  ok("7: ⭐ …and Deposit shows at EVERY width, labelled, when there is no balance",
     /funded \? "hidden sm:inline-flex" : "inline-flex"/.test(bar) && /funded \? "hidden sm:inline lg:hidden xl:inline" : "inline"/.test(bar));
}

console.log(`\nwallet-reach: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
