/**
 * S14 · THE VISUAL SWEEP OF EVERY SCREEN CHANGED ON 2026-10-09 — `npm run qa:s14-visual-sweep`.
 *
 * WHY THIS EXISTS. On 2026-10-09 six builders changed six screens at once, each in its own checkout, for the owner's
 * rulings of that day: a marketing SMS is sent exactly as the officer wrote it (no footer, no stop link, no source line —
 * Privacy v2026-10-09 with it); a test to a TYPED number is for Admin and Compliance only; the results row "Stopped since
 * this campaign"; what a masked officer may know about a number (C8b); the importer's robustness round (C8c); a big
 * workbook read in the officer's browser (C3c). Every builder proves its own screen with its own suites and drive; none
 * photographs the six TOGETHER, at every phone and desktop width, on the merged tree. The owner's standard that day:
 * "only perfect results … visual and logical perfection … consistency is key". So this drive takes EVERY state of those
 * screens as VIEWPORT TILES — never a full-page picture: a tile is what an officer's screen shows — at 320, 360, 390, 768,
 * 1024 and 1280 wide, 800 tall, and CHECKS each tile as it is taken. Any defect fails the run (exit 1).
 *
 * ⭐ WHAT EVERY TILE IS CHECKED FOR, in the page, the instant before its picture (`window.__s14.probe`):
 *   · NO SIDEWAYS SCROLL — the document's scrollWidth against its clientWidth, AND the state's own card or dialog (the
 *     dialog's panel and its scrolling root too): a fixed dialog never shows in the page's width, so the page check alone
 *     is blind to it (the contacts importer's V1 lesson);
 *   · NO TEXT CLIPPED OR RUNNING OUT OF ITS BOX — every visible text node, measured by its own line boxes (a Range), held
 *     against each box it sits in, up to the page: past a box that HIDES its overflow it is CLIPPED, past a box that does
 *     not it RUNS OUT of it (a button's words past its edge, a chip's, the counter line's, a results row's, a dialog's) —
 *     and only where the browser agrees the box overflows (its scrollWidth > clientWidth + 1), so a glyph's overhang is
 *     never a finding; a box cut short by an ellipsis, and a fixed-height box whose lines spill past it (scrollHeight >
 *     clientHeight + 1), are clipped too. ⛔ A scroll container ends the walk (a wide table's ScrollX: what is past its
 *     edge is scrolled to, never lost), and so does an absolutely positioned box (a badge hung off a corner is drawn there
 *     on purpose). Text that is visually hidden (`.sr-only`, a clip, display none, opacity 0) is skipped. ⚖️ The ONE
 *     allowance is the house's own rule, DESIGN_AUTHORITY §A5 (DG-A-10, `AdminKpi`): a LABEL may ellipsise when its whole
 *     text is in a `title` — the "…" is the disclosure. Such a box passes, and is NAMED in the tile's detail; an ellipsis
 *     with no title to read it whole fails;
 *   · THE STATE'S KEY TEXT — each exact sentence the state is about is on the page, and the one the tile is FOR is inside
 *     the screen (privacy §5 and §9 each brought into view, in all three languages);
 *   · NO OLD TEXT — the words the rulings took away: "stop link", "xxxxxxxx", "source line" and "footer" on the composer;
 *     "/s/", "18+", "Acha", "50pick.tz/" and "xxxxxxxx" in a test preview; Privacy v2026-10-07's stop sentences in en, sw
 *     and zh; "Stopped by their link" on the live page; "every message carries a stop link" on the wordings card; "an
 *     Excel file can be up to" in the importer (and, for GROWTH, "Another number" — the choice is not offered to it at all);
 *   · and per state: exact texts (the counter lines, the previews, the typed note, the 18+ label, the licence basis's
 *     suggestion), controls on or off, what must and must not be drawn, the results row's label, value and help, the
 *     contact table's columns and its "Added" dates, the importer's tiles.
 * `.qa-shots/s14-visual/manifest.json` (git-ignored, `.qa-shots/`) lists the setup steps and every tile — its file, width,
 * locale, role, every check with its detail, and pass/fail. The console prints one line per tile, and every failed check.
 *
 * THE SCREENS, THEIR STATES AND THEIR TILES (`<screen>-<state>-<width>[-<locale>].png`, six widths each):
 *   privacy  · s5, s9 — /legal/privacy as a visitor, in sw, en and zh (36 tiles): the version line "2026-10-09"; §5's
 *              marketing-record bullet without "the stop link it carried" and §9's last sentence without "You can stop them
 *              at any time with the link in every offer." — each sentence found inside its own numbered section, the tile
 *              centred on it.
 *   composer · blank · unicode · over-cap · test-own (GROWTH, one draft) — the counter "160 characters left · 1 message ·
 *              GSM-7" (nothing kept back) with "Sent exactly as written — nothing is added to it." under it and no
 *              `[data-counter-source]`; the ONE Unicode sentence "Unicode cuts this message to 70 characters — replace: ’
 *              (curly apostrophe)." with its counter line; the over-cap counter line; the saved draft's Test card offering
 *              "My own number" ALONE (no "Another number", no radio), its preview the officer's text exactly as written.
 *              typed-closed-admin · typed-closed-compliance — "Another number" offered and off, with licence outreach
 *              closed. typed-ready-admin · typed-ready-compliance — after the world is opened (the four policy lines,
 *              licence outreach, the adult.test wording — NO source line is saved: since the ruling it has no job, so a
 *              gate still asking for one shows here as "source line" and fails): the typed number field, the 18+ box in
 *              the saved words, the typed preview with the officer's own word for {jina}, the note "The name is your word
 *              for {jina}, never the person's own.", Send on. ⛔ NO TEST IS EVER SENT: Send is read, never pressed.
 *              stale-line (GROWTH, last) — a source line saved AFTER the draft (the typed seed's `?source=1`; skipped, and
 *              said, once the seed can save none): since the ruling the line is printed nowhere, so U37s's note ("This
 *              draft's source line isn't the one saved now…") is gone and Save stays quiet with nothing to save.
 *              Every Test card also reads its `data-test-typed-offered` — "no" for GROWTH, "yes" for the other two.
 *   wordings · card · licence (ADMIN, Admin → System → Marketing wordings) — the licence basis's suggestion "…if they ask
 *              us to stop, the stop is kept for good." (never "every message carries a stop link"); when the card no longer
 *              draws a source-line box (item B4 of the plain-SMS round, optional), "source line" may appear nowhere on it.
 *   live     · results-growth · results-admin — a staged DONE campaign's live page (no driver steps a finished campaign):
 *              the results row "Stopped since this campaign" (`data-results-row="stoppedSince"`) with its help, reading
 *              exactly the stop the seed made after its message; the price line for the money reader only.
 *   contacts · list · added (GROWTH) — the masked book: the two-tile KPI band, no Consent / Will receive / Source column,
 *              every "Added" a date (the table scrolled to it), and the u30 world's sign-up row (a player's number, its row
 *              by the ONE registration writer) reading "Added" TODAY — C8b · B8, never the account's sign-up day.
 *              search-in · search-out — a whole-number search answers a presence line ONLY ("This number is in the book."
 *              / "…is not in the book."), no row and no export link (C8b · B3), the line readable inside the table's
 *              sideways scroller. added-new — the contacts the list import added read "Added" today.
 *   import   · paste · paste-columns · paste-check — a pasted chat list (with C3b-fix D4's "Asha +254, 712 345 678",
 *              which must never stage a stranger's +255 number); title-columns — a hand-typed CSV whose bare title lines
 *              sit above its column names (D7, the unpadded shape); big-columns · big-check — a 40,000-row Excel
 *              workbook past the 700 KB upload cap, read IN THE BROWSER (C3c), checked, then discarded; list-check ·
 *              list-done — a GROWTH import onto a new list (C8b · B4): "Only the contacts this import adds join the list —
 *              numbers already in the book stay as they are." before the start, then two added, the one already in the
 *              book kept, the list's members owed their basis, and no reader's "with a 50pick account" line.
 *
 * ⭐ DECISIONS, AND THE GUARD THAT HOLDS EACH:
 *   · ONE PAGE PER STATE, RESIZED THROUGH THE SIX WIDTHS — the state is built once at 1280 and photographed at 320 → 1280,
 *     so every width shows the very same state (and a state that took a minute to reach — a 40,000-row upload — is not
 *     rebuilt six times). Before each tile the page settles: the fonts loaded, two frames, a pause.
 *   · REDUCED MOTION, and the screenshot's own `animations: "disabled"`: no tile is caught mid-entrance (the kit's motion
 *     clamp holds every transition at 0.01 ms). What a tile shows at rest is the same with motion on.
 *   · ONE SESSION PER ACCOUNT — a fresh officer per role and run (`seed-admin`, numbers unique per run): a second sign-in
 *     of one account ends the first (`session.ts`).
 *   · ENGLISH CONSOLE — `kp-locale=en` for every officer (the console is English-only); the privacy page in sw, en, zh by
 *     the same cookie, as a visitor.
 *   · HYDRATION FIRST — an interactive state is read only once React has claimed its element (`__reactFiber$`), and a
 *     dialog only once it holds focus.
 *   · COMPLIANCE HAS NO GROWTH GRANT BY DEFAULT (`roles.ts` DEFAULT_GRANTS), so it cannot open the composer at all. No
 *     dev-test route grants it, so the sweep gives it the way the Owner does — the ADMIN's own switch on /admin/roles
 *     ("Compliance can act on Growth & marketing") — and takes it back at the end.
 *   · PRIVACY FIRST — the typed world saves the policy lines, and a saved line restamps the page's version (2026-10-09.2):
 *     the privacy tiles are taken before, on a server where none was saved.
 *   · THE SEND WINDOW'S CLOCK PINNED AT NOON EAT for the whole run (the Test card says "Outside the send window" at
 *     night, and its saved line then invites no test), put back when the run ends.
 *   · ⛔ NO SMS: the drive presses no test's Send, starts no campaign (the live page shows a staged, already finished
 *     one), and refuses to run unless the composer's own sender line says the server's rail is the console stub.
 *   · ⛔ NEVER PRODUCTION: BASE must be a local address, and the dev-test routes must answer (production answers 404).
 *
 * Run (a FRESH in-memory dev server — every privacy tile reads the code's own version, and the typed world starts closed;
 * `rm -rf .next` first, a stale .next 404s every /api/dev-test route; localhost, never 127.0.0.1 for the browser):
 *   SMS_PROVIDER=console DISABLE_ADMIN_TOTP=true SESSION_SECRET=<32+ chars> OTP_PEPPER=<16+ chars> npx next dev -p 3104
 *     (no DATABASE_URL — the live seed writes recipient states into the in-memory store)
 *   BASE=http://localhost:3104 npm run qa:s14-visual-sweep
 * A partial run for a diagnosis: `SWEEP_ONLY=composer,import` (screens: privacy, composer, wordings, live, contacts,
 * import) and/or `SWEEP_WIDTHS=320,1280` — its summary says PARTIAL, so it can never be read as the sweep's pass.
 */
import { chromium, request } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.BASE || "http://localhost:3104";
const OUT = join(".qa-shots", "s14-visual");
const ALL_WIDTHS = [320, 360, 390, 768, 1024, 1280];
const HEIGHT = 800;
/** A route's first compile on `next dev` can take minutes. */
const NAV = 180_000;
const NL = String.fromCharCode(10);
const CRLF = String.fromCharCode(13, 10);

/* ── what this run covers ── */
const SCREENS = ["privacy", "composer", "wordings", "live", "contacts", "import"];
const ONLY = (process.env.SWEEP_ONLY ?? "").split(",").map((s) => s.trim()).filter(Boolean);
for (const s of ONLY) if (!SCREENS.includes(s)) throw new Error(`SWEEP_ONLY: no screen "${s}" (${SCREENS.join(", ")})`);
const WIDTHS_ASKED = (process.env.SWEEP_WIDTHS ?? "").split(",").map((s) => s.trim()).filter(Boolean).map(Number);
for (const w of WIDTHS_ASKED) if (!ALL_WIDTHS.includes(w)) throw new Error(`SWEEP_WIDTHS: no width "${w}" (${ALL_WIDTHS.join(", ")})`);
const WIDTHS = WIDTHS_ASKED.length > 0 ? ALL_WIDTHS.filter((w) => WIDTHS_ASKED.includes(w)) : ALL_WIDTHS;
const PARTIAL = ONLY.length > 0 || WIDTHS_ASKED.length > 0;
const runs = (screen) => ONLY.length === 0 || ONLY.includes(screen);

/* ── ⛔ never production: a local server only ── */
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);
const BASE_HOST = (() => {
  try { return new URL(BASE).hostname; } catch { return ""; }
})();
if (!LOCAL_HOSTS.has(BASE_HOST)) {
  console.error(`s14-visual-sweep: BASE must be a local dev server (localhost) — refusing "${BASE}".`);
  process.exit(1);
}

/* ── the run's own numbers: unique per run, so a re-run meets no earlier officer, number or list ── */
const RUN = String(Date.now() % 100000).padStart(5, "0");
const pad2 = (n) => String(n).padStart(2, "0");
/** The run's digits as letters — a list name or a contact name may not hold a run of digits. */
const LETTERS = [...RUN].map((d) => String.fromCharCode(97 + Number(d))).join("");
/** An officer's number: NDC 70, the run, a slot (13 characters, +255…). */
const officerPhone = (nn) => `+25570${RUN}${pad2(nn)}`;
/** A Tanzanian mobile number as typed: 0, an NDC no other seed uses for its own rows, the run, a slot — ten digits. */
const local = (ndc, k) => `0${ndc}${RUN}${pad2(k)}`;

/* ── characters a sentence carries, built from their codes ── */
const MID = String.fromCharCode(0xb7);
const DOT4 = String.fromCharCode(0x2022).repeat(4);
const RSQ = String.fromCharCode(0x2019);
const LDQ = String.fromCharCode(0x201c);
const RDQ = String.fromCharCode(0x201d);
const EN_DASH = String.fromCharCode(0x2013);
/** Whitespace runs (space, tab, LF, CR, no-break space), for reading a text the way the page shows it. */
const WS = new RegExp("[" + String.fromCharCode(32, 9, 10, 13, 160) + "]+", "g");
const squash = (s) => String(s ?? "").replace(WS, " ").trim();

/* ═══ THE WORDS EACH STATE MUST SHOW — the shipped copy, word for word (each file named) ═══════════════════════════ */

/** composer-copy.ts `COMPOSE_SENDER_STUB` — the drive's proof that no SMS can leave this server. */
const SENDER_STUB = "Sender: this server's SMS rail is the console stub — messages go to the server log, never to a phone. It can't be changed here.";
/** composer-copy.ts `COMPOSE_AS_WRITTEN` (the owner's ruling of 2026-10-09). */
const AS_WRITTEN = "Sent exactly as written — nothing is added to it.";
/** The whole message is the officer's to spend (160 GSM-7, 70 Unicode): nothing is appended, nothing kept back. */
const COUNTER_BLANK = `160 characters left ${MID} 1 message ${MID} GSM-7`;
const BODY_UNICODE = `50pick: Leo ni siku ya Simba${RSQ}s.`;
/** campaign-template.ts `unicodeProblem` — the field's ONE sentence; no footer named, no negative number. */
const UNICODE_SENTENCE = `Unicode cuts this message to 70 characters — replace: ${RSQ} (curly apostrophe).`;
const UNICODE_FORCED = `Forced to Unicode by: ${RSQ} (curly apostrophe)`;
const COUNTER_UNICODE = `${70 - BODY_UNICODE.length} characters left ${MID} 1 message ${MID} Unicode`;
/** 168 GSM-7 characters: 8 past the one message's 160 — two messages. */
const BODY_OVER = "50pick: " + "a".repeat(160);
const COUNTER_OVER = `${BODY_OVER.length - 160} over ${MID} 2 messages ${MID} the limit is 1`;
const BODY_JINA = "50pick: Habari {jina}, mechi kubwa leo.";
const FALLBACK_SW = "Rafiki";
/** The message as it is sent: the officer's text with {jina} filled — nothing before it, nothing after it. */
const sentAs = (word) => BODY_JINA.split("{jina}").join(word);
const TEST_LEGEND = "Send the test to";
const TEST_TO_TYPED = "Another number";
const ownLine = (phone) => `My own number — +255${DOT4}${phone.slice(-2)}`;
const PREVIEW_OWN_HEAD = "Swahili, as it will be sent to you";
const PREVIEW_TYPED_HEAD = "Swahili, as it will be sent to that number";
const TEST_BUDGET = "Up to 3 tests at once, then one every 10 minutes.";
/** campaign-test-send.ts `TEST_TYPED_OUTREACH_CLOSED`. */
const TYPED_CLOSED = "Tests to another number open once licence outreach is switched on (Admin → System → Licence outreach). Send yourself a test for now.";
/** composer-copy.ts `COMPOSE_TEST_TYPED_NOTE` since 2026-10-09 — it names no stop link. */
const TYPED_NOTE = "The name is your word for {jina}, never the person's own.";
/** marketing-wordings.ts `WORDING_DEFAULTS["adult.test"]` — the wording the typed-test seed saves (`?adult=1`). */
const ADULT_LABEL = "I confirm that the person who uses this number is 18 or older.";
const NUMBER_LABEL = "Number to test on";
const SAVED_RE = "^Draft saved [0-9]{2}:[0-9]{2} — nothing was sent[.] Send yourself a test below[.]$";
/** The nine digits typed into the typed-test field (+255 is the kit's): NDC 72, the run, a slot. Never sent to. */
const TYPED_DIGITS = `72${RUN}01`;
const COMPOSER_OLD = ["stop link", "source line", "xxxxxxxx", "footer"];
const PREVIEW_OLD = ["/s/", "18+", "Acha", "xxxxxxxx", "50pick.tz/"];
/** The instant the send window is judged at for the whole run: noon EAT, 7 October 2026 (the compose drive's own). */
const NOON_EAT = "2026-10-07T09:00:00.000Z";

/** Privacy v2026-10-09 (`src/app/legal/privacy/page.tsx`) — the new words, and the v2026-10-07 words the ruling removed. */
const PRIVACY = {
  sw: {
    title: "Sera ya Faragha",
    meta: `Toleo 2026-10-09 ${MID} Imeoanishwa na Tanzania Personal Data Protection Act 2022 na kanuni za EU GDPR.`,
    s5: "Kwa kila ujumbe tunahifadhi namba ya simu, maandishi ya ujumbe na kilichotokea kwa ujumbe huo.",
    s9: "Kama umetajwa kuwa mdhamini baada ya hapo: 50pick inaweza kukutumia ofa kwa SMS.",
    old: [
      "Unaweza kuzisimamisha wakati wowote kwa kiungo cha kusimamisha kilicho katika kila ofa.",
      `kiungo cha ${LDQ}Acha${RDQ}`,
      "kiungo cha kusimamisha",
    ],
  },
  en: {
    title: "Privacy Policy",
    meta: `Version 2026-10-09 ${MID} Aligned with the Tanzania Personal Data Protection Act 2022 and EU GDPR principles.`,
    s5: "For each message they hold the number it was sent to, the message and what happened to it.",
    s9: "If you are named as a referee after that: 50pick may send you offers by SMS.",
    old: ["You can stop them at any time with the link in every offer.", "the stop link it carried", "stop link"],
  },
  zh: {
    title: "隐私政策",
    meta: `版本 2026-10-09 ${MID} 符合 Tanzania Personal Data Protection Act 2022 及 EU GDPR 原则。`,
    s5: "我们为每条短信保存所发往的号码、短信内容和发送结果。",
    s9: "若您在此之后被提名为推荐人：50pick 可能会通过短信向您发送优惠。",
    old: ["您可随时通过每条优惠短信中的退订链接停止接收。", "以及短信中用于停止接收的链接", "退订链接"],
  },
};
// The sweep's order: sw (the platform's default), en, zh — every width of one language, then the next.
const PRIVACY_LOCALES = ["sw", "en", "zh"];

/** Admin → System → Marketing wordings (`marketing-wordings-form.tsx`; `consent-basis.ts` since 2026-10-09). */
const WORDINGS = {
  form: '[data-testid="marketing-wordings-form"]',
  licence: '[data-wording="basis.LICENCE_OUTREACH"]',
  source: '[data-wording="source.phrase"]',
  title: "Marketing wordings",
  lead: "The words that say why 50pick may message a person, and the 18+ confirmations staff tick.",
  licenceLabel: `Basis ${MID} Outreach under our licence`,
  licenceDefault: "50pick may send this person offers and news by SMS as outreach under its Gaming Board of Tanzania licence. The person has not agreed to receive them; if they ask us to stop, the stop is kept for good.",
};
/** No wording on the card may still promise a stop link in every message (the licence basis's suggestion did). ⭐ Item B4
 *  of the plain-SMS round ("the source line may leave the Marketing wordings card", only if it can be done cleanly) is
 *  read off the page: when the card draws no source-line box, "source line" may appear nowhere on it either. */
const WORDINGS_OLD = ["every message carries a stop link", "stop link"];

/** The live page's results card (`src/app/admin/campaigns/[id]/live-copy.ts`, the row renamed on 2026-10-09). */
const RESULTS_TITLE = "Results";
const STOPPED_SINCE = "Stopped since this campaign";
const STOPPED_SINCE_HELP = "People this campaign reached who have stopped offers since — on their profile, by asking us, or by a link from an older message. They will not be messaged again.";
/** The row's name in the data (`results-card.tsx`, renamed from stoppedByLink on 2026-10-09 — one name per thing). */
const STOPPED_SINCE_NAME = "stoppedSince";
const STOPPED_OLD = ["Stopped by their link", "opt-out link was used", "stop link"];

/** The contact book as a masked officer reads it (`contacts-copy.ts`, `page.tsx`; C8b · B3). */
const KPI_RECENT = "Added in the last 7 days";
const LISTS_TAGS = `Lists ${MID} Tags`;
const CONTACTS_SCROLL = '[data-block="contacts-card"] [role="region"][aria-label="Contacts"]';
const PRESENCE = {
  inBook: "This number is in the book.",
  notInBook: "This number is not in the book.",
  body: "For your role a whole number shows only whether it is in the book — the other filters don't apply to it. Search by name, or filter the list, to see contacts.",
  notInBookBody: "For your role a whole number shows only whether it is in the book. Add it with Add contact, or search by name to see contacts.",
};
/** The 45-row seed's first contact (`marketing-contacts-seed?count=45`, i = 0): 071 and "1000000". */
const IN_BOOK = "0711000000";
/** `marketing-contacts-seed?u30=1`'s PLAYER (003): an account with no name, its book row by the ONE registration writer. */
const SIGNUP_NUMBER = "0768000003";
/** A whole number no seed and no drive writes: NDC 72, the run, slot 99. */
const NOT_IN_BOOK = local("72", 99);
/** An "Added" date as `formatDate` writes it (en-GB, "9 Oct 2026" — and "1 Sept 2026": four letters for September). */
const DATE_RE = "^[0-9]{1,2} [A-Z][a-z]{2,3} [0-9]{4}$";
/** Today, as the platform's clock writes it (`formatDate`, the platform time zone — Africa/Dar_es_Salaam by default). */
const TODAY = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: process.env.PLATFORM_TIMEZONE || "Africa/Dar_es_Salaam" });

/** The import dialog (`src/app/admin/contacts/import/import-copy.ts`; C3c's limits line). */
const IMPORT = {
  pasteLabel: "Paste the contacts",
  pasteHint: "Copy cells from Excel or Google Sheets, or a list from a chat — one contact per line. The first phone number on each line is read.",
  limits: "No file-size limit for Excel, CSV or a phone's contacts file — up to 200,000 rows in one import.",
  mappingLead: "Check what each column will be read as. Change any that are wrong.",
  nothingWritten: "Nothing has been written to the book yet.",
  everyRow: " — every row of your file is counted once.",
  finished: "Import finished",
  /** DECIDE.keptOnly — a viewer who may not update the book keeps every number already in it (S15-10). */
  keptOnly: "Numbers already in the book are kept as they are.",
  /** LIST.createdOnly (C8b · B4) — said to a viewer who may not read numbers once a list is picked. */
  createdOnly: "Only the contacts this import adds join the list — numbers already in the book stay as they are.",
  /** LIST.owed */
  listOwed: "People added to a list are covered for offers only once its basis is recorded again on the Lists card, after the import.",
};
/** DONE.listOwed — the result's list line for a new list, whose basis is not recorded yet. */
const listOwedSentence = (name) => `Added to the list ${name}. The new members aren't covered for offers yet — record the list's basis and 18+ confirmation again on the Lists card.`;
const IMPORT_OLD = ["an Excel file can be up to", "this spreadsheet is", "700 KB"];
/** xlsx-limits.ts `XLSX_MAX_BYTES`: a workbook past it is read in the browser (C3c), never uploaded. */
const XLSX_MAX_BYTES = 700 * 1024;
const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const rowsRead = (n, from) => `${n.toLocaleString("en-US")} ${n === 1 ? "row" : "rows"} read from ${from}.`;
const sumTail = (n) => `= ${n.toLocaleString("en-US")} ${n === 1 ? "row" : "rows"}${IMPORT.everyRow}`;

/** A list pasted from a chat: three new numbers in three spellings, and C3b-fix D4's line — a bare nine-digit PART after
 *  a split ("+254, 712 345 678") is never a mobile, so it must be listed "can't be imported", never a stranger's +255. */
const PASTE_LINES = [
  `Asha Mwakalinga ${local("66", 1)}`,
  `Baraka Juma, +255 ${local("66", 2).slice(1)}`,
  `Neema Kileo: ${local("66", 3)}`,
  "Asha +254, 712 345 678",
];
const PASTE = PASTE_LINES.join(NL);
const D4_LINE = 4;

/** D7 · a hand-typed CSV whose bare title lines (no separator) sit above its column names — the UNPADDED shape. */
const TITLE_FILE = "s14-sweep-title.csv";
const TITLE_CSV = [
  "Contacts October",
  "Prepared by the marketing office",
  "Name,Phone,Email",
  `Asha Mwakalinga,${local("69", 1)},asha.title@example.com`,
  `Baraka Juma,${local("69", 2)},`,
  `Neema Kileo,${local("69", 3)},`,
].join(CRLF) + CRLF;
const TITLE_ROWS = 3;
/** title-rows.ts `titleRowsNote(1, 2)`. */
const TITLE_NOTE = `Rows 1${EN_DASH}2, above the column names, were not read — a title.`;

/** C3c · a workbook past the upload cap, as Excel writes one (exceljs: shared strings, deflate), its phones 12-digit
 *  NUMBERS (NDC 63, which no other seed uses) — none a multiple of a million, which Excel shows as 2.55713E+11. */
const BIG_FILE = "s14-sweep-big.xlsx";
const BIG_ROWS = 40_000;

/** C8b · B4 · a GROWTH import onto a NEW list: two new numbers and one the 45-row seed already holds. */
const LIST_FILE = "s14-sweep-list.csv";
const NEW_STEM = `Sweep ${LETTERS}`;
const LIST_NAME = `Sweep ${LETTERS} list`;
const LIST_CSV = [
  "Name,Phone",
  `${NEW_STEM} One,${local("77", 1)}`,
  `${NEW_STEM} Two,${local("77", 2)}`,
  `Asha Mwakalinga,${IN_BOOK}`,
].join(CRLF) + CRLF;

/* ═══ THE RECORD ═════════════════════════════════════════════════════════════════════════════════════════════════ */

mkdirSync(OUT, { recursive: true });
const manifest = {
  drive: "scripts/live/s14-visual-sweep.mjs",
  base: BASE,
  run: RUN,
  startedAt: new Date().toISOString(),
  finishedAt: null,
  partial: PARTIAL,
  only: ONLY,
  widths: WIDTHS,
  height: HEIGHT,
  setup: [],
  tiles: [],
  summary: null,
};
let setupFails = 0;
let tileFails = 0;
/** A setup step — the world each state needs — recorded, and counted when it fails. */
function setup(label, pass, detail = "") {
  manifest.setup.push({ label, pass: !!pass, detail: String(detail ?? "") });
  if (pass) console.log(`  ok   ${label}${detail ? ` (${String(detail).slice(0, 160)})` : ""}`);
  else {
    setupFails++;
    console.log(`  FAIL ${label}${detail ? " -- " + detail : ""}`);
  }
  return !!pass;
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const short = (e) => squash(String(e?.message ?? e)).slice(0, 300);
/** Run a step that builds a state: `{ ok, detail }`, never a throw. */
async function attempt(fn) {
  try {
    const d = await fn();
    return { ok: true, detail: typeof d === "string" ? d : "" };
  } catch (e) {
    return { ok: false, detail: short(e) };
  }
}

/* ═══ IN THE PAGE — the sweep's measuring kit, installed before any script of every document ═══════════════════════ */

/**
 * ⛔ SELF-CONTAINED: Playwright serialises this function into every document of the sweep's contexts, so it reads nothing
 * from this file. It installs `window.__s14` — `bring` (bring a sentence or an element into view) and `probe` (every
 * check of one tile) — and hides Next's dev indicator once the page has loaded (it is no part of a screen).
 */
function installSweepLib() {
  try { localStorage.setItem("50pick-primer-seen", "1"); } catch { /* storage may be refused */ }
  // Into <head>, a beat after load: React tolerates a foreign node there (extensions add them all the time).
  window.addEventListener("load", () => {
    setTimeout(() => {
      const style = document.createElement("style");
      style.textContent = "nextjs-portal{display:none !important}";
      (document.head || document.documentElement).appendChild(style);
    }, 0);
  }, { once: true });
  if (window.__s14) return;
  const WSC = new Set([32, 9, 10, 12, 13, 160, 8199, 8239]);
  const sq = (s) => {
    let out = "";
    let gap = false;
    for (const ch of String(s == null ? "" : s)) {
      if (WSC.has(ch.codePointAt(0))) { gap = true; continue; }
      if (gap && out !== "") out += " ";
      gap = false;
      out += ch;
    }
    return out;
  };
  const SKIP = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE", "TEXTAREA", "OPTION", "SELECT", "INPUT"]);
  const SVG = "http://www.w3.org/2000/svg";
  /** One measuring pass: computed styles, boxes and "is it visually hidden", each read once. */
  const lens = () => {
    const styles = new Map();
    const boxes = new Map();
    const hid = new Map();
    const cs = (el) => {
      let s = styles.get(el);
      if (s === undefined) { s = getComputedStyle(el); styles.set(el, s); }
      return s;
    };
    const box = (el) => {
      let r = boxes.get(el);
      if (r === undefined) { r = el.getBoundingClientRect(); boxes.set(el, r); }
      return r;
    };
    const own = (el) => {
      const s = cs(el);
      if (s.display === "none" || s.visibility === "hidden" || s.visibility === "collapse" || s.opacity === "0") return true;
      if (el.classList && el.classList.contains("sr-only")) return true;
      if ((s.position === "absolute" || s.position === "fixed") && s.clip && s.clip !== "auto") return true;
      const r = box(el);
      return (s.overflowX === "hidden" || s.overflowX === "clip") && r.width <= 1 && r.height <= 1;
    };
    const hidden = (el) => {
      for (let e = el; e && e.nodeType === 1; e = e.parentElement) {
        let h = hid.get(e);
        if (h === undefined) { h = own(e); hid.set(e, h); }
        if (h) return true;
      }
      return false;
    };
    return { cs, box, hidden };
  };
  /**
   * ⭐ THE TEXT A SCOPE SHOWS — its visible text nodes in order, each whitespace run read as one space — with where each
   * character came from. ⛔ The DOM's own words, never `innerText`: a field's label, an eyebrow or a table head is drawn in
   * capitals by CSS (`FieldLegend` is `uppercase`), and the words, not their case on screen, are what a check compares.
   */
  const shownText = (scope, L) => {
    const nodes = [];
    const map = [];
    let norm = "";
    let gap = true;
    const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT);
    for (let t = walker.nextNode(); t !== null; t = walker.nextNode()) {
      const pe = t.parentElement;
      if (pe === null || SKIP.has(pe.tagName) || L.hidden(pe)) continue;
      const v = t.nodeValue || "";
      const ni = nodes.length;
      nodes.push(t);
      for (let i = 0; i < v.length; i++) {
        if (WSC.has(v.charCodeAt(i))) {
          if (!gap) { norm += " "; map.push([ni, i]); gap = true; }
          continue;
        }
        norm += v[i];
        map.push([ni, i]);
        gap = false;
      }
    }
    if (norm.endsWith(" ")) { norm = norm.slice(0, -1); map.pop(); }
    return { norm, nodes, map };
  };
  /** The Range of a sentence as the page shows it, under `scope` — null when it is not shown there. */
  const findRange = (scope, sentence) => {
    const want = sq(sentence);
    if (want === "") return null;
    const { norm, nodes, map } = shownText(scope, lens());
    const at = norm.indexOf(want);
    if (at < 0) return null;
    const a = map[at];
    const b = map[at + want.length - 1];
    const r = document.createRange();
    r.setStart(nodes[a[0]], a[1]);
    r.setEnd(nodes[b[0]], b[1] + 1);
    return r;
  };
  /** The nearest ancestor that scrolls vertically and has something to scroll — the dialog's root, say — else null. */
  const scrollerOf = (node) => {
    for (let e = node.nodeType === 1 ? node : node.parentElement; e && e !== document.body && e !== document.documentElement; e = e.parentElement) {
      const s = getComputedStyle(e);
      if ((s.overflowY === "auto" || s.overflowY === "scroll") && e.scrollHeight > e.clientHeight + 1) return e;
    }
    return null;
  };
  /**
   * ⭐ BRING THE TILE'S SUBJECT INTO VIEW: `{ top }` the page's (and an open dialog's) top; `{ text }` a sentence, centred;
   * `{ sel, block }` an element — centred, or its top (below the console's top bar) when it is taller than the screen or
   * `block` says "start". `scrollX` then scrolls that horizontal region to its far end (a wide table's last column).
   */
  const bring = (v) => {
    const vh = window.innerHeight;
    const dialogRoot = document.querySelector('[role="dialog"][aria-modal="true"]');
    if (v.top) {
      window.scrollTo(0, 0);
      if (dialogRoot) dialogRoot.scrollTop = 0;
      return { found: true, where: "the top" };
    }
    let target = null;
    let rect = null;
    if (v.text) {
      const scope = document.querySelector(v.root) || document.body;
      const r = findRange(scope, v.text);
      if (r) { target = r.startContainer; rect = r.getBoundingClientRect(); }
    } else if (v.sel) {
      const el = document.querySelector(v.sel);
      if (el) { target = el; rect = el.getBoundingClientRect(); }
    }
    if (target === null || rect === null) return { found: false, why: `not on the page: ${v.text ? `"${v.text}"` : v.sel}` };
    const sc = scrollerOf(target);
    const frame = sc ? sc.getBoundingClientRect() : { top: 0, height: vh };
    const tall = rect.height > frame.height * 0.9;
    const delta = v.block === "start" || tall
      ? rect.top - frame.top - (sc ? 12 : 76)
      : rect.top + rect.height / 2 - (frame.top + frame.height / 2);
    if (sc) sc.scrollTop += delta;
    else window.scrollBy(0, delta);
    if (v.scrollX) {
      const x = document.querySelector(v.scrollX);
      if (x) x.scrollLeft = x.scrollWidth;
      else return { found: false, why: `no region to scroll sideways: ${v.scrollX}` };
    }
    return { found: true, where: v.text ? `"${String(v.text).slice(0, 60)}"` : v.sel };
  };
  /** A short, stable name for an element in a finding: its tag, id and first data attributes, and its block. */
  const describe = (el) => {
    const parts = [el.tagName.toLowerCase()];
    if (el.id) parts.push("#" + el.id);
    let n = 0;
    for (const at of Array.from(el.attributes)) {
      if (n >= 3) break;
      if (at.name.startsWith("data-") || at.name === "role" || at.name === "aria-label") {
        parts.push(at.value === "" ? `[${at.name}]` : `[${at.name}="${at.value.slice(0, 40)}"]`);
        n++;
      }
    }
    const blockEl = el.parentElement ? el.parentElement.closest("[data-block]") : null;
    return parts.join("") + (blockEl ? ` in [data-block="${blockEl.getAttribute("data-block")}"]` : "");
  };
  const snip = (s) => {
    const t = sq(s);
    return t.length > 70 ? t.slice(0, 67) + "..." : t;
  };
  const r1 = (x) => Math.round(x * 10) / 10;
  /** ⭐ EVERY CHECK OF ONE TILE (the header says what each one is and why). */
  const probe = (a) => {
    const L = lens();
    const de = document.documentElement;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const out = {
      root: false, page: { sw: de.scrollWidth, cw: de.clientWidth, iw: vw, ih: vh }, cards: [], text: [], allowed: [], missing: [], stale: [],
      previews: [], exact: [], absent: [], present: [], counts: [], offscreen: [], sections: [], rows: [], headers: null, dates: null,
      rowMatch: [],
    };
    for (const sel of a.cards || []) {
      const el = document.querySelector(sel);
      out.cards.push(el === null ? { sel, found: false } : { sel, found: true, sw: el.scrollWidth, cw: el.clientWidth });
    }
    const root = document.querySelector(a.root);
    if (root === null) return out;
    out.root = true;

    // 1 · every visible text node, held against each box it sits in
    const reported = new Set();
    /** ⭐ DESIGN_AUTHORITY §A5 (DG-A-10, `AdminKpi`'s label): a LABEL may ellipsise when its whole text is reachable in a
     *  `title` — the "…" is the disclosure. Allowed, and said in the tile's detail; an ellipsis with no title is a defect. */
    const ellipsisAllowed = (el) => {
      if (L.cs(el).textOverflow !== "ellipsis") return false;
      const full = sq(el.textContent);
      for (let e = el, up = 0; e !== null && up < 3; e = e.parentElement, up++) {
        const title = e.getAttribute("title");
        if (title !== null && sq(title).includes(full)) return true;
      }
      return false;
    };
    const flag = (e, finding) => {
      if (reported.has(e)) return;
      reported.add(e);
      if (ellipsisAllowed(e)) out.allowed.push({ ...finding, kind: "cut short with an ellipsis, its full text in a title, in" });
      else out.text.push(finding);
    };
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let budget = 15000;
    for (let t = walker.nextNode(); t !== null && budget > 0; t = walker.nextNode()) {
      const v = t.nodeValue || "";
      if (v.trim() === "") continue;
      const pe = t.parentElement;
      if (pe === null || SKIP.has(pe.tagName) || pe.namespaceURI === SVG || L.hidden(pe)) continue;
      budget--;
      const range = document.createRange();
      range.selectNodeContents(t);
      const rs = Array.from(range.getClientRects()).filter((r) => r.width > 0.5 && r.height > 0.5);
      if (rs.length === 0) continue;
      let left = Infinity;
      let right = -Infinity;
      let top = Infinity;
      let bottom = -Infinity;
      for (const r of rs) {
        left = Math.min(left, r.left);
        right = Math.max(right, r.right);
        top = Math.min(top, r.top);
        bottom = Math.max(bottom, r.bottom);
      }
      for (let e = pe; e !== null && e !== de; e = e.parentElement) {
        const s = L.cs(e);
        if (s.display === "inline" || s.display === "contents") continue;
        const scrollsX = s.overflowX === "auto" || s.overflowX === "scroll";
        const clipsX = s.overflowX === "hidden" || s.overflowX === "clip";
        const scrollsY = s.overflowY === "auto" || s.overflowY === "scroll";
        const clipsY = s.overflowY === "hidden" || s.overflowY === "clip";
        const b = L.box(e);
        const outX = Math.max(right - b.right, b.left - left);
        if (!scrollsX && outX > 1 && e.scrollWidth > e.clientWidth + 1) {
          flag(e, { kind: clipsX ? "clipped by" : "runs out of", box: describe(e), text: snip(v), px: r1(outX) });
          break;
        }
        if (clipsY && e.scrollHeight > e.clientHeight + 1) {
          const outY = Math.max(bottom - b.bottom, b.top - top);
          if (outY > 1) {
            flag(e, { kind: "cut off at the foot of", box: describe(e), text: snip(v), px: r1(outY) });
            break;
          }
        }
        if (scrollsX || scrollsY) break;
        if (s.position === "absolute" || s.position === "fixed") break;
      }
    }
    // …and a box an ellipsis cuts short, whatever its text's own range measures
    for (const el of Array.from(root.querySelectorAll("*"))) {
      const s = L.cs(el);
      if (s.textOverflow !== "ellipsis" || reported.has(el)) continue;
      if (L.hidden(el) || sq(el.textContent) === "") continue;
      if (el.scrollWidth > el.clientWidth + 1) {
        flag(el, { kind: "cut short with an ellipsis, with no title to read it whole, in", box: describe(el), text: snip(el.textContent), px: el.scrollWidth - el.clientWidth });
      }
    }

    // 2 · the words: the state's key text (as the page SHOWS it), and the old text it must not show anywhere — shown,
    //     read to a screen reader (`innerText` keeps `.sr-only` text), or (where asked) sitting in a box's value
    const shown = (el) => shownText(el, L).norm;
    const txt = shown(root);
    for (const s of a.want || []) if (!txt.includes(sq(s))) out.missing.push(s);
    const low = `${txt} ${sq(root.innerText)}`.toLowerCase();
    const values = a.values ? Array.from(root.querySelectorAll("textarea, input")).map((el) => el.value || "").join(" ").toLowerCase() : "";
    for (const s of a.old || []) {
      const k = s.toLowerCase();
      if (low.includes(k) || (values !== "" && values.includes(k))) out.stale.push(s);
    }
    if (a.previewOld) {
      for (const el of Array.from(root.querySelectorAll("[data-test-preview], [data-test-sent]"))) {
        const p = (el.textContent || "").toLowerCase();
        for (const s of a.previewOld) {
          if (p.includes(s.toLowerCase())) {
            const which = el.getAttribute("data-test-preview");
            out.previews.push({ where: which !== null ? `[data-test-preview="${which}"]` : "[data-test-sent]", marker: s, text: snip(el.textContent) });
          }
        }
      }
    }

    // 3 · exact texts, values, switches and attributes
    for (const x of a.exact || []) {
      const el = root.querySelector(x.sel) || document.querySelector(x.sel);
      if (el === null) { out.exact.push({ label: x.label, ok: false, got: `not on the page (${x.sel})` }); continue; }
      let ok = true;
      const got = [];
      if (x.eq !== undefined) {
        const t = shown(el);
        if (t !== sq(x.eq)) ok = false;
        got.push(`"${t.slice(0, 200)}"`);
      }
      if (x.re !== undefined) {
        const t = shown(el);
        if (!new RegExp(x.re).test(t)) ok = false;
        got.push(`"${t.slice(0, 200)}"`);
      }
      if (x.value !== undefined) {
        const val = typeof el.value === "string" ? el.value : null;
        if (val !== x.value) ok = false;
        got.push(`value "${String(val).slice(0, 200)}"`);
      }
      if (x.disabled !== undefined) {
        if (el.disabled !== x.disabled) ok = false;
        got.push(el.disabled ? "off" : "on");
      }
      if (x.attr !== undefined) {
        const val = el.getAttribute(x.attr[0]);
        if (val !== x.attr[1]) ok = false;
        got.push(`${x.attr[0]}="${val}"`);
      }
      out.exact.push({ label: x.label, ok, got: got.join(" · ") });
    }
    for (const sel of a.absent || []) if (root.querySelector(sel) !== null) out.absent.push(sel);
    for (const sel of a.present || []) if (root.querySelector(sel) === null) out.present.push(sel);
    for (const c of a.counts || []) {
      const n = root.querySelectorAll(c.sel).length;
      out.counts.push({ label: c.label, sel: c.sel, want: c.n, got: n, ok: n === c.n });
    }

    // 4 · the sentence the tile is FOR is inside the screen — and inside the visible part of every box that scrolls or
    //     clips around it (a table's sideways scroller, a dialog's root): "on the tile" means an officer can read it there
    for (const s of a.inView || []) {
      const r = findRange(root, s);
      if (r === null) { out.offscreen.push({ text: s, why: "not on the page" }); continue; }
      const b = r.getBoundingClientRect();
      const inside = b.width > 0 && b.top >= -1 && b.bottom <= vh + 1 && b.left >= -1 && b.right <= vw + 1;
      if (!inside) { out.offscreen.push({ text: s, why: `drawn at ${r1(b.left)}–${r1(b.right)} × ${r1(b.top)}–${r1(b.bottom)} of a ${vw}×${vh} screen` }); continue; }
      const start = r.startContainer.nodeType === 1 ? r.startContainer : r.startContainer.parentElement;
      for (let e = start; e !== null && e !== de; e = e.parentElement) {
        const st = L.cs(e);
        const x = st.overflowX !== "visible";
        const y = st.overflowY !== "visible";
        if (!x && !y) continue;
        const eb = L.box(e);
        const left = eb.left + e.clientLeft;
        const top = eb.top + e.clientTop;
        const cutX = x && (b.left < left - 1 || b.right > left + e.clientWidth + 1);
        const cutY = y && (b.top < top - 1 || b.bottom > top + e.clientHeight + 1);
        if (cutX || cutY) { out.offscreen.push({ text: s, why: `cut off by ${describe(e)} (its visible box ${r1(left)}–${r1(left + e.clientWidth)} × ${r1(top)}–${r1(top + e.clientHeight)})` }); break; }
      }
    }

    // 5 · per screen: a sentence in its own numbered section, a results row, a table's columns and dates
    for (const sct of a.sections || []) {
      const sec = Array.from(root.querySelectorAll("section")).find((s) => {
        const span = s.querySelector("h2 span");
        return span !== null && sq(span.textContent) === `${sct.n}.`;
      });
      out.sections.push({ n: sct.n, found: !!sec, ok: !!sec && shown(sec).includes(sq(sct.text)) });
    }
    for (const rw of a.rows || []) {
      const el = Array.from(root.querySelectorAll("[data-results-row]")).find((e) => {
        const lab = e.querySelector("[data-results-label]");
        return lab !== null && shown(lab) === rw.label;
      });
      if (!el) {
        const labels = Array.from(root.querySelectorAll("[data-results-row] [data-results-label]")).map((e) => `"${shown(e)}"`);
        out.rows.push({ label: rw.label, ok: false, got: `no such row — the rows read: ${labels.join(", ") || "none"}` });
        continue;
      }
      const valueEl = el.querySelector("[data-results-value]");
      const helpEl = el.querySelector("[data-results-help]");
      const value = valueEl ? shown(valueEl) : "";
      const help = helpEl ? shown(helpEl) : "";
      const name = el.getAttribute("data-results-row");
      const ok = (rw.value === undefined || value === rw.value) && (rw.help === undefined || help === sq(rw.help)) && (rw.name === undefined || name === rw.name);
      out.rows.push({ label: rw.label, ok, got: `value "${value}" · help "${help}" · data-results-row="${name}"` });
    }
    if (a.headers) {
      const ths = Array.from(root.querySelectorAll("thead th")).map((th) => shown(th));
      const has = (h) => ths.some((t) => t === h || t.startsWith(h + " "));
      out.headers = { ths, lack: a.headers.want.filter((h) => !has(h)), extra: (a.headers.absent || []).filter(has) };
    }
    if (a.dates) {
      const re = new RegExp(a.dates.re);
      const rows = Array.from(root.querySelectorAll(a.dates.rows));
      const cells = rows.map((tr) => {
        const c = tr.querySelector(a.dates.cell);
        return c ? shown(c) : "";
      });
      const bad = cells.filter((d) => !re.test(d));
      out.dates = { rows: rows.length, bad: bad.slice(0, 5), badCount: bad.length, sample: cells.slice(0, 3) };
    }
    // ONE row found by what its cells show (`where`), and the text of another of its cells
    for (const rm of a.rowMatch || []) {
      const hits = Array.from(root.querySelectorAll(rm.rows)).filter((tr) => rm.where.every((w) => {
        const c = tr.querySelector(w.cell);
        const t = c ? shown(c) : "";
        return w.eq !== undefined ? t === w.eq : t.startsWith(w.startsWith);
      }));
      if (hits.length !== 1) { out.rowMatch.push({ label: rm.label, ok: false, got: `${hits.length} rows match, want exactly 1` }); continue; }
      const c = hits[0].querySelector(rm.cell);
      const t = c ? shown(c) : "";
      out.rowMatch.push({ label: rm.label, ok: t === rm.eq, got: `"${t}"` });
    }
    return out;
  };
  window.__s14 = { sq, findRange, bring, probe };
}

/* ═══ THE BROWSER, THE SERVER AND THE PEOPLE ═══════════════════════════════════════════════════════════════════════ */

const browser = await chromium.launch();
const api = await request.newContext({ baseURL: BASE });

/** A dev-test call (POST, no session) — its JSON, or a throw that names the route and its answer. */
async function post(path) {
  const r = await api.post(path, { timeout: NAV });
  const body = await r.json().catch(() => null);
  if (!r.ok()) throw new Error(`${path.split("?")[0]} answered ${r.status()}${body && body.error ? `: ${body.error}` : ""}`);
  return body;
}

/** A browser context at 1280×800, reduced motion, the kit installed, every "leave this page?" answered yes. */
async function newCtx(locale) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: HEIGHT }, reducedMotion: "reduce" });
  await ctx.addCookies([{ name: "kp-locale", value: locale, url: BASE }]);
  await ctx.addInitScript(installSweepLib);
  const page = await ctx.newPage();
  page.setDefaultTimeout(60_000);
  page.on("dialog", (d) => { d.accept().catch(() => {}); });
  return { ctx, page };
}

/** ONE officer, ONE session: a fresh account of that role, signed in in its own context (`seed-admin`). */
async function staff(role, nn, name, tag) {
  const { ctx, page } = await newCtx("en");
  const phone = officerPhone(nn);
  const r = await page.request.post(`${BASE}/api/dev-test/seed-admin`, { data: { role, phone, name }, timeout: NAV });
  if (!r.ok()) throw new Error(`seed-admin ${role} answered ${r.status()}`);
  return { ctx, page, role, phone, name, first: name.split(" ")[0], tag };
}

/** The page at rest: its fonts loaded (they move every text box), two frames painted, then a pause. */
async function settle(page, ms = 350) {
  await page.evaluate(() => (document.fonts && document.fonts.ready ? document.fonts.ready.then(() => true) : true)).catch(() => {});
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(true))))).catch(() => {});
  await wait(ms);
}
/** React has claimed this element (hydrated): its fiber is on the node. */
const hydrated = (page, sel, timeout = 60_000) => page.waitForFunction((s) => {
  const el = document.querySelector(s);
  return !!el && Object.keys(el).some((k) => k.startsWith("__reactFiber$") || k.startsWith("__reactProps$"));
}, sel, { timeout }).then(() => true).catch(() => false);

const DIALOG = '[role="dialog"][aria-modal="true"]';
const PANEL = `${DIALOG} [data-rung="modal"]`;
const CONFIRM = '[role="alertdialog"][aria-modal="true"]';
/** ⛔ A dialog is read only once it holds focus — its entrance done and its first control (or heading) focused. */
const dialogHoldsFocus = (page, timeout = 30_000) => page.waitForFunction((d) => {
  const el = document.querySelector(d);
  return !!el && el.contains(document.activeElement);
}, DIALOG, { timeout }).then(() => true).catch(() => false);

/* ═══ THE TILES ══════════════════════════════════════════════════════════════════════════════════════════════════ */

/** What the in-page probe is handed for a state (plain data only: selectors, sentences, regex sources). */
const probeArgs = (spec) => ({
  root: spec.root, cards: spec.cards ?? [], want: spec.want ?? [], old: spec.old ?? [], values: spec.values === true,
  previewOld: spec.previewOld ?? null, exact: spec.exact ?? [], absent: spec.absent ?? [], present: spec.present ?? [],
  counts: spec.counts ?? [], inView: spec.inView ?? [], sections: spec.sections ?? [], rows: spec.rows ?? [],
  headers: spec.headers ?? null, dates: spec.dates ?? null, rowMatch: spec.rowMatch ?? [],
});

/** The probe's answer as the tile's checks — every one named, every one with what it measured. */
function judge(spec, p, probeError, reached, view, shotError) {
  const checks = [];
  const add = (name, pass, detail) => checks.push({ name, pass: !!pass, detail: String(detail ?? "") });
  add("the state was reached", reached.ok, reached.detail);
  add("the tile shows what it is for", view.found === true, view.found === true ? view.where ?? "" : view.why ?? "not found");
  add("the screenshot was written", shotError === "", shotError);
  if (p === null) {
    add("the page could be measured", false, probeError);
    return checks;
  }
  add(`the state's root is on the page (${spec.root})`, p.root, p.root ? "" : "not found");
  add("no sideways scroll of the page", p.page.sw <= p.page.cw, `document scrollWidth ${p.page.sw} · clientWidth ${p.page.cw} · window ${p.page.iw}`);
  for (const c of p.cards) add(`no sideways scroll inside ${c.sel}`, c.found && c.sw <= c.cw, c.found ? `scrollWidth ${c.sw} · clientWidth ${c.cw}` : "not on the page");
  const finding = (t) => `"${t.text}" ${t.kind} ${t.box} by ${t.px}px`;
  const allowed = p.allowed.length === 0 ? "" : ` · allowed by DESIGN_AUTHORITY §A5 (a label's ellipsis, its full text in a title): ${p.allowed.map(finding).join(" | ")}`;
  add("no text clipped or running out of its box", p.text.length === 0, (p.text.length === 0
    ? "every visible text node inside its boxes"
    : p.text.slice(0, 6).map(finding).join(" | ") + (p.text.length > 6 ? ` | and ${p.text.length - 6} more` : "")) + allowed);
  if ((spec.want ?? []).length > 0) add("the state's key text is on the page", p.missing.length === 0, p.missing.length === 0 ? `${spec.want.length} sentence(s) found` : `missing: ${p.missing.map((s) => `"${s}"`).join(" | ")}`);
  if ((spec.old ?? []).length > 0) add("no old text", p.stale.length === 0, p.stale.length === 0 ? `none of: ${spec.old.map((s) => `"${s}"`).join(", ")}` : `present: ${p.stale.map((s) => `"${s}"`).join(" | ")}`);
  if (spec.previewOld) add("no footer, token or link in a test preview", p.previews.length === 0, p.previews.length === 0 ? "every preview is the text alone" : p.previews.map((x) => `${x.where} holds "${x.marker}": "${x.text}"`).join(" | "));
  for (const x of p.exact) add(x.label, x.ok, x.got);
  if ((spec.absent ?? []).length > 0) add("nothing drawn that must not be", p.absent.length === 0, p.absent.length === 0 ? `none of: ${spec.absent.join(" · ")}` : `drawn: ${p.absent.join(" · ")}`);
  if ((spec.present ?? []).length > 0) add("everything drawn that must be", p.present.length === 0, p.present.length === 0 ? spec.present.join(" · ") : `not drawn: ${p.present.join(" · ")}`);
  for (const c of p.counts) add(c.label, c.ok, `${c.got} drawn (${c.sel}), want ${c.want}`);
  if ((spec.inView ?? []).length > 0) add("the sentence the tile is for is inside the screen", p.offscreen.length === 0, p.offscreen.length === 0 ? spec.inView.map((s) => `"${String(s).slice(0, 60)}"`).join(" · ") : p.offscreen.map((o) => `"${String(o.text).slice(0, 60)}" ${o.why}`).join(" | "));
  for (const s of p.sections) add(`§${s.n}'s sentence is in §${s.n}`, s.ok, s.found ? "" : `no section numbered ${s.n}`);
  for (const r of p.rows) add(`the results row "${r.label}"`, r.ok, r.got);
  if (p.headers) add("the table's columns are the masked view's", p.headers.lack.length === 0 && p.headers.extra.length === 0, `columns: ${p.headers.ths.join(" | ")}${p.headers.lack.length ? ` · missing ${p.headers.lack.join(", ")}` : ""}${p.headers.extra.length ? ` · must not show ${p.headers.extra.join(", ")}` : ""}`);
  if (p.dates) add(spec.dates.label, p.dates.rows > 0 && p.dates.badCount === 0, `${p.dates.rows} row(s) · e.g. ${p.dates.sample.map((d) => `"${d}"`).join(", ")}${p.dates.badCount ? ` · ${p.dates.badCount} not as wanted: ${p.dates.bad.map((d) => `"${d}"`).join(", ")}` : ""}`);
  for (const r of p.rowMatch) add(r.label, r.ok, r.got);
  return checks;
}

/**
 * ⭐ ONE STATE, EVERY WIDTH: the page resized to each width, the subject brought into view, every check run, the picture
 * taken — and the tile recorded with its checks. `reached` says whether the state was built at all: a state that was not
 * still gets its tiles (the picture shows what was there) and they fail on it.
 */
async function sweep(page, spec, reached = { ok: true, detail: "" }) {
  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: HEIGHT });
    await settle(page);
    const view = await page.evaluate((v) => (window.__s14 ? window.__s14.bring(v) : { found: false, why: "the sweep's kit is not installed in this page" }), { ...(spec.view ?? { top: true }), root: spec.root })
      .catch((e) => ({ found: false, why: short(e) }));
    await settle(page, 250);
    let p = null;
    let probeError = "";
    try {
      p = await page.evaluate((a) => window.__s14.probe(a), probeArgs(spec));
    } catch (e) {
      probeError = short(e);
    }
    const file = `${spec.screen}-${spec.state}-${width}${spec.locale ? `-${spec.locale}` : ""}.png`;
    let shotError = "";
    await page.screenshot({ path: join(OUT, file), animations: "disabled" }).catch((e) => { shotError = short(e); });
    const checks = judge(spec, p, probeError, reached, view, shotError);
    const pass = checks.every((c) => c.pass);
    manifest.tiles.push({ file, screen: spec.screen, state: spec.state, width, height: HEIGHT, locale: spec.locale ?? null, role: spec.role, pass, checks });
    if (pass) console.log(`  ok   ${file} (${checks.length} checks)`);
    else {
      tileFails++;
      console.log(`  FAIL ${file}`);
      for (const c of checks.filter((x) => !x.pass)) console.log(`         ${c.name} -- ${c.detail}`);
    }
  }
  await page.setViewportSize({ width: 1280, height: HEIGHT }).catch(() => {});
  await settle(page, 200);
}

/* ═══ 1 · PRIVACY v2026-10-09 — a visitor, in sw, en and zh ═════════════════════════════════════════════════════════ */

async function privacyScreen() {
  console.log(`${NL}[privacy] /legal/privacy — §5 and §9, in ${PRIVACY_LOCALES.join(", ")}`);
  const { ctx, page } = await newCtx("sw");
  try {
    for (const loc of PRIVACY_LOCALES) {
      const P = PRIVACY[loc];
      const reached = await attempt(async () => {
        await ctx.addCookies([{ name: "kp-locale", value: loc, url: BASE }]);
        await page.goto(`${BASE}/legal/privacy`, { waitUntil: "domcontentloaded", timeout: NAV });
        await page.waitForSelector("article h1", { timeout: NAV });
        await settle(page, 600);
        const title = squash(await page.locator("article h1").first().innerText());
        if (title !== P.title) throw new Error(`the page is not in ${loc}: its heading reads "${title}"`);
        return `the privacy notice in ${loc}`;
      });
      for (const [state, sentence] of [["s5", P.s5], ["s9", P.s9]]) {
        await sweep(page, {
          screen: "privacy", state, locale: loc, role: "visitor", root: "article", cards: ["article"],
          view: { text: sentence },
          want: [P.title, P.meta, P.s5, P.s9], old: P.old, inView: [sentence],
          sections: [{ n: "5", text: P.s5 }, { n: "9", text: P.s9 }],
        }, reached);
      }
    }
  } finally {
    await ctx.close().catch(() => {});
  }
}

/* ═══ 2 · THE COMPOSER — the counter, the Unicode sentence, the Test card (own; typed for ADMIN and COMPLIANCE) ══════ */

const C = {
  form: "[data-compose-form]",
  name: 'label[data-field="name"] input',
  bodySw: 'label[data-field="bodySw"] textarea',
  fallbackSw: 'label[data-field="nameFallbackSw"] input',
  save: "[data-compose-save]",
  saved: "[data-compose-saved]",
  message: '[data-block="compose-message"]',
  test: '[data-block="compose-test"]',
};
const COMPOSER = { screen: "composer", root: "main#main-content", cards: [C.message, C.test] };

async function openComposer(page, query = "") {
  await page.goto(`${BASE}/admin/campaigns/new${query}`, { waitUntil: "domcontentloaded", timeout: NAV });
  await page.waitForSelector(C.form, { timeout: NAV });
  if (!(await hydrated(page, C.form))) throw new Error("the composer never hydrated");
  await settle(page, 700);
}

/** Name, Swahili body with {jina} and its fallback word, then Save — and the Test card's preview fresh from the save. */
async function writeAndSave(page, name) {
  await page.locator(C.name).fill(name);
  await page.locator(C.bodySw).fill(BODY_JINA);
  await page.waitForSelector(C.fallbackSw, { timeout: 15_000 });
  await page.locator(C.fallbackSw).fill(FALLBACK_SW);
  await settle(page, 300);
  await page.locator(C.save).first().click();
  await page.waitForSelector(C.saved, { timeout: 90_000 });
  await page.waitForSelector('[data-test-card="ready"]', { timeout: 90_000 });
  await page.waitForSelector('[data-test-preview="SW"]', { timeout: 30_000 });
  await settle(page, 600);
  const id = new URL(page.url()).searchParams.get("draft");
  if (!id) throw new Error(`the saved draft is not in the address (${page.url()})`);
  return id;
}

const typedClosedSpec = (who) => ({
  ...COMPOSER, state: `typed-closed-${who.tag}`, role: who.role, view: { sel: C.test, block: "start" },
  want: [TEST_LEGEND, ownLine(who.phone), TEST_TO_TYPED, TYPED_CLOSED],
  old: COMPOSER_OLD, previewOld: PREVIEW_OLD, inView: [TYPED_CLOSED],
  exact: [
    { label: "the server offers this role a test to a typed number (`typedOffered`, its stored role)", sel: "[data-test-card]", attr: ["data-test-typed-offered", "yes"] },
    { label: "the officer's own number is offered", sel: '[data-test-choice="own"]', eq: ownLine(who.phone) },
    { label: '"Another number" is offered to this role, and off while licence outreach is closed', sel: '[data-test-choice="typed"] input', disabled: true },
    { label: '"Another number" says why it is off', sel: '[data-test-choice-why="typed"]', eq: TYPED_CLOSED },
    { label: "the preview is the officer's text, exactly as written", sel: '[data-test-preview="SW"]', eq: sentAs(who.first) },
  ],
  present: ["[data-test-to-choice]"],
});

const typedReadySpec = (who) => ({
  ...COMPOSER, state: `typed-ready-${who.tag}`, role: who.role, view: { sel: "[data-test-typed]", block: "start" },
  want: [TEST_LEGEND, TEST_TO_TYPED, NUMBER_LABEL, ADULT_LABEL, PREVIEW_TYPED_HEAD, TYPED_NOTE],
  old: COMPOSER_OLD, previewOld: PREVIEW_OLD, inView: [ADULT_LABEL],
  exact: [
    { label: "the server offers this role a test to a typed number (`typedOffered`, its stored role)", sel: "[data-test-card]", attr: ["data-test-typed-offered", "yes"] },
    { label: "the 18+ box reads the saved wording, word for word", sel: '[data-test-typed] label:has(input[type="checkbox"])', eq: ADULT_LABEL },
    { label: "the typed preview is the officer's text with their word for {jina} — nothing added", sel: '[data-test-preview="SW"]', eq: sentAs(FALLBACK_SW) },
    { label: "the note under it names no stop link", sel: "[data-test-typed-note]", eq: TYPED_NOTE },
    { label: "the card is ready for the typed number", sel: "[data-test-card]", attr: ["data-test-target", "typed"] },
    { label: "the Swahili test can be sent (read, never pressed: no SMS)", sel: '[data-test-send="SW"]', disabled: false },
  ],
  present: ["[data-test-to-choice]", '[data-test-recipient="typed"]'],
});

/** Reopen a saved draft, choose "Another number", type the number, tick the 18+ box — and send nothing. */
async function reachTypedReady(who, draftId) {
  const p = who.page;
  if (!draftId) throw new Error("no saved draft to open");
  await openComposer(p, `?draft=${encodeURIComponent(draftId)}`);
  await p.waitForSelector('[data-test-card="ready"]', { timeout: 60_000 });
  const typedIn = p.locator('[data-test-choice="typed"] input');
  if ((await typedIn.count()) === 0) throw new Error('"Another number" is not offered');
  if (await typedIn.first().isDisabled()) {
    const why = squash(await p.locator('[data-test-choice-why="typed"]').first().innerText().catch(() => ""));
    throw new Error(`"Another number" is still off: "${why}"`);
  }
  await p.locator('[data-test-choice="typed"]').first().click();
  await p.waitForSelector('[data-test-typed] [data-test-recipient="typed"]', { timeout: 15_000 });
  await p.locator('[data-test-recipient="typed"]').first().pressSequentially(TYPED_DIGITS, { delay: 15 });
  await settle(p, 300);
  await p.locator('[data-test-typed] label:has(input[type="checkbox"])').first().click();
  await p.waitForSelector('[data-test-card="ready"][data-test-target="typed"]', { timeout: 15_000 });
  await settle(p, 400);
  return `"Another number" chosen, a number typed, the 18+ box ticked (Send not pressed)`;
}

/** The Owner's own switch on /admin/roles: "Compliance can act on Growth & marketing" on, or "can view" off (both off). */
const ROLE_SWITCH = (verb) => `button[role="switch"][aria-label="Compliance can ${verb} Growth & marketing"]`;
async function setComplianceGrowth(page, on) {
  return attempt(async () => {
    await page.goto(`${BASE}/admin/roles`, { waitUntil: "domcontentloaded", timeout: NAV });
    await page.waitForSelector(ROLE_SWITCH("act on"), { timeout: NAV });
    if (!(await hydrated(page, ROLE_SWITCH("act on")))) throw new Error("the roles matrix never hydrated");
    await settle(page, 500);
    const target = on ? ROLE_SWITCH("act on") : ROLE_SWITCH("view");
    const want = on ? "true" : "false";
    if ((await page.locator(target).first().getAttribute("aria-checked")) !== want) {
      await Promise.all([
        page.waitForResponse((r) => r.request().method() === "POST" && !!r.request().headers()["next-action"], { timeout: 60_000 }),
        page.locator(target).first().click(),
      ]);
    }
    await settle(page, 800);
    await page.reload({ waitUntil: "domcontentloaded", timeout: NAV });
    await page.waitForSelector(ROLE_SWITCH("act on"), { timeout: NAV });
    const act = await page.locator(ROLE_SWITCH("act on")).first().getAttribute("aria-checked");
    const view = await page.locator(ROLE_SWITCH("view")).first().getAttribute("aria-checked");
    if (act !== want || view !== want) throw new Error(`after the save the switches read: see ${view}, do ${act}`);
    return `Compliance · Growth & marketing: see ${view}, do ${act}`;
  });
}

/** What the typed world's record says now (the seed route with no step writes nothing). */
const outreachNow = async () => (await post("/api/dev-test/marketing-typed-test-seed")).outreach;

async function composerScreen(people, world) {
  console.log(`${NL}[composer] /admin/campaigns/new — GROWTH, then ADMIN and COMPLIANCE`);
  const { growth, admin, compliance } = people;
  const g = growth.page;
  const drafts = {};

  // ── GROWTH: blank · unicode · over-cap · test-own (one page, one draft) ──
  let reached = await attempt(async () => {
    await openComposer(g);
    return "a new composer";
  });
  await sweep(g, {
    ...COMPOSER, state: "blank", role: growth.role, view: { sel: '[data-variant="SW"]' },
    want: [AS_WRITTEN], old: [...COMPOSER_OLD, TEST_TO_TYPED], inView: [AS_WRITTEN],
    exact: [
      { label: "the counter has the whole message to spend — nothing kept back", sel: '[data-counter="SW"] [data-counter-line]', eq: COUNTER_BLANK },
      { label: 'the counter says "Sent exactly as written — nothing is added to it."', sel: '[data-counter="SW"] [data-counter-as-written]', eq: AS_WRITTEN },
    ],
    absent: ["[data-counter-source]", "[data-compose-source-stale]"],
  }, reached);

  reached = await attempt(async () => {
    await g.locator(C.name).fill(`Derby ${LETTERS}`);
    await g.locator(C.bodySw).fill(BODY_UNICODE);
    await g.waitForSelector('[data-counter="SW"][data-counter-state="unicode"]', { timeout: 15_000 });
    await settle(g, 400);
    return "a Swahili body holding a curly apostrophe";
  });
  await sweep(g, {
    ...COMPOSER, state: "unicode", role: growth.role, view: { sel: '[data-variant="SW"]' },
    want: [UNICODE_SENTENCE, UNICODE_FORCED, AS_WRITTEN], old: [...COMPOSER_OLD, TEST_TO_TYPED, "Unicode leaves no room"], inView: [UNICODE_SENTENCE],
    exact: [
      { label: "the field says ONE sentence: what to replace, and the 70 characters Unicode leaves", sel: 'label[data-field="bodySw"] [id$="-error"]', eq: UNICODE_SENTENCE },
      { label: "the counter line prices the message in Unicode", sel: '[data-counter="SW"] [data-counter-line]', eq: COUNTER_UNICODE },
      { label: "the counter refuses Unicode", sel: '[data-counter="SW"]', attr: ["data-counter-state", "unicode"] },
    ],
    present: ['[data-counter="SW"] [data-counter-fold]', '[data-counter="SW"] [data-counter-as-written]'],
    absent: ["[data-counter-source]"],
  }, reached);

  reached = await attempt(async () => {
    await g.locator(C.bodySw).fill(BODY_OVER);
    await g.waitForSelector('[data-counter="SW"][data-counter-state="over"]', { timeout: 15_000 });
    await settle(g, 400);
    return "a body eight characters past one message";
  });
  await sweep(g, {
    ...COMPOSER, state: "over-cap", role: growth.role, view: { sel: '[data-variant="SW"]' },
    want: [AS_WRITTEN], old: [...COMPOSER_OLD, TEST_TO_TYPED], inView: [COUNTER_OVER],
    exact: [
      { label: "the counter line says how far over, in two messages, against the limit of one", sel: '[data-counter="SW"] [data-counter-line]', eq: COUNTER_OVER },
      { label: "the counter refuses the second message", sel: '[data-counter="SW"]', attr: ["data-counter-state", "over"] },
    ],
    absent: ["[data-counter-source]"],
  }, reached);

  reached = await attempt(async () => {
    drafts.growth = await writeAndSave(g, `Derby ${LETTERS} growth`);
    return `GROWTH's draft ${drafts.growth}, saved`;
  });
  await sweep(g, {
    ...COMPOSER, state: "test-own", role: growth.role, view: { sel: C.test, block: "start" },
    want: [TEST_LEGEND, ownLine(growth.phone), PREVIEW_OWN_HEAD, TEST_BUDGET],
    old: [...COMPOSER_OLD, TEST_TO_TYPED], previewOld: PREVIEW_OLD, inView: [ownLine(growth.phone), sentAs(growth.first)],
    exact: [
      { label: "the saved line says nothing was sent and invites the test below", sel: C.saved, re: SAVED_RE },
      { label: "the server offers GROWTH no test to a typed number (`typedOffered`, its stored role)", sel: "[data-test-card]", attr: ["data-test-typed-offered", "no"] },
      { label: "GROWTH is offered its own number ALONE", sel: '[data-test-choice="own"]', eq: ownLine(growth.phone) },
      { label: "the preview is the officer's text, exactly as written", sel: '[data-test-preview="SW"]', eq: sentAs(growth.first) },
      { label: "the Swahili test can be sent (read, never pressed: no SMS)", sel: '[data-test-send="SW"]', disabled: false },
    ],
    present: ['[data-test-to="own"]'],
    absent: ['[data-test-choice="typed"]', "[data-test-to-choice]", `${C.test} input[type="radio"]`, "[data-test-typed]", "[data-test-typed-note]"],
  }, reached);

  // ── the typed world CLOSED: ADMIN's and COMPLIANCE's drafts, "Another number" offered and off ──
  const before = await attempt(async () => {
    let state = await outreachNow();
    if (state === "open") {
      await post("/api/dev-test/marketing-typed-test-seed?open=0");
      state = await outreachNow();
    }
    if (state !== "closed") throw new Error(`licence outreach reads "${state}"`);
    return "licence outreach closed";
  });
  setup("the typed world starts CLOSED (licence outreach)", before.ok, before.detail);

  reached = await attempt(async () => {
    await openComposer(admin.page);
    drafts.admin = await writeAndSave(admin.page, `Derby ${LETTERS} owner`);
    return `ADMIN's draft ${drafts.admin}, saved`;
  });
  await sweep(admin.page, typedClosedSpec(admin), reached);

  const grant = await setComplianceGrowth(admin.page, true);
  world.complianceGranted = grant.ok;
  setup("COMPLIANCE given Growth & marketing (see and do) — the Owner's own switch on /admin/roles", grant.ok, grant.detail);
  reached = !grant.ok ? { ok: false, detail: `COMPLIANCE has no growth grant: ${grant.detail}` } : await attempt(async () => {
    await openComposer(compliance.page);
    drafts.compliance = await writeAndSave(compliance.page, `Derby ${LETTERS} compliance`);
    return `COMPLIANCE's draft ${drafts.compliance}, saved`;
  });
  await sweep(compliance.page, typedClosedSpec(compliance), reached);

  // ── the typed world OPENED through the platform's own writers — and NO source line saved ──
  const opened = await attempt(async () => {
    const r = await post("/api/dev-test/marketing-typed-test-seed?lines=1&open=1");
    if (r.outreach !== "open") throw new Error(`licence outreach reads "${r.outreach}": ${JSON.stringify(r).slice(0, 240)}`);
    world.outreachOpened = true;
    return "the four policy lines saved, licence outreach open";
  });
  setup("licence outreach OPENED (the four policy lines saved first, through the shipped writer)", opened.ok, opened.detail);
  const adult = await attempt(async () => {
    const r = await post("/api/dev-test/marketing-typed-test-seed?adult=1");
    if (!r.adult || r.adult.ok !== true) throw new Error(JSON.stringify(r).slice(0, 240));
    return "adult.test saved in its suggested words";
  });
  setup("the 18+ wording for a typed test saved (adult.test)", adult.ok, adult.detail);

  reached = await attempt(() => reachTypedReady(admin, drafts.admin));
  await sweep(admin.page, typedReadySpec(admin), reached);
  reached = !grant.ok ? { ok: false, detail: "COMPLIANCE has no growth grant" } : await attempt(() => reachTypedReady(compliance, drafts.compliance));
  await sweep(compliance.page, typedReadySpec(compliance), reached);

  // ── U37s · a source line saved AFTER a draft was. Since the ruling a stamped line is printed nowhere, so the draft is
  //    not "out of date": no note, Save quiet (nothing to save), the preview the officer's text alone. Before it, this was
  //    U37s's stale state — "This draft's source line isn't the one saved now…", Save offered with nothing typed. (Taken
  //    last on this screen: it saves a wording no state above may meet.) ──
  let saved = null;
  const later = await attempt(async () => {
    saved = await post("/api/dev-test/marketing-typed-test-seed?source=1");
    if (saved.source !== undefined && saved.source.ok !== true) throw new Error(JSON.stringify(saved).slice(0, 240));
    return saved.source === undefined ? "the typed-test seed saves no source line any more" : "the source line saved through the wordings writer";
  });
  if (later.ok && saved !== null && saved.source === undefined) {
    setup("U37s · no source line can be saved any more (the typed-test seed dropped ?source=1) — the stale state has nothing to compare, so it is not swept", true, later.detail);
  } else {
    setup("U37s · a source line saved AFTER GROWTH's draft (the typed-test seed's ?source=1)", later.ok, later.detail);
    reached = !later.ok ? later : await attempt(async () => {
      if (!drafts.growth) throw new Error("GROWTH has no saved draft to reopen");
      await openComposer(g, `?draft=${encodeURIComponent(drafts.growth)}`);
      await g.waitForSelector('[data-test-card="ready"]', { timeout: 60_000 });
      await settle(g, 400);
      return "GROWTH's draft, reopened after the line was saved";
    });
    await sweep(g, {
      ...COMPOSER, state: "stale-line", role: growth.role, view: { sel: C.save },
      want: [AS_WRITTEN], old: [...COMPOSER_OLD, TEST_TO_TYPED], previewOld: PREVIEW_OLD,
      exact: [
        { label: "U37s gone · nothing to save — a line saved since is no reason to save the draft again", sel: C.save, disabled: true },
        { label: "the preview is still the officer's text alone — the line is printed nowhere", sel: '[data-test-preview="SW"]', eq: sentAs(growth.first) },
      ],
      absent: ["[data-compose-source-stale]", "[data-counter-source]"],
    }, reached);
  }
}

/* ═══ 3 · ADMIN → SYSTEM → MARKETING WORDINGS ═══════════════════════════════════════════════════════════════════════ */

async function wordingsScreen(admin) {
  console.log(`${NL}[wordings] /admin/system?tab=wordings — ADMIN`);
  const a = admin.page;
  const reached = await attempt(async () => {
    await a.goto(`${BASE}/admin/system?tab=wordings`, { waitUntil: "domcontentloaded", timeout: NAV });
    await a.waitForSelector(WORDINGS.form, { timeout: NAV });
    if (!(await hydrated(a, WORDINGS.form))) throw new Error("the wordings card never hydrated");
    await settle(a, 600);
    return "the Marketing wordings card";
  });
  const sourceBox = reached.ok ? await a.locator(WORDINGS.source).count() : 1;
  setup(sourceBox === 0
    ? 'the source line has LEFT the Marketing wordings card (B4) — so the card may say "source line" nowhere'
    : `the source line's box is still on the Marketing wordings card (B4, "if it can be done cleanly", has not landed — allowed)`, true);
  const base = {
    screen: "wordings", role: admin.role, root: "main#main-content", cards: [WORDINGS.form], values: true,
    want: [WORDINGS.title, WORDINGS.lead, WORDINGS.licenceLabel], old: sourceBox === 0 ? [...WORDINGS_OLD, "source line"] : WORDINGS_OLD,
    exact: [{ label: "the licence basis suggests how a stop is honoured — no stop link in any message", sel: `${WORDINGS.licence} textarea`, value: WORDINGS.licenceDefault }],
  };
  await sweep(a, { ...base, state: "card", view: { sel: WORDINGS.form, block: "start" } }, reached);
  await sweep(a, { ...base, state: "licence", view: { sel: WORDINGS.licence }, inView: [WORDINGS.licenceLabel] }, reached);
}

/* ═══ 4 · THE LIVE CAMPAIGN PAGE — the results row "Stopped since this campaign" ═════════════════════════════════ */

async function openLive(page, id) {
  await page.goto(`${BASE}/admin/campaigns/${encodeURIComponent(id)}`, { waitUntil: "domcontentloaded", timeout: NAV });
  await page.waitForSelector("[data-live-status]", { timeout: NAV });
  await page.waitForSelector('[data-block="live-results"]', { timeout: 60_000 });
  // The trail names the campaign from the client once hydrated (U47b-2's lesson) — read the page after that.
  await page.waitForFunction(() => {
    const c = document.querySelector('nav[aria-label="Breadcrumb"] > span:last-child > span:last-child');
    return !!c && c.textContent.trim() !== "Campaign";
  }, undefined, { timeout: 30_000 }).catch(() => {});
  await hydrated(page, "[data-live-status]");
  await settle(page, 700);
}

async function liveScreen(people) {
  console.log(`${NL}[live] /admin/campaigns/<id> — a finished campaign's results, GROWTH and ADMIN`);
  let done = null;
  let stopped = null;
  // ⚖️ ONE stop: the seed stops person k the (k mod 3)-th way — a link from an older message, the profile switch, an
  // officer's stop — and a staged campaign's people have no account and no book row, so only the link can land on them.
  // The row must then read exactly what landed.
  const built = await attempt(async () => {
    const st = await post(`/api/dev-test/marketing-live-seed?stages=sw${RUN}`);
    done = (st.stages ?? []).find((s) => s.key === "done") ?? null;
    if (!done) throw new Error(`no staged DONE campaign: ${JSON.stringify(st).slice(0, 200)}`);
    const s = await post(`/api/dev-test/marketing-live-seed?stop=${encodeURIComponent(done.id)}&n=1`);
    stopped = typeof s.stopped === "number" ? s.stopped : null;
    if (stopped !== 1) throw new Error(`the stop after the message: ${JSON.stringify(s)}`);
    return `the staged DONE campaign of ${done.people}; one person it reached stopped since, by a link from an older message (the opt-out page's own path)`;
  });
  setup("the live page's world: the staged campaigns, and a stop made after the DONE campaign's message", built.ok, built.detail);
  for (const who of [people.growth, people.admin]) {
    const reached = !built.ok ? built : await attempt(async () => {
      await openLive(who.page, done.id);
      return `the DONE campaign's live page as ${who.role}`;
    });
    await sweep(who.page, {
      screen: "live", state: `results-${who.tag}`, role: who.role, root: "main#main-content",
      cards: ['[data-block="live-status"]', '[data-block="live-controls"]', '[data-block="live-progress"]', '[data-block="live-results"]'],
      view: { text: STOPPED_SINCE },
      want: [RESULTS_TITLE, STOPPED_SINCE, STOPPED_SINCE_HELP], old: STOPPED_OLD, inView: [STOPPED_SINCE],
      rows: [{ label: STOPPED_SINCE, name: STOPPED_SINCE_NAME, value: stopped === null ? undefined : String(stopped), help: STOPPED_SINCE_HELP }],
      present: ['[data-live-status="DONE"]', "[data-results]", ...(who.role === "ADMIN" ? ["[data-results-spend]"] : [])],
      absent: who.role === "ADMIN" ? [] : ["[data-results-spend]"],
    }, reached);
  }
}

/* ═══ 5 · THE CONTACT BOOK FOR A MASKED OFFICER (GROWTH) ═════════════════════════════════════════════════════════ */

async function openContacts(page, query = "") {
  await page.goto(`${BASE}/admin/contacts${query}`, { waitUntil: "domcontentloaded", timeout: NAV });
  await page.waitForSelector('[data-block="contacts-card"]', { timeout: NAV });
  if (!(await hydrated(page, '[data-block="contacts-import"]'))) throw new Error("the contacts page never hydrated");
  await settle(page, 700);
}
const CONTACTS = {
  screen: "contacts", root: "main#main-content", cards: ['[data-block="contacts-kpis"]', '[data-block="contacts-card"]'],
};
const MASKED_COLUMNS = { want: ["Name", "Number", "Operator (by prefix)", LISTS_TAGS, "Added"], absent: ["Consent", "Will receive", "Source"] };

async function contactsScreen(growth) {
  console.log(`${NL}[contacts] /admin/contacts — GROWTH (masked)`);
  const p = growth.page;
  const seeded = await attempt(async () => {
    const r = await post("/api/dev-test/marketing-contacts-seed?count=45");
    const u30 = await post("/api/dev-test/marketing-contacts-seed?u30=1");
    if (u30.player !== SIGNUP_NUMBER) throw new Error(`the u30 world's player is not ${SIGNUP_NUMBER}: ${JSON.stringify(u30).slice(0, 200)}`);
    return `the book holds ${r.total} contacts, and the u30 world (a player's sign-up row by the one registration writer)`;
  });
  setup("the contact book seeded (45 contacts by the shipped create builder; a sign-up row by the registration writer)", seeded.ok, seeded.detail);

  let reached = await attempt(async () => {
    await openContacts(p);
    return "the book";
  });
  await sweep(p, {
    ...CONTACTS, state: "list", role: growth.role, view: { top: true },
    want: ["In the book", KPI_RECENT], present: ["[data-kpis-masked]", "[data-contact-row]"], headers: MASKED_COLUMNS,
  }, reached);
  await sweep(p, {
    ...CONTACTS, state: "added", role: growth.role,
    view: { sel: '[data-block="contacts-card"]', block: "start", scrollX: CONTACTS_SCROLL },
    present: ["[data-contact-row]"], headers: MASKED_COLUMNS,
    dates: { label: `every row's "Added" is a date`, rows: "[data-contact-row]", cell: "td:last-child", re: DATE_RE },
    // ⭐ C8b · B8 · the player's row the registration writer made reads "Added" TODAY — the moment it entered the book —
    // never the account's sign-up date (28 Sep 2026 in the u30 world). It is the one "No name" row ending 03.
    rowMatch: [{
      label: `B8 · the sign-up row reads "Added" today (${TODAY}), the moment it entered the book — not the account's sign-up day`,
      rows: "[data-contact-row]",
      where: [{ cell: "td:nth-child(2)", startsWith: "No name" }, { cell: "td:nth-child(3)", eq: `+255${DOT4}${SIGNUP_NUMBER.slice(-2)}` }],
      cell: "td:last-child", eq: TODAY,
    }],
  }, reached);

  // C8b · B3 · a whole number answers ONE thing — in the book or not — and draws no row
  reached = await attempt(async () => {
    await openContacts(p, `?q=${IN_BOOK}`);
    return "a whole-number search for a number in the book";
  });
  await sweep(p, {
    ...CONTACTS, state: "search-in", role: growth.role, view: { text: PRESENCE.inBook },
    want: [PRESENCE.inBook, PRESENCE.body], old: [PRESENCE.notInBook], inView: [PRESENCE.inBook, PRESENCE.body],
    counts: [{ label: "no row is drawn for a whole number — a presence line only", sel: "[data-contact-row]", n: 0 }],
    absent: ['[data-block="contacts-export"]'],
  }, reached);
  reached = await attempt(async () => {
    await openContacts(p, `?q=${NOT_IN_BOOK}`);
    return "a whole-number search for a number not in the book";
  });
  await sweep(p, {
    ...CONTACTS, state: "search-out", role: growth.role, view: { text: PRESENCE.notInBook },
    want: [PRESENCE.notInBook, PRESENCE.notInBookBody], old: [PRESENCE.inBook], inView: [PRESENCE.notInBook, PRESENCE.notInBookBody],
    counts: [{ label: "no row is drawn for a whole number — a presence line only", sel: "[data-contact-row]", n: 0 }],
    absent: ['[data-block="contacts-export"]'],
  }, reached);
}

/* ═══ 6 · THE IMPORT DIALOG — a pasted list, a title-row CSV, a big workbook read in the browser, a list ═══════════ */

/** An unfinished run left by an earlier state: discarded (before its start) or its rest cancelled (the import drive's). */
async function clearLeftover(page) {
  for (let i = 0; i < 3 && (await page.locator('[data-block="import-adopt"]').count()) > 0; i++) {
    const act = (await page.locator('[data-block="import-adopt"] [data-import-act="discard"]').count()) > 0 ? "discard" : "cancel-rest";
    await page.locator(`[data-block="import-adopt"] [data-import-act="${act}"]`).first().click();
    await page.waitForSelector(CONFIRM, { timeout: 15_000 });
    await page.locator(`${CONFIRM} button[type="submit"]`).first().click();
    await page.waitForSelector('[data-block="import-entrance"], [data-block="import-done"]', { timeout: 60_000 });
    if ((await page.locator('[data-block="import-done"]').count()) > 0) {
      await closeDialog(page);
      await page.locator('[data-block="contacts-import"]').first().click();
      await page.waitForSelector('[data-block="import-entrance"], [data-block="import-adopt"]', { timeout: 60_000 });
    }
  }
}
async function openImport(page) {
  await page.locator('[data-block="contacts-import"]').first().click();
  await page.waitForSelector('[data-block="import-entrance"], [data-block="import-adopt"]', { timeout: 60_000 });
  await clearLeftover(page);
  await page.waitForSelector('[data-block="import-entrance"]', { timeout: 30_000 });
  if (!(await dialogHoldsFocus(page))) throw new Error("the import dialog never took focus");
  await settle(page, 400);
}
async function closeDialog(page) {
  for (let i = 0; i < 3 && (await page.locator(DIALOG).count()) > 0; i++) {
    await page.keyboard.press("Escape").catch(() => {});
    await page.waitForSelector(DIALOG, { state: "detached", timeout: 5_000 }).catch(() => {});
    if ((await page.locator(DIALOG).count()) > 0) await page.locator(`${DIALOG} [data-import-act="close"]`).first().click({ timeout: 3_000 }).catch(() => {});
  }
}
/** Discard the run under check (its staged rows deleted; the book unchanged) — back to the entrance. */
async function discardCheck(page) {
  await page.locator('[data-block="import-decision"] [data-import-act="discard"]').first().click();
  await page.waitForSelector(CONFIRM, { timeout: 15_000 });
  await page.locator(`${CONFIRM} button[type="submit"]`).first().click();
  await page.waitForSelector('[data-block="import-entrance"]', { timeout: 120_000 });
}
/** Choose a file (bytes in memory) and wait for the columns — or say the entrance's refusal. */
async function feedFile(page, name, mimeType, buffer, timeout) {
  await page.setInputFiles('input[data-block="import-file"]', { name, mimeType, buffer });
  await page.waitForSelector('[data-block="import-mapping"], [data-block="import-entrance"] [data-import-alert]', { timeout });
  if ((await page.locator('[data-block="import-mapping"]').count()) === 0) {
    const said = squash(await page.locator('[data-block="import-entrance"] [data-import-alert]').first().innerText().catch(() => ""));
    throw new Error(`refused at the entrance: "${said}"`);
  }
  await dialogHoldsFocus(page);
  await settle(page, 500);
}
/** Next on the columns, then the upload and the check — until the start button is on screen. */
async function toCheck(page, timeout) {
  await page.locator('[data-block="import-mapping-next"]').first().click();
  await page.waitForSelector('[data-block="import-apply"]', { timeout });
  await dialogHoldsFocus(page);
  await settle(page, 600);
}

/** C3c · the workbook, as Excel writes one — 40,000 rows past the 700 KB cap (grown if this exceljs packs tighter). */
async function bigWorkbook() {
  const ExcelJS = (await import("exceljs")).default;
  const FIRST = ["Asha", "Baraka", "Neema", "Juma", "Rehema", "Daudi", "Zawadi", "Faraja", "Halima", "Said", "Mwanaidi", "Omari"];
  const LAST = ["Mwakalinga", "Hassan", "Kileo", "Mrisho", "Ally", "Mushi", "Kweka", "Said", "Mbwana", "Shirima", "Lyimo", "Massawe", "Ngowi"];
  for (let rows = BIG_ROWS; rows <= BIG_ROWS * 4; rows *= 2) {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Contacts");
    ws.addRow(["Name", "Phone", "Email"]);
    for (let i = 0; i < rows; i++) {
      const f = FIRST[i % FIRST.length];
      const l = LAST[Math.floor(i / FIRST.length) % LAST.length];
      ws.addRow([`${f} ${l}`, 255630100001 + i, `${f.toLowerCase()}.${l.toLowerCase()}${i}@example.com`]);
    }
    const buffer = Buffer.from(await wb.xlsx.writeBuffer());
    if (buffer.length > XLSX_MAX_BYTES) return { rows, buffer };
  }
  throw new Error("no workbook of up to four times the rows passed the upload cap");
}

async function importScreen(growth) {
  console.log(`${NL}[import] the import dialog — GROWTH`);
  const p = growth.page;
  const DIALOG_STATE = { screen: "import", role: growth.role, root: PANEL, cards: [PANEL, DIALOG] };
  // The book the list import meets (idempotent — the contacts screen may have seeded it already): its first contact is
  // the number the list file holds as "already in the book".
  const seeded = await attempt(async () => {
    const r = await post("/api/dev-test/marketing-contacts-seed?count=45");
    return `the book holds ${r.total} contacts`;
  });
  setup("the import's world: the 45-contact book (one of its numbers is in the list file)", seeded.ok, seeded.detail);

  // ── a pasted chat list: the paste box, its columns, its check (then discarded) ──
  let reached = await attempt(async () => {
    await openContacts(p);
    await openImport(p);
    await p.locator('[data-import-act="toggle-paste"]').first().click();
    await p.waitForSelector("[data-import-paste-box]", { timeout: 15_000 });
    await p.locator("[data-import-paste-box]").first().fill(PASTE);
    await settle(p, 300);
    return "the paste box, filled";
  });
  await sweep(p, {
    ...DIALOG_STATE, state: "paste", view: { sel: "[data-import-paste]", block: "start" },
    want: [IMPORT.pasteLabel, IMPORT.pasteHint, IMPORT.limits], old: IMPORT_OLD, inView: [IMPORT.pasteLabel],
    exact: [{ label: "the pasted text can be read", sel: '[data-import-act="read-paste"]', disabled: false }],
  }, reached);

  reached = await attempt(async () => {
    await p.locator('[data-import-act="read-paste"]').first().click();
    await p.waitForSelector('[data-block="import-mapping"]', { timeout: 120_000 });
    await dialogHoldsFocus(p);
    await settle(p, 500);
    return "the pasted list's columns";
  });
  await sweep(p, {
    ...DIALOG_STATE, state: "paste-columns", view: { sel: "[data-import-summary]" },
    want: [IMPORT.mappingLead, rowsRead(PASTE_LINES.length, "the pasted text")], old: IMPORT_OLD, inView: [rowsRead(PASTE_LINES.length, "the pasted text")],
    present: ['[data-import-columns] tr[data-read-as="phone"]'],
  }, reached);

  reached = await attempt(async () => {
    await toCheck(p, 300_000);
    return "the pasted list's check";
  });
  await sweep(p, {
    ...DIALOG_STATE, state: "paste-check", view: { sel: '[data-block="import-preflight"]', block: "start" },
    want: [IMPORT.nothingWritten, sumTail(PASTE_LINES.length)], old: IMPORT_OLD,
    exact: [
      { label: "the three whole numbers are new to the book", sel: '[data-block="import-preflight"] [data-import-tile="new"]', attr: ["data-value", "3"] },
      { label: "D4 · the bare nine-digit part after a split is not a mobile — one row can't be imported", sel: '[data-block="import-preflight"] [data-import-tile="invalid"]', attr: ["data-value", "1"] },
    ],
    present: [`[data-block="import-preflight"] [data-import-list="invalid"] [data-import-row="${D4_LINE}"]`],
  }, reached);
  const pasteDiscard = await attempt(async () => {
    await discardCheck(p);
    return "the pasted list discarded — nothing written";
  });
  setup("the pasted list's check discarded (the book unchanged)", pasteDiscard.ok, pasteDiscard.detail);

  // ── D7 · a hand-typed CSV with bare title lines above its column names ──
  reached = await attempt(async () => {
    await closeDialog(p);
    await openImport(p);
    await feedFile(p, TITLE_FILE, "text/csv", Buffer.from(TITLE_CSV, "utf8"), 120_000);
    return "the title-row CSV's columns";
  });
  await sweep(p, {
    ...DIALOG_STATE, state: "title-columns", view: { sel: "[data-import-notes]" },
    want: [rowsRead(TITLE_ROWS, TITLE_FILE), TITLE_NOTE], old: IMPORT_OLD, inView: [TITLE_NOTE],
    present: ['[data-import-columns] tr[data-read-as="phone"]'],
    exact: [{ label: "Next is on — the phone column was found under the title", sel: '[data-block="import-mapping-next"]', disabled: false }],
  }, reached);

  // ── C3c · a workbook past the 700 KB upload cap, read in the browser — its columns, its check (then discarded) ──
  let big = null;
  const built = await attempt(async () => {
    big = await bigWorkbook();
    return `${big.rows.toLocaleString("en-US")} rows, ${big.buffer.length.toLocaleString("en-US")} bytes`;
  });
  setup(`a workbook past the ${XLSX_MAX_BYTES.toLocaleString("en-US")}-byte upload cap, written by exceljs as Excel writes one`, built.ok && big !== null && big.buffer.length > XLSX_MAX_BYTES, built.detail);
  const bigRows = big === null ? BIG_ROWS : big.rows;
  reached = big === null ? { ok: false, detail: "no big workbook was built" } : await attempt(async () => {
    await closeDialog(p);
    await openImport(p);
    await feedFile(p, BIG_FILE, XLSX_MIME, big.buffer, 600_000);
    return "the big workbook's columns, read in the browser";
  });
  await sweep(p, {
    ...DIALOG_STATE, state: "big-columns", view: { sel: "[data-import-summary]" },
    want: [rowsRead(bigRows, BIG_FILE)], old: IMPORT_OLD, inView: [rowsRead(bigRows, BIG_FILE)],
    present: ['[data-import-columns] tr[data-read-as="phone"]'],
    exact: [{ label: "Next is on — every row is ready to upload", sel: '[data-block="import-mapping-next"]', disabled: false }],
  }, reached);
  reached = !reached.ok ? reached : await attempt(async () => {
    await toCheck(p, 900_000);
    return "the big workbook's check";
  });
  await sweep(p, {
    ...DIALOG_STATE, state: "big-check", view: { sel: '[data-block="import-preflight"]', block: "start" },
    want: [IMPORT.nothingWritten, sumTail(bigRows)], old: IMPORT_OLD,
  }, reached);
  if (reached.ok) {
    const bigDiscard = await attempt(async () => {
      await discardCheck(p);
      return "the big workbook discarded — nothing written";
    });
    setup("the big workbook's check discarded (the book unchanged)", bigDiscard.ok, bigDiscard.detail);
  }

  // ── C8b · B4 · a GROWTH import onto a new list: two new numbers, one already in the book — the check with the list
  //    named (only the contacts it ADDS join the list, said to this viewer), then the result ──
  reached = await attempt(async () => {
    await closeDialog(p);
    await openImport(p);
    await feedFile(p, LIST_FILE, "text/csv", Buffer.from(LIST_CSV, "utf8"), 120_000);
    await toCheck(p, 300_000);
    await p.waitForSelector('[data-import-list-option="new"]', { timeout: 60_000 });
    await p.locator('[data-import-list-option="new"]').first().click();
    await p.locator('[data-field="listName"] input').first().fill(LIST_NAME);
    await p.waitForSelector("[data-import-list-created-only]", { timeout: 15_000 });
    await settle(p, 400);
    return "the check, a new list named";
  });
  const check = (key, n, label) => ({ label, sel: `[data-block="import-preflight"] [data-import-tile="${key}"]`, attr: ["data-value", String(n)] });
  await sweep(p, {
    ...DIALOG_STATE, state: "list-check", view: { sel: "[data-import-list-created-only]" },
    want: [IMPORT.keptOnly, IMPORT.createdOnly, IMPORT.listOwed], old: IMPORT_OLD, inView: [IMPORT.createdOnly],
    exact: [
      check("new", 2, "two numbers new to the book"),
      check("inBook", 1, "one number already in the book"),
      { label: "the start is on — the list is named", sel: '[data-block="import-apply"]', disabled: false },
    ],
    absent: ["[data-import-choice]"],
  }, reached);
  reached = !reached.ok ? reached : await attempt(async () => {
    await p.locator('[data-block="import-apply"]').first().click();
    if ((await p.waitForSelector(CONFIRM, { timeout: 2_500 }).catch(() => null)) !== null) await p.locator(`${CONFIRM} button[type="submit"]`).first().click();
    await p.waitForSelector('[data-block="import-done"]', { timeout: 300_000 });
    await dialogHoldsFocus(p);
    await settle(p, 600);
    return "the import onto a new list, finished";
  });
  const tile = (key, n, label) => ({ label, sel: `[data-block="import-done"] [data-import-tile="${key}"]`, attr: ["data-value", String(n)] });
  await sweep(p, {
    ...DIALOG_STATE, state: "list-done", view: { sel: '[data-block="import-done"]', block: "start" },
    want: [IMPORT.finished, listOwedSentence(LIST_NAME)], old: IMPORT_OLD,
    exact: [
      tile("create", 2, "two contacts added"),
      tile("update", 0, "nothing updated — a masked officer keeps the book as it is"),
      tile("keep", 1, "the number already in the book kept as it is"),
      tile("fail", 0, "nothing failed"),
      { label: "the new list's members are not covered for offers yet", sel: "[data-import-list-result]", attr: ["data-import-list-result", "owed"] },
    ],
    absent: ["[data-import-list-with-account]"],
  }, reached);
  await closeDialog(p).catch(() => {});

  // ── B8 · the imported contacts read "Added" today: the moment they entered the book ──
  reached = !reached.ok ? reached : await attempt(async () => {
    await openContacts(p, `?q=${encodeURIComponent(NEW_STEM)}`);
    return "a name search for the contacts this import added";
  });
  await sweep(p, {
    ...CONTACTS, state: "added-new", role: growth.role,
    view: { sel: '[data-block="contacts-card"]', block: "start", scrollX: CONTACTS_SCROLL },
    counts: [{ label: "the two contacts this import added", sel: "[data-contact-row]", n: 2 }],
    headers: MASKED_COLUMNS,
    dates: { label: `the new contacts were "Added" today (${TODAY})`, rows: "[data-contact-row]", cell: "td:last-child", re: `^${TODAY}$` },
  }, reached);
}

/* ═══ THE RUN ════════════════════════════════════════════════════════════════════════════════════════════════════ */

const people = {};
const world = { complianceGranted: false, outreachOpened: false, outreachAtStart: null };
let stoppedEarly = null;
try {
  console.log(`s14-visual-sweep · ${BASE} · run ${RUN} · ${WIDTHS.join(", ")} × ${HEIGHT}${PARTIAL ? " · PARTIAL" : ""}${NL}`);
  // ── 0 · ⛔ the server: a local DEV server (its dev routes answer — production's 404), the console stub, the clock ──
  const dev = await attempt(async () => {
    world.outreachAtStart = await outreachNow();
    return `licence outreach reads "${world.outreachAtStart}"`;
  });
  if (!setup("the server is a local DEV server — its dev-test routes answer (production answers 404)", dev.ok, dev.detail)) throw new Error("not a dev server");
  const pinned = await attempt(async () => {
    const r = await post(`/api/dev-test/marketing-send-window?at=${encodeURIComponent(NOON_EAT)}`);
    if (!r.window || r.window.open !== true) throw new Error(JSON.stringify(r).slice(0, 200));
    return "open";
  });
  setup("the send window's clock pinned at noon EAT, so no tile depends on the hour", pinned.ok, pinned.detail);
  people.growth = await staff("GROWTH", 11, "Asha Mwita", "growth");
  const rail = await attempt(async () => {
    await openComposer(people.growth.page);
    const line = squash(await people.growth.page.locator("[data-sender-line]").first().innerText());
    if (line !== SENDER_STUB) throw new Error(`the sender line reads "${line}" — boot with SMS_PROVIDER=console`);
    return "the console stub";
  });
  if (!setup("⛔ the SMS rail is the console stub — no message can leave this server (the composer's own sender line)", rail.ok, rail.detail)) throw new Error("not the console rail");

  // ── 1 · privacy, BEFORE anything saves a policy line ──
  if (runs("privacy")) await privacyScreen();
  // ── 2 · the composer, then the screens that read the same officers ──
  if (runs("composer") || runs("wordings") || runs("live")) people.admin = await staff("ADMIN", 12, "Zawadi Mushi", "admin");
  if (runs("composer")) {
    people.compliance = await staff("COMPLIANCE", 13, "Neema Kweka", "compliance");
    await composerScreen(people, world);
  }
  if (runs("wordings")) await wordingsScreen(people.admin);
  if (runs("live")) await liveScreen(people);
  if (runs("contacts")) await contactsScreen(people.growth);
  if (runs("import")) await importScreen(people.growth);
} catch (e) {
  stoppedEarly = short(e);
  setup("the sweep ran to its end", false, stoppedEarly);
} finally {
  // Everything the sweep moved, put back: the COMPLIANCE grant, licence outreach as it was found, the real clock.
  if (world.complianceGranted && people.admin) {
    const off = await setComplianceGrowth(people.admin.page, false);
    setup("COMPLIANCE's Growth & marketing grant taken back (/admin/roles)", off.ok, off.detail);
  }
  if (world.outreachOpened && world.outreachAtStart === "closed") {
    const closed = await attempt(async () => {
      await post("/api/dev-test/marketing-typed-test-seed?open=0");
      const state = await outreachNow();
      if (state !== "closed") throw new Error(`licence outreach reads "${state}"`);
      return "closed";
    });
    setup("licence outreach closed again, as the sweep found it", closed.ok, closed.detail);
  }
  await post("/api/dev-test/marketing-send-window?at=now").catch(() => {});
  for (const who of Object.values(people)) await who.ctx.close().catch(() => {});
  await api.dispose().catch(() => {});
  await browser.close().catch(() => {});
}

const tilesPassed = manifest.tiles.filter((t) => t.pass).length;
manifest.finishedAt = new Date().toISOString();
manifest.summary = {
  tiles: manifest.tiles.length, passed: tilesPassed, failed: tileFails, setupFailed: setupFails, stoppedEarly, partial: PARTIAL,
};
writeFileSync(join(OUT, "manifest.json"), JSON.stringify(manifest, null, 2) + NL);
console.log(`${NL}s14-visual-sweep: ${PARTIAL ? "PARTIAL · " : ""}${manifest.tiles.length} tiles · ${tilesPassed} passed · ${tileFails} failed · ${setupFails} setup step(s) failed${stoppedEarly ? " (stopped early)" : ""}`);
console.log(`tiles and manifest: ${OUT}`);
process.exit(tileFails === 0 && setupFails === 0 && stoppedEarly === null ? 0 : 1);
