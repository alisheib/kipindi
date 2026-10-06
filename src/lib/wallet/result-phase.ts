/** What the wallet's result may say about a STORED transaction status (route audit D3a, 2026-10-06). Only CONFIRMED is done;
 *  an unknown status reads as moving, never done and never failed. */
export const RESULT_TXN_STATUSES = ["PENDING", "PROCESSING", "AML_REVIEW", "CONFIRMED", "FAILED", "REVERSED", "CANCELLED"] as const;
export type ResultTxnStatus = (typeof RESULT_TXN_STATUSES)[number];
export type ResultPhase = "done" | "moving" | "review" | "notDone";
const PHASE: Record<ResultTxnStatus, ResultPhase> = { CONFIRMED: "done", PENDING: "moving", PROCESSING: "moving", AML_REVIEW: "review", FAILED: "notDone", REVERSED: "notDone", CANCELLED: "notDone" };
export function resultPhase(status: string | null | undefined): ResultPhase {
  return (status ? (PHASE as Record<string, ResultPhase>)[status] : undefined) ?? "moving";
}
