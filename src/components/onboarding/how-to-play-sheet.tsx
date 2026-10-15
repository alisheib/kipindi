"use client";

/**
 * HOW TO PLAY — THE STATIC SHEET THE HOME'S HOW-TO CARD OPENS (the Vodacom plan S7: VODACOM-PLAN §3.8's S7 part;
 * `S7-PLAN.md` WP6 step 4, amendments A6, A15 and A24, Open points 18, 20 and 21; the S4 frames `pick-5-how-to-play`,
 * `s4-7-howto-320`, `s4-7-howto-desktop`, `s4-7-howto-en` and `s4-7-howto-zh`).
 *
 * In §3.8's order: the title; the three steps (choose a question · tap YES or NO · place your bet and wait); MFANO, the
 * worked example, with the estimate's footnote; "Nimeelewa, anza", which closes the sheet; and "Weka mipaka" alone.
 * It opens on a tap and on nothing else — no auto-open and no seen key (Open point 18: both are S11's, with
 * `primer-keys.ts`) — so it writes nothing to storage, and Privacy §7 is unchanged.
 *
 * ⭐ THE KIT'S SHEET (Open point 20): `<Modal sheet sheetUntil="lg" maxWidth={440}>`, the Wallet's and the guest Tiketi
 * sheet's shell — a bottom sheet below 1024 with the grab handle (no drag: `dragToDismiss` is not built), a centred
 * dialog 440 wide from 1024, on the default dialog rung (100), portalled to the body, every key on the dialog stack. The
 * ✕ is the kit's own 48px `CloseX` in `common.close`; the canvas's 44px royal ✕ is canvas drift (§0h point 7).
 * ⭐ THE TITLE IS 24px, as its canvas draws it (A15): the guest sheet's `.kp-jsheet__title` (20px) with the `--lg`
 * modifier, which re-derives the base rule's top margin for its own size, so its first line's capitals still stand on
 * the ✕ (globals.css says how).
 * ⭐ THE CAP IS CSS (Open point 20): `.kp-howto`'s max-height holds the panel to the viewport less 48px
 * (`calc(100dvh - var(--sp-12))` in globals.css — the same fixed gutter as the first-visit primer's panel), never a
 * height measured here. The Modal's wrapper is `items-end`, so content above a docked panel taller than the screen could
 * never be scrolled back to. When the cap bites only the steps and MFANO scroll — under a fade at each edge that hides
 * something (`data-edges`, the scrolling strip's convention, read by the kit's `useBlockScrollEdges`: the one thing this
 * sheet reads from the layout) — while the
 * title, the CTA and Weka mipaka never scroll, so every way out is always on screen (A6 item 5; WP11 measures it at
 * 320×640, 360×640, 390×844 and 1280).
 * ⭐ EVERY FIGURE IS THE ENGINE'S (Open point 21; SJ-21): the stake, the multiple and the payout come from
 * `HOW_TO_EXAMPLE` through `estimateFor` — TZS 1,000 → ≈2.7× → TZS 2,700 — and `{pct}` is that example's own
 * loser-share, `loserSharePct(HOW_TO_EXAMPLE.rates)`, 13: never typed here, never the live default rates.
 * `test:journey-estimate` a.how-to pins what the engine gives for the example, and `test:journey-home` §5 renders this
 * sheet and finds those figures in it.
 * ⭐ THE SIDES ARE `sideWord`'s: the dictionary writes `{yes}`, `{no}` and `{side}`, and the product's own words fill them
 * (NDIO / HAPANA, YES / NO, 是 / 否), as everywhere a side is named.
 * ⭐ MFANO IS THE KIT'S INFO CALLOUT (Open point 20), its label an `.eyebrow` (§T3) in the one section ink, `--text-subtle`
 * — Ali's ruling (3) of 2026-10-10 (every small heading inside a page in the page heads' ink; `test:visual-pass-r8b` §1),
 * which the canvas's info-blue label predates.
 * ⭐ ITS SENTENCES HOLD THEIR PHRASES as a notice body does (`noticeBody`, round 10's R10-B): a YES/NO pair, a possessive
 * and its noun ("dau lako", "your bet"), a dash with its unit and the last two words break together. The example's two
 * sums are `.amount` (§M4: mono, tabular, whole) and its multiple one mono unit with the ≈ and × the dictionary wraps it
 * in — kept whole, never split at a line's end.
 * ⛔ NO HELPLINE (the owner's ruling of 2026-10-06, COMPLIANCE-DECISIONS; S7-PLAN A6): the canvas's "Msaada 0800 11 0011"
 * is not built, and nothing stands in its place. `test:support-contact` §15 and `test:journey-home` §5 hold it.
 * ⚠️ Every way out closes the sheet: the CTA, the ✕, the scrim, Escape — and Weka mipaka as it navigates.
 */
import { useId, useRef, type ReactNode } from "react";
import Link from "next/link";
import { Modal } from "@/components/ui/modal";
import { useBlockScrollEdges } from "@/components/ui/scroll-edges";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { keepRanges, keptRanges, mergeRanges } from "@/components/ui/keep-run";
import { emptyStateRanges, noticeBody } from "@/components/ui/empty-state-text";
import { useT } from "@/lib/i18n";
import { fill, formatTzs } from "@/lib/utils";
import { sideWord } from "@/lib/side-label";
import { estimateFor, HOW_TO_EXAMPLE } from "@/lib/markets/estimate";
import { loserSharePct } from "@/lib/payout";

/** The three steps, in §3.8's order: WP4's `journey.*` words. */
const STEPS = [
  { title: "howStep1Title", body: "howStep1Body" },
  { title: "howStep2Title", body: "howStep2Body" },
  { title: "howStep3Title", body: "howStep3Body" },
] as const;

/** The card's `{steps}`: this sheet's own step count, never a typed 3. */
export const HOW_TO_STEPS = STEPS.length;
/** The card's `{minutes}`: the deck's "dakika 1" — the time the sheet takes to read. */
export const HOW_TO_MINUTES = 1;

/**
 * SJ-21's example, read through the estimate engine: the stake, the multiple and the payout as the sheet prints them, or
 * null if the engine ever stopped pricing the fixed example — then step 2 keeps its title alone and MFANO is left out,
 * rather than printing a figure the engine did not give (two suites fail on that before any player could see it).
 */
const EXAMPLE = estimateFor({ ...HOW_TO_EXAMPLE, bettable: true });
const FIGURES = EXAMPLE !== null && EXAMPLE.multText !== null && EXAMPLE.payout !== null
  ? { stake: formatTzs(HOW_TO_EXAMPLE.stake), mult: EXAMPLE.multText, payout: formatTzs(EXAMPLE.payout) }
  : null;
/** `{pct}`: the example's own loser-share (Open point 21) — 13, the deck's — never the live default. */
const PCT = loserSharePct(HOW_TO_EXAMPLE.rates);

/** Weka mipaka's door (A6): the limits page itself for a signed-in reader, the public rules page for a guest. */
const LIMITS = { signedIn: "/profile/responsible-gambling", signedOut: "/legal/responsible-gambling" } as const;

/** The multiple as the dictionary wraps it — "≈{mult}×" — so the unit kept whole is the sentence's own characters. */
const MULT_UNIT = /≈?[{]mult[}]×?/;
function multUnit(template: string, mult: string): string {
  return fill(MULT_UNIT.exec(template)?.[0] ?? "{mult}", { mult });
}

/** A figure in a sentence and the class it is drawn in: a sum `.amount`, the multiple `.kp-howto__mult`. */
type Figure = { text: string; className: string };

/** A part of a sentence with its figures in their own spans (§M4), the words around them untouched. */
function dressed(part: string, figures: readonly Figure[]): ReactNode {
  const out: ReactNode[] = [];
  let from = 0;
  for (;;) {
    let next: { at: number; figure: Figure } | null = null;
    for (const figure of figures) {
      const at = figure.text ? part.indexOf(figure.text, from) : -1;
      if (at >= 0 && (next === null || at < next.at)) next = { at, figure };
    }
    if (next === null) break;
    if (next.at > from) out.push(part.slice(from, next.at));
    out.push(<span key={next.at} className={next.figure.className}>{next.figure.text}</span>);
    from = next.at + next.figure.text.length;
  }
  if (out.length === 0) return part;
  if (from < part.length) out.push(part.slice(from));
  return out;
}

/**
 * A sentence held as a notice body is — `noticeBody`'s own ranges (empty-state-text.ts: each YES/NO pair, each possessive
 * phrase, each dash with its unit and the last two words kept) — with its figures kept whole too and drawn in their own
 * spans. `noticeBody` draws its parts as plain text, so a sentence that carries a figure is drawn here; one that carries
 * none comes out exactly as `noticeBody` draws it.
 */
function sentence(text: string, figures: readonly Figure[]): ReactNode {
  const runs = figures.map((f) => f.text);
  return keepRanges(text, mergeRanges([...emptyStateRanges(text, runs), ...keptRanges(text, runs)]), (part) => dressed(part, figures));
}

/**
 * The steps and MFANO: the one part of the sheet that scrolls, and only when the panel's cap bites. It says which of its
 * edges hide something — "start", "end", "both" or "none", the scrolling strip's `data-edges` (`strip-autoscroll.tsx`),
 * read on its block axis — and the stylesheet fades exactly those edges, so a region that fits draws no fade. Marked by the
 * kit's `useBlockScrollEdges` (`scroll-edges.ts` — the one rule the bet sheet's middle reads too, 1px of slack each way):
 * before its first paint, on every scroll, and on any change of size, its own or its content's (the fonts landing, a
 * language change).
 * ⭐ A keyboard reaches it (`tabIndex={0}`, named by `journey.howStepsAria`), so it scrolls without a pointer.
 */
function StepsRegion({ label, children }: { label: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useBlockScrollEdges(ref);
  return (
    <div ref={ref} role="region" tabIndex={0} aria-label={label} className="kp-howto__scroll">
      {children}
    </div>
  );
}

/** `signedIn` is read on the server and handed down by the card: it decides where Weka mipaka goes. */
export function HowToPlaySheet({ open, onClose, signedIn }: { open: boolean; onClose: () => void; signedIn: boolean }) {
  const { t } = useT();
  const titleId = useId();
  const sides = { yes: sideWord(t, "YES", "MARKET"), no: sideWord(t, "NO", "MARKET") };
  const mult = FIGURES?.mult ?? "";

  return (
    <Modal
      open={open}
      onClose={onClose}
      labelledBy={titleId}
      sheet
      sheetUntil="lg"
      maxWidth={440}
      panelClassName="kp-wsheet kp-howto"
    >
      <div className="kp-howto__sheet" data-testid="journey-howto-sheet">
        <div aria-hidden className="kp-wsheet__grab" />
        <h2 id={titleId} className="kp-jsheet__title kp-jsheet__title--lg">{t.journey.howToTitle}</h2>
        <StepsRegion label={t.journey.howStepsAria}>
          {/* `role="list"`: WebKit drops the list role from a list styled `list-style: none` (VoiceOver on iPhone), and
              the numbers a reader hears are the list's — the badges are drawn for the eye alone. */}
          <ol role="list" className="kp-howto__steps">
            {STEPS.map((step, i) => {
              const body = t.journey[step.body];
              // Only a body that writes `{mult}` carries the multiple (step 2): steps 1 and 3 hold none, so they are handed
              // no figure to look for — words that happened to spell the multiple there would not be dressed as one.
              const holdsMult = body.includes("{mult}");
              const priced = !holdsMult || FIGURES !== null;
              return (
                <li key={step.title} className="kp-howto__step">
                  <span aria-hidden className="kp-howto__num font-mono font-bold text-body-lg">{i + 1}</span>
                  <div className="kp-howto__text">
                    <p className="kp-howto__step-title font-display font-semibold text-body-lg">{noticeBody(fill(t.journey[step.title], sides))}</p>
                    {priced && (
                      <p className="kp-howto__step-body text-body">
                        {sentence(fill(body, { ...sides, mult }), holdsMult ? [{ text: multUnit(body, mult), className: "kp-howto__mult" }] : [])}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
          {FIGURES !== null && PCT !== null && (
            <Callout tone="info" className="kp-howto__ex">
              <p className="kp-howto__ex-label eyebrow font-mono text-caption font-semibold uppercase text-text-subtle">{t.journey.howExampleLabel}</p>
              <p className="kp-howto__ex-body text-body">
                {sentence(
                  fill(t.journey.howExampleBody, { stake: FIGURES.stake, side: sideWord(t, HOW_TO_EXAMPLE.side, "MARKET"), mult: FIGURES.mult, payout: FIGURES.payout }),
                  [
                    { text: FIGURES.stake, className: "amount" },
                    { text: multUnit(t.journey.howExampleBody, FIGURES.mult), className: "kp-howto__mult" },
                    { text: FIGURES.payout, className: "amount" },
                  ],
                )}
              </p>
              <p className="kp-howto__note text-body-sm">{noticeBody(fill(t.journey.estimateNote, { pct: PCT }))}</p>
            </Callout>
          )}
        </StepsRegion>
        <Button type="button" variant="primary" size="lg" className="kp-wsheet__act" onClick={onClose}>
          {t.journey.howCta}
        </Button>
        <div className="kp-howto__foot">
          <Link href={signedIn ? LIMITS.signedIn : LIMITS.signedOut} onClick={onClose} className="kp-wsheet__link">
            {t.rg.setLimits}
          </Link>
        </div>
      </div>
    </Modal>
  );
}
