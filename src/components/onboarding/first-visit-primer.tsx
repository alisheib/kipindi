"use client";

/**
 * FirstVisitPrimer — premium three-card overlay shown the very first time a
 * player lands on the platform. After "Got it" or "Skip", a flag is
 * written to localStorage and the primer never shows again for that
 * browser. Demo runs can clear it by deleting `50pick-primer-seen`.
 *
 * Uses REAL brand components (TippingBar, FiftyMark) as live visuals
 * inside each card — no placeholder SVGs. Kit-faithful: royal canvas,
 * gilt accents, Sora headings, JetBrains Mono labels.
 */

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { I } from "@/components/ui/glyphs";
import { FiftyMark, TippingBar, GiltCorner } from "@/components/brand";
import { sideWord } from "@/lib/side-label";
import { useT } from "@/lib/i18n";

const STORAGE_KEY = "50pick-primer-seen";
const HIDE_ON = /^\/(auth|admin)(\/|$)/;
// B-26 — a deep-linked market detail (especially one carrying `?side=` from a
// shared card) is a bet-intent moment: ambushing it 700ms in with a four-card
// primer costs the platform its most valuable arriving click. The primer waits
// for a board-level landing instead.
const SUPPRESS_ON = /^\/markets\/[^/]+|^\/updown\/[^/]+/;


/**
 * 🔴 THE COPY USED TO LIVE HERE, IN ITS OWN `L10n` OBJECTS, AND THAT WAS TWO DEFINITIONS OF ONE
 * TRUTH — the `t.primer.*` keys existed in all three locales the whole time and nothing read
 * them. It was not a tidiness problem. While the dict copies sat unread they went STALE against
 * the capped-fee model: `card3Body` still described "a small margin", and the **Swahili line
 * described a fee-free split with no commission at all**. Whoever eventually wired this
 * component to the dict — which is what the landing band needed, so it could share the heading —
 * would have shipped that to every Swahili player.
 *
 * So the dict was corrected to THIS text first, and then this file started reading it (§0a:
 * delete the wrong copy, never sync both). The how-it-works band on the landing page reads
 * `card1Title` / `card1Body`, so the best copy on the site now has one home and two render sites.
 *
 * ⚠️ Four more hardcoded trilingual literals went with it — Back, Next / Got it, the skip label
 * and the dial's `drag to commit` caption, which was rendering ENGLISH to every locale inside an
 * SVG where no i18n check would look.
 */
type Card = {
  eyebrow: string;
  title: string;
  body: string;
  /** The visuals carry their own captions, so each takes the finished string rather than a
   *  locale to look up — one lookup site, and a caption cannot be missed in a nested component. */
  visual: () => React.ReactNode;
};

/* ── Card 1 visual: the 50pick mark flanked by YES/NO paths ────────────── */
/**
 * 🔴 THE SIDE WORDS WERE BAKED ENGLISH, ON THE CARD THAT TEACHES WHAT A SIDE IS.
 * Same defect as `dragToCommit` and `poolCaption` before them, one row further down:
 * a Swahili or Chinese player's very first screen spelled out "YES or NO" in a
 * language they may not read. The words now come from the lexicon (`sideWord`), which
 * also makes the vocabulary product-aware for free — see `src/lib/side-label.ts`.
 */
function VisualWhatIs({ yes, no, or }: { yes: string; no: string; or: string }) {
  return (
    <div className="relative flex flex-col items-center gap-3 py-2">
      {/* The real brand mark — exact SVG used in the app bar */}
      <div className="relative">
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: "radial-gradient(circle, oklch(48% 0.20 268 / 0.35), transparent 70%)",
            filter: "blur(16px)",
          }}
          aria-hidden
        />
        <FiftyMark size={72} />
      </div>
      {/* YES / NO labels with connecting lines */}
      <div className="flex items-center gap-6 font-mono text-[11px] font-bold tracking-[0.14em]">
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-[6px] w-[6px] rounded-full"
            style={{ background: "oklch(58% 0.16 152)", boxShadow: "0 0 8px oklch(58% 0.16 152 / 0.6)" }}
          />
          <span style={{ color: "oklch(80% 0.14 152)" }}>{yes}</span>
        </span>
        <span className="font-mono text-[9px] text-text-subtle tracking-[0.2em]">{or}</span>
        <span className="flex items-center gap-1.5">
          <span style={{ color: "oklch(80% 0.16 22)" }}>{no}</span>
          <span
            className="inline-block h-[6px] w-[6px] rounded-full"
            style={{ background: "oklch(60% 0.18 22)", boxShadow: "0 0 8px oklch(60% 0.18 22 / 0.6)" }}
          />
        </span>
      </div>
    </div>
  );
}

/* ── Card 2 visual: a real TippingBar + miniature dial ─────────────────── */
/**
 * ⚠️ TWO FIXES LIVE IN THE SVG BELOW, AND NEITHER IS COSMETIC.
 *
 * 1. `dragToCommit` was fixed here once; the other four annotations were left English —
 *    the knob's side word, both end labels and the min/max pair. They now come from the
 *    dictionary and, for the sides, from the lexicon.
 * 2. They were also drawn at `fontSize` 6 and 8, BELOW the 8.5px `--type-nano` floor
 *    (§T3), on a card a first-time player reads once. Raised to the floor — which is
 *    what forces the two geometry changes: the knob is wider because "HAPANA" at 8.5px
 *    does not fit a 32px squircle, and the right-hand end label is `text-anchor="end"`
 *    at the track's edge because a start-anchored Swahili word ran off the viewBox.
 *    ⛔ Do not shrink these back to make a long locale fit — widen the frame instead.
 */
function VisualDial({ dragLabel, yes, no, minLabel, maxLabel }: {
  dragLabel: string; yes: string; no: string; minLabel: string; maxLabel: string;
}) {
  return (
    <div className="space-y-3 py-1 w-full">
      {/* Miniature conviction dial — SVG with knob at 3.2x NO side */}
      <div className="relative mx-auto" style={{ maxWidth: 280 }}>
        <svg viewBox="0 0 280 56" width="100%" height="56" className="block" aria-hidden>
          {/* Track */}
          <rect x="0" y="20" width="280" height="12" rx="6" fill="oklch(22% 0.140 268)" stroke="oklch(34% 0.130 268)" strokeWidth="0.75" />
          {/* Inactive hint tints */}
          <rect x="0" y="20" width="140" height="12" rx="6" fill="oklch(58% 0.16 152)" opacity="0.10" />
          <rect x="140" y="20" width="140" height="12" rx="6" fill="oklch(60% 0.18 22)" opacity="0.10" />
          {/* NO-side fill from centre to knob */}
          <defs>
            <linearGradient id="primer-no-fill" x1="0" x2="1">
              <stop offset="0%" stopColor="oklch(40% 0.13 22)" stopOpacity="0.35" />
              <stop offset="100%" stopColor="oklch(60% 0.18 22)" />
            </linearGradient>
          </defs>
          <rect x="140" y="20" width="62" height="12" rx="6" fill="url(#primer-no-fill)" />
          {/* Centre tick */}
          <line x1="140" x2="140" y1="16" y2="36" stroke="oklch(34% 0.130 268)" strokeWidth="0.75" />
          {/* Knob — squircle shape via rounded rect */}
          <g transform="translate(202 26)">
            <rect x="-27" y="-16" width="54" height="32" rx="10"
              fill="oklch(28% 0.110 268)" stroke="oklch(60% 0.18 22)" strokeWidth="1.5" />
            <text x="0" y="1" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontWeight="700" fontSize="10" fill="oklch(96% 0.005 240)">3.2×</text>
            <text x="0" y="11.5" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontWeight="500" fontSize="8.5" fill="oklch(80% 0.16 22)" letterSpacing="0.08em">{no}</text>
          </g>
          {/* Side labels — anchored to the two ENDS of the track, not offset from them,
              so a longer locale grows inward instead of off the edge of the viewBox. */}
          <text x="6" y="50" fontFamily="JetBrains Mono, monospace" fontWeight="600" fontSize="8.5" fill="oklch(70% 0.12 152)" letterSpacing="0.08em">{yes}</text>
          <text x="274" y="50" textAnchor="end" fontFamily="JetBrains Mono, monospace" fontWeight="600" fontSize="8.5" fill="oklch(70% 0.14 22)" letterSpacing="0.08em">{no}</text>
        </svg>
      </div>
      {/* Annotation labels */}
      <div className="flex items-center justify-between px-2 font-mono text-micro tracking-[0.12em] uppercase text-text-subtle">
        <span>{minLabel}</span>
        {/* Was the hardcoded English "drag to commit", rendered to Swahili and Chinese players
            alike — inside an SVG annotation row, where no i18n sweep was looking. The two
            multiplier bounds either side of it were exactly the same defect, left behind. */}
        <span style={{ color: "var(--gilt)" }}>{dragLabel}</span>
        <span>{maxLabel}</span>
      </div>
    </div>
  );
}

/* ── Card 3 visual: real TippingBar showing the pool split ─────────────── */
/**
 * 🔴 `<TippingBar>` DEFAULTS `showLabels` TO TRUE, AND ITS FIVE LABEL DEFAULTS ARE ENGLISH.
 * The primitive is deliberately dict-free (see its prop docs in `brand.tsx`), so a caller
 * that omits `labels` does not render "no labels" — it renders the English fallbacks. Every
 * other TippingBar in the product passes them; this one, on the first screen a new player
 * ever sees, did not, so the SW and ZH primer read "YES 62% · leans yes · 38% NO".
 * ⛔ Never mount this primitive without `labels` + `probabilityLabel` from a dictionary.
 */
function VisualPools({ caption, poolYes, poolNo, share, barLabels, barAria }: {
  caption: string;
  poolYes: string; poolNo: string; share: string;
  barLabels: { yes: string; no: string; tipping: string; leansYes: string; leansNo: string };
  barAria: string;
}) {
  return (
    <div className="space-y-4 py-1 w-full">
      {/* Real TippingBar component — 62% YES / 38% NO */}
      <div className="px-1">
        <TippingBar yesPct={62} height={24} recastOnHover={false} labels={barLabels} probabilityLabel={barAria} />
      </div>
      {/* Payout flow annotation */}
      {/* `/[0.08]` and not `/8` (2026-08-21): Tailwind's opacity scale is a 5-step
          ladder, so `/8` is dropped before the colour is ever mixed. Both tiles
          rendered with NO fill — on the one screen that teaches a new player what a
          side means, the green/YES and red/NO wash was absent while it was being
          taught. The arbitrary form keeps the author's exact 8%. */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-1">
        {/* 8.5px, not 8 and 7 — `--type-nano` is the floor for a mono uppercase microlabel
            (§T3), and "share" at 7px was the smallest type in the entire product. */}
        <div className="rounded-lg border border-yes-700/40 bg-yes-500/[0.08] px-3 py-2 text-center">
          <p className="font-mono text-micro uppercase eyebrow font-bold" style={{ color: "oklch(70% 0.12 152)" }}>{poolYes}</p>
          <p className="font-display text-[15px] font-bold text-text">TZS 12k</p>
        </div>
        <div className="flex flex-col items-center gap-0.5">
          <span className="inline-block h-[2px] w-5 rounded-pill" style={{ background: "var(--gilt)" }} />
          <span className="font-mono text-micro uppercase tracking-[0.14em]" style={{ color: "var(--gilt)" }}>{share}</span>
          <span className="inline-block h-[2px] w-5 rounded-pill" style={{ background: "var(--gilt)" }} />
        </div>
        <div className="rounded-lg border border-no-700/40 bg-no-500/[0.08] px-3 py-2 text-center">
          <p className="font-mono text-micro uppercase eyebrow font-bold" style={{ color: "oklch(70% 0.14 22)" }}>{poolNo}</p>
          <p className="font-display text-[15px] font-bold text-text">TZS 18k</p>
        </div>
      </div>
      {/* This caption was hardcoded English — shown untranslated to every Swahili
          and Chinese player — and it said "small operator margin", which is the
          old model. It now states the actual promise, in the player's language,
          from the ONE place that copy lives (`t.primer.poolCaption`). */}
      {/* ⛔ DG-A-12 · §T3/§T4 — PROSE, AND THE SMALLEST TYPE IN THE PRODUCT.
          `t.primer.poolCaption` is "losers fund winners · a correct call never loses" (SW:
          "wapotezao hulipa washindi · jibu sahihi halipotezi") — the sentence that states the
          platform's actual promise to a player on their first visit. It was set at **8.5px**,
          uppercase and tracked: the sub-micro tier §T3 reserves for identifiers and ⛔ "never
          reading copy", four pixels under §T4's 12.5px reading floor, on the one line that has
          to be understood. `text-body-sm` (13) is the first rung at or above the floor, and the
          dressing goes with it — §T6 puts body copy in Inter, and a promise is body copy.
          ⚠️ The Swahili is the longest of the three and this is a centred single line in a
          card, so it wraps rather than clips (§A5). ⛔ Exempted by name in `qa:dg-eyebrow`. */}
      <p className="text-center text-body-sm text-text-subtle">
        {caption}
      </p>
    </div>
  );
}



/* ⛔ `readLang()` IS GONE, AND IT WAS A SECOND DEFINITION OF "WHAT LANGUAGE IS THIS". It parsed
   `kp-locale` by hand into a local `lang` state whose only job was indexing the inline copy
   objects. `useT()` already resolves the same cookie through `I18nProvider` (`i18n.tsx:39-47`),
   so with the copy in the dict there is nothing left for a private cookie parser to do — and two
   readers of one cookie is exactly how a surface ends up half-translated. */
export function FirstVisitPrimer() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const { t } = useT();

  /* The primer teaches the LONG-FORM product — its three cards are about a question with a
     YES/NO answer, not a price round — so the vocabulary is asked for as "MARKET". The lexicon
     refuses to default the product line on purpose (`side-label.ts`), and this is a call site
     that genuinely knows which one it is holding. */
  const yesWord = sideWord(t, "YES", "MARKET");
  const noWord = sideWord(t, "NO", "MARKET");

  /* The three cards, from the ONE home their copy has. Built here rather than at module scope
     because they read the active dict. */
  const CARDS: Card[] = [
    { eyebrow: t.primer.card1Eyebrow, title: t.primer.card1Title, body: t.primer.card1Body,
      visual: () => <VisualWhatIs yes={yesWord} no={noWord} or={t.common.or} /> },
    { eyebrow: t.primer.card2Eyebrow, title: t.primer.card2Title, body: t.primer.card2Body,
      visual: () => (
        <VisualDial
          dragLabel={t.primer.dragToCommit}
          yes={yesWord}
          no={noWord}
          minLabel={t.primer.dialMin.replace("{n}", "1")}
          maxLabel={t.primer.dialMax.replace("{n}", "200")}
        />
      ) },
    { eyebrow: t.primer.card3Eyebrow, title: t.primer.card3Title, body: t.primer.card3Body,
      visual: () => (
        <VisualPools
          caption={t.primer.poolCaption}
          poolYes={t.primer.poolSide.replace("{side}", yesWord)}
          poolNo={t.primer.poolSide.replace("{side}", noWord)}
          share={t.primer.poolShare}
          barLabels={{ yes: yesWord, no: noWord, tipping: t.market.tipping, leansYes: t.market.leansYes, leansNo: t.market.leansNo }}
          barAria={t.market.probBarAria.replace("{side}", yesWord)}
        />
      ) },
  ];

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (HIDE_ON.test(pathname ?? "/")) return;
    if (SUPPRESS_ON.test(pathname ?? "/")) return; // B-26 — not on a deep-linked detail
    if (/HeadlessChrome|Playwright/i.test(navigator.userAgent)) return;
    try {
      const seen = window.localStorage.getItem(STORAGE_KEY);
      if (seen === "1") return;
      const t = window.setTimeout(() => setOpen(true), 700);
      return () => window.clearTimeout(t);
    } catch {
      /* private browsing */
    }
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    // ←/→ step through the cards (bespoke). Esc is handled by <Modal>.
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") setStep((s) => Math.min(CARDS.length - 1, s + 1));
      if (e.key === "ArrowLeft") setStep((s) => Math.max(0, s - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function persistSeen() {
    try { window.localStorage.setItem(STORAGE_KEY, "1"); } catch { /* ignore */ }
  }
  function dismiss() {
    persistSeen();
    setOpen(false);
  }
  function next() {
    if (step < CARDS.length - 1) {
      setStep(step + 1);
    } else {
      dismiss();
    }
  }
  function back() {
    if (step > 0) setStep(step - 1);
  }

  if (HIDE_ON.test(pathname ?? "/")) return null;

  const c = CARDS[step];

  return (
    <Modal
      open={open}
      onClose={dismiss}
      sheet
      zIndex={150}
      maxWidth={460}
      ariaLabel={t.primer.primerLabel}
      showClose={false}
      panelClassName="overflow-hidden !p-0"
    >
        {/* Gilt corners — heraldic framing from the brand kit */}
        <div className="pointer-events-none absolute top-0 left-0" aria-hidden>
          <GiltCorner size={40} rotate={0} />
        </div>
        <div className="pointer-events-none absolute top-0 right-0" aria-hidden>
          <GiltCorner size={40} rotate={90} />
        </div>

        {/* Gold progress strip at top.
            THE STRIP SCALES; IT DOES NOT WIDEN. `transition-all` on a `width` animated
            a LAYOUT property for 500ms on every step change, inside a sheet that is the
            first thing a new player ever sees — on the cheapest phone in the funnel.
            `transform: scaleX()` draws the identical strip on the compositor. Model:
            `.admin-bar-grow` (state-tokens.css).
            ⭐ Nothing is squashed here, and it is worth saying why rather than leaving
            it to be re-checked: the strip carries NO border-radius (so there is no cap
            to distort) and NO child (so there is no label to squeeze). The one thing
            scaleX does reshape is the `90deg` gradient — and it reshapes it exactly the
            way `width` did, compressing the full gold-500 → gold-300 ramp into the
            drawn length. Same picture, one less reflow.
            §M6 · this is a transition, so all three gates already hold: motion.css's
            universal clamp zeroes `transition-duration` for the OS query,
            `html.kp-reduce-motion` and `[data-motion="minimal"]`, and the
            `[data-motion="reduced"]` list in globals.css §6 governs `infinite`
            animations only. With motion off the strip jumps to the new step — the
            correct end frame. */}
        <div className="absolute inset-x-0 top-0 h-[2px]" aria-hidden>
          <div
            className="h-full w-full origin-left transition-transform duration-500"
            style={{
              transform: `scaleX(${(step + 1) / CARDS.length})`,
              background: "linear-gradient(90deg, var(--gold-500), var(--gold-300))",
            }}
          />
        </div>

        {/* Step indicators + close */}
        {/* ⭐ THE TARGET IS PADDED; THE BAR IS NOT THICKENED (§A2). Each step indicator was a
            3px-TALL `<button>` — a real control, with a real `aria-label`, that no finger can
            land on. It now presents a 40px box and keeps its 3px hairline drawn inside, so the
            graphic is unchanged and only the row's height moves (32 → 40, set by the close
            button beside it, which was already at the floor: `h-7` is 40px on this project's
            remapped spacing scale, not 28 — it is spelled in pixels here only so the two
            controls in this row state the same number the same way).
            ⛔ Do not "fix" the indicator by making the bar thicker: the three hairlines ARE the
            design, and a 40px bar is a progress bar, not a step rail. `aria-current` is added
            for the reason the /live pager has it — the active step was distinguished by colour
            and a glow alone (§A4). */}
        <div className="flex items-center gap-1.5 px-5 pt-5">
          {CARDS.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setStep(i)}
              aria-label={t.primer.step.replace("{n}", String(i + 1))}
              aria-current={i === step ? "true" : undefined}
              className="flex h-[40px] flex-1 items-center hover:opacity-80"
            >
              <span
                className="block h-[3px] w-full rounded-pill transition-all duration-300"
                // DS-13 — UI chrome composes from tokens (the SVG brand art keeps
                // its literals; chrome must not).
                style={{
                  background:
                    i < step
                      ? "var(--gold-400)"
                      : i === step
                        ? "var(--gold-300)"
                        : "var(--royal-700)",
                  boxShadow: i === step ? "0 0 8px color-mix(in oklab, var(--gold-400) 40%, transparent)" : "none",
                }}
              />
            </button>
          ))}
          <button
            type="button"
            onClick={dismiss}
            aria-label={t.primer.skipPrimer}
            className="ml-2 inline-flex h-[40px] w-[40px] items-center justify-center rounded-md text-text-subtle hover:bg-bg-overlay hover:text-text transition-colors"
          >
            <I.x s={14} />
          </button>
        </div>

        <div className="px-5 pt-4 pb-6 sm:px-6">
          {/* Visual — full-width, kit-faithful */}
          <div
            className="flex items-center justify-center rounded-xl border border-border/60 bg-bg-overlay/40 px-4 py-5"
            style={{ minHeight: 120 }}
          >
            {c.visual()}
          </div>

          {/* Eyebrow */}
          <p className="mt-4 font-mono text-micro uppercase eyebrow font-bold text-gold-300">
            {c.eyebrow}
          </p>

          {/* Title */}
          <h2 className="mt-1.5 font-display text-[22px] sm:text-[24px] font-bold text-text leading-tight tracking-[-0.02em]">
            {c.title}
          </h2>

          {/* Body */}
          <p className="mt-2.5 text-[13.5px] text-text-muted leading-relaxed">
            {c.body}
          </p>

          {/* Navigation */}
          <div className="mt-6 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={back}
              disabled={step === 0}
              className="btn btn-ghost btn-md btn-pill disabled:opacity-0 disabled:pointer-events-none"
              style={{ minWidth: 88 }}
            >
              {t.common.back}
            </button>
            <div className="flex items-center gap-1.5">
              {CARDS.map((_, i) => (
                <span
                  key={i}
                  className="inline-block h-[5px] w-[5px] rounded-full transition-all duration-300"
                  style={{
                    background: i === step ? "var(--gold-300)" : "var(--royal-700)", /* DS-13 */
                    transform: i === step ? "scale(1.4)" : "scale(1)",
                  }}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={next}
              className="btn btn-primary btn-md btn-pill inline-flex items-center gap-1.5"
              style={{ minWidth: 88 }}
            >
              {step === CARDS.length - 1
                ? t.common.gotIt
                : t.common.next}
              {step < CARDS.length - 1 && <I.chevronRight s={14} />}
            </button>
          </div>
        </div>
    </Modal>
  );
}
