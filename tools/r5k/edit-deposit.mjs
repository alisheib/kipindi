import { edit } from "./edit-lib.mjs";
edit("src/app/wallet/deposit/deposit-ghost.tsx", [
  [`import { PageContainer } from "@/components/layout/page-container";
`, `import { PageContainer } from "@/components/layout/page-container";
import { DepositFormGhost } from "@/app/wallet/money-form-ghost";
`],
  [` * B-29 / V-2 — the skeleton mirrors the FORM the page actually renders
 * (amount field → provider grid → phone field → confirm), instead of the
 * old centered spinner panel that repainted into a completely different shape.
`, ` * B-29 / V-2 — the skeleton mirrors the FORM the page actually renders, instead of the
 * old centered spinner panel that repainted into a completely different shape.
 * ⭐ IN THE PAGE'S OWN CARD AND ORDER since round 5's follow-up (R5-K, 2026-10-09): the providers, then the amount with
 * its pills and hint, the handset with its hint and button, the confirm, then the trust strip — each part in its own
 * classes with the page's words set and not shown (\`money-form-ghost.tsx\`, which says what it measured: the amount was
 * drawn first, with no card, 86px tiles for 106, no strip — the page ended 347–589px from where its ghost did).
`],
  [`      <div className="space-y-5" aria-hidden>
        {/* Amount field */}
        <div className="space-y-2">
          <div className="h-3 w-[80px] rounded bg-bg-overlay kp-shimmer-track" />
          {/* ⚠️ TOKEN, not \`h-11\` — spacing is overridden (tailwind.config.ts:200-215) so \`h-11\`
              drew 96px. This ghost stands in for \`<Input size="md">\`, which reads its height
              from --h-input (44px) — so consume the SAME token and the two can never drift.
              PLAYER MONEY SURFACE: a mismatch here is a jump on the deposit form. */}
          <div className="h-[var(--h-input)] w-full rounded-lg border border-border bg-bg-inset kp-shimmer-track" />
          <div className="h-2.5 w-48 rounded bg-bg-overlay/60 kp-shimmer-track" />
        </div>

        {/* Provider tile grid (2 cols mobile / 3 cols sm — the real radio grid) */}
        <div className="space-y-2">
          <div className="h-3 w-28 rounded bg-bg-overlay kp-shimmer-track" />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-[86px] rounded-md border border-border kp-shimmer-track" style={{ background: "var(--bg-inset)" }} />
            ))}
          </div>
        </div>

        {/* Destination phone field */}
        <div className="space-y-2">
          <div className="h-3 w-[128px] rounded bg-bg-overlay kp-shimmer-track" />
          {/* ⚠️ TOKEN, not \`h-11\` (96px on the overridden scale) — same \`<Input size="md">\`. */}
          <div className="h-[var(--h-input)] w-full rounded-lg border border-border bg-bg-inset kp-shimmer-track" />
        </div>

        {/* The confirm CTA — brand, as the button it stands for (D1: a deposit commit is brand, never gold; R5-C, 2026-10-09). */}
        {/* ⚠️ TOKEN, not \`h-12\` (128px on the overridden scale) — the confirm is a
            \`btn-lg\`, whose height is --h-control-lg (48px). */}
        <div className="h-[var(--h-control-lg)] w-full rounded-md bg-brand-500/25 kp-shimmer-track" />
      </div>
`, `      {/* The form card and the trust strip, as the page draws them for a mobile-money deposit (\`money-form-ghost.tsx\`). */}
      <DepositFormGhost t={t} />
`],
]);
