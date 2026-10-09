import { renderToStaticMarkup } from "react-dom/server";
import { createElement as h, Fragment } from "react";
import { keepFigures, keepNameEnd, keepIdRuns } from "F:/kipindi-r4h/src/components/ui/keep-words.tsx";
const r = (n: unknown) => renderToStaticMarkup(h(Fragment, null, n as never));
const titles = [
  "Je, mkimbiaji wa Tanzania atavunja dakika 28:00 kwenye 10K ya World Athletics ijayo?",
  "Will a Tanzanian runner break 28:00 in the next World Athletics 10K?",
  "Simba SC wins the NBC Premier League 2026-27", "辛巴俱乐部赢得2026-27赛季NBC超级联赛",
  "Bitcoin yafunga juu ya $100,000 tarehe 1 Agosti", "Bitcoin closes above $100,000 on 1 August",
  "Je, masika yataanza Dar es Salaam kabla ya Aprili 15?", "Will the long rains begin in Dar es Salaam before April 15?",
  "Je, joto la juu Mwanza litazidi nyuzi 32 Jumapili?", "Will Mwanza max temperature exceed 32°C this Sunday?",
  "Je, akiba ya BoT itazidi $5.5 bilioni kwenye taarifa ya kila mwezi ijayo?", "Will Bitcoin's 7-day move be positive?",
  "Je, video ijayo ya Wasafi itapita milioni 1 wiki ya kwanza?", "Will Sauti Sol release a new single in the next 30 days?",
  "USD/TZS closes below 2,650 at end of Q2", "美元兑坦桑尼亚先令二季度末收于2,650以下", "达累斯萨拉姆七月降雨超过200毫米", "比特币8月1日收于10万美元以上",
  "Will gold close above $2,400/oz next Friday?", "Je, mwendo wa Bitcoin wa siku 7 utakuwa chanya?", "Will Ethereum hit a new 30-day high before month-end?",
  "Mvua Dar es Salaam yazidi 200mm Julai", "Will the S&P 500 close higher this week?", "Je, masika yataisha kabla ya Mei 31 Dar es Salaam?",
];
for (const t of titles) console.log(r(keepFigures(t)));
console.log(r(keepNameEnd("欧阳慕容司马诸葛上官皇甫东方独孤令狐长孙宇文尉迟公孙轩辕西门南宫夏侯端木百里呼延")));
console.log(r(keepNameEnd("Mwanaisha Khamis Abdalla Mwinyimkuu Juma")), r(keepNameEnd("Juma K")), r(keepNameEnd("AB")), r(keepNameEnd("ABC")));
console.log(r(keepIdRuns("txn_ab12cd34ef56")), r(keepIdRuns("SEL2026100912345678901")), r(keepIdRuns("abc1234")), r(keepIdRuns("abcdefghi")));
