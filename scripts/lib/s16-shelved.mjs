/**
 * S16 inventory and final-source checks. The old implementation remains in its
 * original files and its unit suites remain runnable; active routes must stop
 * mounting it only after the seven-day launch observation has passed.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

// Each recorded item has one active parent. Several details share a parent:
// removing the classic shell, for example, unmounts More, the deposit coin and
// the old balance pill together. A missing row cannot disappear silently.
export const SHELVED_ITEMS = [
  ["The classic header,", "chrome"],
  ["The classic rail,", "chrome"],
  ["More, in both", "chrome"],
  ["The centre Deposit coin", "chrome"],
  ["The Juu/Chini accent dot", "chrome"],
  ["The classic balance capsule", "chrome"],
  ["The Needle on", "floating"],
  ["The channels panel on", "floating"],
  ["The chat bubble on", "floating"],
  ["The P&L strip", "tickets"],
  ["The YES/NO exposure bar", "tickets"],
  ["Search on Tiketi zangu", "tickets"],
  ["Row 2 of the positions bar", "tickets"],
  ["The counts on Tiketi zangu", "tickets"],
  ["The selection countdown ring", "tickets"],
  ["Sharing a ticket", "tickets"],
  ["The classic page header on Tiketi", "tickets"],
  ["The classic position card", "tickets"],
  ["The classic empty state", "tickets"],
  ["The Up & Down history's", "history"],
  ["The classic loading picture", "ticketsLoading"],
  ["The classic head of", "history"],
  ["The \"Angalia utendaji\"", "tickets"],
  ["The classic Sell button's", "ticketSell"],
  ["The classic landing on", "home"],
  ["The LIVE strip on", "ticker"],
  ["The first-visit primer", "primer"],
  ["The board (`/markets`)", "markets"],
  ["The live wall on", "live"],
  ["The classic market card", "cards"],
  ["The classic multi-rail deposit", "deposit"],
  ["The question page's classic guest", "question"],
  ["The classic Up & Down stake", "updown"],
  ["The classic `?side=`", "updown"],
];

export function parseShelvedRows(markdown) {
  const lines = markdown.split(/\r?\n/);
  const head = lines.findIndex((line) => line.startsWith("| Item | Files | Why shelved | Date | How to re-mount | Test |"));
  if (head < 0) return { rows: [], errors: ["SHELVED.md: six-column inventory table is missing"] };
  const rows = [];
  const errors = [];
  for (const line of lines.slice(head + 2)) {
    if (!line.startsWith("|")) break;
    const cells = line.split("|").slice(1, -1).map((cell) => cell.trim());
    if (cells.length !== 6) errors.push(`SHELVED.md: row ${rows.length + 1} has ${cells.length} columns, expected 6`);
    else rows.push(cells);
  }
  return { rows, errors };
}

const SOURCE_PATH = /src\/[A-Za-z0-9_./*\[\]-]+/g;
const COMMAND = /npm run ([a-z0-9:-]+)/g;
const dateValid = (value) => /^20\d\d-\d\d-\d\d$/.test(value)
  && !Number.isNaN(Date.parse(`${value}T00:00:00Z`))
  && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;

function shelvedPathExists(root, relative, fileExists) {
  if (relative.includes("..") || !relative.startsWith("src/")) return false;
  if (!relative.includes("*")) return fileExists(resolve(root, relative));
  if (!relative.endsWith("/*") || relative.indexOf("*") !== relative.length - 1) return false;
  const directory = resolve(root, relative.slice(0, -2));
  try { return readdirSync(directory).length > 0; } catch { return false; }
}

export function validateShelvedInventory(markdown, scripts, { root = process.cwd(), fileExists = existsSync } = {}) {
  const { rows, errors } = parseShelvedRows(markdown);
  const matched = new Set();
  for (const [number, cells] of rows.entries()) {
    const [item, files, why, date, remount, test] = cells;
    const candidates = SHELVED_ITEMS.map(([prefix], i) => item.startsWith(prefix) ? i : -1).filter((i) => i >= 0);
    if (candidates.length !== 1) errors.push(`SHELVED.md row ${number + 1}: item does not match exactly one S16 inventory key`);
    else if (matched.has(candidates[0])) errors.push(`SHELVED.md row ${number + 1}: duplicate item ${item}`);
    else matched.add(candidates[0]);
    if (!/(shelved|unmounted)/i.test(files)) errors.push(`SHELVED.md row ${number + 1}: Files must say shelved or unmounted`);
    const paths = [...files.matchAll(SOURCE_PATH)].map((m) => m[0]);
    if (!paths.length) errors.push(`SHELVED.md row ${number + 1}: no source path`);
    for (const path of paths) if (!shelvedPathExists(root, path, fileExists)) errors.push(`SHELVED.md row ${number + 1}: source path missing ${path}`);
    if (!why || !dateValid(date) || !remount) errors.push(`SHELVED.md row ${number + 1}: reason, real date and re-mount instructions are required`);
    const commands = [...test.matchAll(COMMAND)].map((m) => m[1]);
    if (!commands.length) errors.push(`SHELVED.md row ${number + 1}: no npm run test`);
    for (const command of commands) if (typeof scripts?.[command] !== "string" || !scripts[command]) {
      errors.push(`SHELVED.md row ${number + 1}: test command is not wired: ${command}`);
    }
  }
  if (rows.length !== SHELVED_ITEMS.length) errors.push(`SHELVED.md: ${rows.length} rows; ${SHELVED_ITEMS.length} required`);
  for (const [index, [prefix]] of SHELVED_ITEMS.entries()) if (!matched.has(index)) errors.push(`SHELVED.md: missing ${prefix}`);
  return errors;
}

function has(source, pattern) { return typeof pattern === "string" ? source.includes(pattern) : pattern.test(source); }

/**
 * Keep the old positions JSX in this same file as a parked helper, while the
 * exported page takes the journey path. A direct call to that helper from the
 * exported page would re-mount the old money and navigation UI.
 */
export function validatePositionsShelving(source) {
  const errors = [];
  const liveAt = source.indexOf("export default async function PositionsPage(");
  const parkedAt = source.indexOf("function ShelvedClassicPositionsPage(");
  if (liveAt < 0 || parkedAt <= liveAt) return ["positions: exported page or in-place shelved classic helper is missing"];
  const live = source.slice(liveAt, parkedAt);
  const parked = source.slice(parkedAt);
  if (!has(live, /<TicketsView\b/) || has(live, /\bif\s*\(\s*!?journey\s*\)/)
    || has(live, /\bShelvedClassicPositionsPage\s*\(|<ShelvedClassicPositionsPage\b/)
    || has(live, /<PnlSummaryStrip\b|<SearchBox\b|<PositionsBar\b|<PositionCard\b|<CountdownRing\b|<PageHeader\b|<Empty\b/)) {
    errors.push("positions: exported page can still reach classic JSX or does not unconditionally render TicketsView");
  }
  for (const marker of ["<PageHeader", "<PnlSummaryStrip", "openYesStake", "openNoStake", "<SearchBox", "<PositionsBar", "<Empty", "<PositionCard", "<CountdownRing"]) {
    if (!has(parked, marker)) errors.push(`positions: parked classic JSX lost ${marker}`);
  }
  return errors;
}

/** Final S16 source verdict. Grouping gives every inventory row a concrete parent check. */
export function validateShelvedSource(read) {
  const errors = [];
  const source = (path) => read(path);
  const check = (group, path, predicate, message) => {
    let body;
    try { body = source(path); } catch { errors.push(`${group}: missing ${path}`); return; }
    if (!predicate(body)) errors.push(`${group}: ${message} (${path})`);
  };
  check("chrome", "src/components/layout/app-shell.tsx", (s) => has(s, "<LazyJourneyTopBar")
    && has(s, "<LazyJourneyTabs") && !has(s, /<TopAppBar\b|<BottomNav\b|<PreviewMarker\b/), "classic header, rail or preview marker still mounts");
  check("floating", "src/components/layout/needle.tsx", (s) => has(s, "isJourneySurface(pathname)"), "Needle's journey-surface suppression is missing");
  check("floating", "src/components/social/channels-panel.tsx", (s) => has(s, "isJourneySurface(pathname)"), "channels' journey-surface suppression is missing");
  check("floating", "src/components/chat/ChatRoot.tsx", (s) => has(s, "isJourneySurface(pathname)"), "chat's journey-surface suppression is missing");
  check("tickets", "src/app/positions/page.tsx", (s) => validatePositionsShelving(s).length === 0,
    "classic positions JSX must stay in place as an uncalled helper while the exported page renders TicketsView");
  check("tickets", "src/components/journey/tickets/tickets-view.tsx", (s) => has(s, "<PositionsBarJourney")
    && has(s, "<TicketCard") && has(s, "/positions/performance")
    && !has(s, /<PnlSummaryStrip\b|<SearchBox\b|<PositionsBar\b|<PositionCard\b|<PositionShare\b|<CountdownRing\b/), "journey ticket view re-mounts a classic piece or loses the performance door");
  check("ticketsLoading", "src/app/positions/loading.tsx", (s) => !has(s, /\bif\s*\(journey\)/), "classic loading ghost still branches");
  check("history", "src/app/updown/history/page.tsx", (s) => has(s, "<TicketsHead")
    && !has(s, /<BackLink\b|<PageHeader\b/), "classic history header still mounts");
  check("history", "src/app/updown/history/loading.tsx", (s) => !has(s, /\bif\s*\(journey\)/), "classic history ghost still branches");
  check("ticketSell", "src/components/journey/tickets/ticket-card.tsx", (s) => has(s, 'look="journey"'), "ticket Sell look is no longer the journey look");
  check("home", "src/app/page.tsx", (s) => has(s, "<JourneyHome") && !has(s, /<LegacyLanding\b/), "classic landing still mounts");
  check("home", "src/components/journey/route-ghost.tsx", (s) => has(s, '"/": <JourneyHomeGhost')
    && !has(s, '"/": <HomeGhost'), "classic root loading picture still mounts");
  check("ticker", "src/lib/markets/ticker.ts", (s) => /TICKER_ROUTES:\s*readonly string\[\]\s*=\s*\["\/live",\s*"\/results"\]/.test(s)
    && !has(s, "JOURNEY_TICKER_ROUTES"), "ticker routes are not the final live/results pair");
  check("ticker", "src/components/layout/app-shell.tsx", (s) => (s.match(/<LiveTicker\b/g) ?? []).length === 1, "shell still has two ticker arms");
  check("primer", "src/components/layout/lazy-overlays.tsx", (s) => !has(s, /<FirstVisitPrimer\b/), "old primer still mounts");
  check("markets", "src/components/layout/app-shell.tsx", (s) => has(s, /permanentRedirect\(journeyMarketsTarget\(/), "document /markets does not issue a 308");
  check("markets", "src/app/markets/page.tsx", (s) => has(s, /permanentRedirect\(journeyMarketsTarget\(/), "flight /markets does not issue a 308");
  check("live", "src/app/live/page.tsx", (s) => has(s, "<JourneyLiveList") && !has(s, /<LivePulseGrid\b/), "classic live wall still mounts");
  for (const path of ["src/app/watchlist/page.tsx", "src/app/results/page.tsx", "src/app/markets/[id]/page.tsx"]) {
    check("cards", path, (s) => has(s, "<JourneyCard") && !has(s, /<MarketCard\b/), "classic market card still mounts");
  }
  check("cards", "src/app/markets/[id]/page.tsx", (s) => !has(s, /t\.market\.similarMarkets\b/), "classic similar-card heading still mounts");
  check("deposit", "src/app/wallet/deposit/page.tsx", (s) => has(s, "<JourneyDepositForm")
    && !has(s, /journey\s*&&\s*!cardOnly\s*\?/), "direct deposit route still branches to the classic form");
  check("question", "src/app/markets/[id]/page.tsx", (s) => has(s, "<JourneyBetButtons")
    && !has(s, "t.market.signInToPredict"), "classic guest sign-in panel still mounts");
  check("updown", "src/components/updown/updown-card.tsx", (s) => has(s, "<LazyJudTwoWay")
    && !has(s, /<UpDownStakeControls\b/), "classic card stake control still mounts");
  check("updown", "src/components/updown/round-stake-panel.tsx", (s) => has(s, "<LazyJudTwoWay")
    && has(s, "<LazyJudConfirm") && !has(s, /<UpDownStakeControls\b/), "classic round stake control still mounts");
  const feature = source("src/lib/feature-state.ts");
  if (has(feature, /SIMPLE_JOURNEY_SHIPPED|FEATURE_SIMPLEJOURNEY|STAFF_PREVIEW/)) errors.push("preview: feature-state still carries the preview rollout");
  const previewFiles = [
    "src/app/preview/route.ts", "src/app/admin/journey/page.tsx",
    "src/lib/server/simple-journey-switch.ts", "src/lib/server/simple-journey-ceremony.ts",
    "src/lib/server/journey-preview.ts", "src/lib/server/journey-preview-doors.ts", "src/lib/server/journey-preview-secret.ts",
  ];
  for (const path of previewFiles) {
    let body;
    try { body = source(path); } catch { continue; }
    if (has(body, /JOURNEY_PREVIEW_COOKIE|kp_preview|FEATURE_SIMPLEJOURNEY|journey\.rollout\.switch|runJourneyCeremony|previewLinkDoor|previewOnDoor/)) {
      errors.push(`preview: ${path} still contains active cookie/toggle machinery`);
    }
  }
  const activeSources = [
    "src/components/layout/app-shell.tsx", "src/app/layout.tsx", "src/app/api/health/route.ts",
    "src/lib/server/journey-preview.ts", "src/lib/server/journey-launch.ts",
    "src/lib/server/boot-checks.ts", "src/app/legal/privacy/page.tsx",
  ];
  for (const path of activeSources) {
    check("preview", path, (s) => !has(s, /JOURNEY_PREVIEW_COOKIE|kp_preview|FEATURE_SIMPLEJOURNEY|journey\.rollout\.switch/), "old preview cookie, environment or switch is still named in active source");
  }
  check("observation", "src/lib/server/journey-launch.ts", (s) => has(s, "JOURNEY_LAUNCH"), "S15 launch observation must remain readable");
  check("observation", "src/lib/journey/measures.ts", (s) => has(s, "inBoundsVerdict"), "seven-day measure rule is missing");
  return errors;
}

export function readShelvedSource(root) {
  return (relative) => readFileSync(resolve(root, relative), "utf8");
}
