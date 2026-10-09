/**
 * test:policy-lines — U33p's guard: THE PUBLIC POLICY LINES, EDITABLE (spec `docs/marketing-specs/U33a-U37c-OD58.md` §5.2 ·
 * §6 U33p · §9 U33p; OD58 · S15 · F3; the owner rule of 2026-10-03, "admins can change everything"; the U33p review, F1–F13
 * and its notes).
 *
 * ⭐ DRIVEN, NOT READ, wherever the behaviour can run in a script. The store under test is the REAL one — the readers, the
 * verified setter and the pages' wrapper of `src/lib/server/legal/policy-lines.ts`, built by its own `makeStore` over a
 * second instance of the real `defineConfig` factory (`__policyLinesStoreForTest`) — against an in-memory row that answers
 * like Postgres (every write kept as a JSON copy, every read a JSON copy back), so the read-back and the hydration gate run
 * as in production. And the RG page's own `content()` is rendered in-process over the LIVE store, before and after a save:
 *   L0  the keys, the pages and their versions — five lines on two pages; each page's code version is the one its META
 *       prints, in all three languages (the version every stamp records as its base);
 *   L1  ⛔ nothing prints differently until a save — each default IS today's page text, byte for byte, in every language,
 *       decoded from the JSX inside the page's own wrapper; each wrapper sits where its line prints (RG §4 first bullet;
 *       Privacy §3 Consent, then the licence bullet; Privacy §4 the SMS gateway) and carries its one-line note; every default is
 *       a fixed point of the normaliser and passes its own rules with no problem and no hint; the renderer prints a saved
 *       line equal to today's text in today's markup; the consent-only clause and the required words are said by the
 *       defaults (one matcher, `holdsRequiredWord`), the gateway default names no company (2026-10-09); and both English
 *       hash pins, recomputed over the stripped pages, are the pins the sibling suites hold;
 *   L2  the pages print a saved line in place of the default — the wrapper's renderer, the wiring of both pages and their
 *       META, and the RG page's `content()` rendered before (today's text) and after a live save (the saved line);
 *   L3  the validator — every promise's words READ as it in EVERY language (F2 · F3): the late-night words matched whole
 *       (night, evening, midnight, after dark, quiet hours, bedtime, overnight …), a clock time in any spelling, the Swahili
 *       and Chinese late-night words, and a frequency cap — and judged by the map: refused by name while unkept (the
 *       frequency cap), accepted while kept (the late-night window, kept since U13's send window); each kept promise
 *       accepted, the two age promises read apart (F13); a kept promise the PUBLISHED line makes and the new one drops a
 *       hint; one language changed and another not a hint; each refusal in its own words, every problem at once; the
 *       no-break space read as a space and the RG
 *       binding applied again (F9); Chinese tightened (F10);
 *   L4  the version — the stamp arithmetic; ONE function prints the version from (code, stamp, base) so a same-day code
 *       bump never reuses a label (F5); through the store each page moves once per save of NEW WORDS and a review-only save
 *       moves nothing (F1); every expected stamp derived from the code's versions, never typed (F7);
 *   L5  the opening checks read the saved lines — check 1 over all four page lines in every language (F11), check 2 with a
 *       review counted only against today's code default (F4), check 3;
 *   L6  the store — verified and audited; a review stored as a marker (F4); an append-only history (F12); a newer build's
 *       field kept; the record readable only while hydrated and read in full (F8); stale pages (m1), a row read in part
 *       (M1), two saves at once (D9);
 *   L7  the wiring — the action, the card, the system page and its tab, the server module, the pure modules' purity, the
 *       client-graph pins, the sibling suites' imports and stripped reads, the scripts, predeploy and the drive's key;
 *   L8  the request read as hostile — the card sends exactly the lines that change, its request reads back exactly, and
 *       anything else is not understood and writes nothing;
 *   L9  ⛔ the suite never touches a real database (F6) — its guard runs before the first server module loads;
 *   L10 U13 · the RG line's hours and the evening — every time it names, in any spelling and language, must be the send
 *       window's opening or closing time as SAVED (refused in the window's words otherwise; unreadable hours refuse any
 *       time); evening words are their own unkept promise and night words the kept one; the save reads the window fresh
 *       and refuses, writing nothing, while it cannot be read; the card, the page and the server read the one window.
 *
 * ⛔ IN-PROCESS BY CONSTRUCTION. `--prove-red` plants each defect IN MEMORY — one rule, one piece of the store, one source
 * string — and requires the MATCHING assertion to fail. This file makes no file-modifying call of any kind, so it stays in
 * `test:red-anchors` §4's in-process class. ⛔ No pattern here holds a backslash: an editing tool decodes typed escapes
 * (repo memory, 2026-10-02), so line breaks and invisible characters are built from their codes.
 *
 * Run:  npm run test:policy-lines
 * Red:  npm run red:policy-lines
 */
process.exitCode = 1;

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { createElement, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { decomment } from "./lib/decomment.mts";
import { isDirective } from "./lib/is-directive.mts";
import { policyLineTagCount, stripPolicyLineTags } from "./lib/policy-line-source.mts";
import { KEPT_PROMISES, PROMISE_KEYS, promisesIn, type KeptPromise, type PromiseKey } from "../src/lib/legal/kept-promises.ts";
import {
  ANALYTICS_CONSENT_WORDS, CONSENT_ONLY_CLAUSE, CONSENT_WITHDRAW_PATH, EMPTY_POLICY_LINES, POLICY_DEFAULT_SEND_WINDOW, POLICY_LINE_DEFAULTS,
  POLICY_LINE_KEYS, POLICY_LINE_RULES, POLICY_LINE_SENTENCE, POLICY_LINE_SPEC, POLICY_LOCALES, POLICY_LOCALE_NAME, POLICY_PAGES,
  POLICY_PAGE_KEYS, SMS_GATEWAY_WORDS, comparePolicyVersions, holdsConsentOnlyPhrase, holdsRequiredWord, isPolicyVersion, isReviewVersion,
  mergePolicyLines, metaWithVersion, nextPolicyVersion, normalizePolicyLine, normalizedPolicyTexts, policyBaseFieldName,
  policyDefaultFingerprint, policyLineChanges, policyLineParts, policyLineProblems, policyLineState, policyLinesPostEntries,
  policyLinesToSave, policyOpeningProblems, policyReviewFieldName, policyTextFieldName, printedPolicyVersion, readPolicyLines,
  readPolicyLinesPatch, readPolicyLinesReport,
} from "../src/lib/legal/policy-lines.ts";
import type {
  PolicyCardState, PolicyLineHistory, PolicyLineKey, PolicyLineProblem, PolicyLineRules, PolicyLineVerdict, PolicyLineVersion,
  PolicyLinesRecord, PolicyLocale, PolicyPageStamp, PolicyReviewVersion, PolicySendWindow, PolicyTexts, PolicyWordsVersion,
} from "../src/lib/legal/policy-lines.ts";
import type { PolicyLinesStore, PolicySendWindowRead } from "../src/lib/server/legal/policy-lines.ts";
import { patchFromForm } from "../src/lib/marketing/marketing-wordings.ts";

/* ══ ⛔ F6 · NEVER A REAL DATABASE ════════════════════════════════════════════════════════════════════════════════════
 * The database variables are removed HERE, and every server module this suite drives is loaded right below, dynamically —
 * the store, the audit log and the config factory pick their twin when they load, and nothing above this point imports
 * one (the static imports are the pure modules and the suite's own helpers; L9 holds that, and the live save below is
 * handed the instant it stamps). So a run on a machine with a database configured can never write a policy line, a page
 * version or an audit row into it — the `test:campaign-compose` idiom. */
delete process.env.DATABASE_URL;
delete process.env.REDIS_URL;
delete process.env.REDIS_ENABLED;
const { auditFlush, getAuditForActor } = await import("../src/lib/server/audit.ts");
const SERVER = await import("../src/lib/server/legal/policy-lines.ts");
const { content: rgContent } = await import("../src/app/legal/responsible-gambling/page.tsx");
const { POLICY_LINES_AUDIT, PolicyLine, policyLineNode } = SERVER;

const PROVE_RED = process.argv.includes("--prove-red");

let pass = 0, fail = 0;
const failed: string[] = [];
const ok = (label: string, cond: boolean, detail = "") => {
  if (cond) pass++; else { fail++; failed.push(label); }
  console.log(`${cond ? "PASS" : "FAIL"} ${label}${detail ? ` — ${detail}` : ""}`);
};

/* ══ THE LABELS — each once, so a red case names exactly the line it must turn red ═══════════════════════════════ */

const L = {
  l0: "L0 · the keys, the pages and their versions — five lines in the card's order, each on its page (the profile note on none), only the licence bullet and the note clearable, only the two §3 bullets labelled, and each page's code version the one its META prints in en, sw and zh",
  l1: "L1 · ⛔ nothing prints differently until a save — each default is today's page text byte for byte in every language, decoded from the JSX inside the page's own wrapper; each wrapper sits where its line prints, in its own language's block, with its one-line note; every default is a fixed point of the normaliser and passes its own rules with no problem and no hint; a saved line equal to today's text prints today's markup; the consent-only clause and the required words are said by the defaults (one matcher, `holdsRequiredWord`), and the gateway default names no company (2026-10-09); and both English hash pins, over the stripped pages, are the sibling suites' pins",
  l2: "L2 · the pages print a saved line in place of the default — the wrapper prints the saved words in today's markup, its children while it has none and nothing for a saved blank; both pages are wired to it and print META through policyMeta; and the RG page's own content() prints today's text before a live save and the saved line after it, with the licence bullet, the version derived from the code's, and the record readable",
  l3: "L3 · the validator — every promise's words read as it in every language (the late-night words matched whole, a clock time in any spelling, the Swahili and Chinese late-night words, a frequency cap) and judged by the map: refused by name while unkept (the frequency cap), accepted while kept (the late-night window, since U13); each kept promise accepted and the two age promises read apart; a kept promise the published line makes and the new one drops a hint; one language changed and another not a hint; a blank language, markup, a phone number or any run of seven digits, an unbroken run over 30 characters, too long, too short, a missing gateway word and a missing Consent word each refused in its own words, every problem at once; the clearable lines all or nothing; the Appendix B drafts pass; every no-break space read as a space and the RG sw and zh binding applied again; Chinese tightened with Latin–Han spacing kept; and the normaliser idempotent",
  l4: "L4 · the version — the first save of an EAT day stamps the day, a second .2, a third .3, up to four digits; the next day the bare date; ONE function prints the version from code, stamp and base, so a same-day code bump or a code edit after a .2 stamp never reuses a label; META prints that version; through the store each page moves once per save of new words, a review-only save writes its marker and audit row and moves nothing, the profile note moves none, the audit row names the version, and every expected stamp is derived from the code's versions",
  l5: "L5 · the opening checks read the saved lines — nothing saved, or today's words saved, fails all three; the Appendix B lines pass, and so does a Consent bullet reviewed against today's code default, but not one reviewed against an old one; a consent-only phrase in the SMS gateway line in en, sw or zh (or capitalised), or in any other page line, fails check 1; a blank licence bullet fails check 2; an RG line that names no staff fails check 3",
  l6: "L6 · the store — a valid save is verified and audited { before, after, changes } as config.policy_lines_updated, with the code default's fingerprint; an unchanged save writes nothing; today's words are written only with the review tick, as a marker that prints nothing new and moves no version, and only once; new words append and version 1 stays as it was; the append-only check refuses a rewrite, a drop, two at once, a misnumbering and an unknown key, and the server runs it before every write; a newer build's field is read and kept; a stale page (behind or ahead) is refused under its box and writes nothing; a process that never loaded the row refuses and is not readable; a row read in part is never rewritten and is not readable (M1) while a row read in full saves; two saves at once keep both lines (D9)",
  l7: "L7 · the wiring — the action asks requireAdmin first, reads its form with patchFromForm, saves through the verified setter, names a box per refusal, reports the moved lines and revalidates both legal pages; the card validates live against the words printed now, re-reads every saved line on load, builds its request with policyLinesToSave and policyLinesPostEntries, never holds a save silently, imports nothing from the server and says where the note prints (under the offers switch, only for a player reached under the licence — U33a-P shipped it); the page renders it on its own tab and reads its rows only there; the server module is the live store, runs its append-only check, stamps only for moved lines and exports the readable predicate; the pure modules are pure and pinned; the sibling suites import the shared tables and read the pages stripped; the scripts, predeploy (right after test:privacy-notice) and the drive's key",
  l8: "L8 · the request read as hostile — the card sends exactly the lines that change (a review only for a line printing today's text that is not clearable and not already reviewed against today's default), its request reads back exactly, and a missing language or base, a stray review, an unknown field, a number, a fourth language, a prototype key, a bad count, a bad tick, a saved version posted whole, a review marker, an array, a version or a stamp is not understood — and through the store writes nothing",
  l9: "L9 · ⛔ the suite never touches a real database — DATABASE_URL is deleted before the first server module loads, no server or page module is imported statically, the live save is handed its instant, and the variable is gone while the suite runs",
  l10: "L10 · U13 · THE SEND WINDOW'S HOURS AND THE EVENING — a time written in WORDS (seven at night · after seven · saa moja usiku · saa 2 usiku · 七点 · full-width digits) is named and refused, and a duration is no time (ndani ya saa moja · within one hour · 两小时); an hour naming no half of the day is kept only while BOTH its readings are edges; R1's live read gives the promise lines as printed, fresh, failing closed; a time the RG line names, in any spelling and any language (22:00, 9 pm, 9pm, 9 p.m., 9 o'clock, 21h, 21h00, 21.00, 06:00, 19:30, 25:00, 22时, a Swahili 21:00), is refused in the window's own words unless it is the send window's opening or closing time as saved — 08:00 and 20:00 by default (a range, 8am/8pm, 8 o'clock, 20h and 20.00 included), 09:00 and 18:00 once saved; hours that could not be read refuse any time named, and a line naming none passes; evening words (evening, evenings, after dark, jioni, 傍晚, 晚上) are refused as their own promise, saying messages are sent until the window closes, while night words (late at night, overnight, night, midnight, late-night, quiet hours, bedtime, usiku, 夜间, 深夜) pass; the save reads the window — refused window_unreadable with nothing written and no audit row while it cannot be read (a privacy-only save still saves), a time the SAVED window does not use refused under the RG line's English box, and its own hours saved; and the card, the page and the server read the one window",
} as const;

/* ══ FIXTURES ═══════════════════════════════════════════════════════════════════════════════════════════════════ */

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const LF = String.fromCharCode(10);
const CR = String.fromCharCode(13);
const NBSP = String.fromCharCode(0xa0);
const BACKSLASH = String.fromCharCode(92);
const ZWSP = String.fromCharCode(0x200b);
const unCrlf = (s: string): string => s.split(CR + LF).join(LF);
const rawRead = (rel: string): string => unCrlf(readFileSync(join(ROOT, rel), "utf8"));
const read = (rel: string): string => decomment(rawRead(rel));
/** Every run of whitespace removed, so a reflowed line still compares equal (the L7 source checks). */
const WS_RUN = new RegExp(`[ ${String.fromCharCode(9, 10, 13)}]+`, "g");
const squash = (s: string): string => s.replace(WS_RUN, "");
/** The pinned hashes' own collapse — JavaScript's whitespace class, as `test:rg-policy` and `test:privacy-notice` write it. */
const JS_WS = new RegExp(`${BACKSLASH}s+`, "g");
/** Lets an in-flight hydration land (the injected row answers on a microtask). */
const settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

/** ⛔ L9 · the guard's own line, and the text that opens the first dynamic load of a server module. */
const GUARD_LINE = "delete process.env.DATABASE_URL;";
const FIRST_SERVER_LOAD = '= await import("../src/lib/server/';

const T1 = "2026-10-04T08:00:00.000Z"; // EAT 11:00, 4 October
const T2 = "2026-10-04T09:15:00.000Z"; // EAT 12:15, 4 October
const T3 = "2026-10-05T10:30:00.000Z"; // EAT 13:30, 5 October
const T_LATE = "2026-10-04T21:30:00.000Z"; // EAT 00:30, 5 October — the EAT day turns at 21:00 UTC
const at = (iso: string): number => Date.parse(iso);

/** ⭐ F7 · the code's own versions — every stamp the store is expected to make is derived from these, never typed. */
const RG_CODE = POLICY_PAGES.rg.codeVersion;
const PR_CODE = POLICY_PAGES.privacy.codeVersion;

/* The Appendix B drafts (spec, "drafts for Ali — G4 and G10"), typed as a person would paste them: plain spaces. */
const B2: PolicyTexts = {
  en: "No marketing messages to a self-excluded player, to a player on a break until they opt in again after it ends, to a player showing a sign of harm (section 3), or to anyone under 18. A player's age is the date of birth they gave us, checked against our identity check; for anyone who is not a 50pick player, we send only after a member of our staff has confirmed in writing that the person is 18 or older, and never without that confirmation.",
  sw: "Hakuna matangazo kwa mchezaji aliyejizuia, kwa mchezaji aliye kwenye mapumziko hadi atakapokubali tena baada ya mapumziko kuisha, kwa mchezaji anayeonyesha dalili ya madhara (sehemu ya 3), wala kwa mtu yeyote aliye chini ya umri wa miaka 18. Umri wa mchezaji ni tarehe ya kuzaliwa aliyotupa, ikilinganishwa na ukaguzi wetu wa utambulisho; kwa mtu ambaye si mchezaji wa 50pick, tunatuma tu baada ya mfanyakazi wetu kuthibitisha kwa maandishi kwamba mtu huyo ana umri wa miaka 18 au zaidi, na kamwe bila uthibitisho huo.",
  zh: "不向已自我排除的玩家、处于冷静期的玩家（直至其在冷静期结束后重新同意）、出现伤害迹象的玩家（见第 3 节），以及未满 18 岁的人发送营销信息。玩家的年龄以其向我们提供并经身份核验比对的出生日期为准；对于非 50pick 玩家，只有在我们的工作人员以书面形式确认此人已年满 18 岁后，我们才会发送，没有该确认绝不发送。",
};
/* ⭐ B3 and B4 as approved by Ali on 2026-10-09 (the owner's ruling: no marketing SMS carries a stop link) — the stop-link
   clause out, every other word kept, and the gateway line less its company's name ("we can't mention Blackball")
   (`docs/marketing-approvals/2026-10-09/approval-G10.json`, held by test:marketing-owner-save O19). */
const B3: PolicyTexts = {
  en: "Our SMS gateway in Tanzania, which sends our text messages, such as one-time codes and 50pick offers and news, which you can stop at any time under Profile → Notifications: it receives your phone number and the text of each message, and tells us whether each message was delivered",
  sw: "Lango letu la SMS nchini Tanzania, linalotuma ujumbe wetu mfupi (SMS), kama misimbo ya matumizi ya mara moja na ofa na habari za 50pick, ambazo unaweza kuzisimamisha wakati wowote kwenye Wasifu → Arifa: hupokea namba yako ya simu na maandishi ya kila ujumbe, na hutuambia kama kila ujumbe umefika",
  zh: "我们在坦桑尼亚的短信网关：发送我们的短信，例如一次性验证码以及 50pick 的优惠和资讯——您可随时在“个人资料 → 通知”中停止接收；接收您的电话号码和每条短信的内容，并告知我们每条短信是否已送达",
};
const B4: PolicyTexts = {
  en: "Our Gaming Board of Tanzania licence: 50pick offers and news by SMS, sent to adult Tanzanian mobile numbers under our licence — you can stop them at any time under Profile → Notifications, and once you stop we do not send them again unless you ask",
  sw: "Leseni yetu ya Bodi ya Michezo ya Kubahatisha Tanzania: ofa na habari za 50pick kwa SMS, zinazotumwa kwa namba za simu za Tanzania za watu wazima chini ya leseni yetu — unaweza kuzisimamisha wakati wowote kwenye Wasifu → Arifa, na ukishasimamisha hatutumi tena isipokuwa ukiomba",
  zh: "我们的坦桑尼亚博彩委员会牌照：50pick 短信优惠与资讯，依据我们的牌照发送至坦桑尼亚成年人的手机号码——您可随时在“个人资料 → 通知”中停止接收；一旦停止，除非您要求，我们不会再次发送",
};
const B5: PolicyTexts = {
  en: "Consent: 50pick offers and news by SMS for anyone who asks for them, which you can withdraw at any time under Profile → Notifications; and Google Analytics — only if you allow it when first asked, and you can change that at any time in §7 of this policy",
  sw: "Ridhaa: ofa na habari za 50pick kwa SMS kwa yeyote anayeziomba, ambazo unaweza kuziondoa wakati wowote kwenye Wasifu → Arifa; na Google Analytics — ikiwa tu utairuhusu unapoulizwa mara ya kwanza, na unaweza kubadilisha uamuzi huo wakati wowote katika §7 ya sera hii",
  zh: "同意：向提出要求的任何人发送 50pick 短信优惠与资讯，您可随时在“个人资料 → 通知”中撤回；以及 Google Analytics——仅在首次询问时您同意后才会开启，您可随时在本政策第 7 条中更改",
};
const B6: PolicyTexts = {
  en: "50pick sends offers by SMS under its gaming licence. Turn this off to stop them; it stays off.",
  sw: "50pick hutuma ofa kwa SMS chini ya leseni yake ya michezo ya kubahatisha. Zima hii ili kuzisimamisha; itabaki imezimwa.",
  zh: "50pick 依据其博彩牌照通过短信发送优惠。关闭此项即可停止接收，并保持关闭。",
};

type FakeDb = { readonly deps: unknown; readonly writes: () => number; readonly row: () => Record<string, unknown> | null };

/** ⭐ One SystemConfig row that answers like Postgres: every write kept as a JSON copy and every read a JSON copy back, so
 *  the factory's read-back compares what really round-tripped. `failLoads`: the store cannot answer at all. `seed`: a row
 *  already there before the process boots (M1, a newer build's field, a stamp against an older code version). */
function fakeDb(opts: { failLoads?: boolean; seed?: unknown } = {}): FakeDb {
  const copy = (v: unknown): unknown => (v === null || v === undefined ? null : JSON.parse(JSON.stringify(v)));
  let stored: unknown = copy(opts.seed);
  let writes = 0;
  return {
    deps: {
      hasDatabase: () => true,
      loadConfigResult: async () => (opts.failLoads ? { ok: false, error: "the store did not answer" } : { ok: true, value: copy(stored) }),
      saveConfig: async (_key: string, value: unknown) => { writes++; stored = copy(value); },
    },
    writes: () => writes,
    row: () => copy(stored) as Record<string, unknown> | null,
  };
}

let seq = 0;
/** A fresh officer id per check, so one run's audit rows are never another's. */
const officer = (tag: string, what: string): string => `off_${tag.replace(/[^A-Za-z0-9]/g, "")}_${what}_${seq++}`;
const auditRows = async (actorId: string) => {
  await auditFlush();
  return getAuditForActor(actorId).filter((e) => e.action === POLICY_LINES_AUDIT.action);
};
const changesOf = (row: { payload?: unknown } | undefined): string[] =>
  Object.keys(((row?.payload ?? {}) as { changes?: Record<string, unknown> }).changes ?? {}).sort();

/** A saved WORDS version as the server builds it from these words. */
function wordsVersion(key: PolicyLineKey, t: PolicyTexts, rev = 1): PolicyWordsVersion {
  const n = normalizedPolicyTexts(key, t);
  return { rev, en: n.en, sw: n.sw, zh: n.zh, codeDefault: policyDefaultFingerprint(key), savedAt: T1, savedBy: "off_fixture" };
}

/** A REVIEW marker — of today's code default, or of the fingerprint given (an old default). */
function reviewVersion(key: PolicyLineKey, rev = 1, fingerprint = policyDefaultFingerprint(key)): PolicyReviewVersion {
  return { rev, reviewedDefault: fingerprint, savedAt: T1, savedBy: "off_fixture" };
}

/** A whole record: these lines saved as words (rev 1), these reviewed (by fingerprint), and no page stamped. */
function recordWith(lines: Partial<Record<PolicyLineKey, PolicyTexts>>, reviewed: Partial<Record<PolicyLineKey, string>> = {}): PolicyLinesRecord {
  const historyOf = (k: PolicyLineKey): PolicyLineHistory => {
    const t = lines[k];
    if (t !== undefined) return [wordsVersion(k, t)];
    const fp = reviewed[k];
    return fp === undefined ? [] : [reviewVersion(k, 1, fp)];
  };
  return {
    "rg.marketing": historyOf("rg.marketing"),
    "privacy.lawfulConsent": historyOf("privacy.lawfulConsent"),
    "privacy.lawfulLicence": historyOf("privacy.lawfulLicence"),
    "privacy.smsGateway": historyOf("privacy.smsGateway"),
    "profile.outreachNote": historyOf("profile.outreachNote"),
    "version.rg": null,
    "version.privacy": null,
  };
}

/** ⭐ The request the card would post for these lines against the store as it is: three texts and the revision each was
 *  edited from (the count of its saved versions), and the review tick for the lines named. */
function cardPost(store: PolicyLinesStore, lines: Partial<Record<PolicyLineKey, PolicyTexts>>, review: readonly PolicyLineKey[] = []): Record<string, string> {
  const out: Record<string, string> = {};
  for (const key of POLICY_LINE_KEYS) {
    const t = lines[key];
    if (t === undefined) continue;
    for (const l of POLICY_LOCALES) out[policyTextFieldName(key, l)] = t[l];
    out[policyBaseFieldName(key)] = String(store.savedHistory(key).length);
    if (review.includes(key)) out[policyReviewFieldName(key)] = "1";
  }
  return out;
}

/** Markup as React prints it on the server — the HTML the page serves. */
const markupOf = (node: ReactNode): string => renderToStaticMarkup(createElement(() => node as ReactElement));
const TAG = /<[^>]+>/g;
/** Markup → the words a reader reads (tags gone, React's five escapes decoded). */
const plainOf = (markup: string): string => markup.replace(TAG, "")
  .split("&lt;").join("<").split("&gt;").join(">").split("&quot;").join('"').split("&#x27;").join("'").split("&amp;").join("&");
/** Text as React escapes it in markup. */
const escapeHtml = (s: string): string => s.split("&").join("&amp;").split("<").join("&lt;").split(">").join("&gt;")
  .split('"').join("&quot;").split("'").join("&#x27;");
const sha12 = (s: string): string => createHash("sha256").update(s).digest("hex").slice(0, 12);
/** The English block of a legal page, cut at its own markers (the sibling suites' cut), stripped of PolicyLine tags. */
const englishBlock = (src: string): string => {
  const s = stripPolicyLineTags(src);
  const a = s.indexOf(`${LF}  en: (`);
  const b = s.indexOf(`${LF}  sw: (`);
  return a >= 0 && b > a ? s.slice(a, b) : "";
};
const codesOf = (list: readonly { code: string }[]): string[] => list.map((x) => x.code);

/* ══ THE SOURCES THE WIRING IS READ FROM ══════════════════════════════════════════════════════════════════════════ */

type Sources = {
  actions: string; form: string; formRaw: string; page: string; pageRaw: string; rgPageRaw: string; privacyPageRaw: string;
  pure: string; pureRaw: string; kept: string; keptRaw: string; server: string; serverRaw: string; cgs: string; pkg: string;
  privacySuite: string; rgSuite: string;
  /** This suite's own source, as written — L9 reads where its database guard sits. */
  self: string;
};
const REAL_SOURCES: Sources = {
  actions: read("src/app/admin/system/actions.ts"),
  form: read("src/app/admin/system/policy-lines-form.tsx"),
  formRaw: rawRead("src/app/admin/system/policy-lines-form.tsx"),
  page: read("src/app/admin/system/page.tsx"),
  pageRaw: rawRead("src/app/admin/system/page.tsx"),
  rgPageRaw: rawRead("src/app/legal/responsible-gambling/page.tsx"),
  privacyPageRaw: rawRead("src/app/legal/privacy/page.tsx"),
  pure: read("src/lib/legal/policy-lines.ts"),
  pureRaw: rawRead("src/lib/legal/policy-lines.ts"),
  kept: read("src/lib/legal/kept-promises.ts"),
  keptRaw: rawRead("src/lib/legal/kept-promises.ts"),
  server: read("src/lib/server/legal/policy-lines.ts"),
  serverRaw: rawRead("src/lib/server/legal/policy-lines.ts"),
  cgs: read("scripts/client-graph-safe.test.mjs"),
  pkg: rawRead("package.json"),
  privacySuite: read("scripts/privacy-notice.test.mts"),
  rgSuite: read("scripts/rg-policy.test.mts"),
  self: rawRead("scripts/policy-lines.test.mts"),
};

/* ══ THE IMPLEMENTATION UNDER TEST — swappable, so a red case can plant one piece ═══════════════════════════════ */

type Impl = {
  readonly defaults: Readonly<Record<PolicyLineKey, PolicyTexts>>;
  /** The validator the card runs live (the store's own is `rules.problems`, planted together). */
  readonly problems: (key: PolicyLineKey, raw: Partial<Record<PolicyLocale, unknown>>, published?: PolicyTexts, sendWindow?: PolicySendWindow | null) => PolicyLineVerdict;
  /** U13 · how a store built here reads the send window's hours — the read a check hands in, unless a plant rewrites it. */
  readonly windowWrap: (read: (() => Promise<PolicySendWindowRead>) | undefined) => (() => Promise<PolicySendWindowRead>) | undefined;
  readonly normalize: (raw: unknown, key?: PolicyLineKey, locale?: PolicyLocale) => string;
  /** What the store is built from. */
  readonly rules: PolicyLineRules;
  readonly merge: typeof mergePolicyLines;
  /** The D9 queue removed (L6's plant). */
  readonly unqueued: boolean;
  /** The store as the suite sees it — a red case replaces one of its readers (F8's plant). */
  readonly wrap: (store: PolicyLinesStore) => PolicyLinesStore;
  /** The wrapper's renderer. */
  readonly node: typeof policyLineNode;
  readonly nextVersion: typeof nextPolicyVersion;
  readonly printed: typeof printedPolicyVersion;
  readonly meta: typeof metaWithVersion;
  readonly opening: typeof policyOpeningProblems;
  readonly toSave: typeof policyLinesToSave;
  readonly postEntries: typeof policyLinesPostEntries;
  readonly readPatch: typeof readPolicyLinesPatch;
  readonly src: Sources;
};

const REAL: Impl = {
  defaults: POLICY_LINE_DEFAULTS,
  problems: policyLineProblems,
  windowWrap: (read) => read,
  normalize: normalizePolicyLine,
  rules: POLICY_LINE_RULES,
  merge: mergePolicyLines,
  unqueued: false,
  wrap: (store) => store,
  node: policyLineNode,
  nextVersion: nextPolicyVersion,
  printed: printedPolicyVersion,
  meta: metaWithVersion,
  opening: policyOpeningProblems,
  toSave: policyLinesToSave,
  postEntries: policyLinesPostEntries,
  readPatch: readPolicyLinesPatch,
  src: REAL_SOURCES,
};

/** ⭐ THE REAL STORE — the shipped readers and setter over a fresh factory instance and a fresh row (`merge` overridable for
 *  the one probe that hands the server a record that is not an append). */
const storeOf = (impl: Impl, db: FakeDb, merge: typeof mergePolicyLines = impl.merge, window?: () => Promise<PolicySendWindowRead>): PolicyLinesStore =>
  impl.wrap(SERVER.__policyLinesStoreForTest({ deps: db.deps as never, rules: impl.rules, merge, unqueued: impl.unqueued, window: impl.windowWrap(window) }));

/* ══ THE LIVE RUN — once, over the LIVE store the pages print through (this process has no database) ════════════ */

type LiveRun = { before: boolean; saved: boolean; after: boolean; licence: boolean; gateway: boolean; meta: boolean; readable: boolean; detail: string };

async function liveRun(): Promise<LiveRun> {
  const rgPlain = (l: PolicyLocale): string => plainOf(markupOf(rgContent()[l]));
  const own = createElement("li", null, "page-own-words");
  const before = POLICY_LOCALES.every((l) => rgPlain(l).includes(POLICY_LINE_DEFAULTS["rg.marketing"][l]))
    && markupOf(createElement(PolicyLine, { line: "privacy.lawfulLicence", locale: "en" })) === ""
    && markupOf(createElement(PolicyLine, { line: "privacy.smsGateway", locale: "en" }, own)) === "<li>page-own-words</li>"
    && SERVER.savedPolicyLine("rg.marketing") === null
    && SERVER.policyMeta(`Version ${RG_CODE} · Aligned`, "rg") === `Version ${RG_CODE} · Aligned`;
  const post: Record<string, string> = {};
  const put = (key: PolicyLineKey, t: PolicyTexts): void => {
    for (const l of POLICY_LOCALES) post[policyTextFieldName(key, l)] = t[l];
    post[policyBaseFieldName(key)] = String(SERVER.savedPolicyHistory(key).length);
  };
  put("rg.marketing", B2);
  put("privacy.lawfulLicence", B4);
  put("privacy.smsGateway", B3);
  // ⛔ F6 · the live save is handed the instant it stamps — never this machine's clock, so its versions are derivable.
  const res = await SERVER.savePolicyLines(post, "off_policy_lines_live", T1);
  const saved = res.ok && res.changed.length === 3 && res.moved.length === 3;
  const after = POLICY_LOCALES.every((l) => {
    const text = rgPlain(l);
    return text.includes(normalizePolicyLine(B2[l], "rg.marketing", l)) && !text.includes(POLICY_LINE_DEFAULTS["rg.marketing"][l]);
  });
  const licenceMarkup = markupOf(createElement(PolicyLine, { line: "privacy.lawfulLicence", locale: "en" }));
  const licence = licenceMarkup.startsWith('<li><strong class="text-text">Our Gaming Board of Tanzania licence</strong>: 50pick offers and news by SMS');
  const gatewayMarkup = markupOf(createElement(PolicyLine, { line: "privacy.smsGateway", locale: "zh" }, own));
  const gateway = gatewayMarkup === `<li>${escapeHtml(normalizePolicyLine(B3.zh, "privacy.smsGateway", "zh"))}</li>`;
  // ⭐ F7 · the versions the save made, derived from the code's — never typed.
  const rgStamp = nextPolicyVersion(RG_CODE, at(T1));
  const prStamp = nextPolicyVersion(PR_CODE, at(T1));
  const meta = res.ok && res.versions.rg === rgStamp && res.versions.privacy === prStamp
    && SERVER.policyMeta(`Version ${RG_CODE} · Aligned`, "rg") === `Version ${rgStamp} · Aligned`
    && SERVER.policyMeta(`版本 ${PR_CODE} · 符合`, "privacy") === `版本 ${prStamp} · 符合`
    && SERVER.policyVersion("rg") === rgStamp && SERVER.policyVersion("privacy") === prStamp;
  const readable = SERVER.policyLinesReadable();
  const detail = `saved ${res.ok ? res.changed.join(",") : `REFUSED ${res.reason}: ${res.error}`} · licence ${licenceMarkup.slice(0, 90)} · rg ${rgStamp} · privacy ${prStamp}`;
  return { before, saved, after, licence, gateway, meta, readable, detail };
}

const LIVE: LiveRun = await liveRun();

/* ══ THE ASSERTIONS ═════════════════════════════════════════════════════════════════════════════════════════════ */

async function runAssertions(impl: Impl, tag: string): Promise<void> {
  const p = (label: string) => `${tag}${label}`;

  // ── L0 · THE KEYS, THE PAGES AND THEIR VERSIONS ─────────────────────────────────────────────────────────────────
  {
    const keysOk = JSON.stringify([...POLICY_LINE_KEYS])
      === JSON.stringify(["rg.marketing", "privacy.lawfulConsent", "privacy.lawfulLicence", "privacy.smsGateway", "profile.outreachNote"]);
    const pageOf = Object.fromEntries(POLICY_LINE_KEYS.map((k) => [k, POLICY_LINE_SPEC[k].page]));
    const pagesOk = JSON.stringify(pageOf) === JSON.stringify({
      "rg.marketing": "rg", "privacy.lawfulConsent": "privacy", "privacy.lawfulLicence": "privacy", "privacy.smsGateway": "privacy", "profile.outreachNote": null,
    });
    const clearable = POLICY_LINE_KEYS.filter((k) => POLICY_LINE_SPEC[k].clearable).join(",");
    const labelled = POLICY_LINE_KEYS.filter((k) => POLICY_LINE_SPEC[k].labelled).join(",");
    const PREFIX: Record<PolicyLocale, string> = { en: 'en: "Version ', sw: 'sw: "Toleo ', zh: 'zh: "版本 ' };
    const metaVersion = (src: string, l: PolicyLocale): string | null => {
      const metaAt = src.indexOf("const META");
      const from = metaAt < 0 ? -1 : src.indexOf(PREFIX[l], metaAt);
      if (from < 0) return null;
      const rest = src.slice(from + PREFIX[l].length);
      const sp = rest.indexOf(" ");
      return sp < 0 ? null : rest.slice(0, sp);
    };
    const seen: string[] = [];
    const versionsOk = POLICY_PAGE_KEYS.every((page) => {
      const src = page === "rg" ? impl.src.rgPageRaw : impl.src.privacyPageRaw;
      const got = POLICY_LOCALES.map((l) => metaVersion(src, l));
      seen.push(`${page} ${got.join("/")} vs ${POLICY_PAGES[page].codeVersion}`);
      return isPolicyVersion(POLICY_PAGES[page].codeVersion) && got.every((v) => v === POLICY_PAGES[page].codeVersion);
    });
    const sourcesRead = Object.values(impl.src).every((s) => s.length > 200);
    ok(p(L.l0), keysOk && pagesOk && clearable === "privacy.lawfulLicence,profile.outreachNote"
      && labelled === "privacy.lawfulConsent,privacy.lawfulLicence" && versionsOk && sourcesRead,
      `${seen.join(" · ")} · clearable ${clearable} · labelled ${labelled}`);
  }

  // ── L1 · ⛔ NOTHING PRINTS DIFFERENTLY UNTIL A SAVE ──────────────────────────────────────────────────────────────
  {
    /* A wrapper's opening tag may carry ONE comment before it closes — its note, which the guards' stripper removes with
       the tag (`scripts/lib/policy-line-source.mts`), so the hash pins never see it. */
    const PAIRED = new RegExp('<PolicyLine line="([^"]+)" locale="([a-z]+)"(?: /[*]([^*]*)[*]/)?>(.*?)</PolicyLine>', "g");
    const SELF = new RegExp('<PolicyLine line="([^"]+)" locale="([a-z]+)"(?: /[*]([^*]*)[*]/)? />', "g");
    const NOTE_PAIRED = "⛔ prints only until saved";
    const NOTE_SELF = "⛔ prints nothing until saved";
    const SECTION_OPEN = '<LegalSection n="';
    type Wrapped = { key: string; locale: string; note: string; children: string | null; at: number; end: number };
    const wrappersOf = (src: string): Wrapped[] => {
      const out: Wrapped[] = [];
      for (const m of src.matchAll(PAIRED)) {
        out.push({ key: m[1], locale: m[2], note: (m[3] ?? "").trim(), children: m[4], at: m.index ?? 0, end: (m.index ?? 0) + m[0].length });
      }
      for (const m of src.matchAll(SELF)) {
        out.push({ key: m[1], locale: m[2], note: (m[3] ?? "").trim(), children: null, at: m.index ?? 0, end: (m.index ?? 0) + m[0].length });
      }
      return out.sort((x, y) => x.at - y.at);
    };
    const sectionAt = (src: string, i: number): string => {
      const s = src.lastIndexOf(SECTION_OPEN, i);
      if (s < 0) return "";
      return src.slice(s + SECTION_OPEN.length, src.indexOf('"', s + SECTION_OPEN.length));
    };
    const blockAt = (src: string, i: number): string => {
      const found = POLICY_LOCALES.map((l) => ({ l, i: src.lastIndexOf(`${LF}  ${l}: (`, i) })).filter((x) => x.i >= 0).sort((x, y) => y.i - x.i);
      return found.length > 0 ? found[0].l : "";
    };
    const firstBullet = (src: string, w: Wrapped): boolean => !src.slice(src.lastIndexOf(SECTION_OPEN, w.at), w.at).includes("<li>");
    const decodeJsx = (children: string): string => {
      const t = children.trim();
      if (!t.startsWith("<li>") || !t.endsWith("</li>")) return "<<not one bullet>>";
      return t.slice(4, -5).split('<strong className="text-text">').join("").split("</strong>").join("")
        .split("&nbsp;").join(NBSP).split("&apos;").join("'").split("&quot;").join('"').split("&amp;").join("&");
    };
    const problems: string[] = [];
    const rg = impl.src.rgPageRaw, privacy = impl.src.privacyPageRaw;
    const rgW = wrappersOf(rg), prW = wrappersOf(privacy);
    // Where each wrapper sits — and its one-line note (review F4: it prints the code's words only until a save).
    if (policyLineTagCount(rg) !== 6) problems.push(`RG holds ${policyLineTagCount(rg)} PolicyLine tags (want 6)`);
    if (policyLineTagCount(privacy) !== 15) problems.push(`Privacy holds ${policyLineTagCount(privacy)} PolicyLine tags (want 15)`);
    const rgShape = rgW.map((w) => `${w.key}/${w.locale}/${sectionAt(rg, w.at)}/${w.children === null ? "self" : "pair"}/${blockAt(rg, w.at)}/${firstBullet(rg, w) ? "first" : "later"}`);
    const rgWant = POLICY_LOCALES.map((l) => `rg.marketing/${l}/4/pair/${l}/first`);
    if (JSON.stringify(rgShape) !== JSON.stringify(rgWant)) problems.push(`RG wrappers ${JSON.stringify(rgShape)}`);
    const prShape = prW.map((w) => `${w.key}/${w.locale}/${sectionAt(privacy, w.at)}/${w.children === null ? "self" : "pair"}/${blockAt(privacy, w.at)}`);
    const prWant = POLICY_LOCALES.flatMap((l) => [
      `privacy.lawfulConsent/${l}/3/pair/${l}`, `privacy.lawfulLicence/${l}/3/self/${l}`, `privacy.smsGateway/${l}/4/pair/${l}`,
    ]);
    if (JSON.stringify(prShape) !== JSON.stringify(prWant)) problems.push(`Privacy wrappers ${JSON.stringify(prShape)}`);
    for (let i = 0; i + 1 < prW.length; i++) {
      if (prW[i].key === "privacy.lawfulConsent" && privacy.slice(prW[i].end, prW[i + 1].at).trim() !== "") {
        problems.push(`the ${prW[i].locale} licence bullet does not follow the Consent bullet directly`);
      }
    }
    for (const w of [...rgW, ...prW]) {
      const want = w.children === null ? NOTE_SELF : NOTE_PAIRED;
      if (w.note !== want) problems.push(`${w.key}/${w.locale} carries the note "${w.note}" (want "${want}")`);
    }
    // Each default is today's text, decoded from the page's own JSX — and a saved line equal to it prints today's markup.
    for (const w of [...rgW, ...prW]) {
      const key = w.key as PolicyLineKey, l = w.locale as PolicyLocale;
      const want = impl.defaults[key]?.[l];
      if (want === undefined) { problems.push(`no default for ${w.key}/${w.locale}`); continue; }
      if (w.children === null) {
        if (want !== "") problems.push(`${key}/${l} prints nothing until saved, but its default is not blank`);
        continue;
      }
      if (decodeJsx(w.children) !== want) problems.push(`${key}/${l} default differs from the page: "${decodeJsx(w.children).slice(0, 60)}"`);
      const parts = policyLineParts(key, want);
      if (POLICY_LINE_SPEC[key].labelled && (parts.label === null || !w.children.trim().startsWith(`<li><strong className="text-text">${parts.label}</strong>`))) {
        problems.push(`${key}/${l}'s bold label is not the default's label`);
      }
      const expected = w.children.trim().split('className="text-text"').join('class="text-text"').split("&nbsp;").join(NBSP);
      const printed = markupOf(impl.node(key, want, null));
      if (printed !== expected) problems.push(`${key}/${l} saved as today's words prints "${printed.slice(0, 60)}"`);
    }
    // ⭐ F9 · every default is a FIXED POINT — its no-break spaces read as spaces and the RG binding put back exactly where
    // they were — and passes its own rules with nothing to say, against nothing and against itself.
    for (const key of POLICY_LINE_KEYS) {
      for (const l of POLICY_LOCALES) {
        if (impl.normalize(impl.defaults[key][l], key, l) !== impl.defaults[key][l]) problems.push(`${key}/${l} is not a fixed point of the normaliser`);
      }
      for (const v of [impl.problems(key, impl.defaults[key]), impl.problems(key, impl.defaults[key], impl.defaults[key])]) {
        if (POLICY_LOCALES.some((l) => v.problems[l].length > 0) || v.hints.length > 0) problems.push(`${key}'s default is judged: ${JSON.stringify(v)}`);
      }
    }
    const rgSw = impl.defaults["rg.marketing"].sw, rgZh = impl.defaults["rg.marketing"].zh;
    if (!rgSw.includes(`miaka${NBSP}18`) || !rgZh.includes(`第${NBSP}3${NBSP}节`)) problems.push("the RG defaults lost their no-break spaces");
    // The clause and the words a saved line must keep are words today's page says.
    for (const l of POLICY_LOCALES) {
      const gateway = impl.defaults["privacy.smsGateway"][l], consent = impl.defaults["privacy.lawfulConsent"][l];
      if (!gateway.includes(CONSENT_ONLY_CLAUSE[l])) problems.push(`the ${l} consent-only clause is not in the gateway default`);
      for (const w of SMS_GATEWAY_WORDS[l]) if (!holdsRequiredWord(gateway, w)) problems.push(`"${w}" is not in the ${l} gateway default`);
      // ⛔ 2026-10-09 · the gateway is named by its role alone (Ali: "we can't mention Blackball, they won't allow it").
      if (gateway.includes("Blackball")) problems.push(`the ${l} gateway default names the gateway's company`);
      for (const w of [CONSENT_WITHDRAW_PATH[l], ...ANALYTICS_CONSENT_WORDS[l]]) if (!consent.includes(w)) problems.push(`"${w}" is not in the ${l} Consent default`);
    }
    // Both English hash pins, over the stripped pages, are the pins the sibling suites hold.
    const rgPin = impl.src.rgSuite.match(/RG_EN_SHA = "([0-9a-f]{12})"/)?.[1] ?? "";
    const prPin = impl.src.privacySuite.match(/PRIVACY_EN_SHA = "([0-9a-f]{12})"/)?.[1] ?? "";
    const rgSha = sha12(englishBlock(rg).replace(JS_WS, " ").trim());
    const prSha = sha12(englishBlock(privacy).replace(JS_WS, " ").trim());
    if (rgPin === "" || rgSha !== rgPin) problems.push(`the RG English hashes ${rgSha}, test:rg-policy pins "${rgPin}"`);
    if (prPin === "" || prSha !== prPin) problems.push(`the Privacy English hashes ${prSha}, test:privacy-notice pins "${prPin}"`);
    ok(p(L.l1), problems.length === 0, problems.length > 0 ? problems.slice(0, 6).join(" | ") : `RG ${rgSha} · Privacy ${prSha} · ${rgW.length + prW.length} wrappers`);
  }

  // ── L2 · THE PAGES PRINT A SAVED LINE IN PLACE OF THE DEFAULT ────────────────────────────────────────────────────
  {
    const own = createElement("li", null, "page-own-words");
    const SAMPLE: Record<PolicyLineKey, PolicyTexts> = {
      "rg.marketing": normalizedPolicyTexts("rg.marketing", B2),
      "privacy.lawfulConsent": B5,
      "privacy.lawfulLicence": B4,
      "privacy.smsGateway": B3,
      "profile.outreachNote": B6,
    };
    const wrong: string[] = [];
    for (const key of POLICY_LINE_KEYS) {
      for (const l of POLICY_LOCALES) {
        const sample = SAMPLE[key][l];
        const parts = policyLineParts(key, sample);
        const expected = parts.label === null
          ? `<li>${escapeHtml(sample)}</li>`
          : `<li><strong class="text-text">${escapeHtml(parts.label)}</strong>${escapeHtml(parts.rest)}</li>`;
        if (markupOf(impl.node(key, sample, own)) !== expected) wrong.push(`${key}/${l} saved`);
        if (markupOf(impl.node(key, null, own)) !== "<li>page-own-words</li>") wrong.push(`${key}/${l} unsaved`);
        if (markupOf(impl.node(key, "", own)) !== "") wrong.push(`${key}/${l} saved blank`);
      }
    }
    const IMPORT = 'import { PolicyLine, policyMeta } from "@/lib/server/legal/policy-lines";';
    const rg = impl.src.rgPageRaw, privacy = impl.src.privacyPageRaw;
    const wiring = {
      wrapper: squash(impl.src.server).includes(squash("return policyLineNode(line, live.savedPolicyText(line, locale), children ?? null);")),
      imports: rg.includes(IMPORT) && privacy.includes(IMPORT),
      rgMeta: rg.includes('meta={policyMeta(META[locale], "rg")}'),
      privacyMeta: privacy.includes('meta={policyMeta(META[locale], "privacy")}'),
      rgContent: rg.includes("export function content(): Record<Locale, React.ReactNode> { return {"),
    };
    const live = { before: LIVE.before, saved: LIVE.saved, after: LIVE.after, licence: LIVE.licence, gateway: LIVE.gateway, meta: LIVE.meta, readable: LIVE.readable };
    ok(p(L.l2), wrong.length === 0 && Object.values(wiring).every(Boolean) && Object.values(live).every(Boolean),
      `renderer ${wrong.length === 0 ? "ok" : wrong.slice(0, 4).join(", ")} · wiring ${JSON.stringify(wiring)} · live ${JSON.stringify(live)} · ${LIVE.detail}`);
  }

  // ── L3 · THE VALIDATOR ──────────────────────────────────────────────────────────────────────────────────────────
  {
    const v = (key: PolicyLineKey, t: Partial<Record<PolicyLocale, unknown>>, published?: PolicyTexts) => impl.problems(key, t, published);
    const clean = (r: PolicyLineVerdict): boolean => POLICY_LOCALES.every((l) => r.problems[l].length === 0);
    /** Refused in that language's box, naming that promise in that language's name. */
    const refuses = (r: PolicyLineVerdict, l: PolicyLocale, promise: KeptPromise): boolean =>
      r.problems[l].some((x) => x.code === "promise_unkept" && x.sentence === POLICY_LINE_SENTENCE.promiseUnkept(promise, POLICY_LOCALE_NAME[l]));
    const rgDefault = POLICY_LINE_DEFAULTS["rg.marketing"];
    const B2N = normalizedPolicyTexts("rg.marketing", B2);
    /** ⭐ U13 · a promise's words are READ as that promise in that language (`promisesIn`), and the verdict follows the map:
     *  refused by name while it is unkept, accepted while it is kept — the late-night window is kept since U13's send
     *  window, so its words are now accepted, and they must still be READ as it (a reading that lost them would let a
     *  promise through unread the day the map changes again). */
    const judged = (line: string, l: PolicyLocale, key: PromiseKey): boolean => {
      const r = v("rg.marketing", { ...B2, [l]: line });
      return promisesIn(line, l).includes(key)
        && (KEPT_PROMISES[key].kept ? !codesOf(r.problems[l]).includes("promise_unkept") : refuses(r, l, KEPT_PROMISES[key]));
    };
    // ⛔ F2 · the late-night words, matched WHOLE — and a clock time in every spelling.
    const LATE_WORDS = ["late-night", "overnight", "night", "nights", "midnight", "quiet hours", "bedtime"];
    const missedLate = LATE_WORDS.filter((w) => !judged(`${B2.en} No messages (${w}).`, "en", "lateNight"));
    // ⭐ U13 · the evening is a promise of its own, and unkept: messages are sent until the send window closes.
    const EVENING_WORDS = ["evening", "evenings", "after dark"];
    const missedEvening = EVENING_WORDS.filter((w) => !judged(`${B2.en} No messages (${w}).`, "en", "evening"));
    const swEvening = judged(`${B2.sw} Hakuna ujumbe jioni.`, "sw", "evening");
    const zhEvening = judged(`${B2.zh}晚上不发送营销信息。`, "zh", "evening") && judged(`${B2.zh}傍晚不发送营销信息。`, "zh", "evening");
    const TIMES = ["22:00", "9pm", "9 pm", "9 p.m.", "9 o'clock", "21h", "21h00", "21.00"];
    const missedTimes = TIMES.filter((t) => !judged(`${B2.en} Nothing is sent after ${t} EAT.`, "en", "lateNight"));
    const wholeOnly = clean(v("rg.marketing", { ...B2, en: `${B2.en} We review it every fortnight.` }));
    // ⛔ F3 · every language: a clock time anywhere, and the Swahili and Chinese late-night words.
    const swClock = judged(`${B2.sw} Hakuna ujumbe baada ya 21:00.`, "sw", "lateNight");
    const zhClock = judged(`${B2.zh}21:00 后不发送。`, "zh", "lateNight");
    const swWord = judged(`${B2.sw} Hakuna ujumbe usiku.`, "sw", "lateNight");
    const zhWord = judged(`${B2.zh}深夜不发送营销信息。`, "zh", "lateNight");
    // ⛔ F2 · a frequency cap is a promise too, and nothing keeps it yet (U14).
    const FREQUENCY = ["at most two messages a week", "no more than 4 messages", "once a month", "3 offers per week"];
    const missedFrequency = FREQUENCY.filter((f) => !refuses(v("rg.marketing", { ...B2, en: `${B2.en} We send ${f}.` }), "en", KEPT_PROMISES.frequencyCap));
    // …in Swahili and Chinese too (F3): a cap promised only there is still published.
    const swFrequency = refuses(v("rg.marketing", { ...B2, sw: `${B2.sw} Tunatuma mara 2 kwa wiki.` }), "sw", KEPT_PROMISES.frequencyCap)
      && refuses(v("rg.marketing", { ...B2, sw: `${B2.sw} Kuna kikomo cha ujumbe.` }), "sw", KEPT_PROMISES.frequencyCap);
    const zhFrequency = refuses(v("rg.marketing", { ...B2, zh: `${B2.zh}每周最多两条。` }), "zh", KEPT_PROMISES.frequencyCap)
      && refuses(v("rg.marketing", { ...B2, zh: `${B2.zh}每月 4 条。` }), "zh", KEPT_PROMISES.frequencyCap);
    // Each kept promise accepted, word by word.
    const keptAccepted = PROMISE_KEYS.filter((k) => KEPT_PROMISES[k].kept).every((k) => KEPT_PROMISES[k].phrases.every((phrase) =>
      !codesOf(v("rg.marketing", { en: `No marketing messages to ${phrase}, at any time.`, sw: rgDefault.sw, zh: rgDefault.zh }).problems.en).includes("promise_unkept")));
    // ⭐ F13 · the two age promises are read apart: today's line makes one, Appendix B.2 the other.
    const todayMakes = promisesIn(rgDefault.en, "en"), b2Makes = promisesIn(B2.en, "en");
    const agesApart = todayMakes.includes("ageUnconfirmed") && !todayMakes.includes("staffConfirmedAge")
      && b2Makes.includes("staffConfirmedAge") && !b2Makes.includes("ageUnconfirmed")
      && KEPT_PROMISES.ageUnconfirmed.kept && KEPT_PROMISES.staffConfirmedAge.kept
      && KEPT_PROMISES.ageUnconfirmed.control !== KEPT_PROMISES.staffConfirmedAge.control;
    // B.2 passes — and says, as a note, that the page will stop naming one control the code still keeps.
    const b2 = v("rg.marketing", B2);
    const b2Ok = clean(b2) && JSON.stringify(b2.hints) === JSON.stringify([POLICY_LINE_SENTENCE.dropped(KEPT_PROMISES.ageUnconfirmed)]);
    const dropped = v("rg.marketing", { en: "No marketing messages to a self-excluded player, or to anyone under 18.", sw: rgDefault.sw, zh: rgDefault.zh });
    const droppedHint = clean(dropped)
      && [KEPT_PROMISES.onBreak, KEPT_PROMISES.harmSign, KEPT_PROMISES.ageUnconfirmed].every((k) => dropped.hints.includes(POLICY_LINE_SENTENCE.dropped(k)))
      && !dropped.hints.includes(POLICY_LINE_SENTENCE.dropped(KEPT_PROMISES.under18))
      && !dropped.hints.includes(POLICY_LINE_SENTENCE.dropped(KEPT_PROMISES.staffConfirmedAge));
    // ⭐ The dropped-promise note reads the PUBLISHED line: back to today's words from a saved B.2 drops the staff promise.
    const backToToday = v("rg.marketing", rgDefault, B2N);
    const publishedHint = clean(backToToday) && backToToday.hints.includes(POLICY_LINE_SENTENCE.dropped(KEPT_PROMISES.staffConfirmedAge))
      && v("rg.marketing", rgDefault).hints.length === 0;
    // ⭐ F3 · one language changed while another still says what the page prints — a note, never a refusal.
    const mixed = v("rg.marketing", { ...B2N, en: `${B2N.en} We keep a record of each refusal.` }, B2N);
    const mixedHint = clean(mixed) && mixed.hints.includes(POLICY_LINE_SENTENCE.mixedLanguages(["English"], ["Swahili", "Chinese"]))
      && !backToToday.hints.some((h) => h.startsWith("Only the"));
    // Each refusal in its own words.
    const blankSw = v("rg.marketing", { ...B2, sw: "" });
    const blankOk = blankSw.problems.sw.length === 1 && blankSw.problems.sw[0]?.code === "blank" && blankSw.problems.sw[0]?.sentence === POLICY_LINE_SENTENCE.blank;
    const markup = v("rg.marketing", { ...B2, en: `${B2.en} <b>Read this</b>` });
    const entity = v("rg.marketing", { ...B2, en: `${B2.en} Under&nbsp;18.` });
    const markupOk = markup.problems.en.some((x) => x.code === "markup" && x.sentence === POLICY_LINE_SENTENCE.markup) && codesOf(entity.problems.en).includes("markup");
    const phoneOk = codesOf(v("rg.marketing", { ...B2, en: `${B2.en} Call 0712 345 678.` }).problems.en).includes("has_phone")
      && codesOf(v("rg.marketing", { ...B2, en: `${B2.en} Call 0712/345/678.` }).problems.en).includes("has_phone")
      && v("rg.marketing", { ...B2, en: `${B2.en} Reference 1234567.` }).problems.en.some((x) => x.code === "has_phone" && x.sentence === POLICY_LINE_SENTENCE.hasPhone)
      && !codesOf(v("rg.marketing", { ...B2, en: `${B2.en} Reference 123456.` }).problems.en).includes("has_phone");
    // ⛔ F9 · an unbroken run over 30 characters cannot wrap on a phone — English and Swahili; Chinese breaks anywhere.
    const longWordOk = v("rg.marketing", { ...B2, en: `${B2.en} ${"x".repeat(31)}` }).problems.en.some((x) => x.code === "long_word" && x.sentence === POLICY_LINE_SENTENCE.longWord)
      && !codesOf(v("rg.marketing", { ...B2, en: `${B2.en} ${"x".repeat(30)}` }).problems.en).includes("long_word")
      && codesOf(v("rg.marketing", { ...B2, sw: `${B2.sw} ${"y".repeat(31)}` }).problems.sw).includes("long_word")
      && !codesOf(v("rg.marketing", { ...B2, zh: `${B2.zh}${"字".repeat(40)}` }).problems.zh).includes("long_word");
    const long = v("rg.marketing", { ...B2, en: `${B2.en} ${"a ".repeat(300)}` });
    const longOk = long.problems.en.some((x) => x.code === "too_long" && x.sentence === POLICY_LINE_SENTENCE.tooLong(600));
    const shortOk = v("rg.marketing", { ...B2, zh: "太短了。" }).problems.zh.some((x) => x.code === "too_short" && x.sentence === POLICY_LINE_SENTENCE.tooShort(20));
    const gw = (over: Partial<PolicyTexts>) => v("privacy.smsGateway", { ...B3, ...over });
    const wordsOk = gw({ en: B3.en.split("SMS gateway").join("text service") }).problems.en.some((x) => x.code === "words_missing" && x.sentence.includes("“SMS gateway”"))
      // (The Swahili role word opens the line — "Lango letu la SMS" — and is read with its capital: `holdsRequiredWord`.)
      && codesOf(gw({ sw: B3.sw.split("Lango letu la SMS").join("Huduma yetu") }).problems.sw).includes("words_missing")
      && codesOf(gw({ zh: B3.zh.split("短信网关").join("服务") }).problems.zh).includes("words_missing")
      && codesOf(gw({ en: B3.en.split("your phone number and the text of each message").join("some details") }).problems.en).includes("words_missing");
    const consentOk = codesOf(v("privacy.lawfulConsent", { ...B5, en: B5.en.split("Profile → Notifications").join("your profile") }).problems.en).includes("words_missing")
      && codesOf(v("privacy.lawfulConsent", { ...B5, zh: B5.zh.split("第 7 条").join("最后") }).problems.zh).includes("words_missing");
    // U13 · the unkept promise here is the frequency cap — the late-night window is kept since U13.
    const many = v("rg.marketing", { en: "<b> Call 0712 345 678, at most two messages a week", sw: "", zh: rgDefault.zh });
    const manyOk = ["markup", "has_phone", "promise_unkept"].every((c) => codesOf(many.problems.en).includes(c)) && codesOf(many.problems.sw).includes("blank");
    // The clearable lines: all or nothing.
    const licPartial = v("privacy.lawfulLicence", { en: B4.en, sw: "", zh: "" });
    const clearOk = clean(v("privacy.lawfulLicence", { en: "", sw: "", zh: "" })) && clean(v("profile.outreachNote", { en: "", sw: "", zh: "" }))
      && licPartial.problems.en.length === 0 && codesOf(licPartial.problems.sw).includes("blank") && codesOf(licPartial.problems.zh).includes("blank")
      && POLICY_LOCALES.every((l) => codesOf(v("profile.outreachNote", { en: "Off.", sw: "Zima.", zh: "关闭。" }).problems[l]).includes("too_short"))
      && codesOf(v("profile.outreachNote", { ...B6, en: `${B6.en} ${"b ".repeat(100)}` }).problems.en).includes("too_long");
    // The Appendix B drafts pass.
    const drafts: Array<[PolicyLineKey, PolicyTexts]> = [
      ["rg.marketing", B2], ["privacy.smsGateway", B3], ["privacy.lawfulLicence", B4], ["privacy.lawfulConsent", B5], ["profile.outreachNote", B6],
    ];
    const draftsPass = drafts.every(([key, t]) => clean(v(key, t)));
    // A labelled line with no label prints plain — a hint, not a refusal.
    const unlabelled = v("privacy.lawfulLicence", { ...B4, en: B4.en.split(": ").join(" — ") });
    const labelHint = clean(unlabelled) && unlabelled.hints.includes(POLICY_LINE_SENTENCE.unlabelled("English"));
    // The normaliser: the RG sw and zh numbers bound to their units, and nothing else.
    const n = impl.normalize;
    const swBound = n(B2.sw, "rg.marketing", "sw");
    const zhBound = n(B2.zh, "rg.marketing", "zh");
    const binding = swBound.includes(`sehemu ya${NBSP}3`) && swBound.includes(`miaka${NBSP}18`) && !swBound.includes("miaka 18")
      && zhBound.includes(`第${NBSP}3${NBSP}节`) && zhBound.includes(`18${NBSP}岁`) && !zhBound.includes("18 岁")
      && n(B2.en, "rg.marketing", "en") === B2.en && n(B5.zh, "privacy.lawfulConsent", "zh").includes("第 7 条");
    // ⛔ F9 · EVERY no-break space is read as a space; the only ones a saved line keeps are the ones the RG rule puts back.
    const nbsp = n(`a${NBSP}b`) === "a b" && n(`a${NBSP} b`) === "a b" && n(`Under${NBSP}18`, "rg.marketing", "en") === "Under 18"
      && n(`Hakuna${NBSP}matangazo kwa miaka${NBSP}${NBSP}18`, "rg.marketing", "sw") === `Hakuna matangazo kwa miaka${NBSP}18`
      && n(`第${NBSP}7${NBSP}条`, "privacy.lawfulConsent", "zh") === "第 7 条";
    const spaces = n(`a  ${LF} b`) === "a b" && n(`07${ZWSP}12`) === "0712" && n(`  x${NBSP}`) === "x" && n(42) === "";
    // ⛔ F10 · Chinese takes no space between two Han characters, nor beside full-width punctuation; Latin–Han keeps one.
    const zhTight = n("我们 不会 发送", "privacy.smsGateway", "zh") === "我们不会发送"
      && n("短信 ， 资讯 。", "privacy.smsGateway", "zh") === "短信，资讯。"
      && n("50pick 短信 与 Google Analytics", "privacy.smsGateway", "zh") === "50pick 短信与 Google Analytics"
      && n("我们 不会", "privacy.smsGateway", "en") === "我们 不会" && n("我们 不会", "privacy.smsGateway", "sw") === "我们 不会";
    const fixtures = [B2.en, B2.sw, B2.zh, B3.zh, B4.sw, swBound, zhBound, `a${NBSP} b`, ` x ${LF}y `, "我们 不会 ， 发送 50pick 短信"];
    const idempotent = fixtures.every((t) => n(n(t)) === n(t)
      && POLICY_LINE_KEYS.every((key) => POLICY_LOCALES.every((l) => n(n(t, key, l), key, l) === n(t, key, l))));
    const conds = {
      late: missedLate.length === 0, times: missedTimes.length === 0, wholeOnly, swClock, zhClock, swWord, zhWord,
      evening: missedEvening.length === 0, swEvening, zhEvening,
      frequency: missedFrequency.length === 0, swFrequency, zhFrequency, keptAccepted, agesApart, b2Ok, droppedHint, publishedHint, mixedHint, blankOk,
      markupOk, phoneOk, longWordOk, longOk, shortOk, wordsOk, consentOk, manyOk, clearOk, draftsPass, labelHint, binding, nbsp,
      spaces, zhTight, idempotent,
    };
    ok(p(L.l3), Object.values(conds).every(Boolean),
      `${JSON.stringify(conds)} · late missed ${missedLate.join("/") || "none"} · times missed ${missedTimes.join("/") || "none"} · frequency missed ${missedFrequency.join("/") || "none"} · B.2 hints ${JSON.stringify(b2.hints)}`);
  }

  // ── L4 · THE VERSION ────────────────────────────────────────────────────────────────────────────────────────────
  {
    const nv = impl.nextVersion;
    const pv = impl.printed;
    const S = (stamp: string, base: string): PolicyPageStamp => ({ stamp, base });
    const arithmetic = {
      first: nv("2026-10-01", at(T1)) === "2026-10-04",
      second: nv("2026-10-04", at(T2)) === "2026-10-04.2",
      third: nv("2026-10-04.2", at(T2)) === "2026-10-04.3",
      nextDay: nv("2026-10-04.3", at(T3)) === "2026-10-05",
      codeToday: nv("2026-10-04", at(T1)) === "2026-10-04.2",
      eatMidnight: nv("2026-10-01", at(T_LATE)) === "2026-10-05",
      codeAhead: nv("2026-10-09", at(T1)) === "2026-10-09.2",
      fourDigits: nv("2026-10-04.999", at(T1)) === "2026-10-04.1000" && isPolicyVersion("2026-10-04.1000")
        && !isPolicyVersion("2026-10-04.10000") && !isPolicyVersion("2026-10-04.1") && !isPolicyVersion("2026-13-01"),
    };
    // ⭐ F5 · ONE function prints the version — and a label is never reused over different text.
    const printed = {
      unstamped: pv("2026-10-01", null) === "2026-10-01",
      stamped: pv("2026-10-01", S("2026-10-04", "2026-10-01")) === "2026-10-04",
      sameDayCodeBump: pv("2026-10-04", S("2026-10-04", "2026-10-01")) === "2026-10-04.2",
      codeEditAfterSecond: pv("2026-10-04", S("2026-10-04.2", "2026-10-01")) === "2026-10-04.3"
        && pv("2026-10-04.2", S("2026-10-04.2", "2026-10-01")) === "2026-10-04.3",
      codeMovesOn: pv("2026-10-06", S("2026-10-04.2", "2026-10-01")) === "2026-10-06",
      nextIsLater: nv(pv("2026-10-04", S("2026-10-04", "2026-10-01")), at(T2)) === "2026-10-04.3",
    };
    const META_EN = "Version 2026-10-01 · Aligned with the Tanzania Personal Data Protection Act 2022 and EU GDPR principles.";
    const META_ZH = "版本 2026-10-01 · 符合 Tanzania Personal Data Protection Act 2022 及 EU GDPR 原则。";
    const meta = impl.meta(META_EN, S("2026-10-04.2", "2026-10-01")) === META_EN.replace("2026-10-01", "2026-10-04.2")
      && impl.meta(META_ZH, S("2026-10-04", "2026-10-01")) === META_ZH.replace("2026-10-01", "2026-10-04")
      && impl.meta(META_EN, null) === META_EN
      && impl.meta(META_EN, S("2026-09-30", "2026-09-30")) === META_EN
      && impl.meta(META_EN, S("2026-10-01", "2026-09-26")) === META_EN.replace("2026-10-01", "2026-10-01.2");
    // ⭐ F1 · F7 · through the store: new words move their page once per save; a review moves nothing; every expected stamp
    // is derived from the code's versions with the real rule.
    const stampOf = (row: Record<string, unknown> | null, key: string): string => JSON.stringify(row?.[key] ?? null);
    const want = (stamp: string, base: string): string => JSON.stringify({ stamp, base });
    const rg1 = nextPolicyVersion(printedPolicyVersion(RG_CODE, null), at(T1));
    const pr1 = nextPolicyVersion(printedPolicyVersion(PR_CODE, null), at(T2));
    const pr2 = nextPolicyVersion(printedPolicyVersion(PR_CODE, { stamp: pr1, base: PR_CODE }), at(T2));
    const db = fakeDb();
    const store = storeOf(impl, db);
    const a = officer(tag, "l4");
    const s1 = await store.savePolicyLines(cardPost(store, { "rg.marketing": B2 }), a, T1);
    const afterRg = db.row();
    const s2 = await store.savePolicyLines(cardPost(store, { "privacy.smsGateway": B3, "privacy.lawfulLicence": B4 }), a, T2);
    const afterPriv1 = db.row();
    const s3 = await store.savePolicyLines(cardPost(store, { "privacy.lawfulConsent": POLICY_LINE_DEFAULTS["privacy.lawfulConsent"] }, ["privacy.lawfulConsent"]), a, T2);
    const afterReview = db.row();
    const s4 = await store.savePolicyLines(cardPost(store, { "privacy.lawfulConsent": B5 }), a, T2);
    const afterPriv2 = db.row();
    const s5 = await store.savePolicyLines(cardPost(store, { "profile.outreachNote": B6 }), a, T3);
    const afterNote = db.row();
    const rows = await auditRows(a);
    const byAge = [...rows].reverse();
    const consentHistory = afterReview?.["privacy.lawfulConsent"];
    const stored = {
      saves: s1.ok && s2.ok && s3.ok && s4.ok && s5.ok,
      rgAlone: stampOf(afterRg, "version.rg") === want(rg1, RG_CODE) && stampOf(afterRg, "version.privacy") === "null",
      privacyOnce: stampOf(afterPriv1, "version.privacy") === want(pr1, PR_CODE) && stampOf(afterPriv1, "version.rg") === want(rg1, RG_CODE),
      reviewMovesNothing: s3.ok && JSON.stringify(s3.changed) === JSON.stringify(["privacy.lawfulConsent"]) && s3.moved.length === 0
        && s3.versions.privacy === pr1 && stampOf(afterReview, "version.privacy") === want(pr1, PR_CODE)
        && Array.isArray(consentHistory) && consentHistory.length === 1,
      privacySecond: s4.ok && s4.versions.privacy === pr2 && stampOf(afterPriv2, "version.privacy") === want(pr2, PR_CODE),
      noteMovesNone: s5.ok && JSON.stringify(s5.moved) === JSON.stringify(["profile.outreachNote"])
        && stampOf(afterNote, "version.privacy") === want(pr2, PR_CODE) && stampOf(afterNote, "version.rg") === want(rg1, RG_CODE),
      audited: rows.length === 5 && JSON.stringify(changesOf(byAge[0])) === JSON.stringify(["rg.marketing", "version.rg"])
        && JSON.stringify(changesOf(byAge[2])) === JSON.stringify(["privacy.lawfulConsent"]),
      printed: store.policyMeta(`Version ${RG_CODE} · Aligned`, "rg") === `Version ${rg1} · Aligned`
        && store.policyMeta(META_EN.replace("2026-10-01", PR_CODE), "privacy") === META_EN.replace("2026-10-01", pr2)
        && store.policyVersion("rg") === rg1 && store.policyVersion("privacy") === pr2,
    };
    // ⭐ F5 · a stamp made against an OLDER code version whose label the code now carries: the page prints a new label, and
    // the next stamp is later still — never the same label over two texts.
    const seededStamp = { stamp: RG_CODE, base: "2026-01-01" };
    const dbBump = fakeDb({ seed: { "version.rg": seededStamp } });
    const storeBump = storeOf(impl, dbBump);
    await settle();
    const printedNow = printedPolicyVersion(RG_CODE, seededStamp);
    const before = storeBump.policyVersion("rg");
    const sb = await storeBump.savePolicyLines(cardPost(storeBump, { "rg.marketing": B2 }), officer(tag, "l4b"), T2);
    const bumpStamp = nextPolicyVersion(printedNow, at(T2));
    const collision = {
      newLabel: before === printedNow && printedNow !== RG_CODE && comparePolicyVersions(printedNow, RG_CODE) > 0,
      laterStill: sb.ok && stampOf(dbBump.row(), "version.rg") === want(bumpStamp, RG_CODE) && comparePolicyVersions(bumpStamp, printedNow) > 0,
    };
    ok(p(L.l4), Object.values(arithmetic).every(Boolean) && Object.values(printed).every(Boolean) && meta
      && Object.values(stored).every(Boolean) && Object.values(collision).every(Boolean),
      `arithmetic ${JSON.stringify(arithmetic)} · printed ${JSON.stringify(printed)} · meta ${meta} · store ${JSON.stringify(stored)} · collision ${JSON.stringify(collision)} · stamps rg ${rg1} privacy ${pr1}/${pr2}`);
  }

  // ── L5 · THE OPENING CHECKS READ THE SAVED LINES ────────────────────────────────────────────────────────────────
  {
    const op = impl.opening;
    const ALL = JSON.stringify(["privacy_gateway", "privacy_lawful", "rg_age"]);
    const GATEWAY = JSON.stringify(["privacy_gateway"]);
    const LAWFUL = JSON.stringify(["privacy_lawful"]);
    const ready: Partial<Record<PolicyLineKey, PolicyTexts>> = {
      "rg.marketing": B2, "privacy.smsGateway": B3, "privacy.lawfulLicence": B4, "privacy.lawfulConsent": B5,
    };
    const readyButConsent: Partial<Record<PolicyLineKey, PolicyTexts>> = { "rg.marketing": B2, "privacy.smsGateway": B3, "privacy.lawfulLicence": B4 };
    const leftIn = (l: PolicyLocale) => op(recordWith({ ...ready, "privacy.smsGateway": { ...B3, [l]: POLICY_LINE_DEFAULTS["privacy.smsGateway"][l] } }));
    const conds = {
      nothingSaved: JSON.stringify(op(EMPTY_POLICY_LINES)) === ALL,
      todaysWordsSaved: JSON.stringify(op(recordWith({
        "rg.marketing": POLICY_LINE_DEFAULTS["rg.marketing"],
        "privacy.smsGateway": POLICY_LINE_DEFAULTS["privacy.smsGateway"],
        "privacy.lawfulConsent": POLICY_LINE_DEFAULTS["privacy.lawfulConsent"],
      }))) === ALL,
      ready: op(recordWith(ready)).length === 0,
      // ⭐ F4 · a Consent bullet REVIEWED as it stands counts — while the code's words are the ones reviewed.
      reviewedConsent: op(recordWith(readyButConsent, { "privacy.lawfulConsent": policyDefaultFingerprint("privacy.lawfulConsent") })).length === 0,
      staleReview: JSON.stringify(op(recordWith(readyButConsent, { "privacy.lawfulConsent": "00000000-1" }))) === LAWFUL,
      enLeft: JSON.stringify(leftIn("en")) === GATEWAY,
      swLeft: JSON.stringify(leftIn("sw")) === GATEWAY,
      zhLeft: JSON.stringify(leftIn("zh")) === GATEWAY,
      capitalised: JSON.stringify(op(recordWith({ ...ready, "privacy.smsGateway": { ...B3, en: `${B3.en}. Only if you agree to receive them.` } }))) === GATEWAY,
      // ⛔ F11 · any of the four page lines, in any language.
      licenceLine: JSON.stringify(op(recordWith({ ...ready, "privacy.lawfulLicence": { ...B4, en: `${B4.en}, only if you agree` } }))) === GATEWAY,
      rgLine: JSON.stringify(op(recordWith({ ...ready, "rg.marketing": { ...B2, zh: `${B2.zh}仅在您同意后发送。` } }))) === GATEWAY,
      consentLine: JSON.stringify(op(recordWith({ ...ready, "privacy.lawfulConsent": { ...B5, sw: `${B5.sw}, kwa ridhaa yako tu` } }))) === GATEWAY,
      licenceBlank: JSON.stringify(op(recordWith({ ...ready, "privacy.lawfulLicence": { en: "", sw: "", zh: "" } }))) === LAWFUL,
      noStaff: JSON.stringify(op(recordWith({ ...ready, "rg.marketing": { ...B2, en: B2.en.split("a member of our staff").join("someone") } }))) === JSON.stringify(["rg_age"]),
      phraseReader: holdsConsentOnlyPhrase(`ONLY IF YOU${NBSP}AGREE`, "en") && !holdsConsentOnlyPhrase(B5.en, "en")
        && !holdsConsentOnlyPhrase(POLICY_LINE_DEFAULTS["privacy.lawfulConsent"].zh, "zh"),
    };
    ok(p(L.l5), Object.values(conds).every(Boolean), JSON.stringify(conds));
  }

  // ── L6 · THE STORE ──────────────────────────────────────────────────────────────────────────────────────────────
  {
    const historyIn = (row: Record<string, unknown> | null, key: string): Array<Record<string, unknown>> => {
      const h = row?.[key];
      return Array.isArray(h) ? (h as Array<Record<string, unknown>>) : [];
    };
    const latestEn = (row: Record<string, unknown> | null, key: string): unknown => {
      const h = historyIn(row, key);
      return h.length > 0 ? h[h.length - 1].en : undefined;
    };
    const db = fakeDb();
    const store = storeOf(impl, db);
    const a = officer(tag, "l6a");
    const n2 = normalizedPolicyTexts("rg.marketing", B2);
    const r1 = await store.savePolicyLines(cardPost(store, { "rg.marketing": B2 }), a, T1);
    const line1 = store.savedLine("rg.marketing");
    const w1 = line1 !== null && !isReviewVersion(line1) ? line1 : null;
    const rows1 = await auditRows(a);
    const payload = (rows1[0]?.payload ?? {}) as { before?: Record<string, unknown>; after?: Record<string, unknown>; changes?: Record<string, unknown> };
    const verified = r1.ok && db.writes() === 1 && w1 !== null && w1.rev === 1 && w1.savedBy === a && w1.savedAt === T1
      && w1.en === n2.en && w1.sw === n2.sw && w1.zh === n2.zh && w1.codeDefault === policyDefaultFingerprint("rg.marketing")
      && latestEn(db.row(), "rg.marketing") === n2.en && store.readable();
    const audited = rows1.length === 1 && rows1[0]?.targetType === POLICY_LINES_AUDIT.targetType && rows1[0]?.targetId === "global"
      && JSON.stringify(payload.before?.["rg.marketing"]) === "[]"
      && (payload.after?.["rg.marketing"] as Array<{ en?: string }> | undefined)?.[0]?.en === n2.en
      && payload.changes !== undefined && Object.prototype.hasOwnProperty.call(payload.changes, "version.rg");
    const r2 = await store.savePolicyLines(cardPost(store, { "rg.marketing": B2 }), a, T2);
    const unchanged = r2.ok && r2.changed.length === 0 && db.writes() === 1 && (await auditRows(a)).length === 1;
    // ⭐ F4 · today's words: nothing without the tick; with it, a MARKER — no text, so the page keeps printing its own words.
    const today = POLICY_LINE_DEFAULTS["privacy.lawfulConsent"];
    const r3 = await store.savePolicyLines(cardPost(store, { "privacy.lawfulConsent": today }), a, T2);
    const noTick = r3.ok && r3.changed.length === 0 && store.savedLine("privacy.lawfulConsent") === null && db.writes() === 1;
    const r4 = await store.savePolicyLines(cardPost(store, { "privacy.lawfulConsent": today }, ["privacy.lawfulConsent"]), a, T2);
    const marker = store.savedLine("privacy.lawfulConsent");
    const withTick = r4.ok && r4.changed.length === 1 && r4.moved.length === 0 && db.writes() === 2
      && marker !== null && isReviewVersion(marker) && marker.reviewedDefault === policyDefaultFingerprint("privacy.lawfulConsent")
      && !Object.prototype.hasOwnProperty.call(marker, "en") && store.savedPolicyText("privacy.lawfulConsent", "en") === null
      && store.policyLine("privacy.lawfulConsent", "en") === today.en && stampOfRow(db.row(), "version.privacy") === "null"
      && (await auditRows(a)).length === 2;
    const r4b = await store.savePolicyLines(cardPost(store, { "privacy.lawfulConsent": today }, ["privacy.lawfulConsent"]), a, T3);
    const reviewedOnce = r4b.ok && r4b.changed.length === 0 && db.writes() === 2;
    const keptOther = store.savedLine("rg.marketing")?.rev === 1 && latestEn(db.row(), "rg.marketing") === n2.en;
    // ⭐ F12 · new words APPEND — version 1 stays exactly as it was saved.
    const r5 = await store.savePolicyLines(cardPost(store, { "rg.marketing": { ...B2, en: `${B2.en} We keep a record of each refusal.` } }), a, T3);
    const hist = store.savedHistory("rg.marketing");
    const appended = r5.ok && hist.length === 2 && JSON.stringify(hist[0]) === JSON.stringify(line1) && hist[1]?.rev === 2
      && historyIn(db.row(), "rg.marketing").length === 2;
    // ⛔ F12 · the append-only check itself …
    const ap = impl.rules.appendOnly;
    const base = recordWith({ "rg.marketing": B2 });
    const v1 = base["rg.marketing"][0];
    const probes = {
      clean: ap(base, { ...base, "rg.marketing": [v1, { ...v1, rev: 2 }] }) === null,
      rewritten: ap(base, { ...base, "rg.marketing": [{ ...v1, en: "Rewritten words for the page, quietly." }] }) === "rewritten",
      dropped: ap(base, { ...base, "rg.marketing": [] }) === "dropped",
      twoAtOnce: ap(base, { ...base, "rg.marketing": [v1, { ...v1, rev: 2 }, { ...v1, rev: 3 }] }) === "two_at_once",
      misnumbered: ap(base, { ...base, "rg.marketing": [v1, { ...v1, rev: 5 }] }) === "misnumbered",
      unknownKey: ap(base, { ...base, "legal.other": [] } as unknown as PolicyLinesRecord) === "unknown_key",
    };
    const appendOnlyOk = Object.values(probes).every(Boolean);
    // … and the server running it before every write: a merge that rewrites the saved version is refused, nothing written.
    const rewriting: typeof mergePolicyLines = (current, updates) => {
      const merged = mergePolicyLines(current, updates);
      const h = merged["rg.marketing"];
      return h.length > 1 ? { ...merged, "rg.marketing": h.slice(1).map((x, i) => ({ ...x, rev: i + 1 })) } : merged;
    };
    const dbH = fakeDb({ seed: { "rg.marketing": [wordsVersion("rg.marketing", B2)] } });
    const storeH = storeOf(impl, dbH, rewriting);
    await settle();
    const hOfficer = officer(tag, "l6h");
    const rh = await storeH.savePolicyLines(cardPost(storeH, { "rg.marketing": { ...B2, en: `${B2.en} Changed once.` } }), hOfficer, T2);
    const historyRefused = !rh.ok && rh.reason === "history" && rh.error === SERVER.POLICY_LINES_REFUSAL_SENTENCE.history
      && dbH.writes() === 0 && (await auditRows(hOfficer)).length === 0;
    // ⭐ A field a newer build wrote is read and KEPT (a deploy's overlap never drops it).
    const newer = { ...wordsVersion("rg.marketing", B2), fromNewerBuild: "kept" };
    const noted = { stamp: nextPolicyVersion(RG_CODE, at(T1)), base: RG_CODE, note: "kept too" };
    const dbT = fakeDb({ seed: { "rg.marketing": [newer], "version.rg": noted } });
    const storeT = storeOf(impl, dbT);
    await settle();
    const rt = await storeT.savePolicyLines(cardPost(storeT, { "privacy.smsGateway": B3 }), officer(tag, "l6t"), T2);
    const tolerant = storeT.readable() && rt.ok && historyIn(dbT.row(), "rg.marketing")[0]?.fromNewerBuild === "kept"
      && (dbT.row()?.["version.rg"] as Record<string, unknown> | undefined)?.note === "kept too"
      && storeT.savedPolicyText("rg.marketing", "en") === n2.en;
    // m1 · a page out of date — behind or ahead of the revision saved now.
    const b = officer(tag, "l6b");
    const baseKey = policyBaseFieldName("rg.marketing");
    const revNow = store.savedHistory("rg.marketing").length;
    const writesSoFar = db.writes();
    const behind = await store.savePolicyLines({ ...cardPost(store, { "rg.marketing": { ...B2, en: `${B2.en} Behind.` } }), [baseKey]: String(revNow - 1) }, b, T3);
    const ahead = await store.savePolicyLines({ ...cardPost(store, { "rg.marketing": { ...B2, en: `${B2.en} Ahead.` } }), [baseKey]: String(revNow + 1) }, b, T3);
    const stale = !behind.ok && behind.reason === "stale" && behind.problems["rg.marketing"]?.en[0]?.code === "stale"
      && behind.problems["rg.marketing"]?.en[0]?.sentence === POLICY_LINE_SENTENCE.stale
      && !ahead.ok && ahead.reason === "stale" && db.writes() === writesSoFar && (await auditRows(b)).length === 0;
    // ⛔ F8 · a process that never loaded the row refuses — nothing written, readers blind, and NOT readable.
    const dbDown = fakeDb({ failLoads: true });
    const storeDown = storeOf(impl, dbDown);
    const c = officer(tag, "l6c");
    const down = await storeDown.savePolicyLines(cardPost(storeDown, { "rg.marketing": B2 }), c, T1);
    const neverLoaded = !down.ok && (down.reason === "unreadable" || down.reason === "not_saved") && dbDown.writes() === 0
      && (await auditRows(c)).length === 0 && storeDown.savedLine("rg.marketing") === null && !storeDown.readable();
    // ⛔ M1 · a row read in part is never rewritten, and is not readable; a row read in full saves.
    const seeds: unknown[] = [
      { "rg.marketing": [{ rev: 1, en: "x" }] },
      { "rg.marketing": { rev: 1, en: "x", sw: "x", zh: "x", savedAt: T1, savedBy: "off_round_one" } },
      { "rg.marketing": [], "legal.someOtherKey": 1 },
      { "version.rg": "not a stamp" },
      { "version.rg": { stamp: "2026-10-04" } },
      "not a record",
    ];
    let partRefused = true;
    for (const seed of seeds) {
      const dbPart = fakeDb({ seed });
      const beforeRow = JSON.stringify(dbPart.row());
      const storePart = storeOf(impl, dbPart);
      await settle();
      const unreadable = !storePart.readable();
      const d = officer(tag, "l6d");
      const rp = await storePart.savePolicyLines(cardPost(storePart, { "privacy.smsGateway": B3 }), d, T1);
      partRefused = partRefused && unreadable && !rp.ok && rp.reason === "row_unreadable" && JSON.stringify(dbPart.row()) === beforeRow
        && dbPart.writes() === 0 && (await auditRows(d)).length === 0;
    }
    const seededLine = wordsVersion("rg.marketing", B2);
    const seededStamp = { stamp: nextPolicyVersion(RG_CODE, at(T1)), base: RG_CODE };
    const dbWhole = fakeDb({ seed: { "rg.marketing": [seededLine], "version.rg": seededStamp } });
    const storeWhole = storeOf(impl, dbWhole);
    await settle();
    const rw = await storeWhole.savePolicyLines(cardPost(storeWhole, { "privacy.smsGateway": B3 }), officer(tag, "l6e"), T2);
    const wholeSaves = rw.ok && storeWhole.readable() && JSON.stringify(historyIn(dbWhole.row(), "rg.marketing")) === JSON.stringify([seededLine])
      && latestEn(dbWhole.row(), "privacy.smsGateway") === normalizedPolicyTexts("privacy.smsGateway", B3).en
      && JSON.stringify(dbWhole.row()?.["version.rg"]) === JSON.stringify(seededStamp);
    // D9 · two saves at once keep both lines.
    const dbTwo = fakeDb();
    // (an immediate window read, so the two saves still overlap — the live read's dynamic import would serialise them and
    // hide the queue's work: the U13 review's #4)
    const storeTwo = storeOf(impl, dbTwo, impl.merge, defaultHoursRead);
    const e1 = officer(tag, "l6f"), e2 = officer(tag, "l6g");
    const [t1, t2] = await Promise.all([
      storeTwo.savePolicyLines(cardPost(storeTwo, { "rg.marketing": B2 }), e1, T1),
      storeTwo.savePolicyLines(cardPost(storeTwo, { "privacy.smsGateway": B3 }), e2, T1),
    ]);
    const both = t1.ok && t2.ok && latestEn(dbTwo.row(), "rg.marketing") === n2.en
      && latestEn(dbTwo.row(), "privacy.smsGateway") === normalizedPolicyTexts("privacy.smsGateway", B3).en
      && storeTwo.savedLine("rg.marketing")?.savedBy === e1 && storeTwo.savedLine("privacy.smsGateway")?.savedBy === e2;
    const conds = {
      verified, audited, unchanged, noTick, withTick, reviewedOnce, keptOther, appended, appendOnlyOk, historyRefused, tolerant,
      stale, neverLoaded, partRefused, wholeSaves, both,
    };
    ok(p(L.l6), Object.values(conds).every(Boolean),
      `${JSON.stringify(conds)} · probes ${JSON.stringify(probes)} · ${r1.ok ? "saved" : `${r1.reason}: ${r1.error}`} · history probe ${rh.ok ? "WROTE" : rh.reason}`);
  }

  // ── L7 · THE WIRING ─────────────────────────────────────────────────────────────────────────────────────────────
  {
    const src = impl.src;
    const at = src.actions.indexOf("export async function savePolicyLinesAction(");
    // ⛔ ENDS AT THE NEXT TOP-LEVEL EXPORT — an action added after this one would otherwise lend it its calls, the hole
    // that hid a plant from `test:marketing-wordings` W8 on 2026-10-04.
    const end = at < 0 ? -1 : src.actions.indexOf(String.fromCharCode(10) + "export ", at + 1);
    const action = at < 0 ? "" : src.actions.slice(at, end < 0 ? undefined : end);
    const actionOk = squash(action).startsWith(squash("export async function savePolicyLinesAction(formData: FormData): Promise<PolicyLinesActionResult> {") + squash("const session = await requireAdmin();"))
      && action.includes("patchFromForm(formData.entries())") && action.includes("savePolicyLines(form.patch, session.userId)")
      && action.includes("fieldError(first, res.error)") && action.includes("policyLineFieldName(key, l)")
      && action.includes("moved: res.moved.length")
      && ["/admin/system", "/legal/responsible-gambling", "/legal/privacy"].every((path) => action.includes(`revalidatePath("${path}")`));
    const BLOCKED = squash("if (blocked.length > 0) { focusFirstInvalid(form, problemFields(blocked, hasProblem)); return; }");
    const cardOk = isDirective(src.formRaw, "use client") && src.form.includes("useMayAct()")
      && (src.form.match(/policyLineProblems[(]/g) ?? []).length >= 2
      && src.form.includes("policyLineProblems(key, text[key], now[key].printed, sendWindow)")
      && src.form.includes("POLICY_LINE_SENTENCE.savedNowFails(") && src.form.includes("POLICY_LINE_SENTENCE.defaultChanged")
      && src.form.includes("POLICY_LINE_SENTENCE.reviewStale")
      && src.form.includes("policyLinesToSave(cardState)") && src.form.includes("policyLinesPostEntries(sending)")
      && src.form.includes("savePolicyLinesAction") && src.form.includes("<UnsavedChangesGuard") && src.form.includes("saveAnchor={saveRef}")
      && src.form.includes("dataField={policyLineFieldName(key, l)}") && squash(src.form).split(BLOCKED).length - 1 === 2
      && src.form.includes('toast({ title: "Nothing to save yet"') && !src.form.includes("@/lib/server")
      && src.form.includes("shown only to a player whose offers come under our licence") && !src.form.includes("printed nowhere yet");
    const groupAt = src.page.indexOf('{tab === "policy" && (<>');
    const groupEnd = groupAt < 0 ? -1 : src.page.indexOf("</>)}", groupAt);
    const cardAt = src.page.indexOf("<PolicyLinesForm");
    const pageOk = groupAt >= 0 && cardAt > groupAt && cardAt < groupEnd
      && src.page.includes('{ value: "policy", labelEn: "Public policy lines", href: "/admin/system?tab=policy" }')
      && src.page.includes('const policyRows = tab === "policy" ? await policyLineRows() : null;')
      && src.page.includes('sp.tab === "policy" ? "policy"') && src.page.includes('from "@/lib/server/legal/policy-lines"')
      && src.pageRaw.includes("Public policy lines card is a FOURTH tab (`?tab=policy`)");
    const serverOk = !isDirective(src.serverRaw, "use client") && src.server.includes('POLICY_LINES_KEY = "legal.policy_lines"')
      && src.server.includes('action: "config.policy_lines_updated"') && src.server.includes('targetType: "POLICY_LINES"')
      && src.server.includes("merge: o.merge") && src.server.includes("cfg.setVerified(updates, officerId)")
      && squash(src.server).includes(squash("const live = makeStore({ key: POLICY_LINES_KEY, rules: POLICY_LINE_RULES, merge: mergePolicyLines, queued: true });"))
      && src.server.includes('if (fresh.stored && seen.dropped.length > 0) return refusal("row_unreadable");')
      && src.server.includes("const found = rules.admit(req.base, before[k]);")
      && squash(src.server).includes(squash('if (rules.appendOnly(current, merge(current, updates)) !== null) return refusal("history");'))
      && squash(src.server).includes(squash("if (!moved.some((k) => POLICY_LINE_SPEC[k].page === page)) continue;"))
      && squash(src.server).includes(squash("updates[spec.versionKey] = { stamp: rules.nextVersion(printed, nowMs), base: spec.codeVersion };"))
      && src.server.includes("export function policyLinesReadable(): boolean");
    const specsOf = (s: string): string[] => [...s.matchAll(/from[ ]*"([^"]+)"/g)].map((m) => m[1]);
    const pureOk = !isDirective(src.pureRaw, "use client") && !isDirective(src.pureRaw, "use server")
      && JSON.stringify(specsOf(src.pure)) === JSON.stringify(["./kept-promises", "../contacts/contact-fields", "../eat-day", "../marketing/sms-settings"])
      && specsOf(src.kept).length === 0 && !isDirective(src.keptRaw, "use client");
    const pinAt = src.cgs.indexOf("const PINNED = [");
    const pinned = pinAt < 0 ? "" : src.cgs.slice(pinAt, src.cgs.indexOf("];", pinAt));
    const pinOk = pinned.includes('"lib/legal/policy-lines.ts"') && pinned.includes('"lib/legal/kept-promises.ts"');
    const suitesOk = src.privacySuite.includes('from "../src/lib/legal/policy-lines.ts"')
      && ["SMS_GATEWAY_WORDS", "CONSENT_ONLY_CLAUSE", "CONSENT_WITHDRAW_PATH", "ANALYTICS_CONSENT_WORDS"].every((name) => src.privacySuite.includes(name))
      && src.privacySuite.includes("const pageSrc = stripPolicyLineTags(read(PAGE));")
      && src.privacySuite.includes("[...SMS_GATEWAY_WORDS.en, CONSENT_ONLY_CLAUSE.en]")
      && !src.privacySuite.includes('"your phone number and the text of each message"')
      && src.rgSuite.includes('page: stripPolicyLineTags(read("src/app/legal/responsible-gambling/page.tsx"))')
      && src.rgSuite.includes("kept: KEPT_PROMISES") && src.rgSuite.includes("validate: policyLineProblems");
    let scripts: Record<string, string> = {};
    try { scripts = (JSON.parse(src.pkg) as { scripts?: Record<string, string> }).scripts ?? {}; } catch { scripts = {}; }
    const chain = (scripts.predeploy ?? "").split("&&").map((x) => x.trim());
    const atSuite = chain.indexOf("npm run test:policy-lines");
    const wired = scripts["test:policy-lines"] === "tsx scripts/policy-lines.test.mts"
      && scripts["red:policy-lines"] === "tsx scripts/policy-lines.test.mts --prove-red"
      && scripts["qa:marketing-policy-lines"] === "node scripts/live/marketing-u33p-policy-lines-drive.mjs"
      && chain.filter((x) => x === "npm run test:policy-lines").length === 1
      && atSuite > 0 && chain[atSuite - 1] === "npm run test:privacy-notice"
      && chain.includes("npm run test:rg-policy") && chain.includes("npm run test:client-graph-safe");
    const conds = { actionOk, cardOk, pageOk, serverOk, pureOk, pinOk, suitesOk, wired };
    ok(p(L.l7), Object.values(conds).every(Boolean), `${JSON.stringify(conds)} · the pure module loads [${specsOf(src.pure).join(", ")}]`);
  }

  // ── L8 · THE REQUEST, READ AS HOSTILE ───────────────────────────────────────────────────────────────────────────
  {
    const none = { rev: 0, words: null, reviewedCurrent: false };
    const savedNone = Object.fromEntries(POLICY_LINE_KEYS.map((k) => [k, none])) as PolicyCardState["saved"];
    const today = Object.fromEntries(POLICY_LINE_KEYS.map((k) => [k, { ...POLICY_LINE_DEFAULTS[k] }])) as Record<PolicyLineKey, PolicyTexts>;
    const keysOf = (list: ReadonlyArray<{ key: PolicyLineKey }>): string => list.map((x) => x.key).join(",");
    const untouched = impl.toSave({ texts: today, saved: savedNone, review: {} });
    const edited = impl.toSave({ texts: { ...today, "rg.marketing": B2 }, saved: savedNone, review: {} });
    const reviewed = impl.toSave({ texts: today, saved: savedNone, review: { "privacy.lawfulConsent": true } });
    const reviewClearable = impl.toSave({ texts: today, saved: savedNone, review: { "privacy.lawfulLicence": true } });
    const typedClearable = impl.toSave({ texts: { ...today, "profile.outreachNote": B6 }, saved: savedNone, review: {} });
    const savedSome = { ...savedNone, "rg.marketing": { rev: 3, words: normalizedPolicyTexts("rg.marketing", B2), reviewedCurrent: false } } as PolicyCardState["saved"];
    const sameSaved = impl.toSave({ texts: { ...today, "rg.marketing": { ...B2, en: `${B2.en} ` } }, saved: savedSome, review: {} });
    const changedSaved = impl.toSave({ texts: { ...today, "rg.marketing": { ...B2, en: `${B2.en} Kept.` } }, saved: savedSome, review: {} });
    // ⭐ F4 · a line already reviewed against today's default is not sent again; one reviewed against an old default is.
    const reviewedNow = { ...savedNone, "privacy.lawfulConsent": { rev: 1, words: null, reviewedCurrent: true } } as PolicyCardState["saved"];
    const reviewedOld = { ...savedNone, "privacy.lawfulConsent": { rev: 1, words: null, reviewedCurrent: false } } as PolicyCardState["saved"];
    const again = impl.toSave({ texts: today, saved: reviewedNow, review: { "privacy.lawfulConsent": true } });
    const reReview = impl.toSave({ texts: today, saved: reviewedOld, review: { "privacy.lawfulConsent": true } });
    const card = {
      untouchedNothing: untouched.length === 0,
      editSent: keysOf(edited) === "rg.marketing" && edited[0]?.base === 0 && edited[0]?.review === false,
      reviewSent: keysOf(reviewed) === "privacy.lawfulConsent" && reviewed[0]?.review === true && reviewed[0]?.base === 0,
      clearableNoReview: reviewClearable.length === 0,
      typedClearable: keysOf(typedClearable) === "profile.outreachNote" && typedClearable[0]?.review === false,
      savedOnChange: sameSaved.length === 0 && keysOf(changedSaved) === "rg.marketing" && changedSaved[0]?.base === 3,
      reviewOnce: again.length === 0,
      reReview: keysOf(reReview) === "privacy.lawfulConsent" && reReview[0]?.base === 1 && reReview[0]?.review === true,
    };
    // The request the card builds, read back by the action's reading and the server's.
    const form = patchFromForm(impl.postEntries([...edited, ...reviewed]));
    const reading = form.ok ? impl.readPatch(form.patch) : { ok: false as const };
    const roundTrip = reading.ok
      && JSON.stringify(reading.request.lines["rg.marketing"]) === JSON.stringify({ texts: { en: B2.en, sw: B2.sw, zh: B2.zh }, base: 0, review: false })
      && reading.request.lines["privacy.lawfulConsent"]?.review === true && Object.keys(reading.request.lines).length === 2;
    // Anything else is not understood.
    const good: Record<string, string> = {};
    for (const l of POLICY_LOCALES) good[policyTextFieldName("rg.marketing", l)] = B2[l];
    good[policyBaseFieldName("rg.marketing")] = "0";
    const { [policyTextFieldName("rg.marketing", "zh")]: _dropZh, ...missingLocale } = good;
    const { [policyBaseFieldName("rg.marketing")]: _dropBase, ...missingBase } = good;
    const hostile: Array<[string, unknown]> = [
      ["a missing language", missingLocale],
      ["a missing base", missingBase],
      ["a review with no text", { ...good, [policyReviewFieldName("privacy.smsGateway")]: "1" }],
      ["an unknown field", { ...good, foo: "bar" }],
      ["a number", { ...good, [policyBaseFieldName("rg.marketing")]: 0 }],
      ["a fourth language", { ...good, "text.rg.marketing.fr": "Bonjour" }],
      ["a prototype key", { ...good, "text.__proto__.en": "x" }],
      ["a base that is not a count", { ...good, [policyBaseFieldName("rg.marketing")]: "one" }],
      ["a review that is not 1", { ...good, [policyReviewFieldName("rg.marketing")]: "yes" }],
      ["a saved version posted whole", { "rg.marketing": [{ rev: 9, en: "x", sw: "x", zh: "x", codeDefault: "x", savedAt: T1, savedBy: "me" }] }],
      ["a review marker posted", { ...good, "reviewedDefault.rg.marketing": "00000000-1" }],
      ["an array", [["text.rg.marketing.en", "x"]]],
      ["a version posted", { ...good, "version.rg": "2026-12-31" }],
      ["a stamp posted", { ...good, "version.privacy": JSON.stringify({ stamp: "2026-12-31", base: PR_CODE }) }],
    ];
    const understood = hostile.filter(([, raw]) => impl.readPatch(raw).ok).map(([name]) => name);
    const goodReads = impl.readPatch(good).ok;
    const db = fakeDb();
    const store = storeOf(impl, db);
    const h = officer(tag, "l8");
    let storeRefuses = true;
    for (const [, raw] of hostile) {
      const r = await store.savePolicyLines(raw, h, T1);
      storeRefuses = storeRefuses && !r.ok && r.reason === "not_understood";
    }
    const nothing = db.writes() === 0 && (await auditRows(h)).length === 0;
    ok(p(L.l8), Object.values(card).every(Boolean) && roundTrip && understood.length === 0 && goodReads && storeRefuses && nothing,
      `card ${JSON.stringify(card)} · round trip ${roundTrip} · understood ${understood.length === 0 ? "none" : understood.join(", ")} · store ${storeRefuses} · nothing written ${nothing}`);
  }

  // ── L9 · ⛔ NEVER A REAL DATABASE (F6) ──────────────────────────────────────────────────────────────────────────
  {
    const self = impl.src.self;
    const guardAt = self.indexOf(`${LF}${GUARD_LINE}${LF}`);
    const firstLoad = self.indexOf(FIRST_SERVER_LOAD);
    const STATIC_IMPORT = /^import (?!type )[^;]*? from "([^"]+)";/gm;
    const staticSpecs = [...self.matchAll(STATIC_IMPORT)].map((m) => m[1]);
    const serverStatic = staticSpecs.filter((s) => s.startsWith("../src/lib/server/") || s.startsWith("../src/app/"));
    const conds = {
      guardFirst: guardAt >= 0 && firstLoad > guardAt,
      noStaticServer: staticSpecs.length >= 5 && serverStatic.length === 0,
      liveInstant: self.includes('SERVER.savePolicyLines(post, "off_policy_lines_live", T1)'),
      envGone: process.env.DATABASE_URL === undefined,
    };
    ok(p(L.l9), Object.values(conds).every(Boolean),
      `${JSON.stringify(conds)} · guard at ${guardAt}, first server load at ${firstLoad} · static server imports ${serverStatic.join(", ") || "none"}`);
  }

  // ── L10 · U13 · THE SEND WINDOW'S HOURS AND THE EVENING ───────────────────────────────────────────────────────
  {
    const v = (t: Partial<Record<PolicyLocale, unknown>>, w?: PolicySendWindow | null) => impl.problems("rg.marketing", t, undefined, w);
    const SAVED_WINDOW: PolicySendWindow = { windowStartMinute: 540, windowEndMinute: 1080 };
    const hoursOf = (r: PolicyLineVerdict, l: PolicyLocale): readonly PolicyLineProblem[] => r.problems[l].filter((x) => x.code === "hours_unkept");
    const refusedHours = (r: PolicyLineVerdict, l: PolicyLocale, label: string): boolean =>
      hoursOf(r, l).length === 1 && hoursOf(r, l)[0].sentence.includes(`the window is ${label}.`);
    const clearHours = (r: PolicyLineVerdict, l: PolicyLocale): boolean => hoursOf(r, l).length === 0;
    // (a) the default window, 08:00–20:00 — every time named that is not its opening or closing time, refused.
    const OFF = ["22:00", "9 pm", "9pm", "9 p.m.", "9 o'clock", "21h", "21h00", "21.00", "06:00", "19:30", "25:00"];
    const missedOff = OFF.filter((t) => !refusedHours(v({ ...B2, en: `${B2.en} Nothing is sent after ${t} EAT.` }), "en", "08:00–20:00 EAT"));
    const ON = ["before 08:00 or after 20:00", "outside 08:00–20:00", "before 8am or after 8pm", "after 8 p.m.", "after 8 o'clock", "after 20h", "after 20.00"];
    const wrongOn = ON.filter((t) => !clearHours(v({ ...B2, en: `${B2.en} No marketing SMS ${t} EAT.` }), "en"));
    const otherLanguages = refusedHours(v({ ...B2, sw: `${B2.sw} Hakuna ujumbe baada ya 21:00.` }), "sw", "08:00–20:00 EAT")
      && refusedHours(v({ ...B2, zh: `${B2.zh}22时后不发送。` }), "zh", "08:00–20:00 EAT")
      && clearHours(v({ ...B2, sw: `${B2.sw} Hakuna ujumbe baada ya 20:00.` }), "sw")
      && clearHours(v({ ...B2, zh: `${B2.zh}20:00 后不发送。` }), "zh");
    // (a) a SAVED window, 09:00–18:00 — judged by its hours, never the default's.
    const savedHours = refusedHours(v({ ...B2, en: `${B2.en} Nothing is sent after 20:00 EAT.` }, SAVED_WINDOW), "en", "09:00–18:00 EAT")
      && clearHours(v({ ...B2, en: `${B2.en} Nothing is sent before 09:00 or after 18:00 EAT.` }, SAVED_WINDOW), "en");
    // (a) ⛔ hours that could not be read: any time named is refused, and a line naming none passes.
    const unreadOk = hoursOf(v({ ...B2, en: `${B2.en} Nothing is sent after 20:00 EAT.` }, null), "en")
      .some((x) => x.sentence === POLICY_LINE_SENTENCE.hoursUnread("English")) && clearHours(v(B2, null), "en");
    const sentenceOk = POLICY_LINE_SENTENCE.hoursUnkept("English", ["22:00"], "08:00–20:00 EAT")
      === "The English line names a time the send window doesn't use (22:00) — the window is 08:00–20:00 EAT. Name only its opening or closing time, or no time at all."
      && POLICY_DEFAULT_SEND_WINDOW.windowStartMinute === 480 && POLICY_DEFAULT_SEND_WINDOW.windowEndMinute === 1200;
    // (b) the evening refused as its own promise, saying why; the night accepted.
    const EVENING = KEPT_PROMISES.evening;
    const asEvening = (r: PolicyLineVerdict, l: PolicyLocale): boolean =>
      r.problems[l].some((x) => x.code === "promise_unkept" && x.sentence === POLICY_LINE_SENTENCE.promiseUnkept(EVENING, POLICY_LOCALE_NAME[l]));
    const noUnkept = (r: PolicyLineVerdict, l: PolicyLocale): boolean => !r.problems[l].some((x) => x.code === "promise_unkept");
    const missedEvening = ["evening", "evenings", "after dark"].filter((w) => !asEvening(v({ ...B2, en: `${B2.en} No messages (${w}).` }), "en"));
    const eveningElsewhere = asEvening(v({ ...B2, sw: `${B2.sw} Hakuna ujumbe jioni.` }), "sw")
      && ["傍晚", "晚上"].every((w) => asEvening(v({ ...B2, zh: `${B2.zh}${w}不发送营销信息。` }), "zh"));
    const wrongNight = ["late at night", "overnight", "night", "midnight", "late-night", "quiet hours", "bedtime"]
      .filter((w) => !noUnkept(v({ ...B2, en: `${B2.en} No messages (${w}).` }), "en"));
    const nightElsewhere = noUnkept(v({ ...B2, sw: `${B2.sw} Hakuna ujumbe usiku.` }), "sw")
      && ["夜间", "深夜"].every((w) => noUnkept(v({ ...B2, zh: `${B2.zh}${w}不发送营销信息。` }), "zh"));
    const whyOk = EVENING.kept === false && KEPT_PROMISES.lateNight.kept === true
      && POLICY_LINE_SENTENCE.promiseUnkept(EVENING, "English")
        === "The English line promises no marketing in the evening, but marketing SMS are sent until the send window closes — 20:00 EAT unless the owner sets other hours. Remove it.";
    // (c) the save: the window read fresh — refused while it cannot be read, judged by the SAVED hours when it can.
    const WINDOW_DOWN = async (): Promise<PolicySendWindowRead> => ({ ok: false });
    const WINDOW_SAVED = async (): Promise<PolicySendWindowRead> => ({ ok: true, hours: SAVED_WINDOW });
    const a10 = officer(tag, "l10");
    const dbDown = fakeDb();
    const down = storeOf(impl, dbDown, impl.merge, WINDOW_DOWN);
    const rDown = await down.savePolicyLines(cardPost(down, { "rg.marketing": B2 }), a10, T1);
    const downRefused = !rDown.ok && rDown.reason === "window_unreadable" && rDown.error === SERVER.POLICY_LINES_REFUSAL_SENTENCE.window_unreadable
      && dbDown.writes() === 0 && down.savedLine("rg.marketing") === null && (await auditRows(a10)).length === 0;
    const rPrivacy = await down.savePolicyLines(cardPost(down, { "privacy.smsGateway": B3 }), a10, T1);
    const privacySaves = rPrivacy.ok && rPrivacy.changed.length === 1 && dbDown.writes() === 1;
    const dbSaved = fakeDb();
    const saved = storeOf(impl, dbSaved, impl.merge, WINDOW_SAVED);
    const rLate = await saved.savePolicyLines(cardPost(saved, { "rg.marketing": { ...B2, en: `${B2.en} No marketing SMS after 20:00 EAT.` } }), a10, T1);
    const lateRefused = !rLate.ok && rLate.reason === "invalid" && dbSaved.writes() === 0
      && (rLate.problems["rg.marketing"]?.en ?? []).some((x) => x.code === "hours_unkept" && x.sentence.includes("the window is 09:00–18:00 EAT."));
    const rOwn = await saved.savePolicyLines(cardPost(saved, { "rg.marketing": { ...B2, en: `${B2.en} No marketing SMS before 09:00 or after 18:00 EAT.` } }), a10, T1);
    const ownSaved = rOwn.ok && rOwn.moved.includes("rg.marketing") && dbSaved.writes() === 1;
    // (d) the card, the page and the server read the one window — the card judges as the save will.
    const src = impl.src;
    const wiring = {
      card: src.form.includes("policyLineProblems(key, text[key], now[key].printed, sendWindow)")
        && src.form.includes("policyLineProblems(key, line.words, line.words, sendWindow)"),
      page: src.page.includes("sendWindow={policyRows.sendWindow}") && src.page.includes("const windowRead = await policySendWindow();"),
      server: src.server.includes('if (!w.ok) return refusal("window_unreadable");')
        && src.server.includes("const verdict = rules.problems(k, t, undefined, sendWindow);")
        && src.server.includes("const r = await reloadMarketingSmsSettings();") && src.server.includes("return r.ok && r.readable"),
      pure: src.pure.includes("const hours = namedHoursProblem(t, POLICY_LOCALE_NAME[l], sendWindow);"),
    };
    // (e) U13 review #1 · a time written in WORDS is named, never valued — so the line is refused; a duration is no time.
    const WORDS_OFF: Array<[PolicyLocale, string]> = [
      ["en", "No marketing SMS after seven at night."], ["en", "No offers after nine pm."], ["en", "Nothing is sent after seven."],
      ["sw", "Hakuna matangazo baada ya saa moja usiku."], ["sw", "Hakuna ujumbe baada ya saa 2 usiku."], ["sw", "Hakuna ujumbe kabla ya saa mbili."],
      ["zh", "夜间七点后不发送营销信息。"], ["zh", "２２：００后不发送。"],
    ];
    const withLine = (l: PolicyLocale, t: string) => v({ ...B2, [l]: `${(B2 as Record<PolicyLocale, string>)[l]} ${t}` });
    const missedWords = WORDS_OFF.filter(([l, t]) => !refusedHours(withLine(l, t), l, "08:00–20:00 EAT")).map(([, t]) => t);
    const DURATIONS: Array<[PolicyLocale, string]> = [
      ["sw", "Hakuna ujumbe wa pili ndani ya saa moja."], ["en", "No second message within one hour."], ["zh", "两小时内不发送第二条。"], ["zh", "２０：００后不发送。"],
    ];
    const wrongDurations = DURATIONS.filter(([l, t]) => !clearHours(withLine(l, t), l)).map(([, t]) => t);
    // (f) U13 review #2 · an hour that names no half of the day is kept only while BOTH its readings are window edges.
    const EARLY: PolicySendWindow = { windowStartMinute: 420, windowEndMinute: 1200 };
    const ambiguousHeld = refusedHours(v({ ...B2, en: `${B2.en} No marketing SMS before 8 o'clock.` }, EARLY), "en", "07:00–20:00 EAT")
      && clearHours(v({ ...B2, en: `${B2.en} No marketing SMS before 8 o'clock.` }), "en");
    // (g) U13 review #5 · R1's LIVE read, through the store itself: the PROMISE lines as the pages print them, read fresh — a
    // saved RG line naming 20:00 is in it, a privacy line is not (the save holds no time there), a never-saved store prints
    // the page's own words, and a read that fails is `ok: false`.
    const dbPub = fakeDb();
    const pub = storeOf(impl, dbPub, impl.merge, WINDOW_SAVED);
    await pub.savePolicyLines(cardPost(pub, { "rg.marketing": { ...B2, en: `${B2.en} No marketing SMS after 18:00 EAT.` }, "privacy.smsGateway": B3 }), a10, T1);
    const read1 = await pub.publishedTexts();
    const read0 = await storeOf(impl, fakeDb(), impl.merge, WINDOW_SAVED).publishedTexts();
    const readDown = await storeOf(impl, fakeDb({ failLoads: true }), impl.merge, WINDOW_SAVED).publishedTexts();
    const liveRead = read1.ok && read1.texts.some((t) => t.includes("No marketing SMS after 18:00 EAT."))
      && !read1.texts.some((t) => t === normalizedPolicyTexts("privacy.smsGateway", B3).en)
      && read0.ok && POLICY_LOCALES.every((l) => read0.texts.includes(POLICY_LINE_DEFAULTS["rg.marketing"][l])) && !readDown.ok;
    const conds = {
      off: missedOff.length === 0, on: wrongOn.length === 0, otherLanguages, savedHours, unreadOk, sentenceOk,
      words: missedWords.length === 0, durations: wrongDurations.length === 0, ambiguousHeld, liveRead,
      evening: missedEvening.length === 0, eveningElsewhere, night: wrongNight.length === 0, nightElsewhere, whyOk,
      downRefused, privacySaves, lateRefused, ownSaved, wiring: Object.values(wiring).every(Boolean),
    };
    ok(p(L.l10), Object.values(conds).every(Boolean),
      `${JSON.stringify(conds)} · word times missed ${missedWords.join(" / ") || "none"} · durations refused ${wrongDurations.join(" / ") || "none"} · off missed ${missedOff.join("/") || "none"} · on refused ${wrongOn.join("/") || "none"} · evening missed ${missedEvening.join("/") || "none"} · night refused ${wrongNight.join("/") || "none"} · down ${rDown.ok ? "SAVED" : rDown.reason} · late ${rLate.ok ? "SAVED" : rLate.reason} · own ${rOwn.ok ? "saved" : `${rOwn.reason}: ${rOwn.error}`} · wiring ${JSON.stringify(wiring)}`);
  }
}

/** A stamp in a row, as JSON (`null` when the page was never stamped) — L6 reads it beside its own helpers. */
function stampOfRow(row: Record<string, unknown> | null, key: string): string {
  return JSON.stringify(row?.[key] ?? null);
}

/* ══ THE PLANTS — each one piece as somebody would write it wrongly, in memory ═══════════════════════════════════ */

const FORMAT_CHARS = new RegExp(`${BACKSLASH}p{Cf}`, "gu");
const ANY_SPACE_RUN = new RegExp(`[${BACKSLASH}s${BACKSLASH}p{Cc}]+`, "gu");
/** L1's plant · the marketing wordings' normaliser — every run of whitespace one space, and the RG binding never put back. */
const collapsingNormalize = (raw: unknown): string =>
  (typeof raw === "string" ? raw.normalize("NFC").replace(FORMAT_CHARS, "").normalize("NFC").replace(ANY_SPACE_RUN, " ").trim() : "");

const withoutCode = (code: string) => (key: PolicyLineKey, raw: Partial<Record<PolicyLocale, unknown>>, published?: PolicyTexts, sendWindow?: PolicySendWindow | null): PolicyLineVerdict => {
  const v = policyLineProblems(key, raw, published, sendWindow);
  return {
    ...v,
    problems: { en: v.problems.en.filter((x) => x.code !== code), sw: v.problems.sw.filter((x) => x.code !== code), zh: v.problems.zh.filter((x) => x.code !== code) },
  };
};

/** L10's U13-review plants · the times an hours refusal names (the words inside its brackets). */
const namedInSentence = (sentence: string): string => (sentence.split("(")[1] ?? "").split(")")[0] ?? "";
/** #1 · times written in words read as no time at all — only an hours refusal naming a digit time survives. */
const wordTimesUnread = (key: PolicyLineKey, raw: Partial<Record<PolicyLocale, unknown>>, published?: PolicyTexts, sendWindow?: PolicySendWindow | null): PolicyLineVerdict => {
  const v = policyLineProblems(key, raw, published, sendWindow);
  const keep = (x: PolicyLineProblem): boolean => x.code !== "hours_unkept" || /[0-9]/.test(namedInSentence(x.sentence));
  return { ...v, problems: { en: v.problems.en.filter(keep), sw: v.problems.sw.filter(keep), zh: v.problems.zh.filter(keep) } };
};
/** #2 · an hour naming no half of the day kept on EITHER reading — its refusal dropped whatever the window. */
const eitherReadingKept = (key: PolicyLineKey, raw: Partial<Record<PolicyLocale, unknown>>, published?: PolicyTexts, sendWindow?: PolicySendWindow | null): PolicyLineVerdict => {
  const v = policyLineProblems(key, raw, published, sendWindow);
  const keep = (x: PolicyLineProblem): boolean => x.code !== "hours_unkept" || !namedInSentence(x.sentence).includes("o'clock");
  return { ...v, problems: { en: v.problems.en.filter(keep), sw: v.problems.sw.filter(keep), zh: v.problems.zh.filter(keep) } };
};

/** L3's F2 · F3 plant · the ROUND-ONE reading: English only, the old late-night words and an HH:MM clock, no frequency cap. */
const CLOCK_ONLY = /(^|[^0-9])[0-9]{1,2}:[0-9]{2}([^0-9]|$)/;
const ROUND_ONE: Readonly<Record<PromiseKey, KeptPromise>> = {
  ...KEPT_PROMISES,
  lateNight: { ...KEPT_PROMISES.lateNight, phrases: ["late-night", "late night", "late at night", "overnight", "night-time", "nighttime"], patterns: [CLOCK_ONLY], anyLanguage: [], sw: [], zh: [] },
  frequencyCap: { ...KEPT_PROMISES.frequencyCap, phrases: [], patterns: [] },
};
const roundOneProblems = (key: PolicyLineKey, raw: Partial<Record<PolicyLocale, unknown>>, published?: PolicyTexts, sendWindow?: PolicySendWindow | null): PolicyLineVerdict => {
  const v = policyLineProblems(key, raw, published, sendWindow);
  if (!POLICY_LINE_SPEC[key]?.promises) return v;
  const texts = normalizedPolicyTexts(key, raw);
  const redo = (l: PolicyLocale) => [
    ...v.problems[l].filter((x) => x.code !== "promise_unkept"),
    ...(l === "en" && texts.en !== ""
      ? promisesIn(texts.en, "en", ROUND_ONE).filter((k) => !ROUND_ONE[k].kept)
        .map((k) => ({ code: "promise_unkept" as const, sentence: POLICY_LINE_SENTENCE.promiseUnkept(ROUND_ONE[k], POLICY_LOCALE_NAME.en) }))
      : []),
  ];
  return { ...v, problems: { en: redo("en"), sw: redo("sw"), zh: redo("zh") } };
};

/** Every WORDS version of the named lines passed through `fn` (a review marker untouched). */
function mapWords(record: PolicyLinesRecord, keys: readonly PolicyLineKey[], fn: (v: PolicyWordsVersion) => PolicyWordsVersion): PolicyLinesRecord {
  const out: Record<string, unknown> = { ...record };
  for (const k of keys) out[k] = record[k].map((v) => (isReviewVersion(v) ? v : fn(v)));
  return out as PolicyLinesRecord;
}
/** L5's F11 plant · check 1 reads the SMS gateway line alone. */
const gatewayOnly = (record: PolicyLinesRecord): ReturnType<typeof policyOpeningProblems> => {
  const out = policyOpeningProblems(record).filter((c) => c !== "privacy_gateway");
  const g = policyLineState("privacy.smsGateway", record["privacy.smsGateway"]);
  if (g.latest === null || POLICY_LOCALES.some((l) => holdsConsentOnlyPhrase(g.printed[l], l))) out.unshift("privacy_gateway");
  return out;
};
/** L5's F4 plant · every review counted as a review of TODAY's code default. */
const reviewsCurrent = (record: PolicyLinesRecord): PolicyLinesRecord => {
  const out: Record<string, unknown> = { ...record };
  for (const k of POLICY_LINE_KEYS) out[k] = record[k].map((v) => (isReviewVersion(v) ? { ...v, reviewedDefault: policyDefaultFingerprint(k) } : v));
  return out as PolicyLinesRecord;
};
/** L6's plant · a reader that keeps only the fields THIS build knows — a newer build's field is lost on the next save. */
const KNOWN_VERSION_FIELDS: readonly string[] = ["rev", "en", "sw", "zh", "codeDefault", "reviewedDefault", "savedAt", "savedBy"];
const knownFieldsOnly = (r: PolicyLinesRecord): PolicyLinesRecord => {
  const out: Record<string, unknown> = { ...r };
  for (const k of POLICY_LINE_KEYS) {
    out[k] = r[k].map((v) => Object.fromEntries(Object.entries(v).filter(([f]) => KNOWN_VERSION_FIELDS.includes(f))) as unknown as PolicyLineVersion);
  }
  return out as PolicyLinesRecord;
};
/** L4's F5 plant · the printed version ignores the stamp's base — the later of stamp and code, nothing more. */
const ignoringBase: typeof printedPolicyVersion = (code, saved) =>
  (!saved ? code : comparePolicyVersions(saved.stamp, code) > 0 ? saved.stamp : code);

/** L10's plant · the evening read as the kept late-night promise — its refusal dropped, in every language. */
const eveningAsKept = (key: PolicyLineKey, raw: Partial<Record<PolicyLocale, unknown>>, published?: PolicyTexts, sendWindow?: PolicySendWindow | null): PolicyLineVerdict => {
  const v = policyLineProblems(key, raw, published, sendWindow);
  const keep = (l: PolicyLocale) => v.problems[l].filter((x) => x.sentence !== POLICY_LINE_SENTENCE.promiseUnkept(KEPT_PROMISES.evening, POLICY_LOCALE_NAME[l]));
  return { ...v, problems: { en: keep("en"), sw: keep("sw"), zh: keep("zh") } };
};
/** L10's plants · a save that never asks the settings (the default hours, always), and one that obeys an unreadable window
 *  as the default hours. */
const defaultHoursRead = async (): Promise<PolicySendWindowRead> => ({ ok: true, hours: POLICY_DEFAULT_SEND_WINDOW });
const unreadableAsDefault = (read: () => Promise<PolicySendWindowRead>) => async (): Promise<PolicySendWindowRead> => {
  const r = await read();
  return r.ok ? r : { ok: true, hours: POLICY_DEFAULT_SEND_WINDOW };
};

function cases(problems: string[]): Array<{ name: string; expect: string; impl: Impl }> {
  const srcPlant = (over: Partial<Sources>): Impl => {
    for (const [k, v] of Object.entries(over)) {
      if (v === REAL_SOURCES[k as keyof Sources]) problems.push(`source plant on ${k} changed nothing`);
    }
    return { ...REAL, src: { ...REAL_SOURCES, ...over } };
  };
  const withProblems = (fn: Impl["problems"]): Impl => ({ ...REAL, problems: fn, rules: { ...POLICY_LINE_RULES, problems: fn } });
  const withRules = (over: Partial<PolicyLineRules>): Impl => ({ ...REAL, rules: { ...POLICY_LINE_RULES, ...over } });
  const actionAt = REAL_SOURCES.actions.indexOf("export async function savePolicyLinesAction(");
  const actionUngated = actionAt < 0 ? REAL_SOURCES.actions
    : REAL_SOURCES.actions.slice(0, actionAt) + REAL_SOURCES.actions.slice(actionAt).replace("const session = await requireAdmin();", "const session = { userId: 'anyone' };");
  const driftedDefaults: Record<PolicyLineKey, PolicyTexts> = {
    ...POLICY_LINE_DEFAULTS,
    "rg.marketing": { ...POLICY_LINE_DEFAULTS["rg.marketing"], sw: POLICY_LINE_DEFAULTS["rg.marketing"].sw.split(NBSP).join(" ") },
  };
  const stillVersion = (printed: string): string => printed;
  const lenient = (raw: unknown) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return readPolicyLinesPatch(raw);
    const kept = Object.fromEntries(Object.entries(raw as Record<string, unknown>)
      .filter(([k]) => k.startsWith("text.") || k.startsWith("base.") || k.startsWith("review.")));
    return readPolicyLinesPatch(kept);
  };
  const allReviewed = Object.fromEntries(POLICY_LINE_KEYS.map((k) => [k, true])) as Partial<Record<PolicyLineKey, boolean>>;
  /* L9 · the guard moved below the first server load: removed from its line, and put back after that load's line. */
  const guardMoved = (() => {
    const s = REAL_SOURCES.self;
    const g = `${LF}${GUARD_LINE}${LF}`;
    const from = s.indexOf(g);
    if (from < 0) return s;
    const without = s.slice(0, from) + LF + s.slice(from + g.length);
    const loadAt = without.indexOf(FIRST_SERVER_LOAD);
    const lineEnd = loadAt < 0 ? -1 : without.indexOf(LF, loadAt);
    return lineEnd < 0 ? s : `${without.slice(0, lineEnd + 1)}${GUARD_LINE}${LF}${without.slice(lineEnd + 1)}`;
  })();
  const staticServerImport = ["import { auditFlush } from ", '"../src/lib/server/audit.ts";'].join("");

  return [
    {
      name: "L0 · the RG page's META moved in the code while the save still stamps against the old version",
      expect: L.l0,
      /* The anchor is the code's OWN version (F7 — `RG_CODE`), not a typed date. A typed one rotted the day the page was re-versioned
         (2026-09-26 → 2026-10-06, `0652f61f`, which moved `POLICY_PAGES.rg.codeVersion` with it): the plant then matched nothing, changed
         nothing, and this case went green. The moved date is one no real re-version reaches, so it can never equal the code's. */
      impl: srcPlant({ rgPageRaw: REAL_SOURCES.rgPageRaw.replace(`en: "Version ${RG_CODE} ·`, 'en: "Version 2099-12-31 ·') }),
    },
    {
      name: "⛔ a default drifts from the page — the RG Swahili's no-break spaces typed as plain spaces",
      expect: L.l1,
      impl: { ...REAL, defaults: driftedDefaults },
    },
    {
      name: "⛔ F9 · the normaliser never puts the RG binding back — today's Swahili and Chinese are no longer what a save keeps",
      expect: L.l1,
      impl: { ...REAL, normalize: collapsingNormalize },
    },
    {
      name: "F4 · the RG English wrapper loses its one-line note — nothing beside it says it prints only until a save",
      expect: L.l1,
      impl: srcPlant({ rgPageRaw: REAL_SOURCES.rgPageRaw.replace(' /* ⛔ prints only until saved */', "") }),
    },
    {
      name: "⛔ the page prints the default after a save — the wrapper ignores the saved line",
      expect: L.l2,
      impl: { ...REAL, node: (_line, _saved, fallback) => fallback },
    },
    {
      name: "the RG page's header prints the code's version after a save (policyMeta dropped)",
      expect: L.l2,
      impl: srcPlant({ rgPageRaw: REAL_SOURCES.rgPageRaw.replace('meta={policyMeta(META[locale], "rg")}', "meta={META[locale]}") }),
    },
    {
      name: "⛔ the validator lets an unkept promise through (KEPT_PROMISES says the frequency cap is unkept)",
      expect: L.l3,
      impl: withProblems(withoutCode("promise_unkept")),
    },
    {
      name: "⛔ F2 · F3 · the round-one reading — a frequency cap, and any Swahili or Chinese promise the code does not keep, pass",
      expect: L.l3,
      impl: withProblems(roundOneProblems),
    },
    {
      name: "⛔ the phone rule removed — a public line may hold a phone number or a long run of digits",
      expect: L.l3,
      impl: withProblems(withoutCode("has_phone")),
    },
    {
      name: "⛔ F9 · the long-run rule removed — a 31-character run that cannot wrap on a phone is published",
      expect: L.l3,
      impl: withProblems(withoutCode("long_word")),
    },
    {
      name: "every problem NOT listed at once — each language stops at its first",
      expect: L.l3,
      impl: withProblems((key, raw, published) => {
        const v = policyLineProblems(key, raw, published);
        return { ...v, problems: { en: v.problems.en.slice(0, 1), sw: v.problems.sw.slice(0, 1), zh: v.problems.zh.slice(0, 1) } };
      }),
    },
    {
      name: "⛔ the required words dropped — a saved SMS gateway line may stop naming the gateway or what it receives",
      expect: L.l3,
      impl: withProblems(withoutCode("words_missing")),
    },
    {
      name: "F3 · the notes ignore the published line — no dropped-promise note against a saved line, no mixed-language note",
      expect: L.l3,
      impl: withProblems((key, raw) => policyLineProblems(key, raw)),
    },
    {
      name: "⛔ the version doesn't move — a save leaves the page's version where it was",
      expect: L.l4,
      impl: { ...REAL, nextVersion: stillVersion, rules: { ...POLICY_LINE_RULES, nextVersion: stillVersion } },
    },
    {
      name: "META prints the code's version whatever is saved",
      expect: L.l4,
      impl: { ...REAL, meta: (m) => m },
    },
    {
      name: "⛔ F1 · a review-only save moves the version — a review is counted as new words",
      expect: L.l4,
      impl: withRules({ movesWords: () => true }),
    },
    {
      name: "⛔ F5 · the printed version ignores the stamp's base — a same-day code bump prints the stamp's label over new text",
      expect: L.l4,
      impl: { ...REAL, printed: ignoringBase },
    },
    {
      name: "⛔ the opening check ignores the Swahili — a consent-only clause left in sw alone passes check 1",
      expect: L.l5,
      impl: { ...REAL, opening: (record) => policyOpeningProblems(mapWords(record, ["privacy.smsGateway"], (v) => ({ ...v, sw: "" }))) },
    },
    {
      name: "⛔ F11 · check 1 reads the SMS gateway line alone — a consent-only phrase in the licence, Consent or RG line passes",
      expect: L.l5,
      impl: { ...REAL, opening: gatewayOnly },
    },
    {
      name: "⛔ F4 · a review of an OLD code default still counts — check 2 passes on words nobody reviewed",
      expect: L.l5,
      impl: { ...REAL, opening: (record) => policyOpeningProblems(reviewsCurrent(record)) },
    },
    {
      name: "⛔ the merge drops the other lines — the record rebuilt from the request alone",
      expect: L.l6,
      impl: { ...REAL, merge: (_current, updates) => mergePolicyLines(EMPTY_POLICY_LINES, updates) },
    },
    {
      name: "⛔ m1 · the revision ignored — a page out of date quietly supersedes a line saved since it opened",
      expect: L.l6,
      impl: withRules({ admit: () => [] }),
    },
    {
      name: "⛔ M1 · the reader's drops not reported — a save rewrites a row it could not read in full",
      expect: L.l6,
      impl: withRules({ readRow: (raw) => ({ record: readPolicyLines(raw), dropped: [] }) }),
    },
    {
      name: "⛔ D9 · the queue removed — two saves at once build on the same record, and one line is lost",
      expect: L.l6,
      impl: { ...REAL, unqueued: true },
    },
    {
      name: "today's words written without the review tick — a POST of the defaults marks the Consent bullet reviewed",
      expect: L.l6,
      impl: withRules({ changes: (key, normalized, saved, _review, reviewedCurrent) => policyLineChanges(key, normalized, saved, true, reviewedCurrent) }),
    },
    {
      name: "⛔ F12 · the append-only check removed — a record that rewrites a saved version is written",
      expect: L.l6,
      impl: withRules({ appendOnly: () => null }),
    },
    {
      name: "⛔ F8 · the readable predicate says yes for a process that never loaded the row (and for one read in part)",
      expect: L.l6,
      impl: { ...REAL, wrap: (store) => ({ ...store, readable: () => true }) },
    },
    {
      name: "a newer build's field dropped — the reader keeps only the fields this build knows, and the next save loses it",
      expect: L.l6,
      impl: withRules({ readRow: (raw) => { const r = readPolicyLinesReport(raw); return { record: knownFieldsOnly(r.record), dropped: r.dropped }; } }),
    },
    {
      name: "L7 · the suite drops out of predeploy — a gate outside the pipeline is not a gate",
      expect: L.l7,
      impl: srcPlant({ pkg: REAL_SOURCES.pkg.split(" && npm run test:policy-lines").join("") }),
    },
    {
      name: "L7 · policy-lines.ts left out of client-graph-safe's pins",
      expect: L.l7,
      impl: srcPlant({ cgs: REAL_SOURCES.cgs.split('"lib/legal/policy-lines.ts",').join("") }),
    },
    {
      name: "L7 · the action saves before it asks who is saving (requireAdmin dropped)",
      expect: L.l7,
      impl: srcPlant({ actions: actionUngated }),
    },
    {
      name: "L7 · the card stops validating as the admin types (policyLineProblems no longer called)",
      expect: L.l7,
      impl: srcPlant({ form: REAL_SOURCES.form.split("policyLineProblems(").join("(() => null)(") }),
    },
    {
      name: "L7 · F4 · the card stops re-reading the saved lines on load — a saved line that fails today's rules goes unflagged",
      expect: L.l7,
      impl: srcPlant({ form: REAL_SOURCES.form.split("POLICY_LINE_SENTENCE.savedNowFails(").join("String(") }),
    },
    {
      name: "L7 · test:privacy-notice retypes the gateway's words instead of importing them",
      expect: L.l7,
      impl: srcPlant({
        privacySuite: REAL_SOURCES.privacySuite.replace("[...SMS_GATEWAY_WORDS.en, CONSENT_ONLY_CLAUSE.en]",
          '["SMS gateway", "your phone number and the text of each message", "only if you agree to receive them"]'),
      }),
    },
    {
      name: "L7 · the pure module reaches the server (a store import)",
      expect: L.l7,
      impl: srcPlant({ pure: `${REAL_SOURCES.pure}${LF}import { db } from "@/lib/server/store";` }),
    },
    {
      name: "L7 · the system page reads the policy lines on every tab",
      expect: L.l7,
      impl: srcPlant({ page: REAL_SOURCES.page.replace('tab === "policy" ? await policyLineRows() : null', "await policyLineRows()") }),
    },
    {
      name: "⛔ L8 · the request reader honours an unknown field — anything posted beside a line is quietly dropped",
      expect: L.l8,
      impl: { ...REAL, readPatch: lenient, rules: { ...POLICY_LINE_RULES, readPatch: lenient } },
    },
    {
      name: "L8 · the card sends every line on every save (one Save marks every line reviewed)",
      expect: L.l8,
      impl: { ...REAL, toSave: (s) => policyLinesToSave({ ...s, review: allReviewed }) },
    },
    {
      name: "⛔ L9 · F6 · the database guard moved below the first server import — a run with DATABASE_URL set would write to it",
      expect: L.l9,
      impl: srcPlant({ self: guardMoved }),
    },
    {
      name: "⛔ L9 · F6 · a server module imported statically — it loads before the guard runs",
      expect: L.l9,
      impl: srcPlant({ self: `${REAL_SOURCES.self}${LF}${staticServerImport}${LF}` }),
    },
    {
      name: "⛔ L10 · U13 · the hour check removed — a line may publish an hour the send window does not use",
      expect: L.l10,
      impl: withProblems(withoutCode("hours_unkept")),
    },
    {
      name: "⛔ L10 · U13 review #1 · a time written in words read as no time — 'no marketing SMS after seven at night' or 'baada ya saa moja usiku' published while messages go out until 20:00",
      expect: L.l10,
      impl: withProblems(wordTimesUnread),
    },
    {
      name: "⛔ L10 · U13 review #2 · an hour naming no half of the day kept on either reading — 'before 8 o'clock' published over a 07:00 opening",
      expect: L.l10,
      impl: withProblems(eitherReadingKept),
    },
    {
      name: "⛔ L10 · U13 review #5 · R1's live read blind — the published promise lines read as nothing, so any change to the hours saves",
      expect: L.l10,
      impl: { ...REAL, wrap: (store) => ({ ...store, publishedTexts: async () => ({ ok: true as const, texts: [] }) }) },
    },
    {
      name: "⛔ L10 · U13 · the evening read as the kept late-night promise — 'no marketing in the evening' published while messages go out until 20:00",
      expect: L.l10,
      impl: withProblems(eveningAsKept),
    },
    {
      name: "⛔ L10 · U13 · the save judges every line by the DEFAULT hours — the window the owner saved is never read",
      expect: L.l10,
      impl: { ...REAL, windowWrap: () => defaultHoursRead },
    },
    {
      name: "⛔ L10 · U13 · an unreadable window obeyed as the default hours — the save never fails closed",
      expect: L.l10,
      impl: { ...REAL, windowWrap: (read) => (read === undefined ? undefined : unreadableAsDefault(read)) },
    },
    {
      name: "L10 · U13 · the card judges a named time by the default hours — it is not handed the window the page read",
      expect: L.l10,
      impl: srcPlant({ form: REAL_SOURCES.form.split(", sendWindow)").join(")") }),
    },
    {
      name: "L10 · U13 · the page hands the card no window",
      expect: L.l10,
      impl: srcPlant({ page: REAL_SOURCES.page.split(" sendWindow={policyRows.sendWindow}").join("") }),
    },
  ];
}

/* ══ RUN ════════════════════════════════════════════════════════════════════════════════════════════════════════ */

if (!PROVE_RED) {
  await runAssertions(REAL, "");
  console.log(`${LF}policy-lines: ${pass} passed, ${fail} failed`);
  process.exitCode = fail === 0 ? 0 : 1;
} else {
  const problems: string[] = [];
  await runAssertions(REAL, "base:");
  if (fail !== 0) problems.push(`BASELINE: the shipped code is already red (${failed.join(" | ")})`);
  console.log(`${LF}§0 baseline: ${pass} passed, ${fail} failed${LF}`);
  const CASES = cases(problems);
  for (const [i, c] of CASES.entries()) {
    pass = 0; fail = 0; failed.length = 0;
    const tag = `red${i + 1}:`;
    console.log(`── case ${i + 1}: ${c.name}`);
    await runAssertions(c.impl, tag);
    const wanted = `${tag}${c.expect}`;
    if (fail === 0) problems.push(`case ${i + 1} (${c.name}): stayed GREEN`);
    else if (!failed.includes(wanted)) problems.push(`case ${i + 1} (${c.name}): red, but not on "${c.expect}" — got ${failed.join(" | ")}`);
    else console.log(`   caught → ${c.expect}${LF}`);
  }
  const caught = CASES.length - problems.filter((x) => x.startsWith("case")).length;
  console.log(`${LF}${caught}/${CASES.length} caught`);
  if (problems.length) {
    console.log(`${LF}PROBLEMS:`);
    for (const x of problems) console.log(`  ✗ ${x}`);
    process.exitCode = 1;
  } else {
    console.log("RED PROOF COMPLETE");
    process.exitCode = 0;
  }
}
