/**
 * ROUND 4 OF THE VISUAL PASS, HELPER I (2026-10-09) — where a player meets the responsible-gambling rules and the bet
 * path: a player on a break, a self-excluded person, the sign-in pages, the limits page and its dialogs, the old bet dial
 * and its confirm and refusal dialogs. Every fix a later edit could silently undo is held here beside a control or a plant
 * that proves the check can fail.
 *
 *   npx tsx scripts/visual-pass-r4i.test.mts        (npm run test:visual-pass-r4i)
 *
 * The owner's rule (Ali, 2026-10-08): only perfect visual and logical results. Each section names the edges tiles the
 * defect was measured on (S/edges/tiles: s1-break 001–110, s2-selfexclude 111–202) and the files that fix it.
 *   §1  one formatter for every break/exclusion end, and the end carried to the pages that did not know it (E9 E16 E17 E52 E55)
 *   §2  the sentences stay whole: the end one run, no line opening on a dash, no last word alone (E17 E20 E55 E56 E57)
 *   §3  the limits page: the break callout at reading size, the two period fields in line and the two buttons one width
 *       (so the forms wrap together), the dialog naming the period (E16 E21 E56)
 *   §4  every confirm's ✕ on its header's centre (E22 E54)
 *   §5  the bet confirm fits the screen, its answers always on it; its amount is an amount (E18 E53)
 *   §6  the old dial: a legible scale, the label beside the pill, the readout, the caption over the button (E18 E53)
 *   §7  the refusal: one of eyebrow and title, and its reason announced (E52)
 *   §8  the deposit-paused notice: the card's width, the way to Withdraw, the same inset above and below (E57)
 *   §9  during a break nothing says "bet now" (E19)
 *   §10 the journey Wallet says why there is no Deposit; Pumzika states the running break (E58)
 *   §11 the auth pages: the rail on the header's edges, the wordmark once; widows; the recovery link; the panel glyph
 *       (E10 E11 E12 E14)
 *   §12 the market's resolution tile says "resolves" in every language (E23)
 *   §13 E35 — a self-excluded person cannot register again with the same phone or email (in-process, the memory store)
 *   §14 R4-K's gold audit on these files: nothing on the auth pages, the paused deposit or a running break is gold but
 *       a money figure; and the code page masks the phone as every other page does
 *   §15 the bell's RG notices carry the end as every screen says it (they printed the UTC day, no time)
 * The mutation proof (each defect planted on disk, the suite failing on its check, the file restored byte-identical) is
 * the scratchpad's `r4i/mutate.cjs`; its result is in R4-I's report.
 */
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { createElement as h, Fragment, isValidElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { decomment, decommentCss } from "./lib/decomment.mts";
import { dict as DICTS } from "../src/lib/i18n-dict.ts";
import { fill } from "../src/lib/utils.ts";
import { formatEatDateTime, formatEatDate } from "../src/lib/eat-day.ts";
import {
  breakEndParam, readBreakEndParam, formatBreakEnd, firstDateSentence, breakSentenceText, breakStateOf, breakStateFromTimers,
} from "../src/lib/break-end.ts";
import { keepText, keptRanges, digitChoice } from "../src/components/ui/keep-run.tsx";
import { renderFailure, failureUntil } from "../src/lib/failure-reasons.ts";
import { accountRefusalPath } from "../src/lib/auth-landing.ts";
import { dialScale, dialTickLabel, dialDetents, DIAL_LABEL_PX } from "../src/components/markets/dial-scale.ts";
import { rgPeriodFieldPx, legendPx, selectPx } from "../src/components/rg/rg-period-width.ts";
import { Callout } from "../src/components/ui/callout.tsx";
import { AuthHeader } from "../src/components/auth/auth-panel.tsx";
import { HubRowItem } from "../src/components/journey/account/hub-row.tsx";
import { loadHubViewer, HUB_VIEWER_DEPS } from "../src/lib/server/hub-viewer.ts";

let pass = 0;
const fails: string[] = [];
const ok = (name: string, cond: boolean, detail = "") => {
  if (cond) { pass++; console.log(`  ok   ${name}`); }
  else { fails.push(`${name}${detail ? ` — ${detail}` : ""}`); console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`); }
};
const section = (s: string) => console.log(`\n── ${s} ${"─".repeat(Math.max(0, 100 - s.length))}`);
const raw = (p: string) => readFileSync(p, "utf8").replace(/\r\n/g, "\n");
/** Source with its comments out (the shared scanner), so a rule quoted in a note is never mistaken for the rule. */
const read = (p: string) => decomment(raw(p));
const CSS = decommentCss(raw("src/app/globals.css"));
const html = (node: ReactNode) => renderToStaticMarkup(h(Fragment, null, node));
const text = (markup: string) => markup.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&#x27;/g, "'").replace(/&quot;/g, '"');
const LOCALES = ["sw", "en", "zh"] as const;
type L = (typeof LOCALES)[number];
const T = { sw: DICTS.sw, en: DICTS.en, zh: DICTS.zh };

// The repo's own fonts (src/lib/server/reports/fonts), advances with kerning — the visual-pass font model (~1% of tiles).
const fontkit = createRequire(import.meta.url)("fontkit") as {
  openSync: (p: string) => { layout: (s: string) => { positions: { xAdvance: number }[] }; unitsPerEm: number };
};
const F = (n: string) => fontkit.openSync(`src/lib/server/reports/fonts/${n}.ttf`);
const inter = F("Inter-Regular"), interBold = F("Inter-Bold");
const IDEO = /[⺀-鿿豈-﫿　-〿＀-￯]/;
const width = (f: ReturnType<typeof F>, s: string, size: number) => f.layout(s).positions.reduce((a, p) => a + p.xAdvance, 0) / f.unitsPerEm * size;
/** A string that may hold ideographs: each ideograph a full em, the rest in the given face. */
const widthMixed = (f: ReturnType<typeof F>, s: string, size: number) =>
  [...s].filter((c) => IDEO.test(c)).length * size + width(f, [...s].filter((c) => !IDEO.test(c)).join(""), size);
/** Sora is not in the repo's font folder: Inter Bold scaled by the two faces' average advance (Sora Bold 0.517em,
 *  Inter Bold 0.492em — next's capsize metrics), less the heading's −0.02em tracking. Calibrated in §2 against the tiles:
 *  it must not read a measured heading narrower than its ink. */
const SORA_CAL = 1.03; // the measured headings' ink + their 2–3px of side bearing, over the bare ratio (2.7′)
const soraW = (s: string, size: number, track = 0) => widthMixed(interBold, s, size) * (0.517 / 0.492) * SORA_CAL + track * size * ([...s].length - 1);
const CAPSIZE = JSON.parse(readFileSync("node_modules/next/dist/server/capsize-font-metrics.json", "utf8")) as Record<string, { capHeight: number; ascent: number; descent: number; unitsPerEm: number }>;
const SORA = CAPSIZE.sora;
/** Where Sora's capitals centre in a line box of `lh` em, from the line's top, in em. */
const soraCapCentreEm = (lh: number) => {
  const a = SORA.ascent / SORA.unitsPerEm, d = -SORA.descent / SORA.unitsPerEm, cap = SORA.capHeight / SORA.unitsPerEm;
  const halfLead = (lh - (a + d)) / 2;
  return halfLead + a - cap / 2;
};
const TW = raw("tailwind.config.ts");
const twStep = (k: string) => Number(new RegExp(`"${k.replace(".", "\\.")}":\\s*"([0-9.]+)px"`).exec(TW)?.[1] ?? NaN);

const NOW = Date.parse("2026-10-09T02:02:00.000Z"); // 05:02 EAT, the tiles' morning
const END_ISO = "2026-10-10T02:05:00.000Z"; // a 24-hour exclusion taken at 05:05 EAT
const END = Date.parse(END_ISO);
const endText = (l: L) => formatBreakEnd(END, NOW, T[l].common.monthsShort, l);

/* ══ §1 · ONE FORMATTER, AND THE END CARRIED ════════════════════════════════════════════════════════════════════════ */
section("1 · one formatter for every break end, the end carried where the page did not know it (E9 E16 E17 E52 E55)");
{
  // 1.1 the format itself — date AND time, the reader's month words, East Africa's clock.
  const got = Object.fromEntries(LOCALES.map((l) => [l, endText(l)]));
  ok("1.1 · the end reads date and time on the East Africa clock, in the reader's month words: sw \"10 Okt, 05:05\", en \"10 Oct, 05:05\", zh \"2026年10月10日 05:05\"",
    got.sw === "10 Okt, 05:05" && got.en === "10 Oct, 05:05" && got.zh === "2026年10月10日 05:05", JSON.stringify(got));
  ok("1.1′ · it IS the deposit page's and the limits callout's formatter (formatEatDateTime), so one end reads one way everywhere",
    LOCALES.every((l) => endText(l) === formatEatDateTime(END, NOW, T[l].common.monthsShort, l)));
  ok("1.1″ CONTROL · the raw URL value it replaces carried no time and no month word", !/\d{2}:\d{2}/.test("2026-10-10") && !/Okt/.test("2026-10-10"));

  // 1.2 what a URL may carry, and what a page may print of it.
  const valid = [readBreakEndParam(END_ISO), readBreakEndParam("2026-10-10")];
  ok("1.2 · `?until=` reads back the canonical instant (with its time) and a bare day from an older link (without)",
    valid[0]?.atMs === END && valid[0]?.withTime === true && valid[1]?.withTime === false && formatBreakEnd(valid[1]!, NOW, T.sw.common.monthsShort, "sw") === "10 Okt");
  const junk = ["2026-02-31", "2026-10-10T25:00:00.000Z", "2026-10-10T02:05:00Z", "7 Oct. To reopen pay TZS 10,000", "", "2026-10-10<script>"];
  const accepted = junk.filter((j) => readBreakEndParam(j) !== null);
  ok("1.2′ · anything else is printed as no date at all: a rolled-over day, an hour of 25, a non-canonical instant, prose", accepted.length === 0, accepted.join(" | "));
  ok("1.2″ · `breakEndParam` writes the canonical instant (and nothing for a value that is not one)",
    breakEndParam("2026-10-10T02:05:00Z") === END_ISO && breakEndParam("soon") === null && breakEndParam(null) === null);

  // 1.3 every door that sends a player to the sign-in page carries the instant, never its UTC day.
  const refusal = accountRefusalPath({ standing: "serving", until: END_ISO }, "");
  ok("1.3 · EXECUTED · accountRefusalPath carries the exclusion's instant", refusal === `/auth/login?excluded=serving&until=${encodeURIComponent(END_ISO)}`, refusal);
  const RG_ACTIONS = read("src/app/profile/responsible-gambling/actions.ts");
  const LOGIN_ACTIONS = read("src/app/auth/login/actions.ts");
  const SESSION_ENDED = read("src/app/auth/session-ended/route.ts");
  const doors = [
    ["the exclusion's own landing", /const endParam = breakEndParam\(untilIso\);[\s\S]{0,120}redirect\(`\/auth\/login\?excluded=serving\$\{until\}`\)/.test(RG_ACTIONS)],
    ["the break's own landing (it carried nothing)", /const res = await coolOff\([\s\S]{0,300}breakEndParam\(res\?\.data\?\.until \?\? null\)[\s\S]{0,200}cooled=1\$\{endParam \? `&until=/.test(RG_ACTIONS)],
    ["the password door and the code door", (LOGIN_ACTIONS.match(/breakEndParam\(result\.detail\?\.until\)/g) ?? []).length === 2],
    // /auth/session-ended — a session that ended because its player self-excluded elsewhere lands on the same panel.
    ["the session-ended door", /const end = standing\.permanent \? null : breakEndParam\(standing\.until\);\s*if \(end\) params\.set\("until", end\);/.test(SESSION_ENDED)],
    ["no door cuts the end to its UTC day", !/until\.slice\(0, 10\)|untilIso\.slice\(0, 10\)/.test(RG_ACTIONS + LOGIN_ACTIONS + SESSION_ENDED + read("src/lib/auth-landing.ts"))],
  ] as const;
  ok("1.4 · every redirect to the sign-in page carries the end as the instant", doors.every(([, k]) => k), doors.filter(([, k]) => !k).map(([n]) => n).join(" · "));
  const planted = RG_ACTIONS.replace("const endParam = breakEndParam(untilIso);", "const endParam = untilIso?.slice(0, 10);");
  ok("1.4′ PLANT · the UTC-day cut put back is reported", /untilIso\?*\.slice\(0, 10\)/.test(planted));

  // 1.5 the sign-in page prints it through the one formatter, in the approved sentences.
  const LOGIN = read("src/app/auth/login/page.tsx");
  ok("1.5 · the sign-in page reads `?until=` through readBreakEndParam and says it with formatBreakEnd",
    LOGIN.includes("const breakEnd = readBreakEndParam(sp.until);") && LOGIN.includes("formatBreakEnd(breakEnd, Date.now(), t.common.monthsShort, locale)")
      && !/sp\.until\.match|\/\^\\d\{4\}-\\d\{2\}-\\d\{2\}\$\/\.test\(sp\.until\)/.test(LOGIN));
  ok("1.5′ · the exclusion panel fills auth.selfExclusionUntilBody; the break panel fills rg.breakActive (its own approved sentence), each falling back to its dateless sentence",
    /keepText\(fill\(t\.auth\.selfExclusionUntilBody, \{ date: breakEndText \}\), \[breakEndText\]\)\s*:\s*keepText\(t\.auth\.selfExclusionBody\)/.test(LOGIN)
      && /keepText\(fill\(t\.rg\.breakActive, \{ date: breakEndText \}\), \[breakEndText\]\)\s*:\s*keepText\(t\.auth\.coolingOffBody\)/.test(LOGIN));
  const cooled = Object.fromEntries(LOCALES.map((l) => [l, fill(T[l].rg.breakActive, { date: endText(l) })]));
  ok("1.5″ · the break panel now names its end in every language (\"…hadi 10 Okt, 05:05…\"); the sentence it replaces named none",
    cooled.sw.includes("hadi 10 Okt, 05:05") && cooled.en.includes("until 10 Oct, 05:05") && cooled.zh.includes("2026年10月10日 05:05")
      && !/\d{2}:\d{2}/.test(T.sw.auth.coolingOffBody));

  // 1.6 the refusal: the instant rides beside the old formatted string, and the surface formats it.
  const refusalObj = { ok: false as const, error: "", code: "SUSPENDED", reason: "cooling_off" as const, detail: { until: "10 Oct 2026, 05:05", untilAt: END_ISO } };
  const sw = renderFailure(refusalObj, T.sw.error as unknown as Record<string, string>, "x", String, (at) => formatBreakEnd(at, NOW, T.sw.common.monthsShort, "sw"));
  const zh = renderFailure(refusalObj, T.zh.error as unknown as Record<string, string>, "x", String, (at) => formatBreakEnd(at, NOW, T.zh.common.monthsShort, "zh"));
  const noWhen = renderFailure(refusalObj, T.sw.error as unknown as Record<string, string>, "x", String);
  ok("1.6 · EXECUTED · the refusal reads \"hadi 10 Okt, 05:05\" in Swahili and \"至 2026年10月10日 05:05\" in Chinese — no English month",
    sw.body.includes("hadi 10 Okt, 05:05") && zh.body.includes("至 2026年10月10日 05:05") && !/Oct 2026/.test(sw.body + zh.body), `${sw.body} | ${zh.body}`);
  ok("1.6′ CONTROL · without the surface's formatter it prints the server's English string, as before (the defect's shape)",
    noWhen.body.includes("hadi 10 Oct 2026, 05:05"), noWhen.body);
  ok("1.6″ · failureUntil: the instant through `when`, else `until`, else \"—\"",
    failureUntil({ until: "u", untilAt: END_ISO }, () => "W") === "W" && failureUntil({ until: "u", untilAt: "nope" }, () => "W") === "u" && failureUntil(undefined) === "—");
  const MS = read("src/lib/server/market-service.ts"), WS = read("src/lib/server/wallet-service.ts");
  ok("1.7 · the betting gate and the deposit gate send the instant (`untilAt`) on both refusals",
    (MS.match(/detail: \{ until, untilAt: lockout\.until! \}/g) ?? []).length === 2 && (WS.match(/detail: \{ until, untilAt: lockout\.until! \}/g) ?? []).length === 2);
  const DIAL = read("src/components/markets/conviction-dial.tsx");
  const surfaces = [
    ["the old dial", /const when = \(at: number\) => formatBreakEnd\(at, Date\.now\(\), t\.common\.monthsShort, locale\);[\s\S]{0,200}renderFailure\([^;]*, when\)/.test(DIAL)],
    ["Up & Down's quick bet", /udBetErrorCopy\(code, serverError, errCopy, r as never, reasonCopy, formatTzs, when\)/.test(read("src/components/updown/use-quick-bet.ts"))
      && /renderFailure\(r as never, reasonDict, m\.udErrInvalid, money, when\)/.test(read("src/components/updown/updown-bet-errors.ts"))
      && ["src/components/updown/round-stake-panel.tsx", "src/components/updown/updown-card.tsx"].every((f) => /when: \(at\) => formatBreakEnd\(at, Date\.now\(\), t\.common\.monthsShort, locale\)/.test(read(f)))],
    ["the deposit action", /errorCopy\(t, result, \(at\) => formatBreakEnd\(at, Date\.now\(\), t\.common\.monthsShort, locale\)\)/.test(read("src/app/wallet/deposit/actions.ts"))],
  ] as const;
  ok("1.8 · every player surface that renders a break refusal hands its reader's formatter in", surfaces.every(([, k]) => k), surfaces.filter(([, k]) => !k).map(([n]) => n).join(" · "));
  const dialPlant = DIAL.replace(", (n) => formatTzs(n), when)", ", (n) => formatTzs(n))");
  ok("1.8′ PLANT · the dial's formatter dropped is reported", !/renderFailure\([^;]*, when\)/.test(dialPlant));
  ok("1.9 · breakStateOf / breakStateFromTimers: an exclusion first, then a break; nothing when neither runs",
    JSON.stringify(breakStateOf({ locked: true, until: END_ISO, reason: "cooling_off" })) === JSON.stringify({ until: END_ISO, exclusion: false })
      && breakStateOf({ locked: false, until: null, reason: null }) === null
      && breakStateFromTimers(END_ISO, END_ISO, NOW)?.exclusion === true && breakStateFromTimers(null, END_ISO, NOW)?.exclusion === false
      && breakStateFromTimers("2026-01-01T00:00:00.000Z", null, NOW) === null);
}

/* ══ §2 · THE SENTENCES STAY WHOLE ══════════════════════════════════════════════════════════════════════════════════ */
section("2 · the end one run, no line opening on a dash, no last word alone — and every kept run fits its line (E17 E20 E55 E56 E57)");
{
  // 2.1 the mechanism, on the sentences the tiles caught.
  const s = fill(T.sw.auth.selfExclusionUntilBody, { date: endText("sw") });
  const m = html(keepText(s, [endText("sw")]));
  ok("2.1 · the text is unchanged, character for character", text(m) === s, text(m));
  ok("2.2 · the end is one unbreakable run (\"2026- / 10-10\" and \"9 / Okt,\" split it)", m.includes(`<span class="whitespace-nowrap">${endText("sw")}</span>`), m);
  ok("2.3 · the dash is held to the word before it, so no line opens on \"—\"", m.includes('<span class="whitespace-nowrap">yenyewe —</span>'), m);
  ok("2.4 · the last two words break together (\"utuombe.\" stood alone)", m.includes('<span class="whitespace-nowrap">itabidi utuombe.</span>'), m);
  const z = fill(T.zh.rg.breakActive, { date: endText("zh") });
  const zm = html(keepText(z, [endText("zh")]));
  ok("2.5 · Chinese: \"——\" held to the character before it, and the last two characters with their stop (\"现。\" stood alone)",
    zm.includes('<span class="whitespace-nowrap">短——</span>') && zm.includes('<span class="whitespace-nowrap">提现。</span>') && text(zm) === z, zm);
  ok("2.6 CONTROL · plain text without these marks is returned as given", keepText("Karibu tena") === "Karibu tena" && keptRanges("ok").length === 0);
  ok("2.7 · the phone hint keeps \"6 au 7\" whole (\"…starting with 6 / or 7\")",
    digitChoice(T.sw.common.phoneInputTitle)[0] === "6 au 7" && digitChoice(T.en.common.phoneInputTitle)[0] === "6 or 7" && digitChoice(T.zh.common.phoneInputTitle)[0] === "6 或 7");

  // 2.8 every kept run must be narrower than the narrowest line it can get (320 phones), or it would overflow.
  type Surface = { name: string; line: number; size: number; face: "inter" | "sora"; sentences: (l: L) => Array<{ text: string; runs: string[] }> };
  const withEnd = (tpl: string, l: L) => ({ text: fill(tpl, { date: endText(l) }), runs: [endText(l)] });
  const SURF: Surface[] = [
    // AuthShell's 16px gutter, AuthPanel's 32px padding, the panel's 14px padding + border, the 16px glyph and its 10px gap.
    { name: "sign-in panel body (320)", line: 320 - 32 - 64 - 28 - 2 - 26, size: 13, face: "inter", sentences: (l) => [
      withEnd(T[l].auth.selfExclusionUntilBody, l), withEnd(T[l].rg.breakActive, l),
      { text: T[l].auth.selfExclusionBody, runs: [] }, { text: T[l].auth.selfExclusionEndedBody, runs: [] },
      { text: T[l].auth.selfExclusionPermanentBody, runs: [] }, { text: T[l].auth.coolingOffBody, runs: [] }] },
    // the form column's 288px, the stack Callout's border and 32px padding.
    { name: "deposit-paused notice (320)", line: 288 - 2 - 64, size: 13, face: "inter", sentences: (l) => [withEnd(T[l].rg.breakActive, l), withEnd(T[l].rg.exclusionActive, l)] },
    // the md Callout: border, 20px sides, the 17px glyph and its 16px gap.
    { name: "limits-page callout (320)", line: 288 - 2 - 40 - 17 - 16, size: 13, face: "inter", sentences: (l) => [withEnd(T[l].rg.breakActive, l), withEnd(T[l].rg.exclusionActive, l)] },
    // the refusal dialog: 288px panel, 32px padding.
    { name: "bet refusal subtitle (320)", line: 288 - 64, size: 13, face: "inter", sentences: (l) => [
      { text: fill(T[l].error.failCoolingOff.replace("{until}", "{date}"), { date: endText(l) }), runs: [endText(l)] },
      { text: fill(T[l].error.failSelfExcluded.replace("{until}", "{date}"), { date: endText(l) }), runs: [endText(l)] }] },
    // the journey Wallet: 20px sheet sides, the notice's 16px padding.
    { name: "Wallet sheet notice (320)", line: 320 - 40 - 32, size: 13, face: "inter", sentences: (l) => [withEnd(T[l].rg.breakActive, l)] },
    // the hub row's text column: gutter, border, 16px row sides, the 20px glyph, 12px gaps, the 18px chevron.
    { name: "hub Pumzika status (320)", line: 320 - 32 - 2 - 32 - 20 - 12 - 18 - 12, size: 13, face: "inter", sentences: (l) => [
      { text: fill(firstDateSentence(T[l].rg.breakActive)!, { date: endText(l) }), runs: [endText(l)] }] },
    // the home's held box: the hero column's 288px less its 16px padding and border.
    { name: "home break notice (320)", line: 288 - 32 - 2, size: 13, face: "inter", sentences: (l) => [withEnd(T[l].rg.breakActive, l)] },
    // the market page's Your positions card: border and 24px padding.
    { name: "market Your positions (320)", line: 288 - 2 - 48, size: 13, face: "inter", sentences: (l) => [withEnd(T[l].rg.breakActive, l)] },
    // the RG confirm: 288px panel, 24px padding.
    { name: "RG confirm body (320)", line: 288 - 48, size: 13.5, face: "inter", sentences: (l) => [{ text: T[l].rg.breakDescription, runs: [] }, { text: T[l].rg.selfExcludeDescription, runs: [] }] },
    // the bet confirm's exit box: 288 panel, 24px body sides, the box's border and 16px sides, the 13px glyph and its 12px gap.
    { name: "bet confirm disclosures (320)", line: 288 - 48 - 2 - 32 - 13 - 12, size: 13, face: "inter", sentences: (l) => [
      { text: T[l].dialog.estimateDisclaimer, runs: [] }, { text: T[l].dialog.payoutCalcBody, runs: [] }, { text: T[l].market.thinUpsideNote, runs: [] },
      { text: T[l].market.crowdedWarning, runs: [] }, { text: T[l].dialog.poolSharePayout, runs: [] }] },
    // the sign-in heading: 224px, Sora 28px bold.
    { name: "auth heading (320)", line: 320 - 32 - 64, size: 28, face: "sora", sentences: (l) => [{ text: T[l].auth.welcomeTo50pick, runs: [] }, { text: T[l].auth.welcomeBack, runs: [] }] },
    { name: "auth subtitle (320)", line: 320 - 32 - 64, size: 13.5, face: "inter", sentences: (l) => [{ text: T[l].auth.emailOrPhoneHint, runs: [] }] },
  ];
  const over: string[] = [];
  let widest = { w: 0, what: "" };
  for (const sf of SURF) {
    for (const l of LOCALES) {
      for (const { text: s2, runs } of sf.sentences(l)) {
        for (const [a, b] of keptRanges(s2, runs)) {
          const run = s2.slice(a, b);
          const w = sf.face === "sora" ? soraW(run, sf.size, -0.02) : widthMixed(inter, run, sf.size);
          if (w / sf.line > widest.w) widest = { w: w / sf.line, what: `${sf.name} ${l} "${run}" ${w.toFixed(0)}/${sf.line}px` };
          if (w > sf.line) over.push(`${sf.name} ${l} "${run}" ${w.toFixed(0)}px > ${sf.line}px`);
        }
      }
    }
  }
  // The heading model's calibration: "Karibu tena" and "Welcome back" (Sora 28px bold, tracked −0.02em) ink 158px and 208px
  // on tiles 113 and 116 — their advances are 2–3px wider than their ink. The model must not read them narrower.
  const cal = [soraW("Karibu tena", 28, -0.02), soraW("Welcome back", 28, -0.02)];
  ok(`2.7′ · the heading model is calibrated on the tiles: "Karibu tena" ${cal[0].toFixed(0)}px (ink 158), "Welcome back" ${cal[1].toFixed(0)}px (ink 208) — never narrower than ink + 2px, within 6%`,
    cal[0] >= 160 && cal[0] <= 158 * 1.06 && cal[1] >= 210 && cal[1] <= 208 * 1.06);
  ok(`2.8 · every kept run fits its narrowest line, in every language (widest: ${widest.what})`, over.length === 0, over.join(" | "));
  const plantRun = "Kujitenga kwako kunaendelea hadi 10 Okt 2026 saa kumi na moja asubuhi kwa saa za Afrika Mashariki";
  ok("2.8′ PLANT · a run wider than the line is reported", widthMixed(inter, plantRun, 13) > 168);

  // 2.9 the call sites use it.
  const sites: Array<[string, string, RegExp]> = [
    ["the deposit notice", "src/app/wallet/deposit/page.tsx", /keepText\(fill\(breakIsExclusion \? t\.rg\.exclusionActive : t\.rg\.breakActive, \{ date: breakEndText \?\? "" \}\), breakEndText \? \[breakEndText\] : \[\]\)/],
    ["the limits page", "src/app/profile/responsible-gambling/page.tsx", /return keepText\(fill\(template, \{ date \}\), \[date\]\);/],
    ["the refusal subtitle", "src/components/markets/conviction-dial.tsx", /: keepText\(resultData\.error \?\? t\.common\.stakeHasntMoved, resultData\.keep\)/],
    ["the RG confirm", "src/components/rg/rg-confirm-submit.tsx", /typeof body === "string" \? <p>\{keepText\(body\)\}<\/p> : body/],
    ["the thin-upside notice", "src/components/markets/house-lean-warning.tsx", /title=\{keepText\(t\.market\.crowdedWarning\)\}[\s\S]{0,200}\{keepText\(t\.market\.thinUpsideNote\)\}/],
    ["the auth heading", "src/components/auth/auth-panel.tsx", /typeof title === "string" \? keepText\(title\) : title/],
  ];
  const missing = sites.filter(([, f, re]) => !re.test(read(f))).map(([n]) => n);
  ok("2.9 · the sentences the tiles caught are drawn through keepText", missing.length === 0, missing.join(" · "));
}

/* ══ §3 · THE LIMITS PAGE ═════════════════════════════════════════════════════════════════════════════════════════════ */
section("3 · the limits page: the callout at reading size, the two forms in line, the dialog names the period (E16 E21 E56)");
{
  const RG = read("src/app/profile/responsible-gambling/page.tsx");
  const CALL = read("src/components/ui/callout.tsx");
  const sizeOf = (rung: string) => Number(new RegExp(`"?${rung}"?:\\s*\\["([0-9.]+)px"`).exec(TW)?.[1] ?? NaN);
  const mdBody = /md:\s*\{[^}]*body:\s*"([^"]+)"/.exec(CALL)?.[1] ?? "";
  const smBody = /sm:\s*\{[^}]*body:\s*"([^"]+)"/.exec(CALL)?.[1] ?? "";
  const px = (cls: string) => sizeOf((/text-(caption|body-sm|label|micro|body)\b/.exec(cls) ?? [])[1] ?? "");
  ok("3.1 · the break and exclusion callouts take the md rung: 13px body, over the 12.5px floor (they were sm: 11px, caps 8px)",
    (RG.match(/<Callout tone="neutral" size="md" glyph="(lock|pause)">\{endSentence\(t\.rg\.(exclusionActive|breakActive), rg\.(selfExclusionUntil|coolingOffUntil)\)\}<\/Callout>/g) ?? []).length === 2
      && px(mdBody) === 13 && px(mdBody) >= 12.5, `md "${mdBody}" = ${px(mdBody)}px`);
  ok("3.1′ CONTROL · the sm rung they wore is under the floor", px(smBody) === 11 && px(smBody) < 12.5, `sm "${smBody}" = ${px(smBody)}px`);
  const planted = RG.replace('<Callout tone="neutral" size="md" glyph="pause">{endSentence(t.rg.breakActive', '<Callout tone="neutral" glyph="pause">{endSentence(t.rg.breakActive');
  ok("3.1″ PLANT · the break callout back on the sm rung is reported", (planted.match(/size="md" glyph="(lock|pause)">\{endSentence/g) ?? []).length !== 2);

  // 3.2 one width for both period fields; both buttons start on one x.
  const widths = Object.fromEntries(LOCALES.map((l) => {
    const t = T[l];
    return [l, rgPeriodFieldPx([t.rg.breakLength, t.rg.exclusionPeriod], [t.rg.dur1hour, t.rg.dur24h, t.rg.dur1week, t.rg.dur1month, t.rg.dur6months, t.common.permanent])];
  }));
  ok("3.2 · the legends measure as the tile does: \"UREFU WA MAPUMZIKO\" 133px, \"KIPINDI CHA KUJIZUIA\" 148px (tile 001: x41–173, x41–188)",
    Math.round(legendPx(T.sw.rg.breakLength)) === 133 && Math.round(legendPx(T.sw.rg.exclusionPeriod)) === 148);
  ok(`3.3 · both fields take one width per language — sw ${widths.sw}px, en ${widths.en}px, zh ${widths.zh}px — every legend and option fits it`,
    LOCALES.every((l) => {
      const t = T[l];
      return [t.rg.breakLength, t.rg.exclusionPeriod].every((s) => legendPx(s) <= widths[l] + 1e-6)
        && [t.rg.dur1hour, t.rg.dur24h, t.rg.dur1week, t.rg.dur1month, t.rg.dur6months, t.common.permanent].every((s) => selectPx(s) <= widths[l] + 1e-6);
    }));
  const forms = RG.match(/<form action=\{(coolOffAction|selfExcludeAction)\} className="flex flex-wrap items-end gap-2">\s*(?:\{\s*\}\s*)?<div style=\{\{ width: periodFieldPx \}\}>/g) ?? [];
  ok("3.4 · both forms' fields wear that width, so both buttons start at x41 + W + 12 (sw at 390: x201, where they stood at x186 and x201)",
    forms.length === 2 && /const periodFieldPx = rgPeriodFieldPx\(\s*\[t\.rg\.breakLength, t\.rg\.exclusionPeriod\],\s*\[\.\.\.COOLING_OFF_OPTIONS, \.\.\.SELF_EXCLUSION_OPTIONS\]\.map\(\(o\) => o\.label\),\s*\);/.test(RG)
      && 41 + widths.sw + twStep("2") === 201, `forms ${forms.length}, sw button x${41 + widths.sw + twStep("2")}`);
  const oneForm = RG.replace("<div style={{ width: periodFieldPx }}>", "<div>");
  ok("3.4′ PLANT · one form back on its legend's width is reported (x186 against x201)",
    (oneForm.match(/<div style=\{\{ width: periodFieldPx \}\}>/g) ?? []).length === 1 && Math.round(41 + legendPx(T.sw.rg.breakLength) + 12) === 186);

  // 3.5 the dialog names the period picked.
  const SUB = read("src/components/rg/rg-confirm-submit.tsx");
  ok("3.5 · the confirm reads the picked option when it opens, by the form field's value, and shows the form's own legend over it",
    /onOpen=\{snapshot\}/.test(SUB) && /closest\("form"\)\?\.elements\.namedItem\(choice\.field\)/.test(SUB)
      && /<FieldLegend as="span" className="block">\{choice\.label\}<\/FieldLegend>/.test(SUB) && /\{picked\}<\/span>/.test(SUB));
  ok("3.6 · both forms hand their field, legend and options in (Pumzika: \"Urefu wa mapumziko\" · \"Saa 1\"; Jizuie its own)",
    /choice=\{\{ field: "period", label: t\.rg\.breakLength, options: COOLING_OFF_OPTIONS\.map/.test(RG) && /choice=\{\{ field: "period", label: t\.rg\.exclusionPeriod, options: SELF_EXCLUSION_OPTIONS\.map/.test(RG));
  ok("3.6′ PLANT · a dialog without the snapshot is reported", !/onOpen=\{snapshot\}/.test(SUB.replace("onOpen={snapshot}", "")));

  // 3.7 ONE BUTTON WIDTH. Each form is field (W) + 12 + its button; with two button widths the forms wrap at two screen
  // widths, and between them one button falls under its field while the other stands beside it. Each trigger now reserves
  // the other's label (`widthOf`) — invisible, aria-hidden, as CSS generated content — so both are the wider one.
  const { RgConfirmSubmit } = await import("../src/components/rg/rg-confirm-submit.tsx");
  const { I: Glyph } = await import("../src/components/ui/glyphs.tsx");
  const trigger = (label: string, widthOf?: string) => renderToStaticMarkup(h("form", null, h(RgConfirmSubmit as never,
    { label, body: "b", icon: h(Glyph.pause, { s: 13 }), buttonClass: "btn btn-ghost btn-md", ...(widthOf ? { widthOf } : {}) })));
  const brk = trigger(T.sw.common.startABreak, T.sw.common.selfExclude);
  const reserveCls = 'aria-hidden="true" data-reserve="Jizuie" class="invisible col-start-1 row-start-1 inline-flex items-center gap-1.5 after:content-[attr(data-reserve)]"';
  ok("3.7 · EXECUTED · the break's trigger reads \"Pumzika\" alone (its text, its name, what a drive's has-text finds), and holds \"Jizuie\" only as an aria-hidden, invisible strut's generated content in the same grid cell",
    text(brk).includes("Pumzika") && !text(brk).includes("Jizuie") && brk.includes(reserveCls)
      && /<span class="grid justify-items-center"><span class="col-start-1 row-start-1 inline-flex items-center gap-1\.5">/.test(brk), brk);
  ok("3.7′ CONTROL · without `widthOf` the trigger draws its icon and label as before, no strut", !trigger("Pumzika").includes("data-reserve") && text(trigger("Pumzika")).includes("Pumzika"));
  // The model: .btn-md's padding and size from the stylesheet, its 1px border, the 13px glyph and the 8px gap, the label
  // at Inter 600 (between the repo's Regular and Bold faces).
  const btnMd = /\.btn-md \{[^}]*padding: 0 (\d+)px; font-size: ([\d.]+)px;/.exec(CSS);
  const pad = Number(btnMd?.[1] ?? NaN), fs = Number(btnMd?.[2] ?? NaN);
  const contentPx = (s: string) => 13 + twStep("1.5") + (widthMixed(inter, s, fs) + widthMixed(interBold, s, fs)) / 2;
  const buttonPx = (label: string, reserve: string | null) => 2 + 2 * pad + Math.max(contentPx(label), reserve ? contentPx(reserve) : 0);
  /** Which of the page's two triggers reserve the other's label, read from the page as written. */
  const reservesOf = (src: string) => {
    // The call, from its opening to the end of its form (its icon prop holds a "/>" of its own).
    const call = (lbl: string) => {
      const at = src.indexOf(`<RgConfirmSubmit label={t.common.${lbl}}`);
      return at < 0 ? "" : src.slice(at, src.indexOf("</form>", at));
    };
    return { brk: /widthOf=\{t\.common\.selfExclude\}/.test(call("startABreak")), ex: /widthOf=\{t\.common\.startABreak\}/.test(call("selfExclude")) };
  };
  /** The band of screen widths (px) where one form wraps and the other does not: the difference of their widths. */
  const band = (src: string, l: L) => {
    const t = T[l], r = reservesOf(src);
    const a = widths[l] + twStep("2") + buttonPx(t.common.startABreak, r.brk ? t.common.selfExclude : null);
    const b = widths[l] + twStep("2") + buttonPx(t.common.selfExclude, r.ex ? t.common.startABreak : null);
    return Math.abs(a - b);
  };
  const now = Object.fromEntries(LOCALES.map((l) => [l, band(RG, l)]));
  const before = Object.fromEntries(LOCALES.map((l) => [l, band(RG.replace(/\n\s*widthOf=\{t\.common\.(selfExclude|startABreak)\}/g, ""), l)]));
  ok(`3.7″ · both forms pass the other's label, so the two are one width in every language and wrap at one screen width (band ${JSON.stringify(now)}px)`,
    reservesOf(RG).brk && reservesOf(RG).ex && LOCALES.every((l) => now[l] === 0) && Number.isFinite(pad) && pad === 16 && fs === 14, JSON.stringify(reservesOf(RG)));
  ok(`3.7‴ CONTROL · with the labels' own widths the forms part for ${before.sw.toFixed(1)}px of screen width in Swahili (337–354), ${before.en.toFixed(1)} in English`,
    before.sw > 15 && before.en > 0);
  // The narrower label's trigger is the one whose reserve matters today (Jizuie's); 3.7″ also asks for both, so a future
  // label that turns the order round is held too.
  const oneOnly = RG.replace(/\n\s*widthOf=\{t\.common\.startABreak\}/, "");
  ok("3.7⁗ PLANT · Jizuie's trigger without its reserve is reported (the Swahili band is back)", band(oneOnly, "sw") > 15 && !reservesOf(oneOnly).ex);
}

/* ══ §4 · THE ✕ ON ITS HEADER'S CENTRE ════════════════════════════════════════════════════════════════════════════════ */
section("4 · every confirm's ✕ on its header's centre, and the header no taller for it (E22 E54)");
{
  const MOD = read("src/components/ui/modal.tsx");
  const confirmOf = (src: string) => src.slice(src.indexOf("export function ConfirmModal("));
  /** A margin utility's signed px on the overridden scale ("-mt-1" → −4, "mt-1" → 4), 0 when the class is absent. */
  const margin = (cls: string, side: string) => {
    const m = new RegExp(`(?:^|\\s)(-?)${side}-([0-9.]+)(?=\\s|$)`).exec(cls);
    return m ? (m[1] ? -1 : 1) * twStep(m[2]) : 0;
  };
  const BOX = twStep("8"); // the ✕'s 48px box (h-8 w-8)
  // ConfirmModal: the medallion is 36px, 2px down; the ✕ is CloseX (48px), in the header row after the text.
  const medallionTop = twStep("0.5"), medallionCentre = medallionTop + 36 / 2;
  const confirmX = (src: string) => {
    const c = confirmOf(src);
    const cls = /\{!loading && <CloseX onClick=\{onClose\} label=\{t\.common\.close\} className="([^"]+)" \/>\}/.exec(c)?.[1];
    const wired = /showClose=\{false\}/.test(c) && /className="mt-0\.5 shrink-0 inline-flex h-\[36px\] w-\[36px\]/.test(c)
      && /function CloseX\([\s\S]*?className=\{`\$\{className\} inline-flex h-8 w-8 items-center justify-center rounded-md/.test(src);
    if (!cls || !wired) return null;
    const top = margin(cls, "mt"), bottom = margin(cls, "mb");
    const lgRight = /(?:^|\s)lg:-mr-([0-9.]+)/.exec(cls);
    return { centre: top + BOX / 2, occupies: BOX + top + bottom, insetPhone: twStep("5") + margin(cls, "mr"), insetLg: twStep("6") - (lgRight ? twStep(lgRight[1]) : 0) };
  };
  const cx = confirmX(MOD);
  ok(`4.1 · ConfirmModal: the ✕ centres ${cx?.centre}px down the header row — the medallion's centre (${medallionCentre}px) — at every padding`,
    !!cx && Math.abs(cx.centre - medallionCentre) < 0.01, JSON.stringify(cx));
  ok(`4.1′ · …and takes ${cx?.occupies}px of the row, no more than the medallion's ${medallionTop + 36}: the row is as tall as it was, with or without the ✕ (it is withdrawn while a request is in flight)`,
    !!cx && cx.occupies <= medallionTop + 36);
  ok(`4.1″ · it stands ${cx?.insetPhone}px / ${cx?.insetLg}px inside the panel's right edge (phone / from 1024) — where Modal pins every other dialog's (right-3, 16px)`,
    !!cx && cx.insetPhone === 16 && cx.insetLg === 16 && /\{showClose && <CloseX onClick=\{onClose\} label=\{t\.common\.close\} className="absolute right-3 top-3" \/>\}/.test(MOD) && twStep("3") === 16);
  // Modal's own ✕: top-3 (16) + 24 = 40 from the panel's top; the header's centre is padding + 20: 44 on a phone, 52 from 1024.
  const old = { phone: twStep("5") + medallionCentre - (twStep("3") + BOX / 2), lg: twStep("6") + medallionCentre - (twStep("3") + BOX / 2) };
  ok(`4.1‴ CONTROL · Modal's pinned ✕ stood ${old.phone}px above the header on a phone (measured on 002: ✕ y270–279, medallion y261–296) and ${old.lg}px from 1024`,
    old.phone === 4 && old.lg === 12);
  const noRise = confirmX(MOD.replace('className="-mt-1 -mb-1.5 -mr-1.5 lg:-mr-3 shrink-0"', 'className="-mb-1.5 -mr-1.5 lg:-mr-3 shrink-0"'));
  const grows = confirmX(MOD.replace('className="-mt-1 -mb-1.5 -mr-1.5 lg:-mr-3 shrink-0"', 'className="-mt-1 -mr-1.5 lg:-mr-3 shrink-0"'));
  ok(`4.1⁗ PLANT · the ✕ without its 4px rise (centre ${noRise?.centre} against ${medallionCentre}) and without its bottom give-back (${grows?.occupies}px of the row) are each reported`,
    !!noRise && Math.abs(noRise.centre - medallionCentre) >= 0.01 && !!grows && grows.occupies > medallionTop + 36);

  // BetConfirmModal: its own ✕, in the row beside the eyebrow (14px line) and the title (Sora 15px, leading-snug 1.375).
  const BCM = read("src/components/markets/bet-confirm-modal.tsx");
  const capCentre = 14 + twStep("1") + soraCapCentreEm(1.375) * 15;
  const betX = (src: string) => {
    const cls = /aria-label=\{t\.common\.cancel\}\s*className="([^"]*?)\s*inline-flex h-8 w-8 items-center justify-center rounded-md text-text-subtle/.exec(src)?.[1];
    return cls === undefined ? null : { centre: margin(cls, "mt") + BOX / 2, occupies: BOX + margin(cls, "mt") + margin(cls, "mb") };
  };
  const bx = betX(BCM);
  ok(`4.2 · the bet confirm's ✕ centres ${bx?.centre}px down, on the title's capitals (${capCentre.toFixed(2)}px: Sora caps centre ${soraCapCentreEm(1.375).toFixed(4)}em in a 1.375 line), and still takes ${bx?.occupies}px of the row`,
    !!bx && Math.abs(bx.centre - capCentre) < 0.5 && bx.occupies === BOX, JSON.stringify(bx));
  const betOld = betX(BCM.replace('className="mt-1 -mb-1 shrink-0 inline-flex', 'className="shrink-0 inline-flex'));
  ok(`4.2′ CONTROL/PLANT · without the 4px it centres ${betOld?.centre}px, ${(capCentre - (betOld?.centre ?? 0)).toFixed(2)}px above the capitals (068: ✕ ink y64–73, the title's first line y66–78)`,
    !!betOld && Math.abs(betOld.centre - capCentre - -3.94) < 0.05);
  const betGrows = betX(BCM.replace('className="mt-1 -mb-1 shrink-0 inline-flex', 'className="mt-1 shrink-0 inline-flex'));
  ok(`4.2″ PLANT · the 4px not given back (${betGrows?.occupies}px: a one-line title's row 4px taller) is reported`, !!betGrows && betGrows.occupies !== BOX);
}

/* ══ §5 · THE BET CONFIRM FITS ════════════════════════════════════════════════════════════════════════════════════════ */
section("5 · the bet confirm fits the screen and keeps its answers on it; its amount is an amount (E18 E53)");
{
  const BCM = read("src/components/markets/bet-confirm-modal.tsx");
  // Modal's wrapper pads a plain dialog `px-3 py-4`: the panel's room is the screen less py-4 above and below. A cap that
  // leaves less (32px for 40) lets the wrapper scroll by the difference and puts the panel off-centre.
  const wrapPy = /: sheet \? "items-end sm:items-center px-0 sm:px-3 py-0 sm:py-4" : "px-3 py-(\d+(?:\.5)?)"/.exec(read("src/components/ui/modal.tsx"))?.[1] ?? "";
  const room = 2 * twStep(wrapPy);
  const cap = Number(/panelClassName="overflow-hidden !p-0 flex flex-col max-h-\[calc\(100dvh-(\d+)px\)\]"/.exec(BCM)?.[1] ?? NaN);
  ok(`5.1 · the panel is a column no taller than the screen less Modal's wrapper padding (py-${wrapPy}: ${room}px) — cap ${cap}px`,
    room === 40 && cap === room, `room ${room}, cap ${cap}`);
  const capOf = (src: string) => Number(/panelClassName="overflow-hidden !p-0 flex flex-col max-h-\[calc\(100dvh-(\d+)px\)\]"/.exec(src)?.[1] ?? NaN);
  ok("5.1′ PLANT · a cap that ignores the wrapper's 20px (100dvh − 32px: the wrapper scrolls 8px, the panel 12px from the bottom, 20 from the top) is reported",
    capOf(BCM.replace("max-h-[calc(100dvh-40px)]", "max-h-[calc(100dvh-32px)]")) !== room);
  const body = /<div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pt-5 pb-4 lg:px-6 lg:pt-6" data-testid="bet-confirm-body">/.exec(BCM);
  const footAt = BCM.indexOf('data-testid="bet-confirm-actions"');
  const confirmAt = BCM.indexOf("ref={confirmRef}"), cancelAt = BCM.indexOf("ref={cancelRef}"), noteAt = BCM.indexOf("t.dialog.poolSharePayout");
  const leanAt = BCM.indexOf("<HouseLeanWarning level={lean} />");
  /** Where the `<div` opened at `from` closes (balanced over `<div …>` / `</div>`, self-closing divs skipped). */
  const divClose = (src: string, from: number) => {
    const re = /<div\b[^>]*?(\/?)>|<\/div>/g;
    re.lastIndex = from;
    let depth = 0;
    for (let m = re.exec(src); m; m = re.exec(src)) {
      if (m[0] === "</div>") { if (--depth === 0) return m.index; }
      else if (m[1] !== "/") depth++;
    }
    return -1;
  };
  const bodyClose = body ? divClose(BCM, body.index) : -1;
  ok("5.2 · the disclosures scroll in the body; the quote clock, Confirm, Ghairi and the footnote stand in the footer, always in view",
    !!body && footAt > leanAt && leanAt > (body?.index ?? 1e9) && bodyClose > leanAt && bodyClose < footAt && confirmAt > footAt && cancelAt > confirmAt && noteAt > cancelAt
      && /className="shrink-0 border-t border-border px-5 pt-3 lg:px-6 pb-\[calc\(env\(safe-area-inset-bottom,0px\)\+20px\)\]"/.test(BCM));
  // The footer's height at 360×780 in each language: pt 16, the clock caption (12px, 18px lines), 24, 48 + 12 + 48, 10, the
  // footnote (13px, 18px lines), 20. The panel is 780 − 40 = 740px; the body keeps the rest.
  const capLine = 288 + 72 - 32 - 48 - 14 - 12; // 360 wide: panel 328, 24px sides, the 14px glyph and its 12px gap
  const footLines = (l: L) => {
    const t = T[l];
    const cap = `${t.dialog.quoteHeldFor} 10s · ${t.dialog.thenReaim}`;
    const capN = Math.ceil(widthMixed(inter, cap, 12) / capLine);
    const noteN = Math.ceil(widthMixed(inter, t.dialog.poolSharePayout, 13) / (328 - 48));
    return twStep("3") + capN * 18 + twStep("5") + 48 + twStep("2") + 48 + 10 + noteN * 18 + 20;
  };
  const feet = Object.fromEntries(LOCALES.map((l) => [l, footLines(l)]));
  const panelH = 780 - room;
  ok(`5.3 · at 360×780 the footer is at most 40% of the ${panelH}px panel and the disclosures keep ≥ 440px (sw ${feet.sw}, en ${feet.en}, zh ${feet.zh}px)`,
    LOCALES.every((l) => feet[l] <= 0.4 * panelH && panelH - feet[l] >= 440), JSON.stringify(feet));
  const plant = BCM.replace(' flex flex-col max-h-[calc(100dvh-40px)]"', '"');
  ok("5.3′ PLANT · the panel's cap removed is reported (it grows past the screen and Ghairi leaves it)", Number.isNaN(capOf(plant)));
  ok("5.4 · \"Possible winnings TZS 1,500\" is an amount (mono, tabular, never split) in the dialog and in the dial",
    /<p className="amount text-\[18px\] font-bold tabular-nums text-text leading-none">\s*TZS \{formatNumber\(Math\.round/.test(BCM)
      && /<p className="amount text-\[18px\] font-bold tabular-nums text-text leading-none">\s*TZS \{formatNumber\(estimate\)\}/.test(read("src/components/markets/conviction-dial.tsx"))
      && /\.amount\.amount \{ font-family: var\(--font-mono\);[^}]*white-space: nowrap;/.test(CSS));
  ok("5.5 · the title, the exit terms (\"5 minutes\" one run), the disclosures and the footnote are kept whole",
    /\{keepText\(marketTitle\)\}/.test(BCM) && /keepText\(freeExitBody, exitMinsRun \? \[exitMinsRun\] : \[\]\)/.test(BCM)
      && /\{keepText\(t\.dialog\.poolSharePayout\)\}/.test(BCM) && /\{keepText\(t\.dialog\.estimateDisclaimer\)\}/.test(BCM));
  const run = new RegExp(`\\S+\\s+5\\s+\\S+`).exec(fill(T.en.dialog.freeExitBodyLocked, { mins: 5, lock: 5, pct: 9 }))?.[0];
  ok(`5.5′ · the exit run is "${run}" in English, "${new RegExp(`\\S+\\s+5\\s+\\S+`).exec(fill(T.sw.dialog.freeExitBodyLocked, { mins: 5, lock: 5, pct: 9 }))?.[0]}" in Swahili`, !!run && run.includes("5 minutes"));
  const titleRuns = keptRanges("Simba SC wins the NBC Premier League 2026-27").map(([a, b]) => "Simba SC wins the NBC Premier League 2026-27".slice(a, b));
  ok("5.6 · the market title's season never stands alone (\"League 2026-27\" one run; zh \"联赛2026-27\")",
    titleRuns.includes("League 2026-27") && keptRanges("辛巴SC赢得NBC超级联赛2026-27").some(([a, b]) => "辛巴SC赢得NBC超级联赛2026-27".slice(a, b) === "联赛2026-27"));
}

/* ══ §6 · THE OLD DIAL ═══════════════════════════════════════════════════════════════════════════════════════════════ */
section("6 · the old dial: a legible scale, the label beside the pill, the readout, the caption over the button (E18 E53)");
{
  const DIAL = read("src/components/markets/conviction-dial.tsx");
  // 6.1 the scale.
  const widthsPx = [238, 278, 308, 294]; // the track at 320, 360, 390 and the 1280 rail (content widths)
  const PAD = 40, KNOB = 28;
  const problems: string[] = [];
  for (const w of widthsPx) {
    const s = dialScale({ width: w, pad: PAD, knobR: KNOB, baseStake: 1000, maxMultiplier: 1000 });
    const scale = w / (w + 2 * PAD);
    if (Math.abs(s.fontSize * scale - DIAL_LABEL_PX) > 1e-9) problems.push(`${w}: renders ${(s.fontSize * scale).toFixed(2)}px`);
    for (const side of ["YES", "NO"] as const) {
      const labelled = s.ticks.filter((tk) => tk.side === side && tk.label).sort((a, b) => a.x - b.x);
      const half = (lab: string) => (lab.length * 0.64 * s.fontSize) / 2;
      for (const tk of labelled) if (Math.abs(tk.x - w / 2) - half(tk.label!) < KNOB + 6) problems.push(`${w} ${side} ${tk.label} under the resting thumb`);
      for (let i = 1; i < labelled.length; i++) {
        const a = labelled[i - 1], b = labelled[i];
        if (b.x - a.x < half(a.label!) + half(b.label!)) problems.push(`${w} ${side} ${a.label}/${b.label} overlap`);
      }
      if (labelled.length === 0) problems.push(`${w} ${side}: no figure at all`);
    }
    if (s.ticks.length !== 2 * dialDetents(1000, 1000).length || dialDetents(1000, 1000).length !== 10) problems.push(`${w}: ${s.ticks.length} ticks (every detent keeps its tick)`);
  }
  ok("6.1 · every figure renders at 10px, clear of the resting thumb and of its neighbour, at 320 / 360 / 390 / 1280 — every detent keeps its tick",
    problems.length === 0, problems.join(" | "));
  // The old drawing: 7.5 units at every width, every inner detent labelled.
  const oldOverlap = (() => {
    const w = 278, fs = 7.5, half = (s: string) => (s.length * 0.64 * fs) / 2;
    const xs = [50, 100].map((k) => (0.5 + 0.5 * Math.sqrt((k - 1) / 999)) * w);
    return xs[1] - xs[0] < half("50K") + half("100K");
  })();
  ok("6.1′ CONTROL · the old scale overlapped (\"50K\"/\"100K\" at 360) and rendered 5.8px", oldOverlap && Math.abs(7.5 * 278 / 358 - 5.82) < 0.01);
  ok("6.1″ · the grammar is unchanged (S-14): %-exact, uppercase K/M", dialTickLabel(2500) === "2.5K" && dialTickLabel(1_000_000) === "1M" && dialTickLabel(1100) === "1.1K");
  ok("6.2 · the dial draws dialScale's figures in the subtle ink at full strength, at its size",
    /const scaleMarks = dialScale\(\{ width, pad: PAD, knobR, baseStake, maxMultiplier \}\);/.test(DIAL) && /fontSize=\{scaleMarks\.fontSize\}\s*fill="var\(--text-subtle\)"\s*letterSpacing="0\.04em"/.test(DIAL)
      && !/fontSize="7\.5"\s*fill="var\(--text-muted\)"\s*opacity=\{0\.55\}/.test(DIAL));
  // Contrast of the subtle ink on the elevated panel, from the tokens (OKLCH → sRGB).
  const oklch = (L: number, C: number, H: number) => {
    const a = C * Math.cos((H * Math.PI) / 180), b = C * Math.sin((H * Math.PI) / 180);
    const l_ = L + 0.3963377774 * a + 0.2158037573 * b, m_ = L - 0.1055613458 * a - 0.0638541728 * b, s_ = L - 0.0894841775 * a - 1.291485548 * b;
    const l3 = l_ ** 3, m3 = m_ ** 3, s3 = s_ ** 3;
    const r = 4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3, g = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3, bl = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3;
    return [r, g, bl].map((v) => Math.min(1, Math.max(0, v)));
  };
  const lum = (rgb: number[]) => 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]; // linear already
  const tok = (name: string) => { const m = new RegExp(`${name}:\\s*oklch\\(([0-9.]+)% ([0-9.]+) ([0-9.]+)\\)`).exec(CSS); return m ? oklch(Number(m[1]) / 100, Number(m[2]), Number(m[3])) : [0, 0, 0]; };
  const ratio = (a: number[], b: number[]) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  const subtle = tok("--text-subtle"), panel = tok("--bg-elevated");
  const now = ratio(subtle, panel);
  ok(`6.3 · the figures read at ${now.toFixed(2)}:1 on the panel (≥ 4.5)`, now >= 4.5);

  // 6.4 the lock-mode label on the pill's line, clear of it.
  const pillW = (s: string, armed: boolean) => [...s.toUpperCase()].reduce((w, c) => w + (IDEO.test(c) ? 10 : 6) + 1.2, 0) + (armed ? 11 : 12) + twStep("1.5") + 2 * (armed ? 10 : twStep("3")) + 2;
  const clear: string[] = [];
  let tightest = Infinity;
  for (const [vw, outerL, outerR, pad] of [[320, 16, 304, 24], [360, 16, 344, 24], [390, 16, 374, 24], [1280, 789, 1147, 32]] as const) {
    for (const l of LOCALES) {
      const t = T[l];
      const labelR = outerL + 1 + pad + legendPx(t.common.yourPick);
      for (const [word, armed] of [[t.market.dialUnlock, false], [t.market.dialLock, true]] as const) {
        const pillL = outerR - 1 - twStep("3") - pillW(word, armed);
        tightest = Math.min(tightest, pillL - labelR);
        if (pillL - labelR < 0) clear.push(`${vw} ${l} "${t.common.yourPick}"/"${word}" ${(pillL - labelR).toFixed(1)}px`);
      }
    }
  }
  ok(`6.4 · "UAMUZI WAKO" stands on the pill's line at the left, clear of the pill in every language and both states (tightest ${tightest.toFixed(1)}px, sw at 320)`,
    clear.length === 0 && /<p className="-mt-1\.5 mb-2 flex min-h-\[44px\] items-center font-mono text-micro uppercase eyebrow font-bold text-text-subtle lg:-mt-3">\s*\{t\.common\.yourPick\}/.test(DIAL)
      && 24 - twStep("1.5") === 16 && 32 - twStep("3") === 16, clear.join(" | "));
  ok("6.4′ CONTROL · centred, as it was, it ran under the pill at 1280 (tile 042)",
    (789 + 1 + 32 + (1147 - 789 - 2 - 64) / 2 + legendPx(T.sw.common.yourPick) / 2) > 1147 - 1 - 16 - pillW(T.sw.market.dialUnlock, false));

  // 6.5 the readout: both eyebrows on one line, the side word on its box.
  const readoutOk = /<div className="grid grid-cols-\[1fr_auto\] gap-2 sm:gap-3 mt-5 items-start">/.test(DIAL)
    && /<p className="font-mono text-micro uppercase eyebrow text-text-subtle mb-1\.5 whitespace-nowrap">/.test(DIAL)
    && /className="flex min-h-\[44px\] items-center font-display font-bold text-\[15px\] sm:text-\[22px\]/.test(DIAL);
  const stakeLabelW = (l: L) => legendPx(T[l].dialog.stakeLabel) + twStep("1") + 10;
  let room = Infinity;
  for (const [content] of [[238], [278], [308], [292]] as const) {
    for (const l of LOCALES) {
      const eyebrow = Math.max(legendPx(T[l].common.youArePicking), legendPx(T[l].common.noConviction));
      room = Math.min(room, content - stakeLabelW(l) - eyebrow);
    }
  }
  ok(`6.5 · "YOU ARE PICKING" on one line, beside the right-aligned "Stake ⓘ" with ≥ ${room.toFixed(0)}px between them; the side word centred on the 44px stake box (both 22px under their eyebrows)`,
    readoutOk && room > 0 && 14 + twStep("1.5") === 22);
  ok("6.5′ CONTROL · it needed 111px and had 94 (360) / 104 (1280) in its own column", Math.round(legendPx(T.en.common.youArePicking)) === 111 && 278 - 172 - 12 === 94 && 292 - 172 - 16 === 104);
  ok("6.6 · the Multiplier label centres on its 44px box (it stood ~11px under it, 067)",
    /<div className="mt-3 grid grid-cols-\[1fr_auto\] gap-2 sm:gap-3 items-start">\s*<p className="flex min-h-\[44px\] items-center font-mono text-micro uppercase eyebrow text-text-subtle">/.test(DIAL));

  // 6.7 the caption over the button.
  const capOk = /<div className="mt-4 flex flex-wrap items-center gap-3">\s*<p className="min-w-0 flex-\[1_1_12rem\] text-body-sm text-text-subtle leading-snug">/.test(DIAL)
    && /btn btn-no btn-md"\)\} ml-auto whitespace-normal`\}/.test(DIAL);
  const lines = Object.fromEntries(LOCALES.map((l) => [l, Math.max(...[238, 278, 308, 292].map((c) => Math.ceil(widthMixed(inter, T[l].common.poolShareConfirm, 13) / c)))]));
  ok(`6.7 · the caption asks 12rem or a line of its own: every phone and 1280 give it its own line, read in ≤ 2 lines (sw ${lines.sw}, en ${lines.en}, zh ${lines.zh})`,
    capOk && [238, 278, 308, 292].every((c) => 192 + twStep("3") + 140 > c) && LOCALES.every((l) => lines[l] <= 2));
  ok("6.7′ CONTROL · beside the button it had 41–99px: one word a line (034)", 278 - 140 - twStep("3") < 192);
}

/* ══ §7 · THE REFUSAL ═════════════════════════════════════════════════════════════════════════════════════════════════ */
section("7 · the refusal: one of eyebrow and title, and its reason announced (E52)");
{
  const DIAL = read("src/components/markets/conviction-dial.tsx");
  ok("7.1 CONTROL · in Chinese the two keys are one phrase (\"无法下注\" over \"无法下注\")", T.zh.common.couldNotPlace === T.zh.common.couldNotPlaceBet);
  ok("7.2 · a refusal titled \"Could not place\" drops the eyebrow and takes the fuller phrase as its heading; any other keeps both",
    /const refusalRepeatsEyebrow = !!resultData && resultData\.variant !== "success"\s*&& \(resultData\.title \?\? resultData\.error \?\? t\.error\.tryAgain\) === t\.common\.couldNotPlace;/.test(DIAL)
      && /eyebrow=\{resultData\.variant === "success" \? t\.common\.betPlacedEyebrow : refusalRepeatsEyebrow \? undefined : t\.common\.couldNotPlaceBet\}/.test(DIAL)
      && /: refusalRepeatsEyebrow \? t\.common\.couldNotPlaceBet : \(resultData\.title \?\? resultData\.error \?\? t\.error\.tryAgain\)\}/.test(DIAL));
  const ORM = read("src/components/markets/operation-result-modal.tsx");
  // Without an eyebrow the heading follows the crest directly, and the hold surface's `[&>div+h2]:mt-4` gives it the
  // eyebrow's 20px from the crest (`mt-4`) instead of its own 4px; its own class stays ONE literal string, because
  // test:sell-grace-truth's dialog model reads the title's classes from it (a template literal read as no classes: NaN).
  const holdCls = /<div\s+className="([^"]*)"\s+onPointerMove=\{onPointerMoveHold\}/.exec(ORM)?.[1] ?? "";
  ok("7.3 · the result dialog draws no eyebrow line when given none, and the heading then stands the crest's 20px under it (mt-4), not 4px",
    /\{eyebrow && \(\s*<p\s+className="mt-4 font-mono text-micro uppercase eyebrow font-bold"/.test(ORM)
      && /<h2 className="mt-1 font-display text-\[22px\] font-bold text-text leading-tight tracking-\[-0\.018em\]">/.test(ORM)
      && holdCls.split(" ").includes("[&>div+h2]:mt-4") && twStep("4") === 20
      && /aria-hidden\s*>\s*<CrestIcon variant=\{variant\} color=\{tone\.fg\} \/>\s*<\/div>\s*\{eyebrow && \(/.test(ORM), holdCls);
  ok("7.4 · the refusal is an alertdialog DESCRIBED by its reason (aria-describedby → the subtitle), so a reader hears why when focus moves in",
    /role=\{variant === "danger" \? "alertdialog" : "dialog"\}\s*ariaLabel=\{title\}\s*describedBy=\{subtitle \? subtitleId : undefined\}/.test(ORM)
      && /<p id=\{subtitleId\} className="mt-1\.5 text-\[13px\] text-text-muted leading-snug">/.test(ORM)
      && /aria-describedby=\{exiting \? undefined : describedBy\}/.test(read("src/components/ui/modal.tsx")));
  ok("7.4′ PLANT · the description unwired is reported", !/describedBy=\{subtitle \? subtitleId : undefined\}/.test(ORM.replace("describedBy={subtitle ? subtitleId : undefined}", "")));
  ok("7.5 · a cooling-off refusal is `error` severity, so it opens as the danger (alertdialog) variant",
    /variant: f\.severity === "error" \? "danger" : "factual"/.test(DIAL) && /cooling_off:\s*\{ severity: "error",\s*channel: "modal"/.test(read("src/lib/failure-reasons.ts")));
}

/* ══ §8 · THE DEPOSIT-PAUSED NOTICE ═══════════════════════════════════════════════════════════════════════════════════ */
section("8 · the deposit-paused notice: the card's width, the way to Withdraw, one inset above and below (E57)");
{
  const DEP = read("src/app/wallet/deposit/page.tsx");
  const full = html(h(Callout, { tone: "warning", layout: "stack", bodyWidth: "full", title: "T" } as never, "body"));
  const measure = html(h(Callout, { tone: "warning", layout: "stack", title: "T" } as never, "body"));
  ok("8.1 · EXECUTED · a stack Callout with `bodyWidth=\"full\"` drops the 42ch measure; the default keeps it",
    !/max-w-\[42ch\]/.test(full) && /max-w-\[42ch\]/.test(measure));
  ok("8.2 · the break notice takes the card's width, and a cooling-off gets the Withdraw door in the shell's own words (none for an exclusion)",
    /bodyWidth="full"/.test(DEP) && /action=\{breakIsExclusion \? undefined : \(\s*<Link href="\/wallet\/withdraw" className="btn btn-ghost btn-md btn-pill inline-flex items-center gap-1\.5" data-testid="deposit-break-withdraw">\s*<I\.arrowUpFromLine s=\{14\} \/>\s*\{journey \? t\.journey\.withdrawAction : t\.common\.withdraw\}/.test(DEP)
      && T.sw.journey.withdrawAction === "Toa pesa");
  // The insets: the plate's box opens the card at the padding; the button's box closes it at the padding. A text line
  // closing it leaves its line box's lower part under the ink: 13px at leading-relaxed (21.125px), Inter's descent 0.241em.
  const pad = { phone: twStep("6"), wide: twStep("8") };
  const lineBelowInk = (21.125 - 13 * (1984 + 494) / 2048) / 2 + 13 * 494 / 2048 * 0.4; // half-leading + the unused descent under a baseline-sitting line
  ok(`8.3 · the button's edge closes the card as the plate's opens it: ${pad.phone}/${pad.phone}px on a phone, ${pad.wide}/${pad.wide}px from 640 (a text last line left ${(pad.phone + lineBelowInk).toFixed(0)}px under its ink: 38 measured)`,
    /flex flex-col items-center rounded-card border p-6 text-center sm:p-8/.test(read("src/components/ui/callout.tsx")) && /\{action \? <div className="mt-5">\{action\}<\/div> : null\}/.test(read("src/components/ui/callout.tsx"))
      && pad.phone === 32 && pad.wide === 48 && Math.round(pad.phone + lineBelowInk) >= 36);
  ok("8.4 · the sentence: one end, no dash opening a line (\"——您仍可登录\"), no last character alone",
    keptRanges(fill(T.zh.rg.breakActive, { date: endText("zh") }), [endText("zh")]).length === 3);
}

/* ══ §9 · NOTHING SAYS "BET NOW" DURING A BREAK ═══════════════════════════════════════════════════════════════════════ */
section("9 · during a break nothing says \"bet now\" (E19)");
{
  const HERO = read("src/components/home/landing-hero.tsx"), HOME = read("src/app/page.tsx");
  ok("9.1 · the home's lead (\"Bado huna chaguo. Chagua upande…\") and the empty-balance call are withheld on a break, as for a held wallet",
    /held \|\| emptyWallet \|\| onBreak \? null : <p className="kp-mine__lead">\{t\.home\.picksNone\}<\/p>/.test(HERO)
      && /const emptyWallet = !held && !onBreak && balance !== null && balance <= 0;/.test(HERO));
  ok("9.2 · …and the break's own notice speaks in its place (auth.coolingOff over rg.breakActive with its end, kept one run)",
    /\) : breakEnd \? \(\s*<div className="kp-mine__held" role="status" data-testid="landing-mine-break">\s*<p className="kp-mine__held-t">\{breakEnd\.exclusion \? t\.auth\.selfExclusionActive : t\.auth\.coolingOff\}<\/p>\s*<p className="kp-mine__held-b">\{keepText\(fill\(breakEnd\.exclusion \? t\.rg\.exclusionActive : t\.rg\.breakActive, \{ date: breakEnd\.date \}\), \[breakEnd\.date\]\)\}<\/p>/.test(HERO));
  // (Merged onto R4-H, which added `journey` to SignedInAct's call and signature: the pins follow that shape.)
  // The page says the end (`formatBreakEnd`) and hands the hero words, so the hero's call and SignedInAct's signature stay
  // as they were — the lines R4-H's `journey` prop also changes (round 4 merges with `git apply -3`).
  ok("9.3 · the home reads the break in its own batch, fails open (an invitation, never a refusal), and says its end once, by the one formatter",
    /Promise\.resolve\(\)\.then\(\(\) => isLockedOut\(session\.userId\)\)\s*\.then\(breakStateOf\)\s*\.catch\(\(\) => null\),/.test(HOME)
      && /breakEnd: breakEnd \? \{ exclusion: breakEnd\.exclusion, date: formatBreakEnd\(Date\.parse\(breakEnd\.until\), nowMs, t\.common\.monthsShort, locale\) \} : null,/.test(HOME)
      && /<SignedInAct t=\{t\} mine=\{mine \?\? null\} journey=\{journey\} \/>/.test(HERO) && /function SignedInAct\(\{ t, mine, journey \}: \{ t: Dict; mine: LandingMine \| null; journey: boolean \}\)/.test(HERO));
  const plant = HERO.replace("held || emptyWallet || onBreak ? null", "held || emptyWallet ? null");
  ok("9.3′ PLANT · the lead back for a player on a break is reported", !/held \|\| emptyWallet \|\| onBreak \? null/.test(plant));
  const TV = read("src/components/journey/tickets/tickets-view.tsx"), POS = read("src/app/positions/page.tsx");
  ok("9.4 · Tiketi zangu: during a break the first-ticket call and its \"Tazama maswali\" go; the break's sentence is the body",
    /const breakNow = firstTicket && !!breakBody;/.test(TV) && /const emptyBody = breakNow && breakBody \? breakBody/.test(TV) && /action=\{breakNow \? null : firstTicket \? \(/.test(TV));
  ok("9.5 · …and the classic /positions alike (its \"drag the conviction dial\" body and its Browse button)",
    /cause === "no-rows" && breakBody \? breakBody/.test(POS) && /browseLabel=\{cause === "no-rows" && !breakBody \? t\.positions\.browseMarkets : undefined\}/.test(POS) && /breakBody=\{breakBody\}/.test(POS));
  const sentence = breakSentenceText(T.sw.rg.breakActive, END_ISO, NOW, T.sw.common.monthsShort, "sw");
  ok("9.6 · the empty state's string keeps the end whole with its own no-break spaces (the EmptyState body's mechanism)",
    sentence.includes("10 Okt, 05:05") && sentence.replace(/ /g, " ") === fill(T.sw.rg.breakActive, { date: endText("sw") }));
  const MKT = read("src/app/markets/[id]/page.tsx");
  ok("9.7 · the market page: \"Tumia kidhibiti kuanza\" gives way to the break's sentence, and \"place another prediction\" is not said",
    /\{myPositions\.length === 0 && \(breakEnd && breakDate \? \(/.test(MKT) && /\{!breakEnd && <p className="mb-4 text-body-sm text-text-muted">\{t\.market\.similarMarketsBody\}<\/p>\}/.test(MKT));
  ok("9.7′ CONTROL · those three sentences do tell the player to bet now",
    /Tumia kidhibiti kuanza/.test(T.sw.market.noBetYet) && /place another prediction/.test(T.en.market.similarMarketsBody) && /下一注/.test(T.zh.market.similarMarketsBody));
}

/* ══ §10 · THE JOURNEY WALLET AND THE HUB ═════════════════════════════════════════════════════════════════════════════ */
section("10 · the journey Wallet says why there is no Deposit; Pumzika states the running break (E58)");
{
  const SHEET = read("src/components/layout/wallet-sheet.tsx"), SHELL = read("src/components/layout/app-shell.tsx");
  ok("10.1 · the sheet shows \"Deposits paused\" over the break's sentence when it withholds Deposit for a break",
    /const breakText = !held && onBreak && breakEnd/.test(SHEET) && /\{breakText && \(\s*<div className="kp-wsheet__held" role="status" data-testid="wallet-sheet-break">\s*<p className="kp-wsheet__held-t">\{t\.wallet\.depositPausedTitle\}<\/p>/.test(SHEET));
  ok("10.2 · the shell hands the end to the JOURNEY bar only, derived from the row it holds; every offer still reads the one boolean",
    /journeyBreak = breakStateFromTimers\(rg\?\.selfExclusionUntil, rg\?\.coolingOffUntil, now\);/.test(SHELL)
      // `user={journeyUser}` since R4-H (the journey header's copy of the user, its phone masked by maskPhone).
      && /<LazyJourneyTopBar user=\{journeyUser\} onBreak=\{promoSuppressed\} breakEnd=\{journeyBreak\}/.test(SHELL)
      && /<TopAppBar user=\{topUser\} proposalsState=\{proposalsState\} inviteVisible=\{inviteVisible\} invitePaid=\{invitePaid\} \/>/.test(SHELL)
      && /onBreak=\{onBreak\} breakEnd=\{breakEnd\} \/>/.test(read("src/components/journey/journey-top-bar.tsx")));
  // The hub row, rendered.
  const viewer = {
    signedIn: true as const, userId: "u", name: "Jina", initials: "J", phone: "+255••••78", balance: 50_000, walletHeld: false,
    kycOffered: false, agentInStanding: false, proposalsState: "COMING_SOON" as const, doors: {} as never,
    breakEnd: { until: "2026-10-10T03:02:00.000Z", exclusion: false },
  };
  const row = { id: "break" as const, kind: "link" as const, href: "/profile/responsible-gambling#break", label: "footer.takeABreak" as const, glyph: "pause" as const };
  const on = renderToStaticMarkup(h(HubRowItem, { row, t: T.sw, viewer, locale: "sw" } as never));
  const off = renderToStaticMarkup(h(HubRowItem, { row, t: T.sw, viewer: { ...viewer, breakEnd: null }, locale: "sw" } as never));
  const zhOn = renderToStaticMarkup(h(HubRowItem, { row, t: T.zh, viewer, locale: "zh" } as never));
  ok("10.3 · EXECUTED · Pumzika's second line states the running break: \"Mapumziko yanaendelea hadi 10 Okt, 06:02.\" (zh \"休息期至 … 结束。\")",
    text(on).includes("Mapumziko yanaendelea hadi 10 Okt, 06:02.") && text(zhOn).includes("休息期至 2026年10月10日 06:02 结束。") && on.includes('data-testid="hub-status-break"'), text(on));
  ok("10.3′ CONTROL · with no break running the row is as it was", !off.includes("hub-status-break") && text(off).trim() === "Pumzika");
  ok("10.4 · the status is the FIRST SENTENCE of the approved paragraph, cut at its own stop — never re-worded",
    LOCALES.every((l) => { const f = firstDateSentence(T[l].rg.breakActive); return !!f && T[l].rg.breakActive.startsWith(f) && f.includes("{date}"); }));
  // The reader: the hub reads the break in its batch; a failed read shows no status; a guest is read nothing.
  const base = { ...HUB_VIEWER_DEPS, invitePayable: async () => false, agentEnabled: () => false, proposalsState: () => "COMING_SOON" as const,
    user: async () => null, wallet: async () => null, kyc: async () => null, inviteViewer: async () => ({ role: "PLAYER", agentInGoodStanding: false, playerInviteEligible: true }) as never };
  const v1 = await loadHubViewer("u1", { ...base, lockout: async () => ({ locked: true, until: END_ISO, reason: "cooling_off" }) });
  const v2 = await loadHubViewer("u1", { ...base, lockout: async () => { throw new Error("down"); } });
  let guestReads = 0;
  await loadHubViewer(null, { ...base, lockout: async () => { guestReads++; return { locked: false, until: null, reason: null }; } });
  ok("10.5 · EXECUTED · loadHubViewer: a running break reaches the row; a failed read shows none; a guest is read nothing",
    v1.signedIn && v1.breakEnd?.until === END_ISO && v1.breakEnd.exclusion === false && v2.signedIn && v2.breakEnd === null && guestReads === 0, JSON.stringify([v1.signedIn && v1.breakEnd, v2.signedIn && v2.breakEnd, guestReads]));
}

/* ══ §11 · THE AUTH PAGES ═════════════════════════════════════════════════════════════════════════════════════════════ */
section("11 · the auth pages: the rail on the header's edges, the wordmark once; widows; the recovery link; the panel glyph (E10 E11 E12 E14)");
{
  const SHELL = read("src/components/auth/auth-shell.tsx");
  const wBoard = Number(/--w-board:\s*([0-9]+)px/.exec(CSS)?.[1] ?? NaN);
  const sp8 = Number(/--sp-8:\s*([0-9]+)px/.exec(raw("src/app/globals.css"))?.[1] ?? NaN);
  const railLeft = (vw: number) => Math.max(0, (vw - wBoard) / 2) + twStep("6");
  const headerLeft = (vw: number) => Math.max(0, (vw - wBoard) / 2) + sp8;
  ok(`11.1 · from 1024 the grid takes the header's box (max-w-board, 32px sides): the rail starts on the header's edge at 1024, 1280 and 1440 (x${railLeft(1024)}, x${railLeft(1280)}, x${railLeft(1440)})`,
    /className="mx-auto grid min-h-\[calc\(100vh-44px\)\] w-full max-w-6xl grid-cols-1 lg:max-w-board lg:grid-cols-2 lg:px-6"/.test(SHELL)
      && /\.kp-jhdr__row \{[^}]*max-width: var\(--w-board\);/.test(CSS) && /@media \(min-width: 1024px\) \{ \.kp-jhdr__row \{[^}]*padding-inline: var\(--sp-8\);/.test(CSS)
      && [1024, 1280, 1440].every((vw) => railLeft(vw) === headerLeft(vw)));
  ok("11.1′ CONTROL · the old 1152px grid put the rail at x64 at 1280 (the header at x32)", (1280 - 1152) / 2 === 64 && headerLeft(1280) === 32);
  ok("11.2 · the rail's wordmark is not drawn from 1280, where the header draws the lockup (the journey and the classic bar alike)",
    /className="inline-block transition-opacity hover:opacity-90 xl:hidden">\s*<FiftyLockup size=\{26\} \/>/.test(SHELL)
      && /<span className="hidden xl:inline-flex"><FiftyLockup size=\{22\}/.test(read("src/components/journey/journey-top-bar.tsx"))
      && /<span className="hidden xl:inline-flex"><FiftyLockup size=\{22\}/.test(read("src/components/layout/top-app-bar.tsx")));
  const head = renderToStaticMarkup(h(AuthHeader, { eyebrow: "E", title: T.sw.auth.welcomeTo50pick, subtitle: T.en.auth.emailOrPhoneHint } as never));
  ok("11.3 · EXECUTED · \"Karibu kwenye 50pick\" keeps \"kwenye 50pick\" together; the subtitle keeps \"your account.\"",
    head.includes('<span class="whitespace-nowrap">kwenye 50pick</span>') && head.includes('<span class="whitespace-nowrap">your account.</span>'), head);
  ok("11.4 · the phone hint keeps \"6 or 7\" whole", /keepText\(t\.common\.phoneInputTitle, digitChoice\(t\.common\.phoneInputTitle\)\)/.test(read("src/components/auth/login-identifier.tsx")));
  const LOGIN = read("src/app/auth/login/page.tsx");
  const forgotOf = (src: string) => /href=\{forgotHref as never\}\s*className="([^"]+)"/.exec(src)?.[1] ?? "";
  const forgot = forgotOf(LOGIN);
  const body = Number(/"body-sm":\s*\["([0-9.]+)px"/.exec(TW)?.[1] ?? NaN);
  const bodyLine = Number(/"body-sm":\s*\["[0-9.]+px",\s*\{\s*lineHeight:\s*"([0-9.]+)px"/.exec(TW)?.[1] ?? NaN);
  const tapMin = Number(/--tap-min:\s*([0-9]+)px/.exec(CSS)?.[1] ?? NaN);
  const legible = (cls: string) => /\btext-body-sm\b/.test(cls) && /min-h-\[var\(--tap-min\)\]/.test(cls) && /text-brand-300/.test(cls) && !/text-micro|font-mono|uppercase/.test(cls) && body >= 12.5;
  /** The row the link stands in: its margin box (the tap height less what its own negative margins give back). */
  const rowOf = (cls: string) => tapMin - 2 * Number(/(?:^|\s)-my-\[([0-9.]+)px\]/.exec(cls)?.[1] ?? 0);
  ok(`11.5 · the recovery link reads at ${body}px (≥ 12.5) in the brand ink, with a ${tapMin}px tap height (it was 10px mono capitals, caps 8px) — and its row stays one ${bodyLine}px line (${rowOf(forgot)}px), so the form does not grow`,
    legible(forgot) && rowOf(forgot) === bodyLine, forgot);
  const oldRecipe = "font-mono text-micro uppercase tracking-[0.14em] text-text-subtle hover:text-text";
  ok("11.5′ PLANT · the microlabel recipe back, and the tap height left to grow the row (40px for an 18px line), are each reported",
    !legible(forgotOf(LOGIN.replace(forgot, oldRecipe))) && rowOf(forgot.replace("-my-[11px] ", "")) !== bodyLine);
  // E10: the panel's 16px glyph centres 8px down with no margin; the title's capitals 8.6px (Sora 13px in a 1.375 line), a
  // Chinese title's ink 8.0px (measured: 129, icon y427–440 against 自我排除已激活 y426–437 with the old 2px margin).
  const cap13 = soraCapCentreEm(1.375) * 13;
  const glyph = /<span className=\{"shrink-0 " \+ \(errorPanel\.tone === "success"/.test(LOGIN) ? 8 : 10;
  ok(`11.6 · the sign-in panel's glyph centres ${glyph}px down: 0.0px from a Chinese title's ink and ${(glyph - cap13).toFixed(1)}px from the Latin capitals (it stood 2 and 1.5 under)`,
    glyph === 8 && Math.abs(glyph - cap13) < 0.75 && /<span className=\{"shrink-0 " \+ \(errorPanel\.tone === "danger"/.test(read("src/app/auth/register/register-form.tsx")));
  ok("11.6′ CONTROL · with mt-0.5 it centred 10px down: 2px under the Chinese ink (129)", 2 + 8 - 8.0 === 2);
}

/* ══ §12 · THE RESOLUTION TILE ════════════════════════════════════════════════════════════════════════════════════════ */
section("12 · the market's resolution tile says \"resolves\" in every language (E23)");
{
  const MKT = read("src/app/markets/[id]/page.tsx");
  ok("12.1 · the tile's value is the RESULT time and its label the word for resolving: \"INATATULIWA\" / \"RESOLVES\" / \"结算于\"",
    /label=\{t\.common\.resolves\} value=\{formatEatDateTime\(Date\.parse\(m\.resolutionAt\)/.test(MKT) && T.sw.common.resolves === "inatatuliwa" && T.en.common.resolves === "resolves" && T.zh.common.resolves === "结算于");
  ok("12.1′ CONTROL · the key it wore said \"it ends\" in Swahili, which a player reads as the end of picking", T.sw.market.resolves === "Inaisha");
  ok("12.2 · and \"Hakuna bwawa bado\" keeps \"bwawa bado\" together in its tile", /value=\{freshMarket \? keepText\(t\.market\.noPoolYet\)/.test(MKT));
}

/* ══ §13 · E35 — REGISTERING AGAIN ════════════════════════════════════════════════════════════════════════════════════ */
section("13 · E35 — a self-excluded person cannot register again with the same phone or email (in-process, the memory store)");
{
  process.env.EMAIL_OUTBOX_CAPTURE = "1";
  const { db } = await import("../src/lib/server/store.ts");
  const { registerWithPassword, loginWithPassword } = await import("../src/lib/server/auth-service.ts");
  const { selfExclude } = await import("../src/lib/server/responsible-gambling.ts");
  const { registerRefusalOf, refusalField } = await import("../src/app/auth/register/refusal.ts");
  const PW = "Kipindi-R4i-correct-horse-77", DOB = "1990-01-01";
  const register = async (phone: string, email: string): Promise<{ ok: boolean; code?: string }> => {
    try {
      const r = await registerWithPassword({ phone, email, password: PW, passwordConfirm: PW, dob: DOB, acceptTerms: true, acceptAge: true } as never);
      return r.ok ? { ok: true } : { ok: false, code: String(r.code) };
    } catch {
      // A successful sign-up mints a session cookie, which needs a request scope a script has not: it got that far.
      return { ok: !!(await db.user.findByPhone(phone)) };
    }
  };
  const first = await register("+255712340001", "excluded.player@50pick.tz");
  const u = await db.user.findByPhone("+255712340001");
  ok("13.0 CONTROL · the person registers", first.ok && !!u, JSON.stringify(first));
  await selfExclude(u!.id, "24h");
  const after = await db.user.findById(u!.id);
  ok("13.1 · they self-exclude (status SELF_EXCLUDED, a running end)", after?.status === "SELF_EXCLUDED");
  const samePhone = await register("+255712340001", "another.inbox@50pick.tz");
  const localPhone = await register("0712340001", "third.inbox@50pick.tz");
  const sameEmail = await register("+255712340002", "excluded.player@50pick.tz");
  const caseEmail = await register("+255712340003", "Excluded.Player@50PICK.tz");
  ok("13.2 · EXECUTED · the same phone is refused (ALREADY_EXISTS), written either way (+255… or 07…)",
    !samePhone.ok && samePhone.code === "ALREADY_EXISTS" && !localPhone.ok && localPhone.code === "ALREADY_EXISTS", JSON.stringify([samePhone, localPhone]));
  ok("13.3 · EXECUTED · the same email is refused (EMAIL_EXISTS), whatever its case",
    !sameEmail.ok && sameEmail.code === "EMAIL_EXISTS" && !caseEmail.ok && caseEmail.code === "EMAIL_EXISTS", JSON.stringify([sameEmail, caseEmail]));
  const panel = registerRefusalOf({ code: "ALREADY_EXISTS" }, { phone: "0712340001", email: "x@y.tz" });
  ok("13.4 · what they are told: the phone's \"account already exists — sign in\" panel, marking the phone, with a sign-in link",
    panel.code === "exists" && refusalField(panel) === "phone" && /accountExists/.test(read("src/app/auth/register/register-form.tsx"))
      && /cta: \{ href: `\/auth\/login\?phone=\$\{encodeURIComponent\(refusal\.phone\)\}\$\{nextQs\}`, label: copy\.signIn \}/.test(read("src/app/auth/register/register-form.tsx")));
  let login: { ok: boolean; code?: string; detail?: { standing?: string; until?: string } } = { ok: true };
  try { login = (await loginWithPassword({ identifier: "+255712340001", password: PW } as never)) as never; } catch { login = { ok: true }; }
  const where = !login.ok ? accountRefusalPath(login.detail as never, "") : "";
  ok("13.5 · EXECUTED · and signing in is refused with the serving panel and its END (the instant), not a generic block",
    !login.ok && login.code === "SUSPENDED" && login.detail?.standing === "serving" && where.startsWith("/auth/login?excluded=serving&until=") && readBreakEndParam(decodeURIComponent(where.split("until=")[1]))?.withTime === true, `${JSON.stringify(login)} → ${where}`);
  const fresh = await register("+255712340009", "brand.new.inbox@50pick.tz");
  ok("13.6 · NOTE (owner) · a NEW phone and a NEW email still register: nothing at sign-up ties a person to their excluded account (KYC is asked at withdrawal)", fresh.ok);
}

/* ══ §14 · R4-K'S GOLD AUDIT ON THESE FILES ═════════════════════════════════════════════════════════════════════════ */
section("14 · gold is money and nothing else — the auth pages, the paused deposit, a running break (R4-K's audit; DESIGN_AUTHORITY Q5 §M3 F3)");
{
  const PANEL = read("src/components/auth/auth-panel.tsx");
  const head = renderToStaticMarkup(h(AuthHeader, { eyebrow: "INGIA", title: "Karibu tena" } as never));
  ok("14.1 · EXECUTED · the auth eyebrow is the brand's ink by default, and gold is out of its map",
    /<p class="font-mono text-caption uppercase eyebrow font-bold text-brand-300">INGIA<\/p>/.test(head) && !/gold/.test(PANEL.slice(PANEL.indexOf("export type AuthEyebrowTone"))), head);
  const AUTH = ["src/app/auth/login/page.tsx", "src/app/auth/register/register-form.tsx", "src/app/auth/forgot-password/page.tsx", "src/app/auth/reset-password/page.tsx"].map((f) => [f, read(f)] as const);
  const goldAt = AUTH.filter(([, s]) => /gold-\d{3}/.test(s)).map(([f]) => f);
  ok("14.2 · the sign-in, sign-up, recovery and reset pages carry no gold: the warning glyph muted, the call to action in the brand's ink, the link's lifetime muted", goldAt.length === 0, goldAt.join(" · "));
  ok("14.2′ PLANT · one gold ink back on any of them is reported", AUTH.every(([, s]) => /gold-\d{3}/.test(s.replace("text-text-muted", "text-gold-300")) || !s.includes("text-text-muted")));
  const REG = read("src/app/auth/register/page.tsx");
  const golds = REG.match(/[a-z-]*gold-\d{3}[^"\s]*/g) ?? [];
  ok("14.3 · the register page's bonus cards: gold only on the two money figures (.amount), the cards neutral",
    golds.length === 2 && (REG.match(/<span className="amount text-gold-300">\{formatTzs\((referral\.newPlayerBonusTzs|invite\.bonusAmountTzs)\)\}<\/span>/g) ?? []).length === 2
      && !/var\(--gold-500\)/.test(REG), golds.join(" · "));
  const DEP = read("src/app/wallet/deposit/page.tsx");
  ok("14.4 · the deposit-paused tiles (a break, a held wallet) are neutral, the lock kept — the warning tone is struck in gilt",
    (DEP.match(/<Callout\s+tone="neutral"\s+layout="stack"\s+glyph="lock"/g) ?? []).length === 2 && !/<Callout\s+tone="warning"\s+layout="stack"\s+glyph="lock"/.test(DEP)
      && /--warning-fg:\s*var\(--gilt\)/.test(CSS));
  ok("14.5 · the code page masks the phone with the platform's one mask (\"+255••••84\", as the hub and the hero)",
    /const masked = phone \? maskPhone\(phone\) : "\+255••••";/.test(read("src/app/auth/otp/page.tsx")));
  const plant = REG.replace('<div className="overflow-hidden rounded-xl border border-border bg-bg-elevated">', '<div className="overflow-hidden rounded-xl border border-gold-500/40 bg-gold-500/10">');
  ok("14.5′ PLANT · a gilt card back is reported", (plant.match(/[a-z-]*gold-\d{3}[^"\s]*/g) ?? []).length !== 2);
}

/* ══ §15 · THE BELL SAYS THE END THE SAME WAY ═════════════════════════════════════════════════════════════════════════ */
section("15 · the bell's RG notices carry the end as every screen says it (E9 E16 — the same defect, in the inbox)");
{
  const N = await import("../src/lib/server/notification-service.ts");
  const { db } = await import("../src/lib/server/store.ts");
  const who = await db.user.findByPhone("+255712340009"); // §13's fresh account
  const cool = who ? await N.notifyCoolOff(who.id, { until: END_ISO }) : null;
  const excl = who ? await N.notifySelfExclusion(who.id, { until: END_ISO }) : null;
  const nowMs = Date.now();
  const want = (l: L) => formatBreakEnd(END, nowMs, T[l].common.monthsShort, l);
  ok(`15.1 · EXECUTED · the break's notice ends on the end in each reader's words, date and time: "…hadi ${want("sw")}." / "…until ${want("en")}." / "…直至 ${want("zh")}。"`,
    !!cool && cool.bodySw.endsWith(`hadi ${want("sw")}.`) && cool.bodyEn.endsWith(`until ${want("en")}.`) && cool.bodyZh.endsWith(`直至 ${want("zh")}。`),
    JSON.stringify(cool && [cool.bodySw, cool.bodyEn, cool.bodyZh]));
  ok("15.2 · EXECUTED · …and so does the exclusion's",
    !!excl && excl.bodySw.endsWith(`hadi ${want("sw")}.`) && excl.bodyEn.endsWith(`until ${want("en")}.`) && excl.bodyZh.endsWith(`直至 ${want("zh")}。`),
    JSON.stringify(excl && [excl.bodySw, excl.bodyEn, excl.bodyZh]));
  ok("15.2′ CONTROL · what they printed — the UTC day — carried no time and no month word", !/\d{2}:\d{2}|Okt|Oct/.test(END_ISO.slice(0, 10)));
}

console.log(`\nvisual-pass-r4i: ${pass} passed, ${fails.length} failed\n`);
if (fails.length) {
  for (const f of fails) console.error(`  · ${f}`);
  process.exit(1);
}
process.exit(0);
