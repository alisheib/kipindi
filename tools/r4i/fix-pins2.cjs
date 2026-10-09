const edit = require("./edit-lib.cjs");
process.chdir("F:/kipindi-r4i");
edit("scripts/anchors/wallet-reach.anchors.mjs", [
  ["    from: `anchorRef={capsuleRef} journey onBreak={onBreak} />`,\n    to: `anchorRef={capsuleRef} onBreak={onBreak} />`,",
   "    // R4-I (2026-10-09): the captioned capsule also hands the sheet the break's end (`breakEnd`), so the line grew.\n    from: `anchorRef={capsuleRef} journey onBreak={onBreak} breakEnd={breakEnd} />`,\n    to: `anchorRef={capsuleRef} onBreak={onBreak} breakEnd={breakEnd} />`,"],
  ["    from: `held={state.capsule === \"held\"} onBreak={onBreak} />`,\n    to: `held={state.capsule === \"held\"} />`,",
   "    // R4-I (2026-10-09): the bar hands the capsule the break's end too; the plant still drops the flag.\n    from: `held={state.capsule === \"held\"} onBreak={onBreak} breakEnd={breakEnd} />`,\n    to: `held={state.capsule === \"held\"} breakEnd={breakEnd} />`,"],
  ["    from: `anchorRef={capsuleRef} journey onBreak={onBreak} />`,\n    to: `anchorRef={capsuleRef} journey />`,",
   "    // R4-I (2026-10-09): as above, the line carries `breakEnd` too; the plant still drops the flag.\n    from: `anchorRef={capsuleRef} journey onBreak={onBreak} breakEnd={breakEnd} />`,\n    to: `anchorRef={capsuleRef} journey breakEnd={breakEnd} />`,"],
]);
edit("scripts/anchors/market-columns.anchors.mjs", [
  ["    from: `<Stat size=\"sm-plain\" labelStyle=\"widest\" boxed=\"card\" label={t.market.resolves}`,\n    to: `<Stat size=\"xs\" labelStyle=\"widest\" boxed=\"card\" label={t.market.resolves}`,",
   "    // R4-I (2026-10-09): the tile's label is `common.resolves` (Swahili \"Inaisha\", \"it ends\", read as the end of picking).\n    from: `<Stat size=\"sm-plain\" labelStyle=\"widest\" boxed=\"card\" label={t.common.resolves}`,\n    to: `<Stat size=\"xs\" labelStyle=\"widest\" boxed=\"card\" label={t.common.resolves}`,"],
]);
edit("scripts/simple-journey-flag.test.mts", [
  ["  const SWAP_HEADER = '{journeyShown ? <Suspense fallback={<div aria-hidden=\"true\" className=\"kp-jhdr\" />}><LazyJourneyTopBar user={topUser} onBreak={promoSuppressed} proposalsState={proposalsState}",
   "  // R4-I (2026-10-09): the journey bar is also handed the break's end (`breakEnd={journeyBreak}`, for its Wallet's notice); the\n  // classic arm is unchanged.\n  const SWAP_HEADER = '{journeyShown ? <Suspense fallback={<div aria-hidden=\"true\" className=\"kp-jhdr\" />}><LazyJourneyTopBar user={topUser} onBreak={promoSuppressed} breakEnd={journeyBreak} proposalsState={proposalsState}"],
]);
edit("scripts/journey-tickets.test.mts", [
  ["const VIEW_ELEMENT = [\"<TicketsView\", \"rows={rows}\", \"positions={byId}\", \"markets={marketMap}\", \"prices={pricedById}\",\n  \"lens={state.tab}\", \"page={pageNum}\", \"serverNow={serverNow}\", \"locale={locale}\", \"t={t}\", \"/>\"].join(\"\");",
   "// R4-I (2026-10-09): `breakBody` — the reader's break, worded once by the page for BOTH views (the classic empty state reads\n// it too), so the first-ticket call to bet is not shown during a break. Not a read made for the view alone.\nconst VIEW_ELEMENT = [\"<TicketsView\", \"rows={rows}\", \"positions={byId}\", \"markets={marketMap}\", \"prices={pricedById}\",\n  \"lens={state.tab}\", \"page={pageNum}\", \"serverNow={serverNow}\", \"locale={locale}\", \"t={t}\", \"breakBody={breakBody}\", \"/>\"].join(\"\");"],
]);
edit("scripts/journey-account.test.mts", [
  ["  return typeof v === \"string\" ? v : \"\";\n}",
   "  // R4-I (2026-10-09): a path whose value is a LIST of words (the month names `common.monthsShort`, read by Pumzika's status\n  // line) resolves when every entry is a word; anything else that is not a string does not.\n  if (Array.isArray(v)) return v.length > 0 && v.every((x) => typeof x === \"string\" && x.trim() !== \"\") ? v.join(\" \") : \"\";\n  return typeof v === \"string\" ? v : \"\";\n}"],
]);
edit("scripts/visual-pass-r3c.test.mts", [
  ["  const close = /className=\"absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center/.test(modal);",
   "  // R4-I (2026-10-09): the ✕ is one component, `CloseX` (48px box), which Modal pins `absolute right-3 top-3`.\n  const close = /className=\"absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center/.test(modal)\n    || (/<CloseX onClick=\\{onClose\\} label=\\{t\\.common\\.close\\} className=\"absolute right-3 top-3\" \\/>/.test(modal)\n      && /className=\\{`\\$\\{className\\} inline-flex h-8 w-8 items-center justify-center/.test(modal));"],
]);
