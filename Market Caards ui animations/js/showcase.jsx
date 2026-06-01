/* 50pick — Market Surfaces showcase. Renders the three deliverable surfaces
   live, each with a short spec, a TSX sketch in our prop style, the
   globals.css additions, and a did-not-introduce-off-kit note. */

const { useState: shUseState, useRef: shUseRef } = React;

/* Brand mark (port of brand.reference FiftyMark, trimmed) */
function FiftyMark({ size = 40 }) {
  const tilt = -14, r = 50, cx = 50, cy = 50;
  const rad = (tilt * Math.PI) / 180;
  const dx = Math.sin(rad) * 80, dy = Math.cos(rad) * 80;
  const top = { x: cx + dx, y: cy - dy }, bot = { x: cx - dx, y: cy + dy };
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} style={{ display: "block" }} aria-label="50pick">
      <defs><clipPath id="fmclip"><circle cx={cx} cy={cy} r={r - 1} /></clipPath></defs>
      <g clipPath="url(#fmclip)">
        <path d={`M ${top.x} ${top.y} A ${r} ${r} 0 0 0 ${bot.x} ${bot.y} L ${top.x} ${top.y} Z`} fill="oklch(58% 0.16 152)" />
        <path d={`M ${top.x} ${top.y} A ${r} ${r} 0 0 1 ${bot.x} ${bot.y} L ${top.x} ${top.y} Z`} fill="oklch(60% 0.18 22)" />
        <line x1={top.x} y1={top.y} x2={bot.x} y2={bot.y} stroke="oklch(78% 0.13 86)" strokeWidth="2" strokeLinecap="round" />
        <text x={cx} y={cy + 2} textAnchor="middle" dominantBaseline="middle" fontFamily="'JetBrains Mono', monospace" fontWeight="700" fontSize="30" fill="oklch(99% 0.006 268)" style={{ letterSpacing: "-0.04em" }}>50</text>
        <circle cx={cx} cy={cy} r="1.6" fill="oklch(85% 0.13 86)" />
      </g>
      <circle cx={cx} cy={cy} r={r - 1} fill="none" stroke="oklch(48% 0.20 268)" strokeWidth="2" />
      <circle cx={cx} cy={cy} r={r - 2.4} fill="none" stroke="oklch(78% 0.13 86)" strokeWidth="0.5" opacity="0.55" />
    </svg>
  );
}

/* Code block with copy */
function CodeBlock({ label, code }) {
  const [copied, setCopied] = shUseState(false);
  return (
    <div className="code-drawer">
      <div className="code-head">
        <span className="mono-tag">{label}</span>
        <button className="copy-btn" onClick={() => { navigator.clipboard && navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1400); }}>{copied ? "Copied ✓" : "Copy"}</button>
      </div>
      <pre className="code-pre">{code}</pre>
    </div>
  );
}

function Section({ id, num, title, lead, children }) {
  return (
    <section id={id} className="lab-section" data-screen-label={title}>
      <p className="gilt-eyebrow">{num}</p>
      <h2 className="lab-h2 display">{title}</h2>
      <p className="lab-lead">{lead}</p>
      {children}
    </section>
  );
}

function SpecTable({ rows }) {
  return (
    <table className="spec-table">
      <thead><tr><th style={{ width: "30%" }}>Part</th><th>Behaviour</th><th style={{ width: "26%" }}>Tokens used</th></tr></thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i}>
            <td className="ev">{r.part}</td>
            <td>{r.behaviour}</td>
            <td>{r.tokens.map((t) => <span key={t} className="token-pill" style={{ margin: "2px 4px 2px 0" }}>{t}</span>)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function NoteCard({ items }) {
  return (
    <div className="note-card" style={{ marginTop: 20 }}>
      <h4>Did not introduce off-kit</h4>
      <ul>{items.map((t, i) => <li key={i} dangerouslySetInnerHTML={{ __html: t }} />)}</ul>
    </div>
  );
}

/* ── Code samples (faithful TSX sketches in kit prop style) ──────────────── */
const CHART_TSX = `// ProbabilityChart — the signature "tipping line" chart.
// One emerald YES line; the area fills emerald above the gilt 50% line
// and rose below it (half-plane clip); aqua live point.
export function ProbabilityChart({
  series,                       // Record<Range, { t: string; p: number }[]>
  defaultRange = "1M",
  ranges = ["1D", "1W", "1M", "ALL"],
  width = 680, height = 272,
}: ProbabilityChartProps) {
  const [range, setRange] = useState(defaultRange);
  const data = series[range];
  const y = (p: number) => padT + (1 - p / 100) * H;   // 0–100 → px
  const baseline = y(50);                               // the tipping line

  return (
    <figure className="pchart">
      <RangeTabs ranges={ranges} value={range} onChange={setRange} />
      <svg viewBox={\`0 0 \${width} \${height}\`}>
        {/* two-tone area, clipped at the 50% baseline */}
        <path d={area} fill="url(#yesfill)" clipPath="url(#above)" />
        <path d={area} fill="url(#nofill)" clipPath="url(#below)" />
        {/* gilt dashed tipping reference */}
        <line className="pchart-tip" y1={baseline} y2={baseline} ... />
        {/* the YES line — soft-glow emerald, draws in on mount */}
        <path className="pchart-line is-drawn" d={line} />
        {/* aqua live point (SignalPip echo) */}
        <circle className="pchart-dot" cx={lastX} cy={lastY} r={3.5} />
      </svg>
    </figure>
  );
}`;

const CHART_CSS = `/* globals.css — additions (tokens only) */
.pchart-tip  { stroke: var(--gilt); stroke-dasharray: 2 5; opacity: .55; } /* 50% */
.pchart-line { fill: none; stroke: var(--yes-400); stroke-width: 2.25;
  filter: drop-shadow(0 0 5px color-mix(in oklab, var(--yes-400) 35%, transparent)); }
.pchart-dot      { fill: var(--aqua-300); }
.pchart-dot-halo { stroke: var(--aqua-300); animation: aqua-pulse 2.2s ease-in-out infinite; }
/* draw-in (stroke length set per instance) */
.pchart-line.is-drawn { stroke-dasharray: var(--pchart-len);
  stroke-dashoffset: var(--pchart-len); animation: pchart-draw var(--dur-stage) var(--ease-glide) forwards; }
@keyframes pchart-draw { to { stroke-dashoffset: 0; } }
@media (prefers-reduced-motion: reduce) {
  .pchart-line.is-drawn { animation: none; stroke-dashoffset: 0; }
  .pchart-dot-halo { animation: none; }
}`;

const CARD_TSX = `// MarketCard — YES probability is the hero.
export function MarketCard({ market }: { market: Market }) {
  return (
    <article className="mcard">
      <header className="mcard-top">
        {market.live ? <Chip kind="live">LIVE</Chip> : <Chip>Open · Wazi</Chip>}
        <Chip className="mcard-cat">{market.category}</Chip>
      </header>

      <h3 className="mcard-q">{market.question}</h3>
      <p className="mcard-q-sw">{market.questionSw}</p>

      {/* hero: giant YES%, 24h move, sparkline */}
      <div className="mcard-hero">
        <div>
          <span className="mcard-pct-label">YES · Ndio</span>
          <span className="mcard-pct">{market.yes}<span className="unit">%</span></span>
        </div>
        <MoveChip move={market.move24h} />          {/* ▲/▼ line-art, +/-pt */}
        <Sparkline data={market.series["1W"].map(d => d.p)} />
      </div>

      <TippingBar yesPct={market.yes} height={22} />  {/* kept, unchanged */}

      <div className="mcard-actions">
        <Button variant="yes" size="lg" trailing={market.yes}>YES</Button>
        <Button variant="no"  size="lg" trailing={100 - market.yes}>NO</Button>
      </div>
      <footer className="mcard-meta">{market.volume} vol · {market.traders} traders</footer>
    </article>
  );
}`;

const DETAIL_TSX = `// MarketDetail — calm trading terminal. Two columns; rail sticks.
export function MarketDetail({ market }: { market: Market }) {
  return (
    <div className="mterm">
      <main className="mterm-main">
        <QuestionHeader market={market} />               {/* question → */}
        <Panel>
          <HeroRow yes={market.yes} move={market.move24h} />  {/* big % */}
          <ProbabilityChart series={market.series} />         {/* chart */}
          <TippingBar yesPct={market.yes} />
        </Panel>
        <Panel title="Two-sided pool · Dimbwi">
          <Pool yes={market.poolYes} no={market.poolNo} />     {/* pool */}
        </Panel>
        <Panel title="Discussion · Mjadala"><Comments /></Panel> {/* slot */}
        <TrustStrip />                                          {/* trust */}
      </main>
      <aside className="mterm-rail">
        <BetTicket market={market} />                    {/* bet +    */}
        <PositionPanel pos={market.position} />          {/* P&L rail */}
      </aside>
    </div>
  );
}`;

/* ── App ─────────────────────────────────────────────────────────────────── */
function App() {
  const { detail, cards } = window.MARKET_DATA;
  return (
    <div className="lab-shell">
      <nav className="lab-nav" aria-label="Sections">
        <div className="lab-nav-brand"><FiftyMark size={34} /><span style={{ fontFamily: "var(--font-display)", fontWeight: 700, letterSpacing: "-0.02em" }}>Market surfaces</span></div>
        <div className="lab-nav-links">
          <a className="lab-nav-link" href="#overview"><span className="lab-nav-num">00</span><span className="txt">Overview</span></a>
          <a className="lab-nav-link" href="#chart"><span className="lab-nav-num">01</span><span className="txt">Probability chart</span></a>
          <a className="lab-nav-link" href="#card"><span className="lab-nav-num">02</span><span className="txt">Market card</span></a>
          <a className="lab-nav-link" href="#detail"><span className="lab-nav-num">03</span><span className="txt">Detail terminal</span></a>
        </div>
        <div className="lab-nav-status"><span className="lab-status-dot lab-status-on" />Built on <b>/kit</b> tokens only · OKLCH · EN·SW</div>
      </nav>

      <main className="lab-main">
        <div className="lab-wrap">

          {/* Overview */}
          <section id="overview" className="lab-section" data-screen-label="Overview" style={{ borderTop: "none", paddingTop: 0 }}>
            <div className="lab-hero">
              <div className="lab-hero-mark"><FiftyMark size={220} /></div>
              <p className="gilt-eyebrow">50pick · Kipindi — surface design</p>
              <h1 className="display">Market card, detail terminal &amp; the probability chart</h1>
              <p>Three trading surfaces, recomposed to make the <b>YES probability the hero</b> and the page feel like a calm trading terminal — built entirely on the kit you ship. No new colours, fonts, radii, shadows, or motion tokens. YES stays emerald (152), NO stays rose (22), the gilt soloist stays the one accent, and the <b>TippingBar</b> is retained on every surface.</p>
              <div className="lab-hero-meta">
                <span className="chip chip-resolved">Tokens only</span>
                <span className="chip">EN · SW bilingual</span>
                <span className="chip chip-signal">60fps · transform/opacity</span>
                <span className="chip">Reduced-motion branch</span>
              </div>
            </div>

            <div className="lab-grid lab-grid-2" style={{ marginTop: 24 }}>
              <div className="lab-card">
                <p className="gilt-eyebrow">The signature idea</p>
                <p className="lab-lead" style={{ fontSize: 14.5, marginTop: 10 }}>
                  Every surface reads off one motif — <b>the tipping line</b>. The 50% mark is drawn as a gilt
                  dashed reference (the same "tipping" language as <code className="mono-tag">TippingBar</code>);
                  the probability area fills <span style={{ color: "var(--yes-300)" }}>emerald above</span> it and
                  <span style={{ color: "var(--no-300)" }}> rose below</span>; the live point is an aqua
                  <code className="mono-tag"> SignalPip</code>. It scales from a 680px chart down to a 72px sparkline.
                </p>
              </div>
              <NoteCard items={[
                "No new colour palettes, fonts, radii, or shadow scales — every value resolves to an existing OKLCH token.",
                "YES = <b>--yes-*</b> (emerald 152) / NO = <b>--no-*</b> (rose 22), untouched and never swapped.",
                "Gilt is the only accent; aqua used ≤8% as the live-point finishing pass per kit rule.",
                "<b>TippingBar</b> is reused verbatim on card + detail; no parallel probability widget.",
                "All motion reuses kit easings/durations and ships a <code class='mono-tag'>prefers-reduced-motion</code> branch.",
              ]} />
            </div>
          </section>

          {/* 01 · Probability chart */}
          <Section id="chart" num="Surface 01" title="Probability chart"
            lead="A probability-over-time chart with a signature on-theme treatment, plus a micro sparkline variant for cards and rows. Hover the chart for a crosshair readout; switch ranges to watch the line redraw.">
            <div className="lab-card" style={{ marginTop: 22 }}>
              <ProbabilityChart series={detail.series} defaultRange="1M" width={760} height={300} />
            </div>

            <div className="lab-subhead">Sparkline variant <span className="mono-tag">72×26 → inline</span></div>
            <div className="lab-card lab-card-tight">
              <div style={{ display: "flex", flexWrap: "wrap", gap: 28, alignItems: "center" }}>
                {cards.map((c) => (
                  <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <Sparkline data={c.series["1W"].map((d) => d.p)} width={84} height={30} />
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: c.yes >= 50 ? "var(--yes-300)" : "var(--no-300)" }}>{c.yes}%</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="lab-subhead">Anatomy</div>
            <div className="lab-card lab-card-tight">
              <SpecTable rows={[
                { part: "Tipping line (50%)", behaviour: "Gilt dashed hairline — the brand pivot. Labelled “TIPPING · 50”. The fixed reference every series is read against.", tokens: ["--gilt", "--r-pill"] },
                { part: "Two-tone area", behaviour: "Single area path between line and baseline, clipped by two half-planes: emerald fill above 50, rose fill below 50. Echoes the TippingBar lean.", tokens: ["--yes-500", "--no-500"] },
                { part: "YES line", behaviour: "Soft-glow emerald stroke — the headline metric of every market is YES. Draws in on mount via stroke-dashoffset.", tokens: ["--yes-400", "--dur-stage", "--ease-glide"] },
                { part: "Live point", behaviour: "Aqua SignalPip + pulsing halo at the latest value, with a gilt value flag. Aqua = finishing pass only.", tokens: ["--aqua-300", "--gilt"] },
                { part: "Range tabs", behaviour: "1D · 1W · 1M · ALL. Active pill is gilt — reuses the kit gold-underline treatment.", tokens: ["--gilt", "--gold-fg"] },
                { part: "Hover crosshair", behaviour: "Dashed royal vertical + gilt dot + mono readout (date · YES% · lean). Opacity-only, snaps under reduced-motion.", tokens: ["--border-royal", "--ease-micro"] },
              ]} />
            </div>

            <div className="code-drawer" style={{ marginTop: 20 }} />
            <CodeBlock label="components/ProbabilityChart.tsx" code={CHART_TSX} />
            <CodeBlock label="globals.css — additions" code={CHART_CSS} />
            <NoteCard items={[
              "Line is emerald YES only — no third “neutral” colour invented; the rose lives only in the sub-50 area fill.",
              "Draw-in uses <code class='mono-tag'>stroke-dashoffset</code> (not width/height) → 60fps, and snaps to full under reduced-motion.",
              "Gridlines use <code class='mono-tag'>--border</code>; axes use <code class='mono-tag'>--text-subtle</code>; figures in <code class='mono-tag'>--font-mono</code>. No new type sizes.",
            ]} />
          </Section>

          {/* 02 · Market card */}
          <Section id="card" num="Surface 02" title="Market card"
            lead="The feed card, recomposed so the YES probability is unmistakably the hero — a 56px Sora figure with a ▲/▼ 24-hour move and a micro sparkline — while keeping our TippingBar as the two-sided read beneath.">
            <div className="lab-grid lab-grid-2" style={{ marginTop: 22, alignItems: "start" }}>
              {cards.map((c) => <MarketCard key={c.id} market={c} />)}
            </div>

            <div className="lab-subhead">Anatomy</div>
            <div className="lab-card lab-card-tight">
              <SpecTable rows={[
                { part: "Hero YES%", behaviour: "56px Sora display, emerald, tabular-nums, with a small “%” unit. The single largest element on the card.", tokens: ["--font-display", "--yes-300", "--type-h3"] },
                { part: "Move chip", behaviour: "Line-art ▲/▼ (no emoji) + signed point change. Emerald up / rose down / muted flat. 24h delta.", tokens: ["--yes-500", "--no-500", "--r-pill"] },
                { part: "Sparkline", behaviour: "The chart’s micro variant — quick shape-of-the-week read, coloured by current lean.", tokens: ["--yes-400", "--no-400"] },
                { part: "TippingBar", behaviour: "Retained verbatim — the two-sided YES/NO split with the tilting gilt needle. Hover recasts.", tokens: ["--bar-needle", "--bar-track"] },
                { part: "Actions", behaviour: "Kit Button yes / no at size lg, each trailing its implied probability.", tokens: [".btn-yes", ".btn-no", "--r-md"] },
              ]} />
            </div>
            <CodeBlock label="components/MarketCard.tsx" code={CARD_TSX} />
            <NoteCard items={[
              "Hero number is emerald <code class='mono-tag'>--yes-300</code>; the card never invents a brand-coloured headline number.",
              "Move arrows are inline line-art (<code class='mono-tag'>stroke=currentColor</code>) — consistent with the EmptyState icon style, no emoji.",
              "TippingBar is the kit component as-is — card adds no second probability bar.",
            ]} />
          </Section>

          {/* 03 · Market detail */}
          <Section id="detail" num="Surface 03" title="Market detail — trading terminal"
            lead="The detail page, recomposed as a calm terminal: question → big % + prominent probability chart → two-sided pool → a bet / position-P&L rail → comments slot → trust strip. The rail sticks on desktop and stacks under the chart on mobile.">
            <div className="lab-card" style={{ marginTop: 22, padding: "var(--sp-6)" }}>
              <MarketDetail market={detail} />
            </div>

            <div className="lab-subhead">Composition</div>
            <div className="lab-card lab-card-tight">
              <SpecTable rows={[
                { part: "Question", behaviour: "h1 Sora + italic SW translation, with category chip, LIVE pill, and close date. The calm anchor at the top.", tokens: ["--type-h1", "--font-display"] },
                { part: "Big % + chart", behaviour: "44px display % and 24h move sit above the prominent ProbabilityChart; TippingBar restates the split beneath.", tokens: ["--type-display-2", "--yes-300"] },
                { part: "Two-sided pool", behaviour: "Split panel — YES pool / NO pool in tinted emerald + rose surfaces with backer counts.", tokens: ["--yes-500", "--no-500", "--r-md"] },
                { part: "Bet rail", behaviour: "Sticky ticket: YES/NO tabs, TZS stake (kit input-group + quick chips), live shares / to-win, kit Button xl.", tokens: [".input-group", ".btn-yes", "--gilt"] },
                { part: "Position P&L", behaviour: "Your side, shares @ avg, value, and P&L coloured emerald/rose with % — plus a ghost cash-out.", tokens: ["--yes-300", "--no-300", "--font-mono"] },
                { part: "Comments slot", behaviour: "Threaded reads with Avatar + TierBadge + side tag, then a kit input-group composer.", tokens: [".avatar", ".tier-badge"] },
                { part: "Trust strip", behaviour: "Licence, two-officer resolution, on-chain audit, escrow — gilt line-art icons. The institutional footer.", tokens: ["--gilt", "--border"] },
              ]} />
            </div>
            <CodeBlock label="pages/MarketDetail.tsx" code={DETAIL_TSX} />
            <NoteCard items={[
              "Layout is a 2-column CSS grid collapsing to one column ≤880px — no new breakpoints beyond the kit’s mobile-first rhythm.",
              "Pool / P&L tints are <code class='mono-tag'>color-mix</code> of <code class='mono-tag'>--yes-500</code>/<code class='mono-tag'>--no-500</code> into the elevated surface — no new fills.",
              "Trust-strip icons follow the EmptyState line-art style (teal stroke, gilt accent); claret is reserved and unused here.",
              "Every reused atom — Button, TippingBar, Avatar, TierBadge, input-group — is the kit component unchanged.",
            ]} />
          </Section>

        </div>
      </main>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
