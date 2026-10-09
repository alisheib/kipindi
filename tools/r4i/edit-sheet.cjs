const edit = require("./edit-lib.cjs");
process.chdir("F:/kipindi-r4i");
edit("src/components/layout/app-shell.tsx", [
  [`import { isSafePath } from "@/lib/safe-next";`, `import { isSafePath } from "@/lib/safe-next";
import { breakStateFromTimers, type BreakState } from "@/lib/break-end";`],
  [`  let promoSuppressed = false;`, `  let promoSuppressed = false;
  /** R4-I · the journey Wallet's one consumer of the break's END (see the note at \`promoSuppressed\` below). */
  let journeyBreak: BreakState | null = null;`],
  [`    promoSuppressed =
      until(rg?.selfExclusionUntil) > now || until(rg?.coolingOffUntil) > now;`,
   `    promoSuppressed =
      until(rg?.selfExclusionUntil) > now || until(rg?.coolingOffUntil) > now;
    /* ⭐ R4-I (2026-10-09; edges E58, tiles 014 017 020 047 050 053 080 083 086) · THE BREAK'S END NOW HAS A CONSUMER — the
       player's own, on the player's own screen. The journey's Wallet drops "Weka pesa" during a break, and it did so
       without a word; it now says why, in the sentence /wallet/deposit prints for the same break (\`rg.breakActive\` and its
       end), so the Wallet the capsule opens is handed the end. Only the JOURNEY bar receives it (the classic bar's props
       are untouched), it is derived from the same row (no query), and every OFFER still reads the one boolean above. */
    journeyBreak = breakStateFromTimers(rg?.selfExclusionUntil, rg?.coolingOffUntil, now);`],
  [`<LazyJourneyTopBar user={topUser} onBreak={promoSuppressed} proposalsState={proposalsState}`,
   `<LazyJourneyTopBar user={topUser} onBreak={promoSuppressed} breakEnd={journeyBreak} proposalsState={proposalsState}`],
]);
edit("src/components/journey/journey-top-bar.tsx", [
  [`export function JourneyTopBar({
  user,
  onBreak,
  proposalsState,`, `export function JourneyTopBar({
  user,
  onBreak,
  breakEnd = null,
  proposalsState,`],
  [`  onBreak: boolean;
  proposalsState: ProposalsState;`, `  onBreak: boolean;
  /** R4-I · the reader's break and its end (AppShell, from the settings row it holds), so the Wallet says why it offers no
   *  Deposit. Null when no break runs or the read failed. */
  breakEnd?: BreakState | null;
  proposalsState: ProposalsState;`],
  [`            <WalletBalanceCaptioned balance={liveBalance} held={state.capsule === "held"} onBreak={onBreak} />`,
   `            <WalletBalanceCaptioned balance={liveBalance} held={state.capsule === "held"} onBreak={onBreak} breakEnd={breakEnd} />`],
  [`import { WalletBalanceCaptioned, useLiveBalance } from "@/components/layout/wallet-balance-pill";`,
   `import { WalletBalanceCaptioned, useLiveBalance } from "@/components/layout/wallet-balance-pill";
import type { BreakState } from "@/lib/break-end";`],
]);
edit("src/components/layout/wallet-balance-pill.tsx", [
  [`export function WalletBalanceCaptioned({ balance, held = false, onBreak = false }: { balance: number; held?: boolean; onBreak?: boolean }) {`,
   `export function WalletBalanceCaptioned({ balance, held = false, onBreak = false, breakEnd = null }: { balance: number; held?: boolean; onBreak?: boolean; breakEnd?: BreakState | null }) {`],
  [`      <WalletSheet open={open} onClose={() => setOpen(false)} balance={balance} held={held} anchorRef={capsuleRef} journey onBreak={onBreak} />`,
   `      <WalletSheet open={open} onClose={() => setOpen(false)} balance={balance} held={held} anchorRef={capsuleRef} journey onBreak={onBreak} breakEnd={breakEnd} />`],
  [`import { WalletSheet } from "@/components/layout/wallet-sheet";`, `import { WalletSheet } from "@/components/layout/wallet-sheet";
import type { BreakState } from "@/lib/break-end";`],
]);
edit("src/components/layout/wallet-sheet.tsx", [
  [`import { keepLastWords } from "@/components/ui/keep-words";`, `import { keepLastWords } from "@/components/ui/keep-words";
import { keepText } from "@/components/ui/keep-run";
import { formatBreakEnd, type BreakState } from "@/lib/break-end";
import { fill } from "@/lib/utils";`],
  [`  journey = false,
  onBreak = false,
}: {`, `  journey = false,
  onBreak = false,
  breakEnd = null,
}: {`],
  [`  onBreak?: boolean;
}) {
  const { t } = useT();`, `  onBreak?: boolean;
  /** R4-I · the break and its end (the journey capsule passes it): the sheet says why it offers no Deposit. */
  breakEnd?: BreakState | null;
}) {
  const { t, locale } = useT();
  /* ⭐ R4-I (2026-10-09; edges E58, tiles 014 017 020 047 050 053 080 083 086) · A WITHHELD DOOR SAYS WHY. During a break the
     Wallet dropped "Weka pesa" and left Withdraw alone with no word about it. It now says what /wallet/deposit says for the
     same break: "Deposits paused" over the break's own sentence and its end (\`rg.breakActive\`; an exclusion
     \`rg.exclusionActive\`), in the held notice's box, the end one run (\`keepText\`). Drawn only when the Deposit is withheld
     for a break and the end is known; a held wallet keeps its own notice. */
  const breakText = !held && onBreak && breakEnd
    ? (() => {
        const date = formatBreakEnd(Date.parse(breakEnd.until), Date.now(), t.common.monthsShort, locale);
        return keepText(fill(breakEnd.exclusion ? t.rg.exclusionActive : t.rg.breakActive, { date }), [date]);
      })()
    : null;`],
  [`          <CashEye size={16} />
        </div>
      </div>
`, `          <CashEye size={16} />
        </div>
      </div>

      {breakText && (
        <div className="kp-wsheet__held" role="status" data-testid="wallet-sheet-break">
          <p className="kp-wsheet__held-t">{t.wallet.depositPausedTitle}</p>
          <p className="kp-wsheet__held-b">{breakText}</p>
        </div>
      )}
`],
]);
