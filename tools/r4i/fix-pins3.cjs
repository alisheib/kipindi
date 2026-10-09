const edit = require("./edit-lib.cjs");
process.chdir("F:/kipindi-r4i");
edit("scripts/wallet-reach.test.mts", [
  ["     cap.includes(\"<WalletSheet open={open} onClose={() => setOpen(false)} balance={balance} held={held} anchorRef={capsuleRef} journey onBreak={onBreak} />\")",
   "     // R4-I (2026-10-09): the journey's Wallet is also handed the break's end (`breakEnd`), for its notice.\n     cap.includes(\"<WalletSheet open={open} onClose={() => setOpen(false)} balance={balance} held={held} anchorRef={capsuleRef} journey onBreak={onBreak} breakEnd={breakEnd} />\")"],
  ["     jbar.includes('<WalletBalanceCaptioned balance={liveBalance} held={state.capsule === \"held\"} onBreak={onBreak} />')\n     && pill.includes(\"export function WalletBalanceCaptioned({ balance, held = false, onBreak = false }: { balance: number; held?: boolean; onBreak?: boolean }) {\")\n     && pill.includes(\"anchorRef={capsuleRef} journey onBreak={onBreak} />\")",
   "     // R4-I (2026-10-09): the break's END rides beside the flag (`breakEnd`) — the bar to the capsule, the capsule to the\n     // journey's Wallet, which states it; the classic Wallet is still told neither.\n     jbar.includes('<WalletBalanceCaptioned balance={liveBalance} held={state.capsule === \"held\"} onBreak={onBreak} breakEnd={breakEnd} />')\n     && pill.includes(\"export function WalletBalanceCaptioned({ balance, held = false, onBreak = false, breakEnd = null }: { balance: number; held?: boolean; onBreak?: boolean; breakEnd?: BreakState | null }) {\")\n     && pill.includes(\"anchorRef={capsuleRef} journey onBreak={onBreak} breakEnd={breakEnd} />\")"],
]);
edit("scripts/market-columns.test.mts", [
  ["     /<Stat size=\"sm-plain\" labelStyle=\"widest\" boxed=\"card\" label=\\{t\\.market\\.resolves\\}/.test(strip)",
   "     // R4-I (2026-10-09): labelled `common.resolves` — Swahili `market.resolves` read \"Inaisha\", \"it ends\".\n     /<Stat size=\"sm-plain\" labelStyle=\"widest\" boxed=\"card\" label=\\{t\\.common\\.resolves\\}/.test(strip)"],
]);
