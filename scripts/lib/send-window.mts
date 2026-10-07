/**
 * U13 · THE SUITES' SEND WINDOWS (ENGINE-SPEC §5 rule 9 · F10). Every suite that drives `dispatchSlice` or the officer's
 * test send hands it one of these, never the live window: batteries on this laptop often run at night, outside
 * 08:00–20:00 EAT, where the live window would hold every send — a green suite would turn red at night and, worse, a red
 * proof's plant would turn into a miss.
 * ⭐ Both are the REAL rule's answers at fixed instants (`sendWindowState` at 12:00 and at 03:00 EAT on 7 October 2026, for
 * the default hours) — never a hand-typed shape, so each carries every field the send path and the test send read.
 */
import { sendWindowState } from "../../src/lib/marketing/window.ts";
import type { SendWindowState } from "../../src/lib/marketing/window.ts";

/** 12:00 EAT on 7 October 2026 (09:00 UTC) — inside the default window. */
export const NOON_EAT_MS = Date.UTC(2026, 9, 7, 9, 0, 0);
/** 03:00 EAT on 7 October 2026 (00:00 UTC) — outside it; the window opens at 08:00 that day. */
export const NIGHT_EAT_MS = Date.UTC(2026, 9, 7, 0, 0, 0);

/** An OPEN window, whatever the clock says. */
export const ALWAYS_OPEN = (): SendWindowState => sendWindowState(NOON_EAT_MS);
/** A CLOSED window — quiet hours, opening at 08:00 — whatever the clock says. */
export const ALWAYS_CLOSED = (): SendWindowState => sendWindowState(NIGHT_EAT_MS);
