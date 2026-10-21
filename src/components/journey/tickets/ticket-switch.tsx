/**
 * MASWALI | JUU/CHINI | MILLIONEA — the kinds of ticket, and the head of Tiketi zangu that carries the switch (the Vodacom
 * plan S6, SJ-16; S6-PLAN WP9 steps 3 and 6; the S4 frames s4-9-tiketi-*; MASWALI-BUILD S5 for the third kind).
 *
 * ⭐ THE KIT'S SECTION RAIL, NOT THE CANVAS'S CAPSULE (§0h point 7: where the canvas drifts from the kit, the kit wins).
 * `<Tabs variant="line">` in link mode: each kind is a link to the page that lists it, the rail is a `<nav>` named
 * "Aina ya tiketi", and the current kind carries `aria-current="page"` — no `role="tablist"` and no `aria-selected`,
 * because these are destinations, never a tab widget (A5; DESIGN_AUTHORITY §K rule 7c, "the underline is the section
 * language").
 * ⛔ THE KIT'S CODE IS NOT IMPORTED HERE. `TicketSwitchRail`, in the file beside this one, loads `Tabs` only when it
 * is drawn, so the two routes this head serves carry nothing of it for a reader the journey is not shown to — a client
 * module a server file imports joins its route's first-load JS for every visitor (VODACOM-PLAN §0h point 20).
 * ⛔ EACH PAGE PASSES ITS OWN KIND: `/positions` is Maswali, `/updown/history` is Juu/Chini and `/millionea/tickets` is
 * Millionea, so the link marked as the current page is always the page being read (A12).
 * ⭐ This rail is a journey phone's door to `/updown/history` (A15): `test:journey-shell` §9 holds this file to it.
 * ⭐ MILLIONEA IS THE THIRD KIND (MASWALI-BUILD S5; MASWALI-PLAN §10 §3.9; DESIGN_AUTHORITY §M8a item 11, §K8b): drawn
 * for a request the door admits — the product visible to it, or, while it is hidden, an account that holds a Millionea
 * ticket (the lead's decision L5: a kill hides the product, never a player's own tickets). For everybody else the rail is
 * the two kinds it always was, byte for byte. The answer is the doors' one per-request read (`millionea-doors.ts →
 * millioneaTicketsDoor`), which each PAGE reads and hands down: the journey's Tiketi files read nothing
 * (`test:journey-tickets` §8).
 */
import { PageHeader } from "@/components/ui/page-header";
import { TicketSwitchRail } from "@/components/journey/tickets/ticket-switch-rail";
import type { Dict } from "@/lib/i18n-dict";

/** The kinds of ticket. */
export type TicketKind = "questions" | "updown" | "millionea";

export function TicketSwitch({ current, millionea, t }: { current: TicketKind; millionea: boolean; t: Dict }) {
  return (
    <TicketSwitchRail
      ariaLabel={t.journey.ticketsKindAria}
      value={current}
      tabs={[
        { value: "questions", labelEn: t.journey.tabQuestions, href: "/positions" },
        { value: "updown", labelEn: t.nav.updown, href: "/updown/history" },
        // Millionea's word wears its ink, as in every nav that draws Millionea (§M8a item 11; L1, the lead's ruling).
        ...(millionea ? [{ value: "millionea", labelEn: t.millionea.productLabel, href: "/millionea/tickets", ink: "millionea" as const }] : []),
      ]}
    />
  );
}

/**
 * The head of Tiketi zangu, on both kinds: the page's name in the kit's `PageHeader` — with no eyebrow over it, as the
 * canvas draws it (the classic one says "Nafasi") — and then the switch. ⛔ It holds the page's one `<h1>`, on both
 * routes; the Utendaji link is the view's, below the list (§0h point 33), so nothing sits beside the name.
 */
export function TicketsHead({ current, millionea, t }: { current: TicketKind; millionea: boolean; t: Dict }) {
  return (
    <div className="space-y-4">
      <PageHeader title={t.journey.tabTickets} />
      <TicketSwitch current={current} millionea={millionea} t={t} />
    </div>
  );
}
