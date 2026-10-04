"use client";

/**
 * ⭐ THE SHELL'S HOST FOR THE RESULT OF A SALE (the Vodacom plan S6, A8h, for every player, both looks; VODACOM-PLAN §0i
 * A8h). AppShell mounts it for a signed-in visitor through the shell's lazy module (`shell-lazy.tsx`), so its code is no
 * part of any page's first download and it outlives every row a page draws. A Sell button hands it the result of a sale
 * (`handSellResult`, `sell-result.tsx`): a sale that went through, or a refused sale the player cannot clear (the
 * registry's error, or a fault; every other refusal is told by its toast alone, DESIGN_AUTHORITY §F2). It takes the
 * result, answers the hand-off on its ack object, and draws `SellResultModal` until the player closes it, or, for a sale
 * that went through, until the result's own countdown ends (§F2's shared 5 s, held while it is read). A second result
 * replaces the first (§F6: one dialog, the latest). A move to another page closes it, as leaving the page closed it
 * before the host existed, a phone's own Back among them. It renders nothing until a result arrives.
 *
 * ⭐ FOCUS GOES BACK TO SOMETHING THAT IS STILL THERE. When a sale's confirm closes, its Sell button is disabled (the sale
 * is in flight), so the confirm cannot hand focus back to it, and the result could only hand it back to the confirm's
 * own button, gone by the time the result closes: before A8h focus fell to the start of the page after every result.
 * Now, once the result has closed, if focus is nowhere or still in the closing dialog (never when it is inside another
 * open dialog, such as a win seal opened over the result), the host puts it on the Sell button that opened the sale
 * when that is still on the page and can take it; else on the first control after where it stood, read in the page's
 * main region while the ticket was still there (the next ticket, the list's pager); else on the nearest one before it
 * (the list's own filters). A field is never chosen (on a phone it would raise the keyboard), nothing scrolls, and
 * when none of them can take focus it stays where it is.
 */
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { SELL_RESULT_EVENT, SellResultModal, type SellResultHandOff } from "./sell-result";

/** What can take focus, fields left out (`FIELD`). */
const FOCUSABLE = "a[href], button, summary, [tabindex]:not([tabindex='-1'])";
/** A field: never given focus back here, since on a phone it would raise the keyboard. */
const FIELD = "input, select, textarea, [contenteditable]";
/** Inside a dialog, or withheld from assistive technology: never a place to give focus back to. */
const NOT_THE_PAGE = "[role='dialog'], [role='alertdialog'], [aria-hidden='true'], [inert]";
/**
 * Where focus is "nowhere": inside the closing result (its dialog is aria-hidden from the commit that closes it, through
 * its exit) or in content withheld from assistive technology. Focus inside ANOTHER open dialog is somewhere: a win seal
 * opened over the result keeps it (the review of 2026-10-04: taken from the seal, focus landed behind its scrim, where
 * the next Enter could open another ticket's sale unseen). The Sell button's own way back reads the same test.
 */
const NOWHERE = "[aria-hidden='true'], [inert]";
/** How many controls on each side of the one that opened the sale are remembered. */
const NEAR = 24;

/** Where focus may go when the result closes: the control that opened the sale, then the controls after and before it. */
type WayBack = { from: HTMLElement | null; after: HTMLElement[]; before: HTMLElement[] };

/** The controls around the one that opened the sale, in the page's main region (AppShell's landmark), nearest first, read while its ticket is there. */
function wayBackFrom(from: HTMLElement | null): WayBack {
  const region = document.getElementById("main-content");
  if (!from || !region || !region.contains(from)) return { from, after: [], before: [] };
  const all = Array.from(region.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => !el.closest(NOT_THE_PAGE) && !el.matches(FIELD));
  const at = all.indexOf(from);
  if (at < 0) return { from, after: [], before: [] };
  return { from, after: all.slice(at + 1, at + 1 + NEAR), before: all.slice(Math.max(0, at - NEAR), at).reverse() };
}

/** Still on the page, drawn, enabled, not a field, and not inside a dialog. */
function canTakeFocus(el: HTMLElement | null): el is HTMLElement {
  if (!el || !el.isConnected || el.closest(NOT_THE_PAGE) || el.matches(FIELD)) return false;
  if (el.matches(":disabled")) return false;
  return el.getClientRects().length > 0;
}

/** Once the result has closed, if focus is nowhere: to the first place on the way back that can take it; when none can, it stays where it is. */
function giveFocusBack(way: WayBack) {
  const now = document.activeElement;
  if (now && now !== document.body && !now.closest(NOWHERE)) return;
  const next = [way.from, ...way.after, ...way.before].find(canTakeFocus);
  if (next) next.focus({ preventScroll: true });
}

export function SellResultHost() {
  const [shown, setShown] = useState<SellResultHandOff | null>(null);
  const [open, setOpen] = useState(false);
  const way = useRef<WayBack | null>(null);
  const pathname = usePathname();
  const page = useRef(pathname);

  // The hand-off: take the result, answer it (the button then draws none of its own), and read the way back while the
  // sold ticket is still on the page: the button hands the result over before it asks the page to refresh.
  useEffect(() => {
    const onResult = (e: Event) => {
      const handOff = (e as CustomEvent<SellResultHandOff>).detail;
      if (!handOff) return;
      setShown(handOff);
      setOpen(true);
      if (handOff.ack) handOff.ack.accepted = true;
      way.current = wayBackFrom(handOff.from);
    };
    window.addEventListener(SELL_RESULT_EVENT, onResult);
    return () => window.removeEventListener(SELL_RESULT_EVENT, onResult);
  }, []);

  // Closed: the dialog has already tried its own way back (its cleanup ran first in this commit); finish it, once.
  useEffect(() => {
    if (open || !way.current) return;
    const back = way.current;
    way.current = null;
    giveFocusBack(back);
  }, [open]);

  // Another page: the result closes, as leaving the page closed it before A8h (a phone's own Back among them), and the
  // way back read on the page left behind is dropped, so the new page keeps the focus it was given.
  useEffect(() => {
    if (page.current === pathname) return;
    page.current = pathname;
    way.current = null;
    setOpen(false);
  }, [pathname]);

  if (!shown) return null;
  return (
    <SellResultModal
      open={open}
      resultData={shown.resultData}
      positionId={shown.positionId}
      journey={shown.journey}
      onClose={() => setOpen(false)}
    />
  );
}
