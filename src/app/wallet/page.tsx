import { redirect } from "next/navigation";
import { WalletPageClient } from "./wallet-client";
import { WalletBar, type LedgerCounts } from "./wallet-bar";
import { WalletResultModal } from "./wallet-result-modal";
import { currentSession } from "@/lib/server/auth-service";
import { db } from "@/lib/server/store";
import type { Transaction } from "@/lib/ui-stubs";
import type { StoredTxn } from "@/lib/server/store";
import { getBonusSummary } from "@/lib/server/bonus-service";
import { getBonusConfig } from "@/lib/server/bonus-config";
import { bonusIsLiveFor } from "@/lib/feature-state";
import { DEPOSIT_MIN_TZS, DEPOSIT_MAX_TZS, WITHDRAW_MIN_TZS, WITHDRAW_MAX_TZS } from "@/lib/server/validators";
import { RefreshPoller } from "@/components/ui/refresh-poller";
import { getServerT } from "@/lib/i18n-server";
import { matchesQuery, parseQuery } from "@/lib/search";
import { MY_TXN_SEARCH } from "@/lib/search";
import {
  LEDGER_DEFAULT_STATE,
  LEDGER_ROW_CAP,
  WALLET_SECTIONS,
  buildLedgerHref,
  filterLedger,
  ledgerCounts,
  ledgerEmptyView,
  ledgerWasCapped,
  parseLedgerParams,
  visibleLedgerLenses,
  type LedgerRow,
} from "@/lib/wallet/ledger";
import { PLAYER_PER_PAGE } from "@/components/ui/pagination";

export async function generateMetadata() {
  const { t } = await getServerT();
  return { title: t.wallet.title };
}
export const dynamic = "force-dynamic";

/**
 * 🔴 THE FOLD IS FOR DISPLAY ONLY, AND `lib/wallet/ledger.ts` FILTERS THE STORED TYPE INSTEAD.
 * The stored types collapse into fewer display tokens here — deliberately, because this token
 * drives the credit/debit SIGN and the receipt link. ⛔ It is NOT a filter vocabulary:
 * `BONUS_CREDIT` and `ADJUSTMENT_CREDIT` both land on `deposit`, so a "Deposits" filter built on
 * it would tell a player their bonus was a deposit.
 */
function adaptTxn(t: StoredTxn): Transaction {
  const typeMap: Record<StoredTxn["type"], Transaction["type"]> = {
    DEPOSIT: "deposit", WITHDRAWAL: "withdraw", BET_PLACED: "bet", BET_PAYOUT: "payout", BET_REFUND: "refund",
    BONUS_CREDIT: "deposit", ADJUSTMENT_CREDIT: "deposit", ADJUSTMENT_DEBIT: "withdraw", CASHOUT: "payout", HOUSE_FEE: "withdraw",
    // ⛔ NOT "deposit". An agent's commission is income they earned, and the wallet is the one
    // surface the agent reads about their own money — folding it into "deposit" would tell
    // them they put the money in themselves. The row's own `description` names it in full;
    // this token drives the credit/debit sign and the receipt link, so it must be its own word.
    AGENT_COMMISSION: "commission", AGENT_COMMISSION_REVERSAL: "reversal",
    // ⛔ NOT "withdraw". The applicant paid a registration fee from their balance; the money
    // never left the platform, and calling it a withdrawal on the one surface that exists to
    // tell them the truth about their own money would be a false statement. The sign comes
    // from the negative `amount`, not from this token, so the row still reads as a debit.
    AGENT_REGISTRATION_FEE: "agentfee",
  };
  // 1:1 with the stored status — no collapsing. This used to fold PROCESSING
  // into "pending" (so an in-flight gateway payment was indistinguishable from
  // one we hadn't sent yet) and REVERSED + CANCELLED into "failed" (so a deposit
  // reversed by the self-exclusion guard read as a declined card). Different
  // events, different remedies, different words.
  const statusMap: Record<StoredTxn["status"], Transaction["status"]> = {
    PENDING: "pending", PROCESSING: "processing", AML_REVIEW: "review", CONFIRMED: "confirmed", FAILED: "failed", REVERSED: "reversed", CANCELLED: "cancelled",
  };
  return {
    id: t.id,
    type: typeMap[t.type],
    amount: t.amount,
    status: statusMap[t.status],
    description: t.description ?? "",
    createdAt: t.createdAt,
    positionId: t.positionId ?? null,
    providerRef: t.providerRef ?? null,
  };
}

/** 30-day end-of-day balance trajectory for the wallet spark (A9). Reconstructs
 *  each day's closing balance by subtracting the signed txns that landed after
 *  it from the current balance. Empty when there's no activity → spark hidden. */
function balance30d(txns: Array<{ createdAt: string; amount: number }>, currentBalance: number): number[] {
  if (txns.length === 0) return [];
  const DAY = 86_400_000;
  const now = Date.now();
  const amounts = txns.map((t) => ({ at: Date.parse(t.createdAt), amt: t.amount })).filter((x) => Number.isFinite(x.at));
  if (amounts.length === 0) return [];
  const points: number[] = [];
  for (let i = 29; i >= 0; i--) {
    const dayEnd = now - i * DAY;
    const after = amounts.reduce((sum, x) => (x.at > dayEnd ? sum + x.amt : sum), 0);
    points.push(Math.round(currentBalance - after));
  }
  return points;
}

/**
 * The DATE BOUNDS the store read applies.
 *
 * ⭐ THE WINDOW IS THE ONE AXIS THAT REACHES PAST THE ROW CAP, which is why it is applied in the
 * DATABASE and every other axis is applied over what comes back. A player narrowing to "last 30
 * days" to find an older withdrawal must actually be given older rows — filtering an
 * already-truncated page would search only the newest ones the cap had already handed them.
 * ⛔ A filter over an incomplete population is a check that lies.
 *
 * ⚠️ The spans are `lib/wallet/ledger.ts`'s, computed the same way, so the rows the store returns
 * and the rows the window predicate admits cannot disagree.
 */
function windowBounds(when: string, nowMs: number): { fromMs: number; toMs: number } {
  const DAY = 86_400_000;
  const d = new Date(nowMs);
  const startOfToday = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  // `toMs` is exclusive and generous: a row stamped a moment from now (clock skew between the app
  // and the database) must not fall outside its own window.
  const far = nowMs + DAY;
  switch (when) {
    case "today": return { fromMs: startOfToday, toMs: far };
    case "yesterday": return { fromMs: startOfToday - DAY, toMs: startOfToday };
    case "7d": return { fromMs: nowMs - 7 * DAY, toMs: far };
    case "30d": return { fromMs: nowMs - 30 * DAY, toMs: far };
    default: return { fromMs: 0, toMs: far };
  }
}

export default async function WalletPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { t } = await getServerT();
  const session = await currentSession();
  if (!session) redirect("/auth/login?next=/wallet");

  const sp = await searchParams;
  /**
   * ⭐ THE SECTION AND EVERY FILTER LIVE IN THE URL — §K 7b: *"the selection lives in the URL.
   * ⛔ Never `useState` alone."* The Activity/Methods/Limits rail and the pager were both React
   * state, so a player could not share, bookmark or refresh back into the view they were reading,
   * and the back button did nothing.
   * ⚠️ The filter's status axis is `?state=`, NOT `?status=` — that param is already taken by the
   * deposit/withdraw return redirect. See `ledger.ts`'s note; getting it wrong would narrow the
   * wallet of every player coming back from a deposit.
   */
  const state = parseLedgerParams(sp);

  // B-1: money reads must NEVER swallow a failure into a zero/empty render — a
  // funded player shown "TZS 0 · make your first deposit" on a DB blip is
  // indistinguishable from being robbed. A failed read throws to the route's
  // error.tsx (RouteError with retry); the empty state is reachable only from a
  // SUCCESSFUL empty query.
  const w = await db.wallet.findByUserId(session.userId);
  const balance = w?.balance ?? 0;
  const pending = w?.pending ?? 0;
  const hold = w?.hold ?? 0;
  const currency = w?.currency ?? "TZS";

  const nowMs = Date.now();
  const { fromMs, toMs } = windowBounds(state.when, nowMs);
  /**
   * ⛔ `CAP + 1`, AND THE EXTRA ROW IS THE WHOLE POINT. Reading exactly the cap makes
   * `rows.length === CAP` ambiguous — a player with exactly 1,000 transactions would be told
   * their history was truncated when it was complete. Asking for one more answers the question
   * instead of inferring it.
   */
  const rawTxns = (await db.txn.findByUserWindow(session.userId, fromMs, toMs, LEDGER_ROW_CAP + 1)) as StoredTxn[];
  const capped = ledgerWasCapped(rawTxns.length);
  const windowRows = capped ? rawTxns.slice(0, LEDGER_ROW_CAP) : rawTxns;

  /** The rows the contract reasons about — the STORED enums, beside the display token. */
  const rows: LedgerRow[] = windowRows.map((x) => ({
    id: x.id,
    type: x.type,
    status: x.status,
    token: adaptTxn(x).type,
    amount: x.amount,
    description: x.description ?? "",
    createdAtMs: Date.parse(x.createdAt) || 0,
  }));

  const parsed = parseQuery(state.q);
  const matchesText = (row: LedgerRow) =>
    matchesQuery(parsed, row as unknown as Record<string, string | null | undefined>, MY_TXN_SEARCH);

  // ⚠️ No sort. A ledger is chronological and the store already returns it newest-first — see
  //    `wallet-bar.tsx`'s header for why this surface is the campaign's one deliberate exception.
  const matched = filterLedger(rows, state, nowMs, matchesText);

  const pageNum = Math.max(1, parseInt(String(sp.page ?? "1"), 10) || 1);
  const totalPages = Math.max(1, Math.ceil(matched.length / PLAYER_PER_PAGE));
  const safePage = Math.min(pageNum, totalPages);
  const pagedIds = new Set(matched.slice((safePage - 1) * PLAYER_PER_PAGE, safePage * PLAYER_PER_PAGE).map((r) => r.id));
  const byId = new Map(windowRows.map((x) => [x.id, x]));
  const pagedTxns: Transaction[] = [...pagedIds].map((id) => adaptTxn(byId.get(id)!));

  // B-5: the result modal renders ONLY for a txn this user actually owns, with
  // the STORED status/amount — never the raw query params. A fabricated
  // `?deposited=x&amount=5000000` finds no owned txn → no modal, no fake gilt.
  // ⚠️ Looked up over the WINDOWED read, so a player returning from a deposit while a narrow
  //    window is active still sees their own result — the id is matched, not filtered.
  const resultId = (typeof sp.deposited === "string" ? sp.deposited : "") || (typeof sp.withdrawal === "string" ? sp.withdrawal : "");
  const resultTxn = resultId
    ? (rawTxns.find((x) => x.id === resultId) ?? ((await db.txn.findById(resultId)) as StoredTxn | null) ?? undefined)
    : undefined;
  const resultOwned = resultTxn && resultTxn.userId === session.userId ? resultTxn : undefined;

  // Bonus balance is money too — same B-1 rule, no zero-on-failure.
  // ⛔ THE SUMMARY IS STILL READ WHEN THE PROGRAMME IS WITHDRAWN, deliberately: a player
  // holding a live grant must still see it and still be able to play it through. What the
  // feature state gates is the OFFER (the empty-state pitch, the cashback promo), never the
  // statement of money that exists. See `feature-state.ts` — gate the offer, not the refusal.
  const bonus = await getBonusSummary(session.userId);
  const bonusCfg = getBonusConfig();
  const bonusFeatureLive = bonusIsLiveFor();
  // ⭐ TWO LEVELS, AND THE PRODUCT STATE WINS. `bonusCfg.cashbackEnabled` is the OPERATOR's
  // switch; `bonusFeatureLive` is whether the programme is part of the product at all. An
  // operator re-enabling cashback in /admin/config must not be able to resurrect a promo for
  // a withdrawn programme, so the product state is ANDed in here rather than trusted to it.
  const cashbackPercent = bonusFeatureLive && bonusCfg.enabled && bonusCfg.cashbackEnabled ? bonusCfg.cashbackPercentage : 0;
  const cashbackMode = bonusCfg.cashbackMode ?? "REQUEST";

  /**
   * 🔴 FIVE OF THE SEVEN GRANT STATUSES WERE INVISIBLE ON EVERY PLAYER SURFACE.
   *
   * This list was `.filter(g => g.status === "ACTIVE" || g.status === "QUEUED")`, so a bonus that
   * expired, was cancelled, was forfeited, was FULFILLED, or is waiting on the player's own ID
   * check simply did not exist as far as the product was concerned — ⛔ a player could not see a
   * bonus they had been granted and lost, which is a statement about their money being withheld
   * by omission. Re-derive: `sed -n '/^enum BonusGrantStatus/,/^}/p' prisma/schema.prisma`.
   *
   * Every grant is now passed and the page offers `?grants=all`; the default still leads with the
   * live ones, because that is what a player asks first.
   */
  const showAllGrants = (Array.isArray(sp.grants) ? sp.grants[0] : sp.grants) === "all";
  const LIVE_GRANT = new Set(["ACTIVE", "QUEUED", "PENDING_KYC"]);
  const bonusGrants = bonus.grants
    .filter((g) => showAllGrants || LIVE_GRANT.has(g.status))
    .map((g) => ({
      id: g.id,
      amountTzs: g.amountTzs,
      // ⛔ E-224 · `BonusGrantView.remainingTzs` is NULLABLE — `toGrantView` suppresses it for any
      // status where the figure is not locked bonus money. ⚠️ With every status now listed this is
      // genuinely null for the finished ones, so the coalesce is load-bearing rather than a
      // formality, and the ROW states the status beside the figure so a zero is never mistaken
      // for a balance.
      remainingTzs: g.remainingTzs ?? 0,
      source: g.source,
      progressPct: g.progressPct,
      wageredTzs: g.wageredTzs,
      wagerRequiredTzs: g.wagerRequiredTzs,
      remainingWagerTzs: g.remainingWagerTzs,
      expiresAt: g.expiresAt,
      status: g.status,
    }));

  /**
   * 🔴 `total` IS THE PLAYER'S WHOLE BOOK, AND PASSING `rows.length` HERE TRAPPED THEM.
   *
   * `emptyKind`'s contract says so in as many words — *"how many rows exist before ANY filter —
   * the player's whole book"* (`lib/query/empty.ts:141`). But `rows` is the WINDOWED read: the
   * date axis is applied in the DATABASE, on purpose, so that narrowing to "last 30 days"
   * reaches past the row cap instead of filtering an already-truncated page. Correct — and it
   * means an empty window makes `rows.length === 0`, which `emptyKind` reads as `"no-rows"`:
   * *this account has never had any activity.*
   *
   * ⛔ THREE SYMPTOMS, ONE WRONG NUMBER. A player on a funded wallet who picked a day with no
   * transactions was told **"No activity yet · Make your first deposit"**; `exits` was skipped
   * because the cause was `no-rows`; and `wallet-client.tsx:725` renders the filter bar only
   * when the cause is NOT `no-rows` — so the bar came off the page too. **No filter control, no
   * exit chip, and copy denying they had ever transacted. There was no way back except editing
   * the URL.** Reported from production by Ali on a wallet holding TZS 423,857.
   *
   * ⭐ THE FIX IS TO ANSWER THE QUESTION THE ARGUMENT ACTUALLY ASKS, and only when it can be
   * wrong: `total` can only mislead when it is 0, and a windowed read is only narrower than the
   * book when a window is set. So one extra read, in that case alone — never on a normal load.
   * With the true total the cause becomes `window-miss`, the exits get a population to count
   * against ("All time (57)"), and the bar comes back.
   */
  const windowIsNarrowed = state.when !== LEDGER_DEFAULT_STATE.when;
  let bookRows: LedgerRow[] = rows;
  if (rows.length === 0 && windowIsNarrowed) {
    const allTxns = (await db.txn.findByUserWindow(session.userId, 0, nowMs + 86_400_000, LEDGER_ROW_CAP + 1)) as StoredTxn[];
    bookRows = allTxns.map((x) => ({
      id: x.id,
      type: x.type,
      status: x.status,
      token: adaptTxn(x).type,
      amount: x.amount,
      description: x.description ?? "",
      createdAtMs: Date.parse(x.createdAt) || 0,
    }));
  }

  /**
   * ⛔ THE BAR'S COUNTS COME FROM `bookRows` TOO, AND ON AN EMPTY WINDOW THAT IS THE DIFFERENCE
   * BETWEEN AN EXIT AND A DEAD END.
   *
   * `counts.when[w]` is the number beside each date chip. Computed over the WINDOWED rows it is
   * necessarily 0 for every window once the current one is empty — so the way out, **"All time"**,
   * renders as **"All time (0)"** to a player with a full history. A chip that reads 0 is one
   * nobody presses; it looks like the same emptiness, one click further on.
   *
   * ⚠️ This does NOT breach the invariant the `activityBar` note below states — *a count may not
   * disagree with the list under it.* `bookRows` differs from `rows` only when `rows` is EMPTY,
   * and then there is no list under it to disagree with: the page is showing the empty state, and
   * the counts are pure navigation. On every non-empty load `bookRows === rows`, byte for byte.
   */
  const counts = ledgerCounts(bookRows, state, nowMs, matchesText) as LedgerCounts;

  /* ⛔ ONE call, taking BOTH populations by name — see `ledgerEmptyView`. The previous shape
     asked for the whole book in a comment and got the windowed read instead. */
  const { cause, exits } = ledgerEmptyView(rows, bookRows, matched.length, state, nowMs, matchesText);
  const EXIT_LABEL: Record<string, string> = {
    state: t.wallet.exitState, when: t.wallet.exitWhen, q: t.wallet.exitSearch, type: t.wallet.exitType,
  };
  const LENS_EMPTY: Record<string, string> = {
    in: t.wallet.emptyIn, out: t.wallet.emptyOut, bet: t.wallet.emptyBet, payout: t.wallet.emptyPayout,
    refund: t.wallet.emptyRefund, bonus: t.wallet.emptyBonus, adjust: t.wallet.emptyAdjust,
    commission: t.wallet.emptyCommission,
  };

  return (
    <>
      <RefreshPoller intervalMs={20_000} />
      {resultOwned && (
        <WalletResultModal
          deposited={typeof sp.deposited === "string" ? sp.deposited : undefined}
          withdrawal={typeof sp.withdrawal === "string" ? sp.withdrawal : undefined}
          status={resultOwned.status}
          amount={String(Math.abs(resultOwned.amount))}
        />
      )}
      <WalletPageClient
        balance={balance}
        pending={pending}
        hold={hold}
        currency={currency}
        transactions={pagedTxns}
        resultCount={matched.length}
        page={safePage}
        totalPages={totalPages}
        pagerBaseHref={buildLedgerHref(state)}
        section={state.tab}
        sectionHrefs={Object.fromEntries(WALLET_SECTIONS.map((s) => [s, buildLedgerHref(state, { tab: s })]))}
        /* ⛔ The bar is a SERVER node handed to a client component: every control is a real
           `<Link>`, and the counts beside them were computed against the very read the rows came
           from, so a count cannot disagree with the list under it. */
        activityBar={
          <WalletBar
            state={state}
            lenses={visibleLedgerLenses(bookRows)}
            counts={counts}
            resultCount={matched.length}
            t={t}
          />
        }
        emptyCause={cause}
        emptyTitle={
          cause === "no-rows" ? t.common.noActivityYet
          : cause === "search-miss" ? t.wallet.emptySearch
          : cause === "window-miss" ? t.wallet.emptyWindow
          : cause === "lens-empty" ? (LENS_EMPTY[state.type] ?? t.wallet.emptyFilter)
          : t.wallet.emptyFilter
        }
        emptyBody={
          cause === "no-rows" ? t.common.firstDepositHint
          : cause === "lens-empty" ? t.wallet.emptyLensBody
          : cause === "search-miss" ? t.wallet.emptySearchBody
          : cause === "window-miss" ? t.wallet.emptyWindowBody
          : t.wallet.emptyFilterBody
        }
        emptyExits={exits.map((e) => ({
          id: e.id,
          label: `${EXIT_LABEL[e.id] ?? e.id} (${e.count})`,
          href: buildLedgerHref(state, e.patch),
        }))}
        capped={capped}
        rowCap={LEDGER_ROW_CAP}
        balanceSeries={balance30d(rows.map((r) => ({ createdAt: new Date(r.createdAtMs).toISOString(), amount: r.amount })), balance)}
        bonusBalance={bonus.bonusBalance}
        bonusActiveCount={bonus.activeCount}
        bonusWagerRemaining={bonus.activeWagerRemainingTzs}
        bonusGrants={bonusGrants}
        bonusFeatureLive={bonusFeatureLive}
        showAllGrants={showAllGrants}
        grantsToggleHref={showAllGrants ? buildLedgerHref(state) : `${buildLedgerHref(state)}${buildLedgerHref(state).includes("?") ? "&" : "?"}grants=all`}
        cashbackPercent={cashbackPercent}
        cashbackMode={cashbackMode}
        limits={{
          depositMin: DEPOSIT_MIN_TZS, depositMax: DEPOSIT_MAX_TZS,
          withdrawMin: WITHDRAW_MIN_TZS, withdrawMax: WITHDRAW_MAX_TZS,
        }}
        isAuthed={true}
      />
    </>
  );
}
