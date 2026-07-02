"use client";

/**
 * EventStreamProvider — invisible wrapper that mounts the SSE hook.
 * Rendered inside AppShell (after NotifyPoller) when a session exists.
 * SSE supplements polling — it does NOT replace NotifyPoller.
 */
import { useEventStream } from "@/lib/use-event-stream";

export function EventStreamProvider() {
  useEventStream();
  return null;
}
