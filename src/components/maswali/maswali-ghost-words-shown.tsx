"use client";

/**
 * THE SHELL'S ANSWER TO `GhostWords`: MILLIONEA IS VISIBLE TO THIS REQUEST (MASWALI-BUILD S5-R3-FIX 7; the lead's ruling of
 * 2026-10-23). `app-shell.tsx` renders `GhostWordsProvider` around its page slots ONLY while the rollout's one per-request
 * answer shows Millionea — a reader it is hidden from is served the very tree and payload main serves — and the kit's
 * `GhostWords` (`maswali-ghost-words.tsx`, which says why) sets a static paragraph's words only inside it.
 * ⛔ ITS OWN MODULE, AND IT IMPORTS NOTHING BUT REACT: the shell renders it on every page a visible reader opens, so its
 *    code rides every such page's first load — the part's (the facts kit, the kept runs, the bars) loads only with a
 *    drawing that uses it. ⛔ It carries nothing but the answer: no prop, no figure, no word. The context stays private:
 *    nothing but the shell provides it (`test:maswali-ui` 1.3a, 1.3c).
 */
import { createContext, useContext, type ReactNode } from "react";

/** Millionea is visible to this request: the provider's presence is the whole answer, and its absence "hidden". */
const GhostWordsShown = createContext(false);

/** The shell's provider: rendered ONLY while Millionea is visible to the request. It takes no prop. */
export function GhostWordsProvider({ children }: { children: ReactNode }) {
  return <GhostWordsShown.Provider value={true}>{children}</GhostWordsShown.Provider>;
}

/** Whether the shell said Millionea is visible to this request — false wherever it did not. */
export function useGhostWordsShown(): boolean {
  return useContext(GhostWordsShown);
}
