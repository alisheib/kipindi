/**
 * test:chat-owner — THE HELP CHAT SHOWS A CONVERSATION ONLY TO THE SESSION THAT HAD IT (2026-10-16).
 *
 * The defect: the chat kept its history in the tab's sessionStorage and dropped it only on an /auth, /admin or /s page.
 * A plain sign-out lands on `/`, so the previous player's conversation stayed readable by the next person on the tab
 * (found while moving CLAUDE.md's mechanics into docs/FLOWS.md, which had claimed the opposite).
 *
 * The fix: the root layout reads `chatOwnerTag()` on the server (a keyed digest of the signed cookie's session, or
 * "guest"); the chat saves `{ owner, messages }` and shows only history saved under the same owner.
 *
 *   §1 the pure rule (`historyFor`) on real inputs · §2 the wiring, read from the source · §3 plants: each check fails
 *   on the defect it guards.
 *
 *   npm run test:chat-owner
 */
import { readFileSync } from "node:fs";
import { historyFor, historyRecord } from "../src/lib/chat/history.ts";

let failed = 0;
const ok = (m: string) => console.log(`  ok   ${m}`);
const bad = (m: string) => { console.log(`  FAIL ${m}`); failed++; };
const check = (cond: boolean, m: string, detail = "") => (cond ? ok(m) : bad(detail ? `${m} — ${detail}` : m));
const decomment = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
const squash = (s: string) => decomment(s).replace(/\s+/g, " ");

const MSG = [
  { id: "u1", role: "user", kind: "text", lang: "en", text: "how do I withdraw?" },
  { id: "a1", role: "ai", kind: "text", lang: "en", text: "…" },
];

console.log("\n§1 · the rule — a conversation is shown only to its owner");
const saved = historyRecord("abcdabcdabcdabcd", MSG as never, 40);
check(historyFor(saved, "abcdabcdabcdabcd").length === 2, "1.1 · the same session sees its own conversation");
check(historyFor(saved, "guest").length === 0, "1.2 · after sign-out (owner \"guest\") nothing is shown");
check(historyFor(saved, "ponmlkjihgfedcba").length === 0, "1.3 · another session on the same tab sees nothing");
check(historyFor(JSON.stringify(MSG), "guest").length === 0 && historyFor(JSON.stringify(MSG), "abcdabcdabcdabcd").length === 0,
  "1.4 · the old bare-array format (no owner) is shown to nobody");
check(historyFor("{not json", "guest").length === 0 && historyFor(null, "guest").length === 0, "1.5 · unreadable or empty storage shows nothing");
check(JSON.parse(historyRecord("x", Array.from({ length: 50 }, (_, i) => ({ id: `m${i}`, role: "user" })) as never, 40)).messages.length === 40,
  "1.6 · the record keeps only the newest 40 messages");

console.log("\n§2 · the wiring — the server's tag reaches the chat, and the chat saves under it");
const session = squash(readFileSync("src/lib/server/session.ts", "utf8"));
const layout = squash(readFileSync("src/app/layout.tsx", "utf8"));
const overlays = squash(readFileSync("src/components/layout/lazy-overlays.tsx", "utf8"));
const root = squash(readFileSync("src/components/chat/ChatRoot.tsx", "utf8"));
const tagIsKeyed = (s: string) => /export async function chatOwnerTag\(\)[^}]*pepperedLetters\("chat-owner", session\.sessionId, 16\) : "guest"/.test(s);
const layoutPasses = (s: string) => /chatOwnerTag\(\)/.test(s) && /<LazyOverlays [^>]*chatOwner=\{chatOwner\}/.test(s);
const overlaysPass = (s: string) => /<ChatRoot supportEmail=\{supportEmail\} chatOwner=\{chatOwner\} \/>/.test(s);
const rootUsesOwner = (s: string) =>
  /historyFor\(raw, owner\)/.test(s) && /saveHistory\(chat\.owner, chat\.messages\)/.test(s) && /\}, \[chatOwner\]\);/.test(s) &&
  !/JSON\.stringify\(trimmed\)/.test(s);
check(tagIsKeyed(session), "2.1 · `chatOwnerTag()` is a keyed digest of the session (`pepperedLetters`), \"guest\" without one");
check(layoutPasses(layout), "2.2 · the root layout reads the tag on the server and hands it to the overlays");
check(overlaysPass(overlays), "2.3 · the overlays hand it to the chat");
check(rootUsesOwner(root), "2.4 · the chat loads by owner, saves under the messages' own owner, and reloads when the owner changes");

console.log("\n§3 · plants — each check reports its defect");
const ownerBlind = (raw: string | null) => { try { const p = JSON.parse(raw ?? "null"); return Array.isArray(p) ? p : (p?.messages ?? []); } catch { return []; } };
check(ownerBlind(saved).length === 2 && historyFor(saved, "guest").length === 0, "3.1 PLANT · an owner-blind reader would show the conversation after sign-out; the real one does not");
check(!tagIsKeyed(session.replace('pepperedLetters("chat-owner", session.sessionId, 16)', "session.sessionId")), "3.2 PLANT · a tag that is the raw session id is reported");
check(!layoutPasses(layout.replace(" chatOwner={chatOwner}", "")), "3.3 PLANT · a layout that does not pass the tag is reported");
check(!overlaysPass(overlays.replace(" chatOwner={chatOwner}", "")), "3.4 PLANT · overlays that drop the tag are reported");
check(!rootUsesOwner(root.replace("}, [chatOwner]);", "}, []);")), "3.5 PLANT · a chat that loads only on mount (and so keeps the old owner after a sign-in) is reported");
check(!rootUsesOwner(root.replace("saveHistory(chat.owner, chat.messages)", "saveHistory(chatOwner, chat.messages)")), "3.6 PLANT · a chat that saves under the CURRENT owner (moving one player's messages to the next) is reported");

console.log(failed === 0 ? "\nALL PASS — test:chat-owner" : `\n${failed} FAILED — test:chat-owner`);
process.exit(failed === 0 ? 0 : 1);
