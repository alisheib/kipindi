// R5-G port · byte identity of the moved ghosts. The tip's (9677a3f5) DepositGhost and withdraw drawing are written beside
// the worktree's for the length of this run (module resolution needs them under src/), rendered in the root layout's
// providers in sw, en and zh, compared with R5-G's ported drawings, and removed again (sha-checked: nothing else touched).
// Run from F:\kipindi-r5g:  npx tsx <this file>
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { existsSync, unlinkSync, writeFileSync } from "node:fs";

const ROOT = "F:/kipindi-r5g";
const req = createRequire(`${ROOT}/package.json`);
const TIP = "9677a3f5";
const tmp = {
  dep: `${ROOT}/src/app/wallet/deposit/__tip_deposit_ghost.tsx`,
  wd: `${ROOT}/src/app/wallet/withdraw/__tip_withdraw_loading.tsx`,
};
const show = (p: string) => execFileSync("git", ["-C", ROOT, "show", `${TIP}:${p}`], { encoding: "utf8" });
let failed = 0;
try {
  writeFileSync(tmp.dep, show("src/app/wallet/deposit/deposit-ghost.tsx"));
  writeFileSync(tmp.wd, show("src/app/wallet/withdraw/loading.tsx"));
  const React = req("react") as typeof import("react");
  const h = React.createElement;
  const { renderToStaticMarkup } = req("react-dom/server") as typeof import("react-dom/server");
  const { I18nProvider } = req(`${ROOT}/src/lib/i18n.tsx`) as { I18nProvider: unknown };
  const { AppRouterContext } = req("next/dist/shared/lib/app-router-context.shared-runtime") as { AppRouterContext: import("react").Context<unknown> };
  const { PathnameContext } = req("next/dist/shared/lib/hooks-client-context.shared-runtime") as { PathnameContext: import("react").Context<string | null> };
  const ROUTER = { push() {}, replace() {}, refresh() {}, prefetch() {}, back() {}, forward() {}, hmrRefresh() {} };
  const inApp = (path: string, l: string, el: unknown) => renderToStaticMarkup(h(AppRouterContext.Provider, { value: ROUTER },
    h(PathnameContext.Provider, { value: path }, h(I18nProvider as never, { initial: l } as never, el as never))));
  const tipDep = (req(tmp.dep) as { DepositGhost: unknown }).DepositGhost;
  const tipWd = (req(tmp.wd) as { default: unknown }).default;
  const { DepositGhost } = req(`${ROOT}/src/app/wallet/deposit/deposit-ghost.tsx`) as { DepositGhost: unknown };
  const { WithdrawGhost } = req(`${ROOT}/src/app/wallet/withdraw/withdraw-ghost.tsx`) as { WithdrawGhost: unknown };
  const { dict } = req(`${ROOT}/src/lib/i18n-dict.ts`) as { dict: Record<string, Record<string, Record<string, string>>> };
  /** The markup with the head's two lines' words taken out, so a journey render can be compared shape for shape. */
  const headless = (s: string) => s.replace(/(<p class="[^"]*\beyebrow\b[^"]*">(?:<svg[\s\S]*?<\/svg>)?)[^<]*(<\/p>)/, "$1‹eyebrow›$2").replace(/(<h1[^>]*>)[^<]*(<\/h1>)/, "$1‹h1›$2");
  for (const l of ["sw", "en", "zh"]) {
    const tipD = inApp("/wallet/deposit", l, h(tipDep as never)), newDc = inApp("/wallet/deposit", l, h(DepositGhost as never, { journey: false } as never));
    const newDj = inApp("/wallet/deposit", l, h(DepositGhost as never, { journey: true } as never));
    const tipW = inApp("/wallet/withdraw", l, h(tipWd as never)), newWc = inApp("/wallet/withdraw", l, h(WithdrawGhost as never, { journey: false } as never));
    const newWj = inApp("/wallet/withdraw", l, h(WithdrawGhost as never, { journey: true } as never));
    const rows: Array<[string, boolean]> = [
      [`deposit classic: byte-identical to the tip's (${tipD.length} B)`, tipD === newDc],
      [`deposit journey: the tip's markup but for the eyebrow and h1 words ("${dict[l].wallet.title}" / "${dict[l].journey.depositAction}")`, headless(tipD) === headless(newDj) && newDj.includes(`>${dict[l].journey.depositAction}</h1>`)],
      [`withdraw classic: byte-identical to the tip's (${tipW.length} B)`, tipW === newWc],
      [`withdraw journey: the tip's markup but for the eyebrow and h1 words ("${dict[l].wallet.title}" / "${dict[l].journey.withdrawAction}")`, headless(tipW) === headless(newWj) && newWj.includes(`>${dict[l].journey.withdrawAction}</h1>`)],
    ];
    for (const [name, okk] of rows) { if (!okk) failed++; console.log(`${okk ? "ok  " : "FAIL"} ${l} · ${name}`); }
  }
} finally {
  for (const p of Object.values(tmp)) if (existsSync(p)) unlinkSync(p);
}
console.log(failed ? `GHOST IDENTITY — ${failed} failed` : "GHOST IDENTITY — every check passed; the temporary tip copies removed");
process.exitCode = failed ? 1 : 0;
