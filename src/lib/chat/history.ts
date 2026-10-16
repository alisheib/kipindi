/**
 * The help chat's saved history — WHOSE it is (2026-10-16).
 *
 * The chat keeps the conversation in the tab's sessionStorage so closing and reopening the bubble keeps it. It is saved
 * as `{ owner, messages }`, where `owner` is the tag the root layout reads on the server (`chatOwnerTag()` in
 * `src/lib/server/session.ts`: a keyed digest of the signed-in session, or "guest"). History saved under any other owner
 * — a signed-out player's, another account's, or the old bare-array format — is never shown.
 *
 * ⛔ Why: until this, the chat dropped its history only on an /auth, /admin or /s page, and a plain sign-out lands on
 * `/`, so the previous player's conversation stayed readable by the next person on the same tab.
 *
 * Pure (no browser, no React), so `test:chat-owner` drives it directly; `ChatRoot.tsx` does the storage reads and writes.
 */
import type { Message } from "@/components/chat/types";

export const CHAT_STORAGE_KEY = "50pick-chat-history";

/** The messages saved for `owner`, or none — never another owner's. */
export function historyFor(raw: string | null, owner: string): Message[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as { owner?: unknown; messages?: unknown };
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return [];
    if (parsed.owner !== owner || !Array.isArray(parsed.messages)) return [];
    // Cheap structural validation — if the shape drifted across a deploy, drop the cache rather than render broken markup.
    return (parsed.messages as Message[]).filter(
      (m) => m && typeof m === "object" && "id" in m && "role" in m && (m.role === "user" || m.role === "ai"),
    );
  } catch {
    return [];
  }
}

/** What `ChatRoot` writes: the owner travels with the messages. */
export function historyRecord(owner: string, messages: Message[], limit: number): string {
  return JSON.stringify({ owner, messages: messages.slice(-limit) });
}
