/** U43's live choice cards keep floating helpers off money controls. */
const UPDOWN_MONEY_PAGE = /^\/updown(?:\/(?!history(?:\/|$))[^/]+)?\/?$/;
const MARKET_CARD_PAGE = /^\/(?:markets(?:\/[^/]+)?|watchlist|results)\/?$/;

export function suppressNeedleOnU43(path: string | null): boolean {
  return !!path && (path === "/" || MARKET_CARD_PAGE.test(path) || UPDOWN_MONEY_PAGE.test(path));
}

/** The chat bubble uses the same keepout on U43's live choice cards. */
export function suppressChatOnU43(path: string | null): boolean {
  return suppressNeedleOnU43(path);
}
