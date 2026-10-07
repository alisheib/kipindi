/**
 * RECEIPTS — every deposit and withdrawal the player has made, each opening its receipt (owner ruling 2026-10-07).
 *
 * ⭐ WHY THIS PAGE EXISTS. Ali, 2026-10-07: deposits stop asking for an email — "even if no mail was there" — and *"in
 * return, to make sure users have all their receipts on withdrawals or deposits, in the user profile we need a tab for
 * internal receipts."* An emailed receipt can no longer be relied on (no address, an unconfirmed one, and money mail now
 * goes to confirmed addresses only), so the app keeps every one. The door is in the profile (`profile/page.tsx`, right
 * after "Your activity") and on /wallet; the list lives here, with the wallet — a money surface (`surfaces.ts`), under
 * the wallet's "your funds are safe" error boundary, beside the single receipt it opens.
 *
 * ⭐ ONE READ, THEN THE WALLET'S OWN QUERY MACHINERY. The store returns this player's DEPOSIT and WITHDRAWAL rows only
 * (`findByUserTypes` — the type filter is in the store, so thousands of stake rows can never push a deposit out of
 * reach), newest first. Every axis — lens, state, window — is then applied over that complete book by
 * `lib/wallet/receipts.ts`, so the counts on the bar, the empty state's exits and the rows can never disagree.
 *
 * ⛔ B-1: A MONEY READ IS NEVER SWALLOWED. A failed read throws to `wallet/error.tsx`; "No receipts yet" is reachable only
 * from a SUCCESSFUL empty read — a funded player told they have no receipts on a database blip is a page lying about money.
 */
import Link from "next/link";
import { redirect } from "next/navigation";
import { I } from "@/components/ui/glyphs";
import { BackLink } from "@/components/ui/back-link";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination, PLAYER_PER_PAGE } from "@/components/ui/pagination";
import { RefreshPoller } from "@/components/ui/refresh-poller";
import { PageContainer } from "@/components/layout/page-container";
import { ReceiptListRow } from "@/components/wallet/receipt-list-row";
import { currentSession } from "@/lib/server/auth-service";
import { db, type StoredTxn } from "@/lib/server/store";
import { isLockedOut } from "@/lib/server/responsible-gambling";
import { getServerT } from "@/lib/i18n-server";
import { pathWithQuery } from "@/lib/safe-next";
import { formatNumber, formatTzs } from "@/lib/utils";
import { formatEatDateTime } from "@/lib/eat-day";
import { playerStatusChip } from "@/lib/status-tone";
import {
  RECEIPT_ROW_CAP,
  RECEIPT_TYPES,
  anyInFlight,
  buildReceiptsHref,
  filterReceipts,
  hasReceipt,
  methodLabel,
  parseReceiptParams,
  presentedStatus,
  receiptCounts,
  receiptEmptyView,
  receiptStatusWord,
  receiptTypeWord,
  receiptsWereCapped,
  type ReceiptRowData,
} from "@/lib/wallet/receipts";
import { ReceiptsBar, type ReceiptCounts } from "./receipts-bar";

export async function generateMetadata() {
  const { t } = await getServerT();
  return { title: t.receipts.title };
}
export const dynamic = "force-dynamic";

export default async function ReceiptsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const session = await currentSession();
  // Back to THIS view after signing in — the filters live in the URL (§K 7b).
  if (!session) redirect(`/auth/login?next=${encodeURIComponent(pathWithQuery("/wallet/receipts", sp))}`);
  const { t, locale } = await getServerT();
  const state = parseReceiptParams(sp);
  const nowMs = Date.now();

  // ⛔ `CAP + 1`: the extra row answers "did the cap bite?" instead of guessing from `length === CAP`.
  const raw = (await db.txn.findByUserTypes(session.userId, RECEIPT_TYPES, RECEIPT_ROW_CAP + 1)) as StoredTxn[];
  const capped = receiptsWereCapped(raw.length);
  const book: ReceiptRowData[] = (capped ? raw.slice(0, RECEIPT_ROW_CAP) : raw)
    .filter((x) => hasReceipt(x.type))
    .map((x) => ({
      id: x.id,
      type: x.type as ReceiptRowData["type"],
      status: presentedStatus(x),
      amount: Math.abs(x.amount),
      provider: x.provider ?? null,
      createdAtMs: Date.parse(x.createdAt) || 0,
    }));

  const matched = filterReceipts(book, state, nowMs);
  const counts = receiptCounts(book, state, nowMs) as ReceiptCounts;
  const { cause, exits } = receiptEmptyView(book, matched.length, state, nowMs);
  const pageNum = Math.max(1, parseInt(String(Array.isArray(sp.page) ? sp.page[0] : sp.page ?? "1"), 10) || 1);
  const totalPages = Math.max(1, Math.ceil(matched.length / PLAYER_PER_PAGE));
  const page = Math.min(pageNum, totalPages);
  const shown = matched.slice((page - 1) * PLAYER_PER_PAGE, page * PLAYER_PER_PAGE);

  /* ⭐ THE EMPTY BOOK'S ONE INVITATION — and only when money can actually come in (2026-10-06's rule on /wallet): not over
     a held wallet, not during a break. Brand, never gold (§M3a D1). A failed break read fails OPEN, like the shell's. */
  let depositOpen = false;
  if (cause === "no-rows") {
    const w = await db.wallet.findByUserId(session.userId);
    let onBreak = false;
    try { onBreak = (await isLockedOut(session.userId)).locked; } catch { /* fails open — /wallet/deposit still refuses */ }
    depositOpen = !(w && w.status !== "ACTIVE") && !onBreak;
  }

  const EXIT_LABEL: Record<string, string> = { state: t.wallet.exitState, when: t.wallet.exitWhen, type: t.receipts.allReceipts };
  const emptyTitle =
    cause === "no-rows" ? t.receipts.emptyTitle
    : cause === "lens-empty" ? (state.type === "in" ? t.wallet.emptyIn : t.wallet.emptyOut)
    : cause === "window-miss" ? t.wallet.emptyWindow
    : t.receipts.emptyFilter;
  const emptyBody =
    cause === "no-rows" ? t.receipts.emptyBody
    : cause === "lens-empty" ? t.wallet.emptyLensBody
    : cause === "window-miss" ? t.wallet.emptyWindowBody
    : t.wallet.emptyFilterBody;

  return (
    <PageContainer tier="reading" className="space-y-5">
      {/* Re-reads itself only while a listed receipt is still moving — silent otherwise (§F5). */}
      <RefreshPoller intervalMs={15_000} enabled={anyInFlight(shown)} />
      {/* "Back": the player arrives from the profile row, /wallet's "All receipts" or a receipt, so the label names no
          page (it said "Profile" under a "Wallet" eyebrow). With no history it falls back to the profile, where the door is. */}
      <BackLink fallbackHref="/profile" label={t.common.back} />

      <PageHeader
        tone="info"
        icon={<I.receipt s={22} />}
        eyebrow={t.wallet.title}
        title={t.receipts.title}
        subtitle={t.receipts.subtitle}
      />

      {/* THE BAR STAYS WHEN THE LIST IS EMPTY, so a player who filtered to nothing can see what is on and press it off.
          Withheld only when the account has no receipts at all. */}
      {cause !== "no-rows" && <ReceiptsBar state={state} counts={counts} resultCount={matched.length} t={t} />}

      {/* The cap, stated when it bites. ⛔ Without the wallet's "narrow the dates to reach older ones" hint: this read takes
          the newest RECEIPT_ROW_CAP rows whatever the window, so that hint would promise a reach it does not have. */}
      {capped && (
        <p className="rounded-control border border-border bg-bg-elevated/60 px-3 py-2 text-body-sm text-text-muted">
          {t.receipts.capped.replace("{n}", formatNumber(RECEIPT_ROW_CAP))}
        </p>
      )}

      {shown.length > 0 ? (
        <section aria-label={t.receipts.listLabel} className="rounded-xl glass-panel overflow-hidden">
          <ul>
            {shown.map((r) => (
              <ReceiptListRow
                key={r.id}
                id={r.id}
                type={r.type}
                status={r.status}
                typeWord={receiptTypeWord(t, r.type)}
                method={methodLabel(t, r.provider)}
                when={formatEatDateTime(r.createdAtMs, nowMs, t.common.monthsShort, locale)}
                amount={formatTzs(r.amount)}
                statusWord={receiptStatusWord(t, r.status)}
                chip={playerStatusChip(r.status) ?? "neutral"}
              />
            ))}
          </ul>
          <Pagination
            total={matched.length}
            page={page}
            perPage={PLAYER_PER_PAGE}
            baseHref={buildReceiptsHref(state)}
            ofLabel={t.common.of}
            prevLabel={t.common.previousPage}
            nextLabel={t.common.nextPage}
            firstLabel={t.common.firstPage}
            lastLabel={t.common.lastPage}
          />
        </section>
      ) : (
        <EmptyState
          kind="audit"
          title={emptyTitle}
          body={emptyBody}
          action={
            cause === "no-rows" ? (
              depositOpen ? (
                <Link href="/wallet/deposit" className="btn btn-primary btn-md">
                  {t.common.depositCta}
                </Link>
              ) : undefined
            ) : exits.length > 0 ? (
              <div className="flex flex-wrap items-center justify-center gap-2">
                {exits.map((e) => (
                  <Link key={e.id} href={buildReceiptsHref(state, e.patch) as never} replace scroll={false} className="btn btn-ghost btn-sm">
                    {`${EXIT_LABEL[e.id] ?? e.id} (${e.count})`}
                  </Link>
                ))}
              </div>
            ) : undefined
          }
        />
      )}
    </PageContainer>
  );
}
