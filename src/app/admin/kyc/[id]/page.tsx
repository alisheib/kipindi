import { notFound } from "next/navigation";
import Link from "next/link";
import type { Route } from "next";
import { AdminPageGate } from "@/components/admin/admin-section-gate";
import { AdminPageHead, AdminCard } from "@/components/admin/admin-shell";
import { AdminMeter } from "@/components/admin/admin-charts";
import { Chip } from "@/components/ui/chip";
import { I } from "@/components/ui/glyphs";
import { db, type StoredWallet, type StoredTxn } from "@/lib/server/store";
import { txnStatusLabel, KycStageBadge } from "@/components/admin/status-badge";
import { listPendingKyc, readKycCaseChecks, kycRowVersion } from "@/lib/server/kyc-service";
import { kycCaseRead, kycMoneyFacts, toBlockedCashOut, getApprovalRecommendation, KYC_MAKER_CHECKER_THRESHOLD, type BlockedCashOut } from "@/lib/server/kyc-risk";
import { currentSession } from "@/lib/server/auth-service";
import { canView } from "@/lib/server/rbac";
import { houseAuditForConsole } from "@/lib/server/house-console-read";
import { formatDateTime } from "@/lib/utils";
import { KycDocViewer } from "./kyc-doc-viewer";
import { Sensitive } from "@/components/ui/sensitive";
import { maskDob } from "@/lib/server/sensitive-fields";
import { KycDecisionRail, type RailCheck, type RailStage } from "./kyc-decision-rail";
import { KycDobCorrection } from "./kyc-dob-correction";
import { RefusedFundsPanel } from "./refused-funds-panel";
import { ReopenRefusalControl } from "./reopen-refusal-control";
import { isFinalRefusal, type FinalRefusalCode } from "@/lib/kyc-refusal";
import { approvedEver, uncheckedAutomaticApproval } from "@/lib/kyc-approval";
import { photoIdentityVerified } from "@/lib/server/agent-identity";
import { walletHeldTzs, isFileWithUs } from "@/lib/kyc-stage";
import { KYC_REVIEW_SLA_HOURS } from "@/lib/kyc-sla";
import { ROUTE_REASON_LABEL, FLAG_LABEL, asKycFlags, asKycRouteReasons, type KycCheckKey, type KycCheckRow, type KycRouteReason } from "@/lib/kyc-auto-checks";
import type { KycAttestationMode } from "@/lib/kyc-attestations";
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
  LEGACY_KYC_DOC_SLOTS,
  isIdDocType,
  isExpired,
  nidaDateOfBirth,
  photoSetComplete,
  type IdDocType,
} from "@/lib/id-documents";

/** Every image slot ever written — the frozen list the image route accepts (`LEGACY_KYC_DOC_SLOTS`). */
type ViewerSlot = (typeof LEGACY_KYC_DOC_SLOTS)[number];

/** The day players stopped uploading (owner ruling, 2026-10-10). An image older than this is a legacy one. */
const TYPED_ONLY_FROM = "2026-10-10";

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
const ADMIN_SLOT_LABEL: Record<ViewerSlot, string> = {
  // The enum-only slot from before the NIDA front/back split — still readable, never asked for.
  NIDA: "NIDA (single image)",
  NIDA_FRONT: "NIDA front",
  NIDA_BACK: "NIDA back",
  PASSPORT: "Passport bio page",
  DRIVER_LICENSE: "Licence front",
  VOTER_CARD: "Voter's card",
  SELFIE: "Selfie",
};

/**
 * ⭐ THE CHECKLIST'S NAMES (2026-10-10). Each row is one `decideKyc` row (`kyc-auto-checks.ts`) — the SAME decision
 * the instant path took — so the officer reads the machine's reasoning, not a second copy of it. Officer English.
 */
const CHECK_LABEL: Record<KycCheckKey, string> = {
  number_format: "Identity number",
  age: "18 or older",
  nida_dob: "NIDA date of birth",
  expiry: "Document in date",
  same_person: "Other accounts",
  risk: "Risk score",
  holds: "Wallet holds",
  sof: "Source of funds",
  aml: "AML escalation",
  provenance: "Officer history",
  track: "Case type",
};

function ageLabel(iso: string | null): string {
  if (!iso) return "—";
  const ms = Date.now() - Date.parse(iso);
  const h = Math.floor(ms / 3_600_000);
  if (h < 1) return `${Math.max(0, Math.floor(ms / 60_000))}m`;
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

type KycWorkstationProps = { params: Promise<{ id: string }> };

/**
 * W25 belt 2 — the stored-row gate, in the PAGE: a flight request naming this section's layout skips the layout.
 * ⛔ `title` is explicit (C7-SPEC ruling 301): the last segment is a record id, and without it the restricted
 * panel's heading would BE that id, in a body streamed to whoever asked.
 */
export default async function KycWorkstationPage(props: KycWorkstationProps) {
  return <AdminPageGate title="KYC"><KycWorkstationContent {...props} /></AdminPageGate>;
}

async function KycWorkstationContent({ params }: KycWorkstationProps) {
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
  // ⭐ THE VERSION EVERY FORM ON THIS PAGE POSTS (2026-10-10) — the row as rendered. The service refuses a decision on a
  // row that changed since, and a maker's recommendation only ever seals the version it was made on.
  const version = kycRowVersion(kyc);
  // ⭐ ONE TRANSACTION SCAN (2026-09-13). The risk score and the "Money at stake" card read the same rows:
  // `kycCaseRead` returns them beside the score, so the card costs no second `listForUser` (kyc-risk.ts header).
  const { risk, txns } = await kycCaseRead(id);
  const moneyFacts = kycMoneyFacts(txns);
  const makerCheckerRequired = risk.score >= KYC_MAKER_CHECKER_THRESHOLD;
  // ⭐ BOUND TO THIS VERSION (2026-10-10): a recommendation made before the case last changed is not found, so the rail
  // asks for a new one rather than offering a seal on details the maker never saw. (Source of funds is a checklist row
  // now — `decideKyc`'s `sof` — read with the other facts.)
  const recommendation = await getApprovalRecommendation(id, version);
  // The wallet, for a money viewer only. `undefined` = never asked; "failed" = the read failed, which is NOT
  // a zero balance; `null` = no wallet, which genuinely holds nothing. The async wrapper also catches a
  // SYNC throw from the in-memory store.
  const wallet: StoredWallet | null | "failed" | undefined = canSeeMoney
    ? await (async () => db.wallet.findByUserId(id))().catch(() => "failed" as const)
    : undefined;

  // ⭐ ONE AUDIT READ, TWO READERS (2026-09-13): the balance-decision history on a refused case and the
  // cash-outs we refused this player both come from this account's DURABLE audit rows (never the ring, which
  // empties on every deploy). ⛔ `null` = the read failed, and each reader says so rather than showing none.
  const targetAudit = await houseAuditForConsole(session?.userId ?? null, "/admin/kyc", getAuditForTargetDurable("User", id, { limit: 500 }).catch(() => null));
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

  // ── THE CASE'S MODE (2026-10-10) ────────────────────────────────────────────
  // ⭐ PHOTO when the document's full photo set and a selfie are on file (an agent applicant's case, or a player's from
  // before 2026-10-10); TYPED otherwise. The mode decides which images are shown, which attestations the officer makes
  // and whether an approval stamps `photoVerifiedAt` — and it is the SAME test the service applies (`photoSetComplete`),
  // so the page and the decision cannot disagree about which kind of case this is.
  const present = new Set(kyc.documents.map((d) => d.docType));
  const mode: KycAttestationMode = photoSetComplete(kyc.idType, Array.from(present)) ? "photo" : "typed";
  const required = spec?.requiredSlots ?? [];

  // ── THE AUTOMATIC CHECKS ───────────────────────────────────────────────────
  // ⭐ ONE DECISION, READ AGAIN FOR THE OFFICER (`readKycCaseChecks`): the same facts and the same pure `decideKyc` the
  // instant path ran, so this checklist is the machine's own reasoning, not a second copy of it. ⛔ A failed fact read is
  // SAID — the rail arms nothing on facts nobody can see — never drawn as a row of passes.
  let caseChecks: Awaited<ReturnType<typeof readKycCaseChecks>> = null;
  let checksFailed = false;
  try {
    caseChecks = await readKycCaseChecks(id);
  } catch {
    checksFailed = true;
  }

  // 🔴 NIDA ONLY, AND SAID SO. Digits 1-8 of a NIDA are the holder's date of birth; no other document carries one.
  // Where they disagree with the account's date this is a FLAG (or, under 18, a route to an officer) — never a refusal:
  // a sign-up date can be a typo, and refusing would lock a real citizen out over it.
  const nidaDob = idType === "NIDA" && kyc.idNumber ? nidaDateOfBirth(kyc.idNumber) : null;
  const expired = isExpired(kyc.idExpiry ?? null, new Date());

  // What the format check ACTUALLY established for THIS document, and what it deliberately did not.
  // POLICY (Ali, 2026-07-19, extended 2026-08-19): the control is FORMAT + UNIQUENESS only — one document, one
  // account. There is deliberately no authority check for any of the four; `nida.ts` is a deterministic mock and no
  // request has ever reached the National Identification Authority, and no equivalent endpoint exists for a passport,
  // a licence or a voter's card. So the number row must never read "verified / government match": it states exactly
  // what was checked and — where no format is published — says so in the officer's own words.
  const formatNote = !spec
    ? "no document type recorded"
    : spec.format.kind === "published" || spec.format.kind === "secondary"
      ? spec.format.sourceNote
      : spec.format.absenceNote;

  // ⛔ THE CHECKLIST MASKS ITS DATES UNCONDITIONALLY, AND THAT IS DELIBERATE.
  // `RailCheck.detail` is a plain STRING on a CLIENT component (kyc-decision-rail.tsx), so
  // <Sensitive> cannot go here — it is a server component. Masking at the source is the honest
  // alternative: the checklist's job is the VERDICT ("18 or older: pass"), which the masked year
  // still supports, and the revealable copy lives in the DOB Field above for a role permitted to
  // reveal it. ⚠️ `maskDob` is the registry's own mask, imported as a pure function — §6 keeps the
  // ANSWER (canRead/mayReveal) out of pages, not the masking itself.
  const detailOf = (r: KycCheckRow): string => {
    if (r.key === "number_format") return `${r.detail} · unique to this account (no authority check by design) · ${formatNote}`;
    // ⭐ The ACCOUNT's date of birth is the one the age gate uses (2026-10-10); the identity record carries a copy of it.
    if (r.key === "age") return kyc.dob ? `${r.detail} · DOB ${maskDob(kyc.dob)}` : r.detail;
    if (r.key === "nida_dob" && nidaDob && r.outcome !== "pass") return `${r.detail} · the number says ${maskDob(nidaDob)}`;
    return r.detail;
  };
  const railChecks: RailCheck[] = caseChecks
    ? caseChecks.decision.rows.map((r) => ({
        key: r.key,
        label: r.key === "number_format" && idType ? `${ID_TYPE_LABEL[idType]} number` : CHECK_LABEL[r.key],
        outcome: r.outcome,
        detail: detailOf(r),
      }))
    : checksFailed
      ? []
      : [{ key: "number_format", label: "Identity number", outcome: "pending", detail: "no identity details recorded yet" }];
  // A photo case keeps "All documents present" — by construction it is (that is what makes it a photo case), and the
  // officer reads the count beside the images they are about to attest to.
  if (mode === "photo") {
    railChecks.push({ key: "documents", label: "All documents present", outcome: "pass", detail: `${required.length}/${required.length} on file · the document's photos and a selfie` });
  }

  // ── WHY THIS CASE IS WITH AN OFFICER ────────────────────────────────────────
  // ⭐ The reasons recorded WHEN it was routed (`kyc.routed`, durable audit) — the newest one at or after this send.
  // Without one (an agent's photo send, or a case sent before 2026-10-10) the page says what the checks read NOW.
  const routedEntry = targetAudit
    ? targetAudit.entries.find((e) => e.action === "kyc.routed" && (!kyc.submittedAt || e.createdAt >= kyc.submittedAt.slice(0, 19)))
    : undefined;
  const routedAtSend: KycRouteReason[] = routedEntry ? asKycRouteReasons((routedEntry.payload as Record<string, unknown> | null)?.reasons) : [];
  const routedNow: KycRouteReason[] = caseChecks ? caseChecks.decision.routes : [];
  const flags = asKycFlags(kyc.autoFlags);
  const autoUnchecked = kyc.status === "APPROVED" && !!kyc.autoApprovedAt && !kyc.postCheckedAt;
  // ⭐ A REJECT OF AN AUTOMATIC APPROVAL NO OFFICER HAS CHECKED HOLDS THE WALLET (2026-10-10) — WHATEVER STATUS IT IS IN
  // NOW (review R5.1): approved, asked for corrections, or back with an officer (an agent photo send, a corrected send
  // routed on provenance, a corrected date of birth — each keeps `autoApprovedAt` and `approvedAt`). That `approvedAt`
  // was stamped by the machine and keeps withdrawal open for good, so the rail's freeze is ticked and locked, and the
  // service refuses such a reject without it. ⛔ THE SERVICE'S OWN PREDICATE (`kyc-approval.ts`), no status test here.
  const freezeOnReject = uncheckedAutomaticApproval(kyc);
  // The rail's stage: a case with us is decided; an automatic approval is post-checked; any other approval can still be
  // asked for corrections or rejected (from 2026-10-10 a rejection may follow an approval). ⭐ CORRECTIONS ASKED is the
  // player's move, but not a dead end for the officer (2026-10-10): `with_player` offers reject (recoverable or final)
  // and Escalate AML — never Approve or Mark checked. ⛔ Until then it drew no rail, so a holder found to be under 18,
  // sanctioned or a duplicate could not be refused for as long as they chose not to answer. ⛔ No rail while nothing
  // has been sent.
  const railStage: RailStage | null =
    kyc.status === "PENDING_REVIEW" ? "review"
    : kyc.status === "APPROVED" ? (autoUnchecked ? "post_check" : "approved")
    : kyc.status === "ADDITIONAL_INFO_REQUIRED" ? "with_player"
    : null;
  const samePerson = caseChecks?.samePerson ?? [];

  // ⭐ A DECIDED CASE HAS NO CLOCK (2026-09-13). The countdown ran from `submittedAt` whatever the status, so an
  // approved or refused case kept reading "3h left" — or "40h overdue" — as though it still waited on an officer.
  const slaMs = !decided && kyc.submittedAt ? Date.parse(kyc.submittedAt) + KYC_REVIEW_SLA_HOURS * 3600_000 - Date.now() : null;
  const slaLabel = decided ? "Decided" : slaMs === null ? "—" : slaMs <= 0 ? `${Math.floor(-slaMs / 3600_000)}h overdue` : `${Math.floor(slaMs / 3600_000)}h ${Math.floor((slaMs % 3600_000) / 60_000)}m left`;
  const slaTone = slaMs === null ? "neutral" : slaMs <= 0 ? "danger" : slaMs < 2 * 3600_000 ? "warning" : "brand";

  // ⛔ THE VIEWER'S TABS ARE THIS DOCUMENT'S SLOTS on a photo case. Three hard-written tabs meant
  // a passport submission offered "ID front / ID back / Selfie", two of which can
  // never hold anything — and the bio page, the only image that matters, had no
  // tab at all. An officer approving a document they cannot open is the human
  // control failing silently.
  // ⭐ ON A TYPED CASE (2026-10-10) there is no image to review, so no image card — except the images already ON FILE
  // (a player's from before 2026-10-10, or an agent's unfinished set), shown read-only under their own heading, one tab
  // per image actually held, from the frozen legacy list so nothing on file becomes unreachable.
  const slotOf = (s: ViewerSlot) => ({ type: s, label: ADMIN_SLOT_LABEL[s], uploadedAt: kyc.documents.find((d) => d.docType === s)?.uploadedAt ?? null });
  const photoSlots = mode === "photo" ? required.map(slotOf) : [];
  const onFileSlots = mode === "typed" ? LEGACY_KYC_DOC_SLOTS.filter((s) => present.has(s)).map(slotOf) : [];
  const onFileLegacy = onFileSlots.every((s) => !s.uploadedAt || s.uploadedAt.slice(0, 10) < TYPED_ONLY_FROM);
  // Officer-requested extra images (a request type retired on 2026-10-10) — read-only, through `?req=`.
  const legacyExtras = (kyc.extraRequests ?? []).filter((rq: { storageKey: string | null }) => !!rq.storageKey) as Array<{ id: string; description: string; storageKey: string | null; uploadedAt: string | null }>;

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
            {/* A file we asked corrections of is the PLAYER's move, so it holds no place in the queue above (2026-09-14). The
                header says whose move it is, in /admin/kyc's own word, rather than going quiet. */}
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
          {/* Document viewer (left) — a PHOTO case only; a typed case shows images only if some are already on file. */}
          <div className="space-y-4">
            {mode === "photo" && (
              <AdminCard title="Documents · Nyaraka" sw={photoSlots.map((s) => s.label).join(" · ")}>
                <KycDocViewer userId={id} slots={photoSlots} />
              </AdminCard>
            )}
            {onFileSlots.length > 0 && (
              <AdminCard
                title={onFileLegacy ? `On file · before ${TYPED_ONLY_FROM} · read-only` : "On file · photo set not complete · read-only"}
                sw={onFileSlots.map((s) => s.label).join(" · ")}
              >
                <p className="mb-2.5 text-body-sm text-text-muted max-w-[72ch]">
                  {onFileLegacy
                    ? "This identity is decided on its typed details. These images were uploaded before players stopped sending photos; they are kept on file and shown for reference only."
                    : "Some photos are on file, but not the document's full set and a selfie, so this is decided as a typed case. The images are shown for reference only."}
                </p>
                <KycDocViewer userId={id} slots={onFileSlots} />
              </AdminCard>
            )}
            {legacyExtras.length > 0 && (
              <AdminCard title={`Requested documents · before ${TYPED_ONLY_FROM} · read-only`} sw="Nyaraka za ziada">
                {/* ⛔ Officers can no longer ask for extra documents (2026-10-10). Those already uploaded stay readable,
                    through the same audited image route, matched against this player's own row (`?req=`). */}
                <div className="space-y-2.5">
                  {legacyExtras.map((rq) => {
                    const src = `/api/admin/kyc-doc?user=${encodeURIComponent(id)}&req=${encodeURIComponent(rq.id)}`;
                    return (
                      <div key={rq.id} className="flex items-start gap-3 rounded-md border border-border bg-bg-inset/40 p-2.5">
                        <div className="min-w-0 flex-1">
                          <p className="text-body-sm text-text leading-snug">{rq.description}</p>
                          <p className="mt-0.5 font-mono text-micro text-text-tertiary">{rq.uploadedAt ? `Uploaded · ${formatDateTime(rq.uploadedAt)}` : "Uploaded"}</p>
                        </div>
                        <a href={src} target="_blank" rel="noopener noreferrer" className="block shrink-0 overflow-hidden rounded-md border border-border hover:border-brand-500 transition-colors" title="Open full size">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={src} alt="requested document" loading="lazy" className="h-16 w-16 object-cover" />
                        </a>
                      </div>
                    );
                  })}
                </div>
              </AdminCard>
            )}

            <AdminCard title="Applicant · Mwombaji">
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-[12.5px]">
                <Field label="Full name" value={kyc.fullName ?? "—"} />
                {/* ⭐ WHAT KIND OF CASE (2026-10-10) — it decides the images, the attestations and the agent gate. */}
                <Field label="Case" value={mode === "photo" ? "Photo case · document photos and selfie" : "Typed details"} />
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
                {/* ⭐ An automatic approval was never SENT (no `submittedAt`): its details were submitted and verified in the
                    same instant, `autoApprovedAt` — "—" only when neither exists (2026-10-10). */}
                <Field label="Submitted" value={<span className="font-mono">{kyc.submittedAt ? formatDateTime(kyc.submittedAt) : kyc.autoApprovedAt ? formatDateTime(kyc.autoApprovedAt) : "—"}</span>} />
                <Field label="Phone" value={<span className="font-mono">{user ? <Sensitive field="phone" subjectId={user.id} value={user.phoneE164} /> : "—"}</span>} />
              </dl>
            </AdminCard>

            {/* ⭐ POSSIBLE SAME PERSON (2026-10-10) — other accounts whose identity carries the same normalised name and
                date of birth. ⛔ EACH IS NAMED BY A LINK TO ITS OWN CASE, NEVER BY ITS NAME: this page is about one
                person, and printing another account's name here would hand it to every viewer of this case. */}
            {samePerson.length > 0 && (
              <AdminCard title="Possible same person" sw="Huenda ni mtu yule yule">
                <p className="mb-2 text-body-sm text-text-muted max-w-[72ch]">
                  {samePerson.length === 1 ? "Another account has" : `${samePerson.length} other accounts have`} the same name and date of birth on their identity. Open each case to compare; a match is a reason to look, not a finding.
                </p>
                <ul className="space-y-1.5" data-kyc-same-person={samePerson.length}>
                  {samePerson.map((m) => (
                    <li key={m.userId} className="flex flex-wrap items-center gap-2 text-body-sm">
                      <Link href={`/admin/kyc/${m.userId}` as Route} className="font-mono text-royal-300 hover:underline">{m.userId.slice(0, 14)}…</Link>
                      {m.restricted ? (
                        <Chip size="sm" variant="danger" style={{ whiteSpace: "nowrap" }}>Restricted account</Chip>
                      ) : (
                        <Chip size="sm" variant="neutral" style={{ whiteSpace: "nowrap" }}>Open account</Chip>
                      )}
                    </li>
                  ))}
                </ul>
              </AdminCard>
            )}

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
                        ? autoUnchecked
                          ? "Passed · automatically, not yet checked by an officer"
                          : "Passed"
                        // ⭐ R5.1 — an approval only the machine made says so in every status, not only while APPROVED.
                        : uncheckedAutomaticApproval(kyc)
                          ? "Passed before · automatically, never checked by an officer"
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
                      {canSeeMoney ? <><span className="whitespace-nowrap">{formatTzs(moneyFacts.depositedTzs)}</span>{" · "}</> : ""}
                      {adminCount(moneyFacts.depositCount, "deposit")}
                    </span>
                  }
                />
                <Field
                  label="Withdrawn · confirmed"
                  value={
                    <span className="font-mono tabular-nums">
                      {canSeeMoney ? <><span className="whitespace-nowrap">{formatTzs(moneyFacts.withdrawnTzs)}</span>{" · "}</> : ""}
                      {adminCount(moneyFacts.withdrawalCount, "withdrawal")}
                      {canSeeMoney && moneyFacts.inFlightTzs > 0 ? <>{" · "}<span className="whitespace-nowrap">{formatTzs(moneyFacts.inFlightTzs)}</span> in flight</> : ""}
                    </span>
                  }
                />
                <Field
                  label="Bets placed"
                  value={
                    <span className="font-mono tabular-nums">
                      {adminCount(moneyFacts.betCount, "bet")}
                      {canSeeMoney ? <>{" · "}<span className="whitespace-nowrap">{formatTzs(moneyFacts.stakedTzs)}</span> staked</> : ""}
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
              {decided && (
                <div className="flex items-start gap-2.5">
                  <I.shieldcheck s={18} className={kyc.status === "APPROVED" ? "text-success-fg mt-0.5 shrink-0" : "text-danger-fg mt-0.5 shrink-0"} />
                  <div>
                    <p className={`font-display text-[15px] font-bold ${kyc.status === "APPROVED" ? "text-success-fg" : "text-danger-fg"}`}>
                      {kyc.status === "APPROVED" ? "Identity approved" : isFinalRefusal(kyc.rejectReason) ? `Refused · FINAL · ${FINAL_CODE_LABEL[kyc.rejectReason]}` : "Submission rejected"}
                    </p>
                    {/* ⭐ WHO APPROVED IT (2026-10-10). An automatic approval has no reviewer — it is never attributed to an
                        officer — so it says it was automatic, and whether an officer has checked it since. */}
                    {kyc.status === "APPROVED" && kyc.autoApprovedAt ? (
                      <p className="mt-0.5 text-body-sm text-text-muted" data-kyc-approval="automatic">
                        {[
                          `Automatically · ${formatDateTime(kyc.autoApprovedAt)}`,
                          kyc.postCheckedAt
                            ? `checked${kyc.postCheckedById ? ` by ${kyc.postCheckedById.slice(0, 14)}…` : ""} · ${formatDateTime(kyc.postCheckedAt)}`
                            : "not yet checked by an officer",
                        ].join(" · ")}
                      </p>
                    ) : (
                      /* The separator only between two parts (2026-09-13) — with no reviewer it printed a lone " · " before the date. */
                      <p className="mt-0.5 text-body-sm text-text-muted">
                        {[kyc.reviewerId ? `by ${kyc.reviewerId.slice(0, 14)}…` : "", kyc.reviewedAt ? formatDateTime(kyc.reviewedAt) : ""].filter(Boolean).join(" · ")}
                      </p>
                    )}
                    {/* ⭐ THE AGENT GATE'S OWN PREDICATE (`photoIdentityVerified`, review R5.2): the stamp counts only over the
                        full photo set uploaded no later than it — a bare stamp is never printed as an officer's photo check. */}
                    {photoIdentityVerified(kyc) && kyc.photoVerifiedAt ? (
                      <p className="mt-0.5 text-body-sm text-text-muted">Photos and selfie verified by an officer · {formatDateTime(kyc.photoVerifiedAt)}</p>
                    ) : kyc.status === "APPROVED" && kyc.photoVerifiedAt ? (
                      <p className="mt-0.5 text-body-sm text-warning-fg" data-kyc-photo-stamp="unbacked">A photo approval is on file, but not over the photos on file now (missing, or added after it) — it does not count for the agent programme.</p>
                    ) : null}
                    {kyc.status === "APPROVED" && flags.length > 0 && (
                      <ul className="mt-1.5 space-y-0.5" data-kyc-flags={flags.length}>
                        {flags.map((f) => (
                          <li key={f} className="flex items-start gap-1.5 text-body-sm text-warning-fg">
                            <I.alertCircle s={13} className="mt-0.5 shrink-0" /> {FLAG_LABEL[f]}
                          </li>
                        ))}
                      </ul>
                    )}
                    {kyc.status === "REJECTED" && kyc.rejectNote && <p className="mt-1 text-body-sm text-text-muted italic">“{kyc.rejectNote}”</p>}
                  </div>
                </div>
              )}

              {/* ⭐ WHY IT IS WITH AN OFFICER (2026-10-10) — the reasons recorded when the case was routed, or, without that
                  record (an agent's photo send, a case sent before that date), what the checks read now. */}
              {kyc.status === "PENDING_REVIEW" && (
                <div className="mb-4 rounded-md border border-border bg-bg-inset/40 px-3 py-2.5" data-kyc-routed={routedAtSend.length > 0 ? "recorded" : "now"}>
                  <p className="font-mono text-micro uppercase eyebrow text-text-subtle">
                    {routedAtSend.length > 0 ? "Sent to an officer because" : mode === "photo" ? "Photo case" : "With an officer · as the checks read now"}
                  </p>
                  {(routedAtSend.length > 0 ? routedAtSend : routedNow).length > 0 ? (
                    <ul className="mt-1 space-y-0.5">
                      {(routedAtSend.length > 0 ? routedAtSend : routedNow).map((r) => (
                        <li key={r} className="text-body-sm text-text">{ROUTE_REASON_LABEL[r]}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-1 text-body-sm text-text-muted">
                      {checksFailed ? "The checks could not be read." : "No routing reason is recorded for this send — it reached the queue before automatic checks, or from the agent photo track."}
                    </p>
                  )}
                  {!targetAudit && <p className="mt-1 text-body-sm text-warning-fg">The routing record could not be read.</p>}
                </div>
              )}

              {/* ⭐ CORRECTIONS ASKED — THE PLAYER'S MOVE. Nothing approves it: the player corrects and sends, and the case
                  comes back to an officer. ⭐ But the rail below still refuses or escalates it (2026-10-10) — see `railStage`. */}
              {kyc.status === "ADDITIONAL_INFO_REQUIRED" && (
                <div className="space-y-1" data-kyc-with-player="1">
                  <p className="font-display text-[15px] font-bold text-warning-fg">Corrections asked · with the player</p>
                  <p className="text-body-sm text-text-muted">
                    {[kyc.reviewerId ? `by ${kyc.reviewerId.slice(0, 14)}…` : "", kyc.reviewedAt ? formatDateTime(kyc.reviewedAt) : ""].filter(Boolean).join(" · ")}
                  </p>
                  {kyc.rejectNote && <p className="text-body-sm text-text-muted italic">“{kyc.rejectNote}”</p>}
                  <p className="text-body-sm text-text-tertiary">Nothing is approved until the player sends their corrected details. You can still reject or refuse this identity, or escalate it to AML.</p>
                </div>
              )}
              {(kyc.status === "IN_PROGRESS" || kyc.status === "NOT_STARTED") && (
                <p className="text-body-sm text-text-muted" data-kyc-with-player="1">
                  Nothing to decide yet: the player has not sent their details{mode === "typed" && present.size > 0 ? " (some photos are on file from the agent photo track or before 2026-10-10)" : ""}.
                </p>
              )}

              {railStage && (
                <div className={decided || railStage === "with_player" ? "mt-4 border-t border-border-subtle pt-4" : ""}>
                  {railStage === "post_check" && (
                    <p className="mb-3 text-body-sm text-text-muted">
                      Approved automatically from typed details. Check the details, the number&apos;s flags and other accounts, then mark it checked — or ask for corrections, or reject.
                    </p>
                  )}
                  <KycDecisionRail
                    userId={id}
                    version={version}
                    stage={railStage}
                    mode={mode}
                    approvedOnce={approvedEver(kyc)}
                    freezeRequired={freezeOnReject}
                    checks={railStage === "approved" || railStage === "with_player" ? [] : railChecks}
                    checksReadable={!checksFailed}
                    makerCheckerRequired={makerCheckerRequired}
                    hasRecommendation={!!recommendation}
                    isRecommender={!!recommendation && recommendation.officerId === currentOfficerId}
                    recommenderName={recommendation?.officerName ?? null}
                  />
                </div>
              )}
            </AdminCard>

            {/* ⭐ THE ACCOUNT'S DATE OF BIRTH (2026-10-10) — the age gate's input, now typed once at sign-up and never asked
                again. An officer corrects it here on evidence; a final refusal must be re-opened first. */}
            {!finalRefused && (
              <AdminCard title="Date of birth" sw="Tarehe ya kuzaliwa">
                <p className="mb-2.5 text-body-sm text-text-muted">
                  The identity check uses the date of birth on the account. If it was mistyped at sign-up, correct it here — the age check runs again and the identity goes to an officer.
                </p>
                <KycDobCorrection userId={id} version={version} />
              </AdminCard>
            )}

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
