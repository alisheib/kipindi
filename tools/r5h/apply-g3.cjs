// R5-H · G-3 — the journey flag raised and lowered before the paint of the commit that swaps the shell; its sibling, the
// not-found mark, announced leaving on the same phases. CRLF throughout (lib.cjs).
const { once, edit } = require("./lib.cjs");

edit("src/components/journey/journey-flag.tsx", (s) => {
  s = once(s, " * ⭐ The cleanup lowers the flag and announces it: an Owner Stop or a pass ending swaps the shell on `router.refresh()`,\n"
    + " * this unmounts, and every overlay comes back without a reload.\n */\n"
    + 'import { useEffect } from "react";\n',
    " * ⭐ The cleanup lowers the flag and announces it: an Owner Stop or a pass ending swaps the shell on `router.refresh()`,\n"
    + " * this unmounts, and every overlay comes back without a reload.\n"
    + " * ⭐ IN THE COMMIT THAT SWAPS THE SHELL, BEFORE ITS PAINT (round 5's follow-up, R5-H · G-3): a LAYOUT effect raises it\n"
    + " * and its cleanup lowers it, and AppShell mounts it bare beside the journey's header and tabs, so it lands in the very\n"
    + " * commit that first paints them — a `router.refresh()` that switches the journey on or off paints the matching answer\n"
    + " * in its first frame. `raiseJourneyFlag` has the two phases. It was a passive effect, which a transition's commit runs\n"
    + " * after the paint: one frame of the old answer either way (R5-D).\n */\n"
    + 'import { useLayoutEffect } from "react";\n', "jf.note");
  s = once(s, "  useEffect(() => raiseJourneyFlag(), []);\n", "  useLayoutEffect(() => raiseJourneyFlag(), []);\n", "jf.effect");
  return s;
});

edit("src/lib/journey/journey-on.ts", (s) => {
  s = once(s, "/** Raise the flag and announce it; the returned cleanup lowers it and announces that. `JourneyFlag`'s effect. */\n"
    + "export function raiseJourneyFlag(): () => void {\n"
    + "  document.documentElement.setAttribute(JOURNEY_FLAG_ATTR, \"\");\n"
    + "  window.dispatchEvent(new Event(JOURNEY_FLAG_EVENT));\n"
    + "  return () => {\n"
    + "    document.documentElement.removeAttribute(JOURNEY_FLAG_ATTR);\n"
    + "    window.dispatchEvent(new Event(JOURNEY_FLAG_EVENT));\n"
    + "  };\n}\n",
    "/**\n"
    + " * Raise the flag and announce it; the returned cleanup lowers it and announces that. `JourneyFlag`'s LAYOUT effect.\n"
    + " * ⭐ THE PHASES, BOTH WAYS (round 5's follow-up, R5-H · G-3), so the shell a `router.refresh()` swaps in is painted with\n"
    + " * the answer that matches it in its first frame:\n"
    + " *   · UP, before the journey shell's first paint. The flag mounts in the commit that draws the journey's header and\n"
    + " *     tabs (it stands bare beside them, so the transition waits for its chunk as for theirs); its layout effect runs\n"
    + " *     after that commit's mutations — the shell's mark is already in — and the announcement makes every subscribed\n"
    + " *     reader re-render, synchronously, before the browser paints.\n"
    + " *   · DOWN, before the classic shell's first paint. The cleanup runs in the commit that removes the journey's shell, and\n"
    + " *     React runs a removed component's layout cleanup BEFORE it removes the host nodes that follow it: the shell's mark is\n"
    + " *     still in the document there, so a reader asking then still reads \"on\". The attribute goes, and is announced, at\n"
    + " *     once; and the change is announced again once the commit is done — a microtask, which runs after the whole commit\n"
    + " *     and before the browser paints (the readers' re-render is a synchronous update, flushed in a microtask too).\n"
    + " * A passive effect and cleanup ran after the paint both ways: one painted frame of the old answer (R5-D). The not-found\n"
    + " * mark announces on the same phases (`lib/not-found-mark.ts`).\n"
    + " */\n"
    + "export function raiseJourneyFlag(): () => void {\n"
    + "  document.documentElement.setAttribute(JOURNEY_FLAG_ATTR, \"\");\n"
    + "  window.dispatchEvent(new Event(JOURNEY_FLAG_EVENT));\n"
    + "  return () => {\n"
    + "    document.documentElement.removeAttribute(JOURNEY_FLAG_ATTR);\n"
    + "    window.dispatchEvent(new Event(JOURNEY_FLAG_EVENT));\n"
    + "    queueMicrotask(announceJourneyFlagAfterCommit);\n"
    + "  };\n}\n\n"
    + "/** The second announcement of a lowering, once the commit that took the shell's mark out is done (see above). */\n"
    + "function announceJourneyFlagAfterCommit(): void {\n"
    + "  if (typeof window !== \"undefined\") window.dispatchEvent(new Event(JOURNEY_FLAG_EVENT));\n"
    + "}\n", "jo.raise");
  return s;
});

edit("src/components/layout/app-shell.tsx", (s) => {
  s = once(s, "          journey's own pages; a classic page never carries it. */}\n"
    + "      {journeyShown && <Suspense fallback={null}><LazyJourneyFlag /></Suspense>}\n",
    "          journey's own pages; a classic page never carries it.\n"
    + "          ⭐ BARE, BESIDE THE HEADER AND THE TABS (round 5's follow-up, R5-H · G-3): in no Suspense boundary of its own, so a\n"
    + "          `router.refresh()` that switches the journey on waits for its chunk as it waits for theirs and mounts it in the\n"
    + "          commit that first paints the journey's header — and its layout effect raises the flag before that paint\n"
    + "          (`raiseJourneyFlag` has both directions). In a boundary of its own it could land a commit later, the journey's\n"
    + "          chrome painted while the overlays still read the classic answer. It renders nothing, so the first HTML gains no\n"
    + "          markup (only its boundary's two comment markers go); its chunk, a few hundred bytes, is preloaded in the head\n"
    + "          beside the header's and the rail's, and the page's hydration waits for it as for theirs. */}\n"
    + "      {journeyShown && <LazyJourneyFlag />}\n", "as.flag");
  s = once(s, "      {/* ⭐ AND THE SHELL'S MARK, IN THE SERVER'S HTML (`lib/journey/shell-mark.ts`): the flag above arrives in its own\n"
    + "          chunk, after hydration, and the Needle once drew for a few frames before it landed.",
    "      {/* ⭐ AND THE SHELL'S MARK, IN THE SERVER'S HTML (`lib/journey/shell-mark.ts`): the flag above arrives with its own\n"
    + "          chunk, at hydration at the earliest, and the Needle once drew for a few frames before it landed.", "as.mark");
  return s;
});

edit("src/lib/not-found-mark.ts", (s) => {
  s = once(s, " * flushes the update a layout effect schedules before it yields to the browser); its going is still announced after\n"
    + " * React has taken the span out (a passive cleanup), which only brings the store up to date — the answer was already\n"
    + " * \"no\" for every path but its own.\n",
    " * flushes the update a layout effect schedules before it yields to the browser); its going is announced once React has\n"
    + " * taken the span out and before that commit's paint (round 5's follow-up, R5-H · G-3, the journey flag's phases:\n"
    + " * `announceNotFoundAfterCommit`) — for a move the answer was already \"no\" for every path but its own, and a refresh\n"
    + " * that finds the record at the same address no longer paints a frame of \"not found\" over it.\n", "nf.note");
  s = once(s, "/** Announce that the mark came or went: `NotFoundMark`'s effects, on mount and on cleanup. */\n"
    + "export function announceNotFound(): void {\n  window.dispatchEvent(new Event(NOT_FOUND_EVENT));\n}\n",
    "/** Announce that the mark came or went: `NotFoundMark`'s layout effect, on mount (and on a move to another path). */\n"
    + "export function announceNotFound(): void {\n  window.dispatchEvent(new Event(NOT_FOUND_EVENT));\n}\n\n"
    + "/**\n"
    + " * Announce the mark's going once the commit that takes it out is done, before the browser paints — `NotFoundMark`'s\n"
    + " * layout cleanup. React runs a removed component's layout cleanup before it removes the span, so an announcement made\n"
    + " * there would still read the old path; a microtask runs after the whole commit and before the paint (the journey\n"
    + " * flag's lowering, `lib/journey/journey-on.ts`, on the same phases — round 5's follow-up, R5-H · G-3).\n"
    + " */\n"
    + "export function announceNotFoundAfterCommit(): void {\n"
    + "  queueMicrotask(() => { if (typeof window !== \"undefined\") announceNotFound(); });\n"
    + "}\n", "nf.fn");
  return s;
});

edit("src/components/ui/not-found-mark.tsx", (s) => {
  s = once(s, " * ⭐ GOING IS ANNOUNCED BY A PASSIVE CLEANUP, which runs after React has taken the span out of the page, so the answer\n"
    + " * read then is \"no mark\" (a layout cleanup runs while the span is still there and would read the old path).\n",
    " * ⭐ GOING IS ANNOUNCED ONCE THE COMMIT IS DONE, BEFORE ITS PAINT (round 5's follow-up, R5-H · G-3 — the journey flag's\n"
    + " * phases): the layout cleanup runs while the span is still there and would read the old path, so it queues the\n"
    + " * announcement for after the commit (`announceNotFoundAfterCommit`). It was a passive cleanup, which a transition's\n"
    + " * commit runs after the paint: a refresh that found the record at the same address painted one frame of \"not found\".\n", "nm.note");
  s = once(s, 'import { useEffect, useLayoutEffect } from "react";\n', 'import { useLayoutEffect } from "react";\n', "nm.import");
  s = once(s, 'import { NOT_FOUND_MARK, announceNotFound } from "@/lib/not-found-mark";\n',
    'import { NOT_FOUND_MARK, announceNotFound, announceNotFoundAfterCommit } from "@/lib/not-found-mark";\n', "nm.import2");
  s = once(s, "  useEffect(() => announceNotFound, []);\n", "  useLayoutEffect(() => announceNotFoundAfterCommit, []);\n", "nm.effect");
  return s;
});
console.log("G-3 done");
