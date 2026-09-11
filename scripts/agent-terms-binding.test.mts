/**
 * UNIT 6.3 / 6.4 · THE BINDING AGENT TERMS, AND THE VERSION THAT HAS TO MOVE WITH THEM.
 *
 * 🔴 WHAT THIS CLOSES, AND IT WAS LIVE. `/legal/agent-terms` — the document an applicant is
 * held to, served to every anonymous visitor — told them, in all three locales:
 *
 *     "pay the registration fee of TZS 100,000 to Digital Selcom Bank, account 0769777877,
 *      uploading the receipt"
 *
 * Measured on the deployed page 2026-09-11, not read from a brief. Under the wallet rail that
 * is FALSE, and it is false in the most expensive possible place: a person following the
 * binding document wires 100,000 real shillings to a bank account, and the wizard no longer has
 * a receipt upload to record it with.
 *
 * ⛔ IT ALSO REPUBLISHED THE DESTINATION ACCOUNT THAT PSC-02 WAS RAISED ABOUT. The previous
 * session sealed `/agent` — verified independently: the live `/agent` payload has ZERO
 * occurrences of `0769777877`, the merchant name, or the Lipa number. PSC-02 was real and its
 * fix was real. It was simply fixed on ONE PAGE.
 *
 * ── ⭐ WHY TWO GREEN GUARDS BOTH MISSED IT: A HAND-CHOSEN POPULATION ──────────────────────
 *   · `agent-fee-wallet-path` §4.3 reads `src/app/agent/page.tsx` and ONLY that file. Its
 *     assertion — "/agent hands the destination account ONLY to the withheld QR panel" — is
 *     true, and scoped to one page.
 *   · Its §6 reads the EN `agent:` block of `src/lib/i18n-dict.ts`. The terms copy is INLINE
 *     JSX and has never been in the dictionary, so it is outside that population by
 *     construction.
 * Neither guard is wrong. Both assert a PROXY — "this file", "this dictionary block" — for the
 * property "everywhere this claim can be made", and the proxy drifted the moment a second
 * surface made the same claim. 34/0 green, with a false binding statement in production.
 *
 * ⭐ SO §1 BELOW TAKES A DISCOVERED POPULATION: every rendered page under `src/app`, not a list
 * anybody typed. And it ratchets the DISCOVERY, because a walk that finds nothing passes
 * beautifully and reads as thorough.
 *
 * ── §3: THE VERSION CANNOT LAG THE TEXT AGAIN ────────────────────────────────────────────
 * `agent-terms-version.ts`'s own docblock records that this has already happened once: commit
 * `cc946bbb` rewrote two clauses of the binding EN document and the constant went on reading
 * `2026-09-07`, so an application submitted after that deploy was stamped as having accepted a
 * document that no longer existed. The module is shared by the page and the stamp precisely to
 * make that impossible, and a stale value defeats it just as completely as two constants would.
 *
 * ⛔ A COMMENT SAYING "BUMP THIS WHEN THE TEXT CHANGES" IS NOT A GUARD. §3 pins a content hash
 * of the binding text beside the version, so the text cannot move without the hash moving, and
 * the hash cannot be updated without the editor being in this file looking at the version.
 *
 * ⚠️ WHAT WOULD MAKE §3 VACUOUS, and what is done about it: if the extractor stopped finding
 * the bodies it would hash the empty string — stably, forever, green. §3.0 therefore ratchets
 * the extracted length AND requires an anchor sentence from each of the three locales, so a
 * broken extractor fails loudly instead of silently agreeing with itself.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, relative } from "node:path";
import { createHash } from "node:crypto";
import { decomment } from "./lib/decomment.mts";
import { AGENT_TERMS_VERSION, AGENT_TERMS_TEXT_SHA } from "../src/lib/agent-terms-version.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p: string) => readFileSync(join(root, p), "utf8");

let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, extra?: string) => {
  if (cond) { pass++; } else { fail++; console.log(`FAIL ${label}${extra ? `\n       ${extra}` : ""}`); }
};
const section = (s: string) => console.log(`\n── ${s} ${"─".repeat(Math.max(0, 60 - s.length))}`);

const TERMS = "src/app/legal/agent-terms/page.tsx";

// ═══ §1 · NO RENDERED PAGE PUBLISHES THE BANK DESTINATION ════════════════════════════════
/**
 * ⭐ A DISCOVERED POPULATION. Every `page.tsx` / `*-client.tsx` under `src/app`, walked — not a
 * pair of filenames chosen by whoever last found a defect.
 */
section("§1 · the destination account reaches no rendered page but the withheld QR panel");
{
  const pages: string[] = [];
  const walk = (dir: string) => {
    for (const e of readdirSync(join(root, dir))) {
      const rel = `${dir}/${e}`;
      if (statSync(join(root, rel)).isDirectory()) { walk(rel); continue; }
      if (/\.tsx$/.test(e)) pages.push(rel);
    }
  };
  walk("src/app");

  ok("1.0 ⛔ RATCHET · the walk really found the app tree (a broken walk finds nothing and passes)",
    pages.length >= 80, `found ${pages.length} .tsx files under src/app`);
  ok("1.0b CONTROL · …and it reached the three pages this rule is ABOUT",
    pages.includes(TERMS) && pages.includes("src/app/agent/page.tsx") && pages.includes("src/app/agent/apply/page.tsx"),
    `terms=${pages.includes(TERMS)} agent=${pages.includes("src/app/agent/page.tsx")} apply=${pages.includes("src/app/agent/apply/page.tsx")}`);

  /**
   * ⛔ THE OPERATOR'S OWN CONSOLE IS EXEMPT, AND IT HAS TO BE. `/admin/agents` renders the fee
   * destination because an officer must be able to READ AND EDIT that setting — it is the
   * CONFIG SURFACE for the value, not a claim made to an applicant. Banning it there would
   * demand that correct code be made wrong, which is worse than the defect being chased, and
   * §0.6's "the machinery stays" says so plainly.
   *
   * ⚠️ A PATH EXEMPTION IS THE KIND THAT CAN SWALLOW A POPULATION WHOLE — `src/app/` would
   * exempt everything and leave this section passing over nothing. 1.0c ratchets what survives.
   */
  const applicantFacing = pages.filter((p) => !p.startsWith("src/app/admin/"));
  // ⚠️ THE THRESHOLD IS MEASURED, NOT GUESSED. My first version demanded that half the tree
  // survive the exemption and went red at 154 of 323 — because the STAFF CONSOLE is genuinely
  // more than half of `src/app`. A ratchet set by intuition accuses correct code on its first
  // run; this one is pinned just under the real figure so a future exemption that swallowed
  // the applicant-facing tree still fails loudly.
  ok("1.0c ⛔ RATCHET · exempting /admin left the applicant-facing tree intact",
    applicantFacing.length >= 140,
    `${applicantFacing.length} of ${pages.length} pages remain after the admin exemption`);

  // A line may name the destination ONLY if it is handing it to the withheld QR panel.
  const offenders: string[] = [];
  for (const p of applicantFacing) {
    const src = decomment(read(p));
    for (const line of src.split(/\r?\n/)) {
      if (!/feeDestinationAccount|feeDestinationName/.test(line)) continue;
      // ⭐ THE RULE IS "ONLY BEHIND THE RELEASE GATE", not "only next to the panel". A server
      // component that hands the destination to a client one must name the gate ON THE SAME
      // LINE, so the value cannot cross the boundary while the programme is withdrawn. Same
      // vocabulary `agent-fee-wallet-path` §4.1 already uses, so the two guards state one rule.
      if (/LipaQrPanel|LIPA_QR_RELEASED|lipaQrWouldShow|shouldShowLipaQr/.test(line)) continue;
      offenders.push(`${p} :: ${line.trim().slice(0, 120)}`);
    }
  }
  ok("1.1 🔴 no rendered page interpolates the fee DESTINATION into applicant-facing copy",
    offenders.length === 0, offenders.join("\n       "));

  // ⭐ CONSTRUCT THE DEFECT AND PROVE THE DETECTOR CATCHES IT.
  const SHIPPED = "          <p>…pay the registration fee of <strong>{feeStr}</strong> to {cfg.feeDestinationName}, account {cfg.feeDestinationAccount}, uploading the receipt.</p>";
  ok("1.2 ⭐ CONTROL · the detector still catches the exact line that was live in production",
    /feeDestinationAccount|feeDestinationName/.test(SHIPPED) && !SHIPPED.includes("LipaQrPanel"));
  ok("1.3 ⭐ CONTROL · …and does NOT catch the gated QR call site, which must survive",
    ((l: string) => /feeDestinationAccount/.test(l) && l.includes("LipaQrPanel"))(
      "        <LipaQrPanel lipa={lipaDisplay()} account={cfg.feeDestinationAccount} amountTzs={fee.totalTzs} />"));
}

// ═══ §2 · THE BINDING TEXT IS TRUE ON THE WALLET RAIL, IN ALL THREE LOCALES ═══════════════
/**
 * ⛔ SCOPED, DELIBERATELY. The refund clause — "to the account it was paid from" / "kwenye
 * akaunti iliyolipa" / "至原付款账户" — is source-AGNOSTIC and therefore TRUE on both rails. It
 * is not touched, and this section must not demand that correct copy be changed. An unscoped
 * vocabulary ban would do exactly that, which is worse than the defect it set out to catch.
 */
section("§2 · the fee clause describes the wallet rail in EN, SW and ZH");
{
  const src = decomment(read(TERMS));

  // The out-of-band INSTRUCTION, in each language. These are the claims, not stray words.
  const OUT_OF_BAND: Array<[string, RegExp]> = [
    ["en · uploading the receipt", /uploading the receipt/i],
    ["en · account {…}", /account \{cfg\.feeDestination/],
    ["sw · ukipakia risiti", /ukipakia risiti/],
    ["sw · akaunti {…}", /akaunti \{cfg\.feeDestination/],
    /**
     * ⚠️ THE IMPERATIVE FORM, NOT THE WORDS. A bare `上传收据` ("upload the receipt") matched my
     * own REPLACEMENT copy — `无需上传收据`, "there is no need to upload a receipt" — because the
     * true sentence has to name the thing it is negating. A vocabulary ban that cannot tell an
     * INSTRUCTION from its DENIAL accuses the fix, and an assertion that fires on correct copy
     * gets waved away, taking the next real one with it. `并上传收据` is the instruction.
     */
    ["zh · 并上传收据 (the instruction, not its denial)", /并上传收据/],
    ["zh · 账户 {…}", /账户 \{cfg\.feeDestination/],
  ];
  const live = OUT_OF_BAND.filter(([, re]) => re.test(src));
  ok("2.1 🔴 no locale still instructs the applicant to pay a bank account and upload a receipt",
    live.length === 0, live.map(([n]) => n).join(" | "));

  /**
   * ⭐ THE POSITIVE CONTROLS. 2.1 passing is worth nothing unless the patterns can still catch
   * the sentences that WERE live — and worth less than nothing if they also catch the sentences
   * that replaced them. Both directions, on the real strings.
   */
  const WAS_LIVE = [
    "and pay the registration fee of <strong>{feeStr}</strong> to {cfg.feeDestinationName}, account {cfg.feeDestinationAccount}, uploading the receipt.",
    "na kulipa ada ya usajili ya <strong>{feeStr}</strong> kwa {cfg.feeDestinationName}, akaunti {cfg.feeDestinationAccount}, ukipakia risiti.",
    "并向 {cfg.feeDestinationName}（账户 {cfg.feeDestinationAccount}）支付 <strong>{feeStr}</strong>的注册费并上传收据。",
  ];
  const missed = WAS_LIVE.filter((s) => !OUT_OF_BAND.some(([, re]) => re.test(s)));
  ok("2.1b ⭐ CONTROL · every pattern still catches the exact sentence that was in production",
    missed.length === 0, `not caught: ${missed.join(" || ")}`);

  const NOW_SHIPPED = [
    "and pay the registration fee of <strong>{feeStr}</strong> from your 50pick wallet. Deposit the usual way first if your balance is short — there is no receipt to upload and no reference to type.",
    "na kulipa ada ya usajili ya <strong>{feeStr}</strong> kutoka pochi yako ya 50pick. Weka amana kwa njia ya kawaida kwanza kama salio lako hakitoshi — hakuna risiti ya kupakia wala kumbukumbu ya kuandika.",
    "并从您的 50pick 钱包支付 <strong>{feeStr}</strong>的注册费。余额不足时请先按常规方式充值 — 无需上传收据，也无需填写参考号。",
  ];
  const falseAccusations = NOW_SHIPPED.filter((s) => OUT_OF_BAND.some(([, re]) => re.test(s)));
  ok("2.1c ⭐ CONTROL · …and NONE of them accuses the copy that replaced it — a denial is not an instruction",
    falseAccusations.length === 0, `falsely caught: ${falseAccusations.join(" || ")}`);

  // ⭐ And the replacement must actually SAY the new rail, in each language — deleting the old
  // sentence without stating the new one leaves a binding document that says nothing about how
  // to pay, which is its own defect.
  const WALLET_CLAIM: Array<[string, RegExp]> = [
    ["en", /50pick wallet/i],
    ["sw", /pochi yako ya 50pick/i],
    ["zh", /50pick 钱包/],
  ];
  const silent = WALLET_CLAIM.filter(([, re]) => !re.test(src));
  ok("2.2 ⭐ …and every locale states the wallet rail instead of merely omitting the old one",
    silent.length === 0, `locales that say nothing: ${silent.map(([n]) => n).join(", ")}`);

  ok("2.3 ⛔ the refund clause is UNTOUCHED in all three — it is rail-agnostic and already true",
    /the account it was paid from/i.test(src) && /akaunti iliyolipa/.test(src) && /原付款账户/.test(src),
    "a source-agnostic refund clause was changed; it did not need to be");
}

// ═══ §3 · THE VERSION MOVES WHEN THE BINDING TEXT MOVES ══════════════════════════════════
section("§3 · the version cannot lag the binding text");
{
  const raw = read(TERMS);
  const start = raw.indexOf("const content: Record<Locale, React.ReactNode> = {");
  const end = raw.lastIndexOf("  return (");
  const bodies = start >= 0 && end > start ? raw.slice(start, end) : "";

  // ⛔ THE RATCHET ON THE DISCOVERY ITSELF. An extractor that finds nothing hashes "" — stably,
  // forever, green. These three make that impossible.
  ok("3.0 ⛔ RATCHET · the binding bodies were extracted (a short slice is not a document)",
    bodies.length > 6000, `len=${bodies.length}`);
  ok("3.0b CONTROL · …and the slice really spans all THREE locales",
    /What an agent is, and is not/.test(bodies) && /Wakala ni nani/.test(bodies) && /代理是什么/.test(bodies),
    "an anchor sentence is missing from the slice — the extractor is blind and §3.1 is vacuous");
  ok("3.0c CONTROL · …and it contains the FEE clause, which is the thing most likely to move",
    /registration fee/i.test(bodies), "the fee clause is not inside the extracted region");

  // Whitespace-normalised so a reformat is not a false alarm, but every WORD counts.
  const normalised = bodies.replace(/\s+/g, " ").trim();
  const sha = createHash("sha256").update(normalised, "utf8").digest("hex").slice(0, 12);

  ok("3.1 🔴 the pinned hash matches the binding text — if this fails, BUMP THE VERSION TOO",
    sha === AGENT_TERMS_TEXT_SHA,
    `binding text hashes to ${sha}, agent-terms-version.ts pins ${AGENT_TERMS_TEXT_SHA}\n` +
    `       ⛔ Do NOT just paste the new hash. The text changed, so AGENT_TERMS_VERSION must move\n` +
    `          in the SAME commit — that is the whole point of this assertion.`);

  ok("3.2 ⛔ the version is an ISO date", /^\d{4}-\d{2}-\d{2}$/.test(AGENT_TERMS_VERSION), AGENT_TERMS_VERSION);
  ok("3.3 ⛔ …and it is not the value that was live while the text still described the bank rail",
    AGENT_TERMS_VERSION !== "2026-09-09", AGENT_TERMS_VERSION);

  // ⭐ The hash must actually DISCRIMINATE. If it did not change under an edit, §3.1 is theatre.
  const mutated = createHash("sha256")
    .update(normalised.replace("registration fee", "registration levy"), "utf8")
    .digest("hex").slice(0, 12);
  ok("3.4 ⭐ CONTROL · a one-word change to the binding text produces a DIFFERENT hash",
    mutated !== sha, `both hashed to ${sha}`);
}

// ═══ §4 · THE PAGE AND THE STAMP READ THE SAME CONSTANT ══════════════════════════════════
section("§4 · what a person read and what was recorded cannot diverge");
{
  const page = decomment(read(TERMS));
  const actions = decomment(read("src/app/agent/apply/actions.ts"));
  ok("4.1 ⛔ the page prints AGENT_TERMS_VERSION", /AGENT_TERMS_VERSION/.test(page));
  ok("4.2 ⛔ the submit stamps the SAME constant, not a literal",
    /AGENT_TERMS_VERSION/.test(actions) && !/acceptedTermsVersion:\s*"20\d\d-/.test(actions),
    "submitForReview is being handed a hard-coded date instead of the shared constant");
}

console.log(`\n${fail === 0 ? "ALL PASS" : "FAILURES"} — ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
