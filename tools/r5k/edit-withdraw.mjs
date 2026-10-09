// The withdraw ghost's hunks. Applied to this tip's `withdraw/loading.tsx`; with `--file <rel>` to another copy (the port onto
// R5-G's `withdraw-ghost.tsx`, which moved this drawing there byte for byte but for the head's two names).
import { edit } from "./edit-lib.mjs";
const i = process.argv.indexOf("--file");
const file = i > 0 ? process.argv[i + 1] : "src/app/wallet/withdraw/loading.tsx";
edit(file, [
  [`import { BrandSpinner } from "@/components/brand";
`, ``],
  [`import { PageContainer } from "@/components/layout/page-container";
`, `import { PageContainer } from "@/components/layout/page-container";
import { WithdrawBalanceGhost, WithdrawFormGhost } from "@/app/wallet/money-form-ghost";
`],
  [`          ⚠️ The page's hero also holds an "Available" balance block on the right, which a
          skeleton must NOT draw: it would be a number a player could read as their balance
          before one has been fetched (§C — the interface never states a money fact it does not
          have). The hero renders one child here and two there; that asymmetry is deliberate. */}
`, `          ⚠️ The page's hero also holds an "Available" balance block, whose NUMBER a skeleton must not
          draw: it would be a number a player could read as their balance before one has been
          fetched (§C — the interface never states a money fact it does not have).
          ⭐ ITS BOX IS DRAWN (round 5's follow-up, R5-K, 2026-10-09): on a phone the block stacks under
          the head (the page's \`flex-col gap-2\`), so a hero drawn without it was 48px short and the
          form landed that much lower — the hero takes the page's own \`contentClassName\` and the
          block's shape (\`WithdrawBalanceGhost\`: its label set and not shown, a bar on its figure's
          22px line). And the form is drawn, not a spinner panel (\`WithdrawFormGhost\`). */}
`],
  [`      <PageHero contentClassName="relative z-10 p-5 lg:p-6 flex items-end justify-between gap-4">
`, `      <PageHero contentClassName="relative z-10 p-5 lg:p-6 flex flex-col items-start gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
`],
  [`          subtitle={t.wallet.mobileMoneyOnly}
        />
      </PageHero>
      <div className="grid place-items-center py-10 rounded-lg border border-border bg-bg-elevated/40">
        <BrandSpinner size={56} />
      </div>
`, `          subtitle={t.wallet.mobileMoneyOnly}
        />
        <WithdrawBalanceGhost t={t} />
      </PageHero>
      {/* The form a verified player is shown (\`money-form-ghost.tsx\` says what a KYC-gated reader sees instead). */}
      <WithdrawFormGhost t={t} />
`],
]);
