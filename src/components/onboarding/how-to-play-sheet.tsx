"use client";

/**
 * HOW TO PLAY — THE STATIC SHEET THE HOME'S HOW-TO CARD OPENS (the Vodacom plan S7: VODACOM-PLAN §3.8's S7 part;
 * `S7-PLAN.md` WP6 step 4, amendments A6, A15 and A24, Open points 18, 20 and 21; the S4 frames `pick-5-how-to-play`,
 * `s4-7-howto-320`, `s4-7-howto-desktop`, `s4-7-howto-en` and `s4-7-howto-zh`).
 *
 * In §3.8's order: the title; the three steps (choose a question · tap YES or NO · place your bet and wait); MFANO, the
 * worked example, with the estimate's footnote; "Nimeelewa, anza", which closes the sheet; and "Weka mipaka" alone.
 * ⭐ S11 WP4 (2026-10-14; VODACOM-PLAN §3.8, S11-PLAN Open points 5 and 7) · two instances open it: the How-to card's tap on
 * the home, and the How-to host the shell mounts for a journey reader (`how-to-host.tsx`: by itself once per browser on
 * `/`, `/live`, `/results` and `/watchlist`, and at `/?howto=1`). The two never open together — each sees the other as an
 * open dialog. Whichever opened it, EVERY WAY OUT goes through the one `close` below, which writes the seen key
 * (`HOWTO_SEEN_KEY`, "50pick-howto-seen", through `markSeen`) and then hands back to the opener: the ✕, the scrim and
 * Escape (the Modal's `onClose`), "Nimeelewa, anza" and Weka mipaka, which closes and then navigates. Nothing is written on
 * open. Privacy §7 names the key, in the same release (§3.10). While open it holds the bottom invitation slot below the
 * analytics consent prompt's priority (−1 under 0), so the consent card waits until it closes and appears then
 * (`invitation-slot.ts`: lower wins; consent's code is untouched).
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
 * in — kept whole, never split at a line's end. The note's commission is one `.amount` unit too, its % with it (§T5: a
 * numeral inside a sentence is mono — the audit's F36, 2026-10-14, found "13%" in the body face beside the box's mono
 * figures; S11).
 * ⭐ ONE MARKER COLUMN, ONE TEXT EDGE (S11; the audit's F36): MFANO's (i) is centred on the step badges' centre line and its
 * words start on the steps' text edge. The kit Callout's own row put them 6px right and 9px left; globals.css re-spaces
 * that row from the badge's two numbers (`--howto-badge`, `--howto-badge-gap`), so the two columns cannot part again.
 * ⛔ NO HELPLINE (the owner's ruling of 2026-10-06, COMPLIANCE-DECISIONS; S7-PLAN A6): the canvas's "Msaada 0800 11 0011"
 * is not built, and nothing stands in its place. `test:support-contact` §15 and `test:journey-home` §5 hold it.
 * ⚠️ Every way out closes the sheet through `close`: the CTA, the ✕, the scrim, Escape — and Weka mipaka as it navigates.
 */
import { useCallback, useId, useRef, type ReactNode } from "react";
import Link from "next/link";
import { Modal } from "@/components/ui/modal";
import { useBlockScrollEdges } from "@/components/ui/scroll-edges";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { noticeBody, type KeptBody } from "@/components/ui/empty-state-text";
import { useT } from "@/lib/i18n";
import { fill, formatTzs } from "@/lib/utils";
import { sideWord } from "@/lib/side-label";
import { estimateFor, HOW_TO_EXAMPLE } from "@/lib/markets/estimate";
import { loserSharePct } from "@/lib/payout";
import { useInvitationSlot } from "@/lib/invitation-slot";
import { HOWTO_SEEN_KEY, markSeen } from "@/lib/onboarding/primer-keys";

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

/** The commission as the dictionary writes it — "{pct}%" — so the note's figure is one mono unit, its sign with it. */
const PCT_UNIT = /[{]pct[}]%?/;
function pctUnit(template: string, pct: number): string {
  return fill(PCT_UNIT.exec(template)?.[0] ?? "{pct}", { pct });
}

/** A figure in a sentence and the class it is drawn in: a sum or the commission `.amount`, the multiple `.kp-howto__mult`. */
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
 * A sentence with figures, held as a notice body is: `noticeBody` itself (empty-state-text.ts: each YES/NO pair, each
 * possessive phrase, each dash with its unit, the last two words — and each figure, a run the caller names, whole), its
 * parts drawn by `dressed` so each figure is its own span. `held` is the body, `drawn` the way its parts are drawn: the
 * two halves of one `noticeBody` call, so every sentence of the sheet goes through the kit's one keep (S11; the audit's
 * F36 — `test:visual-pass-r10` 9.3 reads a Callout's body for it). A sentence with no figure draws as `noticeBody` alone.
 */
const held = (text: string, figures: readonly Figure[]): KeptBody => ({ text, keep: figures.map((f) => f.text) });
const drawn = (figures: readonly Figure[]) => ({ part: (part: string) => dressed(part, figures) });

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

/**
 * The sheet's slot claim in the bottom invitation zone: below the analytics consent prompt's 0, so while the sheet is open
 * the consent card waits, and it appears the moment the sheet closes (S11-PLAN Open point 7). Claimed only while open.
 */
const HOWTO_SLOT_PRIORITY = -1;

/** `signedIn` is read on the server and handed down by the opener (the card, or the host): it decides where Weka mipaka goes. */
export function HowToPlaySheet({ open, onClose, signedIn }: { open: boolean; onClose: () => void; signedIn: boolean }) {
  const { t } = useT();
  const titleId = useId();
  const sides = { yes: sideWord(t, "YES", "MARKET"), no: sideWord(t, "NO", "MARKET") };
  const mult = FIGURES?.mult ?? "";
  // MFANO's two sentences' figures: the example's two sums and its multiple, and the note's commission.
  const exampleFigures: readonly Figure[] = FIGURES === null ? [] : [
    { text: FIGURES.stake, className: "amount" },
    { text: multUnit(t.journey.howExampleBody, FIGURES.mult), className: "kp-howto__mult" },
    { text: FIGURES.payout, className: "amount" },
  ];
  const noteFigures: readonly Figure[] = PCT === null ? [] : [{ text: pctUnit(t.journey.estimateNote, PCT), className: "amount" }];
  useInvitationSlot("howto", "bottom", HOWTO_SLOT_PRIORITY, open);
  // ⭐ THE ONE WAY OUT (S11 WP4): the seen key first, then the opener's own close. Every exit below calls this, never
  // `onClose` itself — so however the sheet was opened and however it is left, the browser remembers it was seen.
  const close = useCallback(() => {
    markSeen(HOWTO_SEEN_KEY);
    onClose();
  }, [onClose]);

  return (
    <Modal
      open={open}
      onClose={close}
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
              const figures: readonly Figure[] = holdsMult ? [{ text: multUnit(body, mult), className: "kp-howto__mult" }] : [];
              return (
                <li key={step.title} className="kp-howto__step">
                  <span aria-hidden className="kp-howto__num font-mono font-bold text-body-lg">{i + 1}</span>
                  <div className="kp-howto__text">
                    <p className="kp-howto__step-title font-display font-semibold text-body-lg">{noticeBody(fill(t.journey[step.title], sides))}</p>
                    {priced && (
                      <p className="kp-howto__step-body text-body">
                        {noticeBody(held(fill(body, { ...sides, mult }), figures), drawn(figures))}
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
                {noticeBody(
                  held(fill(t.journey.howExampleBody, { stake: FIGURES.stake, side: sideWord(t, HOW_TO_EXAMPLE.side, "MARKET"), mult: FIGURES.mult, payout: FIGURES.payout }), exampleFigures),
                  drawn(exampleFigures),
                )}
              </p>
              <p className="kp-howto__note text-body-sm">{noticeBody(held(fill(t.journey.estimateNote, { pct: PCT }), noteFigures), drawn(noteFigures))}</p>
            </Callout>
          )}
        </StepsRegion>
        <Button type="button" variant="primary" size="lg" className="kp-wsheet__act" onClick={close}>
          {t.journey.howCta}
        </Button>
        <div className="kp-howto__foot">
          <Link href={signedIn ? LIMITS.signedIn : LIMITS.signedOut} onClick={close} className="kp-wsheet__link">
            {t.rg.setLimits}
          </Link>
        </div>
      </div>
    </Modal>
  );
}
