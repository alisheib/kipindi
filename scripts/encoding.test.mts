/**
 * EVERY TRACKED TEXT FILE IS VALID UTF-8, AND NONE OF THEM IS EMPTY.
 *
 *   npm run test:encoding
 *
 * ── WHY THIS EXISTS, AND IT IS NOT HYPOTHETICAL ──────────────────────────────
 *
 * Two file-corruption incidents on 2026-08-22, both from ad-hoc Python edits, both of which
 * every other gate in this repo was blind to:
 *
 *  · `E-181` — a read-modify-write opened `docs/LIVE-QA-CAMPAIGN.md` with `'w'` (which
 *    truncates immediately) and then threw before writing a byte. **1.3 MB → 0.**
 *  · The encoding one — a Python string containing `🔴` is TWO LONE SURROGATES,
 *    not 🔴, and `errors="surrogatepass"` happily wrote them as CESU-8. `tsc` passed, every
 *    suite passed, and the **production build failed**: *"invalid utf-8 sequence of 1 bytes
 *    from index 7443"*. The only thing that caught it was Railway, after the push.
 *
 * ⭐ THE POINT IS THE BLIND SPOT, NOT THE TOOL. A file can be syntactically perfect to
 * TypeScript and still be bytes the bundler refuses. Nothing here reads a file as *bytes*
 * until the build does, and the build is the slowest, latest, most expensive place to find out.
 *
 * ⛔ CONTAINS ITS OWN POSITIVE CONTROL. A scanner that silently matches nothing passes
 * exactly like a clean tree — the disease this repo keeps re-finding. §3 writes a file that
 * IS invalid and requires the detector to say so.
 */
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, rmSync, mkdirSync, statSync } from "node:fs";

let pass = 0;
const fails: string[] = [];
const ok = (label: string, cond: boolean, extra = "") => {
  if (cond) { pass++; } else { fails.push(`${label}${extra ? ` — ${extra}` : ""}`); }
  return cond;
};

/**
 * Is this buffer valid UTF-8?
 *
 * ⛔ NOT `buf.toString("utf8")` AND COMPARE — Node replaces bad bytes with U+FFFD rather than
 * throwing, so a naive round-trip "succeeds" on exactly the input this exists to reject.
 * `TextDecoder` with `fatal: true` is the one that actually refuses.
 */
function isValidUtf8(buf: Buffer): boolean {
  try { new TextDecoder("utf-8", { fatal: true }).decode(buf); return true; }
  catch { return false; }
}

/** Binary by extension — these are not text and are never expected to decode. */
const BINARY = /\.(png|jpe?g|gif|webp|avif|ico|pdf|ttf|otf|woff2?|eot|zip|gz|mp4|webm|wasm|xlsx?|docx?)$/i;

const files = execSync("git ls-files", { cwd: process.cwd(), encoding: "utf8", maxBuffer: 32 * 1024 * 1024 })
  .split("\n").map((s) => s.trim()).filter(Boolean).filter((f) => !BINARY.test(f));

console.log(`\n── 1 · every tracked text file decodes as UTF-8 (${files.length} files) ──`);
{
  const bad: string[] = [];
  for (const f of files) {
    let buf: Buffer;
    try { buf = readFileSync(f); } catch { continue; } // a submodule / missing path is not this gate's business
    if (!isValidUtf8(buf)) bad.push(f);
  }
  ok("1.1 ⭐ no tracked text file contains invalid UTF-8", bad.length === 0, bad.join(" · "));
}

console.log("── 2 · no tracked text file is empty ──");
{
  // 🔴 E-181's shape. A 0-byte file is what a truncating open leaves behind when the write
  // throws, and git will happily carry it.
  const empty: string[] = [];
  for (const f of files) {
    try { if (statSync(f).size === 0) empty.push(f); } catch { /* ignore */ }
  }
  // ⚠️ Some repos legitimately track empty files (a `.gitkeep`). None here do; if that ever
  // changes, name the exception rather than deleting the check.
  ok("2.1 ⭐ no tracked text file is 0 bytes", empty.length === 0, empty.join(" · "));
}

console.log("── 3 · the controls — a detector that cannot fire is not a detector ──");
{
  const dir = ".qa-artifacts/_encoding-control";
  mkdirSync(dir, { recursive: true });
  const badFile = `${dir}/invalid.txt`;
  const emptyFile = `${dir}/empty.txt`;
  try {
    // The exact byte sequence the incident produced: a lone high surrogate as CESU-8.
    writeFileSync(badFile, Buffer.from([0x68, 0x69, 0xED, 0xA0, 0xBD, 0x0A]));
    writeFileSync(emptyFile, Buffer.alloc(0));

    ok("3.1 ⭐ the UTF-8 detector REJECTS a real CESU-8 surrogate", !isValidUtf8(readFileSync(badFile)));
    ok("3.2 …and ACCEPTS ordinary text with real emoji", isValidUtf8(Buffer.from("hi 🔴 ✅ 涨跌\n", "utf8")));
    ok("3.3 ⭐ the empty detector sees a 0-byte file", statSync(emptyFile).size === 0);
    // ⛔ And the scan actually looked at something: a file list of zero would pass §1 and §2
    // over nothing at all, which is precisely the vacuity this section exists to refuse.
    ok("3.4 ⭐ the scan had a real corpus", files.length > 500, `${files.length} files`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const label = "encoding — bytes, not just syntax";
if (fails.length) {
  console.error(`\n${label} — ${pass} passed, ${fails.length} FAILED\n`);
  for (const f of fails) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log(`\n${label} — ${pass} passed, 0 failed`);
