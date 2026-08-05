"use client";

import { useEffect } from "react";

/**
 * ⭐ E-101b · SCROLL TO THE THING THE FRAGMENT NAMES.
 *
 * 🔴 FOUND BY DRIVING E-101's OWN FIX ON PRODUCTION, not by any suite. `/positions/<id>`
 * resolved correctly, the destination rendered an element with that id, and the `:target` ring
 * was applied — and the player still landed at the **top of the page**. Measured on
 * `/markets/mkt_13a8ac2b5a40d8ede682#pos_d4f6f0614bcd75dd221d`: the card sat at **top 1066 in a
 * 900px viewport with `scrollY` 0**, 166px below the fold, after a full document load and 1.5s.
 *
 * ⛔ AND THE UP & DOWN LEG PASSED VACUOUSLY IN THE SAME RUN — its panel happened to be above the
 * fold, so "the row is in the viewport" was true without anything having scrolled. One check,
 * two surfaces, and only the one where the geometry disagreed revealed that neither was working.
 *
 * **The mechanism:** these pages are `force-dynamic` and stream. The browser resolves a fragment
 * while parsing, gives up when nothing matches, and does not retry once the card arrives in a
 * later chunk. So the anchor is correct, the CSS is correct, and the scroll never happens —
 * which is the "looks deep, lands at the top" failure E-101 was written to remove, surviving
 * one layer further in. The same shape as E-65 surviving its own fix.
 *
 * ⛔ IT MUST NOT FIGHT THE PLAYER. If they have scrolled before the card arrives, that is them
 * reading the page, and yanking the viewport out from under someone is worse than not scrolling
 * at all. The retry aborts the moment `scrollY` moves.
 */
export function HashFocus() {
  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (!id) return;

    // The player's starting position. Anything other than this means they took over.
    const startedAt = window.scrollY;
    let cancelled = false;
    const stop = () => { cancelled = true; };
    window.addEventListener("wheel", stop, { passive: true, once: true });
    window.addEventListener("touchmove", stop, { passive: true, once: true });
    window.addEventListener("keydown", stop, { once: true });

    let timer: ReturnType<typeof setTimeout> | undefined;
    let tries = 0;
    const tick = () => {
      if (cancelled || window.scrollY !== startedAt) return;
      const el = document.getElementById(id);
      if (el) {
        // The Up & Down anchor is a zero-height span marking a card; scroll the card, not the
        // marker, or the row lands flush against the top edge under the header.
        const box = el.getBoundingClientRect().height > 0 ? el : el.closest(".ticket-scope") ?? el;
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        box.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" });
        return;
      }
      // ~4s of retries at 100ms. A streamed card on a cold dynamic render lands well inside
      // that; past it we stop rather than poll a page that is simply not going to have it.
      if (++tries < 40) timer = setTimeout(tick, 100);
    };
    tick();

    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener("wheel", stop);
      window.removeEventListener("touchmove", stop);
      window.removeEventListener("keydown", stop);
    };
  }, []);

  return null;
}
