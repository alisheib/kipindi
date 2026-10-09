import { edit } from "./edit-lib.mjs";
const F = "scripts/visual-pass-r5k.test.mts";
edit(F, [
  [`  const drawn = /<\/PageHeader>|\/>\s*<WithdrawBalanceGhost t=\{t\} \/>\s*<\/PageHero>/.test(ghost) && ghost.includes("<WithdrawFormGhost t={t} />") && !ghost.includes("BrandSpinner");`,
   `  const drawn = /\/>\s*<WithdrawBalanceGhost t=\{t\} \/>\s*<\/PageHero>/.test(ghost) && ghost.includes("<WithdrawFormGhost t={t} />") && !ghost.includes("BrandSpinner");`],
  [`  ok("1.4′ CONTROL · rendered, the eight rows are there, each id drawn in seven or six nowrap runs", count(html, '<div class="flex items-start justify-between gap-4 px-4 py-3">') === 8 && count(html, '<span class="whitespace-nowrap">0000</span>') === 13);`,
   `  ok("1.4′ CONTROL · rendered, the eight rows are there, the two ids drawn in seven and six nowrap runs (11 of them all zeros)", count(html, '<div class="flex items-start justify-between gap-4 px-4 py-3">') === 8 && count(html, '<span class="whitespace-nowrap">0000</span>') === 11 && count(html, "<wbr/>") === 11);`],
  [`  const { methodLabel } = req("../src/lib/wallet/receipts.ts") as { methodLabel: unknown };
  void methodLabel;
`, ``],
  [`    if (hintCls(page) !== hintCls(ghost) || ghostShape(hintText(page)) !== hintText(ghost)) wrong.push(\`\${l} hint \${j(hintText(ghost)).slice(0, 60)}\`);`,
   `    if (hintCls(page) !== hintCls(ghost) || ghostShape(hintText(page)) !== ghostShape(hintText(ghost)) || hintText(page) === hintText(ghost)) wrong.push(\`\${l} hint \${j(hintText(ghost)).slice(0, 60)}\`);`],
  [`  ok("2.3′ CONTROL · a ghost hint with the figures typed in (not shapes) is told apart — the check compares shapes", ghostShape("TZS 1,000") !== "TZS 1,000");`,
   `  ok("2.3′ CONTROL · the ghost's limits are shapes: the hint differs from the page's only in its digits (\\"TZS 0,000\\" where the page prints \\"TZS 1,000\\")", ghostShape("TZS 1,000") === "TZS 0,000" && U.fill("{min}", MF.LIMIT_SHAPES) === "0,000");`],
  [`  const stats = (s: string) => [...s.matchAll(/<Stat\s+([\s\S]*?)\/>/g)].map((m) => {
    const p = m[1];
    const v = (k: string) => new RegExp(\`\${k}="([^"]+)"\`).exec(p)?.[1] ?? "";
    return [v("size"), v("labelStyle"), v("boxed"), v("font"), v("className"), v("labelClassName")].join("|");
  });`,
   `  const stats = (s: string) => jsxTags(s, "Stat").map((p) => [p.size, p.labelStyle, p.boxed, p.font, p.className, p.labelClassName].join("|"));`],
  [`  const want = titles.map((t) => t.replace(" · ", " · "));
`, `  const want = titles;
`],
  [`  const rowCls = (s: string) => geometry(/className=\{\`group relative flex items-center gap-3 overflow-hidden rounded-xl border bg-bg-elevated p-3\.5 transition-colors/.test(s) ? "relative flex items-center gap-3 overflow-hidden rounded-xl border bg-bg-elevated p-3.5" : "");
  const rowOk = rowCls(code(FILES.profilePage)) === geometry("relative flex items-center gap-3 overflow-hidden rounded-xl border border-border bg-bg-elevated p-[14px]".replace(" border-border", ""))
    && ghost.includes`,
   `  const rowOk = code(FILES.profilePage).includes("className={\`group relative flex items-center gap-3 overflow-hidden rounded-xl border bg-bg-elevated p-3.5 transition-colors")
    && norm("relative flex items-center gap-3 overflow-hidden rounded-xl border p-3.5") === norm("relative flex items-center gap-3 overflow-hidden rounded-xl border p-[14px]")
    && ghost.includes`],
  [`    order === "" && inOrder(squash(code(FILES.profile).replace(/(\{\/\* The achievements:[\s\S]*?<\/section>)\s*(\{\/\* Settings grid skeleton \*\/\}[\s\S]*?<\/section>)/, "$2\n$1")), ['<section className="relative overflow-hidden', "{t.profile.achievements}", "{t.profile.account}"]) !== "");`,
   `    order === "" && inOrder(squash(decomment(raw(FILES.profile).replace(/(\{\/\* The achievements:[\s\S]*?<\/section>)\s*(\{\/\* Settings grid skeleton \*\/\}[\s\S]*?<\/section>)/, "$2\n$1"))), ['<section className="relative overflow-hidden', "{t.profile.achievements}", "{t.profile.account}"]) !== "");`],
  [`    inOrder(squash(code(FILES.performance).replace(/(\{\/\* The net P&L panel[\s\S]*?<\/section>)\s*(\{\/\* P&L over time[\s\S]*?<\/section>)/, "$2\n$1")), GHOST) !== "");`,
   `    inOrder(squash(decomment(raw(FILES.performance).replace(/(\{\/\* The net P&L panel[\s\S]*?<\/section>)\s*(\{\/\* P&L over time[\s\S]*?<\/section>)/, "$2\n$1"))), GHOST) !== "");`],
  [`  ok(\`7.2 · the chart is the svg's own shape — a \${svg?.[1]} × \${svg?.[2]} box at the panel's width (\\`aspect-[\${ratio}]\\`, \${svg ? Math.round(1016 * 240 / 720 - 1016 * 240 / 720 + (1016 - 50) / 3) : "?"}px at 1280, not 200) — with the page's HTML twin line under \\`sm\\`\`,`,
   `  ok(\`7.2 · the chart is the svg's own shape — a \${svg?.[1]} × \${svg?.[2]} box at the panel's width (\\`aspect-[\${ratio}]\\`, \${Math.round((1016 - 50) / 3)}px at 1280, not 200) — with the page's HTML twin line under \\`sm\\`\`,`],
  [`  const stats = (s: string) => [...s.matchAll(/<Stat\s+([^>]*?)label=/g)].map((m) => squash(m[1]).replace(/money\s*/, "").replace(/font="mono"\s*/, "").trim());`,
   `  const stats = (s: string) => jsxTags(s, "Stat").map((p) => [p.size, p.labelStyle, p.boxed ?? "-"].join("|"));`],
]);
