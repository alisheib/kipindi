# PHOSPHOR-MIGRATION release 2a — hand-over (2026-10-19, Claude → Codex)

Branch **`phosphor-2a`** (one commit on `origin/main` da35b826b). Not on main yet.

## What the branch holds (release 2a, part 1)
- **The engine.** `IconPlate` takes a `variant` (identity · quiet · info · success · warning · danger · gold), each one
  recipe in globals.css (`.kp-plate--*`, from the tokens; the edge an inset ring). `--glyph-tone: 0.2` (R-TONE 2B) and
  `--plate-identity` (the specimen's soft royal at 60%, choice 2B). `plateGlyph()` covers 26/32/36/40/42/44/48.
  `DuoGlyphKey` (glyphs.tsx) types a door that draws Duotone. `DUO_KEYS` (map.ts, 60 keys) switched on; sprites
  regenerated (`app.8fd1796c.svg`; PREVIOUS_SPRITES = the live `app.7606b117.svg`, `admin.b27adee4.svg`).
- **Surfaces.** The journey hub's rows (`HubPlate`, src/components/ui/hub-plate.tsx — in ui/ because the Needle drawer, a
  classic layout file, draws a hub row: journey-shell 8.mount); notification plates (notification-appearance.ts: `tintFor`
  returns a variant, `tierFor` duo except a win's Fill seal; VERDICT quiet, OBJECTION and BONUS info); /help's contact and
  quick-link cards (`HelpPlate`, identity — the success/info/aqua tints were decoration); the home trust band (48px
  identity plates); the chat button (`I.comment` in Duotone; `HelpMark.tsx` deleted); the Needle mark (`I.needle` in
  Duotone at its four sites; `NeedleMark` deleted); /profile's setting rows and Sign out (danger plate); /profile/security's
  2FA plate (success + Fill on, quiet + Line off); sessions; notification settings; push and feedback settings; the
  reality check.
- **Guards re-pinned in the open** (each with a `PHOSPHOR-MIGRATION release 2` comment): journey-account 9.row,
  visual-pass r3c 5.2, r4e 1.1/2.1/2.4, r4h 6.3, r5c (gold registry, 2.10, 2.12, 3′), r5i 2.3/2.5, r6c 6.4, r8a §3 (warning
  registry), r9a 1.3 (the duo offsets)/2.3, r10 3.3, glyph-source §3 (needle-drawer 2 → 1, HelpMark gone), design-frozen,
  ui-consistency (a plate is paint), eyebrow-roles (the drawer's signature — stale on main since W4), contrast-audit (a new
  row per plate variant, the fill read from its rule: 6.5–13:1 against 3.0).

## Checked on the branch
typecheck 0. Green: glyph-source, glyph-map, glyph-sync, icon-sizes, design-frozen, contrast, ui-consistency,
journey-shell, journey-account, notifications-page, gold-is-money, eyebrow-roles, visual-pass r3c r4e r4h r5c r5i r8a r9a
r9c r10; r6c fails only main's own 10.1/11.2. Looked at in a browser (390 @2x, 1280): the hub (sw/en/zh, 390 and 320), the
notification page and the bell panel, /help, the trust band, the chat button.
**NOT run yet (do these before pushing):** `next build` at the exact commit, local `qa:live`, the full battery of the
295 `test:*` suites that read a changed file (`node <scratch>/readers.mjs` logic: every script naming a changed path;
globals.css is read by most), the red twins of every re-pinned guard (in a separate worktree), tiles of every changed
surface read one by one (before = main, after = the branch), then the production read-back.

## Release 2a, part 2 — the plates still hand-made (decided, not yet applied)
Apply on `phosphor-2a` (or after it lands). `IconPlate` + `plateGlyph(N)` + `aria-hidden`; identity → Duotone, a status
family → its glyph in Fill (circled tick/cross only), quiet → Line.
1. **legal/_components.tsx:140** — identity 40, Duotone, `className="mt-0.5"`; prop `glyph?: DuoGlyphKey`. ⚠️ D19a:
   re-pin `legal/_components.tsx` in scripts/lib/house-bot-absence-cases.mts APPROVED_EXTRA to the release commit.
2. **legal/rules/page.tsx:208** RuleCard — identity 40, Duotone; `icon`/`tone` props → `glyph: DuoGlyphKey`
   (`listChecks`, `trade`). D19a re-pin as 1.
3. **fairness/page.tsx:88** — identity 44, Duotone (glyph 23), steps typed `DuoGlyphKey`; keep the Countersign step's
   emphasis as `style={s.highlight ? { boxShadow: "inset 0 0 0 2px var(--brand-500)" } : undefined}` (a Tailwind ring loses
   to the unlayered `.kp-plate--identity`). Re-pin r5c 2.5 to that style.
4. **auth/verify-email** :43 (the password-confirm view) identity 48 `mail` Duotone; :137 `variant={good ? "success" :
   "danger"}`, `checkCircle` / `alertCircle` in Fill at 24.
5. **auth/reset-password:72** — danger 48; `clock` Fill when expired, `alertCircle` Fill otherwise.
6. **auth/register:163** — `variant="identity"`, `gift` Duotone at 20.
7. **wallet/deposit:431 — leave** (the regulator seal's labelled placeholder; dashed = "not yet"; its ghost pins it, r5k 2.4).
8. **wallet-client:524 — needs Ali's ruling**: the row lists every ledger kind by the amount's sign; a deposit/withdraw
   glyph there would mislabel payouts, bonuses, refunds, stakes and fees. Proposal: a 32px identity plate keyed by the
   stored type (DEPOSIT `arrowDownToLine`, WITHDRAWAL `arrowUpFromLine`, BET_PLACED `ticket`, CASHOUT `cashOut`,
   BONUS_CREDIT `gift`, AGENT_* `agent`; BET_PAYOUT, BET_REFUND (`refund` ships no Duotone), ADJUSTMENT_* and HOUSE_FEE open).
9. **receipt-list-row:69** — `variant="identity"`, `<Dir s={plateGlyph(40)} tier="duo" />`; re-pin r10 3.3's receipt
   string and r5i 2.12′.
10. **profile/kyc/page.tsx** — :407 danger 36 `alertCircle` Fill; :486 warning 36 keeping `info` Fill (same state as the
    gate panel's more_info); :512 (40px) quiet `fileSignature` Line; :548 identity 40 with **`idCard`** (not `user`)
    Duotone; :805 quiet 36 `idCard` Line; :847 identity 40 `camera` Duotone; :942 (56px) and :1032 (stepper) leave.
    r8a WARN_REGISTRY: profile/kyc 5 → 4.
11. **kyc-gate-panel:258** — `<IconPlate size={40} variant={tone.plate} className="mx-auto" aria-hidden>` + Fill at
    plateGlyph(40); TONE's `wash` → `plate`: neutral → info, waiting → info, action → warning, refused → danger, held →
    warning (`as const satisfies Record<string, { ring: string; ink: string; plate: PlateVariant }>`). Re-pin r5c 5.2‴.
12. **Upload slots** — kyc-doc-uploader:126 `variant={done ? "success" : "identity"}` `className="mx-auto mb-1.5"`, done
    `checkCircle` Fill (`g-settle`), waiting `user`/`idCard` Duotone; apply-client:570 `variant={rejected ? "warning" :
    done ? "success" : "identity"}`; apply/loading.tsx:65 an empty identity plate. r8a: apply-client 7 → 6.
13. **not-found-view.tsx** — :47 doors `IconPlate size={40} variant="identity" className="mb-2 transition-colors
    group-hover:text-brand-300"`: Home `I.arrowLeft` Line (it was a rotated arrowRight), Markets `markets` Duotone, Help
    **`headset`** Duotone (one meaning: every door to /help); :81 emblem identity 44 `search` Duotone, keeping the 7px halo:
    `style={{ boxShadow: "var(--edge-lit), 0 0 0 7px color-mix(in oklab, var(--brand-500) 8%, transparent)" }}`. Re-pin r9a
    4.10 (drop the rotated-arrow row).
14. **route-error.tsx:157** — danger 44 + `alertCircle` Fill, `style={{ boxShadow: "inset 0 0 0 1px var(--danger-border),
    0 0 0 7px var(--danger-wash)" }}`.
15. **modal.tsx:889** — keep the confirm tone's own material (claret is not danger, §B4a): `IconPlate size={36}
    bg={color-mix(in oklab, ${ink.ring} 15%, transparent)} fg={ink.ink} border={1px solid color-mix(… 30% …)}` with the
    default `I.warning` Fill at plateGlyph(36). No caller passes `icon`. Re-pin r4i §4.
16. **toast.tsx:750** — `variantStyles` gain `plate`: default info (checkCircle Fill), success, warning (warning Fill), danger
    (alertCircle Fill), gold (resolved Fill), factual quiet (info Line); `<IconPlate size={40} variant={v.plate}
    className="mt-0.5" aria-hidden>`; keep `bar` the warning entry's first key (red-feedback-law anchor). Re-pin r5c 5.1″,
    r8a 2.1, feedback-law 2.1b.
17. **share-button.tsx** — all three `IconPlate size={36} variant="identity"`: share Line, WhatsApp mark as drawn, copy
    `link` Line → copied `checkCircle` Fill. Re-pin share-link-readable check 3 and its red anchor.
18. **propose-promo.tsx:40** — identity 42 `idea` Duotone; drop the hover tint.
19. **profile/invite/page.tsx:392** — identity 26, Duotone (thin at 14px: look at it). Re-pin r5c §3's invite row.
20. **avatar-menu.tsx:335** — journey arm identity 40 `staffConsole` Duotone (import `IconPlate` from ui/, never a journey
    file); the classic arm's gold staff row waits on Ali (gold is money, Q5).
21. **performance medallion — leave** (the best-win crest; §8b keeps `trophy`).

## Found on the way — for Ali or their lanes
- **A failed, held or under-review deposit, and every refund, wear the green deposit plate**: the DEPOSIT kind carries
  them all (notification-service.ts), and the plate's tone cannot tell them apart. Fix needs a kind or a tone per notice
  (the `kind` column is a free string: no migration) — Ali's call.
- React warns of a duplicate key `s15.49` on the home page: `charts/updown-match-track.tsx:90` keys stems by x.
- ConfirmModal's `tone="warning"` paints claret; the deposit/withdraw confirms wear a warning triangle (§M3a D1).
- The AML policy's sigil is `shieldcheck` (verified); fairness' Countersign step `shieldcheck` while the hub's /fairness
  door is `attestation`; `fileSignature` means two things; reality check's Set limits draws `clock`, Self-exclude `lock`.
- The owed W4 checks: the classic-parity null compare (baseline vs the same tree) exited 1 and the compare exited 1 —
  investigate before naming entries (logs in the Claude scratchpad, `phos/parity/`); red:deposit-recheck passed;
  red:deposit-status-read and red:campaign-visuals, landing-ten, header-fit, red:bar-geometry, red:count-truth and
  test:motion were still owed.

## Then
Release 2b (W6: the empty states' one family), 2c (categories on royal plates — the 0.055 watermark retires; one deposit
and one withdraw glyph on every money door; stat tiles), 2d (the console: R-ADMIN cards and chips), release 3 (W7–W9).
