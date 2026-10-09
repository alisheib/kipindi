// Scratch-only ESM load hook: plants the named defect into market-service.ts IN MEMORY, after tsx has transformed it.
// Nothing on disk is written; the worktree's src/ is never touched.
const PLANTS = {
  house: {
    from: 'p.houseBotId == null && p.status === "OPEN" && p.side !== opts.side',
    to: 'p.status === "OPEN" && p.side !== opts.side',
  },
};

export async function load(url, context, nextLoad) {
  const result = await nextLoad(url, context);
  const which = process.env.PLANT;
  if (process.env.PLANT_DEBUG && /market-service/.test(url)) console.log(`[plant-loader] saw ${url} source=${result.source == null ? "null" : typeof result.source}`);
  if (which && /\/src\/lib\/server\/market-service\.ts(\?|$)/.test(url) && result.source != null) {
    const plant = PLANTS[which];
    if (!plant) throw new Error(`unknown PLANT ${which}`);
    const src = result.source.toString();
    const count = src.split(plant.from).length - 1;
    if (count !== 1) throw new Error(`PLANT ${which}: anchor matched ${count}x in the transformed source`);
    console.log(`[plant-loader] planted ${which} in memory (1 site)`);
    return { ...result, source: src.replace(plant.from, plant.to) };
  }
  return result;
}
