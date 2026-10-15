/**
 * THE ANCHORS `red:message-titles` MUTATES — declared, as DATA, importable without running (the Vodacom plan's S12, WP12
 * and WP13, 2026-10-14).
 *
 * ⛔ A SIDECAR, not an inline array (the `board-discovery.anchors.mjs` convention): `test:red-anchors` §3 audits that every
 * anchor below still resolves EXACTLY ONCE against real source, without executing a harness that rewrites that source.
 * ⚠️ NO SIDE EFFECTS: data only, repo-relative POSIX paths. `expect` names the assertion of `test:message-titles`'s memory
 * child (`scripts/lib/message-titles-child.mts`) that must break — the defect caught on ITS check, not on any.
 *
 * The three the plan names: the switch forced on now; a cross-language fallback; a short title no officer approved. And
 * each call-site family's own bypass, so a site that stops asking the switch is caught where it stands.
 */
const SWITCH = "src/lib/server/message-titles.ts";
const RULE = "src/lib/markets/short-title.ts";
const SVC = "src/lib/server/market-service.ts";
const OG = "src/app/api/og/market/[id]/route.tsx";
const TOKEN = "src/lib/server/share-token.ts";
const PAGE = "src/app/markets/[id]/page.tsx";

export const MUTATIONS = [
  {
    name: "the switch forced on now — a preview reads as the flip (the ceiling ignored, anything but WITHDRAWN says yes)",
    file: SWITCH,
    from: `    if (simpleJourneyCeiling().ceiling !== "ACTIVE") return false;\n    return (await simpleJourneyStateNow()) === "ACTIVE";`,
    to: `    return (await simpleJourneyStateNow()) !== "WITHDRAWN";`,
    expect: "C.STAFF_PREVIEW.full",
  },
  {
    name: "the switch fails OPEN — a failed read of the switch's row sends short titles",
    file: SWITCH,
    from: `    return (await simpleJourneyStateNow()) === "ACTIVE";`,
    to: `    return (await simpleJourneyStateNow()) !== "STAFF_PREVIEW";`,
    expect: "C.READ_FAILS.full",
  },
  {
    name: "a cross-language fallback — a Swahili or Chinese reader gets the ENGLISH short title where their own has none",
    file: RULE,
    from: `  return { en: cardTitle("en", m).text, sw: cardTitle("sw", m).text, zh: cardTitle("zh", m).text };`,
    to: `  return { en: cardTitle("en", m).text, sw: shortTitleFor("sw", m) ?? shortTitleFor("en", m) ?? cardTitle("sw", m).text, zh: shortTitleFor("zh", m) ?? shortTitleFor("en", m) ?? cardTitle("zh", m).text };`,
    expect: "C.ACTIVE.P",
  },
  {
    name: "a short title no officer approved — one cut from the full question where the market has none",
    file: RULE,
    from: `  return on === true ? cardTitle(locale, m).text : full;`,
    to: `  return on === true ? (shortTitleFor(locale, m) ?? full.slice(0, 24)) : full;`,
    expect: "C.ACTIVE.N",
  },
  {
    name: "an Up & Down round's result row switched too — a round quotes short titles forced onto its row",
    file: SVC,
    from: `          notifyUpDownWin(p.userId, {\n            payout,\n            stake: p.stake,\n            marketTitle: localizedText(m.titleEn, m.titleSw, m.titleZh),`,
    to: `          notifyUpDownWin(p.userId, {\n            payout,\n            stake: p.stake,\n            marketTitle: messageTitles(shortTitles, localizedText(m.titleEn, m.titleSw, m.titleZh), m),`,
    expect: "C.ACTIVE.round",
  },
  {
    name: "the settlement stops asking the switch — the win, the loss, the refunds and the watchers' alert switch now",
    file: SVC,
    from: "  // lock, so the money's transaction never waits on it (`message-titles.ts`).\n  const shortTitles = await shortTitlesInMessagesNow();",
    to: "  // lock, so the money's transaction never waits on it (`message-titles.ts`).\n  const shortTitles = true;",
    expect: "C.STAFF_PREVIEW.full",
  },
  {
    name: "the bet receipt stops asking the switch — its bell row and its letter switch now",
    file: SVC,
    from: "    // S12 WP12 · the title switch is read once for this receipt, and the bet never waits for it (`message-titles.ts`).\n    void shortTitlesInMessagesNow().then((shortTitles) => {",
    to: "    // S12 WP12 · the title switch is read once for this receipt, and the bet never waits for it (`message-titles.ts`).\n    void shortTitlesInMessagesNow().then(() => { const shortTitles = true;",
    expect: "C.STAFF_PREVIEW.full",
  },
  {
    name: "the sale's receipt stops asking the switch",
    file: SVC,
    from: "    // S12 WP12 · the title switch is read once for this receipt, and the sale never waits for it (`message-titles.ts`).\n    void shortTitlesInMessagesNow().then((shortTitles) => {",
    to: "    // S12 WP12 · the title switch is read once for this receipt, and the sale never waits for it (`message-titles.ts`).\n    void shortTitlesInMessagesNow().then(() => { const shortTitles = true;",
    expect: "C.STAFF_PREVIEW.full",
  },
  {
    name: "the share picture stops asking the switch",
    file: OG,
    from: `  const shareTitleEn = messageTitle(await shortTitlesInMessagesNow(), "en", m.titleEn, m);`,
    to: `  const shareTitleEn = messageTitle(true, "en", m.titleEn, m);`,
    expect: "D.STAFF_PREVIEW.og",
  },
  {
    name: "the win card's projection stops asking the switch",
    file: TOKEN,
    from: `  const shortTitles = await shortTitlesInMessagesNow();`,
    to: `  const shortTitles = true;`,
    expect: "D.STAFF_PREVIEW.win",
  },
  {
    name: "the share preview's metadata stops asking the switch",
    file: PAGE,
    from: `  const shareTitleEn = messageTitle(await shortTitlesInMessagesNow(), "en", m.titleEn, m);`,
    to: `  const shareTitleEn = messageTitle(true, "en", m.titleEn, m);`,
    expect: "D.STAFF_PREVIEW.meta",
  },
];
