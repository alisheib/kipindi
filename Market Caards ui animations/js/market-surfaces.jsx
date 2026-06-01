/* 50pick — MarketCard + MarketDetail (calm trading terminal)
   Built only on kit components (TippingBar, Button, Avatar, SignalPip) +
   ProbabilityChart/Sparkline + the .mcard / .mterm classes in globals.css. */

const { useState: msUseState } = React;

/* Line-art arrow for the move chip (no emoji) */
function MoveArrow({ dir }) {
  if (dir === "flat") return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12" /></svg>;
  const up = dir === "up";
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ transform: up ? "none" : "rotate(180deg)" }}>
      <path d="M12 5 L12 19 M6 11 L12 5 L18 11" />
    </svg>
  );
}
function MoveChip({ move }) {
  const dir = move > 0 ? "up" : move < 0 ? "down" : "flat";
  const cls = dir === "up" ? "mcard-move-up" : dir === "down" ? "mcard-move-down" : "mcard-move-flat";
  return (
    <span className={"mcard-move " + cls} title="24h move · Mwenendo wa saa 24">
      <MoveArrow dir={dir} />{move > 0 ? "+" : ""}{move}<span style={{ opacity: 0.7 }}>pt</span>
    </span>
  );
}

/* ── MarketCard — YES probability as the hero ────────────────────────────── */
function MarketCard({ market }) {
  const sparkData = market.series["1W"].map((d) => d.p);
  return (
    <article className="mcard" data-screen-label={`Card · ${market.id}`}>
      <div className="mcard-top">
        {market.live
          ? <span className="chip chip-live"><span className="live-dot" /> LIVE</span>
          : <span className="chip" style={{ background: "var(--bg-overlay)" }}>Open · Wazi</span>}
        <span className="chip mcard-cat">{market.category}</span>
      </div>

      <div>
        <h3 className="mcard-q">{market.question}</h3>
        <p className="mcard-q-sw">{market.questionSw}</p>
      </div>

      <div className="mcard-hero">
        <div>
          <div className="mcard-pct-label">YES · Ndio</div>
          <div className="mcard-pct">{market.yes}<span className="unit">%</span></div>
        </div>
        <MoveChip move={market.move24h} />
        <span className="mcard-spark"><Sparkline data={sparkData} width={84} height={34} /></span>
      </div>

      <TippingBar yesPct={market.yes} height={22} />

      <div className="mcard-actions">
        <Button variant="yes" size="lg" trailing={<span className="mono" style={{ opacity: 0.85, fontSize: 13 }}>{market.yes}</span>}>YES</Button>
        <Button variant="no" size="lg" trailing={<span className="mono" style={{ opacity: 0.85, fontSize: 13 }}>{100 - market.yes}</span>}>NO</Button>
      </div>

      <div className="mcard-meta">
        <span>{market.volume} vol</span>
        <span className="dot-sep" />
        <span>{market.traders.toLocaleString("en-US")} traders</span>
      </div>
    </article>
  );
}

/* ── Trust strip line-art icons (teal stroke, gilt via CSS) ──────────────── */
const TrustShield = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3 L20 6 V11 C20 16 16 19.5 12 21 C8 19.5 4 16 4 11 V6 Z" /><path d="M9 12 l2 2 l4 -4" /></svg>;
const TrustScale = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="4" x2="12" y2="20" /><line x1="6" y1="20" x2="18" y2="20" /><path d="M5 8 H19" /><path d="M5 8 l-2.5 5 a3 3 0 0 0 5 0 Z" /><path d="M19 8 l-2.5 5 a3 3 0 0 0 5 0 Z" /></svg>;
const TrustLock = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="10" width="14" height="10" rx="2" /><path d="M8 10 V7 a4 4 0 0 1 8 0 V10" /></svg>;
const TrustDoc = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M7 3 H14 L19 8 V21 H7 Z" /><path d="M14 3 V8 H19" /><line x1="10" y1="13" x2="16" y2="13" /><line x1="10" y1="16.5" x2="16" y2="16.5" /></svg>;

/* ── Comments slot ───────────────────────────────────────────────────────── */
const COMMENTS = [
  { name: "Asha M.", seed: "asha", tier: "gold", side: "yes", time: "2h", text: "Reserve held the line last quarter — pressure on the shilling isn't easing. Staying YES.", sw: null },
  { name: "Juma K.", seed: "juma", tier: "silver", side: "no", time: "5h", text: "Crossing 2,700 needs a real shock. Pool's overpricing it. Backed NO at 0.34.", sw: null },
];
function Comment({ c }) {
  return (
    <div className="comment">
      <Avatar initials={c.name} seed={c.seed} size="sm" />
      <div className="comment-body">
        <div className="comment-head">
          <span className="comment-name">{c.name}</span>
          <TierBadge tier={c.tier} />
          <span className={"comment-side " + (c.side === "yes" ? "comment-side-yes" : "comment-side-no")}>{c.side === "yes" ? "YES" : "NO"}</span>
          <span className="comment-time">· {c.time}</span>
        </div>
        <p className="comment-text">{c.text}</p>
      </div>
    </div>
  );
}

/* ── Bet ticket (rail) ───────────────────────────────────────────────────── */
function BetTicket({ market }) {
  const [side, setSide] = msUseState("yes");
  const [amt, setAmt] = msUseState(10000);
  const price = side === "yes" ? market.yes / 100 : (100 - market.yes) / 100;
  const shares = amt > 0 ? amt / price : 0;
  const toWin = Math.max(0, shares - amt);
  const fmt = (v) => Math.round(v).toLocaleString("en-US");
  return (
    <div className="tpanel">
      <div className="tpanel-head"><span className="tpanel-title">Place prediction · Weka utabiri</span></div>
      <div className="tpanel-pad" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div className="ticket-tabs">
          <button className={"ticket-tab" + (side === "yes" ? " is-yes-active" : "")} onClick={() => setSide("yes")}>YES <span className="t-pct">{market.yes}%</span></button>
          <button className={"ticket-tab" + (side === "no" ? " is-no-active" : "")} onClick={() => setSide("no")}>NO <span className="t-pct">{100 - market.yes}%</span></button>
        </div>

        <div>
          <div className="ticket-row" style={{ marginBottom: 6 }}><span className="label">Stake · Kiasi</span><span className="val">TZS</span></div>
          <div className="input-group">
            <span className="prefix">TZS</span>
            <input className="input input-mono" type="text" inputMode="numeric" value={amt.toLocaleString("en-US")} onChange={(e) => { const n = parseInt(e.target.value.replace(/[^0-9]/g, ""), 10); setAmt(isNaN(n) ? 0 : n); }} aria-label="Stake amount" />
          </div>
          <div className="ticket-quick" style={{ marginTop: 8 }}>
            {[5000, 10000, 25000, 50000].map((q) => (<button key={q} className="ticket-chip" onClick={() => setAmt(q)}>{q / 1000}k</button>))}
          </div>
        </div>

        <div className="gilt-rule" style={{ margin: "2px 0" }} />

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div className="ticket-row"><span className="label">Avg price · Bei</span><span className="val">{price.toFixed(2)}</span></div>
          <div className="ticket-row"><span className="label">Est. shares · Hisa</span><span className="val">{fmt(shares)}</span></div>
          <div className="ticket-row"><span className="label">To win · Faida</span><span className="val val-gilt">TZS {fmt(toWin)}</span></div>
        </div>

        <Button variant={side === "yes" ? "yes" : "no"} size="xl" fullWidth>
          Back {side === "yes" ? "YES · Ndio" : "NO · Hapana"}
        </Button>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.04em", color: "var(--text-subtle)", textAlign: "center", margin: 0 }}>
          18+ · Cheza kwa busara · Licensed by GBT
        </p>
      </div>
    </div>
  );
}

/* ── Position / P&L ──────────────────────────────────────────────────────── */
function PositionPanel({ pos }) {
  const valueNum = parseInt(pos.value.replace(/[^0-9]/g, ""), 10);
  const costNum = parseInt(pos.cost.replace(/[^0-9]/g, ""), 10);
  const pnl = valueNum - costNum;
  const pct = ((pnl / costNum) * 100);
  const up = pnl >= 0;
  return (
    <div className="tpanel">
      <div className="tpanel-head"><span className="tpanel-title">Your position · Nafasi yako</span></div>
      <div className="tpanel-pad" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div className="ticket-row"><span className="label">Side · Upande</span><span className={"comment-side " + (pos.side === "YES" ? "comment-side-yes" : "comment-side-no")}>{pos.side}</span></div>
        <div className="ticket-row"><span className="label">Shares · Hisa</span><span className="val">{pos.shares} @ {pos.avg.toFixed(2)}</span></div>
        <div className="pnl-grid">
          <div className="pnl-cell"><div className="pnl-cap">Value · Thamani</div><div className="pnl-val">{pos.value}</div></div>
          <div className="pnl-cell"><div className="pnl-cap">P&L · Faida</div><div className={"pnl-val " + (up ? "up" : "down")}>{up ? "+" : "−"}TZS {Math.abs(pnl).toLocaleString("en-US")}<span style={{ fontSize: 11, marginLeft: 5, opacity: 0.8 }}>{up ? "+" : "−"}{Math.abs(pct).toFixed(1)}%</span></div></div>
        </div>
        <Button variant="ghost" size="md" fullWidth>Cash out · Toa pesa</Button>
      </div>
    </div>
  );
}

/* ── MarketDetail — the calm trading terminal ────────────────────────────── */
function MarketDetail({ market }) {
  return (
    <div className="mterm" data-screen-label="Market detail · terminal">
      {/* ---- Main column ---- */}
      <div className="mterm-main">
        {/* Question header */}
        <div className="tpanel tpanel-pad">
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <span className="chip chip-live"><span className="live-dot" /> LIVE</span>
            <span className="chip">{market.category}</span>
            <span style={{ marginLeft: "auto", fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-subtle)" }}>Closes · Inafunga {market.closes}</span>
          </div>
          <h1 className="mterm-q">{market.question}</h1>
          <p className="mterm-q-sw">{market.questionSw}</p>
        </div>

        {/* Hero % + chart */}
        <div className="tpanel tpanel-pad">
          <div className="mterm-hero" style={{ marginBottom: 18 }}>
            <div>
              <div className="mterm-pct-cap">YES · Ndio</div>
              <div className="mterm-pct">{market.yes}<span className="unit">%</span></div>
            </div>
            <MoveChip move={market.move24h} />
            <div style={{ marginLeft: "auto", textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-subtle)", lineHeight: 1.7 }}>
              <div>{market.volume} volume</div>
              <div>{market.traders.toLocaleString("en-US")} traders</div>
            </div>
          </div>
          <ProbabilityChart series={market.series} defaultRange="1M" width={680} height={272} />
          <div style={{ marginTop: 18 }}><TippingBar yesPct={market.yes} height={24} /></div>
        </div>

        {/* Two-sided pool */}
        <div className="tpanel">
          <div className="tpanel-head"><span className="tpanel-title">Two-sided pool · Dimbwi la pande mbili</span></div>
          <div className="tpanel-pad">
            <div className="pool">
              <div className="pool-side pool-yes">
                <span className="pool-cap">YES · Ndio</span>
                <span className="pool-amt">{market.poolYes}</span>
                <span className="pool-sub">{market.yes}% of pool · {Math.round(market.traders * 0.58)} backers</span>
              </div>
              <div className="pool-side pool-no">
                <span className="pool-cap">NO · Hapana</span>
                <span className="pool-amt">{market.poolNo}</span>
                <span className="pool-sub">{100 - market.yes}% of pool · {Math.round(market.traders * 0.42)} backers</span>
              </div>
            </div>
          </div>
        </div>

        {/* Comments slot */}
        <div className="tpanel">
          <div className="tpanel-head">
            <span className="tpanel-title">Discussion · Mjadala</span>
            <span style={{ marginLeft: "auto", fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-subtle)" }}>{COMMENTS.length} comments</span>
          </div>
          <div className="tpanel-pad comment-slot">
            {COMMENTS.map((c) => <Comment key={c.name} c={c} />)}
            <div className="input-group" style={{ marginTop: 2 }}>
              <input className="input" placeholder="Add your read · Andika maoni yako" aria-label="Add a comment" />
            </div>
          </div>
        </div>

        {/* Trust strip */}
        <div className="trust">
          <span className="trust-item"><TrustShield /> Licensed · Gaming Board of Tanzania</span>
          <span className="trust-sep" />
          <span className="trust-item"><TrustScale /> Two-officer resolution</span>
          <span className="trust-sep" />
          <span className="trust-item"><TrustDoc /> On-chain audit trail</span>
          <span className="trust-sep" />
          <span className="trust-item"><TrustLock /> Funds held in escrow</span>
        </div>
      </div>

      {/* ---- Right rail ---- */}
      <div className="mterm-rail">
        <BetTicket market={market} />
        <PositionPanel pos={market.position} />
      </div>
    </div>
  );
}

Object.assign(window, { MarketCard, MarketDetail, BetTicket, PositionPanel });
