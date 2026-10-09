const { edit } = require('./ed1.cjs');
const NOTE = `{/* An id breaks in whole runs of four, its lines balanced, never one or two characters alone (round 4 of the visual
              pass, 2026-10-09, S9's note G20: \`break-all\` broke a long reference wherever the line ran out). \`keepIdRuns\`. */}`;
edit('src/app/wallet/deposit/return/page.tsx', [
  [`import { Cash } from "@/components/ui/cash";\n`, `import { Cash } from "@/components/ui/cash";\nimport { keepIdRuns } from "@/components/ui/keep-words";\n`],
  [`          <Row label={t.wallet.transactionId}>
            <span className="font-mono text-text break-all">{outcome.txn.id}</span>
          </Row>
          {outcome.txn.providerRef && (
            <Row label={t.wallet.gatewayReference}>
              <span className="font-mono text-text break-all">{outcome.txn.providerRef}</span>
            </Row>
          )}`, `          <Row label={t.wallet.transactionId}>
            ${NOTE}
            <span className="block font-mono text-text text-balance">{keepIdRuns(outcome.txn.id)}</span>
          </Row>
          {outcome.txn.providerRef && (
            <Row label={t.wallet.gatewayReference}>
              <span className="block font-mono text-text text-balance">{keepIdRuns(outcome.txn.providerRef)}</span>
            </Row>
          )}`],
]);
edit('src/app/wallet/receipt/[id]/page.tsx', [
  [`import { Cash } from "@/components/ui/cash";\n`, `import { Cash } from "@/components/ui/cash";\nimport { keepIdRuns } from "@/components/ui/keep-words";\n`],
  [`        <Row label={t.wallet.transactionId}>
          <span className="font-mono break-all">{txn.id}</span>
        </Row>
        {txn.providerRef && (
          <Row label={t.wallet.gatewayReference}>
            <span className="font-mono break-all">{txn.providerRef}</span>
          </Row>
        )}`, `        <Row label={t.wallet.transactionId}>
          {/* The same rule as the deposit's return receipt (round 4, G20): whole runs of four, balanced. \`keepIdRuns\`. */}
          <span className="block font-mono text-balance">{keepIdRuns(txn.id)}</span>
        </Row>
        {txn.providerRef && (
          <Row label={t.wallet.gatewayReference}>
            <span className="block font-mono text-balance">{keepIdRuns(txn.providerRef)}</span>
          </Row>
        )}`],
]);
