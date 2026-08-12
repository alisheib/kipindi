# The laws — what a redesign must satisfy, whatever it looks like

> **STATUS: RECORD — the redesign contract, not the rulebook.** The rulebook is
> [`docs/DESIGN_AUTHORITY.md`](../../DESIGN_AUTHORITY.md); where the two disagree, the rulebook
> and the live code win. (Historical note: this file was authored for the August 2026
> commission round, addressed to an outside designer; the total-replacement strategy it assumed
> was abandoned on 2026-08-12, but the invariants below remain true and testable.)

**Read this before anything else in the folder. It is the distilled constraint set.**

Everything else the commission package carried — the tokens, the components, the glyphs, the
screenshots — was the BEFORE picture, not a constraint.

This file is different. These are 85 invariants this product has, in almost every case,
**bought with an incident**. They are written as **tests with no current value in them**, so you
can satisfy every one with any aesthetic you invent. A card inferred a settled outcome from the
crowd's money split and **4 of 8 sampled resolved markets on production displayed the opposite of
the truth** — players clicked "RESOLVED YES" and landed on a page saying NO. One easing token
carried a baked-in duration and **motion died silently across the entire platform**. Three text
tokens were never bridged and **1,325 utility classes compiled to nothing**, rendering a
four-step hierarchy as two.

We are not asking you to keep our design. We are asking you not to re-buy these.

> **If you believe one of these is wrong, say so in `OPEN-QUESTIONS.md`.** An argument we can
> read and reject costs us nothing. A silent workaround costs us a round — that is exactly how
> the last two ended.

---

## How to read a law here

Each is stated as a property your delivered system must have. Where we could express it as
something a machine can check, we did — and we will run it on receipt (the checks are listed at
the end of `07-contract/OUTPUT-SPEC.md`). Where it needs judgement, it says so.

None of them names a colour, a pixel value or a font. That is deliberate. If a law here reads
as a style preference, we wrote it badly and you should push back.

---

## A · The 85 laws that must survive

These hold regardless of what the product looks like. A new design that breaks one of these is not a new design, it is a regression wearing one.

### 1. test:contrast — the token contrast gate

Every text colour in the new system measures at least the WCAG AA text ratio against the ACTUAL composited surface it lands on — including the worst stop of any gradient behind it and the rastered result of any hover/active filter — and every non-decorative UI boundary (form-control borders, glyph-only controls) meets the WCAG non-text ratio. The check must READ the shipped stylesheets rather than a hand-copied table, must refuse to run if any token is declared in more than one place, and must cover every stylesheet that paints a control — a control the gate cannot see is a control it cannot fail on.

<sub>**Enforced today by** `scripts/contrast-audit.mts (842 lines) + scripts/contrast-corpus.mjs` — Parses OKLCH/hex values OUT OF the four shipped stylesheets (chat-tokens.css, chat-styles.css, globals.css, motion.css — corpus order = cascade order) and scores ~60 named pairs. Floors: text >= 4.5:1, non-text/glyph/control-border >= 3.0:1 (WCAG 1.4.11). Three structural rules matter more than the pair list: (a) declValue() THROWS if a token has zero or MORE THAN ONE declaration site anywhere in the corpus — the browser takes the last, the parser takes the first; (b) gradients are scored at their WORST STOP, not their mean (worstStop()); (c) :hover brightness() filters are RASTERED into the arithmetic, because a filter changes no computed value. Two pairs are explicitly marked decorative:true and exempted (--border, --border-strong) while --border-control is held to 3.0. Money ink (--gilt, gilt-ink) is held to 4.5 as TEXT, not 3.0.</sub>

---

### 2. test:tokens — the collision guard

No custom property in the new system is declared at top level in more than one stylesheet — the last declaration silently wins document-wide, so a duplicate does not shadow one rule, it retunes every consumer of that value and nothing errors. Easing tokens are bare curves with no duration baked in; every transition and animation states its duration explicitly before its easing (a duration-less easing var expands to 0s and the motion dies silently); and every control's height comes from a named height token, never a literal, so a tap floor stays enforceable.

<sub>**Enforced today by** `scripts/token-collision.test.mts (215 lines)` — Four rules over every .css file under src/. (1) No token in the guarded families (--ease/dur/glow/z/shadow/ring/halo/m/t-) is DEFINED in two files. (1b) And neither is ANY other custom property at all — the cross-file allowlist is empty and is documented as only ever staying empty; scoped re-declaration inside the SAME file is fine and invisible to the rule. (2) Every --ease-*/--cm-ease-* value is a BARE curve carrying no time unit. (3) Every transition:/animation: shorthand that references an easing var states a duration BEFORE it (literal or --dur-* var), per comma-separated part. (4) .btn-xs/sm/md/lg/xl height declarations reference --h-control-*, never a literal px.</sub>

---

### 3. test:bridge — the utility-class resolution guard

Every utility class written anywhere in the app resolves to a real key in the build's theme, checked against the map the build actually uses for that property family. A class naming a token the theme never bridged emits nothing: no error, no type failure, no build warning — the element silently inherits its parent's value, so a hierarchy designed in four steps renders in two. The guard must also assert it parsed a plausible number of families, or a broken parser reports a clean sheet.

<sub>**Enforced today by** `scripts/tailwind-bridge.test.mts (237 lines)` — Parses the colours map and the boxShadow map out of tailwind.config.ts, then walks every .tsx and asserts that every class using one of 14 colour prefixes (text/bg/border/ring/fill/stroke/from/via/to/divide/outline/decoration/placeholder/accent/caret) names a family+step that EXISTS in the config, and every shadow-* class names a key in boxShadow (NOT in colours — checking it against colours made shadow-overlay pass by colliding with a bg key while correctly-bridged rungs were reported dead). Also asserts the parser itself saw >=10 families and >=5 shadow keys, so a broken parse cannot pass vacuously. Origin: 1,325 class usages compiled to NOTHING for the life of the project — a four-step ink ramp rendered as two.</sub>

---

### 4. test:design-frozen — the inline-design ratchet

No component may contain a design value the design chose — a colour literal, a shadow, a border, a radius. Values the DATA or the CALLER chose (a computed bar width, a hue interpolated from live data) are exempt by construction, as is any value the platform forbids from reading a variable (OS chrome metadata, a library argument). Every remaining exception is on a written list that may only shrink, and an exception that outlives its violation FAILS — a stale exemption is how a ratchet quietly stops ratcheting and lets a new violation hide in an already-clean file. Every popup goes through the shared primitive so the focus trap, focus return and scroll lock cannot be skipped.

<sub>**Enforced today by** `scripts/design-frozen.test.mts (248 lines)` — Over every .tsx under src/ (excluding src/app/api/, which renders in Satori with no CSS variables): fails on a raw hex/oklch()/rgb()/hsl() literal, an inline boxShadow/border*/borderRadius, or a Tailwind arbitrary shadow-[…]/rounded-[…]. Exempt: any line containing var(--…) (that IS consuming the system), any line with a ${} runtime binding (data, not design), and themeColor/QRCode arguments (values that CANNOT read a CSS variable). Carries a 41-entry FROZEN_ALLOWLIST that MAY ONLY SHRINK — and a stale entry (a file that no longer violates) is itself a FAILURE. Separately: no hand-rolled createPortal outside 9 named primitives, because a hand-rolled dialog skips the focus trap, the focus return and the Android scroll/zoom lock.</sub>

---

### 5. test:design-one-door — one rulebook, one copy

Exactly one document may claim to be the design rulebook, exactly one copy of it may exist on disk, and every other design document must be visibly labelled as record. Every index a new reader opens must name that one document within reading distance of the word it uses for 'rulebook'. A commission or handover package LINKS to the rulebook; it never carries a copy — byte-identical today is not the point, it diverges the first time either side is edited and then two files disagree. The guard must compare normalised paths, or its verdict is a property of the operating system rather than the repo.

<sub>**Enforced today by** `scripts/design-one-door.test.mts (170 lines)` — Six checks. (1) DESIGN_AUTHORITY.md still declares itself the only rulebook AND still carries §0, the filing law. (2) It still contains sections T/S/A/C/H/E/K/M — a missing heading means a rule family vanished. (3) No other doc matching /design/i in docs/**/*.md carries a live front-door claim (5 regexes: 'start here for anything visual', 'this is the entry point', a title ending '— the rulebook', 'have no authority', 'read-this-before-anything-else' — spelled here with hyphens so this description cannot trip the very gate it describes); struck/superseded/commented copies are allowed. (4) Eight named record docs carry a 'RECORD, NOT RULE' or 'SUPERSEDED' banner in their first 1400 chars; a deleted file passes. (5) Wherever docs/README.md, CLAUDE.md or README.md says 'rulebook', DESIGN_AUTHORITY.md is named within 220 chars — proximity, so a reworded mislabel still trips. (6) Exactly ONE DESIGN_AUTHORITY.md on disk. NOTE: this gate was RED on Windows and GREEN on Linux for the same commit until path separators were normalised.</sub>

---

### 6. test:measure — the measure system (structure)

A page states its content width through one typed container primitive and nothing else, so an invented width is a compile error and the rendered width can be MEASURED at runtime rather than trusted. A page and its loading skeleton state the same width, or every load jumps. A field never exceeds the measure its form column sets, the opt-out set is asserted in BOTH directions, and no call site adds padding or width of its own. Critically: the runtime half must assert an UPPER bound as well as a lower one — every criterion in the old sweep was 'not too narrow', so a 2,400px form scored a clean pass and a 2,344px admin console survived every QA cycle.

<sub>**Enforced today by** `scripts/measure-system.test.mts (196 lines)` — Six structural checks. (1) Each width token is defined EXACTLY ONCE in globals.css. (2) No NEW hand-typed max-w-[Npx] with N>=500 outside a 60-file ratchet that may only shrink (<500px modal/prose widths are a different concern and are untouched). (3) Every page.tsx and its sibling loading.tsx state the SAME tier — /updown/[roundId] was 1232 against a 1080 skeleton, a jump on every load that no test could see. (4) admin/layout.tsx carries both the cap class and data-measure. (5) Six named field atoms carry .field-measure AND three named atoms are asserted to STAY exempt (guarded in both directions, so 'completing the set' later is a regression not a tidy-up). (6) No <PageContainer> call site carries px-/py-/mx-auto/max-w- of its own.</sub>

---

### 7. test:keyframes — the keyframe registry

One motion name, one top-level definition. A keyframe name defined twice at top level does not shadow one rule — it retunes every consumer of that motion product-wide and nothing errors. Any redefinition inside an at-rule must be a reduced-motion calm branch and nothing else. Every keyframe a top-level rule NAMES must be defined at top level, or the animation plays for reduce-motion users and nobody else, or never at all. The corpus must include inline <style> blocks, and a stylesheet that fails to parse must FAIL rather than report zero keyframes.

<sub>**Enforced today by** `scripts/keyframe-registry.test.mts (231 lines)` — Parses every src/**/*.css AND every inline <style>{`…`}</style> block in src/**/*.tsx with POSTCSS (unparseable = FAILURE, not zero). (1.1) No name defined twice at TOP LEVEL — the last @keyframes of a name wins for the whole document, so a duplicate retunes every consumer silently. (2.1) Every at-rule keyframe override is a prefers-reduced-motion calm branch; an override elsewhere is drift wearing an at-rule as a disguise. (2.2) Every keyframe named by a TOP-LEVEL rule is DEFINED at top level — found a real one where .win-card animated win-burst whose only definition sat inside the reduced-motion branch, so the motion existed only for users who asked not to have it. The check enumerates ANIMATION KEYWORDS rather than known names, because filtering on known names excused a rule naming a keyframe that exists nowhere at all. (3.1/3.2) 12 delivery keyframes and 6 reused ones pinned by name. (3.3) shimmer-gilt writes a background-position PER LAYER — one value for two layers translates the metal ramp itself and slides the gold off the button; measured in a paused browser timeline, and nothing else in the repo can distinguish it from correct.</sub>

---

### 8. test:reduce-motion — the three-gate motion guard

Every animation still works with motion off, and there are THREE audiences, not two: the OS preference, the user's own in-app switch, and a low-end-device tier that is a THROTTLE (full durations, ambient loops off) rather than a clamp — our target device gets neither the media query nor the class. The universal clamp zeroes duration AND delay; there is exactly one clamp per gate and their bodies are identical; hover-intent transition delays are deliberately NOT clamped. Every infinite loop is either switched off at the low-end tier or exempted with a written reason, the exemption list may only shrink, and it may name no selector that no longer exists — a list claiming coverage it has not got reads exactly like a list that has it. And the guard must parse CSS with a real parser, not a regex: a regex agrees with your typos, and a comment that ended early can delete a whole rule with nothing anywhere reporting an error.

<sub>**Enforced today by** `scripts/reduce-motion.test.mts (376 lines)` — Reads all src CSS + inline <style> blocks with postcss. Rule 0.1: no STRAY COMMENT DELIMITER in any stylesheet — a closer found outside a comment, or an opener inside one. A star-slash inside a comment once closed it eleven lines early, eleven lines of English became the head of a selector list, and the browser DROPPED all 27 entries of the low-end-device rule while every gate in the repo was green. Rule 0.2: no rule's selector reads as PROSE. Rule 1.0-1.5 on the universal calm clamp: it exists; every copy is inside one of the three gates (an ungated `* { animation-duration: 0 }` would kill all motion for everybody); exactly ONE clamp per gate (four copies once existed and had already drifted); every clamp zeroes animation-DELAY as well as duration (zeroing duration alone holds a delayed keyframe on its invisible first frame for the whole delay); the clamp bodies are byte-identical across gates; and transition-delay is explicitly NOT clamped and must stay unclamped, because a hover-intent delay is intent, not motion. Rule 2.0-2.3 on the third gate: every comma-fragment of its selector list carries the tier attribute; every `infinite` animation is either switched off there or on a 6-entry KEPT list with a written reason; the list names no DEAD selector; the KEPT list holds no stale entry. Selector matching is anchored to identifier END (a bare includes() let a renamed entry go on reporting coverage) and comments are blanked from the corpus (a class named in an explanation is not a class anything renders).</sub>

---

### 9. test:reduce-motion — the KEPT exemption list

An ambient loop may survive on the cheapest device only if it carries STATE rather than decoration — liveness, urgency, a tick that re-triggers a computation — and only in its cheapest form (opacity, not shadow or transform). Each survivor is named with its reason; the list may only shrink; an entry that no longer names a loop FAILS.

<sub>**Enforced today by** `scripts/reduce-motion.test.mts:243-250` — Six selectors deliberately still looping on a low-end device, each with a written reason: .live-dot and .cm-status-dot (liveness itself, re-declared as opacity-only), .m-live-pip, .m-urgent (a STATE signal, not decoration), .countdown--urgent and .countdown--critical (a 60s steps(1) re-trigger tick, not motion).</sub>

---

### 10. test:m1-light — one lamp

There is exactly one light source and its direction lives in the surface wash, never in the edge: every lit inner ring is EVEN on all four sides. A surface lit from below or from the right is a bug, including one written as an inline style in a component — that is where the last batch lived, two of them on the money screen, while a stylesheet-only sweep printed zero. A dark inset is the absence of light (a sunken well) and an opaque zero-blur horizontal bar is a structural rail; both are legitimate and both must be PRINTED with their classification, or 'zero failures' stops meaning 'zero one-sided lights'. A value the guard cannot read is treated as a violation, never waved through. And the well/lamp threshold must be derived from the darkest surface in the system — an absolute ceiling is only valid while the theme is dark.

<sub>**Enforced today by** `scripts/m1-even-light.test.mts (287 lines) + scripts/m1-corpus.mjs` — Over 6 stylesheets AND the full .tsx component corpus (JSX inline boxShadow: and <style> blocks): every INSET shadow layer that carries LIGHT must have both x and y offsets equal to zero. Non-inset layers are deliberately NOT judged (a cast is supposed to be directional). The classifier reads a lightness from the source (authored oklch(), a hex, or a var() resolved within the same corpus) and, at or below a SHADE_CEILING of 15, treats the inset as a sunken WELL — the absence of light — rather than a lamp; an opaque zero-blur purely horizontal inset is classified as a structural accent RAIL. Both benign categories are PRINTED with their reason, never silent. A lightness it cannot resolve is treated as a LAMP. PENDING list is empty and a stale entry FAILS. NOTE: the file states SHADE_CEILING assumes a dark theme and becomes wrong (must become surface-relative) under a light surface.</sub>

---

### 11. test:glyph-motion — one motion vocabulary for every glyph

A glyph moves for a reason, and every glyph in the set moves the same way: motion comes from a small closed set of primitives applied as classes, and a glyph with bespoke keyframes is a violation. Triggers are mount, data change or state change — NEVER hover; icons respond, they do not perform. In-flight feedback is the progress primitive, not a spinning glyph. Static glyphs stay static: the law governs motion, it does not demand it. Each primitive carries both reduced-motion branches, and each primitive family has at least one real consumer or it is not a vocabulary.

<sub>**Enforced today by** `scripts/glyph-motion.test.mts (130 lines)` — Over every .tsx under src/ (>300 files asserted, so it cannot pass on an empty list) plus motion.css. (1) No bespoke framework animation (spin/pulse/ping/bounce) rides ON a kit glyph or on a wrapper whose next 200 chars contain one; the kit Spinner is exempt by construction because it renders a raw <svg>. (2) No hover-triggered glyph motion — no hover:animate-*, and no motion primitive behind a hover:/group-hover: variant. (3) All six primitives exist in motion.css, each with BOTH clamped branches (the media query AND the in-app class mirror); they are single-shot so the low-end tier does not apply. (4) Adoption floor: each of the five primitive families has at least one consumer — a vocabulary with zero consumers is a suggestion.</sub>

---

### 12. test:motion-ladder — no hardcoded duration or easing

Every duration and every easing curve in a component comes from the motion ladder; a raw millisecond value or an inline curve in a transition/animation string is a place the next tuning pass will silently miss. The guard is scoped to CSS timing strings only — a JavaScript timeout or a numeric prop is not a design value, and a guard that flags correct code teaches people to mute it. The exemption list may only shrink and an exemption that no longer matches anything fails.

<sub>**Enforced today by** `scripts/motion-ladder.test.mts (93 lines)` — Scans every .tsx under src/components (>50 asserted, so it cannot pass vacuously) for lines containing transition: or animation: and flags a raw 2-4 digit ms literal or an inline cubic-bezier(. Comment lines are skipped. Deliberately SCOPED TO CSS STRINGS — a setTimeout, a durationMs prop or a number in prose is not a hardcoded transition, and flagging those would make the guard noise that gets muted. The ALLOWLIST is EMPTY and a stale entry FAILS.</sub>

---

### 13. test:gold-is-money — the earned-money ink is reserved

Whatever the new system's 'earned money' treatment is, it is RESERVED: it appears only where money was actually earned (a payout, a settlement, a resolved seal). Identity, rank and status may be rendered in a rich material, but never in the ink that means money — a decorative element wearing the earned-money treatment is a violation, not a style choice. The guard is scoped to identity surfaces, asserts its own comment-stripping did not erase the code it is judging, and carries a live-consumer check so the suite cannot pass by the treatment having been deleted rather than reserved. And a law with no gate is a suggestion — this one was broken by the very commit that introduced it.

<sub>**Enforced today by** `scripts/gold-is-money.test.mts (87 lines)` — Three sections. (1) Two named IDENTITY surfaces (identity-avatar.tsx, updown-card.tsx) contain no reference to the money-ink tokens or the gold ramp they alias to — with a CONTROL assertion first that the file is still real code after comment-stripping, so an over-reaching stripper cannot make every absence pass over nothing. (2) The five .tier-* rank rules in globals.css wear no money-ink token. (3) A live-consumer check: the struck-money class still exists in motion.css AND is still consumed by the win celebration — without it the suite could pass by the tokens having been DELETED platform-wide, which is a worse product. Deliberately scoped to identity surfaces: money surfaces MUST use these tokens, so a repo-wide ban would be nonsense. Origin: the law shipped as prose and was already false in its own file — TIER_RING had been moved off the money tokens but the sovereign ring's inline boxShadow still read the money ink, because that one ring is composed in TSX rather than read from the table. Two correct edits, and the violation sat between them.</sub>

---

### 14. test:crest-legibility — no sub-pixel stroke at any shipped size

Every stroke in every piece of vector artwork renders at least one CSS pixel at EVERY size the product actually uses it at — computed as arithmetic on the rendered value, not asserted by the presence of a helper function, because calling the helper with a too-small argument is the symbol without the behaviour. A floor must not override the designed weight where the design was already right, and the probe must assert it found something to measure or an empty parse scores green over a deleted feature.

<sub>**Enforced today by** `scripts/crest-legibility.test.mts (82 lines)` — Parses every strokeWidth expression out of identity-avatar.tsx, evaluates each at the six sizes the avatar is actually rendered at (20/28/40/48/56/80), converts viewBox units to CSS px (w*size/100) and requires >= 1 CSS px. Excludes filled bands by VALUE (base >= 6), not by position in the file. Also floors the chief pip RADIUS at 1px. Rule 3.1 guards the OTHER direction: at the largest size the originally designed widths must still win, so the floor cannot smuggle in a taste change as a fix. Rule 1.0 refuses to pass vacuously (>=10 strokes must be found), because [].every() is true and an empty parse would score green with the feature deleted. Origin: four generative heraldic crests shipped with hairlines that at NO used size reached a single CSS pixel — the layer was drawn, shipped, and invisible.</sub>

---

### 15. test:ui-consistency — kit-adoption drift linter

Every control on every surface comes from the kit: no native form control where a primitive exists, no ad-hoc portal outside the sanctioned overlay patterns, no hand-typed token value, no height override on a sized control. Beyond adoption, three legibility rules survive independently of any visual language: (a) a control must LOOK pressable — a button painted only with type reads as a label, and it is always the destructive one that gets missed; (b) a dropdown's closed trigger must never truncate the selected value, because that is the only place the operator can read their own choice, and truncation cannot be detected by reading text, only by measuring geometry; (c) an unbroken identifier must be given an explicit way to break or it runs out of its box on a narrow screen. The linter uses a baseline that may only shrink, so enforcement lands before the migration finishes.

<sub>**Enforced today by** `scripts/ui-consistency.test.mts (408 lines) + scripts/ui-consistency-baseline.json` — Eleven source rules over every .ts/.tsx/.mts under src/, aggregated to a COUNT per rule::file and compared against a checked-in baseline: it fails ONLY on new or increased drift. Rules: raw <select>; native date/time input (two documented money-critical exceptions); raw checkbox; a hard-coded token literal; createPortal off the kit Modal (12 sanctioned non-modal overlays); an undefined table class that renders unstyled; a raw <button className='btn …'> instead of the kit Button; a BARE TEXT BUTTON — a <button> whose entire appearance is type, no kit class, no background, border, ring, shadow or underline (measured on production: the one destructive control on a page was the one that did not look pressable); a role=combobox TRIGGER that truncates its selected label (the closed trigger is the only place an operator reads what they chose — and truncation is PAINT, so every DOM-text assertion passes with the label completely invisible); an UNWRAPPABLE IDENTIFIER (a cuid in a mono element with no break-all — one unbroken 28-character token that normal wrapping cannot act on); a height override on a .btn; a <table> skipping the shared skin.</sub>

---

### 16. test:responsive — the rendered sweep

Every surface, at every supported width from the narrowest phone to the widest desktop, in every shipped language, with every overlay open: zero horizontal overflow, nothing clipped that is not inside a scroller, no fixed overlay off the edge, exactly one capped content column and it is within its declared tier. Both bounds are asserted — too WIDE is as much a defect as too narrow, and the old sweep could only ever detect too-narrow, which is why an over-wide console survived every cycle. The sweep must extend past the largest common desktop, because a defect wider than the widest cell you measure is invisible by construction.

<sub>**Enforced today by** `scripts/responsive-audit.mjs (488 lines)` — Drives Playwright over ~28 player + ~38 admin routes at TEN breakpoints (320/360/390/430/740-landscape/768/1024/1280/1920/2560), optionally in EN+SW+ZH, plus overlay states (notifications, avatar menu, language, bet dial + confirm, admin filter/menu) at phone and landscape widths. HARD failures: zero horizontal overflow (documentElement.scrollWidth <= clientWidth + 1, naming the widest offending element); no off-screen fixed/sticky overlay (excluding sticky headers inside horizontal scrollers, which are supposed to be as wide as their scroller); no clipped controls outside a scrollable ancestor — this catches overflow that overflow-x:clip hides from scrollWidth; content column within its declared tier AND exactly one measure root per page; zero real console errors. SOFT (warning only, never fails): touch targets — and the threshold is height < 38 or width < 24, NOT the stated 40px floor, deliberately so that the current medium button does not warn.</sub>

---

### 17. test:motion — the motion layer is actually WIRED

In a real browser, against the real compiled stylesheet: every motion token resolves to a real curve or a real positive duration, not to the CSS-wide fallback a broken var() silently collapses to; and a real control on a real page computes a non-zero transition with a real timing function. Retired motion names are gone from the shipped stylesheet, not merely from the source. A source-level gate cannot see this class of defect — nothing errors, nothing is red, the product just stops moving.

<sub>**Enforced today by** `scripts/motion-adoption-verify.mjs (123 lines)` — In a real browser against real compiled CSS: every kit curve token resolves to a cubic-bezier( on :root; every kit duration token resolves to a real positive time; every legacy alias resolves THROUGH to a real curve/duration and not to the CSS-wide fallback a broken var() collapses to; a real .btn computes a transition-duration > 0 and a cubic-bezier timing function; 7 kit keyframes exist in the live stylesheets and 10 retired ones are gone. Origin: every easing token silently resolved to nothing platform-wide and the whole product lost its motion with no error — a green unit suite cannot see it, only computed style in a browser can.</sub>

---

### 18. qa:contrast-rendered — the DOM contrast sweep

Beyond the pair list, a rendered sweep must walk every real text node on every route at every width and score it against its real composited background — including opacity modifiers, nested translucent panels, gradients, and a token used on a surface it was never designed for. These are the pairs nobody thought to list. And the sweep must report its own COVERAGE: zero failures over zero measured nodes is not a pass.

<sub>**Enforced today by** `scripts/contrast-rendered.mjs (369 lines)` — Walks EVERY rendered text node on 12 player + 10 admin routes at 360/1280/1920, resolves the ACTUAL composited background by climbing ancestors past transparent and compositing any alpha it finds, and scores WCAG 2.1: >= 4.5:1 normal, >= 3.0:1 large (>=18px, or >=14px bold). Handles gradients as paint that background-color cannot see. Carries a coverage floor — a route that never loaded, or a page with only a handful of text nodes, is not a pass; 'no failures' is not a pass unless something was measured.</sub>

---

### 19. qa:button-contrast — the raster instrument

Any interactive state produced by a raster effect (a brightness filter, a blend mode, a backdrop filter) must be measured from actual pixels on a running page, never derived — a raster effect changes no computed value, so every colour-reading instrument is blind to it. When a label sits on a gradient, the ratio must be measured at the background actually behind the tallest ascender, which is a function of button HEIGHT, not a single number per fill. Ink is sampled from a solid swatch, never from antialiased glyph pixels. And a test fixture must be proved to compute identically to the real component, or the run refuses to report.

<sub>**Enforced today by** `scripts/live-button-contrast.mjs (209 lines)` — Puts a real pointer on a real button on a running site and reads the PIXELS back for 6 variants x 2+ sizes. It simulates nothing: filter: brightness() is a raster effect that changes no computed value, so neither the token gate nor the DOM sweep can see a hover state. Reports two numbers per state: the worst-stop fill (conservative, what the colour instruments score) and behind-glyph — the fill sampled at the TOP ROW OF THE LABEL BOX in the horizontal padding, which is the verdict column and is SIZE-DEPENDENT because a shorter button puts its glyphs higher up the ramp. The ink is sampled from a solid currentColor swatch, NEVER from a glyph, because subpixel antialiasing tints glyph pixels in the flattering direction. The injected fixture is asserted to resolve to the same background-image as the page's own button, and the run REFUSES to report if they diverge.</sub>

---

### 20. qa:outcome — live card-to-detail settlement parity

Wherever the same money fact is rendered on two surfaces — a card and its detail page, a summary and its receipt — a running instance must be driven to prove the two AGREE. A card and a detail page disagreeing about how someone's stake settled is not a display bug; it is a false statement about their money, and it is invisible to any static check.

<sub>**Enforced today by** `scripts/outcome-parity.mjs (74 lines)` — Against a running site: for every resolved market on the board, opens its detail page and asserts the outcome printed on the CARD equals the outcome printed on the DETAIL PAGE. Handles EN and SW wordings and VOID. Exit 1 on any disagreement. This is the check that would have caught the original user report directly — 4 of 8 sampled resolved markets disagreed on production, worst on lopsided pools.</sub>

---

### 21. qa:ring-delta — did the light actually land

When a material change is small enough that a human might not see it, prove it landed by comparing pixels of the same surface before and after — and profile a range of depths rather than asserting a fixed row, because the geometry that separates a border from an inner ring is not something you can assume. Never mix CSS and device pixels: compare two images of identical size or refuse to report. And a magic number repeating across unrelated surfaces is the tell that the instrument is measuring the wrong thing.

<sub>**Enforced today by** `scripts/material-ring-delta.mjs (159 lines)` — Compares a BEFORE and AFTER corner crop of the same production surface and prints a per-device-row DEPTH PROFILE of luminance change along the top and left edges, sampled inset past the corner radius. It asserts no fixed row: its first version sampled rows 0-3 as 'the ring' and reported NOT EVEN on a change that had plainly landed, because boundingBox() returns the BORDER box and an inset shadow paints inside the border. Refuses to run if the two images differ in size (then CSS-vs-device pixels no longer cancel). Reports both whether the light MOVED and whether it moved EVENLY on both edges.</sub>

---

### 22. qa:bundle-css — did the rule survive the build

For a CSS change, the SOURCE is not evidence — the shipped bundle is. Assert that named declarations survive the build pipeline into the artefact the browser downloads. Nothing else in a typical toolchain can see a rule that was silently dropped: the type checker does not read CSS, the build exits zero, and every source-grepping gate stays green.

<sub>**Enforced today by** `scripts/bundle-css-probe.mjs` — Reads the built .next/static/chunks/*.css — post-PostCSS, post-Tailwind, post-minifier — and asserts named rules are actually IN the file the browser downloads, with `must` and `mustNot` regexes per named atom. Origin: a stray comment terminator dropped an entire 27-entry rule from the bundle while it was perfectly present in src/, and every design gate in the repo greps the SOURCE, so every one was green.</sub>

---

### 23. qa:calm — the reduced-motion production probe

Reduced-motion behaviour is verified on a running product with the product setting its own gate, and the verification samples the surface DURING the window the defect occupies, not after it. A computed value can be correct while the surface is invisible; a still taken a moment too late shows a correct page. Measure the value, the behaviour, and the picture, and label which is which.

<sub>**Enforced today by** `scripts/live-calm-probe.mjs` — Verifies all three reduced-motion gates on a running site and NEVER sets the gate itself — it makes the product set it (Playwright's own reducedMotion for the OS path; writing the real in-app preference for the class path). Measures three different kinds of thing and says which is which: the computed animation-delay on real cards; the OPACITY sampled early, inside the window the delay used to occupy; and a viewport crop taken at that same early moment. Origin: the defect is a WAIT, not a picture — with duration clamped and delay untouched, a delayed keyframe holds its invisible first frame for the whole delay, and a screenshot taken a moment later shows a perfectly correct page.</sub>

---

### 24. qa:material-audit — the light/elevation/motion/token map

Keep an instrument that MEASURES the distribution of material across the whole component set rather than sampling six screenshots — where light is absent, where elevation is absent, where motion is absent, and where motion bypasses the token vocabulary. It must report a map for a human to read against what each component is FOR, and must not be turned into a pass/fail gate: a flat component can be correct, and the failure mode of the restraint law was answering it with flatness.

<sub>**Enforced today by** `scripts/ui-material-audit.mjs` — Reads every component under seven roots and scores four axes: LIGHT (gradient/specular/inner highlight vs flat fill), ELEVATION (shadow or ring vs sharing the page surface), MOTION (does it animate at all), TOKENS (if it animates, kit vocabulary or hardcoded ms). Explicitly a PRE-FLIGHT, not a verdict: it ranks, it does not judge, because a component can score zero and be correct (a text input should not glow). It is the instrument that measured '79% of components had no light, 60% no elevation, 43 had neither and no motion'.</sub>

---

### 25. test:outcome — a settled outcome is READ, never inferred

A settled outcome is READ from the stored settlement field or it is not shown. It is never derived from a probability, a percentage, a pool comparison, or any other proxy for the crowd's money. Where the outcome is unknown, render the settled state with NO side — an absent side is recoverable, a wrong side is a false statement about someone's money. This generalises: on a money surface, prefer showing nothing to showing a guess. In a redesign, every new component that can render a settled state must pass the real outcome down, and any 'derive it from what we already have' shortcut is the exact defect.

<sub>**Enforced today by** `scripts/outcome-display.test.mts (122 lines)` — Three static rules over every .ts/.tsx. (1) No YES/NO side is derived from a probability variable, a raw percentage, or a direct pool comparison — the regex covers yesPct/impliedYesPct()/yesPercent/yesProb/probability/percent/pct/yesPool/noPool compared against a number or the other pool and yielding a YES/NO side. (2) Every <MarketCard> call site that can render RESOLVED (literally, or via a pass-through status prop) passes resolvedOutcome. (3) The card itself derives its label from resolvedOutcome only. Origin: the board displayed the OPPOSITE of the truth on any upset, and was most confidently wrong exactly where the pool was most one-sided — the markets where a refund or an upset matters most.</sub>

---

### 26. test:history — no fabricated data behind a chart

A chart, sparkline or trend renders REAL recorded data or it renders nothing. Too little data is NOTHING, never a smoothed guess, never an interpolation, and never a shimmer that looks like data. The guard must be behavioural as well as static, because four trivial rewrites slipped past the static-only sibling — and it must ban the SHAPE (a pseudo-random series generator in a data module) rather than a set of names, since a rename would have survived a name check.

<sub>**Enforced today by** `scripts/history-fabrication.test.mts (188 lines)` — Static: no history seeder under any of six names; the history module contains no LCG constant or pseudo-random series generator (broader than the name check, because the original bug would have survived a rename); Math.random only for prune sampling; the write path swallows its own errors because callers are fire-and-forget on the bet path. Behavioural, against the real module: a market with no history renders NO chart and NO sparkline; ONE data point is still not a line (the old code invented sixteen); what is recorded is exactly what comes back, oldest first, with no interpolation; the write path never rejects. Origin: real players on a licensed real-money platform were shown INVENTED price history and could bet on the strength of it.</sub>

---

### 27. test:integrity — content honesty in current-truth surfaces

Copy is bound to code, so a superseded pattern cannot silently return: every currency figure goes through one formatter (never a raw locale string, which drops the unit and the typographic minus); every operator-facing message states a time a human reads, not a machine instant; no internal tracker id ever renders as copy; and no document may mandate a design source the product has superseded. The scan covers current-truth surfaces only — a history document describing the old state is not a violation.

<sub>**Enforced today by** `scripts/content-integrity.test.mts (286 lines)` — Binds doc/copy claims to code. Design-relevant rules: B3/M11 — globals.css carries NO light-theme selector, no prefers-color-scheme:light, no theme library, and package.json has not re-added one; C9 — no doc reads as mandating the superseded design kit; LANG — no doc claims a locale the app does not ship, and none says 'bilingual' for a trilingual product; A10 — money is always formatted through the shared formatter, never a raw toLocaleString on a currency value (which drops the unit and the real-minus glyph and lets locale grouping drift); E96 — a campaign finding id may never RENDER as copy (an internal tracker id means nothing to the reader); E97 — an operator-facing error may never interpolate a raw machine timestamp. It scans product source + README + CLAUDE.md, deliberately NOT the audit specs and trackers, which describe the old state as history.</sub>

---

### 28. test:chip-contract — a pill must survive a label longer than its container

Every shared label-bearing primitive must survive a label longer than its container: it can wrap or ellipsise, it never exceeds its container's width, and its size table sets a MINIMUM rather than a fixed height. The arithmetic that keeps the minimum a no-op for the common one-line case is pinned, so a typography change cannot silently grow every instance in the product. And note the measurement trap: a survey of live instances cannot find a LATENT defect — there is nothing to measure until someone ships the label that trips it — so this is a source contract, verified once against a real instance at a real container width.

<sub>**Enforced today by** `scripts/chip-contract.test.mts (78 lines)` — Source contract on the shared Chip: it is not whitespace-nowrap (via class or style), it caps its width at its container, and the size table's height is applied as minHeight with height:auto. Then it PINS THE ARITHMETIC: for every size, fontSize x lineHeight + 2 x paddingBlock must be <= that size's minHeight, so the swap stays a no-op for one-line chips — if a future edit makes the content box taller than the min, every chip on the platform grows. Origin: a fixed-height nowrap chip could neither wrap nor grow, so a long label was drawn OUTSIDE its column with no ellipsis and nothing for a document-level overflow check to notice. A survey of 84 live chips across 7 routes x 4 widths came back CLEAN while the shared component stayed broken, because the one known offender had been patched at its call site.</sub>

---

### 29. test:admin-clip — text clipped INSIDE its own card

A component must be safe for ANY caller's string, not for a convention about short labels — the component that carried a written 'keep this short' warning was clipped on the very line carrying the warning, by an author who had already shortened the word. Concretely: a flex item's minimum width defaults to its content, so truncation on a child whose parent cannot shrink is decoration; every chain from the clipping element to its scrolling ancestor must be able to shrink, and a truncated value must stay reachable in full. And note the blind spot this closes: clipping inside a card never reaches the document's scroll width, so a green 'zero overflow' sweep is not evidence that anything is readable.

<sub>**Enforced today by** `scripts/admin-clip.test.mts (138 lines)` — Three sections on the admin shell. (1) The KPI delta truncates rather than overflowing, CAN shrink (min-w-0 defeats flex min-width:auto), keeps its full string reachable via title, and the row holding it can shrink too — with a 1.0 'the span was actually found' guard so it cannot pass vacuously. (2) The breadcrumb nav can shrink and hides excess, the PER-CRUMB WRAPPER can shrink (the bit that was missing), the crumbs truncate, and the separator is pinned as non-collapsing. (3) The GENERAL rule: every whitespace-nowrap class in the shell can shrink, truncate, or is explicitly pinned — reading the WHOLE className expression, not one string literal of a joined array. Origin: clipping inside a card NEVER reaches document.scrollWidth, so the standing 'zero horizontal overflow' bar honestly reported zero while the text was unreadable.</sub>

---

### 30. test:needle — the vendored physics object

If the product ships a physical toy built on the brand mark, its signature invariant must be gate-enforced: however it is thrown, it comes to rest as the mark, exactly. The engine stays a pure, deterministic, DOM-free module so it can be hammered head-less, and it must survive adversarial inputs (non-finite numbers, huge time steps, degenerate viewports, resize storms) without breaking or leaking callbacks. Note the frozen-asset constraint: this engine is vendored and marked do-not-edit, and it is one of the files a designer must REPRODUCE rather than restyle.

<sub>**Enforced today by** `scripts/needle-physics.test.mts (542 lines)` — Torture-tests the DOM-free rigid-disc simulator: every wall, every corner, interior/overlapping/enclosing obstacles, the full spin range with every callback, restitution and energy laws, adversarial inputs (NaN, Infinity, huge dt, degenerate viewports, inset overflow), resize storms and callback hygiene. Above all it proves THE signature invariant: however hard it is thrown or spun, it comes to rest AS THE LOGO — rest angle a multiple of 360 degrees.</sub>

---

### 31. test:overdue-format — a unit that scales in the direction that matters

Every duration, count and amount the interface renders scales its unit in every branch that can render it, and no abbreviation may collide with a unit that means something else on the same screen. Check the ALARM branch specifically: a formatter that degrades only in the failing direction makes the worst case look calmest.

<sub>**Enforced today by** `scripts/overdue-format.test.mts` — The overdue badge must roll minutes to hours to days to weeks in BOTH branches. Origin: the not-yet-due branch rolled correctly and the OVERDUE branch did not, so a market 16 hours late — holding real player money across 8 positions from 4 players — announced itself as '966M OVERDUE' (the console uppercases it). Two aggravations recorded: 'M' means MILLIONS everywhere else in this console, so on a money screen it reads as an amount; and it is the ALARM, so the longer a payout waited the less urgent its badge looked. Proven RED against the old body before the fix.</sub>

---

### 32. DESIGN_AUTHORITY §A1 — contrast floor

Every text colour measures at least 4.5:1 against the actual surface it lands on, and every non-text UI boundary at least 3.0:1. The faintest step of the ink ramp is an accessibility floor, not a taste setting, and cannot be darkened without re-measuring. When a money control fails, the remedy is to DARKEN THE FILL, never to lighten the label — because the label colour is what carries the affirmative/negative convention.

<sub>**Enforced today by** `docs/DESIGN_AUTHORITY.md:554-557` — WCAG 2.1 AA, text >= 4.5:1 MEASURED ON ITS ACTUAL SURFACE — not against the canvas it is nominally 'on'. Non-text UI >= 3.0:1. The faintest ink step sits at its value as an ACCESSIBILITY FLOOR, not a style choice; darkening it requires re-running the gate. Where a token fails, DARKEN THE FILL rather than lighten the label, to preserve the YES/NO convention (§Accessibility floor, line 244-247).</sub>

---

### 33. DESIGN_AUTHORITY §A2 — tap floor

Every interactive element is at least 44x44 CSS px at the narrowest supported width, and money controls are never the exception. The floor is asserted as a hard failure at the stated number, not as a warning tuned to whatever ships today.

<sub>**Enforced today by** `docs/DESIGN_AUTHORITY.md:558-560` — Tap targets >= the tap-min token (40px), 44px preferred on mobile. Money controls are NEVER the exception — a stake chip is where a player chooses how much to risk, and it shipped at 26px once. The input height already sits at 44px. MEASURED GAP: globals.css:210-212 ships two control heights below this floor (30px, 38px) with the bump deferred, and the only automated check is a soft warning at 38px.</sub>

---

### 34. DESIGN_AUTHORITY §A3 — the focus ring

There is exactly ONE focus indicator recipe in the system, applied through a catch-all so nothing in the long tail of components is unfocusable, and no rule removes the native outline without supplying a replacement. Any focus indicator on a money control must survive forced-colors / high-contrast mode, which rules out a shadow-only ring.

<sub>**Enforced today by** `docs/DESIGN_AUTHORITY.md:561-563` — ONE focus recipe everywhere: a 2px brand outline at offset 2, plus a 4px 25% halo, with a defensive catch-all so nothing in the long tail is unfocusable. Never outline:none without a replacement ring. (Reinforced by §M3: the earned-money class keeps a REAL outline rather than a box-shadow ring, because a box-shadow ring is invisible in forced-colors mode — and that class lands on the Deposit button.)</sub>

---

### 35. DESIGN_AUTHORITY §A4 — colour is never the only signal

Win/loss, up/down, yes/no and status are never signalled by colour alone; each is always paired with a word, an arrow or a glyph. On this product the colour means which way someone's money went, so this is an accessibility floor and not a redundancy preference.

<sub>**Enforced today by** `docs/DESIGN_AUTHORITY.md:564-566` — Every affirmative/negative, up/down, win/loss or status colour is paired with a word, an arrow or a glyph. Stated reason: about 8% of men are colour-blind, and this is a product where the colour means WHICH WAY YOUR MONEY WENT.</sub>

---

### 36. DESIGN_AUTHORITY §A5 — trilingual reach

Every label survives the longest and the shortest of the shipped languages without breaking its layout — a language that expands text by more than a third must not clip, overflow or reflow a control, and a language that halves it must not leave the layout looking broken. Money and timestamps are never clipped, in any language. Verification is at every supported width IN every shipped language, not in the source language only.

<sub>**Enforced today by** `docs/DESIGN_AUTHORITY.md:567-569` — EN ships with SW and ZH. Every label must survive Swahili at ~35-40% LONGER and Chinese at ~50% SHORTER. Wrap or ellipsise text — NEVER clip money or a timestamp.</sub>

---

### 37. DESIGN_AUTHORITY §A6 — the design widths

The system is designed and verified at a named set of widths spanning the narrowest supported phone to the widest supported desktop, with zero horizontal overflow at the narrowest. A sweep that stops at the widest common laptop cannot see an over-wide console; a sweep that only tests overflow cannot see over-wide at all.

<sub>**Enforced today by** `docs/DESIGN_AUTHORITY.md:570` — Design at 360 / 768 / 1280 / 1920, and zero horizontal overflow at 360. (The rendered sweep actually drives ten widths from 320 to 2560.)</sub>

---

### 38. DESIGN_AUTHORITY §C1 — how money is written

Every amount carries its currency unit explicitly, is grouped, and is set in the tabular monospace face. A bare number is never money. Signed values use the typographic minus sign, not a hyphen. Where a foreign-currency figure is legitimately shown because a source publishes it, it must read visually as MARKET DATA and must never wear the treatment reserved for money the player earned.

<sub>**Enforced today by** `docs/DESIGN_AUTHORITY.md:578-581` — Money is written with the currency prefix, thousands separators, mono tabular. Never another currency code, never a bare number. Signed profit/loss uses U+2212 MINUS SIGN, not a hyphen. The one legal foreign-currency symbol is an asset's own published price, and it must read as market data (muted or coloured) — NEVER in the earned-money treatment.</sub>

---

### 39. DESIGN_AUTHORITY §C2 — never render a guessed number

An unknown value renders as an explicit absence plus a labelled state, never as a zero, a placeholder, or a shimmering number-shaped block. A skeleton that reads as data is the same defect as a fabricated figure. A pending state is calm and deliberate — waiting is not an error, and must not be styled as one.

<sub>**Enforced today by** `docs/DESIGN_AUTHORITY.md:582-586` — Never render a guessed, placeholder, or zero-as-unknown number. Unknown resolves to an em-dash PLUS a labelled state ('awaiting read', 'Confirming price'). A null-coalesced price rendering a zero amount is the canonical bug, and a skeleton number that looks like data is the same bug wearing a shimmer. Confirming states are calm and deliberate — a confirming price is not an error.</sub>

---

### 40. DESIGN_AUTHORITY §C3 — unrealised figures (LICENCE)

NON-NEGOTIABLE, LICENCE. Any figure that is not yet realised is visibly labelled as unrealised at the point it is read — an open position's value carries an explicit 'as if settled now' qualifier, any projection carries an estimate marker and a qualifier line, and a per-position potential payout is not shown at all before resolution. Stating what someone 'will win' on an open position is a promised return and a regulatory finding, regardless of how the number is styled. A redesign may restyle the caption; it may not remove, shrink below the reading floor, or visually subordinate it away.

<sub>**Enforced today by** `docs/DESIGN_AUTHORITY.md:587-591` — LICENCE/COMPLIANCE — explicitly attributed to the 2026-05 licence review. An unrealised figure is ALWAYS labelled as one: open-position value is captioned 'if settled now'; a projected multiplier always carries 'est.' and a qualifier line; per-position potential payout stays HIDDEN pre-resolution. Stating a payout on an open round is a PROMISED RETURN, which is a licensing problem, not a copy preference.</sub>

---

### 41. DESIGN_AUTHORITY §C4 — losses stated with dignity (LICENCE-adjacent)

A loss is rendered as bookkeeping: calm, factual, final. No punishment styling, no alarm panel, no colour or motion that dramatises it. A settled screen closes with an explicit finality statement so the reader knows nothing further is owed. A void or refund is NEUTRAL — the money came back, so treating it as an error is factually wrong as well as unkind.

<sub>**Enforced today by** `docs/DESIGN_AUTHORITY.md:592-594` — Losses are stated with dignity: calm, factual, final. No punishment styling, no alarm panels. The closing line is 'Every figure here is final — nothing further is owed.' VOID / refunded is NEUTRAL — never an error treatment; the money came back.</sub>

---

### 42. DESIGN_AUTHORITY §C5 — the only permitted urgency (LICENCE/RG)

NON-NEGOTIABLE, LICENCE/RG. The only manufactured urgency in the product is the countdown on a thing that is genuinely closing, and it is scoped to that thing — a persistent urgency cue in global chrome is a responsible-gambling finding. Nothing in the celebration vocabulary may be a casino-style reward mechanic: no confetti, no flashing, no streak or combo meter, no perpetual loop. A win breathes or fades and then rests.

<sub>**Enforced today by** `docs/DESIGN_AUTHORITY.md:595-597` — LICENCE / RESPONSIBLE-GAMBLING. The countdown is the ONLY manufactured urgency permitted. No confetti, no flashing, no streak flames, no combo meters, no celebratory burst beyond the calm aura. Wins breathe or fade; NOTHING SPINS FOREVER. Reinforced at line 840-844: a permanent countdown in global chrome was REFUSED as a persistent urgency cue and an RG problem for a licensed operator.</sub>

---

### 43. DESIGN_AUTHORITY §C6 — no emoji in UI copy

No emoji appears anywhere in interface copy. Every pictogram is a stroke vector from the icon set or a typographic mark. The reasons are cumulative and all three survive a redesign: tone on a licensed money product, rendering fidelity on the cheapest target device, and localisation — an emoji cannot be translated.

<sub>**Enforced today by** `docs/DESIGN_AUTHORITY.md:598-600` — NO EMOJI IN UI COPY. ANYWHERE. Glyphs are stroke SVG from the kit, or typographic marks. Three stated reasons in order: tone on a licensed money product; rendering on cheap Android; and localisation, because an emoji is not translatable.</sub>

---

### 44. DESIGN_AUTHORITY §C7 — the illustration idiom

Illustration has ONE stated idiom, expressed as a stroke weight and a single accent rather than a mood board, so a new illustration is checkable against it. No mascots — the product is a licensed money instrument, not a game. And no reusable artwork contains baked-in text, because baked-in text cannot be translated into the other shipped languages.

<sub>**Enforced today by** `docs/DESIGN_AUTHORITY.md:601-602` — Illustration idiom: gilt line-art / etched SVG, 1.5px stroke, a single accent. No mascots. NO BAKED-IN TEXT IN REUSABLE ART — it cannot be translated.</sub>

---

### 45. DESIGN_AUTHORITY §T1 — the type scale is closed

The type scale is CLOSED: every size in the product comes from a named step. An arbitrary hand-typed size is a violation even when it looks correct in isolation, because the next screen picks a different number and the system dies one reasonable-looking decision at a time.

<sub>**Enforced today by** `docs/DESIGN_AUTHORITY.md:506-508` — Sizes come from the ladder. A hand-typed arbitrary size is a violation EVEN IF IT LOOKS RIGHT — the next screen will pick a different number and the product loses its rhythm one component at a time.</sub>

---

### 46. DESIGN_AUTHORITY §T2 — a token's name is not its meaning

Every step of the type scale is documented by the ROLE it plays, not by an implied hierarchy, so a later reader cannot infer the wrong meaning from the name and restyle the wrong surface. Where a step exists to serve one specific surface, say so beside the value.

<sub>**Enforced today by** `docs/DESIGN_AUTHORITY.md:509-511` — The largest type token is the MARKET-QUESTION size, not a page-title token; page and section headings use a different, smaller step. Reading the token as 'the heading size' restyles the wrong thing.</sub>

---

### 47. DESIGN_AUTHORITY §T3 — the sub-reading tier is labels only

Any type step that sits below the reading floor is explicitly declared as a LABEL tier — uppercase, tracked, monospace — and is forbidden for reading copy. A system that has such steps must name them and fence them; a system that does not have them has no exception to police.

<sub>**Enforced today by** `docs/DESIGN_AUTHORITY.md:512-514` — Two named steps sit BELOW the reading floor deliberately, and are blessed for UPPERCASE mono tracked microlabels ONLY. NEVER reading copy.</sub>

---

### 48. DESIGN_AUTHORITY §T4 — the reading floor

There is a declared minimum size for READING copy, separately for screen and for print, and anything below it is by definition a label rather than prose. The floor is stated as a number so it can be checked, not left to judgement.

<sub>**Enforced today by** `docs/DESIGN_AUTHORITY.md:515` — Reading-copy floor: 12.5px in-app, 12pt in print. Below that is a label, not prose.</sub>

---

### 49. DESIGN_AUTHORITY §T5 — every numeral is mono and tabular

Every numeral that is DATA is set in the tabular monospace face with fixed-width figures — including numbers that appear inside a body sentence. Proportional digits make a changing figure twitch and shift its neighbours, which on a money surface reads as instability. The rule is about what the number IS, not about which component it sits in.

<sub>**Enforced today by** `docs/DESIGN_AUTHORITY.md:516-518` — Every numeral is the monospace face with tabular-nums — NO EXCEPTIONS, including numbers inside body sentences when they are DATA (stakes, odds, times). Proportional digits make a changing number twitch.</sub>

---

### 50. DESIGN_AUTHORITY §T6 — three families, and no CJK webfont

The type system names a small closed set of families with distinct jobs. Any font it ships must be licensed for commercial use, embedding and web serving, and the licence must not require in-UI attribution; if the wordmark is set in one of them rather than drawn, that must be true of its licence too. And no webfont is downloaded for a script the product only needs as fallback — the target user is on metered mobile data and a full CJK face is megabytes.

<sub>**Enforced today by** `docs/DESIGN_AUTHORITY.md:519-521` — Display / body / numerals-and-labels are three distinct families. CJK is PER-GLYPH FALLBACK — no CJK webfont is downloaded, deliberately, because players are on Tanzanian mobile data and a CJK face is megabytes. (Licensing: all three faces are SIL OFL 1.1 — commercial use, embedding and web serving, no in-UI attribution; the wordmark is set in the display face, so there is no separate logotype to license — line 207-209.)</sub>

---

### 51. DESIGN_AUTHORITY §S1 — space is gap, from a scale

Layout rhythm comes from a named spacing scale applied as gap on the container, not as per-element margins. A container owns the space between its children; a child does not own the space around itself. This is what makes a screen a reader has never seen before still read as the same product.

<sub>**Enforced today by** `docs/DESIGN_AUTHORITY.md:529-531` — Layout space comes from the spacing scale applied as GAP on flex/grid — not as margins sprinkled per element. Consistent gutters are what make an unfamiliar screen read as the same product.</sub>

---

### 52. DESIGN_AUTHORITY §S2 — one radius per family

The radius scale is closed and each COMPONENT FAMILY maps to exactly one step of it, documented as a mapping rather than left per-component. Every documented exception (a size that steps up, a shape that goes fully round) is written down. A one-off arbitrary radius is not a small liberty — it is a second place a design truth lives.

<sub>**Enforced today by** `docs/DESIGN_AUTHORITY.md:532-537` — The radius scale is additive and CLOSED, and each family has ONE radius: cards/modals/sheets take one step; inputs, stake rows, stat tiles and ledger containers another; tabs and filter pills another; chips, quick-stake pills and split-bar tracks the pill radius; avatars and dots 50%. Buttons take the control radius, except the largest button size, which takes the card radius. No one-off arbitrary radius — an arbitrary radius is a SECOND DEFINITION SITE.</sub>

---

### 53. DESIGN_AUTHORITY §S3 — border weight is semantic

Line weight encodes what a line IS — structure, instrument, brand — as a documented ladder, not a per-component aesthetic choice. Every weight in the system maps to one of those meanings, and choosing a weight because it looks right is how two adjacent components end up contradicting each other about what a line means.

<sub>**Enforced today by** `docs/DESIGN_AUTHORITY.md:538-542` — Border weights are SEMANTIC, not decorative: the thinnest weight is structure (with a stronger variant for emphasis and dashed for empty states); the next is INSTRUMENT (dial rings, line-art, icon strokes); the next is BRAND (the mark's own ring and divider); the needle is heaviest. A weight chosen for looks rather than for what the line IS will contradict the next one.</sub>

---

### 54. DESIGN_AUTHORITY §E1 — a shadow is composed, never retyped

Elevation is composed from named parts — an edge and a cast — and never retyped as a literal. The shadow family has exactly one definition site, enforced, so a change to the ladder reaches every consumer at once.

<sub>**Enforced today by** `docs/DESIGN_AUTHORITY.md:636-638` — A shadow is COMPOSED from tokens (an edge token plus a cast token), never retyped. The shadow family is guarded: a second definition site is a hard token-gate failure.</sub>

---

### 55. DESIGN_AUTHORITY §E2 — the overlay rung is deliberately shallower

Depth encodes ATTACHMENT, not importance: a surface anchored to a trigger sits shallower than a surface that owns the screen behind a scrim. Any rung whose depth is deliberately lower than a neighbour's must say so, or a later tidy-up will 'correct' it.

<sub>**Enforced today by** `docs/DESIGN_AUTHORITY.md:639-640` — The overlay rung is SHALLOWER than the modal rung on purpose — an overlay is attached to a trigger, not to a scrim, so it must not claim a dialog's depth.</sub>

---

### 56. DESIGN_AUTHORITY §E3 — bottom-docked surfaces cast upward

A surface docked to an edge casts AWAY from that edge. A bottom sheet with a downward cast throws its shadow off-screen entirely and reads as pasted onto the viewport rather than floating above the page. The system must carry a distinct rung for edge-docked surfaces, not reuse the general one.

<sub>**Enforced today by** `docs/DESIGN_AUTHORITY.md:641-642` — Bottom-docked surfaces cast UPWARD. A downward cast on a bottom sheet throws its shadow off-screen and the panel reads as PASTED ONTO THE VIEWPORT.</sub>

---

### 57. DESIGN_AUTHORITY §E4 — glows track the brand

Every derived colour effect — glow, halo, tint, scrim — is mixed FROM a brand token rather than authored as an independent hue, so re-hueing the brand carries every derived effect with it automatically. A pinned raw hue is a colour that will silently stop matching.

<sub>**Enforced today by** `docs/DESIGN_AUTHORITY.md:643` — Glows MIX OFF the brand colour, so they track the brand instead of pinning a raw hue.</sub>

---

### 58. DESIGN_AUTHORITY §E5 — every keyframe family has a written calm branch, and they differ

Every animation family has a calm branch that is written for THAT family, not a blanket disable: an ambient loop stops, a celebration reduces to a fade, a counting number reduces to a colour change, a transform is neutralised at both ends (a half-neutralised transform leaves the element displaced), and a stagger collapses. Every perpetual animation additionally has an entry in the low-end-device list. A new animation lands with its branches in the same change, or it does not land.

<sub>**Enforced today by** `docs/DESIGN_AUTHORITY.md:644-649` — Every keyframe family has a written calm branch AND THEY ARE NOT ALL THE SAME BRANCH: pausing a ticker, removing a shimmer and reducing a celebration to a fade are three different answers. Ambient loops pause or stop; celebrations become FADE ONLY; count-ups become COLOUR ONLY; transforms are explicitly neutralised in the `from` AND the `to`; staggers collapse. Every infinite animation needs an entry in the low-end tier's one list.</sub>

---

### 59. DESIGN_AUTHORITY §E6 — check the registry before adding a keyframe

There is ONE keyframe registry across every stylesheet and every inline style block, and a new motion must be checked against it before it is named. A duplicate name is not untidiness — the last definition wins document-wide and silently retunes every existing consumer of that motion.

<sub>**Enforced today by** `docs/DESIGN_AUTHORITY.md:650-652` — Before adding a keyframe, CHECK THE ONES THAT ALREADY EXIST across all four stylesheets. No new name may duplicate an existing one; the registry is pinned by the keyframe gate.</sub>

---

### 60. DESIGN_AUTHORITY §E7 — there is no rung below the shortest duration

The duration ladder has a declared FLOOR and nothing sits below it; a value shorter than the shortest rung is a documented exemption with a written reason, never a convenience. Without a floor, 'just a bit faster' repeats until the ladder means nothing.

<sub>**Enforced today by** `docs/DESIGN_AUTHORITY.md:653-654` — There is NO rung below the shortest duration token. Any raw sub-floor duration is a deliberate, DOCUMENTED exemption — not a convenience.</sub>

---

### 61. DESIGN_AUTHORITY §E8 — import order is part of the contract

The cascade order of the stylesheets is part of the system's contract and is stated where an author will see it — which sheet wins at equal specificity is not something a later reader should have to derive. Every tool that reads the stylesheets reads them in that same order, so no instrument can silently pick a different winner than the browser does.

<sub>**Enforced today by** `docs/DESIGN_AUTHORITY.md:655-656 and §0d:134` — The motion stylesheet is imported LAST, so at equal specificity it OUTRANKS everything in the base stylesheet. Place a rule accordingly. The contrast gate's corpus is ordered the same way, deliberately, 'written the way the browser sees it'.</sub>

---

### 62. DESIGN_AUTHORITY §H1 — physical events only (LICENCE)

NON-NEGOTIABLE, LICENCE. Haptic feedback fires only for physical events — contact, crossing a threshold, coming to rest. It never fires as encouragement, as a reward, or to pull a user back into the app. On a licensed gambling product a congratulatory buzz is a dark pattern, and this holds whatever the new haptic vocabulary is called.

<sub>**Enforced today by** `docs/DESIGN_AUTHORITY.md:614-616` — LICENCE/COMPLIANCE. Haptics fire for PHYSICAL EVENTS ONLY: contact, passing true, coming to rest. Never encouragement, never reward, never to pull attention back to the app. On a licensed gambling product A CONGRATULATORY BUZZ IS A DARK PATTERN, not delight.</sub>

---

### 63. DESIGN_AUTHORITY §H2 — proportional, with a speed floor

Haptic intensity is proportional to the real physical quantity that caused it, and there is a stated threshold below which nothing fires at all. A grazing contact is something you see and do not feel; without a floor, every incidental movement buzzes.

<sub>**Enforced today by** `docs/DESIGN_AUTHORITY.md:617-618` — Impact strength scales with real impact SPEED. Below a stated speed floor (0.35 px/ms) nothing fires — 'that is a graze you should see and not feel'.</sub>

---

### 64. DESIGN_AUTHORITY §H3 — rate limit

Haptic events carry a stated minimum interval, below which repeats are suppressed — closer pulses are indistinguishable to skin and only cost battery on the cheapest target device.

<sub>**Enforced today by** `docs/DESIGN_AUTHORITY.md:619-620` — Rate-limited to a stated minimum interval (40ms). Closer than that is indistinguishable to skin and only costs battery.</sub>

---

### 65. DESIGN_AUTHORITY §H4 — silent when asked

Haptics are suppressed entirely by the OS reduced-motion preference, by the product's own mute setting, and by the document being hidden — three independent off switches, all honoured, all at the module boundary.

<sub>**Enforced today by** `docs/DESIGN_AUTHORITY.md:621-622` — The OS reduced-motion preference, the in-app mute, or a hidden document each suppress EVERYTHING.</sub>

---

### 66. DESIGN_AUTHORITY §H5 — fails silently, no feature detection at call sites

Support detection lives inside the haptics module and nowhere else; a call site never guards its own call. Otherwise every new component invents its own detection and they drift.

<sub>**Enforced today by** `docs/DESIGN_AUTHORITY.md:623` — Fails silently where unsupported — NO feature-detection in calling code.</sub>

---

### 67. DESIGN_AUTHORITY §H6 — no faked haptics on platforms that lack them (LICENCE)

NON-NEGOTIABLE. Where a platform provides no haptic API, the product provides no haptics — it does not simulate one through an audio side-channel. Absence is the correct behaviour, not a gap to be filled.

<sub>**Enforced today by** `docs/DESIGN_AUTHORITY.md:624-625` — LICENCE/DARK-PATTERN. iOS gets NO haptics and we do not fake it. The audio-context workaround is a DARK PATTERN. Leave it absent.</sub>

---

### 68. DESIGN_AUTHORITY §H7 — a documented hack, with a written exit

Where the system approximates a capability the platform does not expose, the approximation is documented AS one, is confined to a single module, and has a written upgrade path that does not touch a single call site. A hack whose exit is not written becomes the architecture.

<sub>**Enforced today by** `docs/DESIGN_AUTHORITY.md:626-628` — Duration is standing in for amplitude, which is a DOCUMENTED HACK. If a native wrapper ever ships, replace the module's internals with real amplitude curves and KEEP EVERY CALL SITE IDENTICAL.</sub>

---

### 69. DESIGN_AUTHORITY §M1 — one lamp

There is exactly ONE light source in the system, declared once as a direction. Every lit surface catches an EVEN inner ring — never a one-sided top line, never pure white — and the direction of the light is expressed in the surface WASH, not in the edge. Casts fall in a single consistent direction regardless of how the light is tilted: the tilt lives in the light, never in the gravity. A surface lit from a second direction is a bug wherever it is authored, including inline in a component.

<sub>**Enforced today by** `docs/DESIGN_AUTHORITY.md:698-707` — Light comes from high above the plane, tilted at the MARK'S OWN AXIS. Every lit surface catches a soft EVEN 1px inner ring carrying a small brand tint — never pure white, and never a one-sided line. The direction of the light lives in the WASH; speculars centre off-centre; shadows fall STRAIGHT DOWN. 'The tilt lives in the light, never in the gravity.' There is no second lamp; a surface lit from below or from the right is a bug, including a component inline style — which is where the last seven lived.</sub>

---

### 70. DESIGN_AUTHORITY §M2 — a surface picks a rung; it never composes a shadow

Elevation is a small closed ladder of named rungs. A component takes a rung and is finished; it never composes its own shadow, and if it needs a rung that does not exist, the SYSTEM gains one deliberately. The flattest rung is legitimate, not a failure to decorate. Critically, the ceiling on how light a surface wash may go is DERIVED FROM THE TEXT AND BORDER CONTRAST FLOORS, not chosen for looks — the ladder must rise on the cast and the ring, because the wash is constrained by legibility. Semantic tint is independent of rung and composes into any of them. Each rung declares what it does to a component's own border, and each has exactly one arrival and one exit.

<sub>**Enforced today by** `docs/DESIGN_AUTHORITY.md:709-728` — Five rungs (flat to toast). A component TAKES a rung and is done; if it genuinely needs a sixth, THE SYSTEM gains one with a token and a spec — the component does not improvise. `flat` is a legitimate rung, not a failure. Every wash's lit stop is CAPPED, and the cap was SOLVED FROM THE INK FLOORS (the faintest text at 4.5 and the control border at 3.0), not chosen — the ladder rises on the cast and the ring, and the wash's one job is direction. Tint is RUNG-INDEPENDENT and composes into any rung through a slot (the delivery welded a top-rung cast to whatever it touched, and that was sent back). A surface taking the two floating rungs DROPS ITS OWN BORDER; the modal rung does not. Each rung pairs with its arrival AND its exit — there is no third entrance.</sub>

---

### 71. DESIGN_AUTHORITY §M3 — gold is struck, and struck means earned

The product's premium material is anchored on a MEASURED value taken from the trademark, not on a value someone typed from memory — and the surface treatment and the trademark share one source so they cannot drift. Its usage is reserved to money that was EARNED; anything decorative wearing it is a violation. It uses a restrained specular treatment rather than a radial bloom or rays, which read as reward mechanics and dilute a financial texture. And any control wearing it keeps a real focus outline, because a shadow-based ring vanishes in forced-colors mode and this treatment lands on the deposit control.

<sub>**Enforced today by** `docs/DESIGN_AUTHORITY.md:730-741` — The earned-money treatment renders as SATIN METAL: one calm ramp anchored on the MEASURED trademark colour, an even edge ring, one soft specular sweep on hover implemented as a PER-LAYER keyframe (do not 'simplify' it to one value — the metal slides off the button). NO BLOOM — a radial glow dilutes the financial texture. RAYS ARE BANNED. The usage law has teeth: struck gold appears ONLY where money was earned (payout, celebration, resolved seal); a decorative element wearing it is a violation, not a style choice. The class keeps a REAL outline on focus, because a box-shadow ring is invisible in forced-colors and this class lands on the Deposit button.</sub>

---

### 72. DESIGN_AUTHORITY §M4 — money is mono and never reflows

Every amount is set in the tabular monospace face and is never letter-spaced — tracking belongs to identifiers, not to money. Any animation on a changing number must not shift the layout around it; the tabular figures are what make that true, and it must be verified, not assumed. Where a celebration renders an amount, the amount stays in the money face — a display face for the big number is exactly the trade that was made and reversed.

<sub>**Enforced today by** `docs/DESIGN_AUTHORITY.md:743-749` — Every amount: monospace, tabular figures, NEVER letter-spaced — tracking is for identifiers; money has weight. At the earned peak it takes the struck-type treatment. A motion on a changing number MUST NOT SHIFT LAYOUT; verify with tabular figures. (Recorded amendment: the delivery specified the display face for the celebration amount; mono won, and the source doc was amended.)</sub>

---

### 73. DESIGN_AUTHORITY §M5 — a glyph moves for a reason

Glyph motion is a small closed vocabulary applied as classes, so a new glyph inherits the system's motion by taking one — not by authoring its own keyframes. Triggers are mount, data change and state change; never hover. In-flight state uses the progress primitive, not a spinning icon. And the law governs motion without demanding it: a static glyph staying static is compliant.

<sub>**Enforced today by** `docs/DESIGN_AUTHORITY.md:751-759` — Four motion primitives applied as classes (arrival, directional emphasis, alert, state morph) are the ONLY motion a glyph may take, and all glyphs in the set inherit by taking a class. Triggers are mount, data change, or state change — NEVER hover; 'icons respond, they do not perform'. The nudges fire on a data CHANGE only, never on mount. In-flight is the progress primitive, not a spinning glyph. A glyph with bespoke keyframes is a violation. Static glyphs stay static — this law GOVERNS motion, it does not demand it.</sub>

---

### 74. DESIGN_AUTHORITY §M6 — three reduced-motion gates, not two

Reduced motion has THREE audiences, and the third is the product's own target device: the OS preference, the user's in-app setting, and a low-end-hardware tier detected from device capability. The first two are CLAMPS and must zero delay as well as duration — a delayed keyframe with its duration zeroed holds an invisible first frame for the whole delay, so the surface is simply absent. The third is a THROTTLE, not a clamp: durations survive, ambient loops stop. Every animated state ships written branches for all applicable gates in the same change, end frames render, and nothing is left invisible.

<sub>**Enforced today by** `docs/DESIGN_AUTHORITY.md:761-777` — THREE gates, and the material delivery only named two. (1) The OS media query — the universal clamp zeroes duration AND DELAY, because with only duration zeroed a delayed animation holds its invisible first frame for the whole delay. (2) The user's own in-app setting, a written MIRROR of every branch. (3) A low-end-device tier detected from core count, RAM or a data-saver signal — a THROTTLE, not a clamp: full durations, ambient loops off, and its one list must contain every infinite animation. Every material/glyph/seal/crest state has written branches for the two clamps: end frames render, nothing invisible. A new animation lands with its branches in the same change or it does not land. 'Our target device is exactly the one the third gate covers.'</sub>

---

### 75. DESIGN_AUTHORITY §M7 — wins get the seal, losses get the receipt (COMPLIANCE)

NON-NEGOTIABLE, COMPLIANCE. The celebration vocabulary — whatever it becomes — is EXCLUSIVE to a win. A loss is bookkeeping: factual, uncoloured, no ceremony, no draining counter, no altered brand mark. The asymmetry is deliberate and must be preserved: a dramatised loss is punitive, it dilutes the win, and it is a compliance liability. A redesign that gives loss its own expressive treatment 'for balance' is reintroducing the defect.

<sub>**Enforced today by** `docs/DESIGN_AUTHORITY.md:779-786` — COMPLIANCE. The celebration vocabulary is EXCLUSIVE to a win. A loss renders as bookkeeping: a factual toast on a plain rung with no colour and no tick, the settled card leading with the outcome, the instrument settling crisply against the position. No red ceremony, no drained counters, no altered mark. A dramatized loss is PUNITIVE, DILUTES THE WIN, AND IS A COMPLIANCE LIABILITY. The asymmetry IS the design.</sub>

---

### 76. DESIGN_AUTHORITY §M8 — the mark performs, nothing else borrows its stage

Identity motion is reserved for the trademark; no other element borrows it. The mark's own colours are fixed and are NOT theme tokens — brand identity and theme are separate systems and are allowed to differ. Clear space around the mark is a ratio of its own diameter and applies even inside the product's own artwork, not only in external placements. Any surface treatment derived from the mark shares ONE source with it so the two cannot drift. And an easing that belongs to a specific instrument stays with that instrument.

<sub>**Enforced today by** `docs/DESIGN_AUTHORITY.md:788-796` — Identity motion is RESERVED for the trademark. The mark's colours stay the delivered brand hexes in chrome; on the seal it renders single-ink relief. CLEAR SPACE IS LAW EVEN INSIDE OUR OWN SEAL — a stated ratio of the diameter, and the measured ceiling is quoted. Surface gold is the trademark RE-DERIVATION, and the two never drift because they share one source. The pivot easing is reserved for the instrument and dials; the alert primitive takes the general glide, because 'a bell is neither'.</sub>

---

### 77. DESIGN_AUTHORITY §B1a — the mark's reproduction law

The brand mark has ONE definition site, in code, and every raster and vector asset the product ships is GENERATED from it — hand-editing an exported asset is how a superseded logo ships to every app icon and every outbound email. The mark carries a reproduction law: a minimum size at which it may be used, a simplified form below that with its own minimum, an automatic switch between them, and clear space stated as a ratio of its own size. Any geometry the system derives from the mark must be MEASURED from the artwork, not chosen; and wherever a platform limitation forces that number to be duplicated, that duplication is named at both sites so they move together. Any per-user generative identity artwork is a SECOND system and must not borrow the mark's forms.

<sub>**Enforced today by** `docs/DESIGN_AUTHORITY.md:167-209` — The mark has ONE definition, in code, and every SVG and PNG under the brand and icon folders is GENERATED from it by a build script. NEVER hand-edit a brand asset — editing one directly is how the app icon and every outbound email once shipped a superseded logo. Reproduction law, enforced in the component which auto-switches below a threshold: a minimum size for the full mark, a smaller minimum for the simplified form, and clear space as a ratio of diameter. The axis angle is MEASURED FROM THE ARTWORK, not chosen (derived by arctangent from the shipped coordinates) — and one keyframe writes it LITERALLY because the transform cannot take a custom property in every engine, so that is the one place the number is duplicated and it must move with the axis. The per-player crest is a SECOND system and must not borrow from the mark.</sub>

---

### 78. DESIGN_AUTHORITY §B2 — the affirmative/negative mapping is untouchable

Whatever the new palette is, the two semantic money colours mean exactly one thing each — affirmative/win and negative/loss — and that mapping is never inverted and never reused for a non-money meaning anywhere in the product. The pair forms one control, so they are designed together, including the case where contrast forces one label light and the other dark. Reusing a money semantic colour for a status, a category or a decoration is a violation.

<sub>**Enforced today by** `docs/DESIGN_AUTHORITY.md:211-216` — The affirmative colour means YES/win and the negative colour means NO/loss. This mapping is LOAD-BEARING for a money product and must never be inverted, re-hued, or reused for a non-money meaning. The two together form the core betting control, and their duality (one light-labelled, one dark-labelled where contrast requires) must be preserved.</sub>

---

### 79. DESIGN_AUTHORITY §B3 — one theme

The number of themes the product ships is a DECISION WITH A COST, stated once: every contrast ratio the product proves is computed for the surfaces it actually has, so a second theme is a second complete contrast surface that must be proved from scratch on money screens before it ships — not a variant that inherits the first one's proof. If the redesign introduces a second theme, every contrast gate, every material rule derived from the darkest surface, and every well/lamp threshold must be re-derived per theme; the current light/well classifier is documented as valid only under a dark surface.

<sub>**Enforced today by** `docs/DESIGN_AUTHORITY.md:218-228` — The product has ONE theme. The alternate scheme was deliberately killed and correctly removed: zero alternate-theme selectors, zero theme-library imports, zero theme toggles, zero per-variant utilities, and the colour scheme is forced in the stylesheet. Every contrast ratio the product PROVES is computed for this one surface; a resurrected second theme would be an entirely UNVERIFIED contrast surface on money screens. Pinned by the content-integrity gate.</sub>

---

### 80. DESIGN_AUTHORITY §B4 — restricted-use colours

Any colour in the palette that is NOT semantic carries a written usage restriction stated as a role and, where it is decorative, as a CEILING ON SURFACE COVERAGE — and that restriction lives beside the value, not in a separate document. A colour adjacent to a money semantic must be explicitly forbidden from money surfaces, or it will eventually be read as one.

<sub>**Enforced today by** `docs/DESIGN_AUTHORITY.md:230-238` — Two colours carry usage restrictions encoded in the stylesheet's own token comments. One is EDITORIAL-WEIGHT ONLY (a category chip, a top tier, a regulator/footer crest) and NEVER on money surfaces or adjacent to the negative money colour. The other is a FINISHING PASS ONLY, capped at <= 8% surface coverage, and never a chip, a button label, or anything semantic.</sub>

---

### 81. DESIGN_AUTHORITY §B6 — cold start is ONE rule with THREE consumers

Every derived state that appears on more than one surface — 'no activity yet', 'closing soon', 'settled' — is defined ONCE and consumed by every surface that renders it. A redesign that gives each surface its own empty state must name the shared rule they all derive from, because the failure mode is not an ugly empty state: it is two surfaces disagreeing about the same money, and the last time this happened one of them invented a 50/50 split.

<sub>**Enforced today by** `docs/DESIGN_AUTHORITY.md:494-498` — The 'no activity yet' state is derived identically by the board, the card and the detail page. Before the freeze pass, the detail page shipped a FABRICATED 50/50 split and a live-looking badge above a zero amount. If the rule changes, change all three — a card and a detail page disagreeing about someone's money is exactly the defect the read-never-infer rule exists for.</sub>

---

### 82. DESIGN_AUTHORITY §B9/B10 — one system, merged in, frozen

THIS IS THE RULE THE HANDOVER ITSELF MUST OBEY. A new design MERGES INTO the one system; it never ships beside it. Every change lands in the canonical home for its kind, in the same commit as its written spec: a value as a token, a class naming a key that exists, a new state as a PROP on the existing component rather than a clone of it. No new stylesheet file, ever. A truth in two places drifts, and on a money product drift means two surfaces disagreeing about someone's stake — which has already happened here. Concretely, a delivered redesign that arrives as a parallel folder, a second token file, or a set of new components beside the old ones has already broken this law on arrival.

<sub>**Enforced today by** `docs/DESIGN_AUTHORITY.md:437-470` — Every design change lands in the CANONICAL HOME for its kind and nowhere else: a value in the stylesheet (bridged in the framework config), a utility class naming a key that exists, a NEW STATE AS A PROP ON THE EXISTING COMPONENT, and the written spec plus the provenance changelog — in the same change. Search before you add; NO NEW .css FILE, EVER. B10: every visual primitive is decided once — edges, the elevation ladder, radii, popups, motion and focus — and components only CONSUME. You change a look by editing its token or spec; you do not reach into a component for a border, a shadow or a popup. If a component needs a look the system lacks, THE SYSTEM GAINS THE TOKEN AND SPEC. Stated history: the product was bitten three times by PARALLEL design — a dead shadow kit, a superseded palette kit, and 1,325 classes resolving to nothing. Each was a second place a design truth could live.</sub>

---

### 83. DESIGN_AUTHORITY §K — kit adoption and the Definition of Done

Every design task has the same written Definition of Done and it is checkable: no new colour literal, no new stylesheet, every new value a token, every new state a prop on an existing component, spec and changelog updated in the same change, the token/bridge/measure/freeze gates green, and a search for whatever you added finds exactly ONE definition site. A designer must never build from a dated export of the stylesheet — an export is correct exactly once and then drifts; the live file is the only truth. Final acceptance is VISUAL: a green suite is not proof, so the same surfaces are looked at across every supported width and every shipped language, and any deliberate exception is re-baselined with a written reason.

<sub>**Enforced today by** `docs/DESIGN_AUTHORITY.md:660-685` — Never hard-code a control height on a button. Never introduce a native select, checkbox or datetime input, an ad-hoc portal, or a hard-coded token literal where a kit primitive exists. Never import an icon library into a player surface. NEVER READ A STYLESHEET OUT OF A DESIGN EXPORT — those are dated snapshots and they drift; the live file is the truth. Extend the kit; never fork it — 'a design system dies not in one decision, but in fifteen reasonable-looking ones'. Definition of Done: zero new colour literals, zero new .css files, every new value a token bridged if needed, every new state a prop, the component's spec and the provenance changelog updated in the same change, four named gates green, and A GREP FOR THE THING YOU ADDED FINDS IT IN EXACTLY ONE DEFINITION SITE. 'Verification is visual, and a green suite is not proof' — verify at four widths, in three languages, and LOOK at the screenshots.</sub>

---

### 84. DESIGN_AUTHORITY §0a/§0b — one fact, one home; and the filing table

THIS GOVERNS THE HANDOVER PACKAGE ITSELF. Every kind of design fact has exactly one home, written down, including the kind you are about to create. A duplicate is fixed by deletion, never by synchronisation — two copies do not stay equal, they diverge silently, and the stale one is always the one somebody reads. An outbound commission LINKS to live files; it never bundles copies of them, and it is deleted once sent. A missing filing row is not a tidiness problem: it is where the next stale truth gets born.

<sub>**Enforced today by** `docs/DESIGN_AUTHORITY.md:64-111` — If you find a value in two places THAT IS A BUG — fix it by DELETING one, never by keeping both in sync. A law/floor/ratio goes in the rulebook; a token or paint value goes in the stylesheet AT ITS LINE with the rule as a comment beside it, never in a doc; a component's genuine code geometry stays in the component; a component spec goes beside its siblings; an OUTBOUND commission goes in one dated folder assembled from LIVE files at send time and it LINKS, it never bundles — no copy of the rulebook, no copy of the tokens, no copy of component source, no committed screenshots, never two tracked commissions at once, and the folder is deleted when the round is sent. Origin: two outbound packages filed themselves, holding 27 byte-identical copies of live files, a duplicated token file inside a single package, and a copy of the rulebook whose own line 6 says there is no second one — and the older extract had already drifted, still defining a token the live file retired with the words 'do not re-add' and telling a designer a face that had since been overturned.</sub>

---

### 85. docs — the two governance gates around the rulebook

Regenerable evidence (screenshots, exports) is not committed — a checked-in image is a claim nobody can re-derive. The one exception is an image a document cites AS a finding's proof, and a gate asserts that image still exists. Separately, every instrument in the repo is reachable from a named command, so a gate nobody can run is visible as such.

<sub>**Enforced today by** `scripts/docs-links.mjs (test:docs) + scripts/orphan-scripts.mjs (test:orphans)` — test:docs enforces that a screenshot cited by a doc as a finding's proof actually exists at its declared path (the ONE exception to 'evidence is gitignored'). test:orphans finds scripts with no npm entry. Both exist so the documentation set cannot rot into claims nobody can re-derive.</sub>


---

## B · The 8 checks that are about OUR values, not yours

These gates encode specific current values, so they will be rewritten against whatever you deliver. They are listed so you can see what shape the replacement will take — and so you can tell us if your system makes any of them impossible to express.

### 1. test:contrast — the pinned PAIR LIST

The new system ships a pair list enumerating EVERY ink/surface combination it actually paints — each text ramp step on each surface rung it can land on, each button label on its own fill and on that fill's hover state, each status/tier badge label on its own fill and each badge rim against the page. The list is regenerated from the new tokens; carrying the old one forward scores the new design against surfaces it does not have.

<sub>**Enforced today by** `scripts/contrast-audit.mts:640-830` — ~60 hand-listed foreground/background token pairs by name (--text-muted on --panel, btn-yes label on btn-yes fill, .tier-gold label on its own fill, cm-send glyph on brand-500, gilt-ink on --bg-inset, …). Each names tokens and CSS classes that only exist in the current system.</sub>

---

### 2. test:bridge — the pinned key spot-checks

Every step of the new ink ramp and every rung of the new elevation ladder is pinned by name in the guard, so deleting one fails immediately rather than waiting for a call site to notice it went dead.

<sub>**Enforced today by** `scripts/tailwind-bridge.test.mts:181-186, 232-234` — Hard-pins that specific keys are bridged: text.subtle / text.muted / text.faint / royal.300 / gilt.DEFAULT / danger.500 / info.500, and boxShadow keys card / modal / overlay / overlay-up / card-top / e1 / e5.</sub>

---

### 3. test:design-frozen — the FROZEN_ALLOWLIST contents

The new system starts its ratchet at whatever it genuinely measures on day one, with each entry annotated as either exempt-by-design (brand identity, which is deliberately not theme tokens) or backlog-with-a-count. Inheriting the old list would exempt files the new design has rewritten and would silently license fresh violations in them.

<sub>**Enforced today by** `scripts/design-frozen.test.mts:54-109` — 41 named file paths, with per-file violation counts in comments (needle.tsx 34, identity-avatar.tsx 18, first-visit-primer.tsx 21, operation-result-modal.tsx 19, global-error.tsx 18, page.tsx 17, …). Four are exempt BY DESIGN (brand marks are a byte-identical port of delivered SVGs); the rest are backlog.</sub>

---

### 4. test:design-one-door — the pinned section letters

The rulebook's own table of rule FAMILIES is pinned by the guard, so a reorganisation that quietly drops a whole family (haptics, content honesty, material) fails loudly instead of passing as a tidy-up.

<sub>**Enforced today by** `scripts/design-one-door.test.mts:50-53` — Hard-pins the eight section headings '## T —', '## S —', '## A —', '## C —', '## H —', '## E —', '## K —', '## M —'.</sub>

---

### 5. test:measure — the pinned tier VALUES

The new system declares a closed, named set of page-width tiers and the guard pins their values, so a silent retune cannot widen every page at once. The tier NAMES are also a design decision (a console, a board, a reading column, a form, a receipt, an auth split-pane are six genuinely different reading tasks) and a new system that collapses them must say why.

<sub>**Enforced today by** `scripts/measure-system.test.mts:33-41` — Asserts seven exact strings: --w-console 1600px, --w-board 1280px, --w-reading 1080px, --w-form 640px, --w-receipt 560px, --w-auth 1152px, --w-field 460px, plus --field-max defaults to none. Duplicated in scripts/responsive-audit.mjs:63 (TIER_MAX) — the ONE deliberate duplication, cross-checked by this gate.</sub>

---

### 6. test:keyframes — the pinned name lists

The new motion vocabulary is enumerated by name in the guard, so the gate says WHICH piece of work regressed rather than 'a keyframe is missing'. A name with no consumer yet is reported, not failed — otherwise the guard punishes the correct integration order.

<sub>**Enforced today by** `scripts/keyframe-registry.test.mts:173-188` — ATOM_B_NEW (12 names: glyph-settle, glyph-nudge-up/-down, glyph-swap-out/-in, glyph-ring, mark-flip, mark-pending-tilt, needle-sweep, needle-settle, seal-recoil, crest-settle) and REUSED (6: seal-impress, seal-place, badge-seal-rays, shimmer-gilt, count-up-flash, m-scrim-in) must exist. Dead names (defined, no consumer) are PRINTED, never failed — the integration order lands definitions before consumers by design.</sub>

---

### 7. test:responsive — the tap-target check is SOFT and set below the stated floor

Every interactive element is at least 44x44 CSS px at the narrowest supported width, this is asserted as a HARD failure and not a warning, and money controls are never the exception — the control where a player chooses how much to risk was once shipped at 26px. The guard's threshold must equal the stated floor: a threshold tuned so that today's shipped control does not warn is a check calibrated to the defect.

<sub>**Enforced today by** `scripts/responsive-audit.mjs:213-235, 273` — MEASURED, and it is a gap: the only tap-size check in the repo is soft() — it increments a warning counter and can never fail the run — and its threshold is height < 38px, chosen so the current medium button (38px) does not warn. The rulebook's own floor (§A2) is 40px with 44 preferred on mobile, and globals.css:210-212 ships --h-control-sm at 30px and --h-control-md at 38px, both BELOW that floor, with a comment deferring the bump to a future phase. So the documented tap floor is currently enforced by nothing.</sub>

---

### 8. DESIGN_AUTHORITY §S4 — two radius scales that disagree

A total redesign is the ONE moment this can be fixed: the new system must have exactly one radius scale, with no legacy numeric scale surviving beside it under colliding names. If two scales must coexist during migration, their names must not collide — two scales whose 'medium' means different numbers is a trap that survived because reconciling it mid-life was too expensive.

<sub>**Enforced today by** `docs/DESIGN_AUTHORITY.md:543-545 and B10 point 4 (:490-493)` — MEASURED TRAP: the legacy numeric framework radius scale is NOT the semantic scale — the same-named medium step is 8px in one and 12px in the other. Both are FROZEN and deliberately not reconciled, because renumbering shifts every corner in the product; the deferral is Ali's, dated 2026-07-29. New design uses the SEMANTIC keys only.</sub>


---

## The four that are not ours to waive

Everything above is engineering judgement and can be argued with. These four came out of a
**licence review** for a Tanzania-licensed operator and are not design decisions:

1. **Never render a guessed, placeholder, or zero-as-unknown number.** Unknown is an em-dash
   plus a labelled state ("awaiting read", "confirming price"). A skeleton number that looks
   like data is the same defect wearing a shimmer.
2. **An unrealised figure is always labelled as one.** Open-position value is captioned "if
   settled now"; a projection carries "est." and a qualifier. "You will win TZS 140" on an open
   round is a promised return, which is a licensing problem, not a copy preference.
3. **The countdown is the only manufactured urgency permitted.** No confetti, no flashing, no
   streak flames, no combo meters. Nothing spins forever.
4. **A loss is bookkeeping, not ceremony.** Calm, factual, final. No punishment styling, no
   alarm panel. A refund or void is NEUTRAL, never an error treatment — the money came back.
   The asymmetry between a win and a loss is deliberate: a dramatised loss is punitive and a
   compliance liability.

*Generated from a measured audit of the repo's 93 design gates and rulebook laws,
2026-08-11. Each entry was produced by reading the gate's source, not its name.*
