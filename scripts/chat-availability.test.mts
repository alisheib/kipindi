/**
 * E-123 — A SURFACE MAY NOT ADVERTISE THE LIVE CHAT UNLESS IT ASKS WHETHER THE
 * LIVE CHAT EXISTS.
 *
 *   npm run test:chat-availability     # the gate
 *   npm run red:chat-availability      # the proof it can fail
 *
 * THE DEFECT. `/help` offered three support channels — phone, email, and
 * *"LIVE CHAT · In-app · Tap the chat bubble"* — unconditionally, while the root
 * layout mounts the whole widget behind `isChatbotEnabled()`. That flag is OFF in
 * production, so there is no chat bubble on any route, and the page a player
 * reaches when they are stuck told them to tap one.
 *
 * Measured on production 2026-08-06, not inferred: `.cm-bubble` count is 0 on
 * `/`, `/help` and `/markets`; the ChatRoot chunk is never fetched; and its
 * NON-gated sibling `FirstVisitPrimer` renders normally on the same load, which
 * is what rules out "the lazy chunk simply had not arrived yet".
 *
 * ⭐ THE RULE IS A COUPLING RULE, NOT A COPY RULE. Deleting the card would have
 * fixed the symptom and left the next surface free to make the same promise. So:
 * any file that renders the live-chat promise must read the same switch that
 * decides whether the widget exists. Then the channel re-advertises itself the
 * day an operator turns the chatbot back on, and nobody has to remember.
 *
 * ⛔ AND THE SWITCH ITSELF IS ASSERTED. A rule that only checks the ADVERTISERS
 * would pass forever if someone removed the gate from `layout.tsx` and mounted
 * the widget unconditionally — at which point the promise would be true again by
 * accident, and this file would be guarding a coupling that no longer exists.
 */
import { readFileSync } from "node:fs";
import { globSync } from "node:fs";

const ROOT = process.env.CHAT_ROOT ?? new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
console.log(`chat-availability: reading ${ROOT}\n`);

/**
 * The dictionary keys that PROMISE an in-app chat. ⛔ `inApp` is deliberately NOT
 * here: it is a generic value string ("In-app") that says nothing on its own, and
 * a gate that fires on it would fail on unrelated copy — a false positive whose
 * remedy is deleting a true statement.
 */
const PROMISE_KEYS = ["help.liveChat", "help.tapChatBubble"];
/** The one server read that decides whether the widget is mounted at all. */
const SWITCH = "isChatbotEnabled";

const FILES = globSync("src/**/*.tsx", { cwd: ROOT }).map((f) => f.replace(/\\/g, "/")).sort();
const decomment = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, " ");

let failed = 0;
const say = (ok: boolean, msg: string) => { console.log(`  ${ok ? "ok  " : "FAIL"} ${msg}`); if (!ok) failed++; };

// ── 1 · every advertiser reads the switch AND branches on the answer ────────
//
// ⚠️ BOTH HALVES OF THIS RULE WERE WRONG ON THEIR FIRST RUN, and the RED harness
// is what said so — twice, against the gate, not against the product:
//
//  · `src.includes("t.help.liveChat")` is a SUBSTRING test, so renaming the key
//    to `t.help.liveChatRenamed` still matched and the "zero coverage" mutation
//    sailed through. The key is token-anchored now: no identifier character may
//    follow it.
//  · `src.includes("isChatbotEnabled")` is satisfied by an IMPORT. Replacing the
//    call with `const chatEnabled = true` left the import in place and the gate
//    passed over the exact defect it was written for. It demands a CALL now —
//    and then follows the variable that call is assigned to, and demands that
//    variable appear in a `&&` guard. Reading a switch and ignoring it is the
//    same bug wearing a better disguise.
const keyRe = (k: string) => new RegExp(`\\bt\\.${k.replace(".", "\\.")}\\b(?![A-Za-z0-9_$])`);
const advertisers: string[] = [];
const unguarded: string[] = [];
for (const rel of FILES) {
  const src = decomment(readFileSync(`${ROOT}/${rel}`, "utf8"));
  if (!PROMISE_KEYS.some((k) => keyRe(k).test(src))) continue;
  advertisers.push(rel);
  // The call, and the name its result is bound to.
  const call = new RegExp(`(?:const|let|var)\\s+([A-Za-z0-9_$]+)\\s*=\\s*(?:await\\s+)?${SWITCH}\\s*\\(`).exec(src);
  if (!call) { unguarded.push(`${rel} — never CALLS ${SWITCH}() (an import is not a read)`); continue; }
  const bound = call[1];
  if (!new RegExp(`\\b${bound}\\b\\s*&&`).test(src)) {
    unguarded.push(`${rel} — calls ${SWITCH}() into \`${bound}\` and never branches on it`);
  }
}
say(unguarded.length === 0, `1.1 ⭐ every surface promising in-app chat CALLS ${SWITCH}() and branches on the answer`);
for (const f of unguarded) console.log(`         ${f}`);

// ⛔ ZERO ADVERTISERS IS A BROKEN GATE, NOT A PASS. If the dictionary keys are
// renamed, rule 1.1 goes green over a page that could then promise anything. This
// is the campaign's named `checks-that-lie` shape: it would still pass if the
// feature it names had been deleted.
say(advertisers.length > 0, `1.2 the promise keys are still in use (${advertisers.length} surface(s)) — a gate over zero files proves nothing`);
for (const f of advertisers) console.log(`         advertiser: ${f}`);

// ── 2 · the widget is still gated on the same switch ────────────────────────
const layout = decomment(readFileSync(`${ROOT}/src/app/layout.tsx`, "utf8"));
say(layout.includes(SWITCH), `2.1 the root layout still reads ${SWITCH}() — the coupling has two ends`);
const overlays = decomment(readFileSync(`${ROOT}/src/components/layout/lazy-overlays.tsx`, "utf8"));
say(
  /\{\s*chatbotEnabled\s*&&\s*<ChatRoot\s*\/>\s*\}/.test(overlays),
  `2.2 <ChatRoot /> is still mounted only when chatbotEnabled`,
);

console.log("");
console.log(failed ? `chat-availability — ${failed} check(s) FAILED\n` : `chat-availability — all checks passed\n`);
process.exit(failed ? 1 : 0);
