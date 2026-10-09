const edit = require("./edit-lib.cjs");
process.chdir("F:/kipindi-r4i");
edit("scripts/visual-pass-r4i.test.mts", [
  [" *   §13 E35 — a self-excluded person cannot register again with the same phone or email (in-process, the memory store)\n */",
   " *   §13 E35 — a self-excluded person cannot register again with the same phone or email (in-process, the memory store)\n *   §14 R4-K's gold audit on these files: nothing on the auth pages, the paused deposit or a running break is gold but\n *       a money figure; and the code page masks the phone as every other page does\n */"],
  ["    (RG.match(/<Callout tone=\"warning\" size=\"md\">\\{endSentence\\(t\\.rg\\.(exclusionActive|breakActive), rg\\.(selfExclusionUntil|coolingOffUntil)\\)\\}<\\/Callout>/g) ?? []).length === 2",
   "    (RG.match(/<Callout tone=\"neutral\" size=\"md\" glyph=\"(lock|pause)\">\\{endSentence\\(t\\.rg\\.(exclusionActive|breakActive), rg\\.(selfExclusionUntil|coolingOffUntil)\\)\\}<\\/Callout>/g) ?? []).length === 2"],
  ["  const planted = RG.replace('<Callout tone=\"warning\" size=\"md\">{endSentence(t.rg.breakActive', '<Callout tone=\"warning\">{endSentence(t.rg.breakActive');\n  ok(\"3.1″ PLANT · the break callout back on the sm rung is reported\", (planted.match(/size=\"md\">\\{endSentence/g) ?? []).length !== 2);",
   "  const planted = RG.replace('<Callout tone=\"neutral\" size=\"md\" glyph=\"pause\">{endSentence(t.rg.breakActive', '<Callout tone=\"neutral\" glyph=\"pause\">{endSentence(t.rg.breakActive');\n  ok(\"3.1″ PLANT · the break callout back on the sm rung is reported\", (planted.match(/size=\"md\" glyph=\"(lock|pause)\">\\{endSentence/g) ?? []).length !== 2);"],
  ["console.log(`\\nvisual-pass-r4i: ${pass} passed, ${fails.length} failed\\n`);",
   `/* ══ §14 · R4-K'S GOLD AUDIT ON THESE FILES ═════════════════════════════════════════════════════════════════════════ */
section("14 · gold is money and nothing else — the auth pages, the paused deposit, a running break (R4-K's audit; DESIGN_AUTHORITY Q5 §M3 F3)");
{
  const PANEL = read("src/components/auth/auth-panel.tsx");
  const head = renderToStaticMarkup(h(AuthHeader, { eyebrow: "INGIA", title: "Karibu tena" } as never));
  ok("14.1 · EXECUTED · the auth eyebrow is the brand's ink by default, and gold is out of its map",
    /<p class="font-mono text-caption uppercase eyebrow font-bold text-brand-300">INGIA<\\/p>/.test(head) && !/gold/.test(PANEL.slice(PANEL.indexOf("export type AuthEyebrowTone"))), head);
  const AUTH = ["src/app/auth/login/page.tsx", "src/app/auth/register/register-form.tsx", "src/app/auth/forgot-password/page.tsx"].map((f) => [f, read(f)] as const);
  const goldAt = AUTH.filter(([, s]) => /gold-\\d{3}/.test(s)).map(([f]) => f);
  ok("14.2 · the sign-in, sign-up and recovery panels carry no gold: the warning glyph muted, the call to action in the brand's ink", goldAt.length === 0, goldAt.join(" · "));
  const REG = read("src/app/auth/register/page.tsx");
  const golds = REG.match(/[a-z-]*gold-\\d{3}[^"\\s]*/g) ?? [];
  ok("14.3 · the register page's bonus cards: gold only on the two money figures (.amount), the cards neutral",
    golds.length === 2 && (REG.match(/<span className="amount text-gold-300">\\{formatTzs\\((referral\\.newPlayerBonusTzs|invite\\.bonusAmountTzs)\\)\\}<\\/span>/g) ?? []).length === 2
      && !/var\\(--gold-500\\)/.test(REG), golds.join(" · "));
  const DEP = read("src/app/wallet/deposit/page.tsx");
  ok("14.4 · the deposit-paused tiles (a break, a held wallet) are neutral, the lock kept — the warning tone is struck in gilt",
    (DEP.match(/<Callout\\s+tone="neutral"\\s+layout="stack"\\s+glyph="lock"/g) ?? []).length === 2 && !/<Callout\\s+tone="warning"\\s+layout="stack"\\s+glyph="lock"/.test(DEP)
      && /--warning-fg:\\s*var\\(--gilt\\)/.test(CSS));
  ok("14.5 · the code page masks the phone with the platform's one mask (\\"+255••••84\\", as the hub and the hero)",
    /const masked = phone \\? maskPhone\\(phone\\) : "\\+255••••";/.test(read("src/app/auth/otp/page.tsx")));
  const plant = REG.replace('<div className="overflow-hidden rounded-xl border border-border bg-bg-elevated">', '<div className="overflow-hidden rounded-xl border border-gold-500/40 bg-gold-500/10">');
  ok("14.5′ PLANT · a gilt card back is reported", (plant.match(/[a-z-]*gold-\\d{3}[^"\\s]*/g) ?? []).length !== 2);
}

console.log(\`\\nvisual-pass-r4i: \${pass} passed, \${fails.length} failed\\n\`);`],
]);
