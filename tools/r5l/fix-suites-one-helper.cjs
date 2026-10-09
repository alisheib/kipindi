// R5-L · the guards follow the one helper: r5h 4.4 accepts the money books' import of the kit's pill AND count; r5l reads
// the helper from ONE path constant (`KIT`, the line the merge script re-points), finds its word bars by R5-K's class,
// and holds GhostText / ChipGhost to R5-K's code (with plants), ButtonGhost to `.btn`, CountGhost to QueryResultCount.
const { once, edit } = require("./lib.cjs");
edit("scripts/visual-pass-r5h.test.mts", (s) => once(s,
  String.raw`const imported = /import \{ PillGhost \} from "@\/components\/ui\/query-bar-ghost";/.test(code(BAR_GHOST)) && !/function PillGhost/.test(code(BAR_GHOST));`,
  String.raw`const imported = /import \{ (?:CountGhost, )?PillGhost \} from "@\/components\/ui\/query-bar-ghost";/.test(code(BAR_GHOST)) && !/function PillGhost/.test(code(BAR_GHOST));`,
  "r5h 4.4"));
edit("scripts/visual-pass-r5l.test.mts", (s) => {
  s = once(s,
    " *   §9 THE KITS · `ghost-kit.tsx` (Words, ButtonGhost, CHIP_GHOST) and `query-bar-ghost.tsx` (the pill, group, sort, menu\n"
    + " *          and Filters ghosts), each against the page's own component it stands for\n",
    " *   §9 THE KITS · the ghost helper — R5-K's `GhostText`, `ghostShape` and `ChipGhost`, verbatim, and `ButtonGhost` (ONE\n"
    + " *          helper: `ghost-text.tsx` on the merge) — and `query-bar-ghost.tsx` (the pill, count, group, sort, menu and\n"
    + " *          Filters ghosts), each against the page's own component it stands for\n",
    "header 9");
  s = once(s,
    "/** Every one of the page's sentences is in the ghost, set and not shown (inside a transparent word bar). */\n"
    + "const BAR = 'class=\"rounded-sm text-transparent box-decoration-clone';\n",
    "/** The ghost helper — ONE file: R5-K's `ghost-text.tsx` on the merge (S/r5l/merge/one-helper.cjs re-points this line). */\n"
    + "const KIT = \"src/components/ui/ghost-kit.tsx\";\n"
    + "const { GHOST_TEXT_CLASS } = req(`../${KIT}`) as { GHOST_TEXT_CLASS: string };\n"
    + "/** Every one of the page's sentences is in the ghost, set and not shown (inside a transparent word bar, `GhostText`). */\n"
    + "const BAR = `class=\"${GHOST_TEXT_CLASS}`;\n",
    "BAR");
  s = once(s,
    "const KIT = \"src/components/ui/ghost-kit.tsx\", QBG = \"src/components/ui/query-bar-ghost.tsx\";\n",
    "const QBG = \"src/components/ui/query-bar-ghost.tsx\";\n",
    "KIT const");
  s = once(s,
    "    words: k.includes('export const GHOST_WORDS = \"rounded-sm text-transparent box-decoration-clone\";'),\n",
    "    // R5-K's GhostText, to the character (`test:visual-pass-r5k` §0.1 holds the same code in `ghost-text.tsx`).\n"
    + "    words: k.includes('export const GHOST_TEXT_CLASS = \"select-none rounded-sm bg-bg-overlay text-transparent box-decoration-clone\";')\n"
    + "      && k.includes(\"export function GhostText({ children, className }: { children: ReactNode; className?: string }) { return <span aria-hidden className={cn(GHOST_TEXT_CLASS, className)}>{children}</span>; }\"),\n",
    "kit words");
  s = once(s,
    "    chip: k.includes('export const CHIP_GHOST: CSSProperties = { color: \"transparent\", background: \"var(--bg-overlay)\", borderColor: \"transparent\" };'),\n",
    "    // R5-K's ChipGhost: the kit Chip with the page's size and metrics row, its ink and edge cleared.\n"
    + "    chip: k.includes('const GHOST_CHIP: CSSProperties = { background: \"var(--bg-overlay)\", borderColor: \"transparent\", color: \"transparent\" };')\n"
    + "      && k.includes('<Chip aria-hidden size={size} metrics={metrics ?? \"base\"} className=\"select-none\" style={nowrap ? { ...GHOST_CHIP, whiteSpace: \"nowrap\" } : GHOST_CHIP}>'),\n"
    + "    count: q.includes('<p className=\"shrink-0 font-mono text-[11.5px] tabular-nums text-transparent\"><span className=\"rounded bg-bg-overlay\">{count}</span></p>')\n"
    + "      && qs.includes('className=\"shrink-0 font-mono text-[11.5px] tabular-nums text-text-subtle\"'),\n",
    "kit chip");
  s = once(s,
    "  ok(\"9.1 · the kits stand for the page's own parts: Words (the bar), ButtonGhost (`.btn` and its rung — 44/48px), CHIP_GHOST (the kit chip's box, its words not shown), and the bar ghost's sort",
    "  ok(\"9.1 · the kits stand for the page's own parts: GhostText (R5-K's words bar), ButtonGhost (`.btn` and its rung — 44/48px), ChipGhost (R5-K's kit chip, its words not shown), and the bar ghost's count (QueryResultCount's type), sort",
    "9.1 text");
  s = once(s,
    "    [\"button\", KIT, '\"btn\", size === \"lg\" ? \"btn-lg\" : \"btn-md\"', '\"btn\", \"btn-md\"'],\n",
    "    [\"button\", KIT, '\"btn\", size === \"lg\" ? \"btn-lg\" : \"btn-md\"', '\"btn\", \"btn-md\"'],\n"
    + "    [\"words\", KIT, 'text-transparent box-decoration-clone\";', 'text-transparent\";'],\n"
    + "    [\"chip\", KIT, 'metrics={metrics ?? \"base\"}', 'metrics=\"base\"'],\n"
    + "    [\"count\", QBG, 'text-[11.5px] tabular-nums text-transparent', 'text-[11px] tabular-nums text-transparent'],\n",
    "9.1 plants");
  s = once(s,
    "  ok(\"9.2 · ONE pill: the money books' bar ghost draws the kit's `PillGhost` (moved from it), and no other file defines a pill ghost\",\n"
    + "    moneyBar.includes('import { PillGhost } from \"@/components/ui/query-bar-ghost\";') && walk(\"src\").filter((p) => /\\.tsx$/.test(p) && /function PillGhost\\b/.test(code(p))).join() === QBG);\n",
    "  ok(\"9.2 · ONE pill and ONE count: the money books' bar ghost draws the kit's `PillGhost` and `CountGhost` (moved from it), and no other file defines either\",\n"
    + "    moneyBar.includes('import { CountGhost, PillGhost } from \"@/components/ui/query-bar-ghost\";')\n"
    + "      && walk(\"src\").filter((p) => /\\.tsx$/.test(p) && /function (?:PillGhost|CountGhost)\\b/.test(code(p))).join() === QBG);\n",
    "9.2");
  return s;
});
