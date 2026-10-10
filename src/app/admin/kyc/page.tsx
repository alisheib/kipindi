import Link from "next/link";
import type { Route } from "next";
import { AdminPageGate } from "@/components/admin/admin-section-gate";
import { AdminPageHead, AdminCard, AdminKpi, AdminLoadError } from "@/components/admin/admin-shell";
import { AdminBody, KpiGrid } from "@/components/admin/admin-body";
import { AdminTableEmpty } from "@/components/admin/admin-table-empty";
import { AdminPagination, PER_PAGE, parsePage, buildBaseHref } from "@/components/admin/admin-pagination";
import { parseSort, SortTh, type SortDir } from "@/components/admin/admin-sort";
import { KycStageBadge, kycStageLabel } from "@/components/admin/status-badge";
import { Chip } from "@/components/ui/chip";
import { I } from "@/components/ui/glyphs";
import { ScrollX } from "@/components/ui/scroll-x";
import type { StoredKycStageRow } from "@/lib/server/store";
import { currentSession } from "@/lib/server/auth-service";
import { canView } from "@/lib/server/rbac";
import { kycMoneyRows } from "@/lib/server/kyc-money";
import { refusedFundsReport, awaitsOfficer } from "@/lib/server/refused-funds";
import {
  readKycQueueIdentity,
  kycWaitedLabel,
  readBlockedCashOuts,
  readBlockedEmailCashOuts,
  tallyBlockedCashOuts,
  blockedCashOutsByPlayer,
  compareQueuePriority,
  kycHeldBucket,
  KYC_HELD_BUCKET_LABEL,
} from "@/lib/server/kyc-risk";
import { kycStage, walletHeldTzs, MONEY_NOT_APPLIED, type KycStage } from "@/lib/kyc-stage";
import { KYC_REVIEW_SLA_HOURS } from "@/lib/kyc-sla";
import { formatTzs, formatTzsCompact, formatDateTime, adminCount } from "@/lib/utils";
import { db } from "@/lib/server/store";
import { isErasedPhone } from "@/lib/server/erasure";
import { asKycFlags, FLAG_LABEL, type KycFlag } from "@/lib/kyc-auto-checks";
import { isIdDocType } from "@/lib/id-documents";

export const metadata = { title: "Admin · KYC queue" };
export const dynamic = "force-dynamic";

/**
 * /admin/kyc — THE IDENTITY QUEUE, AS AN INDEX (owner ruling, Ali, 2026-09-13).
 *
 * ⭐ WHY IT EXISTS. `src/app/admin/kyc/` held only `[id]/` — the workstation — and the work itself
 * lived as one card inside "Two-person approvals", a page framed around the AML co-sign ceremony.
 * That was tolerable while identity came before any money. From 2026-09-13 identity is asked before a
 * WITHDRAWAL and before nothing else (docs/COMPLIANCE-DECISIONS.md 2026-09-13), so everyone on this page
 * may already hold a balance, and a file with us can be a withdrawal waiting on our review (S14).
 *
 * ⭐ 2026-10-10 — PLAYERS VERIFY WITH TYPED DETAILS, APPROVED AUTOMATICALLY WHEN THE CHECKS PASS (owner ruling;
 * docs/COMPLIANCE-DECISIONS.md "2026-10-10 · Players verify identity with typed details"). So the work on this page
 * changed shape: a file WITH US is a case the checks ROUTED to an officer, an agent applicant's photo case, or one
 * sent before that date — and the automatic approvals are checked by an officer AFTERWARDS, in their own table.
 *
 * FOUR TABLES. The three file tables take every row's word from `kycStage` (src/lib/kyc-stage.ts) — the roster's
 * own derivation — so this page cannot disagree with /admin/players about one person:
 *   · WITH US          — `with_us` (a submitted file), with its age against KYC_REVIEW_SLA_HOURS.
 *   · VERIFIED AUTOMATICALLY · NOT YET CHECKED — `db.kyc.listUncheckedAutoApprovals()` (newest submission per user,
 *     `autoApprovedAt` set, `postCheckedAt` empty; APPROVED, or — review R5.1 — with an officer or with the player, each
 *     such row marked with its stage). Flagged first, then — for a viewer with money rights —
 *     by what has been withdrawn since the approval, because that is money that left on an identity no officer has
 *     looked at. A closed or erased account is BADGED, never hidden: its approval still needs its check.
 *   · WITH THE PLAYER  — `uploaded` (an agent applicant's photos in, never sent) and `more_needed` (we asked the player
 *     to correct their details). ⚠️ An ADDITIONAL_INFO_REQUIRED file is the PLAYER's move: their corrected send is
 *     what returns it to us. `listPendingKyc` still returns it, so every reader of that list that counts work "with
 *     us" — /admin/approvals, the sidebar badges, the workstation's queue position — filters through `isFileWithUs`
 *     (src/lib/kyc-stage.ts), this table's own arm.
 *   · FUNDED, NOTHING SUBMITTED — `funded_nothing_yet`, sorted by what the account holds. Money rights only.
 *
 * ⛔ NEVER `db.kyc.list()` — it joins every document image. `listStageFacts` is the narrow feed (newest
 * submission per user, scalars and a document count), and `readKycMoneySnapshot` is the one identity × money
 * join (src/lib/server/kyc-money.ts).
 * ⛔ A FAILED READ IS NEVER A ZERO. Each read reports its own failure and each tile, table and cell says
 * "could not be read" for exactly what failed — "0 past target" after a database blip is a false all-clear.
 * ⛔ MONEY IS GATED THE WAY THE ROSTER GATES IT — `canView(role, "accounting")`, asked BEFORE any wallet is
 * read. SUPPORT reads `money.figures` masked; a role granted this compliance route without money rights sees
 * the files and the counts, never a balance, a balance-weighted order, or the funded list.
 * ⚠️ English-only by design, like the rest of the staff console.
 */

const H = 3_600_000;

/** A labelled order link for one table — keeps every other table's sort and page. */
function orderHref(sp: Record<string, string | undefined>, prefix: string, sort: string, dir: SortDir): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (v && k !== `${prefix}sort` && k !== `${prefix}dir` && k !== `${prefix}page`) params.set(k, v);
  }
  params.set(`${prefix}sort`, sort);
  params.set(`${prefix}dir`, dir);
  return `/admin/kyc?${params.toString()}`;
}

type FileRow = {
  userId: string;
  stage: KycStage;
  /** `submittedAt` — set only on the transition into review. */
  waitingSince: string | null;
  /** When the file was opened. */
  opened: string;
  /** `walletHeldTzs`, or null when money is not applied (no rights, or the wallet read failed). */
  heldTzs: number | null;
  /** Player-initiated refused cash-outs, or null when the audit read failed. */
  attempts: number | null;
  lastAttemptAt: string | null;
};

/** One automatic approval waiting for its officer check. */
type PostCheckRow = {
  userId: string;
  /** Where the approval stands now — APPROVED, or (review R5.1) with an officer or with the player, still unchecked. */
  status: StoredKycStageRow["status"];
  idType: string | null;
  autoApprovedAt: string;
  flags: KycFlag[];
  /** CONFIRMED + in-flight withdrawals since the approval, or null when money is not applied / the read failed. */
  withdrawnTzs: number | null;
  /** "closed" / "erased" are badged — never hidden; null for an open account. ⛔ A user read that FAILED is
   *  "unreadable" and one that found no row is "missing" — neither is evidence of an erasure (erasure pseudonymises the
   *  row, it never deletes it), so neither may print "Erased". */
  account: "closed" | "erased" | "unreadable" | "missing" | null;
};

/** The account badge's words. */
const ACCOUNT_BADGE: Record<NonNullable<PostCheckRow["account"]>, string> = {
  closed: "Closed",
  erased: "Erased",
  unreadable: "Account unreadable",
  missing: "No account found",
};

/**
 * Where an unchecked automatic approval stands when it is NOT simply approved (review R5.1) — the roster's own words for
 * those two stages (`kycStageLabel`, status-badge.tsx), so this table and /admin/players name a file the same way.
 * ⛔ Only an APPROVED row can be marked checked (the workstation's post-check rail); a row with an officer is checked by
 * the officer's approval on the workstation, and one with the player waits for their corrected send.
 */
const POST_CHECK_STAGE: Partial<Record<PostCheckRow["status"], string>> = {
  PENDING_REVIEW: kycStageLabel("with_us"),
  ADDITIONAL_INFO_REQUIRED: kycStageLabel("more_needed"),
};

/** Officer names for the four documents — the queue's own copy (a page file cannot export one). */
const ID_TYPE_SHORT: Record<string, string> = { NIDA: "NIDA", PASSPORT: "Passport", DRIVER_LICENSE: "Driving licence", VOTER_CARD: "Voter's card" };

/** A flag in a table cell — short, one unbreakable phrase; the full sentence (`FLAG_LABEL`) is the chip's title. */
const FLAG_SHORT: Record<KycFlag, string> = {
  NIDA_DOB_MISMATCH: "NIDA date differs",
  PASSPORT_SHAPE: "Passport shape",
  NO_PUBLISHED_FORMAT: "No published format",
  SAME_PERSON: "Same name + DOB",
};

/** A bound on the post-check reads: each row costs a user read and, for a money viewer, a transaction read.
 *  ⛔ APPLIED AFTER THE WHOLE LIST IS ORDERED (2026-10-10), on what the list read already holds — flagged first, then the
 *  OLDEST approval (it has had longest to move money unchecked), then the submission id — so the rows kept are the same in
 *  both stores whatever order each returns, and a flagged approval is never cut while an unflagged one is kept. The
 *  money order is applied inside the cap: it needs the very per-row reads the cap bounds. */
const POST_CHECK_READ_CAP = 500;

/**
 * Σ what left the account since the automatic approval — CONFIRMED withdrawals and those still leaving (PROCESSING,
 * AML_REVIEW), as magnitudes. ⛔ A FAILED or DECLINED withdrawal did not leave, and is not counted.
 */
async function withdrawnSince(userId: string, sinceIso: string): Promise<number> {
  const txns = await (async () => db.txn.listForUser(userId))();
  let sum = 0;
  for (const t of txns) {
    if (t.type !== "WITHDRAWAL" || t.createdAt < sinceIso) continue;
    if (t.status === "CONFIRMED" || t.status === "PROCESSING" || t.status === "AML_REVIEW") sum += Math.abs(t.amount);
  }
  return sum;
}

type UsField = "priority" | "waiting" | "held" | "attempts";
type PlField = "held" | "opened" | "attempts";
type FdField = "held" | "attempts";

type KycQueueProps = {
  searchParams: Promise<{
    ussort?: string; usdir?: string; uspage?: string;
    plsort?: string; pldir?: string; plpage?: string;
    fdsort?: string; fddir?: string; fdpage?: string;
    pcpage?: string;
  }>;
};

/** W25 belt 2 — the stored-row gate, in the PAGE: a flight request naming this section's layout skips the layout. */
export default async function KycQueuePage(props: KycQueueProps) {
  return <AdminPageGate title="KYC"><KycQueueContent {...props} /></AdminPageGate>;
}

async function KycQueueContent({ searchParams }: KycQueueProps) {
  const sp = await searchParams;
  const now = Date.now();
  const session = await currentSession();
  // 🔴 ASKED BEFORE ANY WALLET IS READ — privileged data that is never fetched cannot leak.
  const canSeeMoney = session ? await canView(session.role, "accounting") : false;

  // ⭐ `readKycQueueIdentity` (kyc-risk.ts) — the one identity × money read this page shares with
  // /admin/approvals, so the two queues cannot fail differently. It never throws.
  const [identity, blocked, refused, emailBlocked] = await Promise.all([
    readKycQueueIdentity(canSeeMoney),
    readBlockedCashOuts().catch(() => null),
    // ⛔ MONEY-DERIVED, SO MONEY-GATED (audit session 95, 2026-09-14): "undecided" is where the money stands, so a
    // viewer without money rights reads no report at all — the tile says "not in your role".
    canSeeMoney ? refusedFundsReport({ money: true }).catch(() => null) : null,
    // ⭐ The email half of the withdrawal gate (2026-10-07) — read apart, reported beside the identity count, never in it.
    readBlockedEmailCashOuts().catch(() => null),
  ]);

  const { facts, wallets, walletsFailed } = identity;
  const factsFailed = facts === null;
  /** Money is APPLIED only for a viewer with money rights whose wallet read succeeded. */
  const moneyKnown = canSeeMoney && wallets !== null;
  const walletByUser = new Map((wallets ?? []).map((w) => [w.userId, w] as const));
  const attemptsByUser = blocked ? blockedCashOutsByPlayer(blocked) : null;

  // The DAL already reduces to the newest submission per user; first row wins, as everywhere else.
  const factsByUser = new Map<string, StoredKycStageRow>();
  for (const f of facts ?? []) if (!factsByUser.has(f.userId)) factsByUser.set(f.userId, f);

  // ⭐ MONEY_NOT_APPLIED for the FILE stages: money splits only "nothing sent", and none of these three
  // words is that arm — so the stage here is the same word for every viewer.
  const fileRows: FileRow[] = [...factsByUser.values()].map((f) => {
    const a = attemptsByUser?.get(f.userId);
    return {
      userId: f.userId,
      stage: kycStage(f, MONEY_NOT_APPLIED),
      waitingSince: f.submittedAt,
      opened: f.createdAt,
      heldTzs: moneyKnown ? walletHeldTzs(walletByUser.get(f.userId)) : null,
      attempts: attemptsByUser ? (a?.count ?? 0) : null,
      lastAttemptAt: a?.lastAt ?? null,
    };
  });

  const bySince = (a: FileRow, b: FileRow) => (a.waitingSince ?? "").localeCompare(b.waitingSince ?? "");
  const flip = (n: number, dir: SortDir) => (dir === "asc" ? n : -n);

  // ── WITH US ────────────────────────────────────────────────────────────────
  const slaMs = KYC_REVIEW_SLA_HOURS * H;
  const ageOf = (r: FileRow) => (r.waitingSince ? now - Date.parse(r.waitingSince) : null);
  const withUsAll = fileRows.filter((r) => r.stage === "with_us");
  const pastTarget = withUsAll.filter((r) => { const a = ageOf(r); return a !== null && a > slaMs; }).length;

  const usAllowed: readonly UsField[] = moneyKnown ? ["priority", "waiting", "held", "attempts"] : ["waiting", "attempts"];
  const us = parseSort<UsField>(sp, usAllowed, moneyKnown ? "priority" : "waiting", moneyKnown ? "desc" : "asc", "us");
  const priorityOrder = compareQueuePriority<FileRow>(
    (r) => ({ attemptedCashOut: (r.attempts ?? 0) > 0, heldTzs: r.heldTzs ?? 0, waitingSince: r.waitingSince }),
    us.dir,
  );
  const usSorted = [...withUsAll].sort((a, b) => {
    switch (us.sort) {
      case "priority": return priorityOrder(a, b);
      case "held": return flip((a.heldTzs ?? 0) - (b.heldTzs ?? 0), us.dir) || bySince(a, b);
      case "attempts": return flip((a.attempts ?? 0) - (b.attempts ?? 0), us.dir) || bySince(a, b);
      default: return flip(bySince(a, b), us.dir);
    }
  });
  const usPage = parsePage(sp.uspage, usSorted.length);
  const usRows = usSorted.slice((usPage - 1) * PER_PAGE, usPage * PER_PAGE);
  const usBase = buildBaseHref("/admin/kyc", sp, "uspage");

  // ── WITH THE PLAYER ────────────────────────────────────────────────────────
  const withPlayerAll = fileRows.filter((r) => r.stage === "uploaded" || r.stage === "more_needed");
  const plAllowed: readonly PlField[] = moneyKnown ? ["held", "opened", "attempts"] : ["opened", "attempts"];
  const pl = parseSort<PlField>(sp, plAllowed, moneyKnown ? "held" : "opened", moneyKnown ? "desc" : "asc", "pl");
  const plSorted = [...withPlayerAll].sort((a, b) => {
    const byOpened = a.opened.localeCompare(b.opened);
    switch (pl.sort) {
      case "held": return flip((a.heldTzs ?? 0) - (b.heldTzs ?? 0), pl.dir) || byOpened;
      case "attempts": return flip((a.attempts ?? 0) - (b.attempts ?? 0), pl.dir) || byOpened;
      default: return flip(byOpened, pl.dir);
    }
  });
  const plPage = parsePage(sp.plpage, plSorted.length);
  const plRows = plSorted.slice((plPage - 1) * PER_PAGE, plPage * PER_PAGE);
  const plBase = buildBaseHref("/admin/kyc", sp, "plpage");

  // ── FUNDED, NOTHING SUBMITTED ──────────────────────────────────────────────
  // ⭐ `kycMoneyRows` — one row per WALLET, stage with money applied — so an account with no submission row
  // at all (the normal state of a new player since 2026-09-13) is found here, which a loop over files never could.
  const fundedAll = moneyKnown && facts && wallets
    ? kycMoneyRows(facts, wallets).filter((r) => r.stage === "funded_nothing_yet")
    : [];
  const fundedHeld = fundedAll.reduce((s, r) => s + r.heldTzs, 0);
  const fd = parseSort<FdField>(sp, ["held", "attempts"], "held", "desc", "fd");
  const attemptsOf = (userId: string) => attemptsByUser?.get(userId)?.count ?? 0;
  const fdSorted = [...fundedAll].sort((a, b) =>
    fd.sort === "attempts"
      ? flip(attemptsOf(a.userId) - attemptsOf(b.userId), fd.dir) || b.heldTzs - a.heldTzs
      : flip(a.heldTzs - b.heldTzs, fd.dir),
  );
  const fdPage = parsePage(sp.fdpage, fdSorted.length);
  const fdRows = fdSorted.slice((fdPage - 1) * PER_PAGE, fdPage * PER_PAGE);
  const fdBase = buildBaseHref("/admin/kyc", sp, "fdpage");

  // ── VERIFIED AUTOMATICALLY · NOT YET CHECKED (2026-10-10) ──────────────────
  // ⛔ A FAILED READ IS SAID (`null`), never an empty list — "nothing to check" after a database blip would be a false
  // all-clear on approvals nobody has looked at. The async wrapper catches a SYNC throw from the in-memory store.
  const uncheckedRead = await (async () => db.kyc.listUncheckedAutoApprovals())().catch(() => null);
  const isFlagged = (r: { autoFlags: string[] }) => asKycFlags(r.autoFlags).length > 0;
  // ⛔ ORDERED, THEN CAPPED (2026-10-10). It was capped first, on whatever order the store returned — so past the cap a
  // flagged approval could fall off a list that says flagged come first, and the two stores kept different rows. The
  // order is total (the submission id breaks a tie), and the money order below is a stable re-sort inside it.
  const uncheckedRanked = uncheckedRead
    ? [...uncheckedRead].sort((a, b) =>
        (isFlagged(b) ? 1 : 0) - (isFlagged(a) ? 1 : 0)
        || a.autoApprovedAt.localeCompare(b.autoApprovedAt)
        || a.id.localeCompare(b.id),
      )
    : [];
  const uncheckedCapped = uncheckedRanked.slice(0, POST_CHECK_READ_CAP);
  // 🔴 MONEY IS READ ONLY FOR A VIEWER WITH MONEY RIGHTS — and so is the money ORDER: a balance-weighted rank shown to a
  // role without them would leak which approvals moved the most money.
  let postCheckMoneyFailed = false as boolean;
  const postCheckAll: PostCheckRow[] = await Promise.all(
    uncheckedCapped.map(async (r): Promise<PostCheckRow> => {
      // ⛔ A FAILED READ IS ITS OWN ARM — it used to `.catch(() => null)` and so print "Erased" on a database blip.
      const u = await (async () => db.user.findById(r.userId))().catch(() => "failed" as const);
      const withdrawn = canSeeMoney
        ? await withdrawnSince(r.userId, r.autoApprovedAt).catch(() => { postCheckMoneyFailed = true; return null; })
        : null;
      return {
        userId: r.userId,
        status: r.status,
        idType: r.idType,
        autoApprovedAt: r.autoApprovedAt,
        flags: asKycFlags(r.autoFlags),
        withdrawnTzs: withdrawn,
        account: u === "failed" ? "unreadable" : !u ? "missing" : isErasedPhone(u.phoneE164) ? "erased" : u.status === "CLOSED" ? "closed" : null,
      };
    }),
  );
  const postCheckMoney = canSeeMoney && !postCheckMoneyFailed;
  // Flagged first; then (money viewers) the most withdrawn since the approval; then the oldest approval first (and, the
  // sort being stable, the submission-id order the cap was taken in).
  const postCheckSorted = [...postCheckAll].sort((a, b) =>
    (b.flags.length > 0 ? 1 : 0) - (a.flags.length > 0 ? 1 : 0)
    || (postCheckMoney ? (b.withdrawnTzs ?? 0) - (a.withdrawnTzs ?? 0) : 0)
    || a.autoApprovedAt.localeCompare(b.autoApprovedAt),
  );
  const pcPage = parsePage(sp.pcpage, postCheckSorted.length);
  const pcRows = postCheckSorted.slice((pcPage - 1) * PER_PAGE, pcPage * PER_PAGE);
  const pcBase = buildBaseHref("/admin/kyc", sp, "pcpage");
  // Over the WHOLE list, like the count beside it — never only the rows inside the cap.
  const pcFlagged = uncheckedRead ? uncheckedRead.filter(isFlagged).length : 0;
  const pcCols = 5 + (postCheckMoney ? 1 : 0);

  // ── KPIs ───────────────────────────────────────────────────────────────────
  const week = blocked ? tallyBlockedCashOuts(blocked, now - 7 * 24 * H) : null;
  const emailWeek = emailBlocked ? tallyBlockedCashOuts(emailBlocked, now - 7 * 24 * H) : null;
  // ⭐ THE REPORT'S OWN STATE WORD (audit session 95): a case waits on an officer while it is undecided, or while a
  // return's payout failed and the money is still in the frozen wallet. On hold, in flight and settled do not.
  const openRefused = canSeeMoney && refused && !refused.accountsFailed
    ? refused.accounts.filter(awaitsOfficer)
    : null;
  const openRefusedHeld = (openRefused ?? []).reduce((s, a) => s + (a.balance ?? 0) + (a.hold ?? 0), 0);

  const attemptsCell = (r: { attempts: number | null; lastAttemptAt: string | null }) =>
    r.attempts === null ? (
      <span className="text-warning-fg">not readable</span>
    ) : r.attempts === 0 ? (
      <span className="text-text-tertiary">0</span>
    ) : (
      <span className="text-text" title={r.lastAttemptAt ? `last refused ${formatDateTime(r.lastAttemptAt)}` : undefined}>
        {r.attempts}
      </span>
    );

  const usCols = 5 + (moneyKnown ? 2 : 0);
  const plCols = 5 + (moneyKnown ? 1 : 0);

  return (
    <>
      <AdminPageHead
        title="KYC queue"
        sw="Foleni ya uthibitisho"
        actions={
          <>
            <Link href={"/admin/kyc/refused" as Route} className="btn btn-ghost btn-sm inline-flex items-center gap-1.5">
              Refused balances <I.chevronRight s={12} />
            </Link>
            <Link href={"/admin/approvals" as Route} className="btn btn-ghost btn-sm inline-flex items-center gap-1.5">
              Approvals <I.chevronRight s={12} />
            </Link>
          </>
        }
      />
      <AdminBody>
        <AdminCard>
          <p className="text-body-sm text-text-muted max-w-[72ch]">
            Identity is checked before a withdrawal and at no earlier step (owner ruling, 2026-09-13), so a person on this page
            may already hold a balance, and a file <strong className="text-text">with us</strong> can be a withdrawal waiting on
            our review. Review target: <strong className="text-text">{KYC_REVIEW_SLA_HOURS} hours</strong> from submission.
          </p>
          <p className="mt-2 text-body-sm text-text-muted max-w-[72ch]">
            From 2026-10-10 players verify with typed details and most are approved automatically. A file with us is a case the
            checks sent to an officer, an agent applicant&apos;s photos, or one sent before that date; every automatic approval is
            then <strong className="text-text">checked by an officer afterwards</strong>, in its own list below.
          </p>
        </AdminCard>

        <KpiGrid>
          <AdminKpi
            label="Past review target"
            sw="Zimepita muda"
            value={factsFailed ? "" : String(pastTarget)}
            unavailable={factsFailed}
            tone={!factsFailed && pastTarget > 0 ? "danger" : undefined}
            delta={factsFailed ? undefined : `${withUsAll.length} with us · ${KYC_REVIEW_SLA_HOURS}h target`}
          />
          <AdminKpi
            /* ⚠️ SHORT BY MEASUREMENT (2026-09-13): the KPI label and caption truncate, and on a
               screenshot "Cash-outs refused · 7d" lost its tail at 390px and "… 24h target" at 1280. The
               window rides the caption instead; the extra facts appear only when they are non-zero. */
            label="Cash-outs refused"
            sw="Kutoa kulikataliwa"
            value={week ? `${week.attempts}${week.complete ? "" : "+"}` : ""}
            unavailable={!week}
            delta={
              week
                ? [
                    "7d",
                    adminCount(week.players, "player"),
                    canSeeMoney ? `${formatTzsCompact(week.tzs)}${week.complete ? "" : "+"}` : null,
                    week.amountUnknown > 0 ? `${week.amountUnknown} no amount` : null,
                    week.operatorRetries > 0 ? `+${week.operatorRetries} retries` : null,
                  ].filter(Boolean).join(" · ")
                : undefined
            }
          />
          <AdminKpi
            label="Funded · none sent"
            sw="Wana pesa · hawajatuma"
            value={!canSeeMoney ? "—" : factsFailed || walletsFailed ? "" : String(fundedAll.length)}
            unavailable={canSeeMoney && (factsFailed || walletsFailed)}
            delta={!canSeeMoney ? "not in your role" : factsFailed || walletsFailed ? undefined : `${formatTzsCompact(fundedHeld)} held`}
          />
          <AdminKpi
            label="Refused · awaiting a decision"
            sw="Waliokataliwa · wanasubiri uamuzi"
            value={!canSeeMoney ? "—" : openRefused ? String(openRefused.length) : ""}
            unavailable={canSeeMoney && !openRefused}
            tone={openRefused && openRefused.length > 0 ? "danger" : undefined}
            delta={!canSeeMoney ? "not in your role" : openRefused ? `${formatTzsCompact(openRefusedHeld)} held` : undefined}
          />
        </KpiGrid>

        {/* ⛔ A FAILED AUDIT READ IS SAID, NOT ABSORBED: the per-row cells read "not readable", but the priority
            order would otherwise quietly rank every refused player as never having tried (2026-09-13). */}
        {!blocked && (
          <p className="text-body-sm text-warning-fg">
            Refused cash-outs could not be read, so no file is flagged for one{moneyKnown ? " and the priority order cannot put those players first" : ""}.
          </p>
        )}
        {blocked?.truncated && (
          <p className="text-body-sm text-warning-fg">
            Refused cash-outs are counted from the newest {blocked.rows.length} of {blocked.total}{" "}in the compliance log; a player&apos;s
            older refusals are not in the per-player counts below.
          </p>
        )}
        {/* ⭐ THE OTHER HALF OF THE WITHDRAWAL GATE (owner ruling 2026-10-07): a confirmed email address. Beside the
            identity count, never inside it — no officer can confirm a player's address, so nothing below is work for this
            queue; the number says whether the in-app prompt is reaching people. A failed read says so. */}
        <p className="text-body-sm text-text-muted" data-email-refusals={emailWeek ? emailWeek.attempts : "unreadable"}>
          {!emailWeek ? (
            <span className="text-warning-fg">Cash-outs refused for an unconfirmed email could not be read.</span>
          ) : (
            <>
              {/* Every numeral in the numeral face (§T5); "1 officer retry", never "+1 retries". */}
              Also refused in the last 7 days because the email address was not confirmed:{" "}
              <strong className="font-mono tabular-nums text-text">{`${emailWeek.attempts}${emailWeek.complete ? "" : "+"}`}</strong>
              {emailWeek.attempts > 0 && <> · <span className="font-mono tabular-nums">{adminCount(emailWeek.players, "player")}</span></>}
              {canSeeMoney && emailWeek.attempts > 0 && <> · <span className="font-mono tabular-nums">{`${formatTzsCompact(emailWeek.tzs)}${emailWeek.complete ? "" : "+"}`}</span></>}
              {emailWeek.operatorRetries > 0 && <> · plus <span className="font-mono tabular-nums">{adminCount(emailWeek.operatorRetries, "officer retry", "officer retries")}</span></>}
              . The player confirms it themselves, from the link we send.
            </>
          )}
        </p>

        {/* ── WITH US ─────────────────────────────────────────────────────────── */}
        <AdminCard
          title="With us · awaiting an officer"
          sw="Kwetu · zinasubiri afisa"
          action={
            moneyKnown ? (
              <div className="flex items-center gap-2 font-mono text-micro uppercase tracking-wider">
                <Link
                  href={orderHref(sp, "us", "priority", "desc") as Route}
                  aria-current={us.sort === "priority" ? "true" : undefined}
                  className={us.sort === "priority" ? "text-text" : "text-royal-300 hover:underline"}
                >
                  Priority order
                </Link>
                <span className="text-text-tertiary" aria-hidden>·</span>
                <Link
                  href={orderHref(sp, "us", "waiting", "asc") as Route}
                  aria-current={us.sort === "waiting" && us.dir === "asc" ? "true" : undefined}
                  className={us.sort === "waiting" && us.dir === "asc" ? "text-text" : "text-royal-300 hover:underline"}
                >
                  Oldest first (FIFO)
                </Link>
              </div>
            ) : undefined
          }
        >
          {factsFailed ? (
            <AdminLoadError what="the identity files" />
          ) : (
            <>
              {moneyKnown ? (
                <p className="mb-3 text-body-sm text-text-muted max-w-[80ch]">
                  Priority order: a player whose cash-out we already refused comes first, then by what the account holds
                  (at least TZS 1M, at least TZS 100K, any balance, nothing), and oldest first inside each group. It is never
                  balance multiplied by age, so a large balance cannot keep jumping a small one that has waited longer.
                </p>
              ) : canSeeMoney && walletsFailed ? (
                <p className="mb-3 text-body-sm text-warning-fg">
                  Balances could not be read, so this queue is shown oldest first, without the holding column or the priority order.
                </p>
              ) : null}
              <ScrollX label="Files with us">
                <table className="admin-tbl min-w-[760px]">
                  <thead className="font-mono text-micro eyebrow uppercase text-text-tertiary border-b border-border-subtle">
                    <tr>
                      {moneyKnown && <SortTh field="priority" label="Priority" current={us.sort} dir={us.dir} sp={sp} baseHref="/admin/kyc" prefix="us" className="py-2 pr-3" />}
                      <SortTh field="waiting" label="Submitted" current={us.sort} dir={us.dir} sp={sp} baseHref="/admin/kyc" prefix="us" className="py-2 pr-3" />
                      <th className="py-2 pr-3 text-left">Review target</th>
                      <th className="py-2 pr-3 text-left">Player</th>
                      {moneyKnown && <SortTh field="held" label="Holding" current={us.sort} dir={us.dir} sp={sp} baseHref="/admin/kyc" prefix="us" align="right" className="py-2 pr-3" />}
                      <SortTh field="attempts" label="Cash-outs refused" current={us.sort} dir={us.dir} sp={sp} baseHref="/admin/kyc" prefix="us" align="right" className="py-2 pr-3" />
                      <th className="py-2 pl-3 text-right">Case</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usRows.map((r) => {
                      const age = ageOf(r);
                      const bucket = kycHeldBucket(r.heldTzs ?? 0);
                      return (
                        <tr key={r.userId} className="border-b border-border-subtle/50 last:border-b-0" data-kyc-queue="with-us">
                          {moneyKnown && (
                            <td className="py-2 pr-3">
                              <div className="flex flex-wrap gap-1">
                                {/* nowrap through `style` (2026-09-14): Chip sets white-space inline (G-7), so a class
                                    cannot reach it, and the auto-width column folded "Holds nothing" onto two lines. */}
                                {(r.attempts ?? 0) > 0 && <Chip size="sm" variant="danger" style={{ whiteSpace: "nowrap" }}>Cash-out refused</Chip>}
                                <Chip size="sm" variant={bucket >= 2 ? "warning" : "neutral"} style={{ whiteSpace: "nowrap" }}>{KYC_HELD_BUCKET_LABEL[bucket]}</Chip>
                              </div>
                            </td>
                          )}
                          <td className="py-2 pr-3 font-mono whitespace-nowrap">{r.waitingSince ? formatDateTime(r.waitingSince) : "—"}</td>
                          <td className="py-2 pr-3">
                            {age === null ? (
                              "—"
                            ) : age > slaMs ? (
                              <Chip size="sm" variant="danger" style={{ whiteSpace: "nowrap" }}>{`past · waited ${kycWaitedLabel(age)}`}</Chip>
                            ) : (
                              <Chip size="sm" variant={slaMs - age < 2 * H ? "warning" : "neutral"} style={{ whiteSpace: "nowrap" }}>{`${kycWaitedLabel(slaMs - age)} left`}</Chip>
                            )}
                          </td>
                          <td className="py-2 pr-3">
                            <Link href={`/admin/players/${r.userId}?tab=kyc` as Route} className="font-mono text-royal-300 hover:underline">{r.userId.slice(0, 14)}…</Link>
                          </td>
                          {moneyKnown && <td className="py-2 pr-3 text-right font-mono tabular-nums text-text">{formatTzs(r.heldTzs ?? 0)}</td>}
                          <td className="py-2 pr-3 text-right font-mono tabular-nums">{attemptsCell(r)}</td>
                          <td className="py-2 pl-3 text-right">
                            <Link href={`/admin/kyc/${r.userId}` as Route} className="row-link whitespace-nowrap font-mono text-micro text-royal-300 hover:underline">workstation →</Link>
                          </td>
                        </tr>
                      );
                    })}
                    {usSorted.length === 0 && (
                      <AdminTableEmpty colSpan={usCols} kind="admin" title="Nothing waiting on us" body="No identity file is waiting for an officer. A file appears here the moment the checks send one to an officer, or an agent applicant sends their photos." />
                    )}
                  </tbody>
                </table>
              </ScrollX>
              <AdminPagination total={usSorted.length} page={usPage} baseHref={usBase} param="uspage" />
            </>
          )}
        </AdminCard>

        {/* ── VERIFIED AUTOMATICALLY · NOT YET CHECKED (2026-10-10) ────────────── */}
        <AdminCard title="Verified automatically · not yet checked" sw="Zimethibitishwa kiotomatiki · hazijakaguliwa">
          {!uncheckedRead ? (
            <AdminLoadError what="the automatic approvals" />
          ) : (
            <>
              <p className="mb-3 text-body-sm text-text-muted max-w-[80ch]">
                {adminCount(uncheckedRead.length, "approval")} made automatically from typed details and not yet checked by an officer
                {pcFlagged > 0 ? <> · <strong className="text-warning-fg">{pcFlagged} flagged</strong></> : null}. Flagged first
                {postCheckMoney ? ", then by what has been withdrawn since the approval" : ""}, oldest first inside each group. A closed or
                erased account stays on the list, badged — and so does an approval now with us or with the player, marked with
                its stage: an officer&apos;s approval on the workstation checks it.
              </p>
              {canSeeMoney && postCheckMoneyFailed && (
                <p className="mb-3 text-body-sm text-warning-fg">Withdrawals since approval could not be read, so this list is not ordered by money.</p>
              )}
              {uncheckedRead.length > POST_CHECK_READ_CAP && (
                <p className="mb-3 text-body-sm text-warning-fg">
                  Only {POST_CHECK_READ_CAP} of {uncheckedRead.length} are read and ranked here — the flagged ones first, then the oldest approvals; check these first and the rest appear as the list shortens.
                </p>
              )}
              <ScrollX label="Automatic approvals not yet checked">
                <table className="admin-tbl min-w-[720px]">
                  <thead className="font-mono text-micro eyebrow uppercase text-text-tertiary border-b border-border-subtle">
                    <tr>
                      <th className="py-2 pr-3 text-left">Flags</th>
                      <th className="py-2 pr-3 text-left">Approved</th>
                      <th className="py-2 pr-3 text-left">Player</th>
                      <th className="py-2 pr-3 text-left">Document</th>
                      {postCheckMoney && <th className="py-2 pr-3 text-right">Withdrawn since</th>}
                      <th className="py-2 pl-3 text-right">Check</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pcRows.map((r) => (
                      <tr key={r.userId} className="border-b border-border-subtle/50 last:border-b-0" data-kyc-queue="post-check">
                        <td className="py-2 pr-3">
                          <div className="flex flex-wrap gap-1">
                            {r.flags.length > 0
                              ? r.flags.map((f) => <Chip key={f} size="sm" variant="warning" style={{ whiteSpace: "nowrap" }} title={FLAG_LABEL[f]}>{FLAG_SHORT[f]}</Chip>)
                              : <span className="text-text-tertiary">—</span>}
                          </div>
                        </td>
                        <td className="py-2 pr-3 font-mono whitespace-nowrap">{formatDateTime(r.autoApprovedAt)}</td>
                        <td className="py-2 pr-3">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <Link href={`/admin/players/${r.userId}?tab=kyc` as Route} className="font-mono text-royal-300 hover:underline">{r.userId.slice(0, 14)}…</Link>
                            {r.account && <Chip size="sm" variant="neutral" style={{ whiteSpace: "nowrap" }}>{ACCOUNT_BADGE[r.account]}</Chip>}
                            {/* ⭐ Not simply approved any more (R5.1): with an officer, or with the player — said, never hidden. */}
                            {POST_CHECK_STAGE[r.status] && <Chip size="sm" variant="neutral" style={{ whiteSpace: "nowrap" }} data-post-check-status={r.status}>{POST_CHECK_STAGE[r.status]}</Chip>}
                          </div>
                        </td>
                        <td className="py-2 pr-3 text-body-sm">{r.idType && isIdDocType(r.idType) ? ID_TYPE_SHORT[r.idType] : "—"}</td>
                        {postCheckMoney && <td className="py-2 pr-3 text-right font-mono tabular-nums text-text">{formatTzs(r.withdrawnTzs ?? 0)}</td>}
                        <td className="py-2 pl-3 text-right">
                          <Link href={`/admin/kyc/${r.userId}` as Route} className="row-link whitespace-nowrap font-mono text-micro text-royal-300 hover:underline">workstation →</Link>
                        </td>
                      </tr>
                    ))}
                    {postCheckSorted.length === 0 && (
                      <AdminTableEmpty colSpan={pcCols} kind="admin" title="Every automatic approval is checked" body="An identity approved automatically appears here until an officer marks it checked." />
                    )}
                  </tbody>
                </table>
              </ScrollX>
              <AdminPagination total={postCheckSorted.length} page={pcPage} baseHref={pcBase} param="pcpage" />
            </>
          )}
        </AdminCard>

        {/* ── WITH THE PLAYER ─────────────────────────────────────────────────── */}
        <AdminCard title="With the player · photos not sent, or corrections asked" sw="Kwa mchezaji · picha hazijatumwa, au marekebisho yameombwa">
          {factsFailed ? (
            <AdminLoadError what="the identity files" />
          ) : (
            <>
              <ScrollX label="Files with the player">
                <table className="admin-tbl min-w-[720px]">
                  <thead className="font-mono text-micro eyebrow uppercase text-text-tertiary border-b border-border-subtle">
                    <tr>
                      <th className="py-2 pr-3 text-left">Stage</th>
                      <SortTh field="opened" label="Opened" current={pl.sort} dir={pl.dir} sp={sp} baseHref="/admin/kyc" prefix="pl" className="py-2 pr-3" />
                      <th className="py-2 pr-3 text-left">Player</th>
                      {moneyKnown && <SortTh field="held" label="Holding" current={pl.sort} dir={pl.dir} sp={sp} baseHref="/admin/kyc" prefix="pl" align="right" className="py-2 pr-3" />}
                      <SortTh field="attempts" label="Cash-outs refused" current={pl.sort} dir={pl.dir} sp={sp} baseHref="/admin/kyc" prefix="pl" align="right" className="py-2 pr-3" />
                      <th className="py-2 pl-3 text-right">Open</th>
                    </tr>
                  </thead>
                  <tbody>
                    {plRows.map((r) => (
                      <tr key={r.userId} className="border-b border-border-subtle/50 last:border-b-0" data-kyc-queue="with-player">
                        <td className="py-2 pr-3"><KycStageBadge cell={r.stage} /></td>
                        <td className="py-2 pr-3 font-mono whitespace-nowrap">{formatDateTime(r.opened)}</td>
                        <td className="py-2 pr-3">
                          <Link href={`/admin/players/${r.userId}?tab=kyc` as Route} className="font-mono text-royal-300 hover:underline">{r.userId.slice(0, 14)}…</Link>
                        </td>
                        {moneyKnown && <td className="py-2 pr-3 text-right font-mono tabular-nums text-text">{formatTzs(r.heldTzs ?? 0)}</td>}
                        <td className="py-2 pr-3 text-right font-mono tabular-nums">{attemptsCell(r)}</td>
                        <td className="py-2 pl-3 text-right">
                          {/* A file we asked corrections of is a CASE — its workstation holds the note, and its rail can
                              still reject, refuse or escalate it (2026-10-10). Photos never sent are not a case yet: the
                              workstation draws no rail for them. */}
                          {r.stage === "more_needed" ? (
                            <Link href={`/admin/kyc/${r.userId}` as Route} className="row-link whitespace-nowrap font-mono text-micro text-royal-300 hover:underline">workstation →</Link>
                          ) : (
                            <Link href={`/admin/players/${r.userId}?tab=kyc` as Route} className="row-link font-mono text-micro text-royal-300 hover:underline">player →</Link>
                          )}
                        </td>
                      </tr>
                    ))}
                    {plSorted.length === 0 && (
                      <AdminTableEmpty colSpan={plCols} kind="admin" title="No file is with a player" body="No agent applicant has unsent photos, and no request for corrections is waiting on a player." />
                    )}
                  </tbody>
                </table>
              </ScrollX>
              <AdminPagination total={plSorted.length} page={plPage} baseHref={plBase} param="plpage" />
            </>
          )}
        </AdminCard>

        {/* ── FUNDED, NOTHING SUBMITTED ───────────────────────────────────────── */}
        <AdminCard title="Funded · nothing submitted" sw="Wana pesa · hawajatuma chochote">
          {!canSeeMoney ? (
            <p className="text-body-sm text-text-muted">Balances are not part of your role&apos;s view, so this list is not shown to you.</p>
          ) : factsFailed ? (
            <AdminLoadError what="the identity files" />
          ) : walletsFailed ? (
            <AdminLoadError what="the balances" />
          ) : (
            <>
              <p className="mb-3 text-body-sm text-text-muted max-w-[80ch]">
                Accounts never approved that hold money and have sent us nothing. Nothing is asked of them until they reach for a
                withdrawal; a refused cash-out here means they have tried and not yet started.
              </p>
              <ScrollX label="Funded, nothing submitted">
                <table className="admin-tbl min-w-[640px]">
                  <thead className="font-mono text-micro eyebrow uppercase text-text-tertiary border-b border-border-subtle">
                    <tr>
                      <th className="py-2 pr-3 text-left">Player</th>
                      <SortTh field="held" label="Holding" current={fd.sort} dir={fd.dir} sp={sp} baseHref="/admin/kyc" prefix="fd" align="right" className="py-2 pr-3" />
                      <th className="py-2 pr-3 text-left">Wallet</th>
                      <SortTh field="attempts" label="Cash-outs refused" current={fd.sort} dir={fd.dir} sp={sp} baseHref="/admin/kyc" prefix="fd" align="right" className="py-2 pr-3" />
                      <th className="py-2 pl-3 text-right">Open</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fdRows.map((r) => {
                      const a = attemptsByUser?.get(r.userId);
                      return (
                        <tr key={r.userId} className="border-b border-border-subtle/50 last:border-b-0" data-kyc-queue="funded">
                          <td className="py-2 pr-3">
                            <Link href={`/admin/players/${r.userId}?tab=kyc` as Route} className="font-mono text-royal-300 hover:underline">{r.userId.slice(0, 14)}…</Link>
                          </td>
                          <td className="py-2 pr-3 text-right font-mono tabular-nums text-text">{formatTzs(r.heldTzs)}</td>
                          <td className="py-2 pr-3 text-body-sm">{r.walletStatus === "FROZEN" ? "Frozen" : r.walletStatus === "CLOSED" ? "Closed" : "Active"}</td>
                          <td className="py-2 pr-3 text-right font-mono tabular-nums">
                            {attemptsCell({ attempts: attemptsByUser ? (a?.count ?? 0) : null, lastAttemptAt: a?.lastAt ?? null })}
                          </td>
                          <td className="py-2 pl-3 text-right">
                            <Link href={`/admin/players/${r.userId}?tab=kyc` as Route} className="row-link font-mono text-micro text-royal-300 hover:underline">player →</Link>
                          </td>
                        </tr>
                      );
                    })}
                    {fdSorted.length === 0 && (
                      <AdminTableEmpty colSpan={5} kind="admin" title="No funded account without a submission" body="Every account that holds money has either been approved or has sent us something." />
                    )}
                  </tbody>
                </table>
              </ScrollX>
              <AdminPagination total={fdSorted.length} page={fdPage} baseHref={fdBase} param="fdpage" />
            </>
          )}
        </AdminCard>
      </AdminBody>
    </>
  );
}
