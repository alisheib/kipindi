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
// the legal header's title column below 640: viewport - 32 (page gutters) - 2 (border) - 48 (px-5) - 54 (40px sigil + 14 gap)
const widths = [320, 360, 390, 412];
console.log("title".padEnd(48), widths.map((v) => String(v - 136).padStart(6)).join(""));
for (const [k, o] of Object.entries(T)) for (const [l, s] of Object.entries(o)) {
  const tw = w(s);
  console.log(`${k}.${l} ${JSON.stringify(s)}`.padEnd(42), tw.toFixed(1).padStart(6), widths.map((v) => { const c = v - 136; const d = tw - c; return (d > 0 ? `+${d.toFixed(0)}` : "ok").padStart(6); }).join(""));
}
