/**
 * test:marketing-consent-ledger — U6's EXECUTED proof.
 *
 * ⭐ WHY THIS EXISTS BESIDE `test:dal-parity` §17. That gate is SOURCE-LEVEL: it reads the two
 * DALs as text and proves they agree in shape. It cannot run a single line of them. So it would
 * stay green through a ledger that normalises the phone key wrongly, resolves the wording from
 * the wrong language, or loses the second of two decisions — every one of which produces a record
 * that cannot answer the question it exists to answer (GN 478T reg 51(1)).
 *
 * ⭐ SINCE 2026-09-26 IT ALSO PROVES WHAT THE ROW SAYS WAS SHOWN (D2) AND WHICH ROWS COUNT (OQ11, D3):
 * §6 drives the REAL registration service in English and Chinese and reads the row back — the path
 * that wrote "Nipe matangazo (hiari)." for every registrant whatever they read; §7 pins that both consent
 * forms post the language they were DRAWN in (2026-09-27: the cookie alone could change between drawing
 * and submitting), that the actions validate it to en/sw/zh before the cookie fallback, and runs that
 * validator; §8 proves every consent sentence the dictionary
 * shows today is one of the literal SMS-naming sentences the gate accepts (`consent-wording.ts`),
 * that no withdrawal or pre-2026-09-26 sentence is, that the pinned list was only ever appended to, and
 * that the three consent points call the consent by ONE name in each language (D1).
 *
 * ⛔ IN-PROCESS BY CONSTRUCTION. `--prove-red` plants the defective implementations IN MEMORY and
 * requires the MATCHING assertion to fire — not merely "something failed". This file makes no
 * file-writing call of any kind, so it stays outside `test:red-anchors` §4's undeclared count.
 *
 * Run:  npm run test:marketing-consent-ledger
 * Red:  npm run red:marketing-consent-ledger
 */
// ⛔ Captured, never sent: a successful registration mails a verification link.
process.env.EMAIL_OUTBOX_CAPTURE = "1";

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { appendMarketingConsent, marketingConsentWording, renderedLocaleOf } from "../src/lib/server/marketing/consent-ledger.ts";
import type { AppendMarketingConsentInput, MarketingConsentSite } from "../src/lib/server/marketing/consent-ledger.ts";
import { SMS_CONSENT_WORDINGS, isSmsConsentWording } from "../src/lib/marketing/consent-wording.ts";
import { optOutWording } from "../src/lib/server/marketing/optout-service.ts";
import { registerWithPassword } from "../src/lib/server/auth-service.ts";
import type { PasswordRegisterInput } from "../src/lib/server/auth-service.ts";
import { db } from "../src/lib/server/store.ts";
import type { StoredSuppression, MessagingLocale } from "../src/lib/server/store.ts";
import { decomment } from "./lib/decomment.mts";

/* ⛔ FAILURE IS THE DEFAULT AND IS SET BEFORE THE FIRST `await`. A suite whose verdict is written
 * only at the end scores GREEN when a promise never settles or the process exits early — the exit
 * code is 0 unless something set it. Cleared at the bottom, and only there. */
process.exitCode = 1;

const PROVE_RED = process.argv.includes("--prove-red");

/** The sources §7 reads — handed in, so a red case can plant the pre-fix text. */
type Sources = { registerActions: string; registerPage: string; profileActions: string; profileCard: string; authService: string };
const read = (rel: string) => decomment(readFileSync(new URL(`../${rel}`, import.meta.url), "utf8")).replace(/\r\n/g, "\n");
const REAL_SOURCES: Sources = {
  registerActions: read("src/app/auth/register/actions.ts"),
  registerPage: read("src/app/auth/register/page.tsx"),
  profileActions: read("src/app/profile/notifications/actions.ts"),
  profileCard: read("src/app/profile/notifications/marketing-consent.tsx"),
  authService: read("src/lib/server/auth-service.ts"),
};

type Impl = {
  append: (input: AppendMarketingConsentInput) => Promise<boolean>;
  wording: (site: MarketingConsentSite, locale: MessagingLocale) => string;
  suppress: (row: StoredSuppression) => Promise<StoredSuppression>;
  /** The registration SERVICE, driven for real (it throws at the session cookie — see `registerAs`). */
  register: (input: PasswordRegisterInput) => Promise<unknown>;
  /** OQ11's predicate — which stored sentences the gate counts as SMS consent. */
  isPinned: (wording: string) => boolean;
  /** D2 · the validator for the language a form posts back as the one it was drawn in. */
  rendered: (posted: unknown) => MessagingLocale | null;
  sources: Sources;
};

const REAL: Impl = {
  append: appendMarketingConsent,
  wording: marketingConsentWording,
  suppress: async (row) => Promise.resolve(db.suppression.create(row)),
  register: registerWithPassword,
  isPinned: isSmsConsentWording,
  rendered: renderedLocaleOf,
  sources: REAL_SOURCES,
};

let pass = 0, fail = 0;
const failed: string[] = [];
const ok = (l: string, c: boolean, x = "") => {
  if (c) pass++; else { fail++; failed.push(l); }
  console.log(`${c ? "PASS" : "FAIL"} ${l}${x ? ` — ${x}` : ""}`);
};

/** What the sign-up page SHOWS in Swahili today — the real resolver, so a planted resolver is measured against it. */
const SIGNUP_SW = marketingConsentWording("REGISTRATION", "SW");
const LOCALES: MessagingLocale[] = ["SW", "EN", "ZH"];

/**
 * ⭐ THE APPEND-ONLY PIN. A hash of the first entries of `SMS_CONSENT_WORDINGS` as they shipped on
 * 2026-09-27. Appending leaves it unchanged; editing or removing an entry — which would disqualify
 * people who consented under it — changes it. ⛔ Never "update the hash" to make this pass.
 * ⚠️ RE-PINNED ONCE, BEFORE THE FIRST DEPLOY (2026-09-27): `since` said 2026-09-26, the decision day,
 * for a field documented as the ship date. No production row existed under these entries, so the
 * date was corrected and the hash taken again (was fe46193d9f2c2416). The wordings are unchanged.
 */
const PINNED_PREFIX_COUNT = 9;
const PINNED_PREFIX_SHA = "718250ee6e8280ed";
const prefixSha = (list: typeof SMS_CONSENT_WORDINGS) => createHash("sha256")
  .update(list.slice(0, PINNED_PREFIX_COUNT).map((w) => [w.since, w.site, w.locale, w.wording].join("|")).join("\n"), "utf8")
  .digest("hex").slice(0, 16);

/** The pre-2026-09-26 sentences — none named SMS, so none may count (OQ11). Literal, as they shipped. */
const OLD_SENTENCES = [
  "Nipe matangazo (hiari).",
  "Send me product updates (optional).",
  "向我发送产品更新（可选）。",
  "Habari za bidhaa — Habari za mara kwa mara kuhusu 50pick. Zima wakati wowote — ujumbe kuhusu akaunti yako, dau na fedha bado utakufikia.",
  "Product news — Occasional news about 50pick. Turn it off at any time — messages about your account, bets and money still reach you.",
  "产品动态 — 不定期接收 50pick 的动态。可随时关闭——有关您账户、投注和资金的消息仍会照常发送。",
];

/**
 * Drive the real registration SERVICE as far as it goes in a plain script. A successful sign-up mints
 * a session cookie, which needs a Next request scope — the same constraint `auth-email-integrity`
 * documents — so the throw there means "it got all the way", and the rows it wrote are read back.
 */
async function registerAs(impl: Impl, phone: string, email: string, locale: MessagingLocale | undefined): Promise<void> {
  const PW = "Str0ng!Passw0rd#2026";
  try {
    await impl.register({
      phone, email, password: PW, passwordConfirm: PW, dob: "1990-01-01",
      acceptTerms: true, acceptAge: true, marketingOptIn: true,
      ...(locale ? { locale } : {}),
    });
  } catch { /* the session cookie — everything before it has run */ }
}

/**
 * The whole sequence, against ONE implementation and ONE phone number.
 *
 * ⚠️ Each run takes its OWN number. The memory store is a process-global map, so a red case that
 * reused the green case's key would be asserting against rows the previous run left behind — and
 * a suite that reads another run's state is not measuring the thing it names.
 */
async function runAssertions(impl: Impl, phone: string, tag: string): Promise<void> {
  const id = phone.replace(/\D/g, "").replace(/^0/, "255");
  const KEY = { channel: "SMS" as const, identifier: id, category: "MARKETING" as const };
  const p = (n: string) => `${tag}${n}`;

  ok(p("0 · baseline · the ledger holds nothing for this number before anything runs"),
    (await Promise.resolve(db.messagingConsent.listFor(KEY))).length === 0);

  const wrote = await impl.append({
    phoneE164: phone, locale: "SW", status: "GIVEN",
    source: "REGISTRATION", site: "REGISTRATION", evidence: "v1", recordedBy: null,
  });
  ok(p("1 · the append reports success"), wrote === true);
  const rows1 = await Promise.resolve(db.messagingConsent.listFor(KEY));
  ok(p("1b · EXECUTED · exactly one row landed, found by the normalised phone key"), rows1.length === 1, `${rows1.length} rows`);
  ok(p("1c · the sign-up wording is the SWAHILI sentence, stored verbatim"),
    rows1[0]?.wording === SIGNUP_SW, JSON.stringify(rows1[0]?.wording ?? null));

  await impl.append({
    phoneE164: phone, locale: "SW", status: "WITHDRAWN",
    source: "PROFILE", site: "PROFILE", evidence: "/profile/notifications", recordedBy: null,
  });
  const rows2 = await Promise.resolve(db.messagingConsent.listFor(KEY));
  ok(p("2 · APPEND-ONLY · the withdrawal ADDED a row rather than replacing one"), rows2.length === 2, `${rows2.length} rows`);
  ok(p("2b · the original GIVEN row survives, with the wording it was written with"),
    rows2.some((r) => r.status === "GIVEN" && r.wording === SIGNUP_SW));
  const latest = await Promise.resolve(db.messagingConsent.latestFor(KEY));
  ok(p("2c · latestFor answers WITHDRAWN — the question U7's gate will ask"), latest?.status === "WITHDRAWN", String(latest?.status));
  ok(p("2d · the profile row carries the TOGGLE's copy, not the sign-up form's"),
    latest?.wording === marketingConsentWording("PROFILE", "SW"), JSON.stringify(latest?.wording ?? null));

  // ⛔ THE WORDING MUST TRACK THE LANGUAGE AND THE SURFACE. A record that says the player read
  // English copy they were never shown is a FALSE record, not a harmless default.
  ok(p("3 · EN and SW wording differ"), impl.wording("REGISTRATION", "EN") !== impl.wording("REGISTRATION", "SW"));
  ok(p("3b · the two surfaces' wording differ"), impl.wording("PROFILE", "SW") !== impl.wording("REGISTRATION", "SW"));
  ok(p("3c · an unknown locale falls to SWAHILI, the platform default — never to English"),
    impl.wording("REGISTRATION", "XX" as MessagingLocale) === impl.wording("REGISTRATION", "SW"));

  ok(p("4 · an unusable identifier is REFUSED, not written as a row nobody can look up"),
    (await impl.append({
      phoneE164: "123", locale: "SW", status: "GIVEN",
      source: "REGISTRATION", site: "REGISTRATION", evidence: null, recordedBy: null,
    })) === false);

  const first = await impl.suppress({
    id: `${tag}sup-1`, channel: "SMS", identifier: id, category: "MARKETING",
    reason: "WITHDRAWN", evidence: null, recordedBy: null, createdAt: "2026-01-01T00:00:00.000Z",
  });
  const again = await impl.suppress({
    id: `${tag}sup-2`, channel: "SMS", identifier: id, category: "MARKETING",
    reason: "COMPLAINT", evidence: null, recordedBy: null, createdAt: "2026-09-25T00:00:00.000Z",
  });
  ok(p("5 · re-suppression returns the row ALREADY THERE"), again.id === first.id, `${again.id}`);
  ok(p("5b · ⛔ the original 'when did they say no' was NOT moved forward"),
    again.createdAt === "2026-01-01T00:00:00.000Z", again.createdAt);
  ok(p("5c · exactly one suppression row exists for the triple"),
    (await Promise.resolve(db.suppression.listFor(id))).length === 1);
  ok(p("5d · CONTROL · a DIFFERENT number still gets its own row — the rule is not 'refuse everything'"),
    (await impl.suppress({
      id: `${tag}sup-3`, channel: "SMS", identifier: `${id.slice(0, -1)}9`, category: "MARKETING",
      reason: "WITHDRAWN", evidence: null, recordedBy: null, createdAt: "2026-09-25T00:00:00.000Z",
    })).id === `${tag}sup-3`);

  // ── 6 · D2 · THE REAL REGISTRATION PATH RECORDS THE LANGUAGE IT SHOWED ─────────────────────
  // 🔴 Both registration paths passed `locale: "SW"`, so an English or Chinese registrant was recorded
  // as having read "Nipe matangazo (hiari)." — false evidence, in an append-only store.
  const national = id.slice(3); // 9 digits
  const regPhone = (ndc: string) => `+255${ndc}${national.slice(2)}`;
  const reg = async (ndc: string, locale: MessagingLocale | undefined) => {
    const ph = regPhone(ndc);
    await registerAs(impl, ph, `reg${ph.slice(1)}@example.com`, locale);
    const key = { channel: "SMS" as const, identifier: ph.slice(1), category: "MARKETING" as const };
    return {
      row: await Promise.resolve(db.messagingConsent.latestFor(key)),
      user: await Promise.resolve(db.user.findByPhone(ph)),
    };
  };
  const en = await reg("74", "EN");
  ok(p("6 · ⭐ D2 · an ENGLISH registration stores the English sentence it showed, with locale EN"),
    en.row?.wording === marketingConsentWording("REGISTRATION", "EN") && en.row?.locale === "EN",
    `${JSON.stringify(en.row?.wording ?? null)} · ${en.row?.locale}`);
  ok(p("6b · …and the account's User.locale is EN from its first day (OD42 reads it)"), en.user?.locale === "EN", `${en.user?.locale}`);
  const zh = await reg("75", "ZH");
  ok(p("6c · a CHINESE registration stores the Chinese sentence, with locale ZH"),
    zh.row?.wording === marketingConsentWording("REGISTRATION", "ZH") && zh.row?.locale === "ZH" && zh.user?.locale === "ZH",
    `${JSON.stringify(zh.row?.wording ?? null)} · ${zh.row?.locale} · user ${zh.user?.locale}`);
  const none = await reg("76", undefined);
  ok(p("6d · ⚠️ CONTROL — with no shown language the row is SWAHILI, the platform default (never English)"),
    none.row?.wording === SIGNUP_SW && none.row?.locale === "SW" && none.user?.locale === "SW",
    `${JSON.stringify(none.row?.wording ?? null)} · ${none.row?.locale}`);
  ok(p("6e · ⚠️ CONTROL — the three registrations really created three accounts"),
    !!en.user && !!zh.user && !!none.user, `${!!en.user} ${!!zh.user} ${!!none.user}`);

  // ── 7 · D2 · THE LANGUAGE A CONSENT FORM WAS DRAWN IN IS THE ONE RECORDED ──────────────────
  // A server action needs a request scope, so the wiring is pinned at source level: the service above
  // is only as honest as the locale its callers hand it. 🔴 Until 2026-09-27 both actions read the
  // `kp-locale` cookie AT SUBMIT, and the cookie can change after the page is drawn (the language
  // provider rewrites it on mount without redrawing the server's page; another tab can switch), so a
  // Swahili tick was stored as the English sentence. ⭐ Each form now posts the language it was drawn
  // in, the action validates it (`renderedLocaleOf`), and the cookie is only the fallback.
  const s = impl.sources;
  ok(p("7 · the register actions record the language the form posts as DRAWN (validated), the cookie only as fallback, on BOTH paths"),
    /renderedLocaleOf\(formData\.get\("shownLocale"\)\)\s*\?\?\s*messagingLocaleOf\(\(await getServerT\(\)\)\.locale\)/.test(s.registerActions)
      && /registerWithPassword\(\{[\s\S]*?locale:\s*await shownLocale\(formData\)[\s\S]*?\}\)/.test(s.registerActions)
      && /requestRegisterOtp\(\{[\s\S]*?locale:\s*await shownLocale\(formData\)[\s\S]*?\}\)/.test(s.registerActions));
  ok(p("7a · ⭐ the sign-up form posts the language it was drawn in — a hidden shownLocale from the same getServerT() that drew its label"),
    /const \{ t, locale \} = await getServerT\(\)/.test(s.registerPage)
      && /<input type="hidden" name="shownLocale" value=\{locale\} \/>/.test(s.registerPage));
  ok(p("7b · ⛔ the profile toggle records the language the switch was drawn in (validated), the cookie as fallback — never User.locale"),
    /renderedLocaleOf\(renderedLocale\)\s*\?\?\s*messagingLocaleOf\(\(await getServerT\(\)\)\.locale\)/.test(s.profileActions)
      && !/user\.locale/.test(s.profileActions) && /locale:\s*shown/.test(s.profileActions));
  ok(p("7d · ⭐ the profile switch posts its OWN drawn language (useT().locale) with every tap"),
    /const \{ t, locale \} = useT\(\)/.test(s.profileCard) && /setMarketingConsentAction\(want,\s*locale\)/.test(s.profileCard));
  // ⛔ EXECUTED: the posted value only ever SELECTS one of three dictionary sentences, so it must be one
  // of exactly three values — a case variant, a padded value or free text is refused (the cookie decides).
  const table: Array<[unknown, MessagingLocale | null]> = [
    ["en", "EN"], ["sw", "SW"], ["zh", "ZH"],
    ["EN", null], ["Sw", null], [" sw", null], ["en-GB", null], ["fr", null], ["", null],
    [null, null], [undefined, null], [1, null], [{}, null], ["<b>en</b>", null],
    ["Send me 50pick offers and news by SMS (optional).", null],
  ];
  const wrongRendered = table.filter(([x, want]) => impl.rendered(x) !== want)
    .map(([x, want]) => `${JSON.stringify(x) ?? String(x)} → ${impl.rendered(x)} (want ${want})`);
  ok(p("7e · ⛔ EXECUTED · a posted language counts only as exactly en / sw / zh — case, padding and free text are refused"),
    wrongRendered.length === 0, wrongRendered.join(" | "));
  ok(p("7c · ⛔ no registration site in auth-service writes a literal \"SW\" locale any more"),
    !/\blocale:\s*"SW"\s*,/.test(s.authService) && (s.authService.match(/messagingLocaleOf\(/g) ?? []).length >= 5,
    `${(s.authService.match(/messagingLocaleOf\(/g) ?? []).length} messagingLocaleOf call(s)`);

  // ── 8 · OQ11 · THE SENTENCES THE GATE COUNTS ───────────────────────────────────────────────
  // ⭐ Every consent sentence the dictionary shows TODAY must be pinned literally, so a copy change
  // cannot silently stop (or start) counting consents: it fails here until it is appended.
  const shown: Array<[string, string]> = [];
  for (const L of LOCALES) {
    shown.push([`REGISTRATION ${L}`, impl.wording("REGISTRATION", L)]);
    shown.push([`PROFILE ${L}`, impl.wording("PROFILE", L)]);
    shown.push([`OPT_OUT_RESUME ${L}`, optOutWording("RESUME", L)]);
  }
  const unpinned = shown.filter(([, w]) => !impl.isPinned(w));
  ok(p("8 · ⭐ every consent sentence the dictionary shows today is pinned in consent-wording.ts (OQ11)"),
    unpinned.length === 0,
    unpinned.map(([k, w]) => `${k} → append ${JSON.stringify(w)}`).join(" | "));
  const stopPinned = LOCALES.filter((L) => impl.isPinned(optOutWording("STOP", L)));
  ok(p("8b · ⛔ a WITHDRAWAL sentence is never counted as consent"), stopPinned.length === 0, stopPinned.join(","));
  const oldCounted = OLD_SENTENCES.filter((w) => impl.isPinned(w));
  ok(p("8c · ⛔ no pre-2026-09-26 sentence counts — 'product updates' / 'Product news' / 'Nipe matangazo' never named SMS"),
    oldCounted.length === 0, oldCounted.join(" | "));
  const noChannel = SMS_CONSENT_WORDINGS.filter((w) => !(w.locale === "ZH" ? w.wording.includes("短信") : w.wording.includes("SMS")));
  ok(p("8d · every pinned sentence names its channel (SMS / 短信) — the reason the list exists"),
    noChannel.length === 0, noChannel.map((w) => w.wording.slice(0, 40)).join(" | "));
  ok(p("8e · ⛔ APPEND-ONLY — the entries pinned on 2026-09-28 (the ship date) are byte-identical"),
    prefixSha(SMS_CONSENT_WORDINGS) === PINNED_PREFIX_SHA && SMS_CONSENT_WORDINGS.length >= PINNED_PREFIX_COUNT,
    `sha ${prefixSha(SMS_CONSENT_WORDINGS)} · ${SMS_CONSENT_WORDINGS.length} entries`);
  // ⭐ ONE NAME (D1). The consent had a different name on every surface ("product updates", "Product news",
  // "matangazo"), so a player could not find by name the thing they had agreed to. All three consent points
  // now name the same sender, content and channel in each language. A sentence that names SMS but calls the
  // thing something else passes 8d and fails here.
  const NAME_TERMS: Record<MessagingLocale, RegExp[]> = {
    EN: [/\boffers\b/i, /\bnews\b/i, /\bSMS\b/],
    SW: [/\bofa\b/i, /\bhabari\b/i, /\bSMS\b/],
    ZH: [/优惠/, /资讯/, /短信/],
  };
  const misnamed: string[] = [];
  for (const L of LOCALES) {
    const points: Array<[string, string]> = [
      ["REGISTRATION", impl.wording("REGISTRATION", L)],
      ["PROFILE", impl.wording("PROFILE", L)],
      ["OPT_OUT_RESUME", optOutWording("RESUME", L)],
    ];
    for (const [site, w] of points) {
      const missing = [/50pick/, ...NAME_TERMS[L]].filter((re) => !re.test(w)).map((re) => re.source);
      if (missing.length > 0) misnamed.push(`${site} ${L} lacks ${missing.join(", ")}`);
    }
  }
  ok(p("8f · ⭐ ONE NAME — every consent point names the same sender, content and channel in its language (D1)"),
    misnamed.length === 0, misnamed.join(" | "));
}

if (!PROVE_RED) {
  await runAssertions(REAL, "0712345678", "");
  console.log(`\nmarketing-consent-ledger: ${pass} passed, ${fail} failed`);
  process.exitCode = fail === 0 ? 0 : 1;
} else {
  /* ══ THE RED PROOF ═══════════════════════════════════════════════════════════════════════
   * Each case plants ONE real defect in memory and names the assertion that must fire. A case
   * that goes red on some OTHER assertion is reported as a problem, not a success — a gate that
   * fails for the wrong reason is not a gate. */
  const problems: string[] = [];

  // §0 — THE SHIPPED CODE PASSES FIRST. Without this, "every proof held" could equally mean
  // "nothing works at all", and the whole run would be meaningless.
  await runAssertions(REAL, "0712345600", "base:");
  if (fail !== 0) problems.push(`BASELINE: the shipped implementation is already red (${failed.join(" | ")})`);
  console.log(`\n§0 baseline · shipped code: ${pass} passed, ${fail} failed\n`);

  const CASES: Array<{ name: string; phone: string; impl: Impl; expect: string }> = [
    {
      name: "the wording is re-rendered from ENGLISH copy whatever the player read (§5.7)",
      phone: "0712345601",
      expect: "1c · the sign-up wording is the SWAHILI sentence, stored verbatim",
      impl: {
        ...REAL,
        wording: (site) => marketingConsentWording(site, "EN"),
        append: async (i) => appendMarketingConsent({ ...i, locale: "EN" }),
      },
    },
    {
      name: "the second decision is LOST — one row per person, which is D8 all over again",
      phone: "0712345602",
      expect: "2 · APPEND-ONLY · the withdrawal ADDED a row rather than replacing one",
      impl: {
        ...REAL,
        append: async (i) => {
          const key = {
            channel: "SMS" as const,
            identifier: i.phoneE164.replace(/\D/g, "").replace(/^0/, "255"),
            category: "MARKETING" as const,
          };
          const existing = await Promise.resolve(db.messagingConsent.listFor(key));
          if (existing.length > 0) return true; // silently drops the withdrawal
          return appendMarketingConsent(i);
        },
      },
    },
    {
      name: "an unusable identifier is accepted, as a row nobody can ever look up",
      phone: "0712345603",
      expect: "4 · an unusable identifier is REFUSED, not written as a row nobody can look up",
      impl: {
        ...REAL,
        append: async (i) => (i.phoneE164 === "123" ? true : appendMarketingConsent(i)),
      },
    },
    {
      name: "re-suppression REPLACES the row, walking 'when did they say no' forward on every re-import",
      phone: "0712345604",
      expect: "5b · ⛔ the original 'when did they say no' was NOT moved forward",
      impl: { ...REAL, suppress: async (row) => row },
    },
    {
      name: "🔴 D2 · registration hard-codes the Swahili locale again, whatever the page showed",
      phone: "0712345605",
      expect: "6 · ⭐ D2 · an ENGLISH registration stores the English sentence it showed, with locale EN",
      impl: { ...REAL, register: (input) => registerWithPassword({ ...input, locale: "SW" }) },
    },
    {
      name: "🔴 D2 · the profile toggle reads User.locale again (never written after sign-up, so always SW)",
      phone: "0712345606",
      expect: "7b · ⛔ the profile toggle records the language the switch was drawn in (validated), the cookie as fallback — never User.locale",
      impl: { ...REAL, sources: { ...REAL_SOURCES, profileActions: REAL_SOURCES.profileActions.replace(/locale:\s*shown/, "locale: user.locale") } },
    },
    {
      name: "🔴 D2 · the register action reads only the cookie at submit again — a Swahili tick stored as English once the provider rewrote it",
      phone: "0712345611",
      expect: "7 · the register actions record the language the form posts as DRAWN (validated), the cookie only as fallback, on BOTH paths",
      impl: { ...REAL, sources: { ...REAL_SOURCES, registerActions: REAL_SOURCES.registerActions.replace('renderedLocaleOf(formData.get("shownLocale")) ?? ', "") } },
    },
    {
      name: "🔴 D2 · the sign-up form stops posting the language it was drawn in",
      phone: "0712345612",
      expect: "7a · ⭐ the sign-up form posts the language it was drawn in — a hidden shownLocale from the same getServerT() that drew its label",
      impl: { ...REAL, sources: { ...REAL_SOURCES, registerPage: REAL_SOURCES.registerPage.replace('<input type="hidden" name="shownLocale" value={locale} />', "") } },
    },
    {
      name: "🔴 D2 · the profile switch posts no language, so a second tab's cookie decides again",
      phone: "0712345613",
      expect: "7d · ⭐ the profile switch posts its OWN drawn language (useT().locale) with every tap",
      impl: { ...REAL, sources: { ...REAL_SOURCES, profileCard: REAL_SOURCES.profileCard.replace("setMarketingConsentAction(want, locale)", "setMarketingConsentAction(want)") } },
    },
    {
      name: "⛔ D2 · the posted language is trusted as free text — whatever the client sends becomes the ledger's locale",
      phone: "0712345614",
      expect: "7e · ⛔ EXECUTED · a posted language counts only as exactly en / sw / zh — case, padding and free text are refused",
      impl: { ...REAL, rendered: (x) => String(x ?? "").toUpperCase() as MessagingLocale },
    },
    {
      name: "🔴 D2 · a registration site writes the literal \"SW\" again",
      phone: "0712345607",
      expect: "7c · ⛔ no registration site in auth-service writes a literal \"SW\" locale any more",
      impl: { ...REAL, sources: { ...REAL_SOURCES, authService: REAL_SOURCES.authService.replace("messagingLocaleOf(input.locale),", "\"SW\",") } },
    },
    {
      name: "OQ11 · the pinned list forgets a sentence the dictionary shows (the Chinese toggle)",
      phone: "0712345608",
      expect: "8 · ⭐ every consent sentence the dictionary shows today is pinned in consent-wording.ts (OQ11)",
      impl: { ...REAL, isPinned: (w) => isSmsConsentWording(w) && w !== marketingConsentWording("PROFILE", "ZH") },
    },
    {
      name: "OQ11 · any GIVEN row counts, whatever it says — the old 'product updates' wording qualifies again",
      phone: "0712345609",
      expect: "8c · ⛔ no pre-2026-09-26 sentence counts — 'product updates' / 'Product news' / 'Nipe matangazo' never named SMS",
      impl: { ...REAL, isPinned: () => true },
    },
    {
      name: "D1 · one consent point keeps its own noun — the Swahili toggle names SMS but is 'Habari za bidhaa' again",
      phone: "0712345610",
      expect: "8f · ⭐ ONE NAME — every consent point names the same sender, content and channel in its language (D1)",
      impl: {
        ...REAL,
        wording: (site, locale) => (site === "PROFILE" && locale === "SW"
          ? "Habari za bidhaa kwa SMS — Habari za 50pick mara kwa mara kwa SMS kwenye namba yako."
          : marketingConsentWording(site, locale)),
      },
    },
  ];

  for (const [i, c] of CASES.entries()) {
    pass = 0; fail = 0; failed.length = 0;
    const tag = `red${i + 1}:`;
    console.log(`── case ${i + 1}: ${c.name}`);
    await runAssertions(c.impl, c.phone, tag);
    const wanted = `${tag}${c.expect}`;
    if (fail === 0) problems.push(`case ${i + 1} (${c.name}): stayed GREEN`);
    else if (!failed.includes(wanted)) {
      problems.push(`case ${i + 1} (${c.name}): red, but not on "${c.expect}" — got ${failed.join(" | ")}`);
    } else {
      console.log(`   caught → ${c.expect}\n`);
    }
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
