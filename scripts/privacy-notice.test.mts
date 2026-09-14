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
 *   §3 · security (§8): each claim is tied to the code that performs it; the retired claims may not return; the
 *        ISO 27001 / pentest sentence stays, because it rests on the owner's recorded attestation (2026-08-20).
 *   §4 · cookies (§7): a census of every cookie name the code writes, pinned; each is described in all three
 *        locales, with the session cap and the sign-out note's lifetime read from the code, not retyped.
 *
 * ⛔ The privacy page is inline JSX in one file, not dictionary-driven, so `test:i18n` sees none of it (the
 * 2026-08-20 COMPLIANCE-DECISIONS entry). `test:cert-d1` §2b keeps its older negatives; this suite is the gate.
 * ⛔ EVERY CHECK HAS A PLANTED CONTROL (§5): the defect it exists for, re-planted into a copy of today's files.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

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
const PRIVACY_VERSION = "2026-09-14.2";
/** sha256 (first 12 hex) of the ENGLISH content block, whitespace-collapsed. The English text is the binding one. */
const PRIVACY_EN_SHA = "a93e1c374ff2";
/** Every cookie name the code writes, as of v2026-09-14.2. A new one must be described in §7 first. */
const COOKIES = ["kp-kyc-notice", "kp-locale", "kp_admin_totp", "kp_pending_2fa", "kp_revoked", "kp_session"];

const PAGE = "src/app/legal/privacy/page.tsx";
const pageSrc = read(PAGE);

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
const revokedSecs = Number(sessionSrc.match(/jar\.set\("kp_revoked", "1", \{[\s\S]{0,120}?maxAge: (\d+),/)?.[1]);
ok("§4b the session cap and the sign-out note's lifetime were read from the code", ttlDays > 0 && revokedSecs > 0, "", `${ttlDays} days · ${revokedSecs} s`);
/** What §7 must say about each cookie, per locale. */
const COOKIE_WORDS: Record<string, Record<Loc, string[]>> = {
  kp_session: { en: ["sign-in session", `${ttlDays} days`], sw: ["kipindi chako cha kuingia", `siku ${ttlDays}`], zh: ["登录会话", `${ttlDays} 天`] },
  "kp-locale": { en: ["your language"], sw: ["lugha yako"], zh: ["您的语言"] },
  kp_revoked: { en: [`${revokedSecs} seconds`, "signed out"], sw: [`sekunde ${revokedSecs}`, "ulitolewa kwenye akaunti"], zh: [`${revokedSecs} 秒`, "退出登录"] },
  "kp-kyc-notice": { en: ["identity notice"], sw: ["taarifa ya utambulisho"], zh: ["身份提示"] },
  kp_admin_totp: { en: ["staff accounts only", "two-factor"], sw: ["wafanyakazi pekee", "hatua mbili"], zh: ["仅限员工账户", "双重验证"] },
  kp_pending_2fa: { en: ["staff accounts only", "two-factor"], sw: ["wafanyakazi pekee", "hatua mbili"], zh: ["仅限员工账户", "双重验证"] },
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
 * §5 · PLANTED CONTROLS — the defects this suite exists for, re-planted into copies. Each MUST be reported.
 * ══════════════════════════════════════════════════════════════════════════ */
console.log("\n§5 · planted controls");
const plantTls = pageSrc.replace("Connections to our website and app are encrypted in transit with TLS (HTTPS).", "All data in transit over TLS 1.2+.");
const plantProcessor = pageSrc.replace("<li>Postmark, nchini Marekani,", "<li>Huduma ya barua pepe, nchini Marekani,");
const plantTheme = pageSrc.replace("your language, a note kept", "theme preference, your language, a note kept");
const plantWord = pageSrc.replace("We never sell personal data.", "We do not sell personal data.");
const plantVersion = pageSrc.replace('sw: "Toleo 2026-09-14.2 ·', 'sw: "Toleo 2026-09-14 ·');
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

console.log(`\n${fail === 0 ? "ALL PASS" : "FAILURES"} — ${pass} passed, ${fail} failed`);
if (pass + fail < 20) { console.error(`!! only ${pass + fail} assertions ran`); process.exit(3); }
process.exit(fail === 0 ? 0 : 1);
