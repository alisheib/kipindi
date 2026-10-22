# Tile reader brief — the Millionea hub (`/millionea`), round 2, run a

You are reading screenshots for the HUB design lane of 50pick (a Tanzania-licensed real-money prediction market; one
dark-royal theme; three languages: Swahili `sw` — the longest — English `en`, Chinese `zh`). Maswali Millionea is a
weekly 15-question jackpot ticket; `/millionea` is its hub page. Your job: find VISUAL and TEXT-LAYOUT defects, exactly,
with evidence. Read every file in your list with the Read tool, one by one. Do not skip any. Do not guess: if you are not
sure, say "uncertain". Never report something you did not see in a file.

## The files
- Full-resolution contact sheets (`*__sN-sM.png`): 2–4 viewport tiles side by side, each under a strip naming its file.
  `-s1` (no suffix) is the top of the page; `-s2`, `-s3`… scroll down (each tile overlaps the previous by ~240px).
- Single desktop tiles (1024 / 1280 / 1920 wide, 780 tall).
- The file name says: `<state>-<shell>-<lang>-<width>[-sN]`. States: open (a week on sale, signed in, holding a ticket),
  guest (signed out), paused (sales paused), break (the player on a responsible-gambling break), cap (holding the
  maximum 10 tickets), moved (the sales close was moved), closing (last hour), closed (sales closed), resolving (results
  coming in), objections (objection window), settling, noweek (no week on sale), noweek-paused, after (after settlement:
  notices), voiding (a week being voided), voided, cancel (a just-bought ticket with its free-cancel line), press.
  Shell: `classic` (top bar on desktop, bottom rail on phones) or `journey` (a simplified shell).

## KNOWN — do not report these
- The round chat bubble (bottom-right) and the green circular "Needle" gauge at the right edge overlapping the edge of
  content: platform items, handled elsewhere.
- The Next.js development badge (an "N" circle or a "Rendering…" pill, bottom-left).
- `ghost-*` files (loading drawings) — being rebuilt now.
- In signed-in states, the reader's own tickets ("Tiketi zako wiki hii / Your tickets this week" and the ticket rows)
  standing ABOVE the pool's ledger rows: this order is being changed now. Do report anything else wrong inside them.

## Look for (each one you find: report it)
1. Text clipped, cut off, or overflowing its box; text overlapping another element; anything under the bottom rail or
   the header that should not be.
2. Misalignment: columns that do not line up, a chip not centred on its line, inconsistent left edges, uneven spacing
   between similar blocks, a big unexplained empty gap.
3. Line breaking: a short word or a number stranded alone on its own line inside a sentence or a "·"-joined fact line
   (an orphan, e.g. "ya 10/10" alone); a line that starts or ends with "·"; a weekday separated from its time
   ("Ijumaa" at a line's end and "18:00" on the next); a money figure split ("TZS" / "1,000").
4. Numerals: digits drawn in the ordinary body font while the line's other numbers are in the monospaced numeral font
   (look at the digit shapes: the numeral face has a slashed or dotted zero and fixed-width digits).
5. Language: English words on a Swahili or Chinese page (brand names like Millionea, 50pick, TZS, EAT, M-Pesa are fine);
   in Chinese, a space between two Chinese characters (a space is right only between a Chinese character and a Latin
   letter or a digit).
6. Gold / yellow ink on a money figure that is NOT a won amount (the jackpot, the pool, the floor, a carry-over must never
   be gold).
7. Broken things: an empty box, a blank icon square, duplicated content, a cut-off button, a tap target visibly smaller
   than its neighbours, a sticky column sliding under the header on desktop.
8. Anything that looks unpolished to a demanding UI designer — say why.

## Report format (plain text, nothing else)
FINDINGS:
- <file> · y≈<px> · <element> · <what is wrong> · <high|med|low> · <sure|uncertain>
COVERAGE: <number of files read> of <number in your list>; any file you could not read.
Keep each finding to one line. Group identical findings across files into one line listing the files.
