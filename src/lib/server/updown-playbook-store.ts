/**
 * THE PLAYBOOK'S PERSISTENCE — and the reason it is NOT a new Prisma table.
 *
 * ⛔ A NEW MODEL WOULD HAVE MEANT A MIGRATION, AND A MIGRATION IS THE ONE DEPLOY HAZARD THIS
 * PLATFORM HAS WRITTEN DOWN IN CAPITALS. `.claude/skills/railway/SKILL.md`: the start command is
 * `prisma migrate deploy && … && next start`, so a migration that fails means the container never
 * boots and the live money site is DOWN. Everything the playbook stores is a small JSON document
 * keyed by symbol, which is exactly what `SystemConfig` already holds for bonus config, privacy,
 * market config and AI credits. Using it costs one row per asset, needs no schema change, no
 * migration, and therefore cannot take the site down. If profiles ever grow into something that
 * wants indexing or history, promote them then — with a table whose migration is pre-applied.
 *
 * ⚠️ `loadConfig`/`saveConfig` no-op without a DATABASE_URL and never throw, which is the
 * behaviour this module needs: on a dev box with no database the playbook simply has no profiles,
 * every asset reads "nobody has measured this", and that is the correct answer rather than a crash.
 */
import { loadConfig, saveConfig } from "./config-store";
import {
  DEFAULT_POLICY, resolvePolicy, buildPlaybook, judgeAsset, judgeChoice,
  type AssetProfile, type PlaybookPolicy, type Playbook, type PlaybookVerdict,
} from "@/lib/updown-playbook";
import { ALLOWED_DURATIONS } from "@/lib/updown-durations";
import type { PlaybookAdvice } from "./updown-symbols";

/** One row holds the tunable policy. Absent row = code defaults, the `DEFAULT_GRANTS` pattern. */
export const POLICY_KEY = "updown.playbook.policy";
/** One row per symbol. Keyed by the PROVIDER symbol (`XAU/USD`), never the asset key. */
export const profileKey = (symbol: string) => `updown.playbook.profile.${symbol}`;

/** The stored index of which symbols have a profile, so the console can list them in one read. */
export const INDEX_KEY = "updown.playbook.index";

export async function loadPolicy(): Promise<PlaybookPolicy> {
  return resolvePolicy(await loadConfig<unknown>(POLICY_KEY));
}

export async function savePolicy(patch: unknown): Promise<PlaybookPolicy> {
  const merged = resolvePolicy({ ...(await loadConfig<object>(POLICY_KEY)), ...(patch as object) });
  await saveConfig(POLICY_KEY, merged);
  return merged;
}

export async function loadProfile(symbol: string): Promise<AssetProfile | undefined> {
  return (await loadConfig<AssetProfile>(profileKey(symbol))) ?? undefined;
}

export async function saveProfile(p: AssetProfile): Promise<void> {
  await saveConfig(profileKey(p.symbol), p);
  const idx = new Set((await loadConfig<string[]>(INDEX_KEY)) ?? []);
  idx.add(p.symbol);
  await saveConfig(INDEX_KEY, [...idx].sort());
}

export async function listProfiledSymbols(): Promise<string[]> {
  return (await loadConfig<string[]>(INDEX_KEY)) ?? [];
}

/**
 * ⛔ ONE LOAD, THEN A PURE FUNCTION — the same shape as `feedAdviceLookup`, and for the same
 * reason: the console asks this question once per asset plus once per allowed duration, and a
 * round trip per question would be an N+1. The closure it returns is synchronous and pure, which
 * is what keeps `symbolReadiness` a pure function the form and the server gate can both call.
 */
export async function playbookLookup(nowMs = Date.now()): Promise<{
  policy: PlaybookPolicy;
  /** The whole picture for one asset — minimum length, dead hours, what is recommended. */
  book: (symbol: string, catalogueMin?: number | null) => Playbook;
  /** The verdict on the INSTRUMENT, independent of any round length. */
  asset: (symbol: string) => PlaybookVerdict | undefined;
  /** The verdict on one asset at one length. Undefined when no profile exists at all. */
  choice: (symbol: string, durationMinutes?: number, catalogueMin?: number | null) => PlaybookVerdict | undefined;
  profile: (symbol: string) => AssetProfile | undefined;
  measured: string[];
}> {
  const symbols = await listProfiledSymbols();
  const entries = await Promise.all(symbols.map(async (s) => [s, await loadProfile(s)] as const));
  const bySymbol = new Map(entries.filter(([, p]) => !!p) as Array<[string, AssetProfile]>);
  const policy = await loadPolicy();
  const books = new Map<string, Playbook>();
  const book = (symbol: string, catalogueMin: number | null = null) => {
    const cacheKey = `${symbol}|${catalogueMin}`;
    let b = books.get(cacheKey);
    if (!b) {
      b = buildPlaybook(symbol, bySymbol.get(symbol), policy, ALLOWED_DURATIONS, catalogueMin, nowMs);
      books.set(cacheKey, b);
    }
    return b;
  };
  return {
    policy,
    book,
    profile: (symbol) => bySymbol.get(symbol),
    measured: [...bySymbol.keys()],
    // ⚠️ Undefined, not a level-1, when nothing is on file. `symbolReadiness` treats an absent
    // advice source as "nobody measured" and an explicit ① as "measured and fine" — handing back
    // a cheerful ① for an asset we have never looked at would be the exact lie this module exists
    // to stop telling.
    asset: (symbol) => (bySymbol.has(symbol) ? judgeAsset(bySymbol.get(symbol), policy, nowMs) : undefined),
    choice: (symbol, durationMinutes, catalogueMin = null) => {
      if (!bySymbol.has(symbol) || durationMinutes == null) return undefined;
      return judgeChoice(book(symbol, catalogueMin), bySymbol.get(symbol), policy, durationMinutes);
    },
  };
}

/**
 * ⭐ THE DEAD HOURS FOR ONE ASSET, for the calendar gate on the OPEN path.
 *
 * ⛔ OPEN ONLY — NEVER THE SETTLE PATH, and the difference is money. `generateRoundNow` and
 * `advanceChain` are deciding whether to CREATE a round, and declining costs nothing: no round
 * means no stake. `readPrice` is settling one that already exists and already holds player money,
 * and refusing there would turn a live round into a refund — the exact harm this gate is for.
 * A round that opened must settle on its real boundary, whatever the tape did afterwards.
 *
 * Returns [] on anything unexpected, so a missing profile or an unreachable config store can
 * never stop a round opening. This gate may only ever REFUSE MORE; it must not become a
 * dependency the open path can fail on.
 */
export async function deadHoursFor(symbol: string): Promise<number[]> {
  try {
    const p = await loadProfile(symbol);
    if (!p) return [];
    return buildPlaybook(symbol, p, await loadPolicy(), ALLOWED_DURATIONS, null, Date.now()).deadHoursUtc;
  } catch {
    return [];
  }
}

/** The verdict for ONE asset at ONE length — for the server gate, which handles one write. */
export async function playbookVerdictFor(
  symbol: string, durationMinutes: number, catalogueMin: number | null = null,
): Promise<PlaybookVerdict | undefined> {
  return (await playbookLookup()).choice(symbol, durationMinutes, catalogueMin);
}

/**
 * Adapt a `PlaybookVerdict` to the shape `symbolReadiness` consumes. ⚠️ The rename is the whole
 * point: `PlaybookVerdict.reason` and `FeedAdvice.message` are the same idea under two names, and
 * a call site juggling both would eventually pass the wrong one. One adapter, here, next to the
 * thing it adapts — never a `.reason` reaching into the catalogue.
 */
export function toReadinessAdvice(v: PlaybookVerdict | undefined): PlaybookAdvice | undefined {
  return v ? { level: v.level, message: v.reason } : undefined;
}

export { DEFAULT_POLICY };
