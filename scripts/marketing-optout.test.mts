/**
 * test:marketing-optout — U8's opt-out page, EXECUTED.
 *
 * ⭐ THE ACCEPT LINE IS THE DESIGN: a number is stopped, started again, and stopped again in
 * ONE run, with the GATE asked after every step. Neither a page that always suppresses nor one
 * that never does can pass, and — the part that matters — neither can one that reports a
 * success it did not deliver. Every assertion below reads the gate or the store, never the
 * function's own return value alone.
 *
 * ⛔ IN-PROCESS BY CONSTRUCTION. `--prove-red` plants the pre-fix shapes IN MEMORY and requires
 * the MATCHING assertion to fire. This file makes no file-writing call of any kind, so it stays
 * outside `test:red-anchors` §4's undeclared-harness count.
 *
 * ⚠️ THE MODEL IS PROVEN FAITHFUL BEFORE IT IS USED TO PLANT ANYTHING. `pageWithDefect({})` is
 * asserted to agree with the shipped service on every step. Without that, a red case going red
 * would be evidence about the model rather than about the product.
 *
 * ⭐ D6 (2026-09-26) added: a case-insensitive token (31), resume lifting only a stop the person made
 * (32), the RESUME row recording the consent sentence and never the stop instruction (15), the live
 * token kept out of evidence (8), a self-repairing `already` (34), a mint that normalises its number
 * (35), no self-excluded toggle switched on from a link (36) and a GET budget only misses spend (37) —
 * each with its own red plant — plus the minimal shell, the overlay patterns and the copy rules (S17+).
 * ⭐ The acts' budget (38a–c) runs through the object under test too, so its three plants reach it; and
 * the surface checks (S5–S21) have their OWN plants — an in-memory edit of the source TEXT or the
 * dictionary they read, whose anchor must resolve exactly once — so a static check is also proven
 * capable of failing.
 * ⭐ 2026-09-27 added: a dry budget reads as BUSY, never "this link does not work" (37c); a retry on the
 * busy and failed refusals (S5d); our desk under a failed tap (S18h); a skeleton built from the page's
 * own parts, visible, with its read-aloud line last (S6b–d); the helpline under its responsible-gambling
 * line and a label-free 18+ (S20d); the shell matching bare `/s` and one segment only (S21b); and bare
 * `/s` as the refusal rather than a 404 inside the stripped shell (S23) — each with its own plant.
 * ⭐ And from the final visual review: a failed tap moves nothing under the thumb (S18i), the pending label
 * stays readable (S18j), zh keeps its words whole on the headings and notices (S18k, S7h: break hints
 * where break-keep relies on them, none in ledger evidence), and the refusal's buttons are one group (S5e).
 *
 * Run:  npm run test:marketing-optout
 * Red:  npm run red:marketing-optout
 */
process.env.SESSION_SECRET ??= "test-only-session-secret-32chars-min-aaaa";

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { db } from "../src/lib/server/store.ts";
import type { StoredUser, MessagingKey, MessagingLocale, SuppressionReason } from "../src/lib/server/store.ts";
import { maskPhone, toMsisdn255 } from "../src/lib/phone-normalize.ts";
import { mayReceiveMarketingSms } from "../src/lib/server/marketing/consent.ts";
import {
  resolveOptOutToken, stopMarketing, resumeMarketing, mintOptOutToken,
  optOutWording, OPTOUT_MINT_ATTEMPTS, personMayLift,
  resolveOptOutTokenWithinBudget, stopMarketingWithinBudget, OPTOUT_BUDGET, refusalKindFor,
} from "../src/lib/server/marketing/optout-service.ts";
import type { OptOutActResult, OptOutPageResolution } from "../src/lib/server/marketing/optout-service.ts";
import { OPTOUT_TOKEN_CHARS, OPTOUT_PATH } from "../src/lib/marketing/footer.ts";
import {
  OPTOUT_TOKEN_ALPHABET, isOptOutTokenShape, normalizeOptOutToken, optOutTokenRef, isOptOutPath,
} from "../src/lib/marketing/optout.ts";
import { rateCheckAsync, rateRefundAsync, RATE_RULES } from "../src/lib/server/rate-limit.ts";
import { getAuditForTargetsDurable } from "../src/lib/server/audit.ts";
import { gaExcluded } from "../src/lib/google-tag.ts";
import { isProtectedPath } from "../src/proxy.ts";
import { dict } from "../src/lib/i18n-dict.ts";
import { KEEP_WORDS, TITLE_TEXT, NOTICE_TEXT, ACT_SENTENCE } from "../src/app/s/[token]/optout-classes.ts";

/* ⛔ FAILURE IS THE DEFAULT, SET BEFORE THE FIRST `await`. A suite whose verdict is written only
 * at the end scores GREEN when a promise never settles or the process exits early. */
process.exitCode = 1;

const PROVE_RED = process.argv.includes("--prove-red");
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

let pass = 0, fail = 0;
const failed: string[] = [];
const ok = (l: string, c: boolean, x = "") => {
  if (c) pass++; else { fail++; failed.push(l); }
  console.log(`${c ? "PASS" : "FAIL"} ${l}${x ? ` — ${x}` : ""}`);
};

/* ══ THE SHAPE UNDER TEST ═══════════════════════════════════════════════════════════════════
 * The page's two acts, as one object, so a defect can be planted into exactly one of them. */
type OptOutPage = {
  stop: (token: string, locale: MessagingLocale) => Promise<OptOutActResult>;
  resume: (token: string, locale: MessagingLocale) => Promise<OptOutActResult>;
  /** ⭐ THE READ IS PART OF THE SHAPE, AND LEAVING IT OUT MADE A CHECK THAT COULD NOT FAIL.
   *  Assertion 23 first called the SHIPPED `resolveOptOutToken` directly, so the expiry plant
   *  — which lives in the model's own resolution — never reached it and case 1 stayed green
   *  against a page whose links expire. Every question the suite asks now goes through the
   *  object under test. */
  resolve: (token: string) => Promise<{ ok: boolean }>;
  /** ⭐ The page's GET, within its budget (D6) — a miss spends, a hit is refunded. */
  resolveWithin: (token: string, clientKey: string) => Promise<{ ok: boolean; reason?: string }>;
  /** ⭐ Which refusal the page shows for a read's answer (`refusalKindFor`) — null renders the button. */
  refusalKind: (r: { ok: boolean; reason?: string } | null) => string | null;
  /** ⭐ The STOP act, within the same budget plus the per-link cap (D6). */
  stopWithin: (token: string, locale: MessagingLocale, clientKey: string) => Promise<OptOutActResult>;
  /** ⭐ The mint is in the shape so its number normalisation can be planted away (D6). */
  mint: (identifier: string) => Promise<string | null>;
  /** ⭐ "Is this number still refusing?" — the DAL's own question, in the shape, so the strict
   *  `=== null` predicate that failed OPEN can be planted and proven to fire. An assertion no
   *  plant can reach is an assertion that cannot fail. */
  isSuppressed: (key: MessagingKey) => Promise<boolean>;
  /** ⭐ Does the RENDERED page put a confirmation step between the tap and the write? */
  confirms: boolean;
};

const SHIPPED: OptOutPage = {
  stop: stopMarketing, resume: resumeMarketing, resolve: resolveOptOutToken,
  resolveWithin: resolveOptOutTokenWithinBudget,
  refusalKind: (r) => refusalKindFor(r as OptOutPageResolution | null),
  stopWithin: stopMarketingWithinBudget,
  mint: mintOptOutToken,
  isSuppressed: async (key) => (await Promise.resolve(db.suppression.find(key))) !== null,
  confirms: false,
};

/* ══ THE D6 ASSERTION LABELS — named once, because the red cases below must quote them exactly ══ */
const L = {
  evidence: "8 · ⛔ §5.14 + D6 — the evidence carries a token REFERENCE, never the live token and never a raw phone number",
  resumeWording: "15 · ⛔ D6 — the GIVEN row records the CONSENT sentence shown beside the button (`push.marketingBody`), never the stop instruction",
  lower: "31 · ⭐ D6 — a token typed in LOWER or MIXED case resolves and stops the same number (URL bars do not capitalise)",
  operator: "32 · ⛔ D6 — 'start them again' on an OPERATOR suppression lifts NOTHING and writes no consent: one tap on an old SMS never undoes a stop somebody else made",
  repair: "34 · 🔴 D6 — a STOP whose ledger write failed is REPAIRED by the retry: the latest ledger row is WITHDRAWN and the player's toggle is off",
  mint: "35 · 🔴 D6 — a token minted from `+255…` (User.phoneE164) is keyed bare, so its STOP makes the gate refuse the number ON ITS SUPPRESSION",
  selfExcluded: "36 · ⛔ D6 — a SELF-EXCLUDED player's toggle is never switched back on from an unauthenticated link",
  walkerDry: "37a · ⭐ D6 — a walker's MISSES run the GET budget dry, and a dry budget makes no lookup at all",
  personFree: "37b · ⭐ D6 — a person opening their OWN valid link never spends the budget, however often",
  busy: "37c · 🔴 2026-09-27 — a dry budget reads as BUSY (nothing changed, try again), never 'this link does not work'; malformed and unknown stay ONE sentence, and a failed read is 'did not go through'",
  actWalker: "38a · ⭐ D6 — a script POSTing unknown tokens runs its address dry and is then refused with `error`, never a success",
  linkCap: "38b · ⭐ D6 — one valid link's acts are capped per LINK (no ledger flood from a held token), and the first taps all land",
  hitFree: "38c · …and a hit costs the ADDRESS nothing",
} as const;

/* ══ THE SURFACE LABELS — named once, because the surface plants below must quote them exactly ══ */
const SL = {
  mask: "S5 · the page renders a MASKED number, never the raw one (§5.14)",
  refusalNoTap: "S5b · ⛔ the invalid-token refusal does NOT tell the reader to tap a button that is not there",
  nextStep: "S5c · ⭐ D6 — the refusal names a next step: the profile toggle (a plain <a>, never <Link>) and our desk from `support-config`",
  retry: "S5d · 🔴 2026-09-27 — the page picks its refusal through `refusalKindFor`, and the BUSY and FAILED refusals offer a retry of the same link (a plain <a>); the invalid one does not",
  loadingOne: "S6 · ⭐ D6 — the loading state describes ONE button and says its words to a screen reader",
  loadingSame: "S6b · ⭐ 2026-09-27 — the skeleton is the page's OWN parts: `PageHeader`, the shared classes (`optout-classes.ts`) and the same strings, as transparent text on bars, so every line wraps where the real one will",
  loadingOrder: "S6c · 🔴 2026-09-27 — the read-aloud line is the LAST child of the spaced stack, never the first (its gap drew the stop button 24px low at 360)",
  loadingVisible: "S6d · 🔴 2026-09-27 — the skeleton is VISIBLE: bars and the action take the shared loader's surface (elevated, bordered), never a ~1:1 overlay tint, and the action says its words on screen",
  headings: (loc: string) => `S7c.${loc} · ⭐ D6 — idle, stopped and resumed each have their OWN heading`,
  noPromise: (loc: string) => `S7d.${loc} · ⛔ D6 — the resumed sentence and heading make NO delivery promise`,
  notOurs: (loc: string) => `S7e.${loc} · ⛔ D6 — the invalid-link sentence never says the link is "not ours"`,
  placeholders: (loc: string) => `S7f.${loc} · the next-step sentence names the toggle and the path by placeholder, so a rename cannot strand it`,
  noun: (loc: string) => `S7g.${loc} · ⭐ 2026-09-27 — every heading and the stop button name what they stop with the consent's own noun (\`push.marketingTitle\`), and no opt-out sentence uses an older name`,
  serverAnswer: "S8 · ⛔ the success sentence is rendered from the SERVER'S ANSWER, never painted on the click",
  noConfirm: "S9 · ⛔ NO CONFIRMATION STEP CAN EXIST — the component's state union is exactly the five outcomes, with no step between the tap and the write",
  heading: "S18 · ⭐ D6 — the heading is chosen from the state (stopped / resumed / idle), never fixed",
  consentBeside: "S18b · ⛔ D6 — the resume button carries its OWN consent sentence (`push.marketingBody`), and the stop instruction is not beside it",
  announced: "S18c · ⭐ D6 — the answer is ANNOUNCED (status, or alert for a failure) and focus moves to it",
  sameAct: "S18d · 🔴 D6 — a failed act keeps offering THE SAME act: the button follows `isSuppressed`, moved only by an ok answer",
  caught: "S18e · 🔴 D6 — a REJECTED action is this page's own error sentence, never the root error boundary",
  bodySize: "S18f · ⭐ D6 — the confirmation is body text (`md`), never an 11px footnote",
  budgeted: "S18g · the acts go through the BUDGETED service, from a request-read address",
  contactOnError: "S18h · ⭐ 2026-09-27 — a failed tap shows our desk (phone and email, read on the SERVER) under the error, and the client never reads the support config",
  errorBelow: "S18i · 🔴 2026-09-27 — a failed tap moves NOTHING under the thumb: the alert and our desk come after the button, what is above it reads the last OK answer, and the alert takes focus without a scroll",
  busyLegible: "S18j · ⭐ 2026-09-27 — the tapped button stays READABLE while its answer is on the way (the disabled dim is outranked on a busy button)",
  wrap: "S18k · ⭐ 2026-09-27 — the headings and notices keep zh words whole (break-keep, only on strings that carry break hints) and never end on one word; the ledger's sentence gets text-pretty only",
  hints: (loc: string) => `S7h.${loc} · ⭐ 2026-09-27 — every opt-out string set break-keep carries its break hints, and the strings the LEDGER stores carry none`,
  stepsGroup: "S5e · ⭐ 2026-09-27 — the refusal's two buttons are their OWN group, one shared width and a real gap, with our desk as a separate group below",
  shellFirst: "S20 · ⭐ D6 — `/s` gets its own shell, decided BEFORE the session read (an ended session's redirect would put the opt-out behind a login)",
  noUpsell: "S20b · ⛔ D6 — the opt-out shell carries NO sign-in/up, nav, rail, footer menus, invitations or soft links",
  shellCarries: "S20c · ⭐ …and it DOES carry the logo, the language menu, the landmark, the skip link and the regulator lines",
  rgContext: "S20d · ⭐ 2026-09-27 — the helpline sits UNDER its responsible-gambling sentence (alone it read as our own line), and the 18+ roundel carries no aria-label (ARIA prohibits one on a generic span)",
  overlay: (file: string) => `S21 · ⛔ D6 — ${file} stays off the opt-out page, and only off it`,
  shellMatch: "S21b · the shell's own test is a SEGMENT match built from `OPTOUT_PATH` — bare `/s` and `/s/<one segment>` only; a deeper path gets the FULL shell, so its 404 never renders inside the stripped one",
  bare: "S23 · 🔴 2026-09-27 — bare `/s` (a link that lost its token) is the opt-out REFUSAL, not the root 404 inside the stripped shell — noindex and force-dynamic",
} as const;

/** ⭐ The shell's path test, held in a variable so a surface case can swap the old any-`/s/…` match back in. */
let shellMatch: (p: string) => boolean = isOptOutPath;

/* ══ SURFACE PLANTS — the S-checks read source TEXT, so a plant is an in-memory edit of that text ══
 * ⛔ Never written to disk (see the header). `from` must occur EXACTLY ONCE in the file as it is now, or
 * the red run reports the plant as rotted instead of passing over nothing. */
type SurfacePlant = { file: string; from: string; to: string };
let SURFACE_PLANT: SurfacePlant | null = null;
let surfacePlantHits = -1;

/** ⚠️ A token of the right SHAPE that nobody minted, FRESH on every call. The acts' cap is keyed per
 *  LINK, so a miss token shared between runs would reach the next run's walker already dry and answer
 *  `error` from its first tap — a run-order artefact, not a property of the page. */
let missSeq = 0;
function freshMissToken(): string {
  let n = ++missSeq, s = "";
  for (let i = 0; i < 5; i++) { s = OPTOUT_TOKEN_ALPHABET[n % OPTOUT_TOKEN_ALPHABET.length] + s; n = Math.floor(n / OPTOUT_TOKEN_ALPHABET.length); }
  return `ZZZ${s}`.slice(0, OPTOUT_TOKEN_CHARS);
}

/* ══ FIXTURES ═══════════════════════════════════════════════════════════════════════════════
 * Every run takes its OWN block of numbers: the memory store is a process-global map, so a red
 * case reusing the green case's numbers would assert against rows a previous run left behind. */
let seq = 0;
const phoneFor = (run: number, idx: number): string => `07${String(20000000 + run * 100 + idx)}`;
const keyFor = (identifier: string): MessagingKey =>
  ({ channel: "SMS", identifier, category: "MARKETING" });

function makeUser(id: string, phoneE164: string, over: Partial<StoredUser>): StoredUser {
  const now = new Date().toISOString();
  return {
    id, phoneE164,
    passwordHash: null, passwordSalt: null, failedLoginCount: 0, lockedUntil: null,
    role: "PLAYER", status: "ACTIVE", locale: "SW", displayName: null,
    dob: "1990-01-01", region: null, acceptedTermsVersion: "v1", acceptedTermsAt: now,
    marketingOptIn: true, twoFactorEnabled: false, avatarDataUrl: null,
    createdAt: now, updatedAt: now, lastLoginAt: now, closedAt: null,
    ...over,
  };
}

type Fixtures = {
  run: number;
  /** A contact with a consent row and a minted token — the ordinary recipient. */
  contactToken: string; contactPhone: string;
  /** ⭐ A PLAYER, so the profile-toggle half is exercised rather than assumed. */
  playerToken: string; playerPhone: string; playerId: string;
  /** A token minted a YEAR ago — OD43 says it still works. */
  ancientToken: string;
  /** Well-formed, never minted. */
  unknownToken: string;
  /** ⭐ A suppression written BEFORE the lift field existed — no `liftedAt` on it at all. */
  legacyPhone: string;
  /** D6 · a number whose link is typed in lower case. */
  caseToken: string; casePhone: string;
  /** D6 · a number an OFFICER suppressed, with a link of its own. */
  operatorToken: string; operatorPhone: string;
  /** D6 · a PLAYER whose stop half-lands (the ledger write fails once). */
  repairToken: string; repairPhone: string; repairId: string;
  /** D6 · a SELF-EXCLUDED player who stopped by link and then taps "start them again". */
  seToken: string; sePhone: string; seId: string;
  /** D6 · a number handed to the mint in the `+255…` form. */
  plusPhone: string;
};

async function seed(run: number): Promise<Fixtures> {
  const p = (i: number) => phoneFor(run, i);

  const consent = async (phone: string, when: string) =>
    Promise.resolve(db.messagingConsent.create({
      id: `oc${run}-${seq++}`, channel: "SMS", identifier: toMsisdn255(phone), category: "MARKETING",
      status: "GIVEN", source: "IMPORT", wording: "Ninakubali kupokea matangazo kwa SMS.",
      locale: "SW", evidence: "fixture", recordedBy: null, createdAt: when,
    }));

  /** ⛔ Minted through the REAL service, not hand-built: a fixture that builds its own token
   *  proves nothing about the code that has to build one on production. */
  const mint = async (phone: string): Promise<string> => {
    const tok = await mintOptOutToken(toMsisdn255(phone));
    if (!tok) throw new Error("the fixture could not mint a token");
    return tok;
  };

  // A · a plain contact, consented, with a link
  const contactPhone = p(1);
  await consent(contactPhone, "2026-01-01T00:00:00.000Z");
  const contactToken = await mint(contactPhone);

  // B · a PLAYER with the toggle ON — `userPhoneKeyFor` is the only way to reach them
  const playerPhone = p(2);
  const playerId = `ou${run}-${seq++}`;
  await Promise.resolve(db.user.create(makeUser(playerId, `+${toMsisdn255(playerPhone)}`, { marketingOptIn: true })));
  const playerToken = await mint(playerPhone);

  // C · ⭐ A TOKEN MINTED A YEAR AGO. OD43: the link NEVER expires.
  const ancientPhone = p(3);
  await consent(ancientPhone, "2025-01-01T00:00:00.000Z");
  const ancientToken = await mint(ancientPhone);
  const aged = await Promise.resolve(db.marketingOptOutToken.find(ancientToken));
  if (aged) aged.createdAt = new Date(Date.now() - 400 * 86400_000).toISOString();

  // D · a token of the right SHAPE that was never minted
  const unknownToken = OPTOUT_TOKEN_ALPHABET.slice(0, OPTOUT_TOKEN_CHARS);

  // E · 🔴 A SUPPRESSION ROW WRITTEN BEFORE `liftedAt` EXISTED — the field is absent, not null.
  // ⚠️ RUN-SCOPED, AND THE FIRST DRAFT WAS NOT, WHICH MADE ITS RED CASE UNFAILABLE. The number
  // was derived from the tag's LENGTH, so every red case shared one row — and `create` is
  // idempotent, so the second case through re-armed it and wrote `liftedAt: null` onto it. By
  // the case that plants the strict predicate the row was no longer legacy, and the plant
  // stayed green against a defect that was really there. A fixture that stops being the shape
  // it is named for is a control that has quietly stopped controlling.
  const legacyPhone = p(4);
  await Promise.resolve(db.suppression.create({
    id: `legacy${run}-${seq++}`, channel: "SMS", identifier: toMsisdn255(legacyPhone),
    category: "MARKETING", reason: "WITHDRAWN",
    evidence: "a row written before the lift existed", recordedBy: null,
    createdAt: "2026-01-01T00:00:00.000Z",
  } as unknown as Parameters<typeof db.suppression.create>[0]));

  // F · D6 — a consented contact whose link will be typed in lower case
  const casePhone = p(5);
  await consent(casePhone, "2026-01-01T00:00:00.000Z");
  const caseToken = await mint(casePhone);

  // G · D6 — an OFFICER's suppression on a number that also has a link
  const operatorPhone = p(6);
  await consent(operatorPhone, "2026-01-01T00:00:00.000Z");
  const operatorToken = await mint(operatorPhone);
  const suppress = async (phone: string, reason: SuppressionReason, evidence: string) =>
    Promise.resolve(db.suppression.create({
      id: `sup${run}-${seq++}`, channel: "SMS", identifier: toMsisdn255(phone), category: "MARKETING",
      reason, evidence, recordedBy: "officer-fixture", createdAt: "2026-02-01T00:00:00.000Z",
      liftedAt: null, liftedReason: null,
    }));
  await suppress(operatorPhone, "OPERATOR", "officer:fixture");

  // H · D6 — a PLAYER, toggle ON, whose STOP will half-land
  const repairPhone = p(7);
  const repairId = `our${run}-${seq++}`;
  await Promise.resolve(db.user.create(makeUser(repairId, `+${toMsisdn255(repairPhone)}`, { marketingOptIn: true })));
  await consent(repairPhone, "2026-01-01T00:00:00.000Z");
  const repairToken = await mint(repairPhone);

  // I · D6 — a SELF-EXCLUDED player who already stopped by link (toggle off, WITHDRAWN row)
  const sePhone = p(8);
  const seId = `ouse${run}-${seq++}`;
  await Promise.resolve(db.user.create(makeUser(seId, `+${toMsisdn255(sePhone)}`, { marketingOptIn: false, status: "SELF_EXCLUDED" })));
  const seToken = await mint(sePhone);
  await suppress(sePhone, "WITHDRAWN", `optout:${optOutTokenRef(seToken)}`);

  // J · D6 — a number that will be handed to the mint as `+255…`
  const plusPhone = p(9);

  return {
    run, contactToken, contactPhone, playerToken, playerPhone, playerId, ancientToken, unknownToken, legacyPhone,
    caseToken, casePhone, operatorToken, operatorPhone, repairToken, repairPhone, repairId, seToken, sePhone, seId,
    plusPhone,
  };
}

/* ══ THE ASSERTIONS ═════════════════════════════════════════════════════════════════════════ */
async function runAssertions(page: OptOutPage, f: Fixtures, tag: string): Promise<void> {
  const p = (n: string) => `${tag}${n}`;
  const SW: MessagingLocale = "SW";
  /** ⭐ THE QUESTION THAT MATTERS — not what the page returned, but what the SEND LOOP will do. */
  /**
   * 🔴 AND *WHY* THE LOOP REFUSES, WHICH IS NOT THE SAME QUESTION — this distinction was found
   * by the red control and it is the sharpest thing in this file.
   *
   * Case 4 plants `update: {}`, so re-suppression hands back a LIFTED row. Asking only "is this
   * number refused" stayed GREEN through it, because the WITHDRAWN ledger row written by the
   * same act refuses them anyway. The suppression is the belt and the ledger is the braces; the
   * plant cuts the belt, and a check on the combined verdict cannot see it.
   * ⛔ So the assertion names the MECHANISM. A number that opted out must be refused BY ITS
   * SUPPRESSION ROW — because any later GIVEN row (an import, an operator, the profile toggle)
   * would speak over a ledger, and nothing speaks over a suppression.
   */
  const refusedBy = async (phone: string): Promise<string> => {
    const v = await mayReceiveMarketingSms(phone);
    return v.ok ? "ALLOWED" : v.skipReason;
  };
  const rows = async (phone: string) => Promise.resolve(db.suppression.listFor(toMsisdn255(phone)));

  // ── 1 · ONE CLICK, AND THE GATE AGREES ──────────────────────────────────────────────────
  // ⚠️ Since U11 (S7) a contact-only number is refused on AGE until U33 records an 18+ attestation, so
  // "may be marketed" is no longer the pre-stop state. What this suite needs is the pre-stop VERDICT, to
  // prove that a stop changes it to `suppressed` and a resume gives it back — the lift's real property.
  const preStop = await refusedBy(f.contactPhone);
  ok(p("1 · before anything, a consented contact is refused ONLY on age (U11) — never on suppression"),
    preStop === "age_unknown", `refused by ${preStop}`);
  const stopped = await page.stop(f.contactToken, SW);
  ok(p("2 · the stop reports success"), stopped.ok && stopped.state === "stopped", JSON.stringify(stopped));
  ok(p("3 · ⭐ …and the GATE now refuses the number, ON ITS SUPPRESSION — the success is a claim about the database, not about the request"),
    (await refusedBy(f.contactPhone)) === "suppressed", `refused by ${await refusedBy(f.contactPhone)}`);
  ok(p("4 · ⛔ ONE CLICK — the page puts no confirmation step between the tap and the write"),
    page.confirms === false);

  // ── 2 · THE WITHDRAWAL IS EVIDENCE, NOT JUST A FLAG ─────────────────────────────────────
  const ledger = await Promise.resolve(db.messagingConsent.latestFor(keyFor(toMsisdn255(f.contactPhone))));
  ok(p("5 · a WITHDRAWN ledger row was appended"), ledger?.status === "WITHDRAWN", `got ${ledger?.status}`);
  ok(p("6 · ⛔ VERBATIM (§5.7) — the row stores the SENTENCE this person read, not a key into today's copy"),
    ledger?.wording === optOutWording("STOP", SW) && ledger.wording.includes(dict.sw.optout.body),
    `stored ${JSON.stringify(ledger?.wording?.slice(0, 40))}`);
  ok(p("7 · the ledger row names the opt-out page as its source"), ledger?.source === "OPT_OUT_PAGE");
  const supRow = (await rows(f.contactPhone))[0];
  ok(p(L.evidence),
    ledger?.evidence === `optout:${optOutTokenRef(f.contactToken)}`
      && !ledger.evidence.includes(f.contactToken)
      && !ledger.evidence.includes(toMsisdn255(f.contactPhone))
      && supRow?.evidence === `optout:${optOutTokenRef(f.contactToken)}`,
    `ledger ${ledger?.evidence} · suppression ${supRow?.evidence}`);

  // ── 3 · TAPPING STOP TWICE IS NOT AN ERROR, AND NOT A SECOND ROW ────────────────────────
  const again = await page.stop(f.contactToken, SW);
  ok(p("9 · stopping an already-stopped number says so plainly rather than failing"),
    again.ok && again.state === "already", JSON.stringify(again));
  ok(p("10 · …and it did NOT write a second suppression row"), (await rows(f.contactPhone)).length === 1,
    `${(await rows(f.contactPhone)).length} rows`);

  // ── 4 · 🔴 RESUBSCRIBE — THE BUTTON THAT COULD NOT HAVE WORKED ──────────────────────────
  // U6 shipped `Suppression` with no lift path and the gate asks suppression FIRST, so before
  // `liftedAt` this button would have reported a success while the row went on refusing for ever.
  const firstRow = (await rows(f.contactPhone))[0];
  const resumed = await page.resume(f.contactToken, SW);
  ok(p("11 · the resubscribe reports success"), resumed.ok && resumed.state === "resumed", JSON.stringify(resumed));
  ok(p("12 · 🔴 …and the GATE GIVES BACK ITS PRE-STOP ANSWER, not `suppressed` — without this, 'start them again' is a false success"),
    (await refusedBy(f.contactPhone)) === preStop, `refused by ${await refusedBy(f.contactPhone)}, before the stop ${preStop}`);
  ok(p("13 · ⛔ A LIFT NEVER REMOVES A ROW (OD11) — the evidence that they once said no survives"),
    (await rows(f.contactPhone)).length === 1, `${(await rows(f.contactPhone)).length} rows`);
  const lifted = (await rows(f.contactPhone))[0];
  ok(p("14 · ⭐ …and the ORIGINAL refusal date is untouched, so 'when did they say no' is still answerable"),
    lifted !== undefined && lifted.createdAt === firstRow?.createdAt && lifted.liftedAt !== null,
    lifted ? `createdAt ${lifted.createdAt} liftedAt ${lifted.liftedAt}` : "the row is gone");
  ok(p("14b · ⛔ D6 — the lift's own reason names the token REFERENCE, never the live token"),
    !!lifted?.liftedReason && !lifted.liftedReason.includes(f.contactToken), `liftedReason ${lifted?.liftedReason}`);
  const gaveConsent = await Promise.resolve(db.messagingConsent.latestFor(keyFor(toMsisdn255(f.contactPhone))));
  ok(p(L.resumeWording),
    gaveConsent?.status === "GIVEN" && gaveConsent.wording === optOutWording("RESUME", SW)
      && gaveConsent.wording.includes(dict.sw.push.marketingBody) && !gaveConsent.wording.includes(dict.sw.optout.body),
    `stored ${JSON.stringify(gaveConsent?.wording?.slice(0, 60))}`);

  // ── 5 · 🔴 STOP → START → STOP, THE SECOND FALSE SUCCESS ────────────────────────────────
  // Once a row can be lifted, re-suppression comes back through an upsert. A create that left
  // the LIFTED row untouched would tell the person they will never be marketed again while the
  // suppression stayed lifted — the same lie, pointing the other way.
  const reStopped = await page.stop(f.contactToken, SW);
  ok(p("16 · stopping again after a resubscribe reports success"),
    reStopped.ok && reStopped.state === "stopped", JSON.stringify(reStopped));
  ok(p("17 · 🔴 …and the GATE REFUSES IT AGAIN ON THE SUPPRESSION ITSELF — re-suppression must RE-ARM a lifted row, not hand it back"),
    (await refusedBy(f.contactPhone)) === "suppressed", `refused by ${await refusedBy(f.contactPhone)}`);
  const reRow = (await rows(f.contactPhone))[0];
  ok(p("18 · ⭐ …and it STILL did not move the original refusal date, and still did not add a row"),
    (await rows(f.contactPhone)).length === 1 && reRow !== undefined
      && reRow.createdAt === firstRow?.createdAt && reRow.liftedAt === null,
    reRow ? `createdAt ${reRow.createdAt} liftedAt ${reRow.liftedAt}` : "the row is gone");

  // ── 6 · THE PLAYER BRANCH — `userPhoneKeyFor` or this reaches nobody ────────────────────
  const beforeToggle = await Promise.resolve(db.user.findById(f.playerId));
  ok(p("19 · the player's own marketing toggle starts ON"), beforeToggle?.marketingOptIn === true);
  await page.stop(f.playerToken, SW);
  const afterToggle = await Promise.resolve(db.user.findById(f.playerId));
  ok(p("20 · ⭐ stopping from the LINK turns the PLAYER'S OWN PROFILE TOGGLE off — `User.phoneE164` is `+255…` and the marketing key is bare `255…`, so a bare lookup would have found nobody and silently done nothing"),
    afterToggle?.marketingOptIn === false, `toggle is ${afterToggle?.marketingOptIn}`);
  ok(p("21 · …and the gate refuses the player, on the suppression"),
    (await refusedBy(f.playerPhone)) === "suppressed", `refused by ${await refusedBy(f.playerPhone)}`);
  await page.resume(f.playerToken, SW);
  ok(p("22 · a resubscribe turns the player's toggle back on"),
    (await Promise.resolve(db.user.findById(f.playerId)))?.marketingOptIn === true);

  // ── 7 · OD43 · THE LINK NEVER EXPIRES ───────────────────────────────────────────────────
  const old = await page.resolve(f.ancientToken);
  ok(p("23 · ⭐ A TOKEN MINTED 400 DAYS AGO STILL RESOLVES (OD43) — a link that stops working is a person who cannot leave"),
    old.ok, old.ok ? "" : "the page refused a link it minted");
  const oldStop = await page.stop(f.ancientToken, SW);
  ok(p("24 · …and it still stops the marketing"), oldStop.ok && oldStop.state === "stopped", JSON.stringify(oldStop));

  // ── 8 · ⛔ A BAD TOKEN NEVER SHOWS A FALSE SUCCESS ──────────────────────────────────────
  const unknown = await page.stop(f.unknownToken, SW);
  ok(p("25 · ⛔ AN UNMINTED TOKEN IS REFUSED, NEVER QUIETLY SUCCEEDED — a success nobody can act on is the defect this unit exists to prevent"),
    unknown.ok === false, JSON.stringify(unknown));
  const malformed = await page.stop("nope", SW);
  ok(p("26 · a malformed token is refused too"), malformed.ok === false, JSON.stringify(malformed));
  ok(p("27 · ⛔ …and BOTH are refused, so `/s/` never becomes an oracle telling a stranger which tokens are live"),
    unknown.ok === false && malformed.ok === false);
  ok(p("28 · a refused token wrote NO suppression row for anybody"),
    (await Promise.resolve(db.suppression.listFor(f.unknownToken))).length === 0);

  // ── 9 · 🔴 THE LIFT IS READ FALSILY, SO A MISSING FIELD STILL REFUSES ──────────────
  // Found by running U7's suite after `liftedAt` landed, not by reasoning: the first version
  // asked `r.liftedAt === null`, which is FALSE for a row that carries no lift field at all —
  // so a suppression written by any caller that had not been updated came back as LIFTED, and a
  // person who said stop was handed to the send loop as marketable. It failed OPEN.
  // ⛔ A row is REFUSING unless somebody explicitly lifted it. This plants the exact shape:
  // a row with no lift on it whatsoever.
  const legacyKey = keyFor(toMsisdn255(f.legacyPhone));
  ok(p("29 · 🔴 A SUPPRESSION ROW CARRYING NO LIFT FIELD AT ALL STILL REFUSES — the predicate fails CLOSED, because `undefined === null` is false and the open direction is a breach"),
    await page.isSuppressed(legacyKey),
    "false here means a person who said stop is marketable again");
  ok(p("30 · …and the gate agrees, on the suppression"),
    (await refusedBy(f.legacyPhone)) === "suppressed", `refused by ${await refusedBy(f.legacyPhone)}`);

  // ── 10 · D6 · THE TOKEN IS CASE-INSENSITIVE ────────────────────────────────────────────
  // The alphabet has no lower-case members, so folding case widens nothing — it only stops a
  // person who typed the link off a phone screen from being told it does not work.
  const lower = f.caseToken.toLowerCase();
  const mixed = f.caseToken.slice(0, 4).toLowerCase() + f.caseToken.slice(4);
  const lowerRead = await page.resolve(lower);
  const mixedRead = await page.resolve(` ${mixed} `);
  const lowerStop = await page.stop(lower, SW);
  ok(p(L.lower),
    lowerRead.ok && mixedRead.ok && lowerStop.ok && lowerStop.state === "stopped"
      && (await refusedBy(f.casePhone)) === "suppressed",
    `lower ${lowerRead.ok} · mixed ${mixedRead.ok} · stop ${JSON.stringify(lowerStop)} · gate ${await refusedBy(f.casePhone)}`);

  // ── 11 · D6 · RESUME LIFTS ONLY A STOP THE PERSON MADE ─────────────────────────────────
  const opBefore = await Promise.resolve(db.messagingConsent.latestFor(keyFor(toMsisdn255(f.operatorPhone))));
  const opResume = await page.resume(f.operatorToken, SW);
  const opAfter = await Promise.resolve(db.messagingConsent.latestFor(keyFor(toMsisdn255(f.operatorPhone))));
  const opRow = (await rows(f.operatorPhone))[0];
  ok(p(L.operator),
    opResume.ok && opResume.state === "already"
      && (await refusedBy(f.operatorPhone)) === "suppressed"
      && !!opRow && !opRow.liftedAt && opRow.reason === "OPERATOR"
      && opAfter?.id === opBefore?.id,
    `answer ${JSON.stringify(opResume)} · gate ${await refusedBy(f.operatorPhone)} · lifted ${opRow?.liftedAt} · ledger ${opBefore?.id}→${opAfter?.id}`);

  // ── 11b · 🔴 AN OFFICER'S STOP ARRIVING OVER THE PERSON'S OWN STOP TAKES IT OVER ────────
  // `casePhone` was stopped by its own link above (an active WITHDRAWN row). The DAL used to keep
  // that FIRST reason when an officer's stop arrived, so `personMayLift` still said yes and the
  // old link lifted the officer's refusal. The row must now read OPERATOR and the link lift nothing.
  await Promise.resolve(db.suppression.create({
    id: `sup11b${f.run}`, channel: "SMS", identifier: toMsisdn255(f.casePhone), category: "MARKETING",
    reason: "OPERATOR", evidence: "officer:11b", recordedBy: "officer-fixture", createdAt: new Date().toISOString(),
    liftedAt: null, liftedReason: null,
  }));
  const overResume = await page.resume(f.caseToken, SW);
  const overRow = (await rows(f.casePhone))[0];
  // …and a LIFTED person's stop that an officer re-arms carries the officer's reason, not the old one.
  const liftedId = `25579${String(f.run).replace(/\D/g, "").slice(-7).padStart(7, "0")}`;
  const liftedKey = keyFor(liftedId);
  await Promise.resolve(db.suppression.create({
    id: `sup11c${f.run}`, channel: "SMS", identifier: liftedId, category: "MARKETING",
    reason: "WITHDRAWN", evidence: "optout:11c", recordedBy: null, createdAt: "2026-03-01T00:00:00.000Z",
    liftedAt: null, liftedReason: null,
  }));
  await Promise.resolve(db.suppression.lift(liftedKey, "optout:11c", new Date().toISOString()));
  await Promise.resolve(db.suppression.create({
    id: `sup11d${f.run}`, channel: "SMS", identifier: liftedId, category: "MARKETING",
    reason: "COMPLAINT", evidence: "complaint:11d", recordedBy: "officer-fixture", createdAt: new Date().toISOString(),
    liftedAt: null, liftedReason: null,
  }));
  const rearmed = (await Promise.resolve(db.suppression.listFor(liftedId)))[0];
  ok(p("32b · 🔴 the reason follows the stop NOW IN FORCE: an officer's stop over the person's own takes it over, and a re-armed row carries the new reason — so the old link lifts neither"),
    overResume.ok && overResume.state === "already" && !!overRow && overRow.reason === "OPERATOR" && !overRow.liftedAt
      && !!rearmed && rearmed.reason === "COMPLAINT" && !rearmed.liftedAt && rearmed.createdAt === "2026-03-01T00:00:00.000Z",
    `over ${JSON.stringify(overResume)} · ${overRow?.reason}/${overRow?.liftedAt} · rearmed ${rearmed?.reason}/${rearmed?.liftedAt}/${rearmed?.createdAt}`);

  // ── 12 · D6 · 🔴 A HALF-LANDED STOP IS REPAIRED BY THE RETRY ──────────────────────────
  // The three writes are not one transaction. Plant a ledger failure on the FIRST write only: the
  // suppression lands, the ledger does not, the page says "try again" — and the retry used to
  // answer `already` without ever writing the WITHDRAWN row or turning the player's toggle off.
  const realCreate = db.messagingConsent.create;
  let failNext = true;
  (db.messagingConsent as { create: unknown }).create = (row: Parameters<typeof realCreate>[0]) => {
    if (failNext) { failNext = false; throw new Error("planted: the ledger write failed once"); }
    return realCreate.call(db.messagingConsent, row);
  };
  let firstTry: OptOutActResult;
  try {
    firstTry = await page.stop(f.repairToken, SW);
  } finally {
    (db.messagingConsent as { create: unknown }).create = realCreate;
  }
  ok(p("33 · ⚠️ CONTROL — the planted failure really fired: the first STOP reported an error, not a success"),
    firstTry.ok === false, JSON.stringify(firstTry));
  const retry = await page.stop(f.repairToken, SW);
  const repaired = await Promise.resolve(db.messagingConsent.latestFor(keyFor(toMsisdn255(f.repairPhone))));
  const repairedUser = await Promise.resolve(db.user.findById(f.repairId));
  ok(p(L.repair),
    retry.ok && retry.state === "already" && repaired?.status === "WITHDRAWN" && repairedUser?.marketingOptIn === false
      && (await refusedBy(f.repairPhone)) === "suppressed",
    `retry ${JSON.stringify(retry)} · ledger ${repaired?.status} · toggle ${repairedUser?.marketingOptIn}`);

  // ── 13 · D6 · 🔴 THE MINT KEYS THE NUMBER THE WAY THE GATE DOES ───────────────────────
  const plusToken = await page.mint(`+${toMsisdn255(f.plusPhone)}`);
  const plusStop = plusToken ? await page.stop(plusToken, SW) : null;
  ok(p(L.mint),
    !!plusToken && !!plusStop?.ok && (await refusedBy(f.plusPhone)) === "suppressed",
    `token ${plusToken ? "minted" : "none"} · stop ${JSON.stringify(plusStop)} · gate ${await refusedBy(f.plusPhone)}`);
  ok(p("35b · …and an unusable number mints NOTHING — a caller that gets null must not send"),
    (await page.mint("12345")) === null);

  // ── 14 · D6 · ⛔ NO SELF-EXCLUDED TOGGLE IS SWITCHED ON FROM A LINK ─────────────────────
  const seResume = await page.resume(f.seToken, SW);
  const seUser = await Promise.resolve(db.user.findById(f.seId));
  ok(p(L.selfExcluded),
    seResume.ok && seUser?.marketingOptIn === false && (await refusedBy(f.sePhone)) !== "ALLOWED",
    `answer ${JSON.stringify(seResume)} · toggle ${seUser?.marketingOptIn} · gate ${await refusedBy(f.sePhone)}`);

  // ── 15 · D6 · THE GET BUDGET — ONLY A MISS SPENDS ──────────────────────────────────────
  const cap = RATE_RULES[OPTOUT_BUDGET]?.capacity ?? 30;
  const walker = `walker:${tag}${f.run}`;
  let dry = 0;
  for (let i = 0; i < cap + 15; i++) {
    const r = await page.resolveWithin(f.unknownToken, walker);
    if (!r.ok && r.reason === "throttled") dry++;
  }
  const dryOnValid = await page.resolveWithin(f.ancientToken, walker);
  ok(p(L.walkerDry),
    dry >= 10 && !dryOnValid.ok && dryOnValid.reason === "throttled",
    `${dry} of ${cap + 15} misses refused unread · a valid link behind the dry address: ${JSON.stringify(dryOnValid)}`);
  // ── 15b · 🔴 WHAT THE PERSON BEHIND A DRY ADDRESS IS TOLD. No lookup was made, so their link may be
  // genuine: "this link does not work" told them it was broken, and they did not try again.
  const kinds = {
    throttled: page.refusalKind({ ok: false, reason: "throttled" }),
    unknown: page.refusalKind({ ok: false, reason: "unknown" }),
    malformed: page.refusalKind({ ok: false, reason: "malformed" }),
    failed: page.refusalKind(null),
    resolved: page.refusalKind({ ok: true }),
  };
  ok(p(L.busy),
    kinds.throttled === "busy" && kinds.unknown === "invalid" && kinds.malformed === "invalid"
      && kinds.failed === "failed" && kinds.resolved === null,
    JSON.stringify(kinds));
  const person = `person:${tag}${f.run}`;
  let refused = 0;
  for (let i = 0; i < cap + 15; i++) {
    const r = await page.resolveWithin(f.ancientToken, person);
    if (!r.ok) refused++;
  }
  ok(p(L.personFree), refused === 0, `${refused} of ${cap + 15} opens of a valid link were refused`);

  // ── 16 · D6 · THE ACTS' BUDGET — MISSES SPEND, A HELD LINK IS CAPPED ──────────────────
  // Moved here from the surface block so the plants below can reach it: it asks the OBJECT UNDER TEST.
  const missToken = freshMissToken();
  const actWalker = `actwalker:${tag}${f.run}`;
  const walked: OptOutActResult[] = [];
  for (let i = 0; i < cap + 10; i++) walked.push(await page.stopWithin(missToken, SW, actWalker));
  ok(p(L.actWalker),
    walked.every((r) => !r.ok) && walked.slice(-5).every((r) => !r.ok && r.reason === "error")
      && walked.slice(0, 5).every((r) => !r.ok && r.reason === "unknown"),
    walked.slice(-3).map((r) => JSON.stringify(r)).join(" "));
  // A held link is capped on its OWN key, whichever address it comes from.
  const held = await page.mint(toMsisdn255(phoneFor(f.run, 50)));
  const heldAnswers: OptOutActResult[] = [];
  for (let i = 0; i < cap + 5; i++) heldAnswers.push(await page.stopWithin(held ?? "", SW, `addr:${tag}${f.run}:${i}`));
  ok(p(L.linkCap),
    !!held && heldAnswers.slice(0, 5).every((r) => r.ok) && heldAnswers.slice(-3).every((r) => !r.ok && r.reason === "error"),
    heldAnswers.slice(-3).map((r) => JSON.stringify(r)).join(" "));
  // …and the address that carried the first hit was never charged for it. ⚠️ `cap - 1`, not `cap - 2`:
  // the probe itself spends one, so an address that ALSO paid for its hit reads one lower and must fail.
  const probeKey = `addr:${tag}${f.run}:0`;
  const probe = await rateCheckAsync(probeKey, OPTOUT_BUDGET);
  if (probe.allowed) await rateRefundAsync(probeKey, OPTOUT_BUDGET);
  ok(p(L.hitFree), probe.allowed && probe.remaining >= cap - 1, `remaining ${probe.remaining}`);
}

/* ══ THE SURFACE ASSERTIONS — run once, not per model ═══════════════════════════════════════ */
async function runSurface(f: Fixtures): Promise<void> {
  // ── THE TWO PREFIX LISTS, READ FROM THE REAL MODULES ────────────────────────────────────
  const live = `${OPTOUT_PATH}${f.contactToken}`;
  ok("S1 · ⛔ `/s` IS EXCLUDED FROM GOOGLE ANALYTICS — the token is a path SEGMENT, so stripping the query would not have saved it",
    gaExcluded(live) && gaExcluded("/s"), `checked ${live}`);
  ok("S1b · CONTROL · the exclusion is a SEGMENT match — `/settings` and `/support` still report",
    !gaExcluded("/settings") && !gaExcluded("/support"));
  ok("S2 · ⛔ `/s` IS NOT PROTECTED — an opt-out that demands a login is one an imported contact can never use (ETA s.32(1)(c))",
    !isProtectedPath(live) && !isProtectedPath("/s"));
  ok("S2b · CONTROL · the protected list is real — `/wallet` still is",
    isProtectedPath("/wallet") && isProtectedPath("/admin"));

  // ── THE PAGE ITSELF, READ FROM DISK ─────────────────────────────────────────────────────
  // ⛔ These are the properties no in-memory call can reach: they are facts about what
  // the route renders, and a suite that only exercised the service would pass with no page.
  // ⭐ A surface plant (red run only) edits the text IN MEMORY, once, and counts how often its anchor hit.
  const read = (rel: string) => {
    const src = readFileSync(join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
    const plant = SURFACE_PLANT;
    if (!plant || plant.file !== rel) return src;
    surfacePlantHits = src.split(plant.from).length - 1;
    return surfacePlantHits === 1 ? src.replace(plant.from, () => plant.to) : src;
  };
  const pageSrc = read("src/app/s/[token]/page.tsx");
  const clientSrc = read("src/app/s/[token]/optout-client.tsx");
  const loadingSrc = read("src/app/s/[token]/loading.tsx");
  const actionsSrc = read("src/app/s/[token]/actions.ts");
  // 2026-09-27 · the refusal moved to its own module, shared with bare `/s`.
  const refusalSrc = read("src/app/s/optout-refusal.tsx");
  const bareSrc = read("src/app/s/page.tsx");
  ok("S3 · the route is force-dynamic — a cached opt-out page would show one person another's state",
    /export const dynamic = "force-dynamic"/.test(pageSrc));
  ok("S4 · ⛔ NOINDEX — a crawler following one of these links is a crawler CLICKING an opt-out",
    /robots:\s*\{\s*index:\s*false/.test(pageSrc));
  ok(SL.mask,
    /r\.masked/.test(pageSrc) && !/r\.identifier/.test(pageSrc));
  // ⛔ THE REFUSAL MUST NOT INSTRUCT AN ACTION THE PAGE DOES NOT OFFER. The first version
  // passed `optout.body` — "tap once to stop marketing messages" — into the invalid-token
  // refusal, on a page that renders no button at all. Found by reading the screenshot, not
  // by any assertion, which is why there is now an assertion.
  const refusalBlock = refusalSrc.match(/<Callout\s+layout="stack"[\s\S]*?<\/Callout>/)?.[0] ?? "";
  ok(SL.refusalNoTap,
    refusalBlock.includes("t.optout.invalid") && !/t\.optout\.body/.test(refusalBlock), refusalBlock.slice(0, 90));
  // ⭐ D6 · AND IT IS NOT A DEAD END (F4): it names the next step, both other ways to stop, read from
  // the server config — and the one link that leaves this shell is a DOCUMENT navigation (E-70).
  const nextSteps = refusalSrc.slice(refusalSrc.indexOf("function NextSteps"));
  ok(SL.nextStep,
    /action=\{<NextSteps/.test(refusalBlock) && /t\.optout\.invalidNext/.test(refusalSrc)
      && /<a href="\/profile\/notifications"/.test(nextSteps) && !/from "next\/link"/.test(refusalSrc)
      && !/from "next\/link"/.test(pageSrc)
      && /SUPPORT_PHONE_TEL\(\)/.test(nextSteps) && /SUPPORT_EMAIL\(\)/.test(nextSteps),
    nextSteps.slice(0, 80));
  // ⭐ 2026-09-27 · the refusal is chosen by the service's mapping (37c), and a retry is offered where
  // retrying can help (busy, failed), as a plain <a> back to the same link.
  ok(SL.retry,
    /kind=\{refusalKindFor\(r\) \?\? "invalid"\}/.test(pageSrc)
      && /retryHref=\{`\/s\/\$\{encodeURIComponent\(token\)\}`\}/.test(pageSrc)
      && /retryHref=\{kind === "invalid" \? undefined : retryHref\}/.test(refusalBlock)
      && /\{retryHref && \(\s*<a href=\{retryHref\}/.test(nextSteps) && /t\.optout\.retry/.test(nextSteps)
      && /t\.optout\.busy/.test(refusalBlock) && /t\.optout\.error/.test(refusalBlock),
    refusalBlock.slice(0, 120));
  // ⭐ 2026-09-27 · the retry and the settings link were stacked 4px apart at two widths: their own group
  // now, one shared width, a gap of at least 12px (`gap-2` on this repo's spacing scale), the desk below it.
  {
    const group = nextSteps.match(/<div className="([^"]*)">\s*\{retryHref && \(/)?.[1] ?? "";
    const gap = Number(group.match(/\bgap-(\d+(?:\.5)?)\b/)?.[1] ?? 0);
    const closeAt = nextSteps.indexOf("</div>", nextSteps.indexOf("{t.optout.openNotifications}"));
    ok(SL.stepsGroup,
      /\bflex-col\b/.test(group) && /\bitems-stretch\b/.test(group) && /\bw-full\b/.test(group) && /\bmax-w-/.test(group)
        && gap >= 2 && closeAt > 0 && nextSteps.indexOf("<ContactLines") > closeAt,
      `group "${group}"`);
  }
  ok(SL.loadingOne,
    /t\.optout\.loading/.test(loadingSrc) && /aria-busy="true"/.test(loadingSrc)
      && (loadingSrc.match(/h-\[var\(--h-control-lg\)\]/g) ?? []).length === 1);
  // ⭐ 2026-09-27 · THE SKELETON IS THE PAGE, DRAWN WITH ITS OWN PARTS. Both files take the same class
  // names from one module, and the skeleton renders the same strings as transparent text on bars.
  const bar = loadingSrc.match(/const BAR = "([^"]+)"/)?.[1] ?? "";
  const shared = ["NUMBER_LABEL", "NUMBER_VALUE", "ACT_GROUP", "ACT_SENTENCE"];
  ok(SL.loadingSame,
    /from "\.\/optout-classes"/.test(loadingSrc) && /from "\.\/optout-classes"/.test(clientSrc)
      && shared.every((c) => loadingSrc.includes(`className={${c}}`) && clientSrc.includes(`{${c}}`))
      && loadingSrc.includes("<PageHeader eyebrow={SENDER_IDENTITY} title={<span className={`${TITLE_TEXT} ${BAR}`}>{t.optout.title}</span>} />")
      && clientSrc.includes("title={<span className={TITLE_TEXT}>{title}</span>}")
      && loadingSrc.includes("<p className={ACT_SENTENCE}><span className={BAR}>{t.optout.body}</span></p>")
      && /\btext-transparent\b/.test(bar) && /\bbox-decoration-clone\b/.test(bar)
      && /className="space-y-5"/.test(loadingSrc) && /<PageContainer tier="receipt" className="space-y-5">/.test(pageSrc),
    `BAR = "${bar}"`);
  const srOnlyAt = [...loadingSrc.matchAll(/className="sr-only"/g)].map((m) => m.index ?? -1);
  ok(SL.loadingOrder,
    srOnlyAt.length === 1 && srOnlyAt[0] > loadingSrc.indexOf('data-skeleton="action"'),
    `sr-only at ${srOnlyAt.join(",")} · action at ${loadingSrc.indexOf('data-skeleton="action"')}`);
  const actionDiv = loadingSrc.slice(loadingSrc.indexOf('data-skeleton="action"'));
  const actionTag = actionDiv.slice(0, actionDiv.indexOf(">"));
  ok(SL.loadingVisible,
    /\bbg-bg-elevated\b/.test(bar) && /\bring-border\b/.test(bar) && !/bg-bg-overlay/.test(loadingSrc)
      && /\bbg-bg-elevated\b/.test(actionTag) && /\bborder-border\b/.test(actionTag)
      && /^[^<]*>\s*\{t\.optout\.loading\}\s*<\/div>/.test(actionDiv.slice(actionDiv.indexOf(">"))),
    `BAR = "${bar}" · action ${actionTag.slice(0, 80)}`);
  // ⭐ EVERY STATE HAS ITS OWN SENTENCE, IN ALL THREE LOCALES, AND THEY ARE ALL DIFFERENT.
  // The unit's six states are loading · valid (`body`) · already suppressed · resubscribed ·
  // invalid token · error, plus `done` — the sentence a person reads after the tap that worked.
  // ⛔ Distinctness is the assertion that matters: two states sharing a sentence is a person
  // who cannot tell "you are already stopped" from "that did not go through".
  // `busy` (2026-09-27): a dry budget's own sentence, distinct from `invalid` by construction.
  const STATE_COPY = ["loading", "body", "already", "done", "resubscribed", "invalid", "error", "busy"] as const;
  const HEADINGS = ["title", "stoppedTitle", "resumedTitle"] as const;
  for (const locale of ["sw", "en", "zh"] as const) {
    const d = dict[locale].optout as Record<string, string>;
    const said = STATE_COPY.map((k) => d[k]);
    ok(`S7.${locale} · each state has its own distinct sentence in ${locale.toUpperCase()}`,
      said.every((x) => typeof x === "string" && x.length > 0) && new Set(said).size === said.length,
      `${new Set(said).size} distinct of ${said.length}`);
    // 🔴 DISTINCT IS NOT ENOUGH — NO SENTENCE MAY CONTAIN ANOTHER.
    // ⚠️ WHAT PROMPTED THIS, STATED ACCURATELY: the U8 visual drive matched the FRAGMENT
    // "utapokea tena" and passed on the page that says the opposite. Swahili `done` said
    // "HUTAPOKEA TENA" (you will NOT get them again) and `resubscribed` said "UTAPOKEA TENA"
    // (you WILL) — one leading letter reversed the meaning, and a fragment could not tell them
    // apart. The drive matches on a word boundary; this guards the stronger property one level
    // up, so a future rewording cannot make one state's WHOLE sentence live inside another's.
    const contained = [];
    for (const a of said) for (const b of said) {
      if (a !== b && b.toLowerCase().includes(a.toLowerCase())) contained.push(`"${a}" inside "${b}"`);
    }
    ok(`S7b.${locale} · 🔴 and NO state's sentence CONTAINS another's — a shorter one inside a longer one is a reader that reports the opposite of what the page says`,
      contained.length === 0, contained.join(" | ") || "none");
    // ⭐ D6 · THE HEADING FOLLOWS THE STATE, so the three headings must be three different words.
    const heads = HEADINGS.map((k) => d[k]);
    ok(SL.headings(locale),
      heads.every((x) => typeof x === "string" && x.length > 0) && new Set(heads).size === heads.length,
      heads.join(" | "));
    // ⚠️ D6 · "RESUMED" STATES WHAT WAS DONE, NEVER A DELIVERY. The gate still refuses every contact
    // (age_unknown until U33) and any player on an RG standing, so "you will get texts again" is false
    // for most people who tap it — and one sentence for everybody discloses nobody's standing.
    const promise = { en: /\bwill\b/i, sw: /\butapokea\b/i, zh: /将/ }[locale];
    ok(SL.noPromise(locale),
      !promise.test(d.resubscribed) && !promise.test(d.resumedTitle), `${d.resumedTitle} · ${d.resubscribed}`);
    // ⛔ D6 · A GENUINE, TRUNCATED LINK IS NEVER CALLED "NOT OURS" — that reads as a phishing warning.
    const notOurs = { en: /not (one of )?ours/i, sw: /si chetu/i, zh: /不是我们的/ }[locale];
    ok(SL.notOurs(locale),
      !notOurs.test(d.invalid), d.invalid);
    ok(SL.placeholders(locale),
      /\{toggle\}/.test(d.invalidNext ?? "") && /\{path\}/.test(d.invalidNext ?? ""), d.invalidNext);
    // ⭐ 2026-09-27 · ONE NAME FOR ONE THING. The heading and button said "marketing messages" (营销信息,
    // "matangazo") while the consent a person gave says "offers and news by SMS" — a third name on the
    // page whose sentences go into the consent ledger.
    // Whitespace folded (a no-break space counts as a space), so a wrap hint in either string is not a rename.
    const fold = (s: string) => s.replace(/\s+/g, " ").toLowerCase();
    const noun = fold(dict[locale].push.marketingTitle);
    const named = [d.title, d.stoppedTitle, d.resumedTitle, d.stopButton];
    const oldNoun = { en: /marketing (messages|texts)/i, sw: /matangazo/i, zh: /营销/ }[locale];
    const stale = Object.entries(d).filter(([, v]) => typeof v === "string" && oldNoun.test(v)).map(([k]) => k);
    ok(SL.noun(locale),
      named.every((x) => typeof x === "string" && fold(x).includes(noun)) && stale.length === 0,
      `noun "${noun}" · ${named.join(" | ")}${stale.length ? ` · older name in ${stale.join(",")}` : ""}`);
    // ⭐ 2026-09-27 · BREAK HINTS WHERE THE PAGE RELIES ON THEM, AND NEVER IN EVIDENCE. The page sets its
    // headings and notices break-keep; a zh string with no zero-width hint could then break only at
    // punctuation. sw/en headings keep "kwa SMS" / "by SMS" together with a no-break space. ⛔ The
    // strings the ledger stores (`optOutWording`) carry neither: a hint there is an invisible byte in evidence.
    {
      const ZW = String.fromCharCode(0x200b), NB = String.fromCharCode(0xa0);
      const KEPT = ["title", "stoppedTitle", "resumedTitle", "done", "already", "resubscribed", "invalid", "invalidNext", "error", "busy"];
      const glue = { sw: `kwa${NB}SMS`, en: `by${NB}SMS`, zh: "" }[locale];
      const missing = locale === "zh"
        ? KEPT.filter((k) => !(d[k] ?? "").includes(ZW))
        : HEADINGS.filter((k) => !(d[k] ?? "").includes(glue));
      const evidence = { body: d.body, stopButton: d.stopButton, resubscribeButton: d.resubscribeButton, marketingBody: dict[locale].push.marketingBody };
      const marked = Object.entries(evidence).filter(([, v]) => v.includes(ZW) || v.includes(NB)).map(([k]) => k);
      ok(SL.hints(locale), missing.length === 0 && marked.length === 0,
        `${missing.length ? `no hint in ${missing.join(",")}` : "hints in place"} · ${marked.length ? `evidence marked: ${marked.join(",")}` : "evidence clean"}`);
    }
  }
  ok(SL.serverAnswer,
    /setState\(r\.ok \? r\.state : "error"\)/.test(clientSrc));
  // ⛔ READ THE STATE UNION, NOT THE PROSE. An earlier draft of this assertion grepped the file
  // for the word "confirm" — and the component's own comment EXPLAINING that there is no
  // confirmation step contains it. A guard whose verdict moves when somebody rewords a sentence
  // is not a guard. The union is the mechanical fact: a confirmation step needs a state to live
  // in, and there is no state here it could occupy.
  const union = clientSrc.match(/useState<([^>]+)>/)?.[1] ?? "";
  const members = union.split("|").map((x) => x.trim().replace(/"/g, "")).sort();
  ok(SL.noConfirm,
    members.join(",") === "already,error,idle,resumed,stopped", `union = [${members}]`);

  // ── THE TOKEN'S ARITHMETIC ──────────────────────────────────────────────────────────────
  ok("S10 · the alphabet is the 32-character ambiguity-free one, and 256 divides by it exactly — so the fold carries NO modulo bias",
    OPTOUT_TOKEN_ALPHABET.length === 32 && 256 % OPTOUT_TOKEN_ALPHABET.length === 0);
  ok("S11 · ⛔ I, O, 0 and 1 are absent — a token is read off a phone screen and typed by hand",
    !/[IO01]/.test(OPTOUT_TOKEN_ALPHABET));
  ok("S11b · ⭐ D6 — the alphabet has NO lower-case member, so folding case can never make two tokens collide",
    OPTOUT_TOKEN_ALPHABET === OPTOUT_TOKEN_ALPHABET.toUpperCase() && normalizeOptOutToken(" ab2c ") === "AB2C");
  const minted = new Set<string>();
  for (let i = 0; i < 200; i++) {
    const t = await mintOptOutToken(`2557000${String(10000 + i)}`);
    if (t) minted.add(t);
  }
  ok("S12 · 200 mints produced 200 DISTINCT tokens, every one of the right shape",
    minted.size === 200 && [...minted].every(isOptOutTokenShape), `${minted.size} distinct`);
  ok("S13 · the mint is BOUNDED — an unbounded retry against a filling table is an outage that looks like a hang",
    OPTOUT_MINT_ATTEMPTS > 0 && OPTOUT_MINT_ATTEMPTS <= 10, `${OPTOUT_MINT_ATTEMPTS} attempts`);
  // ⭐ A TAKEN TOKEN IS REFUSED RATHER THAN RE-POINTED. An upsert here would hand somebody
  // else's live opt-out link to a different person, and they could never leave.
  const taken = await Promise.resolve(db.marketingOptOutToken.find(f.contactToken));
  const collide = await Promise.resolve(db.marketingOptOutToken.create({
    token: f.contactToken, channel: "SMS", identifier: "255700000999", category: "MARKETING",
    createdAt: new Date().toISOString(),
  }));
  const after = await Promise.resolve(db.marketingOptOutToken.find(f.contactToken));
  ok("S14 · ⛔ A TAKEN TOKEN IS REFUSED, and the live link still points at the SAME person — an upsert would silently re-point it",
    collide === null && after?.identifier === taken?.identifier,
    `${taken?.identifier} → ${after?.identifier}`);

  // ── THE FOOTER'S LINK AND THIS ROUTE ARE THE SAME PLACE ─────────────────────────────────
  ok("S15 · ⭐ the SMS footer's path and this route agree, because both come from ONE constant",
    OPTOUT_PATH === "/s/" && live.startsWith(OPTOUT_PATH));
  ok("S16 · the token length the footer measures is the length this page accepts",
    OPTOUT_TOKEN_CHARS === 8 && isOptOutTokenShape(f.contactToken) && f.contactToken.length === OPTOUT_TOKEN_CHARS);

  // ── D6 · THE CONSENT SENTENCE A RESUME RECORDS, IN EVERY LOCALE ─────────────────────────
  for (const [L6, loc] of [["SW", "sw"], ["EN", "en"], ["ZH", "zh"]] as const) {
    const resume = optOutWording("RESUME", L6);
    const stop = optOutWording("STOP", L6);
    ok(`S17.${loc} · ⛔ D6 — RESUME stores \`resubscribeButton — push.marketingBody\` and never the stop instruction; STOP still stores its own`,
      resume === `${dict[loc].optout.resubscribeButton} — ${dict[loc].push.marketingBody}`
        && !resume.includes(dict[loc].optout.body) && stop.includes(dict[loc].optout.body),
      resume.slice(0, 70));
  }

  // ── D6 · THE CLIENT: STATE-DRIVEN HEADING, ITS OWN CONSENT SENTENCE, ANNOUNCED, FOCUSED ──
  ok(SL.heading,
    /isSuppressed\s*\?\s*t\.optout\.stoppedTitle/.test(clientSrc) && /t\.optout\.resumedTitle/.test(clientSrc));
  const resumeGroup = clientSrc.slice(clientSrc.indexOf(": mayResume ?"), clientSrc.indexOf("resubscribeButton}"));
  ok(SL.consentBeside,
    /t\.push\.marketingBody/.test(resumeGroup) && !/t\.optout\.body/.test(resumeGroup), resumeGroup.slice(0, 80));
  ok(SL.announced,
    /<Callout size="md" tone=\{message\.tone\} role="status">/.test(clientSrc)
      && /<Callout size="md" tone="danger" role="alert">/.test(clientSrc)
      && /msgRef\.current\?\.focus\(\)/.test(clientSrc) && /errRef\.current\?\.focus\(/.test(clientSrc));
  ok(SL.sameAct,
    /if \(r\.ok\) \{\s*setIsSuppressed\(/.test(clientSrc) && /\{!isSuppressed \?/.test(clientSrc));
  ok(SL.caught,
    /fn\(token\)\.catch\(/.test(clientSrc));
  {
    // EVERY notice here is `md` — the status above the button and the alert below it.
    const callouts = (clientSrc.match(/<Callout\b/g) ?? []).length;
    const md = (clientSrc.match(/<Callout size="md"/g) ?? []).length;
    ok(SL.bodySize, callouts >= 2 && md === callouts, `${md} of ${callouts} callouts are md`);
  }
  ok(SL.budgeted,
    /stopMarketingWithinBudget\(/.test(actionsSrc) && /resumeMarketingWithinBudget\(/.test(actionsSrc)
      && /optOutClientKey\(\)/.test(actionsSrc) && /resolveOptOutTokenWithinBudget\(/.test(pageSrc));
  // ⭐ 2026-09-27 · a failed tap is no longer "try again" and nothing else: our desk is shown under it,
  // rendered on the server and handed down as a node (E-226 — the client never reads the config).
  const errorBlock = clientSrc.includes('{state === "error" && (') ? clientSrc.slice(clientSrc.indexOf('{state === "error" && (')) : "";
  ok(SL.contactOnError,
    /\{t\.optout\.error\}<\/p>\s*\{contact\}\s*<\/Callout>/.test(errorBlock)
      && /contact=\{<ContactLines t=\{t\} align="start" \/>\}/.test(pageSrc)
      && !/support-config/.test(clientSrc)
      && /export function ContactLines/.test(refusalSrc) && /SUPPORT_PHONE_TEL\(\)/.test(refusalSrc.slice(refusalSrc.indexOf("export function ContactLines"))),
    errorBlock.slice(0, 160).replace(/\s+/g, " ") || "no error block");
  // 🔴 2026-09-27 · the failure used to be inserted ABOVE the button, so the button dropped ~210px at 360
  // and the desk's `tel:` row sat where the thumb had just tapped. Now the only failure text comes after
  // the LAST button, nothing above the button reads the failure (`said` is the last OK answer), and the
  // alert is focused without a scroll. The U8 drive measures the same thing in a browser.
  {
    const lastButton = clientSrc.lastIndexOf("</Button>");
    const errAt = clientSrc.indexOf("{t.optout.error}");
    ok(SL.errorBelow,
      lastButton > 0 && errAt > lastButton && clientSrc.split("{t.optout.error}").length === 2
        && /: said === "resumed" \? t\.optout\.resumedTitle/.test(clientSrc)
        && /const message =\s*said === "stopped"/.test(clientSrc)
        && !/(?<![.\w])state === "(idle|stopped|already|resumed)"/.test(clientSrc) // the component's own `state`, never the server's `r.state`
        && /setIsSuppressed\([^)]*\);\s*setSaid\(r\.state\);/.test(clientSrc)
        && /errRef\.current\?\.focus\(\{ preventScroll: true \}\)/.test(clientSrc),
      `error sentence at ${errAt} · last button ends at ${lastButton}`);
  }
  // ⭐ 2026-09-27 · the pending label ("One moment…") is readable: `.btn:disabled` dims a disabled button to
  // 0.45 and a busy one is disabled too; both buttons carry a busy rule that outranks it.
  {
    const busy = clientSrc.match(/const BUSY_LEGIBLE = "([^"]*)";/)?.[1] ?? "";
    const opacity = Number(busy.match(/\baria-busy:disabled:opacity-(\d+)\b/)?.[1] ?? 0);
    ok(SL.busyLegible,
      opacity >= 80 && (clientSrc.match(/<Button [^>]*className=\{BUSY_LEGIBLE\}/g) ?? []).length === 2,
      `BUSY_LEGIBLE = "${busy}"`);
  }
  // ⭐ 2026-09-27 · zh broke mid-word on this page (接|收, 优|惠, 关|闭) and notices ended on one word or one
  // glyph. The headings and every notice sentence take the shared classes; the act sentence (ledger
  // evidence, no hints) takes `text-pretty` only, because keep-all without hints breaks only at punctuation.
  {
    const cls = (s: string) => s.split(/\s+/);
    const keep = cls(KEEP_WORDS).includes("break-keep") && cls(KEEP_WORDS).includes("[overflow-wrap:anywhere]");
    const classesOk = keep && TITLE_TEXT === KEEP_WORDS
      && cls(NOTICE_TEXT).includes("text-pretty") && cls(NOTICE_TEXT).includes("break-keep")
      && cls(ACT_SENTENCE).includes("text-pretty") && !cls(ACT_SENTENCE).includes("break-keep");
    const clientOk = clientSrc.includes("title={<span className={TITLE_TEXT}>{title}</span>}")
      && (clientSrc.match(/<p className=\{NOTICE_TEXT\}>/g) ?? []).length === 2;
    const refusalOk = refusalSrc.includes("title={<span className={TITLE_TEXT}>{t.optout.title}</span>}")
      && /title=\{<span className=\{`block text-balance \$\{KEEP_WORDS\}`\}>/.test(refusalBlock)
      && refusalBlock.includes("<span className={`block ${NOTICE_TEXT}`}>");
    ok(SL.wrap, classesOk && clientOk && refusalOk,
      `classes ${classesOk} · client ${clientOk} · refusal ${refusalOk}`);
  }

  // ── D6 · THE NUMBER IS MASKED IN THE SHARED `+255••••NN` FORM ───────────────────────────
  const shown = await resolveOptOutToken(f.ancientToken);
  ok("S19 · ⭐ D6 — the page's number reads `+255••••NN`, the shared mask, never `2557••••NN` (the operator digit)",
    shown.ok && /^\+255•{4}\d{2}$/.test(shown.masked), shown.ok ? shown.masked : "did not resolve");
  // ⚠️ Since U19 (2026-10-01) `maskPhone` itself reads a bare key as the `+` form, so the old shape is
  // built by hand here — the first four characters as typed, which is what the bare-key mask used to print.
  const bareKey = toMsisdn255(f.contactPhone);
  const oldShape = `${bareKey.slice(0, 4)}••••${bareKey.slice(-2)}`;
  ok("S19c · ⚠️ CONTROL — the old bare-key mask (`2557••••NN`) FAILS the S19 pattern, so S19 is capable of failing",
    !/^\+255•{4}\d{2}$/.test(oldShape) && /^\+255•{4}\d{2}$/.test(maskPhone(bareKey)), `${oldShape} / ${maskPhone(bareKey)}`);
  // ⚠️ SELF-CONTAINED: the person's own stop is made HERE (idempotent — `already` if it stands), so this
  // holds on a fixture `runAssertions` never touched: the red run's surface baseline and every surface plant.
  await stopMarketing(f.contactToken, "SW");
  const operatorRead = await resolveOptOutToken(f.operatorToken);
  const personRead = await resolveOptOutToken(f.contactToken);
  ok("S19b · ⛔ D6 — an officer's stop is `resumable: false`, a person's own stop `resumable: true` — and the REASON is never handed to the page",
    operatorRead.ok && operatorRead.suppressed && !operatorRead.resumable
      && personRead.ok && personRead.suppressed && personRead.resumable
      && !("reason" in operatorRead) && personMayLift("WITHDRAWN") && !personMayLift("SELF_EXCLUSION")
      && !personMayLift("COMPLAINT") && !personMayLift("OPERATOR"),
    JSON.stringify({ operator: operatorRead.ok && operatorRead.resumable, person: personRead.ok && personRead.resumable }));

  // ── D6 · THE MINIMAL SHELL AND THE OVERLAYS THAT LIVE OUTSIDE IT ────────────────────────
  const shellSrc = read("src/components/layout/app-shell.tsx");
  const branchAt = shellSrc.indexOf("if (isOptOutPath(pathname))");
  ok(SL.shellFirst,
    branchAt > 0 && branchAt < shellSrc.indexOf("await getSession()"), `branch at ${branchAt}`);
  const shellBody = shellSrc.slice(shellSrc.indexOf("function OptOutShell"));
  const upsell = ["<TopAppBar", "<BottomNav", "<PublicFooter", "LazyChannelsPanel", "LazyInstallInvite", "<Link", "/auth/", "proposeGetPaid", "signUp", "signIn"]
    .filter((s) => shellBody.includes(s));
  ok(SL.noUpsell,
    shellBody.length > 200 && upsell.length === 0, upsell.join(", ") || "none");
  ok(SL.shellCarries,
    ["<FiftyLockup", "<LanguageMenu", "<MainLandmark>", "<SkipToContent", "LICENCE_NUMBER()", "HELPLINE()", "t.footer.eighteenPlus", "t.footer.stopGambling"]
      .every((s) => shellBody.includes(s)));
  {
    const rgAt = shellBody.indexOf("{t.footer.stopGambling}");
    const helplineAt = shellBody.indexOf("{HELPLINE()}");
    ok(SL.rgContext,
      rgAt > 0 && helplineAt > rgAt && !/aria-label=\{t\.footer\.eighteenPlus\}/.test(shellBody)
        && /<span className="kp-rg__18">\{t\.footer\.eighteenPlus\}<\/span>/.test(shellBody),
      `rg line at ${rgAt} · helpline at ${helplineAt}`);
  }
  const OVERLAYS = [
    "src/components/onboarding/first-visit-primer.tsx",
    "src/components/chat/ChatRoot.tsx",
    "src/components/social/channels-panel.tsx",
  ];
  const hit = [`${OPTOUT_PATH}${f.contactToken}`, "/s", `${OPTOUT_PATH}ZZZZZZZZ`];
  const miss = ["/settings", "/support", "/", "/markets", "/sx/abc"];
  for (const file of OVERLAYS) {
    const src = read(file);
    const m = src.match(/const HIDE_ON = \/(.+)\/;/);
    const re = m ? new RegExp(m[1]) : null;
    ok(SL.overlay(file.split("/").pop() ?? file),
      !!re && hit.every((x) => re.test(x)) && miss.filter((x) => x !== "/markets" || !file.includes("channels")).every((x) => !re.test(x)),
      re ? `/${re.source}/` : "no HIDE_ON found");
  }
  // ⚠️ The overlays hide on ANY `/s…` path (harmless on a 404); the SHELL takes only the two routes that
  // exist, so a deeper path's 404 renders in the full shell, where its soft links work.
  const shellHit = [`${OPTOUT_PATH}${f.contactToken}`, "/s", "/s/", `${OPTOUT_PATH}ZZZZZZZZ`, `${OPTOUT_PATH}ZZZZZZZZ/`];
  const shellMiss = [...miss, `${OPTOUT_PATH}ZZZZZZZZ/x`, "/s/a/b/c", "/s//"];
  ok(SL.shellMatch,
    shellHit.every((x) => shellMatch(x)) && shellMiss.every((x) => !shellMatch(x)),
    `hit ${shellHit.filter((x) => !shellMatch(x)).join(",") || "all"} · wrongly hit ${shellMiss.filter((x) => shellMatch(x)).join(",") || "none"}`);
  // ⭐ 2026-09-27 · bare `/s` has a page of its own: the same refusal, never the root 404 in the stripped shell.
  ok(SL.bare,
    /<OptOutRefusal t=\{t\} kind="invalid" \/>/.test(bareSrc) && /export const dynamic = "force-dynamic"/.test(bareSrc)
      && /robots:\s*\{\s*index:\s*false/.test(bareSrc) && !/next\/link/.test(bareSrc),
    bareSrc.match(/return <[^;]+;/)?.[0] ?? "no render");

  // ── D6 · THE LIVE TOKEN NEVER REACHES THE AUDIT CHAIN ───────────────────────────────────
  // ⚠️ SELF-CONTAINED, like S19b: a stop and a resume from the player's own link write the two rows.
  await stopMarketing(f.playerToken, "SW");
  await resumeMarketing(f.playerToken, "SW");
  // ⚠️ POLLED, NEVER SLEPT: `syncPlayerToggle` writes its audit row fire-and-forget (the house
  // pattern), so a read straight after the act raced it — green in the suite, red in the red
  // harness's baseline, where the timing differs (found 2026-09-27: 1 row of 2).
  const readAudit = async () => (await getAuditForTargetsDurable({
    targetType: "User", targetIds: [f.playerId],
    actions: ["privacy.marketing_consent.withdrawn", "privacy.marketing_consent.given"],
    sinceIso: "1970-01-01T00:00:00.000Z",
  })).entries;
  let auditRows = await readAudit();
  for (let i = 0; i < 40 && auditRows.length < 2; i++) {
    await new Promise((r) => setTimeout(r, 50));
    auditRows = await readAudit();
  }
  const payloads = JSON.stringify(auditRows.map((e) => e.payload));
  ok("S22 · ⛔ D6 — the player's toggle audit rows name the token REFERENCE, never the live token (`/admin/audit` prints payloads)",
    auditRows.length >= 2 && !payloads.includes(f.playerToken) && payloads.includes(optOutTokenRef(f.playerToken)),
    `${auditRows.length} rows · ${payloads.slice(0, 120)}`);
  // (The acts' budget — formerly S23/S24/S24b — is 38a–c in `runAssertions`, where its plants reach it.)
}

/* ══ THE MODEL USED FOR PLANTING ════════════════════════════════════════════════════════════
 * ⚠️ The page's two acts written out so ONE step at a time can be made wrong. Not imported by
 * anything and never shipped. With no flags set it is asserted to agree with the shipped
 * service on every step, so a red case's failure is attributable to the flag. */
type Defect = {
  expires?: boolean;          // the token stops working after a year (OD43 broken)
  confirms?: boolean;         // the click needs a second step
  deletesOnResume?: boolean;  // resubscribe REMOVES the row instead of lifting it
  ignoresLift?: boolean;      // the gate cannot see `liftedAt`, so a lift changes nothing
  reStopIsNoop?: boolean;     // re-suppression returns the LIFTED row (`update: {}`)
  falseSuccess?: boolean;     // an unknown token reports success
  noBridge?: boolean;         // the player lookup skips `userPhoneKeyFor`
  strictLift?: boolean;       // `liftedAt === null` — a row with no lift field reads as LIFTED
  // ── D6 ──
  caseSensitive?: boolean;    // the token is not case-folded
  liftsAnyReason?: boolean;   // resume lifts an OPERATOR / COMPLAINT / SELF_EXCLUSION stop
  resumeStoresStop?: boolean; // RESUME records `resubscribeButton — optout.body` (the stop instruction)
  rawTokenEvidence?: boolean; // the live token is written into evidence
  alreadySkipsRepair?: boolean; // `already` returns before a missing WITHDRAWN row / toggle is written
  mintKeepsRaw?: boolean;     // the mint stores the identifier as given (`+255…`)
  flipsSelfExcluded?: boolean; // a link switches a SELF_EXCLUDED player's toggle back on
  noGetBudget?: boolean;      // the page's GET is not budgeted at all
  chargesHits?: boolean;      // a valid link spends the budget like a miss
  noActBudget?: boolean;      // the two acts are not budgeted at all
  noLinkCap?: boolean;        // a held valid link's acts are not capped per link
  actsChargeHits?: boolean;   // an act on a valid link spends the ADDRESS budget like a miss
  // ── 2026-09-27 ──
  throttledReadsInvalid?: boolean; // a dry budget tells a genuine link "this link does not work"
};

const TOKEN_MAX_AGE_MS = 365 * 86400_000;

function pageWithDefect(d: Defect): OptOutPage {
  const fold = (raw: string) => (d.caseSensitive ? raw : normalizeOptOutToken(raw));
  /** The model's own resolution, so `expires` and `falseSuccess` can be planted into it. */
  const resolve_ = async (raw: string) => {
    const token = fold(raw);
    if (!isOptOutTokenShape(token)) return null;
    const row = await Promise.resolve(db.marketingOptOutToken.find(token));
    if (!row) return null;
    // ⛔ THE PRE-FIX SHAPE: an expiry on a link OD43 says never expires.
    if (d.expires && Date.now() - new Date(row.createdAt).getTime() > TOKEN_MAX_AGE_MS) return null;
    return row;
  };
  const refOf = (token: string) => (d.rawTokenEvidence ? token : optOutTokenRef(token));
  const lookupUser = async (identifier: string) =>
    Promise.resolve(db.user.findByPhone(d.noBridge ? identifier : `+${identifier}`));
  const ledger = (identifier: string, status: "GIVEN" | "WITHDRAWN", wording: string, locale: MessagingLocale, ref: string) =>
    Promise.resolve(db.messagingConsent.create({
      id: `ml${seq++}`, channel: "SMS", identifier, category: "MARKETING",
      status, source: "OPT_OUT_PAGE", wording, locale, evidence: `optout:${ref}`, recordedBy: null,
      createdAt: new Date().toISOString(),
    }));

  const stop = async (raw: string, locale: MessagingLocale): Promise<OptOutActResult> => {
    try {
      const row = await resolve_(raw);
      // ⛔ THE PRE-FIX SHAPE: a token nobody minted is told it worked.
      if (!row) return d.falseSuccess ? { ok: true, state: "stopped" } : { ok: false, reason: "unknown" };
      const ref = refOf(row.token);
      const key = keyFor(row.identifier);
      const active = await Promise.resolve(db.suppression.find(key));
      if (active) {
        // ⛔ THE PRE-FIX SHAPE (D6): `already` answered before the half-landed stop was finished.
        if (!d.alreadySkipsRepair) {
          const latest = await Promise.resolve(db.messagingConsent.latestFor(key));
          if (latest?.status !== "WITHDRAWN") await ledger(row.identifier, "WITHDRAWN", optOutWording("STOP", locale), locale, ref);
          const u = await lookupUser(row.identifier);
          if (u && u.marketingOptIn !== false) await db.user.update(u.id, { marketingOptIn: false });
        }
        return { ok: true, state: "already" };
      }
      const existing = (await Promise.resolve(db.suppression.listFor(row.identifier)))
        .find((r) => r.channel === key.channel && r.category === key.category);
      // ⛔ THE PRE-FIX SHAPE: `update: {}` — a lifted row comes back untouched, so the person is
      // told they will never be marketed again while the suppression stays lifted.
      if (existing && d.reStopIsNoop) {
        // the row is returned as-is; nothing re-arms it
      } else if (existing) {
        existing.liftedAt = null;
        existing.liftedReason = null;
      } else {
        await Promise.resolve(db.suppression.create({
          id: `m${seq++}`, channel: "SMS", identifier: row.identifier, category: "MARKETING",
          reason: "WITHDRAWN", evidence: `optout:${ref}`, recordedBy: null,
          createdAt: new Date().toISOString(), liftedAt: null, liftedReason: null,
        }));
      }
      await ledger(row.identifier, "WITHDRAWN", optOutWording("STOP", locale), locale, ref);
      const u = await lookupUser(row.identifier);
      if (u && u.marketingOptIn !== false) await db.user.update(u.id, { marketingOptIn: false });
      return { ok: true, state: "stopped" };
    } catch {
      return { ok: false, reason: "error" };
    }
  };

  const resume = async (raw: string, locale: MessagingLocale): Promise<OptOutActResult> => {
    try {
      const row = await resolve_(raw);
      if (!row) return d.falseSuccess ? { ok: true, state: "resumed" } : { ok: false, reason: "unknown" };
      const ref = refOf(row.token);
      const key = keyFor(row.identifier);
      const all = await Promise.resolve(db.suppression.listFor(row.identifier));
      const mine = all.find((r) => r.channel === key.channel && r.category === key.category);
      // ⛔ THE PRE-FIX SHAPE (D6): any active stop is lifted, whoever made it.
      if (mine && !mine.liftedAt && !d.liftsAnyReason && !personMayLift(mine.reason)) return { ok: true, state: "already" };
      if (mine && !mine.liftedAt) {
        // ⛔ THE PRE-FIX SHAPE ①: the row is DELETED rather than superseded — the evidence that
        // this person once said no is destroyed, which is what OD11 forbids.
        if (d.deletesOnResume) {
          // ⚠️ NEITHER TWIN HAS A DELETE TO CALL — that is the whole point of §17 — so the model
          // reproduces what a delete LOOKS LIKE TO EVERY READER instead: the row stops being part
          // of this person's suppression history. `listFor` no longer returns it, which is exactly
          // the observable consequence of the `deleteMany` this plant stands in for.
          mine.identifier = `__removed__${mine.id}`;
          mine.liftedAt = new Date().toISOString();
          mine.liftedReason = `optout:${ref}`;
        // ⛔ THE PRE-FIX SHAPE ②: the lift is written but the GATE cannot see it, so the page
        // reports a success the send loop will not honour.
        } else if (d.ignoresLift) {
          mine.liftedReason = `optout:${ref}`; // recorded, but `liftedAt` stays null
        } else {
          mine.liftedAt = new Date().toISOString();
          mine.liftedReason = `optout:${ref}`;
        }
      }
      // ⛔ THE PRE-FIX SHAPE (D6): the consent row recorded the STOP instruction as what was agreed to.
      const dd = locale === "EN" ? dict.en : locale === "ZH" ? dict.zh : dict.sw;
      const wording = d.resumeStoresStop
        ? `${dd.optout.resubscribeButton} — ${dd.optout.body}`
        : optOutWording("RESUME", locale);
      await ledger(row.identifier, "GIVEN", wording, locale, ref);
      const u = await lookupUser(row.identifier);
      // ⛔ THE PRE-FIX SHAPE (D6): a self-excluded account's toggle switched on from a link.
      if (u && u.marketingOptIn !== true && (d.flipsSelfExcluded || u.status !== "SELF_EXCLUDED")) {
        await db.user.update(u.id, { marketingOptIn: true });
      }
      return { ok: true, state: "resumed" };
    } catch {
      return { ok: false, reason: "error" };
    }
  };

  /** ⛔ THE PRE-FIX PREDICATE. `=== null` is FALSE for a row that carries no lift field at all,
   *  so an un-lifted suppression reads as lifted and the person becomes marketable — the open
   *  direction, which is the one the law does not forgive. */
  const isSuppressed = async (key: MessagingKey): Promise<boolean> => {
    if (!d.strictLift) return (await Promise.resolve(db.suppression.find(key))) !== null;
    const row = (await Promise.resolve(db.suppression.listFor(key.identifier)))
      .find((r) => r.channel === key.channel && r.category === key.category);
    return row !== undefined && row.liftedAt === null;
  };

  const mint = async (raw: string): Promise<string | null> => {
    // ⛔ THE PRE-FIX SHAPE (D6): whatever it is handed is stored — `+255…` included.
    const identifier = d.mintKeepsRaw ? raw : toMsisdn255(raw);
    if (!identifier || identifier.replace(/\D/g, "").length < 12) return null;
    for (let i = 0; i < OPTOUT_MINT_ATTEMPTS; i++) {
      const token = OPTOUT_TOKEN_ALPHABET.split("").sort(() => Math.random() - 0.5).join("").slice(0, OPTOUT_TOKEN_CHARS);
      const created = await Promise.resolve(db.marketingOptOutToken.create({
        token, channel: "SMS", identifier, category: "MARKETING", createdAt: new Date().toISOString(),
      }));
      if (created) return created.token;
    }
    return null;
  };

  const resolveWithin = async (raw: string, clientKey: string): Promise<{ ok: boolean; reason?: string }> => {
    // ⛔ THE PRE-FIX SHAPE (D6): the GET was never budgeted — every guess a free yes/no.
    if (d.noGetBudget) return { ok: (await resolve_(raw)) !== null };
    const gate = await rateCheckAsync(clientKey, OPTOUT_BUDGET);
    if (!gate.allowed) return { ok: false, reason: "throttled" };
    const row = await resolve_(raw);
    // ⛔ THE PRE-FIX SHAPE (D6): a hit spends like a miss, so a person's own opens run them dry.
    if (row && !d.chargesHits) await rateRefundAsync(clientKey, OPTOUT_BUDGET);
    return row ? { ok: true } : { ok: false, reason: "unknown" };
  };

  /** The service's `actWithinBudget`, written out. ⚠️ Its per-link key is the model's own, so the
   *  model's links and the shipped page's never share a bucket. */
  const stopWithin = async (raw: string, locale: MessagingLocale, clientKey: string): Promise<OptOutActResult> => {
    // ⛔ THE PRE-FIX SHAPE (D6): the acts are not budgeted at all — a script POSTs guesses for free.
    if (d.noActBudget) return stop(raw, locale);
    const gate = await rateCheckAsync(clientKey, OPTOUT_BUDGET);
    if (!gate.allowed) return { ok: false, reason: "error" };
    const token = fold(raw);
    // ⛔ THE PRE-FIX SHAPE (D6): a held valid link flips stop/start at request speed, uncapped.
    if (!d.noLinkCap && isOptOutTokenShape(token)) {
      const perLink = await rateCheckAsync(`model-link:${token}`, OPTOUT_BUDGET);
      if (!perLink.allowed) {
        await rateRefundAsync(clientKey, OPTOUT_BUDGET);
        return { ok: false, reason: "error" };
      }
    }
    const r = await stop(raw, locale);
    // ⛔ THE PRE-FIX SHAPE (D6): a real STOP spends the address like a guess, so a burst of genuine
    // STOPs behind one carrier-NAT address after a large send runs it dry.
    if (!d.actsChargeHits && (r.ok || r.reason === "error")) await rateRefundAsync(clientKey, OPTOUT_BUDGET);
    return r;
  };

  /** `refusalKindFor`, written out. ⛔ THE PRE-FIX SHAPE (2026-09-27): every `!ok` but a failed read was
   *  "this link does not work", so a person behind a dry address was told their genuine link was broken. */
  const refusalKind = (r: { ok: boolean; reason?: string } | null): string | null => {
    if (!r) return "failed";
    if (r.ok) return null;
    return r.reason === "throttled" && !d.throttledReadsInvalid ? "busy" : "invalid";
  };

  return {
    stop, resume, isSuppressed, mint, resolveWithin, stopWithin, refusalKind,
    resolve: async (t) => ({ ok: (await resolve_(t)) !== null }),
    confirms: d.confirms === true,
  };
}

/* ══ RUN ════════════════════════════════════════════════════════════════════════════════════ */
if (!PROVE_RED) {
  const f = await seed(0);
  await runAssertions(SHIPPED, f, "");
  await runSurface(f);
  console.log(`\nmarketing-optout: ${pass} passed, ${fail} failed`);
  process.exitCode = fail === 0 ? 0 : 1;
} else {
  const problems: string[] = [];

  // §0 — the shipped page passes first, or "every proof held" means nothing.
  const f0 = await seed(90);
  await runAssertions(SHIPPED, f0, "base:");
  await runSurface(await seed(89));
  if (fail !== 0) problems.push(`BASELINE: the shipped page is already red (${failed.join(" | ")})`);
  console.log(`\n§0 baseline · shipped page: ${pass} passed, ${fail} failed\n`);

  // §0b — the MODEL is faithful, so a flag is the only thing a red case can be blamed on.
  pass = 0; fail = 0; failed.length = 0;
  const fm = await seed(91);
  await runAssertions(pageWithDefect({}), fm, "model:");
  if (fail !== 0) problems.push(`MODEL: the defect-free model disagrees with the shipped page (${failed.join(" | ")})`);
  console.log(`\n§0b model · no defect set: ${pass} passed, ${fail} failed\n`);

  const CASES: Array<{ name: string; defect: Defect; expect: string }> = [
    {
      name: "the token EXPIRES after a year (OD43 broken) — a person who kept the SMS cannot leave",
      defect: { expires: true },
      expect: "23 · ⭐ A TOKEN MINTED 400 DAYS AGO STILL RESOLVES (OD43) — a link that stops working is a person who cannot leave",
    },
    {
      name: "the click requires a CONFIRMATION step — everybody who abandons it stays marketable believing they opted out",
      defect: { confirms: true },
      expect: "4 · ⛔ ONE CLICK — the page puts no confirmation step between the tap and the write",
    },
    {
      name: "the GATE cannot see the lift — 'start them again' reports a success the send loop will not honour",
      defect: { ignoresLift: true },
      expect: "12 · 🔴 …and the GATE GIVES BACK ITS PRE-STOP ANSWER, not `suppressed` — without this, 'start them again' is a false success",
    },
    {
      name: "re-suppression returns the LIFTED row (`update: {}`) — told they will never be marketed again while the lift stands",
      defect: { reStopIsNoop: true },
      expect: "17 · 🔴 …and the GATE REFUSES IT AGAIN ON THE SUPPRESSION ITSELF — re-suppression must RE-ARM a lifted row, not hand it back",
    },
    {
      name: "resubscribe REMOVES the suppression row instead of superseding it — the evidence that this person once said no is destroyed (OD11)",
      defect: { deletesOnResume: true },
      expect: "13 · ⛔ A LIFT NEVER REMOVES A ROW (OD11) — the evidence that they once said no survives",
    },
    {
      name: "an UNMINTED token reports success — the false success U8's own copy forbids",
      defect: { falseSuccess: true },
      expect: "25 · ⛔ AN UNMINTED TOKEN IS REFUSED, NEVER QUIETLY SUCCEEDED — a success nobody can act on is the defect this unit exists to prevent",
    },
    {
      name: "the lift is read STRICTLY (`=== null`) — a suppression row carrying no lift field reads as LIFTED, and a person who said stop becomes marketable",
      defect: { strictLift: true },
      expect: "29 · 🔴 A SUPPRESSION ROW CARRYING NO LIFT FIELD AT ALL STILL REFUSES — the predicate fails CLOSED, because `undefined === null` is false and the open direction is a breach",
    },
    {
      name: "the player lookup skips `userPhoneKeyFor` — every player's own toggle is silently left untouched",
      defect: { noBridge: true },
      expect: "20 · ⭐ stopping from the LINK turns the PLAYER'S OWN PROFILE TOGGLE off — `User.phoneE164` is `+255…` and the marketing key is bare `255…`, so a bare lookup would have found nobody and silently done nothing",
    },
    // ── D6 (2026-09-26) ──
    { name: "D6 · the token is NOT case-folded — a link typed off a phone screen is told it does not work", defect: { caseSensitive: true }, expect: L.lower },
    { name: "D6 · resume lifts ANY stop — one tap on an old SMS undoes an officer's suppression", defect: { liftsAnyReason: true }, expect: L.operator },
    { name: "D6 · the RESUME row records the STOP instruction as the sentence consented to", defect: { resumeStoresStop: true }, expect: L.resumeWording },
    { name: "D6 · the LIVE token is written into evidence, where any audit reader can act as the person", defect: { rawTokenEvidence: true }, expect: L.evidence },
    { name: "D6 · `already` returns before a half-landed stop is finished — the ledger stays GIVEN and the toggle ON", defect: { alreadySkipsRepair: true }, expect: L.repair },
    { name: "D6 · the mint stores `+255…` as given — its STOP writes a suppression the gate never finds", defect: { mintKeepsRaw: true }, expect: L.mint },
    { name: "D6 · a link switches a SELF-EXCLUDED player's toggle back on", defect: { flipsSelfExcluded: true }, expect: L.selfExcluded },
    { name: "D6 · the page's GET is not budgeted — every guess is a free yes/no", defect: { noGetBudget: true }, expect: L.walkerDry },
    { name: "D6 · a valid link spends the budget like a miss — a person's own opens run them dry", defect: { chargesHits: true }, expect: L.personFree },
    { name: "D6 · the two acts are not budgeted — a script POSTs guesses for free", defect: { noActBudget: true }, expect: L.actWalker },
    { name: "D6 · a held link's acts are uncapped — stop/start at request speed, a ledger row each", defect: { noLinkCap: true }, expect: L.linkCap },
    { name: "D6 · a real STOP spends the address like a guess — genuine STOPs behind one NAT run it dry", defect: { actsChargeHits: true }, expect: L.hitFree },
    // ── 2026-09-27 ──
    { name: "a dry budget tells a genuine link 'this link does not work' — so the person never tries again", defect: { throttledReadsInvalid: true }, expect: L.busy },
  ];

  for (const [i, c] of CASES.entries()) {
    pass = 0; fail = 0; failed.length = 0;
    const tag = `red${i + 1}:`;
    console.log(`── case ${i + 1}: ${c.name}`);
    const fx = await seed(i + 1);
    await runAssertions(pageWithDefect(c.defect), fx, tag);
    const wanted = `${tag}${c.expect}`;
    if (fail === 0) problems.push(`case ${i + 1} (${c.name}): stayed GREEN`);
    else if (!failed.includes(wanted)) problems.push(`case ${i + 1} (${c.name}): red, but not on "${c.expect}" — got ${failed.join(" | ")}`);
    else console.log(`   caught → ${c.expect}\n`);
  }

  const caught = CASES.length - problems.filter((x) => x.startsWith("case")).length;
  console.log(`\n${caught}/${CASES.length} caught`);

  /* ── THE SURFACE PLANTS — one in-memory edit each, of the source text an S-check reads or of the
   * dictionary it reads. ⛔ Each anchor must resolve EXACTLY ONCE in the file as it stands, or the plant
   * is reported as rotted: a plant that edits nothing proves nothing. */
  const PRIMER = "src/components/onboarding/first-visit-primer.tsx";
  const CHAT = "src/components/chat/ChatRoot.tsx";
  const CHANNELS = "src/components/social/channels-panel.tsx";
  const SHELL = "src/components/layout/app-shell.tsx";
  const PAGE = "src/app/s/[token]/page.tsx";
  const CLIENT = "src/app/s/[token]/optout-client.tsx";
  const LOADING = "src/app/s/[token]/loading.tsx";
  const ACTIONS = "src/app/s/[token]/actions.ts";
  const REFUSAL = "src/app/s/optout-refusal.tsx";
  const BARE = "src/app/s/page.tsx";
  const SKELETON = `data-skeleton="action" className="flex h-[var(--h-control-lg)] w-full items-center justify-center rounded-control border border-border bg-bg-elevated kp-shimmer-track text-body font-semibold text-text-muted"`;
  const STACK = `<div role="status" aria-busy="true" className="space-y-5">`;
  const BAR_DEF = `const BAR = "text-transparent bg-bg-elevated rounded-sm ring-1 ring-inset ring-border box-decoration-clone";`;
  /** Sets one dictionary sentence for the length of a case; returns the undo. */
  const setCopy = (loc: "sw" | "en" | "zh", key: string, value: () => string) => () => {
    const o = dict[loc].optout as Record<string, string>;
    const had = Object.prototype.hasOwnProperty.call(o, key);
    const was = o[key];
    o[key] = value();
    return () => { if (had) o[key] = was; else delete o[key]; };
  };
  /** `swap` (2026-09-27): replaces an imported function the S-checks call, for the length of a case. */
  const SURFACE_CASES: Array<{ name: string; expect: string; plant?: SurfacePlant; copy?: () => () => void; swap?: () => () => void }> = [
    { name: "D6 · the first-visit primer opens on /s again", expect: SL.overlay("first-visit-primer.tsx"),
      plant: { file: PRIMER, from: "(auth|admin|s)(", to: "(auth|admin)(" } },
    { name: "D6 · the chat bubble sits on /s again", expect: SL.overlay("ChatRoot.tsx"),
      plant: { file: CHAT, from: "(auth|admin|s)(", to: "(auth|admin)(" } },
    { name: "D6 · the socials interstitial may open on /s again", expect: SL.overlay("channels-panel.tsx"),
      plant: { file: CHANNELS, from: String.raw`= /^\/s(\/|$)|^\/(auth`, to: String.raw`= /^\/(auth` } },
    { name: "D6 · /s renders inside the full betting shell", expect: SL.shellFirst,
      plant: { file: SHELL, from: "if (isOptOutPath(pathname)) {", to: "if (isOptOutPath(pathname) && false) {" } },
    { name: "D6 · the opt-out shell grows a sign-up link", expect: SL.noUpsell,
      plant: { file: SHELL, from: "<LanguageMenu />", to: `<LanguageMenu /><a href="/auth/register">{t.nav.signUp}</a>` } },
    { name: "D6 · the opt-out shell drops the regulator's licence line", expect: SL.shellCarries,
      plant: { file: SHELL, from: "{LICENCE_NUMBER()}", to: "" } },
    { name: "D6 · a stopped number keeps the 'stop' heading above a button that re-subscribes", expect: SL.heading,
      plant: { file: CLIENT, from: "? t.optout.stoppedTitle", to: "? t.optout.title" } },
    { name: "D6 · the resume button sits under the STOP instruction, not its consent sentence", expect: SL.consentBeside,
      plant: { file: CLIENT, from: "{t.push.marketingBody}</p>", to: "{t.optout.body}</p>" } },
    { name: "D6 · the failure is a silent note, never announced", expect: SL.announced,
      plant: { file: CLIENT, from: ` role="alert"`, to: "" } },
    { name: "D6 · a failed resume offers the STOP button — the button follows the last state, not the truth", expect: SL.sameAct,
      plant: { file: CLIENT, from: "{!isSuppressed ? (", to: `{!(state === "stopped" || state === "already") ? (` } },
    { name: "D6 · a rejected action falls to the root error boundary", expect: SL.caught,
      plant: { file: CLIENT, from: `fn(token).catch(() => ({ ok: false as const, reason: "error" }))`, to: "fn(token)" } },
    { name: "D6 · the confirmation shrinks back to an 11px footnote", expect: SL.bodySize,
      plant: { file: CLIENT, from: `<Callout size="md" tone={message.tone}`, to: "<Callout tone={message.tone}" } },
    { name: "a success is painted on the click, not read from the server's answer", expect: SL.serverAnswer,
      plant: { file: CLIENT, from: `setState(r.ok ? r.state : "error");`, to: `setState(act === "STOP" ? "stopped" : "resumed");` } },
    { name: "a confirmation step gets a state to live in", expect: SL.noConfirm,
      plant: { file: CLIENT, from: `useState<"idle" | "stopped"`, to: `useState<"idle" | "confirm" | "stopped"` } },
    { name: "the page hands the RAW number to the client", expect: SL.mask,
      plant: { file: PAGE, from: "masked={r.masked}", to: "masked={r.identifier}" } },
    { name: "the refusal tells the reader to tap a button that is not there", expect: SL.refusalNoTap,
      plant: { file: REFUSAL, from: "{invalidNextStep(t)}", to: "{t.optout.body}" } },
    { name: "D6 · the refusal is a dead end again", expect: SL.nextStep,
      plant: { file: REFUSAL, from: `action={<NextSteps t={t} retryHref={kind === "invalid" ? undefined : retryHref} />}`, to: "" } },
    { name: "2026-09-27 · the page picks its refusal by hand again — a dry budget reads 'this link does not work'", expect: SL.retry,
      plant: { file: PAGE, from: `kind={refusalKindFor(r) ?? "invalid"}`, to: `kind={r ? "invalid" : "failed"}` } },
    { name: "D6 · the skeleton promises two buttons", expect: SL.loadingOne,
      plant: { file: LOADING, from: SKELETON, to: `${SKELETON} data-second="h-[var(--h-control-lg)]"` } },
    { name: "2026-09-27 · the skeleton's sentence goes back to a hand-sized bar", expect: SL.loadingSame,
      plant: { file: LOADING, from: "<p className={ACT_SENTENCE}><span className={BAR}>{t.optout.body}</span></p>", to: `<div className="w-full rounded bg-bg-elevated" style={{ height: 42 }} />` } },
    { name: "2026-09-27 · the read-aloud line goes back to FIRST in the spaced stack (the 24px drop)", expect: SL.loadingOrder,
      plant: { file: LOADING, from: STACK, to: `${STACK}<p className="sr-only">{t.optout.loading}</p>` } },
    { name: "2026-09-27 · the bars go back to a near-invisible overlay tint", expect: SL.loadingVisible,
      plant: { file: LOADING, from: BAR_DEF, to: `const BAR = "text-transparent bg-bg-overlay/40 rounded-sm box-decoration-clone";` } },
    { name: "2026-09-27 · a failed tap offers only 'try again' again — no way to reach us", expect: SL.contactOnError,
      plant: { file: CLIENT, from: `{contact}`, to: "" } },
    { name: "2026-09-27 · the failure goes back ABOVE the button — the button drops and the desk's tel: row lands under the thumb", expect: SL.errorBelow,
      plant: { file: CLIENT, from: "<dl>", to: `{state === "error" && <p>{t.optout.error}</p>}<dl>` } },
    { name: "2026-09-27 · the heading reads the failure, not the last OK answer — it changes height under the thumb", expect: SL.errorBelow,
      plant: { file: CLIENT, from: `: said === "resumed" ? t.optout.resumedTitle`, to: `: state === "resumed" ? t.optout.resumedTitle` } },
    { name: "2026-09-27 · the failed tap's alert scrolls itself into view — the button moves with the page", expect: SL.errorBelow,
      plant: { file: CLIENT, from: "errRef.current?.focus({ preventScroll: true })", to: "errRef.current?.focus()" } },
    { name: "2026-09-27 · the pending label goes back to the disabled 0.45 dim", expect: SL.busyLegible,
      plant: { file: CLIENT, from: `const BUSY_LEGIBLE = "aria-busy:disabled:opacity-85 aria-busy:disabled:cursor-progress";`, to: `const BUSY_LEGIBLE = "";` } },
    { name: "2026-09-27 · the heading loses its keep-words span — zh splits 接|收 again", expect: SL.wrap,
      plant: { file: CLIENT, from: "title={<span className={TITLE_TEXT}>{title}</span>}", to: "title={title}" } },
    { name: "2026-09-27 · the refusal's sentence loses text-pretty and break-keep — '…or contact / us.'", expect: SL.wrap,
      plant: { file: REFUSAL, from: "<span className={`block ${NOTICE_TEXT}`}>", to: `<span className="block">` } },
    { name: "2026-09-27 · the refusal's two buttons go back to one 4px-gap stack at two widths", expect: SL.stepsGroup,
      plant: { file: REFUSAL, from: "flex w-full max-w-xs flex-col items-stretch gap-2", to: "flex flex-col items-center gap-1" } },
    { name: "2026-09-27 · a zh heading loses its break hints — break-keep then breaks it only at punctuation", expect: SL.hints("zh"),
      copy: setCopy("zh", "resumedTitle", () => "您已选择重新接收短信优惠与资讯") },
    { name: "2026-09-27 · the sw heading loses its no-break space — 'kwa / SMS' splits again", expect: SL.hints("sw"),
      copy: setCopy("sw", "stoppedTitle", () => "Ofa na habari kwa SMS zimesimamishwa") },
    { name: "2026-09-27 · a break hint goes into ledger evidence (the stop sentence)", expect: SL.hints("zh"),
      copy: setCopy("zh", "body", () => dict.zh.optout.body.replace("。", `。${String.fromCharCode(0x200b)}`)) },
    { name: "2026-09-27 · the helpline loses its responsible-gambling line and reads as our own", expect: SL.rgContext,
      plant: { file: SHELL, from: `<p className="italic text-text-subtle text-body-sm text-balance break-keep">{t.footer.stopGambling}</p>`, to: "" } },
    { name: "2026-09-27 · the 18+ roundel gets its prohibited aria-label back", expect: SL.rgContext,
      plant: { file: SHELL, from: `<span className="kp-rg__18">`, to: `<span aria-label={t.footer.eighteenPlus} className="kp-rg__18">` } },
    { name: "2026-09-27 · the shell takes any /s/… path again — a deeper 404 renders inside the stripped shell", expect: SL.shellMatch,
      swap: () => { const was = shellMatch; shellMatch = (p) => p === "/s" || p.startsWith(OPTOUT_PATH); return () => { shellMatch = was; }; } },
    { name: "2026-09-27 · bare /s goes back to the root 404 inside the stripped shell", expect: SL.bare,
      plant: { file: BARE, from: `<OptOutRefusal t={t} kind="invalid" />`, to: "null" } },
    { name: "D6 · the acts bypass the budget", expect: SL.budgeted,
      plant: { file: ACTIONS, from: "return stopMarketingWithinBudget(token, await actLocale(), await optOutClientKey());", to: "return stopMarketing(token, await actLocale());" } },
    { name: "D6 · the resumed sentence promises delivery again", expect: SL.noPromise("sw"),
      copy: setCopy("sw", "resubscribed", () => "Utapokea tena matangazo ya 50pick.") },
    { name: "D6 · a genuine link is called 'not ours' again", expect: SL.notOurs("en"),
      copy: setCopy("en", "invalid", () => "This link is not one of ours, or it has been mistyped. Nothing has changed.") },
    { name: "D6 · the stopped heading is the stop instruction again", expect: SL.headings("zh"),
      copy: setCopy("zh", "stoppedTitle", () => dict.zh.optout.title) },
    { name: "2026-09-27 · the English heading says 'marketing messages' again — a third name for one thing", expect: SL.noun("en"),
      copy: setCopy("en", "title", () => "Stop marketing messages") },
    { name: "D6 · the next step types the toggle's name out, so a rename strands it", expect: SL.placeholders("sw"),
      copy: setCopy("sw", "invalidNext", () => "Ili kuacha matangazo, wasiliana nasi.") },
  ];
  for (const [i, c] of SURFACE_CASES.entries()) {
    pass = 0; fail = 0; failed.length = 0;
    console.log(`── surface case ${i + 1}: ${c.name}`);
    SURFACE_PLANT = c.plant ?? null;
    surfacePlantHits = -1;
    const undo = c.copy ? c.copy() : c.swap ? c.swap() : () => {};
    try {
      await runSurface(await seed(200 + i));
    } finally {
      undo();
      SURFACE_PLANT = null;
    }
    if (c.plant && surfacePlantHits !== 1) problems.push(`surface case ${i + 1} (${c.name}): its anchor resolved ${surfacePlantHits} time(s) in ${c.plant.file}, not once — the plant has rotted`);
    else if (fail === 0) problems.push(`surface case ${i + 1} (${c.name}): stayed GREEN`);
    else if (!failed.includes(c.expect)) problems.push(`surface case ${i + 1} (${c.name}): red, but not on "${c.expect}" — got ${failed.join(" | ")}`);
    else console.log(`   caught → ${c.expect}\n`);
  }
  const surfaceCaught = SURFACE_CASES.length - problems.filter((x) => x.startsWith("surface case")).length;
  console.log(`\n${surfaceCaught}/${SURFACE_CASES.length} surface plants caught`);
  if (problems.length) {
    console.log("\nPROBLEMS:");
    for (const x of problems) console.log(`  ✗ ${x}`);
    process.exitCode = 1;
  } else {
    console.log("RED PROOF COMPLETE");
    process.exitCode = 0;
  }
}
