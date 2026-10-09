/**
 * ONE PAGE, ONE NAME — THE TWO MONEY PAGES (round 5 of the Vodacom visual pass, R5-G, 2026-10-09, G-1; the R4-H rule of
 * edges E4 / E33 that R5-A carried to the hub, the avatar menu and the footer: a door names its page as the page names
 * itself).
 *
 * A journey reader opens the deposit and withdraw screens through doors that say "Weka pesa" / "Toa pesa" — the header's
 * pill, the Wallet sheet, /wallet's buttons and empty states, the hub's Toa pesa row, the deposit's break notice: R5-B's
 * one pair, `journey.depositAction` / `journey.withdrawAction`. The screens named themselves otherwise: "Amana" under a
 * "WEKA PESA" eyebrow with "Amana" in the browser's tab, and "Toa fedha" under "TOA" with "Toa" in the tab — one action,
 * three names. For a journey reader each screen now takes its doors' word for its <title> and its h1, and the deposit's
 * commit (the confirm dialog's button that sends the money) says it too; the eyebrow names the section the screen belongs
 * to, the Wallet ("POCHI" / "WALLET" / "钱包"), as /wallet/receipts' eyebrow does — the product's sub-page convention
 * (Nafasi over Utendaji, Juu na Chini over its history, the agent programme over its pages). In en and zh the door's word
 * was already the deposit's h1; there the eyebrow is what changes ("ADD FUNDS" → "WALLET", 向钱包充值 → 钱包), and the
 * withdraw screen's eyebrow could not stay: it said the door's own word ("WITHDRAW" over "Withdraw", 提现 over 提现).
 * Composition only — every word is a key the dictionary already holds.
 * ⛔ CLASSIC READERS KEEP EVERY WORD THEY HAD: the classic arm below is today's keys, unchanged.
 * ⭐ ONE HOME, SO THE NAMES CANNOT DRIFT APART: the deposit page and its metadata, its loading drawing (`deposit-ghost.tsx`,
 * which the journey's root loading state also draws in the browser), its confirm dialog and the provider's return; the
 * withdraw page, its metadata and its loading file — all read these two functions, so the h1 a ghost draws is the h1 the
 * page lands with (R4-J / R5-D: the ghost's words land where the page's do) and the tab says the same.
 * ⛔ PURE — an erased type import only, no directive: `route-ghost.tsx` (a client module) reaches it through the deposit
 * drawing, and the confirm dialog is client code. `test:visual-pass-r5g` §1 holds every reader to it.
 */
import type { Dict } from "@/lib/i18n-dict";

/** What a money page is called: its tab title, the line over its heading, and its heading. */
export type MoneyPageNames = { title: string; eyebrow: string; heading: string };

/**
 * The deposit screen's names, and its commit's — the confirm dialog's button that sends the money. The provider's return
 * (`deposit/return/page.tsx`) is the same action's last page: its eyebrow and its tab carry `title`, the deposit's name.
 */
export function depositNames(t: Dict, journey: boolean): MoneyPageNames & { commit: string } {
  return journey
    ? { title: t.journey.depositAction, eyebrow: t.wallet.title, heading: t.journey.depositAction, commit: t.journey.depositAction }
    : { title: t.common.deposit, eyebrow: t.common.addFunds, heading: t.common.deposit, commit: t.common.deposit };
}

/** The withdraw screen's names. Its commit keeps "Send funds" (`common.sendFunds`) in both shells: an act, not a name. */
export function withdrawNames(t: Dict, journey: boolean): MoneyPageNames {
  return journey
    ? { title: t.journey.withdrawAction, eyebrow: t.wallet.title, heading: t.journey.withdrawAction }
    : { title: t.wallet.withdrawTitle, eyebrow: t.wallet.withdrawTitle, heading: t.wallet.moveFundsOut };
}
