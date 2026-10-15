/** A pending payout can still complete after an inconclusive status query. */
export function StuckPayoutControls({ amountLabel }: { amountLabel: string }) {
  return (
    <div role="note" className="max-w-[245px] rounded-md border border-border bg-bg-overlay/60 px-3 py-2.5">
      <p className="text-body-sm font-semibold text-text">Provider review required</p>
      <p className="mt-1 text-body-sm text-text-secondary leading-snug">
        The {amountLabel} payout remains held. Confirm with the provider whether money was sent before deciding how to resolve it.
      </p>
    </div>
  );
}
