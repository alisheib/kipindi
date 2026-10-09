const { edit } = require('./ed1.cjs');
edit('src/app/live/pulse-grid.tsx', [
  [`import { SearchBox } from "@/components/ui/search-box";\n`, `import { SearchBox } from "@/components/ui/search-box";\nimport { QUERY_SEARCH_BAND_CLASS } from "@/components/ui/query-bar";\nimport { keepFigures } from "@/components/ui/keep-words";\n`],
  [`      {/* ⚠️ SUSPENSE: in \`url\` mode \`SearchBox\` reads \`useSearchParams\`, which needs a boundary —
          every other surface that uses it wraps it the same way. */}
      <Suspense>
        <SearchBox
          placeholder={t.common.searchLiveMarkets}
          ariaLabel={t.common.searchLiveMarkets}
          helpFields={fieldNames(MARKET_SEARCH)}
        />
      </Suspense>`, `      {/* ⚠️ SUSPENSE: in \`url\` mode \`SearchBox\` reads \`useSearchParams\`, which needs a boundary —
          every other surface that uses it wraps it the same way.
          ⭐ THE SEARCH IS A BAND (round 4 of the visual pass, 2026-10-09, R4-C's leftover; tile 205 measured 49px under the
          box): \`QUERY_SEARCH_BAND_CLASS\`, as on every other page with a search. /live has no query bar, so the box's echo row
          lies 15px into the gap below it (globals.css \`.kp-search-band\`): on the page's 24px rung the box stands 34 under
          the hero and the wall 34 under the box — 24 + 10 over, 25 − 15 + 24 under — where it stood 24 over and 49 under. */}
      <div className={QUERY_SEARCH_BAND_CLASS}>
        <Suspense>
          <SearchBox
            placeholder={t.common.searchLiveMarkets}
            ariaLabel={t.common.searchLiveMarkets}
            helpFields={fieldNames(MARKET_SEARCH)}
          />
        </Suspense>
      </div>`],
  [`/**
 * Renders a title with every hyphenated token ("30-day", "month-end?", "Man-City") in a nowrap span, so a balanced
 * wrap can move the whole token but never break after its hyphen (E-400 ⑦b). \`split\` with a capturing group puts
 * the tokens at odd indices and the text between them — spaces included — at even ones, so no space is added or lost.
 */
export function KeepHyphenated({ text }: { text: string }) {
  const parts = text.split(/(\\S*[\\p{L}\\p{N}]-[\\p{L}\\p{N}]\\S*)/u);
  return <>{parts.map((part, i) => (i % 2 === 1 ? <span key={i} className="whitespace-nowrap">{part}</span> : part))}</>;
}`, `/**
 * Renders a title with every hyphenated token ("30-day", "month-end?", "Man-City") in a nowrap span, so a balanced
 * wrap can move the whole token but never break after its hyphen (E-400 ⑦b). \`split\` with a capturing group puts
 * the tokens at odd indices and the text between them — spaces included — at even ones, so no space is added or lost.
 * ⭐ ROUND 4 (2026-10-09, edges 197 255): a token stops at an ideograph, and the text between the tokens keeps its
 * figures whole. \`\\S*\` ran across Chinese, which has no spaces, so "辛巴俱乐部赢得2026-27赛季NBC超级联赛" was ONE
 * token — the whole title in one nowrap span, wider than any card. A token is now a run of non-space, non-Han
 * characters, and \`keepFigures\` (keep-words.tsx, the cards' and the market page's own rule) shapes the text between the
 * tokens: "2026-27赛季" and "dakika 28:00" never break inside.
 */
export function KeepHyphenated({ text }: { text: string }) {
  const parts = text.split(/([^\\s\\p{Script=Han}]*[\\p{L}\\p{N}]-[\\p{L}\\p{N}][^\\s\\p{Script=Han}]*)/u);
  return <>{parts.map((part, i) => (i % 2 === 1 ? <span key={i} className="whitespace-nowrap">{part}</span> : <span key={i}>{keepFigures(part)}</span>))}</>;
}`],
]);
