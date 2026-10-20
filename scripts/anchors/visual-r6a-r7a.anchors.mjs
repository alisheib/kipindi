/** Source-copy red plants for the U43 R6-A/R7-A integration guards. */
export const MUTATIONS = [
  {
    name: "locked card loses its locked phase",
    file: "scripts/visual-pass-r6a.test.mts",
    from: 'const locked = card("sw", { breakBody: sentenceOf("sw", false), selectionClosesAtMs: NOW - MIN });',
    to: 'const locked = card("sw", { breakBody: sentenceOf("sw", false), selectionClosesAtMs: NOW - MIN }).replace(\'data-phase="locked"\', \'data-phase="open"\');',
    expect: "FAIL 3.4 · EXECUTED · a LOCKED card keeps its locked reason",
  },
  {
    name: "locked card loses its reason",
    file: "scripts/visual-pass-r6a.test.mts",
    from: 'const locked = card("sw", { breakBody: sentenceOf("sw", false), selectionClosesAtMs: NOW - MIN });',
    to: 'const locked = card("sw", { breakBody: sentenceOf("sw", false), selectionClosesAtMs: NOW - MIN }).replace(T.sw.market.udLockedWhy.split("{time}")[0], "");',
    expect: "FAIL 3.4 · EXECUTED · a LOCKED card keeps its locked reason",
  },
  {
    name: "winning result drops the stake word",
    file: "scripts/visual-pass-r7a.test.mts",
    from: "label: resultLabelOk(code(RP)),",
    to: "label: resultLabelOk(code(RP).replace(resultLabel, '{t.market.udYourPick}</p>')),",
    expect: "FAIL 5.3″ · the round page's result label",
  },
];
