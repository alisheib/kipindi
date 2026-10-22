/**
 * The integrity page's "Letters not known to have gone" card (MASWALI-BUILD S6, the lane-N review's round 7 M2 and round
 * 17 M5; S6-NOTICES L-2 and L-3) — the win and refund letters an officer must look at, read from each week's newest run of
 * its money notice (`unresolvedLetters`, maswali-console.ts):
 *   · ONE SENTENCE A CAUSE, each true of the letters it counts (L-3): a letter the provider may have taken, whose search
 *     has not said so; one whose search can never be asked, because the account's address or the pepper changed since its
 *     attempt; one whose search found no such message and whose one resend is owed; and (L-2) holders whose letter records
 *     could not be read, so nothing was sent to them;
 *   · FOR COMPLIANCE, each letter with its holder, its provider tag and its attempts' times — read only when the officer opens
 *     a week's row (`unresolvedLetterList`), a page at a time (`test:grid-paging`'s rule: no list cut at N);
 *   · the check (its control is the page's, `control`), which closes every open letter of the week for good.
 * A server component with no read of its own: what it is handed is what it draws, so a suite renders it from fixed rows.
 */
import Link from "next/link";
import type { ReactNode } from "react";
import { ScrollX } from "@/components/ui/scroll-x";
import { AdminPagination, buildBaseHref } from "@/components/admin/admin-pagination";
import { CONSOLE_PER_PAGE, type UnresolvedLetterRow, type UnresolvedLetters, type UnresolvedLettersRead } from "@/lib/server/maswali-console";
import { formatNumber } from "@/lib/utils";
import { fmtEat } from "@/lib/maswali-admin-format";

const INTEGRITY_HREF = "/admin/maswali/integrity";

/** "1 letter" / "3 letters" — with its kind when given ("1 refund letter"). */
const lettersWord = (n: number, kind = "") => `${n === 1 ? "1" : formatNumber(n)} ${kind ? `${kind} ` : ""}${n === 1 ? "letter" : "letters"}`;

/** The opened row's key: its week and notice. */
export const letterRowKey = (l: Pick<UnresolvedLetters, "weekId" | "notice">): string => `${l.weekId}.${l.notice}`;

/**
 * ⭐ ONE SENTENCE A CAUSE (S6-NOTICES L-3) — each says what is true of the letters it counts, and what becomes of them. Pure,
 * so a suite reads the card's words without a page.
 */
export function letterCauseSentences(row: Pick<UnresolvedLetters, "causes" | "unread">, reconcileDays: number): string[] {
  const out: string[] = [];
  const { uncertain, unmatched, resendOwed } = row.causes;
  if (uncertain > 0) {
    const one = uncertain === 1;
    out.push(`${lettersWord(uncertain)} may have been taken by the email provider, and ${one ? "its" : "their"} search has not said so. Each run asks again: a letter the search finds is done, and one it finds no trace of is sent once more, never a third time.`);
  }
  if (unmatched > 0) {
    const one = unmatched === 1;
    out.push(`${lettersWord(unmatched)} may have been taken by the email provider, but ${one ? "its" : "their"} search can never be asked: the account's address, or the key ${one ? "its" : "their"} attempt was recorded under, has changed since. ${one ? "It is" : "They are"} never searched for or sent again.`);
  }
  if (resendOwed > 0) {
    const one = resendOwed === 1;
    out.push(`${lettersWord(resendOwed)} ${one ? "was" : "were"} not found by the provider's search: ${one ? "its" : "each one's"} one resend is owed, and the next run sends it.`);
  }
  if (row.unread > 0) {
    const one = row.unread === 1;
    out.push(`${one ? "1 holder's" : `${formatNumber(row.unread)} holders'`} letter records could not be read, so nothing was sent to them. Each run reads them again for ${reconcileDays} days after the week ended; the check cannot be recorded until they read.`);
  }
  return out;
}

/** What the officer does with the open letters — said once, under the causes, whenever a letter is open. */
export const LETTERS_CHECK_SENTENCE = "Check the provider's activity for each letter, by its tag and attempt time, before anyone writes to the holder. Recording the check closes every open letter of this week for good: never searched for, never sent again.";

/** A listed letter's cause, as its row in the opened list says it. */
const CAUSE_WORD: Record<UnresolvedLetterRow["cause"], string> = {
  uncertain: "Search has not said",
  unmatched: "Search cannot be asked",
  resendOwed: "Resend owed",
};

export type OpenedLetters = { key: string; list: { rows: UnresolvedLetterRow[]; total: number; page: number } | null };

export function LettersCardBody({ read, reconcileDays, opened, query, control }: {
  read: UnresolvedLettersRead | null;
  /** How long the reconcile reads a week's letters again after it ended (`NOTICE_RECONCILE_DAYS`). */
  reconcileDays: number;
  /** The row an officer opened (`lopen`) and its letters, a page at a time; null when none is open. */
  opened: OpenedLetters | null;
  /** The page's own query, so the links keep the other lists where they were. */
  query: Readonly<Record<string, string | undefined>>;
  /** The check's control for one row — the page's (its role decides it). */
  control: (row: UnresolvedLetters) => ReactNode;
}) {
  if (read === null) return <p className="text-body-sm text-danger-fg">The letters not known to have gone could not be read.</p>;
  const openHref = (key: string | null) => buildBaseHref(INTEGRITY_HREF, { ...query, lopen: key ?? undefined }, "lpage");
  return (
    <>
      {read.truncated ? <p className="text-body-sm text-text-tertiary">Only the newest weeks were read; older weeks are not shown here.</p> : null}
      {read.partial ? <p className="text-body-sm text-text-tertiary">Some weeks hold more records than one read covers, so a letter of theirs may be missing here; the week&apos;s audit trail has the rest.</p> : null}
      {read.rows.length === 0 ? <p className="text-body-sm text-text-secondary">{read.partial ? "No letter is listed from the records read." : "No win or refund letter is waiting on an officer's check."}</p> : (
        <ul className="space-y-3">
          {read.rows.map((l) => {
            const key = letterRowKey(l);
            const isOpen = opened?.key === key;
            const head = [
              ...(l.letters > 0 ? [`${lettersWord(l.letters, l.notice === "refund" ? "refund" : "win")} open`] : []),
              ...(l.unread > 0 ? [`${l.unread === 1 ? "1 holder's" : `${formatNumber(l.unread)} holders'`} records not read`] : []),
            ];
            return (
              <li key={key} className="text-body-sm">
                <span className="tabular">{l.code}</span> · {head.join(" · ")}
                {letterCauseSentences(l, reconcileDays).map((s) => <span key={s} className="block text-text-tertiary">{s}</span>)}
                {l.letters > 0 ? <span className="block text-text-tertiary">{LETTERS_CHECK_SENTENCE}</span> : null}
                <span className="mt-1 flex flex-wrap items-center gap-3">
                  {l.letters > 0 ? <Link href={openHref(isOpen ? null : key) as never} className="text-royal-300 hover:underline">{isOpen ? "Hide the letters" : `Show the ${l.letters === 1 ? "letter" : "letters"}`}</Link> : null}
                  {control(l)}
                </span>
                {isOpen && opened ? <OpenedList opened={opened} baseHref={openHref(key)} /> : null}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

/** The opened row: each open letter with its holder, its account, why it is open, its provider tag and its attempts (EAT). */
function OpenedList({ opened, baseHref }: { opened: OpenedLetters; baseHref: string }) {
  if (opened.list === null) return <p className="mt-2 text-body-sm text-danger-fg">This week&apos;s letter records could not be read whole here; the week&apos;s audit trail has them.</p>;
  if (opened.list.total === 0) return <p className="mt-2 text-body-sm text-text-secondary">No letter of this week is open on its holder&apos;s records now.</p>;
  return (
    <div className="mt-2">
      <ScrollX label="Millionea letters not known to have gone">
        <table className="admin-tbl min-w-[960px]">
          <thead><tr><th className="text-left">Holder</th><th className="text-left">Account</th><th className="text-left">Why</th><th className="text-left">Provider tag</th><th className="text-left">Attempts (EAT)</th></tr></thead>
          <tbody>
            {opened.list.rows.map((r) => (
              <tr key={r.userId}>
                <td className="text-left">{r.holder}</td>
                <td className="text-left font-mono break-all">{r.userId}</td>
                <td className="text-left">{CAUSE_WORD[r.cause]}</td>
                <td className="text-left font-mono break-all">{r.tag}</td>
                <td className="text-left tabular">{r.attempts.length === 0 ? "None recorded" : r.attempts.map((a) => fmtEat(a)).join(" · ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </ScrollX>
      {opened.list.total > CONSOLE_PER_PAGE && <AdminPagination page={opened.list.page} total={opened.list.total} perPage={CONSOLE_PER_PAGE} baseHref={baseHref} param="lpage" />}
    </div>
  );
}
