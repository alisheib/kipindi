"use client";

/** Payload-free odds refresh, mounted only inside the journey's BetSheetHost (S8 WP10, A24 item 6). */
import { useEffect, useRef } from "react";

export const CARD_REFRESH_WINDOW_MS = 10_000;

export function VisibleCardRefresh({ sheetOpen }: { sheetOpen: boolean }) {
  const open = useRef(sheetOpen);
  open.current = sheetOpen;
  const release = useRef<() => void>(() => {});

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const watched = new Set<Element>();
    const visible = new Set<Element>();
    let pending = false;
    let lastSent = Number.NEGATIVE_INFINITY;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const clear = () => { if (timer !== null) clearTimeout(timer); timer = null; };
    const flush = () => {
      clear();
      if (!pending || open.current || document.visibilityState !== "visible") return;
      const remaining = CARD_REFRESH_WINDOW_MS - (Date.now() - lastSent);
      if (remaining > 0) { timer = setTimeout(flush, remaining); return; }
      pending = false;
      lastSent = Date.now();
      window.dispatchEvent(new Event("50pick:refresh"));
    };
    release.current = flush;
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) entry.isIntersecting ? visible.add(entry.target) : visible.delete(entry.target);
    });
    const sync = () => {
      for (const card of watched) if (!card.isConnected) { observer.unobserve(card); watched.delete(card); visible.delete(card); }
      // A soft navigation's ShowMore adds cards after mount; each gets observed too (A24).
      for (const card of document.querySelectorAll("article.kp-jcard[data-row-id]")) {
        if (!watched.has(card)) { watched.add(card); observer.observe(card); }
      }
    };
    const changes = new MutationObserver(sync);
    changes.observe(document.body, { childList: true, subtree: true });
    sync();
    const odds = (event: Event) => {
      const marketId: unknown = (event as CustomEvent<{ marketId?: unknown }>).detail?.marketId;
      if (typeof marketId !== "string" || ![...visible].some((card) => card.isConnected && card.getAttribute("data-row-id") === marketId)) return;
      if (document.visibilityState !== "visible") return;
      pending = true;
      flush();
    };
    window.addEventListener("50pick:sse:market-odds", odds);
    document.addEventListener("visibilitychange", flush);
    return () => {
      clear();
      release.current = () => {};
      observer.disconnect();
      changes.disconnect();
      window.removeEventListener("50pick:sse:market-odds", odds);
      document.removeEventListener("visibilitychange", flush);
    };
  }, []);

  useEffect(() => { if (!sheetOpen) release.current(); }, [sheetOpen]);
  return null;
}
