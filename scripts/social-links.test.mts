/**
 * test:social-links — the 50pick social accounts have ONE home, carry NO share token, open
 * safely, and never appear on a message about harm, a loss or a lockout.
 *
 * WHY THIS GUARD EXISTS (2026-09-12). The links arrived from the owner's phone as
 *   https://www.tiktok.com/@50pick?_r=1&_t=ZS-99fQfSAFFrR
 *   https://www.instagram.com/50pick.tz?stkn=MXJyam1vdDN1bzl4Yg==
 * `_t` and `stkn` are share tokens minted by HIS session, not properties of the accounts.
 * Pasted in as given they would have published a personal token in the page source of every
 * player-facing page on a licensed money platform. §2 exists so that specific paste cannot
 * happen again — not because anyone will remember, but because the build will not take it.
 *
 * §4 is the one that matters most. `/legal/responsible-gambling` §4 publishes a binding
 * promise — "no marketing to self-excluded players or players under 25 in vulnerability
 * segments". A follow-us line at the foot of a self-exclusion confirmation, or of a "you
 * lost" email, is exactly what that promise forbids. E-328 is the standing precedent: the
 * failure on this platform has never been a missing disclosure, it has been the right
 * content in the wrong frame.
 *
 * ─── WHAT THIS GUARD IS, BY THE THREE THINGS A GUARD MUST STATE ───
 *
 *  1. POPULATION — DISCOVERED, NEVER LISTED. Every `instagram.com` / `tiktok.com` literal
 *     in any `.ts`/`.tsx` under `src/`, found by walking the tree. Plus the five email
 *     templates tagged `noPromo`, RENDERED and read as bytes.
 *  2. HEAD COUNT OUTSIDE THE ALLOWED HOME — zero. Before this change the whole repo
 *     contained no social link at all, so the guard lands at zero by construction and any
 *     future literal outside `src/lib/social.ts` is a new one.
 *  3. THE CONTROLS THAT MAKE IT RED — four, one per section, each injecting a synthetic
 *     violation into the DATA the section reads rather than into the tree:
 *        npm run red:social-home    §1  a literal outside social.ts
 *        npm run red:social-token   §2  a `?stkn=` on a canonical URL
 *        npm run red:social-rel     §3  a link that opens a new tab with no `rel`
 *        npm run red:social-promo   §4  a social URL inside a no-promo email
 *     ⛔ Every section also carries a VACUITY FLOOR. A check that passes because it found
 *     nothing to check is not a passing check — §1 fails if the accounts vanish, and §4
 *     fails if a NORMAL email stops carrying the links, which is the only thing that
 *     proves the renderer can see them at all.
 *
 * Run: npm run test:social-links
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { SOCIAL } from "../src/lib/social.ts";
import * as E from "../src/lib/server/email.ts";

const ARG = (f: string) => process.argv.includes(f);
const RED_HOME = ARG("--prove-red-home");
const RED_TOKEN = ARG("--prove-red-token");
const RED_REL = ARG("--prove-red-rel");
const RED_PROMO = ARG("--prove-red-promo");

let pass = 0, fail = 0;
const ok = (m: string) => { pass++; console.log(`  ✓ ${m}`); };
const bad = (m: string) => { fail++; console.log(`  ✗ ${m}`); };
const check = (m: string, cond: boolean, extra = "") => (cond ? ok(m) : bad(`${m}${extra ? ` — ${extra}` : ""}`));
const section = (s: string) => console.log(`\n── ${s} ${"─".repeat(Math.max(0, 64 - s.length))}`);

/** The one file allowed to spell a social URL. */
const HOME = "src/lib/social.ts";
const SOCIAL_HOST = /(?:instagram|tiktok|whatsapp)\.com/;

function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (p.endsWith(".ts") || p.endsWith(".tsx")) out.push(p);
  }
  return out;
}

const files = walk("src");
const hits: { file: string; line: number; text: string }[] = [];
for (const f of files) {
  const rel = f.replace(/\\/g, "/");
  readFileSync(f, "utf8").split(/\r?\n/).forEach((text, i) => {
    if (SOCIAL_HOST.test(text)) hits.push({ file: rel, line: i + 1, text: text.trim() });
  });
}
if (RED_HOME) hits.push({ file: "src/__prove_red__.tsx", line: 1, text: `href="https://www.instagram.com/50pick.tz/"` });

console.log(`\nSOCIAL LINKS — ${files.length} source files walked, ${hits.length} social-host line(s), ${SOCIAL.length} account(s)\n`);

// ─────────────────────────────────────────────────────────── §1 ONE HOME
section("§1 · ONE HOME");
check(
  "the accounts exist at all (vacuity floor)",
  SOCIAL.length >= 2,
  `SOCIAL has ${SOCIAL.length} entr(y|ies) — a guard over an empty set proves nothing`,
);
{
  const strays = hits.filter((h) => h.file !== HOME && !h.text.startsWith("*") && !h.text.startsWith("//"));
  check(
    `no social URL literal outside ${HOME}`,
    strays.length === 0,
    strays.map((s) => `${s.file}:${s.line}`).join(", "),
  );
}

// ────────────────────────────────────────────────────── §2 NO SHARE TOKENS
section("§2 · NO SHARE TOKENS");
{
  const urls = SOCIAL.map((s) => s.url);
  if (RED_TOKEN) urls.push("https://www.instagram.com/50pick.tz?stkn=MXJyam1vdDN1bzl4Yg==");
  const dirty = urls.filter((u) => u.includes("?") || u.includes("&"));
  check(
    "every account URL is canonical — no query string, no share token",
    dirty.length === 0,
    dirty.join(", "),
  );
  const notHttps = urls.filter((u) => !u.startsWith("https://"));
  check("every account URL is https", notHttps.length === 0, notHttps.join(", "));
}

// ──────────────────────────────────────────────────── §3 NEW TAB, SAFELY
section("§3 · NEW TAB, SAFELY");
{
  const FOOTER = "src/components/layout/public-footer.tsx";
  let src = readFileSync(FOOTER, "utf8");
  if (RED_REL) src = src.replace(/rel="noopener noreferrer"\s*/g, "");

  /* The block is the SocialLink recipe — read it, do not assume it.
     ⚠️ ANCHORED ON THE NEXT `function`, NOT ON THE NEXT `\n}`. The obvious non-greedy
     `[\s\S]*?\n\}` stops at the closing brace of the DESTRUCTURED PROPS — `}: { href: … })`
     begins a line with `}` — so it captured the signature and none of the body, and every
     assertion below failed no matter what the file said. Caught by the red controls: a
     check that is red in all four runs is not a working check, it is a broken one that
     happens to look strict. */
  const m = src.match(/function SocialLink\([\s\S]*?(?=\nfunction |\n?$)/);
  check(`${FOOTER} still defines SocialLink (vacuity floor)`, !!m);
  if (m) {
    const body = m[0];
    check("SocialLink opens in a new tab", body.includes('target="_blank"'));
    check("SocialLink carries rel=\"noopener noreferrer\"", body.includes('rel="noopener noreferrer"'));
    check("SocialLink is named for a screen reader", body.includes("aria-label={ariaLabel}"));
    check("SocialLink reaches the 44px tap floor", body.includes("min-h-[44px]"));
  }
}

// ──────────────────────────────────────── §4 NOT ON A NO-PROMO MESSAGE
section("§4 · NOT ON A MESSAGE ABOUT HARM, A LOSS OR A LOCKOUT");
{
  const NO_PROMO: [string, string][] = [
    ["selfExclusionHtml", E.selfExclusionHtml({ period: "6 months", endDate: "12 Mar 2027" })],
    ["coolOffHtml", E.coolOffHtml({ duration: "7 days", endDate: "19 Sep 2026" })],
    ["depositReversedHtml", E.depositReversedHtml({ amount: 50_000, method: "M-Pesa", reference: "txn_a1", gatewayRef: "dep_b2" })],
    ["lossNotificationHtml", E.lossNotificationHtml({ reference: "bet_a1", stake: 10_000, marketTitle: "Simba to win" })],
    ["updownDigestHtml", E.updownDigestHtml({
      dayLabel: "Thu 11 Sep", rounds: 4, wins: 1, losses: 3, refunds: 0,
      wonPayout: 8_000, lostStake: 30_000, refundedStake: 0, staked: 40_000, returned: 8_000, net: -32_000,
    })],
  ];

  // ⭐ THE POSITIVE CONTROL, AND IT IS NOT OPTIONAL. Without it every assertion below
  // passes the day the social row silently stops rendering in email at all — the check
  // would be measuring an absence it caused. A normal email MUST carry the links.
  const promoAllowed = E.depositConfirmedHtml({
    amount: 50_000, method: "M-Pesa", reference: "txn_a1", gatewayRef: "dep_b2", balance: 150_000,
  });
  for (const s of SOCIAL) {
    check(
      `positive control · a normal email carries ${s.labelKey}`,
      promoAllowed.includes(s.url),
      "the renderer cannot see the links, so every check below is vacuous",
    );
  }

  for (const [name, html0] of NO_PROMO) {
    const html = RED_PROMO ? `${html0}<a href="${SOCIAL[0].url}">x</a>` : html0;
    const found = SOCIAL.filter((s) => html.includes(s.url)).map((s) => s.labelKey);
    check(`${name} carries no social link`, found.length === 0, `found ${found.join(", ")}`);
  }
}

// ───────────────────────────────────────────────────────── §5 KEYED COPY
section("§5 · THE LABELS ARE KEYS, NOT LITERALS");
{
  const FOOTER = "src/components/layout/public-footer.tsx";
  const src = readFileSync(FOOTER, "utf8");
  check(
    "the footer takes its social labels from the dictionary",
    src.includes("t.footer[s.labelKey]"),
    "a literal is invisible to test:i18n by construction — see the helpline incident in this file",
  );
  const inlineLiteral = /<[^>]*>\s*(Instagram|TikTok)\s*</.test(src);
  check("no social platform name is hardcoded as rendered text in the footer", !inlineLiteral);
}

console.log(`\n${fail === 0 ? "ALL PASS" : `${fail} FAILED`} — ${pass} passed, ${fail} failed\n`);
process.exit(fail === 0 ? 0 : 1);
