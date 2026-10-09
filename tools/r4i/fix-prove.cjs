const fs = require("fs");
let s = fs.readFileSync("prove-r4i.mjs", "utf8");
const oldA = `"<Callout tone=\\"warning\\" size=\\"md\\">{endSentence(t.rg.breakActive, rg.coolingOffUntil)}</Callout>", "<Callout tone=\\"warning\\">{endSentence(t.rg.breakActive, rg.coolingOffUntil)}</Callout>"`;
const newA = `"<Callout tone=\\"neutral\\" size=\\"md\\" glyph=\\"pause\\">{endSentence(t.rg.breakActive, rg.coolingOffUntil)}</Callout>", "<Callout tone=\\"neutral\\" glyph=\\"pause\\">{endSentence(t.rg.breakActive, rg.coolingOffUntil)}</Callout>"`;
if (!s.includes(oldA)) { console.error("anchor A"); process.exit(1); }
s = s.replace(oldA, newA);
const marker = "  // §13 — the E35 proof can fail";
const extra = `  // §14 — gold is money
  ["the auth eyebrow gold by default again", "src/components/auth/auth-panel.tsx", "  tone = \\"brand\\",", "  tone = \\"brand\\" as never as \\"brand\\",\n  _gold = \\"text-gold-300\\",", "14.1 ·"],
  ["the sign-in CTA gilt again", "src/app/auth/login/page.tsx", "border border-brand-500/60 bg-brand-500/10 font-display font-bold text-[12.5px] text-brand-300 hover:bg-brand-500/20", "border border-gold-700 bg-gold-500/10 font-display font-bold text-[12.5px] text-gold-300 hover:bg-gold-500/20", "14.2 ·"],
  ["the invite card gilt again", "src/app/auth/register/page.tsx", "            <div className=\\"overflow-hidden rounded-xl border border-border bg-bg-elevated\\">\n              <div className=\\"flex items-center gap-3 p-3.5\\">\n                <IconPlate", "            <div className=\\"overflow-hidden rounded-xl border border-gold-500/40 bg-gold-500/10\\">\n              <div className=\\"flex items-center gap-3 p-3.5\\">\n                <IconPlate", "14.3 ·"],
  ["the paused-deposit tile struck in gilt again", "src/app/wallet/deposit/page.tsx", "          <Callout\n            tone=\\"neutral\\"\n            layout=\\"stack\\"\n            glyph=\\"lock\\"\n            role=\\"status\\"\n            titleAs=\\"h2\\"\n            title={t.wallet.depositPausedTitle}\n            bodyWidth=\\"full\\"", "          <Callout\n            tone=\\"warning\\"\n            layout=\\"stack\\"\n            glyph=\\"lock\\"\n            role=\\"status\\"\n            titleAs=\\"h2\\"\n            title={t.wallet.depositPausedTitle}\n            bodyWidth=\\"full\\"", "14.4 ·"],
  ["the code page's star mask again", "src/app/auth/otp/page.tsx", "  const masked = phone ? maskPhone(phone) : \\"+255••••\\";", "  const masked = phone ? phone.slice(0, 4) + \\"*****\\" + phone.slice(-2) : \\"+255*****\\";", "14.5 ·"],
`;
if (!s.includes(marker)) { console.error("marker"); process.exit(1); }
s = s.replace(marker, extra + marker);
fs.writeFileSync("prove-r4i.mjs", s);
console.log("ok");
