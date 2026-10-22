import { RX } from "./rx.mjs";
const t = (name, s) => { const re = RX[name]; re.lastIndex = 0; const m = re.exec(s); re.lastIndex = 0; return m ? `MATCH ${JSON.stringify(m[0])}` : "no"; };
const rows = [
  // a limit / price word reaching across the stake figure to the prize figure
  ["LIMIT_BEFORE", "50 pick: deposit tzs 1000 and get tzs "],
  ["PRIZE_WORDS", "50 pick: deposit tzs 1000 and get tzs   this friday"],
  ["YOURS_AFTER", " this friday!"],
  ["LIMIT_BEFORE", "50 pick: weka tzs 1000 leo upate tzs "],
  ["LIMIT_BEFORE", "50 pick: ukiweka tzs 1000 utapata tzs "],
  ["PRICE_BEFORE", "50 pick: ticket price tzs 1000 for tzs "],
  ["READER", "price tzs 1000 for tzs "],
  ["PRIZE_WORDS", "50 pick: ticket price tzs 1000 for tzs   this friday"],
  ["GET_BEFORE", "50 pick: ticket price tzs 1000 for "],
  ["PRICE_BEFORE", "50 pick: bei ni tzs 1000 tu kwa tzs "],
  // reader 'that' lift
  ["THIRD_PARTY", " hear that tzs "],
  // count-after vocative
  ["COUNT_AFTER", " mashabiki!"],
  // payments by 50pick with the sender's name only
  ["PLATFORM_PAYS", "paid out this year: tzs  "],
  ["WINNINGS_BEFORE", "50 pick: paid out this year: tzs "],
  // the tax lift
  ["TAX_FOLLOWS", " kwa ada za wachezaji."],
  ["PLATFORM_PAYS", "tumelipa tzs   kwa ada za wachezaji"],
  // WAIT_AFTER FP check
  ["WAIT_AFTER", " awaiting approval for the new stadium."],
  // NEXT_YOU on next sentence for an ordinary 'could be you'
  ["NEXT_YOU", " could be you in the stands on saturday"],
  // HYPOTHETICAL / ACCOUNT on 'una ... kwenye pochi yako' with Ijumaa
  ["ACCOUNT_FACT", "50 pick: ijumaa una tzs   kwenye pochi yako"],
  ["HYPOTHETICAL", "50 pick: ijumaa una tzs   kwenye pochi yako"],
  // awarded / bagged
  ["GET_BEFORE", "50 pick: one player bagged "],
  // the 'usikose' imperative
  ["READER", "50 pick: usikose tzs   ijumaa hii"],
  // THIRD_SPEND on deposits
  ["THIRD_SPEND", "50 pick: deposit tzs 1000 and get tzs "],
  // 'Simba took' EN control vs SW
  ["GET_BEFORE", "50 pick: simba wamechukua "],
];
for (const [n, s] of rows) console.log(`${n.padEnd(16)} ${t(n, s).padEnd(44)} <- ${JSON.stringify(s)}`);
console.log("len after deposit:", JSON.stringify(" tzs 1000 and get tzs ".length), "after weka:", " tzs 1000 leo upate tzs ".length, "after ukiweka:", " tzs 1000 utapata tzs ".length, "after price:", " tzs 1000 for tzs ".length, "after bei:", " ni tzs 1000 tu kwa tzs ".length);
