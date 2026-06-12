import postmark from "postmark";
const client = new postmark.ServerClient(process.env.POSTMARK_API_KEY || "701daae0-b109-40e0-80bb-b9ad79e59cc0");
const TO = process.argv[2] || "ali.sheib@50pick.tz";

const G="#e8c05a",GM="#c49a2e",GD="#8a6c1a",BG="#0c0e28",C="#161845",B="#2b2e63",L="#7060d0",T="#f0eff4",TM="#c8c6d8",TS="#8b89a8",TF="#5c5a78",Y="#2db872",R="#c04848";
const mk=`<img src="https://kipindi-production.up.railway.app/icons/mark-color-512.png" width="56" height="56" alt="50pick" style="display:block;margin:0 auto;border:0">`;

const wrap=(body)=>`<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;background:${BG};font-family:Segoe UI,Helvetica,Arial,sans-serif"><table cellpadding="0" cellspacing="0" width="100%" style="background:${BG}"><tr><td align="center" style="padding:32px 16px"><table cellpadding="0" cellspacing="0" width="100%" style="max-width:560px"><tr><td align="center" style="padding:0 0 24px">${mk}<div style="margin-top:10px;font-size:20px;font-weight:800"><span style="color:${T}">50pick</span><span style="color:${TM};font-weight:500;font-size:14px">.tz</span></div></td></tr><tr><td><div style="height:3px;background:linear-gradient(90deg,${GM},${G},${GM});border-radius:3px 3px 0 0"></div></td></tr><tr><td style="background:${C};border:1px solid ${B};border-top:none;border-radius:0 0 12px 12px;padding:32px 28px 28px">${body}</td></tr><tr><td style="padding:28px 0 0;text-align:center"><div style="width:42px;height:2px;background:${G};border-radius:2px;margin:0 auto 16px"></div><p style="margin:0;font-family:monospace;font-size:10px;letter-spacing:0.16em;text-transform:uppercase;color:${GM}">50pick.tz <span style="color:${R}">&middot;</span> <span style="color:${TS}">Soko la Utabiri</span></p><p style="margin:12px 0 0;font-size:11px;color:${TF};line-height:1.7">18+ &middot; Licensed by Gaming Board of Tanzania<br>Helpline +255 22 211 5811 &middot; <a href="mailto:support@50pick.tz" style="color:${TS};text-decoration:none">support@50pick.tz</a></p></td></tr></table></td></tr></table></body></html>`;

const ey=(en,sw)=>`<p style="margin:0 0 6px;font-family:monospace;font-size:10px;text-transform:uppercase;letter-spacing:0.16em;font-weight:700;color:${GM}">${en}</p>`+(sw?`<p style="margin:0 0 2px;font-size:11px;font-style:italic;color:${TS}">${sw}</p>`:"");
const h1=(t,c)=>`<h1 style="margin:0 0 12px;font-size:24px;font-weight:700;color:${c||T};line-height:1.15;letter-spacing:-0.02em">${t}</h1>`;
const sub=(t)=>`<p style="margin:0 0 16px;font-size:13px;color:${TM};line-height:1.55">${t}</p>`;
const subSw=(t)=>`<p style="margin:-10px 0 16px;font-size:12px;font-style:italic;color:${TS}">${t}</p>`;
const rows=(r)=>`<table cellpadding="0" cellspacing="0" width="100%" style="border-top:1px solid ${B};margin-top:20px">${r.map(d=>{const vc=d.t==="good"?Y:d.t==="bad"?R:T;return`<tr><td style="padding:11px 0;border-bottom:1px solid ${B};font-family:monospace;font-size:10px;text-transform:uppercase;letter-spacing:0.14em;color:${TF}">${d.l}</td><td style="padding:11px 0;border-bottom:1px solid ${B};text-align:right;font-family:monospace;font-size:14px;font-weight:700;color:${vc}">${d.v}</td></tr>`;}).join("")}</table>`;
const cta=(href,label)=>`<table cellpadding="0" cellspacing="0" width="100%" style="margin-top:24px"><tr><td align="center"><a href="${href}" style="display:inline-block;padding:15px 40px;background:${GM};color:${BG};font-size:14px;font-weight:700;border-radius:999px;text-decoration:none;border-top:1px solid ${G};border-bottom:2px solid ${GD}">${label}</a></td></tr></table>`;

const emails = [
  {
    subject: "1/5 Welcome to 50pick \u00b7 Karibu",
    html: wrap(ey("Welcome","Karibu")+h1("Welcome to 50pick, Ali")+sub("Your account is ready. Browse markets, place your first prediction, and join the community.")+subSw("Akaunti yako iko tayari. Tazama masoko na uweke utabiri wako wa kwanza.")+cta("https://kipindi-production.up.railway.app/markets","Browse markets \u00b7 Tazama masoko")),
  },
  {
    subject: "2/5 Deposit confirmed \u00b7 TZS 25,000",
    html: wrap(ey("Deposit confirmed","Amana imethibitishwa")+h1("Funds added")+sub("Your wallet has been topped up.")+rows([{l:"Amount",v:"TZS 25,000",t:"good"},{l:"Method",v:"M-Pesa"},{l:"Reference",v:"txn_abc123xyz"},{l:"New balance",v:"TZS 125,000"}])+cta("https://kipindi-production.up.railway.app/wallet","View wallet \u00b7 Tazama pochi")),
  },
  {
    subject: '3/5 Bet placed \u00b7 YES on "Will TZS strengthen?"',
    html: wrap(ey("Bet placed","Dau limewekwa")+h1("Position open")+sub("Will the TZS strengthen against the USD by month-end?")+rows([{l:"Your pick",v:`<span style="color:${Y}">YES</span>`},{l:"Stake",v:"TZS 5,000"},{l:"Resolves",v:"2026-06-30"}])+sub("Payout is calculated at resolution from the final pool share.")+cta("https://kipindi-production.up.railway.app/positions","View positions \u00b7 Tazama madau")),
  },
  {
    subject: "4/5 You won \u00b7 TZS 12,350",
    html: wrap(ey("Position won","Umeshinda")+h1("You won TZS 12,350",G)+sub("Will the TZS strengthen against the USD by month-end?")+rows([{l:"Payout",v:"TZS 12,350",t:"good"},{l:"Net profit",v:"+TZS 7,350",t:"good"},{l:"Stake",v:"TZS 5,000"}])+cta("https://kipindi-production.up.railway.app/markets","Browse markets \u00b7 Tazama masoko")),
  },
  {
    subject: "5/5 Signed in \u00b7 Umeingia 50pick",
    html: wrap(ey("Sign-in","Umeingia")+h1("Welcome back, Ali")+sub("You just signed in to your 50pick account.")+subSw("Umeingia kwenye akaunti yako ya 50pick.")+rows([{l:"Time",v:"12 Jun 2026, 5:30 PM EAT"},{l:"IP address",v:"41.59.xxx.xxx"}])+cta("https://kipindi-production.up.railway.app/markets","Browse markets \u00b7 Tazama masoko")+`<p style="margin:16px 0 0;font-size:11px;color:${TS}">If this wasn't you, change your password immediately.</p>`),
  },
];

let sent = 0;
for (const [i, e] of emails.entries()) {
  try {
    const r = await client.sendEmail({ From: "noreply@50pick.tz", To: TO, Subject: e.subject, HtmlBody: e.html, TextBody: e.subject, MessageStream: "outbound" });
    sent++;
    console.log(`OK [${i+1}/5] ${r.MessageID}`);
  } catch (err) {
    console.error(`FAIL [${i+1}]`, err.message);
  }
}
console.log(`\nDone: ${sent}/5 sent to ${TO}`);
