import { edit } from "./edit-lib.mjs";
edit("src/app/wallet/money-bar-ghost.tsx", [
  [`        <p className="shrink-0 font-mono text-[11.5px] tabular-nums text-transparent"><span className="rounded bg-bg-overlay">{count}</span></p>
`, `        <CountGhost phrase={count} />
`],
  [`/** A pill while it loads: \`filterPillClass\`'s box (its geometry, not its ink) with the label set and not shown. */
function PillGhost({ label }: { label: string }) {`, `/** A pill while it loads: \`filterPillClass\`'s box (its geometry, not its ink) with the label set and not shown.
 *  ⭐ Exported (round 5's follow-up, R5-K): /positions' bar ghost draws its lenses and groups with it — one pill ghost
 *  for every bar ghost, as there is one pill. */
export function PillGhost({ label }: { label: string }) {`],
  [`      <span className="font-mono text-[11px] font-bold tabular-nums">00</span>
    </span>
  );
}
`, `      <span className="font-mono text-[11px] font-bold tabular-nums">00</span>
    </span>
  );
}

/** The result count while it loads (\`QueryResultCount\`'s type: 11.5px mono on its 17.25px line), the phrase's own width
 *  set and not shown — exported with \`PillGhost\` for /positions' bar ghost (R5-K). */
export function CountGhost({ phrase }: { phrase: string }) {
  return <p className="shrink-0 font-mono text-[11.5px] tabular-nums text-transparent"><span className="rounded bg-bg-overlay">{phrase}</span></p>;
}
`],
]);
