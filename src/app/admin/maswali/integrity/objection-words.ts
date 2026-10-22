/**
 * The words the Millionea objection queue and its ruling dialog say (MASWALI-BUILD S7-OB) — one home, so the card and the
 * dialog never spell a stored code into an officer's sentence (`test:labels` §11c).
 * Plain module, no client marker: the server card and the client dialog both read it.
 */
import { OBJECTION } from "@/lib/admin-status-lexicon";

/** A question's result as the console's sentences say it: the two results as the seal console prints them, a void as a word. */
const RESULT_WORD = { YES: "YES", NO: "NO", VOID: "void" } as const;
export function outcomeLabel(outcome: string | null | undefined): string {
  return outcome === "YES" || outcome === "NO" || outcome === "VOID" ? RESULT_WORD[outcome] : "—";
}

/** The filer's reason, in the platform's objection lexicon (the Yes/No queue's words). */
export const REASON_LABEL: Record<string, string> = {
  WRONG_OUTCOME: OBJECTION.reasonWrongOutcome.en,
  SOURCE_CONTRADICTS: OBJECTION.reasonSourceContradicts.en,
  AMBIGUOUS_CRITERION: OBJECTION.reasonAmbiguousCriterion.en,
  RESOLVED_EARLY: OBJECTION.reasonResolvedEarly.en,
  OTHER: OBJECTION.reasonOther.en,
};

/** What an upheld ruling did to the question. */
export const REMEDY_LABEL: Record<string, string> = { REVERSE: "result reversed", VOID: "question voided", REINSTATE: "question reinstated" };
