const fontkit = require("F:/kipindi-r4i/node_modules/fontkit");
const base = fontkit.openSync("F:/kipindi-main/.next/dev/static/media/6bd983bd58a87a3d-s.p.0h108oidc_0fm.woff2");
const w = (s, size, track = 0) => base.layout(s).positions.reduce((a, p) => a + p.xAdvance, 0) / base.unitsPerEm * size + track * size * ([...s].length - 1);
for (const s of ["Karibu tena", "Welcome back", "kwenye 50pick", "to 50pick"]) console.log(s, w(s, 28, -0.02).toFixed(1));
