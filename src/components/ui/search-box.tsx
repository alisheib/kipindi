"use client";

/**
 * SearchBox — the ONE search field in the product.
 *
 * It replaces three uncoordinated idioms and two byte-identical clones:
 *   - debounced URL push .................. markets/market-search.tsx
 *                                           results/results-search.tsx  (identical)
 *   - Enter/button-only push, no debounce . admin ai-polls + candidates filters
 *   - a plain GET <form> .................. admin markets / players / resolver-queue
 *                                           / transactions / ai-usage
 *   - client useState, no URL state ....... live/pulse-grid, admin proposals
 *
 * Behaviour is now defined once:
 *   - 250ms debounce into the URL, Enter flushes, × clears immediately
 *   - `router.replace(..., {scroll:false})` so keystrokes neither pile up in
 *     history nor jump the viewport
 *   - ALWAYS `sp.delete("page")` — markets/market-search.tsx was the one clone
 *     that forgot, so typing while on page 3 of a filtered list searched the whole
 *     set but kept showing page 3 of it
 *   - `usePathname()` instead of a hardcoded route. That single change is what
 *     lets one component serve every surface; the old clones each hardcoded their
 *     own path, which is most of why they were copied in the first place.
 *
 * Built on the kit's `.input-group` / `.prefix` / `.input` / `.clear-btn`
 * primitives so height, sunken background, focus ring and the iOS 16px rule are
 * inherited rather than re-specified. `.search-box` carries the field measure
 * (DESIGN_AUTHORITY B7) so it can never stretch to a 1,200px filter bar again.
 *
 * Two couplings that scripts/markets-search-e2e.mjs asserts and that must not
 * change casually: the placeholder on /markets matches /Search markets/, and the
 * clear button's aria-label matches /Clear search/.
 */

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { I } from "@/components/ui/glyphs";
import { Spinner } from "@/components/ui/spinner";
import { SearchHelp } from "@/components/ui/search-help";
import { parseQuery, describeQuery, MAX_QUERY_LEN } from "@/lib/search";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type Props = {
  /** URL param. Defaults to `q`. */
  param?: string;
  placeholder: string;
  ariaLabel: string;
  /** `url` (default) writes to the query string; `controlled` is for client-only
   *  filters over an already-loaded list (the /live wall, admin proposals). */
  mode?: "url" | "controlled";
  value?: string;
  onChange?: (v: string) => void;
  debounceMs?: number;
  /** Field names this surface accepts for `field:value`, shown as chips in help. */
  helpFields?: readonly string[];
  /** Opt in to `/pattern/`. Admin surfaces only — see prisma-where.ts. */
  allowRegex?: boolean;
  className?: string;
};

export function SearchBox({
  param = "q",
  placeholder,
  ariaLabel,
  mode = "url",
  value,
  onChange,
  debounceMs = 250,
  helpFields,
  allowRegex = false,
  className,
}: Props) {
  const { t } = useT();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [searching, startTransition] = useTransition();
  const [q, setQ] = useState(mode === "url" ? (searchParams.get(param) ?? "") : (value ?? ""));
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // B-25 — the input seeded itself from the URL once and never looked back, so
  // back/forward (and any filter link that carries `q`) moved the URL while the
  // box kept showing the old text. When the URL param changes and the player
  // is NOT actively typing in the box, the URL wins.
  const urlValue = mode === "url" ? (searchParams.get(param) ?? "") : null;
  const lastUrlRef = useRef(urlValue);
  useEffect(() => {
    if (mode !== "url" || urlValue === null) return;
    if (urlValue === lastUrlRef.current) return;
    lastUrlRef.current = urlValue;
    if (document.activeElement === inputRef.current) return; // mid-typing — theirs wins
    setQ(urlValue);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlValue, mode]);

  const push = (raw: string) => {
    const v = raw.trim();
    if (mode === "controlled") { onChange?.(v); return; }
    const sp = new URLSearchParams(searchParams.toString());
    if (v) sp.set(param, v);
    else sp.delete(param);
    // A new query always restarts at page 1 — otherwise the result set changes
    // under a page number that no longer refers to anything.
    sp.delete("page");
    const qs = sp.toString();
    startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  };

  useEffect(() => {
    const current = mode === "url" ? (searchParams.get(param) ?? "") : (value ?? "");
    if (current === q.trim()) return;
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => push(q), debounceMs);
    return () => { if (debounce.current) clearTimeout(debounce.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const flush = () => { if (debounce.current) clearTimeout(debounce.current); push(q); };

  // Live plain-language echo. This is what makes the grammar teach itself to a
  // non-technical operator — they SEE "2 words · hiding crypto" as they type,
  // rather than having to read a syntax reference first.
  const parsed = parseQuery(q, { allowRegex, fields: helpFields });
  const echo = describeQuery(parsed, {
    words: t.common.searchWords,
    phrase: t.common.searchPhrase,
    hiding: t.common.searchHiding,
    field: t.common.searchField,
    pattern: t.common.searchPattern,
  });
  const invalidReason =
    parsed.mode === "invalid"
      ? parsed.reason === "regex-too-long" ? t.common.searchRegexTooLong
      : parsed.reason === "regex-unsafe" ? t.common.searchRegexUnsafe
      : t.common.searchRegexSyntax
      : "";

  return (
    <div className={cn("search-box-wrap", className)}>
      <div className="input-group search-box">
        <span className="prefix" aria-hidden>
          {searching ? <Spinner size={16} /> : <I.search s={16} />}
        </span>
        <input
          ref={inputRef}
          type="search"
          value={q}
          maxLength={MAX_QUERY_LEN}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); flush(); } }}
          placeholder={placeholder}
          aria-label={ariaLabel}
          enterKeyHint="search"
          autoComplete="off"
          className="input input-mono"
        />
        {q && (
          <button
            type="button"
            aria-label={t.common.clearSearch}
            className="clear-btn"
            onClick={() => { setQ(""); if (debounce.current) clearTimeout(debounce.current); push(""); }}
          >
            <I.x s={15} />
          </button>
        )}
        <SearchHelp fields={helpFields} allowRegex={allowRegex} onInsert={(ex) => { setQ(ex); }} />
      </div>
      {invalidReason ? (
        <p role="alert" className="mt-1.5 text-[11px] text-no-300">{invalidReason}</p>
      ) : echo ? (
        <p className="mt-1.5 text-[11px] text-text-subtle">{echo}</p>
      ) : null}
    </div>
  );
}
