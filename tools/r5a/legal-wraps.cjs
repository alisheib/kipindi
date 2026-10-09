const { balance } = require("./balance-sim.cjs");
const { w } = require("./sora-w.cjs");
const T = {
  terms: { en: "Terms of Service", sw: "Masharti ya Huduma" },
  privacy: { en: "Privacy Policy", sw: "Sera ya Faragha" },
  rg: { en: "Responsible Gambling Policy", sw: "Sera ya Mchezo Salama" },
  aml: { en: "AML & KYC Policy", sw: "Sera ya Kuzuia Uoshaji wa Fedha na KYC" },
  rules: { en: "Game Rules", sw: "Kanuni za Michezo" },
  updown: { en: "Up & Down Rules", sw: "Kanuni za Juu na Chini" },
  yesno: { en: "YES/NO Market Rules", sw: "Kanuni za Masoko ya NDIO/HAPANA" },
  agent: { en: "Agent terms", sw: "Masharti ya wakala" },
};
const COLS = (process.env.COLS || "184,224,254,276").split(",").map(Number);
for (const [k, o] of Object.entries(T)) for (const [l, s] of Object.entries(o)) {
  const pair = s.split(" ").slice(-2).join(" ");
  console.log(`${k}.${l} ${JSON.stringify(s)}  pair "${pair}" ${w(pair).toFixed(0)}px`);
  for (const W of COLS) {
    const a = balance(s, W, false), b = balance(s, W, true);
    const lone = a.lines.length > 1 && !a.lines[a.lines.length - 1].includes(" ");
    const show = (r) => r.lines.join(" / ") + (r.overflow ? "  OVERFLOW" : "");
    console.log(`   ${String(W).padStart(4)}  now: ${show(a)}${lone ? "   <- ONE WORD ALONE" : ""}`);
    if (show(a) !== show(b)) console.log(`         bound: ${show(b)}`);
  }
}
