// R5-J G-4: every count a player reads grouped through `formatNumber`. Exact, counted replacements; CRLF kept.
// Each file: [from, to, count] pairs, then an import step — `extend` (from → to on the utils import) or `insert` (a new
// line after an anchor line). Fails loudly on any count mismatch, writing nothing for that file.
import { readFileSync, writeFileSync } from "node:fs";
const ROOT = "F:/kipindi-r5j/";
const IMP = `import { formatNumber } from "@/lib/utils";`;
const F = (x) => `formatNumber(${x})`;
const PLAN = {
  "src/app/markets/page.tsx": {
    pairs: [
      [`<span className="font-semibold text-text">{openMarkets.length}</span>`, `<span className="font-semibold text-text">{${F("openMarkets.length")}}</span>`, 1],
      [`<span className="ml-1.5 font-mono text-[11px] tabular-nums opacity-80">{r.count}</span>`, `<span className="ml-1.5 font-mono text-[11px] tabular-nums opacity-80">{${F("r.count")}}</span>`, 1],
    ],
    extend: [`import { fill, formatTzsCompact } from "@/lib/utils";`, `import { fill, formatNumber, formatTzsCompact } from "@/lib/utils";`],
  },
  "src/app/live/page.tsx": {
    pairs: [[
      "{markets.length} {t.market.liveCount}{tippingMarkets > 0 ? ` · ${tippingMarkets} ${t.market.tipping}` : \"\"}",
      "{formatNumber(markets.length)} {t.market.liveCount}{tippingMarkets > 0 ? ` · ${formatNumber(tippingMarkets)} ${t.market.tipping}` : \"\"}", 1]],
    extend: [`import { fill } from "@/lib/utils";`, `import { fill, formatNumber } from "@/lib/utils";`],
  },
  "src/app/profile/account/page.tsx": {
    pairs: [
      [`{activity.length} {t.common.events}`, `{${F("activity.length")}} {t.common.events}`, 1],
      [`.replace("{n}", String(allActivity.length))`, `.replace("{n}", ${F("allActivity.length")})`, 1],
      [`.replace("{total}", String(own.total))`, `.replace("{total}", ${F("own.total")})`, 1],
    ],
    insertAfter: `import { BackLink } from "@/components/ui/back-link";`,
  },
  "src/app/updown/history/page.tsx": {
    pairs: [
      ["{`${EXIT_LABEL[e.id] ?? e.id} (${e.count})`}", "{`${EXIT_LABEL[e.id] ?? e.id} (${formatNumber(e.count)})`}", 1],
      [`text-text">{viewRounds.length}</div>`, `text-text">{${F("viewRounds.length")}}</div>`, 1],
      [`{rows.length} {t.market.udBets}`, `{${F("rows.length")}} {t.market.udBets}`, 1],
      [`{wins}/{decided} decided`, `{${F("wins")}}/{${F("decided")}} decided`, 1],
      [`t.market.udHistoryCapped.replace("{n}", String(UD_HISTORY_LIMIT))`, `t.market.udHistoryCapped.replace("{n}", ${F("UD_HISTORY_LIMIT")})`, 1],
      [`{g.bets.length} {t.market.udBets}`, `{${F("g.bets.length")}} {t.market.udBets}`, 1],
    ],
    extend: [`import { formatTzs, formatTzsSigned } from "@/lib/utils";`, `import { formatNumber, formatTzs, formatTzsSigned } from "@/lib/utils";`],
  },
  "src/app/proposals/page.tsx": {
    pairs: [[`{totalProposals.toLocaleString()} {t.proposals.proposalsCount} · {totalVotes.toLocaleString()} {t.proposals.votesCount}`,
      `{${F("totalProposals")}} {t.proposals.proposalsCount} · {${F("totalVotes")}} {t.proposals.votesCount}`, 1]],
  },
  "src/app/results/page.tsx": {
    pairs: [
      [`{sideWord(t, "YES", line)} {winsIn(line, "YES")}`, `{sideWord(t, "YES", line)} {${F(`winsIn(line, "YES")`)}}`, 1],
      [`{sideWord(t, "NO", line)} {winsIn(line, "NO")}`, `{sideWord(t, "NO", line)} {${F(`winsIn(line, "NO")`)}}`, 1],
      [`{t.market.statusVoid} {voidCount}`, `{t.market.statusVoid} {${F("voidCount")}}`, 1],
      ["`${totalCount} ${totalCount === 1 ? t.results.resultMatch : t.results.resultsMatch} \"${qRaw}\"`",
        "`${formatNumber(totalCount)} ${totalCount === 1 ? t.results.resultMatch : t.results.resultsMatch} \"${qRaw}\"`", 1],
    ],
  },
  "src/app/positions/page.tsx": {
    pairs: [
      ["ofSettled: `${settled.length} ${t.market.tickerSettled}`", "ofSettled: `${formatNumber(settled.length)} ${t.market.tickerSettled}`", 1],
      ["label: `${EXIT_LABEL[e.id] ?? e.id} (${e.count})`", "label: `${EXIT_LABEL[e.id] ?? e.id} (${formatNumber(e.count)})`", 1],
    ],
    extend: [`import { formatTzsCompact } from "@/lib/utils";`, `import { formatNumber, formatTzsCompact } from "@/lib/utils";`],
  },
  "src/app/positions/performance/page.tsx": {
    pairs: [
      [`label={t.performance.marketsSettled} value={String(totalBets)} />`, `label={t.performance.marketsSettled} value={${F("totalBets")}} />`, 1],
      [`<span className="ml-auto font-mono text-[12px] text-text-subtle">{recentSettled.length}</span>`, `<span className="ml-auto font-mono text-[12px] text-text-subtle">{${F("recentSettled.length")}}</span>`, 1],
    ],
    extend: [`import { formatTzsAbs, formatTzsSigned } from "@/lib/utils";`, `import { formatNumber, formatTzsAbs, formatTzsSigned } from "@/lib/utils";`],
  },
  "src/app/profile/page.tsx": {
    pairs: [
      [`value={String(positions.filter((p) => p.status === "OPEN").length)}`, `value={${F(`positions.filter((p) => p.status === "OPEN").length`)}}`, 1],
      [`value={String(positions.filter((p) => p.status !== "OPEN").length)}`, `value={${F(`positions.filter((p) => p.status !== "OPEN").length`)}}`, 1],
    ],
    extend: [`import { formatTzs } from "@/lib/utils";`, `import { formatNumber, formatTzs } from "@/lib/utils";`],
  },
  "src/app/profile/notifications/page.tsx": {
    pairs: [[`            {watched.length}\n`, `            {${F("watched.length")}}\n`, 1]],
    insertAfter: `import { BackLink } from "@/components/ui/back-link";`,
  },
  "src/app/profile/invite/page.tsx": {
    pairs: [
      [`    : String(s.recruitCount);`, `    : ${F("s.recruitCount")};`, 1],
      [`          value={String(s.recruitCount)}`, `          value={${F("s.recruitCount")}}`, 1],
      [`{ shown: s.recruits.length, total: s.recruitCount }`, `{ shown: ${F("s.recruits.length")}, total: ${F("s.recruitCount")} }`, 1],
    ],
  },
  "src/app/profile/invite/agent-dashboard.tsx": {
    pairs: [
      [`{t.agent.dashRecruits} · {dash.recruitCount}`, `{t.agent.dashRecruits} · {${F("dash.recruitCount")}}`, 1],
      [`{ n: String(dash.preAgentRecruitCount) }`, `{ n: ${F("dash.preAgentRecruitCount")} }`, 1],
    ],
  },
  "src/app/profile/kyc/page.tsx": {
    pairs: [[`.replace("{n}", String(attachedCount)).replace("{total}", String(requiredSlots.length))`,
      `.replace("{n}", ${F("attachedCount")}).replace("{total}", ${F("requiredSlots.length")})`, 1]],
    insertAfter: `import { BackLink } from "@/components/ui/back-link";`,
  },
  "src/app/agent/apply/apply-client.tsx": {
    pairs: [[`{ n: String(attached), total: String(REQUIRED.length) }`, `{ n: ${F("attached")}, total: ${F("REQUIRED.length")} }`, 1]],
    extend: [`import { fill, formatTzs } from "@/lib/utils";`, `import { fill, formatNumber, formatTzs } from "@/lib/utils";`],
  },
  "src/app/proposals/new/create-form.tsx": {
    pairs: [
      [`<span className="font-mono">{openCount} / {rateLimit}</span>`, `<span className="font-mono">{${F("openCount")}} / {${F("rateLimit")}}</span>`, 1],
      [`{titleEn.length}/120</span>`, `{${F("titleEn.length")}}/120</span>`, 1],
    ],
    insertAfter: `import { I } from "@/components/ui/glyphs";`,
  },
  "src/app/markets/[id]/page.tsx": {
    pairs: [[`label={t.market.predictors} font="mono" value={String(m.predictorCount)}`, `label={t.market.predictors} font="mono" value={${F("m.predictorCount")}}`, 1]],
    extend: [`import { formatTzsCompact, formatTzs, fill } from "@/lib/utils";`, `import { formatTzsCompact, formatTzs, fill, formatNumber } from "@/lib/utils";`],
  },
  "src/app/updown/[roundId]/page.tsx": {
    pairs: [
      [`{t.market.udPositionsOnRound} · {myPosition.items.length}`, `{t.market.udPositionsOnRound} · {${F("myPosition.items.length")}}`, 1],
      [`{round.players.toLocaleString()}`, `{${F("round.players")}}`, 1],
    ],
    extend: [`import { fill, formatTzs } from "@/lib/utils";`, `import { fill, formatNumber, formatTzs } from "@/lib/utils";`],
  },
  "src/app/wallet/page.tsx": {
    pairs: [["label: `${EXIT_LABEL[e.id] ?? e.id} (${e.count})`", "label: `${EXIT_LABEL[e.id] ?? e.id} (${formatNumber(e.count)})`", 1]],
    insertAfter: `import { pathWithQuery } from "@/lib/safe-next";`,
  },
  "src/app/wallet/wallet-client.tsx": {
    pairs: [[`+{grants.length - GRANTS_SHOWN} {grants.length - GRANTS_SHOWN > 1`, `+{${F("grants.length - GRANTS_SHOWN")}} {grants.length - GRANTS_SHOWN > 1`, 1]],
  },
  "src/app/wallet/receipts/page.tsx": {
    pairs: [["{`${EXIT_LABEL[e.id] ?? e.id} (${e.count})`}", "{`${EXIT_LABEL[e.id] ?? e.id} (${formatNumber(e.count)})`}", 1]],
  },
  "src/app/leaderboard/page.tsx": {
    pairs: [
      [`value: rows.length.toLocaleString("en-US"),`, `value: ${F("rows.length")},`, 1],
      [`fill(t.leaderboard.boardCapped, { n: String(rows.length) })`, `fill(t.leaderboard.boardCapped, { n: ${F("rows.length")} })`, 1],
    ],
  },
  "src/app/notifications/page.tsx": {
    pairs: [[`t.notif.unreadN.replace("{n}", String(counts.unread))`, `t.notif.unreadN.replace("{n}", ${F("counts.unread")})`, 1]],
    extend: [`import { cn } from "@/lib/utils";`, `import { cn, formatNumber } from "@/lib/utils";`],
  },
  "src/components/markets/comments-thread.tsx": {
    pairs: [
      [`data-result-count={total}>{total}</span>`, `data-result-count={total}>{${F("total")}}</span>`, 1],
      [`.replace("{n}", String(comments.length)).replace("{total}", String(total))`, `.replace("{n}", ${F("comments.length")}).replace("{total}", ${F("total")})`, 1],
      [`({comments.length - INITIAL_SHOW} {t.common.more})`, `({${F("comments.length - INITIAL_SHOW")}} {t.common.more})`, 1],
    ],
    insertAfter: `import { Spinner } from "@/components/ui/spinner";`,
  },
  "src/components/positions/pnl-summary-strip.tsx": {
    pairs: [
      ["sub={`${openCount} ${t.open}`}", "sub={`${formatNumber(openCount)} ${t.open}`}", 1],
      ["sub={`${wins}W \\u00b7 ${losses}L \\u00b7 ${cashOuts}C`}", "sub={`${formatNumber(wins)}W \\u00b7 ${formatNumber(losses)}L \\u00b7 ${formatNumber(cashOuts)}C`}", 1],
    ],
    extend: [`import { formatTzsAbs, formatTzsSigned } from "@/lib/utils";`, `import { formatNumber, formatTzsAbs, formatTzsSigned } from "@/lib/utils";`],
  },
  "src/components/markets/notify-poller.tsx": {
    pairs: [[`.replace("{n}", String(n))`, `.replace("{n}", ${F("n")})`, 2]],
    extend: [`import { formatTzs } from "@/lib/utils";`, `import { formatNumber, formatTzs } from "@/lib/utils";`],
  },
  "src/components/updown/updown-result-announcer.tsx": {
    pairs: [[`.replace("{n}", String(n))`, `.replace("{n}", ${F("n")})`, 2]],
    extend: [`import { formatTzs } from "@/lib/utils";`, `import { formatNumber, formatTzs } from "@/lib/utils";`],
  },
  "src/components/layout/away-summary-bar.tsx": {
    pairs: [[`  const n = (v: number) => String(v);`, `  const n = formatNumber;`, 1]],
    extend: [`import { formatTzs } from "@/lib/utils";`, `import { formatNumber, formatTzs } from "@/lib/utils";`],
  },
  "src/components/journey/journey-tabs.tsx": {
    pairs: [[`t.notif.unreadN.replace("{n}", String(unread))`, `t.notif.unreadN.replace("{n}", ${F("unread")})`, 1]],
    insertAfter: `import { I } from "@/components/ui/glyphs";`,
  },
  "src/components/journey/account/unread-row.tsx": {
    pairs: [[`fill(t.notif.unreadN, { n })`, `fill(t.notif.unreadN, { n: ${F("n")} })`, 1]],
    extend: [`import { fill } from "@/lib/utils";`, `import { fill, formatNumber } from "@/lib/utils";`],
  },
  "src/components/chat/ChatBubble.tsx": {
    pairs: [[`aria-label={t.chat.unread.replace("{n}", String(unread))}`, `aria-label={t.chat.unread.replace("{n}", ${F("unread")})}`, 1]],
    insertAfter: `import { useT } from "@/lib/i18n";`,
  },
  "src/components/home/landing-hero.tsx": {
    pairs: [
      [`fill(t.home.heroBrowseAll, { n: figures.openCount })`, `fill(t.home.heroBrowseAll, { n: ${F("figures.openCount")} })`, 1],
      [`fill(t.home.heroBoardCloseToday, { n: figures.closingToday })`, `fill(t.home.heroBoardCloseToday, { n: ${F("figures.closingToday")} })`, 1],
      [`fill(t.home.gridSeeAll, { n: figures.openCount })`, `fill(t.home.gridSeeAll, { n: ${F("figures.openCount")} })`, 1],
    ],
  },
  "src/components/home/topic-tiles.tsx": {
    pairs: [[`fill(t.home.topicLive, { n: tp.count })`, `fill(t.home.topicLive, { n: ${F("tp.count")} })`, 1]],
    extend: [`import { fill, formatTzsCompact } from "@/lib/utils";`, `import { fill, formatNumber, formatTzsCompact } from "@/lib/utils";`],
  },
  "src/components/home/updown-band.tsx": {
    pairs: [[`fill(t.home.updownRoundsLive, { n: liveCount })`, `fill(t.home.updownRoundsLive, { n: ${F("liveCount")} })`, 1]],
    extend: [`import { fill } from "@/lib/utils";`, `import { fill, formatNumber } from "@/lib/utils";`],
  },
  "src/components/journey/tickets/tickets-view.tsx": {
    pairs: [["{`${t.journey.ticketsExitLens} (${e.count})`}", "{`${t.journey.ticketsExitLens} (${formatNumber(e.count)})`}", 1]],
    insertAfter: `import { I } from "@/components/ui/glyphs";`,
  },
  "src/components/markets/objection-dialog.tsx": {
    pairs: [[`<span className="font-mono tabular-nums shrink-0">{detail.length}/{DETAIL_MAX}</span>`,
      `<span className="font-mono tabular-nums shrink-0">{${F("detail.length")}}/{${F("DETAIL_MAX")}}</span>`, 1]],
    insertAfter: `import { Textarea } from "@/components/ui/textarea";`,
  },
  "src/app/live/featured-contest.tsx": {
    pairs: [[`{idx + 1}<span className="text-text-faint"> / {n}</span>`, `{${F("idx + 1")}}<span className="text-text-faint"> / {${F("n")}}</span>`, 1]],
    insertAfter: `import { leanWords, sideWord } from "@/lib/side-label";`,
  },
  "src/app/results/notable-carousel.tsx": {
    pairs: [[`{current + 1}<span className="text-text-faint"> / {n}</span>`, `{${F("current + 1")}}<span className="text-text-faint"> / {${F("n")}}</span>`, 1]],
    insertAfter: `import { useT } from "@/lib/i18n";`,
  },
};
let failed = false;
for (const [rel, plan] of Object.entries(PLAN)) {
  const p = ROOT + rel;
  const raw = readFileSync(p, "utf8");
  let s = raw.replace(/\r\n/g, "\n");
  let ok = true;
  const swap = (from, to, want) => {
    const n = s.split(from).length - 1;
    if (n !== want) { console.error(`${rel}: ${JSON.stringify(from).slice(0, 110)} expected ${want}, found ${n}`); ok = false; return; }
    s = s.split(from).join(to);
  };
  for (const [from, to, want] of plan.pairs) swap(from, to, want);
  if (plan.extend) swap(plan.extend[0], plan.extend[1], 1);
  if (plan.insertAfter) {
    if (s.includes(IMP)) { console.error(`${rel}: already imports formatNumber`); ok = false; }
    else swap(plan.insertAfter + "\n", plan.insertAfter + "\n" + IMP + "\n", 1);
  }
  if (!ok) { failed = true; continue; }
  writeFileSync(p, raw.includes("\r\n") ? s.replace(/\n/g, "\r\n") : s);
  console.log(`${rel}: ${plan.pairs.reduce((a, x) => a + x[2], 0)} site(s)${plan.extend ? " · import extended" : plan.insertAfter ? " · import added" : " · import present"}`);
}
if (failed) { console.error("SOME FILES NOT WRITTEN"); process.exit(1); }
