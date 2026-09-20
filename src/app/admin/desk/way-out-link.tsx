import Link from "next/link";
import type { Route } from "next";

/**
 * THE SECTION'S ONE WAY BACK — a component, not a shared class string.
 *
 * ⛔ WHY IT IS NOT A CONSTANT IN `console-routes.ts`, which is where the C7 step 7 review put it and where
 * `test:house-bot-rules` 0.console-routes.ts caught it. That guard forbids a class-shaped token in any comment or
 * string in that module, and the reason is a measured incident, not tidiness: Tailwind scans EVERY file, so a
 * class-shaped string anywhere becomes CSS — and an invalid one once 500'd every route on this platform. A routes
 * module is not a place CSS may be authored, however valid today's string happens to be.
 *
 * ⭐ THE REVIEW'S REASONING WAS RIGHT AND ONLY ITS HOME WAS WRONG. Its note: three pages each had a hover-only way
 * back — "no underline, no brand ink, nothing at rest — which on a phone is no affordance at all: at 360 a card's
 * way back read as one more left-aligned sentence"; the wizard was repaired and the account page, built two steps
 * earlier, kept the old treatment, "and the section shipped two looks for one control". One shared thing is the
 * correct answer. A component is simply the shape that carries a look without teaching a routes module to author CSS.
 *
 * ⭐ AND IT IS STRICTLY BETTER THAN THE STRING. A caller can no longer take the classes and add to them, which is
 * how "one shared look" becomes three again — the component owns the treatment, and the only thing a page chooses
 * is where it goes and what it says.
 */
export function WayOutLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href as Route}
      className="inline-flex items-center min-h-[var(--tap-min)] text-body-sm text-brand-300 underline underline-offset-2 hover:text-brand-200"
    >
      {children}
    </Link>
  );
}
