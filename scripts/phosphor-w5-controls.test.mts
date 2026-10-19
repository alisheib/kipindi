/** W5: money doors keep one glyph per action, and the market's info control fills its rung. */
import { readFileSync } from "node:fs";

const ROOT = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const read = (path: string) => readFileSync(`${ROOT}/${path}`, "utf8");
const files = {
  bet: read("src/components/journey/bet-sheet/bet-sheet.tsx"),
  cashback: read("src/components/ui/cashback-promo.tsx"),
  card: read("src/components/markets/market-card.tsx"),
};

function contracts(s: typeof files): string[] {
  const bad: string[] = [];
  if (!s.bet.includes('className="kp-bsheet__deposit') || !s.bet.includes('leading={<I.arrowDownToLine s={20} />}'))
    bad.push("the bet sheet's low-balance deposit door lost the deposit glyph");
  if (!s.cashback.includes('href="/wallet/deposit"') || !s.cashback.includes('<I.arrowDownToLine s={13} edge="start" />'))
    bad.push("the cashback deposit door lost the deposit glyph");
  if (!s.card.includes('className="mcardp-info"') || !s.card.includes('I.info s={plateGlyph(44)}'))
    bad.push("the market's 44px info control lost its derived glyph size");
  return bad;
}

let failures = 0;
function check(label: string, ok: boolean, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"} ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures++;
}

if (process.argv.includes("--prove-red")) {
  check("green control", contracts(files).length === 0, contracts(files).join("; "));
  const plants: Array<[string, keyof typeof files, string, string]> = [
    ["bet deposit door borrows the wallet icon", "bet", "leading={<I.arrowDownToLine s={20} />}", "leading={<I.wallet s={20} />}"],
    ["cashback deposit door borrows the coin icon", "cashback", '<I.arrowDownToLine s={13} edge="start" />', '<I.coins s={13} edge="start" />'],
    ["info control shrinks back to a 12px mark", "card", "I.info s={plateGlyph(44)}", "I.info s={12}"],
  ];
  for (const [label, key, from, to] of plants) {
    if (!files[key].includes(from)) { check(label, false, "plant anchor absent"); continue; }
    const mutant = { ...files, [key]: files[key].replace(from, to) };
    check(label, contracts(mutant).length > 0, contracts(mutant).join("; "));
  }
} else check("W5 money and information doors", contracts(files).length === 0, contracts(files).join("; "));

console.log(`W5 controls: ${failures} failure(s)`);
if (failures) process.exit(1);
