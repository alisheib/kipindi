/**
 * U38b · THE AUDIENCE CARD'S WORDS, IN ONE PLACE — the card, its rail, its ghost and the composer's client read these, and
 * `test:campaign-audience` and `qa:marketing-audience` assert them, so a state the drive photographs is the sentence the
 * page prints (ENGINE-SPEC §4.4 "States and sentences", word for word).
 *
 * ⛔ NEUTRAL INK (OD40): "not receiving" is the consent gate working, never a failure — no word here says failed or error
 * about a person. ⛔ NO MONEY WORD (OD24): GROWTH reads this card. ⛔ PROTECTED IS ONE LINE for every role: the reasons
 * inside it (a self-exclusion, a break, a harm marker, an age, the account's status, and — U33r — an agent applicant's
 * referee promised no marketing) are never named apart (D19).
 * ⛔ PURE — no "use client" and no server import (a TYPE is erased): the server card and the client composer import it.
 * ⭐ Every sentence renders at the 13px reading floor or larger (`test:type-scale` §3).
 */
import type { AudienceBucket } from "@/lib/server/marketing/audience-split";
import { COMPOSE_AUDIENCE_EVERYONE } from "./composer-copy";

/* ── the states ── */
/** A NEW draft whose address carries no audience: nothing is counted until "Who" is chosen (decision 3). */
export const AUDIENCE_NOT_CHOSEN = "Choose who receives it — the counts appear once you choose.";
/** The keyed fallback while a new filter's split is counted. */
export const AUDIENCE_COMPUTING = "Counting who will receive it…";
/** The count was made, and when — the footer under the figures. */
export function audienceCountedLine(countedAt: string, tookSeconds: string): string {
  return `Counted at ${countedAt} EAT · took ${tookSeconds} s. Every number is checked again when it is sent.`;
}
/** The time budget ran out: the will-receive figure is a floor ("≥ N" — the view-model writes it so). */
export function audienceUncheckedLine(willReceive: string): string {
  return `${willReceive} will receive — the rest weren't checked in time; every number is checked again when it is sent.`;
}
/** ⛔ D19 · OD65 — a viewer who may not read a number, before a campaign sends: the count alone, at every size, and why. */
export const AUDIENCE_FLOOR =
  "Your role sees how many people match, not who will receive it.";
export const AUDIENCE_EMPTY = "Nobody matches this audience.";
export const AUDIENCE_ERROR = "Couldn't count this audience — nothing is wrong with the campaign.";
export const AUDIENCE_COUNT_AGAIN = "Count again";
/**
 * The permanent callout under the card (decision 10) — its day-one wording, until U33a-G's surface copy (spec §7.6) lands.
 */
export const AUDIENCE_RECHECK =
  "Every number is checked again at the moment its message is sent — a stop, a withdrawn consent, self-exclusion, a break, age and the account's status all refuse it then.";

/* ── the words above the figures ── */
/** The whole of a population, in its own words — the contact book keeps the composer's shipped sentence (ONE copy). */
export const AUDIENCE_EVERYONE = {
  book: COMPOSE_AUDIENCE_EVERYONE,
  players: "Every player account — no filter.",
  both: "Everyone in the contact book and every player account — no filter.",
} as const;

/* ── the figures (neutral ink, OD40) ── */
export const AUDIENCE_FIGURE = {
  /** The number the confirmation will ask the officer to type. */
  onCampaign: "On this campaign",
  willReceive: "Will receive now (forecast)",
  notReceiving: "Not receiving",
  unsendable: "Can't be sent to",
  unchecked: "Not checked yet",
} as const;

/** The reasons, as their rows say them. A full Record over the split's five buckets, so a sixth is a compile error here. */
export const AUDIENCE_REASON_LABEL: Readonly<Record<AudienceBucket, string>> = {
  suppressed: "Stopped (on the stop list)",
  no_consent: "No consent or recorded basis",
  withdrawn: "Withdrew consent",
  age_unknown: "Age not confirmed",
  // U33r · the line names every kind of reason it holds, the promised agent referee among them, so it stays true without
  // ever counting one apart (D19).
  protected: "Protected (responsible gambling, age, account status or agent referee)",
};
/** The gate could not answer for these numbers — they join "Not receiving", and are asked again at send. */
export const AUDIENCE_UNANSWERED_LABEL = "Couldn't be checked — checked again when sent";
export const AUDIENCE_REASONS_LEAD = "Not receiving, by reason";

/* ── the sample ── */
export const AUDIENCE_SAMPLE_LEAD = "The first numbers in sending order";
/** Where the gate put one sample row — said to a READER only (a masked viewer's rows carry no detail). */
export const AUDIENCE_SLOT_WORDS = {
  willReceive: "Will receive",
  unchecked: "Not checked yet",
  unanswered: "Couldn't be checked",
} as const;
/** What a sample row IS — said to a reader only: a contact-book row, or a player account. */
export const AUDIENCE_ROW_KIND = { contact: "Contact", player: "Player account" } as const;
/** A sample row whose prefix no operator holds (never the case for a sendable number, said rather than left blank). */
export const AUDIENCE_NO_OPERATOR = "—";

/* ── the rail ── */
export const AUDIENCE_RAIL_LABEL = "Choose who receives this campaign";
/** The rail's group keys. ⚠️ The operator key says "by prefix": numbers are portable, the prefix is not the network. */
export const AUDIENCE_RAIL_KEYS = {
  who: "Who",
  op: "Operator (by prefix)",
  window: { book: "Added", players: "Joined", both: "Added or joined" },
  list: "List",
  tag: "Tag",
  consent: "Consent",
  suppressed: "Stop list",
  source: "Source",
  player: "Player",
  q: "Search",
  import: "Import",
} as const;
export const AUDIENCE_WHO = {
  book: { label: "Contact book", title: "Everyone in the contact book, narrowed by the filters below" },
  players: { label: "Player accounts", title: "Every player account — the contact book's own filters do not apply to an account" },
  both: { label: "Both", title: "The contact book and every player account, one message per number" },
} as const;
export const AUDIENCE_STOP_LIST = { yes: "On the stop list", no: "Not on the stop list" } as const;
export const AUDIENCE_PLAYER = { yes: "Players only", no: "Not players" } as const;
