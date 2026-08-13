/**
 * §1b — HOW IT WORKS. The band with the most important job on the page.
 *
 * ⭐ WHY THE HEADING AND LEDE READ `t.primer.*`. The best copy on the site was trapped in a
 * first-visit modal that anyone who reflexively closes modals never reads (kit finding A1). This
 * band lifts the modal's heading and lede — and reads THE SAME KEYS, so there is one definition
 * and two render sites rather than two copies that drift (kit Open Q7, resolved in ACCEPTANCE §7).
 * ⚠️ Wiring this up is what exposed the dict's `primer` group as stale: `card3Body` described the
 * retired fee model and its Swahili line described a fee-free split. The dict was corrected before
 * either surface read it — see the note above `primer:` in `i18n-dict.ts`.
 *
 * Every value comes from a token through a class in `globals.css` (`.kp-band`, `.kp-steps`).
 */
import { Reveal } from "@/components/layout/reveal";
import type { Dict } from "@/lib/i18n-dict";

export function HowItWorks({ t }: { t: Dict }) {
  const steps = [
    { n: "01", h: t.home.howStep1H, b: t.home.howStep1B },
    { n: "02", h: t.home.howStep2H, b: t.home.howStep2B },
    { n: "03", h: t.home.howStep3H, b: t.home.howStep3B },
  ];
  return (
    <Reveal band="how" className="kp-band kp-band--overlay kp-band--tight">
      <div className="kp-band__inner">
        <p className="kp-hero__eyebrow">
          <span className="kp-hero__tick" aria-hidden />
          {t.home.howEyebrow}
        </p>
        {/* The modal's own heading and lede, from the modal's own keys. */}
        <h2 className="kp-shead__h">{t.primer.card1Title}</h2>
        <p className="kp-lede">{t.primer.card1Body}</p>

        <div className="kp-steps">
          {steps.map((s) => (
            <div key={s.n} className="kp-step">
              {/* The numeral sits ON the rule and knocks it out with the band's own surface. */}
              <span className="kp-step__n">{s.n}</span>
              <h3 className="kp-step__h">{s.h}</h3>
              <p className="kp-step__b">{s.b}</p>
            </div>
          ))}
        </div>
      </div>
    </Reveal>
  );
}
