/**
 * The empty state's TEXT rules, in one plain module — beside `empty-state-classes.ts`, and for the same reason: a plain
 * module can be read by a server component and driven by a test without a browser, where an export of the `"use client"`
 * `empty-state.tsx` could be neither. `EmptyState` draws its body through `emptyStateBody`; the words stay the
 * dictionary's own, and only where a line may break changes.
 */
import type { ReactNode } from "react";
import { hangCjkMarks } from "@/lib/cjk-marks";
import { keepRanges, mergeRanges, runAndDashRanges } from "./keep-run";

/**
 * ⭐ A DASH NEVER OPENS A LINE (2026-10-08, the visual pass, tiles 241 and 243). "Chagua swali, bonyeza NDIO au HAPANA
 * — tiketi yako itaonekana hapa." broke at the space BEFORE its dash, so line 2 began "— tiketi yako…" (en: "— your
 * ticket shows up here."). The dash is held to the unit before it — "HAPANA —", and in Chinese the character before
 * "——" ("否——") — so a line can end after the dash but never begin with it (`dashRanges`, keep-run.tsx: one rule for every
 * kept sentence). A break AFTER the dash is untouched, and an unspaced en dash ("1–5", a range) is left alone.
 *
 * ⭐ A YES/NO PAIR IS ONE PHRASE (2026-10-09, round 3, tiles 241 and 244). Balanced, "Chagua swali, bonyeza NDIO au HAPANA
 * — tiketi yako itaonekana hapa." still broke INSIDE the pair at 390 — "…bonyeza NDIO au" / "HAPANA — tiketi…" (en "…press
 * YES or" / "NO — your…") — so the two answers a reader chooses between stood on two lines. Two capitalised words joined
 * by "au" or "or" are held on one line. Measured with the repo's Inter at 13px in the 260px measure: sw takes three
 * balanced lines ("Chagua swali, bonyeza" / "NDIO au HAPANA — tiketi" / "yako itaonekana hapa."), the shape it already had
 * at 320; en keeps two ("Pick a question, press YES or NO —" / "your ticket shows up here.").
 * ⚠️ Only an all-capitals word of two or more letters on each side: an ordinary "au"/"or" between lower-case words is left
 * to break as before, and zh, which writes neither, is unchanged.
 *
 * ⭐ ROUND 5 (2026-10-09, review 3 H4) · NOTHING IS INSERTED. Both rules used to put characters INTO the body — a no-break
 * space before the dash and inside the pair, a word joiner (U+2060) before "——" — and those characters travelled into a
 * copy, a find-in-page and the accessible text ("…是或否 + U+2060 + ——您…"), the very reason keep-words.tsx and keep-run.tsx keep
 * their runs with `white-space: nowrap` spans instead. The body now does the same: each held run is one nowrap span
 * (`keepRanges`), the text between them plain, and every part's Chinese marks hang as before (`hangCjkMarks`, told what
 * follows the part, so a mark at a part's end behaves as it does mid-text). The breaks are exactly the old ones: a run
 * holds what a no-break space or a word joiner held, and nothing else.
 */
const PAIR = /\b[A-Z]{2,}[ \t]+(?:au|or)[ \t]+(?=([A-Z]{2,})\b)/g;

/** A body with runs to keep whole that the CALLER put into it — a date it filled in (`breakSentence`, break-end.ts). */
export type KeptBody = { text: string; keep: readonly string[] };
export type EmptyStateBody = string | KeptBody;

/** The spans of the body that must not break: each YES/NO pair, each dash with its unit, each run the caller names. */
export function emptyStateRanges(text: string, keep: readonly string[] = []): Array<[number, number]> {
  const ranges = runAndDashRanges(text, keep);
  // The second word is read by the lookahead, so "A or B or C" holds both pairs (and they merge into one run).
  for (const m of text.matchAll(PAIR)) ranges.push([m.index ?? 0, (m.index ?? 0) + m[0].length + m[1].length]);
  return mergeRanges(ranges);
}

/** The body as `EmptyState` draws it: its held runs nowrap, its Chinese marks hung, its words the dictionary's. */
export function emptyStateBody(body: EmptyStateBody): ReactNode {
  const { text, keep } = typeof body === "string" ? { text: body, keep: [] as readonly string[] } : body;
  return keepRanges(text, emptyStateRanges(text, keep), hangCjkMarks);
}
