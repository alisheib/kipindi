/* 50pick — IDENTITY SPRINT · brand book composition. */
const { useState: useSp } = React;

/* ---------- sample data ---------- */
const spk = (n, drift) => Array.from({ length: n }, (_, i) => Math.max(8, Math.min(92, Math.round(50 + Math.sin(i / 2) * 8 + (i - n / 2) * drift + (i % 3) * 3))));
const SEEDS = ["amani-juma-7781", "neema-mushi-2210", "baraka-kessy-5530", "zainab-omary-9043", "frank-mwakatobe-1187", "halima-said-3320", "juma-r-2841", "asha-m-6610", "deo-k-4417", "rehema-s-9921", "salim-b-3382", "grace-n-7740"];

const CARDS = [
  { id: "c1", titleEn: "Will Yanga win the 2025/26 Ligi Kuu Bara title?", titleSw: "Je, Yanga watatwaa ubingwa wa Ligi Kuu Bara?", category: "Sports · Michezo", catIcon: "football", yesPct: 58, volume: 41200, predictors: 612, timeLeft: "121d", spark: spk(16, 0.9), move24h: 4, signal: { kind: "hot", label: "Hot" }, traders: SEEDS.slice(0, 3) },
  { id: "c2", titleEn: "Will USD/TZS close above 2,700 by 31 December?", titleSw: "Je, USD/TZS itafunga juu ya 2,700 ifikapo Des 31?", category: "Forex · Fedha", catIcon: "forex", yesPct: 47, volume: 28800, predictors: 388, timeLeft: "212d", spark: spk(16, -0.4), move24h: -2, signal: { kind: "tipping", label: "Tipping" }, traders: SEEDS.slice(3, 6) },
  { id: "c3", titleEn: "Will the 2025/26 national budget pass before October?", titleSw: "Je, bajeti ya taifa itapita kabla ya Oktoba?", category: "Politics · Siasa", catIcon: "politics", yesPct: 64, volume: 33100, predictors: 421, timeLeft: "47m", status: "SOON", spark: spk(16, 0.5), move24h: 1, signal: { kind: "soon", label: "Ending soon" }, traders: SEEDS.slice(6, 9) },
  { id: "c4", titleEn: "Will Dar es Salaam exceed 150 mm of rain this week?", titleSw: "Je, Dar itapata zaidi ya mm 150 za mvua wiki hii?", category: "Weather · Hali ya hewa", catIcon: "weather", yesPct: 73, volume: 9400, predictors: 142, timeLeft: "3d", spark: spk(16, 1.4), move24h: 9, traders: SEEDS.slice(2, 5) },
  { id: "c5", titleEn: "Will Tanzania's 2025 GDP growth exceed 5.5%?", titleSw: "Je, ukuaji wa Pato la Taifa utazidi 5.5%?", category: "Economy · Uchumi", catIcon: "economy", yesPct: 52, volume: 22600, predictors: 274, timeLeft: "168d", spark: spk(16, 0.2), move24h: 3, signal: { kind: "tipping", label: "Tipping" }, traders: SEEDS.slice(7, 10) },
  { id: "c6", titleEn: "Did Simba SC reach the CAF Champions League group stage?", titleSw: "Je, Simba walifika hatua ya makundi CAF?", category: "Sports · Michezo", catIcon: "football", yesPct: 81, volume: 37500, predictors: 503, timeLeft: "Closed", status: "RESOLVED", spark: spk(16, 1.1), traders: SEEDS.slice(1, 4) },
];

const ICON_GROUPS = [
  { label: "Categories · Aina", names: ["football", "politics", "forex", "weather", "economy", "crypto", "entertainment", "tech"] },
  { label: "Actions · Vitendo", names: ["trade", "watch", "share", "comment", "bell", "search", "filter", "plus"] },
  { label: "Navigation · Urambazaji", names: ["home", "markets", "portfolio", "trophy", "profile", "wallet", "bolt", "shieldcheck"] },
  { label: "Status · Hali", names: ["live", "tipping", "hot", "soon", "resolved", "void", "crown", "sparkle"] },
];

/* ---------- atoms ---------- */
function Sec({ no, title, note, id, children, action }) {
  return (
    <section className="book-section" id={id}>
      <div className="bsec-head">
        <div>
          <div className="bsec-no">{no}</div>
          <h2 className="bsec-title">{title}</h2>
        </div>
        {action}
      </div>
      {note && <p className="bsec-note" style={{ marginTop: 14 }}>{note}</p>}
      <div style={{ marginTop: 26 }}>{children}</div>
    </section>
  );
}

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "seedNonce": 0,
  "memberTier": "sovereign",
  "shareYes": 58
}/*EDITMODE-END*/;

function Sprint() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const sN = (s) => s + "::" + t.seedNonce;

  return (
    <div className="book">
      <div className="book-wrap">

        {/* COVER */}
        <header className="cover">
          <div className="cover-grid" />
          <div className="cover-inner">
            <div className="cover-copy">
              <div className="cover-eyebrow">50pick · Kipindi — identity sprint</div>
              <h1 className="cover-h1">A sovereign mark for the <span className="em">people's</span> market.</h1>
              <p className="cover-lede">The full identity system for Tanzania's prediction market — <b>logo, colour, type, a custom icon family, generative crest avatars, the maxed-out market card</b>, and the surfaces around it: membership, app, share, push, coin and seals. One royal axis, gilt as the soloist, the <b>TippingBar</b> as the verb. Bilingual EN · SW throughout.</p>
              <div className="cover-tags">
                <span className="cover-tag">OKLCH · on-token</span>
                <span className="cover-tag">Sora · Inter · JetBrains Mono</span>
                <span className="cover-tag">Generative & deterministic</span>
                <span className="cover-tag">Reduced-motion safe</span>
              </div>
            </div>
            <div className="cover-mark"><FiftyMark size={188} /></div>
          </div>
        </header>

        {/* NAV */}
        <nav className="booknav">
          {[["01", "Logo", "logo"], ["02", "Colour", "colour"], ["03", "Type", "type"], ["04", "Icons", "icons"], ["05", "Avatars", "avatars"], ["06", "Market card", "card"], ["07", "Surfaces", "surfaces"]].map(([n, l, h]) => (
            <a key={h} href={`#${h}`}>{n} · {l}</a>
          ))}
        </nav>

        {/* 01 LOGO */}
        <Sec no="01" id="logo" title="The mark & lockups" note={<>The <b>FiftyMark</b> — a tilted YES·NO disc with the <span className="g">50</span> riding the divider, the tipping metaphor frozen into a sigil. It locks up horizontally, stacks, and reduces to a monogram.</>}>
          <div className="grid-auto cols-2">
            <div className="tile tile-pad">
              <div className="tile-label" style={{ marginBottom: 16 }}><b>Primary lockup</b> — horizontal</div>
              <div className="stage" style={{ minHeight: 150 }}><LockupH size={34} /></div>
            </div>
            <div className="tile tile-pad">
              <div className="tile-label" style={{ marginBottom: 16 }}><b>Stacked</b> — vertical / square spaces</div>
              <div className="stage" style={{ minHeight: 150 }}><LockupStack size={24} /></div>
            </div>
          </div>
          <div className="grid-auto cols-3" style={{ marginTop: 20 }}>
            <div className="tile tile-pad">
              <div className="tile-label" style={{ marginBottom: 14 }}><b>Monogram</b></div>
              <div className="stage" style={{ minHeight: 130 }}><FiftyMark size={92} /></div>
            </div>
            <div className="tile tile-pad">
              <div className="tile-label" style={{ marginBottom: 14 }}><b>On grounds</b> — clearspace + contrast</div>
              <div className="ground-row" style={{ justifyContent: "center" }}>
                <span className="ground g-royal"><FiftyMark size={56} /></span>
                <span className="ground g-gilt"><FiftyMark size={56} mono /></span>
                <span className="ground g-pearl"><FiftyMark size={56} mono /></span>
              </div>
            </div>
            <div className="tile tile-pad">
              <div className="tile-label" style={{ marginBottom: 14 }}><b>Reversed / mono</b></div>
              <div className="ground-row" style={{ justifyContent: "center" }}>
                <span className="ground g-elev" style={{ color: "var(--pearl-50)" }}><FiftyMark size={56} mono inverted /></span>
                <span className="ground g-yes"><FiftyMark size={56} mono inverted /></span>
                <span className="ground g-no"><FiftyMark size={56} mono inverted /></span>
              </div>
            </div>
          </div>
        </Sec>

        {/* 02 COLOUR */}
        <Sec no="02" id="colour" title="Colour — the royal axis" note={<>A deep-indigo canvas (hue <span className="g">268</span>) with <b>gilt</b> as the single ceremonial accent, and a disciplined <b>YES emerald / NO rose</b> money pair. Every value is OKLCH.</>}>
          <div className="grid-auto cols-4">
            <Swatch name="Royal canvas" token="--bg" color="var(--bg)" />
            <Swatch name="Royal elevated" token="--bg-elevated" color="var(--bg-elevated)" />
            <Swatch name="Gilt" token="--gilt" color="var(--gilt)" />
            <Swatch name="Gold" token="--gold-500" color="var(--gold-500)" />
            <Swatch name="YES emerald" token="--yes-500" color="var(--yes-500)" />
            <Swatch name="NO rose" token="--no-500" color="var(--no-500)" />
            <Swatch name="Aqua signal" token="--aqua-300" color="var(--aqua-300)" />
            <Swatch name="Pearl ink" token="--pearl-50" color="var(--pearl-50)" />
          </div>
          <div className="grid-auto cols-2" style={{ marginTop: 22 }}>
            <Ramp label="Royal axis · hue 268" stops={[{ c: "oklch(15% 0.13 268)", l: "15" }, { c: "oklch(22% 0.14 268)", l: "22" }, { c: "oklch(30% 0.165 268)", l: "30" }, { c: "oklch(48% 0.20 268)", l: "48" }, { c: "oklch(64% 0.15 268)", l: "64" }, { c: "oklch(86% 0.04 268)", l: "86" }]} />
            <Ramp label="Gilt / gold · hue 80" stops={[{ c: "oklch(40% 0.10 78)", l: "40" }, { c: "oklch(56% 0.12 78)", l: "56" }, { c: "oklch(70% 0.13 80)", l: "70" }, { c: "oklch(80% 0.14 80)", l: "80" }, { c: "oklch(86% 0.13 82)", l: "86" }, { c: "oklch(94% 0.08 88)", l: "94" }]} />
            <Ramp label="YES emerald · hue 152" stops={[{ c: "oklch(40% 0.10 152)", l: "40" }, { c: "oklch(50% 0.14 152)", l: "50" }, { c: "oklch(58% 0.16 152)", l: "58" }, { c: "oklch(68% 0.15 152)", l: "68" }, { c: "oklch(78% 0.12 152)", l: "78" }, { c: "oklch(88% 0.08 152)", l: "88" }]} />
            <Ramp label="NO rose · hue 22" stops={[{ c: "oklch(40% 0.12 22)", l: "40" }, { c: "oklch(52% 0.16 22)", l: "52" }, { c: "oklch(60% 0.18 22)", l: "60" }, { c: "oklch(70% 0.16 22)", l: "70" }, { c: "oklch(80% 0.12 22)", l: "80" }, { c: "oklch(90% 0.07 22)", l: "90" }]} />
          </div>
        </Sec>

        {/* 03 TYPE */}
        <Sec no="03" id="type" title="Type system" note={<><b>Sora</b> carries display & numbers (geometric, confident), <b>Inter</b> the body, <b>JetBrains Mono</b> every odd, percentage and timestamp — tabular numerals are non-negotiable on a market.</>}>
          <div className="tile tile-pad">
            <div className="type-spec"><div className="type-key"><b>Sora</b>Display · 800</div><div className="type-sample" style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 40, letterSpacing: "-0.03em", lineHeight: 1.05 }}>Set the line.</div></div>
            <div className="type-spec"><div className="type-key"><b>Inter</b>Body · 400/600</div><div className="type-sample" style={{ fontFamily: "var(--font-body)", fontSize: 17, lineHeight: 1.5, color: "var(--text-muted)" }}>Predict Tanzania — football, the shilling, the budget, the rains. <b style={{ color: "var(--text)" }}>Back your read.</b></div></div>
            <div className="type-spec"><div className="type-key"><b>JetBrains Mono</b>Numeric · 600</div><div className="type-sample mono" style={{ fontSize: 22, color: "var(--gilt)", letterSpacing: "0.02em" }}>58% · TZS 41,200 · 121d · +4pt</div></div>
            <div className="type-spec"><div className="type-key">Glyphs</div><div className="glyphs">Aa Gg 50 · % ▲▼ ↑↓</div></div>
          </div>
        </Sec>

        {/* 04 ICONS */}
        <Sec no="04" id="icons" title="Iconography" note={<>A single hand-built family on a <b>24px grid, 1.9 stroke, round joins</b> — drawn to feel engraved, not generic. Categories, actions, nav and market status, with a gilt pill treatment for emphasis.</>}>
          {ICON_GROUPS.map((grp) => (
            <div key={grp.label} style={{ marginBottom: 22 }}>
              <div className="tile-label" style={{ marginBottom: 10 }}>{grp.label}</div>
              <div className="icon-grid">
                {grp.names.map((nm) => { const C = I[nm]; return <div className="icon-cell" key={nm}><C /><span className="nm">{nm}</span></div>; })}
              </div>
            </div>
          ))}
          <div className="tile-label" style={{ margin: "6px 0 10px" }}>Gilt treatment — chips & emphasis</div>
          <div className="icon-featured">
            <span className="icon-pill"><I.trophy s={18} /> Leaderboard</span>
            <span className="icon-pill"><I.crown s={18} /> Sovereign</span>
            <span className="icon-pill"><I.tipping s={18} /> Tipping</span>
            <span className="icon-pill"><I.bolt s={18} /> Fast market</span>
            <span className="icon-pill"><I.shieldcheck s={18} /> Verified</span>
          </div>
        </Sec>

        {/* 05 AVATARS */}
        <Sec no="05" id="avatars" title="Generative crest avatars" note={<>Every account gets a deterministic <b>Tipping Sigil</b> crest — the brand mark, personalised. The same person is the same crest everywhere, legible from 80px to 20px, with a tier ring and photo fallback.</>}
          action={<button className="reseed" onClick={() => setTweak("seedNonce", t.seedNonce + 1)}><I.sparkle s={13} /> Reseed · zalisha upya</button>}>
          <div className="tile tile-pad">
            <div className="tile-label" style={{ marginBottom: 16 }}><b>The wall</b> — twelve accounts, one generator</div>
            <div className="av-wall">
              {SEEDS.map((s, i) => (
                <div className="crest-scale" key={s}>
                  <IdentityAvatar seed={sN(s)} size={62} kind="tipping" tier={["sovereign", "diamond", "gold", "silver", "bronze"][i % 5]} ring src={i === 4 ? "assets/portrait-placeholder.png" : undefined} />
                  <span className="sz">{["sovereign", "diamond", "gold", "silver", "bronze"][i % 5]}{i === 4 ? " · photo" : ""}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="grid-auto cols-2" style={{ marginTop: 20 }}>
            <div className="tile tile-pad">
              <div className="tile-label" style={{ marginBottom: 16 }}><b>Scales</b> — 80 / 40 / 20px</div>
              <div className="stage" style={{ gap: 28, gridAutoFlow: "column", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
                {[80, 40, 20].map((s) => <div className="crest-scale" key={s}><IdentityAvatar seed={sN(SEEDS[0])} size={s} kind="tipping" /><span className="sz">{s}px</span></div>)}
              </div>
            </div>
            <div className="tile tile-pad">
              <div className="tile-label" style={{ marginBottom: 16 }}><b>In context</b> — comment thread, 26px</div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                {[{ s: SEEDS[1], n: "Neema Mushi", side: "yes", x: "Yanga's depth is unmatched. Backing YES." }, { s: SEEDS[3], n: "Zainab Omary", side: "no", x: "Budget never passes on time. Easy NO." }, { s: SEEDS[8], n: "Deo K.", side: "yes", x: "Rains came early — 150mm is nothing." }].map((c, i) => (
                  <div className="id-comment" key={i}>
                    <IdentityAvatar seed={sN(c.s)} size={26} kind="tipping" />
                    <div className="id-comment-body"><div className="id-comment-head"><span className="id-comment-name">{c.n}</span><span className={`comment-side comment-side-${c.side}`}>{c.side.toUpperCase()}</span></div><div className="id-comment-text">{c.x}</div></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Sec>

        {/* 06 MARKET CARD */}
        <Sec no="06" id="card" title="The market card — refined to maximum" note={<>The product's atom, maxed out: a gilt hairline frame, a category sigil, number-as-hero with its sparkline, the live <b>trader crest-stack</b> (identity woven in), the <b>TippingBar</b> with its hover-recast, and a faint heraldic shield. Grid only — built to tile.</>}>
          <div className="grid-auto cols-3">
            {CARDS.map((m) => <MarketCardPro key={m.id} m={{ ...m, traders: m.traders.map(sN) }} />)}
          </div>
        </Sec>

        {/* 07 SURFACES */}
        <Sec no="07" id="surfaces" title="Brand surfaces" note={<>Identity carried into everything around the platform — including things that don't exist yet but should. All generated from the same tokens and primitives.</>}
          action={<div style={{ display: "flex", gap: 10, alignItems: "center" }}><select className="input" style={{ height: 34, padding: "0 10px", fontSize: 12 }} value={t.memberTier} onChange={(e) => setTweak("memberTier", e.target.value)}><option value="sovereign">Sovereign</option><option value="diamond">Diamond</option><option value="gold">Gold</option></select></div>}>

          {/* membership + springboard */}
          <div className="grid-auto cols-2">
            <div className="tile tile-pad">
              <div className="tile-label" style={{ marginBottom: 16 }}><b>Sovereign membership card</b> — guilloché, gilt foil, your crest</div>
              <MembershipCard tier={t.memberTier.toUpperCase()} seed={sN(SEEDS[0])} />
            </div>
            <div className="tile tile-pad">
              <div className="tile-label" style={{ marginBottom: 16 }}><b>App icon</b> — on the home screen</div>
              <div className="stage" style={{ background: "none", border: "none", padding: 0 }}><Springboard /></div>
            </div>
          </div>

          {/* share card */}
          <div className="tile tile-pad" style={{ marginTop: 20 }}>
            <div className="tile-label" style={{ marginBottom: 16 }}><b>Social share card</b> — the unit that travels to WhatsApp & X</div>
            <ShareCard yesPct={t.shareYes} />
          </div>

          {/* push + coins */}
          <div className="grid-auto cols-2" style={{ marginTop: 20 }}>
            <div className="tile tile-pad">
              <div className="tile-label" style={{ marginBottom: 16 }}><b>Push notification</b> — the tipping alert</div>
              <Lockscreen>
                <PushNotif />
                <PushNotif title="Market resolved · Soko limefungwa" text="Simba reached the CAF group stage — you won TZS 1,800." time="14m" />
              </Lockscreen>
            </div>
            <div className="tile tile-pad">
              <div className="tile-label" style={{ marginBottom: 16 }}><b>Prediction coin</b> — “Pesa” credits</div>
              <div className="stage" style={{ minHeight: 200 }}>
                <div className="coin-row">
                  <div className="coin-spec"><Coin size={108} denom="50" /><span className="cap">50 Pesa</span></div>
                  <div className="coin-spec"><Coin size={78} denom="10" /><span className="cap">10 Pesa</span></div>
                  <div className="coin-spec"><Coin size={62} denom="5" /><span className="cap">5 Pesa</span></div>
                </div>
              </div>
            </div>
          </div>

          {/* achievement seals */}
          <div className="tile tile-pad" style={{ marginTop: 20 }}>
            <div className="tile-label" style={{ marginBottom: 18 }}><b>Achievement seals</b> — earned status, heraldic wax-medallion style</div>
            <div className="seal-row" style={{ justifyContent: "space-between" }}>
              <SealCard emblem="sparkle" title="First Pick" sub="Kupiga kura kwanza" />
              <SealCard emblem="flame2" title="10-Streak" sub="Mfululizo wa 10" />
              <SealCard emblem="tipping" title="Tipping Point" sub="Called it at 50/50" />
              <SealCard emblem="trophy" title="Top Predictor" sub="Mtabiri bora" />
              <SealCard emblem="crown" title="Sovereign" sub="Locked · imefungwa" locked />
            </div>
          </div>

          {/* splash + empty */}
          <div className="grid-auto cols-2" style={{ marginTop: 20 }}>
            <div className="tile tile-pad">
              <div className="tile-label" style={{ marginBottom: 16 }}><b>Splash / loading</b></div>
              <Splash />
            </div>
            <div className="tile tile-pad">
              <div className="tile-label" style={{ marginBottom: 16 }}><b>Empty state</b></div>
              <EmptyState />
            </div>
          </div>
        </Sec>

        {/* token note */}
        <Sec no="—" id="tokens" title="On the system" note="Everything above is one closed system.">
          <div className="grid-auto cols-3">
            <div className="tile tile-pad note">No new colours, fonts, radii, shadow scales or motion tokens were introduced. Every value resolves to an existing OKLCH ramp — royal <code>268</code>, gilt <code>80</code>, yes <code>152</code>, no <code>22</code>.</div>
            <div className="tile tile-pad note">Avatars, crests, the membership guilloché and coins are <b style={{ color: "var(--text)" }}>generative</b> from one deterministic seed (<code>hashSeed → mulberry32</code>) — the same account renders identically everywhere.</div>
            <div className="tile tile-pad note">All motion ships a <code>prefers-reduced-motion</code> branch; the card, share unit and seals render fully static for print, PDF and export.</div>
          </div>
          <footer style={{ marginTop: 40, paddingTop: 22, borderTop: "1px solid var(--border)", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 14, color: "var(--text-subtle)", fontFamily: "var(--font-mono)", fontSize: 11 }}>
            <span>50pick · Kipindi — identity sprint · on-token · OKLCH · bilingual EN · SW</span>
            <span>Tweaks ⚙ · reseed identity · membership tier · share %</span>
          </footer>
        </Sec>
      </div>

      <TweaksPanel>
        <TweakSection label="Identity" />
        <TweakButton label="Reseed all crests" onClick={() => setTweak("seedNonce", t.seedNonce + 1)} />
        <TweakSection label="Surfaces" />
        <TweakSelect label="Membership tier" value={t.memberTier} options={["sovereign", "diamond", "gold"]} onChange={(v) => setTweak("memberTier", v)} />
        <TweakSlider label="Share card YES %" value={t.shareYes} min={1} max={99} step={1} unit="%" onChange={(v) => setTweak("shareYes", v)} />
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<Sprint />);
