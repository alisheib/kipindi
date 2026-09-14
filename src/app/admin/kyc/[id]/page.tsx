import { notFound } from "next/navigation";
import Link from "next/link";
import type { Route } from "next";
import { AdminPageHead, AdminCard } from "@/components/admin/admin-shell";
import { AdminMeter } from "@/components/admin/admin-charts";
import { Chip } from "@/components/ui/chip";
import { I } from "@/components/ui/glyphs";
import { db, type StoredWallet, type StoredTxn } from "@/lib/server/store";
import { txnStatusLabel, KycStageBadge } from "@/components/admin/status-badge";
import { listPendingKyc } from "@/lib/server/kyc-service";
import { kycCaseRead, kycMoneyFacts, toBlockedCashOut, getApprovalRecommendation, KYC_MAKER_CHECKER_THRESHOLD, type BlockedCashOut } from "@/lib/server/kyc-risk";
import { currentSession } from "@/lib/server/auth-service";
import { canView } from "@/lib/server/rbac";
import { formatDateTime } from "@/lib/utils";
import { KycDocViewer } from "./kyc-doc-viewer";
import { Sensitive } from "@/components/ui/sensitive";
import { maskDob } from "@/lib/server/sensitive-fields";
import { KycDecisionRail } from "./kyc-decision-rail";
import { RefusedFundsPanel } from "./refused-funds-panel";
import { ReopenRefusalControl } from "./reopen-refusal-control";
import { isFinalRefusal, type FinalRefusalCode } from "@/lib/kyc-refusal";
import { approvedEver } from "@/lib/kyc-approval";
import { walletHeldTzs, isFileWithUs } from "@/lib/kyc-stage";
import { KYC_REVIEW_SLA_HOURS } from "@/lib/kyc-sla";
import { isOfAge } from "@/lib/id-documents";
import { refusedFundsPosition, toDecisionRow, withPayoutNow } from "@/lib/server/refused-funds";
import { getAuditForTargetDurable } from "@/lib/server/audit";
import { REFUSED_FUNDS_ACTION, REFUSED_FUNDS_OUTCOME_COPY } from "@/lib/refused-funds-outcomes";
import { FREEZE_REASON_LABEL, isWalletFreezeReason, currentFreezeReasons } from "@/lib/wallet-freeze-reasons";
import { formatTzs, adminCount } from "@/lib/utils";

/** The four balance-decision audit actions — a prior decision on this case is any of them. */
const REFUSED_ACTIONS: ReadonlySet<string> = new Set(Object.values(REFUSED_FUNDS_ACTION));

/** Officer-facing names (audit session 95, 2026-09-14) — the decision header printed "FINAL · UNDERAGE" and the
 *  refused card the raw wallet status. ⚠️ The code map is the twin of the one on /admin/kyc/refused: a page file
 *  cannot export one. Typed on the code list, so a fourth final code fails the build rather than printing a token. */
const FINAL_CODE_LABEL: Record<FinalRefusalCode, string> = {
  UNDERAGE: "Under 18",
  SANCTIONED: "Sanctions concern",
  DUPLICATE_IDENTITY: "Identity used on another account",
};
const WALLET_STATUS_LABEL: Record<"ACTIVE" | "FROZEN" | "CLOSED", string> = { ACTIVE: "Active", FROZEN: "Frozen", CLOSED: "Closed" };
import {
  ID_DOC_SPECS,
  ALL_DOC_SLOTS,
  isIdDocType,
  isExpired,
  nidaDateOfBirth,
  validateIdNumber,
  type IdDocType,
  type KycDocSlot,
} from "@/lib/id-documents";

export const metadata = { title: "Admin · KYC workstation" };
export const dynamic = "force-dynamic";

// ⛔ NO PAGE-LOCAL `SLA_HOURS` ANY MORE (2026-09-13). The 24-hour target lived here as a private constant,
// visible only once an officer had opened a case. It is `KYC_REVIEW_SLA_HOURS` (src/lib/kyc-sla.ts) now —
// the one number the withdrawal screen quotes to the player, the KYC queue ages against, and the breach
// alert fires on — so the officer's clock here cannot drift from the promise made to the player.

/**
 * Officer-facing names. ⚠️ The ADMIN CONSOLE IS ENGLISH-ONLY BY DESIGN (it is a
 * staff surface — `test:failure-reasons` §10 excludes it from the trilingual
 * ratchet for exactly this reason), so these are literals rather than dictionary
 * keys. The PLAYER's names for the same things live in `i18n-dict.ts` and are
 * resolved through `DOC_SLOT_LABEL_KEY`.
 */
const ID_TYPE_LABEL: Record<IdDocType, string> = {
  NIDA: "NIDA",
  PASSPORT: "Passport",
  DRIVER_LICENSE: "Driving licence",
  VOTER_CARD: "Voter's card",
};
const ADMIN_SLOT_LABEL: Record<KycDocSlot, string> = {
  NIDA_FRONT: "NIDA front",
  NIDA_BACK: "NIDA back",
  PASSPORT: "Passport bio page",
  DRIVER_LICENSE: "Licence front",
  VOTER_CARD: "Voter's card",
  SELFIE: "Selfie",
};

function ageLabel(iso: string | null): string {
  if (!iso) return "—";
  const ms = Date.now() - Date.parse(iso);
  const h = Math.floor(ms / 3_600_000);
  if (h < 1) return `${Math.max(0, Math.floor(ms / 60_000))}m`;
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export default async function KycWorkstationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // db.kyc.findByUserId / db.user.findById are SYNC in the dev store — wrap so
  // .catch works whether the store returns a value or a Promise.
  const kyc = await Promise.resolve(db.kyc.findByUserId(id)).catch(() => null);
  if (!kyc) notFound();
  const user = await Promise.resolve(db.user.findById(id)).catch(() => null);
  const session = await currentSession();
  const currentOfficerId = session?.userId ?? "";
  // 🔴 ASKED BEFORE THE WALLET IS READ (2026-09-13) — the same money gate as the roster and /admin/kyc. A
  // viewer without it sees the counts and dates on "Money at stake", never a shilling figure.
  const canSeeMoney = session ? await canView(session.role, "accounting") : false;

  const decided = kyc.status === "APPROVED" || kyc.status === "REJECTED";
  // ⭐ ONE TRANSACTION SCAN (2026-09-13). The risk score and the "Money at stake" card read the same rows:
  // `kycCaseRead` returns them beside the score, so the card costs no second `listForUser` (kyc-risk.ts header).
  const { risk, txns } = await kycCaseRead(id);
  const moneyFacts = kycMoneyFacts(txns);
  const makerCheckerRequired = risk.score >= KYC_MAKER_CHECKER_THRESHOLD;
  const recommendation = await getApprovalRecommendation(id);
  const sof = await Promise.resolve(db.sourceOfFunds.get(id)).catch(() => null);
  // The wallet, for a money viewer only. `undefined` = never asked; "failed" = the read failed, which is NOT
  // a zero balance; `null` = no wallet, which genuinely holds nothing. The async wrapper also catches a
  // SYNC throw from the in-memory store.
  const wallet: StoredWallet | null | "failed" | undefined = canSeeMoney
    ? await (async () => db.wallet.findByUserId(id))().catch(() => "failed" as const)
    : undefined;

  // ⭐ ONE AUDIT READ, TWO READERS (2026-09-13): the balance-decision history on a refused case and the
  // cash-outs we refused this player both come from this account's DURABLE audit rows (never the ring, which
  // empties on every deploy). ⛔ `null` = the read failed, and each reader says so rather than showing none.
  const targetAudit = await getAuditForTargetDurable("User", id, { limit: 500 }).catch(() => null);
  const cashOuts = targetAudit
    ? targetAudit.entries.map(toBlockedCashOut).filter((c): c is BlockedCashOut => c !== null)
    : null;
  // ⛔ An officer's retry (S10) is not the player reaching for their money — reported beside, never inside.
  const playerCashOuts = cashOuts ? cashOuts.filter((c) => !c.operatorInitiated) : null;
  const officerRetries = cashOuts && playerCashOuts ? cashOuts.length - playerCashOuts.length : 0;
  const daysSinceFirstDeposit = moneyFacts.firstDepositAt
    ? Math.floor((Date.now() - Date.parse(moneyFacts.firstDepositAt)) / 86_400_000)
    : null;

  // ⭐ S1 (2026-09-13) — a FINAL refusal leaves a balance an officer must decide. Everything the panel
  // shows comes from `refusedFundsPosition`, the same read the action decides on, so the preview and
  // the decision cannot disagree. Prior decisions come from the DURABLE log, never the ring.
  const finalRefused = kyc.status === "REJECTED" && isFinalRefusal(kyc.rejectReason);
  const refused = finalRefused ? await refusedFundsPosition(id).catch(() => null) : null;
  const priorDecisions = finalRefused && targetAudit
    // ⭐ Through `withPayoutNow`: the audit row records a return's status at dispatch; only its transaction knows how it ended.
    ? { rows: await withPayoutNow(targetAudit.entries.filter((e) => REFUSED_ACTIONS.has(e.action)).map(toDecisionRow)), truncated: targetAudit.truncated }
    : null;

  // Queue context — position among the files WITH US. ⛔ `listPendingKyc` also returns ADDITIONAL_INFO_REQUIRED files,
  // which are the PLAYER's move (see the /admin/kyc header). Counting them printed "#1 of 2" beside a queue page saying
  // "1 with us", and "oldest" could be a file the player was holding (2026-09-14). `isFileWithUs` is the `with_us` arm
  // of `kycStage` (src/lib/kyc-stage.ts) — the rule /admin/kyc, /admin/approvals and the sidebar badges share.
  const pending = (await listPendingKyc().catch((): Awaited<ReturnType<typeof listPendingKyc>> => [])).filter(isFileWithUs);
  const queuePos = pending.findIndex((k) => k.userId === id);
  const oldest = pending[0]?.submittedAt ?? null;

  // ── WHICH DOCUMENT THIS SUBMISSION IS BUILT ON ────────────────────────────
  // ⛔ Everything below is derived from it. A reviewer's screen that assumes NIDA
  // shows the wrong slots, asks for an expiry a voter's card does not have, and
  // ticks "all documents present" against a count that means nothing.
  const idType = isIdDocType(kyc.idType) ? (kyc.idType as IdDocType) : null;
  const spec = idType ? ID_DOC_SPECS[idType] : null;

  // Auto-derived checklist (real signals only).
  const present = new Set(kyc.documents.map((d) => d.docType));
  // ⛔ The one age gate (`isOfAge`, whole years on the Tanzanian date) — the same answer registration gave.
  const age18 = kyc.dob ? isOfAge(kyc.dob, new Date()) : null;
  const required = spec?.requiredSlots ?? [];
  const allDocs = required.length > 0 && required.every((t) => present.has(t));

  // What the format check ACTUALLY established for THIS document, and what it
  // deliberately did not. `flags` is recomputed here rather than stored, so the
  // officer always reads the current rule rather than one frozen at submit time.
  const verdict = idType && kyc.idNumber ? validateIdNumber(idType, kyc.idNumber) : null;
  const formatDetail = !spec
    ? "no document type recorded"
    : spec.format.kind === "published"
      ? `format valid · unique to this account (no authority check by design) · ${spec.format.sourceNote}`
      : spec.format.kind === "secondary"
        ? `unique to this account (no authority check by design) · ${spec.format.sourceNote}${verdict?.ok && verdict.flags.includes("unofficial_shape") ? " ⚠ THIS NUMBER IS OUTSIDE THAT SHAPE — accepted deliberately, read the image" : ""}`
        : `unique to this account (no authority check by design) · ${spec.format.absenceNote}`;

  // 🔴 NIDA ONLY, AND SAID SO. Digits 1-8 of a NIDA are the holder's date of
  // birth; no other document carries one. Where they disagree with the DOB on the
  // account this is a REVIEWER FLAG, not a refusal — a stated DOB can be a
  // sign-up typo, and refusing would lock a real citizen out over it.
  const nidaDob = idType === "NIDA" && kyc.idNumber ? nidaDateOfBirth(kyc.idNumber) : null;
  const statedDob = kyc.dob ? kyc.dob.slice(0, 10) : null;
  const dobAgrees = nidaDob && statedDob ? nidaDob === statedDob : null;

  const expired = isExpired(kyc.idExpiry ?? null, new Date());
  // ⛔ THE CHECKLIST MASKS ITS DATES UNCONDITIONALLY, AND THAT IS DELIBERATE.
  // `AutoCheck.detail` is a plain STRING on a CLIENT component (kyc-decision-rail.tsx), so
  // <Sensitive> cannot go here — it is a server component. Masking at the source is the honest
  // alternative: the checklist's job is the VERDICT ("18 or older: pass"), which the masked year
  // still supports, and the revealable copy lives in the DOB Field above for a role permitted to
  // reveal it. ⚠️ `maskDob` is the registry's own mask, imported as a pure function — §6 keeps the
  // ANSWER (canRead/mayReveal) out of pages, not the masking itself.
  const autoChecks = [
    // POLICY (Ali, 2026-07-19, extended 2026-08-19): the control is FORMAT +
    // UNIQUENESS only — one document, one account. There is deliberately no
    // authority check for any of the four; `nida.ts` is a deterministic mock and
    // no request has ever reached the National Identification Authority, and no
    // equivalent endpoint exists for a passport, a licence or a voter's card.
    //
    // So this row must NOT read "verified / government match", as it used to.
    // That told a compliance officer a government confirmed this identity, which
    // would invite them to approve a withdrawal on evidence that does not exist.
    // It now states exactly what was checked and — where no format is published —
    // says so in the officer's own words, so the weight of the decision sits
    // visibly on the DOCUMENT IMAGE, which is where it has always actually been.
    { label: idType ? `${ID_TYPE_LABEL[idType]} number` : "Identity number", state: (kyc.idNumber ? "pass" : "pending") as "pass" | "fail" | "pending", detail: kyc.idNumber ? formatDetail : "not recorded" },
    // ⭐ THE PLATFORM'S ONLY AGE CHECK AGAINST A DOCUMENT, FROM 2026-09-13. Until then this review came
    // before any money; now a player deposits and plays on the date of birth they TYPED, and this row is
    // the first and last time a human compares age to a document. The detail says so, because "declared,
    // and gated" read as though something upstream had already verified it — nothing had.
    // A document that shows the player is under 18 is refused FINAL · Under 18, which freezes the wallet.
    { label: "18 or older", state: (age18 === null ? "pending" : age18 ? "pass" : "fail") as "pass" | "fail" | "pending", detail: kyc.dob ? `DOB ${maskDob(kyc.dob)} — typed by the player; check it against the document` : "no DOB" },
    ...(idType === "NIDA"
      ? [{ label: "NIDA date of birth agrees", state: (dobAgrees === null ? "pending" : dobAgrees ? "pass" : "fail") as "pass" | "fail" | "pending", detail: dobAgrees === null ? "not derivable" : `number says ${maskDob(String(nidaDob))}, account says ${maskDob(String(statedDob))}` }]
      : []),
    ...(spec?.expires
      ? [{ label: "Document in date", state: (!kyc.idExpiry ? "pending" : expired ? "fail" : "pass") as "pass" | "fail" | "pending", detail: kyc.idExpiry ? `expires ${kyc.idExpiry}${expired ? " — EXPIRED" : ""}` : "no expiry recorded" }]
      : []),
    { label: "All documents present", state: (allDocs ? "pass" : "fail") as "pass" | "fail" | "pending", detail: required.length ? `${required.filter((r) => present.has(r)).length}/${required.length} uploaded` : "no document type recorded" },
    { label: "Source-of-funds on file", state: (sof ? "pass" : "pending") as "pass" | "fail" | "pending", detail: sof ? sof.reviewStatus : "not required / absent" },
  ];

  // ⭐ A DECIDED CASE HAS NO CLOCK (2026-09-13). The countdown ran from `submittedAt` whatever the status, so an
  // approved or refused case kept reading "3h left" — or "40h overdue" — as though it still waited on an officer.
  const slaMs = !decided && kyc.submittedAt ? Date.parse(kyc.submittedAt) + KYC_REVIEW_SLA_HOURS * 3600_000 - Date.now() : null;
  const slaLabel = decided ? "Decided" : slaMs === null ? "—" : slaMs <= 0 ? `${Math.floor(-slaMs / 3600_000)}h overdue` : `${Math.floor(slaMs / 3600_000)}h ${Math.floor((slaMs % 3600_000) / 60_000)}m left`;
  const slaTone = slaMs === null ? "neutral" : slaMs <= 0 ? "danger" : slaMs < 2 * 3600_000 ? "warning" : "brand";

  // ⛔ THE VIEWER'S TABS ARE THIS DOCUMENT'S SLOTS. Three hard-written tabs meant
  // a passport submission offered "ID front / ID back / Selfie", two of which can
  // never hold anything — and the bio page, the only image that matters, had no
  // tab at all. An officer approving a document they cannot open is the human
  // control failing silently.
  //
  // ⚠️ Falls back to every known slot when the type is missing (a pre-2026-08-20
  // record mid-backfill), so nothing on file becomes unreachable.
  const slots = (required.length ? required : ALL_DOC_SLOTS).map((s) => ({
    type: s,
    label: ADMIN_SLOT_LABEL[s],
    uploadedAt: kyc.documents.find((d) => d.docType === s)?.uploadedAt ?? null,
  }));

  return (
    <>
      <AdminPageHead
        title="KYC workstation"
        sw="Kituo cha uthibitisho"
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            {/* ⚠️ "BY SUBMISSION" (2026-09-13): `listPendingKyc` is FIFO, while the queue's default view is
                money-weighted — an unlabelled "#3" would read as a rank in the list the officer came from. */}
            {queuePos >= 0 && (
              <span className="font-mono text-micro uppercase tracking-[0.12em] text-text-subtle">
                #{queuePos + 1} of {pending.length} by submission · oldest {ageLabel(oldest)}
              </span>
            )}
            {/* A file we asked more of is the PLAYER's move, so it holds no place in the queue above (2026-09-14). The header
                says whose move it is, in /admin/kyc's own word, rather than going quiet. */}
            {kyc.status === "ADDITIONAL_INFO_REQUIRED" && <KycStageBadge cell="more_needed" />}
            {/* ⚠️ LITERAL, not `h-8` — spacing is overridden (tailwind.config.ts:200-215) so
                `h-8` was 48px. 40px = --tap-min, the admin header-chip height.
                ⭐ BACK TO /admin/kyc (2026-09-13), the queue's own index — it was /admin/approvals while
                /admin/kyc had no list page. */}
            <Link href={"/admin/kyc" as Route} className="inline-flex items-center gap-1.5 h-[40px] px-3 rounded-md border border-border bg-bg-inset font-mono text-caption tracking-[0.08em] uppercase text-text-muted hover:text-text hover:border-border-strong transition-colors">
              <I.chevronLeft s={13} /> Queue
            </Link>
          </div>
        }
      />

      <div className="px-4 lg:px-6 py-5">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)] items-start">
          {/* Document viewer (left) */}
          <div className="space-y-4">
            <AdminCard title="Documents · Nyaraka" sw={slots.map((s) => s.label).join(" · ")}>
              <KycDocViewer userId={id} slots={slots} />
            </AdminCard>

            <AdminCard title="Applicant · Mwombaji">
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-[12.5px]">
                <Field label="Full name" value={kyc.fullName ?? "—"} />
                {/* ⛔ WHICH DOCUMENT, THEN THE NUMBER. A masked tail alone stopped
                    being a complete statement the day four documents were accepted —
                    "•••• 5678" does not tell an officer what they are about to
                    approve, and the whole point of this screen is that they know. */}
                <Field label="Document type" value={idType ? ID_TYPE_LABEL[idType] : "—"} />
                <Field label="Number" value={<span className="font-mono">{kyc.idNumber ? `${kyc.idNumber.slice(0, 4)}…${kyc.idNumber.slice(-4)}` : "—"}</span>} />
                {/* Rendered only for the two documents that HAVE an expiry — a blank
                    "Expiry: —" on a voter's card reads as missing evidence rather
                    than as a document that does not carry one. */}
                {spec?.expires && (
                  <Field
                    label="Expiry"
                    value={
                      <span className={`font-mono ${expired ? "text-danger-fg" : ""}`}>
                        {kyc.idExpiry ? `${kyc.idExpiry}${expired ? " · EXPIRED" : ""}` : "—"}
                      </span>
                    }
                  />
                )}
                {/* Was the raw ISO string — "1995-04-12T00:00:00.000Z" — on a card whose other
                    dates are formatted (§6 E-2). ⚠️ THAT GUARANTEE NOW LIVES IN THE REGISTRY,
                    NOT HERE: `sensitive-fields.ts` formats on the way out, both for the masked
                    render and for a permitted reveal. It has to be there rather than at the call
                    site, because `revealSensitiveAction` returns the value straight to
                    `<SensitiveReveal>` and never passes back through this page — so formatting
                    here would have left the REVEALED value as a raw instant. */}
                {/* 🔴 AUDITOR holds `compliance: view`, so this page is theirs — and their
                    identity.personal cell is `masked`, a ceiling they were reading straight past.
                    Found by the drift ratchet (test:read-tiers §7), not by looking. */}
                <Field label="DOB" value={<span className="font-mono">{kyc.dob ? <Sensitive field="dob" subjectId={id} value={kyc.dob} /> : "—"}</span>} />
                <Field label="Region" value={user?.region ? <Sensitive field="region" subjectId={id} value={user.region} /> : "—"} />
                <Field label="Submitted" value={<span className="font-mono">{kyc.submittedAt ? formatDateTime(kyc.submittedAt) : "—"}</span>} />
                <Field label="Phone" value={<span className="font-mono">{user ? <Sensitive field="phone" subjectId={user.id} value={user.phoneE164} /> : "—"}</span>} />
              </dl>
            </AdminCard>

            {/* ⭐ MONEY AT STAKE (2026-09-13). From that date identity is asked before a withdrawal and at no
                earlier step, so this review decides whether money the platform already holds may leave. Every
                figure is READ — the rows the risk score scans, the wallet, the durable audit log — none inferred.
                ⛔ EVIDENCE, NOT AN ATTESTATION: nothing here is ticked, and a doubt about where the money came
                from goes to AML, not into this decision. ⛔ A failed read says so; it is never drawn as zero.
                ⛔ Shilling figures only for a viewer with money rights; counts and dates for every officer. */}
            <AdminCard title="Money at stake" sw="Pesa zilizo hatarini">
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-body-sm" data-kyc-money-at-stake="1">
                {/* ⭐ A FINAL REFUSAL IS ITS OWN ANSWER (2026-09-13). It read "Not passed · withdrawals wait on
                    approval", as though an approval were coming, or "Passed before" for a player approved once.
                    A final refusal froze the wallet (kyc-service.ts `freezeForFinalRefusal`) and the player cannot
                    resubmit; the balance is an officer's recorded decision, in "Refused · the balance" on this page. */}
                <Field
                  label="Withdrawal identity check"
                  value={
                    finalRefused ? (
                      <>
                        Finally refused · withdrawals closed ·{" "}
                        <a href="#refused-balance" className="text-brand-300 hover:underline">decide the balance</a>
                      </>
                    ) : !approvedEver(kyc)
                      ? "Not passed · withdrawals wait on approval"
                      : kyc.status === "APPROVED"
                        ? "Passed"
                        : "Passed before · approved once"
                  }
                />
                <Field
                  label="Balance held"
                  value={
                    wallet === undefined ? (
                      <span className="text-text-tertiary">not in your role</span>
                    ) : wallet === "failed" ? (
                      <span className="text-warning-fg">could not be read — not zero</span>
                    ) : (
                      <span className="font-mono tabular-nums">
                        {formatTzs(walletHeldTzs(wallet))}
                        {wallet === null && <span className="text-text-tertiary"> · no wallet</span>}
                        {wallet && wallet.status !== "ACTIVE" && (
                          <span className="block text-warning-fg">
                            {wallet.status === "FROZEN"
                              ? `Frozen · ${currentFreezeReasons(wallet).map((r) => FREEZE_REASON_LABEL[r]).join(", ")}`
                              : "Closed"}
                          </span>
                        )}
                      </span>
                    )
                  }
                />
                <Field
                  label="Deposited · confirmed"
                  value={
                    <span className="font-mono tabular-nums">
                      {canSeeMoney ? `${formatTzs(moneyFacts.depositedTzs)} · ` : ""}
                      {adminCount(moneyFacts.depositCount, "deposit")}
                    </span>
                  }
                />
                <Field
                  label="Withdrawn · confirmed"
                  value={
                    <span className="font-mono tabular-nums">
                      {canSeeMoney ? `${formatTzs(moneyFacts.withdrawnTzs)} · ` : ""}
                      {adminCount(moneyFacts.withdrawalCount, "withdrawal")}
                      {canSeeMoney && moneyFacts.inFlightTzs > 0 ? ` · ${formatTzs(moneyFacts.inFlightTzs)} in flight` : ""}
                    </span>
                  }
                />
                <Field
                  label="Bets placed"
                  value={
                    <span className="font-mono tabular-nums">
                      {adminCount(moneyFacts.betCount, "bet")}
                      {canSeeMoney ? ` · ${formatTzs(moneyFacts.stakedTzs)} staked` : ""}
                    </span>
                  }
                />
                <Field
                  label="Since first deposit"
                  value={
                    moneyFacts.firstDepositAt && daysSinceFirstDeposit !== null ? (
                      <span className="font-mono">
                        {daysSinceFirstDeposit === 0 ? "today" : adminCount(daysSinceFirstDeposit, "day")} · {formatDateTime(moneyFacts.firstDepositAt)}
                      </span>
                    ) : (
                      "never deposited"
                    )
                  }
                />
                <Field
                  label="Cash-outs refused"
                  value={
                    playerCashOuts === null ? (
                      <span className="text-warning-fg">could not be read</span>
                    ) : (
                      <span className="font-mono tabular-nums">
                        {playerCashOuts.length}{targetAudit?.truncated ? "+" : ""}
                        {playerCashOuts[0]
                          ? ` · last ${formatDateTime(playerCashOuts[0].at)}${canSeeMoney && playerCashOuts[0].amountTzs !== null ? ` for ${formatTzs(playerCashOuts[0].amountTzs)}` : ""}`
                          : ""}
                        {officerRetries > 0 && <span className="text-text-tertiary">{` · +${adminCount(officerRetries, "officer retry", "officer retries")}`}</span>}
                      </span>
                    )
                  }
                />
              </dl>
              {targetAudit?.truncated && (
                <p className="mt-2 text-body-sm text-warning-fg">
                  Cash-outs are counted from this account&apos;s newest {targetAudit.entries.length} of {targetAudit.total} audit entries.
                </p>
              )}
              <p className="mt-3 text-body-sm text-text-tertiary">
                Evidence for this decision, not a check. A doubt about where the money came from goes to AML.
              </p>
            </AdminCard>
          </div>

          {/* Decision rail (right) */}
          <div className="space-y-4 lg:sticky lg:top-4">
            <AdminCard>
              <div className="flex items-center justify-between gap-2">
                {/* 2026-09-14 — a short bilingual label that fits beside the SLA chip, and the chip never shrinks
                    (the longer label folded "KYC" onto its own line and the chip inside its pill). Low risk is the
                    app-state success ink, never the betting YES green. */}
                <div className="min-w-0">
                  <p className="font-mono text-micro uppercase eyebrow text-text-subtle">KYC risk · Hatari ya KYC</p>
                  <p className="font-mono text-[26px] font-bold leading-none tabular-nums" style={{ color: risk.band === "high" ? "var(--danger-fg)" : risk.band === "medium" ? "var(--warning-fg)" : "var(--success-fg)" }}>
                    {risk.score}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-mono text-micro uppercase eyebrow text-text-subtle">SLA</p>
                  <Chip size="sm" variant={slaTone as "brand" | "warning" | "danger" | "neutral"}>{slaLabel}</Chip>
                  {decided && kyc.reviewedAt && <p className="mt-1 font-mono text-body-sm tabular-nums text-text-muted">{formatDateTime(kyc.reviewedAt)}</p>}
                </div>
              </div>
              <div className="mt-3">
                <AdminMeter value={risk.score} cap={100} thresholdPct={KYC_MAKER_CHECKER_THRESHOLD} format={(n) => String(n)} />
              </div>
              {risk.factors.length > 0 ? (
                <ul className="mt-2.5 space-y-1">
                  {risk.factors.map((f) => (
                    <li key={f.label} className="flex items-baseline justify-between gap-2 text-body-sm">
                      <span className="text-text-muted">{f.label} <span className="text-text-subtle">· {f.detail}</span></span>
                      <span className="font-mono tabular-nums text-danger-fg">+{f.points}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2.5 text-body-sm text-text-tertiary">No elevated-risk signals on this account.</p>
              )}
            </AdminCard>

            <AdminCard title={decided ? "Decision" : "Officer decision"} sw={decided ? undefined : "Uamuzi wa afisa"}>
              {decided ? (
                <div className="flex items-start gap-2.5">
                  <I.shieldcheck s={18} className={kyc.status === "APPROVED" ? "text-success-fg mt-0.5 shrink-0" : "text-danger-fg mt-0.5 shrink-0"} />
                  <div>
                    <p className={`font-display text-[15px] font-bold ${kyc.status === "APPROVED" ? "text-success-fg" : "text-danger-fg"}`}>
                      {kyc.status === "APPROVED" ? "Identity approved" : isFinalRefusal(kyc.rejectReason) ? `Refused · FINAL · ${FINAL_CODE_LABEL[kyc.rejectReason]}` : "Submission rejected"}
                    </p>
                    {/* The separator only between two parts (2026-09-13) — with no reviewer it printed a lone " · " before the date. */}
                    <p className="mt-0.5 text-body-sm text-text-muted">
                      {[kyc.reviewerId ? `by ${kyc.reviewerId.slice(0, 14)}…` : "", kyc.reviewedAt ? formatDateTime(kyc.reviewedAt) : ""].filter(Boolean).join(" · ")}
                    </p>
                    {kyc.rejectNote && <p className="mt-1 text-body-sm text-text-muted italic">“{kyc.rejectNote}”</p>}
                  </div>
                </div>
              ) : (
                <KycDecisionRail
                  userId={id}
                  autoChecks={autoChecks}
                  makerCheckerRequired={makerCheckerRequired}
                  hasRecommendation={!!recommendation}
                  isRecommender={!!recommendation && recommendation.officerId === currentOfficerId}
                  recommenderName={recommendation?.officerName ?? null}
                />
              )}
            </AdminCard>

            {/* ⭐ S1 — A FINAL REFUSAL LEAVES A BALANCE TO DECIDE (owner ruling, 2026-09-13). The wallet was
                frozen by the refusal; this card is where an officer chooses one of the four recorded outcomes,
                reads what each would move in shillings before pressing anything, and sees every decision
                already taken on this case. ⛔ A failed read says so — it is never drawn as a zero balance. */}
            {finalRefused && (
              <AdminCard id="refused-balance" title="Refused · the balance" sw="Salio la aliyekataliwa">
                <div className="space-y-4">
                {!refused ? (
                  <p className="text-body-sm text-warning-fg">This player&apos;s balance position could not be read. It is NOT zero — reload before deciding.</p>
                ) : (
                  <div className="space-y-4" data-refused-case="1">
                    {refused.walletHolds.length > 0 && (
                      <p className="text-body-sm text-text-muted">
                        Wallet <strong className="text-text">{refused.walletStatus ? WALLET_STATUS_LABEL[refused.walletStatus] : "not found"}</strong> · held for: {refused.walletHolds.map((h) => (isWalletFreezeReason(h) ? FREEZE_REASON_LABEL[h] : h)).join(", ")}
                      </p>
                    )}
                    {/* ⛔ MONEY RIGHTS DECIDE WHAT THIS CARD SHOWS (audit session 95, 2026-09-14). It handed the balance, the
                        deposits and every outcome's shilling preview to any role the compliance route admits, and the
                        "why not" sentences quote amounts too. Without money rights the card says only whether a decision
                        is possible — and the action refuses such a role anyway. */}
                    {canSeeMoney ? (
                      <>
                        {refused.blockingHolds.length > 0 && (
                          <p className="text-body-sm text-warning-fg" data-refused-blocking-holds={refused.blockingHolds.length}>
                            Money outcomes are blocked while these holds stand: {refused.blockingHolds.map((h) => (isWalletFreezeReason(h) ? FREEZE_REASON_LABEL[h] : h)).join(", ")}. Lift each on its own control first.
                          </p>
                        )}
                        {/* Rendered only when KNOWN: until the store has a per-user open-position reader the service
                            returns null, and null is not "no open bets". */}
                        {refused.openPositions && refused.openPositions.count > 0 ? (
                          <p className="text-body-sm text-text-muted" data-refused-open-positions={refused.openPositions.count}>
                            Open bets still settle into this frozen wallet: <span className="font-mono tabular-nums text-text">{adminCount(refused.openPositions.count, "open bet")} · {formatTzs(refused.openPositions.stakedTzs)} staked</span>.
                          </p>
                        ) : null}
                        {refused.eligible ? (
                          <RefusedFundsPanel
                            userId={id}
                            balance={refused.balance}
                            hold={refused.hold}
                            confirmedDeposits={refused.confirmedDeposits}
                            paidOut={refused.paidOut}
                            defaultProvider={refused.lastDepositProvider}
                            outcomes={refused.outcomes}
                          />
                        ) : (
                          <p className="text-body-sm text-text-muted">{refused.whyNot}</p>
                        )}
                      </>
                    ) : (
                      <p className="text-body-sm text-text-muted" data-refused-read-only="1">
                        Balances are not part of your role&apos;s view, so the amounts and the decision form are not shown to you.{" "}
                        {refused.eligible ? "A balance decision can be taken on this case, by an officer whose role can see balances." : "No balance decision can be taken on this case right now."}
                      </p>
                    )}
                  </div>
                )}
                    <div>
                      <p className="font-mono text-micro uppercase eyebrow text-text-subtle mb-1.5">Decisions on this case</p>
                      {!priorDecisions ? (
                        <p className="text-body-sm text-warning-fg">The decision history could not be read. Do not assume there is none.</p>
                      ) : priorDecisions.rows.length === 0 ? (
                        <p className="text-body-sm text-text-tertiary">None yet.</p>
                      ) : (
                        <ul className="space-y-2" data-prior-decisions={priorDecisions.rows.length}>
                          {priorDecisions.rows.map((d, i) => (
                            <li key={d.decisionId ?? `${d.at}-${i}`} className="rounded-md border border-border-subtle px-2 py-2 text-body-sm">
                              <p className="text-text"><strong>{d.outcome ? REFUSED_FUNDS_OUTCOME_COPY[d.outcome].label : "Decision"}</strong> · <span className="font-mono">{formatDateTime(d.at)}</span></p>
                              {/* Money figures for a money viewer only (C2). The payout's status NOW rides beside the return, so a
                                  return that later failed does not read as sent. */}
                              {canSeeMoney && (
                                <p className="font-mono tabular-nums text-text-muted">return recorded {formatTzs(d.returnedTzs)} · forfeited {formatTzs(d.forfeitedTzs)}{d.payoutError ? " · the payout did not start" : d.payoutTxnStatusNow ? ` · payout ${txnStatusLabel(d.payoutTxnStatusNow as StoredTxn["status"]).toLowerCase()}` : ""}</p>
                              )}
                              {d.justification && <p className="mt-0.5 italic text-text-muted">“{d.justification}”</p>}
                            </li>
                          ))}
                        </ul>
                      )}
                      {priorDecisions?.truncated && <p className="mt-1 text-body-sm text-warning-fg">Older audit entries on this account are not shown here — the full list is in the refused-funds report.</p>}
                    </div>
                    {/* ⭐ OUTSIDE THE POSITION READ (audit session 95, C9): re-opening a wrong final refusal is the only door
                        back, and it vanished whenever the balance position failed to load. */}
                    <div className="flex items-center gap-2 flex-wrap border-t border-border-subtle pt-3">
                      <ReopenRefusalControl userId={id} />
                      <Link href={"/admin/kyc/refused" as Route} className="btn btn-ghost btn-sm inline-flex items-center gap-1.5">
                        All refused balances <I.chevronRight s={12} />
                      </Link>
                    </div>
                </div>
              </AdminCard>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="font-mono text-micro uppercase eyebrow text-text-subtle">{label}</dt>
      <dd className="text-text">{value}</dd>
    </div>
  );
}
