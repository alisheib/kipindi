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

const NEED_LABEL: Record<string, string> = {
  compliance: "an Admin or Compliance officer",
  trading: "an Admin or Trading officer",
  accounting: "an Admin or Finance officer",
  growth: "an Admin or Growth officer",
  support: "an Admin or Support officer",
  ops: "the Owner",
  overview: "an Admin",
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
  const who = NEED_LABEL[need] ?? "an Admin";
  return (
    <div
      title={`${what} — this is a ${need} decision. Ask ${who}.`}
      className={`inline-flex items-center gap-1.5 rounded-md border border-border bg-bg-inset px-2.5 font-mono text-[10.5px] uppercase tracking-[0.10em] text-text-subtle ${
        block ? "min-h-[40px] w-full justify-center" : "h-8"
      }`}
    >
      <I.lock s={12} aria-hidden />
      <span>{what}</span>
      <span className="text-border" aria-hidden>·</span>
      <span className="text-text-tertiary">{need} only</span>
    </div>
  );
}
