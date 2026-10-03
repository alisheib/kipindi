/**
 * THE ADMIN GUIDE'S WORDS — the steps, the SMS balance's states and every message an admin can meet, for
 * `admin-guide.mjs`. ⛔ Each MESSAGES row is checked against the source before the guide builds (`check` is a fixed part
 * of a sentence that carries a number; `message` is the sentence otherwise): a reworded message fails the build, so the
 * guide never quotes a sentence the platform no longer says. Plain English for staff — no code words.
 */

export const INTRO = [
  "These screens are for staff with the Admin or Growth role. Other roles can see the menu items they are allowed to see, or none.",
  "Nothing is sent to anyone from these screens yet. Writing contacts and saving campaign drafts is safe: the owner switches SMS sending on before the first real campaign.",
  "Every change you make is recorded with your name and the time.",
  "Some roles see phone numbers hidden (like +255••••78). That is on purpose: only roles allowed to read numbers see them in full.",
  "A contact is any phone number in the book. Every 50pick player is a contact automatically — when someone signs up, their number joins the book by itself.",
];

export const SECTIONS = [
  {
    title: "1 · Signing in and finding the screens",
    steps: [
      {
        title: "Sign in to the admin console",
        where: "https://50pick.tz/auth/admin",
        do: ["Open the address above.", "Enter your staff phone number and password, then your 2-step code if asked.", "You land on the admin console."],
        shots: ["01-sign-in"],
      },
      {
        title: "Find Contacts and SMS campaigns in the menu",
        where: "The menu on the left → Growth → Contacts, and Growth → SMS campaigns",
        do: ["On a computer the menu is on the left. On a phone, open it with the menu button at the top.", "Under Growth you will find Contacts (the book of numbers) and SMS campaigns (the messages)."],
        shots: ["02-menu"],
      },
    ],
  },
  {
    title: "2 · The contact book",
    lead: "Growth → Contacts is the book of phone numbers 50pick can reach. It shows how many contacts there are, lets you search and filter, and lets you add, edit, tag and export.",
    steps: [
      {
        title: "Read the contact book",
        where: "Growth → Contacts",
        do: [
          "The tiles at the top count the book. Roles that may read numbers also see how many gave consent and how many are stopped.",
          "The filters on the left (or at the top on a phone) narrow the list by operator, list or tag.",
          "The search box finds a name, or a whole phone number in any spelling.",
          "Each row is one contact. Tick rows to act on several at once.",
        ],
        shots: ["03-contacts"],
      },
      {
        title: "Open Add contact",
        where: "Growth → Contacts → Add contact (top right, marked in red)",
        do: ["Press Add contact. The form opens over the list, with the cursor in the phone box."],
        shots: ["04a-add-button", "04-add-empty"],
      },
      {
        title: "Fill it in and save",
        where: "Growth → Contacts → Add contact",
        do: [
          "Type or paste the phone number in any spelling — 0712 345 678, +255 712 345 678 or 255712345678. The box keeps the nine digits after +255.",
          "As soon as the number is complete, the form shows its network (Vodacom, Airtel, Yas, Halotel…) and checks the book.",
          "Add a name, an email, notes and tags if you have them — all optional.",
          "Press Save. A message confirms it and the new contact appears in the list.",
        ],
        shots: ["05-add-filled", "06-added"],
        notes: ["Pasting a whole number into the phone box replaces what was there, so two numbers can never mix into one."],
      },
      {
        title: "When the number is already in the book",
        where: "Growth → Contacts → Add contact",
        do: ["The form says the number is already in the book and offers “Open the existing contact →”.", "Open it and edit that contact instead of adding a second one."],
        shots: ["07-duplicate"],
      },
      {
        title: "When the form shows a problem",
        where: "Growth → Contacts → Add contact (or a contact's Edit)",
        do: [
          "Each problem is written in red under its own field, and the first one is selected for you.",
          "Fix what it says, then press Save again. Nothing is saved until every field is fine.",
          "A name or a tag can't hold a phone number — the number belongs in the phone box.",
        ],
        shots: ["08-form-errors"],
      },
      {
        title: "Edit a contact",
        where: "Growth → Contacts → the row's edit link",
        do: ["Press the edit link on the contact's row.", "Change the name, email, notes or tags, then Save.", "The phone number itself can't be changed — add a new number as a new contact."],
        shots: ["09-edit"],
      },
    ],
  },
  {
    title: "3 · Finding contacts",
    steps: [
      {
        title: "Search by name or by number",
        where: "Growth → Contacts → the search box",
        do: [
          "Type part of a name to find matching contacts.",
          "Type a WHOLE phone number, in any spelling, to find that one contact. Part of a number never searches numbers (it keeps hidden numbers hidden).",
          "The line above the table says what the list is showing.",
        ],
        shots: ["10-search-name", "11-search-number"],
      },
      {
        title: "Filter the list",
        where: "Growth → Contacts → the filters",
        do: ["Press an operator, a list or a tag to show only those contacts.", "Press it again, or Clear, to show everyone."],
        shots: ["12-filter"],
      },
    ],
  },
  {
    title: "4 · Working on many contacts at once",
    steps: [
      {
        title: "Select contacts and choose an action",
        where: "Growth → Contacts → tick rows → the bar that appears",
        do: [
          "Tick the boxes on the rows you want (or “select all matching” to take every contact the filter shows).",
          "The bar shows the actions: Tag, Untag, Add to list, Record a withdrawal, Suppress and Remove.",
        ],
        shots: ["13-bulk-bar"],
      },
      {
        title: "Confirm — the server counts first",
        where: "Growth → Contacts → an action → the confirmation",
        do: [
          "Up to 50 ticked rows: the confirmation names them. More than 50, or any “select all matching”: type the number of contacts the server counted.",
          "Press the action's button. A message says how many changed.",
        ],
        shots: ["14-bulk-confirm", "15-bulk-done"],
        notes: [
          "Suppress stops a number from EVER receiving marketing, and nobody can undo it — use it when a person or the Gaming Board asks 50pick to stop.",
          "Remove deletes the contacts from the book; the records of consent and stops are kept.",
        ],
      },
      {
        title: "Export the list",
        where: "Growth → Contacts → Export CSV (top right)",
        do: ["Filter the list first if you want only part of it.", "Press Export CSV. The file downloads to your computer.", "Roles that can't read numbers get a file with the numbers hidden."],
        shots: ["16-export"],
      },
    ],
  },
  {
    title: "5 · SMS campaigns",
    lead: "Growth → SMS campaigns is where messages are written and kept. Today you can write, check, save and reopen drafts. Sending starts once the owner switches SMS on.",
    steps: [
      {
        title: "See the campaigns",
        where: "Growth → SMS campaigns",
        do: ["Every campaign is listed with its status. A draft is a message still being written.", "Press New SMS campaign to start one."],
        shots: ["17-campaigns"],
      },
      {
        title: "Write the message",
        where: "Growth → SMS campaigns → New SMS campaign",
        do: [
          "Give the campaign a name (only staff see it).",
          "Write the Swahili message — it is required, because every recipient can receive it. It must start with “50pick”.",
          "English is optional: players whose account language is English get it; everyone else gets Swahili.",
          "A campaign message must fit in ONE SMS. The counter under each message shows the room left before the footer; the stop link is added for you and counted.",
        ],
        shots: ["18-compose-empty", "19-compose-filled"],
      },
      {
        title: "Fix what the composer marks",
        where: "Growth → SMS campaigns → the message",
        do: [
          "A character outside the plain SMS alphabet (a curly quote, an emoji) turns the message into Unicode, which fits far fewer characters. The composer names the character; press “Replace with plain characters” or retype it.",
          "Too long for one SMS? The composer says how many characters you have before the required footer.",
        ],
        shots: ["20-compose-warning"],
      },
      {
        title: "Choose who it is for",
        where: "Growth → SMS campaigns → Audience",
        do: [
          "The audience is the contact book, or the part of it a filter on the Contacts page chose.",
          "A campaign always goes to a group — never to one phone number.",
        ],
        shots: ["21-audience"],
      },
      {
        title: "Save the draft",
        where: "Growth → SMS campaigns → New SMS campaign → Save draft",
        do: ["Press Save draft. The line beside it says when it was saved — and that nothing was sent."],
        shots: ["22-saved"],
      },
      {
        title: "Open a draft again",
        where: "Growth → SMS campaigns → the draft's name in the list",
        do: ["Every saved draft is in the list. Press its name to open it again, exactly as you left it."],
        shots: ["23-campaigns-draft", "24-reopen"],
      },
      {
        title: "The test send",
        where: "Growth → SMS campaigns → a saved draft → Test send",
        do: [
          "The test sends the saved message to a phone so you can see it as a recipient will.",
          "Until the owner switches SMS sending on, the test says so and sends nothing.",
        ],
        shots: ["25-test-send"],
        notes: ["Coming next: the test will take any number you type, not only your own."],
      },
    ],
  },
  {
    title: "6 · The SMS balance",
    steps: [
      {
        title: "See how much SMS credit is left",
        where: "The menu → System → the “SMS credit” tile at the top",
        do: [
          "The tile shows the credit left with the SMS company, in TZS, read live.",
          "Each SMS costs about TZS 6. Login and withdrawal codes use the same credit, so never let it run out.",
          "The table below explains every state the tile can show.",
        ],
        shots: ["26-sms-credit"],
        notes: ["This screenshot comes from a test server, which has no real credit. On 50pick.tz the tile shows the live balance."],
      },
    ],
  },
  {
    title: "7 · On a phone",
    steps: [
      {
        title: "The same screens on a phone",
        where: "Any of the screens above, on a phone's browser",
        do: ["Everything works on a phone: the filters move to the top, and the menu opens from the top bar."],
        phoneShots: ["27-phone-contacts", "28-phone-compose"],
      },
    ],
  },
];

export const BALANCE_STATES = [
  { shows: "A figure such as TZS 250,000, with no colour", meaning: "The live balance, read just now.", action: "Nothing — keep an eye on it before a big campaign." },
  { shows: "A figure in amber, “low”", meaning: "The credit is below the alert level.", action: "Ask the owner to top up soon." },
  { shows: "A figure in red, “below floor”", meaning: "The credit is below the floor kept for login and withdrawal codes; marketing must wait.", action: "Ask the owner to top up now." },
  { shows: "“Checking with Blackball… reload in a few seconds”", meaning: "The balance is being read.", action: "Reload the page after a few seconds." },
  { shows: "“Couldn't read the balance”", meaning: "The SMS company did not answer this time.", action: "Reload later. If it stays, tell the owner." },
  { shows: "A red dash with a setup note (keys, sender ID, provider)", meaning: "The SMS connection is not set up correctly on the server.", action: "Tell the owner — this is a technical setting, and login codes may be affected." },
];

export const MESSAGES = [
  // ── the contact form
  { area: "Add / edit contact", message: "This number is already in the book.", meaning: "The number is a contact already.", action: "Press “Open the existing contact →” and edit that one." },
  { area: "Add / edit contact", message: "This number can't be added to the book.", meaning: "This number was erased from 50pick at the person's request.", action: "Do not add it again." },
  { area: "Add / edit contact", message: "A name can't hold a phone number — remove the number from the name.", meaning: "Names show to every staff role, while numbers are hidden for some.", action: "Remove the digits from the name; the number goes in the phone box." },
  { area: "Add / edit contact", message: "A tag can't hold a phone number.", meaning: "Tags show to every staff role.", action: "Use a word, not a number (e.g. “vip”, “event-oct”)." },
  { area: "Add / edit contact", message: "A tag can hold only letters, digits, spaces, - and _.", meaning: "The tag has a character tags can't hold.", action: "Remove the character." },
  { area: "Add / edit contact", message: "This doesn't look like an email address (name@example.com).", meaning: "The email is not a complete address.", action: "Fix it, or leave the email empty." },
  { area: "Add / edit contact", message: "A name can be at most 120 characters.", check: "A name can be at most", meaning: "The name is too long.", action: "Shorten it." },
  { area: "Add / edit contact", message: "Notes can be at most 1000 characters.", check: "Notes can be at most", meaning: "The notes are too long.", action: "Shorten them." },
  { area: "Add / edit contact", message: "Someone changed this contact after you opened it, so nothing was saved. Reload to see the latest version, then make your change again.", meaning: "Two people edited the same contact.", action: "Reload, check their change, then make yours." },
  { area: "Add / edit contact", message: "Your role can view contacts but not add or change them.", meaning: "Your role is view-only here.", action: "Ask an officer with Growth access, or the owner." },
  // ── phone numbers
  { area: "Phone number", message: "A Tanzanian number has nine digits after +255; this one has 8. Check whether some digits were cut off.", check: "Check whether some digits were cut off.", meaning: "A digit or more is missing.", action: "Check the number with the person and type it again." },
  { area: "Phone number", message: "This is an international number outside Tanzania (country code +254…). 50pick sends only to Tanzanian mobile numbers.", check: "50pick sends only to Tanzanian mobile numbers.", meaning: "Only Tanzanian mobiles can be added.", action: "Ask for their Tanzanian mobile number." },
  // ── many contacts at once
  { area: "Bulk actions", message: "Type one tag at a time — a comma, ; or | separates tags.", meaning: "The bulk Tag box takes one tag.", action: "Type a single tag." },
  { area: "Bulk actions", message: "A list name can't hold a phone number — remove the number from the name.", meaning: "List names show to every staff role.", action: "Name the list with words." },
  // ── campaigns
  { area: "SMS campaign", message: "Give the campaign a name — only staff see it.", meaning: "The name is empty.", action: "Type a name." },
  { area: "SMS campaign", message: "The Swahili message is required — it is the one every recipient can be sent.", meaning: "The Swahili message is empty.", action: "Write the Swahili message." },
  { area: "SMS campaign", message: "A campaign name can't hold a phone number — the digits ending 78 read as one, and campaigns are kept for good.", check: "A campaign name can't hold a phone number", meaning: "Campaigns are never deleted, so a number in a name would be kept for ever.", action: "Name the group it is for; write other figures with a comma or a slash." },
  { area: "SMS campaign", message: "A campaign goes to a group, never to one phone number — take the number out of the audience. To see the message on a phone, use the test send: it goes to your own number.", meaning: "The audience is one phone number.", action: "Choose a group (a filter); use the test send for one phone." },
  { area: "SMS campaign", message: "The character “…” is not in the GSM alphabet, which cuts a message from 160 characters to 70. Replacing it is usually enough.", check: "is not in the GSM alphabet, ", meaning: "A special character (curly quote, emoji…) makes the SMS hold far fewer characters.", action: "Press “Replace with plain characters”, or retype it." },
  { area: "SMS campaign", message: "This is 2 messages, and the limit is 1 — you have … characters before the required footer, and this uses ….", check: "characters before the required footer, ", meaning: "The message is too long.", action: "Shorten it until the counter is within the limit." },
  { area: "SMS campaign", message: "Nothing to save — no changes since the last save.", meaning: "The draft is already saved as it is.", action: "Nothing — your draft is safe." },
  { area: "SMS campaign", message: "Couldn't save — your text is still here. Try again.", meaning: "The save did not reach the server.", action: "Press Try again; your text is not lost." },
  { area: "SMS campaign", message: "This campaign is no longer a draft — its message can't change.", meaning: "The campaign moved on from draft.", action: "Start a new campaign for a new message." },
  { area: "SMS campaign", message: "Your role can't write or test SMS campaigns — ask an officer with growth access.", meaning: "Your role can't use the composer.", action: "Ask an officer with Growth access, or the owner." },
  // ── the test send
  { area: "Test send", message: "Marketing SMS are not switched on yet. The owner switches them on before the first send.", meaning: "Sending is still off for everyone.", action: "Nothing — the owner switches it on before the first campaign." },
  { area: "Test send", message: "Save first — the test sends the saved text.", meaning: "The test uses the saved version of the message.", action: "Press Save draft, then the test." },
];
