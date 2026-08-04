/**
 * Up & Down admin — NOTHING THAT DECIDES WHETHER A PRICE ARRIVES MAY BE TYPED.
 *
 *   npx tsx scripts/updown-admin-options.test.mts   (npm run test:updown-admin-options)
 *
 * ⭐ ALI, 2026-08-04: *"I don't know how knowledgeable my admins are in typing asset names."*
 *
 * Asset, duration, provider and margin are dropdowns rendered from ONE shared list each, every
 * option carries a numbered readiness signal (① ready · ② warning · ③ unusable), and an unusable
 * option is shown **greyed with its reason, never hidden** — *"why isn't gold in the list?"* is a
 * worse question for an operator than seeing gold greyed with the answer beside it.
 *
 * ⛔ THE THREE FAILURES THIS EXISTS TO STOP, each of which has really happened here:
 *
 *  1. **A hand-copied list.** Both admin consoles carried their own `[5, 15, 30]`, so a duration
 *     added server-side was accepted by the action and offerable by no screen (E-62).
 *  2. **A console that disagrees with the server.** If the greying and the refusal come from two
 *     pieces of code they drift, and the drift is discovered by a round that already took stakes.
 *  3. **A typed number that decides what winning IS.** A free margin field let an operator enter
 *     a band that voids every round the chain ever emits — E-32 exactly.
 *
 * ⚠️ §3 asserts against the SOURCE of the console, because the property is structural ("this
 * screen cannot contain its own list"). It strips comments first: a guard that greps for a
 * defect's shape will otherwise match the comment explaining the fix, which has cost this
 * campaign four separate false results.
 */
process.env.SESSION_SECRET ??= "test-only-session-secret-32chars-min-aaaa";

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  SYMBOL_CATALOGUE, symbolReadiness, readinessMark, validateSymbolDuration, findSymbol,
} from "../src/lib/server/updown-symbols.ts";
import { ALLOWED_DURATIONS } from "../src/lib/updown-durations.ts";
import { FEED_PROVIDERS } from "../src/lib/updown-providers.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p: string) => readFileSync(join(ROOT, p), "utf8");
/** ⛔ Comments stripped BEFORE any assertion — see the header. */
// ⚠️ THE STRIPPER HAD A HOLE, and §6 found it immediately. It filtered lines beginning `//`,
// `*` or `/*` — which misses a **JSX** comment, because those begin `{/*`. So every `{/* … */}`
// block in a `.tsx` file was being read as live code, and an assertion that a defect's string is
// absent would match the comment describing the fix. Exactly the false result the header warns
// about, in the tool meant to prevent it.
//
// ⛔ Block comments are now removed as BLOCKS, wherever they start. `//` stays LINE-based on
// purpose: stripping it inline would cut every `https://` URL in the file in half.
const code = (p: string) =>
  read(p)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n").filter((l) => !/^\s*\/\//.test(l)).join("\n");

let pass = 0, fail = 0;
const ok = (l: string, c: boolean, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"} ${l}${x ? ` — ${x}` : ""}`); };

const CONTROLS = "src/app/admin/updown/updown-controls.tsx";
const PAGE = "src/app/admin/updown/page.tsx";
const SELECT = "src/components/ui/select.tsx";

// ═══════════════════════════════════════════════════════════════════════════
// 1 · THE KIT CAN SHOW AN OPTION IT WILL NOT LET YOU PICK
// ═══════════════════════════════════════════════════════════════════════════
{
  const sel = code(SELECT);
  ok("1.1 · the shared Select supports a disabled option", /disabled\?: boolean/.test(read(SELECT)));
  ok("1.2 · …and a reason to render beside it", /hint\?: string/.test(read(SELECT)));
  ok("1.3 · ⭐ a disabled option cannot be clicked", /if \(!o\.disabled\) pick\(o\.value\)/.test(sel));
  // ⛔ `aria-disabled`, not `disabled`: a `disabled` button leaves the accessibility tree, so a
  // screen-reader user would hear neither the option nor its reason — the exact confusion this
  // feature exists to prevent, reproduced for the people who can least afford it.
  ok("1.4 · ⭐ it stays in the accessibility tree — aria-disabled, never the disabled attribute",
     /aria-disabled=\{o\.disabled/.test(sel) && !/\sdisabled=\{o\.disabled\}/.test(sel));
  // ⛔ Keyboard-only dead end: focus landing on something Enter refuses to take. Invisible to
  // any screenshot sweep, because it is only reachable by keyboard.
  ok("1.5 · ⭐ arrow keys SKIP disabled options rather than parking on a dead end",
     /const step = \(from: number, dir: 1 \| -1\)/.test(sel) && /if \(!options\[i\]!\.disabled\) return i;/.test(sel));
  ok("1.6 · Enter refuses a disabled option even if focus reaches it",
     /!options\[focusIdx\]\?\.disabled\) pick/.test(sel));
  ok("1.7 · type-to-search skips them too", /!o\.disabled && o\.label\.toLowerCase\(\)\.startsWith/.test(sel));
  // A reason cut off at the panel edge has not been given.
  ok("1.8 · the reason WRAPS rather than truncating", /whitespace-normal/.test(sel));
}

// ═══════════════════════════════════════════════════════════════════════════
// 2 · ONE SHARED LIST PER CONTROL — never a literal in the component
// ═══════════════════════════════════════════════════════════════════════════
{
  const controls = code(CONTROLS);
  ok("2.1 · durations come from the shared module", /ALLOWED_DURATIONS/.test(controls));
  ok("2.2 · providers come from the shared list", /FEED_PROVIDERS/.test(controls));
  // ⛔ THE E-62 DEFECT, IN ITS ORIGINAL FORM: a hand-copied duration array.
  ok("2.3 · ⭐ no hand-copied duration array survives in the console",
     !/\[\s*3\s*,\s*5\s*,\s*10\s*,\s*15\s*,\s*30\s*,\s*60\s*\]/.test(controls) &&
     !/\[\s*5\s*,\s*15\s*,\s*30\s*\]/.test(controls));
  // ⛔ The readiness must NOT be imported into a "use client" file — that would drag the symbol
  // catalogue and the market calendar into the browser bundle, which is the very reason
  // `updown-durations`/`updown-providers` exist as no-imports modules.
  ok("2.4 · ⭐ the console does NOT import the server-side symbol module",
     !/from "@\/lib\/server\/updown-symbols"/.test(controls));
  ok("2.5 · …it receives the readiness as props, computed on the server",
     /readinessByAsset/.test(controls) && /readinessByAsset/.test(code(PAGE)));
  ok("2.6 · and the page computes it with the SAME function the server gate uses",
     /symbolReadiness\(findSymbol\(/.test(code(PAGE)));
}

// ═══════════════════════════════════════════════════════════════════════════
// 3 · THE MARGIN IS A DROPDOWN, NOT A TYPED PERCENTAGE
// ═══════════════════════════════════════════════════════════════════════════
{
  const controls = code(CONTROLS);
  ok("3.1 · ⭐ the winning band is chosen from a list", /MARGIN_CHOICES/.test(controls));
  ok("3.2 · ⭐ and the add-chain form no longer takes a typed percentage",
     !/<Input name="marginPct"/.test(controls), "a free field let an operator type a band that voids every round");
  ok("3.3 · the default choice is the TICK FLOOR (0 bps)", /useState\("0"\)/.test(controls));
  // ⛔ Each option must state its CONSEQUENCE. "0.02%" tells an operator nothing about whether
  // players get paid; the measured void rate tells them everything.
  ok("3.4 · ⭐ every band option states what it does to the pay rate, not just a percentage",
     /pay a winner/.test(controls) && /refunds/.test(controls));
}

// ═══════════════════════════════════════════════════════════════════════════
// 4 · THE CONSOLE AND THE SERVER CANNOT DISAGREE
// ═══════════════════════════════════════════════════════════════════════════
//
// ⛔ THE POINT OF THE WHOLE PHASE. A dropdown is a courtesy — a stale page, a scripted POST or
// a second tab can still submit anything. What makes this safe is that the greying and the
// refusal are the SAME function, so there is no combination where one allows and the other
// refuses. This walks EVERY symbol × EVERY duration and proves it exhaustively.
{
  let mismatches: string[] = [];
  for (const spec of SYMBOL_CATALOGUE) {
    for (const d of ALLOWED_DURATIONS) {
      const greyed = symbolReadiness(spec, d).level === 3;
      const refused = validateSymbolDuration(spec.symbol, d) !== null;
      if (greyed !== refused) mismatches.push(`${spec.symbol}@${d}m greyed=${greyed} refused=${refused}`);
    }
  }
  ok("4.1 · ⭐ for EVERY symbol × duration, the console greys exactly what the server refuses",
     mismatches.length === 0, mismatches.join(" · "));

  // And the reason shown is the reason given — not a paraphrase.
  const goldReason = symbolReadiness(findSymbol("XAU/USD"), 5).reason;
  ok("4.2 · ⭐ the greyed reason IS the server's refusal, word for word",
     goldReason === validateSymbolDuration("XAU/USD", 5), goldReason.slice(0, 60));

  ok("4.3 · every provider in the shared list is renderable", FEED_PROVIDERS.every((p) => !!p.label && !!p.blurb));
  ok("4.4 · the marks are the three numerals",
     readinessMark(1) === "①" && readinessMark(2) === "②" && readinessMark(3) === "③");
}

// ═══════════════════════════════════════════════════════════════════════════
// 5 · A GREYED OPTION IS SHOWN, NOT HIDDEN
// ═══════════════════════════════════════════════════════════════════════════
{
  const controls = code(CONTROLS);
  // ⛔ `.filter(...)` on the options would HIDE an unusable duration — the outcome this design
  // explicitly rejects. The options are mapped, and disabled ones carry a hint.
  ok("5.1 · ⭐ duration options are MAPPED, not filtered — nothing is hidden",
     /durationOptions = \(readinessByAsset\[assetId\] \?\? \[\]\)\.map/.test(controls));
  ok("5.2 · …and an unusable one carries its reason to the dropdown",
     /disabled: r\.level === 3/.test(controls) && /hint: r\.reason/.test(controls));
  // ⚠️ If the picked asset cannot run the selected duration, the form must move OFF the greyed
  // row — otherwise it sits on an option the server will refuse and the operator has to work
  // out why for themselves.
  ok("5.3 · ⭐ switching asset moves the selection off a now-unusable duration",
     /const firstUsable = durationOptions\.find\(\(o\) => !o\.disabled\)/.test(controls));
}

// ═══════════════════════════════════════════════════════════════════════════
// 6 · A CONTROL MAY NOT PRINT A CONFIGURED NUMBER AS A LITERAL,
//     NOR OFFER A VALUE THE SERVER REFUSES
// ═══════════════════════════════════════════════════════════════════════════
//
// 🔴 BOTH OF THESE WERE LIVE ON THE CONSOLE, in the sentences whose entire job is to stop an
// operator making a mistake:
//
//  · The add-chain help text read `blank inherits the product default (0.5%)` — a hardcoded
//    string, while the live `defaultMarginBps` is **0**, the tick floor. The form told the
//    operator the band was 0.5% when it was **$0.02** on BTC. A 25-fold error.
//  · The chain-EDIT form still took a TYPED percentage while the add form beside it was already
//    a dropdown — one control in two shapes. An operator who could not type a ruinous band into
//    a NEW chain could still type it into an existing one, which is the more dangerous of the
//    two, because that chain already has players on it.
//  · `Min move (ticks)` carried `min="1"` while the server floor is 2, so the form offered a
//    value that is refused on submit.
//
// ⛔ THE PROPERTY IS "NO SECOND SOURCE OF TRUTH IN THE COPY", not any particular wording. A
// figure the operator acts on must come from the value the server resolves with, or the two
// drift and the screen lies with total confidence.
{
  const controls = code(CONTROLS);

  ok("6.1 · ⭐ the add-chain band note derives its figure from `inherited`, never a literal %",
     /inherited === 0 \? "the smallest possible step" : `\$\{\(inherited \/ 100\)\.toFixed\(2\)\}%`/.test(controls),
     controls.match(/product default \([\d.]+%\)/)?.[0] ?? "");
  ok("6.2 · …and no admin copy hardcodes a margin percentage at all",
     !/(default|inherits?)[^.\n]{0,40}\(0\.5%\)/i.test(controls));

  // The edit form must be the SAME shape as the add form — a Select over MARGIN_CHOICES.
  const editsWithSelect = /name="marginPct"\s+value=\{marginPct\}\s+onChange=\{setMarginPct\}/.test(controls)
    && /\.\.\.MARGIN_CHOICES\.map\(\(m\) => \(\{\s*value: \(m\.bps \/ 100\)\.toFixed\(2\)/.test(controls);
  ok("6.3 · ⭐ the chain-EDIT band is the SAME dropdown as the add form, not a typed number",
     editsWithSelect);
  // ⚠️ And it must still be a LIVE control. A Select with a no-op onChange renders, greys
  // nothing, and silently refuses to change — which looks identical to a working dropdown.
  ok("6.4 · …and it is wired to state, so it can actually be changed",
     /const \[marginPct, setMarginPct\] = useState\(/.test(controls));
  ok("6.5 · …and still submits the field `updateChainAction` reads, so the save lands",
     /name="marginPct"/.test(controls) && !/name="marginBpsChoice"[\s\S]{0,200}marginPct/.test(controls));
  // A typed percentage box must not survive anywhere.
  ok("6.6 · ⛔ no free-text margin input remains on any chain form",
     !/<Input[^>]*name="marginPct"/.test(controls));

  ok("6.7 · ⭐ the ticks input floor equals the server floor (2), so it cannot offer a refused value",
     /name="minMoveTicks"[^>]*min="2"/.test(controls),
     controls.match(/name="minMoveTicks"[^>]*min="\d+"/)?.[0] ?? "");
  ok("6.8 · ⛔ and the help text does not argue against the recommended option",
     !/single tick decide real money/.test(controls));

  // ⛔ "0.00%" IS NOT THE BAND. The chains grid printed the PERCENTAGE, and at the tick floor
  // that percentage is zero while the band is the asset's own minimum move — $0.02 on BTC,
  // $0.40 on gold. An operator reading `0.00%` concludes there is no band and that any movement
  // wins. Same defect as the add-chain copy, one table away, and it is the number an operator
  // reads most often.
  const pageSrc = code(PAGE);
  ok("6.9 · ⭐ the chains grid prints the real distance when the percentage rounds to nothing",
     /effectiveMarginBps\(c\) === 0\s*\n?\s*\? `±\$\{\(\(a\?\.minMoveTicks/.test(pageSrc),
     pageSrc.match(/\(effectiveMarginBps\(c\) \/ 100\)\.toFixed\(2\)\}%/) ? "still prints a bare %" : "");
  ok("6.10 · …and says WHICH quantity it is, so ±0.02 is not read as a percentage",
     /·min move/.test(pageSrc));
}

console.log(`\n${fail === 0 ? "✅" : "🔴"} updown-admin-options: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
