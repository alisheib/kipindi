# CONTACTS SCREEN — the importer and the screen's hardening (lane S15)

**STATUS — 🟢 OPEN · 2026-10-09 · Ali-Blade15 · branch `contacts-import`, pushed `HEAD:main` step by step.**
⛔ A file import is NOT live yet: the readers and the staging table exist, but no screen reaches them (§2).

> This file is the plan AND the progress record of the contacts-screen lane. Read §0 first. The rest of the
> marketing programme (the campaigns) is tracked in [`MARKETING-CAMPAIGN-AND-CONTACTS-SETUP.md`](MARKETING-CAMPAIGN-AND-CONTACTS-SETUP.md).

---

## §0 — RESUME AT

```
LANE SPLIT (Ali, 2026-10-09 ~00:30 EAT — his words: "lets do something else and push live … how to handle import of
contacts, make it more solid, duplicate detection ui ux, perfection of visuals, validations, crash control, stress
testing everything … keep the original plan for them, let them finish it, make your own progress and push live";
then: "the contacts screen"):

  S15 (Ali-Blade15) OWNS the contacts screen, /admin/contacts:
    · the importer — U30 (the pre-flight), U31-B (the facts loader and the choice for numbers already in the book),
      U32 (the commit loop and its bar, resumable), U34b (an export read back through the importer)
    · duplicate detection — inside a file, against the book, and on Add contact
    · every field's validation, the screen's visuals at every width and language, crash control, stress tests
  S14 (OMEGA-COMPILE01) KEEPS the campaign path — the marketing tracker's §0 ▶ NEXT (the owner texts on production,
    U47b-2, U48a, licence outreach, the dry-fire, U52a, the admin guide v2, the clean-up).
  ⛔ Neither session starts or pushes the other's units. Files both lanes touch (contacts-copy.ts, page.tsx,
    package.json, the marketing tracker) are MERGED, never overwritten.
  ⭐ S14's admin guide (scripts/live/admin-guide.mjs, importShots — on origin/backup/marketing-s14-guide) already
    pictures the import by these data-block names, so S15 builds the dialog to them: contacts-import, import-entrance,
    import-adopt, import-preflight, import-file, import-mapping, import-mapping-next, import-apply, import-commit,
    import-done, and the dev seed POST /api/dev-test/marketing-contacts-seed?u30=1.

▶ NOW: C1 (this file, the claim) → C2, the audit of what is live on the screen today.
```

## §1 — STEPS (each its own commit, push and live proof)

| # | Step | State |
|---|---|---|
| C1 | The lane claimed and this plan written | 🔨 this push |
| C2 | Audit of the LIVE screen: tiles at 360 / 768 / 1280 / 1440 in en / sw / zh, every field's validation, every failure path (a server error, a slow network, a double press, two tabs) → the defects fixed | ⬜ |
| C3 | The importer, part 1 — the file, the columns, the pre-flight (U30 + U31-B): staging only, nothing written to the book | ⬜ |
| C4 | The importer, part 2 — the commit loop and its bar (U32): counted by the server, resumable after a closed tab or a crash | ⬜ |
| C5 | Duplicate detection, seen and decided: repeats inside a file, numbers already in the book (keep · update · skip), Add contact's duplicate | ⬜ |
| C6 | Stress: large files at the limits, a large book, two imports at once, a crash mid-commit and its resume | ⬜ |
| C7 | U34b — an export read back through the importer, row for row | ⬜ |

## §2 — WHAT EXISTS TODAY (read from the code, 2026-10-09)

- **Live on /admin/contacts:** the list, the filters, Add contact and edit, bulk actions, the Lists card, Export CSV.
  The page's own empty state says "importing a file is not live yet".
- **Built, reached by nothing yet:** the CSV reader (U25), the vCard reader (U26), the XLSX guard (U27), the one field
  list (U28), the staging table `ContactImport` / `ContactImportRow` (U29 ✅), the pure import rule `decide()` (U31-A).
- **Missing:** the upload door (D18: no uploader, and a 1 MB server-action ceiling), the column mapping, the pre-flight
  screen (D19: a pre-flight must never say how many rows are players), the facts loader, the commit loop, the bar.
- **Designs on file** (written 2026-10-01/02, BEFORE U25–U29 were built — re-read against the code before building):
  `docs/marketing-specs/U29.md` … `U34.md`, `DECISIONS-U29-U40.md`, `CRITIC-U29-U40.md`.

## §3 — LOG (newest first)

- **2026-10-09 · C1** — the lane split recorded; this plan written.
