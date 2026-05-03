/**
 * Public provably-fair page · /fairness
 *
 * Shows the commit-reveal proof for every recent settled Mapigo round and
 * provides a client-side verifier so anyone (regulator, lab, player) can
 * recompute the outcome locally and confirm it matches what we paid out.
 *
 * No auth required — the integrity of the system must be verifiable by anyone.
 */
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Card } from "@/components/ui/card";
import { getRecentRounds } from "@/lib/server/mapigo-service";
import { CALL_DISTRIBUTION } from "@/lib/server/fairness";
import { FairnessVerifier } from "./verifier";

export const metadata = { title: "Provably-fair · Uadilifu wa hesabu" };
export const dynamic = "force-dynamic";

export default function FairnessPage() {
  const rounds = getRecentRounds(10);

  return (
    <div className="mx-auto max-w-[1080px] px-3 lg:px-6 py-6 lg:py-8 space-y-6">
      <Breadcrumbs items={[{ label: "Fairness · Uadilifu" }]} />
      <header className="space-y-2">
        <h1 className="font-display font-bold text-title-lg text-text">Provably-fair Mapigo</h1>
        <p className="text-caption italic text-text-tertiary">Uadilifu wa hesabu wa Mapigo</p>
        <p className="text-body text-text-secondary max-w-[68ch]">
          Every Mapigo round commits to its outcome before any bet is placed. We publish a SHA-256 hash
          of a 32-byte server seed when the round opens. After the round settles we reveal the seed,
          and anyone — you, a regulator, a test lab — can recompute the result from the seed and the
          public round id. If our recompute does not match the published commit, you have proof of
          tampering.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
        <Card padding="lg" className="space-y-4">
          <div className="flex items-baseline justify-between">
            <h2 className="font-display font-bold text-title-sm text-text">How it works</h2>
            <span className="font-mono text-caption text-text-tertiary uppercase tracking-[0.16em]">GLI-19 §6.2</span>
          </div>
          <ol className="space-y-3 text-body-sm text-text-secondary list-decimal pl-5 marker:text-gold marker:font-bold">
            <li>
              <strong className="text-text">Open</strong> — server generates a 32-byte random seed, publishes its
              SHA-256 hash. The seed itself is held in escrow.
            </li>
            <li>
              <strong className="text-text">Stake</strong> — players see only the hash. They cannot derive the outcome.
            </li>
            <li>
              <strong className="text-text">Settle</strong> — server reveals the seed. Outcome is{" "}
              <code className="font-mono text-caption text-gold">HMAC-SHA-256(seed, roundId:nonce)[0..3]</code>{" "}
              mapped against the published call distribution.
            </li>
            <li>
              <strong className="text-text">Verify</strong> — anyone re-hashes the seed, confirms it matches the
              originally-published commit, then runs the same HMAC and reads the outcome.
            </li>
          </ol>
          <div>
            <p className="text-caption uppercase tracking-[0.16em] font-bold text-text-secondary mb-2">
              Call distribution · Mgawanyo
            </p>
            <div className="flex gap-2">
              {CALL_DISTRIBUTION.map((slot) => (
                <div key={slot.call} className="flex-1 px-3 py-2 rounded-md border border-border bg-surface text-center">
                  <div className="font-mono text-body-sm font-bold text-text">{slot.call}</div>
                  <div className="font-mono text-caption text-gold">{slot.weight}%</div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card padding="lg" className="space-y-3">
          <h2 className="font-display font-bold text-title-sm text-text">Verifier · Kithibitishaji</h2>
          <p className="text-caption text-text-tertiary">
            Paste a round&apos;s seed + commit + nonce. The verifier runs entirely in your browser.
          </p>
          <FairnessVerifier />
        </Card>
      </div>

      <Card padding="lg">
        <h2 className="font-display font-bold text-title-sm text-text mb-3">Recent settled rounds</h2>
        {rounds.length === 0 ? (
          <p className="text-body-sm text-text-tertiary">No settled rounds yet — proofs publish here automatically.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-body-sm">
              <thead className="text-caption uppercase tracking-[0.16em] text-text-tertiary text-left">
                <tr className="border-b border-border">
                  <th className="py-2 pr-3 font-bold">Round</th>
                  <th className="py-2 px-3 font-bold">Result</th>
                  <th className="py-2 px-3 font-bold">Server seed</th>
                  <th className="py-2 px-3 font-bold">Commit (SHA-256)</th>
                  <th className="py-2 pl-3 font-bold text-right">Nonce</th>
                </tr>
              </thead>
              <tbody className="font-mono">
                {rounds.map((r) => (
                  <tr key={r.id} className="border-b border-border/60 align-top">
                    <td className="py-2 pr-3 text-text whitespace-nowrap">#{r.number}</td>
                    <td className="py-2 px-3 text-gold font-bold">{r.result}</td>
                    <td className="py-2 px-3 text-text-secondary break-all max-w-[260px]">{r.serverSeed ?? "—"}</td>
                    <td className="py-2 px-3 text-text-secondary break-all max-w-[260px]">{r.serverSeedHash ?? "—"}</td>
                    <td className="py-2 pl-3 text-text-secondary text-right">{r.nonce}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-caption text-text-tertiary mt-3">
          Round ids are stable. To verify any historical round, copy the server seed + commit + nonce
          into the verifier above. The recomputed outcome must match the result column.
        </p>
      </Card>
    </div>
  );
}
