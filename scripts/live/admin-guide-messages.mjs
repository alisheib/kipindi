/**
 * THE ADMIN GUIDE'S WORDS — every step of the whole flow, from the contact book to a campaign's results, what the SMS
 * credit tile can show and every message an admin can meet, for `admin-guide.mjs`. ⛔ Each MESSAGES row is checked against the
 * source before the guide builds (`check` is a fixed part of a sentence that carries a number; `message` is the sentence
 * otherwise): a reworded message fails the build, so the guide never quotes a sentence the platform no longer says. A
 * sentence that carries a number is printed with an example figure, as the screen shows it — never a bare "…" a reader
 * takes for a typo ("not …." was one).
 *
 * ⭐ THE OWNER'S RULE FOR THIS PDF (Ali, 2026-10-09, for the copy he hands to management): "make sure the PDF doesn't have
 * anything unnecessary — titles, headlines not needed, etc. I need it perfect." So, here:
 *   · NO TITLE OVER A CHAPTER'S ONLY STEP, and none over a chapter's opening page tour: a step with no `title` is printed
 *     under the chapter's own heading, unnumbered (Sign in, The contact book's tour, Results, Your first campaigns, Safety).
 *     Steps WITH a title are numbered within their chapter ("2.1"), never by a running count that collides with the
 *     chapter numbers ("2 · The contact book" over step "2" was the old PDF's page 3).
 *   · `where` is the menu path, and is LEFT OUT where there is no one place (advice, the rules) — never "Everywhere".
 *   · NO PICTURE THAT REPEATS ANOTHER: the contacts page is pictured once (its buttons are in that picture), a campaign
 *     sending is pictured in 6.3 and 7.1 (not again under Pause and resume), and a step whose words say all there is (Export,
 *     choosing the file, the decision under the check) has none.
 *   · THE CONSOLE'S OWN NAMES: the ADMIN role is "the Owner" (the console's word, capital O, as "Compliance" and "Growth" are —
 *     and, since 2026-10-09, the campaign sentences' too: "until the Owner switches them on"); the list's button is "New
 *     campaign". ⛔ The SMS company is NEVER named: the System tile names it in two of its states, so those states are
 *     described here, never quoted (BALANCE_STATES).
 *   · TRUE TO THE OWNER'S RULINGS OF 2026-10-09: a marketing SMS is sent exactly as written — nothing is added, no stop link;
 *     the typed-number test is for the Owner and Compliance only; Results says "Stopped since this campaign".
 * Each chapter in SECTIONS is printed in order; "IMPORT" (the import chapter, IMPORT_STEPS) and "MESSAGES" (the table of
 * messages) are placeholders `admin-guide.mjs` fills; `table: "SMS_CREDIT"` prints BALANCE_STATES under that step's picture.
 */

export const SECTIONS = [
  {
    title: "Sign in",
    steps: [
      {
        where: "https://50pick.tz/auth/admin",
        do: ["Enter your staff phone number and password, then press Sign in.", "Contacts and SMS campaigns are in the menu, under Growth."],
        shots: ["01-sign-in", "02-menu"],
      },
    ],
  },
  {
    title: "The contact book",
    steps: [
      {
        where: "Growth → Contacts",
        do: [
          "The tiles at the top count the book; the filters and the search box narrow the list.",
          "Each row is one contact. Tick rows to act on several at once.",
        ],
        shots: ["03-contacts"],
      },
      {
        title: "Add a contact",
        where: "Growth → Contacts → Add contact",
        do: [
          "Type or paste the number in any format — 0712 345 678, +255 712 345 678 or 255712345678. The form shows the network as soon as the number is complete.",
          "If the number is already in the book, the form says so and offers “Open the existing contact →”: edit that contact instead. The book never holds a number twice.",
          "Name, email, notes and tags are optional. Press Save contact.",
        ],
        shots: ["05-add-filled"],
      },
      {
        title: "Fix what the form marks",
        where: "Growth → Contacts → Add contact, or a contact's Edit",
        do: [
          "A problem is written in red under its box, and Save contact stays off until it is fixed.",
          "A name or a tag can't hold a phone number — the number belongs in the phone box.",
        ],
        shots: ["08-form-errors"],
      },
      {
        title: "Edit a contact",
        where: "Growth → Contacts → a row's Edit",
        do: ["Change the name, email, notes or tags, then press Save changes.", "The number itself can't change — add a new number as a new contact."],
        shots: ["09-edit"],
      },
      {
        title: "Find contacts",
        where: "Growth → Contacts",
        do: [
          "Type part of a name, or a whole phone number in any format, in the search box.",
          "Press an operator, a list or a tag to show only those contacts. Clear filters shows everyone again.",
        ],
        shots: ["12-filter"],
      },
      {
        title: "Tag, list, suppress or remove contacts",
        where: "Growth → Contacts → tick rows",
        do: [
          "Tick the rows — one or many. To take every contact the filters show, tick the whole page, then press “Select all … matching”.",
          "Choose Tag, Untag, Add to list, Record a withdrawal, Suppress or Remove.",
          "For up to 50 ticked contacts the confirmation names each one; for more, type the number it shows. Then press the action's button.",
        ],
        shots: ["13-bulk-bar", "14-bulk-confirm"],
        notes: [
          "Suppress stops a number from ever receiving marketing, and it can't be undone — use it when a person asks 50pick to stop.",
          "Remove deletes contacts from the book; the records of their consent and stops are kept.",
        ],
      },
      {
        title: "Export the book",
        where: "Growth → Contacts → Export CSV",
        do: ["Filter first if you want only part of the book, then press Export CSV. Roles that can't see phone numbers get them hidden."],
      },
    ],
  },
  {
    title: "Import contacts from a file",
    steps: "IMPORT",
  },
  {
    title: "Before anything is sent",
    steps: [
      {
        title: "Check the SMS credit",
        where: "System → the “SMS credit” tile",
        do: [
          "The tile shows the credit left with the SMS company, read live. Each SMS costs about TZS 6.",
          "Login and withdrawal codes use the same credit. Part of it is kept for them, and a campaign pauses rather than spend it.",
        ],
        shots: ["26-sms-credit"],
        table: "SMS_CREDIT",
      },
      {
        title: "The Owner's switch",
        where: "System → the “Marketing SMS sending” card",
        do: [
          "Nothing is sent while marketing SMS are switched off — not a campaign, not a test.",
          "The Owner presses Switch on…, chooses for how long (30 minutes to 24 hours) and confirms. It switches itself off at the end; Switch off now stops it at once.",
        ],
        shots: ["30-marketing-card", "31-switch-on"],
      },
      {
        title: "The Owner's settings",
        where: "System → the “Marketing SMS” tab",
        do: [
          "Here the Owner sets the price per SMS, the credit kept for login and withdrawal codes, the most one campaign may spend, and the sending hours (08:00–20:00 EAT unless changed).",
        ],
        shots: ["32-marketing-settings"],
      },
    ],
  },
  {
    title: "Write a campaign",
    steps: [
      {
        title: "Write the message",
        where: "Growth → SMS campaigns → New campaign",
        do: [
          "Name the campaign — only staff see the name.",
          "Write the Swahili message; it must begin with 50pick. {jina} prints the person's first name — then give the word printed when a name can't be used (for example Rafiki).",
          "English is optional: players whose account language is English get it; everyone else gets Swahili.",
          "The message must fit in one SMS, and it is sent exactly as you write it — nothing is added. The counter shows the room left (12 characters are kept for {jina}).",
        ],
        shots: ["19-compose-filled"],
      },
      {
        title: "Fix what the composer marks",
        where: "Growth → SMS campaigns → New campaign",
        do: [
          "A curly quote or an emoji makes the message hold far fewer characters. Press “Replace with plain characters”, or retype it.",
          "Too long? The composer says how many characters you have.",
        ],
        shots: ["20-compose-warning"],
      },
      {
        title: "Choose who receives it",
        where: "Growth → SMS campaigns → New campaign → Audience",
        do: [
          "Choose the contact book, player accounts, or both, then narrow it with a list, a tag, an operator or the other filters.",
          "The card counts who will receive it and who won't, with the reason for each — stopped, no consent and so on.",
          "A campaign always goes to a group — never to one phone number.",
        ],
        shots: ["21-audience"],
      },
      {
        title: "Save, and send a test",
        where: "Growth → SMS campaigns → New campaign → Save draft, then Test send",
        do: [
          "Press Save draft — the line beside it says when, and that nothing was sent.",
          "Send the test to My own number. The Owner and Compliance can also choose Another number: type it, and tick the box that the person who uses it is 18 or older — only for someone who expects the test.",
          "The test is the saved message, exactly as a recipient will get it. It is sent only while marketing SMS are switched on — up to 3 at once, then one every 10 minutes.",
          "Saved drafts are in the SMS campaigns list; press a draft's name to open it again.",
        ],
        shots: ["22-saved", "25-test-send"],
      },
    ],
  },
  {
    title: "Confirm and start",
    steps: [
      {
        title: "Confirm the audience",
        where: "Growth → SMS campaigns → the saved draft → Confirm audience…",
        do: [
          "The audience is counted at that moment: who will receive it, who won't and why, how many SMS it uses and what it can cost.",
          "Five people or fewer: check the people it lists. More than five: type the number of people it shows.",
          "Press Confirm audience. The message and the audience are then frozen — a confirmed campaign can't be edited.",
          "Then press “Start it from its own page”.",
        ],
        shots: ["40-confirm-dialog", "41-confirmed"],
      },
      {
        title: "Start it",
        where: "Growth → SMS campaigns → the campaign → Start…",
        do: ["Check the number of people, the sending hours and the most it can cost, then press Start sending."],
        shots: ["42-start-dialog"],
      },
      {
        title: "Keep the page open while it sends",
        where: "Growth → SMS campaigns → the campaign",
        do: [
          "The page first prepares the list, then sends, and shows how many are done.",
          "Sending continues only while a page like this one is open. Close it, and sending waits until someone opens it again.",
          "Outside the sending hours it waits, and says when it will go on.",
        ],
        shots: ["44-waiting"],
      },
    ],
  },
  {
    title: "Watch, pause, resume, stop",
    steps: [
      {
        title: "Read the figures",
        where: "Growth → SMS campaigns → the campaign",
        do: [
          "On campaign — everyone on its list. Handed over — the network took the message. Failed — it did not reach the person.",
          "Not sent (checks) — the safety checks stopped them; that is not a fault. “Not sent, by reason” says why.",
          "No answer — the network never replied; it is not sent again by itself. Waiting — still to go.",
        ],
        shots: ["45-running-figures"],
      },
      {
        title: "Pause and resume",
        where: "Growth → SMS campaigns → the campaign → Pause, then Resume",
        do: [
          "Pause stops anything new from starting; a group already being sent may still go out.",
          "Resume checks the switch, the SMS network and the credit for what is left, then carries on.",
          "The page says who paused it and when.",
        ],
        shots: ["46-paused"],
      },
      {
        title: "When a campaign pauses by itself",
        where: "Growth → SMS campaigns → the campaign",
        do: [
          "The page says why, and what to do — for example, top up the credit, or wait for the switch.",
          "Fix what it says, then press Resume.",
        ],
        shots: ["48-system-paused"],
      },
      {
        title: "Stop for good",
        where: "Growth → SMS campaigns → the campaign → Stop…",
        do: [
          "A stopped campaign can't be restarted, and messages already handed to the network are not recalled.",
          "Press Stop campaign in the dialog. The page then says who stopped it and how many people were not messaged.",
        ],
        shots: ["49-stop-dialog", "50-stopped"],
      },
      {
        title: "Make a copy",
        where: "Growth → SMS campaigns → the campaign → Make a copy",
        do: [
          "A copy is a new draft with the same message and audience — check and confirm it like any campaign.",
          "A copy messages again anyone the first campaign already reached.",
        ],
        shots: ["51-copy"],
      },
    ],
  },
  {
    title: "Results",
    steps: [
      {
        where: "Growth → SMS campaigns → the campaign",
        do: [
          "When nobody is left to message, the campaign says Finished. Its Results are further down the page.",
          "Delivered — a delivery receipt came back. Handed over, no receipt yet — the network took it; receipts usually come in seconds.",
          "Failed, and “Not sent — the checks refused them”, say who did not get it and why.",
          "Stopped since this campaign — people this campaign reached who have stopped offers since.",
          "The estimated spend is shown to the roles that may see money; the SMS credit on System is the true figure.",
        ],
        shots: ["52-finished", "53-results"],
      },
    ],
  },
  {
    title: "Your first campaigns",
    lead: "Do these in order before any big send.",
    steps: [
      {
        do: [
          "Send yourself the test in Swahili and in English. Read it on the phone, and check the name and the words.",
          "Pilot: a list of 5 to 10 staff numbers who agreed to receive offers. Confirm, start, keep the page open until it says Finished, and check that Results shows Delivered.",
          "First real campaign: 100 to 200 people. Check Results and the SMS credit afterwards.",
          "Then grow step by step — 1,000, then 5,000 — checking the SMS credit before each one.",
          "A campaign of 1,000 people uses about 1,000 SMS, about TZS 6,000. Each campaign is held to the Owner's cost limit (TZS 10,000 unless the Owner changed it — about 1,600 people); for a bigger one, the Owner raises it first.",
          "Send during the day, well inside the sending hours, and never send the same message to the same people twice.",
        ],
      },
    ],
  },
  {
    title: "Safety",
    steps: [
      {
        do: [
          "Nothing is sent while the Owner's switch is off, or outside the sending hours.",
          "The credit kept for login and withdrawal codes is never spent on marketing — a campaign pauses first.",
          "A campaign can't cost more than its limit; Start refuses it.",
          "Each person is checked just before their message: stopped, withdrawn and self-excluded people are skipped.",
          "A message is sent exactly as written. Players can turn offers off under Profile → Notifications, and anyone who stopped is never messaged again.",
          "Your role decides what you see and do; every action is recorded with your name and the time.",
          "If anything looks wrong, press Pause, then ask.",
        ],
      },
    ],
  },
  {
    title: "Messages you may see",
    steps: "MESSAGES",
  },
];

/** ⭐ The import chapter — `admin-guide.mjs` puts it where `SECTIONS` holds the "IMPORT" placeholder. Written from S15's LIVE
 *  importer (2026-10-09; its words are `src/app/admin/contacts/import/import-copy.ts`'s, its limits `xlsx-limits.ts`'s), with
 *  the pictures `importShots` takes by the data-block names S15 built the dialog to. The first step is the owner's own ask —
 *  how much to import each time — and the check's one picture stands beside both its steps (it holds the decision too). */
export const IMPORT_STEPS = [
  {
    title: "How much to import each time",
    do: [
      "First, a test file of 20 to 50 contacts. Check the result, and open a few of the contacts in the book.",
      "Then files of up to 5,000 rows, one import at a time, checking each result before the next. Once you trust your files, bigger ones are fine — one import takes up to 200,000 rows.",
      "Before each import, press Export CSV, so you keep a copy of the book as it was.",
      "Never import while a campaign is being confirmed or started — new people in its audience stop it from starting.",
    ],
  },
  {
    title: "Choose the file",
    where: "Growth → Contacts → Import contacts",
    do: [
      "Drop or choose an Excel file (.xlsx), a CSV, or a phone's contacts file (.vcf) — or press Paste instead and paste cells from Excel or a chat.",
      "An Excel file can be up to 700 KB; a CSV or a contacts file has no size limit. Old .xls, .ods, Numbers, PDFs and pictures can't be read — save the list as .xlsx or CSV first.",
      "If the window closes or the page reloads, press Import contacts again: an unfinished import carries on from where it stopped.",
    ],
  },
  {
    title: "Check the columns",
    where: "Import contacts → The columns",
    do: [
      "Each column shows its first values and what it will be read as — Phone, Name, Email, Tags, Notes or Not used. Press Change on any that is wrong.",
      "A file that starts with a contact instead of column names is recognised; make sure the phone column is the right one.",
      "Press Next. The rows are uploaded — nothing is in the contact book yet.",
    ],
    shots: ["i2-columns"],
  },
  {
    title: "Read the check",
    where: "Import contacts → Check before importing",
    do: [
      "Five boxes add up to your file: New to the book, Already in the book, Repeated in this file, Can't be imported as written, Could not be read.",
      "A number repeated in the file is imported once — its first row. Each problem row is listed with its row number in your file and the reason.",
      "Nothing has been written to the book yet. If many rows can't be used, fix the file and start again.",
    ],
    shots: ["i3-check"],
  },
  {
    title: "Choose what happens to numbers already in the book",
    where: "Check before importing → Numbers already in the book",
    do: [
      "Keep what's in the book (recommended) — those contacts don't change; new numbers are still added.",
      "Use the file's version — the file's name, email and notes replace the book's; tags are only added. You confirm it, and there is no undo.",
      "Only fill in what's missing — only details the book doesn't have yet are filled in.",
      "A blank cell never erases anything, and numbers on the stop list and erased people are never changed. Only a role that can see phone numbers can update contacts already in the book.",
      "To send these people offers, add them to a list here; a list is ready for offers once its licence basis and 18+ confirmation are recorded on the Lists card.",
    ],
  },
  {
    title: "Import, and read the result",
    where: "Check before importing → Import",
    do: [
      "The line above the button says what will happen — for example “This import: 2 new · 0 updated · 5 kept as they are.” Then press Import.",
      "A bar counts the rows as they are written. You can stop and resume; if the window closes, press Import contacts again and it carries on.",
      "The result counts Added, Updated, Kept as they were and Couldn't be imported — each failure with its row and the reason.",
    ],
    shots: ["i6-done"],
  },
];

/** What the System page's SMS credit tile can show (`src/app/admin/system/sms-credit-tile.ts`). ⛔ DESCRIBED, NEVER QUOTED:
 *  the tile names the SMS company in its "checking" and "low" states, and this guide never names it. */
export const BALANCE_STATES = [
  { shows: "A figure, and “Healthy”", meaning: "The live balance, read just now.", action: "Nothing — check it before a big campaign." },
  { shows: "A figure, and “Low” in amber", meaning: "The credit is below the alert level.", action: "Ask the Owner to top up soon." },
  { shows: "A figure, and “Below the TZS 20,000 floor” in red", meaning: "The credit is below the part kept for login and withdrawal codes; marketing must wait.", action: "Ask the Owner to top up now." },
  { shows: "A dash, and “reload in a few seconds”", meaning: "The balance is still being read.", action: "Reload the page after a few seconds." },
  { shows: "A dash, and “Couldn't read the balance”", meaning: "The SMS company did not answer this time.", action: "Reload later. If it stays, tell the Owner." },
  { shows: "A red dash, and a setup note", meaning: "The SMS connection is not set up correctly on the server — no SMS can be sent, login codes included.", action: "Tell the Owner at once." },
];

export const MESSAGES = [
  // ── the contact form
  { area: "Contacts", message: "This number is already in the book.", meaning: "The number is a contact already.", action: "Press “Open the existing contact →” and edit that one." },
  { area: "Contacts", message: "This number can't be added to the book.", meaning: "This number was erased from 50pick at the person's request.", action: "Do not add it again." },
  { area: "Contacts", message: "A name can't hold a phone number — remove the number from the name.", meaning: "Names show to every staff role.", action: "Take the digits out of the name." },
  { area: "Contacts", message: "A tag can't hold a phone number.", meaning: "Tags show to every staff role.", action: "Use a word (“vip”, “event-oct”)." },
  { area: "Contacts", message: "This doesn't look like an email address (name@example.com).", meaning: "The email is not a complete address.", action: "Fix it, or leave it empty." },
  { area: "Contacts", message: "Someone changed this contact after you opened it, so nothing was saved. Reload to see the latest version, then make your change again.", meaning: "Two people edited the same contact.", action: "Reload, check their change, then make yours." },
  { area: "Contacts", message: "Your role can view contacts but not add or change them — ask an officer with Growth access.", meaning: "Your role is view-only here.", action: "Ask an officer with Growth access, or the Owner." },
  { area: "Contacts", message: "A Tanzanian number has nine digits after +255; this one has 8. Check whether some digits were cut off.", check: "Check whether some digits were cut off.", meaning: "A digit or more is missing.", action: "Check the number and type it again." },
  { area: "Contacts", message: "This is an international number outside Tanzania (country code +254…). 50pick sends only to Tanzanian mobile numbers.", check: "50pick sends only to Tanzanian mobile numbers.", meaning: "Only Tanzanian mobiles can be added.", action: "Ask for their Tanzanian mobile number." },
  { area: "Contacts", message: "The selection changed while it was being read: it now holds 120 contacts, not 118. Nothing was changed; review it again.", check: "The selection changed while it was being read: it now holds ", meaning: "Contacts joined or left the selection meanwhile.", action: "Review it again — the confirmation counts afresh." },
  // ── writing a campaign
  { area: "Writing a campaign", message: "The Swahili message is required — it is the one every recipient can be sent.", meaning: "The Swahili message is empty.", action: "Write the Swahili message." },
  { area: "Writing a campaign", message: "A campaign goes to a group, never to one phone number — take the number out of the audience. To see the message on a phone, use the test send: it goes to your own number.", meaning: "The audience is one phone number.", action: "Choose a group; use the test send for one phone." },
  { area: "Writing a campaign", message: "The character “…” is not in the GSM alphabet, which cuts a message from 160 characters to 70. Replacing it is usually enough.", check: "is not in the GSM alphabet, ", meaning: "A special character makes the SMS hold far fewer characters.", action: "Press “Replace with plain characters”." },
  { area: "Writing a campaign", message: "This is 2 messages, and the limit is 1 — you have 148 characters, and this uses 171.", check: "messages, and the limit is ", meaning: "The message is too long.", action: "Shorten it until the counter fits." },
  { area: "Writing a campaign", message: "Marketing SMS are not switched on yet — a test is refused until the Owner switches them on.", meaning: "Sending is off.", action: "Ask the Owner to switch marketing SMS on." },
  { area: "Writing a campaign", message: "Couldn't save — your text is still here. Try again.", meaning: "The server did not answer this time. Nothing is lost.", action: "Try again; if it keeps failing, reload, then tell the Owner." },
  { area: "Writing a campaign", message: "Save first — the test sends the saved text.", meaning: "The test uses the saved message.", action: "Press Save draft, then send the test." },
  { area: "Writing a campaign", message: "Nobody matches this audience yet.", meaning: "Nobody in this audience may receive the campaign.", action: "Choose a wider audience." },
  // ── starting and resuming
  { area: "Starting", message: "Marketing SMS are switched off. The Owner switches them on (Admin → System → Marketing SMS sending), then you can start. Nothing was sent.", meaning: "The Owner's switch is off.", action: "Ask the Owner to switch them on, then press Start again." },
  { area: "Starting", message: "At today's price this campaign could cost TZS 12,000 — more than its limit of TZS 10,000. Stop it and confirm a smaller copy, or the Owner raises the limit. Nothing was sent.", check: "Stop it and confirm a smaller copy, or the Owner raises the limit. Nothing was sent.", meaning: "The campaign could cost more than its limit.", action: "Confirm a smaller copy, or ask the Owner to raise the limit." },
  { area: "Starting", message: "Starting would leave less SMS credit than is kept for login and withdrawal codes — credit TZS 25,000, this campaign up to TZS 9,000, kept for codes TZS 20,000. Top up, or narrow the audience. Nothing was sent.", check: "Starting would leave less SMS credit than is kept for login and withdrawal codes", meaning: "Not enough credit for this campaign and the codes.", action: "Ask the Owner to top up, or narrow the audience." },
  { area: "Starting", message: "The audience grew since it was confirmed — now 1,250, confirmed 1,200. Nothing was sent. Stop this campaign and confirm a new copy.", check: "The audience grew since it was confirmed", meaning: "People joined the audience after it was confirmed — new contacts, for example.", action: "Stop it and confirm a new copy." },
  // ── while it sends
  { area: "Sending", message: "Keep this page open while it sends — sending continues only while a page like this one is open.", meaning: "This page is what keeps the campaign going.", action: "Leave the page open until it says Finished." },
  { area: "Sending", message: "Waiting for the send window — sending resumes at 08:00 EAT.", check: "Waiting for the send window — sending resumes at ", meaning: "Outside the sending hours.", action: "Nothing — it goes on by itself when the window opens." },
  { area: "Sending", message: "Waiting a moment — the platform is paying out or taking bets, and money always goes first. Sending resumes by itself.", meaning: "Payouts and bets come first.", action: "Nothing — it goes on by itself." },
  { area: "Sending", message: "Waiting — a login or withdrawal code failed in the last two minutes, so marketing steps aside. It tries again at 14:10 EAT.", check: "so marketing steps aside. It tries again ", meaning: "Login codes come first.", action: "Nothing — it tries again by itself." },
  { area: "Sending", message: "Nobody is sending this campaign right now. Open it as an officer who can send, and keep the page open.", check: "Open it as an officer who can send, and keep the page open.", meaning: "No page is open to keep it going.", action: "Open the campaign and keep the page open." },
  { area: "Sending", message: "This page is out of date or lost its connection — reload it to keep sending. Nothing is lost.", meaning: "The page lost touch with the server.", action: "Reload the page." },
  // ── why it paused
  { area: "Paused", message: "Paused — the SMS credit reached what is kept for login and withdrawal codes. Top up, then Resume.", meaning: "The credit ran down to the part kept for codes.", action: "Ask the Owner to top up, then press Resume." },
  { area: "Paused", message: "Paused — marketing SMS are not switched on: the Owner switched them off, the time they were switched on for ran out, or the switch couldn't be read. Once Admin → System shows them on, press Resume.", meaning: "The switch is off.", action: "Ask the Owner to switch them on, then press Resume." },
  { area: "Paused", message: "Paused — the SMS network refused the last batch, and nothing in it was charged. Check Admin → System, then Resume.", meaning: "The SMS company said no to the last group.", action: "Check System; press Resume when it is healthy." },
  { area: "Paused", message: "Paused — some people could not be checked or prepared. Resume to try them again, or Stop.", meaning: "A few people couldn't be checked.", action: "Press Resume to try them again." },
];
