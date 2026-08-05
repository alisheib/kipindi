/**
 * E-101 · A TICKET REFERENCE MUST LINK TO THAT TICKET.
 *
 *   npm run test:position-permalink
 *
 * ⛔ EVERY CHECK HERE MUST FAIL IF THE FEATURE IS DELETED. The behaviour before this shipped is
 * "every ticket links to `/positions`", so a `positionPermalink` that returns `/positions` for
 * everything must break §1, §2 and §3 — and the wiring checks in §4 must break if any of the
 * four surfaces goes back to a hardcoded list href. That is the bar §0 of the campaign sets.
 *
 * ⛔ §4 COUNTS STATEMENTS, NOT MENTIONS (standards §5b.1). `"/positions"` appears legitimately
 * in this codebase ~14 times — the bottom nav, the top bar, the avatar menu, `revalidatePath`,
 * an error page's back link. A grep for the string would be green on a broken product and red on
 * a correct one. So each check is scoped to the ONE construct under test.
 */
import { readFileSync } from "node:fs";
import { positionPermalink, positionPermalinkHref, positionAnchorId } from "../src/lib/position-permalink.ts";

let pass = 0; const fails: string[] = [];
function ok(name: string, cond: boolean, detail = "") {
  if (cond) { pass++; console.log(`  ok   ${name}`); }
  else { fails.push(`${name}${detail ? ` — ${detail}` : ""}`); console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`); }
}
/** ⛔ A MISSING FILE IS A FAILED CHECK, NOT A CRASH. A throw here would abort the run before
 *  the later sections report, and the RED harness's contract is "exit non-zero AND report ≥1
 *  failure" — a stack trace satisfies the first half only, which is how a mutation gets scored
 *  as caught for the wrong reason. */
const read = (p: string) => { try { return readFileSync(p, "utf8"); } catch { return ""; } };
/** Source with `//` and `/* *​/` comments stripped — a guard that greps for a defect will
 *  otherwise match the comment explaining its fix (this repo has paid for that twice). */
const code = (p: string) => read(p).replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const POS = "pos_e290a28e8e906b6255";

console.log("\n── 1 · an UP & DOWN position goes to its ROUND, never to the other game's list ──");
{
  const d = positionPermalink({ positionId: POS, productLine: "UPDOWN", marketId: "mkt_1", roundId: "udr_abc" });
  ok("1.1 ⭐ it lands on the round page", d.href === `/updown/udr_abc#${POS}`, `got ${d.href}`);
  ok("1.2 ⭐ and it carries the position id as the fragment, so a row can be scrolled to",
    d.href.endsWith(`#${POS}`), `got ${d.href}`);
  ok("1.3 that is not a fallback", d.isFallback === false && d.surface === "updown-round");
  // 🔴 THE DEFECT ITSELF, as an assertion: /positions is `productLine: "MARKET"`, so an
  // Up & Down bet cannot ever appear there. Any href into it is a dead end.
  ok("1.4 ⛔ it NEVER points at /positions", !d.href.startsWith("/positions"), `got ${d.href}`);
}

console.log("\n── 2 · …and when the round row is missing it degrades to the RIGHT list ──");
{
  const d = positionPermalink({ positionId: POS, productLine: "UPDOWN", marketId: "mkt_1", roundId: null });
  ok("2.1 ⭐ the fallback is the Up & Down portfolio, not the long-form one",
    d.href === `/updown/history#${POS}`, `got ${d.href}`);
  ok("2.2 ⛔ still never /positions", !d.href.startsWith("/positions"), `got ${d.href}`);
  ok("2.3 and it SAYS it degraded rather than leaving the caller to infer it", d.isFallback === true);
}

console.log("\n── 3 · a long-form position goes to its MARKET, where its card is rendered ──");
{
  const d = positionPermalink({ positionId: POS, productLine: "MARKET", marketId: "mkt_9a13", roundId: null });
  ok("3.1 ⭐ it lands on the market page", d.href === `/markets/mkt_9a13#${POS}`, `got ${d.href}`);
  ok("3.2 not a fallback", d.isFallback === false && d.surface === "market");
  const orphan = positionPermalink({ positionId: POS, productLine: "MARKET", marketId: null, roundId: null });
  ok("3.3 with no market at all it degrades to the long-form list, and says so",
    orphan.href === `/positions#${POS}` && orphan.isFallback === true, `got ${orphan.href}`);
}

console.log("\n── 3b · the shared pieces ──");
{
  ok("3b.1 the anchor id IS the position id — one convention, both destinations",
    positionAnchorId(POS) === POS);
  ok("3b.2 the pre-resolution href is the ownership-checked route",
    positionPermalinkHref(POS) === `/positions/${POS}`, positionPermalinkHref(POS));
}

console.log("\n── 4 · the four surfaces are WIRED to it (statements, not mentions) ──");
{
  // ⛔ Scope to the construct, never to the file. `"/positions"` is a correct href in the nav,
  // the avatar menu and revalidatePath; a file-wide match cannot tell those from the defect.
  const wallet = code("src/app/wallet/wallet-client.tsx");
  // The ticket box is the <Link> whose body renders `tx.positionId`.
  const ticketLink = /<Link\s+href=\{([^}]*)\}[\s\S]{0,900}?\{tx\.positionId\}[\s\S]{0,200}?<\/Link>/.exec(wallet);
  ok("4.1 the wallet's TICKET box is a link whose href is computed, not the literal \"/positions\"",
    !!ticketLink && ticketLink[1].includes("tx.positionId"), ticketLink ? ticketLink[1] : "no ticket <Link> found");

  const round = code("src/app/updown/[roundId]/page.tsx");
  // 🔴 The one that was a guaranteed dead end: an UP & DOWN page linking into the MARKET list.
  ok("4.2 ⭐ the Up & Down result panel no longer links into the long-form list",
    !/<Link\s+href="\/positions"/.test(round), 'href="/positions" is still on the round page');
  // ⚠️ The round page uses the LIST href, not the permalink route: the permalink resolves an
  // Up & Down position back to the round page, so a button captioned "Open in positions" would
  // reload the page the player is already standing on — the same dead end with a better URL.
  ok("4.3 …it uses the shared rule to reach the Up & Down portfolio instead",
    /positionListHref\(\s*"UPDOWN"/.test(round), 'no positionListHref("UPDOWN", …) call on the round page');

  const email = code("src/lib/server/email.ts");
  const ctas = [...email.matchAll(/ctaButton\(\s*("\/positions"|`\/positions`)/g)];
  ok("4.4 ⭐ no email quotes a Reference and then links to a generic list",
    ctas.length === 0, `${ctas.length} ctaButton("/positions") call(s) remain`);

  const notify = code("src/lib/server/notification-service.ts");
  ok("4.5 notifyWin no longer DEFAULTS to the list",
    !/export function notifyWin\([^)]*href\s*=\s*"\/positions"/.test(notify),
    'notifyWin still defaults href to "/positions"');
}

console.log("\n── 5 · the destinations RENDER the anchor, or the fragment lands nowhere ──");
{
  // ⚠️ THIS IS THE CHECK THAT WOULD OTHERWISE LIE. A deep link is only deep if the page
  // renders an element with that id; without it the browser silently stays at the top and
  // the link looks identical to the bug it replaced.
  const market = code("src/app/markets/[id]/page.tsx");
  ok("5.1 ⭐ each position card on the market page carries its own id as an anchor",
    /id=\{p\.id\}/.test(market), "no id={p.id} on the market page position card");
  ok("5.2 …and is offset so a fixed header does not cover the row it scrolled to",
    /scroll-mt/.test(market), "no scroll-mt on the market page");

  const round = code("src/app/updown/[roundId]/page.tsx");
  ok("5.3 ⭐ the round page renders an anchor per position id the viewer holds",
    /id=\{pid\}|id=\{id\}/.test(round) && /myPosition\.ids/.test(round),
    "no per-position anchor on the round page");

  const css = read("src/app/globals.css");
  ok("5.4 a targeted row is VISIBLY marked, so the player can see which one they came for",
    /:target/.test(css), "no :target rule in globals.css");
}

console.log("\n── 6 · the resolver route enforces OWNERSHIP (a permalink is guessable) ──");
{
  const route = code("src/app/positions/[positionId]/page.tsx");
  ok("6.1 it requires a session", /currentSession\(\)/.test(route));
  // ⛔ Assert what the comparison CARRIES, not that a variable is passed (standards §5b.2).
  ok("6.2 ⭐ it compares the position's owner to the viewer",
    /\.userId\s*!==\s*session\.userId|session\.userId\s*!==\s*[\w.]*\.userId/.test(route),
    "no owner comparison in the resolver");
  ok("6.3 it uses the shared rule rather than re-deriving the destination",
    /positionPermalink\(/.test(route));
  ok("6.4 a ticket that is not the viewer's does not say whether it exists",
    /notFound\(\)/.test(route), "the resolver should 404 both cases identically");
}

console.log(`\n${pass} passed, ${fails.length} failed`);
if (fails.length) { for (const f of fails) console.log(`  · ${f}`); process.exit(1); }
