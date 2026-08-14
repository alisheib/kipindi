# ⛔ THE TWO `.docx` FEE HAND-OUTS ARE SUPERSEDED — do not read them as current

> **[`docs/RULES.md`](RULES.md) is the single authority on what 50pick charges.**
> This note exists because the two files below **cannot carry a banner of their own**: they are
> binary Word documents, and a reader who opens one sees only what it says.

| File | Dated | What it states | Status |
|---|---|---|---|
| `50pick-fee-decision.docx` | 2026-07-14 | *"We take our fee from the whole pool… the fix: charge only on MATCHED money"* | ⛔ superseded twice over |
| `50pick-fee-model-examples.docx` | 2026-07-14 | *"Matched money = 2 × the smaller side. Fee = 10% of the matched money."* Rates table: **TRA 4% · Commission 3% · Reserve 2% · Payment providers 1% = 10% of matched money**, early-exit fee 9% | ⛔ superseded twice over |

## Why this is worth a file of its own

⛔ **These are HAND-OUTS.** Their own first lines say *"For the team to read and decide"* and
*"Prepared for the team"*, and every concern in them is written in red for the reader to argue
with. That is the most dangerous kind of stale document: a person opens it, believes it, and
quotes a rate in a meeting. `docs/` already records the cost of exactly this shape — a
checked-in spreadsheet labelled "ready-to-import" that was not.

⛔ **AND THEY ARE NOT MERELY OUT OF DATE — THEY DESCRIBE A MODEL THAT NEVER SHIPPED, AND EVERY
FIGURE IN THEM IS WRONG TODAY.** The live rule is **13% of the LOSING side**, taken as
platform 3% + operator 10%, with **TRA 10% and GBT 5% levied on OUR FEE ONLY** — never on a
player's payout. Set against the examples document:

| Their number | The live rule |
|---|---|
| fee basis: `2 × smaller side` ("matched money") | the **losing side** |
| fee: **10%** of that | **13%** of that |
| TRA: **4% of matched money** | **10% of our fee** |
| Commission: **3% of matched money** | operator **10%** + platform **3%** = our 13% fee |
| Reserve **2%**, payment providers **1%** | neither exists |
| early-exit fee **9%** | free exit inside 5 minutes, then no sale |

⚠️ **They are kept, not deleted.** They are the record of a real decision meeting, and 4,220
Up & Down rounds on production are frozen at a model from that era and settle by it forever. A
regulator asking why a July round paid what it paid is asking about documents like these. What
must not happen is a reader taking them for current — which is what this note prevents.

⭐ **If either is ever handed to anyone again, regenerate it from `docs/RULES.md` first.** The
two rates PDFs (`50pick-betting-rules-final.pdf`, `50pick-rates-for-admins.pdf`) were
regenerated and rasterised for exactly this reason in session 2; these two were not, because
nothing in the repo generates them.
