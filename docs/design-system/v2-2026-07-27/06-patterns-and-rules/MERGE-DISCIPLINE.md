STATUS: authoritative — the merge-discipline law of the 50pick design system.
Cited as **B9 / B10** in `docs/DESIGN_AUTHORITY.md` and as **laws 15 / 16** in
`06-patterns-and-rules/RULES.md`. Installed 2026-07-29 (design finalization pass).

# Design-system merge discipline — the single-source-of-truth law

> Why this exists: the codebase has been bitten three times by *parallel* design —
> the dead `src/app/micro-patterns.css` shadow kit (176 lines, hex-based, zero
> references), the superseded teal `design_handoff` kit, and the 1,325 utility
> classes that resolved to nothing (B8). Every one was a *second* place a design
> truth could live. This law says: **there is one design system, and new design is
> merged into it — never beside it.**

---

## B9 / Law 15 — One design system. New design merges in; it never sits beside.

**Rule.** Every design change lands in the **canonical home** for its kind, and
nowhere else:

| Kind of change | The ONE canonical home | Never |
|---|---|---|
| A colour / spacing / radius / shadow / motion **value** | `src/app/globals.css` (defined once), **bridged** in `tailwind.config.ts` | a hex in a component; a value in a second CSS file; a duplicate token name |
| A **utility class** | must name a key that exists in `tailwind.config.ts` (B8) | a class that resolves to nothing; an inline `style` that reproduces a token |
| A **new component state / variant** | a **prop on the existing component** (e.g. `TippingBar empty`, `Chip` variant) | a new near-duplicate component (`EmptyBar`, `NewChip.tsx`) |
| A **new component** (only if nothing covers it) | `src/components/…` **plus** a spec in `docs/design-system/v2-…/02-components/<name>/` | shipping a component the kit doesn't document |
| The **written spec** of any of the above | the matching `02-components/<name>/spec.md` (+ `preview.html`) and a `07-provenance/CHANGELOG.md` entry | code that ships a look the kit doesn't describe |

**And three procedural rules that keep it one system:**

1. **Search before you add.** Before creating any token, class, or component,
   grep the system for one that already does the job (`globals.css` tokens, the
   `02-components/*` specs, existing `.chip-*` / `.btn-*` / `.mcardp-*` classes).
   Extend the existing one. Only add when it is genuinely absent.
2. **Same PR updates code AND kit.** A design change is not "done" until the
   canonical spec in `docs/design-system/…` and the `CHANGELOG.md` reflect it. The
   system must always describe the *shipped* design — so the kit is never a stale
   second opinion. (This is what makes "the design system always holds the final
   design" true.)
3. **No new stylesheet, ever.** New CSS goes into `globals.css` beside its family
   (a new chip beside `.chip-*`, a new card rule beside `.mcardp-*`). Adding a new
   `.css` file re-creates the `micro-patterns.css` failure by definition.

**Reason.** A design truth that lives in two places will drift — and on a money
product, drift means the board and the detail page can disagree about someone's
stake (that already happened). One home per truth is the only version that a test
(`test:tokens`, `test:bridge`, `test:measure`) can actually guard.

**Broken looks like.**
- A "cold-start" look shipped as inline `style={{…}}` in `market-card.tsx` instead
  of a token/class in `globals.css` — a fourth shadow system, one component wide.
- A `#1EA362` typed into a component "just this once".
- A new `EmptyTippingBar` component next to `TippingBar` (now two bars to keep in
  sync forever).
- A class like `text-royal-300` that looks on-palette but resolves to nothing.
- A shipped screen whose look appears in **no** `02-components/*/spec.md`.

**Definition of done for ANY design task (add to every plan):**
- [ ] Zero new hex literals in components; zero new `.css` files.
- [ ] Every new value is a token in `globals.css`, bridged in `tailwind.config.ts`.
- [ ] Every new/changed state is a **prop on the existing component**, not a clone.
- [ ] The canonical `02-components/<name>/spec.md` (+ preview) and `CHANGELOG.md`
      are updated in the same change.
- [ ] `npm run test:tokens` (one definition site) + `test:bridge` (classes resolve)
      + `test:measure` are green.
- [ ] A grep for the thing you added finds it in **exactly one** definition site.

---

## B10 / Law 16 — The system is COMPLETE and FROZEN. Edges, shadows, popups — everything decided once.

**Rule.** Every visual primitive is decided **once**, in the system, and components
only *consume* it. That means a single canonical token/class for each of:

- **Edges / borders** — width, colour, hairline vs strong vs royal vs gold
  (`--border`, `--border-strong`, `--border-royal`, `--border-gold`). No component
  types its own border.
- **Shadows / elevation** — one elevation ladder (`--shadow-*`, the card
  top-highlight, the modal drop-shadow). No bespoke `box-shadow` in a component.
- **Radii** — one radius scale (card / control / chip / modal). No one-off `rounded-[…]`.
- **Popups / overlays** — modals, confirms, result popups, toasts, tooltips,
  popovers all go through the shared primitives (`Modal` / `ConfirmModal` /
  `OperationResultModal` / `Toast` / `Tooltip`) and consume the edge/shadow/radius
  tokens. No component hand-rolls a `createPortal` scrim or its own shadow.
- **Motion & focus** — one definition site per easing/duration token (B5); the one
  focus-ring recipe.

Once the canonicalization pass (Batch 0 of the design plan) is complete, the system
is **frozen**: you change a look by editing its **token or spec in the system** — and
every component that consumes it updates at once. You do **not** reach into a
component to tweak a border, a shadow, or a popup ever again. If a component needs a
look the system doesn't have, the **system gains the token + spec**, not the
component a one-off.

**Reason.** "Never come back to touch design" is only true if design lives *entirely*
in the system. Every inline value, bespoke shadow, or hand-rolled popup is a promise
to revisit that exact spot later. Freeze the primitives and future design work is a
token edit in one place, not a component hunt across the app.

**Broken looks like.** A modal with its own `box-shadow: 0 30px 80px …` typed inline;
a card border typed `border: 1px solid oklch(…)` in a component; a popup with a
`rounded-[14px]` that doesn't match the modal radius token; a toast that rolls its
own portal + scrim instead of the shared one; a second, slightly-different elevation
value living in one screen. Each is a place design was decided *outside* the system —
i.e. a place you'll have to come back to.
