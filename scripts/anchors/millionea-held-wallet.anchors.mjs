// Disk plants for `red:millionea-held-wallet` (MASWALI-BUILD FLOW 13: a held wallet hears ONE Millionea sentence — the
// slip's pre-refusal, the buy's refusal and the hub's buy block) and `test:red-anchors`. The red runner
// (`scripts/millionea-held-wallet.test.mts --prove-red`) writes each plant into the real source, runs the suite, requires it
// to fail ON THE NAMED CASE (`failure`), and restores the file byte for byte.
// A dot is matched as [.], so no escape is typed.

export const MUTATIONS = [
  {
    name: "(HW1) the one choice says the Millionea sentence for every reason",
    file: "src/lib/millionea-refusal.ts",
    from: "return reason === \"wallet_frozen\" ? t.millionea.walletFrozen : null;",
    to: "return t.millionea.walletFrozen;",
    failure: /FAIL 1[.]2 /,
  },
  {
    name: "(HW2) the slip's pre-refusal falls back to the platform's sentence (\"bets can't be placed\")",
    file: "src/app/millionea/slip/page.tsx",
    from: "    } else if (millioneaRefusalBody(slip.refusal, t)) {\n      // FLOW 13 · a held wallet in Millionea's own buy words — the one sentence the buy's refusal and the hub say too.\n      said = { body: millioneaRefusalBody(slip.refusal, t)!, tone: \"neutral\" };\n",
    to: "",
    failure: /FAIL 2[.]1 /,
  },
  {
    name: "(HW3) the buy's refusal toast says the platform's sentence again",
    file: "src/app/millionea/slip/slip-client.tsx",
    from: "description: millioneaRefusalBody(reason, t) ?? said.body,",
    to: "description: said.body,",
    failure: /FAIL 2[.]2 /,
  },
  {
    name: "(HW4) the hub stops reading the held wallet — the fill door is offered to it again",
    file: "src/app/millionea/page.tsx",
    from: "breakBody={breakBody} walletHeld={walletHeld} guest={guest}",
    to: "breakBody={breakBody} guest={guest}",
    failure: /FAIL 2[.]3 /,
  },
  {
    name: "(HW5) the hub's held read narrows to FROZEN — a CLOSED wallet is offered the fill door the buy refuses",
    file: "src/lib/server/millionea-doors.ts",
    from: "return !!wallet && wallet.status !== \"ACTIVE\";",
    to: "return !!wallet && wallet.status === \"FROZEN\";",
    failure: /FAIL 2[.]4 /,
  },
  {
    name: "(HW6) the Swahili sentence takes the platform's bet verb",
    file: "src/lib/i18n-dict.ts",
    from: "walletFrozen: \"Pochi yako imegandishwa, kwa hiyo huwezi kukata tiketi. Wasiliana na msaada kutatua hili.\",",
    to: "walletFrozen: \"Pochi yako imegandishwa, kwa hiyo huwezi kuweka dau. Wasiliana na msaada kutatua hili.\",",
    failure: /FAIL 3[.]1 /,
  },
];
