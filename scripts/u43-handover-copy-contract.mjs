/** U43 B5: a settled detail has one visible next-round statement, plus an honest link. */
export function handoverCopyIssues({ handover, page }) {
  const issues = [];
  const need = (yes, label) => { if (!yes) issues.push(label); };
  const render = handover.slice(handover.indexOf("if (!visible) return null;"));

  need(render.includes('<span role="status" aria-live="polite" className="sr-only">{sentence}</span>')
    && (render.match(/\{sentence\}/g) ?? []).length === 1,
  "next-round sentence is announced once and not repeated visibly beside the pod");
  need(render.includes("{hand.ready && successorRoundId && (")
    && render.includes('href={`/updown/${successorRoundId}?from=${encodeURIComponent(roundId)}`}')
    && render.includes("{labels.go}"),
  "successor link appears only when a real open round exists");
  need(page.includes("<RoundCountdownPod")
    && page.includes("<UpDownHandover")
    && page.includes("live: t.market.udNextMatchLive,")
    && page.includes("live: t.market.udNextMatchLiveBody,"),
  "detail pod still provides the visible phase in all languages");
  return issues;
}
