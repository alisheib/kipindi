// R5-L · §10.1 measures /markets' whole row 2 from lg — the topic menu too (MenuShell's summary).
const { once, edit } = require("./lib.cjs");
edit("scripts/visual-pass-r5l.test.mts", (s) => {
  s = once(s,
    "    const markets = [sort(t.common.sort, t.market.sortPool), group(t.market.oddsKey, odds), group(t.market.poolKey, pool)];\n",
    "    // The topic menu: MenuShell's summary — 1px borders, 16px padding, the key, the value, the count's two digits and the\n"
    + "    // 14px caret, 12px apart.\n"
    + "    const menu = 2 + 32 + mono(t.common.topic.toUpperCase(), 10, 1.4) + 12 + sans(t.market.catAll, 13) + 12 + 13.2 + 12 + 14;\n"
    + "    const markets = [sort(t.common.sort, t.market.sortPool), group(t.market.oddsKey, odds), group(t.market.poolKey, pool), menu];\n",
    "menu");
  return s;
});
