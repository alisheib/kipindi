"use client";

/**
 * ONE OF SEVERAL SERVER-DRAWN NODES, PICKED BY THE PATH BEING SHOWN (2026-10-09, the visual pass round 4, R4-J; E38).
 *
 * The ROOT loading file is drawn once, with the document, and the router keeps that one element: every later move inside
 * the app that reaches a page the browser holds no part of shows it as the page's loading state. So a loading state that
 * belongs to a PAGE cannot be chosen on the server for the root (it would be the first page's for ever after); it is
 * chosen here, from `usePathname()`, which during a move already names the page being moved to, and on the server names
 * the page being drawn. The nodes themselves are drawn on the server and handed in — `routes` keyed by exact path, and
 * `patterns` for a page with a parameter (a question), each an anchored expression's source, `^…$` — so this module is a
 * few lines of browser code and draws nothing of its own.
 * ⛔ Exact paths and whole-path patterns only: a prefix would hand one page's ghost to every page below it.
 */
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

export function RoutePick({
  routes,
  patterns = [],
  other,
}: {
  routes: Readonly<Record<string, ReactNode>>;
  patterns?: ReadonlyArray<readonly [source: string, node: ReactNode]>;
  other: ReactNode;
}) {
  const pathname = usePathname() ?? "";
  if (Object.prototype.hasOwnProperty.call(routes, pathname)) return <>{routes[pathname]}</>;
  const hit = patterns.find(([source]) => new RegExp(source).test(pathname));
  return <>{hit ? hit[1] : other}</>;
}
