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
 * Run:  npm run test:marketing-optout
 * Red:  npm run red:marketing-optout
 */
process.env.SESSION_SECRET ??= "test-only-session-secret-32chars-min-aaaa";

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { db } from "../src/lib/server/store.ts";
import type { StoredUser, MessagingKey, MessagingLocale } from "../src/lib/server/store.ts";
import { toMsisdn255 } from "../src/lib/phone-normalize.ts";
import { mayReceiveMarketingSms } from "../src/lib/server/marketing/consent.ts";
import {
  resolveOptOutToken, stopMarketing, resumeMarketing, mintOptOutToken,
  optOutWording, OPTOUT_MINT_ATTEMPTS,
} from "../src/lib/server/marketing/optout-service.ts";
import type { OptOutActResult } from "../src/lib/server/marketing/optout-service.ts";
import { OPTOUT_TOKEN_CHARS, OPTOUT_PATH } from "../src/lib/marketing/footer.ts";
import { OPTOUT_TOKEN_ALPHABET, isOptOutTokenShape } from "../src/lib/marketing/optout.ts";
import { gaExcluded } from "../src/lib/google-tag.ts";
import { isProtectedPath } from "../src/proxy.ts";
import { dict } from "../src/lib/i18n-dict.ts";

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
  /** ⭐ "Is this number still refusing?" — the DAL's own question, in the shape, so the strict
   *  `=== null` predicate that failed OPEN can be planted and proven to fire. An assertion no
   *  plant can reach is an assertion that cannot fail. */
  isSuppressed: (key: MessagingKey) => Promise<boolean>;
  /** ⭐ Does the RENDERED page put a confirmation step between the tap and the write? */
  confirms: boolean;
};

const SHIPPED: OptOutPage = {
  stop: stopMarketing, resume: resumeMarketing, resolve: resolveOptOutToken,
  isSuppressed: async (key) => (await Promise.resolve(db.suppression.find(key))) !== null,
  confirms: false,
};

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

  return { contactToken, contactPhone, playerToken, playerPhone, playerId, ancientToken, unknownToken, legacyPhone };
}

/* ══ THE ASSERTIONS ═════════════════════════════════════════════════════════════════════════ */
async function runAssertions(page: OptOutPage, f: Fixtures, tag: string): Promise<void> {
  const p = (n: string) => `${tag}${n}`;
  const SW: MessagingLocale = "SW";
  /** ⭐ THE QUESTION THAT MATTERS — not what the page returned, but what the SEND LOOP will do. */
  const marketable = async (phone: string): Promise<boolean> => (await mayReceiveMarketingSms(phone)).ok;
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
  ok(p("1 · before anything, a consented contact may be marketed"), await marketable(f.contactPhone));
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
  ok(p("8 · ⛔ §5.14 — the evidence carries the TOKEN, never a raw phone number"),
    ledger?.evidence === `optout:${f.contactToken}` && !ledger.evidence.includes(toMsisdn255(f.contactPhone)));

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
  ok(p("12 · 🔴 …and the GATE LETS THE NUMBER THROUGH AGAIN — without this, 'start them again' is a false success"),
    await marketable(f.contactPhone));
  ok(p("13 · ⛔ A LIFT NEVER REMOVES A ROW (OD11) — the evidence that they once said no survives"),
    (await rows(f.contactPhone)).length === 1, `${(await rows(f.contactPhone)).length} rows`);
  const lifted = (await rows(f.contactPhone))[0];
  ok(p("14 · ⭐ …and the ORIGINAL refusal date is untouched, so 'when did they say no' is still answerable"),
    lifted !== undefined && lifted.createdAt === firstRow?.createdAt && lifted.liftedAt !== null,
    lifted ? `createdAt ${lifted.createdAt} liftedAt ${lifted.liftedAt}` : "the row is gone");
  const gaveConsent = await Promise.resolve(db.messagingConsent.latestFor(keyFor(toMsisdn255(f.contactPhone))));
  ok(p("15 · a GIVEN ledger row records the new consent, in the wording of the button they pressed"),
    gaveConsent?.status === "GIVEN" && gaveConsent.wording === optOutWording("RESUME", SW));

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
  // ⛔ These are the four properties no in-memory call can reach: they are facts about what
  // the route renders, and a suite that only exercised the service would pass with no page.
  const pageSrc = readFileSync(join(ROOT, "src/app/s/[token]/page.tsx"), "utf8");
  const clientSrc = readFileSync(join(ROOT, "src/app/s/[token]/optout-client.tsx"), "utf8");
  ok("S3 · the route is force-dynamic — a cached opt-out page would show one person another's state",
    /export const dynamic = "force-dynamic"/.test(pageSrc));
  ok("S4 · ⛔ NOINDEX — a crawler following one of these links is a crawler CLICKING an opt-out",
    /robots:\s*\{\s*index:\s*false/.test(pageSrc));
  ok("S5 · the page renders a MASKED number, never the raw one (§5.14)",
    /r\.masked/.test(pageSrc) && !/r\.identifier/.test(pageSrc));
  ok("S6 · a loading state exists — it is one of the unit's six",
    readFileSync(join(ROOT, "src/app/s/[token]/loading.tsx"), "utf8").length > 100);
  // ⭐ EVERY STATE HAS ITS OWN SENTENCE, IN ALL THREE LOCALES, AND THEY ARE ALL DIFFERENT.
  // The unit's six states are loading · valid (`body`) · already suppressed · resubscribed ·
  // invalid token · error, plus `done` — the sentence a person reads after the tap that worked.
  // ⛔ Distinctness is the assertion that matters: two states sharing a sentence is a person
  // who cannot tell "you are already stopped" from "that did not go through".
  const STATE_COPY = ["loading", "body", "already", "done", "resubscribed", "invalid", "error"] as const;
  for (const locale of ["sw", "en", "zh"] as const) {
    const d = dict[locale].optout;
    const said = STATE_COPY.map((k) => d[k as keyof typeof d] as string);
    ok(`S7.${locale} · each state has its own distinct sentence in ${locale.toUpperCase()}`,
      said.every((x) => typeof x === "string" && x.length > 0) && new Set(said).size === said.length,
      `${new Set(said).size} distinct of ${said.length}`);
  }
  ok("S8 · ⛔ the success sentence is rendered from the SERVER'S ANSWER, never painted on the click",
    /setState\(r\.ok \? r\.state : "error"\)/.test(clientSrc));
  // ⛔ READ THE STATE UNION, NOT THE PROSE. An earlier draft of this assertion grepped the file
  // for the word "confirm" — and the component's own comment EXPLAINING that there is no
  // confirmation step contains it. A guard whose verdict moves when somebody rewords a sentence
  // is not a guard. The union is the mechanical fact: a confirmation step needs a state to live
  // in, and there is no state here it could occupy.
  const union = clientSrc.match(/useState<([^>]+)>/)?.[1] ?? "";
  const members = union.split("|").map((x) => x.trim().replace(/"/g, "")).sort();
  ok("S9 · ⛔ NO CONFIRMATION STEP CAN EXIST — the component's state union is exactly the five outcomes, with no step between the tap and the write",
    members.join(",") === "already,error,idle,resumed,stopped", `union = [${members}]`);

  // ── THE TOKEN'S ARITHMETIC ──────────────────────────────────────────────────────────────
  ok("S10 · the alphabet is the 32-character ambiguity-free one, and 256 divides by it exactly — so the fold carries NO modulo bias",
    OPTOUT_TOKEN_ALPHABET.length === 32 && 256 % OPTOUT_TOKEN_ALPHABET.length === 0);
  ok("S11 · ⛔ I, O, 0 and 1 are absent — a token is read off a phone screen and typed by hand",
    !/[IO01]/.test(OPTOUT_TOKEN_ALPHABET));
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
};

const TOKEN_MAX_AGE_MS = 365 * 86400_000;

function pageWithDefect(d: Defect): OptOutPage {
  /** The model's own resolution, so `expires` and `falseSuccess` can be planted into it. */
  const resolve_ = async (token: string) => {
    if (!isOptOutTokenShape(token)) return null;
    const row = await Promise.resolve(db.marketingOptOutToken.find(token));
    if (!row) return null;
    // ⛔ THE PRE-FIX SHAPE: an expiry on a link OD43 says never expires.
    if (d.expires && Date.now() - new Date(row.createdAt).getTime() > TOKEN_MAX_AGE_MS) return null;
    return row;
  };
  const lookupUser = async (identifier: string) =>
    Promise.resolve(db.user.findByPhone(d.noBridge ? identifier : `+${identifier}`));

  const stop = async (token: string, locale: MessagingLocale): Promise<OptOutActResult> => {
    const row = await resolve_(token);
    // ⛔ THE PRE-FIX SHAPE: a token nobody minted is told it worked.
    if (!row) return d.falseSuccess ? { ok: true, state: "stopped" } : { ok: false, reason: "unknown" };
    const key = keyFor(row.identifier);
    const active = await Promise.resolve(db.suppression.find(key));
    if (active) return { ok: true, state: "already" };
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
        reason: "WITHDRAWN", evidence: `optout:${token}`, recordedBy: null,
        createdAt: new Date().toISOString(), liftedAt: null, liftedReason: null,
      }));
    }
    await Promise.resolve(db.messagingConsent.create({
      id: `ml${seq++}`, channel: "SMS", identifier: row.identifier, category: "MARKETING",
      status: "WITHDRAWN", source: "OPT_OUT_PAGE", wording: optOutWording("STOP", locale),
      locale, evidence: `optout:${token}`, recordedBy: null, createdAt: new Date().toISOString(),
    }));
    const u = await lookupUser(row.identifier);
    if (u && u.marketingOptIn !== false) await db.user.update(u.id, { marketingOptIn: false });
    return { ok: true, state: "stopped" };
  };

  const resume = async (token: string, locale: MessagingLocale): Promise<OptOutActResult> => {
    const row = await resolve_(token);
    if (!row) return d.falseSuccess ? { ok: true, state: "resumed" } : { ok: false, reason: "unknown" };
    const key = keyFor(row.identifier);
    const all = await Promise.resolve(db.suppression.listFor(row.identifier));
    const mine = all.find((r) => r.channel === key.channel && r.category === key.category);
    if (mine && mine.liftedAt === null) {
      // ⛔ THE PRE-FIX SHAPE ①: the row is DELETED rather than superseded — the evidence that
      // this person once said no is destroyed, which is what OD11 forbids.
      if (d.deletesOnResume) {
        // ⚠️ NEITHER TWIN HAS A DELETE TO CALL — that is the whole point of §17 — so the model
        // reproduces what a delete LOOKS LIKE TO EVERY READER instead: the row stops being part
        // of this person's suppression history. `listFor` no longer returns it, which is exactly
        // the observable consequence of the `deleteMany` this plant stands in for.
        mine.identifier = `__removed__${mine.id}`;
        mine.liftedAt = new Date().toISOString();
        mine.liftedReason = `optout:${token}`;
      // ⛔ THE PRE-FIX SHAPE ②: the lift is written but the GATE cannot see it, so the page
      // reports a success the send loop will not honour.
      } else if (d.ignoresLift) {
        mine.liftedReason = `optout:${token}`; // recorded, but `liftedAt` stays null
      } else {
        mine.liftedAt = new Date().toISOString();
        mine.liftedReason = `optout:${token}`;
      }
    }
    await Promise.resolve(db.messagingConsent.create({
      id: `ml${seq++}`, channel: "SMS", identifier: row.identifier, category: "MARKETING",
      status: "GIVEN", source: "OPT_OUT_PAGE", wording: optOutWording("RESUME", locale),
      locale, evidence: `optout:${token}`, recordedBy: null, createdAt: new Date().toISOString(),
    }));
    const u = await lookupUser(row.identifier);
    if (u && u.marketingOptIn !== true) await db.user.update(u.id, { marketingOptIn: true });
    return { ok: true, state: "resumed" };
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
  return {
    stop, resume, isSuppressed,
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
      expect: "12 · 🔴 …and the GATE LETS THE NUMBER THROUGH AGAIN — without this, 'start them again' is a false success",
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
  if (problems.length) {
    console.log("\nPROBLEMS:");
    for (const x of problems) console.log(`  ✗ ${x}`);
    process.exitCode = 1;
  } else {
    console.log("RED PROOF COMPLETE");
    process.exitCode = 0;
  }
}
