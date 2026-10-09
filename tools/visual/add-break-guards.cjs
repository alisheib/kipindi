// The break-sheet guards: test:wallet-reach §7 + §8c.1b, the two updated pins, and red:wallet-reach's mutations.
const fs = require("fs");
const edit = (p, pairs) => {
  let s = fs.readFileSync(p, "utf8");
  const crlf = s.includes("\r\n");
  s = s.replace(/\r\n/g, "\n");
  for (const [a, b] of pairs) {
    const n = s.split(a).length - 1;
    if (n !== 1) throw new Error(`${p}: anchor found ${n}×: ${a.slice(0, 80)}`);
    s = s.replace(a, b);
  }
  fs.writeFileSync(p, crlf ? s.replace(/\n/g, "\r\n") : s);
};

const T = "scripts/wallet-reach.test.mts";
edit(T, [
  // §7: the break check, right after the frozen one
  [`     heldAt > 0 && heldAt < sheet.indexOf('href="/wallet/deposit"') && /t\\.kycGate\\.frozenTitle/.test(sheet));
`,
   `     heldAt > 0 && heldAt < sheet.indexOf('href="/wallet/deposit"') && /t\\.kycGate\\.frozenTitle/.test(sheet));
  // ⛔ …and a reader on a BREAK is offered no Deposit (2026-10-08): \`/wallet/deposit\` refuses one during a break, and the
  //    journey header (no "+ Weka pesa", S4) and \`/wallet\` (\`depositOpen\`) already keep the rule. Withdraw stays, alone
  //    and full width: a break does not stop withdrawals. §8c.1b holds the flag's way from the bar to here.
  const breakAt = sheet.indexOf("{!onBreak && (");
  const depAt = sheet.indexOf('href="/wallet/deposit"');
  const wdAt = sheet.indexOf('href="/wallet/withdraw"');
  const breakEnd = breakAt < 0 ? -1 : sheet.indexOf(")}", depAt);
  ok("7: ⛔ a reader on a BREAK gets no Deposit — the column lives inside {!onBreak && (…)}, Withdraw outside it, alone at the full width",
     breakAt > pairAt && breakAt < depAt && breakEnd > depAt && breakEnd < wdAt
     && sheet.includes('className={onBreak ? "kp-wsheet__pair kp-wsheet__pair--one" : "kp-wsheet__pair"}')
     && /\\.kp-wsheet__pair--one\\s*\\{\\s*grid-template-columns:\\s*minmax\\(0, 1fr\\);\\s*\\}/.test(css),
     \`break \${breakAt} · deposit \${depAt} · its end \${breakEnd} · withdraw \${wdAt}\`);
`],
  // §8.3: the captioned capsule's Wallet now also carries the break
  [`     cap.includes("<WalletSheet open={open} onClose={() => setOpen(false)} balance={balance} held={held} anchorRef={capsuleRef} journey />")`,
   `     cap.includes("<WalletSheet open={open} onClose={() => setOpen(false)} balance={balance} held={held} anchorRef={capsuleRef} journey onBreak={onBreak} />")`],
  // §8c.1: the capsule's guard, without the break (8c.1b holds that)
  [`     && jbar.includes('<WalletBalanceCaptioned balance={liveBalance} held={state.capsule === "held"} />')`,
   `     && jbar.includes('<WalletBalanceCaptioned balance={liveBalance} held={state.capsule === "held"} ')`],
  // §8c.1b: after 8c.1's ok(…)
  [`     capsule === "" ? "the capsule's guard was not found as written" : capsule.slice(0, 140));
`,
   `     capsule === "" ? "the capsule's guard was not found as written" : capsule.slice(0, 140));
  ok("8c.1b ⛔ the break reaches the Wallet — the bar hands its onBreak to the capsule, and the capsule to the journey's Wallet (§7: no Deposit during a break); the classic Wallet is never told",
     jbar.includes('<WalletBalanceCaptioned balance={liveBalance} held={state.capsule === "held"} onBreak={onBreak} />')
     && pill.includes("export function WalletBalanceCaptioned({ balance, held = false, onBreak = false }: { balance: number; held?: boolean; onBreak?: boolean }) {")
     && pill.includes("anchorRef={capsuleRef} journey onBreak={onBreak} />")
     && pill.includes("<WalletSheet open={open} onClose={() => setOpen(false)} balance={effectiveBalance} held={held} anchorRef={capsuleRef} />"));
`],
]);

const A = "scripts/anchors/wallet-reach.anchors.mjs";
edit(A, [
  [`    from: \`anchorRef={capsuleRef} journey />\`,
    to: \`anchorRef={capsuleRef} />\`,`,
   `    from: \`anchorRef={capsuleRef} journey onBreak={onBreak} />\`,
    to: \`anchorRef={capsuleRef} onBreak={onBreak} />\`,`],
  [`    expect: "8c.5 …and nothing AROUND them yields by width either",
  },
];`,
   `    expect: "8c.5 …and nothing AROUND them yields by width either",
  },
  // ── 2026-10-08 · THE BREAK IN THE JOURNEY'S WALLET ──────────────────────────
  // Three, each restoring one way a reader on a break is again offered a Deposit the deposit screen refuses.
  {
    name: "journey-wallet-offers-deposit-on-a-break",
    why: "the sheet's Deposit column comes out of its break guard: a reader on a self-imposed break taps the balance and is offered Weka pesa, which /wallet/deposit then refuses with the break's sentence. The header (S4) and /wallet (depositOpen) both withhold that offer",
    file: SHEET,
    suite: "wallet-reach",
    from: \`{!onBreak && (\`,
    to: \`{(\`,
    expect: "7: ⛔ a reader on a BREAK gets no Deposit",
  },
  {
    name: "journey-bar-keeps-the-break-from-its-wallet",
    why: "the bar stops handing its onBreak to the capsule: the sheet's guard reads clean and is never told, so the break's reader gets the Deposit again",
    file: JBAR,
    suite: "wallet-reach",
    from: \`held={state.capsule === "held"} onBreak={onBreak} />\`,
    to: \`held={state.capsule === "held"} />\`,
    expect: "8c.1b ⛔ the break reaches the Wallet",
  },
  {
    name: "captioned-capsule-drops-the-break",
    why: "the capsule takes the flag and does not pass it on: the bar and the sheet both read clean, and the Wallet between them offers the Deposit",
    file: PILL,
    suite: "wallet-reach",
    from: \`anchorRef={capsuleRef} journey onBreak={onBreak} />\`,
    to: \`anchorRef={capsuleRef} journey />\`,
    expect: "8c.1b ⛔ the break reaches the Wallet",
  },
];`],
]);
console.log("ok");
