// R5-D · G1: move each t-reading loading file's drawing into a client-safe ghost module, byte for byte; the loading file
// becomes the server wrapper that reads the words and renders it. CRLF throughout (the worktree's endings).
const fs = require("fs");
const ROOT = "F:/kipindi-r5d/";
const rd = (p) => fs.readFileSync(ROOT + p, "utf8");
const wr = (p, s) => fs.writeFileSync(ROOT + p, s.replace(/\r?\n/g, "\r\n"));
const lf = (s) => s.replace(/\r\n/g, "\n");
function bodyOf(src, head) {
  // the default export's JSX: from "  return (" after `head`, through the matching "\n  );\n}\n"
  const at = src.indexOf(head);
  if (at < 0) throw new Error("no head " + head);
  const r = src.indexOf("\n  return (\n", at);
  const end = src.indexOf("\n  );\n}\n", r);
  if (r < 0 || end < 0) throw new Error("no return in " + head);
  return { pre: src.slice(0, at), between: src.slice(at, r), ret: src.slice(r + 1, end + "\n  );\n".length), tail: src.slice(end + "\n  );\n}\n".length) };
}

// 1 · /updown
{
  const src = lf(rd("src/app/updown/loading.tsx"));
  const b = bodyOf(src, "export default async function UpDownLoading() {");
  if (b.between !== "export default async function UpDownLoading() {\n  const { t } = await getServerT();") throw new Error("updown shape: " + JSON.stringify(b.between));
  const doc = b.pre.slice(b.pre.indexOf("/**"));
  wr("src/app/updown/updown-ghost.tsx",
    `import type { Dict } from "@/lib/i18n-dict";\n\n`
    + doc.replace(" */\n", " * ⭐ ONE DRAWING, TWO READERS (2026-10-09, the visual pass round 5, review G1): `loading.tsx` (this folder) draws it\n"
      + " * with the words it reads on the server, and the journey's root loading state (`components/journey/route-ghost.tsx`)\n"
      + " * draws it in the browser on a move to /updown. So it reads nothing itself, and its module may load in the browser.\n */\n")
    + `export function UpDownGhost({ t }: { t: Dict }) {\n${b.ret}}\n${b.tail}`);
  wr("src/app/updown/loading.tsx",
    `import { getServerT } from "@/lib/i18n-server";\nimport { UpDownGhost } from "@/app/updown/updown-ghost";\n\n`
    + "/**\n * /updown loading skeleton — the drawing is `updown-ghost.tsx` (round 5, review G1: the journey's root loading state\n"
    + " * draws the same one in the browser). This file reads the words on the server.\n */\n"
    + "export default async function UpDownLoading() {\n  const { t } = await getServerT();\n  return <UpDownGhost t={t} />;\n}\n");
}

// 2 · /updown/history
{
  const src = lf(rd("src/app/updown/history/loading.tsx"));
  const head = "export default async function UpDownHistoryLoading() {";
  const b = bodyOf(src, head);
  const ask = "  const [{ t }, { journey }] = await Promise.all([getServerT(), resolveSimpleJourney()]);";
  if (!b.between.endsWith(ask)) throw new Error("history shape: " + JSON.stringify(b.between));
  wr("src/app/updown/history/history-ghost.tsx",
    `import { TicketsHeadGhost } from "@/components/journey/tickets/tickets-ghost";\nimport type { Dict } from "@/lib/i18n-dict";\n\n`
    + "/**\n * /updown/history loading skeleton, for both shells — the journey's head (Tiketi zangu's name and switch) or today's two\n"
    + " * lines, by `journey`, the answer `loading.tsx` (this folder) asks on the server (S6 WP9, VODACOM-PLAN §0h point 21).\n"
    + " * ⭐ ONE DRAWING, TWO READERS (2026-10-09, the visual pass round 5, review G1): `loading.tsx` draws it with that answer\n"
    + " * and the words it reads, and the journey's root loading state (`components/journey/route-ghost.tsx`) draws it in the\n"
    + " * browser, for a journey reader, on a move here. So it reads nothing itself, and its module may load in the browser.\n"
    + " * ⛔ Two sibling ternaries, each where its line stood, so a reader the journey is not shown to is served today's tree.\n */\n"
    + `export function UpDownHistoryGhost({ t, journey }: { t: Dict; journey: boolean }) {\n${b.ret}}\n${b.tail}`);
  const comment = b.between.slice(head.length, b.between.length - ask.length);
  wr("src/app/updown/history/loading.tsx",
    `import { getServerT } from "@/lib/i18n-server";\nimport { resolveSimpleJourney } from "@/lib/server/journey-preview";\nimport { UpDownHistoryGhost } from "@/app/updown/history/history-ghost";\n\n`
    + `${head}${comment}${ask}\n  // The drawing is \`history-ghost.tsx\` (round 5, review G1: the journey's root loading state draws it in the browser).\n  return <UpDownHistoryGhost t={t} journey={journey} />;\n}\n`);
}

// 3 · /wallet/deposit
{
  const src = lf(rd("src/app/wallet/deposit/loading.tsx"));
  const head = "export default async function DepositLoading() {";
  const b = bodyOf(src, head);
  if (!b.between.startsWith(head + "\n  const { t } = await getServerT();")) throw new Error("deposit shape: " + JSON.stringify(b.between.slice(0, 120)));
  const imports = b.pre.slice(0, b.pre.indexOf("/**")).replace('import { getServerT } from "@/lib/i18n-server";\n', "");
  const doc = b.pre.slice(b.pre.indexOf("/**"));
  const inner = b.between.slice((head + "\n  const { t } = await getServerT();").length); // the DG-P-04 note before `return (`
  wr("src/app/wallet/deposit/deposit-ghost.tsx",
    `${imports.trimEnd()}\nimport type { Dict } from "@/lib/i18n-dict";\n\n`
    + doc.replace(" */\n", " * ⭐ ONE DRAWING, TWO READERS (2026-10-09, the visual pass round 5, review G1): `loading.tsx` (this folder) draws it\n"
      + " * with the words it reads on the server, and the journey's root loading state (`components/journey/route-ghost.tsx`)\n"
      + " * draws it in the browser on a move to /wallet/deposit. So it reads nothing itself, and its module may load there.\n */\n")
    + `export function DepositGhost({ t }: { t: Dict }) {${inner}\n${b.ret}}\n${b.tail}`);
  wr("src/app/wallet/deposit/loading.tsx",
    `import { getServerT } from "@/lib/i18n-server";\nimport { DepositGhost } from "@/app/wallet/deposit/deposit-ghost";\n\n`
    + "/**\n * /wallet/deposit loading skeleton — the drawing is `deposit-ghost.tsx` (round 5, review G1: the journey's root loading\n"
    + " * state draws the same one in the browser). This file reads the words on the server.\n */\n"
    + `${head}\n  const { t } = await getServerT();\n  return <DepositGhost t={t} />;\n}\n`);
}

// 4 · /markets/[id] — reads nothing it uses: the unused words read goes, so the loading file itself is client-safe.
{
  const p = "src/app/markets/[id]/loading.tsx";
  const src = lf(rd(p));
  const before = src;
  let s = src.replace('import { getServerT } from "@/lib/i18n-server";\n', "")
    .replace("export default async function MarketDetailLoading() {\n  const { t } = await getServerT();\n",
      "/**\n * ⭐ IT READS NOTHING (2026-10-09, the visual pass round 5, review G1): it asked for the words and drew none of them, and\n"
      + " * that read was all that kept this file off the browser. The journey's root loading state\n"
      + " * (`components/journey/route-ghost.tsx`) now draws this very skeleton there, on a move to a question.\n */\n"
      + "export default function MarketDetailLoading() {\n");
  if (s === before || /\bt\./.test(s.slice(s.indexOf("export default function")))) throw new Error("market loading shape");
  wr(p, s);
}
console.log("ok");
