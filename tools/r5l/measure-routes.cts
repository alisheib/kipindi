/* R5-L · the band model: each route's page bands, its old ghost's bands and (where the new ghost is the page's structure)
 * the landing delta, per width and language, from the classes on this repo's overridden scale and the served fonts.
 * Run from F:/kipindi-r5l:  npx tsx <this file> [route]
 * Calibrations against round 5's tiles are printed beside the figures they check. */
const { createRequire } = require("node:module");
const req = createRequire("F:/kipindi-r5l/package.json");
const { width, lines } = require("./fonts.cts");
const { dict } = req("F:/kipindi-r5l/src/lib/i18n-dict.ts");
const { fill, formatTzs } = req("F:/kipindi-r5l/src/lib/utils.ts");
const { commissionWaterfall } = req("F:/kipindi-r5l/src/lib/agent-commission.ts");
const P = req("F:/kipindi-r5l/src/lib/payout.ts");
const { durationHours } = req("F:/kipindi-r5l/src/lib/duration-phrase.ts");

type L = "sw" | "en" | "zh";
const LOCALES: L[] = ["sw", "en", "zh"];
const VW = [320, 360, 390, 640, 768, 1024, 1280];
const TIER = { board: 1280, reading: 1080, form: 640, receipt: 560 } as const;
/** The content width of a PageContainer tier at a viewport width (px-3 below lg, lg:px-6). */
const col = (vw: number, tier: keyof typeof TIER) => Math.min(vw, TIER[tier]) - (vw >= 1024 ? 64 : 32);
const r2 = (n: number) => Math.round(n * 100) / 100;

// Type runs (the classes' sizes, weights, tracking).
const SANS = (px: number, wght = 400) => ({ face: "sans", px, wght }) as const;
const MONO = (px: number, wght = 400, ls = 0) => ({ face: "mono", px, wght, ls }) as const;
const SORA = (px: number, wght = 700, ls = 0) => ({ face: "display", px, wght, ls }) as const;
const n = (s: string, run: any, room: number) => lines(s, run, room);

/** PageHeader: the eyebrow row (15px, or the icon's size when larger), 4px, the 35px h1 lines, then 4 + 19.5 × subtitle lines. */
function pageHeader(o: { title: string; subtitle?: string; icon?: number; room: number }) {
  const eyebrow = Math.max(15, o.icon ?? 0);
  const h1 = 35 * n(o.title, SORA(28, 700, -0.56), o.room);
  const sub = o.subtitle ? 4 + 19.5 * n(o.subtitle, SANS(13), o.room) : 0;
  return eyebrow + 4 + h1 + sub;
}
/** PageHero: 1px border each side, `p-5 lg:p-6`. */
const hero = (vw: number, inner: number) => 2 + (vw >= 1024 ? 64 : 48) + inner;
const heroRoom = (vw: number, room: number) => room - 2 - (vw >= 1024 ? 64 : 48);

const out: string[] = [];
const say = (s: string) => out.push(s);
const only = process.argv[2];

/* ══ /agent ══════════════════════════════════════════════════════════════════════════════════════════════════════ */
if (!only || only === "agent") {
  say("── /agent: the old ghost's bands vs the page's (space-y-6: 32px rungs) ──");
  const PCT = 10, DAYS = 5, REFUND = 7, FEE = formatTzs(100000), MB = 3;
  const WF = commissionWaterfall(1_000_000, { platformFeeRate: P.DEFAULT_PLATFORM_FEE_RATE, operatorFeeRate: P.DEFAULT_OPERATOR_FEE_RATE, traTaxOnCommissionRate: P.DEFAULT_TRA_TAX_ON_COMMISSION_RATE, gbtLevyOnCommissionRate: P.DEFAULT_GBT_LEVY_ON_COMMISSION_RATE, agentPct: 10, withholdingPct: 5 });
  for (const l of LOCALES) for (const vw of VW) {
    const t = dict[l].agent, room = col(vw, "reading");
    const head = pageHeader({ title: t.title, subtitle: t.heroSub, room });
    // Stat tiles: 1 + 20 + label row (14.25; zh 15) + 4 + 22.5 × value lines + [2 + 18 × hint lines] + 20 + 1.
    const cols = vw >= 640 ? 3 : 1, tileW = (room - (cols - 1) * 16) / cols, inner = tileW - 42;
    const labelRow = l === "zh" ? 15 : 14.25;
    const tile = (value: string, hint?: string) => 42 + labelRow + 4 + 22.5 * n(value, MONO(18, 700), inner) + (hint ? 2 + 18 * n(hint, MONO(13), inner) : 0);
    const tiles = [tile(fill(t.statEarnValue, { pct: String(PCT) }), t.statEarnHint), tile(FEE), tile(fill(t.statTimeValue, { days: String(DAYS) }), t.statTimeHint)];
    const tilesBand = cols === 3 ? Math.max(...tiles) : tiles.reduce((a, b) => a + b, 0) + 32;
    const pw = room - 42; // a glass panel's p-4 content width
    const how = 42 + 22.5 * n(t.howTitle, SORA(18), pw) + 16 + [t.how1, t.how2, t.how3, t.how4, t.how5].map((s: string) => Math.max(30, 4 + 17.875 * n(s, SANS(13), pw - 46))).reduce((a: number, b: number) => a + b, 0) + 64;
    const liW = vw >= 640 ? (pw - 12) / 2 : pw;
    const docs = [t.docCv, t.docRequest, t.docSerikali, t.docRefLetter1, t.docRefId1, t.docRefLetter2, t.docRefId2].map((d: string) => 26 + 18 * n(d, SANS(13), liW - 2 - 32 - 14 - 12));
    const docRows = vw >= 640 ? [0, 2, 4, 6].map((i) => Math.max(docs[i], docs[i + 1] ?? 0)) : docs;
    const docsBand = 42 + 22.5 * n(t.docsTitle, SORA(18), pw) + 16 + docRows.reduce((a: number, b: number) => a + b, 0) + 12 * (docRows.length - 1) + 16 + 21.125 * n(t.docIdNote, SANS(13), pw) + 4 + 18 * n(fill(t.docHint, { mb: String(MB) }), MONO(13), pw);
    const fee = 42 + 14 + 12 + 34 + 16 + 21.125 * n(t.feeBodyWallet.replace("{amount}", FEE), SANS(13), pw) + 12 + 21.125 * n(fill(t.feeRefund, { days: String(REFUND) }), SANS(13), pw);
    const earn = 42 + 22.5 * n(t.earnTitle, SORA(18), pw) + 12 + [t.earnLifetime, t.earnUncapped, t.earnNoPrize, t.earnSingleLevel, t.recruiterOnly].map((s: string) => 17.875 * n(s, SANS(13), pw - 20)).reduce((a: number, b: number) => a + b, 0) + 32;
    // The waterfall: title row, basis, head row, eight rows, two sentences.
    const a = t as Record<string, string>;
    const KEY: Record<string, string> = { winnings: "wfWinnings", grossFee: "wfGrossFee", tra: "wfTra", gbt: "wfGbt", netFee: "wfNetFee", agentShare: "wfAgentShare", withholding: "wfWithholding", netPayout: "wfNetPayout" };
    const titleRow = width(t.wfTitle, SORA(18)) + 16 + width(t.wfEyebrow.toUpperCase(), MONO(10, 400, 1.4)) <= pw ? 22.5 : 22.5 + 4 + 14;
    const rows = WF.steps.map((s: any) => {
      const label = s.ratePct === null ? a[KEY[s.id]] : fill(a[KEY[s.id]], { pct: String(Math.round(s.ratePct * 100) / 100) });
      const amount = s.deduction ? `−${formatTzs(s.amountTzs)}` : formatTzs(s.amountTzs);
      const ddW = width(amount, MONO(s.id === "netPayout" ? 14 : 13));
      const dtW = pw - 20 - ddW - (s.deduction ? 16 : 0);
      const lab = 17.875 * n((s.deduction ? "· " : "") + label, SANS(13, s.id === "netPayout" ? 700 : s.subtotal ? 600 : 400), dtW);
      const note = 2 + 17.875 * n(a[KEY[s.id] + "Note"], SANS(13), dtW);
      const dd = s.id === "netPayout" ? 20 : 18;
      return (s.id === "netPayout" ? 12 + 4 + 1 : 16) + Math.max(lab + note, dd);
    });
    const wf = 42 + titleRow + 4 + 21.125 * n(t.wfBasis.replace("{amount}", formatTzs(1_000_000)), SANS(13), pw) + 16 + 23 + rows.reduce((x: number, y: number) => x + y, 0) + 16 + 21.125 * n(fill(t.wfEffective, { pct: String(Math.round(WF.effectivePctOfWinnings * 100) / 100) }), SANS(13), pw) + 8 + 21.125 * n(t.wfDisclaimer, SANS(13), pw);
    const page = [head, tilesBand, 48, how, docsBand, fee, earn, wf, 18];
    // The old ghost: the same header; 96px tiles; a 48px CTA; four 126px panels; the 326px waterfall; a 16px bar.
    const oldTiles = cols === 3 ? 96 : 3 * 96 + 32;
    const old = [head, oldTiles, 48, 126, 126, 126, 126, 326, 16];
    const at = (bands: number[], i: number) => bands.slice(0, i).reduce((x, y) => x + y + 32, 0);
    if (vw === 390 || vw === 1280 || (l === "sw" && vw === 320)) {
      say(`${l} @${vw}: page [${page.map(r2).join(", ")}] · old [${old.map(r2).join(", ")}] · tiles ${r2(tilesBand)} vs ${oldTiles} (${r2(tilesBand - oldTiles)}) · how-it-works lands ${r2(at(page, 3) - at(old, 3))}px off · waterfall ${r2(at(page, 7) - at(old, 7))} off · terms link ${r2(at(page, 8) - at(old, 8))} off`);
    }
  }
}

/* ══ the generic loaders: where the page's first band of data begins (the old spinner panel stood at the top) ════════ */
if (!only || only === "loaders") {
  say("\n── generic loaders: the page's opening bands (the old ghost drew its 257px spinner panel at the top) ──");
  const BL = 44;
  type R = { route: string; tier: keyof typeof TIER; rung: number; bands: (vw: number, l: L, room: number) => number[] };
  const T = (l: L) => dict[l];
  const routes: R[] = [
    { route: "/fairness", tier: "reading", rung: 32, bands: (vw, l, room) => [(vw >= 1024 ? 16 : 0) + hero(vw, pageHeader({ title: T(l).common.howAMarketResolves, icon: 18, room: heroRoom(vw, room) })) + 16 + 24.375 * n(fill(T(l).common.fairnessIntro, { hours: durationHours(l, 1) }), SANS(15), Math.min(room, 68 * width("0", SANS(15))))] },
    { route: "/help", tier: "reading", rung: 24, bands: (vw, l, room) => [hero(vw, pageHeader({ title: T(l).help.heading, room: heroRoom(vw, room) }))] },
    { route: "/notifications", tier: "reading", rung: 24, bands: (vw, l, room) => [BL, pageHeader({ title: T(l).notif.title, icon: 22, room })] },
    { route: "/profile/account", tier: "reading", rung: 24, bands: (vw, l, room) => [BL, hero(vw, pageHeader({ title: T(l).profile.myAccount, icon: 14, room: heroRoom(vw, room) }))] },
    { route: "/profile/activity", tier: "reading", rung: 24, bands: (vw, l, room) => [BL, pageHeader({ title: T(l).activity.title, icon: 22, room })] },
    { route: "/profile/invite", tier: "form", rung: 24, bands: () => [BL, 19] },
    { route: "/profile/kyc", tier: "form", rung: 24, bands: (vw, l, room) => [BL, hero(vw, pageHeader({ title: T(l).profile.verifyIdentity, icon: 14, room: heroRoom(vw, room) }) + 12 + 17.875 * n(T(l).profile.verifyBody.replace("{hours}", durationHours(l, 24)), SANS(13), Math.min(heroRoom(vw, room), 65 * width("0", SANS(13)))))] },
    { route: "/profile/notifications", tier: "form", rung: 24, bands: (vw, l, room) => [BL, pageHeader({ title: T(l).push.pageTitle, icon: 22, room })] },
    { route: "/profile/responsible-gambling", tier: "reading", rung: 24, bands: (vw, l, room) => [BL, hero(vw, pageHeader({ title: T(l).profile.responsibleGambling, icon: 14, room: heroRoom(vw, room) }) + 12 + 17.875 * n(T(l).rg.pageDescription, SANS(13), Math.min(heroRoom(vw, room), 65 * width("0", SANS(13)))))] },
    { route: "/profile/security", tier: "form", rung: 24, bands: (vw, l, room) => [BL, pageHeader({ title: T(l).security.title, icon: 22, room })] },
    { route: "/profile/sessions", tier: "form", rung: 24, bands: (vw, l, room) => [BL, hero(vw, pageHeader({ title: T(l).profile.activeSessions, icon: 14, room: heroRoom(vw, room) }) + 4 + 19.5 * n(T(l).profile.sessionsDescription, SANS(13), heroRoom(vw, room)))] },
    { route: "/profile/source-of-funds", tier: "form", rung: 24, bands: (vw, l, room) => [BL, hero(vw, pageHeader({ title: T(l).profile.sourceOfFunds, icon: 14, room: heroRoom(vw, room) }) + 12 + 17.875 * n(T(l).profile.sofDescription, SANS(13), Math.min(heroRoom(vw, room), 65 * width("0", SANS(13)))))] },
    { route: "/proposals", tier: "reading", rung: 32, bands: (vw, l, room) => [hero(vw, pageHeader({ title: T(l).proposals.voteForMarkets, icon: 18, room: heroRoom(vw, room) }) + 12 + 21)] },
    { route: "/proposals/new", tier: "form", rung: 24, bands: (vw, l, room) => [BL, hero(vw, pageHeader({ title: T(l).common.suggestMarket, icon: 18, room: heroRoom(vw, room) }) + 12 + 21)] },
    { route: "/watchlist", tier: "board", rung: 24, bands: (vw, l, room) => [pageHeader({ title: T(l).watchlist.title, icon: 22, room })] },
  ];
  for (const r of routes) {
    const cells: string[] = [];
    for (const vw of [390, 1280]) for (const l of LOCALES) {
      const bands = r.bands(vw, l, col(vw, r.tier));
      const firstData = bands.reduce((a, b) => a + b + r.rung, 0);
      cells.push(`${l}@${vw} ${r2(firstData)}`);
    }
    say(`${r.route.padEnd(30)} first data band at +${cells.join(" · ")} (old: the spinner panel at +0, 257 tall)`);
  }
}

/* ══ /agent/apply, /agent/status, /agent/invite ════════════════════════════════════════════════════════════════════ */
if (!only || only === "agent-subs") {
  say("\n── /agent/apply · /agent/status · /agent/invite (space-y-5: 24px rungs) ──");
  const BL = 44;
  for (const l of LOCALES) for (const vw of [320, 390, 1280]) {
    const t = dict[l], a = t.agent, room = col(vw, "form"), rr = col(vw, "reading"), pw = room - 42;
    // apply: the title row (max of the 22px title, the 23px status chip), the rail, step 1's panel, the nav.
    const btnW = (room - 12) / 4 - 8;
    const steps = [a.stepAbout, a.stepWhere, a.stepReferees, a.stepPayment];
    const stepRow = Math.max(...steps.map((s: string) => Math.max(44, 16.25 * n(s, SANS(13, 600), btnW))));
    const rail = 4 + 12 + 14 + 12 + stepRow;
    const slotW = vw >= 640 ? (pw - 16) / 2 : pw;
    const slot = (label: string) => Math.max(96, 4 + 32 + 48 + 18 * n(label, SORA(13, 600, 0), slotW - 36) + 2 + 18 * n(a.slotEmpty, MONO(13), slotW - 36));
    const slots = vw >= 640 ? Math.max(slot(a.docCv), slot(a.docRequest)) : slot(a.docCv) + 16 + slot(a.docRequest);
    const panel = 42 + 22.5 * n(a.stepAbout, SORA(18), pw) + 16 + slots + 16 + 21.125 * n(a.docPhotoHint, SANS(13), pw) + 16 + 21.125 * n(a.docIdNote, SANS(13), pw);
    const pageApply = { title: 23, rail, panel, nav: 44 };
    const pagePanelAt = BL + 24 + 23 + 24 + rail + 24, oldPanelAt = BL + 24 + 4 + 24;
    const pageNavAt = pagePanelAt + panel + 24, oldSecondAt = oldPanelAt + 126 + 24;
    // status: the header (54), panel 1 (2 + 20 + max(14 + 18, 23) + 16 + 18 + 20), panel 2 (title, two terms).
    const head = pageHeader({ title: a.statusTitle, room: rr });
    const p1 = 2 + 20 + Math.max(32, 23) + 16 + 18 + 20;
    const p2 = 42 + 22.5 * n(a.nextTitle, SORA(18), rr - 42) + 12 + [fill(a.nextReview, { days: "5" }), a.nextDecision].map((s: string) => 17.875 * n(s, SANS(13), rr - 42 - 20)).reduce((x: number, y: number) => x + y, 0) + 8;
    const statusPage = [BL, head, p1, p2], statusOld = [BL, 32, 126, 126];
    const at = (b: number[], i: number) => b.slice(0, i).reduce((x, y) => x + y + 24, 0);
    // invite: the header with its subtitle, the panel (14 + 4 + 24 + 4 + 18 + its 40 and border), the note, the actions.
    const ihead = pageHeader({ title: a.inviteTitle, subtitle: a.inviteBody, room: rr });
    const ipanel = 2 + 40 + 14 + 4 + 24 + 4 + 18;
    const note = 21.125 * n(a.inviteKycNote, SANS(13), rr);
    const sendW = 2 + 40 + 16 + 8 + width(a.inviteOtpSend, SANS(15, 600)), declW = 2 + 32 + width(a.inviteDecline, SANS(14, 600));
    const oneLine = sendW + declW <= rr;
    say(`${l}@${vw}: apply — title 23, rail ${r2(rail)} (step row ${r2(stepRow)}), panel ${r2(panel)}: the page's panel at +${r2(pagePanelAt)} vs the old first panel +${oldPanelAt} (${r2(pagePanelAt - oldPanelAt)}), its nav at +${r2(pageNavAt)} where the old second panel stood (+${oldSecondAt}) · status — header ${r2(head)} vs the old 32px bar (${r2(head - 32)}), panels ${r2(p1)} / ${r2(p2)} vs 126 / 126; the next-steps panel at +${r2(at(statusPage, 3))} vs +${at(statusOld, 3)} · invite — header ${r2(ihead)} vs 32, panel ${r2(ipanel)} vs 126, note ${r2(note)}, the two buttons ${oneLine ? "share a line" : "stack"} (${r2(sendW)} + ${r2(declW)} in ${rr})`);
  }
}

/* ══ /leaderboard ══════════════════════════════════════════════════════════════════════════════════════════════════ */
if (!only || only === "leaderboard") {
  say("\n── /leaderboard (space-y-6) — calibrated on tile 178 (1280, sw): ribbon 51, lens 44, sort 44, podium 236 (its leader without a streak), head 35, rows 57 ──");
  for (const l of LOCALES) for (const vw of [320, 390, 1280]) {
    const t = dict[l], room = col(vw, "reading");
    const head = pageHeader({ title: t.leaderboard.topPredictors, room });
    // Ribbon: 2 + 32 (py-3) + lines × 17 + (lines − 1) × 12; the three stats wrap 32px apart.
    const stat = (label: string, value: string) => width(label.toUpperCase(), MONO(10, 700, 1.4)) + 12 + width(value, MONO(16, 700));
    const stats = [stat(t.leaderboard.topTier, t.leaderboard.tierSilver.split(" ")[0]), stat(t.leaderboard.bestRoi, "54.1%"), stat(t.leaderboard.predictorsCount, "41")];
    let rl = 1, x = 0; for (const s of stats) { if (x > 0 && x + 32 + s > room - 42) { rl++; x = s; } else x = x ? x + 32 + s : s; }
    const ribbon = 2 + 32 + rl * 17 + (rl - 1) * 12;
    // Podium: the tallest column (bottoms aligned) — a column is the crown's room (22 + 4), the crest in its 3px ring
    // (56 or 48, + 6), 12, the handle row (stacked below 640: 22.5 + 4 + 22), 2 + the rate's 19.5, the streak line where
    // the player is on one (4 + 22.5) and the resolved line (4 + 15).
    const handleRow = vw >= 640 ? 22.5 : 48.5;
    const column = (crest: number, streak: boolean) => 22 + 4 + crest + 6 + 12 + handleRow + 2 + 19.5 + (streak ? 4 + 22.5 : 0) + 4 + 15;
    // The measured board (tiles 177, 178, 203): the leader without a streak, its two neighbours on one each.
    const podium = 2 + 32 + 20 + Math.max(column(56, false), column(48, true));
    const podiumLeaderStreak = 2 + 32 + 20 + column(56, true), podiumNone = 2 + 32 + 20 + Math.max(column(56, false), column(48, false));
    const rowH = (vw >= 768 ? 56 : 52) + 1;
    const firstRow = head + 32 + ribbon + 32 + 44 + 32 + 44 + 32 + podium + 32 + 1 + 35.25;
    const oldFirst = head + 32 + 193 + 32 + 1;
    say(`${l}@${vw}: ribbon ${r2(ribbon)} (${rl} line${rl > 1 ? "s" : ""}), podium ${r2(podium)} (a leader on a streak ${r2(podiumLeaderStreak)}, no streak at all ${r2(podiumNone)}), row ${rowH} — the first row at +${r2(firstRow)} vs the old ghost's +${r2(oldFirst)} (${r2(firstRow - oldFirst)}); old rows 57 against ${rowH}`);
  }
}

/* ══ /results — the carousel and row 2 from lg ═════════════════════════════════════════════════════════════════════ */
const pill = (label: string, digits = 2, glyph = false, amount = false) => 2 + 32 + width(label, amount ? MONO(13, 600) : SANS(13, 600)) + (glyph ? 22 : 0) + 8 + digits * 6.6;
const key = (k: string) => width(k.toUpperCase(), MONO(10, 700, 1.4)) + 2;
/** A wrapping row of items, `gap` apart; an item wider than the row takes its own lines (its own pills, 4px apart). */
function rowLines(items: Array<{ w: number; parts?: number[] }>, room: number, gap: number) {
  let lines = 0, x = 0;
  for (const it of items) {
    if (it.w > room && it.parts) {
      if (x > 0) { lines++; x = 0; }
      let il = 1, ix = 0; for (const p of it.parts) { if (ix > 0 && ix + 4 + p > room) { il++; ix = p; } else ix = ix ? ix + 4 + p : p; }
      lines += il; continue;
    }
    if (x > 0 && x + gap + it.w > room) { lines++; x = it.w; } else x = x ? x + gap + it.w : it.w;
  }
  return lines + (x > 0 ? 1 : 0);
}
if (!only || only === "results" || only === "markets") {
  const { sideWord } = req("F:/kipindi-r5l/src/lib/side-label.ts");
  const { categoryLabel } = req("F:/kipindi-r5l/src/lib/markets/category-label.ts");
  const { MARKET_CATEGORIES } = req("F:/kipindi-r5l/src/lib/markets/categories.ts");
  const { formatTzsCompact } = req("F:/kipindi-r5l/src/lib/utils.ts");
  const { POOL_FLOORS } = req("F:/kipindi-r5l/src/lib/markets/discovery.ts");
  const sort = (k: string, v: string) => 1 + 16 + width(k.toUpperCase(), MONO(10, 700, 1.4)) + 12 + width(v, SANS(13, 600)) + 12 + 14 + 16 + 44;
  const group = (k: string, ps: number[]) => ({ w: key(k) + 4 + ps.reduce((a, b) => a + b + 4, -4), parts: [key(k), ...ps] });
  say("\n── /results and /markets: row 2 from lg (two-digit counts, as the ghosts hold them; ±2px model) ──");
  for (const l of LOCALES) {
    const t = dict[l];
    const product = [t.market.catAll, `${sideWord(t, "YES", "MARKET")} / ${sideWord(t, "NO", "MARKET")}`, `${sideWord(t, "YES", "UPDOWN")} / ${sideWord(t, "NO", "UPDOWN")}`].map((s) => pill(s));
    const when = [t.common.rangeToday, t.common.rangeYesterday, t.common.range7d, t.common.range30d, t.common.rangeAll].map((s) => pill(s));
    const topics = [t.market.catAll, ...MARKET_CATEGORIES.map((c: string) => categoryLabel(t, c))].map((s: string) => pill(s, 2, true));
    const rItems = [{ w: sort(t.common.sort, t.results.sortNewest) }, group(t.market.gameKey, product), group(t.common.when, when), group(t.common.topic, topics)];
    const odds = [t.market.oddsAny, t.market.oddsCall, t.market.oddsCont, t.market.oddsLong].map((s) => pill(s));
    const pool = [pill(t.market.poolAny), pill(`${formatTzsCompact(POOL_FLOORS["10k"])}+`, 2, false, true), pill(`${formatTzsCompact(POOL_FLOORS["50k"])}+`, 2, false, true)];
    const menu = 2 + 32 + key(t.common.topic) - 2 + 12 + width(t.market.catAll, SANS(13, 600)) + 12 + 13.2 + 12 + 14;
    const mItems = [{ w: sort(t.common.sort, t.market.sortPool) }, group(t.market.oddsKey, odds), group(t.market.poolKey, pool), { w: menu }];
    for (const vw of [1024, 1280]) {
      const room = col(vw, "board");
      const rl = rowLines(rItems, room, 29), ml = rowLines(mItems, room, 29);
      say(`${l}@${vw}: /results row 2 ${rl} line(s) → ${rl * 44 + (rl - 1) * 12}px against the ghost's one 44px line (${(rl - 1) * 56} short) [${rItems.map((i) => r2(i.w)).join(" | ")}] · /markets row 2 ${ml} line(s) → ${(ml - 1) * 56} short [${mItems.map((i) => r2(i.w)).join(" | ")}]`);
    }
  }
}
if (!only || only === "results") {
  say("\n── /results: the notable carousel (3 slides: 56 arrows + the tallest card + 50 dots) — calibrated on tile 170 (1280, sw): the card 234 ──");
  const MS = req("F:/kipindi-r5l/src/lib/server/market-service.ts");
  const fs = require("fs");
  const src = fs.readFileSync("F:/kipindi-r5l/src/lib/server/market-service.ts", "utf8");
  const titles: Record<string, string[]> = { en: [], sw: [] };
  for (const m of src.matchAll(/titleEn: "([^"]+)", titleSw: "([^"]+)"/g)) { titles.en.push(m[1]); titles.sw.push(m[2]); }
  void MS;
  for (const l of ["sw", "en"] as const) {
    const cells: string[] = [];
    for (const vw of VW) {
      const room = col(vw, "board"), pad = vw >= 1024 ? 64 : 48, inner = room - 2 - pad;
      const px = vw >= 1024 ? 22 : 18, lh = px * 1.25;
      const box = Math.min(inner, 70 * width("0", SORA(px, 600)));
      const counts = titles[l].map((s) => n(s, SORA(px, 600), box)).sort((a, b) => a - b);
      const p80 = counts[Math.floor(counts.length * 0.75)]; // the tallest of three: the N/(N+1) quantile (p75)
      const chips = width(dict[l].market.resolvedOutcome + " · " + dict[l].common.no, SANS(10, 700)) + 14 + 2 + 90 + 12 + 12 + width(dict[l].results.notableResult.toUpperCase(), MONO(10, 700, 1.6)) + 19;
      const chipRow = chips <= inner ? 20 : 46;
      const card = (k: number) => 2 + pad + chipRow + 16 + lh * k + 20 + 52.5 + 16 + 16.5;
      cells.push(`@${vw} lines ${counts[0]}–${counts[counts.length - 1]} (p75 ${p80}) carousel ${r2(56 + card(p80) + 50)} vs the ghost's 458 (${r2(458 - (56 + card(p80) + 50))})`);
    }
    say(`${l}: ${cells.join(" · ")}`);
  }
}

/* ══ /live — the CTA row's wrap and the wall's cards ═══════════════════════════════════════════════════════════════ */
if (!only || only === "live") {
  say("\n── /live: the hero's CTA row (the button + 16 + six 24px dots) and the PulseCard's height ──");
  for (const l of LOCALES) {
    const t = dict[l];
    const btn = 2 + 32 + width(t.market.openMarket, SANS(14, 600));
    const row = btn + 16 + 144;
    const threshold = Math.ceil(row + 82);
    const card = (l === "sw" ? 13.5 * 4.125 : 13.5 * 2.75) + 2 + 40 + 20 + 12 + 16 + 9 + 10 + 18;
    say(`${l}: the page's row ${r2(row)}px → one line from ${threshold}px (the ghost's 310 → from 392); the card ${r2(card)} vs the ghost's 180 (${r2(card - 180)} a card; ${r2((card - 180) * 3)} over three rows of the wall)`);
  }
}

console.log(out.join("\n"));
