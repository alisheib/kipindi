# design-brief — NO OPEN WORK ORDER

⚪ **The round-2 design-kit inheritance is CLOSED. There is nothing here to pick up.**
**Start from [`docs/NEXT-PLAN.md`](../docs/NEXT-PLAN.md), not from this file.**

⚠️ This file has held a live work order for each of the five batches in turn. It is emptied at the
close of each one **on purpose**: a spent brief that still opens with *"paste this whole file as
your opening prompt"* is the most expensive kind of stale document, because it reads as a
commission and sends a session to redo finished work. If you are adding a new brief here, you are
opening a new batch — say so, and empty it again when it ships.

---

## Where the programme reached

**Five batches, all shipped and live.** The record is
[`PLAN-OF-RECORD.md`](PLAN-OF-RECORD.md): §6 is the batch log, §8.7a–§8.7h the per-batch
accounts, §8.8 the deferred register, §8.9 the instruments left behind.

| Batch | What it did | Landed |
|---|---|---|
| 0 · 1a–1d | Kit filed + acceptance; design files organised; **22 design gates wired into `predeploy`** (they were 4, and the chain was broken); baseline re-proven green | `78b7f000` · `c7cb34ec` · `fd66292b` |
| **1** | `/markets` rebuilt on the inherited contract — the 13-pill rail deleted for the sticky two-row bar; every count cross-filtered. **Re-validated after: two of its six controls were unusable on a phone** (a 362px menu panel clipped to **4px**) | + `test:discovery-contract` |
| **2** | The hero — photographic backdrop **deleted**, replaced by the kit's question board on real market data. Re-validation found a defect batch 2 had itself shipped (the hero stated its lead market twice) | + `test:hero-contract` |
| **3** | Landing composition, header, rail. 🔴 **The ticker was FABRICATED** — a hardcoded synthetic array on every page — and was rebuilt on real settlements | + `test:landing-contract`, `test:ticker-honesty` |
| **4** | Cleanup + the deferred trio. 🔴 The RG line **duplicated the footer** (a 320px void, not the 192px estimated); a **THIRD** time-left formatter copy the plan said didn't exist | + `test:time-left` |
| **5** | **ONE filter language** — one primitive, **eight** rails (the brief said six). 🔴 The reference was breaking its own law-82; a filter control was wearing the money ink; batch 4's `::after` hit-area trick **measured 36px, not 40** | + `test:filter-language` |

## What is still open — all of it is a DECISION, none of it is unfinished work

⛔ **Do not re-open these as if they were omissions.** Each has a written reason in §8.8.

**Carried forward, Ali's call 2026-08-13** — density toggle / compact list · the mobile filter
sheet · search typeahead. Each is a genuinely new component, not a restyle.

**Ali's Phase-3 token call** — the `--h-control-*` raise and the `--type-nano` / `--type-label`
raise (§5 decision 7).

**Named by batch 5, awaiting a ruling** (§8.8) — `/markets`' chips announce `aria-pressed` on an
`<a>` (a role mismatch; the primitive already supports both, so it is one prop) · `.pchart-range`
sits at 40px rather than the rails' 44 · `rounded-pill` is a hard-typed `"999px"` beside
`--r-pill` · admin filter rails · `/wallet`'s section tabs.

**Not a design item, and Ali's to unblock** — 🔴 the QA player personas cannot sign in on
production (this laptop's `.env.qa.local` is **stale**; diagnosed read-only, ⛔ **not** re-minted).
It left four authed rails verified on localhost rather than production. Full account in
`docs/LIVE-QA-CAMPAIGN.md` §1.

**Parked at Ali's instruction** — A6 / admin 2FA (*"later, we do keep pending"*).
