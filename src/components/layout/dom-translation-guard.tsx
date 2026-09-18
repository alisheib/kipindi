"use client";

/**
 * Installs `installDomTranslationGuard()` — the belt under the page's `notranslate` braces.
 * Read `src/lib/client/dom-translation-guard.ts` for the defect and the reasoning; this file is
 * only about WHEN the patch is applied.
 *
 * ⛔ THE CALL IS AT MODULE SCOPE, NOT IN AN EFFECT, AND THAT IS THE WHOLE POINT. An effect runs
 * AFTER React's first commit, so a translator that has already rewritten the server-rendered
 * markup could crash hydration before the guard is in place — the exact moment the page is most
 * exposed, since the whole document has just been translated in one pass. Module scope runs when
 * this chunk is evaluated, which is before the tree it guards is committed.
 *
 * ⚠️ Rendered as the FIRST child of `<body>` so its chunk is requested as early as the layout's
 * client boundary allows. It renders nothing.
 */
import { installDomTranslationGuard } from "@/lib/client/dom-translation-guard";

installDomTranslationGuard();

export function DomTranslationGuard() {
  return null;
}
