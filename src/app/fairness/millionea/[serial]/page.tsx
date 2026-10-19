/**
 * /fairness/millionea/[serial] — ONE TICKET'S INCLUSION PROOF, FOR ITS OWNER (MASWALI-BUILD S6 item 1; MASWALI-PLAN §3 MR-9
 * and MR-13, §8 MB-32 and MB-95).
 *
 * The three steps a ticket's owner can check for themselves: (1) the fingerprint, recomputed from the week's id, the
 * ticket's id, its 128-bit salt and its fifteen answers; (2) the RFC 6962 audit path from it; (3) the root the close
 * stamped. The page states the server's verdict, and the owner's own browser runs the same check again (`ProofCheck`).
 * ⛔ GATED AS THE TICKET PAGE IS — the rollout first, in the page and in its metadata, then the owner:
 *    ⏳ this branch predates the tickets' own gate (`millioneaTicketGate`, L5: a kill hides the product, never a holder's
 *    tickets, `mln-s5-pages`), so it asks `millioneaGate` — the stricter of the two (a hidden product 404s here even for a
 *    holder) — and the lead swaps the one name at merge, as the ticket page reads it (the lane's report).
 * ⛔ OWNER-ONLY, AND NO EXISTENCE ORACLE (MB-95): a malformed serial, a serial nobody holds and a serial someone else holds
 *    are one answer — the not-found page — because the read model answers all three with null. A signed-out reader is
 *    sent to sign in for every serial alike, before anything is read.
 * ⛔ THE SALT IS PRINTED HERE, AND ONLY HERE AND ON THE OWNER'S TICKET: without it nobody can recompute a leaf (MB-32).
 * ⛔ An unearned surface: no gold. Hashes are data: mono, whole, wrapping anywhere.
 * ⭐ AT STAFF_PREVIEW IT WEARS THE PREVIEW MARK under its header, as How to play does (`gate.preview`); the loading state
 *    draws no mark, as no S5 loading state does (it renders before the gate answers).
 */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { BackLink } from "@/components/ui/back-link";
import { Callout } from "@/components/ui/callout";
import { noticeBody } from "@/components/ui/empty-state-text";
import { I } from "@/components/ui/glyphs";
import { millioneaGate } from "@/lib/server/millionea-gate";
import { millioneaProofHref, millioneaTicketProof } from "@/lib/server/maswali-fairness";
import { millioneaTicketHref } from "@/lib/position-permalink";
import { getServerT } from "@/lib/i18n-server";
import { sideWord } from "@/lib/side-label";
import { formatEatDateTime } from "@/lib/eat-day";
import { fill, formatNumber } from "@/lib/utils";
import { generateMetadata as notFoundMetadata } from "@/app/not-found";
import { MillioneaPreviewMark } from "@/app/millionea/millionea-parts";
import { ProofCheck } from "./proof-check";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  // The title obeys the gate the body obeys, and asking never rejects (`test:visual-pass-r5d` 1.4″): a page the rollout
  // hides is titled as the identical 404 is — S5's Millionea pages' precedent, `millioneaDoor`.
  try {
    await millioneaGate();
  } catch {
    return notFoundMetadata();
  }
  const { t } = await getServerT();
  // ⛔ No serial in the title: the metadata does not read the ticket, and a title must not confirm that one exists.
  return { title: `${t.millioneaFairness.proofTitle} · ${t.millionea.productLabel}` };
}

const LABEL = "font-mono text-micro uppercase eyebrow text-text-subtle";
const VALUE = "font-mono text-body-sm text-text break-all";
const H2 = "font-display text-body-lg font-semibold text-text";

/** One labelled datum of the proof: its name, then the value itself, whole. */
function Datum({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className={LABEL}>{label}</span>
      <span className={VALUE}>{value}</span>
    </div>
  );
}

export default async function MillioneaProofPage({ params }: { params: Promise<{ serial: string }> }) {
  const gate = await millioneaGate();
  const { serial } = await params;
  if (!gate.userId) redirect(`/auth/login?next=${encodeURIComponent(millioneaProofHref(serial))}`);
  const { t, locale } = await getServerT();
  // B-1 — no swallow: a failed read throws to error.tsx; null is "not found or not yours", one answer for both.
  const p = await millioneaTicketProof(gate.userId, serial);
  if (!p) notFound();

  const f = t.millioneaFairness;
  const nowMs = Date.now();
  const when = (iso: string | null) => formatEatDateTime(iso ? Date.parse(iso) : Number.NaN, nowMs, t.common.monthsShort, locale);
  const yes = sideWord(t, "YES", "MASWALI"), no = sideWord(t, "NO", "MASWALI");
  const proof = p.proof;
  const root = p.week.ticketMerkleRoot;

  return (
    <PageContainer tier="reading" className="space-y-5">
      <BackLink fallbackHref={millioneaTicketHref(p.serial)} label={f.backToTicket} />
      <PageHeader eyebrow={t.footer.fairness} title={f.proofTitle} />
      {gate.preview && <MillioneaPreviewMark t={t} />}
      <div className="flex flex-col gap-1">
        <span className="font-mono text-body-sm tabular-nums text-text">{p.serial}</span>
        <p className="text-body-sm text-text-muted text-pretty">{f.proofOwner}</p>
      </div>

      <section aria-labelledby="mln-proof-leaf" className="glass-panel p-5 lg:p-6 flex flex-col gap-3">
        <h2 id="mln-proof-leaf" className={H2}>{`1 · ${f.stepLeaf}`}</h2>
        <Datum label={f.weekId} value={p.week.id} />
        <Datum label={f.ticketId} value={p.ticket.id} />
        <Datum label={f.salt} value={p.ticket.salt} />
        <Datum label={fill(f.picks, { yes, no })} value={p.ticket.picks} />
        <Datum label={f.leaf} value={p.ticket.leaf} />
        <p role="status" className="text-body-sm text-text-muted text-pretty">{p.leafMatches ? f.leafOk : f.leafBad}</p>
      </section>

      {p.standing === "CANCELLED" && <Callout tone="neutral" role="status">{noticeBody(f.cancelled)}</Callout>}
      {p.standing === "AWAITING_CLOSE" && <Callout tone="info" role="status">{noticeBody(fill(f.awaiting, { when: when(p.week.closesAt) }))}</Callout>}

      {proof && root && (
        <>
          <section aria-labelledby="mln-proof-path" className="glass-panel p-5 lg:p-6 flex flex-col gap-3">
            <h2 id="mln-proof-path" className={H2}>{`2 · ${f.stepPath}`}</h2>
            <p className="text-body-sm text-text-muted text-pretty">{fill(f.pathMeta, { index: formatNumber(proof.index + 1), size: formatNumber(proof.size) })}</p>
            {proof.path.length === 0 ? (
              <p className="text-body-sm text-text-muted">{f.pathNone}</p>
            ) : (
              <ol role="list" className="flex flex-col gap-1">
                {proof.path.map((h, i) => (
                  <li key={`${i}-${h}`} className="grid grid-cols-[24px_minmax(0,1fr)] gap-2">
                    <span className="font-mono text-body-sm tabular-nums text-text-subtle">{i + 1}</span>
                    <span className={VALUE}>{h}</span>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section aria-labelledby="mln-proof-root" className="glass-panel p-5 lg:p-6 flex flex-col gap-3">
            <h2 id="mln-proof-root" className={H2}>{`3 · ${f.stepRoot}`}</h2>
            <Datum label={fill(f.rootStamped, { n: formatNumber(p.week.ticketCount ?? 0), when: when(p.week.closedAt) })} value={root} />
            <Callout tone={p.standing === "COMMITTED" ? "success" : "danger"} role="status">
              {noticeBody(p.standing === "COMMITTED" ? f.proofOk : f.proofBad)}
            </Callout>
            <ProofCheck
              weekId={p.week.id}
              ticketId={p.ticket.id}
              salt={p.ticket.salt}
              picks={p.ticket.picks}
              proof={proof}
              root={root}
              words={{ checking: f.browserChecking, ok: f.browserOk, bad: f.browserBad }}
            />
          </section>
        </>
      )}

      <Link
        href={"/fairness#millionea" as never}
        className="inline-flex items-center gap-1 text-body-sm text-text-link hover:text-text-linkHover"
        style={{ minHeight: "var(--h-control-md)" }}
      >
        {f.howItWorks}
        <I.chevronRight s={14} edge="end" text="body-400" />
      </Link>
    </PageContainer>
  );
}
