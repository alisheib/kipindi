/**
 * THE PRIVACY NOTICE SAYS WHAT THE CODE DOES — `npm run test:privacy-notice` (in `predeploy`).
 *
 * ⭐ WHY IT EXISTS (2026-09-14, session 96, register E-404). The audit of the identity-at-withdrawal release left
 * Privacy §4 naming only the hosting providers while the code sends personal data to four more services, and §8
 * claiming "TLS 1.2+" and "AES-256 at rest in the database tier". A handshake test that morning found
 * www.50pick.tz accepting TLS 1.0 and 1.1, and no record in the repository establishes database-tier encryption.
 * §7 listed a "theme preference" cookie that no code writes. Privacy v2026-09-14.2 corrected all of it; this suite
 * keeps each statement tied to the thing that makes it true:
 *
 *   §1 · the version: one label in en/sw/zh, pinned WITH the English body's hash, and a dated
 *        COMPLIANCE-DECISIONS entry naming it — an English edit without a new version goes red.
 *   §2 · processors: every dependency that can carry personal data off the box is classified, and each one's
 *        processor is named in §4 of all three locales. A NEW dependency fails until someone classifies it.
 *        §2e does the same for the SMS providers `sms.ts` can select — reached by `fetch`, so no dependency shows them.
 *   §3 · security (§8): each claim is tied to the code that performs it; the retired claims may not return; the
 *        ISO 27001 / pentest sentence stays, because it rests on the owner's recorded attestation (2026-08-20).
 *   §4 · cookies (§7): a census of every cookie name the code writes, pinned; each is described in all three
 *        locales, with the session cap, the sign-out note's lifetime and the preview pass's hours read from the
 *        code, not retyped.
 *   §4h · zh typography: no space after full-width punctuation (a {" "} after "：" printed a gap in §1).
 *   §4j · v2026-10-07 · what erasure keeps, said publicly: §5's three bullets, §6's Erasure line, §9's two paragraphs,
 *        the note under "Erase my data" and the data-rights file's sentence, each PINNED WHOLE by hash in every language;
 *        and the record they state held to the code (erasure only unlinks it, nothing deletes it, DATA-RETENTION 7 years).
 *   §4k · v2026-10-07 · §9: referees named before REFEREE_PROMISE_REWORDED_IN keep "we never contact you for
 *        marketing"; those named after it are told management's two sentences — the stop sentence only while every offer
 *        carries its link. (§4i is the final-rule gate's own section; these two are named apart from it.)
 *
 * ⭐ U33p (2026-10-04) · THREE BULLETS ARE ADMIN-EDITED LINES NOW (`legal.policy_lines`): the §3 Consent bullet, a new §3
 * licence bullet, and the §4 Blackball bullet. The page wraps each in a `PolicyLine` element whose children are today's
 * literal bullet, printed until an admin saves the line. This suite reads the page with those tags stripped
 * (`scripts/lib/policy-line-source.mts`), so every check, every plant and the English hash pin read exactly the text the
 * page prints while nothing is saved — the pin holds untouched. A SAVED line is held to the same words at the save: the
 * §2e gateway facts (`SMS_GATEWAY_WORDS`), the §4d withdrawal path (`CONSENT_WITHDRAW_PATH`) and the §4f analytics words
 * (`ANALYTICS_CONSENT_WORDS`) are ONE table, exported by `src/lib/legal/policy-lines.ts` and imported here — the
 * validator and this guard can never be retyped apart (`test:policy-lines` L7 holds the imports).
 *
 * ⛔ The privacy page is inline JSX in one file, not dictionary-driven, so `test:i18n` sees none of it (the
 * 2026-08-20 COMPLIANCE-DECISIONS entry). `test:cert-d1` §2b keeps its older negatives; this suite is the gate.
 * ⛔ EVERY CHECK HAS A PLANTED CONTROL (§5): the defect it exists for, re-planted into a copy of today's files.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { stripPolicyLineTags } from "./lib/policy-line-source.mts";
import {
  ANALYTICS_CONSENT_WORDS, CONSENT_ONLY_CLAUSE, CONSENT_WITHDRAW_PATH, SMS_GATEWAY_WORDS, comparePolicyVersions, isPolicyVersion,
} from "../src/lib/legal/policy-lines.ts";
// §4j reads the note under "Erase my data" from the dictionary; §4k reads whether every offer carries its stop link, and
// the ONE constant §5 and §9 print as the referees' line.
import { dict } from "../src/lib/i18n-dict.ts";
import { OPTOUT_PATH, footerMeasurementToken, marketingFooter } from "../src/lib/marketing/footer.ts";
import { REFEREE_PROMISE_REWORDED_IN } from "../src/lib/legal/privacy-referees.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");

let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, why = "", evidence = "") => {
  cond ? pass++ : fail++;
  const tail = evidence ? ` — ${evidence}` : (!cond && why ? ` — ${why}` : "");
  console.log(`${cond ? "PASS" : "FAIL"} ${label}${tail}`);
};
/** Line comments first, then block comments — a glob such as "/admin/*" in a line comment must not open a block. */
const code = (src: string) => src.replace(/^[ \t]*\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");

/* ── The pinned facts. Moving any of these is a legal act: a dated COMPLIANCE-DECISIONS entry comes with it. ── */
const PRIVACY_VERSION = "2026-10-07";
/** sha256 (first 12 hex) of the ENGLISH content block, whitespace-collapsed. The English text is the binding one. */
const PRIVACY_EN_SHA = "11627fd5139d";
/** Every cookie name the code writes, as of v2026-09-30. A new one must be described in §7 first. */
const COOKIES = ["_ga", "_ga_W66WRL67MQ", "kp-density", "kp-kyc-notice", "kp-locale", "kp_admin_totp", "kp_pending_2fa", "kp_preview", "kp_revoked", "kp_session"];
// ⭐ `_ga` / `_ga_W66WRL67MQ` joined the census 2026-09-15.2: gtag.js SETS them, and our code EXPIRES them when consent is
// withdrawn (`google-tag.tsx` expireCookie) — a deletion is a write, so the census must see it; it is never spelled to dodge it.

const PAGE = "src/app/legal/privacy/page.tsx";
/** ⭐ U33p · read with the `PolicyLine` tags stripped — the text the page prints while no line is saved, byte for byte. */
const pageSrc = stripPolicyLineTags(read(PAGE));

type Loc = "en" | "sw" | "zh";
const LOCS: Loc[] = ["en", "sw", "zh"];

/** The three locale blocks of `content()`, cut at their own `  en: (` / `  sw: (` / `  zh: (` markers. */
function blocks(src: string): Record<Loc, string> {
  const iEn = src.indexOf("\n  en: (");
  const iSw = src.indexOf("\n  sw: (");
  const iZh = src.indexOf("\n  zh: (");
  const iEnd = src.indexOf("\n}; }", iZh);
  return {
    en: iEn >= 0 && iSw > iEn ? src.slice(iEn, iSw) : "",
    sw: iSw >= 0 && iZh > iSw ? src.slice(iSw, iZh) : "",
    zh: iZh >= 0 && iEnd > iZh ? src.slice(iZh, iEnd) : "",
  };
}
/** One numbered section of a locale block. */
function section(block: string, n: string): string {
  const m = block.match(new RegExp(`<LegalSection n="${n}"[\\s\\S]*?</LegalSection>`));
  return m ? m[0] : "";
}
const enSha = (src: string) => createHash("sha256").update(blocks(src).en.replace(/\s+/g, " ").trim()).digest("hex").slice(0, 12);

/* ════════════════════════════════════════════════════════════════════════════
 * §0 · CONTROLS — the readers can find things.
 * ══════════════════════════════════════════════════════════════════════════ */
console.log("\n§0 · controls");
const B = blocks(pageSrc);
ok("§0a the three locale blocks were cut and are non-trivial", LOCS.every((l) => B[l].length > 2000), "",
  LOCS.map((l) => `${l}=${B[l].length}`).join(" "));
ok("§0b every locale has sections 1-9", LOCS.every((l) => ["1", "2", "3", "4", "5", "6", "7", "8", "9"].every((n) => section(B[l], n).length > 0)));
ok("§0c the comment stripper keeps code after a glob in a line comment",
  code("// every /admin/* page\nconst kept = 1;").includes("const kept = 1;"));

/* ════════════════════════════════════════════════════════════════════════════
 * §1 · THE VERSION — one label, pinned with the English text, and recorded.
 * ══════════════════════════════════════════════════════════════════════════ */
console.log("\n§1 · the version moves with the English text, and has a compliance entry");
function versionDefects(src: string, decisions: string): string[] {
  const d: string[] = [];
  const en = src.match(/en: "Version ([0-9]{4}-[0-9]{2}-[0-9]{2}(?:\.[0-9]+)?) · /)?.[1];
  const sw = src.match(/sw: "Toleo ([0-9]{4}-[0-9]{2}-[0-9]{2}(?:\.[0-9]+)?) · /)?.[1];
  const zh = src.match(/zh: "版本 ([0-9]{4}-[0-9]{2}-[0-9]{2}(?:\.[0-9]+)?) · /)?.[1];
  if (!en || !sw || !zh) d.push(`a version line is missing (en=${en} sw=${sw} zh=${zh})`);
  else if (en !== sw || en !== zh) d.push(`the three version lines disagree (en=${en} sw=${sw} zh=${zh})`);
  if (en && en !== PRIVACY_VERSION) d.push(`the page prints ${en}, the pin is ${PRIVACY_VERSION}`);
  const sha = enSha(src);
  if (sha !== PRIVACY_EN_SHA) d.push(`the English text hashes to ${sha}, pinned ${PRIVACY_EN_SHA} — a changed English text needs a new version and a compliance entry`);
  if (!new RegExp(`^## [0-9-]+.*Privacy v${PRIVACY_VERSION.replace(/\./g, "\\.")}`, "m").test(decisions)) d.push(`COMPLIANCE-DECISIONS.md has no entry heading naming Privacy v${PRIVACY_VERSION}`);
  return d;
}
const decisionsSrc = read("docs/COMPLIANCE-DECISIONS.md");
ok("§1a the version is one label in en/sw/zh, equal to the pin, over the pinned English text, with its entry",
  versionDefects(pageSrc, decisionsSrc).length === 0, versionDefects(pageSrc, decisionsSrc).join("; "), `v${PRIVACY_VERSION} · en ${enSha(pageSrc)}`);

/* ════════════════════════════════════════════════════════════════════════════
 * §2 · PROCESSORS — every dependency that can carry personal data out is named in §4.
 * ══════════════════════════════════════════════════════════════════════════ */
console.log("\n§2 · every outbound dependency's processor is named in §4, in all three languages");
/** dependency → the words §4 must carry in EACH locale (brand names are not translated). */
const OUTBOUND: Record<string, Record<Loc, string[]>> = {
  postmark: { en: ["Postmark"], sw: ["Postmark"], zh: ["Postmark"] },
  "@anthropic-ai/sdk": { en: ["Anthropic", "50pick Help"], sw: ["Anthropic", "Msaada wa 50pick"], zh: ["Anthropic", "50pick 帮助"] },
  "@sentry/node": { en: ["Sentry"], sw: ["Sentry"], zh: ["Sentry"] },
  "web-push": { en: ["push service"], sw: ["huduma ya arifa"], zh: ["推送服务"] },
  "@aws-sdk/client-s3": { en: ["Cloudflare R2"], sw: ["Cloudflare R2"], zh: ["Cloudflare R2"] },
  "@prisma/client": { en: ["Railway"], sw: ["Railway"], zh: ["Railway"] },
  prisma: { en: ["Railway"], sw: ["Railway"], zh: ["Railway"] },
  ioredis: { en: ["Railway"], sw: ["Railway"], zh: ["Railway"] },
};
/** Dependencies that run on the box and send nothing anywhere. Classified by reading each, 2026-09-14. */
const LOCAL = new Set(["@next/swc-wasm-nodejs", "clsx", "exceljs", "lightweight-charts", "next", "pdfkit", "qrcode", "react", "react-dom", "tailwind-merge", "zod"]);
function processorDefects(src: string, deps: string[]): string[] {
  const d: string[] = [];
  const bl = blocks(src);
  for (const dep of deps) {
    if (LOCAL.has(dep)) continue;
    const need = OUTBOUND[dep];
    if (!need) { d.push(`dependency "${dep}" is unclassified: does it send personal data off the box? add it to OUTBOUND (and name its processor in §4) or to LOCAL`); continue; }
    for (const l of LOCS) for (const w of need[l]) if (!section(bl[l], "4").includes(w)) d.push(`${l} §4 does not name "${w}" (${dep})`);
  }
  // The proxy in front of the canonical host is infrastructure, not a dependency — measured 2026-09-14 (server: cloudflare).
  for (const l of LOCS) if (!section(bl[l], "4").includes("www.50pick.tz")) d.push(`${l} §4 does not name Cloudflare's network in front of www.50pick.tz`);
  return d;
}
const pkg = JSON.parse(read("package.json")) as { dependencies: Record<string, string> };
const deps = Object.keys(pkg.dependencies);
ok("§2a every dependency is classified, and every outbound one's processor is named in en/sw/zh §4",
  processorDefects(pageSrc, deps).length === 0, processorDefects(pageSrc, deps).join("; "), `${deps.length} dependencies`);
// Each OUTBOUND entry must be LIVE in the code, or it is a claim about a dependency nobody uses.
const emailSrc = code(read("src/lib/server/email.ts"));
const chatSrc = code(read("src/app/_actions/chat.ts"));
const monitoringSrc = code(read("src/lib/server/monitoring.ts"));
ok("§2b the witnesses are real: Postmark sends with open and click tracking, the chat calls Anthropic, Sentry scrubs before send",
  /from "postmark"/.test(emailSrc) && /TrackOpens: true/.test(emailSrc)
  && /import\("@anthropic-ai\/sdk"\)/.test(chatSrc)
  && /beforeSend: \(event: unknown\) => scrubEvent\(event\)/.test(monitoringSrc) && /\["@sentry", "node"\]/.test(monitoringSrc));
ok("§2c the chat sends the conversation and no account data (the §4 sentence's premise)",
  /system: buildSystemPrompt\(locale, \(await getGlobalConfig\(\)\)\.objectionWindowHours\)/.test(chatSrc)
  && /\.\.\.history\.slice\(-10\)/.test(chatSrc));
ok("§2d the scrub removes what §4 says it removes — Tanzanian mobile numbers, 12+ digit numbers, email addresses",
  /\.replace\(\/\(\?:\\\+\?255\|0\)7\\d\{8\}\/g, "<msisdn>"\)/.test(monitoringSrc)
  && /\.replace\(\/\\b\\d\{12,\}\\b\/g, "<digits>"\)/.test(monitoringSrc)
  && /"<email>"\)/.test(monitoringSrc));

/* ════════════════════════════════════════════════════════════════════════════
 * §2e · THE SMS GATEWAY — v2026-09-26. Blackball is reached by `fetch`, not by an npm dependency, so §2a's census of
 * `package.json` cannot see it: it carried every SMS from 2026-09-16 while §4 named it nowhere. The population is
 * the provider union in `sms.ts`; every real provider (the `console` stub delivers nothing) must be named in §4.
 * ══════════════════════════════════════════════════════════════════════════ */
console.log("\n§2e · every SMS provider the code can select is named in §4, with what it receives");
const SMS_STUBS = new Set(["console"]);
/** provider id → the words §4 must carry in EACH locale: the name, the role, what it receives, and that marketing needs consent. */
const SMS_WORDS: Record<string, Record<Loc, string[]>> = {
  // ⭐ U33p · the gateway's facts are the policy-line validator's own table (a SAVED Blackball line must keep them); the
  // consent-only clause is today's promise — required of the page as it prints until a save, and the very words licence
  // outreach may not open beside (spec §5.3). Same strings as before, read from one home.
  blackball: {
    en: [...SMS_GATEWAY_WORDS.en, CONSENT_ONLY_CLAUSE.en],
    sw: [...SMS_GATEWAY_WORDS.sw, CONSENT_ONLY_CLAUSE.sw],
    zh: [...SMS_GATEWAY_WORDS.zh, CONSENT_ONLY_CLAUSE.zh],
  },
};
const smsProviders = (sms: string) =>
  [...(sms.match(/export type SmsProviderId = ([^;]+);/)?.[1] ?? "").matchAll(/"([a-z0-9_-]+)"/g)].map((m) => m[1]);
function smsDefects(src: string, sms: string, transport: string, receiptRoute: boolean): string[] {
  const d: string[] = [];
  const bl = blocks(src);
  const ids = smsProviders(sms);
  if (ids.length === 0) d.push("the SmsProviderId union in sms.ts was not read");
  for (const id of ids) {
    if (SMS_STUBS.has(id)) continue;
    const words = SMS_WORDS[id];
    if (!words) { d.push(`SMS provider "${id}" is unclassified: name its gateway in §4 (all three languages), then add it to SMS_WORDS`); continue; }
    for (const l of LOCS) for (const w of words[l]) if (!section(bl[l], "4").includes(w)) d.push(`${l} §4 does not say "${w}" (SMS provider ${id})`);
  }
  // The witnesses behind the sentence: what the request carries, and the receipt that reports delivery.
  if (ids.includes("blackball")) {
    if (!/text: m\.text,/.test(transport) || !/msisdn: toMsisdn255\(m\.msisdn\),/.test(transport)) d.push("sms-blackball.ts no longer sends { text, msisdn } — §4 says the gateway receives the phone number and the message text");
    if (!receiptRoute) d.push("the Blackball delivery-receipt route is gone — §4 says the gateway tells us whether each message was delivered");
  }
  return d;
}
const smsSrc = code(read("src/lib/server/sms.ts"));
const smsTransportSrc = code(read("src/lib/server/sms-blackball.ts"));
const smsReceiptRoute = existsSync(join(ROOT, "src/app/api/webhooks/blackball/route.ts"));
ok("§2e every SMS provider sms.ts can select is named in en/sw/zh §4 with what it receives, and the transport sends exactly that",
  smsDefects(pageSrc, smsSrc, smsTransportSrc, smsReceiptRoute).length === 0,
  smsDefects(pageSrc, smsSrc, smsTransportSrc, smsReceiptRoute).join("; "), smsProviders(smsSrc).join(" "));

/* ════════════════════════════════════════════════════════════════════════════
 * §3 · SECURITY (§8) — each claim tied to the code that performs it; the retired claims stay retired.
 * ══════════════════════════════════════════════════════════════════════════ */
console.log("\n§3 · §8 states only what the code does");
const cryptoSrc = code(read("src/lib/server/crypto.ts"));
const totpSrc = code(read("src/lib/server/totp.ts"));
const backupSrc = code(read("src/lib/server/backup/core.ts"));
const proxySrc = code(read("src/proxy.ts"));
const RETIRED: Record<Loc, RegExp[]> = {
  en: [/TLS 1\.2/, /1\.2\+/, /database tier/i, /SP 800-132/, /theme preference/i],
  sw: [/TLS 1\.2/, /1\.2\+/, /tabaka la hifadhidata/i, /SP 800-132/, /mandhari/i],
  zh: [/TLS 1\.2/, /1\.2\+/, /数据库层/, /SP 800-132/, /主题偏好/],
};
function securityDefects(src: string): string[] {
  const d: string[] = [];
  const bl = blocks(src);
  for (const l of LOCS) {
    const s7 = section(bl[l], "7");
    const s8 = section(bl[l], "8");
    for (const re of RETIRED[l]) if (re.test(s7) || re.test(s8)) d.push(`${l} §7/§8 carries a retired claim ${re}`);
    if (!/HMAC-SHA-256/.test(s8)) d.push(`${l} §8 lost the session-signing sentence`);
    if ((s8.match(/scrypt/g) ?? []).length < 2) d.push(`${l} §8 lost scrypt (OTP and passwords)`);
    if ((s8.match(/AES-256-GCM/g) ?? []).length !== 2) d.push(`${l} §8 does not state AES-256-GCM exactly twice (two-factor keys, backups)`);
    if (!/TLS \(HTTPS\)|TLS（HTTPS）/.test(s8)) d.push(`${l} §8 does not say connections use TLS (HTTPS)`);
    if (!/ISO 27001/.test(s8)) d.push(`${l} §8 dropped the ISO 27001 / pentest sentence (the owner's attestation, 2026-08-20)`);
  }
  return d;
}
ok("§3a en/sw/zh §8 carry the true claims and none of the retired ones", securityDefects(pageSrc).length === 0, securityDefects(pageSrc).join("; "));
ok("§3b the code behind §8: HMAC-SHA-256 sessions, scrypt passwords and OTPs, AES-256-GCM two-factor keys and backups, HSTS",
  /createHmac\("sha256", sessionSecret\(\)\)/.test(cryptoSrc)
  && /export async function hashPassword[\s\S]{0,300}scryptAsync\(/.test(cryptoSrc)
  && /export async function hashOtp[\s\S]{0,200}scryptAsync\(`\$\{otpPepper\(\)\}:\$\{code\}`, salt, 32\)/.test(cryptoSrc)
  && /createCipheriv\("aes-256-gcm", encKey\(\), iv\)/.test(cryptoSrc) && /encryptSecret\(/.test(totpSrc)
  && /createCipheriv\("aes-256-gcm", deriveKey\(passphrase, salt\), iv\)/.test(backupSrc)
  && /"Strict-Transport-Security": "max-age=\d+; includeSubDomains; preload"/.test(proxySrc));
ok("§3c the ISO 27001 / pentest sentence still rests on a recorded attestation",
  /### The ISO 27001 \/ penetration-testing claim — Ali's attestation, recorded/.test(decisionsSrc));

/* ════════════════════════════════════════════════════════════════════════════
 * §4 · COOKIES (§7) — a census of what the code writes, each described in all three locales.
 * ══════════════════════════════════════════════════════════════════════════ */
console.log("\n§4 · every cookie the code writes is described in §7, with its lifetime read from the code");
function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) { if (name !== "node_modules" && name !== "dev-test") walk(p, out); }
    else if (/\.(ts|tsx)$/.test(name)) out.push(p);
  }
  return out;
}
/** Cookie names WRITTEN: a literal first argument of a `.set(` on a cookie jar, or a constant used that way, or a
 *  `document.cookie = \`${CONST}=` write. Constants are resolved across files by name (they are exported or local). */
function cookieCensus(files: Array<{ path: string; src: string }>): string[] {
  const constants = new Map<string, string>();
  for (const f of files) for (const m of code(f.src).matchAll(/(?:export )?const ([A-Z0-9_]*COOKIE[A-Z0-9_]*) = "([^"]+)"/g)) constants.set(m[1], m[2]);
  const names = new Set<string>();
  for (const f of files) {
    const c = code(f.src);
    const rel = relative(ROOT, f.path);
    const resolve = (ident: string) => c.match(new RegExp(`const ${ident} = "([^"]+)"`))?.[1] ?? constants.get(ident);
    for (const m of c.matchAll(/\b(?:jar|cookies\(\)|res\.cookies|response\.cookies|cookieStore)\.set\(\s*(?:"([^"]+)"|([A-Z_][A-Z0-9_]*))\s*,/g)) {
      names.add(m[1] ?? resolve(m[2] ?? "") ?? `<unresolved ${m[2]} in ${rel}>`);
    }
    for (const m of c.matchAll(/document\.cookie\s*=\s*`\$\{([A-Za-z_][A-Za-z0-9_]*)\}=/g)) {
      const ident = m[1];
      const direct = resolve(ident);
      if (direct) { names.add(direct); continue; }
      // A helper's PARAMETER (`function writeCookie(name, value) { document.cookie = \`${name}=…` }): resolve it
      // through that helper's call sites in the same file — the helper is the nearest function declared before the write.
      const fn = [...c.slice(0, m.index).matchAll(/function ([A-Za-z_][A-Za-z0-9_]*)\(([^)]*)\)/g)].pop();
      const isParam = !!fn && fn[2].split(",").some((p) => p.trim().split(/[\s:?=]/)[0] === ident);
      const calls = isParam ? [...c.matchAll(new RegExp(`\\b${fn![1]}\\(\\s*(?:"([^"]+)"|([A-Z_][A-Z0-9_]*))\\s*,`, "g"))] : [];
      if (calls.length === 0) { names.add(`<unresolved ${ident} in ${rel}>`); continue; }
      for (const k of calls) names.add(k[1] ?? resolve(k[2] ?? "") ?? `<unresolved ${k[2]} in ${rel}>`);
    }
    for (const m of c.matchAll(/document\.cookie\s*=\s*`([a-z][a-z0-9_-]*)=/g)) names.add(m[1]);
  }
  return [...names].sort();
}
const srcFiles = walk(join(ROOT, "src")).map((p) => ({ path: p, src: readFileSync(p, "utf8") }));
const census = cookieCensus(srcFiles);
ok("§4a the cookies the code writes are exactly the pinned set", JSON.stringify(census) === JSON.stringify(COOKIES),
  `found ${JSON.stringify(census)} — describe any new cookie in Privacy §7 (all three languages), move the version, then the pin`,
  census.join(" "));
const sessionSrc = code(read("src/lib/server/session.ts"));
const ttlDays = Number(sessionSrc.match(/const SESSION_TTL_MS = (\d+) \* 24 \* 60 \* 60 \* 1000;/)?.[1]);
// E-381 (2026-09-14): the sign-out note is written by `/auth/session-ended`, the one place a dead session cookie is cleared.
const revokedSecs = Number(code(read("src/app/auth/session-ended/route.ts")).match(/res\.cookies\.set\("kp_revoked", "1", \{[\s\S]{0,120}?maxAge: (\d+),/)?.[1]);
ok("§4b the session cap and the sign-out note's lifetime were read from the code", ttlDays > 0 && revokedSecs > 0, "", `${ttlDays} days · ${revokedSecs} s`);
// v2026-09-30 (the Vodacom plan S1, ruling SJ-23): the preview pass's longest life, stated in §7 in words. A pass is
// capped at this in `mintPreviewPass`, so a longer one in code alone is a §7 that no longer says what is set.
const previewHours = Number(code(read("src/lib/server/journey-preview.ts")).match(/export const PREVIEW_PASS_HOURS = (\d+);/)?.[1]);
ok("§4b the preview pass's longest life was read from the code, and is at most a day", previewHours >= 1 && previewHours <= 24, "",
  `${previewHours} hours`);
/** What §7 must say about each cookie, per locale. */
const COOKIE_WORDS: Record<string, Record<Loc, string[]>> = {
  kp_session: { en: ["sign-in session", `${ttlDays} days`], sw: ["kipindi chako cha kuingia", `siku ${ttlDays}`], zh: ["登录会话", `${ttlDays} 天`] },
  "kp-locale": { en: ["your language"], sw: ["lugha yako"], zh: ["您的语言"] },
  // v2026-09-22 (Mobile Visual Plan U2, approved by Ali 2026-09-22): the phone card-spacing choice, `src/lib/card-spacing.ts`.
  "kp-density": { en: ["card spacing"], sw: ["nafasi ya kadi"], zh: ["卡片间距"] },
  kp_revoked: { en: [`${revokedSecs} seconds`, "signed out"], sw: [`sekunde ${revokedSecs}`, "ulitolewa kwenye akaunti"], zh: [`${revokedSecs} 秒`, "退出登录"] },
  "kp-kyc-notice": { en: ["identity notice"], sw: ["taarifa ya utambulisho"], zh: ["身份提示"] },
  kp_admin_totp: { en: ["staff accounts only", "two-factor"], sw: ["wafanyakazi pekee", "hatua mbili"], zh: ["仅限员工账户", "双重验证"] },
  kp_pending_2fa: { en: ["staff accounts only", "two-factor"], sw: ["wafanyakazi pekee", "hatua mbili"], zh: ["仅限员工账户", "双重验证"] },
  // v2026-09-30 (the Vodacom plan S1, ruling SJ-23): the preview pass, `src/lib/server/journey-preview.ts` — a staff
  // member's own preview, or a preview link the Owner issued; its hours are read from PREVIEW_PASS_HOURS above.
  kp_preview: {
    en: ["kp_preview", "preview of pages not yet launched", "preview link", `at most ${previewHours} hours`],
    sw: ["kp_preview", "onyesho la awali", "kiungo cha onyesho la awali", `si zaidi ya saa ${previewHours}`],
    zh: ["kp_preview", "预览", "预览链接", `最长 ${previewHours} 小时`],
  },
  _ga: { en: ["_ga", "turning analytics off deletes them"], sw: ["_ga", "kuzima takwimu huvifuta"], zh: ["_ga", "关闭分析会将其删除"] },
  _ga_W66WRL67MQ: { en: ["_ga_W66WRL67MQ", "turning analytics off deletes them"], sw: ["_ga_W66WRL67MQ", "kuzima takwimu huvifuta"], zh: ["_ga_W66WRL67MQ", "关闭分析会将其删除"] },
};
function cookieDefects(src: string): string[] {
  const d: string[] = [];
  const bl = blocks(src);
  for (const name of COOKIES) {
    const words = COOKIE_WORDS[name];
    if (!words) { d.push(`no §7 wording is defined for ${name}`); continue; }
    for (const l of LOCS) for (const w of words[l]) if (!section(bl[l], "7").includes(w)) d.push(`${l} §7 does not say "${w}" (${name})`);
  }
  return d;
}
ok("§4c each cookie is described in en/sw/zh §7, with the lifetimes the code sets", cookieDefects(pageSrc).length === 0, cookieDefects(pageSrc).join("; "));

/* ════════════════════════════════════════════════════════════════════════════
 * §4d · SHARING, RETENTION AND CONSENT — v2026-09-14.3 (session 97, register E-409). Each statement tied to its witness.
 * ══════════════════════════════════════════════════════════════════════════ */
console.log("\n§4d · §3 consent, §4 payment gateway, §5 retention — each tied to the code");
const paymentsSrc = code(read("src/lib/server/payments.ts"));
const retentionSrc = code(read("src/lib/server/retention.ts"));
const CONSENT_ACTION = "src/app/profile/notifications/actions.ts";
const consentSrc = existsSync(join(ROOT, CONSENT_ACTION)) ? code(read(CONSENT_ACTION)) : "";
/** What the notice may no longer say, per locale — each was false against the code on 2026-09-14. */
const RETIRED_FACTS: Record<Loc, string[]> = {
  en: ["Source registry partners", "2 years of inactivity", "opt out of profiling for marketing", "(revocable any time)"],
  sw: ["Washirika wa rejista za chanzo", "miaka 2 ya kutokuwa na shughuli", "kujitoa kwenye uchambuzi wa wasifu kwa ajili ya matangazo", "(yanaweza kufutwa wakati wowote)"],
  zh: ["来源登记合作方", "连续 2 年无活动", "选择退出用于营销的画像分析", "（可随时撤回）"],
};
/** ⭐ U33p · the policy-line validator's own table — a SAVED Consent bullet must keep it too. */
const CONSENT_PATH: Record<Loc, string> = { ...CONSENT_WITHDRAW_PATH };
function factDefects(src: string, payments: string, consent: string): string[] {
  const d: string[] = [];
  const bl = blocks(src);
  const azampayStub = /name:\s*"azampay"[\s\S]{0,200}?NOT_WIRED\("azampay"\)/.test(payments);
  for (const l of LOCS) {
    if (azampayStub && section(bl[l], "4").includes("Azampay")) d.push(`${l} §4 names Azampay, whose adapter throws NOT_WIRED — nothing is sent to it`);
    if (!section(bl[l], "4").includes("Selcom")) d.push(`${l} §4 does not name Selcom, the wired payment gateway`);
    for (const w of RETIRED_FACTS[l]) if (bl[l].includes(w)) d.push(`${l} carries the retired statement "${w}"`);
    if (section(bl[l], "3").includes(CONSENT_PATH[l]) !== true) d.push(`${l} §3 does not say where consent is withdrawn ("${CONSENT_PATH[l]}")`);
  }
  // §5's 2-year lapse is true only while the daily retention pass enforces it.
  if (LOCS.some((l) => /2 years pass without you signing in|miaka 2 ipite bila kuingia|连续 2 年未登录/.test(section(bl[l], "5")))
      && (!/MARKETING_CONSENT_LAPSE_DAYS = 730;/.test(retentionSrc) || !/expireMarketingConsent\(/.test(retentionSrc))) {
    d.push("§5 states a 2-year marketing-consent lapse that retention.ts does not enforce (MARKETING_CONSENT_LAPSE_DAYS = 730, expireMarketingConsent)");
  }
  // The place §3 names must exist and must really write the flag, on the player's own session, audited.
  if (!/export async function setMarketingConsentAction/.test(consent) || !/marketingOptIn:\s*next/.test(consent)
      || !/currentSession\(\)/.test(consent) || !/privacy\.marketing_consent\./.test(consent)) {
    d.push(`${CONSENT_ACTION} does not provide the consent control §3 promises (session, marketingOptIn write, audit)`);
  }
  return d;
}
ok("§4d en/sw/zh §3/§4/§5 say only what the code does: Selcom named, no unwired Azampay, no retired statement, consent withdrawable where it says",
  factDefects(pageSrc, paymentsSrc, consentSrc).length === 0, factDefects(pageSrc, paymentsSrc, consentSrc).join("; "));

/* ════════════════════════════════════════════════════════════════════════════
 * §4e · THIRD-PARTY SCRIPTS — v2026-09-15. The §4a cookie census reads only what OUR code writes; a script
 * loaded from another host writes its own cookies and sends its own hits, and no census of `src/` sees them.
 * The population that cannot lie is the CSP: a browser runs and connects to nothing it does not list. So every
 * external host in the CSP is classified, and the analytics one is tied to its notice clauses.
 * ══════════════════════════════════════════════════════════════════════════ */
console.log("\n§4e · every external host the CSP admits is classified; Google Analytics is described as it runs");
const gaLib = read("src/lib/google-tag.ts");
const gaComponent = code(read("src/components/analytics/google-tag.tsx"));
const layoutSrc = code(read("src/app/layout.tsx"));
/** CSP host → what it is. `analytics` hosts require the §4/§7 Google Analytics clauses.
 *  ⛔ Google Fonts was here until 2026-09-15 and is deliberately gone: the families are self-hosted, and a font CDN
 *  coming back must be classified (and named in §4) before it can pass. */
const CSP_HOSTS: Record<string, "analytics"> = {
  "https://*.googletagmanager.com": "analytics",
  "https://*.google-analytics.com": "analytics",
  "https://*.analytics.google.com": "analytics",
};
function cspHosts(proxy: string): string[] {
  const consts = new Map<string, string>();
  for (const m of proxy.matchAll(/const ([A-Z_]+) = "([^"]*)";/g)) consts.set(m[1], m[2]);
  const start = proxy.indexOf("const CSP_BASE = [");
  const body = start >= 0 ? proxy.slice(start, proxy.indexOf("];", start)) : "";
  const expanded = body.replace(/\$\{([A-Z_]+)\}/g, (_, k: string) => consts.get(k) ?? `<unresolved ${k}>`);
  return [...new Set(expanded.match(/https:\/\/[^\s"'`;]+|<unresolved [A-Z_]+>/g) ?? [])].sort();
}
/** The id and the cookie lifetime are READ from the library passed in — never retyped — so a lifetime changed in
 *  code alone is a missing sentence in §7. */
const gaId = (lib: string) => lib.match(/export const GA_MEASUREMENT_ID = "(G-[A-Z0-9]+)";/)?.[1] ?? "<no id>";
const gaDays = (lib: string) => Number(lib.match(/export const GA_COOKIE_DAYS = (\d+);/)?.[1]);
function gaWords(lib: string): Record<Loc, { s4: string[]; s7: string[] }> {
  const cookie = `_ga_${gaId(lib).slice(2)}`, days = gaDays(lib);
  return {
    en: { s4: ["Google Analytics", "not used for advertising", "staff pages", "password-reset", "email-verification", "agent-invitation"], s7: ["_ga", cookie, `${days} days`, "No advertising cookies"] },
    sw: { s4: ["Google Analytics", "haitumiki kwa matangazo", "kurasa za wafanyakazi", "kubadilisha nenosiri", "kuthibitisha barua pepe", "mwaliko wa wakala"], s7: ["_ga", cookie, `siku ${days}`, "Hakuna vidakuzi vya matangazo"] },
    zh: { s4: ["Google Analytics", "不用于广告", "员工页面", "重置密码", "验证邮箱", "代理邀请"], s7: ["_ga", cookie, `${days} 天`, "不使用任何广告 cookie"] },
  };
}
const RETIRED_COOKIE_CLAIM: Record<Loc, string> = {
  en: "No third-party advertising or tracking cookies",
  sw: "Hakuna vidakuzi vya matangazo au ufuatiliaji vya watu wengine",
  zh: "不使用任何第三方广告或追踪 cookie",
};
function thirdPartyDefects(src: string, proxy: string, lib: string, component: string, layout: string): string[] {
  const d: string[] = [];
  const bl = blocks(src);
  const hosts = cspHosts(proxy);
  for (const h of hosts) if (!CSP_HOSTS[h]) d.push(`CSP admits "${h}", which is unclassified: what does it receive? classify it here and name it in §4`);
  const analyticsLive = hosts.some((h) => CSP_HOSTS[h] === "analytics") || /<GoogleTag \/>/.test(layout);
  const words = gaWords(lib);
  if (analyticsLive && !(gaDays(lib) > 0 && gaDays(lib) <= 400)) d.push(`GA_COOKIE_DAYS is ${gaDays(lib)} — unreadable, or above the 400 days a browser will keep a cookie`);
  for (const l of LOCS) {
    if (bl[l].includes(RETIRED_COOKIE_CLAIM[l]) && analyticsLive) d.push(`${l} §7 still says there are no third-party tracking cookies`);
    if (!analyticsLive) continue;
    for (const w of words[l].s4) if (!section(bl[l], "4").includes(w)) d.push(`${l} §4 does not say "${w}" (Google Analytics)`);
    for (const w of words[l].s7) if (!section(bl[l], "7").includes(w)) d.push(`${l} §7 does not say "${w}" (Google Analytics cookies)`);
  }
  if (!analyticsLive) return d;
  // The witnesses behind the clauses — each is a sentence of §4 or §7.
  if (!/<GoogleTag \/>/.test(layout)) d.push("CSP admits Google Analytics but the root layout does not mount <GoogleTag />");
  if (!/cookie_expires: GA_COOKIE_EXPIRES_SECONDS/.test(component) || !/GA_COOKIE_EXPIRES_SECONDS = GA_COOKIE_DAYS \* 24 \* 60 \* 60/.test(lib)) d.push("§7's cookie lifetime is not what the tag is configured with");
  if (!/send_page_view: false/.test(component)) d.push("the automatic page view is on — it sends the raw address (§4 'identifying part removed')");
  for (const k of ["ad_storage", "ad_user_data", "ad_personalization"]) if (!new RegExp(`${k}: "denied"`).test(component)) d.push(`${k} is not denied (§4 'not used for advertising')`);
  if (!/allow_google_signals: false/.test(component) || !/allow_ad_personalization_signals: false/.test(component)) d.push("Google signals or ad personalisation is on (§4 'not used for advertising')");
  if (!/w\[DISABLE_KEY\] = !allowed;/.test(component)) d.push("the ga-disable switch is not set on every route (§4 'does not run on staff pages')");
  for (const p of ["/admin", "/auth/reset-password", "/auth/verify-email", "/agent/invite"]) if (!lib.includes(`"${p}",`)) d.push(`GA_EXCLUDED_PREFIXES lost "${p}" (§4)`);
  // §4 "with any part that could identify you removed" is true ON THE WIRE only while the transport guard is
  // installed before gtag.js loads — gtag's own history page views use the raw address (driven 2026-09-15).
  const guardAt = component.indexOf("installTransportGuard(w);");
  const loadAt = component.indexOf("document.head.appendChild(script)");
  if (guardAt < 0 || loadAt < 0 || guardAt > loadAt) d.push("the transport guard is not installed before gtag.js loads — gtag's history page views would send the raw address (§4)");
  if (!/\[GA_VIEW_MARK\]: "1"/.test(component)) d.push("our page views do not carry GA_VIEW_MARK — the guard would drop every page view");
  if (!/en === "page_view" && p\.get\(`ep\.\$\{GA_VIEW_MARK\}`\) === null/.test(lib)) d.push("gaScrubHit no longer drops unmarked page views (§4)");
  const imgSrc = (proxy.match(/"img-src [^"]*"|`img-src [^`]*`/)?.[0] ?? "");
  if (/google|GA_HOSTS/.test(imgSrc)) d.push(`CSP img-src admits an analytics host (${imgSrc}) — the image fallback bypasses the transport guard`);
  return d;
}
ok("§4e every CSP host is classified, and en/sw/zh §4/§7 describe Google Analytics as the code configures it",
  thirdPartyDefects(pageSrc, read("src/proxy.ts"), gaLib, gaComponent, layoutSrc).length === 0,
  thirdPartyDefects(pageSrc, read("src/proxy.ts"), gaLib, gaComponent, layoutSrc).join("; "),
  `${cspHosts(read("src/proxy.ts")).length} external hosts · ${gaId(gaLib)} · ${gaDays(gaLib)} days`);

/* ════════════════════════════════════════════════════════════════════════════
 * §5 · PLANTED CONTROLS — the defects this suite exists for, re-planted into copies. Each MUST be reported.
 * ══════════════════════════════════════════════════════════════════════════ */
console.log("\n§5 · planted controls");
const plantTls = pageSrc.replace("Connections to our website and app are encrypted in transit with TLS (HTTPS).", "All data in transit over TLS 1.2+.");
const plantProcessor = pageSrc.replace("<li>Postmark, nchini Marekani,", "<li>Huduma ya barua pepe, nchini Marekani,");
const plantTheme = pageSrc.replace("your language, a note kept", "theme preference, your language, a note kept");
const plantWord = pageSrc.replace("We never sell personal data.", "We do not sell personal data.");
// ⭐ Derived from the pin, so moving PRIVACY_VERSION at integration moves this plant with it.
const plantVersion = pageSrc.replace(`sw: "Toleo ${PRIVACY_VERSION} ·`, 'sw: "Toleo 2026-09-26 ·');
ok("§5a control · each planted copy found its target",
  [plantTls, plantProcessor, plantTheme, plantWord, plantVersion].every((p) => p !== pageSrc));
ok("§5b control · a restored 'TLS 1.2+' is reported", securityDefects(plantTls).length > 0 && versionDefects(plantTls, decisionsSrc).length > 0,
  "", securityDefects(plantTls).join("; "));
ok("§5c control · a processor dropped from ONE locale is reported", processorDefects(plantProcessor, deps).length > 0,
  "", processorDefects(plantProcessor, deps).join("; "));
ok("§5d control · a restored theme cookie is reported", securityDefects(plantTheme).length > 0, "", securityDefects(plantTheme).join("; "));
ok("§5e control · a one-word English change without a new version is reported", versionDefects(plantWord, decisionsSrc).length > 0,
  "", versionDefects(plantWord, decisionsSrc).join("; "));
ok("§5f control · a locale that kept the old version label is reported", versionDefects(plantVersion, decisionsSrc).length > 0,
  "", versionDefects(plantVersion, decisionsSrc).join("; "));
ok("§5g control · an unclassified new dependency is reported", processorDefects(pageSrc, [...deps, "resend"]).length > 0,
  "", processorDefects(pageSrc, [...deps, "resend"]).join("; "));
const plantedCookieFile = { path: join(ROOT, "src/planted.ts"), src: 'const X = 1;\nexport function f(jar: any) { jar.set("kp_theme", "dark", { path: "/" }); }\n' };
ok("§5h control · a new cookie write is caught by the census", !cookieCensus([...srcFiles, plantedCookieFile]).every((n) => COOKIES.includes(n)),
  "", JSON.stringify(cookieCensus([...srcFiles, plantedCookieFile]).filter((n) => !COOKIES.includes(n))));
ok("§5i control · a compliance log without the version's entry is reported", versionDefects(pageSrc, "# empty\n").length > 0);
// §4c's v2026-09-30 row: the preview cookie's name dropped from ONE locale, and ONE locale stating a longer life.
const plantPreviewSw = pageSrc.replace("kilichosainiwa, kp_preview, huwekwa", "kilichosainiwa, huwekwa");
const plantPreviewZh = pageSrc.replace("有效期最长 24 小时", "有效期最长 7 天");
ok("§5an control · the preview cookie unnamed in ONE locale (sw) is reported",
  plantPreviewSw !== pageSrc && cookieDefects(plantPreviewSw).some((x) => x.startsWith("sw §7") && x.includes("(kp_preview)")),
  "", cookieDefects(plantPreviewSw).join("; "));
ok("§5ao control · a preview cookie life other than the code's in ONE locale (zh) is reported",
  plantPreviewZh !== pageSrc && cookieDefects(plantPreviewZh).some((x) => x.startsWith("zh §7") && x.includes(`${previewHours} 小时`)),
  "", cookieDefects(plantPreviewZh).join("; "));
const plantAzampay = pageSrc.replace("<li>Selcom，我们的支付网关", "<li>Selcom 或 Azampay，我们的支付网关");
const plantRetired = pageSrc.replace("Marketing consent: until you withdraw it, close your account, or 2 years pass without you signing in", "Marketing preferences: until withdrawn or 2 years of inactivity");
ok("§5j control · planted §4/§5 copies found their targets", plantAzampay !== pageSrc && plantRetired !== pageSrc);
ok("§5k control · Azampay restored to ONE locale is reported", factDefects(plantAzampay, paymentsSrc, consentSrc).some((x) => x.startsWith("zh §4 names Azampay")));
ok("§5l control · the retired marketing retention is reported", factDefects(plantRetired, paymentsSrc, consentSrc).some((x) => x.includes("2 years of inactivity")));
ok("§5m control · a consent promise with no control behind it is reported", factDefects(pageSrc, paymentsSrc, "").some((x) => x.includes("consent control")));

const proxyRaw = read("src/proxy.ts");
const plantHost = proxyRaw.replace(`"connect-src 'self' ws: wss: \${GA_HOSTS_CONNECT}"`, `"connect-src 'self' ws: wss: \${GA_HOSTS_CONNECT} https://connect.facebook.net"`)
  .replace("`connect-src 'self' ws: wss: ${GA_HOSTS_CONNECT}`", "`connect-src 'self' ws: wss: ${GA_HOSTS_CONNECT} https://connect.facebook.net`");
const plantGaSw = pageSrc.replace("<li>Google Analytics, inayoendeshwa na Google,", "<li>Huduma ya takwimu, inayoendeshwa na Google,");
const plantDays = gaLib.replace("export const GA_COOKIE_DAYS = 395;", "export const GA_COOKIE_DAYS = 730;");
const plantAds = gaComponent.replace('ad_storage: "denied"', 'ad_storage: "granted"');
const plantExcl = gaLib.replace('  "/admin",', "");
const plantRetiredClaim = pageSrc.replace("No advertising cookies.", "No third-party advertising or tracking cookies.");
ok("§5n control · planted §4e copies found their targets",
  [plantHost !== proxyRaw, plantGaSw !== pageSrc, plantDays !== gaLib, plantAds !== gaComponent, plantExcl !== gaLib, plantRetiredClaim !== pageSrc].every(Boolean));
ok("§5o control · a new external host in the CSP is reported", thirdPartyDefects(pageSrc, plantHost, gaLib, gaComponent, layoutSrc).some((x) => x.includes("connect.facebook.net")));
ok("§5p control · Google Analytics dropped from ONE locale's §4 is reported", thirdPartyDefects(plantGaSw, proxyRaw, gaLib, gaComponent, layoutSrc).some((x) => x.startsWith("sw §4")));
ok("§5q control · a cookie lifetime changed in code only is reported (and 730 days is past the browser cap)",
  thirdPartyDefects(pageSrc, proxyRaw, plantDays, gaComponent, layoutSrc).some((x) => x.includes('"730 days"'))
  && thirdPartyDefects(pageSrc, proxyRaw, plantDays, gaComponent, layoutSrc).some((x) => x.includes("400 days")),
  thirdPartyDefects(pageSrc, proxyRaw, plantDays, gaComponent, layoutSrc).join("; "));
ok("§5r control · ad storage granted is reported", thirdPartyDefects(pageSrc, proxyRaw, gaLib, plantAds, layoutSrc).some((x) => x.includes("ad_storage")));
ok("§5s control · /admin dropped from the exclusions is reported", thirdPartyDefects(pageSrc, proxyRaw, plantExcl, gaComponent, layoutSrc).some((x) => x.includes('"/admin"')));
const plantNoGuard = gaComponent.replace("installTransportGuard(w);", "");
const plantImg = proxyRaw.replace(`"img-src 'self' data: blob:",`, "`img-src 'self' data: blob: ${GA_HOSTS_CONNECT}`,");
ok("§5u control · planted guard/img copies found their targets", plantNoGuard !== gaComponent && plantImg !== proxyRaw);
ok("§5v control · the transport guard removed is reported", thirdPartyDefects(pageSrc, proxyRaw, gaLib, plantNoGuard, layoutSrc).some((x) => x.includes("transport guard")));
ok("§5w control · analytics hosts restored to img-src are reported", thirdPartyDefects(pageSrc, plantImg, gaLib, gaComponent, layoutSrc).some((x) => x.includes("img-src")));
ok("§5t control · the retired 'no tracking cookies' claim restored is reported", thirdPartyDefects(plantRetiredClaim, proxyRaw, gaLib, gaComponent, layoutSrc).some((x) => x.includes("no third-party tracking")));

/* ════════════════════════════════════════════════════════════════════════════
 * §4f · CONSENT — v2026-09-15.2. Google Analytics is OPT-IN: the Tanzania PDPA 2022 has no legitimate-interests
 * ground, and a tracker that can identify a person needs consent. Every sentence saying so is tied to the code.
 * ══════════════════════════════════════════════════════════════════════════ */
console.log("\n§4f · Google Analytics runs only with consent, and the notice says exactly that");
const consentLib = read("src/lib/analytics-consent.ts");
const promptSrc = code(read("src/components/analytics/consent-prompt.tsx"));
const shellSrc = code(read("src/components/layout/app-shell.tsx"));
const denyDays = (lib: string) => Number(lib.match(/export const CONSENT_DENY_DAYS = (\d+);/)?.[1]);
const grantDays = (lib: string) => Number(lib.match(/export const CONSENT_GRANT_DAYS = (\d+);/)?.[1]);
function consentWords(lib: string): Record<Loc, { s3: string[]; s4: string[]; s7: string[]; lawful: RegExp }> {
  const d = denyDays(lib);
  return {
    en: { s3: [...ANALYTICS_CONSENT_WORDS.en], s4: ["only if you allow analytics"], s7: ["Only if you allow analytics", "Analytics is off until you", `${d} days if you decline`, "<AnalyticsChoice />"], lawful: /measuring how the website is used/ },
    sw: { s3: [...ANALYTICS_CONSENT_WORDS.sw], s4: ["ikiwa tu utaruhusu takwimu"], s7: ["Ikiwa tu utaruhusu takwimu", "Takwimu zimezimwa hadi", `siku ${d} ukikataa`, "<AnalyticsChoice />"], lawful: /kupima jinsi tovuti inavyotumika/ },
    zh: { s3: [...ANALYTICS_CONSENT_WORDS.zh], s4: ["仅在您允许分析时启用"], s7: ["仅在您允许分析时", "在您作出选择之前，分析处于关闭状态", `拒绝则保存 ${d} 天`, "<AnalyticsChoice />"], lawful: /衡量网站的使用情况/ },
  };
}
function consentDefects(page: string, component: string, prompt: string, shell: string, lib: string): string[] {
  const d: string[] = [];
  const bl = blocks(page);
  const W = consentWords(lib);
  for (const l of LOCS) {
    const s3 = section(bl[l], "3");
    for (const w of W[l].s3) if (!s3.includes(w)) d.push(`${l} §3 does not say "${w}" (analytics under consent)`);
    const li = (s3.match(/<li>[\s\S]*?<\/li>/g) ?? []).find((x) => /Legitimate interest|Maslahi halali|合法利益/.test(x)) ?? "";
    if (W[l].lawful.test(li)) d.push(`${l} §3 still lists analytics under legitimate interest — the PDPA has no such ground`);
    for (const w of W[l].s4) if (!section(bl[l], "4").includes(w)) d.push(`${l} §4 does not say "${w}"`);
    for (const w of W[l].s7) if (!section(bl[l], "7").includes(w)) d.push(`${l} §7 does not say "${w}"`);
  }
  // v2026-09-15.3: §5 states the retention Ali set in the GA property (Admin → Data retention): event data 2 months,
  // user data 14 months. Not readable from code — it is a property setting — so the owner-reported values are pinned here.
  const GA_RETENTION: Record<Loc, string[]> = {
    en: ["Google keeps the events it receives for 2 months", "for 14 months"],
    sw: ["matukio inayopokea kwa miezi 2", "kwa miezi 14"],
    zh: ["事件数据保留 2 个月", "保留 14 个月"],
  };
  for (const l of LOCS) for (const w of GA_RETENTION[l]) if (!section(blocks(page)[l], "5").includes(w)) d.push(`${l} §5 does not state Google Analytics retention "${w}"`);
  if (grantDays(lib) !== 395) d.push(`CONSENT_GRANT_DAYS is ${grantDays(lib)}, but §7 states 395 days`);
  if (!/const allowed = location !== null && consent === "granted";/.test(component)) d.push(`GoogleTag is not gated on consent === "granted" — the tag could load without consent (§3, §7)`);
  if (!/if \(consent === "denied"\) clearAnalyticsCookies\(\);/.test(component)) d.push(`withdrawing consent does not delete the _ga cookies (§7 "turning analytics off deletes them")`);
  // gtag.js batches: a view queued while consent was granted can flush after withdrawal (driven 2026-09-15). The guard
  // must re-read consent at SEND time, in both transports, or "turning analytics off" still lets queued hits leave.
  if ((component.match(/if \(readConsent\(\) !== "granted"\) return (?:true|skip\(\));/g) ?? []).length !== 2) d.push(`the transport guard does not re-check consent at send time in both sendBeacon and fetch — queued hits could leave after withdrawal (§7)`);
  const mount = shell.match(/.*<LazyConsentPrompt \/>.*/g) ?? [];
  if (mount.length !== 1 || /&&/.test(mount[0])) d.push("ConsentPrompt is not mounted exactly once, ungated, in the app shell — nobody could consent");
  // Line-scoped: `onClick={() => …}` contains a ">", so a `[^>]*` tag matcher never reaches the attributes.
  const allow = prompt.match(/.*data-testid="consent-allow".*/)?.[0] ?? "";
  const decline = prompt.match(/.*data-testid="consent-decline".*/)?.[0] ?? "";
  const style = (b: string) => `${b.match(/variant="[^"]+"/)?.[0] ?? "?"} ${b.match(/size="[^"]+"/)?.[0] ?? "?"}`;
  if (!allow || !decline) d.push("the prompt lost its Allow or Decline button");
  else if (style(allow) !== style(decline)) d.push(`Allow (${style(allow)}) and Decline (${style(decline)}) are not of equal weight — a nudge is not consent`);
  return d;
}
ok("§4f en/sw/zh §3/§4/§7 say analytics is opt-in, and the tag, the prompt and the withdrawal do what they say",
  consentDefects(pageSrc, gaComponent, promptSrc, shellSrc, consentLib).length === 0,
  consentDefects(pageSrc, gaComponent, promptSrc, shellSrc, consentLib).join("; "),
  `deny ${denyDays(consentLib)} days · grant ${grantDays(consentLib)} days`);

/* ════════════════════════════════════════════════════════════════════════════
 * §4g · FIRST-PARTY VISIT COUNTS — v2026-09-15.2. Counted for EVERY visitor without consent, which is only true to say
 * while the tables hold nothing personal and the browser stores nothing. Each is read from the code.
 * ══════════════════════════════════════════════════════════════════════════ */
console.log("\n§4g · visit counts: what §2 and §5 say is what the schema and the beacon do");
const schemaSrc = read("prisma/schema.prisma");
const visitsServer = read("src/lib/server/site-visits.ts");
const beaconSrc = code(read("src/components/analytics/site-visit-beacon.tsx"));
const visitsClient = code(read("src/lib/site-visits.ts"));
const retentionDays = (srv: string) => Number(srv.match(/export const SITE_VISIT_RETENTION_DAYS = (\d+);/)?.[1]);
const modelFields = (schema: string, name: string) =>
  (schema.match(new RegExp(`model ${name} \\{([\\s\\S]*?)\\n\\}`))?.[1] ?? "").split(/\r?\n/).map((l) => l.trim()).filter((l) => /^[a-z]\w*\s/.test(l)).map((l) => l.split(/\s+/)[0]).sort();
const VISIT_WORDS: Record<Loc, { s2: string[]; s5: (d: number) => string }> = {
  en: { s2: ["Visit counts", "our own servers", "no cookie or identifier is used"], s5: (d) => `Visit counts, daily totals that identify no one: ${d} days` },
  sw: { s2: ["Hesabu za matembeleo", "seva zetu wenyewe", "hakuna kidakuzi wala kitambulisho"], s5: (d) => `Hesabu za matembeleo, jumla za kila siku zisizomtambulisha mtu yeyote: siku ${d}` },
  zh: { s2: ["访问计数", "我们自己的服务器", "不使用 cookie 或标识符"], s5: (d) => `访问计数（不识别任何人的每日总数）：${d} 天` },
};
function visitDefects(page: string, schema: string, server: string, beacon: string, client: string): string[] {
  const d: string[] = [];
  const bl = blocks(page);
  const days = retentionDays(server);
  if (!(days > 0)) d.push("SITE_VISIT_RETENTION_DAYS is unreadable");
  for (const l of LOCS) {
    for (const w of VISIT_WORDS[l].s2) if (!section(bl[l], "2").includes(w)) d.push(`${l} §2 does not say "${w}" (visit counts)`);
    if (!section(bl[l], "5").includes(VISIT_WORDS[l].s5(days))) d.push(`${l} §5 does not state the visit-count period read from the code (${days} days)`);
  }
  const page_ = JSON.stringify(modelFields(schema, "SiteVisitPage"));
  const src_ = JSON.stringify(modelFields(schema, "SiteVisitSource"));
  if (page_ !== JSON.stringify(["day", "entries", "id", "path", "views"])) d.push(`SiteVisitPage has fields ${page_} — §2 says nothing that could identify you is kept`);
  if (src_ !== JSON.stringify(["campaign", "day", "id", "medium", "referrer", "source", "visits"])) d.push(`SiteVisitSource has fields ${src_} — §2 says nothing that could identify you is kept`);
  for (const [name, s] of [["site-visit-beacon.tsx", beacon], ["lib/site-visits.ts", client]] as const) {
    if (/document\.cookie|localStorage|sessionStorage|indexedDB/.test(s)) d.push(`${name} touches browser storage — §2 says no cookie or identifier is used`);
  }
  if (!/navigator\.sendBeacon\(SITE_VISIT_ENDPOINT, JSON\.stringify\(payload\)\)/.test(beacon)) d.push("the beacon no longer sends exactly visitPayload(...) — its fields are what §2 describes");
  return d;
}
ok("§4g en/sw/zh §2/§5 describe the visit counts, the tables hold no personal field, the browser stores nothing",
  visitDefects(pageSrc, schemaSrc, visitsServer, beaconSrc, visitsClient).length === 0,
  visitDefects(pageSrc, schemaSrc, visitsServer, beaconSrc, visitsClient).join("; "),
  `${retentionDays(visitsServer)} days`);

/* ════════════════════════════════════════════════════════════════════════════
 * §4h · THE JOURNEY COUNTS — v2026-10-01 (Vodacom plan S3b, docs/VODACOM-PLAN.md §0f). Counted without consent on the
 * visit counts' own basis, which is only true while the table holds nothing personal and the browser keeps nothing but
 * the tab-lived campaign tags §7 names. Each clause is read from the code.
 * ══════════════════════════════════════════════════════════════════════════ */
console.log("\n§4h · journey counts: what §2, §5 and §7 say is what the schema, the beacon and the key do");
const funnelServer = read("src/lib/server/journey-funnel.ts");
const funnelBeacon = code(read("src/lib/journey/funnel-beacon.ts"));
const funnelLib = read("src/lib/journey/funnel.ts");
const funnelDays = (srv: string) => Number(srv.match(/export const JOURNEY_FUNNEL_RETENTION_DAYS = (\d+);/)?.[1]);
const FUNNEL_WORDS: Record<Loc, { s2: string[]; s5: (d: number) => string; s7: string[] }> = {
  en: { s2: ["Journey counts", "our servers also add one", "these totals hold no cookie, no identifier"], s5: (d) => `Journey counts, daily totals that identify no one: ${d} days`, s7: ["kp-utm", "utm_source", "utm_campaign", "no identifier"] },
  sw: { s2: ["Hesabu za safari", "seva zetu pia huongeza", "jumla hizi hazina kidakuzi, kitambulisho"], s5: (d) => `Hesabu za safari, jumla za kila siku zisizomtambulisha mtu yeyote: siku ${d}`, s7: ["kp-utm", "utm_source", "utm_campaign", "hazina kitambulisho"] },
  zh: { s2: ["使用流程计数", "我们的服务器还会", "这些总数不含 cookie、标识符"], s5: (d) => `使用流程计数（不识别任何人的每日总数）：${d} 天`, s7: ["kp-utm", "utm_source", "utm_campaign", "不含标识符"] },
};
function funnelDefects(page: string, schema: string, server: string, beacon: string, lib: string): string[] {
  const d: string[] = [];
  const bl = blocks(page);
  const days = funnelDays(server);
  if (!(days > 0)) d.push("JOURNEY_FUNNEL_RETENTION_DAYS is unreadable");
  for (const l of LOCS) {
    for (const w of FUNNEL_WORDS[l].s2) if (!section(bl[l], "2").includes(w)) d.push(`${l} §2 does not say "${w}" (journey counts)`);
    if (!section(bl[l], "5").includes(FUNNEL_WORDS[l].s5(days))) d.push(`${l} §5 does not state the journey-count period read from the code (${days} days)`);
    for (const w of FUNNEL_WORDS[l].s7) if (!section(bl[l], "7").includes(w)) d.push(`${l} §7 does not say "${w}" (the kp-utm tab key)`);
  }
  const fields = JSON.stringify(modelFields(schema, "JourneyFunnelDay"));
  if (fields !== JSON.stringify(["count", "day", "id", "origin", "step", "utmCampaign", "utmSource", "variant"])) d.push(`JourneyFunnelDay has fields ${fields} — §2 says nothing that could identify you is kept`);
  if (!/export const FUNNEL_UTM_KEY = "kp-utm";/.test(lib)) d.push("the tab-storage key is no longer kp-utm — §7 names it");
  if (/document\.cookie|localStorage|indexedDB/.test(beacon)) d.push("the funnel beacon touches a cookie or lasting storage — §7 names only the tab key");
  if ((beacon.match(/sessionStorage\.(?:getItem|setItem)\(([^)]*)\)/g) ?? []).some((c) => !c.includes("FUNNEL_UTM_KEY"))) d.push("the funnel beacon uses a session key other than kp-utm — §7 names only that one");
  return d;
}
ok("§4h en/sw/zh §2/§5/§7 describe the journey counts and the kp-utm key; the table holds no personal field; the beacon keeps only that key",
  funnelDefects(pageSrc, schemaSrc, funnelServer, funnelBeacon, funnelLib).length === 0,
  funnelDefects(pageSrc, schemaSrc, funnelServer, funnelBeacon, funnelLib).join("; "),
  `${funnelDays(funnelServer)} days`);
const plantFunnelUser = schemaSrc.replace(/(model JourneyFunnelDay \{[\s\S]*?)(\r?\n  count)/, "$1\n  userId      String?$2");
const plantFunnelStore = funnelBeacon.replace("window.sessionStorage.getItem(FUNNEL_UTM_KEY) !== null", "window.localStorage.getItem(FUNNEL_UTM_KEY) !== null");
const plantFunnelZh = pageSrc.replace("使用流程计数（不识别任何人的每日总数）：400 天", "使用流程计数：400 天");
ok("§4h control · planted journey-count copies found their targets", [plantFunnelUser !== schemaSrc, plantFunnelStore !== funnelBeacon, plantFunnelZh !== pageSrc].every(Boolean));
ok("§4h control · a userId column on the funnel table is reported", funnelDefects(pageSrc, plantFunnelUser, funnelServer, funnelBeacon, funnelLib).some((x) => x.includes("JourneyFunnelDay has fields")));
ok("§4h control · a funnel beacon that keeps the tags in localStorage is reported", funnelDefects(pageSrc, schemaSrc, funnelServer, plantFunnelStore, funnelLib).some((x) => x.includes("lasting storage")));
ok("§4h control · the journey-count period dropped from ONE locale (zh) is reported", funnelDefects(plantFunnelZh, schemaSrc, funnelServer, funnelBeacon, funnelLib).some((x) => x.startsWith("zh §5")));

const plantUngated = gaComponent.replace(' && consent === "granted"', "");
const plantNudge = promptSrc.replace(/variant="ghost"(?= size="sm" data-testid="consent-allow")/, 'variant="primary"');
const plantLI = pageSrc.replace("security alerting</li>", "security alerting, measuring how the website is used</li>");
const plantChoiceSw = pageSrc.replace(/(ndani ya kifaa chako\.\s*<\/p>\s*)<AnalyticsChoice \/>/, "$1");
const plantFlagged = shellSrc.replace("<Suspense fallback={null}><LazyConsentPrompt /></Suspense>", "{installInviteLive && <Suspense fallback={null}><LazyConsentPrompt /></Suspense>}");
const plantIpField = schemaSrc.replace(/(model SiteVisitPage \{[\s\S]*?)(\r?\n  views)/, "$1$2\n  ip      String");
const plantStorage = beaconSrc.replace("const entry = !entered.current;", "const entry = !localStorage.getItem('kp-seen');");
const plantVisitSw = pageSrc.replace("seva zetu wenyewe", "seva");
ok("§5x control · planted consent and visit-count copies found their targets",
  [plantUngated !== gaComponent, plantNudge !== promptSrc, plantLI !== pageSrc, plantChoiceSw !== pageSrc, plantFlagged !== shellSrc, plantIpField !== schemaSrc, plantStorage !== beaconSrc, plantVisitSw !== pageSrc].every(Boolean));
ok("§5y control · a tag no longer gated on consent is reported", consentDefects(pageSrc, plantUngated, promptSrc, shellSrc, consentLib).some((x) => x.includes("not gated on consent")));
ok("§5z control · a bright Allow beside a grey Decline is reported", consentDefects(pageSrc, gaComponent, plantNudge, shellSrc, consentLib).some((x) => x.includes("equal weight")));
ok("§5aa control · analytics restored under legitimate interest (en) is reported", consentDefects(plantLI, gaComponent, promptSrc, shellSrc, consentLib).some((x) => x.startsWith("en §3 still lists analytics")));
ok("§5ab control · the §7 control dropped from ONE locale (sw) is reported", consentDefects(plantChoiceSw, gaComponent, promptSrc, shellSrc, consentLib).some((x) => x.startsWith("sw §7") && x.includes("AnalyticsChoice")));
ok("§5ac control · a consent prompt hidden behind a feature flag is reported", consentDefects(pageSrc, gaComponent, promptSrc, plantFlagged, consentLib).some((x) => x.includes("ungated")));
const plantGaRetentionZh = pageSrc.replace("保留 14 个月", "保留 26 个月");
ok("§5ah control · Google Analytics retention changed in ONE locale (zh) is reported",
  plantGaRetentionZh !== pageSrc && consentDefects(plantGaRetentionZh, gaComponent, promptSrc, shellSrc, consentLib).some((x) => x.startsWith("zh §5")));
const plantNoSendCheck = gaComponent.replace('if (readConsent() !== "granted") return skip();', "");
ok("§5ag control · a fetch transport that no longer re-checks consent at send time is reported",
  plantNoSendCheck !== gaComponent && consentDefects(pageSrc, plantNoSendCheck, promptSrc, shellSrc, consentLib).some((x) => x.includes("send time")));
ok("§5ad control · an ip column on the visit table is reported", visitDefects(pageSrc, plantIpField, visitsServer, beaconSrc, visitsClient).some((x) => x.includes("SiteVisitPage has fields")));
ok("§5ae control · a beacon that touches localStorage is reported", visitDefects(pageSrc, schemaSrc, visitsServer, plantStorage, visitsClient).some((x) => x.includes("browser storage")));
ok("§5af control · the visit-count sentence dropped from ONE locale (sw) is reported", visitDefects(plantVisitSw, schemaSrc, visitsServer, beaconSrc, visitsClient).some((x) => x.startsWith("sw §2")));

// §2e's controls — the v2026-09-26 defect put back, a second provider wired, and the delivery receipt removed.
const plantSmsZh = pageSrc.replace("<li>Blackball（坦桑尼亚），我们的短信网关", "<li>短信服务商（坦桑尼亚），我们的短信网关");
const plantSmsProvider = smsSrc.replace('export type SmsProviderId = "blackball" | "console";', 'export type SmsProviderId = "blackball" | "africastalking" | "console";');
ok("§5ai control · planted SMS-gateway copies found their targets", plantSmsZh !== pageSrc && plantSmsProvider !== smsSrc);
ok("§5aj control · the SMS gateway dropped from ONE locale (zh) is reported",
  smsDefects(plantSmsZh, smsSrc, smsTransportSrc, smsReceiptRoute).some((x) => x.startsWith("zh §4") && x.includes('"Blackball"')));
ok("§5ak control · a new SMS provider in the union is reported until §4 names it",
  smsDefects(pageSrc, plantSmsProvider, smsTransportSrc, smsReceiptRoute).some((x) => x.includes('"africastalking" is unclassified')));
ok("§5al control · a gateway with no delivery receipt is reported (§4 says it tells us whether each message was delivered)",
  smsDefects(pageSrc, smsSrc, smsTransportSrc, false).some((x) => x.includes("delivery-receipt")));

/* ════════════════════════════════════════════════════════════════════════════
 * §4h · zh TYPOGRAPHY — a full-width colon, stop, comma or closing bracket carries its own space, so a {" "} (or a
 * typed space) after one prints a gap: §1 read "联系方式： msaada@…" (2026-09-27 re-review). Translation markup only,
 * so the English hash and the version do not move.
 * ══════════════════════════════════════════════════════════════════════════ */
console.log("\n§4h · zh: no space after full-width punctuation");
const zhGaps = (src: string) => [...code(blocks(src).zh).matchAll(/[：。，；、）](?:[ \t]*\{" "\}|[ \t]+(?=\S))/g)].map((m) => m[0]);
ok("§4h zh puts no space after a full-width colon, stop, comma or closing bracket", zhGaps(pageSrc).length === 0, zhGaps(pageSrc).join(" | "));
const plantZhGap = pageSrc.replace("达累斯萨拉姆。联系方式：", '达累斯萨拉姆。联系方式：{" "}');
ok("§5am control · the §1 {\" \"} after \"联系方式：\" put back is reported", plantZhGap !== pageSrc && zhGaps(plantZhGap).length > 0);

/* ════════════════════════════════════════════════════════════════════════════
 * §4j · WHAT ERASURE KEEPS, SAID PUBLICLY — v2026-10-07 (COMPLIANCE-DECISIONS "Privacy v2026-10-07"). The words are
 * PINNED WHOLE, by hash, in every language — never by fragments, which let a change elsewhere in a sentence through:
 *   · §5's first bullet (its "except as stated below") and the 7-year record bullet — approved by Ali in the session;
 *   · §5's coded referee numbers bullet, §6's Erasure line, §9's two paragraphs, the note under "Erase my data" in three
 *     languages, and the data-rights file's erasure sentence (English only) — the lead's words of 2026-10-07, to be put to
 *     Ali. A change to any of them is a change to published words: it moves its pin here, and the version with it.
 * And the record they state is held to the code: erasure's ONE write to a recipient row clears the account link
 * (U16a's `unlinkUser`, through `erase.ts`), no code deletes a recipient row, and DATA-RETENTION keeps the campaign and
 * opt-out-link rows at 7 years. ⛔ BLOCK-SCOPED: nothing here is a module-level name another section could collide with.
 * ⚠️ §9's second paragraph ends with the stop sentence, which is true only while every offer carries its stop link: when
 * U43b makes the link ONE setting and the link goes (management's item 7), the sentence goes with it, these three §9
 * pins move with the words, and §4k's tie is re-tied to that setting.
 * ══════════════════════════════════════════════════════════════════════════ */
console.log("\n§4j · what erasure keeps: §5, §6, §9, the erasure note and the data-rights file, pinned whole, and the record held to the code");
{
  const eraseSrc = code(read("src/lib/server/marketing/erase.ts"));
  /** The rights.erasure sentence as the bundle prints it: its string pieces joined, the address left as written. */
  const erasureSentence = (src: string): string => {
    const s = src.replace(/\r\n/g, "\n");
    const at = s.indexOf("erasure: `Request erasure");
    const end = s.indexOf("portability:", at);
    if (at < 0 || end < 0) return "";
    return [...s.slice(at, end).matchAll(/`([^`]*)`|"((?:[^"\\]|\\.)*)"/g)].map((m) => m[1] ?? m[2]).join("");
  };
  const dsarSentence = erasureSentence(read("src/lib/server/privacy.ts"));
  const retentionDoc = read("docs/DATA-RETENTION.md");
  const erasureNotes: Record<Loc, string> = {
    en: dict.en.profile.privacyRequestErasureNote, sw: dict.sw.profile.privacyRequestErasureNote, zh: dict.zh.profile.privacyRequestErasureNote,
  };
  const collapse = (t: string) => t.replace(/\s+/g, " ").trim();
  const sha12 = (t: string) => createHash("sha256").update(collapse(t)).digest("hex").slice(0, 12);
  /** The inner source of the ONE `<li>` of a section that starts with `head` — "" when none does, or more than one. */
  const liStarting = (sectionSrc: string, head: string): string => {
    const items = [...sectionSrc.matchAll(/<li>([\s\S]*?)<\/li>/g)].map((m) => m[1]).filter((t) => t.startsWith(head));
    return items.length === 1 ? items[0] : "";
  };
  /** The inner source of a section's n-th `<p>` (0-based) — "" when there is none. */
  const paragraph = (sectionSrc: string, n: number): string => [...sectionSrc.matchAll(/<p>([\s\S]*?)<\/p>/g)].map((m) => m[1])[n] ?? "";
  /** Where each pinned page text starts, per language — the source's own first words. */
  const HEAD: Record<"s5first" | "s5record" | "s5referees" | "s6erasure", Record<Loc, string>> = {
    s5first: { en: "Account and identity (KYC) records:", sw: "Kumbukumbu za akaunti na utambulisho (KYC):", zh: "账户与身份（KYC）记录：" },
    s5record: { en: "Records of marketing text messages", sw: "Kumbukumbu za SMS za ofa na habari:", zh: "短信优惠与资讯的记录：" },
    s5referees: { en: "A coded form of the phone number of each agent referee", sw: "Namba ya simu ya kila mdhamini wa wakala", zh: "本政策 {REFEREE_PROMISE_REWORDED_IN} 版之前被提名的" },
    s6erasure: { en: '<strong className="text-text">Erasure</strong>', sw: '<strong className="text-text">Kufuta</strong>', zh: '<strong className="text-text">删除权</strong>' },
  };
  /** Every pinned text, as its source holds it: the page's (stripped of PolicyLine tags), the dictionary's, the bundle's. */
  const pinnedTexts = (page: string, notes: Record<Loc, string>, dsar: string): Record<string, string> => {
    const bl = blocks(page);
    const out: Record<string, string> = {};
    for (const l of LOCS) {
      out[`${l} §5 first bullet`] = liStarting(section(bl[l], "5"), HEAD.s5first[l]);
      out[`${l} §5 record bullet`] = liStarting(section(bl[l], "5"), HEAD.s5record[l]);
      out[`${l} §5 referee numbers bullet`] = liStarting(section(bl[l], "5"), HEAD.s5referees[l]);
      out[`${l} §6 Erasure`] = liStarting(section(bl[l], "6"), HEAD.s6erasure[l]);
      out[`${l} §9 first paragraph`] = paragraph(section(bl[l], "9"), 0);
      out[`${l} §9 second paragraph`] = paragraph(section(bl[l], "9"), 1);
      out[`${l} the note under "Erase my data"`] = notes[l];
    }
    out["en the data-rights erasure sentence"] = dsar;
    return out;
  };
  /** ⛔ THE PINS — sha256 (12 hex) of each text, whitespace-collapsed. Moving one is a change of published words. */
  const TEXT_PINS: Record<string, string> = {
    "en §5 first bullet": "d849b2d90cce", "sw §5 first bullet": "4e3f0109a8fb", "zh §5 first bullet": "0f83ff42c325",
    "en §5 record bullet": "3c32b3b9f11d", "sw §5 record bullet": "f4ca0a478d04", "zh §5 record bullet": "fe70c2ffced3",
    "en §5 referee numbers bullet": "759980721b5f", "sw §5 referee numbers bullet": "cd5575e2769c", "zh §5 referee numbers bullet": "724a23800660",
    "en §6 Erasure": "d92355281cf7", "sw §6 Erasure": "89c0ca55cb2b", "zh §6 Erasure": "ef70992f350e",
    "en §9 first paragraph": "85aa1bcc73a0", "sw §9 first paragraph": "3ec321fcfaf5", "zh §9 first paragraph": "877ece96400b",
    "en §9 second paragraph": "577c4256d22c", "sw §9 second paragraph": "bd23fe11168e", "zh §9 second paragraph": "0d6aa8a64126",
    'en the note under "Erase my data"': "4c0b74e089f4", 'sw the note under "Erase my data"': "88d387d24b5b", 'zh the note under "Erase my data"': "d5d322ec1b8b",
    "en the data-rights erasure sentence": "63c74d586aa8",
  };
  /** What the data-rights file (English only) must say, and must no longer say — read in words, beside its pin. */
  const DSAR_RECORD = [
    "we erase your contact details (except as below)",
    "and cannot be erased before then. We also keep your phone number in our record of your marketing choices, so that we never send you marketing again, and in the records of the marketing text messages we sent to it",
    "are kept for at least 7 years",
    "erasure removes which account they belonged to and keeps the rest",
    "The records of the security codes we texted to your number, and your payment records, which the law requires us to keep, keep it too.",
  ];
  const DSAR_RETIRED = ["they are erased when that period ends", "We keep your phone number only"];
  const RECIPIENT_DELETE = /\bsmsCampaignRecipient\.(?:delete|deleteMany|remove|purge)\w*\s*\(/;
  const campaignRecordDefects = (page: string, erase: string, dsar: string, notes: Record<Loc, string>, doc: string, files: Array<{ path: string; src: string }>): string[] => {
    const d: string[] = [];
    for (const [key, text] of Object.entries(pinnedTexts(page, notes, dsar))) {
      if (text === "") { d.push(`${key} was not found exactly once — its pinned text is gone or doubled`); continue; }
      if (sha12(text) !== TEXT_PINS[key]) d.push(`${key} reads ${sha12(text)}, pinned ${TEXT_PINS[key] ?? "(no pin)"} — published words changed: put them to Ali, move the version and this pin together`);
    }
    for (const w of DSAR_RECORD) if (!dsar.includes(w)) d.push(`the data-rights file's rights.erasure (privacy.ts) does not say "${w}"`);
    for (const w of DSAR_RETIRED) if (dsar.includes(w)) d.push(`the data-rights file's rights.erasure (privacy.ts) says "${w}" again — false: money and audit rows are never deleted, and the number is kept in more than one record`);
    if (!/\bdb\.smsCampaignRecipient\.unlinkUser\(/.test(erase)) d.push("erase.ts no longer clears the account link through smsCampaignRecipient.unlinkUser — §5 says erasure removes which account the records belonged to");
    const deleters = files.filter((f) => RECIPIENT_DELETE.test(f.src)).map((f) => relative(ROOT, f.path));
    if (deleters.length > 0) d.push(`a recipient row can be deleted (${deleters.join(", ")}) — §5 says the record is kept at least 7 years`);
    for (const row of ["| SMS campaigns and their recipients |", "| Marketing opt-out links"]) {
      const line = doc.split(/\r?\n/).find((x) => x.startsWith(row)) ?? "";
      if (!line.includes("| **7 years** |")) d.push(`DATA-RETENTION.md has no 7-year row starting "${row}" — §5's period must agree with it`);
    }
    return d;
  };
  ok("§4j en/sw/zh §5's three bullets, §6's Erasure line, §9's two paragraphs and the erasure note — and the data-rights sentence — are the pinned words, whole; erasure only unlinks the record; nothing deletes it; DATA-RETENTION agrees",
    campaignRecordDefects(pageSrc, eraseSrc, dsarSentence, erasureNotes, retentionDoc, srcFiles).length === 0,
    campaignRecordDefects(pageSrc, eraseSrc, dsarSentence, erasureNotes, retentionDoc, srcFiles).join("; "));
  const plantP2Sw = pageSrc.replace("(msimbo huo hauwezi kugeuzwa kurudi kuwa namba)", "(msimbo huo unaweza kugeuzwa kurudi kuwa namba)");
  const plantNoteZh = { ...erasureNotes, zh: erasureNotes.zh.replace("至少保留 7 年。我们", "保留 7 年，期满后删除。我们") };
  const plantS6Sw = pageSrc.replace("kwa kuzingatia kumbukumbu ambazo sheria inatulazimu kuhifadhi (angalia §5)", "kwa kuzingatia masharti ya uhifadhi ya AML");
  const plantRefereesZh = pageSrc.replace(/\n[ \t]*<li>本政策 \{REFEREE_PROMISE_REWORDED_IN\} 版之前被提名的[^\n]*<\/li>/, "");
  const plantDsarOnly = dsarSentence.replace("We also keep your phone number in our record", "We keep your phone number only in our record");
  const plantEraseDelete = eraseSrc.replace("db.smsCampaignRecipient.unlinkUser(", "db.smsCampaignRecipient.deleteForUser(");
  const plantDeleter = { path: join(ROOT, "src/lib/server/marketing/planted.ts"), src: "export const p = (db: any, id: string) => db.smsCampaignRecipient.deleteMany({ where: { userId: id } });\n" };
  ok("§4j control · planted copies found their targets",
    [plantP2Sw !== pageSrc, plantNoteZh.zh !== erasureNotes.zh, plantS6Sw !== pageSrc, plantRefereesZh !== pageSrc, plantDsarOnly !== dsarSentence, plantEraseDelete !== eraseSrc].every(Boolean));
  ok("§4j control · ONE word changed in the Swahili §9 second paragraph is reported by its pin",
    campaignRecordDefects(plantP2Sw, eraseSrc, dsarSentence, erasureNotes, retentionDoc, srcFiles).some((x) => x.startsWith("sw §9 second paragraph reads")));
  ok("§4j control · the Chinese erasure note telling the old story (erased when the period ends) is reported by its pin",
    campaignRecordDefects(pageSrc, eraseSrc, dsarSentence, plantNoteZh, retentionDoc, srcFiles).some((x) => x.startsWith('zh the note under "Erase my data" reads')));
  ok("§4j control · the Swahili §6 Erasure line put back to \"AML retention requirements\" is reported by its pin",
    campaignRecordDefects(plantS6Sw, eraseSrc, dsarSentence, erasureNotes, retentionDoc, srcFiles).some((x) => x.startsWith("sw §6 Erasure reads")));
  ok("§4j control · the referee numbers bullet dropped from ONE language (zh) is reported",
    campaignRecordDefects(plantRefereesZh, eraseSrc, dsarSentence, erasureNotes, retentionDoc, srcFiles).some((x) => x.startsWith("zh §5 referee numbers bullet was not found")));
  ok("§4j control · the data-rights sentence's \"only\" put back (false beside the other records) is reported",
    campaignRecordDefects(pageSrc, eraseSrc, plantDsarOnly, erasureNotes, retentionDoc, srcFiles).some((x) => x.includes("says \"We keep your phone number only\" again")));
  ok("§4j control · erasure deleting the recipient rows instead of unlinking them is reported",
    campaignRecordDefects(pageSrc, plantEraseDelete, dsarSentence, erasureNotes, retentionDoc, srcFiles).some((x) => x.includes("unlinkUser")));
  ok("§4j control · a src file that deletes recipient rows is reported",
    campaignRecordDefects(pageSrc, eraseSrc, dsarSentence, erasureNotes, retentionDoc, [...srcFiles, plantDeleter]).some((x) => x.includes("can be deleted")));
}

/* ════════════════════════════════════════════════════════════════════════════
 * §4k · §9, THE REFEREES' WORDS — v2026-10-07 (Ali's Q8, COMPLIANCE-DECISIONS § "2026-10-07 · Marketing SMS go to anyone
 * with a phone — consent is not a condition"; management's item 4, § "2026-10-07 · Management's answers for the first
 * marketing campaign"). The old promise "we never contact you for marketing" stands for every referee named before
 * version REFEREE_PROMISE_REWORDED_IN — kept with a coded form of each such number, which §5 and §9 state — and is no
 * longer made to anyone named after it, who is told management's two sentences. ⛔ The version is ONE constant
 * (`src/lib/legal/privacy-referees.ts`), printed in §5 and §9 in every language and never typed as a literal there, named
 * by its LABEL (never "this version", which would move with every later version, and the promise with it); it must have
 * its COMPLIANCE "Privacy v…" heading and may never name a version later than the one the page prints.
 * (The final-rule gate's own section reads §9 too; this block is named apart from it — §4k, `refereeWordsDefects`.)
 * ⚠️ THE STOP SENTENCE IS TIED TO `marketingFooter()` FOR NOW — true only while every offer carries its stop link. When
 * U43b makes the link ONE setting (management's item 7: it goes, with these words, in the commit that files the written
 * confirmation), RE-TIE this check to that setting, so §9's stop sentence goes exactly when the link does.
 * ══════════════════════════════════════════════════════════════════════════ */
console.log("\n§4k · §9: the referee promise kept for those named before the label, management's sentences for those named after");
{
  const REFEREE_SENTENCES = { offers: "50pick may send you offers by SMS.", stop: "You can stop them at any time with the link in every offer." } as const;
  /** The kept promise, as §9 states it to the referees named before the label. */
  const KEPT_PROMISE_EN = "that promise stands: we never contact you for marketing.";
  /** The old promise as each locale printed it until v2026-10-01 — made to EVERYONE, which it may no longer be. */
  const OLD_REFEREE_PROMISE: Record<Loc, string> = {
    en: "we never contact you for marketing;",
    sw: "hatuwasiliani nawe kamwe kwa matangazo;",
    zh: "我们绝不会为营销目的联系您；",
  };
  const LABEL_IN_SOURCE = "{REFEREE_PROMISE_REWORDED_IN}";
  const metaVersion = (src: string) => src.match(/en: "Version ([0-9]{4}-[0-9]{2}-[0-9]{2}(?:\.[0-9]+)?) · /)?.[1] ?? "";
  const stopLinkInOffers = (footer: string) => footer.includes(`${OPTOUT_PATH}${footerMeasurementToken()}`);
  const refereeWordsDefects = (page: string, footer: string, label: string, decisions: string): string[] => {
    const d: string[] = [];
    const bl = blocks(page);
    const s9 = (l: Loc) => section(bl[l], "9").replace(/\s+/g, " ");
    for (const l of LOCS) {
      // ⛔ The label comes from the ONE constant, in §9 and in §5's referee bullet — never typed as a literal there.
      const s5 = section(bl[l], "5").split(/<li>/).find((li) => li.includes(LABEL_IN_SOURCE)) ?? "";
      if (!s9(l).includes(LABEL_IN_SOURCE)) d.push(`${l} §9 does not print the label from REFEREE_PROMISE_REWORDED_IN`);
      if (s5 === "") d.push(`${l} §5 has no referee-numbers bullet printing the label from REFEREE_PROMISE_REWORDED_IN`);
      if (/\b20[0-9]{2}-[0-9]{2}-[0-9]{2}\b/.test(s9(l))) d.push(`${l} §9 types a version label instead of printing REFEREE_PROMISE_REWORDED_IN — two labels drift apart`);
      if (s9(l).includes(OLD_REFEREE_PROMISE[l])) d.push(`${l} §9 still promises every referee "${OLD_REFEREE_PROMISE[l]}"`);
    }
    if (!isPolicyVersion(label)) d.push(`REFEREE_PROMISE_REWORDED_IN "${label}" is not a version label`);
    else {
      const printed = metaVersion(page);
      if (!isPolicyVersion(printed) || comparePolicyVersions(label, printed) > 0) d.push(`REFEREE_PROMISE_REWORDED_IN names ${label}, later than the version the page prints (${printed || "unread"}) — a promise line in the future`);
      if (!new RegExp(`^## [0-9-]+.*Privacy v${label.replace(/\./g, "\\.")}`, "m").test(decisions)) d.push(`COMPLIANCE-DECISIONS.md has no "Privacy v${label}" heading — the version §9 names has no record`);
    }
    if (!s9("en").includes(KEPT_PROMISE_EN)) d.push(`en §9 does not tell the referees named before the label "${KEPT_PROMISE_EN}"`);
    if (!s9("en").includes(REFEREE_SENTENCES.offers)) d.push(`en §9 does not tell new referees "${REFEREE_SENTENCES.offers}"`);
    if (/\bthis version\b/i.test(s9("en"))) d.push("en §9 names the line as \"this version\" — a later version would move it");
    const says = s9("en").includes(REFEREE_SENTENCES.stop);
    if (stopLinkInOffers(footer) && !says) d.push(`en §9 does not tell new referees "${REFEREE_SENTENCES.stop}" while every offer carries its stop link`);
    if (!stopLinkInOffers(footer) && says) d.push(`en §9 promises "${REFEREE_SENTENCES.stop}" but the offer footer carries no stop link`);
    return d;
  };
  const offerFooter = marketingFooter(footerMeasurementToken(), "SW");
  ok(`§4k en/sw/zh §9 keep the old promise only for referees named before ${REFEREE_PROMISE_REWORDED_IN} (one constant, printed in §5 and §9, recorded, never ahead of the page), and tell those named after management's two sentences while the stop link exists`,
    refereeWordsDefects(pageSrc, offerFooter, REFEREE_PROMISE_REWORDED_IN, decisionsSrc).length === 0,
    refereeWordsDefects(pageSrc, offerFooter, REFEREE_PROMISE_REWORDED_IN, decisionsSrc).join("; "));
  const plantOldPromiseSw = pageSrc.replace("na mara moja maombi yakikataliwa; na unaweza", "na mara moja maombi yakikataliwa; hatuwasiliani nawe kamwe kwa matangazo; na unaweza");
  const plantTypedLabelZh = pageSrc.replace("在本政策 {REFEREE_PROMISE_REWORDED_IN} 版之前，", `在本政策 ${REFEREE_PROMISE_REWORDED_IN} 版之前，`);
  const plantRelative = pageSrc.replace("Until version {REFEREE_PROMISE_REWORDED_IN} of this policy", "Until this version of this policy");
  // (The 10-space indent picks §9's own line: the page's history comment quotes the same sentence.)
  const plantNoStop = pageSrc.replace("          You can stop them at any time with the link in every offer.", "");
  const footerWithoutLink = offerFooter.replace(`${OPTOUT_PATH}${footerMeasurementToken()}`, "");
  ok("§4k control · planted §9 copies found their targets",
    [plantOldPromiseSw !== pageSrc, plantTypedLabelZh !== pageSrc, plantRelative !== pageSrc, plantNoStop !== pageSrc, footerWithoutLink !== offerFooter].every(Boolean));
  ok("§4k control · the old promise made to everyone again (sw) is reported",
    refereeWordsDefects(plantOldPromiseSw, offerFooter, REFEREE_PROMISE_REWORDED_IN, decisionsSrc).some((x) => x.startsWith("sw §9 still promises")));
  ok("§4k control · the label typed into ONE language (zh) instead of printed from the constant is reported",
    refereeWordsDefects(plantTypedLabelZh, offerFooter, REFEREE_PROMISE_REWORDED_IN, decisionsSrc).some((x) => x.startsWith("zh §9")));
  ok("§4k control · the line named as \"this version\" (en) is reported",
    refereeWordsDefects(plantRelative, offerFooter, REFEREE_PROMISE_REWORDED_IN, decisionsSrc).some((x) => x.includes("this version")));
  ok("§4k control · a label later than the page's version, with no COMPLIANCE heading, is reported",
    refereeWordsDefects(pageSrc, offerFooter, "2099-01-01", decisionsSrc).some((x) => x.includes("later than the version the page prints"))
      && refereeWordsDefects(pageSrc, offerFooter, "2099-01-01", decisionsSrc).some((x) => x.includes("has no \"Privacy v2099-01-01\" heading")));
  ok("§4k control · the stop sentence dropped while the stop link exists is reported",
    refereeWordsDefects(plantNoStop, offerFooter, REFEREE_PROMISE_REWORDED_IN, decisionsSrc).some((x) => x.includes("while every offer carries its stop link")));
  ok("§4k control · the stop sentence kept after the footer loses its link is reported",
    refereeWordsDefects(pageSrc, footerWithoutLink, REFEREE_PROMISE_REWORDED_IN, decisionsSrc).some((x) => x.includes("carries no stop link")));
}


console.log(`\n${fail === 0 ? "ALL PASS" : "FAILURES"} — ${pass} passed, ${fail} failed`);
if (pass + fail < 20) { console.error(`!! only ${pass + fail} assertions ran`); process.exit(3); }
process.exit(fail === 0 ? 0 : 1);
