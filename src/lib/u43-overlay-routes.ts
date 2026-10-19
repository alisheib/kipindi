/** U43's one-click board and round detail keep floating helpers off money controls. */
const UPDOWN_MONEY_PAGE = /^\/updown(?:\/(?!history(?:\/|$))[^/]+)?\/?$/;

export function suppressNeedleOnU43(path: string | null): boolean {
  return !!path && UPDOWN_MONEY_PAGE.test(path);
}

/** The markets board also has live choice cards that the chat bubble can cover. */
export function suppressChatOnU43(path: string | null): boolean {
  return path === "/markets" || suppressNeedleOnU43(path);
}
