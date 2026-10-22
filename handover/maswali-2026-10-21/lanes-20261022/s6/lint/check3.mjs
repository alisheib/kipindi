import { RX } from "./rx.mjs";
const t = (name, s) => { const re = RX[name]; re.lastIndex = 0; const m = re.exec(s); re.lastIndex = 0; return m ? `MATCH ${JSON.stringify(m[0])}` : "no"; };
const rows = [
  ["PLATFORM_PAYS", "we pay out up to tzs   a day, instantly"],
  ["LIMIT_BEFORE", "50 pick: we pay out up to tzs "],
  ["PLATFORM_PAYS", "tunalipa hadi tzs   kwa siku papo hapo"],
  ["LIMIT_BEFORE", "50 pick: tunalipa hadi tzs "],
  ["TAX_FOLLOWS", " kwa siku papo hapo."],
  ["THIRD_SPEND", "50 pick: we paid tzs "],
  ["THIRD_SPEND", "50 pick: 50 pick paid tzs "],
  ["TAX_HEADS", "50 pick: tumelipa kodi ya tzs "],
  ["THIRD_SPEND", "50 pick: tumelipa kodi ya tzs "],
  ["READER_ALL", "50 pick: do you follow the derby? simba's new tzs "],
  ["THIRD_PARTY", " follow the derby? simba's new tzs "],
  ["GENERIC_SUBJECT", " follow the derby? simba's new tzs "],
  ["MARKET_ASKS", "50 pick: do you follow the derby?"],
  ["READER", "50 pick: do you follow the derby?"],
  ["LIMIT_BEFORE", "50 pick: weka tzs 1000 upate tzs "],
  ["LIMIT_BEFORE", "50 pick: weka tzs 5,000 upate tzs "],
  ["GET_BEFORE", "50 pick: weka tzs 5,000 upate "],
  ["FRAME", "50 pick: taifa linasubiri uwanja wa tzs "],
  ["PRICE_BEFORE", "50 pick: the fee is tzs 1,000 per tzs "],
  ["LIMIT_BEFORE", "50 pick: the fee is tzs 1,000 per tzs "],
];
for (const [n, s] of rows) console.log(`${n.padEnd(16)} ${t(n, s).padEnd(40)} <- ${JSON.stringify(s)}`);
