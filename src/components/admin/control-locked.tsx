/**
 * ControlLocked — the read-only stand-in for an admin control the current role may
 * SEE but not USE.
 *
 * The sibling of `AdminRestricted` one layer down: that one replaces a whole PAGE a
 * role cannot view; this one replaces a single CONTROL on a page they legitimately
 * can. Findings E-18/E-19 — see `lib/server/control-gates.ts` for why an offered-but-
 * refusing control is worse than an absent one (it writes a SECURITY
 * `privilege_escalation_blocked` row for an ordinary, legitimate click).
 *
 * It states the control's name and WHO can work it, so the operator knows who to ask
 * rather than believing the console is broken. Follows the `admin/objections`
 * precedent ("Compliance only"), promoted to a shared component so the next surface
 * does not re-invent it.
 */
import { I } from "@/components/ui/glyphs";

/**
 * ⭐ WHO WORKS A CONTROL, IN THE ROLES' OWN NAMES (MASWALI-BUILD S6-ADMIN, the lead's ruling G8; DESIGN_AUTHORITY §M8a item 29):
 * the chip names the domain by the officers whose role acts on it (`DEFAULT_GRANTS`), and its tooltip whom to ask —
 * as `ROLE_LABEL` names every role (ADMIN is "the Owner", never "an Admin"), never the domain's code ("accounting").
 * ⛔ Literal on purpose: client controls import this chip, so it reads no server module; `test:maswali-admin-plain`
 * holds every word to `ROLE_LABEL`. A platform component: the classic console reads the same words.
 */
export const CONTROL_WHO: Record<string, { only: string; ask: string }> = {
  compliance: { only: "Compliance officers only", ask: "the Owner or a Compliance officer" },
  trading: { only: "Trading officers only", ask: "the Owner or a Trading officer" },
  accounting: { only: "Finance officers only", ask: "the Owner or a Finance officer" },
  growth: { only: "Growth officers only", ask: "the Owner or a Growth officer" },
  support: { only: "Support officers only", ask: "the Owner or a Support officer" },
  ops: { only: "The Owner only", ask: "the Owner" },
  overview: { only: "The Owner only", ask: "the Owner" },
};

export function ControlLocked({
  what,
  need,
  block = false,
}: {
  /** The control's own label, e.g. "Re-check this market now". */
  what: string;
  /** The domain the control's action requires — `CONTROL_DOMAIN[id]`. */
  need: string;
  /** Full-width block (in a card body) vs an inline chip (in a header). */
  block?: boolean;
}) {
  const who = CONTROL_WHO[need] ?? CONTROL_WHO.overview;
  return (
    <div
      title={`${what} — ${who.only}. Ask ${who.ask}.`}
      className={`inline-flex items-center gap-1.5 rounded-md border border-border bg-bg-inset px-2.5 font-mono text-micro uppercase tracking-[0.10em] text-text-subtle ${
        // ⛔ BOTH BRANCHES ARE LITERALS ON PURPOSE — the spacing scale is overridden
        // (tailwind.config.ts:200-215), so the inline branch's old `h-8` was 48px: one
        // component with two heights for the same lock chip, and 8px taller than the
        // 40px admin header chips it sits among. 40px = --tap-min.
        block ? "min-h-[40px] w-full justify-center" : "h-[40px]"
      }`}
    >
      <I.lock s={12} aria-hidden />
      <span>{what}</span>
      <span className="text-border" aria-hidden>·</span>
      <span className="text-text-tertiary">{who.only}</span>
    </div>
  );
}
