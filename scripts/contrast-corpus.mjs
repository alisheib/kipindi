/**
 * THE CONTRAST CORPUS — ONE definition, imported by the gate AND by its RED harness.
 *
 * 🔴 WHY THIS FILE EXISTS, 2026-08-07 (ATOM C). The gate (`contrast-audit.mts`) and its
 * harness (`contrast-audit-red.mjs`) each carried their own copy of this list. §C put a
 * CONTROL in `src/app/motion.css` — `.gilt-metal`, the earned-money CTA — so the gate
 * gained a fourth sheet, and the harness went from **21/21 caught to 0/21** in one edit:
 * it was still copying three files, so every mutation ran against a corpus the gate
 * refused to start on.
 *
 * ⭐ AND THAT FAILURE MODE IS ALREADY IN THIS REPO'S RECORD. E-108 was the same shape one
 * document over — a locator duplicated across two suites and a harness, repaired three
 * times, each repair applied to one copy and handing the next bug to the others by
 * copy-paste. `scripts/campaign-handoff.mjs` is the fix that ended it, and this is the
 * same fix for the same reason: **one definition, imported.**
 *
 * ⛔ ORDER IS THE CASCADE'S ORDER, not alphabetical. `chat-tokens` and `chat-styles` are
 * `@import`ed at the TOP of `globals.css`, and `motion.css` is imported LAST in
 * `layout.tsx`, so this is the sequence the browser resolves — written the way the
 * browser sees it so a future reader never has to guess which way a tie would lean.
 * ⚠️ `state-tokens.css` is deliberately absent: it holds no colour pair anything reads
 * text against. Add it the day it does, and say so here.
 */
export const CONTRAST_CORPUS = [
  "src/styles/chat/chat-tokens.css",
  "src/styles/chat/chat-styles.css",
  "src/app/globals.css",
  "src/app/motion.css",
];
