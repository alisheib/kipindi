# S6-DOCS drafts for the lead (no code until approved)

## (n) Timeless approved campaign wordings (MB-47) — replace the first wording in each language
Today's first wordings say "this week's questions" / "maswali ya wiki hii", false whenever no week is on sale.
- EN: "50pick: Millionea. The Jackpot is shared equally by every 10/10 ticket; {pct}% fee at payout. Each week's questions are in the 50pick app."
- SW: "50pick: Millionea. Jackpot inagawanywa sawa kwa kila tiketi ya 10/10; ada {pct}% wakati wa malipo. Maswali ya kila wiki yako kwenye programu ya 50pick."
(The second wordings are already timeless. The R-HEADLINE facts and {pct} are unchanged; the claims lint's approved list moves with them.)

## (o) The death script (MB-86) and the Terms' Millionea section (OD-18) — for the legal review on Ali's list
- Death script: as written in src/lib/maswali-support-scripts.ts ("death"), en and sw, marked "This wording awaits legal review".
- Terms: drafted in all three languages in docs/MASWALI-ARCHITECTURE.md §9 (RULES.md points there). OD-18: existing terms do not change.
- GBT's OD-08 answer: still owed (Finance's is recorded, COMPLIANCE 2026-10-21 item 5).

## (p) A UI lane's list
MB-33 (the register's criteria and seal evidence), MB-70 (the slip's rules strip), L17 ("corrected on objection" on the public register).

## Item 7 · the privacy notice (not done — plan and words)
Both doors are built: the holder's own download carries each ticket with its salt; the bundle an officer prepares carries it without.
Words (inside MillioneaWording, printed only above the ceiling; sw and zh for native review at Gate B):
- §5 Retention, EN: "Maswali Millionea tickets — the answers you picked, the random number that seals them and each ticket's result: at least 7 years, as part of your betting record; they stay when an account is closed or erased."
- §6 Your rights, EN: "Your Millionea tickets: the copy you download from your account includes each ticket's answers, its result and the random number that seals it, so you can check it on our fairness page yourself; a copy our staff prepare leaves that number out."
Plan: the version above the ceiling moves 2026-10-17 → 2026-10-22 (PRIVACY_VERSION_WITH_MILLIONEA, test:privacy-notice's PRIVACY_VERSION_MILLIONEA and PRIVACY_EN_SHA_MILLIONEA re-measured), a dated "Privacy v2026-10-22" COMPLIANCE entry, D19a's privacy pin moved to the commit, and scripts/lib/s8-published-words.mts extended — it accepts exactly three wrappers (the slip paragraphs, at one indent) today, so it must classify each wrapper by its data-policy-addition and pin each kind's hashes per language.

## The binding rules' §6 now that the objection door is built (needs the lead's word)
§6 says a holder "may raise it with support, naming the question" and only the sealer's own correction; the file's header and test:maswali-fairness L.13 refuse the objection's words "until it is built". S7-OB built it (MR-16 as built): the holder objects to one question from the ticket's page inside the window; a Compliance officer who did not seal, confirm or set the result rules — reject, or reverse, void (a closed-list ground) or reinstate; an upheld change re-grades and restarts the window once; the week pays only once every objection is decided. Proposed EN (sw and zh to follow the dictionary's obj* words):
"During it, a holder of an uncancelled ticket in the week who believes a result is wrong may object to that one question from the ticket's page, once per question, giving a reason. An officer who did not record the result rules on it: the result stands, or it is reversed, voided or reinstated; a ruling that changes the counted results grades the week again and starts the window once more. The week pays out only once every objection is decided." A move of the binding text: hash, COMPLIANCE line, D19a re-pin, L.13 re-aimed.
