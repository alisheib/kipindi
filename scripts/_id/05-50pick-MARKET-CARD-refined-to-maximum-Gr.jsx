/* 50pick — MARKET CARD, refined to maximum. Grid only.
   Premium pass on the binary card: gilt hairline gradient frame, category
   sigil, number-as-hero with sparkline, a live trader crest-stack (identity
   woven into the card), the signature TippingBar, YES/NO, and a faint
   heraldic shield flourish. Reuses TippingBar/Sparkline/MoveChip + crests. */
const fmtTZS = (n) => "TZS " + n.toLocaleString("en-US");

function StatusChip({ status = "LIVE", signal }) {
  const map = { LIVE: "chip-live", RESOLVED: "chip-resolved", SOON: "chip-pending", VOID: "chip-objection" };
  const live = status === "LIVE";
  return (
    <div className="mcardp-top">
      <span className={`chip ${map[status] || "chip-live"}`}>{live && <span className="live-dot" style={{ width: 6, height: 6 }} />}{live ? "Live" : status === "RESOLVED" ? "Resolved" : status === "SOON" ? "Ending soon" : "Void"}</span>
      {signal && (
        <span className={`chip ${signal.kind === "hot" ? "chip-objection" : signal.kind === "tipping" ? "chip-signal" : "chip-pending"}`} style={{ fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 5 }}>
          {signal.kind === "hot" && <I.hot s={11} />}{signal.kind === "tipping" && <I.tipping s={11} />}{signal.kind === "soon" && <I.soon s={11} />}{signal.label}
        </span>
      )}
    </div>
  );
}

function MarketCardPro({ m }) {
  const { titleEn, titleSw, category, catIcon = "markets", yesPct, volume, predictors, timeLeft, status = "LIVE", spark, move24h, signal, traders = [] } = m;
  const live = status === "LIVE" || status === "SOON";
  const CatIco = I[catIcon] || I.markets;
  return (
    <article className="mcardp">
      <StatusChip status={status} signal={signal} />
      <div className="mcardp-top" style={{ gap: 8 }}>
        <span className="mcardp-catico"><CatIco /></span>
        <span className="tile-label" style={{ letterSpacing: "0.1em" }}>{category}</span>
        {move24h !== undefined && live && <span style={{ marginLeft: "auto" }}><MoveChip move={move24h} /></span>}
      </div>
      <div>
        <h3 className="mcardp-q">{titleEn}</h3>
        {titleSw && <p className="mcardp-q-sw">{titleSw}</p>}
      </div>
      <div className="mcardp-hero">
        <div>
          <div className="mcardp-pctcap">YES · Ndio</div>
          <div className="mcardp-pct">{yesPct}<span className="u">%</span></div>
        </div>
        {spark && spark.length > 1 && <span className="mcardp-spark"><Sparkline data={spark} width={104} height={40} /></span>}
      </div>
      <TippingBar yesPct={yesPct} height={16} resolved={status === "RESOLVED"} showLabels={false} recastOnHover={true} />
      {live ? (
        <div className="mcardp-actions">
          <button type="button" className="btn btn-yes btn-md">YES <span className="mono" style={{ opacity: 0.85, fontSize: 13 }}>{yesPct}</span></button>
          <button type="button" className="btn btn-no btn-md">NO <span className="mono" style={{ opacity: 0.85, fontSize: 13 }}>{100 - yesPct}</span></button>
        </div>
      ) : (
        <div className="btn btn-ghost btn-md" style={{ justifyContent: "center", pointerEvents: "none", opacity: 0.85 }}>
          <I.resolved s={15} /> Resolved {yesPct >= 50 ? "YES" : "NO"}
        </div>
      )}
      <div className="mcardp-meta">
        {traders.length > 0 && (
          <span className="mcardp-traders">
            <span className="av-stack">{traders.slice(0, 3).map((s) => <IdentityAvatar key={s} seed={s} size={20} kind="tipping" />)}</span>
            <span className="t-txt"><b>{predictors.toLocaleString()}</b> traders</span>
          </span>
        )}
        <span className="dot" style={{ marginLeft: traders.length ? 4 : 0 }} />
        <span>{fmtTZS(volume)}</span>
        <span style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 5 }} className={live ? "live" : ""}>
          {status === "SOON" ? <I.soon s={12} /> : null}{timeLeft}
        </span>
      </div>
    </article>
  );
}

Object.assign(window, { MarketCardPro, fmtTZS });
