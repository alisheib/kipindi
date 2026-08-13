"use client";

/**
 * `<Reveal>` — a section that rises once, on first intersection (kit COMPONENTS §18 / MOTION §1:
 * `threshold 0.12`, `rootMargin 0 0 -8% 0`, unobserved after firing).
 *
 * ⭐ WHY THIS IS A CLIENT COMPONENT RATHER THAN A SCRIPT THAT SETS AN ATTRIBUTE, AND IT IS THE
 * SECOND ATTEMPT. The first version was one effect in the shell that found `[data-reveal]` nodes
 * and set `data-revealed` on them itself. **That produced a real hydration mismatch on 9 of 12
 * width×locale frames** — "a tree hydrated but some attributes of the server rendered HTML didn't
 * match the client properties", naming `data-revealed` as the extra attribute — because the page's
 * bands stream in, so a mutation from an already-mounted shell effect lands on nodes React has not
 * finished hydrating. Removing the redundant `requestAnimationFrame` pass narrowed it and did not
 * fix it: the observer's own first callback was still early enough.
 *
 * ⛔ SO NOTHING MUTATES AN ATTRIBUTE REACT OWNS. React renders `data-revealed` from state, which
 * makes the mismatch unrepresentable rather than merely unlikely — the same reason the header's
 * scroll cast moved to a `<html>` data attribute instead of a class on the header element.
 *
 * The children are SERVER-rendered and pass straight through, so this costs no server work and no
 * extra request: it is a wrapper that owns one boolean.
 *
 * ⭐ PROGRESSIVE. The hidden state is `.js [data-reveal]:not([data-revealed])` in `globals.css`,
 * and `.js` is added by this component on mount — so a load where the bundle never arrives has no
 * `.js`, the hiding rule never matches, and every section renders visible. A reveal that hides
 * content by default and needs JavaScript to show it is a blank page on a failed bundle, and what
 * is below the fold here is the market board of a money product.
 *
 * ⚠️ Under any of the THREE motion gates it reveals immediately and never attaches an observer —
 * the OS query, the in-app `[data-motion="minimal"]` switch, and the low-end `[data-motion=
 * "reduced"]` tier, because our target device sets neither of the first two.
 */
import { useEffect, useRef, useState } from "react";

export function Reveal({
  as: Tag = "section",
  band,
  className,
  children,
  ...rest
}: {
  as?: "section" | "div";
  /** `data-band`, which `qa:landing-shots` clips and measures per band. */
  band: string;
  className?: string;
  children: React.ReactNode;
} & React.HTMLAttributes<HTMLElement>) {
  const ref = useRef<HTMLElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    // The class the hidden state is scoped to — set here so no-JS renders everything.
    document.documentElement.classList.add("js");

    const el = ref.current;
    if (!el) return;

    const motion = document.documentElement.getAttribute("data-motion");
    const calm =
      motion === "minimal" ||
      motion === "reduced" ||
      (typeof window.matchMedia === "function" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches);

    if (calm || typeof IntersectionObserver === "undefined") {
      setShown(true);
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShown(true);
          io.disconnect();     // once, then never again
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag
      ref={ref as never}
      className={className}
      data-band={band}
      data-reveal=""
      {...(shown ? { "data-revealed": "" } : {})}
      {...rest}
    >
      {children}
    </Tag>
  );
}
