/** At most this many state frames load, hydrate and paint together on a local development server. */
export const PHOTOGRAPH_CONCURRENCY = 3;

/** The quick sweep needs one receipt; a full sweep needs a separate real bet per player cell. */
export function receiptParticipants(pages, fullMatrix) {
  const players = pages.filter((page) => page.who === "player");
  if (fullMatrix) return players;
  const phone = players.find((page) => page.width === 360);
  if (!phone) throw new Error("Quick receipt capture needs a signed-in 360px cell");
  return [phone];
}

/** The exact success words from the three player dictionaries. A refusal must never pass as a receipt. */
export const RECEIPT_EYEBROWS = Object.freeze({ en: "Bet placed", sw: "Dau limewekwa", zh: "已下注" });

export function receiptReady(sample, requirement) {
  return !!sample && sample.lang === requirement.locale && sample.signedIn === true
    && sample.roundPhase === "open" && sample.dialogVisible === true
    && sample.eyebrow === RECEIPT_EYEBROWS[requirement.locale]
    && typeof sample.title === "string" && sample.title.trim().length > 0
    && typeof sample.text === "string" && sample.text.includes("TZS");
}

/** Visit every selected cell with a fixed number of workers and return results in input order. */
export async function mapLimited(items, limit, visit) {
  if (!Number.isInteger(limit) || limit < 1) throw new Error("A photograph fanout must be a positive integer");
  const results = new Array(items.length);
  let cursor = 0;
  const worker = async () => {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await visit(items[index], index);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

/** A saved frame must represent the state on both sides of Chromium's screenshot. */
export function frameReady(sample, requirement) {
  if (!sample || sample.lang !== requirement.locale || sample.signedIn !== requirement.signedIn) return false;
  if (requirement.detailPage) return sample.detailReady === true;
  if (sample.cards < 1 || sample.marksReady !== true || sample.chartReady !== true) return false;
  if (requirement.marketPage) return true;
  if (requirement.needsLive && sample.runningTicks.length === 0) return false;
  if (sample.runningTicks.some((tick) => !/\d/.test(tick) || tick.includes("--:--") || tick.includes("—:—"))) return false;
  if (requirement.roundPhase && sample.roundPhase !== requirement.roundPhase) return false;
  if (requirement.heldActionClearance) {
    const action = sample.heldAction;
    if (!action || action.layout !== "held" || action.railPosition !== "fixed"
      || action.buttons !== 2 || action.minButtonHeight < 40 || action.clearance < 24) return false;
  }
  if (requirement.heldCaptionHidden && (!sample.oneSideCaption?.present || sample.oneSideCaption.visible)) return false;
  if (requirement.last30LockMs != null && (
    sample.now < requirement.last30LockMs - 30_000 || sample.now >= requirement.last30LockMs
  )) return false;
  return true;
}

/** Keep a screenshot in memory until its post-shot state is verified; retry a transient refresh. */
export async function verifiedScreenshot({ sample, capture, valid, retry, attempts = 3 }) {
  let last = "the frame was not ready";
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      const before = await sample();
      if (valid(before)) {
        const image = await capture();
        const after = await sample();
        if (valid(after)) return { image, before, after, attempt: attempt + 1 };
        last = `state changed during screenshot: ${JSON.stringify(after).slice(0, 200)}`;
      } else {
        last = `state not ready before screenshot: ${JSON.stringify(before).slice(0, 200)}`;
      }
    } catch (error) { last = String(error).slice(0, 200); }
    if (attempt + 1 < attempts) await retry(attempt + 1);
  }
  throw new Error(`No valid screenshot after ${attempts} attempt(s): ${last}`);
}
