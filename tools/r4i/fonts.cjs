const fontkit = require("F:/kipindi-r4i/node_modules/fontkit");
const fs = require("fs");
const dir = "F:/kipindi-main/.next/dev/static/media";
for (const f of fs.readdirSync(dir)) {
  try {
    const font = fontkit.openSync(`${dir}/${f}`);
    const w = (s, size, feat) => font.layout(s, feat).positions.reduce((a, p) => a + p.xAdvance, 0) / font.unitsPerEm * size;
    const hasK = font.glyphForCodePoint(0x6b).id !== 0;
    console.log(f, "|", font.familyName, font.subfamilyName, "| vars:", Object.keys(font.variationAxes || {}).join(","), "| latin:", hasK,
      hasK ? `"kwenye 50pick"@28=${w("kwenye 50pick", 28).toFixed(1)} "Karibu kwenye"@28=${w("Karibu kwenye", 28).toFixed(1)}` : "");
  } catch (e) { console.log(f, "ERR", e.message); }
}
