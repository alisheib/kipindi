/**
 * THE ADMIN GUIDE'S WORDS (v2) — every step of the whole flow, from the contact book to a campaign's results, the SMS
 * credit's states and every message an admin can meet, for `admin-guide.mjs`. ⛔ Each MESSAGES row is checked against the
 * source before the guide builds (`check` is a fixed part of a sentence that carries a number; `message` is the sentence
 * otherwise): a reworded message fails the build, so the guide never quotes a sentence the platform no longer says. Plain
 * English for staff — no code words, no headings or notes a reader does not need.
 */

export const SECTIONS = [
  {
    title: "1 · Sign in",
    steps: [
      {
        title: "Sign in to the admin console",
        where: "https://50pick.tz/auth/admin",
        do: ["Enter your staff phone number and password, then your 2-step code.", "Contacts and SMS campaigns are in the menu under Growth."],
        shots: ["01-sign-in", "02-menu"],
      },
    ],
  },
  {
    title: "2 · The contact book",
    steps: [
      {
        title: "Read the book",
        where: "Growth → Contacts",
        do: [
          "The tiles at the top count the book.",
          "The filters narrow the list by operator, list or tag. The search box finds a name, or a whole phone number in any spelling.",
          "Each row is one contact. Tick rows to act on several at once.",
        ],
        shots: ["03-contacts"],
      },
      {
        title: "Add one contact",
        where: "Growth → Contacts → Add contact",
        do: [
          "Type or paste the number in any spelling — 0712 345 678, +255 712 345 678 or 255712345678.",
          "The form shows the network and checks the book as soon as the number is complete.",
          "Name, email, notes and tags are optional. Press Save contact.",
        ],
        shots: ["04a-add-button", "05-add-filled"],
      },
      {
        title: "A number already in the book",
        where: "Growth → Contacts → Add contact",
        do: ["The form says so and offers “Open the existing contact →”. Edit that contact — the book never holds a number twice."],
        shots: ["07-duplicate"],
      },
      {
        title: "Fix what the form marks",
        where: "Growth → Contacts → Add contact, or a contact's Edit",
        do: [
          "A problem is written in red under its own box, and Save waits with the reason beside it.",
          "A name or a tag can't hold a phone number — the number belongs in the phone box.",
        ],
        shots: ["08-form-errors"],
      },
      {
        title: "Edit a contact",
        where: "Growth → Contacts → the row's edit link",
        do: ["Change the name, email, notes or tags, then Save changes.", "The number itself can't change — add a new number as a new contact."],
        shots: ["09-edit"],
      },
      {
        title: "Find contacts",
        where: "Growth → Contacts → the search box and the filters",
        do: [
          "Type part of a name, or a WHOLE number in any spelling (the line under the box says “Whole number — matched exactly”).",
          "Press an operator, a list or a tag to show only those contacts; press it again, or Clear, to show everyone.",
        ],
        shots: ["10-search-name", "12-filter"],
      },
      {
        title: "Act on many contacts: tag, list, stop, remove",
        where: "Growth → Contacts → tick rows → the bar that appears",
        do: [
          "Tick the rows, or “select all matching” to take every contact the filter shows.",
          "Choose Tag, Untag, Add to list, Record a withdrawal, Suppress or Remove.",
          "Up to 50 rows, the confirmation names them; more than that, type the number the server counted. Then press the action's button.",
        ],
        shots: ["13-bulk-bar", "14-bulk-confirm"],
        notes: [
          "Suppress stops a number from EVER receiving marketing, and it can't be undone — use it when a person asks 50pick to stop.",
          "Remove deletes contacts from the book; the records of their consent and stops are kept.",
        ],
      },
      {
        title: "Export the book",
        where: "Growth → Contacts → Export CSV",
        do: ["Filter first if you want only part of the book, then press Export CSV. Roles that can't read numbers get them hidden."],
        shots: ["16-export"],
      },
    ],
  },
  {
    title: "3 · Import contacts from a file",
    steps: "IMPORT",
  },
  {
    title: "4 · Before anything is sent",
    steps: [
      {
        title: "Check the SMS credit",
        where: "System → the “SMS credit” tile",
        do: [
          "The credit left with the SMS company, read live. Each SMS costs about TZS 6.",
          "Login and withdrawal codes use the same credit. Part of it is kept for them, and a campaign pauses rather than spend it.",
        ],
        shots: ["26-sms-credit"],
      },
      {
        title: "The owner's switch",
        where: "System → the “Marketing SMS sending” card",
        do: [
          "Nothing is sent while marketing SMS are switched off — not a campaign, not a test.",
          "The owner presses Switch on…, chooses how long (30 minutes to 24 hours) and confirms. It switches itself off at the end; Switch off now stops it at once.",
        ],
        shots: ["30-marketing-card", "31-switch-on"],
      },
      {
        title: "The owner's settings",
        where: "System → the “Marketing SMS” tab",
        do: [
          "The price per SMS, the credit kept for login and withdrawal codes, the most one campaign may cost, and the sending hours (08:00–20:00 EAT unless the owner changes them).",
        ],
        shots: ["32-marketing-settings"],
      },
    ],
  },
  {
    title: "5 · Write a campaign",
    steps: [
      {
        title: "Start a new campaign",
        where: "Growth → SMS campaigns → New SMS campaign",
        do: ["Every campaign is listed with its status. A draft is still being written."],
        shots: ["17-campaigns"],
      },
      {
        title: "Write the message",
        where: "Growth → SMS campaigns → New SMS campaign",
        do: [
          "Name the campaign — only staff see the name.",
          "Write the Swahili message; it must begin with 50pick. {jina} prints the person's first name — then give the word printed when a name can't be used (for example rafiki).",
          "English is optional: players whose account language is English get it, everyone else gets Swahili.",
          "The message must fit in ONE SMS. The counter shows the room left: the stop link, the 12 characters kept for {jina} and the source line are counted for you.",
        ],
        shots: ["19-compose-filled"],
      },
      {
        title: "Fix what the composer marks",
        where: "Growth → SMS campaigns → the message",
        do: [
          "A curly quote or an emoji makes the message hold far fewer characters. Press “Replace with plain characters”, or retype it.",
          "Too long? The composer says how many characters you have.",
        ],
        shots: ["20-compose-warning"],
      },
      {
        title: "Choose who receives it",
        where: "Growth → SMS campaigns → Audience",
        do: [
          "Choose the contact book, player accounts, or both, then narrow it with a list, a tag, an operator or the other filters.",
          "The card counts who will receive it and who won't, with the reason for each (stopped, no consent, can't be sent to…).",
          "A campaign always goes to a group — never to one phone number.",
        ],
        shots: ["21-audience"],
      },
      {
        title: "Save, and send yourself a test",
        where: "Growth → SMS campaigns → Save draft, then Test send",
        do: [
          "Press Save draft — the line beside it says when, and that nothing was sent.",
          "The test sends the saved message to your own phone, exactly as a recipient will get it, while marketing SMS are switched on.",
          "Saved drafts are in the list; press a draft's name to open it again.",
        ],
        shots: ["22-saved", "25-test-send"],
      },
    ],
  },
  {
    title: "6 · Confirm and start",
    steps: [
      {
        title: "Confirm the audience",
        where: "Growth → SMS campaigns → the saved draft → Confirm audience…",
        do: [
          "The server counts the audience now: who will receive it, who won't and why, how many SMS it uses and what it can cost.",
          "Press Confirm audience. The message and the audience are frozen — a confirmed campaign can't be edited.",
          "Then open the campaign to start it.",
        ],
        shots: ["40-confirm-dialog", "41-confirmed"],
      },
      {
        title: "Start it",
        where: "Growth → SMS campaigns → the campaign → Start…",
        do: [
          "The dialog says how many people, the sending hours and the most it can cost. Press Start sending.",
          "Each person is checked again just before their message: anyone who stopped, withdrew or is protected is skipped.",
        ],
        shots: ["42-start-dialog"],
      },
      {
        title: "Keep the page open while it sends",
        where: "Growth → SMS campaigns → the campaign",
        do: [
          "The page first prepares the list, then sends, and shows how many are done.",
          "Sending continues only while a page like this one is open. Close it and sending waits until someone opens it again.",
          "Outside the sending hours it waits, and says when it will go on.",
        ],
        shots: ["44-waiting"],
      },
    ],
  },
  {
    title: "7 · Watch, pause, resume, stop",
    steps: [
      {
        title: "Read the figures",
        where: "The campaign's page",
        do: [
          "On campaign — everyone on its list. Handed over — the network took the message. Failed — did not reach the person.",
          "Not sent (checks) — the checks stopped them, the system working. No answer — never sent again by itself. Waiting — still to go.",
          "“Not sent, by reason” lists why people were skipped.",
        ],
        shots: ["45-running-figures"],
      },
      {
        title: "Pause and resume",
        where: "The campaign's page → Pause, then Resume",
        do: [
          "Pause stops anything new from starting. A group already being sent may still go out.",
          "Resume checks the switch, the SMS network and the credit for what is left, then goes on.",
          "The page says who paused it and when.",
        ],
        shots: ["46-paused", "47-resumed"],
      },
      {
        title: "When the system pauses a campaign",
        where: "The campaign's page",
        do: [
          "The page says why in plain words and what to do — for example, top up the credit, or wait for the switch.",
          "Fix what it says, then press Resume.",
        ],
        shots: ["48-system-paused"],
      },
      {
        title: "Stop for good",
        where: "The campaign's page → Stop…",
        do: [
          "A stopped campaign can't be restarted. Messages already handed to the network are not recalled.",
          "Press Stop campaign in the dialog. The page says who stopped it and how many were not messaged.",
        ],
        shots: ["49-stop-dialog", "50-stopped"],
      },
      {
        title: "Make a copy",
        where: "The campaign's page → Make a copy",
        do: [
          "A copy is a new draft with the same message and audience — check and confirm it like any campaign.",
          "A copy messages again anyone the first campaign already reached.",
        ],
        shots: ["51-copy"],
      },
    ],
  },
  {
    title: "8 · Results",
    steps: [
      {
        title: "See what happened",
        where: "The campaign's page → Results",
        do: [
          "Delivered — a delivery receipt came back. Handed over, no receipt yet — the network took it; receipts usually come in seconds.",
          "Failed, and Not sent by reason, say who did not get it and why.",
          "Stopped by their link — people who used the stop link after this campaign.",
          "The estimated spend is shown to the roles that may see money; the SMS credit on System is the true figure.",
        ],
        shots: ["52-finished", "53-results"],
      },
    ],
  },
  {
    title: "9 · Your first campaigns",
    lead: "Do these in order before any big send.",
    steps: [
      {
        title: "Test, then a pilot, then grow",
        where: "Growth → SMS campaigns",
        do: [
          "Send yourself the test in Swahili and in English. Read it on the phone and check the name, the words and the stop link at the end.",
          "Pilot: a list of 5 to 10 staff numbers who agreed. Confirm, start, keep the page open until Finished, and check Results shows Delivered.",
          "First real campaign: 100 to 200 people. Check Results and the SMS credit afterwards.",
          "Then grow step by step — 1,000, then 5,000 — checking the SMS credit before each one.",
          "A campaign of 1,000 people uses about 1,000 SMS, about TZS 6,000. Each campaign is held to the owner's cost limit (TZS 10,000 unless the owner changed it — about 1,600 people); for a bigger one the owner raises it first.",
          "Send in the day, well inside the sending hours, and never send the same message to the same people twice — a copy messages them again.",
        ],
      },
    ],
  },
  {
    title: "10 · Safety",
    steps: [
      {
        title: "What protects every send",
        where: "Everywhere",
        do: [
          "Nothing is sent while the owner's switch is off, or outside the sending hours.",
          "The credit kept for login and withdrawal codes is never spent on marketing — a campaign pauses first.",
          "A campaign can't cost more than its limit; Start refuses it.",
          "Each person is checked just before their message: stopped, withdrawn and self-excluded people are skipped.",
          "Every message carries the stop link, and a stop is for good.",
          "Your role decides what you see and do; every action is recorded with your name and the time.",
          "If anything looks wrong, press Pause, then ask.",
        ],
      },
    ],
  },
];

/** ⭐ The import chapter (U30–U32) — `admin-guide.mjs` puts it where `SECTIONS` holds the "IMPORT" placeholder. */
export const IMPORT_STEPS = [
  {
    title: "Before a big import",
    where: "Growth → Contacts",
    do: [
      "First a pilot: a file of 20 to 50 contacts. Check the result and open a few of them in the book.",
      "Then files of at most 2,000 rows, one import at a time.",
      "Press Export CSV first, so you keep a copy of the book as it was.",
      "Never import while a campaign is being confirmed or prepared — new people in its audience stop it from starting.",
    ],
  },
  {
    title: "Prepare the file",
    where: "On your computer",
    do: [
      "A CSV, Excel (.xlsx) or vCard (.vcf) file: one contact per row, the column names in the first row.",
      "A phone number is the only thing a row needs, in any spelling. Name, e-mail, tags and notes are optional.",
      "The import window offers a CSV or vCard sample to download if you are not sure of the layout.",
    ],
  },
  {
    title: "Choose the file and check its columns",
    where: "Growth → Contacts → Import contacts",
    do: [
      "Choose the file, drop it on the window, or paste the rows from a spreadsheet. Nothing goes into the book yet.",
      "Each column is shown with what it will be read as — Phone, Name, E-mail, Tags or Notes. Change any that is wrong; Not used leaves it out.",
      "Press Check this file.",
    ],
    shots: ["i1-import-button", "i2-columns"],
  },
  {
    title: "Read the check",
    where: "Import contacts → Check before importing",
    do: [
      "Every row is counted: new to the book, already in the book, has a 50pick account, repeated in this file, can't be used, could not be read.",
      "A number repeated in the file is imported once — its first row is used. The book never holds a number twice.",
      "Open a list to see each row that can't be used and why. Fix the file and check it again if many can't be used.",
    ],
    shots: ["i3-check"],
  },
  {
    title: "Choose what happens to numbers already in the book",
    where: "Import contacts → What should the import do?",
    do: [
      "Keep what's in the book (recommended) — contacts already there stay exactly as they are; new numbers are added.",
      "Take the file's version — the file's name, e-mail and notes replace the book's; tags are only added. You see every change before you confirm, and there is no undo.",
      "Fill in blanks only — only a contact's empty details are filled.",
      "A contact on the stop list always stays as it is, and an import never records consent or lifts a stop.",
    ],
    shots: ["i4-decision"],
  },
  {
    title: "Import, and read the result",
    where: "Import contacts → Import",
    do: [
      "The button says what will happen — for example “Import — 2 new · 0 updated · 4 kept”. Press it.",
      "The bar counts the rows as they are written. If the window closes, open Import contacts again to carry on — nothing is written twice.",
      "The result counts what was added, updated, kept and failed; each failure is listed with its row number and the reason.",
    ],
    shots: ["i5-importing", "i6-done"],
  },
];

export const BALANCE_STATES = [
  { shows: "A figure such as TZS 250,000, with no colour", meaning: "The live balance, read just now.", action: "Nothing — check it before a big campaign." },
  { shows: "A figure in amber, “low”", meaning: "The credit is below the alert level.", action: "Ask the owner to top up soon." },
  { shows: "A figure in red, “below floor”", meaning: "The credit is below the floor kept for login and withdrawal codes; marketing must wait.", action: "Ask the owner to top up now." },
  { shows: "“Checking with Blackball… reload in a few seconds”", meaning: "The balance is being read.", action: "Reload the page after a few seconds." },
  { shows: "“Couldn't read the balance”", meaning: "The SMS company did not answer this time.", action: "Reload later. If it stays, tell the owner." },
  { shows: "A red dash with a setup note (keys, sender ID, provider)", meaning: "The SMS connection is not set up correctly on the server.", action: "Tell the owner — login codes may be affected." },
];

export const MESSAGES = [
  // ── the contact form
  { area: "Contacts", message: "This number is already in the book.", meaning: "The number is a contact already.", action: "Press “Open the existing contact →” and edit that one." },
  { area: "Contacts", message: "This number can't be added to the book.", meaning: "This number was erased from 50pick at the person's request.", action: "Do not add it again." },
  { area: "Contacts", message: "A name can't hold a phone number — remove the number from the name.", meaning: "Names show to every staff role.", action: "Take the digits out of the name." },
  { area: "Contacts", message: "A tag can't hold a phone number.", meaning: "Tags show to every staff role.", action: "Use a word (“vip”, “event-oct”)." },
  { area: "Contacts", message: "This doesn't look like an email address (name@example.com).", meaning: "The email is not a complete address.", action: "Fix it, or leave it empty." },
  { area: "Contacts", message: "Someone changed this contact after you opened it, so nothing was saved. Reload to see the latest version, then make your change again.", meaning: "Two people edited the same contact.", action: "Reload, check their change, then make yours." },
  { area: "Contacts", message: "Your role can view contacts but not add or change them — ask an officer with Growth access.", meaning: "Your role is view-only here.", action: "Ask an officer with Growth access, or the owner." },
  { area: "Phone number", message: "A Tanzanian number has nine digits after +255; this one has 8. Check whether some digits were cut off.", check: "Check whether some digits were cut off.", meaning: "A digit or more is missing.", action: "Check the number and type it again." },
  { area: "Phone number", message: "This is an international number outside Tanzania (country code +254…). 50pick sends only to Tanzanian mobile numbers.", check: "50pick sends only to Tanzanian mobile numbers.", meaning: "Only Tanzanian mobiles can be added.", action: "Ask for their Tanzanian mobile number." },
  { area: "Many contacts", message: "The selection changed while it was being read: it now holds … contacts, not …. Nothing was changed; review it again.", check: "The selection changed while it was being read: it now holds ", meaning: "Contacts joined or left the selection meanwhile.", action: "Review it again — the confirmation counts afresh." },
  // ── writing a campaign
  { area: "Writing", message: "The Swahili message is required — it is the one every recipient can be sent.", meaning: "The Swahili message is empty.", action: "Write the Swahili message." },
  { area: "Writing", message: "A campaign goes to a group, never to one phone number — take the number out of the audience. To see the message on a phone, use the test send: it goes to your own number.", meaning: "The audience is one phone number.", action: "Choose a group; use the test send for one phone." },
  { area: "Writing", message: "The character “…” is not in the GSM alphabet, which cuts a message from 160 characters to 70. Replacing it is usually enough.", check: "is not in the GSM alphabet, ", meaning: "A special character makes the SMS hold far fewer characters.", action: "Press “Replace with plain characters”." },
  { area: "Writing", message: "This is 2 messages, and the limit is 1 — you have … characters before the required footer, and this uses ….", check: "characters before the required footer, ", meaning: "The message is too long.", action: "Shorten it until the counter fits." },
  { area: "Test send", message: "Marketing SMS are not switched on yet — a test is refused until the owner switches them on.", meaning: "Sending is off.", action: "Ask the owner to switch marketing SMS on." },
  { area: "Test send", message: "Save first — the test sends the saved text.", meaning: "The test uses the saved message.", action: "Press Save draft, then the test." },
  { area: "Confirm", message: "Nobody matches this audience yet.", meaning: "Nobody in this audience may receive the campaign.", action: "Choose a wider audience." },
  // ── starting and resuming
  { area: "Start", message: "Marketing SMS are switched off. The owner switches them on (Admin → System → Marketing SMS sending), then you can start. Nothing was sent.", meaning: "The owner's switch is off.", action: "Ask the owner to switch them on, then Start." },
  { area: "Start", message: "At today's price this campaign could cost … — more than its limit of …. Stop it and confirm a smaller copy, or the owner raises the limit. Nothing was sent.", check: "Stop it and confirm a smaller copy, or the owner raises the limit. Nothing was sent.", meaning: "The campaign could cost more than its limit.", action: "Confirm a smaller copy, or ask the owner to raise the limit." },
  { area: "Start", message: "Starting would leave less SMS credit than is kept for login and withdrawal codes — credit …, this campaign up to …, kept for codes …. Top up, or narrow the audience. Nothing was sent.", check: "Starting would leave less SMS credit than is kept for login and withdrawal codes", meaning: "Not enough credit for this campaign and the codes.", action: "Ask the owner to top up, or narrow the audience." },
  { area: "Start", message: "The audience grew since it was confirmed — now …, confirmed …. Nothing was sent. Stop this campaign and confirm a new copy.", check: "The audience grew since it was confirmed", meaning: "People joined the audience after it was confirmed — an import, for example.", action: "Stop it and confirm a new copy." },
  // ── while it sends
  { area: "Sending", message: "Keep this page open while it sends — sending continues only while a page like this one is open.", meaning: "This page is what keeps the campaign going.", action: "Leave the page open until it says Finished." },
  { area: "Sending", message: "Waiting for the send window — sending resumes at 08:00 EAT.", check: "Waiting for the send window — sending resumes at ", meaning: "Outside the sending hours.", action: "Nothing — it goes on by itself when the window opens." },
  { area: "Sending", message: "Waiting a moment — the platform is paying out or taking bets, and money always goes first. Sending resumes by itself.", meaning: "Money work comes first.", action: "Nothing — it goes on by itself." },
  { area: "Sending", message: "Waiting — a login or withdrawal code failed in the last two minutes, so marketing steps aside. It tries again at 14:10 EAT.", check: "so marketing steps aside. It tries again ", meaning: "Login codes come first.", action: "Nothing — it tries again by itself." },
  { area: "Sending", message: "Nobody is sending this campaign right now. Open it as an officer who can send, and keep the page open.", check: "Open it as an officer who can send, and keep the page open.", meaning: "No page is open to keep it going.", action: "Open the campaign and keep the page open." },
  { area: "Sending", message: "This page is out of date or lost its connection — reload it to keep sending. Nothing is lost.", meaning: "The page lost touch with the server.", action: "Reload the page." },
  // ── why it paused
  { area: "Paused", message: "Paused — the SMS credit reached what is kept for login and withdrawal codes. Top up, then Resume.", meaning: "The credit ran down to the part kept for codes.", action: "Ask the owner to top up, then Resume." },
  { area: "Paused", message: "Paused — marketing SMS are not switched on: the owner switched them off, the time they were switched on for ran out, or the switch couldn't be read. Once Admin → System shows them on, press Resume.", meaning: "The switch is off.", action: "Ask the owner to switch them on, then Resume." },
  { area: "Paused", message: "Paused — the SMS network refused the last batch, and nothing in it was charged. Check Admin → System, then Resume.", meaning: "The SMS company said no to the last group.", action: "Check System; Resume when it is healthy." },
  { area: "Paused", message: "Paused — some people could not be checked or prepared. Resume to try them again, or Stop.", meaning: "A few people couldn't be checked.", action: "Press Resume to try them again." },
  { area: "Any screen", message: "Couldn't save — your text is still here. Try again.", meaning: "The server did not answer this time. Nothing is lost.", action: "Try again; if it keeps failing, reload, then tell the owner." },
];
