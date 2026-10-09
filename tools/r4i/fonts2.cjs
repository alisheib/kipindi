const fontkit = require("F:/kipindi-r4i/node_modules/fontkit");
const base = fontkit.openSync("F:/kipindi-main/.next/dev/static/media/6bd983bd58a87a3d-s.p.0h108oidc_0fm.woff2");
for (const wght of [400, 600, 700]) {
  let v;
  try { v = base.getVariation({ wght }); } catch (e) { console.log("var err", e.message); continue; }
  const w = (s, size, track = 0) => {
    const run = base.layout(s); // shaping (kerning) at the default instance
    let adv = 0;
    for (let i = 0; i < run.glyphs.length; i++) {
      let a;
      try { a = v.getGlyph(run.glyphs[i].id).advanceWidth; } catch (e) { a = run.positions[i].xAdvance; }
      // keep the default instance's kerning delta
      adv += a + (run.positions[i].xAdvance - run.glyphs[i].advanceWidth);
    }
    return adv / base.unitsPerEm * size + track * size * [...s].length;
  };
  console.log(wght, "kwenye 50pick", w("kwenye 50pick", 28, -0.02).toFixed(1), "| to 50pick", w("to 50pick", 28, -0.02).toFixed(1), "| Karibu kwenye", w("Karibu kwenye", 28, -0.02).toFixed(1), "| Welcome to", w("Welcome to", 28, -0.02).toFixed(1), "| League 2026-27 @15", w("League 2026-27", 15).toFixed(1));
}
