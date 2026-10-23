/**
 * test:maswali-admin-plain — THE MILLIONEA CONSOLE READS AS PLAIN WORDS AND GIVES FULL CONTROL (MASWALI-BUILD S6-ADMIN;
 * the lead's rulings G2–G8 on the S6-DOCS walk of /admin/maswali; DESIGN_AUTHORITY §M8a item 29; FAILURE-INVENTORY §9c).
 *
 *   npx tsx scripts/maswali-admin-plain.test.mts              (npm run test:maswali-admin-plain)
 *   npx tsx scripts/maswali-admin-plain.test.mts --prove-red  (npm run red:maswali-admin-plain — every plant on disk, restored)
 *
 * G1 (no programme code) is `test:maswali-admin-words`. G5's writes (a draft discarded whole on both stores, a week that
 * opened never, the announced final week never, audited) are `test:maswali-engine` §15 with plants (110)–(112) of
 * `red:maswali-engine`. The browser reads the rendered pages in `qa:maswali-admin-drive` (3.3g: the builder's words).
 *
 * §2 · G2 · the rules a week froze, read on its page in the Owner's form's own words — the fee included, "Cannot be read"
 *      when it cannot be; and the fee beside each open week on Pools.
 * §3 · G3 · names, never ids: an officer by name or a stable handle, a week by its code; the console prints no raw id.
 * §4 · G4 · every time an officer reads in a sentence is EAT, as the console writes it: "Fri 23 Oct, 18:00 (EAT)".
 * §5 · G5 · the discard sits behind the draft's own control, on a typed confirmation, its refusal inside the dialog.
 * §6 · G6 · the week builder's categories and kinds are words, never codes.
 * §7 · G7 · the evidence archive is a list like the other three: week-code search, state and line filters, sort, pager.
 * §8 · G8 · the lock chip names who works a control in the roles' own words — the Owner, never "an Admin" — and the
 *      Winners table prints a role and an account status as words.
 * §9 · S6-SHIP 6 (the lead's rulings of 2026-10-23, on the GUIDE lane's walk) · five console texts say what the code does:
 *      9.1 the Marketing wordings card (the untagged rules are off: other campaigns are not judged); 9.2 the Rules card (two
 *      settings apply at once: the complaint answer target and the release alert, which reads the live setting); 9.3 the
 *      release-wait alert says "Finance"; 9.4 the move-close dialog names only what the move checks; 9.5 the front page's
 *      Millionea card links a page the viewer may open — the weeks, Integrity or Pools, by role — or none.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MUTATIONS } from "./anchors/maswali-admin-plain.anchors.mjs";
import { injectDefect } from "./red-anchor.mjs";
import { decomment } from "./lib/decomment.mts";
import { RulesRead, RULE_CANNOT_BE_READ } from "../src/app/admin/maswali/rules-read.tsx";
import { FROZEN_RULES_GROUPS, RULES_FIELDS, frozenRulesFormValues } from "../src/app/admin/maswali/rules-form.ts";
import { ControlLocked, CONTROL_WHO } from "../src/components/admin/control-locked.tsx";
import { ROLE_LABEL } from "../src/lib/server/roles.ts";
import { CATEGORY_LABEL } from "../src/lib/ai/poll-vocabulary.ts";
import { EVENT_KIND_LABEL, eatInText, officerHandle } from "../src/lib/maswali-admin-format.ts";
import { MILLIONEA_STRIP_LINKS, millioneaStripLink, millioneaStripMore } from "../src/lib/maswali-strip-link.ts";
import { canViewPath } from "../src/lib/server/rbac.ts";
import { releaseWaitAlertText } from "../src/lib/server/maswali-console.ts";
import { untaggedRulesFor } from "../src/lib/server/marketing/millionea-untagged.ts";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const SELF = "scripts/maswali-admin-plain.test.mts";

if (process.argv.includes("--prove-red")) {
  let caught = 0, missed = 0;
  for (const plant of MUTATIONS) {
    const target = resolve(ROOT, plant.file);
    const before = readFileSync(target, "utf8");
    try {
      writeFileSync(target, injectDefect(before, plant.from, plant.to));
      const run = spawnSync(process.execPath, ["--import", "tsx", SELF], { cwd: ROOT, encoding: "utf8", env: { ...process.env, NODE_ENV: "test" } });
      const out = `${run.stdout}\n${run.stderr}`;
      const red = run.status !== 0 && plant.failure.test(out);
      if (red) caught++; else missed++;
      console.log(`${red ? "RED caught" : "MISSED"}: ${plant.name}${red ? "" : ` — exit ${run.status}; ${out.split("\n").filter((l) => l.startsWith("FAIL")).slice(0, 3).join(" | ")}`}`);
    } finally {
      writeFileSync(target, before);
    }
    if (readFileSync(target, "utf8") !== before) { console.log(`FILE LEFT DIRTY: ${plant.file}`); missed++; }
  }
  console.log(`\nmaswali-admin-plain RED: ${caught}/${MUTATIONS.length} caught, ${missed} missed`);
  process.exit(missed === 0 && caught === MUTATIONS.length ? 0 : 1);
}

let passed = 0, failed = 0;
const ok = (name: string, condition: boolean, detail = "") => {
  console.log(`${condition ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
  if (condition) passed++; else failed++;
};
const read = (path: string) => readFileSync(resolve(ROOT, path), "utf8").replace(/\r\n/g, "\n");
const text = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&#x27;|&#39;/g, "'").replace(/\s+/g, " ").trim();

// ── §2 · G2 ───────────────────────────────────────────────────────────────────────────────────────────────────────────
console.log("\n§2 · G2 · the rules a week froze, in the Owner's form's own words");
const SNAPSHOT = {
  ticketPriceTzs: 1_000, floorTzs: 10_000_000, ticketCapPerWeek: 10, guaranteeReservePolicy: "FLOOR_LESS_CARRY_PER_OPEN_WEEK",
  openWeekday: 1, openAt: "06:00", closeWeekday: 5, closeAt: "18:00", minLockBufferMinutes: 30, voidDeadlineHours: 48,
  finalDeadlineWeekday: 3, finalDeadlineAt: "18:00", objectionWindowHours: 24, objectionNotBeforeAt: "12:00", releaseAlertHours: 6,
  questionCaps: { probabilityMin: 0.3, probabilityMax: 0.7, maxPerCompetition: 3, minReserveSources: 2 }, paidExitWindowMinutes: 0,
  v: 1, frozenAt: "2026-11-02T03:00:00.000Z",
} as const;
const POLICIES = [{ value: "FLOOR_LESS_CARRY_PER_OPEN_WEEK", label: "Each unsettled week's floor less its confirmed carry" }];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const frozen = (fee: number | null) => text(renderToStaticMarkup(h(RulesRead, { values: frozenRulesFormValues(SNAPSHOT as any, fee), policies: POLICIES, groups: FROZEN_RULES_GROUPS })));
const card = frozen(0.13);
const pair = (label: string, value: string) => card.includes(`${label} ${value}`);
ok("2.1 · ⭐ the card reads every rule the week froze, each under the form's own label with its unit",
  pair("Ticket price (TZS)", "1,000") && pair("Jackpot floor (TZS)", "10,000,000") && pair("Fee at payout (% of the jackpot)", "13")
    && pair("Tickets per account per week", "10") && pair("Close before the first event (minutes)", "30") && pair("Void deadline after an event (hours)", "48")
    && pair("Objection window (hours)", "24") && pair("Objection window closes no earlier than (EAT)", "12:00") && pair("Sales close on", "Friday")
    && pair("Guarantee before a week opens", "Each unsettled week's floor less its confirmed carry"),
  card.slice(0, 400));
const frozenKeys = RULES_FIELDS.filter((f) => f.group !== "desk").map((f) => f.label);
ok("2.1b · …every frozen field, and not the desk's complaint target (no week freezes it)",
  frozenKeys.every((l) => card.includes(l)) && !card.includes("Complaint answer target"), `${frozenKeys.length} fields`);
const unread = frozen(null);
ok("2.2 · ⛔ a fee that cannot be read is said so, never printed as 0",
  unread.includes(`Fee at payout (% of the jackpot) ${RULE_CANNOT_BE_READ}`) && !/Fee at payout \(% of the jackpot\) 0\b/.test(unread),
  unread.slice(unread.indexOf("Fee at payout"), unread.indexOf("Fee at payout") + 60));
const weekPage = decomment(read("src/app/admin/maswali/[weekId]/page.tsx"));
ok("2.3 · the week's page draws the card from the rules and the fee the week froze (a DRAFT: what its open would freeze)",
  weekPage.includes("<RulesRead values={frozenRulesFormValues(d.rules, d.feeRate)} policies={policies} groups={FROZEN_RULES_GROUPS} />")
    && weekPage.includes('"Rules this week froze"') && weekPage.includes('"Rules if it opened now"'));
const poolsPage = decomment(read("src/app/admin/maswali/pools/page.tsx"));
ok("2.4 · Finance reads the fee beside each open week on Pools — its own column, \"Cannot be read\" when it cannot be",
  poolsPage.includes('<th className="text-right">Fee at payout</th>')
    && poolsPage.includes("{w.feeRate === null ? CANNOT_BE_READ : fmtRate(w.feeRate)}"));
const consoleSrc = decomment(read("src/lib/server/maswali-console.ts"));
ok("2.5 · the fee is the week's own — its market's snapshot, the jackpot-payout model only; unknown is null, never 0",
  consoleSrc.includes("const fees = snapshotOrLegacy(market.feeSnapshot);")
    && consoleSrc.includes('return fees.feeModel === "jackpot-payout" && typeof rate === "number" && Number.isFinite(rate) ? rate : null;')
    && consoleSrc.includes("feeRate: await weekFeeRate(w),"));

// ── §3 · G3 ───────────────────────────────────────────────────────────────────────────────────────────────────────────
console.log("\n§3 · G3 · names, never ids");
const handle = officerHandle("usr_a1b2c3d4e5f6");
ok("3.1 · ⭐ an officer with no name on record reads as a stable handle, never the raw id", handle === "Officer #D4E5F6" && !handle.includes("usr_"), handle);
const integrityPage = decomment(read("src/app/admin/maswali/integrity/page.tsx"));
ok("3.2 · the new-device seals name the officer and the week by name and code",
  integrityPage.includes('officer {d.officer ?? "not on record"} · week {d.weekCode ?? "not on record"}') && !/\{d\.(officerId|weekId)\b/.test(integrityPage));
ok("3.3 · the seal log names its officers; the connected accounts give a stable handle, never a raw id",
  integrityPage.includes('{s.sealer ?? "—"}') && integrityPage.includes('{s.secondOfficer ?? "—"}') && !/\{s\.(sealedBy|stage2By)\b/.test(integrityPage)
    && integrityPage.includes("{displayLabel({ id: a.userId, displayName: null })}") && !integrityPage.includes('break-all">{a.userId}</td>'));
// ⛔ The census: no console page or control prints an id field as text. An id may key a row, build a link, name a form
// field or reach an action — every such use is an attribute or a call — but never stand as a child of an element.
const consoleFiles = ["src/app/admin/maswali/page.tsx", "src/app/admin/maswali/[weekId]/page.tsx", "src/app/admin/maswali/[weekId]/week-controls.tsx",
  "src/app/admin/maswali/pools/page.tsx", "src/app/admin/maswali/pools/pools-controls.tsx", "src/app/admin/maswali/integrity/page.tsx",
  "src/app/admin/maswali/integrity/integrity-controls.tsx", "src/app/admin/maswali/integrity/objection-queue.tsx", "src/app/admin/maswali/evidence/page.tsx",
  "src/app/admin/maswali/lookup/page.tsx", "src/app/admin/maswali/new/week-builder.tsx"];
const ID_AS_TEXT = />[^<>{}]*\{\s*[a-zA-Z.]*\.(?:userId|officerId|actorId|weekId|sealedBy|stage2By|createdBy|reviewedBy|marketId|ticketId|positionId)\s*(?:\?\?\s*"[^"]*"\s*)?\}/;
const idAsText = consoleFiles.filter((f) => ID_AS_TEXT.test(decomment(read(f))));
ok("3.4 · ⛔ census: no console page or control prints an id field as text", idAsText.length === 0, idAsText.join(", "));

// ── §4 · G4 ───────────────────────────────────────────────────────────────────────────────────────────────────────────
console.log("\n§4 · G4 · every time in a sentence is EAT, as the console writes it");
const at = eatInText("2026-10-23T15:00:00.000Z");
ok("4.1 · ⭐ an instant in a sentence reads \"Fri 23 Oct, 18:00 (EAT)\" — East Africa Time, named", at === "Fri 23 Oct, 18:00 (EAT)", at);
ok("4.1b · …from an epoch too, never a raw ISO string", eatInText(Date.parse("2026-10-23T15:00:00.000Z")) === at && !/\dT\d/.test(at));
// ⛔ The census: in the services the console prints, no refusal, checklist line or alert interpolates a time field raw.
const SERVICES = ["src/lib/server/maswali-service.ts", "src/lib/server/maswali-console.ts", "src/lib/server/maswali-objections.ts", "src/lib/server/maswali-settlement.ts"];
const RAW_TIME = /(?:refuse\(|text: |p\.push\()`[^`]*\$\{(?![^}]*(?:eatInText|fmtEat)\()[^}]*(?:At|toISOString\(\))\}[^`]*`/;
const rawTimes = SERVICES.filter((f) => RAW_TIME.test(decomment(read(f))));
ok("4.2 · ⛔ census: no console-bound sentence prints a raw time (each through eatInText)", rawTimes.length === 0, rawTimes.join(", "));
ok("4.3 · control: the census reads a raw time where one stands", RAW_TIME.test("return refuse(`Week ${week.code} opens at ${week.opensAt}.`);")
  && !RAW_TIME.test("return refuse(`Week ${week.code} opens ${eatInText(week.opensAt)}.`);"));

// ── §5 · G5 ───────────────────────────────────────────────────────────────────────────────────────────────────────────
console.log("\n§5 · G5 · the discard: the draft's own control, a typed confirmation, the refusal inside the dialog");
const actions = decomment(read("src/app/admin/maswali/actions.ts"));
const controls = decomment(read("src/app/admin/maswali/[weekId]/week-controls.tsx"));
ok("5.1 · ⭐ the discard is enforced as the draft's control (whoever may draft a week may take a draft back)",
  actions.includes('export async function discardMaswaliDraftAction(formData: FormData): Promise<ActionResult> {\n  const session = await requireStaff(CONTROL_DOMAIN.createMaswaliWeek, "discardMaswaliDraft");'));
ok("5.2 · the page offers it only to that control, locks it for every other role, and never for the announced final week",
  weekPage.includes('canUseControl(session?.role, "createMaswaliWeek")')
    && weekPage.includes(': canDraft ? <DiscardDraftControl weekId={week.id} weekCode={week.code} />')
    && weekPage.includes(': <ControlLocked what="Discard draft" need={CONTROL_DOMAIN.createMaswaliWeek} />}')
    && weekPage.includes("{week.isFinal ? <p"));
ok("5.3 · a typed confirmation (DISCARD), with the service's refusal stated inside the dialog and off the page while it is open",
  controls.includes('const DISCARD_WORD = "DISCARD";') && controls.includes('tier="hard" typedWord={DISCARD_WORD}')
    && controls.includes('{!open && error && <span role="alert"')
    && controls.includes('a week that opened is never discarded.</p>\n          {error && <p role="alert" className="text-body-sm text-danger-fg">{error}</p>}'));

// ── §6 · G6 ───────────────────────────────────────────────────────────────────────────────────────────────────────────
console.log("\n§6 · G6 · the builder's options are words");
const builder = decomment(read("src/app/admin/maswali/new/week-builder.tsx"));
const listOf = (name: string) => (builder.match(new RegExp(`const ${name} = \\[([^\\]]*)\\]`))?.[1] ?? "").split(",").map((s) => s.trim().replace(/^"|"$/g, "")).filter(Boolean);
const cats = listOf("CATEGORIES"), kinds = listOf("KINDS");
ok("6.1 · ⭐ every category and every kind the builder offers has a word, and no word is its code",
  cats.length === 7 && kinds.length === 4 && cats.every((c) => !!CATEGORY_LABEL[c] && CATEGORY_LABEL[c] !== c) && kinds.every((k) => !!EVENT_KIND_LABEL[k] && EVENT_KIND_LABEL[k] !== k),
  `${cats.map((c) => CATEGORY_LABEL[c]).join(", ")} · ${kinds.map((k) => EVENT_KIND_LABEL[k]).join(", ")}`);
ok("6.2 · the builder offers those words (the stored value stays the code), and names its template by the kind's word",
  builder.includes("options={CATEGORIES.map((c) => ({ value: c, label: CATEGORY_LABEL[c] ?? c }))}")
    && builder.includes("options={KINDS.map((k) => ({ value: k, label: EVENT_KIND_LABEL[k] ?? k }")
    && builder.includes("Use the {(EVENT_KIND_LABEL[r.eventKind] ?? EVENT_KIND_LABEL.ANNOUNCEMENT).toLowerCase()} template"));

// ── §7 · G7 ───────────────────────────────────────────────────────────────────────────────────────────────────────────
console.log("\n§7 · G7 · the evidence archive is a list like the other three");
const evidence = decomment(read("src/app/admin/maswali/evidence/page.tsx"));
ok("7.1 · ⭐ it selects through the week list's own query (q, state, line, sort, dir, page), counted whole before the page",
  evidence.includes("const asked = parseWeekListQuery(sp);") && evidence.includes("selectWeekPage(weeks,") && evidence.includes("const listParams = weekListParams(query);")
    && !/weeks\.slice\(/.test(evidence));
ok("7.2 · a week-code search, a state filter in the console's state words and a line filter, as the week list draws them",
  evidence.includes('<SearchBox mode="form" formId="maswali-evidence-filters"') && evidence.includes('<form id="maswali-evidence-filters" method="get"')
    && evidence.includes("label: weekStateChip(state).label") && evidence.includes('name="line"'));
ok("7.3 · sortable columns and the pager carry the list's own parameters",
  evidence.includes('<SortTh field="week"') && evidence.includes('<SortTh field="closes"') && evidence.includes("baseHref={buildBaseHref(EVIDENCE_HREF, listParams)}"));
const mainList = decomment(read("src/app/admin/maswali/page.tsx"));
ok("7.4 · the week list's own state filter reads the console's state words too, never the enum",
  mainList.includes("...WEEK_STATES.map((state) => ({ value: state, label: weekStateChip(state).label }))") && !mainList.includes("label: state }"));

// ── §8 · G8 ───────────────────────────────────────────────────────────────────────────────────────────────────────────
console.log("\n§8 · G8 · the lock chip speaks the roles' own words");
const chip = renderToStaticMarkup(h(ControlLocked, { what: "Release", need: "accounting" }));
const chipText = text(chip), chipTitle = (chip.match(/title="([^"]*)"/)?.[1] ?? "").replace(/&#x27;|&#39;/g, "'");
ok("8.1 · ⭐ the chip reads \"Release · Finance officers only\" and its tooltip \"… Ask the Owner or a Finance officer.\"",
  chipText === "Release · Finance officers only" && chipTitle === "Release — Finance officers only. Ask the Owner or a Finance officer.", `${chipText} | ${chipTitle}`);
const words = Object.values(CONTROL_WHO).flatMap((w) => [w.only, w.ask]).join(" | ");
ok("8.2 · ⛔ no chip word says \"Admin\", and none prints a domain's code", !/\bAdmin\b/.test(words) && !/\b(?:accounting|ops|overview|trading|compliance|growth|support) only\b/.test(words), words.slice(0, 200));
const ACTOR: Record<string, string> = { compliance: "COMPLIANCE", trading: "MODERATOR", accounting: "FINANCE", growth: "GROWTH", support: "SUPPORT" };
ok("8.3 · every domain is named by the role that works it, as ROLE_LABEL names that role, and the Owner as \"the Owner\"",
  Object.entries(ACTOR).every(([d, role]) => CONTROL_WHO[d]?.only === `${ROLE_LABEL[role as keyof typeof ROLE_LABEL]} officers only`
    && CONTROL_WHO[d]?.ask === `the ${ROLE_LABEL.ADMIN} or a ${ROLE_LABEL[role as keyof typeof ROLE_LABEL]} officer`)
    && CONTROL_WHO.ops.ask === `the ${ROLE_LABEL.ADMIN}` && ROLE_LABEL.ADMIN === "Owner");
const unknownDomain = text(renderToStaticMarkup(h(ControlLocked, { what: "Do it", need: "nowhere" })));
ok("8.4 · a domain the chip does not know falls to the Owner, never to a code", unknownDomain === "Do it · The Owner only", unknownDomain);
ok("8.5 · the Winners table prints a role and an account status as words, never their enums",
  integrityPage.includes("{roleLabel(w.role)} · {accountStatusLabel(w.status)}") && !integrityPage.includes("{w.role} · {w.status}"));

// ── §9 · S6-SHIP 6 ─────────────────────────────────────────────────────
console.log("\n§9 · S6-SHIP 6 · five console texts say what the code does (the lead's rulings of 2026-10-23)");
/** A page's words as an officer reads them: comments dropped, JSX's entities as their characters, whitespace folded. */
const pageWords = (path: string) => decomment(read(path)).replace(/&ldquo;/g, "“").replace(/&rdquo;/g, "”").replace(/&rsquo;/g, "’")
  .replace(/&apos;/g, "'").replace(/\s+/g, " ");
{
  // 9.1 · the untagged rules are off in this release (MILLIONEA_UNTAGGED_RULES_ON), so the card says so — read against the
  // one decision itself at production's ceiling: it hands no rule for a campaign not tagged Millionea.
  const integrityWords = pageWords("src/app/admin/maswali/integrity/page.tsx");
  const RULE_9_1 = "Only campaigns tagged as Millionea are checked against these wordings; other campaigns are not judged in this release.";
  const ceilingKept = process.env.FEATURE_MILLIONEA;
  process.env.FEATURE_MILLIONEA = "ACTIVE";
  const decided = untaggedRulesFor("Derby promo");
  if (ceilingKept === undefined) delete process.env.FEATURE_MILLIONEA; else process.env.FEATURE_MILLIONEA = ceilingKept;
  ok("9.1 · ⭐ the Marketing wordings card says what the lint does in this release — tagged campaigns checked, other campaigns not judged — and no longer that they are refused until tagged",
    integrityWords.includes(RULE_9_1) && !integrityWords.includes("refused until it is tagged or reworded") && decided === undefined,
    `card=${integrityWords.includes(RULE_9_1)} decision=${decided === undefined ? "none" : "rules"}`);

  // 9.2 · two settings apply at once, in the form's own labels: the desk's complaint target (no week freezes it) and the
  // release alert, which the console reads from the LIVE rules for every week (`consoleAlerts`: cfg = getMaswaliConfig()).
  const label = (key: string) => RULES_FIELDS.find((f) => f.key === key)?.label ?? `(no field ${key})`;
  const mainWords = pageWords("src/app/admin/maswali/page.tsx");
  const RULE_9_2 = `Two settings apply at once, to every week: “${label("complaintAnswerDays")}”, the support desk’s promise, and “${label("releaseAlertHours")}”, which the console’s alert reads live.`;
  const consoleCode = decomment(read("src/lib/server/maswali-console.ts"));
  const alertsFn = consoleCode.slice(consoleCode.indexOf("export async function consoleAlerts("), consoleCode.indexOf("export async function", consoleCode.indexOf("export async function consoleAlerts(") + 10));
  ok("9.2 · ⭐ the Rules card names both settings that apply at once — the complaint answer target and the release alert — as the console reads them",
    mainWords.includes(RULE_9_2) && !mainWords.includes("The one exception is the support desk")
      && alertsFn.includes("const cfg = getMaswaliConfig();") && alertsFn.includes("Date.parse(w.objectionsCloseAt) + cfg.releaseAlertHours * HOUR < nowMs"),
    RULE_9_2);

  // 9.3 · the release-wait alert's words, rendered: "Finance", the console's one word for the role that releases.
  const said = releaseWaitAlertText("MLN-2026-W44", 4);
  ok("9.3 · ⭐ the release-wait alert says Finance releases it — the role's own label, never \"Accounting\"",
    said === `MLN-2026-W44: its results are final and its window closed 4 h ago, and it is not settled. ${ROLE_LABEL.FINANCE} releases it.`
      && ROLE_LABEL.FINANCE === "Finance" && !/Accounting releases/.test(consoleCode) && alertsFn.includes("text: releaseWaitAlertText(w.code, cfg.releaseAlertHours)"),
    said);

  // 9.4 · the move-close dialog names only what the move checks: the free-cancel window and the first event (moveClose,
  // maswali-service.ts — its two refusals); no notice period, which nothing checks.
  const controlsWords = pageWords("src/app/admin/maswali/[weekId]/week-controls.tsx");
  const serviceCode = decomment(read("src/lib/server/maswali-service.ts"));
  const moveFn = serviceCode.slice(serviceCode.indexOf("export async function moveClose("), serviceCode.indexOf("export async function", serviceCode.indexOf("export async function moveClose(") + 10));
  const refusals = moveFn.match(/refuse\((?:"[^"]*"|`[^`]*`)\)/g) ?? [];
  ok("9.4 · ⭐ the move-close dialog says the service checks the free-cancel window and the first event — the two refusals moveClose makes — and no notice period",
    controlsWords.includes("The service checks the free-cancel window and the first event before accepting this move.") && !/notice period/i.test(controlsWords)
      && refusals.some((r) => r.includes("so every ticket keeps its free-cancel window.")) && refusals.some((r) => r.includes("minutes before the first event."))
      && refusals.length > 5 && !refusals.some((r) => /notice/i.test(r)),
    `${refusals.length} refusals in moveClose`);
}
{
  // 9.5 · the front page's Millionea card links a page the viewer may open, asked with that page's own gate question
  // (`canViewPath`, which `viewerMayOpen` asks): the weeks, else Integrity, else Pools, else none — a case per role.
  const EXPECT: Record<string, string | null> = { ADMIN: "Open the weeks", MODERATOR: "Open the weeks", AUDITOR: "Open the weeks",
    COMPLIANCE: "Open Integrity", FINANCE: "Open Pools", GROWTH: null, SUPPORT: null };
  for (const [role, label] of Object.entries(EXPECT)) {
    const link = await millioneaStripLink((path) => canViewPath(role as never, path));
    const gate = link === null ? null : await canViewPath(role as never, link.href);
    ok(`9.5 · ⭐ ${ROLE_LABEL[role as keyof typeof ROLE_LABEL]} (${role}) · the card's link is ${label === null ? "none" : `"${label}"`} — a page this role may open`,
      (link?.label ?? null) === label && (link === null || gate === true), JSON.stringify({ link: link?.href ?? null, gate }));
  }
  const weeks = MILLIONEA_STRIP_LINKS[0];
  ok("9.5b · the rest are said to be \"on the weeks page\" only beside the weeks link; any other link, or none, says how many and no page",
    millioneaStripMore(3, weeks) === "and 3 more on the weeks page" && millioneaStripMore(3, MILLIONEA_STRIP_LINKS[1]) === "and 3 more"
      && millioneaStripMore(3, MILLIONEA_STRIP_LINKS[2]) === "and 3 more" && millioneaStripMore(3, null) === "and 3 more");
  const home = decomment(read("src/app/admin/page.tsx"));
  ok("9.5c · the front page draws the card's link and its last line from the viewer's own gate (viewerMayOpen), never a fixed weeks link",
    home.includes("await millioneaStripLink(viewerMayOpen)") && home.includes("{millioneaStripMore(millioneaAlerts.length - 4, millioneaLink)}")
      && !home.includes(">Open the weeks</Link>") && !home.includes("more on the weeks page</li>"));
}

const FLOOR = 41; // the count the first green run printed: 28 at S6-ADMIN 6 (run 39824239196); 41 with §9 (S6-SHIP 6)
ok(`floor · at least ${FLOOR} checks ran before this one`, passed + failed >= FLOOR, `${passed + failed} ran`);
console.log(`\nmaswali-admin-plain: ${passed} passed, ${failed} failed`);
if (failed) process.exitCode = 1;
