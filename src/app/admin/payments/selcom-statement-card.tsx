/**
 * THE SELCOM CARD — Jay's #7, rendered so a ledger figure cannot wear a rail label.
 *
 * ⛔ EVERY PROVENANCE STRING ON THIS CARD COMES OUT OF `provenanceLabel(figure.source)`.
 * None of them is typed by hand. That is the whole mechanism: the acceptance asks for
 * *"a guard that fails if a ledger figure is ever labelled a rail figure"*, and a check on
 * wording is not that guard — this campaign has counted a thing by its spelling and been
 * wrong three separate times. Here the heading is a function of the number, so the two
 * cannot drift apart, and `red:selcom-statement` proves it by swapping the figures and
 * requiring the labels to swap with them.
 *
 * ⚠️ THE CARD SHOWS THE NUMBER IT IS NOT, ON PURPOSE. `BET_PAYOUT` — winnings credited
 * inside a player's own wallet — is the figure that reads like "payouts work" and is not
 * money leaving to Selcom. On production it is 29.7× the rail figure. Hiding it would leave
 * an officer wondering where the rest went; showing it under the wrong heading is the
 * defect this whole unit exists to prevent. Naming it is the only honest third option.
 */
import { I } from "@/components/ui/glyphs";
import { formatTzs } from "@/lib/utils";
import { provenanceLabel, type SelcomStatement, type SourcedAmount } from "@/lib/server/selcom-statement";

/** Warn below one max-withdrawal of headroom — a dry float fails every payout. */
const FLOAT_LOW_TZS = 1_000_000;

/**
 * A figure and the label its OWN provenance earns it. ⛔ `label` is not a prop: the point
 * is that a caller cannot pass "from Selcom" beside a ledger number.
 */
function SourcedFigure({
  caption,
  sw,
  figure,
  tone,
}: {
  caption: string;
  sw: string;
  figure: SourcedAmount;
  tone?: "ok" | "danger" | "muted";
}) {
  const prov = provenanceLabel(figure.source);
  return (
    <div className="min-w-[150px]">
      <span className="font-mono text-micro uppercase text-text-subtle">
        {caption} · {sw}
      </span>
      <p
        className={`font-mono text-body-lg font-bold tabular-nums ${
          tone === "danger" ? "text-danger" : tone === "muted" ? "text-text-tertiary" : "text-text"
        }`}
      >
        {formatTzs(figure.amount)}
      </p>
      <p className="font-mono text-caption text-text-tertiary">
        {figure.count.toLocaleString()} confirmed · {prov.short} · {prov.sw}
      </p>
    </div>
  );
}

export function SelcomStatementCard({ statement }: { statement: SelcomStatement }) {
  const { rail, statement: s, internalCredits, conflationRatio } = statement;
  const float = rail.disbursementFloat;
  const floatProv = provenanceLabel("rail");

  return (
    <div className="space-y-4">
      {/* ── The two balances, both answered honestly ─────────────────────────── */}
      <div>
        <p className="font-mono text-micro uppercase text-text-subtle">
          Selcom balances · Salio la Selcom
        </p>
        <div className="mt-2 flex flex-wrap items-start gap-x-8 gap-y-3">
          {/* B2C — the one balance the vendor API exposes. */}
          <div className="min-w-[150px]">
            <span className="font-mono text-micro uppercase text-text-subtle">
              Disbursement float (B2C) · Salio la malipo
            </span>
            {float.available ? (
              <>
                <p
                  className={`font-mono text-body-lg font-bold tabular-nums ${
                    float.balance < FLOAT_LOW_TZS ? "text-danger" : "text-text"
                  }`}
                >
                  {formatTzs(float.balance)}
                </p>
                <p className="font-mono text-caption text-text-tertiary">
                  {floatProv.short} · {floatProv.sw}
                </p>
              </>
            ) : (
              <p className="mt-0.5 font-mono text-caption text-text-tertiary">Unavailable — {float.reason}</p>
            )}
          </div>

          {/* C2B — ⛔ there is no such balance in Selcom's contract, and the page says so
              rather than computing one from our ledger and captioning it "Selcom" (A-5). */}
          <div className="min-w-[220px] max-w-[420px]">
            <span className="font-mono text-micro uppercase text-text-subtle">
              Collections balance (C2B) · Salio la makusanyo
            </span>
            <p className="mt-0.5 font-mono text-body-sm font-bold text-text-tertiary">Not published by Selcom</p>
            <p className="font-mono text-body-sm leading-relaxed text-text-tertiary">{rail.collectionsBalance.reason}</p>
          </div>
        </div>
        {float.available && float.balance < FLOAT_LOW_TZS && (
          <p className="mt-2 inline-flex items-center gap-1.5 font-mono text-body-sm text-danger">
            <I.alertCircle s={13} /> Low float — top up; payouts fail when it runs dry.
          </p>
        )}
      </div>

      {/* ── The statement: what actually crossed the rail ────────────────────── */}
      <div className="border-t border-border-subtle pt-3">
        <p className="font-mono text-micro uppercase text-text-subtle">
          Statement · Taarifa ya miamala · all confirmed movements
        </p>
        <div className="mt-2 flex flex-wrap items-start gap-x-8 gap-y-3">
          <SourcedFigure caption="Money in (deposits)" sw="Fedha zilizoingia" figure={s.in} />
          <SourcedFigure caption="Money out (withdrawals)" sw="Fedha zilizotoka" figure={s.out} />
          <SourcedFigure
            caption="Net across the rail"
            sw="Salio la mwendo"
            figure={s.net}
            tone={s.net.amount < 0 ? "danger" : "ok"}
          />
        </div>
        <p className="mt-2 font-mono text-body-sm leading-relaxed text-text-tertiary">
          Counted from confirmed <span className="text-text-secondary">DEPOSIT</span> and{" "}
          <span className="text-text-secondary">WITHDRAWAL</span> transactions only — the two movements that
          reach Selcom. Reconciles to <span className="text-text-secondary">scripts/live/ops/payments-now.cjs</span>.
        </p>
      </div>

      {/* ── ⛔ The figure that is NOT a rail figure ──────────────────────────── */}
      <div className="border-t border-border-subtle pt-3">
        <div className="flex flex-wrap items-start gap-x-8 gap-y-3">
          <SourcedFigure
            caption="Winnings credited in-wallet"
            sw="Ushindi ndani ya pochi"
            figure={internalCredits}
            tone="muted"
          />
          <p className="max-w-prose font-mono text-body-sm leading-relaxed text-text-tertiary">
            <span className="text-warning">This did not touch Selcom.</span> A winner is credited inside their
            50pick wallet; the money only reaches the rail if they later withdraw it.
            {conflationRatio !== null && conflationRatio > 1 && (
              <>
                {" "}
                Quoting it as money paid out would overstate the rail by{" "}
                <span className="text-text-secondary tabular-nums">{conflationRatio.toFixed(1)}×</span>.
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
