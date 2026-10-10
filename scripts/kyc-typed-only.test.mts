/**
 * PLAYERS VERIFY WITH TYPED DETAILS, AT ONCE; AGENTS KEEP PHOTOS AND AN OFFICER.   `npm run test:kyc-typed-only`
 *
 * ⭐ THE RULING THIS GUARDS (owner ruling, Ali, 2026-10-10, relaying the Gaming Board's request that players no longer
 * upload identity documents — docs/COMPLIANCE-DECISIONS.md, "2026-10-10 · Players verify identity with typed details").
 * A player types the document's details and is approved AT ONCE when the automatic checks pass (`verifyIdentity`,
 * `kyc-auto-checks.ts`); narrow cases go to an officer instead; officers check automatic approvals afterwards and may
 * only ask for CORRECTIONS. Agent applicants keep the photo track and an officer's photo approval (`photoVerifiedAt`),
 * which an automatic approval never satisfies.
 *
 * ⛔ EVERY ASSERTION HERE IS PAIRED. A refusal is green on a deleted feature and on a service that refuses everything,
 * so each "is refused" stands beside the control that the same door opens for the right case, and every routing
 * reason is shown to ROUTE (not refuse, not approve) on a fixture where nothing else routes. `red:kyc-typed-only`
 * (cases in `scripts/anchors/kyc-typed-only.anchors.mjs`) puts each defect back and requires a FAIL line that names it.
 *
 * ⛔ IN-MEMORY, ON PURPOSE. `DATABASE_URL` is removed before the first product import, so every fixture goes through the
 * real services on the in-memory store and this suite can run in the predeploy chain beside `test:kyc-step-guards`.
 * ⛔ It does NOT import `lib/verified-fixtures.mts`: what an unverified, an automatically verified and an
 * officer-verified account may each do is the thing measured, so it builds every row itself and names every field.
 *
 * SECTIONS
 *   §1  G1 · the typed track draws no uploader, file input or attach action; attachExtraDocument is gone
 *   §2  G2 · all four document types are approved at once with zero documents (no officer, no photo stamp)
 *   §3  G3 · every routing reason ROUTES; the automatic path never lifts a hold; an officer's refusal goes back to one
 *   §4  G4 · an approved-once correction may change the name, never the number (identity_number_locked)
 *   §5  G5 · the date of birth is the ACCOUNT's (a posted one is ignored; a Prisma timestamp is normalised)
 *   §6  G6 · attestation sets by mode — a photo statement is never accepted on a typed case
 *   §7  G7 · the legacy image route accepts exactly the frozen LEGACY_KYC_DOC_SLOTS
 *   §8  G8 · expiry and the one-document-one-account refusal still bite
 *   §9  G9 · the agent gates refuse an automatic approval and accept an officer's photo approval
 *   §10 G10 · the officer's forms are bound to the version they showed (exactly for an approval, by identity for a refusal)
 *   §11 the hold-lift rule, in the source
 *   §12 the review's fixes (2026-10-10): durable officer provenance (R1.3), an AML escalation under a busy trail (R1.4),
 *       the freeze a refusal of an unchecked automatic approval requires (R1.2) and refusals from corrections (R1.1), the
 *       agent approval's own checks (R1.5), the DSAR projection (R2.4), prior identities on erasure (R2.3), the re-open
 *       notice (R4.4), an approval that survives a failing account write (R2.10), and the attach rate limit (R5.5)
 *   §13 the second review's fixes (2026-10-10, R5): the freeze a refusal of an unchecked automatic approval requires in
 *       EVERY status (R5.1a) and the post-check list that keeps it (R5.1c); a re-open that keeps the hold (R5.1b); a photo
 *       stamp tied to its photos (R5.2); a post-check only from the officer's statements (R5.3); an admitted under-18
 *       date routes (R5.8); the date-of-birth correction's own notice (R5.10)
 */
import { readFileSync } from "node:fs";
import { decomment } from "./lib/decomment.mts";
import type { StoredKyc, StoredTxn, StoredWallet } from "../src/lib/server/store.ts";

// ⛔ BEFORE ANY PRODUCT MODULE LOADS: the store picks its back-end at import time.
delete process.env.DATABASE_URL;
process.env.USE_PRISMA_DAL = "false";

const { db } = await import("../src/lib/server/store.ts");
const SVC = await import("../src/lib/server/kyc-service.ts");
const { verifyIdentity, startKyc, attachDocument, submitForReview, reviewKyc, askForCorrections, markPostChecked, kycRowVersion, readKycCaseChecks, reopenFinalRefusal, submitIdentityStep } = SVC;
const { addWalletFreeze, freezeWalletByOfficer } = await import("../src/lib/server/wallet-freeze.ts");
const { audit, auditFlush, getAuditForTarget } = await import("../src/lib/server/audit.ts");
const { parseAttestations, attestationKeys, ATTESTATION_SET_ID } = await import("../src/lib/kyc-attestations.ts");
const { LEGACY_KYC_DOC_SLOTS, ALL_DOC_SLOTS } = await import("../src/lib/id-documents.ts");
const { photoIdentityVerified, photoCaseSent } = await import("../src/lib/server/agent-identity.ts");
const { applicantEligibility } = await import("../src/lib/server/agent-application-service.ts");
const { getApprovalRecommendation, kycRiskScore, KYC_MAKER_CHECKER_THRESHOLD } = await import("../src/lib/server/kyc-risk.ts");
const { approvedEver, uncheckedAutomaticApproval } = await import("../src/lib/kyc-approval.ts");
const AGENT = await import("../src/lib/server/agent-application-service.ts");
const { AGENT_TERMS_VERSION } = await import("../src/lib/agent-terms-version.ts");
const { emailOutbox, clearEmailOutbox } = await import("../src/lib/server/email.ts");
const { exportUserData } = await import("../src/lib/server/user-service.ts");
const { buildDsarBundle } = await import("../src/lib/server/privacy.ts");
const { anonymizeClosedAccount } = await import("../src/lib/server/erasure.ts");
const { identityFingerprint } = await import("../src/lib/server/crypto.ts");

let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, extra = "") => {
  if (cond) { pass++; console.log(`PASS ${label}${extra ? ` — ${extra}` : ""}`); }
  else { fail++; console.log(`FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
};
/** One section; an exception is a FAIL naming the section, never a silent stop of the run. */
async function section(title: string, body: () => Promise<void>): Promise<void> {
  console.log("");
  console.log(title);
  try { await body(); } catch (err) { ok(`${title.split(" ")[0]} · the section ran to the end`, false, String((err as Error)?.stack ?? err).slice(0, 600)); }
}
const now = () => new Date().toISOString();
const J = (x: unknown) => JSON.stringify(x);
const reasonOf = (r: unknown) => (r as { reason?: string }).reason;
const outcomeOf = (r: unknown) => (r as { ok?: boolean; data?: { outcome?: string } }).ok ? (r as { data?: { outcome?: string } }).data?.outcome : undefined;
const routesOf = (r: unknown) => (r as { data?: { routes?: string[] } }).data?.routes ?? [];
/** Any write moves `updatedAt`; two writes inside one millisecond would share a version, so the version tests step past it. */
const tick = () => new Promise((r) => setTimeout(r, 8));

/** A 1×1 PNG that passes `validateDocImage` (the fixture `/auth/demo` attaches). */
const PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
const OFFICER = "usr_kto_officer";
const OFFICER2 = "usr_kto_officer_two";
const ACCOUNT_DOB = "1990-01-01";
const EXPIRY = "2031-06-30";
let seq = 0;

// ── Numbers, unique per fixture (one document, one account is enforced) ──────────────────────────────────────────
/** A NIDA whose birth digits are `birth` (YYYYMMDD); never ending 0000 / 9999 (the local mock's QA hooks). */
const nida = (birth = "19900101") => `${birth}${String(++seq).padStart(8, "0")}1357`;
/** Inside the usual EAC/ICAO shape — no flag. */
const passport = () => `TZ${String(1_000_000 + ++seq)}`;
const licence = () => `DL${String(++seq).padStart(6, "0")}`;
const voter = () => `VC${String(++seq).padStart(8, "0")}`;

/**
 * A full name UNIQUE to the fixture. ⛔ Load-bearing: the same-person check compares every row with the same date of
 * birth, and a frozen or self-excluded fixture sharing a name with another would ROUTE that other one.
 */
const nameFor = (u: string) => `Typed Fixture ${u.replace(/^usr_kto_/, "").replace(/_/g, " ")}`;
const typed = (u: string, idType: string, idNumber: string, extra: Record<string, unknown> = {}) =>
  ({ idType, idNumber, fullName: nameFor(u), ...(idType === "PASSPORT" || idType === "DRIVER_LICENSE" ? { idExpiry: EXPIRY } : {}), ...extra }) as never;

/** An account with a wallet, and NO submission — the product opens one on the first press. */
async function account(id: string, opts: { dob?: string | null; status?: string; wallet?: Partial<StoredWallet>; email?: string | null; closedAt?: string | null } = {}): Promise<string> {
  const n = ++seq;
  await db.user.create({
    id, phoneE164: `+25575${String(n).padStart(7, "0")}`, passwordHash: null, passwordSalt: null, failedLoginCount: 0, lockedUntil: null,
    role: "PLAYER", status: opts.status ?? "ACTIVE", locale: "EN", displayName: `Handle ${n}`, dob: opts.dob === undefined ? ACCOUNT_DOB : opts.dob, region: "TZ",
    acceptedTermsVersion: "v1", acceptedTermsAt: now(), marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null,
    email: opts.email ?? null, emailVerifiedAt: null, createdAt: now(), updatedAt: now(), lastLoginAt: now(), closedAt: opts.closedAt ?? null,
  } as never);
  await db.wallet.create({
    id: `wal_${id}`, userId: id, balance: 50_000, pending: 0, hold: 0, bonusBalance: 0, currency: "TZS", status: "ACTIVE",
    createdAt: now(), updatedAt: now(), ...opts.wallet,
  } as StoredWallet);
  return id;
}
/** A submission written whole — every column named (the DAL writes an omitted one as null). */
async function kycRow(userId: string, f: Partial<StoredKyc>): Promise<void> {
  const t = now();
  await db.kyc.upsert({
    id: `kyc_${userId}`, userId, status: "APPROVED", rejectReason: null, rejectNote: null,
    idType: "VOTER_CARD", idNumber: voter(), idExpiry: null, idVerifiedAt: t, idFingerprint: null,
    fullName: nameFor(userId), dob: ACCOUNT_DOB, documents: [], extraRequests: [], reviewerId: null, reviewedAt: t,
    submittedAt: t, approvedAt: t, photoVerifiedAt: null, autoApprovedAt: t, autoFlags: [], postCheckedAt: null,
    postCheckedById: null, priorIdentities: [], createdAt: t, updatedAt: t, ...f,
  } as StoredKyc);
}
const kycOf = async (id: string) => (await db.kyc.findByUserId(id))!;
const versionOf = async (id: string) => kycRowVersion(await kycOf(id));
const typedAll = Object.fromEntries(attestationKeys("typed").map((k) => [k, "pass"])) as Record<string, "pass">;
const photoAll = Object.fromEntries(attestationKeys("photo").map((k) => [k, "pass"])) as Record<string, "pass">;
/** The function bodies of a source file, by name — `^` in multiline mode, so CRLF and LF read alike. */
function fnBody(src: string, name: string): string {
  const re = /^(?:export )?(?:async )?function ([A-Za-z0-9_]+)/gm;
  const starts: Array<[string, number]> = [];
  for (let m; (m = re.exec(src)); ) starts.push([m[1], m.index]);
  const i = starts.findIndex(([n]) => n === name);
  if (i < 0) return "";
  return src.slice(starts[i][1], i + 1 < starts.length ? starts[i + 1][1] : src.length);
}
const read = (rel: string) => readFileSync(new URL(`../${rel}`, import.meta.url), "utf8");

for (const [id, name] of [[OFFICER, "Officer One"], [OFFICER2, "Officer Two"]] as const) {
  await db.user.create({
    id, phoneE164: id === OFFICER ? "+255750009991" : "+255750009992", passwordHash: null, passwordSalt: null, failedLoginCount: 0, lockedUntil: null,
    role: "COMPLIANCE", status: "ACTIVE", locale: "EN", displayName: name, dob: null, region: null,
    acceptedTermsVersion: null, acceptedTermsAt: null, marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null,
    email: null, emailVerifiedAt: null, createdAt: now(), updatedAt: now(), lastLoginAt: null, closedAt: null,
  } as never);
}
ok("0.1 CONTROL · the suite runs on the in-memory store (no DATABASE_URL)", !process.env.DATABASE_URL);

// ── §1 · G1 — the typed track draws no uploader ────────────────────────────────────────────────────────────────────
await section("§1 · G1 · the typed track draws no uploader, no file input, no attach action", async () => {
  const page = decomment(read("src/app/profile/kyc/page.tsx"));
  /**
   * ⭐ SCOPED TO WHAT THE TYPED TRACK CAN DRAW. The photo track lives in ONE block, `{agentMode && ( … )}`; everything
   * outside it is reachable on the typed track (the identity form itself is shared, so an uploader planted THERE is a
   * typed-track uploader). Import statements are dropped: a name imported is not a control drawn.
   */
  const OPEN = "{agentMode && (";
  const spans = (src: string): Array<[number, number]> => {
    const out: Array<[number, number]> = [];
    let from = 0;
    for (;;) {
      const at = src.indexOf(OPEN, from);
      if (at < 0) break;
      let depth = 0, i = at + OPEN.length - 1, inStr = false;
      for (; i < src.length; i++) {
        const c = src[i];
        if (c === '"') { inStr = !inStr; continue; }
        if (inStr) continue;
        if (c === "(") depth++;
        else if (c === ")" && --depth === 0) break;
      }
      out.push([at, i + 1]);
      from = i + 1;
    }
    return out;
  };
  const typedScope = (src: string) => {
    let rest = "", last = 0;
    for (const [a, b] of spans(src)) { rest += src.slice(last, a); last = b; }
    return (rest + src.slice(last)).replace(/^import\s[^;]*;/gm, "");
  };
  const agentScope = (src: string) => spans(src).map(([a, b]) => src.slice(a, b)).join(" ");

  // The census: every component this page imports from @/components that draws a file input.
  const fileInput = /type=(?:"file"|\{"file"\})/;
  const drawsFile: string[] = [];
  for (const m of page.matchAll(/^import\s+\{([^}]*)\}\s+from\s+"@[/]components[/]([^"]+)";/gm)) {
    const src = [".tsx", ".ts"].map((ext) => { try { return read(`src/components/${m[2]}${ext}`); } catch { return ""; } }).join("");
    if (fileInput.test(decomment(src))) drawsFile.push(...m[1].split(",").map((s) => s.trim().split(/\s+as\s+/).pop()!.trim()).filter(Boolean));
  }
  const scope = typedScope(page);
  const offenders = (s: string) => [
    ...drawsFile.filter((n) => s.includes(`<${n}`)).map((n) => `<${n}>`),
    ...(fileInput.test(s) ? ['type="file"'] : []),
    ...["attachDocumentAction", "sendPhotosForReviewAction", "attachExtraDocumentAction", "KycExtraDocUploader"].filter((n) => s.includes(n)),
  ];

  ok("1.1 CONTROL · the agent-only block ({agentMode && (…)}) is found exactly once", spans(page).length === 1, `found ${spans(page).length}`);
  ok("1.2 CONTROL · the census finds the components that draw a file input (KycDocUploader among them)", drawsFile.includes("KycDocUploader"), J(drawsFile));
  ok("1.3 CONTROL · …and the agent-only block still draws the uploader — the photo track is intact", agentScope(page).includes("<KycDocUploader"));
  ok("1.4 ⛔ the typed track draws no uploader, file input or attach action outside the agent-only block", offenders(scope).length === 0, J(offenders(scope)));
  ok("1.5 CONTROL · the typed track's form posts verifyIdentityAction", scope.includes("verifyIdentityAction"));
  const FORM = "<form action={agentMode ? saveAgentIdentityAction : verifyIdentityAction}";
  const planted = page.replace(FORM, `<KycDocUploader label="x" docType="SELFIE" attached={false} />${FORM}`);
  ok("1.6 CONTROL · the scan catches an uploader planted in the identity form", planted !== page && offenders(typedScope(planted)).includes("<KycDocUploader>"));

  ok("1.7 ⛔ kyc-service exports no attachExtraDocument (nor forceReverifyKyc)",
    !("attachExtraDocument" in SVC) && !("forceReverifyKyc" in SVC) && !/export async function attachExtraDocument/.test(decomment(read("src/lib/server/kyc-service.ts"))));
  const actions = decomment(read("src/app/profile/kyc/actions.ts"));
  const gone = ["attachExtraDocumentAction", "submitIdentityAction", "submitKycForReviewAction"].filter((n) => new RegExp(`export async function ${n}[^A-Za-z0-9_]`).test(actions));
  ok("1.8 ⛔ the player's actions export no attachExtraDocumentAction, submitIdentityAction or submitKycForReviewAction", gone.length === 0, J(gone));
  ok("1.9 CONTROL · …while the typed press and the agent track's actions exist",
    /export async function verifyIdentityAction/.test(actions) && /export async function saveAgentIdentityAction/.test(actions) && /export async function sendPhotosForReviewAction/.test(actions));
});

// ── §2 · G2 — all four documents, at once, with nothing uploaded ───────────────────────────────────────────────────
await section("§2 · G2 · all four document types are approved at once with zero documents", async () => {
  const cases: Array<[string, string, string]> = [
    ["NIDA", nida(), "the number's birth digits match the account"],
    ["PASSPORT", passport(), "inside the usual shape"],
    ["DRIVER_LICENSE", licence(), "no published format — a flag"],
    ["VOTER_CARD", voter(), "no published format — a flag"],
  ];
  const ids: string[] = [];
  for (const [i, [type, number]] of cases.entries()) {
    const u = await account(`usr_kto_g2_${type.toLowerCase()}`);
    ids.push(u);
    const r = await verifyIdentity(u, typed(u, type, number));
    const k = await kycOf(u);
    ok(`2.${i + 1} ⭐ ${type} · verified at once with zero documents (APPROVED, autoApprovedAt set, reviewerId null, photoVerifiedAt null)`,
      outcomeOf(r) === "approved" && k.status === "APPROVED" && !!k.autoApprovedAt && k.reviewerId === null && !k.photoVerifiedAt && (k.documents ?? []).length === 0,
      J({ r, status: k.status, auto: k.autoApprovedAt, reviewer: k.reviewerId, photo: k.photoVerifiedAt, docs: (k.documents ?? []).length }));
    const flags = Array.isArray(k.autoFlags) ? k.autoFlags : [];
    const wantFlag = type === "DRIVER_LICENSE" || type === "VOTER_CARD" ? ["NO_PUBLISHED_FORMAT"] : [];
    ok(`2.${i + 1}b ${type} · …the approval opens withdrawals (approvedEver), joins the post-check list, and records its flags`,
      approvedEver(k) && !!k.approvedAt && !k.postCheckedAt && J(flags) === J(wantFlag) && k.idType === type, J({ flags, want: wantFlag, approvedAt: k.approvedAt }));
  }
  const off = await account("usr_kto_g2_offshape");
  const rp = await verifyIdentity(off, typed(off, "PASSPORT", `P${String(10_000 + ++seq)}`));
  const kp = await kycOf(off);
  ok("2.5 ⭐ a passport outside the usual shape is still approved at once — the flag rides along, it never routes",
    outcomeOf(rp) === "approved" && J(kp.autoFlags) === J(["PASSPORT_SHAPE"]), J({ rp, flags: kp.autoFlags }));
  const listed = await db.kyc.listUncheckedAutoApprovals();
  ok("2.6 ⭐ every automatic approval is on the officers' post-check list", [...ids, off].every((u) => listed.some((x: { userId: string }) => x.userId === u)), `listed=${listed.length}`);
  await auditFlush();
  const approvedRows = ids.map((u) => getAuditForTarget("User", u, 200).find((e) => e.action === "kyc.approved"));
  ok("2.7 ⛔ the automatic approval is audited with NO actor (never an officer, never the player) and says so",
    approvedRows.every((e) => !!e && e.actorId === null && (e.payload as { automatic?: boolean })?.automatic === true),
    J(approvedRows.map((e) => e && { actor: e.actorId, auto: (e.payload as { automatic?: boolean })?.automatic })));
});

// ── §3 · G3 — every routing reason routes; holds are never lifted by the machine ───────────────────────────────────
await section("§3 · G3 · each routing reason sends the identity to an officer — never refused, never approved", async () => {
  /**
   * ROUTED means: the press succeeded, THESE reasons and no others sent it, the case is with an officer, and nothing
   * approved it now. A first-time account also has no approval on record; an account approved ONCE keeps `approvedAt` (a
   * fact about the past — its withdrawals stay open), so the provenance cases pass `firstTime = false`.
   */
  const routed = async (u: string, r: unknown, reasons: string | string[], firstTime = true) => {
    const k = await kycOf(u);
    const want = (Array.isArray(reasons) ? [...reasons] : [reasons]).sort();
    return outcomeOf(r) === "routed" && J([...routesOf(r)].sort()) === J(want) && k.status === "PENDING_REVIEW" && !k.autoApprovedAt && !!k.submittedAt
      && (firstTime ? !k.approvedAt : !!k.approvedAt);
  };
  const show = async (u: string, r: unknown) => { const k = await kycOf(u); return J({ r, status: k.status, auto: k.autoApprovedAt, approvedAt: k.approvedAt }); };

  // NIDA_UNDER_18 — the account is adult, the number's birth digits are not.
  {
    const u = await account("usr_kto_g3_nida18");
    const r = await verifyIdentity(u, typed(u, "NIDA", nida("20150101")));
    ok("3.1 ⭐ NIDA_UNDER_18 · a NIDA whose birth digits say under 18 is ROUTED to an officer, never approved and never refused", await routed(u, r, "NIDA_UNDER_18"), await show(u, r));
  }

  // OFFICER_PROVENANCE — an officer's recoverable refusal, then a restart (startKyc) or a one-press retry.
  // ⭐ The refused identity is an UNCHECKED AUTOMATIC APPROVAL, so the refusal must also hold the wallet (review R1.2 —
  // §12 proves the rule); the retry is then routed for BOTH reasons: the officer's provenance and the officer's hold.
  const FREEZE = { alsoFreeze: true, freezeReason: "Refused identity — the wallet is held while it is fixed" };
  {
    const u = await account("usr_kto_g3_prov_restart");
    const first = voter();
    await verifyIdentity(u, typed(u, "VOTER_CARD", first));
    const rj = await reviewKyc({ officerId: OFFICER, userId: u, decision: "REJECT", rejectCode: "DETAILS_MISMATCH", version: await versionOf(u), ...FREEZE });
    const st = await startKyc(u);
    const after = await kycOf(u);
    ok("3.2 CONTROL · the officer's recoverable refusal landed and the restart opened the row (IN_PROGRESS, the first identity in priorIdentities)",
      rj.ok && st.ok && after.status === "IN_PROGRESS" && (after.priorIdentities ?? []).some((p) => p.idNumber === first && p.cause === "restart"),
      J({ rj, st, status: after.status, prior: (after.priorIdentities ?? []).map((p) => [p.idNumber, p.cause]) }));
    const r = await verifyIdentity(u, typed(u, "VOTER_CARD", voter()));
    ok("3.2a ⛔ OFFICER_PROVENANCE · an officer's recoverable refusal, restarted by startKyc: the officer is carried and the next send is ROUTED (provenance + the officer's hold)",
      after.reviewerId === OFFICER && await routed(u, r, ["OFFICER_PROVENANCE", "WALLET_HOLD"], false), `${await show(u, r)} reviewer=${after.reviewerId}`);
  }
  {
    const u = await account("usr_kto_g3_prov_inline");
    await verifyIdentity(u, typed(u, "VOTER_CARD", voter()));
    const rj = await reviewKyc({ officerId: OFFICER, userId: u, decision: "REJECT", rejectCode: "OTHER", reason: "Please check the number on the card.", version: await versionOf(u), ...FREEZE });
    const r = await verifyIdentity(u, typed(u, "VOTER_CARD", voter()));
    ok("3.2b ⛔ OFFICER_PROVENANCE · an officer's recoverable refusal retried in one press (the inline restart): ROUTED to an officer (provenance + the officer's hold)",
      rj.ok && await routed(u, r, ["OFFICER_PROVENANCE", "WALLET_HOLD"], false), `${J(rj)} ${await show(u, r)}`);
  }
  {
    // CONTROL — a refusal no officer made (the local NIDA mock's mismatch hook) carries no provenance.
    const u = await account("usr_kto_g3_machine");
    const m = await verifyIdentity(u, typed(u, "NIDA", `19900101${String(++seq).padStart(8, "0")}9999`));
    const k = await kycOf(u);
    const r = await verifyIdentity(u, typed(u, "VOTER_CARD", voter()));
    ok("3.2c CONTROL · a MACHINE refusal (the NIDA check) retried restarts to an instant approval — provenance is an officer's, not a refusal's",
      outcomeOf(m) === "refused" && k.status === "REJECTED" && k.reviewerId === null && outcomeOf(r) === "approved", J({ m, status: k.status, reviewer: k.reviewerId, r }));
  }

  // HIGH_RISK — large withdrawals, AML-held transactions, a deposit burst, a new account.
  {
    const u = await account("usr_kto_g3_risk");
    const txn = (type: string, status: string, amount: number) => db.txn.create({
      id: `txn_${u}_${++seq}`, walletId: `wal_${u}`, userId: u, type, status, amount, fee: 0, taxWithheld: 0, balanceAfter: null, currency: "TZS",
      provider: "INTERNAL", providerRef: null, msisdn: null, description: null, positionId: null, amlReason: null,
      createdAt: now(), updatedAt: now(), completedAt: now(),
    } as StoredTxn);
    for (let i = 0; i < 3; i++) await txn("WITHDRAWAL", "CONFIRMED", -1_200_000);
    for (let i = 0; i < 2; i++) await txn("WITHDRAWAL", "AML_REVIEW", -2_000_000);
    for (let i = 0; i < 6; i++) await txn("DEPOSIT", "CONFIRMED", 10_000);
    const risk = await kycRiskScore(u);
    ok("3.3 CONTROL · the fixture really scores at or above the two-officer threshold", risk.score >= KYC_MAKER_CHECKER_THRESHOLD, `score=${risk.score}`);
    const r = await verifyIdentity(u, typed(u, "VOTER_CARD", voter()));
    ok("3.3a ⛔ HIGH_RISK · a risk score at or above the two-officer threshold is ROUTED", await routed(u, r, "HIGH_RISK"), await show(u, r));
  }

  // WALLET_HOLD — an officer's own hold, and a stale identity hold.
  {
    const u = await account("usr_kto_g3_officer_hold");
    const fz = await freezeWalletByOfficer(OFFICER, u, "Held while the guard checks routing");
    const r = await verifyIdentity(u, typed(u, "VOTER_CARD", voter()));
    const w = await db.wallet.findByUserId(u);
    ok("3.4 ⛔ WALLET_HOLD · an OFFICER wallet hold routes, and the hold is still standing after",
      fz.ok && await routed(u, r, "WALLET_HOLD") && w?.status === "FROZEN" && (w?.freezeReasons ?? []).includes("OFFICER"), `${await show(u, r)} wallet=${J([w?.status, w?.freezeReasons])}`);
  }
  let staleHeld = "";
  {
    const u = await account("usr_kto_g3_identity_hold");
    staleHeld = u;
    await addWalletFreeze(u, "IDENTITY_REFUSED", { actorId: OFFICER, note: "a stale identity hold — its refusal write failed" });
    const r = await verifyIdentity(u, typed(u, "VOTER_CARD", voter()));
    const w = await db.wallet.findByUserId(u);
    ok("3.5 ⛔ WALLET_HOLD · a stale IDENTITY_REFUSED hold routes, and the automatic path does not lift it",
      await routed(u, r, "WALLET_HOLD") && w?.status === "FROZEN" && (w?.freezeReasons ?? []).includes("IDENTITY_REFUSED"), `${await show(u, r)} wallet=${J([w?.status, w?.freezeReasons])}`);
  }

  // SOF_REJECTED
  {
    const u = await account("usr_kto_g3_sof");
    await db.sourceOfFunds.upsert({
      userId: u, declaredSource: "salary", declaredOccupation: "Teacher", declaredEmployer: null, declaredAnnualIncomeBand: "under-12m",
      declaredOther: null, reviewStatus: "REJECTED", reviewerId: OFFICER, reviewedAt: now(), submittedAt: now(),
    });
    const r = await verifyIdentity(u, typed(u, "VOTER_CARD", voter()));
    ok("3.6 ⛔ SOF_REJECTED · a rejected source-of-funds declaration routes", await routed(u, r, "SOF_REJECTED"), await show(u, r));
  }

  // AML_ESCALATION — an officer escalated this person and no decision has followed.
  {
    const u = await account("usr_kto_g3_aml");
    await audit({ category: "COMPLIANCE", action: "kyc.escalated_to_aml", actorId: OFFICER, targetType: "User", targetId: u, payload: { note: "guard fixture" } });
    await auditFlush();
    const r = await verifyIdentity(u, typed(u, "VOTER_CARD", voter()));
    ok("3.7 ⛔ AML_ESCALATION · an open AML escalation routes", await routed(u, r, "AML_ESCALATION"), await show(u, r));
  }

  // SAME_PERSON_RESTRICTED — the same name (tokens in any order) and date of birth on a self-excluded account.
  {
    const other = await account("usr_kto_g3_excluded", { status: "SELF_EXCLUDED" });
    await kycRow(other, { fullName: "Halima Said Juma" });
    const u = await account("usr_kto_g3_same");
    const r = await verifyIdentity(u, typed(u, "VOTER_CARD", voter(), { fullName: "Juma Halima Said" }));
    ok("3.8 ⛔ SAME_PERSON_RESTRICTED · the same person (name tokens in any order, same date of birth) on a self-excluded account routes",
      await routed(u, r, "SAME_PERSON_RESTRICTED"), await show(u, r));
    const free = await account("usr_kto_g3_free");
    await kycRow(free, { fullName: "Neema Paul Mushi" });
    const u2 = await account("usr_kto_g3_same_free");
    const r2 = await verifyIdentity(u2, typed(u2, "VOTER_CARD", voter(), { fullName: "Neema Paul Mushi" }));
    const k2 = await kycOf(u2);
    ok("3.9 CONTROL · the same person on an ACTIVE account only flags (SAME_PERSON) — approved at once",
      outcomeOf(r2) === "approved" && (k2.autoFlags ?? []).includes("SAME_PERSON"), J({ r2, flags: k2.autoFlags }));
  }

  // ⛔ THE MACHINE NEVER LIFTS A HOLD — even one that lands after its facts were read (the race this rule exists for).
  {
    const u = await account("usr_kto_g3_race_hold");
    const kycApi = db.kyc as unknown as { findSamePersonCandidates: (dob: string, ex: string) => unknown };
    const orig = kycApi.findSamePersonCandidates;
    let armed = true;
    // The same-person read runs AFTER the wallet read inside the facts — so the hold lands once `holds` is already [].
    kycApi.findSamePersonCandidates = (async (dob: string, ex: string) => {
      if (armed && ex === u) {
        armed = false;
        await addWalletFreeze(u, "IDENTITY_REFUSED", { actorId: OFFICER, note: "race fixture · held after the facts were read" });
      }
      return orig.call(db.kyc, dob, ex);
    }) as never;
    let r: unknown;
    try { r = await verifyIdentity(u, typed(u, "VOTER_CARD", voter())); } finally { kycApi.findSamePersonCandidates = orig; }
    const w = await db.wallet.findByUserId(u);
    ok("3.10 CONTROL · the race really ran: the hold landed after the facts were read, and the press was approved",
      !armed && outcomeOf(r) === "approved", J({ armed, r }));
    ok("3.10a ⛔ the automatic path never lifts a hold — an identity hold that lands after the facts were read is still standing after the instant approval",
      w?.status === "FROZEN" && (w?.freezeReasons ?? []).includes("IDENTITY_REFUSED"), J([w?.status, w?.freezeReasons]));
  }
  {
    // CONTROL — the lift exists, and an OFFICER's approval uses it (the stale-hold case of 3.5).
    const ap = await reviewKyc({ officerId: OFFICER, userId: staleHeld, decision: "APPROVE", mode: "typed", attestations: typedAll, version: await versionOf(staleHeld) });
    const w = await db.wallet.findByUserId(staleHeld);
    ok("3.11 CONTROL · …while an OFFICER's approval does lift a stale identity hold (the lift exists; only the machine may not use it)",
      ap.ok && w?.status === "ACTIVE" && !(w?.freezeReasons ?? []).includes("IDENTITY_REFUSED"), J({ ap, w: [w?.status, w?.freezeReasons] }));
  }
  await auditFlush();
  const routedAudit = getAuditForTarget("User", "usr_kto_g3_sof", 200).find((e) => e.action === "kyc.routed");
  const payload = (routedAudit?.payload ?? {}) as { reasons?: string[]; idType?: string; last4?: string; idNumber?: unknown; fullName?: unknown };
  ok("3.12 ⛔ a routed case is audited kyc.routed with no actor, its reasons and the masked tail — never the number or a name",
    !!routedAudit && routedAudit.actorId === null && J(payload.reasons) === J(["SOF_REJECTED"]) && payload.idType === "VOTER_CARD" && typeof payload.last4 === "string"
      && payload.idNumber === undefined && payload.fullName === undefined, J(routedAudit ?? null));
});

// ── §4 · G4 — corrections may change the name, never the approved number ───────────────────────────────────────────
await section("§4 · G4 · an approved-once correction keeps its number", async () => {
  const u = await account("usr_kto_g4_correction");
  const held = voter();
  await verifyIdentity(u, typed(u, "VOTER_CARD", held));
  const asked = await askForCorrections(OFFICER, u, { note: "Please give your name exactly as it is printed on the card.", version: await versionOf(u) });
  ok("4.0 CONTROL · an officer asked an approved-once identity for corrections", asked.ok && (await kycOf(u)).status === "ADDITIONAL_INFO_REQUIRED", J(asked));
  const moved = await verifyIdentity(u, typed(u, "VOTER_CARD", voter()));
  const k = await kycOf(u);
  ok("4.1 ⛔ an approved-once correction with a changed number is refused identity_number_locked",
    !moved.ok && reasonOf(moved) === "identity_number_locked" && k.status === "ADDITIONAL_INFO_REQUIRED", J({ moved, status: k.status }));
  const holder = await db.kyc.findActiveByIdNumber("VOTER_CARD", held, "usr_kto_nobody");
  ok("4.2 ⛔ …the approved number stays on the row and held: findActiveByIdNumber still answers the first account",
    k.idNumber === held && holder?.userId === u, J({ n: k.idNumber, holder }));
  const thief = await account("usr_kto_g4_other");
  const taken = await verifyIdentity(thief, typed(thief, "VOTER_CARD", held));
  ok("4.3 ⛔ …and another account presenting it is refused id_taken", !taken.ok && reasonOf(taken) === "id_taken", J(taken));
  const fixed = await verifyIdentity(u, typed(u, "VOTER_CARD", held, { fullName: "Corrected Fixture Name" }));
  const k2 = await kycOf(u);
  ok("4.4 ⭐ the same number with a corrected name is accepted — and goes back to an officer (PENDING_REVIEW), approvedAt kept",
    outcomeOf(fixed) === "routed" && routesOf(fixed).includes("OFFICER_PROVENANCE") && k2.status === "PENDING_REVIEW" && k2.fullName === "Corrected Fixture Name"
      && k2.idNumber === held && approvedEver(k2), J({ fixed, status: k2.status, name: k2.fullName }));
});

// ── §5 · G5 — the date of birth is the account's ──────────────────────────────────────────────────────────────────
await section("§5 · G5 · the date of birth comes from the account", async () => {
  {
    const u = await account("usr_kto_g5_posted");
    const r = await verifyIdentity(u, typed(u, "VOTER_CARD", voter(), { dob: "2001-02-03" }));
    const k = await kycOf(u);
    const user = await db.user.findById(u);
    ok("5.1 ⛔ the posted date of birth is ignored when the account has one",
      outcomeOf(r) === "approved" && String(k.dob).slice(0, 10) === ACCOUNT_DOB && String(user?.dob).slice(0, 10) === ACCOUNT_DOB, J({ r, row: k.dob, account: user?.dob }));
  }
  {
    const u = await account("usr_kto_g5_prisma", { dob: "1988-07-15T00:00:00.000Z" });
    const r = await verifyIdentity(u, typed(u, "VOTER_CARD", voter()));
    const k = await kycOf(u);
    ok("5.2 ⛔ a Prisma-shaped account date (an ISO timestamp) is normalised to the calendar day, and the identity verifies",
      outcomeOf(r) === "approved" && k.dob === "1988-07-15", J({ r, row: k.dob }));
  }
  {
    const u = await account("usr_kto_g5_none", { dob: null });
    const r = await verifyIdentity(u, typed(u, "VOTER_CARD", voter(), { dob: "1992-03-04" }));
    const k = await kycOf(u);
    const user = await db.user.findById(u);
    ok("5.3 ⭐ an account with no date of birth types one, and the account keeps it from then on",
      outcomeOf(r) === "approved" && k.dob === "1992-03-04" && String(user?.dob).slice(0, 10) === "1992-03-04", J({ r, row: k.dob, account: user?.dob }));
  }
  {
    const u = await account("usr_kto_g5_minor", { dob: null });
    const r = await verifyIdentity(u, typed(u, "VOTER_CARD", voter(), { dob: "2015-01-01" }));
    await auditFlush();
    const user = await db.user.findById(u);
    const k = await db.kyc.findByUserId(u);
    const attempt = getAuditForTarget("User", u, 200).find((e) => e.action === "kyc.identity.underage_attempt");
    ok("5.4 ⛔ a typed date under 18 on an account with none is refused, audited, and never written to the account",
      !r.ok && !user?.dob && k?.status !== "APPROVED" && (attempt?.payload as { source?: string } | undefined)?.source === "typed", J({ r, dob: user?.dob, status: k?.status, attempt: attempt?.payload }));
  }
});

// ── §6 · G6 — attestation sets by mode ─────────────────────────────────────────────────────────────────────────────
await section("§6 · G6 · each case is attested with its own set", async () => {
  ok("6.1 CONTROL · the typed set passes in typed mode, the photo set in photo mode",
    parseAttestations(typedAll, "typed").ok && parseAttestations(photoAll, "photo").ok);
  ok("6.2 ⛔ the photo set on a typed case is refused", !parseAttestations(photoAll, "typed").ok);
  ok("6.3 ⛔ a photo key on a typed case is refused (the typed set plus selfie_match)", !parseAttestations({ ...typedAll, selfie_match: "pass" }, "typed").ok);
  ok("6.4 ⛔ a typed key on a photo case is refused", !parseAttestations({ ...photoAll, details_genuine: "pass" }, "photo").ok);
  const missing = { ...typedAll } as Record<string, string>;
  delete missing.number_reviewed;
  ok("6.5 ⛔ an unknown key, a missing key and a fail are each refused",
    !parseAttestations({ ...typedAll, looks_fine: "pass" }, "typed").ok && !parseAttestations(missing, "typed").ok && !parseAttestations({ ...typedAll, sanctions_clear: "fail" }, "typed").ok);
  const u = await account("usr_kto_g6_postcheck");
  await verifyIdentity(u, typed(u, "VOTER_CARD", voter()));
  const r = await markPostChecked(OFFICER, u, { version: await versionOf(u), attestations: photoAll });
  ok("6.6 ⛔ markPostChecked refuses the photo set on an automatic (typed) approval", !r.ok && !(await kycOf(u)).postCheckedAt, J(r));
  const shared = attestationKeys("typed").filter((k) => attestationKeys("photo").includes(k));
  ok("6.7 the two sets are different statements: only sanctions_clear is shared, and each set has its own dated id",
    J(shared) === J(["sanctions_clear"]) && ATTESTATION_SET_ID.typed !== ATTESTATION_SET_ID.photo, J({ shared, ids: ATTESTATION_SET_ID }));
});

// ── §7 · G7 — the legacy image route ──────────────────────────────────────────────────────────────────────────────
await section("§7 · G7 · officers can still open every image on file", async () => {
  const route = decomment(read("src/app/api/admin/kyc-doc/route.ts"));
  ok("7.1 ⛔ the legacy image route accepts exactly LEGACY_KYC_DOC_SLOTS (frozen, never derived)",
    /new Set<string>\(LEGACY_KYC_DOC_SLOTS\)/.test(route) && /DOC_TYPES\.has\(docType\)/.test(route) && !/ALL_DOC_SLOTS|requiredSlots|ID_DOC_SPECS/.test(route));
  const FROZEN = ["DRIVER_LICENSE", "NIDA", "NIDA_BACK", "NIDA_FRONT", "PASSPORT", "SELFIE", "VOTER_CARD"];
  ok("7.2 ⛔ LEGACY_KYC_DOC_SLOTS is the frozen seven, the enum-only NIDA slot included", J([...LEGACY_KYC_DOC_SLOTS].sort()) === J(FROZEN), J(LEGACY_KYC_DOC_SLOTS));
  ok("7.3 ⛔ every slot the agent track can write stays readable, and the frozen list is wider (it is not derived)",
    ALL_DOC_SLOTS.every((s) => (LEGACY_KYC_DOC_SLOTS as readonly string[]).includes(s)) && LEGACY_KYC_DOC_SLOTS.length > ALL_DOC_SLOTS.length, J(ALL_DOC_SLOTS));
  ok("7.4 CONTROL · a ?req= id is shape-checked and matched against THIS player's own row",
    /REQ_ID\.test\(reqId\)/.test(route) && /extraRequests[\s\S]{0,160}r\.id === reqId/.test(route));
});

// ── §8 · G8 — expiry and duplicates ───────────────────────────────────────────────────────────────────────────────
await section("§8 · G8 · expiry and one-document-one-account still bite", async () => {
  {
    const u = await account("usr_kto_g8_expired");
    const r = await verifyIdentity(u, typed(u, "PASSPORT", passport(), { idExpiry: "2020-01-01" }));
    const k = await kycOf(u);
    ok("8.1 ⛔ an expired passport is refused id_expired, and nothing is approved", !r.ok && reasonOf(r) === "id_expired" && k.status !== "APPROVED" && !k.autoApprovedAt, J({ r, status: k.status }));
  }
  {
    const u = await account("usr_kto_g8_noexpiry");
    const r = await verifyIdentity(u, typed(u, "DRIVER_LICENSE", licence(), { idExpiry: "" }));
    ok("8.2 ⛔ a licence with no expiry is refused id_expiry_required", !r.ok && reasonOf(r) === "id_expiry_required", J(r));
  }
  {
    const a = await account("usr_kto_g8_first");
    const n = voter();
    const ra = await verifyIdentity(a, typed(a, "VOTER_CARD", n));
    const b = await account("usr_kto_g8_second");
    const rb = await verifyIdentity(b, typed(b, "VOTER_CARD", n));
    const kb = await kycOf(b);
    ok("8.3 ⛔ a number already approved on another account is refused id_taken (and the first account keeps it)",
      outcomeOf(ra) === "approved" && !rb.ok && reasonOf(rb) === "id_taken" && kb.status !== "APPROVED", J({ ra, rb }));
  }
  {
    const u = await account("usr_kto_g8_photo_expiry");
    await verifyIdentity(u, typed(u, "PASSPORT", passport()));
    // Time passes: the passport accepted then has expired since.
    await db.kyc.upsert({ ...(await kycOf(u)), idExpiry: "2020-01-01", updatedAt: now() });
    const a1 = await attachDocument(u, "PASSPORT", PNG);
    const a2 = await attachDocument(u, "SELFIE", PNG);
    const s = await submitForReview(u);
    ok("8.4 ⛔ the agent photo send re-checks expiry: a document that expired since is refused, and the case never reaches an officer",
      a1.ok && a2.ok && !s.ok && reasonOf(s) === "id_expired" && (await kycOf(u)).status === "APPROVED", J({ a1, a2, s, status: (await kycOf(u)).status }));
  }
});

// ── §9 · G9 — the agent gates ─────────────────────────────────────────────────────────────────────────────────────
await section("§9 · G9 · the agent programme asks for an officer's photo approval", async () => {
  const u = await account("usr_kto_g9_agent");
  await verifyIdentity(u, typed(u, "VOTER_CARD", voter()));
  const auto = await kycOf(u);
  const e0 = await applicantEligibility(u);
  ok("9.1 ⛔ the agent gate refuses an automatic typed approval (photoIdentityVerified false, applicantEligibility kyc_required)",
    auto.status === "APPROVED" && !photoIdentityVerified(auto) && !e0.ok && e0.refusal === "kyc_required", J({ status: auto.status, e0 }));
  const a1 = await attachDocument(u, "VOTER_CARD", PNG);
  const a2 = await attachDocument(u, "SELFIE", PNG);
  const notYet = photoCaseSent(await kycOf(u));
  const s = await submitForReview(u);
  const sent = await kycOf(u);
  ok("9.2 ⭐ a typed-verified player adds photos and a selfie: the photo case is sent, and withdrawals stay open meanwhile",
    a1.ok && a2.ok && !notYet && s.ok && sent.status === "PENDING_REVIEW" && photoCaseSent(sent) && approvedEver(sent) && !photoIdentityVerified(sent),
    J({ a1, a2, s, status: sent.status, approvedAt: sent.approvedAt }));
  const ap = await reviewKyc({ officerId: OFFICER, userId: u, decision: "APPROVE", mode: "photo", attestations: photoAll, version: kycRowVersion(sent) });
  const done = await kycOf(u);
  const e1 = await applicantEligibility(u);
  ok("9.3 ⭐ the agent gate accepts an officer's photo approval (photoVerifiedAt stamped, the post-check discharged, eligibility open)",
    ap.ok && !!done.photoVerifiedAt && done.reviewerId === OFFICER && !!done.postCheckedAt && photoIdentityVerified(done) && e1.ok, J({ ap, photo: done.photoVerifiedAt, e1 }));

  // An officer's approval of a TYPED case (routed, no photos) is not a photo approval.
  const t = await account("usr_kto_g9_typed_officer");
  await audit({ category: "COMPLIANCE", action: "kyc.escalated_to_aml", actorId: OFFICER, targetType: "User", targetId: t, payload: { note: "routes the case to an officer" } });
  await auditFlush();
  await verifyIdentity(t, typed(t, "VOTER_CARD", voter()));
  const v = await versionOf(t);
  const asPhoto = await reviewKyc({ officerId: OFFICER, userId: t, decision: "APPROVE", mode: "photo", attestations: photoAll, version: v });
  const photoSetOnTyped = await reviewKyc({ officerId: OFFICER, userId: t, decision: "APPROVE", attestations: photoAll, version: v });
  ok("9.6 ⛔ reviewKyc refuses a photo approval of a typed case — by its mode, and by the photo statements",
    !asPhoto.ok && !photoSetOnTyped.ok && (await kycOf(t)).status === "PENDING_REVIEW", J({ asPhoto, photoSetOnTyped }));
  const typedOk = await reviewKyc({ officerId: OFFICER, userId: t, decision: "APPROVE", mode: "typed", attestations: typedAll, version: v });
  const kt = await kycOf(t);
  const et = await applicantEligibility(t);
  ok("9.4 ⛔ an officer's approval of a TYPED case is not a photo approval — the agent gate still refuses",
    typedOk.ok && kt.status === "APPROVED" && kt.reviewerId === OFFICER && !kt.photoVerifiedAt && !photoIdentityVerified(kt) && !et.ok && et.refusal === "kyc_required",
    J({ typedOk, photo: kt.photoVerifiedAt, et }));
  // ⚠️ The control's photos carry an upload time BEFORE the stamp (review R5.2 — §13 proves the time rule on its own).
  const stampAt = "2026-10-10T08:00:00.000Z";
  const earlier = "2026-10-10T07:59:00.000Z";
  ok("9.5 ⛔ a photo stamp with no photos on file (the backfill shape) does not open the agent gate",
    !photoIdentityVerified({ status: "APPROVED", photoVerifiedAt: stampAt, idType: "NIDA", documents: [] })
      && photoIdentityVerified({ status: "APPROVED", photoVerifiedAt: stampAt, idType: "NIDA", documents: [{ docType: "NIDA_FRONT", uploadedAt: earlier }, { docType: "NIDA_BACK", uploadedAt: earlier }, { docType: "SELFIE", uploadedAt: earlier }] }));
});

// ── §10 · G10 — the officer's forms are bound to the version they showed ───────────────────────────────────────────
/**
 * ⭐ TWO QUESTIONS, ONE TOKEN (`kycRowVersion` = `<updatedAt>~<identity digest>`, review R1.6). A POSITIVE act — APPROVE,
 * a two-officer recommendation, Mark checked — needs the row EXACTLY as the officer saw it. A REFUSAL-type act — reject,
 * ask for corrections, correct the date of birth — needs only the IDENTITY the officer saw, so a write that changes no
 * identity fact (a photo attached, a post-check stamp) never voids a refusal. A token with no digest is refused by all.
 */
await section("§10 · G10 · every officer decision is bound to the version it showed — exactly for an approval, by identity for a refusal", async () => {
  const u = await account("usr_kto_g10_versions");
  await verifyIdentity(u, typed(u, "VOTER_CARD", voter()));
  const v0 = await versionOf(u);
  /** A write that changes NO identity fact — a bare re-save stands in for a photo attached, a stamp, a second tab. */
  const resave = async () => { await tick(); await db.kyc.upsert({ ...(await kycOf(u)), updatedAt: now() }); return versionOf(u); };
  const digest = (v: string) => v.slice(v.lastIndexOf("~") + 1);
  const v1 = await resave();
  const mp0 = await markPostChecked(OFFICER, u, { version: v0, attestations: typedAll });
  ok("10.1 ⛔ markPostChecked refuses a version the officer saw before the row changed (exactly — even when no identity fact moved)",
    v0 !== v1 && digest(v0) === digest(v1) && !mp0.ok && !(await kycOf(u)).postCheckedAt, J({ v0, v1, mp0 }));
  await tick();
  const mp1 = await markPostChecked(OFFICER, u, { version: v1, attestations: typedAll });
  const k1 = await kycOf(u);
  ok("10.2 CONTROL · …and accepts the current one (postCheckedAt, by that officer)", mp1.ok && !!k1.postCheckedAt && k1.postCheckedById === OFFICER, J(mp1));
  const v2 = kycRowVersion(k1);
  // An IDENTITY fact changes after the officer opened the case (a stand-in for a correction landing in between).
  await tick();
  await db.kyc.upsert({ ...(await kycOf(u)), fullName: "Version Fixture Renamed", updatedAt: now() });
  const v3 = await versionOf(u);
  const ac0 = await askForCorrections(OFFICER, u, { note: "Please check the spelling of your name.", version: v2 });
  ok("10.3 ⛔ askForCorrections refuses a version whose IDENTITY changed since (here the name)",
    digest(v2) !== digest(v3) && !ac0.ok && (await kycOf(u)).status === "APPROVED", J(ac0));
  const bare = v3.slice(0, v3.lastIndexOf("~"));
  const ac1 = await askForCorrections(OFFICER, u, { note: "Please check the spelling of your name.", version: bare });
  ok("10.3b ⛔ …and a token with no identity digest (an old form) is refused", bare.length > 10 && !bare.includes("~") && !ac1.ok && (await kycOf(u)).status === "APPROVED", J(ac1));
  const v4 = await resave();
  const ac2 = await askForCorrections(OFFICER, u, { note: "Please check the spelling of your name.", version: v3 });
  ok("10.4 CONTROL · …while a write that changes NO identity fact never voids it: a token one re-save old moves the case to ADDITIONAL_INFO_REQUIRED",
    v3 !== v4 && ac2.ok && (await kycOf(u)).status === "ADDITIONAL_INFO_REQUIRED", J(ac2));
  const v5 = await versionOf(u);
  await tick();
  const back = await verifyIdentity(u, typed(u, "VOTER_CARD", (await kycOf(u)).idNumber!, { fullName: "Corrected Version Fixture" }));
  const v6 = await versionOf(u);
  ok("10.4b CONTROL · the corrected details are with an officer again (PENDING_REVIEW, a new version)", outcomeOf(back) === "routed" && v6 !== v5, J({ back, v5, v6 }));
  await audit({ category: "COMPLIANCE", action: "kyc.approve.recommended", actorId: OFFICER2, targetType: "User", targetId: u, payload: { version: v6 } });
  await auditFlush();
  const recNow = await getApprovalRecommendation(u, v6);
  const recOld = await getApprovalRecommendation(u, v5);
  const v7 = await resave();
  const recAfter = await getApprovalRecommendation(u, v7);
  ok("10.6 ⛔ a two-officer recommendation is bound to the EXACT version it was made on — any later write voids it",
    recNow?.officerId === OFFICER2 && recOld === null && recAfter === null, J({ recNow, recOld, recAfter }));
  await tick();
  const rv0 = await reviewKyc({ officerId: OFFICER, userId: u, decision: "APPROVE", mode: "typed", attestations: typedAll, version: v6 });
  ok("10.5 ⛔ reviewKyc APPROVE refuses a stale version — exactly, even one whose identity is unchanged",
    digest(v6) === digest(v7) && !rv0.ok && (await kycOf(u)).status === "PENDING_REVIEW", J(rv0));
  const rv1 = await reviewKyc({ officerId: OFFICER, userId: u, decision: "APPROVE", mode: "typed", attestations: typedAll, version: v7 });
  const k8 = await kycOf(u);
  ok("10.7 CONTROL · reviewKyc APPROVE accepts the current version — and the decision voids the recommendation",
    rv1.ok && k8.status === "APPROVED" && k8.reviewerId === OFFICER && (await getApprovalRecommendation(u, kycRowVersion(k8))) === null, J(rv1));
  const rj0 = await reviewKyc({ officerId: OFFICER, userId: u, decision: "REJECT", rejectCode: "DETAILS_MISMATCH", version: v7 });
  ok("10.8 ⛔ reviewKyc REJECT refuses a version whose identity changed (the status the officer saw)", !rj0.ok && (await kycOf(u)).status === "APPROVED", J(rj0));
  const v8 = kycRowVersion(k8);
  const v9 = await resave();
  const rj1 = await reviewKyc({ officerId: OFFICER, userId: u, decision: "REJECT", rejectCode: "DETAILS_MISMATCH", version: v8 });
  ok("10.9 CONTROL · …while a write that changes NO identity fact never voids a refusal: a token one re-save old lands",
    v8 !== v9 && rj1.ok && (await kycOf(u)).status === "REJECTED", J(rj1));
});

// ── §11 · the hold-lift rule, in the source ───────────────────────────────────────────────────────────────────────
await section("§11 · only an officer's approval lifts a hold, in the source", async () => {
  const svc = decomment(read("src/lib/server/kyc-service.ts"));
  const approve = fnBody(svc, "approveIdentity");
  const verify = fnBody(svc, "verifyIdentity");
  ok("11.0 CONTROL · approveIdentity and verifyIdentity were both found", approve.length > 400 && verify.length > 400, `${approve.length}/${verify.length}`);
  ok("11.1 ⛔ approveIdentity lifts a hold only behind `if (officer)`, and verifyIdentity never calls the lift",
    (approve.match(/liftStaleIdentityHoldAfterDecision\(/g) ?? []).length === 1 && /if \(officer\) await liftStaleIdentityHoldAfterDecision\(/.test(approve)
      && !/liftStaleIdentityHoldAfterDecision\(/.test(verify));
  ok("11.2 ⛔ verifyIdentity writes its decision under ONE submission lock", (verify.match(/underSubmissionLock</g) ?? []).length === 1);
});

// ── §12 · the review's fixes, each with a control beside it ───────────────────────────────────────────────────────
/** An officer act on this player's identity, written to the trail exactly as the services write theirs (target User). */
const trail = (action: string, actorId: string | null, u: string) =>
  audit({ category: action === "kyc.approved" ? "KYC" : "COMPLIANCE", action, actorId, targetType: "User", targetId: u, payload: { fixture: "kyc-typed-only" } });
/** Large withdrawals, AML-held transactions, a deposit burst — with the new-account points, a score of 80. */
async function riskUp(u: string): Promise<void> {
  const txn = (type: string, status: string, amount: number) => db.txn.create({
    id: `txn_${u}_${++seq}`, walletId: `wal_${u}`, userId: u, type, status, amount, fee: 0, taxWithheld: 0, balanceAfter: null, currency: "TZS",
    provider: "INTERNAL", providerRef: null, msisdn: null, description: null, positionId: null, amlReason: null,
    createdAt: now(), updatedAt: now(), completedAt: now(),
  } as StoredTxn);
  for (let i = 0; i < 3; i++) await txn("WITHDRAWAL", "CONFIRMED", -1_200_000);
  for (let i = 0; i < 2; i++) await txn("WITHDRAWAL", "AML_REVIEW", -2_000_000);
  for (let i = 0; i < 6; i++) await txn("DEPOSIT", "CONFIRMED", 10_000);
}

await section("§12 · R1.3 · officer provenance from the DURABLE trail, not only the row", async () => {
  // A row the OLD build restarted after an officer's refusal: IN_PROGRESS, `reviewerId` null — only the trail remembers.
  const u1 = await account("usr_kto_r13_trail");
  await startKyc(u1);
  await trail("kyc.rejected", OFFICER, u1);
  await auditFlush();
  ok("12.0 CONTROL · the row itself says nothing: IN_PROGRESS with no reviewer", (await kycOf(u1)).status === "IN_PROGRESS" && (await kycOf(u1)).reviewerId === null);
  const r1 = await verifyIdentity(u1, typed(u1, "VOTER_CARD", voter()));
  const k1 = await kycOf(u1);
  ok("12.1 ⛔ R1.3 · a durable officer refusal routes an IN_PROGRESS row with no reviewer — verifyIdentity sends it to an officer (OFFICER_PROVENANCE)",
    outcomeOf(r1) === "routed" && J(routesOf(r1)) === J(["OFFICER_PROVENANCE"]) && k1.status === "PENDING_REVIEW" && !k1.autoApprovedAt, J({ r1, status: k1.status }));

  // The workstation asks the same question of the same trail.
  const u1b = await account("usr_kto_r13_case");
  await kycRow(u1b, { status: "IN_PROGRESS", reviewerId: null, reviewedAt: null, submittedAt: null, approvedAt: null, autoApprovedAt: null });
  await trail("kyc.rejected", OFFICER, u1b);
  const u1c = await account("usr_kto_r13_case_clean");
  await kycRow(u1c, { status: "IN_PROGRESS", reviewerId: null, reviewedAt: null, submittedAt: null, approvedAt: null, autoApprovedAt: null });
  await auditFlush();
  const c1 = await readKycCaseChecks(u1b);
  const c0 = await readKycCaseChecks(u1c);
  ok("12.2 ⛔ R1.3 · …and the workstation's checks (readKycCaseChecks) show the same OFFICER_PROVENANCE route",
    !!c1 && c1.decision.routes.includes("OFFICER_PROVENANCE"), J(c1?.decision.routes));
  ok("12.2b CONTROL · the same row with no officer act on the trail shows no provenance route", !!c0 && !c0.decision.routes.includes("OFFICER_PROVENANCE"), J(c0?.decision.routes));

  // An officer's LATER approval settles it; the machine's does not.
  const u2 = await account("usr_kto_r13_cleared");
  await startKyc(u2);
  await trail("kyc.rejected", OFFICER, u2);
  await tick();
  await trail("kyc.approved", OFFICER2, u2);
  await auditFlush();
  const r2 = await verifyIdentity(u2, typed(u2, "VOTER_CARD", voter()));
  ok("12.3 CONTROL · an officer's later kyc.approved clears it — the next identity is approved at once", outcomeOf(r2) === "approved", J(r2));
  const u3 = await account("usr_kto_r13_machine");
  await startKyc(u3);
  await trail("kyc.rejected", OFFICER, u3);
  await tick();
  await trail("kyc.approved", null, u3);
  await trail("kyc.approved", "system", u3);
  await auditFlush();
  const r3 = await verifyIdentity(u3, typed(u3, "VOTER_CARD", voter()));
  ok("12.4 ⛔ …while an automatic (null-actor) or system kyc.approved after the refusal does NOT clear it — still routed",
    outcomeOf(r3) === "routed" && J(routesOf(r3)) === J(["OFFICER_PROVENANCE"]), J(r3));
});

await section("§12 · R1.4 · an AML escalation is found however busy the trail is", async () => {
  const u = await account("usr_kto_r14_busy");
  await trail("kyc.escalated_to_aml", OFFICER, u);
  for (let i = 0; i < 600; i++) {
    await audit({ category: "WALLET", action: "wallet.fixture_noise", actorId: u, targetType: "User", targetId: u, payload: { i } });
  }
  await auditFlush();
  const r = await verifyIdentity(u, typed(u, "VOTER_CARD", voter()));
  ok("12.5 ⛔ R1.4 · an AML escalation followed by 600 newer audits on the same player still routes AML_ESCALATION",
    outcomeOf(r) === "routed" && J(routesOf(r)) === J(["AML_ESCALATION"]), J(r));
  const c = await account("usr_kto_r14_noise_only");
  for (let i = 0; i < 600; i++) {
    await audit({ category: "WALLET", action: "wallet.fixture_noise", actorId: c, targetType: "User", targetId: c, payload: { i } });
  }
  await auditFlush();
  const rc = await verifyIdentity(c, typed(c, "VOTER_CARD", voter()));
  ok("12.6 CONTROL · 600 audits and no escalation route nothing — approved at once", outcomeOf(rc) === "approved", J(rc));
});

await section("§12 · R1.2 / R1.1 · refusing an unchecked automatic approval holds the wallet", async () => {
  const freeze = { alsoFreeze: true, freezeReason: "Refused identity — the wallet is held while it is fixed" };
  {
    const u = await account("usr_kto_r12_nofreeze");
    await verifyIdentity(u, typed(u, "VOTER_CARD", voter()));
    const bare = await reviewKyc({ officerId: OFFICER, userId: u, decision: "REJECT", rejectCode: "DETAILS_MISMATCH", version: await versionOf(u) });
    const w0 = await db.wallet.findByUserId(u);
    ok("12.7 ⛔ R1.2 · a recoverable refusal of an unchecked automatic approval is refused without the wallet freeze — nothing recorded",
      !bare.ok && (await kycOf(u)).status === "APPROVED" && w0?.status === "ACTIVE", J({ bare, status: (await kycOf(u)).status, wallet: w0?.status }));
    const held = await reviewKyc({ officerId: OFFICER, userId: u, decision: "REJECT", rejectCode: "DETAILS_MISMATCH", version: await versionOf(u), ...freeze });
    const w1 = await db.wallet.findByUserId(u);
    ok("12.8 CONTROL · …with the freeze it lands: REJECTED, and the wallet FROZEN by the officer's hold",
      held.ok && (await kycOf(u)).status === "REJECTED" && w1?.status === "FROZEN" && (w1?.freezeReasons ?? []).includes("OFFICER"), J({ held, wallet: [w1?.status, w1?.freezeReasons] }));
  }
  {
    const u = await account("usr_kto_r12_final");
    await verifyIdentity(u, typed(u, "VOTER_CARD", voter()));
    const fin = await reviewKyc({ officerId: OFFICER, userId: u, decision: "REJECT", rejectCode: "DUPLICATE_IDENTITY", version: await versionOf(u) });
    const w = await db.wallet.findByUserId(u);
    ok("12.9 CONTROL · a FINAL code needs no officer's freeze — it holds the wallet itself (IDENTITY_REFUSED)",
      fin.ok && (await kycOf(u)).rejectReason === "DUPLICATE_IDENTITY" && (w?.freezeReasons ?? []).includes("IDENTITY_REFUSED"), J({ fin, wallet: w?.freezeReasons }));
  }
  {
    const u = await account("usr_kto_r12_checked");
    await verifyIdentity(u, typed(u, "VOTER_CARD", voter()));
    await markPostChecked(OFFICER, u, { version: await versionOf(u), attestations: typedAll });
    const rj = await reviewKyc({ officerId: OFFICER, userId: u, decision: "REJECT", rejectCode: "DETAILS_MISMATCH", version: await versionOf(u) });
    ok("12.10 CONTROL · once an officer has CHECKED the automatic approval, a recoverable refusal needs no freeze",
      !!(await kycOf(u)).postCheckedAt && rj.ok && (await kycOf(u)).status === "REJECTED", J(rj));
  }
  {
    const u = await account("usr_kto_r11_corrections");
    await verifyIdentity(u, typed(u, "VOTER_CARD", voter()));
    await askForCorrections(OFFICER, u, { note: "Please give your name exactly as on the card.", version: await versionOf(u) });
    const bare = await reviewKyc({ officerId: OFFICER2, userId: u, decision: "REJECT", rejectCode: "OTHER", reason: "The player never corrected the name.", version: await versionOf(u) });
    const held = await reviewKyc({ officerId: OFFICER2, userId: u, decision: "REJECT", rejectCode: "OTHER", reason: "The player never corrected the name.", version: await versionOf(u), ...freeze });
    ok("12.11 ⭐ R1.1 · a refusal from ADDITIONAL_INFO_REQUIRED lands — and, the approval being unchecked, only with the freeze",
      !bare.ok && held.ok && (await kycOf(u)).status === "REJECTED", J({ bare, held }));
  }
});

await section("§12 · R1.5 · the agent approval decides only a plain photo case", async () => {
  process.env.EMAIL_OUTBOX_CAPTURE = "1";
  /** An invitee whose own photo case is with our team and whose application is under review — through the real services. */
  async function invitee(tag: string): Promise<{ u: string; appId: string }> {
    const email = `${tag}@kto.tz`;
    const u = await account(`usr_kto_${tag}`, { email });
    const inv = await AGENT.issueInvitation(OFFICER, { email });
    if (!inv.ok) throw new Error(`invite ${tag}: ${J(inv)}`);
    clearEmailOutbox();
    await AGENT.requestInvitationOtp(inv.data!.token);
    const mail = emailOutbox().filter((m) => m.to.toLowerCase() === email).pop();
    const code = (mail?.html.match(/>([0-9]{6})</) ?? mail?.html.match(/(?:^|[^0-9])([0-9]{6})(?:[^0-9]|$)/))?.[1] ?? "";
    const acc = await AGENT.acceptInvitation(u, inv.data!.token, code);
    if (!acc.ok) throw new Error(`accept ${tag}: ${J(acc)}`);
    const id = await submitIdentityStep(u, typed(u, "VOTER_CARD", voter()));
    for (const slot of ["VOTER_CARD", "SELFIE"]) {
      const a = await attachDocument(u, slot as never, PNG);
      if (!a.ok) throw new Error(`attach ${slot} ${tag}: ${J(a)}`);
    }
    const sent = await submitForReview(u);
    if (!id.ok || !sent.ok) throw new Error(`photo case ${tag}: ${J({ id, sent })}`);
    for (const slot of AGENT.REQUIRED_DOC_SLOTS) {
      const r = await AGENT.attachAgentDocument(u, slot, PNG);
      if (!r.ok) throw new Error(`agent doc ${slot} ${tag}: ${J(r)}`);
    }
    await AGENT.setReferees(u, { oneName: "Amina Juma", oneContact: "+255711000001", twoName: "Baraka Kweka", twoContact: "+255711000002", consent: true });
    await AGENT.waiveFee(OFFICER, acc.data!.applicationId, "waived for the typed-only guard's invitee fixture");
    const sub = await AGENT.submitForReview(u, { acceptedTermsVersion: AGENT_TERMS_VERSION });
    if (!sub.ok) throw new Error(`agent submit ${tag}: ${J(sub)}`);
    return { u, appId: acc.data!.applicationId };
  }
  const refusedFor = (appId: string) => getAuditForTarget("AgentApplication", appId, 100).find((e) => e.action === "agent.approve.refused");
  try {
    const cases: Array<[string, string, (u: string) => Promise<unknown>]> = [
      ["r15_risk", "HIGH_RISK", (u) => riskUp(u)],
      ["r15_held", "WALLET_HOLD", (u) => freezeWalletByOfficer(OFFICER2, u, "Held while the agent case is looked at")],
      ["r15_prov", "OFFICER_PROVENANCE", (u) => trail("kyc.rejected", OFFICER2, u)],
    ];
    for (const [tag, route, plant] of cases) {
      const { u, appId } = await invitee(tag);
      ok(`12.12.${route} CONTROL · the invitee's photo case is with our team before the approval`, photoCaseSent(await kycOf(u)));
      await plant(u);
      await auditFlush();
      const r = await AGENT.approveAgent(OFFICER, appId, { commissionPct: 20 });
      await auditFlush();
      const k = await kycOf(u);
      const why = String((refusedFor(appId)?.payload as { why?: string } | undefined)?.why ?? "");
      ok(`12.12.${route} ⛔ R1.5 · approveAgent refuses an invitee photo case routed ${route} — no photo stamp, no agent`,
        !r.ok && why.includes(route) && k.status === "PENDING_REVIEW" && !k.photoVerifiedAt && !(await db.affiliate.findByUserId(u))?.approvedAt,
        J({ r, why, status: k.status, photo: k.photoVerifiedAt }));
    }
    const { u, appId } = await invitee("r15_plain");
    const r = await AGENT.approveAgent(OFFICER, appId, { commissionPct: 20 });
    await auditFlush();
    const k = await kycOf(u);
    const approvedAudit = getAuditForTarget("User", u, 200).find((e) => e.action === "kyc.approved");
    const p = (approvedAudit?.payload ?? {}) as { attestationSet?: unknown; via?: string };
    ok("12.13 CONTROL · a PLAIN invitee photo case is approved through the agent approval — stamped, and recorded with attestationSet null",
      r.ok && !!k.photoVerifiedAt && photoIdentityVerified(k) && approvedAudit?.actorId === OFFICER && p.via === "agent_approval" && "attestationSet" in p && p.attestationSet === null,
      J({ r, photo: k.photoVerifiedAt, audit: approvedAudit?.payload }));
  } finally {
    clearEmailOutbox();
    delete process.env.EMAIL_OUTBOX_CAPTURE;
  }
});

await section("§12 · R2.4 · both DSAR doors release the same, subject-only KYC view", async () => {
  const u = await account("usr_kto_r24_dsar");
  const t = now();
  const priorNumber = voter();
  await kycRow(u, {
    autoFlags: ["SAME_PERSON"], postCheckedAt: t, postCheckedById: OFFICER, reviewerId: OFFICER,
    priorIdentities: [{
      idType: "VOTER_CARD", idNumber: priorNumber, idExpiry: null, fullName: "Dsar Fixture Before", dob: ACCOUNT_DOB,
      idFingerprint: "f".repeat(64), status: "APPROVED", approvedAt: t, reviewerId: OFFICER, cause: "correction", supersededAt: t,
    }],
  });
  const raw = await kycOf(u);
  const own = (await exportUserData(u)).kyc as Record<string, unknown> | null;
  const bundle = (await buildDsarBundle(u))?.kyc as Record<string, unknown> | null | undefined;
  const STRIPPED = ["autoFlags", "postCheckedAt", "postCheckedById", "reviewerId"];
  const priorsOf = (v: Record<string, unknown> | null | undefined) => (Array.isArray(v?.priorIdentities) ? v!.priorIdentities as Record<string, unknown>[] : []);
  ok("12.14b CONTROL · the raw row DOES carry every stripped field (else the absences below are vacuous)",
    STRIPPED.every((f) => (raw as Record<string, unknown>)[f] != null) && !!(raw.priorIdentities ?? [])[0]?.reviewerId);
  ok("12.14 ⛔ R2.4 · neither door's kyc carries autoFlags, postCheckedAt, postCheckedById or reviewerId; no prior identity carries reviewerId or idFingerprint",
    !!own && !!bundle && [own, bundle].every((v) => STRIPPED.every((f) => !(f in v!)) && priorsOf(v).length === 1 && priorsOf(v).every((pe) => !("reviewerId" in pe) && !("idFingerprint" in pe))),
    J({ own: own && Object.keys(own), bundle: bundle && Object.keys(bundle) }));
  ok("12.15 ⛔ R2.4 · …and the two doors' kyc are deep-equal", J(own) === J(bundle));
  ok("12.15b CONTROL · the subject's own data stays: the number, the name and the prior identity's details",
    own?.idNumber === raw.idNumber && own?.fullName === raw.fullName && priorsOf(own)[0]?.idNumber === priorNumber && priorsOf(own)[0]?.fullName === "Dsar Fixture Before");
});

await section("§12 · R2.3 · erasure reaches every prior identity", async () => {
  const u = await account("usr_kto_r23_erase", { status: "CLOSED", closedAt: now() });
  const t = now();
  const n0 = voter(), n1 = voter(), n2 = voter();
  await kycRow(u, {
    idNumber: n0, fullName: "Erasure Fixture Now",
    priorIdentities: [
      { idType: "VOTER_CARD", idNumber: n1, idExpiry: null, fullName: "Erasure Fixture First", dob: ACCOUNT_DOB, idFingerprint: null, status: "APPROVED", approvedAt: t, reviewerId: null, cause: "restart", supersededAt: t },
      { idType: "VOTER_CARD", idNumber: n2, idExpiry: null, fullName: "Erasure Fixture Second", dob: ACCOUNT_DOB, idFingerprint: identityFingerprint("VOTER_CARD", n2), status: "ADDITIONAL_INFO_REQUIRED", approvedAt: t, reviewerId: OFFICER, cause: "correction", supersededAt: t },
    ],
  });
  const before = J(await kycOf(u));
  ok("12.16b CONTROL · before erasure the row holds all three raw numbers", [n0, n1, n2].every((n) => before.includes(n)));
  const first = await anonymizeClosedAccount(u);
  const after = await kycOf(u);
  const priors = after.priorIdentities ?? [];
  ok('12.16 ⛔ R2.3 · every prior identity: number = its fingerprint (64 hex), name "Erased <fp12>", date of birth removed',
    first.ok && priors.length === 2 && priors.every((pe) => /^[0-9a-f]{64}$/.test(String(pe.idNumber)) && pe.idNumber === pe.idFingerprint
      && pe.fullName === `Erased ${String(pe.idFingerprint).slice(0, 12)}` && pe.dob === null)
      && priors[0].idFingerprint === identityFingerprint("VOTER_CARD", n1),
    J({ first: first.ok, priors }));
  ok("12.17 ⛔ …and no raw number remains anywhere in the row", ![n0, n1, n2].some((n) => J(after).includes(n)), J(after).slice(0, 200));
  const second = await anonymizeClosedAccount(u);
  ok("12.18 a second run is a no-op on the history (same entries, nothing hashed again)",
    second.ok && J((await kycOf(u)).priorIdentities) === J(priors) && (second as { counts?: { idNumbersHashed?: number } }).counts?.idNumbersHashed === 0, J(second));
});

await section("§12 · R4.4 · a re-opened final refusal gets its own notice", async () => {
  const u = await account("usr_kto_r44_reopen");
  await verifyIdentity(u, typed(u, "VOTER_CARD", voter()));
  await reviewKyc({ officerId: OFFICER, userId: u, decision: "REJECT", rejectCode: "UNDERAGE", version: await versionOf(u) });
  await tick();
  const re = await reopenFinalRefusal(OFFICER2, u, "The account date of birth was mistyped at sign-up and has been corrected.");
  await tick();
  const kycNotices = (await db.notification.findByUser(u, 100)).filter((n: { kind?: string }) => n.kind === "KYC") as Array<{ titleEn?: string }>;
  const w = await db.wallet.findByUserId(u);
  ok("12.19 ⭐ R4.4 · after reopenFinalRefusal the newest KYC notice says the player can verify again — not the corrections notice",
    re.ok && kycNotices[0]?.titleEn === "You can verify your identity again" && !kycNotices.some((n) => n.titleEn === "Please check your details"),
    J({ re, titles: kycNotices.map((n) => n.titleEn) }));
  // ⭐ 2026-10-10 (review R5.1b): this identity's approval was the MACHINE's alone and no officer had checked it, so the
  // re-open restarts it but KEEPS the identity hold — §13 proves the rule and its control (an officer-checked approval).
  ok("12.19b CONTROL · the refusal really was final first; the re-open restarted it — and, the approval being the machine's alone, kept its hold",
    (await kycOf(u)).status === "IN_PROGRESS" && (w?.freezeReasons ?? []).includes("IDENTITY_REFUSED") && kycNotices.length >= 2,
    J({ status: (await kycOf(u)).status, holds: w?.freezeReasons }));
});

await section("§12 · R2.10 · an approval survives a failing account write", async () => {
  const u = await account("usr_kto_r210_update", { status: "PENDING_KYC", dob: null });
  const userApi = db.user as unknown as { update: (...args: unknown[]) => unknown };
  const orig = userApi.update;
  let calls = 0;
  userApi.update = (async () => { calls++; throw new Error("fixture: the account write fails"); }) as never;
  let r: unknown;
  try { r = await verifyIdentity(u, typed(u, "VOTER_CARD", voter(), { dob: "1991-04-05" })); } finally { userApi.update = orig; }
  await auditFlush();
  const k = await kycOf(u);
  const approvedAudit = getAuditForTarget("User", u, 100).find((e) => e.action === "kyc.approved");
  ok("12.20b CONTROL · the account write really was attempted and failed (the legacy label and the typed date)", calls >= 1 && (await db.user.findById(u))?.status === "PENDING_KYC", `calls=${calls}`);
  ok("12.20 ⛔ R2.10 · with every account write failing, the identity is still APPROVED and kyc.approved is on record",
    outcomeOf(r) === "approved" && k.status === "APPROVED" && !!approvedAudit, J({ r, status: k.status, audit: !!approvedAudit }));
});

await section("§12 · the attach rate limit has its own bucket and its own rule", async () => {
  // ⭐ ITS OWN RULE since review R5.5 (`kyc.attach`, 12 at once, then 3 a minute): the `kyc.submit` rule it borrowed let a
  // NIDA's three photos be retaken twice in all, then one photo every two minutes.
  const u = await account("usr_kto_attach_limit");
  await startKyc(u);
  const results: Array<{ ok: boolean; code?: string; retryAfterSec?: number }> = [];
  for (let i = 0; i < 13; i++) results.push(await attachDocument(u, "SELFIE", PNG) as never);
  const thirteenth = results[12];
  ok("12.21b CONTROL · the first twelve quick attaches land (a set and its retakes — the borrowed rule refused the sixth)", results.slice(0, 12).every((x) => x.ok), J(results.slice(0, 12)));
  ok("12.21 ⛔ R5.5 · the 13th quick attach is RATE_LIMITED, with a retryAfterSec", !thirteenth.ok && thirteenth.code === "RATE_LIMITED" && (thirteenth.retryAfterSec ?? 0) > 0, J(thirteenth));
  const r = await verifyIdentity(u, typed(u, "VOTER_CARD", voter()));
  ok("12.22 CONTROL · …and the identity press is unaffected: its own bucket, verified at once", outcomeOf(r) === "approved", J(r));

  // ⭐ ONLY AN ATTACH THAT LANDS SPENDS ITS TOKEN (R5.5). A real failed upload: an R2 store asked for and not configured
  // refuses to fall back (`assertStorageModeIntended`), so `putKycDocument` throws after the token was taken.
  const f = await account("usr_kto_attach_refund");
  await startKyc(f);
  const first: Array<{ ok: boolean }> = [];
  for (let i = 0; i < 11; i++) first.push(await attachDocument(f, "SELFIE", PNG) as never);
  const savedStorage = process.env.KYC_STORAGE;
  const savedBucket = process.env.R2_BUCKET;
  process.env.KYC_STORAGE = "r2";
  delete process.env.R2_BUCKET;
  let threw = "";
  try { await attachDocument(f, "SELFIE", PNG); } catch (err) { threw = String((err as Error)?.message ?? err); } finally {
    if (savedStorage === undefined) delete process.env.KYC_STORAGE; else process.env.KYC_STORAGE = savedStorage;
    if (savedBucket !== undefined) process.env.R2_BUCKET = savedBucket;
  }
  ok("12.23 CONTROL · eleven quick attaches landed, and the twelfth's upload really failed (R2 asked for, not configured)",
    first.every((x) => x.ok) && /R2_BUCKET/.test(threw), J({ first: first.length, threw: threw.slice(0, 80) }));
  const twelfth = await attachDocument(f, "SELFIE", PNG) as { ok: boolean; code?: string };
  const after = await attachDocument(f, "SELFIE", PNG) as { ok: boolean; code?: string };
  ok("12.24 ⛔ R5.5 · the failed upload handed its token back: one more attach lands, and the one after is RATE_LIMITED",
    twelfth.ok && !after.ok && after.code === "RATE_LIMITED", J({ twelfth, after }));
});

// ── §13 · the second review's fixes (R5, 2026-10-10), each with a control beside it ────────────────────────────────
/** A typed AUTOMATIC approval that then sent its document photos (the agent upgrade): PENDING_REVIEW, the approval intact. */
async function autoThenPhotos(u: string): Promise<void> {
  const r = await verifyIdentity(u, typed(u, "VOTER_CARD", voter()));
  if (outcomeOf(r) !== "approved") throw new Error(`automatic approval ${u}: ${J(r)}`);
  for (const slot of ["VOTER_CARD", "SELFIE"]) {
    const a = await attachDocument(u, slot as never, PNG);
    if (!a.ok) throw new Error(`attach ${slot} ${u}: ${J(a)}`);
  }
  const s = await submitForReview(u);
  if (!s.ok) throw new Error(`photo send ${u}: ${J(s)}`);
}
/** The player's KYC bell rows, newest first — after the fire-and-forget notices of the last call have landed. */
async function kycNoticesOf(u: string, atLeast: number): Promise<Array<{ titleEn?: string }>> {
  let rows: Array<{ titleEn?: string }> = [];
  for (let i = 0; i < 25; i++) {
    rows = (await db.notification.findByUser(u, 100)).filter((n: { kind?: string }) => n.kind === "KYC") as Array<{ titleEn?: string }>;
    if (rows.length >= atLeast) break;
    await tick();
  }
  return rows;
}
const inList = async (u: string) => (await db.kyc.listUncheckedAutoApprovals()).find((x: { userId: string }) => x.userId === u) as { status?: string } | undefined;
const FREEZE13 = { alsoFreeze: true, freezeReason: "Refused identity — the wallet is held while it is fixed" };

await section("§13 · R5.1 · refusing an unchecked automatic approval holds the wallet in EVERY status it can be refused from", async () => {
  ok("13.0a CONTROL · the shared predicate asks no status — and not one an officer checked, nor one the machine never made",
    uncheckedAutomaticApproval({ approvedAt: now(), autoApprovedAt: now(), postCheckedAt: null })
      && !uncheckedAutomaticApproval({ approvedAt: now(), autoApprovedAt: now(), postCheckedAt: now() })
      && !uncheckedAutomaticApproval({ approvedAt: now(), autoApprovedAt: null, postCheckedAt: null }));
  // (a) a typed-verified player's agent photo send
  {
    const u = await account("usr_kto_r51_photos");
    await autoThenPhotos(u);
    const k = await kycOf(u);
    ok("13.0 CONTROL · the photo send moved the automatic approval to PENDING_REVIEW with approvedAt and autoApprovedAt intact (withdrawals open)",
      k.status === "PENDING_REVIEW" && uncheckedAutomaticApproval(k) && approvedEver(k) && !k.photoVerifiedAt, J({ status: k.status, auto: k.autoApprovedAt, approvedAt: k.approvedAt }));
    const listed = await inList(u);
    ok("13.1 ⭐ R5.1c · …it stays on the officers' post-check list, carrying its status (PENDING_REVIEW)", listed?.status === "PENDING_REVIEW", J(listed ?? null));
    const bare = await reviewKyc({ officerId: OFFICER, userId: u, decision: "REJECT", rejectCode: "DETAILS_MISMATCH", version: await versionOf(u) });
    const w0 = await db.wallet.findByUserId(u);
    ok("13.2 ⛔ R5.1a · a recoverable refusal of it in PENDING_REVIEW is refused WITHOUT the freeze — nothing recorded, the money untouched",
      !bare.ok && (await kycOf(u)).status === "PENDING_REVIEW" && w0?.status === "ACTIVE", J({ bare, status: (await kycOf(u)).status, wallet: w0?.status }));
    const held = await reviewKyc({ officerId: OFFICER, userId: u, decision: "REJECT", rejectCode: "DETAILS_MISMATCH", version: await versionOf(u), ...FREEZE13 });
    const w1 = await db.wallet.findByUserId(u);
    ok("13.3 CONTROL · …WITH the freeze it lands: REJECTED, the wallet FROZEN by the officer's hold",
      held.ok && (await kycOf(u)).status === "REJECTED" && w1?.status === "FROZEN" && (w1?.freezeReasons ?? []).includes("OFFICER"), J({ held, wallet: [w1?.status, w1?.freezeReasons] }));
    ok("13.3b R5.1c · …and a refused row leaves the post-check list (a refusal decided it)", !(await inList(u)));
  }
  {
    const u = await account("usr_kto_r51_final");
    await autoThenPhotos(u);
    const fin = await reviewKyc({ officerId: OFFICER, userId: u, decision: "REJECT", rejectCode: "SANCTIONED", version: await versionOf(u) });
    const w = await db.wallet.findByUserId(u);
    ok("13.4 CONTROL · a FINAL code from PENDING_REVIEW needs no tick — it freezes the wallet itself (IDENTITY_REFUSED)",
      fin.ok && (await kycOf(u)).rejectReason === "SANCTIONED" && (w?.freezeReasons ?? []).includes("IDENTITY_REFUSED"), J({ fin, holds: w?.freezeReasons }));
  }
  // (b) the officer's own post-check path: corrections asked, and the corrected send routed on the officer's provenance
  {
    const u = await account("usr_kto_r51_corrected");
    const n = voter();
    await verifyIdentity(u, typed(u, "VOTER_CARD", n));
    const asked = await askForCorrections(OFFICER, u, { note: "Please give your name exactly as on the card.", version: await versionOf(u) });
    const air = await inList(u);
    ok("13.5 ⭐ R5.1c · corrections asked of it: still on the post-check list, as ADDITIONAL_INFO_REQUIRED", asked.ok && air?.status === "ADDITIONAL_INFO_REQUIRED", J({ asked, air: air ?? null }));
    const back = await verifyIdentity(u, typed(u, "VOTER_CARD", n, { fullName: "Corrected Routed Fixture" }));
    const k = await kycOf(u);
    ok("13.6 CONTROL · the corrected send is routed to an officer (PENDING_REVIEW), the machine's approval intact",
      outcomeOf(back) === "routed" && k.status === "PENDING_REVIEW" && uncheckedAutomaticApproval(k), J({ back, status: k.status }));
    const bare = await reviewKyc({ officerId: OFFICER2, userId: u, decision: "REJECT", rejectCode: "OTHER", reason: "The corrected name still does not match.", version: await versionOf(u) });
    ok("13.7 ⛔ R5.1a · …and refusing it without the freeze is refused", !bare.ok && (await kycOf(u)).status === "PENDING_REVIEW", J(bare));
  }
  // (c) an officer's correction of the date of birth — and its own notice (R5.10)
  {
    const u = await account("usr_kto_r51_dob");
    await verifyIdentity(u, typed(u, "VOTER_CARD", voter()));
    const c = await SVC.correctDateOfBirth(OFFICER, u, { dob: "1990-02-02", reason: "The sign-up date was mistyped by one day.", version: await versionOf(u) });
    const k = await kycOf(u);
    ok("13.8 CONTROL · a corrected date of birth sends the automatic approval to an officer (PENDING_REVIEW), the approval intact",
      c.ok && k.status === "PENDING_REVIEW" && uncheckedAutomaticApproval(k), J({ c, status: k.status }));
    const bare = await reviewKyc({ officerId: OFFICER2, userId: u, decision: "REJECT", rejectCode: "DETAILS_MISMATCH", version: await versionOf(u) });
    ok("13.9 ⛔ R5.1a · …and refusing it without the freeze is refused", !bare.ok && (await kycOf(u)).status === "PENDING_REVIEW", J(bare));
    const notices = await kycNoticesOf(u, 2);
    ok("13.10 ⭐ R5.10 · the player is told their date of birth was updated — never 'Identity details received' (they sent nothing)",
      notices.some((x) => x.titleEn === "Your date of birth was updated") && !notices.some((x) => x.titleEn === "Identity details received"), J(notices.map((x) => x.titleEn)));
  }
  {
    const u = await account("usr_kto_r510_routed");
    await audit({ category: "COMPLIANCE", action: "kyc.escalated_to_aml", actorId: OFFICER, targetType: "User", targetId: u, payload: { note: "routes the case to an officer" } });
    await auditFlush();
    const r = await verifyIdentity(u, typed(u, "VOTER_CARD", voter()));
    const notices = await kycNoticesOf(u, 1);
    ok("13.10b CONTROL · …while a routed typed SEND is still told 'Identity details received'",
      outcomeOf(r) === "routed" && notices.some((x) => x.titleEn === "Identity details received"), J({ r, titles: notices.map((x) => x.titleEn) }));
  }
  {
    const page = decomment(read("src/app/admin/kyc/[id]/page.tsx"));
    const svc = decomment(read("src/lib/server/kyc-service.ts"));
    ok("13.11 ⛔ R5.1a · the workstation's freezeOnReject IS the shared predicate — no status test of its own",
      /const freezeOnReject = uncheckedAutomaticApproval\(kyc\);/.test(page));
    ok("13.11b ⛔ R5.1a · …and the service imports it rather than keeping a copy that asks a status",
      !/function uncheckedAutomaticApproval\(/.test(svc) && /import \{ uncheckedAutomaticApproval \} from "@\/lib\/kyc-approval";/.test(svc));
  }
});

await section("§13 · R5.1b · re-opening a final refusal of an approval only the machine made keeps the identity hold", async () => {
  const WHY = "The duplicate match was a data-entry error on the other account.";
  const holdsOf = async (u: string) => { const w = await db.wallet.findByUserId(u); return { status: w?.status, reasons: w?.freezeReasons ?? [] }; };
  const reopenPayload = (u: string) => (getAuditForTarget("User", u, 200).find((e) => e.action === "kyc.refusal_reopened")?.payload ?? null) as { holdKept?: unknown } | null;
  {
    const u = await account("usr_kto_r51b_machine");
    await verifyIdentity(u, typed(u, "VOTER_CARD", voter()));
    const fin = await reviewKyc({ officerId: OFFICER, userId: u, decision: "REJECT", rejectCode: "DUPLICATE_IDENTITY", version: await versionOf(u) });
    await tick();
    const re = await reopenFinalRefusal(OFFICER2, u, WHY);
    await auditFlush();
    const k = await kycOf(u);
    const h = await holdsOf(u);
    ok("13.12 CONTROL · an UNCHECKED automatic approval, finally refused, then re-opened: IN_PROGRESS, its approvedAt kept",
      fin.ok && re.ok && k.status === "IN_PROGRESS" && !!k.approvedAt, J({ fin, re, status: k.status }));
    ok("13.13 ⛔ R5.1b · …and the IDENTITY_REFUSED hold is KEPT: the machine's approvedAt opens no withdrawal", h.status === "FROZEN" && h.reasons.includes("IDENTITY_REFUSED"), J(h));
    ok("13.14 ⛔ R5.1b · …the re-open's audit row says so, and the re-opened row keeps the approval's machine provenance (off the list while nothing is sent)",
      reopenPayload(u)?.holdKept === "unchecked_automatic_approval" && uncheckedAutomaticApproval(k) && !(await inList(u)), J({ payload: reopenPayload(u), auto: k.autoApprovedAt }));
    const r = await verifyIdentity(u, typed(u, "VOTER_CARD", voter()));
    ok("13.15 ⛔ R5.1b · the next press is ROUTED — the kept hold (WALLET_HOLD) and the re-opening officer (OFFICER_PROVENANCE) — never approved",
      outcomeOf(r) === "routed" && routesOf(r).includes("WALLET_HOLD") && routesOf(r).includes("OFFICER_PROVENANCE"), J(r));
    const ask = await askForCorrections(OFFICER, u, { note: "Please give your name exactly as on the card.", version: await versionOf(u) });
    const h2 = await holdsOf(u);
    ok("13.16 ⛔ R5.1b · corrections asked of that case lift NOTHING — only an officer's approval of the identity does",
      ask.ok && h2.status === "FROZEN" && h2.reasons.includes("IDENTITY_REFUSED"), J({ ask, h2 }));
    const fixed = await verifyIdentity(u, typed(u, "VOTER_CARD", (await kycOf(u)).idNumber!, { fullName: "Reopened Corrected Fixture" }));
    const ap = await reviewKyc({ officerId: OFFICER2, userId: u, decision: "APPROVE", mode: "typed", attestations: typedAll, version: await versionOf(u) });
    const h3 = await holdsOf(u);
    const k3 = await kycOf(u);
    ok("13.17 CONTROL · …the officer's approval of the corrected send lifts it (ACTIVE), and is the post-check it records",
      outcomeOf(fixed) === "routed" && ap.ok && h3.status === "ACTIVE" && !!k3.postCheckedAt && k3.postCheckedById === OFFICER2, J({ fixed, ap, h3 }));
  }
  {
    const u = await account("usr_kto_r51b_checked");
    await verifyIdentity(u, typed(u, "VOTER_CARD", voter()));
    const mc = await markPostChecked(OFFICER, u, { version: await versionOf(u), attestations: typedAll });
    const fin = await reviewKyc({ officerId: OFFICER, userId: u, decision: "REJECT", rejectCode: "DUPLICATE_IDENTITY", version: await versionOf(u) });
    await tick();
    const re = await reopenFinalRefusal(OFFICER2, u, WHY);
    await auditFlush();
    const h = await holdsOf(u);
    ok("13.18 CONTROL · an automatic approval an officer CHECKED keeps today's re-open: the hold is lifted (ACTIVE), holdKept null",
      mc.ok && fin.ok && re.ok && h.status === "ACTIVE" && reopenPayload(u)?.holdKept === null, J({ mc, fin, re, h, payload: reopenPayload(u) }));
  }
});

await section("§13 · R5.2 · an officer's photo stamp counts only over photos uploaded no later than it", async () => {
  const STAMP = "2026-10-10T08:00:00.000Z";
  const EARLY = "2026-10-10T07:00:00.000Z";
  const LATE = "2026-10-10T08:00:01.000Z";
  const set = (front: string, back = front, selfie = front) => [
    { docType: "NIDA_FRONT", uploadedAt: front }, { docType: "NIDA_BACK", uploadedAt: back }, { docType: "SELFIE", uploadedAt: selfie },
  ];
  const facts = (documents: Array<{ docType: string; uploadedAt?: string }>) => ({ status: "APPROVED", photoVerifiedAt: STAMP, idType: "NIDA", documents });
  ok("13.20 CONTROL · photos uploaded BEFORE the stamp, or at its very instant, satisfy it", photoIdentityVerified(facts(set(EARLY))) && photoIdentityVerified(facts(set(STAMP))));
  ok("13.21 ⛔ R5.2 · the same set uploaded AFTER the stamp never satisfies it", !photoIdentityVerified(facts(set(LATE))));
  ok("13.21b ⛔ R5.2 · …nor does ONE late image in an early set, nor an image with no upload time",
    !photoIdentityVerified(facts(set(EARLY, EARLY, LATE)))
      && !photoIdentityVerified(facts([{ docType: "NIDA_FRONT", uploadedAt: EARLY }, { docType: "NIDA_BACK", uploadedAt: EARLY }, { docType: "SELFIE" }])));
  // Through the service: a STRAY stamp on an automatic approval (the backfill run again), then the player's own photos.
  const u = await account("usr_kto_r52_stray");
  await verifyIdentity(u, typed(u, "VOTER_CARD", voter()));
  const auto = await kycOf(u);
  await db.kyc.upsert({ ...auto, photoVerifiedAt: auto.approvedAt, updatedAt: now() });
  await tick();
  const a1 = await attachDocument(u, "VOTER_CARD", PNG);
  const a2 = await attachDocument(u, "SELFIE", PNG);
  const k = await kycOf(u);
  const e = await applicantEligibility(u);
  ok("13.22 ⛔ R5.2 · photos uploaded AFTER a stray stamp never satisfy the agent gate (and the stamp locked nothing: they attached)",
    !!k.photoVerifiedAt && a1.ok && a2.ok && !photoIdentityVerified(k) && !e.ok && e.refusal === "kyc_required", J({ a1, a2, e }));
  const s = await submitForReview(u);
  const sent = await kycOf(u);
  ok("13.23 ⛔ R5.2 · …and the send is not short-circuited as 'already approved': the photo case goes to an officer",
    s.ok && sent.status === "PENDING_REVIEW" && photoCaseSent(sent), J({ s, status: sent.status }));
  const ap = await reviewKyc({ officerId: OFFICER, userId: u, decision: "APPROVE", mode: "photo", attestations: photoAll, version: kycRowVersion(sent) });
  const done = await kycOf(u);
  const e2 = await applicantEligibility(u);
  ok("13.24 CONTROL · the officer's photo approval stamps anew, over those photos, and the agent gate opens",
    ap.ok && photoIdentityVerified(done) && Date.parse(done.photoVerifiedAt!) > Date.parse(auto.approvedAt!) && e2.ok, J({ ap, stamp: done.photoVerifiedAt, e2 }));
});

await section("§13 · R5.3 · an approval records a post-check only when the officer made the statements on the workstation", async () => {
  process.env.EMAIL_OUTBOX_CAPTURE = "1";
  /** An invitee whose identity was FIRST approved automatically from typed details (with a flag), who then sent their
   *  document photos — PENDING_REVIEW, the automatic approval unchecked — and whose application is under review. */
  async function typedInvitee(tag: string): Promise<{ u: string; appId: string }> {
    const email = `${tag}@kto.tz`;
    const u = await account(`usr_kto_${tag}`, { email });
    const inv = await AGENT.issueInvitation(OFFICER, { email });
    if (!inv.ok) throw new Error(`invite ${tag}: ${J(inv)}`);
    clearEmailOutbox();
    await AGENT.requestInvitationOtp(inv.data!.token);
    const mail = emailOutbox().filter((m) => m.to.toLowerCase() === email).pop();
    const code = (mail?.html.match(/>([0-9]{6})</) ?? mail?.html.match(/(?:^|[^0-9])([0-9]{6})(?:[^0-9]|$)/))?.[1] ?? "";
    const acc = await AGENT.acceptInvitation(u, inv.data!.token, code);
    if (!acc.ok) throw new Error(`accept ${tag}: ${J(acc)}`);
    await autoThenPhotos(u);
    for (const slot of AGENT.REQUIRED_DOC_SLOTS) {
      const r = await AGENT.attachAgentDocument(u, slot, PNG);
      if (!r.ok) throw new Error(`agent doc ${slot} ${tag}: ${J(r)}`);
    }
    await AGENT.setReferees(u, { oneName: "Amina Juma", oneContact: "+255711000003", twoName: "Baraka Kweka", twoContact: "+255711000004", consent: true });
    await AGENT.waiveFee(OFFICER, acc.data!.applicationId, "waived for the typed-only guard's R5.3 invitee fixture");
    const sub = await AGENT.submitForReview(u, { acceptedTermsVersion: AGENT_TERMS_VERSION });
    if (!sub.ok) throw new Error(`agent submit ${tag}: ${J(sub)}`);
    return { u, appId: acc.data!.applicationId };
  }
  const postChecks = (u: string) => getAuditForTarget("User", u, 200).filter((e) => e.action === "kyc.post_checked");
  try {
    const { u, appId } = await typedInvitee("r53_agent");
    const before = await kycOf(u);
    ok("13.40 CONTROL · the invitee's identity is an UNCHECKED, FLAGGED automatic approval, now a photo case with our team",
      before.status === "PENDING_REVIEW" && uncheckedAutomaticApproval(before) && (before.autoFlags ?? []).length > 0 && photoCaseSent(before),
      J({ status: before.status, flags: before.autoFlags }));
    const r = await AGENT.approveAgent(OFFICER, appId, { commissionPct: 20 });
    await auditFlush();
    const k = await kycOf(u);
    const listed = await inList(u);
    ok("13.41 ⛔ R5.3 · approveAgent approves the photos (stamped) but leaves the automatic approval UNCHECKED — no postCheckedAt, still on the list",
      r.ok && k.status === "APPROVED" && !!k.photoVerifiedAt && !k.postCheckedAt && !k.postCheckedById && listed?.status === "APPROVED",
      J({ r, photo: k.photoVerifiedAt, checked: k.postCheckedAt, listed: listed ?? null }));
    ok("13.42 ⛔ R5.3 · …and writes no kyc.post_checked — nobody made the statements, nobody was shown the flags", postChecks(u).length === 0, J(postChecks(u).map((e) => e.actorId)));
  } finally {
    clearEmailOutbox();
    delete process.env.EMAIL_OUTBOX_CAPTURE;
  }
  // CONTROL — the same kind of case approved on the WORKSTATION, with the photo statements posted.
  const w = await account("usr_kto_r53_workstation");
  await autoThenPhotos(w);
  const ap = await reviewKyc({ officerId: OFFICER, userId: w, decision: "APPROVE", mode: "photo", attestations: photoAll, version: await versionOf(w) });
  await auditFlush();
  const kw = await kycOf(w);
  const pc = postChecks(w);
  const pl = (pc[0]?.payload ?? {}) as { kycId?: string; attestationSet?: string; attestations?: Record<string, string>; flags?: string[] };
  ok("13.43 CONTROL · a workstation approval WITH the statements checks it: postCheckedAt/ById stamped, off the list",
    ap.ok && !!kw.postCheckedAt && kw.postCheckedById === OFFICER && !(await inList(w)), J({ ap, checked: kw.postCheckedAt, by: kw.postCheckedById }));
  ok("13.44 ⭐ R5.3 · …and records it as Mark checked does: ONE kyc.post_checked by that officer — the set it used, the statements, the flags",
    pc.length === 1 && pc[0].actorId === OFFICER && pl.kycId === kw.id && pl.attestationSet === ATTESTATION_SET_ID.photo
      && J(pl.attestations) === J(photoAll) && J(pl.flags) === J(kw.autoFlags ?? []), J(pc.map((e) => e.payload)));
});

await section("§13 · R5.8 · an admitted under-18 date of birth sends the next press to an officer", async () => {
  const u = await account("usr_kto_r58_attempt", { dob: null });
  const minor = await verifyIdentity(u, typed(u, "VOTER_CARD", voter(), { dob: "2015-01-01" }));
  await auditFlush();
  ok("13.30 CONTROL · the under-18 date was refused and recorded as the player's own attempt",
    !minor.ok && getAuditForTarget("User", u, 200).some((e) => e.action === "kyc.identity.underage_attempt" && e.actorId === u), J(minor));
  const adult = await verifyIdentity(u, typed(u, "VOTER_CARD", voter(), { dob: "1992-03-04" }));
  const k = await kycOf(u);
  ok("13.31 ⛔ R5.8 · the adult date typed next is ROUTED (UNDERAGE_ATTEMPT, nothing else) — never approved at once",
    outcomeOf(adult) === "routed" && J(routesOf(adult)) === J(["UNDERAGE_ATTEMPT"]) && k.status === "PENDING_REVIEW" && !k.autoApprovedAt, J({ adult, status: k.status }));
  let bell: { titleEn?: string } | undefined;
  for (let i = 0; i < 25 && !bell; i++) {
    bell = (await db.notification.findByUser(OFFICER, 500)).find((n: { href?: string | null }) => n.href === `/admin/kyc/${u}`) as { titleEn?: string } | undefined;
    if (!bell) await tick();
  }
  ok("13.32 ⭐ R5.8 · …and the officers' bell for it is URGENT, as a NIDA under-18 route's is", bell?.titleEn === "Urgent KYC to review", J(bell ?? null));
  const checks = await readKycCaseChecks(u);
  ok("13.33 ⭐ R5.8 · the workstation's checks show the same route, on the age line", checks?.decision.rows.find((r) => r.key === "age")?.outcome === "route"
    && (checks?.decision.routes ?? []).includes("UNDERAGE_ATTEMPT"), J(checks?.decision.rows.find((r) => r.key === "age") ?? null));
  const c = await account("usr_kto_r58_control", { dob: null });
  const rc = await verifyIdentity(c, typed(c, "VOTER_CARD", voter(), { dob: "1992-03-04" }));
  ok("13.34 CONTROL · the same adult date on an account with no attempt on record is approved at once", outcomeOf(rc) === "approved", J(rc));
});

// ── §14 · an agent's photos belong to the document they show (2026-10-10, the screenshot pass) ───────────────────────
await section("§14 · an agent's photos belong to the document they show; an expired saved document hands the form back", async () => {
  const u = await account("usr_kto_14_doc_change");
  const s1 = await submitIdentityStep(u, typed(u, "PASSPORT", passport()));
  const a1 = await attachDocument(u, "PASSPORT", PNG);
  const a2 = await attachDocument(u, "SELFIE", PNG);
  const before = await kycOf(u);
  ok("14.0 CONTROL · the agent's details are saved (no decision) and two photos attached",
    s1.ok && a1.ok && a2.ok && before.status === "IN_PROGRESS" && (before.documents ?? []).length === 2, J({ s1, a1, a2, docs: (before.documents ?? []).length }));
  const same = await submitIdentityStep(u, typed(u, "PASSPORT", String(before.idNumber), { fullName: `${nameFor(u)} Junior` }));
  const kSame = await kycOf(u);
  ok("14.1 CONTROL · re-saving the SAME document (a corrected name) keeps its photos",
    same.ok && (kSame.documents ?? []).length === 2 && kSame.fullName === `${nameFor(u)} Junior`, J({ same, docs: (kSame.documents ?? []).length }));
  const renewed = await submitIdentityStep(u, typed(u, "PASSPORT", passport()));
  const kNew = await kycOf(u);
  ok("14.2 ⛔ a DIFFERENT document (a renewed passport — same type, new number) drops the old one's photos, so the photo step asks again",
    renewed.ok && (kNew.documents ?? []).length === 0 && kNew.status === "IN_PROGRESS" && kNew.idNumber !== before.idNumber, J({ renewed, docs: (kNew.documents ?? []).length }));
  const page = read("src/app/profile/kyc/page.tsx");
  ok("14.3 ⭐ an agent case not yet approved whose saved document has EXPIRED gets the details form back — chooser included — and no photo step",
    /const agentDocExpired = agentMode && idDone && !approved && !pending && docExpired;/.test(page)
      && /\(!idDone \|\| needsInfo \|\| agentDocExpired\)/.test(page)
      && /agentMode && idDone && !agentDocExpired\)/.test(page)
      && /idDone && !submitted && !agentDocExpired && \(/.test(page));
});

await auditFlush();
console.log("");
console.log(`${fail === 0 ? "ALL PASS" : "FAILURES"} — ${pass} passed, ${fail} failed`);
process.exitCode = fail === 0 ? 0 : 1;
process.exit();
