# 11 · The material system — delivered, not yet merged

**Claude Design commission, delivered 2026-08-06.** This folder is the **reference**; the
**product does not use any of it yet**. Nothing here is live until it lands in `src/`, and the
merge map below is the only sanctioned route.

⛔ **Do not import from this folder at runtime.** `material.css` is a *mergeable source*, not a
stylesheet the app loads. Merging it means moving its four sections into the files named below
and then **deleting the section from here**, so this folder shrinks to zero as the work lands.
A copy that survives beside the merged original is a second definition of one truth — the most
expensive defect class this repo has.

---

## What was commissioned, and why

The measured state it corrects (`scripts/ui-material-audit.mjs`, before-picture in
`docs/design-brief/AUDIT.txt`): **79% of components had no light · 60% no elevation · 43 had
neither and no motion.** The diagnosis was not that the motion was wrong — the motion vocabulary
was already disciplined. **It is that nothing had a light source.** The restraint law was right;
answering it with *flatness* rather than with *better material* was the defect.

---

## The files

| file | what it is | fate |
|---|---|---|
| `material.css` | **the mergeable source** — §A tokens · §B keyframes · §C utilities · §D migration map | ⛔ **delete section-by-section as each merges** |
| `EXTEND.md` | **M1–M8, the material law**, written to merge into `docs/DESIGN_AUTHORITY.md` | delete once merged into the authority |
| `MANIFEST.md` | the designer's own decisions of record + 8 open items | **keep** — provenance |
| `DESIGNER-QUESTIONS.md`, `-R2.md` | the questions we asked and the answers that settled them | **keep** — this is *why* each decision is what it is |
| `spec/spec.html` | the live spec — open it in a browser. Self-contained | **keep** — provenance |
| `spec/support.js`, `spec/uploads/*.css` | what the spec page needs to render | **keep**, ⚠️ see below |

⚠️ **`spec/uploads/tokens.css` and `motion.css` are a SNAPSHOT of *our own* files as they stood
on 2026-08-06**, sent out with the brief so the spec could render against real values.
⛔ **They are not a source of truth and must never be copied back into `src/`.** The live files
are `src/app/globals.css` and `src/app/motion.css`. If they ever disagree, the live files win and
the snapshot is simply old.

---

## The merge map — where each section goes

`material.css` is written so a section moves whole. **Tokens first: everything inherits.**

| section | destination | gate after |
|---|---|---|
| **§A** tokens (light, wash, 5 elevation rungs, one gold) | `src/app/law/tokens.css`, in the existing `:root` — **one definition site** | `test:design-frozen` still passes |
| **§B** 12 keyframes (glyph ×6, mark-flip, seal-recoil, needle-sweep, needle-settle, mark-pending-tilt, crest-settle) | `src/app/law/keyframes.css` — ⛔ check the 33 that already exist first; **none of these duplicates one** | `tsc` + `build` |
| **§C** 29 utilities (`.mat-*`, `.g-*`, `.gilt-*`, `.mark-*`, `.seal-*`, `.crest-*`, `.needle-*`) | `src/app/law/motion.css`, beside the `.m-*` family | `test:motion-ladder` (ratchet is at **0** — keep it there) |
| **§D** migration map | ⛔ **comment only — delete it once the migration it maps is done** | — |
| `EXTEND.md` M1–M8 | `docs/DESIGN_AUTHORITY.md` as section M, in the authority's own voice | `test:integrity` |

⭐ **The proof it worked is that the ratchets SHRINK.** `test:design-frozen` holds **45** files
carrying inline design values today. Several stop needing the exemption once §A lands. **A merge
that leaves it at 45 decorated rather than replaced** — that is `INTAKE.md` §3b, and it is the
part most likely to be skipped.

---

## The eight laws, in one line each (full text in `EXTEND.md`)

| | |
|---|---|
| **M1** | **One lamp**, high and tilted **−14°** — the mark's own axis. Even 1px inner ring, 4% royal tint, never pure white, never one-sided. **The tilt lives in the light, never in the gravity.** A surface lit from below or the right is a bug |
| **M2** | **A surface picks a rung; it never composes a shadow.** `flat → raised → float → modal → toast`. `flat` is a legitimate rung, not a failure. Every arrival has its exit; there is no third entrance |
| **M3** | **Gold is struck, and struck means earned.** One satin ramp re-derived from the trademark's `#E3BC66`. **No bloom — radial glow dilutes the financial texture. Rays are banned.** A decorative element wearing `--gilt-metal` is a violation |
| **M4** | **Money is mono and never reflows** — `tabular-nums`, never letter-spaced. Tracking is for identifiers; money has weight |
| **M5** | **A glyph moves for a reason, and all 185 move the same way.** Four primitives, triggered by mount/data/state — **never hover.** Icons respond, they do not perform |
| **M6** | **Every animation still works with motion off** — a written `prefers-reduced-motion` branch *and* the `html.kp-reduce-motion` mirror, or it does not land |
| **M7** | **Wins get the seal; losses get the receipt.** The celebration vocabulary is EXCLUSIVE to a win. No red ceremony, no drained counters, no altered mark — a dramatised loss is punitive and a compliance liability. **The asymmetry is the design** |
| **M8** | **The mark performs; nothing else borrows its stage.** Identity motion is reserved for the trademark. Clear space `0.25 × diameter` is law even inside our own seal |

---

## Open items the designer flagged — carried here so they are not lost

1. **React/TSX drop-ins** — win-celebration, toast, market-card matching our existing props. *Offered, not yet delivered.*
2. **Icon restyle pass** across all 185 glyphs (stroke 2.0, 2px live-area margin, 0.75px join radius). *Needs the set sent over.*
3. ✅ Loss needle-settle — **delivered** (`needle-settle` + `.needle-settle-loss`).
4. **`--shadow-card-top`** — confirm whether `globals.css` already defines it; if so, delete §A2's alias.
5. **D-0 celebration font row** — the authority table says `--font-display` for the amount; **M4 says mono wins.** Amend the table when merging.
6. **SW/ZH proof** — the celebration is verified in three languages; toasts, cards and menus are EN-only in the spec. **Verify at merge** (see `scripts/live-s32-card360.mjs` for the pattern).
7. **`m-axis-sweep` duplication** — the one place `−14°` is written twice, because `skewX()` cannot take a custom property everywhere. **If the axis changes, change both** (`DESIGN_AUTHORITY` B1a).
8. **Crest chief-band opacity** — `0.26` recommended and demoed. **Ship decision is ours.** E-111 fixed the geometry; this is the material.

---

## Related

- `docs/design-brief/INTAKE.md` — the integration playbook: §1 acceptance, §2 placement, §3 order, **§3b what DIES when each piece lands**, §3c drive it on production, §8 what changed under the brief
- `docs/design-brief/CURRENT-STATE.md` — the critique this answers · `AUDIT.txt` — the before-picture
- `docs/DESIGN_AUTHORITY.md` **B1a** — the mark, the measured axis, and why the trademark's gold never moves
- `../08-motion/` — the existing motion system this extends · `../09-needle/` — the needle it borrows
