/** One receipt event animates once per transaction and remains readable when
 * sessionStorage is unavailable. The red run mutates the actual claim helper. */
import { readFileSync } from "node:fs";
import ts from "typescript";
import { claimWalletResultMotion } from "../src/lib/wallet/result-motion.ts";

type Claim = typeof claimWalletResultMotion;
type Store = Parameters<Claim>[0];

function checks(claim: Claim): string[] {
  const bad: string[] = [];
  const check = (name: string, ok: boolean) => { if (!ok) bad.push(name); };
  const entries = new Map<string, string>();
  const storage: Store = {
    getItem: (key) => entries.get(key) ?? null,
    setItem: (key, value) => { entries.set(key, value); },
  };
  check("pending status does not claim", !claim(storage, "deposit-a", false));
  check("empty reference does not claim", !claim(storage, "", true));
  check("first confirmed result claims", claim(storage, "deposit-a", true));
  check("refresh of same result stays still", !claim(storage, "deposit-a", true));
  check("a new result may animate", claim(storage, "withdraw-b", true));
  check("blocked read stays still", !claim({ getItem: () => { throw new Error("blocked"); }, setItem: () => {} }, "deposit-c", true));
  check("blocked write stays still", !claim({ getItem: () => null, setItem: () => { throw new Error("blocked"); } }, "deposit-d", true));
  return bad;
}

const wallet = readFileSync("src/app/wallet/wallet-result-modal.tsx", "utf8").replace(/\r\n/g, "\n");
function wired(source: string): boolean {
  return /const \[animatedTxnId, setAnimatedTxnId\] = useState<string \| null>\(null\)/.test(source)
    && /useLayoutEffect\(\(\) => \{[\s\S]*?try \{[\s\S]*?claimWalletResultMotion\(window\.sessionStorage, txnId, depositConfirmed \|\| withdrawalRequested\)[\s\S]*?setAnimatedTxnId\(txnId\)[\s\S]*?\} catch \{/.test(source)
    && /const animate = animatedTxnId === txnId/.test(source)
    && /drawCheck=\{animate && depositConfirmed\}/.test(source);
}

const baseline = checks(claimWalletResultMotion);
if (baseline.length || !wired(wallet)) {
  console.error(`Wallet result motion: ${baseline.join("; ")}${!wired(wallet) ? "; first-paint/storage wiring" : ""}`);
  process.exit(1);
}

if (!process.argv.includes("--prove-red")) {
  console.log("Wallet result motion: 7/7 behavior cases and first-paint/storage wiring pass");
  process.exit(0);
}

const original = readFileSync("src/lib/wallet/result-motion.ts", "utf8");
function mutated(from: string, to: string): Claim {
  if (!original.includes(from)) throw new Error(`red plant anchor missing: ${from}`);
  const code = ts.transpileModule(original.replace(from, to), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText;
  const exports: Record<string, unknown> = {};
  new Function("exports", code)(exports);
  return exports.claimWalletResultMotion as Claim;
}
const plants: Array<[string, Claim, string]> = [
  ["claim before confirmation", mutated("!eligible || !txnId", "!txnId"), "pending status does not claim"],
  ["claim an empty reference", mutated("!eligible || !txnId", "!eligible"), "empty reference does not claim"],
  ["replay same receipt", mutated("if (storage.getItem(key) !== null) return false;", "void storage.getItem(key);"), "refresh of same result stays still"],
  ["fail to record the claim", mutated('storage.setItem(key, "1");', "void key;"), "refresh of same result stays still"],
  ["one marker for every result", mutated('`50pick-wallet-result-motion:${txnId}`', '`50pick-wallet-result-motion`'), "a new result may animate"],
  ["animate when storage is blocked", mutated("} catch {\n    return false;", "} catch {\n    return true;"), "blocked read stays still"],
];
let caught = 0;
for (const [name, plant, target] of plants) {
  const bad = checks(plant);
  if (!bad.includes(target)) throw new Error(`${name}: expected ${target}; got ${bad.join("; ")}`);
  caught++;
}
for (const [name, source] of [
  ["effect runs after first paint", wallet.replace("useLayoutEffect(() =>", "useEffect(() =>")],
  ["first render starts animated", wallet.replace("useState<string | null>(null)", 'useState<string | null>(deposited || withdrawal || "")')],
  ["storage getter is unguarded", wallet.replace("try {\n      if (claimWalletResultMotion", "if (claimWalletResultMotion")],
  ["another transaction inherits motion", wallet.replace("animatedTxnId === txnId", "!!animatedTxnId")],
] as const) {
  if (source === wallet || wired(source)) throw new Error(`${name}: wiring red plant escaped`);
  caught++;
}
console.log(`Wallet result motion: ${caught}/${plants.length + 4} red plants caught`);
