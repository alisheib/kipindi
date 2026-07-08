#!/usr/bin/env python3
# Build specimens/50pick-micro-board.html from the sources of truth.
import importlib.util
def load(p,n):
    s=importlib.util.spec_from_file_location(n,p); m=importlib.util.module_from_spec(s); s.loader.exec_module(m); return m
gg = load("/home/claude/design-out/gen_glyphs.py","gg")
gb = load("/home/claude/design-out/gen_badges.py","gb")
css = open("/home/claude/design-out/micro-patterns.css").read()

def g(name, size=16, sw=1.9, color="currentColor"):
    inner = next(s for n,c,s,d in gg.G24 if n==name)
    return (f'<svg viewBox="0 0 24 24" width="{size}" height="{size}" fill="none" stroke="{color}" '
            f'stroke-width="{sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{inner}</svg>')
def badge(name, size=48):
    inner = next(i for n,i,d in gb.BADGES if n==name)
    return (f'<svg viewBox="0 0 48 48" width="{size}" height="{size}" fill="none" stroke="currentColor" '
            f'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{inner}</svg>')

check = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7"/></svg>'
chevD = '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9.5l6 6 6-6"/></svg>'
searchG = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="M16.2 16.2 21 21"/></svg>'
upG = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M6 11l6-6 6 6"/></svg>'
xG = '<svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M5 5l14 14M19 5L5 19"/></svg>'
infoG='<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><circle cx="12" cy="12" r="8.6"/><path d="M12 11v5"/><circle cx="12" cy="7.8" r=".9" fill="currentColor" stroke="none"/></svg>'

BADGE_META=[("tier-1-bronze","Tier I"),("tier-2-silver","Tier II"),("tier-3-gold","Tier III"),
 ("tier-4-platinum","Tier IV"),("tier-5-sovereign","Tier V"),("streak-3","3-streak"),
 ("streak-5","5-streak"),("streak-10","10-streak"),("proposer","Proposer"),
 ("centurion","Centurion"),("founder","Founder"),("verified","Verified")]
badges_html="".join(
 f'<div class="bcell{" locked" if n in ("tier-4-platinum","centurion") else ""}"><span class="bmed">{badge(n,44)}</span><div class="bn">{lbl}</div></div>'
 for n,lbl in BADGE_META)

LEDGER=[
 ("arrowDown","dep","Deposit · M-Pesa","DP-260707-8241","+ TZS 50,000","TZS 150,000","#00A24F"),
 ("target","stk","Stake · Simba SC wins NBC Premier League","ST-260707-8244","− TZS 20,000","TZS 130,000","#F5F8FF"),
 ("trophy","pay","Payout · Long rains begin before 15 Apr","PO-260706-1182","+ TZS 46,800","TZS 176,800","#FEC766"),
 ("percent","fee","Platform fee","FE-260706-1183","− TZS 1,200","TZS 175,600","#C8CBCF"),
 ("voidX","ref","Refund · USD/TZS market voided","RF-260705-0917","+ TZS 10,000","TZS 185,600","#C8CBCF"),
]
dep_glyph='<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M6.5 9.5 12 15l5.5-5.5"/><path d="M4.5 20.5h15"/></svg>'
trophy_glyph='<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>'
def lg(name):
    if name=="arrowDown": return dep_glyph
    if name=="trophy": return trophy_glyph
    return g(name,16)
ledger_rows="".join(f'''<div class="lrow50">
  <span class="lg" style="color:{col}">{lg(gl)}</span>
  <div class="lmain"><div class="lt">{title}</div><div class="lr">{ref} · 07 Jul, 09:41 EAT</div></div>
  <div class="lamt"><div class="la" style="color:{col}">{amt}</div><div class="lb">{bal}</div></div>
</div>''' for gl,_,title,ref,amt,bal,col in LEDGER)

html=f'''<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>50pick — Micro-Detail Board · Batch 2 (interaction layer)</title>
<link href="https://fonts.googleapis.com/css2?family=Sora:wght@500;600;700;800&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
{css}
/* board chrome + specimen-local styles */
*{{box-sizing:border-box;margin:0;padding:0}}
body{{background:#0A0E33;color:#F5F8FF;font-family:Inter,system-ui,sans-serif;font-size:15px;padding:48px 32px 96px;
background-image:radial-gradient(1200px 600px at 80% -10%,rgba(6,10,80,.7),transparent)}}
.wrap{{max-width:1180px;margin:0 auto}}
h1{{font-family:Sora,sans-serif;font-weight:700;font-size:27px;letter-spacing:-.02em}}
h2{{font-family:Sora,sans-serif;font-weight:600;font-size:19px;margin:10px 0 4px}}
.sub,.note{{color:#C8CBCF;font-size:13px;max-width:80ch}} .note{{margin-bottom:20px}}
section{{margin-top:60px}}
.state-label{{font:500 10px 'JetBrains Mono',monospace;letter-spacing:.12em;text-transform:uppercase;color:#C8CBCF;margin-bottom:8px}}
.row{{display:flex;gap:22px;flex-wrap:wrap;align-items:flex-start}}
.mono{{font-family:'JetBrains Mono',monospace;font-variant-numeric:tabular-nums}}
.panel{{background:#131645;border:1px solid rgba(245,248,255,.10);border-radius:14px;padding:18px}}
.btn50{{height:38px;padding:0 16px;border-radius:10px;border:none;font:600 14px Inter,sans-serif;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:8px}}
.btn50--gold{{background:linear-gradient(120deg,#FEC766,#D49824);color:#1a1508}}
.btn50--ghost{{background:transparent;border:1px solid rgba(245,248,255,.14);color:#F5F8FF}}
.btn50--primary{{background:#4983F4;color:#fff}}
.btn50--sm{{height:32px;padding:0 12px;font-size:13px}}
/* filter bar */
.searchbox{{display:flex;align-items:center;gap:10px;height:44px;padding:0 12px;background:rgba(245,248,255,.04);
border:1px solid rgba(245,248,255,.10);border-radius:10px;width:380px;color:#C8CBCF}}
.searchbox input{{background:none;border:none;color:#F5F8FF;font:400 14px Inter;flex:1;outline:none}}
/* menu open specimen */
.menuwrap{{position:relative;display:inline-block}}
.menuwrap .menu50{{position:absolute;top:44px;left:0}}
/* ledger */
.lrow50{{display:flex;align-items:center;gap:12px;padding:10px 4px;border-bottom:1px solid rgba(245,248,255,.06);cursor:pointer}}
.lrow50:hover{{background:rgba(245,248,255,.03)}}
.lg{{width:32px;height:32px;border-radius:50%;background:rgba(245,248,255,.05);display:inline-flex;align-items:center;justify-content:center;flex:none}}
.lmain{{flex:1;min-width:0}} .lt{{font-size:13.5px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}}
.lr{{font:400 10.5px 'JetBrains Mono',monospace;color:#C8CBCF;margin-top:2px}}
.lamt{{text-align:right}} .la{{font:600 13.5px 'JetBrains Mono',monospace}} .lb{{font:400 10.5px 'JetBrains Mono',monospace;color:#C8CBCF;margin-top:2px}}
/* receipt */
.receipt{{width:340px;background:#060A50;border:1px solid rgba(245,248,255,.12);border-radius:14px;padding:22px;position:relative;overflow:hidden}}
.perf{{border:none;border-top:1.5px dashed rgba(245,248,255,.18);margin:14px -22px}}
.rrow{{display:flex;justify-content:space-between;font-size:12.5px;color:#C8CBCF;margin-top:7px}}
.rrow b{{color:#F5F8FF;font-family:'JetBrains Mono',monospace;font-weight:600}}
.rseal{{position:absolute;top:16px;right:16px;width:40px;height:40px;border-radius:50%;border:1.5px solid #D49824;
color:#FEC766;display:flex;align-items:center;justify-content:center;transform:rotate(8deg);background:rgba(212,152,36,.06)}}
/* badges */
.bcell{{text-align:center;width:84px}}
.bmed{{display:inline-flex;width:64px;height:64px;border-radius:50%;background:rgba(212,152,36,.08);
color:#FEC766;align-items:center;justify-content:center}}
.bcell.locked .bmed{{color:rgba(200,203,207,.32);background:rgba(245,248,255,.04)}}
.bn{{font:500 10px 'JetBrains Mono',monospace;color:#C8CBCF;margin-top:6px;letter-spacing:.05em}}
.bcell.locked .bn::after{{content:" · 62/100";opacity:.6}}
/* tipping bar */
.tbar50{{height:8px;border-radius:4px;display:flex;overflow:hidden}}
.tbar50 .y{{background:#00A24F}} .tbar50 .n{{background:#E6424C}}
/* calibration */
.cal text{{font-family:'JetBrains Mono',monospace}}
/* confirm minis */
.mini{{width:300px}}
.claret-head{{background:linear-gradient(120deg,rgba(164,39,63,.35),rgba(164,39,63,.12));margin:-18px -18px 12px;
padding:12px 18px;border-radius:14px 14px 0 0;border-bottom:1px solid rgba(164,39,63,.5);font-weight:600;font-size:14px;color:#F5B7C2}}
</style></head><body><div class="wrap">

<header>
  <div class="eyebrow50">50pick · Micro-detail board · Batch 2 — the interaction layer</div>
  <h1>The smallest details, decided once</h1>
  <p class="sub">Every pattern below is normative and implemented in <b>code/micro-patterns.css</b>; exact values in <b>spec/50pick-micro-interactions-spec.md</b>. Filtering, sorting, pagination, loaders, forms, toasts, ledger &amp; receipt, badges, celebrations — with EN·SW·ZH strings and reduced-motion end-states.</p>
</header>

<section><div class="eyebrow50">§3–§4 · Filter &amp; sort bar (/markets)</div>
<h2>Search · chips with counts · active filters · open sort menu</h2>
<p class="note">Debounce 250ms, Esc clears, ⌘K at desktop. Multi-select topics; counts in mono at 55%. Sort menu = 240ms rise, radio semantics, check on active.</p>
<div class="row" style="align-items:flex-start">
  <div>
    <div class="searchbox">{searchG}<input value="simba"/><span class="kbd50">⌘K</span></div>
    <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap">
      <span class="chip50">New</span><span class="chip50 chip50--selected">Ending soon</span><span class="chip50">Today</span><span class="chip50">This week</span><span class="chip50">All</span>
    </div>
    <div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap">
      <span class="chip50 chip50--selected">{g("catSports",11,2)}Sports <span class="count">12</span><span class="x">{xG}</span></span>
      <span class="chip50">{g("catMacro",11,2)}Macro <span class="count">7</span></span>
      <span class="chip50">{g("catWeather",11,2)}Hali ya hewa <span class="count">5</span></span>
      <span class="chip50">{g("catCrypto",11,2)}加密货币 <span class="count">9</span></span>
    </div>
    <div style="display:flex;gap:10px;align-items:center;margin-top:12px;font-size:12.5px;color:#C8CBCF">
      Filters: <span class="chip50">Ending soon <span class="x">{xG}</span></span><span class="chip50">Sports <span class="x">{xG}</span></span>
      <button class="btn50 btn50--ghost btn50--sm">Clear all · Ondoa zote</button>
    </div>
  </div>
  <div class="menuwrap">
    <button class="btn50 btn50--ghost">{g("sortDesc",15)}Sort: Closing soon {chevD}</button>
    <div class="menu50" role="menu">
      <div role="menuitemradio" aria-checked="true">{check}<span>Closing soon · Inayofunga karibuni</span></div>
      <div role="menuitemradio" aria-checked="false" style="padding-left:36px">Newest · Mpya zaidi</div>
      <div role="menuitemradio" aria-checked="false" style="padding-left:36px">Pool size · Ukubwa wa mfuko</div>
      <div role="menuitemradio" aria-checked="false" style="padding-left:36px">Most predictors · Watabiri wengi</div>
      <div role="menuitemradio" aria-checked="false" style="padding-left:36px">Biggest 24h move · 24小时最大变动</div>
    </div>
  </div>
</div></section>

<section style="margin-top:170px"><div class="eyebrow50">§5 · Pagination · load-more · scroll-to-top</div>
<h2>Tables page; boards scroll infinitely with a 96-item pause</h2>
<div class="row" style="align-items:center">
  <div class="pager50">
    <button aria-label="Previous">‹</button><button>1</button><span class="mono" style="color:#C8CBCF">…</span>
    <button>4</button><button aria-current="page">5</button><button>6</button>
    <span class="mono" style="color:#C8CBCF">…</span><button>12</button><button aria-label="Next">›</button>
  </div>
  <span class="mono" style="font-size:11px;color:#C8CBCF">Showing 101–125 of 2,431 · Inaonyesha 101–125 kati ya 2,431</span>
  <button class="btn50 btn50--ghost">Load more · Pakia zaidi · 加载更多</button>
  <button class="to-top50" style="position:static" aria-label="Back to top">{upG}</button>
</div></section>

<section><div class="eyebrow50">§6 · Loaders &amp; data freshness</div>
<h2>Skeletons match geometry · stale chip is the honesty signature</h2>
<p class="note">Skeletons only after 150ms, shown ≥300ms. When the socket drops, odds surfaces carry the mono freshness chip — aqua &lt;30s, gold to 2m, rose beyond; on reconnect only numerals flash, never bars.</p>
<div class="row">
  <div class="panel" style="width:250px"><div class="state-label">page loader</div>
    <div style="display:flex;flex-direction:column;align-items:center;gap:12px;padding:12px 0">
      <div style="width:52px;height:52px;border-radius:13px;border:1.5px solid #4983F4;display:flex;align-items:center;justify-content:center;font:800 17px Sora;color:#6CA2FF">50</div>
      <div class="tbar50" style="width:120px"><span class="y" style="width:57%"></span><span class="n" style="width:43%"></span></div>
      <span class="mono" style="font-size:10px;letter-spacing:.14em;color:#C8CBCF">LOADING · INAPAKIA · 加载中</span>
    </div></div>
  <div class="panel" style="width:250px"><div class="state-label">row + kpi skeletons</div>
    <div class="sk50" style="height:52px;margin-bottom:10px"></div>
    <div class="sk50" style="height:52px;margin-bottom:10px"></div>
    <div style="display:flex;gap:10px"><div class="sk50" style="height:64px;flex:1"></div><div class="sk50" style="height:64px;flex:1"></div></div></div>
  <div class="panel" style="width:250px"><div class="state-label">freshness · reconnect</div>
    <div style="display:flex;flex-direction:column;gap:10px">
      <span class="stale50 stale50--ok"><span class="pip"></span>as of 12s ago</span>
      <span class="stale50 stale50--warn"><span class="pip"></span>tangu dakika 1</span>
      <span class="stale50 stale50--bad"><span class="pip"></span>2分钟前 · reconnecting</span>
      <div style="display:flex;align-items:center;gap:8px;font-size:13px">Inline wait <span class="dots50" style="color:#6CA2FF"><span></span><span></span><span></span></span></div>
      <div class="progress50"><i style="width:64%"></i></div>
    </div></div>
</div></section>

<section><div class="eyebrow50">§7 · Form controls</div>
<h2>Stepper with clamp-shake · toggle · checks · error reserves its line</h2>
<div class="row">
  <div class="panel" style="width:280px"><div class="state-label">amount stepper (deposit)</div>
    <div style="display:flex;gap:8px">
      <button class="btn50 btn50--ghost" style="width:44px;padding:0" aria-label="Decrease">−</button>
      <input class="input50 mono" style="text-align:center;font-weight:600" value="TZS 25,000"/>
      <button class="btn50 btn50--ghost" style="width:44px;padding:0" aria-label="Increase">+</button>
    </div>
    <div class="helper50">Steps of TZS 1,000 · Hatua za TZS 1,000</div>
    <div style="margin-top:8px"><input class="input50 mono shake50" aria-invalid="true" value="TZS 300"/>
    <div class="helper50 helper50--error">Minimum TZS 500 · Kima cha chini TZS 500 · 最低 TZS 500</div></div></div>
  <div class="panel" style="width:250px"><div class="state-label">toggle · checkbox · radio</div>
    <div style="display:flex;flex-direction:column;gap:14px">
      <label style="display:flex;justify-content:space-between;align-items:center;font-size:13.5px">Price alerts · Arifa za bei<button class="toggle50" role="switch" aria-checked="true"></button></label>
      <label style="display:flex;justify-content:space-between;align-items:center;font-size:13.5px;opacity:.45">SMS receipts (KYC first)<button class="toggle50" role="switch" aria-checked="false" disabled></button></label>
      <label style="display:flex;gap:10px;align-items:center;font-size:13.5px"><span class="check50" aria-checked="true" style="color:#fff">{check}</span>I confirm I am 18+ · Nathibitisha nina miaka 18+</label>
    </div></div>
  <div class="panel" style="width:250px"><div class="state-label">tooltip on money surfaces</div>
    <div style="display:flex;align-items:center;gap:6px;font-size:13.5px">Pool share <span style="color:#C8CBCF">{infoG}</span></div>
    <div class="tip50" style="margin-top:8px;display:inline-block">Winners split the pool in proportion to stake, after the platform fee. · Washindi hugawana mfuko kulingana na dau.</div>
  </div>
</div></section>

<section><div class="eyebrow50">§8 · Toasts</div>
<h2>Left accent tells the type · gold is money-credited only · drain bar shows lifetime</h2>
<div class="row">
  <div class="toast50 toast50--money" style="color:#D49824"><span style="color:#FEC766">{g("cashback",18)}</span>
    <div style="color:#F5F8FF"><b style="font-size:14px">+ TZS 20,000 credited</b><div style="font-size:12.5px;color:#C8CBCF">Proposal approved · Pendekezo limeidhinishwa · 提案已批准</div></div>
    <span class="drain" style="animation-duration:6s"></span></div>
  <div class="toast50 toast50--error" style="color:#E6424C"><span>{g("voidX",18)}</span>
    <div style="color:#F5F8FF"><b style="font-size:14px">Deposit failed</b><div style="font-size:12.5px;color:#C8CBCF">M-Pesa timeout — nothing was charged. Try again. · Hujakatwa chochote. Jaribu tena.</div></div>
    <span class="drain" style="animation-duration:8s"></span></div>
</div></section>

<section><div class="eyebrow50">§11 · Ledger &amp; receipt — money reads like a bank statement</div>
<h2>Signed mono amounts · running balance · tap row → receipt</h2>
<div class="row">
  <div class="panel" style="width:520px">{ledger_rows}</div>
  <div class="receipt">
    <div class="rseal">{g("sealCheck",20)}</div>
    <div class="mono" style="font-size:10px;letter-spacing:.14em;color:#C8CBCF">SETTLEMENT RECEIPT · RISITI</div>
    <div style="font-family:Sora;font-weight:600;font-size:16px;margin-top:6px;max-width:230px">Long rains begin before 15 Apr</div>
    <div class="rrow"><span>Outcome · Matokeo</span><b style="color:#00A24F">YES</b></div>
    <div class="rrow"><span>Your side · Upande wako</span><b style="color:#00A24F">YES · NDIO</b></div>
    <div class="rrow"><span>Stake · Dau</span><b>TZS 20,000</b></div>
    <div class="rrow"><span>Pool share · Mgao</span><b>2.4%</b></div>
    <hr class="perf"/>
    <div class="rrow" style="font-size:14px"><span style="color:#F5F8FF">Payout · Malipo</span><b style="color:#FEC766;font-size:16px">TZS 46,800</b></div>
    <div class="rrow"><span>Receipt № </span><b>50P-2026-070841</b></div>
    <div class="rrow"><span>Settled · Imetatuliwa</span><b>06 Jul, 18:02 EAT</b></div>
    <div class="mono" style="font-size:9px;letter-spacing:.1em;color:#C8CBCF;margin-top:14px">SETTLED BY OFFICIAL SOURCES · 18+ · 50PICK.TZ</div>
  </div>
</div></section>

<section><div class="eyebrow50">§13 · Badge medallions — earned status, gilt by right</div>
<h2>12 medallions · locked = ghost + progress · awarded via the reward burst</h2>
<div class="row" style="gap:6px">{badges_html}</div></section>

<section><div class="eyebrow50">§12 · Signature celebrations</div>
<h2>The Tipping Point wobble · win-sequence end frame</h2>
<p class="note">When a market crosses 50/50 on screen: one 600ms balance wobble, once per market per session (tap the bar to replay here). Losers get the seal and a factual line — no rose burst; dignity in loss is an RG stance.</p>
<div class="row">
  <div class="panel" style="width:360px"><div class="state-label">tipping point · click to replay</div>
    <div id="tipdemo" style="cursor:pointer">
      <div class="tbar50 tipping-wobble" id="tipbar"><span class="y" style="width:50%"></span><span class="n" style="width:50%"></span></div>
      <div style="display:flex;justify-content:space-between;margin-top:8px;font:600 11px 'JetBrains Mono',monospace">
        <span style="color:#00A24F">YES 50%</span>
        <span class="chip50" style="color:#36BABA;border-color:rgba(54,186,186,.35)">{g("tippingScales",11,2)}TIPPING · INAYUMBA</span>
        <span style="color:#E6424C">50% NO</span></div>
    </div></div>
  <div class="panel" style="width:360px"><div class="state-label">loser end-frame (no burst)</div>
    <div style="display:flex;gap:12px;align-items:center">
      <div class="rseal" style="position:static;transform:rotate(8deg)" >{g("sealCheck",20)}</div>
      <div><div style="font-weight:600;font-size:14px">Resolved: NO · Imetatuliwa: HAPANA</div>
      <div class="mono" style="font-size:12px;color:#C8CBCF;margin-top:3px">Your stake · Dau lako: TZS 10,000</div></div>
    </div></div>
</div></section>

<section><div class="eyebrow50">§15 · Calibration chart — the honesty flex</div>
<h2>Prediction skill made visible; no betting shop can ship this</h2>
<div class="row">
<div class="panel" style="width:380px">
<svg class="cal" viewBox="0 0 320 320" width="320" height="320">
  <path d="M40 280H300M40 280V20" stroke="rgba(245,248,255,.14)" stroke-width="1"/>
  <path d="M40 280 300 20" stroke="rgba(245,248,255,.25)" stroke-width="1" stroke-dasharray="4 4"/>
  <g fill="#36BABA" fill-opacity=".75">
    <circle cx="66" cy="262" r="5"/><circle cx="92" cy="246" r="6"/><circle cx="118" cy="238" r="6"/>
    <circle cx="144" cy="204" r="7"/><circle cx="170" cy="196" r="7"/><circle cx="196" cy="152" r="6"/>
    <circle cx="222" cy="132" r="6"/><circle cx="248" cy="96" r="5"/><circle cx="274" cy="84" r="4"/>
  </g>
  <text x="170" y="308" text-anchor="middle" font-size="10" fill="#C8CBCF">STATED CONFIDENCE →</text>
  <text x="14" y="150" font-size="10" fill="#C8CBCF" transform="rotate(-90 14 150)">HIT RATE →</text>
  <text x="292" y="34" text-anchor="end" font-size="9" fill="rgba(245,248,255,.4)">PERFECT</text>
</svg>
<div style="font-size:12.5px;color:#C8CBCF;margin-top:6px">Dots above the line: you're better than you claim. · Utabiri wako ni mzuri kiasi gani? · 您的预测有多准？</div>
</div>
<div class="panel mini"><div class="state-label">§10 · hard confirm (claret + typed word)</div>
  <div class="claret-head">Close account · Funga akaunti</div>
  <div style="font-size:12.5px;color:#C8CBCF">This is permanent. Open positions settle first; remaining balance is withdrawn to your M-Pesa.</div>
  <div class="helper50" style="margin-top:10px">Type <b class="mono" style="color:#F5F8FF">FUNGA</b> to confirm</div>
  <input class="input50 mono" placeholder="FUNGA"/>
  <div style="display:flex;gap:8px;margin-top:12px">
    <button class="btn50 btn50--ghost" style="flex:1">Cancel · Ghairi</button>
    <button class="btn50" style="flex:1;background:#A4273F;color:#fff;opacity:.45" disabled>Close · Funga</button>
  </div></div>
</div></section>

<div style="margin-top:64px;border-top:1px solid rgba(245,248,255,.06);padding-top:16px" class="mono">
<span style="font-size:11.5px;color:#C8CBCF">50pick micro-detail board · Batch 2 · normative values in spec/50pick-micro-interactions-spec.md · implemented by code/micro-patterns.css · reduced-motion end-states defined for every animation</span></div>
</div>
<script>
document.getElementById('tipdemo').addEventListener('click',()=>{{
  const b=document.getElementById('tipbar'); b.classList.remove('tipping-wobble'); void b.offsetWidth; b.classList.add('tipping-wobble');
}});
</script>
</body></html>'''
open("/home/claude/design-out/50pick-micro-board.html","w").write(html)
print("micro board written:", len(html), "chars")
