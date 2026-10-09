process.chdir('F:/kipindi-r4h');
const fontkit = require('F:/kipindi-r4h/node_modules/fontkit');
const F = (n) => fontkit.openSync(`src/lib/server/reports/fonts/${n}.ttf`);
const fonts = { reg: F('Inter-Regular'), med: F('Inter-Medium'), bold: F('Inter-Bold'), mono: F('JetBrainsMono-Bold'), monoR: F('JetBrainsMono-Regular') };
const w = (f, s, size) => f.layout(s).positions.reduce((a, p) => a + p.xAdvance, 0) / f.unitsPerEm * size;
const show = (label, s, size, ...fs) => console.log(label.padEnd(10), JSON.stringify(s).padEnd(34), fs.map((k) => `${k}=${w(fonts[k], s, size).toFixed(1)}`).join(' '));
for (const s of ['Weka pesa', 'Toa pesa', 'Deposit', 'Withdraw', '充值']) show('btn15', s, 15, 'med', 'bold');
for (const s of ['Mobile money or card', 'Mobile money', 'Pesa ya simu au kadi', 'Pesa ya simu', 'or card', 'Mobile money or']) show('via13', s, 13, 'reg');
