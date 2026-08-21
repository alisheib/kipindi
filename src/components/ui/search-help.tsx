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
        onClick={() => setOpen((v) => !v)}
      >
        <I.info s={15} aria-hidden />
      </button>
      {open && (
        <div
          role="dialog"
          aria-label={t.common.searchHelpTitle}
          className="absolute right-0 top-9 z-50 w-[min(320px,calc(100vw-24px))] rounded-xl border border-border-strong bg-bg-elevated/95 p-3 shadow-e4 backdrop-blur-xl"
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
