/**
 * Anchors for `red:maswali-claims` (MASWALI-BUILD S6, lane N round 17) — each puts back one way Millionea's claims lint
 * (`src/lib/marketing/millionea-claims.ts`) read a claim as ordinary copy, or ordinary copy as a claim, before the lead's
 * round-17 rulings (H2, H3, M3, M4, L2, L3, L4), and names the `test:maswali-claims` assertion that must turn red.
 * DATA, so `test:red-anchors` can audit that every `from` still resolves exactly once without running the harness.
 *
 * `expect` is the start of (or a phrase in) the case's own label: any other red is WRONG-ASSERTION.
 * ⛔ A red anchor quotes SOURCE. Editing one of these lines must be paired with re-anchoring here.
 */
const LINT = "src/lib/marketing/millionea-claims.ts";

export const MUTATIONS = [
  /* ── H2 · a payment by 50pick, read by its parties ── */
  {
    name: "(C1) H2 · a payment by 50pick is no claim at all: the parties' reading is dropped",
    file: LINT,
    from: "  if (pays && !taxObject) return true;",
    to: "  if (false && pays && !taxObject) return true;",
    expect: "7.1 · ⭐ round 17 (H2) · the review's payout 1 of 9",
  },
  {
    name: "(C2) H2 · any tax, fee or levy word in the sentence lifts a payout again — a denied one ('zero fees') too",
    file: LINT,
    from: "  const taxObject = (TAX_HEADS.test(own) || TAX_FOLLOWS.test(tail.slice(0, 40))) && !TAX_NEGATED.test(party);",
    to: "  const taxObject = /\\b(?:kodi|tax|taxes|ada|fees?|levy|levies|ushuru)\\b/.test(party);",
    expect: "7.1 · ⭐ round 17 (H2) · the review's payout 7 of 9",
  },
  {
    name: "(C3) H2 · the i- forms of -lipa are no longer the platform's where 50pick is named",
    file: LINT,
    from: "  const pays = PLATFORM_PAYS.test(party) || (NAMES_50PICK.test(party) && PLATFORM_PAYS_NAMED.test(party));",
    to: "  const pays = PLATFORM_PAYS.test(party);",
    expect: "7.1 · ⭐ round 17 (H2) · the review's payout 2 of 9",
  },
  /* ── H3 · an account fact stated, never a lure ── */
  {
    name: "(C4) H3 · any account word lifts the reader rule again ('in your wallet' as a lure)",
    file: LINT,
    from: "    const accountFact = ACCOUNT_FACT.test(joined) && !HYPOTHETICAL.test(joined);",
    to: "    const accountFact = /\\b(?:hold|holds|balance|salio|pochi|wallet|amana)\\b/.test(joined);",
    expect: "7.2 · ⭐ round 17 (H3) · the review's lure 1 of 4",
  },
  {
    name: "(C5) H3 · a hypothetical no longer undoes an account fact ('Your wallet could hold …')",
    file: LINT,
    from: "    const accountFact = ACCOUNT_FACT.test(joined) && !HYPOTHETICAL.test(joined);",
    to: "    const accountFact = ACCOUNT_FACT.test(joined);",
    expect: "7.2b · ⭐ round 17 (H3) · a hypothetical account, or the reader's joined question 2 of 5",
  },
  {
    name: "(C6) H3 · the joined question is not handed to the reader rule",
    file: LINT,
    from: "    if ((asks || money) && reads(READER, joined) && !accountFact && readerGoverns(ownJoined, after)) return true;",
    to: "    if ((asks || money) && reads(READER, sentence) && !accountFact && readerGoverns(own, after)) return true;",
    expect: "7.2b · ⭐ round 17 (H3) · a hypothetical account, or the reader's joined question 5 of 5",
  },
  /* ── M3 · MB-47's shape and the plain winnings words ── */
  {
    name: "(C7) M3 · only a question of seven words or fewer joins the figure's sentence again",
    file: LINT,
    from: "  const asked = QUESTION_BEFORE.exec(n.slice(0, at - own.length));",
    to: "  const asked = ((m) => (m && m[1].trim().split(/\\s+/).length <= 7 ? m : null))(QUESTION_BEFORE.exec(n.slice(0, at - own.length)));",
    expect: "7.3 · ⭐ round 17 (M3) · the review's claim 11 of 12",
  },
  {
    name: "(C8) M3 · a payout or the winnings heading the figure's phrase is no claim",
    file: LINT,
    from: "  if (reads(WINNINGS_BEFORE, own) && !taxObject) return true;",
    to: "  if (false) return true;",
    expect: "7.3 · ⭐ round 17 (M3) · the review's claim 6 of 12",
  },
  {
    name: "(C9) M3 · 'took home' and 'amechukua' are no getting verbs",
    file: LINT,
    from: "|\\b(?:take|takes|took|taking)\\s+home|\\b(?:walk(?:s|ed|ing)?\\s+away|go(?:es|ing)?\\s+home|went\\s+home)\\s+with|\\b(?:a|wa)(?:me|li|na|ta)chukua)\\s*$/;",
    to: "|\\btake\\s+home|\\b(?:walk(?:s|ed|ing)?\\s+away|go(?:es|ing)?\\s+home|went\\s+home)\\s+with)\\s*$/;",
    expect: "7.3b · ⭐ round 17 (M3) · one rule alone 1 of 13",
  },
  {
    name: "(C10) M3 · a shot or a chance at the figure is no claim",
    file: LINT,
    from: "  return reads(GET_BEFORE, before) || reads(SHOT_BEFORE, before) || (TAKE_BEFORE.test(before) && HOME_AFTER.test(tail.slice(0, 24)));",
    to: "  return reads(GET_BEFORE, before) || (TAKE_BEFORE.test(before) && HOME_AFTER.test(tail.slice(0, 24)));",
    expect: "7.3b · ⭐ round 17 (M3) · one rule alone 3 of 13",
  },
  {
    name: "(C11) M3 · the next sentence putting the reader next is not read",
    file: LINT,
    from: "    if (reads(NEXT_YOU, next)) return true;",
    to: "    if (false) return true;",
    expect: "7.3b · ⭐ round 17 (M3) · one rule alone 5 of 13",
  },
  {
    name: "(C12) M3 · a smaller money figure beside a prize is no stake",
    file: LINT,
    from: "    if (!accountFact && !THIRD_SPEND.test(own) && stakedAgainst(sentence, n.slice(at, end))) return true;",
    to: "    if (false) return true;",
    expect: "7.3 · ⭐ round 17 (M3) · the review's claim 4 of 12",
  },
  {
    name: "(C13) M3 · a third party's own sums are read as a stake against a prize",
    file: LINT,
    from: "    if (!accountFact && !THIRD_SPEND.test(own) && stakedAgainst(sentence, n.slice(at, end))) return true;",
    to: "    if (!accountFact && stakedAgainst(sentence, n.slice(at, end))) return true;",
    expect: "7.3c · control · round 17 (M3) · ordinary copy beside the new rules 1 of 6",
  },
  {
    name: "(C14) M3 · money asked about in the joined question is no claim",
    file: LINT,
    from: "    if (joins && !accountFact && INCOME_QUESTION.test(question ?? \"\")) return true;",
    to: "    if (false) return true;",
    expect: "7.3 · ⭐ round 17 (M3) · the review's claim 10 of 12",
  },
  {
    name: "(C15) M3 · a market question about someone else joins a figure its own words read as a price",
    file: LINT,
    from: "  const joins = question !== null && !(othersQuestion && classified);",
    to: "  const joins = question !== null;",
    expect: "7.3c · control · round 17 (M3) · ordinary copy beside the new rules 3 of 6",
  },
  {
    name: "(C16) M3 · a currency that heads the next number makes a till number money (a stake beside it)",
    file: LINT,
    from: "const CURRENCY_AFTER = new RegExp(String.raw`^\\s*(?:${CURRENCY}\\b(?![.:]?\\s*[0-9])|${CURRENCY_SIGN})`);",
    to: "const CURRENCY_AFTER = new RegExp(String.raw`^\\s*(?:${CURRENCY}\\b|${CURRENCY_SIGN})`);",
    expect: "1.1 · control 27 of",
  },
  {
    name: "(C27) M3 · a payment whose own object is a tax heads a prize again ('Malipo ya kodi ya …')",
    file: LINT,
    from: "  if (reads(WINNINGS_BEFORE, own) && !taxObject) return true;",
    to: "  if (reads(WINNINGS_BEFORE, own)) return true;",
    expect: "7.3d · control · round 17 (M3) · a tax heading 'malipo' 1 of 2",
  },
  {
    name: "(C28) M3 · 'took … home' around the figure is no getting verb",
    file: LINT,
    from: "  return reads(GET_BEFORE, before) || reads(SHOT_BEFORE, before) || (TAKE_BEFORE.test(before) && HOME_AFTER.test(tail.slice(0, 24)));",
    to: "  return reads(GET_BEFORE, before) || reads(SHOT_BEFORE, before);",
    expect: "7.3f · ⭐ round 17 (M3) · a getting verb in another shape 1 of 3",
  },
  {
    name: "(C29) M3 · 'walk away with' and 'went home with' are no getting verbs",
    file: LINT,
    from: "|\\b(?:walk(?:s|ed|ing)?\\s+away|go(?:es|ing)?\\s+home|went\\s+home)\\s+with|",
    to: "|",
    expect: "7.3f · ⭐ round 17 (M3) · a getting verb in another shape 2 of 3",
  },
  /* ── M4 · ordinary copy refused before ── */
  {
    name: "(C17) M4 · the limit words lose the Swahili verb's prefixes and the English past",
    file: LINT,
    from: "const LIMIT_BEFORE = /\\b(?:(?:u|ni|tu|m|wa|a|ku)?(?:ki|me|li|ta|na|nge)?(?:toa|weka|tuma)|withdraw(?:s|n|ing|als?)?|withdrew|deposit(?:s|ed|ing)?|transfer(?:s|red|ring)?|kikomo|limit|amana)\\b[^.!?;,]{0,24}$/;",
    to: "const LIMIT_BEFORE = /\\b(?:toa|kutoa|weka|kuweka|tuma|kutuma|withdraw|withdrawals?|deposit|deposits|transfer|transfers|kikomo|limit|amana)\\b[^.!?;,]{0,24}$/;",
    expect: "7.4 · ⭐ round 17 (M4) · the review's ordinary sentence 1 of 10",
  },
  {
    name: "(C18) M4 · a third person's wait frames a figure again ('Mashabiki wanasubiri …')",
    file: LINT,
    from: "  String.raw`\\b(?:u|i|zi|ki|vi|li|ya)(?:na|ta|me)(?:ku|wa)?(?:subiri|ngoj)|\\b[a-z]{0,4}?(?:na|ta|me)ku(?:subiri|ngoj)`,",
    to: "  String.raw`\\b(?!tu|ni)[a-z]{0,3}?(?:na|ta)(?:ku|wa)?(?:subiri|ngoj)`,",
    expect: "7.4 · ⭐ round 17 (M4) · the review's ordinary sentence 6 of 10",
  },
  {
    name: "(C19) M4 · 'mfuko' is a prize word in any sense again (a fund for education, a hospital's)",
    file: LINT,
    from: "  String.raw`\\bmfuko\\s+(?:(?:mkubwa|mnono|huu|wetu|wenu|wako|mpya)\\s+)?(?:wa|ya)\\s+(?:wiki|zawadi|milioni|bilioni|laki|${CURRENCY}\\b|[0-9])`,",
    to: "  String.raw`\\bmfuko\\b`,",
    expect: "7.4 · ⭐ round 17 (M4) · the review's ordinary sentence 8 of 10",
  },
  {
    name: "(C20) M4 · the figure itself waiting ('TZS 50,000,000 awaits!') is no claim",
    file: LINT,
    from: "    if (WAIT_AFTER.test(tail.slice(0, 40))) return true;",
    to: "    if (false) return true;",
    expect: "7.4c · ⭐ round 17 (M4) · a wait for the reader, or a prize fund 1 of 6",
  },
  {
    name: "(C21) M4 · a deposit's own noun, 'amana', heads no limit: a deposit bonus reads as a stake against a prize",
    file: LINT,
    from: "|kikomo|limit|amana)\\b[^.!?;,]{0,24}$/;",
    to: "|kikomo|limit)\\b[^.!?;,]{0,24}$/;",
    expect: "7.4b · control · round 17 (M4) · a deposit, a third party's wait, a fund 1 of 8",
  },
  {
    name: "(C22) M4 · any 'await' is a prize word again ('Fans await the derby …')",
    file: LINT,
    from: "  String.raw`zawadi|tuz[ow]|(?:na|ta|me)ku(?:subiri|ngoj)|\\bawait(?:s|ing)?\\s+you\\b|\\bwaiting\\s+for\\s+you\\b|\\bup\\s+for\\s+grabs\\b`,",
    to: "  String.raw`zawadi|tuz[ow]|(?:na|ta|me)ku(?:subiri|ngoj)|\\bawait(?:s|ing)?\\b|\\bwaiting\\s+for\\s+you\\b|\\bup\\s+for\\s+grabs\\b`,",
    expect: "7.4b · control · round 17 (M4) · a deposit, a third party's wait, a fund 6 of 8",
  },
  /* ── L2 · the comments say what is enforced ── */
  {
    name: "(C23) L2 · a round-15 comment that reads as a way out is back",
    file: LINT,
    from: "/** A phone's own word, read right after a run of digits (round 12). ⭐ Enforced (round 17, L2): a run counts as a figure",
    to: "/** A phone-shaped number followed by a phone's own word is a phone, never a figure (round 12). ⭐ Enforced (round 17, L2): a run counts as a figure",
    expect: "7.5 · ⭐ round 17 (L2)",
  },
  /* ── L3 · a look-alike leading one ── */
  {
    name: "(C24) L3 · a leading l, I or | is not read as a figure's one",
    file: LINT,
    from: "const FIGURE_O = /(?<![a-z0-9])[0-9li|][0-9o]*(?:(?:[,.][0-9o]{3})+|(?: [0-9o]{3}){2,})(?![a-z0-9])/g;",
    to: "const FIGURE_O = /(?<![a-z0-9])[0-9][0-9o]*(?:(?:[,.][0-9o]{3})+|(?: [0-9o]{3}){2,})(?![a-z0-9])/g;",
    expect: "7.6 · ⭐ round 17 (L3) · a look-alike leading one 1 of 5",
  },
  {
    name: "(C25) L3 · a leading look-alike is found but left unread",
    file: LINT,
    from: "  out = out.replace(FIGURE_O, (m) => m.replace(/^[li|]/, \"1\").replace(/o/g, \"0\"))",
    to: "  out = out.replace(FIGURE_O, (m) => m.replace(/o/g, \"0\"))",
    expect: "7.6b · ⭐ round 17 (L3)",
  },
  /* ── L4 · OD42: a campaign in Swahili and English ── */
  {
    name: "(C26) L4 · a body in Chinese characters is admitted unread",
    file: LINT,
    from: "  const script = HAN.test(text ?? \"\") ? [CAMPAIGN_HAN_SCRIPT] : [];",
    to: "  const script: string[] = [];",
    expect: "7.7 · ⭐ round 17 (L4)",
  },
  /* ── Finding 9 (the lint review after round 17) · an oversized body is read by no rule ── */
  {
    name: "(C27) finding 9 · the composer's door reads a body past one SMS: its time grows with the square of a long run",
    file: LINT,
    from: "  if ((text ?? \"\").length > CLAIMS_MAX_CHARS) return [];",
    to: "  if (false) return [];",
    expect: "8.1 · ⭐ finding 9",
  },
];
