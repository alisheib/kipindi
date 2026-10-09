import { readFileSync } from "node:fs";
import { decomment } from "file:///F:/kipindi-r5i/scripts/lib/decomment.mts";
const W = decomment(readFileSync("src/app/wallet/wallet-client.tsx","utf8").replace(/\r\n/g,"\n"));
const a = W.indexOf("function TxnRow"); const b = W.indexOf("\nfunction ", a+15);
const txn = W.slice(a,b);
console.log(a,b, txn.length);
console.log(/settledCredit \|\| !\(isCredit \|\| movedNothing\) \? "bg-brand-500\/10 text-brand-300"\s*: "bg-bg-overlay text-text-subtle";/.test(txn));
console.log(/\$\{movedNothing \? "text-text-muted" : "text-text"\}/.test(txn), /yes-|no-\d/.test(txn), txn.match(/yes-|no-\d/g));
