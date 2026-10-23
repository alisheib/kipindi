"use client";

/**
 * GHOST WORDS — A STATIC PARAGRAPH'S OWN WORDS, SET UNSEEN IN A MILLIONEA LOADING DRAWING (MASWALI-BUILD S5-R3-FIX 7; the
 * lead's ruling of 2026-10-23 on R3-FIX 6's open point; DESIGN_AUTHORITY §M4a rule 5 and §M8a item 22). The kit's ONE part
 * for it: every Millionea drawing that models a STATIC paragraph — words the dictionary holds whole, with no datum in them
 * (How to play's second and fourth steps and its example's caption, the register's intro, the commitments' closing
 * sentence and fingerprints, the ledger's labels, the hub's) — sets it through `GhostWords`, here.
 *
 * 🔴 WHY: a drawing's per-language LINE TABLE cannot hold both of the phones' engines — Chromium and WebKit break the same
 *    paragraph at different words (run 39871844391: 81 of 180 cells of the register's index and How to play differ). Words
 *    set in the page's own type, measure and face break where the page's do, in any engine, BY CONSTRUCTION. A paragraph
 *    that holds a datum (a week's facts and times, How's price and floor) is data: the drawing cannot know its words, and
 *    it keeps a table measured in Chromium, the WebKit difference printed beside each cell.
 * ⭐ HOW IT DRAWS: the paragraph's element is the page's own (its classes: type, measure, face); inside it, the words are set
 *    in a run (`.kp-ghost-words`) that draws the kit's line band — GhostLine's own: 0.85em tall, `--r-xs` round, the
 *    skeleton's `--bg-overlay` — centred in EVERY line box the words break into (`box-decoration-break: clone`), and the
 *    words themselves are unseen (`.kp-ghost-words__words`: `visibility: hidden` — no ink, never found by a search, never
 *    selected). The drawing around them stays `aria-hidden`, never focusable; a fact list keeps its marks' gaps, unseen.
 * ⛔ NEVER WITHOUT THE SHELL'S ANSWER — DARK-SAFETY AS DOORS FIXED IT (D3, D6). A loading drawing streams before any gate
 *    answers, so its words may exist only for a reader Millionea is visible to. The shell (`app-shell.tsx`) renders
 *    `GhostWordsProvider` (`maswali-ghost-words-shown.tsx`) ONLY while the rollout's per-request answer is visible, and it
 *    carries nothing but that answer: a reader Millionea is hidden from gets the very tree and payload main serves, and
 *    every `GhostWords` then draws a plain bar — no word. The words are the client dictionary's, already in the browser
 *    (`useT`); no figure is handed (the lead's ruling: no read and no prop on every page for a loading step).
 * ⛔ WORDS ONLY THROUGH HERE (`test:maswali-ui` 1.3): a drawing names no Millionea word itself; it hands `GhostWords` a
 *    RECIPE from its page's words module (`*-words.ts`, where the page builds the same words with the same functions), and
 *    names that recipe nowhere else. A recipe reads only what it is handed (`GhostWordsIn`), never a dictionary of its own.
 */
import type { ReactNode } from "react";
import { useT } from "@/lib/i18n";
import type { Dict, Locale } from "@/lib/i18n-dict";
import { keepConnectives } from "@/components/ui/keep-run";
import { MaswaliFacts, keepFact } from "./maswali-facts";
import { GhostLine } from "./maswali-ghost";
import { useGhostWordsShown } from "./maswali-ghost-words-shown";

/** What a recipe is handed: the reader's dictionary and language. */
export type GhostWordsIn = { t: Dict; locale: Locale };
/** How the page sets a run of words, so the drawing sets it the same way: as a fact (`keepFact`, with the page's extra
 *  `runs` — the default), as the kit's row sets a string label (`keepConnectives`: `ReceiptRow`), or bare. */
export type GhostKeep = "fact" | "label" | "bare";
/** What a recipe sets: one run of words, kept as its page keeps it, or a fact list (`MaswaliFacts`, each fact kept). */
export type GhostWordsOut = { text: string; runs?: readonly string[]; keep?: GhostKeep } | { facts: readonly string[] };
export type GhostRecipe = (w: GhostWordsIn) => GhostWordsOut;

/** One run of words, unseen, under the band on every line it breaks into. */
function Band({ children }: { children: ReactNode }) {
  return <span className="kp-ghost-words"><span className="kp-ghost-words__words">{children}</span></span>;
}

/**
 * A static paragraph's words, set unseen inside the element the caller draws with the page's own classes. Without the
 * shell's answer — a reader Millionea is hidden from — a plain bar of `plain`'s width, and no word.
 */
export function GhostWords({ words, plain = "w-full" }: { words: GhostRecipe; plain?: string }) {
  const shown = useGhostWordsShown();
  const { t, locale } = useT();
  if (!shown) return <GhostLine className={plain} />;
  const out = words({ t, locale });
  if ("facts" in out) return <MaswaliFacts className="kp-ghost-words__facts" facts={out.facts.map((f, i) => <Band key={i}>{keepFact(locale, f)}</Band>)} />;
  const keep = out.keep ?? "fact";
  return <Band>{keep === "bare" ? out.text : keep === "label" ? keepConnectives(out.text) : keepFact(locale, out.text, out.runs ?? [])}</Band>;
}
