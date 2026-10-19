/** U43 B1 red proof: undo live line/clock/quotes and mutate open-bar evidence in memory. */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { handoverPodIssues, roundCardIssues } from "./u43-round-card-contract.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = (path) => readFileSync(join(root, path), "utf8");
const card = source("src/components/updown/updown-card.tsx");
const controls = source("src/components/updown/updown-stake-controls.tsx");
const mark = source("src/components/updown/asset-mark.tsx");
const detailPage = source("src/app/updown/[roundId]/page.tsx");
const action = source("src/components/updown/round-action-panel.tsx");
const countdown = source("src/components/updown/round-countdown.tsx");
const handover = source("src/components/updown/updown-handover.tsx");
const dictionary = source("src/lib/i18n-dict.ts");
const css = source("src/app/globals.css");
const helper = source("src/lib/updown-card-view.ts");

const checks = [
  ["live line removed", card.replace("<RoundLiveLine assetKey={assetKey}", "<MissingLiveLine assetKey={assetKey}")],
  ["last-seconds words removed", card.replace("urgent ? t.market.udLastSeconds", "urgent ? t.market.udBetsCloseIn")],
  ["320px clock digits split", card.replace('m-tick shrink-0 whitespace-nowrap font-mono font-bold tabular-nums leading-none', 'm-tick font-mono font-bold tabular-nums leading-none')],
  ["closed round paints placeholder digits", card.replace('visibility: counting ? undefined : "hidden"', 'visibility: "visible"')],
  ["closed placeholder announced as a clock", card.replace('aria-hidden={!counting}', 'aria-hidden={false}')],
  ["kit urgency removed", card.replace('urgent ? "m-urgent" : undefined', 'urgent ? undefined : undefined')],
  ["confirming payout removed", card.replace('locked || awaitingResult || state === "confirming"', "locked")],
  ["viewer result removed", card.replace("settledNow && myResults && myResults.length > 0", "false && myResults && myResults.length > 0")],
  ["one-sided UP refund called a win", card.replace('price.kind === "oneSided" ? t.market.udUp : t.market.udUpWins', 't.market.udUpWins')],
  ["one-sided DOWN refund called a win", card.replace('price.kind === "oneSided" ? t.market.udDown : t.market.udDownWins', 't.market.udDownWins')],
  ["single result omits what its amount means", card.replace('myResults[0].status === "WIN" ? t.market.udPaidOut : t.market.udStake', 'myResults[0].status === "WIN" ? "" : ""')],
  ["latest asset price impersonates round read", card.replace('readQuotedAt, openPrice, readPrice });', 'sourceQuotedAt: readQuotedAt, openPrice, livePrice: readPrice });')],
  ["closing price stamped with opening quote", card.replace('closePrice != null ? closeQuotedAt : openPrice != null ? openQuotedAt : null', 'closePrice != null ? openQuotedAt : openPrice != null ? openQuotedAt : null')],
  ["failed observation called no newer price", card.replace('readUnavailable ? t.market.udReadUnavailable', 'readUnavailable ? t.home.udMatchNoNewPrice')],
  ["price painted as an UP side", card.replace('const priceColor = "var(--text)";', 'const priceColor = "var(--yes-300)";')],
  ["price painted as winnings", card.replace('const priceColor = "var(--text)";', 'const priceColor = "var(--gilt)";')],
  ["price row bypasses neutral ink", card.replace('style={{ color: priceColor }}', 'style={{ color: "var(--no-300)" }}')],
  ["target tiles returned", card.replace("{/* The open is the price to beat, stated once.", '<div className="ud-prices" />\n      {/* The open is the price to beat, stated once.')],
  ["card Swahili grammar reverted", card.replace('const durationWords = roundDuration(t, durationMinutes);', 'const durationWords = `${durationMinutes} ${t.market.udMin}`;')],
];
for (const [name, mutant] of checks) {
  if (mutant === card || roundCardIssues(mutant, controls, mark, detailPage, action, countdown, dictionary).length === 0) {
    throw new Error(`RED MISSED: ${name}`);
  }
}
const detailMutants = [
  ["refunded detail amount called payout", detailPage.replace('result === "LOSS" ? t.market.udStake : t.market.udRefundTitle', 'result === "LOSS" ? t.market.udStake : t.market.udPaidOut')],
  ["lost detail amount shows zero payout", detailPage.replace('result === "LOSS" ? myPosition?.stake ?? 0 : myPosition?.payout ?? 0', 'myPosition?.payout ?? 0')],
  ["detail confirming loses frozen payouts", detailPage.replace('{isOpen || locked || awaitingResult ? (', '{isOpen || locked ? (')],
  ["detail next round invented", detailPage.replace('round.successor.chainRunning ? t.market.udNextAfterResult', 'true ? t.market.udNextAfterResult')],
  ["detail pool reverts to volume", detailPage.replace('className="mt-1 font-mono text-micro uppercase eyebrow text-text-subtle">{t.market.udPool}</p>', 'className="mt-1 font-mono text-micro uppercase eyebrow text-text-subtle">{t.market.udVolume}</p>')],
  ["detail Swahili grammar reverted", detailPage.replace('<Chip>{roundDuration(t, round.durationMinutes)}</Chip>', '<Chip>{round.durationMinutes} {t.market.udMin}</Chip>')],
  ["detail borrows asset latest quote", detailPage.replace('livePrice: round.readPrice', 'livePrice: asset.livePrice')],
];
for (const [name, mutant] of detailMutants) {
  if (mutant === detailPage || roundCardIssues(card, controls, mark, mutant, action, countdown, dictionary).length === 0)
    throw new Error(`RED MISSED: ${name}`);
}
const promise = dictionary.replace('udNextAfterResult: "The next round appears when scheduled."',
  'udNextAfterResult: "The next round opens when this result arrives."');
if (promise === dictionary || roundCardIssues(card, controls, mark, detailPage, action, countdown, promise).length === 0)
  throw new Error("RED MISSED: unscheduled opening promise");

const podMutants = [
  ["settled hold mislabelled as unavailable", countdown.replace('&& hand.phase !== "hold";', ';'), css],
  ["settled hold shows false digits", countdown.replace('const textOnlyPod = settled && (!inHandover || !hand!.counting);', 'const textOnlyPod = inHandover && hand!.phase === "live";'), css],
  ["settled successor shows false digits", countdown.replace('{!textOnlyPod && <span', '{true && <span'), css],
  ["text-only label loses translated emphasis", countdown.replace('"m-tick font-mono text-body-sm font-semibold uppercase eyebrow text-text-subtle"', '"m-tick font-mono text-micro font-semibold uppercase eyebrow text-text-subtle"'), css],
  ["text-only pod regains its empty mobile clock box", countdown, css.replace('.ud-round-pod[data-text-only="true"] { min-height: var(--tap-min); width: fit-content; max-width: 100%; border-radius: var(--r-pill); }', '.ud-round-pod[data-text-only="true"] { min-height: calc(var(--type-h2) + var(--sp-4) + 3 * var(--sp-2) + 2px); width: 100%; }'), handover],
  ["settled status stretches across the phone again", countdown, css.replace('width: fit-content; max-width: 100%; border-radius: var(--r-pill);', 'width: 100%; max-width: 100%; border-radius: var(--r-md);'), handover],
  ["next-round link shrinks below a full tap", countdown, css, handover.replace('minHeight: "var(--tap-min)"', 'minHeight: "var(--sp-6)"')],
];
for (const [name, podSource, podCss, podLink = handover] of podMutants) {
  if ((podSource === countdown && podCss === css && podLink === handover) || handoverPodIssues(podSource, podCss, podLink).length === 0)
    throw new Error(`RED MISSED: ${name}`);
}

const changed = helper.replace("quoteMs > opensAtMs", "quoteMs >= opensAtMs");
if (changed === helper) throw new Error("RED MISSED: open-boundary mutation anchor");
const js = ts.transpileModule(changed, { compilerOptions: { target: ts.ScriptTarget.ES2022,
  module: ts.ModuleKind.ESNext } }).outputText;
const mutant = await import(`data:text/javascript;base64,${Buffer.from(js).toString("base64")}`);
const start = Date.parse("2026-10-19T10:30:00.000Z");
const actual = mutant.cardPriceRead({ opensAtMs: start, closesAtMs: start + 300_000,
  readQuotedAt: new Date(start).toISOString(), openPrice: 100, readPrice: 100 });
if (actual === "opening") throw new Error("RED MISSED: open bar still classified correctly after mutation");
console.log("U43 B1 red proof: all source reversions and the open-bar boundary mutation caught");
