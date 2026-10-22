// Regex-level checks on hand-derived substrings (own / sentence / tail / party / question) for the traces.
import { RX } from "./rx.mjs";
const t = (name, s) => { const re = RX[name]; re.lastIndex = 0; const m = re.exec(s); re.lastIndex = 0; return m ? `MATCH ${JSON.stringify(m[0])}` : "no"; };
const rows = [
  // H3-class: reader rule gated on currency
  ["CURRENCY_BEFORE", "50 pick: imagine "],
  ["CURRENCY_AFTER", " in your wal"],
  ["FRAME", "50 pick: imagine  50 pick: imagine   in your wallet"],
  ["YOURS_AFTER", " in your wallet!"],
  ["GET_BEFORE", "50 pick: imagine "],
  ["FRAME", "50 pick: this friday:  50 pick: this friday:   for you"],
  ["FRAME", "50 pick: your next  50 pick: your next   starts here"],
  // CLAUSE_START
  ["CLAUSE_START", "50 pick: ijumaa "],
  ["CLAUSE_START", "50 pick: wiki hii "],
  ["READER", "50 pick: ijumaa utakuwa na tzs  "],
  ["GET_BEFORE", "50 pick: ijumaa utakuwa na "],
  ["GET_BEFORE", "50 pick: wiki hii utapokea "],
  ["READER_AFTER", " unaweza kuzipata ijumaa"],
  // account fact / hypothetical
  ["ACCOUNT_FACT", "50 pick: salio lako linaweza kufika tzs  "],
  ["HYPOTHETICAL", "50 pick: salio lako linaweza kufika tzs  "],
  ["HYPOTHETICAL", "50 pick: salio lako litakuwa tzs   ijumaa"],
  ["ACCOUNT_FACT", "50 pick: play today and you have tzs   in your wallet by friday"],
  ["HYPOTHETICAL", "50 pick: play today and you have tzs   in your wallet by friday"],
  // H2
  ["PLATFORM_PAYS", "tzs   zimelipwa kwa wachezaji mwaka huu"],
  ["NAMES_50PICK", "tzs   zimelipwa kwa wachezaji mwaka huu"],
  ["LIMIT_BEFORE", "50 pick: tumetoa tzs "],
  ["PLATFORM_PAYS", "tumetoa tzs   kwa wachezaji mwaka huu"],
  ["LIMIT_BEFORE", "50 pick: we transferred tzs "],
  ["PLATFORM_PAYS", "we transferred tzs   to players last week"],
  ["PLATFORM_PAYS", "wachezaji wa 50 pick wamepokea tzs   mwaka huu"],
  ["PLATFORM_PAYS_NAMED", "wachezaji wa 50 pick wamepokea tzs   mwaka huu"],
  ["GET_BEFORE", "wachezaji wa 50 pick wamepokea "],
  ["PLATFORM_PAYS", "tzs   paid out so far"],
  ["PLATFORM_PAYS", "kampuni yetu imelipa tzs   kwa wachezaji mwaka huu"],
  ["PLATFORM_PAYS", "our players have received over tzs   so far"],
  ["LIMIT_BEFORE", "50 pick: we paid out withdrawals of tzs "],
  ["PLATFORM_PAYS", "we paid out withdrawals of tzs   to players this year"],
  ["PLATFORM_PAYS", "50 pick imetuma tzs   kwa wachezaji mwaka huu"],
  ["PLATFORM_PAYS_NAMED", "50 pick imetuma tzs   kwa wachezaji mwaka huu"],
  ["LIMIT_BEFORE", "50 pick: 50 pick imetuma tzs "],
  // M3
  ["GET_BEFORE", "50 pick: one lucky player took "],
  ["TAKE_BEFORE", "50 pick: one lucky player took "],
  ["HOME_AFTER", " this week!"],
  ["GET_BEFORE", "50 pick: one player received "],
  ["GET_BEFORE", "50 pick: someone just pocketed "],
  ["GET_BEFORE", "50 pick: ondoka na "],
  ["GET_BEFORE", "50 pick: jinyakulie "],
  ["PRIZE_WORDS", "50 pick: tzs   awarded every friday"],
  ["PRIZE_WORDS", "50 pick: tzs   giveaway this friday"],
  ["PRIZE_WORDS", "50 pick: donge nono la tzs   wiki hii"],
  ["MONEY_IN", "50 pick: 1,000 today could become tzs   on friday"],
  ["MONEY_IN", "50 pick: weka 1000 leo, tzs   ijumaa"],
  ["LIMIT_BEFORE", "50 pick: weka 1000 leo, tzs "],
  ["COUNT_AFTER", " wachezaji wetu!"],
  ["COUNT_AFTER", " watanzania wote!"],
  // split sentence
  ["PRIZE_WORDS", " tzs   "],
  ["QUESTION_BEFORE", "50 pick: shinda ijumaa hii!"],
  ["GET_BEFORE", "50 pick: shinda ijumaa hii! "],
  // FPs
  ["LIMIT_BEFORE", "50 pick: toa kuanzia tzs 1,000 hadi tzs "],
  ["MONEY_IN", "50 pick: toa kuanzia tzs 1,000 hadi tzs   kwa siku"],
  ["THIRD_SPEND", "50 pick: toa kuanzia tzs 1,000 hadi tzs "],
  ["ACCOUNT_FACT", "50 pick: toa kuanzia tzs 1,000 hadi tzs   kwa siku"],
  ["WINNINGS_BEFORE", "50 pick: malipo ya hadi tzs "],
  ["LIMIT_BEFORE", "50 pick: malipo ya hadi tzs "],
  ["TAX_HEADS", "50 pick: malipo ya hadi tzs "],
  ["NEXT_YOU", " wewe je, unadhani atafunga"],
  ["THIRD_SPEND", "50 pick: simba wamesajili mchezaji wa tzs "],
  ["INCOME_QUESTION", "50 pick: je, faida ya vodacom itapanda mwaka huu?"],
  ["MARKET_ASKS", "50 pick: je, faida ya vodacom itapanda mwaka huu?"],
  ["READER", "50 pick: je, faida ya vodacom itapanda mwaka huu?"],
  ["QUESTION_BEFORE", "50 pick: je, faida ya vodacom itapanda mwaka huu?"],
  ["FRAME", "50 pick: yanga inasubiri mshambuliaji wa tzs  50 pick: yanga inasubiri mshambuliaji wa tzs   kutoka ulaya"],
  ["PRICE_BEFORE", "50 pick: derby ticket prices range from tzs 5,000 to tzs "],
  ["PRICE_BEFORE", "50 pick: kiingilio: tzs 5,000 kawaida, tzs "],
  ["PLATFORM_PAYS", "our agents now pay out up to tzs   a day"],
  ["PLATFORM_PAYS", "wachezaji wa yanga walilipwa tzs   kama bonasi baada ya ubingwa"],
  ["TAX_FOLLOWS", " kama bonasi baada ya ubingwa."],
  ["PLATFORM_PAYS", "yanga's players were paid tzs   in bonuses after the title"],
  ["TAX_FOLLOWS", " in bonuses after the title."],
  ["LIMIT_BEFORE", "50 pick: ongeza tzs "],
  ["READER", "50 pick: ongeza tzs   upate bonasi ya tzs 10,000"],
  ["MONEY_IN", "50 pick: ongeza tzs   upate bonasi ya tzs 10,000"],
  ["MONEY_IN", "50 pick: stakes from tzs 500 to tzs   on every market"],
  ["THIRD_SPEND", " kwa michango ya tzs 1,000, tumekusanya tzs "],
  ["MONEY_IN", "50 pick: asante  kwa michango ya tzs 1,000, tumekusanya tzs   kwa hospitali ya amana"],
  // L3 / look-alikes
  ["FIGURE_O", "win tzs 1oooooo this week!"],
  ["FIGURE_O", "shinda tzs l000000 leo!"],
  ["FIGURE_O", "50pick: derby leo | 100 000 tiketi zimeuzwa!"],
  ["FIGURE_O", "shinda tzs ¡,000,000 leo!"],
  ["GROUPED_MARKS", "shinda tzs ¡,000,000 leo!"],
  ["COUNT_AFTER", " tiketi zimeuzwa!"],
  ["HAN", "50pick: 〇"],
];
for (const [n, s] of rows) console.log(`${n.padEnd(18)} ${t(n, s).padEnd(40)} <- ${JSON.stringify(s)}`);
// global regexes: list all matches
const all = (name, s) => [...s.matchAll(RX[name])].map((m) => m[0]);
console.log("MONEY_IN all (toa range):", JSON.stringify(all("MONEY_IN", "50 pick: toa kuanzia tzs 1,000 hadi tzs   kwa siku")));
console.log("MONEY_IN all (charity):", JSON.stringify(all("MONEY_IN", "50 pick: asante  kwa michango ya tzs 1,000, tumekusanya tzs   kwa hospitali ya amana")));
console.log("MONEY_IN all (1,000 today):", JSON.stringify(all("MONEY_IN", "50 pick: 1,000 today could become tzs   on friday")));
console.log("MONEY_IN all (prices range):", JSON.stringify(all("MONEY_IN", "50 pick: derby ticket prices range from tzs 5,000 to tzs  ")));
console.log("BARE all (1oooooo):", JSON.stringify(all("BARE", "win tzs 1 oooooo this week!")));
console.log("BARE all (l000000):", JSON.stringify(all("BARE", "shinda tzs l 000000 leo!")));
console.log("GROUPED_SPACES (| folded):", JSON.stringify(all("GROUPED_SPACES", "50 pick: derby leo 1 100 000 tiketi zimeuzwa!")));
console.log("split own:", JSON.stringify("50 pick: shinda ijumaa hii! tzs ".split(RX.SENTENCE_END)));
console.log("split after:", JSON.stringify("!".split(RX.SENTENCE_END)));
