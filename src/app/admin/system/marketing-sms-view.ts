/**
 * U49s-2 · WHAT THE "MARKETING SMS SENDING" CARD AND THE "MARKETING SMS" TAB ARE HANDED — built on the SERVER from the
 * switch as read now, the settings record as read now, and the viewer (spec `docs/marketing-specs/ENGINE-SPEC.md` §4.3
 * U49s decision 8; OD62 · OD63).
 *
 * ⛔ S11 · A VIEWER WHO MAY NOT READ MONEY FIGURES IS HANDED NO MONEY. The limits line is written here, in words, for the
 * viewer's tier; the price, the credit kept for codes, the campaign limit, the platform floor, the measured price and the
 * form's fingerprint (which spells them) never reach a client prop without `loadSmsMoneyForViewer`'s yes. ⚠️ That includes
 * an OWNER: ADMIN's own money.figures cell is editable (D3), so an owner who hid it gets the text view and the sentence
 * that says why — never a form whose money boxes are blank and can never save. `test:marketing-settings` S11 drives this
 * file and reads every prop it builds for money.
 * ⛔ A RECORD THAT CANNOT BE READ IN FULL SHOWS NO VALUES: the row reader fills a field it could not read with its default,
 * and a default shown as the owner's value would be a figure nobody chose — the tab says the record could not be read,
 * and nothing else.
 * ⛔ Every instant is said in EAT ("14:30 EAT", or "14:30 EAT on 7 Oct" when it is not today in Dar es Salaam), and who
 * switched the switch on is a NAME — the user row's, or the ops door's screened `by` — never a number.
 * ⭐ WHICH BUTTONS THE CARD OFFERS is decided here, from the state as read (`offers`): "Switch on…" while it is off;
 * "Switch off now" while it is on — AND while it reads malformed (an opening stamped by a clock ahead of this one blocks
 * "Switch on…" as `already_open`, so the owner must be able to clear it) or cannot be read (a stop is never withheld for
 * a read that failed: the close deletes whatever is there and records what it removed).
 */
import type { MarketingLiveSwitch } from "@/lib/server/marketing/live-switch";
import type { SettingsReload } from "@/lib/server/marketing/sms-settings";
import type { SegmentCostMeasure } from "@/lib/marketing/segment-cost";
import { formatPriceTzs, formatWindow, settingsFingerprint } from "@/lib/marketing/sms-settings";
import { formatTzs } from "@/lib/utils";

/** The card's props — the switch as read now, in words, and what this viewer may do with it. */
export type MarketingSmsCardView = {
  readonly state: "open" | "closed";
  /** Why it reads closed. */
  readonly why: "absent" | "unreadable" | "malformed" | "expired" | null;
  /** While open, when it switches itself off; once expired, when it did. */
  readonly closesAtLabel: string | null;
  readonly enabledAtLabel: string | null;
  /** Who switched it on: a name, or "the ops door (…)" — never a number. */
  readonly enabledByName: string | null;
  /** The buttons the state calls for (the action decides again). */
  readonly offers: readonly ("on" | "off")[];
  /** An owner account (ADMIN) — the only role either button acts for. */
  readonly isOwner: boolean;
  /** The viewer's role could not be read just now: not the owner, no money — and said as such, never as "not the owner". */
  readonly roleUnread: boolean;
  /** The limits line, already in words for this viewer's money tier. */
  readonly limits: string;
};

/** The tab's props. ⛔ Every money field is null for a viewer who may not read money, and every value for a record that
 *  could not be read in full. */
export type MarketingSmsFormView = {
  /** The record could not be read at all just now — nothing to show, nothing to save. */
  readonly loadFailed: boolean;
  /** A row this server could not read in full: no values are shown, and every save is refused. */
  readonly readable: boolean;
  /** Has an owner ever saved the record? (Otherwise the defaults are in force.) ⛔ Handed with the form only (null
   *  otherwise): "the documented defaults are in force" names the price, the credit kept and the limit. */
  readonly stored: boolean | null;
  /** The owner's form: an owner, who may read money, over a record read in full. Everyone else reads text. */
  readonly editable: boolean;
  readonly window: { readonly startMinute: number; readonly endMinute: number } | null;
  readonly money: { readonly pricePerSegmentTzs: number; readonly codesReserveTzs: number; readonly campaignLimitTzs: number } | null;
  /** The fingerprint the form posts back, so a page out of date is refused — handed with the form only. */
  readonly base: string | null;
  readonly isOwner: boolean;
  /** The viewer's role could not be read just now (the text view says so, never "only an owner can"). */
  readonly roleUnread: boolean;
  /** May this viewer read money figures at all? (The text view says why the money is not shown.) */
  readonly moneyVisible: boolean;
  /** The least the credit kept for codes may be — the platform's SMS floor (a money figure, for the form's hint: handed
   *  with the form only). */
  readonly floorTzs: number | null;
  /** The price box's second hint line: what our own delivered sends measure now (handed with the form only). */
  readonly measuredHint: string | null;
};

const EAT_TIME = new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Dar_es_Salaam", hour: "2-digit", minute: "2-digit", hour12: false });
const EAT_DAY = new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Dar_es_Salaam", day: "numeric", month: "short" });

/** An instant as the card says it: "14:30 EAT", or "14:30 EAT on 7 Oct" when it is not today in Dar es Salaam. */
export function eatLabel(ms: number, nowMs: number): string {
  if (!Number.isFinite(ms)) return "an unknown time";
  const time = `${EAT_TIME.format(ms)} EAT`;
  return EAT_DAY.format(ms) === EAT_DAY.format(nowMs) ? time : `${time} on ${EAT_DAY.format(ms)}`;
}

/** ⛔ A name that could be a number: four numerals in a row, or more than six in all — the ops door's own limit for this
 *  slot (`screenOpsText`), which no phone number fits in any spelling or grouping ("+255 712 345 678", "255/712/345/678",
 *  "+1 (415) 555-0132"). */
const couldBeANumber = (t: string): boolean => (t.match(/\p{N}/gu) ?? []).length > 6 || /\p{N}{4,}/u.test(t);

/** Who switched it on, in words — a name, or the ops door and the `by` it was given, each shown only when it could not be
 *  a number (the ops door screens its `by` as it writes; the card screens it again as it reads). */
async function whoSwitchedOn(enabledBy: string, nameOf: (userId: string) => Promise<string | null>): Promise<string> {
  if (enabledBy.startsWith("ops: ")) {
    const by = enabledBy.slice("ops: ".length).trim();
    return by !== "" && !couldBeANumber(by) ? `the ops door (${by})` : "the ops door";
  }
  let name: string | null = null;
  try { name = await nameOf(enabledBy); } catch { name = null; }
  const t = (name ?? "").trim();
  return t !== "" && !couldBeANumber(t) ? t : "an owner";
}

/** The limits line (spec §4.3 "Card above the rail"), in words for the viewer's money tier. */
export function limitsLine(settings: SettingsReload, moneyVisible: boolean, isOwner: boolean, roleUnread = false): string {
  if (!settings.ok) return "The Marketing SMS settings couldn't be read just now — reload the page to see them.";
  if (!settings.readable) {
    return "The saved Marketing SMS settings couldn't be read in full, so nothing that spends money uses them until a developer fixes the stored record.";
  }
  const s = settings.settings;
  const window = formatWindow(s);
  if (roleUnread) return `Sends ${window}. Your role couldn't be checked just now, so the money figures aren't shown — reload the page.`;
  if (!moneyVisible) {
    return `Sends ${window}. The price, the credit kept for codes and the campaign limit are shown to roles that may read money figures.`;
  }
  const where = isOwner ? "change them on the Marketing SMS tab" : "they are set on the Marketing SMS tab";
  return `${keepTzs(formatPriceTzs(s.pricePerSegmentTzs))} per SMS · ${keepTzs(formatTzs(s.codesReserveTzs))} kept for login and withdrawal codes · at most ${keepTzs(formatTzs(s.campaignLimitTzs))} per campaign · sends ${window} — ${where}.`;
}

/** A money figure whose "TZS" never wraps away from its amount (a no-break space between them). */
const keepTzs = (s: string): string => s.replace(/^TZS /, "TZS\u00a0");

/** The card's props (S11: no money for a viewer who may not read it). */
export async function marketingSmsCardView(i: {
  live: MarketingLiveSwitch;
  settings: SettingsReload;
  moneyVisible: boolean;
  isOwner: boolean;
  /** The role read failed (`loadSmsMoneyForViewer`'s `roleUnread`). */
  roleUnread?: boolean;
  now: number;
  nameOf: (userId: string) => Promise<string | null>;
}): Promise<MarketingSmsCardView> {
  const { live } = i;
  const roleUnread = i.roleUnread === true;
  const limits = limitsLine(i.settings, i.moneyVisible, i.isOwner, roleUnread);
  if (live.state === "open") {
    return {
      state: "open", why: null,
      closesAtLabel: eatLabel(Date.parse(live.closesAt), i.now),
      enabledAtLabel: eatLabel(Date.parse(live.enabledAt), i.now),
      enabledByName: await whoSwitchedOn(live.enabledBy, i.nameOf),
      offers: ["off"], isOwner: i.isOwner, roleUnread, limits,
    };
  }
  const offers: ("on" | "off")[] = live.why === "malformed" ? ["off", "on"] : live.why === "unreadable" ? ["off"] : ["on"];
  return {
    state: "closed", why: live.why,
    closesAtLabel: live.why === "expired" && live.closedAt ? eatLabel(Date.parse(live.closedAt), i.now) : null,
    enabledAtLabel: null, enabledByName: null,
    offers, isOwner: i.isOwner, roleUnread, limits,
  };
}

/** What the price box says our own sends measure now — for a viewer who may read money only. ⛔ A history that could not
 *  be read is said as such, never as "not measured yet". */
export function measuredHintOf(m: SegmentCostMeasure | null): string {
  if (m && m.kind === "measured") {
    return `Measured now: ${formatPriceTzs(m.tzsPerSegment)} from ${m.sends.toLocaleString("en-US")} delivered message${m.sends === 1 ? "" : "s"}.`;
  }
  if (m && m.kind === "unknown" && m.reason === "history-unreadable") {
    return "Not measured just now — the send history couldn't be read. Reload the page to try again.";
  }
  return "Not measured yet.";
}

/** The tab's props (S11: no money, and no fingerprint spelling it, for a viewer who may not read it — owner included).
 *  ⭐ What only the form prints — whether a save was ever made, the floor in the reserve's hint, the measured price — is
 *  handed with the form only: the text view shows none of it, so nobody else is sent it. */
export function marketingSmsFormView(i: {
  settings: SettingsReload;
  moneyVisible: boolean;
  isOwner: boolean;
  /** The role read failed (`loadSmsMoneyForViewer`'s `roleUnread`). */
  roleUnread?: boolean;
  floorTzs: number;
  measured: SegmentCostMeasure | null;
}): MarketingSmsFormView {
  const shared = { isOwner: i.isOwner, moneyVisible: i.moneyVisible, roleUnread: i.roleUnread === true };
  const textOnly = { stored: null, floorTzs: null, measuredHint: null, base: null, editable: false } as const;
  if (!i.settings.ok) {
    return { loadFailed: true, readable: false, window: null, money: null, ...textOnly, ...shared };
  }
  if (!i.settings.readable) {
    // ⛔ No values: the gaps hold defaults nobody chose.
    return { loadFailed: false, readable: false, window: null, money: null, ...textOnly, ...shared };
  }
  const s = i.settings.settings;
  const window = { startMinute: s.windowStartMinute, endMinute: s.windowEndMinute };
  const money = i.moneyVisible ? { pricePerSegmentTzs: s.pricePerSegmentTzs, codesReserveTzs: s.codesReserveTzs, campaignLimitTzs: s.campaignLimitTzs } : null;
  if (!(i.isOwner && i.moneyVisible)) return { loadFailed: false, readable: true, window, money, ...textOnly, ...shared };
  return {
    loadFailed: false,
    readable: true,
    stored: i.settings.stored,
    editable: true,
    window,
    money,
    // ⛔ The fingerprint spells the money: it goes with the form only.
    base: settingsFingerprint(s),
    floorTzs: i.floorTzs,
    measuredHint: measuredHintOf(i.measured),
    ...shared,
  };
}
