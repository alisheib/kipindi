const { edit } = require('./ed1.cjs');
edit('src/components/layout/wallet-sheet.tsx', [
  [`              <span id={depVia} className="kp-wsheet__via">{t.wallet.mobileMoney}</span>`,
   `              {/* ⭐ The journey's captions keep their last two words together (round 4 of the visual pass, 2026-10-09,
                  edges tile 496): at en 320 "Mobile money or card" (134px) wraps in its 133px column, and left "card"
                  alone; now "Mobile money" / "or card". The pair is at most 60px, a column is 133 at 320. ⛔ The classic
                  capsule's Wallet keeps today's text (frozen chrome for S6/S7). */}
              <span id={depVia} className="kp-wsheet__via">{journey ? keepLastWords(t.wallet.mobileMoney) : t.wallet.mobileMoney}</span>`],
  [`            <span id={wdVia} className="kp-wsheet__via">{t.wallet.mobileMoneyOnly}</span>`,
   `            <span id={wdVia} className="kp-wsheet__via">{journey ? keepLastWords(t.wallet.mobileMoneyOnly) : t.wallet.mobileMoneyOnly}</span>`],
]);
