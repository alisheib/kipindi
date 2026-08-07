"use client";

/**
 * F1 — declare what players are told about withdrawals.
 *
 * 🔴 The asymmetry shown here is the point. An officer can make the player-facing picture WORSE
 * immediately (they usually know before the queue does — when Selcom's upstream went down on
 * 2026-07-29 the first payout had to age 30 minutes before it counted as stuck, and the withdraw
 * form looked normal throughout). They cannot make it BETTER: `getPayoutStatus()` returns
 * `worstOf(declared, derived)`, so declaring "operational" over a stuck queue changes nothing a
 * player sees.
 *
 * So this panel always shows BOTH numbers — what was declared, and what the queue actually says —
 * and states plainly when reality has overruled the console. An officer who cannot see that they
 * are being overruled will assume the flag is broken and go looking for a bug.
 */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { I } from "@/components/ui/glyphs";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { setPayoutStatusAction } from "./payment-actions";
import { runAdminAction } from "@/lib/client/run-admin-action";

type Status = "operational" | "delayed" | "unavailable";

const OPTIONS: Array<{ id: Status; label: string; hint: string }> = [
  { id: "operational", label: "Operational", hint: "No problem declared" },
  { id: "delayed", label: "Delayed", hint: "Slow, but paying" },
  { id: "unavailable", label: "Unavailable", hint: "Refuses new requests" },
];

export function PayoutStatusControl({
  declared,
  derived,
  effective,
  note,
  stuckCount,
  oldestStuckHours,
  derivedOverrodeDeclared,
}: {
  declared: Status;
  derived: Status;
  effective: Status;
  note: string | null;
  stuckCount: number;
  oldestStuckHours: number | null;
  derivedOverrodeDeclared: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [pick, setPick] = useState<Status>(declared);
  const [text, setText] = useState(note ?? "");
  const router = useRouter();
  const { toast } = useToast();

  const save = () => {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("declared", pick);
      fd.set("note", text);
      const r = await runAdminAction(() => setPayoutStatusAction(fd));
      if (!r.ok) { toast({ title: "Blocked", description: r.error, variant: "danger" }); return; }
      toast({
        title: `Payouts declared ${pick.toUpperCase()}`,
        description: pick === "unavailable" ? "Players are now told withdrawals cannot be paid." : undefined,
        variant: pick === "operational" ? "success" : "warning",
      });
      router.refresh();
    });
  };

  const dirty = pick !== declared || text.trim() !== (note ?? "").trim();

  return (
    <div className="space-y-3">
      {/* What a player is actually seeing right now — the only figure that matters. */}
      <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-bg-overlay px-3 h-10">
        <span className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-text-subtle">Players are told</span>
        <StatusPill status={effective} />
      </div>

      {derivedOverrodeDeclared && (
        <p className="flex items-start gap-1.5 rounded-md border border-warning-border bg-warning-bg/30 px-2.5 py-2 text-[11px] leading-snug text-text-muted">
          <I.alertCircle s={13} className="mt-px shrink-0 text-warning-fg" />
          <span>
            The withdrawal queue is worse than what you declared, so <b>reality wins</b> — players see{" "}
            <b>{effective}</b>. Declaring a healthier status cannot hide a stuck queue.
          </span>
        </p>
      )}

      <dl className="grid grid-cols-2 gap-2 text-[11px]">
        <Row term="Declared by an officer" desc={declared} />
        <Row term="Derived from the queue" desc={derived} />
        <Row term="Stuck payouts" desc={String(stuckCount)} />
        <Row term="Oldest stuck" desc={oldestStuckHours == null ? "—" : `${oldestStuckHours.toFixed(1)} h`} />
      </dl>

      {/* ⛔ G-6. `grid-cols-3` at 360 gives each cell ~63px of text room, and the labels
          are single unbreakable words at 10px uppercase with 0.1em tracking —
          "OPERATIONAL" needs ~79px, so it was clipped by 16px with no ellipsis, on the
          control that declares whether withdrawals are working. A word cannot wrap, so
          the column has to widen: one per row below `sm`. */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
        {OPTIONS.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => setPick(o.id)}
            className="rounded-md border px-2 py-1.5 text-left transition-colors"
            style={pick === o.id
              ? { borderColor: "var(--gold-edge)", background: "var(--gold-soft)", color: "var(--text)" }
              : { borderColor: "var(--border)", color: "var(--text-muted)" }}
          >
            <span className="block font-mono text-[10px] uppercase tracking-[0.1em] font-bold">{o.label}</span>
            <span className="block mt-0.5 text-[10px] leading-tight text-text-subtle">{o.hint}</span>
          </button>
        ))}
      </div>

      <label className="block">
        <span className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-text-subtle">
          Note shown to players (optional — blank uses the translated default)
        </span>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={2}
          maxLength={400}
          placeholder="Leave blank unless you need to say something more specific."
          className="mt-1 w-full rounded-sm border border-border bg-bg-overlay px-2 py-1.5 text-[12px] text-text admin-focus placeholder:text-text-subtle"
        />
        {/* A custom note replaces the translated body, so it reaches Swahili and Chinese players
            in English. Say so rather than let an officer discover it from a support ticket. */}
        {text.trim().length > 0 && (
          <span className="mt-1 block text-[10.5px] leading-snug text-warning-fg">
            A custom note replaces the translated message for every player, in all three languages.
          </span>
        )}
      </label>

      {/* The kit primitive, not a raw `btn` class — `test:ui-consistency` catches the latter,
          and it already handles the loading + disabled states this needs. */}
      <Button type="button" variant="primary" size="sm" fullWidth loading={pending} disabled={!dirty} onClick={save}>
        Apply
      </Button>
    </div>
  );
}

function Row({ term, desc }: { term: string; desc: string }) {
  return (
    <div className="rounded-md border border-border/70 px-2 py-1.5">
      <dt className="font-mono text-[9px] uppercase tracking-[0.1em] text-text-subtle">{term}</dt>
      <dd className="mt-0.5 font-mono text-[11.5px] font-bold text-text tabular-nums">{desc}</dd>
    </div>
  );
}

function StatusPill({ status }: { status: Status }) {
  const style =
    status === "unavailable"
      ? { borderColor: "var(--claret-edge)", background: "var(--claret-soft)", color: "var(--claret-200)" }
      : status === "delayed"
        ? { borderColor: "var(--warning-border)", background: "var(--warning-bg)", color: "var(--warning-fg)" }
        : { borderColor: "var(--border)", color: "var(--text-muted)" };
  return (
    <span className="inline-flex items-center gap-1 rounded-sm border px-2 h-6 font-mono text-[10px] font-bold uppercase tracking-[0.1em]" style={style}>
      {status === "operational" ? <I.check s={11} className="text-yes-300" /> : <I.alertCircle s={11} />}
      {status}
    </span>
  );
}
