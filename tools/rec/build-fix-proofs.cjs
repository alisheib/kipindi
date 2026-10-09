// Builds rec/fix-proofs.json for fill-proofs.mjs: each fix commit's {PROOF}, its own proof plus the branch's whole proof.
const fs = require("fs");
const S = "C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad";
const H =
  "The six fixes proved together (turn H, OMEGA-COMPILE01, on main d4358318): typecheck 0; test:all 467/474 with the\n" +
  "database suites, every failure run alone on both trees and main's own - audit-drain and house-bot-designation pass\n" +
  "alone on both, revoked-deadend, admin-section-gate, needle-rest and orphans fail on main too, red-anchors is green\n" +
  "once rebased onto main's S7 WP0 ceiling (ce2c3afa); local qa:live 334/334; qa:journey-shell 1645 passed, 0 failed,\n" +
  "333 tiles (the two Up & Down round tiles BLOCKED: no local price feed), 15.1 (no script error, no hydration warning)\n" +
  "green. Rebased onto main 3b877d02 (S7 WP0's scripts and STEP 53b's constants: no file in common).";
const proofs = {
  "Field: a child handed over in a lazy wrapper": fs.readFileSync(`${S}/hyd/proof-hyd.txt`, "utf8").trim() + "\n" + H,
  "Five things WP12's tiles showed wrong":
    "Proof: test:design-frozen, css-vars-defined, dead-css, gold-is-money, journey-shell, landing-mine, chip-contract,\n" +
    "chat-focus-ring, density-contract (the end-row rules sit below .kp-hub__row, the rule its §4h reads), design-one-door,\n" +
    "betting-ink, contrast, stacking, measure, tokens, keyframes, journey-account and hero-copy green. In the tiles: the\n" +
    "frozen notice in its box (091), the Akaunti tab's ring whole inside its slot (140, 144, 148; §6's new on-screen\n" +
    "check green), the Pochi row's ring round at both top corners (150), the wallet names whole (140).\n" + H,
  "withdraw: the available balance is set as an amount":
    "Proof: test:type-scale's two failures the same as main's before its re-baseline, test:measure, test:gold-is-money,\n" +
    "test:ui-consistency, test:money-format, test:withdraw-email-gate and test:kyc-at-withdrawal green; the tile shows the\n" +
    "figure in the mono face beside the header's (173).\n" + H,
  "qa:journey-shell: a focus ring must be on the screen":
    "Proof: FOCUS_PROBE's own source, run on a static page whose last rail slot touches the screen's right and bottom\n" +
    "edges - a +2px ring reads its box 288.5,712,394,784 in 390x780 and OFF the screen, a -2px ring 292.5,716,390,780 and\n" +
    "ON it, a first slot at +2px off it (-4 on the left): the check can fail, and fails on what the tiles showed; with the\n" +
    "rail's -2px ring every §6 cell passes.\n" + H,
  "Player dates in the reader's own month words":
    "Proof: typecheck 0; test:timer-date 63/63 then (with the second pass) 77/77, its §4 failing with eat-day's guard\n" +
    "taken out (\"THREW Invalid time value\"); red:timer-date 17/17; test:journey-tickets 50/50 and its twin 102/102;\n" +
    "test:sell-grace-truth 49/49 and its twin 155/155; test:time-left, test:i18n, test:trilingual, test:hooks-order,\n" +
    "test:measure, test:client-graph-safe, test:house-bot-rules, test:marketing-consent green; the tiles read\n" +
    "\"Imewekwa 8 Okt, 19:05\" and \"Uchaguzi unafungwa 9 Okt, 17:02\" (211).\n" + H,
  "Player dates, the second pass":
    "Proof: typecheck 0; test:timer-date 77/77 (the fence takes the seven files and the three helpers); red:timer-date\n" +
    "17/17; every suite that reads a changed file green\n" +
    "(agent-application-security, agent-fee-wallet-path, agent-terms-binding, bonus-relock, cashback-hidden, cert-c1,\n" +
    "deposit-ceiling, design-frozen, erasure, failure-reasons, feedback-law, google-tag, journey-shell, kyc-at-withdrawal,\n" +
    "cert-d3, lipa-qr, m1-light, measure, pending-bet, popup-fit, position-permalink, privacy-notice, product-line,\n" +
    "signoff, site-visits, wallet-empty-escape, wallet-freeze, wallet-receipts, withdrawn-features, eyebrow-roles).\n" + H,
};
fs.writeFileSync(`${S}/rec/fix-proofs.json`, JSON.stringify(proofs, null, 1));
console.log(Object.keys(proofs).length, "proofs written");
