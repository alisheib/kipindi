// Disk plants for `red:deposit-slip-return` (MASWALI-BUILD FLOW 3, MB-57: a deposit started from the Millionea slip leads
// back to the slip) and `test:red-anchors`. The red runner (`scripts/deposit-slip-return.test.mts --prove-red`) writes each
// plant into the real source, runs the suite, requires it to fail ON THE NAMED CASE (`failure`), and restores the file byte
// for byte. The browser drive `qa:maswali-deposit-return` carries the first plant too (MLN_RETURN_PLANT=1).
// A dot is matched as [.], so no escape is typed.

export const MUTATIONS = [
  {
    name: "(DSR1) the slip dropped from the allowed returns",
    file: "src/lib/journey/slip-return.ts",
    from: "export const SLIP_RETURN_PATHS: readonly string[] = [MILLIONEA_SLIP_RETURN];",
    to: "export const SLIP_RETURN_PATHS: readonly string[] = [];",
    failure: /FAIL 1[.]1 /,
  },
  {
    name: "(DSR2) the slip's deposit door forgets the way back",
    file: "src/app/millionea/slip/slip-client.tsx",
    from: "new URLSearchParams({ amount: String(amount), from: \"low-balance\", returnPath: MILLIONEA_SLIP_RETURN })",
    to: "new URLSearchParams({ amount: String(amount), from: \"low-balance\" })",
    failure: /FAIL 2[.]1 /,
  },
  {
    name: "(DSR3) the deposit page honours the way back while Millionea is hidden from the reader",
    file: "src/app/wallet/deposit/page.tsx",
    from: "const slipReturn = slipAsked && (await resolveMillionea()).visible ? slipAsked : null;",
    to: "const slipReturn = slipAsked;",
    failure: /FAIL 2[.]2 /,
  },
  {
    name: "(DSR4) a classic deposit from the slip lands on the wallet's result again, which cannot wait for the money",
    file: "src/app/wallet/deposit/actions.ts",
    from: "if (journeyFlow || slipReturn) redirect(`/wallet/deposit/wait/${data.txnId}${slipQuery ? `?${slipQuery}` : \"\"}` as never);",
    to: "if (journeyFlow) redirect(`/wallet/deposit/wait/${data.txnId}${slipQuery ? `?${slipQuery}` : \"\"}` as never);",
    failure: /FAIL 2[.]5 /,
  },
  {
    name: "(DSR5) the wait page stops offering the slip once the money arrived",
    file: "src/app/wallet/deposit/wait/deposit-waiting-client.tsx",
    from: "{view.state === \"PAID\" && slipBack && <a href={slipBack} className=\"btn btn-primary btn-lg flex w-full justify-center\" data-testid=\"deposit-slip-return\">{t.millionea.depositReturnSlip}</a>}",
    to: "",
    failure: /FAIL 2[.]7 /,
  },
  {
    name: "(DSR6) the Swahili door loses its words",
    file: "src/lib/i18n-dict.ts",
    from: "depositReturnSlip: \"Rudi kwenye majibu yako\",",
    to: "depositReturnSlip: \"\",",
    failure: /FAIL 3[.]1 /,
  },
  {
    name: "(DSR7) the slip's deposit door hops softly again — the journey's board chrome stays over the payment",
    file: "src/app/millionea/slip/slip-client.tsx",
    from: "navigate(() => window.location.assign(`/wallet/deposit?${new URLSearchParams({ amount: String(amount), from: \"low-balance\", returnPath: MILLIONEA_SLIP_RETURN })}`))",
    to: "navigate(() => router.push(`/wallet/deposit?${new URLSearchParams({ amount: String(amount), from: \"low-balance\", returnPath: MILLIONEA_SLIP_RETURN })}` as never))",
    failure: /FAIL 2[.]1b /,
  },
];
