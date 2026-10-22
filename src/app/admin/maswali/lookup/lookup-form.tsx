"use client";

/**
 * The desk's lookup and its answer (MASWALI-BUILD S6; MASWALI-PLAN §7b S6 item 9, MB-64): one serial and its holder's
 * number in, ONE ticket out, beside the script that fits it — filled with that ticket's own week's figures.
 * ⛔ Nothing is kept: a new lookup replaces the last answer, and leaving the page forgets it. Every lookup is recorded on
 *    the server before it answers (`maswali-support.ts`).
 */
import { useState, useTransition, type FormEvent } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Chip } from "@/components/ui/chip";
import { runAdminAction } from "@/lib/client/run-admin-action";
import { fmtEat, weekStateChip } from "@/lib/maswali-admin-format";
import { SLOT_COUNT } from "@/lib/maswali-score";
import { formatTzs } from "@/lib/utils";
import { MILLIONEA_SUPPORT_SCRIPTS, type SupportFigures } from "@/lib/maswali-support-scripts";
import type { DeskLookup, DeskTicketView } from "@/lib/server/maswali-support";
import { lookupMaswaliTicketAction } from "./actions";
import { ScriptBlock } from "./script-block";

/** The word the ticket's own page shows, as the desk says it. */
const SHOWN: Record<string, string> = { running: "Running", won: "Won", lost: "Lost", refunded: "Refunded", cancelled: "Cancelled" };
/** How each of the fifteen answers fared, in the desk's words (the player's ticket draws the same marks). */
const MARK: Record<string, string> = {
  awaiting: "Awaiting its result", matched: "Right", missed: "Wrong", void: "Voided",
  standby: "Reserve, standing by", carried: "Reserve, counted", unused: "Reserve, not used",
};
const WORD: Record<string, string> = { YES: "Yes", NO: "No", VOID: "Void" };

export function LookupForm() {
  const [serial, setSerial] = useState("");
  const [phone, setPhone] = useState("");
  const [answer, setAnswer] = useState<DeskLookup | null>(null);
  const [pending, start] = useTransition();

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData();
    fd.set("serial", serial);
    fd.set("phone", phone);
    start(async () => {
      const r = await runAdminAction(() => lookupMaswaliTicketAction(fd));
      setAnswer(r);
    });
  };

  return (
    <div className="space-y-4">
      <form onSubmit={onSubmit} className="grid max-w-form gap-3 sm:grid-cols-2">
        <Field label="Ticket serial" hint="As printed on the ticket: MLN-…" required>
          <Input value={serial} onChange={(e) => setSerial(e.target.value)} autoComplete="off" spellCheck={false} mono />
        </Field>
        <Field label="Phone number on the account" hint="The number the player registered with" required>
          <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="off" />
        </Field>
        <div className="sm:col-span-2">
          <Button type="submit" loading={pending} disabled={serial.trim() === "" || phone.trim() === ""}>Look up</Button>
        </div>
      </form>
      <div aria-live="polite">
        {answer && !answer.ok && <p role="alert" className="text-body-sm text-danger-fg">{answer.error}</p>}
        {answer && answer.ok && <TicketAnswer ticket={answer.ticket} figures={answer.figures} />}
      </div>
    </div>
  );
}

function Row({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap gap-x-2">
      <dt className="text-text-tertiary">{k}</dt>
      <dd className="text-text">{children}</dd>
    </div>
  );
}

function TicketAnswer({ ticket: t, figures }: { ticket: DeskTicketView; figures: SupportFigures }) {
  const chip = weekStateChip(t.week.state);
  const script = t.script ? MILLIONEA_SUPPORT_SCRIPTS.find((s) => s.key === t.script) ?? null : null;
  return (
    <div className="space-y-5 border-t border-border-subtle pt-4">
      <dl className="grid gap-x-6 gap-y-1.5 text-body-sm sm:grid-cols-2">
        <Row k="Serial"><span className="font-mono">{t.serial}</span></Row>
        <Row k="Week">
          <span className="inline-flex flex-wrap items-center gap-2">
            <span className="tabular">{t.week.code}{t.week.visibility === "DRIVE" ? " · drive" : ""}</span>
            <Chip variant={chip.variant} size="sm">{chip.label}</Chip>
          </span>
        </Row>
        <Row k="Ticket">{SHOWN[t.shown] ?? t.shown}</Row>
        <Row k="Bought (EAT)"><span className="tabular">{fmtEat(t.boughtAt)}</span></Row>
        {t.cancelledAt && <Row k="Cancelled (EAT)"><span className="tabular">{fmtEat(t.cancelledAt)}</span></Row>}
        {t.cancelUntil && <Row k="Free cancel until (EAT)"><span className="tabular">{fmtEat(t.cancelUntil)}</span></Row>}
        <Row k="Price"><span className="font-mono tabular-nums">{formatTzs(t.price)}</span></Row>
        <Row k="Results out"><span className="tabular">{t.resultsOut} of {SLOT_COUNT}</span></Row>
        {t.share && (
          <Row k="Share">
            {t.share === "paid" ? <>Paid · <span className="font-mono tabular-nums">{formatTzs(t.paid ?? 0)}</span></>
              : t.share === "held" ? "Held for Compliance's review"
              : "Forfeited to the jackpot by Compliance"}
          </Row>
        )}
        {t.refund && (
          <Row k="Refund">
            {t.refund.state === "landed"
              ? <><span className="font-mono tabular-nums">{formatTzs(t.refund.amount)}</span> · landed {fmtEat(t.refund.at)}</>
              : "Pending — the system retries it until it lands"}
          </Row>
        )}
        <Row k="Account">
          <Link href={`/admin/players/${encodeURIComponent(t.accountId)}`} className="break-all font-mono text-royal-300 hover:underline">{t.accountId}</Link>
        </Row>
        <Row k="Rules version"><span className="font-mono">{t.rulesVersion}</span></Row>
      </dl>

      {t.answers ? (
        <table className="admin-tbl">
          <thead><tr><th className="text-left">Question</th><th className="text-left">Answer</th><th className="text-left">Result</th><th className="text-left">How it fared</th></tr></thead>
          <tbody>
            {t.answers.map((a) => (
              <tr key={a.label}>
                <td className="text-left tabular">{a.label}</td>
                <td className="text-left">{WORD[a.pick] ?? a.pick}</td>
                <td className="text-left">{a.outcome ? WORD[a.outcome] ?? a.outcome : "—"}</td>
                <td className="text-left">{MARK[a.mark] ?? a.mark}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="text-body-sm text-text-secondary">The week is not final, so the ticket&apos;s answers are not shown. Answer from the facts above.</p>
      )}

      {script ? <ScriptBlock script={script} figures={figures} />
        : <p className="text-body-sm text-text-secondary">No one script fits this ticket — a running week, a cancelled ticket or a forfeited share. Give the facts above, and pass anything more to Compliance.</p>}
    </div>
  );
}
