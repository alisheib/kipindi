/**
 * test:visual-pass-r8d — R8-D (2026-10-10): THE OWNER'S RULING (4), COMPLETED ON EVERY OTHER CHANNEL — during a player's
 * break, no offer to earn or recruit (owner items 16 and 56). R8-C closed every screen door; this holds the rest:
 *   1. the SERVICES refuse during a break, before anything is written: the agent registration fee paid from the wallet
 *      (`payFeeFromWallet` — MONEY: the check before any money moves, inside the lock the service already holds, after a
 *      settled fee's idempotent answer) and a proposal (`createProposal`); the forms say the programme's own sentence;
 *   2. a SHARE LINK carries no invite code (the market page, /positions) — nothing minted;
 *   3. a LETTER that solicits leaves out only its soliciting lines, decided at send time; the "friend joined" NOTICE is not
 *      written during the referrer's break;
 *   4. the HELP CHAT shows no door to the three programmes — without telling the model anything about the account
 *      (/legal/privacy §4: Anthropic receives "the messages of that conversation, not your account details").
 * Both arms everywhere (on a break / not), in sw, en and zh where words are drawn. The services run for real on the memory
 * store (§2 — `scripts/lib/visual-pass-r8d-cases.mts`, which `test:visual-pass-r8d-stores` runs on both stores); every page
 * line and client branch is pinned AND executed from its own source; each rule has a control or a plant beside it; the
 * on-disk mutation proof is S/r8/d/mutation_proof.py.
 */
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, posix } from "node:path";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { decomment } from "./lib/decomment.mts";

if (process.env.DATABASE_URL !== undefined) {
  console.log("FAIL 0.guard · REFUSED — DATABASE_URL is set: this suite runs on the in-memory store only (both stores: test:visual-pass-r8d-stores).");
  process.exit(1);
}
process.env.SESSION_SECRET ??= "test-only-session-secret-32chars-aaaa";
process.env.OTP_PEPPER ??= "test-only-otp-pepper-16chars";

const req = createRequire(import.meta.url);
const LF = String.fromCharCode(10);
const CR = String.fromCharCode(13);
const ROOT = process.cwd().split(String.fromCharCode(92)).join("/");

let pass = 0;
const fails: string[] = [];
const ok = (name: string, cond: boolean, detail = "") => {
  if (cond) { pass++; console.log(`  ok   ${name}`); }
  else { fails.push(`${name}${detail ? ` — ${detail}` : ""}`); console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`); }
};
const section = (s: string) => console.log(`${LF}── ${s} ${"─".repeat(Math.max(0, 110 - s.length))}`);
const raw = (p: string) => readFileSync(join(ROOT, p), "utf8").split(CR + LF).join(LF);
const code = (p: string) => decomment(raw(p));
const squash = (s: string) => s.split(LF).join(" ").replace(/[ ]+/g, " ");
const has = (src: string, snippet: string) => squash(src).includes(squash(snippet));
const count = (s: string, needle: string) => s.split(needle).length - 1;
const j = (v: unknown) => JSON.stringify(v);
const git = (...args: string[]) => execFileSync("git", ["-C", ROOT, ...args], { encoding: "utf8" });
/** The text of one top-level declaration: from its signature to the next top-level `export`/`function`. */
const decl = (src: string, sig: string) => {
  const a = src.indexOf(sig);
  if (a < 0) return "";
  const b = src.slice(a + sig.length).search(/\n(?:export |async function |function |const [A-Z_]+ = )/);
  return b < 0 ? src.slice(a) : src.slice(a, a + sig.length + b);
};
/** The text of one statement: from `start` to the first `;` that ends a line after it. */
const statement = (src: string, start: string) => {
  const a = src.indexOf(start);
  if (a < 0) return "";
  const b = src.indexOf(`;${LF}`, a);
  return b < 0 ? "" : src.slice(a, b + 1);
};
const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor as new (...args: string[]) => (...a: unknown[]) => Promise<unknown>;

/* ── the dictionary, the break, the locales ─────────────────────────────────────────────────────────────────────────── */
const { dict } = await import("../src/lib/i18n-dict.ts");
type L = "sw" | "en" | "zh";
const LOCALES: L[] = ["sw", "en", "zh"];
const T = dict as unknown as Record<L, typeof dict.en>;
const { breakSentence } = req("../src/lib/break-end.ts") as typeof import("../src/lib/break-end.ts");
const NOW = Date.now();
const UNTIL = new Date(NOW + 26 * 3_600_000 + 7 * 60_000).toISOString();
const sentenceOf = (l: L, exclusion: boolean) =>
  breakSentence(exclusion ? T[l].rg.exclusionActive : T[l].rg.breakActive, UNTIL, NOW, T[l].common.monthsShort, l).text;
const FIXED_DATE = { now: () => NOW } as unknown as DateConstructor;

/* ── RUNNING A MODULE FROM ITS OWN SOURCE (R8-C's runner): esbuild to CommonJS, `require` answered here — a named
 *    stand-in where the suite gives one, the REAL module everywhere else. ───────────────────────────────────────────── */
const esbuild = req("esbuild") as { transformSync: (c: string, o: Record<string, unknown>) => { code: string } };
const resolveSrc = (rel: string): string | null => {
  for (const ext of ["", ".tsx", ".ts", "/index.tsx", "/index.ts"]) {
    const p = `${rel}${ext}`;
    if (existsSync(join(ROOT, p)) && statSync(join(ROOT, p)).isFile()) return p;
  }
  return null;
};
type Stubs = Record<string, unknown>;
function runText(file: string, text: string, stubs: Stubs): Record<string, unknown> {
  const js = esbuild.transformSync(text, { loader: "tsx", format: "cjs", jsx: "automatic", target: "es2022", sourcefile: file }).code;
  const dir = posix.dirname(file);
  const own = (k: string) => Object.prototype.hasOwnProperty.call(stubs, k);
  const localRequire = (spec: string): unknown => {
    if (own(spec)) return stubs[spec];
    const rel = spec.startsWith("@/") ? `src/${spec.slice(2)}`
      : spec.startsWith("./") || spec.startsWith("../") ? posix.normalize(posix.join(dir, spec)) : null;
    if (rel === null) return req(spec);
    const path = resolveSrc(rel);
    if (path === null) throw new Error(`cannot resolve ${spec} from ${file}`);
    if (own(path)) return stubs[path];
    return req(join(ROOT, path));
  };
  const mod = { exports: {} as Record<string, unknown> };
  new Function("require", "module", "exports", js)(localRequire, mod, mod.exports);
  return mod.exports;
}
class Redirected extends Error { to: string; constructor(to: string) { super(`redirect ${to}`); this.to = to; } }
const NAV = { redirect: (to: string) => { throw new Redirected(to); }, notFound: () => { throw new Error("notFound"); } };

/* ══ §0 · REGISTRATION ═════════════════════════════════════════════════════════════════════════════════════════════════ */
section("0 · registered");
{
  const pkg = JSON.parse(raw("package.json")) as { scripts: Record<string, string> };
  ok("0.1 · test:visual-pass-r8d runs scripts/visual-pass-r8d.test.mts", pkg.scripts["test:visual-pass-r8d"] === "tsx scripts/visual-pass-r8d.test.mts");
  ok("0.2 · test:visual-pass-r8d-stores runs the same service cases on both stores (db-scratch → the two-store runner)",
    pkg.scripts["test:visual-pass-r8d-stores"] === "tsx scripts/db-scratch.mts --run npx tsx scripts/visual-pass-r8d-stores.test.mts"
      && has(code("scripts/visual-pass-r8d-stores.test.mts"), 'casesFile: "scripts/lib/visual-pass-r8d-child.mts"')
      && has(code("scripts/lib/visual-pass-r8d-child.mts"), "await runR8dServiceCases(ok)"));
}

/* ══ §1 · THE MONEY PATH, READ — payFeeFromWallet ══════════════════════════════════════════════════════════════════════ */
section("1 · payFeeFromWallet — the programme's own hold, inside its lock, after the settled answer, before ANY money moves");
const SVC_FILE = "src/lib/server/agent-application-service.ts";
const SVC = code(SVC_FILE);
const HOLD_DEF = `async function agentRgHold(userId: string): Promise<{ until: string | null } | null> {
  const lock = await isLockedOut(userId);
  if (lock.locked) return { until: lock.until };
  const se = await selfExclusionStanding(userId);
  if (se.state !== "none") return { until: null };
  return null;
}`;
const HOLD_CALL = "if (await agentRgHold(userId)) {";
const HOLD_RET = 'return { ok: false as const, error: RG_LOCKED_SENTENCE, code: "INVALID" as const, refusal: "rg_locked" as const };';
const feeOrder = (src: string) => {
  const fn = decl(src, "export async function payFeeFromWallet(");
  const at = (s: string) => fn.indexOf(s);
  const pts = {
    lock: at("return withLock(`agentapp:${userId}`"),
    settled: at('if (app.feeDisposition === "WAIVED" || app.feeDisposition === "COLLECTED") {'),
    hold: at(HOLD_CALL),
    owed: at("const owed = await refundOwedTo(userId);"),
    kyc: at("const kyc = await getKycStatus(userId);"),
    pay: at("const paid = await payAgentRegistrationFee(userId, {"),
  };
  const okOrder = Object.values(pts).every((v) => v > 0) && pts.lock < pts.settled && pts.settled < pts.hold && pts.hold < pts.owed
    && pts.owed < pts.kyc && pts.kyc < pts.pay && count(fn, "agentRgHold(") === 1 && has(fn.slice(pts.hold, pts.owed), HOLD_RET);
  return { okOrder, pts };
};
{
  const ISSUE = decl(SVC, "export async function issueInvitation(");
  ok("1.1 · ONE spelling of the programme's hold (`agentRgHold`): the running break or exclusion (`isLockedOut`), then a self-exclusion on record (`selfExclusionStanding`) — and the service reads neither elsewhere but the officer's own issue door (a check on the INVITEE's record, `issueInvitation`)",
    has(SVC, HOLD_DEF) && count(SVC, "isLockedOut(") === 1 && count(SVC, "selfExclusionStanding(") === 2 && count(ISSUE, "selfExclusionStanding(") === 1);
  ok("1.2 · the start, the submit and the invitation's acceptance ask it through `applicantEligibility` — the same condition, the same token `rg_locked`",
    has(SVC, "const rg = await agentRgHold(userId);") && has(SVC, 'if (rg) return { ok: false, refusal: "rg_locked", until: rg.until };')
      && count(SVC, "applicantEligibility(userId") >= 3);
  const o = feeOrder(SVC);
  ok("1.3 · ⭐ THE FEE asks it inside its `agentapp:` lock, AFTER the settled fee's idempotent answer, BEFORE the refund-owed, identity and address refusals, and BEFORE `payAgentRegistrationFee` takes the wallet lock and moves money — refusing with `rg_locked` and the programme's sentence",
    o.okOrder, j(o.pts));
  const plants: Array<[string, string]> = [
    ["the hold removed", SVC.replace(HOLD_CALL, "if (false) {")],
    ["the hold after the money moved", SVC.replace(HOLD_CALL, "if (false) {").replace("const now = iso();\n    const status = deriveDraftStatus(", "if (await agentRgHold(userId)) { " + HOLD_RET + " }\n    const now = iso();\n    const status = deriveDraftStatus(")],
    ["the hold before the settled answer (a paid fee refused)", SVC.replace('if (app.feeDisposition === "WAIVED" || app.feeDisposition === "COLLECTED") {', HOLD_CALL + " " + HOLD_RET + " }\n    if (app.feeDisposition === \"WAIVED\" || app.feeDisposition === \"COLLECTED\") {")],
    ["the hold after the address check", SVC.replace(HOLD_CALL, "if (false) {").replace("const fee = feeBreakdown();", HOLD_CALL + " " + HOLD_RET + " }\n    const fee = feeBreakdown();")],
  ];
  const missed = plants.filter(([, s]) => feeOrder(s).okOrder).map(([n]) => n);
  ok(`1.3′ PLANT · ${plants.map(([n]) => n).join(" · ")} — each reported`, missed.length === 0, missed.join(", "));
  const union = SVC.slice(SVC.indexOf("export type FeeRefusal ="), SVC.indexOf("export type FeeResult"));
  ok("1.4 · `rg_locked` is a FeeRefusal TOKEN (the form renders translated copy from it, never English prose)", union.includes('"rg_locked"'));
  ok("1.5 · the programme's refusal carries its token beside its English record (`refusal: elig.refusal`), so the submit can say it in the reader's language",
    has(SVC, 'return { ok: false, error: messages[elig.refusal], code: "INVALID", reason: undefined, refusal: elig.refusal } as ServiceResult<never>;')
      && has(SVC, "rg_locked: RG_LOCKED_SENTENCE,") && has(SVC, 'const RG_LOCKED_SENTENCE = "Applications are not available while a responsible-gambling break is active.";'));
  ok("1.6 · the sentence for the record is `agent.stateRgLocked`'s own English (one sentence, two places it is said)", T.en.agent.stateRgLocked === "Applications are not available while a responsible-gambling break is active.");
}

/* ══ §2 · THE SERVICES, EXECUTED — the case list on the memory store ═══════════════════════════════════════════════════ */
section("2 · the services, executed (memory store) — the fee, a proposal, the decline letter, the friend-joined notice");
{
  const { runR8dServiceCases } = await import("./lib/visual-pass-r8d-cases.mts");
  let asked = 0;
  const { onPostgres } = await runR8dServiceCases((label, cond, detail) => { asked++; ok(label, cond, detail); });
  ok("2.0 · the case list ran in memory, all 24 of its assertions (a case that stops asking fails here)", !onPostgres && asked === 24, `asked ${asked}`);
}

/* ══ §3 · THE WIZARD — the fee's toast and the submit's modal say the programme's sentence ═════════════════════════════ */
section("3 · /agent/apply — a form opened before the break: the programme's own sentence, in the reader's language (3 locales)");
{
  const CLIENT = code("src/app/agent/apply/apply-client.tsx");
  const COPY = statement(CLIENT, "const copy = r.refusal ===");
  ok("3.1 · the fee's refusal copy reads `rg_locked` first → `agent.stateRgLocked`", COPY.startsWith('const copy = r.refusal === "rg_locked" ? t.agent.stateRgLocked'));
  const expr = COPY.replace(/^const copy = /, "").replace(/;$/, "");
  const copyOf = new Function("r", "t", "fill", "formatTzs", `return (${expr});`) as (r: unknown, t: unknown, f: unknown, m: unknown) => string;
  const fill = (s: string) => s;
  const bad: string[] = [];
  for (const l of LOCALES) {
    if (copyOf({ refusal: "rg_locked", error: "EN" }, T[l], fill, String) !== T[l].agent.stateRgLocked) bad.push(`${l}: rg_locked`);
    if (copyOf({ refusal: "refund_owed", error: "EN" }, T[l], fill, String) !== T[l].agent.payRefundOwed) bad.push(`${l}: control refund_owed moved`);
    if (copyOf({ refusal: "email_unverified", error: "EN" }, T[l], fill, String) !== T[l].agent.payEmailFirst) bad.push(`${l}: control email moved`);
  }
  ok("3.2 · EXECUTED · the toast's words: on a break `agent.stateRgLocked` in sw, en and zh; every other refusal's words as today", bad.length === 0, bad.join("; "));
  const RG_MODAL = 'if (!r.ok && r.refusal === "rg_locked") { setResult({ open: true, variant: "danger", title: t.toast.couldntSubmit, subtitle: t.agent.stateRgLocked }); return; }';
  const GENERIC = 'if (!r.ok) { setResult({ open: true, variant: "danger", title: t.error.somethingDidntWork, subtitle: r.error }); return; }';
  ok("3.3 · the submit's modal: on `rg_locked` \"Couldn't submit\" + the programme's sentence (never \"something didn't work\" — a break is the tool working), ahead of the generic arm",
    has(CLIENT, RG_MODAL) && squash(CLIENT).indexOf(squash(RG_MODAL)) < squash(CLIENT).indexOf(squash(GENERIC)) && squash(CLIENT).indexOf(squash(GENERIC)) > 0);
  // EXECUTED: the actions carry the token out.
  let SUBMIT: unknown = { ok: false, error: "EN", code: "INVALID", refusal: "rg_locked" };
  let FEE: unknown = { ok: false, error: "EN", code: "INVALID", refusal: "rg_locked" };
  const actions = runText("src/app/agent/apply/actions.ts", raw("src/app/agent/apply/actions.ts"), {
    "next/navigation": NAV,
    "@/lib/server/auth-service": { currentSession: async () => ({ userId: "u1" }) },
    "@/lib/server/image-signature": { sniffBase64ImageMime: () => null },
    "@/lib/id-documents": { MAX_DOC_BYTES: 1 },
    "@/lib/agent-terms-version": { AGENT_TERMS_VERSION: "v-test" },
    "@/lib/server/agent-application-service": {
      submitForReview: async () => SUBMIT, payFeeFromWallet: async () => FEE,
      startApplication: async () => ({ ok: true }), attachAgentDocument: async () => ({ ok: true }), setReferees: async () => ({ ok: true }),
      recordFeePayment: async () => ({ ok: true }), ALL_DOC_SLOTS: [],
    },
  }) as Record<string, (fd?: FormData) => Promise<Record<string, unknown>>>;
  const fd = new FormData(); fd.set("acceptTerms", "true");
  const s1 = await actions.submitAgentApplicationAction(fd);
  SUBMIT = { ok: false, error: "EN", code: "INVALID", refusal: "cooldown" };
  const s2 = await actions.submitAgentApplicationAction(fd);
  SUBMIT = { ok: false, error: "EN", code: "INVALID" };
  const s3 = await actions.submitAgentApplicationAction(fd);
  const f1 = await actions.payFeeFromWalletAction();
  FEE = { ok: false, error: "EN", code: "INVALID", refusal: "insufficient_balance", shortfallTzs: 5 };
  const f2 = await actions.payFeeFromWalletAction();
  ok("3.4 · EXECUTED · the submit action hands the form `refusal: \"rg_locked\"` for the programme's RG refusal, and nothing new for any other",
    s1.refusal === "rg_locked" && s1.ok === false && !("refusal" in s2) && !("refusal" in s3), j({ s1, s2, s3 }));
  ok("3.5 · EXECUTED · the fee action hands the token through as before (`rg_locked`, and a control token with its shortfall)",
    f1.refusal === "rg_locked" && f2.refusal === "insufficient_balance" && f2.shortfallTzs === 5, j({ f1, f2 }));
}

/* ══ §4 · PROPOSE & EARN — the action carries the end, the composer says the page's sentence ══════════════════════════ */
section("4 · /proposals/new — a form opened before the break: the break's own sentence with its end, the draft kept (3 locales)");
{
  const BREAK_END = { until: UNTIL, exclusion: false };
  let RESULT: unknown = { ok: false, error: "EN", code: "RG_LOCKED", breakEnd: BREAK_END };
  let STATE = "ACTIVE";
  const mod = runText("src/app/proposals/actions.ts", raw("src/app/proposals/actions.ts"), {
    "next/navigation": NAV,
    "next/cache": { revalidatePath: () => {} },
    "@/lib/server/auth-service": { currentSession: async () => ({ userId: "u1" }) },
    "@/lib/server/proposals-service": { createProposal: async () => RESULT, castVote: async () => ({ ok: true }), proposalsBlockedReason: () => "closed" },
    "@/lib/server/proposals-config": { getProposalsConfig: () => ({ state: STATE }), isProposalsActive: (c: { state: string }) => c.state === "ACTIVE" },
  }) as Record<string, (i: unknown) => Promise<Record<string, unknown>>>;
  const a1 = await mod.createProposalAction({});
  RESULT = { ok: false, error: "EN", code: "INVALID" };
  const a2 = await mod.createProposalAction({});
  RESULT = { ok: true, proposal: { id: "prp_1" } };
  const a3 = await mod.createProposalAction({});
  STATE = "MAINTENANCE";
  const a4 = await mod.createProposalAction({});
  ok("4.1 · EXECUTED · the action hands the composer the break's end with `RG_LOCKED`; every other refusal carries `breakEnd: null` (one shape); a submission is today's",
    a1.code === "RG_LOCKED" && j(a1.breakEnd) === j(BREAK_END) && a2.code === "INVALID" && a2.breakEnd === null
      && a3.ok === true && a3.proposalId === "prp_1" && a4.code === "PAUSED" && a4.breakEnd === null, j({ a1, a2, a3, a4 }));
  const FORM = code("src/app/proposals/new/create-form.tsx");
  const bStart = FORM.indexOf('else if (r.code === "RG_LOCKED" && r.breakEnd) {');
  const bEnd = FORM.indexOf("else toast({ title: t.toast.couldntSubmit, description: errorCopy(t, r),");
  const branch = bStart > 0 && bEnd > bStart ? FORM.slice(bStart, bEnd) : "";
  const DESC = "breakSentence(end.exclusion ? t.rg.exclusionActive : t.rg.breakActive, end.until, Date.now(), t.common.monthsShort, locale).text";
  ok("4.2 · the composer's break branch stands before the generic toast, keeps the draft (no setDone, no refresh), and says the break's sentence with its end at the registry's rank for a break",
    branch.length > 0 && has(branch, DESC) && has(branch, 'variant: refusalVariant(end.exclusion ? "self_excluded" : "cooling_off"),') && !/setDone|router\.|refresh/.test(branch)
      && has(FORM, "const { t, locale } = useT();") && has(FORM, 'import { breakSentence } from "@/lib/break-end";'));
  const descOf = new Function("breakSentence", "end", "t", "locale", "Date", `return ${DESC};`) as (b: unknown, e: unknown, t: unknown, l: L, d: unknown) => string;
  const PAGE = code("src/app/proposals/new/page.tsx");
  const pageSays = has(PAGE, "breakSentence(breakEnd.exclusion ? t.rg.exclusionActive : t.rg.breakActive, breakEnd.until, Date.now(), t.common.monthsShort, locale)");
  const wrong: string[] = [];
  for (const l of LOCALES) for (const exclusion of [false, true]) {
    if (descOf(breakSentence, { until: UNTIL, exclusion }, T[l], l, FIXED_DATE) !== sentenceOf(l, exclusion)) wrong.push(`${l}/${exclusion ? "exclusion" : "break"}`);
  }
  ok("4.3 · EXECUTED · the toast says exactly what /proposals/new says on a break (R8-C's notice) — sw, en, zh, a break and an exclusion", pageSays && wrong.length === 0, wrong.join(", "));
  const { refusalVariant } = req("../src/lib/failure-reasons.ts") as typeof import("../src/lib/failure-reasons.ts");
  ok("4.4 · the rank: a break the player cannot lift is the registry's `cooling_off` / `self_excluded` (error → danger), as the bet path ranks it",
    refusalVariant("cooling_off") === "danger" && refusalVariant("self_excluded") === "danger");
  const PS = code("src/lib/server/proposals-service.ts");
  const fn = decl(PS, "export async function createProposal(");
  const iPaused = fn.indexOf("if (!isProposalsActive(cfg))"), iBreak = fn.indexOf("const breakEnd = breakStateOf(await isLockedOut(userId));"), iValid = fn.indexOf("const titleEn = (input.titleEn");
  ok("4.5 · the service: the closed programme answers first, then the break (R8-C's one break: `isLockedOut` → `breakStateOf`, no catch — a refusal's read), before any validation or write",
    iPaused > 0 && iBreak > iPaused && iValid > iBreak && has(fn, 'if (breakEnd) return { ok: false, error: "Proposals are not available while a responsible-gambling break is active.", code: "RG_LOCKED", breakEnd };')
      && !/isLockedOut\(userId\)\)[^;]*\.catch/.test(fn), j({ iPaused, iBreak, iValid }));
}

/* ══ §5 · SHARE LINKS — the plain link on a break, nothing minted ═════════════════════════════════════════════════════ */
section("5 · share links — the market page and /positions share the plain link during a break (executed from their own lines)");
{
  const MKT = code("src/app/markets/[id]/page.tsx");
  const POS = code("src/app/positions/page.tsx");
  const M_LINE = statement(MKT, "const myRefCode = ");
  const P_LINE = statement(POS, "const myRefCode = ");
  ok("5.1 · the market page's code asks the break it already read (R4-I's `breakEnd`) before reading the invite viewer",
    squash(M_LINE) === squash("const myRefCode = session && !breakEnd && inviteIsLiveFor(await inviteViewerFor(session.userId)) ? await ensureAffiliateAccount(session.userId).then((a) => a.code).catch(() => undefined) : undefined;")
      && MKT.indexOf("const breakEnd = session") > 0 && MKT.indexOf("const breakEnd = session") < MKT.indexOf(M_LINE));
  ok("5.2 · /positions' code asks the break read above it — moved below R4-I's read for that reason — and still stands before the journey's return",
    squash(P_LINE) === squash("const myRefCode = !breakEnd && inviteIsLiveFor(await inviteViewerFor(session.userId)) ? await ensureAffiliateAccount(session.userId).then((a) => a.code).catch(() => undefined) : undefined;")
      && POS.indexOf("const breakEnd = await Promise.resolve().then(() => isLockedOut(session.userId))") < POS.indexOf(P_LINE)
      && POS.indexOf(P_LINE) < POS.indexOf("if (journey) {") && count(POS, "const myRefCode") === 1 && count(POS, "refCode={myRefCode}") === 2);
  const exec = async (line: string, session: unknown, breakEnd: unknown) => {
    const calls = { viewer: 0, mint: 0 };
    const fn = new AsyncFunction("session", "breakEnd", "inviteIsLiveFor", "inviteViewerFor", "ensureAffiliateAccount", `${line}${LF}return myRefCode;`);
    const v = await fn(session, breakEnd, () => true, async () => { calls.viewer++; return {}; }, async () => { calls.mint++; return { code: "QAFLC8R2" }; });
    return { v, ...calls };
  };
  const BRK = { until: UNTIL, exclusion: false };
  const S = { userId: "u1" };
  const m = { on: await exec(M_LINE, S, BRK), off: await exec(M_LINE, S, null), guest: await exec(M_LINE, null, null) };
  const p = { on: await exec(P_LINE, S, BRK), off: await exec(P_LINE, S, null) };
  ok("5.3 · EXECUTED · on a break: no code on the link, and nothing read or MINTED for it (market page and /positions)",
    m.on.v === undefined && m.on.mint === 0 && m.on.viewer === 0 && p.on.v === undefined && p.on.mint === 0 && p.on.viewer === 0, j({ m: m.on, p: p.on }));
  ok("5.4 · EXECUTED · CONTROL · off a break (and on a failed read, which arrives as null) the link carries the code as today; a guest gets none",
    m.off.v === "QAFLC8R2" && p.off.v === "QAFLC8R2" && m.guest.v === undefined && m.guest.mint === 0, j({ m, p }));
  // The census: every place a share link takes a code, classified.
  const walk = (dir: string): string[] => readdirSync(join(ROOT, dir)).flatMap((f) => {
    const rel = `${dir}/${f}`;
    return statSync(join(ROOT, rel)).isDirectory() ? (f === "dev-test" ? [] : walk(rel)) : /\.(ts|tsx)$/.test(f) ? [rel] : [];
  });
  const files = [...walk("src/app"), ...walk("src/components")];
  const minters = files.filter((f) => code(f).includes("ensureAffiliateAccount(")).sort();
  const refProps = files.filter((f) => /refCode=\{/.test(code(f))).sort();
  ok("5.5 · CENSUS · the pages that mint a code for a share link are exactly these two, both gated on the break (a new one fails here until it is)",
    j(minters) === j(["src/app/markets/[id]/page.tsx", "src/app/positions/page.tsx"]), j(minters));
  ok("5.6 · CENSUS · a code reaches a share control only from those two pages, and through the position card that hands it on",
    j(refProps) === j(["src/app/markets/[id]/page.tsx", "src/app/positions/page.tsx", "src/components/markets/position-card.tsx"]), j(refProps));
}

/* ══ §6 · LETTERS — the soliciting lines only, decided at send time ═══════════════════════════════════════════════════ */
section("6 · letters — on a break only the soliciting lines are left out; off a break every byte is today's");
{
  const email = await import("../src/lib/server/email.ts") as unknown as Record<string, (o?: unknown) => string>;
  const headText = git("show", "HEAD:src/lib/server/email.ts");
  const head = runText("src/lib/server/email.ts", headText, {}) as Record<string, (o?: unknown) => string>;
  const ARGS: Array<[string, Record<string, unknown>]> = [
    ["referralRewardHtml", { amount: 10_000, referredName: "A*** M***", totalEarned: 20_000 }],
    ["referralEarningHtml", { type: "COMMISSION", amountTzs: 4_250 }],
    ["referralEarningHtml", { type: "BONUS", amountTzs: 2_000 }],
    ["referralEarningHtml", { type: "PRIZE", amountTzs: 10_000 }],
    ["proposalDeclinedHtml", { titleEn: "Will the bridge toll change?", reason: "Duplicate", note: "A market on this exists." }],
  ];
  const SOLICITS: Record<string, string[]> = {
    referralRewardHtml: ["Invite more · Alika zaidi", "/profile/invite"],
    referralEarningHtml: ["Keep inviting friends to earn more.", "Endelea kualika marafiki kupata zaidi.", "Invite more · Alika zaidi", "/profile/invite"],
    proposalDeclinedHtml: ["Don't let this stop you — propose another market anytime.", "Usikate tamaa — pendekeza soko lingine wakati wowote.", "Propose another · Pendekeza", "/proposals/new"],
  };
  const textOf = (h: string) => h.replace(/<style[^]*?<\/style>/g, "").replace(/<[^>]+>/g, " ").replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
  const same: string[] = [], offBad: string[] = [], onBad: string[] = [], diffBad: string[] = [];
  for (const [name, args] of ARGS) {
    const now = email[name](args), before = head[name](args), off = email[name]({ ...args, onBreak: false }), on = email[name]({ ...args, onBreak: true });
    if (now !== before || off !== before) same.push(name);
    const sol = SOLICITS[name];
    if (sol.some((s) => !off.includes(s))) offBad.push(name);
    if (sol.some((s) => on.includes(s))) onBad.push(`${name}: ${sol.filter((s) => on.includes(s)).join(" | ")}`);
    // Every occurrence: a button's label is drawn twice (Outlook's VML and the anchor).
    let stripped = textOf(off);
    for (const s of sol) stripped = stripped.split(s).join("");
    if (stripped.replace(/\s+/g, " ").trim() !== textOf(on)) diffBad.push(name);
  }
  ok("6.1 · OFF A BREAK every template renders byte for byte what HEAD's email.ts renders (the default and `onBreak: false` alike)", same.length === 0, same.join(", "));
  ok("6.2 · CONTROL · off a break each letter carries its solicitation: Invite more · Keep inviting friends (en+sw) · Propose another (en+sw)", offBad.length === 0, offBad.join(", "));
  ok("6.3 · ON A BREAK the soliciting lines and buttons are left out — each letter, each type", onBad.length === 0, onBad.join("; "));
  ok("6.4 · …and NOTHING ELSE moves: the on-break text is the off-break text with exactly those lines taken out (never reworded — the wallet sentence is cut at its own full stop)",
    diffBad.length === 0 && textOf(email.referralEarningHtml({ type: "BONUS", amountTzs: 1, onBreak: true })).includes("It's in your wallet.")
      && textOf(email.referralEarningHtml({ type: "BONUS", amountTzs: 1, onBreak: true })).includes("Ipo kwenye pochi yako."), diffBad.join(", "));
  // The senders: every send of a soliciting template asks the break at send time.
  const ESRC = code("src/lib/server/email.ts");
  const soliciting = [...ESRC.matchAll(/export function (\w+Html)\(\{[^}]*\bonBreak = false\b[^}]*\}/g)].map((m) => m[1]).sort();
  ok("6.5 · the soliciting templates are exactly the three that take `onBreak`", j(soliciting) === j(["proposalDeclinedHtml", "referralEarningHtml", "referralRewardHtml"]), j(soliciting));
  const sendCalls = (s: string): string[] => {
    const out: string[] = [];
    for (const m of s.matchAll(/\bsendEmailToUser\s*\(/g)) {
      if (/function\s+$/.test(s.slice(Math.max(0, (m.index ?? 0) - 20), m.index))) continue;
      let depth = 0, end = -1;
      for (let i = (m.index ?? 0) + m[0].length - 1; i < s.length; i++) {
        const c = s[i];
        if (c === '"' || c === "'" || c === "`") { const q = c; for (i++; i < s.length && s[i] !== q; i++) if (s[i] === String.fromCharCode(92)) i++; continue; }
        if (c === "(") depth++;
        else if (c === ")" && --depth === 0) { end = i; break; }
      }
      if (end > 0) out.push(s.slice(m.index ?? 0, end + 1));
    }
    return out;
  };
  const walk = (dir: string): string[] => readdirSync(join(ROOT, dir)).flatMap((f) => {
    const rel = `${dir}/${f}`;
    return statSync(join(ROOT, rel)).isDirectory() ? walk(rel) : /\.(ts|tsx)$/.test(f) ? [rel] : [];
  });
  const calls = walk("src").flatMap((f) => sendCalls(code(f)).map((c) => ({ f, c })));
  const solCalls = calls.filter(({ c }) => soliciting.some((t) => c.includes(`${t}(`)));
  const unaware = solCalls.filter(({ c }) => !/breakAware:\s*true/.test(c) || !/onBreak:\s*reader\.onBreak/.test(c) || !/\(email,\s*reader\)\s*=>/.test(c));
  ok("6.6 · CENSUS · every send of a soliciting template (4: the bonus, the prize, the commission, the decline) is `breakAware` and hands the template the reader's `onBreak`",
    solCalls.length === 4 && unaware.length === 0, `${solCalls.length} call(s) · ${unaware.map(({ f }) => f).join(", ")}`);
  ok("6.6′ PLANT · a send without `breakAware` is reported by the same reader",
    sendCalls('sendEmailToUser(u, (email, reader) => ({ to: email, html: referralRewardHtml({ onBreak: reader.onBreak }) }), { confirmedOnly: true });').every((c) => !/breakAware:\s*true/.test(c)));
  const STU = decl(ESRC, "export async function sendEmailToUser(");
  ok("6.7 · `sendEmailToUser` builds the letter with the break read AT SEND TIME, only for a send that asks (`breakAware`) — every other send reads nothing more",
    has(STU, "const input = build(email, { onBreak: opts.breakAware ? await recipientOnBreak(userId) : false });")
      && has(STU, "opts: { confirmedOnly?: boolean; breakAware?: boolean } = {},") && has(STU, "build: (email: string, reader: LetterReader) => SendInput,"));
  const ROB = decl(ESRC, "async function recipientOnBreak(");
  ok("6.8 · the read is R8-C's one break (`isLockedOut` → `breakStateOf`) and fails OPEN (it gates a solicitation, never a refusal)",
    has(ROB, 'const { isLockedOut } = await import("./responsible-gambling");') && has(ROB, "return breakStateOf(await isLockedOut(userId)) !== null;") && has(ROB, "} catch { return false; }"));
  // Every CTA in a letter that opens one of the three programmes: gated, or kept by name with its reason.
  const KEPT: Record<string, string> = {
    agentApprovedHtml: "the decision on the agent's own application; the dashboard (statement) stays reachable — owner question",
    agentCommissionEarnedHtml: "sent only after a credit, which `creditInternal` refuses during a break",
    agentRateChangedHtml: "the agent's own contract record; the dashboard stays reachable — owner question",
    agentInfoRequestedHtml: "the application's own record; /agent/apply answers a break with `agent.stateRgLocked` (R8-C)",
  };
  const decls = [...ESRC.matchAll(/export function (\w+Html)\(/g)].map((m) => m[1]);
  const doors: string[] = [];
  for (const name of decls) {
    const body = decl(ESRC, `export function ${name}(`);
    for (const m of body.matchAll(/(onBreak \? "" : )?ctaButton\(["`](\/(?:profile\/invite|proposals\/new|agent(?:\/apply)?))(?=["`?#])/g)) {
      if (!m[1] && !KEPT[name]) doors.push(`${name} → ${m[2]}`);
    }
  }
  ok("6.9 · CENSUS · every letter button into the three programmes is gated on the break or KEPT by name with its reason (4 kept) — a new one fails here",
    doors.length === 0 && Object.keys(KEPT).every((k) => decls.includes(k)), doors.join(", "));
}

/* ══ §7 · THE "FRIEND JOINED" NOTICE ═══════════════════════════════════════════════════════════════════════════════════ */
section("7 · the friend-joined notice — not written during the referrer's break (its one call site)");
{
  const AFF = code("src/lib/server/affiliate-service.ts");
  const GATE = "const referrerBreak = await Promise.resolve().then(() => isLockedOut(referrerUserId)).then(breakStateOf).catch(() => null);";
  const CALL = "if (!referrerBreak) notifyReferralJoined(referrerUserId, { recruitMasked: maskName(recruit.displayName, recruit.phoneE164) });";
  ok("7.1 · the bind reads the referrer's break (R8-C's one break, failing open) and writes the notice only off one", has(AFF, GATE) && has(AFF, CALL)
    && squash(AFF).indexOf(squash(GATE)) < squash(AFF).indexOf(squash(CALL)));
  const callers = (dir: string): string[] => readdirSync(join(ROOT, dir)).flatMap((f) => {
    const rel = `${dir}/${f}`;
    if (statSync(join(ROOT, rel)).isDirectory()) return f === "dev-test" ? [] : callers(rel);
    return /\.(ts|tsx)$/.test(f) && /notifyReferralJoined\(/.test(code(rel).replace(/export function notifyReferralJoined\(/, "")) ? [rel] : [];
  });
  ok("7.2 · CENSUS · that bind is the notice's only caller in the product (a second caller would have to ask the break too)", j(callers("src")) === j(["src/lib/server/affiliate-service.ts"]) && count(AFF, "notifyReferralJoined(") === 1, j(callers("src")));
}

/* ══ §8 · THE HELP CHAT ═══════════════════════════════════════════════════════════════════════════════════════════════ */
section("8 · the Help chat — no door to the three programmes during a break, and the model is sent nothing new (3 locales)");
const GUARD = req("../src/lib/chat/break-guard.ts") as typeof import("../src/lib/chat/break-guard.ts");
{
  const OFFER_Q: Record<L, string[]> = {
    en: ["How do I invite my friends?", "Where is my referral link?", "How can I propose a market?", "Can I become an agent?", "Tell me about the agent programme", "How does Propose & get paid work?"],
    sw: ["Nawezaje kualika marafiki?", "Alika marafiki iko wapi?", "Nawezaje kupendekeza soko?", "Mapendekezo ya masoko yanafanyaje kazi?", "Nataka kuwa wakala", "Uwakala unahitaji nini?", "Ninawezaje kuwaalika marafiki zangu?"],
    zh: ["我怎么邀请朋友？", "我的推荐链接在哪里？", "怎么提议市场？", "市场提议怎么运作？", "我想成为代理", "代理计划是什么？"],
  };
  const OFFER_A: Record<L, string[]> = {
    en: ["Open **Profile → Invite friends** to get your link (/profile/invite).", "Go to the **Proposals** board at /proposals and tap Propose a market.", "Earning commission belongs to vetted **Agent Affiliates** only."],
    sw: ["Nenda Wasifu → Alika marafiki upate kiungo chako.", "Nenda kwenye bodi ya **Mapendekezo** na ubonyeze Pendekeza soko."],
    zh: ["打开“邀请朋友”获取您的链接。", "前往“市场提议”提交提案。"],
  };
  const PLAIN: Record<L, string[]> = {
    en: ["How do I deposit?", "How do I withdraw?", "Can I talk to a support agent?", "What's the conviction dial?", "When do I get paid?",
      "I'd like to help with that. Let me direct you to our responsible gambling tools at Profile > Responsible Gambling, where you can set limits, take a break or self-exclude.",
      "I can explain how a market resolves, but I never recommend which side to pick."],
    sw: ["Nawezaje kuweka pesa?", "Unaweza kutoa pesa kupitia wakala wa M-Pesa.", "Sipendekezi upande wowote — ninaeleza tu jinsi soko linavyotatuliwa.", "Alikuwa ameshinda jana.", "Mapumziko yangu yanaisha lini?", "Walikuwa wengi sokoni, alikwenda nyumbani."],
    zh: ["我怎么充值？", "我推荐您设置存款限额。", "我可以联系客服代表吗？", "什么时候派奖？", "提现需要多久？"],
  };
  const DOOR_NAMES = LOCALES.flatMap((l) => [T[l].profile.inviteFriends, T[l].proposals.title, T[l].footer.proposeGetPaid, T[l].agent.footerLink]);
  const missQ = LOCALES.flatMap((l) => [...OFFER_Q[l], ...OFFER_A[l]].filter((s) => !GUARD.touchesAnOffer(s)).map((s) => `${l}: ${s}`));
  const missN = DOOR_NAMES.filter((s) => !GUARD.touchesAnOffer(s));
  const falsePos = LOCALES.flatMap((l) => PLAIN[l].filter((s) => GUARD.touchesAnOffer(s)).map((s) => `${l}: ${s}`));
  const ownWords = LOCALES.flatMap((l) => [sentenceOf(l, false), sentenceOf(l, true), T[l].chat.errorFallback]).filter((s) => GUARD.touchesAnOffer(s));
  ok("8.1 · the vocabulary catches a question or an answer about the three programmes, in sw, en and zh — and the product's own names for the three doors (read from the dictionary)",
    missQ.length === 0 && missN.length === 0, [...missQ, ...missN].join(" | "));
  ok("8.2 · …and NEVER an ordinary one: a support agent, an M-Pesa wakala, RULE 1's 'sipendekezi', 推荐 as 'recommend', 'alikuwa', RULE 2's at-risk line",
    falsePos.length === 0 && ownWords.length === 0, [...falsePos, ...ownWords].join(" | "));

  // EXECUTED: the reader's chat, run from its own source with the live call, the session and the break stood in for.
  type Live = { text: string; unresolved?: boolean } | null;
  let LIVE: Live = { text: "x" };
  let SESSION: unknown = { userId: "u1" };
  let LOCK: unknown = { locked: false, until: null, reason: null };
  const seen: unknown[][] = [];
  const reader = runText("src/app/_actions/chat-reader.ts", raw("src/app/_actions/chat-reader.ts"), {
    "./chat": { chatWithClaude: async (...a: unknown[]) => { seen.push(a); return LIVE; } },
    "@/lib/server/session": { getSession: async () => SESSION },
    "@/lib/server/responsible-gambling": { isLockedOut: async () => { if (LOCK === "throws") throw new Error("down"); return LOCK; } },
  }) as Record<string, (h: unknown, t: string, l: string) => Promise<Live>>;
  const ON = { locked: true, until: UNTIL, reason: "cooling_off" };
  const EXCL = { locked: true, until: UNTIL, reason: "self_exclusion" };
  const OFF = { locked: false, until: null, reason: null };
  const bad: string[] = [];
  const realNow = Date.now;
  Date.now = () => NOW;
  try {
    for (const l of LOCALES) {
      const H = [{ role: "user", content: "hi" }];
      // off a break: the live answer, untouched — even for a question about inviting.
      LOCK = OFF; LIVE = { text: OFFER_A[l][0] }; seen.length = 0;
      let r = await reader.chatForReader(H, OFFER_Q[l][0], l);
      if (r !== LIVE) bad.push(`${l}: off a break the answer was not passed through untouched`);
      if (seen.length !== 1 || seen[0][0] !== H || seen[0][1] !== OFFER_Q[l][0] || seen[0][2] !== l) bad.push(`${l}: the live call was not made with exactly (history, text, locale)`);
      // on a break, a question about a programme, answered without naming a door: the break's sentence.
      LOCK = ON; LIVE = { text: "Sure." }; seen.length = 0;
      r = await reader.chatForReader(H, OFFER_Q[l][0], l);
      if (r?.text !== sentenceOf(l, false)) bad.push(`${l}: an offer question on a break was answered ${j(r)}`);
      if (seen.length !== 1 || seen[0][1] !== OFFER_Q[l][0] || seen[0][2] !== l || seen[0].length !== 3) bad.push(`${l}: on a break the model was asked something else (${j(seen)})`);
      // on a break, an ordinary question whose answer names a door: the break's sentence.
      LIVE = { text: OFFER_A[l][0] };
      r = await reader.chatForReader(H, PLAIN[l][0], l);
      if (r?.text !== sentenceOf(l, false)) bad.push(`${l}: an answer naming a door got through on a break`);
      // on a break, an ordinary question and answer: passed through.
      LIVE = { text: PLAIN[l][1] };
      r = await reader.chatForReader(H, PLAIN[l][0], l);
      if (r !== LIVE) bad.push(`${l}: an ordinary answer on a break was replaced`);
      // on a break with no live answer: never the offline corpus.
      LIVE = null;
      r = await reader.chatForReader(H, PLAIN[l][0], l);
      if (r?.text !== T[l].chat.errorFallback || r?.unresolved !== true) bad.push(`${l}: no live answer on a break gave ${j(r)}`);
      // an exclusion says the exclusion's sentence.
      LOCK = EXCL; LIVE = { text: OFFER_A[l][0] };
      r = await reader.chatForReader(H, PLAIN[l][0], l);
      if (r?.text !== sentenceOf(l, true)) bad.push(`${l}: an exclusion did not say its own sentence`);
      // a failed read is no break; signed out is today's (null stays null — the offline answers a guest gets).
      LOCK = "throws"; LIVE = { text: OFFER_A[l][0] };
      r = await reader.chatForReader(H, OFFER_Q[l][0], l);
      if (r !== LIVE) bad.push(`${l}: a failed break read did not fail open`);
      SESSION = null; LOCK = ON; LIVE = null;
      r = await reader.chatForReader(H, OFFER_Q[l][0], l);
      if (r !== null) bad.push(`${l}: a signed-out reader did not get today's null`);
      SESSION = { userId: "u1" };
    }
  } finally { Date.now = realNow; }
  ok("8.3 · EXECUTED · sw/en/zh: off a break the live answer untouched; on a break an offer question or a door-naming answer gives way to the break's sentence (R8-C's words), an ordinary answer stands, no live answer is never the offline corpus, an exclusion says its own; a failed read and a guest are today's",
    bad.length === 0, bad.join("; "));
  const CR_SRC = code("src/app/_actions/chat-reader.ts");
  ok("8.4 · ⛔ the model is sent NOTHING NEW: chat-reader calls `chatWithClaude(history, userText, locale)` once, first, before it reads the session or the break; it exports one async action and nothing else",
    /^["']use server["'];/.test(CR_SRC.trim()) && count(CR_SRC, "chatWithClaude(") === 1 && has(CR_SRC, "const live = await chatWithClaude(history, userText, locale);")
      && CR_SRC.indexOf("chatWithClaude(history") < CR_SRC.indexOf("getSession()") && CR_SRC.indexOf("getSession()") < CR_SRC.indexOf("isLockedOut(")
      && [...CR_SRC.matchAll(/^export /gm)].length === 1 && has(CR_SRC, "export async function chatForReader("));
  const diff = (() => { try { git("diff", "--quiet", "HEAD", "--", "src/app/_actions/chat.ts"); return "clean"; } catch { return "changed"; } })();
  const CHAT = code("src/app/_actions/chat.ts");
  ok("8.5 · chat.ts is byte-identical to HEAD (D19a) — and its prompt is still built from the locale and one global setting alone (the privacy §4 premise `test:privacy-notice` §2c pins)",
    diff === "clean" && /system: buildSystemPrompt\(locale, \(await getGlobalConfig\(\)\)\.objectionWindowHours\)/.test(CHAT), diff);
  const ROOTSRC = code("src/components/chat/ChatRoot.tsx");
  ok("8.6 · ChatRoot's live call goes through the reader's chat, still after the at-risk check, still one call site",
    has(ROOTSRC, 'import { chatForReader as chatWithClaude } from "@/app/_actions/chat-reader";') && !ROOTSRC.includes('from "@/app/_actions/chat";')
      && count(ROOTSRC, "chatWithClaude(") === 1 && ROOTSRC.indexOf("atRiskReply(") < ROOTSRC.indexOf("chatWithClaude("));
  const { assuranceHits } = await import("./lib/house-bot-assurances.mjs") as { assuranceHits: (t: string) => unknown[] };
  const { houseHits } = await import("./lib/house-bot-vocabulary.mjs") as { houseHits: (t: string) => unknown[] };
  const said = LOCALES.flatMap((l) => [sentenceOf(l, false), sentenceOf(l, true), T[l].chat.errorFallback]);
  const hits = said.flatMap((s) => [...assuranceHits(s), ...houseHits(s)]);
  ok("8.7 · D19 / D19d · the two sentences the chat can now say instead (the break's, the try-again line) carry no assurance and no house word, in any locale (the house lane's own matchers)",
    hits.length === 0 && said.length === 9, j(hits));
}

/* ══ §9 · THE RECORDS ═════════════════════════════════════════════════════════════════════════════════════════════════ */
section("9 · the rulebook and the programme's own record");
{
  const DA = raw("docs/DESIGN_AUTHORITY.md");
  const rule8 = DA.slice(DA.indexOf("8. **During a break, nothing a break pauses is offered"), DA.indexOf("## L — The label law"));
  ok("9.1 · DESIGN_AUTHORITY §C rule 8 records the completion — services, share links, letters, the notice, the chat (and why not the prompt)",
    rule8.length > 0 && ["Completed on every other channel (R8-D, 2026-10-10)", "`payFeeFromWallet`", "`agentRgHold`", "`createProposal`", "SHARE LINK", "`breakAware`",
      "friend joined", "HELP CHAT", "not your account details", "`test:visual-pass-r8d`"].every((k) => rule8.includes(k)));
  const AP = raw("docs/AGENT-PROGRAMME.md");
  ok("9.2 · AGENT-PROGRAMME's fee table carries the row: refused during a break, before any money moves", AP.includes("| **During a break** | ⛔ **Refused, before any money moves** (R8-D, 2026-10-10"));
}

/* ══ §10 · WHAT DID NOT MOVE ══════════════════════════════════════════════════════════════════════════════════════════ */
section("10 · untouched — the dictionary, R8-C's one rule, the voting door");
{
  const clean = (p: string) => { try { git("diff", "--quiet", "HEAD", "--", p); return true; } catch { return false; } };
  ok("10.1 · no dictionary string changed (src/lib/i18n-dict.ts is HEAD's)", clean("src/lib/i18n-dict.ts"));
  ok("10.2 · R8-C's one rule is unchanged (viewer-doors.ts, hub-viewer.ts, app-shell.tsx are HEAD's)", clean("src/lib/journey/viewer-doors.ts") && clean("src/lib/server/hub-viewer.ts") && clean("src/components/layout/app-shell.tsx"));
  const PS = code("src/lib/server/proposals-service.ts");
  ok("10.3 · voting is kept by decision: castVote reads no break", !/isLockedOut|breakStateOf/.test(decl(PS, "export async function castVote(")));
}

console.log(`${LF}${fails.length === 0 ? "ALL PASS" : "FAILURES"} — test:visual-pass-r8d: ${pass} passed, ${fails.length} failed`);
for (const f of fails) console.log(`  · ${f}`);
process.exit(fails.length === 0 ? 0 : 1);
