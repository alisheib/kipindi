import { width, lines, dict } from "./lib-measure.mts";
console.log("Airtel Money 13/500", width("Airtel Money", { face: "inter", px: 13, weight: 500 }).toFixed(1));
console.log("Mixx by Yas 13/500", width("Mixx by Yas", { face: "inter", px: 13, weight: 500 }).toFixed(1));
console.log("Utabiri wako sora 28/700", width("Utabiri wako", { face: "sora", px: 28, weight: 700, track: -0.02 }).toFixed(1));
console.log("Angalia utendaji 13/600", width("Angalia utendaji", { face: "inter", px: 13, weight: 600 }).toFixed(1));
console.log("TZS 10,000 mono28", width("TZS 10,000", { face: "mono", px: 28, weight: 700 }).toFixed(1));
console.log("lines footnote sw @ 496", lines(dict.sw.wallet.receiptFootnote, { face: "inter", px: 13 }, 496));
console.log("lines footnote sw @ 288", lines(dict.sw.wallet.receiptFootnote, { face: "inter", px: 13 }, 288));
console.log("lines footnote zh @ 288", lines(dict.zh.wallet.receiptFootnote, { face: "inter", px: 13 }, 288));
