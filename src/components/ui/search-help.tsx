"use client";

/**
 * SearchHelp — the affordance that makes the grammar discoverable.
 *
 * The operator this is built for is non-technical. A grammar nobody can find is
 * the same as no grammar, so the rules are taught by EXAMPLE and every example is
 * CLICKABLE — tapping one drops it into the box and the results change
 * immediately. Nobody has to read a syntax reference or remember a field name:
 * this surface's real field names are rendered as chips, straight from the
 * registry in lib/search/fields.ts.
 *
 * Regex is deliberately NOT shown unless the surface passes `allowRegex`, and
 * even then it sits last and is labelled slow. A non-technical user must never be
 * nudged toward the one mode that can pin a database connection.
 */

import { useEffect, useRef, useState } from "react";
import { I } from "@/components/ui/glyphs";
import { useT } from "@/lib/i18n";

export function SearchHelp({
  fields,
  allowRegex,
  onInsert,
}: {
  fields?: readonly string[];
  allowRegex?: boolean;
  onInsert: (example: string) => void;
}) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  /**
   * DG-A-03, second half. Unclipping the panel revealed the defect UNDER the defect: on 5 of the
   * 7 search surfaces the box sits low enough that a 386-464px panel opening downward runs past
   * the fold, so its LAST example row — a clickable one — could not be reached without scrolling.
   * Measured on production: /admin/transactions top=565, /admin/candidates 576, /admin/ai-polls
   * 476, /admin/proposals 492, /live 548, all bottom-out below a 900px viewport.
   *
   * ⛔ THIS CANNOT BE DONE IN CSS. Whether there is room below is a fact about where the trigger
   * happens to be, and no selector can ask that. `select.tsx` and `date-select.tsx` already
   * measure by hand for the same reason, so this is the file's own house style, not a new one.
   * ⚠️ Measured on OPEN only, and it is deliberately not re-measured on scroll: the panel closes
   * on outside-mousedown and Escape, so it never lives long enough to go stale, and a scroll
   * listener here would run on every wheel event of a long admin table.
   */
  const [pos, setPos] = useState<{ up: boolean; maxH: number }>({ up: false, maxH: 0 });

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onEsc);
    return () => { document.removeEventListener("mousedown", onDoc); document.removeEventListener("keydown", onEsc); };
  }, [open]);

  const firstField = fields?.[0];
  const rows: Array<{ ex: string; why: string }> = [
    { ex: "simba win", why: t.common.searchHelpWords },
    { ex: '"long rains"', why: t.common.searchHelpPhrase },
    { ex: "-crypto", why: t.common.searchHelpExclude },
  ];
  if (firstField) rows.push({ ex: `${firstField}:`, why: t.common.searchHelpField });

  // Hidden below `sm` on purpose, for two reasons: the popover is cramped on a
  // 390px screen, and the trigger ate 32px of the input — taking the field to
  // 268px, under the 280px floor scripts/markets-search-e2e.mjs asserts for
  // thumb-typing. The grammar still WORKS on a phone; only the reference is
  // desktop-only, which is where an operator composes a `field:` query anyway.
  return (
    <div className="relative shrink-0 hidden sm:block" ref={ref}>
      <button
        type="button"
        aria-label={t.common.searchHelpTitle}
        aria-expanded={open}
        // 40px = --tap-min, the size of the chips this sits among. ARBITRARY LITERAL:
        // the spacing scale is OVERRIDDEN (tailwind.config.ts:200-215), so `h-8 w-8`
        // was 48px. ⛔ Never a scale token here.
        className="inline-flex h-[40px] w-[40px] items-center justify-center text-text-subtle hover:text-text transition-colors"
        onClick={() => {
          /**
           * ⛔ CHOOSING A SIDE IS NOT ENOUGH — measured on production. The first version flipped
           * up whenever there was more room above, and on `/admin/ai-polls` and `/admin/proposals`
           * that put the panel's top at −39px and −23px: off the TOP instead of off the bottom.
           * A 464px panel in a 900px viewport does not fit on EITHER side of a mid-page trigger,
           * so no choice of direction can be correct. It must also be BOUNDED.
           * So: take the roomier side, then cap the height to the room that side actually has and
           * let the list scroll inside itself. The panel is then always wholly on screen and every
           * example row is reachable — which is the only thing this affordance is for.
           */
          const r = ref.current?.getBoundingClientRect();
          if (r) {
            const GAP = 6, EDGE = 12;
            /**
             * ⛔ THE VIEWPORT IS NOT THE BOUNDARY — the nearest CLIPPING ANCESTOR is, and asking
             * the wrong one is how the second draft failed. On `/admin/proposals` the SearchBox
             * sits inside `<div className="overflow-hidden glass-panel">` (the queue
             * card, whose clip is load-bearing: its list rows tint on hover and would square off
             * the card's bottom corners without it). By the viewport's reckoning there was ample
             * room above, so the panel flipped up — straight into that card's clip, and measured
             * `hits=[false,false,true]`: two thirds of it painted nothing. Flipping had made it
             * WORSE than staying down, where at least it could be scrolled to.
             * So walk up and intersect with every ancestor that clips. This also protects any
             * SearchBox a future page drops inside a card, which is the ordinary case.
             */
            let top = 0, bottom = window.innerHeight;
            for (let el = ref.current?.parentElement; el && el !== document.body; el = el.parentElement) {
              const s = getComputedStyle(el);
              if (s.overflow !== "visible" || s.overflowX !== "visible" || s.overflowY !== "visible") {
                const q = el.getBoundingClientRect();
                top = Math.max(top, q.top);
                bottom = Math.min(bottom, q.bottom);
              }
            }
            const below = bottom - r.bottom - GAP - EDGE;
            const above = r.top - top - GAP - EDGE;
            const up = above > below;
            setPos({ up, maxH: Math.max(180, Math.floor(up ? above : below)) });
          }
          setOpen((v) => !v);
        }}
      >
        <I.info s={15} aria-hidden />
      </button>
      {open && (
        <div
          role="dialog"
          aria-label={t.common.searchHelpTitle}
          // DG-A-03 — ⚠️ `top-9` was 64px, NOT 36px: the spacing scale is OVERRIDDEN
          // (tailwind.config.ts), and `top-*` derives from it. So the panel opened 64px below
          // a 40px trigger, i.e. 22px past the bottom of `.input-group`'s 44px clip band, and
          // painted nothing at all. Anchor to the trigger instead of to a scale step — the
          // idiom `nav-more.tsx` already ships. ⛔ If a wider gap is ever wanted, change the
          // `6px`, never the `100%`.
          className={`absolute right-0 ${pos.up ? "bottom-[calc(100%+6px)]" : "top-[calc(100%+6px)]"} z-50 w-[min(320px,calc(100vw-24px))] overflow-y-auto overscroll-contain rounded-xl border border-border-strong bg-bg-elevated/95 p-3 shadow-e4 backdrop-blur-xl`}
          style={pos.maxH ? { maxHeight: pos.maxH } : undefined}
        >
          <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.16em] font-bold text-text-muted">
            {t.common.searchHelpTitle}
          </p>
          <ul className="space-y-1.5">
            {rows.map((r) => (
              <li key={r.ex}>
                <button
                  type="button"
                  className="w-full rounded-md px-2 py-1.5 text-left hover:bg-bg-overlay transition-colors"
                  onClick={() => { onInsert(r.ex); setOpen(false); }}
                >
                  <code className="font-mono text-[12px] text-text">{r.ex}</code>
                  <span className="block text-[11px] text-text-subtle">{r.why}</span>
                </button>
              </li>
            ))}
          </ul>

          {fields && fields.length > 0 && (
            <>
              <p className="mt-2.5 mb-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-text-subtle">
                {t.common.searchHelpFieldsHere}
              </p>
              <div className="flex flex-wrap gap-1">
                {fields.map((f) => (
                  <button
                    key={f}
                    type="button"
                    className="rounded-pill border border-border bg-bg-inset px-2 py-0.5 font-mono text-[10.5px] text-text-muted hover:border-border-strong hover:text-text transition-colors"
                    onClick={() => { onInsert(`${f}:`); setOpen(false); }}
                  >
                    {f}:
                  </button>
                ))}
              </div>
            </>
          )}

          {allowRegex && (
            <div className="mt-2.5 border-t border-border pt-2">
              <button
                type="button"
                className="w-full rounded-md px-2 py-1.5 text-left hover:bg-bg-overlay transition-colors"
                onClick={() => { onInsert("/simba|yanga/"); setOpen(false); }}
              >
                <code className="font-mono text-[12px] text-text">/simba|yanga/</code>
                <span className="block text-[11px] text-text-subtle">{t.common.searchHelpRegex}</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
