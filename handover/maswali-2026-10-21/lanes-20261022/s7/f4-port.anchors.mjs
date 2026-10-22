// S7 × S5 merge · source mutation proofs of the F4 port into the ONE ledger (`maswali-ledger.tsx`). Each undoes one ported
// rule in the real source; `test:maswali-register` must go red on the rendered case that holds that rule.
export const MUTATIONS = [
  {
    name: "(F4-note) the remainder's note fixed to the next jackpot again",
    file: "src/components/maswali/maswali-ledger.tsx",
    from: "note: remainderNoteOf(t, remainderFate(remainder, out?.amount ?? 0), final), value: money(remainder) });",
    to: "note: m.remainderNote, value: money(remainder) });",
    expect: "15.F4a",
  },
  {
    name: "(F4-final) a final week that paid carries to the next week again",
    file: "src/components/maswali/maswali-ledger.tsx",
    from: "        afterIn.push(final\n          ? { key: \"out\", label: m.keptInJackpot, value: money(out.amount) }",
    to: "        afterIn.push(false\n          ? { key: \"out\", label: m.keptInJackpot, value: money(out.amount) }",
    expect: "15.F4b",
  },
  {
    name: "(F4-flag) the register never hands the ledger the week's finality",
    file: "src/app/millionea/register/register-parts.tsx",
    from: "    finalWeek: w.isFinal,\n",
    to: "",
    expect: "15.F4b",
  },
];
