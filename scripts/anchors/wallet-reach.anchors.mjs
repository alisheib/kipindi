/**
 * THE ANCHORS `red:wallet-reach` MUTATES — declared, as DATA, importable without running.
 *
 * ⛔ A SIDECAR, for the reason every anchors file here gives: `test:red-anchors` must answer
 * *"does every anchor still resolve, exactly once?"* WITHOUT executing a harness that rewrites
 * real source. One definition, imported by both.
 *
 * ⚠️ NO SIDE EFFECTS. Data only, repo-relative POSIX paths.
 *
 * ── WHAT THESE MUTATIONS ARE ─────────────────────────────────────────────────
 * The top bar gained a phone-only wallet door on 2026-08-25 (Ali's ruling: an icon button
 * next to Deposit, ⛔ not a balance readout, ⛔ not a bottom-nav change).
 *
 * ⭐ THE FIRST IS THE ONE THIS UNIT EXISTS FOR, and it is the mutation a presence check
 * cannot catch. `reaches-the-e190-band` DELETES `sm:hidden`, so the control now renders at
 * EVERY width — including 1024, the band where `E-190` sent the account menu off-screen in
 * Swahili with three instruments green over it. The wallet is *more* reachable afterwards.
 * Every "is there a wallet button" assertion passes harder. Only a rule stated as
 * *"exactly one door per width, never two"* can see it.
 *
 * ⭐ AND THE FIFTH IS THE POSITIVE CONTROL. §3 pins the icon and the pill AGAINST EACH
 * OTHER, which is only meaningful while the pill is still a link at all; if the pill stopped
 * being a wallet door the complement rule would pass while a whole band lost its door.
 *
 * ⚠️ SINGLE-LINE ANCHORS. This tree is CRLF and these declarations are LF, so a multi-line
 * anchor cannot match and the replace becomes a silent no-op — which reads as "the guard
 * failed to catch the defect" rather than "the harness never ran".
 * ⚠️ And no replacement may CONTAIN its own anchor, or the did-it-reach-disk check refuses a
 * mutation that applied correctly.
 */

/** @typedef {{ name: string, file: string, suite: string, from: string, to: string, why: string, expect: string }} RedMutation */

const BAR = "src/components/layout/top-app-bar.tsx";
const PILL = "src/components/layout/wallet-balance-pill.tsx";
const RAIL = "src/components/layout/bottom-nav.tsx";

const LINK_CLASS = `              className="sm:hidden inline-flex min-h-[44px] shrink-0 items-center justify-center rounded-md border border-border-control px-2 text-text-muted transition-colors hover:text-text"`;

/** @type {RedMutation[]} */
export const MUTATIONS = [
  {
    name: "reaches-the-e190-band",
    why: "⭐ THE ONE A PRESENCE CHECK CANNOT SEE: `sm:hidden` is dropped, so the wallet icon renders at EVERY width — including 1024, where E-190 pushed the account menu off-screen in Swahili. The wallet becomes MORE reachable and every presence assertion passes harder; the defect is the redundant 44px in a cluster that has no slack",
    file: BAR,
    suite: "wallet-reach",
    from: LINK_CLASS,
    to: `              className="inline-flex min-h-[44px] shrink-0 items-center justify-center rounded-md border border-border-control px-2 text-text-muted transition-colors hover:text-text"`,
    expect: "1: it is phone-only",
  },
  {
    name: "icon-unnamed",
    why: "the icon loses its aria-label, so a screen reader announces an unnamed link. A wallet glyph is not self-describing, and this is the control a player reaches for to check their money",
    file: BAR,
    suite: "wallet-reach",
    from: `              aria-label={t.nav.wallet}`,
    to: `              data-label="wallet"`,
    expect: "1: it is named from the dict, not a hardcoded string",
  },
  {
    name: "tap-floor-lost",
    why: "the 44px floor becomes Tailwind's `h-11`, which under this project's OVERRIDDEN spacing scale is 96px, not 44 — the exact trap that shipped a 40×80 portrait pill to 25 paginated screens (finding G-2). The class list reads correct to anyone who knows Tailwind and not this config",
    file: BAR,
    suite: "wallet-reach",
    from: LINK_CLASS,
    to: `              className="sm:hidden inline-flex h-11 shrink-0 items-center justify-center rounded-md border border-border-control px-2 text-text-muted transition-colors hover:text-text"`,
    expect: "1: it meets the 44px tap floor as a literal, not a scale token",
  },
  {
    name: "hidden-across-the-whole-section",
    why: "`!==` becomes `startsWith`, so the control also vanishes on /wallet/deposit and /wallet/withdraw — the two pages where Deposit has already yielded its own slot and this is the only way back up to the overview",
    file: BAR,
    suite: "wallet-reach",
    from: `          {user.isAuthed && pathname !== "/wallet" && (`,
    to: `          {user.isAuthed && !pathname.startsWith("/wallet") && (`,
    expect: "2: it hides on /wallet itself and NOWHERE else",
  },
  {
    name: "control-pill-stops-being-a-door",
    why: "⭐ POSITIVE CONTROL — the balance pill stops linking anywhere. The icon is still phone-only and still correct, so §1 passes entirely; but 640–1023 now has NO wallet door at all, and the complement rule §3 pins is only meaningful while the pill is still one",
    file: PILL,
    suite: "wallet-reach",
    from: `      href="/wallet"`,
    to: `      data-href="/wallet"`,
    expect: "3: the balance pill is itself a link to /wallet",
  },
  {
    name: "wallet-dropped-from-more",
    why: "Wallet is removed from the bottom rail's More menu on the theory that the new icon replaces it. It does not: the icon is a GLYPH and More is the named TEXT entry, so this trades the reader who navigates by words for the one who navigates by pictures — and Ali ruled the rail must not change",
    file: RAIL,
    suite: "wallet-reach",
    from: `        { href: "/wallet",         label: t.nav.wallet },`,
    to: `        { href: "/positions?tab=wallet", label: t.nav.wallet },`,
    expect: "4: Wallet is STILL the named text entry under More",
  },
];
