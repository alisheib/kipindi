import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SellConfirmModal } from "file:///F:/kipindi-rev/src/components/markets/sell-confirm-modal.tsx";
const html = renderToStaticMarkup(h(SellConfirmModal as never, { open: true, pending: false, stake: 5000, value: 6100, positionId: "pos_x", onConfirm: () => {}, onCancel: () => {} }));
console.log(html.length, html.slice(0, 300));
