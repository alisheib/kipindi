// Scratch-only: plants a named defect into market-service.ts IN MEMORY (sync in-thread load hook, registered after
// tsx's own so it sees tsx's transformed JS: minified CommonJS). Nothing on disk is written; src/ is never touched.
import { registerHooks } from "node:module";

const PLANTS = {
  inverted: {
    from: 'p=>p.houseBotId==null&&p.status==="OPEN"&&p.side!==opts.side',
    to: 'p=>p.houseBotId==null&&p.status==="OPEN"&&p.side===opts.side',
  },
  // the 2026-09-21 defect, planted back: the `opposite` predicate stops excluding house-marked rows
  house: {
    from: 'p=>p.houseBotId==null&&p.status==="OPEN"&&p.side!==opts.side',
    to: 'p=>p.status==="OPEN"&&p.side!==opts.side',
  },
};

registerHooks({
  load(url, context, nextLoad) {
    const result = nextLoad(url, context);
    const which = process.env.PLANT;
    if (which && /\/src\/lib\/server\/market-service\.ts(\?|$)/.test(url) && result.source != null) {
      const plant = PLANTS[which];
      if (!plant) throw new Error(`unknown PLANT ${which}`);
      const src = result.source.toString();
      const count = src.split(plant.from).length - 1;
      if (count !== 1) throw new Error(`PLANT ${which}: anchor matched ${count}x in the transformed source`);
      console.log(`[plant-hook] planted ${which} in memory (1 site)`);
      return { ...result, source: src.replace(plant.from, plant.to) };
    }
    return result;
  },
});
