const { edit } = require('./ed1.cjs');
edit('src/components/home/landing-hero.tsx', [
  [`    // The pool is REAL even when it is zero, so it is always stated (V18, K48).
    : part === pool ? <span className="kp-qrow__pool" data-market-part="pool">{pool}</span>
    : part === depth ? <span className="kp-qrow__depth" data-market-part="predictors">{depth}</span>
    : part;`, `    // The pool is REAL even when it is zero, so it is always stated (V18, K48). Each part draws its words as the row
    // always did (the same expressions; the strings above are only how DotSeq knows which part it is holding).
    : part === pool ? <span className="kp-qrow__pool" data-market-part="pool">{t.common.pool}{" "}{formatTzs(row.pool)}</span>
    : part === depth ? (
      <span className="kp-qrow__depth" data-market-part="predictors">
        {formatNumber(row.predictors)}{" "}{row.predictors === 1 ? t.market.predictorsCountOne : t.market.predictorsCount}
      </span>
    )
    : part;`],
]);
edit('scripts/visual-pass-r4h.test.mts', [
  [`    !s.includes(\`: part === pool ? <span className="kp-qrow__pool" data-market-part="pool">{pool}</span>\`) && "the pool part lost its class or hook",
    !s.includes(\`: part === depth ? <span className="kp-qrow__depth" data-market-part="predictors">{depth}</span>\`) && "the predictors part lost its class or hook",`,
   `    !squash(s).includes(\`: part === pool ? <span className="kp-qrow__pool" data-market-part="pool">{t.common.pool}{" "}{formatTzs(row.pool)}</span>\`) && "the pool part lost its class, hook or words",
    !squash(s).includes(\`: part === depth ? ( <span className="kp-qrow__depth" data-market-part="predictors"> {formatNumber(row.predictors)}{" "}{row.predictors === 1 ? t.market.predictorsCountOne : t.market.predictorsCount} </span> )\`) && "the predictors part lost its class, hook or words",
    !s.includes("const pool = \`\${t.common.pool} \${formatTzs(row.pool)}\`;") && "the pool's key is not the words it draws",`],
]);
