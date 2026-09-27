// Landing v3 · hero v3 — the SERVED HTML of the hero, per locale (spec hero-v3 §11.2). A green build is not a
// render and a render is not the markup: SWC has dropped spaces between JSX expressions on production, so this
// reads the bytes the server sends, not the DOM a browser repairs.
//   BASE=http://localhost:3057 OUT=<dir> node scripts/qa/landing-v3/hero-served.mjs
// Exit 1 on any failed check.
import { writeFileSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.BASE || "http://localhost:3057";
const OUT = process.env.OUT || ".qa-shots/landing-v3/hero";
const RAILS = ["M-Pesa", "Airtel Money", "HaloPesa", "Mixx by Yas"];
const WANT = {
  sw: { claim: "Soko la kwanza la utabiri lenye leseni Tanzania", yes: "NDIO", conn: "au", no: "HAPANA" },
  en: { claim: "Tanzania’s first licensed prediction market", yes: "YES", conn: "or", no: "NO" },
  zh: { claim: "坦桑尼亚首家持牌预测市场", yes: "是", conn: "还是", no: "否" },
};
let fails = 0;
const check = (name, ok, detail = "") => { if (!ok) fails++; console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`); };
const decode = (s) => s.replace(/&#x27;|&#39;/g, "'").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">");

for (const [loc, want] of Object.entries(WANT)) {
  const res = await fetch(BASE + "/", { headers: loc === "sw" ? {} : { cookie: `kp-locale=${loc}` } });
  const html = await res.text();
  const a = html.indexOf('data-band="hero"');
  const b = html.indexOf("data-band=", a + 20);
  const hero = a >= 0 ? html.slice(a, b > a ? b : a + 60000) : "";
  writeFileSync(join(OUT, `hero-served-${loc}.html`), hero);
  const text = decode(hero.replace(/<!--[\s\S]*?-->/g, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " "));
  check(`${loc} the hero is in the served HTML`, hero.length > 1000, `${hero.length} bytes`);
  // the h1: the side words, the connective, the question mark — with their spaces intact (sw/en)
  const h1 = (hero.match(/<h1[\s\S]*?<\/h1>/) || [""])[0];
  const h1text = decode(h1.replace(/<!--[\s\S]*?-->/g, "").replace(/<[^>]+>/g, ""));
  const wantH1 = loc === "zh" ? `${want.yes}${want.conn}${want.no}？` : `${want.yes} ${want.conn} ${want.no}?`;
  check(`${loc} h1 reads "${wantH1}" with its spaces`, h1text.trim() === wantH1, `got "${h1text.trim()}"`);
  check(`${loc} claim in state P`, text.includes(want.claim), want.claim);
  check(`${loc} no warning sentence, no "Tangu", no "Dar es Salaam", no "EST."`,
    !/kamari|stops being fun|不再有趣|Tangu|Dar es Salaam|EST\./i.test(text));
  const langs = [...hero.matchAll(/lang="([a-z-]+)"/g)].map((m) => m[1]);
  check(`${loc} one lang="en" (the sign-off), no other lang`, langs.length === 1 && langs[0] === "en", langs.join(","));
  check(`${loc} a tel: link`, /href="tel:[0-9+]+"/.test(hero));
  const missing = RAILS.filter((r) => !text.includes(r));
  check(`${loc} the rail row names the four wallets`, missing.length === 0, missing.length ? `missing ${missing.join(", ")}` : RAILS.join(", "));
  check(`${loc} no "official" / "rasmi" / "官方" in the hero`, !/\bofficial\b|\brasmi\b|官方/i.test(text));
}
console.log(fails ? `hero-served: ${fails} failure(s)` : "hero-served: CLEAN");
process.exit(fails ? 1 : 0);
