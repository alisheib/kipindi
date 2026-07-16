/**
 * A8 — the shared two-officer (maker-checker) notice.
 *
 * One structure for every compliance surface that needs a second officer: the
 * KYC high-risk approval rail, the regulator report-pack controls, and the
 * resolution ceremony. Each had hand-rolled its own callout, and they had
 * already drifted — the same "second officer required" note used claret on the
 * report pack and the resolver but amber on KYC, with icon sizes (15 vs 16),
 * paddings (py-2.5 vs py-3) and letter-tracking (0.14em vs 0.16em) all diverging.
 * This component is the single source so the drift cannot recur.
 *
 * Two tones, matching the two states the surfaces actually express:
 *  - `tone="info"`   — states the rule ("a second officer is needed"); amber,
 *                      users glyph. The neutral, not-yet-satisfied state.
 *  - `tone="blocked"`— tells the officer who performed the first step that they
 *                      cannot also seal it; claret, alert glyph.
 *
 * Presentational only — no state, no client hooks — so it renders inside both
 * server and "use client" surfaces. The title is an `AdminLabel`, rendered
 * bilingually (English · Kiswahili) via `bi()` to match the admin console.
 */
import type { ReactNode } from "react";
import { I } from "@/components/ui/glyphs";
import { bi, type AdminLabel } from "@/lib/admin-status-lexicon";

type AttestationTone = "info" | "blocked";

export function AttestationRail({
  title,
  tone = "info",
  children,
}: {
  title: AdminLabel;
  tone?: AttestationTone;
  children: ReactNode;
}) {
  const blocked = tone === "blocked";
  const Icon = blocked ? I.alertCircle : I.users;
  return (
    <div
      className={
        blocked
          ? "flex items-start gap-2.5 rounded-md border border-claret-edge bg-claret-soft px-3 py-2.5"
          : "flex items-start gap-2.5 rounded-md border border-warning-fg/40 bg-warning/10 px-3 py-2.5"
      }
    >
      <Icon s={15} className={`mt-0.5 shrink-0 ${blocked ? "text-claret-300" : "text-warning-fg"}`} />
      <div className="text-[12px] text-text-muted">
        <p
          className={`font-mono text-[10px] uppercase tracking-[0.14em] font-bold ${
            blocked ? "text-claret-300" : "text-warning-fg"
          }`}
        >
          {bi(title)}
        </p>
        <div className="mt-0.5">{children}</div>
      </div>
    </div>
  );
}
