// R5-L · the bar's two notes travel with the bar into MarketsBoardGhost; every R5-L note names the one model file.
const { once, edit } = require("./lib.cjs");
edit("src/app/markets/loading.tsx", (s) => {
  const start = s.indexOf("      {/* The discovery bar — TWO rows at the real 44px control height,");
  const end = s.indexOf("      <MarketsBoardGhost />\n");
  if (start < 0 || end < 0 || end < start) throw new Error("notes not found");
  const notes = s.slice(start, end);
  s = s.slice(0, start) + s.slice(end);
  s = once(s, "  return (\n    <>\n      <div aria-hidden className={QUERY_BAR_CLASS}>\n", "  return (\n    <>\n" + notes + "      <div aria-hidden className={QUERY_BAR_CLASS}>\n", "insert");
  s = once(s, "measured from the served fonts (S/r5l/measure-bars.cts)", "measured from the served fonts (S/r5l/measure-routes.cts)", "model name");
  return s;
});
