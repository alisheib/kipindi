/** S10 WP8a: a red plant only counts when a clean visitor tile rejects that exact defect. */
import { strict as assert } from "node:assert";
import { visitorFaceErrors, visitorPageControls } from "./live/visitor-cells.mjs";

const next = "/?bet=mkt_dodoma01.YES.500";
const expected = { min: 500, next, ref: "ABC123" };
const door = path => `${path}?next=${encodeURIComponent(next)}&ref=ABC123`;
const rect = (left, right, top, bottom) => ({ left, right, top, bottom, width: right - left, height: bottom - top });
const facts = {
  guest: true, frame: "edit", sheetCount: 1, balance: false, place: false,
  signUp: door("/auth/register"), signIn: door("/auth/login"), signUpText: "Jisajili uweke dau", signInText: "Ingia",
  stake: "500", viewport: { width: 390, height: 844 }, scrollWidth: 390, sheetOverflow: 0, fontLoaded: true,
  chip: { text: "NDIO", variant: "yes" }, labelClipped: false, tapMin: 44,
  controls: [{ rect: rect(20, 200, 200, 248) }], dialog: rect(0, 390, 0, 844),
  signUpRect: rect(20, 370, 650, 698), signInRect: rect(20, 370, 706, 750),
  tokens: { sp1: 4, sp2: 8, sp3: 12, sp4: 16, sp5: 20, h3: 24, controlLg: 44, controlXl: 48 },
  geometry: { panelTop: 12, panelInline: 20, shellGap: 12, headerGap: 8, scrollGap: 12,
    scrollPad: 4, footerGap: 8, chipsGap: 8, estimatePadding: 16, titleSize: 24,
    titleFont: "Sora", stakeFont: "JetBrains Mono", signUpFont: "Inter" },
};

assert.deepEqual(visitorFaceErrors(facts, expected), [], "the control tile must be clean");
const controls = visitorPageControls(facts, expected);
assert.equal(controls.length, 6);
assert(controls.every(control => control.caught), JSON.stringify(controls));

// Under the old control, ANY baseline error made every unrelated plant appear caught.
const broken = visitorPageControls({ ...facts, balance: true }, expected);
assert(broken.every(control => !control.caught), "a broken baseline cannot certify any red plant");
console.log("visitor cells: clean baseline, six exact red defects, broken baseline refused");
