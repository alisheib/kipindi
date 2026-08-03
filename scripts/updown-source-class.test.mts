/**
 * E-53 · THE PLAYER IS TOLD THE KIND OF MARKET, NEVER THE DATA VENDOR.
 *
 *   npm run test:updown-source-class
 *
 * Ali's decision: player surfaces show *Live crypto market* / *Live stock market* /
 * *Live metals market* / *Live currency market*, in EN+SW+ZH, with the outbound link
 * dropped. Admin and the audit chain keep the exact URL.
 *
 * ⛔ THE WHOLE POINT IS THAT IT IS RESOLVED ON THE SERVER. Translating a vendor string in
 * the browser still ships the vendor in the RSC payload, where View Source finds it —
 * that is concealment, not removal. So the assertions below are about the PAYLOAD and the
 * PROP TYPE, not about what happens to render.
 *
 * ⚠️ LONG-FORM MARKETS ARE DELIBERATELY EXCLUDED and this suite protects that too. They
 * cite EWURA, TMA and other public authorities, which must stay named AND linked: that is
 * how a player checks a settlement against the body that published the number. A change
 * that "cleans up" those would be a regression, not an improvement.
 */
import { readFileSync } from "node:fs";
import { publicSourceClassFor } from "../src/lib/server/updown-symbols.ts";
import { SOURCE_CLASS_KEY } from "../src/lib/updown-source-label.ts";
import { dict } from "../src/lib/i18n-dict.ts";

const BOARD = readFileSync(new URL("../src/lib/server/updown-board.ts", import.meta.url), "utf8");
const CARD = readFileSync(new URL("../src/components/updown/updown-card.tsx", import.meta.url), "utf8");
const ROUND = readFileSync(new URL("../src/app/updown/[roundId]/page.tsx", import.meta.url), "utf8");
const BOARD_PAGE = readFileSync(new URL("../src/app/updown/page.tsx", import.meta.url), "utf8");

let pass = 0;
const fails: string[] = [];
const ok = (n: string, c: boolean, d = "") => { if (c) pass++; else fails.push(`${n}${d ? ` — ${d}` : ""}`); };

/**
 * ⚠️ ASSERT AGAINST CODE, NOT PROSE — this suite failed three times on its own comments.
 *
 * The files deliberately EXPLAIN what must not appear ("the half-applied version dropped
 * `openSourceUrl` and kept `closeSourceUrl`", "the board handed it `asset.sourceDomain`"),
 * so a bare `!/sourceDomain/.test(src)` fires on the very sentence documenting the fix.
 * A check that cannot tell code from a comment is the same class of miss as one that
 * cannot tell a symbol from its value (§5b of the standards skill) — and banning the words
 * from the comments would be worse, because it would delete the explanation to satisfy the
 * test. Strip comments, then assert.
 */
const code = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

const BOARD_CODE = code(BOARD);
const CARD_CODE = code(CARD);
const ROUND_CODE = code(ROUND);
const BOARD_PAGE_CODE = code(BOARD_PAGE);

// ── §1 · the classifier answers with a KIND, from real symbols ─────────────────
{
  for (const [symbol, expected] of [
    ["BTC/USD", "crypto"], ["ETH/USD", "crypto"], ["SOL/USD", "crypto"],
    ["XAU/USD", "metals"],
  ] as const) {
    ok(`§1 ${symbol} classifies as ${expected}`,
       publicSourceClassFor({ symbol }) === expected,
       `got ${publicSourceClassFor({ symbol })}`);
  }
  // An uncatalogued legacy row must degrade to something still TRUE, not to a guess.
  ok("§1 an unknown symbol degrades to generic, not to a guessed market kind",
     publicSourceClassFor({ symbol: "ZZZ/QQQ" }) === "generic");
  ok("§1 …unless its category is known", publicSourceClassFor({ symbol: "ZZZ/QQQ", category: "crypto" }) === "crypto");
}

// ── §2 · ⛔ THE VENDOR IS NOT IN THE PAYLOAD ───────────────────────────────────
{
  // The board's exported asset shape and both places that build it.
  ok("§2 ⭐ the board payload carries sourceClass", /sourceClass: PublicSourceClass/.test(BOARD));
  ok("§2 ⭐ …and never sourceDomain", !/sourceDomain/.test(BOARD_CODE),
     "the domain in the payload is the leak — View Source finds it whatever the UI renders");
  ok("§2 both payload builders resolve the class",
     (BOARD_CODE.match(/sourceClass: publicSourceClassFor\(a\)/g) ?? []).length === 2,
     "getBoard and getRoundDetail each build an asset; one cleaned and one not is the E-56 shape");

  // The settlement proof must drop BOTH endpoints. The half-applied version of this change
  // removed `openSourceUrl` and kept `closeSourceUrl`, which reads as done and is not.
  for (const k of ["openSourceUrl", "closeSourceUrl"]) {
    ok(`§2 ⭐ the proof does not send ${k}`, !new RegExp(k).test(BOARD_CODE));
  }
}

// ── §3 · ⭐ THE PROP TYPE MAKES THE OLD BUG UNTYPEABLE ─────────────────────────
{
  ok("§3 ⭐ the card takes a PublicSourceClass, not a name string",
     /sourceClass: PublicSourceClass;/.test(CARD) && !/sourceName/.test(CARD_CODE),
     "`sourceName: string` is what let the board hand it asset.sourceDomain");
  ok("§3 the card resolves the label through the ONE shared map",
     /SOURCE_CLASS_KEY\[sourceClass\]/.test(CARD));
  ok("§3 the board page passes the class", /sourceClass=\{activeAsset!\.sourceClass\}/.test(BOARD_PAGE));
}

// ── §4 · no player surface mentions the vendor, and the proof link is gone ─────
{
  for (const [name, src] of [["round page", ROUND_CODE], ["board page", BOARD_PAGE_CODE], ["card", CARD_CODE]] as const) {
    ok(`§4 ⭐ the ${name} never references sourceDomain`, !/sourceDomain/.test(src));
  }
  // ⛔ The proof panel's outbound <a> is gone. Ali dropped the link deliberately: it was a
  // query URL on our own metered endpoint, which a player cannot read anyway.
  const proofBlock = ROUND.slice(ROUND.indexOf("udSettlementProof"), ROUND.indexOf("udSettlementProof") + 3000);
  ok("§4 ⭐ the settlement proof no longer links out", !/<a\s+href=\{url\}/.test(proofBlock));
}

// ── §5 · all five phrases exist in ALL THREE languages ─────────────────────────
//
// ⚠️ 94% of this platform's templates once shipped with no ZH at all, and a dict key that
// exists in the type but not the dictionary renders raw to the reader who needs it (E-1).
{
  const keys = Object.values(SOURCE_CLASS_KEY);
  ok("§5 the map covers every class", keys.length === 5 && new Set(keys).size === 5);
  for (const locale of ["en", "sw", "zh"] as const) {
    for (const k of keys) {
      const v = (dict as never as Record<string, { market: Record<string, string> }>)[locale]?.market?.[k];
      ok(`§5 ${locale}.${k} exists and is non-empty`, typeof v === "string" && v.trim().length > 0);
    }
  }
  // …and the three languages must actually differ, or one of them is a copy-paste stub.
  for (const k of keys) {
    const d = dict as never as Record<string, { market: Record<string, string> }>;
    ok(`§5 ${k} is genuinely translated, not duplicated English`,
       d.sw.market[k] !== d.en.market[k] && d.zh.market[k] !== d.en.market[k]);
  }
}

// ── §6 · ⛔ LONG-FORM MARKETS STILL NAME AND LINK THEIR AUTHORITY ──────────────
{
  const LONG = readFileSync(new URL("../src/app/markets/[id]/page.tsx", import.meta.url), "utf8");
  ok("§6 ⭐ a long-form market still exposes its own sourceUrl",
     /sourceUrl/.test(LONG),
     "EWURA/TMA must stay named and linked — that is how a player audits a settlement");
}

const label = "E-53 · updown source class";
if (fails.length) {
  console.error(`\n${label} — ${pass} passed, ${fails.length} FAILED\n`);
  for (const f of fails) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log(`${label} — ${pass} passed, 0 failed`);
