
#### ✅ G2 · no console screen showed the rules a running week froze — fixed by S6-ADMIN 6

`consoleWeekDetail` returned the frozen rules and `/admin/maswali/[weekId]` drew none of them: an officer asked "what fee
does this running week take?" had no console answer, and Finance cannot open the week page at all. THE RULE: the week's
page carries "Rules this week froze" (a draft: "Rules if it opened now") — every rule the week froze, in the Owner's
form's own labels and units (one label list, `RULES_FIELDS`, drawn by `RulesRead`), its fee read from its market's
snapshot (`weekFeeRate`, the fee's one home per week) and "Cannot be read" when it cannot be, never 0; Pools carries each
open week's fee in its own column. Held by `test:maswali-admin-plain` §2 (the card rendered, an unread fee said) with
plants (AP1)–(AP3), and `qa:maswali-admin-drive` 6.5g.1–6.5g.2.

#### ✅ G3 · raw ids where names belong — fixed by S6-ADMIN 6

"Seals from a new device" printed "officer usr_… · week mlw_…", the seal log's "Sealed by" and "Second officer" printed
user ids, and the connected accounts' table printed each account's raw id. THE RULE: an officer by name
(`consoleOfficerName`: the display name, else the stable handle "Officer #…" — `officerHandle`), a week by its code, an
account by its handle ("Player #…", `displayLabel`). Held by `test:maswali-admin-plain` §3 (the handle; a census that no
console page prints an id field as text — it finds the four old prints on S6-ADMIN 5) with plants (AP4), (AP5).

#### ✅ G4 · raw ISO times in refusals, the open's checklist and an alert — fixed by S6-ADMIN 6

"…before the first event (2026-11-06T…Z)", the moved close's "it is now <ISO>", "starts at <ISO>", the final week's
"announced to open at <ISO>", the void deadline "(<ISO>)" in the seal, the correction and the objection ruling, and the
alert "sales should have closed at <ISO>". THE RULE: a time in a sentence is "Fri 23 Oct, 18:00 (EAT)" (`eatInText`).
Held by `test:maswali-admin-plain` §4 (the phrase; a census of the console-bound services' sentences) with plants (AP6),
(AP7); the engine's and the adversarial suites' refusal cases read the same sentences on both stores.

#### ✅ G5 · a draft could not be discarded — fixed by S6-ADMIN 6

A draft made for the wrong Monday or line stayed a DRAFT for ever, and "Week … already exists" blocked redrafting that
Monday. THE RULE: a draft that never opened — no market, no ticket, not the announced final week — is discarded whole
with its fifteen questions (`discardDraftWeek`, `weekStore.discardDraft`, a conditional delete on both stores), behind the
draft's own control (`createMaswaliWeek`), on a typed `DISCARD`, audited (`maswali.week.discarded`); a week that opened
is never discarded (its record is what was sold). Held by `test:maswali-engine` §15 on both stores with plants (110) a
week that opened reaches the discard, (111) the store deletes a week that opened, (112) a discard is never audited;
`test:maswali-admin-plain` §5 with (AP8), (AP9); `qa:maswali-admin-drive` 6.5g.3.

#### ✅ G6 · the builder's categories and kinds were codes — fixed by S6-ADMIN 6

The week builder offered "macro", "culture" and "sport", "price". THE RULE: words — the console's category table
(`CATEGORY_LABEL`, the events console's too) and the kinds' (`EVENT_KIND_LABEL`: Match result, Price or rate, Weather
reading, Announcement); the stored value stays the code. Held by `test:maswali-admin-plain` §6 with plant (AP10), and
`qa:maswali-admin-drive` 3.3g (every option read in the browser).

#### ✅ G7 · the evidence archive was the one list with no search or filter — fixed by S6-ADMIN 6

`/admin/maswali/evidence` paged newest first with no week-code search and no state filter. THE RULE: it is a list like
the other three — the week list's own query and URL parameters (`q`, `state`, `line`, `sort`, `dir`, `page`), a code
search, state and line filters, sortable columns, a pager, counted whole before the page. The same pass found the week
list's own state filter offering the enums ("RESOLVING"): it now offers the console's state words. Held by
`test:maswali-admin-plain` §7 with plants (AP11), (AP12), and `qa:maswali-admin-drive` 6.5g.4.

#### ✅ G8 · the lock chip spoke domain codes and called the Owner "an Admin" — fixed by S6-ADMIN 6

The chip read "<control> · accounting only" and its tooltip "Ask an Admin or Finance officer" (ADMIN is "Owner"
everywhere else), and the Winners table printed "PLAYER · ACTIVE". THE RULE: the chip names the officers whose role works
the domain and whom to ask, in `ROLE_LABEL`'s words ("Release · Finance officers only" — "Ask the Owner or a Finance
officer."), and the table prints a role and an account status as words. ⭐ A platform component: the classic console's
chips read the same words; the classic AI toolkit's and the classic objection console's two locked sentences, and the
Millionea objection ruling's role refusal ("an ADMIN or COMPLIANCE officer"), were reworded with it. Held by
`test:maswali-admin-plain` §8 (the chip rendered, every word against `ROLE_LABEL`) with plants (AP13), (AP14), and
`qa:maswali-admin-drive` 4.2c (a Trading officer's chip read in the browser).
