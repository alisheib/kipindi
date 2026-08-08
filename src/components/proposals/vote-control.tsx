"use client";

/**
 * VoteControl — up / score / down for a proposal. Three states:
 *   idle (neutral arrows) · upvoted (gold) · downvoted (claret).
 * Vote arrows are NEVER betting green/red — a proposal is not a YES/NO bet.
 * Optimistic: the score updates instantly, then reconciles with the server.
 */
import { useRef, useState, useTransition } from "react";
import { I } from "@/components/ui/glyphs";
import { voteAction } from "@/app/proposals/actions";
import { useToast } from "@/components/ui/toast";
import { useT } from "@/lib/i18n";

type Dir = "up" | "down" | null;

export function VoteControl({
  proposalId,
  up,
  down,
  myVote,
  horizontal,
  disabled,
}: {
  proposalId: string;
  up: number;
  down: number;
  myVote: Dir;
  horizontal?: boolean;
  disabled?: boolean;
}) {
  const { toast } = useToast();
  const { t } = useT();
  const [, start] = useTransition();
  const [vote, setVote] = useState<Dir>(myVote);
  const [tally, setTally] = useState({ up, down });

  const score = tally.up - tally.down;
  const upColor = vote === "up" ? "var(--accent-400)" : "var(--text-subtle)";
  const downColor = vote === "down" ? "var(--claret-300)" : "var(--text-subtle)";
  const scoreColor = vote === "up" ? "var(--accent-400)" : vote === "down" ? "var(--claret-300)" : "var(--text)";

  const [pop, setPop] = useState(0);
  /** Monotonic per-click sequence — the stale-response guard (B-20). */
  const voteSeq = useRef(0);

  const click = (dir: "up" | "down") => {
    if (disabled) return;
    // No haptic. A vote is a choice, not a physical event (kit rule: contact /
    // passing true / coming to rest, never encouragement). Proposals also carry a
    // regulated reward, so a reinforcing buzz on the vote itself is doubly wrong.
    setPop((n) => n + 1); // re-trigger the count flourish
    const next: Dir = vote === dir ? null : dir;
    // Snapshot the live state *before* the optimistic update, so a failure rolls
    // back to exactly what the user saw — not to the render-time props, which the
    // parent may have changed while the request was in flight.
    const prevVote = vote;
    const prevTally = tally;
    // Optimistic local update.
    setVote(next);
    setTally((t) => {
      let u = t.up - (vote === "up" ? 1 : 0);
      let d = t.down - (vote === "down" ? 1 : 0);
      if (next === "up") u++;
      if (next === "down") d++;
      return { up: Math.max(0, u), down: Math.max(0, d) };
    });
    // B-20 — a rapid up→down fires two requests, and the FIRST response can land
    // last: applied in arrival order, the stale tally overwrites the fresh one.
    // Each click takes a sequence number; only the latest may apply its response.
    const seq = ++voteSeq.current;
    start(async () => {
      // B-12 — a flaky network mid-action THROWS inside the transition, and an
      // uncaught throw replaces the whole page with error.tsx. Same rollback as
      // a refused vote; the toast states the network truth.
      let r: Awaited<ReturnType<typeof voteAction>>;
      try {
        r = await voteAction(proposalId, next);
      } catch {
        r = { ok: false as const, error: t.error.somethingDidntWork };
      }
      if (seq !== voteSeq.current) return; // a newer click owns the state now
      if (r.ok) setTally({ up: r.up, down: r.down });
      else {
        // Roll back to the captured pre-click state.
        setVote(prevVote);
        setTally(prevTally);
        toast({ title: t.toast.voteFailed, description: r.error, variant: "danger" });
      }
    });
  };

  const Btn = ({ dir, color }: { dir: "up" | "down"; color: string }) => (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); e.preventDefault(); click(dir); }}
      aria-label={dir === "up" ? t.proposals.upvote : t.proposals.downvote}
      aria-pressed={vote === dir}
      disabled={disabled}
      className="grid place-items-center rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      style={{
        width: 36,
        height: 34,
        color,
        cursor: disabled ? "not-allowed" : "pointer",
        background:
          vote === dir
            ? dir === "up"
              ? "color-mix(in oklab, var(--accent-500) 18%, transparent)"
              : "color-mix(in oklab, var(--claret-500) 18%, transparent)"
            : "transparent",
      }}
    >
      {dir === "up" ? <I.chevronUp s={18} /> : <I.chevronDown s={18} />}
    </button>
  );

  return (
    <div
      className="inline-flex items-center rounded-md border border-border bg-bg-overlay"
      style={{ flexDirection: horizontal ? "row" : "column", gap: 2, padding: 3 }}
    >
      <Btn dir="up" color={upColor} />
      <span key={pop} className="vote-pop font-mono text-[13px] font-bold text-center" style={{ color: scoreColor, minWidth: 22 }}>
        {score}
      </span>
      <Btn dir="down" color={downColor} />
    </div>
  );
}
