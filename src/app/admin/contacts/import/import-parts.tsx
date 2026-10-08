"use client";

/**
 * The import dialog's small shared pieces (S15 · C3–C5, 2026-10-09): a sentence with figures in it, the refusal box with
 * its next step, a tile, the actions row. Each is a composition of the kit (`Callout`, `Button`, `Stat`) — nothing here
 * paints a look of its own (§B9/§B10).
 *
 * ⭐ A FIGURE IS ITS OWN `.amount` SPAN (§M4: mono, tabular, one unbreakable unit) and every space stays OUTSIDE it, in
 * the words around it — a space inside a nowrap unit never wraps, and a narrow dialog must be able to break the line.
 * ⭐ THE REFUSAL BOX SAYS THE REASON AND OFFERS THE NEXT STEP AS A CONTROL (§F4): a sentence with no way on is a dead end.
 * ⭐ THE ACTIONS ROW STACKS ON A PHONE WITH THE PRIMARY ON TOP — the primary comes LAST in the markup, so the reversed
 * column puts it first below `sm` and rightmost from `sm` (the contact form's own idiom).
 */
import { Fragment, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Stat } from "@/components/ui/stat";
import { formatNumber } from "@/lib/utils";
import type { Part } from "./import-copy";

/** A sentence with its figures drawn as `.amount` units. */
export function Parts({ parts }: { parts: readonly Part[] }) {
  return (
    <>
      {parts.map((p, i) => (typeof p === "string"
        ? <Fragment key={i}>{p}</Fragment>
        : <span key={i} className="amount">{formatNumber(p.n)}</span>))}
    </>
  );
}

/** One way on from a refusal or a fault: a button, the primary one painted as such. */
export type AlertAction = {
  readonly label: string;
  readonly run: () => void;
  readonly primary?: boolean;
  /** The drive's handle (`data-import-act`), never a class string. */
  readonly act?: string;
};

/** A refusal or a fault, said where it happened: the sentence (the server's, verbatim, or the dialog's own) and the next
 *  steps. ⛔ Never a zero or an empty bar standing in for an answer that did not arrive. */
export type ImportAlertState = {
  readonly tone: "danger" | "warning" | "info";
  readonly text: string;
  readonly actions: readonly AlertAction[];
};

export function ImportAlert({ alert, disabled = false }: { alert: ImportAlertState; disabled?: boolean }) {
  return (
    <div className="space-y-2" data-import-alert={alert.tone}>
      <Callout tone={alert.tone} role="alert">{alert.text}</Callout>
      {alert.actions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {alert.actions.map((a) => (
            <Button
              key={a.label}
              type="button"
              size="sm"
              variant={a.primary === true ? "primary" : "ghost"}
              disabled={disabled}
              onClick={a.run}
              data-import-act={a.act}
            >
              {a.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}

/** A count tile — the kit's `Stat` in its card box; the figure one `.amount` unit. */
export function Tile({ label, value, name }: { label: string; value: number; name: string }) {
  return (
    <div data-import-tile={name} data-value={value}>
      <Stat boxed="card" size="2xl" labelStyle="caps" label={label} value={<span className="amount">{formatNumber(value)}</span>} />
    </div>
  );
}

/** The dialog's buttons: stacked below `sm` with the primary (LAST child) on top, in a row from `sm`. */
export function ActionsRow({ children }: { children: ReactNode }) {
  return <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:flex-wrap sm:justify-end">{children}</div>;
}

/** A section's heading inside the dialog — the same eyebrow the kit's legends wear. */
export function SectionHeading({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <h3 id={id} className="font-mono text-micro uppercase eyebrow font-bold text-text-muted">
      {children}
    </h3>
  );
}
