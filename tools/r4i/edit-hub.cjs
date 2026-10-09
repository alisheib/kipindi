const edit = require("./edit-lib.cjs");
process.chdir("F:/kipindi-r4i");
edit("src/components/journey/account/hub-rows.ts", [
  [`import type { ProposalsState } from "@/lib/server/proposals-config";`, `import type { ProposalsState } from "@/lib/server/proposals-config";
import type { BreakState } from "@/lib/break-end";`],
  [`  /** A frozen or closed wallet: Pochi says so, and no money door is offered — the wallet sheet's own rule. */
  walletHeld: boolean;`, `  /** A frozen or closed wallet: Pochi says so, and no money door is offered — the wallet sheet's own rule. */
  walletHeld: boolean;
  /** R4-I · the reader's running break or exclusion and its end — Pumzika states it (\`hub-row.tsx\`); null when none runs
   *  or the read failed (optional: a reader composed without it shows no status). */
  breakEnd?: BreakState | null;`],
]);
edit("src/lib/server/hub-viewer.ts", [
  [`import { isFinalRefusal } from "@/lib/kyc-refusal";`, `import { isFinalRefusal } from "@/lib/kyc-refusal";
import { isLockedOut } from "@/lib/server/responsible-gambling";
import { breakStateOf } from "@/lib/break-end";`],
  [`  proposalsState: () => ProposalsState;
};`, `  proposalsState: () => ProposalsState;
  /** R4-I · the reader's break or exclusion (\`isLockedOut\`). Optional, so a stand-in without it reads none. */
  lockout?: (userId: string) => Promise<{ locked: boolean; until: string | null; reason: string | null }>;
};`],
  [`  proposalsState: () => getProposalsConfig().state,
};`, `  proposalsState: () => getProposalsConfig().state,
  lockout: (userId) => isLockedOut(userId),
};`],
  [`  const [u, w, k, iv, paid] = await Promise.allSettled([
    attempt(() => deps.user(userId)),
    attempt(() => deps.wallet(userId)),
    attempt(() => deps.kyc(userId)),
    attempt(() => deps.inviteViewer(userId)),
    attempt(() => deps.invitePayable()),
  ]);`, `  const [u, w, k, iv, paid, lock] = await Promise.allSettled([
    attempt(() => deps.user(userId)),
    attempt(() => deps.wallet(userId)),
    attempt(() => deps.kyc(userId)),
    attempt(() => deps.inviteViewer(userId)),
    attempt(() => deps.invitePayable()),
    // R4-I · in the same batch. It feeds a STATUS line, never a door: a failed read (or no reader) shows none.
    attempt(() => (deps.lockout ? deps.lockout(userId) : Promise.resolve(null))),
  ]);`],
  [`    walletHeld: !!wallet && wallet.status !== "ACTIVE",
    kycOffered,`, `    walletHeld: !!wallet && wallet.status !== "ACTIVE",
    breakEnd: lock.status === "fulfilled" && lock.value ? breakStateOf(lock.value) : null,
    kycOffered,`],
]);
edit("src/components/journey/account/hub-row.tsx", [
  [`import { formatTzs } from "@/lib/utils";`, `import { formatTzs, fill } from "@/lib/utils";
import { firstDateSentence, formatBreakEnd } from "@/lib/break-end";
import { keepText } from "@/components/ui/keep-run";
import type { Locale } from "@/lib/i18n-dict";`],
  [`export function HubRowItem({ row, t, viewer }: { row: HubRow; t: Dict; viewer: HubViewer }) {`,
   `export function HubRowItem({ row, t, viewer, locale }: { row: HubRow; t: Dict; viewer: HubViewer; locale?: Locale }) {`],
  [`          {row.sub && <HubSub text={hubWord(t, row.sub)} />}
        </span>`, `          {row.sub && <HubSub text={hubWord(t, row.sub)} />}
          {status && <span className="kp-hub__sub" data-testid={\`hub-status-\${row.id}\`}>{status}</span>}
        </span>`],
  [`  const Glyph = I[row.glyph];
  const label = <span className="kp-hub__label">{hubWord(t, row.label)}</span>;`, `  const Glyph = I[row.glyph];
  const label = <span className="kp-hub__label">{hubWord(t, row.label)}</span>;
  /* ⭐ R4-I (2026-10-09; edges E58, tile 092 · 026 059) · A RUNNING BREAK IS STATED ON ITS OWN ROW. "Pumzika" was offered
     during an active break with no word that one was running, or until when. Its second line is now the first sentence of
     the break's own approved paragraph, \`rg.breakActive\` — "Mapumziko yanaendelea hadi 9 Okt, 06:02." — its end said by
     the one formatter and kept one run; an exclusion states \`rg.exclusionActive\`'s on its own row. The row still lands on
     the break section, which carries the whole paragraph. */
  const running = viewer.signedIn && viewer.breakEnd && locale
    && ((row.id === "break" && !viewer.breakEnd.exclusion) || (row.id === "exclude" && viewer.breakEnd.exclusion))
    ? viewer.breakEnd : null;
  const statusTemplate = running ? firstDateSentence(running.exclusion ? t.rg.exclusionActive : t.rg.breakActive) : null;
  const statusDate = running && statusTemplate && locale ? formatBreakEnd(Date.parse(running.until), Date.now(), t.common.monthsShort, locale) : null;
  const status = statusTemplate && statusDate ? keepText(fill(statusTemplate, { date: statusDate }), [statusDate]) : null;`],
]);
edit("src/app/account/page.tsx", [
  [`  const [{ t }, session] = await Promise.all([getServerT(), currentSession()]);`,
   `  const [{ t, locale }, session] = await Promise.all([getServerT(), currentSession()]);`],
  [`      {g.rows.map((row) => <HubRowItem key={row.id} row={row} t={t} viewer={viewer} />)}`,
   `      {g.rows.map((row) => <HubRowItem key={row.id} row={row} t={t} viewer={viewer} locale={locale} />)}`],
]);
