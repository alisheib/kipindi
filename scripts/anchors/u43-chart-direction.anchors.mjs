/** Source-copy plants for the full-history directional chart and the neutral micro line. */
const chart = "src/components/charts/terminal-chart.tsx";
const micro = "src/components/charts/round-live-line.tsx";

export const MUTATIONS = [
  { name: "up token", file: chart, from: 'const upInk = ink("--yes-400");', to: 'const upInk = ink("--aqua-300");', expected: "direction tokens" },
  { name: "down token", file: chart, from: 'const downInk = ink("--no-400");', to: 'const downInk = ink("--text-muted");', expected: "direction tokens" },
  { name: "body", file: chart, from: "upColor: upInk, downColor: downInk,", to: "upColor: downInk, downColor: downInk,", expected: "candle body" },
  { name: "wick", file: chart, from: "wickUpColor: upInk, wickDownColor: downInk,", to: "wickUpColor: upInk, wickDownColor: upInk,", expected: "candle body" },
  { name: "forming token", file: chart, from: 'const formingUp = ink("--yes-400", 0.45);', to: 'const formingUp = ink("--aqua-300", 0.45);', expected: "forming tokens" },
  { name: "forming direction", file: chart, from: "color: c.c >= c.o ? formingUp : formingDown,", to: "color: c.c >= c.o ? formingDown : formingUp,", expected: "forming candle direction" },
  { name: "volume rise", file: chart, from: 'color: c.c >= c.o ? ink("--yes-400", c.forming ? 0.18 : 0.3)', to: 'color: c.c >= c.o ? ink("--aqua-300", c.forming ? 0.18 : 0.3)', expected: "volume candle direction" },
  { name: "volume fall", file: chart, from: ': ink("--no-400", c.forming ? 0.18 : 0.3),', to: ': ink("--text-muted", c.forming ? 0.18 : 0.3),', expected: "volume candle direction" },
  { name: "curve endpoints", file: chart, from: "const first = real[0]?.price ?? null, last = real[real.length - 1]?.price ?? null;", to: "const first = real[real.length - 1]?.price ?? null, last = real[0]?.price ?? null;", expected: "curve endpoints" },
  { name: "curve down", file: chart, from: 'last < first ? "--no-400"', to: 'last < first ? "--aqua-300"', expected: "curve direction" },
  { name: "curve always aqua", file: chart, from: "const dirInk = ink(dirToken);", to: 'const dirInk = ink("--aqua-300");', expected: "curve ink bridge" },
  { name: "curve fill", file: chart, from: 'topColor: ink(dirToken, dirToken === "--text-muted" ? 0.16 : 0.24),', to: 'topColor: ink("--aqua-300", 0.20),', expected: "curve paint" },
  { name: "micro line", file: micro, from: 'stroke="var(--aqua-300)" strokeWidth="1.5"', to: 'stroke="var(--yes-400)" strokeWidth="1.5"', expected: "micro line stays aqua" },
];
