/**
 * The search grammar — one parser for every filter in the product.
 *
 * The bug this exists to fix (user report, 2026-07-28): "filters don't have regex,
 * this is weird when I were searching for long things."
 *
 * The report was right, but the cause was not the absence of regex. There were
 * TWELVE hand-rolled search implementations and they did not agree. Two —
 * /markets and /results — matched every word independently, so a long query
 * worked. The other ten did a single contiguous `.toLowerCase().includes(q)`, so
 * typing `John 0712` found nothing: no single field contains that exact string.
 * The fix is one shared grammar with ONE definition of what a query means.
 *
 * ── The grammar ────────────────────────────────────────────────────────────
 *   john 0712              every word must appear, in any field, any order
 *   "long rains"           the whole phrase, contiguous, inside ONE field
 *   -crypto                exclude
 *   category:sports        restrict to a field (or a field group)
 *   /^\+2557[0-9]{8}$/     a real regex — opt-in only, see below
 *
 * ── Two rules that are not negotiable ──────────────────────────────────────
 *
 * 1. THE GRAMMAR NEVER ERRORS. An unknown field name degrades to a plain word.
 *    A non-technical operator must be able to paste anything — a URL, an ID with
 *    a colon in it, a half-typed phrase — and get results rather than a syntax
 *    complaint. `http://x` is findable by typing `http:`.
 *
 * 2. AN UNPARSEABLE REGEX RETURNS `invalid`, NEVER "match everything". On a
 *    compliance surface, silently dropping the filter would show an officer the
 *    full ledger and let them believe it was the filtered result. Callers must
 *    render the reason and show nothing.
 *
 * Regex is gated behind `allowRegex` at the CALL SITE, not by user input, because
 * Postgres `~*` is unindexable in the general case (a sequential scan with a
 * backtracking match per row) and V8's engine backtracks too. Without the flag,
 * `/foo/` is three ordinary characters. See prisma-where.ts for the full envelope.
 */

export type SearchTerm = {
  kind: "token" | "phrase";
  /** Pre-lowercased, so neither executor has to re-lower on every row. */
  value: string;
  negated: boolean;
  /** A field or field-group name from the entity's schema; undefined = all fields. */
  field?: string;
};

export type ParsedQuery =
  | { mode: "empty"; raw: string }
  | { mode: "terms"; raw: string; terms: SearchTerm[] }
  | { mode: "regex"; raw: string; source: string; flags: "" | "i" }
  | { mode: "invalid"; raw: string; reason: "regex-syntax" | "regex-too-long" | "regex-unsafe" };

/**
 * Settles the 100 / 120 / uncapped drift across the old call sites on the LARGER
 * of the two existing caps, so nothing that works today starts truncating.
 */
export const MAX_QUERY_LEN = 120;

/** A regex longer than this is refused outright — see `isSafeRegex`. */
export const MAX_REGEX_LEN = 64;

/**
 * A STATIC HEURISTIC, NOT A PROOF. It rejects the textbook catastrophic-backtracking
 * shapes; a determined adversary defeats any static ReDoS check. The real backstop
 * is the 3s `statement_timeout` on the SQL side and the 4,000-char haystack cap on
 * the JS side. Do not remove either on the strength of this function.
 */
export function isSafeRegex(src: string): boolean {
  if (src.length > MAX_REGEX_LEN) return false;
  // Backreferences and lookbehind: both are cheap to write and expensive to run.
  if (/\\[1-9]/.test(src)) return false;
  if (/\(\?<[=!]/.test(src)) return false;
  // A quantified group whose body itself contains a quantifier — (a+)+, (a|a?)+,
  // ([a-z]+)* — the classic exponential shapes. `?` is included: (a|a?)+ is just
  // as catastrophic as (a+)+ and is the one people write by accident.
  if (/\([^)]*[+*?}][^)]*\)\s*[+*]/.test(src)) return false;
  if (/\[[^\]]*\][+*]\s*[+*]/.test(src)) return false;
  // A quantified group containing ANY alternation — (a|aa)*, (a|b)+. Overlapping
  // branches under a quantifier backtrack exponentially even with no inner
  // quantifier at all, and there is no cheap way to tell overlapping from
  // disjoint. Deliberately over-broad: this rejects a benign (simba|yanga)+ too.
  // For an admin-only power feature, refusing a valid pattern is a far better
  // failure than pinning a connection the bet gate shares.
  if (/\([^)]*\|[^)]*\)\s*[+*]/.test(src)) return false;
  // An unbounded-ish repetition count.
  const braces = src.match(/\{(\d+)(?:,(\d*))?\}/g) ?? [];
  for (const b of braces) {
    const m = b.match(/\{(\d+)(?:,(\d*))?\}/)!;
    const hi = m[2] === "" ? Infinity : m[2] ? Number(m[2]) : Number(m[1]);
    if (hi > 100) return false;
  }
  try {
    new RegExp(src);
  } catch {
    return false;
  }
  return true;
}

/** Split on whitespace but keep "quoted phrases" and field:"quoted values" whole. */
function lex(input: string): string[] {
  const out: string[] = [];
  let buf = "";
  let inQuote = false;
  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    if (c === '"') { inQuote = !inQuote; buf += c; continue; }
    if (!inQuote && /\s/.test(c)) {
      if (buf) { out.push(buf); buf = ""; }
      continue;
    }
    buf += c;
  }
  if (buf) out.push(buf);
  return out;
}

const unquote = (s: string) => (s.startsWith('"') ? s.slice(1, s.endsWith('"') ? -1 : undefined) : s);

export function parseQuery(
  raw: string | null | undefined,
  opts: { allowRegex?: boolean; fields?: readonly string[] } = {},
): ParsedQuery {
  const trimmed = (raw ?? "").trim().slice(0, MAX_QUERY_LEN);
  if (!trimmed) return { mode: "empty", raw: "" };

  // ── Regex mode ────────────────────────────────────────────────────────────
  // The WHOLE query, or nothing. Mixing /re/ with tokens, negation and fields
  // multiplies the safety surface for no user benefit, and makes the timeout
  // envelope impossible to reason about.
  const rx = trimmed.match(/^\/(.+)\/(i?)$/s);
  if (rx && opts.allowRegex) {
    const source = rx[1];
    const flags = (rx[2] as "" | "i") ?? "";
    if (source.length > MAX_REGEX_LEN) return { mode: "invalid", raw: trimmed, reason: "regex-too-long" };
    try {
      new RegExp(source, flags);
    } catch {
      return { mode: "invalid", raw: trimmed, reason: "regex-syntax" };
    }
    if (!isSafeRegex(source)) return { mode: "invalid", raw: trimmed, reason: "regex-unsafe" };
    return { mode: "regex", raw: trimmed, source, flags };
  }
  // Without `allowRegex`, `/foo/` is literally three-plus characters. Falls through.

  // ── Term mode ─────────────────────────────────────────────────────────────
  const known = opts.fields ? new Set(opts.fields) : null;
  const terms: SearchTerm[] = [];

  for (const rawTok of lex(trimmed)) {
    let tok = rawTok;
    let negated = false;
    if (tok.startsWith("-") && tok.length > 1) { negated = true; tok = tok.slice(1); }

    // field:value — only when the name is one this entity actually has. Anything
    // else (a URL, an ID, a time) stays a plain token. Rule 1.
    const colon = tok.indexOf(":");
    if (colon > 0 && !tok.startsWith('"')) {
      const name = tok.slice(0, colon).toLowerCase();
      const rest = tok.slice(colon + 1);
      if (rest && (!known || known.has(name))) {
        const quoted = rest.startsWith('"');
        const value = unquote(rest).toLowerCase();
        if (value) { terms.push({ kind: quoted ? "phrase" : "token", value, negated, field: name }); continue; }
      }
    }

    const quoted = tok.startsWith('"');
    const value = unquote(tok).toLowerCase();
    if (!value) continue;
    terms.push({ kind: quoted ? "phrase" : "token", value, negated });
  }

  if (!terms.length) return { mode: "empty", raw: trimmed };
  return { mode: "terms", raw: trimmed, terms };
}

/**
 * A short, plain-language description of what a query will do. Rendered under the
 * search box so a non-technical operator can SEE the grammar working rather than
 * having to learn it. Caller supplies the localised words.
 */
export function describeQuery(
  q: ParsedQuery,
  words: { words: string; phrase: string; hiding: string; field: string; pattern: string },
): string {
  if (q.mode === "empty" || q.mode === "invalid") return "";
  if (q.mode === "regex") return words.pattern;
  const parts: string[] = [];
  const positive = q.terms.filter((t) => !t.negated);
  const negative = q.terms.filter((t) => t.negated);
  const phrases = positive.filter((t) => t.kind === "phrase");
  const fielded = positive.filter((t) => t.field);
  const plain = positive.filter((t) => t.kind === "token" && !t.field);
  if (plain.length) parts.push(`${plain.length} ${words.words}`);
  if (phrases.length) parts.push(words.phrase);
  if (fielded.length) parts.push(`${words.field}: ${fielded.map((t) => t.field).join(", ")}`);
  if (negative.length) parts.push(`${words.hiding} ${negative.map((t) => t.value).join(", ")}`);
  return parts.join(" · ");
}
