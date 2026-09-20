/**
 * §6 · THE D19d CHATBOT GUARD — the cases, kept beside the suite the way every other house family is.
 *
 * ⛔ WHAT D19d ACTUALLY SAYS (`docs/COMPLIANCE-DECISIONS.md`, the `| D19d |` row, read at run time and
 * never quoted here): the chatbot "discloses nothing and may never lie", and a guard keeps eight named
 * phrases "and any naming or confirming of an account out of the system prompt and `faq8a`, in all three
 * locales".
 *
 * ── THE TRUTH THIS GUARD WAS BUILT ON (measured 2026-09-20, re-derived every run) ───────────────────────
 * The platform runs a player-facing chatbot on the real Claude API, so a player can simply ASK it whether
 * 50pick places its own bets. What reaches the model today:
 *   · `system` — `buildSystemPrompt(locale, objectionHours)` and nothing else. No concatenation, no
 *     operator-supplied prompt, no appended context.
 *   · `messages` — the player's own last ten turns plus the sentence they just typed. Nothing server-side
 *     is ever pushed into it.
 *   · TOOLS — none. `client.messages.create` is called with exactly `{model, max_tokens, system, messages}`.
 *     There is no `tools`, no `tool_choice`, no `mcp_servers`, no web search. So there is no tool result,
 *     no retrieval and no report through which a house fact could arrive.
 * ⭐ THEREFORE A DISCLOSURE LEAK IS NOT POSSIBLE TODAY BY ANY ROUTE THE CODE CARRIES: the model is never
 * told that house accounts exist, so it cannot repeat what it was never given. What IS possible, and what
 * this guard exists for, is the operator ARMING A LIE — writing a reassurance into the prompt or into the
 * fairness answer, which the model would then hand to every player who asks. That is the half D19d names,
 * and it is the half a static guard can actually hold.
 *
 * ⛔ WITHOUT TOUCHING `src/app/_actions/chat.ts`. It is byte-identical to `origin/main`,
 * `scripts/rate-copy-red.mjs` targets it, and D19a's subject is that it keeps main's words. Nothing here
 * imports it (it is a `"use server"` module); it is read as SOURCE, and case 6.6 pins the byte identity.
 *
 * ── THE SCOPE IS THE ARTEFACT, NOT A FILE ──────────────────────────────────────────────────────────────
 * D19d names "the system prompt and faq8a". Those are the floor, not the artefact. The artefact is every
 * fixed sentence the 50pick chatbot can put in front of a player, and it is measurably wider:
 *   1 the live system prompt (`buildSystemPrompt`'s template),
 *   2 the live channel's other player-read text — the capacity, empty-reply and trouble fallbacks,
 *   3 the STUB corpus in `src/lib/chat/send-message.ts`. ⚠️ This is not a demo path. `ChatRoot` calls the
 *     live action first and falls through to `sendMessage` whenever it returns `null` — no API key, the
 *     operator kill-switch off, no session, or the burst limiter tripping. In production, a rate-limited
 *     player is answered by this corpus.
 *   4 `faq8a` in every locale (what D19d names), and the chat chrome the widget renders around it.
 * A guard scoped to one file would have said nothing about (3), and the lane has already shipped a house
 * word live because a lexicon guard scanned one folder while the string lived in another.
 *
 * ⛔ AND THE SCAN READS SHIPPED TEXT, NEVER PROSE ABOUT CODE. Measured: esbuild's transform keeps block
 * comments inside a function body, so the stripped `send-message.ts` still contains "Tier 2" and the
 * sentence "A COMMENT THAT DESCRIBES A FIX IS NOT THE FIX". Scanning the stripped file would be scanning
 * documentation — the exact defect this lane has just repaired. Only string and template literals are
 * scanned, and 6.c6 proves the difference in both directions.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";
import { transformSync } from "esbuild";
import { houseHits, HOUSE_ID_SOURCE } from "./house-bot-vocabulary.mjs";
/**
 * ⭐ THE LEXICON IS IMPORTED THROUGH `ROOT` — A TYPE HERE, A VALUE AT RUN TIME — AND THAT IS WHAT PUTS THE
 * CONTROLS THEMSELVES INSIDE THE MUTATION PROOF. A static value import would bind this section to the
 * repository's copy, so a sabotage pass could break the CLAIMS (the prompt, the stub, the dictionary, the
 * ruling) and could never break a CONTROL: 6.c1's plants, 6.c3's allow-list and the subject-scoped
 * "independent" pattern would all be unreachable from a shadow tree, and the only way to show them able to
 * fail would be to edit the real repository — which is the shape this platform has already been burned by
 * (a red harness that mutated the working tree, and two concurrent runs that left a live payout gate
 * DISABLED while the harness printed clean).
 * ⛔ So EVERY input of §6 — the two chatbot modules, the dictionary, the register, the support config AND
 * this section's own lexicon — is read under `ROOT`. `red:house-bot-chatbot` widens the flat "independent"
 * pattern in a SHADOW copy of the lexicon and watches 6.c3 go red; nothing it does touches this tree.
 */
import type * as AssuranceModule from "./house-bot-assurances.mjs";

type Ok = (label: string, cond: boolean, detail?: string) => void;
type Section = (t: string) => void;
type Hit = { label: string; match: string; index: number };

const CHAT_TS = "src/app/_actions/chat.ts";
const STUB_TS = "src/lib/chat/send-message.ts";

/** Comment-free JS for a CODE scan (minify drops every comment; property names survive). */
const decomment = (file: string, code: string) =>
  transformSync(code, { loader: file.endsWith(".tsx") ? "tsx" : "ts", format: "esm", target: "es2022", charset: "utf8", minify: true }).code;
/** Type- and (mostly) comment-stripped JS for a LITERAL scan — `charset: "utf8"` keeps sw/zh as written. */
const strip = (file: string, code: string) =>
  transformSync(code, { loader: file.endsWith(".tsx") ? "tsx" : "ts", format: "esm", target: "es2022", charset: "utf8" }).code;

const show = (hits: Hit[]) => hits.slice(0, 8).map((h) => `${h.label} → "${h.match}"`).join(" · ");

/**
 * 🔴 CODE WITH ITS STRING LITERALS BLANKED — and this function exists because the first draft of 6.5
 * failed without it. A bare `\btools\b` sweep over the comment-free module reported a hit, and the hit was
 * RULE 2 of the system prompt: "Let me direct you to our responsible gambling tools at Profile >
 * Responsible Gambling". A presence scan for CODE that reads string literals is the same defect as one
 * that reads comments, pointed the other way — and RULE 2 is the one line this guard must never pressure
 * anyone into deleting.
 */
function codeOnly(js: string): string {
  let out = "";
  for (let i = 0; i < js.length; i++) {
    const c = js[i];
    if (c === '"' || c === "'" || c === "`") {
      const quote = c;
      i++;
      while (i < js.length && js[i] !== quote) i += js[i] === "\\" ? 2 : 1;
      out += quote + quote;
      continue;
    }
    out += c;
  }
  return out;
}

/** The keys of the FIRST object argument of `<x>.messages.create(...)`, by real brace matching — a regex
 *  stops at the first nested `}` and would silently miss a key that came after one (6.c6 proved it would). */
function createCallKeys(js: string): string[] {
  const at = js.indexOf("messages.create(");
  if (at < 0) return [];
  let i = js.indexOf("{", at);
  if (i < 0) return [];
  const keys: string[] = [];
  let depth = 0;
  for (; i < js.length; i++) {
    const c = js[i];
    if (c === '"' || c === "'" || c === "`") { const q = c; i++; while (i < js.length && js[i] !== q) i += js[i] === "\\" ? 2 : 1; continue; }
    if (c === "{" || c === "[" || c === "(") { depth++; continue; }
    if (c === "}" || c === "]" || c === ")") { depth--; if (depth === 0) break; continue; }
    if (depth === 1) {
      const m = /^([A-Za-z_$][\w$]*)\s*:/.exec(js.slice(i));
      if (m && /[{,]\s*$/.test(js.slice(Math.max(0, i - 40), i))) { keys.push(m[1]); i += m[0].length - 1; }
    }
  }
  return [...new Set(keys)].sort();
}

export async function runChatbotCases(ok: Ok, section: Section, ROOT: string): Promise<void> {
  const read = (p: string) => readFileSync(join(ROOT, p), "utf8");
  const underRoot = async <T,>(p: string): Promise<T> => (await import(pathToFileURL(join(ROOT, p)).href)) as T;

  const {
    D19D_PHRASES,
    D19D_PATTERNS,
    D19D_ACCOUNT_PATTERNS,
    D19D_PLANTS,
    D19D_ALLOWED,
    PROMPT_INTERPOLATIONS,
    assuranceHits,
    chatbotLiterals,
    systemPromptSlice,
    promptInterpolations,
    d19dRow,
    d19dQuotedPhrases,
  } = await underRoot<typeof AssuranceModule>("scripts/lib/house-bot-assurances.mjs");

  // ── the artefact, assembled ──────────────────────────────────────────────────────────────────────
  const chatSrc = read(CHAT_TS);
  const stubSrc = read(STUB_TS);
  const prompt = systemPromptSlice(chatSrc);
  const chatLits = chatbotLiterals(strip("chat.ts", chatSrc));
  const stubLits = chatbotLiterals(strip("send-message.ts", stubSrc));
  const chatOther = chatLits.filter((s) => !prompt.includes(s)).join("\n"); // the fallbacks, not the prompt
  const stubText = stubLits.join("\n");

  /**
   * ⭐ THE DICTIONARY IS IMPORTED THROUGH `ROOT`, NOT THROUGH A MODULE-RELATIVE PATH, AND THAT IS WHAT
   * MAKES THE MUTATION PROOF SAFE. Every input of §6 — the two chatbot modules, the register, the
   * dictionary and the assurance module itself — is read under `ROOT`, so the sabotage pass runs the whole
   * section against a SHADOW TREE in a scratch directory and never writes one byte into the repository.
   * 🔴 The alternative is what this platform has already been burned by: a red harness that mutates the
   * working tree, and two concurrent runs that left a live payout gate DISABLED while the harness printed
   * clean. A section whose reads all go through one root cannot do that.
   */
  const { dict } = await underRoot<{
    dict: Record<string, { help: Record<string, string>; chat: Record<string, string> }>;
  }>("src/lib/i18n-dict.ts");
  const locales = Object.keys(dict);
  const faq8a = Object.fromEntries(locales.map((l) => [l, dict[l]?.help?.faq8a ?? ""]));
  const chrome = Object.fromEntries(locales.map((l) => [l, Object.values(dict[l]?.chat ?? {}).filter((v) => typeof v === "string").join("\n")]));

  const cdRow = d19dRow(read("docs/COMPLIANCE-DECISIONS.md"));
  const quoted = d19dQuotedPhrases(cdRow);

  // ── §6.0 · POPULATION — asserted BEFORE any negative assertion runs ──────────────────────────────
  section("§6 · ⛔ D19d · the chatbot discloses nothing and may never lie — the prompt, the fallbacks, the stub corpus and faq8a");
  const promptOk =
    prompt.length >= 5000 &&
    ["FORMAT", "SCOPE", "WHAT YOU KNOW", "KEY PAGES", "RULES:"].every((h) => prompt.includes(h)) &&
    !/export async function chatWithClaude|recordAiUsage/.test(prompt);
  ok(
    "6.0 · POPULATION · the chatbot artefact was assembled from the tree, not assumed: the prompt slice ends at its own template (not at end-of-file), and every channel is non-empty",
    promptOk &&
      chatLits.length >= 40 && chatLits.join("").length >= 6000 &&
      stubLits.length >= 90 && stubLits.join("").length >= 3000 &&
      locales.length >= 3 &&
      locales.every((l) => (faq8a[l] ?? "").length >= 40) &&
      locales.every((l) => (chrome[l] ?? "").length >= 100),
    `prompt ${prompt.length} chars · chat literals ${chatLits.length}/${chatLits.join("").length} chars · stub literals ${stubLits.length}/${stubLits.join("").length} chars · locales [${locales.join(",")}] · faq8a ${locales.map((l) => `${l}:${(faq8a[l] ?? "").length}`).join(" ")} · chrome ${locales.map((l) => `${l}:${(chrome[l] ?? "").length}`).join(" ")}`,
  );
  ok(
    "6.0b · POPULATION · the lexicon was assembled from the RULING: the D19d row was located by its cell key and the pattern table covers every phrase in every locale",
    cdRow.length >= 200 &&
      quoted.length >= 8 &&
      D19D_ACCOUNT_PATTERNS.length >= 3 &&
      locales.every((l) => D19D_PHRASES.every((p) => D19D_PATTERNS.some((x) => x.locale === l && x.phrase === p))),
    `D19d row ${cdRow.length} chars · ${quoted.length} quoted phrases · ${D19D_PATTERNS.length} locale patterns · ${D19D_ACCOUNT_PATTERNS.length} account patterns · ${D19D_PATTERNS.filter((p) => p.scoped).length} subject-scoped`,
  );

  // ── §6.1 · the list is DERIVED from the ruling, in both directions ───────────────────────────────
  const missingFromList = quoted.filter((q) => !D19D_PHRASES.includes(q));
  const notInRuling = D19D_PHRASES.filter((p) => !quoted.includes(p));
  ok(
    "6.1 · the guarded phrases are the ruling's own: set equality between D19D_PHRASES and the phrases quoted in the D19d row, BOTH directions — amending D19d turns this red rather than leaving the guard silently under-covering",
    missingFromList.length === 0 && notInRuling.length === 0,
    `in the ruling but not guarded: [${missingFromList.join(" | ")}] · guarded but not in the ruling: [${notInRuling.join(" | ")}]`,
  );

  // ── §6.2 · the absence, channel by channel ───────────────────────────────────────────────────────
  const hPrompt = assuranceHits(prompt);
  ok("6.2 · ⛔ no D19d assurance in the LIVE SYSTEM PROMPT, in any locale — 'independent' matched subject-scoped, so the two helpline lines are not swept in", hPrompt.length === 0, `${prompt.length} chars scanned · ${show(hPrompt)}`);
  const hOther = assuranceHits(chatOther);
  ok("6.2b · ⛔ nor in the live channel's other player-read text (the capacity, empty-reply and trouble fallbacks a player is handed verbatim)", hOther.length === 0, `${chatOther.length} chars scanned · ${show(hOther)}`);
  const hStub = assuranceHits(stubText);
  ok("6.2c · ⛔ nor in the STUB corpus — the answers a player gets whenever the live call returns null (no key, kill-switch off, no session, rate-limited), which no guard reached before", hStub.length === 0, `${stubText.length} chars scanned · ${show(hStub)}`);
  const faqHits = locales.flatMap((l) => assuranceHits(faq8a[l] ?? "").map((h) => ({ ...h, label: `${l}:${h.label}` })));
  ok("6.2d · ⛔ nor in faq8a — the fairness answer D19d names — in EVERY locale of Object.keys(dict), so a fourth locale demands copy rather than passing unchecked", faqHits.length === 0, `${locales.map((l) => `${l}:${(faq8a[l] ?? "").length}c`).join(" ")} · ${show(faqHits)}`);
  const chromeHits = locales.flatMap((l) => assuranceHits(chrome[l] ?? "").map((h) => ({ ...h, label: `${l}:${h.label}` })));
  ok("6.2e · ⛔ nor in the chat chrome the widget renders around those answers, in every locale", chromeHits.length === 0, `${locales.map((l) => `${l}:${(chrome[l] ?? "").length}c`).join(" ")} · ${show(chromeHits)}`);

  // ── §6.3 · D19d's ninth, open-ended item ─────────────────────────────────────────────────────────
  const acct = [prompt, chatOther, stubText, ...locales.map((l) => faq8a[l] ?? ""), ...locales.map((l) => chrome[l] ?? "")]
    .flatMap((t) => assuranceHits(t).filter((h) => h.label.startsWith("A")));
  ok("6.3 · ⛔ D19d's ninth item · nothing anywhere in the artefact names an account by identifier or settles an account's nature (the bounded-id family comes from the shared vocabulary module, not a second spelling)", acct.length === 0, `${3 + locales.length * 2} channels scanned · ${show(acct)}`);

  // ── §6.4 · the prompt's interpolation set is CLOSED ──────────────────────────────────────────────
  const interps = promptInterpolations(prompt);
  const pinned = [...PROMPT_INTERPOLATIONS];
  ok(
    "6.4 · the prompt's ${...} set is exactly the pinned closed set — a NEW hole is a new channel for text to enter the system prompt, which is the only door a house fact could come through",
    JSON.stringify(interps) === JSON.stringify(pinned),
    `derived [${interps.join(", ")}] · pinned [${pinned.join(", ")}]`,
  );

  // ── §6.5 · the model is given NO tools, and its messages are the player's own ────────────────────
  const chatDecommented = decomment("chat.ts", chatSrc);
  const chatCode = codeOnly(chatDecommented);
  const createKeys = createCallKeys(chatCode);
  const TOOLISH = ["tools", "tool_choice", "mcp_servers", "web_search", "betas", "container"];
  const toolish = TOOLISH.filter((k) => new RegExp(`\\b${k}\\b`).test(chatCode));
  // ⛔ THE FLOOR IS ON WHAT SURVIVED, NOT ON A ROUND NUMBER. Blanking the string literals takes this module
  // from 11,386 characters to about 1,900 — nearly all of `chat.ts` IS the prompt — so a length floor typed
  // for the un-blanked text fails on a file nobody touched. The floor is that the call site and the config
  // read are both still there after the blanking, which is what a broken `codeOnly` would destroy.
  const codePopulation = chatCode.includes("messages.create(") && /objectionWindowHours/.test(chatCode) && chatCode.length >= 1000;
  ok(
    "6.5 · the live call hands the model NO tools and no retrieval: the create call's keys are exactly {max_tokens, messages, model, system}, and the module's CODE — comments gone and string literals blanked — names no tools / tool_choice / mcp_servers / web_search / betas / container, so no tool result, report or database read can carry a house fact to the model",
    codePopulation &&
      JSON.stringify(createKeys) === JSON.stringify(["max_tokens", "messages", "model", "system"]) &&
      toolish.length === 0,
    `${chatDecommented.length} chars comment-free → ${chatCode.length} chars with literals blanked · call site ${chatCode.includes("messages.create(") ? "found" : "LOST"} · keys [${createKeys.join(", ")}] · tool-ish names found [${toolish.join(", ") || "none"}] of ${TOOLISH.length} swept`,
  );
  const msgShape = /const messages = \[\s*\.\.\.history\.slice\(-10\),\s*\{ role: "user" as const, content: userText \},\s*\];/.test(chatSrc);
  const systemShape = /system: buildSystemPrompt\(locale, \(await getGlobalConfig\(\)\)\.objectionWindowHours\),/.test(chatSrc);
  ok(
    "6.5b · what the model is told is the player's own conversation and nothing else: `messages` is the last ten turns plus the sentence just typed, and `system` is a bare buildSystemPrompt call with no concatenation and no appended context",
    msgShape && systemShape,
    `messages shape ${msgShape ? "pinned" : "MOVED"} · system shape ${systemShape ? "pinned" : "MOVED"}`,
  );

  // ── §6.6 · the guard is provable WITHOUT touching the file that talks to players ─────────────────
  const diff = trunkDiff(ROOT, [CHAT_TS]);
  ok(
    "6.6 · D19a · src/app/_actions/chat.ts is byte-identical to origin/main — the chatbot keeps main's words, and this guard proved it without editing the file or exporting anything from it",
    diff.measured && diff.clean,
    diff.measured ? `clean against origin/main ${diff.sha} · ${diff.files} file(s) compared` : `⛔ NOT MEASURED — ${diff.why}`,
  );

  // ── §6.7 / §6.8 · POSITIVE CONTROLS · what must still be ALLOWED and PRESENT ─────────────────────
  const HELPLINE_LINE = "It is free, it is independent of 50pick, and it is the number to give anyone who asks for help with gambling.";
  const RULE_2 = "must be pointed to the independent national service.";
  ok(
    "6.7 · ⭐ POSITIVE CONTROL · both helpline lines are still PRESENT in the prompt — 6.2 cannot be made green by deleting RULE 2, the at-risk path test:chat-safety exists to protect",
    prompt.includes(HELPLINE_LINE) && prompt.includes(RULE_2),
    `helpline sentence ${prompt.includes(HELPLINE_LINE) ? "present" : "GONE"} · RULE 2 ${prompt.includes(RULE_2) ? "present" : "GONE"}`,
  );
  const SIDE_REFUSAL = "I can explain how a market resolves";
  const RG_REDIRECT = 'kind: "rg_redirect"';
  ok(
    "6.8 · ⭐ POSITIVE CONTROL · the stub's own two protected answers are still PRESENT — the refusal to recommend a side, and the at-risk redirect that runs before any backend is chosen",
    stubText.includes(SIDE_REFUSAL) && stubSrc.includes(RG_REDIRECT),
    `side refusal ${stubText.includes(SIDE_REFUSAL) ? "present" : "GONE"} · rg_redirect ${stubSrc.includes(RG_REDIRECT) ? "present" : "GONE"}`,
  );

  // ── §6.9 · THE ONE LIVE CHANNEL — operator-writable text that reaches the model ──────────────────
  /**
   * ⭐ THIS CASE IS NOT IN THE BUILD PLAN; THE TRUTH-FINDING PRODUCED IT. 6.4 proves the prompt's `${...}`
   * set is CLOSED. It does not ask what those six holes CARRY, and that is the whole live question: the
   * model is never told house accounts exist, so the only way unreviewed text reaches it is through a hole
   * somebody can WRITE INTO.
   *
   * Re-derived from the tree, hole by hole: `objectionHours` and `formatTzs(WITHDRAW_MAX_TZS)` are numbers,
   * `langLine` is derived from the locale, and `HELPLINE()` is a PINNED constant — `src/lib/support-config.ts`
   * says in terms that "no persisted row and no admin form can move it". That leaves exactly TWO holes
   * carrying operator-writable text: `SUPPORT_EMAIL()` and `SUPPORT_PHONE()`, both read per-request from the
   * `support_config` row an officer saves at `/admin/system`.
   *
   * ⛔ SO THE QUESTION A STATIC GUARD CAN ANSWER IS WHETHER A SENTENCE CAN BE STORED IN THAT ROW AT ALL, and
   * for the email and the dial target the answer is no: the shipped validator's own pattern forbids
   * whitespace outright, and a sentence yields no dial target.
   * ⚠️ AND THE HALF IT CANNOT HOLD IS SAID OUT LOUD RATHER THAN ROUNDED UP. `validate` checks
   * `toDialTarget(c.phoneTel || c.phone)` — so when `phoneTel` is saved separately and valid, the `phone`
   * DISPLAY field is free text, and that string IS interpolated into the system prompt. That half is a named
   * row in `plans/house-bots/DEFERRED-TESTS.md`, and 6.9c asserts the row is still there.
   *
   * ⛔ THE VALIDATOR IS EXECUTED, NOT DESCRIBED. Its pattern is sliced out of the module that SHIPS it and
   * run against real plants. This suite must not IMPORT that module (it reaches Prisma), and a guard that
   * found the word "validate" in a docblock and stopped would be prose standing in for enforcement — the
   * exact defect this lane has just repaired three times. ⛔ The wiring scan below therefore runs over code
   * with comments removed AND string literals blanked; measured on this file, the un-stripped source carries
   * the word in prose, and `minify` cannot be used here because it renames the very top-level const
   * (`SUPPORT_CONFIG_SHAPE`) the wiring is asserted on.
   */
  const supportSrc = read("src/lib/server/support-config.ts");
  const supportCode = strip("support-config.ts", supportSrc);
  const supportBlank = codeOnly(supportCode);
  const vSlice = (() => {
    const i = supportCode.indexOf("const validate = (");
    const j = supportCode.indexOf("const SUPPORT_CONFIG_SHAPE", i + 1);
    return i < 0 || j < 0 ? "" : supportCode.slice(i, j);
  })();
  /**
   * ⛔ ANY REGEX LITERAL TESTED AGAINST `email`, NOT ONE ANCHORED WITH `/^`. The mutation pass caught the
   * narrower spelling: `the-email-validator-is-widened` replaces the pattern with `/.+/`, which an extractor
   * looking for `/^` fails to find — so 6.9 went red on a NULL pattern (a blind scanner) instead of on the
   * widened one it was meant to measure. A guard that goes red for the wrong reason teaches nobody anything.
   */
  const emailSource = /(\/(?:[^/\n\\]|\\.)+\/[a-z]*)\.test\(email\)/.exec(vSlice)?.[1] ?? "";
  let emailRe: RegExp | null = null;
  try { emailRe = emailSource ? new RegExp(emailSource.replace(/^\/|\/[a-z]*$/g, "")) : null; } catch { emailRe = null; }
  const support = await underRoot<{
    SUPPORT_DEFAULTS: { email: string; phone: string; phoneTel: string };
    toDialTarget: (s: string) => string;
  }>("src/lib/support-config.ts");
  const shapeCarries = /SUPPORT_CONFIG_SHAPE\s*=\s*\{[^}]*\bvalidate\b/.test(supportBlank);
  const liveSpreads = /defineConfig[\s\S]{0,200}\.\.\.SUPPORT_CONFIG_SHAPE/.test(supportBlank);
  ok(
    "6.9.0 · POPULATION · the validator was taken from the module that SHIPS it and is wired into the LIVE config: the `validate` slice was located in comment-free code, its email pattern compiles, and the one shape object that carries it is spread into the `defineConfig` call the app reads",
    vSlice.length >= 200 && !!emailRe && shapeCarries && liveSpreads && support.SUPPORT_DEFAULTS.email.length > 3 && typeof support.toDialTarget === "function",
    `validate slice ${vSlice.length} chars · pattern ${emailSource || "NOT FOUND"} · shape carries validate ${shapeCarries} · live config spreads the shape ${liveSpreads} · defaults ${support.SUPPORT_DEFAULTS.email}/${support.SUPPORT_DEFAULTS.phoneTel}`,
  );
  {
    const plants = Object.values(D19D_PLANTS as Record<string, string>);
    const storable = emailRe ? plants.filter((s) => emailRe!.test(s.trim())) : plants;
    const dialable = plants.filter((s) => support.toDialTarget(s) !== "");
    ok(
      "6.9 · ⛔ PLANTED CONTROL AND CLAIM IN ONE · the only operator-writable text the system prompt interpolates is the support row, and every D19d assurance offered to the SHIPPED validator — as the email, and as the dial target — is REFUSED, so a sentence cannot be stored in either",
      storable.length === 0 && dialable.length === 0,
      `${plants.length} plants offered to the real validator · storable as an email: [${storable.slice(0, 3).join(" | ") || "none"}] · dialable: [${dialable.slice(0, 3).join(" | ") || "none"}]`,
    );
    ok(
      "6.9b · ⭐ POSITIVE CONTROL · the shipped support defaults are ACCEPTED by that same validator — the refusal above is a shape check, not a validator that refuses everything, and this is the control that separates the two",
      !!emailRe && emailRe.test(support.SUPPORT_DEFAULTS.email) && support.toDialTarget(support.SUPPORT_DEFAULTS.phoneTel) !== "" && support.toDialTarget(support.SUPPORT_DEFAULTS.phone) !== "",
      `${support.SUPPORT_DEFAULTS.email} accepted ${emailRe ? emailRe.test(support.SUPPORT_DEFAULTS.email) : "NO PATTERN"} · dial ${support.toDialTarget(support.SUPPORT_DEFAULTS.phoneTel)} / ${support.toDialTarget(support.SUPPORT_DEFAULTS.phone)}`,
    );
    const deferred = read("plans/house-bots/DEFERRED-TESTS.md");
    ok(
      "6.9c · ⛔ …and the half this CANNOT hold is recorded rather than rounded up: the `phone` DISPLAY field is free text whenever `phoneTel` is saved valid beside it, and that residual is a named row in plans/house-bots/DEFERRED-TESTS.md",
      deferred.includes("SUPPORT_PHONE()") && /D19d/.test(deferred),
      `register ${deferred.length} chars · names SUPPORT_PHONE() ${deferred.includes("SUPPORT_PHONE()")} · names D19d ${/D19d/.test(deferred)}`,
    );
  }

  // ── §6 CONTROLS ──────────────────────────────────────────────────────────────────────────────────
  section("§6c · CONTROLS — every refusal planted into a COPY of the real text, and every real line that must stay allowed");
  /**
   * 🔴 THE POPULATION IS THE RULING'S PHRASES × THE DICTIONARY'S LOCALES — NOT THE PATTERN TABLE — AND THE
   * MUTATION PASS IS WHAT FORCED THAT. The first draft looped over `D19D_PATTERNS.filter(locale)`, which is
   * the very table under test: `red:house-bot-chatbot`'s `the-lexicon-loses-a-locale-pattern` deleted the
   * Chinese entry for "never bets against you" and THIS CASE STAYED GREEN — there was simply one fewer
   * thing to check, and only 6.0b's coverage floor noticed. A control whose population is derived from the
   * thing it is controlling shrinks silently to nothing. Driven from the ruling, a missing pattern is a
   * NAMED miss in this case's own output.
   */
  for (const locale of locales) {
    // ⛔ The host is the REAL text of that locale, not an empty string: a pattern is planted where it would
    // actually be written, so a matcher that only works on a bare sentence is reported.
    const host = locale === "en" ? prompt : (faq8a[locale] ?? "");
    const missed: string[] = [];
    for (const phrase of D19D_PHRASES) {
      const key = `${locale}/${phrase}`;
      const pats = D19D_PATTERNS.filter((x) => x.locale === locale && x.phrase === phrase);
      if (pats.length !== 1) { missed.push(`${key} (${pats.length} PATTERNS DECLARED)`); continue; }
      const plant = (D19D_PLANTS as Record<string, string>)[key];
      if (!plant) { missed.push(`${key} (NO PLANT DECLARED)`); continue; }
      if (!assuranceHits(`${host}\n${plant}`).some((h) => h.label === key)) missed.push(key);
    }
    ok(
      `6.c1.${locale} · PLANTED CONTROL · each of the ruling's ${D19D_PHRASES.length} assurances, written in ${locale} into a COPY of the real ${locale === "en" ? "system prompt" : "faq8a answer"}, is reported — the population is the RULING's phrase list, so a pattern DELETED from the table is a named miss here rather than one fewer loop iteration`,
      missed.length === 0,
      `${D19D_PHRASES.length} phrases × locale ${locale} · missed: [${missed.join(" | ") || "none"}]`,
    );
  }
  {
    const missed = D19D_ACCOUNT_PATTERNS.filter((a) => {
      const plant = (D19D_PLANTS as Record<string, string>)[a.label];
      return !plant || !assuranceHits(`${stubText}\n${plant}`).some((h) => h.label === a.label);
    }).map((a) => a.label);
    ok("6.c2 · PLANTED CONTROL · a bounded house id, a sentence settling an account's nature and a sentence naming an account by identifier, each planted into a COPY of the real stub corpus, are reported", missed.length === 0, `${D19D_ACCOUNT_PATTERNS.length} planted · missed: [${missed.join(" | ") || "none"}]`);
  }
  {
    const fired = D19D_ALLOWED.map((a) => ({ a, hits: assuranceHits(a.text) })).filter((x) => x.hits.length > 0);
    ok(
      "6.c3 · ⭐ POSITIVE CONTROL · every real line that must stay ALLOWED is fed to the same matcher and is NOT reported — the helpline's 'independent of 50pick', RULE 2's independent national service, 'No officer reviews a withdrawal', 'an officer seals the outcome', the side refusal, the real faq8a and the prompt's own account sentences",
      fired.length === 0,
      `${D19D_ALLOWED.length} allowed lines · swept in: ${fired.map((x) => `${x.hits[0].label} on "${x.a.text.slice(0, 40)}…" (${x.a.why})`).join(" · ") || "none"}`,
    );
  }
  {
    // 6.c4 · the scan reads SHIPPED TEXT, not prose about code — in both directions.
    const inComment = chatSrc.replace("function buildSystemPrompt", "// 50pick never bets against you\nfunction buildSystemPrompt");
    const inString = chatSrc.replace("RULES:", "RULES:\\n- 50pick never bets against you.");
    const commentHits = assuranceHits(chatbotLiterals(strip("chat.ts", inComment)).join("\n"));
    const stringHits = assuranceHits(chatbotLiterals(strip("chat.ts", inString)).join("\n"));
    ok(
      "6.c4 · CONTROL · the same assurance planted into a COMMENT of the real file is NOT reported, while planted into the real PROMPT TEXT it IS — documentation standing in for enforcement is the defect this lane just repaired, and esbuild demonstrably keeps block comments inside a function body",
      commentHits.length === 0 && stringHits.length > 0,
      `comment: ${commentHits.length} hit(s) · prompt text: ${stringHits.length} hit(s)`,
    );
  }
  {
    // 6.c5 · a NEW interpolation is a new channel for text.
    const holed = prompt.replace("RULES:", "RULES:\n${operatorNote}");
    const derived = promptInterpolations(holed);
    ok("6.c5 · CONTROL · a ${operatorNote} added to a COPY of the prompt slice is reported by 6.4's own measure — the closed set is what refuses a new channel rather than trying to police the existing ones", JSON.stringify(derived) !== JSON.stringify([...PROMPT_INTERPOLATIONS]) && derived.includes("operatorNote"), `derived [${derived.join(", ")}]`);
  }
  {
    // 6.c6 · a tools array added to a COPY of the module is reported by 6.5's own measure.
    const withTools = chatSrc.replace("max_tokens: 350,", 'max_tokens: 350,\n      tools: [{ name: "ledger_read", description: "read the ledger", input_schema: { type: "object" } }],');
    const code = codeOnly(decomment("chat.ts", withTools));
    const keys = createCallKeys(code);
    ok(
      "6.c6 · PLANTED CONTROL · a tools array added to a COPY of the live call is reported by 6.5's own key-set measure and by its name sweep — and the key set survives the nested object the tool schema brings, which a regex stopping at the first `}` would have missed",
      keys.includes("tools") && keys.includes("messages") && keys.includes("system") && /\btools\b/.test(code),
      `keys [${keys.join(", ")}]`,
    );
    // ⭐ THE POSITIVE CONTROL BESIDE IT, AND IT IS THE DEFECT THIS CASE WAS BORN FROM. RULE 2 of the real
    // prompt says "our responsible gambling tools at Profile > Responsible Gambling". A `tools` sweep over
    // code that still carries its strings reports that line — and the cheapest way to green such a guard is
    // to reword RULE 2, the one line `test:chat-safety` exists to protect.
    const naive = decomment("chat.ts", chatSrc);
    ok(
      "6.c6b · ⭐ POSITIVE CONTROL · RULE 2's own words — 'our responsible gambling tools' — trip a naive sweep over comment-free code and do NOT trip 6.5's, which blanks string literals first; and RULE 2 is asserted STILL PRESENT so the guard cannot be greened by rewording it",
      /\btools\b/.test(naive) && !/\btools\b/.test(chatCode) && prompt.includes("responsible gambling tools") && prompt.includes(RULE_2),
      `naive sweep hits ${(naive.match(/\btools\b/g) ?? []).length} · code-only sweep hits ${(chatCode.match(/\btools\b/g) ?? []).length}`,
    );
  }
  {
    // 6.c7 · the derivation of the phrase list can fail, in both directions.
    const short = D19D_PHRASES.slice(1);
    const extra = [...D19D_PHRASES, "we hold no position"];
    ok(
      "6.c7 · CONTROL · a phrase DELETED from a copy of the guarded list is reported, and a ninth phrase INVENTED in a copy but absent from the ruling is reported too — 6.1 is a set equality, not a substring search",
      quoted.some((q) => !short.includes(q)) && extra.some((p) => !quoted.includes(p)),
      `deleted-copy gap ${quoted.filter((q) => !short.includes(q)).length} · invented-copy gap ${extra.filter((p) => !quoted.includes(p)).length}`,
    );
  }
  {
    // 6.c8 · every reader floor can fail — an empty extractor must not print green.
    const emptySlice = systemPromptSlice("export function nothing() { return 1; }");
    const emptyLits = chatbotLiterals("const a = 1;");
    const emptyRow = d19dRow("| D1 | something else |");
    ok(
      "6.c8 · CONTROL · POPULATION FLOORS CAN FAIL · a file with no prompt yields a zero-length slice, a file with no literals yields an empty corpus, and a register without the row yields an empty row — each fails 6.0/6.0b's floor rather than passing an empty loop (a blind scanner is green exactly like a clean codebase)",
      emptySlice.length === 0 && emptyLits.length === 0 && emptyRow.length === 0 && assuranceHits(emptySlice).length === 0,
      `slice ${emptySlice.length} · literals ${emptyLits.length} · row ${emptyRow.length}`,
    );
  }
  {
    // 6.c9 · the PRESENCE assertions can fail (6.7/6.8 are not vacuous).
    const stripped = prompt.replace(HELPLINE_LINE, "").replace(RULE_2, "");
    ok("6.c9 · CONTROL · 6.7's presence check run against a COPY with the helpline sentence and RULE 2 removed reports them GONE — a positive control that could not fail would be worth nothing", !stripped.includes(HELPLINE_LINE) && !stripped.includes(RULE_2) && prompt.includes(HELPLINE_LINE), `copy ${stripped.length} chars · original ${prompt.length} chars`);
  }
  {
    // 6.c10 · the byte-identity measure separates a clean tree from a blind one.
    const blind = trunkDiff(ROOT, ["src/app/_actions/does-not-exist.ts"]);
    ok("6.c10 · CONTROL · the same diff measure, pointed at a path that resolves to zero files on origin/main, reports NOT MEASURED rather than green — the shape that separates a clean tree from a blind one", !blind.measured && blind.files === 0, `${blind.why}`);
  }
  {
    // 6.c11 · ruling 175 single-source: this lane's new module declares no house word of its own.
    const mod = readFileSync(join(ROOT, "scripts/lib/house-bot-assurances.mjs"), "utf8");
    const code = mod.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    /**
     * ⛔ THE THREE ALLOWED HITS ARE DERIVED, NOT LISTED. A hand-written allowlist here would be the very
     * thing 0.175 exists to refuse. What may appear is exactly: the imported IDENTIFIER, whatever the
     * shared module's own PATH spells (`house-bot`), and a bounded id — and a bounded id may appear only
     * because the id family itself matches it, which is the single-source property being asserted.
     */
    const importSpelling = houseHits('from "./house-bot-vocabulary.mjs"');
    const idOnly = new RegExp(`^(?:${HOUSE_ID_SOURCE})$`, "i");
    const allowed = (w: string) => w === "HOUSE_ID_SOURCE" || importSpelling.includes(w) || idOnly.test(w);
    const hits = houseHits(code);
    const own = hits.filter((w) => !allowed(w));
    ok(
      "6.c11 · ruling 175 · the assurance module names no house word of its own: it IMPORTS the bounded-id family from scripts/lib/house-bot-vocabulary.mjs, and every vocabulary hit in its code is either that imported identifier, the shared module's own path, or a bounded id the imported family itself matches — an assurance list is a different KIND from a house lexicon, and re-spelling one inside the other is what 0.175 refuses",
      own.length === 0 && hits.length > 0 && /from "\.\/house-bot-vocabulary\.mjs"/.test(mod),
      `${hits.length} vocabulary hit(s) in ${code.length} chars of code · allowed by derivation: [${hits.filter(allowed).join(", ")}] · own word list: [${own.join(", ") || "none"}]`,
    );
  }
}

/**
 * `git diff --quiet <ref> -- <paths>` against a path that does not exist on the ref exits 0 — CLEAN, and
 * completely blind. So the measure is two-part: the ref must resolve AND every path must be a real blob on
 * it, or the case is NOT MEASURED and says so. 6.c10 is the control on exactly this.
 */
function trunkDiff(ROOT: string, paths: string[]): { measured: boolean; clean: boolean; files: number; sha: string; why: string } {
  const git = (args: string[]) => execFileSync("git", ["-C", ROOT, ...args], { encoding: "utf8" }).trim();
  let sha = "";
  try { sha = git(["rev-parse", "--short", "origin/main"]); } catch { return { measured: false, clean: false, files: 0, sha: "", why: "origin/main does not resolve in this worktree" }; }
  let listed: string[] = [];
  try { listed = git(["ls-tree", "-r", "--name-only", "origin/main", "--", ...paths]).split("\n").filter(Boolean); } catch { /* falls through to the zero-file refusal */ }
  if (listed.length !== paths.length) return { measured: false, clean: false, files: listed.length, sha, why: `${listed.length} of ${paths.length} path(s) exist on origin/main ${sha} — nothing was compared` };
  try { git(["diff", "--quiet", "origin/main", "--", ...paths]); return { measured: true, clean: true, files: listed.length, sha, why: "" }; }
  catch { return { measured: true, clean: false, files: listed.length, sha, why: "differs from origin/main" }; }
}
