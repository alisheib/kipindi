// Review A · t1: notification-text and break-end helpers on adversarial inputs (read-only; imports repo modules).
import { clipQuote, endClause, readableNotificationBody, ticketHref, roundTicketHref } from "file:///F:/kipindi-rev/src/lib/notification-text.ts";
import { breakEndParam, readBreakEndParam, formatBreakEnd, firstDateSentence, breakSentence, breakStateFromTimers } from "file:///F:/kipindi-rev/src/lib/break-end.ts";
import { dict } from "file:///F:/kipindi-rev/src/lib/i18n-dict.ts";

const show = (label: string, v: unknown) => console.log(label.padEnd(44), JSON.stringify(v));

console.log("== clipQuote ==");
const longSw = "Je, Simba SC watakuwa juu ya jedwali la NBC Premier League ifikapo raundi ya 20 ya msimu wa 2026-27?";
show("sw 60", clipQuote(longSw, 60));
show("sw 45", clipQuote(longSw, 45));
const zh = "达累斯萨拉姆七月降雨超过200毫米吗？NBC联赛2026-27赛季冠军会是Simba SC吗？";
show("zh 20", clipQuote(zh, 20));
show("zh 12", clipQuote(zh, 12));
show("zh 30", clipQuote(zh, 30));
show("one long word 10", clipQuote("Supercalifragilisticexpialidocious", 10));
show("emoji surrogate 5", clipQuote("😀😀😀😀😀😀😀😀", 5));
show("trailing junk", clipQuote("Hello world, (this is) a test of the trailing junk removal rule", 22));
show("fits exactly", clipQuote("abc", 3));
show("max 1", clipQuote("hello world", 1));
show("max 0", clipQuote("hello world", 0));
show("leading space then long", clipQuote("   Supercalifragilistic", 8));
show("all junk head", clipQuote("— — — — — — — — — — —", 6));
show("ZWJ family split?", clipQuote("Family 👨‍👩‍👧‍👦 wins big tonight here", 9));

console.log("== endClause ==");
show("ends .", endClause("Source withdrawn before settlement.", "."));
show("ends ..", endClause("Source withdrawn..", "."));
show("ends ?", endClause("Was it right?", "."));
show("ends …", endClause("A reason that was cut…", "."));
show("ends '.)'", endClause("Rules (see 4.2.)", "."));
show("zh ends 。", endClause("来源已撤回。", "。"));
show("zh ends .", endClause("Source gone.", "。"));
show("trailing space", endClause("gone.   ", "."));
show("empty", endClause("", "."));
show("clip+end (reason 130 chars)", endClause(clipQuote("x".repeat(10) + " " + "y".repeat(130), 120), "."));

console.log("== readableNotificationBody ==");
show("old ref", readableNotificationBody("Market X was voided. Your stake has been returned. · pos_34d10350dfa7510cfad5"));
show("old ..", readableNotificationBody("limefutwa: reason.. Dau lako."));
show("ellipsis ...", readableNotificationBody("wait... ok"));
show("version 1..2", readableNotificationBody("range 1..2 here"));
show("ref mid", readableNotificationBody("Title · pos_abc kimelipa. Bonyeza kuona."));
show("zh .。", readableNotificationBody("原因：来源已撤回.。您的本金"));

console.log("== ticketHref ==");
show("market+pos", ticketHref("mkt_1", "pos_1", "/x"));
show("no market", ticketHref("", "pos_1", "/x"));
show("no pos", ticketHref("mkt_1", undefined, "/x"));
show("round", roundTicketHref("/updown/r1#old", "pos_9"));

console.log("== break-end ==");
show("param ok", breakEndParam("2026-10-10T02:05:00Z"));
show("param day", breakEndParam("2026-10-10"));
show("param junk", breakEndParam("7 Oct. To reopen pay"));
show("param null", breakEndParam(null));
show("read instant", readBreakEndParam("2026-10-10T02:05:00.000Z"));
show("read instant no ms", readBreakEndParam("2026-10-10T02:05:00Z"));
show("read day", readBreakEndParam("2026-10-10"));
show("read bad day", readBreakEndParam("2026-02-31"));
show("read array", readBreakEndParam(["2026-10-10", "x"]));
show("read script", readBreakEndParam("<script>"));
const now = Date.parse("2026-10-09T12:00:00Z");
for (const l of ["sw", "en", "zh"] as const) {
  const m = dict[l].common.monthsShort;
  show(`fmt ${l} instant`, formatBreakEnd(Date.parse("2026-10-10T02:05:00.000Z"), now, m, l));
  show(`fmt ${l} day`, formatBreakEnd({ atMs: Date.parse("2026-10-10T00:00:00.000Z"), withTime: false }, now, m, l));
  show(`fmt ${l} perm (+100y)`, formatBreakEnd(now + 100 * 365 * 86400_000, now, m, l));
  show(`fmt ${l} NaN`, formatBreakEnd(Number.NaN, now, m, l));
  show(`fmt ${l} new year boundary`, formatBreakEnd(Date.parse("2026-12-31T22:30:00.000Z"), Date.parse("2026-12-31T20:00:00.000Z"), m, l));
  show(`firstDateSentence breakActive ${l}`, firstDateSentence(dict[l].rg.breakActive));
  show(`firstDateSentence exclusionActive ${l}`, firstDateSentence(dict[l].rg.exclusionActive));
}
show("breakSentence sw", breakSentence(dict.sw.rg.breakActive, "2026-10-10T02:05:00.000Z", now, dict.sw.common.monthsShort, "sw"));
show("timers both", breakStateFromTimers("2026-10-20T00:00:00Z", "2026-10-11T00:00:00Z", now));
show("timers past ex", breakStateFromTimers("2026-10-01T00:00:00Z", "2026-10-11T00:00:00Z", now));
show("timers junk", breakStateFromTimers("junk", null, now));
