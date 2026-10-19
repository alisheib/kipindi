/** The source-mismatch explanation's disk mutation, shared by its red runner and fleet audit. */
export const MUTATIONS = [{
  name: "source mismatch falsely claims an in-band close",
  file: "src/lib/server/updown-service.ts",
  from: [
    '          ? sourceMismatch',
    '            ? `Round voided (source-mismatch): ${sourceMismatch}. Every stake is refunded in full.`',
  ].join("\n"),
  to: [
    '          ? useTargets',
    '            ? `Round voided (${finalVoidReason}): close ${closePrice} stayed inside the band [${round.downTarget}, ${round.upTarget}] (open ${round.openPrice} ± ${((round.marginBps ?? 0) / 100).toFixed(2)}%). Every stake is refunded in full.`',
  ].join("\n"),
}];
