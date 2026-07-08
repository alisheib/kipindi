/* 50pick Reference Build — application logic.
   Implements the micro-interaction spec with real behavior:
   dial detents + keyboard, confirm hierarchy, celebration timeline,
   ledger + receipts, stale-data chip, live ticks + tipping wobble, i18n. */
"use strict";

/* ═══ i18n ═══ */
const STR = {
  en:{markets:"Markets",wallet:"Wallet",deposit:"Deposit",withdraw:"Withdraw",
    "back to markets":"Back to markets","your positions":"Your positions on this market",
    available:"Available · Salio",activity:"Activity","open positions":"Open positions",
    "confirm your pick":"Confirm your pick","your side":"Your side",stake:"Stake",
    "platform fee":"Platform fee",cancel:"Cancel","view wallet":"View wallet",done:"Done",
    "simulate disconnect":"Simulate disconnect","simulate reconnect":"Simulate reconnect",
    "simulate settlement":"Simulate settlement",searchPh:"Search markets",
    sort_closing:"Closing soon",sort_new:"Newest",sort_pool:"Pool size",sort_pred:"Most predictors",sort_move:"Biggest 24h move",
    sortLbl:"Sort",slide:"· SLIDE TO COMMIT ·",youpick:"You are picking",neutral:"Slide toward YES or NO",
    stakeCap:"Stake · Dau",pool:"pool",predictors:"predictors",left:"left",
    poolLine:s=>`If ${s} wins, you share the pool in proportion to your stake.`,
    finalLine:"Bets are final once placed. · Dau likiwekwa ni la mwisho.",
    confirmBtn:"Place pick",placing:"Placing…",placed:"Pick placed",
    posNote:"No position yet — slide the dial.",resolved:"Resolved",youwon:"You won",
    payout:"Payout credited",receipt:"Receipt",copied:"Reference copied",
    noresults:"No markets match — clear the search or filters.",clear:"Clear all",
    stale:s=>`as of ${s}s ago`,recon:"Reconnected — odds updated",
    won:"won on",predicted:"predicted",closes:"closes",all:"All"},
  sw:{markets:"Masoko",wallet:"Pochi",deposit:"Amana",withdraw:"Toa",
    "back to markets":"Rudi kwenye masoko","your positions":"Nafasi zako kwenye soko hili",
    available:"Salio",activity:"Shughuli","open positions":"Nafasi wazi",
    "confirm your pick":"Thibitisha chaguo lako","your side":"Upande wako",stake:"Dau",
    "platform fee":"Ada ya jukwaa",cancel:"Ghairi","view wallet":"Angalia pochi",done:"Sawa",
    "simulate disconnect":"Iga kukatika","simulate reconnect":"Iga kuunganika",
    "simulate settlement":"Iga matokeo",searchPh:"Tafuta masoko",
    sort_closing:"Inayofunga karibuni",sort_new:"Mpya zaidi",sort_pool:"Ukubwa wa mfuko",sort_pred:"Watabiri wengi",sort_move:"Mabadiliko makubwa",
    sortLbl:"Panga",slide:"· BURUTA KUAMUA ·",youpick:"Unachagua",neutral:"Buruta kuelekea NDIO au HAPANA",
    stakeCap:"Dau",pool:"mfuko",predictors:"watabiri",left:"zimebaki",
    poolLine:s=>`${s} ikishinda, unagawana mfuko kulingana na dau lako.`,
    finalLine:"Dau likiwekwa ni la mwisho.",
    confirmBtn:"Weka dau",placing:"Inaweka…",placed:"Dau limewekwa",
    posNote:"Hakuna nafasi bado — buruta kidhibiti.",resolved:"Imetatuliwa",youwon:"Umeshinda",
    payout:"Malipo yamewekwa",receipt:"Risiti",copied:"Kumbukumbu imenakiliwa",
    noresults:"Hakuna masoko — futa utafutaji au vichujio.",clear:"Ondoa zote",
    stale:s=>`tangu sekunde ${s}`,recon:"Imeunganika — bei zimesasishwa",
    won:"kashinda kwenye",predicted:"katabiri",closes:"inafunga",all:"Zote"},
  zh:{markets:"市场",wallet:"钱包",deposit:"充值",withdraw:"提现",
    "back to markets":"返回市场","your positions":"您在此市场的持仓",
    available:"余额",activity:"活动","open positions":"未结持仓",
    "confirm your pick":"确认您的选择","your side":"您的选择",stake:"金额",
    "platform fee":"平台费",cancel:"取消","view wallet":"查看钱包",done:"完成",
    "simulate disconnect":"模拟断线","simulate reconnect":"模拟重连",
    "simulate settlement":"模拟结算",searchPh:"搜索市场",
    sort_closing:"即将截止",sort_new:"最新",sort_pool:"奖池大小",sort_pred:"预测者最多",sort_move:"24小时最大变动",
    sortLbl:"排序",slide:"· 滑动确认 ·",youpick:"您正在选择",neutral:"滑向 是 或 否",
    stakeCap:"金额",pool:"奖池",predictors:"预测者",left:"剩余",
    poolLine:s=>`若“${s}”获胜，您将按金额比例分享奖池。`,
    finalLine:"下注后不可撤销。",
    confirmBtn:"下注",placing:"下注中…",placed:"已下注",
    posNote:"暂无持仓 — 滑动转盘。",resolved:"已结算",youwon:"您赢了",
    payout:"派彩已入账",receipt:"收据",copied:"参考号已复制",
    noresults:"没有匹配的市场 — 清除搜索或筛选。",clear:"清除全部",
    stale:s=>`${s}秒前`,recon:"已重连 — 赔率已更新",
    won:"赢了",predicted:"预测",closes:"截止",all:"全部"}
};
let LANG="en";
const t=(k,...a)=>{const v=STR[LANG][k]??STR.en[k]??k;return typeof v==="function"?v(...a):v;};
const tzs=n=>"TZS "+Math.round(n).toLocaleString("en-US");

/* ═══ data ═══ */
const CATS=[["sports","Sports","Michezo","体育"],["weather","Weather","Hali ya hewa","天气"],
 ["macro","Macro","Uchumi","宏观"],["crypto","Crypto","Kripto","加密货币"],["culture","Culture","Utamaduni","文化"]];
const catLabel=c=>{const r=CATS.find(x=>x[0]===c);return LANG==="sw"?r[2]:LANG==="zh"?r[3]:r[1];};
function mkSpark(seed,end){const pts=[];let v=end-((seed*7)%14)+4;for(let i=0;i<8;i++){v+=(((seed*31+i*17)%9)-4);v=Math.max(8,Math.min(92,v));pts.push(v);}pts[7]=end;return pts;}
const MARKETS=[
 {id:"m1",cat:"sports", yes:57,pool:4200000,pred:1000,hLeft:148,hot:true,
  q:{en:"Simba SC wins NBC Premier League 2026-27",sw:"Simba SC kushinda Ligi Kuu ya NBC 2026-27",zh:"Simba SC 赢得 2026-27 NBC 超级联赛"}},
 {id:"m2",cat:"weather",yes:64,pool:2800000,pred:689,hLeft:96,
  q:{en:"Long rains begin before 15 April",sw:"Mvua za masika kuanza kabla ya 15 Aprili",zh:"长雨季在4月15日前开始"}},
 {id:"m3",cat:"crypto", yes:48,pool:6100000,pred:1214,hLeft:0.7,hot:true,
  q:{en:"Bitcoin closes above $100,000 on 1 July",sw:"Bitcoin kufunga juu ya $100,000 tarehe 1 Julai",zh:"比特币7月1日收于10万美元上方"}},
 {id:"m4",cat:"macro",  yes:71,pool:3400000,pred:842,hLeft:52,
  q:{en:"USD/TZS closes below 2,650 in Q2",sw:"USD/TZS kufunga chini ya 2,650 robo ya pili",zh:"美元/坦先令第二季度收于2650下方"}},
 {id:"m5",cat:"sports", yes:39,pool:1900000,pred:512,hLeft:210,
  q:{en:"Taifa Stars qualify for AFCON 2027",sw:"Taifa Stars kufuzu AFCON 2027",zh:"坦桑尼亚国家队晋级2027非洲杯"}},
 {id:"m6",cat:"macro",  yes:55,pool:1200000,pred:305,hLeft:30,
  q:{en:"Headline inflation below 4% for June",sw:"Mfumuko wa bei chini ya 4% mwezi Juni",zh:"6月总体通胀低于4%"}},
 {id:"m7",cat:"culture",yes:62,pool:900000, pred:271,hLeft:72,
  q:{en:"A Bongo Flava album tops the EA chart this month",sw:"Albamu ya Bongo Flava kuongoza chati ya Afrika Mashariki mwezi huu",zh:"本月一张Bongo Flava专辑登顶东非榜"}},
 {id:"m8",cat:"crypto", yes:44,pool:750000, pred:198,hLeft:118,
  q:{en:"TZS stablecoin pilot announced this quarter",sw:"Jaribio la sarafu-thabiti ya TZS kutangazwa robo hii",zh:"本季度宣布坦先令稳定币试点"}},
];
MARKETS.forEach((m,i)=>{m.spark=mkSpark(i+3,m.yes);m.move=m.spark[7]-m.spark[0];m.wobbled=false;});

/* ═══ state ═══ */
let balance=100000, positions=[], ledger=[], topicSel="all", sortKey="closing", query="";
let connected=true, staleSince=0, currentMarket=null, pending=null, seq=8240;
ledger.push({gl:"dep",title:{en:"Deposit · M-Pesa",sw:"Amana · M-Pesa",zh:"充值 · M-Pesa"},ref:"DP-260707-8231",amt:100000,bal:100000,ts:"07 Jul, 08:12 EAT",method:"M-Pesa · +255 ••• 678"});

/* ═══ glyph helpers ═══ */
const G={
 clock:'<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
 flame:'<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>',
 scales:'<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3.5v17M8 20.5h8"/><path d="M5 8.5l14-2.4"/><path d="M5 8.5l-2.2 4.3a2.6 2.6 0 0 0 4.4 0zM19 6.1l-2.2 4.3a2.6 2.6 0 0 0 4.4 0z" stroke-width="1.6"/></svg>',
 check:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7"/></svg>',
 dep:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M6.5 9.5 12 15l5.5-5.5"/><path d="M4.5 20.5h15"/></svg>',
 target:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><circle cx="12" cy="12" r="8.6"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none"/></svg>',
 trophy:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>',
 copy:'<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="8.5" y="8.5" width="12" height="12" rx="2.2"/><path d="M5.5 15.5h-1A1.5 1.5 0 0 1 3 14V4.5A1.5 1.5 0 0 1 4.5 3H14a1.5 1.5 0 0 1 1.5 1.5v1"/></svg>',
 cat:{sports:'<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="8.6"/><path d="M12 8.8L15.04 11.01 13.88 14.59 10.12 14.59 8.96 11.01Z"/><path d="M12 8.8V3.4M15.04 11.01 20.18 9.34M13.88 14.59 17.06 18.96M10.12 14.59 6.94 18.96M8.96 11.01 3.82 9.34"/></svg>',
  weather:'<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 16.5H8a4 4 0 0 1-.6-7.95A5.5 5.5 0 0 1 18 7.6a4.2 4.2 0 0 1-1 8.9z"/><path d="M8.8 19.5v1.6M12.2 19.5v1.6M15.6 19.5v1.6"/></svg>',
  macro:'<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 20.5h17"/><path d="M4.5 16.5l4.5-5 3 2.7 6.5-7.7"/><path d="M15.3 6h3.5v3.5"/></svg>',
  crypto:'<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8.6"/><path d="M9.8 8h3.4a2 2 0 0 1 0 4H9.8m0 0h4a2 2 0 0 1 0 4H9.8M9.8 8v8"/></svg>',
  culture:'<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4l2.3 5 5.2.6-3.9 3.5 1.1 5.1L12 15.6 7.3 18.2l1.1-5.1L4.5 9.6 9.7 9z"/></svg>'}
};

/* ═══ formatting ═══ */
function timeLeft(h){
  if(h<1){const m=Math.round(h*60);return LANG==="sw"?`${t("left")} dakika ${m}`:LANG==="zh"?`剩${m}分钟`:`${m}m ${t("left")}`;}
  if(h<48){const H=Math.round(h);return LANG==="sw"?`${t("left")} saa ${H}`:LANG==="zh"?`剩${H}小时`:`${H}h ${t("left")}`;}
  const d=Math.round(h/24);return LANG==="sw"?`${t("left")} siku ${d}`:LANG==="zh"?`剩${d}天`:`${d}d ${t("left")}`;
}
const compact=n=>n>=1e6?(n/1e6).toFixed(1).replace(/\.0$/,"")+"M":n>=1e3?Math.round(n/1e3)+"K":""+n;
function sparkSvg(pts,w,hgt){
  const n=pts.length,step=(w-4)/(n-1);const y=v=>hgt-2-(v/100)*(hgt-6);
  let d=`M2,${y(pts[0]).toFixed(1)}`;
  for(let i=0;i<n-1;i++){const x1=2+i*step,x2=2+(i+1)*step,c=step*0.4;
    d+=` C${(x1+c).toFixed(1)},${y(pts[i]).toFixed(1)} ${(x2-c).toFixed(1)},${y(pts[i+1]).toFixed(1)} ${x2.toFixed(1)},${y(pts[i+1]).toFixed(1)}`;}
  const last=2+(n-1)*step;
  return `<svg width="${w}" height="${hgt}" viewBox="0 0 ${w} ${hgt}"><path class="a" d="${d} L${last},${hgt} L2,${hgt} Z"/><path class="l" d="${d}"/><circle cx="${last}" cy="${y(pts[n-1]).toFixed(1)}" r="2.5"/></svg>`;
}

/* ═══ board render ═══ */
const SORTS=[["closing","sort_closing"],["new","sort_new"],["pool","sort_pool"],["pred","sort_pred"],["move","sort_move"]];
function renderTopics(){
  const el=document.getElementById("topics");
  const counts={};MARKETS.forEach(m=>counts[m.cat]=(counts[m.cat]||0)+1);
  let h=`<button class="chip" aria-pressed="${topicSel==="all"}" onclick="setTopic('all')">${t("all")} <span class="ct">${MARKETS.length}</span></button>`;
  for(const [k] of CATS) h+=`<button class="chip" aria-pressed="${topicSel===k}" onclick="setTopic('${k}')">${G.cat[k]}${catLabel(k)} <span class="ct">${counts[k]||0}</span></button>`;
  el.innerHTML=h;
}
function filtered(){
  let list=MARKETS.filter(m=>topicSel==="all"||m.cat===topicSel);
  if(query) list=list.filter(m=>Object.values(m.q).some(s=>s.toLowerCase().includes(query)));
  const key={closing:(a,b)=>a.hLeft-b.hLeft,new:(a,b)=>b.id.localeCompare(a.id),pool:(a,b)=>b.pool-a.pool,
    pred:(a,b)=>b.pred-a.pred,move:(a,b)=>Math.abs(b.move)-Math.abs(a.move)}[sortKey];
  return list.slice().sort(key);
}
function cardHtml(m,i){
  const q=m.q[LANG]??m.q.en;
  const yl=LANG==="sw"?"NDIO":LANG==="zh"?"是":"YES", nl=LANG==="sw"?"HAPANA":LANG==="zh"?"否":"NO";
  const lean=Math.abs(m.yes-50)<3?(LANG==="zh"?"势均力敌":"tipping"):(m.yes>50?(LANG==="sw"?"inaelekea ndio":LANG==="zh"?"倾向是":"leans yes"):(LANG==="sw"?"inaelekea hapana":LANG==="zh"?"倾向否":"leans no"));
  const mv=m.move>=0?`▲ +${m.move}pt`:`▼ ${m.move}pt`;
  const crest=['#6CA2FF','#FEC766','#36BABA'].map((c,j)=>`<i style="background:${c}">${"AKZMJNFHSABMTWRK".substr((i*2+j*2)%14,2)}</i>`).join("");
  return `<article class="mcard rise" style="animation-delay:${Math.min(i,7)*40}ms" tabindex="0" role="button"
    aria-label="${q}" onclick="openDetail('${m.id}')" onkeydown="if(event.key==='Enter')openDetail('${m.id}')">
    <div class="mhead">
      <span style="display:flex;gap:6px">
        <span class="chip chip-live"><span class="dot"></span>LIVE</span>
        ${m.hot?`<span class="chip chip-hot">${G.flame}HOT</span>`:""}
        ${Math.abs(m.yes-50)<3?`<span class="chip chip-tip">${G.scales}TIPPING</span>`:""}
      </span>
      <span class="ptime ${m.hLeft<1?"urgent":""}">${G.clock}${timeLeft(m.hLeft)}</span>
    </div>
    <div class="mtitle">${q}</div>
    <div class="mmove ${m.move>=0?"up":"dn"}">${mv} · 24h</div>
    <div class="tbar" data-bar="${m.id}"><span class="y" style="width:${m.yes}%"></span><span class="n"></span></div>
    <div class="tlbl"><span style="color:var(--yes)">${yl} <span data-num="y-${m.id}">${m.yes}%</span></span>
      <span class="lean">${lean}</span>
      <span style="color:var(--no)"><span data-num="n-${m.id}">${100-m.yes}%</span> ${nl}</span></div>
    <div class="spark">${sparkSvg(m.spark,300,28)}</div>
    <div class="mmeta"><span class="crest">${crest}</span><span>+${(m.pred-3).toLocaleString()} ${t("predictors")}</span>
      <span style="margin-left:auto">${t("pool")} TZS ${compact(m.pool)}</span></div>
    <div class="pair">
      <button class="btn btn-yes ia" onclick="event.stopPropagation();openDetail('${m.id}','yes')">${yl} @ ${m.yes}%</button>
      <button class="btn btn-no ia" onclick="event.stopPropagation();openDetail('${m.id}','no')">${nl} @ ${100-m.yes}%</button>
    </div></article>`;
}
function renderBoard(){
  renderTopics();
  const grid=document.getElementById("grid"),list=filtered();
  grid.innerHTML=list.length?list.map(cardHtml).join(""):
    `<div class="emptybox" style="grid-column:1/-1"><div style="font-family:var(--fd);font-weight:600;color:var(--ink);margin-bottom:6px">${t("noresults")}</div>
     <button class="btn btn-ghost ia btn-sm" onclick="clearFilters()">${t("clear")}</button></div>`;
}
function setTopic(k){topicSel=k;transitionGrid();}
function onSearch(){query=document.getElementById("q").value.trim().toLowerCase();transitionGrid();}
function clearFilters(){query="";topicSel="all";document.getElementById("q").value="";transitionGrid();}
function transitionGrid(){const g=document.getElementById("grid");g.classList.add("leaving");
  setTimeout(()=>{renderBoard();g.classList.remove("leaving");},120);}
function renderSortMenu(){
  document.getElementById("sortlbl").textContent=`${t("sortLbl")}: ${t("sort_"+sortKey)}`;
  document.getElementById("sortmenu").innerHTML=SORTS.map(([k,lbl])=>
    `<button role="menuitemradio" aria-checked="${k===sortKey}" onclick="setSort('${k}')"><span class="ck" style="color:var(--brand-l)">${G.check}</span>${t(lbl)}</button>`).join("");
}
function setSort(k){sortKey=k;renderSortMenu();document.getElementById("sortmenu").classList.remove("open");
  document.getElementById("sortbtn").setAttribute("aria-expanded","false");transitionGrid();}
function toggleMenu(e){e.stopPropagation();const m=document.getElementById("sortmenu"),b=document.getElementById("sortbtn");
  const open=m.classList.toggle("open");b.setAttribute("aria-expanded",open);}
document.addEventListener("click",()=>{document.getElementById("sortmenu").classList.remove("open");
  document.getElementById("sortbtn").setAttribute("aria-expanded","false");});
window.addEventListener("keydown",e=>{if((e.metaKey||e.ctrlKey)&&e.key==="k"){e.preventDefault();document.getElementById("q").focus();}
  if(e.key==="Escape"&&document.activeElement===document.getElementById("q")){document.getElementById("q").value="";onSearch();}});

/* ═══ detail + dial ═══ */
const DETENTS=[0.2,0.4,0.6,0.8]; // |v| detents → 1×/2×/5×/10× of base stake
const MULT=[1,2,5,10], BASE=5000, FEE=0.025;
let dialV=0; // -1..1 (negative = NO)
function openDetail(id,preset){
  currentMarket=MARKETS.find(m=>m.id===id);dialV=preset==="yes"?0.2:preset==="no"?-0.2:0;
  renderDetail();go("detail");
}
function dialStake(){const a=Math.abs(dialV);if(a<0.1)return 0;
  const di=DETENTS.reduce((best,d,i)=>Math.abs(a-d)<Math.abs(a-DETENTS[best])?i:best,0);
  // continuous between detents: interpolate multiplier
  const lo=a<=DETENTS[0]?0:DETENTS.filter(d=>d<=a).length-1;
  const hi=Math.min(lo+1,3);const span=(DETENTS[hi]-DETENTS[lo])||1;
  const f=Math.min(1,Math.max(0,(a-DETENTS[lo])/span));
  const mult=MULT[lo]+(MULT[hi]-MULT[lo])*f;
  return Math.round(BASE*mult/500)*500;
}
function renderDetail(){
  const m=currentMarket;const q=m.q[LANG]??m.q.en;
  const yl=LANG==="sw"?"NDIO":LANG==="zh"?"是":"YES", nl=LANG==="sw"?"HAPANA":LANG==="zh"?"否":"NO";
  document.getElementById("dmain").innerHTML=`
    <span class="wm">${G.cat[m.cat].replace('width="11" height="11"','width="110" height="110"').replace('stroke-width="2"','stroke-width="1.1"')}</span>
    <span style="display:flex;gap:6px"><span class="chip chip-live"><span class="dot"></span>LIVE</span>
      <span class="chip" style="cursor:default">${G.cat[m.cat]}${catLabel(m.cat)}</span>
      <span class="ptime ${m.hLeft<1?"urgent":""}" style="margin-left:auto">${G.clock}${timeLeft(m.hLeft)}</span></span>
    <div class="dq">${q}</div>
    <div class="hair"></div>
    <div class="dstats"><span>${t("pool")} <b class="mono" style="color:var(--ink)">${tzs(m.pool)}</b></span>
      <span>${m.pred.toLocaleString()} ${t("predictors")}</span></div>
    <div class="tbar" style="height:8px;margin-top:16px" data-bar="${m.id}"><span class="y" style="width:${m.yes}%"></span><span class="n"></span></div>
    <div class="tlbl"><span style="color:var(--yes)">${yl} <span data-num="y-${m.id}">${m.yes}%</span></span>
      <span class="lean">${t("slide")}</span>
      <span style="color:var(--no)"><span data-num="n-${m.id}">${100-m.yes}%</span> ${nl}</span></div>
    <div class="spark">${sparkSvg(m.spark,560,34)}</div>
    <div class="dial">
      <div class="poles"><span class="pn">${nl}</span><span class="hint">${t("slide")}</span><span class="py">${yl}</span></div>
      <div class="track" id="track">
        ${DETENTS.map(d=>`<span class="det" style="left:${50+d*50}%"></span><span class="det" style="left:${50-d*50}%"></span>`).join("")}
        <span class="fillY" id="fy"></span><span class="fillN" id="fn"></span><span class="mid"></span>
        <div class="thumb" id="thumb" role="slider" tabindex="0" aria-valuemin="-100" aria-valuemax="100" aria-valuenow="0" aria-label="Conviction dial"></div>
      </div>
      <div class="read">
        <div><div class="cap">${t("youpick")}</div><div class="side z" id="dside">${t("neutral")}</div></div>
        <div style="text-align:right"><div class="cap">${t("stakeCap")}</div><div class="stk" id="dstk">TZS 0</div></div>
      </div>
      <button class="btn btn-gold ia" id="commit" style="width:100%;margin-top:16px" disabled onclick="openSheet()">${t("confirmBtn")}</button>
    </div>`;
  bindDial();updateDial();renderDetailPositions();
}
function bindDial(){
  const track=document.getElementById("track"),thumb=document.getElementById("thumb");
  let dragging=false;
  const setFromX=x=>{const r=track.getBoundingClientRect();let v=((x-r.left)/r.width)*2-1;v=Math.max(-1,Math.min(1,v));
    // magnetic detents (4px window)
    const px=r.width/2;const winV=4/px;
    for(const d of [...DETENTS.map(d=>d),...DETENTS.map(d=>-d),0]) if(Math.abs(v-d)<winV){v=d;break;}
    dialV=v;updateDial();};
  const down=e=>{dragging=true;thumb.style.cursor="grabbing";setFromX(e.clientX??e.touches[0].clientX);e.preventDefault();};
  const move=e=>{if(dragging)setFromX(e.clientX??(e.touches&&e.touches[0].clientX));};
  const up=()=>{dragging=false;thumb.style.cursor="grab";};
  track.addEventListener("pointerdown",down);window.addEventListener("pointermove",move);window.addEventListener("pointerup",up);
  thumb.addEventListener("keydown",e=>{
    const all=[...DETENTS.map(d=>-d).reverse(),0,...DETENTS];
    let i=all.reduce((b,d,j)=>Math.abs(dialV-d)<Math.abs(dialV-all[b])?j:b,0);
    if(e.key==="ArrowRight"||e.key==="ArrowUp")i=Math.min(all.length-1,i+1);
    else if(e.key==="ArrowLeft"||e.key==="ArrowDown")i=Math.max(0,i-1);
    else if(e.key==="Home")i=0;else if(e.key==="End")i=all.length-1;else return;
    e.preventDefault();dialV=all[i];updateDial();});
}
function updateDial(){
  const thumb=document.getElementById("thumb");if(!thumb)return;
  const pct=50+dialV*50;
  thumb.style.left=pct+"%";
  document.getElementById("fy").style.width=Math.max(0,dialV*50)+"%";
  document.getElementById("fn").style.width=Math.max(0,-dialV*50)+"%";
  const stake=dialStake(),side=dialV>0.09?"yes":dialV<-0.09?"no":null;
  const yl=LANG==="sw"?"NDIO":LANG==="zh"?"是":"YES", nl=LANG==="sw"?"HAPANA":LANG==="zh"?"否":"NO";
  const mult=stake?(stake/BASE).toFixed(stake/BASE<10?1:0).replace(/\.0$/,""):"";
  thumb.className="thumb "+(side==="yes"?"sy":side==="no"?"sn":"");
  thumb.innerHTML=side?`${mult}×<small>${side==="yes"?yl:nl}</small>`:`—`;
  thumb.setAttribute("aria-valuenow",Math.round(dialV*100));
  thumb.setAttribute("aria-valuetext",side?`${tzs(stake)} ${side==="yes"?"on "+yl:"on "+nl}`:t("neutral"));
  const ds=document.getElementById("dside");
  ds.className="side "+(side==="yes"?"y":side==="no"?"n":"z");
  ds.textContent=side?`${side==="yes"?yl:nl} · ${mult}×`:t("neutral");
  document.getElementById("dstk").textContent=stake?tzs(stake):"TZS 0";
  document.getElementById("commit").disabled=!side||stake>balance;
}
function renderDetailPositions(){
  const mine=positions.filter(p=>p.mid===currentMarket.id);
  document.getElementById("dpos").innerHTML=mine.length?mine.map(posHtml).join(""):
    `<div style="color:var(--muted);font-size:13px">${t("posNote")}</div>`;
}
function posHtml(p,i){
  const yl=LANG==="sw"?"NDIO":LANG==="zh"?"是":"YES", nl=LANG==="sw"?"HAPANA":LANG==="zh"?"否":"NO";
  const m=MARKETS.find(x=>x.id===p.mid);
  return `<div class="poscard ${p.fresh?"new":""}">
    <div style="display:flex;justify-content:space-between;gap:8px;align-items:center">
      <span style="font-size:13px;font-weight:600;flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${(m.q[LANG]??m.q.en)}</span>
      <span class="chip ${p.side==="yes"?"":""}" style="cursor:default;color:${p.side==="yes"?"var(--yes)":"var(--no)"};border-color:currentColor">${p.side==="yes"?yl:nl}</span></div>
    <div class="mono" style="font-size:12px;color:var(--muted);margin-top:6px;display:flex;justify-content:space-between">
      <span>${t("stakeCap")}: <b style="color:var(--ink)">${tzs(p.stake)}</b></span><span>${p.ref}</span></div></div>`;
}

/* ═══ confirm sheet + place ═══ */
function openSheet(){
  const stake=dialStake(),side=dialV>0?"yes":"no";
  const yl=LANG==="sw"?"NDIO":LANG==="zh"?"是":"YES", nl=LANG==="sw"?"HAPANA":LANG==="zh"?"否":"NO";
  pending={mid:currentMarket.id,side,stake,fee:Math.round(stake*FEE)};
  document.getElementById("shq").textContent=currentMarket.q[LANG]??currentMarket.q.en;
  const sideEl=document.getElementById("shside");
  sideEl.textContent=side==="yes"?yl:nl;sideEl.style.color=side==="yes"?"var(--yes)":"var(--no)";
  document.getElementById("shstk").textContent=tzs(stake);
  document.getElementById("shfee").textContent="− "+tzs(pending.fee);
  document.getElementById("shpool").textContent=t("poolLine",side==="yes"?yl:nl);
  document.getElementById("shfinal").textContent=t("finalLine");
  const go=document.getElementById("shgo");go.disabled=false;go.innerHTML=t("confirmBtn");
  document.getElementById("scrim").classList.add("on");document.getElementById("sheet").classList.add("on");
}
function closeSheet(){document.getElementById("scrim").classList.remove("on");document.getElementById("sheet").classList.remove("on");}
function placeBet(){
  const go=document.getElementById("shgo");go.disabled=true;
  go.innerHTML=`<span class="spin"></span>${t("placing")}`;
  setTimeout(()=>{ // server confirm — never optimistic on money
    const p=pending;seq++;p.ref=`ST-260707-${seq}`;p.fresh=true;
    positions.unshift(p);balance-=p.stake+p.fee;
    ledger.unshift({gl:"stk",title:{en:"Stake · "+currentMarket.q.en,sw:"Dau · "+currentMarket.q.sw,zh:"下注 · "+currentMarket.q.zh},
      ref:p.ref,amt:-(p.stake+p.fee),bal:balance,ts:"07 Jul, "+new Date().toTimeString().slice(0,5)+" EAT",method:"Wallet"});
    updateBalance();closeSheet();
    toast("ok",t("placed"),`${tzs(p.stake)} · ${p.ref}`);
    renderDetailPositions();setTimeout(()=>p.fresh=false,1100);
    dialV=0;updateDial();
  },900);
}

/* ═══ celebration (§12 timeline) ═══ */
let celeTimers=[];
function settleDemo(){
  const p=positions[0];
  if(!p){toast("info","Place a pick first","Then settle it here.");return;}
  const m=MARKETS.find(x=>x.id===p.mid);
  const gross=Math.round(p.stake*(100/(p.side==="yes"?m.yes:100-m.yes)));
  const fee=Math.round(gross*0.03),net=gross-fee;
  positions=positions.filter(x=>x!==p);
  const el=document.getElementById("cele");el.classList.add("on");
  const seal=document.getElementById("cseal"),outc=document.getElementById("coutc"),
        amt=document.getElementById("camt"),rays=document.getElementById("rays"),
        cap=document.getElementById("ccap"),btns=document.getElementById("cbtns");
  [seal,outc,amt,rays,cap,btns].forEach(x=>x.classList.remove("go"));
  const yl=LANG==="sw"?"NDIO":LANG==="zh"?"是":"YES", nl=LANG==="sw"?"HAPANA":LANG==="zh"?"否":"NO";
  document.getElementById("cchip").textContent=(p.side==="yes"?yl:nl);
  cap.textContent=`${t("youwon")} — ${m.q[LANG]??m.q.en}`;
  amt.textContent="+ "+tzs(0);
  celeTimers.forEach(clearTimeout);celeTimers=[
    setTimeout(()=>seal.classList.add("go"),120),
    setTimeout(()=>outc.classList.add("go"),480),
    setTimeout(()=>{amt.classList.add("go");countUp(amt,net,800);},760),
    setTimeout(()=>rays.classList.add("go"),1560),
    setTimeout(()=>{cap.classList.add("go");btns.classList.add("go");},1800),
    setTimeout(()=>creditWin(m,p,net),900)
  ];
}
function countUp(el,target,dur){
  const t0=performance.now();
  const step=now=>{const f=Math.min(1,(now-t0)/dur),e=1-Math.pow(2,-10*f);
    el.textContent="+ "+tzs(target*e);if(f<1)requestAnimationFrame(step);else el.textContent="+ "+tzs(target);};
  requestAnimationFrame(step);
}
function creditWin(m,p,net){
  seq++;balance+=net;
  ledger.unshift({gl:"pay",title:{en:"Payout · "+m.q.en,sw:"Malipo · "+m.q.sw,zh:"派彩 · "+m.q.zh},
    ref:`PO-260707-${seq}`,amt:net,bal:balance,ts:"07 Jul, "+new Date().toTimeString().slice(0,5)+" EAT",
    method:"50P-2026-0708"+seq%100});
  updateBalance();toast("money","+ "+tzs(net),t("payout"));
}
function skipCele(){celeTimers.forEach(clearTimeout);
  ["cseal","coutc","camt","rays","ccap","cbtns"].forEach(id=>document.getElementById(id).classList.add("go"));}
function endCele(){document.getElementById("cele").classList.remove("on");renderWallet();renderDetailPositions();}

/* ═══ wallet ═══ */
const LG={dep:["dep","var(--yes)"],stk:["target","var(--ink)"],pay:["trophy","var(--gold-l)"]};
function renderWallet(){
  document.getElementById("bal2").textContent=tzs(balance);
  const pts=ledger.slice().reverse().map(l=>Math.min(92,Math.max(8,(l.bal/2000))));
  document.getElementById("wspark").innerHTML=pts.length>1?sparkSvg(pts,420,34)+
    `<div class="mono" style="font-size:9.5px;color:var(--muted);letter-spacing:.12em;text-transform:uppercase;margin-top:4px">30d</div>`:"";
  document.getElementById("ledger").innerHTML=ledger.map((l,i)=>{
    const [g,c]=LG[l.gl];
    return `<div class="lrow" onclick="toggleReceipt(${i})">
      <span class="ic" style="color:${c}">${G[g]}</span>
      <span class="m"><span class="t">${l.title[LANG]??l.title.en}</span><span class="r">${l.ref} · ${l.ts}</span></span>
      <span><span class="a" style="color:${l.amt>=0?(l.gl==="pay"?"var(--gold-l)":"var(--yes)"):"var(--ink)"}">${l.amt>=0?"+ ":"− "}${tzs(Math.abs(l.amt))}</span>
      <span class="b" style="display:block">${tzs(l.bal)}</span></span></div>
      <div class="ldr" id="ldr-${i}"><div class="in"><span>${l.method}</span>
        <button class="btn btn-ghost ia btn-sm" onclick="event.stopPropagation();copyRef('${l.ref}')">${G.copy} ${l.ref}</button></div></div>`;
  }).join("");
  document.getElementById("wpos").innerHTML=positions.length?positions.map(posHtml).join(""):
    `<div style="color:var(--muted);font-size:13px">${t("posNote")}</div>`;
}
function toggleReceipt(i){document.getElementById("ldr-"+i).classList.toggle("open");}
function copyRef(r){try{navigator.clipboard.writeText(r);}catch(e){}toast("info",t("copied"),r);}
function updateBalance(){document.getElementById("bal").textContent=tzs(balance);
  const b2=document.getElementById("bal2");if(b2)b2.textContent=tzs(balance);}

/* ═══ toasts ═══ */
function toast(kind,title,body){
  const el=document.createElement("div");el.className="toast "+kind;
  el.style.color=kind==="money"?"var(--gold)":kind==="err"?"var(--no)":kind==="ok"?"var(--yes)":"var(--brand)";
  const dur=kind==="err"?8:kind==="money"?6:5;
  el.innerHTML=`<div style="color:var(--ink)"><b style="font-size:14px">${title}</b>
    <div style="font-size:12.5px;color:var(--muted)">${body}</div></div>
    <span class="drain" style="animation-duration:${dur}s"></span>`;
  const host=document.getElementById("toasts");host.appendChild(el);
  while(host.children.length>3)host.firstChild.remove();
  el.addEventListener("mouseenter",()=>el.querySelector(".drain").style.animationPlayState="paused");
  el.addEventListener("mouseleave",()=>el.querySelector(".drain").style.animationPlayState="running");
  setTimeout(()=>el.remove(),dur*1000);
}

/* ═══ live ticks + tipping wobble + freshness ═══ */
setInterval(()=>{
  if(!connected){staleSince+=4;
    const s=document.getElementById("stale");
    s.style.color=staleSince<30?"var(--aqua)":staleSince<120?"var(--gold-l)":"var(--no)";
    document.getElementById("staletxt").textContent=t("stale",staleSince);return;}
  const m=MARKETS[Math.floor(Math.random()*MARKETS.length)];
  const was=m.yes;m.yes=Math.max(5,Math.min(95,m.yes+(Math.random()<.5?-1:1)));
  if(m.yes===was)return;
  m.spark.push(m.yes);m.spark.shift();m.move+=(m.yes-was);
  document.querySelectorAll(`[data-bar="${m.id}"] .y`).forEach(b=>b.style.width=m.yes+"%");
  const fy=document.querySelectorAll(`[data-num="y-${m.id}"]`),fn=document.querySelectorAll(`[data-num="n-${m.id}"]`);
  fy.forEach(e=>{e.textContent=m.yes+"%";e.classList.remove("flash");void e.offsetWidth;e.classList.add("flash");});
  fn.forEach(e=>{e.textContent=(100-m.yes)+"%";e.classList.remove("flash");void e.offsetWidth;e.classList.add("flash");});
  if((was-50)*(m.yes-50)<=0&&!m.wobbled){m.wobbled=true;
    document.querySelectorAll(`[data-bar="${m.id}"]`).forEach(b=>{b.classList.remove("wob");void b.offsetWidth;b.classList.add("wob");});}
},4000);
function toggleConn(){connected=!connected;staleSince=0;
  document.body.classList.toggle("offline",!connected);
  document.getElementById("connbtn").textContent=connected?t("simulate disconnect"):t("simulate reconnect");
  if(connected){toast("info",t("recon"),"");
    document.querySelectorAll("[data-num]").forEach(e=>{e.classList.remove("flash");void e.offsetWidth;e.classList.add("flash");});}
  else{document.getElementById("stale").style.color="var(--aqua)";
    document.getElementById("staletxt").textContent=t("stale",0);}
}

/* ═══ ticker ═══ */
function renderTicker(){
  const items=[
    `<span class="live">● LIVE</span>`,
    `AK ${t("won")} <b class="y">YES</b> · Simba SC · <b>TZS 180K</b>`,
    `ZM ${t("predicted")} <b class="n">NO</b> · USD/TZS &lt; 2,650`,
    `Mvua za masika ${t("closes")} · 96h`,
    `FH ${t("won")} <b class="y">NDIO</b> · Long rains · <b>TZS 46.8K</b>`,
    `BTC $100K — <b class="y">48%</b> / <b class="n">52%</b> · TIPPING`,
  ];
  document.getElementById("ticker").innerHTML=[...items,...items].map(s=>`<span>${s}</span>`).join("");
}

/* ═══ nav + i18n apply ═══ */
function go(view){
  ["board","detail","wallet"].forEach(v=>document.getElementById("view-"+v).classList.toggle("on",v===view));
  document.getElementById("tab-board").setAttribute("aria-current",view!=="wallet"?"page":"false");
  document.getElementById("tab-wallet").setAttribute("aria-current",view==="wallet"?"page":"false");
  if(view==="wallet")renderWallet();
  if(view==="board")renderBoard();
  window.scrollTo({top:0});
}
function applyI18n(){
  document.querySelectorAll("[data-i]").forEach(el=>{const k=el.getAttribute("data-i")||el.textContent.trim().toLowerCase();
    el.setAttribute("data-i",k);el.textContent=t(k);});
  document.getElementById("q").placeholder=t("searchPh");
  renderSortMenu();renderTicker();
  document.getElementById("connbtn").textContent=connected?t("simulate disconnect"):t("simulate reconnect");
}
function setLang(l,btn){LANG=l;
  document.querySelectorAll(".lang button").forEach(b=>b.setAttribute("aria-pressed",b===btn));
  applyI18n();renderBoard();
  if(document.getElementById("view-detail").classList.contains("on"))renderDetail();
  if(document.getElementById("view-wallet").classList.contains("on"))renderWallet();
}

/* ═══ boot ═══ */
applyI18n();renderBoard();updateBalance();
