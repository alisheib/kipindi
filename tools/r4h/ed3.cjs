const { edit } = require('./ed1.cjs');
edit('src/components/home/landing-hero.tsx', [
  ['import { Cash } from "@/components/ui/cash";\n', 'import { Cash } from "@/components/ui/cash";\nimport { DotSeq } from "@/components/ui/dot-seq";\nimport { keepFigures } from "@/components/ui/keep-words";\n'],
  // E28 + E29 — the row's title and meta line
  [`  const noAria = (price.kind === "priced" ? t.market.backSideAria.replace("{pct}", String(100 - price.yesPct)) : t.market.backSideAriaNoPrice).replace("{side}", noWord);
  return (`,
   `  const noAria = (price.kind === "priced" ? t.market.backSideAria.replace("{pct}", String(100 - price.yesPct)) : t.market.backSideAriaNoPrice).replace("{side}", noWord);
  /* ⭐ THE META LINE BREAKS ONLY BETWEEN ITS FACTS (round 4 of the visual pass, 2026-10-09, edges tiles 248 249 257 258 266
     267): "Closes 27 Sep · Settles on {source} · Pool TZS n · n predictors" was one sentence of text, so at 360 its first
     line ended on the dot ("…Linatatuliwa kwa bot.go.tz ·" / "Bwawa TZS 0 · 0 watabiri"). It is \`DotSeq\` now, the one
     idiom for "A · B · C" (dot-seq.tsx): each fact one flex item, its dot hanging in the gap, so no line ends or opens on
     "·". The facts are the same words and wear the same classes and \`data-market-part\` hooks, through \`renderPart\`. */
  const settles = row.sourceName ? \`\${settlesPre}\${row.sourceName}\${settlesPost}\` : null;
  const pool = \`\${t.common.pool} \${formatTzs(row.pool)}\`;
  const depth = \`\${formatNumber(row.predictors)} \${row.predictors === 1 ? t.market.predictorsCountOne : t.market.predictorsCount}\`;
  const metaPart = (part: string) =>
    part === closes ? <span className="kp-qrow__close">{closes}</span>
    : part === settles ? (
      <span className="kp-qrow__src">
        {settlesPre}
        <span className="kp-qrow__srcname" data-market-part="source">{row.sourceName}</span>
        {settlesPost}
      </span>
    )
    // The pool is REAL even when it is zero, so it is always stated (V18, K48).
    : part === pool ? <span className="kp-qrow__pool" data-market-part="pool">{pool}</span>
    : part === depth ? <span className="kp-qrow__depth" data-market-part="predictors">{depth}</span>
    : part;
  return (`],
  [`        <span className="kp-qrow__q">{title}</span>
        <span className="kp-qrow__meta">
          <span className="kp-qrow__close">{closes}</span>
          {row.sourceName && (
            <>
              {" · "}
              <span className="kp-qrow__src">
                {settlesPre}
                <span className="kp-qrow__srcname" data-market-part="source">{row.sourceName}</span>
                {settlesPost}
              </span>
            </>
          )}
          {" · "}
          {/* The pool is REAL even when it is zero, so it is always stated (V18, K48). */}
          <span className="kp-qrow__pool" data-market-part="pool">{t.common.pool}{" "}{formatTzs(row.pool)}</span>
          {" · "}
          <span className="kp-qrow__depth" data-market-part="predictors">
            {formatNumber(row.predictors)}{" "}{row.predictors === 1 ? t.market.predictorsCountOne : t.market.predictorsCount}
          </span>
        </span>`,
   `        {/* \`keepFigures\` (round 4, edges 197 255): "2026-27" and "dakika 28:00" never break inside. */}
        <span className="kp-qrow__q">{keepFigures(title)}</span>
        <DotSeq text={[closes, settles, pool, depth].filter(Boolean).join(" · ")} className="kp-qrow__meta" renderPart={metaPart} />`],
]);
